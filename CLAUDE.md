# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

FinCalix — an India-focused personal finance calculator suite. Single React codebase shipped as both a web app and a Capacitor-wrapped Android app (`appId: com.fincalix.app`). ~60+ calculator pages covering loans, taxes, deposits, retirement schemes, credit cards, and goal planning. All user data is stored locally (Zustand + `localStorage`); there is no auth or server-side persistence of user inputs.

## Commands

```bash
# Web dev server (Vite, port set by vite; listens on 0.0.0.0)
npm run dev

# Production build — type-checks first, fails the build on TS errors
npm run build                 # runs `tsc && vite build` (the app; this is what Android uses)
npm run build:web             # app + pre-rendered website at "/" (what Vercel runs; see Website below)
node scripts/landing/serve-dist.mjs   # serve dist/ like Vercel (vercel.json + middleware.ts) on http://localhost:4320

# Preview a production build locally
npm run preview

# Sync web build into the Android project (run after `npm run build`)
npx cap sync android
npx cap open android          # open in Android Studio

# Android release build (Windows-only helper; locates JDK + SDK, then gradle)
./build-release.bat           # produces app-release.apk and app-release.aab

# Standalone formula/QA audits — pure Node scripts, no test runner
node scripts/qa-calculators.mjs
node scripts/qa-expense-tracker.mjs
node scripts/qa-loan-engine.mjs
node scripts/qa-export-safety.mjs     # CSV/Excel formula-injection guard
node scripts/qa-quotes.mjs            # 366 daily quotes: ids/days, 6 languages, ≤180 chars, script, sources, authors, mix, day rule
node scripts/qa-consent-network.mjs   # analytics events, no switch in Settings, offline queue (needs build:web + Chrome)
node scripts/qa-notification-times.mjs   # morning quote 07:00 IST + evening expense reminder 20:00 IST in any phone time zone, in the user's language
node scripts/qa-links.mjs             # Play Misleading Claims: "not a government app" notice + official sources (app, 6 languages, website) and every official URL answers 200 (Chrome fallback; --offline skips the network)
node scripts/qa-landing.mjs           # website: no-JS content, links, route targets, generated pages, sitemap, export banner, iPhone/QR (needs build:web + Chrome)
node scripts/qa-feature-pages.mjs     # website feature + scheme pages: independent maths (+ scripts/qa-features/*.mjs per group), figures on pages, JSON-LD, links/orphans, shared wording < 10% (needs build:web)
node scripts/landing/build-page-og.mjs   # per-page social cards → public/og/p (after build:web when pages are added or retitled; then build again)
node scripts/landing/indexnow.mjs --since <YYYY-MM-DD>   # AFTER a production deploy: tell IndexNow engines which URLs changed
node scripts/landing/round-trip-android.mjs   # old web app data → export (apex + www) → import on an Android emulator (needs adb, a running emulator, a debug APK)
```

There is no test framework, ESLint, or Prettier configured. Type-checking via `tsc` (run as part of `npm run build`) is the only automated gate. Correctness for calculator math lives in the hand-written `scripts/qa-*.mjs` audits, which re-implement each formula independently and diff against the production util.

## High-level architecture

### Dual-target app shell (`src/App.tsx`)
The same React tree renders the app on Android and in the browser:
1. **Native (Capacitor)** — full app, all routes, Home at "/", wraps `AppContent` in `ErrorBoundary` + `CibilProvider` + `BrowserRouter`.
2. **Browser (owner testing only)** — fincalix.com is a marketing site; the app shell is never served publicly. Opening any URL with `?dev=true` sets the `fincalix_dev` cookie (`middleware.ts`, Vercel edge) and then "/" and every app route serve `/app.html` (noindex, no service worker, analytics flagged as test traffic). `?dev=false` clears it. Without the cookie, every app route 308s to a website page: its static guide (`/calculator/sip` → `/sip`), its category page (`/calculators/<slug>`), `/schemes/<id>`, or `/in-the-app` (noindex) for profile/settings screens; unknown paths get a real 404 (`dist/404.html`). The legal pages are pre-rendered static HTML (`src/landing/legal-pages.tsx`).

Every page is lazy-loaded through a `lazyRetry` helper that retries chunk-load failures up to 3× (with cache-bust) and falls back to a one-time full page reload. When editing routes or adding pages, keep them behind `lr(() => import(...))` — the retry wrapper is important for users on stale caches after deploys.

