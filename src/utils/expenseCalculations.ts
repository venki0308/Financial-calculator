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

    const startStr = toLocalDateStr(weekStart);
    const endStr = toLocalDateStr(weekEnd);
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
    start: toLocalDateStr(monday),
    end: toLocalDateStr(sunday),
    label: `${formatShortDate(monday)} — ${formatShortDate(sunday, true)}`,
  };
};

export const getMonthRange = (monthOffset: number = 0) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + monthOffset);

  const start = toLocalDateStr(d);
  const end = toLocalDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));

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

// Use LOCAL date, not UTC (toISOString is UTC — wrong after 6:30 PM IST)
const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const getTodayStr = (): string => toLocalDateStr(new Date());

export const getDateStr = (d: Date): string => toLocalDateStr(d);

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

// ═══════════════════════════════════════════════════════════════
// FINANCIAL HEALTH SCORE (0–100) — Indian context
// ═══════════════════════════════════════════════════════════════

export interface FinancialHealthScore {
  overall: number;             // 0–100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    savingsScore: number;      // 0–25  (savings rate)
    debtScore: number;         // 0–25  (debt-to-income)
    investmentScore: number;   // 0–25  (investment rate)
    budgetScore: number;       // 0–25  (budget adherence)
  };
  metrics: {
    savingsRate: number;
    debtToIncomeRatio: number;
    investmentRate: number;
    budgetAdherence: number;
    emergencyFundMonths: number;
    monthlyEmiTotal: number;
  };
}

export interface NetWorthSummary {
  totalAssets: number;
  liquidAssets: number;
  fixedAssets: number;
  investmentAssets: number;
  totalLiabilities: number;
  loanLiabilities: number;
  creditCardDebt: number;
  netWorth: number;
  debtToAssetRatio: number;
  assetBreakdown: { label: string; value: number; color: string; icon: string }[];
  liabilityBreakdown: { label: string; value: number; color: string; icon: string }[];
}

export interface SpendingInsight {
  type: 'warning' | 'positive' | 'info';
  titleKey: string;
  descKey: string;
  value?: string;
  icon: string;
}

import { getAllAccounts } from './expenseStorage';
import { getAllLoans, LOAN_TYPE_META } from '../utils/loanStorage';
import type { BankAccount } from '../types/expense';
import type { SavedLoan } from '../utils/loanStorage';

export const calculateFinancialHealth = (
  summary: PeriodSummary,
  budget: Budget | undefined,
  accounts: BankAccount[],
  loans: SavedLoan[],
): FinancialHealthScore => {
  const { totalIncome, totalExpenses, totalInvestments, savingsRate, investmentRate } = summary;

  // 1. Savings Score (0–25) — target ≥20% savings rate
  const savingsScore = Math.min(25, Math.round((Math.max(0, savingsRate) / 30) * 25));

  // 2. Debt Score (0–25) — EMI-to-income ratio (lower = better)
  const monthlyEmiTotal = loans
    .filter(l => l.isActive)
    .reduce((s, l) => s + l.emiAmount, 0);
  const debtToIncomeRatio = totalIncome > 0 ? (monthlyEmiTotal / totalIncome) * 100 : 0;
  // <30% is ideal, >50% is dangerous
  const debtScore = debtToIncomeRatio <= 0
    ? 25
    : debtToIncomeRatio <= 30
    ? Math.round(25 - (debtToIncomeRatio / 30) * 8)
    : debtToIncomeRatio <= 50
    ? Math.round(17 - ((debtToIncomeRatio - 30) / 20) * 12)
    : Math.max(0, Math.round(5 - ((debtToIncomeRatio - 50) / 50) * 5));

  // 3. Investment Score (0–25) — target ≥15% of income
  const investmentScore = Math.min(25, Math.round((Math.max(0, investmentRate) / 20) * 25));

  // 4. Budget Adherence Score (0–25)
  let budgetScore = 12; // neutral default if no budget
  if (budget && budget.monthlyIncome > 0) {
    const budgetedExpenses = budget.categoryLimits.reduce((s, l) => s + l.monthlyLimit, 0)
      + budget.fixedExpenses.reduce((s, f) => s + f.amount, 0);
    if (budgetedExpenses > 0) {
      const adherence = totalExpenses <= budgetedExpenses
        ? 100
        : Math.max(0, 100 - ((totalExpenses - budgetedExpenses) / budgetedExpenses) * 100);
      budgetScore = Math.round((adherence / 100) * 25);
    }
  }

  const overall = savingsScore + debtScore + investmentScore + budgetScore;

  // Emergency fund = liquid assets / monthly expenses
  const liquidAssets = accounts
    .filter(a => a.isActive && a.accountType !== 'credit_card' && a.accountType !== 'fixed_deposit')
    .reduce((s, a) => s + a.manualBalance, 0);
  const emergencyFundMonths = totalExpenses > 0 ? liquidAssets / totalExpenses : 0;

  const grade: FinancialHealthScore['grade'] =
    overall >= 90 ? 'A+' :
    overall >= 80 ? 'A' :
    overall >= 70 ? 'B+' :
    overall >= 60 ? 'B' :
    overall >= 45 ? 'C' :
    overall >= 30 ? 'D' : 'F';

  return {
    overall,
    grade,
    breakdown: { savingsScore, debtScore, investmentScore, budgetScore },
    metrics: {
      savingsRate,
      debtToIncomeRatio,
      investmentRate,
      budgetAdherence: budgetScore * 4, // scale to 0-100
      emergencyFundMonths,
      monthlyEmiTotal,
    },
  };
};

