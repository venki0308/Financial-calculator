import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Save, Copy, TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppColors } from '../../theme/useAppColors';

import type { Budget, FixedExpense } from '../../types/expense';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INVESTMENT_CATEGORIES,
} from '../../types/expense';

import {
  getBudgetForMonth, saveBudget, generateBudgetId,
  getEntriesForMonth,
} from '../../utils/expenseStorage';
import {
  getMonthRange, fmtINR,
  getBudgetTotalFixed, getBudgetTotalCategoryLimits,
  getBudgetTotalInvestments, getBudgetUnallocated,
  getCategorySpentVsBudget,
} from '../../utils/expenseCalculations';

// ── pre-filled fixed expense templates ────────────────────────
const FIXED_TEMPLATES: { name: string; icon: string; category: string }[] = [
  { name: 'Rent',             icon: '\u{1F3E0}', category: 'rent_housing' },
  { name: 'Utilities',        icon: '\u{1F4A1}', category: 'utilities' },
  { name: 'Mobile & Internet', icon: '\u{1F4F1}', category: 'subscription' },
  { name: 'Insurance',        icon: '\u{1F6E1}', category: 'insurance' },
  { name: 'EMI',              icon: '\u{1F3E6}', category: 'emi_loan' },
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

const progressColor = (pct: number) => {
  if (pct >= 90) return { bar: 'bg-red-500', text: 'text-red-500' };
  if (pct >= 70) return { bar: 'bg-amber-500', text: 'text-amber-500' };
  return { bar: 'bg-emerald-500', text: 'text-emerald-500' };
};

export default function BudgetTab() {
  const { t } = useTranslation();
  const c = useAppColors();

  // ── month navigation ──────────────────────────────────────
  const [monthOffset, setMonthOffset] = useState(0);
  const range = useMemo(() => getMonthRange(monthOffset), [monthOffset]);

  // ── load / init budget ────────────────────────────────────
  const [budget, setBudget] = useState<Budget>(() => {
    return getBudgetForMonth(range.monthStr) ?? emptyBudget(range.monthStr);
  });

  // reload budget when month changes
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

  // ── saved feedback ────────────────────────────────────────
  const [saved, setSaved] = useState(false);

  // ── computed totals ───────────────────────────────────────
  const totalFixed = useMemo(() => getBudgetTotalFixed(budget), [budget]);
  const totalCategoryLimits = useMemo(() => getBudgetTotalCategoryLimits(budget), [budget]);
  const totalInvestments = useMemo(() => getBudgetTotalInvestments(budget), [budget]);
  const unallocated = useMemo(() => getBudgetUnallocated(budget), [budget]);
  const available = budget.monthlyIncome - totalFixed;

  // ── budget progress (entries for current month) ───────────
  const entries = useMemo(
    () => getEntriesForMonth(range.year, range.month),
    [range.year, range.month],
  );
  const categoryProgress = useMemo(
    () => getCategorySpentVsBudget(entries, budget),
    [entries, budget],
  );
  const activeProgress = categoryProgress.filter(cp => cp.budgeted > 0);

  // ── updaters ──────────────────────────────────────────────
  const setIncome = (v: number) =>
    setBudget(prev => ({ ...prev, monthlyIncome: v }));

  const setFixedAmount = (id: string, amount: number) =>
    setBudget(prev => ({
      ...prev,
      fixedExpenses: prev.fixedExpenses.map(f =>
        f.id === id ? { ...f, amount } : f
      ),
    }));

  const removeFixed = (id: string) =>
    setBudget(prev => ({
      ...prev,
      fixedExpenses: prev.fixedExpenses.filter(f => f.id !== id),
    }));

  const addCustomFixed = () => {
    if (!newFixedName.trim() || !newFixedAmount) return;
    const fe: FixedExpense = {
      id: `custom_${Date.now()}`,
      name: newFixedName.trim(),
      amount: Number(newFixedAmount),
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

  const setCategoryLimit = (categoryId: string, monthlyLimit: number) =>
    setBudget(prev => ({
      ...prev,
      categoryLimits: prev.categoryLimits.map(cl =>
        cl.categoryId === categoryId ? { ...cl, monthlyLimit } : cl
      ),
    }));

  const setInvestmentTarget = (categoryId: string, monthlyTarget: number) =>
    setBudget(prev => ({
      ...prev,
      investmentTargets: prev.investmentTargets.map(it =>
        it.categoryId === categoryId ? { ...it, monthlyTarget } : it
      ),
    }));

  // ── save ───────────────────────────────────────────────────
  const handleSave = () => {
    saveBudget({ ...budget, month: range.monthStr });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── copy previous month ───────────────────────────────────
  const handleCopyPrevious = () => {
    const prevRange = getMonthRange(monthOffset - 1);
    const prev = getBudgetForMonth(prevRange.monthStr);
    if (!prev) return;
    setBudget({
      ...prev,
      id: budget.id,
      month: range.monthStr,
      createdAt: budget.createdAt,
      updatedAt: new Date().toISOString(),
    });
  };

  // ── category lookup helper ────────────────────────────────
  const catInfo = (catId: string) => {
    const def = DEFAULT_EXPENSE_CATEGORIES.find(c => c.id === catId)
      ?? DEFAULT_INVESTMENT_CATEGORIES.find(c => c.id === catId);
    return { icon: def?.icon ?? '\u{1F4E6}', name: def?.name ?? catId, color: def?.color ?? '#94a3b8' };
  };

  // ── common card style ─────────────────────────────────────
  const cardCls = `rounded-2xl border`;

  return (
    <div className="space-y-4 pb-6">

      {/* ══════ MONTH SELECTOR ══════ */}
      <div
        className={`${cardCls} flex items-center justify-between px-4 py-3`}
        style={{ backgroundColor: c.card, borderColor: c.border }}
      >
        <button
          onClick={() => switchMonth(-1)}
          className="p-2 rounded-xl"
          style={{ color: c.textSecondary }}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-bold text-sm" style={{ color: c.text }}>
          {range.label}
        </span>
        <button
          onClick={() => switchMonth(1)}
          className="p-2 rounded-xl"
          style={{ color: c.textSecondary }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ══════ SECTION 1 — MONTHLY INCOME ══════ */}
      <div
        className={`${cardCls} p-4`}
        style={{ backgroundColor: c.card, borderColor: c.border }}
      >
        <label
          className="text-xs font-semibold uppercase tracking-wider mb-2 block"
          style={{ color: c.textSecondary }}
        >
          {'\u{1F4B0}'} {t('expenses.monthlyIncome')}
        </label>
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 border focus-within:ring-2 focus-within:ring-purple-500/40 transition-all"
          style={{ backgroundColor: c.inputBg, borderColor: c.border }}
        >
          <span className="text-brand-purple font-bold text-lg">{'\u20B9'}</span>
          <input
            type="number"
            inputMode="numeric"
            value={budget.monthlyIncome || ''}
            onChange={e => setIncome(Number(e.target.value))}
            placeholder="0"
            className="flex-1 bg-transparent text-lg font-bold outline-none"
            style={{ color: c.text }}
          />
        </div>
      </div>

      {/* ══════ SECTION 2 — FIXED EXPENSES ══════ */}
      <div
        className={`${cardCls} overflow-hidden`}
        style={{ backgroundColor: c.card, borderColor: c.border }}
      >
        <button
          onClick={() => setShowFixed(!showFixed)}
          className="w-full flex items-center justify-between p-4"
        >
          <div>
            <p className="font-bold text-sm text-left" style={{ color: c.text }}>
              {t('expenses.fixedExpenses')}
            </p>
            <p className="text-xs mt-0.5 text-left" style={{ color: c.textSecondary }}>
              {t('expenses.fixedExpensesSubtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-brand-purple font-bold text-sm">{fmtINR(totalFixed)}</span>
            {showFixed
              ? <ChevronUp size={16} style={{ color: c.textSecondary }} />
              : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
          </div>
        </button>

        <AnimatePresence>
          {showFixed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div
                className="px-4 pb-4 space-y-3 border-t pt-3"
                style={{ borderColor: c.border }}
              >
                {budget.fixedExpenses.map(fe => {
                  const template = FIXED_TEMPLATES.find(t => t.name === fe.name);
                  const icon = template?.icon ?? '\u{1F4CB}';
                  const isCustom = !template;
                  return (
                    <div key={fe.id} className="flex items-center gap-1.5">
                      <span className="text-xl w-8 text-center">{icon}</span>
                      <div className="flex-1">
                        <p className="text-xs font-medium mb-1" style={{ color: c.textSecondary }}>
                          {fe.name}
                        </p>
                        <div
                          className="flex items-center gap-1 rounded-lg px-3 py-2 border"
                          style={{ backgroundColor: c.inputBg, borderColor: c.border }}
                        >
                          <span className="text-sm" style={{ color: c.textSecondary }}>{'\u20B9'}</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={fe.amount || ''}
                            onChange={e => setFixedAmount(fe.id, Number(e.target.value))}
                            placeholder="0"
                            className="flex-1 bg-transparent text-sm font-semibold outline-none"
                            style={{ color: c.text }}
                          />
                        </div>
                      </div>
                      {isCustom && (
                        <button onClick={() => removeFixed(fe.id)} className="text-red-400 p-1">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Add custom fixed expense */}
                {showAddFixed ? (
                  <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: c.border }}>
                    <input
                      type="text"
                      value={newFixedName}
                      onChange={e => setNewFixedName(e.target.value)}
                      placeholder={t('expenses.customLabel')}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
                      style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={newFixedAmount}
                      onChange={e => setNewFixedAmount(e.target.value)}
                      placeholder={t('expenses.amount')}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
                      style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAddFixed(false)}
                        className="flex-1 py-2 rounded-lg text-sm font-medium"
                        style={{ backgroundColor: c.border, color: c.textSecondary }}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={addCustomFixed}
                        className="flex-1 py-2 rounded-lg bg-brand-purple text-white text-sm font-bold"
                      >
                        {t('common.confirm')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddFixed(true)}
                    className="flex items-center gap-2 text-brand-purple text-xs font-semibold pt-1"
                  >
                    <Plus size={14} /> {t('expenses.addOtherFixed')}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══════ SECTION 3 — CATEGORY SPENDING LIMITS ══════ */}
      <div
        className={`${cardCls} overflow-hidden`}
        style={{ backgroundColor: c.card, borderColor: c.border }}
      >
        <button
          onClick={() => setShowCategories(!showCategories)}
          className="w-full flex items-center justify-between p-4"
        >
          <div>
            <p className="font-bold text-sm text-left" style={{ color: c.text }}>
              {t('expenses.categoryBudgetLimits')}
            </p>
            <p className="text-xs mt-0.5 text-left" style={{ color: c.textSecondary }}>
              {t('expenses.categoryBudgetSubtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-brand-green font-bold text-sm">{fmtINR(totalCategoryLimits)}</span>
            {showCategories
              ? <ChevronUp size={16} style={{ color: c.textSecondary }} />
              : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
          </div>
        </button>

        <AnimatePresence>
          {showCategories && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4 border-t pt-4" style={{ borderColor: c.border }}>
                {/* helper text */}
                <p className="text-xs font-medium" style={{ color: c.textSecondary }}>
                  {t('expenses.available')}: {fmtINR(Math.max(available, 0))}
                </p>

                {budget.categoryLimits.map(cl => {
                  const info = catInfo(cl.categoryId);
                  return (
                    <div key={cl.categoryId} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl w-6 text-center">{info.icon}</span>
                          <p className="text-xs font-medium" style={{ color: c.textSecondary }}>
                            {info.name}
                          </p>
                        </div>
                        <div
                          className="rounded-lg px-2 py-1 flex items-center min-w-[80px] border"
                          style={{ backgroundColor: c.inputBg, borderColor: c.border }}
                        >
                          <span className="text-xs px-1" style={{ color: c.textSecondary }}>{'\u20B9'}</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={cl.monthlyLimit || ''}
                            onChange={e => setCategoryLimit(cl.categoryId, Number(e.target.value))}
                            placeholder="0"
                            className="w-full bg-transparent text-xs font-bold outline-none text-right"
                            style={{ color: c.text }}
                          />
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50000"
                        step="500"
                        value={cl.monthlyLimit}
                        onChange={e => setCategoryLimit(cl.categoryId, Number(e.target.value))}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-brand-purple"
                      />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══════ SECTION 4 — INVESTMENT TARGETS ══════ */}
      <div
        className={`${cardCls} overflow-hidden`}
        style={{ backgroundColor: c.card, borderColor: c.border }}
      >
        <button
          onClick={() => setShowInvestments(!showInvestments)}
          className="w-full flex items-center justify-between p-4"
        >
          <div>
            <p className="font-bold text-sm text-left" style={{ color: c.text }}>
              {'\u{1F4C8}'} {t('expenses.monthlyInvestTargets')}
            </p>
            <p className="text-xs mt-0.5 text-left" style={{ color: c.textSecondary }}>
              {t('expenses.investTargetsDesc')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-500 font-bold text-sm">{fmtINR(totalInvestments)}</span>
            {showInvestments
              ? <ChevronUp size={16} style={{ color: c.textSecondary }} />
              : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
          </div>
        </button>

        <AnimatePresence>
          {showInvestments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3 border-t pt-3" style={{ borderColor: c.border }}>
                {budget.investmentTargets.map(it => {
                  const info = catInfo(it.categoryId);
                  return (
                    <div key={it.categoryId} className="flex items-center gap-1.5">
                      <span className="text-xl w-8 text-center">{info.icon}</span>
                      <div className="flex-1">
                        <p className="text-xs font-medium mb-1" style={{ color: c.textSecondary }}>
                          {info.name}
                        </p>
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center gap-1 rounded-lg px-3 py-2 flex-1 border"
                            style={{ backgroundColor: c.inputBg, borderColor: c.border }}
                          >
                            <span className="text-sm" style={{ color: c.textSecondary }}>{'\u20B9'}</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={it.monthlyTarget || ''}
                              onChange={e => setInvestmentTarget(it.categoryId, Number(e.target.value))}
                              placeholder="0"
                              className="flex-1 bg-transparent text-sm font-semibold outline-none"
                              style={{ color: c.text }}
                            />
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100000"
                            step="500"
                            value={it.monthlyTarget}
                            onChange={e => setInvestmentTarget(it.categoryId, Number(e.target.value))}
                            className="w-20 h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Total investments */}
                <div
                  className="flex items-center justify-between pt-3 border-t"
                  style={{ borderColor: c.border }}
                >
                  <span className="text-xs font-semibold uppercase" style={{ color: c.textSecondary }}>
                    {t('expenses.total')}
                  </span>
                  <span className="text-sm font-bold text-blue-500">{fmtINR(totalInvestments)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══════ SECTION 5 — BUDGET SUMMARY ══════ */}
      <div
        className={`${cardCls} overflow-hidden`}
        style={{
          backgroundColor: c.card,
          borderColor: unallocated >= 0 ? '#22c55e40' : '#ef444440',
        }}
      >
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="w-full flex items-center justify-between p-4"
        >
          <p className="font-bold text-sm text-left" style={{ color: c.text }}>
            {t('expenses.monthlySummary')}
          </p>
          {showSummary
            ? <ChevronUp size={16} style={{ color: c.textSecondary }} />
            : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
        </button>

        <AnimatePresence>
          {showSummary && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2 border-t pt-3" style={{ borderColor: c.border }}>
                {[
                  { label: t('expenses.monthlyIncome'), value: budget.monthlyIncome, color: '#22c55e', sign: '' },
                  { label: t('expenses.fixedExpenses'), value: totalFixed, color: '#f87171', sign: '-' },
                  { label: t('expenses.investments'), value: totalInvestments, color: '#3b82f6', sign: '-' },
                  { label: t('expenses.categoryBudgetLimits'), value: totalCategoryLimits, color: '#f59e0b', sign: '-' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                      <span style={{ color: c.textSecondary }}>{row.label}</span>
                    </div>
                    <span className="font-bold ml-2" style={{ color: row.color }}>
                      {row.sign}{fmtINR(row.value)}
                    </span>
                  </div>
                ))}

                {/* Divider */}
                <div className="border-t my-1" style={{ borderColor: c.border }} />

                {/* Unallocated */}
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold" style={{ color: c.text }}>
                    {unallocated >= 0 ? t('expenses.estSavings') : t('expenses.overallocated')}
                  </span>
                  <span className={`font-bold ${unallocated >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {unallocated >= 0 ? '+' : ''}{fmtINR(unallocated)}
                  </span>
                </div>

                {unallocated < 0 && (
                  <p className="text-xs text-red-400 mt-1">
                    {t('expenses.overallocatedHint')}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══════ BUDGET PROGRESS (mid-month tracking) ══════ */}
      {activeProgress.length > 0 && (
        <div
          className={`${cardCls} overflow-hidden`}
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <button
            onClick={() => setShowProgress(!showProgress)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-purple" />
              <p className="font-bold text-sm text-left" style={{ color: c.text }}>
                {t('expenses.budgetProgress')}
              </p>
            </div>
            {showProgress
              ? <ChevronUp size={16} style={{ color: c.textSecondary }} />
              : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
          </button>

          <AnimatePresence>
            {showProgress && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4 border-t pt-3" style={{ borderColor: c.border }}>
                  {activeProgress.map(cp => {
                    const info = catInfo(cp.categoryId);
                    const pctClamped = Math.min(cp.pct, 100);
                    const colors = progressColor(cp.pct);
                    const left = Math.max(cp.budgeted - cp.spent, 0);
                    return (
                      <div key={cp.categoryId}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{info.icon}</span>
                            <span className="text-xs font-semibold" style={{ color: c.text }}>
                              {info.name}
                            </span>
                          </div>
                          <span className={`text-xs font-bold ${colors.text}`}>
                            {Math.round(cp.pct)}%
                          </span>
                        </div>

                        {/* Labels row */}
                        <div className="flex justify-between text-[10px] mb-1" style={{ color: c.textSecondary }}>
                          <span>Budget: {fmtINR(cp.budgeted)}</span>
                          <span>Spent: {fmtINR(cp.spent)}</span>
                          <span>Left: {fmtINR(left)}</span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: c.border }}>
                          <motion.div
                            className={`h-full rounded-full ${colors.bar}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pctClamped}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ══════ COPY PREVIOUS MONTH ══════ */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleCopyPrevious}
        className="w-full py-3 rounded-2xl font-semibold text-sm border flex items-center justify-center gap-2"
        style={{ borderColor: c.border, color: c.textSecondary, backgroundColor: c.card }}
      >
        <Copy size={16} />
        {t('expenses.copyPreviousMonth')}
      </motion.button>

      {/* ══════ SAVE BUTTON ══════ */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
          saved
            ? 'bg-brand-green text-white'
            : 'bg-brand-purple text-white shadow-lg shadow-brand-purple/30'
        }`}
      >
        <Save size={16} />
        {saved ? `\u2713 ${t('expenses.budgetSaved')}` : t('expenses.saveBudget')}
      </motion.button>
    </div>
  );
}
