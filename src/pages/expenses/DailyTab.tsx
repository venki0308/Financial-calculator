import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Calendar,
  Wallet, FileText, X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppColors } from '../../theme/useAppColors';
import type { Entry, EntryType, PaymentMethod, Category } from '../../types/expense';
import { PAYMENT_METHOD_LABELS } from '../../types/expense';
import {
  getEntriesForDate, saveEntry, deleteEntry as removeEntry,
  createEntry, getAllAccounts, getAllCategories,
} from '../../utils/expenseStorage';
import { fmtINR, getTodayStr, formatFullDate } from '../../utils/expenseCalculations';

/* ── constants ── */

const ENTRY_TYPES: { id: EntryType; color: string; bg: string }[] = [
  { id: 'expense',    color: '#ef4444', bg: 'bg-red-500' },
  { id: 'income',     color: '#10b981', bg: 'bg-emerald-500' },
  { id: 'investment', color: '#3b82f6', bg: 'bg-blue-500' },
  { id: 'transfer',   color: '#8b5cf6', bg: 'bg-violet-500' },
];

const PM_LIST: PaymentMethod[] = ['cash', 'upi', 'debit_card', 'credit_card', 'net_banking', 'auto_debit'];

const SUB_TAB_IDS = ['all', 'expense', 'income', 'investment'] as const;
type SubTab = typeof SUB_TAB_IDS[number];