### Website (`/`, `landing.html`, `src/landing/`)
The public home page (and the 5 legal pages) is a separate Vite build (`vite.landing.config.ts`) pre-rendered to static HTML by `scripts/landing/prerender.mjs`; only the islands hydrate (theme switch, hero figure, mini-calculator, tool grid). Its only call to action is the official Google Play badge (header, hero, after the calculator, final band) with an install referrer per placement. It never ships with the Android app (`npm run build` does not build it). Rules:
- Legal text has one source for the website and the app: `src/pages/legal/{PrivacyPolicy,DataPrivacy,TermsOfService,About}.tsx` (each exports a `LegalDoc`: titles/dates in en/hi/te/ta/kn + `Body`; the app shows it in `AppLegalScreen`, the website in `LegalLayout`) and `src/pages/DataSafety.tsx` (i18n `dataSafety.*`). Edit wording only there; qa-landing 5c compares `[data-legal-content]` app vs website in every language.
- Figures and names come from the app: tools from `calculatorList.ts` (`allCalcs` + `appTools`, names from `en.json` at build time), schemes from `schemes.ts`, tax from `src/utils/incomeTax.ts`, EMI/SIP from `calculations.ts`. Never hand-type a count or figure in `src/landing/content.ts`.
- Routing (static pages, legal pages, app-route table, dev cookie) lives in `src/landing/seoRoutes.ts`, used by `middleware.ts`; after changing it run `node scripts/landing/sync-vercel-headers.mjs`. `node scripts/landing/dev-mode-proof.mjs` shows the dev-mode flow with screenshots.
- Route targets for app routes are generated: `scripts/landing/route-targets.mjs` reads every `<Route path>` in `App.tsx` plus the registry and writes `src/landing/routeTargets.generated.ts` (run by `sync-vercel-headers.mjs`; `--check` fails if stale). It throws on any route without a target, so a new route needs a registry category, a `ROUTE_OVERRIDES` entry or an `IN_APP_SCREENS` entry in `seoRoutes.ts`.
- Generated pages (`site.html`, `src/landing/SitePages.tsx`, `site-data.ts`, rendered by `renderSite()` in `entry-server.tsx`): `/calculators`, 7 category pages, `/schemes`, `/schemes/<id>`, `/in-the-app`, `/export-my-data`, 404. A scheme page is indexed only if verified since `SCHEME_VERIFIED_SINCE` and has ≥ `SCHEME_MIN_WORDS` of its own text; prerender logs the noindex ones. `dist/sitemap.xml` = `public/sitemap.xml` + every indexable generated page (scheme pages dated by `lastVerified`).
- Data export for old web-app users: `/export-my-data` (also served on www, excluded from the www→apex redirect) and a one-time banner (`exportBanner.ts`, key `fincalix_export_notice`: shown when `userData.ts` finds real records, back once 30 days after dismissal, never a third time). Both call the app's `exportBackup('download')`. The banner script is injected into the 24 static pages by prerender.
- Adding a page = adding a file: `scripts/landing/gen-feature-index.mjs` (run by `build:landing`) writes `features/generated*.ts` and `schemes/generated.ts` from `features/pages/*.tsx`, `features/calcs/c/<slug>.tsx` (one lazy chunk per calculator) and `schemes/content/<id>.ts`. A page ships only when its slug is in `seoRoutes.FEATURE_PAGES`; scheme files only when complete and parseable. App routes with the same address as a page are in `SHARED_PAGES` (public: page; dev cookie: app). Merged/ended schemes: `MERGED_PAGES` + `schemes/ended.ts`.
- Scheme pages: website-only verified content in `schemes/content/<id>.ts` (`SchemeContent`); a scheme page is indexed only with such content verified since `SCHEME_VERIFIED_SINCE`. On those pages the app's numeric facts are hidden (the verified table carries amounts). App data differences go in each file's `appIssues` and `APP_IDEAS.md`.
- Sitemaps: `sitemap.xml` is an index of `sitemap-pages.xml`, `sitemap-calculators.xml`, `sitemap-schemes.xml` with real lastmod. Also generated: `llms.txt`, `og-pages.json` (for the social cards). `robots.txt` allows search and AI-search crawlers; training-only crawlers are an owner decision. Trust pages: `/how-we-calculate`, `/updates` (`trust-content.ts`; add a dated entry for every reader-visible change). Facts behind every page: `seo/research/verified-*.md`; page-writer rules: `seo/AGENT_BRIEF.md`.
- Feature pages (`src/landing/features/`, slugs in `seoRoutes.FEATURE_PAGES`, one `FeatureDef` per file in `pages/`, collected by `registry.ts`): one search query per page, with the answer first, a live calculator island (`calcs/all.tsx`, hydrated lazily by `site-client.tsx`), tables, worked examples, "Rules we checked" with official links, FAQs (FAQPage JSON-LD), related links and a disclaimer. Rendered by `renderSite()`; the sitemap uses each page's `updated` date. Every figure is computed at build time by the app's functions or by `features/math.ts` (formulas copied from app screens; `qa-feature-pages.mjs` re-checks them and fails on a drift). Facts and their sources: `seo/research/verified-facts-*.md`; app problems found on the way go to `APP_IDEAS.md`, not into the app. An app route can point at a feature page through `APP_CANONICAL`; a merged scheme page 308s through `MERGED_PAGES`. A feature page replaces any `public/<slug>/` guide (delete it).
- Screenshots: `tools/marketing/capture.mjs` → `node scripts/landing/build-images.mjs` (committed WebP). OG image and header icon: `node scripts/landing/build-og.mjs`. Fonts: `node scripts/landing/fetch-fonts.mjs`.
- Analytics: same service and rules as the app; the website sends only `page_view` ("Website") and `play_badge_click` with `placement`.
- iPhone: the head script adds `ua-ios`; CTAs then show "Android only for now — there's no iPhone app yet." under the Play badge. The QR code (static SVG, `qrcode` at build time, referrer `qr`) shows only at ≥1024 px with a mouse.
- Theme: every website page (landing, generated, guide, legal, data-safety) is light on a first visit, whatever the device's dark-mode setting; never pick it with `prefers-color-scheme`. The header toggle saves `fincalix_web_theme` (separate from the app's `settings-storage`), applied before first paint by the inline `<head>` script in `landing.html`/`site.html`/`legal.html`/`datasafety.html` (also the theme-color). The legal pages reuse the app's screens through `setWebsiteTheme()` in `useAppColors.ts`, which the app never calls; the guide pages have only a light design.
- Phones: no website page may scroll sideways at 360 px (qa-landing checks every sitemap page). A table on a guide page (`public/<guide>/index.html`) goes inside `<div class="table-scroll" role="region" tabindex="0" aria-label="…">` so only the table scrolls.
- `public/sw.js` runs only inside the Android app; on any web host it is a kill switch (deletes caches, unregisters).
- Initial JS budget 120 KB gzipped (prerender.mjs fails the build above it).

