/**
 * Planning, tracker and insurance formulas the app keeps inside its screens (not exported from
 * src/utils), copied unchanged so the website pages /expense-tracker, /business-tracker,
 * /term-insurance-cover, /property-appreciation, /break-even and /financial-planning show exactly
 * what the app shows. Each function names the screen it copies. scripts/qa-features/planning.mjs
 * re-implements every function independently and fails if a result differs.
 *
 * Business Tracker totals come from the app's exported calcBizTotals (src/utils/businessStorage.ts).
 */

// ─── Break-even ─────────────────────────────────────────────────────────────

/** Break-even — src/pages/BreakEvenCalculator.tsx, `result` useMemo (units rounded up; projection 0 → 2× break-even). */
export function breakEven(fixed: number, price: number, variable: number) {
    const contribution = price - variable;
    const neverBreaksEven = contribution <= 0;
    const breakEvenUnits = contribution > 0 ? Math.ceil(fixed / contribution) : 0;
    const breakEvenSales = breakEvenUnits * price;
    const marginPct = contribution > 0 ? ((contribution / price) * 100).toFixed(1) : '0';
    const projection: Array<{ units: number; revenue: number; totalCost: number; profit: number }> = [];
    const maxUnits = Math.max(breakEvenUnits * 2, 20);
    const step = Math.max(Math.ceil(maxUnits / 10), 1);
    for (let u = 0; u <= maxUnits; u += step) {
        const revenue = u * price;
        const totalCost = fixed + u * variable;
        const profit = revenue - totalCost;
        projection.push({ units: u, revenue, totalCost, profit });
    }
    return { breakEvenUnits, breakEvenSales, contribution, marginPct, projection, neverBreaksEven };
}

/** Profit at a sales volume — the projection row formula of the same screen (revenue − fixed − units × variable). */
export function profitAt(units: number, fixed: number, price: number, variable: number): number {
    return units * price - (fixed + units * variable);
}

// ─── Property ───────────────────────────────────────────────────────────────

/** Years the app's appreciation forecast shows — src/pages/PropertyCalculator.tsx, calculateAppreciation. */
export const APPRECIATION_YEARS = [5, 10, 15, 20] as const;

/** Value after `years` — src/pages/PropertyCalculator.tsx, calculateAppreciation: cv × (1 + r/100)^y. */
export function appreciatedValue(currentValue: number, ratePct: number, years: number): number {
    return currentValue * Math.pow(1 + ratePct / 100, years);
}

/** The app's forecast list — src/pages/PropertyCalculator.tsx, calculateAppreciation. */
export function appreciationForecast(currentValue: number, ratePct: number) {
    return APPRECIATION_YEARS.map((y) => {
        const value = appreciatedValue(currentValue, ratePct, y);
        return { years: y, value, gain: value - currentValue };
    });
}

/** Value in today's money — src/pages/FDCalculator.tsx, inflationAdj: amount ÷ (1 + inflation/100)^years. */
export function todaysMoney(amount: number, inflationPct: number, years: number): number {
    return amount / Math.pow(1 + inflationPct / 100, years);
}

// ─── Business Tracker ───────────────────────────────────────────────────────

/** Profit margin — src/pages/business/BusinessDetail.tsx: net ÷ income × 100 (null when there is no income). */
export function bizMargin(income: number, net: number): number | null {
    return income > 0 ? (net / income) * 100 : null;
}

// ─── Life cover (Insurance Calculator, Life tab) ────────────────────────────

/**
 * Recommended life cover — src/pages/InsuranceCalculator.tsx, `coverRec` and `lifeCoverDetailed`:
 * minimum = income × 15, recommended = income × 20, with loans = income × 15 + loans; the needs
 * breakdown adds income × 15, loans, ₹25 lakh per child (₹20 lakh per dependent when no children
 * are entered) and one year's income as an emergency fund.
 */
export function lifeCover(annualIncome: number, outstandingLoans: number, dependents: number, children = 0) {
    const minimum = annualIncome * 15;
    const recommended = annualIncome * 20;
    const withLoans = annualIncome * 15 + outstandingLoans;
    const incomeReplace = annualIncome * 15;
    const loanCover = outstandingLoans;
    const childEducation = children > 0 ? children * 2500000 : dependents * 2000000;
    const emergencyFund = annualIncome;
    const total = incomeReplace + loanCover + childEducation + emergencyFund;
    return { minimum, recommended, withLoans, incomeReplace, loanCover, childEducation, emergencyFund, total };
}

// ─── 50/30/20 ───────────────────────────────────────────────────────────────

/** 50/30/20 split — src/utils/expenseReportPDF.ts, generateMonthlyPDF "50/30/20 RULE ANALYSIS": income × 0.5 / 0.3 / 0.2. */
export function split503020(income: number) {
    return { needs: income * 0.5, wants: income * 0.3, savings: income * 0.2 };
}

