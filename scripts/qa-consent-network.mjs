// QA audit: usage analytics behaviour and event hygiene.
// Analytics run for every user by default (as in the published app), with no
// popup, and can be switched off in Settings → Privacy. Drives the PRODUCTION
// build in a real browser, each scenario in a brand-new profile, decodes every
// hit sent to the analytics service and checks:
//   - no popup ever asks about usage statistics;
//   - one page_view per screen, with the canonical screen name, no screen_view,
//     no underscore names, no generic HTML title, no record IDs in addresses;
//   - calculator_calculated fires once per calculation (not per keystroke) and
//     report_exported fires for PDF and Excel, each with only allowed params;
//   - every hit is flagged as test traffic (debug_mode + traffic_type=internal);
//   - offline events are queued and sent later; switching off deletes the
//     queue unsent and stops all requests;
//   - a user upgrading from build 21 keeps the same analytics ID.
//
//   npm run build
//   node scripts/qa-consent-network.mjs            (starts its own preview server)
//   node scripts/qa-consent-network.mjs https://fincalix.com   (a deployed site)
//
// Needs the dev dependency playwright-core and an installed Google Chrome.
// Every hit it causes carries debug_mode and traffic_type=internal, which the
// analytics property filters out of reports (see PLAY_DATA_SAFETY.md).
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const ANALYTICS_HOSTS = /(^|\.)(google-analytics\.com|analytics\.google\.com|googletagmanager\.com|doubleclick\.net|firebase\.googleapis\.com|firebaseinstallations\.googleapis\.com|firebaselogging-pa\.googleapis\.com|app-measurement\.com)$/;
const COLLECT_HOSTS = /(^|\.)(google-analytics\.com|analytics\.google\.com|app-measurement\.com)$/;
const QUEUE_KEY = 'fincalix_analytics_queue';

// Event → event parameters it may carry (as sent: "ep." params). The SDK adds
// "origin"; test runs add "debug_mode". "language" is filed by the library
// under its built-in language field ("ul"), checked separately.
const ALLOWED = {
    page_view: [],
    calculator_calculated: ['calculator_id'],
    report_exported: ['calculator_id', 'export_format'],
    scheme_viewed: ['scheme_type'],
    language_changed: [],
};
const SDK_PARAMS = ['origin', 'debug_mode'];
const GENERIC_TITLE = /FinCalix — Free Financial/;

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

/** Decode one collect request into its events (a request can batch several). */
function decode(req) {
    const u = new URL(req.url());
    const base = new URLSearchParams(u.search);
    const out = [];
    for (const line of [u.search.slice(1), ...(req.postData() || '').split('\n')].filter(Boolean)) {
        const p = new URLSearchParams(line);
        const en = p.get('en');
        if (!en) continue;
        const ep = {};
        for (const [k, v] of p) if (/^(ep|epn|up)\./.test(k)) ep[k.replace(/^(ep|epn|up)\./, '')] = v;
        const get = (k) => p.get(k) ?? base.get(k);
        out.push({ en, ep, dt: get('dt') || '', dl: get('dl') || '', ul: get('ul') || '', tt: get('tt') || '', at: Date.now() });
    }
    return out;
}

/**
 * A brand-new profile with request + event logs. Test traffic is flagged.
 * `slowCode` delays every app code file by 1.2 s, like a phone network: a
 * redirecting URL then stays on screen longer, which is where duplicate
 * page views showed up on production.
 */
