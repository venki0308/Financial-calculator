// QA for the website's feature pages (src/landing/features). Pure Node; run after `npm run build:web`.
//
//   node scripts/qa-feature-pages.mjs
//
// 1. Every formula in features/math.ts (copied from an app screen) is re-implemented here a
//    different way and diffed over a grid of inputs.
// 2. The app screens still contain the formulas math.ts copied (so a change in the app is noticed).
// 3. derive.ts searches are checked by their defining property; the prepayment scenario is re-run
//    with an independent month-by-month schedule.
// 4. Headline figures, computed independently, appear in the built HTML of their page.
// 5. No two feature pages share more than 15% of their own text (8-word shingles), so no page is
//    a near-duplicate of another (SEO_PLAN.md: quality over volume).
import fs from 'node:fs';
import { buildSync } from 'esbuild';

let passed = 0, failed = 0;
const check = (name, ok, detail = '') => { if (ok) { passed++; console.log(`  ✓ ${name}`); } else { failed++; console.log(`  ✗ ${name}${detail ? `  [${detail}]` : ''}`); } };
const load = async (entry) => {
    const out = buildSync({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error', jsx: 'automatic' });
    return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
};
const math = await load('src/landing/features/math.ts');
const derive = await load('src/landing/features/derive.ts');
const seo = await load('src/landing/seoRoutes.ts');
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

// ── 1. Independent re-implementations ──────────────────────────────────────────────────────
console.log('\n1. math.ts against independent formulas');
{
    // Step-up SIP: closed form per year — 12 start-of-month instalments compounded monthly, then grown to the end.
    const stepUp = (m0, step, rate, years) => {
        const r = rate / 1200, s = ((1 + r) ** 12 - 1) / r * (1 + r);
        let fv = 0, inv = 0;
        for (let y = 1; y <= years; y++) { const m = m0 * (1 + step / 100) ** (y - 1); fv += m * s * (1 + r) ** (12 * (years - y)); inv += 12 * m; }
        return { fv, inv };
    };
    let worst = 0, n = 0;
    for (const m0 of [500, 3000, 10000, 25000]) for (const st of [0, 5, 10, 15]) for (const rate of [8, 12, 14]) for (const y of [1, 5, 15, 25]) {
        const a = math.stepUpSip(m0, st, rate, y), b = stepUp(m0, st, rate, y); n++;
        worst = Math.max(worst, Math.abs(a.futureValue - b.fv), Math.abs(a.invested - b.inv));
    }
    check(`stepUpSip: ${n} cases within ₹2`, worst <= 2, `worst ₹${worst.toFixed(2)}`);

    // Goal SIP: monthly = target × r ÷ ((1+r)^n − 1) ÷ (1+r).
    worst = 0; n = 0;
    for (const t of [1e6, 1e7, 5e7]) for (const y of [3, 10, 15, 20, 30]) for (const rate of [6, 10, 12, 14]) {
        const r = rate / 1200, k = y * 12, m = (t * r) / ((1 + r) ** k - 1) / (1 + r); n++;
        worst = Math.max(worst, Math.abs(math.goalSip(t, y, rate).monthlyNeeded - m));
    }
    check(`goalSip: ${n} cases within ₹1`, worst <= 1, `worst ₹${worst.toFixed(2)}`);

    // SSY: deposit on 1 April, simple monthly interest on that balance all year, credited 31 March → balance × (1 + rate).
    worst = 0; n = 0;
    for (const d of [250, 12000, 50000, 150000]) for (const rate of [7.6, 8, 8.2]) for (const age of [0, 5, 9]) {
        let b = 0; for (let i = 1; i <= 21; i++) b = (b + (i <= 15 ? d : 0)) * (1 + rate / 100);
        const p = math.ssyProjection(d, rate, age); n++;
        worst = Math.max(worst, Math.abs(p.maturity - b), Math.abs(p.invested - d * 15));
        if (p.maturityAge !== age + 21) worst = Infinity;
    }
    check(`ssyProjection: ${n} cases within ₹2, maturity 21 years after opening`, worst <= 2, `worst ₹${worst}`);

    // PO TD (scheme rule): the same yearly payout every year = A × ((1 + R/400)^4 − 1).
    worst = 0; n = 0;
    for (const a of [1000, 100000, 750000]) for (const rate of [6.9, 7, 7.1, 7.5]) for (const y of [1, 2, 3, 5]) {
        const yearly = a * ((1 + rate / 400) ** 4 - 1), p = math.poTd(a, rate, y); n++;
        worst = Math.max(worst, Math.abs(p.yearlyInterest - yearly), Math.abs(p.interest - yearly * y), Math.abs(p.total - a - yearly * y));
        if (p.table.length !== y || p.table.some((row) => row.interest !== p.yearlyInterest)) worst = Infinity;
    }
    check(`poTd: ${n} cases within ₹1, equal payout every year (no interest on interest)`, worst <= 1, `worst ₹${worst}`);

    // Gold: tier chosen by the loan amount it produces.
    const purity = { '24K': 1, '22K': 0.916, '20K': 0.833, '18K': 0.75 };
    const bad = [];
    for (const g of [1, 5, 10, 21, 22, 23, 40, 45, 46, 50, 100, 500]) for (const p of Object.keys(purity)) {
        const v = Math.round(g * 13420 * purity[p]);
        const ltv = v * 0.85 <= 250000 ? 85 : v * 0.8 <= 500000 ? 80 : 75;
        const e = math.goldLoanEligibility(g, 13420, p);
        if (e.value !== v || e.ltv !== ltv || Math.abs(e.maxLoan - v * ltv / 100) > 0.5) bad.push(`${g} g ${p}`);
    }
    check('goldLoanEligibility: value and 85/80/75% tier for 48 cases', bad.length === 0, bad.slice(0, 3).join(', '));
    check('GOLD_PURITY matches 24K 1, 22K 0.916, 20K 0.833, 18K 0.75', JSON.stringify(math.GOLD_PURITY) === JSON.stringify(purity));
}

// ── 2. The app screens still hold the copied formulas ─────────────────────────────────────
console.log('\n2. App screens still contain the formulas math.ts copies');
{
    const has = (file, ...frags) => { const s = fs.readFileSync(file, 'utf8').replace(/\s+/g, ' '); return frags.every((f) => s.includes(f)); };
    check('SIPCalculator.tsx: step-up loop and goal-SIP denominator', has('src/pages/SIPCalculator.tsx', 'balance = (balance + monthlyAmt) * (1 + r)', 'monthlyAmt *= (1 + suStepUp / 100)', '((Math.pow(1 + r, n) - 1) / r) * (1 + r)'));
    check('SSYCalculator.tsx: 15 deposit years, 21 to maturity', has('src/pages/SSYCalculator.tsx', '15', '21'));
    check('GoldLoanCalculator.tsx: purity factors and 2.5L / 5L tiers', has('src/pages/GoldLoanCalculator.tsx', '0.916', '0.833', '0.75', '250000', '500000'));
}

// ── 3. derive.ts ─────────────────────────────────────────────────────────────────────────
console.log('\n3. derive.ts');
{
    const tax = await load('src/utils/incomeTax.ts');
    let bad = [];
    for (const s of [800000, 1200000, 1500000, 1800000, 2000000, 2500000, 3000000, 5000000]) {
        const d = derive.breakEvenDeductions(s);
        if (d === null || d === 0) continue;
        const nw = tax.compareSalaryTax(s, 0).newTax.totalTax;
        if (!(tax.compareSalaryTax(s, d).oldTax.totalTax <= nw && tax.compareSalaryTax(s, d - 1000).oldTax.totalTax > nw)) bad.push(String(s));
    }
    check('breakEvenDeductions: old ≤ new at the answer, old > new ₹1,000 below it', bad.length === 0, bad.join(', '));
    check('breakEvenDeductions(15 lakh) = ₹5,44,000 (the figure on /old-vs-new-tax-regime)', derive.breakEvenDeductions(1500000) === 544000, String(derive.breakEvenDeductions(1500000)));

    bad = [];
    for (const [t, y, r, st] of [[1e7, 15, 12, 10], [1e7, 20, 12, 10], [5e6, 10, 10, 5]]) {
        const s = derive.stepUpStartFor(t, y, r, st);
        if (!(s % 100 === 0 && math.stepUpSip(s, st, r, y).futureValue >= t && math.stepUpSip(s - 100, st, r, y).futureValue < t)) bad.push(`${t}/${y}`);
    }
    check('stepUpStartFor: smallest ₹100 step that reaches the target', bad.length === 0, bad.join(', '));

    // Prepayment: independent month-by-month schedule (EMI rounded up, lump sum after that month's EMI).
    const sim = (P, rate, years, lump, at, mode) => {
        const r = rate / 1200, n = years * 12;
        let emi = Math.ceil((P * r * (1 + r) ** n) / ((1 + r) ** n - 1)), bal = P, interest = 0, m = 0;
        while (bal > 0.5 && m < n) {
            m++;
            const i = bal * r; interest += i;
            bal -= Math.min(emi, bal + i) - i;
            if (m === at && lump) {
                bal -= lump;
                if (mode === 'reduce_emi' && bal > 0) { const k = n - m; emi = Math.ceil((bal * r * (1 + r) ** k) / ((1 + r) ** k - 1)); }
            }
        }
        return { interest, months: m, emi };
    };
    bad = [];
    for (const [P, rate, y, lump, at] of [[3e6, 8.5, 20, 3e5, 36], [5e6, 9, 25, 5e5, 60], [2e6, 8, 15, 2e5, 12]]) {
        for (const mode of ['reduce_tenure', 'reduce_emi']) {
            const a = derive.prepaymentScenario(P, rate, y, lump, at, mode);
            const base = sim(P, rate, y, 0, 0, mode), b = sim(P, rate, y, lump, at, mode);
            const saved = base.interest - b.interest;
            if (Math.abs(a.saved - saved) > Math.max(500, saved * 0.001) || (mode === 'reduce_tenure' && a.monthsSaved !== y * 12 - b.months) || (mode === 'reduce_emi' && Math.abs(a.newEmi - b.emi) > 2)) {
                bad.push(`${P}/${rate}/${y} ${mode}: app saved ${a.saved} months ${a.monthsSaved} emi ${a.newEmi} | indep ${Math.round(saved)} ${y * 12 - b.months} ${b.emi}`);
            }
        }
    }
    check('prepaymentScenario: interest saved, months saved and new EMI match an independent schedule (6 cases)', bad.length === 0, bad.slice(0, 2).join(' | '));
}

// ── 4. Headline figures in the built pages ────────────────────────────────────────────────
console.log('\n4. Headline figures, computed independently, are on their pages (dist/)');
{
    const page = (slug) => fs.readFileSync(`dist/${slug}/index.html`, 'utf8');
    const r = 0.01, k = 180;
    const sip15 = Math.round(1e7 * r / ((1 + r) ** k - 1) / (1 + r));
    const ccInt = 50000 * 0.42 / 365 * 30;
    const gold50 = Math.round(Math.round(50 * 13420 * 0.916) * 0.8);
    const td = Math.round(100000 * ((1 + 7.5 / 400) ** 4 - 1));
    const want = [
        ['old-vs-new-tax-regime', inr(544000)],
        ['sip-for-1-crore', inr(sip15)],
        ['credit-card-interest', inr(ccInt * 1.18)],
        ['gold-loan-calculator', inr(gold50)],
        ['post-office-td', inr(td)],
        ['home-loan-prepayment', inr(derive.prepaymentScenario(3e6, 8.5, 20, 3e5, 36, 'reduce_tenure').saved)],
        ['income-tax-due-dates', '31 July 2027'],
        ['income-tax', '₹97,500'],
    ];
    for (const [slug, fig] of want) check(`/${slug} shows ${fig}`, page(slug).includes(fig));
    for (const slug of seo.FEATURE_PAGES) {
        const h = page(slug);
        const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
        const faq = ld.find((o) => o['@type'] === 'FAQPage');
        const visible = (h.match(/<details/g) || []).length;
        check(`/${slug}: FAQPage JSON-LD has the ${visible} visible questions`, !!faq && faq.mainEntity.length === visible && visible >= 5);
    }
}

// ── 5. Near-duplicate text ────────────────────────────────────────────────────────────────
console.log('\n5. Shared text between feature pages (8-word shingles of the page’s own text)');
{
    /** Remove the element that starts at `marker` (balanced on its tag name). */
    const cut = (html, marker) => {
        const at = html.indexOf(marker);
        if (at < 0) return html;
        const start = html.lastIndexOf('<', at), tag = html.slice(start + 1).match(/^\w+/)[0];
        const re = new RegExp(`<${tag}[\\s>]|</${tag}>`, 'g');
        re.lastIndex = start;
        let depth = 0, m;
        while ((m = re.exec(html))) { depth += m[0].startsWith('</') ? -1 : 1; if (depth === 0) return html.slice(0, start) + html.slice(re.lastIndex); }
        return html;
    };
    // Shared furniture (breadcrumbs, calculator shell, related links, disclaimer) is left out; FAQs and rules stay in.
    const own = (slug) => {
        let h = fs.readFileSync(`dist/${slug}/index.html`, 'utf8');
        h = h.slice(h.indexOf('<main'), h.indexOf('</main>'));
        for (const m of ['class="crumbs"', 'class="fcalc-wrap"', 'class="related', 'class="disclaimer"']) h = cut(h, m);
        return h.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').toLowerCase().replace(/[^a-z0-9₹%.\s]/g, ' ').split(/\s+/).filter(Boolean);
    };
    const shingles = (w) => { const s = new Set(); for (let i = 0; i + 8 <= w.length; i++) s.add(w.slice(i, i + 8).join(' ')); return s; };
    const sets = Object.fromEntries(seo.FEATURE_PAGES.map((s) => [s, shingles(own(s))]));
    let worst = 0, pair = '';
    const slugs = [...seo.FEATURE_PAGES];
    for (let i = 0; i < slugs.length; i++) for (let j = i + 1; j < slugs.length; j++) {
        const a = sets[slugs[i]], b = sets[slugs[j]];
        let common = 0; for (const x of a) if (b.has(x)) common++;
        const share = common / Math.min(a.size, b.size);
        if (share > worst) { worst = share; pair = `${slugs[i]} ~ ${slugs[j]}`; }
    }
    check(`no two pages share more than 15% of their own text (highest ${(worst * 100).toFixed(1)}%: ${pair})`, worst <= 0.15);
}

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
