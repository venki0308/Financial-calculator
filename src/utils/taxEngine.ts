export type TaxRegime = 'old' | 'new';

export interface TaxCalculationParams {
  annualIncome: number;
  regime: TaxRegime;
  assetInterest: number;
  deduction80c?: number; // Max 1.5L applied in old regime
}

export interface TaxCalculationResult {
  baseTax: number;
  newTax: number;
  taxPayableOnAsset: number; // additional tax due to the asset
  effectiveTaxRate: number; // taxPayableOnAsset / assetInterest * 100
  postTaxReturn: number;
  taxSaved80C: number;
}

// FY 2025-26 (AY 2026-27) New Regime slabs — Budget 2025
const NEW_REGIME_SLABS = [
  { limit: 400000, rate: 0 },
  { limit: 800000, rate: 0.05 },
  { limit: 1200000, rate: 0.10 },
  { limit: 1600000, rate: 0.15 },
  { limit: 2000000, rate: 0.20 },
  { limit: 2400000, rate: 0.25 },
  { limit: Infinity, rate: 0.30 }
];

// Old Regime slabs (unchanged)
const OLD_REGIME_SLABS = [
  { limit: 250000, rate: 0 },
  { limit: 500000, rate: 0.05 },
  { limit: 1000000, rate: 0.20 },
  { limit: Infinity, rate: 0.30 }
];

function calculateTaxForIncome(income: number, regime: TaxRegime, deductions: number = 0): number {
  let taxable = income;
  let slabs = NEW_REGIME_SLABS;
  let standardDeduction = 0;
  let rebateLimit = 0;

  if (regime === 'new') {
    standardDeduction = 75000;
    taxable = Math.max(0, taxable - standardDeduction);
    slabs = NEW_REGIME_SLABS;
    rebateLimit = 1200000; // 87A: full rebate if taxable income ≤ ₹12L (FY 2025-26)
  } else {
    standardDeduction = 50000;
    taxable = Math.max(0, taxable - standardDeduction - deductions);
    slabs = OLD_REGIME_SLABS;
    rebateLimit = 500000;
  }

  let tax = 0;
  let prevLimit = 0;

  for (const slab of slabs) {
    if (taxable > prevLimit) {
      const taxableInThisSlab = Math.min(taxable, slab.limit) - prevLimit;
      tax += taxableInThisSlab * slab.rate;
      prevLimit = slab.limit;
    } else {
      break;
    }
  }

  // Rebate u/s 87A (Simplified without marginal relief for the basic logic)
  if (taxable <= rebateLimit) {
    tax = 0;
  }

  // Health and Education Cess
  if (tax > 0) {
    tax += tax * 0.04;
  }

  return tax;
}

/**
 * Calculates the exact tax impact of an asset's interest based on slab rates.
 */
export function calculateAssetTax(params: TaxCalculationParams): TaxCalculationResult {
  if (params.assetInterest <= 0) {
    return {
      baseTax: 0, newTax: 0, taxPayableOnAsset: 0, effectiveTaxRate: 0, postTaxReturn: 0, taxSaved80C: 0
    };
  }

  // Cap 80C to ₹1.5L
  const actual80C = Math.min(150000, params.deduction80c || 0);

  // Scenario 1: Base tax without the asset
  const baseTax = calculateTaxForIncome(params.annualIncome, params.regime, 0);

  // Scenario 2: With the asset
  const incomeWithAsset = params.annualIncome + params.assetInterest;
  // Apply 80C deduction ONLY in the Old Regime
  const appliedDeductions = params.regime === 'old' ? actual80C : 0;
  
  const newTaxWithout80C = calculateTaxForIncome(incomeWithAsset, params.regime, 0);
  const newTax = calculateTaxForIncome(incomeWithAsset, params.regime, appliedDeductions);

  // Tax saved specifically from 80C
  const taxSaved80C = newTaxWithout80C - newTax;

  // Tax on asset is the incremental tax liability
  // Note: an 80C deduction could make taxPayableOnAsset NEGATIVE (meaning it yields tax savings).
  const taxPayableOnAsset = newTax - baseTax;
  
  // Calculate effective tax rate strictly on the interest portion
  let effectiveTaxRate = (taxPayableOnAsset / params.assetInterest) * 100;
  
  const postTaxReturn = params.assetInterest - taxPayableOnAsset;

  return {
    baseTax,
    newTax,
    taxPayableOnAsset,
    effectiveTaxRate: isNaN(effectiveTaxRate) ? 0 : effectiveTaxRate,
    postTaxReturn,
    taxSaved80C
  };
}
