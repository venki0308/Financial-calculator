/**
 * Deposit-scheme formulas the app keeps inside its screens (not exported from src/utils), copied
 * here unchanged so the website shows what the app shows. Each function names the screen it copies
 * and the scheme rule it was checked against (seo/research/verified-facts-deposits.md).
 * scripts/qa-features/deposits.mjs re-implements each one independently.
 *
 * Bank FDs use the app's exported calculateFD (src/utils/calculations.ts) directly.
 */

/**
 * Post Office RD — src/pages/RDCalculator.tsx, "CORE CALCULATION": the deposit of month i grows
 * at the quarterly rate for the (n − i + 1) months it stays in, (1 + r/400)^((n − i + 1)/3).
 * Matches the NSRD Scheme 2019 table (₹100 a month at 7.2% → ₹7,231.38, para 9) and India Post's
 * ₹1,500 a month at 6.7% → ₹1,07,049.
 */
export function rdProjection(monthly: number, ratePct: number, months: number) {
    const r = (ratePct || 0) / 400;
    const validMonths = Math.max(1, months || 1);
    const validMonthly = Math.max(1, monthly || 0);
    let maturity = 0;
    for (let i = 1; i <= validMonths; i++) {
        maturity += validMonthly * Math.pow(1 + r, (validMonths - i + 1) / 3);
    }
    const schedule: { month: number; deposited: number; balance: number }[] = [];
    for (let i = 1; i <= validMonths; i++) {
        let balance = 0;
        for (let j = 1; j <= i; j++) {
            balance += validMonthly * Math.pow(1 + r, (i - j + 1) / 3);
        }
        schedule.push({ month: i, deposited: validMonthly * i, balance });
    }
    const invested = validMonthly * validMonths;
    return { maturity, invested, interest: Math.max(0, maturity - invested), effectiveYield: (Math.pow(1 + r, 4) - 1) * 100, schedule };
}

export interface PpfRow { year: number; contribution: number; opening: number; interest: number; closing: number }

/**
 * PPF — src/pages/AdvancedPPFCalculator.tsx, computePPF: monthly interest on the balance after the
 * month's deposit (deposit by the 5th), credited once a year (PPF Scheme 2019, para 7).
 * depositsPerYear: 12 monthly, 4 quarterly, 2 half-yearly, 1 yearly (in April).
 */
export function ppfSchedule(perPeriodContribution: number, depositsPerYear: number, rate: number, years: number): PpfRow[] {
    const monthlyRate = rate / 100 / 12;
    const gapMonths = 12 / depositsPerYear;
    const rows: PpfRow[] = [];
    let balance = 0;
    for (let y = 1; y <= years; y++) {
        const opening = balance;
        let yearContribution = 0;
        let yearInterest = 0;
        for (let m = 0; m < 12; m++) {
            if (m % gapMonths === 0) {
                balance += perPeriodContribution;
                yearContribution += perPeriodContribution;
            }
            yearInterest += balance * monthlyRate;
        }
        balance += yearInterest;
        rows.push({ year: y, contribution: yearContribution, opening, interest: Math.round(yearInterest), closing: Math.round(balance) });
    }
    return rows;
}

/**
 * NSC — src/pages/NSCCalculator.tsx: compounded once a year for 5 years (NSC VIII Issue Scheme 2019,
 * para 5(3): each year's interest accrues and, up to year 4, is deemed reinvested).
 */
export function nscProjection(investment: number, rate: number) {
    const LOCK_IN = 5;
    const maturity = investment * Math.pow(1 + rate / 100, LOCK_IN);
    const table: { year: number; openBal: number; interest: number; closeBal: number }[] = [];
    let bal = investment;
    for (let y = 1; y <= LOCK_IN; y++) {
        const interest = bal * (rate / 100);
        const newBal = bal + interest;
        table.push({ year: y, openBal: bal, interest, closeBal: newBal });
        bal = newBal;
    }
    return { maturity, interest: maturity - investment, table };
}

/**
 * KVP — src/pages/KVPCalculator.tsx: months to double at a yearly-compounded rate, rounded to the
 * nearest month, and the value at the end of each year. At 7.5% this gives 115 months, the period
 * NSI publishes for the current rate (the Government fixes the period; see the QA note for older rates).
 */
export function kvpProjection(investment: number, rate: number) {
    const doublingYearsExact = Math.log(2) / Math.log(1 + rate / 100);
    const doublingMonths = Math.round(doublingYearsExact * 12);
    const maturity = investment * 2;
    const doublingYearsTotal = doublingMonths / 12;
    const yearTable: { year: number; closeBal: number }[] = [];
    for (let y = 1; y <= Math.ceil(doublingYearsTotal); y++) {
        const newVal = investment * Math.pow(1 + rate / 100, y);
        yearTable.push({ year: y, closeBal: y === Math.ceil(doublingYearsTotal) ? maturity : newVal });
    }
    return { doublingMonths, maturity, interest: maturity - investment, yearTable };
}

/** Post Office MIS limits after the 2023 amendment (G.S.R. 239(E) and 490(E)): ₹9 lakh single, ₹15 lakh joint. */
export const MIS_LIMIT = { single: 900000, joint: 1500000 } as const;

/**
 * Post Office MIS — src/pages/POMISCalculator.tsx: the deposit (capped at the limit) earns the
 * yearly rate ÷ 12 every month for 5 years; the deposit comes back at maturity.
 * Premature closure deductions (MIS Scheme 2019, para 6): 2% up to 3 years, 1% after.
 */
export function misIncome(investment: number, rate: number, joint: boolean) {
    const maxLimit = joint ? MIS_LIMIT.joint : MIS_LIMIT.single;
    const clampedInvestment = Math.min(investment, maxLimit);
    const monthlyIncome = (clampedInvestment * rate / 100) / 12;
    return {
        clampedInvestment, monthlyIncome, yearlyInterest: monthlyIncome * 12, totalInterest: monthlyIncome * 60,
        deductionTo3Years: clampedInvestment * 0.02, deductionAfter3Years: clampedInvestment * 0.01,
    };
}

/** SCSS limit after the Senior Citizens' Savings (Amendment) Scheme, 2023 (G.S.R. 240(E)). */
export const SCSS_MAX = 3000000;

/**
 * SCSS — src/pages/SCSSCalculator.tsx: quarterly interest = deposit × rate ÷ 4, paid out (not
 * compounded); premature closure deducts 1.5% in year 2 and 1% after 2 years (SCSS 2019, para 6).
 */
export function scssIncome(investment: number, rate: number, tenure: number) {
    const annualInterest = investment * rate / 100;
    const quarterlyIncome = annualInterest / 4;
    const totalInterest = annualInterest * tenure;
    return {
        quarterlyIncome, annualInterest, totalInterest, maturityAmount: investment + totalInterest,
        penaltyAfter1Yr: investment * 0.015, penaltyAfter2Yrs: investment * 0.010,
    };
}