async function freshProfile(browser, seed = {}, { slowCode = false } = {}) {
    const context = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block', acceptDownloads: true });
    if (slowCode) {
        await context.route(/\/assets\/.+\.js(\?.*)?$/, async (route) => {
            await new Promise((r) => setTimeout(r, 1200));
            await route.continue();
        });
    }
    await context.addInitScript((s) => {
        try {
            localStorage.setItem('fincalix_analytics_test_traffic', '1');
            if (!sessionStorage.getItem('seeded')) {
                for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
                sessionStorage.setItem('seeded', '1');
            }
        } catch { /* storage unavailable */ }
    }, seed);
    const page = await context.newPage();
    const requests = [];
    const events = [];
    page.on('request', (req) => {
        const u = new URL(req.url());
        if (!ANALYTICS_HOSTS.test(u.hostname)) return;
        requests.push({ host: u.hostname, path: u.pathname, method: req.method(), at: Date.now() });
        if (COLLECT_HOSTS.test(u.hostname)) events.push(...decode(req));
    });
    return { context, page, requests, events };
}

const state = (page) => page.evaluate(async (qk) => ({
    consent: localStorage.getItem('fincalix_analytics_consent'),
    ga: (document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('_ga=')) || '').slice(4),
    gaCookies: document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(n => n.startsWith('_ga')),
    firebaseDbs: (indexedDB.databases ? await indexedDB.databases() : []).map(d => d.name).filter(n => /firebase/.test(n || '')),
    gtagLoaded: [...document.scripts].some(s => /googletagmanager/.test(s.src)),
    queue: JSON.parse(localStorage.getItem(qk) || '[]'),
}), QUEUE_KEY);

/** Scroll the first-launch disclaimer to the end and accept it. */
async function acceptDisclaimer(page) {
    const accept = page.locator('div.fixed.inset-0 button').last();
    await page.waitForFunction(() => !!document.querySelector('div.fixed.inset-0 .overflow-y-auto'), null, { timeout: 15000 });
    // The text may still be laying out (fonts, translations): scroll until the button enables.
    for (let i = 0; i < 20 && !(await accept.isEnabled()); i++) {
        await page.evaluate(() => {
            const box = document.querySelector('div.fixed.inset-0 .overflow-y-auto');
            box.scrollTop = box.scrollHeight;
            box.dispatchEvent(new Event('scroll'));
        });
        await page.waitForTimeout(300);
    }
    await accept.click();
}