### State layer: Zustand stores (`src/store/`)
All persistent user state lives in Zustand stores with the `persist` middleware, each writing to a distinct `localStorage` key:
- `useCalculatorStore` — saved calculations + 50-entry rolling history
- `useExpenseStore`, `useBudgetTrackerStore`, `useLiveStatusStore` — money-tracking data
- `useSettingsStore` — theme/language/preferences (drives the `dark`/`light` class on `<html>`)
- `useSchemeStore` — bookmarked government schemes
- `useFeatureFlagStore` — mirrors remote-config values from Firebase
- `useNotificationStore`, `usePdfStore`, `useAuthStore`

`src/utils/dataIntegrity.ts` runs once on app start (in `App.tsx`) to repair any corrupt persisted entries **before** any store reads them. Treat this as a load-bearing side effect: if you add a store with user-content invariants, consider extending the integrity check.

### Capacitor-aware code paths
Anything that touches native APIs must gate on `Capacitor.isNativePlatform()`. Examples already in the tree: `StatusBar` theming, `Keyboard` resize handling, `App.backButton` for Android back-press (two-tap-to-exit on the home route), and the WebView clipboard/selection workarounds in `App.tsx`'s main `useEffect`. The clipboard toolbar suppression has a native kill-switch in `android/app/src/main/java/.../MainActivity.java` (`onActionModeStarted`); the JS listeners are a secondary defense — don't remove one while leaving the other.

### Calculator pages
Each calculator is a self-contained page under `src/pages/`. Shared helpers:
- Formulas → `src/utils/calculations.ts`, `taxEngine.ts`, `pragCalculations.ts`, `stpCalculations.ts`, `creditCardCalculations.ts`, `loanStatusEngine.ts`, `investmentStatusEngine.ts`.
- Shared UI → `GenericCalculator`, `NumberInput`, `DateInput`, `BottomSheet`, `ShareableCard`, `DisclaimerComponent`, `PdfActionSheet`.
- A few routes are aliases that redirect to a canonical page (e.g. `step-up-sip`, `goal-sip`, `advanced-sip`, `ppf-advanced` all `Navigate` to another route); `car-loan`/`personal-loan`/`education-loan` reuse `EMICalculator` directly. Preserve these when refactoring route tables.
- `useTrackCalculator` runs globally on every navigation and records "recently used" calculators by matching against the canonical list in `src/data/calculatorList.ts`. New calculator routes must be added there or they won't be tracked.

### Bundle splitting (`vite.config.ts`)
`manualChunks` is hand-tuned — each locale JSON is its own chunk, and heavy libs (Firebase, jspdf, xlsx, chart.js, framer-motion, i18next, react-dom/router, Capacitor) have dedicated vendor chunks. When adding a heavy dependency that's only used on one screen, add it to `manualChunks` so it doesn't land in `vendor-misc` and bloat the initial payload.

