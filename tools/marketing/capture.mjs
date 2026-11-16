// Real app screens for the marketing images.
//
//   node tools/marketing/capture.mjs                     everything
//   node tools/marketing/capture.mjs --lang=te,hi        only these languages
//   node tools/marketing/capture.mjs --theme=dark        only this theme
//   node tools/marketing/capture.mjs --screen=tax,emi    only these screens (and their -2/-3 views)
//   node tools/marketing/capture.mjs --port=4331         preview port (default 4331)
//
// Serves the production build in dist/ (run "npm run build" first if it is
// missing), opens it in headless Google Chrome at an Android phone size,
// enters the fictional demo inputs from demo-data.mjs through the app's own
// forms and saves what the app shows. Nothing is drawn or edited: every figure
// in a capture, and every figure in facts.json, is read from the running app.
//
// Output (marketing-assets/_captures):
//   <lang>/<theme>/<id>.png   1082 x 2402 px (412 x 915 CSS px at 2.625x)
//   captures.json             one row per PNG
//   facts.json                the figures the app computed, as it displays them
//
// A partial run (any filter) only replaces the rows and facts it regenerates.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as D from './demo-data.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(ROOT, 'marketing-assets', '_captures');

// ── What to capture ─────────────────────────────────────────────────────────
const EN_SCREENS = [
    'home', 'tax', 'tax-zero', 'emi', 'emi-amortisation', 'foreclosure', 'sip', 'fd', 'rd', 'ppf', 'hra', 'gst',
    'expenses-monthly', 'expenses-yearly', 'expenses-budget', 'goal-planner', 'advisor', 'schemes', 'scheme-detail',
    'world-clock', 'export', 'settings-language', 'data-privacy', 'calculators', 'cc-payoff', 'reminders',
];
const LOCAL_DARK = ['home', 'tax', 'emi', 'foreclosure', 'sip', 'expenses-monthly', 'goal-planner', 'schemes', 'export', 'settings-language'];
const LOCAL_LIGHT = ['home', 'tax', 'emi'];
const PLAN = {
    en: { dark: EN_SCREENS, light: EN_SCREENS },
    te: { dark: LOCAL_DARK, light: LOCAL_LIGHT },
    hi: { dark: LOCAL_DARK, light: LOCAL_LIGHT },
    // Light home screens are used by the website's language section.
    ta: { dark: ['home'], light: ['home'] },
    kn: { dark: ['home'], light: ['home'] },
    ml: { dark: ['home'], light: ['home'] },
};

const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v = 'true'] = a.slice(2).split('=');
    return [k, v];
}));
const list = (v) => (v ? v.split(',').map(x => x.trim()).filter(Boolean) : null);
const onlyLangs = list(args.lang);
const onlyThemes = list(args.theme);
const onlyScreens = list(args.screen);
const PORT = Number(args.port || 4331);
const PARTIAL = !!(onlyLangs || onlyThemes || onlyScreens);

// ── Translations (read-only) ────────────────────────────────────────────────
// Steps are written against the English UI text. For other languages the same
// control is found through the locale files: English text → key(s) → the
// translated text. Text the app leaves in English still matches as English.
const flatten = (obj, prefix = '', out = {}) => {
    for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === 'object') flatten(v, `${prefix}${k}.`, out);
        else out[prefix + k] = v;
    }
    return out;
};
const locale = (lang) => flatten(JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'locales', `${lang}.json`), 'utf8')));
const EN = locale('en');
const KEYS_BY_TEXT = new Map();
for (const [key, value] of Object.entries(EN)) {
    if (typeof value !== 'string') continue;
    if (!KEYS_BY_TEXT.has(value)) KEYS_BY_TEXT.set(value, []);
    KEYS_BY_TEXT.get(value).push(key);
}
const LOCALES = { en: EN };
const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ── Preview server ──────────────────────────────────────────────────────────
/** The app's Home: "/app" on a web build (the website is at "/"), "/" on a plain app build. */
let HOME = '/';

async function startPreview() {
    if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) throw new Error('dist/ is missing: run "npm run build" first');
    // After "npm run build:web" dist/index.html is the website and the app is app.html:
    // serve dist/ the way Vercel does instead of vite preview (which sends every route to index.html).
    if (fs.existsSync(path.join(ROOT, 'dist', 'app.html'))) {
        const { serveDist } = await import('../../scripts/landing/serve-dist.mjs');
        const prev = process.cwd();
        process.chdir(ROOT);
        const server = await serveDist({ port: PORT });
        process.chdir(prev);
        HOME = '/app';
        return { base: server.base, stop: () => { server.stop(); } };
    }
    const base = `http://127.0.0.1:${PORT}`;
    const up = async () => { try { return (await fetch(base)).ok; } catch { return false; } };
    if (await up()) throw new Error(`port ${PORT} is already in use: stop that server or pass --port=`);
    const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
    const stop = () => { try { child.kill(); } catch { /* already gone */ } };
    process.on('exit', stop);
    process.on('SIGINT', () => { stop(); process.exit(130); });
    for (let i = 0; i < 80; i++) {
        if (await up()) return { base, stop };
        await new Promise(r => setTimeout(r, 250));
    }
    stop();
    throw new Error('preview server did not start');
}

