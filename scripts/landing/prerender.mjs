// Last step of `npm run build:landing`: turn the website build into static HTML.
//
// Before: dist/index.html   app shell (from `vite build`)
//         dist/{landing,legal,datasafety,site}.html  templates + /site/* assets (website client build)
//         .landing-ssr/     server render bundle (from `... --ssr`)
// After:  dist/index.html   the website home page, fully pre-rendered (served at "/")
//         dist/app.html     the app shell (served only in dev mode, see middleware.ts)
//         dist/<legal>/index.html, dist/calculators/…, dist/schemes/…, dist/in-the-app,
//         dist/export-my-data, dist/404.html, dist/sitemap.xml
//         the 27 static calculator pages get the export-banner script
//
// Only for the web deploy. The Android build (`npm run build` + `npx cap sync`)
// never runs this, so the app inside the APK still loads dist/index.html.
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import QRCode from 'qrcode';

const DIST = path.resolve('dist');
const SSR = path.resolve('.landing-ssr/entry-server.js');
const fail = (m) => { console.error(`prerender: ${m}`); process.exit(1); };

const appShell = path.join(DIST, 'index.html');
const template = path.join(DIST, 'landing.html');
if (!fs.existsSync(template)) fail('dist/landing.html missing (run the website client build first)');
if (!fs.existsSync(SSR)) fail('.landing-ssr/entry-server.js missing (run the SSR build first)');

// 1. App shell → app.html (only if index.html is still the app, so a re-run is safe).
const appHtml = path.join(DIST, 'app.html');
if (fs.existsSync(appShell) && fs.readFileSync(appShell, 'utf8').includes('<div id="root">')) {
    fs.renameSync(appShell, appHtml);
}
if (!fs.existsSync(appHtml)) fail('dist/app.html missing (run the app build first)');

const ssr = await import(pathToFileURL(SSR).href);

