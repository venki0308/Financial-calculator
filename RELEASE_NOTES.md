# FinCalix release notes

## Website (fincalix.com) — branch website/redesign, awaiting approval

- fincalix.com becomes a marketing site whose only call to action is the Google Play badge. The web app is no longer public: app routes 308 to their static page or to "/". The owner opens it with `?dev=true` (cookie `fincalix_dev`; `?dev=false` clears it).
- **To revisit: middleware runtime.** `middleware.ts` runs on Vercel's edge runtime. Vercel's build log calls edge "deprecated"; the Node.js runtime was tried on 17 Nov 2026 and returned HTTP 500 on every route (module load error), so edge stays. If Vercel announces removal of the edge runtime, move the gate to the Node.js runtime and re-run `node scripts/qa-landing.mjs` and `node scripts/landing/dev-mode-proof.mjs <preview URL>` before deploying.

## 1.2.9 (build 22) — prepared 16 Nov 2026

Build 21 carried the same version name; build 22 adds the fixes below.

### Fixed
- **Update prompts never appeared.** The app fetched `https://fincalix.com/config.json`, which redirects to `www` without a CORS header, so the request was blocked on every device and the app ran on built-in defaults (no update banner, no update notification, no force-update, no remote flags). The app now asks `https://www.fincalix.com/config.json` first and falls back to the apex.
- **Daily quotes** have real translations in Hindi, Telugu, Tamil, Kannada and Malayalam (they used to be English with a language tag), and the quote card is back on the Home screen.
- **Alerts:** the savings tip rotates weekly instead of repeating daily; tax alerts fire once per deadline with the AY 2026-27 dates; SIP reminders go only to users with a saved SIP; two EMI reminders on one day no longer overwrite each other; the "New schemes" toggle now works.
- **Storage full is handled.** When device storage for the app fills up (about 19,000 expense entries), a save used to fail silently. Now a dialog in the user's language explains it and offers "Export backup"; the form stays open with the typed values. A warning appears from 80% usage.

### Security
- **CSV / Excel exports:** text cells that a spreadsheet would run as a formula (starting with `=`, `+`, `-`, `@`, tab or carriage return) get a leading apostrophe. Numeric cells, including negative amounts, are untouched. App-built signed figures such as `-3.2%` or `+₹1,200` are left as they are.

### Privacy
- **Usage analytics: on by default, now with an off switch.** As in earlier builds, analytics run for every user and there is no popup. New in build 22: Settings → Privacy has a "Usage analytics" switch; turning it off stops collection and deletes the analytics IDs from the device. The disclaimer and privacy policy no longer claim the app "does not track usage". Checked by `node scripts/qa-consent-network.mjs`.
- **Cleaner usage data.** One `page_view` per screen with a single name (the duplicate `screen_view` events and the "SIP_Calculator"-style names are gone). New events on every calculator: `calculator_calculated` (once per completed calculation) and `report_exported` (PDF, Excel, CSV), with only `calculator_id`, `export_format` and `language`. Events raised offline are queued (max 200, 7 days) and sent later; switching analytics off deletes the queue unsent. Automated checks flag their events as test traffic (see `PLAY_DATA_SAFETY.md` for the report filter).
- **Only six events can be sent**, with an allow-list of parameters and no amounts or typed text (`src/services/providers/types.ts`). Google signals and ad personalisation are off.
- **Crashlytics and Firebase Messaging are removed.** They were linked into the app but had been unable to start since 1.2.2 (no Firebase config in the build).
- **Privacy texts corrected in all six languages:** disclaimer (now v4, so every user sees it again), privacy policy, Data & Privacy screen, landing page, static pages and the store listing draft. "Zero data collected", "no tracking" and "100% offline" are gone.
- App texts say "an analytics service" and do not name the provider.
- Play Console answers for the Data safety form: `PLAY_DATA_SAFETY.md`.
- **One source for the legal pages (17 Nov 2026).** The app's Privacy Policy, Data & Privacy, Terms and About now show the website's text (`src/pages/legal/*`) in the app's own frame; the app gains a Data & Privacy (`/data-privacy`) screen. Body text is English with headings in hi/te/ta/kn, as on the website (Malayalam users see English). Absolute claims that were not literally true were corrected on both: "100% safe", "we collect no personal data at all", "we never had it", "absolutely zero access", "stores nothing on any server", "never leaves your device", "Optional" analytics. qa-landing 5c checks the app and website text match in every language.

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
