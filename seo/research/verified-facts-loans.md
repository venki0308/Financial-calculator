# Facts verified for the loan pages — 17 November 2026 (group `loans`)

Pages: /emi, /home-loan, /car-loan, /personal-loan, /two-wheeler-loan, /education-loan.
Every rule stated on those pages is listed here with the official text it comes from. Figures on
the pages are computed by the app's functions (src/utils/calculations.ts) or math-loans.ts and are
not repeated here.

## Income-tax Act, 2025 (in force 1 April 2026) — read from the gazette PDF today

Source: https://egazette.gov.in/WriteReadData/2025/265620.pdf · Finance Act, 2026:
https://egazette.gov.in/WriteReadData/2026/271439.pdf (s. 1(2)(a): ss. 2–129 in force 1 Apr 2026)

| Fact (page) | What the text says |
|---|---|
| s. 22(1)(b) — interest on borrowed capital for acquiring/constructing/repairing a house is deducted from house-property income (home-loan) | "where the property has been acquired, constructed, repaired, renewed or reconstructed with borrowed capital, the amount of any interest payable on such capital" |
| s. 22(1)(c) — pre-construction interest in five equal instalments (home-loan) | "...interest payable for the said prior period in five equal instalments for the said tax year and for each of the four immediately succeeding tax years" |
| s. 22(2) — for s. 21(6) (self-occupied) property: ₹2,00,000 if acquisition/construction completed within five years from the end of the tax year in which capital was borrowed **and** lender's certificate; ₹30,000 in any other case. s. 22(5): aggregate for such properties ≤ ₹2,00,000 (home-loan) | Confirmed. **Finance Act 2026 s. 38** substitutes "sub-section (1)(b) and (c)" for "sub-section (1)(b)" in s. 22(2), so pre-construction instalments share the cap. |
| s. 21(6)–(7) — nil annual value for own residence, for two houses at most (home-loan) | Confirmed |
| s. 109(1)(b) — house-property loss set off against other heads up to ₹2,00,000 (home-loan) | Confirmed |
| s. 110 — unabsorbed house-property loss carried forward, only against house-property income, max 8 tax years (home-loan) | Confirmed |
| s. 123 + Schedule XV — ₹1,50,000 aggregate; para 1(r) and para 3(a)(iii): repayment of amount borrowed from Central/State Govt, bank incl. co-operative bank, LIC, NHB, public housing-finance company (s. 32(e)), house-financing company/co-op, certain employers; 3(a)(iv) stamp duty, registration fee (home-loan) | Confirmed. Replaces old 80C. |
| s. 129 — interest on loan for higher education of self or relative (spouse, children, student for whom legal guardian), from a financial institution (bank or notified) or approved charitable institution; paid out of income chargeable to tax; initial tax year (year interest payment starts) + 7 following, or until paid; "higher education" = any course after senior secondary; no monetary cap (education-loan) | Confirmed. **Replaces old 80E** (section number matched by provision text). |
| s. 202(2)(a)(v) — new regime: no deduction under s. 22(1)(b) for s. 21(6) properties; (xii) no Chapter VIII deductions except ss. 124(1)-(2), 125(2), 146 (so no s. 123, no s. 129); (b)(ii) no set-off of house-property loss against other heads (home-loan, education-loan) | Confirmed (s. 123 and s. 129 sit in Chapter VIII, which runs from before s. 123 to Chapter IX). FA 2026 s. 56 only omits sub-clause (iii) (s. 144). |

## GST on loan charges (personal-loan)

| Fact | Source and text |
|---|---|
| Interest on loans exempt: entry 27, heading 9971, "(a) extending deposits, loans or advances in so far as the consideration is represented by way of interest or discount (other than interest involved in credit card services)" — Nil | CGST Notification 12/2017-CT(Rate) https://cbic-gst.gov.in/hindi/pdf/central-tax-rate/Notification12-CGST.pdf |
| Other financial and related services, heading 9971 Sl. 15(v): CGST 9% (+ SGST 9% = 18%) — so a processing fee (not interest) is taxable at 18% | CGST Notification 11/2017-CT(Rate) https://cbic-gst.gov.in/hindi/pdf/central-tax-rate/Notification11-CGST.pdf ; unchanged by the 2025 rationalisation per seo/research/verified-facts-2026-11-17.md |

## RBI (all pages) — Commercial Banks Responsible Business Conduct Directions, 2025 (updated 1 Oct 2026)

Source: https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13140 (downloaded and read today)

