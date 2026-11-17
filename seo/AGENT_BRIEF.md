# Brief for FinCalix website page writers (read all of it before writing anything)

Repo: `d:\Skills\Financial-calculator` (Windows; Bash = Git Bash, PowerShell also available). Branch
`seo/complete` is already checked out. Today is **17 November 2026**. You write pages for
fincalix.com, the marketing website of the FinCalix Android app (Indian personal-finance calculators).
Several writers work in this same folder at the same time, each on a different set of pages.

## What you may create (and nothing else)
- `src/landing/features/pages/<slug>.tsx` — one file per page you own (exports one `FeatureDef`).
- `src/landing/features/calcs/c/<slug>.tsx` — the page's interactive calculator (default export), file name = the page slug.
- `src/landing/features/math-<group>.ts` — ONLY if the app keeps a formula inside a screen component
  (not exported from `src/utils`): copy it unchanged, name the screen in a comment. Prefer importing
  the app's exported functions from `src/utils/*` (calculations.ts, taxEngine.ts, incomeTax.ts,
  creditCardCalculations.ts, loanStatusEngine.ts, investmentStatusEngine.ts, pragCalculations.ts,
  stpCalculations.ts, …) and `src/data/rateEnvironment.ts` (current rates).
- `scripts/qa-features/<group>.mjs` — your page group's independent checks (see "Audit" below).
- `seo/research/verified-facts-<group>.md` — every rule/rate/date you state, with the official URL and what it says.
For scheme writers: `src/landing/schemes/content/<id>.ts` + `seo/research/verified-schemes-<group>.md` (see the scheme section).