// ── Browser profile ─────────────────────────────────────────────────────────
// Runs before any app code on every page load.
function initScript({ nowIso, css }) {
    // "Today" is pinned to the demo date so the sample month is always the
    // current month. Only Date is shifted: timers and animations run normally.
    const Real = Date;
    const offset = new Real(nowIso).getTime() - Real.now();
    const now = () => Real.now() + offset;
    window.Date = new Proxy(Real, {
        construct: (t, a) => (a.length ? new t(...a) : new t(now())),
        apply: (t) => new t(now()).toString(),
        get: (t, p) => (p === 'now' ? now : Reflect.get(t, p)),
    });
    // The green "Get App" strip is a web-only install banner (Layout.tsx); the
    // Android app does not have it, so it is hidden here, not in the source.
    const add = () => {
        const s = document.createElement('style');
        s.id = 'marketing-capture';
        s.textContent = css;
        document.documentElement.appendChild(s);
    };
    if (document.documentElement) add(); else document.addEventListener('readystatechange', add, { once: true });
}
const CAPTURE_CSS = [
    // Android draws Hindi, Telugu, Tamil, Kannada and Malayalam with Noto Sans.
    // Chrome on Windows would fall back to Nirmala UI, so load Noto Sans here to
    // show the text as it looks on a phone. Latin text keeps the app font.
    '@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800&family=Noto+Sans+Telugu:wght@400;500;600;700;800&family=Noto+Sans+Tamil:wght@400;500;600;700;800&family=Noto+Sans+Kannada:wght@400;500;600;700;800&family=Noto+Sans+Malayalam:wght@400;500;600;700;800&display=block");',
    'body { font-family: "Plus Jakarta Sans", "Noto Sans Devanagari", "Noto Sans Telugu", "Noto Sans Tamil", "Noto Sans Kannada", "Noto Sans Malayalam", system-ui, -apple-system, sans-serif !important; }',
    '.app-container > div.sticky.top-0.from-emerald-600 { display: none !important; }',
    '* { caret-color: transparent !important; }',
    '::-webkit-scrollbar { display: none; }',
].join('\n');

function seedStorage({ lang, dark, entries, budgets }) {
    localStorage.clear();
    localStorage.setItem('fincalix_dev_access', 'true');               // full app instead of the landing page
    localStorage.setItem('fincalix_disclaimer_accepted_v4', 'true');   // first-launch disclaimer already accepted
    localStorage.setItem('fincalix_analytics_consent', 'denied');      // analytics off during captures
    localStorage.setItem('fincalix_analytics_test_traffic', '1');      // and flagged as test traffic if ever sent
    localStorage.setItem('language', lang);
    localStorage.setItem('settings-storage', JSON.stringify({
        state: { darkMode: dark, language: lang, notifications: { priceAlerts: true, newSchemes: true, calcReminders: true, appUpdates: true, dailyQuotes: true, logReminder: true } },
        version: 0,
    }));
    localStorage.setItem('fincalix_entries', JSON.stringify(entries));
    localStorage.setItem('fincalix_budgets', JSON.stringify(budgets));
}

// ── One language + theme ────────────────────────────────────────────────────
class Session {
    constructor({ page, base, lang, theme, wanted, records, facts, problems }) {
        Object.assign(this, { page, base, lang, theme, wanted, records, facts, problems });
        this.extras = lang === 'en';      // -2 / -3 views are English only
        this.route = '/';
        if (!LOCALES[lang]) LOCALES[lang] = locale(lang);
    }
    want(...ids) { return ids.some(id => this.wanted.has(id)); }
    /** English UI text → every way the current language may show it. */
    T(text) {
        const out = new Set([text]);
        if (this.lang !== 'en') for (const key of KEYS_BY_TEXT.get(text) || []) {
            const v = LOCALES[this.lang][key];
            if (typeof v === 'string' && v) out.add(v);
        }
        return [...out];
    }
    rx(text, exact = false) {
        const alt = this.T(text).map(escapeRx).join('|');
        // Case-insensitive: many labels are upper-cased by CSS only.
        return new RegExp(exact ? `^\\s*(?:${alt})\\s*$` : `(?:${alt})`, 'i');
    }
    /** Click a show/hide button and return the element itself (its text changes once open). */
    async open(text) {
        const handle = await this.button(text).elementHandle();
        await handle.click();
        await this.wait(700);
        return handle;
    }
    button(text, exact = false) { return this.page.getByRole('button', { name: this.rx(text, exact) }).first(); }
    label(text) { return this.page.getByText(this.rx(text, true)).first(); }
    wait(ms) { return this.page.waitForTimeout(ms); }

    async goto(route, { wait = 900 } = {}) {
        this.route = route;
        await this.page.goto(this.base + route, { waitUntil: 'load' });
        await this.page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        await this.page.waitForFunction(() => document.querySelector('h1, nav') && !document.body.innerText.trim().startsWith('Loading'), null, { timeout: 15000 });
        if (this.lang !== 'en') {
            // Non-English bundles load after first paint: wait for the tab bar to switch.
            await this.page.waitForFunction(() => { const n = document.querySelector('nav'); return !n || !/Home|Calculate|Profile/.test(n.innerText); }, null, { timeout: 15000 });
        }
        await this.page.evaluate(() => document.fonts.ready);
        await this.wait(wait);
    }

    /** Type into the nth <input> of the page (document order, same in every language). */
    async fill(index, value, expectLabel) {
        const el = this.page.locator('input').nth(index);
        if (this.lang === 'en' && expectLabel) {
            const found = await el.evaluate((node) => {
                for (let p = node.parentElement, k = 0; p && k < 4; p = p.parentElement, k++) { const l = p.querySelector('label'); if (l) return l.innerText; }
                return '';
            });
            if (!found.toLowerCase().includes(expectLabel.toLowerCase())) throw new Error(`input ${index} is "${found}", expected "${expectLabel}"`);
        }
        await el.scrollIntoViewIfNeeded();
        await el.click();
        await el.fill(String(value));
        await el.evaluate(node => node.blur());
        await this.wait(150);
    }
    /** What a field shows once it has lost focus, e.g. "₹45,00,000", "8.5%", "20 years". */
    async shown(index) {
        return this.page.locator('input').nth(index).evaluate((node) => {
            const text = [...node.parentElement.childNodes].map(n => (n === node ? node.value : n.textContent || '')).join('').replace(/\s+/g, ' ').trim();
            return text.replace(/(\d)\s*([A-Za-z]+)$/, (m, digit, unit) => `${digit} ${unit.toLowerCase()}`);
        });
    }

