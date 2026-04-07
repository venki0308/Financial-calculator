// ═══════════════════════════════════════════════════════════════
// FINCALIX — PDF REPORT GENERATOR FOR EXPENSE TRACKER
// Builds ExportConfig objects and delegates to exportToPDF.
// ═══════════════════════════════════════════════════════════════

import type { Entry, Budget, BankAccount } from '../types/expense';
import type { ExportConfig, ChartSegment } from './exportReport';
import { exportToPDF, dateTag } from './exportReport';
import {
  calculateSummary,
  buildWeeklyBreakdown,
  fmtINR,
  fmtPct,
  formatFullDate,
  MONTH_NAMES,
} from './expenseCalculations';
import { getCategoryById } from './expenseStorage';

// ─── CATEGORY COLORS ─────────────────────────────────────────

const CHART_COLORS = [
  '#f97316', '#84cc16', '#3b82f6', '#a855f7', '#ef4444',
  '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#6366f1',
  '#0ea5e9', '#f472b6', '#14b8a6', '#8b5cf6', '#94a3b8',
];

// ─── PUBLIC API ──────────────────────────────────────────────

/**
 * Hard cap on entries shown in the projection table.
 * autoTable handles pagination but rendering 5000+ rows can OOM low-end Android.
 * If exceeded, the most recent entries are shown and a note is added.
 */
const MAX_PROJECTION_ROWS = 1000;

/** Yield to the event loop so the UI can update (toast, spinner) before
 *  blocking on heavy PDF rendering. */
const yieldToUI = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export const generateExpenseReport = async (
  type: 'daily' | 'weekly' | 'monthly' | 'annual',
  entries: Entry[],
  budget?: Budget,
  accounts?: BankAccount[],
  periodLabel?: string,
): Promise<void> => {
  // Cap entries with a safety limit (most recent first when truncating)
  const cappedEntries = entries.length > MAX_PROJECTION_ROWS
    ? [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_PROJECTION_ROWS)
    : entries;
  const truncated = entries.length > MAX_PROJECTION_ROWS;

  // Yield once so the "Generating PDF..." toast renders before heavy work
  await yieldToUI();

  // calculateSummary always uses the full set so totals stay accurate
  const summary = calculateSummary(entries, budget);
  await yieldToUI();

  const label = periodLabel || 'Report';
  const truncationNote = truncated
    ? `\nNote: Transaction table shows the most recent ${MAX_PROJECTION_ROWS} of ${entries.length} entries. All totals reflect the FULL data set.`
    : undefined;

  switch (type) {
    case 'daily':
      return exportToPDF(buildDailyConfig(cappedEntries, summary, label, truncationNote));
    case 'weekly':
      return exportToPDF(buildWeeklyConfig(cappedEntries, summary, label, truncationNote));
    case 'monthly':
      return exportToPDF(buildMonthlyConfig(cappedEntries, summary, budget, accounts, label, truncationNote));
    case 'annual':
      return exportToPDF(buildAnnualConfig(cappedEntries, summary, budget, label, truncationNote));
  }
};

// ─── DAILY REPORT ────────────────────────────────────────────

function buildDailyConfig(
  entries: Entry[],
  summary: ReturnType<typeof calculateSummary>,
  label: string,
  notes?: string,
): ExportConfig {
  return {
    title: `Daily Financial Report`,
    subtitle: label,
    notes,
    inputs: [
      { label: 'Date', value: label },
      { label: 'Total Entries', value: String(summary.entryCount) },
      { label: 'Income Entries', value: String(summary.incomeCount) },
      { label: 'Expense Entries', value: String(summary.expenseCount) },
      { label: 'Investment Entries', value: String(summary.investmentCount) },
    ],
    results: [
      { label: 'Total Income', value: fmtINR(summary.totalIncome) },
      { label: 'Total Expenses', value: fmtINR(summary.totalExpenses) },
      { label: 'Total Investments', value: fmtINR(summary.totalInvestments) },
      { label: 'Net Savings', value: fmtINR(summary.netSavings) },
    ],
    chart: buildCategoryChart(summary),
    projectionTitle: 'Transaction Details',
    projectionColumns: ['#', 'Type', 'Category', 'Description', 'Amount'],
    projectionRows: entries.map((e, i) => [
      i + 1,
      e.type.charAt(0).toUpperCase() + e.type.slice(1),
      getCategoryById(e.category)?.name || e.category,
      e.description || '—',
      fmtINR(e.amount),
    ]),
    filename: `FinCalix_Daily_Report_${dateTag()}`,
  };
}

