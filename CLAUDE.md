# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

FinCalix — an India-focused personal finance calculator suite. Single React codebase shipped as both a web app and a Capacitor-wrapped Android app (`appId: com.fincalix.app`). ~60+ calculator pages covering loans, taxes, deposits, retirement schemes, credit cards, and goal planning. All user data is stored locally (Zustand + `localStorage`); there is no auth or server-side persistence of user inputs.

## Commands

```bash
# Web dev server (Vite, port set by vite; listens on 0.0.0.0)
npm run dev

# Production build — type-checks first, fails the build on TS errors
npm run build                 # runs `tsc && vite build`

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
```

There is no test framework, ESLint, or Prettier configured. Type-checking via `tsc` (run as part of `npm run build`) is the only automated gate. Correctness for calculator math lives in the hand-written `scripts/qa-*.mjs` audits, which re-implement each formula independently and diff against the production util.

## High-level architecture

### Dual-target app shell (`src/App.tsx`)
The same React tree renders three different surfaces based on environment, decided at the root:
1. **Native (Capacitor)** — full app, all routes, wraps `AppContent` in `ErrorBoundary` + `CibilProvider` + `BrowserRouter`.
2. **Browser with `?dev=true`** — same full app (persisted via `fincalix_dev_access` in `localStorage`), used for web-based testing of native screens.
3. **Regular browser visitor** — only `WebLandingPage` + legal routes under `src/pages/legal/`. Calculator routes are intentionally unreachable from the public marketing site.

Every page except `WebLandingPage` is lazy-loaded through a `lazyRetry` helper that retries chunk-load failures up to 3× (with cache-bust) and falls back to a one-time full page reload. When editing routes or adding pages, keep them behind `lr(() => import(...))` — the retry wrapper is important for users on stale caches after deploys.

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

### Services (`src/services/`)
- `analyticsService.ts` + `src/lib/analytics.ts` wrap Firebase Analytics + Crashlytics; always called through the service, never direct Firebase SDK calls from components.
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