    /** Scroll so the element (or the card around it) starts at the top of the
     *  screen with a small margin, or just under a header that stays pinned. */
    async align(target, { card = true, gap } = {}) {
        const loc = typeof target === 'string' ? this.label(target) : target;
        await loc.evaluate((el, { card, gap }) => {
            const box = card ? (el.closest('[class*="rounded-2xl"], [class*="rounded-3xl"]') || el) : el;
            const place = (offset) => window.scrollTo(0, Math.max(0, box.getBoundingClientRect().top + window.scrollY - offset));
            place(gap ?? 16);
            let pinned = 0;
            for (const h of document.querySelectorAll('.sticky, .fixed')) {
                const cs = getComputedStyle(h);
                const r = h.getBoundingClientRect();
                const sticks = cs.position === 'sticky' || cs.position === 'fixed';
                if (sticks && cs.display !== 'none' && r.width > 300 && r.top <= 1 && r.bottom > 0 && r.height < 320 && !h.contains(box) && !box.contains(h)) pinned = Math.max(pinned, r.bottom);
            }
            if (pinned) place(pinned + (gap ?? 14));
        }, { card, gap });
        await this.wait(350);
    }
    async top() { await this.page.evaluate(() => window.scrollTo(0, 0)); await this.wait(250); }

    async lines() {
        return (await this.page.evaluate(() => document.body.innerText)).split('\n').map(l => l.trim()).filter(Boolean);
    }

    /** Save a capture. `stem` is the file name: "<id>" or "<id>-2" for an extra view. */
    async snap(stem, note) {
        const id = stem.replace(/-\d+$/, '');
        if (!this.wanted.has(id) || (id !== stem && !this.extras)) return;
        const { page, lang, theme } = this;
        await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
        await page.waitForFunction(() => !document.getElementById('fncx-toast'), null, { timeout: 6000 }).catch(() => {});
        await page.evaluate(() => document.fonts.ready);
        await this.wait(900);
        const issue = await page.evaluate(() => {
            const seen = (sel) => [...document.querySelectorAll(sel)].some(e => e.getBoundingClientRect().height > 0);
            if (seen('[aria-labelledby="analytics-consent-title"]')) return 'analytics consent dialog is open';
            if (seen('[role="alertdialog"]')) return 'storage dialog is open';
            if (seen('#fncx-toast')) return 'a toast is visible';
            if (seen('.app-container > div.from-emerald-600')) return 'the web install banner is visible';
            const bad = document.body.innerText.match(/\bNaN\b|\bundefined\b|\bInfinity\b/);
            return bad ? `the page shows "${bad[0]}"` : '';
        });
        if (issue) this.problems.push(`${lang}/${theme}/${stem}: ${issue}`);
        const file = `${lang}/${theme}/${stem}.png`;
        fs.mkdirSync(path.join(OUT, lang, theme), { recursive: true });
        await page.screenshot({ path: path.join(OUT, file) });
        this.records.push({ file, id: stem, lang, theme, route: this.route, note });
        console.log(`  ${file}`);
    }
}

/** First line after the anchors (found in order) that looks like the wanted value. */
function pick(lines, anchors, match = /₹|NIL/) {
    let i = -1;
    for (const a of [].concat(anchors)) {
        i = lines.findIndex((l, k) => k > i && (a instanceof RegExp ? a.test(l) : l === a));
        if (i < 0) return null;
    }
    for (let k = i + 1; k < Math.min(lines.length, i + 8); k++) if (match.test(lines[k])) return lines[k];
    return null;
}
const rupees = (n) => `₹${n.toLocaleString('en-IN')}`;
const unsigned = (v) => (v ? v.replace(/^[-+−]\s*/, '') : v);

