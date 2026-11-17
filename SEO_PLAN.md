# FinCalix SEO + GEO plan — Phase 0 (audit and keyword map)

Prepared 17 November 2026 on branch `seo/phase-1`. Nothing in this phase changes the website.
**Status: waiting for your approval.** The decisions I need are listed in section 9.

---

## 1. Summary

- The app has **54 tools** (47 calculators, 7 trackers and planners) and **51 central schemes**. You also listed two features that are not in the tool registry: the **credit card manager** and **reminders**.
- **31 tools** have a website page today. Those pages are 27 calculator guides, and some guides cover several tools: four app tools all point at `/emi`, for example. **23 tools** land only on a category page.
- **38 scheme pages** are indexed. **13 are noindex** because their text is too short.
- **The existing guides look alike.** All 27 are 1,100–1,800 words. Each has exactly 4 FAQs and 0–3 tables. None links an official source, none has an answer-first block with a source, and many titles are over 60 characters.
- **The four loan guides overlap.** `/emi`, `/home-loan`, `/car-loan` and `/personal-loan` share 24–33% of their 5-word phrases and compete for the same queries. That is both a near-duplicate risk and keyword cannibalisation.
- **Three scheme pages duplicate guides.** `/schemes/c-ssy`, `/schemes/c-scss` and `/schemes/c-nps` are indexed next to `/sukanya-samriddhi`, `/scss` and `/nps`.
- **What the competition misses.** Across about 160 competitor pages I looked at:
  - Almost none links an official source or shows a last-updated date.
  - None has Hindi or Hinglish body text.
  - Many have arithmetic errors or stale years (FY 2024-25 or FY 2025-26 figures, 2022–2023 pages).

  The searches themselves are full of Hinglish ("emi kitna aayega", "income tax kitna lagta hai", "sip me kitna interest milta hai").
- **Realistic outlook.** fincalix.com is a young domain. Head terms such as "sip calculator", "fd calculator", "emi calculator" and "gst calculator" belong to Groww, Zerodha, Upstox, ClearTax, Business Today and the banks, and are unlikely to move for months. The wins are:
  - specific intents where the top results are thin or wrong (old vs new regime, home loan prepayment, SIP for ₹1 crore, step-up SIP, gold loan per gram, credit card interest and minimum due, post office TD);
  - the real-number long tail ("30 lakh home loan emi", "sip 5000 per month for 20 years", "which tax regime is better for 20 lakhs"). Those queries become **table rows and worked examples on one page, never separate pages.**

## 2. How this was researched (and its limits)

- **Inventory.** I read the app's own registry (`calculatorList.ts`, `schemes.ts`, the routes in `App.tsx`, the route-target table) and the built website. Script and output are in `seo/research/inventory.json`.
- **Autocomplete.** 5,502 requests to Google and Bing autocomplete for India (`gl=in`, `mkt=en-IN`), none failed, giving 24,131 unique suggestions.
  - **Seeds:** one cluster per candidate page and one per scheme.
  - **English modifiers:** calculator, formula, for, vs, 2026, rules, per month, lakh, app.
  - **Hinglish modifiers:** kaise, kitna.
  - **Question prefixes:** how to calculate, what is, how much, is.

  The raw data is in `seo/research/autocomplete-all.json`, with compact lists in `autocomplete-tools.txt` and `autocomplete-schemes.txt`.
- **Competitors.** For 48 primary queries I opened the top results with a web search tool and fetched up to five pages each. For every page I recorded:
  - length;
  - whether it has a calculator;
  - tables;
  - FAQs;
  - worked examples;
  - dates and sources;
  - Hindi or Hinglish content;
  - what is missing.
- **Limits (please read):**
  1. **No search-volume numbers.** Free tools do not give them, so "demand" below is a 1–5 judgement from how many suggestions a topic produced, whether it is a head term, and how many Hinglish and real-number variants exist. Google Search Console will give real numbers once pages are indexed (Phase 6).
  2. **The search tool is US-based.** Its result order is indicative, not a real Google India ranking.
  3. **"People also ask" could not be read.** Fetching Google result pages programmatically is against Google's terms, and the tool does not return them. Instead I used question-form autocomplete ("how to…", "what is…", "is…") and the FAQs on competitor pages. The question lists in the map come from those two sources.
  4. **About a third of the big brands' pages were blocked** (ClearTax 410s, Paisabazaar, Bajaj, HDFC and Tax2Win 403s). The leaders were therefore partly unread, and winnability for head terms is if anything optimistic.

