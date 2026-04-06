import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, PiggyBank, BarChart3, ArrowDownCircle, ArrowUpCircle, Landmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppColors } from '../../theme/useAppColors';
import type { Entry, Budget, CategoryLimit } from '../../types/expense';
import { ALL_DEFAULT_CATEGORIES } from '../../types/expense';
import { getEntriesForMonth, getBudgetForMonth, getCustomCategories } from '../../utils/expenseStorage';
import {
  calculateSummary,
  buildWeeklyBreakdown,
  getMonthRange,
  fmtINR,
  fmtPct,
  formatFullDate,
  getCategorySpentVsBudget,
  type PeriodSummary,
  type CategoryTotal,
  type WeeklySummary,
} from '../../utils/expenseCalculations';

// ─── Types ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TFn = (key: string, options?: any) => string;

type SubTab = 'expenses' | 'income' | 'investments';

const SUB_TAB_CONFIG: { id: SubTab; labelKey: string; icon: string; accentClass: string; bgClass: string }[] = [
  { id: 'expenses', labelKey: 'expenses.expenses', icon: '💸', accentClass: 'text-red-400', bgClass: 'bg-red-500' },
  { id: 'income', labelKey: 'expenses.income', icon: '💰', accentClass: 'text-emerald-400', bgClass: 'bg-emerald-500' },
  { id: 'investments', labelKey: 'expenses.investments', icon: '📈', accentClass: 'text-blue-400', bgClass: 'bg-blue-500' },
];

// ─── Component ───────────────────────────────────────────────

