// Screenshots of every section of the website, light and dark, desktop and mobile.
//
//   node scripts/landing/screenshots.mjs [baseUrl] [outDir]
//
// Default: serves dist/ like Vercel (serve-dist.mjs) and writes to
// marketing-assets/website-preview/ (git-ignored). Also checks, per run, that
// there is no horizontal scroll at the given width and no console error.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { serveDist } from './serve-dist.mjs';

const SECTIONS = [
    ['01-hero', 'header.hdr, main > .hero'],
    ['02-calculator', '#try'],
    ['03-tax', '#tax'],
    ['04-tools', '#tools'],
    ['05-features', '#features'],
    ['06-languages', '#languages'],
    ['07-schemes', '#schemes'],
    ['08-privacy', '#privacy'],
    ['09-faq', '#faq'],
    ['10-cta-footer', 'section.band, footer.ftr'],
];
const VIEWS = [
    { name: 'desktop', viewport: { width: 1440, height: 900 }, dpr: 1, mobile: false },
    { name: 'mobile', viewport: { width: 390, height: 844 }, dpr: 2, mobile: true },
];

const external = process.argv[2];
const OUT = path.resolve(process.argv[3] || 'marketing-assets/website-preview');
const server = external ? { base: external.replace(/\/$/, ''), stop: async () => {} } : await serveDist({ port: 4322, asHost: 'fincalix.com' });
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const problems = [];
for (const v of VIEWS) {
    for (const theme of ['light', 'dark']) {
        const ctx = await browser.newContext({ viewport: v.viewport, deviceScaleFactor: v.dpr, isMobile: v.mobile, hasTouch: v.mobile, colorScheme: theme });
        // Screenshots must never count as visitors: analytics switched off for this profile.
        await ctx.addInitScript(() => { try { localStorage.setItem('fincalix_analytics_consent', 'denied'); localStorage.setItem('fincalix_analytics_test_traffic', '1'); } catch { /* */ } });
        const page = await ctx.newPage();
        page.on('console', (m) => { if (m.type() === 'error') problems.push(`${v.name}/${theme}: ${m.text().slice(0, 160)}`); });
        page.on('pageerror', (e) => problems.push(`${v.name}/${theme}: ${e.message}`));
        await page.goto(server.base + '/', { waitUntil: 'networkidle' });
        // Scroll through so every lazy image loads, then back to the top.
        await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 120)); }
            window.scrollTo({ top: 0, behavior: 'instant' });
        });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        const pending = await page.evaluate(() => Promise.race([
            Promise.all([...document.images].filter((i) => i.offsetParent).map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))).then(() => 0),
            new Promise((r) => setTimeout(() => r([...document.images].filter((i) => i.offsetParent && !i.complete).map((i) => i.currentSrc || i.src).length), 8000)),
        ]));
        if (pending) problems.push(`${v.name}/${theme}: ${pending} visible images did not finish loading`);
        console.log(`  ${v.name}/${theme}: page ready`);
        await page.evaluate(() => document.fonts.ready);
        const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        if (sw > cw) problems.push(`${v.name}/${theme}: horizontal scroll (${sw} > ${cw})`);
        // Sticky header would overlap section shots: let it scroll with the page here.
        await page.addStyleTag({ content: '.hdr { position: static !important; }' });
        for (const [id, sel] of SECTIONS) {
            const box = await page.evaluate((s) => {
                const els = [...document.querySelectorAll(s)];
                if (!els.length) return null;
                const r = els.map((e) => e.getBoundingClientRect());
                const top = Math.min(...r.map((x) => x.top)) + window.scrollY, bottom = Math.max(...r.map((x) => x.bottom)) + window.scrollY;
                return { x: 0, y: top, width: document.documentElement.clientWidth, height: bottom - top };
            }, sel);
            if (!box) { problems.push(`${id}: section not found`); continue; }
            await page.screenshot({ path: path.join(OUT, `${v.name}-${theme}-${id}.png`), clip: box, fullPage: true });
        }
        await page.screenshot({ path: path.join(OUT, `${v.name}-${theme}-00-full-page.png`), fullPage: true });
        await ctx.close();
    }
}
await browser.close();
await server.stop();
console.log(`${fs.readdirSync(OUT).filter((f) => f.endsWith('.png')).length} screenshots in ${path.relative(process.cwd(), OUT)}`);
if (problems.length) { console.log('Problems:\n  ' + problems.join('\n  ')); process.exitCode = 1; }