## 3. Inventory: feature vs page today

### 3a. Tools with no page of their own (23, plus the 2 unregistered features)

| App feature (route) | Lands on today | Proposed |
|---|---|---|
| Salary Hike (`/calculator/salary-hike`) | /calculators/tax-salary | **new** `/salary-hike` |
| Gold Loan (`/gold-loan`) | /calculators/loans | **new** `/gold-loan` |
| Compound Interest | /calculators/investments | **new** `/compound-interest` |
| STP | /calculators/investments | **new** `/stp` |
| Asset Rebalancer (PRAG) | /calculators/investments | **new** `/portfolio-rebalancing` |
| Simple Interest | /calculators/investments | **new** `/simple-interest` (byaj calculator) |
| Overdraft | /calculators/loans | **new** `/overdraft-interest` |
| Break Even | /calculators/utilities | new `/break-even` (low priority) |
| Property | /calculators/utilities | new `/property-appreciation` (low priority) |
| Age / Scientific / World Clock | /calculators/utilities | **no own page** (category page only; see §9) |
| CIBIL Score Guide | /calculators/credit-cards | **new** `/cibil-score` |
| Insurance Calculator | /calculators/expense-goals | **new** `/term-insurance-cover` |
| Health Insurance (compare) | /calculators/expense-goals | new `/health-insurance-claim-settlement-ratio` (needs IRDAI data; §9) |
| CC Payoff | /calculators/credit-cards | **new** `/credit-card-payoff` |
| CC Interest | /calculators/credit-cards | **new** `/credit-card-interest` |
| CC Compare | /calculators/credit-cards | no own page (category page; aggregator territory) |
| Goal Planner | /calculators/expense-goals | **new** `/goal-planner` (child education focus) |
| Smart Planner, Compare Scenarios | /calculators/expense-goals | no own page (category page) |
| Business Tracker | /calculators/expense-goals | **new** `/business-tracker` |
| My Loans | /calculators/loans | **new** `/loan-foreclosure` (and feeds `/home-loan-prepayment`) |
| Credit card manager (`/expenses/credit-cards`) | /calculators/credit-cards | **new** `/credit-card-tracker` |
| Reminders (`/notifications`) | /in-the-app (noindex) | **new** `/income-tax-due-dates` (tax calendar with app reminders) |

**Shared today**, each to be split where the intent differs:
- Education Loan and Two-Wheeler Loan currently land on `/emi`. Proposed: **new** `/education-loan` and **new** `/two-wheeler-loan`.
- The Mortgage calculator lands on `/home-loan`. Its prepayment part becomes **new** `/home-loan-prepayment`.
- Form 16 lands on `/income-tax`. Proposed: **new** `/tax-refund`.
- Budget Tracker lands on `/expense-tracker`. Proposed: `/budget-planner` (50/30/20) or stay merged, depending on your answer in §9.

### 3b. Schemes

- **Indexed (38):**
  - 37 `/schemes/<id>` pages;
  - `/atal-pension`, the guide for `c-apy`.
- **Noindex (13), all under 60 words of their own text:**
  - pmksy, digital-agri, pmsby, pmay-g, telemanas, abdm;
  - bbbp, jjm, digital-india, pmkvy, naps, ddugky, saksham.

  Phase 1 rewrites these from the official portals and indexes them.
- **Duplicates to merge:**

  | Scheme page | Merges into | Section it gains |
  |---|---|---|
  | `/schemes/c-ssy` | `/sukanya-samriddhi` | eligibility / how to open / documents |
  | `/schemes/c-scss` | `/scss` | same |
  | `/schemes/c-nps` | `/nps` | same |

  The scheme page gets a 301 redirect to the guide (the pattern `c-apy` already uses).
- **Already current:** the app's data already uses VB-G RAM G, which replaced MGNREGA from 1 July 2026. Autocomplete confirms people now search "vb g ram g", so the page title should lead with the new name.

## 4. Competitor gaps that decide winnability

