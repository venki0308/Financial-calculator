// QA audit: fincalix.com (marketing site, Google Play installs only) and the web-app lock.
//
//   npm run build:web
//   node scripts/qa-landing.mjs
//
// Serves dist/ like Vercel (scripts/landing/serve-dist.mjs), evaluating vercel.json for
// the production host (fincalix.com), www, the public bay.vercel.app alias and the dev host.
// 1. "/" without JavaScript: hero, every registered tool, FAQ in the HTML; head, canonical,
//    structured data; only Google Play badges (4 placements, referrer each); no app links,
//    no manifest, no service worker; no banned claim; images sized and described.
// 2. Every link on "/" resolves on production.
// 3. Production lock: every app route 308s to its static page or "/"; the app shell is
//    never served; legal pages are static HTML; sitemap = landing + 27 static + 5 legal;
//    config.json unchanged; www and the public alias behave like production.
// 4. Dev host: the full app works, X-Robots-Tag: noindex.
// 5. In Chrome (production rules): no console error; no app bundle or app shell requested
//    on the website, static or legal pages; legal text identical to what the app showed;
//    calculator = the app's functions; analytics (play_badge_click, test traffic); nothing
//    when analytics are off; no overflow at any width 360–1920; both hero phones inside the
//    viewport; layout shift; theme; keyboard; ?q=; the service-worker kill switch.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { buildSync } from 'esbuild';
import { chromium } from 'playwright-core';
import { serveDist } from './landing/serve-dist.mjs';
import { runDevModeProof } from './landing/dev-mode-proof.mjs';

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
const play = await load('src/landing/play.ts');
const reg = await load('src/data/calculatorList.ts');

const PROD = 'fincalix.com';
const PLACEMENTS = ['header', 'hero', 'mini_calc', 'final_cta'];
const BANNED = /#1\b|\bbest\b|guarantee|zero data collection|no tracking|100% offline|google analytics|firebase|google llc|hyderabad|guntur|rates updated jul 2026|ai financial advisor|open app|open fincalix|use in browser/i;
const ANALYTICS_HOSTS = /(^|\.)(google-analytics\.com|analytics\.google\.com|googletagmanager\.com|firebase\.googleapis\.com|firebaseinstallations\.googleapis\.com|app-measurement\.com)$/;
const COLLECT_HOSTS = /(^|\.)(google-analytics\.com|analytics\.google\.com|app-measurement\.com)$/;

