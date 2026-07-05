import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, TrendingUp, BarChart3, Calendar, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useExpenseTheme, getSavingsRating, TYPE_COLORS, formatChange } from '../../theme/expenseTheme';
import type { Entry } from '../../types/expense';
import { getEntriesForMonth, getEntriesForYear, getCategoryById, deleteEntriesInRange } from '../../utils/expenseStorage';
import {
  calculateSummary,
  getYearRange,
  fmtINR,
  fmtINRShort,
  fmtPct,
  MONTH_NAMES,
  calculatePercentChange,
  getUnloggedSubsForRange,
  getTodayStr,
  calcSafeSavingsRate,
  type PeriodSummary,
  type CategoryTotal,
} from '../../utils/expenseCalculations';
// Subscription store bridge — BUG 5.1 fix: per-month expenses must
// include actually-billed sub amounts.
import { useBudgetTrackerStore } from '../../store/useBudgetTrackerStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TFn = (key: string, options?: any) => string;

// ═══════════════════════════════════════════════════════════════
// YEARLY TAB — "Warm Wealth" Premium Design
// ═══════════════════════════════════════════════════════════════

// `refreshKey` is bumped by ExpenseTracker when the global FAB saves an entry,
// forcing useMemo deps to invalidate and re-fetch from storage.
interface YearlyTabProps {
  refreshKey?: number;
}

