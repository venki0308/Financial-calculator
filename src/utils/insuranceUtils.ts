/**
 * insuranceUtils.ts — Insurance calculation logic for FinCalix.
 * Covers Health Insurance premium estimation and Life Insurance comparison
 * (Term vs TROP vs Endowment vs ULIP) with XIRR-based return analysis.
 */

// ─── Health Insurance Types ──────────────────────────────────────────────────

export interface HealthInsuranceInputs {
  age: number;
  members: number; // 1=self, 2=self+spouse, 3=self+spouse+1kid, 4=self+spouse+2kids
  sumInsured: number; // 300000, 500000, 1000000, 2500000, 5000000, 10000000
  preExisting: boolean;
  city: 'metro' | 'tier2' | 'tier3';
}

export interface HealthInsurancePlan {
  insurer: string;
  planName: string;
  annualPremium: number;
  cashless: boolean;
  noClaimBonus: number; // % increase in cover per year
  roomRent: 'no-limit' | 'single-ac' | 'shared';
  copay: number; // 0 to 20%
  waitingPeriod: number; // years for pre-existing
  coverAfter5Yrs: number; // sum insured after 5 years of no claims
  rating: number; // 1-5 stars
  highlights: string[];
}

export interface HealthInsuranceResult {
  plans: HealthInsurancePlan[];
  bestValue: string;
  bestCoverage: string;
  expertVerdict: string;
  inputs: HealthInsuranceInputs;
}

// ─── Life Insurance Types ────────────────────────────────────────────────────

export interface LifeInsuranceInputs {
  age: number;
  gender: 'male' | 'female';
  smoker: boolean;
  coverAmount: number; // 5000000, 10000000, 25000000, 50000000, 100000000
  policyTerm: number; // 10, 15, 20, 25, 30
  premiumPaymentTerm: number; // same or limited pay (5, 10, 15)
}

export interface LifeInsurancePlan {
  type: 'term' | 'trop' | 'endowment' | 'ulip';
  typeName: string;
  insurer: string;
  planName: string;
  annualPremium: number;
  monthlyPremium: number;
  totalPremiumPaid: number;
  deathBenefit: number;
  maturityBenefit: number;
  effectiveReturn: number; // XIRR %
  taxBenefit80C: number;
  taxBenefit10_10D: string;
  rating: number;
  highlights: string[];
  verdict: string;
}

export interface LifeInsuranceResult {
  plans: LifeInsurancePlan[];
  bestForProtection: string;
  bestForReturns: string;
  expertVerdict: string;
  inputs: LifeInsuranceInputs;
  comparisonSummary: {
    cheapest: string;
    highestCover: string;
    bestReturn: string;
    recommendation: string;
  };
}

// ─── Health Insurance Calculator ─────────────────────────────────────────────

function getBaseHealthPremium(age: number, sumInsured: number): number {
  // Actuarial-style base rate per lakh of SI, varying by age
  const ageMultiplier = age <= 25 ? 0.7 : age <= 35 ? 1.0 : age <= 45 ? 1.5 : age <= 55 ? 2.2 : age <= 65 ? 3.2 : 4.5;
  const siInLakhs = sumInsured / 100000;
  // Base rate decreases per lakh as SI increases (volume discount)
  const basePerLakh = siInLakhs <= 3 ? 520 : siInLakhs <= 5 ? 480 : siInLakhs <= 10 ? 420 : siInLakhs <= 25 ? 350 : siInLakhs <= 50 ? 300 : 260;
  return Math.round(basePerLakh * siInLakhs * ageMultiplier);
}

function getCityMultiplier(city: 'metro' | 'tier2' | 'tier3'): number {
  return city === 'metro' ? 1.15 : city === 'tier2' ? 1.0 : 0.9;
}

function getMemberMultiplier(members: number): number {
  return members === 1 ? 1.0 : members === 2 ? 1.75 : members === 3 ? 2.15 : 2.45;
}

