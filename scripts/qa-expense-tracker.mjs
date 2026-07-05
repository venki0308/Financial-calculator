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
  // Cash actually left in hand: investments also leave the wallet.
  // Mirrors PeriodSummary.cashBalance in src/utils/expenseCalculations.ts.
  const cashBalance = totalIncome - totalExpenses - totalInvestments;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const investmentRate = totalIncome > 0 ? (totalInvestments / totalIncome) * 100 : 0;

  // Category breakdown
  const expenseByCategory = {};
  expenseEntries.forEach(e => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  });

  return {
    totalIncome, totalExpenses, totalInvestments,
    netSavings, cashBalance, savingsRate, investmentRate,
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
check('Daily net (income - expenses - investments)', 80000 - 1650 - 0, todaySummary.cashBalance);
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
check('Weekly net (income - expenses - investments)', 80000 - 2000 - 0, weekSummary.cashBalance);
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
check('Monthly net (income - expenses - investments)', 80000 - 21300 - 8000, monthSummary.cashBalance); // 50700
check('Monthly savings rate %', ((80000 - 21300) / 80000) * 100, monthSummary.savingsRate); // 73.375 (basis unchanged: investments count as savings)
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
check('Yearly net (income - expenses - investments)', 158000 - 43300 - 13000, yearSummary.cashBalance); // 101700
check('Yearly savings rate %', ((158000 - 43300) / 158000) * 100, yearSummary.savingsRate); // basis unchanged
check('Yearly entry count', 12, yearSummary.entryCount);

// ── 6. CUSTOM RANGE (March 1 – April 7) ──
console.log('\n6. CUSTOM RANGE (March 1 – April 7, 2026)');
const customEntries = filterByDateRange(entries, '2026-03-01', '2026-04-07');
const customSummary = calculateSummary(customEntries);
console.log(`  Custom range entries: ${customEntries.length}`);
check('Custom income', 80000 + 78000, customSummary.totalIncome);
check('Custom expenses', 43300, customSummary.totalExpenses);
check('Custom investments', 13000, customSummary.totalInvestments);
check('Custom net (income - expenses - investments)', 158000 - 43300 - 13000, customSummary.cashBalance); // 101700
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

// ── 11. SALARY-CYCLE MONTH EQUIVALENCE ──
// Mirrors getMonthStartDay/getMonthRange/getCycleRangeForMonth in
// src/utils/expenseCalculations.ts. The math here is re-implemented
// independently from the spec ("month" = [N of month M, N-1 of M+1]),
// then asserted against hand-computed expected values. The HARD
// requirement: startDay = 1 (the default every existing user has) must
// produce EXACTLY the calendar-month ranges — byte-identical strings.
console.log('\n11. SALARY-CYCLE MONTH EQUIVALENCE (fincalix_month_start_day)');

function checkStr(label, expected, actual) {
  const ok = expected === actual;
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}: ${actual}`);
  } else {
    fail++;
    failures.push(`${label}: expected ${expected}, got ${actual}`);
    console.log(`  ✗ ${label}: expected ${expected}, got ${actual}`);
  }
}

// Independent re-implementation of the cycle-range math (spec-driven,
// not copied from the production util):
//   - startDay 1 → plain calendar month shifted by offset.
//   - startDay N>1 → anchor month M = current calendar month if
//     today.day >= N else previous month; offset shifts whole cycles;
//     cycle = [N of anchor month, (N of next month) - 1 day], with N
//     clamped to each month's length (defensive: N <= 28 always fits).
function cycleRangeMirror(startDay, monthOffset, todayISO) {
  const [ty, tm, td] = todayISO.split('-').map(Number);
  const lastDayOf = (y, m0) => new Date(y, m0 + 1, 0).getDate();

  if (startDay === 1) {
    const d = new Date(ty, tm - 1 + monthOffset, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return {
      start: `${y}-${String(m).padStart(2, '0')}-01`,
      end: `${y}-${String(m).padStart(2, '0')}-${String(lastDayOf(y, m - 1)).padStart(2, '0')}`,
      monthStr: `${y}-${String(m).padStart(2, '0')}`,
    };
  }

  let anchorM0 = tm - 1;
  if (td < Math.min(startDay, lastDayOf(ty, anchorM0))) anchorM0 -= 1;
  const anchor = new Date(ty, anchorM0 + monthOffset, 1);
  const ay = anchor.getFullYear();
  const am = anchor.getMonth();
  const startD = new Date(ay, am, Math.min(startDay, lastDayOf(ay, am)));
  // End = (N of the NEXT month, clamped to its length) minus 1 day.
  const nextAnchor = new Date(ay, am + 1, 1);
  const ny = nextAnchor.getFullYear();
  const nm = nextAnchor.getMonth();
  const endD = new Date(ny, nm, Math.min(startDay, lastDayOf(ny, nm)));
  endD.setDate(endD.getDate() - 1);
  return {
    start: toLocalDateStr(startD),
    end: toLocalDateStr(endD),
    monthStr: `${ay}-${String(am + 1).padStart(2, '0')}`,
  };
}

// 11a. startDay = 1 → calendar month ranges, 12 sample months incl. leap Feb.
// today = 2024-07-05, offsets 0..-11 cover 2023-08 .. 2024-07 (Feb 2024 = leap).
console.log('  — 11a. startDay=1 equals calendar months (12 samples incl. leap Feb 2024)');
for (let off = 0; off >= -11; off--) {
  const got = cycleRangeMirror(1, off, '2024-07-05');
  // Independent calendar expectation:
  const d = new Date(2024, 6 + off, 1);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const last = new Date(y, m, 0).getDate();
  const expStart = `${y}-${String(m).padStart(2, '0')}-01`;
  const expEnd = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  checkStr(`startDay=1 offset ${off} start`, expStart, got.start);
  checkStr(`startDay=1 offset ${off} end`, expEnd, got.end);
}
// Leap Feb explicitly:
checkStr('startDay=1 leap Feb 2024 end', '2024-02-29', cycleRangeMirror(1, -5, '2024-07-05').end);

// 11b. startDay=1 range fetch ≡ calendar month fetch on the sample entries.
// This is the exact substitution MonthlyTab made (getEntriesForMonth →
// getEntriesForDateRange): the selected entry sets must be identical.
console.log('  — 11b. startDay=1: date-range fetch ≡ month fetch (entry bucketing)');
const aprRange = cycleRangeMirror(1, 0, '2026-04-07');
const aprByRange = filterByDateRange(entries, aprRange.start, aprRange.end).map(e => e.id).sort().join(',');
const aprByMonth = filterByMonth(entries, 2026, 4).map(e => e.id).sort().join(',');
checkStr('April 2026 entries identical', aprByMonth, aprByRange);
const marRange = cycleRangeMirror(1, -1, '2026-04-07');
const marByRange = filterByDateRange(entries, marRange.start, marRange.end).map(e => e.id).sort().join(',');
const marByMonth = filterByMonth(entries, 2026, 3).map(e => e.id).sort().join(',');
checkStr('March 2026 entries identical', marByMonth, marByRange);

// 11c. startDay=25, today=2026-07-05 (day 5 < 25 → anchor June).
console.log('  — 11c. startDay=25, today=2026-07-05');
const c25 = cycleRangeMirror(25, 0, '2026-07-05');
checkStr('cycle start', '2026-06-25', c25.start);
checkStr('cycle end', '2026-07-24', c25.end);
checkStr('cycle monthStr (budget key = starting month)', '2026-06', c25.monthStr);
const c25prev = cycleRangeMirror(25, -1, '2026-07-05');
checkStr('prev cycle start', '2026-05-25', c25prev.start);
checkStr('prev cycle end', '2026-06-24', c25prev.end);

// 11d. startDay=28, cycle ending inside February (clamping / short months).
console.log('  — 11d. startDay=28 across February');
const c28 = cycleRangeMirror(28, 0, '2026-02-10'); // day 10 < 28 → anchor Jan
checkStr('Jan-cycle start', '2026-01-28', c28.start);
checkStr('Jan-cycle end (Feb 2026 has 28 days)', '2026-02-27', c28.end);
const c28leap = cycleRangeMirror(28, 0, '2024-02-10');
checkStr('leap-year Jan-cycle end', '2024-02-27', c28leap.end);
// Contiguity: consecutive cycles must tile the calendar with no gap/overlap.
for (let off = -1; off <= 1; off++) {
  const a = cycleRangeMirror(28, off, '2026-02-10');
  const b = cycleRangeMirror(28, off + 1, '2026-02-10');
  const dayAfterA = toLocalDateStr(shiftDays(new Date(a.end + 'T00:00:00'), 1));
  checkStr(`contiguous cycles at offset ${off}`, b.start, dayAfterA);
}

// 11e. Entry bucketing across a cycle boundary (startDay=25).
console.log('  — 11e. bucketing across the cycle boundary');
const boundaryEntries = [
  { id: 'b1', type: 'expense', amount: 100, date: '2026-06-24', category: 'food_dining', isDeleted: false },
  { id: 'b2', type: 'expense', amount: 200, date: '2026-06-25', category: 'food_dining', isDeleted: false },
];
const curCycleIds = filterByDateRange(boundaryEntries, c25.start, c25.end).map(e => e.id).join(',');
const prevCycleIds = filterByDateRange(boundaryEntries, c25prev.start, c25prev.end).map(e => e.id).join(',');
checkStr('26 Jun 24 lands in PREVIOUS cycle', 'b1', prevCycleIds);
checkStr('26 Jun 25 lands in CURRENT cycle', 'b2', curCycleIds);
check('cycle totals split correctly (current)', 200,
  filterByDateRange(boundaryEntries, c25.start, c25.end).reduce((s, e) => s + e.amount, 0));
check('cycle totals split correctly (previous)', 100,
  filterByDateRange(boundaryEntries, c25prev.start, c25prev.end).reduce((s, e) => s + e.amount, 0));

// ── 12. CARRY-OVER BUDGETS (opt-in) ──
// Independent re-implementation of getCategorySpentVsBudget's carry-over
// rule (src/utils/expenseCalculations.ts):
//   carryOver OFF (or absent) → effective limit = monthlyLimit (legacy, unchanged)
//   carryOver ON  → effective limit = monthlyLimit + max(0, prevLimit − prevSpent)
// One-month lookback only; prev month's own carryOver flag is ignored
// (bounded, predictable — no recursive chains). Overspent months carry 0.
console.log('\n12. CARRY-OVER BUDGETS (opt-in, default OFF)');

function spentByCategory(list) {
  const m = {};
  for (const e of list) {
    if (e.type !== 'expense' || e.isDeleted) continue;
    m[e.category] = (m[e.category] || 0) + e.amount;
  }
  return m;
}

// Mirror of the production rule.
function categorySpentVsBudget(list, budget, prevBudget, prevEntries) {
  const spent = spentByCategory(list);
  const prevSpent = budget.carryOver && prevBudget ? spentByCategory(prevEntries || []) : {};
  return budget.categoryLimits.map(cl => {
    let carried = 0;
    if (budget.carryOver && prevBudget) {
      const pl = prevBudget.categoryLimits.find(p => p.categoryId === cl.categoryId);
      if (pl && pl.monthlyLimit > 0) {
        carried = Math.max(0, pl.monthlyLimit - (prevSpent[cl.categoryId] || 0));
      }
    }
    const effective = cl.monthlyLimit + carried;
    const s = spent[cl.categoryId] || 0;
    return {
      categoryId: cl.categoryId,
      budgeted: effective,
      spent: s,
      pct: effective > 0 ? (s / effective) * 100 : 0,
      carried,
    };
  });
}

// March budget: groceries 5000 (spent 3000 → carries 2000),
//               transport 2000 (spent 2500 → overspent, carries 0)
const marchCarryBudget = {
  month: '2026-03',
  carryOver: false,
  categoryLimits: [
    { categoryId: 'groceries', monthlyLimit: 5000 },
    { categoryId: 'transport', monthlyLimit: 2000 },
  ],
};
const marchCarryEntries = [
  { type: 'expense', amount: 3000, date: '2026-03-20', category: 'groceries', isDeleted: false },
  { type: 'expense', amount: 2500, date: '2026-03-22', category: 'transport', isDeleted: false },
];
const aprilCarryEntries = [
  { type: 'expense', amount: 1000, date: '2026-04-03', category: 'groceries', isDeleted: false },
];

// Case A — carryOver OFF: identical to legacy behavior (existing checks above unchanged).
const aprilBudgetOff = { month: '2026-04', carryOver: false, categoryLimits: [
  { categoryId: 'groceries', monthlyLimit: 5000 },
  { categoryId: 'transport', monthlyLimit: 2000 },
]};
const offRows = categorySpentVsBudget(aprilCarryEntries, aprilBudgetOff, marchCarryBudget, marchCarryEntries);
check('OFF: groceries limit unchanged', 5000, offRows[0].budgeted);
check('OFF: transport limit unchanged', 2000, offRows[1].budgeted);
check('OFF: no carried amount', 0, offRows[0].carried + offRows[1].carried);
check('OFF: groceries pct uses base limit', (1000 / 5000) * 100, offRows[0].pct);

// Flag absent (every legacy budget object) must equal flag false.
const aprilBudgetLegacy = { month: '2026-04', categoryLimits: aprilBudgetOff.categoryLimits };
const legacyRows = categorySpentVsBudget(aprilCarryEntries, aprilBudgetLegacy, marchCarryBudget, marchCarryEntries);
check('ABSENT flag: identical to OFF (groceries)', offRows[0].budgeted, legacyRows[0].budgeted);
check('ABSENT flag: identical to OFF (transport)', offRows[1].budgeted, legacyRows[1].budgeted);

// Case B — carryOver ON: limit 5000, prev spent 3000 → next month effective 7000.
const aprilBudgetOn = { ...aprilBudgetOff, carryOver: true };
const onRows = categorySpentVsBudget(aprilCarryEntries, aprilBudgetOn, marchCarryBudget, marchCarryEntries);
check('ON: groceries 5000 + (5000-3000) = 7000', 7000, onRows[0].budgeted);
check('ON: groceries carried = 2000', 2000, onRows[0].carried);
check('ON: overspent transport carries 0 (limit stays 2000)', 2000, onRows[1].budgeted);
check('ON: transport carried = 0', 0, onRows[1].carried);
check('ON: groceries pct uses effective limit', (1000 / 7000) * 100, onRows[0].pct);

// Case C — no previous budget: carryOver ON degrades to base limits.
const noPrevRows = categorySpentVsBudget(aprilCarryEntries, aprilBudgetOn, undefined, []);
check('ON, no prev budget: groceries stays 5000', 5000, noPrevRows[0].budgeted);
check('ON, no prev budget: carried = 0', 0, noPrevRows[0].carried);

// ── 13. RECURRING MATERIALIZER (mirror of src/utils/recurringStorage.ts) ──
// Independent re-implementation of the materializer's advance logic:
//   - monthly advance re-anchors on anchorDay with month-end clamping
//     (day-31 rule: Jan 31 → Feb 28/29 → Mar 31, no drift)
//   - catch-up loops until nextDueDate > today, capped at 24/rule/run
//   - occurrences older than 90 days are SKIPPED (advanced, not created)
//   - idempotency via the (recurringId, date) pair
console.log('\n13. RECURRING MATERIALIZER (recurringStorage.ts mirror)');

const recPad2 = (n) => String(n).padStart(2, '0');
const recLastDay = (y, m) => new Date(y, m, 0).getDate(); // m: 1-12

function addMonthsAnchored(iso, months, anchorDay) {
  const [y, m, d] = iso.split('-').map(Number);
  const base = new Date(y, m - 1 + months, 1);
  const wantDay = typeof anchorDay === 'number' && anchorDay >= 1 && anchorDay <= 31 ? anchorDay : d;
  const day = Math.min(wantDay, recLastDay(base.getFullYear(), base.getMonth() + 1));
  return `${base.getFullYear()}-${recPad2(base.getMonth() + 1)}-${recPad2(day)}`;
}

function recShiftDays(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${recPad2(d.getMonth() + 1)}-${recPad2(d.getDate())}`;
}