export default function YearlyTab({ refreshKey = 0 }: YearlyTabProps) {
  const { t } = useTranslation();
  const theme = useExpenseTheme();

  const [yearOffset, setYearOffset] = useState(0);
  const [showClearAll, setShowClearAll] = useState(false);
  const [localRefresh, setLocalRefresh] = useState(0);

  const yearRange = useMemo(() => getYearRange(yearOffset), [yearOffset]);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed
  const isCurrentYear = yearRange.year === currentYear;

  // ── All entries for the year ──
  const yearEntries = useMemo(
    () => getEntriesForYear(yearRange.year),
    [yearRange.year, refreshKey, localRefresh],
  );

  /* ── clear all entries for the year ── */
  const handleClearAllYear = () => {
    deleteEntriesInRange(`${yearRange.year}-01-01`, `${yearRange.year}-12-31`);
    setShowClearAll(false);
    setLocalRefresh(k => k + 1);
  };

  const yearSummary = useMemo(
    () => calculateSummary(yearEntries),
    [yearEntries],
  );

  // ── Subscription store + today anchor for actual-billing math ──
  const subscriptions = useBudgetTrackerStore(s => s.subscriptions);
  const todayISO = getTodayStr();

  // ── Per-month summaries — BUG 5.1 fix: each month's totalExpenses
  //    is augmented with the subscription billings that ACTUALLY
  //    occurred (date <= today) inside that month's window.
  //    Apr 9 example: March 26 Netflix → counted in March; April 26
  //    Netflix → NOT counted in April (still future). ──
  const monthlySummaries = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const entries = getEntriesForMonth(yearRange.year, month);
      const summary = calculateSummary(entries);
      const isFuture = isCurrentYear && month > currentMonth;
      // Range for this month
      const startISO = `${yearRange.year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(yearRange.year, month, 0).getDate();
      const endISO = `${yearRange.year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const subsBilled = getUnloggedSubsForRange(entries, subscriptions, startISO, endISO, todayISO);
      // Augment the summary so downstream renderers (bars, totals,
      // savings rate) all see the canonical figure without further
      // changes. Build a NEW summary object — never mutate the
      // calculateSummary result.
      const augmentedTotalExpenses = summary.totalExpenses + subsBilled;
      // Cash net: investments also leave the wallet.
      const augmentedNetSavings = summary.totalIncome - augmentedTotalExpenses - summary.totalInvestments;
      // Savings RATE keeps its original basis (income − expenses) / income —
      // investments count AS savings for the rate/grading.
      const augmentedSavingsRate = summary.totalIncome > 0
        ? ((summary.totalIncome - augmentedTotalExpenses) / summary.totalIncome) * 100
        : 0;
      const augmentedSummary: PeriodSummary = {
        ...summary,
        totalExpenses: augmentedTotalExpenses,
        netSavings: augmentedNetSavings,
        savingsRate: augmentedSavingsRate,
      };
      const hasData = entries.length > 0 || subsBilled > 0;
      const hasIncome = summary.totalIncome > 0;
      return { month, summary: augmentedSummary, subsBilled, hasData, hasIncome, isFuture };
    });
  }, [yearRange.year, isCurrentYear, currentMonth, refreshKey, subscriptions, todayISO]);

  // ── Augmented YEAR-LEVEL summary using the per-month canonicals.
  // We can't just call calculateSummary(yearEntries) any more because
  // it ignores subs. Sum the per-month augmented totals instead. ──
  const augmentedYearSummary = useMemo<PeriodSummary>(() => {
    const totalExpenses = monthlySummaries.reduce((s, m) => s + m.summary.totalExpenses, 0);
    const totalIncome = yearSummary.totalIncome;
    // Cash net subtracts investments; savings RATE keeps its original
    // (income − expenses) / income basis.
    const netSavings = totalIncome - totalExpenses - yearSummary.totalInvestments;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    return {
      ...yearSummary,
      totalExpenses,
      netSavings,
      savingsRate,
    };
  }, [monthlySummaries, yearSummary]);

  // ── Top 10 spending categories (resolved names/icons) ──
  // Bug 2 (UI parity): merge subscription billings into the category
  // breakdown so the table TOTAL ties out to augmentedYearSummary.
  // All sub billings collapse under the canonical "subscription"
  // category, regardless of the user's per-sub category choice. This
  // mirrors the Annual PDF generator and prevents the
  // "category total ≠ headline total" mismatch.
  const topCategories = useMemo(() => {
    // Sum the per-month unlogged values (same granularity as the
    // headline, which sums twelve per-month calls) — a single
    // year-range call pools logged coverage across months and drifts
    // from the headline total.
    const annualSubsBilled = monthlySummaries.reduce((s, m) => s + m.subsBilled, 0);

    const merged: CategoryTotal[] = yearSummary.expenseByCategory.map(c => ({ ...c }));
    if (annualSubsBilled > 0) {
      const SUBS_ID = 'subscription';
      const existing = merged.find(c => c.categoryId === SUBS_ID);
      if (existing) {
        existing.amount += annualSubsBilled;
        existing.count += 0; // count of synthetic rows isn't tracked here
      } else {
        const def = getCategoryById(SUBS_ID);
        merged.push({
          categoryId: SUBS_ID,
          categoryName: def?.name ?? 'Subscriptions',
          categoryIcon: def?.icon ?? '📱',
          categoryColor: def?.color ?? '#8b5cf6',
          amount: annualSubsBilled,
          percentage: 0, // recomputed below
          count: 0,
        });
      }
    }

    // Recompute percentages against the augmented total so the section
    // numbers tie out to the headline.
    const denom = merged.reduce((s, c) => s + c.amount, 0) || 1;
    return merged
      .map(c => {
        const resolved = getCategoryById(c.categoryId);
        return {
          ...c,
          categoryName: resolved?.name ?? c.categoryName,
          categoryIcon: resolved?.icon ?? c.categoryIcon,
          categoryColor: resolved?.color ?? c.categoryColor,
          percentage: (c.amount / denom) * 100,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [yearSummary, monthlySummaries]);

  // ── Monthly savings rates for trend ──
  // BUG 5.2 fix: include `hasIncome` flag so months with 0 income
  // can render "N/A" rather than "0%". The rate field is still
  // computed (= 0 when income is 0) but the chart now hides the
  // label for those bars.
  const monthlySavingsRates = useMemo(() => {
    return monthlySummaries.map(m => ({
      month: m.month,
      rate: m.summary.savingsRate,
      hasData: m.hasData,
      hasIncome: m.hasIncome,
      isFuture: m.isFuture,
    }));
  }, [monthlySummaries]);

  return (
    <div className="space-y-5 pb-6">
      {/* ── 1. Year Navigator ── */}
      <YearNavigator
        year={yearRange.year}
        isCurrentYear={isCurrentYear}
        onPrev={() => setYearOffset(o => o - 1)}
        onNext={() => setYearOffset(o => o + 1)}
        theme={theme}
        t={t}
      />

      {/* Clear All button */}
      {yearEntries.length > 0 && (
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
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }} className="w-full max-w-xs rounded-2xl p-6" style={{ backgroundColor: theme.bgCard, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
              <p className="font-bold text-base mb-2" style={{ color: theme.textPrimary }}>{t('expenses.clearAllTitle', 'Clear All Entries?')}</p>
              <p className="text-sm mb-5" style={{ color: theme.textSecondary }}>{t('expenses.clearAllYearMsg', 'All entries for this year will be deleted. This cannot be undone.')}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowClearAll(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: theme.borderSubtle, color: theme.textSecondary }}>{t('common.cancel', 'Cancel')}</button>
                <button onClick={handleClearAllYear} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: theme.accentExpense }}>{t('expenses.clearAll', 'Clear All')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. Annual Summary Card ── (uses augmented summary so totals
              include all subs that actually billed this year) */}
      <AnnualSummaryCard summary={augmentedYearSummary} theme={theme} t={t} />

      {/* ── 3. Month-by-Month ── */}
      <MonthByMonthSection
        monthlySummaries={monthlySummaries}
        yearSummary={augmentedYearSummary}
        currentMonth={isCurrentYear ? currentMonth : -1}
        theme={theme}
        t={t}
      />

      {/* ── 4. Top Spending Categories ── */}
      {topCategories.length > 0 && (
        <TopSpendingCategories
          categories={topCategories}
          totalExpenses={augmentedYearSummary.totalExpenses}
          theme={theme}
          t={t}
        />
      )}

      {/* ── 5. Savings Rate Trend ── */}
      <SavingsRateTrendSection
        months={monthlySavingsRates}
        theme={theme}
        t={t}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ─── 1. Year Navigator ──────────────────────────────────────

interface YearNavigatorProps {
  year: number;
  isCurrentYear: boolean;
  onPrev: () => void;
  onNext: () => void;
  theme: ReturnType<typeof useExpenseTheme>;
  t: TFn;
}

function YearNavigator({ year, isCurrentYear, onPrev, onNext, theme, t }: YearNavigatorProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl p-3"
      style={{
        backgroundColor: theme.bgCard,
        boxShadow: theme.shadowSoft,
        border: `1px solid ${theme.borderSubtle}`,
      }}
    >
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onPrev}
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: theme.bgCardElevated, border: `1px solid ${theme.borderSubtle}` }}
      >
        <ChevronLeft size={18} style={{ color: theme.textSecondary }} />
      </motion.button>

      <div className="flex-1 text-center">
        <p className="text-lg font-extrabold tracking-tight" style={{ color: theme.textPrimary }}>
          {year}
        </p>
        {isCurrentYear && (
          <span
            className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-0.5"
            style={{
              backgroundColor: theme.bgIncome,
              color: theme.accentIncome,
            }}
          >
            {t('expenses.thisYear')}
          </span>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onNext}
        disabled={isCurrentYear}
        className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30"
        style={{ backgroundColor: theme.bgCardElevated, border: `1px solid ${theme.borderSubtle}` }}
      >
        <ChevronRight size={18} style={{ color: theme.textSecondary }} />
      </motion.button>
    </div>
  );
}

// ─── 2. Annual Summary Card ─────────────────────────────────

interface AnnualSummaryCardProps {
  summary: PeriodSummary;
  theme: ReturnType<typeof useExpenseTheme>;
  t: TFn;
}

function AnnualSummaryCard({ summary, theme, t }: AnnualSummaryCardProps) {
  const rating = getSavingsRating(summary.savingsRate);
  const isDark = theme.isDark;

  const items = [
    {
      label: t('expenses.totalIncome'),
      value: fmtINR(summary.totalIncome),
      icon: '\uD83D\uDCB0',
      color: theme.accentIncome,
      bg: theme.bgIncome,
    },
    {
      label: t('expenses.totalExpenses'),
      value: fmtINR(summary.totalExpenses),
      icon: '\uD83D\uDCB8',
      color: theme.accentExpense,
      bg: theme.bgExpense,
    },
    {
      label: t('expenses.totalInvestments'),
      value: fmtINR(summary.totalInvestments),
      icon: '\uD83D\uDCC8',
      color: theme.accentInvestment,
      bg: theme.bgInvestment,
    },
    {
      label: t('expenses.totalSavings'),
      value: fmtINR(summary.netSavings),
      icon: '\uD83C\uDFE6',
      color: summary.netSavings >= 0 ? theme.accentIncome : theme.accentExpense,
      bg: summary.netSavings >= 0 ? theme.bgIncome : theme.bgExpense,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(145deg, #1B3A2D 0%, #0F1923 60%, #1e1b4b 100%)'
          : 'linear-gradient(145deg, #F0FDF4 0%, #FEFCF8 50%, #F5F3FF 100%)',
        boxShadow: theme.shadowCard,
        border: `1px solid ${theme.borderSubtle}`,
      }}
    >
      {/* Decorative orb */}
      <div
        className="absolute -top-10 -right-10 w-36 h-36 rounded-full opacity-20"
        style={{
          background: `radial-gradient(circle, ${theme.accentGold}, transparent)`,
        }}
      />

      <h3
        className="text-sm font-bold mb-3 flex items-center gap-2 relative z-10"
        style={{ color: theme.textPrimary }}
      >
        <Calendar size={16} style={{ color: theme.accentGold }} />
        {t('expenses.annualSummary')}
      </h3>

      {/* 2x2 grid */}
      <div className="grid grid-cols-2 gap-3 relative z-10">
        {items.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: idx * 0.08 }}
            className="rounded-xl p-3"
            style={{ backgroundColor: item.bg, border: `1px solid ${theme.borderSubtle}` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">{item.icon}</span>
              <span className="text-[10px] font-semibold" style={{ color: theme.textSecondary }}>
                {item.label}
              </span>
            </div>
            <p className="text-sm font-extrabold" style={{ color: item.color }}>
              {item.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Annual Savings Rate badge */}
      <div
        className="mt-3 flex items-center justify-between px-2 py-2 rounded-xl relative z-10"
        style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{rating.emoji}</span>
          <div>
            <span className="text-[11px] font-bold block" style={{ color: theme.textPrimary }}>
              {t('expenses.annualSavingsRate')}
            </span>
            <span className="text-[9px] font-semibold" style={{ color: rating.color }}>
              {t(rating.labelKey)}
            </span>
          </div>
        </div>
        <span
          className="text-sm font-extrabold px-3 py-1 rounded-full"
          style={{
            backgroundColor: `${rating.color}20`,
            color: rating.color,
          }}
        >
          {fmtPct(summary.savingsRate)}
        </span>
      </div>
    </motion.div>
  );
}

// ─── 3. Month-by-Month Section ──────────────────────────────

interface MonthByMonthProps {
  monthlySummaries: Array<{ month: number; summary: PeriodSummary; hasData: boolean; isFuture: boolean }>;
  yearSummary: PeriodSummary;
  currentMonth: number;
  theme: ReturnType<typeof useExpenseTheme>;
  t: TFn;
}

function MonthByMonthSection({ monthlySummaries, yearSummary, currentMonth, theme, t }: MonthByMonthProps) {
  // Find the maximum income or expense for bar scaling
  const maxAmount = Math.max(
    ...monthlySummaries.map(m => Math.max(m.summary.totalIncome, m.summary.totalExpenses)),
    1,
  );

  return (
    <div
      className="rounded-2xl p-4 overflow-hidden"
      style={{
        backgroundColor: theme.bgCard,
        boxShadow: theme.shadowSoft,
        border: `1px solid ${theme.borderSubtle}`,
      }}
    >
      <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: theme.textPrimary }}>
        <BarChart3 size={16} style={{ color: theme.accentInvestment }} />
        {t('expenses.monthByMonth')}
      </h3>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: theme.accentIncome }} />
          <span className="text-[9px] font-semibold" style={{ color: theme.textSecondary }}>
            {t('expenses.incomeLabel')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: theme.accentExpense }} />
          <span className="text-[9px] font-semibold" style={{ color: theme.textSecondary }}>
            {t('expenses.expensesLabel')}
          </span>
        </div>
      </div>

      {/* Month rows */}
      <div className="space-y-1">
        {monthlySummaries.map(({ month, summary: ms, hasData, isFuture }) => {
          const isActive = month === currentMonth;
          const incomeBarW = maxAmount > 0 ? (ms.totalIncome / maxAmount) * 100 : 0;
          const expenseBarW = maxAmount > 0 ? (ms.totalExpenses / maxAmount) * 100 : 0;

          return (
            <motion.div
              key={month}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: month * 0.03 }}
              className="flex items-center gap-2 py-2 px-2 rounded-xl"
              style={{
                backgroundColor: isActive
                  ? `${theme.accentGold}12`
                  : 'transparent',
                border: isActive ? `1px solid ${theme.accentGold}30` : '1px solid transparent',
              }}
            >
              {/* Month name */}
              <span
                className="text-[11px] font-bold w-8 flex-shrink-0"
                style={{
                  color: isFuture ? theme.textMuted : (isActive ? theme.accentGold : theme.textPrimary),
                }}
              >
                {MONTH_NAMES[month - 1]}
              </span>

              {/* Bars + amounts */}
              {isFuture ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-[10px] tracking-widest" style={{ color: theme.textMuted }}>
                    - - -
                  </span>
                </div>
              ) : (
                <div className="flex-1 min-w-0 space-y-0.5">
                  {/* Income bar */}
                  <div className="flex items-center gap-2">
                    <div
                      className="h-[5px] rounded-full overflow-hidden flex-1"
                      style={{ backgroundColor: theme.borderSubtle }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(incomeBarW, hasData ? 2 : 0)}%` }}
                        transition={{ duration: 0.5, delay: month * 0.04 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: theme.accentIncome }}
                      />
                    </div>
                    <span
                      className="text-[9px] font-semibold w-12 text-right flex-shrink-0"
                      style={{ color: hasData ? theme.accentIncome : theme.textMuted }}
                    >
                      {hasData ? fmtINRShort(ms.totalIncome) : '---'}
                    </span>
                  </div>
                  {/* Expense bar */}
                  <div className="flex items-center gap-2">
                    <div
                      className="h-[5px] rounded-full overflow-hidden flex-1"
                      style={{ backgroundColor: theme.borderSubtle }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(expenseBarW, hasData ? 2 : 0)}%` }}
                        transition={{ duration: 0.5, delay: month * 0.04 + 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: theme.accentExpense }}
                      />
                    </div>
                    <span
                      className="text-[9px] font-semibold w-12 text-right flex-shrink-0"
                      style={{ color: hasData ? theme.accentExpense : theme.textMuted }}
                    >
                      {hasData ? fmtINRShort(ms.totalExpenses) : '---'}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Totals row */}
      <div
        className="flex items-center gap-2 mt-3 pt-3 px-2"
        style={{ borderTop: `2px solid ${theme.borderSubtle}` }}
      >
        <span className="text-[11px] font-extrabold w-8 flex-shrink-0" style={{ color: theme.textPrimary }}>
          {t('expenses.total')}
        </span>
        <div className="flex-1 flex items-center justify-between">
          <span className="text-xs font-extrabold" style={{ color: theme.accentIncome }}>
            {fmtINRShort(yearSummary.totalIncome)}
          </span>
          <span className="text-xs font-extrabold" style={{ color: theme.accentExpense }}>
            {fmtINRShort(yearSummary.totalExpenses)}
          </span>
          <span
            className="text-xs font-extrabold"
            style={{ color: yearSummary.netSavings >= 0 ? theme.accentIncome : theme.accentExpense }}
          >
            {t('expenses.netTotal')}: {fmtINRShort(yearSummary.netSavings)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── 4. Top Spending Categories ─────────────────────────────

interface TopSpendingCategoriesProps {
  categories: CategoryTotal[];
  totalExpenses: number;
  theme: ReturnType<typeof useExpenseTheme>;
  t: TFn;
}

function TopSpendingCategories({ categories, totalExpenses, theme, t }: TopSpendingCategoriesProps) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: theme.bgCard,
        boxShadow: theme.shadowSoft,
        border: `1px solid ${theme.borderSubtle}`,
      }}
    >
      <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: theme.textPrimary }}>
        <TrendingUp size={16} style={{ color: theme.accentExpense }} />
        {t('expenses.topSpendingCategories')}
      </h3>

      <div className="space-y-2.5">
        {categories.map((cat, idx) => {
          // Resolve category name via getCategoryById for human-readable names
          const resolvedCat = getCategoryById(cat.categoryId);
          const displayName = resolvedCat?.name ?? cat.categoryName;
          const displayIcon = resolvedCat?.icon ?? cat.categoryIcon;
          const displayColor = resolvedCat?.color ?? cat.categoryColor;

          return (
            <motion.div
              key={cat.categoryId}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="flex items-center gap-3"
            >
              {/* Rank number */}
              <span
                className="text-[10px] font-extrabold w-4 text-center flex-shrink-0"
                style={{ color: theme.textMuted }}
              >
                #{idx + 1}
              </span>

              {/* Icon card */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `${displayColor}18`,
                  border: `1px solid ${displayColor}30`,
                }}
              >
                <span className="text-base">{displayIcon}</span>
              </div>

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-xs font-semibold truncate"
                    style={{ color: theme.textPrimary }}
                  >
                    {displayName}
                  </span>
                  <span
                    className="text-[10px] font-bold ml-2 flex-shrink-0"
                    style={{ color: theme.textSecondary }}
                  >
                    {fmtPct(cat.percentage)}
                  </span>
                </div>
                <div
                  className="w-full h-[6px] rounded-full overflow-hidden"
                  style={{ backgroundColor: theme.borderSubtle }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.percentage}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.06 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: displayColor }}
                  />
                </div>
              </div>

              {/* Amount */}
              <span
                className="text-xs font-bold min-w-[68px] text-right flex-shrink-0"
                style={{ color: theme.textPrimary }}
              >
                {fmtINR(cat.amount)}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Total row */}
      <div
        className="flex items-center justify-between mt-4 pt-3"
        style={{ borderTop: `1px dashed ${theme.borderSubtle}` }}
      >
        <span className="text-xs font-bold" style={{ color: theme.textSecondary }}>
          {t('expenses.totalExpenses')}
        </span>
        <span className="text-sm font-extrabold" style={{ color: theme.accentExpense }}>
          {fmtINR(totalExpenses)}
        </span>
      </div>
    </div>
  );
}

