import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, TrendingUp, PiggyBank } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppColors } from '../../theme/useAppColors';
import { ALL_DEFAULT_CATEGORIES } from '../../types/expense';
import { getEntriesForMonth, getEntriesForYear, getCustomCategories } from '../../utils/expenseStorage';
import {
  calculateSummary,
  getYearRange,
  fmtINR,
  fmtINRShort,
  fmtPct,
  MONTH_NAMES,
  type PeriodSummary,
  type CategoryTotal,
} from '../../utils/expenseCalculations';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TFn = (key: string, options?: any) => string;

// ─── Component ───────────────────────────────────────────────

export default function YearlyTab() {
  const { t } = useTranslation();
  const c = useAppColors();

  const [yearOffset, setYearOffset] = useState(0);

  const yearRange = useMemo(() => getYearRange(yearOffset), [yearOffset]);
  const currentYear = new Date().getFullYear();
  const isCurrentYear = yearRange.year === currentYear;

  // ── All entries for the year ──

  const yearEntries = useMemo(
    () => getEntriesForYear(yearRange.year),
    [yearRange.year],
  );

  const yearSummary = useMemo(
    () => calculateSummary(yearEntries),
    [yearEntries],
  );

  // ── Per-month summaries ──

  const monthlySummaries = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const entries = getEntriesForMonth(yearRange.year, month);
      const summary = calculateSummary(entries);
      return { month, summary, hasData: entries.length > 0 };
    });
  }, [yearRange.year]);

  // ── Top 10 spending categories ──

  const topCategories = useMemo(() => {
    return yearSummary.expenseByCategory.slice(0, 10);
  }, [yearSummary]);

  // ── Monthly savings rates for trend display ──

  const monthlySavingsRates = useMemo(() => {
    return monthlySummaries.map(m => ({
      month: m.month,
      rate: m.summary.savingsRate,
      hasData: m.hasData,
    }));
  }, [monthlySummaries]);

  const allCategories = useMemo(() => [...ALL_DEFAULT_CATEGORIES, ...getCustomCategories()], []);

  return (
    <div className="space-y-4 pb-6">
      {/* ── Year Navigator ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setYearOffset(o => o - 1)}
          className="p-2 rounded-xl"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
        >
          <ChevronLeft size={18} style={{ color: c.textSecondary }} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-bold" style={{ color: c.text }}>{yearRange.year}</p>
          {isCurrentYear && (
            <p className="text-[10px] font-semibold text-brand-purple">
              {t('expenses.thisYear')}
            </p>
          )}
        </div>
        <button
          onClick={() => setYearOffset(o => o + 1)}
          disabled={isCurrentYear}
          className="p-2 rounded-xl disabled:opacity-30"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
        >
          <ChevronRight size={18} style={{ color: c.textSecondary }} />
        </button>
      </div>

      {/* ── Annual Summary Card ── */}
      <AnnualSummaryCard summary={yearSummary} c={c} t={t} />

      {/* ── Month-by-Month Table ── */}
      <MonthByMonthTable
        monthlySummaries={monthlySummaries}
        yearSummary={yearSummary}
        c={c}
        t={t}
      />

      {/* ── Category Year View ── */}
      {topCategories.length > 0 && (
        <CategoryYearView
          categories={topCategories}
          totalExpenses={yearSummary.totalExpenses}
          c={c}
          t={t}
        />
      )}

      {/* ── Savings Rate Trend ── */}
      <SavingsRateTrend
        months={monthlySavingsRates}
        c={c}
        t={t}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ─── Annual Summary Card ─────────────────────────────────────

interface AnnualSummaryCardProps {
  summary: PeriodSummary;
  c: ReturnType<typeof useAppColors>;
  t: TFn;
}

function AnnualSummaryCard({ summary, c, t }: AnnualSummaryCardProps) {
  const isPositive = summary.netSavings >= 0;

  const items = [
    { label: t('expenses.totalIncome'), value: fmtINR(summary.totalIncome), color: '#22c55e', icon: '💰' },
    { label: t('expenses.totalExpenses'), value: fmtINR(summary.totalExpenses), color: '#ef4444', icon: '💸' },
    { label: t('expenses.totalSavings'), value: fmtINR(summary.netSavings), color: isPositive ? '#22c55e' : '#ef4444', icon: '🏦' },
    { label: t('expenses.totalInvestments'), value: fmtINR(summary.totalInvestments), color: '#3b82f6', icon: '📈' },
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
      {/* Decorative accent */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }}
      />

      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}>
        <CalendarDays size={16} className="text-brand-purple" />
        {t('expenses.annualSummary')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {items.map(item => (
          <div
            key={item.label}
            className="rounded-xl p-3"
            style={{ backgroundColor: c.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">{item.icon}</span>
              <span className="text-[10px] font-medium" style={{ color: c.textSecondary }}>{item.label}</span>
            </div>
            <p className="text-sm font-extrabold" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Savings Rate */}
      <div className="mt-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <PiggyBank size={14} style={{ color: isPositive ? '#22c55e' : '#ef4444' }} />
          <span className="text-[11px] font-bold" style={{ color: c.text }}>{t('expenses.annualSavingsRate')}</span>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: isPositive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            color: isPositive ? '#22c55e' : '#ef4444',
          }}
        >
          {fmtPct(summary.savingsRate)}
        </span>
      </div>
    </div>
  );
}

// ─── Month-by-Month Table ────────────────────────────────────

interface MonthByMonthTableProps {
  monthlySummaries: Array<{ month: number; summary: PeriodSummary; hasData: boolean }>;
  yearSummary: PeriodSummary;
  c: ReturnType<typeof useAppColors>;
  t: TFn;
}

function MonthByMonthTable({ monthlySummaries, yearSummary, c, t }: MonthByMonthTableProps) {
  return (
    <div className="rounded-2xl p-4 overflow-hidden" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>
        {t('expenses.monthByMonth')}
      </h3>

      {/* Header */}
      <div
        className="grid grid-cols-5 gap-1 text-[9px] font-bold uppercase tracking-wider pb-2 mb-2"
        style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}
      >
        <span>{t('expenses.month')}</span>
        <span className="text-right">{t('expenses.income')}</span>
        <span className="text-right">{t('expenses.expensesShort')}</span>
        <span className="text-right">{t('expenses.savings')}</span>
        <span className="text-right">{t('expenses.savingsPercent')}</span>
      </div>

      {/* Month rows */}
      <div className="space-y-0.5">
        {monthlySummaries.map(({ month, summary: ms, hasData }) => {
          const isPositive = ms.netSavings >= 0;
          return (
            <motion.div
              key={month}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: month * 0.03 }}
              className="grid grid-cols-5 gap-1 py-1.5 rounded-lg px-1"
              style={{
                backgroundColor: hasData
                  ? (c.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)')
                  : 'transparent',
              }}
            >
              <span className="text-[11px] font-bold" style={{ color: hasData ? c.text : c.textMuted }}>
                {MONTH_NAMES[month - 1]}
              </span>
              <span className="text-[11px] font-medium text-right" style={{ color: hasData ? '#22c55e' : c.textMuted }}>
                {hasData ? fmtINRShort(ms.totalIncome) : '---'}
              </span>
              <span className="text-[11px] font-medium text-right" style={{ color: hasData ? '#ef4444' : c.textMuted }}>
                {hasData ? fmtINRShort(ms.totalExpenses) : '---'}
              </span>
              <span
                className="text-[11px] font-medium text-right"
                style={{ color: hasData ? (isPositive ? '#22c55e' : '#ef4444') : c.textMuted }}
              >
                {hasData ? fmtINRShort(ms.netSavings) : '---'}
              </span>
              <span
                className="text-[11px] font-medium text-right"
                style={{ color: hasData ? (isPositive ? '#22c55e' : '#ef4444') : c.textMuted }}
              >
                {hasData ? fmtPct(ms.savingsRate) : '---'}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Totals row */}
      <div
        className="grid grid-cols-5 gap-1 pt-2 mt-2"
        style={{ borderTop: `2px solid ${c.border}` }}
      >
        <span className="text-[11px] font-extrabold" style={{ color: c.text }}>
          {t('expenses.total')}
        </span>
        <span className="text-[11px] font-extrabold text-right" style={{ color: '#22c55e' }}>
          {fmtINRShort(yearSummary.totalIncome)}
        </span>
        <span className="text-[11px] font-extrabold text-right" style={{ color: '#ef4444' }}>
          {fmtINRShort(yearSummary.totalExpenses)}
        </span>
        <span
          className="text-[11px] font-extrabold text-right"
          style={{ color: yearSummary.netSavings >= 0 ? '#22c55e' : '#ef4444' }}
        >
          {fmtINRShort(yearSummary.netSavings)}
        </span>
        <span
          className="text-[11px] font-extrabold text-right"
          style={{ color: yearSummary.savingsRate >= 0 ? '#22c55e' : '#ef4444' }}
        >
          {fmtPct(yearSummary.savingsRate)}
        </span>
      </div>
    </div>
  );
}

// ─── Category Year View ──────────────────────────────────────

interface CategoryYearViewProps {
  categories: CategoryTotal[];
  totalExpenses: number;
  c: ReturnType<typeof useAppColors>;
  t: TFn;
}

function CategoryYearView({ categories, totalExpenses, c, t }: CategoryYearViewProps) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>
        {t('expenses.topSpendingCategories')}
      </h3>
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
            <span className="text-xs font-bold min-w-[70px] text-right" style={{ color: c.text }}>
              {fmtINR(cat.amount)}
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px dashed ${c.border}` }}>
        <span className="text-xs font-bold" style={{ color: c.textSecondary }}>{t('expenses.totalExpenses')}</span>
        <span className="text-sm font-extrabold" style={{ color: '#ef4444' }}>{fmtINR(totalExpenses)}</span>
      </div>
    </div>
  );
}

// ─── Savings Rate Trend ──────────────────────────────────────

interface SavingsRateTrendProps {
  months: Array<{ month: number; rate: number; hasData: boolean }>;
  c: ReturnType<typeof useAppColors>;
  t: TFn;
}

function SavingsRateTrend({ months, c, t }: SavingsRateTrendProps) {
  const maxAbsRate = Math.max(...months.filter(m => m.hasData).map(m => Math.abs(m.rate)), 1);

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}>
        <TrendingUp size={16} className="text-brand-purple" />
        {t('expenses.savingsRateTrend')}
      </h3>

      <div className="grid grid-cols-12 gap-1 items-end" style={{ minHeight: 80 }}>
        {months.map(m => {
          const barHeight = m.hasData ? Math.max((Math.abs(m.rate) / maxAbsRate) * 60, 4) : 4;
          const isPositive = m.rate >= 0;
          const barColor = !m.hasData
            ? (c.isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0')
            : isPositive
              ? '#22c55e'
              : '#ef4444';

          return (
            <div key={m.month} className="flex flex-col items-center gap-1">
              {/* Rate value */}
              <span className="text-[7px] font-bold" style={{ color: m.hasData ? barColor : c.textMuted }}>
                {m.hasData ? `${Math.round(m.rate)}%` : ''}
              </span>
              {/* Bar */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: barHeight }}
                transition={{ duration: 0.4, delay: m.month * 0.04 }}
                className="w-full rounded-sm"
                style={{
                  backgroundColor: barColor,
                  opacity: m.hasData ? 1 : 0.3,
                }}
              />
              {/* Month label */}
              <span className="text-[7px] font-medium" style={{ color: c.textSecondary }}>
                {MONTH_NAMES[m.month - 1]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-[9px]" style={{ color: c.textSecondary }}>{t('expenses.positiveSavings')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-[9px]" style={{ color: c.textSecondary }}>{t('expenses.negativeSavings')}</span>
        </div>
      </div>
    </div>
  );
}