| Topic | What ranks | Main gaps we can fill |
|---|---|---|
| Old vs new regime | freefincal (2023), Kredily, Intervue (FY 2025-26, arithmetic wrong), Petpooja (results gated) | Weakest top 5 seen. No open FY 2026-27 salary-band table in both regimes; no ₹12.75L/₹12.85L marginal-relief example. |
| Income tax FY 2026-27 | ClearTax, Business Today (mixes FY 2025-26), TaxGuru (gated Excel) | No official links; no marginal-relief example; no Hinglish ("income tax kitna lagta hai" is the top suggestion). |
| Home loan prepayment | Kotak, Casagrand (broken output), HomeFirst, BankBazaar, ICICI | Reduce-EMI vs reduce-tenure side by side; prepay vs invest; RBI no-penalty rule on floating loans, linked. |
| SIP for ₹1 crore | Only news articles (Angel One ×3, Religare, Bajaj Broking) | No calculator, no tenure × return table, no inflation-adjusted figure, no step-up comparison. |
| Step-up SIP | Zerodha, Upstox (thin), Bajaj AMC, Strike (rich but numbers inconsistent, no FAQ) | Verified tenure × step-up grid, % and ₹ step-up, FAQ. |
| Gold loan per gram | ICICI blogs (examples wrong), IIFL, Bajaj (blocked) | Real calculator, 18/22/24K, RBI LTV tiers (85/80/75%), dated per-gram table. |
| Credit card interest / minimum due | EZTax (no example), CardTrail (no calculator, inconsistent), IndusInd blog | Working calculator with 18% GST on interest, interest-free period, minimum-due trap table. "minimum due meaning" is the biggest suggestion. |
| Post office TD | Small blogs; best one is FY 2024-25 stale; others have maths errors | Current-quarter rates by tenure with the NSI/DEA source, rate history, quarterly-compounding table. |
| Sukanya Samriddhi | Kotak Neo, Groww, Upstox, Religare (widget/text mismatches) | Year-by-year balance table, rate history, missed-deposit penalty, official links. |
| Bike / two-wheeler loan | Autocar (no output), Moneyview, MyMotor (broken schedule) | Clean schedule, on-road price + down payment, dated lender table. |
| Education loan | Business Today (no moratorium input), Scripbox | No page models the moratorium; app does not either (§9). |
| Tax refund (India) | sum.money, EZTax, All India ITR (FY 2025-26) | FY 2026-27, Section 244A interest, Income-tax Act 2025 transition, TDS vs liability example. |
| Capital gains, TCS on remittance | Small, stale, contradictory sites | FY 2026-27 rates with the Act and CBDT sources. Competitors disagree on several rates, so **verify before publishing** (§8). |
| Portfolio rebalancing | US/NZ tools, PrimeInvestor (thin), freefincal (2021) | No Indian page owns it. |
| SWP, RD | Brokers and AMCs, several with wrong numbers | Verified month-wise schedule, inflation-adjusted withdrawals, correct RD quarterly formula. |
| SIP, FD, lumpsum, GST, EPF, NPS, PPF | Groww, Zerodha, Upstox, ClearTax, Business Today, banks | Hard. Improve our pages and win the long tail (tables by amount and years, rate history, Hinglish). |

## 5. Keyword map

Legend: **D** = demand, **W** = winnability, **I** = install intent (how naturally the page leads to using the app again). Each is scored 1–5, and **Score = D × W × I**. Hinglish is listed only where autocomplete returned it.

**No two pages share a primary query.** Where pages are close, the "Not this page" column says which page owns the neighbouring query.

### 5a. Loans and credit

