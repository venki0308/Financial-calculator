# FinCalix release notes

## Website (fincalix.com) — branch website/redesign, awaiting approval

- fincalix.com becomes a marketing site whose only call to action is the Google Play badge. The web app is no longer public: app routes 308 to their static page or to "/". The owner opens it with `?dev=true` (cookie `fincalix_dev`; `?dev=false` clears it).
- **To revisit: middleware runtime.** `middleware.ts` runs on Vercel's edge runtime. Vercel's build log calls edge "deprecated"; the Node.js runtime was tried on 17 Nov 2026 and returned HTTP 500 on every route (module load error), so edge stays. If Vercel announces removal of the edge runtime, move the gate to the Node.js runtime and re-run `node scripts/qa-landing.mjs` and `node scripts/landing/dev-mode-proof.mjs <preview URL>` before deploying.

## 1.3.0 (build 22) — prepared 16 Nov 2026

Build 21 was 1.2.9. Build 22 was prepared as 1.2.9 too and renamed 1.3.0 on 18 Nov 2026 (owner's decision, before upload); it adds the fixes below. `public/config.json` `latestVersion` stays 1.2.9 until 1.3.0 is live on Play, then raise it to 1.3.0 so build 21 users see the update prompt.

### Fixed
- **Update prompts never appeared.** The app fetched `https://fincalix.com/config.json`, which redirects to `www` without a CORS header, so the request was blocked on every device and the app ran on built-in defaults (no update banner, no update notification, no force-update, no remote flags). The app now asks `https://www.fincalix.com/config.json` first and falls back to the apex.
- **Daily quotes** have real translations in Hindi, Telugu, Tamil, Kannada and Malayalam (they used to be English with a language tag), and the quote card is back on the Home screen.
- **Alerts:** the savings tip rotates weekly instead of repeating daily; tax alerts fire once per deadline with the AY 2026-27 dates; SIP reminders go only to users with a saved SIP; two EMI reminders on one day no longer overwrite each other; the "New schemes" toggle now works.
- **Post Office Time Deposit (17 Nov 2026).** Interest is now paid yearly with no interest on interest, as the scheme rules say; the app used to compound across years and overstated multi-year deposits (₹1 lakh for 5 years at 7.5%: ₹1,38,568, was ₹1,44,995). Same for a tracked TD in My Loans. The app and fincalix.com/post-office-td use one function.
- **Credit card GST note (17 Nov 2026)** in all six languages: "18% GST applies to credit card finance charges and fees" — the old text wrongly said RBI mandates it.
- **Gold loan limits near ₹2.5 lakh and ₹5 lakh (17 Nov 2026)** follow the RBI rule exactly: the limit depends on the loan's own size, so gold worth ₹3,05,000 gets ₹2,50,000 (was ₹2,44,000). The app and fincalix.com/gold-loan-calculator use one function.
- **Storage full is handled.** When device storage for the app fills up (about 19,000 expense entries), a save used to fail silently. Now a dialog in the user's language explains it and offers "Export backup"; the form stays open with the typed values. A warning appears from 80% usage.

### Security
- **CSV / Excel exports:** text cells that a spreadsheet would run as a formula (starting with `=`, `+`, `-`, `@`, tab or carriage return) get a leading apostrophe. Numeric cells, including negative amounts, are untouched. App-built signed figures such as `-3.2%` or `+₹1,200` are left as they are.

### Privacy
- **Usage analytics (Google Analytics) for every user, no switch (owner's decision, 18 Nov 2026).** As in earlier builds, analytics run for every user and there is no popup. An earlier test version of build 22 had a "Usage analytics" switch in Settings → Privacy; it is removed, with its code (ID deletion and queue deletion on switch-off) and translations. A test device that had switched it off stays off silently. The disclaimer, privacy policy, Data & Privacy, website and store listing now say plainly that FinCalix collects anonymous usage statistics through Google Analytics, that financial amounts are never sent and that the data is processed by Google; no text offers an off switch. The disclaimer and privacy policy no longer claim the app "does not track usage". Checked by `node scripts/qa-consent-network.mjs`.
- **Cleaner usage data.** One `page_view` per screen with a single name (the duplicate `screen_view` events and the "SIP_Calculator"-style names are gone). New events on every calculator: `calculator_calculated` (once per completed calculation) and `report_exported` (PDF, Excel, CSV), with only `calculator_id`, `export_format` and `language`. Events raised offline are queued (max 200, 7 days) and sent later. Automated checks flag their events as test traffic (see `PLAY_DATA_SAFETY.md` for the report filter).
- **Only six events can be sent**, with an allow-list of parameters and no amounts or typed text (`src/services/providers/types.ts`). Google signals and ad personalisation are off.
- **Crashlytics and Firebase Messaging are removed.** They were linked into the app but had been unable to start since 1.2.2 (no Firebase config in the build).
- **Privacy texts corrected in all six languages:** disclaimer (now v4, so every user sees it again), privacy policy, Data & Privacy screen, landing page, static pages and the store listing draft. "Zero data collected", "no tracking" and "100% offline" are gone.
- App and website texts name the provider: "Google Analytics", processed by Google (18 Nov 2026; until then they said "an analytics service").
- Play Console answers for the Data safety form: `PLAY_DATA_SAFETY.md`.
- **One source for the legal pages (17 Nov 2026).** The app's Privacy Policy, Data & Privacy, Terms and About now show the website's text (`src/pages/legal/*`) in the app's own frame; the app gains a Data & Privacy (`/data-privacy`) screen. Body text is English with headings in hi/te/ta/kn, as on the website (Malayalam users see English). Absolute claims that were not literally true were corrected on both: "100% safe", "we collect no personal data at all", "we never had it", "absolutely zero access", "stores nothing on any server", "never leaves your device", "Optional" analytics. qa-landing 5c checks the app and website text match in every language.

### Daily quotes and reminders in the user's language (18 Nov 2026)
- **Native quote texts revised** (all 366, in hi/te/ta/kn/ml): natural modern wording instead of English sentence shapes, standard spellings of author names, everyday money words. Changed: Hindi 188, Telugu 235, Tamil 245, Kannada 243, Malayalam 339. Originals by Indian-language authors (Tirukkural, Bharati, Vemana, Baddena, Sarvajna, Basavanna, Kabir, Rahim, Poonthanam, proverbs) were checked word for word against online editions (Wikisource, Project Madurai, Kavita Kosh, Wikiquote) and kept verbatim; Sarvajna's Devanagari dandas replaced with Kannada punctuation. Every change and its back-translation is in `quotes-review.xlsx`.
- **Home card:** native-language quotes are no longer slanted (Indic scripts have no italic) or letter-spaced, and are a little larger with taller lines. Card heading reworded ("నేటి ఆర్థిక సూక్తి", "आज का वित्तीय विचार", …).
- **Morning quote notification at 07:00 IST** (was 08:00 phone time), title and quote in the user's language. **Evening "log today's expenses" reminder at 20:00 IST** (was 20:30, English only), now in the user's language. Both are on IST whatever the phone's time zone (`src/utils/istTime.ts`) and are rescheduled as soon as the language is changed in Settings. Checked by `node scripts/qa-notification-times.mjs`.

### Play review: government information and sources (18 Nov 2026)
Play rejected the listing under the Misleading Claims policy (government information without source links).
- **Settings → About → Sources & Disclaimer** (all 6 languages): "FinCalix is not a government app and does not represent any government entity", the 10 official sources (incometax.gov.in, indiabudget.gov.in, rbi.org.in, indiapost.gov.in, nsiindia.gov.in, epfindia.gov.in, pfrda.org.in, gst.gov.in, myscheme.gov.in, india.gov.in) and a disclaimer.
- **Schemes list and every scheme screen:** the same notice at the top with the official portal link (myscheme.gov.in on the list; the scheme's own portal in the scheme screen's fixed header).
- **"Official source"** on the 19 calculators that use government rules or rates (income tax, Form 16/TDS, salary hike, HRA, capital gains, LRS/TCS, GST, PPF, SSY, NSC, KVP, SCSS, Post Office MIS/TD/RD, EPF, NPS, gratuity, gold loan LTV). One list: `src/data/officialSources.ts`.
- Official links open in the in-app browser (Chrome Custom Tabs, `@capacitor/browser` 8.0.5).
- Broken scheme links replaced: PM-JAY → nha.gov.in/PM-JAY, PM-DAKSH → dosje.gov.in, NAPS → www.apprenticeshipindia.gov.in, PMEGP → www.kvic.gov.in, DAY-NRLM → www.rural.gov.in, MCGS-MSME source → www.ncgtc.in.
- Website: the notice and official links under the heading of every scheme page, /schemes and the tax and government-rate guides. Store listing draft: notice and source URLs in the full description.
- `node scripts/qa-links.mjs` checks all of it and that every official URL answers 200.

### Follow-up
- Follow-up: translate legal body text into hi/te/ta/kn/ml from the shared source; native-speaker review.

### Data refreshed (verified 16 Nov 2026)
- SBI home loans from 7.50%, SBI car loans 8.55–9.50%, SBI gold loan 9.30% bullet / 10.25% EMI.
- HDFC FD peak 6.60% (senior 7.20%); ICICI FD peak 6.50% (senior 7.10%).
- Gold default ₹13,600 per gram (24K).
- PM-KISAN 24th instalment (30 Oct 2026).
- NSAP renamed PM Samajik Sahayata Yojana; revised disability-pension rules apply once guidelines are issued (expected by mid-January 2027).

## Release checklist

1. Upload the build-22 bundle to Play Console and complete the rollout.
2. **Only after the Play rollout is live**, raise `latestVersion` in `public/config.json`. `latestVersion` and `minRequiredVersion` are deliberately unchanged in this branch: from this build on, the app really reads them, so raising `latestVersion` early would show "Update available" to users who cannot get the update yet. `minRequiredVersion` forces an update and `features.maintenanceMode` is live too — change them with care.
3. `config.json` is served with an explicit CORS header and a 5-minute cache on both hosts (live since 16 Nov 2026), so flag changes reach users within minutes.
4. Done 16 Nov 2026: `release/1.2.9-prep` was merged into `main` (`b21b693`) and production is built from `main` by Vercel.
5. Before uploading build 22: merge `privacy/consent-1.2.9` into `main` (this also publishes the corrected public privacy policy), then update the Data safety form in Play Console from `PLAY_DATA_SAFETY.md`. Rebuild the bundle only from the merged code.

## Applied 16 Nov 2026: `fincalix.com` is the primary domain

Needed so installs up to build 21 (which only know the apex URL) can read `config.json`. From this date every installed build reads the remote flags, so `latestVersion`, `minRequiredVersion` and `features.maintenanceMode` take effect for all users.

**Before**
- Vercel domain settings: `fincalix.com` redirected to `www.fincalix.com` (status code unset, so Vercel's default `307`); `www.fincalix.com` had no redirect and was the primary.
- `https://fincalix.com/config.json` answered `307` with no CORS header; `www` answered `200` with `max-age=3600`.
- Production deployment: `dpl_3U3gAQZPepesUT93tLvQzhMUJm3h` (`main` at `12e56d6`).

**Now**
- Vercel domain settings: neither domain has a domain-level redirect. `fincalix.com` serves the site.
- `www` redirects to the apex with a permanent `308` for every path except `/config.json`, through the first rule in `vercel.json` `redirects`. The redirect is in `vercel.json` and not in the domain settings because a domain-level redirect cannot exclude a path.
- `config.json` answers `200`, no redirect, `Access-Control-Allow-Origin: *`, `Cache-Control: public, max-age=300, must-revalidate` on both hosts.
- Production deployment: `dpl_H7skVxRFyadoxBmEwzNGEQvB947d`, built by Vercel from `main` at `b21b693` (it replaced `dpl_2k9sgtmWpscbokTbQDRSGfwqsTet`, the same code deployed from the release branch).
- Canonical tags, `og:url`, `sitemap.xml` and `robots.txt` already named the apex, so they now match the serving host.

**Rollback (in this order)**
1. Put the old build back: `vercel promote dpl_3U3gAQZPepesUT93tLvQzhMUJm3h --yes`. This removes the `www` redirect rule.
2. Restore the domain setting: `PATCH /v9/projects/prj_wbzg7pUSM255p2MCqLO8lU7C7Xts/domains/fincalix.com?teamId=team_zANG46vgiAOdQlSKiTEWbpQZ` with body `{"redirect": "www.fincalix.com"}` (through `vercel api`).

Doing step 2 while the `vercel.json` rule is still live would make the two redirects loop.

**Cloudflare**
- The apex is proxied through Cloudflare; `www` goes straight to Vercel.
- Cloudflare does not cache `config.json` (`cf-cache-status: DYNAMIC`) and passes its CORS and cache headers through unchanged.
- For file types Cloudflare caches by default (`.js`, `.css`, `.txt`, images) it rewrites the browser cache time to 4 hours on the apex. `sw.js` is sent by Vercel as `no-cache` but reaches browsers as `max-age=14400`. To stop that: Cloudflare dashboard, Caching, Configuration, Browser Cache TTL, choose "Respect Existing Headers".
