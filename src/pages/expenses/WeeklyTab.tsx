import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Wallet, PiggyBank, BarChart3, CalendarDays,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useExpenseTheme, formatChange, TYPE_COLORS } from '../../theme/expenseTheme';
import { getEntriesForDateRange, getCategoryById } from '../../utils/expenseStorage';
import {
  calculateSummary, getWeekRange, fmtINR, fmtPct,
  formatFullDate, DAY_NAMES,
} from '../../utils/expenseCalculations';
import type { Entry } from '../../types/expense';

/* ── constants ── */

type SubTab = 'expense' | 'income' | 'investment';

const SUB_TABS: { id: SubTab; labelKey: string; fallback: string }[] = [
  { id: 'expense',    labelKey: 'expenses.expenses',    fallback: 'Expenses' },
  { id: 'income',     labelKey: 'expenses.income',      fallback: 'Income' },
  { id: 'investment', labelKey: 'expenses.investments',  fallback: 'Investments' },
];

/* ── helpers ── */

function isTodayStr(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0];
}

function dateOfWeekday(startDate: string, dayIndex: number): string {
  const d = new Date(startDate + 'T00:00:00');
  d.setDate(d.getDate() + dayIndex);
  return d.toISOString().split('T')[0];
}

function typeColor(et: ReturnType<typeof useExpenseTheme>, type: SubTab): string {
  if (type === 'income') return et.accentIncome;
  if (type === 'investment') return et.accentInvestment;
  return et.accentExpense;
}

function typeBg(et: ReturnType<typeof useExpenseTheme>, type: SubTab): string {
  if (type === 'income') return et.bgIncome;
  if (type === 'investment') return et.bgInvestment;
  return et.bgExpense;
}

function entryTypeColor(et: ReturnType<typeof useExpenseTheme>, type: string): string {
  if (type === 'income') return et.accentIncome;
  if (type === 'investment') return et.accentInvestment;
  if (type === 'transfer') return '#0284c7';
  return et.accentExpense;
}

/* ── component ── */

