import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, Calendar, CreditCard, CheckCircle2,
    AlertTriangle, ShieldAlert, Bell, X, TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBudgetTrackerStore, Subscription, EXPENSE_CATEGORIES } from '../../store/useBudgetTrackerStore';
import { getCategoryDisplayName } from '../../utils/categoryUtils';
import BottomSheet from '../../components/BottomSheet';
import DateInput from '../../components/DateInput';
import { todayStr } from '../../utils/dateUtils';
// Bridge to expenseStorage: the actual monthly income lives in the Budget
// object saved per month by BudgetTab. useBudgetTrackerStore.monthlyIncome
// is a legacy field that most users never populate, so the subscription
// risk % was hard-coded to "over 100% of income" for everyone.
import { getBudgetForMonth } from '../../utils/expenseStorage';
import { getMonthRange } from '../../utils/expenseCalculations';

// ── Constants ─────────────────────────────────────────────────────────────
const COLOR_TAGS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#10b981', // Green
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
];

const QUICK_ADD_SUGGESTIONS = [
    { name: 'Netflix', amount: 499, color: '#ef4444', category: 'entertainment' },
    { name: 'Spotify', amount: 119, color: '#10b981', category: 'entertainment' },
    { name: 'Amazon Prime', amount: 299, color: '#06b6d4', category: 'entertainment' },
    { name: 'YouTube Premium', amount: 129, color: '#ef4444', category: 'entertainment' },
    { name: 'Gym Membership', amount: 1500, color: '#f59e0b', category: 'healthcare' },
    { name: 'Hotstar', amount: 299, color: '#3b82f6', category: 'entertainment' },
    { name: 'Swiggy One', amount: 399, color: '#f97316', category: 'food' },
    { name: 'ChatGPT Plus', amount: 1650, color: '#8b5cf6', category: 'education' },
];

const BILLING_CYCLES = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
] as const;

type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

const EMPTY_FORM: Partial<Subscription> = {
    name: '',
    amount: 0,
    billingCycle: 'monthly',
    nextDueDate: todayStr(),
    category: 'entertainment',
    colorTag: COLOR_TAGS[5],
    isActive: true,
};

// ── Helpers ───────────────────────────────────────────────────────────────
function toMonthlyEquivalent(amount: number, cycle: BillingCycle): number {
    if (cycle === 'monthly') return amount;
    if (cycle === 'quarterly') return amount / 3;
    return amount / 12;
}

function getDaysUntil(dateStr: string): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
}

