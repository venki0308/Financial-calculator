import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, ChevronLeft, ChevronRight, TrendingUp, BarChart3, FileText, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useExpenseTheme, getSavingsRating, TYPE_COLORS, formatChange } from '../../theme/expenseTheme';
import type { Entry } from '../../types/expense';
import {
  getEntriesForMonth,
  getEntriesForYear,
  getEntriesForDateRange,
  getBudgetForMonth,
  getAllAccounts,
} from '../../utils/expenseStorage';
import {
  calculateSummary,
  getMonthRange,
  getYearRange,
  getWeekRange,
  fmtINR,
  fmtINRShort,
  fmtPct,
  MONTH_NAMES,
  getTodayStr,
  calculatePercentChange,
} from '../../utils/expenseCalculations';
import { generateExpenseReport } from '../../utils/pdfReportGenerator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TFn = (key: string, options?: any) => string;

// ═══════════════════════════════════════════════════════════════
// REPORTS TAB — "Warm Wealth" Premium Design
// ═══════════════════════════════════════════════════════════════

interface MonthSnapshot {
  month: string;
  label: string;
  shortLabel: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  hasData: boolean;
}

export default function ReportsTab() {
  const { t } = useTranslation();
  const theme = useExpenseTheme();
  const isDark = theme.bgPrimary === '#0F1923';

  const [generating, setGenerating] = useState<string | null>(null);
  const [reportMonthOffset, setReportMonthOffset] = useState(0);
  const [reportYearOffset, setReportYearOffset] = useState(0);
  const [reportWeekOffset, setReportWeekOffset] = useState(0);
  const [reportDate, setReportDate] = useState(getTodayStr());

  // Current period info
  const today = getTodayStr();
  const currentMonthRange = getMonthRange(0);
  const currentWeekRange = getWeekRange(0);
  const currentYearRange = getYearRange(0);

  // ── Last 6 months data ──
  const last6Months: MonthSnapshot[] = useMemo(() => {
    const snapshots: MonthSnapshot[] = [];
    for (let i = 0; i < 6; i++) {
      const range = getMonthRange(-i);
      const entries = getEntriesForMonth(range.year, range.month);
      const summary = calculateSummary(entries);
      snapshots.push({
        month: range.monthStr,
        label: `${MONTH_NAMES[range.month - 1]} ${range.year}`,
        shortLabel: MONTH_NAMES[range.month - 1],
        income: summary.totalIncome,
        expenses: summary.totalExpenses,
        savings: summary.netSavings,
        savingsRate: summary.savingsRate,
        hasData: entries.length > 0,
      });
    }
    return snapshots;
  }, []);

  const monthsWithData = last6Months.filter(m => m.hasData);

  // Selected period ranges
  const selectedMonth = getMonthRange(reportMonthOffset);
  const selectedWeek = getWeekRange(reportWeekOffset);
  const selectedYear = getYearRange(reportYearOffset);

  // ── Report generators ──
  const handleGenerate = async (type: 'daily' | 'weekly' | 'monthly' | 'annual') => {
    setGenerating(type);
    try {
      switch (type) {
        case 'daily': {
          const entries = getEntriesForDateRange(reportDate, reportDate);
          const dateLabel = new Date(reportDate + 'T00:00:00').toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          });
          await generateExpenseReport('daily', entries, undefined, undefined, dateLabel);
          break;
        }
        case 'weekly': {
          const entries = getEntriesForDateRange(selectedWeek.start, selectedWeek.end);
          await generateExpenseReport('weekly', entries, undefined, undefined, selectedWeek.label);
          break;
        }
        case 'monthly': {
          const entries = getEntriesForMonth(selectedMonth.year, selectedMonth.month);
          const budget = getBudgetForMonth(selectedMonth.monthStr);
          const accounts = getAllAccounts();
          await generateExpenseReport('monthly', entries, budget, accounts, selectedMonth.label);
          break;
        }
        case 'annual': {
          const entries = getEntriesForYear(selectedYear.year);
          await generateExpenseReport('annual', entries, undefined, undefined, `Year ${selectedYear.year}`);
          break;
        }
      }
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setGenerating(null);
    }
  };

  // ── Savings color helper ──
  const getSavingsColor = (rate: number) => {
    if (rate >= 20) return { color: theme.accentIncome, bg: theme.bgIncome };
    if (rate >= 10) return { color: theme.accentGold, bg: isDark ? 'rgba(251,191,36,0.12)' : '#FFFBEB' };
    return { color: theme.accentExpense, bg: theme.bgExpense };
  };

  // ── Download card configs ──
  const downloadCards = [
    {
      type: 'daily' as const,
      title: t('expenses.dailyReport'),
      subtitle: new Date(reportDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      icon: Calendar,
      tint: { bg: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF', border: isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE', accent: '#3b82f6' },
      onPrev: () => { const d = new Date(reportDate); d.setDate(d.getDate() - 1); setReportDate(d.toISOString().split('T')[0]); },
      onNext: () => { const d = new Date(reportDate); d.setDate(d.getDate() + 1); if (d <= new Date()) setReportDate(d.toISOString().split('T')[0]); },
    },
    {
      type: 'weekly' as const,
      title: t('expenses.weeklyReport'),
      subtitle: selectedWeek.label,
      icon: BarChart3,
      tint: { bg: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', border: isDark ? 'rgba(16,185,129,0.2)' : '#A7F3D0', accent: '#10b981' },
      onPrev: () => setReportWeekOffset(o => o - 1),
      onNext: () => { if (reportWeekOffset < 0) setReportWeekOffset(o => o + 1); },
    },
    {
      type: 'monthly' as const,
      title: t('expenses.monthlyReport'),
      subtitle: selectedMonth.label,
      icon: FileText,
      tint: { bg: isDark ? 'rgba(124,58,237,0.1)' : '#F5F3FF', border: isDark ? 'rgba(124,58,237,0.2)' : '#C4B5FD', accent: '#7c3aed' },
      onPrev: () => setReportMonthOffset(o => o - 1),
      onNext: () => { if (reportMonthOffset < 0) setReportMonthOffset(o => o + 1); },
    },
    {
      type: 'annual' as const,
      title: t('expenses.annualReport'),
      subtitle: String(selectedYear.year),
      icon: TrendingUp,
      tint: { bg: isDark ? 'rgba(217,119,6,0.1)' : '#FFFBEB', border: isDark ? 'rgba(217,119,6,0.2)' : '#FDE68A', accent: '#d97706' },
      onPrev: () => setReportYearOffset(o => o - 1),
      onNext: () => { if (reportYearOffset < 0) setReportYearOffset(o => o + 1); },
    },
  ];

  return (
    <div className="space-y-5 pb-6">
      {/* ── 1. Quick Download 2x2 Grid ── */}
      <div
        className="rounded-2xl p-4"
        style={{
          backgroundColor: theme.bgCard,
          boxShadow: theme.shadowSoft,
          border: `1px solid ${theme.borderSubtle}`,
        }}
      >
        <h3 className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: theme.textPrimary }}>
          <Download size={16} style={{ color: theme.accentGold }} />
          {t('expenses.quickDownload')}
        </h3>
        <p className="text-[11px] mb-4" style={{ color: theme.textSecondary }}>
          {t('expenses.quickDownloadDesc')}
        </p>

        <div className="grid grid-cols-2 gap-3">
          {downloadCards.map((card, idx) => {
            const Icon = card.icon;
            const isLoading = generating === card.type;

            return (
              <motion.div
                key={card.type}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.08 }}
                className="rounded-xl p-3.5 flex flex-col gap-2"
                style={{
                  backgroundColor: card.tint.bg,
                  border: `1px solid ${card.tint.border}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.tint.accent}20` }}>
                    <Icon size={14} style={{ color: card.tint.accent }} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: theme.textPrimary }}>{card.title}</span>
                </div>

                {/* Period selector */}
                <div className="flex items-center justify-between">
                  <button onClick={(e) => { e.stopPropagation(); card.onPrev(); }} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${card.tint.accent}15` }}>
                    <ChevronLeft size={12} style={{ color: card.tint.accent }} />
                  </button>
                  <span className="text-[10px] font-bold" style={{ color: theme.textSecondary }}>{card.subtitle}</span>
                  <button onClick={(e) => { e.stopPropagation(); card.onNext(); }} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${card.tint.accent}15` }}>
                    <ChevronRight size={12} style={{ color: card.tint.accent }} />
                  </button>
                </div>

                {/* Download button */}
                <button
                  onClick={() => handleGenerate(card.type)}
                  disabled={generating !== null}
                  className="w-full py-2 rounded-lg text-[10px] font-bold text-white disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-1"
                  style={{ backgroundColor: card.tint.accent }}
                >
                  {isLoading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Download size={12} />
                    </motion.div>
                  ) : (
                    <>
                      <Download size={12} />
                      {t('common.download')}
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── 2. Last 6 Months Table ── */}
      <div
        className="rounded-2xl p-4"
        style={{
          backgroundColor: theme.bgCard,
          boxShadow: theme.shadowSoft,
          border: `1px solid ${theme.borderSubtle}`,
        }}
      >
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: theme.textPrimary }}>
          <BarChart3 size={16} style={{ color: theme.accentInvestment }} />
          {t('expenses.last6Months')}
        </h3>

        {monthsWithData.length === 0 ? (
          <div className="flex flex-col items-center py-8">
            <span className="text-3xl mb-2">{'\uD83D\uDCED'}</span>
            <p className="text-xs text-center" style={{ color: theme.textMuted }}>
              {t('expenses.noDataLast6')}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {last6Months.map((m, idx) => {
              const savingsColors = getSavingsColor(m.savingsRate);
              const prevMonth = last6Months[idx + 1];
              const change = prevMonth
                ? formatChange(m.expenses, prevMonth.expenses)
                : { display: '', color: theme.textMuted, isNew: false };

              // Handle zero baseline: if previous month = 0, show "New" badge
              const showNewBadge = prevMonth && prevMonth.expenses === 0 && m.expenses > 0;

              return (
                <motion.div
                  key={m.month}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="rounded-xl p-3"
                  style={{
                    backgroundColor: m.hasData
                      ? theme.bgCardElevated
                      : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                    border: `1px solid ${theme.borderSubtle}`,
                    opacity: m.hasData ? 1 : 0.5,
                  }}
                >
                  {/* Month name row */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color: theme.textPrimary }}>
                      {m.label}
                    </span>
                    {m.hasData && (showNewBadge || change.isNew) ? (
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF',
                          color: '#3b82f6',
                        }}
                      >
                        New
                      </span>
                    ) : m.hasData && change.display ? (
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${change.color}15`,
                          color: change.color,
                        }}
                      >
                        {change.display}
                      </span>
                    ) : null}
                  </div>

                  {m.hasData ? (
                    <>
                      {/* Income / Expenses / Net row */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div>
                          <span className="text-[9px] font-medium block" style={{ color: theme.textMuted }}>
                            {t('expenses.incomeLabel')}
                          </span>
                          <span className="text-[11px] font-bold" style={{ color: theme.accentIncome }}>
                            {fmtINRShort(m.income)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-medium block" style={{ color: theme.textMuted }}>
                            {t('expenses.expensesLabel')}
                          </span>
                          <span className="text-[11px] font-bold" style={{ color: theme.accentExpense }}>
                            {fmtINRShort(m.expenses)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-medium block" style={{ color: theme.textMuted }}>
                            {t('expenses.netTotal')}
                          </span>
                          <span
                            className="text-[11px] font-bold"
                            style={{ color: m.savings >= 0 ? theme.accentIncome : theme.accentExpense }}
                          >
                            {fmtINRShort(m.savings)}
                          </span>
                        </div>
                      </div>

                      {/* Savings rate bar */}
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: savingsColors.color }}
                        />
                        <div
                          className="flex-1 h-[6px] rounded-full overflow-hidden"
                          style={{ backgroundColor: theme.borderSubtle }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(0, Math.min(100, m.savingsRate))}%` }}
                            transition={{ duration: 0.6, delay: idx * 0.08 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: savingsColors.color }}
                          />
                        </div>
                        <span
                          className="text-[9px] font-bold flex-shrink-0 min-w-[36px] text-right"
                          style={{ color: savingsColors.color }}
                        >
                          {fmtPct(m.savingsRate)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-2">
                      <span className="text-[10px] tracking-widest" style={{ color: theme.textMuted }}>
                        - - -
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 3. Savings Rate Trend ── */}
      {monthsWithData.length > 0 && (
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

          <div className="space-y-2.5">
            {last6Months.filter(m => m.hasData).map((m, idx) => {
              const colors = getSavingsColor(m.savingsRate);
              const rating = getSavingsRating(m.savingsRate);

              return (
                <motion.div
                  key={m.month}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.06 }}
                  className="flex items-center gap-3"
                >
                  {/* Month label */}
                  <span
                    className="text-[11px] font-bold w-10 flex-shrink-0"
                    style={{ color: theme.textPrimary }}
                  >
                    {m.shortLabel}
                  </span>

                  {/* Bar */}
                  <div
                    className="flex-1 h-7 rounded-lg overflow-hidden relative"
                    style={{ backgroundColor: theme.borderSubtle }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, Math.min(100, m.savingsRate))}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.08 }}
                      className="h-full rounded-lg"
                      style={{ backgroundColor: colors.bg }}
                    />
                    <span
                      className="absolute inset-y-0 right-2 flex items-center text-[10px] font-bold"
                      style={{ color: colors.color }}
                    >
                      {fmtPct(m.savingsRate)}
                    </span>
                  </div>

                  {/* Rating pill */}
                  <span
                    className="text-[9px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: `${rating.color}15`,
                      color: rating.color,
                    }}
                  >
                    {rating.emoji}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div
            className="flex items-center justify-center gap-4 mt-4 pt-3"
            style={{ borderTop: `1px solid ${theme.borderSubtle}` }}
          >
            {[
              { label: t('expenses.good'), color: theme.accentIncome },
              { label: t('expenses.moderate'), color: theme.accentGold },
              { label: t('expenses.low'), color: theme.accentExpense },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[9px] font-medium" style={{ color: theme.textSecondary }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
