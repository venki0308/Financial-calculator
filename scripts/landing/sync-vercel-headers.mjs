// Write the website's routing and SEO headers into vercel.json from src/landing/seoRoutes.ts.
//
//   node scripts/landing/sync-vercel-headers.mjs          update vercel.json
//   node scripts/landing/sync-vercel-headers.mjs --check  exit 1 if vercel.json is out of date
//
// Managed here (everything else in vercel.json is left exactly as it is, including the
// www → apex redirect and the /config.json CORS and cache headers):
//   - buildCommand "npm run build:web" (app + pre-rendered website)
//   - the catch-all rewrite to /app.html (the website itself is dist/index.html at "/")
//   - Link rel=canonical for app routes that have a static page, and for the legal pages
//   - X-Robots-Tag: noindex for every other app route
//   - cache headers for the app shell (/app.html) and the website's files (/site, /og, /brand)
import fs from 'node:fs';
import { buildSync } from 'esbuild';

const out = buildSync({ entryPoints: ['src/landing/seoRoutes.ts'], bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'error' });
const { APP_CANONICAL, INDEXED_APP_PAGES, ORIGIN, STATIC_PAGES } = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const alt = (list) => `(?:${list.map(esc).join('|')})`;
const appCanon = Object.keys(APP_CANONICAL).map((p) => p.slice(1));
const legal = INDEXED_APP_PAGES.map((p) => p.slice(1));

// Everything that must stay indexable (or is a file) is excluded from the noindex rule.
const keep = [
    '$', 'index\\.html$',
    `${alt([...STATIC_PAGES])}(?:/(?:index\\.html)?)?$`,
    `${alt(legal)}/?$`,
    `${alt(appCanon)}/?$`,
    '(?:assets|site|icons|screenshots|og|brand)/',
    '[^/]*\\.(?!html$)[A-Za-z0-9]+$',
];
export const NOINDEX_SOURCE = `/((?!${keep.join('|')}).*)`;

const managedHeaders = [
    ...Object.entries(APP_CANONICAL).map(([app, page]) => ({ source: app, headers: [{ key: 'Link', value: `<${ORIGIN}${page}>; rel="canonical"` }] })),
    ...INDEXED_APP_PAGES.map((p) => ({ source: p, headers: [{ key: 'Link', value: `<${ORIGIN}${p}>; rel="canonical"` }] })),
    { source: NOINDEX_SOURCE, headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
    { source: '/app.html', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }, { key: 'X-Robots-Tag', value: 'noindex' }] },
    { source: '/site/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/(og|brand)/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000' }] },
];
const isManaged = (h) =>
    h.source === '/app.html' || h.source === '/site/(.*)' || h.source === '/(og|brand)/(.*)' ||
    h.headers.some((x) => x.key === 'X-Robots-Tag' || (x.key === 'Link' && /rel="canonical"/.test(x.value)));

const file = 'vercel.json';
const raw = fs.readFileSync(file, 'utf8');
const cfg = JSON.parse(raw);
const next = { ...cfg };
next.buildCommand = 'npm run build:web';
next.rewrites = [{ source: '/(.*)', destination: '/app.html' }];
// Managed rules go after the general security headers and before the per-file cache rules.
const kept = cfg.headers.filter((h) => !isManaged(h));
const firstCache = kept.findIndex((h) => h.source !== '/(.*)');
next.headers = [...kept.slice(0, firstCache), ...managedHeaders, ...kept.slice(firstCache)];
const order = ['buildCommand', 'redirects', 'rewrites', 'headers'];
const sorted = Object.fromEntries([...order.filter((k) => k in next), ...Object.keys(next).filter((k) => !order.includes(k))].map((k) => [k, next[k]]));
const text = JSON.stringify(sorted, null, 2) + '\n';

if (process.argv.includes('--check')) {
    if (text.replace(/\r\n/g, '\n') !== raw.replace(/\r\n/g, '\n')) { console.error('vercel.json is out of date: run node scripts/landing/sync-vercel-headers.mjs'); process.exit(1); }
    console.log('vercel.json is up to date');
} else {
    fs.writeFileSync(file, text);
    console.log(`vercel.json: ${Object.keys(APP_CANONICAL).length} canonical app routes, ${INDEXED_APP_PAGES.length} legal pages, noindex for the rest`);
}