// ─── NET WORTH CALCULATION ───────────────────────────────────

export const calculateNetWorth = (
  accounts: BankAccount[],
  loans: SavedLoan[],
  investmentEntries: Entry[],
): NetWorthSummary => {
  const activeAccounts = accounts.filter(a => a.isActive);
  const activeLoans = loans.filter(l => l.isActive);

  // Assets
  const liquidAssets = activeAccounts
    .filter(a => ['savings', 'current', 'salary', 'wallet', 'cash'].includes(a.accountType))
    .reduce((s, a) => s + a.manualBalance, 0);

  const fixedAssets = activeAccounts
    .filter(a => a.accountType === 'fixed_deposit')
    .reduce((s, a) => s + a.manualBalance, 0);

  // Investment entries (cumulative from all time)
  const investmentAssets = investmentEntries.reduce((s, e) => s + e.amount, 0);

  const totalAssets = liquidAssets + fixedAssets + investmentAssets;

  // Liabilities
  const creditCardDebt = activeAccounts
    .filter(a => a.accountType === 'credit_card')
    .reduce((s, a) => s + a.manualBalance, 0);

  // Outstanding loan amounts (simplified: original amount - estimated paid)
  const loanLiabilities = activeLoans.reduce((s, l) => {
    const disbDate = new Date(l.disbursementDate);
    const now = new Date();
    const monthsPaid = Math.max(0, (now.getFullYear() - disbDate.getFullYear()) * 12 + (now.getMonth() - disbDate.getMonth()));
    const principalPaid = estimatePrincipalPaid(l.loanAmount, l.interestRate, l.tenureMonths, monthsPaid);
    return s + Math.max(0, l.loanAmount - principalPaid);
  }, 0);

  const totalLiabilities = creditCardDebt + loanLiabilities;
  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  // Breakdown for charts
  const assetBreakdown: NetWorthSummary['assetBreakdown'] = [];
  if (liquidAssets > 0) assetBreakdown.push({ label: 'expenses.liquidAssets', value: liquidAssets, color: '#3b82f6', icon: '💰' });
  if (fixedAssets > 0) assetBreakdown.push({ label: 'expenses.fixedDeposits', value: fixedAssets, color: '#8b5cf6', icon: '🏦' });
  if (investmentAssets > 0) assetBreakdown.push({ label: 'expenses.investments', value: investmentAssets, color: '#10b981', icon: '📈' });

  const liabilityBreakdown: NetWorthSummary['liabilityBreakdown'] = [];
  if (creditCardDebt > 0) liabilityBreakdown.push({ label: 'expenses.creditCardDebt', value: creditCardDebt, color: '#ef4444', icon: '💳' });

  activeLoans.forEach(l => {
    const meta = LOAN_TYPE_META[l.loanType];
    const disbDate = new Date(l.disbursementDate);
    const now = new Date();
    const monthsPaid = Math.max(0, (now.getFullYear() - disbDate.getFullYear()) * 12 + (now.getMonth() - disbDate.getMonth()));
    const outstanding = Math.max(0, l.loanAmount - estimatePrincipalPaid(l.loanAmount, l.interestRate, l.tenureMonths, monthsPaid));
    if (outstanding > 0) {
      liabilityBreakdown.push({
        label: l.nickName,
        value: outstanding,
        color: meta.color,
        icon: meta.icon,
      });
    }
  });

  return {
    totalAssets, liquidAssets, fixedAssets, investmentAssets,
    totalLiabilities, loanLiabilities, creditCardDebt,
    netWorth, debtToAssetRatio,
    assetBreakdown, liabilityBreakdown,
  };
};

