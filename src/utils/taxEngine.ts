export type TaxRegime = 'old' | 'new';

export interface TaxCalculationParams {
  annualIncome: number;
  regime: TaxRegime;
  assetInterest: number;
  deduction80c?: number; // Max 1.5L applied in old regime
  ageCategory?: AgeCategory; // old-regime senior slabs (default below_60)
}

export interface TaxCalculationResult {
  baseTax: number;
  newTax: number;
  taxPayableOnAsset: number; // additional tax due to the asset
  effectiveTaxRate: number; // taxPayableOnAsset / assetInterest * 100
  postTaxReturn: number;
  taxSaved80C: number;
}

// New Regime slabs — set by Budget 2025 for FY 2025-26; unchanged by Budget 2026,
// so also valid for FY 2026-27 (AY 2027-28 / Tax Year 2026-27 under the IT Act 2025).
const NEW_REGIME_SLABS = [
  { limit: 400000, rate: 0 },
  { limit: 800000, rate: 0.05 },
  { limit: 1200000, rate: 0.10 },
  { limit: 1600000, rate: 0.15 },
  { limit: 2000000, rate: 0.20 },
  { limit: 2400000, rate: 0.25 },
  { limit: Infinity, rate: 0.30 }
];

export type AgeCategory = 'below_60' | 'senior' | 'super_senior';

// Old Regime slabs — basic exemption rises for seniors (₹3L) and super seniors (₹5L)
const OLD_REGIME_SLABS: Record<AgeCategory, typeof NEW_REGIME_SLABS> = {
  below_60: [
    { limit: 250000, rate: 0 },
    { limit: 500000, rate: 0.05 },
    { limit: 1000000, rate: 0.20 },
    { limit: Infinity, rate: 0.30 }
  ],
  senior: [
    { limit: 300000, rate: 0 },
    { limit: 500000, rate: 0.05 },
    { limit: 1000000, rate: 0.20 },
    { limit: Infinity, rate: 0.30 }
  ],
  super_senior: [
    { limit: 500000, rate: 0 },
    { limit: 1000000, rate: 0.20 },
    { limit: Infinity, rate: 0.30 }
  ]
};

function slabTax(taxable: number, slabs: typeof NEW_REGIME_SLABS): number {
  let tax = 0;
  let prevLimit = 0;
  for (const slab of slabs) {
    if (taxable > prevLimit) {
      tax += (Math.min(taxable, slab.limit) - prevLimit) * slab.rate;
      prevLimit = slab.limit;
    } else {
      break;
    }
  }
  return tax;
}

// Surcharge with marginal relief: tax + surcharge cannot exceed
// (tax at the threshold, with the lower tier's surcharge) + (income above the threshold).
// New regime surcharge is capped at 25%; old regime has the 37% tier above ₹5Cr.
function surchargeWithRelief(tax: number, taxable: number, regime: TaxRegime, slabs: typeof NEW_REGIME_SLABS): number {
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

function calculateTaxForIncome(income: number, regime: TaxRegime, deductions: number = 0, ageCategory: AgeCategory = 'below_60'): number {
  let taxable = income;
  let slabs = NEW_REGIME_SLABS;

  if (regime === 'new') {
    taxable = Math.max(0, taxable - 75000); // standard deduction (new regime)
    slabs = NEW_REGIME_SLABS;
  } else {
    taxable = Math.max(0, taxable - 50000 - deductions); // standard deduction (old regime)
    slabs = OLD_REGIME_SLABS[ageCategory];
  }

  let tax = slabTax(taxable, slabs);

  // Rebate u/s 87A.
  if (regime === 'new') {
    // New regime: full rebate ≤ ₹12L taxable, with marginal relief above it.
    // Without marginal relief, a user at ₹12.1L taxable would jump from ₹0
    // tax to ₹61,500 — a cliff of ₹61K on just ₹10K of income.
    const rebateLimit = 1200000;
    if (taxable <= rebateLimit) {
      tax = 0;
    } else {
      const excess = taxable - rebateLimit;
      if (tax > excess) tax = excess;
    }
  } else if (taxable <= 500000) {
    // Old regime: strict cliff — full rebate (max ₹12,500) at ≤ ₹5L, nothing
    // above. Marginal relief on 87A exists only in the new regime.
    tax = 0;
  }

  // Surcharge (with marginal relief) for incomes above ₹50L — previously
  // omitted entirely, understating tax impact for high-income users.
  tax += surchargeWithRelief(tax, taxable, regime, slabs);

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
  const baseTax = calculateTaxForIncome(params.annualIncome, params.regime, 0, params.ageCategory);

  // Scenario 2: With the asset
  const incomeWithAsset = params.annualIncome + params.assetInterest;
  // Apply 80C deduction ONLY in the Old Regime
  const appliedDeductions = params.regime === 'old' ? actual80C : 0;
  
  const newTaxWithout80C = calculateTaxForIncome(incomeWithAsset, params.regime, 0, params.ageCategory);
  const newTax = calculateTaxForIncome(incomeWithAsset, params.regime, appliedDeductions, params.ageCategory);

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
