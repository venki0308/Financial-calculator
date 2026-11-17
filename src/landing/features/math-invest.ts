/**
 * Investment formulas the app keeps inside its screens (not exported from src/utils), copied
 * unchanged so the website pages /sip, /lumpsum, /swp, /cagr and /goal-planner show exactly
 * what the app shows. Each function names the screen it copies. scripts/qa-features/invest.mjs
 * re-implements every function independently and fails if a result differs.
 *
 * Everything else on those pages calls the app's exported functions directly: calculateSIP,
 * calculateCompoundInterest (src/utils/calculations.ts), calculateSTP (stpCalculations.ts),
 * calculatePRAG (pragCalculations.ts), suggestAllocation (constants/assetAllocation.ts) and
 * compareSalaryTax (incomeTax.ts).
 */
import { compareSalaryTax } from '../../utils/incomeTax';

/**
 * SIP in today's money — src/pages/SIPCalculator.tsx, "Inflation-adjusted Insight":
 * value ÷ 1.06^years (the screen assumes 6% inflation).
 */
export const SIP_INFLATION = 6;
export function sipTodaysMoney(futureValue: number, years: number): number {
    return futureValue / Math.pow(1 + SIP_INFLATION / 100, years);
}

/**
 * Lumpsum growth — src/pages/LumpsumCalculator.tsx, "1. CORE CALCULATION": yearly compounding,
 * real value at the inflation-adjusted rate ((1 + r) / (1 + i) − 1), year-by-year table.
 */
export function lumpsumGrowth(principal: number, ratePct: number, years: number, inflationPct: number) {
    const rDecimal = ratePct / 100;
    const iDecimal = inflationPct / 100;
    const fv = principal * Math.pow(1 + rDecimal, years);
    const realRate = ((1 + rDecimal) / (1 + iDecimal)) - 1;
    const realValue = principal * Math.pow(1 + realRate, years);
    const table: Array<{ year: number; value: number; gain: number; yearlyGain: number }> = [];
    let prev = principal;
    for (let y = 1; y <= years; y++) {
        const v = principal * Math.pow(1 + rDecimal, y);
        table.push({ year: y, value: v, gain: v - principal, yearlyGain: v - prev });
        prev = v;
    }
    return { fv, gain: fv - principal, realRate, realValue, wealthRatio: fv / principal, table };
}

/**
 * Systematic withdrawal plan — src/pages/SWPCalculator.tsx, "1. CORE CALCULATION": each month the
 * balance earns a month's return (yearly rate ÷ 12), then the withdrawal is paid (or whatever is
 * left). Also copied from the same block: how long the corpus lasts past the tenure (up to 100
 * years), the largest withdrawal that lasts exactly the tenure, and the last withdrawal in today's
 * money. The `monthly` rows record the same loop month by month for the website's schedule table.
 */
export function swpPlan(principal: number, withdrawal: number, ratePct: number, years: number, inflationPct: number) {
    const r = ratePct / 12 / 100;
    const n = years * 12;
    let currentBalance = principal;
    let totalWithdrawn = 0;
    let depletionMonth: number | null = null;
    const monthly: Array<{ month: number; open: number; interest: number; withdrawn: number; close: number }> = [];
    const yearlySchedule: Array<{ year: number; open: number; withdrawn: number; interest: number; close: number }> = [];
    let currentYearOpen = principal;
    let currentYearWithdrawn = 0;
    let currentYearInterest = 0;
    for (let i = 1; i <= n; i++) {
        const open = currentBalance;
        const interestForMonth = currentBalance * r;
        currentYearInterest += interestForMonth;
        currentBalance += interestForMonth;
        let paid: number;
        if (currentBalance >= withdrawal) {
            currentBalance -= withdrawal;
            paid = withdrawal;
        } else {
            paid = currentBalance;
            currentBalance = 0;
        }
        totalWithdrawn += paid;
        currentYearWithdrawn += paid;
        monthly.push({ month: i, open, interest: interestForMonth, withdrawn: paid, close: currentBalance });
        if (currentBalance <= 0 && depletionMonth === null) depletionMonth = i;
        if (i % 12 === 0 || i === n || currentBalance === 0) {
            const yearNum = Math.ceil(i / 12);
            if (yearlySchedule.length === 0 || yearlySchedule[yearlySchedule.length - 1].year !== yearNum) {
                yearlySchedule.push({ year: yearNum, open: currentYearOpen, withdrawn: currentYearWithdrawn, interest: currentYearInterest, close: currentBalance });
                currentYearOpen = currentBalance;
                currentYearWithdrawn = 0;
                currentYearInterest = 0;
            }
        }
        if (currentBalance <= 0) break;
    }
    const swr = principal > 0 ? (withdrawal * 12 / principal) * 100 : 0;
    const realWithdrawalValueAtEnd = withdrawal / Math.pow(1 + (inflationPct / 100), years);
    const perpetual = withdrawal <= 0 || principal * r >= withdrawal;
    let longevityMonths: number | null = null;
    if (!perpetual) {
        let bal = principal;
        for (let m = 1; m <= 1200; m++) {
            bal = bal * (1 + r) - withdrawal;
            if (bal <= 0) { longevityMonths = m; break; }
        }
    }
    const maxSustainableWithdrawal = n > 0 ? (r > 0 ? principal * r / (1 - Math.pow(1 + r, -n)) : principal / n) : 0;
    return { finalBalance: currentBalance, totalWithdrawn, monthly, yearlySchedule, depletionMonth, swr, realWithdrawalValueAtEnd, perpetual, longevityMonths, maxSustainableWithdrawal };
}

