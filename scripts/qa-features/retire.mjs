// Retirement pages (/epf, /nps, /gratuity, /atal-pension): independent re-implementations of the
// formulas in src/landing/features/math-retire.ts (copied from the app's screens), official tables,
// and the headline figures in the built pages. Facts: seo/research/verified-facts-retire.md.

// Atal Pension Yojana Annex-1 (monthly column of each slab), transcribed separately from
// https://jansuraksha.gov.in/Files/APY/ENGLISH/APY.pdf — age: [₹1,000, ₹2,000, ₹3,000, ₹4,000, ₹5,000].
const APY_ANNEX1 = [
    [18, 42, 84, 126, 168, 210], [19, 46, 92, 138, 183, 228], [20, 50, 100, 150, 198, 248],
    [21, 54, 108, 162, 215, 269], [22, 59, 117, 177, 234, 292], [23, 64, 127, 192, 254, 318],
    [24, 70, 139, 208, 277, 346], [25, 76, 151, 226, 301, 376], [26, 82, 164, 246, 327, 409],
    [27, 90, 178, 268, 356, 446], [28, 97, 194, 292, 388, 485], [29, 106, 212, 318, 423, 529],
    [30, 116, 231, 347, 462, 577], [31, 126, 252, 379, 504, 630], [32, 138, 276, 414, 551, 689],
    [33, 151, 302, 453, 602, 752], [34, 165, 330, 495, 659, 824], [35, 181, 362, 543, 722, 902],
    [36, 198, 396, 594, 792, 990], [37, 218, 436, 654, 870, 1087], [38, 240, 480, 720, 957, 1196],
    [39, 264, 528, 792, 1054, 1318], [40, 291, 582, 873, 1164, 1454],
];

// EPFO wage-ceiling FAQs, Q13 (October 2026 onwards): wage → [EPS, employer EPF], rupees.
const EPFO_Q13 = [[10000, 833, 367], [15000, 1250, 550], [20000, 1666, 734], [25000, 2083, 917]];

