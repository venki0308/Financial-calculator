// QA audit: usage analytics must be strictly opt-in.
// Drives the PRODUCTION build in a real browser, each scenario in a brand-new
// profile, and records every network request.
//
//   npm run build
//   node scripts/qa-consent-network.mjs            (starts its own preview server)
//   node scripts/qa-consent-network.mjs http://127.0.0.1:4173   (use a running one)
//
// Needs the dev dependency playwright-core and an installed Google Chrome.
// Note: the "Allow" scenarios send a handful of real hits to the Analytics
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

const consentDialog = (page) => page.locator('[aria-labelledby="analytics-consent-title"]');
const settle = (page, ms = 3500) => page.waitForTimeout(ms);
const visit = async (page, base, path) => { await page.goto(base + path, { waitUntil: 'load' }); await settle(page); };
const collectCount = (log) => log.filter(r => COLLECT_HOSTS.test(r.host)).length;
/** The Google tag batches hits for a few seconds; wait for the first one. */
const waitForCollect = (page) => page
    .waitForRequest((r) => COLLECT_HOSTS.test(new URL(r.url()).hostname), { timeout: 25000 })
    .then(() => page.waitForTimeout(500), () => {});

async function main() {
    const external = process.argv[2];
    const server = external ? { base: external.replace(/\/$/, ''), stop: () => {} } : await startPreview();
    const { base } = server;
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        // ── 1. New user: nothing before the choice, starts on Allow, stops on toggle-off
        console.log('\n1. New user → Allow → turn off in Settings');
        {
            const { context, page, log } = await freshProfile(browser);
            await visit(page, base, '/?dev=true');
            await acceptDisclaimer(page);
            await consentDialog(page).waitFor({ timeout: 10000 });
            const buttons = consentDialog(page).locator('button.flex-1');
            const [denyBox, allowBox] = [await buttons.nth(0).boundingBox(), await buttons.nth(1).boundingBox()];
            const [denyClass, allowClass] = [await buttons.nth(0).getAttribute('class'), await buttons.nth(1).getAttribute('class')];
            check('consent dialog is shown after the disclaimer', await consentDialog(page).isVisible());
            check('"No thanks" and "Allow" have identical styling and size', denyClass === allowClass && Math.abs(denyBox.width - allowBox.width) < 2 && denyBox.height === allowBox.height, `${Math.round(denyBox.width)}x${denyBox.height} vs ${Math.round(allowBox.width)}x${allowBox.height}`);
            await visit(page, base, '/calculator/sip');
            await visit(page, base, '/calculator/loan-emi');
            let s = await state(page);
            check('before choosing: zero requests to Google analytics / Firebase hosts', log.length === 0, `${log.length} requests`);
            check('before choosing: no Google tag, no _ga cookie, no Firebase database', !s.gtagLoaded && s.gaCookies.length === 0 && s.firebaseDbs.length === 0, JSON.stringify(s));
            check('before choosing: choice is not stored (default off)', s.consent === null);

            await consentDialog(page).locator('button.flex-1').nth(1).click(); // Allow
            await settle(page, 2000);
            await visit(page, base, '/calculator/income-tax');
            await waitForCollect(page);
            s = await state(page);
            const afterAllow = collectCount(log);
            check('after Allow: choice stored as "granted"', s.consent === 'granted');
            check('after Allow: Google tag loaded and collect requests are sent', s.gtagLoaded && afterAllow > 0, `${afterAllow} collect requests`);

            await visit(page, base, '/settings');
            await page.locator('button[role="switch"]').click();
            await settle(page, 5000);
            const atOff = Date.now();
            const hostsAtOff = [...new Set(log.map(r => r.host))];
            // Same page session first (the Google tag is still in memory)…
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
            const collectAfterOff = log.filter(r => r.at > atOff && COLLECT_HOSTS.test(r.host)).length;
            const anyAfterOff = log.filter(r => r.at > atOff);
            check('after toggle off: choice stored as "denied"', s.consent === 'denied');
            check('after toggle off: zero collect requests on three more screens', collectAfterOff === 0, `${collectAfterOff} requests`);
            check('after toggle off: no request at all to Google analytics / Firebase hosts', anyAfterOff.length === 0, anyAfterOff.map(r => r.host + r.path).join(', '));
            check('after toggle off: _ga cookies and Firebase databases are deleted', s.gaCookies.length === 0 && s.firebaseDbs.length === 0, JSON.stringify(s));
            console.log(`    hosts contacted while allowed: ${hostsAtOff.join(', ')}`);
            const del = log.filter(r => r.method === 'DELETE').map(r => r.host);
            console.log(`    deletion request at opt-out: ${del.length ? del.join(', ') : 'none seen'}`);
            await context.close();
        }

        // ── 2. New user: No thanks → never anything
        console.log('\n2. New user → No thanks');
        {
            const { context, page, log } = await freshProfile(browser);
            await visit(page, base, '/?dev=true');
            await acceptDisclaimer(page);
            await consentDialog(page).waitFor({ timeout: 10000 });
            await consentDialog(page).locator('button.flex-1').nth(0).click(); // No thanks
            await visit(page, base, '/calculator/sip');
            await visit(page, base, '/calculator/loan-emi');
            await visit(page, base, '/'); // relaunch
            const s = await state(page);
            check('choice stored as "denied" and the dialog does not return', s.consent === 'denied' && !(await consentDialog(page).isVisible()));
            check('zero requests to Google analytics / Firebase hosts', log.length === 0, `${log.length} requests`);
            check('no Google tag, no _ga cookie, no Firebase database', !s.gtagLoaded && s.gaCookies.length === 0 && s.firebaseDbs.length === 0);
            await context.close();
        }

        // ── 3. Existing user upgrading from build 21 (had analytics on, old disclaimer accepted)
        console.log('\n3. Existing user upgrading from build 21');
        for (const answer of ['No thanks', 'Allow']) {
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
            check(`[${answer}] first launch: no request before a choice is made`, log.length === 0, `${log.length} requests`);
            check(`[${answer}] first launch: identifiers left by build 21 are deleted`, s.gaCookies.length === 0 && s.firebaseDbs.length === 0 && s.legacyKeys.length === 0, JSON.stringify(s));
            await acceptDisclaimer(page); // corrected disclaimer (v4) is shown again
            await consentDialog(page).waitFor({ timeout: 10000 });
            check(`[${answer}] corrected disclaimer, then the consent choice, are shown`, await consentDialog(page).isVisible());
            await consentDialog(page).locator('button.flex-1').nth(answer === 'Allow' ? 1 : 0).click();
            await settle(page, 2000);
            await visit(page, base, '/calculator/sip');
            if (answer === 'Allow') await waitForCollect(page); else await settle(page, 8000);
            s = await state(page);
            if (answer === 'Allow') {
                check('[Allow] requests start only now', s.consent === 'granted' && collectCount(log) > 0, `${collectCount(log)} collect requests`);
            } else {
                check('[No thanks] still zero requests', s.consent === 'denied' && log.length === 0, `${log.length} requests`);
            }
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
