# App ideas and app issues (backlog)

Things found while building the website that belong in the Android app. Nothing here has been
changed in the app; each needs its own app release. Sources: `seo/research/verified-facts-2026-11-17.md`.

## Ideas

- **Moratorium support in the education loan calculator.** Interest during the course and grace
  period (simple or added to the principal), then EMIs. The website explains it with a worked
  example but does not claim the app models it (SEO plan §9, decision 1).
- **Move the formulas that live inside screens into `src/utils`** (step-up SIP, goal SIP, SSY,
  gold loan), so the website can import them instead of copying them into
  `src/landing/features/math.ts`. `scripts/qa-feature-pages.mjs` fails if a screen's formula changes.

## App issues — open

1. **"AY 2027-28"** in the tax disclaimer and labels (deferred by the owner, 17 Nov 2026): under the
   Income-tax Act, 2025 the year is "tax year 2026-27"; there is no assessment year.
2. **Gold loan default rate ₹13,600/g** (deferred by the owner, 17 Nov 2026) vs IBJA 999 ₹13,420/g
   on 17 Nov 2026. Refresh with the rate cycle.
3. **`getMinimumDue` comment** calls 5% of the balance the "RBI standard"; RBI only requires that
   the minimum due causes no negative amortisation.
4. **Mortgage disclaimer** cites "RBI Circular 2014" and "2–4%" charges on fixed-rate loans; the
   current source is the RBI (Responsible Business Conduct) Directions, 2025, paras 352–353, and
   the 2–4% figure has no source.
5. **Post Office TD "premature value"** in the live status (screen, My Loans, Loan Detail) uses the
   generic FD estimate (rate minus 1 point). The 2023 amendment's rules differ: no closure before
   6 months; savings rate before 1 year; shorter-term rate minus 2 points for 2/3-year TDs; a
   5-year TD only after 4 years, at the savings rate.

## App issues — fixed for 1.2.9 (build 22), 17 Nov 2026

- **Post Office TD overstated multi-year deposits** (compounded across years). Now the scheme
  rule — compounded quarterly, paid yearly, no interest on interest — in one function,
  `calculatePOTD` (src/utils/calculations.ts), used by the app screen, the tracked-TD status
  (`calculateFdStatus` with `payout: 'yearly'`) and fincalix.com/post-office-td. ₹1 lakh for 5
  years at 7.5%: ₹1,38,568 (was ₹1,44,995).
- **"RBI mandates 18% GST"** (`ccInterest.gstNote` in all six languages, the card screen's PDF
  note): now "18% GST applies to credit card finance charges and fees", no RBI attribution.
  Hindi/Telugu/Tamil/Kannada/Malayalam wording needs the native-speaker review already planned.
- **Gold loan limits near ₹2.5 lakh and ₹5 lakh.** The cap now follows the loan's own size
  (`goldLoanMaxLoan`, `goldValueForLoan`, shared with the website): gold worth ₹3,05,000 gets
  ₹2,50,000 (was ₹2,44,000). Whole rupees are rounded down so a figure never exceeds the limit.
