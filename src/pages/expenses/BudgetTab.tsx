import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Save, Copy, TrendingUp, Wallet, PiggyBank, ShieldCheck, BadgeCheck,
  AlertCircle, Sparkles, Landmark, ChevronRight as ChevronRightArrow,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useExpenseTheme, getBudgetStatus } from '../../theme/expenseTheme';

import type { Budget, BankAccount, FixedExpense, CategoryLimit, InvestmentTarget } from '../../types/expense';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INVESTMENT_CATEGORIES,
  ACCOUNT_TYPE_LABELS,
} from '../../types/expense';

import {
  getBudgetForMonth, saveBudget, generateBudgetId,
  getEntriesForMonth,
  getAllAccounts,
} from '../../utils/expenseStorage';
import {
  getMonthRange, fmtINR,
  getBudgetTotalFixed, getBudgetTotalCategoryLimits,
  getBudgetTotalInvestments, getBudgetUnallocated,
  getCategorySpentVsBudget,
} from '../../utils/expenseCalculations';
// Subscriptions live in a separate Zustand store (useBudgetTrackerStore)
// from the main expense entries (expenseStorage). Without bridging the
// two, the Subscriptions row in Budget Progress always showed 0% even
// after the user added subs in the Subscriptions tab — because BudgetTab
// only ever queried expenseStorage. We pull active subs here so the
// recurring monthly commitment counts toward the 'subscription' category.
import { useBudgetTrackerStore } from '../../store/useBudgetTrackerStore';

// ── pre-filled fixed expense templates ────────────────────────
const FIXED_TEMPLATES: { name: string; nameKey: string; icon: string; category: string }[] = [
  { name: 'Rent',              nameKey: 'expenses.rent',              icon: '\u{1F3E0}', category: 'rent_housing' },
  { name: 'Utilities',         nameKey: 'expenses.utilities',         icon: '\u{1F4A1}', category: 'utilities' },
  { name: 'Mobile & Internet', nameKey: 'expenses.mobile',            icon: '\u{1F4F1}', category: 'subscription' },
  { name: 'Insurance',         nameKey: 'expenses.insurance',         icon: '\u{1F6E1}', category: 'insurance' },
  { name: 'EMI',               nameKey: 'expenses.emi',               icon: '\u{1F3E6}', category: 'emi_loan' },
];

