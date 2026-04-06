import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, Calendar, CalendarDays, BarChart3, TrendingUp, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  calculateSummary,
  getMonthRange,
  getYearRange,
  fmtINR,
  fmtPct,
  MONTH_NAMES,
  getTodayStr,
  getWeekRange,
} from '../../utils/expenseCalculations';
import {
  getEntriesForMonth,
  getEntriesForYear,
  getEntriesForDateRange,
  getEntriesForDate,
  getBudgetForMonth,
  getAllAccounts,
} from '../../utils/expenseStorage';
import { generateExpenseReport } from '../../utils/pdfReportGenerator';

// ─── TYPES ───────────────────────────────────────────────────

interface MonthSnapshot {
  month: string;
  label: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  hasData: boolean;
}

// ─── COMPONENT ───────────────────────────────────────────────

export default function ReportsTab() {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState<string | null>(null);

  // Current period info
  const today = getTodayStr();
  const currentMonthRange = getMonthRange(0);
  const currentWeekRange = getWeekRange(0);
  const currentYearRange = getYearRange(0);

  // ── Last 6 months data ──────────────────────────────────────

  const last6Months: MonthSnapshot[] = useMemo(() => {
    const snapshots: MonthSnapshot[] = [];
    for (let i = 0; i < 6; i++) {
      const range = getMonthRange(-i);
      const entries = getEntriesForMonth(range.year, range.month);
      const summary = calculateSummary(entries);
      snapshots.push({
        month: range.monthStr,
        label: `${MONTH_NAMES[range.month - 1]} ${range.year}`,
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

  // ── Report generators ───────────────────────────────────────

  const handleGenerate = async (type: 'daily' | 'weekly' | 'monthly' | 'annual') => {
    setGenerating(type);
    try {
      switch (type) {
        case 'daily': {
          const entries = getEntriesForDate(today);
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

  // ── Savings rate color helper ───────────────────────────────

  const getSavingsColor = (rate: number) => {
    if (rate >= 20) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20' };
    if (rate >= 10) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/20' };
    return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20' };
  };

  // ── RENDER ──────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-6">

      {/* ── Section 1: Quick Download ─────────────────────────── */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
        <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-1">
          {t('expenses.quickDownload', 'Quick Download')}
        </h3>
        <p className="text-muted-foreground text-xs mb-4">
          {t('expenses.quickDownloadDesc', 'Generate PDF reports for the current period')}
        </p>

        <div className="grid grid-cols-2 gap-3">
          {([
            { type: 'daily' as const, label: t('expenses.dailyReport', 'Daily Report'), icon: Calendar, desc: t('expenses.todayLabel', 'Today') },
            { type: 'weekly' as const, label: t('expenses.weeklyReport', 'Weekly Report'), icon: CalendarDays, desc: t('expenses.thisWeek', 'This Week') },
            { type: 'monthly' as const, label: t('expenses.monthlyReport', 'Monthly Report'), icon: BarChart3, desc: currentMonthRange.label },
            { type: 'annual' as const, label: t('expenses.annualReport', 'Annual Report'), icon: TrendingUp, desc: String(currentYearRange.year) },
          ]).map(item => {
            const Icon = item.icon;
            const isLoading = generating === item.type;
            return (
              <motion.button
                key={item.type}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleGenerate(item.type)}
                disabled={generating !== null}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] hover:border-brand-purple/40 hover:bg-brand-purple/5 transition-all disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-brand-purple/10 flex items-center justify-center">
                  {isLoading
                    ? <Loader2 size={18} className="text-brand-purple animate-spin" />
                    : <Icon size={18} className="text-brand-purple" />
                  }
                </div>
                <span className="text-slate-800 dark:text-foreground text-xs font-bold text-center leading-tight">
                  {item.label}
                </span>
                <span className="text-muted-foreground text-[10px]">{item.desc}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Last 6 Months Summary ──────────────────── */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
        <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-4">
          {t('expenses.last6Months', 'Last 6 Months')}
        </h3>

        {monthsWithData.length === 0 ? (
          <div className="flex flex-col items-center py-8">
            <span className="text-3xl mb-2">📭</span>
            <p className="text-muted-foreground text-xs text-center">
              {t('expenses.noDataLast6', 'No expense data found for the last 6 months.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="text-left py-2 px-1 text-muted-foreground font-semibold">
                    {t('expenses.month', 'Month')}
                  </th>
                  <th className="text-right py-2 px-1 text-muted-foreground font-semibold">
                    {t('expenses.income', 'Income')}
                  </th>
                  <th className="text-right py-2 px-1 text-muted-foreground font-semibold">
                    {t('expenses.expenses', 'Expenses')}
                  </th>
                  <th className="text-right py-2 px-1 text-muted-foreground font-semibold">
                    {t('expenses.savings', 'Savings')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {last6Months.map(m => (
                  <tr
                    key={m.month}
                    className={`border-b border-slate-100 dark:border-white/5 ${!m.hasData ? 'opacity-40' : ''}`}
                  >
                    <td className="py-2.5 px-1 font-semibold text-slate-800 dark:text-foreground">
                      {m.label}
                    </td>
                    <td className="py-2.5 px-1 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      {m.hasData ? fmtINR(m.income) : '—'}
                    </td>
                    <td className="py-2.5 px-1 text-right text-red-500 dark:text-red-400 font-medium">
                      {m.hasData ? fmtINR(m.expenses) : '—'}
                    </td>
                    <td className={`py-2.5 px-1 text-right font-bold ${m.savings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}>
                      {m.hasData ? fmtINR(m.savings) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 3: Savings Rate Trend ─────────────────────── */}
      {monthsWithData.length > 0 && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
          <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-4">
            {t('expenses.savingsRateTrend', 'Savings Rate Trend')}
          </h3>

          <div className="space-y-3">
            {last6Months.filter(m => m.hasData).map(m => {
              const colors = getSavingsColor(m.savingsRate);
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-16 flex-shrink-0">
                    {m.label.split(' ')[0]}
                  </span>
                  <div className="flex-1 h-6 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, Math.min(100, m.savingsRate))}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={`h-full rounded-full ${colors.bg}`}
                    />
                    <span className={`absolute inset-y-0 right-2 flex items-center text-[10px] font-bold ${colors.text}`}>
                      {fmtPct(m.savingsRate)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
            {[
              { label: t('expenses.good', 'Good (20%+)'), color: 'bg-emerald-400' },
              { label: t('expenses.moderate', 'Moderate (10-20%)'), color: 'bg-amber-400' },
              { label: t('expenses.low', 'Low (<10%)'), color: 'bg-red-400' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-muted-foreground text-[10px]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Download All Reports ──────────────────────────────── */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => handleGenerate('monthly')}
        disabled={generating !== null}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-purple/10 border-2 border-brand-purple/40 text-brand-purple font-bold text-sm disabled:opacity-50"
      >
        {generating === 'monthly'
          ? <Loader2 size={18} className="animate-spin" />
          : <Download size={18} />
        }
        {t('expenses.downloadMonthlyReport', 'Download Monthly Report')}
      </motion.button>
    </div>
  );
}
