// ═══════════════════════════════════════════════════════════════════════════
// Income tax maths for resident individuals (Old and New Regime).
// Moved unchanged from pages/IncomeTaxCalculator.tsx so the website's
// mini-calculator and the app share one implementation. Checked by
// scripts/qa-calculators.mjs against an independent re-implementation.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Tax Slab Tables ──────────────────────────────────────────────────────────
export const OLD_REGIME = [
    { min: 0, max: 250000, rate: 0 },
    { min: 250000, max: 500000, rate: 5 },
    { min: 500000, max: 1000000, rate: 20 },
    { min: 1000000, max: Infinity, rate: 30 },
];

// Old regime — Senior Citizen (60-79). Higher basic exemption ₹3L.
export const OLD_REGIME_SENIOR = [
    { min: 0, max: 300000, rate: 0 },
    { min: 300000, max: 500000, rate: 5 },
    { min: 500000, max: 1000000, rate: 20 },
    { min: 1000000, max: Infinity, rate: 30 },
];

// Old regime — Super Senior (80+). Higher basic exemption ₹5L (no 5% slab).
export const OLD_REGIME_SUPER_SENIOR = [
    { min: 0, max: 500000, rate: 0 },
    { min: 500000, max: 1000000, rate: 20 },
    { min: 1000000, max: Infinity, rate: 30 },
];

// Union Budget 2026-27 — New Regime Slabs (FY 2026-27)
export const NEW_REGIME_2026_27 = [
    { min: 0, max: 400000, rate: 0 },
    { min: 400000, max: 800000, rate: 5 },
    { min: 800000, max: 1200000, rate: 10 },
    { min: 1200000, max: 1600000, rate: 15 },
    { min: 1600000, max: 2000000, rate: 20 },
    { min: 2000000, max: 2400000, rate: 25 },
    { min: 2400000, max: Infinity, rate: 30 },
];

// FY 2025-26 New Regime (same bracket structure, different 87A rebate)
export const NEW_REGIME_2025_26 = [
    { min: 0, max: 400000, rate: 0 },
    { min: 400000, max: 800000, rate: 5 },
    { min: 800000, max: 1200000, rate: 10 },
    { min: 1200000, max: 1600000, rate: 15 },
    { min: 1600000, max: 2000000, rate: 20 },
    { min: 2000000, max: 2400000, rate: 25 },
    { min: 2400000, max: Infinity, rate: 30 },
];

export type TaxSlabs = typeof OLD_REGIME;
export type TaxRegime = 'old' | 'new';
export type TaxYear = '2026-27' | '2025-26';

// Deduction limits for validation
export const LIMITS: Record<string, number> = {
    section80C: 150000,
    section80D: 25000,
    section80CCD: 50000,
    homeLoan: 200000,
};

/** Standard deduction for salaried people (same for FY 2025-26 and 2026-27). */
export const NEW_REGIME_STANDARD_DEDUCTION = 75000;
export const OLD_REGIME_STANDARD_DEDUCTION = 50000;
/** New Regime: taxable income up to this amount pays no tax (Section 87A rebate). */
export const NEW_REGIME_REBATE_LIMIT = 1200000;

export function computeSlabTax(income: number, slabs: typeof OLD_REGIME): number {
    let tax = 0;
    for (const slab of slabs) {
        if (income > slab.min) {
            const upper = slab.max === Infinity ? income : slab.max;
            tax += (Math.min(income, upper) - slab.min) * (slab.rate / 100);
        }
    }
    return tax;
}

// Section 87A rebate + marginal relief.
// Without marginal relief, a user at ₹12.1L taxable pays ₹61,500 while at
// ₹12L they pay ₹0 — a cliff of ₹61K on ₹10K of income. Every top Indian
// tax calculator (ClearTax, Groww, BankBazaar) handles this; we must too.
export function applyRebate87A(tax: number, taxableIncome: number, regime: 'old' | 'new', _fy: '2026-27' | '2025-26'): number {
    if (regime === 'new') {
        const threshold = 1200000;
        if (taxableIncome <= threshold) return 0;
        // Marginal relief: tax payable must not exceed the income above the
        // rebate threshold. Prevents the ₹0→₹61K cliff at ₹12L boundary.
        const excess = taxableIncome - threshold;
        return Math.min(tax, excess);
    } else {
        // Old-regime 87A is a strict cliff: full rebate (max ₹12,500) at taxable
        // income ≤ ₹5L, nothing above it. Marginal relief on the 87A rebate exists
        // ONLY in the new regime (introduced by Budget 2023 for 115BAC).
        return taxableIncome <= 500000 ? 0 : tax;
    }
}

