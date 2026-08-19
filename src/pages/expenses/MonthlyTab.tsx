import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  PiggyBank,
  BarChart3,
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Flame,
  Info,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useExpenseTheme, getSavingsRating, getBudgetStatus, formatChange, TYPE_COLORS } from '../../theme/expenseTheme';
import { getEntriesForDateRange, getBudgetForMonth, getCategoryById, deleteEntriesInRange } from '../../utils/expenseStorage';
import {
  calculateSummary,
  buildWeeklyBreakdown,
  getMonthRange,
  getMonthStartDay,
  fmtINR,
  fmtPct,
  formatFullDate,
  getCategorySpentVsBudget,
  getHighestSpendingDay,
  getActiveDaysCount,
  calculatePercentChange,
  getUnloggedSubsForRange,
  calcPeriodChange,
  getTodayStr,
} from '../../utils/expenseCalculations';
// Bridge subscription store so the cash flow / budget vs actual / week
// breakdown can include recurring sub billings (BUG 2.1, 2.2, 2.4 fix).
import { useBudgetTrackerStore } from '../../store/useBudgetTrackerStore';
import type { Entry } from '../../types/expense';
import { ALL_DEFAULT_CATEGORIES } from '../../types/expense';
import { getCustomCategories } from '../../utils/expenseStorage';
import type { PeriodSummary, CategoryTotal, WeeklySummary } from '../../utils/expenseCalculations';
import { todayStr } from '../../utils/dateUtils';

// ─── Types ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TFn = (key: string, options?: any) => string;
type SubTab = 'expenses' | 'income' | 'investments';

const SUB_TAB_CONFIG: { id: SubTab; labelKey: string; icon: React.ReactNode; accentLight: string; accentDark: string; bgLight: string; bgDark: string }[] = [
  {
    id: 'expenses',
    labelKey: 'expenses.expenses',
    icon: <ArrowUpCircle size={14} />,
    accentLight: '#DC2626',
    accentDark: '#f87171',
    bgLight: '#FFF5F5',
    bgDark: '#450a0a',
  },
  {
    id: 'income',
    labelKey: 'expenses.income',
    icon: <ArrowDownCircle size={14} />,
    accentLight: '#16A34A',
    accentDark: '#4ade80',
    bgLight: '#F0FDF4',
    bgDark: '#052e16',
  },
  {
    id: 'investments',
    labelKey: 'expenses.investments',
    icon: <Landmark size={14} />,
    accentLight: '#7C3AED',
    accentDark: '#a78bfa',
    bgLight: '#F5F3FF',
    bgDark: '#1e1b4b',
  },
];

// ─── Helpers ─────────────────────────────────────────────────

function getBarColor(pct: number): string {
  if (pct > 100) return '#DC2626';
  if (pct >= 90) return '#EA580C';
  if (pct >= 70) return '#D97706';
  return '#16A34A';
}

function isCurrentWeek(startDate: string, endDate: string): boolean {
  const today = todayStr();
  return today >= startDate && today <= endDate;
}

// ─── Component ───────────────────────────────────────────────

// `refreshKey` is bumped by ExpenseTracker when the global FAB saves an entry,
// forcing useMemo deps to invalidate and re-fetch from storage.
//
// `onEditEntry` is the parent's edit handler — tapping a top-transaction row
// calls it with the full Entry, opening the shared AddEntrySheet in edit mode.
interface MonthlyTabProps {
  refreshKey?: number;
  onEditEntry?: (entry: Entry) => void;
}