/* ── helpers ── */

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function shiftDay(current: string, delta: number): string {
  const d = new Date(current + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return dateStr(d);
}

function amtColor(type: EntryType): string {
  if (type === 'income') return '#10b981';
  if (type === 'investment') return '#3b82f6';
  if (type === 'transfer') return '#8b5cf6';
  return '#ef4444';
}

/* ── component ── */

export default function DailyTab({ onAddExpense }: { onAddExpense?: () => void }) {
  const { t } = useTranslation();
  const c = useAppColors();

  /* --- state --- */
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [showSheet, setShowSheet] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  /* Force re-read from storage after mutations */
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  /* --- derived data --- */
  const allCategories = useMemo(() => getAllCategories(), []);
  const accounts = useMemo(() => getAllAccounts(), []);

  const dayEntries = useMemo(() => {
    void refreshKey;
    return getEntriesForDate(selectedDate)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [selectedDate, refreshKey]);

  const todayIncome = useMemo(
    () => dayEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
    [dayEntries],
  );
  const todayExpense = useMemo(
    () => dayEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    [dayEntries],
  );
  const todayNet = todayIncome - todayExpense;

  const filteredEntries = useMemo(() => {
    if (subTab === 'all') return dayEntries;
    return dayEntries.filter(e => e.type === subTab);
  }, [dayEntries, subTab]);

  const isToday = selectedDate === getTodayStr();
  const canGoForward = selectedDate < getTodayStr();

  /* --- actions --- */
  const handleDelete = (id: string) => {
    removeEntry(id);
    setDeleteConfirm(null);
    refresh();
  };

  const handleSaved = () => {
    refresh();
    setShowSheet(false);
    onAddExpense?.();
  };

  /* --- navigate dates --- */
  const goPrev = () => setSelectedDate(d => shiftDay(d, -1));
  const goNext = () => { if (canGoForward) setSelectedDate(d => shiftDay(d, 1)); };

  /* --- category lookup --- */
  const catFor = (entry: Entry): Category | undefined =>
    allCategories.find(cat => cat.id === entry.category);

  return (
    <div className="space-y-4 pb-24">
      {/* ── DATE NAVIGATOR ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          className="p-2 rounded-xl"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
        >
          <ChevronLeft size={18} style={{ color: c.textSecondary }} />
        </button>
        <div
          className="flex-1 text-center py-2.5 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}`, color: c.text }}
        >
          {formatFullDate(selectedDate)}
          {isToday && (
            <span className="ml-2 text-[10px] font-bold text-purple-500">
              {t('expenses.today', 'Today')}
            </span>
          )}
        </div>
        <button
          onClick={goNext}
          disabled={!canGoForward}
          className="p-2 rounded-xl disabled:opacity-30"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
        >
          <ChevronRight size={18} style={{ color: c.textSecondary }} />
        </button>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: t('expenses.incomeToday', 'Income Today'), value: todayIncome, color: '#10b981' },
          { label: t('expenses.spentToday', 'Spent Today'), value: todayExpense, color: '#ef4444' },
          { label: t('expenses.netToday', 'Net Today'), value: todayNet, color: todayNet >= 0 ? '#10b981' : '#ef4444' },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-2xl p-3 text-center"
            style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
          >
            <p className="text-[10px] font-medium mb-1" style={{ color: c.textSecondary }}>
              {card.label}
            </p>
            <p className="text-base font-extrabold" style={{ color: card.color }}>
              {fmtINR(Math.abs(card.value))}
            </p>
          </div>
        ))}
      </div>

      {/* ── SUB-TABS ── */}
      <div
        className="flex gap-1 rounded-xl p-1"
        style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
      >
        {SUB_TAB_IDS.map(id => {
          const labels: Record<SubTab, string> = {
            all: t('expenses.all', 'All'),
            expense: t('expenses.expenses', 'Expenses'),
            income: t('expenses.income', 'Income'),
            investment: t('expenses.investments', 'Investments'),
          };
          const active = subTab === id;
          const bgMap: Record<SubTab, string> = {
            all: '#8b5cf6',
            expense: '#ef4444',
            income: '#10b981',
            investment: '#3b82f6',
          };
          return (
            <button
              key={id}
              onClick={() => setSubTab(id)}
              className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
              style={active
                ? { backgroundColor: bgMap[id], color: '#fff' }
                : { color: c.textSecondary }
              }
            >
              {labels[id]}
            </button>
          );
        })}
      </div>

      {/* ── ENTRY LIST ── */}
      {filteredEntries.length === 0 ? (
        <div
          className="text-center py-12 rounded-2xl"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
        >
          <Calendar size={36} className="mx-auto mb-3 opacity-30" style={{ color: c.textSecondary }} />
          <p className="text-sm" style={{ color: c.textSecondary }}>
            {t('expenses.noEntriesFor', 'No entries for')} {formatFullDate(selectedDate)}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map(entry => {
            const cat = catFor(entry);
            const color = amtColor(entry.type);
            const pmLabel = PAYMENT_METHOD_LABELS[entry.paymentMethod];
            return (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
              >
                {/* icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: `${cat?.color ?? '#8b5cf6'}20` }}
                >
                  {cat?.icon ?? '📦'}
                </div>

                {/* text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: c.text }}>
                    {entry.description || cat?.name || t('expenses.entry', 'Entry')}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: c.textSecondary }}>
                    {cat?.name ?? entry.category}
                    {pmLabel ? ` · ${pmLabel.icon} ${pmLabel.label}` : ''}
                  </p>
                </div>

                {/* amount */}
                <p className="text-sm font-bold flex-shrink-0" style={{ color }}>
                  {entry.type === 'income' ? '+' : entry.type === 'expense' ? '-' : ''}
                  {fmtINR(entry.amount)}
                </p>

                {/* delete */}
                <button
                  onClick={() => setDeleteConfirm(entry.id)}
                  className="p-1.5 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── DELETE CONFIRMATION ── */}
      {createPortal(
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
              style={{ backgroundColor: c.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' }}
              onClick={() => setDeleteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-xs rounded-2xl p-6"
                style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
                onClick={e => e.stopPropagation()}
              >
                <p className="font-bold text-base mb-2" style={{ color: c.text }}>
                  {t('expenses.deleteConfirmTitle', 'Delete Entry?')}
                </p>
                <p className="text-sm mb-5" style={{ color: c.textSecondary }}>
                  {t('expenses.deleteConfirmMsg', 'This action cannot be undone.')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                    style={{ backgroundColor: c.isDark ? '#334155' : '#f1f5f9', color: c.textSecondary }}
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500"
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

      {/* ── FAB ── */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setShowSheet(true)}
        className="fixed bottom-20 right-5 z-[999] w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}
      >
        <Plus size={26} color="#fff" />
      </motion.button>

      {/* ── ADD ENTRY BOTTOM SHEET ── */}
      {createPortal(
        <AnimatePresence>
          {showSheet && (
            <AddEntrySheet
              colors={c}
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
  colors: ReturnType<typeof useAppColors>;
  t: ReturnType<typeof useTranslation>['t'];
  defaultDate: string;
  categories: Category[];
  accounts: ReturnType<typeof getAllAccounts>;
  onSave: () => void;
  onClose: () => void;
}

function AddEntrySheet({ colors: c, t, defaultDate, categories, accounts, onSave, onClose }: SheetProps) {
  const [entryType, setEntryType] = useState<EntryType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [categoryId, setCategoryId] = useState('food_dining');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [accountId, setAccountId] = useState('');

  /* Update default category when type changes */
  const typeCats = useMemo(
    () => categories.filter(cat => cat.type === entryType && cat.isActive),
    [categories, entryType],
  );

  const handleTypeChange = (newType: EntryType) => {
    setEntryType(newType);
    const defaults: Record<EntryType, string> = {
      expense: 'food_dining',
      income: 'salary',
      investment: 'inv_mutual_fund',
      transfer: 'other_expense',
    };
    const firstCat = categories.find(cat => cat.type === newType && cat.isActive);
    setCategoryId(firstCat?.id ?? defaults[newType]);
  };

  const isValid = parseFloat(amount) > 0;

  const handleSave = () => {
    if (!isValid) return;
    const cat = categories.find(cat => cat.id === categoryId);
    const entry = createEntry({
      type: entryType,
      amount: parseFloat(amount),
      date,
      category: categoryId,
      description: description || cat?.name || '',
      paymentMethod,
      accountId: accountId || undefined,
      recurrence: 'none',
    });
    saveEntry(entry);
    onSave();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-end justify-center"
      style={{ backgroundColor: c.isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-md rounded-t-3xl flex flex-col"
        style={{ maxHeight: '88dvh', backgroundColor: c.bg, borderTop: `1px solid ${c.border}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar + header */}
        <div className="flex-shrink-0 px-6 pt-4 pb-2">
          <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: c.border }} />
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg" style={{ color: c.text }}>
              {t('expenses.addNewEntry', 'Add Entry')}
            </h3>
            <button onClick={onClose} className="p-1 rounded-lg" style={{ color: c.textSecondary }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-3">
          <div className="space-y-4">

            {/* Entry type selector */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: c.textSecondary }}>
                {t('expenses.entryType', 'Entry Type')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {ENTRY_TYPES.map(et => {
                  const labelMap: Record<EntryType, string> = {
                    expense: t('expenses.expense', 'Expense'),
                    income: t('expenses.income', 'Income'),
                    investment: t('expenses.investment', 'Investment'),
                    transfer: t('expenses.transfer', 'Transfer'),
                  };
                  const emojiMap: Record<EntryType, string> = {
                    expense: '💸', income: '💰', investment: '📈', transfer: '🔄',
                  };
                  const active = entryType === et.id;
                  return (
                    <button
                      key={et.id}
                      onClick={() => handleTypeChange(et.id)}
                      className="p-2 rounded-xl text-center text-xs font-bold transition-all"
                      style={active
                        ? { backgroundColor: et.color, color: '#fff' }
                        : { backgroundColor: c.card, border: `1px solid ${c.border}`, color: c.textSecondary }
                      }
                    >
                      <span className="text-base block">{emojiMap[et.id]}</span>
                      {labelMap[et.id]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: c.textSecondary }}>
                {t('expenses.amountLabel', 'Amount')}
              </label>
              <div className="relative">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold"
                  style={{ color: c.textSecondary }}
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  style={{ backgroundColor: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5 block" style={{ color: c.textSecondary }}>
                <Calendar size={12} /> {t('expenses.date', 'Date')}
              </label>
              <input
                type="date"
                value={date}
                max={getTodayStr()}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none"
                style={{ backgroundColor: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}
              />
            </div>

            {/* Category grid */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: c.textSecondary }}>
                {t('expenses.category', 'Category')}
              </label>
              <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
                {typeCats.map(cat => {
                  const active = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id)}
                      className="p-2 rounded-xl text-center transition-all"
                      style={active
                        ? { backgroundColor: cat.color, color: '#fff' }
                        : { backgroundColor: c.card, border: `1px solid ${c.border}`, color: c.textSecondary }
                      }
                    >
                      <span className="text-lg block">{cat.icon}</span>
                      <span className="text-[9px] font-semibold block mt-0.5 truncate leading-tight">
                        {cat.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5 block" style={{ color: c.textSecondary }}>
                <FileText size={12} /> {t('expenses.descriptionLabel', 'Description')}
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('expenses.descriptionPlaceholder', 'e.g. Lunch at restaurant')}
                className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                style={{ backgroundColor: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}
              />
            </div>

            {/* Payment method chips */}
            <div>
              <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5 block" style={{ color: c.textSecondary }}>
                <Wallet size={12} /> {t('expenses.paymentMethodLabel', 'Payment Method')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PM_LIST.map(pm => {
                  const info = PAYMENT_METHOD_LABELS[pm];
                  const active = paymentMethod === pm;
                  return (
                    <button
                      key={pm}
                      onClick={() => setPaymentMethod(pm)}
                      className="p-2 rounded-xl text-center transition-all"
                      style={active
                        ? { backgroundColor: '#7c3aed', color: '#fff' }
                        : { backgroundColor: c.card, border: `1px solid ${c.border}`, color: c.textSecondary }
                      }
                    >
                      <span className="text-base block">{info.icon}</span>
                      <span className="text-[9px] font-semibold block mt-0.5">{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Account selector */}
            {accounts.length > 0 && (
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: c.textSecondary }}>
                  {t('expenses.account', 'Account')}
                </label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setAccountId('')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={!accountId
                      ? { backgroundColor: '#7c3aed', color: '#fff' }
                      : { backgroundColor: c.card, border: `1px solid ${c.border}`, color: c.textSecondary }
                    }
                  >
                    {t('expenses.noAccount', 'None')}
                  </button>
                  {accounts.map(acc => {
                    const active = accountId === acc.id;
                    return (
                      <button
                        key={acc.id}
                        onClick={() => setAccountId(acc.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={active
                          ? { backgroundColor: acc.color || '#7c3aed', color: '#fff' }
                          : { backgroundColor: c.card, border: `1px solid ${c.border}`, color: c.textSecondary }
                        }
                      >
                        {acc.icon} {acc.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky save button */}
        <div
          className="flex-shrink-0 px-6 pt-3"
          style={{
            paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 12px))',
            borderTop: `1px solid ${c.border}`,
          }}
        >
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: c.isDark ? '#334155' : '#f1f5f9', color: c.textSecondary }}
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <motion.button
              whileTap={isValid ? { scale: 0.97 } : {}}
              onClick={handleSave}
              disabled={!isValid}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}
            >
              {t('expenses.saveExpense', 'Save')}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
