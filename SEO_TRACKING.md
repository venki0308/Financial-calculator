# SEO tracking (Phase 6)

## Baseline (17 Nov 2026, before the full programme ships)

| Measure | Value | Source |
|---|---|---|
| Indexable URLs in the sitemap | 85 (batch 1 live) → this release adds the rest; final count in SEO_PROGRESS.md | `dist/sitemap*.xml` |
| Feature pages with a calculator | 10 live | `seoRoutes.FEATURE_PAGES` |
| Scheme pages indexed / noindex | 36 / 13 | prerender log |
| Lighthouse mobile (10 batch-1 pages, production) | perf 98–100, a11y 100, best practices 100, SEO 100, CLS 0 | 17 Nov 2026 run |
| Search Console clicks / impressions | **not available yet** — the Domain property is set up in SEO_SETUP_STEPS.md; record the first 28-day figures here | Search Console |
| Play installs from the website | **not available yet** — record from Play Console after 28 days | Play Console |

Record the first real Search Console and Play numbers 28 days after the property is verified, then
compare every quarter.

## Target query per page

One primary query per page (SEO_PLAN.md §5); the page should appear for it in Search Console
Performance → Queries, filtered by that page.

| Page | Target query |
|---|---|
| /old-vs-new-tax-regime | old vs new tax regime calculator |
| /income-tax | income tax calculator fy 2026-27 |
| /income-tax-due-dates | income tax due dates fy 2026-27 |
| /tax-refund | income tax refund calculator |
| /hra | hra exemption calculator |
| /capital-gains | capital gains tax calculator |
| /salary-hike | salary hike calculator |
| /lrs-tcs | tcs on foreign remittance |
| /gst | gst calculator |
| /emi | emi calculator |
| /home-loan | home loan emi calculator |
| /home-loan-prepayment | home loan prepayment calculator |
| /car-loan | car loan emi calculator |
| /personal-loan | personal loan emi calculator |
| /two-wheeler-loan | two wheeler loan emi calculator |
| /education-loan | education loan emi calculator |
| /gold-loan-calculator | gold loan calculator per gram |
| /loan-foreclosure | loan foreclosure calculator |
| /overdraft-interest | od interest calculator |
| /credit-card-interest | credit card interest calculator |
| /credit-card-payoff | credit card payoff calculator |
| /credit-card-tracker | credit card due date tracker |
| /cibil-score | cibil score for home loan |
| /sip | sip calculator |
| /sip-for-1-crore | sip for 1 crore |
| /step-up-sip | step up sip calculator |
| /lumpsum | lumpsum calculator |
| /swp | swp calculator |
| /stp | stp calculator mutual fund |
| /cagr | cagr calculator |
| /elss | elss calculator |
| /portfolio-rebalancing | portfolio rebalancing calculator |
| /goal-planner | child education planning calculator |
| /compound-interest | compound interest calculator |
| /simple-interest | byaj calculator |
| /fd | fd calculator |
| /rd | rd calculator |
| /post-office-td | post office td calculator |
| /ppf | ppf calculator |
| /nsc | nsc calculator |
| /kvp | kvp calculator |
| /post-office-mis | post office mis calculator |
| /scss | senior citizen savings scheme calculator |
| /sukanya-samriddhi | sukanya samriddhi yojana calculator |
| /epf | epf calculator |
| /nps | nps calculator |
| /gratuity | gratuity calculator |
| /atal-pension | atal pension yojana chart |
| /expense-tracker | expense tracker app |
| /business-tracker | daily income expense app for shop |
| /term-insurance-cover | how much term insurance do i need |
| /health-insurance-claim-settlement-ratio | health insurance claim settlement ratio 2026 |
| /property-appreciation | property appreciation calculator india |
| /break-even | break even point calculator |
| /financial-planning | financial planning calculator |
| /schemes/<id> | "<scheme name> eligibility" or "… apply online" (title of each page) |

## How to read the numbers

**Search Console** (after SEO_SETUP_STEPS.md):
- *Performance → Search results*: set 28 days; tab **Pages** shows clicks/impressions per page; click a
  page, then tab **Queries** to see what it ranks for. Success for a new page = impressions for its
  target query within 4–8 weeks, then rising average position.
- *Indexing → Pages*: "Indexed" should approach the sitemap count. "Crawled – currently not indexed"
  on a page usually means it needs more unique value; fix the page, don't resubmit.
- *Sitemaps*: the index `sitemap.xml` and its three children should show "Success".
- *Enhancements*: FAQ and Breadcrumb reports must show no errors.

**GA4** (website analytics, same service and rules as the app; switchable off by visitors):
- Event `page_view` with `page_title` = "Website - <page>" (e.g. "Website - EMI"): views per page.
- Event `play_badge_click` with `placement` (header, hero, mini_calc, final_cta): which part of the page
  sends people to Play. Rate = play_badge_click ÷ page_view for the same page title.

**Play Console** (installs from the website):
- Every Play badge carries an install referrer `utm_source=fincalix.com&utm_medium=website&utm_campaign=<page slug>&utm_content=<placement>`.
- *Statistics / Store analysis → Acquisition*: filter by UTM campaign to see installs per page slug.
  Compare with the page's GA views to get an install rate per page.

## Quarterly freshness checklist (every quarter end: 31 Mar, 30 Jun, 30 Sep, 31 Dec)

1. Small-savings rates: read the DEA notification for the next quarter; update `SMALL_SAVINGS` in
   `src/data/rateEnvironment.ts`; pages that print rates (PPF, SSY, NSC, KVP, MIS, SCSS, TD, RD) update
   automatically — rebuild, and change each page's `updated` date only if its text changed.
2. RBI repo rate and any RBI direction used on a page (cards, gold loans, prepayment): check for amendments.
3. Gold rate (IBJA) used on the gold-loan page: refresh the reference rate and date.
4. Tax: after the Budget (1 Feb) and the Finance Act, re-verify slabs, rebate, surcharge, TCS, TDS,
   capital gains and due dates; update `src/utils/incomeTax.ts` (app + website) and the tax pages.
5. EPF rate (EPFO declaration), NPS rules (PFRDA), gratuity limit, IRDAI annual report (claim ratios,
   usually published around December).
6. Scheme pages: re-verify the oldest `verified` dates first; anything not re-verified within 12 months
   should be re-checked or set noindex.
7. Run all audits (`qa-calculators`, `qa-feature-pages`, `qa-landing`, the others in CLAUDE.md),
   Lighthouse on the 10 most-visited pages, and the production checks after deploy.
8. Add a dated entry to `/updates` (src/landing/trust-content.ts) for anything readers would notice.
9. Submit changed URLs: `node scripts/landing/indexnow.mjs --since <date of the release>`.
