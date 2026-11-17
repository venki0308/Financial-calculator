// Page group `invest`: /sip /lumpsum /swp /stp /cagr /portfolio-rebalancing /elss /goal-planner.
// Each formula is re-implemented here by a different method and compared with the app function
// (or the math-invest.ts copy of the app screen) over several inputs; then each page's headline
// figure, computed here independently, must appear in the built page.
export default async function ({ check, load, inr, page }) {
    const calc = await load('src/utils/calculations.ts');
    const mi = await load('src/landing/features/math-invest.ts');
    const stpMod = await load('src/utils/stpCalculations.ts');
    const prag = await load('src/utils/pragCalculations.ts');
    const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
    const pc = (v) => `${(Math.round(v * 100) / 100).toLocaleString('en-IN')}%`;

    // ── SIP: sum of instalments, each grown from its own month (start-of-month payment) ──
    const sipSum = (m, rate, years) => { const i = rate / 1200; let fv = 0; for (let k = 1; k <= years * 12; k++) fv += m * Math.pow(1 + i, k); return fv; };
    for (const [m, r, y] of [[5000, 12, 10], [1000, 8, 25], [25000, 14, 3], [10000, 12, 20], [12500, 12, 3]]) {
        check(`sip ${m}/${r}%/${y}y = calculateSIP`, near(sipSum(m, r, y), calc.calculateSIP(m, r, y).futureValue, 0.01));
    }
    for (const [v, y] of [[1161695, 10], [5e6, 25]]) check(`sip today's money ${v}/${y}y`, near(v / 1.06 ** y, mi.sipTodaysMoney(v, y), 0.01));

    // ── Lumpsum: grow year by year; real value = nominal ÷ inflation factor ──
    for (const [p, r, y, inf] of [[100000, 12, 10, 5], [500000, 10, 7, 5], [200000, 12, 18, 6], [2500000, 8, 5, 5]]) {
        let v = p; for (let k = 0; k < y; k++) v *= 1 + r / 100;
        const g = mi.lumpsumGrowth(p, r, y, inf);
        check(`lumpsum ${p}/${r}%/${y}y`, near(v, g.fv, 0.01) && near(v / (1 + inf / 100) ** y, g.realValue, 0.01));
    }

    // ── SWP: closed-form balance, log formula for the month it runs out, bisection for the max withdrawal ──
    const swpBal = (p, w, rate, k) => { const i = rate / 1200; return p * (1 + i) ** k - w * ((1 + i) ** k - 1) / i; };
    const swpMonths = (p, w, rate) => { const i = rate / 1200; return p * i >= w ? null : Math.ceil(-Math.log(1 - p * i / w) / Math.log(1 + i)); };
    const swpMax = (p, rate, n) => { let lo = 0, hi = p; for (let t = 0; t < 200; t++) { const mid = (lo + hi) / 2; if (swpBal(p, mid, rate, n) > 0) lo = mid; else hi = mid; } return lo; };
    for (const [p, w, r, y] of [[5000000, 40000, 8, 20], [1000000, 10000, 8, 10], [10000000, 100000, 8, 25], [5000000, 30000, 8, 20], [2500000, 20000, 8, 30], [5000000, 40000, 6, 20]]) {
        const s = mi.swpPlan(p, w, r, y, 5);
        const mo = swpMonths(p, w, r);
        check(`swp ${p}/${w}/${r}% runs out at month ${mo ?? 'never'}`, mo === null ? s.perpetual : s.longevityMonths === mo);
        check(`swp ${p}/${r}%/${y}y max withdrawal`, near(swpMax(p, r, y * 12), s.maxSustainableWithdrawal, 0.5));
        if (mo === null || mo > y * 12) check(`swp ${p}/${w} balance after ${y}y`, near(swpBal(p, w, r, y * 12), s.finalBalance, 1));
    }

    // ── STP (fixed, monthly, no tax/exit load): each transfer's equity units grow for the remaining months ──
    const stpInd = (a, n, src, tgt) => {
        const is = src / 1200, it = tgt / 1200, t = a / n; let bal = a, eq = 0;
        for (let k = 1; k <= n; k++) { bal = bal * (1 + is); const x = Math.min(t, bal); bal -= x; eq += x * (1 + it) ** (n - k); }
        return { total: (bal < 1 ? 0 : bal) + eq, lump: a * (1 + it) ** n };
    };
    for (const [a, n, s, t] of [[1200000, 12, 7, 12], [1200000, 6, 7, 12], [1200000, 24, 7, 12], [1200000, 12, 4, 12], [500000, 20, 7, 12]]) {
        const app = stpMod.calculateSTP({ initialAmount: a, transferAmount: a / n, frequency: 'monthly', sourceRate: s, targetRate: t, durationMonths: n, stpType: 'fixed', exitLoadPercent: 0, exitLoadFreeMonths: 12, taxSlabPercent: 0 });
        const ind = stpInd(a, n, s, t);
        check(`stp ${a}/${n}m/${s}%→${t}%`, near(ind.total, app.totalPortfolioValue, 1) && near(ind.lump, app.lumpsumDirectComparison, 1));
    }

    // ── CAGR: logs instead of a fractional power ──
    for (const [s, e, y] of [[250000, 410000, 4], [100000, 300000, 3], [500000, 450000, 3], [100000, 200000, 5], [50000, 180000, 10]]) {
        check(`cagr ${s}→${e} in ${y}y`, near(Math.exp(Math.log(e / s) / y) - 1, mi.cagrResult(s, e, y).cagr / 100, 1e-9));
    }

    // ── Rebalancing: trade = total × target − holding; new-money months = deficits ÷ monthly ──
    const H = { equity: 1400000, debt: 400000, gold: 100000, cash: 100000, realEstate: 0, international: 0 };
    const T = { equity: 60, debt: 30, gold: 10, cash: 0, realEstate: 0, international: 0 };
    const total = Object.values(H).reduce((x, y) => x + y, 0);
    const full = prag.calculatePRAG({ holdings: H, targetAllocation: T, rebalanceMode: 'full' });
    for (const k of ['equity', 'debt', 'gold', 'cash']) {
        const diff = total * T[k] / 100 - H[k];
        const a = full.rebalancingActions.find((x) => x.key === k);
        check(`rebalance ${k}: ${diff > 0 ? 'buy' : 'sell'} ${Math.abs(diff)}`, a.amount === Math.abs(diff) && a.action === (diff > 0 ? 'BUY' : diff < 0 ? 'SELL' : 'HOLD'));
    }
    const deficit = ['equity', 'debt', 'gold', 'cash'].reduce((s, k) => s + Math.max(0, total * T[k] / 100 - H[k]), 0);
    const fresh = prag.calculatePRAG({ holdings: H, targetAllocation: T, rebalanceMode: 'newInvestment', newMonthlyInvestment: 25000 });
    check('rebalance new money: months', fresh.newInvestmentPlan.monthsToRebalance === Math.ceil(deficit / 25000));

    // ── Goal planner: future cost by yearly loop; SIP from a summed annuity factor; lump sum by discounting ──
    const goalInd = (cost, inf, y, ret, saved) => {
        let fc = cost; for (let k = 0; k < y; k++) fc *= 1 + inf / 100;
        const i = ret / 1200; let f = 0; for (let k = 1; k <= y * 12; k++) f += (1 + i) ** k;
        const need = Math.max(0, fc - saved * (1 + i) ** (y * 12));
        return { fc, sip: need / f, lump: Math.ceil(fc / (1 + i) ** (y * 12) / 1000) * 1000 };
    };
    for (const [c, inf, y, r, s] of [[2000000, 8, 15, 12, 0], [2000000, 8, 15, 12, 300000], [5000000, 7, 18, 12, 0], [1500000, 8, 12, 10, 0], [1500000, 6, 6, 9, 0]]) {
        const a = mi.goalPlan(c, inf, y, r, s), b = goalInd(c, inf, y, r, s);
        check(`goal ${c}/${inf}%/${y}y/${r}%/${s}`, near(a.targetFV, b.fc, 0.01) && near(a.monthlySIP, b.sip, 0.01));
        if (s === 0) check(`goal lump sum ${c}/${y}y`, mi.goalLumpSumToday(c, inf, y, r) === b.lump);
    }

    // ── ELSS: Old/New Regime tax by independent slab tables (resident, below 60, income < ₹50 lakh) ──
    const slab = (x, bands) => { let t = 0, prev = 0; for (const [upto, rt] of bands) { if (x > prev) t += (Math.min(x, upto) - prev) * rt; prev = upto; } return t; };
    const r10 = (x) => Math.round(x / 10) * 10;
    const oldTax = (sal, ded) => { const ti = r10(Math.max(0, sal - 50000 - ded)); const t = ti <= 500000 ? 0 : slab(ti, [[250000, 0], [500000, 0.05], [1000000, 0.2], [Infinity, 0.3]]); return Math.round(t * 1.04); };
    const newTax = (sal) => { const ti = r10(Math.max(0, sal - 75000)); let t = slab(ti, [[400000, 0], [800000, 0.05], [1200000, 0.1], [1600000, 0.15], [2000000, 0.2], [2400000, 0.25], [Infinity, 0.3]]); if (ti <= 1200000) t = 0; else t = Math.min(t, ti - 1200000); return Math.round(t * 1.04); };
    for (const [sal, elss, other, ded] of [[1500000, 150000, 0, 0], [1200000, 90000, 60000, 0], [2000000, 150000, 0, 575000], [2500000, 150000, 0, 0], [1000000, 150000, 0, 0]]) {
        const a = mi.elssTaxSaved(sal, elss, other, ded);
        const counted = Math.min(elss, 150000 - other);
        const saved = oldTax(sal, other + ded) - oldTax(sal, other + ded + counted);
        check(`elss ${sal}: saved ${saved}, new ${newTax(sal)}`, near(a.saved, saved, 10) && near(a.newTax, newTax(sal), 10));
    }

    // ── Headline figures on the built pages ──
    const swpMain = swpMonths(5000000, 40000, 8);
    const want = [
        ['sip', inr(sipSum(5000, 12, 10))],
        ['lumpsum', inr(100000 * 1.12 ** 10)],
        ['swp', inr(swpMax(5000000, 8, 240))],
        ['swp', `${Math.floor(swpMain / 12)} years ${swpMain % 12} months`],
        ['stp', inr(stpInd(1200000, 12, 7, 12).total)],
        ['cagr', pc((Math.exp(Math.log(410000 / 250000) / 4) - 1) * 100)],
        ['portfolio-rebalancing', `Sell ${inr(200000)}`],
        ['elss', inr(oldTax(1500000, 0) - oldTax(1500000, 150000))],
        ['goal-planner', inr(goalInd(2000000, 8, 15, 12, 0).sip)],
    ];
    for (const [slug, fig] of want) check(`/${slug} shows ${fig}`, page(slug).includes(fig));
}
