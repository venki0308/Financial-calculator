import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useExpenseTheme, TYPE_COLORS, getGreetingKey, calculateStreak } from '../../theme/expenseTheme';
import type { Entry, EntryType, Category } from '../../types/expense';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  PAYMENT_METHOD_LABELS,
} from '../../types/expense';
import {
  getEntriesForDate, deleteEntry,
  getAllCategories, getCategoryById, getAllEntries,
} from '../../utils/expenseStorage';
import { fmtINR, getTodayStr, formatFullDate } from '../../utils/expenseCalculations';
import { loadDemoData, getDemoEntryCount } from '../../utils/demoDataLoader';
import SharedAddEntrySheet from '../../components/AddEntrySheet';

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════ */

const ENTRY_TYPES: { id: EntryType; label: string; emoji: string }[] = [
  { id: 'expense',    label: 'Expense',    emoji: '💸' },
  { id: 'income',     label: 'Income',     emoji: '💰' },
  { id: 'investment', label: 'Investment', emoji: '📈' },
];

const SUB_TAB_IDS = ['all', 'expense', 'income', 'investment'] as const;
type SubTab = (typeof SUB_TAB_IDS)[number];

const QUICK_AMOUNTS = [100, 250, 500, 1000, 5000];

const QUICK_ADD_CATS = [
  DEFAULT_EXPENSE_CATEGORIES[0],   // Food & Dining
  DEFAULT_EXPENSE_CATEGORIES[2],   // Transport
  DEFAULT_EXPENSE_CATEGORIES[3],   // Shopping
];

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */

