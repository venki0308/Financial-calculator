// ═══════════════════════════════════════════════════════════════
// FINCALIX — ADD ENTRY BOTTOM SHEET (shared across all tabs)
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useExpenseTheme } from '../theme/expenseTheme';
import type { Entry, EntryType, PaymentMethod } from '../types/expense';
import { PAYMENT_METHOD_LABELS } from '../types/expense';
import { saveEntry, createEntry, deleteEntry, getAllCategories } from '../utils/expenseStorage';
import { getTodayStr } from '../utils/expenseCalculations';

const ENTRY_TYPES: { id: EntryType; emoji: string }[] = [
  { id: 'expense', emoji: '💸' },
  { id: 'income', emoji: '💰' },
  { id: 'investment', emoji: '📈' },
];

const PM_LIST: PaymentMethod[] = ['cash', 'upi', 'debit_card', 'credit_card', 'net_banking', 'auto_debit'];
const QUICK_AMOUNTS = [100, 250, 500, 1000, 5000];

function typeColor(type: EntryType, et: ReturnType<typeof useExpenseTheme>): string {
  if (type === 'income') return et.accentIncome;
  if (type === 'investment') return et.accentInvestment;
  return et.accentExpense;
}

interface Props {
  defaultDate?: string;
  /** When set, the sheet opens in EDIT mode and pre-fills all fields from this entry.
   *  Save calls saveEntry() with the SAME id, which storage treats as an update. */
  editEntry?: Entry | null;
  onSave: () => void;
  onClose: () => void;
}