// ── Screens ─────────────────────────────────────────────────────────────────
const FLOWS = [
    {
        ids: ['home'],
        async run(s) {
            await s.goto(HOME, { wait: 2000 });
            await s.snap('home', 'Home: search box, My Budget (seeded sample month) and the daily quote card');
            if (!s.extras) return;
            await s.align('Smart Planner');
            await s.snap('home-2', 'Home, scrolled: planner tools, My Loans, Business Tracker, World Clock');
        },
    },
    {
        ids: ['tax'],
        async run(s) {
            await s.goto('/calculator/income-tax');
            await s.button('Annual Salary').click();
            await s.fill(0, D.TAX.annualSalary, 'Basic Salary');
            await s.button('Old Regime').click();
            await s.wait(400);
            await s.fill(15, D.TAX.deductions.homeLoanInterest, 'Home Loan Interest');
            await s.fill(16, D.TAX.deductions.sec80C, '80C');
            await s.fill(18, D.TAX.deductions.sec80D, '80D');
            await s.wait(500);
            const oldLines = s.facts ? await s.lines() : [];
            if (s.extras) {
                await s.align(s.page.locator('input').nth(16));
                await s.snap('tax-3', 'Income tax, Old Regime tab: deduction inputs (80C, NPS, 80D)');
                await s.align(s.page.locator('input').nth(15));
                await s.snap('tax-5', 'Income tax, Old Regime tab: housing benefits with home-loan interest');
            }

            await s.button('New Regime').click();
            await s.wait(600);
            await s.align('Old vs New Regime');
            await s.snap('tax', 'Income tax FY 2026-27: Old vs New Regime with the tax under each and the recommended regime');
            if (s.extras) {
                await s.align(s.button('New Regime'));
                await s.snap('tax-2', 'Income tax: regime tabs, input mode and the annual salary input');
                await s.align(s.page.getByText(/total tax/i).first());
                await s.snap('tax-4', 'Income tax, New Regime: total tax, monthly TDS and step-by-step breakdown');
            }

            if (!s.facts) return;
            const L = await s.lines();
            const d = D.TAX.deductions;
            Object.assign(s.facts.tax ??= {}, {
                salary: pick(L, 'Gross Annual Income'),
                newRegimeTax: pick(L, ['Old vs New Regime', 'New Regime']),
                oldRegimeTax: pick(L, ['Old vs New Regime', 'Old Regime']),
                betterRegime: pick(L, 'Recommended Regime', /Regime/),
                saving: (pick(L, 'Recommended Regime', /Estimated Tax Saving/) || '').replace(/^.*?(₹[\d,]+).*$/, '$1') || null,
                deductionsUsed: `${rupees(d.sec80C)} under Section 80C, ${rupees(d.sec80D)} under Section 80D and ${rupees(d.homeLoanInterest)} home-loan interest`,
                oldRegimeTotalDeductions: unsigned(pick(oldLines, 'Total Deductions')),
                oldRegimeTaxableIncome: pick(oldLines, 'Taxable Income'),
                newRegimeTaxableIncome: pick(L, 'Taxable Income'),
                newRegimeStandardDeduction: unsigned(pick(L, 'Standard Deduction')),
                financialYear: 'FY 2026-27',
            });
        },
    },
    {
        ids: ['tax-zero'],
        async run(s) {
            await s.goto('/calculator/income-tax');
            await s.button('Annual Salary').click();
            await s.fill(0, D.TAX.zeroTaxSalary, 'Basic Salary');
            await s.wait(500);
            await s.align('Salary Summary');
            await s.snap('tax-zero', 'Income tax, New Regime, salary 12,75,000: taxable income 12,00,000 and "No Tax Payable"');
            await s.align('Old vs New Regime');
            await s.snap('tax-zero-2', 'Income tax, salary 12,75,000: Old vs New Regime comparison');
            if (!s.facts) return;
            const L = await s.lines();
            Object.assign(s.facts.tax ??= {}, {
                zeroTaxSalary: pick(L, 'Gross Annual Income'),
                zeroTaxNewRegimeTax: pick(L, 'Final Tax Liability'),
                zeroTaxHeadline: pick(L, /NEW REGIME — TOTAL TAX/, /₹|NIL/),
                zeroTaxMessage: L.find(l => l === 'No Tax Payable') || null,
                zeroTaxTaxableIncome: pick(L, 'Taxable Income'),
                zeroTaxOldRegimeTax: pick(L, ['Old vs New Regime', 'Old Regime']),
            });
        },
    },
    {
        ids: ['emi', 'emi-amortisation', 'foreclosure'],
        async run(s) {
            const loan = async () => {
                await s.goto('/calculator/home-loan');
                await s.fill(0, D.HOME_LOAN.amount, 'Loan Amount');
                await s.fill(1, D.HOME_LOAN.rate, 'Interest Rate');
                await s.fill(2, D.HOME_LOAN.years, 'Loan Tenure');
                await s.wait(600);
            };
            if (s.want('emi', 'emi-amortisation')) {
                await loan();
                await s.wait(900);
                await s.align('Monthly EMI');
                await s.snap('emi', 'Home loan EMI result: monthly EMI, principal, total interest and total payment');
                await s.align(s.page.locator('input').nth(0));
                await s.snap('emi-2', 'Home loan EMI: loan amount, interest rate and tenure inputs');
                if (s.facts) {
                    const L = await s.lines();
                    s.facts.emi = {
                        principal: await s.shown(0), rate: await s.shown(1), tenure: await s.shown(2),
                        emi: pick(L, 'Monthly EMI'), totalInterest: pick(L, 'INTEREST'), totalPayment: pick(L, 'Total Payment'),
                    };
                }
                if (s.want('emi-amortisation')) {
                    await s.open('View Amortization Schedule');
                    await s.align(s.page.locator('table').first(), { gap: 10 });
                    await s.snap('emi-amortisation', 'Home loan: month-by-month amortisation schedule (first year)');
                }
            }
            if (!s.want('foreclosure')) return;
            await loan();
            await s.button('Part-Payment What-If').click();
            await s.wait(500);
            await s.fill(4, D.PART_PAYMENT.amount, 'Part-payment amount');
            await s.fill(5, D.PART_PAYMENT.afterMonth, 'Paid in month');
            await s.wait(600);
            await s.align('What if I make a part-payment?', { gap: 10 });
            await s.snap('foreclosure', 'Home loan part-payment what-if: one-time part payment, interest saved and how much earlier the loan ends');
            let part = null;
            if (s.facts) {
                const L = await s.lines();
                part = {
                    amount: await s.shown(4), month: await s.shown(5),
                    earlier: pick(L, 'SAME EMI, LOAN ENDS EARLY', /earlier/),
                    saved: (L.find(l => /^Interest saved:/.test(l)) || '').replace(/^.*?(₹[\d,]+).*$/, '$1') || null,
                    versusReduceEmi: L.find(l => /^Reduce Tenure saves/.test(l)) || null,
                };
            }
            if (!s.extras && !s.facts) return;
            await loan();
            await s.button('Foreclosure Calculator').click();
            await s.wait(500);
            await s.fill(4, D.FORECLOSURE.monthsPaid, 'Months Already Paid');
            await s.fill(5, D.FORECLOSURE.chargePct, 'Foreclosure Charge');
            await s.wait(600);
            await s.align('Foreclosure Simulation', { gap: 10 });
            await s.snap('foreclosure-2', 'Home loan foreclosure simulation: closing the loan in full after 36 EMIs with no foreclosure charge');
            if (!s.facts) return;
            const L = await s.lines();
            const h = D.HOME_LOAN;
            s.facts.foreclosure = {
                scenario: `One part payment of ${part.amount} in month ${D.PART_PAYMENT.afterMonth} (after 3 years) on a ${rupees(h.amount)} loan at ${h.rate}% for ${h.years} years, EMI unchanged`,
                interestSaved: part.saved,
                tenureReduced: part.earlier,
                anyOtherHeadlineFigure: part.versusReduceEmi,
                fullClosure: {
                    scenario: `Closing the same loan in full after ${D.FORECLOSURE.monthsPaid} EMIs with a ${D.FORECLOSURE.chargePct}% foreclosure charge`,
                    outstandingPrincipal: pick(L, 'OUTSTANDING PRINCIPAL'),
                    interestAlreadyPaid: pick(L, 'INTEREST ALREADY PAID'),
                    interestYouSkip: pick(L, 'INTEREST YOU SKIP'),
                    payBankTodayToClose: pick(L, 'PAY BANK TODAY TO CLOSE'),
                    youSave: pick(L, 'You save'),
                },
            };
        },
    },
    {
        ids: ['sip'],
        async run(s) {
            await s.goto('/calculator/sip');
            await s.fill(0, D.SIP.monthly, 'Monthly Investment');
            await s.fill(1, D.SIP.rate, 'Expected Return');
            await s.fill(2, D.SIP.years, 'Time Period');
            await s.wait(1300);
            await s.align('Expected Future Value');
            await s.snap('sip', 'SIP result: expected future value with the invested vs returns split');
            if (s.extras) {
                await s.top();
                await s.snap('sip-2', 'SIP inputs: monthly investment, expected return and time period, with the result below');
                await s.align('Year-wise Growth');
                await s.wait(600);
                await s.snap('sip-3', 'SIP year-wise growth chart (invested vs returns) and smart insights');
            }
            if (!s.facts) return;
            const read = async () => pick(await s.lines(), 'Expected Future Value');
            const L = await s.lines();
            s.facts.sip = {
                monthly: await s.shown(0), years: await s.shown(2), rate: await s.shown(1),
                invested: pick(L, 'INVESTED'), returns: pick(L, 'RETURNS'), maturity: pick(L, 'Expected Future Value'),
            };
            s.facts.sipExtra = {};
            for (const y of D.SIP.extraYears) {
                await s.fill(2, y, 'Time Period');
                await s.wait(500);
                s.facts.sipExtra[`y${y}`] = await read();
            }
        },
    },
    {
        ids: ['fd'],
        async run(s) {
            await s.goto('/calculator/fixed-deposit');
            await s.fill(0, D.FD.principal, 'Deposit Amount');
            await s.fill(2, D.FD.years, 'Tenure');
            await s.wait(900);
            await s.align('MATURITY AMOUNT');
            await s.snap('fd', 'Fixed deposit result: maturity amount, invested amount and interest');
            await s.align(s.page.locator('input').nth(0));
            await s.snap('fd-2', 'Fixed deposit inputs: deposit, rate and tenure');
            if (!s.facts) return;
            const L = await s.lines();
            s.facts.fd = {
                principal: await s.shown(0), rate: await s.shown(1), tenure: await s.shown(2),
                maturity: pick(L, 'MATURITY AMOUNT'), interest: pick(L, ['MATURITY AMOUNT', 'INTEREST']),
                compounding: 'Quarterly (app default)',
            };
        },
    },
    {
        ids: ['rd'],
        async run(s) {
            await s.goto('/calculator/recurring-deposit');
            await s.fill(0, D.RD.monthly, 'MONTHLY DEPOSIT');
            await s.fill(2, D.RD.months, 'TIME PERIOD');
            await s.wait(900);
            await s.top();
            await s.snap('rd', 'Recurring deposit: inputs with maturity amount, total invested and wealth gained');
            if (!s.facts) return;
            const L = await s.lines();
            const value = (i) => s.page.locator('input').nth(i).inputValue();
            s.facts.rd = {
                monthly: rupees(Number(await value(0))), rate: `${await value(1)}%`, tenure: `${await value(2)} months`,
                tenureYears: `${Number(await value(2)) / 12} years`,
                maturity: pick(L, 'MATURITY AMOUNT'), interest: unsigned(pick(L, 'WEALTH GAINED')),
                invested: pick(L, 'TOTAL INVESTED'), yield: (L.find(l => /^YIELD:/.test(l)) || '').replace(/^YIELD:\s*/, '') || null,
            };
        },
    },
    {
        ids: ['ppf'],
        async run(s) {
            await s.goto('/calculator/ppf');
            await s.button('Yearly', true).click();
            await s.fill(0, D.PPF.yearly, 'Investment Per');
            await s.fill(2, D.PPF.years, 'Investment Period');
            await s.wait(700);
            await s.open('View Year-by-Year Breakdown');
            await s.align('Maturity Value');
            await s.snap('ppf', 'PPF result: maturity value, total invested and interest earned, with the start of the year-by-year table');
            await s.align(s.page.locator('table').first(), { gap: 10 });
            await s.snap('ppf-2', 'PPF year-by-year breakdown table (all 15 years)');
            await s.top();
            await s.snap('ppf-3', 'PPF inputs: yearly deposit, current rate and period');
            if (!s.facts) return;
            const L = await s.lines();
            s.facts.ppf = {
                yearly: await s.shown(0), years: await s.shown(2), rate: await s.shown(1),
                invested: pick(L, 'TOTAL INVESTED'), interest: pick(L, 'INTEREST EARNED'), maturity: pick(L, 'Maturity Value'),
                rateNote: L.find(l => /^Current govt\. rate/.test(l)) || null,
            };
        },
    },
    {
        ids: ['hra'],
        async run(s) {
            await s.goto('/calculator/hra');
            await s.button('MONTHLY', true).click();
            await s.wait(300);
            await s.fill(0, D.HRA.basicMonthly, 'BASIC SALARY');
            await s.fill(2, D.HRA.hraMonthly, 'HRA RECEIVED');
            await s.fill(3, D.HRA.rentMonthly, 'RENT PAID');
            const metro = s.page.locator('button.w-12.h-7').first();
            const on = await metro.evaluate(el => el.className.includes('bg-primary'));
            if (on !== D.HRA.metro) await metro.click();
            await s.wait(700);
            await s.top();
            await s.snap('hra', 'HRA calculator (monthly, metro): inputs with exempt and taxable HRA');
            await s.align(await s.open('Calculation Breakdown'), { card: false });
            await s.snap('hra-2', 'HRA calculation breakdown: the three limits compared');
            if (!s.facts) return;
            const L = await s.lines();
            s.facts.hra = {
                exempt: pick(L, 'MONTHLY EXEMPTED HRA'), taxable: pick(L, 'TAXABLE HRA'), received: pick(L, 'TOTAL RECEIVED'),
                period: 'per month', city: 'Metro',
            };
            await s.button('ANNUAL', true).click();
            await s.wait(600);
            const A = await s.lines();
            Object.assign(s.facts.hra, { exemptAnnual: pick(A, 'ANNUAL EXEMPTED HRA'), taxableAnnual: pick(A, 'TAXABLE HRA') });
        },
    },
    {
        ids: ['gst'],
        async run(s) {
            await s.goto('/calculator/gst');
            await s.fill(0, D.GST.base, 'Base Amount');
            await s.button(`${D.GST.rate}%`, true).click();
            await s.wait(700);
            await s.align('Final Amount');
            await s.snap('gst', 'GST result: final amount with base amount, CGST, SGST and total GST');
            await s.top();
            await s.snap('gst-2', 'GST calculator inputs: base amount and 18% rate, with the final amount');
            if (!s.facts) return;
            const L = await s.lines();
            s.facts.gst = {
                base: pick(L, 'Base Amount'), rate: `${D.GST.rate}%`, gst: pick(L, 'Total GST'), total: pick(L, 'Final Amount'),
                cgst: pick(L, /^CGST/), sgst: pick(L, /^SGST/),
            };
        },
    },
    {
        ids: ['expenses-monthly', 'expenses-yearly', 'expenses-budget', 'export'],
        async run(s) {
            await s.goto('/expenses', { wait: 1200 });
            const tab = async (n) => { await s.page.locator('.sticky button.flex-1').nth(n).click(); await s.wait(1500); };
            if (s.want('expenses-budget')) {
                await s.align(s.button('Budget Progress'), { card: false });
                await s.snap('expenses-budget', 'Expense tracker, Budget tab: spending against each category limit');
            }
            if (s.want('expenses-monthly')) {
                await tab(3);
                await s.snap('expenses-monthly', 'Expense tracker, Monthly tab (November 2026): income, expenses, invested, net savings and spending calendar');
                if (s.facts) {
                    const L = await s.lines();
                    s.facts.expenses = {
                        month: L.find(l => /^[A-Z][a-z]+ 20\d\d$/.test(l)) || null,
                        income: pick(L, 'Total Income'), spent: unsigned(pick(L, 'Total Expenses')), invested: unsigned(pick(L, 'Total Invested')),
                        savings: pick(L, 'Net Savings'), savingsRate: pick(L, 'Savings Rate', /%/),
                        topCategory: pick(L, 'Spending by Category', /[A-Za-z]{3}/), topCategoryAmount: pick(L, 'Spending by Category'),
                        budget: pick(L, ['Budget vs Actual', 'Budget']), budgetResult: L.find(l => /under budget|over budget/.test(l)) || null,
                    };
                }
                if (s.extras) {
                    await s.align('Spending by Category');
                    await s.snap('expenses-monthly-2', 'Expense tracker, Monthly tab: spending by category');
                    await s.align('Budget vs Actual');
                    await s.snap('expenses-monthly-3', 'Expense tracker, Monthly tab: budget vs actual and week by week');
                }
            }
            if (s.want('expenses-yearly')) {
                await tab(4);
                await s.snap('expenses-yearly', 'Expense tracker, Yearly tab (2026): annual summary and month by month');
                await s.align('Top Spending Categories');
                await s.snap('expenses-yearly-2', 'Expense tracker, Yearly tab: top spending categories and savings-rate trend');
            }
            if (s.want('export')) {
                await tab(5);
                await s.button('Download Reports').click();
                await s.wait(900);
                await s.snap('export-2', 'Expense reports, Download Reports tab: PDF downloads for the day, week, month and year');
                await s.align('Custom Date Range');
                await s.snap('export', 'Expense reports: custom date range summary with PDF, CSV and Excel export');
                if (s.extras) {
                    await s.button('Insights & Overview').click();
                    await s.wait(1500);
                    await s.top();
                    await s.snap('export-3', 'Expense reports: financial health score and assets vs liabilities');
                }
            }
        },
    },
    {
        ids: ['goal-planner'],
        async run(s) {
            const preset = { house: 0, education: 1, retirement: 2, car: 3, custom: 4 };
            const goals = [];
            for (const [n, goal] of D.GOALS.entries()) {
                if (n > 0 && !s.extras && !s.facts) break;
                await s.goto('/goal-planner');
                await s.page.locator('button.w-full.p-5').nth(preset[goal.preset]).click();
                await s.wait(500);
                await s.fill(0, goal.cost, 'Current Cost');
                await s.fill(2, goal.years, 'Target Years');
                await s.wait(900);
                await s.align('Monthly SIP Needed');
                await s.snap(n === 0 ? 'goal-planner' : 'goal-planner-2', `Goal planner, "${goal.name}": monthly SIP needed, total to invest, inflation-adjusted target and growth projection`);
                if (n === 0) { await s.top(); await s.snap('goal-planner-4', `Goal planner, "${goal.name}": goal inputs`); }
                if (s.extras) {
                    await s.button('Save to My Loans').click();
                    await s.wait(500);
                    await s.page.locator('input[maxlength="60"]').fill(goal.name);
                    await s.button('Save', true).click();
                    await s.wait(700);
                }
                if (!s.facts) continue;
                const L = await s.lines();
                const row = {
                    name: goal.name, target: await s.shown(0), years: await s.shown(2), inflation: await s.shown(3), expectedReturn: await s.shown(4),
                    monthlyNeeded: pick(L, 'Monthly SIP Needed'), inflationAdjustedTarget: pick(L, /^Future Target Cost/),
                    totalToInvest: pick(L, 'TOTAL TO INVEST'), returnsEarned: pick(L, 'RETURNS EARNED'),
                };
                await s.fill(3, 0, 'Inflation Rate');
                await s.wait(500);
                row.monthlyNeededWithoutInflation = pick(await s.lines(), 'Monthly SIP Needed');
                goals.push(row);
            }
            if (s.facts) s.facts.goals = goals;
            if (!s.extras) return;
            await s.goto('/my-loans', { wait: 1200 });
            await s.snap('goal-planner-3', 'My Loans: both saved goals listed as investment trackers');
        },
    },
    {
        ids: ['advisor'],
        async run(s) {
            const a = D.ADVISOR;
            await s.goto('/financial-advisor');
            await s.fill(0, a.income, 'Monthly Income');
            await s.fill(1, a.age, 'Age');
            await s.fill(2, a.expenses, 'Monthly Expenses');
            await s.fill(3, a.savings, 'Existing Savings');
            await s.fill(4, a.emi, 'Existing EMI');
            const names = { house: 'Buy House', education: 'Child Education', retirement: 'Retirement' };
            for (const g of a.goals) await s.button(names[g], true).click();
            await s.wait(400);
            await s.top();
            await s.snap('advisor-3', 'Smart Planner: income details and goal selection');
            await s.button('Generate My Plan').click();
            await s.wait(2200);
            await s.top();
            await s.snap('advisor', 'Smart Planner result: financial score, monthly budget and 50-30-20 split');
            await s.align('GOAL-WISE FINANCIAL PLAN', { card: false });
            await s.snap('advisor-2', 'Smart Planner result: goal-wise SIP plan and emergency fund');
            if (!s.facts) return;
            const L = await s.lines();
            s.facts.advisor = {
                inputs: `Monthly income ${rupees(a.income)}, age ${a.age}, monthly expenses ${rupees(a.expenses)}, savings ${rupees(a.savings)}, no EMI; goals: ${a.goals.map(g => names[g]).join(', ')}`,
                financialScore: pick(L, 'Financial Score', /^\d+$/), totalSipForAllGoals: pick(L, 'Total SIP needed for all goals'),
                emergencyFund: pick(L, 'EMERGENCY FUND'),
            };
        },
    },
    {
        ids: ['schemes'],
        async run(s) {
            await s.goto('/schemes', { wait: 1300 });
            await s.snap('schemes', 'Government schemes list with category filters');
            if (!s.facts) return;
            const line = (await s.lines()).find(l => /^Showing \d+ schemes/.test(l)) || '';
            s.facts.schemes = { countShown: line.replace(/\D+/g, '') || null, countLine: line || null };
        },
    },
    {
        ids: ['scheme-detail'],
        async run(s) {
            await s.goto('/scheme/c-pmkisan', { wait: 1300 });
            await s.snap('scheme-detail', 'Scheme detail: PM Kisan Samman Nidhi, benefit, ministry and eligibility');
            await s.align('Key Benefits');
            await s.snap('scheme-detail-2', 'Scheme detail: key benefits, documents required and how to apply');
        },
    },
    {
        ids: ['world-clock'],
        async run(s) {
            await s.goto('/world-clock', { wait: 2200 });
            await s.snap('world-clock', 'World clock: India, Dubai, London and New York');
        },
    },
    {
        ids: ['settings-language'],
        async run(s) {
            await s.goto('/settings');
            await s.page.locator('button').filter({ hasText: s.rx('Language') }).first().click();
            await s.wait(1000);
            await s.snap('settings-language', 'Settings with the language picker open: all six languages');
        },
    },
    {
        ids: ['data-privacy'],
        async run(s) {
            await s.goto('/data-safety', { wait: 1200 });
            await s.snap('data-privacy', 'In-app Data & Privacy screen: what stays on the device');
            await s.align('Stored on Your Device Only');
            await s.snap('data-privacy-2', 'In-app Data & Privacy screen: local storage and backup');
        },
    },
    {
        // The calculator opens with one sample card (₹50,000 at 42%, the app's own default).
        ids: ['cc-payoff'],
        async run(s) {
            await s.goto('/calculator/credit-card-payoff', { wait: 1500 });
            await s.snap('cc-payoff', 'Credit card payoff: card balance, rate and minimum due, debt-free date and interest');
        },
    },
    {
        ids: ['reminders'],
        async run(s) {
            await s.goto('/settings', { wait: 1200 });
            await s.button('Notification Settings').click();
            await s.wait(900);
            await s.align(s.label('Daily Financial Quotes'));
            await s.snap('reminders', 'Notification settings: daily financial quote, daily log reminder and calculation reminders');
        },
    },
    {
        ids: ['calculators'],
        async run(s) {
            await s.goto('/calculators', { wait: 1300 });
            if (s.facts) {
                const line = (await s.lines()).find(l => /^\d+ calculators$/.test(l)) || '';
                s.facts.calculators = { countInApp: line.replace(/\D+/g, '') || null, countLine: line || null };
            }
            await s.snap('calculators', 'All Calculators: search, most used and recently used');
            await s.align(s.page.getByText(/^\d+ calculators$/).first(), { card: false, gap: 60 });
            await s.snap('calculators-2', 'All Calculators: category filter and the calculator list');
        },
    },
];