function shiftDay(current: string, delta: number): string {
  const d = new Date(current + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Build array of 7 days centered around a date (3 before, current, 3 after) */
function buildWeekStrip(center: string): { date: string; dayName: string; dayNum: number; isToday: boolean }[] {
  const today = getTodayStr();
  const days: { date: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = -3; i <= 3; i++) {
    const dt = new Date(center + 'T00:00:00');
    dt.setDate(dt.getDate() + i);
    const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    days.push({
      date: dateStr,
      dayName: DAY_SHORT[dt.getDay()],
      dayNum: dt.getDate(),
      isToday: dateStr === today,
    });
  }
  return days;
}

function typeColor(type: EntryType, et: ReturnType<typeof useExpenseTheme>): string {
  if (type === 'income') return et.accentIncome;
  if (type === 'investment') return et.accentInvestment;
  return et.accentExpense;
}

function subTabColor(tab: SubTab, et: ReturnType<typeof useExpenseTheme>): string {
  if (tab === 'expense') return et.accentExpense;
  if (tab === 'income') return et.accentIncome;
  if (tab === 'investment') return et.accentInvestment;
  return et.accentPrimary;
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */

export default function DailyTab() {
  const { t } = useTranslation();
  const et = useExpenseTheme();

  /* ── state ── */
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [showSheet, setShowSheet] = useState(false);
  // When set, the shared AddEntrySheet opens in EDIT mode pre-filled with this entry
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Tap on an entry row → open shared sheet in edit mode
  const handleEditEntry = useCallback((entry: Entry) => {
    setEditingEntry(entry);
    setShowSheet(true);
  }, []);

  const handleSheetClose = useCallback(() => {
    setShowSheet(false);
    setEditingEntry(null);
  }, []);

  const dayEntries = useMemo(() => {
    void refreshKey;
    return getEntriesForDate(selectedDate).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [selectedDate, refreshKey]);

  const allEntries = useMemo(() => {
    void refreshKey;
    return getAllEntries();
  }, [refreshKey]);

  const streak = useMemo(() => calculateStreak(allEntries), [allEntries]);

  const todayIncome = useMemo(
    () => dayEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
    [dayEntries],
  );
  const todayExpense = useMemo(
    () => dayEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    [dayEntries],
  );
  const todayInvestment = useMemo(
    () => dayEntries.filter(e => e.type === 'investment').reduce((s, e) => s + e.amount, 0),
    [dayEntries],
  );
  const todayNet = todayIncome - todayExpense;

  const filteredEntries = useMemo(() => {
    if (subTab === 'all') return dayEntries;
    return dayEntries.filter(e => e.type === subTab);
  }, [dayEntries, subTab]);

  const isToday = selectedDate === getTodayStr();
  const canGoForward = selectedDate < getTodayStr();
  const weekStrip = useMemo(() => buildWeekStrip(selectedDate), [selectedDate]);

  const spentRatio = todayIncome > 0 ? Math.min((todayExpense / todayIncome) * 100, 100) : 0;

  /* ── actions ── */
  const handleDelete = (id: string) => {
    deleteEntry(id);
    setDeleteConfirm(null);
    refresh();
  };

  const handleSaved = () => {
    refresh();
    setShowSheet(false);
    setEditingEntry(null);
  };

  const goPrev = () => setSelectedDate(d => shiftDay(d, -1));
  const goNext = () => { if (canGoForward) setSelectedDate(d => shiftDay(d, 1)); };

  const catFor = (entry: Entry): Category | undefined => getCategoryById(entry.category);

  /* ── greeting ── */
  const greeting = t(getGreetingKey());

  return (
    <div className="space-y-4 pb-24">

      {/* ════════════════════════════════════════════════════════
          1. DATE NAVIGATOR — 7-Day Strip
          ════════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl p-3"
        style={{ backgroundColor: et.bgCard, boxShadow: et.shadowSoft }}
      >
        {/* Month + arrows row */}
        <div className="flex items-center justify-between mb-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={goPrev}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ backgroundColor: et.bgPrimary }}
          >
            <ChevronLeft size={16} style={{ color: et.textSecondary }} />
          </motion.button>
          <div className="text-center">
            <span className="text-xs font-bold" style={{ color: et.textPrimary }}>
              {formatFullDate(selectedDate)}
            </span>
            {isToday && (
              <span
                className="ml-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: et.accentIncome + '20', color: et.accentIncome }}
              >
                {t('expenses.today', 'Today')}
              </span>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={goNext}
            disabled={!canGoForward}
            className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-30"
            style={{ backgroundColor: et.bgPrimary }}
          >
            <ChevronRight size={16} style={{ color: et.textSecondary }} />
          </motion.button>
        </div>

        {/* 7-day strip — horizontally scrollable on very small screens */}
        <div className="flex gap-1.5 justify-between overflow-x-auto hide-scrollbar">
          {weekStrip.map(day => {
            const isSelected = day.date === selectedDate;
            const isFuture = day.date > getTodayStr();
            return (
              <motion.button
                key={day.date}
                whileTap={{ scale: 0.9 }}
                onClick={() => !isFuture && setSelectedDate(day.date)}
                disabled={isFuture}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all"
                style={{
                  minWidth: 44,
                  minHeight: 48,
                  paddingTop: 6,
                  paddingBottom: 6,
                  backgroundColor: isSelected
                    ? et.accentPrimary
                    : day.isToday
                    ? et.accentIncome + '15'
                    : 'transparent',
                  opacity: isFuture ? 0.3 : 1,
                }}
              >
                <span
                  className="text-[9px] font-medium"
                  style={{ color: isSelected ? '#fff' : et.textMuted }}
                >
                  {day.dayName}
                </span>
                <span
                  className="text-sm font-bold"
                  style={{
                    color: isSelected ? '#fff' : day.isToday ? et.accentIncome : et.textPrimary,
                  }}
                >
                  {day.dayNum}
                </span>
                {day.isToday && !isSelected && (
                  <div
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: et.accentIncome }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          2. DAILY GREETING + STREAK
          ════════════════════════════════════════════════════════ */}
      {isToday && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-1"
        >
          <p className="text-base font-bold" style={{ color: et.textPrimary }}>
            {greeting}
          </p>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                style={{
                  backgroundColor: et.accentGold + '18',
                  color: et.accentGold,
                }}
              >
                <span>🔥</span>
                {t('expenses.streakDays', '{{count}} day streak', { count: streak })}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* ════════════════════════════════════════════════════════
          3. CASH FLOW SUMMARY CARD
          ════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl p-4"
        style={{
          backgroundColor: et.bgCard,
          boxShadow: et.shadowCard,
        }}
      >
        <div className="grid grid-cols-3 gap-3">
          {/* Earned */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span
                className="block rounded-full"
                style={{
                  width: 8, height: 8,
                  backgroundColor: et.accentIncome,
                }}
              />
              <span className="text-[11px] font-medium" style={{ color: et.textMuted }}>
                {t('expenses.earned', 'Earned')}
              </span>
            </div>
            <p
              className="text-lg font-extrabold"
              style={{
                color: et.accentIncome,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fmtINR(todayIncome)}
            </p>
          </div>

          {/* Spent */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span
                className="block rounded-full"
                style={{
                  width: 8, height: 8,
                  backgroundColor: et.accentExpense,
                }}
              />
              <span className="text-[11px] font-medium" style={{ color: et.textMuted }}>
                {t('expenses.spent', 'Spent')}
              </span>
            </div>
            <p
              className="text-lg font-extrabold"
              style={{
                color: et.accentExpense,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fmtINR(todayExpense)}
            </p>
          </div>

          {/* Net */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span
                className="block rounded-full"
                style={{
                  width: 8, height: 8,
                  backgroundColor: todayNet >= 0 ? et.accentIncome : et.accentExpense,
                }}
              />
              <span className="text-[11px] font-medium" style={{ color: et.textMuted }}>
                {t('expenses.net', 'Net')}
              </span>
            </div>
            <p
              className="text-lg font-extrabold"
              style={{
                color: todayNet >= 0 ? et.accentIncome : et.accentExpense,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {todayNet >= 0 ? '+' : '-'}{fmtINR(Math.abs(todayNet))}
            </p>
          </div>
        </div>

        {/* Progress bar: spent / earned ratio */}
        {todayIncome > 0 && (
          <div className="mt-3">
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: 4, backgroundColor: et.borderSubtle }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${spentRatio}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  backgroundColor: spentRatio > 80 ? et.accentExpense : et.accentIncome,
                }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* ════════════════════════════════════════════════════════
          4. SUB-TAB PILLS
          ════════════════════════════════════════════════════════ */}
      <div className="flex gap-2">
        {SUB_TAB_IDS.map(id => {
          const labels: Record<SubTab, string> = {
            all: t('expenses.all', 'All'),
            expense: t('expenses.expenses', 'Expenses'),
            income: t('expenses.income', 'Income'),
            investment: t('expenses.investments', 'Invested'),
          };
          const active = subTab === id;
          const color = subTabColor(id, et);

          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSubTab(id)}
              className="px-4 py-2 text-xs font-bold transition-all"
              style={{
                borderRadius: 999,
                ...(active
                  ? { backgroundColor: color, color: '#fff' }
                  : {
                      backgroundColor: 'transparent',
                      border: `1.5px solid ${et.borderSubtle}`,
                      color: et.textMuted,
                    }),
              }}
            >
              {labels[id]}
            </motion.button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════
          5. ENTRY LIST / 6. EMPTY STATE
          ════════════════════════════════════════════════════════ */}
      {filteredEntries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-14 rounded-2xl"
          style={{ backgroundColor: et.bgCard, boxShadow: et.shadowSoft }}
        >
          <span className="text-4xl block mb-3">📅</span>
          <p className="text-sm font-semibold mb-1" style={{ color: et.textPrimary }}>
            {t('expenses.noEntriesFor', 'No entries for')} {formatFullDate(selectedDate)}
          </p>
          <p className="text-xs mb-5" style={{ color: et.textMuted }}>
            {t('expenses.noEntriesSubtitle', 'Tap + to add your first entry')}
          </p>

          {/* Quick-add category chips */}
          <div className="flex gap-2 justify-center flex-wrap px-4">
            {QUICK_ADD_CATS.map(cat => (
              <button
                key={cat.id}
                onClick={() => setShowSheet(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors"
                style={{
                  backgroundColor: cat.color + '15',
                  color: cat.color,
                  border: `1px solid ${cat.color}30`,
                }}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Demo data loader — only show when there are zero entries anywhere */}
          {allEntries.length === 0 && (
            <div className="mt-6 px-4">
              <div
                className="rounded-xl p-3 text-left"
                style={{
                  backgroundColor: et.accentInvestment + '10',
                  border: `1px dashed ${et.accentInvestment}40`,
                }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-base">🎁</span>
                  <div>
                    <p className="text-[11px] font-bold" style={{ color: et.textPrimary }}>
                      {t('expenses.tryDemoData', 'Try with sample data')}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: et.textSecondary }}>
                      {t('expenses.tryDemoDataDesc', 'Loads {{count}} sample entries to explore all features.', { count: getDemoEntryCount() })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const result = loadDemoData();
                    refresh();
                    if (result.added > 0) {
                      // Jump to today so user sees the new entries
                      setSelectedDate(getTodayStr());
                    }
                  }}
                  className="w-full py-2 rounded-lg text-[11px] font-bold text-white transition-all active:scale-95"
                  style={{ backgroundColor: et.accentInvestment }}
                >
                  {t('expenses.loadDemoData', 'Load Demo Data')}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredEntries.map((entry, idx) => {
              const cat = catFor(entry);
              const color = typeColor(entry.type, et);
              const pmLabel = PAYMENT_METHOD_LABELS[entry.paymentMethod];

              return (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleEditEntry(entry)}
                  role="button"
                  tabIndex={0}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 cursor-pointer"
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    backgroundColor: et.bgCard,
                    boxShadow: et.shadowSoft,
                  }}
                >
                  {/* Category icon card */}
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 44, height: 44,
                      borderRadius: 14,
                      backgroundColor: (cat?.color ?? et.accentInvestment) + '26',
                      fontSize: 20,
                    }}
                  >
                    {cat?.icon ?? '📦'}
                  </div>

                  {/* Description + meta */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-bold truncate"
                      style={{ color: et.textPrimary, fontSize: 14 }}
                    >
                      {entry.description || cat?.name || t('expenses.entry', 'Entry')}
                    </p>
                    <p
                      className="truncate mt-0.5"
                      style={{ color: et.textMuted, fontSize: 12 }}
                    >
                      {cat?.name ?? entry.category}
                      {pmLabel ? ` \u00B7 ${pmLabel.icon} ${pmLabel.label}` : ''}
                    </p>
                  </div>

                  {/* Amount */}
                  <p
                    className="font-bold flex-shrink-0"
                    style={{
                      color,
                      fontSize: 14,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {entry.type === 'income' ? '+' : entry.type === 'expense' ? '-' : ''}
                    {fmtINR(entry.amount)}
                  </p>

                  {/* Delete — stopPropagation so the row's edit-tap doesn't also fire */}
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(entry.id); }}
                    className="p-1.5 rounded-lg flex-shrink-0"
                    style={{
                      backgroundColor: et.accentExpense + '12',
                      color: et.accentExpense,
                    }}
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          DELETE CONFIRMATION DIALOG
          ════════════════════════════════════════════════════════ */}
      {createPortal(
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
              onClick={() => setDeleteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                className="w-full max-w-xs rounded-2xl p-6"
                style={{
                  backgroundColor: et.bgCard,
                  boxShadow: et.shadowCard,
                }}
                onClick={e => e.stopPropagation()}
              >
                <p className="font-bold text-base mb-2" style={{ color: et.textPrimary }}>
                  {t('expenses.deleteConfirmTitle', 'Delete Entry?')}
                </p>
                <p className="text-sm mb-5" style={{ color: et.textSecondary }}>
                  {t('expenses.deleteConfirmMsg', 'This action cannot be undone.')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                    style={{
                      backgroundColor: et.borderSubtle,
                      color: et.textSecondary,
                    }}
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: et.accentExpense }}
                  >
                    {t('common.delete', 'Delete')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ════════════════════════════════════════════════════════
          7. FAB BUTTON
          ════════════════════════════════════════════════════════ */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setShowSheet(true)}
        className="fixed bottom-20 right-5 z-[999] flex items-center justify-center"
        style={{
          width: 56, height: 56,
          borderRadius: '50%',
          backgroundColor: et.accentPrimary,
          boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
        }}
      >
        <Plus size={26} color="#fff" />
      </motion.button>

      {/* ════════════════════════════════════════════════════════
          8. ADD / EDIT ENTRY BOTTOM SHEET (shared with global FAB)
          ════════════════════════════════════════════════════════ */}
      {createPortal(
        <AnimatePresence>
          {(showSheet || editingEntry) && (
            <SharedAddEntrySheet
              defaultDate={selectedDate}
              editEntry={editingEntry}
              onSave={handleSaved}
              onClose={handleSheetClose}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