export default function AddEntrySheet({ defaultDate, editEntry, onSave, onClose }: Props) {
  const { t } = useTranslation();
  const et = useExpenseTheme();
  const categories = useMemo(() => getAllCategories(), []);
  const isEditMode = !!editEntry;

  // State is initialized ONCE from editEntry — passing a new editEntry while
  // the sheet is already open will not re-prefill (consistent with how the
  // sheet is mounted-on-open via AnimatePresence in the parent).
  const [entryType, setEntryType] = useState<EntryType>(editEntry?.type ?? 'expense');
  const [amount, setAmount] = useState(editEntry ? String(editEntry.amount) : '');
  const [date, setDate] = useState(editEntry?.date ?? defaultDate ?? getTodayStr());
  const [categoryId, setCategoryId] = useState(editEntry?.category ?? 'food_dining');
  const [description, setDescription] = useState(editEntry?.description ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editEntry?.paymentMethod ?? 'upi');

  // Inline confirmation state for the in-sheet delete button
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    const finalDescription = description || cat?.name || '';

    if (isEditMode && editEntry) {
      // EDIT: rebuild the entry preserving id + createdAt, bump updatedAt.
      // saveEntry() detects the existing id and overwrites in place.
      const updated: Entry = {
        ...editEntry,
        type: entryType,
        amount: parseFloat(amount),
        date,
        category: categoryId,
        description: finalDescription,
        paymentMethod,
        updatedAt: new Date().toISOString(),
      };
      saveEntry(updated);
    } else {
      // CREATE: fresh entry with new id
      const entry = createEntry({
        type: entryType,
        amount: parseFloat(amount),
        date,
        category: categoryId,
        description: finalDescription,
        paymentMethod,
        accountId: undefined,
        recurrence: 'none',
      });
      saveEntry(entry);
    }
    onSave();
  };

  const handleDelete = () => {
    if (!editEntry) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Auto-reset after 3s if user doesn't confirm
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    deleteEntry(editEntry.id);
    onSave(); // closes sheet + triggers parent refresh
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
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-3 pb-2">
          <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: et.borderSubtle }} />
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-lg" style={{ color: et.textPrimary }}>
              {isEditMode
                ? t('expenses.editEntry', 'Edit Entry')
                : t('expenses.addNewEntry', 'Add Entry')}
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

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-3">
          <div className="space-y-5">
            {/* Entry type pills */}
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
                    style={active
                      ? { backgroundColor: color, color: '#fff' }
                      : { backgroundColor: et.bgCard, border: `1.5px solid ${et.borderSubtle}`, color: et.textMuted }
                    }
                  >
                    <span className="text-base block mb-0.5">{tp.emoji}</span>
                    {labelMap[tp.id] ?? tp.id}
                  </motion.button>
                );
              })}
            </div>

            {/* Amount input */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: et.bgCard, boxShadow: et.shadowSoft }}>
              <label className="text-[11px] font-semibold block mb-2 text-center" style={{ color: et.textMuted }}>
                {t('expenses.amountLabel', 'Amount')}
              </label>
              <div className="flex items-center justify-center gap-1">
                <span className="font-extrabold" style={{ color: et.textSecondary, fontSize: 28 }}>₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="bg-transparent text-center font-extrabold focus:outline-none"
                  style={{ color: et.textPrimary, fontSize: 32, width: '60%', caretColor: currentTypeColor }}
                />
              </div>
              <div className="flex gap-2 mt-3 justify-center flex-wrap">
                {QUICK_AMOUNTS.map(val => (
                  <button
                    key={val}
                    onClick={() => handleQuickAmount(val)}
                    className="px-3 py-1 text-[11px] font-bold rounded-full transition-colors"
                    style={{ backgroundColor: currentTypeColor + '12', color: currentTypeColor, border: `1px solid ${currentTypeColor}25` }}
                  >
                    {`+₹${val.toLocaleString('en-IN')}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Category grid */}
            <div>
              <label className="text-[11px] font-semibold mb-2 block" style={{ color: et.textMuted }}>
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
                          : { backgroundColor: cat.color + '12', color: et.textSecondary, border: `1px solid ${cat.color}30` }),
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

            {/* Description */}
            <div>
              <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: et.textMuted }}>
                {t('expenses.descriptionLabel', 'Description')}
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('expenses.descriptionPlaceholder', 'e.g. Lunch at restaurant')}
                className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: et.bgCard, border: `1.5px solid ${et.borderSubtle}`, color: et.textPrimary }}
              />
            </div>

            {/* Date */}
            <div>
              <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: et.textMuted }}>
                {t('expenses.date', 'Date')}
              </label>
              <input
                type="date"
                value={date}
                max={getTodayStr()}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none"
                style={{ backgroundColor: et.bgCard, border: `1.5px solid ${et.borderSubtle}`, color: et.textPrimary }}
              />
            </div>

            {/* Payment method */}
            <div>
              <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: et.textMuted }}>
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
                          : { backgroundColor: et.bgCard, border: `1.5px solid ${et.borderSubtle}`, color: et.textMuted }),
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

        {/* Save / Update + (edit-only) Delete buttons */}
        <div
          className="flex-shrink-0 px-6 pt-3"
          style={{
            paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 12px))',
            borderTop: `1px solid ${et.borderSubtle}`,
            backgroundColor: et.bgPrimary,
          }}
        >
          <div className="flex gap-2">
            {isEditMode && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleDelete}
                className="px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                style={{
                  backgroundColor: confirmDelete ? et.accentExpense : et.accentExpense + '15',
                  color: confirmDelete ? '#fff' : et.accentExpense,
                  border: `1.5px solid ${et.accentExpense}${confirmDelete ? '' : '40'}`,
                }}
                aria-label={t('expenses.deleteEntry', 'Delete')}
              >
                <Trash2 size={14} />
                {confirmDelete ? t('expenses.confirmDelete', 'Confirm?') : t('expenses.deleteEntry', 'Delete')}
              </motion.button>
            )}
            <motion.button
              whileTap={isValid ? { scale: 0.97 } : {}}
              onClick={handleSave}
              disabled={!isValid}
              className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: currentTypeColor }}
            >
              {isEditMode
                ? t('expenses.updateEntry', 'Update Entry')
                : t('expenses.saveExpense', 'Save Entry')}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
