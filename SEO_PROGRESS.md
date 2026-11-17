# SEO + GEO programme — progress (branch `seo/complete`)

Started 17 Nov 2026. Resume from this file after a crash: do not redo pages marked **done**.
Gates for every page (owner's brief): figures from the app's shared functions · every rule verified
against a linked official source (§8 contested rules resolved or left out) · own examples, table,
FAQs, shared wording < 10% · answer-first block (number, date, source) · claims audit, approved
privacy wording, disclaimer · Lighthouse mobile perf ≥ 95, a11y/best-practices/SEO 100, CLS < 0.05,
no sideways scroll at 360 px · structured data valid, unique title/description, ≥ 2 internal links in,
no broken links out · Hinglish FAQ only where searched. A page failing a gate ships **noindex** and is
listed under "Failed gates".

Status values: `todo` → `written` (file exists) → `built` (in build, tsc ok) → `done` (all gates passed).

## Infrastructure
| Item | Status |
|---|---|
| Generated indexes for pages / calculators / scheme content (no shared registry edits) | done |
| Per-calculator lazy chunks | done |
| Scheme page template v2 (website-only content files, FAQ, sources, GovernmentService JSON-LD) | done |
| Shared-wording check at 10%, across feature pages and scheme pages | done |
| qa-feature-pages plug-in checks per page group | done |

## Feature pages (batch 1 = 10 done and live on 17 Nov 2026)
| Group | Page | Replaces guide | Status | Notes |
|---|---|---|---|---|
| Loans hub | /emi (hub) | yes | todo | |
| Loans hub | /home-loan | yes | todo | 24(b)/80C equivalents (s.22, s.123) + prepayment link |
| Loans hub | /car-loan | yes | todo | on-road price, down payment, depreciation |
| Loans hub | /personal-loan | yes | todo | credit score impact, processing fee, flat vs reducing |
| Loans hub | /two-wheeler-loan | — | todo | |
| Loans hub | /education-loan | — | todo | moratorium explained by example; no claim the app models it |
| Credit | /credit-card-payoff | — | todo | |
| Credit | /credit-card-tracker | — | todo | credit card manager feature |
| Credit | /loan-foreclosure | — | todo | My Loans feature |
| Credit | /cibil-score | — | todo | bands only unless a lender's official rate page |
| Credit | /overdraft-interest | — | todo | |
| Credit | /simple-interest | — | todo | |
| Credit | /compound-interest | — | todo | |
| Investments | /sip | yes | todo | |
| Investments | /lumpsum | yes | todo | |
| Investments | /swp | yes | todo | |
| Investments | /stp | — | todo | |
| Investments | /cagr | yes | todo | |
| Investments | /portfolio-rebalancing | — | todo | asset rebalancer (PRAG) |
| Investments | /elss | — | todo | no app ELSS tool: built from the app's SIP + tax functions |
| Investments | /goal-planner | — | todo | child education focus |
| Deposits | /fd | yes | todo | |
| Deposits | /rd | yes | todo | |
| Deposits | /ppf | yes | todo | |
| Deposits | /nsc | yes | todo | |
| Deposits | /kvp | yes | todo | |
| Deposits | /post-office-mis | yes | todo | |
| Deposits | /scss (+ merge /schemes/c-scss) | yes | todo | |
| Deposits | /atal-pension | yes | todo | |
| Tax | /hra | yes | todo | §8 metro list |
| Tax | /capital-gains | yes | todo | |
| Tax | /lrs-tcs | yes | todo | §8 TCS |
| Tax | /gst | yes | todo | §8 slabs |
| Tax | /salary-hike | — | todo | |
| Tax | /tax-refund | — | todo | Form 16 / TDS feature, s.437 interest |
| Retirement | /epf | yes | todo | §8 EPF rate |
| Retirement | /nps (+ merge /schemes/c-nps) | yes | todo | §8 annuity/lump sum |
| Retirement | /gratuity | yes | todo | §8 Labour Codes |
| Planning | /expense-tracker (+ 50/30/20 section) | yes | todo | budget tracker merged here |
| Planning | /business-tracker | — | todo | |
| Planning | /term-insurance-cover | — | todo | |
| Planning | /health-insurance-claim-settlement-ratio | — | todo | IRDAI annual report figures only |
| Planning | /property-appreciation | — | todo | |
| Planning | /break-even | — | todo | |
| Planning | /financial-planning | — | todo | app's Smart Planner; ships only if it stands on app maths |
| GEO | /how-we-calculate | — | todo | |
| GEO | /updates | — | todo | |

No own page (Phase 0 decision 3): age, scientific, world clock, compare scenarios, CC compare.

## Scheme pages (47 after the SCSS/NPS merges)
Noindex today (13): pmksy, digital-agri, pmsby, pmay-g, telemanas, abdm, bbbp, jjm, digital-india, pmkvy, naps, ddugky, saksham.
Indexed (34 + merges): pmkisan, pmfby, kcc, pmddky, pmvbry, pmkusum, pmsym, nps-vatsalya, pmjjby, pmay-u,
abpmjay, pmrahat, pmuy, pmsgmby, pmjdy, mudra, udyam, cgtmse, mcgs-msme, pmvishwakarma, pmsvanidhi,
mgnrega (VB-G RAM G), nsap, nmms, vidyalakshmi, pmdaksh, lakhpati, pmmvy, pmis, startup-india, gig,
pmfme, pmegp, daynrlm.

| Scheme | Status | Notes |
|---|---|---|
| c-pmjjby | built, indexable (Lighthouse at the end) | group 1, verified 2026-11-17 |
| c-pmsby | built, indexable (Lighthouse at the end) | group 1, verified 2026-11-17 |
| c-pmfby | built, indexable (Lighthouse at the end) | group 1, verified 2026-11-17 |
| c-pmsym | built, indexable (Lighthouse at the end) | group 1, verified 2026-11-17 |
| c-pmay-g | built, indexable (Lighthouse at the end) | group 1, verified 2026-11-17 |
| c-telemanas | built, indexable (Lighthouse at the end) | group 1, verified 2026-11-17 |
| c-abdm | built, indexable (Lighthouse at the end) | group 1, verified 2026-11-17 |
| c-bbbp | built, indexable (Lighthouse at the end) | group 1, verified 2026-11-17 |
| c-jjm | built, indexable (Lighthouse at the end) | group 1, verified 2026-11-17 |
| c-digital-india | built, indexable (Lighthouse at the end) | group 1, verified 2026-11-17 |
| c-pmkvy | built, indexable (Lighthouse at the end) | group 1, verified 2026-11-17 |
| c-ddugky | built, indexable (Lighthouse at the end) | group 1, verified 2026-11-17 |
| c-saksham | built, indexable (Lighthouse at the end) | group 1, verified 2026-11-17 |
| c-pmksy | built, indexable (Lighthouse at the end) | group 1, verified 2026-11-17 |
| c-digital-agri | built, indexable (Lighthouse at the end) | group 1, verified 2026-11-17 |
| c-naps | noindex | NAPS-2 ended 31 Mar 2026; no official extension or PM-NAPS 3.0 found |
| (filled as each is verified) | | |

## Route table plan (apply when the pages are registered)
- FEATURE_PAGES += every new slug. SHARED_PAGES += /two-wheeler-loan, /goal-planner, /business-tracker, /cibil-score (same address as the app route: public = page, dev cookie = app); isAppPath returns true for SHARED_PAGES first.
- APP_CANONICAL += education-loan→/education-loan, form16-tax→/tax-refund, salary-hike, compound-interest, stp, prag→/portfolio-rebalancing, simple-interest, overdraft→/overdraft-interest, credit-card-payoff, /expenses/credit-cards(+/:id)→/credit-card-tracker, /my-loans(+/:id)→/loan-foreclosure, insurance→/term-insurance-cover, /insurance-compare→/health-insurance-claim-settlement-ratio, property→/property-appreciation, break-even, /financial-advisor→/financial-planning, /cibil-profile→/cibil-score, /scheme/c-scss→/scss, /scheme/c-nps→/nps. MERGED_PAGES += /schemes/c-scss→/scss, /schemes/c-nps→/nps.
- ROUTE_OVERRIDES: drop education-loan, two-wheeler-loan, form16-tax, cibil-profile. Then: sync-vercel-headers, route-targets --check, qa-landing.
- Verify before publishing the retirement category intro: which schemes keep the opening rate (TD, NSC, KVP, MIS, SCSS) vs move quarterly (PPF, SSY) — check against verified-facts-deposits.md.

## Site-wide (Phases 2–6)
| Item | Status |
|---|---|
| Category pages + /calculators: rich intros, 1–2 line tool descriptions | done (intros + 54 tool descriptions; start links come from page cards) |
| Route table: every app route → its dedicated page | todo |
| Titles/descriptions unique; per-page OG images | in progress (uniqueness enforced at build; cards rendered at the end) |
| JSON-LD: WebApplication, FAQPage, BreadcrumbList, GovernmentService, Organization (sameAs = Play), WebSite | todo |
| Internal links: no orphans, ≥ 2 links in per page, no broken links | todo |
| Split sitemaps with real lastmod | done |
| robots.txt (search + AI search allowed; training-only bots listed for the owner's decision) | done (training-only bots listed, none blocked) |
| llms.txt | done |
| IndexNow (key file + submit script) | done (submit after production deploy) |
| /how-we-calculate, /updates, entity facts consistent, PLAYSTORE_LISTING.md | in progress (pages built; PLAYSTORE_LISTING.md pending) |
| Phase 5: Search Console DNS TXT + steps, Bing import, OFFSITE_PLAN.md | done — SEO_SETUP_STEPS.md, OFFSITE_PLAN.md |
| Phase 6: SEO_TRACKING.md | done (baseline to complete with first GSC/Play data) |

## Failed gates (ship noindex)
(none yet)

## Open issues / app bugs found
(see APP_IDEAS.md; app fixes only where a published number is wrong)
