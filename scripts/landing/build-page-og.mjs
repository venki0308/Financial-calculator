// Per-page social cards (1200 x 630), committed to public/og/p/<key>.jpg like the brand card.
// Run after `npm run build:web` whenever pages are added or retitled, then build again:
//
//   node scripts/landing/build-page-og.mjs          renders new or retitled cards only
//   node scripts/landing/build-page-og.mjs --all    re-renders every card
//
// Input: dist/og-pages.json (written by prerender: key, path, title). public/og/p/titles.json
// remembers which title each card shows. One headless Chrome, one page at a time; closed at the end.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const OUT = path.resolve('public/og/p');
const list = JSON.parse(fs.readFileSync(path.resolve('dist/og-pages.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const memoFile = path.join(OUT, 'titles.json');
const memo = fs.existsSync(memoFile) ? JSON.parse(fs.readFileSync(memoFile, 'utf8')) : {};
const all = process.argv.includes('--all');
const todo = list.filter((c) => all || memo[c.key] !== c.title || !fs.existsSync(path.join(OUT, `${c.key}.jpg`)));

const b64 = (p) => fs.readFileSync(path.resolve(p)).toString('base64');
const icon = `data:image/png;base64,${b64('tools/marketing/assets/app-icon-512.png')}`;
const fraunces = `data:font/woff2;base64,${b64('src/landing/fonts/fraunces-var.woff2')}`;
const jakarta = `data:font/woff2;base64,${b64('src/landing/fonts/jakarta-var.woff2')}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const section = (p) => (p.startsWith('/schemes') ? 'Government schemes' : p.startsWith('/calculators') ? 'Calculators' : 'Calculator and guide');

const html = (c) => {
    // Title without the "— FinCalix" suffix; long titles get a smaller size.
    const t = c.title.replace(/\s+[—–-]\s+FinCalix$/, '');
    const size = t.length > 52 ? 58 : t.length > 36 ? 66 : 76;
    return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: F; src: url(${fraunces}) format('woff2'); font-weight: 500 700; }
@font-face { font-family: J; src: url(${jakarta}) format('woff2'); font-weight: 400 800; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #FBFAF6; font-family: J, sans-serif; color: #0F172A; position: relative; overflow: hidden; }
.rules { position: absolute; inset: 0; background: repeating-linear-gradient(#FBFAF6 0 51px, #ECE7DC 51px 52px); opacity: .7; }
.bar { position: absolute; left: 0; top: 0; bottom: 0; width: 14px; background: #047857; }
.brand { position: absolute; left: 72px; top: 58px; display: flex; align-items: center; gap: 14px; font-weight: 800; font-size: 30px; }
.brand img { width: 54px; height: 54px; border-radius: 14px; }
.eyebrow { position: absolute; left: 72px; top: 160px; font-size: 22px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #047857; }
h1 { position: absolute; left: 72px; right: 80px; top: 205px; font-family: F; font-weight: 600; font-size: ${size}px; line-height: 1.06; letter-spacing: -.02em; }
.foot { position: absolute; left: 72px; right: 72px; bottom: 52px; display: flex; justify-content: space-between; font-size: 24px; font-weight: 700; color: #334155; }
.foot b { color: #0F172A; }
</style></head><body><div class="rules"></div><div class="bar"></div>
<div class="brand"><img src="${icon}" alt=""><span>FinCalix</span></div>
<div class="eyebrow">${esc(section(c.path))}</div>
<h1>${esc(t)}</h1>
<div class="foot"><span><b>fincalix.com</b>${c.path === '/' ? '' : esc(c.path)}</span><span>Free · No login · Android app</span></div>
</body></html>`;
};

if (!todo.length) { console.log(`build-page-og: all ${list.length} cards up to date`); process.exit(0); }
const browser = await chromium.launch({ channel: 'chrome' });
try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    for (const c of todo) {
        await page.setContent(html(c), { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: path.join(OUT, `${c.key}.jpg`), type: 'jpeg', quality: 82 });
        memo[c.key] = c.title;
    }
} finally {
    await browser.close();
}
for (const k of Object.keys(memo)) if (!list.some((c) => c.key === k)) { delete memo[k]; fs.rmSync(path.join(OUT, `${k}.jpg`), { force: true }); }
fs.writeFileSync(memoFile, JSON.stringify(memo, null, 1));
console.log(`build-page-og: rendered ${todo.length} card(s); ${list.length} pages have cards`);
