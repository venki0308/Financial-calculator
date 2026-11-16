// QA audit: usage analytics behaviour.
// Analytics run for every user by default (as in earlier versions), with no
// popup, and a user can switch them off in Settings → Privacy. This audit
// drives the PRODUCTION build in a real browser, each scenario in a brand-new
// profile, records every network request and checks that:
//   - no popup ever asks about usage statistics,
//   - analytics start on their own,
//   - switching them off stops every request and deletes the identifiers,
//   - a user upgrading from build 21 keeps the same analytics ID.
//
//   npm run build
//   node scripts/qa-consent-network.mjs            (starts its own preview server)
//   node scripts/qa-consent-network.mjs http://127.0.0.1:4173   (use a running one)
//
// Needs the dev dependency playwright-core and an installed Google Chrome.
// Note: every run sends a handful of real hits to the analytics property
// configured in .env.
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
    ga: (document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('_ga=')) || '').slice(4),
    gaCookies: document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(n => n.startsWith('_ga')),
    firebaseDbs: (indexedDB.databases ? await indexedDB.databases() : []).map(d => d.name).filter(n => /firebase/.test(n || '')),
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
/** The analytics tag batches hits for a few seconds; wait for the first one. */
const waitForCollect = (page) => page
    .waitForRequest((r) => COLLECT_HOSTS.test(new URL(r.url()).hostname), { timeout: 25000 })
    .then(() => page.waitForTimeout(500), () => {});
/** True when anything on screen asks about usage statistics / analytics consent. */
const popupShown = (page) => page.evaluate(() =>
    !!document.querySelector('[aria-labelledby="analytics-consent-title"]') ||
    [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].some(d => /usage statistics|analytics/i.test(d.textContent || '')));

async function main() {
    const external = process.argv[2];
    const server = external ? { base: external.replace(/\/$/, ''), stop: () => {} } : await startPreview();
    const { base } = server;
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        // ── 1. New user: no popup, analytics start on their own; switching off stops everything
        console.log('\n1. New user → analytics on by default → switch off in Settings');
        {
            const { context, page, log } = await freshProfile(browser);
            await visit(page, base, '/?dev=true');
            await acceptDisclaimer(page);
            await settle(page, 2000);
            check('no usage-statistics popup after the disclaimer', !(await popupShown(page)));
            await visit(page, base, '/calculator/sip');
            await waitForCollect(page);
            let s = await state(page);
            check('no popup on later screens either', !(await popupShown(page)));
            check('analytics run without being asked: tag loaded and hits sent', s.gtagLoaded && collectCount(log) > 0, `${collectCount(log)} collect requests`);
            check('nothing is stored as a choice (default on)', s.consent === null);

            await visit(page, base, '/settings');
            const toggle = page.locator('button[role="switch"]');
            check('Settings switch shows analytics as on', (await toggle.getAttribute('aria-checked')) === 'true');
            await toggle.click(); // off
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
            await visit(page, base, '/');
            await settle(page, 4000);
            s = await state(page);
            const afterOff = log.filter(r => r.at > atOff);
            check('after switching off: choice stored as "denied"', s.consent === 'denied');
            check('after switching off: no request at all to analytics hosts, also after relaunch', afterOff.length === 0, afterOff.map(r => r.host + r.path).join(', '));
            check('after switching off: analytics cookies and IDs are deleted', s.gaCookies.length === 0 && s.firebaseDbs.length === 0 && !s.gtagLoaded, JSON.stringify(s));

            await visit(page, base, '/settings');
            await page.locator('button[role="switch"]').click(); // on again
            await settle(page, 2000);
            await visit(page, base, '/calculator/income-tax');
            await waitForCollect(page);
            s = await state(page);
            check('switching on again: hits resume', s.consent === 'granted' && log.filter(r => r.at > atOff && COLLECT_HOSTS.test(r.host)).length > 0);
            await context.close();
        }

        // ── 2. Existing user upgrading from build 21: analytics continue with the same ID
        console.log('\n2. Existing user upgrading from build 21');
        {
            const { context, page, log } = await freshProfile(browser);
            const OLD_ID = 'GA1.1.1111111111.1700000000';
            await page.goto(base + '/robots.txt');
            await page.evaluate((id) => {
                localStorage.setItem('fincalix_dev_access', 'true');
                localStorage.setItem('fincalix_disclaimer_accepted_v3', 'true');
                localStorage.setItem('fincalix_privacy_accepted', 'true');
                document.cookie = `_ga=${id}; path=/; max-age=63072000`;
            }, OLD_ID);
            await visit(page, base, '/');
            await acceptDisclaimer(page); // the updated disclaimer is shown once
            await settle(page, 2000);
            check('no usage-statistics popup after the disclaimer', !(await popupShown(page)));
            await visit(page, base, '/calculator/sip');
            await waitForCollect(page);
            const s = await state(page);
            check('analytics keep running after the update', s.gtagLoaded && collectCount(log) > 0, `${collectCount(log)} collect requests`);
            check('the existing analytics ID is kept (same user in the reports)', s.ga === OLD_ID, s.ga);
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
