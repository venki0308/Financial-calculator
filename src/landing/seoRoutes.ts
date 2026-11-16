/**
 * What fincalix.com serves, and how the owner reaches the web app.
 *
 * fincalix.com (and www) is a marketing site whose only goal is Google Play installs.
 * It serves: the website "/", the 27 static calculator pages, the 5 legal pages
 * (pre-rendered static HTML) and files (config.json, sitemap, robots, images…).
 * Every app route 308-redirects to its static page when there is one
 * (/calculator/sip → /sip), else to "/". The app shell is never served.
 *
 * Dev mode (owner's testing only): any URL with ?dev=true sets the first-party cookie
 * DEV_COOKIE (middleware.ts at the edge); with it, "/" and every app route serve the
 * full app, every response is noindex and analytics hits are test traffic.
 * ?dev=false clears it.
 *
 * vercel.json is generated from this file by scripts/landing/sync-vercel-headers.mjs
 * and checked by scripts/qa-landing.mjs.
 */
export const ORIGIN = 'https://fincalix.com';

/** First-party cookie that unlocks the web app for this browser (set by ?dev=true). */
export const DEV_COOKIE = 'fincalix_dev';

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

/** The static calculator pages (folder names under public/). */
export const STATIC_PAGES: readonly string[] = Object.values(APP_CANONICAL).map((p) => p.slice(1)).sort();

/** Legal pages, pre-rendered to static HTML (dist/<name>/index.html) and indexed. */
export const LEGAL_PAGES: readonly string[] = ['privacy-policy', 'data-privacy', 'data-safety', 'terms-of-service', 'about'];

/** Files and folders production serves as they are (everything else is an app path). */
export const PUBLIC_FILES: readonly string[] = ['config.json', 'sitemap.xml', 'robots.txt', 'sw.js', 'manifest.json', 'og-image.png', 'og-image.svg', 'favicon.ico'];
export const PUBLIC_DIRS: readonly string[] = ['site', 'og', 'brand', 'icons', 'screenshots'];

/** True for a path that only the web app can answer (locked unless dev mode is on). */
export function isAppPath(pathname: string): boolean {
    const p = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    if (p === '' || p === 'index.html') return false;
    const first = p.split('/')[0];
    const pageOrIndex = (list: readonly string[]) => list.includes(first) && (p === first || p === `${first}/index.html`);
    if (pageOrIndex(STATIC_PAGES) || pageOrIndex(LEGAL_PAGES)) return false;
    if (PUBLIC_FILES.includes(p) || PUBLIC_DIRS.includes(first) || first === 'assets') return false;
    if (/\.[a-z0-9]+$/i.test(p) && !/\.html$/i.test(p)) return false;
    return true;
}

/** Old app URLs that the app itself redirects (<Navigate> routes in App.tsx). The public
 *  site follows them first, so e.g. /calculator/step-up-sip lands on the /sip page. */
export const APP_ALIASES: Readonly<Record<string, string>> = {
    '/calculator/step-up-sip': '/calculator/sip',
    '/calculator/goal-sip': '/calculator/sip',
    '/calculator/advanced-sip': '/calculator/sip',
    '/calculator/ppf-advanced': '/calculator/ppf',
    '/ai-advisor': '/financial-advisor',
};
