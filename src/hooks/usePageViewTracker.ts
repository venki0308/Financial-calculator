import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { normalizePath, trackScreenOpened } from '../lib/analytics';

/**
 * Maps a URL pathname to a human-readable screen name for Google Analytics.
 * This ensures GA4 reports show meaningful names like "EMI Calculator"
 * instead of raw paths like "/calculator/loan-emi".
 */
const ROUTE_NAMES: Record<string, string> = {
    '/': 'Home',
    '/app': 'Home',   // the app's Home on the web
    '/calculators': 'Calculators',
    '/schemes': 'Schemes',
    '/expenses': 'Expense Tracker',
    '/profile': 'Profile',
    '/profile/saved': 'Saved Calculations',
    '/profile/history': 'Calculation History',
    '/profile/bookmarks': 'Bookmarked Schemes',
    '/settings': 'Settings',
    '/notifications': 'Notifications',
    '/about': 'About',
    '/budget-tracker': 'Budget Tracker',
    '/goal-planner': 'Goal Planner',
    '/financial-advisor': 'Smart Planner',
    '/compare': 'Compare Calculators',
    '/world-clock': 'World Clock',

    // Calculators
    '/calculator/loan-emi': 'EMI Calculator',
    '/calculator/sip': 'SIP Calculator',
    '/calculator/fixed-deposit': 'FD Calculator',
    '/calculator/compound-interest': 'Compound Interest Calculator',
    '/calculator/income-tax': 'Income Tax Calculator',
    '/calculator/form16-tax': 'Form 16 Tax Calculator',
    '/calculator/salary-hike': 'Salary Hike Calculator',
    '/calculator/hra': 'HRA Calculator',
    '/calculator/recurring-deposit': 'RD Calculator',
    '/calculator/simple-interest': 'Simple Interest Calculator',
    '/calculator/lumpsum': 'Lumpsum Calculator',
    '/calculator/swp': 'SWP Calculator',
    '/calculator/stp': 'STP Calculator',
    '/calculator/capital-gains': 'Capital Gains Calculator',
    '/calculator/lrs-tcs': 'LRS TCS Calculator',
    '/calculator/home-loan': 'Home Loan EMI Calculator',
    '/calculator/prag': 'PRAG Calculator',
    '/calculator/cagr': 'CAGR Calculator',
    '/calculator/mortgage-calculator': 'Advanced Mortgage Calculator',
    '/calculator/credit-card-payoff': 'Credit Card Payoff Calculator',
    '/calculator/credit-card-interest': 'Credit Card Interest Calculator',
    '/calculator/credit-card-compare': 'Credit Card Compare',
    '/calculator/ppf': 'PPF Calculator',
    '/calculator/ppf-advanced': 'Advanced PPF Calculator',
    '/calculator/nps': 'NPS Calculator',
    '/calculator/epf': 'EPF Calculator',
    '/calculator/gratuity': 'Gratuity Calculator',
    '/calculator/sukanya-samriddhi': 'SSY Calculator',
    '/calculator/nsc': 'NSC Calculator',
    '/calculator/kvp': 'KVP Calculator',
    '/calculator/post-office-mis': 'Post Office MIS Calculator',
    '/calculator/senior-citizen-savings': 'Senior Citizen Savings Scheme',
    '/calculator/post-office-td': 'Post Office TD Calculator',
    '/calculator/break-even': 'Break Even Calculator',
    '/calculator/overdraft': 'Overdraft Calculator',
    '/calculator/property': 'Property Calculator',
    '/calculator/gst': 'GST Calculator',
    '/calculator/scientific': 'Scientific Calculator',
    '/calculator/age': 'Age Calculator',
    '/calculator/car-loan': 'Car Loan EMI Calculator',
    '/calculator/personal-loan': 'Personal Loan EMI Calculator',
    '/calculator/education-loan': 'Education Loan EMI Calculator',
    '/calculator/insurance': 'Insurance Calculator',
    '/insurance-compare': 'Health Insurance Compare',
    '/two-wheeler-loan': 'Two-Wheeler Loan Calculator',
    '/gold-loan': 'Gold Loan Calculator',
    '/cibil-score': 'CIBIL Score Calculator',
    '/cibil-profile': 'CIBIL Profile Setup',
    '/my-loans': 'My Loans',
    '/expenses/accounts': 'Bank Accounts',
    '/expenses/credit-cards/add': 'Add Credit Card',
    '/expenses/credit-cards/:id': 'Credit Card Detail',
    '/expenses/recurring': 'Recurring Transactions',
    '/my-loans/:id': 'Loan Detail',
    '/business-tracker': 'Business Tracker',
    '/business-tracker/:id': 'Business Detail',
    '/data-privacy': 'Data Privacy',
    '/dev/validator': 'Validator',

    // Legal & support
    '/privacy-policy': 'Privacy Policy',
    '/terms-of-service': 'Terms of Service',
    '/data-safety': 'Data Safety',
};