/** Category groups the monthly report uses (same file); unmapped expense categories count as needs. */
export const NEEDS_CATEGORIES = ['rent_housing', 'emi_loan', 'utilities', 'insurance', 'groceries', 'health'] as const;
export const WANTS_CATEGORIES = ['food_dining', 'shopping', 'entertainment', 'travel', 'personal_care', 'subscription'] as const;

// ─── Smart Planner (/financial-advisor) ─────────────────────────────────────

/** Tax estimate the Smart Planner uses — src/pages/AIFinancialAssistant.tsx, estimateAnnualTax (new regime, no surcharge). */
export function plannerAnnualTax(gross: number): number {
    const taxable = Math.max(0, gross - 75000);
    const slabs = [
        { upto: 400000, rate: 0 },
        { upto: 800000, rate: 0.05 },
        { upto: 1200000, rate: 0.10 },
        { upto: 1600000, rate: 0.15 },
        { upto: 2000000, rate: 0.20 },
        { upto: 2400000, rate: 0.25 },
        { upto: Infinity, rate: 0.30 },
    ];
    let tax = 0; let prev = 0;
    for (const slab of slabs) {
        if (taxable <= prev) break;
        tax += (Math.min(taxable, slab.upto) - prev) * slab.rate;
        prev = slab.upto;
    }
    tax = taxable <= 1200000 ? 0 : Math.min(tax, taxable - 1200000);
    return Math.round(tax * 1.04);
}

/** SIP needed for a corpus — src/pages/AIFinancialAssistant.tsx, sipForCorpus (monthly, start-of-month, default 12%). */
export function plannerSipForCorpus(corpus: number, years: number, rate = 12): number {
    const r = rate / 12 / 100;
    const n = years * 12;
    const factor = (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    return corpus / factor;
}

/**
 * The Smart Planner's numbers — src/pages/AIFinancialAssistant.tsx, `plan` useMemo: post-tax income,
 * savings and EMI ratios, emergency-fund months, the 100-point score (four parts), 50/30/20 on
 * post-tax income, the 40% EMI ceiling, the 6-month emergency target, and the retirement and child
 * education goals. Inputs are monthly except `savings` (money already saved).
 */
export function smartPlan(salary: number, age: number, expenses: number, savings: number, emi: number) {
    const annualGross = salary * 12;
    const annualTax = plannerAnnualTax(annualGross);
    const postTaxMonthly = Math.round((annualGross - annualTax) / 12);
    const monthlySavings = salary - expenses - emi;
    const savingsRatio = monthlySavings / salary * 100;
    const emiRatio = postTaxMonthly > 0 ? (emi / postTaxMonthly) * 100 : 0;
    const maxEmiAllowed = Math.round(postTaxMonthly * 0.40);
    const maxAdditionalEmi = Math.max(0, maxEmiAllowed - emi);
    const emergencyMonths = expenses > 0 ? savings / expenses : 0;
    const needs50 = Math.round(postTaxMonthly * 0.50);
    const wants30 = Math.round(postTaxMonthly * 0.30);
    const savings20 = Math.round(postTaxMonthly * 0.20);

    const savingsPts = savingsRatio >= 30 ? 30 : savingsRatio >= 20 ? 22 : savingsRatio >= 10 ? 12 : 5;
    const emiPts = emiRatio <= 20 ? 25 : emiRatio <= 30 ? 18 : emiRatio <= 40 ? 10 : 3;
    const emergencyPts = emergencyMonths >= 6 ? 25 : emergencyMonths >= 3 ? 15 : 5;
    const idealInvestPct = Math.min(100 - age, 80);
    const investPts = Math.min(20, Math.round(savingsRatio / idealInvestPct * 20));
    const score = Math.min(100, savingsPts + emiPts + emergencyPts + investPts);

    const emergencyTarget = expenses * 6;

    // Retirement goal: monthly need = expenses × 1.5, corpus = 25 years of it, SIP at 12% to age 60.
    const retireAge = Math.max(60, age + 1);
    const yearsToRetire = Math.max(1, retireAge - age);
    const retireMonthly = expenses * 1.5;
    const retireCorpus = retireMonthly * 12 * 25;
    const retireSip = Math.round(plannerSipForCorpus(retireCorpus, yearsToRetire));

    // Child education goal: ₹25 lakh in max(5, 18 − (age > 30 ? age − 28 : 0)) years, SIP at 12%.
    const yearsToEducation = Math.max(5, 18 - (age > 30 ? age - 28 : 0));
    const educationCost = 2500000;
    const educationSip = Math.round(plannerSipForCorpus(educationCost, yearsToEducation));

    return {
        annualTax, postTaxMonthly, monthlySavings, savingsRatio, emiRatio, maxEmiAllowed, maxAdditionalEmi,
        emergencyMonths, emergencyTarget, needs50, wants30, savings20,
        savingsPts, emiPts, emergencyPts, investPts, idealInvestPct, score,
        retireAge, yearsToRetire, retireMonthly, retireCorpus, retireSip,
        yearsToEducation, educationCost, educationSip,
    };
}