export default async function ({ check, load, inr, page }) {
    const m = await load('src/landing/features/math-retire.ts');
    const html = (slug) => { try { return page(slug); } catch { return ''; } };

    // ── EPF: year-level recurrence instead of the month loop ──
    // Within a year with monthly deposit c and opening balance B, interest = B·12·i + c·(0+1+…+11)·i.
    const epfIndependent = (basic, pct, rate, age, retire, hike) => {
        const i = rate / 1200;
        let bal = 0; let pay = basic;
        for (let y = age; y < retire; y++) {
            const eps = Math.min(pay, 25000) * 0.0833;
            const c = pay * pct / 100 + pay * 0.12 - eps;
            bal = bal + 12 * c + bal * 12 * i + 66 * c * i;
            pay *= 1 + hike / 100;
        }
        return bal;
    };
    {
        let worst = 0; let n = 0;
        for (const basic of [8000, 15000, 25000, 40000, 100000]) for (const [age, ret] of [[25, 58], [30, 58], [45, 58], [57, 58]]) for (const hike of [0, 5, 10]) for (const pct of [12, 20]) {
            const a = m.epfProjection(basic, pct, 8.25, age, ret, hike).corpus;
            const b = epfIndependent(basic, pct, 8.25, age, ret, hike);
            worst = Math.max(worst, Math.abs(a - b)); n++;
        }
        check(`epfProjection: ${n} cases match a year-level recurrence within ₹1`, worst <= 1, `worst ₹${worst.toFixed(2)}`);
        const bad = EPFO_Q13.filter(([w, eps, epf]) => { const s = m.epfMonthlySplit(w); return Math.abs(s.eps - eps) > 1 || Math.abs(s.employerEpf - epf) > 1; });
        check('epfMonthlySplit matches the EPFO wage-ceiling FAQ table (Q13) within ₹1', bad.length === 0, bad.map((r) => r[0]).join(', '));
    }

    // ── NPS: explicit month-by-month sum instead of the closed form ──
    {
        let worst = 0; let n = 0;
        for (const monthly of [500, 5000, 20000]) for (const [age, ret] of [[25, 60], [40, 60], [55, 60]]) for (const rate of [6, 10, 12]) for (const ap of [20, 40, 100]) {
            const r = rate / 1200; let fv = 0;
            for (let k = 0; k < (ret - age) * 12; k++) fv = (fv + monthly) * (1 + r);
            const p = m.npsProjection(monthly, rate, age, ret, ap, 6);
            const pension = fv * ap / 100 * 0.06 / 12;
            worst = Math.max(worst, Math.abs(p.corpus - fv), Math.abs(p.monthlyPension - pension)); n++;
        }
        check(`npsProjection: ${n} cases match a month-by-month sum within ₹1`, worst <= 1, `worst ₹${worst.toFixed(2)}`);
        const slabs = [[800000, 'all'], [800001, 'mid'], [1200000, 'mid'], [1200001, 'big']].filter(([c, s]) => m.npsExitSlab(c) !== s);
        check('npsExitSlab follows the PFRDA ₹8 lakh / ₹12 lakh normal-exit slabs', slabs.length === 0, slabs.map((x) => x[0]).join(', '));
    }

    // ── Gratuity: 15 days of a 26-day month per counted year, ₹20 lakh ceiling ──
    {
        let worst = 0; let n = 0;
        for (const w of [10000, 30000, 50000, 150000, 400000]) for (const y of [5, 6, 10, 20, 33]) {
            const expect = Math.min(2000000, (w / 26) * 15 * y);
            worst = Math.max(worst, Math.abs(m.gratuityCalc(w, y).gratuity - expect)); n++;
        }
        check(`gratuityCalc: ${n} whole-year cases within ₹1 of wages/26×15×years (cap ₹20 lakh)`, worst <= 1, `worst ₹${worst.toFixed(2)}`);
        const floor = m.gratuityCalc(25000, 10, { grossMonthly: 80000 });
        check('gratuityCalc: 50% wages rule raises ₹25,000 basic in ₹80,000 pay to ₹40,000', floor.wageBase === 40000 && Math.abs(floor.gratuity - 40000 * 150 / 26) < 1);
        check('gratuityCalc: fixed-term employee eligible at 1 year', m.gratuityCalc(20000, 1, { isFTE: true }).isEligible === true);
    }

    // ── APY: copied chart = official Annex-1, cell by cell ──
    {
        const diff = [];
        for (const [age, ...cells] of APY_ANNEX1) cells.forEach((c, i) => { if (m.APY_CHART[age]?.[i] !== c) diff.push(`${age}/${i}`); });
        check('APY_CHART equals the official Annex-1 monthly chart (115 cells)', diff.length === 0 && Object.keys(m.APY_CHART).length === 23, diff.slice(0, 8).join(', '));
        const p = m.apyPlan(30, 4);
        check('apyPlan(30, ₹5,000): ₹577 × 360 months', p.monthly === 577 && p.totalPaid === 577 * 360 && p.nomineeCorpus === 850000);
    }

    // ── Headline figures in the built pages (computed independently above) ──
    {
        const epf = html('epf');
        check('/epf shows the ₹25,000-basic corpus (age 25→58, 5% raises, 8.25%)', epf.includes(inr(epfIndependent(25000, 12, 8.25, 25, 58, 5))));
        const nps = html('nps');
        const r = 10 / 1200; let fv = 0; for (let k = 0; k < 360; k++) fv = (fv + 5000) * (1 + r);
        check('/nps shows the ₹5,000/month corpus and its 20% annuity pension', nps.includes(inr(fv)) && nps.includes(inr(fv * 0.2 * 0.06 / 12)));
        const gr = html('gratuity');
        check('/gratuity shows ₹50,000 × 15 ÷ 26 × 10', gr.includes(inr(50000 * 15 / 26 * 10)));
        const apy = html('atal-pension');
        check('/atal-pension shows ₹577 a month and ₹2,07,720 in total for joining at 30', apy.includes(inr(577)) && apy.includes(inr(577 * 360)));
    }
}