const wait = (page, ms) => page.waitForTimeout(ms);
/** In-app navigation (no reload), like tapping a link. */
const go = async (page, path, ms = 1500) => {
    await page.evaluate((p) => { history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate')); }, path);
    await wait(page, ms);
};
const popupShown = (page) => page.evaluate(() =>
    !!document.querySelector('[aria-labelledby="analytics-consent-title"]') ||
    [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].some(d => /usage statistics|analytics/i.test(d.textContent || '')));
const settle = async (page, events, ms = 9000) => { await wait(page, ms); return events.length; };

/** Every hit: allowed event, only allowed params, test-flagged, no generic title, no record ID. */
function hygiene(events, label) {
    const bad = [];
    for (const e of events) {
        const allowed = ALLOWED[e.en];
        if (!allowed) { bad.push(`unexpected event ${e.en}`); continue; }
        const extra = Object.keys(e.ep).filter(k => !allowed.includes(k) && !SDK_PARAMS.includes(k));
        if (extra.length) bad.push(`${e.en} has ${extra.join(',')}`);
        if (GENERIC_TITLE.test(e.dt)) bad.push(`${e.en} generic title`);
        if (/_/.test(e.dt)) bad.push(`${e.en} underscore title ${e.dt}`);
        if (/\/(my-loans|business-tracker|credit-cards)\/(?!:id|add)[^/]+/.test(e.dl)) bad.push(`${e.en} record id in ${e.dl}`);
        if (e.tt !== 'internal' || e.ep.debug_mode !== 'true') bad.push(`${e.en} not flagged as test traffic`);
    }
    check(`${label}: every hit is an allowed event with only allowed parameters, flagged as test traffic`, bad.length === 0 && events.length > 0, bad.length ? [...new Set(bad)].slice(0, 4).join(' | ') : `${events.length} hits`);
}

async function main() {
    const external = process.argv[2];
    const server = external ? { base: external.replace(/\/$/, ''), stop: () => {} } : await startPreview();
    const { base } = server;
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        // ── 1. New user: no popup; one page_view per screen; calculate + export events
        console.log('\n1. New user: screens, calculation, exports (app code loading slowly, like a phone)');
        {
            const { context, page, events } = await freshProfile(browser, { fincalix_dev_access: 'true' }, { slowCode: true });
            await page.goto(base + '/', { waitUntil: 'load' });
            await acceptDisclaimer(page);
            await wait(page, 2500);
            check('no usage-statistics popup after the disclaimer', !(await popupShown(page)));

            // Each screen gets time to load and appear (code is slowed down here);
            // a screen the user leaves before it ever appears is not counted.
            await go(page, '/sip', 5000);           // old URL that redirects to /calculator/sip
            await go(page, '/calculator/loan-emi', 5000);
            await go(page, '/my-loans', 5000);
            await go(page, '/calculator/sip', 6000); // also past the screen-opening window
            check('no popup on later screens either', !(await popupShown(page)));

            // Type a new amount, key by key, then leave the field.
            const input = page.locator('input').first();
            await input.click();
            await input.press('Control+A');
            for (const k of ['1', '5', '0', '0', '0']) { await input.press(k); await wait(page, 150); }
            await page.locator('h1, h2').first().click({ force: true }).catch(() => {});
            await wait(page, 5000);

            await page.getByRole('button', { name: /pdf/i }).first().click();
            await wait(page, 3000);
            await page.getByRole('button', { name: /excel/i }).first().click();
            await settle(page, events);

            const views = events.filter(e => e.en === 'page_view').map(e => e.dt);
            check('one page_view per screen visit, canonical names', JSON.stringify(views) === JSON.stringify(['Home', 'SIP Calculator', 'EMI Calculator', 'My Loans', 'SIP Calculator']), views.join(' → '));
            check('no screen_view events', !events.some(e => e.en === 'screen_view'));
            check('no hit reports the generic HTML title', !events.some(e => GENERIC_TITLE.test(e.dt)));
            const calcs = events.filter(e => e.en === 'calculator_calculated');
            check('typing 5 keys = exactly one calculator_calculated', calcs.length === 1, `${calcs.length} events`);
            check('calculator_calculated params: calculator_id=sip, language=en', calcs[0]?.ep.calculator_id === 'sip' && calcs[0]?.ul === 'en', JSON.stringify(calcs[0]?.ep || {}) + ' ul=' + (calcs[0]?.ul || ''));
            check('no calculator_calculated for results shown while screens were opening', calcs.length <= 1);
            const exports = events.filter(e => e.en === 'report_exported').map(e => `${e.ep.calculator_id}/${e.ep.export_format}/${e.ul}`);
            check('report_exported for PDF and Excel with calculator_id and language', JSON.stringify(exports) === JSON.stringify(['sip/pdf/en', 'sip/excel/en']), exports.join(', '));
            hygiene(events, 'scenario 1');
            await context.close();
        }

        // ── 2. Offline: events are queued, then sent when back online
        console.log('\n2. Offline queue');
        {
            const { context, page, events } = await freshProfile(browser, { fincalix_dev_access: 'true', fincalix_disclaimer_accepted_v4: 'true' });
            await page.goto(base + '/', { waitUntil: 'load' });
            await go(page, '/calculator/fixed-deposit');
            await go(page, '/schemes', 6000);
            const before = events.length;
            await context.setOffline(true);
            await go(page, '/calculator/fixed-deposit');
            await go(page, '/schemes');
            let s = await state(page);
            check('while offline: page views are kept in the local queue', s.queue.length === 2 && events.length === before, `${s.queue.length} queued`);
            check('queued items carry no amounts or typed text', s.queue.every(q => q.e === 'page_view' && Object.keys(q.p || {}).every(k => ['page_title', 'page_location'].includes(k))));
            await context.setOffline(false);
            await page.evaluate(() => window.dispatchEvent(new Event('online')));
            await settle(page, events);
            s = await state(page);
            const sent = events.slice(before).filter(e => e.en === 'page_view').map(e => e.dt);
            check('back online: the queue is sent and cleared', s.queue.length === 0 && sent.length === 2, sent.join(' → '));
            hygiene(events, 'scenario 2');
            await context.close();
        }

        // ── 3. Switched off: the queue is deleted unsent, nothing is sent again
        console.log('\n3. Switch off in Settings (with events queued)');
        {
            const { context, page, events, requests } = await freshProfile(browser, { fincalix_dev_access: 'true', fincalix_disclaimer_accepted_v4: 'true' });
            await page.goto(base + '/', { waitUntil: 'load' });
            // Load every screen used below once while online (their code is
            // downloaded on first use and would not load while offline).
            await go(page, '/settings', 3000);
            await go(page, '/schemes', 2000);
            await go(page, '/calculator/fixed-deposit', 4000);
            await context.setOffline(true);
            await go(page, '/schemes');
            await go(page, '/calculator/fixed-deposit');
            let s = await state(page);
            check('events queued while offline', s.queue.length >= 2, `${s.queue.length} queued`);
            await go(page, '/settings', 1500);
            const toggle = page.locator('button[role="switch"]');
            check('Settings switch shows analytics as on', (await toggle.getAttribute('aria-checked')) === 'true');
            await toggle.click(); // off
            await wait(page, 1500);
            s = await state(page);
            check('switching off deletes the queue without sending it', s.queue.length === 0 && s.consent === 'denied');
            const atOff = Date.now();
            await context.setOffline(false);
            await page.evaluate(() => window.dispatchEvent(new Event('online')));
            await go(page, '/calculator/sip');
            await page.goto(base + '/calculator/hra', { waitUntil: 'load' });
            await settle(page, events, 6000);
            s = await state(page);
            const after = requests.filter(r => r.at > atOff);
            check('after switching off: no request at all to analytics hosts, also after relaunch', after.length === 0, after.map(r => r.host + r.path).join(', '));
            check('after switching off: analytics cookies and IDs are deleted, nothing queued', s.gaCookies.length === 0 && s.firebaseDbs.length === 0 && !s.gtagLoaded && s.queue.length === 0, JSON.stringify({ ...s, queue: s.queue.length }));
            await context.close();
        }

        // ── 4. Upgrade from build 21: same analytics ID; old queue format handled
        console.log('\n4. Existing user upgrading from build 21');
        {
            const OLD_ID = 'GA1.1.1111111111.1700000000';
            const { context, page, events } = await freshProfile(browser, {
                fincalix_dev_access: 'true',
                fincalix_disclaimer_accepted_v3: 'true',
                fincalix_privacy_accepted: 'true',
                [QUEUE_KEY]: JSON.stringify([{ eventName: 'screen_view', params: { screen_name: 'SIP_Calculator', amount: 50000 }, timestamp: Date.now() }]),
            });
            await page.goto(base + '/robots.txt');
            await page.evaluate((id) => { document.cookie = `_ga=${id}; path=/; max-age=63072000`; }, OLD_ID);
            await page.goto(base + '/', { waitUntil: 'load' });
            await acceptDisclaimer(page); // the updated disclaimer is shown once
            await wait(page, 2000);
            check('no usage-statistics popup after the disclaimer', !(await popupShown(page)));
            await go(page, '/calculator/sip');
            await settle(page, events);
            const s = await state(page);
            check('analytics keep running after the update', events.some(e => e.en === 'page_view'), `${events.length} hits`);
            check('the existing analytics ID is kept (same user in the reports)', s.ga === OLD_ID, s.ga);
            check('an old queued screen_view (with an amount) is never sent, and the old queue is cleared', !events.some(e => e.en === 'screen_view' || 'amount' in e.ep) && s.queue.length === 0);
            hygiene(events, 'scenario 4');
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
