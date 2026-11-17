// Page group "tax": /hra /capital-gains /lrs-tcs /gst /salary-hike /tax-refund.
// (a) Each formula the pages use is re-implemented here a different way and diffed with the app's
//     function (or math-tax.ts's copy of a screen formula) over a grid of inputs.
// (b) Each page's headline figure, computed here independently, must appear in its built HTML.
import fs from 'node:fs';

export default async function ({ check, load, inr, page }) {
    const mt = await load('src/landing/features/math-tax.ts');
    const calc = await load('src/utils/calculations.ts');
    const it = await load('src/utils/incomeTax.ts');
    const js = await load('src/utils/jobSwitchTax.ts');

    // ── Independent new-regime tax (FY 2026-27), resident below 60, no surcharge (income < ₹50 lakh) ──
    const newRegimeTax = (gross) => {
        const ti = Math.round(Math.max(0, gross - 75000) / 10) * 10;
        const bands = [[0, 0], [400000, 5], [800000, 10], [1200000, 15], [1600000, 20], [2000000, 25], [2400000, 30]];
        let t = 0;
        bands.forEach(([lo, r], i) => { const hi = i + 1 < bands.length ? bands[i + 1][0] : Infinity; if (ti > lo) t += (Math.min(ti, hi) - lo) * r / 100; });
        if (ti <= 1200000) t = 0; else t = Math.min(t, ti - 1200000);
        return t * 1.04;
    };
    {
        let worst = 0, n = 0;
        for (let s = 300000; s <= 4800000; s += 37500) { n++; worst = Math.max(worst, Math.abs(newRegimeTax(s) - it.compareSalaryTax(s, 0).newTax.totalTax)); }
        check(`tax: compareSalaryTax new regime matches an independent slab walk (${n} salaries to ₹48 lakh) within ₹1`, worst <= 1, `worst ₹${worst.toFixed(2)}`);
    }

    // ── HRA: least of three, worked monthly and scaled, against math-tax.computeHRA ──
    {
        let worst = 0, n = 0;
        for (const b of [15000, 30000, 40000, 50000, 80000]) for (const h of [0, 6000, 20000, 25000, 40000]) for (const r of [0, 3000, 5000, 15000, 22000, 45000]) for (const metro of [true, false]) {
            const monthly = Math.max(0, Math.min(h, b * (metro ? 0.5 : 0.4), r - b / 10));
            const x = mt.computeHRA(b, 0, h, r, metro, 'old');
            n++; worst = Math.max(worst, Math.abs(x.exempt - monthly * 12), Math.abs(x.taxable - (h - monthly) * 12));
            if (mt.computeHRA(b, 0, h, r, metro, 'new').exempt !== 0) worst = Infinity;
        }
        check(`hra: computeHRA = 12 × least of (HRA, 50%/40% of basic, rent − 10% of basic), ${n} cases; nil in the new regime`, worst < 0.01, `worst ${worst}`);
        const src = fs.readFileSync('src/pages/HRACalculator.tsx', 'utf8');
        check('hra: the app screen still has the copied limits', src.includes('metro ? annualBasicDA * 0.5 : annualBasicDA * 0.4') && src.includes('Math.max(0, annualRent - (annualBasicDA * 0.1))') && src.includes('exempt = Math.min(opt1, opt2, opt3)'));
        const head = Math.max(0, Math.min(25000, 50000 * 0.5, 22000 - 5000)) * 12;
        check(`hra: page shows the headline exemption ${inr(head)}`, page('hra').includes(inr(head)));
    }

    // ── GST: basis-point arithmetic against math-tax.gstStandard ──
    {
        let worst = 0, n = 0;
        for (const a of [1, 99, 105, 1050, 10000, 11800, 47200, 1500000]) for (const r of [0.25, 1.5, 3, 5, 12, 18, 28, 40]) {
            const add = mt.gstStandard(a, r, 'add'), rem = mt.gstStandard(a, r, 'remove');
            const addTotal = (a * (10000 + r * 100)) / 10000;
            const remBase = (a * 10000) / (10000 + r * 100);
            n++; worst = Math.max(worst, Math.abs(add.total - addTotal), Math.abs(add.gst - (addTotal - a)), Math.abs(rem.base - remBase), Math.abs(rem.gst - (a - remBase)));
        }
        check(`gst: add/remove formula matches basis-point arithmetic, ${n} cases`, worst < 1e-6, `worst ${worst}`);
        const src = fs.readFileSync('src/pages/GSTCalculator.tsx', 'utf8');
        check('gst: the app screen still has the copied formula', src.includes('stdAmount / (1 + (stdRate + cessRate) / 100)') && src.includes('const gst = stdAmount * (stdRate / 100);'));
        const html = page('gst');
        check('gst: page shows ₹11,800 and ₹1,800 (18% on ₹10,000)', html.includes(inr(10000 * 1.18)) && html.includes(inr(1800)));
    }

    // ── Salary hike: arithmetic and the headline after-tax figures ──
    {
        let worst = 0, n = 0;
        for (const s of [300000, 1200000, 1500000, 4800000]) for (const p of [0, 5, 8, 10, 37.5]) {
            const a = mt.salaryHike('findSalary', s, 0, p), b = mt.salaryHike('findHike', s, s * (100 + p) / 100, 0);
            n++; worst = Math.max(worst, Math.abs(a.newSalary - s * (100 + p) / 100), Math.abs(b.hikePct - p), Math.abs(a.hikeMonthly * 12 - (a.newSalary - s)));
        }
        check(`salary-hike: new salary and hike % round-trip, ${n} cases`, worst < 1e-6, `worst ${worst}`);
        const src = fs.readFileSync('src/pages/SalaryHikeCalculator.tsx', 'utf8');
        check('salary-hike: the app screen still has the copied arithmetic', src.includes('hikeAmount = currentSalary * (hikePct / 100);') && src.includes('computedHikePct = currentSalary > 0 ? (hikeAmount / currentSalary) * 100 : 0;'));
        const extra = newRegimeTax(1650000) - newRegimeTax(1500000);
        const html = page('salary-hike');
        check(`salary-hike: page shows ₹16,50,000, extra tax ${inr(extra)} and ${inr((150000 - extra) / 12)} a month`, html.includes(inr(1650000)) && html.includes(inr(extra)) && html.includes(inr((150000 - extra) / 12)));
    }

    // ── Capital gains: equity, other assets, property indexation, holding periods ──
    {
        // CII from the Income Tax Department's table (wm.incometaxindia.gov.in/w/view-all-cii) and S.O. 3889(E).
        const CII = { 2005: 117, 2010: 167, 2013: 220, 2015: 254, 2018: 280, 2020: 301, 2022: 331, 2024: 363, 2026: 384 };
        const cg = (asset, bought, cost, sale, slab = 30) => calc.computeCapitalGains({ asset, purchaseDate: bought, saleDate: '2026-11-17', cost, sale, expenses: 0, improvement: 0, slabRate: slab });
        let worst = 0, n = 0;
        for (const g of [50000, 125000, 200000, 500000, 2000000]) {
            const lt = Math.max(0, g - 125000) * 0.125 * 1.04, st = g * 0.2 * 1.04;
            n++; worst = Math.max(worst, Math.abs(cg('equity', '2023-06-01', 1000000, 1000000 + g).totalTax - lt), Math.abs(cg('equity', '2026-03-01', 1000000, 1000000 + g).totalTax - st));
            n++; worst = Math.max(worst, Math.abs(cg('gold', '2023-01-01', 1000000, 1000000 + g).totalTax - g * 0.125 * 1.04), Math.abs(cg('gold', '2025-06-01', 1000000, 1000000 + g, 20).totalTax - g * 0.2 * 1.04));
            n++; worst = Math.max(worst, Math.abs(cg('debtMF', '2023-05-01', 1000000, 1000000 + g, 30).totalTax - g * 0.3 * 1.04));
        }
        for (const y of [2005, 2010, 2013, 2015, 2018, 2020, 2022, 2024]) {
            const flat = 5000000 * 0.125, idx = Math.max(0, 9000000 - 4000000 * CII[2026] / CII[y]) * 0.2;
            n++; worst = Math.max(worst, Math.abs(cg('property', `${y}-06-01`, 4000000, 9000000).totalTax - Math.min(flat, idx) * 1.04));
        }
        n++; worst = Math.max(worst, Math.abs(cg('property', '2024-09-01', 4000000, 9000000).totalTax - 5000000 * 0.125 * 1.04));
        check(`capital-gains: computeCapitalGains matches sections 196/197/198 and the indexation choice, ${n} cases within ₹1`, worst <= 1, `worst ₹${worst.toFixed(2)}`);
        // Section 2(101): short-term = held not more than 12 months (listed equity) / 24 months (others).
        check('capital-gains: 12 months exactly = short-term equity; 24 months exactly = short-term property', !cg('equity', '2025-11-17', 100, 200).isLong && cg('equity', '2025-11-16', 100, 200).isLong && !cg('property', '2024-11-17', 100, 200).isLong);
        const html = page('capital-gains');
        check('capital-gains: page shows ₹48,750 (LTCG on ₹5 lakh) and ₹1,04,000 (STCG)', html.includes(inr(375000 * 0.125 * 1.04)) && html.includes(inr(500000 * 0.2 * 1.04)));
    }

    // ── LRS TCS: rates from 1 April 2026 (section 394 as amended by the Finance Act, 2026) ──
    {
        const rule = (purpose, amt, prior) => {
            if (purpose === 'eduLoan') return 0;
            if (purpose === 'tour') return amt * 0.02;
            const above = Math.max(0, prior + amt - Math.max(prior, 1000000));
            return above * (purpose === 'eduMedical' ? 0.02 : 0.2);
        };
        let worst = 0, n = 0;
        for (const p of ['eduLoan', 'eduMedical', 'tour', 'other']) for (const a of [0, 300000, 900000, 1000000, 1200000, 1500000, 5000000]) for (const prior of [0, 400000, 600000, 1000000, 1500000]) {
            n++; worst = Math.max(worst, Math.abs(calc.computeLrsTcs(p, a, prior).tcs - rule(p, a, prior)));
        }
        check(`lrs-tcs: computeLrsTcs matches section 394 Sl. 7/8 (2% / 20% above ₹10 lakh, 2% tour, nil on loans), ${n} cases`, worst < 1e-6, `worst ${worst}`);
        const html = page('lrs-tcs');
        check('lrs-tcs: page shows ₹10,000 (₹15 lakh fees) and ₹1,00,000 (₹15 lakh investment)', html.includes(inr(rule('eduMedical', 1500000, 0))) && html.includes(inr(rule('other', 1500000, 0))));
    }

    // ── Tax refund: TDS − tax, and section 437 interest ──
    {
        const emp = (g, tds) => ({ name: 'E', grossSalary: g, gratuityExempt: 0, leaveEncashmentExempt: 0, hraExempt: 0, otherExempt: 0, professionalTax: 0, tdsDeducted: tds });
        const run = (g, tds, intr = 0, bankTds = 0) => js.calculateJobSwitchTax({ employers: [emp(g, tds)], otherIncome: { savingsInterest: 0, otherInterest: intr, tdsOtherIncome: bankTds }, regime: 'new', fy: '2026-27', ageCategory: 'below_60', oldDeductions: { section80C: 0, section80D: 0, section80CCD1B: 0 }, advanceTaxPaid: 0 });
        let worst = 0, n = 0;
        for (const g of [500000, 900000, 1200000, 1500000, 2000000, 3500000]) for (const tds of [0, 50000, 120000, 300000]) for (const [i, bt] of [[0, 0], [80000, 8000]]) {
            const tax = newRegimeTax(g + i);
            n++; worst = Math.max(worst, Math.abs(run(g, tds, i, bt).balancePayable - (tax - tds - bt)));
        }
        check(`tax-refund: balance = independent tax − TDS, ${n} cases within ₹10 (rounding to ₹10)`, worst <= 10, `worst ₹${worst.toFixed(2)}`);
        const refund = 120000 - newRegimeTax(1500000);
        const interest = Math.round(refund * 0.005 * 7);   // April–October 2027, 0.5% a month or part
        const html = page('tax-refund');
        check(`tax-refund: page shows the ${inr(refund)} refund and ${inr(interest)} of section 437 interest`, html.includes(inr(refund)) && html.includes(inr(interest)));
        check('tax-refund: the refund clears the 10% floor of section 437(2)', refund >= 0.1 * newRegimeTax(1500000));
    }
}
