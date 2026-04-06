/**
 * investmentStatusEngine.ts — Live status engines for SIP, FD, RD, PPF, SSY, NSC, KVP, POMIS, POTD, SCSS
 */

// ─── Helpers ───────────────────────────────────────────
function daysBetween(a: Date, b: Date): number {
    return Math.max(0, Math.floor((b.getTime() - a.getTime()) / (86400000)));
}
function monthsBetween(a: Date, b: Date): number {
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}
function addMonths(d: Date, n: number): Date {
    const r = new Date(d);
    r.setMonth(r.getMonth() + n);
    return r;
}
function fmtISO(d: Date): string { return d.toISOString().split('T')[0]; }
function today(): Date { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

// ─── SIP STATUS ────────────────────────────────────────
export interface SipStatusInput {
    monthlySip: number;
    annualReturn: number;
    startDate: string;
    targetAmount?: number;
}

export interface SipStatus {
    monthsInvested: number;
    totalInvested: number;
    currentValue: number;
    wealthGained: number;
    returnPercent: number;
    progressToGoal: number;
    monthsToGoal: number;
    expectedGoalDate: string;
    sipRunningYears: number;
    sipRunningMonths: number;
    startDate: string;
    today: string;
}

export function calculateSipStatus(input: SipStatusInput): SipStatus {
    const t = today();
    const start = new Date(input.startDate); start.setHours(0, 0, 0, 0);
    const monthsInvested = Math.max(0, monthsBetween(start, t));
    const totalInvested = monthsInvested * input.monthlySip;
    const r = input.annualReturn / 12 / 100;
    let currentValue = 0;
    if (monthsInvested > 0 && r > 0) {
        currentValue = input.monthlySip * ((Math.pow(1 + r, monthsInvested) - 1) / r) * (1 + r);
    } else if (monthsInvested > 0) {
        currentValue = totalInvested;
    }
    const wealthGained = currentValue - totalInvested;
    const returnPercent = totalInvested > 0 ? (wealthGained / totalInvested) * 100 : 0;
    const target = input.targetAmount || 0;
    const progressToGoal = target > 0 ? Math.min(100, (currentValue / target) * 100) : 0;
    let monthsToGoal = 0;
    if (target > currentValue && r > 0 && input.monthlySip > 0) {
        const remaining = target - currentValue;
        monthsToGoal = Math.ceil(Math.log((remaining * r / input.monthlySip) + 1) / Math.log(1 + r));
    }
    const expectedGoalDate = target > 0 ? fmtISO(addMonths(t, monthsToGoal)) : '';
    return {
        monthsInvested, totalInvested, currentValue, wealthGained, returnPercent,
        progressToGoal, monthsToGoal, expectedGoalDate,
        sipRunningYears: Math.floor(monthsInvested / 12),
        sipRunningMonths: monthsInvested % 12,
        startDate: input.startDate, today: fmtISO(t),
    };
}

// ─── FD STATUS ─────────────────────────────────────────
export interface FdStatusInput {
    principal: number;
    annualRate: number;
    tenureMonths: number;
    startDate: string;
    compoundingFreq: number; // 4=quarterly, 12=monthly, 1=yearly
}

export interface FdStatus {
    daysInvested: number;
    daysRemaining: number;
    maturityDate: string;
    interestEarnedToday: number;
    valueToday: number;
    maturityValue: number;
    stillToEarn: number;
    dailyEarning: number;
    percentComplete: number;
    prematureValue: number;
    prematurePenalty: number;
    costOfBreaking: number;
    today: string;
}

export function calculateFdStatus(input: FdStatusInput): FdStatus {
    const t = today();
    const start = new Date(input.startDate); start.setHours(0, 0, 0, 0);
    const matDate = addMonths(start, input.tenureMonths);
    const totalDays = daysBetween(start, matDate);
    const daysInvested = daysBetween(start, t);
    const daysRemaining = Math.max(0, daysBetween(t, matDate));
    const freq = input.compoundingFreq || 4;
    const periodsElapsed = daysInvested / (365 / freq);
    const totalPeriods = totalDays / (365 / freq);
    const ratePerPeriod = input.annualRate / (100 * freq);
    const valueToday = input.principal * Math.pow(1 + ratePerPeriod, periodsElapsed);
    const maturityValue = input.principal * Math.pow(1 + ratePerPeriod, totalPeriods);
    const interestEarnedToday = valueToday - input.principal;
    const stillToEarn = maturityValue - valueToday;
    const dailyEarning = daysInvested > 0 ? interestEarnedToday / daysInvested : 0;
    const penaltyRate = 1;
    const effectiveRate = Math.max(0, input.annualRate - penaltyRate);
    const prematureValue = input.principal * Math.pow(1 + effectiveRate / (100 * freq), periodsElapsed);
    const prematurePenalty = valueToday - prematureValue;
    const costOfBreaking = maturityValue - prematureValue;
    return {
        daysInvested, daysRemaining, maturityDate: fmtISO(matDate),
        interestEarnedToday, valueToday, maturityValue, stillToEarn, dailyEarning,
        percentComplete: totalDays > 0 ? (daysInvested / totalDays) * 100 : 0,
        prematureValue, prematurePenalty, costOfBreaking, today: fmtISO(t),
    };
}

// ─── RD STATUS ─────────────────────────────────────────
export interface RdStatusInput {
    monthlyDeposit: number;
    annualRate: number;
    tenureMonths: number;
    startDate: string;
}

export interface RdStatus {
    monthsInvested: number;
    monthsRemaining: number;
    totalDeposited: number;
    interestEarned: number;
    currentValue: number;
    maturityValue: number;
    maturityDate: string;
    percentComplete: number;
    today: string;
}

export function calculateRdStatus(input: RdStatusInput): RdStatus {
    const t = today();
    const start = new Date(input.startDate); start.setHours(0, 0, 0, 0);
    const monthsInvested = Math.min(input.tenureMonths, Math.max(0, monthsBetween(start, t)));
    const totalDeposited = monthsInvested * input.monthlyDeposit;
    const r = input.annualRate / 400; // quarterly rate
    const totalQ = Math.ceil(input.tenureMonths / 3);
    // Current value using quarterly compounding
    let currentValue = 0;
    for (let i = 1; i <= monthsInvested; i++) {
        const qIdx = Math.floor((i - 1) / 3);
        const qRemaining = totalQ - qIdx;
        currentValue += input.monthlyDeposit * Math.pow(1 + r, Math.min(qRemaining, totalQ));
    }
    // Full maturity
    let maturityValue = 0;
    for (let i = 1; i <= input.tenureMonths; i++) {
        const qIdx = Math.floor((i - 1) / 3);
        maturityValue += input.monthlyDeposit * Math.pow(1 + r, totalQ - qIdx);
    }
    const interestEarned = currentValue - totalDeposited;
    const maturityDate = fmtISO(addMonths(start, input.tenureMonths));
    return {
        monthsInvested, monthsRemaining: input.tenureMonths - monthsInvested,
        totalDeposited, interestEarned, currentValue, maturityValue, maturityDate,
        percentComplete: (monthsInvested / input.tenureMonths) * 100, today: fmtISO(t),
    };
}

// ─── PPF STATUS ────────────────────────────────────────
export interface PpfStatusInput {
    yearlyDeposit: number;
    rate: number;
    openingDate: string;
}

export interface PpfStatus {
    yearsCompleted: number;
    currentYear: number;
    maturityDate: string;
    daysToMaturity: number;
    totalDeposited: number;
    interestEarned: number;
    balanceToday: number;
    maturityValue: number;
    loanEligible: boolean;
    loanAmount: number;
    withdrawalEligible: boolean;
    withdrawalAmount: number;
    today: string;
}

export function calculatePpfStatus(input: PpfStatusInput): PpfStatus {
    const t = today();
    const open = new Date(input.openingDate); open.setHours(0, 0, 0, 0);
    const yearsCompleted = Math.floor(monthsBetween(open, t) / 12);
    const currentYear = Math.min(15, yearsCompleted + 1);
    const matDate = new Date(open); matDate.setFullYear(matDate.getFullYear() + 15);
    const daysToMaturity = Math.max(0, daysBetween(t, matDate));
    const monthlyRate = input.rate / 100 / 12;
    // Year-by-year calculation — PPF uses monthly interest, compounded annually
    let balance = 0;
    const yearEndBalances: number[] = [0];
    for (let y = 1; y <= Math.min(yearsCompleted, 15); y++) {
        balance += input.yearlyDeposit;
        let yearInt = 0;
        for (let m = 0; m < 12; m++) { yearInt += balance * monthlyRate; }
        balance += yearInt;
        yearEndBalances.push(balance);
    }
    const totalDeposited = Math.min(yearsCompleted, 15) * input.yearlyDeposit;
    const interestEarned = balance - totalDeposited;
    // Full 15 year maturity
    let mat = 0;
    for (let y = 1; y <= 15; y++) {
        mat += input.yearlyDeposit;
        let yInt = 0;
        for (let m = 0; m < 12; m++) { yInt += mat * monthlyRate; }
        mat += yInt;
    }
    // Loan: year 3-6, 25% of year-2 balance
    const loanEligible = yearsCompleted >= 3 && yearsCompleted <= 6;
    const loanAmount = yearEndBalances.length > 2 ? Math.round(yearEndBalances[2] * 0.25) : 0;
    // Withdrawal: year 7+, 50% of year-4 balance
    const withdrawalEligible = yearsCompleted >= 7;
    const withdrawalAmount = yearEndBalances.length > 4 ? Math.round(yearEndBalances[4] * 0.5) : 0;
    return {
        yearsCompleted, currentYear, maturityDate: fmtISO(matDate), daysToMaturity,
        totalDeposited, interestEarned, balanceToday: balance, maturityValue: mat,
        loanEligible, loanAmount, withdrawalEligible, withdrawalAmount, today: fmtISO(t),
    };
}

// ─── SSY STATUS ────────────────────────────────────────
export interface SsyStatusInput {
    yearlyDeposit: number;
    rate: number;
    openingDate: string;
    girlDob: string;
}

export interface SsyStatus {
    girlAge: number;
    accountAge: number;
    depositPhaseActive: boolean;
    depositYearsRemaining: number;
    maturityDate: string;
    daysToMaturity: number;
    totalDeposited: number;
    interestEarned: number;
    balanceToday: number;
    maturityValue: number;
    withdrawalEligible: boolean;
    withdrawalAmount: number;
    today: string;
}

export function calculateSsyStatus(input: SsyStatusInput): SsyStatus {
    const t = today();
    const open = new Date(input.openingDate); open.setHours(0, 0, 0, 0);
    const dob = new Date(input.girlDob); dob.setHours(0, 0, 0, 0);
    const girlAge = Math.floor(monthsBetween(dob, t) / 12);
    const accountAge = Math.floor(monthsBetween(open, t) / 12);
    const depositPhaseActive = accountAge < 15;
    const depositYearsRemaining = Math.max(0, 15 - accountAge);
    const matDate = new Date(open); matDate.setFullYear(matDate.getFullYear() + 21);
    const daysToMaturity = Math.max(0, daysBetween(t, matDate));
    const monthlyRate = input.rate / 100 / 12;
    let balance = 0;
    const investYears = 15;
    const maturityYears = 21;
    const yearsToCalc = Math.min(accountAge, maturityYears);
    // SSY: monthly interest calculation, compounded annually
    for (let y = 1; y <= yearsToCalc; y++) {
        if (y <= investYears) balance += input.yearlyDeposit;
        let yearInt = 0;
        for (let m = 0; m < 12; m++) { yearInt += balance * monthlyRate; }
        balance += yearInt;
    }
    const totalDeposited = Math.min(accountAge, investYears) * input.yearlyDeposit;
    const interestEarned = balance - totalDeposited;
    let mat = 0;
    for (let y = 1; y <= maturityYears; y++) {
        if (y <= investYears) mat += input.yearlyDeposit;
        let yInt = 0;
        for (let m = 0; m < 12; m++) { yInt += mat * monthlyRate; }
        mat += yInt;
    }
    const withdrawalEligible = girlAge >= 18;
    const withdrawalAmount = withdrawalEligible ? Math.round(balance * 0.5) : 0;
    return {
        girlAge, accountAge, depositPhaseActive, depositYearsRemaining,
        maturityDate: fmtISO(matDate), daysToMaturity,
        totalDeposited, interestEarned, balanceToday: balance, maturityValue: mat,
        withdrawalEligible, withdrawalAmount, today: fmtISO(t),
    };
}

// ─── NSC STATUS ────────────────────────────────────────
export interface NscStatusInput {
    principal: number;
    rate: number;
    purchaseDate: string;
}

export interface NscStatus {
    yearsCompleted: number;
    monthsInCurrentYear: number;
    maturityDate: string;
    daysToMaturity: number;
    valueToday: number;
    interestEarned: number;
    maturityValue: number;
    yearValues: number[];
    today: string;
}

export function calculateNscStatus(input: NscStatusInput): NscStatus {
    const t = today();
    const purch = new Date(input.purchaseDate); purch.setHours(0, 0, 0, 0);
    const totalMonths = monthsBetween(purch, t);
    const yearsCompleted = Math.min(5, Math.floor(totalMonths / 12));
    const monthsInCurrentYear = totalMonths - yearsCompleted * 12;
    const matDate = new Date(purch); matDate.setFullYear(matDate.getFullYear() + 5);
    const daysToMaturity = Math.max(0, daysBetween(t, matDate));
    const r = input.rate / 100;
    const yearValues = [input.principal];
    for (let y = 1; y <= 5; y++) {
        yearValues.push(input.principal * Math.pow(1 + r, y));
    }
    const partialYear = monthsInCurrentYear / 12;
    const valueToday = input.principal * Math.pow(1 + r, yearsCompleted + partialYear);
    return {
        yearsCompleted, monthsInCurrentYear, maturityDate: fmtISO(matDate),
        daysToMaturity, valueToday, interestEarned: valueToday - input.principal,
        maturityValue: yearValues[5], yearValues, today: fmtISO(t),
    };
}

// ─── KVP STATUS ────────────────────────────────────────
export interface KvpStatusInput {
    principal: number;
    rate: number;
    purchaseDate: string;
}

export interface KvpStatus {
    monthsElapsed: number;
    doublingMonths: number;
    doublingDate: string;
    daysToDoubling: number;
    valueToday: number;
    gainSoFar: number;
    progressToDoubling: number;
    prematureEligible: boolean;
    prematureEligibleDate: string;
    today: string;
}

export function calculateKvpStatus(input: KvpStatusInput): KvpStatus {
    const t = today();
    const purch = new Date(input.purchaseDate); purch.setHours(0, 0, 0, 0);
    const monthsElapsed = monthsBetween(purch, t);
    const r = input.rate / 100;
    const doublingMonths = Math.ceil(Math.log(2) / Math.log(1 + r) * 12);
    const doublingDate = fmtISO(addMonths(purch, doublingMonths));
    const daysToDoubling = Math.max(0, daysBetween(t, addMonths(purch, doublingMonths)));
    const yearsElapsed = monthsElapsed / 12;
    const valueToday = input.principal * Math.pow(1 + r, yearsElapsed);
    const prematureEligibleDate = fmtISO(addMonths(purch, 30)); // 2.5 years
    return {
        monthsElapsed, doublingMonths, doublingDate, daysToDoubling,
        valueToday, gainSoFar: valueToday - input.principal,
        progressToDoubling: Math.min(100, (monthsElapsed / doublingMonths) * 100),
        prematureEligible: monthsElapsed >= 30,
        prematureEligibleDate, today: fmtISO(t),
    };
}

// ─── POMIS STATUS ──────────────────────────────────────
export interface PomisStatusInput {
    principal: number;
    rate: number;
    startDate: string;
}

export interface PomisStatus {
    monthsCompleted: number;
    monthsRemaining: number;
    maturityDate: string;
    monthlyIncome: number;
    totalIncomeReceived: number;
    totalIncomeOnMaturity: number;
    today: string;
}

export function calculatePomisStatus(input: PomisStatusInput): PomisStatus {
    const t = today();
    const start = new Date(input.startDate); start.setHours(0, 0, 0, 0);
    const monthsCompleted = Math.min(60, Math.max(0, monthsBetween(start, t)));
    const monthlyIncome = Math.round(input.principal * input.rate / 100 / 12);
    return {
        monthsCompleted, monthsRemaining: 60 - monthsCompleted,
        maturityDate: fmtISO(addMonths(start, 60)),
        monthlyIncome, totalIncomeReceived: monthlyIncome * monthsCompleted,
        totalIncomeOnMaturity: monthlyIncome * 60, today: fmtISO(t),
    };
}

// ─── SCSS STATUS ───────────────────────────────────────
export interface ScssStatusInput {
    principal: number;
    rate: number;
    startDate: string;
    tenure: number; // 5 or 8
}

export interface ScssStatus {
    quartersCompleted: number;
    quartersRemaining: number;
    maturityDate: string;
    quarterlyIncome: number;
    totalIncomeReceived: number;
    totalIncomeOnMaturity: number;
    today: string;
}

export function calculateScssStatus(input: ScssStatusInput): ScssStatus {
    const t = today();
    const start = new Date(input.startDate); start.setHours(0, 0, 0, 0);
    const totalMonths = input.tenure * 12;
    const monthsCompleted = Math.min(totalMonths, Math.max(0, monthsBetween(start, t)));
    const quartersCompleted = Math.floor(monthsCompleted / 3);
    const totalQuarters = input.tenure * 4;
    const quarterlyIncome = Math.round(input.principal * input.rate / 100 / 4);
    return {
        quartersCompleted, quartersRemaining: totalQuarters - quartersCompleted,
        maturityDate: fmtISO(addMonths(start, totalMonths)),
        quarterlyIncome, totalIncomeReceived: quarterlyIncome * quartersCompleted,
        totalIncomeOnMaturity: quarterlyIncome * totalQuarters, today: fmtISO(t),
    };
}
