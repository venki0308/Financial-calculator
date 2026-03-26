import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit3, Check, X, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBudgetTrackerStore, EXPENSE_CATEGORIES, type PaymentMethod } from '../../store/useBudgetTrackerStore';

const PAYMENT_METHODS: { id: PaymentMethod; icon: string }[] = [
    { id: 'Cash', icon: '💵' },
    { id: 'UPI', icon: '📲' },
    { id: 'Debit Card', icon: '💳' },
    { id: 'Credit Card', icon: '💳' },
];

const QUICK_ADD = [
    { emoji: '☕', label: 'Coffee', amount: 50, category: 'food' },
    { emoji: '🍱', label: 'Lunch', amount: 150, category: 'food' },
    { emoji: '🚕', label: 'Transport', amount: 100, category: 'transportation' },
    { emoji: '🛒', label: 'Groceries', amount: 500, category: 'groceries' },
    { emoji: '🍕', label: 'Dinner', amount: 250, category: 'food' },
    { emoji: '⛽', label: 'Petrol', amount: 500, category: 'transportation' },
];

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function toDateInput(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export default function DailyTab() {
    const { t } = useTranslation();
    const { entries, addEntry, deleteEntry, updateEntry, categoryBudgets, getEntriesByDate, getMonthlySpentByCategory } = useBudgetTrackerStore();

    const [selectedDate, setSelectedDate] = useState(toDateInput(new Date()));
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [initialFormState, setInitialFormState] = useState<{ category: string, amount: string, desc: string, payment: PaymentMethod } | null>(null);

    const [quickAdds, setQuickAdds] = useState<typeof QUICK_ADD>(() => {
        const saved = localStorage.getItem('fincalix_quick_adds');
        return saved ? JSON.parse(saved) : QUICK_ADD;
    });

    const [editingQA, setEditingQA] = useState<number | null>(null);
    const [qaLabel, setQaLabel] = useState('');
    const [qaAmount, setQaAmount] = useState('');
    const [qaEmoji, setQaEmoji] = useState('');

    // Add form state
    const [fCategory, setFCategory] = useState('food');
    const [fAmount, setFAmount] = useState('');
    const [fDesc, setFDesc] = useState('');
    const [fPayment, setFPayment] = useState<PaymentMethod>('UPI');

    const isDirty = initialFormState ? (
        fCategory !== initialFormState.category ||
        fAmount !== initialFormState.amount ||
        fDesc !== initialFormState.desc ||
        fPayment !== initialFormState.payment
    ) : false;

    const isValid = parseFloat(fAmount) > 0;

    const dayEntries = useMemo(
        () => getEntriesByDate(selectedDate).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [entries, selectedDate]
    );

    const todayTotal = dayEntries.reduce((s, e) => s + e.amount, 0);

    const selectedCatBudget = (categoryBudgets as unknown as Record<string, number>)[fCategory] || 0;
    const selectedCatSpent = getMonthlySpentByCategory(fCategory);
    const remaining = selectedCatBudget - selectedCatSpent - (parseFloat(fAmount) || 0);
    const overBudget = selectedCatBudget > 0 && remaining < 0;

    const handleQuickAdd = (qa: typeof QUICK_ADD[0]) => {
        setFCategory(qa.category);
        setFAmount(qa.amount.toString());
        setFDesc(t(`expenses.quickAdd.${qa.label.toLowerCase()}`));
        setInitialFormState({ category: '', amount: '', desc: '', payment: 'UPI' }); // Set blank initial state so it's dirty
        setShowAddForm(true);
    };

    const handleSaveEntry = () => {
        if (!fAmount) return;

        if (editingId) {
            updateEntry(editingId, {
                category: fCategory,
                amount: parseFloat(fAmount),
                description: fDesc || t(`expenses.categories.${fCategory}`),
                paymentMethod: fPayment,
            });
            setEditingId(null);
        } else {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];
            const localIso = `${selectedDate}T${timeStr}`;

            addEntry({
                category: fCategory,
                amount: parseFloat(fAmount),
                description: fDesc || t(`expenses.categories.${fCategory}`),
                date: localIso,
                paymentMethod: fPayment,
            });
        }
        setFCategory('food');
        setFAmount('');
        setFDesc('');
        setFPayment('UPI');
        setInitialFormState(null);
        setShowAddForm(false);
    };

    const openAddForm = () => {
        setFCategory('food');
        setFAmount('');
        setFDesc('');
        setFPayment('UPI');
        setInitialFormState({ category: 'food', amount: '', desc: '', payment: 'UPI' });
        setEditingId(null);
        setShowAddForm(true);
    };

    const startEdit = (id: string) => {
        const e = entries.find(e => e.id === id);
        if (!e) return;
        setEditingId(id);
        setFCategory(e.category);
        setFAmount(e.amount.toString());
        setFDesc(e.description);
        setFPayment(e.paymentMethod || 'UPI');
        setInitialFormState({ category: e.category, amount: e.amount.toString(), desc: e.description, payment: e.paymentMethod || 'UPI' });
        setShowAddForm(true);
    };

    const handleQuickAddPress = (e: React.MouseEvent | React.TouchEvent, index: number) => {
        e.preventDefault();
        const qa = quickAdds[index];
        setEditingQA(index);
        setQaLabel(qa.label);
        setQaAmount(qa.amount.toString());
        setQaEmoji(qa.emoji);
    };

    const saveQuickAdd = () => {
        if (editingQA === null || !qaLabel || !qaAmount || !qaEmoji) return;
        const newQAs = [...quickAdds];
        newQAs[editingQA] = { ...newQAs[editingQA], label: qaLabel, amount: parseFloat(qaAmount), emoji: qaEmoji };
        setQuickAdds(newQAs);
        localStorage.setItem('fincalix_quick_adds', JSON.stringify(newQAs));
        setEditingQA(null);
    };

    function shiftDate(days: number) {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        const today = new Date();
        if (d > today) return;
        setSelectedDate(toDateInput(d));
    }

    const isToday = selectedDate === toDateInput(new Date());

    return (
        <div className="space-y-4 pb-6">
            {/* Add Expense FAB */}
            <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={openAddForm}
                className="w-full bg-gradient-to-r from-brand-purple to-purple-700 hover:from-purple-700 hover:to-brand-purple text-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/30"
            >
                <Plus size={20} /> {t('expenses.addNewExpense')}
            </motion.button>

            {/* Quick Add Shortcuts */}
            <div>
                <p className="text-muted-foreground dark:text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2 flex justify-between">
                    {t('expenses.quickAddLabel')}
                    <span className="text-[9px] lowercase font-normal opacity-60">(long press to edit)</span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                    {quickAdds.map((qa, idx) => (
                        <motion.button
                            key={idx}
                            whileTap={{ scale: 0.93 }}
                            onClick={() => handleQuickAdd(qa)}
                            onContextMenu={(e) => handleQuickAddPress(e, idx)}
                            onTouchStart={(e) => {
                                const timer = setTimeout(() => handleQuickAddPress(e, idx), 600);
                                e.currentTarget.setAttribute('data-timer', timer.toString());
                            }}
                            onTouchEnd={(e) => {
                                const timer = e.currentTarget.getAttribute('data-timer');
                                if (timer) clearTimeout(Number(timer));
                            }}
                            className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center select-none"
                        >
                            <span className="text-2xl">{qa.emoji}</span>
                            <span className="text-slate-700 dark:text-slate-200 text-[11px] font-semibold">{qa.label}</span>
                            <span className="text-brand-purple text-xs font-bold">₹{qa.amount}</span>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Edit Quick Add Modal */}
            <AnimatePresence>
                {editingQA !== null && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60  z-[60] flex items-center justify-center p-4"
                        onClick={() => setEditingQA(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-sm bg-background border border-slate-700 rounded-3xl p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-foreground font-bold text-lg mb-4">Edit Quick Add</h3>
                            <div className="space-y-3 mb-6">
                                <div>
                                    <label className="text-muted-foreground text-xs mb-1 block">Label</label>
                                    <input type="text" value={qaLabel} onChange={(e) => setQaLabel(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-card border-border border border-slate-600 text-foreground text-sm focus:outline-none focus:border-brand-purple" />
                                </div>
                                <div>
                                    <label className="text-muted-foreground text-xs mb-1 block">Amount (₹)</label>
                                    <input type="number" value={qaAmount} onChange={(e) => setQaAmount(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-card border-border border border-slate-600 text-foreground text-sm focus:outline-none focus:border-brand-purple" />
                                </div>
                                <div>
                                    <label className="text-muted-foreground text-xs mb-1 block">Emoji</label>
                                    <input type="text" maxLength={2} value={qaEmoji} onChange={(e) => setQaEmoji(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-card border-border border border-slate-600 text-foreground text-sm focus:outline-none focus:border-brand-purple" />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setEditingQA(null)} className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium text-sm">{t('common.cancel')}</button>
                                <button onClick={saveQuickAdd} className="flex-1 py-3 rounded-xl bg-brand-purple text-white font-bold text-sm">Save</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Date Navigator */}
            <div className="flex items-center gap-2">
                <button onClick={() => shiftDate(-1)} className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <ChevronLeft size={18} className="text-muted-foreground" />
                </button>
                <div className="relative flex-1">
                    <input
                        type="date"
                        value={selectedDate}
                        max={toDateInput(new Date())}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-card border-border border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-foreground text-sm font-semibold outline-none"
                    />
                    {!isToday && <div className="absolute top-2 right-4 w-2 h-2 rounded-full border-2 border-white dark:border-slate-800 bg-brand-purple" />}
                </div>
                <button onClick={() => shiftDate(1)} disabled={isToday} className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 disabled:opacity-30">
                    <ChevronRight size={18} className="text-muted-foreground" />
                </button>
            </div>

            {/* Today's Totals */}
            <div className="bg-gradient-to-r from-brand-purple/10 to-blue-600/10 border border-brand-purple/20 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-muted-foreground dark:text-muted-foreground text-xs font-medium">
                            {isToday ? t('expenses.todaySpending') : t('expenses.selectedDaySpending')}
                        </p>
                        <p className="text-2xl font-extrabold text-brand-purple mt-0.5">₹{todayTotal.toLocaleString('en-IN')}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{dayEntries.length} {dayEntries.length === 1 ? t('expenses.transaction') : t('expenses.transactions')}</p>
                    </div>
                    <div className="text-4xl">💸</div>
                </div>
                {(() => {
                    const dailyBudget = Object.values(categoryBudgets as unknown as Record<string, number>).reduce((a, b) => a + b, 0) / 30;
                    const pct = dailyBudget > 0 ? Math.min(100, (todayTotal / dailyBudget) * 100) : 0;
                    return (
                        <div className="w-full bg-white/50 dark:bg-black/20 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${pct > 90 ? 'bg-red-400' : 'bg-brand-purple'}`} style={{ width: `${pct}%` }} />
                        </div>
                    );
                })()}
            </div>

            {/* Expenses List */}
            <div>
                <h3 className="text-slate-900 dark:text-foreground font-bold text-sm mb-3">{t('expenses.expenses')}</h3>
                {dayEntries.length === 0 && (
                    <div className="text-center py-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                        <p className="text-4xl mb-2">🌿</p>
                        <p className="text-muted-foreground text-sm">{t('expenses.noExpensesDay')}</p>
                        <button onClick={openAddForm} className="mt-3 text-brand-purple text-xs font-semibold">+ {t('expenses.addExpense')}</button>
                    </div>
                )}
                <div className="space-y-2">
                    {dayEntries.map((exp) => {
                        const cat = EXPENSE_CATEGORIES.find((c) => c.id === (exp.category || exp.categoryId));
                        return (
                            <div key={exp.id} className="relative rounded-2xl bg-red-500 overflow-hidden mb-2">
                                <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center text-foreground">
                                    <Trash2 size={20} />
                                </div>
                                <motion.div
                                    drag="x"
                                    dragConstraints={{ left: -80, right: 0 }}
                                    onDragEnd={(e, info) => { if (info.offset.x < -50) deleteEntry(exp.id); }}
                                    className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-3 flex items-center gap-3 relative z-10 cursor-pointer"
                                    onClick={() => startEdit(exp.id)}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center text-xl flex-shrink-0">
                                        {cat?.icon || '📌'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-800 dark:text-foreground text-sm font-semibold truncate">{exp.description}</p>
                                        <p className="text-muted-foreground text-[10px]">
                                            {t(`expenses.categories.${cat?.id || 'others'}`)} · {formatDate(exp.date)}
                                            {exp.paymentMethod && (
                                                <span className="ml-1 px-1.5 py-0.5 bg-brand-purple/10 text-brand-purple rounded text-[9px] font-bold">{t(`expenses.paymentMethods.${exp.paymentMethod}`)}</span>
                                            )}
                                        </p>
                                    </div>
                                    <p className="text-red-400 font-bold text-sm mr-1">-₹{exp.amount.toLocaleString('en-IN')}</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteEntry(exp.id); }}
                                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </motion.div>
                            </div>
                        );
                    })}
                </div>
            </div>



            {/* Add Expense Modal */}
            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 z-[10000] flex items-end justify-center"
                        onClick={() => setShowAddForm(false)}
                    >
                        <motion.div
                            initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="w-full max-w-md bg-background border-t border-slate-700 rounded-t-3xl flex flex-col"
                            style={{ maxHeight: '85dvh' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Drag handle + Title - HEADER */}
                            <div className="flex-shrink-0 px-6 pt-5 pb-2">
                                <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />
                                <h3 className="text-foreground font-bold text-lg mb-2">
                                    {editingId ? t('expenses.editExpenseTitle', 'Edit Expense') : t('expenses.addExpenseTitle')}
                                </h3>
                            </div>

                            {/* Scrollable form content */}
                            <div className="flex-1 overflow-y-auto px-6 pb-2">
                            <div className="space-y-3">
                                {/* Category */}
                                <div>
                                    <label className="text-muted-foreground text-xs mb-1 block">{t('expenses.category')}</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {EXPENSE_CATEGORIES.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setFCategory(cat.id)}
                                                className={`p-2 rounded-xl text-center text-xs font-medium transition-all ${fCategory === cat.id ? 'bg-brand-purple text-white' : 'bg-card border-border text-slate-300'}`}
                                            >
                                                {cat.icon}<br />{t(`expenses.categories.${cat.id}`).split(' ')[0]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Budget warning */}
                                {selectedCatBudget > 0 && (
                                    <div className={`p-3 rounded-xl text-xs font-medium ${overBudget ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                        {t('expenses.budget')}: ₹{selectedCatBudget.toLocaleString('en-IN')} · {t('expenses.spent')}: ₹{selectedCatSpent.toLocaleString('en-IN')} · {t('expenses.remaining')}: ₹{(selectedCatBudget - selectedCatSpent).toLocaleString('en-IN')}
                                        {overBudget && ` ⚠️ ${t('expenses.overBudget')}`}
                                    </div>
                                )}

                                {/* Amount */}
                                <div>
                                    <label className="text-muted-foreground text-xs mb-1 block">{t('expenses.amountLabel')} *</label>
                                    <input
                                        type="number"
                                        value={fAmount}
                                        onChange={(e) => setFAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-4 py-3 rounded-xl bg-card border-border border border-slate-600 text-foreground text-lg font-bold focus:outline-none focus:border-brand-purple"
                                        autoFocus
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-muted-foreground text-xs mb-1 block">{t('expenses.descriptionLabel')}</label>
                                    <input
                                        type="text"
                                        value={fDesc}
                                        onChange={(e) => setFDesc(e.target.value)}
                                        placeholder={t('expenses.descriptionPlaceholder')}
                                        className="w-full px-4 py-3 rounded-xl bg-card border-border border border-slate-600 text-foreground text-sm focus:outline-none focus:border-brand-purple"
                                    />
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className="text-muted-foreground text-xs mb-2 flex items-center gap-1.5 block">
                                        <CreditCard size={12} /> {t('expenses.paymentMethodLabel')}
                                    </label>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {PAYMENT_METHODS.map((pm) => (
                                            <button
                                                key={pm.id}
                                                onClick={() => setFPayment(pm.id)}
                                                className={`p-2 rounded-xl text-center transition-all ${fPayment === pm.id
                                                    ? 'bg-brand-purple text-white'
                                                    : 'bg-card border-border text-slate-300'
                                                    }`}
                                            >
                                                <span className="text-base block">{pm.icon}</span>
                                                <span className="text-[9px] font-semibold leading-tight block mt-0.5">{t(`expenses.paymentMethods.${pm.id}`).split(' ')[0]}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            </div>{/* end scrollable area */}

                            {/* Sticky action buttons - always visible */}
                            <div className="flex-shrink-0 px-6 pt-3 pb-4 border-t border-slate-700/60">
                                <div className="flex gap-3">
                                    <button onClick={() => setShowAddForm(false)} className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium text-sm transition-colors hover:bg-slate-600">{t('common.cancel')}</button>
                                    <motion.button
                                        whileTap={isDirty && isValid ? { scale: 0.97 } : {}}
                                        onClick={handleSaveEntry}
                                        disabled={!isDirty || !isValid}
                                        className="flex-1 py-3 rounded-xl bg-brand-purple text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                                    >
                                        {editingId ? 'Apply' : 'Save'}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