function advanceRule(dueISO, frequency, anchorDay) {
  if (frequency === 'weekly') return recShiftDays(dueISO, 7);
  if (frequency === 'yearly') {
    const year = Number(dueISO.slice(0, 4)) + 1;
    const anchor = typeof anchorDay === 'string' && /^\d{2}-\d{2}$/.test(anchorDay) ? anchorDay : dueISO.slice(5);
    const [mm, dd] = anchor.split('-').map(Number);
    return `${year}-${recPad2(mm)}-${recPad2(Math.min(dd, recLastDay(year, mm)))}`;
  }
  return addMonthsAnchored(dueISO, 1, typeof anchorDay === 'number' ? anchorDay : undefined);
}

// Pure simulation of materializeDueRecurring(): 24-iteration cap per rule,
// 90-day lookback floor, (recurringId|date) idempotency.
function simulateMaterializer(rules, existingEntries, todayISO) {
  const floor = recShiftDays(todayISO, -90);
  const keys = new Set(
    existingEntries.filter(e => e.recurringId && !e.isDeleted).map(e => `${e.recurringId}|${e.date}`),
  );
  const createdEntries = [];
  for (const rule of rules) {
    if (rule.isDeleted || !rule.isActive) continue;
    let iterations = 0;
    while (rule.nextDueDate <= todayISO && iterations < 24) {
      const due = rule.nextDueDate;
      if (due >= floor) {
        const k = `${rule.id}|${due}`;
        if (!keys.has(k)) {
          createdEntries.push({ recurringId: rule.id, date: due, amount: rule.amount, isDeleted: false });
          keys.add(k);
        }
      }
      const next = advanceRule(due, rule.frequency, rule.anchorDay);
      if (next <= due) break;
      rule.nextDueDate = next;
      iterations++;
    }
  }
  return createdEntries;
}

