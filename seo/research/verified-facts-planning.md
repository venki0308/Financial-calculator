# Facts verified for the planning group — 17 November 2026

Pages: /expense-tracker, /business-tracker, /term-insurance-cover, /health-insurance-claim-settlement-ratio,
/property-appreciation, /break-even, /financial-planning. Income-tax facts (slabs, rebate, s.408 advance tax,
s.263 return dates) are reused from `verified-facts-2026-11-17.md` with the same Gazette links.

## IRDAI — health claims (§8 contested: "only from IRDAI's annual report, with year")

| Fact | Source and what it says |
|---|---|
| Latest annual report is 2024-25; none for 2025-26 yet | https://irdai.gov.in/annual-reports (listing tops out at 2024-25; PDF v2.0 dated 2 Jan 2026) |
| Table I.29 "Status of Claims under Health Insurance of General and Health Insurers" (printed p. 43): number (lakh) O/S start 20.73, registered 351.85, total 372.58, paid 326.01 (87.50%), disallowed 0.00, repudiated 29.51 (7.92%), O/S end 17.07 (4.58%); amount (₹ cr) 7,584.58 / 1,24,903.22 / 1,32,487.81 / 94,247.60 (71.14%) / 18,521.02 (13.98%) / 11,412.42 (8.61%) / 8,306.76 (6.27%) | Annual Report 2024-25, read from the PDF text. Percentages are "percentage to total" (total = O/S start + registered) |
| Para I.6.5.6: "insurers have settled about 87 per cent … repudiated about 8 per cent … about 5 per cent were pending" as on 31 Mar 2025 | Annual Report 2024-25, p. 42 |
| Annual Report has **no insurer-wise health claims table** | Checked the list of tables, Statements 1–18, Annexures 1–11 |
| Para I.6.5.5: 3.26 crore claims settled, ₹94,248 crore paid, average ₹28,910 per claim; 69% via TPAs, 31% in-house; by number 58% cashless, 41% reimbursement, 1% both; by amount 66.35% cashless | Annual Report 2024-25, p. 42 (Table I.28 note: excludes PA and travel) |
| Insurers must display on their website the cashless network hospitals and the cashless and reimbursement claim procedures (Chapter I, para (5)) | IRDAI Master Circular on Health Insurance Business, 29 May 2024 |
| **Not used (owner decision: Annual Report figures only):** IRDAI Handbook on Indian Insurance Statistics 2024-25, Table 53 (insurer-wise claim counts, all lines for general insurers; whole book incl. PA/travel for stand-alone health insurers), https://irdai.gov.in/document-detail?documentId=8658868. Removed from the page on 17 Nov 2026 | — |
| Cashless decision within 1 hour (para 15(b)); discharge authorisation within 3 hours, delay charges borne by insurer from shareholders' funds (para 16); no repudiation without PMC/Claims Review Committee approval (para 17) | IRDAI Master Circular on Health Insurance Business, IRDAI/HLT/CIR/PRO/84/5/2024, 29 May 2024 (v2.1 PDF linked on the page) |
| Non-cashless health claims settled within **15 days** of submission (not 30); late = interest at bank rate + 2% suo motu | Master Circular on Protection of Policyholders' Interests, IRDAI/PP&GR/CIR/MISC/117/9/2024, 5 Sep 2024, Section 1 Part B, claims para 3(iii)6 and 2(ii) |

## IRDAI / DFS — life (term) insurance

| Fact | Source |
|---|---|
| Free-look 30 days for life policies with term ≥ 1 year; refund less proportionate risk premium, medical and stamp-duty costs; refund within 7 days, else interest at bank rate + 2% | PPI Master Circular 2024, Section 1 Part A, III.2 |
| Grace period: 15 days (monthly), 30 days (quarterly/half-yearly/yearly); cover continues | Same, IV.2 |
| Death claims: 15 days from intimation; 45 days if investigation needed; late = bank rate + 2% | Same, claims para 2 |
| No life policy contestable after 3 years from policy/risk/revival/rider date | Same, III.6 |
| GST on individual life and health policies cut from 18% to nil from 22 Sep 2025; group policies stay 18% | Department of Financial Services, https://financialservices.gov.in/exemption-gst-all-individual-life-insurance-and-health-insurance-policies (page dated 05.01.2026); CGST notification 16/2025-CT(Rate), 17 Sep 2025 (text not opened) |

## RBI

| Fact | Source |
|---|---|
| All-India HPI Q1 2026-27: 117.5; +1.1% q-o-q; +3.6% y-o-y, same as Q1 a year earlier; base 2022-23; 18 cities; registration-authority transaction data; provisional | RBI press release 2026-2027/958, 24 Aug 2026, https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=63436 |
| Budget = plan of future income and expenses (yearly/monthly/weekly); compare with actual; set aside part of income before spending; keep part of savings liquid | RBI Financial Awareness Messages (FAME), 4th edition, Feb 2024, Message 1, pp. 1–2, https://www.rbi.org.in/commonman/images/FAME202426022024.pdf |

## Left out (could not verify from an official source)

- GST registration thresholds (₹40 lakh goods / ₹20 lakh services): CBIC notification PDF returned 404.
- MSME / Udyam classification limits (S.O. 1364(E), 21 Mar 2025): msme.gov.in 403, Udyam portal certificate error.
- Death benefit tax exemption (old s.10(10D)) and premium deduction (old 80C → s.123) for term insurance: new-Act section for 10(10D) not verified; not stated.
- Any premium figures: the app's term/health premium ranges are not from insurer rate pages, so none are published.
- "50/30/20" attribution/origin: presented only as a budgeting convention.

## App issues found (not changed)

1. **APP BUG (minor)** — src/pages/AIFinancialAssistant.tsx `estimateAnnualTax`: no surcharge. Gross ₹60 lakh/yr → app ₹14,11,800, correct (compareSalaryTax, incomeTax.ts) ₹15,52,980; ₹72 lakh → ₹17,86,200 vs ₹19,64,820. Matches exactly up to ₹50 lakh. The website calculator caps salary at ₹4 lakh/month.
2. src/locales/en.json `ins.life.recSubtitle` "Human Life Value method — IRDAI advisor standard" and `ins.life.irdaiConsensus`: IRDAI prescribes no 15×/20× income multiple; the method is an income multiple, not HLV.
3. `ins.advisor.csr*` bands ("Most major insurers fall here", "Source: IRDAI Annual Report"): the Annual Report has no insurer-wise CSR; the bands are not IRDAI figures.
4. Smart Planner code comment "RBI guideline is 40% of net monthly income": no such RBI rule (comment only; the UI text does not cite RBI).
5. src/pages/InsuranceCalculator.tsx `tax80C` labels "Section 80C" (now s.123 under the Income-tax Act, 2025).
6. HealthScoreService/InsightEngine are only used by src/pages/expenses/DashboardTab.tsx, which no screen imports (dead code for users).