export function calculateHealthPremiums(inputs: HealthInsuranceInputs): HealthInsuranceResult {
  const { age, members, sumInsured, preExisting, city } = inputs;
  const basePremium = getBaseHealthPremium(age, sumInsured);
  const cityFactor = getCityMultiplier(city);
  const memberFactor = getMemberMultiplier(members);
  const preExistingLoading = preExisting ? 1.25 : 1.0;
  const gst = 1.18; // 18% GST on health insurance

  const siInLakhs = sumInsured / 100000;

  // Plan configs with realistic differentiators
  const planConfigs = [
    {
      insurer: 'Star Health',
      planName: 'Star Comprehensive',
      premMultiplier: 1.0,
      cashless: true,
      noClaimBonus: 25,
      roomRent: 'no-limit' as const,
      copay: 0,
      waitingPeriod: preExisting ? 3 : 0,
      coverBonusPerYear: 0.25,
      rating: 4.3,
      highlights: ['No room rent capping', '25% NCB per year', '10,000+ cashless hospitals', 'Day-care procedures covered'],
    },
    {
      insurer: 'Niva Bupa',
      planName: 'Health Reassure 2.0',
      premMultiplier: 0.92,
      cashless: true,
      noClaimBonus: 50,
      roomRent: 'single-ac' as const,
      copay: 0,
      waitingPeriod: preExisting ? 3 : 0,
      coverBonusPerYear: 0.50,
      rating: 4.5,
      highlights: ['50% NCB — doubles cover in 2 yrs', 'Consumables covered', 'No co-payment', 'Maternity & newborn cover'],
    },
    {
      insurer: 'HDFC Ergo',
      planName: 'Optima Secure',
      premMultiplier: 1.08,
      cashless: true,
      noClaimBonus: 50,
      roomRent: 'no-limit' as const,
      copay: 0,
      waitingPeriod: preExisting ? 4 : 0,
      coverBonusPerYear: 0.50,
      rating: 4.4,
      highlights: ['No room rent limit', '50% NCB', 'Restore benefit', 'AYUSH treatment covered'],
    },
    {
      insurer: 'Care Health',
      planName: 'Care Supreme',
      premMultiplier: 0.85,
      cashless: true,
      noClaimBonus: 35,
      roomRent: 'no-limit' as const,
      copay: 0,
      waitingPeriod: preExisting ? 3 : 0,
      coverBonusPerYear: 0.35,
      rating: 4.2,
      highlights: ['Most affordable premium', 'No room rent cap', 'Unlimited restore', 'Annual health check-up'],
    },
    {
      insurer: 'Aditya Birla',
      planName: 'Activ Health Platinum',
      premMultiplier: 1.12,
      cashless: true,
      noClaimBonus: 100,
      roomRent: 'no-limit' as const,
      copay: 0,
      waitingPeriod: preExisting ? 2 : 0,
      coverBonusPerYear: 1.0,
      rating: 4.6,
      highlights: ['100% NCB — cover doubles every year', 'Chronic disease mgmt', 'Global coverage option', 'Wellness rewards program'],
    },
  ];

  const plans: HealthInsurancePlan[] = planConfigs.map((config) => {
    const rawPremium = basePremium * config.premMultiplier * cityFactor * memberFactor * preExistingLoading;
    const annualPremium = Math.round(rawPremium * gst);
    const coverAfter5Yrs = Math.round(sumInsured * (1 + config.coverBonusPerYear * 5));

    return {
      insurer: config.insurer,
      planName: config.planName,
      annualPremium,
      cashless: config.cashless,
      noClaimBonus: config.noClaimBonus,
      roomRent: config.roomRent,
      copay: config.copay,
      waitingPeriod: config.waitingPeriod,
      coverAfter5Yrs,
      rating: config.rating,
      highlights: config.highlights,
    };
  });

  // Sort by premium (ascending)
  plans.sort((a, b) => a.annualPremium - b.annualPremium);

  // Determine best value (lowest premium) and best coverage (highest NCB + no room rent limit)
  const bestValue = plans[0].insurer;
  const bestCoverage = plans.reduce((best, p) =>
    p.coverAfter5Yrs > best.coverAfter5Yrs ? p : best
  , plans[0]).insurer;

  // Expert verdict
  let expertVerdict = '';
  if (siInLakhs >= 10) {
    expertVerdict = `With ₹${siInLakhs}L coverage, you're well-protected. Focus on plans with no room rent capping and high NCB. ${bestCoverage}'s plan offers the best cover growth over time.`;
  } else if (siInLakhs >= 5) {
    expertVerdict = `₹${siInLakhs}L is a good starting point. Consider ${bestValue} for value or ${bestCoverage} for better long-term coverage. Metro cities ideally need ₹10L+.`;
  } else {
    expertVerdict = `₹${siInLakhs}L cover may be insufficient in today's medical costs. A single hospitalization can cost ₹5-10L. Consider increasing to at least ₹5L.`;
  }

  if (preExisting) {
    expertVerdict += ` Since you have pre-existing conditions, note the waiting period — ${plans.reduce((min, p) => p.waitingPeriod < min.waitingPeriod ? p : min, plans[0]).insurer} has the shortest wait.`;
  }

  return { plans, bestValue, bestCoverage, expertVerdict, inputs };
}