**Do not edit any existing file** (registry, seoRoutes, ui.tsx, calcs/all.tsx, generated*.ts, app code in
`src/pages`, `src/utils`, `src/data`, locales, package.json, public/, other writers' files). Do not run
`npm run build*`, `vite`, any browser/Playwright/Lighthouse, `git` commands, or
`scripts/landing/gen-feature-index.mjs`. You may run `npx tsc --noEmit -p .` (ignore errors in files
that are not yours — other writers are mid-edit) and plain `node` one-liners to compute figures.
If you find an existing file must change, say so in your final report instead.

## Hook you will meet
A "Fact-Forcing Gate" hook rejects the **first** Write/Edit/Bash on each file until you state, in your
message: (1) which file(s) will import/call the new file, (2) that no existing file serves the same
purpose (Glob), (3) data files read/written (usually none), (4) the user's instruction quoted
verbatim. Then retry the same call. Tip: make the first Write a one-line stub, state the facts, then
write the real content. The user's instruction to quote: "Every figure computed by the app's shared
functions; every rule verified against an official source linked on the page (resolve the §8
contested rules before using them; if unresolved, leave the claim out)."

## Read first (examples of finished pages — match their quality and structure)
- `src/landing/features/pages/home-loan-prepayment.tsx`, `post-office-td.tsx`, `gold-loan-calculator.tsx`, `old-vs-new-tax-regime.tsx`
- `src/landing/features/types.ts` (FeatureDef), `ui.tsx` (Section, DataTable, Scenarios, Rules), `fmt.ts` (inr, amt, pct, taxText), `derive.ts`
- Calculator pattern: `src/landing/features/calcs/all.tsx` (e.g. `PoTdCalc`, `GoldLoanCalc`) using `Shell`, `Toggle`, `inr` from `calcs/Shell.tsx` and `Field` from `src/landing/Field.tsx`. A new calculator file is `export default function XCalc(p: Record<string, unknown>) { … }` with numeric props read via `Number(p.x ?? default)` and `campaign={String(p.campaign)}` passed to `Shell`.
- `SEO_PLAN.md` §5 (your page's primary/secondary queries and Hinglish queries), §7 (template), §8 (facts to verify).
- `seo/research/verified-facts-2026-11-17.md` — facts already verified today (Income-tax Act 2025 section numbers, slabs, small-savings rates, RBI rules); reuse them with their URLs.

## Every page must (quality gates — a page failing any of these is not published)
1. **Figures**: every number on the page is computed at build time from the app's functions (or your
   math-<group>.ts copy of a screen formula). No hand-typed results. Round figures given as inputs are fine.
2. **Rules**: every rule/rate/limit/date is verified today against an **official** source (incometax.gov.in,
   egazette.gov.in, cbic-gst.gov.in, rbi.org.in, indiapost.gov.in, nsiindia.gov.in, dea.gov.in,
   epfindia.gov.in, pfrda.org.in, npscra, labour.gov.in, irdai.gov.in, sebi.gov.in, pib.gov.in, a
   scheme's own portal) and linked on the page (`sources` and/or the `Rules` box). Use WebFetch/WebSearch.
   If you cannot verify a rule from an official source, **leave the claim out**. §8 contested rules
   (TCS on LRS, HRA metro list, gratuity under the Labour Codes, NPS annuity/lump sum, EPF rate,
   GST slabs, CIBIL figures, IRDAI claim ratios) must be resolved from the official text first.
3. **Unique value**: the page's own worked examples, own table(s), own FAQs. **Shared wording with any
   other page must stay under 10%** (an automated 8-word-shingle check across all pages). Write every
   page's sentences fresh — never reuse sentence templates across pages, even your own.
4. **Answer-first** (`answer`): 2–3 sentences with one real computed number for a common case, the
   rate/rule date, and it must be supported by `sources`.
5. **Template** (see the examples): eyebrow, H1 with the primary query in natural language, answer,
   calculator, "how it's calculated" with one fully worked example, at least one long-tail table,
   3–5 scenarios with different numbers, a comparison where relevant, the `Rules` box with official
   links and `checked="2026-11-17"`, 5–8 FAQs (each answered in its first sentence), 3–6 related links
   (+ the category link is automatic), disclaimer.
6. **Limits**: `title` ≤ 60 chars and unique; `description` ≤ 155 chars and unique; `analyticsTitle` matches
   `/^[A-Za-z0-9 &()'./-]{1,60}$/` (e.g. "Website - EMI"); `updated: '2026-11-17'`.
7. **Hinglish FAQ**: one natural-Hinglish FAQ only where SEO_PLAN §5 lists a Hinglish query for that page.
8. **Claims about the app**: only what the app really does — check the screen in `src/pages/` before
   saying "the app lets you …". Privacy wording allowed: "Your financial data stays on your device",
   "No login", "No ads", "Works offline". Never: "no tracking", "zero data", "100% offline/private".
9. **Links**: `related` hrefs only to pages in the list below. Never link a page to itself.
10. **Disclaimer**: `disclaimer: 'tax' | 'invest' | 'loan' | 'deposit' | 'card' | 'gold' | 'ssy'` (texts in
    ui.tsx) or `{ text: '…' }` with an accurate page-specific disclaimer (e.g. retirement, insurance, planning).
11. **App bug rule**: if an app function gives a figure that contradicts the official rule, do NOT publish
    that figure. Report it ("APP BUG: file:function, input, app result, correct result, source") in your
    final report; the coordinator decides.
12. If a page cannot pass a gate (e.g. no verifiable data), still write it but set `noindex: '<reason>'`, and report it.

## Audit plug-in (`scripts/qa-features/<group>.mjs`)
`export default async function ({ check, load, inr, page }) { … }` — `check(label, ok, detail?)`;
`load('src/utils/calculations.ts')` bundles a TS module with esbuild and returns its exports;
`page(slug)` returns the built HTML of `/slug` (run later by the coordinator after a build).
For each of your pages: (a) re-implement the key formula independently (different method) and compare
with the app function over several inputs; (b) check that the page's headline figure (computed
independently) appears in `page(slug)`. Keep it plain JS (no TS).

## Pages that exist or will exist (valid `related` targets)
Built: /old-vs-new-tax-regime /home-loan-prepayment /sip-for-1-crore /step-up-sip /sukanya-samriddhi
/income-tax /credit-card-interest /gold-loan-calculator /post-office-td /income-tax-due-dates
Being written now: /emi /home-loan /car-loan /personal-loan /two-wheeler-loan /education-loan
/credit-card-payoff /credit-card-tracker /loan-foreclosure /cibil-score /overdraft-interest
/simple-interest /compound-interest /sip /lumpsum /swp /stp /cagr /portfolio-rebalancing /elss
/goal-planner /fd /rd /ppf /nsc /kvp /post-office-mis /scss /atal-pension /hra /capital-gains
/lrs-tcs /gst /salary-hike /tax-refund /epf /nps /gratuity /expense-tracker /business-tracker
/term-insurance-cover /health-insurance-claim-settlement-ratio /property-appreciation /break-even
/financial-planning /how-we-calculate
Category pages: /calculators/loans /calculators/investments /calculators/tax-salary
/calculators/retirement-govt-savings /calculators/credit-cards /calculators/expense-goals
/calculators/utilities · Schemes: /schemes and /schemes/<id> (ids in src/data/schemes.ts, e.g. c-pmkisan).

## FeatureDef category keys
loans · investments · tax · retire (retirement & govt savings) · cards (credit cards) · goals (expenses & goals) · utilities

## Scheme content writers
One file per scheme: `src/landing/schemes/content/<id>.ts` with `export default { … } satisfies SchemeContent`
(type in `src/landing/schemes/types.ts`; import it with `import type { SchemeContent } from '../types';`).
The page also shows the app's record from `src/data/schemes.ts` (read it for each scheme). Verify
everything on the scheme's official portal / guidelines PDF / PIB release / gazette, as of today.
Lead the title with the name people search (autocomplete lists: `seo/research/autocomplete-schemes.txt`).
`answer` = 2–3 sentences with a real amount/limit, the date and the source. `table` = benefits/amounts.
`eligibility`/`benefits`/`documents` only when the app's list is incomplete or wrong (then also list the
difference in `appIssues`). `statusSteps` only for schemes people check status for (steps end on the
official portal; never imitate a status checker). `verified: '2026-11-17'`. 5–8 FAQs, 2–5 related links.
If a scheme has ended, been replaced or cannot be verified from an official source, do not write a
content file: list it in your report with the reason (it stays noindex).

## Final report (your last message — the coordinator only sees this)
1. Files created (paths). 2. Per page: slug, primary query, headline figure + the app function that
computes it, official sources used. 3. Facts you could NOT verify (left out). 4. APP BUGs. 5. Pages you
marked noindex and why. 6. Any existing file that needs a change (coordinator does it). Keep it concise.
