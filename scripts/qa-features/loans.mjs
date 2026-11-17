// QA plug-in for the loan pages: /emi /home-loan /car-loan /personal-loan /two-wheeler-loan /education-loan.
// (a) Every app function and math-loans.ts helper the pages use is re-implemented here a different way
//     (closed form or month-by-month loop, Newton's method instead of bisection) and diffed over a grid.
// (b) Each page's headline figure, computed here independently, must appear in its built HTML.
import fs from 'node:fs';

export default async function ({ check, load, inr, page }) {
    const calc = await load('src/utils/calculations.ts');
    const ml = await load('src/landing/features/math-loans.ts');

    // ── Independent formulas ────────────────────────────────────────────────────────────
    /**
     * EMI rounded up to the rupee; schedule run month by month, the instalment that clears the balance
     * (normally the last) trimmed to what is owed, nothing paid after that.
     */
    const emiOf = (p, rate, n) => {
        const r = rate / 1200;
        if (r === 0) return { emi: Math.round(p / n), interest: 0, paid: p };
        const g = (1 + r) ** n;
        const emi = Math.ceil((p * r * g) / (g - 1));
        let bal = p, paid = 0, y1 = 0;
        for (let m = 1; m <= n && bal > 1e-9; m++) {
            const int = bal * r;
            const pay = m === n || bal + int <= emi ? bal + int : emi;
            if (m <= 12) y1 += int;
            bal = bal + int - pay;
            paid += Math.round(pay);
        }
        return { emi, interest: paid - p, paid, y1 };
    };
    /** Yearly IRR (%) of receiving `net` and paying `emi` for n months — Newton's method. */
    const irr = (net, emi, n) => {
        let r = 0.01;
        for (let k = 0; k < 100; k++) {
            const g = (1 + r) ** n;
            const f = emi * (1 - 1 / g) / r - net;
            const h = 1e-7;
            const g2 = (1 + r + h) ** n;
            const f2 = emi * (1 - 1 / g2) / (r + h) - net;
            r -= f / ((f2 - f) / h);
        }
        return r * 1200;
    };

    // 1. calculateReducingEMI over the amounts, rates and tenures the pages' tables use.
    //    (Not small loans over 20–30 years: there the app's schedule keeps charging the full EMI after the
    //    rounded-up EMIs have already cleared the balance, overstating interest — reported as an app bug;
    //    no page figure is in that range.)
    {
        let worst = 0, cases = 0;
        const grid = [];
        for (const p of [100000, 109225, 500000, 960000]) for (const rate of [8, 9, 10, 11.5, 13, 16]) for (const n of [12, 24, 36, 48, 60, 84]) grid.push([p, rate, n]);
        for (const p of [500000, 1000000, 2000000, 3000000, 5000000, 7500000, 10000000]) for (const rate of [8.1, 8.5, 9, 10]) for (const n of [120, 180, 240, 300, 360]) grid.push([p, rate, n]);
        for (const [p, rate, n] of grid) {
            const a = calc.calculateReducingEMI(p, rate, n), b = emiOf(p, rate, n); cases++;
            worst = Math.max(worst, Math.abs(a.emi - b.emi), Math.abs(a.totalInterest - b.interest) > 2 ? Infinity : 0);
        }
        check(`loans: calculateReducingEMI — ${cases} cases, EMI exact and interest within ₹2`, worst === 0, `worst ${worst}`);
    }
    // 2. calculateFlatEMI and calculateEffectiveRate
    {
        let bad = 0, cases = 0;
        for (const p of [100000, 200000, 300000]) for (const rate of [8, 10, 11, 14]) for (const n of [12, 24, 36, 60]) {
            const f = calc.calculateFlatEMI(p, rate, n); cases++;
            if (f.emi !== Math.round(p * (1 + rate / 100 * n / 12) / n)) bad++;
            const eff = calc.calculateEffectiveRate(rate, n);
            const exact = irr(1, (1 + rate / 100 * n / 12) / n, n);
            if (Math.abs(eff - exact) > 0.02) bad++;
        }
        check(`loans: flat EMI and flat→reducing rate — ${cases} cases`, bad === 0, `${bad} mismatches`);
    }
    // 3. aprOnNet against IRR, and against the RBI KFS illustration (₹20,000, ₹400 fees, 24 × ₹970 → 17.07%)
    {
        let worst = 0, cases = 0;
        for (const p of [100000, 300000, 500000, 1000000]) for (const fee of [0, 1, 2, 3]) for (const n of [12, 24, 60]) {
            const e = calc.calculateReducingEMI(p, 12, n).emi;
            const net = p - Math.round(p * fee / 100 * 1.18); cases++;
            worst = Math.max(worst, Math.abs(ml.aprOnNet(net, e, n) - irr(net, e, n)));
        }
        check(`loans: aprOnNet = IRR on the net amount — ${cases} cases within 0.01 pt`, worst <= 0.01, `worst ${worst.toFixed(4)}`);
        const kfs = ml.aprOnNet(19600, 970, 24);
        check('loans: aprOnNet reproduces the RBI KFS illustration (17.07%) within 0.05 pt', Math.abs(kfs - 17.07) <= 0.05, `${kfs}`);
    }
    // 4. loanForEmi by its defining property
    {
        let bad = 0, cases = 0;
        for (const e of [20000, 30000, 40000, 60000]) for (const rate of [8.5, 9.5]) for (const n of [180, 240, 360]) {
            const l = ml.loanForEmi(e, rate, n); cases++;
            if (emiOf(l, rate, n).emi > e || emiOf(l + 1000, rate, n).emi <= e) bad++;
        }
        check(`loans: loanForEmi is the largest ₹1,000 step within the EMI — ${cases} cases`, bad === 0, `${bad} wrong`);
    }
    // 5. Two-wheeler on-road formula: copy still matches the app screen, and the arithmetic
    {
        const src = fs.readFileSync('src/pages/TwoWheelerLoanCalculator.tsx', 'utf8');
        check('loans: TwoWheelerLoanCalculator.tsx still has the on-road formula math-loans copies',
            src.includes('const onRoadPrice = exShowroom + effectiveRto + effectiveInsurance + handlingCharges + accessories;')
            && src.includes('const downPayment = Math.round(effectivePrice * downPaymentPct / 100);')
            && src.includes('const loanAmount = Math.max(0, effectivePrice - downPayment);'));
        let bad = 0;
        for (const ex of [60000, 110000, 250000]) for (const dp of [0, 15, 33]) {
            const o = ml.twoWheelerOnRoad({ exShowroom: ex, rto: 9500, insurance: 7500, handling: 1500, accessories: 2000, downPaymentPct: dp });
            const price = ex + 9500 + 7500 + 1500 + 2000, down = Math.round(price * dp / 100);
            if (o.onRoadPrice !== price || o.downPayment !== down || o.loanAmount !== price - down) bad++;
        }
        check('loans: twoWheelerOnRoad arithmetic', bad === 0, `${bad} wrong`);
    }
    // 6. educationLoan: moratorium interest (simple, subvention on at most the cap) then EMI
    {
        let bad = 0, cases = 0;
        for (const p of [400000, 1000000, 2000000]) for (const rate of [9, 10.5]) for (const y of [0, 3, 5]) for (const mode of ['paid', 'added']) for (const sub of [0, 3, rate]) {
            const e = ml.educationLoan(p, rate, y, 10, mode, sub, 1000000); cases++;
            const mi = Math.round((p * rate / 100 - Math.min(p, 1000000) * sub / 100) * y);
            const start = mode === 'added' ? p + mi : p;
            const x = emiOf(start, rate, 120);
            const total = (mode === 'paid' ? mi : 0) + x.paid;
            if (e.moratoriumInterest !== mi || e.startBalance !== start || e.emi !== x.emi || Math.abs(e.totalPaid - total) > 2) bad++;
        }
        check(`loans: educationLoan — ${cases} cases`, bad === 0, `${bad} wrong`);
    }
    // 7. calculateTaxBenefits year-1 interest (home-loan table and calculator)
    {
        const a = calc.calculateTaxBenefits(calc.calculateReducingEMI(5000000, 8.5, 300).schedule).schedule[0];
        const b = emiOf(5000000, 8.5, 300);
        check('loans: year-1 interest on ₹50 lakh at 8.5% / 25 yr within ₹2', Math.abs(a.interest - b.y1) <= 2 && a.deduction24 === Math.min(200000, Math.round(b.y1)), `${a.interest} vs ${b.y1}`);
    }

    // ── Headline figures in the built pages ─────────────────────────────────────────────
    const has = (slug, label, ...figs) => {
        const html = page(slug) || '';
        const missing = figs.filter((f) => !html.includes(f));
        check(`loans: /${slug} shows ${label}`, html.length > 0 && missing.length === 0, missing.length ? `missing ${missing.join(', ')}` : 'no HTML');
    };
    has('emi', 'EMI on ₹10 lakh at 9% for 5 years', inr(emiOf(1000000, 9, 60).emi), inr(emiOf(1000000, 9, 60).interest));
    has('home-loan', 'EMI on ₹50 lakh at 8.5% for 25 years', inr(emiOf(5000000, 8.5, 300).emi), inr(emiOf(5000000, 8.5, 300).interest));
    has('car-loan', 'EMI on ₹9.6 lakh at 9% for 5 and 7 years', inr(emiOf(960000, 9, 60).emi), inr(emiOf(960000, 9, 84).emi));
    {
        const e = emiOf(500000, 12, 60).emi;
        const apr = (Math.round(irr(488200, e, 60) * 100) / 100).toLocaleString('en-IN') + '%';
        has('personal-loan', 'EMI on ₹5 lakh at 12% / 5 yr and the APR after a 2% fee + GST', inr(e), apr, inr(488200));
    }
    has('two-wheeler-loan', 'EMI on ₹1.5 lakh at 11.5% for 5 years', inr(emiOf(150000, 11.5, 60).emi));
    has('education-loan', 'EMI on ₹10 lakh at 10% after a 5-year moratorium, added and paid', inr(emiOf(1500000, 10, 120).emi), inr(emiOf(1000000, 10, 120).emi), inr(500000));
}
