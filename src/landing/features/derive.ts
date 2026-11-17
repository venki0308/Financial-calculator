/**
 * Figures derived from the app's own functions (no new formulas): searches and scenario
 * runs over compareSalaryTax, calculateAdvancedMortgage and the copied SIP formulas.
 * Used by the feature-page calculators and by the tables rendered at build time.
 */
import { compareSalaryTax } from '../../utils/incomeTax';
import { calculateAdvancedMortgage } from '../../utils/calculations';
import { stepUpSip } from './math';

/**
 * The smallest Old Regime deductions (on top of the standard deduction) at which the Old
 * Regime's tax is no higher than the New Regime's, rounded up to the next ₹1,000.
 * 0 if the Old Regime already wins with none; null if no amount up to the salary does it.
 */
export function breakEvenDeductions(salary: number): number | null {
    const target = compareSalaryTax(salary, 0).newTax.totalTax;
    const old = (d: number) => compareSalaryTax(salary, d).oldTax.totalTax;
    if (old(0) <= target) return 0;
    let lo = 0;
    let hi = Math.max(0, salary);
    if (old(hi) > target) return null;
    while (hi - lo > 100) {
        const mid = Math.floor((lo + hi) / 2);
        if (old(mid) <= target) hi = mid; else lo = mid;
    }
    // Smallest multiple of ₹1,000 that works (rounding hi up overshoots when the exact answer is a round figure).
    let k = Math.floor(lo / 1000) * 1000;
    while (old(k) > target) k += 1000;
    return k;
}

export type PrepayMode = 'reduce_tenure' | 'reduce_emi';

/** One lump-sum prepayment, paid with the EMI of month `afterMonths` (app's calculateAdvancedMortgage). */
export function prepaymentScenario(principal: number, ratePct: number, years: number, amount: number, afterMonths: number, mode: PrepayMode) {
    const months = years * 12;
    const base = calculateAdvancedMortgage(principal, ratePct, months, { lumpSums: [], monthlyExtraEMI: 0, mode });
    const paid = calculateAdvancedMortgage(principal, ratePct, months, { lumpSums: amount > 0 ? [{ month: afterMonths, amount }] : [], monthlyExtraEMI: 0, mode });
    const newEmi = mode === 'reduce_emi' && paid.schedule[afterMonths] ? paid.schedule[afterMonths].emi : base.emi;
    return {
        emi: base.emi,
        newEmi,
        baseInterest: base.totalInterest,
        newInterest: paid.totalInterest,
        saved: Math.max(0, base.totalInterest - paid.totalInterest),
        months,
        newMonths: paid.schedule.length,
        monthsSaved: Math.max(0, months - paid.schedule.length),
    };
}

/** Starting monthly SIP (rounded up to ₹100) that reaches `target` with a yearly step-up of `stepPct`. */
export function stepUpStartFor(target: number, years: number, ratePct: number, stepPct: number): number {
    let lo = 0;
    let hi = target;
    while (hi - lo > 1) {
        const mid = (lo + hi) / 2;
        if (stepUpSip(mid, stepPct, ratePct, years).futureValue >= target) hi = mid; else lo = mid;
    }
    return Math.ceil(hi / 100) * 100;
}

/** "3 years 4 months" from a month count. */
export function yearsMonths(months: number): string {
    const y = Math.floor(months / 12);
    const m = months % 12;
    const ys = y ? `${y} year${y === 1 ? '' : 's'}` : '';
    const ms = m ? `${m} month${m === 1 ? '' : 's'}` : '';
    return [ys, ms].filter(Boolean).join(' ') || '0 months';
}
