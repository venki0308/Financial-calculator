// QA audit: notification times are fixed in IST — the morning quote at 07:00 IST and the evening
// "log today's expenses" reminder at 20:00 IST — whatever the phone's time zone, and both are in the
// user's selected language.
//   node scripts/qa-notification-times.mjs
// Runs src/utils/istTime.ts in child processes with different TZ settings (India, New York, London,
// Dubai, Auckland) and checks the scheduler uses it.
import fs from 'node:fs';
import { buildSync } from 'esbuild';
import { execFileSync } from 'node:child_process';

let passed = 0, failed = 0;
const check = (label, ok, detail = '') => { ok ? passed++ : failed++; console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  [${detail}]` : ''}`); };

if (process.env.QA_IST_CHILD) {
    // Child: print the slots for a few "now" instants as JSON, in this process's TZ.
    const mod = await import('data:text/javascript;base64,' + process.env.QA_IST_CHILD);
    const nows = ['2026-11-18T05:00:00Z', '2026-11-17T23:00:00Z', '2026-12-31T20:00:00Z', '2027-02-28T19:00:00Z'];
    const out = nows.map((n) => ({
        now: n,
        quote: Array.from({ length: 14 }, (_, i) => { const s = mod.istSlot(i, mod.QUOTE_HOUR_IST, 0, new Date(n)); return { at: s.at.toISOString(), day: [s.day.getFullYear(), s.day.getMonth() + 1, s.day.getDate()] }; }),
        log: Array.from({ length: 7 }, (_, i) => mod.istSlot(i, mod.LOG_REMINDER_HOUR_IST, 0, new Date(n)).at.toISOString()),
    }));
    console.log(JSON.stringify(out));
    process.exit(0);
}

const code = buildSync({ entryPoints: ['src/utils/istTime.ts'], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error' }).outputFiles[0].text;
const b64 = Buffer.from(code).toString('base64');

// Expected, computed independently: IST = UTC+05:30; 07:00 IST = 01:30Z, 20:00 IST = 14:30Z on the IST date.
const istDate = (iso) => { const t = new Date(new Date(iso).getTime() + 5.5 * 3600e3); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; };
const addDays = ([y, m, d], n) => { const t = new Date(Date.UTC(y, m - 1, d + n)); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; };
const iso = ([y, m, d], hh, mm) => new Date(Date.UTC(y, m - 1, d, hh, mm)).toISOString();

console.log('\n1. Slots are 07:00 and 20:00 IST in every phone time zone');
for (const tz of ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Pacific/Auckland']) {
    const res = JSON.parse(execFileSync(process.execPath, [new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')], { env: { ...process.env, TZ: tz, QA_IST_CHILD: b64 }, encoding: 'utf8' }));
    const bad = [];
    for (const r of res) {
        const today = istDate(r.now);
        r.quote.forEach((q, i) => {
            const day = addDays(today, i);
            if (q.at !== iso(day, 1, 30)) bad.push(`${r.now} quote+${i} ${q.at} ≠ ${iso(day, 1, 30)}`);
            if (q.day.join('-') !== day.join('-')) bad.push(`${r.now} quote+${i} picks ${q.day.join('-')} ≠ IST date ${day.join('-')}`);
        });
        r.log.forEach((at, i) => { const day = addDays(today, i); if (at !== iso(day, 14, 30)) bad.push(`${r.now} log+${i} ${at}`); });
    }
    check(`${tz}: 14 quote slots at 07:00 IST (01:30 UTC) on consecutive IST dates, quote of that IST date; 7 reminder slots at 20:00 IST (14:30 UTC); across month, year and 28/29 Feb ends`, bad.length === 0, bad.slice(0, 2).join(' | '));
}

console.log('\n2. The scheduler uses these slots and the user\'s language');
const sch = fs.readFileSync('src/services/NotificationScheduler.ts', 'utf8');
check('daily quote: istSlot(i, QUOTE_HOUR_IST), quote picked by the IST day, title from quote.dailyTitle in the user\'s language', /istSlot\(i, QUOTE_HOUR_IST\)/.test(sch) && /quoteTextFor\(langKey, day\)/.test(sch) && /getFixedT\(langKey\)\('quote\.dailyTitle'/.test(sch));
check('evening reminder: istSlot(i, LOG_REMINDER_HOUR_IST), title/body from notifText.* in the user\'s language', /istSlot\(i, LOG_REMINDER_HOUR_IST\)/.test(sch) && /getFixedT\(await notificationLang\(\)\)/.test(sch) && /'notifText\.logTitle'/.test(sch) && /'notifText\.logBody'/.test(sch));
check('no fixed phone-local hours left for these two (setHours(8 / 20, 30)', !/setHours\(8,\s*0/.test(sch) && !/setHours\(20,\s*30/.test(sch));
const ist = await import('data:text/javascript;base64,' + b64);
check('QUOTE_HOUR_IST = 7, LOG_REMINDER_HOUR_IST = 20', ist.QUOTE_HOUR_IST === 7 && ist.LOG_REMINDER_HOUR_IST === 20);
const settings = fs.readFileSync('src/pages/Settings.tsx', 'utf8');
const ch = settings.slice(settings.indexOf('const changeLanguage'), settings.indexOf('const changeLanguage') + 700);
check('changing the language in Settings reschedules the notifications at once', /refreshReminders\(\)/.test(ch));
const missing = [];
for (const l of ['en', 'hi', 'te', 'ta', 'kn', 'ml']) {
    const j = JSON.parse(fs.readFileSync(`src/locales/${l}.json`, 'utf8'));
    for (const k of ['logTitle', 'logBody']) if (!j.notifText?.[k]) missing.push(`${l}.notifText.${k}`);
    if (!j.quote?.dailyTitle) missing.push(`${l}.quote.dailyTitle`);
    if (l !== 'en' && j.notifText?.logTitle === JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8')).notifText.logTitle) missing.push(`${l} reminder not translated`);
}
check('notification texts present and translated in all 6 languages', missing.length === 0, missing.join(', '));

console.log(`\n═══════════════════════════════════════════════════════════════\n  RESULTS: ${passed} passed, ${failed} failed\n═══════════════════════════════════════════════════════════════`);
process.exit(failed ? 1 : 0);