// ── Run ─────────────────────────────────────────────────────────────────────
async function runCombo(browser, base, lang, theme, screens, shared) {
    const context = await browser.newContext({
        viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true,
        serviceWorkers: 'block', locale: 'en-IN', timezoneId: 'Asia/Kolkata',
    });
    // Only the local build and the web font may load: no remote config (so no
    // update prompt), no analytics, nothing else.
    await context.route('**/*', (route) => {
        const host = new URL(route.request().url()).hostname;
        return host === '127.0.0.1' || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(host) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    await page.goto(`${base}/robots.txt`);
    await page.evaluate(seedStorage, { lang, dark: theme === 'dark', entries: D.EXPENSES.entries, budgets: D.EXPENSES.budgets });
    await context.addInitScript(initScript, { nowIso: D.DEMO_NOW, css: CAPTURE_CSS });

    const facts = lang === 'en' && theme === 'dark' ? shared.facts : null;
    const s = new Session({ page, base, lang, theme, wanted: new Set(screens), records: shared.records, facts, problems: shared.problems });
    for (const flow of FLOWS) {
        if (!flow.ids.some(id => s.wanted.has(id))) continue;
        try {
            await flow.run(s);
        } catch (err) {
            shared.problems.push(`${lang}/${theme}/${flow.ids[0]}: ${String(err.message || err).split('\n')[0]}`);
        }
    }
    await context.close();
}

async function main() {
    const combos = [];
    for (const [lang, themes] of Object.entries(PLAN)) {
        if (onlyLangs && !onlyLangs.includes(lang)) continue;
        for (const [theme, ids] of Object.entries(themes)) {
            if (onlyThemes && !onlyThemes.includes(theme)) continue;
            const screens = onlyScreens ? ids.filter(id => onlyScreens.includes(id)) : ids;
            if (screens.length) combos.push({ lang, theme, screens });
        }
    }
    if (!combos.length) throw new Error('nothing matches the given filters');

    fs.mkdirSync(OUT, { recursive: true });
    const readJson = (name, fallback) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8')); } catch { return fallback; } };
    const shared = { records: [], facts: {}, problems: [] };

    const server = await startPreview();
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const queue = [...combos];
        const worker = async () => {
            for (let job = queue.shift(); job; job = queue.shift()) {
                console.log(`${job.lang} / ${job.theme}: ${job.screens.length} screens`);
                await runCombo(browser, server.base, job.lang, job.theme, job.screens, shared);
            }
        };
        await Promise.all(Array.from({ length: Math.min(3, combos.length) }, worker));
    } finally {
        await browser.close();
        server.stop();
    }

    // captures.json: a full run rewrites it, a partial run replaces only its own rows.
    const fresh = new Set(shared.records.map(r => r.file));
    const kept = PARTIAL ? readJson('captures.json', []).filter(r => !fresh.has(r.file) && fs.existsSync(path.join(OUT, r.file))) : [];
    const records = [...kept, ...shared.records].sort((a, b) => a.file.localeCompare(b.file));
    fs.writeFileSync(path.join(OUT, 'captures.json'), JSON.stringify(records, null, 2) + '\n');

    // facts.json: read from the English dark run only.
    if (Object.keys(shared.facts).length) {
        const facts = { ...(PARTIAL ? readJson('facts.json', {}) : {}), ...shared.facts };
        delete facts.notes;
        const notes = [
            'Every figure is the text the app displayed in the English run, read from the page by tools/marketing/capture.mjs. Inputs are the fictional demo values in tools/marketing/demo-data.mjs.',
            'tax: FY 2026-27, salaried, below 60; the whole salary was entered as annual Basic Salary. The app applies the standard deduction itself (Old Regime 50,000, New Regime 75,000).',
            'tax.zeroTaxNewRegimeTax is the "Final Tax Liability" line; the headline card shows the same result as the word in tax.zeroTaxHeadline.',
            'foreclosure: the headline figures are from the app\'s "Part-Payment What-If" (Reduce Tenure). fullClosure is the separate "Foreclosure Simulation" on the same loan.',
            'foreclosure.fullClosure: the app shows "Interest you skip" and "You save" one rupee apart (its own rounding).',
            'fd.rate, rd.rate and ppf.rate are the rates the app pre-fills; they were not typed.',
            'hra: figures are per month because the inputs were entered per month; exemptAnnual and taxableAnnual are the same case in the app\'s Annual mode.',
            'goals: "target" is today\'s cost as entered. The app inflates it at its default inflation rate, so monthlyNeeded is for inflationAdjustedTarget; monthlyNeededWithoutInflation is the same goal with inflation set to 0%.',
            'expenses: the sample month has two income entries (salary 1,12,000 and freelance 8,000) that add up to the 1,20,000 monthly income set in the budget.',
        ];
        const walk = (o, at) => { for (const [k, v] of Object.entries(o)) { if (v === null) notes.push(`${at}${k}: not shown by the app (null)`); else if (typeof v === 'object') walk(v, `${at}${k}.`); } };
        walk(facts, '');
        facts.notes = notes;
        fs.writeFileSync(path.join(OUT, 'facts.json'), JSON.stringify(facts, null, 2) + '\n');
    }

    const count = {};
    for (const r of records) count[`${r.lang}/${r.theme}`] = (count[`${r.lang}/${r.theme}`] || 0) + 1;
    console.log(`\n${shared.records.length} captures written (${records.length} listed in captures.json)`);
    for (const [k, n] of Object.entries(count)) console.log(`  ${k}: ${n}`);
    if (shared.problems.length) {
        console.log('\nProblems:');
        for (const p of shared.problems) console.log(`  ✗ ${p}`);
        process.exitCode = 1;
    }
}

main().catch((err) => { console.error(err); process.exit(1); });
