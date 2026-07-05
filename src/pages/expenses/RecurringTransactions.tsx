// ═══════════════════════════════════════════════════════════════
// FINCALIX — RECURRING TRANSACTIONS (/expenses/recurring)
// Rent, EMIs, salary, school fees auto-logged on schedule.
// Rules live in recurringStorage ('fincalix_recurring'); the
// materializer (run on every app open + right after saving here)
// converts due rules into REAL entries in expenseStorage.
// Routing mirrors /expenses/accounts (lazy const + Route in Layout).
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Repeat, Calendar, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useExpenseTheme } from '../../theme/expenseTheme';

import type { PaymentMethod } from '../../types/expense';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  PAYMENT_METHOD_LABELS,
} from '../../types/expense';

import type { RecurringRule, RecurringFrequency } from '../../utils/recurringStorage';
import {
  getAllRules, saveRule, deleteRule, createRule,
  addMonthsAnchoredISO, materializeDueRecurring,
} from '../../utils/recurringStorage';
import { fmtINR } from '../../utils/expenseCalculations';
import { todayStr, parseLocalDate, shiftLocalDate } from '../../utils/dateUtils';
import DateInput from '../../components/DateInput';

// ── constants ─────────────────────────────────────────────────
const MAX_AMOUNT = 1000000000; // ₹100 Cr — same cap as AddEntrySheet

const PM_LIST: PaymentMethod[] = ['upi', 'auto_debit', 'net_banking', 'cash', 'debit_card', 'credit_card'];

