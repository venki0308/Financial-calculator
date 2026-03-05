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
    { emoji: '☕', label: 'Coffee', amount: 50, categoryId: 'food' },
    { emoji: '🍱', label: 'Lunch', amount: 150, categoryId: 'food' },
    { emoji: '🚕', label: 'Transport', amount: 100, categoryId: 'transportation' },
    { emoji: '🛒', label: 'Groceries', amount: 500, categoryId: 'groceries' },
    { emoji: '🍕', label: 'Dinner', amount: 250, categoryId: 'food' },
    { emoji: '⛽', label: 'Petrol', amount: 500, categoryId: 'transportation' },
];

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function toDateInput(d: Date) {
    return d.toISOString().split('T')[0];
}

export default function DailyTab() {
    const { t } = useTranslation();
    const { entries, addEntry, deleteEntry, updateEntry, categoryBudgets, getEntriesByDate, getMonthlySpentByCategory } = useBudgetTrackerStore();

    const [selectedDate, setSelectedDate] = useState(toDateInput(new Date()));
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Add form state
    const [fCategory, setFCategory] = useState('food');
    const [fAmount, setFAmount] = useState('');
    const [fDesc, setFDesc] = useState('');
    const [fPayment, setFPayment] = useState<PaymentMethod>('UPI');

    // Edit form state
    const [editAmount, setEditAmount] = useState('');
    const [editDesc, setEditDesc] = useState('');

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
        addEntry({
            categoryId: qa.categoryId,
            amount: qa.amount,
            description: t(`expenses.quickAdd.${qa.label.toLowerCase()}`),
            date: new Date().toISOString(),
        });
    };

    const handleSaveEntry = () => {
        if (!fAmount) return;
        addEntry({
            categoryId: fCategory,
            amount: parseFloat(fAmount),
            description: fDesc || t(`expenses.categories.${fCategory}`),
            date: new Date(`${selectedDate}T${new Date().toTimeString().slice(0, 8)}`).toISOString(),
            paymentMethod: fPayment,
        });
        setFCategory('food');
        setFAmount('');
        setFDesc('');
        setFPayment('UPI');
        setShowAddForm(false);
    };

    const startEdit = (id: string) => {
        const e = entries.find(e => e.id === id);
        if (!e) return;
        setEditingId(id);
        setEditAmount(e.amount.toString());
        setEditDesc(e.description);
    };

    const handleSaveEdit = () => {
        if (!editingId) return;
        updateEntry(editingId, { amount: parseFloat(editAmount), description: editDesc });
        setEditingId(null);
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
                onClick={() => setShowAddForm(true)}
                className="w-full bg-gradient-to-r from-brand-purple to-purple-700 hover:from-purple-700 hover:to-brand-purple text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/30"
            >
                <Plus size={20} /> {t('expenses.addNewExpense')}
            </motion.button>

            {/* Quick Add Shortcuts */}
            <div>
                <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">{t('expenses.quickAddLabel')}</p>
                <div className="grid grid-cols-3 gap-2">
                    {QUICK_ADD.map((qa) => (
                        <motion.button
                            key={qa.label}
                            whileTap={{ scale: 0.93 }}
                            onClick={() => handleQuickAdd(qa)}
                            className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center"
                        >
                            <span className="text-2xl">{qa.emoji}</span>
                            <span className="text-slate-700 dark:text-slate-200 text-xs font-semibold">{t(`expenses.quickAdd.${qa.label.toLowerCase()}`)}</span>
                            <span className="text-brand-purple text-xs font-bold">₹{qa.amount}</span>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center gap-2">
                <button onClick={() => shiftDate(-1)} className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <ChevronLeft size={18} className="text-slate-500" />
                </button>
                <input
                    type="date"
                    value={selectedDate}
                    max={toDateInput(new Date())}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white text-sm font-semibold outline-none"
                />
                <button onClick={() => shiftDate(1)} disabled={isToday} className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 disabled:opacity-30">
                    <ChevronRight size={18} className="text-slate-500" />
                </button>
            </div>

            {/* Today's Totals */}
            <div className="bg-gradient-to-r from-brand-purple/10 to-blue-600/10 border border-brand-purple/20 rounded-2xl p-4 flex justify-between items-center">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                        {isToday ? t('expenses.todaySpending') : t('expenses.selectedDaySpending')}
                    </p>
                    <p className="text-2xl font-extrabold text-brand-purple mt-0.5">₹{todayTotal.toLocaleString('en-IN')}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{dayEntries.length} {dayEntries.length === 1 ? t('expenses.transaction') : t('expenses.transactions')}</p>
                </div>
                <div className="text-4xl">💸</div>
            </div>

            {/* Expenses List */}
            <div>
                <h3 className="text-slate-900 dark:text-white font-bold text-sm mb-3">{t('expenses.expenses')}</h3>
                {dayEntries.length === 0 && (
                    <div className="text-center py-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                        <p className="text-4xl mb-2">🌿</p>
                        <p className="text-slate-400 text-sm">{t('expenses.noExpensesDay')}</p>
                        <button onClick={() => setShowAddForm(true)} className="mt-3 text-brand-purple text-xs font-semibold">+ {t('expenses.addExpense')}</button>
                    </div>
                )}
                <div className="space-y-2">
                    {dayEntries.map((exp) => {
                        const cat = EXPENSE_CATEGORIES.find((c) => c.id === exp.categoryId);
                        return (
                            <div key={exp.id} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-3">
                                {editingId === exp.id ? (
                                    <div className="space-y-2">
                                        <input
                                            type="number"
                                            value={editAmount}
                                            onChange={(e) => setEditAmount(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-sm outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={editDesc}
                                            onChange={(e) => setEditDesc(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-sm outline-none"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingId(null)} className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 text-sm">
                                                <X size={14} className="inline mr-1" />{t('common.cancel')}
                                            </button>
                                            <button onClick={handleSaveEdit} className="flex-1 py-2 rounded-lg bg-brand-green text-white text-sm font-bold">
                                                <Check size={14} className="inline mr-1" />{t('common.save')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center text-xl flex-shrink-0">
                                            {cat?.icon || '📌'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-slate-800 dark:text-white text-sm font-semibold truncate">{exp.description}</p>
                                            <p className="text-slate-400 text-[10px]">
                                                {t(`expenses.categories.${cat?.id || 'others'}`)} · {formatDate(exp.date)}
                                                {exp.paymentMethod && (
                                                    <span className="ml-1 px-1.5 py-0.5 bg-brand-purple/10 text-brand-purple rounded text-[9px] font-bold">{t(`expenses.paymentMethods.${exp.paymentMethod}`)}</span>
                                                )}
                                            </p>
                                        </div>
                                        <p className="text-red-400 font-bold text-sm mr-2">-₹{exp.amount.toLocaleString('en-IN')}</p>
                                        <button onClick={() => startEdit(exp.id)} className="text-slate-400 hover:text-brand-purple p-1">
                                            <Edit3 size={14} />
                                        </button>
                                        <button onClick={() => deleteEntry(exp.id)} className="text-slate-400 hover:text-red-400 p-1">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
                        onClick={() => setShowAddForm(false)}
                    >
                        <motion.div
                            initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="w-full max-w-md bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6 pb-10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />
                            <h3 className="text-white font-bold text-lg mb-4">{t('expenses.addExpenseTitle')}</h3>
                            <div className="space-y-3">
                                {/* Category */}
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{t('expenses.category')}</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {EXPENSE_CATEGORIES.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setFCategory(cat.id)}
                                                className={`p-2 rounded-xl text-center text-xs font-medium transition-all ${fCategory === cat.id ? 'bg-brand-purple text-white' : 'bg-slate-800 text-slate-300'}`}
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
                                    <label className="text-slate-400 text-xs mb-1 block">{t('expenses.amountLabel')} *</label>
                                    <input
                                        type="number"
                                        value={fAmount}
                                        onChange={(e) => setFAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-lg font-bold focus:outline-none focus:border-brand-purple"
                                        autoFocus
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{t('expenses.descriptionLabel')}</label>
                                    <input
                                        type="text"
                                        value={fDesc}
                                        onChange={(e) => setFDesc(e.target.value)}
                                        placeholder={t('expenses.descriptionPlaceholder')}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-purple"
                                    />
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className="text-slate-400 text-xs mb-2 flex items-center gap-1.5 block">
                                        <CreditCard size={12} /> {t('expenses.paymentMethodLabel')}
                                    </label>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {PAYMENT_METHODS.map((pm) => (
                                            <button
                                                key={pm.id}
                                                onClick={() => setFPayment(pm.id)}
                                                className={`p-2 rounded-xl text-center transition-all ${fPayment === pm.id
                                                    ? 'bg-brand-purple text-white'
                                                    : 'bg-slate-800 text-slate-300'
                                                    }`}
                                            >
                                                <span className="text-base block">{pm.icon}</span>
                                                <span className="text-[9px] font-semibold leading-tight block mt-0.5">{t(`expenses.paymentMethods.${pm.id}`).split(' ')[0]}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-5">
                                <button onClick={() => setShowAddForm(false)} className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium text-sm">{t('common.cancel')}</button>
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleSaveEntry}
                                    disabled={!fAmount}
                                    className="flex-1 py-3 rounded-xl bg-brand-purple text-white font-bold text-sm disabled:opacity-40"
                                >
                                    {t('expenses.saveExpense')}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
