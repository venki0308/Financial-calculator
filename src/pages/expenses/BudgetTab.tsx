import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useBudgetTrackerStore, EXPENSE_CATEGORIES } from '../../store/useBudgetTrackerStore';

const FIXED_FIELDS: { key: 'rent' | 'utilities' | 'mobile' | 'insurance' | 'emi'; label: string; icon: string }[] = [
    { key: 'rent', label: 'Rent / EMI', icon: '🏠' },
    { key: 'utilities', label: 'Electricity & Gas', icon: '💡' },
    { key: 'mobile', label: 'Mobile & Internet', icon: '📱' },
    { key: 'insurance', label: 'Insurance', icon: '🛡️' },
    { key: 'emi', label: 'Loan EMI', icon: '🏦' },
];

export default function BudgetTab() {
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
                    💰 Monthly Income
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
                        <p className="font-bold text-slate-900 dark:text-white text-sm text-left">Fixed Monthly Expenses</p>
                        <p className="text-slate-400 text-xs mt-0.5 text-left">Rent, bills & EMIs</p>
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
                                    <div key={field.key} className="flex items-center gap-3">
                                        <span className="text-xl w-8">{field.icon}</span>
                                        <div className="flex-1">
                                            <p className="text-slate-700 dark:text-slate-300 text-xs font-medium mb-1">{field.label}</p>
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
                                            <button onClick={() => setShowAddFixed(false)} className="flex-1 py-2 rounded-lg text-slate-500 text-sm font-medium bg-slate-100 dark:bg-slate-700">Cancel</button>
                                            <button
                                                onClick={() => { if (newFixedLabel && newFixedAmount) { addCustomFixed(newFixedLabel, Number(newFixedAmount)); setNewFixedLabel(''); setNewFixedAmount(''); setShowAddFixed(false); } }}
                                                className="flex-1 py-2 rounded-lg bg-brand-purple text-white text-sm font-bold"
                                            >Add</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowAddFixed(true)}
                                        className="flex items-center gap-2 text-brand-purple text-xs font-semibold pt-1"
                                    >
                                        <Plus size={14} /> Add Other Fixed Expense
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
                        <p className="font-bold text-slate-900 dark:text-white text-sm text-left">Category Budget Limits</p>
                        <p className="text-slate-400 text-xs mt-0.5 text-left">Daily spending limits per category</p>
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
                            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-white/10 pt-3">
                                {EXPENSE_CATEGORIES.map((cat) => {
                                    const key = cat.id as keyof typeof categoryBudgets;
                                    return (
                                        <div key={cat.id} className="flex items-center gap-3">
                                            <span className="text-xl w-8">{cat.icon}</span>
                                            <div className="flex-1">
                                                <p className="text-slate-700 dark:text-slate-300 text-xs font-medium mb-1">{cat.name}</p>
                                                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2">
                                                    <span className="text-slate-400 text-sm">₹</span>
                                                    <input
                                                        type="number"
                                                        value={categoryBudgets[key] || ''}
                                                        onChange={(e) => setCategoryBudgets({ [key]: Number(e.target.value) })}
                                                        placeholder="0"
                                                        className="flex-1 bg-transparent text-slate-900 dark:text-white text-sm font-semibold outline-none"
                                                    />
                                                </div>
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
            <div className="bg-gradient-to-br from-brand-purple/10 to-blue-600/10 border border-brand-purple/20 rounded-2xl p-4 space-y-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Monthly Summary</h3>
                {[
                    { label: 'Monthly Income', value: monthlyIncome, color: 'text-brand-green', sign: '+' },
                    { label: 'Fixed Expenses', value: totalFixed, color: 'text-red-400', sign: '-' },
                    { label: 'Category Budgets', value: totalCategoryBudgets, color: 'text-orange-400', sign: '-' },
                ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 text-sm">{row.label}</span>
                        <span className={`font-bold text-sm ${row.color}`}>{row.sign}₹{row.value.toLocaleString('en-IN')}</span>
                    </div>
                ))}
                <div className="border-t border-brand-purple/20 pt-2 flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">Est. Savings</span>
                    <span className={`font-extrabold text-lg ${availableForSavings < 0 ? 'text-red-400' : 'text-brand-green'}`}>
                        ₹{availableForSavings.toLocaleString('en-IN')}
                    </span>
                </div>
            </div>

            {/* Save Button */}
            <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                className={`w-full py-4 rounded-2xl font-bold text-sm transition-all ${saved ? 'bg-brand-green text-white' : 'bg-brand-purple text-white shadow-lg shadow-brand-purple/30'}`}
            >
                {saved ? '✓ Budget Saved!' : 'Save Budget'}
            </motion.button>
        </div>
    );
}
