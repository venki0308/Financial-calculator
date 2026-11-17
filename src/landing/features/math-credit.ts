/**
 * Formulas the app keeps inside two screens, copied unchanged for the website pages
 * /overdraft-interest and /simple-interest (credit group). Everything else on the credit pages
 * comes straight from src/utils (creditCardCalculations.ts, calculations.ts).
 * scripts/qa-features/credit.mjs re-implements each function a different way and checks that
 * the screens still contain these formulas.
 */

/**
 * Overdraft interest — src/pages/OverdraftCalculator.tsx (non-flexi OD):
 *   activePrincipal = utilized > limit ? limit : utilized
 *   dailyInterest   = activePrincipal × rate ÷ (365 × 100)
 *   standardInterest = dailyInterest × days
 *   excess          = utilized > limit ? utilized − limit : 0
 *   penaltyInterest = excess × (rate + excessPenaltyRate) × days ÷ (365 × 100)
 *   totalInterest   = standardInterest + penaltyInterest
 *   monthlyInterestEMI = utilized × rate ÷ (12 × 100)   (interest-only month)
 * The website shows only drawings within the limit: the screen's extra rate on the excess is
 * penal interest, which RBI no longer allows (see the credit group's verified facts).
 */
export function odInterest(i: { limit: number; utilized: number; rate: number; days: number; excessPenaltyRate?: number }) {
    const isOverLimit = i.utilized > i.limit;
    const activePrincipal = isOverLimit ? i.limit : i.utilized;
    const dailyInterest = (activePrincipal * i.rate) / (365 * 100);
    const standardInterest = dailyInterest * i.days;
    const excess = isOverLimit ? i.utilized - i.limit : 0;
    const excessPenaltyRateNum = i.excessPenaltyRate || 2;
    const penaltyInterest = excess > 0 ? (excess * (i.rate + excessPenaltyRateNum) * i.days) / (365 * 100) : 0;
    const totalInterest = standardInterest + penaltyInterest;
    const monthlyInterestEMI = (i.utilized * i.rate) / (12 * 100);
    return { dailyInterest, standardInterest, penaltyInterest, totalInterest, monthlyInterestEMI, available: Math.max(0, i.limit - i.utilized) };
}

/**
 * First-year effective cost of an OD — OverdraftCalculator.tsx:
 *   ((totalInterest × 365 ÷ days) + AMC + upfront fees) ÷ utilized × 100
 * where upfront = processing fee (% of the limit) + other one-time charges.
 */
export function odEffectiveCost(i: { limit: number; utilized: number; rate: number; days: number; processingFeePct: number; amc: number; otherUpfront?: number }): number {
    const { totalInterest } = odInterest(i);
    const processingFeeAmount = (i.limit * i.processingFeePct) / 100;
    const upfrontCosts = processingFeeAmount + (i.otherUpfront ?? 0);
    return i.utilized > 0 && i.days > 0 ? ((totalInterest * (365 / i.days)) + i.amc + upfrontCosts) / i.utilized * 100 : 0;
}

/**
 * A month on an OD whose balance changes: the screen's daily formula applied to each stretch
 * of days at one balance (balance × rate ÷ 36,500 × days), then added up.
 */
export function odStretches(stretches: Array<{ balance: number; days: number }>, limit: number, rate: number) {
    const rows = stretches.map((s) => ({ ...s, interest: odInterest({ limit, utilized: s.balance, rate, days: s.days }).totalInterest }));
    return { rows, total: rows.reduce((a, r) => a + r.interest, 0), days: rows.reduce((a, r) => a + r.days, 0) };
}

/**
 * Days from statement to due date — src/pages/expenses/CreditCardAdd.tsx (`interestFreeDays`):
 *   diff = dueDay − statementDay; diff > 0 ? diff : diff + 30.
 * (The screen labels this "Interest-free Period"; it is the shortest one — for a purchase made on
 * the statement date. RBI defines the period from the transaction date to the due date.)
 */
export function statementToDueDays(statementDay: number, dueDay: number): number {
    const diff = dueDay - statementDay;
    return diff > 0 ? diff : diff + 30;
}

/**
 * Calendar only (no money formula): for a purchase on `purchase` (YYYY-MM-DD) and a card whose
 * statement is generated on day `statementDay` (1–28) with payment due on day `dueDay`, the
 * statement that carries the purchase, its due date, and the days from purchase to due date
 * (RBI's interest-free credit period). A purchase on the statement day is on that statement.
 */
export function cardCycleDates(purchase: string, statementDay: number, dueDay: number) {
    const [y, m, d] = purchase.split('-').map(Number);
    const p = Date.UTC(y, m - 1, d);
    const stmt = d <= statementDay ? Date.UTC(y, m - 1, statementDay) : Date.UTC(y, m, statementDay);
    const sd = new Date(stmt);
    let due = Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), dueDay);
    if (due <= stmt) due = Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth() + 1, dueDay);
    const day = 86400000;
    const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
    return { statement: iso(stmt), due: iso(due), interestFreeDays: Math.round((due - p) / day), statementToDue: Math.round((due - stmt) / day), threeDaysAfterDue: iso(due + 3 * day) };
}

/**
 * Flat "₹ per ₹100 a month" interest (the byaj quoted as "₹2 sekda") —
 * src/pages/SimpleInterestCalculator.tsx, mode 'flat':
 *   monthlyInterest = principal ÷ 100 × flatRate; totalInterest = monthlyInterest × months;
 *   yearly equivalent = flatRate × 12.
 */
export function flatByaj(principal: number, flatRate: number, months: number) {
    const monthlyInterest = (principal / 100) * flatRate;
    const totalInterest = monthlyInterest * months;
    return { monthlyInterest, totalInterest, totalPayable: principal + totalInterest, equivalentAnnualPct: flatRate * 12 };
}

/**
 * Simple interest — SimpleInterestCalculator.tsx, mode 'simple': SI = P × R × T ÷ 100, T in years
 * (= months ÷ 12); monthly interest-only payment = SI ÷ months.
 */
export function simpleInterest(principal: number, annualRate: number, months: number) {
    const tenureInYears = months / 12;
    const totalInterest = (principal * annualRate * tenureInYears) / 100;
    const totalAmount = principal + totalInterest;
    return { totalInterest, totalAmount, monthlyInterestOnly: months > 0 ? totalInterest / months : 0, monthlyEMI: months > 0 ? totalAmount / months : 0 };
}