// ── helpers ───────────────────────────────────────────────────
const emptyBudget = (monthStr: string): Budget => ({
  id: generateBudgetId(),
  month: monthStr,
  monthlyIncome: 0,
  fixedExpenses: FIXED_TEMPLATES.map((t, i) => ({
    id: `fixed_${i}`,
    name: t.name,
    amount: 0,
    category: t.category,
    dueDay: 1,
  })),
  categoryLimits: DEFAULT_EXPENSE_CATEGORIES.filter(c => c.isActive).map(c => ({
    categoryId: c.id,
    monthlyLimit: 0,
  })),
  investmentTargets: DEFAULT_INVESTMENT_CATEGORIES.filter(c => c.isActive).map(c => ({
    categoryId: c.id,
    monthlyTarget: 0,
  })),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ── allocation bar segment colors ─────────────────────────────
const ALLOC_COLORS = {
  fixed:       { bg: '#DC2626', labelKey: 'expenses.allocFixed' },
  variable:    { bg: '#F59E0B', labelKey: 'expenses.allocVariable' },
  invest:      { bg: '#7C3AED', labelKey: 'expenses.allocInvest' },
  unallocated: { bg: '#22C55E', labelKey: 'expenses.allocFree' },
  over:        { bg: '#EF4444', labelKey: 'expenses.allocOver' },
};

export default function BudgetTab() {
  const { t } = useTranslation();
  const theme = useExpenseTheme();
  const navigate = useNavigate();

  // ── month navigation ──────────────────────────────────────
  const [monthOffset, setMonthOffset] = useState(0);
  const range = useMemo(() => getMonthRange(monthOffset), [monthOffset]);

  // ── load / init budget ────────────────────────────────────
  const [budget, setBudget] = useState<Budget>(() =>
    getBudgetForMonth(range.monthStr) ?? emptyBudget(range.monthStr),
  );

  // ── bank accounts (re-read on mount + when window regains focus) ─
  // The full Accounts UI lives at /expenses/accounts. From here we
  // only show a compact summary card so the user discovers the feature
  // and can see total cash + credit usage at a glance. Reload happens
  // on focus so when the user navigates back from BankAccounts after
  // adding/editing accounts, the new data appears immediately.
  const [accounts, setAccounts] = useState<BankAccount[]>(() => getAllAccounts());
  useEffect(() => {
    const reload = () => setAccounts(getAllAccounts());
    window.addEventListener('focus', reload);
    return () => window.removeEventListener('focus', reload);
  }, []);
  // Also reload whenever the component re-mounts (BudgetTab is re-mounted
  // when the user comes back from /expenses/accounts via the back button,
  // because ExpenseTracker is unmounted while on the BankAccounts route).

  const switchMonth = useCallback((dir: number) => {
    const newOffset = monthOffset + dir;
    setMonthOffset(newOffset);
    const newRange = getMonthRange(newOffset);
    setBudget(getBudgetForMonth(newRange.monthStr) ?? emptyBudget(newRange.monthStr));
  }, [monthOffset]);

  // ── section toggle states ─────────────────────────────────
  const [showFixed, setShowFixed] = useState(true);
  const [showCategories, setShowCategories] = useState(false);
  const [showInvestments, setShowInvestments] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [showProgress, setShowProgress] = useState(true);

  // ── custom fixed expense form ─────────────────────────────
  const [showAddFixed, setShowAddFixed] = useState(false);
  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedAmount, setNewFixedAmount] = useState('');

  // ── income source management ──────────────────────────────
  const [incomeSources, setIncomeSources] = useState<{ id: string; label: string; amount: number }[]>([]);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [newIncomeLabel, setNewIncomeLabel] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');

  // ── income focus animation ────────────────────────────────
  const [incomeFocused, setIncomeFocused] = useState(false);

  // ── saved feedback ────────────────────────────────────────
  const [saved, setSaved] = useState(false);
  // ── copy-previous-month feedback ──────────────────────────
  // 'idle' = default, 'copied' = success flash, 'empty' = no prev budget flash
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'empty'>('idle');

  // ── computed totals ───────────────────────────────────────
  const totalFixed = useMemo(() => getBudgetTotalFixed(budget), [budget]);
  const totalCategoryLimits = useMemo(() => getBudgetTotalCategoryLimits(budget), [budget]);
  const totalInvestments = useMemo(() => getBudgetTotalInvestments(budget), [budget]);
  const unallocated = useMemo(() => getBudgetUnallocated(budget), [budget]);
  const available = budget.monthlyIncome - totalFixed - totalInvestments;

  // ── account totals (cash on hand + credit usage) ─────────
  // savingsTotal counts every non-credit-card account; creditUsed
  // counts the outstanding balance on every credit card. Net cash
  // is what the user actually has available across all accounts.
  const accountTotals = useMemo(() => {
    let savings = 0;
    let creditUsed = 0;
    for (const acc of accounts) {
      if (!acc.isActive) continue;
      if (acc.accountType === 'credit_card') creditUsed += acc.manualBalance;
      else savings += acc.manualBalance;
    }
    return { savings, creditUsed, net: savings - creditUsed };
  }, [accounts]);

  // ── allocation percentages ────────────────────────────────
  const allocPcts = useMemo(() => {
    const inc = budget.monthlyIncome || 1;
    const fixedPct = Math.min((totalFixed / inc) * 100, 100);
    const varPct = Math.min((totalCategoryLimits / inc) * 100, 100 - fixedPct);
    const invPct = Math.min((totalInvestments / inc) * 100, 100 - fixedPct - varPct);
    const freePct = Math.max(100 - fixedPct - varPct - invPct, 0);
    const isOver = unallocated < 0;
    return { fixedPct, varPct, invPct, freePct, isOver };
  }, [budget.monthlyIncome, totalFixed, totalCategoryLimits, totalInvestments, unallocated]);

  // ── budget progress (entries for current month) ───────────
  const entries = useMemo(
    () => getEntriesForMonth(range.year, range.month),
    [range.year, range.month],
  );

  // ── subscriptions → recurring monthly commitment ──────────
  // The Subscriptions tab stores items in a separate Zustand store, so
  // their cost never lands in expenseStorage entries. We translate every
  // active sub into its monthly equivalent (annual/3 for quarterly,
  // annual/12 for yearly) and treat the total as "spent" against the
  // 'subscription' category limit. This is the only sensible bridge —
  // anything else would either double-count (if we also auto-created
  // expense entries) or under-count (status quo: always 0%).
  const subscriptions = useBudgetTrackerStore(s => s.subscriptions);
  const subscriptionMonthlyTotal = useMemo(() => {
    return subscriptions
      .filter(s => s.isActive)
      .reduce((sum, s) => {
        if (s.billingCycle === 'quarterly') return sum + s.amount / 3;
        if (s.billingCycle === 'yearly') return sum + s.amount / 12;
        return sum + s.amount; // monthly (default)
      }, 0);
  }, [subscriptions]);

  const categoryProgress = useMemo(() => {
    const base = getCategorySpentVsBudget(entries, budget);
    if (subscriptionMonthlyTotal <= 0) return base;
    return base.map(cp => {
      if (cp.categoryId !== 'subscription') return cp;
      const newSpent = cp.spent + subscriptionMonthlyTotal;
      return {
        ...cp,
        spent: newSpent,
        pct: cp.budgeted > 0 ? (newSpent / cp.budgeted) * 100 : 0,
      };
    });
  }, [entries, budget, subscriptionMonthlyTotal]);
  // Show the Subscriptions row whenever the user has either set a limit
  // OR added recurring subs — previously, a row with budgeted=0 would
  // disappear even if the user had ₹2k/mo in active subs.
  const activeProgress = categoryProgress.filter(
    cp => cp.budgeted > 0 || (cp.categoryId === 'subscription' && subscriptionMonthlyTotal > 0),
  );

  // ── is budget configured? ─────────────────────────────────
  const isBudgetSet = budget.monthlyIncome > 0;

  // ── sanitisation helper ───────────────────────────────────
  // All money inputs go through this to enforce: positive only, capped
  // at ₹100 Cr per line, and rounded to 2 decimals so floating-point
  // mush like 0.00001 or NaN never enters the budget store.
  const MAX_BUDGET_LINE = 1000000000; // ₹100 Cr
  const sanitiseAmount = (raw: number): number => {
    if (!Number.isFinite(raw) || raw < 0) return 0;
    if (raw > MAX_BUDGET_LINE) return MAX_BUDGET_LINE;
    return Math.round(raw * 100) / 100;
  };

  // ── updaters ──────────────────────────────────────────────
  const setIncome = (v: number) =>
    setBudget(prev => ({ ...prev, monthlyIncome: sanitiseAmount(v) }));

  const setFixedAmount = (id: string, amount: number) =>
    setBudget(prev => ({
      ...prev,
      fixedExpenses: prev.fixedExpenses.map(f =>
        f.id === id ? { ...f, amount: sanitiseAmount(amount) } : f,
      ),
    }));

  const removeFixed = (id: string) =>
    setBudget(prev => ({
      ...prev,
      fixedExpenses: prev.fixedExpenses.filter(f => f.id !== id),
    }));

  const addCustomFixed = () => {
    const cleanAmount = sanitiseAmount(Number(newFixedAmount));
    if (!newFixedName.trim() || cleanAmount <= 0) return;
    const fe: FixedExpense = {
      id: `custom_${Date.now()}`,
      name: newFixedName.trim(),
      amount: cleanAmount,
      category: 'other_expense',
      dueDay: 1,
    };
    setBudget(prev => ({
      ...prev,
      fixedExpenses: [...prev.fixedExpenses, fe],
    }));
    setNewFixedName('');
    setNewFixedAmount('');
    setShowAddFixed(false);
  };

  const addIncomeSource = () => {
    const amt = sanitiseAmount(Number(newIncomeAmount));
    if (!newIncomeLabel.trim() || amt <= 0) return;
    setIncomeSources(prev => [...prev, { id: `src_${Date.now()}`, label: newIncomeLabel.trim(), amount: amt }]);
    setIncome(budget.monthlyIncome + amt);
    setNewIncomeLabel('');
    setNewIncomeAmount('');
    setShowAddIncome(false);
  };

  const removeIncomeSource = (id: string) => {
    const src = incomeSources.find(s => s.id === id);
    if (src) {
      setIncome(Math.max(budget.monthlyIncome - src.amount, 0));
      setIncomeSources(prev => prev.filter(s => s.id !== id));
    }
  };

  const setCategoryLimit = (categoryId: string, monthlyLimit: number) =>
    setBudget(prev => ({
      ...prev,
      categoryLimits: prev.categoryLimits.map(cl =>
        cl.categoryId === categoryId ? { ...cl, monthlyLimit: sanitiseAmount(monthlyLimit) } : cl,
      ),
    }));

  const setInvestmentTarget = (categoryId: string, monthlyTarget: number) =>
    setBudget(prev => ({
      ...prev,
      investmentTargets: prev.investmentTargets.map(it =>
        it.categoryId === categoryId ? { ...it, monthlyTarget: sanitiseAmount(monthlyTarget) } : it,
      ),
    }));

  // ── save ───────────────────────────────────────────────────
  const handleSave = () => {
    saveBudget({ ...budget, month: range.monthStr, updatedAt: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  };

  // ── copy previous month ───────────────────────────────────
  // Two failure modes that needed fixing:
  //   1. The previous version updated React state with setBudget() but
  //      NEVER called saveBudget() — values were lost on tab switch.
  //   2. When the previous month had no budget, it returned silently —
  //      the user had no idea why nothing happened (matches the screenshot).
  // Now: persists to storage AND surfaces a flash on the Copy button so
  // both success and "no previous budget" cases are visible to the user.
  const handleCopyPrevious = () => {
    const prevRange = getMonthRange(monthOffset - 1);
    const prev = getBudgetForMonth(prevRange.monthStr);
    if (!prev || (prev.monthlyIncome === 0 && prev.fixedExpenses.length === 0 && prev.categoryLimits.length === 0)) {
      // Treat an empty placeholder budget as "no previous budget" — older
      // versions saved an empty Budget row on first visit, so the existence
      // check alone wasn't enough to detect a fresh user.
      setCopyState('empty');
      // Long enough that the flash can't be missed even on quick taps.
      setTimeout(() => setCopyState('idle'), 4000);
      return;
    }
    const copied: Budget = {
      ...prev,
      id: budget.id,
      month: range.monthStr,
      createdAt: budget.createdAt,
      updatedAt: new Date().toISOString(),
    };
    setBudget(copied);
    saveBudget(copied);  // <-- THE PERSISTENCE FIX
    setCopyState('copied');
    setTimeout(() => setCopyState('idle'), 4000);
  };

  // ── category lookup helper ────────────────────────────────
  const catInfo = (catId: string) => {
    const def = DEFAULT_EXPENSE_CATEGORIES.find(c => c.id === catId)
      ?? DEFAULT_INVESTMENT_CATEGORIES.find(c => c.id === catId);
    return { icon: def?.icon ?? '\u{1F4E6}', name: def?.name ?? catId, color: def?.color ?? '#94a3b8' };
  };

  // ── section expand/collapse animation ─────────────────────
  const sectionAnim = {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto', opacity: 1, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
    exit: { height: 0, opacity: 0, transition: { duration: 0.25 } },
  };

  // ── common card style ─────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.bgCard,
    borderColor: theme.borderSubtle,
    boxShadow: theme.shadowSoft,
  };

  const elevatedCard: React.CSSProperties = {
    backgroundColor: theme.bgCardElevated,
    borderColor: theme.borderSubtle,
    boxShadow: theme.shadowCard,
  };

  return (
    <div className="space-y-5 pb-8">

      {/* ======================================================
          1. MONTH SELECTOR + HEALTH BADGE
          ====================================================== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border overflow-hidden"
        style={elevatedCard}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => switchMonth(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: theme.bgPrimary, color: theme.textSecondary }}
          >
            <ChevronLeft size={18} />
          </motion.button>

          <div className="flex flex-col items-center gap-1.5">
            <span className="font-bold text-sm tracking-wide" style={{ color: theme.textPrimary }}>
              {range.label}
            </span>
            {/* Health badge */}
            <motion.span
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: isBudgetSet
                  ? (theme.isDark ? '#052e16' : '#F0FDF4')
                  : (theme.isDark ? '#451a03' : '#FFF7ED'),
                color: isBudgetSet ? '#16A34A' : '#D97706',
              }}
            >
              {isBudgetSet ? <BadgeCheck size={12} /> : <AlertCircle size={12} />}
              {isBudgetSet ? t('expenses.budgetSet') : t('expenses.setupBudget')}
            </motion.span>
          </div>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => switchMonth(1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: theme.bgPrimary, color: theme.textSecondary }}
          >
            <ChevronRight size={18} />
          </motion.button>
        </div>
      </motion.div>

      {/* First-run hint — only shown when the user has not yet set any
          income for this month. The Budget tab is otherwise visually
          complete (empty cards) and that confused first-time users. */}
      {!isBudgetSet && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-4 flex items-start gap-3"
          style={{
            backgroundColor: theme.isDark ? '#451a03' : '#FFF7ED',
            borderColor: theme.isDark ? '#7c2d12' : '#FED7AA',
          }}
        >
          <AlertCircle size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-xs font-bold mb-0.5" style={{ color: '#D97706' }}>
              {t('expenses.budgetEmptyTitle', 'Set your monthly income to begin')}
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: '#9A3412' }}>
              {t('expenses.budgetEmptyBody', 'Enter your monthly income below, then add fixed expenses (rent, EMIs, bills) and category limits. Reports and budget vs. actual numbers stay empty until you set income.')}
            </p>
          </div>
        </motion.div>
      )}

      {/* ======================================================
          2. MONTHLY INCOME
          ====================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border overflow-hidden"
        style={elevatedCard}
      >
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.bgIncome }}>
              <Wallet size={16} style={{ color: theme.accentIncome }} />
            </div>
            <label
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: theme.textSecondary }}
            >
              {t('expenses.monthlyIncome')}
            </label>
          </div>

          {/* Main income input */}
          <motion.div
            animate={{
              boxShadow: incomeFocused
                ? '0 0 0 3px rgba(22, 163, 74, 0.2), 0 4px 16px rgba(22, 163, 74, 0.1)'
                : '0 0 0 1px ' + theme.borderSubtle,
            }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 rounded-xl px-4 py-3.5 border"
            style={{ backgroundColor: theme.bgPrimary, borderColor: theme.borderSubtle }}
          >
            <span className="text-xl font-bold" style={{ color: theme.accentIncome }}>{'\u20B9'}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_BUDGET_LINE}
              step="0.01"
              value={budget.monthlyIncome || ''}
              onChange={e => {
                if (e.target.value.startsWith('-')) return;
                setIncome(Number(e.target.value));
              }}
              onFocus={() => setIncomeFocused(true)}
              onBlur={() => setIncomeFocused(false)}
              placeholder="0"
              className="flex-1 bg-transparent text-2xl font-bold outline-none"
              style={{ color: theme.textPrimary }}
            />
          </motion.div>

          {/* Additional income sources */}
          {incomeSources.length > 0 && (
            <div className="mt-3 space-y-2">
              {incomeSources.map(src => (
                <div
                  key={src.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border"
                  style={{ backgroundColor: theme.bgPrimary, borderColor: theme.borderSubtle }}
                >
                  <span className="text-xs font-medium" style={{ color: theme.textSecondary }}>{src.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: theme.accentIncome }}>{fmtINR(src.amount)}</span>
                    <button onClick={() => removeIncomeSource(src.id)} className="p-1">
                      <Trash2 size={12} style={{ color: theme.accentExpense }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add income source */}
          <AnimatePresence>
            {showAddIncome ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3"
              >
                <div className="space-y-2 pt-3 border-t" style={{ borderColor: theme.borderSubtle }}>
                  <input
                    type="text"
                    value={newIncomeLabel}
                    onChange={e => setNewIncomeLabel(e.target.value)}
                    placeholder={t('expenses.incomeSourceLabel')}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border"
                    style={{ backgroundColor: theme.bgPrimary, borderColor: theme.borderSubtle, color: theme.textPrimary }}
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_BUDGET_LINE}
                    step="0.01"
                    value={newIncomeAmount}
                    onChange={e => {
                      if (e.target.value.startsWith('-')) return;
                      setNewIncomeAmount(e.target.value);
                    }}
                    placeholder={t('expenses.amount')}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border"
                    style={{ backgroundColor: theme.bgPrimary, borderColor: theme.borderSubtle, color: theme.textPrimary }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddIncome(false)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                      style={{ backgroundColor: theme.bgPrimary, color: theme.textSecondary }}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={addIncomeSource}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white"
                      style={{ backgroundColor: theme.accentIncome }}
                    >
                      {t('common.confirm')}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAddIncome(true)}
                className="flex items-center gap-1.5 mt-3 text-xs font-bold"
                style={{ color: theme.accentIncome }}
              >
                <Plus size={14} /> {t('expenses.addIncomeSource')}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ======================================================
          2.5 BANK ACCOUNTS — multi-account net cash on hand
          ======================================================
          The full add/edit/delete UI lives at /expenses/accounts
          (BankAccounts.tsx). This card is the discoverable entry
          point: total cash + credit usage + a compact list of the
          top 3 accounts. Tapping anywhere on the card routes to
          the manage screen. The user explicitly asked for
          "multiple bank accounts and how much money in each",
          driven by manual entry. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl border overflow-hidden"
        style={elevatedCard}
      >
        <button
          type="button"
          onClick={() => navigate('/expenses/accounts')}
          className="w-full text-left p-5 transition-colors"
          aria-label={t('expenses.manageBankAccounts', 'Manage bank accounts')}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: theme.bgInvestment }}
            >
              {'\u{1F3E6}'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: theme.textSecondary }}
                >
                  {t('expenses.bankAccountsTitle', 'Bank Accounts')}
                </span>
                {accounts.length > 0 && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: theme.bgInvestment,
                      color: theme.accentInvestment,
                    }}
                  >
                    {accounts.filter(a => a.isActive).length}
                  </span>
                )}
              </div>
              {accounts.length === 0 ? (
                <p className="text-xs font-medium mt-0.5" style={{ color: theme.textMuted }}>
                  {t('expenses.bankAccountsEmpty', 'Tap to add your bank balances and credit cards')}
                </p>
              ) : (
                <p
                  className="font-extrabold text-xl mt-0.5"
                  style={{ color: accountTotals.net >= 0 ? theme.accentIncome : theme.accentExpense }}
                >
                  {fmtINR(accountTotals.net)}
                </p>
              )}
            </div>
            <ChevronRightArrow size={18} style={{ color: theme.textMuted }} />
          </div>

          {/* Cash + credit breakdown — only when at least one account exists */}
          {accounts.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t" style={{ borderColor: theme.borderSubtle }}>
              <div>
                <p className="text-[10px] font-semibold uppercase" style={{ color: theme.textMuted }}>
                  {t('expenses.cashOnHand', 'Cash on hand')}
                </p>
                <p className="text-sm font-bold mt-0.5" style={{ color: theme.accentIncome }}>
                  {fmtINR(accountTotals.savings)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase" style={{ color: theme.textMuted }}>
                  {t('expenses.creditUsed', 'Credit used')}
                </p>
                <p
                  className="text-sm font-bold mt-0.5"
                  style={{ color: accountTotals.creditUsed > 0 ? theme.accentExpense : theme.textSecondary }}
                >
                  {fmtINR(accountTotals.creditUsed)}
                </p>
              </div>
            </div>
          )}

          {/* Compact list of the top 3 accounts (highest balance first) so the
              user can see their main accounts without leaving the Budget tab.
              Negative-balance credit cards are shown in red. */}
          {accounts.length > 0 && (
            <div className="mt-4 space-y-2">
              {[...accounts]
                .filter(a => a.isActive)
                .sort((a, b) => b.manualBalance - a.manualBalance)
                .slice(0, 3)
                .map(acc => {
                  const typeInfo = ACCOUNT_TYPE_LABELS[acc.accountType];
                  const isCreditCard = acc.accountType === 'credit_card';
                  return (
                    <div
                      key={acc.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl"
                      style={{ backgroundColor: theme.bgPrimary }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                        style={{ backgroundColor: acc.color + '22', color: acc.color }}
                      >
                        {typeInfo.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-semibold truncate"
                          style={{ color: theme.textPrimary }}
                        >
                          {acc.name}
                        </p>
                        <p className="text-[10px] truncate" style={{ color: theme.textMuted }}>
                          {acc.bankName || typeInfo.label}
                          {acc.lastFourDigits ? ` \u00B7 ****${acc.lastFourDigits}` : ''}
                        </p>
                      </div>
                      <p
                        className="text-xs font-bold"
                        style={{
                          color: isCreditCard
                            ? theme.accentExpense
                            : theme.textPrimary,
                        }}
                      >
                        {isCreditCard ? '\u2212' : ''}{fmtINR(acc.manualBalance)}
                      </p>
                    </div>
                  );
                })}
              {accounts.filter(a => a.isActive).length > 3 && (
                <p className="text-[10px] text-center font-semibold" style={{ color: theme.accentInvestment }}>
                  {t('expenses.viewAllAccounts', 'View all {{n}} accounts', {
                    n: accounts.filter(a => a.isActive).length,
                  })}
                </p>
              )}
            </div>
          )}

          {/* Manage CTA — visible regardless of state so the user always
              has a clear way into the full management UI. */}
          <div
            className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t text-xs font-bold"
            style={{ borderColor: theme.borderSubtle, color: theme.accentInvestment }}
          >
            <Landmark size={12} />
            {accounts.length === 0
              ? t('expenses.addFirstAccount', 'Add your first account')
              : t('expenses.manageAccounts', 'Manage Accounts')}
          </div>
        </button>
      </motion.div>

      {/* ======================================================
          3. BUDGET ALLOCATION VISUAL
          ====================================================== */}
      {budget.monthlyIncome > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border p-5"
          style={elevatedCard}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} style={{ color: theme.accentGold }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textSecondary }}>
              {t('expenses.budgetAllocation')}
            </span>
          </div>

          {/* Allocation bar */}
          <div className="w-full h-4 rounded-full overflow-hidden flex" style={{ backgroundColor: theme.bgPrimary }}>
            {allocPcts.fixedPct > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${allocPcts.fixedPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full"
                style={{ backgroundColor: ALLOC_COLORS.fixed.bg }}
              />
            )}
            {allocPcts.varPct > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${allocPcts.varPct}%` }}
                transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                className="h-full"
                style={{ backgroundColor: ALLOC_COLORS.variable.bg }}
              />
            )}
            {allocPcts.invPct > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${allocPcts.invPct}%` }}
                transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                className="h-full"
                style={{ backgroundColor: ALLOC_COLORS.invest.bg }}
              />
            )}
            {allocPcts.freePct > 0 && !allocPcts.isOver && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${allocPcts.freePct}%` }}
                transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
                className="h-full"
                style={{ backgroundColor: ALLOC_COLORS.unallocated.bg, opacity: 0.35 }}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {[
              { color: ALLOC_COLORS.fixed.bg, label: t('expenses.fixedExpenses'), pct: allocPcts.fixedPct },
              { color: ALLOC_COLORS.variable.bg, label: t('expenses.categoryBudgetLimits'), pct: allocPcts.varPct },
              { color: ALLOC_COLORS.invest.bg, label: t('expenses.investments'), pct: allocPcts.invPct },
              { color: allocPcts.isOver ? ALLOC_COLORS.over.bg : ALLOC_COLORS.unallocated.bg, label: allocPcts.isOver ? t('expenses.overallocated') : t('expenses.unallocated'), pct: allocPcts.freePct },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-semibold" style={{ color: theme.textMuted }}>
                  {item.label} {Math.round(item.pct)}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ======================================================
          4. FIXED EXPENSES
          ====================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border overflow-hidden"
        style={cardStyle}
      >
        <button
          onClick={() => setShowFixed(!showFixed)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.bgExpense }}>
              <ShieldCheck size={15} style={{ color: theme.accentExpense }} />
            </div>
            <div>
              <p className="font-bold text-sm text-left" style={{ color: theme.textPrimary }}>
                {t('expenses.fixedExpenses')}
              </p>
              <p className="text-[10px] mt-0.5 text-left" style={{ color: theme.textMuted }}>
                {t('expenses.fixedExpensesSubtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: theme.accentExpense }}>{fmtINR(totalFixed)}</span>
            {showFixed
              ? <ChevronUp size={16} style={{ color: theme.textMuted }} />
              : <ChevronDown size={16} style={{ color: theme.textMuted }} />}
          </div>
        </button>

        <AnimatePresence>
          {showFixed && (
            <motion.div {...sectionAnim} className="overflow-hidden">
              <div
                className="px-4 pb-5 space-y-3 border-t pt-4"
                style={{ borderColor: theme.borderSubtle }}
              >
                {budget.fixedExpenses.map(fe => {
                  const template = FIXED_TEMPLATES.find(tp => tp.name === fe.name);
                  const icon = template?.icon ?? '\u{1F4CB}';
                  const isCustom = !template;
                  return (
                    <div key={fe.id} className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: theme.bgPrimary }}
                      >
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold mb-1 truncate" style={{ color: theme.textSecondary }}>
                          {template ? t(template.nameKey) : fe.name}
                        </p>
                        <div
                          className="flex items-center gap-1.5 rounded-xl px-3 py-2 border"
                          style={{ backgroundColor: theme.bgPrimary, borderColor: theme.borderSubtle }}
                        >
                          <span className="text-xs font-bold" style={{ color: theme.textMuted }}>{'\u20B9'}</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={MAX_BUDGET_LINE}
                            step="0.01"
                            value={fe.amount || ''}
                            onChange={e => {
                              if (e.target.value.startsWith('-')) return;
                              setFixedAmount(fe.id, Number(e.target.value));
                            }}
                            placeholder="0"
                            className="flex-1 bg-transparent text-sm font-bold outline-none min-w-0"
                            style={{ color: theme.textPrimary }}
                          />
                        </div>
                      </div>
                      {isCustom && (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeFixed(fe.id)}
                          className="p-2 rounded-lg shrink-0"
                          style={{ color: theme.accentExpense }}
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      )}
                    </div>
                  );
                })}

                {/* Add custom fixed expense */}
                <AnimatePresence>
                  {showAddFixed ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-2 pt-3 border-t" style={{ borderColor: theme.borderSubtle }}>
                        <input
                          type="text"
                          value={newFixedName}
                          onChange={e => setNewFixedName(e.target.value)}
                          placeholder={t('expenses.customLabel')}
                          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border"
                          style={{ backgroundColor: theme.bgPrimary, borderColor: theme.borderSubtle, color: theme.textPrimary }}
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={MAX_BUDGET_LINE}
                          step="0.01"
                          value={newFixedAmount}
                          onChange={e => {
                            if (e.target.value.startsWith('-')) return;
                            setNewFixedAmount(e.target.value);
                          }}
                          placeholder={t('expenses.amount')}
                          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border"
                          style={{ backgroundColor: theme.bgPrimary, borderColor: theme.borderSubtle, color: theme.textPrimary }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowAddFixed(false)}
                            className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                            style={{ backgroundColor: theme.bgPrimary, color: theme.textSecondary }}
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            onClick={addCustomFixed}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white"
                            style={{ backgroundColor: theme.accentExpense }}
                          >
                            {t('common.confirm')}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowAddFixed(true)}
                      className="flex items-center gap-1.5 text-xs font-bold pt-1"
                      style={{ color: theme.accentInvestment }}
                    >
                      <Plus size={14} /> {t('expenses.addOtherFixed')}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ======================================================
          5. CATEGORY SPENDING LIMITS
          ====================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border overflow-hidden"
        style={cardStyle}
      >
        <button
          onClick={() => setShowCategories(!showCategories)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFFBEB' }}>
              <span className="text-base">{'\u{1F3AF}'}</span>
            </div>
            <div>
              <p className="font-bold text-sm text-left" style={{ color: theme.textPrimary }}>
                {t('expenses.categoryBudgetLimits')}
              </p>
              <p className="text-[10px] mt-0.5 text-left" style={{ color: theme.textMuted }}>
                {t('expenses.categoryBudgetSubtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: theme.accentGold }}>{fmtINR(totalCategoryLimits)}</span>
            {showCategories
              ? <ChevronUp size={16} style={{ color: theme.textMuted }} />
              : <ChevronDown size={16} style={{ color: theme.textMuted }} />}
          </div>
        </button>

        <AnimatePresence>
          {showCategories && (
            <motion.div {...sectionAnim} className="overflow-hidden">
              <div className="px-4 pb-5 space-y-4 border-t pt-4" style={{ borderColor: theme.borderSubtle }}>
                {/* Available helper */}
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ backgroundColor: theme.bgIncome }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.accentIncome }}>
                    {t('expenses.available')}: {fmtINR(Math.max(available, 0))}
                  </span>
                </div>

                {budget.categoryLimits.map(cl => {
                  const info = catInfo(cl.categoryId);
                  return (
                    <div key={cl.categoryId}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                            style={{ backgroundColor: info.color + '18' }}
                          >
                            {info.icon}
                          </div>
                          <span className="text-xs font-semibold" style={{ color: theme.textPrimary }}>
                            {info.name}
                          </span>
                        </div>
                        <div
                          className="rounded-xl px-3 py-2 flex items-center min-w-[100px] border"
                          style={{ backgroundColor: theme.bgPrimary, borderColor: theme.borderSubtle }}
                        >
                          <span className="text-xs font-bold" style={{ color: theme.textMuted }}>{'\u20B9'}</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={MAX_BUDGET_LINE}
                            step="0.01"
                            value={cl.monthlyLimit || ''}
                            onChange={e => {
                              if (e.target.value.startsWith('-')) return;
                              setCategoryLimit(cl.categoryId, Number(e.target.value));
                            }}
                            placeholder="0"
                            className="w-full bg-transparent text-xs font-bold outline-none text-right ml-1"
                            style={{ color: theme.textPrimary }}
                          />
                        </div>
                      </div>
                      {/* Thin progress indicator */}
                      <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: theme.bgPrimary }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((cl.monthlyLimit / Math.max(available, 1)) * 100, 100)}%` }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: info.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ======================================================
          6. INVESTMENT TARGETS
          ====================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl border overflow-hidden"
        style={cardStyle}
      >
        <button
          onClick={() => setShowInvestments(!showInvestments)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.bgInvestment }}>
              <PiggyBank size={15} style={{ color: theme.accentInvestment }} />
            </div>
            <div>
              <p className="font-bold text-sm text-left" style={{ color: theme.textPrimary }}>
                {t('expenses.monthlyInvestTargets')}
              </p>
              <p className="text-[10px] mt-0.5 text-left" style={{ color: theme.textMuted }}>
                {t('expenses.investTargetsDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: theme.accentInvestment }}>{fmtINR(totalInvestments)}</span>
            {showInvestments
              ? <ChevronUp size={16} style={{ color: theme.textMuted }} />
              : <ChevronDown size={16} style={{ color: theme.textMuted }} />}
          </div>
        </button>

        <AnimatePresence>
          {showInvestments && (
            <motion.div {...sectionAnim} className="overflow-hidden">
              <div className="px-4 pb-5 space-y-3 border-t pt-4" style={{ borderColor: theme.borderSubtle }}>
                {budget.investmentTargets.map(it => {
                  const info = catInfo(it.categoryId);
                  return (
                    <div key={it.categoryId} className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: info.color + '18' }}
                      >
                        {info.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold mb-1 truncate" style={{ color: theme.textSecondary }}>
                          {info.name}
                        </p>
                        <div
                          className="flex items-center gap-1.5 rounded-xl px-3 py-2 border"
                          style={{ backgroundColor: theme.bgPrimary, borderColor: theme.borderSubtle }}
                        >
                          <span className="text-xs font-bold" style={{ color: theme.textMuted }}>{'\u20B9'}</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={it.monthlyTarget || ''}
                            onChange={e => setInvestmentTarget(it.categoryId, Number(e.target.value))}
                            placeholder="0"
                            className="flex-1 bg-transparent text-sm font-bold outline-none min-w-0"
                            style={{ color: theme.textPrimary }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Total investments divider */}
                <div
                  className="flex items-center justify-between pt-3 mt-1 border-t"
                  style={{ borderColor: theme.borderSubtle }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
                    {t('expenses.total')}
                  </span>
                  <span className="text-sm font-bold" style={{ color: theme.accentInvestment }}>{fmtINR(totalInvestments)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ======================================================
          7. BUDGET PROGRESS (mid-month)
          ====================================================== */}
      {activeProgress.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border overflow-hidden"
          style={cardStyle}
        >
          <button
            onClick={() => setShowProgress(!showProgress)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.bgInvestment }}>
                <TrendingUp size={15} style={{ color: theme.accentInvestment }} />
              </div>
              <p className="font-bold text-sm text-left" style={{ color: theme.textPrimary }}>
                {t('expenses.budgetProgress')}
              </p>
            </div>
            {showProgress
              ? <ChevronUp size={16} style={{ color: theme.textMuted }} />
              : <ChevronDown size={16} style={{ color: theme.textMuted }} />}
          </button>

          <AnimatePresence>
            {showProgress && (
              <motion.div {...sectionAnim} className="overflow-hidden">
                <div className="px-4 pb-5 space-y-4 border-t pt-4" style={{ borderColor: theme.borderSubtle }}>
                  {activeProgress.map((cp, idx) => {
                    const info = catInfo(cp.categoryId);
                    const pctClamped = Math.min(cp.pct, 100);
                    const isOver = cp.pct > 100;
                    const status = getBudgetStatus(cp.pct);
                    // When the user has overspent, "left" should show the
                    // overshoot in red rather than collapsing to zero — that
                    // way the user can see e.g. "Over: ₹500" instead of just
                    // "Left: ₹0" which hides the problem.
                    const overshoot = Math.max(cp.spent - cp.budgeted, 0);
                    const left = Math.max(cp.budgeted - cp.spent, 0);
                    return (
                      <motion.div
                        key={cp.categoryId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.06, duration: 0.3 }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                              style={{ backgroundColor: info.color + '18' }}
                            >
                              {info.icon}
                            </div>
                            <span className="text-xs font-bold" style={{ color: theme.textPrimary }}>
                              {info.name}
                            </span>
                          </div>
                          {/* Pill: shows real % even when over-budget. Adds
                              the word "Over" when > 100% so the user can't
                              miss it (was previously the same green pill at
                              250% as at 50%, just with a different color). */}
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: status.bgColor, color: status.color }}
                          >
                            {isOver
                                ? t('expenses.overByPct', '{{pct}}% · Over', { pct: Math.round(cp.pct) })
                                : `${Math.round(cp.pct)}%`}
                          </span>
                        </div>

                        {/* Labels row — when overspent, replace "left ₹0"
                            with a red "Over: ₹X" so the magnitude is visible. */}
                        <div className="flex justify-between text-[10px] mb-1.5" style={{ color: theme.textMuted }}>
                          <span>{t('expenses.budget')}: {fmtINR(cp.budgeted)}</span>
                          <span>{t('expenses.spent')}: {fmtINR(cp.spent)}</span>
                          {isOver
                            ? <span style={{ color: theme.accentExpense, fontWeight: 700 }}>
                                {t('expenses.overBy', 'Over')}: {fmtINR(overshoot)}
                              </span>
                            : <span>{t('expenses.left')}: {fmtINR(left)}</span>}
                        </div>

                        {/* Progress bar — clamped to 100% width since we
                            can't render >100%, but coloured red on overrun
                            so the visual matches the pill. */}
                        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.bgPrimary }}>
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${pctClamped}%` }}
                            transition={{ duration: 0.7, delay: idx * 0.06, ease: 'easeOut' }}
                            style={{ backgroundColor: status.color }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ======================================================
          8. BUDGET SUMMARY
          ====================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl border overflow-hidden"
        style={{
          ...elevatedCard,
          borderColor: unallocated >= 0 ? 'rgba(22, 163, 74, 0.25)' : 'rgba(220, 38, 38, 0.25)',
        }}
      >
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: unallocated >= 0 ? theme.bgIncome : theme.bgExpense }}
            >
              <span className="text-base">{unallocated >= 0 ? '\u{2728}' : '\u{26A0}'}</span>
            </div>
            <p className="font-bold text-sm text-left" style={{ color: theme.textPrimary }}>
              {t('expenses.monthlySummary')}
            </p>
          </div>
          {showSummary
            ? <ChevronUp size={16} style={{ color: theme.textMuted }} />
            : <ChevronDown size={16} style={{ color: theme.textMuted }} />}
        </button>

        <AnimatePresence>
          {showSummary && (
            <motion.div {...sectionAnim} className="overflow-hidden">
              <div className="px-4 pb-5 space-y-2.5 border-t pt-4" style={{ borderColor: theme.borderSubtle }}>
                {[
                  { label: t('expenses.monthlyIncome'), value: budget.monthlyIncome, color: theme.accentIncome, sign: '' },
                  { label: t('expenses.fixedExpenses'), value: totalFixed, color: theme.accentExpense, sign: '\u2212' },
                  { label: t('expenses.investments'), value: totalInvestments, color: theme.accentInvestment, sign: '\u2212' },
                  { label: t('expenses.categoryBudgetLimits'), value: totalCategoryLimits, color: theme.accentGold, sign: '\u2212' },
                ].map((row, i) => (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                      <span className="text-xs font-medium" style={{ color: theme.textSecondary }}>{row.label}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: row.color }}>
                      {row.sign}{fmtINR(row.value)}
                    </span>
                  </motion.div>
                ))}

                {/* Divider */}
                <div className="border-t my-1" style={{ borderColor: theme.borderSubtle }} />

                {/* Unallocated / Savings */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 }}
                  className="flex justify-between items-center py-2 px-3 rounded-xl"
                  style={{
                    backgroundColor: unallocated >= 0 ? theme.bgIncome : theme.bgExpense,
                  }}
                >
                  <span className="font-bold text-sm" style={{ color: theme.textPrimary }}>
                    {unallocated >= 0 ? t('expenses.estSavings') : t('expenses.overallocated')}
                  </span>
                  <span
                    className="font-bold text-sm"
                    style={{ color: unallocated >= 0 ? theme.accentIncome : theme.accentExpense }}
                  >
                    {unallocated >= 0 ? '+' : ''}{fmtINR(unallocated)}
                  </span>
                </motion.div>

                {unallocated < 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] font-medium px-1"
                    style={{ color: theme.accentExpense }}
                  >
                    {t('expenses.overallocatedHint')}
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ======================================================
          9. COPY PREVIOUS MONTH + SAVE
          ====================================================== */}
      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleCopyPrevious}
          className="flex-1 py-3.5 rounded-2xl font-semibold text-xs border flex items-center justify-center gap-2"
          style={{
            borderColor: copyState === 'empty' ? theme.accentExpense : copyState === 'copied' ? theme.accentIncome : theme.borderSubtle,
            color: copyState === 'empty' ? theme.accentExpense : copyState === 'copied' ? theme.accentIncome : theme.textSecondary,
            backgroundColor: theme.bgCard,
            boxShadow: theme.shadowSoft,
          }}
        >
          <Copy size={14} />
          {copyState === 'copied'
            ? `\u2713 ${t('expenses.copiedFromPreviousMonth')}`
            : copyState === 'empty'
              ? t('expenses.noPreviousMonthBudget')
              : t('expenses.copyPreviousMonth')}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          className="flex-[1.3] py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 text-white"
          style={{
            backgroundColor: saved ? theme.accentIncome : theme.accentInvestment,
            boxShadow: saved
              ? '0 4px 16px rgba(22, 163, 74, 0.3)'
              : '0 4px 16px rgba(124, 58, 237, 0.3)',
          }}
        >
          <Save size={15} />
          {saved ? `\u2713 ${t('expenses.budgetSaved')}` : t('expenses.saveBudget')}
        </motion.button>
      </div>
    </div>
  );
}
