/**
 * Loan figures for the website pages /emi, /home-loan, /car-loan, /personal-loan,
 * /two-wheeler-loan and /education-loan.
 *
 * 1. twoWheelerOnRoad copies the on-road price and down-payment formula that the app keeps
 *    inside src/pages/TwoWheelerLoanCalculator.tsx ("On-road calculations"), unchanged.
 * 2. Everything else is a search over, or plain arithmetic around, the app's exported
 *    calculateReducingEMI (src/utils/calculations.ts) — no new loan formula:
 *    loanForEmi and aprOnNet invert it; educationLoan adds the moratorium interest
 *    (simple interest, rate × years) before handing the balance to it.
 * scripts/qa-features/loans.mjs re-implements every function independently.
 */
import { calculateReducingEMI } from '../../utils/calculations';

/**
 * On-road price, down payment and loan — src/pages/TwoWheelerLoanCalculator.tsx:
 * onRoadPrice = exShowroom + RTO + insurance + handling + accessories;
 * downPayment = round(price × pct ÷ 100); loan = max(0, price − downPayment).
 * (The screen also subtracts EV subsidies; the website leaves them out, i.e. subsidy = 0.)
 */
export function twoWheelerOnRoad(i: { exShowroom: number; rto: number; insurance: number; handling: number; accessories: number; downPaymentPct: number }) {
    const onRoadPrice = i.exShowroom + i.rto + i.insurance + i.handling + i.accessories;
    const effectivePrice = onRoadPrice - 0;
    const downPayment = Math.round(effectivePrice * i.downPaymentPct / 100);
    const loanAmount = Math.max(0, effectivePrice - downPayment);
    return { onRoadPrice, downPayment, loanAmount };
}

/** EMI for `years` (app's calculateReducingEMI). */
export const emiFor = (principal: number, ratePct: number, years: number) => calculateReducingEMI(principal, ratePct, Math.round(years * 12));

/**
 * The largest loan, in steps of `step` rupees, whose EMI (app's calculateReducingEMI) does not
 * exceed `emi`. Used for "how much loan can this EMI carry".
 */
export function loanForEmi(emi: number, ratePct: number, months: number, step = 1000): number {
    if (emi <= 0 || months <= 0) return 0;
    let lo = 0;
    let hi = emi * months; // at 0% the loan can be at most EMI × months
    while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (calculateReducingEMI(mid, ratePct, months).emi <= emi) lo = mid; else hi = mid;
    }
    return Math.floor(lo / step) * step;
}

/**
 * Annual percentage rate on the money actually received: the yearly rate at which a loan of
 * `netReceived` would carry the same EMI over the same months (reducing balance, app's
 * calculateReducingEMI). This is the RBI KFS method — IRR on the net disbursed amount.
 * Two decimals.
 */
export function aprOnNet(netReceived: number, emi: number, months: number): number {
    if (netReceived <= 0 || emi <= 0 || months <= 0 || emi * months <= netReceived) return 0;
    let lo = 0;
    let hi = 200;
    for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2;
        // ceil(exact EMI) <= emi exactly when exact EMI <= emi, so lo converges on the rate whose exact EMI is emi.
        if (calculateReducingEMI(netReceived, mid, months).emi <= emi) lo = mid; else hi = mid;
    }
    return Math.round(((lo + hi) / 2) * 100) / 100;
}

export type MoratoriumMode = 'paid' | 'added';

/**
 * Education loan with a moratorium: interest runs on the full loan from disbursement; during
 * the moratorium it is simple interest (loan × rate × years). 'paid' = the student pays that
 * interest every month during the moratorium and the EMI is on the loan itself; 'added' = the
 * interest is added to the loan when repayment starts and the EMI is on the larger balance.
 * `subsidyPct` is a government interest subvention during the moratorium (e.g. 3 points), paid
 * on at most `subsidyCap` rupees of the loan (₹10 lakh under PM-USP CSIS and PM-Vidyalaxmi); it
 * lowers the interest the student bears in that period only.
 */
export function educationLoan(loan: number, ratePct: number, moratoriumYears: number, repayYears: number, mode: MoratoriumMode, subsidyPct = 0, subsidyCap = Infinity) {
    const sub = Math.min(Math.max(0, subsidyPct), ratePct);
    const yearlyInterest = loan * ratePct / 100 - Math.min(loan, subsidyCap) * sub / 100;
    const moratoriumInterest = Math.round(yearlyInterest * moratoriumYears);
    const monthlyInterest = Math.round(yearlyInterest / 12);
    const startBalance = mode === 'added' ? loan + moratoriumInterest : loan;
    const r = calculateReducingEMI(startBalance, ratePct, Math.round(repayYears * 12));
    const paidDuring = mode === 'paid' ? moratoriumInterest : 0;
    return {
        moratoriumInterest,
        monthlyInterest,
        startBalance,
        emi: r.emi,
        repayInterest: r.totalInterest,
        /** Everything the borrower pays: moratorium interest (if paid as it falls due) + all EMIs. */
        totalPaid: paidDuring + r.totalPayment,
        /** All interest over the life of the loan, moratorium included. */
        totalInterest: paidDuring + r.totalPayment - loan,
        schedule: r.schedule,
    };
}
