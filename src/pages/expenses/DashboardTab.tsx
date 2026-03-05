import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, Plus } from 'lucide-react';
import { useBudgetTrackerStore, EXPENSE_CATEGORIES } from '../../store/useBudgetTrackerStore';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = [
    '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#3b82f6', '#ec4899', '#84cc16', '#f97316',
];

export default function DashboardTab({ onAddExpense }: { onAddExpense: () => void }) {
    const navigate = useNavigate();
    const { monthlyIncome, entries, getTotalFixed, getEntriesByMonth } = useBudgetTrackerStore();

    const now = new Date();
    const monthEntries = useMemo(
        () => getEntriesByMonth(now.getFullYear(), now.getMonth() + 1),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [entries, now.getFullYear(), now.getMonth()]
    );

    const totalFixed = getTotalFixed();
    const totalDaily = monthEntries.reduce((s, e) => s + e.amount, 0);
    const totalSpent = totalFixed + totalDaily;
    const savings = monthlyIncome - totalSpent;
    const savingsRate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;
    const available = monthlyIncome - totalSpent;
    const budgetUsePct = monthlyIncome > 0 ? (totalSpent / monthlyIncome) * 100 : 0;

    // Category breakdown for pie chart
    const categoryTotals = useMemo(() => {
        const map: Record<string, number> = {};
        monthEntries.forEach((e) => {
            map[e.categoryId] = (map[e.categoryId] || 0) + e.amount;
        });
        return Object.entries(map)
            .map(([id, total]) => {
                const cat = EXPENSE_CATEGORIES.find((c) => c.id === id);
                return { id, name: cat?.name || id, icon: cat?.icon || '📌', total };
            })
            .sort((a, b) => b.total - a.total);
    }, [monthEntries]);

    const pieData = {
        labels: categoryTotals.map((c) => `${c.icon} ${c.name}`),
        datasets: [{
            data: categoryTotals.map((c) => c.total),
            backgroundColor: COLORS,
            borderWidth: 0,
        }],
    };

    const recentExpenses = [...monthEntries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ).slice(0, 5);

    return (
        <div className="space-y-4 pb-6">
            {/* Main Summary Hero Card */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-brand-purple via-purple-600 to-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-purple-800/30"
            >
                <p className="text-purple-100 text-xs font-semibold uppercase tracking-wider mb-1">
                    {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </p>
                <h2 className="text-4xl font-extrabold mb-0.5">₹{totalSpent.toLocaleString('en-IN')}</h2>
                <p className="text-purple-200 text-sm">Total Spent This Month</p>

                {/* Budget progress bar */}
                <div className="mt-4 mb-2">
                    <div className="flex justify-between text-xs text-purple-200 mb-1">
                        <span>Budget used</span>
                        <span>{budgetUsePct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(budgetUsePct, 100)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full ${budgetUsePct > 90 ? 'bg-red-400' : budgetUsePct > 70 ? 'bg-yellow-400' : 'bg-green-400'}`}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
                        <p className="text-purple-200 text-[10px] uppercase font-bold tracking-wider">Income</p>
                        <p className="text-white font-bold text-sm mt-0.5">₹{monthlyIncome.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
                        <p className="text-purple-200 text-[10px] uppercase font-bold tracking-wider">Savings</p>
                        <p className={`font-bold text-sm mt-0.5 ${savings < 0 ? 'text-red-300' : 'text-green-300'}`}>
                            ₹{Math.abs(savings).toLocaleString('en-IN')}
                        </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
                        <p className="text-purple-200 text-[10px] uppercase font-bold tracking-wider">Rate</p>
                        <p className={`font-bold text-sm mt-0.5 ${savingsRate < 0 ? 'text-red-300' : 'text-green-300'}`}>
                            {savingsRate.toFixed(0)}%
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Fixed', value: totalFixed, icon: Wallet, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                    { label: 'Daily', value: totalDaily, icon: TrendingDown, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
                    { label: 'Available', value: available, icon: TrendingUp, color: available < 0 ? 'text-red-400' : 'text-green-400', bg: available < 0 ? 'bg-red-500/10' : 'bg-green-500/10', border: available < 0 ? 'border-red-500/20' : 'border-green-500/20' },
                ].map((stat) => (
                    <motion.div
                        key={stat.label}
                        whileTap={{ scale: 0.96 }}
                        className={`p-3 rounded-2xl ${stat.bg} border ${stat.border} flex flex-col gap-1`}
                    >
                        <stat.icon size={16} className={stat.color} />
                        <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">{stat.label}</p>
                        <p className={`font-bold text-sm ${stat.color}`}>₹{Math.abs(stat.value).toLocaleString('en-IN')}</p>
                    </motion.div>
                ))}
            </div>

            {/* Budget Alert */}
            {budgetUsePct >= 90 && monthlyIncome > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-500/10 border border-red-500/40 rounded-2xl p-4 flex gap-3"
                >
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-red-400 text-sm">Budget Alert!</p>
                        <p className="text-xs text-red-300/80 mt-0.5">
                            You've used {budgetUsePct.toFixed(0)}% of your monthly budget.
                            {budgetUsePct >= 100 ? ' You are overspending!' : ' Slow down your spending.'}
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Spending Breakdown Pie Chart */}
            {categoryTotals.length > 0 && (
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Spending Breakdown</h3>
                    <div className="flex flex-col items-center gap-4">
                        <div style={{ width: 200, height: 200 }}>
                            <Pie
                                data={pieData}
                                options={{
                                    responsive: true,
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            callbacks: {
                                                label: (ctx) => ` ₹${ctx.parsed.toLocaleString('en-IN')}`,
                                            },
                                        },
                                    },
                                }}
                            />
                        </div>
                        <div className="w-full grid grid-cols-2 gap-x-4 gap-y-2">
                            {categoryTotals.map((cat, i) => (
                                <div key={cat.id} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{cat.icon} {cat.name}</span>
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-white ml-auto">₹{cat.total.toLocaleString('en-IN')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Transactions */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Recent Expenses</h3>
                    <button onClick={() => navigate('/expenses')} className="text-brand-purple text-xs font-semibold">View All</button>
                </div>
                {recentExpenses.length === 0 ? (
                    <div className="text-center py-6">
                        <Wallet className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-slate-400 text-sm">No expenses yet this month</p>
                        <button
                            onClick={onAddExpense}
                            className="mt-3 flex items-center gap-1 text-brand-purple text-xs font-semibold mx-auto"
                        >
                            <Plus size={12} /> Add Your First Expense
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentExpenses.map((exp) => {
                            const cat = EXPENSE_CATEGORIES.find((c) => c.id === exp.categoryId);
                            return (
                                <div key={exp.id} className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-brand-purple/10 flex items-center justify-center text-base flex-shrink-0">
                                        {cat?.icon || '📌'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-800 dark:text-white text-xs font-semibold truncate">{exp.description || cat?.name || 'Expense'}</p>
                                        <p className="text-slate-400 text-[10px]">
                                            {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        </p>
                                    </div>
                                    <p className="text-red-400 font-bold text-sm">-₹{exp.amount.toLocaleString('en-IN')}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