| Page | Status | Primary query | Secondary queries (from autocomplete / competitor FAQs) | Not this page | D | W | I | Score |
|---|---|---|---|---|---|---|---|---|
| /home-loan-prepayment | **new** | home loan prepayment calculator | home loan part prepayment rules · reduce emi or tenure · how prepayment works in home loan · prepay vs invest · how to calculate prepayment of home loan | full closure → /loan-foreclosure | 4 | 4 | 5 | **80** |
| /credit-card-interest | **new** | credit card interest calculator | credit card minimum due meaning · how is credit card interest calculated · credit card interest rate kitna hota hai · credit card ka minimum due kitna hota hai · gst on credit card interest | payoff plan → /credit-card-payoff | 5 | 3 | 4 | **60** |
| /gold-loan | **new** | gold loan calculator per gram | how much gold loan per 10 gram · gold loan per gram kitna milta hai · gold loan interest calculator · how gold loan is calculated · RBI LTV 75% | | 5 | 4 | 3 | **60** |
| /credit-card-tracker | **new** | credit card due date tracker | credit card bill reminder app · how to know credit card due date · credit card due date calculator · credit card manager app | | 3 | 4 | 5 | **60** |
| /home-loan | improve | home loan emi calculator | 30 lakh home loan emi · home loan emi for 1 crore · how much home loan for 50000 salary · home loan emi kitna hota hai · home loan tax benefit | prepayment → /home-loan-prepayment | 5 | 2 | 5 | 50 |
| /education-loan | **new** | education loan emi calculator | moratorium period meaning in education loan · when does emi start for education loan · 20 lakh education loan emi for 5 years · education loan kitna milta hai · section 80E | | 4 | 4 | 3 | 48 (blocked, §9) |
| /credit-card-payoff | **new** | credit card payoff calculator | avalanche vs snowball · how to pay off credit card debt · how to calculate credit card payoff | | 3 | 4 | 4 | 48 |
| /two-wheeler-loan | **new** | two wheeler loan emi calculator | bike loan emi calculator · 1.5 lakh bike loan emi for 5 years · scooty loan emi · bike loan ki emi kaise nikale | | 3 | 5 | 3 | 45 |
| /emi | improve | emi calculator | emi formula · how to calculate emi · emi per lakh · emi kitna aayega · emi calculator kaise kare · flat vs reducing rate | specific loans → their pages | 5 | 2 | 4 | 40 |
| /car-loan | improve | car loan emi calculator | car loan emi for 10 lakhs · emi per lakh car loan 5/7 years · used car loan emi · car loan emi kaise nikale | | 4 | 3 | 3 | 36 |
| /loan-foreclosure | **new** | loan foreclosure calculator | foreclosure of personal loan calculator · how to calculate foreclosure amount · loan part payment calculator · is loan foreclosure good or bad | home-loan part payment → /home-loan-prepayment | 3 | 3 | 4 | 36 |
| /cibil-score | **new** | cibil score for home loan | how much cibil score required for home loan · how to improve cibil score · cibil score kaise badhaye · cibil score kitna hona chahiye | | 5 | 2 | 3 | 30 |
| /personal-loan | improve | personal loan emi calculator | 5 lakh personal loan emi for 5 years · 1 lakh personal loan emi · personal loan emi par gst kitna lagta hai · can I reduce my personal loan emi | | 4 | 2 | 3 | 24 |
| /overdraft-interest | **new** | od interest calculator | how to calculate interest on od account · od interest calculation formula · od limit interest | | 2 | 4 | 2 | 16 |

### 5b. Investments and deposits

| Page | Status | Primary query | Secondary queries | Not this page | D | W | I | Score |
|---|---|---|---|---|---|---|---|---|
| /sip-for-1-crore | **new** | sip for 1 crore | how much sip for 1 crore · sip for 1 crore in 10 years · sip se 1 crore kaise banaye · how to earn 1 crore through sip | generic SIP → /sip; other goals → /goal-planner | 4 | 5 | 4 | **80** |
| /step-up-sip | **new** | step up sip calculator | top up sip calculator · what is step up sip · sip top up kaise kare · step up sip formula | | 4 | 4 | 4 | **64** |
| /post-office-td | improve | post office td calculator | post office fd calculator · post office 5 year td calculator · post office fd kitna deta hai · is post office td taxable | | 4 | 5 | 3 | **60** |
| /swp | improve | swp calculator | swp plan for 50 lakhs / 10 lakhs · swp for 1 lakh per month · swp calculator with inflation · swp plan kaise kare | | 4 | 4 | 3 | 48 |
| /rd | improve | rd calculator | rd interest formula · rd calculator for 5/10 years · rd kaise calculate kare · recurring deposit minimum amount | | 4 | 3 | 3 | 36 |
| /portfolio-rebalancing | **new** | portfolio rebalancing calculator | how to rebalance portfolio · asset allocation calculator by age · what is asset allocation | | 2 | 5 | 3 | 30 |
| /fd | improve | fd calculator | 20/30 lakh fd interest per month · is fd interest taxable · how much fd interest is tax free · fd interest kitna milta hai | | 5 | 2 | 3 | 30 |
| /compound-interest | **new** | compound interest calculator | compound interest formula · chakravridhi byaj · chakravridhi byaj kaise nikale · 1 lakh compound interest | | 4 | 3 | 2 | 24 |
| /sip | improve | sip calculator | sip 5000 per month for 10/20 years · sip me kitna interest milta hai · how much sip should I do · sip formula | | 5 | 1 | 4 | 20 |
| /lumpsum | improve | lumpsum calculator | 1 lakh lump sum investment · lumpsum vs sip · lump sum investment kaise kare | monthly income → /swp | 3 | 2 | 3 | 18 |
| /stp | **new** | stp calculator mutual fund | what is systematic transfer plan · stp vs sip · systematic transfer plan kya hota hai | | 2 | 3 | 3 | 18 |
| /simple-interest | **new** | byaj calculator | simple interest calculator · byaj calculator kaise kare · simple interest formula | | 4 | 2 | 2 | 16 |
| /cagr | improve | cagr calculator | cagr formula · cagr formula for 3/5 years · cagr kaise calculate karte hain · cagr vs xirr | | 4 | 2 | 2 | 16 |

