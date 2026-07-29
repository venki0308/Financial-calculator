// ─── Job Switch / Multi-Employer Tax Engine ───────────────────────────────────
// Reproduces the "Statement of Income" a CA prepares when a salaried person
// has more than one employer in a financial year (Form 16 from each).
//
// Why this exists: each employer computes TDS on ITS OWN salary alone — each
// applies the full standard deduction and the full 87A rebate. When the
// combined salary crosses the rebate limit, actual tax is due even though
// every individual Form 16 shows zero TDS. The engine merges the Form 16s the
// way a CA does: one standard deduction, section 10 exemptions per employer,
// other income, rounding u/s 288A, slab tax, 87A with marginal relief,
// surcharge with marginal relief, cess, rounding u/s 288B, then TDS credit.

export type Regime = 'old' | 'new';
export type FY = '2025-26' | '2026-27';
export type AgeCategory = 'below_60' | 'senior' | 'super_senior';

export interface EmployerInput {
    name: string;
    /** Gross salary u/s 17(1)+(2)+(3) — the "Total" in Form 16 Part B row 1(d) */
    grossSalary: number;
    /** Gratuity exempt u/s 10(10) */
    gratuityExempt: number;
    /** Leave encashment exempt u/s 10(10AA) */
    leaveEncashmentExempt: number;
    /** HRA exempt u/s 10(13A) — old regime only; ignored in new regime */
    hraExempt: number;
    /** Duty-related allowances exempt u/s 10(14)(i) (conveyance/daily/travel on tour) — allowed in BOTH regimes */
    otherExempt: number;
    /** Professional tax u/s 16(iii) — old regime only */
    professionalTax: number;
    /** Total TDS deducted by this employer (Form 16 Part A) */
    tdsDeducted: number;
}

export interface OtherIncomeInput {
    /** Savings-account interest (eligible for 80TTA in old regime) */
    savingsInterest: number;
    /** FD/RD interest and any other "Income from other sources" */
    otherInterest: number;
    /** TDS already deducted on the above by banks (Form 26AS/AIS —
     *  "TDS other than salary"). Missing this is the #1 cause of wrong
     *  refund estimates: banks cut 10% on FD interest above the limit. */
    tdsOtherIncome?: number;
}

export interface OldRegimeDeductions {
    section80C: number;     // cap 1.5L
    /** Deductible 80D from Form 16 Part B row 10(g). Cap 1L total: self
     *  25K (50K senior) + parents 25K (50K senior) — the employer has
     *  already validated the per-head split, so we only guard the max. */
    section80D: number;
    section80CCD1B: number; // cap 50K
    /** Loss from house property set off against salary (Form 16 Part B
     *  row 7(a), shown negative there — pass as a POSITIVE number).
     *  Set-off capped at 2L u/s 71(3A). Old regime only. */
    housePropertyLoss?: number;
}

export interface JobSwitchTaxParams {
    employers: EmployerInput[];
    otherIncome: OtherIncomeInput;
    regime: Regime;
    fy: FY;
    ageCategory: AgeCategory;
    oldDeductions: OldRegimeDeductions;
    /** Advance / self-assessment tax already paid, if any */
    advanceTaxPaid: number;
}

export interface EmployerBreakdown {
    name: string;
    grossSalary: number;
    exemptTotal: number;
    taxableSalary: number;
    tdsDeducted: number;
    /** Tax this employer would compute standalone (its own std deduction + rebate) — explains why its TDS was low/zero */
    standaloneTax: number;
}

export interface JobSwitchTaxResult {
    employers: EmployerBreakdown[];
    totalGrossSalary: number;
    totalExemptions: number;
    totalSalary: number;          // after sec-10 exemptions, before sec-16
    standardDeduction: number;    // applied ONCE
    professionalTaxDeduction: number;
    salaryIncome: number;         // income under head "Salaries"
    otherIncomeTotal: number;
    grossTotalIncome: number;
    chapterVIA: number;           // old regime only (incl. 80TTA)
    deduction80TTA: number;
    totalIncome: number;
    totalIncomeRounded: number;   // u/s 288A → nearest ₹10
    taxOnIncome: number;          // slab tax before rebate
    rebate87A: number;
    taxAfterRebate: number;
    surcharge: number;
    cess: number;
    /** Net tax with cess, rupee-rounded — matches the ITR "Net tax payable" line (288B does NOT apply here) */
    totalTaxLiability: number;
    totalTDS: number;
    advanceTaxPaid: number;
    /** Positive = balance payable; negative = refund due. Rounded u/s 288B (nearest ₹10) — 288B applies to the NET amount payable/refundable, as on the ITR acknowledgement */
    balancePayable: number;
    /** True when combined liability exists but employers' TDS fell short because each applied its own rebate/deduction */
    multiEmployerTrap: boolean;
}

