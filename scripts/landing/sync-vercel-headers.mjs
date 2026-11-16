// Write the website's routing into vercel.json from src/landing/seoRoutes.ts.
//
//   node scripts/landing/sync-vercel-headers.mjs          update vercel.json
//   node scripts/landing/sync-vercel-headers.mjs --check  exit 1 if vercel.json is out of date
//
// Managed here (everything else in vercel.json is left exactly as it is, including the
// www → apex redirect, the /privacy-policy.html redirect, the security headers and the
// /config.json CORS and cache headers):
//   - buildCommand "npm run build:web" (app + pre-rendered website + legal pages)
//   - a backstop for the lock in middleware.ts: /app.html is never served without the dev cookie
//   - no rewrites: the app shell is only ever served by middleware.ts in dev mode
//   - X-Robots-Tag: noindex on every response in dev mode (cookie present)
//   - cache headers for the app shell and the website's files (/site, /og, /brand)
import fs from 'node:fs';
import { buildSync } from 'esbuild';

const out = buildSync({ entryPoints: ['src/landing/seoRoutes.ts'], bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'error' });
const R = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));

const COOKIE = { type: 'cookie', key: R.DEV_COOKIE, value: '1' };
const NOT_DEV = [COOKIE, { type: 'query', key: 'dev' }];

// The gate itself is middleware.ts (its redirects are sent with no-store, so a browser that
// turns dev mode on later is not held by a cached redirect). vercel.json keeps one backstop:
// the app shell file is never served without the dev cookie, even if middleware did not run.
const managedRedirects = [
    { source: '/app\\.html', missing: NOT_DEV, destination: '/', permanent: true },
];
const managedHeaders = [
    { source: '/(.*)', has: [COOKIE], headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
    { source: '/app.html', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    { source: '/site/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/(og|brand)/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000' }] },
];
const isManagedRedirect = (r) => !!r.missing || !!(r.has && r.has.some((h) => h.type !== 'host' || /vercel\\?\.app/.test(h.value)));
const isManagedHeader = (h) =>
    !!h.has || h.source === '/app.html' || h.source === '/site/(.*)' || h.source === '/(og|brand)/(.*)' ||
    h.headers.some((x) => x.key === 'X-Robots-Tag' || (x.key === 'Link' && /rel="canonical"/.test(x.value)));

const file = 'vercel.json';
const raw = fs.readFileSync(file, 'utf8');
const cfg = JSON.parse(raw);
const next = { ...cfg };
next.buildCommand = 'npm run build:web';
next.redirects = [...(cfg.redirects || []).filter((r) => !isManagedRedirect(r)), ...managedRedirects];
delete next.rewrites;
const kept = cfg.headers.filter((h) => !isManagedHeader(h));
const firstCache = kept.findIndex((h) => h.source !== '/(.*)');
next.headers = [...kept.slice(0, firstCache), ...managedHeaders, ...kept.slice(firstCache)];
const order = ['buildCommand', 'redirects', 'headers'];
const sorted = Object.fromEntries([...order.filter((k) => k in next), ...Object.keys(next).filter((k) => !order.includes(k))].map((k) => [k, next[k]]));
const text = JSON.stringify(sorted, null, 2) + '\n';

if (process.argv.includes('--check')) {
    if (text.replace(/\r\n/g, '\n') !== raw.replace(/\r\n/g, '\n')) { console.error('vercel.json is out of date: run node scripts/landing/sync-vercel-headers.mjs'); process.exit(1); }
    console.log('vercel.json is up to date');
} else {
    fs.writeFileSync(file, text);
    console.log(`vercel.json: /app.html backstop and noindex in dev mode (${R.DEV_COOKIE} cookie); the gate itself is middleware.ts`);
}
