// Data round trip for web users of the old FinCalix web app, on both origins
// (https://fincalix.com and https://www.fincalix.com), proven end to end:
//
//   1. OLD WEB APP (the build that is live today): in a real Chrome profile, accept the
//      disclaimer, add an expense through the app's own form and run the SIP calculator.
//      The browser's FinCalix data is recorded ("what the user had").
//   2. NEW WEBSITE (this branch): same browser, same origin. On the apex the one-time banner
//      appears; its "Export my data" button downloads the backup. On www, the
//      /export-my-data page (excluded from the www → apex redirect) downloads it.
//      Each file must hold exactly what the user had.
//   3. ANDROID APP on an emulator (the build-22 source): clear the app, copy the file to
//      Downloads, Profile → Settings → Import App Data → pick the file in the system
//      picker → Restore. After the app restarts, its storage must match the file.
//
//   node scripts/landing/round-trip-android.mjs <oldDist> [outDir]
//
// Needs: `npm run build:web` (dist/), the old build in <oldDist>, Google Chrome, and an
// emulator (adb serial in ANDROID_SERIAL, default emulator-5584) with a debug build of the
// app installed whose WebView can be inspected (the test reads storage over DevTools).
// The hosts fincalix.com / www.fincalix.com are mapped to this machine inside Chrome only
// (--host-resolver-rules), so each origin keeps its own storage as on the real site.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { serveDist } from './serve-dist.mjs';

