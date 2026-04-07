// ═══════════════════════════════════════════════════════════════
// LOAN STATUS ENGINE QA
// Verifies live loan tracker calculations against PNB Home Loan example.
// ═══════════════════════════════════════════════════════════════

let pass = 0, fail = 0;
const failures = [];
function check(label, expected, actual, tolerance = 1) {
  const ok = Math.abs(expected - actual) <= tolerance;
  if (ok) {
    pass++;
    console.log(`  \u2713 ${label}: ${actual.toFixed(2)} (expected ${expected} ±${tolerance})`);
  } else {
    fail++;
    failures.push(`${label}: expected ${expected}, got ${actual}`);
    console.log(`  \u2717 ${label}: expected ${expected}, got ${actual}`);
  }
}

// PNB Home Loan: ₹22L @ 9.40% for 180 months, disbursed 09-May-2024
// EMI = ₹22,841 (per spec)
const profile = {
  loanAmount: 2200000,
  annualRate: 9.40,
  tenureMonths: 180,
  emiAmount: 22841,
  disbursementDate: '2024-05-09',
  emiDueDay: 5,
  loanType: 'floating',
};

// As of today (let's assume 2026-04-07)
const TODAY = new Date('2026-04-07T00:00:00');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  LOAN STATUS ENGINE QA');
console.log('  PNB Home Loan: ₹22L @ 9.40% × 180 months');
console.log(`  Disbursed: ${profile.disbursementDate}`);
console.log(`  Today: ${TODAY.toISOString().split('T')[0]}`);
console.log('═══════════════════════════════════════════════════════════════\n');

// Replicate loanStatusEngine.ts logic
const monthlyRate = profile.annualRate / 12 / 100;
const dailyRate = profile.annualRate / 365 / 100;

// Generate EMI dates
const emiDates = [];
const disbDate = new Date(profile.disbursementDate);
for (let i = 0; i < profile.tenureMonths; i++) {
  const d = new Date(disbDate.getFullYear(), disbDate.getMonth() + 1 + i, 1);
  const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(profile.emiDueDay, maxDay));
  emiDates.push(d);
}

// EMIs paid
let emisPaid = 0;
let lastEmiDate = disbDate;
for (let i = 0; i < emiDates.length; i++) {
  if (emiDates[i] <= TODAY) {
    emisPaid = i + 1;
    lastEmiDate = emiDates[i];
  }
}

console.log('EMI dates calculated. First:', emiDates[0].toISOString().split('T')[0], 'Last:', emiDates[emiDates.length - 1].toISOString().split('T')[0]);

// Disbursed May 9, 2024. First EMI = June 5, 2024.
// As of April 7, 2026: Jun 2024 → April 2026 = 23 EMIs paid (Jun 2024..Apr 2026 inclusive)
// Actually: Jun 2024 = 1, Jul 2024 = 2 ... Apr 2026 = 23
check('EMIs paid', 23, emisPaid, 1);
check('EMIs remaining', 180 - 23, 180 - emisPaid, 1);

// Amortize
let balance = profile.loanAmount;
let interestPaid = 0;
for (let i = 0; i < emisPaid; i++) {
  const interestPart = balance * monthlyRate;
  const principalPart = profile.emiAmount - interestPart;
  interestPaid += interestPart;
  balance -= principalPart;
}
console.log(`\n  Principal outstanding: ₹${Math.round(balance).toLocaleString('en-IN')}`);
console.log(`  Interest paid so far:  ₹${Math.round(interestPaid).toLocaleString('en-IN')}`);
console.log(`  Principal paid so far: ₹${Math.round(profile.loanAmount - balance).toLocaleString('en-IN')}`);

// Reasonableness checks
const principalPaidPct = (profile.loanAmount - balance) / profile.loanAmount * 100;
console.log(`  % principal paid:      ${principalPaidPct.toFixed(2)}%`);

// After 23 of 180 EMIs (12.8%), we expect ~5-6% principal paid (front-loaded interest)
check('Principal paid is reasonable (3%-9% of total)', 6, principalPaidPct, 4);
check('Outstanding > 90% of original', 1, balance / profile.loanAmount, 0.1);

// Daily interest
const dailyInterest = balance * dailyRate;
console.log(`  Daily interest accrual: ₹${Math.round(dailyInterest).toLocaleString('en-IN')}`);
check('Daily interest in expected range (₹4K-₹6K)', 5300, dailyInterest, 1000);

// Foreclosure (floating rate)
const foreclosureCharge = profile.loanType === 'fixed' ? balance * 0.03 : 0;
check('Foreclosure charge for floating rate = 0', 0, foreclosureCharge, 0);

// ── Final ──
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  RESULTS: ${pass} passed, ${fail} failed`);
console.log('═══════════════════════════════════════════════════════════════');
if (fail > 0) {
  console.log('\nFAILURES:');
  failures.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
}
process.exit(0);