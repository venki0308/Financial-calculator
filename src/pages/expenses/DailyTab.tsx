import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useExpenseTheme, TYPE_COLORS, getGreetingKey, calculateStreak } from '../../theme/expenseTheme';
import type { Entry, EntryType, PaymentMethod, Category } from '../../types/expense';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_INVESTMENT_CATEGORIES,
  PAYMENT_METHOD_LABELS,
} from '../../types/expense';
import {
  getEntriesForDate, saveEntry, deleteEntry, createEntry,
  getAllAccounts, getAllCategories, getCategoryById, getAllEntries,
} from '../../utils/expenseStorage';
import { fmtINR, getTodayStr, formatFullDate } from '../../utils/expenseCalculations';

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════ */

const ENTRY_TYPES: { id: EntryType; label: string; emoji: string }[] = [
  { id: 'expense',    label: 'Expense',    emoji: '💸' },
  { id: 'income',     label: 'Income',     emoji: '💰' },
  { id: 'investment', label: 'Investment', emoji: '📈' },
];

const PM_LIST: PaymentMethod[] = ['cash', 'upi', 'debit_card', 'credit_card', 'net_banking', 'auto_debit'];

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
  return d.toISOString().split('T')[0];
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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  /* ── derived data ── */
  const allCategories = useMemo(() => getAllCategories(), []);
  const accounts = useMemo(() => getAllAccounts(), []);

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
  };

  const goPrev = () => setSelectedDate(d => shiftDay(d, -1));
  const goNext = () => { if (canGoForward) setSelectedDate(d => shiftDay(d, 1)); };

  const catFor = (entry: Entry): Category | undefined =>
    allCategories.find(cat => cat.id === entry.category);

  /* ── greeting ── */
  const greeting = t(getGreetingKey());

  return (
    <div className="space-y-4 pb-24">

      {/* ════════════════════════════════════════════════════════
          1. DATE NAVIGATOR
          ════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={goPrev}
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 40, height: 40,
            borderRadius: '50%',
            backgroundColor: et.bgCard,
            boxShadow: et.shadowSoft,
          }}
        >
          <ChevronLeft size={18} style={{ color: et.textSecondary }} />
        </motion.button>

        <div
          className="flex-1 text-center py-2 px-4 font-bold text-sm relative"
          style={{
            borderRadius: 999,
            backgroundColor: et.bgCard,
            boxShadow: et.shadowSoft,
            color: et.textPrimary,
          }}
        >
          {formatFullDate(selectedDate)}
          {isToday && (
            <span
              className="ml-2 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full inline-block"
              style={{
                backgroundColor: et.accentIncome + '20',
                color: et.accentIncome,
              }}
            >
              {t('expenses.today', 'Today')}
            </span>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={goNext}
          disabled={!canGoForward}
          className="flex items-center justify-center flex-shrink-0 disabled:opacity-30"
          style={{
            width: 40, height: 40,
            borderRadius: '50%',
            backgroundColor: et.bgCard,
            boxShadow: et.shadowSoft,
          }}
        >
          <ChevronRight size={18} style={{ color: et.textSecondary }} />
        </motion.button>
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
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3"
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

                  {/* Delete */}
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setDeleteConfirm(entry.id)}
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
          8. ADD ENTRY BOTTOM SHEET
          ════════════════════════════════════════════════════════ */}
      {createPortal(
        <AnimatePresence>
          {showSheet && (
            <AddEntrySheet
              et={et}
              t={t}
              defaultDate={selectedDate}
              categories={allCategories}
              accounts={accounts}
              onSave={handleSaved}
              onClose={() => setShowSheet(false)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ADD ENTRY BOTTOM SHEET
   ══════════════════════════════════════════════════════════════ */

interface SheetProps {
  et: ReturnType<typeof useExpenseTheme>;
  t: ReturnType<typeof useTranslation>['t'];
  defaultDate: string;
  categories: Category[];
  accounts: ReturnType<typeof getAllAccounts>;
  onSave: () => void;
  onClose: () => void;
}

function AddEntrySheet({ et, t, defaultDate, categories, accounts, onSave, onClose }: SheetProps) {
  const [entryType, setEntryType] = useState<EntryType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [categoryId, setCategoryId] = useState('food_dining');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');

  /* Categories filtered by selected entry type */
  const typeCats = useMemo(
    () => categories.filter(cat => cat.type === entryType && cat.isActive),
    [categories, entryType],
  );

  const handleTypeChange = (newType: EntryType) => {
    setEntryType(newType);
    const firstCat = categories.find(cat => cat.type === newType && cat.isActive);
    const defaults: Record<EntryType, string> = {
      expense: 'food_dining', income: 'salary',
      investment: 'inv_mutual_fund', transfer: 'other_expense',
    };
    setCategoryId(firstCat?.id ?? defaults[newType]);
  };

  const currentTypeColor = typeColor(entryType, et);
  const isValid = parseFloat(amount) > 0;

  const handleSave = () => {
    if (!isValid) return;
    const cat = categories.find(c => c.id === categoryId);
    const entry = createEntry({
      type: entryType,
      amount: parseFloat(amount),
      date,
      category: categoryId,
      description: description || cat?.name || '',
      paymentMethod,
      accountId: undefined,
      recurrence: 'none',
    });
    saveEntry(entry);
    onSave();
  };

  const handleQuickAmount = (val: number) => {
    setAmount(prev => {
      const current = parseFloat(prev) || 0;
      return String(current + val);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-md flex flex-col"
        style={{
          maxHeight: '90dvh',
          backgroundColor: et.bgPrimary,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Handle bar + header ── */}
        <div className="flex-shrink-0 px-6 pt-3 pb-2">
          <div
            className="w-10 h-1 rounded-full mx-auto mb-4"
            style={{ backgroundColor: et.borderSubtle }}
          />
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-lg" style={{ color: et.textPrimary }}>
              {t('expenses.addNewEntry', 'Add Entry')}
            </h3>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onClose}
              className="p-1.5 rounded-full"
              style={{ backgroundColor: et.borderSubtle, color: et.textSecondary }}
            >
              <X size={18} />
            </motion.button>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-6 pb-3">
          <div className="space-y-5">

            {/* ── Entry type pills ── */}
            <div className="grid grid-cols-3 gap-2">
              {ENTRY_TYPES.map(tp => {
                const active = entryType === tp.id;
                const color = typeColor(tp.id, et);
                const labelMap: Record<string, string> = {
                  expense: t('expenses.expense', 'Expense'),
                  income: t('expenses.income', 'Income'),
                  investment: t('expenses.investment', 'Investment'),
                };
                return (
                  <motion.button
                    key={tp.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTypeChange(tp.id)}
                    className="py-2.5 rounded-xl text-center text-xs font-bold transition-all"
                    style={
                      active
                        ? { backgroundColor: color, color: '#fff' }
                        : {
                            backgroundColor: et.bgCard,
                            border: `1.5px solid ${et.borderSubtle}`,
                            color: et.textMuted,
                          }
                    }
                  >
                    <span className="text-base block mb-0.5">{tp.emoji}</span>
                    {labelMap[tp.id] ?? tp.label}
                  </motion.button>
                );
              })}
            </div>

            {/* ── Amount input (large centered) ── */}
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: et.bgCard, boxShadow: et.shadowSoft }}
            >
              <label
                className="text-[11px] font-semibold block mb-2 text-center"
                style={{ color: et.textMuted }}
              >
                {t('expenses.amountLabel', 'Amount')}
              </label>
              <div className="flex items-center justify-center gap-1">
                <span
                  className="font-extrabold"
                  style={{ color: et.textSecondary, fontSize: 28 }}
                >
                  ₹
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="bg-transparent text-center font-extrabold focus:outline-none"
                  style={{
                    color: et.textPrimary,
                    fontSize: 32,
                    width: '60%',
                    caretColor: currentTypeColor,
                  }}
                />
              </div>

              {/* Quick amount chips */}
              <div className="flex gap-2 mt-3 justify-center flex-wrap">
                {QUICK_AMOUNTS.map(val => (
                  <button
                    key={val}
                    onClick={() => handleQuickAmount(val)}
                    className="px-3 py-1 text-[11px] font-bold rounded-full transition-colors"
                    style={{
                      backgroundColor: currentTypeColor + '12',
                      color: currentTypeColor,
                      border: `1px solid ${currentTypeColor}25`,
                    }}
                  >
                    {`+₹${val.toLocaleString('en-IN')}`}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Category grid (3 per row) ── */}
            <div>
              <label
                className="text-[11px] font-semibold mb-2 block"
                style={{ color: et.textMuted }}
              >
                {t('expenses.category', 'Category')}
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {typeCats.map(cat => {
                  const active = categoryId === cat.id;
                  return (
                    <motion.button
                      key={cat.id}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setCategoryId(cat.id)}
                      className="flex items-center gap-1.5 px-2.5 py-2 transition-all"
                      style={{
                        borderRadius: 999,
                        ...(active
                          ? { backgroundColor: cat.color, color: '#fff' }
                          : {
                              backgroundColor: cat.color + '12',
                              color: et.textSecondary,
                              border: `1px solid ${cat.color}30`,
                            }),
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{cat.icon}</span>
                      <span className="text-[11px] font-semibold truncate">
                        {cat.name.length > 10 ? cat.name.split(' ')[0] : cat.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ── Description input ── */}
            <div>
              <label
                className="text-[11px] font-semibold mb-1.5 block"
                style={{ color: et.textMuted }}
              >
                {t('expenses.descriptionLabel', 'Description')}
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('expenses.descriptionPlaceholder', 'e.g. Lunch at restaurant')}
                className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{
                  backgroundColor: et.bgCard,
                  border: `1.5px solid ${et.borderSubtle}`,
                  color: et.textPrimary,
                }}
              />
            </div>

            {/* ── Date ── */}
            <div>
              <label
                className="text-[11px] font-semibold mb-1.5 block"
                style={{ color: et.textMuted }}
              >
                {t('expenses.date', 'Date')}
              </label>
              <input
                type="date"
                value={date}
                max={getTodayStr()}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none"
                style={{
                  backgroundColor: et.bgCard,
                  border: `1.5px solid ${et.borderSubtle}`,
                  color: et.textPrimary,
                }}
              />
            </div>

            {/* ── Payment method chips ── */}
            <div>
              <label
                className="text-[11px] font-semibold mb-1.5 block"
                style={{ color: et.textMuted }}
              >
                {t('expenses.paymentMethodLabel', 'Payment Method')}
              </label>
              <div className="flex gap-2 flex-wrap">
                {PM_LIST.map(pm => {
                  const info = PAYMENT_METHOD_LABELS[pm];
                  const active = paymentMethod === pm;
                  return (
                    <motion.button
                      key={pm}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setPaymentMethod(pm)}
                      className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold transition-all"
                      style={{
                        borderRadius: 999,
                        ...(active
                          ? { backgroundColor: currentTypeColor, color: '#fff' }
                          : {
                              backgroundColor: et.bgCard,
                              border: `1.5px solid ${et.borderSubtle}`,
                              color: et.textMuted,
                            }),
                      }}
                    >
                      <span>{info.icon}</span>
                      {info.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Sticky save button ── */}
        <div
          className="flex-shrink-0 px-6 pt-3"
          style={{
            paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 12px))',
            borderTop: `1px solid ${et.borderSubtle}`,
            backgroundColor: et.bgPrimary,
          }}
        >
          <motion.button
            whileTap={isValid ? { scale: 0.97 } : {}}
            onClick={handleSave}
            disabled={!isValid}
            className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ backgroundColor: currentTypeColor }}
          >
            {t('expenses.saveExpense', 'Save Entry')}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
