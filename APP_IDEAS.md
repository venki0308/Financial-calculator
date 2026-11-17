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

## App issues found (17 Nov 2026)

1. **Post Office TD calculator overstates multi-year deposits.** `src/pages/POTDCalculator.tsx`
   compounds interest across years. The scheme compounds quarterly but pays interest out every
   year and adds no interest on interest left unwithdrawn (NSTD Scheme 2019, paras 7(2) and 7(7)).
   The website uses the scheme rule (`features/math.ts` `poTd`).
2. **"RBI mandates 18% GST"** (en.json `ccInterest.gstNote` and the card disclaimer): the 18% GST
   comes from GST law (CGST rate notifications 11/2017 and 12/2017), not from RBI.
3. **"AY 2027-28"** in the tax disclaimer and labels: under the Income-tax Act, 2025 the year is
   "tax year 2026-27"; there is no assessment year.
4. **Gold loan default rate ₹13,600/g** vs IBJA 999 ₹13,420/g on 17 Nov 2026.
5. **Gold loan tiers near ₹2.5 lakh and ₹5 lakh.** `computeTieredLTV` picks 80% as soon as 85% of
   the value exceeds ₹2.5 lakh, but a loan of up to ₹2.5 lakh is allowed at 85%, so near the
   boundary the app shows less than the RBI limit (e.g. gold worth ₹3,05,000: app ₹2,44,000;
   allowed ₹2,50,000). Same at ₹5 lakh. The website table notes this.
6. **`getMinimumDue` comment** calls 5% of the balance the "RBI standard"; RBI only requires that
   the minimum due causes no negative amortisation.
7. **Mortgage disclaimer** cites "RBI Circular 2014" and "2–4%" charges on fixed-rate loans; the
   current source is the RBI (Responsible Business Conduct) Directions, 2025, paras 352–353, and
   the 2–4% figure has no source.