const OLD_DIST = path.resolve(process.argv[2] || '');
const OUT = path.resolve(process.argv[3] || 'marketing-assets/website-preview/round-trip');
const SERIAL = process.env.ANDROID_SERIAL || 'emulator-5584';
const ADB = process.env.ADB || path.join(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'), 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const PORT = 4370;
const ORIGINS = [
    { id: 'apex', url: `http://fincalix.com:${PORT}`, amount: '250', note: 'Lunch (apex)', sip: '7500' },
    { id: 'www', url: `http://www.fincalix.com:${PORT}`, amount: '999', note: 'Fuel (www)', sip: '12500' },
];
if (!fs.existsSync(path.join(OLD_DIST, 'index.html'))) { console.error('usage: node scripts/landing/round-trip-android.mjs <oldDist> [outDir]'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

let passed = 0, failed = 0;
const check = (label, ok, detail = '') => { ok ? passed++ : failed++; console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  [${detail}]` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The keys the app's backup covers (src/utils/backupRestore.ts, read from the source).
const BACKUP_KEYS = [...fs.readFileSync('src/utils/backupRestore.ts', 'utf8').match(/BACKUP_KEYS[^=]*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const readKeys = (keys) => Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)]));

async function acceptDisclaimer(page) {
    const accept = page.locator('div.fixed.inset-0 button').last();
    await page.waitForFunction(() => !!document.querySelector('div.fixed.inset-0 .overflow-y-auto'), null, { timeout: 15000 });
    for (let i = 0; i < 20 && !(await accept.isEnabled()); i++) {
        await page.evaluate(() => { const b = document.querySelector('div.fixed.inset-0 .overflow-y-auto'); b.scrollTop = b.scrollHeight; b.dispatchEvent(new Event('scroll')); });
        await page.waitForTimeout(300);
    }
    await accept.click();
    await page.waitForTimeout(800);
}

// ── 1 + 2: browser ─────────────────────────────────────────────────────────────
const had = {};
const files = {};
{
    const profile = path.join(OUT, 'chrome-profile');
    fs.rmSync(profile, { recursive: true, force: true });
    const ctx = await chromium.launchPersistentContext(profile, {
        channel: 'chrome', headless: true, acceptDownloads: true, viewport: { width: 412, height: 915 },
        args: ['--host-resolver-rules=MAP fincalix.com 127.0.0.1, MAP www.fincalix.com 127.0.0.1'],
    });
    // No analytics traffic from this test.
    await ctx.route(/google-analytics|googletagmanager|firebase/, (r) => r.abort());
    const page = ctx.pages()[0] || await ctx.newPage();

    console.log('\n1. Old web app (live build): create data through the app on both origins');
    const oldCfg = path.join(OUT, 'old-vercel.json');
    // Before 16 Nov 2026 both hosts served the full app.
    fs.writeFileSync(oldCfg, JSON.stringify({ rewrites: [{ source: '/(.*)', destination: '/index.html' }], headers: [] }));
    let server = await serveDist({ port: PORT, dir: OLD_DIST, config: oldCfg, middleware: false });
    for (const o of ORIGINS) {
        await page.goto(`${o.url}/expenses`, { waitUntil: 'networkidle' });
        await acceptDisclaimer(page);
        await page.getByText('Daily').first().click();
        await page.waitForTimeout(800);
        await page.locator('button.fixed.bottom-36').click();
        await page.waitForTimeout(1000);
        await page.locator('input[type=number]').first().fill(o.amount);
        await page.locator('input[placeholder^="e.g."]').first().fill(o.note);
        await page.getByRole('button', { name: /Food$/ }).last().click();
        await page.getByRole('button', { name: 'Save Expense' }).click();
        await page.waitForTimeout(1200);
        await page.screenshot({ path: path.join(OUT, `1-${o.id}-old-app-expense-saved.png`) });
        await page.goto(`${o.url}/calculator/sip`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(3500);
        const input = page.locator('input').first();
        await input.click();
        await input.fill(o.sip);
        await page.locator('h1').first().click();
        await page.waitForTimeout(4000);
        had[o.id] = await page.evaluate(readKeys, BACKUP_KEYS);
        const entries = JSON.parse(had[o.id].fincalix_entries || '[]');
        const hist = JSON.parse(had[o.id]['calculator-storage'] || '{}')?.state?.history || [];
        check(`${o.id}: old app saved the expense (₹${o.amount}, "${o.note}") and a SIP calculation`, entries.some((e) => String(e.amount) === o.amount && e.description === o.note) && hist.length > 0, `${entries.length} entries, ${hist.length} history`);
    }
    await server.stop();

    console.log('\n2. New website (this branch), same browser: export');
    server = await serveDist({ port: PORT });   // dist/ + vercel.json + middleware.ts, by Host header
    for (const o of ORIGINS) {
        let download;
        if (o.id === 'apex') {
            await page.goto(`${o.url}/`, { waitUntil: 'networkidle' });
            const banner = page.locator('.fx-banner');
            await banner.waitFor({ timeout: 8000 });
            check('apex: the one-time banner appears ("FinCalix now lives on Android — export your data")', (await banner.locator('h2').innerText()).includes('FinCalix now lives on Android — export your data'));
            await page.screenshot({ path: path.join(OUT, '2-apex-banner.png') });
            [download] = await Promise.all([page.waitForEvent('download'), banner.locator('[data-fx-export]').click()]);
        } else {
            const r = await new Promise((ok, ko) => http.get({ host: '127.0.0.1', port: PORT, path: '/', headers: { host: `www.fincalix.com:${PORT}` } }, (res) => { res.resume(); ok(res); }).on('error', ko));
            check('www: "/" still redirects to the apex', r.statusCode === 308 && r.headers.location === 'https://fincalix.com/', `${r.statusCode} ${r.headers.location}`);
            await page.goto(`${o.url}/export-my-data`, { waitUntil: 'networkidle' });
            const listed = await page.locator('[data-export-found] li').allInnerTexts();
            check('www: /export-my-data is served on www and lists the data found', listed.length > 0, listed.join(', '));
            await page.screenshot({ path: path.join(OUT, '2-www-export-page.png') });
            [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-export-button]').click()]);
        }
        const name = download.suggestedFilename();
        const file = path.join(OUT, `${o.id}-${name}`);
        await download.saveAs(file);
        files[o.id] = file;
        const env = JSON.parse(fs.readFileSync(file, 'utf8'));
        check(`${o.id}: file ${name} is the app's backup format (fincalix-backup-YYYYMMDD.json, app FinCalix, schema 1)`, /^fincalix-backup-\d{8}\.json$/.test(name) && env.app === 'FinCalix' && env.schema === 1);
        const diff = BACKUP_KEYS.filter((k) => (env.data[k] ?? null) !== (had[o.id][k] ?? null));
        check(`${o.id}: the file holds exactly what the browser had (${BACKUP_KEYS.length} keys)`, diff.length === 0, diff.join(', '));
    }
    await server.stop();
    await ctx.close();
}

// ── 3: Android app ─────────────────────────────────────────────────────────────
console.log(`\n3. Android app on ${SERIAL}: import each file`);
const adb = (...a) => execFileSync(ADB, ['-s', SERIAL, ...a], { encoding: 'utf8' });
const shot = (name) => fs.writeFileSync(path.join(OUT, name), execFileSync(ADB, ['-s', SERIAL, 'exec-out', 'screencap', '-p'], { maxBuffer: 64 * 1024 * 1024 }));

async function devtools() {
    for (let i = 0; i < 40; i++) {
        const sock = adb('shell', 'cat', '/proc/net/unix').match(/@(webview_devtools_remote_\d+)/);
        if (sock) {
            adb('forward', 'tcp:9339', `localabstract:${sock[1]}`);
            try {
                const list = await (await fetch('http://127.0.0.1:9339/json')).json();
                const t = list.find((x) => x.type === 'page' && /localhost/.test(x.url));
                if (t) return t.webSocketDebuggerUrl;
            } catch { /* not ready */ }
        }
        await sleep(500);
    }
    throw new Error('app WebView not inspectable (debug build with WebView debugging needed)');
}
async function evaluate(expr) {
    const ws = new WebSocket(await devtools());
    await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
    const res = await new Promise((ok) => {
        ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id === 1) ok(d); };
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true } }));
    });
    ws.close();
    if (res.result?.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description || 'evaluate failed');
    return res.result?.result?.value;
}
/** Tap the first on-screen element whose text or description matches (system file picker). */
async function tapText(re, tries = 20) {
    for (let i = 0; i < tries; i++) {
        adb('shell', 'uiautomator', 'dump', '/sdcard/ui.xml');
        const xml = adb('shell', 'cat', '/sdcard/ui.xml');
        for (const m of xml.matchAll(/<node [^>]*?(?:text|content-desc)="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)) {
            if (re.test(m[1])) {
                adb('shell', 'input', 'tap', String((+m[2] + +m[4]) >> 1), String((+m[3] + +m[5]) >> 1));
                return m[1];
            }
        }
        await sleep(700);
    }
    throw new Error(`nothing on screen matches ${re}`);
}
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');

const DL = '/sdcard/Download';
for (const o of ORIGINS) {
    const file = files[o.id];
    const env = JSON.parse(fs.readFileSync(file, 'utf8'));
    const onDevice = `fincalix-backup-${o.id}.json`;
    adb('shell', 'am', 'force-stop', 'com.fincalix.app');
    adb('shell', 'pm', 'clear', 'com.fincalix.app');
    // Answer the Android 13+ notification prompt up front (it would cover the file picker).
    try { adb('shell', 'pm', 'grant', 'com.fincalix.app', 'android.permission.POST_NOTIFICATIONS'); } catch { /* older Android */ }
    adb('shell', 'rm', '-f', `${DL}/fincalix-backup-apex.json`, `${DL}/fincalix-backup-www.json`);
    adb('push', file, `${DL}/${onDevice}`);
    try { adb('shell', 'content', 'call', '--method', 'scan_volume', '--uri', 'content://media', '--arg', 'external_primary'); } catch { /* best effort */ }
    adb('shell', 'monkey', '-p', 'com.fincalix.app', '-c', 'android.intent.category.LAUNCHER', '1');
    await sleep(7000);
    const empty = await evaluate('localStorage.getItem("fincalix_entries")');
    check(`${o.id}: app starts empty (fresh install state)`, !empty || empty === '[]');
    // Like a user: accept the first-launch disclaimer, open Settings, bring Import App Data on screen.
    await evaluate(`(async () => {
        const wait = (ms) => new Promise(r => setTimeout(r, ms));
        const box = () => document.querySelector('div.fixed.inset-0 .overflow-y-auto');
        for (let i = 0; i < 40 && !box(); i++) await wait(250);
        const btn = () => [...document.querySelectorAll('div.fixed.inset-0 button')].pop();
        for (let i = 0; i < 30 && btn() && btn().disabled; i++) { const b = box(); b.scrollTop = b.scrollHeight; b.dispatchEvent(new Event('scroll')); await wait(250); }
        if (btn()) btn().click();
        await wait(800);
        history.pushState({}, '', '/settings'); dispatchEvent(new PopStateEvent('popstate'));
        await wait(1500);
        const label = [...document.querySelectorAll('p')].find(p => p.textContent.trim() === 'Import App Data');
        label.scrollIntoView({ block: 'center' });
        await wait(600);
        return true;
    })()`);
    // A real tap (a scripted click cannot open Android's file chooser).
    await tapText(/^Import App Data/);
    await sleep(2500);
    shot(`3-${o.id}-system-file-picker.png`);
    // System picker: the file may be listed directly; otherwise go to Downloads first.
    const fileRe = new RegExp(`^${escRe(onDevice)}$`);
    try { await tapText(fileRe, 3); } catch {
        try { await tapText(/^Show roots$/i, 2); await sleep(800); } catch { /* drawer already open */ }
        await tapText(/^Downloads$/);
        await sleep(1500);
        await tapText(fileRe);
    }
    await sleep(1500);
    shot(`3-${o.id}-restore-dialog.png`);
    const restored = await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Restore'); if (b) b.click(); return !!b; })()`);
    check(`${o.id}: the app asks "Restore from backup?" and the user taps Restore`, restored === true);
    await sleep(6000);   // restore, toast, app restarts
    const after = await evaluate(`(${readKeys.toString()})(${JSON.stringify(BACKUP_KEYS)})`);
    const changed = BACKUP_KEYS.filter((k) => (after[k] ?? null) !== (env.data[k] ?? null));
    const entries = JSON.parse(after.fincalix_entries || '[]');
    const hist = JSON.parse(after['calculator-storage'] || '{}')?.state?.history || [];
    const histWeb = JSON.parse(env.data['calculator-storage'] || '{}')?.state?.history || [];
    check(`${o.id}: the app now holds the web expense (₹${o.amount}, "${o.note}") and the SIP calculation`,
        entries.some((e) => String(e.amount) === o.amount && e.description === o.note) && JSON.stringify(hist) === JSON.stringify(histWeb), `${entries.length} entries, ${hist.length} history`);
    check(`${o.id}: every backed-up key in the app matches the file after the restart`, changed.length === 0,
        changed.length ? `differ: ${changed.join(', ')}` : `${BACKUP_KEYS.length - changed.length}/${BACKUP_KEYS.length} identical`);
    fs.writeFileSync(path.join(OUT, `3-${o.id}-app-storage-after-import.json`), JSON.stringify(after, null, 2));
    await evaluate(`(async () => { history.pushState({}, '', '/expenses'); dispatchEvent(new PopStateEvent('popstate')); await new Promise(r => setTimeout(r, 1500)); const d = [...document.querySelectorAll('button')].find(b => /Daily/.test(b.textContent)); if (d) d.click(); await new Promise(r => setTimeout(r, 1500)); return true; })()`);
    shot(`3-${o.id}-app-expenses-after-import.png`);
}

console.log(`\n${passed} passed, ${failed} failed — evidence in ${path.relative(process.cwd(), OUT)}`);
process.exit(failed ? 1 : 0);
