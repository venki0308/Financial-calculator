import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AnalyticsService } from '../services/analyticsService';

/**
 * Maps a URL pathname to a human-readable screen name for Google Analytics.
 * This ensures GA4 reports show meaningful names like "EMI Calculator"
 * instead of raw paths like "/calculator/loan-emi".
 */
const ROUTE_NAMES: Record<string, string> = {
    '/': 'Home',
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
    '/calculator/salary-hike': 'Salary Hike Calculator',
    '/calculator/hra': 'HRA Calculator',
    '/calculator/recurring-deposit': 'RD Calculator',
    '/calculator/simple-interest': 'Simple Interest Calculator',
    '/calculator/lumpsum': 'Lumpsum Calculator',
    '/calculator/swp': 'SWP Calculator',
    '/calculator/stp': 'STP Calculator',
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

    // Legal & support
    '/privacy-policy': 'Privacy Policy',
    '/terms-of-service': 'Terms of Service',
    '/data-safety': 'Data Safety',
};

/**
 * usePageViewTracker — Fires a GA4 `page_view` + `screen_view` on every route change.
 *
 * Call this ONCE high in the component tree (AppContent in App.tsx).
 * It automatically maps pathnames to human-readable names for clean GA4 reports.
 */
export function usePageViewTracker() {
    const location = useLocation();

    useEffect(() => {
        const pathname = location.pathname;

        // Resolve friendly name: exact match first, then prefix match for dynamic routes
        let screenName = ROUTE_NAMES[pathname];

        if (!screenName) {
            // Handle dynamic routes like /scheme/:id
            if (pathname.startsWith('/scheme/')) {
                screenName = 'Scheme Detail';
            } else {
                // Fallback: convert path to Title Case
                screenName = pathname
                    .replace(/^\//, '')
                    .replace(/\//g, ' > ')
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Home';
            }
        }

        // Fire page_view (standard GA4 web event)
        AnalyticsService.trackEvent('page_view', {
            page_path: pathname,
            page_title: screenName,
        });

        // Fire screen_view (standard GA4 app event — used for cross-platform reporting)
        AnalyticsService.trackScreenView({
            screen_name: screenName,
            page_path: pathname,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);
}
