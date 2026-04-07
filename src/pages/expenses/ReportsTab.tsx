import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, ChevronLeft, ChevronRight, TrendingUp, BarChart3, FileText, Calendar,
  Shield, PieChart, Landmark, AlertTriangle, Heart,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useExpenseTheme, getSavingsRating, formatChange } from '../../theme/expenseTheme';
import {
  getEntriesForMonth,
  getEntriesForYear,
  getEntriesForDateRange,
  getBudgetForMonth,
  getAllAccounts,
  getAllEntries,
} from '../../utils/expenseStorage';
import { getAllLoans } from '../../utils/loanStorage';
import { toLocalDateStr } from '../../utils/dateUtils';
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
  calculateFinancialHealth,
  calculateNetWorth,
  generateInsights,
} from '../../utils/expenseCalculations';
import { generateExpenseReport } from '../../utils/pdfReportGenerator';
import SVGPieChart from '../../components/charts/SVGPieChart';
import HealthScoreGauge from '../../components/charts/HealthScoreGauge';

// ═══════════════════════════════════════════════════════════════
// REPORTS TAB — Premium Financial Dashboard
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

type ReportSection = 'overview' | 'download';

export default function ReportsTab() {
  const { t } = useTranslation();
  const theme = useExpenseTheme();
  const isDark = theme.isDark;

  const [generating, setGenerating] = useState<string | null>(null);
  const [reportMonthOffset, setReportMonthOffset] = useState(0);
  const [reportYearOffset, setReportYearOffset] = useState(0);
  const [reportWeekOffset, setReportWeekOffset] = useState(0);
  const [reportDate, setReportDate] = useState(getTodayStr());
  const [activeSection, setActiveSection] = useState<ReportSection>('overview');

  // Custom date range
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [customEnd, setCustomEnd] = useState(getTodayStr());

  // Current month data
  const currentMonth = getMonthRange(0);
  const prevMonth = getMonthRange(-1);

  // refreshKey forces re-fetch when the user returns to this tab or when an
  // entry is added in another tab (the parent ExpenseTracker bumps it).
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    // Bump on mount so we always get fresh data when the tab becomes visible
    setRefreshKey((k) => k + 1);
  }, []);

  const currentEntries = useMemo(() => getEntriesForMonth(currentMonth.year, currentMonth.month), [currentMonth.year, currentMonth.month, refreshKey]);
  const prevEntries = useMemo(() => getEntriesForMonth(prevMonth.year, prevMonth.month), [prevMonth.year, prevMonth.month, refreshKey]);
  const allEntries = useMemo(() => getAllEntries(), [refreshKey]);
  const accounts = useMemo(() => getAllAccounts(), [refreshKey]);
  const loans = useMemo(() => getAllLoans(), [refreshKey]);

  const budget = useMemo(() => getBudgetForMonth(currentMonth.monthStr), [currentMonth.monthStr]);
  const currentSummary = useMemo(() => calculateSummary(currentEntries, budget), [currentEntries, budget]);
  const prevSummary = useMemo(() => calculateSummary(prevEntries), [prevEntries]);

  // Financial Health Score
  const healthScore = useMemo(() =>
    calculateFinancialHealth(currentSummary, budget, accounts, loans),
    [currentSummary, budget, accounts, loans],
  );

  // Net Worth
  const allInvestmentEntries = useMemo(() => allEntries.filter(e => e.type === 'investment'), [allEntries]);
  const netWorth = useMemo(() =>
    calculateNetWorth(accounts, loans, allInvestmentEntries),
    [accounts, loans, allInvestmentEntries],
  );

  // Spending Insights
  const insights = useMemo(() =>
    generateInsights(currentSummary, prevEntries.length > 0 ? prevSummary : null, budget, healthScore),
    [currentSummary, prevSummary, prevEntries.length, budget, healthScore],
  );

  // Last 6 months data
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

  // Custom range data + summary
  const customRangeEntries = useMemo(
    () => getEntriesForDateRange(customStart, customEnd),
    [customStart, customEnd],
  );
  const customRangeSummary = useMemo(
    () => calculateSummary(customRangeEntries),
    [customRangeEntries],
  );
  const customRangeDays = useMemo(() => {
    const s = new Date(customStart + 'T00:00:00');
    const e = new Date(customEnd + 'T00:00:00');
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  }, [customStart, customEnd]);

  const formatRangeLabel = (start: string, end: string) => {
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt(s)} → ${fmt(e)}`;
  };

  // Report generators
  const handleGenerate = async (type: 'daily' | 'weekly' | 'monthly' | 'annual' | 'custom') => {
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
          const monthBudget = getBudgetForMonth(selectedMonth.monthStr);
          const accs = getAllAccounts();
          await generateExpenseReport('monthly', entries, monthBudget, accs, selectedMonth.label);
          break;
        }
        case 'annual': {
          const entries = getEntriesForYear(selectedYear.year);
          await generateExpenseReport('annual', entries, undefined, undefined, `Year ${selectedYear.year}`);
          break;
        }
        case 'custom': {
          if (customStart > customEnd) {
            console.warn('Invalid range: start > end');
            return;
          }
          const entries = getEntriesForDateRange(customStart, customEnd);
          const label = formatRangeLabel(customStart, customEnd);
          // Use 'monthly' template for custom range (richest layout)
          await generateExpenseReport('monthly', entries, undefined, getAllAccounts(), label);
          break;
        }
      }
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setGenerating(null);
    }
  };

  // Helpers
  const getSavingsColor = (rate: number) => {
    if (rate >= 20) return { color: theme.accentIncome, bg: theme.bgIncome };
    if (rate >= 10) return { color: theme.accentGold, bg: isDark ? 'rgba(251,191,36,0.12)' : '#FFFBEB' };
    return { color: theme.accentExpense, bg: theme.bgExpense };
  };

  const GRADE_COLORS: Record<string, string> = {
    'A+': '#16A34A', 'A': '#22c55e', 'B+': '#84cc16',
    'B': '#eab308', 'C': '#f59e0b', 'D': '#ef4444', 'F': '#dc2626',
  };

  const gradeColor = GRADE_COLORS[healthScore.grade] || '#94a3b8';

  // Pie chart data
  const expensePieData = currentSummary.expenseByCategory.slice(0, 8).map(c => ({
    label: c.categoryName,
    value: c.amount,
    color: c.categoryColor,
    icon: c.categoryIcon,
  }));

  const incomePieData = currentSummary.incomeByCategory.map(c => ({
    label: c.categoryName,
    value: c.amount,
    color: c.categoryColor,
    icon: c.categoryIcon,
  }));

  // Download cards
  const downloadCards = [
    {
      type: 'daily' as const,
      title: t('expenses.dailyReport'),
      subtitle: new Date(reportDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      icon: Calendar,
      tint: { bg: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF', border: isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE', accent: '#3b82f6' },
      onPrev: () => { const d = new Date(reportDate); d.setDate(d.getDate() - 1); setReportDate(toLocalDateStr(d)); },
      onNext: () => { const d = new Date(reportDate); d.setDate(d.getDate() + 1); if (d <= new Date()) setReportDate(toLocalDateStr(d)); },
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
      {/* ── Section Toggle ── */}
      <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: theme.bgPrimary }}>
        {[
          { id: 'overview' as const, label: t('expenses.insightsOverview'), icon: '📊' },
          { id: 'download' as const, label: t('expenses.downloadReports'), icon: '📥' },
        ].map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            style={{
              backgroundColor: activeSection === sec.id ? theme.bgCard : 'transparent',
              color: activeSection === sec.id ? theme.textPrimary : theme.textMuted,
              boxShadow: activeSection === sec.id ? theme.shadowSoft : 'none',
            }}
          >
            <span>{sec.icon}</span> {sec.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeSection === 'overview' ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-5"
          >
            {/* ═══ 1. FINANCIAL HEALTH SCORE ═══ */}
            <div
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{
                backgroundColor: theme.bgCard,
                boxShadow: theme.shadowCard,
                border: `1px solid ${theme.borderSubtle}`,
              }}
            >
              {/* Subtle gradient overlay */}
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${gradeColor}, transparent 70%)`,
                }}
              />

              <div className="flex items-center gap-2 mb-3">
                <Heart size={16} style={{ color: gradeColor }} />
                <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>
                  {t('expenses.financialHealth')}
                </h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold ml-auto"
                  style={{ backgroundColor: `${gradeColor}15`, color: gradeColor }}>
                  {currentMonth.label}
                </span>
              </div>

              {/* Gauge */}
              <div className="flex justify-center">
                <HealthScoreGauge
                  score={healthScore}
                  size={180}
                  textColor={theme.textPrimary}
                  mutedColor={theme.textMuted}
                  bgColor={theme.borderSubtle}
                />
              </div>

              {/* Score Breakdown - 4 pillars */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {[
                  { key: 'savings', score: healthScore.breakdown.savingsScore, max: 25, icon: '💰', label: t('expenses.healthSavings'), color: '#16A34A' },
                  { key: 'debt', score: healthScore.breakdown.debtScore, max: 25, icon: '🏦', label: t('expenses.healthDebt'), color: '#3b82f6' },
                  { key: 'invest', score: healthScore.breakdown.investmentScore, max: 25, icon: '📈', label: t('expenses.healthInvest'), color: '#8b5cf6' },
                  { key: 'budget', score: healthScore.breakdown.budgetScore, max: 25, icon: '🎯', label: t('expenses.healthBudget'), color: '#f59e0b' },
                ].map(pillar => (
                  <div key={pillar.key} className="flex flex-col items-center gap-1">
                    <span className="text-base">{pillar.icon}</span>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.borderSubtle }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: pillar.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(pillar.score / pillar.max) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      />
                    </div>
                    <span className="text-[8px] font-bold" style={{ color: pillar.color }}>
                      {pillar.score}/{pillar.max}
                    </span>
                    <span className="text-[8px] font-medium text-center leading-tight" style={{ color: theme.textMuted }}>
                      {pillar.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Key Metrics Row */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3" style={{ borderTop: `1px solid ${theme.borderSubtle}` }}>
                <div className="text-center">
                  <span className="text-[9px] block" style={{ color: theme.textMuted }}>{t('expenses.savingsRateLabel')}</span>
                  <span className="text-xs font-bold" style={{ color: healthScore.metrics.savingsRate >= 20 ? theme.accentIncome : theme.accentExpense }}>
                    {fmtPct(healthScore.metrics.savingsRate)}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[9px] block" style={{ color: theme.textMuted }}>{t('expenses.debtToIncome')}</span>
                  <span className="text-xs font-bold" style={{ color: healthScore.metrics.debtToIncomeRatio <= 30 ? theme.accentIncome : theme.accentExpense }}>
                    {fmtPct(healthScore.metrics.debtToIncomeRatio)}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[9px] block" style={{ color: theme.textMuted }}>{t('expenses.emergencyFund')}</span>
                  <span className="text-xs font-bold" style={{ color: healthScore.metrics.emergencyFundMonths >= 3 ? theme.accentIncome : theme.accentExpense }}>
                    {healthScore.metrics.emergencyFundMonths.toFixed(1)} {t('expenses.months')}
                  </span>
                </div>
              </div>
            </div>

            {/* ═══ 2. NET WORTH & ASSETS vs LIABILITIES ═══ */}
            <div
              className="rounded-2xl p-5"
              style={{
                backgroundColor: theme.bgCard,
                boxShadow: theme.shadowCard,
                border: `1px solid ${theme.borderSubtle}`,
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Landmark size={16} style={{ color: theme.accentGold }} />
                <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>
                  {t('expenses.assetsVsLiab')}
                </h3>
              </div>

              {/* Net Worth Hero */}
              <div className="rounded-xl p-4 mb-4 text-center"
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(59,130,246,0.12))'
                    : 'linear-gradient(135deg, #ecfdf5, #eff6ff)',
                  border: `1px solid ${isDark ? 'rgba(16,185,129,0.2)' : '#a7f3d0'}`,
                }}>
                <span className="text-[10px] font-bold block mb-1" style={{ color: theme.textMuted }}>
                  {t('expenses.totalNetWorth')}
                </span>
                <motion.span
                  className="text-2xl font-black block"
                  style={{ color: netWorth.netWorth >= 0 ? theme.accentIncome : theme.accentExpense }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  {fmtINR(netWorth.netWorth)}
                </motion.span>
                <span className="text-[9px] mt-1 block" style={{ color: theme.textMuted }}>
                  {t('expenses.debtToAssetRatio')}: {fmtPct(netWorth.debtToAssetRatio)}
                </span>
              </div>

              {/* Assets vs Liabilities Bars */}
              <div className="space-y-3">
                {/* Assets */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold flex items-center gap-1" style={{ color: theme.accentIncome }}>
                      <TrendingUp size={12} /> {t('expenses.assets')}
                    </span>
                    <span className="text-xs font-bold" style={{ color: theme.accentIncome }}>
                      {fmtINRShort(netWorth.totalAssets)}
                    </span>
                  </div>
                  {/* Asset breakdown bar */}
                  <div className="h-6 rounded-lg overflow-hidden flex" style={{ backgroundColor: theme.borderSubtle }}>
                    {netWorth.assetBreakdown.map((a, i) => (
                      <motion.div
                        key={i}
                        className="h-full flex items-center justify-center"
                        style={{
                          backgroundColor: a.color,
                          width: netWorth.totalAssets > 0 ? `${(a.value / netWorth.totalAssets) * 100}%` : '0%',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: netWorth.totalAssets > 0 ? `${(a.value / netWorth.totalAssets) * 100}%` : '0%' }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                      >
                        {(a.value / netWorth.totalAssets) * 100 > 15 && (
                          <span className="text-[8px] font-bold text-white">{((a.value / netWorth.totalAssets) * 100).toFixed(0)}%</span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                  {/* Asset items */}
                  <div className="mt-2 space-y-1">
                    {netWorth.assetBreakdown.map((a, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                          <span className="text-[10px]" style={{ color: theme.textSecondary }}>{a.icon} {t(a.label)}</span>
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: theme.textPrimary }}>{fmtINRShort(a.value)}</span>
                      </div>
                    ))}
                    {netWorth.assetBreakdown.length === 0 && (
                      <span className="text-[10px]" style={{ color: theme.textMuted }}>{t('expenses.noAssetsAdded')}</span>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ borderBottom: `1px dashed ${theme.borderSubtle}` }} />

                {/* Liabilities */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold flex items-center gap-1" style={{ color: theme.accentExpense }}>
                      <AlertTriangle size={12} /> {t('expenses.liabilities')}
                    </span>
                    <span className="text-xs font-bold" style={{ color: theme.accentExpense }}>
                      {fmtINRShort(netWorth.totalLiabilities)}
                    </span>
                  </div>
                  {/* Liability breakdown bar */}
                  {netWorth.totalLiabilities > 0 && (
                    <div className="h-6 rounded-lg overflow-hidden flex" style={{ backgroundColor: theme.borderSubtle }}>
                      {netWorth.liabilityBreakdown.map((l, i) => (
                        <motion.div
                          key={i}
                          className="h-full flex items-center justify-center"
                          style={{
                            backgroundColor: l.color,
                            width: `${(l.value / netWorth.totalLiabilities) * 100}%`,
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(l.value / netWorth.totalLiabilities) * 100}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 }}
                        >
                          {(l.value / netWorth.totalLiabilities) * 100 > 15 && (
                            <span className="text-[8px] font-bold text-white">{((l.value / netWorth.totalLiabilities) * 100).toFixed(0)}%</span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {/* Liability items */}
                  <div className="mt-2 space-y-1">
                    {netWorth.liabilityBreakdown.map((l, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                          <span className="text-[10px]" style={{ color: theme.textSecondary }}>{l.icon} {l.label}</span>
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: theme.textPrimary }}>{fmtINRShort(l.value)}</span>
                      </div>
                    ))}
                    {netWorth.liabilityBreakdown.length === 0 && (
                      <span className="text-[10px]" style={{ color: theme.textMuted }}>{t('expenses.noLiabilities')}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Monthly EMI */}
              {healthScore.metrics.monthlyEmiTotal > 0 && (
                <div className="mt-3 p-3 rounded-xl flex items-center justify-between"
                  style={{
                    backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : '#FEF2F2',
                    border: `1px solid ${isDark ? 'rgba(239,68,68,0.15)' : '#FECACA'}`,
                  }}>
                  <span className="text-[10px] font-bold" style={{ color: theme.textSecondary }}>
                    💳 {t('expenses.monthlyEmiTotal')}
                  </span>
                  <span className="text-xs font-bold" style={{ color: theme.accentExpense }}>
                    {fmtINR(healthScore.metrics.monthlyEmiTotal)}{t('expenses.perMonth')}
                  </span>
                </div>
              )}
            </div>

            {/* ═══ 3. SPENDING BREAKDOWN PIE CHARTS ═══ */}
            {(currentSummary.expenseByCategory.length > 0 || currentSummary.incomeByCategory.length > 0) && (
              <div
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: theme.bgCard,
                  boxShadow: theme.shadowSoft,
                  border: `1px solid ${theme.borderSubtle}`,
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <PieChart size={16} style={{ color: theme.accentInvestment }} />
                  <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>
                    {t('expenses.spendingBreakdown')}
                  </h3>
                </div>

                {/* Expense Pie */}
                {expensePieData.length > 0 && (
                  <div className="mb-5">
                    <span className="text-[10px] font-bold block mb-3 text-center" style={{ color: theme.accentExpense }}>
                      {t('expenses.expensesByCategory')}
                    </span>
                    <SVGPieChart
                      data={expensePieData}
                      size={180}
                      innerRadius={50}
                      showLabels
                      showLegend
                      centerValue={fmtINRShort(currentSummary.totalExpenses)}
                      centerLabel={t('expenses.totalLabel')}
                      textColor={theme.textPrimary}
                      mutedColor={theme.textSecondary}
                    />
                  </div>
                )}

                {/* Income Pie */}
                {incomePieData.length > 0 && (
                  <div className="pt-4" style={{ borderTop: `1px solid ${theme.borderSubtle}` }}>
                    <span className="text-[10px] font-bold block mb-3 text-center" style={{ color: theme.accentIncome }}>
                      {t('expenses.incomeBySource')}
                    </span>
                    <SVGPieChart
                      data={incomePieData}
                      size={180}
                      innerRadius={50}
                      showLabels
                      showLegend
                      centerValue={fmtINRShort(currentSummary.totalIncome)}
                      centerLabel={t('expenses.totalLabel')}
                      textColor={theme.textPrimary}
                      mutedColor={theme.textSecondary}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ═══ 4. SPENDING INSIGHTS ═══ */}
            {insights.length > 0 && (
              <div
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: theme.bgCard,
                  boxShadow: theme.shadowSoft,
                  border: `1px solid ${theme.borderSubtle}`,
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={16} style={{ color: theme.accentGold }} />
                  <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>
                    {t('expenses.smartInsights')}
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {insights.map((insight, idx) => {
                    const colors = {
                      warning: { bg: isDark ? 'rgba(239,68,68,0.08)' : '#FEF2F2', border: isDark ? 'rgba(239,68,68,0.15)' : '#FECACA', text: '#ef4444' },
                      positive: { bg: isDark ? 'rgba(16,185,129,0.08)' : '#ECFDF5', border: isDark ? 'rgba(16,185,129,0.15)' : '#A7F3D0', text: '#10b981' },
                      info: { bg: isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF', border: isDark ? 'rgba(59,130,246,0.15)' : '#BFDBFE', text: '#3b82f6' },
                    }[insight.type];

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="rounded-xl p-3 flex items-start gap-2.5"
                        style={{
                          backgroundColor: colors.bg,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        <span className="text-lg flex-shrink-0">{insight.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold" style={{ color: theme.textPrimary }}>
                              {t(insight.titleKey)}
                            </span>
                            {insight.value && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: `${colors.text}15`, color: colors.text }}>
                                {insight.value}
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] mt-0.5" style={{ color: theme.textSecondary }}>
                            {t(insight.descKey)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══ 5. 6-MONTH TREND ═══ */}
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
                        <span className="text-[11px] font-bold w-10 flex-shrink-0" style={{ color: theme.textPrimary }}>
                          {m.shortLabel}
                        </span>
                        <div className="flex-1 h-7 rounded-lg overflow-hidden relative" style={{ backgroundColor: theme.borderSubtle }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(0, Math.min(100, m.savingsRate))}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.08 }}
                            className="h-full rounded-lg"
                            style={{ backgroundColor: colors.bg }}
                          />
                          <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-bold" style={{ color: colors.color }}>
                            {fmtPct(m.savingsRate)}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                          style={{ backgroundColor: `${rating.color}15`, color: rating.color }}>
                          {rating.emoji}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-4 pt-3"
                  style={{ borderTop: `1px solid ${theme.borderSubtle}` }}>
                  {[
                    { label: t('expenses.good'), color: theme.accentIncome },
                    { label: t('expenses.moderate'), color: theme.accentGold },
                    { label: t('expenses.low'), color: theme.accentExpense },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[9px] font-medium" style={{ color: theme.textSecondary }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ 6. LAST 6 MONTHS TABLE ═══ */}
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
                  <span className="text-3xl mb-2">📭</span>
                  <p className="text-xs text-center" style={{ color: theme.textMuted }}>
                    {t('expenses.noDataLast6')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {last6Months.map((m, idx) => {
                    const savingsColors = getSavingsColor(m.savingsRate);
                    const prevM = last6Months[idx + 1];
                    const change = prevM
                      ? formatChange(m.expenses, prevM.expenses)
                      : { display: '', color: theme.textMuted, isNew: false };
                    const showNewBadge = prevM && prevM.expenses === 0 && m.expenses > 0;

                    return (
                      <motion.div
                        key={m.month}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        className="rounded-xl p-3"
                        style={{
                          backgroundColor: m.hasData ? theme.bgCardElevated : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                          border: `1px solid ${theme.borderSubtle}`,
                          opacity: m.hasData ? 1 : 0.5,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold" style={{ color: theme.textPrimary }}>{m.label}</span>
                          {m.hasData && (showNewBadge || change.isNew) ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF', color: '#3b82f6' }}>
                              {t('expenses.new')}
                            </span>
                          ) : m.hasData && change.display ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${change.color}15`, color: change.color }}>
                              {change.display}
                            </span>
                          ) : null}
                        </div>

                        {m.hasData ? (
                          <>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                              <div>
                                <span className="text-[9px] font-medium block" style={{ color: theme.textMuted }}>{t('expenses.incomeLabel')}</span>
                                <span className="text-[11px] font-bold" style={{ color: theme.accentIncome }}>{fmtINRShort(m.income)}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-medium block" style={{ color: theme.textMuted }}>{t('expenses.expensesLabel')}</span>
                                <span className="text-[11px] font-bold" style={{ color: theme.accentExpense }}>{fmtINRShort(m.expenses)}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-medium block" style={{ color: theme.textMuted }}>{t('expenses.netTotal')}</span>
                                <span className="text-[11px] font-bold" style={{ color: m.savings >= 0 ? theme.accentIncome : theme.accentExpense }}>
                                  {fmtINRShort(m.savings)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: savingsColors.color }} />
                              <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: theme.borderSubtle }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.max(0, Math.min(100, m.savingsRate))}%` }}
                                  transition={{ duration: 0.6, delay: idx * 0.08 }}
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: savingsColors.color }}
                                />
                              </div>
                              <span className="text-[9px] font-bold flex-shrink-0 min-w-[36px] text-right" style={{ color: savingsColors.color }}>
                                {fmtPct(m.savingsRate)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center py-2">
                            <span className="text-[10px] tracking-widest" style={{ color: theme.textMuted }}>- - -</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="download"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-5"
          >
            {/* ═══ DOWNLOAD REPORTS ═══ */}
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
                      style={{ backgroundColor: card.tint.bg, border: `1px solid ${card.tint.border}` }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.tint.accent}20` }}>
                          <Icon size={14} style={{ color: card.tint.accent }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: theme.textPrimary }}>{card.title}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <button onClick={(e) => { e.stopPropagation(); card.onPrev(); }} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${card.tint.accent}15` }}>
                          <ChevronLeft size={12} style={{ color: card.tint.accent }} />
                        </button>
                        <span className="text-[10px] font-bold" style={{ color: theme.textSecondary }}>{card.subtitle}</span>
                        <button onClick={(e) => { e.stopPropagation(); card.onNext(); }} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${card.tint.accent}15` }}>
                          <ChevronRight size={12} style={{ color: card.tint.accent }} />
                        </button>
                      </div>
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
                          <><Download size={12} />{t('common.download')}</>
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* ═══ CUSTOM DATE RANGE CARD ═══ */}
            <div
              className="rounded-2xl p-4"
              style={{
                backgroundColor: theme.bgCard,
                boxShadow: theme.shadowSoft,
                border: `1px solid ${theme.borderSubtle}`,
              }}
            >
              <h3 className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: theme.textPrimary }}>
                <Calendar size={16} style={{ color: theme.accentInvestment }} />
                {t('expenses.customRange')}
              </h3>
              <p className="text-[11px] mb-4" style={{ color: theme.textSecondary }}>
                {t('expenses.customRangeDesc')}
              </p>

              {/* Date inputs */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] font-bold block mb-1.5" style={{ color: theme.textMuted }}>
                    {t('expenses.fromDate')}
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    max={customEnd}
                    onChange={e => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none"
                    style={{
                      backgroundColor: theme.bgPrimary,
                      border: `1.5px solid ${theme.borderSubtle}`,
                      color: theme.textPrimary,
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold block mb-1.5" style={{ color: theme.textMuted }}>
                    {t('expenses.toDate')}
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    min={customStart}
                    max={getTodayStr()}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none"
                    style={{
                      backgroundColor: theme.bgPrimary,
                      border: `1.5px solid ${theme.borderSubtle}`,
                      color: theme.textPrimary,
                    }}
                  />
                </div>
              </div>

              {/* Quick presets */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { key: '7d', label: t('expenses.last7Days'), days: 7 },
                  { key: '15d', label: t('expenses.last15Days'), days: 15 },
                  { key: '30d', label: t('expenses.last30Days'), days: 30 },
                  { key: '90d', label: t('expenses.last90Days'), days: 90 },
                ].map(preset => (
                  <button
                    key={preset.key}
                    onClick={() => {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(start.getDate() - (preset.days - 1));
                      const fmt = (d: Date) =>
                        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      setCustomStart(fmt(start));
                      setCustomEnd(fmt(end));
                    }}
                    className="px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors"
                    style={{
                      backgroundColor: theme.accentInvestment + '15',
                      color: theme.accentInvestment,
                      border: `1px solid ${theme.accentInvestment}30`,
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Range summary */}
              <div
                className="rounded-xl p-3 mb-3"
                style={{
                  backgroundColor: theme.bgPrimary,
                  border: `1px solid ${theme.borderSubtle}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold" style={{ color: theme.textSecondary }}>
                    {formatRangeLabel(customStart, customEnd)}
                  </span>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: theme.accentInvestment + '15',
                      color: theme.accentInvestment,
                    }}
                  >
                    {customRangeDays} {t('expenses.days')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[9px] block" style={{ color: theme.textMuted }}>
                      {t('expenses.incomeLabel')}
                    </span>
                    <span className="text-xs font-bold" style={{ color: theme.accentIncome }}>
                      {fmtINRShort(customRangeSummary.totalIncome)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] block" style={{ color: theme.textMuted }}>
                      {t('expenses.expensesLabel')}
                    </span>
                    <span className="text-xs font-bold" style={{ color: theme.accentExpense }}>
                      {fmtINRShort(customRangeSummary.totalExpenses)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] block" style={{ color: theme.textMuted }}>
                      {t('expenses.netTotal')}
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{
                        color:
                          customRangeSummary.netSavings >= 0
                            ? theme.accentIncome
                            : theme.accentExpense,
                      }}
                    >
                      {fmtINRShort(customRangeSummary.netSavings)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 pt-2 flex items-center justify-between" style={{ borderTop: `1px dashed ${theme.borderSubtle}` }}>
                  <span className="text-[9px]" style={{ color: theme.textMuted }}>
                    {customRangeEntries.length} {t('expenses.entriesLabel')}
                  </span>
                  <span className="text-[9px]" style={{ color: theme.textMuted }}>
                    {t('expenses.savingsRateLabel')}: {fmtPct(customRangeSummary.savingsRate)}
                  </span>
                </div>
              </div>

              {/* Download button */}
              <button
                onClick={() => handleGenerate('custom')}
                disabled={generating !== null || customStart > customEnd}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                style={{ backgroundColor: theme.accentInvestment }}
              >
                {generating === 'custom' ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Download size={14} />
                  </motion.div>
                ) : (
                  <>
                    <Download size={14} />
                    {t('expenses.downloadCustomReport')}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
