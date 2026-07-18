import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Wallet, PiggyBank, BarChart3, CalendarDays, Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useExpenseTheme } from '../../theme/expenseTheme';
import { getEntriesForDateRange, getCategoryById, deleteEntriesInRange } from '../../utils/expenseStorage';
import {
  calculateSummary, getWeekRange, fmtINR, fmtPct,
  formatFullDate, DAY_NAMES,
  getUnloggedSubsForRange,
  buildSubscriptionEntriesForRange,
  filterUncoveredSubBillings,
  calcPeriodChange,
  getTodayStr,
} from '../../utils/expenseCalculations';
import type { Entry } from '../../types/expense';
import { toLocalDateStr, todayStr } from '../../utils/dateUtils';
// Bridge subscription store so weekly totals can include billings
// (BUG 3.2 fix).
import { useBudgetTrackerStore } from '../../store/useBudgetTrackerStore';

/* ── constants ── */

type SubTab = 'expense' | 'income' | 'investment';

const SUB_TABS: { id: SubTab; labelKey: string; fallback: string }[] = [
  { id: 'expense',    labelKey: 'expenses.expenses',    fallback: 'Expenses' },
  { id: 'income',     labelKey: 'expenses.income',      fallback: 'Income' },
  { id: 'investment', labelKey: 'expenses.investments',  fallback: 'Investments' },
];

/* ── helpers ── */

function isTodayStr(dateStr: string): boolean {
  return dateStr === todayStr();
}

