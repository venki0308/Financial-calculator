# Facts verified for the tax page group — 17 November 2026

Pages: /hra, /capital-gains, /lrs-tcs, /gst, /salary-hike, /tax-refund. Every rule on those pages is
listed here with the official source and what it says. Income-tax facts already in
`verified-facts-2026-11-17.md` (slabs, rebate, standard deduction, surcharge, cess, due dates,
Form No. 130, section 437 rate) are reused and not repeated except where this group relied on more
of the text.

Sources (all fetched today):
- Income-tax Act, 2025 — https://egazette.gov.in/WriteReadData/2025/265620.pdf
- Finance Act, 2026 — https://egazette.gov.in/WriteReadData/2026/271439.pdf
- Memorandum to the Finance Bill 2026 — https://www.indiabudget.gov.in/doc/memo.pdf
- Income-tax Rules, 2026 — https://www.incometax.gov.in/iec/foportal/sites/default/files/2026-03/En-Notified-IT-Rules-2026-20-03-2026.pdf
- CII notification S.O. 3889(E), 15 Jul 2026 — https://egazette.gov.in/WriteReadData/2026/274522.pdf
- CII table, Income Tax Department — https://wm.incometaxindia.gov.in/w/view-all-cii
- RBI LRS FAQ (updated 6 Apr 2023) — https://www.rbi.org.in/commonman/english/Scripts/FAQs.aspx?Id=1834
- e-filing portal, Refund Status user manual — https://www.incometax.gov.in/iec/foportal/help/refund_status_user_manual
- GST Council / PIB, 56th meeting recommendations, 3 Sep 2025 — https://gstcouncil.gov.in/sites/default/files/2025-09/press_release_press_information_bureau_0.pdf
- PIB, "GST Reforms 2025", 4 Sep 2025 — https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/sep/doc202594628401.pdf
- PIB, "Next-Gen GST Process Reforms", 9 Oct 2026 — https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/oct/doc_10142_20261009_21430401.pdf
- Notification 9/2025-Integrated Tax (Rate), 17 Sep 2025 (ICAI-compiled copy hosted on cbic.gov.in) — https://courier.cbic.gov.in/ECCS/advisory/2025/NOTIFICATION%20NO.%209_2025-INTEGRATED%20TAX%20(RATE)%20-1759486719.pdf

## HRA (§8 contested — resolved)

| Fact | Official text |
|---|---|
| HRA exemption = special allowance for rent of a home the assessee occupies, not owned by him, rent actually paid; extent as prescribed | Act, Schedule III, Table Sl. No. 11, conditions (a)–(d) |
| Exempt = least of (a) allowance received for the period, (b) rent paid minus one-tenth of salary, (c) 50% of salary for **Mumbai, Kolkata, Delhi, Chennai, Hyderabad, Pune, Ahmedabad and Bengaluru**, 40% for any other place | Rules 2026, **rule 279** (Table Sl. 1 and 2; gazette p. 1776–1777). The 8-city list matches the app (en.json hra.metroCities). |
| "Relevant period" = period the accommodation was occupied in the tax year; "salary" includes DA if provided for under the terms of employment, excludes all other allowances and perquisites | rule 279(2) |
| Not in the new regime | Act s.202(2)(a) (already verified) |
| Evidence to employer: **Form No. 124**; for HRA, name, address and PAN of landlord(s) where aggregate rent in the tax year exceeds ₹1,00,000, and relationship | rule 205 |
| Not stated (not verified): that the list was "4 cities before"; Form 12BB → 124 equivalence; Noida/Gurugram/Thane status | left out |

## Capital gains

| Fact | Official text |
|---|---|
| Short-term capital asset = held not more than 24 months; 12 months for listed securities, UTI units, equity-oriented fund units, zero-coupon bonds | Act s.2(101)(a)–(b) |
| STCG on equity shares / equity-oriented fund / business-trust units with STT: 20%; resident individual/HUF uses unused basic exemption first | s.196(1), (2) |
| Other LTCG: 12.5%; resident individual/HUF land or building acquired **before 23 Jul 2024**: excess over tax at 20% on gain with indexed cost of acquisition **and indexed cost of improvement** is ignored (i.e. lower of the two) | s.197(1), (2), (3) |
| Equity LTCG (STT conditions): 12.5% on gains exceeding ₹1,25,000; unused basic exemption adjustment | s.198(1)–(3) |
| Specified Mutual Fund (>65% in debt and money-market instruments) units acquired on/after 1 Apr 2023: always short-term | s.76(1), (2)(a), (5)(b) |
| New-regime rebate (s.156(2)) cannot exceed tax at s.202(1) rates | s.156(3) |
| CII 2026-27 = 384, applies to tax year 2026-27 from 1 Apr 2026 | S.O. 3889(E), 15 Jul 2026, under s.72(8)(a) |
| CII 2001-02 … 2025-26 (100 … 376) | Department CII table — matches the app's `CII` table exactly |
| Finance Act 2026 did not change ss.196–198 rates (FA 2026 mentions them only for surcharge) | FA 2026 |

## TCS on LRS (§8 contested — resolved)

