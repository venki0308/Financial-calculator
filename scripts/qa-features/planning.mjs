/**
 * QA for the planning group: /expense-tracker, /business-tracker, /term-insurance-cover,
 * /health-insurance-claim-settlement-ratio, /property-appreciation, /break-even, /financial-planning.
 * (a) Each formula in src/landing/features/math-planning.ts is re-implemented here a different way and
 *     compared with the copy (and, for the Smart Planner's tax, with the app's compareSalaryTax).
 * (b) Each page's headline figure, computed here independently, must appear in the built HTML.
 */
export default async function ({ check, load, inr, page }) {
    const m = await load('src/landing/features/math-planning.ts');
    const biz = await load('src/utils/businessStorage.ts');
    const tax = await load('src/utils/incomeTax.ts');
    const near = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;
    const html = async (slug) => { try { return String(await page(slug)); } catch { return ''; } };

    // ── Break-even: smallest whole number of units at which sales cover all costs (search, not division).
    const beSearch = (fixed, price, variable) => {
        if (price <= variable) return 0;
        let u = 0;
        while (u * price < fixed + u * variable) u++;
        return u;
    };
    for (const [f, p, v] of [[50000, 200, 120], [30000, 15, 6], [25000, 600, 250], [60000, 450, 270], [1000, 7, 3], [20000, 100, 110], [0, 50, 10]]) {
        const got = m.breakEven(f, p, v);
        check(`break-even units ${f}/${p}/${v}`, got.breakEvenUnits === beSearch(f, p, v), `${got.breakEvenUnits} vs ${beSearch(f, p, v)}`);
        check(`break-even profit row ${f}/${p}/${v}`, got.projection.every((r) => near(r.profit, r.units * (p - v) - f)));
    }
    {
        const h = await html('break-even');
        const b = beSearch(50000, 200, 120);
        check('break-even page shows 625 units and the sales', h.includes(b.toLocaleString('en-IN')) && h.includes(inr(b * 200)));
    }

    // ── Property: repeated multiplication / division instead of Math.pow.
    const grow = (v, r, y) => { let x = v; for (let i = 0; i < y; i++) x *= 1 + r / 100; return x; };
    const deflate = (v, i, y) => { let x = v; for (let k = 0; k < y; k++) x /= 1 + i / 100; return x; };
    for (const [v, r, y] of [[6000000, 6, 10], [6000000, 3.6, 10], [2500000, 8, 20], [9000000, 5, 15], [5000000, 0, 7]]) {
        check(`appreciation ${v}@${r}% ${y}y`, near(m.appreciatedValue(v, r, y), grow(v, r, y), 0.01));
        check(`today's money ${v} 5% ${y}y`, near(m.todaysMoney(v, 5, y), deflate(v, 5, y), 0.01));
    }
    check('appreciation forecast years 5/10/15/20', m.appreciationForecast(1e6, 7).map((x) => x.years).join() === '5,10,15,20');
    {
        const h = await html('property-appreciation');
        check('property page shows ₹60 lakh at 6% for 10 years', h.includes(inr(grow(6000000, 6, 10))));
    }

    // ── Life cover: parts summed independently.
    for (const [inc, loans, deps, kids] of [[1200000, 0, 2, 0], [1500000, 4000000, 2, 0], [600000, 0, 2, 0], [900000, 0, 0, 0], [1800000, 6000000, 3, 0], [1000000, 0, 2, 3]]) {
        const c = m.lifeCover(inc, loans, deps, kids);
        const edu = kids > 0 ? kids * 25e5 : deps * 20e5;
        check(`life cover ${inc}/${loans}/${deps}/${kids}`, c.minimum === inc * 15 && c.recommended === inc * 20 && c.withLoans === inc * 15 + loans && c.total === inc * 16 + loans + edu);
    }
    {
        const h = await html('term-insurance-cover');
        check('term page shows ₹2.4 crore for ₹12 lakh income', h.includes('₹2.4 crore'));
    }

    // ── 50/30/20.
    for (const pay of [25000, 30000, 50000, 75000, 100000, 200000]) {
        const s = m.split503020(pay);
        check(`50/30/20 on ${pay}`, near(s.needs + s.wants + s.savings, pay, 0.001) && near(s.needs, pay / 2) && near(s.savings * 5, pay));
    }
    {
        const h = await html('expense-tracker');
        check('expense-tracker page shows the ₹50,000 split', h.includes(inr(25000)) && h.includes(inr(15000)) && h.includes(inr(10000)));
    }

    // ── Business Tracker: app's calcBizTotals vs a plain sum, and the margin.
    const day = [
        { type: 'income', amount: 14200 }, { type: 'income', amount: 1800 },
        { type: 'expense', amount: 10500 }, { type: 'expense', amount: 350 }, { type: 'expense', amount: 250 },
    ];
    const t = biz.calcBizTotals(day);
    const inc = day.filter((e) => e.type === 'income').reduce((a, e) => a + e.amount, 0);
    const exp = day.filter((e) => e.type === 'expense').reduce((a, e) => a + e.amount, 0);
    check('business day totals', t.income === inc && t.expenses === exp && t.net === inc - exp);
    check('business margin', near(m.bizMargin(inc, inc - exp), 100 * (1 - exp / inc), 1e-9) && m.bizMargin(0, -5) === null);
    {
        const monthNet = 26 * (15000 - 11000) - (20000 + 30000 + 6000);
        const h = await html('business-tracker');
        check('business page shows the month’s net profit', h.includes(inr(monthNet)));
    }

    // ── Smart Planner: tax vs the app's compareSalaryTax (no surcharge below ₹50 lakh), SIP by month-by-month simulation, score by rule table.
    for (const g of [300000, 600000, 1200000, 1275000, 1300000, 1500000, 1800000, 2400000, 3600000, 4800000]) {
        check(`planner tax ${g} = compareSalaryTax`, m.plannerAnnualTax(g) === tax.compareSalaryTax(g, 0).newTax.totalTax, `${m.plannerAnnualTax(g)} vs ${tax.compareSalaryTax(g, 0).newTax.totalTax}`);
    }
    const sipSim = (sip, years, rate = 12) => { let b = 0; for (let i = 0; i < years * 12; i++) b = (b + sip) * (1 + rate / 1200); return b; };
    for (const [corpus, yrs] of [[2500000, 18], [11250000, 32], [24750000, 20]]) {
        const sip = m.plannerSipForCorpus(corpus, yrs);
        check(`planner SIP reaches ${corpus} in ${yrs}y`, near(sipSim(sip, yrs), corpus, 1));
    }
    const score = (salary, age, expenses, savings, emi) => {
        const post = Math.round((salary * 12 - tax.compareSalaryTax(salary * 12, 0).newTax.totalTax) / 12);
        const sr = ((salary - expenses - emi) / salary) * 100;
        const er = (emi / post) * 100;
        const em = savings / expenses;
        const pts = (sr >= 30 ? 30 : sr >= 20 ? 22 : sr >= 10 ? 12 : 5) + (er <= 20 ? 25 : er <= 30 ? 18 : er <= 40 ? 10 : 3) + (em >= 6 ? 25 : em >= 3 ? 15 : 5) + Math.min(20, Math.round((sr / Math.min(100 - age, 80)) * 20));
        return Math.min(100, pts);
    };
    for (const a of [[50000, 28, 25000, 100000, 0], [35000, 25, 22000, 30000, 5000], [80000, 32, 40000, 300000, 15000], [150000, 35, 60000, 400000, 50000], [120000, 40, 55000, 700000, 35000]]) {
        check(`planner score ${a.join('/')}`, m.smartPlan(...a).score === score(...a), `${m.smartPlan(...a).score} vs ${score(...a)}`);
    }
    {
        const h = await html('financial-planning');
        check('financial-planning page shows the default score', h.includes(`${score(50000, 28, 25000, 100000, 0)}/100`));
    }

    // ── IRDAI claim figures: recompute the shares IRDAI prints in Annual Report 2024-25 Table I.29.
    const share = (x, total) => Math.round((x / total) * 10000) / 100;
    const nTot = 20.73 + 351.85, aTot = 7584.58 + 124903.22;
    check('IRDAI I.29 by number: 87.50 / 7.92 / 4.58', share(326.01, nTot) === 87.5 && share(29.51, nTot) === 7.92 && share(17.07, nTot) === 4.58);
    check('IRDAI I.29 by amount: 71.14 / 13.98 / 8.61 / 6.27', share(94247.60, aTot) === 71.14 && share(18521.02, aTot) === 13.98 && share(11412.42, aTot) === 8.61 && share(8306.76, aTot) === 6.27);
    {
        const h = await html('health-insurance-claim-settlement-ratio');
        check('claim page shows the industry 87.5% by number and 71.14% by amount', h.includes('87.5%') && h.includes('71.14%'));
        // Average paid per claim: IRDAI para I.6.5.5 states ₹28,910.
        const avg = (94247.60 * 1e7) / (326.01 * 1e5);
        check('IRDAI average paid per claim within ₹1 of ₹28,910', Math.abs(avg - 28910) <= 1, String(avg));
        check('claim page shows the computed average paid per claim', h.includes(inr(avg)));
        check('claim page has no insurer-wise (Handbook) figures', !/Star Health|Care Health|Niva Bupa|ManipalCigna|Aditya Birla|Table 53|Handbook/.test(h));
    }
}
