// QA audit: the pre-rendered website at "/".
//
//   npm run build:web
//   node scripts/qa-landing.mjs                 (serves dist/ like Vercel, see scripts/landing/serve-dist.mjs)
//   node scripts/qa-landing.mjs https://...     (a deployed site that is publicly reachable)
//
// 1. Without JavaScript: "/" has the hero, every registered tool and the FAQ in its HTML;
//    head, canonical, social tags and structured data are correct; FAQPage matches the
//    visible FAQ; no banned claim or provider name; every image has alt text and a size.
// 2. Every link on the page resolves; links into the app point at real app routes.
// 3. Routing and headers: canonical / noindex per route, legal and static pages indexed,
//    /config.json CORS and cache unchanged, manifest start_url, service worker version.
// 4. In Chrome: no console error or failed request; the mini-calculator and the hero
//    card show exactly what the app's own functions return; Android puts Google Play
//    first without layout shift; no horizontal scroll at 360 px in either theme; theme
//    and language switches; keyboard focus; ?q= search; analytics events (test traffic)
//    and nothing at all when analytics are switched off.
// Needs playwright-core and Google Chrome. Hits it causes carry debug_mode +
// traffic_type=internal and are filtered out of reports (PLAY_DATA_SAFETY.md).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { buildSync } from 'esbuild';
import { chromium } from 'playwright-core';
import { serveDist } from './landing/serve-dist.mjs';