interface Slab { limit: number; rate: number }

// New-regime slabs — Budget 2025 (FY 2025-26), unchanged by Budget 2026 (FY 2026-27).
const NEW_SLABS: Slab[] = [
    { limit: 400000, rate: 0 },
    { limit: 800000, rate: 0.05 },
    { limit: 1200000, rate: 0.10 },
    { limit: 1600000, rate: 0.15 },
    { limit: 2000000, rate: 0.20 },
    { limit: 2400000, rate: 0.25 },
    { limit: Infinity, rate: 0.30 },
];

const OLD_SLABS: Record<AgeCategory, Slab[]> = {
    below_60: [
        { limit: 250000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.20 },
        { limit: Infinity, rate: 0.30 },
    ],
    senior: [
        { limit: 300000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.20 },
        { limit: Infinity, rate: 0.30 },
    ],
    super_senior: [
        { limit: 500000, rate: 0 },
        { limit: 1000000, rate: 0.20 },
        { limit: Infinity, rate: 0.30 },
    ],
};

export const STD_DEDUCTION_NEW = 75000;
export const STD_DEDUCTION_OLD = 50000;

// Nearest ₹10 with ₹5 rounded up in magnitude — the ITR portal rounds a ₹5
// residue away from zero for refunds too (net −5 shows as refund of ₹10).
const roundTo10 = (n: number) => (n < 0 ? -1 : 1) * Math.round(Math.abs(n) / 10) * 10;

/** Section 288B rounding (nearest ₹10, ₹5 away from zero) — for UI previews of the ITR acknowledgement */
export const round288B = roundTo10;

// ─── Interest & late fee (234A / 234B / 234C / 234F) ─────────────────────────
// The other half of what a CA computes: "how much extra if I pay/file late?"

/** Rule 119A: for interest computation, round the tax DOWN to a multiple of ₹100 */
const floor100 = (n: number) => Math.floor(Math.max(0, n) / 100) * 100;

/** ITR due date (non-audit) — 31 July of the assessment year */
export const filingDueDate = (fy: FY): string => (fy === '2025-26' ? '2026-07-31' : '2027-07-31');

// Months "or part thereof" at 1%/month: the start month counts in full,
// and any day into a later month counts that month too.
function monthsInclusive(fromISO: string, toISO: string): number {
    const a = new Date(fromISO), b = new Date(toISO);
    if (b < a) return 0;
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
}

export interface LateFilingParams {
    fy: FY;
    /** Total income (288A-rounded) — drives the 234F fee tier */
    totalIncome: number;
    /** Net tax payable incl. cess (the ITR "Net tax payable" line) */
    totalTaxLiability: number;
    totalTDS: number;
    /** Advance tax paid during the FY (assumed paid before the first instalment date — v1 simplification) */
    advanceTaxPaid: number;
    /** Planned self-assessment payment date, ISO yyyy-mm-dd */
    paymentDate: string;
    /** Planned ITR filing date, ISO yyyy-mm-dd */
    filingDate: string;
    /** Drives the 234F nil-fee basic-exemption threshold (default 'new' → ₹4L) */
    regime?: Regime;
    /** Old-regime senior thresholds for the 234F nil check (default 'below_60') */
    ageCategory?: AgeCategory;
}

export interface LateFilingResult {
    dueDate: string;
    /** Advance-tax machinery applies only when assessed tax ≥ ₹10,000 */
    advanceTaxObligation: boolean;
    assessedTax: number;          // liability − TDS
    interest234A: number;         // late filing/payment beyond due date — 1%/month
    interest234B: number;         // advance-tax default — 1%/month from 1 April of AY
    interest234C: number;         // instalment deferment — staggered
    fee234F: number;              // late-filing fee
    totalInterestAndFee: number;
    /** balance (288B) + interest + fee — the real cheque the taxpayer writes */
    totalPayableWithInterest: number;
}