| Fact | Official text |
|---|---|
| s.394(1) Table Sl. 7: LRS remittance of an amount or aggregate exceeding ₹10 lakh — (a) education or medical treatment, (b) other purposes 20%; collected by the authorised dealer | Act s.394(1) |
| Sl. 7(a) changed **5% → 2%**; Sl. 8 (overseas tour programme package, collected by seller) (a) and (b) replaced by **2%** (no threshold) | Finance Act 2026, **section 85(e), (f)** |
| Effective **1 April 2026**; "at present" 5% (edu/medical) and 5%/20% (tour) | Memorandum, TCS rationalisation, paras 6, 8, 9 |
| No TCS by AD on amount already subject to tour-package TCS; none if the remittance is a **loan from a financial institution (s.129(3)(b): banking company or notified institution) for education** | s.394(4)(a), (b) |
| TCS is payment of tax on behalf of the collectee | s.390(5) |
| Employer may reduce salary TDS for TDS/TCS particulars furnished | s.392(4); rule 204 (Form No. 122) |
| TCS certificate Form No. 133; AIS Form No. 168 | rule 215 Table Sl. 4; rule 245 |
| LRS: up to USD 2,50,000 per financial year (April–March) per resident individual; PAN mandatory | RBI LRS FAQ |
| App check: `computeLrsTcs` (eduMedical 2% above ₹10L, other 20% above ₹10L, tour 2% flat, eduLoan nil) | **Matches** — no app bug |
| Not verified (left out): whether loan-funded remittances count towards the ₹10 lakh; the pre-2026 rate for loan-funded education | left out |

## GST (§8 contested — resolved)

| Fact | Official text |
|---|---|
| 2-rate structure: Standard 18%, Merit 5%; special de-merit 40% for a select few goods and services | GST Council / PIB 3 Sep 2025 |
| Services and all goods except pan masala, gutkha, cigarettes, chewing tobacco, unmanufactured tobacco, bidi: from **22 Sep 2025**; those stay at existing rates + compensation cess until cess-account loans are discharged | same, part III |
| Individual life and health insurance policies (incl. family floater, senior citizens) exempt | same |
| 12% and 28% rates removed ("two-slab system of 5% and 18%, removing the earlier 12% and 28% rates"); 40% on pan masala, tobacco, aerated drinks, high-end cars, yachts, private aircraft; examples TVs/ACs/cement/small cars/2-wheelers ≤350cc 28%→18%, tractors 12%→5% | PIB 4 Sep 2025 |
| Still "two main rates, 5% and 18%, and a special 40% rate" (57th meeting, Oct 2026) | PIB 9 Oct 2026 |
| IGST schedules: 5%, 18%, 40%, 3% (gold, silver, platinum, jewellery, coins), 0.25% (rough diamonds, precious stones), 1.5% (other diamonds), 28% (Schedule VII: pan masala, tobacco) | Notification 9/2025-IT(Rate) |
| Not verified (left out): CGST/SGST equal-split wording (CBIC rate page now only links out); status of the tobacco transition in 2026; later amendments 01/2026, 02/2026 (not read) | left out |

## Refunds

| Fact | Official text |
|---|---|
| Refund of tax paid beyond the amount properly chargeable | Act s.431 |
| Claim for refund = return under s.263 | s.433 |
| Interest 0.5% per month or part of a month: refund of TCS/advance tax/tax treated as paid under s.390(5) (TDS) — from 1 April of the year following the tax year to grant, if the return is filed by the s.263(1) due date; otherwise from date of filing | s.437(1) Table Sl. 1 |
| No interest if refund < 10% of tax determined under s.270(1) or on regular assessment | s.437(2) |
| Refund status: e-File → Income Tax Returns → View Filed Returns → View Details; prerequisites PAN–Aadhaar linked; pre-validated bank account compulsory; statuses issued / partially adjusted / fully adjusted / failed; processing after e-verification | e-filing portal refund status manual |
| Form No. 122 (other employers' salary, TDS/TCS to employer) | rule 204 |
| Not verified (left out): rounding of refunds to ₹10 under the new Act; ₹100 minimum refund | left out |

## App issues found (app not changed)

1. **APP BUG** `src/utils/calculations.ts: computeCapitalGains` — the indexation route does not index the cost of improvement (the screen note says so), but s.197(3) of the Act uses the indexed cost of improvement too. Example: property bought Jun 2010 for ₹20 lakh, ₹10 lakh improvement in FY 2015-16, sold 17 Nov 2026 for ₹1 crore: app ₹9,10,000 (12.5% route); correct ₹8,08,992 (20% with indexed cost and indexed improvement). The app also takes no improvement year. The website pages use no improvement cost, so no wrong figure is published.
2. **APP BUG** `src/pages/SalaryHikeCalculator.tsx: estimateTaxOnIncome` — no surcharge above ₹50 lakh taxable income. ₹48 lakh → 10% hike: screen extra tax ₹1,49,760; correct (compareSalaryTax, 10% surcharge with marginal relief) ₹2,68,476. The website uses compareSalaryTax.
3. `src/pages/GSTCalculator.tsx` offers 12% and 28% chips and its comment calls 5/12/18/28 "standard slabs (unchanged)"; since 22 Sep 2025 the main rates are 5%, 18% and 40% (28% survives only for some tobacco products). The website calculator offers 5/18/40/3.
4. `en.json hra.newRegimeDisabledBody` cites "Section 115BAC" (old Act); the provision is now s.202 of the Income-tax Act, 2025.