export default function WeeklyTab() {
  const { t } = useTranslation();
  const et = useExpenseTheme();

  const [weekOffset, setWeekOffset] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('expense');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const isCurrentWeek = weekOffset === 0;

  /* ── daily average divisor ── */
  const dailyAvgDivisor = useMemo(() => {
    if (weekOffset < 0) return 7;
    const today = new Date();
    const dayOfWeek = today.getDay();
    return Math.max(dayOfWeek === 0 ? 7 : dayOfWeek, 1);
  }, [weekOffset]);

  /* ── week ranges ── */
  const week = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const prevWeek = useMemo(() => getWeekRange(weekOffset - 1), [weekOffset]);

  /* ── entries ── */
  const weekEntries = useMemo(
    () => getEntriesForDateRange(week.start, week.end),
    [week],
  );
  const prevWeekEntries = useMemo(
    () => getEntriesForDateRange(prevWeek.start, prevWeek.end),
    [prevWeek],
  );

  /* ── summaries ── */
  const summary = useMemo(() => calculateSummary(weekEntries), [weekEntries]);
  const prevSummary = useMemo(() => calculateSummary(prevWeekEntries), [prevWeekEntries]);

  /* ── vs last week change ── */
  const change = formatChange(summary.totalExpenses, prevSummary.totalExpenses);

  /* ── day-by-day data ── */
  const dayData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dayDateStr = dateOfWeekday(week.start, i);
      const dayEntries = weekEntries.filter(
        (e) => e.date === dayDateStr && e.type === activeSubTab,
      );
      const total = dayEntries.reduce((s, e) => s + e.amount, 0);
      return { dayIndex: i, dateStr: dayDateStr, entries: dayEntries, total };
    });
  }, [week.start, weekEntries, activeSubTab]);

  const maxDayTotal = Math.max(...dayData.map((d) => d.total), 1);
  const highestDayIdx = dayData.reduce(
    (best, d, i) => (d.total > dayData[best].total ? i : best),
    0,
  );

  /* ── category breakdown ── */
  const breakdown = useMemo(() => {
    const filtered = weekEntries.filter((e) => e.type === activeSubTab);
    const catSummary = calculateSummary(filtered);
    return activeSubTab === 'expense'
      ? catSummary.expenseByCategory
      : activeSubTab === 'income'
        ? catSummary.incomeByCategory
        : catSummary.investmentByCategory;
  }, [weekEntries, activeSubTab]);

  const breakdownTotal = breakdown.reduce((s, b) => s + b.amount, 0);

  /* ── all entries grouped by day ── */
  const groupedEntries = useMemo(() => {
    const sorted = [...weekEntries].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
    const groups: { date: string; entries: Entry[] }[] = [];
    sorted.forEach((entry) => {
      const last = groups[groups.length - 1];
      if (last && last.date === entry.date) {
        last.entries.push(entry);
      } else {
        groups.push({ date: entry.date, entries: [entry] });
      }
    });
    return groups;
  }, [weekEntries]);

  /* ── active sub-tab color ── */
  const activeColor = typeColor(et, activeSubTab);
  const activeBg = typeBg(et, activeSubTab);

  return (
    <div className="space-y-4 pb-6">

      {/* ═══════════════════════════════════════════════════════════
          1. WEEK NAVIGATOR
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setWeekOffset((w) => w - 1); setExpandedDay(null); }}
          className="p-2.5 rounded-2xl transition-all active:scale-95"
          style={{
            backgroundColor: et.bgCard,
            border: `1px solid ${et.borderSubtle}`,
            boxShadow: et.shadowSoft,
          }}
        >
          <ChevronLeft size={18} style={{ color: et.textSecondary }} />
        </button>

        <div
          className="flex-1 text-center py-2.5 rounded-2xl relative"
          style={{
            backgroundColor: et.bgCard,
            border: `1px solid ${et.borderSubtle}`,
            boxShadow: et.shadowSoft,
          }}
        >
          <p className="text-sm font-bold" style={{ color: et.textPrimary }}>
            {week.label}
          </p>
          {isCurrentWeek && (
            <span
              className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                backgroundColor: `${et.accentInvestment}18`,
                color: et.accentInvestment,
              }}
            >
              {t('expenses.thisWeek', 'This Week')}
            </span>
          )}
        </div>

        <button
          onClick={() => { setWeekOffset((w) => w + 1); setExpandedDay(null); }}
          disabled={isCurrentWeek}
          className="p-2.5 rounded-2xl transition-all active:scale-95 disabled:opacity-30"
          style={{
            backgroundColor: et.bgCard,
            border: `1px solid ${et.borderSubtle}`,
            boxShadow: et.shadowSoft,
          }}
        >
          <ChevronRight size={18} style={{ color: et.textSecondary }} />
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          2. HERO CARD
          ═══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl p-5"
        style={{
          backgroundColor: et.bgCard,
          border: `1px solid ${et.borderSubtle}`,
          boxShadow: et.shadowCard,
        }}
      >
        {/* Total Spent + vs last week */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: et.textSecondary }}>
              {t('expenses.totalSpent', 'Total Spent')}
            </p>
            <p
              className="font-extrabold leading-none"
              style={{ fontSize: 28, color: et.accentExpense }}
            >
              {fmtINR(summary.totalExpenses)}
            </p>
          </div>
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold mt-1"
            style={{
              backgroundColor: `${change.color}14`,
              color: change.color,
            }}
          >
            {change.isNew ? (
              <>
                <TrendingUp size={12} />
                {t('expenses.new')}
              </>
            ) : (
              <>
                {change.display.startsWith('-')
                  ? <TrendingDown size={12} />
                  : <TrendingUp size={12} />}
                {t('expenses.vsLastWeek', 'vs last week')}: {change.display}
              </>
            )}
          </span>
        </div>

        {/* 2x2 stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: t('expenses.totalEarned', 'Earned'),
              value: fmtINR(summary.totalIncome),
              color: et.accentIncome,
              bg: et.bgIncome,
              icon: <Wallet size={14} />,
            },
            {
              label: t('expenses.invested', 'Invested'),
              value: fmtINR(summary.totalInvestments),
              color: et.accentInvestment,
              bg: et.bgInvestment,
              icon: <TrendingUp size={14} />,
            },
            {
              label: t('expenses.dailyAverage', 'Daily Avg'),
              value: fmtINR(summary.totalExpenses / dailyAvgDivisor),
              color: et.accentGold,
              bg: `${et.accentGold}12`,
              icon: <BarChart3 size={14} />,
            },
            {
              label: t('expenses.netSaved', 'Net Saved'),
              value: fmtINR(summary.netSavings),
              color: summary.netSavings >= 0 ? et.accentIncome : et.accentExpense,
              bg: summary.netSavings >= 0 ? et.bgIncome : et.bgExpense,
              icon: <PiggyBank size={14} />,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
              style={{ backgroundColor: stat.bg }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
              >
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium" style={{ color: et.textMuted }}>
                  {stat.label}
                </p>
                <p className="text-sm font-bold truncate" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          3. SUB-TAB PILLS
          ═══════════════════════════════════════════════════════════ */}
      <div
        className="flex gap-1 rounded-2xl p-1"
        style={{
          backgroundColor: et.bgCard,
          border: `1px solid ${et.borderSubtle}`,
          boxShadow: et.shadowSoft,
        }}
      >
        {SUB_TABS.map((tab) => {
          const active = activeSubTab === tab.id;
          const color = typeColor(et, tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveSubTab(tab.id); setExpandedDay(null); }}
              className="flex-1 py-2 text-xs font-bold rounded-xl transition-all"
              style={
                active
                  ? { backgroundColor: color, color: '#fff' }
                  : { color: et.textSecondary }
              }
            >
              {t(tab.labelKey, tab.fallback)}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          4. DAY BAR CHART
          ═══════════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl p-4"
        style={{
          backgroundColor: et.bgCard,
          border: `1px solid ${et.borderSubtle}`,
          boxShadow: et.shadowCard,
        }}
      >
        <h3 className="font-bold text-sm mb-4" style={{ color: et.textPrimary }}>
          {t('expenses.dayByDay', 'Day-by-Day')}
        </h3>

        <div className="space-y-1.5">
          {dayData.map((day, i) => {
            const isToday = isTodayStr(day.dateStr);
            const isExpanded = expandedDay === i;
            const isHighest = day.total > 0 && i === highestDayIdx;
            const pct = maxDayTotal > 0 ? (day.total / maxDayTotal) * 100 : 0;

            return (
              <div key={i}>
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : i)}
                  className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all"
                  style={isToday
                    ? {
                        backgroundColor: `${et.accentInvestment}0C`,
                        border: `1px solid ${et.accentInvestment}30`,
                      }
                    : { border: '1px solid transparent' }
                  }
                >
                  {/* Day label */}
                  <span
                    className="text-xs font-bold w-9 text-left"
                    style={{ color: isToday ? et.accentInvestment : et.textSecondary }}
                  >
                    {DAY_NAMES[i]}
                  </span>

                  {/* Bar track */}
                  <div
                    className="flex-1 h-5 rounded-full overflow-hidden"
                    style={{ backgroundColor: `${et.textMuted}15` }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, day.total > 0 ? 4 : 0)}%` }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: isHighest
                          ? activeColor
                          : `${activeColor}40`,
                      }}
                    />
                  </div>

                  {/* Amount */}
                  <span
                    className="text-xs font-bold min-w-[60px] text-right"
                    style={{
                      color: day.total === 0
                        ? et.textMuted
                        : isHighest
                          ? activeColor
                          : et.textPrimary,
                    }}
                  >
                    {day.total === 0 ? '\u2014' : fmtINR(day.total)}
                  </span>
                </button>

                {/* Expanded accordion */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="pl-12 pr-3 overflow-hidden"
                    >
                      {day.entries.length > 0 ? (
                        <div
                          className="space-y-1.5 py-2 pl-3"
                          style={{ borderLeft: `2px solid ${activeColor}30` }}
                        >
                          {day.entries.map((entry) => {
                            const cat = getCategoryById(entry.category);
                            return (
                              <div
                                key={entry.id}
                                className="flex items-center gap-2.5 py-1"
                              >
                                <span
                                  className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0"
                                  style={{
                                    backgroundColor: `${cat?.color ?? '#8b5cf6'}20`,
                                  }}
                                >
                                  {cat?.icon ?? '\uD83D\uDCE6'}
                                </span>
                                <span
                                  className="flex-1 text-xs truncate"
                                  style={{ color: et.textPrimary }}
                                >
                                  {entry.description || cat?.name || entry.category}
                                </span>
                                <span
                                  className="text-xs font-bold"
                                  style={{ color: activeColor }}
                                >
                                  {fmtINR(entry.amount)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p
                          className="text-[11px] italic py-2"
                          style={{ color: et.textMuted }}
                        >
                          {t('expenses.noEntriesThisDay', 'No entries this day')}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          5. CATEGORY BREAKDOWN
          ═══════════════════════════════════════════════════════════ */}
      {breakdown.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{
            backgroundColor: et.bgCard,
            border: `1px solid ${et.borderSubtle}`,
            boxShadow: et.shadowCard,
          }}
        >
          <h3 className="font-bold text-sm mb-4" style={{ color: et.textPrimary }}>
            {activeSubTab === 'expense'
              ? t('expenses.spendingByCategory', 'Spending by Category')
              : activeSubTab === 'income'
                ? t('expenses.incomeSources', 'Income Sources')
                : t('expenses.investmentBreakdown', 'Investment Breakdown')}
          </h3>

          <div className="space-y-3">
            {breakdown.map((item, idx) => {
              const pct = breakdownTotal > 0
                ? (item.amount / breakdownTotal) * 100
                : 0;
              const catColor = item.categoryColor || activeColor;

              return (
                <motion.div
                  key={item.categoryId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                  className="flex items-center gap-3"
                >
                  {/* 36x36 icon card */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: `${catColor}26` }}
                  >
                    {item.categoryIcon}
                  </div>

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p
                        className="text-xs font-semibold truncate"
                        style={{ color: et.textPrimary }}
                      >
                        {item.categoryName}
                      </p>
                      <p
                        className="text-[10px] font-medium ml-2 flex-shrink-0"
                        style={{ color: et.textMuted }}
                      >
                        {fmtPct(pct)}
                      </p>
                    </div>
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: `${et.textMuted}15` }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.4, delay: idx * 0.04 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: catColor }}
                      />
                    </div>
                  </div>

                  {/* Amount */}
                  <p
                    className="text-xs font-bold flex-shrink-0 min-w-[56px] text-right"
                    style={{ color: et.textPrimary }}
                  >
                    {fmtINR(item.amount)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          6. ALL ENTRIES — grouped by day
          ═══════════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl p-4"
        style={{
          backgroundColor: et.bgCard,
          border: `1px solid ${et.borderSubtle}`,
          boxShadow: et.shadowCard,
        }}
      >
        <h3 className="font-bold text-sm mb-3" style={{ color: et.textPrimary }}>
          {t('expenses.allEntriesThisWeek', 'All Entries This Week')}
        </h3>

        {groupedEntries.length === 0 ? (
          /* ── 7. EMPTY STATE ── */
          <div className="text-center py-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${et.accentInvestment}12` }}
            >
              <CalendarDays
                size={28}
                style={{ color: et.accentInvestment, opacity: 0.6 }}
              />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: et.textSecondary }}>
              {t('expenses.noEntriesWeek', 'No entries recorded this week')}
            </p>
            <p className="text-xs" style={{ color: et.textMuted }}>
              {t('expenses.noEntriesWeekHint', 'Start tracking to see your weekly summary')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedEntries.map((group) => (
              <div key={group.date}>
                {/* Day header */}
                <div className="flex items-center gap-2 mb-2">
                  <p
                    className="text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: et.textMuted }}
                  >
                    {formatFullDate(group.date)}
                  </p>
                  <div
                    className="flex-1 h-px"
                    style={{ backgroundColor: et.borderSubtle }}
                  />
                </div>

                {/* Entries for this day */}
                <div className="space-y-2">
                  {group.entries.map((entry) => {
                    const cat = getCategoryById(entry.category);
                    const color = entryTypeColor(et, entry.type);
                    const prefix =
                      entry.type === 'income'
                        ? '+'
                        : entry.type === 'expense'
                          ? '-'
                          : '';
                    const badgeLabel =
                      entry.type === 'income'
                        ? t('expenses.earned', 'Earned')
                        : entry.type === 'investment'
                          ? t('expenses.invested', 'Invested')
                          : entry.type === 'transfer'
                            ? t('expenses.transfer', 'Transfer')
                            : t('expenses.spent', 'Spent');

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 py-2"
                      >
                        {/* Icon card */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{
                            backgroundColor: `${cat?.color ?? '#8b5cf6'}20`,
                          }}
                        >
                          {cat?.icon ?? '\uD83D\uDCE6'}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs font-semibold truncate"
                            style={{ color: et.textPrimary }}
                          >
                            {entry.description || cat?.name || entry.category}
                          </p>
                          <p
                            className="text-[10px] flex items-center gap-1.5 mt-0.5"
                            style={{ color: et.textSecondary }}
                          >
                            <span
                              className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                              style={{
                                backgroundColor: `${color}18`,
                                color: color,
                              }}
                            >
                              {badgeLabel}
                            </span>
                            {cat?.name ?? entry.category}
                          </p>
                        </div>

                        {/* Amount */}
                        <p
                          className="text-sm font-bold flex-shrink-0"
                          style={{ color }}
                        >
                          {prefix}
                          {fmtINR(entry.amount)}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