let passed = 0, failed = 0;
const check = (label, ok, detail = '') => {
    if (ok) passed++; else failed++;
    console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  [${detail}]` : ''}`);
};
const load = async (entry) => {
    const out = buildSync({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error', loader: { '.json': 'json' } });
    return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
};
const calc = await load('src/utils/calculations.ts');
const tax = await load('src/utils/incomeTax.ts');
const seo = await load('src/landing/seoRoutes.ts');
const content = await load('src/landing/content.ts');

const BANNED = /#1\b|\bbest\b|guarantee|zero data collection|no tracking|100% offline|google analytics|firebase|google llc|hyderabad|guntur|rates updated jul 2026|ai financial advisor/i;
const ANALYTICS_HOSTS = /(^|\.)(google-analytics\.com|analytics\.google\.com|googletagmanager\.com|firebase\.googleapis\.com|firebaseinstallations\.googleapis\.com|app-measurement\.com)$/;
const COLLECT_HOSTS = /(^|\.)(google-analytics\.com|analytics\.google\.com|app-measurement\.com)$/;

const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];

/** App routes declared in App.tsx (":id" segments become wildcards). */
function appRoutes() {
    const src = fs.readFileSync('src/App.tsx', 'utf8');
    return [...src.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== '*')
        .map((p) => new RegExp('^' + p.replace(/:[a-zA-Z]+/g, '[^/]+') + '$'));
}

function decode(req) {
    const u = new URL(req.url());
    const base = new URLSearchParams(u.search);
    const out = [];
    for (const line of [u.search.slice(1), ...(req.postData() || '').split('\n')].filter(Boolean)) {
        const p = new URLSearchParams(line);
        const en = p.get('en');
        if (!en) continue;
        const ep = {};
        for (const [k, v] of p) if (/^(ep|epn)\./.test(k)) ep[k.replace(/^(ep|epn)\./, '')] = v;
        const get = (k) => p.get(k) ?? base.get(k);
        out.push({ en, ep, dt: get('dt') || '', tt: get('tt') || '' });
    }
    return out;
}

async function main() {
    const external = process.argv[2];
    const server = external ? { base: external.replace(/\/$/, ''), stop: async () => {} } : await serveDist({ port: 4323 });
    const { base } = server;
    try {
        // ── 1. Without JavaScript ───────────────────────────────────────────
        console.log('\n1. "/" without JavaScript (what a crawler sees first)');
        const res = await fetch(base + '/');
        const html = await res.text();
        check('"/" answers 200 with HTML', res.status === 200 && /text\/html/.test(res.headers.get('content-type') || ''));
        const body = text(html.split(/<body[^>]*>/)[1] || '');
        check('hero headline and promise are in the HTML', body.includes('Every money decision, worked out in seconds.') && body.includes('Your financial data stays on your device'));
        check('the hero figure is pre-rendered (live mini-calculator result)', /Monthly EMI ₹26,035/.test(body), (body.match(/Monthly EMI ₹[\d,]+/) || [''])[0]);
        const props = JSON.parse((html.match(/<script id="landing-props" type="application\/json">([\s\S]*?)<\/script>/) || [])[1] || '{"tools":[]}');
        const reg = await load('src/data/calculatorList.ts').catch(() => null);
        const regCount = reg ? reg.allCalcs.length + reg.appTools.length : NaN;
        check('every registered tool is listed (registry = page)', props.tools.length === regCount && props.tools.every((t) => body.includes(t.name)), `${props.tools.length} on page, ${regCount} in registry`);
        const questions = [...html.matchAll(/<summary><span>([\s\S]*?)<\/span><\/summary>/g)].map((m) => text(m[1]));
        check('FAQ questions and answers are in the HTML (8–10)', questions.length >= 8 && questions.length <= 10 && questions.every((q) => body.includes(q)), `${questions.length} questions`);
        check('tax spotlight figures come from the tax engine', body.includes(calc.formatINR(tax.NEW_REGIME_REBATE_LIMIT)) && body.includes(calc.formatINR(tax.NEW_REGIME_STANDARD_DEDUCTION))
            && body.includes(calc.formatINR(Math.round(tax.compareSalaryTax(tax.NEW_REGIME_REBATE_LIMIT + tax.NEW_REGIME_STANDARD_DEDUCTION, 0).oldTax.totalTax))));
        const head = html.split('</head>')[0];
        const title = (head.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
        const desc = attr((head.match(/<meta name="description"[^>]*>/) || [''])[0], 'content') || '';
        check('title and description set, no stale phrases', title.length >= 30 && title.length <= 65 && desc.length >= 70 && desc.length <= 160 && !BANNED.test(title + desc), `${title.length} / ${desc.length} chars`);
        check('canonical is the apex', /<link rel="canonical" href="https:\/\/fincalix\.com\/">/.test(head));
        check('viewport allows zoom', /name="viewport"/.test(head) && !/maximum-scale|user-scalable/i.test(head));
        check('Open Graph and Twitter cards point at the 1200×630 image', /property="og:image" content="https:\/\/fincalix\.com\/og\/fincalix-og\.png"/.test(head) && /og:image:width" content="1200"/.test(head) && /twitter:card" content="summary_large_image"/.test(head));
        const ldRaw = (head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
        let ld = null; try { ld = JSON.parse(ldRaw); } catch { /* reported below */ }
        const node = (t) => ld?.['@graph']?.find((n) => n['@type'] === t);
        const org = node('Organization'), site = node('WebSite'), app = node('SoftwareApplication'), faq = node('FAQPage');
        check('structured data parses: Organization, WebSite, SoftwareApplication, FAQPage', !!(org && site && app && faq));
        check('Organization: no address, logo is a real PNG', org && !('address' in org) && !/hyderabad|guntur/i.test(JSON.stringify(org)) && /\.png$/.test(org.logo?.url || ''));
        check('WebSite SearchAction uses the working ?q= search', site?.potentialAction?.target?.urlTemplate === 'https://fincalix.com/?q={search_term_string}');
        check('SoftwareApplication: Android, FinanceApplication, price 0, real screenshots', app?.operatingSystem === 'Android' && app?.applicationCategory === 'FinanceApplication' && app?.offers?.price === '0'
            && Array.isArray(app?.screenshot) && app.screenshot.length >= 2 && app.screenshot.every((u) => /\/site\/en-[a-z-]+-light-560-[\w-]+\.webp$/.test(u)));
        check('FAQPage = the FAQ shown on the page', faq && faq.mainEntity.length === questions.length && faq.mainEntity.every((q, i) => q.name === questions[i]));
        check('no banned claim or provider name anywhere in the page', !BANNED.test(body) && !BANNED.test(JSON.stringify(ld || {})), (body.match(BANNED) || [''])[0]);
        check('analytics line present and links to the privacy policy', body.includes(content.ANALYTICS_LINE) && /href="\/privacy-policy"/.test(html));
        const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
        check('every image has alt text and explicit width and height', imgs.length > 0 && imgs.every((t) => attr(t, 'alt') !== undefined && attr(t, 'width') && attr(t, 'height')), `${imgs.length} images`);
        check('below-the-fold screenshots are lazy-loaded', imgs.filter((t) => /\/site\/en-(foreclosure|expenses|cc-|goal|export|reminders)|home-mini/.test(t)).every((t) => attr(t, 'loading') === 'lazy'));

        // ── 2. Links ────────────────────────────────────────────────────────
        console.log('\n2. Every link on the page');
        const hrefs = [...new Set([...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((m) => m[1]))];
        const routes = appRoutes();
        const isStatic = (p) => seo.STATIC_PAGES.includes(p.slice(1));
        const bad = [];
        for (const h of hrefs) {
            if (h.startsWith('#')) { if (!html.includes(`id="${h.slice(1)}"`)) bad.push(`${h}: no such section`); continue; }
            if (h.startsWith('mailto:')) { if (h !== `mailto:${content.SUPPORT_EMAIL}`) bad.push(h); continue; }
            if (/^https?:/.test(h)) { if (h !== content.PLAY_URL) bad.push(`${h}: unexpected external link`); continue; }
            const r = await fetch(base + h, { redirect: 'manual' });
            if (r.status !== 200) { bad.push(`${h}: ${r.status}`); continue; }
            if (h !== '/' && h !== '/app' && !isStatic(h) && !routes.some((re) => re.test(h))) bad.push(`${h}: not an app route`);
        }
        check(`all ${hrefs.length} links resolve (app links are real app routes)`, bad.length === 0, bad.slice(0, 5).join(' | '));
        const playLinks = [...html.matchAll(/<a\b[^>]*data-cta="play_badge"[^>]*>/g)].map((m) => m[0]);
        check('Google Play links open the official listing in a new tab', playLinks.length >= 3 && playLinks.every((t) => attr(t, 'href') === content.PLAY_URL && attr(t, 'target') === '_blank' && /noopener/.test(attr(t, 'rel') || '')));

        // ── 3. Routing and headers ──────────────────────────────────────────
        console.log('\n3. Routing and headers (vercel.json)');
        const hdr = async (p) => { const r = await fetch(base + p, { redirect: 'manual' }); return { status: r.status, link: r.headers.get('link'), robots: r.headers.get('x-robots-tag'), r, body: await r.text() }; };
        const root = await hdr('/');
        check('"/" is indexable (no noindex header)', !root.robots);
        const appPage = await hdr('/app');
        check('/app serves the app shell, noindex', appPage.status === 200 && appPage.body.includes('<div id="root">') && appPage.robots === 'noindex');
        const canonBad = [];
        for (const [appPath, page] of Object.entries(seo.APP_CANONICAL)) {
            const h = await hdr(appPath);
            if (h.status !== 200 || h.link !== `<https://fincalix.com${page}>; rel="canonical"` || h.robots) canonBad.push(`${appPath}: ${h.status} ${h.link} ${h.robots || ''}`);
        }
        check(`${Object.keys(seo.APP_CANONICAL).length} app routes send a canonical to their static page`, canonBad.length === 0, canonBad.slice(0, 3).join(' | '));
        const staticBad = [];
        for (const s of seo.STATIC_PAGES) {
            const h = await hdr('/' + s);
            if (h.status !== 200 || h.robots || !h.body.includes(`<link rel="canonical" href="https://fincalix.com/${s}"`)) staticBad.push(s);
        }
        check(`${seo.STATIC_PAGES.length} static pages: 200, indexable, own canonical`, staticBad.length === 0, staticBad.join(', '));
        const legalBad = [];
        for (const p of seo.INDEXED_APP_PAGES) { const h = await hdr(p); if (h.status !== 200 || h.robots || h.link !== `<https://fincalix.com${p}>; rel="canonical"`) legalBad.push(p); }
        check('legal pages: indexable with their own canonical', legalBad.length === 0, legalBad.join(', '));
        const noindexBad = [];
        for (const p of ['/calculator/age', '/calculators', '/schemes', '/scheme/c-ssy', '/settings', '/my-loans', '/goal-planner', '/app.html']) { const h = await hdr(p); if (h.status !== 200 || h.robots !== 'noindex') noindexBad.push(`${p}: ${h.status} ${h.robots}`); }
        check('other app routes: noindex', noindexBad.length === 0, noindexBad.join(' | '));
        const cfg = await hdr('/config.json');
        check('/config.json unchanged: 200, CORS *, max-age=300', cfg.status === 200 && cfg.r.headers.get('access-control-allow-origin') === '*' && cfg.r.headers.get('cache-control') === 'public, max-age=300, must-revalidate' && !cfg.robots);
        const man = JSON.parse((await hdr('/manifest.json')).body);
        check('installed web app opens /app (manifest start_url)', man.start_url === '/app');
        const sw = (await hdr('/sw.js')).body;
        check('service worker cache bumped and app shell cached', /fincalix-v90/.test(sw) && /'\/app\.html'/.test(sw));
        let synced = true; try { execFileSync(process.execPath, ['scripts/landing/sync-vercel-headers.mjs', '--check'], { stdio: 'pipe' }); } catch { synced = false; }
        check('vercel.json headers match src/landing/seoRoutes.ts', synced);

        // ── 4. In the browser ───────────────────────────────────────────────
        console.log('\n4. In Chrome');
        const browser = await chromium.launch({ channel: 'chrome' });
        try {
            const profile = async (opts = {}, storage = {}) => {
                const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light', ...opts });
                await ctx.addInitScript((s) => { try { localStorage.setItem('fincalix_analytics_test_traffic', '1'); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } catch { /* */ } }, storage);
                const page = await ctx.newPage();
                const errors = [], hits = [], analyticsReqs = [];
                page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
                page.on('pageerror', (e) => errors.push(e.message));
                page.on('requestfailed', (r) => { if (new URL(r.url()).origin === base) errors.push(`failed ${r.url()}`); });
                page.on('response', (r) => { if (new URL(r.url()).origin === base && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
                page.on('request', (r) => {
                    const host = new URL(r.url()).hostname;
                    if (ANALYTICS_HOSTS.test(host)) analyticsReqs.push(host);
                    if (COLLECT_HOSTS.test(host) && /\/collect/.test(r.url())) hits.push(...decode(r));
                });
                return { ctx, page, errors, hits, analyticsReqs };
            };
            const noNav = (page) => page.evaluate(() => window.addEventListener('click', (e) => { if (e.target.closest('a')) e.preventDefault(); }, true));

            // 4a. Desktop: errors, calculator parity, analytics
            {
                const { ctx, page, errors, hits } = await profile();
                await page.goto(base + '/', { waitUntil: 'networkidle' });
                await noNav(page);
                const amount = page.locator('#calc-panel input:not([type=range])').nth(0);
                await amount.fill('4500000'); await amount.press('Tab');
                const rate = page.locator('#calc-panel input:not([type=range])').nth(1);
                await rate.fill('9.25'); await rate.press('Tab');
                const want = calc.formatINR(calc.calculateReducingEMI(4500000, 9.25, 240).emi);
                await page.waitForTimeout(400);
                const [heroFig, calcFig] = [await page.locator('.hero-figure').innerText(), await page.locator('.calc-out .big').innerText()];
                check('EMI: calculator and hero card = calculateReducingEMI()', heroFig === want && calcFig === want, `${calcFig} / ${heroFig} vs ${want}`);
                await page.getByRole('tab', { name: 'SIP' }).click();
                const sipWant = calc.formatINR(calc.calculateSIP(5000, 12, 10).futureValue);
                await page.waitForTimeout(300);
                check('SIP: result = calculateSIP()', (await page.locator('.calc-out .big').innerText()) === sipWant, sipWant);
                await page.getByRole('tab', { name: 'Income tax' }).click();
                const t = tax.compareSalaryTax(1450000, 375000);
                await page.waitForTimeout(300);
                const rows = await page.locator('.calc-out .row dd').allInnerTexts();
                check('Income tax: New and Old Regime = compareSalaryTax()', rows[0] === calc.formatINR(Math.round(t.newTax.totalTax)) && rows[1] === calc.formatINR(Math.round(t.oldTax.totalTax)), rows.slice(0, 2).join(' / '));
                await page.keyboard.press('ArrowLeft');
                check('tabs work from the keyboard (arrow keys)', (await page.getByRole('tab', { selected: true }).innerText()) === 'SIP');
                await page.locator('.hero [data-cta="open_app"]').click();
                await page.locator('.hero [data-cta="play_badge"]').click();
                await page.waitForTimeout(9000);
                await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
                await page.waitForTimeout(1500);
                const names = hits.map((h) => h.en);
                check('analytics: one page_view "Website"', hits.filter((h) => h.en === 'page_view').length === 1 && hits.find((h) => h.en === 'page_view')?.dt === 'Website', names.join(','));
                check('analytics: open_app and play_badge with cta_location=hero', hits.some((h) => h.en === 'open_app' && h.ep.cta_location === 'hero') && hits.some((h) => h.en === 'play_badge' && h.ep.cta_location === 'hero'));
                const allowed = new Set(['page_view', 'open_app', 'play_badge', 'first_visit', 'session_start', 'user_engagement']);
                const odd = hits.filter((h) => !allowed.has(h.en) || Object.keys(h.ep).some((k) => !['cta_location', 'origin', 'debug_mode', 'traffic_type'].includes(k)) || h.tt !== 'internal');
                check('analytics: only allowed events and parameters, all flagged as test traffic', hits.length > 0 && odd.length === 0, odd.slice(0, 3).map((h) => h.en + JSON.stringify(h.ep)).join(' '));
                check('no console error, failed or broken request', errors.length === 0, errors.slice(0, 3).join(' | '));
                await ctx.close();
            }
            // 4b. Analytics switched off in the app's Settings: nothing at all
            {
                const { ctx, page, analyticsReqs } = await profile({}, { fincalix_analytics_consent: 'denied' });
                await page.goto(base + '/', { waitUntil: 'networkidle' });
                await noNav(page);
                await page.locator('.hero [data-cta="open_app"]').click();
                await page.waitForTimeout(7000);
                const queue = await page.evaluate(() => localStorage.getItem('fincalix_analytics_queue'));
                check('switched off: no request to analytics hosts and nothing queued', analyticsReqs.length === 0 && !queue, analyticsReqs.join(','));
                await ctx.close();
            }
            // 4c. Device-aware calls to action, layout shift
            const cls = (page) => page.evaluate(() => new Promise((r) => { let v = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; }).observe({ type: 'layout-shift', buffered: true }); setTimeout(() => r(v), 2500); }));
            for (const [label, opts, androidExpected] of [
                ['desktop', {}, false],
                ['Android phone', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' }, true],
                ['iPhone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }, false],
            ]) {
                const { ctx, page } = await profile(opts, { fincalix_analytics_consent: 'denied' });
                await page.goto(base + '/', { waitUntil: 'load' });
                const order = await page.evaluate(() => {
                    const g = document.querySelector('.hero .cta-group');
                    const web = g.querySelector('.cta-web').getBoundingClientRect(), play = g.querySelector('.play').getBoundingClientRect();
                    const label = [...g.querySelectorAll('.cta-web span')].find((s) => getComputedStyle(s).display !== 'none' && s.textContent.trim().length > 1)?.textContent;
                    // Same row when the vertical centres are close (the badge is 4 px taller than the button).
                    const cy = (r) => r.top + r.height / 2;
                    const sameRow = Math.abs(cy(play) - cy(web)) < 20;
                    return { playFirst: sameRow ? play.left < web.left : play.top < web.top, label };
                });
                const ok = androidExpected ? order.playFirst && order.label === 'Use in browser' : !order.playFirst && order.label === 'Open FinCalix';
                check(`${label}: ${androidExpected ? 'Google Play first, then "Use in browser"' : '"Open FinCalix" first, then Google Play'}`, ok, JSON.stringify(order));
                const shift = await cls(page);
                check(`${label}: layout shift < 0.05`, shift < 0.05, shift.toFixed(4));
                await ctx.close();
            }
            // 4d. 360 px wide, both themes
            for (const scheme of ['light', 'dark']) {
                const { ctx, page } = await profile({ viewport: { width: 360, height: 760 }, colorScheme: scheme, isMobile: true, hasTouch: true }, { fincalix_analytics_consent: 'denied' });
                await page.goto(base + '/', { waitUntil: 'load' });
                const r = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
                check(`360 px, device ${scheme}: theme follows the device, no horizontal scroll`, r.theme === scheme && r.sw <= r.cw, JSON.stringify(r));
                await ctx.close();
            }
            // 4e. Theme toggle, language for the app, keyboard, ?q=
            {
                const { ctx, page } = await profile({}, { fincalix_analytics_consent: 'denied' });
                await page.goto(base + '/', { waitUntil: 'networkidle' });
                await page.getByRole('button', { name: 'Dark theme' }).click();
                await page.reload({ waitUntil: 'load' });
                check('theme toggle switches to dark and is remembered', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
                await page.selectOption('.lang select', 'te');
                const st = await page.evaluate(() => ({ lang: localStorage.getItem('language'), settings: JSON.parse(localStorage.getItem('settings-storage') || '{}')?.state?.language }));
                check('language switch sets the app language (both keys the app reads)', st.lang === 'te' && st.settings === 'te', JSON.stringify(st));
                await page.goto(base + '/app', { waitUntil: 'networkidle' });
                await page.waitForTimeout(2500);
                check('…and /app then opens in Telugu', /[ఀ-౿]/.test(await page.locator('nav').last().innerText().catch(() => '')));
                await page.goto(base + '/', { waitUntil: 'load' });
                await page.keyboard.press('Tab');
                const first = await page.evaluate(() => ({ text: document.activeElement?.textContent, outline: getComputedStyle(document.activeElement).outlineStyle }));
                check('keyboard: first Tab reaches "Skip to content" with a visible focus ring', first.text === 'Skip to content' && first.outline !== 'none', JSON.stringify(first));
                await page.goto(base + '/?q=ppf', { waitUntil: 'networkidle' });
                await page.waitForTimeout(500);
                const names = await page.locator('#tools .tool-name').allInnerTexts();
                check('/?q=ppf filters the tool grid (SearchAction target works)', names.length > 0 && names.length < 10 && names.some((n) => /PPF/.test(n)), names.join(', '));
                await ctx.close();
            }
        } finally {
            await browser.close();
        }
    } finally {
        await server.stop();
    }
    console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