// ─── Life Insurance Calculator ───────────────────────────────────────────────

function getTermBasePremium(age: number, coverInCr: number, gender: 'male' | 'female', smoker: boolean): number {
  const ageFactor = age <= 25 ? 0.6 : age <= 30 ? 0.8 : age <= 35 ? 1.0 : age <= 40 ? 1.4 : age <= 45 ? 2.0 : age <= 50 ? 2.8 : 4.0;
  const genderFactor = gender === 'female' ? 0.75 : 1.0;
  const smokerFactor = smoker ? 1.5 : 1.0;
  const basePerCr = 6500; // base annual premium per crore of cover for 30y male non-smoker
  return Math.round(basePerCr * coverInCr * ageFactor * genderFactor * smokerFactor);
}

function calculateXIRR(cashflows: { amount: number; date: Date }[]): number {
  // Newton-Raphson XIRR approximation
  let rate = 0.1;
  const maxIter = 100;
  const tolerance = 0.0001;
  const d0 = cashflows[0].date.getTime();

  for (let i = 0; i < maxIter; i++) {
    let fValue = 0;
    let fDeriv = 0;
    for (const cf of cashflows) {
      const years = (cf.date.getTime() - d0) / (365.25 * 24 * 60 * 60 * 1000);
      const disc = Math.pow(1 + rate, years);
      fValue += cf.amount / disc;
      fDeriv -= (years * cf.amount) / (disc * (1 + rate));
    }
    if (Math.abs(fDeriv) < 1e-10) break;
    const newRate = rate - fValue / fDeriv;
    if (Math.abs(newRate - rate) < tolerance) {
      rate = newRate;
      break;
    }
    rate = newRate;
  }
  return Math.round(rate * 10000) / 100; // percentage with 2 decimals
}

