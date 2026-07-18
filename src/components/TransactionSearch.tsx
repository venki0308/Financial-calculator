// ═══════════════════════════════════════════════════════════════
// FINCALIX — TRANSACTION SEARCH & FILTERS (full-screen overlay)
// Opened from the ExpenseTracker header. Read-only: searches ALL
// entries across time; tapping a result opens the shared edit flow
// via the parent's onEditEntry (same handler the tabs use).
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useExpenseTheme } from '../theme/expenseTheme';
import type { Entry, EntryType } from '../types/expense';
import { getAllEntries, getAllCategories } from '../utils/expenseStorage';
import {
  fmtINR, getTodayStr, getMonthRange, getYearRange, formatFullDate,
} from '../utils/expenseCalculations';

// Neutral blue for transfers — matches WeeklyTab's entryTypeColor
const TRANSFER_COLOR = '#0284c7';

const MAX_RENDERED_ROWS = 200;

type TypeFilter = 'all' | EntryType;
type RangeFilter = 'month' | 'threeMonths' | 'year' | 'all';

function entryColor(type: EntryType, et: ReturnType<typeof useExpenseTheme>): string {
  if (type === 'income') return et.accentIncome;
  if (type === 'investment') return et.accentInvestment;
  if (type === 'transfer') return TRANSFER_COLOR;
  return et.accentExpense;
}

function amountPrefix(type: EntryType): string {
  if (type === 'income') return '+';
  if (type === 'expense') return '-';
  return '';
}

interface Props {
  /** Bumped by the parent after an entry is saved/edited so results refresh. */
  refreshKey?: number;
  /** Parent's shared edit handler — same one passed to Weekly/Monthly tabs. */
  onEditEntry?: (entry: Entry) => void;
  onClose: () => void;
}

