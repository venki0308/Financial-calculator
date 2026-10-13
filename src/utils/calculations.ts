// ═══════════════════════════════════════════════════════════════════════════
// FinCalix — Banking-Grade Calculation Engine
// ═══════════════════════════════════════════════════════════════════════════

// ─── Loan Type Defaults ────────────────────────────────────────────────────
export interface LoanTypeConfig {
    label: string;
    defaultRate: number;
    maxTenureYears: number;
    minAmount: number;
    maxAmount: number;
    icon: string;
}

export const LOAN_TYPE_CONFIGS: Record<string, LoanTypeConfig & { labelKey: string }> = {
    'Home Loan': { label: 'Home Loan', labelKey: 'emi.loanTypeHome', defaultRate: 8.75, maxTenureYears: 30, minAmount: 100000, maxAmount: 100000000, icon: '🏠' },
    'Car Loan': { label: 'Car Loan', labelKey: 'emi.loanTypeCar', defaultRate: 9.25, maxTenureYears: 7, minAmount: 50000, maxAmount: 50000000, icon: '🚗' },
    'Personal Loan': { label: 'Personal Loan', labelKey: 'emi.loanTypePersonal', defaultRate: 13, maxTenureYears: 7, minAmount: 10000, maxAmount: 5000000, icon: '💳' },
    'Education Loan': { label: 'Education Loan', labelKey: 'emi.loanTypeEducation', defaultRate: 10.5, maxTenureYears: 15, minAmount: 50000, maxAmount: 50000000, icon: '🎓' },
};

// ─── Amortization Schedule Row ─────────────────────────────────────────────
export interface AmortizationRow {
    month: number;
    openingBalance: number;
    emi: number;
    principal: number;
    interest: number;
    closingBalance: number;
    cumulativePrincipal: number;
    cumulativeInterest: number;
}

// ─── EMI Calculations ──────────────────────────────────────────────────────

/**
 * Reducing Balance EMI with full amortization schedule.
 * EMI is rounded UP per Indian banking standard.
 */