export function calculateLifePremiums(inputs: LifeInsuranceInputs): LifeInsuranceResult {
  const { age, gender, smoker, coverAmount, policyTerm, premiumPaymentTerm } = inputs;
  const coverInCr = coverAmount / 10000000;
  const termBase = getTermBasePremium(age, coverInCr, gender, smoker);
  const gst = 1.18;
  const effectivePPT = Math.min(premiumPaymentTerm, policyTerm);

  const plans: LifeInsurancePlan[] = [];

  // ─── 1. Pure Term Plan ─────────────────────────────────────────────
  {
    const annualPremium = Math.round(termBase * gst);
    const totalPaid = annualPremium * effectivePPT;
    const taxBenefit = Math.min(annualPremium, 150000);

    plans.push({
      type: 'term',
      typeName: 'Pure Term Insurance',
      insurer: 'HDFC Life',
      planName: 'Click 2 Protect Life',
      annualPremium,
      monthlyPremium: Math.round(annualPremium / 12),
      totalPremiumPaid: totalPaid,
      deathBenefit: coverAmount,
      maturityBenefit: 0,
      effectiveReturn: -100, // no maturity benefit
      taxBenefit80C: taxBenefit,
      taxBenefit10_10D: 'Death claim 100% tax-free u/s 10(10D)',
      rating: 4.7,
      highlights: [
        'Cheapest life cover available',
        `₹${coverInCr >= 1 ? coverInCr + 'Cr' : Math.round(coverInCr * 100) + 'L'} cover at just ₹${Math.round(annualPremium / 12).toLocaleString('en-IN')}/month`,
        'Covers death + terminal illness',
        'No maturity benefit (pure protection)',
      ],
      verdict: `Best for pure protection. Lowest cost per lakh of cover. Ideal for income replacement during working years.`,
    });
  }

  // ─── 2. TROP (Term with Return of Premium) ────────────────────────
  {
    const tropMultiplier = 2.2; // TROP typically costs 2-2.5x of pure term
    const annualPremium = Math.round(termBase * tropMultiplier * gst);
    const totalPaid = annualPremium * effectivePPT;
    const maturityBenefit = totalPaid; // returns all premiums at maturity

    // XIRR calculation
    const cashflows: { amount: number; date: Date }[] = [];
    const startDate = new Date();
    for (let y = 0; y < effectivePPT; y++) {
      const d = new Date(startDate);
      d.setFullYear(d.getFullYear() + y);
      cashflows.push({ amount: -annualPremium, date: d });
    }
    const maturityDate = new Date(startDate);
    maturityDate.setFullYear(maturityDate.getFullYear() + policyTerm);
    cashflows.push({ amount: maturityBenefit, date: maturityDate });
    const xirr = calculateXIRR(cashflows);

    plans.push({
      type: 'trop',
      typeName: 'Term + Return of Premium',
      insurer: 'ICICI Prudential',
      planName: 'iProtect Return of Premium',
      annualPremium,
      monthlyPremium: Math.round(annualPremium / 12),
      totalPremiumPaid: totalPaid,
      deathBenefit: coverAmount,
      maturityBenefit,
      effectiveReturn: xirr,
      taxBenefit80C: Math.min(annualPremium, 150000),
      taxBenefit10_10D: 'Maturity + death both tax-free u/s 10(10D)',
      rating: 4.2,
      highlights: [
        'Get all premiums back on survival',
        `Death benefit: ₹${coverInCr >= 1 ? coverInCr + 'Cr' : Math.round(coverInCr * 100) + 'L'}`,
        `Maturity refund of ₹${totalPaid.toLocaleString('en-IN')}`,
        `Effective return: ${xirr}% XIRR`,
      ],
      verdict: `Good middle ground — you get coverage + money back. But XIRR of ${xirr}% is below FD rates. Money back is your own premiums, not profit.`,
    });
  }

  // ─── 3. Endowment Plan ─────────────────────────────────────────────
  {
    const endowmentMultiplier = 5.5; // endowment is much more expensive
    const annualPremium = Math.round(termBase * endowmentMultiplier * gst);
    const totalPaid = annualPremium * effectivePPT;
    // Endowment returns ~5-6% on maturity
    const assumedReturn = 0.055;
    const maturityBenefit = Math.round(annualPremium * ((Math.pow(1 + assumedReturn, policyTerm) - 1) / assumedReturn));
    const deathBenefit = Math.max(coverAmount, maturityBenefit);

    const cashflows: { amount: number; date: Date }[] = [];
    const startDate = new Date();
    for (let y = 0; y < effectivePPT; y++) {
      const d = new Date(startDate);
      d.setFullYear(d.getFullYear() + y);
      cashflows.push({ amount: -annualPremium, date: d });
    }
    const maturityDate = new Date(startDate);
    maturityDate.setFullYear(maturityDate.getFullYear() + policyTerm);
    cashflows.push({ amount: maturityBenefit, date: maturityDate });
    const xirr = calculateXIRR(cashflows);

    plans.push({
      type: 'endowment',
      typeName: 'Endowment Plan',
      insurer: 'LIC',
      planName: 'Jeevan Anand (Plan 915)',
      annualPremium,
      monthlyPremium: Math.round(annualPremium / 12),
      totalPremiumPaid: totalPaid,
      deathBenefit,
      maturityBenefit,
      effectiveReturn: xirr,
      taxBenefit80C: Math.min(annualPremium, 150000),
      taxBenefit10_10D: 'Tax-free if premium ≤10% of SA (old plans: 20%)',
      rating: 3.5,
      highlights: [
        'Guaranteed maturity benefit',
        `Maturity: ~₹${(maturityBenefit / 100000).toFixed(1)}L`,
        'Loyalty additions on long-term holding',
        'Best for conservative investors',
      ],
      verdict: `Guaranteed returns but low XIRR (~${xirr}%). Suitable only for very conservative investors. "Term + SIP" combination gives better wealth.`,
    });
  }

  // ─── 4. ULIP ───────────────────────────────────────────────────────
  {
    const ulipMultiplier = 6.0;
    const annualPremium = Math.round(termBase * ulipMultiplier * gst);
    const totalPaid = annualPremium * effectivePPT;
    // Assuming moderate equity-biased ULIP returns ~10%
    const assumedReturn = 0.10;
    // After mortality + fund management charges (effective ~8%)
    const effectiveAnnualReturn = 0.08;
    const maturityBenefit = Math.round(annualPremium * 0.95 * ((Math.pow(1 + effectiveAnnualReturn, policyTerm) - 1) / effectiveAnnualReturn));
    const deathBenefit = Math.max(coverAmount, maturityBenefit);

    const cashflows: { amount: number; date: Date }[] = [];
    const startDate = new Date();
    for (let y = 0; y < effectivePPT; y++) {
      const d = new Date(startDate);
      d.setFullYear(d.getFullYear() + y);
      cashflows.push({ amount: -annualPremium, date: d });
    }
    const maturityDate = new Date(startDate);
    maturityDate.setFullYear(maturityDate.getFullYear() + policyTerm);
    cashflows.push({ amount: maturityBenefit, date: maturityDate });
    const xirr = calculateXIRR(cashflows);

    plans.push({
      type: 'ulip',
      typeName: 'ULIP (Market-Linked)',
      insurer: 'Max Life',
      planName: 'Online Savings Plan',
      annualPremium,
      monthlyPremium: Math.round(annualPremium / 12),
      totalPremiumPaid: totalPaid,
      deathBenefit,
      maturityBenefit,
      effectiveReturn: xirr,
      taxBenefit80C: Math.min(annualPremium, 150000),
      taxBenefit10_10D: 'Tax-free if annual premium ≤₹2.5L',
      rating: 3.8,
      highlights: [
        'Market-linked returns (equity/debt)',
        `Estimated maturity: ~₹${(maturityBenefit / 100000).toFixed(1)}L`,
        'Fund switching flexibility',
        '5-year lock-in period',
      ],
      verdict: `Returns depend on market performance. High charges in early years eat into returns. "Term + Mutual Fund" is almost always better.`,
    });
  }

  // Sort by annual premium
  plans.sort((a, b) => a.annualPremium - b.annualPremium);

  const cheapestPlan = plans[0];
  const highestCoverPlan = plans.reduce((best, p) => p.deathBenefit > best.deathBenefit ? p : best, plans[0]);
  const bestReturnPlan = plans.filter(p => p.effectiveReturn > 0).reduce((best, p) => p.effectiveReturn > best.effectiveReturn ? p : best, plans.filter(p => p.effectiveReturn > 0)[0] || plans[0]);

  const expertVerdict = `For pure protection, ${plans.find(p => p.type === 'term')?.insurer}'s term plan is unbeatable at ₹${plans.find(p => p.type === 'term')?.monthlyPremium?.toLocaleString('en-IN')}/month. TROP "feels safe" but gives only ~${plans.find(p => p.type === 'trop')?.effectiveReturn}% XIRR. The golden rule: "Buy Term, Invest the Rest" in mutual funds — this outperforms endowment & ULIP in >90% of scenarios over 15+ years.`;

  return {
    plans,
    bestForProtection: plans.find(p => p.type === 'term')?.insurer || '',
    bestForReturns: bestReturnPlan?.insurer || '',
    expertVerdict,
    inputs,
    comparisonSummary: {
      cheapest: cheapestPlan.typeName,
      highestCover: highestCoverPlan.typeName,
      bestReturn: bestReturnPlan?.typeName || 'N/A',
      recommendation: 'Term Insurance + SIP/Mutual Funds',
    },
  };
}