function dateOfWeekday(startDate: string, dayIndex: number): string {
  const d = new Date(startDate + 'T00:00:00');
  d.setDate(d.getDate() + dayIndex);
  return toLocalDateStr(d);
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

// `refreshKey` is bumped by ExpenseTracker after the global FAB saves an entry.
// Including it in the entries useMemo deps forces a re-fetch from storage so the
// freshly added entry shows up immediately without a tab switch.
//
// `onEditEntry` is a parent callback. When the user taps a transaction row, the
// tab calls this with the full Entry, and the parent opens the shared
// AddEntrySheet pre-filled in edit mode.
interface WeeklyTabProps {
  refreshKey?: number;
  onEditEntry?: (entry: Entry) => void;
}

export default function WeeklyTab({ refreshKey = 0, onEditEntry }: WeeklyTabProps) {
  const { t } = useTranslation();
  const et = useExpenseTheme();

  const [weekOffset, setWeekOffset] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('expense');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);
  const [localRefresh, setLocalRefresh] = useState(0);

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

  /* ── entries (refreshKey is in deps so global-FAB saves trigger refetch) ── */
  const weekEntries = useMemo(
    () => getEntriesForDateRange(week.start, week.end),
    [week, refreshKey, localRefresh],
  );
  const prevWeekEntries = useMemo(
    () => getEntriesForDateRange(prevWeek.start, prevWeek.end),
    [prevWeek, refreshKey, localRefresh],
  );

  /* ── summaries ── */
  const summary = useMemo(() => calculateSummary(weekEntries), [weekEntries]);
  const prevSummary = useMemo(() => calculateSummary(prevWeekEntries), [prevWeekEntries]);

  /* ── clear all entries for the week ── */
  const handleClearAllWeek = () => {
    deleteEntriesInRange(week.start, week.end);
    setShowClearAll(false);
    setLocalRefresh(k => k + 1);
  };

  /* ── BUG 3.2: subscription billings hitting this week ── */
  const subscriptions = useBudgetTrackerStore(s => s.subscriptions);
  const todayISO = getTodayStr();

  /** Synthetic Entry-shaped objects for every sub billing in [week.start, week.end].
   *  These are merged into the day-by-day chart and the "All Entries" log so the
   *  user sees recurring subs inline with their manually logged entries. Only
   *  billings on-or-before today are included (upcoming subs are skipped).
   *  filterUncoveredSubBillings drops billings the user ALSO logged manually
   *  as a 'subscription'-category expense — without it the chart and entry
   *  list double-counted those while the deduped headline total didn't,
   *  making the tab internally inconsistent. */
  const weekSubEntries = useMemo(
    () => filterUncoveredSubBillings(
      buildSubscriptionEntriesForRange(subscriptions, week.start, week.end, todayISO),
      weekEntries,
      week.start,
      week.end,
    ),
    [subscriptions, week.start, week.end, todayISO, weekEntries],
  );
  const weekSubsBilled = useMemo(
    () => getUnloggedSubsForRange(weekEntries, subscriptions, week.start, week.end, todayISO),
    [weekEntries, subscriptions, week.start, week.end, todayISO],
  );
  const prevWeekSubsBilled = useMemo(
    () => getUnloggedSubsForRange(prevWeekEntries, subscriptions, prevWeek.start, prevWeek.end, todayISO),
    [prevWeekEntries, subscriptions, prevWeek.start, prevWeek.end, todayISO],
  );

  /* ── canonical totals (logged + subs) ── */
  const canonicalExpenses = summary.totalExpenses + weekSubsBilled;
  const prevCanonicalExpenses = prevSummary.totalExpenses + prevWeekSubsBilled;
  // Cash net for the week: income − expenses − investments (money that
  // left the wallet includes what was invested).
  const canonicalWeekNet = summary.totalIncome - canonicalExpenses - summary.totalInvestments;

  /* ── vs last week change ── BUG 3.1 fix:
       use calcPeriodChange so zero-base cases ("Same", "New activity",
       "-100%") render correctly instead of as "NaN%" or "-100%" with
       no context. Compare CANONICAL totals so the percentage matches
       the headline figure (which now includes subs). */
  const change = useMemo(() => {
    const detail = calcPeriodChange(canonicalExpenses, prevCanonicalExpenses);
    return {
      display: detail.display,
      isNew: detail.tone === 'new',
      // Color: down is good (less spending), up is bad, same/new neutral
      color: detail.tone === 'down' ? et.accentIncome
        : detail.tone === 'up' ? et.accentExpense
        : et.textMuted,
      tone: detail.tone,
    };
  }, [canonicalExpenses, prevCanonicalExpenses, et]);

  /* ── day-by-day data ──
     BUG 3.2 fix: merge in subscription billings whose date falls on
     this day. Subs are typed 'expense' so they only show up when the
     active sub-tab is 'expense'.
     BUG 3.3 fix: future days return total=0 (not "—"), past/today
     days with no logged entries also show ₹0 — the "—" sentinel only
     remains for future days, handled in the render below. */
  const dayData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dayDateStr = dateOfWeekday(week.start, i);
      const loggedDayEntries = weekEntries.filter(
        (e) => e.date === dayDateStr && e.type === activeSubTab,
      );
      // Subscription entries for this day (only when viewing expenses)
      const subDayEntries = activeSubTab === 'expense'
        ? weekSubEntries
            .filter(s => s.date === dayDateStr)
            .map(s => ({
              // Cast to Entry shape for downstream code that expects Entry
              id: s.id,
              type: 'expense' as const,
              amount: s.amount,
              date: s.date,
              category: s.category,
              description: s.description,
              paymentMethod: 'auto_debit' as const,
              recurrence: 'none' as const,
              isDeleted: false,
              createdAt: '',
              updatedAt: '',
              isRecurring: true as const,
            }))
        : [];
      const dayEntries = [...loggedDayEntries, ...subDayEntries];
      const total = dayEntries.reduce((s, e) => s + e.amount, 0);
      const isFuture = dayDateStr > todayISO;
      return { dayIndex: i, dateStr: dayDateStr, entries: dayEntries, total, isFuture };
    });
  }, [week.start, weekEntries, weekSubEntries, activeSubTab, todayISO]);

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

  /* ── all entries grouped by day ──
     BUG 3.2 fix: include synthetic sub entries so the user sees
     "Netflix (Recurring) ₹499" in the daily group list. */
  const groupedEntries = useMemo(() => {
    const subAsEntries: Entry[] = weekSubEntries.map(s => ({
      id: s.id,
      type: 'expense',
      amount: s.amount,
      date: s.date,
      category: s.category,
      description: s.description,
      paymentMethod: 'auto_debit',
      recurrence: 'none',
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
      // Custom marker so the row renderer can show a "Recurring" badge
      // (cast away from the Entry type since this is a synthetic flag).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...({ isRecurring: true } as any),
    }));
    const sorted = [...weekEntries, ...subAsEntries].sort(
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
  }, [weekEntries, weekSubEntries]);

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

      {/* Clear All button */}
      {weekEntries.length > 0 && (
        <div className="flex justify-end">
          <button onClick={() => setShowClearAll(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold" style={{ color: et.accentExpense, backgroundColor: et.accentExpense + '15' }}>
            <Trash2 size={11} /> {t('expenses.clearAllEntries', 'Clear All')}
          </button>
        </div>
      )}

      {/* Clear All confirmation */}
      <AnimatePresence>
        {showClearAll && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10001] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={() => setShowClearAll(false)}>
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }} className="w-full max-w-xs rounded-2xl p-6" style={{ backgroundColor: et.bgCard, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
              <p className="font-bold text-base mb-2" style={{ color: et.textPrimary }}>{t('expenses.clearAllTitle', 'Clear All Entries?')}</p>
              <p className="text-sm mb-5" style={{ color: et.textSecondary }}>{t('expenses.clearAllWeekMsg', 'All entries for this week will be deleted. This cannot be undone.')}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowClearAll(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: et.borderSubtle, color: et.textSecondary }}>{t('common.cancel', 'Cancel')}</button>
                <button onClick={handleClearAllWeek} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: et.accentExpense }}>{t('expenses.clearAll', 'Clear All')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        {/* Total Spent + vs last week —
            BUG 3.1 + 3.2 fix: uses canonical (logged + subs) and
            shows a friendly message in degenerate zero cases. */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: et.textSecondary }}>
              {t('expenses.totalSpent', 'Total Spent')}
            </p>
            <p
              className="font-extrabold leading-none"
              style={{ fontSize: 28, color: et.accentExpense }}
            >
              {fmtINR(canonicalExpenses)}
            </p>
            {weekSubsBilled > 0 && (
              <p className="text-[10px] mt-1" style={{ color: et.textMuted }}>
                {fmtINR(summary.totalExpenses)} {t('expenses.logged', 'logged')} + {fmtINR(weekSubsBilled)} {t('expenses.recurringSubsLabel', 'recurring')}
              </p>
            )}
          </div>
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold mt-1"
            style={{
              backgroundColor: `${change.color}14`,
              color: change.color,
            }}
          >
            {change.tone === 'new' ? (
              <>
                <TrendingUp size={12} />
                {t('expenses.new')}
              </>
            ) : change.tone === 'same' ? (
              <>{t('expenses.vsLastWeek', 'vs last week')}: {t('expenses.same', 'Same')}</>
            ) : change.tone === 'down' && canonicalExpenses === 0 ? (
              <>
                <TrendingDown size={12} />
                {t('expenses.noSpendingThisWeek', 'No spending this week 🎉')}
              </>
            ) : (
              <>
                {change.tone === 'down'
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
              value: fmtINR(canonicalExpenses / dailyAvgDivisor),
              color: et.accentGold,
              bg: `${et.accentGold}12`,
              icon: <BarChart3 size={14} />,
            },
            {
              label: t('expenses.netSaved', 'Net Saved'),
              value: fmtINR(canonicalWeekNet),
              color: canonicalWeekNet >= 0 ? et.accentIncome : et.accentExpense,
              bg: canonicalWeekNet >= 0 ? et.bgIncome : et.bgExpense,
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

                  {/* Amount — BUG 3.3 fix: only future days show "—".
                      Past/today days with 0 logged AND 0 sub billings
                      now show "₹0" (was "—" which looked like a bug). */}
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
                    {day.isFuture ? '\u2014' : fmtINR(day.total)}
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
                                onClick={() => onEditEntry?.(entry)}
                                role={onEditEntry ? 'button' : undefined}
                                tabIndex={onEditEntry ? 0 : undefined}
                                className="flex items-center gap-2.5 py-1 cursor-pointer"
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

                    // Synthetic sub rows are read-only (you can't edit
                    // a recurring billing — manage it in the
                    // Subscriptions tab instead). Detect via the id
                    // prefix we set in buildSubscriptionEntriesForRange.
                    const isSyntheticSub = entry.id.startsWith('sub_');
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileTap={onEditEntry && !isSyntheticSub ? { scale: 0.98 } : {}}
                        onClick={() => { if (!isSyntheticSub) onEditEntry?.(entry); }}
                        role={onEditEntry && !isSyntheticSub ? 'button' : undefined}
                        tabIndex={onEditEntry && !isSyntheticSub ? 0 : undefined}
                        className={`flex items-center gap-3 py-2 ${isSyntheticSub ? '' : 'cursor-pointer'}`}
                      >
                        {/* Icon card */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{
                            backgroundColor: entry.type === 'transfer'
                              ? `${color}20`
                              : `${cat?.color ?? '#8b5cf6'}20`,
                          }}
                        >
                          {entry.type === 'transfer' ? '\uD83D\uDD04' : (cat?.icon ?? '\uD83D\uDCE6')}
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
                            {entry.type === 'transfer'
                              ? t('expenses.transfer', 'Transfer')
                              : (cat?.name ?? entry.category)}
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
