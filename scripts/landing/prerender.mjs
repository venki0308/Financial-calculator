// Last step of `npm run build:landing`: turn the website build into static HTML.
//
// Before: dist/index.html   app shell (from `vite build`)
//         dist/landing.html website template + /site/* assets (from `vite build -c vite.landing.config.ts`)
//         .landing-ssr/     server render bundle (from `... --ssr`)
// After:  dist/index.html   the website, fully pre-rendered (served at "/")
//         dist/app.html     the app shell (vercel.json serves it for every app route)
//
// Only for the web deploy. The Android build (`npm run build` + `npx cap sync`)
// never runs this, so the app inside the APK still loads dist/index.html.
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

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

// 2. Render the page.
const { render } = await import(pathToFileURL(SSR).href);
const { html, head, islandJson, data } = render();
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
fs.rmSync(path.resolve('.landing-ssr'), { recursive: true, force: true });
const missing = [...page.matchAll(/(?:src|href)="(\/site\/[^"]+)"|(\/site\/[^\s",]+\.webp)/g)]
    .map((m) => m[1] || m[2]).filter((p) => !fs.existsSync(path.join(DIST, p)));
if (missing.length) fail(`files referenced by the page are missing: ${[...new Set(missing)].slice(0, 5).join(', ')}`);

// 3. Report what the first visit downloads in JavaScript (gzipped).
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
