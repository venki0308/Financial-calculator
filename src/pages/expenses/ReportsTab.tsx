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

  // ── Report generators ──
  const handleGenerate = async (type: 'daily' | 'weekly' | 'monthly' | 'annual') => {
    setGenerating(type);
    try {
      switch (type) {
        case 'daily': {
          const entries = getEntriesForDateRange(today, today);
          const dateLabel = new Date().toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          });
          await generateExpenseReport('daily', entries, undefined, undefined, dateLabel);
          break;
        }
        case 'weekly': {
          const entries = getEntriesForDateRange(currentWeekRange.start, currentWeekRange.end);
          await generateExpenseReport('weekly', entries, undefined, undefined, currentWeekRange.label);
          break;
        }
        case 'monthly': {
          const entries = getEntriesForMonth(currentMonthRange.year, currentMonthRange.month);
          const budget = getBudgetForMonth(currentMonthRange.monthStr);
          const accounts = getAllAccounts();
          await generateExpenseReport('monthly', entries, budget, accounts, currentMonthRange.label);
          break;
        }
        case 'annual': {
          const entries = getEntriesForYear(currentYearRange.year);
          await generateExpenseReport('annual', entries, undefined, undefined, `Year ${currentYearRange.year}`);
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
      subtitle: t('expenses.todayLabel'),
      icon: Calendar,
      tint: { bg: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF', border: isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE', accent: '#3b82f6' },
    },
    {
      type: 'weekly' as const,
      title: t('expenses.weeklyReport'),
      subtitle: t('expenses.thisWeek'),
      icon: BarChart3,
      tint: { bg: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', border: isDark ? 'rgba(16,185,129,0.2)' : '#A7F3D0', accent: '#10b981' },
    },
    {
      type: 'monthly' as const,
      title: t('expenses.monthlyReport'),
      subtitle: currentMonthRange.label,
      icon: FileText,
      tint: { bg: isDark ? 'rgba(124,58,237,0.1)' : '#F5F3FF', border: isDark ? 'rgba(124,58,237,0.2)' : '#C4B5FD', accent: '#7c3aed' },
    },
    {
      type: 'annual' as const,
      title: t('expenses.annualReport'),
      subtitle: String(currentYearRange.year),
      icon: TrendingUp,
      tint: { bg: isDark ? 'rgba(217,119,6,0.1)' : '#FFFBEB', border: isDark ? 'rgba(217,119,6,0.2)' : '#FDE68A', accent: '#d97706' },
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
              <motion.button
                key={card.type}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.08 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleGenerate(card.type)}
                disabled={generating !== null}
                className="flex flex-col items-start gap-2.5 p-3.5 rounded-xl text-left disabled:opacity-50 transition-all"
                style={{
                  backgroundColor: card.tint.bg,
                  border: `1px solid ${card.tint.border}`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${card.tint.accent}20` }}
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    >
                      <Download size={16} style={{ color: card.tint.accent }} />
                    </motion.div>
                  ) : (
                    <Icon size={16} style={{ color: card.tint.accent }} />
                  )}
                </div>

                <div>
                  <span
                    className="text-xs font-bold block leading-tight"
                    style={{ color: theme.textPrimary }}
                  >
                    {card.title}
                  </span>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: theme.textSecondary }}
                  >
                    {card.subtitle}
                  </span>
                </div>

                <span
                  className="text-[10px] font-bold flex items-center gap-1"
                  style={{ color: card.tint.accent }}
                >
                  {t('expenses.downloadDailyReport').includes('Report') ? 'Download' : t('expenses.downloadDailyReport').split(' ')[0]}
                  <span style={{ fontSize: 12 }}>&rarr;</span>
                </span>
              </motion.button>
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