### 5c. Tax and salary

| Page | Status | Primary query | Secondary queries | Not this page | D | W | I | Score |
|---|---|---|---|---|---|---|---|---|
| /old-vs-new-tax-regime | **new** | old vs new tax regime calculator | which tax regime is better · …for 15/20/25/30/40 lakhs (table rows) · old vs new tax regime difference · break-even deductions | slabs and tax amount → /income-tax | 5 | 4 | 4 | **80** |
| /income-tax | improve | income tax calculator fy 2026-27 | income tax kitna lagta hai · salary per income tax kitna bharna hai · how to calculate tax on salary · 12.75 lakh salary tax · marginal relief | regime choice → /old-vs-new-tax-regime | 5 | 3 | 4 | **60** |
| /income-tax-due-dates | **new** | income tax due dates fy 2026-27 | advance tax due dates · itr due date · tds return due dates · income tax due date calendar | | 4 | 3 | 5 | **60** |
| /tax-refund | **new** | income tax refund calculator | how to claim tds refund · tds refund status steps · form 16 tax calculator · section 244A interest | | 4 | 4 | 3 | 48 |
| /hra | improve | hra exemption calculator | hra exemption rules · is hra available in new tax regime · metro cities for hra · hra ka calculation kaise hota hai | | 4 | 3 | 3 | 36 |
| /capital-gains | improve | capital gains tax calculator | ltcg tax rate · stcg tax rate fy 2026-27 · is ltcg tax free (₹1.25 lakh) · ltcg tax kitna lagta hai | | 4 | 4 | 2 | 32 |
| /salary-hike | **new** | salary hike calculator | salary increment percentage calculator · how to calculate appraisal hike percentage · in-hand after hike (new regime) | | 3 | 3 | 3 | 27 |
| /lrs-tcs | improve | tcs on foreign remittance | tcs on foreign remittance for education · lrs limit · is tcs refundable · tcs fy 2026-27 | | 3 | 4 | 2 | 24 |
| /gst | improve | gst calculator | gst kaise nikale formula · total amount se gst kaise nikale · how to calculate gst from total amount · 5/18/40% slabs | | 5 | 2 | 2 | 20 |

### 5d. Retirement and small savings

