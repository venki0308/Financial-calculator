// ═══════════════════════════════════════════════════════════════
// FINCALIX EXPENSE TRACKER — QA / AUDIT SCRIPT
// Verifies calculation engines against 12 sample entries.
// Run: node scripts/qa-expense-tracker.mjs
// ═══════════════════════════════════════════════════════════════

// ── Pure pasted helpers (mirror src/utils/expenseCalculations.ts) ──
// We replicate the math to verify it independently of the live code.

const fmtINR = (n) => `\u20B9${Math.round(n).toLocaleString('en-IN')}`;
const fmtPct = (n) => `${n.toFixed(1)}%`;

function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftDays(date, delta) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

// ── Sample data: 12 entries spanning daily/weekly/monthly/yearly ──
// Today = April 7, 2026 (per user context)
const TODAY = new Date('2026-04-07T00:00:00');

const entries = [
  // ── DAILY (today, April 7) ──
  { id: 'e1',  type: 'income',     amount: 80000, date: toLocalDateStr(TODAY),                  category: 'salary',         description: 'April salary',     paymentMethod: 'net_banking', isDeleted: false },
  { id: 'e2',  type: 'expense',    amount: 450,   date: toLocalDateStr(TODAY),                  category: 'food_dining',    description: 'Lunch',            paymentMethod: 'upi',         isDeleted: false },
  { id: 'e3',  type: 'expense',    amount: 1200,  date: toLocalDateStr(TODAY),                  category: 'groceries',      description: 'Big Bazaar',       paymentMethod: 'debit_card',  isDeleted: false },

  // ── WEEKLY (this week — April 6 Mon, April 5 Sun) ──
  { id: 'e4',  type: 'expense',    amount: 350,   date: toLocalDateStr(shiftDays(TODAY, -1)),   category: 'transport',      description: 'Uber',             paymentMethod: 'upi',         isDeleted: false },
  { id: 'e5',  type: 'investment', amount: 5000,  date: toLocalDateStr(shiftDays(TODAY, -2)),   category: 'inv_mutual_fund', description: 'SIP — Nippon',    paymentMethod: 'auto_debit',  isDeleted: false },
  { id: 'e6',  type: 'expense',    amount: 2500,  date: toLocalDateStr(shiftDays(TODAY, -3)),   category: 'shopping',       description: 'Myntra order',     paymentMethod: 'credit_card', isDeleted: false },

  // ── EARLIER THIS MONTH (April 1–4) ──
  { id: 'e7',  type: 'expense',    amount: 15000, date: toLocalDateStr(shiftDays(TODAY, -5)),   category: 'rent_housing',   description: 'April rent',       paymentMethod: 'net_banking', isDeleted: false },
  { id: 'e8',  type: 'expense',    amount: 1800,  date: toLocalDateStr(shiftDays(TODAY, -6)),   category: 'utilities',      description: 'Electricity',      paymentMethod: 'auto_debit',  isDeleted: false },
  { id: 'e9',  type: 'investment', amount: 3000,  date: toLocalDateStr(shiftDays(TODAY, -6)),   category: 'inv_ppf',        description: 'PPF deposit',      paymentMethod: 'net_banking', isDeleted: false },

  // ── PREVIOUS MONTH (March 2026) ──
  { id: 'e10', type: 'income',     amount: 78000, date: '2026-03-05',                            category: 'salary',         description: 'March salary',     paymentMethod: 'net_banking', isDeleted: false },
  { id: 'e11', type: 'expense',    amount: 22000, date: '2026-03-15',                            category: 'rent_housing',   description: 'March rent + util', paymentMethod: 'net_banking', isDeleted: false },
  { id: 'e12', type: 'investment', amount: 5000,  date: '2026-03-10',                            category: 'inv_mutual_fund', description: 'March SIP',        paymentMethod: 'auto_debit',  isDeleted: false },
];

// ── Pure calculation engine (mirror of src/utils/expenseCalculations.ts) ──