### i18n (`src/i18n.ts`, `src/locales/`)
Six locales: `en`, `hi`, `te`, `ta`, `kn`, `ml`. Only `en.json` is bundled; the others are fetched on demand when the user switches language. Use `switchLanguage(lang)` (not `i18n.changeLanguage` directly) — it loads the bundle before switching. `update-locales.js` / `update-loc.py` at the repo root are helpers for cross-locale key sync.

Daily quotes are NOT in the locale files: `src/data/quotes.ts` (types, day rule, loaders) + `src/data/quotes/catalog.json` (366 entries with English, source and attribution type) + `quotes/<lang>.json` (text and attribution per id), all loaded on demand. The day is the date's number on a leap-year calendar (29 Feb = 60, 31 Dec = 366), so the Home card (`FinancialQuote`) and the morning notification (`NotificationScheduler`, 07:00 IST via `src/utils/istTime.ts`; the evening expense reminder is 20:00 IST; both in the user's selected language and rescheduled when it changes) show the same quote on the same date for everyone. Indic quote text is never italic or letter-spaced on the card. Native texts were revised for natural wording on 18 Nov 2026 (originals by Indian-language authors kept verbatim from the cited editions). Only public-domain authors (died before 1955, listed in `scripts/qa-quotes-authors.json` with a primary source URL per quote), labelled proverbs or unattributed originals; run `node scripts/qa-quotes.mjs` after any change. `quotes-review.xlsx` holds every translation with its back-translation.

### Services (`src/services/`)
- `analyticsService.ts` + `src/lib/analytics.ts` wrap Google Analytics (Firebase JS SDK), which runs for every user from app launch; there is no consent popup and no switch in the app (owner's decision, 18 Nov 2026 — user texts say "anonymous usage statistics, such as which features are used most", never name the provider and must never offer an off switch; a test device with the old stored `"denied"` value stays off silently, see `src/utils/analyticsConsent.ts`), and only the events and parameters listed in `src/services/providers/types.ts` can be sent. There is no crash reporting. Events go through one helper, `src/lib/analytics.ts`: one `page_view` per screen (names in `src/hooks/usePageViewTracker.ts`), `trackCalculated()` (already called by the history store's `addHistory`, so a new calculator that saves history is covered), and `trackExported(filename)` (called by the shared save functions in the export utils). Allowed parameters per event live in `src/services/providers/types.ts`. Analytics are always called through the service, never direct Firebase SDK calls from components.
- `featureFlags.service.ts` + `remoteConfig.service.ts` — Firebase Remote Config, fetched once during `initAnalytics` in `App.tsx`.
- `DecisionEngine.ts`, `HealthScoreService.ts`, `InsightEngine.ts` — business-logic layer sitting above the stores (goal recommendations, financial-health scoring).
- `NotificationScheduler.ts` + `calcNotifications.ts` — wraps `@capacitor/local-notifications`.
- `providers/` contains a provider-abstraction seam (`types.ts` → `firebaseProvider.ts` / `futureProvider.ts`) anticipating a non-Firebase backend later.

### Android specifics
- Release signing config lives in `android/keystore.properties` (gitignored — see `.gitignore` in `android/`). Keystore is `fincalix-upload.jks` per the most recent commit.
- App version/build must stay synced in three places: `package.json` `version`, `src/config/app.ts` `APP_BUILD`, and `android/app/build.gradle` (`versionCode`/`versionName`). `build-release.bat` does not update these — bump by hand.
- `capacitor.config.ts` sets `backgroundColor: '#00000000'` so the native Activity's theme-aware background shows through. Don't change this to an opaque color; it will break dark-mode edges.

## Things to know before editing

- **New calculator** — create the page under `src/pages/`, add a lazy-loaded `Route` in `App.tsx`, register it in `src/data/calculatorList.ts` (otherwise "recently used" tracking silently drops it), and add any shared formula to `src/utils/calculations.ts` with a matching case in `scripts/qa-calculators.mjs`.
- **New persistent store** — use Zustand + `persist`, pick a unique storage key, and consider whether `src/utils/dataIntegrity.ts` should validate it on boot.
- **Routing changes** — several legacy URLs exist only as `<Navigate ... replace />` redirects to keep external bookmarks working. Remove at your own risk.
- The many `*.txt` and `*.log` files at the repo root (`tsc_output*.txt`, `build_error*.txt`, `errors.txt`, etc.) are scratch dumps from previous debugging sessions, not real artifacts. Ignore them unless asked.