| Page | Status | Primary query | Secondary queries | D | W | I | Score |
|---|---|---|---|---|---|---|---|
| /sukanya-samriddhi (+ merge c-ssy) | improve | sukanya samriddhi yojana calculator | ssy interest rate · sukanya samriddhi 1.5 lakh calculator · eligibility · documents · how to open | 4 | 4 | 4 | **64** |
| /ppf | improve | ppf calculator | ppf interest rate 2026 · ppf interest rate history chart · ppf kaise calculate hota hai · ppf calculator for different yearly amount | 5 | 2 | 4 | 40 |
| /scss (+ merge c-scss) | improve | senior citizen savings scheme calculator | scss interest rate · scss for 30 lakhs · senior citizen saving scheme mein kitna byaaj milta hai | 4 | 3 | 3 | 36 |
| /post-office-mis | improve | post office mis calculator | monthly income scheme 15 lakhs · post office mis interest rate kitna hai · is mis taxable | 4 | 3 | 3 | 36 |
| /nsc | improve | nsc calculator | nsc interest rate 2026 · nsc interest rate history · is nsc interest taxable | 3 | 4 | 3 | 36 |
| /kvp | improve | kvp calculator | kisan vikas patra kitne saal ka hota hai · money doubles in 115 months · is kvp taxable | 3 | 4 | 3 | 36 |
| /epf | improve | epf calculator | epf interest rate 2025-26 / 2026-27 · epf calculation formula · pf calculation kaise hota hai | 4 | 2 | 3 | 24 |
| /nps (+ merge c-nps) | improve | nps calculator | nps pension calculator · nps pension kitna milta hai · how to calculate nps pension after retirement | 4 | 2 | 3 | 24 |
| /gratuity | improve | gratuity calculator | gratuity formula · gratuity new rules 2026 · gratuity for 5 years · gratuity kaise calculate karte hain | 4 | 3 | 2 | 24 |
| /atal-pension | improve | atal pension yojana chart | apy calculator · atal pension yojana 5000 per month · apy pension amount | 3 | 4 | 2 | 24 |

### 5e. Planning, trackers, insurance, other

| Page | Status | Primary query | Secondary queries | D | W | I | Score |
|---|---|---|---|---|---|---|---|
| /expense-tracker | improve | expense tracker app | daily expense tracker app · how to track daily expenses · offline expense tracker · money tracker app | 4 | 2 | 5 | 40 |
| /business-tracker | **new** | daily income expense app for shop | business hisab app · income and expense app free · daily business income expense | 2 | 4 | 5 | 40 |
| /goal-planner | **new** | child education planning calculator | how to save money for child education · goal planner · goal setting kaise kare | 3 | 3 | 4 | 36 |
| /budget-planner | **new or merge** (§9) | 50 30 20 rule calculator | 50 30 20 rule for 30000 salary · 50 30 20 rule kya hai · monthly budget planner | 3 | 3 | 4 | 36 |
| /health-insurance-claim-settlement-ratio | new (§9) | health insurance claim settlement ratio 2026 | which health insurance company has best claim settlement ratio · …ka claim settlement ratio kitna hai | 4 | 3 | 2 | 24 |
| /term-insurance-cover | **new** | how much term insurance do i need | term insurance calculator · human life value · is 1 crore term insurance enough | 4 | 2 | 2 | 16 |
| /property-appreciation | new | property appreciation calculator india | how much will my house be worth in 10 years · how to calculate property appreciation | 2 | 3 | 2 | 12 |
| /break-even | new | break even point calculator | break even point formula · break even point kaise nikale | 3 | 2 | 1 | 6 |
| Age, scientific, world clock, smart planner, compare scenarios, CC compare | **no own page** | — | (stay as described tools on the category pages) | — | — | — | — |

### 5f. Scheme pages (one page per scheme, query = the dominant suggestion)

Each scheme page targets "<scheme> eligibility" or "<scheme> apply online / amount", whichever autocomplete ranks first.

**"Status" queries** ("pm kisan samman nidhi status", "pm awas yojana urban status") are navigational to official portals. We answer them with the steps and the official link; we never imitate a status checker.

| Priority | Pages |
|---|---|
| High demand (≥100 suggestions) | pm-kisan, udyam (msme registration), ssy (→ merge), apy (done), nps (→ merge), pmuy, pmjdy, pmay-u, pmay-g (noindex today), mudra, pm-vishwakarma, startup-india, kcc, nps-vatsalya, pmis (internship), mgnrega → **VB-G RAM G**, scss (→ merge) |
| Bring up to quality and index (13) | pmksy, digital-agri, pmsby, pmay-g, telemanas, abdm, bbbp, jjm, digital-india, pmkvy, naps, ddugky, saksham |
| Rest | improve to the scheme template in later batches |

## 6. Priority and batches

**Batch 1 (top 10 by score, mixing new and improved pages):**

