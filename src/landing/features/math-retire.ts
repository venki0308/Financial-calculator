/**
 * Retirement formulas the app keeps inside its screens (not exported from src/utils), copied here
 * unchanged so the website shows what the app shows. Each function names the screen it copies.
 * scripts/qa-features/retire.mjs re-implements each one independently and compares.
 * Rules behind them: seo/research/verified-facts-retire.md.
 */

/** EPS pensionable-wage ceiling — src/pages/EPFCalculator.tsx EPS_WAGE_CEILING (₹25,000 from 17 Sep 2026, S.O. 5109(E)). */
export const EPS_WAGE_CEILING = 25000;

export interface EpfYear { year: number; age: number; empContrib: number; emplerContrib: number; interest: number; closingBal: number }

/**
 * EPF corpus — src/pages/EPFCalculator.tsx, "1. CORE CALCULATION". Employee pays `totalEmpPct`
 * (12% + any VPF) of basic + DA; the employer's 12% is split, EPS taking 8.33% of pay up to the
 * ceiling and EPF the rest. Interest each month on the balance before that month's contribution,
 * credited at the year end; pay rises by `hike`% a year.
 */
export function epfProjection(basic: number, totalEmpPct: number, rate: number, age: number, retireAge: number, hike: number) {
    const years = Math.max(retireAge - age, 0);
    let balance = 0;
    let totalEmp = 0;
    let totalEmployer = 0;
    let salary = basic;
    const schedule: EpfYear[] = [];
    for (let y = 0; y < years; y++) {
        const openingBal = balance;
        let yearEmp = 0;
        let yearEmpler = 0;
        let runningBal = openingBal;
        let yearlyInterest = 0;
        const monthlyRate = rate / 100 / 12;
        for (let m = 0; m < 12; m++) {
            const emp = salary * totalEmpPct / 100;
            const epsContrib = Math.min(salary * 0.0833, EPS_WAGE_CEILING * 0.0833);
            const employer = (salary * 0.12) - epsContrib;
            yearlyInterest += runningBal * monthlyRate;
            runningBal += emp + employer;
            yearEmp += emp;
            yearEmpler += employer;
        }
        balance = runningBal + yearlyInterest;
        totalEmp += yearEmp;
        totalEmployer += yearEmpler;
        schedule.push({ year: y + 1, age: age + y + 1, empContrib: yearEmp, emplerContrib: yearEmpler, interest: yearlyInterest, closingBal: balance });
        salary *= (1 + hike / 100);
    }
    const totalInterest = Math.max(0, balance - totalEmp - totalEmployer);
    return { corpus: balance, totalEmp, totalEmployer, totalInterest, schedule, years };
}

/** One month's split of a basic + DA — the same lines of EPFCalculator.tsx (employee, EPS, employer EPF). */
export function epfMonthlySplit(basic: number, totalEmpPct = 12) {
    const emp = basic * totalEmpPct / 100;
    const eps = Math.min(basic * 0.0833, EPS_WAGE_CEILING * 0.0833);
    const employerEpf = basic * 0.12 - eps;
    return { emp, eps, employerEpf, intoEpf: emp + employerEpf };
}

export interface NpsYear { year: number; age: number; contrib: number; corpus: number; cumContrib: number }

/**
 * NPS corpus and pension — src/pages/NPSCalculator.tsx, "result": monthly contribution at the
 * start of each month, compounded monthly at the assumed return; `annuityPct` of the corpus buys
 * an annuity paying `annuityRate`% a year, the rest is the lump sum.
 */
export function npsProjection(monthly: number, rate: number, age: number, retireAge: number, annuityPct: number, annuityRate: number) {
    const years = Math.max(retireAge - age, 1);
    const r = rate / 12 / 100;
    const n = years * 12;
    const invested = monthly * n;
    const fv = r === 0 ? invested : monthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    const annuity = fv * (annuityPct / 100);
    const lumpsum = fv - annuity;
    const monthlyPension = annuity * (annuityRate / 100) / 12;
    const timeline: NpsYear[] = [];
    let cumContrib = 0;
    for (let y = 1; y <= years; y++) {
        const nY = y * 12;
        cumContrib += monthly * 12;
        const corpus = r === 0 ? cumContrib : monthly * (((Math.pow(1 + r, nY) - 1) / r) * (1 + r));
        timeline.push({ year: y, age: age + y, contrib: monthly * 12, corpus: Math.round(corpus), cumContrib });
    }
    return { invested, corpus: Math.round(fv), wealthGained: Math.round(fv - invested), annuity: Math.round(annuity), lumpsum: Math.round(lumpsum), monthlyPension: Math.round(monthlyPension), years, timeline };
}

