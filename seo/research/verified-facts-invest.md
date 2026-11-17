# Facts verified for the investment pages — 17 November 2026 (group `invest`)

Pages: /sip /lumpsum /swp /stp /cagr /portfolio-rebalancing /elss /goal-planner.
Every rule on these pages is listed here with the official text it rests on. Figures are not
listed: they are computed at build time by the app's functions (see each page file's header).

## Income-tax Act, 2025 (Gazette of India, 21 Aug 2025) — https://egazette.gov.in/WriteReadData/2025/265620.pdf

Read from the gazette PDF (pdftotext) on 17 Nov 2026.

| Fact used on a page | Provision and what it says | Pages |
|---|---|---|
| Section 123 (old 80C): Schedule XV items together, up to ₹1,50,000 a tax year | s.123: "deduction of the whole of the amount paid or deposited … being the aggregate of the sums enumerated in Schedule XV, as does not exceed 150000" | elss |
| ELSS units qualify under section 123 | Schedule XV para 1(m): "subscription to any units of any Mutual Fund referred to in serial number 20 or 21 of the Table in Schedule VII … under any plan formulated in accordance with such scheme notified by the Central Government" (the notified scheme is the Equity Linked Savings Scheme, 2005 — named in the SEBI circular below) | elss |
| No section 123 deduction in the New Regime | s.202(2)(a)(xii): New Regime income computed without any deduction under "Chapter VIII other than the provisions of sections 124(1) and 124(2), or 125(2) or 146" (s.123 is in Chapter VIII) | elss |
| Capital gain = sale value − cost (and transfer expenses) | s.72(1) | swp, stp, portfolio-rebalancing |
| Equity fund units: short-term gains taxed at 20% | s.196(1) (STT-paid equity shares / units of an equity oriented fund) | sip, lumpsum, swp, portfolio-rebalancing |
| Equity fund units held > 12 months: 12.5% on long-term gains above ₹1,25,000 a year | s.198(2)(a) "long-term capital gains exceeding 125000 at the rate of 12.5%"; holding period > 12 months confirmed in verified-facts-2026-11-17.md | sip, lumpsum, swp, elss, portfolio-rebalancing |
| "Equity oriented fund" = more than 65% in domestic equity shares | definition at line ~7938 of the gazette text ("more than 65% of the total proceeds") | elss (ELSS's 80% equity makes it one) |
| Debt-fund units bought on/after 1 Apr 2023: gains always short-term | s.76(1)-(2)(a): gains on "a unit of a Specified Mutual Fund acquired on or after the 1st April, 2023" "shall be treated as short-term capital gains"; s.76(5)(b): Specified Mutual Fund = invests more than 65% in debt and money-market instruments | swp, stp, portfolio-rebalancing |

Slabs, rebate, standard deduction, surcharge and 4% cess: reused from verified-facts-2026-11-17.md
(Finance Act 2026, https://egazette.gov.in/WriteReadData/2026/271439.pdf); computed by the app's
compareSalaryTax.

## SEBI

| Fact | Source and wording |
|---|---|
| ELSS: open-ended, at least 80% in equity, statutory lock-in of 3 years | SEBI circular SEBI/HO/IMD/DF3/CIR/P/2017/114, 6 Oct 2017, "Categorization and Rationalization of Mutual Fund Schemes", Annexure A, equity scheme 10 (ELSS): "Minimum investment in equity & equity related instruments - 80% of total assets (in accordance with Equity Linked Saving Scheme, 2005 notified by Ministry of Finance)" / "An open ended equity linked saving scheme with a statutory lock in of 3 years and tax benefit". https://www.sebi.gov.in/legal/circulars/oct-2017/categorization-and-rationalization-of-mutual-fund-schemes_36199.html (PDF https://www.sebi.gov.in/sebi_data/attachdocs/oct-2017/1509103633344.pdf). Now consolidated in the Master Circular for Mutual Funds (clause 2.6). |
| Mutual fund returns are not guaranteed; read scheme documents | SEBI investor portal https://investor.sebi.gov.in/ (also the app's own disclaimer text) |

## Small savings (for comparisons only)

| Fact | Source |
|---|---|
| PPF 7.1%, Post Office savings account 4.0% for Oct–Dec 2026 | DEA OM 30.09.2026, already verified in verified-facts-2026-11-17.md (http://www.dea.gov.in/budget-division/475); figures read from the app's SMALL_SAVINGS |

## Could NOT verify from an official source (left out of the pages)

- **ELSS lock-in "per SIP instalment"** (each instalment locked for 3 years from its own allotment
  date). The ELSS 2005 notification (No. 226/2005) on incometaxindia.gov.in returned HTTP 403 to
  both WebFetch and curl; only third-party sites state the per-instalment rule. The pages say only
  "statutory lock-in of 3 years" (SEBI).
- Any "safe withdrawal rate", typical fund returns, education-inflation figures, or advice on how
  often to rebalance: no official source; the pages use clearly labelled assumptions instead.
- Tax on gold and international funds when rebalancing: not stated.

## App notes (not bugs against an official rule)

- constants/assetAllocation.ts suggestAllocation: for young aggressive profiles the rounded mix adds
  up to 101% (e.g. age 25, aggressive, wealth goal → 76/0/10/0/10/5). The page shows only
  conservative and moderate rows, which add up to 100%.
- STP model (stpCalculations.ts): returns are smooth, so an STP can never beat investing on day one
  when the equity return is higher than the source fund's. The page says so.
- SWP screen has no rising (inflation-linked) withdrawal; the page shows the app's "last withdrawal
  in today's money" figure instead of inventing a rising-withdrawal schedule.
