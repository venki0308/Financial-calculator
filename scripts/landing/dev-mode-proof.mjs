// Proof that dev mode works and is invisible to everyone else, step by step, with screenshots.
//
//   node scripts/landing/dev-mode-proof.mjs                 (dist/ served like Vercel, http://localhost)
//   node scripts/landing/dev-mode-proof.mjs <https://preview-url> [outDir]
//       (a deployed preview; set VERCEL_BYPASS to the project's protection-bypass secret
//        if the URL is behind Vercel login — it is sent as a header and never printed)
//
// Steps: a fresh browser gets only the website and redirects → ?dev=true sets the cookie
// and opens the app → a refresh on /calculator/sip stays in the app → the browser's back
// button works → no service worker, noindex on dev responses, analytics = test traffic →
// ?dev=false returns to the public site. Exported as runDevModeProof() for qa-landing.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

export async function runDevModeProof({ base, shotsDir, extraHeaders = {}, check }) {
    fs.mkdirSync(shotsDir, { recursive: true });
    const browser = await chromium.launch({ channel: 'chrome' });
    const hits = [];
    let phase = 'public';
    try {
        const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, extraHTTPHeaders: extraHeaders });
        // The owner has accepted the first-launch disclaimer before; keep the screenshots on the screens.
        await ctx.addInitScript(() => { try { localStorage.setItem('fincalix_disclaimer_accepted_v4', 'true'); } catch { /* */ } });
        const page = await ctx.newPage();
        page.on('request', (r) => {
            const u = new URL(r.url());
            if (!/(^|\.)(google-analytics\.com|analytics\.google\.com)$/.test(u.hostname) || !/\/collect/.test(u.pathname)) return;
            for (const line of [u.search.slice(1), ...(r.postData() || '').split('\n')].filter(Boolean)) {
                const p = new URLSearchParams(line);
                if (p.get('en')) hits.push({ phase, en: p.get('en'), tt: p.get('tt') || u.searchParams.get('tt') || '', dl: p.get('dl') || u.searchParams.get('dl') || '' });
            }
        });
        const shot = (name) => page.screenshot({ path: path.join(shotsDir, `${name}.png`) });
        const pathNow = () => new URL(page.url()).pathname + new URL(page.url()).search;
        const devCookie = async () => (await ctx.cookies()).find((c) => c.name === 'fincalix_dev');
        const isLanding = () => page.locator('h1').first().innerText().then((t) => /Every money decision/.test(t)).catch(() => false);
        // The app shell loads its bundle from /assets/; website pages never do.
        const isApp = () => page.evaluate(() => !!document.querySelector('script[src^="/assets/"]') && !!document.querySelector('#root > *'));
        const heading = async () => (await page.locator('h1').first().innerText().catch(() => '')) || '';

        // 1. Fresh browser: only the website and redirects
        await page.goto(base + '/calculator/sip', { waitUntil: 'networkidle' });
        check('fresh browser: /calculator/sip redirects to the static page /sip', pathNow() === '/sip', pathNow());
        await shot('1-fresh-calculator-sip-goes-to-static-page');
        await page.goto(base + '/app', { waitUntil: 'networkidle' });
        check('fresh browser: /app goes to the website page /in-the-app, not the app', pathNow() === '/in-the-app' && /Android app/.test(await heading()) && !(await isApp()), pathNow());
        await page.goto(base + '/', { waitUntil: 'networkidle' });
        check('fresh browser: "/" is the website, no dev cookie', await isLanding() && !(await devCookie()));
        await shot('2-fresh-home-is-the-website');

        // 2. ?dev=true → cookie, app Home at "/", parameter removed from the address
        phase = 'dev';
        const r1 = await page.goto(base + '/?dev=true', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);
        const c = await devCookie();
        const days = c ? (c.expires - Date.now() / 1000) / 86400 : 0;
        check('?dev=true: cookie fincalix_dev=1, Secure, SameSite=Lax, ~30 days; "?dev" removed from the address',
            !!c && c.value === '1' && c.secure && c.sameSite === 'Lax' && days > 29 && days <= 30.01 && pathNow() === '/',
            c ? `secure=${c.secure} sameSite=${c.sameSite} ${days.toFixed(1)} days, at ${pathNow()}` : 'no cookie');
        check('?dev=true: "/" now shows the app Home (not the website), noindex', await isApp() && !(await isLanding()) && r1?.headers()['x-robots-tag'] === 'noindex');
        await shot('3-dev-true-app-home');

        // 3. Deep link + refresh inside the app
        const r2 = await page.goto(base + '/calculator/sip', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1200);
        const h1 = await heading();
        check('dev mode: /calculator/sip opens the app\'s SIP calculator (deep link), noindex', pathNow() === '/calculator/sip' && /SIP/i.test(h1) && r2?.headers()['x-robots-tag'] === 'noindex', h1);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(1200);
        const afterReload = { path: pathNow(), h1: await heading(), app: await isApp() };
        check('dev mode: refresh on /calculator/sip stays on the SIP calculator', afterReload.path === '/calculator/sip' && /SIP/i.test(afterReload.h1), JSON.stringify(afterReload));
        await shot('4-refresh-on-calculator-sip');

        // 4. Back button inside the app
        await page.locator('nav a[href="/calculators"]').first().click();
        await page.waitForTimeout(1200);
        const atList = pathNow();
        await page.goBack({ waitUntil: 'networkidle' });
        await page.waitForTimeout(1200);
        check('dev mode: back button returns from Calculators to the SIP calculator', atList === '/calculators' && pathNow() === '/calculator/sip' && /SIP/i.test(await heading()), `${atList} → ${pathNow()}`);
        await shot('5-back-button-to-calculator-sip');
        const sw = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
        check('dev mode: the app runs without a service worker', sw === 0, `${sw} registrations`);
        await page.waitForTimeout(4000); // let analytics send what it queued

        // 5. ?dev=false → public again
        phase = 'public';
        await page.goto(base + '/calculator/sip?dev=false', { waitUntil: 'networkidle' });
        check('?dev=false: cookie cleared, back on the website at "/"', !(await devCookie()) && pathNow() === '/' && await isLanding(), pathNow());
        await page.goto(base + '/calculator/sip', { waitUntil: 'networkidle' });
        check('?dev=false: app routes redirect again (/calculator/sip → /sip)', pathNow() === '/sip', pathNow());
        await shot('6-dev-false-public-again');
        const devHits = hits.filter((h) => h.phase === 'dev');
        check('analytics in dev mode are all test traffic; no page path carries "dev="',
            devHits.every((h) => h.tt === 'internal') && hits.every((h) => !/[?&]dev=/.test(h.dl)),
            `${devHits.length} dev-mode hits, ${devHits.filter((h) => h.tt !== 'internal').length} not flagged`);
        await ctx.close();
    } finally {
        await browser.close();
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    let passed = 0, failed = 0;
    const check = (label, ok, detail = '') => { ok ? passed++ : failed++; console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  [${detail}]` : ''}`); };
    const external = process.argv[2];
    const shotsDir = path.resolve(process.argv[3] || 'marketing-assets/website-preview/dev-mode');
    const bypass = process.env.VERCEL_BYPASS;
    let server = null;
    if (!external) { const { serveDist } = await import('./serve-dist.mjs'); server = await serveDist({ port: 4335 }); }
    const base = external ? external.replace(/\/$/, '') : server.local;
    console.log(`Dev-mode proof against ${external ? 'the deployed preview' : base}`);
    try {
        await runDevModeProof({ base, shotsDir, check, extraHeaders: bypass ? { 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' } : {} });
    } finally {
        if (server) await server.stop();
    }
    console.log(`\n${passed} passed, ${failed} failed — screenshots in ${path.relative(process.cwd(), shotsDir)}`);
    process.exit(failed ? 1 : 0);
}
