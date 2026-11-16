# FinCalix release notes

## 1.2.9 (build 22) — prepared 16 Nov 2026

Build 21 carried the same version name; build 22 adds the fixes below.

### Fixed
- **Update prompts never appeared.** The app fetched `https://fincalix.com/config.json`, which redirects to `www` without a CORS header, so the request was blocked on every device and the app ran on built-in defaults (no update banner, no update notification, no force-update, no remote flags). The app now asks `https://www.fincalix.com/config.json` first and falls back to the apex.
- **Daily quotes** have real translations in Hindi, Telugu, Tamil, Kannada and Malayalam (they used to be English with a language tag), and the quote card is back on the Home screen.
- **Alerts:** the savings tip rotates weekly instead of repeating daily; tax alerts fire once per deadline with the AY 2026-27 dates; SIP reminders go only to users with a saved SIP; two EMI reminders on one day no longer overwrite each other; the "New schemes" toggle now works.
- **Storage full is handled.** When device storage for the app fills up (about 19,000 expense entries), a save used to fail silently. Now a dialog in the user's language explains it and offers "Export backup"; the form stays open with the typed values. A warning appears from 80% usage.

### Security
- **CSV / Excel exports:** text cells that a spreadsheet would run as a formula (starting with `=`, `+`, `-`, `@`, tab or carriage return) get a leading apostrophe. Numeric cells, including negative amounts, are untouched. App-built signed figures such as `-3.2%` or `+₹1,200` are left as they are.

### Data refreshed (verified 16 Nov 2026)
- SBI home loans from 7.50%, SBI car loans 8.55–9.50%, SBI gold loan 9.30% bullet / 10.25% EMI.
- HDFC FD peak 6.60% (senior 7.20%); ICICI FD peak 6.50% (senior 7.10%).
- Gold default ₹13,600 per gram (24K).
- PM-KISAN 24th instalment (30 Oct 2026).
- NSAP renamed PM Samajik Sahayata Yojana; revised disability-pension rules apply once guidelines are issued (expected by mid-January 2027).

## Release checklist

1. Upload the build-22 bundle to Play Console and complete the rollout.
2. **Only after the Play rollout is live**, raise `latestVersion` in `public/config.json`. `latestVersion` and `minRequiredVersion` are deliberately unchanged in this branch: from this build on, the app really reads them, so raising `latestVersion` early would show "Update available" to users who cannot get the update yet. `minRequiredVersion` forces an update and `features.maintenanceMode` is live too — change them with care.
3. Deploying `vercel.json` from this branch gives `config.json` an explicit CORS header and a 5-minute cache, so flag changes reach users within minutes.

## Staged, not applied: make `fincalix.com` the primary domain

Needed so installs up to build 21 (which only know the apex URL) can read `config.json`. Requires a decision and Vercel access; nothing here is active.

**Today**
- `www.fincalix.com` is the primary domain and serves the site.
- `fincalix.com` answers `307` to `www` for every path, with no CORS header. The redirect is issued by Vercel's domain setting (the apex is proxied through Cloudflare, `www` points straight at Vercel).
- Canonical tags, `og:url`, `sitemap.xml` and `robots.txt` already name `https://fincalix.com`, so search engines are pointed at a host that redirects away.

**After**
- `fincalix.com` serves the site directly (primary). `www.fincalix.com` stays attached with no domain-level redirect.
- `www` redirects to the apex for every path except `/config.json`, through this `vercel.json` rule:

```json
{
  "source": "/((?!config\\.json$).*)",
  "has": [{ "type": "host", "value": "www.fincalix.com" }],
  "destination": "https://fincalix.com/$1",
  "permanent": true
}
```

- `config.json` is then served with `200`, no redirect and `Access-Control-Allow-Origin: *` on both hosts.

**Order matters.** Change the domain setting first (remove the apex-to-www redirect), then deploy the `vercel.json` rule. Deploying the rule while the apex still redirects to `www` creates a redirect loop for the whole site. That is why the rule is documented here and not committed to `vercel.json`.

**Effect on SEO and links**
- Canonical, sitemap and the serving host finally agree (all apex); no page files need to change.
- Existing `www` links and search results keep working through a permanent redirect.
- The current `307` (temporary) redirect from apex to `www` goes away; the new `www` to apex redirect is permanent (`308`), which is the signal search engines expect for a host move.
