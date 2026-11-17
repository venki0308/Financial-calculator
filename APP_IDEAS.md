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

## App issues found during the SEO programme (17 Nov 2026) — open, not shown on any website page

6. **RD live status overstates maturity** — `investmentStatusEngine.calculateRdStatus` compounds whole
   quarters: ₹100/month, 60 months, 6.7% → app ₹7,176.14, scheme ₹7,136.58 (₹1,500 → ₹1,07,642 vs
   India Post ₹1,07,049). NSRD Scheme 2019 para 9 table. The RD screen's own formula is correct.
7. **KVP live status one month long** — `calculateKvpStatus` uses Math.ceil: 7.5% → 116 months; NSI says 115.
8. **KVP premature-encashment rows too high** — `KVPCalculator.tsx` compounds at the full rate; the scheme
   pays fixed table values (NSI Table-2 at 6.9%: ₹1,154 per ₹1,000 at 2½ years; app ≈ ₹1,181).
9. **KVP doubling months at past rates** — Math.round formula gives 125/114/111 months at 6.9/7.6/7.8%;
   NSI says 124/113/110 (only if a user types those rates).
10. **PPF live-status withdrawal base** — `calculatePpfStatus` uses 50% of the year-4 balance; the rule is
    50% of the lower of the balance at the end of the 4th preceding year or the preceding year (PPF Scheme 2019 para 10).
11. **c-scss record** (`src/data/schemes.ts`) — eligibility omits the 3-month window and the cap at retirement
    benefits; "NRIs not eligible" is not in the scheme text; documents omit PAN, photo and the employer certificate.
12. **RD screen "+0.5% senior" toggle** on the Post Office RD default — the scheme has no senior rate.
13. **Asset allocation rounding** — `src/constants/assetAllocation.ts` `suggestAllocation` returns 101% for some
    young aggressive profiles (e.g. age 25, aggressive, wealth goal → 76/0/10/0/10/5).
14. **`calculateTaxBenefits` field names** still say 80C/24 (Income-tax Act 2025: s.123 / s.22); the EMI
    screen's "most banks recommend 40%" text has no source.
15. **Gratuity screen** (`GratuityCalculator.tsx`): counts a leftover of exactly six months as a full year
    (`fraction >= 0.5`; Code on Social Security s.53(2) counts only a part "in excess of six months"): 7 years
    6 months at ₹30,000 → app ₹1,38,462, correct ₹1,21,154. Treats 4 years 240 days as eligible (s.53(1): five
    years). Tax part assumes a ₹20 lakh exempt limit under "s.10(10)" (1961 Act; not verified under the 2025 Act).
16. **c-nps record** — eligibility says age 18–70 (now 18–85); benefits say minimum 40% annuity (now 20% for
    non-Government subscribers, PFRDA amendment 16 Dec 2025). /schemes/c-nps now redirects to /nps.
17. **EPF screen assumption** — always sends 8.33% (capped) to EPS; someone who joined above the wage ceiling
    is not an EPS member. The website states the EPS-member assumption.
18. **Scheme records** — differences found on official portals are listed in each website scheme file's
    `appIssues` (src/landing/schemes/content/*.ts), e.g. PMKVY age 15–59 (app 15–45), DDU-GKY placement 70%
    (app 75%), PM-SYM income-tax-payer exclusion missing, Tele MANAS second number 1-800-891-4416 missing.
    The website shows the verified versions; the app's records need the same corrections.

## App issues — fixed in the shared code during the SEO programme (17 Nov 2026; needs an Android rebuild)

- **EMI schedules kept charging after an early payoff.** `generateAmortization` (used by
  `calculateReducingEMI`, 46 call sites) recorded full EMIs on a zero balance once the rounded-up EMI had
  cleared a small loan before its last month, overstating total interest (₹10,000 at 24% for 30 years: ₹62,159
  shown, ₹43,830 correct). Now the clearing month pays only what is left and later rows carry ₹0 (one row
  per month is kept). Typical loans are unchanged to the rupee (₹30 lakh at 8.5% for 20 years: ₹32,48,210).
  qa-calculators 2Y. Live calculators on the website could show the wrong figure, so it was fixed now.

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