export function calculateReducingEMI(principal: number, annualRate: number, months: number) {
    // Boundary validation — prevent NaN/Infinity from invalid inputs
    if (!Number.isFinite(principal) || !Number.isFinite(annualRate) || !Number.isFinite(months)
        || principal <= 0 || months <= 0 || annualRate < 0) {
        return { emi: 0, totalInterest: 0, totalPayment: 0, schedule: [] as AmortizationRow[] };
    }

    const r = annualRate / 12 / 100;
    if (r === 0) {
        const emi = Math.round(principal / months);
        return { emi, totalInterest: 0, totalPayment: principal, schedule: generateAmortization(principal, emi, r, months) };
    }
    const emi = Math.ceil((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
    const schedule = generateAmortization(principal, emi, r, months);
    const totalPayment = schedule.reduce((sum, row) => sum + row.emi, 0);
    const totalInterest = totalPayment - principal;
    return { emi, totalInterest, totalPayment, schedule };
}

/**
 * Flat Rate EMI calculation.
 */
export function calculateFlatEMI(principal: number, annualRate: number, months: number) {
    // Boundary validation
    if (!Number.isFinite(principal) || !Number.isFinite(annualRate) || !Number.isFinite(months)
        || principal <= 0 || months <= 0 || annualRate < 0) {
        return { emi: 0, totalInterest: 0, totalPayment: 0 };
    }

    const years = months / 12;
    const totalInterest = (principal * annualRate * years) / 100;
    const totalPayment = principal + totalInterest;
    const emi = Math.round(totalPayment / months);
    return { emi, totalInterest, totalPayment };
}

/**
 * Effective reducing-balance (APR-equivalent) rate for a flat-rate loan.
 * Solves for the monthly rate r at which the reducing-balance EMI equals the
 * flat-rate EMI over the same tenure (bisection; exact to 0.01%).
 * The old ×1.85 rule of thumb was only right near 3–5 year tenures.
 */
export function calculateEffectiveRate(flatRate: number, months: number = 36): number {
    if (flatRate <= 0 || months <= 0) return 0;
    const n = Math.round(months);
    const flatEmiPerRupee = (1 + (flatRate / 100) * (n / 12)) / n;
    const reducingEmiPerRupee = (r: number) => (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    let lo = 1e-9, hi = 1; // monthly rate bounds (0% .. 1200% p.a.)
    for (let i = 0; i < 100; i++) {
        const mid = (lo + hi) / 2;
        if (reducingEmiPerRupee(mid) > flatEmiPerRupee) hi = mid; else lo = mid;
    }
    return Math.round(((lo + hi) / 2) * 12 * 100 * 100) / 100;
}

/**
 * Generate month-by-month amortization schedule.
 */
function generateAmortization(principal: number, emi: number, monthlyRate: number, months: number): AmortizationRow[] {
    const schedule: AmortizationRow[] = [];
    let balance = principal;
    let cumPrincipal = 0;
    let cumInterest = 0;

    for (let m = 1; m <= months; m++) {
        const openingBalance = balance;
        const interestPart = balance * monthlyRate;
        // Last month adjustment: pay remaining balance
        const isLast = m === months;
        const principalPart = isLast ? balance : Math.min(emi - interestPart, balance);
        const actualEmi = isLast ? principalPart + interestPart : emi;
        balance = isLast ? 0 : balance - principalPart;

        cumPrincipal += principalPart;
        cumInterest += interestPart;

        schedule.push({
            month: m,
            openingBalance: Math.round(openingBalance * 100) / 100,
            emi: Math.round(actualEmi),
            principal: Math.round(principalPart * 100) / 100,
            interest: Math.round(interestPart * 100) / 100,
            closingBalance: Math.max(0, Math.round(balance * 100) / 100),
            cumulativePrincipal: Math.round(cumPrincipal * 100) / 100,
            cumulativeInterest: Math.round(cumInterest * 100) / 100,
        });
    }
    return schedule;
}

// ─── Foreclosure Calculator ────────────────────────────────────────────────

export interface ForeclosureResult {
    monthsPaid: number;
    outstandingPrincipal: number;
    totalInterestPaid: number;
    interestSaved: number;
    foreclosureCharge: number;
    totalSettlement: number;
    netBenefit: number;
}

/**
 * Calculate foreclosure details from amortization schedule.
 * Returns null when monthsPaid is out of range for the schedule, so callers
 * hide the card instead of rendering a fabricated all-zero "+₹0 beneficial"
 * result (mirrors AdvancedMortgageCalculator's fcResult pattern).
 */
export function calculateForeclosure(
    schedule: AmortizationRow[],
    monthsPaid: number,
    foreclosureChargePercent: number
): ForeclosureResult | null {
    if (!schedule.length || monthsPaid < 1 || monthsPaid >= schedule.length) {
        return null;
    }

    const paidRow = schedule[monthsPaid - 1];
    const outstandingPrincipal = paidRow.closingBalance;
    const totalInterestPaid = paidRow.cumulativeInterest;

    // Interest that would have been paid from month N+1 to end
    const totalInterestFull = schedule[schedule.length - 1].cumulativeInterest;
    const interestSaved = totalInterestFull - totalInterestPaid;

    const foreclosureCharge = (outstandingPrincipal * foreclosureChargePercent) / 100;
    const totalSettlement = outstandingPrincipal + foreclosureCharge;
    const netBenefit = interestSaved - foreclosureCharge;

    return {
        monthsPaid,
        outstandingPrincipal: Math.round(outstandingPrincipal),
        totalInterestPaid: Math.round(totalInterestPaid),
        interestSaved: Math.round(interestSaved),
        foreclosureCharge: Math.round(foreclosureCharge),
        totalSettlement: Math.round(totalSettlement),
        netBenefit: Math.round(netBenefit),
    };
}

// ─── Prepayment Savings (10% extra EMI) ────────────────────────────────────

export interface PrepaymentInsight {
    extraMonthlyAmount: number;
    interestSaved: number;
    monthsSaved: number;
    newTenureMonths: number;
}

export function calculatePrepaymentSavings(principal: number, annualRate: number, months: number, emi: number): PrepaymentInsight {
    const r = annualRate / 12 / 100;
    const extraAmount = Math.round(emi * 0.1);
    const newEmi = emi + extraAmount;

    // Simulate with higher EMI
    let balance = principal;
    let month = 0;
    let totalPaidNew = 0;
    while (balance > 0 && month < months * 2) {
        month++;
        const intPart = balance * r;
        const prinPart = Math.min(newEmi - intPart, balance);
        balance -= prinPart;
        totalPaidNew += Math.min(newEmi, prinPart + intPart);
        if (balance <= 0.5) break;
    }

    const totalOriginal = emi * months;
    const interestSaved = Math.max(0, totalOriginal - totalPaidNew);
    const monthsSaved = Math.max(0, months - month);

    return { extraMonthlyAmount: extraAmount, interestSaved: Math.round(interestSaved), monthsSaved, newTenureMonths: month };
}

// ─── SIP Calculation ───────────────────────────────────────────────────────

export function calculateSIP(monthly: number, annualRate: number, years: number) {
    const r = annualRate / 12 / 100;
    const n = years * 12;
    const invested = monthly * n;
    if (r === 0) return { futureValue: invested, invested, wealthGained: 0 };
    const fv = monthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    return { futureValue: fv, invested, wealthGained: fv - invested };
}

// ─── Compound Interest ─────────────────────────────────────────────────────

export function calculateCompoundInterest(principal: number, annualRate: number, years: number, compoundsPerYear: number) {
    const amount = principal * Math.pow(1 + annualRate / 100 / compoundsPerYear, compoundsPerYear * years);
    return { amount, interest: amount - principal };
}

// ─── FD Calculation ────────────────────────────────────────────────────────

export function calculateFD(principal: number, annualRate: number, years: number, compoundsPerYear: number) {
    return calculateCompoundInterest(principal, annualRate, years, compoundsPerYear);
}

// ─── Indian Number Formatting ──────────────────────────────────────────────

/**
 * Format number to Indian currency: ₹1,23,45,678
 */
export function formatINR(v: number): string {
    const sym = '₹';
    const rounded = Math.round(v);
    const isNeg = rounded < 0;
    const str = Math.abs(rounded).toString();
    if (str.length <= 3) return (isNeg ? `-${sym}` : sym) + str;
    let result = str.slice(-3);
    let remaining = str.slice(0, -3);
    while (remaining.length > 2) {
        result = remaining.slice(-2) + ',' + result;
        remaining = remaining.slice(0, -2);
    }
    if (remaining.length > 0) result = remaining + ',' + result;
    return (isNeg ? `-${sym}` : sym) + result;
}

/**
 * Format number to short form: ₹45L, ₹1.2Cr, ₹5K
 */
export function formatINRShort(v: number): string {
    const sym = '₹';
    const abs = Math.abs(Math.round(v));
    // Promote to the next unit when 1-decimal rounding would hit 100
    // (99,99,999 must render ₹1Cr, not ₹100.0L; 99,950 → ₹1L, not ₹100.0K).
    if (abs >= 10000000 || Math.round(abs / 100000) >= 100) {
        const cr = abs / 10000000;
        return `${sym}${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)}Cr`;
    }
    if (abs >= 100000 || Math.round(abs / 1000) >= 100) {
        const lakh = abs / 100000;
        return `${sym}${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)}L`;
    }
    if (abs >= 1000) {
        const k = abs / 1000;
        return `${sym}${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
    }
    return formatINR(v);
}

/**
 * Convert number to Indian word form.
 * E.g., 4532000 → "Forty Five Lakhs Thirty Two Thousand"
 */
export function formatINRWords(v: number): string {
    const rounded = Math.round(Math.abs(v));
    if (rounded === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function twoDigit(n: number): string {
        if (n < 20) return ones[n];
        return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    }
    function threeDigit(n: number): string {
        if (n >= 100) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigit(n % 100) : '');
        return twoDigit(n);
    }

    const parts: string[] = [];
    let num = rounded;

    // Crores
    if (num >= 10000000) {
        const crores = Math.floor(num / 10000000);
        parts.push(threeDigit(crores) + ' Crore' + (crores > 1 ? 's' : ''));
        num %= 10000000;
    }
    // Lakhs
    if (num >= 100000) {
        const lakhs = Math.floor(num / 100000);
        parts.push(twoDigit(lakhs) + ' Lakh' + (lakhs > 1 ? 's' : ''));
        num %= 100000;
    }
    // Thousands
    if (num >= 1000) {
        const thousands = Math.floor(num / 1000);
        parts.push(twoDigit(thousands) + ' Thousand');
        num %= 1000;
    }
    // Hundreds
    if (num > 0) {
        parts.push(threeDigit(num));
    }

    return parts.join(' ');
}

// ─── Auto-Naming for Saved Calculations ────────────────────────────────────

export function generateLoanName(loanType: string, principal: number, tenureYears: number): string {
    return `${loanType} - ${formatINRShort(principal)} - ${tenureYears}yr`;
}

// ─── Advanced Mortgage & Prepayment Calculation ──────────────────────────────

export interface PrepaymentConfig {
    lumpSums: { month: number; amount: number }[];
    monthlyExtraEMI: number;
    mode: 'reduce_tenure' | 'reduce_emi';
}

export interface AdvancedMortgageResult {
    emi: number;
    originalEmi: number;
    totalInterest: number;
    totalPayment: number;
    interestSaved: number;
    timeSavedMonths: number;
    schedule: AmortizationRow[];
    taxBenefits: TaxBenefitResult;
}

export interface TaxBenefitResult {
    total80C: number;
    total24: number;
    schedule: { year: number; principal: number; interest: number; deduction80C: number; deduction24: number }[];
}

export function calculateAdvancedMortgage(principal: number, annualRate: number, months: number, config: PrepaymentConfig): AdvancedMortgageResult {
    const r = annualRate / 12 / 100;
    
    // Calculate base EMI (original without any prepayments)
    let originalEmi = 0;
    if (r === 0) {
        originalEmi = principal / months;
    } else {
        originalEmi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    }
    
    // In India, EMIs are usually rounded up
    originalEmi = Math.ceil(originalEmi);

    let currentEmi = originalEmi;
    let balance = principal;
    const schedule: AmortizationRow[] = [];
    
    let cumPrincipal = 0;
    let cumInterest = 0;
    
    // Sort lumpSums by month for easy access
    const lumpSumsMap = new Map<number, number>();
    config.lumpSums.forEach(ls => {
        lumpSumsMap.set(ls.month, (lumpSumsMap.get(ls.month) || 0) + ls.amount);
    });

    let m = 1;
    let remainingOriginalMonths = months;

    while (balance > 0 && m <= months * 2) { // cap at double the months just to prevent infinite loops theoretically
        const openingBalance = balance;
        const interestPart = balance * r;
        
        let paymentDue = currentEmi + config.monthlyExtraEMI;
        let lumpSumThisMonth = lumpSumsMap.get(m) || 0;
        
        // Total cash ready to pay this month
        let totalPaymentThisMonth = paymentDue + lumpSumThisMonth;

        // If paying more than balance + interest, cap it at remaining balance
        if (totalPaymentThisMonth >= (balance + interestPart)) {
            totalPaymentThisMonth = balance + interestPart;
        }

        const actualEmiPaid = totalPaymentThisMonth;
        const principalPart = actualEmiPaid - interestPart;

        balance = balance - principalPart;

        cumPrincipal += principalPart;
        cumInterest += interestPart;

        schedule.push({
            month: m,
            openingBalance: Math.round(openingBalance * 100) / 100,
            emi: Math.round(actualEmiPaid),
            principal: Math.round(principalPart * 100) / 100,
            interest: Math.round(interestPart * 100) / 100,
            closingBalance: Math.max(0, Math.round(balance * 100) / 100),
            cumulativePrincipal: Math.round(cumPrincipal * 100) / 100,
            cumulativeInterest: Math.round(cumInterest * 100) / 100,
        });

        remainingOriginalMonths--;

        if (balance <= 0) break;

        // Recalculate EMI if mode is reduce_emi and a lump sum was paid
        if (config.mode === 'reduce_emi' && lumpSumThisMonth > 0 && remainingOriginalMonths > 0) {
            // Recalculate PMT with current balance and remaining original months
            if (r > 0) {
                currentEmi = (balance * r * Math.pow(1 + r, remainingOriginalMonths)) / (Math.pow(1 + r, remainingOriginalMonths) - 1);
            } else {
                currentEmi = balance / remainingOriginalMonths;
            }
            currentEmi = Math.ceil(currentEmi); // Adjust new EMI
        }

        m++;
    }

    const totalInterest = cumInterest;
    const totalPayment = principal + totalInterest;
    
    // Calculate hypothentical original interest to find true savings
    let originalTotalInterest = 0;
    if (r > 0) {
        let tempBal = principal;
        for (let i = 0; i < months; i++) {
            let intP = tempBal * r;
            let prinP = originalEmi - intP;
            if (tempBal + intP < originalEmi) {
                prinP = tempBal;
            }
            tempBal -= prinP;
            originalTotalInterest += intP;
            if(tempBal <= 0) break;
        }
    } else {
        originalTotalInterest = 0;
    }

    const interestSaved = Math.max(0, originalTotalInterest - totalInterest);
    const timeSavedMonths = Math.max(0, months - schedule.length);

    // Calculate Tax Benefits
    const taxBenefits = calculateTaxBenefits(schedule);

    return {
        emi: originalEmi,
        originalEmi,
        totalInterest: Math.round(totalInterest),
        totalPayment: Math.round(totalPayment),
        interestSaved: Math.round(interestSaved),
        timeSavedMonths,
        schedule,
        taxBenefits
    };
}

export function calculateTaxBenefits(schedule: AmortizationRow[]): TaxBenefitResult {
    // 80C Max: 1.5L
    // Section 24 Max: 2L
    const MAX_80C = 150000;
    const MAX_24 = 200000;

    let total80C = 0;
    let total24 = 0;

    const yearlySchedule: TaxBenefitResult['schedule'] = [];

    let yearPrin = 0;
    let yearInt = 0;
    let currentYear = 1;

    for (let i = 0; i < schedule.length; i++) {
        yearPrin += schedule[i].principal;
        yearInt += schedule[i].interest;

        if ((i + 1) % 12 === 0 || i === schedule.length - 1) {
            const deduction80C = Math.min(yearPrin, MAX_80C);
            const deduction24 = Math.min(yearInt, MAX_24);

            total80C += deduction80C;
            total24 += deduction24;

            yearlySchedule.push({
                year: currentYear,
                principal: Math.round(yearPrin),
                interest: Math.round(yearInt),
                deduction80C: Math.round(deduction80C),
                deduction24: Math.round(deduction24)
            });

            yearPrin = 0;
            yearInt = 0;
            currentYear++;
        }
    }

    return {
        total80C: Math.round(total80C),
        total24: Math.round(total24),
        schedule: yearlySchedule
    };
}

export function calculateLTV(loanAmount: number, propertyValue: number): number {
    if (propertyValue <= 0) return 0;
    return (loanAmount / propertyValue) * 100;
}

// ═══════════════════════════════════════════════════════════════════════════
// CAPITAL GAINS — resident individual, FY 2026-27 (Tax Year 2026-27)
// Rates per Finance (No. 2) Act 2024, carried unchanged into the Income-tax
// Act 2025: equity LTCG 12.5% above ₹1.25L (Sec 112A → 198), equity STCG 20%
// (Sec 111A → 196), other LTCG 12.5% without indexation, land/building bought
// before 23 Jul 2024 may use 20% WITH indexation if lower. Specified (debt)
// MF units bought on/after 1 Apr 2023 are always taxed at slab (Sec 50AA).
// ═══════════════════════════════════════════════════════════════════════════

/** Cost Inflation Index — CBDT; FY 2026-27 = 384 (Notification 85/2026, 15 Jul 2026) */
export const CII: Record<string, number> = {
    '2001-02': 100, '2002-03': 105, '2003-04': 109, '2004-05': 113, '2005-06': 117,
    '2006-07': 122, '2007-08': 129, '2008-09': 137, '2009-10': 148, '2010-11': 167,
    '2011-12': 184, '2012-13': 200, '2013-14': 220, '2014-15': 240, '2015-16': 254,
    '2016-17': 264, '2017-18': 272, '2018-19': 280, '2019-20': 289, '2020-21': 301,
    '2021-22': 317, '2022-23': 331, '2023-24': 348, '2024-25': 363, '2025-26': 376,
    '2026-27': 384,
};
const CII_LATEST_FY = '2026-27';

/** Indian financial year label ('2026-27') for an ISO date; dates before 1 Apr 2001 map to 2001-02 */
export function fyOfDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return CII_LATEST_FY;
    const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    const start = Math.max(2001, y);
    return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export type CgAssetType = 'equity' | 'debtMF' | 'property' | 'gold';
export interface CgInput {
    asset: CgAssetType;
    purchaseDate: string; // YYYY-MM-DD
    saleDate: string;     // YYYY-MM-DD
    cost: number;
    sale: number;
    expenses: number;     // transfer costs (brokerage, stamp duty, legal)
    improvement: number;  // property only — not indexed here
    slabRate: number;     // marginal slab % for gains taxed at slab
}
export type CgMethod = 'ltcgEquity' | 'stcgEquity' | 'ltcgFlat' | 'ltcgIndexed' | 'slab';
export interface CgResult {
    holdingMonths: number; isLong: boolean; specifiedMF: boolean; pre2001: boolean;
    purchaseFY: string; saleFY: string;
    gain: number; taxableGain: number; exemptionUsed: number;
    indexedCost?: number; taxNoIndex: number; taxIndexed?: number;
    method: CgMethod; rate: number; tax: number; cess: number; totalTax: number;
    effectiveRate: number; netProceeds: number;
    insightWaitDays?: number; insightWaitSaving?: number;
}

const EQUITY_LTCG_EXEMPTION = 125000;
const CESS = 0.04;
const SPECIFIED_MF_FROM = new Date('2023-04-01');
const INDEXATION_GRANDFATHER_BEFORE = new Date('2024-07-23');

function addMonths(d: Date, m: number): Date { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; }
function monthsBetween(a: Date, b: Date): number {
    let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (b.getDate() < a.getDate()) m -= 1;
    return Math.max(0, m);
}

export function computeCapitalGains(i: CgInput): CgResult {
    const p = new Date(i.purchaseDate); const s = new Date(i.saleDate);
    const valid = !isNaN(p.getTime()) && !isNaN(s.getTime()) && s >= p;
    const purchaseFY = fyOfDate(i.purchaseDate); const saleFY = fyOfDate(i.saleDate);
    const ciiP = CII[purchaseFY] ?? 100; const ciiS = CII[saleFY] ?? CII[CII_LATEST_FY];
    const holdingMonths = valid ? monthsBetween(p, s) : 0;
    const longThresholdMonths = i.asset === 'equity' ? 12 : 24;
    const isLongByDate = valid && s > addMonths(p, longThresholdMonths);
    const specifiedMF = i.asset === 'debtMF' && valid && p >= SPECIFIED_MF_FROM;
    const isLong = specifiedMF ? false : isLongByDate;
    const pre2001 = valid && p < new Date('2001-04-01');

    const netSale = Math.max(0, i.sale - Math.max(0, i.expenses));
    const baseCost = Math.max(0, i.cost) + Math.max(0, i.improvement);
    const gain = netSale - baseCost;

    let method: CgMethod = 'slab'; let rate = i.slabRate; let taxableGain = Math.max(0, gain); let exemptionUsed = 0;
    let indexedCost: number | undefined; let taxIndexed: number | undefined;
    let taxNoIndex = 0;

    if (gain > 0) {
        if (i.asset === 'equity') {
            if (isLong) { method = 'ltcgEquity'; rate = 12.5; exemptionUsed = Math.min(EQUITY_LTCG_EXEMPTION, gain); taxableGain = gain - exemptionUsed; }
            else { method = 'stcgEquity'; rate = 20; }
            taxNoIndex = taxableGain * rate / 100;
        } else if (isLong) {
            method = 'ltcgFlat'; rate = 12.5; taxNoIndex = gain * 0.125;
            if (i.asset === 'property' && p < INDEXATION_GRANDFATHER_BEFORE) {
                indexedCost = Math.max(0, i.cost) * ciiS / ciiP;
                const indexedGain = netSale - indexedCost - Math.max(0, i.improvement);
                taxIndexed = Math.max(0, indexedGain) * 0.20;
                if (taxIndexed < taxNoIndex) { method = 'ltcgIndexed'; rate = 20; taxableGain = Math.max(0, indexedGain); }
            }
        } else {
            method = 'slab'; rate = i.slabRate; taxNoIndex = gain * i.slabRate / 100;
        }
    } else {
        taxableGain = 0;
    }

    const tax = gain > 0 ? (method === 'ltcgIndexed' ? (taxIndexed as number) : taxNoIndex) : 0;
    const cess = tax * CESS;
    const totalTax = tax + cess;
    const effectiveRate = gain > 0 ? (totalTax / gain) * 100 : 0;
    const netProceeds = netSale - totalTax;

    // Insight: short-term today, but long-term soon → how much would waiting save?
    let insightWaitDays: number | undefined; let insightWaitSaving: number | undefined;
    if (valid && gain > 0 && !isLong && !specifiedMF) {
        const eligible = addMonths(p, longThresholdMonths);
        const days = Math.ceil((eligible.getTime() - s.getTime()) / 86400000) + 1;
        if (days > 0 && days <= 180) {
            const longTax = i.asset === 'equity'
                ? Math.max(0, gain - EQUITY_LTCG_EXEMPTION) * 0.125 * (1 + CESS)
                : gain * 0.125 * (1 + CESS);
            insightWaitDays = days; insightWaitSaving = Math.max(0, totalTax - longTax);
        }
    }

    return {
        holdingMonths, isLong, specifiedMF, pre2001, purchaseFY, saleFY,
        gain, taxableGain, exemptionUsed, indexedCost, taxNoIndex, taxIndexed,
        method, rate, tax, cess, totalTax, effectiveRate, netProceeds,
        insightWaitDays, insightWaitSaving,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// LRS — TCS on foreign remittances, Sec 206C(1G) (ITA 1961) → Sec 394 (ITA 2025)
// Rates w.e.f. 1 Apr 2026 (Finance Act 2026): education/medical 2% above
// ₹10 lakh (was 5%); overseas tour package 2% flat, no threshold; education
// funded by a financial-institution loan nil; everything else 20% above ₹10 lakh.
// ═══════════════════════════════════════════════════════════════════════════
export const LRS_TCS_THRESHOLD = 1000000;
export type LrsPurpose = 'eduLoan' | 'eduMedical' | 'tour' | 'other';
export function computeLrsTcs(purpose: LrsPurpose, amount: number, alreadyRemitted: number) {
    const amt = Math.max(0, amount); const prior = Math.max(0, alreadyRemitted);
    let rate = 0; let taxableAmount = 0;
    if (purpose === 'tour') { rate = 2; taxableAmount = amt; }
    else if (purpose === 'eduLoan') { rate = 0; taxableAmount = 0; }
    else {
        rate = purpose === 'eduMedical' ? 2 : 20;
        const headroom = Math.max(0, LRS_TCS_THRESHOLD - prior);
        taxableAmount = Math.max(0, amt - headroom);
    }
    const tcs = taxableAmount * rate / 100;
    const thresholdLeft = purpose === 'tour' || purpose === 'eduLoan' ? 0 : Math.max(0, LRS_TCS_THRESHOLD - prior - amt);
    return { rate, taxableAmount, tcs, totalOutflow: amt + tcs, thresholdLeft };
}
