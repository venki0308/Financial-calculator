import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBudgetTrackerStore, EXPENSE_CATEGORIES } from '../../store/useBudgetTrackerStore';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const FIXED_FIELDS: { key: 'rent' | 'utilities' | 'mobile' | 'insurance' | 'emi'; label: string; icon: string }[] = [
    { key: 'rent', label: 'Rent / EMI', icon: '🏠' },
    { key: 'utilities', label: 'Electricity & Gas', icon: '💡' },
    { key: 'mobile', label: 'Mobile & Internet', icon: '📱' },
    { key: 'insurance', label: 'Insurance', icon: '🛡️' },
    { key: 'emi', label: 'Loan EMI', icon: '🏦' },
];

export default function BudgetTab() {
    const { t } = useTranslation();
    const {
        monthlyIncome, setMonthlyIncome,
        fixedExpenses, setFixedExpenses, addCustomFixed, removeCustomFixed,
        categoryBudgets, setCategoryBudgets,
        getTotalFixed,
    } = useBudgetTrackerStore();

    const [showFixed, setShowFixed] = useState(true);
    const [showCategories, setShowCategories] = useState(false);
    const [newFixedLabel, setNewFixedLabel] = useState('');
    const [newFixedAmount, setNewFixedAmount] = useState('');
    const [showAddFixed, setShowAddFixed] = useState(false);
    const [saved, setSaved] = useState(false);

    const totalFixed = getTotalFixed();
    const totalCategoryBudgets = useMemo(
        () => Object.values(categoryBudgets).reduce((s, v) => s + v, 0),
        [categoryBudgets]
    );
    const availableForSavings = monthlyIncome - totalFixed - totalCategoryBudgets;

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="space-y-4 pb-6">
            {/* Monthly Income */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                    💰 {t('expenses.monthlyIncome')}
                </label>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus-within:border-brand-purple transition-colors">
                    <span className="text-brand-purple font-bold text-lg">₹</span>
                    <input
                        type="number"
                        value={monthlyIncome || ''}
                        onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                        placeholder="0"
                        className="flex-1 bg-transparent text-slate-900 dark:text-white text-lg font-bold outline-none"
                    />
                </div>
            </div>

            {/* Fixed Expenses Section */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                <button
                    onClick={() => setShowFixed(!showFixed)}
                    className="w-full flex items-center justify-between p-4"
                >
                    <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm text-left">{t('expenses.fixedExpenses')}</p>
                        <p className="text-slate-400 text-xs mt-0.5 text-left">{t('expenses.fixedExpensesSubtitle')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-brand-purple font-bold text-sm">₹{totalFixed.toLocaleString('en-IN')}</span>
                        {showFixed ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
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
                            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-white/10 pt-3">
                                {FIXED_FIELDS.map((field) => (
                                    <div key={field.key} className="flex items-center gap-1.5">
                                        <span className="text-xl w-8 text-center">{field.icon}</span>
                                        <div className="flex-1">
                                            <p className="text-slate-700 dark:text-slate-300 text-xs font-medium mb-1">{t(`expenses.${field.key}`)}</p>
                                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2">
                                                <span className="text-slate-400 text-sm">₹</span>
                                                <input
                                                    type="number"
                                                    value={fixedExpenses[field.key] || ''}
                                                    onChange={(e) => setFixedExpenses({ [field.key]: Number(e.target.value) })}
                                                    placeholder="0"
                                                    className="flex-1 bg-transparent text-slate-900 dark:text-white text-sm font-semibold outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Custom fixed expenses */}
                                {fixedExpenses.others.map((o) => (
                                    <div key={o.id} className="flex items-center gap-3">
                                        <span className="text-xl w-8">📋</span>
                                        <div className="flex-1">
                                            <p className="text-slate-700 dark:text-slate-300 text-xs font-medium mb-1">{o.label}</p>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-white">₹{o.amount.toLocaleString('en-IN')}</p>
                                        </div>
                                        <button onClick={() => removeCustomFixed(o.id)} className="text-red-400">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}

                                {/* Add custom fixed */}
                                {showAddFixed ? (
                                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                                        <input
                                            type="text"
                                            value={newFixedLabel}
                                            onChange={(e) => setNewFixedLabel(e.target.value)}
                                            placeholder="Label (e.g. Gym)"
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none text-slate-900 dark:text-white"
                                        />
                                        <input
                                            type="number"
                                            value={newFixedAmount}
                                            onChange={(e) => setNewFixedAmount(e.target.value)}
                                            placeholder="Amount (₹)"
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none text-slate-900 dark:text-white"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={() => setShowAddFixed(false)} className="flex-1 py-2 rounded-lg text-slate-500 text-sm font-medium bg-slate-100 dark:bg-slate-700">{t('common.cancel')}</button>
                                            <button
                                                onClick={() => { if (newFixedLabel && newFixedAmount) { addCustomFixed(newFixedLabel, Number(newFixedAmount)); setNewFixedLabel(''); setNewFixedAmount(''); setShowAddFixed(false); } }}
                                                className="flex-1 py-2 rounded-lg bg-brand-purple text-white text-sm font-bold"
                                            >{t('common.confirm')}</button>
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

            {/* Category Budget Limits */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                <button
                    onClick={() => setShowCategories(!showCategories)}
                    className="w-full flex items-center justify-between p-4"
                >
                    <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm text-left">{t('expenses.categoryBudgetLimits')}</p>
                        <p className="text-slate-400 text-xs mt-0.5 text-left">{t('expenses.categoryBudgetSubtitle')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-brand-green font-bold text-sm">₹{totalCategoryBudgets.toLocaleString('en-IN')}</span>
                        {showCategories ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
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
                            <div className="px-4 pb-4 space-y-4 border-t border-slate-100 dark:border-white/10 pt-4">
                                {EXPENSE_CATEGORIES.map((cat) => {
                                    const key = cat.id as keyof typeof categoryBudgets;
                                    const limit = categoryBudgets[key] || 0;
                                    return (
                                        <div key={cat.id} className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl w-6 text-center">{cat.icon}</span>
                                                    <p className="text-slate-700 dark:text-slate-300 text-xs font-medium">{t(`expenses.categories.${cat.id}`)}</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 flex items-center min-w-[80px]">
                                                    <span className="text-slate-400 text-xs px-1">₹</span>
                                                    <input
                                                        type="number"
                                                        value={limit || ''}
                                                        onChange={(e) => setCategoryBudgets({ [key]: Number(e.target.value) })}
                                                        placeholder="0"
                                                        className="w-full bg-transparent text-slate-900 dark:text-white text-xs font-bold outline-none text-right placeholder:text-slate-400"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="50000"
                                                    step="500"
                                                    value={limit}
                                                    onChange={(e) => setCategoryBudgets({ [key]: Number(e.target.value) })}
                                                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-purple"
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

            {/* Summary */}
            <div className="bg-gradient-to-br from-brand-purple/10 to-blue-600/10 border border-brand-purple/20 rounded-2xl p-4 flex flex-col items-center">
                <h3 className="w-full font-bold text-slate-900 dark:text-white text-sm mb-4">{t('expenses.monthlySummary')}</h3>
                <div className="flex items-center w-full gap-4">
                    <div className="w-24 h-24 flex-shrink-0 relative">
                        <Doughnut 
                            data={{
                                labels: [t('expenses.fixedExpenses'), t('expenses.categoryBudgetLimits'), t('expenses.estSavings')],
                                datasets: [{
                                    data: [totalFixed, totalCategoryBudgets, Math.max(availableForSavings, 0)],
                                    backgroundColor: ['#f87171', '#fb923c', '#4ade80'],
                                    borderWidth: 0,
                                }]
                            }}
                            options={{
                                responsive: true,
                                cutout: '75%',
                                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                            }}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Total</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-white">₹{monthlyIncome.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-1 pt-1 border-brand-purple/20">
                        {[
                            { label: t('expenses.fixedExpenses'), value: totalFixed, color: 'text-red-400', bg: 'bg-red-400', sign: '-' },
                            { label: t('expenses.categoryBudgetLimits'), value: totalCategoryBudgets, color: 'text-orange-400', bg: 'bg-orange-400', sign: '-' },
                            { label: t('expenses.estSavings'), value: availableForSavings, color: availableForSavings < 0 ? 'text-red-400' : 'text-green-500', bg: availableForSavings < 0 ? 'bg-red-400' : 'bg-green-500', sign: availableForSavings < 0 ? '' : '+' },
                        ].map((row) => (
                            <div key={row.label} className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <div className={`w-2 h-2 rounded-full ${row.bg}`} />
                                    <span className="text-slate-600 dark:text-slate-300 truncate">{row.label}</span>
                                </div>
                                <span className={`font-bold ml-2 ${row.color}`}>{row.sign}₹{Math.abs(row.value).toLocaleString('en-IN')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                className={`w-full py-4 rounded-2xl font-bold text-sm transition-all ${saved ? 'bg-brand-green text-white' : 'bg-brand-purple text-white shadow-lg shadow-brand-purple/30'}`}
            >
                {saved ? `✓ ${t('expenses.budgetSaved')}` : t('expenses.saveBudget')}
            </motion.button>

            {/* Mini Disclaimer Footer */}
            <div className="border-t border-gray-100 dark:border-white/5 py-3 px-4 text-center">
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('disclaimer.miniFooter')}</p>
            </div>
        </div>
    );
}
