/**
 * Content of the trust pages (/how-we-calculate, /updates). Entity facts come from content.ts
 * (PUBLISHER, SUPPORT_EMAIL) so they are the same everywhere on the site and in the JSON-LD.
 * Every method below names the app function the website itself calls, so the description and
 * the figures on the pages cannot drift apart.
 */
export interface Method { area: string; how: string; fn: string; checked: string }

/** How each kind of figure is computed (app function in src/utils, audit that re-checks it). */
export const METHODS: readonly Method[] = [
    { area: 'Loan EMI and schedules', how: 'Reducing balance: EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1), with r the yearly rate ÷ 12 and n the months; the EMI is rounded up to the next rupee and the last instalment clears the balance.', fn: 'calculateReducingEMI, calculateAdvancedMortgage', checked: 'qa-calculators, qa-loan-engine' },
    { area: 'SIP, step-up SIP, lump sum', how: 'Monthly SIP paid at the start of each month, compounded monthly at the assumed yearly return ÷ 12; a lump sum compounds yearly. Returns are assumptions, never promises.', fn: 'calculateSIP, calculateCompoundInterest', checked: 'qa-calculators, qa-feature-pages' },
    { area: 'Income tax (FY 2026-27, tax year 2026-27)', how: 'Income-tax Act, 2025 and Finance Act, 2026: slabs of both regimes, standard deduction, rebate under section 156 with marginal relief, surcharge with marginal relief, then 4% health and education cess.', fn: 'compareSalaryTax', checked: 'qa-calculators (3,184 cases against an independent re-implementation)' },
    { area: 'Post Office and small-savings schemes', how: 'The interest rule of each scheme as notified (e.g. a Time Deposit compounds quarterly within the year and pays out yearly), at the rate the Government notifies for the quarter.', fn: 'calculatePOTD and the scheme formulas; rates in SMALL_SAVINGS', checked: 'qa-calculators, qa-feature-pages' },
    { area: 'Credit cards', how: 'Daily-balance interest (balance × yearly rate ÷ 365 × days) with 18% GST on the interest; payoff plans month by month.', fn: 'getTrueCost, getPayoffMonths, getTotalInterest', checked: 'qa-feature-pages' },
    { area: 'Gold loans', how: 'Gold value = weight × 24K rate × purity; the largest loan is the one RBI allows for the loan’s own size (85% up to ₹2.5 lakh, 80% up to ₹5 lakh, 75% above), in whole rupees rounded down.', fn: 'goldLoanMaxLoan, goldValueForLoan', checked: 'qa-calculators' },
];

/** The steps every page goes through before it is published. */
export const PROCESS: readonly string[] = [
    'Every number on a page is computed when the page is built, by the same functions the FinCalix app runs on your phone. Nothing is typed in by hand.',
    'Every rule, rate, limit and date is checked against the official source (the Act or notification, RBI, India Post and the National Savings Institute, EPFO, PFRDA, IRDAI, CBIC, the scheme’s own portal) and the page links to it with the date it was checked.',
    'Independent checks re-implement each formula a different way and compare the results over thousands of inputs; the site is not published if any check fails.',
    'Where the app and the official rule disagree, the shared function is corrected for both the app and the website, and the change is listed on the updates page.',
    'Rates are reviewed every quarter when the Government notifies small-savings rates, tax rules after every Budget, and scheme pages show the date they were last verified.',
];

export interface Update { date: string; title: string; items: string[] }

/** Dated change log (newest first). Only changes that affect what readers see. */
export const UPDATES: readonly Update[] = [
    {
        date: '2026-11-17',
        title: 'Calculation fixes, shared by the app and the website',
        items: [
            'Post Office Time Deposit: interest is now paid out every year with no interest on interest, as the scheme rules say. ₹1 lakh for 5 years at 7.5% now shows ₹1,38,568 (it showed ₹1,44,995). Also in the next Android update.',
            'Gold loans near ₹2.5 lakh and ₹5 lakh: the RBI limit now follows the size of the loan itself, so gold worth ₹3,05,000 can get ₹2,50,000 (it showed ₹2,44,000). Also in the next Android update.',
            'Credit card interest: the note on GST no longer attributes the 18% GST to RBI; GST applies to finance charges and fees under GST law.',
        ],
    },
    {
        date: '2026-11-17',
        title: 'First calculator guides with live calculators',
        items: [
            'Old vs new tax regime, income tax FY 2026-27, income tax due dates, home loan prepayment, SIP for ₹1 crore, step-up SIP, Sukanya Samriddhi, credit card interest, gold loan and Post Office Time Deposit: each with a working calculator, worked examples and official sources.',
        ],
    },
    {
        date: '2026-11-16',
        title: 'Rates checked for October–December 2026',
        items: ['Small-savings interest rates (unchanged for the quarter), the RBI repo rate and the gold reference rate were checked against the official notifications.'],
    },
];
