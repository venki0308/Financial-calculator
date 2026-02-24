import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Wallet, PieChart, Calendar as CalendarIcon, DollarSign, Tag, ChevronRight, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useExpenseStore, type Budget, type Expense } from '../store/useExpenseStore';

const CATEGORY_COLORS: Record<string, string> = {
    food: '#F59E0B', transport: '#3B82F6', shopping: '#EC4899', entertainment: '#8B5CF6',
    healthcare: '#10B981', education: '#06B6D4', groceries: '#22C55E', personalCare: '#F97316', others: '#6B7280'
};

const CATEGORY_ICONS: Record<string, string> = {
    food: '🍽️', transport: '🚗', shopping: '🛍️', entertainment: '🎮',
    healthcare: '🏥', education: '📚', groceries: '🛒', personalCare: '💆', others: '📦'
};

export default function ExpenseTracker() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'budget' | 'daily' | 'reports'>('dashboard');

    const tabs = [
        { key: 'dashboard' as const, label: t('expenses.dashboard') },
        { key: 'budget' as const, label: t('expenses.budget') },
        { key: 'daily' as const, label: t('expenses.daily') },
        { key: 'reports' as const, label: t('expenses.reports') },
    ];

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in">
            <div className="px-4 pt-14 pb-8">
                <div className="flex items-center gap-3 mb-5">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border"><ArrowLeft size={18} className="text-slate-400" /></button>
                    <h1 className="text-xl font-bold text-white">{t('expenses.title')}</h1>
                </div>

                {/* Tab Bar */}
                <div className="flex gap-1 bg-dark-card border border-dark-border rounded-xl p-1 mb-5">
                    {tabs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${activeTab === tab.key ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-slate-400'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Budget Tracker Banner */}
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/budget-tracker')}
                    className="w-full mb-5 p-4 rounded-2xl bg-gradient-to-r from-brand-purple/20 to-indigo-500/10 border border-brand-purple/30 flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-brand-purple/20 flex items-center justify-center">
                        <Target size={20} className="text-brand-purple" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="text-white font-semibold text-sm">{t('budgetTracker.title')}</h3>
                        <p className="text-slate-400 text-[10px]">{t('budgetTracker.subtitle')}</p>
                    </div>
                    <ChevronRight size={16} className="text-brand-purple group-hover:translate-x-1 transition-transform" />
                </motion.button>

                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>
                        {activeTab === 'dashboard' && <Dashboard />}
                        {activeTab === 'budget' && <BudgetSetup />}
                        {activeTab === 'daily' && <DailyExpenses />}
                        {activeTab === 'reports' && <Reports />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

function Dashboard() {
    const { t } = useTranslation();
    const { budget, getTotalSpent, getCategoryBreakdown } = useExpenseStore();
    const now = new Date();
    const month = now.getMonth(), year = now.getFullYear();
    const totalSpent = getTotalSpent(month, year);
    const income = budget?.monthlyIncome || 0;
    const totalFixed = budget ? budget.rent + budget.emiPayment + budget.utilities + budget.mobile + budget.insurance + budget.otherFixed : 0;
    const available = income - totalFixed;
    const savings = available - totalSpent;
    const breakdown = getCategoryBreakdown(month, year);
    const sortedCategories = Object.entries(breakdown).sort(([, a], [, b]) => b - a);
    const spentPercent = available > 0 ? Math.min((totalSpent / available) * 100, 100) : 0;

    return (
        <div className="space-y-4">
            {/* Monthly Overview Card */}
            <div className="bg-gradient-to-br from-brand-purple/20 to-indigo-600/10 border border-brand-purple/30 rounded-2xl p-5">
                <p className="text-slate-400 text-xs font-medium mb-1">{t('expenses.thisMonth')}</p>
                <div className="flex items-end justify-between mb-4">
                    <div>
                        <p className="text-3xl font-bold text-white">₹{totalSpent.toLocaleString('en-IN')}</p>
                        <p className="text-slate-400 text-xs">{t('expenses.spent')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-brand-purple">₹{income.toLocaleString('en-IN')}</p>
                        <p className="text-slate-500 text-[10px]">{t('expenses.income')}</p>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${spentPercent}%` }}
                        className={`h-full rounded-full ${spentPercent > 80 ? 'bg-red-500' : spentPercent > 50 ? 'bg-yellow-500' : 'bg-brand-purple'}`} />
                </div>
                <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-slate-500">{spentPercent.toFixed(0)}% {t('expenses.spent').toLowerCase()}</span>
                    <span className="text-[10px] text-slate-500">{t('expenses.available')}: ₹{Math.max(0, savings).toLocaleString('en-IN')}</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
                <StatCard icon={TrendingDown} label={t('expenses.spent')} value={`₹${totalSpent.toLocaleString('en-IN')}`} color="#EF4444" />
                <StatCard icon={TrendingUp} label={t('expenses.savings')} value={`₹${Math.max(0, savings).toLocaleString('en-IN')}`} color="#10B981" />
                <StatCard icon={Wallet} label={t('expenses.fixedExpenses')} value={`₹${totalFixed.toLocaleString('en-IN')}`} color="#F59E0B" abbr />
            </div>

            {/* Category Breakdown */}
            {sortedCategories.length > 0 && (
                <div className="bg-dark-card border border-dark-border rounded-2xl p-4">
                    <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><PieChart size={16} className="text-brand-purple" />{t('expenses.categoryWise')}</h3>
                    <div className="space-y-3">
                        {sortedCategories.map(([cat, amount]) => {
                            const pct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                            return (
                                <div key={cat}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-slate-300 flex items-center gap-1.5">
                                            <span>{CATEGORY_ICONS[cat] || '📦'}</span>
                                            {t(`expenses.categories.${cat}` as any)}
                                        </span>
                                        <span className="text-xs text-white font-medium">₹{amount.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                            className="h-full rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] || '#6B7280' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!budget && (
                <div className="bg-dark-card border border-dark-border rounded-2xl p-6 text-center">
                    <Wallet size={40} className="text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">{t('expenses.noBudget')}</p>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, abbr }: { icon: React.ElementType; label: string; value: string; color: string; abbr?: boolean }) {
    return (
        <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
            <Icon size={18} style={{ color }} className="mx-auto mb-1" />
            <p className={`text-white font-bold ${abbr ? 'text-xs' : 'text-sm'} truncate`}>{value}</p>
            <p className="text-[10px] text-slate-500 truncate">{label}</p>
        </div>
    );
}

function BudgetSetup() {
    const { t } = useTranslation();
    const { budget, setBudget } = useExpenseStore();
    const [form, setForm] = useState<Budget>(budget || { monthlyIncome: 0, rent: 0, emiPayment: 0, utilities: 0, mobile: 0, insurance: 0, otherFixed: 0 });
    const [saved, setSaved] = useState(false);

    const totalFixed = form.rent + form.emiPayment + form.utilities + form.mobile + form.insurance + form.otherFixed;
    const available = form.monthlyIncome - totalFixed;

    const handleSave = () => { setBudget(form); setSaved(true); setTimeout(() => setSaved(false), 2000); };

    const fields: { key: keyof Budget; label: string; icon: string }[] = [
        { key: 'monthlyIncome', label: t('expenses.monthlyIncome'), icon: '💰' },
        { key: 'rent', label: t('expenses.rent'), icon: '🏠' },
        { key: 'emiPayment', label: t('expenses.emiPayment'), icon: '🏦' },
        { key: 'utilities', label: t('expenses.utilities'), icon: '💡' },
        { key: 'mobile', label: t('expenses.mobile'), icon: '📱' },
        { key: 'insurance', label: t('expenses.insurance'), icon: '🛡️' },
        { key: 'otherFixed', label: t('expenses.otherFixed'), icon: '📋' },
    ];

    return (
        <div className="space-y-4">
            <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3">
                {fields.map(({ key, label, icon }) => (
                    <div key={key}>
                        <label className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><span>{icon}</span>{label}</label>
                        <input type="number" value={form[key] || ''} onChange={e => setForm({ ...form, [key]: Number(e.target.value) || 0 })}
                            className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-purple" placeholder="₹0" />
                    </div>
                ))}
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-br from-brand-purple/10 to-brand-blue/10 border border-brand-purple/20 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between"><span className="text-slate-400 text-xs">{t('expenses.totalFixed')}</span><span className="text-white text-sm font-bold">₹{totalFixed.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-xs">{t('expenses.available')}</span><span className={`text-sm font-bold ${available >= 0 ? 'text-brand-green' : 'text-red-400'}`}>₹{available.toLocaleString('en-IN')}</span></div>
            </div>

            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
                className="w-full py-4 bg-gradient-to-r from-brand-purple to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-brand-purple/20">
                {saved ? '✅ ' + t('expenses.budgetSaved') : t('common.save')}
            </motion.button>
        </div>
    );
}

function DailyExpenses() {
    const { t } = useTranslation();
    const { budget, expenses, addExpense, deleteExpense } = useExpenseStore();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], category: '', amount: 0, description: '' });

    const now = new Date();
    const monthExpenses = expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const categories = ['food', 'transport', 'shopping', 'entertainment', 'healthcare', 'education', 'groceries', 'personalCare', 'others'];

    const handleAdd = () => {
        if (!form.category || !form.amount) return;
        addExpense({ ...form, type: 'variable' });
        setForm({ date: new Date().toISOString().split('T')[0], category: '', amount: 0, description: '' });
        setShowForm(false);
    };

    return (
        <div className="space-y-4">
            {!showForm ? (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowForm(true)}
                    className="w-full py-4 bg-gradient-to-r from-brand-purple to-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/20">
                    <Plus size={18} />{t('expenses.addNew')}
                </motion.button>
            ) : (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3">
                    <div>
                        <label className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><CalendarIcon size={12} />{t('expenses.date')}</label>
                        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                            className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-purple" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><Tag size={12} />{t('expenses.category')}</label>
                        <div className="grid grid-cols-3 gap-2">
                            {categories.map(cat => (
                                <button key={cat} onClick={() => setForm({ ...form, category: cat })}
                                    className={`p-2 rounded-xl text-[10px] font-medium transition-all ${form.category === cat ? 'bg-brand-purple/20 border-brand-purple text-brand-purple border-2' : 'bg-dark-bg border-dark-border text-slate-400 border'}`}>
                                    {CATEGORY_ICONS[cat]} {t(`expenses.categories.${cat}` as any)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><DollarSign size={12} />{t('expenses.amount')}</label>
                        <input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) || 0 })}
                            className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-purple" placeholder="₹0" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1">{t('expenses.description')} ({t('common.optional')})</label>
                        <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                            className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-purple" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowForm(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-xl text-sm font-medium">{t('common.cancel')}</button>
                        <motion.button whileTap={{ scale: 0.97 }} onClick={handleAdd} className="flex-1 py-3 bg-brand-purple text-white rounded-xl text-sm font-bold">{t('expenses.addExpense')}</motion.button>
                    </div>
                </motion.div>
            )}

            {/* Expense list */}
            <div className="space-y-2">
                <h3 className="text-white font-semibold text-sm">{t('expenses.recentExpenses')}</h3>
                {monthExpenses.length === 0 ? (
                    <div className="bg-dark-card border border-dark-border rounded-2xl p-8 text-center">
                        <p className="text-slate-500 text-sm">{t('expenses.noExpenses')}</p>
                    </div>
                ) : (
                    monthExpenses.map(exp => (
                        <motion.div key={exp.id} layout className="flex items-center gap-3 bg-dark-card border border-dark-border rounded-xl p-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${CATEGORY_COLORS[exp.category]}20` }}>
                                {CATEGORY_ICONS[exp.category] || '📦'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{t(`expenses.categories.${exp.category}` as any)}</p>
                                <p className="text-slate-500 text-[10px]">{new Date(exp.date).toLocaleDateString()} {exp.description && `• ${exp.description}`}</p>
                            </div>
                            <p className="text-red-400 font-bold text-sm">-₹{exp.amount.toLocaleString('en-IN')}</p>
                            <button onClick={() => deleteExpense(exp.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"><Trash2 size={14} className="text-red-400" /></button>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}

function Reports() {
    const { t } = useTranslation();
    const { expenses, budget, getTotalSpent, getCategoryBreakdown } = useExpenseStore();
    const now = new Date();
    const month = now.getMonth(), year = now.getFullYear();
    const totalSpent = getTotalSpent(month, year);
    const monthExpenses = expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === month && d.getFullYear() === year; });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysPassed = now.getDate();
    const dailyAvg = daysPassed > 0 ? totalSpent / daysPassed : 0;
    const weeklyAvg = dailyAvg * 7;
    const breakdown = getCategoryBreakdown(month, year);
    const topCategory = Object.entries(breakdown).sort(([, a], [, b]) => b - a)[0];

    return (
        <div className="space-y-4">
            <div className="bg-gradient-to-br from-brand-purple/15 to-brand-blue/10 border border-brand-purple/30 rounded-2xl p-5">
                <h3 className="text-white font-semibold text-sm mb-3">{t('expenses.monthlyReport')}</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-dark-bg/50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500">{t('expenses.dailyAverage')}</p>
                        <p className="text-white font-bold">₹{Math.round(dailyAvg).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-dark-bg/50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500">{t('expenses.weeklyAverage')}</p>
                        <p className="text-white font-bold">₹{Math.round(weeklyAvg).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-dark-bg/50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500">{t('expenses.topCategory')}</p>
                        <p className="text-white font-bold text-xs truncate">{topCategory ? `${CATEGORY_ICONS[topCategory[0]]} ${t(`expenses.categories.${topCategory[0]}` as any)}` : '—'}</p>
                    </div>
                    <div className="bg-dark-bg/50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500">{t('common.total')}</p>
                        <p className="text-white font-bold">₹{totalSpent.toLocaleString('en-IN')}</p>
                    </div>
                </div>
            </div>

            {/* Projected spending */}
            <div className="bg-dark-card border border-dark-border rounded-2xl p-4">
                <h3 className="text-white font-semibold text-sm mb-2">📊 {t('expenses.projectedMonthEnd')}</h3>
                <p className="text-2xl font-bold text-white">₹{Math.round(dailyAvg * daysInMonth).toLocaleString('en-IN')}</p>
                <p className="text-slate-500 text-xs mt-1">{t('expenses.basedOnDays', { days: daysPassed })}</p>
                {budget && (
                    <div className="mt-2">
                        {dailyAvg * daysInMonth > (budget.monthlyIncome - (budget.rent + budget.emiPayment + budget.utilities + budget.mobile + budget.insurance + budget.otherFixed)) ? (
                            <p className="text-red-400 text-xs font-medium">⚠️ {t('expenses.mayExceedBudget')}</p>
                        ) : (
                            <p className="text-brand-purple text-xs font-medium">✅ {t('expenses.withinBudget')}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
