// QA audit: usage analytics must stay off unless the user turns them on.
// There is no popup: the only switch is Settings → Privacy → "Usage analytics",
// off by default. Drives the PRODUCTION build in a real browser, each scenario
// in a brand-new profile, and records every network request.
//
//   npm run build
//   node scripts/qa-consent-network.mjs            (starts its own preview server)
//   node scripts/qa-consent-network.mjs http://127.0.0.1:4173   (use a running one)
//
// Needs the dev dependency playwright-core and an installed Google Chrome.
// Note: the "switch on" scenarios send a handful of real hits to the analytics
// property configured in .env.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const ANALYTICS_HOSTS = /(^|\.)(google-analytics\.com|analytics\.google\.com|googletagmanager\.com|doubleclick\.net|firebase\.googleapis\.com|firebaseinstallations\.googleapis\.com|firebaselogging-pa\.googleapis\.com|app-measurement\.com)$/;
const COLLECT_HOSTS = /(^|\.)(google-analytics\.com|analytics\.google\.com|app-measurement\.com)$/;

let passed = 0;
let failed = 0;
const check = (label, ok, detail = '') => {
    if (ok) passed++; else failed++;
    console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  [${detail}]` : ''}`);
};

async function startPreview() {
    const port = 4319;
    const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 60; i++) {
        try { if ((await fetch(base)).ok) return { base, stop: () => child.kill() }; } catch { /* not up yet */ }
        await new Promise(r => setTimeout(r, 250));
    }
    child.kill();
    throw new Error('preview server did not start — run "npm run build" first');
}

/** A brand-new profile with a request log. */
async function freshProfile(browser) {
    const context = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const log = [];
    page.on('request', (req) => {
        const u = new URL(req.url());
        if (ANALYTICS_HOSTS.test(u.hostname)) log.push({ host: u.hostname, path: u.pathname, method: req.method(), at: Date.now() });
    });
    return { context, page, log };
}

const state = (page) => page.evaluate(async () => ({
    consent: localStorage.getItem('fincalix_analytics_consent'),
    gaCookies: document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(n => n.startsWith('_ga')),
    firebaseDbs: (indexedDB.databases ? await indexedDB.databases() : []).map(d => d.name).filter(n => /firebase/.test(n || '')),
    legacyKeys: ['fincalix_anon_id', 'fincalix_analytics_queue'].filter(k => localStorage.getItem(k) !== null),
    gtagLoaded: [...document.scripts].some(s => /googletagmanager/.test(s.src)),
}));

