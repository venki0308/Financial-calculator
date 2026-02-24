// EMI Calculations
export function calculateReducingEMI(principal: number, annualRate: number, months: number) {
    const r = annualRate / 12 / 100;
    if (r === 0) return { emi: principal / months, totalInterest: 0, totalPayment: principal, schedule: [] };
    const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    let balance = principal;
    const schedule: { month: number; principal: number; interest: number; balance: number }[] = [];
    for (let m = 1; m <= months; m++) {
        const intPay = balance * r;
        const prinPay = emi - intPay;
        balance -= prinPay;
        schedule.push({ month: m, principal: prinPay, interest: intPay, balance: Math.max(0, balance) });
    }
    const totalPayment = emi * months;
    return { emi, totalInterest: totalPayment - principal, totalPayment, schedule };
}

export function calculateFlatEMI(principal: number, annualRate: number, months: number) {
    const totalInterest = (principal * annualRate * (months / 12)) / 100;
    const totalPayment = principal + totalInterest;
    const emi = totalPayment / months;
    return { emi, totalInterest, totalPayment };
}

// SIP Calculation
export function calculateSIP(monthly: number, annualRate: number, years: number) {
    const r = annualRate / 12 / 100;
    const n = years * 12;
    const invested = monthly * n;
    if (r === 0) return { futureValue: invested, invested, wealthGained: 0 };
    const fv = monthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    return { futureValue: fv, invested, wealthGained: fv - invested };
}

// Compound Interest
export function calculateCompoundInterest(principal: number, annualRate: number, years: number, compoundsPerYear: number) {
    const amount = principal * Math.pow(1 + annualRate / 100 / compoundsPerYear, compoundsPerYear * years);
    return { amount, interest: amount - principal };
}

// FD Calculation
export function calculateFD(principal: number, annualRate: number, years: number, compoundsPerYear: number) {
    return calculateCompoundInterest(principal, annualRate, years, compoundsPerYear);
}

// Indian number formatting
export function formatINR(v: number): string {
    const rounded = Math.round(v);
    const str = rounded.toString();
    if (str.length <= 3) return '₹' + str;
    let result = str.slice(-3);
    let remaining = str.slice(0, -3);
    while (remaining.length > 2) {
        result = remaining.slice(-2) + ',' + result;
        remaining = remaining.slice(0, -2);
    }
    if (remaining.length > 0) result = remaining + ',' + result;
    return '₹' + result;
}