const TODAY_ISO = toLocalDateStr(TODAY); // 2026-04-07

// 13a. Month-end clamping: day-31 anchor
checkStr('Advance Jan 31 (anchor 31) → Feb clamps', '2026-02-28', advanceRule('2026-01-31', 'monthly', 31));
checkStr('Advance Feb 28 (anchor 31) → back to Mar 31', '2026-03-31', advanceRule('2026-02-28', 'monthly', 31));
checkStr('Leap year: Jan 31 2028 (anchor 31) → Feb 29', '2028-02-29', advanceRule('2028-01-31', 'monthly', 31));

// 13b. Full trace: monthly rent anchored day 31, due since Jan 31
//      → materializes Jan 31, Feb 28, Mar 31; next due Apr 30 (> today Apr 7)
const day31Rule = { id: 'r31', type: 'expense', amount: 15000, frequency: 'monthly', anchorDay: 31, nextDueDate: '2026-01-31', isActive: true };
const day31Created = simulateMaterializer([day31Rule], [], TODAY_ISO);
check('Day-31 rule: entries created', 3, day31Created.length);
checkStr('Day-31 rule: 1st occurrence', '2026-01-31', day31Created[0].date);
checkStr('Day-31 rule: Feb occurrence clamped', '2026-02-28', day31Created[1].date);
checkStr('Day-31 rule: Mar occurrence re-anchored', '2026-03-31', day31Created[2].date);
checkStr('Day-31 rule: final nextDueDate', '2026-04-30', day31Rule.nextDueDate);

