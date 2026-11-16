/**
 * Vercel Routing Middleware (runs at the edge, before the cache and the file system).
 * The gate between the public marketing site and the owner's web app.
 *
 * fincalix.com is a marketing site; the full web app is for the owner's testing only,
 * unlocked per browser with a first-party cookie:
 *
 *   ?dev=true   on any URL → sets fincalix_dev=1 (Secure, SameSite=Lax, 30 days) and
 *               redirects to the same URL without the parameter.
 *   ?dev=false  → clears the cookie and redirects to "/" (the public site).
 *   With the cookie: "/" and every app route are served the app shell (/app.html), so
 *   refreshes and deep links work inside the app; every response is noindex.
 *   Without it: app routes 308-redirect to their static page (/calculator/sip → /sip)
 *   or to "/"; the app shell and the app's files are never served. The redirects are
 *   sent with Cache-Control: no-store, so a browser that later turns dev mode on is not
 *   held by a cached redirect.
 *
 * Paths and the table live in src/landing/seoRoutes.ts. Emulated locally by
 * scripts/landing/serve-dist.mjs; checked by scripts/qa-landing.mjs and
 * scripts/landing/dev-mode-proof.mjs.
 */
import { next, rewrite } from '@vercel/functions';
import { APP_ALIASES, APP_CANONICAL, DEV_COOKIE, isAppPath } from './src/landing/seoRoutes';

export const config = {
    // Pages, app routes and the app's files; the website's own files never need the gate.
    matcher: ['/((?!site/|og/|brand/|icons/|screenshots/).*)'],
};

const MAX_AGE = 30 * 24 * 60 * 60;
const SET_COOKIE = `${DEV_COOKIE}=1; Path=/; Max-Age=${MAX_AGE}; Secure; SameSite=Lax`;
const CLEAR_COOKIE = `${DEV_COOKIE}=; Path=/; Max-Age=0; Secure; SameSite=Lax`;
const DEV_HEADERS = { 'X-Robots-Tag': 'noindex', 'Cache-Control': 'private, no-store' };

const redirect = (status: number, location: string, headers: Record<string, string> = {}) =>
    new Response(null, { status, headers: { Location: location, 'Cache-Control': 'no-store', ...headers } });

export default function middleware(request: Request): Response {
    const url = new URL(request.url);
    const flag = url.searchParams.get('dev');
    if (flag === 'true' || flag === 'false') {
        url.searchParams.delete('dev');
        const to = flag === 'true' ? `${url.pathname}${url.search}` : '/';
        return redirect(307, to, { 'Set-Cookie': flag === 'true' ? SET_COOKIE : CLEAR_COOKIE, 'X-Robots-Tag': 'noindex' });
    }
    const dev = new RegExp(`(?:^|;\\s*)${DEV_COOKIE}=1(?:;|$)`).test(request.headers.get('cookie') || '');
    const p = url.pathname;
    if (dev) {
        if (p === '/' || isAppPath(p)) return rewrite(new URL('/app.html', url), { headers: DEV_HEADERS });
        return next({ headers: DEV_HEADERS });
    }
    // Public: lock the app.
    const clean = p.replace(/\/+$/, '') || '/';
    const page = APP_CANONICAL[APP_ALIASES[clean] ?? clean];
    if (page) return redirect(308, page);
    if (isAppPath(p) || p.startsWith('/assets/')) return redirect(308, '/');
    return next();
}