// Known simplifications (v1, matching what salaried filers need):
//  • advanceTaxPaid is treated as paid before 15 June (best case for 234C);
//  • the 12%/36% cumulative safe-harbour exceptions of 234C are not modelled;
//  • capital-gains/44AD spread rules are out of scope (ITR-1 audience).
export function calculateLateFiling(p: LateFilingParams): LateFilingResult {
    const dueDate = filingDueDate(p.fy);
    const assessedTax = Math.max(0, p.totalTaxLiability - p.totalTDS);
    const advanceTaxObligation = assessedTax >= 10000;
    const ayStart = p.fy === '2025-26' ? '2026-04-01' : '2027-04-01';

    // 234B — if obligated and advance paid < 90% of assessed tax:
    // 1%/month on (assessed − advance), April of AY through payment month.
    let interest234B = 0;
    if (advanceTaxObligation && p.advanceTaxPaid < 0.9 * assessedTax) {
        const base = floor100(assessedTax - p.advanceTaxPaid);
        interest234B = Math.round(base * 0.01 * monthsInclusive(ayStart, p.paymentDate));
    }

    // 234C — shortfall vs cumulative instalments (15/45/75/100% by 15 Jun/Sep/Dec/Mar):
    // 3 months' interest per deferred instalment, 1 month for the last.
    let interest234C = 0;
    if (advanceTaxObligation) {
        const req = [0.15, 0.45, 0.75, 1.0];
        req.forEach((r, i) => {
            const shortfall = floor100(assessedTax * r - p.advanceTaxPaid);
            interest234C += shortfall * 0.01 * (i === 3 ? 1 : 3);
        });
        interest234C = Math.round(interest234C);
    }

    // 234A — unpaid self-assessment tax beyond the due date: 1%/month from the
    // day after the due date until payment.
    let interest234A = 0;
    if (p.paymentDate > dueDate) {
        const monthAfterDue = p.fy === '2025-26' ? '2026-08-01' : '2027-08-01';
        const base = floor100(assessedTax - p.advanceTaxPaid);
        interest234A = Math.round(base * 0.01 * monthsInclusive(monthAfterDue, p.paymentDate));
    }

    // 234F — late-filing fee: nil below the basic exemption (regime/age aware —
    // ₹4L new regime; ₹2.5L/₹3L/₹5L old by age), ₹1,000 up to ₹5L income, else ₹5,000.
    let fee234F = 0;
    if (p.filingDate > dueDate) {
        const basicExemption = (p.regime ?? 'new') === 'old'
            ? (p.ageCategory === 'super_senior' ? 500000 : p.ageCategory === 'senior' ? 300000 : 250000)
            : 400000;
        fee234F = p.totalIncome <= basicExemption ? 0 : p.totalIncome <= 500000 ? 1000 : 5000;
    }

    const totalInterestAndFee = interest234A + interest234B + interest234C + fee234F;
    const balance = roundTo10(p.totalTaxLiability - p.totalTDS - p.advanceTaxPaid);
    return {
        dueDate,
        advanceTaxObligation,
        assessedTax,
        interest234A,
        interest234B,
        interest234C,
        fee234F,
        totalInterestAndFee,
        totalPayableWithInterest: Math.max(0, balance) + totalInterestAndFee,
    };
}

function slabTax(taxable: number, slabs: Slab[]): number {
    let tax = 0, prev = 0;
    for (const s of slabs) {
        if (taxable <= prev) break;
        tax += (Math.min(taxable, s.limit) - prev) * s.rate;
        prev = s.limit;
    }
    return tax;
}

// 87A: new regime — full rebate ≤ ₹12L taxable with marginal relief above it
// (tax capped at income above ₹12L). Old regime — strict cliff at ₹5L.
function rebate87A(tax: number, taxable: number, regime: Regime): number {
    if (regime === 'new') {
        if (taxable <= 1200000) return tax;
        return Math.max(0, tax - (taxable - 1200000));
    }
    return taxable <= 500000 ? tax : 0;
}

// Surcharge with marginal relief. New regime capped at 25%; old has 37% > ₹5Cr.
function surchargeWithRelief(tax: number, taxable: number, regime: Regime, slabs: Slab[]): number {
    if (tax <= 0) return 0;
    let rate = 0, threshold = 0, prevRate = 0;
    if (regime === 'old' && taxable > 50000000) { rate = 0.37; threshold = 50000000; prevRate = 0.25; }
    else if (taxable > 20000000) { rate = 0.25; threshold = 20000000; prevRate = 0.15; }
    else if (taxable > 10000000) { rate = 0.15; threshold = 10000000; prevRate = 0.10; }
    else if (taxable > 5000000)  { rate = 0.10; threshold = 5000000;  prevRate = 0;    }
    else return 0;
    const surcharge = tax * rate;
    const maxTotal = slabTax(threshold, slabs) * (1 + prevRate) + (taxable - threshold);
    return tax + surcharge > maxTotal ? Math.max(0, maxTotal - tax) : surcharge;
}

/** Full liability (incl. cess, 288B-rounded) on a taxable income figure. */
function liabilityOn(taxableRounded: number, regime: Regime, slabs: Slab[]): number {
    const raw = slabTax(taxableRounded, slabs);
    const afterRebate = raw - rebate87A(raw, taxableRounded, regime);
    const withSurcharge = afterRebate + surchargeWithRelief(afterRebate, taxableRounded, regime, slabs);
    return roundTo10(withSurcharge * 1.04);
}

function exemptTotalFor(e: EmployerInput, regime: Regime): number {
    // Gratuity 10(10), leave encashment 10(10AA) and duty-related 10(14)(i)
    // allowances remain exempt under 115BAC; HRA 10(13A) is old-regime only.
    const base = e.gratuityExempt + e.leaveEncashmentExempt + e.otherExempt;
    const hra = regime === 'old' ? e.hraExempt : 0;
    return Math.min(e.grossSalary, base + hra);
}