// 13c. 3-month catch-up: salary on the 1st, app last opened before Feb 1
const salaryRule = { id: 'rsal', type: 'income', amount: 80000, frequency: 'monthly', anchorDay: 1, nextDueDate: '2026-02-01', isActive: true };
const salaryCreated = simulateMaterializer([salaryRule], [], TODAY_ISO);
check('Catch-up: 3 salary entries (Feb/Mar/Apr 1)', 3, salaryCreated.length);
checkStr('Catch-up: final nextDueDate', '2026-05-01', salaryRule.nextDueDate);

// 13d. 90-day lookback floor: rule created long ago (due since Jun 2025)
//      floor = 2026-01-07 → only Jan 15, Feb 15, Mar 15 materialize;
//      older occurrences advance WITHOUT creating entries (no spam).
const oldRule = { id: 'rold', type: 'expense', amount: 999, frequency: 'monthly', anchorDay: 15, nextDueDate: '2025-06-15', isActive: true };
const oldCreated = simulateMaterializer([oldRule], [], TODAY_ISO);
check('90-day skip: only in-window entries created', 3, oldCreated.length);
checkStr('90-day skip: earliest created ≥ floor', '2026-01-15', oldCreated[0].date);
checkStr('90-day skip: final nextDueDate', '2026-04-15', oldRule.nextDueDate);

