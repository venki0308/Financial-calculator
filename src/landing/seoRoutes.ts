/**
 * Which URL Google should index for each piece of content on fincalix.com.
 *
 *  - The website ("/") and the 27 static calculator pages (public/<name>/index.html)
 *    are the indexed pages.
 *  - An app route that shows the same tool as a static page sends
 *    `Link: <https://fincalix.com/<static>>; rel="canonical"`.
 *  - The legal pages (served by the app shell) are indexed with a canonical to themselves.
 *  - Every other app route sends `X-Robots-Tag: noindex`.
 *
 * The headers live in vercel.json; `node scripts/landing/sync-vercel-headers.mjs`
 * writes them from this file and `node scripts/qa-landing.mjs` checks them.
 */
export const ORIGIN = 'https://fincalix.com';

/** App route → static page with the same tool. One entry per static page. */
export const APP_CANONICAL: Readonly<Record<string, string>> = {
    '/calculator/loan-emi': '/emi',
    '/calculator/home-loan': '/home-loan',
    '/calculator/car-loan': '/car-loan',
    '/calculator/personal-loan': '/personal-loan',
    '/calculator/sip': '/sip',
    '/calculator/lumpsum': '/lumpsum',
    '/calculator/swp': '/swp',
    '/calculator/cagr': '/cagr',
    '/calculator/capital-gains': '/capital-gains',
    '/calculator/lrs-tcs': '/lrs-tcs',
    '/calculator/fixed-deposit': '/fd',
    '/calculator/recurring-deposit': '/rd',
    '/calculator/ppf': '/ppf',
    '/calculator/epf': '/epf',
    '/calculator/nps': '/nps',
    '/calculator/gratuity': '/gratuity',
    '/calculator/sukanya-samriddhi': '/sukanya-samriddhi',
    '/calculator/nsc': '/nsc',
    '/calculator/kvp': '/kvp',
    '/calculator/post-office-mis': '/post-office-mis',
    '/calculator/post-office-td': '/post-office-td',
    '/calculator/senior-citizen-savings': '/scss',
    '/calculator/income-tax': '/income-tax',
    '/calculator/hra': '/hra',
    '/calculator/gst': '/gst',
    '/expenses': '/expense-tracker',
    '/scheme/c-apy': '/atal-pension',
};

/** Pages served by the app shell that stay indexed (they are in the sitemap). */
export const INDEXED_APP_PAGES: readonly string[] = ['/privacy-policy', '/data-privacy', '/terms-of-service', '/about'];

/** The static calculator pages (folder names under public/). */
export const STATIC_PAGES: readonly string[] = Object.values(APP_CANONICAL).map((p) => p.slice(1)).sort();
