/**
 * Website copy. Indian English, short, benefit-led; every claim is one the
 * app makes true today (see the claims audit in tools/marketing/README.md and
 * PLAY_DATA_SAFETY.md). Counts and figures are NOT written here: they come
 * from the registry, schemes.ts and the tax engine (see data.ts).
 *
 * Never write: "#1", "best", "guaranteed", "zero data collection", "no
 * tracking", "100% offline", or the analytics provider's name.
 */

export { PLAY_URL, playUrl } from './play';
export type { Placement } from './play';export const SUPPORT_EMAIL = 'support@fincalix.com';

export const PRIVACY_CLAIMS = [
    { title: 'Your financial data stays on your device', body: 'Your calculations, loans and expenses are saved on your phone, not on a server.' },
    { title: 'No login', body: 'No account, no phone number, no OTP. Open it and start.' },
    { title: 'No ads', body: 'FinCalix shows no advertisements.' },
    { title: 'Works offline', body: 'The Android app’s calculators work without internet.' },
] as const;

export const ANALYTICS_LINE = 'Usage analytics are on by default and can be turned off in Settings → Privacy.';

export interface Feature {
    id: string;
    eyebrow: string;
    title: string;
    points: string[];
    shot: string;          // key in img/images.json
    alt: string;
}

export const FEATURES: Feature[] = [
    {
        id: 'loans', eyebrow: 'Loans', title: 'See what closing a loan early saves.',
        points: [
            'Keep every loan in one place with its EMI schedule and balance.',
            'Try a part-payment or full foreclosure before you call the bank.',
            'Choose between a lower EMI and a shorter tenure with the numbers side by side.',
        ],
        shot: 'en-foreclosure', alt: 'FinCalix loan screen showing interest saved by a part-payment',
    },
    {
        id: 'expenses', eyebrow: 'Expense tracker', title: 'Know where the month went.',
        points: [
            'Log spending in seconds, by category.',
            'Monthly and yearly reports with clear charts.',
            'Set budgets and see what is left for the month.',
        ],
        shot: 'en-expenses-monthly', alt: 'FinCalix monthly expense report with spending by category',
    },
    {
        id: 'cards', eyebrow: 'Credit cards', title: 'Clear card debt faster.',
        points: [
            'Add your cards and see your debt-free date.',
            'Compare payoff plans such as Avalanche and Snowball.',
            'See what paying only the minimum really costs.',
        ],
        shot: 'en-cc-payoff', alt: 'FinCalix credit card payoff screen with debt-free date and total interest',
    },
    {
        id: 'goals', eyebrow: 'Goal planner', title: 'A plan for every goal.',
        points: [
            'Set goals like a home, education or retirement.',
            'See the monthly saving each goal needs, with inflation included.',
            'Plan several goals at once.',
        ],
        shot: 'en-goal-planner', alt: 'FinCalix goal planner showing monthly saving needed for each goal',
    },
    {
        id: 'export', eyebrow: 'Reports', title: 'Reports you can share.',
        points: [
            'Export results and schedules to PDF or Excel.',
            'Share a clean report with family or your CA.',
            'Back up all your app data to a file.',
        ],
        shot: 'en-export', alt: 'FinCalix export options for PDF and Excel reports',
    },
    {
        id: 'reminders', eyebrow: 'Reminders', title: 'Gentle nudges, not noise.',
        points: [
            'A daily money quote to start the day.',
            'An evening reminder to log the day’s spending.',
            'Turn any reminder off in one tap.',
        ],
        shot: 'en-reminders', alt: 'FinCalix notification settings with daily quote and log reminder switches',
    },
];

export const LANGUAGES = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
] as const;

/** Popular schemes shown as cards (ids in src/data/schemes.ts). */
export const SCHEME_CARD_IDS = ['c-ssy', 'c-apy', 'c-scss', 'c-pmkisan', 'c-abpmjay', 'c-pmjjby'] as const;

export interface Faq { q: string; a: string }

/** FAQ shown on the page and published as FAQPage structured data. Figures in
 *  {braces} are filled in from the tax engine and the registries (data.ts). */