export function calculateJobSwitchTax(p: JobSwitchTaxParams): JobSwitchTaxResult {
    const regime = p.regime;
    const slabs = regime === 'new' ? NEW_SLABS : OLD_SLABS[p.ageCategory];
    const stdDed = regime === 'new' ? STD_DEDUCTION_NEW : STD_DEDUCTION_OLD;

    const employers: EmployerBreakdown[] = p.employers.map((e) => {
        const exemptTotal = exemptTotalFor(e, regime);
        const taxableSalary = Math.max(0, e.grossSalary - exemptTotal);
        // What this employer's payroll would compute in isolation: its salary
        // alone, minus the full standard deduction, with the full 87A rebate.
        const standaloneTaxable = roundTo10(Math.max(0, taxableSalary - stdDed));
        const standaloneTax = liabilityOn(standaloneTaxable, regime, slabs);
        return {
            name: e.name,
            grossSalary: e.grossSalary,
            exemptTotal,
            taxableSalary,
            tdsDeducted: e.tdsDeducted,
            standaloneTax,
        };
    });

    const totalGrossSalary = employers.reduce((s, e) => s + e.grossSalary, 0);
    const totalExemptions = employers.reduce((s, e) => s + e.exemptTotal, 0);
    const totalSalary = employers.reduce((s, e) => s + e.taxableSalary, 0);

    const professionalTaxDeduction = regime === 'old'
        ? p.employers.reduce((s, e) => s + e.professionalTax, 0)
        : 0;
    const salaryIncome = Math.max(0, totalSalary - Math.min(totalSalary, stdDed) - professionalTaxDeduction);

    const otherIncomeTotal = p.otherIncome.savingsInterest + p.otherIncome.otherInterest;
    // House-property loss (home-loan interest on self-occupied / let-out
    // loss): set-off against other heads capped at 2L u/s 71(3A). The new
    // regime disallows this set-off entirely.
    const housePropertySetOff = regime === 'old'
        ? Math.min(Math.max(0, p.oldDeductions.housePropertyLoss ?? 0), 200000)
        : 0;
    const grossTotalIncome = Math.max(0, salaryIncome + otherIncomeTotal - housePropertySetOff);

    const deduction80TTA = regime === 'old' ? Math.min(p.otherIncome.savingsInterest, 10000) : 0;
    const chapterVIA = regime === 'old'
        ? Math.min(p.oldDeductions.section80C, 150000)
          // 80D: Form 16 already shows the employer-validated deductible;
          // guard only the legal maximum (self 25/50K + senior parents 50K).
          + Math.min(p.oldDeductions.section80D, 100000)
          + Math.min(p.oldDeductions.section80CCD1B, 50000)
          + deduction80TTA
        : 0;

    const totalIncome = Math.max(0, grossTotalIncome - chapterVIA);
    const totalIncomeRounded = roundTo10(totalIncome);

    const taxOnIncome = Math.round(slabTax(totalIncomeRounded, slabs));
    const reb = Math.round(rebate87A(taxOnIncome, totalIncomeRounded, regime));
    const taxAfterRebate = taxOnIncome - reb;
    const surcharge = Math.round(surchargeWithRelief(taxAfterRebate, totalIncomeRounded, regime, slabs));
    const cess = Math.round((taxAfterRebate + surcharge) * 0.04);
    // ITR portal keeps the liability line at rupee precision (e.g. ₹1,695);
    // 288B's nearest-₹10 rounding applies to the NET payable/refundable below.
    const totalTaxLiability = Math.round(taxAfterRebate + surcharge + cess);

    const totalTDS = p.employers.reduce((s, e) => s + e.tdsDeducted, 0)
        + Math.max(0, p.otherIncome.tdsOtherIncome ?? 0);
    const balancePayable = roundTo10(totalTaxLiability - totalTDS - p.advanceTaxPaid);

    const multiEmployerTrap =
        p.employers.length > 1 &&
        balancePayable > 0 &&
        totalTDS < totalTaxLiability;

    return {
        employers,
        totalGrossSalary,
        totalExemptions,
        totalSalary,
        standardDeduction: Math.min(totalSalary, stdDed),
        professionalTaxDeduction,
        salaryIncome,
        otherIncomeTotal,
        grossTotalIncome,
        chapterVIA,
        deduction80TTA,
        totalIncome,
        totalIncomeRounded,
        taxOnIncome,
        rebate87A: reb,
        taxAfterRebate,
        surcharge,
        cess,
        totalTaxLiability,
        totalTDS,
        advanceTaxPaid: p.advanceTaxPaid,
        balancePayable,
        multiEmployerTrap,
    };
}
