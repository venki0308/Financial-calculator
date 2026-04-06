import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppColors } from '../../theme/useAppColors';
import type { Entry } from '../../types/expense';
import {
  getEntriesForDateRange, getAllCategories,
} from '../../utils/expenseStorage';
import {
  calculateSummary, getWeekRange, fmtINR,
  calculatePercentChange, DAY_NAMES, formatFullDate,
} from '../../utils/expenseCalculations';

/* ── constants ── */

type SubTab = 'expense' | 'income' | 'investment';

const SUB_TABS: { id: SubTab; color: string; mutedColor: string }[] = [
  { id: 'expense',    color: '#ef4444', mutedColor: 'rgba(239,68,68,0.25)' },
  { id: 'income',     color: '#10b981', mutedColor: 'rgba(16,185,129,0.25)' },
  { id: 'investment', color: '#3b82f6', mutedColor: 'rgba(59,130,246,0.25)' },
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

/* ── component ── */

export default function WeeklyTab() {
  const { t } = useTranslation();
  const c = useAppColors();

  const [weekOffset, setWeekOffset] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('expense');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const isCurrentWeek = weekOffset === 0;

  /* ── week ranges ── */
  const week = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const prevWeek = useMemo(() => getWeekRange(weekOffset - 1), [weekOffset]);

  /* ── entries ── */
  const weekEntries = useMemo(() => getEntriesForDateRange(week.start, week.end), [week]);
  const prevWeekEntries = useMemo(() => getEntriesForDateRange(prevWeek.start, prevWeek.end), [prevWeek]);

  /* ── summaries ── */
  const summary = useMemo(() => calculateSummary(weekEntries), [weekEntries]);
  const prevSummary = useMemo(() => calculateSummary(prevWeekEntries), [prevWeekEntries]);

  const allCategories = useMemo(() => getAllCategories(), []);

  /* ── percent change ── */
  const pctVsLastWeek = calculatePercentChange(summary.totalExpenses, prevSummary.totalExpenses);

  /* ── summary cards ── */
  const summaryCards = useMemo(() => {
    const row1 = [
      {
        label: t('expenses.totalSpent', 'Total Spent'),
        value: fmtINR(summary.totalExpenses),
        color: '#ef4444',
      },
      {
        label: t('expenses.totalEarned', 'Total Earned'),
        value: fmtINR(summary.totalIncome),
        color: '#10b981',
      },
      {
        label: t('expenses.netSaved', 'Net Saved'),
        value: fmtINR(Math.abs(summary.netSavings)),
        color: summary.netSavings >= 0 ? '#10b981' : '#ef4444',
      },
    ];
    const row2 = [
      {
        label: t('expenses.dailyAverage', 'Daily Average'),
        value: fmtINR(summary.totalExpenses / 7),
        color: '#f97316',
      },
      {
        label: t('expenses.vsLastWeek', 'vs Last Week'),
        value: `${pctVsLastWeek >= 0 ? '+' : ''}${pctVsLastWeek.toFixed(0)}%`,
        color: pctVsLastWeek <= 0 ? '#10b981' : '#ef4444',
      },
      {
        label: t('expenses.invested', 'Invested'),
        value: fmtINR(summary.totalInvestments),
        color: '#3b82f6',
      },
    ];
    return { row1, row2 };
  }, [summary, prevSummary, pctVsLastWeek, t]);

  /* ── day-by-day data ── */
  const barConfig = SUB_TABS.find(s => s.id === activeSubTab)!;

  const dayData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dayDateStr = dateOfWeekday(week.start, i);
      const dayEntries = weekEntries.filter(e => e.date === dayDateStr && e.type === activeSubTab);
      const total = dayEntries.reduce((s, e) => s + e.amount, 0);
      return { dayIndex: i, dateStr: dayDateStr, entries: dayEntries, total };
    });
  }, [week.start, weekEntries, activeSubTab]);

  const maxDayTotal = Math.max(...dayData.map(d => d.total), 1);

  /* ── category breakdown ── */
  const breakdown = useMemo(() => {
    const filtered = weekEntries.filter(e => e.type === activeSubTab);
    const catSummary = calculateSummary(filtered);
    const list = activeSubTab === 'expense'
      ? catSummary.expenseByCategory
      : activeSubTab === 'income'
        ? catSummary.incomeByCategory
        : catSummary.investmentByCategory;
    return list;
  }, [weekEntries, activeSubTab]);

  const breakdownTotal = breakdown.reduce((s, b) => s + b.amount, 0);

  /* ── all entries sorted newest first ── */
  const sortedEntries = useMemo(
    () => [...weekEntries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [weekEntries],
  );

  /* ── category lookup helper ── */
  const catFor = (entry: Entry) => allCategories.find(cat => cat.id === entry.category);

  return (
    <div className="space-y-4 pb-6">
      {/* ── WEEK NAVIGATOR ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setWeekOffset(w => w - 1); setExpandedDay(null); }}
          className="p-2 rounded-xl"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
        >
          <ChevronLeft size={18} style={{ color: c.textSecondary }} />
        </button>
        <div
          className="flex-1 text-center py-2.5 rounded-xl"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
        >
          <p className="text-sm font-bold" style={{ color: c.text }}>{week.label}</p>
          {isCurrentWeek && (
            <p className="text-[10px] font-semibold text-purple-500">
              {t('expenses.thisWeek', 'This Week')}
            </p>
          )}
        </div>
        <button
          onClick={() => { setWeekOffset(w => w + 1); setExpandedDay(null); }}
          disabled={isCurrentWeek}
          className="p-2 rounded-xl disabled:opacity-30"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
        >
          <ChevronRight size={18} style={{ color: c.textSecondary }} />
        </button>
      </div>

      {/* ── SUMMARY CARDS (2 rows of 3) ── */}
      {[summaryCards.row1, summaryCards.row2].map((row, ri) => (
        <div key={ri} className="grid grid-cols-3 gap-2">
          {row.map(card => (
            <div
              key={card.label}
              className="rounded-2xl p-3 text-center"
              style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
            >
              <p className="text-[10px] font-medium mb-1" style={{ color: c.textSecondary }}>
                {card.label}
              </p>
              <p className="text-sm font-extrabold" style={{ color: card.color }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      ))}

      {/* ── SUB-TABS ── */}
      <div
        className="flex gap-1 rounded-xl p-1"
        style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
      >
        {SUB_TABS.map(tab => {
          const labels: Record<SubTab, string> = {
            expense: t('expenses.expenses', 'Expenses'),
            income: t('expenses.income', 'Income'),
            investment: t('expenses.investments', 'Investments'),
          };
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveSubTab(tab.id); setExpandedDay(null); }}
              className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
              style={active
                ? { backgroundColor: tab.color, color: '#fff' }
                : { color: c.textSecondary }
              }
            >
              {labels[tab.id]}
            </button>
          );
        })}
      </div>

      {/* ── DAY BAR CHART ── */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
      >
        <h3 className="font-bold text-sm mb-4" style={{ color: c.text }}>
          {t('expenses.dayByDay', 'Day-by-Day')}
        </h3>
        <div className="space-y-2">
          {dayData.map((day, i) => {
            const isToday = isTodayStr(day.dateStr);
            const isExpanded = expandedDay === i;
            const pct = maxDayTotal > 0 ? (day.total / maxDayTotal) * 100 : 0;
            return (
              <div key={i}>
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : i)}
                  className="w-full flex items-center gap-3 py-2 px-3 rounded-xl transition-all"
                  style={isToday
                    ? { backgroundColor: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }
                    : {}
                  }
                >
                  <span
                    className="text-xs font-bold w-8"
                    style={{ color: isToday ? '#7c3aed' : c.textSecondary }}
                  >
                    {DAY_NAMES[i]}
                  </span>
                  <div
                    className="flex-1 h-5 rounded-full overflow-hidden"
                    style={{ backgroundColor: c.isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: day.total === maxDayTotal && day.total > 0
                          ? barConfig.color
                          : barConfig.mutedColor,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-bold min-w-[60px] text-right"
                    style={{ color: day.total === 0 ? c.textSecondary : barConfig.color }}
                  >
                    {day.total === 0 ? '—' : fmtINR(day.total)}
                  </span>
                </button>

                {/* Expanded entries for this day */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="pl-11 pr-3 overflow-hidden"
                    >
                      {day.entries.length > 0 ? (
                        <div
                          className="space-y-1.5 py-2 pl-3"
                          style={{ borderLeft: `2px solid ${c.border}` }}
                        >
                          {day.entries.map(entry => {
                            const cat = catFor(entry);
                            return (
                              <div key={entry.id} className="flex items-center gap-2 text-xs">
                                <span>{cat?.icon ?? '📦'}</span>
                                <span className="flex-1 truncate" style={{ color: c.text }}>
                                  {entry.description || cat?.name || entry.category}
                                </span>
                                <span className="font-bold" style={{ color: barConfig.color }}>
                                  {fmtINR(entry.amount)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] italic py-2" style={{ color: c.textSecondary }}>
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

      {/* ── CATEGORY BREAKDOWN ── */}
      {breakdown.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
        >
          <h3 className="font-bold text-sm mb-4" style={{ color: c.text }}>
            {activeSubTab === 'expense'
              ? t('expenses.spendingByCategory', 'Spending by Category')
              : activeSubTab === 'income'
                ? t('expenses.incomeSources', 'Income Sources')
                : t('expenses.investmentBreakdown', 'Investment Breakdown')
            }
          </h3>
          <div className="space-y-3">
            {breakdown.map((item, idx) => {
              const pct = breakdownTotal > 0 ? (item.amount / breakdownTotal) * 100 : 0;
              return (
                <div key={item.categoryId} className="flex items-center gap-3">
                  <span className="text-lg flex-shrink-0">{item.categoryIcon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: c.text }}>
                      {item.categoryName}
                    </p>
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden mt-1"
                      style={{ backgroundColor: c.isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.categoryColor || barConfig.color }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold" style={{ color: c.text }}>
                      {fmtINR(item.amount)}
                    </p>
                    <p className="text-[10px]" style={{ color: c.textSecondary }}>
                      {pct.toFixed(0)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ALL ENTRIES THIS WEEK ── */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
      >
        <h3 className="font-bold text-sm mb-3" style={{ color: c.text }}>
          {t('expenses.allEntriesThisWeek', 'All Entries This Week')}
        </h3>

        {sortedEntries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm" style={{ color: c.textSecondary }}>
              {t('expenses.noEntriesWeek', 'No entries recorded this week')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedEntries.map(entry => {
              const cat = catFor(entry);
              const typeColor =
                entry.type === 'income' ? '#10b981'
                : entry.type === 'investment' ? '#3b82f6'
                : entry.type === 'transfer' ? '#8b5cf6'
                : '#ef4444';
              const badgeLabel =
                entry.type === 'income' ? t('expenses.earned', 'Earned')
                : entry.type === 'investment' ? t('expenses.invested', 'Invested')
                : entry.type === 'transfer' ? t('expenses.transfer', 'Transfer')
                : t('expenses.spent', 'Spent');
              const prefix = entry.type === 'income' ? '+' : entry.type === 'expense' ? '-' : '';

              return (
                <div key={entry.id} className="flex items-center gap-3 py-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: `${cat?.color ?? '#8b5cf6'}20` }}
                  >
                    {cat?.icon ?? '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: c.text }}>
                      {entry.description || cat?.name || entry.category}
                    </p>
                    <p className="text-[10px] flex items-center gap-1.5" style={{ color: c.textSecondary }}>
                      <span
                        className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                        style={{ backgroundColor: `${typeColor}20`, color: typeColor }}
                      >
                        {badgeLabel}
                      </span>
                      {formatFullDate(entry.date)}
                    </p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: typeColor }}>
                    {prefix}{fmtINR(entry.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