const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];
const norm = (s) => s.replace(/\s+/g, ' ').trim();

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
    const prod = await serveDist({ port: 4323, asHost: PROD });
    const dev = await serveDist({ port: 4324, forceDev: true });   // as a browser with the dev cookie
    const www = await serveDist({ port: 4325, asHost: 'www.fincalix.com' });
    const bay = await serveDist({ port: 4326, asHost: 'financial-calculator-bay.vercel.app' });
    const get = async (base, p, cookie) => { const r = await fetch(base + p, { redirect: 'manual', headers: cookie ? { cookie } : {} }); return { status: r.status, loc: r.headers.get('location'), robots: r.headers.get('x-robots-tag'), cache: r.headers.get('cache-control') || '', setCookie: r.headers.get('set-cookie') || '', r, body: await r.text() }; };
    try {
        // ── 1. "/" without JavaScript ───────────────────────────────────────
        console.log('\n1. "/" without JavaScript (production)');
        const res = await fetch(prod.base + '/');
        const html = await res.text();
        check('"/" answers 200 with HTML, indexable', res.status === 200 && /text\/html/.test(res.headers.get('content-type') || '') && !res.headers.get('x-robots-tag'));
        const body = text(html.split(/<body[^>]*>/)[1] || '');
        check('hero headline and promise are in the HTML', body.includes('Every money decision, worked out in seconds.') && body.includes('Your financial data stays on your device'));
        check('the hero figure is pre-rendered (live mini-calculator result)', /Monthly EMI ₹26,035/.test(body), (body.match(/Monthly EMI ₹[\d,]+/) || [''])[0]);
        const props = JSON.parse((html.match(/<script id="landing-props" type="application\/json">([\s\S]*?)<\/script>/) || [])[1] || '{"tools":[]}');
        const regCount = reg.allCalcs.length + reg.appTools.length;
        check('every registered tool is listed (registry = page)', props.tools.length === regCount && props.tools.every((t) => body.includes(t.name)), `${props.tools.length} on page, ${regCount} in registry`);
        const questions = [...html.matchAll(/<summary><span>([\s\S]*?)<\/span><\/summary>/g)].map((m) => text(m[1]));
        check('FAQ questions and answers are in the HTML (8–10)', questions.length >= 8 && questions.length <= 10 && questions.every((q) => body.includes(q)), `${questions.length} questions`);
        check('tax spotlight figures come from the tax engine', body.includes(calc.formatINR(tax.NEW_REGIME_REBATE_LIMIT)) && body.includes(calc.formatINR(tax.NEW_REGIME_STANDARD_DEDUCTION))
            && body.includes(calc.formatINR(Math.round(tax.compareSalaryTax(tax.NEW_REGIME_REBATE_LIMIT + tax.NEW_REGIME_STANDARD_DEDUCTION, 0).oldTax.totalTax))));
        const badges = [...html.matchAll(/<a\b[^>]*data-play="([^"]+)"[^>]*>/g)].map((m) => ({ placement: m[1], tag: m[0] }));
        const badgePlacements = badges.map((b) => b.placement);
        check('Google Play badge in exactly the 4 placements', JSON.stringify([...new Set(badgePlacements)].sort()) === JSON.stringify([...PLACEMENTS].sort()) && badges.length === 5, badgePlacements.join(', '));
        check('every Play link carries its own install referrer (utm_content = placement)', badges.every((b) => attr(b.tag, 'href').replace(/&amp;/g, '&') === play.playUrl(b.placement) && attr(b.tag, 'target') === '_blank'));
        const imgBadges = [...html.matchAll(/<a\b[^>]*data-play="(header|hero|final_cta|mini_calc)"[^>]*>\s*<img\b[^>]*>/g)].length;
        check('badges use the official artwork (unaltered PNG, alt "Get it on Google Play")', imgBadges === 4 && [...html.matchAll(/<img\b[^>]*google-play-badge-en-[^"]*\.png"[^>]*>/g)].every((m) => attr(m[0], 'alt') === 'Get it on Google Play'));
        check('no "Open app" / "Open FinCalix" / "Use in browser" anywhere', !/open app|open fincalix|use in browser/i.test(body));
        const head = html.split('</head>')[0];
        check('no manifest link and no service-worker registration on the website', !/rel="manifest"/.test(html) && !/serviceWorker\.register/.test(html));
        const title = (head.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
        const desc = attr((head.match(/<meta name="description"[^>]*>/) || [''])[0], 'content') || '';
        check('title and description set, no stale phrases', title.length >= 30 && title.length <= 65 && desc.length >= 70 && desc.length <= 160 && !BANNED.test(title + desc), `${title.length} / ${desc.length} chars`);
        check('canonical is the apex', /<link rel="canonical" href="https:\/\/fincalix\.com\/">/.test(head));
        check('viewport allows zoom', /name="viewport"/.test(head) && !/maximum-scale|user-scalable/i.test(head));
        check('Open Graph and Twitter cards point at the 1200×630 image', /property="og:image" content="https:\/\/fincalix\.com\/og\/fincalix-og\.png"/.test(head) && /og:image:width" content="1200"/.test(head) && /twitter:card" content="summary_large_image"/.test(head));
        let ld = null; try { ld = JSON.parse((head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1]); } catch { /* below */ }
        const node = (t) => ld?.['@graph']?.find((n) => n['@type'] === t);
        const org = node('Organization'), site = node('WebSite'), app = node('SoftwareApplication'), faq = node('FAQPage');
        check('structured data parses: Organization, WebSite, SoftwareApplication, FAQPage', !!(org && site && app && faq));
        check('Organization: no address, logo is a real PNG', org && !('address' in org) && /\.png$/.test(org.logo?.url || ''));
        check('WebSite SearchAction uses the working ?q= search', site?.potentialAction?.target?.urlTemplate === 'https://fincalix.com/?q={search_term_string}');
        check('SoftwareApplication: Android, FinanceApplication, price 0, real screenshots', app?.operatingSystem === 'Android' && app?.applicationCategory === 'FinanceApplication' && app?.offers?.price === '0'
            && Array.isArray(app?.screenshot) && app.screenshot.length >= 2 && app.screenshot.every((u) => /\/site\/en-[a-z-]+-light-560-[\w-]+\.webp$/.test(u)));
        check('FAQPage = the FAQ shown on the page', faq && faq.mainEntity.length === questions.length && faq.mainEntity.every((q, i) => q.name === questions[i]));
        check('no banned claim or provider name anywhere in the page', !BANNED.test(body) && !BANNED.test(JSON.stringify(ld || {})), (body.match(BANNED) || [''])[0]);
        check('analytics line present and links to the privacy policy', body.includes(content.ANALYTICS_LINE) && /href="\/privacy-policy"/.test(html));
        const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
        check('every image has alt text and explicit width and height', imgs.length > 0 && imgs.every((t) => attr(t, 'alt') !== undefined && attr(t, 'width') && attr(t, 'height')), `${imgs.length} images`);

        // ── 2. Links on "/" ─────────────────────────────────────────────────
        console.log('\n2. Every link on "/" (production)');
        const hrefs = [...new Set([...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')))];
        const okPage = (p) => p === '/' || seo.STATIC_PAGES.includes(p.slice(1)) || seo.LEGAL_PAGES.includes(p.slice(1));
        const bad = [];
        for (const h of hrefs) {
            if (h.startsWith('#')) { if (!html.includes(`id="${h.slice(1)}"`)) bad.push(`${h}: no such section`); continue; }
            if (h.startsWith('mailto:')) { if (h !== `mailto:${content.SUPPORT_EMAIL}`) bad.push(h); continue; }
            if (/^https?:/.test(h)) { if (!PLACEMENTS.some((p) => h === play.playUrl(p))) bad.push(`${h}: unexpected external link`); continue; }
            if (!okPage(h)) { bad.push(`${h}: not a website page (app link?)`); continue; }
            const r = await get(prod.base, h);
            if (r.status !== 200) bad.push(`${h}: ${r.status}`);
        }
        check(`all ${hrefs.length} links resolve, none points into the app`, bad.length === 0, bad.slice(0, 5).join(' | '));

        // ── 3. Production lock ──────────────────────────────────────────────
        console.log('\n3. Production lock (fincalix.com)');
        const redirBad = [];
        for (const [appPath, page] of Object.entries(seo.APP_CANONICAL)) {
            const r = await get(prod.base, appPath);
            if (r.status !== 308 || r.loc !== page || !/no-store/.test(r.cache)) redirBad.push(`${appPath}: ${r.status} ${r.loc} ${r.cache}`);
        }
        for (const [alias, target] of Object.entries(seo.APP_ALIASES)) {
            const want = seo.APP_CANONICAL[target];
            if (!want) continue;
            const r = await get(prod.base, alias);
            if (r.status !== 308 || r.loc !== want) redirBad.push(`alias ${alias}: ${r.status} ${r.loc}`);
        }
        check(`${Object.keys(seo.APP_CANONICAL).length} app routes and the old alias URLs 308 to their static page (not cached, so dev mode can follow later)`, redirBad.length === 0, redirBad.slice(0, 3).join(' | '));
        const appJs = fs.readdirSync('dist/assets').find((f) => /^index-.*\.js$/.test(f));
        const lockBad = [];
        for (const p of ['/app', '/app/', '/app.html', '/calculators', '/calculator/age', '/calculator/credit-card-payoff', '/schemes', '/scheme/c-ssy', '/my-loans', '/my-loans/abc', '/settings', '/goal-planner', '/expenses/credit-cards', '/no-such-page', `/assets/${appJs}`]) {
            const r = await get(prod.base, p);
            if (r.status !== 308 || r.loc !== '/') lockBad.push(`${p}: ${r.status} ${r.loc}`);
        }
        check('every other app route (incl. /app, /app.html, app JS) 308s to "/"', lockBad.length === 0, lockBad.slice(0, 4).join(' | '));
        const staticBad = [];
        for (const s of seo.STATIC_PAGES) { const r = await get(prod.base, '/' + s); if (r.status !== 200 || r.robots || !r.body.includes(`<link rel="canonical" href="https://fincalix.com/${s}"`)) staticBad.push(s); }
        check(`${seo.STATIC_PAGES.length} static pages: 200, indexable, own canonical`, staticBad.length === 0, staticBad.join(', '));
        const legalBad = [];
        for (const p of seo.LEGAL_PAGES) {
            const r = await get(prod.base, '/' + p);
            const isShell = r.body.includes('<div id="root"></div>') || /\/assets\//.test(r.body);
            if (r.status !== 200 || r.robots || isShell || !r.body.includes(`data-page="${p}"`) || !r.body.includes(`<link rel="canonical" href="https://fincalix.com/${p}">`) || !/<h1[^>]*>[^<]+/.test(r.body)) legalBad.push(`${p}: ${r.status}${isShell ? ' app shell' : ''}`);
        }
        check('5 legal pages: static pre-rendered HTML, no app shell or app assets, own canonical', legalBad.length === 0, legalBad.join(' | '));
        const files = { '/config.json': 'application/json', '/sitemap.xml': 'xml', '/robots.txt': 'text/plain', '/sw.js': 'javascript', '/og/fincalix-og.png': 'image/png', '/brand/fincalix-icon-512.png': 'image/png', '/manifest.json': 'json' };
        const fileBad = [];
        for (const [p, type] of Object.entries(files)) { const r = await get(prod.base, p); if (r.status !== 200 || !(r.r.headers.get('content-type') || '').includes(type)) fileBad.push(`${p}: ${r.status}`); }
        check('files stay reachable: config.json, sitemap, robots, sw.js, og and brand images, manifest', fileBad.length === 0, fileBad.join(' | '));
        const cfg = await get(prod.base, '/config.json');
        check('/config.json unchanged: CORS *, max-age=300', cfg.r.headers.get('access-control-allow-origin') === '*' && cfg.r.headers.get('cache-control') === 'public, max-age=300, must-revalidate');
        check('manifest start_url reverted to "/"', JSON.parse((await get(prod.base, '/manifest.json')).body).start_url === '/');
        const locs = [...(await get(prod.base, '/sitemap.xml')).body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
        const wantLocs = ['https://fincalix.com/', ...seo.STATIC_PAGES.map((s) => `https://fincalix.com/${s}`), ...seo.LEGAL_PAGES.map((s) => `https://fincalix.com/${s}`)].sort();
        check('sitemap = landing + 27 static pages + 5 legal pages', JSON.stringify([...locs].sort()) === JSON.stringify(wantLocs), `${locs.length} URLs`);
        const w1 = await get(www.base, '/calculator/sip'), w2 = await get(www.base, '/config.json');
        check('www: redirects to the apex (which then locks), config.json still served', w1.status === 308 && w1.loc === 'https://fincalix.com/calculator/sip' && w2.status === 200);
        const b1 = await get(bay.base, '/app'), b2 = await get(bay.base, '/calculator/sip');
        check('any other host (e.g. the public bay.vercel.app alias) is locked the same way', b1.status === 308 && b1.loc === '/' && b2.status === 308 && b2.loc === '/sip');
        let synced = true; try { execFileSync(process.execPath, ['scripts/landing/sync-vercel-headers.mjs', '--check'], { stdio: 'pipe' }); } catch { synced = false; }
        check('vercel.json matches src/landing/seoRoutes.ts', synced);

        // ── 4. Dev mode (cookie) ────────────────────────────────────────────
        console.log('\n4. Dev mode (?dev=true cookie, middleware.ts)');
        const DEVC = `${seo.DEV_COOKIE}=1`;
        const on = await get(prod.base, '/calculator/sip?dev=true');
        check('?dev=true: 307 to the same URL without the parameter, sets the cookie (Secure, SameSite=Lax, 30 days)',
            on.status === 307 && on.loc === '/calculator/sip' && /^fincalix_dev=1; Path=\/; Max-Age=2592000; Secure; SameSite=Lax$/.test(on.setCookie), `${on.status} ${on.loc} ${on.setCookie}`);
        const off = await get(prod.base, '/calculator/sip?dev=false', DEVC);
        check('?dev=false: 307 to "/" and clears the cookie', off.status === 307 && off.loc === '/' && /^fincalix_dev=; Path=\/; Max-Age=0/.test(off.setCookie), `${off.status} ${off.loc} ${off.setCookie}`);
        const d1 = await get(prod.base, '/', DEVC), d2 = await get(prod.base, '/calculator/sip', DEVC), d3 = await get(prod.base, '/sip', DEVC), d4 = await get(prod.base, `/assets/${appJs}`, DEVC), d5 = await get(prod.base, '/app.html', DEVC);
        check('with the cookie: "/" and /calculator/sip serve the app, the app\'s files load', d1.status === 200 && d1.body.includes('<div id="root">') && d2.status === 200 && d2.body.includes('<div id="root">') && d4.status === 200 && d5.status === 200);
        check('with the cookie: every response is noindex (app, static pages, files)', [d1, d2, d3, d4].every((x) => x.robots === 'noindex'));
        const devRef = /[?&]dev=/;
        check('the website, sitemap and structured data never mention ?dev', !devRef.test(html) && !devRef.test((await get(prod.base, '/sitemap.xml')).body) && !devRef.test(JSON.stringify(ld || {})));
        await runDevModeProof({ base: prod.local, shotsDir: 'marketing-assets/website-preview/dev-mode', check });

        // ── 5. In Chrome ────────────────────────────────────────────────────
        console.log('\n5. In Chrome (production rules unless stated)');
        const browser = await chromium.launch({ channel: 'chrome' });
        try {
            const profile = async (base, opts = {}, storage = {}) => {
                const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light', ...opts });
                await ctx.addInitScript((s) => { try { localStorage.setItem('fincalix_analytics_test_traffic', '1'); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } catch { /* */ } }, storage);
                const page = await ctx.newPage();
                const errors = [], hits = [], analyticsReqs = [], appRequests = [];
                page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
                page.on('pageerror', (e) => errors.push(e.message));
                page.on('requestfailed', (r) => { if (new URL(r.url()).origin === base) errors.push(`failed ${r.url()}`); });
                page.on('response', (r) => { if (new URL(r.url()).origin === base && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
                page.on('request', (r) => {
                    const u = new URL(r.url());
                    if (ANALYTICS_HOSTS.test(u.hostname)) analyticsReqs.push(u.hostname);
                    if (COLLECT_HOSTS.test(u.hostname) && /\/collect/.test(r.url())) hits.push(...decode(r));
                    if (u.origin === base && (/^\/assets\//.test(u.pathname) || u.pathname === '/app.html')) appRequests.push(u.pathname);
                });
                return { ctx, page, errors, hits, analyticsReqs, appRequests };
            };
            const noNav = (page) => page.evaluate(() => window.addEventListener('click', (e) => { if (e.target.closest('a')) e.preventDefault(); }, true));

            // 5a. Website: no app bundle, calculator parity, analytics
            {
                const { ctx, page, errors, hits, appRequests } = await profile(prod.base);
                await page.goto(prod.base + '/', { waitUntil: 'networkidle' });
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
                await page.waitForTimeout(300);
                check('SIP: result = calculateSIP()', (await page.locator('.calc-out .big').innerText()) === calc.formatINR(calc.calculateSIP(5000, 12, 10).futureValue));
                await page.getByRole('tab', { name: 'Income tax' }).click();
                const t = tax.compareSalaryTax(1450000, 375000);
                await page.waitForTimeout(300);
                const rows = await page.locator('.calc-out .row dd').allInnerTexts();
                check('Income tax: New and Old Regime = compareSalaryTax()', rows[0] === calc.formatINR(Math.round(t.newTax.totalTax)) && rows[1] === calc.formatINR(Math.round(t.oldTax.totalTax)), rows.slice(0, 2).join(' / '));
                const follow = page.locator('.calc-out a.btn');
                check('calculator follow-up: "Get the full breakdown in the app" → Google Play (mini_calc)', (await follow.innerText()).startsWith('Get the full breakdown in the app') && (await follow.getAttribute('href')) === play.playUrl('mini_calc'));
                await page.keyboard.press('ArrowLeft');
                check('tabs work from the keyboard (arrow keys)', (await page.getByRole('tab', { selected: true }).innerText()) === 'SIP');
                await page.locator('.hero [data-play="hero"]').click();
                await page.waitForTimeout(9000);
                const allowed = new Set(['page_view', 'play_badge_click', 'first_visit', 'session_start', 'user_engagement']);
                check('analytics: one page_view "Website"', hits.filter((h) => h.en === 'page_view').length === 1 && hits.find((h) => h.en === 'page_view')?.dt === 'Website', hits.map((h) => h.en).join(','));
                check('analytics: play_badge_click with placement=hero', hits.some((h) => h.en === 'play_badge_click' && h.ep.placement === 'hero'));
                const odd = hits.filter((h) => !allowed.has(h.en) || Object.keys(h.ep).some((k) => !['placement', 'origin', 'debug_mode', 'traffic_type'].includes(k)) || h.tt !== 'internal');
                check('analytics: only allowed events and parameters, all test traffic', hits.length > 0 && odd.length === 0, odd.slice(0, 3).map((h) => h.en + JSON.stringify(h.ep)).join(' '));
                const sw = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
                check('website: no app bundle or app shell requested, no service worker', appRequests.length === 0 && sw === 0, appRequests.slice(0, 3).join(', '));
                check('website: no console error, failed or broken request', errors.length === 0, errors.slice(0, 3).join(' | '));
                await ctx.close();
            }
            // 5b. Analytics switched off in the app's Settings: nothing at all
            {
                const { ctx, page, analyticsReqs } = await profile(prod.base, {}, { fincalix_analytics_consent: 'denied' });
                await page.goto(prod.base + '/', { waitUntil: 'networkidle' });
                await noNav(page);
                await page.locator('.hero [data-play="hero"]').click();
                await page.waitForTimeout(7000);
                const queue = await page.evaluate(() => localStorage.getItem('fincalix_analytics_queue'));
                check('switched off: no request to analytics hosts and nothing queued', analyticsReqs.length === 0 && !queue, analyticsReqs.join(','));
                await ctx.close();
            }
            // 5c. Legal pages: static, no app bundle, same text as the app showed (dev mode, in-app routing)
            {
                const ref = await profile(dev.base, {}, { fincalix_analytics_consent: 'denied', fincalix_disclaimer_accepted_v4: 'true' });
                await ref.page.goto(dev.base + '/', { waitUntil: 'networkidle' });
                for (const p of seo.LEGAL_PAGES) {
                    await ref.page.evaluate((path) => { history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, '/' + p);
                    await ref.page.waitForTimeout(1500);
                    const appText = norm(await ref.page.locator('#root').innerText());
                    const { ctx, page, errors, appRequests } = await profile(prod.base, {}, { fincalix_analytics_consent: 'denied' });
                    await page.goto(prod.base + '/' + p, { waitUntil: 'networkidle' });
                    await page.waitForTimeout(500);
                    const staticText = norm(await page.locator('#root').innerText());
                    const raw = norm(text((await get(prod.base, '/' + p)).body.split(/<body[^>]*>/)[1] || ''));
                    const same = staticText === appText;
                    let where = '';
                    if (!same) { let i = 0; while (i < staticText.length && staticText[i] === appText[i]) i++; where = `differs at ${i}: "${staticText.slice(i, i + 40)}" vs "${appText.slice(i, i + 40)}"`; }
                    check(`/${p}: same text as the app showed; in the HTML without JS; no app bundle; no errors`, same && appText.length > 300 && raw.toLowerCase().includes(appText.slice(0, 120).toLowerCase()) && appRequests.length === 0 && errors.length === 0, same ? `${appText.length} chars` : where || errors.slice(0, 2).join(' | '));
                    await ctx.close();
                }
                await ref.ctx.close();
            }
            // 5d. No overflow at any width; both hero phones inside the viewport
            {
                const { ctx, page } = await profile(prod.base, {}, { fincalix_analytics_consent: 'denied' });
                const problems = [];
                for (const width of [360, 375, 390, 412, 480, 600, 768, 820, 900, 1024, 1180, 1280, 1366, 1440, 1536, 1640, 1720, 1920]) {
                    await page.setViewportSize({ width, height: 900 });
                    await page.goto(prod.base + '/', { waitUntil: 'load' });
                    const r = await page.evaluate(() => {
                        const cw = document.documentElement.clientWidth;
                        const out = [];
                        if (document.documentElement.scrollWidth > cw) out.push(`scrollWidth ${document.documentElement.scrollWidth}`);
                        for (const el of document.querySelectorAll('header *, .hero *, .band *, .after-calc *')) {
                            const b = el.getBoundingClientRect();
                            if (!b.width || getComputedStyle(el).visibility === 'hidden') continue;
                            if (b.right > cw + 0.5 || b.left < -0.5) out.push(`${el.tagName.toLowerCase()}.${(el.className && el.className.baseVal === undefined ? el.className : '').toString().split(' ')[0]} ${Math.round(b.left)}..${Math.round(b.right)}`);
                        }
                        return out;
                    });
                    if (r.length) problems.push(`${width}px: ${r.slice(0, 2).join(', ')}`);
                }
                check('no element outside the viewport at any width from 360 to 1920 px (header, hero phones, CTAs)', problems.length === 0, problems.slice(0, 3).join(' | '));
                await ctx.close();
            }
            // 5e. Layout shift; theme follows the device; toggle; keyboard; ?q=
            for (const [label, opts] of [['desktop', {}], ['phone', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 }]]) {
                const { ctx, page } = await profile(prod.base, opts, { fincalix_analytics_consent: 'denied' });
                await page.goto(prod.base + '/', { waitUntil: 'load' });
                const shift = await page.evaluate(() => new Promise((r) => { let v = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; }).observe({ type: 'layout-shift', buffered: true }); setTimeout(() => r(v), 2500); }));
                check(`${label}: layout shift < 0.05`, shift < 0.05, shift.toFixed(4));
                await ctx.close();
            }
            for (const scheme of ['light', 'dark']) {
                const { ctx, page } = await profile(prod.base, { viewport: { width: 360, height: 760 }, colorScheme: scheme, isMobile: true, hasTouch: true }, { fincalix_analytics_consent: 'denied' });
                await page.goto(prod.base + '/', { waitUntil: 'load' });
                const r = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
                check(`360 px, device ${scheme}: theme follows the device, no horizontal scroll`, r.theme === scheme && r.sw <= r.cw, JSON.stringify(r));
                await ctx.close();
            }
            {
                const { ctx, page } = await profile(prod.base, {}, { fincalix_analytics_consent: 'denied' });
                await page.goto(prod.base + '/', { waitUntil: 'networkidle' });
                await page.getByRole('button', { name: 'Dark theme' }).click();
                await page.reload({ waitUntil: 'load' });
                check('theme toggle switches to dark and is remembered', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
                await page.keyboard.press('Tab');
                const first = await page.evaluate(() => ({ text: document.activeElement?.textContent, outline: getComputedStyle(document.activeElement).outlineStyle }));
                check('keyboard: first Tab reaches "Skip to content" with a visible focus ring', first.text === 'Skip to content' && first.outline !== 'none', JSON.stringify(first));
                await page.goto(prod.base + '/?q=ppf', { waitUntil: 'networkidle' });
                await page.waitForTimeout(500);
                const names = await page.locator('#tools .tool-name').allInnerTexts();
                check('/?q=ppf filters the tool grid (SearchAction target works)', names.length > 0 && names.length < 10 && names.some((n) => /PPF/.test(n)), names.join(', '));
                await ctx.close();
            }
        } finally {
            await browser.close();
        }

        // 5f. Service-worker kill switch: an install of the previous web app on a production host
        {
            const port = 4327;
            const killServer = await serveDist({ port, asHost: PROD });
            const oldSw = execFileSync('git', ['show', 'main:public/sw.js'], { encoding: 'utf8' });
            killServer.overrides['/sw.js'] = oldSw;   // the service worker the published web app installed
            const origin = `http://fincalix.test:${port}`;
            const kb = await chromium.launch({ channel: 'chrome', args: ['--host-resolver-rules=MAP fincalix.test 127.0.0.1', `--unsafely-treat-insecure-origin-as-secure=${origin}`] });
            try {
                const ctx = await kb.newContext();
                const page = await ctx.newPage();
                await page.goto(origin + '/sip', { waitUntil: 'load' });
                await page.evaluate(async () => { await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready; });
                await page.waitForTimeout(1500);
                const before = await page.evaluate(async () => ({ regs: (await navigator.serviceWorker.getRegistrations()).length, caches: (await caches.keys()).length }));
                delete killServer.overrides['/sw.js'];      // this release's sw.js from now on
                await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r?.update(); });
                let after = null;
                for (let i = 0; i < 20; i++) {
                    await page.waitForTimeout(500);
                    after = await page.evaluate(async () => ({ regs: (await navigator.serviceWorker.getRegistrations()).length, caches: (await caches.keys()).length })).catch(() => null);
                    if (after && after.regs === 0 && after.caches === 0) break;
                }
                check('service-worker kill switch: an old web-app install unregisters itself and deletes its caches', before.regs === 1 && before.caches > 0 && after && after.regs === 0 && after.caches === 0, `before ${JSON.stringify(before)}, after ${JSON.stringify(after)}`);
                await ctx.close();
            } finally {
                await kb.close();
                await killServer.stop();
            }
        }
    } finally {
        await Promise.all([prod.stop(), dev.stop(), www.stop(), bay.stop()]);
    }
    console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
