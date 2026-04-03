import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Plus, Trash2, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBudgetTrackerStore, EXPENSE_CATEGORIES, INVESTMENT_TYPES, INCOME_CATEGORIES, type PaymentMethod, type EntryType, type InvestmentType } from '../../store/useBudgetTrackerStore';
import { getCategoryDisplayName } from '../../utils/categoryUtils';
import DateInput from '../../components/DateInput';

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

export default function DailyTab({ openOnMount }: { openOnMount?: boolean } = {}) {
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
    const [fEntryType, setFEntryType] = useState<EntryType>('expense');
    const [fInvestmentType, setFInvestmentType] = useState<InvestmentType>('mutual_funds');
    const [activeSubTab, setActiveSubTab] = useState<EntryType>('expense');

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

    const filteredEntries = useMemo(() => {
        return dayEntries.filter(e => {
            const type = e.entryType || 'expense';
            return type === activeSubTab;
        });
    }, [dayEntries, activeSubTab]);

    const todayTotal = dayEntries.filter(e => (e.entryType || 'expense') === 'expense').reduce((s, e) => s + e.amount, 0);
    const todayIncome = dayEntries.filter(e => e.entryType === 'income').reduce((s, e) => s + e.amount, 0);
    const todayInvestment = dayEntries.filter(e => e.entryType === 'investment').reduce((s, e) => s + e.amount, 0);

    const selectedCatBudget = (categoryBudgets as unknown as Record<string, number>)[fCategory] || 0;
    const selectedCatSpent = getMonthlySpentByCategory(fCategory);
    const remaining = selectedCatBudget - selectedCatSpent - (parseFloat(fAmount) || 0);
    const overBudget = selectedCatBudget > 0 && remaining < 0;

    const handleQuickAdd = (qa: typeof QUICK_ADD[0]) => {
        setFEntryType('expense');
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
                description: fDesc || getCategoryDisplayName(fCategory),
                paymentMethod: fPayment,
            });
            setEditingId(null);
        } else {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];
            const localIso = `${selectedDate}T${timeStr}`;

            addEntry({
                category: fEntryType === 'investment' ? (fInvestmentType || 'other_investment') : fCategory,
                amount: parseFloat(fAmount),
                description: fDesc || (fEntryType === 'investment' ? (INVESTMENT_TYPES.find(t => t.id === fInvestmentType)?.label || 'Investment') : fEntryType === 'income' ? 'Income' : getCategoryDisplayName(fCategory)),
                date: localIso,
                paymentMethod: fPayment,
                entryType: fEntryType,
                investmentType: fEntryType === 'investment' ? fInvestmentType : undefined,
            });
        }
        setFCategory('food');
        setFAmount('');
        setFDesc('');
        setFPayment('UPI');
        setFEntryType('expense');
        setFInvestmentType('mutual_funds');
        setInitialFormState(null);
        setShowAddForm(false);
    };

    const openAddForm = () => {
        setFCategory('food');
        setFAmount('');
        setFDesc('');
        setFPayment('UPI');
        setFEntryType('expense');
        setFInvestmentType('mutual_funds');
        setInitialFormState({ category: 'food', amount: '', desc: '', payment: 'UPI' });
        setEditingId(null);
        setShowAddForm(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (openOnMount) openAddForm(); }, [openOnMount]);

    const startEdit = (id: string) => {
        const e = entries.find(e => e.id === id);
        if (!e) return;
        setEditingId(id);
        setFEntryType(e.entryType || 'expense');
        setFCategory(e.category);
        setFAmount(e.amount.toString());
        setFDesc(e.description);
        setFPayment(e.paymentMethod || 'UPI');
        if (e.entryType === 'investment' && e.investmentType) setFInvestmentType(e.investmentType);
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

            {/* Sub-tab Switcher */}
            <div className="flex gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
                {([{ id: 'expense' as EntryType, label: '💸 Expenses', bg: 'bg-red-500' }, { id: 'income' as EntryType, label: '💰 Income', bg: 'bg-emerald-500' }, { id: 'investment' as EntryType, label: '📈 Investments', bg: 'bg-blue-500' }]).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                            activeSubTab === tab.id ? `${tab.bg} text-white shadow` : 'text-muted-foreground'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

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
            {createPortal(
            <AnimatePresence>
                {editingQA !== null && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60  z-[10000] flex items-center justify-center p-4"
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
                                <button onClick={() => setEditingQA(null)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm">{t('common.cancel')}</button>
                                <button onClick={saveQuickAdd} className="flex-1 py-3 rounded-xl bg-brand-purple text-white font-bold text-sm">Save</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>,
            document.body
            )}

            {/* Date Navigator */}
            <div className="flex items-center gap-2">
                <button onClick={() => shiftDate(-1)} className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <ChevronLeft size={18} className="text-muted-foreground" />
                </button>
                <div className="relative flex-1">
                    <DateInput
                        value={selectedDate}
                        onChange={setSelectedDate}
                        max={toDateInput(new Date())}
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
                    </div>
                    <div className="text-4xl">💸</div>
                </div>
                <div className="flex gap-2 text-[10px] font-semibold">
                    <span className="flex-1 text-center py-1.5 rounded-lg bg-red-500/10 text-red-400">Spent: ₹{todayTotal.toLocaleString('en-IN')}</span>
                    <span className={`flex-1 text-center py-1.5 rounded-lg ${todayIncome > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-100 dark:bg-white/5 text-muted-foreground'}`}>Earned: ₹{todayIncome.toLocaleString('en-IN')}</span>
                    <span className={`flex-1 text-center py-1.5 rounded-lg ${todayInvestment > 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-100 dark:bg-white/5 text-muted-foreground'}`}>Invested: ₹{todayInvestment.toLocaleString('en-IN')}</span>
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

            {/* Entries List */}
            <div>
                <h3 className="text-slate-900 dark:text-foreground font-bold text-sm mb-3">
                    {activeSubTab === 'expense' ? t('expenses.expenses') : activeSubTab === 'income' ? 'Income' : 'Investments'}
                </h3>
                {filteredEntries.length === 0 && (
                    <div className="text-center py-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                        <p className="text-4xl mb-2">{activeSubTab === 'expense' ? '🌿' : activeSubTab === 'income' ? '💰' : '📈'}</p>
                        <p className="text-muted-foreground text-sm">
                            {activeSubTab === 'expense' ? t('expenses.noExpensesDay') : activeSubTab === 'income' ? 'No income recorded today' : 'No investments recorded today'}
                        </p>
                        <button onClick={openAddForm} className="mt-3 text-brand-purple text-xs font-semibold">+ {activeSubTab === 'expense' ? t('expenses.addExpense') : activeSubTab === 'income' ? 'Add Income' : 'Add Investment'}</button>
                    </div>
                )}
                <div className="space-y-2">
                    {filteredEntries.map((exp) => {
                        const type = exp.entryType || 'expense';
                        const cat = type === 'investment'
                            ? INVESTMENT_TYPES.find(t => t.id === exp.investmentType)
                            : type === 'income'
                            ? INCOME_CATEGORIES.find(c => c.id === exp.category)
                            : EXPENSE_CATEGORIES.find((c) => c.id === (exp.category || exp.categoryId));
                        const amtColor = type === 'income' ? 'text-emerald-400' : type === 'investment' ? 'text-blue-400' : 'text-red-400';
                        const prefix = type === 'income' ? '+' : type === 'investment' ? '' : '-';
                        return (
                            <div key={exp.id} className="relative rounded-2xl bg-red-500 overflow-hidden mb-2">
                                <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center text-foreground">
                                    <Trash2 size={20} />
                                </div>
                                <motion.div
                                    drag="x"
                                    dragConstraints={{ left: -80, right: 0 }}
                                    onDragEnd={(_e, info) => { if (info.offset.x < -50) deleteEntry(exp.id); }}
                                    className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center gap-3 relative z-10 cursor-pointer"
                                    onClick={() => startEdit(exp.id)}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center text-xl flex-shrink-0">
                                        {cat && 'icon' in cat ? cat.icon : '📌'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-800 dark:text-foreground text-sm font-semibold truncate">{exp.description}</p>
                                        <p className="text-muted-foreground text-[10px]">
                                            {type === 'investment'
                                                ? (INVESTMENT_TYPES.find(t => t.id === exp.investmentType)?.label || 'Investment')
                                                : getCategoryDisplayName((cat as any)?.id || 'others')}
                                            {' · '}{formatDate(exp.date)}
                                            {exp.paymentMethod && (
                                                <span className="ml-1 px-1.5 py-0.5 bg-brand-purple/10 text-brand-purple rounded text-[9px] font-bold">{t(`expenses.paymentMethods.${exp.paymentMethod}`)}</span>
                                            )}
                                        </p>
                                    </div>
                                    <p className={`${amtColor} font-bold text-sm mr-1`}>{prefix}₹{exp.amount.toLocaleString('en-IN')}</p>
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
            {createPortal(
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
                                    {editingId ? t('expenses.editExpenseTitle', 'Edit Entry') : fEntryType === 'expense' ? t('expenses.addExpenseTitle') : fEntryType === 'income' ? 'Add Income' : 'Add Investment'}
                                </h3>
                            </div>

                            {/* Scrollable form content */}
                            <div className="flex-1 overflow-y-auto px-6 pb-2">
                            <div className="space-y-3">
                                {/* Entry Type Selector */}
                                {!editingId && (
                                    <div>
                                        <label className="text-muted-foreground text-xs mb-1 block">Entry Type</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {([{ id: 'expense' as EntryType, emoji: '💸', label: 'Expense', bg: 'bg-red-500' }, { id: 'income' as EntryType, emoji: '💰', label: 'Income', bg: 'bg-emerald-500' }, { id: 'investment' as EntryType, emoji: '📈', label: 'Investment', bg: 'bg-blue-500' }]).map(et => (
                                                <button
                                                    key={et.id}
                                                    onClick={() => { setFEntryType(et.id); if (et.id === 'income') setFCategory('salary'); else if (et.id === 'expense') setFCategory('food'); }}
                                                    className={`p-2.5 rounded-xl text-center text-xs font-bold transition-all ${fEntryType === et.id ? `${et.bg} text-white` : 'bg-card border-border text-slate-600 dark:text-slate-300'}`}
                                                >
                                                    {et.emoji}<br />{et.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Category / Investment Type */}
                                {fEntryType === 'investment' ? (
                                    <div>
                                        <label className="text-muted-foreground text-xs mb-1 block">Investment Type</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {INVESTMENT_TYPES.map(inv => (
                                                <button
                                                    key={inv.id}
                                                    onClick={() => setFInvestmentType(inv.id)}
                                                    className={`p-2 rounded-xl text-center text-xs font-medium transition-all ${fInvestmentType === inv.id ? 'text-white' : 'bg-card border-border text-slate-600 dark:text-slate-300'}`}
                                                    style={fInvestmentType === inv.id ? { backgroundColor: inv.color } : {}}
                                                >
                                                    {inv.icon}<br />{inv.label.split('/')[0].trim()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : fEntryType === 'income' ? (
                                    <div>
                                        <label className="text-muted-foreground text-xs mb-1 block">Income Source</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {INCOME_CATEGORIES.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setFCategory(cat.id)}
                                                    className={`p-2 rounded-xl text-center text-xs font-medium transition-all ${fCategory === cat.id ? 'bg-emerald-500 text-white' : 'bg-card border-border text-slate-300'}`}
                                                >
                                                    {cat.icon}<br />{cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-muted-foreground text-xs mb-1 block">{t('expenses.category')}</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {EXPENSE_CATEGORIES.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setFCategory(cat.id)}
                                                    className={`p-2 rounded-xl text-center text-xs font-medium transition-all ${fCategory === cat.id ? 'bg-brand-purple text-white' : 'bg-card border-border text-slate-300'}`}
                                                >
                                                    {cat.icon}<br />{getCategoryDisplayName(cat.id).split(' ')[0]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Budget warning */}
                                {selectedCatBudget > 0 && (
                                    <div className={`p-3 rounded-xl text-xs font-medium ${overBudget ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                        {t('expenses.budget')}: ₹{selectedCatBudget.toLocaleString('en-IN')} · {t('expenses.spent')}: ₹{selectedCatSpent.toLocaleString('en-IN')} · {t('expenses.remaining')}: ₹{(selectedCatBudget - selectedCatSpent).toLocaleString('en-IN')}
                                        {overBudget && ` ⚠️ ${t('expenses.overBudget')}`}
                                    </div>
                                )}

                                {/* Amount */}
                                <div>
                                    <label className="text-muted-foreground text-xs mb-1 block">
                                        {fEntryType === 'expense' ? t('expenses.amountLabel') : fEntryType === 'income' ? 'Amount Received' : 'Amount Invested'} *
                                    </label>
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
                                        placeholder={fEntryType === 'expense' ? t('expenses.descriptionPlaceholder') : fEntryType === 'income' ? 'Source of income' : 'e.g. SIP in Axis Bluechip, 10g gold'}
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
                            <div className="flex-shrink-0 px-6 pt-3 border-t border-slate-700/60" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 12px))' }}>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowAddForm(false)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-600">{t('common.cancel')}</button>
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
            </AnimatePresence>,
            document.body
            )}
        </div>
    );
}
