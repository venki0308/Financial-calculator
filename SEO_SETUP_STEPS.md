# Search engine setup — steps for the owner (Phase 5)

Do these **after** the SEO release is live on fincalix.com. They need your Google, Cloudflare and
Microsoft accounts; nothing here can be done from the build machine.

## 1. Google Search Console — Domain property (covers fincalix.com and www)

1. Open https://search.google.com/search-console → **Add property** → choose **Domain** (left box) →
   type `fincalix.com` → **Continue**.
2. Google shows a verification string that starts with `google-site-verification=` followed by about
   43 characters. It is unique to your Google account, so it cannot be prepared in advance. Copy it.
3. In Cloudflare: **fincalix.com → DNS → Records → Add record** and enter exactly:

   | Field | Value |
   |---|---|
   | Type | `TXT` |
   | Name | `@` (Cloudflare shows it as `fincalix.com`) |
   | Content | `google-site-verification=<the string Google showed you>` |
   | TTL | `Auto` |

   TXT records have no proxy setting. Do **not** change the existing A/CNAME records (the apex is
   proxied through Cloudflare and `www` is DNS-only to Vercel; see the hosting notes).
4. Back in Search Console press **Verify**. If it fails, wait 10 minutes and press Verify again
   (Cloudflare TXT records usually resolve within minutes). Keep the TXT record forever: removing it
   un-verifies the property.
5. **Sitemaps** (left menu) → enter `sitemap.xml` → **Submit**. It is a sitemap index; Search Console
   lists the three child sitemaps (`sitemap-pages.xml`, `sitemap-calculators.xml`,
   `sitemap-schemes.xml`) under it.
6. **URL inspection** → paste `https://fincalix.com/` → **Request indexing**. Repeat for the 5–10 pages
   you care about most (e.g. /old-vs-new-tax-regime, /income-tax, /home-loan-prepayment, /emi, /sip).
   Do not request every page; the sitemap does that.
7. Optional: **Settings → Associations → Google Play** to link the Play listing (lets Search Console
   show app-related data).

## 2. Bing Webmaster Tools — import from Search Console

1. Open https://www.bing.com/webmasters and sign in (Microsoft, Google or Facebook account).
2. Choose **Import your sites from GSC** → **Continue** → sign in with the same Google account →
   allow access → tick `fincalix.com` → **Import**. Bing copies the verified property and its sitemap.
   (Alternative if import is not offered: **Add site** → `https://fincalix.com` → verify with the
   **DNS TXT** option Bing shows, added in Cloudflare the same way as above.)
3. **Sitemaps** → confirm `https://fincalix.com/sitemap.xml` is listed (add it if not).
4. **IndexNow** is already set up on the site: the key file is served at
   `https://fincalix.com/a5ca7b9265c8112933302ab4707b167c.txt`. After every production deploy the
   coordinator runs `node scripts/landing/indexnow.mjs --since <date>` to tell Bing (and the other
   IndexNow engines) which URLs changed. In Bing Webmaster Tools, **IndexNow** shows the URLs received.

## 3. After a week

- Search Console **Pages** (Indexing): note how many pages are indexed vs "Discovered – currently not
  indexed". New sites take 1–4 weeks; do not resubmit repeatedly.
- Search Console **Performance**: filter by page to see the queries each page appears for; compare
  with the target query per page in `SEO_TRACKING.md`.
- Bing **Search Performance**: same idea.