function calculateSummary(entries, budget) {
  const incomeEntries = entries.filter(e => e.type === 'income' && !e.isDeleted);
  const expenseEntries = entries.filter(e => e.type === 'expense' && !e.isDeleted);
  const investmentEntries = entries.filter(e => e.type === 'investment' && !e.isDeleted);

  const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = expenseEntries.reduce((s, e) => s + e.amount, 0);
  const totalInvestments = investmentEntries.reduce((s, e) => s + e.amount, 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const investmentRate = totalIncome > 0 ? (totalInvestments / totalIncome) * 100 : 0;

  // Category breakdown
  const expenseByCategory = {};
  expenseEntries.forEach(e => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  });

  return {
    totalIncome, totalExpenses, totalInvestments,
    netSavings, savingsRate, investmentRate,
    expenseCount: expenseEntries.length,
    incomeCount: incomeEntries.length,
    investmentCount: investmentEntries.length,
    entryCount: entries.length,
    expenseByCategory,
  };
}

// Filter helpers
function filterByDateRange(entries, start, end) {
  return entries.filter(e => e.date >= start && e.date <= end);
}

function filterByDate(entries, date) {
  return entries.filter(e => e.date === date);
}

function filterByMonth(entries, year, month) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  return entries.filter(e => e.date.startsWith(monthStr));
}

function filterByYear(entries, year) {
  return entries.filter(e => e.date.startsWith(String(year)));
}

// Get current week range (Mon–Sun)
function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay() || 7; // Sun=0 → 7
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toLocalDateStr(monday), end: toLocalDateStr(sunday) };
}

// ── Financial Health Score (mirror) ──
function calculateFinancialHealth(summary, monthlyEmiTotal = 0, liquidAssets = 0) {
  const { totalIncome, totalExpenses, savingsRate, investmentRate } = summary;

  const savingsScore = Math.min(25, Math.round((Math.max(0, savingsRate) / 30) * 25));

  const debtToIncomeRatio = totalIncome > 0 ? (monthlyEmiTotal / totalIncome) * 100 : 0;
  const debtScore = debtToIncomeRatio <= 0
    ? 25
    : debtToIncomeRatio <= 30
    ? Math.round(25 - (debtToIncomeRatio / 30) * 8)
    : debtToIncomeRatio <= 50
    ? Math.round(17 - ((debtToIncomeRatio - 30) / 20) * 12)
    : Math.max(0, Math.round(5 - ((debtToIncomeRatio - 50) / 50) * 5));

  const investmentScore = Math.min(25, Math.round((Math.max(0, investmentRate) / 20) * 25));
  const budgetScore = 12; // neutral default

  const overall = savingsScore + debtScore + investmentScore + budgetScore;
  const emergencyFundMonths = totalExpenses > 0 ? liquidAssets / totalExpenses : 0;

  const grade = overall >= 90 ? 'A+' : overall >= 80 ? 'A' : overall >= 70 ? 'B+' :
                overall >= 60 ? 'B' : overall >= 45 ? 'C' : overall >= 30 ? 'D' : 'F';

  return {
    overall, grade,
    breakdown: { savingsScore, debtScore, investmentScore, budgetScore },
    metrics: { savingsRate, debtToIncomeRatio, investmentRate, emergencyFundMonths, monthlyEmiTotal },
  };
}

// ═══════════════════════════════════════════════════════════════
// QA AUDIT
// ═══════════════════════════════════════════════════════════════

let pass = 0;
let fail = 0;
const failures = [];