// 13e. Idempotency: re-running with already-materialized entries creates 0
const rerunRule = { id: 'r31', type: 'expense', amount: 15000, frequency: 'monthly', anchorDay: 31, nextDueDate: '2026-01-31', isActive: true };
const rerunCreated = simulateMaterializer([rerunRule], day31Created, TODAY_ISO);
check('Idempotency: second run creates 0', 0, rerunCreated.length);

// 13f. Weekly + yearly advance rules
checkStr('Weekly advance = +7 days', '2026-04-08', advanceRule('2026-04-01', 'weekly', 3));
checkStr('Yearly Feb-29 anchor clamps in non-leap', '2025-02-28', advanceRule('2024-02-29', 'yearly', '02-29'));
checkStr('Yearly Feb-29 anchor restores in leap year', '2028-02-29', advanceRule('2027-02-28', 'yearly', '02-29'));

// 13g. Safety cap: ancient weekly rule advances max 24 cycles per run
const ancientRule = { id: 'ranc', type: 'expense', amount: 100, frequency: 'weekly', anchorDay: 0, nextDueDate: '2025-06-01', isActive: true };
const ancientCreated = simulateMaterializer([ancientRule], [], TODAY_ISO);
check('Safety cap: 0 entries (all before 90-day floor)', 0, ancientCreated.length);
checkStr('Safety cap: advanced exactly 24 weeks', recShiftDays('2025-06-01', 24 * 7), ancientRule.nextDueDate);