/** Scroll the first-launch disclaimer to the end and accept it. */
async function acceptDisclaimer(page) {
    const accept = page.locator('div.fixed.inset-0 button').last();
    await page.waitForFunction(() => !!document.querySelector('div.fixed.inset-0 .overflow-y-auto'), null, { timeout: 15000 });
    await page.evaluate(() => {
        const box = document.querySelector('div.fixed.inset-0 .overflow-y-auto');
        box.scrollTop = box.scrollHeight;
        box.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(400);
    await accept.click();
}

const settle = (page, ms = 3500) => page.waitForTimeout(ms);
const visit = async (page, base, path) => { await page.goto(base + path, { waitUntil: 'load' }); await settle(page); };
const collectCount = (log) => log.filter(r => COLLECT_HOSTS.test(r.host)).length;
/** The Google tag batches hits for a few seconds; wait for the first one. */
const waitForCollect = (page) => page
    .waitForRequest((r) => COLLECT_HOSTS.test(new URL(r.url()).hostname), { timeout: 25000 })
    .then(() => page.waitForTimeout(500), () => {});
/** True when anything on screen asks about usage statistics / analytics consent. */
const popupShown = (page) => page.evaluate(() =>
    !!document.querySelector('[aria-labelledby="analytics-consent-title"]') ||
    [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].some(d => /usage statistics|analytics/i.test(d.textContent || '')));
const flipSwitch = async (page, base) => { await visit(page, base, '/settings'); await page.locator('button[role="switch"]').click(); };

async function main() {
    const external = process.argv[2];
    const server = external ? { base: external.replace(/\/$/, ''), stop: () => {} } : await startPreview();
    const { base } = server;
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        // ── 1. New user who never opens Settings: nothing is ever sent, and nothing asks
        console.log('\n1. New user, Settings never touched');
        {
            const { context, page, log } = await freshProfile(browser);
            await visit(page, base, '/?dev=true');
            await acceptDisclaimer(page);
            await settle(page, 2000);
            check('no usage-statistics popup after the disclaimer', !(await popupShown(page)));
            await visit(page, base, '/calculator/sip');
            await visit(page, base, '/calculator/loan-emi');
            await visit(page, base, '/'); // relaunch
            const s = await state(page);
            check('no popup on later launches either', !(await popupShown(page)));
            check('zero requests to analytics / Firebase hosts', log.length === 0, `${log.length} requests`);
            check('no tag, no _ga cookie, no Firebase database', !s.gtagLoaded && s.gaCookies.length === 0 && s.firebaseDbs.length === 0, JSON.stringify(s));
            check('analytics choice is not stored (default off)', s.consent === null);
            await context.close();
        }

        // ── 2. New user who switches analytics on in Settings, then off again
        console.log('\n2. New user → switch on in Settings → switch off');
        {
            const { context, page, log } = await freshProfile(browser);
            await visit(page, base, '/?dev=true');
            await acceptDisclaimer(page);
            await visit(page, base, '/calculator/sip');
            check('before switching on: zero requests', log.length === 0, `${log.length} requests`);
            await visit(page, base, '/settings');
            check('Settings switch is off by default', (await page.locator('button[role="switch"]').getAttribute('aria-checked')) === 'false');
            await page.locator('button[role="switch"]').click(); // on
            await settle(page, 2000);
            await visit(page, base, '/calculator/income-tax');
            await waitForCollect(page);
            let s = await state(page);
            const afterOn = collectCount(log);
            check('after switching on: choice stored as "granted"', s.consent === 'granted');
            check('after switching on: the tag loads and collect requests are sent', s.gtagLoaded && afterOn > 0, `${afterOn} collect requests`);

            await flipSwitch(page, base); // off
            await settle(page, 5000);
            const atOff = Date.now();
            // Same page session first (the tag is still in memory)…
            for (const path of ['/calculator/sip', '/calculator/ppf']) {
                await page.evaluate((p) => { history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate')); }, path);
                await settle(page, 6000);
            }
            // …then fresh launches.
            await visit(page, base, '/calculator/sip');
            await visit(page, base, '/calculator/hra');
            await visit(page, base, '/schemes');
            await settle(page, 4000);
            s = await state(page);
            const afterOff = log.filter(r => r.at > atOff);
            check('after switching off: choice stored as "denied"', s.consent === 'denied');
            check('after switching off: no request at all to analytics / Firebase hosts', afterOff.length === 0, afterOff.map(r => r.host + r.path).join(', '));
            check('after switching off: _ga cookies and Firebase databases are deleted', s.gaCookies.length === 0 && s.firebaseDbs.length === 0, JSON.stringify(s));
            const del = log.filter(r => r.method === 'DELETE').map(r => r.host);
            console.log(`    deletion request at switch-off: ${del.length ? del.join(', ') : 'none seen'}`);
            await context.close();
        }

        // ── 3. Existing user upgrading from build 21 (analytics used to run for everyone)
        console.log('\n3. Existing user upgrading from build 21');
        {
            const { context, page, log } = await freshProfile(browser);
            await page.goto(base + '/robots.txt');
            await page.evaluate(async () => {
                localStorage.setItem('fincalix_dev_access', 'true');
                localStorage.setItem('fincalix_disclaimer_accepted_v3', 'true');
                localStorage.setItem('fincalix_privacy_accepted', 'true');
                localStorage.setItem('fincalix_anon_id', 'uid-0123456789abcdef');
                localStorage.setItem('fincalix_analytics_queue', '[{"eventName":"screen_view","timestamp":1}]');
                document.cookie = '_ga=GA1.1.1111111111.1700000000; path=/; max-age=63072000';
                document.cookie = '_ga_TESTTEST=GS1.1.1700000000.1.0.1700000000.0.0.0; path=/; max-age=63072000';
                await new Promise((res) => { const r = indexedDB.open('firebase-installations-database', 1); r.onupgradeneeded = () => r.result.createObjectStore('s'); r.onsuccess = () => { r.result.close(); res(); }; });
            });
            await visit(page, base, '/');
            let s = await state(page);
            check('first launch: identifiers left by build 21 are deleted', s.gaCookies.length === 0 && s.firebaseDbs.length === 0 && s.legacyKeys.length === 0, JSON.stringify(s));
            await acceptDisclaimer(page); // the corrected disclaimer is shown once
            await settle(page, 2000);
            check('no usage-statistics popup after the disclaimer', !(await popupShown(page)));
            await visit(page, base, '/calculator/sip');
            await visit(page, base, '/calculator/loan-emi');
            await settle(page, 6000);
            s = await state(page);
            check('zero requests to analytics / Firebase hosts', log.length === 0, `${log.length} requests`);
            check('analytics stay off until switched on', s.consent === null && !s.gtagLoaded);
            await context.close();
        }
    } finally {
        await browser.close();
        server.stop();
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════════════');
    process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