1. `/old-vs-new-tax-regime` (new): 80
2. `/home-loan-prepayment` (new): 80
3. `/sip-for-1-crore` (new): 80
4. `/step-up-sip` (new): 64
5. `/sukanya-samriddhi` (improve + merge c-ssy): 64
6. `/income-tax` (improve): 60
7. `/credit-card-interest` (new): 60
8. `/gold-loan` (new): 60
9. `/post-office-td` (improve): 60
10. `/income-tax-due-dates` (new): 60. It is fresh and citable, and it leads to the app's tax reminders.

**Batch 2:**
- `/credit-card-tracker`, `/home-loan`, `/swp`, `/tax-refund`, `/credit-card-payoff`;
- `/two-wheeler-loan` and `/education-loan` (education loan depends on §9);
- `/emi` (differentiated from the loan pages), `/expense-tracker`, `/business-tracker`.

**Batch 3:**
- small savings: `/scss` and `/nps` (merges), `/ppf`, `/post-office-mis`, `/nsc`, `/kvp`, `/rd`, `/fd`;
- tax: `/hra`, `/capital-gains`, `/lrs-tcs`;
- the 13 noindex scheme pages.

**Batch 4 and later:** the remaining calculators, the scheme pages and the category pages. Category intros are rewritten in Phase 2.

## 7. Page template (every feature page)

Pre-rendered static HTML, like the current guides. The interactive parts are small islands, within the existing 120 KB budget.

1. **H1** with the primary query in natural language, e.g. "Old vs New Tax Regime Calculator FY 2026-27".
2. **Answer-first block** of 2–3 plain sentences with one real computed example, plus "Last updated <date> · Source: <official link>". Examples, computed today with the app's own functions:
   - "EMI on a ₹30 lakh home loan at 8.5% for 20 years is **₹26,035** a month; total interest ₹32,48,210."
   - "₹5,000 a month in a SIP for 10 years at an assumed 12% grows to about **₹11,61,695** (₹6,00,000 invested)."
   - "On a ₹12.75 lakh salary the new regime tax for FY 2026-27 is **nil**; at ₹12.85 lakh it is **₹10,400** because of marginal relief (old regime: ₹1,87,200 and ₹1,90,320)."
3. **Mini-calculator** using the app's functions, which `qa-calculators` already checks. After the result: Play badge + "Save, track and get reminders in the app". Each page gets its own referrer tag.
4. **How it's calculated:** the formula in words + one fully worked example, step by step.
5. **A table** that answers the long tail. Examples:
   - EMI by amount × tenure;
   - SIP by monthly amount × years;
   - tax by salary band in both regimes;
   - scheme rate history by quarter.
6. **3–5 scenarios** with different real numbers.
7. **Comparison** where relevant: old vs new regime, reduce EMI vs reduce tenure, PPF vs FD vs SSY, avalanche vs snowball, prepay vs invest.
8. **Rules and limits box** with official links (incometax.gov.in, rbi.org.in, indiapost.gov.in, nsiindia.gov.in, epfindia.gov.in, pfrda.org.in, scheme portals) and the date checked.
9. **5–8 FAQs** from §5's question lists, each answered in its first sentence. Where autocomplete shows a Hinglish question, one FAQ asks and answers it in natural Hinglish (§9).
10. **Related tools** (3–6 internal links with descriptive anchors) and the category page.
11. **Disclaimer** (tax / investment / loan as relevant), the same wording the app uses.

**Scheme pages:**
- what it is;
- eligibility;
- benefits and amounts (table);
- how to apply (steps);
- documents;
- official portal and helpline;
- status-check steps (link only);
- last verified date and source;
- 5–8 FAQs;
- related schemes and tools.

**Quality guard against templated content.** No two pages share more than a small boilerplate. I'll add a `qa-landing` check that fails if two pages share more than 15% of their 5-word phrases outside the header and footer; the loan guides are at 24–33% today. Every page must have its own examples, its own table and its own FAQs.

## 8. Facts to verify against the official source before the page that uses them is published

Competitors contradict each other on these. I will not publish them from memory or from competitor pages.

- **TCS on foreign remittance** for FY 2026-27:
  - the ₹10 lakh threshold;
  - education and medical rates;
  - Income-tax Act 2025 section numbers.

  Source: the Act and the CBDT notification.