/** Canonical screen name for a path; every screen reports exactly this name. */
export function screenNameFor(pathname: string): string {
    const path = normalizePath(pathname);
    if (ROUTE_NAMES[path]) return ROUTE_NAMES[path];
    if (path.startsWith('/scheme/')) return 'Scheme Detail';
    // Unlisted route: "/calculator/foo-bar" → "Foo Bar Calculator", "/a/b" → "A - B".
    const words = (seg: string) => seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const calc = path.match(/^\/calculator\/([a-z0-9-]+)$/);
    if (calc) return `${words(calc[1])} Calculator`;
    const name = path.split('/').filter((seg) => seg && seg !== ':id').map(words).join(' - ');
    return (name || 'Home').replace(/[^A-Za-z0-9 &()'./-]/g, '').slice(0, 60);
}

/**
 * Old URLs that only redirect (<Navigate> routes in App.tsx). They are not
 * screens: the visit is recorded for the screen they land on. Keep this list
 * in sync when a redirect is added (scripts/qa-consent-network.mjs checks /sip).
 */
const REDIRECT_ONLY = new Set([
    '/ai-advisor',
    '/atal-pension',
    '/cagr',
    '/calculator/advanced-sip',
    '/calculator/goal-sip',
    '/calculator/ppf-advanced',
    '/calculator/step-up-sip',
    '/capital-gains',
    '/car-loan',
    '/emi',
    '/epf',
    '/expense-tracker',
    '/fd',
    '/gratuity',
    '/gst',
    '/home-loan',
    '/hra',
    '/income-tax',
    '/kvp',
    '/lrs-tcs',
    '/lumpsum',
    '/nps',
    '/nsc',
    '/personal-loan',
    '/post-office-mis',
    '/post-office-td',
    '/ppf',
    '/rd',
    '/scss',
    '/sip',
    '/sukanya-samriddhi',
    '/swp',
]);

/** Time to let a redirecting URL settle before the visit is recorded. */
const SETTLE_MS = 300;

/**
 * usePageViewTracker — one `page_view` per screen visit, with the screen's
 * canonical name (see ROUTE_NAMES). Waits briefly so a redirecting URL
 * (e.g. /sip → /calculator/sip) reports only the screen it lands on.
 * Sent only while usage analytics are on (AnalyticsService drops it
 * otherwise). Record IDs in the path are replaced by ":id".
 *
 * Call this ONCE high in the component tree (AppContent in App.tsx).
 */
export function usePageViewTracker() {
    const location = useLocation();

    useEffect(() => {
        const pathname = location.pathname;
        if (REDIRECT_ONLY.has(pathname)) return;
        // On the web "/" inside the app only redirects to /app (the website records its own view).
        if (pathname === '/' && !Capacitor.isNativePlatform()) return;
        const timer = setTimeout(() => trackScreenOpened(screenNameFor(pathname), pathname), SETTLE_MS);
        return () => clearTimeout(timer);
    }, [location.pathname]);
}