// ─── 5. Savings Rate Trend (12 bars) ────────────────────────

interface SavingsRateTrendProps {
  months: Array<{ month: number; rate: number; hasData: boolean; hasIncome: boolean; isFuture: boolean }>;
  theme: ReturnType<typeof useExpenseTheme>;
  t: TFn;
}

function SavingsRateTrendSection({ months, theme, t }: SavingsRateTrendProps) {
  // BUG 5.2 fix: only months with actual income contribute to the
  // bar scale and only those months get a numeric label. Months
  // with hasData but no income render as a thin neutral bar with
  // no label (or "N/A" tooltip).
  const maxAbsRate = Math.max(
    ...months.filter(m => m.hasIncome).map(m => Math.abs(m.rate)),
    1,
  );

  const getBarColor = (rate: number, hasIncome: boolean) => {
    if (!hasIncome) return theme.textMuted;
    if (rate >= 20) return theme.accentIncome;   // green
    if (rate >= 10) return theme.accentGold;      // amber
    return theme.accentExpense;                   // red
  };

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: theme.bgCard,
        boxShadow: theme.shadowSoft,
        border: `1px solid ${theme.borderSubtle}`,
      }}
    >
      <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: theme.textPrimary }}>
        <TrendingUp size={16} style={{ color: theme.accentGold }} />
        {t('expenses.savingsRateTrend')}
      </h3>

      <div className="grid grid-cols-12 gap-1 items-end" style={{ minHeight: 90 }}>
        {months.map(m => {
          const barColor = getBarColor(m.rate, m.hasIncome);
          // Only months with actual income get a tall bar with a label.
          // Months with expenses-only data render a thin neutral stub.
          const barHeight = m.hasIncome
            ? Math.max((Math.abs(m.rate) / maxAbsRate) * 64, 6)
            : 4;

          return (
            <div key={m.month} className="flex flex-col items-center gap-1">
              {/* Rate label — only when income exists; "N/A" when there's
                  expense data but no income; blank for future months */}
              <span
                className="text-[7px] font-bold"
                style={{ color: m.hasIncome ? barColor : theme.textMuted }}
              >
                {m.hasIncome
                  ? `${Math.round(m.rate)}%`
                  : (m.hasData ? 'N/A' : '')}
              </span>

              {/* Bar */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: barHeight }}
                transition={{ duration: 0.5, delay: m.month * 0.04 }}
                className="w-full rounded-sm"
                style={{
                  backgroundColor: barColor,
                  opacity: m.hasIncome ? 1 : 0.2,
                }}
              />

              {/* Month label */}
              <span
                className="text-[7px] font-semibold"
                style={{ color: m.isFuture ? theme.textMuted : theme.textSecondary }}
              >
                {MONTH_NAMES[m.month - 1]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        className="flex items-center justify-center gap-4 mt-4 pt-3"
        style={{ borderTop: `1px solid ${theme.borderSubtle}` }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.accentIncome }} />
          <span className="text-[9px] font-medium" style={{ color: theme.textSecondary }}>
            {t('expenses.good')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.accentGold }} />
          <span className="text-[9px] font-medium" style={{ color: theme.textSecondary }}>
            {t('expenses.moderate')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.accentExpense }} />
          <span className="text-[9px] font-medium" style={{ color: theme.textSecondary }}>
            {t('expenses.low')}
          </span>
        </div>
      </div>
    </div>
  );
}