- **HRA:** the list of metro cities for the 50% rule, from the Act and Rules as amended.
- **Gratuity under the Labour Codes:** fixed-term employees, the eligibility period and the tax-exempt limit. Sources: the Code on Social Security as notified, CBDT.
- **NPS:** the minimum annuity percentage and lump-sum rules after the PFRDA changes.
- **EPF:** the declared rate for FY 2025-26 (EPFO notification).
- **GST:** the current slab structure after the 2025 rationalisation, from CBIC / GST Council. Our GST page already says 5 / 18 / 40%.
- **Gold loan LTV tiers:** the RBI directions. The app uses 85 / 80 / 75% by loan size; I'll confirm the citation.
- **CIBIL:** any score-to-rate figures must come from a lender's official rate page, with date. Otherwise the page explains bands without rates.
- **Health insurance claim settlement ratios:** only from IRDAI's annual report, with year.
- **Small-savings rates** for Q3 FY 2026-27 (NSI / DEA). Already refreshed in the app on 16 Nov; I'll link the notification.

## 9. Decisions I need from you

1. **Education loan.** The top query is "education loan emi calculator with moratorium", which no competitor serves, but the app has no moratorium input. Choose one:
   - **(a)** The page targets "education loan emi calculator" and explains moratorium interest with a worked example only, with no claim that the app models it.
   - **(b)** Add a moratorium option to the app later (an Android change, outside this programme).
   - **(c)** Drop the page for now.

   I recommend **(a)**.
2. **Merge** `/schemes/c-ssy`, `/schemes/c-scss` and `/schemes/c-nps` into their guides with 301s, the same as `c-apy`? I recommend **yes**.
3. **Utilities:** age, scientific and world clock, plus smart planner, compare scenarios and CC compare, get **no** page of their own and stay as described tools on their category pages? I recommend **yes**. They have low relevance or no data we can stand behind, and thin pages would hurt the site.
4. **Budget planner:** a separate `/budget-planner` (50/30/20) page, or a section of `/expense-tracker`? The app shows 50/30/20 in reports and the assistant. I recommend a **section**, to avoid a thin page.
5. **Hinglish:** one natural-Hinglish FAQ per page where autocomplete shows Hinglish demand (e.g. "EMI kitna aayega?")? A separate Hindi site (`/hi/`) is out of scope for now. I recommend **yes to the FAQ**.
6. **Health insurance claim settlement ratio:** build it only with IRDAI annual-report figures (I'll fetch and cite the report)? I recommend **yes, in batch 3 or later**.
7. **Batch 1:** approve the 10 pages in §6, or swap any.
8. **For later phases:**
   - the social profile URLs for Organization `sameAs`;
   - who builds FinCalix for `/about`: you named Sri Moksha Software Developers, India; please confirm any personal details you want shown.

## 10. What happens after approval (Phases 1–6, unchanged from your brief)

- **Phase 1:** template components (shared answer block, calculator islands, tables, FAQ, rules box, disclaimer), built from the app's functions.
- **Phase 2:**
  - Batch 1 to a Vercel preview, with screenshots and the full content of 2 pages for your review, then **stop**.
  - After approval, the remaining batches.
  - Route-target table updates so every app route points at its dedicated page.
  - Rich category intros.
- **Phase 3:**
  - titles ≤ 60 characters and descriptions ≤ 155;
  - per-page OG images;
  - JSON-LD (SoftwareApplication / FAQPage / BreadcrumbList / GovernmentService / Organization / WebSite);
  - visible breadcrumbs;
  - an orphan / internal-link check in qa-landing;
  - split sitemaps with real lastmod;
  - robots.txt for the AI search crawlers (with my recommendation on training-only bots for you to decide);
  - llms.txt;
  - IndexNow;
  - a per-page Core Web Vitals budget.
- **Phase 4:** `/how-we-calculate`, `/about`, `/updates`, consistent entity facts.
- **Phase 5:** Search Console DNS record, Bing import steps, `OFFSITE_PLAN.md`.
- **Phase 6:** `SEO_TRACKING.md` and a quarterly freshness checklist.

**Every page must pass before it goes out:**
- Lighthouse mobile performance ≥ 95, accessibility and SEO 100;
- no sideways scroll at 360 px;
- light theme by default;
- the claims audit;
- qa-calculators and qa-landing.

**Untouched throughout:** the legal pages, `config.json`, the dev gate, the kill switch, analytics rules and the Android app.