/**
 * NPS normal-exit options for All Citizen and Corporate subscribers — not an app formula: the slabs
 * of the PFRDA (Exits and Withdrawals under the NPS) (Amendment) Regulations, 2025 (16 Dec 2025),
 * as listed on npstrust.org.in/normal-exit. Amounts in rupees.
 */
export type NpsExitSlab = 'all' | 'mid' | 'big';
export function npsExitSlab(corpus: number): NpsExitSlab {
    if (corpus <= 800000) return 'all';      // ≤ ₹8 lakh: all as lump sum, SLW or SUR
    if (corpus <= 1200000) return 'mid';     // ₹8–12 lakh: ₹6 lakh lump sum + rest as annuity or SUR (6+ yrs), or 80:20
    return 'big';                            // > ₹12 lakh: up to 80% lump sum, at least 20% annuity
}

/** Eligibility threshold of GratuityCalculator.tsx ("4 years 240 days"); kept only so results match the app. */
const ELIGIBILITY_YEARS = 4 + 240 / 365;

/**
 * Gratuity — src/pages/GratuityCalculator.tsx, "result" (private employer; tax part left out).
 * wages × 15 × years ÷ 26, a part-year of 6 months or more counted as a year; under the Code on
 * Social Security the wage base is at least half of gross pay when `grossMonthly` is given;
 * capped at ₹20 lakh. Fixed-term employees qualify after 1 year.
 */
export function gratuityCalc(salary: number, years: number, opts: { grossMonthly?: number; newCode?: boolean; isFTE?: boolean } = {}) {
    const newCode = opts.newCode ?? true;
    const grossMonthly = opts.grossMonthly ?? 0;
    const isFTE = opts.isFTE ?? false;
    const wageBase = newCode && grossMonthly > 0 ? Math.max(salary, grossMonthly * 0.5) : salary;
    const floorApplied = wageBase > salary;
    const isEligible = isFTE ? years >= 1 : years >= ELIGIBILITY_YEARS;
    const fullYears = Math.floor(years);
    const fraction = years - fullYears;
    const payoutYears = fraction >= 0.5 ? fullYears + 1 : fullYears;
    const formulaGratuity = isEligible ? (wageBase * 15 * payoutYears) / 26 : 0;
    const gratuity = Math.min(formulaGratuity, 2000000);
    return { gratuity, formulaGratuity, capped: formulaGratuity > 2000000, wageBase, floorApplied, isEligible, payoutYears };
}

/** Atal Pension Yojana pension slabs (₹ a month from 60). */
export const APY_PENSIONS = [1000, 2000, 3000, 4000, 5000] as const;

/**
 * Atal Pension Yojana monthly contribution chart — src/components/APYContributionCalculator.tsx
 * TABLE, unchanged: rows = entry age 18–40, columns = pension ₹1,000…₹5,000. Matches Annex-1 of
 * the official scheme details (jansuraksha.gov.in/Files/APY/ENGLISH/APY.pdf), checked cell by cell.
 */
export const APY_CHART: Record<number, [number, number, number, number, number]> = {
    18: [42, 84, 126, 168, 210],
    19: [46, 92, 138, 183, 228],
    20: [50, 100, 150, 198, 248],
    21: [54, 108, 162, 215, 269],
    22: [59, 117, 177, 234, 292],
    23: [64, 127, 192, 254, 318],
    24: [70, 139, 208, 277, 346],
    25: [76, 151, 226, 301, 376],
    26: [82, 164, 246, 327, 409],
    27: [90, 178, 268, 356, 446],
    28: [97, 194, 292, 388, 485],
    29: [106, 212, 318, 423, 529],
    30: [116, 231, 347, 462, 577],
    31: [126, 252, 379, 504, 630],
    32: [138, 276, 414, 551, 689],
    33: [151, 302, 453, 602, 752],
    34: [165, 330, 495, 659, 824],
    35: [181, 362, 543, 722, 902],
    36: [198, 396, 594, 792, 990],
    37: [218, 436, 654, 870, 1087],
    38: [240, 480, 720, 957, 1196],
    39: [264, 528, 792, 1054, 1318],
    40: [291, 582, 873, 1164, 1454],
};

/** Return of corpus to the nominee by slab (Annex-1, same PDF): ₹1.7 lakh per ₹1,000 of pension. */
export const APY_NOMINEE_CORPUS = [170000, 340000, 510000, 680000, 850000] as const;

/** Monthly contribution, months paid and total paid till 60 — same arithmetic as APYContributionCalculator.tsx. */
export function apyPlan(age: number, pensionIdx: number) {
    const a = Math.max(18, Math.min(40, Math.round(age)));
    const monthly = APY_CHART[a][pensionIdx];
    const years = 60 - a;
    return { age: a, monthly, years, months: years * 12, totalPaid: monthly * 12 * Math.max(1, years), pension: APY_PENSIONS[pensionIdx], nomineeCorpus: APY_NOMINEE_CORPUS[pensionIdx] };
}