export default function MonthlyTab() {
  const { t } = useTranslation();
  const c = useAppColors();

  const [monthOffset, setMonthOffset] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('expenses');

  // ── Derived data ──

  const monthRange = useMemo(() => getMonthRange(monthOffset), [monthOffset]);

  const entries = useMemo(
    () => getEntriesForMonth(monthRange.year, monthRange.month),
    [monthRange.year, monthRange.month],
  );

  const budget = useMemo(
    () => getBudgetForMonth(monthRange.monthStr),
    [monthRange.monthStr],
  );

  const summary = useMemo(
    () => calculateSummary(entries, budget),
    [entries, budget],
  );

  const weeklyBreakdown = useMemo(
    () => buildWeeklyBreakdown(entries, monthRange.year, monthRange.month),
    [entries, monthRange.year, monthRange.month],
  );

  const budgetComparison = useMemo(
    () => (budget ? getCategorySpentVsBudget(entries, budget) : []),
    [entries, budget],
  );

  const allCategories = useMemo(() => [...ALL_DEFAULT_CATEGORIES, ...getCustomCategories()], []);

  const isCurrentMonth = monthOffset === 0;

  // ── Top 5 transactions for each sub-tab ──

  const topTransactions = useMemo(() => {
    const typeMap: Record<SubTab, string> = { expenses: 'expense', income: 'income', investments: 'investment' };
    const filtered = entries
      .filter(e => e.type === typeMap[activeSubTab])
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    return filtered;
  }, [entries, activeSubTab]);

  // ── Helpers ──

  const getCatInfo = (categoryId: string) => {
    const cat = allCategories.find(c => c.id === categoryId);
    return {
      name: cat?.name ?? categoryId,
      icon: cat?.icon ?? '📦',
      color: cat?.color ?? '#94a3b8',
    };
  };

  const maxWeekExpense = Math.max(...weeklyBreakdown.map(w => w.expenses), 1);

  // ── Budget totals ──

  const budgetTotal = budget
    ? budget.categoryLimits.reduce((s, l) => s + l.monthlyLimit, 0)
      + budget.fixedExpenses.reduce((s, f) => s + f.amount, 0)
    : 0;

  const budgetDiff = budgetTotal - summary.totalExpenses;

  return (
    <div className="space-y-4 pb-6">
      {/* ── Month Navigator ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMonthOffset(o => o - 1)}
          className="p-2 rounded-xl"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
        >
          <ChevronLeft size={18} style={{ color: c.textSecondary }} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-bold" style={{ color: c.text }}>{monthRange.label}</p>
          {isCurrentMonth && (
            <p className="text-[10px] font-semibold text-brand-purple">
              {t('expenses.thisMonth')}
            </p>
          )}
        </div>
        <button
          onClick={() => setMonthOffset(o => o + 1)}
          disabled={isCurrentMonth}
          className="p-2 rounded-xl disabled:opacity-30"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
        >
          <ChevronRight size={18} style={{ color: c.textSecondary }} />
        </button>
      </div>

      {/* ── Cash Flow Card ── */}
      <CashFlowCard summary={summary} c={c} t={t} />

      {/* ── Budget vs Actual ── */}
      {budget && budgetTotal > 0 && (
        <BudgetVsActualCard
          budget={budget}
          budgetTotal={budgetTotal}
          actualTotal={summary.totalExpenses}
          budgetDiff={budgetDiff}
          budgetComparison={budgetComparison}
          allCategories={allCategories}
          c={c}
          t={t}
        />
      )}

      {/* ── Week-by-Week Breakdown ── */}
      {weeklyBreakdown.length > 0 && (
        <WeeklyBreakdownCard
          weeks={weeklyBreakdown}
          maxExpense={maxWeekExpense}
          c={c}
          t={t}
        />
      )}

      {/* ── Sub-tab Switcher ── */}
      <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
        {SUB_TAB_CONFIG.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === tab.id
                ? `${tab.bgClass} text-white shadow`
                : ''
            }`}
            style={activeSubTab !== tab.id ? { color: c.textSecondary } : undefined}
          >
            {tab.icon} {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* ── Sub-tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeSubTab === 'expenses' && (
            <CategoryBreakdown
              categories={summary.expenseByCategory}
              total={summary.totalExpenses}
              type="expense"
              topTransactions={topTransactions}
              getCatInfo={getCatInfo}
              c={c}
              t={t}
            />
          )}
          {activeSubTab === 'income' && (
            <CategoryBreakdown
              categories={summary.incomeByCategory}
              total={summary.totalIncome}
              type="income"
              topTransactions={topTransactions}
              getCatInfo={getCatInfo}
              c={c}
              t={t}
            />
          )}
          {activeSubTab === 'investments' && (
            <CategoryBreakdown
              categories={summary.investmentByCategory}
              total={summary.totalInvestments}
              type="investment"
              topTransactions={topTransactions}
              getCatInfo={getCatInfo}
              c={c}
              t={t}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ─── Cash Flow Card ──────────────────────────────────────────

interface CashFlowCardProps {
  summary: PeriodSummary;
  c: ReturnType<typeof useAppColors>;
  t: TFn;
}

function CashFlowCard({ summary, c, t }: CashFlowCardProps) {
  const netSavings = summary.netSavings;
  const savingsRate = summary.savingsRate;
  const isPositive = netSavings >= 0;

  const rows = [
    {
      label: t('expenses.totalIncome'),
      value: fmtINR(summary.totalIncome),
      icon: <ArrowDownCircle size={16} className="text-emerald-400" />,
      valueColor: '#22c55e',
    },
    {
      label: t('expenses.totalExpenses'),
      value: `-${fmtINR(summary.totalExpenses)}`,
      icon: <ArrowUpCircle size={16} className="text-red-400" />,
      valueColor: '#ef4444',
    },
    {
      label: t('expenses.totalInvestments'),
      value: `-${fmtINR(summary.totalInvestments)}`,
      icon: <Landmark size={16} className="text-blue-400" />,
      valueColor: '#3b82f6',
    },
  ];

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: c.isDark
          ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        border: `1px solid ${c.border}`,
      }}
    >
      {/* Decorative gradient accent */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }}
      />

      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}>
        <Wallet size={16} className="text-brand-purple" />
        {t('expenses.cashFlow')}
      </h3>

      <div className="space-y-2">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {row.icon}
              <span className="text-xs font-medium" style={{ color: c.textSecondary }}>{row.label}</span>
            </div>
            <span className="text-sm font-bold" style={{ color: row.valueColor }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="my-3" style={{ borderTop: `1px dashed ${c.border}` }} />

      {/* Net Savings */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiggyBank size={16} style={{ color: isPositive ? '#22c55e' : '#ef4444' }} />
          <span className="text-xs font-bold" style={{ color: c.text }}>{t('expenses.netSavings')}</span>
        </div>
        <span className="text-base font-extrabold" style={{ color: isPositive ? '#22c55e' : '#ef4444' }}>
          {fmtINR(netSavings)}
        </span>
      </div>

      {/* Savings Rate */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] font-medium" style={{ color: c.textSecondary }}>{t('expenses.savingsRate')}</span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: isPositive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            color: isPositive ? '#22c55e' : '#ef4444',
          }}
        >
          {fmtPct(savingsRate)}
        </span>
      </div>
    </div>
  );
}

// ─── Budget vs Actual Card ───────────────────────────────────

interface BudgetVsActualCardProps {
  budget: Budget;
  budgetTotal: number;
  actualTotal: number;
  budgetDiff: number;
  budgetComparison: Array<{ categoryId: string; budgeted: number; spent: number; pct: number }>;
  allCategories: { id: string; name: string; icon: string; color: string }[];
  c: ReturnType<typeof useAppColors>;
  t: TFn;
}

function BudgetVsActualCard({ budget, budgetTotal, actualTotal, budgetDiff, budgetComparison, allCategories, c, t }: BudgetVsActualCardProps) {
  const isUnder = budgetDiff >= 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}>
        <BarChart3 size={16} className="text-brand-purple" />
        {t('expenses.budgetVsActual')}
      </h3>

      {/* Summary row */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs" style={{ color: c.textSecondary }}>
          <span className="font-medium">{t('expenses.budgetSet')}: </span>
          <span className="font-bold" style={{ color: c.text }}>{fmtINR(budgetTotal)}</span>
        </div>
        <div className="text-xs" style={{ color: c.textSecondary }}>
          <span className="font-medium">{t('expenses.actual')}: </span>
          <span className="font-bold" style={{ color: c.text }}>{fmtINR(actualTotal)}</span>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex justify-center mb-3">
        <span
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{
            backgroundColor: isUnder ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            color: isUnder ? '#22c55e' : '#ef4444',
          }}
        >
          {isUnder
            ? `${fmtINR(budgetDiff)} ${t('expenses.underBudget')}`
            : `${fmtINR(Math.abs(budgetDiff))} ${t('expenses.overBudget')}`
          }
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: c.isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((actualTotal / budgetTotal) * 100, 100)}%` }}
          transition={{ duration: 0.6 }}
          className="h-full rounded-full"
          style={{ backgroundColor: isUnder ? '#22c55e' : '#ef4444' }}
        />
      </div>

      {/* Toggle category details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[11px] font-semibold text-brand-purple w-full text-center"
      >
        {expanded ? t('expenses.hideCategoryDetails') : t('expenses.showCategoryDetails')}
      </button>

      {/* Per-category progress */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 mt-3">
              {budgetComparison.map(item => {
                const cat = allCategories.find(c => c.id === item.categoryId);
                const isOver = item.spent > item.budgeted;
                return (
                  <div key={item.categoryId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{cat?.icon ?? '📦'}</span>
                        <span className="text-[11px] font-medium" style={{ color: c.text }}>
                          {cat?.name ?? item.categoryId}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: isOver ? '#ef4444' : '#22c55e' }}>
                        {fmtINR(item.spent)} / {fmtINR(item.budgeted)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: c.isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(item.pct, 100)}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: isOver ? '#ef4444' : (cat?.color ?? '#8b5cf6') }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Weekly Breakdown Card ───────────────────────────────────

interface WeeklyBreakdownCardProps {
  weeks: WeeklySummary[];
  maxExpense: number;
  c: ReturnType<typeof useAppColors>;
  t: TFn;
}

function WeeklyBreakdownCard({ weeks, maxExpense, c, t }: WeeklyBreakdownCardProps) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>
        {t('expenses.weekByWeek')}
      </h3>
      <div className="space-y-2.5">
        {weeks.map((week, idx) => {
          const pct = maxExpense > 0 ? (week.expenses / maxExpense) * 100 : 0;
          return (
            <div key={week.weekNumber} className="flex items-center gap-3">
              <div className="w-20 flex-shrink-0">
                <p className="text-[11px] font-bold" style={{ color: c.text }}>
                  {t('expenses.weekN', { n: week.weekNumber })}
                </p>
                <p className="text-[9px]" style={{ color: c.textSecondary }}>{week.label}</p>
              </div>
              <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: c.isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: pct === 100 ? '#ef4444' : 'rgba(239,68,68,0.5)',
                  }}
                />
              </div>
              <span className="text-xs font-bold min-w-[70px] text-right" style={{ color: week.expenses > 0 ? '#ef4444' : c.textSecondary }}>
                {week.expenses > 0 ? fmtINR(week.expenses) : '---'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Category Breakdown + Top Transactions ───────────────────

interface CategoryBreakdownProps {
  categories: CategoryTotal[];
  total: number;
  type: 'expense' | 'income' | 'investment';
  topTransactions: Entry[];
  getCatInfo: (id: string) => { name: string; icon: string; color: string };
  c: ReturnType<typeof useAppColors>;
  t: TFn;
}

function CategoryBreakdown({ categories, total, type, topTransactions, getCatInfo, c, t }: CategoryBreakdownProps) {
  const accentColor = type === 'expense' ? '#ef4444' : type === 'income' ? '#22c55e' : '#3b82f6';
  const titleKey =
    type === 'expense' ? 'expenses.spendingByCategory'
    : type === 'income' ? 'expenses.incomeBySource'
    : 'expenses.investmentByType';
  const topTitleKey =
    type === 'expense' ? 'expenses.topExpenses'
    : type === 'income' ? 'expenses.topIncome'
    : 'expenses.topInvestments';

  if (categories.length === 0 && topTransactions.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
        <p className="text-3xl mb-2">
          {type === 'expense' ? '🌿' : type === 'income' ? '📭' : '🏦'}
        </p>
        <p className="text-sm" style={{ color: c.textSecondary }}>{t('expenses.noEntriesThisMonth')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category list */}
      {categories.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t(titleKey)}</h3>
          <div className="space-y-3">
            {categories.map((cat, idx) => (
              <div key={cat.categoryId} className="flex items-center gap-3">
                <span className="text-lg flex-shrink-0">{cat.categoryIcon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold truncate" style={{ color: c.text }}>{cat.categoryName}</span>
                    <span className="text-[10px] font-medium ml-2" style={{ color: c.textSecondary }}>{fmtPct(cat.percentage)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: c.isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percentage}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.05 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: cat.categoryColor }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold min-w-[65px] text-right" style={{ color: c.text }}>
                  {fmtINR(cat.amount)}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px dashed ${c.border}` }}>
            <span className="text-xs font-bold" style={{ color: c.textSecondary }}>{t('expenses.total')}</span>
            <span className="text-sm font-extrabold" style={{ color: accentColor }}>{fmtINR(total)}</span>
          </div>
        </div>
      )}

      {/* Top Transactions */}
      {topTransactions.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t(topTitleKey)}</h3>
          <div className="space-y-2">
            {topTransactions.map(entry => {
              const catInfo = getCatInfo(entry.category);
              return (
                <div key={entry.id} className="flex items-center gap-3 py-1.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                    style={{ backgroundColor: c.isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}
                  >
                    {catInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: c.text }}>{entry.description || catInfo.name}</p>
                    <p className="text-[10px]" style={{ color: c.textSecondary }}>{formatFullDate(entry.date)}</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: accentColor }}>
                    {type === 'income' ? '+' : '-'}{fmtINR(entry.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Investment monthly rate insight */}
      {type === 'investment' && total > 0 && categories.length > 0 && (
        <div
          className="rounded-2xl p-3"
          style={{
            backgroundColor: c.isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)',
            border: `1px solid ${c.isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.15)'}`,
          }}
        >
          <p className="text-[11px] leading-relaxed" style={{ color: c.isDark ? '#93c5fd' : '#1d4ed8' }}>
            {t('expenses.investmentInsight', {
              total: fmtINR(total),
              count: categories.length,
              rate: fmtPct(
                categories.length > 0
                  ? (categories[0].amount / total) * 100
                  : 0,
              ),
              top: categories[0]?.categoryName ?? '',
            })}
          </p>
        </div>
      )}
    </div>
  );
}