const FREQUENCIES: { value: RecurringFrequency; labelKey: string; fallback: string }[] = [
  { value: 'monthly', labelKey: 'recurring.monthly', fallback: 'Monthly' },
  { value: 'weekly',  labelKey: 'recurring.weekly',  fallback: 'Weekly' },
  { value: 'yearly',  labelKey: 'recurring.yearly',  fallback: 'Yearly' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Sentinel: anchorDay 31 for monthly rules means "last day of month"
 *  (the materializer clamps, so 31 always lands on the month's end). */
const LAST_DAY = 31;

// Common-man presets — quick-add chips that prefill the sheet.
const PRESETS: {
  label: string; emoji: string; type: 'expense' | 'income';
  category: string; note: string; monthDay: number;
}[] = [
  { label: 'Rent',        emoji: '🏠', type: 'expense', category: 'rent_housing', note: 'Rent',        monthDay: 1 },
  { label: 'Salary',      emoji: '💰', type: 'income',  category: 'salary',       note: 'Salary',      monthDay: 1 },
  { label: 'EMI',         emoji: '🏦', type: 'expense', category: 'emi_loan',     note: 'EMI',         monthDay: 5 },
  { label: 'School Fees', emoji: '📚', type: 'expense', category: 'education',    note: 'School Fees', monthDay: 10 },
];

// ── helpers ───────────────────────────────────────────────────
const catFor = (id: string) =>
  DEFAULT_EXPENSE_CATEGORIES.find(c => c.id === id)
  ?? DEFAULT_INCOME_CATEGORIES.find(c => c.id === id);

/** First due date on/after startDate for the chosen frequency + anchor. */
function computeFirstDue(
  startDate: string,
  frequency: RecurringFrequency,
  monthDay: number,
  weekDay: number,
): string {
  if (frequency === 'weekly') {
    let d = startDate;
    for (let i = 0; i < 7; i++) {
      if (parseLocalDate(d).getDay() === weekDay) return d;
      d = shiftLocalDate(d, 1);
    }
    return startDate;
  }
  if (frequency === 'yearly') return startDate; // anchor = MM-DD of start date
  // monthly: anchor day in the start month, or next month if already past
  const due = addMonthsAnchoredISO(startDate, 0, monthDay);
  return due >= startDate ? due : addMonthsAnchoredISO(startDate, 1, monthDay);
}

/** Monthly-equivalent amount for the summary card. */
function monthlyEq(rule: RecurringRule): number {
  if (rule.frequency === 'weekly') return (rule.amount * 52) / 12;
  if (rule.frequency === 'yearly') return rule.amount / 12;
  return rule.amount;
}

function daysUntil(dateStr: string): number {
  const now = parseLocalDate(todayStr());
  const due = parseLocalDate(dateStr);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

// ── form state shape ──────────────────────────────────────────
interface FormState {
  type: 'expense' | 'income';
  amount: string;
  category: string;
  paymentMethod: PaymentMethod;
  note: string;
  frequency: RecurringFrequency;
  monthDay: number;   // 1-28 or LAST_DAY (31)
  weekDay: number;    // 0-6
  startDate: string;  // 'YYYY-MM-DD'
  isActive: boolean;
}

const blankForm = (): FormState => ({
  type: 'expense',
  amount: '',
  category: 'rent_housing',
  paymentMethod: 'upi',
  note: '',
  frequency: 'monthly',
  monthDay: 1,
  weekDay: parseLocalDate(todayStr()).getDay(),
  startDate: todayStr(),
  isActive: true,
});

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function RecurringTransactions() {
  const { t } = useTranslation();
  const theme = useExpenseTheme();
  const navigate = useNavigate();

  const [rules, setRules] = useState<RecurringRule[]>(() => getAllRules());
  const reload = useCallback(() => setRules(getAllRules()), []);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());
  const [amountError, setAmountError] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── derived ────────────────────────────────────────────────
  const activeRules = useMemo(() => rules.filter(r => r.isActive), [rules]);
  const totals = useMemo(() => {
    let expense = 0;
    let income = 0;
    for (const r of activeRules) {
      if (r.type === 'expense') expense += monthlyEq(r);
      else income += monthlyEq(r);
    }
    return { expense, income };
  }, [activeRules]);

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)),
    [rules],
  );

  const formCats = useMemo(
    () => (form.type === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES),
    [form.type],
  );

  // ── handlers ───────────────────────────────────────────────
  const openAdd = (preset?: typeof PRESETS[number]) => {
    setEditingId(null);
    const base = blankForm();
    if (preset) {
      base.type = preset.type;
      base.category = preset.category;
      base.note = preset.note;
      base.monthDay = preset.monthDay;
    }
    setForm(base);
    setAmountError(false);
    setSheetOpen(true);
  };

  const openEdit = (rule: RecurringRule) => {
    setEditingId(rule.id);
    setForm({
      type: rule.type,
      amount: String(rule.amount),
      category: rule.category,
      paymentMethod: rule.paymentMethod,
      note: rule.note ?? '',
      frequency: rule.frequency,
      monthDay: rule.frequency === 'monthly' && typeof rule.anchorDay === 'number' ? rule.anchorDay : 1,
      weekDay: rule.frequency === 'weekly' && typeof rule.anchorDay === 'number' ? rule.anchorDay : 1,
      startDate: rule.nextDueDate,
      isActive: rule.isActive,
    });
    setAmountError(false);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingId(null);
  };

  const handleSave = () => {
    const amount = Math.round((parseFloat(form.amount) || 0) * 100) / 100;
    if (amount <= 0 || amount > MAX_AMOUNT) {
      setAmountError(true);
      return;
    }
    const anchorDay: number | string =
      form.frequency === 'monthly' ? form.monthDay
      : form.frequency === 'weekly' ? form.weekDay
      : form.startDate.slice(5); // 'MM-DD'
    const nextDueDate = computeFirstDue(form.startDate, form.frequency, form.monthDay, form.weekDay);

    if (editingId) {
      const existing = rules.find(r => r.id === editingId);
      if (existing) {
        saveRule({
          ...existing,
          type: form.type,
          amount,
          category: form.category,
          paymentMethod: form.paymentMethod,
          note: form.note.trim() || undefined,
          frequency: form.frequency,
          anchorDay,
          nextDueDate,
          isActive: form.isActive,
        });
      }
    } else {
      saveRule(createRule({
        type: form.type,
        amount,
        category: form.category,
        paymentMethod: form.paymentMethod,
        note: form.note.trim() || undefined,
        frequency: form.frequency,
        anchorDay,
        nextDueDate,
        isActive: form.isActive,
      }));
    }
    // Materialize immediately so a due-today rule shows up in the
    // tracker without waiting for the next app open.
    materializeDueRecurring();
    reload();
    closeSheet();
  };

  const handleToggleActive = (rule: RecurringRule) => {
    saveRule({ ...rule, isActive: !rule.isActive });
    if (!rule.isActive) materializeDueRecurring(); // re-enabled → catch up
    reload();
  };

  const handleDelete = (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(prev => (prev === id ? null : prev)), 3000);
      return;
    }
    deleteRule(id);
    setConfirmDeleteId(null);
    reload();
  };

  const set = (patch: Partial<FormState>) => setForm(prev => ({ ...prev, ...patch }));

  const freqLabel = (f: RecurringFrequency) => {
    const def = FREQUENCIES.find(x => x.value === f)!;
    return t(def.labelKey, def.fallback);
  };

  // ── render ─────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.bgCardElevated,
    borderColor: theme.borderSubtle,
    boxShadow: theme.shadowCard,
  };

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: theme.bgPrimary }}>
      <div className="max-w-[428px] mx-auto px-4 pt-4 space-y-4">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            aria-label={t('common.back', 'Back')}
            className="w-10 h-10 rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSubtle, color: theme.textPrimary }}
          >
            <ArrowLeft size={18} />
          </motion.button>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-lg leading-tight" style={{ color: theme.textPrimary }}>
              {t('recurring.title', 'Recurring Transactions')}
            </h1>
            <p className="text-[11px]" style={{ color: theme.textMuted }}>
              {t('recurring.subtitle', 'Rent, EMI, salary — logged automatically')}
            </p>
          </div>
        </div>

        {/* ── Summary card ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-5"
          style={cardStyle}
        >
          <div className="flex items-center gap-2 mb-3">
            <Repeat size={14} style={{ color: theme.accentGold }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.textSecondary }}>
              {t('recurring.monthlyCommitment', 'Monthly on autopilot')}
            </span>
            {activeRules.length > 0 && (
              <span
                className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: theme.bgInvestment, color: theme.accentInvestment }}
              >
                {activeRules.length} {t('recurring.active', 'active')}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ backgroundColor: theme.bgExpense }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: theme.textMuted }}>
                {t('recurring.autoExpenses', 'Auto expenses')}
              </p>
              <p className="text-base font-extrabold mt-0.5" style={{ color: theme.accentExpense }}>
                {fmtINR(Math.round(totals.expense))}<span className="text-[10px] font-semibold">/{t('expenses.mo', 'mo')}</span>
              </p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: theme.bgIncome }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: theme.textMuted }}>
                {t('recurring.autoIncome', 'Auto income')}
              </p>
              <p className="text-base font-extrabold mt-0.5" style={{ color: theme.accentIncome }}>
                {fmtINR(Math.round(totals.income))}<span className="text-[10px] font-semibold">/{t('expenses.mo', 'mo')}</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Presets row (common-man quick add) ─────────────── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>
            {t('recurring.quickAdd', 'Quick add')}
          </p>
          <div className="flex overflow-x-auto gap-2.5 pb-1 scrollbar-hide">
            {PRESETS.map(p => (
              <motion.button
                key={p.label}
                whileTap={{ scale: 0.95 }}
                onClick={() => openAdd(p)}
                className="flex-shrink-0 flex items-center gap-2 border rounded-xl px-3.5 py-2.5"
                style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }}
              >
                <span className="text-base leading-none">{p.emoji}</span>
                <span className="font-bold text-xs whitespace-nowrap" style={{ color: theme.textPrimary }}>
                  {t(`recurring.preset_${p.category}`, p.label)}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── Empty state ────────────────────────────────────── */}
        {rules.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-10 px-4"
          >
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 text-4xl border"
              style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }}
            >
              🔁
            </div>
            <h3 className="font-bold text-lg mb-1" style={{ color: theme.textPrimary }}>
              {t('recurring.emptyTitle', 'Nothing on autopilot yet')}
            </h3>
            <p className="text-sm mb-5" style={{ color: theme.textMuted }}>
              {t('recurring.emptyBody', 'Add rent, EMI or salary once — FinCalix logs it for you every month.')}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => openAdd()}
              className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-2xl shadow-lg"
              style={{ backgroundColor: theme.accentInvestment }}
            >
              <Plus size={18} />
              {t('recurring.addRule', 'Add Recurring')}
            </motion.button>
          </motion.div>
        )}

        {/* ── Rules list ─────────────────────────────────────── */}
        {sortedRules.length > 0 && (
          <div className="space-y-3">
            {sortedRules.map(rule => {
              const cat = catFor(rule.category);
              const d = daysUntil(rule.nextDueDate);
              const dueLabel = d < 0
                ? t('recurring.processing', 'Catching up…')
                : d === 0
                ? t('recurring.dueToday', 'Due today')
                : t('recurring.dueInDays', 'In {{n}}d', { n: d });
              const amountColor = rule.type === 'income' ? theme.accentIncome : theme.accentExpense;
              return (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border p-4"
                  style={{ ...cardStyle, opacity: rule.isActive ? 1 : 0.55 }}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon by category */}
                    <button
                      onClick={() => openEdit(rule)}
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: theme.bgPrimary }}
                      aria-label={t('recurring.editRule', 'Edit rule')}
                    >
                      {cat?.icon ?? '🔁'}
                    </button>

                    {/* Name / note + meta */}
                    <button onClick={() => openEdit(rule)} className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm truncate" style={{ color: theme.textPrimary }}>
                          {rule.note || cat?.name || rule.category}
                        </h3>
                        {!rule.isActive && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ backgroundColor: theme.bgPrimary, color: theme.textMuted }}
                          >
                            {t('recurring.paused', 'Paused')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1"
                          style={{ backgroundColor: theme.bgPrimary, color: theme.textSecondary }}
                        >
                          <Calendar size={10} />
                          {rule.nextDueDate} · {dueLabel}
                        </span>
                        <span className="text-[10px]" style={{ color: theme.textMuted }}>
                          {freqLabel(rule.frequency)}
                        </span>
                      </div>
                    </button>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-extrabold text-sm leading-none" style={{ color: amountColor }}>
                        {rule.type === 'income' ? '+' : '−'}{fmtINR(rule.amount)}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider mt-1" style={{ color: theme.textMuted }}>
                        {rule.type === 'income' ? t('expenses.income', 'Income') : t('expenses.expense', 'Expense')}
                      </p>
                    </div>
                  </div>

                  {/* Row actions: active toggle + delete */}
                  <div
                    className="flex items-center justify-between mt-3 pt-3 border-t"
                    style={{ borderColor: theme.borderSubtle }}
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => handleToggleActive(rule)}
                        className="rounded-full transition-colors flex items-center px-0.5"
                        style={{ backgroundColor: rule.isActive ? theme.accentInvestment : theme.borderSubtle, width: 42, height: 24 }}
                        role="switch"
                        aria-checked={rule.isActive}
                      >
                        <motion.div
                          animate={{ x: rule.isActive ? 18 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="w-5 h-5 bg-white rounded-full shadow"
                        />
                      </div>
                      <span className="text-[11px] font-bold" style={{ color: theme.textSecondary }}>
                        {rule.isActive ? t('recurring.autoLogging', 'Auto-logging') : t('recurring.paused', 'Paused')}
                      </span>
                    </label>
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleDelete(rule.id)}
                      className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg"
                      style={
                        confirmDeleteId === rule.id
                          ? { backgroundColor: theme.accentExpense, color: '#fff' }
                          : { color: theme.accentExpense }
                      }
                    >
                      <Trash2 size={13} />
                      {confirmDeleteId === rule.id
                        ? t('recurring.confirmDelete', 'Tap again to delete')
                        : t('common.delete', 'Delete')}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}

            <p className="text-[10px] text-center px-4" style={{ color: theme.textMuted }}>
              {t('recurring.footerNote', 'Due items are added to your expense tracker automatically each time you open the app.')}
            </p>
          </div>
        )}

        {/* ── FAB ────────────────────────────────────────────── */}
        {rules.length > 0 && (
          <motion.button
            aria-label={t('recurring.addRule', 'Add Recurring')}
            whileTap={{ scale: 0.88 }}
            onClick={() => openAdd()}
            className="fixed right-5 bottom-28 w-14 h-14 text-white rounded-2xl flex items-center justify-center shadow-xl z-[9000]"
            style={{ backgroundColor: theme.accentInvestment }}
          >
            <Plus size={26} strokeWidth={2.5} />
          </motion.button>
        )}
      </div>

      {/* ── Add/Edit bottom sheet ───────────────────────────── */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-end justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            onClick={closeSheet}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-w-md flex flex-col"
              style={{
                maxHeight: '90dvh',
                backgroundColor: theme.bgPrimary,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Sheet header */}
              <div className="flex-shrink-0 px-6 pt-3 pb-2">
                <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: theme.borderSubtle }} />
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-lg" style={{ color: theme.textPrimary }}>
                    {editingId
                      ? t('recurring.editRule', 'Edit Recurring')
                      : t('recurring.newRule', 'New Recurring')}
                  </h3>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={closeSheet}
                    className="p-1.5 rounded-full"
                    style={{ backgroundColor: theme.borderSubtle, color: theme.textSecondary }}
                  >
                    <X size={18} />
                  </motion.button>
                </div>
              </div>

              {/* Scrollable form */}
              <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">

                {/* Type toggle */}
                <div className="grid grid-cols-2 gap-2">
                  {(['expense', 'income'] as const).map(tp => {
                    const active = form.type === tp;
                    const color = tp === 'income' ? theme.accentIncome : theme.accentExpense;
                    return (
                      <motion.button
                        key={tp}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => set({
                          type: tp,
                          category: tp === 'income' ? 'salary' : 'rent_housing',
                        })}
                        className="py-2.5 rounded-xl text-center text-xs font-bold"
                        style={active
                          ? { backgroundColor: color, color: '#fff' }
                          : { backgroundColor: theme.bgCard, border: `1.5px solid ${theme.borderSubtle}`, color: theme.textMuted }}
                      >
                        {tp === 'income' ? `💰 ${t('expenses.income', 'Income')}` : `💸 ${t('expenses.expense', 'Expense')}`}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold" style={{ color: theme.textSecondary }}>
                    {t('expenses.amountReq', 'Amount *')}
                  </label>
                  <div
                    className="flex items-center gap-2 rounded-xl px-4 py-3.5 border"
                    style={{
                      backgroundColor: theme.bgCard,
                      borderColor: amountError ? theme.accentExpense : theme.borderSubtle,
                    }}
                  >
                    <span className="font-bold text-base" style={{ color: theme.textMuted }}>₹</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.amount}
                      onChange={e => {
                        if (e.target.value.startsWith('-')) return;
                        set({ amount: e.target.value });
                        setAmountError(false);
                      }}
                      placeholder="0"
                      className="flex-1 bg-transparent text-xl font-bold outline-none min-w-0"
                      style={{ color: theme.textPrimary }}
                    />
                  </div>
                  {amountError && (
                    <p className="text-xs ml-1" style={{ color: theme.accentExpense }}>
                      {t('expenses.validAmount', 'Enter a valid amount')}
                    </p>
                  )}
                </div>

                {/* Category grid (same defs AddEntrySheet uses, from types/expense.ts) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold" style={{ color: theme.textSecondary }}>
                    {t('expenses.category', 'Category')}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {formCats.filter(c => c.isActive).map(c => {
                      const active = form.category === c.id;
                      return (
                        <motion.button
                          key={c.id}
                          whileTap={{ scale: 0.93 }}
                          onClick={() => set({ category: c.id })}
                          className="flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 border"
                          style={active
                            ? { backgroundColor: c.color + '22', borderColor: c.color }
                            : { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }}
                        >
                          <span className="text-lg leading-none">{c.icon}</span>
                          <span
                            className="text-[9px] font-semibold text-center leading-tight"
                            style={{ color: active ? c.color : theme.textMuted }}
                          >
                            {c.name}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Frequency selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold" style={{ color: theme.textSecondary }}>
                    {t('recurring.frequency', 'Repeats')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {FREQUENCIES.map(f => {
                      const active = form.frequency === f.value;
                      return (
                        <motion.button
                          key={f.value}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => set({ frequency: f.value })}
                          className="py-2.5 rounded-xl text-xs font-bold"
                          style={active
                            ? { backgroundColor: theme.accentInvestment, color: '#fff' }
                            : { backgroundColor: theme.bgCard, border: `1.5px solid ${theme.borderSubtle}`, color: theme.textMuted }}
                        >
                          {t(f.labelKey, f.fallback)}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Day-of-month picker (monthly): 1-28 + Last day */}
                {form.frequency === 'monthly' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold" style={{ color: theme.textSecondary }}>
                      {t('recurring.dayOfMonth', 'Day of month')}
                    </label>
                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => {
                        const active = form.monthDay === d;
                        return (
                          <button
                            key={d}
                            onClick={() => set({ monthDay: d })}
                            className="h-9 rounded-lg text-xs font-bold"
                            style={active
                              ? { backgroundColor: theme.accentInvestment, color: '#fff' }
                              : { backgroundColor: theme.bgCard, border: `1px solid ${theme.borderSubtle}`, color: theme.textSecondary }}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => set({ monthDay: LAST_DAY })}
                      className="w-full py-2.5 rounded-xl text-xs font-bold border mt-1"
                      style={form.monthDay === LAST_DAY
                        ? { backgroundColor: theme.accentInvestment, color: '#fff', borderColor: theme.accentInvestment }
                        : { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle, color: theme.textSecondary }}
                    >
                      {t('recurring.lastDay', 'Last day of month')}
                    </button>
                  </div>
                )}

                {/* Day-of-week picker (weekly) */}
                {form.frequency === 'weekly' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold" style={{ color: theme.textSecondary }}>
                      {t('recurring.dayOfWeek', 'Day of week')}
                    </label>
                    <div className="grid grid-cols-7 gap-1.5">
                      {WEEKDAYS.map((w, i) => {
                        const active = form.weekDay === i;
                        return (
                          <button
                            key={w}
                            onClick={() => set({ weekDay: i })}
                            className="h-9 rounded-lg text-[10px] font-bold"
                            style={active
                              ? { backgroundColor: theme.accentInvestment, color: '#fff' }
                              : { backgroundColor: theme.bgCard, border: `1px solid ${theme.borderSubtle}`, color: theme.textSecondary }}
                          >
                            {t(`recurring.wd_${i}`, w)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Start date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold" style={{ color: theme.textSecondary }}>
                    {t('recurring.startDate', 'Starts from')}
                  </label>
                  <DateInput
                    value={form.startDate}
                    onChange={v => set({ startDate: v })}
                    className="w-full bg-slate-50 dark:bg-card border-transparent border rounded-xl px-4 py-3.5 text-slate-900 dark:text-foreground font-bold outline-none"
                  />
                  <p className="text-[10px] ml-1" style={{ color: theme.textMuted }}>
                    {t('recurring.firstDueHint', 'First auto-entry: {{date}}', {
                      date: computeFirstDue(form.startDate, form.frequency, form.monthDay, form.weekDay),
                    })}
                  </p>
                </div>

                {/* Payment method pills */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold" style={{ color: theme.textSecondary }}>
                    {t('expenses.paymentMethod', 'Payment method')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PM_LIST.map(pm => {
                      const active = form.paymentMethod === pm;
                      const info = PAYMENT_METHOD_LABELS[pm];
                      return (
                        <button
                          key={pm}
                          onClick={() => set({ paymentMethod: pm })}
                          className="px-3 py-2 rounded-xl text-[11px] font-bold border"
                          style={active
                            ? { backgroundColor: theme.accentInvestment, color: '#fff', borderColor: theme.accentInvestment }
                            : { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle, color: theme.textSecondary }}
                        >
                          {info.icon} {info.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold" style={{ color: theme.textSecondary }}>
                    {t('recurring.noteLabel', 'Name / note (optional)')}
                  </label>
                  <input
                    type="text"
                    value={form.note}
                    onChange={e => set({ note: e.target.value })}
                    placeholder={t('recurring.notePlaceholder', 'e.g. House rent — Hyderabad')}
                    className="w-full rounded-xl px-4 py-3.5 text-sm font-semibold outline-none border"
                    style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSubtle, color: theme.textPrimary }}
                  />
                </div>
              </div>

              {/* Sheet footer */}
              <div
                className="flex-shrink-0 px-6 pt-3 space-y-2"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
              >
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  className="w-full py-4 rounded-xl text-white font-bold text-base shadow-lg"
                  style={{ backgroundColor: theme.accentInvestment }}
                >
                  {editingId ? t('expenses.saveChanges', 'Save Changes') : t('recurring.addRule', 'Add Recurring')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