// Estimate principal paid using reducing balance amortization
const estimatePrincipalPaid = (principal: number, annualRate: number, tenureMonths: number, monthsPaid: number): number => {
  if (monthsPaid <= 0 || annualRate <= 0 || tenureMonths <= 0) return 0;
  const r = annualRate / 12 / 100;
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  let balance = principal;
  const months = Math.min(monthsPaid, tenureMonths);
  for (let i = 0; i < months; i++) {
    const interest = balance * r;
    const principalPart = emi - interest;
    balance -= principalPart;
  }
  return principal - Math.max(0, balance);
};

// ─── SPENDING INSIGHTS ENGINE ────────────────────────────────

export const generateInsights = (
  currentSummary: PeriodSummary,
  previousSummary: PeriodSummary | null,
  budget: Budget | undefined,
  healthScore: FinancialHealthScore,
): SpendingInsight[] => {
  const insights: SpendingInsight[] = [];

  // 1. Expense spike detection
  if (previousSummary && previousSummary.totalExpenses > 0) {
    const expenseChange = calculatePercentChange(currentSummary.totalExpenses, previousSummary.totalExpenses);
    if (expenseChange > 20) {
      insights.push({
        type: 'warning',
        titleKey: 'expenses.insightExpenseSpike',
        descKey: 'expenses.insightExpenseSpikeDesc',
        value: `+${expenseChange.toFixed(0)}%`,
        icon: '📈',
      });
    } else if (expenseChange < -10) {
      insights.push({
        type: 'positive',
        titleKey: 'expenses.insightExpenseDrop',
        descKey: 'expenses.insightExpenseDropDesc',
        value: `${expenseChange.toFixed(0)}%`,
        icon: '📉',
      });
    }
  }

  // 2. Savings rate insight
  if (currentSummary.savingsRate < 10 && currentSummary.totalIncome > 0) {
    insights.push({
      type: 'warning',
      titleKey: 'expenses.insightLowSavings',
      descKey: 'expenses.insightLowSavingsDesc',
      value: fmtPct(currentSummary.savingsRate),
      icon: '⚠️',
    });
  } else if (currentSummary.savingsRate >= 30) {
    insights.push({
      type: 'positive',
      titleKey: 'expenses.insightGreatSavings',
      descKey: 'expenses.insightGreatSavingsDesc',
      value: fmtPct(currentSummary.savingsRate),
      icon: '🌟',
    });
  }

  // 3. Debt-to-income warning
  if (healthScore.metrics.debtToIncomeRatio > 40) {
    insights.push({
      type: 'warning',
      titleKey: 'expenses.insightHighDebt',
      descKey: 'expenses.insightHighDebtDesc',
      value: `${healthScore.metrics.debtToIncomeRatio.toFixed(0)}%`,
      icon: '🏦',
    });
  }

  // 4. Emergency fund
  if (healthScore.metrics.emergencyFundMonths < 3) {
    insights.push({
      type: 'warning',
      titleKey: 'expenses.insightLowEmergency',
      descKey: 'expenses.insightLowEmergencyDesc',
      value: `${healthScore.metrics.emergencyFundMonths.toFixed(1)} mo`,
      icon: '🛡️',
    });
  } else if (healthScore.metrics.emergencyFundMonths >= 6) {
    insights.push({
      type: 'positive',
      titleKey: 'expenses.insightStrongEmergency',
      descKey: 'expenses.insightStrongEmergencyDesc',
      value: `${healthScore.metrics.emergencyFundMonths.toFixed(1)} mo`,
      icon: '✅',
    });
  }

  // 5. Budget overrun
  if (budget && currentSummary.budgetVariance > 0) {
    insights.push({
      type: 'warning',
      titleKey: 'expenses.insightOverBudget',
      descKey: 'expenses.insightOverBudgetDesc',
      value: fmtINR(currentSummary.budgetVariance),
      icon: '💸',
    });
  }

  // 6. Top category change
  if (previousSummary && currentSummary.expenseByCategory.length > 0) {
    const topCat = currentSummary.expenseByCategory[0];
    const prevTopCat = previousSummary.expenseByCategory.find(c => c.categoryId === topCat.categoryId);
    if (prevTopCat && prevTopCat.amount > 0) {
      const catChange = calculatePercentChange(topCat.amount, prevTopCat.amount);
      if (catChange > 30) {
        insights.push({
          type: 'info',
          titleKey: 'expenses.insightTopCatSpike',
          descKey: 'expenses.insightTopCatSpikeDesc',
          value: `${topCat.categoryIcon} +${catChange.toFixed(0)}%`,
          icon: '🔥',
        });
      }
    }
  }

  // 7. Investment rate
  if (currentSummary.investmentRate > 0 && currentSummary.investmentRate < 10) {
    insights.push({
      type: 'info',
      titleKey: 'expenses.insightLowInvestment',
      descKey: 'expenses.insightLowInvestmentDesc',
      value: fmtPct(currentSummary.investmentRate),
      icon: '📊',
    });
  }

  return insights;
};