export default function TransactionSearch({ refreshKey = 0, onEditEntry, onClose }: Props) {
  const { t } = useTranslation();
  const et = useExpenseTheme();

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('threeMonths');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const allEntries = useMemo(() => {
    void refreshKey;
    return getAllEntries();
  }, [refreshKey]);

  const catById = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; color: string }>();
    getAllCategories().forEach(c => map.set(c.id, { name: c.name, icon: c.icon, color: c.color }));
    return map;
  }, []);

  const range = useMemo((): { start: string; end: string } | null => {
    const today = getTodayStr();
    if (rangeFilter === 'month') {
      const m = getMonthRange(0);
      return { start: m.start, end: m.end };
    }
    if (rangeFilter === 'threeMonths') {
      // Current month + two previous months
      return { start: getMonthRange(-2).start, end: today };
    }
    if (rangeFilter === 'year') {
      const y = getYearRange(0);
      return { start: y.start, end: y.end };
    }
    return null; // all time
  }, [rangeFilter]);

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = parseFloat(minAmount);
    const max = parseFloat(maxAmount);
    const hasMin = Number.isFinite(min);
    const hasMax = Number.isFinite(max);

    return allEntries
      .filter(e => {
        if (typeFilter !== 'all' && e.type !== typeFilter) return false;
        if (range && (e.date < range.start || e.date > range.end)) return false;
        if (hasMin && e.amount < min) return false;
        if (hasMax && e.amount > max) return false;
        if (q) {
          const catName = e.type === 'transfer'
            ? t('expenses.transfer', 'Transfer')
            : (catById.get(e.category)?.name ?? e.category);
          const desc = (e.description || '').toLowerCase();
          if (!desc.includes(q) && !catName.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [allEntries, query, typeFilter, range, minAmount, maxAmount, catById, t]);

  // Net of matched entries per the app's money model: income − expenses −
  // investments, transfers excluded. (Blindly summing amounts added income
  // to expenses and counted transfers, showing a meaningless "total".)
  const matchedTotal = useMemo(() => matched.reduce((s, e) => {
    if (e.type === 'income') return s + e.amount;
    if (e.type === 'expense' || e.type === 'investment') return s - e.amount;
    return s; // transfer — excluded from all totals
  }, 0), [matched]);

  // Group the first MAX_RENDERED_ROWS by date (already sorted date-desc).
  const grouped = useMemo(() => {
    const capped = matched.slice(0, MAX_RENDERED_ROWS);
    const groups: { date: string; entries: Entry[] }[] = [];
    capped.forEach(entry => {
      const last = groups[groups.length - 1];
      if (last && last.date === entry.date) last.entries.push(entry);
      else groups.push({ date: entry.date, entries: [entry] });
    });
    return groups;
  }, [matched]);

  const typeChips: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: t('expenses.all', 'All') },
    { id: 'expense', label: t('expenses.expense', 'Expense') },
    { id: 'income', label: t('expenses.income', 'Income') },
    { id: 'investment', label: t('expenses.investment', 'Investment') },
    { id: 'transfer', label: t('expenses.transfer', 'Transfer') },
  ];

  const rangeChips: { id: RangeFilter; label: string }[] = [
    { id: 'month', label: t('expenses.searchThisMonth', 'This month') },
    { id: 'threeMonths', label: t('expenses.searchLast3Months', 'Last 3 months') },
    { id: 'year', label: t('expenses.searchThisYear', 'This year') },
    { id: 'all', label: t('expenses.searchAllTime', 'All time') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed inset-0 z-[10000] flex flex-col"
      style={{ backgroundColor: et.bgPrimary }}
    >
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 px-4 pt-12 pb-3 border-b"
        style={{ backgroundColor: et.bgCard, borderColor: et.borderSubtle }}
      >
        <div className="flex items-center gap-3 mb-3">
          <h2 className="flex-1 font-extrabold text-base" style={{ color: et.textPrimary }}>
            {t('expenses.searchTitle', 'Search Transactions')}
          </h2>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onClose}
            className="p-2 rounded-full"
            style={{ backgroundColor: et.borderSubtle, color: et.textSecondary }}
            aria-label={t('common.close', 'Close')}
          >
            <X size={18} />
          </motion.button>
        </div>

        {/* Text search */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
          style={{ backgroundColor: et.bgPrimary, border: `1.5px solid ${et.borderSubtle}` }}
        >
          <Search size={16} style={{ color: et.textMuted, flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('expenses.searchPlaceholder', 'Search by note or category...')}
            autoFocus
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: et.textPrimary }}
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label={t('common.clear', 'Clear')}>
              <X size={14} style={{ color: et.textMuted }} />
            </button>
          )}
        </div>

        {/* Type chips */}
        <div className="flex gap-1.5 flex-wrap mb-2">
          {typeChips.map(chip => {
            const active = typeFilter === chip.id;
            const color = chip.id === 'all' ? et.accentPrimary : entryColor(chip.id, et);
            return (
              <button
                key={chip.id}
                onClick={() => setTypeFilter(chip.id)}
                className="px-3 py-1.5 text-[11px] font-bold transition-all"
                style={{
                  borderRadius: 999,
                  ...(active
                    ? { backgroundColor: color, color: '#fff' }
                    : { backgroundColor: 'transparent', border: `1.5px solid ${et.borderSubtle}`, color: et.textMuted }),
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Date range chips */}
        <div className="flex gap-1.5 flex-wrap mb-2">
          {rangeChips.map(chip => {
            const active = rangeFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setRangeFilter(chip.id)}
                className="px-3 py-1.5 text-[11px] font-semibold transition-all"
                style={{
                  borderRadius: 999,
                  ...(active
                    ? { backgroundColor: et.accentPrimary + '18', color: et.accentPrimary, border: `1.5px solid ${et.accentPrimary}` }
                    : { backgroundColor: 'transparent', border: `1.5px solid ${et.borderSubtle}`, color: et.textMuted }),
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Min / Max amount */}
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={minAmount}
            onChange={e => { if (!e.target.value.startsWith('-')) setMinAmount(e.target.value); }}
            placeholder={t('expenses.searchMinAmount', 'Min ₹')}
            className="flex-1 px-3 py-2 rounded-xl text-xs focus:outline-none"
            style={{ backgroundColor: et.bgPrimary, border: `1.5px solid ${et.borderSubtle}`, color: et.textPrimary }}
          />
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={maxAmount}
            onChange={e => { if (!e.target.value.startsWith('-')) setMaxAmount(e.target.value); }}
            placeholder={t('expenses.searchMaxAmount', 'Max ₹')}
            className="flex-1 px-3 py-2 rounded-xl text-xs focus:outline-none"
            style={{ backgroundColor: et.bgPrimary, border: `1.5px solid ${et.borderSubtle}`, color: et.textPrimary }}
          />
        </div>
      </div>

      {/* ── Result summary ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5">
        <span className="text-[11px] font-semibold" style={{ color: et.textMuted }}>
          {t('expenses.searchResultCount', '{{count}} matching entries', { count: matched.length })}
        </span>
        <span className="text-[11px] font-bold" style={{ color: et.textSecondary }}>
          {t('expenses.searchNetLabel', 'Net')}: {matchedTotal >= 0 ? '+' : ''}{fmtINR(matchedTotal)}
        </span>
      </div>

      {/* ── Results ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {matched.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl block mb-3">🔍</span>
            <p className="text-sm font-semibold mb-1" style={{ color: et.textPrimary }}>
              {t('expenses.searchNoResults', 'No matching transactions')}
            </p>
            <p className="text-xs" style={{ color: et.textMuted }}>
              {t('expenses.searchNoResultsHint', 'Try a different keyword or widen the filters')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(group => (
              <div key={group.date}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: et.textMuted }}>
                    {formatFullDate(group.date)}
                  </p>
                  <div className="flex-1 h-px" style={{ backgroundColor: et.borderSubtle }} />
                </div>
                <div className="space-y-2">
                  {group.entries.map(entry => {
                    const isTransfer = entry.type === 'transfer';
                    const cat = catById.get(entry.category);
                    const color = entryColor(entry.type, et);
                    return (
                      <motion.div
                        key={entry.id}
                        whileTap={onEditEntry ? { scale: 0.98 } : {}}
                        onClick={() => onEditEntry?.(entry)}
                        role={onEditEntry ? 'button' : undefined}
                        tabIndex={onEditEntry ? 0 : undefined}
                        className={`flex items-center gap-3 p-3 rounded-2xl ${onEditEntry ? 'cursor-pointer' : ''}`}
                        style={{ backgroundColor: et.bgCard, boxShadow: et.shadowSoft }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{
                            backgroundColor: (isTransfer ? TRANSFER_COLOR : (cat?.color ?? '#94a3b8')) + '20',
                          }}
                        >
                          {isTransfer ? '🔄' : (cat?.icon ?? '📦')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: et.textPrimary }}>
                            {entry.description
                              || (isTransfer ? t('expenses.transfer', 'Transfer') : cat?.name)
                              || entry.category}
                          </p>
                          <p className="text-[10px] truncate mt-0.5" style={{ color: et.textMuted }}>
                            {isTransfer ? t('expenses.transfer', 'Transfer') : (cat?.name ?? entry.category)}
                          </p>
                        </div>
                        <p
                          className="text-sm font-bold flex-shrink-0"
                          style={{ color, fontVariantNumeric: 'tabular-nums' }}
                        >
                          {amountPrefix(entry.type)}{fmtINR(entry.amount)}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}

            {matched.length > MAX_RENDERED_ROWS && (
              <p className="text-center text-[11px] py-3" style={{ color: et.textMuted }}>
                {t('expenses.searchShowingFirst', 'Showing first {{count}} results — narrow your filters to see the rest', { count: MAX_RENDERED_ROWS })}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