// ─── WEEKLY REPORT ───────────────────────────────────────────

function buildWeeklyConfig(
  entries: Entry[],
  summary: ReturnType<typeof calculateSummary>,
  label: string,
  notes?: string,
): ExportConfig {
  void entries; // silence unused if any builder doesn't need raw entries
  const dailyRows = summary.dailyTotals.map(d => [
    formatFullDate(d.date),
    fmtINR(d.income),
    fmtINR(d.expenses),
    fmtINR(d.investments),
    fmtINR(d.net),
  ]);

  return {
    title: `Weekly Financial Report`,
    subtitle: label,
    notes,
    inputs: [
      { label: 'Period', value: label },
      { label: 'Total Entries', value: String(summary.entryCount) },
      { label: 'Active Days', value: String(summary.dailyTotals.length) },
    ],
    results: [
      { label: 'Total Income', value: fmtINR(summary.totalIncome) },
      { label: 'Total Expenses', value: fmtINR(summary.totalExpenses) },
      { label: 'Total Investments', value: fmtINR(summary.totalInvestments) },
      { label: 'Net Savings', value: fmtINR(summary.netSavings) },
      { label: 'Savings Rate', value: fmtPct(summary.savingsRate) },
    ],
    chart: buildCategoryChart(summary),
    projectionTitle: 'Day-by-Day Breakdown',
    projectionColumns: ['Date', 'Income', 'Expenses', 'Investments', 'Net'],
    projectionRows: dailyRows,
    filename: `FinCalix_Weekly_Report_${dateTag()}`,
  };
}

// ─── MONTHLY REPORT (most detailed) ─────────────────────────

function buildMonthlyConfig(
  entries: Entry[],
  summary: ReturnType<typeof calculateSummary>,
  budget?: Budget,
  accounts?: BankAccount[],
  label?: string,
  notes?: string,
): ExportConfig {
  // Extract year/month from first entry or label
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  if (entries.length > 0) {
    const parts = entries[0].date.split('-');
    year = parseInt(parts[0]);
    month = parseInt(parts[1]);
  }

  const weeklyBreakdown = buildWeeklyBreakdown(entries, year, month);

  // Inputs
  const inputs: ExportConfig['inputs'] = [
    { label: 'Period', value: label || `${MONTH_NAMES[month - 1]} ${year}` },
    { label: 'Total Income', value: fmtINR(summary.totalIncome) },
    { label: 'Total Expenses', value: fmtINR(summary.totalExpenses) },
    { label: 'Total Investments', value: fmtINR(summary.totalInvestments) },
    { label: 'Net Savings', value: fmtINR(summary.netSavings) },
    { label: 'Savings Rate', value: fmtPct(summary.savingsRate) },
  ];

  if (budget) {
    inputs.push(
      { label: 'Budgeted Expenses', value: fmtINR(summary.budgetedExpenses) },
      { label: 'Budget Variance', value: fmtINR(summary.budgetVariance) },
    );
  }

  // Results — category breakdown
  const results: ExportConfig['results'] = summary.expenseByCategory.map(cat => ({
    label: `${cat.categoryName}`,
    value: `${fmtINR(cat.amount)} (${fmtPct(cat.percentage)})`,
  }));

  if (results.length === 0) {
    results.push({ label: 'No expense categories', value: '—' });
  }

  // Projection — day-by-day breakdown
  const projectionRows = summary.dailyTotals.map(d => [
    formatFullDate(d.date),
    fmtINR(d.income),
    fmtINR(d.expenses),
    fmtINR(d.investments),
    fmtINR(d.net),
  ]);

  // Additional tables
  const additionalTables: ExportConfig['additionalTables'] = [];

  // Week-by-week summary
  if (weeklyBreakdown.length > 0) {
    additionalTables.push({
      title: 'Week-by-Week Summary',
      columns: ['Week', 'Period', 'Income', 'Expenses', 'Investments', 'Net'],
      rows: weeklyBreakdown.map(w => [
        `Week ${w.weekNumber}`,
        w.label,
        fmtINR(w.income),
        fmtINR(w.expenses),
        fmtINR(w.investments),
        fmtINR(w.net),
      ]),
    });
  }

  // Budget vs Actual (if budget exists)
  if (budget && budget.categoryLimits.length > 0) {
    const budgetRows = budget.categoryLimits.map(cl => {
      const actual = summary.expenseByCategory.find(c => c.categoryId === cl.categoryId);
      const spent = actual?.amount ?? 0;
      const pct = cl.monthlyLimit > 0 ? (spent / cl.monthlyLimit) * 100 : 0;
      return [
        actual?.categoryName ?? cl.categoryId,
        fmtINR(cl.monthlyLimit),
        fmtINR(spent),
        fmtPct(pct),
        spent > cl.monthlyLimit ? 'Over Budget' : 'Within Budget',
      ];
    });

    additionalTables.push({
      title: 'Budget vs Actual',
      columns: ['Category', 'Budget', 'Spent', '% Used', 'Status'],
      rows: budgetRows,
    });
  }

  // Account balances
  if (accounts && accounts.length > 0) {
    additionalTables.push({
      title: 'Account Balances',
      columns: ['Account', 'Type', 'Bank', 'Balance'],
      rows: accounts.map(a => [
        a.name,
        a.accountType,
        a.bankName,
        fmtINR(a.manualBalance),
      ]),
    });
  }

  return {
    title: `Monthly Financial Report`,
    subtitle: label || `${MONTH_NAMES[month - 1]} ${year}`,
    notes,
    inputs,
    results,
    chart: buildCategoryChart(summary),
    projectionTitle: 'Day-by-Day Breakdown',
    projectionColumns: ['Date', 'Income', 'Expenses', 'Investments', 'Net'],
    projectionRows,
    additionalTables,
    filename: `FinCalix_Monthly_Report_${MONTH_NAMES[month - 1]}_${year}_${dateTag()}`,
  };
}