export const FAQ_TEMPLATES: Faq[] = [
    {
        q: 'Is FinCalix free?',
        a: 'Yes. FinCalix is free to use, with no subscription and no ads.',
    },
    {
        q: 'Do I need to sign up?',
        a: 'No. There is no login, account or OTP. Open the app and start calculating.',
    },
    {
        q: 'Which tax regime is better for me, New or Old?',
        a: 'It depends on your deductions. Under the New Regime for FY 2026-27, taxable income up to {rebateLimit} pays no tax, and salaried people get a {stdDeduction} standard deduction, so a salary up to {zeroTaxSalary} pays nothing. The Old Regime can work out lower if you claim large deductions such as 80C, 80D, home-loan interest and HRA. FinCalix works out both for your numbers and shows which is lower.',
    },
    {
        q: 'How is an EMI calculated?',
        a: 'EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1), where P is the loan amount, r is the monthly interest rate (yearly rate ÷ 12 ÷ 100) and n is the number of monthly instalments. FinCalix also shows the full schedule, total interest and what a part-payment saves.',
    },
    {
        q: 'How does a SIP grow?',
        a: 'Each monthly instalment earns returns that compound over time. FinCalix assumes the yearly return you enter stays fixed; real mutual fund returns go up and down with the market, so treat the result as an estimate.',
    },
    {
        q: 'Does FinCalix work offline?',
        a: 'Yes. The Android app’s calculators work without an internet connection, and your saved data is on your phone.',
    },
    {
        q: 'Where is my financial data stored?',
        a: 'On your device. FinCalix has no login and does not upload your amounts, loans or expenses. You can export a backup file from Settings whenever you like.',
    },
    {
        q: 'What usage data does FinCalix collect?',
        a: 'Usage analytics are on by default: which screens are opened in the app, completed calculations, exported reports and, on this website, taps on the Google Play buttons. Amounts and inputs are never sent. You can turn analytics off anytime in Settings → Privacy.',
    },
    {
        q: 'Which languages does FinCalix support?',
        a: 'English, Hindi, Telugu, Tamil, Kannada and Malayalam. You can switch language anytime in Settings.',
    },
    {
        q: 'Can I use FinCalix on an iPhone or a computer?',
        a: 'Not yet. FinCalix is an Android app, available free on Google Play. There is no iPhone or computer version at the moment.',
    },
];

// ── Copy for the generated pages (counts and names come from the registry / schemes.ts) ──

/** Intro paragraph for each category page /calculators/<slug>. */
export const CATEGORY_INTROS: Readonly<Record<string, { title: string; intro: string }>> = {
    loans: {
        title: 'Loan calculators',
        intro: 'Plan a loan before you sign. These calculators work out the EMI, the total interest and the full repayment schedule for home, car, two-wheeler, personal, education and gold loans, and show what a part-payment or early closure saves. My Loans keeps every running loan in one place with its balance. All of them are in the free FinCalix Android app; tools marked “Guide” also have a page on this site with the formula and a worked example.',
    },
    investments: {
        title: 'Investment calculators',
        intro: 'See how your money can grow. Work out the future value of a monthly SIP or a one-time lumpsum, plan withdrawals with an SWP or transfers with an STP, compare returns with CAGR, and check what a fixed or recurring deposit pays at maturity. Results assume the rate you enter stays the same, so treat them as estimates: mutual fund returns go up and down with the market.',
    },
    tax: {
        title: 'Tax and salary calculators',
        intro: 'Income tax for FY 2026-27 under both the New and the Old Regime, with the standard deduction, the Section 87A rebate and marginal relief worked in. Check how much of your HRA is tax-free, what your gratuity will be, the tax on capital gains, TCS on money sent abroad under LRS, GST on a bill and what a salary hike means for take-home pay. The figures are estimates, not tax advice.',
    },
    retire: {
        title: 'Retirement and government savings calculators',
        intro: 'Plan long-term savings with government-backed schemes. Work out the maturity value of PPF, EPF, NPS, Sukanya Samriddhi, NSC and Kisan Vikas Patra, the monthly income from Post Office MIS, Post Office Time Deposit returns and the quarterly interest from the Senior Citizens Savings Scheme. The app uses the interest rates listed for each scheme; small savings rates are revised by the government every quarter.',
    },
    cards: {
        title: 'Credit card calculators',
        intro: 'Get on top of credit card debt. See your debt-free date and the interest you will pay under different payoff plans such as Avalanche and Snowball, work out the interest and GST on a card balance, compare card types for the way you spend, and learn what moves your CIBIL score. Everything you enter stays on your phone.',
    },
    goals: {
        title: 'Expense, goal and planning tools',
        intro: 'Track spending and plan for what matters. Log daily expenses and see monthly and yearly reports, set budgets, plan goals like a home or your child’s education with the monthly saving each one needs, compare scenarios side by side, keep a simple daily ledger for a small business, and compare health and life insurance plans.',
    },
    utilities: {
        title: 'Everyday utility calculators',
        intro: 'Handy tools that sit alongside the money calculators: your exact age in years, months and days, the full cost of a flat or plot with stamp duty and registration, the break-even point for a business, a scientific calculator and a world clock with time zones.',
    },
};

export const CALCULATORS_INTRO = 'Every calculator and tracker in the FinCalix app, grouped the way people look for them. Each one shows its result as you type, works without internet in the Android app and keeps your numbers on your phone. Open a category to see what each tool does; tools marked “Guide” also have a page on this site with the formula and a worked example.';

export const SCHEMES_INTRO = 'FinCalix explains central government schemes in plain language: who can apply, what you get, the documents you need and how to apply, with a link to the official website. Every scheme shows the date its details were last checked against the official source. The same list is in the Android app, where you can bookmark schemes and filter them by category.';

/** Where to import a backup in the Android app (labels as the app shows them in English). */
export const IMPORT_STEPS = [
    'Install FinCalix from Google Play on your Android phone.',
    'Copy the backup file to the phone (for example from email, Google Drive or a USB cable).',
    'In FinCalix open Profile → Settings → Backup & Restore → Import App Data and choose the file.',
];