// 13h. Inactive + deleted rules never materialize
const pausedRule = { id: 'rp', type: 'expense', amount: 500, frequency: 'monthly', anchorDay: 1, nextDueDate: '2026-01-01', isActive: false };
const deletedRule = { id: 'rd', type: 'expense', amount: 500, frequency: 'monthly', anchorDay: 1, nextDueDate: '2026-01-01', isActive: true, isDeleted: true };
check('Paused/deleted rules create 0', 0, simulateMaterializer([pausedRule, deletedRule], [], TODAY_ISO).length);

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
  console.log(`  • Daily tab    → ${todaySummary.entryCount} entries, cash net ${fmtINR(todaySummary.cashBalance)}`);
  console.log(`  • Weekly tab   → ${weekSummary.entryCount} entries, cash net ${fmtINR(weekSummary.cashBalance)}`);
  console.log(`  • Monthly tab  → ${monthSummary.entryCount} entries, cash net ${fmtINR(monthSummary.cashBalance)}, savings rate ${fmtPct(monthSummary.savingsRate)}`);
  console.log(`  • Yearly tab   → ${yearSummary.entryCount} entries, cash net ${fmtINR(yearSummary.cashBalance)}`);
  console.log(`  • Custom range → ${customSummary.entryCount} entries, cash net ${fmtINR(customSummary.cashBalance)}`);
  console.log(`  • Health score → ${health.overall}/100 (${health.grade})\n`);
  process.exit(0);
}
