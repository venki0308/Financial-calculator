/**
 * Deposit pages (/fd /rd /ppf /nsc /kvp /post-office-mis /scss): independent re-implementations of
 * every formula the pages use, compared with the app's functions, plus official figures from the
 * scheme texts (seo/research/verified-facts-deposits.md), and each page's headline figure in its HTML.
 */
export default async function ({ check, load, inr, page }) {
    const calc = await load('src/utils/calculations.ts');
    const dep = await load('src/landing/features/math-deposits.ts');
    const { SMALL_SAVINGS } = await load('src/data/rateEnvironment.ts');
    const R = SMALL_SAVINGS.rates;
    const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

    // ── FD: compound growth via exp/log, not Math.pow on the period rate ──
    const fdIndep = (p, rate, years, n) => p * Math.exp(n * years * Math.log(1 + rate / 100 / n));
    for (const [p, r, y, n] of [[500000, 6.5, 5, 4], [100000, 7, 1, 12], [2500000, 5.75, 10, 1], [10000, 8.25, 3, 4]]) {
        const app = calc.calculateFD(p, r, y, n).amount;
        check(`FD ${p} at ${r}% ${y}y n=${n}`, near(app, fdIndep(p, r, y, n), 0.01), `${app} vs ${fdIndep(p, r, y, n)}`);
    }
    check('FD quarterly payout = P × r / 400', near(calc.calculateFD(2000000, 6.5, 0.25, 4).interest, 2000000 * 6.5 / 400, 0.001));
    check('FD monthly payout = P × r / 1200', near(calc.calculateFD(2000000, 6.5, 1 / 12, 12).interest, 2000000 * 6.5 / 1200, 0.001));

    // ── RD: geometric series of instalments (g = (1 + r/400)^(1/3)) and the NSRD 2019 tables ──
    const rdIndep = (m, rate, n) => { const g = Math.pow(1 + rate / 400, 1 / 3); return m * g * (Math.pow(g, n) - 1) / (g - 1); };
    for (const [m, r, n] of [[5000, 6.7, 60], [1000, 6.7, 60], [2500, 7.25, 24], [10000, 6.7, 120], [100, 5.8, 60]]) {
        check(`RD ${m}/month ${r}% ${n}m`, near(dep.rdProjection(m, r, n).maturity, rdIndep(m, r, n), 0.01));
    }
    check('RD ₹100 at 7.2% = scheme table ₹7,231.38', near(dep.rdProjection(100, 7.2, 60).maturity, 7231.38, 0.006));
    const ext = { 72: 9013.82, 84: 10928.10, 96: 12983.98, 108: 15191.92, 120: 17563.19 };
    for (const [mo, v] of Object.entries(ext)) check(`RD continuation ${mo} months = scheme table ₹${v}`, near(dep.rdProjection(100, 7.2, Number(mo)).maturity, v, 0.006));
    check('RD ₹1,500 at 6.7% = India Post ₹1,07,049', Math.round(dep.rdProjection(1500, R.rd5y, 60).maturity) === 107049);

    // ── PPF: yearly recurrence (deposit by 5 April earns the full year) and a monthly closed form ──
    for (const [d, r, y] of [[150000, 7.1, 15], [50000, 7.1, 20], [500, 7.1, 15], [100000, 8, 15]]) {
        let bal = 0;
        for (let i = 0; i < y; i++) bal = (bal + d) * (1 + r / 100);
        check(`PPF ${d}/yr ${r}% ${y}y`, Math.abs(dep.ppfSchedule(d, 1, r, y)[y - 1].closing - bal) <= 1, `${dep.ppfSchedule(d, 1, r, y)[y - 1].closing} vs ${bal}`);
    }
    {
        // Monthly D by the 5th: year interest = bal·R + (D·i/12)·(1+2+…+12)
        const D = 12500, r = 7.1, i = r / 100;
        let bal = 0;
        for (let y = 0; y < 15; y++) bal = bal + 12 * D + bal * i + D * (i / 12) * 78;
        check('PPF monthly ₹12,500 for 15 years', Math.abs(dep.ppfSchedule(D, 12, r, 15)[14].closing - bal) <= 1);
    }

    // ── NSC: scheme table 2 (6.8%) per ₹1,000 and yearly compounding by exp/log ──
    const t68 = dep.nscProjection(1000, 6.8).table.map((x) => Math.round(x.interest * 100) / 100);
    check('NSC 6.8% interest per ₹1,000 = scheme table (68.00, 72.62, 77.56, 82.84, 88.47)', JSON.stringify(t68) === JSON.stringify([68, 72.62, 77.56, 82.84, 88.47]), JSON.stringify(t68));
    for (const p of [1000, 100000, 1500000]) check(`NSC ${p} at ${R.nsc}%`, near(dep.nscProjection(p, R.nsc).maturity, p * Math.exp(5 * Math.log(1 + R.nsc / 100)), 0.01));

    // ── KVP: period at today's rate equals NSI's months; deposit doubles ──
    check(`KVP doubles in ${R.kvpMaturityMonths} months at ${R.kvp}% (NSI)`, dep.kvpProjection(100000, R.kvp).doublingMonths === R.kvpMaturityMonths);
    check('KVP maturity is twice the deposit', dep.kvpProjection(123400, R.kvp).maturity === 246800);
    // Known: the rounding formula differs from NSI at some past rates; the page shows NSI's months.
    const off = [[6.9, 124], [7.6, 113], [7.8, 110]].filter(([r, m]) => dep.kvpProjection(1000, r).doublingMonths !== m);
    check('KVP formula vs NSI history (info: page uses NSI months, not the formula)', true, `formula differs at ${off.map(([r]) => r + '%').join(', ') || 'none'}`);

    // ── MIS: monthly = deposit × rate / 1200, capped at ₹9 lakh / ₹15 lakh ──
    check('MIS ₹9 lakh single', near(dep.misIncome(900000, R.pomis, false).monthlyIncome, 900000 * R.pomis / 1200, 1e-6));
    check('MIS ₹15 lakh joint', near(dep.misIncome(1500000, R.pomis, true).monthlyIncome, 1500000 * R.pomis / 1200, 1e-6));
    check('MIS single capped at ₹9 lakh', dep.misIncome(1500000, R.pomis, false).clampedInvestment === 900000);
    check('MIS early-closure cuts 2% / 1%', near(dep.misIncome(900000, R.pomis, false).deductionTo3Years, 18000) && near(dep.misIncome(900000, R.pomis, false).deductionAfter3Years, 9000));

    // ── SCSS: quarterly = deposit × rate / 400; penalties 1.5% / 1% ──
    const s = dep.scssIncome(3000000, R.scss, 5);
    check('SCSS ₹30 lakh quarterly', near(s.quarterlyIncome, 3000000 * R.scss / 400, 1e-6));
    check('SCSS penalties 1.5% and 1%', near(s.penaltyAfter1Yr, 45000) && near(s.penaltyAfter2Yrs, 30000));
    check('SCSS limit ₹30 lakh', dep.SCSS_MAX === 3000000);

    // ── Headline figures in the built pages (computed independently above) ──
    const heads = {
        fd: [inr(fdIndep(500000, 6.5, 5, 4))],
        rd: [inr(rdIndep(5000, R.rd5y, 60))],
        ppf: [inr((() => { let b = 0; for (let i = 0; i < 15; i++) b = (b + 150000) * (1 + R.ppf / 100); return b; })())],
        nsc: [inr(100000 * Math.exp(5 * Math.log(1 + R.nsc / 100)))],
        kvp: [inr(200000), `${R.kvpMaturityMonths} months`],
        'post-office-mis': [inr(900000 * R.pomis / 1200), inr(1500000 * R.pomis / 1200)],
        scss: [inr(3000000 * R.scss / 400), inr(1500000 * R.scss / 400)],
    };
    for (const [slug, figs] of Object.entries(heads)) {
        let html = '';
        try { html = (await page(slug)) || ''; } catch (e) { html = ''; }
        for (const fig of figs) {
            const ok = html.includes(fig);
            check(`/${slug} shows ${fig}`, ok, ok ? undefined : (html ? 'not found in page' : 'page not built'));
        }
    }
}
