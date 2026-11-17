// QA plug-in for the credit group: /credit-card-payoff /credit-card-tracker /loan-foreclosure
// /cibil-score /overdraft-interest /simple-interest /compound-interest.
// (a) Each app function and math-credit.ts helper the pages use is re-implemented here a different
//     way and diffed over a grid; the screens still contain the formulas math-credit.ts copied.
// (b) Each page's headline figure, computed here independently, must appear in its built HTML.
import fs from 'node:fs';

export default async function ({ check, load, inr, page }) {
    const cc = await load('src/utils/creditCardCalculations.ts');
    const calc = await load('src/utils/calculations.ts');
    const mc = await load('src/landing/features/math-credit.ts');
    const cibil = await load('src/data/cibilData.ts');
    /** Built HTML without React's text separators (<!-- -->), so a sentence can be matched whole. */
    const pg = (slug) => page(slug).replace(/<!-- -->/g, '');
    const has = (file, ...needles) => { const s = fs.readFileSync(file, 'utf8').replace(/\s+/g, ' '); return needles.every((n) => s.includes(n)); };

    // ── 1. Multi-card payoff (avalanche / snowball / minimum only) ─────────────────────────
    // Independent simulation: per month, every open card grows by bal × apr/1200 × 1.18; each pays
    // max(5% of bal, bal × apr/1200 + 1% of bal) rounded up, at least ₹200, capped at the balance;
    // the rest of the budget goes to cards in priority order; a card at ≤ ₹1 is closed.
    const minDue = (b, apr) => b <= 0 ? 0 : Math.min(Math.max(Math.ceil(Math.max(b * 0.05, b * apr / 1200 + b * 0.01)), 200), Math.ceil(b));
    const simulate = (cards, budget, key, minOnly = false) => {
        const open = cards.filter((c) => c.balance > 0).map((c) => ({ ...c, bal: c.balance }));
        const prio = [...open].sort(key);
        let month = 0, interest = 0;
        const order = [];
        while (open.some((c) => c.bal > 0) && month < 600) {
            month++;
            let left = budget;
            for (const c of open) if (c.bal > 0) { const i = c.bal * c.apr / 1200 * 1.18; c.bal += i; interest += i; }
            for (const c of open) if (c.bal > 0) { const m = Math.min(minDue(c.bal, c.apr), c.bal); c.bal -= m; left -= m; }
            if (!minOnly) for (const p of prio) { const c = open.find((x) => x.id === p.id); if (c.bal > 0 && left > 0.005) { const x = Math.min(left, c.bal); c.bal -= x; left -= x; } }
            for (const c of open) if (c.bal > 0 && c.bal <= 1) { c.bal = 0; order.push([c.id, month]); } else if (c.bal === 0 && !order.some((o) => o[0] === c.id)) order.push([c.id, month]);
        }
        return { months: month, interest: Math.round(interest), order };
    };
    const card = (id, balance, apr) => ({ id, name: id, balance, apr, minDue: minDue(balance, apr) });
    const SETS = [
        [card('r', 90000, 42), card('f', 45000, 39), card('s', 25000, 30)],
        [card('h', 150000, 43.2), card('l', 20000, 24)],
        [card('a', 80000, 42), card('b', 30000, 36), card('c', 15000, 45)],
    ];
    {
        let bad = [], cases = 0;
        for (const set of SETS) for (const budget of [8500, 10000, 12000, 15000, 20000, 30000]) {
            const tm = set.reduce((s, c) => s + c.minDue, 0);
            if (budget < tm) continue;
            const pairs = [
                [cc.calculateAvalanche(set, budget), simulate(set, budget, (x, y) => y.apr - x.apr)],
                [cc.calculateSnowball(set, budget), simulate(set, budget, (x, y) => x.balance - y.balance)],
            ];
            for (const [a, b] of pairs) {
                cases++;
                if (a.totalMonths !== b.months || Math.abs(a.totalInterest - b.interest) > 2) bad.push(`${budget}: ${a.totalMonths}/${a.totalInterest} vs ${b.months}/${b.interest}`);
            }
        }
        check(`credit: calculateAvalanche/Snowball — ${cases} cases, same months and interest within ₹2`, bad.length === 0, bad.slice(0, 3).join(' | '));
        const m = cc.calculateMinimumOnly(SETS[0]), s = simulate(SETS[0], 1, (x, y) => y.apr - x.apr, true);
        check('credit: calculateMinimumOnly on the page’s three cards = independent run', m.totalMonths === s.months && Math.abs(m.totalInterest - s.interest) <= 2, `${m.totalMonths}/${m.totalInterest} vs ${s.months}/${s.interest}`);
        let worst = 0;
        for (const b of [500, 4000, 25000, 90000, 150000]) for (const apr of [24, 30, 36, 42, 45]) worst = Math.max(worst, Math.abs(cc.getMinimumDue(b, apr) - minDue(b, apr)));
        check('credit: getMinimumDue = max(5%, interest + 1%), at least ₹200', worst === 0, `worst ${worst}`);
    }
    {
        const set = SETS[0], a = simulate(set, 10000, (x, y) => y.apr - x.apr), s = simulate(set, 10000, (x, y) => x.balance - y.balance);
        const h = pg('credit-card-payoff');
        check(`/credit-card-payoff: avalanche ${inr(a.interest)} and snowball ${inr(s.interest)} at ₹10,000 a month in the page`, h.includes(inr(a.interest)) && h.includes(inr(s.interest)));
    }

    // ── 2. Card cycle (calendar) and the add-card screen's statement-to-due count ─────────
    {
        // Walk day by day from the purchase to the first statement day, then on to the first due day.
        const walk = (iso, sd, dd) => {
            let t = Date.parse(iso + 'T00:00:00Z'); const day = 86400000; const start = t;
            while (new Date(t).getUTCDate() !== sd) t += day;
            const stmt = t; t += day;
            while (new Date(t).getUTCDate() !== dd) t += day;
            return { statement: new Date(stmt).toISOString().slice(0, 10), due: new Date(t).toISOString().slice(0, 10), days: Math.round((t - start) / day) };
        };
        const bad = [];
        for (const sd of [1, 5, 10, 15, 20, 25, 28]) for (const dd of [1, 3, 5, 14, 18, 21, 25, 28]) for (const p of ['2026-10-01', '2026-10-16', '2026-11-15', '2026-11-30', '2026-12-31', '2027-02-10']) {
            const a = mc.cardCycleDates(p, sd, dd), b = walk(p, sd, dd);
            if (a.statement !== b.statement || a.due !== b.due || a.interestFreeDays !== b.days) bad.push(`${p} ${sd}/${dd}: ${a.due} vs ${b.due}`);
        }
        check('credit: cardCycleDates = day-by-day walk (336 cases)', bad.length === 0, bad.slice(0, 3).join(' | '));
        check('credit: CreditCardAdd.tsx still counts statement-to-due as diff > 0 ? diff : diff + 30',
            has('src/pages/expenses/CreditCardAdd.tsx', 'const diff = card.dueDate - card.statementDate;', 'return diff > 0 ? diff : diff + 30;'));
        const w = walk('2026-10-16', 15, 5);
        check(`/credit-card-tracker: ${w.days} interest-free days for a 16 Oct purchase in the page`, pg('credit-card-tracker').includes(`${w.days} days without interest`));
    }

    // ── 3. Foreclosure: closed-form balance instead of the schedule ───────────────────────
    {
        const closed = (P, rate, n, k) => {
            const r = rate / 1200, g = (1 + r) ** n, emi = Math.ceil(P * r * g / (g - 1));
            const bal = (j) => P * (1 + r) ** j - emi * ((1 + r) ** j - 1) / r;
            const last = bal(n - 1) * (1 + r);
            return { emi, out: bal(k), saved: (n - k - 1) * emi + last - bal(k) };
        };
        let worst = 0, cases = 0;
        for (const [P, rate, n] of [[500000, 11, 60], [800000, 9, 84], [4000000, 8.5, 240], [300000, 14, 36], [2500000, 9.25, 180]]) for (const k of [1, 6, 12, 24, 36, 48, n - 1]) {
            if (k >= n) continue;
            const e = calc.calculateReducingEMI(P, rate, n), f = calc.calculateForeclosure(e.schedule, k, 2), c = closed(P, rate, n, k); cases++;
            worst = Math.max(worst, Math.abs(f.outstandingPrincipal - c.out), Math.abs(f.interestSaved - c.saved), Math.abs(f.foreclosureCharge - c.out * 0.02));
        }
        check(`credit: calculateForeclosure — ${cases} cases within ₹2 of the closed form`, worst <= 2, `worst ₹${worst.toFixed(2)}`);
        const c = closed(500000, 11, 60, 24);
        const h = pg('loan-foreclosure');
        check(`/loan-foreclosure: ${inr(c.out)} owed and ${inr(c.saved)} saved after 24 EMIs in the page`, h.includes(inr(c.out)) && h.includes(inr(c.saved)));
        // Per-day interest since the last EMI: the same formula as loanStatusEngine's interestAccruedToday.
        check('credit: loanStatusEngine still accrues principal × rate ÷ 365 × days (getPeriodInterest on the page)',
            has('src/utils/loanStatusEngine.ts', 'const dailyRate = profile.annualRate / 365 / 100;', 'principalOutstanding * dailyRate * daysSinceLastEmi')
            && Math.abs(cc.getPeriodInterest(c.out, 11, 12) - c.out * 0.11 / 365 * 12) < 1e-6);
    }

    // ── 4. CIBIL: bands, utilisation, compensation ───────────────────────────────────────
    {
        const bands = [[300, 'Very Poor'], [549, 'Very Poor'], [550, 'Poor'], [649, 'Poor'], [650, 'Average'], [699, 'Average'], [700, 'Good'], [749, 'Good'], [750, 'Very Good'], [779, 'Very Good'], [780, 'Excellent'], [900, 'Excellent']];
        check('credit: getCibilTier band edges 300–900', bands.every(([s, l]) => cibil.getCibilTier(s).label === l));
        let ok = true;
        for (const b of [8000, 25000, 45000, 58000, 90000, 160000]) for (const l of [100000, 150000, 200000]) ok &&= cc.getUtilization(b, l) === Math.round(b * 1000 / l) / 10;
        check('credit: getUtilization = balance ÷ limit to 0.1%', ok);
        const owed = (45 - 30) * 100;
        check(`/cibil-score: ₹100 × (45 − 30) = ${inr(owed)} in the page`, pg('cibil-score').includes(inr(owed)));
    }

    // ── 5. Overdraft (formula copied from OverdraftCalculator.tsx) ──────────────────────────
    {
        let worst = 0;
        for (const u of [50000, 200000, 500000, 1000000]) for (const rate of [8, 10.5, 15]) for (const d of [1, 7, 30, 45, 365]) {
            const daily = Array.from({ length: d }, () => u * rate / 100 / 365).reduce((a, b) => a + b, 0);
            worst = Math.max(worst, Math.abs(mc.odInterest({ limit: 1000000, utilized: u, rate, days: d }).totalInterest - daily));
        }
        check('credit: odInterest = sum of daily interest (within ₹0.01)', worst < 0.01, `worst ${worst}`);
        const st = mc.odStretches([{ balance: 200000, days: 10 }, { balance: 650000, days: 12 }, { balance: 350000, days: 8 }], 1000000, 10.5);
        const prod = (200000 * 10 + 650000 * 12 + 350000 * 8) * 10.5 / 36500;
        check('credit: odStretches = product method (Σ balance × days × rate ÷ 36,500)', Math.abs(st.total - prod) < 1e-6);
        check('credit: OverdraftCalculator.tsx still has the daily formula and effective-cost formula',
            has('src/pages/OverdraftCalculator.tsx', 'const dailyInterest = (activePrincipal * rateNum) / (365 * 100);', 'const standardInterest = dailyInterest * daysNum;',
                '((totalInterest * (365 / daysNum)) + amcAmount + upfrontCosts) / utilizedNum * 100'));
        const head = 500000 * 10.5 / 36500 * 30;
        check(`/overdraft-interest: ${inr(head)} for ₹5 lakh drawn 30 days in the page`, pg('overdraft-interest').includes(inr(head)));
    }

    // ── 6. Simple interest and byaj (formulas copied from SimpleInterestCalculator.tsx) ────
    {
        let ok = true;
        for (const P of [10000, 50000, 100000, 200000]) for (const m of [3, 6, 12, 18, 36]) {
            for (const r of [6, 8, 9, 12]) ok &&= Math.abs(mc.simpleInterest(P, r, m).totalInterest - P * r * m / 1200) < 1e-6;
            for (const f of [0.5, 1, 2, 3]) ok &&= Math.abs(mc.flatByaj(P, f, m).totalInterest - P * f * m / 100) < 1e-6 && mc.flatByaj(P, f, m).equivalentAnnualPct === f * 12;
        }
        check('credit: simpleInterest and flatByaj = P × R × T ÷ 100', ok);
        check('credit: SimpleInterestCalculator.tsx still has both formulas',
            has('src/pages/SimpleInterestCalculator.tsx', 'const monthlyInterest = (principal / 100) * effectiveFlatRate;', 'const totalInterest = (principal * effectiveRate * tenureInYears) / 100;'));
        const h = pg('simple-interest');
        check('/simple-interest: ₹24,000 on ₹1 lakh at 8% for 3 years and ₹2,000 a month at ₹2 per ₹100 in the page', h.includes(inr(100000 * 8 * 3 / 100)) && h.includes(inr(100000 / 100 * 2)));
    }

    // ── 7. Compound interest: repeated multiplication instead of the power ───────────────
    {
        let worst = 0;
        for (const P of [10000, 100000, 500000]) for (const r of [6.9, 7.5, 8, 12]) for (const y of [1, 3, 5, 10, 30]) for (const n of [1, 2, 4, 12]) {
            let a = P; for (let i = 0; i < n * y; i++) a += a * r / 100 / n;
            worst = Math.max(worst, Math.abs(calc.calculateCompoundInterest(P, r, y, n).amount - a));
        }
        check('credit: calculateCompoundInterest = step-by-step compounding (within ₹0.01)', worst < 0.01, `worst ${worst}`);
        let a = 100000; for (let i = 0; i < 20; i++) a *= 1.02;
        let td = 100000; for (let i = 0; i < 4; i++) td *= 1 + 6.9 / 400;
        const h = pg('compound-interest');
        check(`/compound-interest: ${inr(a)} (₹1 lakh, 8%, quarterly, 5 years) and ${inr(td - 100000)} (PO 1-year TD) in the page`, h.includes(inr(a)) && h.includes(inr(td - 100000)));
    }
}