| Para | Text relied on |
|---|---|
| 4(3) | APR = "annual cost of credit to the borrower which includes interest rate and all other charges associated with the credit facility" |
| 348 | KFS for all new retail and MSME term loans sanctioned on or after 1 Oct 2024; validity ≥ 3 working days (tenor ≥ 7 days); KFS includes APR computation sheet and amortisation schedule; "APR will include all charges which are levied by the bank"; illustration: ₹20,000, fees ₹400, 24 × ₹970, net disbursed ₹19,600, APR 17.07% "computed on net disbursed amount using IRR approach and reducing balance method" (our aprOnNet gives 17.10% on the same inputs — the RBI example has a 30-day first instalment); third-party charges in APR (348(4)); fees not in KFS cannot be charged without explicit consent (348(5)) |
| 349 | Reset of floating rate on EMI-based personal loans (from 1 Jan 2024): communicate impact at sanction and any EMI/tenor increase; option to switch to fixed (bank's option); choice of higher EMI, longer tenor or both, and to prepay; Note names "home loan" as example; no negative amortisation (349(5)); quarterly statement with principal and interest recovered, EMI, EMIs left, annualised rate/APR (349(6)) |
| 351 | Penal charges, not penal interest; no capitalisation; levied on the amount in default; disclosed in loan agreement and KFS; interest on unpaid EMI at the contracted rate allowed |
| 352–353 | No pre-payment charges on floating-rate loans to individuals for non-business purposes (existing and from 1 Jan 2026), any source of funds, no lock-in; others per bank policy, based on amount prepaid; must be disclosed in sanction letter, agreement and KFS; undisclosed charges cannot be levied |

## RBI — Credit Information Companies Directions, 2025 (updated 1 July 2026) (personal-loan, two-wheeler-loan)

Source: https://www.rbi.org.in/scripts/NotificationUser.aspx?Id=12926

| Para | Text relied on |
|---|---|
| 15(1) | CIs submit credit information as on the 9th, 16th, 23rd and last day of the month; incremental files include accounts where interest/instalment is overdue; full file by the 5th of next month (substituted w.e.f. 1 July 2026) |
| (scores) | Credit scores calibrated from 300 to 900 by every CIC; one Free Full Credit Report including score, once a year (January–December), electronic, on request, after authentication |
| 37(i) | CIC alerts customers by SMS/email when their report is accessed (where mobile/email available, when the enquiry reflects in the report) |
| 29 | "The four CICs" (basis for "all four credit information companies") |

No score-to-rate figures are used (SEO_PLAN §8: CIBIL figures only from a lender's official page).

## Education-loan schemes (education-loan)

| Fact | Source |
|---|---|
| PM-Vidyalaxmi (Cabinet, 6 Nov 2024): collateral-free, guarantor-free loans for admission to QHEIs (NIRF-based list); 75% credit guarantee for loans up to ₹7.5 lakh; 3% interest subvention during moratorium on loans up to ₹10 lakh for family income up to ₹8 lakh, not eligible for other scholarship/subvention, 1 lakh students a year; PM-USP CSIS: full interest subvention during moratorium for family income up to ₹4.5 lakh, technical/professional courses, loans up to ₹10 lakh | PIB https://www.pib.gov.in/PressReleasePage.aspx?PRID=2071131 (fetched with curl; WebFetch got HTTP 403) |
| PIB backgrounder 29 Jul 2026: 1,425 QHEIs; merit admissions only; no cut-off on highest loan amount (fees, hostel/mess, laptop, living expenses); rate capped at EBLR + 0.5%; repayment up to 15 years excluding moratorium = course period + 1 year; subvention only on up to ₹10 lakh of principal; other scholarship/subvention/fee reimbursement → not eligible under CSIS or PM-Vidyalaxmi; up to 1% extra concession if interest serviced during study (not used on the page) | PIB https://www.pib.gov.in/PressReleasePage.aspx?PRID=2290972 |

## Checked and left out (could not verify from an official source today)

- **Car depreciation / IDV percentages.** IRDAI hosts insurer policy wordings with two different schedules (5/15/20/30/40/50% in some, nil/5/10/15/25/35/40/50% in stand-alone own-damage wordings). Not a regulation and not consistent, so the page prints no depreciation figures and says why.
- **Housing-loan LTV caps (90/80/75%).** The tiers differ between RBI's directions for HFCs, commercial banks and RRBs; not resolved, so not stated.
- **Market interest rates** (bank home/car/personal/two-wheeler rates, repo rate). Not used; rates on the pages are labelled as example inputs (8.5%, 9%, 12%, 11.5%, 13% = the app's defaults where noted).
- **Typical processing-fee percentages, RTO/road-tax rates, insurance premiums.** Used only as illustrative inputs, labelled as examples.
- **"Most banks keep EMI under 40% of income".** The app says this in an insight; not verified, so the home-loan page only says the app warns above 40%.
- **Moratorium interest method (simple vs compound) at individual lenders.** Not regulated; the page assumes simple interest and says so.

## App issues found (not changed)

1. **APP BUG — src/utils/calculations.ts: generateAmortization (used by calculateReducingEMI).**
   When the rounded-up EMI clears the balance before the last month, the remaining rows still record
   the full EMI (`actualEmi = emi`) with zero opening balance, so totalPayment/totalInterest are
   overstated. Example: ₹10,000 at 24% for 360 months → app interest ₹62,159; the loan actually
   closes in month 268 and interest is ₹43,830. ₹50,000 at 16% for 360 months → app ₹1,91,607 vs
   ₹1,87,080. No figure printed on the loan pages is affected (232 page inputs checked: difference
   ≤ ₹1), but the calculator islands reach this range for small loans over long tenures.
2. calculateTaxBenefits labels its fields deduction80C / deduction24 (pre-2025-Act names); the
   website shows them as section 123 / section 22.
3. EMICalculator.tsx insight text "Most banks recommend keeping EMI below 40% of take-home salary" —
   unsourced.