function getDaysIndicator(dateStr: string) {
    const d = getDaysUntil(dateStr);
    if (d < 0) return { text: `Overdue by ${Math.abs(d)}d`, color: 'text-red-500 bg-red-50 dark:bg-red-500/10' };
    if (d === 0) return { text: 'Due Today', color: 'text-red-500 bg-red-50 dark:bg-red-500/10' };
    if (d <= 3) return { text: `Due in ${d}d`, color: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10' };
    if (d <= 7) return { text: `Due in ${d}d`, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' };
    return { text: `Due in ${d}d`, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' };
}

// ── Component ─────────────────────────────────────────────────────────────
export default function SubscriptionsTab() {
    const { t } = useTranslation();
    const {
        subscriptions, addSubscription, updateSubscription, deleteSubscription, monthlyIncome: legacyMonthlyIncome,
    } = useBudgetTrackerStore();

    // Effective monthly income: prefer the current month's Budget in
    // expenseStorage (which BudgetTab writes). Fall back to the legacy
    // field in useBudgetTrackerStore only when no budget is set yet. This
    // fixes the "100% of income" false alarm that appeared for every new
    // user who hadn't populated the legacy store but had set up their
    // BudgetTab monthly income.
    const monthlyIncome = useMemo(() => {
        const currentMonth = getMonthRange(0);
        const budget = getBudgetForMonth(currentMonth.monthStr);
        if (budget && budget.monthlyIncome > 0) return budget.monthlyIncome;
        return legacyMonthlyIncome;
    }, [legacyMonthlyIncome, subscriptions]);

    // ── UI State ─────────────────────────────────────────────────────────
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Subscription>>(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState<{ name?: string; amount?: string }>({});
    const [riskDismissed, setRiskDismissed] = useState(false);
    const [reminderDismissed, setReminderDismissed] = useState(false);

    // ── Derived Data (useMemo'd) ──────────────────────────────────────────
    const sortedSubs = useMemo(
        () => [...subscriptions].sort((a, b) => getDaysUntil(a.nextDueDate) - getDaysUntil(b.nextDueDate)),
        [subscriptions],
    );

    const { totalMonthly, totalYearly, riskPct } = useMemo(() => {
        const active = subscriptions.filter(s => s.isActive);
        const monthly = active.reduce((sum, s) => sum + toMonthlyEquivalent(s.amount, s.billingCycle as BillingCycle), 0);
        return {
            totalMonthly: monthly,
            totalYearly: monthly * 12,
            riskPct: monthlyIncome > 0 ? monthly / monthlyIncome : 0,
        };
    }, [subscriptions, monthlyIncome]);

    const renewalsSoon = useMemo(
        () => subscriptions.filter(s => s.isActive && getDaysUntil(s.nextDueDate) >= 0 && getDaysUntil(s.nextDueDate) <= 3),
        [subscriptions],
    );

    // ── Handlers ──────────────────────────────────────────────────────────
    const openAddForm = (prefill?: Partial<Subscription>) => {
        setEditingId(null);
        setFormData({ ...EMPTY_FORM, ...prefill });
        setFormErrors({});
        setIsFormOpen(true);
    };

    const openEditForm = (sub: Subscription) => {
        setEditingId(sub.id);
        setFormData({ ...sub });
        setFormErrors({});
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingId(null);
    };

    const validate = (): boolean => {
        const errs: typeof formErrors = {};
        if (!formData.name?.trim()) errs.name = t('expenses.nameRequired');
        if (!formData.amount || formData.amount <= 0) errs.amount = t('expenses.validAmount');
        else if (formData.amount > 10_00_00_000) errs.amount = t('expenses.amountTooHigh', 'Maximum ₹10 Crore');
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;

        const sub: Subscription = {
            id: editingId || Date.now().toString(),
            name: formData.name!.trim(),
            amount: Number(formData.amount),
            billingCycle: (formData.billingCycle || 'monthly') as BillingCycle,
            nextDueDate: formData.nextDueDate || todayStr(),
            category: formData.category || 'entertainment',
            colorTag: formData.colorTag || COLOR_TAGS[5],
            isActive: formData.isActive ?? true,
        };

        if (editingId) {
            updateSubscription(editingId, sub);
        } else {
            const { id: _id, ...newSub } = sub;
            addSubscription(newSub);
        }
        closeForm();
    };

    const handleDelete = () => {
        if (editingId) {
            deleteSubscription(editingId);
            closeForm();
        }
    };

    // Quick-add: opens pre-filled form (not direct add) to let user verify
    const handleQuickAdd = (s: typeof QUICK_ADD_SUGGESTIONS[0]) => {
        openAddForm({ name: s.name, amount: s.amount, colorTag: s.color, category: s.category });
    };

    const updateField = (patch: Partial<Subscription>) => {
        setFormData(prev => ({ ...prev, ...patch }));
        // Clear relevant errors on change
        if ('name' in patch && formErrors.name) setFormErrors(e => ({ ...e, name: undefined }));
        if ('amount' in patch && formErrors.amount) setFormErrors(e => ({ ...e, amount: undefined }));
    };

    // ── Risk level ────────────────────────────────────────────────────────
    const riskLevel = riskPct > 0.15 ? 'high' : riskPct > 0.10 ? 'medium' : 'none';

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4 pb-28">

            {/* ── Reminder Banner (due in ≤3 days) ─────────────────────── */}
            <AnimatePresence>
                {!reminderDismissed && renewalsSoon.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl px-4 py-3"
                    >
                        <Bell size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-amber-800 dark:text-amber-300 font-bold text-sm">
                                {renewalsSoon.length} renewal{renewalsSoon.length > 1 ? 's' : ''} due within 3 days
                            </p>
                            <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
                                {renewalsSoon.map(s => s.name).join(', ')}
                            </p>
                        </div>
                        <button onClick={() => setReminderDismissed(true)} className="text-amber-400 hover:text-amber-600 flex-shrink-0">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Header Summary Card ───────────────────────────────────── */}
            <div className="bg-gradient-to-br from-brand-purple via-purple-600 to-indigo-600 rounded-3xl p-5 text-white shadow-xl shadow-brand-purple/25">
                <div className="flex items-center gap-2 mb-1 text-purple-200">
                    <CreditCard size={16} />
                    <span className="font-semibold text-xs uppercase tracking-wider">{t('expenses.monthlyCommitment')}</span>
                    {renewalsSoon.length > 0 && (
                        <span className="ml-auto text-[10px] font-bold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">
                            ⚠️ {renewalsSoon.length} due soon
                        </span>
                    )}
                </div>
                <h2 className="text-4xl font-extrabold tracking-tight">
                    ₹{Math.round(totalMonthly).toLocaleString('en-IN')}
                    <span className="text-base font-medium text-purple-200 ml-1">/mo</span>
                </h2>

                {/* 3-col Impact Breakdown */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="bg-white/10 rounded-2xl p-3 text-center">
                        <p className="text-purple-200 text-[10px] font-bold uppercase tracking-wider">{t('expenses.yearly')}</p>
                        <p className="text-foreground font-bold text-sm mt-0.5">
                            ₹{Math.round(totalYearly).toLocaleString('en-IN')}
                        </p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-3 text-center">
                        <p className="text-purple-200 text-[10px] font-bold uppercase tracking-wider">{t('expenses.active')}</p>
                        <p className="text-foreground font-bold text-sm mt-0.5">
                            {subscriptions.filter(s => s.isActive).length}
                        </p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-3 text-center">
                        <p className="text-purple-200 text-[10px] font-bold uppercase tracking-wider">{t('expenses.pctIncome')}</p>
                        <p className={`font-bold text-sm mt-0.5 ${riskPct > 0.10 ? 'text-red-300' : 'text-green-300'}`}>
                            {monthlyIncome > 0 ? `${(riskPct * 100).toFixed(1)}%` : '—'}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Risk Insight Banner ───────────────────────────────────── */}
            <AnimatePresence>
                {!riskDismissed && riskLevel !== 'none' && monthlyIncome > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className={`flex items-start gap-3 rounded-2xl px-4 py-3 border ${
                            riskLevel === 'high'
                                ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
                                : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
                        }`}
                    >
                        {riskLevel === 'high'
                            ? <ShieldAlert size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                            : <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        }
                        <div className="flex-1 min-w-0">
                            <p className={`font-bold text-sm ${riskLevel === 'high' ? 'text-red-700 dark:text-red-400' : 'text-amber-800 dark:text-amber-300'}`}>
                                {riskLevel === 'high'
                                    ? `🔴 High Risk — ${(riskPct * 100).toFixed(1)}% of income in subscriptions`
                                    : `🟡 Watch Out — Over 10% of income in subscriptions`
                                }
                            </p>
                            <p className={`text-xs mt-0.5 ${riskLevel === 'high' ? 'text-red-600 dark:text-red-400/80' : 'text-amber-700 dark:text-amber-400/80'}`}>
                                {riskLevel === 'high'
                                    ? 'Consider pausing unused services to free up cash flow.'
                                    : 'Review which subscriptions you actually use each month.'}
                            </p>
                        </div>
                        <button onClick={() => setRiskDismissed(true)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Empty State ───────────────────────────────────────────── */}
            {subscriptions.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                >
                    <div className="text-center py-8 px-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-brand-purple/10 to-indigo-500/10 border border-brand-purple/20 rounded-3xl flex items-center justify-center mx-auto mb-4 text-4xl">
                            📱
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-foreground text-lg mb-1">
                            {t('expenses.noSubscriptions')}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-5">
                            {t('expenses.trackCharges')}
                        </p>
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => openAddForm()}
                            className="inline-flex items-center gap-2 bg-brand-purple text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-brand-purple/25"
                        >
                            <Plus size={18} />
                            {t('expenses.addSubscription')}
                        </motion.button>
                    </div>

                    {/* Quick Add Chips */}
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                            {t('expenses.quickAddPopular')}
                        </p>
                        <div className="flex overflow-x-auto gap-2.5 pb-2 scrollbar-hide">
                            {QUICK_ADD_SUGGESTIONS.map(s => (
                                <motion.button
                                    key={s.name}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleQuickAdd(s)}
                                    className="flex-shrink-0 flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5"
                                >
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                    <span className="font-bold text-sm text-slate-800 dark:text-foreground whitespace-nowrap">{s.name}</span>
                                    <span className="text-muted-foreground text-xs font-semibold">₹{s.amount}</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── Subscription List ─────────────────────────────────────── */}
            {subscriptions.length > 0 && (
                <>
                    {/* Quick Add Chips (shown above list when subs exist too) */}
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                            Quick Add
                        </p>
                        <div className="flex overflow-x-auto gap-2.5 pb-1 scrollbar-hide">
                            {QUICK_ADD_SUGGESTIONS.map(s => (
                                <motion.button
                                    key={s.name}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleQuickAdd(s)}
                                    className="flex-shrink-0 flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2"
                                >
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                    <span className="font-bold text-xs text-slate-800 dark:text-foreground whitespace-nowrap">{s.name}</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {sortedSubs.map(sub => {
                            const indicator = getDaysIndicator(sub.nextDueDate);
                            const cat = EXPENSE_CATEGORIES.find(c => c.id === sub.category);
                            const monthlyEq = toMonthlyEquivalent(sub.amount, sub.billingCycle as BillingCycle);

                            return (
                                <motion.div
                                    key={sub.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    whileTap={{ scale: 0.985 }}
                                    onClick={() => openEditForm(sub)}
                                    className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-4 cursor-pointer relative overflow-hidden"
                                >
                                    {/* Left color accent */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl" style={{ backgroundColor: sub.colorTag }} />

                                    {/* Icon */}
                                    <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-card flex items-center justify-center text-xl flex-shrink-0 ml-1">
                                        {cat?.icon || '📅'}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-900 dark:text-foreground text-sm truncate">{sub.name}</h3>
                                            {!sub.isActive && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-muted-foreground flex-shrink-0">
                                                    Paused
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${indicator.color}`}>
                                                {indicator.text}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground capitalize">
                                                · {sub.billingCycle}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-extrabold text-slate-900 dark:text-foreground text-base leading-none">
                                            ₹{sub.amount.toLocaleString('en-IN')}
                                        </p>
                                        {sub.billingCycle !== 'monthly' && (
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                ≈₹{Math.round(monthlyEq).toLocaleString('en-IN')}/mo
                                            </p>
                                        )}
                                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                                            /{sub.billingCycle === 'monthly' ? 'mo' : sub.billingCycle === 'quarterly' ? 'qtr' : 'yr'}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Yearly projection footer */}
                    {totalMonthly > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3"
                        >
                            <TrendingUp size={16} className="text-brand-purple flex-shrink-0" />
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                You'll spend{' '}
                                <span className="font-bold text-slate-900 dark:text-foreground">
                                    ₹{Math.round(totalYearly).toLocaleString('en-IN')}
                                </span>{' '}
                                on subscriptions this year.
                            </p>
                        </motion.div>
                    )}
                </>
            )}

            {/* ── FAB ──────────────────────────────────────────────────── */}
            <motion.button
                aria-label="Add Subscription"
                whileTap={{ scale: 0.88 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => openAddForm()}
                className="fixed right-5 w-14 h-14 bg-brand-purple text-white rounded-2xl flex items-center justify-center shadow-xl shadow-brand-purple/35 z-40 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)]"
            >
                <Plus size={26} strokeWidth={2.5} />
            </motion.button>

            {/* ── Add/Edit Bottom Sheet Form ────────────────────────────── */}
            <BottomSheet
                isOpen={isFormOpen}
                onClose={closeForm}
                title={editingId ? t('expenses.editSubscription') : t('expenses.newSubscription')}
                footer={
                    <div className="space-y-2">
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSave}
                            className="w-full py-4 rounded-xl bg-brand-purple text-white font-bold text-base shadow-lg shadow-brand-purple/20"
                        >
                            {editingId ? t('expenses.saveChanges') : t('expenses.addSubscription')}
                        </motion.button>
                        {editingId && (
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleDelete}
                                className="w-full py-3 rounded-xl border border-red-200 dark:border-red-500/30 text-red-500 font-semibold text-sm flex items-center justify-center gap-2"
                            >
                                <Trash2 size={15} />
                                {t('expenses.deleteSubscription')}
                            </motion.button>
                        )}
                    </div>
                }
            >
                <div className="space-y-4 pb-2">

                    {/* Name */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground">{t('expenses.nameReq')}</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={e => updateField({ name: e.target.value })}
                            placeholder={t('expenses.subNameHint')}
                            autoFocus
                            className={`w-full bg-slate-50 dark:bg-card rounded-xl px-4 py-3.5 text-slate-900 dark:text-foreground font-bold outline-none focus:ring-2 focus:ring-brand-purple border ${formErrors.name ? 'border-red-400 focus:ring-red-400' : 'border-transparent'}`}
                        />
                        {formErrors.name && (
                            <p className="text-xs text-red-500 ml-1">{formErrors.name}</p>
                        )}
                    </div>

                    {/* Amount + Billing Cycle */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground">{t('expenses.amountReq')}</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">₹</span>
                                <input
                                    type="number"
                                    value={formData.amount || ''}
                                    onChange={e => updateField({ amount: Number(e.target.value) })}
                                    placeholder="0"
                                    className={`w-full pl-8 pr-3 bg-slate-50 dark:bg-card rounded-xl py-3.5 text-slate-900 dark:text-foreground font-bold outline-none focus:ring-2 focus:ring-brand-purple border ${formErrors.amount ? 'border-red-400 focus:ring-red-400' : 'border-transparent'}`}
                                />
                            </div>
                            {formErrors.amount && (
                                <p className="text-xs text-red-500 ml-1">{formErrors.amount}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground">{t('expenses.billingCycle')}</label>
                            <select
                                value={formData.billingCycle || 'monthly'}
                                onChange={e => updateField({ billingCycle: e.target.value as BillingCycle })}
                                className="w-full bg-slate-50 dark:bg-card border-transparent border rounded-xl px-4 py-3.5 text-slate-900 dark:text-foreground font-bold outline-none focus:ring-2 focus:ring-brand-purple appearance-none cursor-pointer"
                            >
                                {BILLING_CYCLES.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Monthly equivalent hint */}
                    {formData.billingCycle !== 'monthly' && Number(formData.amount) > 0 && (
                        <p className="text-xs text-muted-foreground ml-1">
                            ≈ ₹{Math.round(toMonthlyEquivalent(Number(formData.amount), formData.billingCycle as BillingCycle)).toLocaleString('en-IN')}/mo equivalent
                        </p>
                    )}

                    {/* Next Due Date */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground">{t('expenses.nextDueDate')}</label>
                        <div className="relative">
                            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <DateInput
                                value={formData.nextDueDate || ''}
                                onChange={v => updateField({ nextDueDate: v })}
                                className="w-full bg-slate-50 dark:bg-card border-transparent border rounded-xl pl-10 pr-4 py-3.5 text-slate-900 dark:text-foreground font-bold outline-none focus:ring-2 focus:ring-brand-purple"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground">{t('expenses.category')}</label>
                        <select
                            value={formData.category || 'entertainment'}
                            onChange={e => updateField({ category: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-card border-transparent border rounded-xl px-4 py-3.5 text-slate-900 dark:text-foreground font-bold outline-none focus:ring-2 focus:ring-brand-purple appearance-none cursor-pointer"
                        >
                            {EXPENSE_CATEGORIES.map(c => (
                                <option key={c.id} value={c.id}>{c.icon} {getCategoryDisplayName(c.id)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Color Tag + Active */}
                    <div className="flex items-center justify-between pt-1">
                        <div className="flex gap-2 flex-wrap">
                            {COLOR_TAGS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => updateField({ colorTag: color })}
                                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-transform ${formData.colorTag === color ? 'border-brand-purple scale-115' : 'border-transparent'}`}
                                    style={{ backgroundColor: color }}
                                >
                                    {formData.colorTag === color && <CheckCircle2 size={13} className="text-white drop-shadow" />}
                                </button>
                            ))}
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div
                                onClick={() => updateField({ isActive: !formData.isActive })}
                                className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${formData.isActive ? 'bg-brand-purple' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <motion.div
                                    animate={{ x: formData.isActive ? 20 : 0 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    className="w-5 h-5 bg-white rounded-full shadow"
                                />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground">{t('expenses.active')}</span>
                        </label>
                    </div>

                </div>
            </BottomSheet>
        </div>
    );
}
