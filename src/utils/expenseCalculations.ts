// ═══════════════════════════════════════════════════════════════
// FINCALIX — EXPENSE CALCULATION ENGINE
// This is the ONLY place calculations happen.
// All views import from here. No inline math anywhere.
// ═══════════════════════════════════════════════════════════════

import type { Entry, Budget, Category } from '../types/expense';
import { ALL_DEFAULT_CATEGORIES } from '../types/expense';
import { getCustomCategories } from './expenseStorage';

// ─── INTERFACES ───────────────────────────────────────────────

export interface PeriodSummary {
  totalIncome: number;
  totalExpenses: number;
  totalInvestments: number;
  totalTransfers: number;
  netSavings: number;
  savingsRate: number;
  investmentRate: number;
  entryCount: number;
  expenseCount: number;
  incomeCount: number;
  investmentCount: number;
  expenseByCategory: CategoryTotal[];
  incomeByCategory: CategoryTotal[];
  investmentByCategory: CategoryTotal[];
  dailyTotals: DailyTotal[];
  budgetedExpenses: number;
  budgetVariance: number;
}

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface DailyTotal {
  date: string;
  income: number;
  expenses: number;
  investments: number;
  net: number;
}

export interface WeeklySummary {
  weekNumber: number;
  startDate: string;
  endDate: string;
  label: string;
  income: number;
  expenses: number;
  investments: number;
  net: number;
}

// ─── MASTER CALCULATION FUNCTION ──────────────────────────────

export const calculateSummary = (entries: Entry[], budget?: Budget): PeriodSummary => {
  const incomeEntries = entries.filter(e => e.type === 'income');
  const expenseEntries = entries.filter(e => e.type === 'expense');
  const investmentEntries = entries.filter(e => e.type === 'investment');
  const transferEntries = entries.filter(e => e.type === 'transfer');

  const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = expenseEntries.reduce((s, e) => s + e.amount, 0);
  const totalInvestments = investmentEntries.reduce((s, e) => s + e.amount, 0);
  const totalTransfers = transferEntries.reduce((s, e) => s + e.amount, 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const investmentRate = totalIncome > 0 ? (totalInvestments / totalIncome) * 100 : 0;

  const expenseByCategory = buildCategoryTotals(expenseEntries, totalExpenses);
  const incomeByCategory = buildCategoryTotals(incomeEntries, totalIncome);
  const investmentByCategory = buildCategoryTotals(investmentEntries, totalInvestments);
  const dailyTotals = buildDailyTotals(entries);

  const budgetedExpenses = budget
    ? budget.categoryLimits.reduce((s, l) => s + l.monthlyLimit, 0)
      + budget.fixedExpenses.reduce((s, f) => s + f.amount, 0)
    : 0;
  const budgetVariance = totalExpenses - budgetedExpenses;

  return {
    totalIncome, totalExpenses, totalInvestments, totalTransfers,
    netSavings, savingsRate, investmentRate,
    entryCount: entries.length,
    expenseCount: expenseEntries.length,
    incomeCount: incomeEntries.length,
    investmentCount: investmentEntries.length,
    expenseByCategory, incomeByCategory, investmentByCategory,
    dailyTotals, budgetedExpenses, budgetVariance,
  };
};

// ─── CATEGORY TOTALS ──────────────────────────────────────────

const buildCategoryTotals = (entries: Entry[], total: number): CategoryTotal[] => {
  const amountMap = new Map<string, number>();
  const countMap = new Map<string, number>();

  entries.forEach(e => {
    const cat = e.category || 'other_expense';
    amountMap.set(cat, (amountMap.get(cat) ?? 0) + e.amount);
    countMap.set(cat, (countMap.get(cat) ?? 0) + 1);
  });

  const allCats = [...ALL_DEFAULT_CATEGORIES, ...getCustomCategories()];
  const result: CategoryTotal[] = [];

  amountMap.forEach((amount, categoryId) => {
    const catDef = allCats.find(c => c.id === categoryId);
    result.push({
      categoryId,
      categoryName: catDef?.name ?? toHumanReadable(categoryId),
      categoryIcon: catDef?.icon ?? '📦',
      categoryColor: catDef?.color ?? '#94a3b8',
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
      count: countMap.get(categoryId) ?? 0,
    });
  });

  return result.sort((a, b) => b.amount - a.amount);
};

// Convert any category ID to human readable — fixes "expenses.categories.gold" bug
const toHumanReadable = (id: string): string => {
  const clean = id
    .replace(/^expenses\.categories\./, '')
    .replace(/^income\.categories\./, '')
    .replace(/^investment\.categories\./, '')
    .replace(/^inv_/, '');
  return clean.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

// ─── DAILY TOTALS ─────────────────────────────────────────────

const buildDailyTotals = (entries: Entry[]): DailyTotal[] => {
  const map = new Map<string, DailyTotal>();

  entries.forEach(e => {
    if (!map.has(e.date)) {
      map.set(e.date, { date: e.date, income: 0, expenses: 0, investments: 0, net: 0 });
    }
    const day = map.get(e.date)!;
    if (e.type === 'income') day.income += e.amount;
    if (e.type === 'expense') day.expenses += e.amount;
    if (e.type === 'investment') day.investments += e.amount;
    day.net = day.income - day.expenses;
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
};

// ─── WEEKLY BREAKDOWN FOR A MONTH ─────────────────────────────

export const buildWeeklyBreakdown = (entries: Entry[], year: number, month: number): WeeklySummary[] => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const weeks: WeeklySummary[] = [];
  let weekStart = new Date(firstDay);
  let weekNum = 1;

  while (weekStart <= lastDay) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime());

    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];
    const weekEntries = entries.filter(e => e.date >= startStr && e.date <= endStr);

    const income = weekEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const expenses = weekEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    const investments = weekEntries.filter(e => e.type === 'investment').reduce((s, e) => s + e.amount, 0);

    weeks.push({
      weekNumber: weekNum,
      startDate: startStr,
      endDate: endStr,
      label: `${formatShortDate(weekStart)}-${formatShortDate(weekEnd)}`,
      income, expenses, investments,
      net: income - expenses,
    });

    weekNum++;
    weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() + 1);
  }

  return weeks;
};