/**
 * CAGR — src/pages/CAGRCalculator.tsx, "1. CORE CALCULATION": (final ÷ initial)^(1/years) − 1,
 * absolute return, rule-of-72 doubling time and the smooth year-by-year path.
 */
export function cagrResult(initial: number, final: number, years: number) {
    const validInitial = Math.max(1, initial);
    const validFinal = Math.max(0, final);
    const validYears = Math.max(0.1, years);
    const cagr = validFinal === 0 ? -100 : (Math.pow(validFinal / validInitial, 1 / validYears) - 1) * 100;
    const absReturn = ((validFinal / validInitial) - 1) * 100;
    let doubleTime = 0;
    if (cagr > 0) doubleTime = 72 / cagr;
    else if (cagr < 0) doubleTime = -1;
    const schedule: Array<{ year: number; value: number }> = [];
    for (let y = 1; y <= Math.ceil(validYears); y++) {
        const t = Math.min(y, validYears);
        schedule.push({ year: y, value: validInitial * Math.pow(Math.max(0, 1 + cagr / 100), t) });
    }
    return { cagr, absReturn, doubleTime, schedule };
}

/**
 * Goal Planner — src/pages/GoalPlanner.tsx, `result`: today's cost grown by inflation, existing
 * savings grown monthly at the expected return, and the monthly SIP (start of month) for the rest.
 */
export function goalPlan(currentCost: number, inflationPct: number, years: number, expectedReturnPct: number, currentSavings: number) {
    const targetFV = currentCost * Math.pow(1 + (inflationPct / 100), years);
    const savingsFV = currentSavings * Math.pow(1 + expectedReturnPct / 100 / 12, years * 12);
    const remaining = Math.max(0, targetFV - savingsFV);
    const r = expectedReturnPct / 12 / 100;
    const n = years * 12;
    const realRate = ((1 + expectedReturnPct / 100) / (1 + inflationPct / 100)) - 1;
    if (r === 0 || n === 0) return { monthlySIP: remaining / Math.max(n, 1), totalInvested: remaining, wealthGained: 0, targetFV, savingsFV, realRate };
    const sipFactor = (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    const monthlySIP = remaining / sipFactor;
    const totalInvested = monthlySIP * n;
    return { monthlySIP, totalInvested, wealthGained: remaining - totalInvested, targetFV, savingsFV, realRate };
}

/** Section 123 of the Income-tax Act, 2025 (the old 80C): Schedule XV items together, up to ₹1,50,000 a year. */
export const SEC123_LIMIT = 150000;

/**
 * ELSS tax saving (no app screen; a combination of the app's compareSalaryTax, no new formula):
 * the ELSS amount that still fits under the section 123 limit after the other section 123 items,
 * and the Old Regime tax with and without it. `otherDeductions` = other Old Regime deductions
 * (80D, HRA, home-loan interest …). The New Regime allows no section 123 deduction.
 */
export function elssTaxSaved(salary: number, elssYearly: number, otherSec123: number, otherDeductions = 0) {
    const room = Math.max(0, SEC123_LIMIT - otherSec123);
    const counted = Math.max(0, Math.min(elssYearly, room));
    const base = Math.min(otherSec123, SEC123_LIMIT) + otherDeductions;
    const without = compareSalaryTax(salary, base);
    const withElss = compareSalaryTax(salary, base + counted);
    return {
        counted,
        oldWithout: without.oldTax.totalTax,
        oldWith: withElss.oldTax.totalTax,
        saved: without.oldTax.totalTax - withElss.oldTax.totalTax,
        newTax: without.newTax.totalTax,
    };
}

/**
 * The lump sum to set aside today instead of a SIP: the smallest "current savings" (rounded up to
 * ₹1,000) at which the app's Goal Planner needs no monthly SIP. A search over goalPlan, no new formula.
 */
export function goalLumpSumToday(currentCost: number, inflationPct: number, years: number, expectedReturnPct: number): number {
    const needs = (s: number) => goalPlan(currentCost, inflationPct, years, expectedReturnPct, s).monthlySIP > 0;
    let lo = 0;
    let hi = goalPlan(currentCost, inflationPct, years, expectedReturnPct, 0).targetFV;
    while (hi - lo > 1) {
        const mid = (lo + hi) / 2;
        if (needs(mid)) lo = mid; else hi = mid;
    }
    return Math.ceil(hi / 1000) * 1000;
}