// 2. Home page, with the desktop-only QR code to Google Play (static SVG, no JavaScript).
const qrRaw = await QRCode.toString(ssr.playUrl('qr'), { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0F172A', light: '#FFFFFF' } });
const qrSvg = qrRaw.replace(/<\?xml[^>]*>/, '').replace('<svg ', '<svg role="img" aria-hidden="true" focusable="false" ');
const { html, head, islandJson, data } = ssr.render(qrSvg);
let page = fs.readFileSync(template, 'utf8');
if (!page.includes('<!--landing-head-->') || !page.includes('<!--landing-app-->')) fail('placeholders missing in landing.html');
page = page.replace('<!--landing-head-->', head).replace('<!--landing-app-->', `${html}\n    ${islandJson}`);
fs.writeFileSync(appShell, page);
fs.unlinkSync(template);

// Assets used only by the server-rendered markup (screenshots, badge, icon).
const ssrAssets = path.resolve('.landing-ssr/site');
let copied = 0;
if (fs.existsSync(ssrAssets)) {
    for (const f of fs.readdirSync(ssrAssets)) {
        if (f.endsWith('.js') || f.endsWith('.css')) continue;
        fs.copyFileSync(path.join(ssrAssets, f), path.join(DIST, 'site', f));
        copied++;
    }
}

// 3. Legal pages: same components the app showed at these URLs, as static HTML (no app shell).
const legal = await ssr.renderLegal();
for (const p of legal.pages) {
    const tpl = path.join(DIST, `${p.template}.html`);
    if (!fs.existsSync(tpl)) fail(`dist/${p.template}.html missing`);
    if (!p.h1 || /^[a-z]+\.[a-zA-Z.]+$/.test(p.h1)) fail(`${p.name}: no heading rendered (${p.h1 || 'empty'})`);
    const out = fs.readFileSync(tpl, 'utf8')
        .replace('<!--legal-head-->', p.head)
        .replace('<!--legal-app-->', p.html)
        .replace('<!--legal-data-->', '')
        .replace(/<body([^>]*)>/, `<body$1 data-page="${p.name}">`);
    fs.mkdirSync(path.join(DIST, p.name), { recursive: true });
    fs.writeFileSync(path.join(DIST, p.name, 'index.html'), out);
}
console.log(`prerender: legal pages ${legal.pages.map((p) => `/${p.name} (${p.h1})`).join(', ')}`);

// 4. Generated pages: categories, /calculators, /schemes, /schemes/<id>, /in-the-app, 404, export.
const siteTpl = path.join(DIST, 'site.html');
if (!fs.existsSync(siteTpl)) fail('dist/site.html missing');
const siteTemplate = fs.readFileSync(siteTpl, 'utf8');
const site = ssr.renderSite();
for (const p of site.pages) {
    const out = siteTemplate
        .replace('<!--site-head-->', p.head)
        .replace('<!--site-app-->', p.html)
        .replace(/<body([^>]*)>/, `<body$1 data-title="${p.analyticsTitle}">`);
    const file = p.path === '/404' ? path.join(DIST, '404.html') : path.join(DIST, p.path.slice(1), 'index.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, out);
}
const noindexSchemes = site.schemePages.filter((s) => !s.index);
console.log(`prerender: ${site.pages.length} generated pages; scheme pages ${site.schemePages.length} (${site.schemePages.length - noindexSchemes.length} indexed, ${noindexSchemes.length} noindex)`);
for (const s of noindexSchemes) console.log(`  noindex /schemes/${s.id}: ${s.reason}`);

// 5. Sitemap: the existing entries (public/sitemap.xml, lastmod kept) + every new indexable
//    page (scheme pages carry their last-verified date).
const today = new Date().toISOString().slice(0, 10);
const existing = fs.readFileSync(path.resolve('public/sitemap.xml'), 'utf8');
const urls = new Map();
for (const m of existing.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?/g)) urls.set(m[1], m[2] || today);
for (const p of site.pages.filter((x) => x.index)) {
    const loc = `https://fincalix.com${p.path}`;
    const id = p.path.startsWith('/schemes/') ? p.path.slice('/schemes/'.length) : null;
    // A feature page carries the date its content last changed (also when it replaced a hand-written guide).
    if (p.lastmod) urls.set(loc, p.lastmod);
    else if (!urls.has(loc)) urls.set(loc, (id && ssr.schemeLastVerified(id)) || today);
}
// Split sitemaps: pages (home, legal, hubs), calculators (feature pages), schemes. sitemap.xml is
// the index; each child carries real lastmod dates. The home page is dated by its newest page.
const featurePaths = new Set(site.pages.filter((x) => x.index && x.lastmod && !x.path.startsWith('/schemes/') && x.path !== '/calculators' && !x.path.startsWith('/calculators/') && x.path !== '/schemes').map((x) => `https://fincalix.com${x.path}`));
const groupOf = (loc) => (loc.startsWith('https://fincalix.com/schemes/') ? 'schemes' : featurePaths.has(loc) ? 'calculators' : 'pages');
const allDates = [...urls.values()].sort();
if (urls.has('https://fincalix.com/')) urls.set('https://fincalix.com/', allDates[allDates.length - 1]);
const groups = { pages: [], calculators: [], schemes: [] };
for (const [loc, lastmod] of urls) groups[groupOf(loc)].push([loc, lastmod]);
const urlset = (list) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map(([loc, lastmod]) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`).join('\n')}\n</urlset>\n`;
const index = [];
for (const [name, list] of Object.entries(groups)) {
    if (!list.length) continue;
    fs.writeFileSync(path.join(DIST, `sitemap-${name}.xml`), urlset(list));
    index.push([`https://fincalix.com/sitemap-${name}.xml`, list.map(([, d]) => d).sort().pop()]);
}
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${index.map(([loc, d]) => `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${d}</lastmod>\n  </sitemap>`).join('\n')}\n</sitemapindex>\n`);
console.log(`prerender: sitemap.xml index of ${index.length} sitemaps, ${urls.size} URLs (${Object.entries(groups).map(([k, v]) => `${k} ${v.length}`).join(', ')})`);

// 5a. Social cards: every generated page names /og/p/<key>.jpg (src/landing/head.ts). List them for
//     scripts/landing/build-page-og.mjs, and fail when a card is missing from public/og/p.
{
    const titleOf = (head) => ((head.match(/<title>([^<]+)<\/title>/) || [])[1] || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'");
    const cards = site.pages.map((p) => ({ key: ssr.ogKey(p.path), path: p.path, title: titleOf(p.head) }));
    fs.writeFileSync(path.join(DIST, 'og-pages.json'), JSON.stringify(cards, null, 1));
    const missing = cards.filter((c) => !fs.existsSync(path.resolve('public/og/p', `${c.key}.jpg`)));
    if (missing.length) console.log(`prerender: ${missing.length} social cards missing in public/og/p (run node scripts/landing/build-page-og.mjs): ${missing.slice(0, 5).map((c) => c.key).join(', ')}${missing.length > 5 ? ' …' : ''}`);
    else console.log(`prerender: social cards present for all ${cards.length} generated pages`);
}

// 5b. llms.txt: a plain map of the site for AI answer engines (indexable pages only, their own
//     titles and descriptions; same entity facts as the structured data).
{
    const meta = (head, re) => ((head.match(re) || [])[1] || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'");
    const line = (p) => `- [${meta(p.head, /<title>([^<]+)<\/title>/)}](https://fincalix.com${p.path}): ${meta(p.head, /<meta name="description" content="([^"]+)"/)}`;
    const indexable = site.pages.filter((x) => x.index);
    const calcs = indexable.filter((x) => groupOf(`https://fincalix.com${x.path}`) === 'calculators');
    const schemePgs = indexable.filter((x) => x.path.startsWith('/schemes/'));
    const hubs = indexable.filter((x) => x.path === '/calculators' || x.path.startsWith('/calculators/') || x.path === '/schemes' || ['/how-we-calculate', '/updates'].includes(x.path));
    const llms = [
        '# FinCalix',
        '',
        '> Free personal-finance calculators and guides for India (EMI, SIP, income tax FY 2026-27, PPF, FD, small savings, credit cards, government schemes), and the FinCalix Android app. Published by Sri Moksha Software Developers, India. Contact: support@fincalix.com.',
        '',
        'Every figure on these pages is computed with the same functions the FinCalix app uses, and every rule links to its official source (Income-tax Act 2025, RBI, India Post / NSI, EPFO, PFRDA, scheme portals) with the date it was checked. Estimates only; not financial, tax or legal advice. App: https://play.google.com/store/apps/details?id=com.fincalix.app',
        '',
        '## Calculators and guides',
        ...calcs.map(line),
        '',
        '## Government schemes',
        ...schemePgs.map(line),
        '',
        '## Hubs and method',
        ...hubs.map(line),
        '',
        '## Optional',
        '- [Privacy Policy](https://fincalix.com/privacy-policy): what the app and website collect and why',
        '- [Data safety](https://fincalix.com/data-safety): data handled by the Android app',
        '- [About FinCalix](https://fincalix.com/about): who makes FinCalix',
        '',
    ].join('\n');
    fs.writeFileSync(path.join(DIST, 'llms.txt'), llms);
    console.log(`prerender: llms.txt ${calcs.length} calculators, ${schemePgs.length} schemes, ${hubs.length} hubs`);
}

// 6. Export banner on the 27 static calculator pages (their content is otherwise untouched).
const manifestFile = path.join(DIST, 'site-manifest.json');
if (!fs.existsSync(manifestFile)) fail('dist/site-manifest.json missing');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const bannerJs = manifest['src/landing/banner-entry.ts']?.file;
if (!bannerJs) fail('banner entry missing from the build manifest');
let injected = 0;
for (const dir of ssr.STATIC_PAGES) {
    const f = path.join(DIST, dir, 'index.html');
    if (!fs.existsSync(f)) fail(`static page ${dir} missing`);
    let s = fs.readFileSync(f, 'utf8');
    if (!s.includes(bannerJs)) {
        s = s.replace('</body>', `  <script type="module" src="/${bannerJs}"></script>\n</body>`);
        injected++;
    }
    // The guides have only a light design: a light browser bar (their --bg), whatever the device setting.
    if (!s.includes('name="theme-color"')) s = s.replace(/(<meta name="viewport"[^>]*>)/, '$1\n  <meta name="theme-color" content="#F8FAF9" />');
    fs.writeFileSync(f, s);
}
console.log(`prerender: export banner added to ${injected} static pages`);
for (const t of ['legal.html', 'datasafety.html', 'site.html', 'site-manifest.json']) fs.rmSync(path.join(DIST, t), { force: true });
fs.rmSync(path.resolve('.landing-ssr'), { recursive: true, force: true });

const missing = [...page.matchAll(/(?:src|href)="(\/site\/[^"]+)"|(\/site\/[^\s",]+\.webp)/g)]
    .map((m) => m[1] || m[2]).filter((p) => !fs.existsSync(path.join(DIST, p)));
if (missing.length) fail(`files referenced by the page are missing: ${[...new Set(missing)].slice(0, 5).join(', ')}`);

// 7. Report what the first visit to "/" downloads in JavaScript (gzipped).
const scripts = [...page.matchAll(/<script type="module"[^>]*src="([^"]+)"/g), ...page.matchAll(/<link rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
const js = [...new Set(scripts)].map((src) => {
    const buf = fs.readFileSync(path.join(DIST, src));
    return { src, gz: gzipSync(buf, { level: 9 }).length };
});
const total = js.reduce((t, f) => t + f.gz, 0);
console.log(`prerender: dist/index.html ${(Buffer.byteLength(page) / 1024).toFixed(0)} KB HTML, ${data.toolCount} tools, ${data.schemeCount} schemes, ${data.faq.length} FAQs, ${copied} image files`);
for (const f of js) console.log(`  ${f.src}  ${(f.gz / 1024).toFixed(1)} KB gz`);
console.log(`  initial JavaScript: ${(total / 1024).toFixed(1)} KB gzipped (budget 120 KB)`);
if (total > 120 * 1024) fail('initial JavaScript is over the 120 KB budget');