export default function MonthlyTab({ refreshKey = 0, onEditEntry }: MonthlyTabProps) {
  const { t } = useTranslation();
  const theme = useExpenseTheme();
  const isDark = theme.isDark;

  const [monthOffset, setMonthOffset] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('expenses');
  const [budgetExpanded, setBudgetExpanded] = useState(false);
  const [showClearAll, setShowClearAll] = useState(false);
  const [localRefresh, setLocalRefresh] = useState(0);

  // ── Derived data ──

  // Salary-cycle month start day (1 = calendar months, the default).
  // Read on every render — cheap, and the tab re-mounts on tab switches
  // so a change made in the Budget tab is picked up immediately.
  const monthStartDay = getMonthStartDay();

  const monthRange = useMemo(() => getMonthRange(monthOffset), [monthOffset, monthStartDay]);

  // Range-based fetch. For monthStartDay = 1 this is IDENTICAL to the
  // previous getEntriesForMonth(year, month): monthRange.start/end are
  // exactly 'YYYY-MM-01'..'YYYY-MM-<lastDay>' and entry dates are always
  // zero-padded 'YYYY-MM-DD', so the string-range filter selects the
  // same set as the startsWith('YYYY-MM') filter did.
  const entries = useMemo(
    () => getEntriesForDateRange(monthRange.start, monthRange.end),
    [monthRange.start, monthRange.end, refreshKey, localRefresh],
  );

  /* ── clear all entries for the month ── */
  const handleClearAllMonth = () => {
    // monthRange.start/end are the same strings the previous inline
    // calendar computation produced when monthStartDay = 1, and the
    // cycle window otherwise — so "Clear All" always clears exactly
    // what the tab is displaying.
    deleteEntriesInRange(monthRange.start, monthRange.end);
    setShowClearAll(false);
    setLocalRefresh(k => k + 1);
  };

  const prevMonthRange = useMemo(() => getMonthRange(monthOffset - 1), [monthOffset, monthStartDay]);
  const prevEntries = useMemo(
    () => getEntriesForDateRange(prevMonthRange.start, prevMonthRange.end),
    [prevMonthRange.start, prevMonthRange.end, refreshKey],
  );

  const budget = useMemo(
    () => getBudgetForMonth(monthRange.monthStr),
    [monthRange.monthStr, refreshKey],
  );

  const summary = useMemo(
    () => calculateSummary(entries, budget),
    [entries, budget],
  );

  const prevSummary = useMemo(
    () => calculateSummary(prevEntries),
    [prevEntries],
  );

  // Weekly breakdown inside the month. Default path (monthStartDay = 1)
  // calls buildWeeklyBreakdown exactly as before; for salary cycles we
  // pass the cycle window so weeks tile the cycle, not the calendar month.
  const weeklyBreakdown = useMemo(
    () => monthStartDay === 1
      ? buildWeeklyBreakdown(entries, monthRange.year, monthRange.month)
      : buildWeeklyBreakdown(entries, monthRange.year, monthRange.month, {
          start: monthRange.start,
          end: monthRange.end,
        }),
    [entries, monthRange.year, monthRange.month, monthRange.start, monthRange.end, monthStartDay],
  );

  // BUG 2.3 fix: filter out weeks whose start date is after today.
  // Past weeks always show; the current week shows with a "Current"
  // indicator (the card already handles that via isCurrentWeek).
  const visibleWeeks = useMemo(
    () => weeklyBreakdown.filter(w => w.startDate <= getTodayStr()),
    [weeklyBreakdown],
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
    return entries
      .filter(e => e.type === typeMap[activeSubTab])
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [entries, activeSubTab]);

  // ── Helpers ──

  const getCatInfo = (categoryId: string) => {
    const cat = allCategories.find(c => c.id === categoryId);
    return {
      name: cat?.name ?? categoryId,
      icon: cat?.icon ?? '\uD83D\uDCE6',
      color: cat?.color ?? '#94a3b8',
    };
  };

  // Use visibleWeeks for the bar scaling so a hidden future week (with
  // 0 expenses) can't accidentally inflate the denominator.
  const maxWeekExpense = Math.max(...visibleWeeks.map(w => w.expenses), 1);

  // ── Budget totals ──

  const budgetTotal = budget
    ? budget.categoryLimits.reduce((s, l) => s + l.monthlyLimit, 0)
      + budget.fixedExpenses.reduce((s, f) => s + f.amount, 0)
    : 0;

  // ── BUG 2.1, 2.2, 2.4: Subscription-aware totals ─────────
  // The CANONICAL "Total Expenses" for any month is logged expenses
  // PLUS subscription billings whose date already passed in the
  // selected month. This makes the Cash Flow card, Budget vs Actual
  // card, and the vs-last-month change all consistent with the PDF.
  const subscriptions = useBudgetTrackerStore(s => s.subscriptions);
  const todayISO = getTodayStr();

  const monthSubsBilled = useMemo(
    () => getUnloggedSubsForRange(
      entries,
      subscriptions,
      monthRange.start,
      monthRange.end,
      todayISO,
    ),
    [entries, subscriptions, monthRange.start, monthRange.end, todayISO],
  );
  const monthSubsCount = useMemo(
    () => subscriptions.filter(s => s.isActive).length,
    [subscriptions],
  );

  const prevMonthSubsBilled = useMemo(
    () => getUnloggedSubsForRange(
      prevEntries,
      subscriptions,
      prevMonthRange.start,
      prevMonthRange.end,
      todayISO,
    ),
    [prevEntries, subscriptions, prevMonthRange.start, prevMonthRange.end, todayISO],
  );

  // Canonical totals — these REPLACE summary.totalExpenses /
  // summary.netSavings everywhere in the rest of the component.
  const canonicalExpenses = summary.totalExpenses + monthSubsBilled;
  const prevCanonicalExpenses = prevSummary.totalExpenses + prevMonthSubsBilled;
  // Cash net: investments also leave the wallet, so the headline "Net
  // Savings" figure subtracts them (income − expenses − investments).
  const canonicalNetSavings = summary.totalIncome - canonicalExpenses - summary.totalInvestments;

  // ── Savings & change calculations ──

  const netSavings = canonicalNetSavings;
  // Savings RATE keeps its original basis: (income − expenses) / income.
  // Investments count AS savings here, so the Excellent/Good grading
  // stays meaningful for users who invest aggressively.
  const savingsRate = summary.totalIncome > 0
    ? ((summary.totalIncome - canonicalExpenses) / summary.totalIncome) * 100
    : 0;
  const savingsRating = getSavingsRating(savingsRate);
  const isPositiveSavings = netSavings >= 0;

  const incomeChange = formatChange(summary.totalIncome, prevSummary.totalIncome);
  // BUG 2.4 fix: use the canonical (subs-included) totals for both
  // halves of the % change so the comparison label matches what the
  // user sees in the Total Expenses row.
  const expenseChangeDetail = useMemo(
    () => calcPeriodChange(canonicalExpenses, prevCanonicalExpenses),
    [canonicalExpenses, prevCanonicalExpenses],
  );
  const expenseChange = {
    display: expenseChangeDetail.display,
    isNew: expenseChangeDetail.tone === 'new',
    color: expenseChangeDetail.tone === 'down' ? theme.accentIncome
      : expenseChangeDetail.tone === 'up' ? theme.accentExpense
      : theme.textMuted,
  };

  // Card/text colors
  const textPrimary = theme.textPrimary;
  const textSecondary = theme.textSecondary;
  const textMuted = theme.textMuted;
  const bgCard = theme.bgCard;
  const bgCardElevated = theme.bgCardElevated;
  const borderSubtle = theme.borderSubtle;
  const shadowCard = theme.shadowCard;
  const shadowSoft = theme.shadowSoft;
  const accentGold = theme.accentGold;
  const accentIncome = theme.accentIncome;
  const accentExpense = theme.accentExpense;
  const accentInvestment = theme.accentInvestment;

  return (
    <div className="space-y-5 pb-8">

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 1. MONTH NAVIGATOR                                         */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setMonthOffset(o => o - 1)}
          className="p-2.5 rounded-2xl backdrop-blur-sm transition-colors"
          style={{
            backgroundColor: bgCard,
            border: `1px solid ${borderSubtle}`,
            boxShadow: shadowSoft,
          }}
        >
          <ChevronLeft size={18} style={{ color: textSecondary }} />
        </motion.button>

        <motion.div
          key={monthRange.label}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, #1B3A2D 0%, #1e293b 100%)'
              : 'linear-gradient(135deg, #F7F4EF 0%, #FEFCF8 100%)',
            border: `1px solid ${borderSubtle}`,
            boxShadow: shadowSoft,
          }}
        >
          <Calendar size={15} style={{ color: accentGold }} />
          <span className="text-sm font-bold tracking-wide" style={{ color: textPrimary }}>
            {monthRange.label}
          </span>
          {isCurrentMonth && (
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: isDark ? 'rgba(74,222,128,0.15)' : 'rgba(22,163,74,0.1)',
                color: accentIncome,
              }}
            >
              {t('expenses.thisMonth')}
            </span>
          )}
        </motion.div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setMonthOffset(o => o + 1)}
          disabled={isCurrentMonth}
          className="p-2.5 rounded-2xl backdrop-blur-sm transition-colors disabled:opacity-30"
          style={{
            backgroundColor: bgCard,
            border: `1px solid ${borderSubtle}`,
            boxShadow: shadowSoft,
          }}
        >
          <ChevronRight size={18} style={{ color: textSecondary }} />
        </motion.button>
      </div>

      {/* Clear All button */}
      {entries.length > 0 && (
        <div className="flex justify-end">
          <button onClick={() => setShowClearAll(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold" style={{ color: theme.accentExpense, backgroundColor: theme.accentExpense + '15' }}>
            <Trash2 size={11} /> {t('expenses.clearAllEntries', 'Clear All')}
          </button>
        </div>
      )}

      {/* Clear All confirmation */}
      <AnimatePresence>
        {showClearAll && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10001] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={() => setShowClearAll(false)}>
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }} className="w-full max-w-xs rounded-2xl p-6" style={{ backgroundColor: bgCard, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
              <p className="font-bold text-base mb-2" style={{ color: textPrimary }}>{t('expenses.clearAllTitle', 'Clear All Entries?')}</p>
              <p className="text-sm mb-5" style={{ color: textSecondary }}>{t('expenses.clearAllMonthMsg', 'All entries for this month will be deleted. This cannot be undone.')}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowClearAll(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: borderSubtle, color: textSecondary }}>{t('common.cancel', 'Cancel')}</button>
                <button onClick={handleClearAllMonth} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: theme.accentExpense }}>{t('expenses.clearAll', 'Clear All')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 2. CASH FLOW HERO CARD                                     */}
      {/* ════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl p-5 relative overflow-hidden"
        style={{
          background: isDark
            ? 'linear-gradient(145deg, #1B3A2D 0%, #0F1923 50%, #1e1b4b 100%)'
            : 'linear-gradient(145deg, #F7F4EF 0%, #FEFCF8 50%, #F5F3FF 100%)',
          border: `1px solid ${borderSubtle}`,
          boxShadow: shadowCard,
        }}
      >
        {/* Decorative orbs */}
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #D97706, transparent)' }}
        />
        <div
          className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #16A34A, transparent)' }}
        />

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(217,119,6,0.3), rgba(217,119,6,0.1))'
                : 'linear-gradient(135deg, rgba(217,119,6,0.15), rgba(217,119,6,0.05))',
            }}
          >
            <Wallet size={16} style={{ color: accentGold }} />
          </div>
          <h3 className="text-sm font-bold tracking-wide" style={{ color: textPrimary }}>
            {monthRange.label} {t('expenses.cashFlow')}
          </h3>
        </div>

        {/* Income row */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: isDark ? 'rgba(74,222,128,0.1)' : 'rgba(22,163,74,0.08)' }}
            >
              <ArrowDownCircle size={14} style={{ color: accentIncome }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: textSecondary }}>
              {t('expenses.totalIncome')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: accentIncome }}>
              {fmtINR(summary.totalIncome)}
            </span>
            {!incomeChange.isNew && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  backgroundColor: isDark ? 'rgba(74,222,128,0.1)' : 'rgba(22,163,74,0.08)',
                  color: summary.totalIncome >= prevSummary.totalIncome ? accentIncome : accentExpense,
                }}
              >
                {incomeChange.display}
              </span>
            )}
          </div>
        </div>

        {/* Expenses row — BUG 2.1 fix: includes recurring subscriptions */}
        <div className="mb-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: isDark ? 'rgba(248,113,113,0.1)' : 'rgba(220,38,38,0.08)' }}
              >
                <ArrowUpCircle size={14} style={{ color: accentExpense }} />
              </div>
              <span className="text-xs font-semibold" style={{ color: textSecondary }}>
                {t('expenses.totalExpenses')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: accentExpense }}>
                -{fmtINR(canonicalExpenses)}
              </span>
              {!expenseChange.isNew && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{
                    backgroundColor: isDark ? 'rgba(248,113,113,0.1)' : 'rgba(220,38,38,0.08)',
                    color: expenseChange.color,
                  }}
                >
                  {expenseChange.display}
                </span>
              )}
            </div>
          </div>
          {monthSubsBilled > 0 && (
            <p className="text-[10px] mt-1 ml-9" style={{ color: textMuted }}>
              {fmtINR(summary.totalExpenses)} {t('expenses.logged', 'logged')}
              {' + '}
              {fmtINR(monthSubsBilled)} {t('expenses.recurringSubsLabel', 'recurring subscriptions')}
            </p>
          )}
        </div>

        {/* Total Invested row — money routed into investments also leaves
            the wallet, so it's shown as an outflow before Net Savings.
            Hidden when the user has no investments to keep the card clean. */}
        {summary.totalInvestments > 0 && (
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: isDark ? 'rgba(167,139,250,0.1)' : 'rgba(124,58,237,0.08)' }}
              >
                <Landmark size={14} style={{ color: accentInvestment }} />
              </div>
              <span className="text-xs font-semibold" style={{ color: textSecondary }}>
                {t('expenses.totalInvested', 'Total Invested')}
              </span>
            </div>
            <span className="text-sm font-bold" style={{ color: accentInvestment }}>
              -{fmtINR(summary.totalInvestments)}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="my-3.5 relative">
          <div style={{ borderTop: `1px dashed ${borderSubtle}` }} />
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-2 px-2 text-[9px] font-bold uppercase tracking-widest"
            style={{ backgroundColor: 'transparent', color: textMuted }}
          >
          </div>
        </div>

        {/* Net Saved */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: isPositiveSavings
                  ? (isDark ? 'rgba(74,222,128,0.12)' : 'rgba(22,163,74,0.08)')
                  : (isDark ? 'rgba(248,113,113,0.12)' : 'rgba(220,38,38,0.08)'),
              }}
            >
              <PiggyBank size={14} style={{ color: isPositiveSavings ? accentIncome : accentExpense }} />
            </div>
            <span className="text-xs font-bold" style={{ color: textPrimary }}>
              {t('expenses.netSavings')}
            </span>
          </div>
          <span
            className="text-lg font-extrabold"
            style={{ color: isPositiveSavings ? accentIncome : accentExpense }}
          >
            {isPositiveSavings ? '' : '-'}{fmtINR(Math.abs(netSavings))}
          </span>
        </div>

        {/* Savings Rate with progress bar */}
        <div className="rounded-2xl p-3" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Target size={12} style={{ color: textMuted }} />
              <span className="text-[11px] font-semibold" style={{ color: textSecondary }}>
                {t('expenses.savingsRate')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: savingsRating.color }}>
                {fmtPct(savingsRate)}
              </span>
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: isDark
                    ? `${savingsRating.color}20`
                    : `${savingsRating.color}15`,
                  color: savingsRating.color,
                }}
              >
                {savingsRating.emoji} {t(savingsRating.labelKey)}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${savingsRating.color}, ${savingsRating.color}cc)`,
              }}
            />
            {/* 20% target marker */}
            <div
              className="absolute top-0 h-full w-0.5"
              style={{ left: '20%', backgroundColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px]" style={{ color: textMuted }}>0%</span>
            <span className="text-[9px] font-semibold" style={{ color: textMuted, marginLeft: 'calc(20% - 20px)' }}>
              {t('expenses.target')} 20%
            </span>
            <span className="text-[9px] flex-1" />
          </div>
        </div>

        {/* Spending calendar heatmap — cycle-aware (works with custom month
            start days), intensity = day's expense vs the cycle's peak day. */}
        {(() => {
          const byDay = new Map<string, number>();
          for (const e of entries) {
            if (e.type === 'expense') byDay.set(e.date, (byDay.get(e.date) || 0) + e.amount);
          }
          const days: { date: string; day: number; amt: number }[] = [];
          const start = new Date(monthRange.start + 'T00:00:00');
          const end = new Date(monthRange.end + 'T00:00:00');
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            days.push({ date: iso, day: d.getDate(), amt: byDay.get(iso) || 0 });
          }
          const max = Math.max(1, ...days.map(x => x.amt));
          const todayIso = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; })();
          const peak = days.reduce((a, b) => (b.amt > a.amt ? b : a), days[0]);
          return (
            <div className="rounded-2xl p-4 border" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: textMuted }}>
                {t('expenses.spendCalendar', 'Spending calendar')}
              </p>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
                  <span key={i} className="text-center text-[9px] font-bold" style={{ color: textMuted }}>{w}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: start.getDay() }, (_, i) => <span key={`b${i}`} />)}
                {days.map(d => (
                  <div key={d.date}
                    className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-semibold ${d.date === todayIso ? 'ring-2 ring-brand-purple' : ''}`}
                    style={{
                      backgroundColor: d.amt > 0 ? `rgba(239,68,68,${0.12 + 0.55 * (d.amt / max)})` : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                      color: d.amt / max > 0.55 ? '#fff' : undefined,
                    }}
                    title={`${d.date}: ₹${Math.round(d.amt).toLocaleString('en-IN')}`}>
                    {d.day}
                  </div>
                ))}
              </div>
              {peak && peak.amt > 0 && (
                <p className="text-[10px] mt-2.5 leading-relaxed" style={{ color: textMuted }}>
                  {t('expenses.spendCalendarPeak', 'Heaviest day: {{date}} — ₹{{amt}}', {
                    date: new Date(peak.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                    amt: Math.round(peak.amt).toLocaleString('en-IN'),
                  })}
                </p>
              )}
            </div>
          );
        })()}

        {/* Investments info line — BUG 10.3 fix: when income is 0,
            "0% of income" is misleading. Show "(income not logged)"
            instead so the user knows the percentage is undefined,
            not zero. */}
        {summary.totalInvestments > 0 && (
          <div
            className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl"
            style={{
              backgroundColor: isDark ? 'rgba(167,139,250,0.08)' : 'rgba(124,58,237,0.05)',
              border: `1px solid ${isDark ? 'rgba(167,139,250,0.15)' : 'rgba(124,58,237,0.1)'}`,
            }}
          >
            <Info size={12} style={{ color: accentInvestment }} />
            <span className="text-[11px] font-medium" style={{ color: isDark ? '#c4b5fd' : '#6d28d9' }}>
              {summary.totalIncome > 0
                ? t('expenses.investedAmount', {
                    amount: fmtINR(summary.totalInvestments),
                    pct: fmtPct((summary.totalInvestments / summary.totalIncome) * 100),
                  })
                : `${t('expenses.invested', 'Invested')} ${fmtINR(summary.totalInvestments)} (${t('expenses.incomeNotLogged', 'income not logged')})`}
            </span>
          </div>
        )}
      </motion.div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 3. BUDGET VS ACTUAL                                        */}
      {/* ════════════════════════════════════════════════════════════ */}
      {/* BUG 2.2 fix: actualTotal now includes recurring subscriptions
          so the variance ties out with the Cash Flow card above. */}
      {budget && budgetTotal > 0 && (
        <BudgetVsActualCard
          budgetTotal={budgetTotal}
          actualTotal={canonicalExpenses}
          loggedActual={summary.totalExpenses}
          subsActual={monthSubsBilled}
          budgetComparison={budgetComparison}
          allCategories={allCategories}
          expanded={budgetExpanded}
          onToggle={() => setBudgetExpanded(v => !v)}
          theme={theme}
          isDark={isDark}
          t={t}
        />
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 4. WEEK-BY-WEEK BREAKDOWN                                  */}
      {/* ════════════════════════════════════════════════════════════ */}
      {/* BUG 2.3 fix: hide future weeks (whose start date is past
          today) so the user doesn't see "Week 4 ---" rows for weeks
          that haven't begun yet. The current week stays visible with
          a "Current" indicator (already handled inside the card). */}
      {visibleWeeks.length > 0 && (
        <WeeklyBreakdownCard
          weeks={visibleWeeks}
          maxExpense={maxWeekExpense}
          theme={theme}
          isDark={isDark}
          t={t}
        />
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 5. SUB-TABS                                                */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div
        className="flex gap-1 rounded-2xl p-1"
        style={{
          backgroundColor: bgCard,
          border: `1px solid ${borderSubtle}`,
          boxShadow: shadowSoft,
        }}
      >
        {SUB_TAB_CONFIG.map(tab => {
          const isActive = activeSubTab === tab.id;
          const accent = isDark ? tab.accentDark : tab.accentLight;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveSubTab(tab.id)}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
              style={
                isActive
                  ? {
                      background: isDark
                        ? `linear-gradient(135deg, ${tab.bgDark}, ${tab.bgDark}cc)`
                        : `linear-gradient(135deg, ${tab.bgLight}, ${tab.bgLight}cc)`,
                      color: accent,
                      border: `1px solid ${accent}30`,
                      boxShadow: `0 2px 8px ${accent}20`,
                    }
                  : { color: textMuted }
              }
            >
              {tab.icon}
              {t(tab.labelKey)}
            </motion.button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 6/7/8. SUB-TAB CONTENT                                     */}
      {/* ════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {activeSubTab === 'expenses' && (
            <CategoryBreakdown
              categories={summary.expenseByCategory}
              total={summary.totalExpenses}
              type="expense"
              topTransactions={topTransactions}
              onEditEntry={onEditEntry}
              getCatInfo={getCatInfo}
              theme={theme}
              isDark={isDark}
              t={t}
            />
          )}
          {activeSubTab === 'income' && (
            <CategoryBreakdown
              categories={summary.incomeByCategory}
              total={summary.totalIncome}
              type="income"
              topTransactions={topTransactions}
              onEditEntry={onEditEntry}
              getCatInfo={getCatInfo}
              theme={theme}
              isDark={isDark}
              t={t}
            />
          )}
          {activeSubTab === 'investments' && (
            <CategoryBreakdown
              categories={summary.investmentByCategory}
              total={summary.totalInvestments}
              type="investment"
              topTransactions={topTransactions}
              onEditEntry={onEditEntry}
              getCatInfo={getCatInfo}
              summary={summary}
              theme={theme}
              isDark={isDark}
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

// ─── Budget vs Actual Card ───────────────────────────────────

interface BudgetVsActualCardProps {
  budgetTotal: number;
  actualTotal: number;
  /** Logged-only portion of `actualTotal` — used to render the breakdown
   *  sub-line "₹250 logged + ₹499 recurring subs". Optional for back-compat. */
  loggedActual?: number;
  /** Subscription portion of `actualTotal` — same purpose as above. */
  subsActual?: number;
  budgetComparison: Array<{ categoryId: string; budgeted: number; spent: number; pct: number }>;
  allCategories: { id: string; name: string; icon: string; color: string }[];
  expanded: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useExpenseTheme>;
  isDark: boolean;
  t: TFn;
}

function BudgetVsActualCard({
  budgetTotal, actualTotal, loggedActual, subsActual,
  budgetComparison, allCategories,
  expanded, onToggle, theme, isDark, t,
}: BudgetVsActualCardProps) {
  const overallPct = budgetTotal > 0 ? (actualTotal / budgetTotal) * 100 : 0;
  const status = getBudgetStatus(overallPct);
  const budgetDiff = budgetTotal - actualTotal;
  const isUnder = budgetDiff >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="rounded-3xl p-5"
      style={{
        backgroundColor: theme.bgCard,
        border: `1px solid ${theme.borderSubtle}`,
        boxShadow: theme.shadowCard,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(217,119,6,0.2), rgba(217,119,6,0.05))'
                : 'linear-gradient(135deg, rgba(217,119,6,0.12), rgba(217,119,6,0.03))',
            }}
          >
            <BarChart3 size={16} style={{ color: theme.accentGold }} />
          </div>
          <h3 className="text-sm font-bold tracking-wide" style={{ color: theme.textPrimary }}>
            {t('expenses.budgetVsActual')}
          </h3>
        </div>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: isDark ? `${status.color}20` : status.bgColor,
            color: status.color,
          }}
        >
          {t(status.labelKey)}
        </span>
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-center flex-1">
          <p className="text-[10px] font-medium mb-0.5" style={{ color: theme.textMuted }}>
            {t('expenses.budgetSet')}
          </p>
          <p className="text-sm font-bold" style={{ color: theme.textPrimary }}>
            {fmtINR(budgetTotal)}
          </p>
        </div>
        <div className="text-[10px] font-bold px-2" style={{ color: theme.textMuted }}>vs</div>
        <div className="text-center flex-1">
          <p className="text-[10px] font-medium mb-0.5" style={{ color: theme.textMuted }}>
            {t('expenses.actual')}
          </p>
          <p className="text-sm font-bold" style={{ color: theme.textPrimary }}>
            {fmtINR(actualTotal)}
          </p>
          {/* BUG 2.2 fix: breakdown sub-line so the user sees that the
              "Actual" figure already includes recurring sub commitments. */}
          {subsActual !== undefined && subsActual > 0 && loggedActual !== undefined && (
            <p className="text-[9px] mt-0.5" style={{ color: theme.textMuted }}>
              {fmtINR(loggedActual)} {t('expenses.logged', 'logged')} + {fmtINR(subsActual)} {t('expenses.subscriptions', 'subscriptions')}
            </p>
          )}
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="relative w-full h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(overallPct, 100)}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${status.color}cc, ${status.color})`,
          }}
        />
      </div>

      {/* Diff badge */}
      <div className="flex justify-center mb-3">
        <span
          className="text-[11px] font-bold px-3 py-1 rounded-full"
          style={{
            backgroundColor: isDark
              ? (isUnder ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)')
              : (isUnder ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)'),
            color: isUnder ? theme.accentIncome : theme.accentExpense,
          }}
        >
          {isUnder
            ? `${fmtINR(budgetDiff)} ${t('expenses.underBudget')}`
            : `${fmtINR(Math.abs(budgetDiff))} ${t('expenses.overBudget')}`}
        </span>
      </div>

      {/* Toggle category details */}
      <button
        onClick={onToggle}
        className="w-full text-center text-[11px] font-bold tracking-wide transition-colors"
        style={{ color: theme.accentGold }}
      >
        {expanded ? t('expenses.hideCategoryDetails') : t('expenses.showCategoryDetails')}
      </button>

      {/* Per-category progress bars */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 mt-4">
              {budgetComparison.map(item => {
                const cat = allCategories.find(c => c.id === item.categoryId);
                const barColor = getBarColor(item.pct);
                return (
                  <div key={item.categoryId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{cat?.icon ?? '\uD83D\uDCE6'}</span>
                        <span className="text-[11px] font-semibold" style={{ color: theme.textPrimary }}>
                          {cat?.name ?? item.categoryId}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: barColor }}>
                        {fmtINR(item.spent)} / {fmtINR(item.budgeted)}
                      </span>
                    </div>
                    <div
                      className="w-full h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(item.pct, 100)}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: barColor }}
                      />
                    </div>
                    <div className="flex justify-end mt-0.5">
                      <span className="text-[9px] font-medium" style={{ color: theme.textMuted }}>
                        {fmtPct(item.pct)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Weekly Breakdown Card ───────────────────────────────────

interface WeeklyBreakdownCardProps {
  weeks: WeeklySummary[];
  maxExpense: number;
  theme: ReturnType<typeof useExpenseTheme>;
  isDark: boolean;
  t: TFn;
}

function WeeklyBreakdownCard({ weeks, maxExpense, theme, isDark, t }: WeeklyBreakdownCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="rounded-3xl p-5"
      style={{
        backgroundColor: theme.bgCard,
        border: `1px solid ${theme.borderSubtle}`,
        boxShadow: theme.shadowCard,
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.05))'
              : 'linear-gradient(135deg, rgba(217,119,6,0.12), rgba(217,119,6,0.03))',
          }}
        >
          <Flame size={16} style={{ color: theme.accentGold }} />
        </div>
        <h3 className="text-sm font-bold tracking-wide" style={{ color: theme.textPrimary }}>
          {t('expenses.weekByWeek')}
        </h3>
      </div>

      <div className="space-y-2">
        {weeks.map((week, idx) => {
          const pct = maxExpense > 0 ? (week.expenses / maxExpense) * 100 : 0;
          const isCurrent = isCurrentWeek(week.startDate, week.endDate);

          return (
            <motion.div
              key={week.weekNumber}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.06 }}
              className="rounded-2xl p-3 transition-all"
              style={{
                backgroundColor: isCurrent
                  ? (isDark ? 'rgba(251,191,36,0.08)' : 'rgba(217,119,6,0.05)')
                  : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
                border: isCurrent
                  ? `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : 'rgba(217,119,6,0.15)'}`
                  : `1px solid transparent`,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-[72px] flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <p className="text-[11px] font-bold" style={{ color: theme.textPrimary }}>
                      {t('expenses.weekN', { n: week.weekNumber })}
                    </p>
                    {isCurrent && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: theme.accentGold }}
                      />
                    )}
                  </div>
                  <p className="text-[9px]" style={{ color: theme.textMuted }}>{week.label}</p>
                </div>
                <div className="flex-1 h-5 rounded-full overflow-hidden relative" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.08 }}
                    className="h-full rounded-full"
                    style={{
                      background: isCurrent
                        ? `linear-gradient(90deg, ${theme.accentGold}cc, ${theme.accentGold})`
                        : pct === 100
                          ? `linear-gradient(90deg, ${theme.accentExpense}99, ${theme.accentExpense})`
                          : `linear-gradient(90deg, ${theme.accentExpense}66, ${theme.accentExpense}99)`,
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-bold min-w-[68px] text-right"
                  style={{ color: week.expenses > 0 ? theme.accentExpense : theme.textMuted }}
                >
                  {week.expenses > 0 ? fmtINR(week.expenses) : '---'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Category Breakdown + Top Transactions ───────────────────

interface CategoryBreakdownProps {
  categories: CategoryTotal[];
  total: number;
  type: 'expense' | 'income' | 'investment';
  topTransactions: Entry[];
  onEditEntry?: (entry: Entry) => void;
  getCatInfo: (id: string) => { name: string; icon: string; color: string };
  summary?: PeriodSummary;
  theme: ReturnType<typeof useExpenseTheme>;
  isDark: boolean;
  t: TFn;
}

function CategoryBreakdown({
  categories, total, type, topTransactions, onEditEntry, getCatInfo, summary, theme, isDark, t,
}: CategoryBreakdownProps) {
  const accentColor = type === 'expense'
    ? theme.accentExpense
    : type === 'income'
      ? theme.accentIncome
      : theme.accentInvestment;

  const titleKey =
    type === 'expense' ? 'expenses.spendingByCategory'
    : type === 'income' ? 'expenses.incomeBySource'
    : 'expenses.investmentByType';

  const topTitleKey =
    type === 'expense' ? 'expenses.topExpenses'
    : type === 'income' ? 'expenses.topIncome'
    : 'expenses.topInvestments';

  const emptyIcon = type === 'expense' ? '\uD83C\uDF3F' : type === 'income' ? '\uD83D\uDCED' : '\uD83C\uDFE6';

  if (categories.length === 0 && topTransactions.length === 0) {
    return (
      <div
        className="rounded-3xl p-8 text-center"
        style={{
          backgroundColor: theme.bgCard,
          border: `1px solid ${theme.borderSubtle}`,
          boxShadow: theme.shadowSoft,
        }}
      >
        <p className="text-4xl mb-3">{emptyIcon}</p>
        <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>
          {t('expenses.noEntriesThisMonth')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category icon cards */}
      {categories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl p-5"
          style={{
            backgroundColor: theme.bgCard,
            border: `1px solid ${theme.borderSubtle}`,
            boxShadow: theme.shadowCard,
          }}
        >
          <h3 className="text-sm font-bold mb-4 tracking-wide" style={{ color: theme.textPrimary }}>
            {t(titleKey)}
          </h3>
          <div className="space-y-3">
            {categories.map((cat, idx) => (
              <motion.div
                key={cat.categoryId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                className="flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{
                    backgroundColor: `${cat.categoryColor}15`,
                    border: `1px solid ${cat.categoryColor}25`,
                  }}
                >
                  {cat.categoryIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold truncate" style={{ color: theme.textPrimary }}>
                      {cat.categoryName}
                    </span>
                    <div className="flex items-center gap-2 ml-2">
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{
                          backgroundColor: `${cat.categoryColor}15`,
                          color: cat.categoryColor,
                        }}
                      >
                        {fmtPct(cat.percentage)}
                      </span>
                      <span className="text-xs font-bold" style={{ color: theme.textPrimary }}>
                        {fmtINR(cat.amount)}
                      </span>
                    </div>
                  </div>
                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percentage}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.05 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: cat.categoryColor }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: `1px dashed ${theme.borderSubtle}` }}>
            <span className="text-xs font-bold" style={{ color: theme.textSecondary }}>
              {t('expenses.total')}
            </span>
            <span className="text-base font-extrabold" style={{ color: accentColor }}>
              {fmtINR(total)}
            </span>
          </div>
        </motion.div>
      )}

      {/* Top Transactions */}
      {topTransactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-3xl p-5"
          style={{
            backgroundColor: theme.bgCard,
            border: `1px solid ${theme.borderSubtle}`,
            boxShadow: theme.shadowCard,
          }}
        >
          <h3 className="text-sm font-bold mb-4 tracking-wide" style={{ color: theme.textPrimary }}>
            {t(topTitleKey)}
          </h3>
          <div className="space-y-1">
            {topTransactions.map((entry, idx) => {
              const catInfo = getCatInfo(entry.category);
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={onEditEntry ? { scale: 0.98 } : {}}
                  onClick={() => onEditEntry?.(entry)}
                  role={onEditEntry ? 'button' : undefined}
                  tabIndex={onEditEntry ? 0 : undefined}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="flex items-center gap-3 py-2 rounded-xl px-2 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : 'transparent',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                    style={{
                      backgroundColor: `${catInfo.color}12`,
                      border: `1px solid ${catInfo.color}20`,
                    }}
                  >
                    {catInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: theme.textPrimary }}>
                      {entry.description || catInfo.name}
                    </p>
                    <p className="text-[10px]" style={{ color: theme.textMuted }}>
                      {formatFullDate(entry.date)}
                    </p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: accentColor }}>
                    {type === 'income' ? '+' : '-'}{fmtINR(entry.amount)}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Investment monthly rate insight */}
      {type === 'investment' && total > 0 && categories.length > 0 && summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-2xl p-4"
          style={{
            backgroundColor: isDark ? 'rgba(167,139,250,0.06)' : 'rgba(124,58,237,0.04)',
            border: `1px solid ${isDark ? 'rgba(167,139,250,0.15)' : 'rgba(124,58,237,0.1)'}`,
          }}
        >
          <div className="flex items-start gap-2.5">
            <TrendingUp size={14} style={{ color: theme.accentInvestment, marginTop: 2 }} />
            <div>
              <p className="text-[11px] font-semibold mb-1" style={{ color: theme.accentInvestment }}>
                {t('expenses.investmentInsight', {
                  total: fmtINR(total),
                  count: categories.length,
                  rate: summary.totalIncome > 0
                    ? fmtPct((total / summary.totalIncome) * 100)
                    : '0%',
                  top: categories[0]?.categoryName ?? '',
                })}
              </p>
              <p className="text-[10px]" style={{ color: theme.textMuted }}>
                {t('expenses.investmentByType')}: {categories.map(c => c.categoryName).join(', ')}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
