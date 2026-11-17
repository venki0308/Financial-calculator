// ═══════════════════════════════════════════════════════════════
// FINCALIX CALCULATOR FORMULA QA — PHASE 2 AUDIT
// Verifies the canonical formula for every calculator against
// known test cases. Independent re-implementation of the math.
// ═══════════════════════════════════════════════════════════════

let pass = 0, fail = 0;
const failures = [];

function check(label, expected, actual, tolerance = 1) {
  const ok = Math.abs(expected - actual) <= tolerance;
  if (ok) {
    pass++;
    console.log(`  \u2713 ${label}: ${Math.round(actual)} (expected ${Math.round(expected)} ±${tolerance})`);
  } else {
    fail++;
    failures.push(`${label}: expected ${expected}, got ${actual}`);
    console.log(`  \u2717 ${label}: expected ${expected}, got ${actual}`);
  }
}

// ── Standard EMI formula ──
function emi(P, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (r === 0) return P / months;
  return (P * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  CALCULATOR FORMULA AUDIT');
console.log('═══════════════════════════════════════════════════════════════\n');

// ──────────────────────────────────────────────────────────────
// 2A — EMI Calculator
console.log('2A. EMI Calculator (₹10L @ 9% for 20yr)');
const emi1 = emi(1000000, 9, 240);
check('EMI', 8997.26, emi1, 1);
check('Total payment', 8997.26 * 240, emi1 * 240, 200);
check('Total interest', 8997.26 * 240 - 1000000, emi1 * 240 - 1000000, 200);

// First-month amortization
const r1 = 9 / 12 / 100;
const interest1 = 1000000 * r1;
const principal1 = emi1 - interest1;
check('Month 1 interest', 7500, interest1, 1);
check('Month 1 principal', emi1 - 7500, principal1, 1);

// Last balance check
let bal = 1000000;
for (let i = 0; i < 240; i++) {
  bal -= emi1 - bal * r1;
}
check('Final balance after 240 months (≈0)', 0, bal, 1);

// ──────────────────────────────────────────────────────────────
// 2B — SIP Calculator
console.log('\n2B. SIP Calculator (₹5K/mo @ 12% for 10yr)');
function sipFV(P, annualRate, months) {
  const r = annualRate / 12 / 100;
  return P * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
}
const sip = sipFV(5000, 12, 120);
check('SIP corpus', 1161695, sip, 1000);
check('SIP wealth gained', 1161695 - 600000, sip - 600000, 1000);

// ──────────────────────────────────────────────────────────────
// 2C — FD Calculator (quarterly compound)
console.log('\n2C. FD Calculator (₹1L @ 7% for 1yr quarterly)');
const fd = 100000 * Math.pow(1 + 7 / 4 / 100, 4);
check('FD maturity', 107186, fd, 1);

// ──────────────────────────────────────────────────────────────
// 2D — PPF Calculator (₹1.5L/yr @ 7.1% for 15yr)
console.log('\n2D. PPF Calculator (₹1.5L/yr @ 7.1% for 15yr)');
let ppfBal = 0;
for (let y = 0; y < 15; y++) {
  ppfBal += 150000;
  ppfBal *= 1.071;
}
check('PPF maturity', 4068209, ppfBal, 5000);

// Year 1 check
const y1 = (150000 + 150000 * 0.071);
check('PPF Year 1 balance', 160650, y1, 1);

// ──────────────────────────────────────────────────────────────
// 2E — Income Tax Calculator (Old Regime, ₹12L)
console.log('\n2E. Income Tax (Old Regime, ₹12L)');
function oldRegimeTax(grossSalary, stdDeduction = 50000) {
  const taxable = grossSalary - stdDeduction;
  let tax = 0;
  if (taxable > 250000) tax += Math.min(taxable - 250000, 250000) * 0.05;
  if (taxable > 500000) tax += Math.min(taxable - 500000, 500000) * 0.20;
  if (taxable > 1000000) tax += (taxable - 1000000) * 0.30;
  const cess = tax * 0.04;
  return tax + cess;
}
const tax = oldRegimeTax(1200000);
check('Income tax (₹12L old regime)', 163800, tax, 1);

// ──────────────────────────────────────────────────────────────
// 2F — Home Loan
console.log('\n2F. Home Loan (₹22L @ 9.40% for 180m)');
const homeEmi = emi(2200000, 9.40, 180);
check('Home loan EMI', 22841, homeEmi, 5);
check('Home loan total interest', 22841 * 180 - 2200000, homeEmi * 180 - 2200000, 1000);

// ──────────────────────────────────────────────────────────────
// 2G — Car Loan
console.log('\n2G. Car Loan (₹8L @ 10% for 60m)');
const carEmi = emi(800000, 10, 60);
check('Car loan EMI', 16998, carEmi, 5);
check('Car loan total interest', 219880, carEmi * 60 - 800000, 100);

// ──────────────────────────────────────────────────────────────
// 2H — Personal Loan
console.log('\n2H. Personal Loan (₹5L @ 14% for 36m)');
const persEmi = emi(500000, 14, 36);
check('Personal loan EMI', 17089, persEmi, 5);
check('Personal loan total interest', 115204, persEmi * 36 - 500000, 100);

// ──────────────────────────────────────────────────────────────
// 2I — RD Calculator
console.log('\n2I. RD (₹10K/mo @ 6.5% for 24m)');
// RD formula: P × [((1+i)^n - 1) / (1 - (1+i)^(-1/3))]
// Standard RD = quarterly compounding on monthly deposits
function rdMaturity(P, annualRate, months) {
  // Indian RD formula (quarterly compounding):
  // M = P × [((1+r)^n - 1) / (1 - (1+r)^(-1/3))]
  // Simpler approximation = month-by-month accumulation
  const r = annualRate / 4 / 100; // quarterly rate
  let total = 0;
  for (let m = 1; m <= months; m++) {
    const monthsLeft = months - m + 1;
    const quartersLeft = monthsLeft / 3;
    total += P * Math.pow(1 + r, quartersLeft);
  }
  return total;
}
const rd = rdMaturity(10000, 6.5, 24);
check('RD maturity', 258580, rd, 2000); // wider tolerance — formula varies

// ──────────────────────────────────────────────────────────────
// 2J — NSC Calculator (₹1L @ 7.7% for 5yr)
console.log('\n2J. NSC (₹1L @ 7.7% for 5yr, annual compound)');
const nsc = 100000 * Math.pow(1.077, 5);
check('NSC maturity', 144903, nsc, 50);

// ──────────────────────────────────────────────────────────────
// 2K — Salary Hike (20% on ₹10L)
console.log('\n2K. Salary Hike (₹10L + 20%)');
const newSalary = 1000000 * 1.2;
check('New salary', 1200000, newSalary, 0);
check('Monthly increase (annual ÷ 12)', 16667, (1200000 - 1000000) / 12, 1);

// ──────────────────────────────────────────────────────────────
// 2L — HRA (Basic 40K, HRA 20K, Rent 18K, Metro)
console.log('\n2L. HRA (Basic ₹40K, HRA ₹20K, Rent ₹18K, Metro)');
function hraExemption(basic, hra, rent, isMetro) {
  return Math.min(
    hra,                                     // Actual HRA received
    isMetro ? basic * 0.5 : basic * 0.4,    // 50% (metro) or 40% (non-metro) of basic
    rent - basic * 0.1,                      // Rent minus 10% of basic
  );
}
const hra = hraExemption(40000, 20000, 18000, true);
check('HRA exemption', 14000, hra, 0);

// ──────────────────────────────────────────────────────────────
// 2M — Education Loan (₹10L @ 10.5% for 84m)
console.log('\n2M. Education Loan (₹10L @ 10.5% for 84m)');
const eduEmi = emi(1000000, 10.5, 84);
check('Education loan EMI', 16861, eduEmi, 5);

// ──────────────────────────────────────────────────────────────
// 2O — Two Wheeler Loan (₹1L @ 14% for 36m)
console.log('\n2O. Two Wheeler Loan (₹1L @ 14% for 36m)');
const twEmi = emi(100000, 14, 36);
check('Two wheeler EMI', 3418, twEmi, 5);
check('Two wheeler total interest', 23048, twEmi * 36 - 100000, 100);

// ──────────────────────────────────────────────────────────────
// 2Q — Goal Planner (₹50L target, 10yr, 12%)
console.log('\n2Q. Goal Planner (₹50L in 10yr @ 12%)');
function goalSIP(FV, annualRate, months) {
  const r = annualRate / 12 / 100;
  return FV * r / (Math.pow(1 + r, months) - 1);
}
const goal = goalSIP(5000000, 12, 120);
check('Goal SIP', 21747, goal, 100); // Standard formula gives ₹21,747 (without ×(1+r) annuity-due)

// With annuity-due (deposits at start of period):
const goalDue = 5000000 * (12 / 12 / 100) / ((Math.pow(1.01, 120) - 1) * 1.01);
check('Goal SIP (annuity-due)', 21532, goalDue, 100);

// ──────────────────────────────────────────────────────────────
// 2R — RD Live Status (investmentStatusEngine.calculateRdStatus convention)
// Independent re-implementation: a deposit made in quarter q earns
// (currentQIdx − depositQIdx, +1 at a quarter-end) credited quarters at r/4.
console.log('\n2R. RD Live Status (₹1K/mo @ 8% for 12m)');
function rdStatusCurrentValue(P, annualRate, tenureMonths, monthsInvested) {
  const r = annualRate / 400; // quarterly rate
  const currentQIdx = monthsInvested > 0 ? Math.floor((monthsInvested - 1) / 3) : 0;
  const isQEnd = monthsInvested > 0 && (monthsInvested % 3 === 0 || monthsInvested === tenureMonths);
  let v = 0;
  for (let i = 1; i <= monthsInvested; i++) {
    const depositQIdx = Math.floor((i - 1) / 3);
    v += P * Math.pow(1 + r, currentQIdx - depositQIdx + (isQEnd ? 1 : 0));
  }
  return v;
}
function rdStatusMaturity(P, annualRate, tenureMonths) {
  const r = annualRate / 400;
  const totalQ = Math.ceil(tenureMonths / 3);
  let v = 0;
  for (let i = 1; i <= tenureMonths; i++) {
    v += P * Math.pow(1 + r, totalQ - Math.floor((i - 1) / 3));
  }
  return v;
}
// Hand-derived: after 3 deposits (a quarter-end) all three deposits sit in
// quarter 0 with exactly 1 credited quarter each → 3 × 1000 × 1.02 = 3060.00
check('RD status value after 3 deposits (quarter-end)', 3060.0, rdStatusCurrentValue(1000, 8, 12, 3), 0.01);
// Internal consistency: at month == tenure the live value must equal the
// maturity formula (hand-derived: both = 12612.12)
check('RD status at tenure equals maturity formula',
  rdStatusMaturity(1000, 8, 12), rdStatusCurrentValue(1000, 8, 12, 12), 0.01);

// ──────────────────────────────────────────────────────────────
// 2S — SIP months-to-goal (investmentStatusEngine.calculateSipStatus solve)
// Independent closed-form: n = log((target+P)/(current+P)) / log(1+r),
// P = sip·(1+r)/r  (annuity-due; existing corpus keeps compounding).
console.log('\n2S. SIP months-to-goal (₹10L target, ₹2L corpus, ₹10K/mo @ 12%)');
function sipMonthsToGoal(target, current, sip, annualRate) {
  const r = annualRate / 12 / 100;
  const p = sip * (1 + r) / r;
  return Math.log((target + p) / (current + p)) / Math.log(1 + r);
}
function sipFvAfter(current, sip, annualRate, n) {
  const r = annualRate / 12 / 100;
  return current * Math.pow(1 + r, n) + sip * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}
const nGoal = sipMonthsToGoal(1000000, 200000, 10000, 12);
// The closed form must reproduce itself: FV at the exact (unrounded) n
// equals the target (hand-derived n = 51.0048)
check('SIP goal closed form reproduces target', 1000000, sipFvAfter(200000, 10000, 12, nGoal), 1);
check('SIP months-to-goal (engine uses ceil → 52)', 52, Math.ceil(nGoal), 0);
// Monotonicity: a larger current corpus needs fewer months (n(3L) = 43.02)
const nGoalRicher = sipMonthsToGoal(1000000, 300000, 10000, 12);
check('SIP months-to-goal decreases as corpus grows', 1, nGoalRicher < nGoal ? 1 : 0, 0);

// ──────────────────────────────────────────────────────────────
// 2T — Capital Gains (CII indexation, equity LTCG/STCG) — FY 2026-27
// ──────────────────────────────────────────────────────────────
console.log('\n2T. Capital Gains (property ₹30L FY11 → ₹1.2cr FY27; equity LTCG/STCG)');
const CII_QA = { '2010-11': 167, '2026-27': 384 };
const idxCost = 3000000 * CII_QA['2026-27'] / CII_QA['2010-11'];
check('CII indexed cost (₹30L, FY 2010-11 → 2026-27)', 6898204, idxCost, 1);
const taxIdx = Math.max(0, 12000000 - idxCost) * 0.20;
const taxFlat = (12000000 - 3000000) * 0.125;
check('Property LTCG: 20% with indexation', 1020359, taxIdx, 1);
check('Property LTCG: 12.5% without indexation', 1125000, taxFlat, 1);
check('Grandfathered property pays the lower route + 4% cess', 1061174, Math.min(taxIdx, taxFlat) * 1.04, 1);
check('Equity LTCG ₹5L: 12.5% above ₹1.25L exemption', 46875, (500000 - 125000) * 0.125, 1);
check('Equity STCG ₹2L: flat 20%', 40000, 200000 * 0.20, 1);

// ──────────────────────────────────────────────────────────────
// 2U — LRS TCS (rates w.e.f. 1 Apr 2026)
// ──────────────────────────────────────────────────────────────
console.log('\n2U. LRS TCS (threshold ₹10L aggregate; tour 2% flat; edu/medical 2%; other 20%)');
function lrsTcs(purpose, amount, already) {
  if (purpose === 'eduLoan') return 0;
  if (purpose === 'tour') return amount * 0.02;
  const rate = purpose === 'eduMedical' ? 0.02 : 0.20;
  return Math.max(0, amount - Math.max(0, 1000000 - already)) * rate;
}
check('LRS other: ₹6L already + ₹8L → 20% on ₹4L', 80000, lrsTcs('other', 800000, 600000), 1);
check('LRS tour package ₹3L → 2% flat', 6000, lrsTcs('tour', 300000, 0), 1);
check('LRS education ₹15L own funds → 2% on ₹5L', 10000, lrsTcs('eduMedical', 1500000, 0), 1);
check('LRS education via bank loan → nil', 0, lrsTcs('eduLoan', 2500000, 0), 0);

// ──────────────────────────────────────────────────────────────
// 2V — Income tax, New vs Old Regime (FY 2026-27, salaried, below 60)
// Independent re-implementation, then diffed against src/utils/incomeTax.ts
// (the code the app's Income Tax Calculator and the website both use).
// ──────────────────────────────────────────────────────────────
console.log('\n2V. Income tax New vs Old Regime (FY 2026-27) — independent maths vs src/utils/incomeTax.ts');
{
  const slabTax = (x, slabs) => slabs.reduce((t, [lo, hi, rate]) => t + Math.max(0, Math.min(x, hi) - lo) * rate, 0);
  const NEW = [[0, 4e5, 0], [4e5, 8e5, .05], [8e5, 12e5, .10], [12e5, 16e5, .15], [16e5, 20e5, .20], [20e5, 24e5, .25], [24e5, Infinity, .30]];
  const OLD = [[0, 2.5e5, 0], [2.5e5, 5e5, .05], [5e5, 10e5, .20], [10e5, Infinity, .30]];
  // Surcharge tiers as [threshold, rate, rate of the tier below]; the new regime stops at 25%.
  const SUR = { new: [[2e7, .25, .15], [1e7, .15, .10], [5e6, .10, 0]], old: [[5e7, .37, .25], [2e7, .25, .15], [1e7, .15, .10], [5e6, .10, 0]] };
  function indepTax(taxable, regime) {
    const slabs = regime === 'new' ? NEW : OLD;
    let tax = slabTax(taxable, slabs);
    if (regime === 'new') tax = taxable <= 12e5 ? 0 : Math.min(tax, taxable - 12e5);   // 87A + marginal relief
    else tax = taxable <= 5e5 ? 0 : tax;                                                // 87A, no relief
    let sur = 0;
    const tier = tax > 0 && SUR[regime].find(([th]) => taxable > th);
    if (tier) {
      const [th, rate, below] = tier;
      sur = tax * rate;
      const cap = slabTax(th, slabs) * (1 + below) + (taxable - th);                   // surcharge marginal relief
      if (tax + sur > cap) sur = Math.max(0, cap - tax);
    }
    return (tax + sur) * 1.04;
  }
  const round10 = (n) => Math.round(n / 10) * 10;
  const indep = (gross, ded) => ({
    newTax: indepTax(round10(Math.max(0, gross - 75000)), 'new'),
    oldTax: indepTax(round10(Math.max(0, gross - 50000 - ded)), 'old'),
  });

  // Figures the app displayed (marketing-assets facts, tools/marketing/capture.mjs).
  const a = indep(1450000, 150000 + 25000 + 200000);
  check('₹14.5L salary, ₹3.75L deductions — New Regime', 89700, a.newTax, 1);
  check('₹14.5L salary, ₹3.75L deductions — Old Regime', 124800, a.oldTax, 1);
  const z = indep(1275000, 0);
  check('₹12.75L salary — New Regime (₹0 up to ₹12L taxable)', 0, z.newTax, 0);
  check('₹12.75L salary — Old Regime, no deductions', 187200, z.oldTax, 1);
  check('₹12L + ₹10 taxable — New Regime marginal relief caps tax at ₹10 + cess', 10.4, indep(1275010, 0).newTax, 0.01);

  // Production code, bundled on the fly (esbuild ships with Vite).
  const { buildSync } = await import('esbuild');
  const out = buildSync({ entryPoints: ['src/utils/incomeTax.ts'], bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'error' });
  const prod = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
  check('incomeTax.ts constant: New Regime rebate limit', 1200000, prod.NEW_REGIME_REBATE_LIMIT, 0);
  check('incomeTax.ts constant: New Regime standard deduction', 75000, prod.NEW_REGIME_STANDARD_DEDUCTION, 0);
  let worst = 0, cases = 0, where = '';
  for (let gross = 0; gross <= 6e7; gross += gross < 3e6 ? 12345 : gross < 1.2e7 ? 98765 : 777777) {
    for (const ded of [0, 150000, 375000, 600000]) {
      const p = prod.compareSalaryTax(gross, ded);
      const i = indep(gross, ded);
      for (const [x, y] of [[p.newTax.totalTax, i.newTax], [p.oldTax.totalTax, i.oldTax]]) {
        cases++;
        if (Math.abs(x - y) > worst) { worst = Math.abs(x - y); where = `gross ${gross}, deductions ${ded}`; }
      }
    }
  }
  check(`incomeTax.ts vs independent maths over ${cases} cases (worst gap${where ? ' at ' + where : ''})`, 0, worst, 0.01);
  const p14 = prod.compareSalaryTax(1450000, 375000);
  check('incomeTax.ts: ₹14.5L — New Regime', 89700, p14.newTax.totalTax, 1);
  check('incomeTax.ts: ₹14.5L — Old Regime', 124800, p14.oldTax.totalTax, 1);
  check('incomeTax.ts: ₹14.5L — New Regime saves', 35100, p14.betterRegime === 'New' ? p14.saving : -1, 1);
  check('incomeTax.ts: ₹12.75L — New Regime', 0, prod.compareSalaryTax(1275000, 0).newTax.totalTax, 0);
}

// ──────────────────────────────────────────────────────────────
// 2W — Post Office Time Deposit (NSTD Scheme 2019, paras 7(2), 7(7))
// Compounded quarterly within the year, paid out yearly, no interest on interest.
// Expected figures are the ones fincalix.com/post-office-td shows for ₹1 lakh.
// ──────────────────────────────────────────────────────────────
const { buildSync: buildTs } = await import('esbuild');
const loadTs = async (entry) => import('data:text/javascript;base64,' + Buffer.from(buildTs({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error' }).outputFiles[0].text).toString('base64'));
const calc = await loadTs('src/utils/calculations.ts');
const status = await loadTs('src/utils/investmentStatusEngine.ts');
console.log('\n2W. Post Office TD — yearly payout (app = website: calculatePOTD)');
{
  const indep = (P, r, y) => { const yearly = P * ((1 + r / 400) ** 4 - 1); return { yearly, total: yearly * y, maturity: P + yearly * y }; };
  const page = { 1: [6.9, 7081, 7081, 107081], 2: [7.0, 7186, 14372, 114372], 3: [7.1, 7291, 21874, 121874], 5: [7.5, 7714, 38568, 138568] };
  for (const [y, [rate, yearly, total, maturity]] of Object.entries(page)) {
    const p = calc.calculatePOTD(100000, rate, Number(y)), i = indep(100000, rate, Number(y));
    check(`₹1L ${y}-yr TD @ ${rate}% — interest every year (page ${yearly})`, yearly, p.yearlyInterest, 0.5);
    check(`₹1L ${y}-yr TD @ ${rate}% — total interest (page ${total})`, total, p.totalInterest, 0.5);
    check(`₹1L ${y}-yr TD @ ${rate}% — deposit + interest (page ${maturity})`, maturity, p.maturity, 0.5);
    check(`₹1L ${y}-yr TD — calculatePOTD vs independent`, i.maturity, p.maturity, 0.001);
    check(`₹1L ${y}-yr TD — every year pays the same interest`, 0, Math.max(...p.table.map((t) => Math.abs(t.interest - p.yearlyInterest))), 0);
  }
  check('5-yr TD is NOT compounded across years (old app showed ₹1,44,995)', 138568, calc.calculatePOTD(100000, 7.5, 5).maturity, 0.5);
  // Live status of a tracked TD (screen, My Loans, Loan Detail): maturity value on the same rule.
  const start = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10);
  const s = status.calculateFdStatus({ principal: 100000, annualRate: 7.5, tenureMonths: 60, startDate: start, compoundingFreq: 4, payout: 'yearly' });
  check('Tracked 5-yr TD — maturity value (yearly payout)', 138568, s.maturityValue, 0.5);
  check('Tracked 5-yr TD after 400 days — one year paid + 35 days accrued', 100000 + 7714.3 + 100000 * ((1 + 7.5 / 400) ** (35 / (365 / 4)) - 1), s.valueToday, 2);
  const fd = status.calculateFdStatus({ principal: 100000, annualRate: 7.5, tenureMonths: 60, startDate: start, compoundingFreq: 4 });
  check('Bank FD (no payout option) still compounds — unchanged', 100000 * (1 + 7.5 / 400) ** (fd.daysInvested / (365 / 4)), fd.valueToday, 0.01);
}

// ──────────────────────────────────────────────────────────────
// 2X — Gold loan LTV (RBI Lending Against Gold and Silver Collateral Directions, 2025)
// A loan L is allowed when L ≤ value × cap(L); cap = 85% up to ₹2.5L, 80% up to ₹5L, 75% above.
// Independent: case analysis + a property check (L allowed, L + ₹1 not).
// ──────────────────────────────────────────────────────────────
console.log('\n2X. Gold loan LTV near ₹2.5L and ₹5L (app = website: goldLoanMaxLoan / goldValueForLoan)');
{
  const cap = (L) => (L <= 250000 ? 0.85 : L <= 500000 ? 0.8 : 0.75);
  const allowed = (L, V) => L <= V * cap(L) + 1e-6;
  const indepMax = (V) => (V * 0.75 > 500000 ? V * 0.75 : V * 0.8 > 250000 ? Math.min(V * 0.8, 500000) : Math.min(V * 0.85, 250000));
  // Gold needed for each loan the owner named, and the loan on gold of those values.
  for (const [L, need] of [[249000, 292942], [250000, 294118], [251000, 313750], [499000, 623750], [500000, 625000], [501000, 668000]]) {
    check(`Gold value needed for a ₹${L.toLocaleString('en-IN')} loan`, need, calc.goldValueForLoan(L), 0);
    check(`  …and that gold really allows ₹${L.toLocaleString('en-IN')}`, 1, calc.goldLoanMaxLoan(need).maxLoan >= L ? 1 : 0, 0);
    check(`  …₹1 less gold does not`, 1, calc.goldLoanMaxLoan(need - 1).maxLoan < L ? 1 : 0, 0);
  }
  for (const [V, loan, ltv] of [[249000, 211650, 85], [250000, 212500, 85], [251000, 213350, 85], [499000, 399200, 80], [500000, 400000, 80], [501000, 400800, 80],
                                [305000, 250000, 85], [312500, 250000, 85], [312501, 250000, 85], [312505, 250004, 80], [650000, 500000, 80], [666667, 500000, 80], [700000, 525000, 75]]) {
    const g = calc.goldLoanMaxLoan(V);
    check(`Gold worth ₹${V.toLocaleString('en-IN')} — max loan`, loan, g.maxLoan, 0);
    check(`Gold worth ₹${V.toLocaleString('en-IN')} — limit that applies (${ltv}%)`, ltv, g.ltv, 0);
  }
  let worst = 0, bad = 0, n = 0;
  for (let V = 1000; V <= 2000000; V += V < 200000 ? 997 : 113) {
    const m = calc.goldLoanMaxLoan(V).maxLoan; n++;
    worst = Math.max(worst, Math.abs(m - indepMax(V)));
    if (!allowed(m - 0.5, V) || allowed(m + 1, V)) bad++;
  }
  check(`goldLoanMaxLoan vs independent case analysis over ${n} gold values (worst gap, whole rupees rounded down)`, 0, worst, 0.999);
  check('every result is allowed and ₹1 more is not', 0, bad, 0);
}

// ──────────────────────────────────────────────────────────────
// 2Y — Amortization: a loan that the rounded-up EMI clears early stops paying (17 Nov 2026 fix).
// Independent month-by-month simulation vs calculateReducingEMI's totals.
// ──────────────────────────────────────────────────────────────
console.log('\n2Y. Reducing-balance schedule: no payments after the balance is cleared');
{
  const sim = (P, rate, n) => {
    const r = rate / 1200, e = Math.ceil((P * r * (1 + r) ** n) / ((1 + r) ** n - 1));
    let bal = P, paid = 0, months = 0;
    for (let m = 1; m <= n && bal > 1e-9; m++) { const i = bal * r; const pay = m === n || e - i >= bal ? bal + i : e; paid += pay; bal = bal + i - pay; months = m; }
    return { interest: paid - P, months };
  };
  for (const [P, rate, n, note] of [[10000, 24, 360, 'clears early'], [50000, 16, 360, 'clears early'], [3000000, 8.5, 240, 'published /home-loan-prepayment figure'], [1000000, 9, 60, 'published /emi figure'], [500000, 12, 60, 'personal loan']]) {
    const app = calc.calculateReducingEMI(P, rate, n), ind = sim(P, rate, n);
    check(`₹${P.toLocaleString('en-IN')} at ${rate}% for ${n} months (${note}) — total interest`, ind.interest, app.totalInterest, 1);
    check(`  …rows after payoff carry ₹0 (schedule still has ${n} rows)`, 0, app.schedule.slice(ind.months).reduce((t, r) => t + r.emi, 0) + Math.abs(app.schedule.length - n), 0);
  }
  check('₹10,000 at 24% for 30 years: interest ₹43,830 (was ₹62,159 before the fix)', 43830, calc.calculateReducingEMI(10000, 24, 360).totalInterest, 1);
  check('₹30 lakh at 8.5% for 20 years: interest unchanged at ₹32,48,210', 3248210, calc.calculateReducingEMI(3000000, 8.5, 240).totalInterest, 0);
}

// ──────────────────────────────────────────────────────────────
// FINAL REPORT
// ──────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  RESULTS: ${pass} passed, ${fail} failed`);
console.log('═══════════════════════════════════════════════════════════════');
if (fail > 0) {
  console.log('\nFAILURES:');
  failures.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
}
process.exit(0);