/**
 * Formulas the app keeps inside a screen (not exported from src/utils), copied here unchanged
 * so the website shows exactly what the app shows. Each function names the screen it copies.
 * The app is not modified. scripts/qa-feature-pages.mjs re-implements every function below
 * independently and fails the check if any result differs.
 *
 * Everything else on the feature pages calls the app's exported functions directly
 * (calculateSIP, calculateReducingEMI, calculateAdvancedMortgage, compareSalaryTax,
 * getTrueCost, getMinimumDue, getPayoffMonths, getTotalInterest …).
 */

/** Step-up SIP — src/pages/SIPCalculator.tsx, "Step-Up SIP calculation" (monthly SIP, raised once a year). */
export function stepUpSip(initialMonthly: number, stepUpPct: number, annualRatePct: number, years: number) {
    const r = annualRatePct / 12 / 100;
    let balance = 0;
    let totalInvested = 0;
    let monthlyAmt = initialMonthly;
    const yearly: Array<{ year: number; monthly: number; invested: number; value: number }> = [];
    for (let y = 1; y <= years; y++) {
        const thisYearMonthly = monthlyAmt;
        for (let m = 1; m <= 12; m++) {
            balance = (balance + monthlyAmt) * (1 + r);
            totalInvested += monthlyAmt;
        }
        yearly.push({ year: y, monthly: Math.round(thisYearMonthly), invested: Math.round(totalInvested), value: Math.round(balance) });
        monthlyAmt *= (1 + stepUpPct / 100);
    }
    return { futureValue: Math.round(balance), invested: Math.round(totalInvested), gain: Math.round(balance - totalInvested), yearly };
}

/** Goal SIP — src/pages/SIPCalculator.tsx, "Goal SIP calculation" (monthly SIP needed for a target). */
export function goalSip(target: number, years: number, annualRatePct: number) {
    const r = annualRatePct / 12 / 100;
    const n = years * 12;
    const denominator = ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    const monthlyNeeded = target / denominator;
    const totalInvested = monthlyNeeded * n;
    return { monthlyNeeded: Math.round(monthlyNeeded), invested: Math.round(totalInvested), gain: Math.round(target - totalInvested) };
}

/**
 * Sukanya Samriddhi projection — src/pages/SSYCalculator.tsx (yearly deposit on 1 April,
 * interest worked out monthly and credited once a year; deposits for 15 years, maturity at 21).
 */
export function ssyProjection(yearlyDeposit: number, ratePct: number, girlAge: number) {
    const investYears = 15;
    const maturityYears = 21;
    const monthlyRate = ratePct / 100 / 12;
    const timeline: Array<{ year: number; age: number; deposit: number; interest: number; balance: number }> = [];
    let balance = 0;
    for (let i = 1; i <= maturityYears; i++) {
        const deposit = i <= investYears ? yearlyDeposit : 0;
        let yearInterest = 0;
        for (let m = 1; m <= 12; m++) {
            if (i <= investYears && m === 1) balance += deposit;
            yearInterest += balance * monthlyRate;
        }
        balance += yearInterest;
        timeline.push({ year: i, age: girlAge + i, deposit, interest: Math.round(yearInterest), balance: Math.round(balance) });
    }
    const invested = yearlyDeposit * investYears;
    const at18 = girlAge < 18 ? timeline.find((row) => row.age >= 18) ?? null : null;
    return { invested, interest: Math.round(balance - invested), maturity: Math.round(balance), maturityAge: girlAge + maturityYears, timeline, at18 };
}

/**
 * Post Office Time Deposit — NOT the app's formula. National Savings Time Deposit Scheme, 2019,
 * para 7(2): "Interest shall be compounded on quarterly basis and payable to the account holder
 * at the end of each year"; para 7(7): "No additional interest shall be payable on the amount of
 * interest that has become due for payment but not withdrawn". So each year pays the same interest
 * (the deposit compounded for four quarters, minus the deposit) and the deposit comes back at
 * maturity. src/pages/POTDCalculator.tsx compounds across years and overstates multi-year TDs
 * (reported to the owner; APP_IDEAS.md).
 */
export function poTd(amount: number, ratePct: number, years: number) {
    const r = ratePct / 400;
    const yearly = amount * (Math.pow(1 + r, 4) - 1);
    const effectiveYield = (Math.pow(1 + r, 4) - 1) * 100;
    const table: Array<{ year: number; interest: number; totalInterest: number }> = [];
    for (let y = 1; y <= years; y++) table.push({ year: y, interest: Math.round(yearly), totalInterest: Math.round(yearly * y) });
    return { yearlyInterest: Math.round(yearly), interest: Math.round(yearly * years), total: Math.round(amount + yearly * years), effectiveYield, table };
}

/** Purity factors — src/pages/GoldLoanCalculator.tsx, PURITY_FACTOR. */
export const GOLD_PURITY = { '24K': 1, '22K': 0.916, '20K': 0.833, '18K': 0.75 } as const;
export type GoldPurity = keyof typeof GOLD_PURITY;

/**
 * Gold loan eligibility — src/pages/GoldLoanCalculator.tsx: gold value = weight × 24K rate ×
 * purity factor; loan = value × LTV, where the LTV tier is 85% while the loan stays within
 * ₹2.5 lakh, 80% within ₹5 lakh, else 75% (computeTieredLTV).
 */
export function goldLoanEligibility(grams: number, rate24KPerGram: number, purity: GoldPurity) {
    const value = Math.round(grams * rate24KPerGram * GOLD_PURITY[purity]);
    let ltv = 85;
    let maxLoan = 0;
    if (value > 0) {
        const at85 = value * 0.85;
        const at80 = value * 0.80;
        if (at85 <= 250000) { ltv = 85; maxLoan = Math.round(at85); }
        else if (at80 <= 500000) { ltv = 80; maxLoan = Math.round(at80); }
        else { ltv = 75; maxLoan = Math.round(value * 0.75); }
    }
    return { value, ltv, maxLoan, perGram: grams > 0 ? Math.round(maxLoan / grams) : 0 };
}