// Surcharge with marginal relief — old regime has 37% tier (>₹5Cr); new regime capped at 25%.
// Marginal relief (law-mandated): tax + surcharge cannot exceed
// (tax at the threshold, with the lower tier's surcharge) + (income above the threshold).
export function computeSurcharge(tax: number, taxableIncome: number, regime: 'old' | 'new', slabs: typeof OLD_REGIME): number {
    if (tax <= 0) return 0;
    let rate = 0, threshold = 0, prevRate = 0;
    if (regime === 'old' && taxableIncome > 50000000) { rate = 0.37; threshold = 50000000; prevRate = 0.25; } // >₹5Cr (old only)
    else if (taxableIncome > 20000000) { rate = 0.25; threshold = 20000000; prevRate = 0.15; } // >₹2Cr
    else if (taxableIncome > 10000000) { rate = 0.15; threshold = 10000000; prevRate = 0.10; } // >₹1Cr
    else if (taxableIncome > 5000000)  { rate = 0.10; threshold = 5000000;  prevRate = 0;    } // >₹50L
    else return 0;
    const surcharge = tax * rate;
    const taxAtThreshold = computeSlabTax(threshold, slabs);
    const maxTotal = taxAtThreshold * (1 + prevRate) + (taxableIncome - threshold);
    return tax + surcharge > maxTotal ? Math.max(0, maxTotal - tax) : surcharge;
}

// Sec 288A: taxable income rounds to the nearest ₹10 (keeps this page consistent
// with the Form 16 Tax Calculator for identical inputs)
export const r10 = (n: number) => Math.round(n / 10) * 10;

export interface RegimeTax {
    rawTax: number;
    afterRebate: number;
    surcharge: number;
    taxAfterSurcharge: number;
    cess: number;
    totalTax: number;
}

/** Slab tax → 87A rebate (with marginal relief) → surcharge (with marginal relief) → 4% cess. */
export function taxForRegime(taxableIncome: number, regime: TaxRegime, slabs: TaxSlabs, fy: TaxYear): RegimeTax {
    const rawTax = computeSlabTax(taxableIncome, slabs);
    const afterRebate = applyRebate87A(rawTax, taxableIncome, regime, fy);
    const surcharge = computeSurcharge(afterRebate, taxableIncome, regime, slabs);
    const taxAfterSurcharge = afterRebate + surcharge;
    const cess = taxAfterSurcharge * 0.04;
    return { rawTax, afterRebate, surcharge, taxAfterSurcharge, cess, totalTax: taxAfterSurcharge + cess };
}

export interface SalaryTaxComparison {
    newTaxableIncome: number;
    oldTaxableIncome: number;
    newTax: RegimeTax;
    oldTax: RegimeTax;
    /** Lower-tax regime; 'Old' on a tie, as in the app. */
    betterRegime: 'Old' | 'New';
    saving: number;
}

/**
 * Both regimes for a salaried resident below 60, from annual gross salary and
 * the Old Regime deductions claimed on top of the standard deduction (80C,
 * 80D, home-loan interest, HRA …). Same steps as the app's Income Tax
 * Calculator with no employer NPS.
 */
export function compareSalaryTax(grossSalary: number, oldRegimeDeductions: number, fy: TaxYear = '2026-27'): SalaryTaxComparison {
    const newSlabs = fy === '2026-27' ? NEW_REGIME_2026_27 : NEW_REGIME_2025_26;
    const newTaxableIncome = r10(Math.max(0, grossSalary - NEW_REGIME_STANDARD_DEDUCTION));
    const oldTaxableIncome = r10(Math.max(0, grossSalary - OLD_REGIME_STANDARD_DEDUCTION - oldRegimeDeductions));
    const newTax = taxForRegime(newTaxableIncome, 'new', newSlabs, fy);
    const oldTax = taxForRegime(oldTaxableIncome, 'old', OLD_REGIME, fy);
    return {
        newTaxableIncome, oldTaxableIncome, newTax, oldTax,
        betterRegime: oldTax.totalTax <= newTax.totalTax ? 'Old' : 'New',
        saving: Math.abs(oldTax.totalTax - newTax.totalTax),
    };
}
