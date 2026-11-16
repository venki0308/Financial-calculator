/**
 * Website copy. Indian English, short, benefit-led; every claim is one the
 * app makes true today (see the claims audit in tools/marketing/README.md and
 * PLAY_DATA_SAFETY.md). Counts and figures are NOT written here: they come
 * from the registry, schemes.ts and the tax engine (see data.ts).
 *
 * Never write: "#1", "best", "guaranteed", "zero data collection", "no
 * tracking", "100% offline", or the analytics provider's name.
 */

export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.fincalix.app';
export const SUPPORT_EMAIL = 'support@fincalix.com';

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
    link: { href: string; label: string };
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
        link: { href: '/my-loans', label: 'Open My Loans' },
    },
    {
        id: 'expenses', eyebrow: 'Expense tracker', title: 'Know where the month went.',
        points: [
            'Log spending in seconds, by category.',
            'Monthly and yearly reports with clear charts.',
            'Set budgets and see what is left for the month.',
        ],
        shot: 'en-expenses-monthly', alt: 'FinCalix monthly expense report with spending by category',
        link: { href: '/expenses', label: 'Open the expense tracker' },
    },
    {
        id: 'cards', eyebrow: 'Credit cards', title: 'Clear card debt faster.',
        points: [
            'Add your cards and see your debt-free date.',
            'Compare payoff plans such as Avalanche and Snowball.',
            'See what paying only the minimum really costs.',
        ],
        shot: 'en-cc-payoff', alt: 'FinCalix credit card payoff screen with debt-free date and total interest',
        link: { href: '/calculator/credit-card-payoff', label: 'Open credit card payoff' },
    },
    {
        id: 'goals', eyebrow: 'Goal planner', title: 'A plan for every goal.',
        points: [
            'Set goals like a home, education or retirement.',
            'See the monthly saving each goal needs, with inflation included.',
            'Plan several goals at once.',
        ],
        shot: 'en-goal-planner', alt: 'FinCalix goal planner showing monthly saving needed for each goal',
        link: { href: '/goal-planner', label: 'Open the goal planner' },
    },
    {
        id: 'export', eyebrow: 'Reports', title: 'Reports you can share.',
        points: [
            'Export results and schedules to PDF or Excel.',
            'Share a clean report with family or your CA.',
            'Back up all your app data to a file.',
        ],
        shot: 'en-export', alt: 'FinCalix export options for PDF and Excel reports',
        link: { href: '/expenses', label: 'Try a report' },
    },
    {
        id: 'reminders', eyebrow: 'Reminders', title: 'Gentle nudges, not noise.',
        points: [
            'A daily money quote to start the day.',
            'An evening reminder to log the day’s spending.',
            'Turn any reminder off in one tap.',
        ],
        shot: 'en-reminders', alt: 'FinCalix notification settings with daily quote and log reminder switches',
        link: { href: '/settings', label: 'See the settings' },
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
        a: 'Usage analytics are on by default: which screens are opened, completed calculations, exported reports and, on this website, taps on the buttons that open the app. Amounts and inputs are never sent. You can turn analytics off anytime in Settings → Privacy.',
    },
    {
        q: 'Which languages does FinCalix support?',
        a: 'English, Hindi, Telugu, Tamil, Kannada and Malayalam. You can switch language anytime in Settings.',
    },
    {
        q: 'Can I use FinCalix on an iPhone or a computer?',
        a: 'There is no iPhone app yet, but FinCalix works in any modern browser: tap “Open FinCalix” on this page. On Android, you can install it from Google Play.',
    },
];