// ─── DATE RANGE UTILITIES ─────────────────────────────────────

export const getWeekRange = (weekOffset: number = 0) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diff + weekOffset * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
    label: `${formatShortDate(monday)} — ${formatShortDate(sunday, true)}`,
  };
};

export const getMonthRange = (monthOffset: number = 0) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + monthOffset);

  const start = d.toISOString().split('T')[0];
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];

  return {
    start, end,
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    monthStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  };
};

export const getYearRange = (yearOffset: number = 0) => {
  const year = new Date().getFullYear() + yearOffset;
  return {
    year,
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
};

export const getTodayStr = (): string => new Date().toISOString().split('T')[0];

export const getDateStr = (d: Date): string => d.toISOString().split('T')[0];

// ─── FORMAT UTILITIES ─────────────────────────────────────────

export const fmtINR = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(Math.round(amount));
};

export const fmtINRShort = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
};

export const fmtPct = (value: number): string => `${value.toFixed(1)}%`;

export const formatShortDate = (d: Date, showYear?: boolean): string => {
  return d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
    ...(showYear && { year: 'numeric' }),
  });
};

export const formatFullDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── BUDGET HELPERS ───────────────────────────────────────────

export const getBudgetTotalFixed = (budget: Budget): number => {
  return budget.fixedExpenses.reduce((s, f) => s + f.amount, 0);
};

export const getBudgetTotalCategoryLimits = (budget: Budget): number => {
  return budget.categoryLimits.reduce((s, l) => s + l.monthlyLimit, 0);
};

export const getBudgetTotalInvestments = (budget: Budget): number => {
  return budget.investmentTargets.reduce((s, t) => s + t.monthlyTarget, 0);
};

export const getBudgetUnallocated = (budget: Budget): number => {
  return budget.monthlyIncome
    - getBudgetTotalFixed(budget)
    - getBudgetTotalCategoryLimits(budget)
    - getBudgetTotalInvestments(budget);
};

export const getCategorySpentVsBudget = (
  entries: Entry[],
  budget: Budget
): Array<{ categoryId: string; budgeted: number; spent: number; pct: number }> => {
  const summary = calculateSummary(entries, budget);
  return budget.categoryLimits.map(cl => {
    const cat = summary.expenseByCategory.find(c => c.categoryId === cl.categoryId);
    const spent = cat?.amount ?? 0;
    return {
      categoryId: cl.categoryId,
      budgeted: cl.monthlyLimit,
      spent,
      pct: cl.monthlyLimit > 0 ? (spent / cl.monthlyLimit) * 100 : 0,
    };
  });
};

// ─── COMPARISON HELPERS ───────────────────────────────────────

export const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const getHighestSpendingDay = (dailyTotals: DailyTotal[]): DailyTotal | null => {
  if (dailyTotals.length === 0) return null;
  return dailyTotals.reduce((max, d) => d.expenses > max.expenses ? d : max, dailyTotals[0]);
};

export const getActiveDaysCount = (dailyTotals: DailyTotal[]): number => {
  return dailyTotals.filter(d => d.income > 0 || d.expenses > 0 || d.investments > 0).length;
};