// ─── ANNUAL REPORT ───────────────────────────────────────────

function buildAnnualConfig(
  entries: Entry[],
  summary: ReturnType<typeof calculateSummary>,
  budget?: Budget,
  label?: string,
  notes?: string,
): ExportConfig {
  // Build month-by-month breakdown
  const year = entries.length > 0
    ? parseInt(entries[0].date.split('-')[0])
    : new Date().getFullYear();

  const monthRows: Array<Array<string | number>> = [];
  for (let m = 1; m <= 12; m++) {
    const monthStr = `${year}-${String(m).padStart(2, '0')}`;
    const mEntries = entries.filter(e => e.date.startsWith(monthStr));
    if (mEntries.length === 0) continue;
    const mSummary = calculateSummary(mEntries);
    monthRows.push([
      MONTH_NAMES[m - 1],
      fmtINR(mSummary.totalIncome),
      fmtINR(mSummary.totalExpenses),
      fmtINR(mSummary.totalInvestments),
      fmtINR(mSummary.netSavings),
      fmtPct(mSummary.savingsRate),
    ]);
  }

  return {
    title: `Annual Financial Report`,
    subtitle: label || `Year ${year}`,
    notes,
    inputs: [
      { label: 'Year', value: String(year) },
      { label: 'Total Entries', value: String(summary.entryCount) },
      { label: 'Months with Data', value: String(monthRows.length) },
    ],
    results: [
      { label: 'Total Income', value: fmtINR(summary.totalIncome) },
      { label: 'Total Expenses', value: fmtINR(summary.totalExpenses) },
      { label: 'Total Investments', value: fmtINR(summary.totalInvestments) },
      { label: 'Net Savings', value: fmtINR(summary.netSavings) },
      { label: 'Savings Rate', value: fmtPct(summary.savingsRate) },
      { label: 'Investment Rate', value: fmtPct(summary.investmentRate) },
    ],
    chart: buildCategoryChart(summary),
    projectionTitle: 'Month-by-Month Breakdown',
    projectionColumns: ['Month', 'Income', 'Expenses', 'Investments', 'Net Savings', 'Savings Rate'],
    projectionRows: monthRows,
    filename: `FinCalix_Annual_Report_${year}_${dateTag()}`,
  };
}

// ─── HELPERS ─────────────────────────────────────────────────

function buildCategoryChart(
  summary: ReturnType<typeof calculateSummary>,
): ExportConfig['chart'] | undefined {
  if (summary.expenseByCategory.length < 2) return undefined;

  const segments: ChartSegment[] = summary.expenseByCategory.map((cat, i) => ({
    label: cat.categoryName,
    value: cat.amount,
    color: cat.categoryColor || CHART_COLORS[i % CHART_COLORS.length],
  }));

  return { type: 'pie', segments };
}
