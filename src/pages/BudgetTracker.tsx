import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Plus, Trash2, PieChart, Target, TrendingUp, Wallet,
    ChevronRight, Calendar, ArrowUpCircle, ArrowDownCircle,
    LayoutDashboard, FileBarChart, PiggyBank, Briefcase, FileText, MoreVertical,
    Edit3, Check, X, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useBudgetTrackerStore, type BudgetCategory } from '../store/useBudgetTrackerStore';
import { useAuthStore } from '../store/useAuthStore';
import { formatINR } from '../utils/calculations';
import { exportToPDF } from '../utils/exportUtils';

export default function BudgetTracker() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = useAuthStore(s => s.user);
    const {
        monthlyIncome, setMonthlyIncome,
        currentBalance, setCurrentBalance,
        totalBalance, setTotalBalance,
        savingsGoal, setSavingsGoal,
        entries, categories,
        addEntry, deleteEntry, updateEntry,
        addCategory, deleteCategory,
    } = useBudgetTrackerStore();

    const [activeTab, setActiveTab] = useState<'month' | 'year'>('month');
    const [showEditBalance, setShowEditBalance] = useState(false);
    const [editBalanceVal, setEditBalanceVal] = useState(currentBalance.toString());
    const [editIncomeVal, setEditIncomeVal] = useState(monthlyIncome.toString());
    const [editTotalVal, setEditTotalVal] = useState(totalBalance.toString());
    const [editGoalVal, setEditGoalVal] = useState(savingsGoal.toString());

    // Add expense modal
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [newExpAmount, setNewExpAmount] = useState('');
    const [newExpDesc, setNewExpDesc] = useState('');
    const [newExpCatId, setNewExpCatId] = useState('');

    // Add category modal
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatBudget, setNewCatBudget] = useState('');
    const [newCatEmoji, setNewCatEmoji] = useState('🛒');

    // Edit entry state
    const [editingEntry, setEditingEntry] = useState<string | null>(null);
    const [editEntryAmount, setEditEntryAmount] = useState('');
    const [editEntryDesc, setEditEntryDesc] = useState('');

    const EMOJIS = ['🍽️', '🛒', '🚗', '🏠', '💊', '📚', '🎮', '👗', '💆', '🎁', '📱', '✈️', '☕', '🏋️', '🐾'];

    // Calculate totals for current month
    const now = new Date();
    const month = now.getMonth(), year = now.getFullYear();
    const monthEntries = entries.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === month && d.getFullYear() === year;
    });
    const totalSpent = monthEntries.reduce((s, e) => s + e.amount, 0);
    const savings = monthlyIncome - totalSpent;

    const saveBalanceEdits = () => {
        setCurrentBalance(Number(editBalanceVal) || 0);
        setMonthlyIncome(Number(editIncomeVal) || 0);
        setTotalBalance(Number(editTotalVal) || 0);
        setSavingsGoal(Number(editGoalVal) || 0);
        setShowEditBalance(false);
    };

    const handleAddExpense = () => {
        if (!newExpAmount || !newExpDesc) return;
        addEntry({
            categoryId: newExpCatId || 'general',
            amount: Number(newExpAmount),
            description: newExpDesc,
            date: new Date().toISOString(),
        });
        setNewExpAmount('');
        setNewExpDesc('');
        setNewExpCatId('');
        setShowAddExpense(false);
    };

    const handleAddCategory = () => {
        if (!newCatName) return;
        addCategory({
            name: newCatName,
            emoji: newCatEmoji,
            budgeted: Number(newCatBudget) || 0,
        });
        setNewCatName('');
        setNewCatBudget('');
        setNewCatEmoji('🛒');
        setShowAddCategory(false);
    };

    const handleEditEntry = (entryId: string) => {
        const entry = entries.find(e => e.id === entryId);
        if (!entry) return;
        setEditingEntry(entryId);
        setEditEntryAmount(entry.amount.toString());
        setEditEntryDesc(entry.description);
    };

    const handleSaveEditEntry = () => {
        if (!editingEntry || !editEntryAmount || !editEntryDesc) return;
        updateEntry(editingEntry, {
            amount: Number(editEntryAmount),
            description: editEntryDesc,
        });
        setEditingEntry(null);
        setEditEntryAmount('');
        setEditEntryDesc('');
    };

    const handleDownloadPDF = async () => {
        const headers = ['Field', 'Value'];
        const summaryData: (string | number)[][] = [
            ['Monthly Income', `Rs ${monthlyIncome.toLocaleString('en-IN')}`],
            ['Total Spent (This Month)', `Rs ${totalSpent.toLocaleString('en-IN')}`],
            ['Savings', `Rs ${savings.toLocaleString('en-IN')}`],
            ['Current Balance', `Rs ${currentBalance.toLocaleString('en-IN')}`],
            ['Total Balance', `Rs ${totalBalance.toLocaleString('en-IN')}`],
            ['Savings Goal', `Rs ${savingsGoal.toLocaleString('en-IN')}`],
        ];

        // Add expense entries
        if (monthEntries.length > 0) {
            summaryData.push(['', '']); // spacer
            summaryData.push(['--- This Month Expenses ---', '---']);
            monthEntries.forEach(e => {
                summaryData.push([
                    `${new Date(e.date).toLocaleDateString('en-IN')} - ${e.description}`,
                    `Rs ${e.amount.toLocaleString('en-IN')}`
                ]);
            });
        }

        await exportToPDF('Budget Report', headers, summaryData, 'Budget_Report');
    };

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-[#0F172A] animate-fade-in relative overflow-x-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />

            {/* Header section */}
            <div className="bg-gradient-to-b from-indigo-100 dark:from-brand-purple/20 to-transparent px-4 pt-14 pb-12">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white lowercase">{user?.name || 'User'}</h1>
                    <button onClick={() => { setEditBalanceVal(currentBalance.toString()); setEditIncomeVal(monthlyIncome.toString()); setEditTotalVal(totalBalance.toString()); setEditGoalVal(savingsGoal.toString()); setShowEditBalance(true); }} className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white">
                        <Edit3 size={18} />
                    </button>
                </div>

                <div className="flex justify-between items-end mb-8">
                    <div>
                        <p className="text-slate-500 dark:text-white/60 text-xs font-medium mb-1">{t('budgetTracker.currentBalance')}</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">₹{currentBalance.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-500 dark:text-white/60 text-xs font-medium mb-1">{t('budgetTracker.totalBalance')}</p>
                        <p className="text-lg font-bold text-slate-700 dark:text-white/90">₹{totalBalance.toLocaleString('en-IN')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-white/10 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-white/60 text-[10px] uppercase font-bold tracking-wider">{t('budgetTracker.income')}</p>
                            <p className="text-slate-900 dark:text-white font-bold">₹{monthlyIncome.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-white/10 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                            <ArrowDownCircle size={20} />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-white/60 text-[10px] uppercase font-bold tracking-wider">{t('budgetTracker.expenses')}</p>
                            <p className="text-slate-900 dark:text-white font-bold">₹{totalSpent.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content section */}
            <div className="px-4 -mt-6 relative z-10 pb-28">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-slate-900 dark:text-white font-bold text-lg">{t('budgetTracker.insightsReports')}</h2>
                </div>

                {/* Month/Year selector */}
                <div className="flex gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1 mb-6">
                    <button onClick={() => setActiveTab('month')}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'month' ? 'bg-indigo-500 text-white dark:bg-white dark:text-black' : 'text-slate-400'}`}>
                        {t('budgetTracker.month')}
                    </button>
                    <button onClick={() => setActiveTab('year')}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'year' ? 'bg-indigo-500 text-white dark:bg-white dark:text-black' : 'text-slate-400'}`}>
                        {t('budgetTracker.year')}
                    </button>
                </div>

                {/* Dashboard — Unique Vertical Action Strips */}
                {activeTab === 'month' ? (
                    <div className="space-y-3">
                        <ActionStrip
                            title={t('budgetTracker.cashPulse')}
                            subtitle={t('budgetTracker.incomeSpent', { income: monthlyIncome.toLocaleString('en-IN'), spent: totalSpent.toLocaleString('en-IN') })}
                            icon={LayoutDashboard}
                            accent="from-indigo-500 to-violet-500"
                            iconBg="bg-indigo-100 dark:bg-indigo-500/15"
                            iconColor="text-indigo-600 dark:text-indigo-400"
                            onClick={() => navigate('/expenses')}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <CompactCard
                                title={t('budgetTracker.spendLens')}
                                value={`₹${totalSpent.toLocaleString('en-IN')}`}
                                label={`${monthEntries.length} ${t('budgetTracker.txns')}`}
                                icon={FileBarChart}
                                gradient="from-purple-500 to-fuchsia-500"
                                onClick={() => navigate('/expenses')}
                            />
                            <CompactCard
                                title={t('budgetTracker.smartVault')}
                                value={`₹${savings.toLocaleString('en-IN')}`}
                                label={t('budgetTracker.saved')}
                                icon={PiggyBank}
                                gradient="from-emerald-500 to-teal-500"
                                onClick={() => { setEditBalanceVal(currentBalance.toString()); setEditIncomeVal(monthlyIncome.toString()); setEditTotalVal(totalBalance.toString()); setEditGoalVal(savingsGoal.toString()); setShowEditBalance(true); }}
                            />
                        </div>
                        <ActionStrip
                            title={t('budgetTracker.earnFlow')}
                            subtitle={`${t('budgetTracker.monthlyIncomeLabel')}: ₹${monthlyIncome.toLocaleString('en-IN')}`}
                            icon={ArrowUpCircle}
                            accent="from-blue-500 to-cyan-500"
                            iconBg="bg-blue-100 dark:bg-blue-500/15"
                            iconColor="text-blue-600 dark:text-blue-400"
                            onClick={() => { setEditBalanceVal(currentBalance.toString()); setEditIncomeVal(monthlyIncome.toString()); setEditTotalVal(totalBalance.toString()); setEditGoalVal(savingsGoal.toString()); setShowEditBalance(true); }}
                        />
                        <ActionStrip
                            title={t('budgetTracker.targetLock')}
                            subtitle={savingsGoal > 0 ? `${t('budgetTracker.goal')}: ₹${savingsGoal.toLocaleString('en-IN')}` : t('budgetTracker.tapSetGoal')}
                            icon={Target}
                            accent="from-violet-500 to-purple-600"
                            iconBg="bg-violet-100 dark:bg-violet-500/15"
                            iconColor="text-violet-600 dark:text-violet-400"
                            onClick={() => { setEditBalanceVal(currentBalance.toString()); setEditIncomeVal(monthlyIncome.toString()); setEditTotalVal(totalBalance.toString()); setEditGoalVal(savingsGoal.toString()); setShowEditBalance(true); }}
                        />
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setShowAddExpense(true)}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-brand-green to-emerald-500 text-white font-bold text-sm shadow-lg shadow-brand-green/20"
                        >
                            <Plus size={18} /> {t('budgetTracker.quickEntry')}
                        </motion.button>
                    </div>
                ) : (
                    /* Year View — Monthly Breakdown */
                    <div className="space-y-4">
                        {/* Year summary cards */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('budgetTracker.income')}</p>
                                <p className="text-sm font-bold text-brand-green">₹{(monthlyIncome * 12).toLocaleString('en-IN')}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('budgetTracker.expenses')}</p>
                                <p className="text-sm font-bold text-red-500">₹{(() => {
                                    const yearEntries = entries.filter(e => new Date(e.date).getFullYear() === year);
                                    return yearEntries.reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN');
                                })()}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('budgetTracker.saved')}</p>
                                <p className="text-sm font-bold text-indigo-500">₹{(() => {
                                    const yearEntries = entries.filter(e => new Date(e.date).getFullYear() === year);
                                    const yearSpent = yearEntries.reduce((s, e) => s + e.amount, 0);
                                    return ((monthlyIncome * 12) - yearSpent).toLocaleString('en-IN');
                                })()}</p>
                            </div>
                        </div>

                        {/* Monthly breakdown table */}
                        <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10">
                                <h3 className="text-slate-900 dark:text-white font-bold text-sm">{year} — {t('budgetTracker.month')} {t('budgetTracker.expenses')}</h3>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {(() => {
                                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                    const yearEntries = entries.filter(e => new Date(e.date).getFullYear() === year);
                                    const monthlyData = monthNames.map((name, i) => {
                                        const mEntries = yearEntries.filter(e => new Date(e.date).getMonth() === i);
                                        const spent = mEntries.reduce((s, e) => s + e.amount, 0);
                                        return { name, month: i, spent, count: mEntries.length };
                                    });
                                    const maxSpent = Math.max(...monthlyData.map(m => m.spent), 1);
                                    const currentMonth = now.getMonth();

                                    return monthlyData.map((m) => (
                                        <div key={m.month} className={`px-4 py-3 flex items-center gap-3 ${m.month === currentMonth ? 'bg-indigo-50 dark:bg-indigo-500/5' : ''}`}>
                                            <div className="w-8 text-center">
                                                <span className={`text-xs font-bold ${m.month === currentMonth ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{m.name}</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="w-full h-5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden relative">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(m.spent / maxSpent) * 100}%` }}
                                                        transition={{ delay: m.month * 0.05, duration: 0.5 }}
                                                        className={`h-full rounded-full ${m.month === currentMonth ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gradient-to-r from-brand-green/70 to-emerald-500/70'}`}
                                                    />
                                                    {m.spent > 0 && (
                                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white mix-blend-difference">
                                                            {m.count} {t('budgetTracker.txns')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-24 text-right">
                                                <span className={`text-xs font-bold ${m.spent > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-white/20'}`}>
                                                    ₹{m.spent.toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                            {/* Totals row */}
                            <div className="px-4 py-3 bg-slate-50 dark:bg-white/[0.03] border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Total</span>
                                <span className="text-sm font-bold text-brand-green">
                                    ₹{entries.filter(e => new Date(e.date).getFullYear() === year).reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setShowAddExpense(true)}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-brand-green to-emerald-500 text-white font-bold text-sm shadow-lg shadow-brand-green/20"
                        >
                            <Plus size={18} /> {t('budgetTracker.quickEntry')}
                        </motion.button>
                    </div>
                )}

                {/* Categories Section */}
                {categories.length > 0 && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-slate-900 dark:text-white font-bold text-sm">{t('budgetTracker.categories')}</h3>
                            <button onClick={() => setShowAddCategory(true)} className="text-brand-green text-xs font-bold">{t('budgetTracker.addCategoryBtn')}</button>
                        </div>
                        <div className="space-y-2">
                            {categories.map(cat => (
                                <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                    <span className="text-lg">{cat.emoji}</span>
                                    <div className="flex-1">
                                        <p className="text-slate-900 dark:text-white text-sm font-medium">{cat.name}</p>
                                        <p className="text-slate-400 text-xs">Budget: ₹{cat.budgeted.toLocaleString('en-IN')}</p>
                                    </div>
                                    <button onClick={() => deleteCategory(cat.id)} className="text-slate-500 hover:text-red-400">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {categories.length === 0 && (
                    <div className="mt-6 p-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                        <p className="text-slate-400 text-sm mb-2">{t('budgetTracker.noCategoriesYet')}</p>
                        <button onClick={() => setShowAddCategory(true)} className="text-brand-green text-xs font-bold">{t('budgetTracker.addCategoryBtn')}</button>
                    </div>
                )}

                {/* Recent Entries */}
                {monthEntries.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-slate-900 dark:text-white font-bold text-sm mb-3">{t('budgetTracker.recentEntries')}</h3>
                        <div className="space-y-2">
                            {monthEntries.slice(-5).reverse().map(entry => (
                                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                    <div className="flex-1">
                                        <p className="text-slate-900 dark:text-white text-sm font-medium">{entry.description}</p>
                                        <p className="text-slate-500 text-[10px]">{new Date(entry.date).toLocaleDateString('en-IN')}</p>
                                    </div>
                                    <p className="text-red-400 font-bold text-sm">-₹{entry.amount.toLocaleString('en-IN')}</p>
                                    <button onClick={() => handleEditEntry(entry.id)} className="text-slate-500 hover:text-brand-blue">
                                        <Edit3 size={14} />
                                    </button>
                                    <button onClick={() => deleteEntry(entry.id)} className="text-slate-500 hover:text-red-400">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* PDF Export Button */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDownloadPDF}
                    className="w-full flex items-center justify-center gap-2 py-4 mt-6 mb-10 rounded-2xl bg-brand-purple/10 border-2 border-brand-purple/40 text-brand-purple font-bold text-sm"
                >
                    <Download size={18} /> Download PDF Report
                </motion.button>
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-24 right-4 z-20">
                <button onClick={() => setShowAddExpense(true)} className="w-14 h-14 rounded-full bg-brand-purple text-white shadow-xl shadow-brand-purple/40 flex items-center justify-center">
                    <Plus size={28} />
                </button>
            </div>

            {/* Edit Balance Modal */}
            <AnimatePresence>
                {showEditBalance && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
                        onClick={() => setShowEditBalance(false)}
                    >
                        <motion.div
                            initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
                            className="w-full max-w-md bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-white font-bold text-lg mb-4">{t('budgetTracker.editFinances')}</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{t('budgetTracker.currentBalance')}</label>
                                    <input type="number" value={editBalanceVal} onChange={e => setEditBalanceVal(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green" />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{t('budgetTracker.monthlyIncomeLabel')}</label>
                                    <input type="number" value={editIncomeVal} onChange={e => setEditIncomeVal(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green" />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{t('budgetTracker.totalBalance')}</label>
                                    <input type="number" value={editTotalVal} onChange={e => setEditTotalVal(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green" />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{t('budgetTracker.savingsGoal')}</label>
                                    <input type="number" value={editGoalVal} onChange={e => setEditGoalVal(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green" />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-5">
                                <button onClick={() => setShowEditBalance(false)} className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium text-sm">{t('budgetTracker.cancel')}</button>
                                <button onClick={saveBalanceEdits} className="flex-1 py-3 rounded-xl bg-brand-green text-white font-bold text-sm">{t('budgetTracker.save')}</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Expense Modal */}
            <AnimatePresence>
                {showAddExpense && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
                        onClick={() => setShowAddExpense(false)}
                    >
                        <motion.div
                            initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
                            className="w-full max-w-md bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-white font-bold text-lg mb-4">{t('budgetTracker.addExpense')}</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{t('budgetTracker.amount')} (₹)</label>
                                    <input type="number" value={newExpAmount} onChange={e => setNewExpAmount(e.target.value)} placeholder="0"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green" />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{t('budgetTracker.description')}</label>
                                    <input type="text" value={newExpDesc} onChange={e => setNewExpDesc(e.target.value)} placeholder="e.g. Groceries"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green" />
                                </div>
                                {categories.length > 0 && (
                                    <div>
                                        <label className="text-slate-400 text-xs mb-1 block">{t('budgetTracker.selectCategory')}</label>
                                        <select value={newExpCatId} onChange={e => setNewExpCatId(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green">
                                            <option value="">{t('budgetTracker.selectCategory')}</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 mt-5">
                                <button onClick={() => setShowAddExpense(false)} className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium text-sm">{t('budgetTracker.cancel')}</button>
                                <button onClick={handleAddExpense} className="flex-1 py-3 rounded-xl bg-brand-green text-white font-bold text-sm">{t('budgetTracker.addExpense')}</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Category Modal */}
            <AnimatePresence>
                {showAddCategory && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
                        onClick={() => setShowAddCategory(false)}
                    >
                        <motion.div
                            initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
                            className="w-full max-w-md bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-white font-bold text-lg mb-4">{t('budgetTracker.newCategory')}</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{t('budgetTracker.categoryName')}</label>
                                    <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="e.g. Food"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green" />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{t('budgetTracker.budgetAmount')} (₹)</label>
                                    <input type="number" value={newCatBudget} onChange={e => setNewCatBudget(e.target.value)} placeholder="5000"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green" />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">Emoji</label>
                                    <div className="flex flex-wrap gap-2">
                                        {EMOJIS.map(e => (
                                            <button key={e} onClick={() => setNewCatEmoji(e)}
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${newCatEmoji === e ? 'bg-brand-green/20 border border-brand-green' : 'bg-slate-800 border border-slate-600'}`}>
                                                {e}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-5">
                                <button onClick={() => setShowAddCategory(false)} className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium text-sm">{t('budgetTracker.cancel')}</button>
                                <button onClick={handleAddCategory} className="flex-1 py-3 rounded-xl bg-brand-green text-white font-bold text-sm">{t('budgetTracker.addExpense')}</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Entry Modal */}
            <AnimatePresence>
                {editingEntry && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
                        onClick={() => setEditingEntry(null)}
                    >
                        <motion.div
                            initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
                            className="w-full max-w-md bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-white font-bold text-lg mb-4">Edit Entry</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">Amount (₹)</label>
                                    <input type="number" value={editEntryAmount} onChange={e => setEditEntryAmount(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green" />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">Description</label>
                                    <input type="text" value={editEntryDesc} onChange={e => setEditEntryDesc(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green" />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-5">
                                <button onClick={() => setEditingEntry(null)} className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium text-sm">Cancel</button>
                                <button onClick={handleSaveEditEntry} className="flex-1 py-3 rounded-xl bg-brand-green text-white font-bold text-sm">Save Changes</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface ActionStripProps {
    title: string;
    subtitle?: string;
    icon: any;
    accent: string;
    iconBg: string;
    iconColor: string;
    onClick?: () => void;
}
function ActionStrip({ title, subtitle, icon: Icon, accent, iconBg, iconColor, onClick }: ActionStripProps) {
    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="relative flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden cursor-pointer group"
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accent}`} />
            <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                <Icon size={20} className={iconColor} />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-slate-900 dark:text-white text-sm font-bold">{title}</h3>
                {subtitle && <p className="text-slate-500 text-[11px] mt-0.5 truncate">{subtitle}</p>}
            </div>
            <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </motion.div>
    );
}

interface CompactCardProps {
    title: string;
    value: string;
    label: string;
    icon: any;
    gradient: string;
    onClick?: () => void;
}
function CompactCard({ title, value, label, icon: Icon, gradient, onClick }: CompactCardProps) {
    return (
        <motion.div
            whileTap={{ scale: 0.97 }}
            onClick={onClick}
            className="relative p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden cursor-pointer"
        >
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
            <div className="flex items-center justify-between mb-3">
                <Icon size={16} className="text-slate-400" />
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{label}</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">{title}</p>
        </motion.div>
    );
}