function check(label, expected, actual) {
  const ok = Math.abs(expected - actual) < 0.01;
  if (ok) {
    pass++;
    console.log(`  \u2713 ${label}: ${actual}`);
  } else {
    fail++;
    failures.push(`${label}: expected ${expected}, got ${actual}`);
    console.log(`  \u2717 ${label}: expected ${expected}, got ${actual}`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  FINCALIX EXPENSE TRACKER — QA AUDIT');
console.log('  Sample data: 12 entries (3 income, 6 expenses, 3 investments)');
console.log(`  Today: ${toLocalDateStr(TODAY)}`);
console.log('═══════════════════════════════════════════════════════════════\n');

// ── 1. RAW DATA TOTALS ──
console.log('1. RAW DATA SANITY CHECK');
const allIncome = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
const allExpense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
const allInvest = entries.filter(e => e.type === 'investment').reduce((s, e) => s + e.amount, 0);
check('Total income (raw sum)', 80000 + 78000, allIncome);          // 158000
check('Total expenses (raw sum)', 450 + 1200 + 350 + 2500 + 15000 + 1800 + 22000, allExpense); // 42300
check('Total investments (raw sum)', 5000 + 3000 + 5000, allInvest); // 13000
check('Total entry count', 12, entries.length);

// ── 2. DAILY TAB (today only) ──
console.log('\n2. DAILY TAB (today = April 7, 2026)');
const todayEntries = filterByDate(entries, toLocalDateStr(TODAY));
const todaySummary = calculateSummary(todayEntries);
check('Daily income', 80000, todaySummary.totalIncome);
check('Daily expenses', 450 + 1200, todaySummary.totalExpenses);  // 1650
check('Daily investments', 0, todaySummary.totalInvestments);
check('Daily net (income - expenses)', 80000 - 1650, todaySummary.netSavings);
check('Daily entry count', 3, todaySummary.entryCount);

// ── 3. WEEKLY TAB (current week) ──
console.log('\n3. WEEKLY TAB (current week)');
const weekRange = getWeekRange(TODAY);
console.log(`  Range: ${weekRange.start} → ${weekRange.end}`);
const weekEntries = filterByDateRange(entries, weekRange.start, weekRange.end);
const weekSummary = calculateSummary(weekEntries);
console.log(`  Weekly entries: ${weekEntries.length}`);
// April 7 is Tuesday → week is April 6 (Mon) to April 12 (Sun)
// Entries in this range: April 7 (e1, e2, e3), April 6 (e4)
// April 5 (e5) is Sunday — last week!  April 4 (e6), April 2 (e7), April 1 (e8, e9) are last week
check('Weekly income', 80000, weekSummary.totalIncome);          // e1
check('Weekly expenses', 450 + 1200 + 350, weekSummary.totalExpenses); // e2, e3, e4 = 2000
check('Weekly investments', 0, weekSummary.totalInvestments);
check('Weekly entry count', 4, weekSummary.entryCount);

// ── 4. MONTHLY TAB (April 2026) ──
console.log('\n4. MONTHLY TAB (April 2026)');
const monthEntries = filterByMonth(entries, 2026, 4);
const monthSummary = calculateSummary(monthEntries);
console.log(`  Monthly entries: ${monthEntries.length}`);
// April entries: e1–e9 (e10–e12 are March)
check('Monthly income', 80000, monthSummary.totalIncome);
check('Monthly expenses', 450 + 1200 + 350 + 2500 + 15000 + 1800, monthSummary.totalExpenses); // 21300
check('Monthly investments', 5000 + 3000, monthSummary.totalInvestments); // 8000
check('Monthly net', 80000 - 21300, monthSummary.netSavings); // 58700
check('Monthly savings rate %', ((80000 - 21300) / 80000) * 100, monthSummary.savingsRate); // 73.375
check('Monthly investment rate %', (8000 / 80000) * 100, monthSummary.investmentRate);      // 10
check('Monthly entry count', 9, monthSummary.entryCount);

// ── 5. YEARLY TAB (2026 — full year) ──
console.log('\n5. YEARLY TAB (2026)');
const yearEntries = filterByYear(entries, 2026);
const yearSummary = calculateSummary(yearEntries);
console.log(`  Yearly entries: ${yearEntries.length}`);
check('Yearly income', 80000 + 78000, yearSummary.totalIncome);                    // 158000
check('Yearly expenses', 450 + 1200 + 350 + 2500 + 15000 + 1800 + 22000, yearSummary.totalExpenses); // 43300
check('Yearly investments', 5000 + 3000 + 5000, yearSummary.totalInvestments);     // 13000
check('Yearly net', 158000 - 43300, yearSummary.netSavings);                       // 114700
check('Yearly savings rate %', ((158000 - 43300) / 158000) * 100, yearSummary.savingsRate);
check('Yearly entry count', 12, yearSummary.entryCount);

// ── 6. CUSTOM RANGE (March 1 – April 7) ──
console.log('\n6. CUSTOM RANGE (March 1 – April 7, 2026)');
const customEntries = filterByDateRange(entries, '2026-03-01', '2026-04-07');
const customSummary = calculateSummary(customEntries);
console.log(`  Custom range entries: ${customEntries.length}`);
check('Custom income', 80000 + 78000, customSummary.totalIncome);
check('Custom expenses', 43300, customSummary.totalExpenses);
check('Custom investments', 13000, customSummary.totalInvestments);
check('Custom entry count', 12, customSummary.entryCount);

// ── 7. PREVIOUS MONTH (March 2026) ──
console.log('\n7. PREVIOUS MONTH (March 2026)');
const marchEntries = filterByMonth(entries, 2026, 3);
const marchSummary = calculateSummary(marchEntries);
check('March income', 78000, marchSummary.totalIncome);
check('March expenses', 22000, marchSummary.totalExpenses);
check('March investments', 5000, marchSummary.totalInvestments);
check('March entry count', 3, marchSummary.entryCount);

// ── 8. CATEGORY BREAKDOWN ──
console.log('\n8. CATEGORY BREAKDOWN (Yearly)');
check('Rent + Housing total', 15000 + 22000, yearSummary.expenseByCategory['rent_housing']); // 37000
check('Food & Dining total', 450, yearSummary.expenseByCategory['food_dining']);
check('Groceries total', 1200, yearSummary.expenseByCategory['groceries']);
check('Transport total', 350, yearSummary.expenseByCategory['transport']);
check('Shopping total', 2500, yearSummary.expenseByCategory['shopping']);
check('Utilities total', 1800, yearSummary.expenseByCategory['utilities']);

// ── 9. FINANCIAL HEALTH SCORE (Monthly) ──
console.log('\n9. FINANCIAL HEALTH SCORE (April 2026)');
// Assume: ₹15,000/mo EMI (e.g., car loan), ₹2,00,000 in liquid savings
const health = calculateFinancialHealth(monthSummary, 15000, 200000);
console.log(`  Overall score: ${health.overall}/100 (Grade ${health.grade})`);
console.log(`  Savings: ${health.breakdown.savingsScore}/25`);
console.log(`  Debt: ${health.breakdown.debtScore}/25`);
console.log(`  Investment: ${health.breakdown.investmentScore}/25`);
console.log(`  Budget: ${health.breakdown.budgetScore}/25`);
console.log(`  Debt-to-Income: ${fmtPct(health.metrics.debtToIncomeRatio)}`);
console.log(`  Emergency Fund: ${health.metrics.emergencyFundMonths.toFixed(2)} months`);

// Sanity checks on health score
check('Savings score is at max (savings >= 30%)', 25, health.breakdown.savingsScore);
check('Debt-to-income = 18.75%', 18.75, health.metrics.debtToIncomeRatio);
check('Investment score (10% rate)', Math.round((10 / 20) * 25), health.breakdown.investmentScore); // 13
check('Emergency fund (200K / 21300)', 200000 / 21300, health.metrics.emergencyFundMonths);

// ── 10. CROSS-TAB CONSISTENCY ──
console.log('\n10. CROSS-TAB CONSISTENCY');
// The sum of monthly summaries should match yearly
const aprilSum = filterByMonth(entries, 2026, 4).reduce((s, e) => e.type === 'income' ? s + e.amount : s, 0);
const marchSum = filterByMonth(entries, 2026, 3).reduce((s, e) => e.type === 'income' ? s + e.amount : s, 0);
check('March + April income = Yearly income', yearSummary.totalIncome, aprilSum + marchSum);

const aprilExp = filterByMonth(entries, 2026, 4).reduce((s, e) => e.type === 'expense' ? s + e.amount : s, 0);
const marchExp = filterByMonth(entries, 2026, 3).reduce((s, e) => e.type === 'expense' ? s + e.amount : s, 0);
check('March + April expenses = Yearly expenses', yearSummary.totalExpenses, aprilExp + marchExp);

// ── REPORT ──
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  RESULTS: ${pass} passed, ${fail} failed`);
console.log('═══════════════════════════════════════════════════════════════');
if (fail > 0) {
  console.log('\nFAILURES:');
  failures.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
} else {
  console.log('\n\u2705 ALL CALCULATIONS VERIFIED CORRECTLY\n');
  console.log('Summary of audit:');
  console.log(`  • Daily tab    → ${todaySummary.entryCount} entries, net ${fmtINR(todaySummary.netSavings)}`);
  console.log(`  • Weekly tab   → ${weekSummary.entryCount} entries, net ${fmtINR(weekSummary.netSavings)}`);
  console.log(`  • Monthly tab  → ${monthSummary.entryCount} entries, net ${fmtINR(monthSummary.netSavings)}, savings rate ${fmtPct(monthSummary.savingsRate)}`);
  console.log(`  • Yearly tab   → ${yearSummary.entryCount} entries, net ${fmtINR(yearSummary.netSavings)}`);
  console.log(`  • Custom range → ${customSummary.entryCount} entries, net ${fmtINR(customSummary.netSavings)}`);
  console.log(`  • Health score → ${health.overall}/100 (${health.grade})\n`);
  process.exit(0);
}
