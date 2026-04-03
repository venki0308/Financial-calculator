import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, Plus, CheckCircle2, ZapOff, ChevronLeft, ChevronRight, Activity, ChevronDown, ChevronUp, Edit2, Repeat, Target, PiggyBank, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBudgetTrackerStore, EXPENSE_CATEGORIES } from '../../store/useBudgetTrackerStore';
import { getCategoryDisplayName } from '../../utils/categoryUtils';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { generateInsights, getDailyNudges } from '../../services/InsightEngine';
import { calculateHealthScore } from '../../services/HealthScoreService';
import BottomSheet from '../../components/BottomSheet';

ChartJS.register(ArcElement, Tooltip, Legend);

const ASSET_FIELDS = [
    { key: 'bankBalance', label: 'Bank Balance' },
    { key: 'fd', label: 'Fixed Deposits' },
    { key: 'mutualFunds', label: 'Mutual Funds' },
    { key: 'gold', label: 'Gold' },
    { key: 'property', label: 'Property' },
    { key: 'otherAssets', label: 'Other Assets' },
];
const LIABILITY_FIELDS = [
    { key: 'homeLoan', label: 'Home Loan' },
    { key: 'carLoan', label: 'Car Loan' },
    { key: 'personalLoan', label: 'Personal Loan' },
    { key: 'creditCard', label: 'Credit Card Outstanding' },
];


const COLORS = [
    '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#3b82f6', '#ec4899', '#84cc16', '#f97316',
];

export default function DashboardTab({ onAddExpense, onViewAll, onViewSubs }: { onAddExpense: () => void, onViewAll: () => void, onViewSubs?: () => void }) {
    const { t } = useTranslation();
    const { monthlyIncome, entries, getTotalFixed, getEntriesByMonth, categoryBudgets, fixedExpenses, subscriptions, netWorthHistory, healthScore, setHealthScore, setInsights, insights, savingsGoal, monthlyBalances, setMonthlyBalance } = useBudgetTrackerStore();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const currentYear = selectedDate.getFullYear();
    const currentMonthNum = selectedDate.getMonth() + 1;
    const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

    const [selectedPieCategory, setSelectedPieCategory] = useState<string | null>(null);
    const [isNetWorthOpen, setIsNetWorthOpen] = useState(false);
    const [showNetWorthModal, setShowNetWorthModal] = useState(false);
    const [nwAssets, setNwAssets] = useState<Record<string, string>>({});
    const [nwLiabilities, setNwLiabilities] = useState<Record<string, string>>({});
    const addNetWorthSnapshot = useBudgetTrackerStore((s) => s.addNetWorthSnapshot);
    const [isEditSavingsOpen, setIsEditSavingsOpen] = useState(false);
    const [manualSavingsInput, setManualSavingsInput] = useState('');

    const monthEntries = useMemo(
        () => getEntriesByMonth(currentYear, currentMonthNum),
        [entries, currentYear, currentMonthNum, getEntriesByMonth]
    );

    useEffect(() => {
        // Generate insights and health score dynamically
        const newInsights = generateInsights(entries, monthlyIncome, fixedExpenses, categoryBudgets, currentMonthNum, currentYear, subscriptions);
        setInsights(newInsights);

        const newScore = calculateHealthScore(entries, monthlyIncome, fixedExpenses, categoryBudgets, currentMonthNum, currentYear, netWorthHistory, savingsGoal > 0 ? savingsGoal : undefined, monthlyBalances);
        setHealthScore(newScore);
    }, [entries, monthlyIncome, fixedExpenses, categoryBudgets, currentMonthNum, currentYear, subscriptions, netWorthHistory, savingsGoal, monthlyBalances, setInsights, setHealthScore]);

    // Option B: Auto-calculated cumulative savings from all tracked months
    const autoCalculatedSavings = useMemo(() => {
        return healthScore?.futureProjection?.autoCalculatedSavings ?? 0;
    }, [healthScore]);

    // Smart daily nudges
    const dailyNudges = useMemo(() => {
        return getDailyNudges(entries, monthlyIncome, fixedExpenses);
    }, [entries, monthlyIncome, fixedExpenses]);

    // Per-category budget progress
    const categoryBudgetProgress = useMemo(() => {
        const budgetMap = categoryBudgets as unknown as Record<string, number>;
        const catTotals: Record<string, number> = {};
        monthEntries.forEach(e => {
            const cat = e.category || e.categoryId || 'others';
            catTotals[cat] = (catTotals[cat] || 0) + e.amount;
        });
        return EXPENSE_CATEGORIES
            .map(cat => {
                const budget = budgetMap[cat.id] || 0;
                const spent = catTotals[cat.id] || 0;
                const pct = budget > 0 ? Math.min((spent / budget) * 100, 120) : 0;
                return { ...cat, budget, spent, pct };
            })
            .filter(c => c.budget > 0 || c.spent > 0);
    }, [monthEntries, categoryBudgets]);

    const changeMonth = (offset: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setSelectedDate(newDate);
    };

    // Bug 2 fix: Only show fixed expenses and income for months that have actual data
    const now = new Date();
    const isCurrentMonth = currentMonthNum === (now.getMonth() + 1) && currentYear === now.getFullYear();
    const hasMonthData = isCurrentMonth || monthEntries.length > 0;

    // Subscriptions: calculate active monthly equivalent
    const activeSubsMonthly = useMemo(() => {
        return subscriptions
            .filter(s => s.isActive)
            .reduce((sum, s) => {
                if (s.billingCycle === 'monthly') return sum + s.amount;
                if (s.billingCycle === 'quarterly') return sum + s.amount / 3;
                if (s.billingCycle === 'yearly') return sum + s.amount / 12;
                return sum;
            }, 0);
    }, [subscriptions]);

    const effectiveFixed = hasMonthData ? getTotalFixed() : 0;
    const effectiveIncome = hasMonthData ? monthlyIncome : 0;
    const totalFixed = effectiveFixed;
    const totalDaily = monthEntries.reduce((s, e) => s + e.amount, 0);
    const totalSpent = totalFixed + totalDaily + (hasMonthData ? activeSubsMonthly : 0);
    const savings = effectiveIncome - totalSpent;
    const savingsRate = effectiveIncome > 0 ? (savings / effectiveIncome) * 100 : 0;
    const available = effectiveIncome - totalSpent;
    const budgetUsePct = effectiveIncome > 0 ? (totalSpent / effectiveIncome) * 100 : 0;

    // ── Smart Per-Category Alerts ─────────────────────────────────────────────
    // Removed old static alerts, now using dynamic insights array from store.
    const activeInsights = insights.filter(i => !i.dismissed);

    // ── Net Worth Data ────────────────────────────────────────────────────────
    const availableNetWorths = netWorthHistory.filter(n => n.month <= currentMonthKey);
    const displayNetWorth = availableNetWorths.length > 0 ? availableNetWorths[availableNetWorths.length - 1] : null;
    const isCurrentMonthNetWorth = displayNetWorth?.month === currentMonthKey;


    // Category breakdown for pie chart
    const categoryTotals = useMemo(() => {
        const map: Record<string, number> = {};
        monthEntries.forEach((e) => {
            const cat = e.category || e.categoryId || 'others';
            map[cat] = (map[cat] || 0) + e.amount;
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
            borderWidth: categoryTotals.map((c) => selectedPieCategory === c.id ? 4 : 0),
            borderColor: '#7C3AED',
            hoverOffset: 6,
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
                <div className="flex justify-between items-center mb-1">
                    <p className="text-purple-100 text-xs font-semibold uppercase tracking-wider">
                        {t('expenses.totalSpentMonth')}
                    </p>
                    <div className="flex items-center gap-2 bg-white/20 rounded-full px-2 py-1">
                        <button onClick={() => changeMonth(-1)} className="p-0.5 text-foreground"><ChevronLeft size={14}/></button>
                        <span className="text-[10px] font-bold text-foreground min-w-[70px] text-center">
                            {selectedDate.toLocaleString(undefined, { month: 'short', year: 'numeric' })}
                        </span>
                        <button onClick={() => changeMonth(1)} disabled={selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear()} className="p-0.5 text-foreground disabled:opacity-30"><ChevronRight size={14}/></button>
                    </div>
                </div>
                <h2 className="text-4xl font-extrabold mb-0.5">₹{totalSpent.toLocaleString('en-IN')}</h2>

                {/* Budget progress bar */}
                <div className="mt-4 mb-2">
                    <div className="flex justify-between text-xs text-purple-200 mb-1">
                        <span>{t('expenses.budgetUsedLabel')}</span>
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
                    <div className="bg-white/10  rounded-2xl p-3 text-center">
                        <p className="text-purple-200 text-[10px] uppercase font-bold tracking-wider">{t('expenses.income')}</p>
                        <p className="text-foreground font-bold text-sm mt-0.5">₹{effectiveIncome.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-white/10  rounded-2xl p-3 text-center">
                        <p className="text-purple-200 text-[10px] uppercase font-bold tracking-wider">{t('expenses.savings')}</p>
                        <p className={`font-bold text-sm mt-0.5 ${savings < 0 ? 'text-red-300' : 'text-green-300'}`}>
                            ₹{Math.abs(savings).toLocaleString('en-IN')}
                        </p>
                    </div>
                    <div className="bg-white/10  rounded-2xl p-3 text-center">
                        <p className="text-purple-200 text-[10px] uppercase font-bold tracking-wider">{t('expenses.rate')}</p>
                        <p className={`font-bold text-sm mt-0.5 ${savingsRate < 0 ? 'text-red-300' : 'text-green-300'}`}>
                            {savingsRate.toFixed(0)}%
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Quick Stats */}
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: t('expenses.fixed'), value: totalFixed, icon: Wallet, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', metric: monthlyIncome > 0 ? (totalFixed / monthlyIncome) : 0 },
                    { label: t('expenses.daily'), value: totalDaily, icon: TrendingDown, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', metric: monthlyIncome > 0 ? (totalDaily / monthlyIncome) : 0 },
                    { label: t('expenses.available'), value: available, icon: TrendingUp, color: available < 0 ? 'text-red-400' : 'text-green-400', bg: available < 0 ? 'bg-red-500/10' : 'bg-green-500/10', border: available < 0 ? 'border-red-500/20' : 'border-green-500/20', metric: monthlyIncome > 0 ? (available / monthlyIncome) : 0 },
                ].map((stat) => (
                    <motion.div
                        key={stat.label}
                        whileTap={{ scale: 0.96 }}
                        className={`p-3 rounded-2xl ${stat.bg} border ${stat.border} flex flex-col gap-1 relative overflow-hidden`}
                    >
                        <div className="flex justify-between items-start">
                            <stat.icon size={14} className={stat.color} />
                            {stat.metric > 0 && (
                                <span className={`text-[9px] font-bold ${stat.color}`}>{(stat.metric * 100).toFixed(0)}%</span>
                            )}
                        </div>
                        <p className="text-slate-500 dark:text-muted-foreground text-[9px] font-semibold uppercase tracking-wider mt-1">{stat.label}</p>
                        <p className={`font-bold text-xs ${stat.color}`}>₹{Math.abs(stat.value).toLocaleString('en-IN')}</p>
                        {/* Mini progress bar */}
                        {stat.metric > 0 && <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full">
                            <div className="h-full bg-current opacity-40" style={{ width: `${Math.min(Math.abs(stat.metric) * 100, 100)}%`, color: stat.color.replace('text-', '') }} />
                        </div>}
                    </motion.div>
                ))}
            </div>

            {/* Financial Health Score — Enhanced */}
            {healthScore && (
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                    {healthScore.total < 0 || healthScore.total === 0 ? (
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                                {healthScore.total === -1 ? <ZapOff size={24} className="text-amber-500" /> : <Activity size={24} className="text-brand-purple" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-1">
                                    {healthScore.total === -1 ? 'Data Missing' : healthScore.total === -2 ? 'Continuity Required' : 'Score Unavailable'}
                                </h3>
                                <p className="text-xs text-slate-700 dark:text-slate-400">
                                    {healthScore.tips[0]}
                                </p>
                                {healthScore.tips[1] && (
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        {healthScore.tips[1]}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-slate-200 dark:text-slate-700" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path className={`${healthScore.total >= 80 ? 'text-green-500' : healthScore.total >= 60 ? 'text-yellow-500' : healthScore.total >= 40 ? 'text-orange-500' : 'text-red-500'}`} strokeDasharray={`${healthScore.total}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-lg font-bold text-slate-900 dark:text-foreground leading-none">{healthScore.total}</span>
                                    <span className="text-[8px] text-muted-foreground">/100</span>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h3 className="font-bold text-slate-900 dark:text-foreground text-sm">Financial Health</h3>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                        healthScore.total >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                        : healthScore.total >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                                        : healthScore.total >= 40 ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                                    }`}>
                                        {healthScore.total >= 80 ? 'Great' : healthScore.total >= 60 ? 'Good' : healthScore.total >= 40 ? 'Fair' : 'Poor'}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{healthScore.tips[1] || healthScore.tips[0]}</p>
                                {/* Sub-score mini bars */}
                                <div className="grid grid-cols-3 gap-1 mt-2">
                                    {[
                                        { label: 'Savings', val: healthScore.savingsScore, max: 40 },
                                        { label: 'Budget', val: healthScore.adherenceScore, max: 30 },
                                        { label: 'Consistent', val: healthScore.consistencyScore, max: 20 },
                                    ].map(s => (
                                        <div key={s.label}>
                                            <div className="flex justify-between text-[8px] text-slate-500 dark:text-muted-foreground mb-0.5">
                                                <span>{s.label}</span><span>{s.val}/{s.max}</span>
                                            </div>
                                            <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-brand-purple rounded-full" style={{ width: `${(s.val / s.max) * 100}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Future Projection */}
                                {healthScore.futureProjection && healthScore.futureProjection.annualSavings > 0 && (
                                    <p className="text-[10px] text-green-500 dark:text-green-400 font-semibold mt-2">
                                        📈 At this rate, you'll save ₹{healthScore.futureProjection.annualSavings.toLocaleString('en-IN')} in 12 months
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Savings Goal Tracker — Unified Source of Truth */}
            {(() => {
                const currentMonthBalance = monthlyBalances?.[currentMonthKey]?.manual ?? 0;
                const isManualMode = currentMonthBalance > 0;
                const primarySavings = isManualMode ? currentMonthBalance : autoCalculatedSavings;
                const progressPct = savingsGoal > 0 ? Math.min((primarySavings / savingsGoal) * 100, 100) : 0;

                if (!(savingsGoal > 0 || currentMonthBalance > 0 || autoCalculatedSavings > 0)) {
                    return null;
                }

                return (
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center">
                                <Target size={16} className="text-green-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-foreground text-sm">{t('home.savingsGoal', 'Savings Goal')}</h3>
                                {savingsGoal > 0 && (
                                    <p className="text-[10px] text-muted-foreground">{t('expenses.target', 'Target')}: ₹{savingsGoal.toLocaleString('en-IN')}</p>
                                )}
                            </div>
                            {healthScore?.futureProjection?.monthsToGoal && (
                                <span className="ml-auto text-[10px] font-bold text-brand-purple bg-brand-purple/10 px-2 py-1 rounded-full">
                                    ~{healthScore.futureProjection.monthsToGoal}m to goal
                                </span>
                            )}
                        </div>

                        {/* PRIMARY PROGRESS BAR */}
                        <div className="mb-3">
                            <div className="flex items-center gap-2 mb-1">
                                {isManualMode ? <PiggyBank size={12} className="text-blue-400" /> : <TrendingUp size={12} className="text-green-400" />}
                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    {isManualMode ? 'Current Balance (Manual)' : 'Tracked Savings'}
                                    <button 
                                        onClick={() => {
                                            setManualSavingsInput(currentMonthBalance.toString());
                                            setIsEditSavingsOpen(true);
                                        }}
                                        className="text-brand-purple hover:underline bg-brand-purple/10 px-1.5 py-0.5 rounded text-[9px] font-bold"
                                    >
                                        Edit
                                    </button>
                                </span>
                                <span className={`ml-auto text-[10px] font-bold ${isManualMode ? 'text-blue-500' : 'text-green-500'}`}>
                                    ₹{primarySavings.toLocaleString('en-IN')}
                                </span>
                            </div>
                            {savingsGoal > 0 && (
                                <>
                                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progressPct}%` }}
                                            transition={{ duration: 0.8 }}
                                            className={`h-full rounded-full ${isManualMode ? 'bg-blue-400' : 'bg-green-400'}`}
                                        />
                                    </div>
                                    <p className="text-[9px] text-muted-foreground mt-0.5 text-right">{progressPct.toFixed(1)}% of goal</p>
                                </>
                            )}
                        </div>

                        {/* SECONDARY REFERENCE */}
                        <div className="mt-2 bg-slate-50 dark:bg-white/5 rounded-lg p-2.5 flex items-start gap-2 border border-slate-100 dark:border-white/5">
                            <Lightbulb size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] text-slate-700 dark:text-slate-400 leading-snug">
                                {isManualMode 
                                    ? `Tracked savings based on your data: ₹${autoCalculatedSavings.toLocaleString('en-IN')}`
                                    : "Based on your tracked income & expenses"}
                            </p>
                        </div>
                    </div>
                );
            })()}

            {/* General Budget Alert */}
            {budgetUsePct >= 90 && monthlyIncome > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-500/10 border border-red-500/40 rounded-2xl p-4 flex gap-3"
                >
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-red-400 text-sm">{t('expenses.budgetAlertTitle')}</p>
                        <p className="text-xs text-red-600 dark:text-red-300/80 mt-0.5">
                            {t('expenses.budgetAlertMsg', { pct: budgetUsePct.toFixed(0) })}
                            {budgetUsePct >= 100 ? ` ${t('expenses.overspending')}` : ` ${t('expenses.slowDown')}`}
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Smart Per-Category Alerts */}
            {activeInsights.length > 0 && (
                <div className="flex overflow-x-auto gap-3 pb-2 snap-x hide-scrollbar">
                    {activeInsights.map((alert, i) => (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`min-w-[240px] rounded-2xl p-3 flex flex-col gap-2 border snap-center ${alert.type === 'alert'
                                ? 'bg-red-500/10 border-red-500/30'
                                : alert.type === 'warning'
                                    ? 'bg-yellow-500/10 border-yellow-500/30'
                                    : alert.type === 'tip'
                                        ? 'bg-blue-500/10 border-blue-500/30'
                                        : 'bg-green-500/10 border-green-500/30'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                {alert.type === 'success'
                                    ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                                    : alert.type === 'alert'
                                        ? <ZapOff className="w-4 h-4 text-red-400 flex-shrink-0" />
                                        : alert.type === 'tip'
                                            ? <Activity className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                            : <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                }
                                <span className="font-bold text-xs text-slate-800 dark:text-foreground">{alert.title}</span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-700 dark:text-slate-300 leading-snug">{alert.message}</p>
                            {alert.actionLabel && (
                                <button
                                    onClick={() => {
                                        if (alert.actionLabel === 'View Subs' && onViewSubs) {
                                            onViewSubs();
                                        }
                                    }}
                                    className="self-start mt-1 text-[10px] font-bold text-brand-purple bg-brand-purple/10 px-2 py-1 rounded-md"
                                >
                                    {alert.actionLabel}
                                </button>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}


            {/* Spending Breakdown Pie Chart */}
            {categoryTotals.length > 0 && (
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                    <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-4">{t('expenses.spendingBreakdown')}</h3>
                    <div className="flex flex-col items-center gap-4">
                        <div style={{ width: 200, height: 200 }}>
                            <Pie
                                data={pieData}
                                options={{
                                    responsive: true,
                                    onClick: (_, elements) => {
                                        if (elements.length > 0) {
                                            const idx = elements[0].index;
                                            const cat = categoryTotals[idx];
                                            setSelectedPieCategory(prev => prev === cat.id ? null : cat.id);
                                        } else {
                                            setSelectedPieCategory(null);
                                        }
                                    },
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
                            {categoryTotals.map((cat, i) => {
                                const isSelected = selectedPieCategory === cat.id;
                                return (
                                    <div 
                                        key={cat.id} 
                                        onClick={() => setSelectedPieCategory(prev => prev === cat.id ? null : cat.id)}
                                        className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-brand-purple/10 ring-1 ring-brand-purple scale-105' : 'hover:bg-slate-50 dark:hover:bg-white/5 opacity-80 hover:opacity-100'}`}
                                    >
                                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isSelected ? 'animate-pulse' : ''}`} style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <span className="text-[10px] text-muted-foreground dark:text-muted-foreground truncate">{cat.icon} {getCategoryDisplayName(cat.id)}</span>
                                        <span className={`text-[10px] font-bold ml-auto ${isSelected ? 'text-brand-purple' : 'text-slate-700 dark:text-foreground'}`}>₹{cat.total.toLocaleString('en-IN')}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Category Budget Progress Bars (Part 2 & 3) */}
            {categoryBudgetProgress.length > 0 && (
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                    <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-3">Budget Progress</h3>
                    <div className="space-y-3">
                        {categoryBudgetProgress.map(cat => {
                            const barColor = cat.pct >= 100 ? 'bg-red-500' : cat.pct >= 80 ? 'bg-amber-500' : 'bg-green-500';
                            const textColor = cat.pct >= 100 ? 'text-red-500' : cat.pct >= 80 ? 'text-amber-500' : 'text-green-500';
                            const statusLabel = cat.pct >= 120 ? `Over by ₹${(cat.spent - cat.budget).toLocaleString('en-IN')}` 
                                : cat.pct >= 100 ? 'Budget reached'
                                : cat.budget > 0 ? `₹${(cat.budget - cat.spent).toLocaleString('en-IN')} left`
                                : 'No budget set';
                            return (
                                <div key={cat.id}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold text-slate-700 dark:text-foreground">{cat.icon} {getCategoryDisplayName(cat.id)}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold ${textColor}`}>{cat.pct.toFixed(0)}%</span>
                                            <span className="text-[9px] text-muted-foreground">{statusLabel}</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(cat.pct, 100)}%` }}
                                            transition={{ duration: 0.6 }}
                                            className={`h-full rounded-full ${barColor}`}
                                        />
                                    </div>
                                    {cat.budget > 0 && (
                                        <div className="flex justify-between mt-0.5">
                                            <span className="text-[9px] text-muted-foreground">₹{cat.spent.toLocaleString('en-IN')} spent</span>
                                            <span className="text-[9px] text-muted-foreground">₹{cat.budget.toLocaleString('en-IN')} budget</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Net Worth Tracker Collapsible */}
            {netWorthHistory && (
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                    <button 
                        onClick={() => setIsNetWorthOpen(!isNetWorthOpen)}
                        className="w-full flex justify-between items-center p-4 focus:outline-none"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <TrendingUp size={16} />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-slate-900 dark:text-foreground text-sm">Net Worth</h3>
                                <p className="text-[10px] text-muted-foreground">Assets vs Liabilities</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-foreground">
                                ₹{displayNetWorth ? displayNetWorth.netWorth.toLocaleString('en-IN') : '0'}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    
                                    const mappedAssets: Record<string, string> = {};
                                    if (displayNetWorth) {
                                        displayNetWorth.assets?.forEach(a => {
                                            const field = ASSET_FIELDS.find(f => f.label === a.label);
                                            if (field) mappedAssets[field.key] = String(a.value);
                                        });
                                    }
                                    setNwAssets(mappedAssets);
                                    
                                    const mappedLiab: Record<string, string> = {};
                                    if (displayNetWorth) {
                                        displayNetWorth.liabilities?.forEach(l => {
                                            const field = LIABILITY_FIELDS.find(f => f.label === l.label);
                                            if (field) mappedLiab[field.key] = String(l.value);
                                        });
                                    }
                                    setNwLiabilities(mappedLiab);
                                    
                                    setShowNetWorthModal(true);
                                }}
                                className="p-1 text-muted-foreground hover:text-brand-purple focus:outline-none"
                            >
                                <Edit2 size={16} />
                            </button>
                            {isNetWorthOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                        </div>
                    </button>
                    
                    <AnimatePresence>
                        {isNetWorthOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-4 pb-4 border-t border-slate-100 dark:border-white/5"
                            >
                                {!displayNetWorth ? (
                                    <div className="text-center py-4 text-muted-foreground text-xs">
                                        {t('expenses.noData')}
                                        <button onClick={() => setShowNetWorthModal(true)} className="text-brand-purple block mx-auto mt-2 font-semibold">
                                            {t('expenses.updateNetWorth')}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="pt-4 grid grid-cols-2 gap-4">
                                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{t('expenses.totalAssets')}</p>
                                                <p className="font-bold text-green-500 text-sm">₹{displayNetWorth.totalAssets.toLocaleString('en-IN')}</p>
                                            </div>
                                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{t('expenses.totalLiabilities')}</p>
                                                <p className="font-bold text-red-500 text-sm">₹{displayNetWorth.totalLiabilities.toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>
                                        {!isCurrentMonthNetWorth && (
                                            <div className="mt-3 text-center text-[10px] text-muted-foreground">
                                                Showing historical net worth from {new Date(displayNetWorth.month + '-01').toLocaleString(undefined, { month: 'short', year: 'numeric' })}.
                                            </div>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Subscriptions Summary Row */}
            {subscriptions.filter(s => s.isActive).length > 0 && (() => {
                const activeSubs = subscriptions.filter(s => s.isActive);
                const subMonthlyTotal = activeSubs.reduce((sum, s) => sum + Math.round(s.billingCycle === 'monthly' ? s.amount : s.amount / 12), 0);
                const nextRenewal = [...activeSubs].sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())[0];
                return (
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                <Repeat size={16} />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-slate-900 dark:text-foreground text-sm">Subscriptions</h3>
                                <p className="text-[10px] text-muted-foreground">{activeSubs.length} Active • Next: {new Date(nextRenewal.nextDueDate).toLocaleDateString('en-IN')}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="font-bold text-slate-900 dark:text-foreground block">
                                ₹{subMonthlyTotal.toLocaleString('en-IN')}<span className="text-[10px] text-muted-foreground font-normal">/mo</span>
                            </span>
                            {onViewSubs && (
                                <button onClick={onViewSubs} className="text-[10px] font-bold text-brand-purple hover:underline mt-0.5">
                                    Manage
                                </button>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Recent Transactions */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-900 dark:text-foreground text-sm">{t('expenses.recentExpenses')}</h3>
                    <button onClick={onViewAll} className="text-brand-purple text-xs font-semibold">{t('home.viewAll')}</button>
                </div>
                {recentExpenses.length === 0 ? (
                    <div className="py-5">
                        <div className="text-center mb-3">
                            <Wallet className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
                            <p className="text-muted-foreground text-sm">{t('expenses.noExpensesMonth')}</p>
                        </div>
                        {/* Smart Daily Nudges (Part 6) */}
                        {dailyNudges.length > 0 && (
                            <div className="space-y-2 mb-3">
                                {dailyNudges.map((nudge, i) => (
                                    <div key={i} className="bg-brand-purple/5 border border-brand-purple/20 rounded-xl px-3 py-2">
                                        <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">{nudge}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button
                            onClick={onAddExpense}
                            className="mt-1 flex items-center gap-1 text-brand-purple text-xs font-semibold mx-auto"
                        >
                            <Plus size={12} /> {t('expenses.addFirst')}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentExpenses.map((exp) => {
                            const cat = EXPENSE_CATEGORIES.find((c) => c.id === (exp.category || exp.categoryId));
                            return (
                                <div key={exp.id} className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-brand-purple/10 flex items-center justify-center text-base flex-shrink-0">
                                        {cat?.icon || '📌'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-800 dark:text-foreground text-xs font-semibold truncate">{exp.description || getCategoryDisplayName(cat?.id || 'others')}</p>
                                        <p className="text-muted-foreground text-[10px]">
                                            {new Date(exp.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                        </p>
                                    </div>
                                    <p className="text-red-400 font-bold text-sm">-₹{exp.amount.toLocaleString('en-IN')}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>



            {/* Net Worth Bottom Sheet Modal */}
            <BottomSheet
                isOpen={showNetWorthModal}
                onClose={() => setShowNetWorthModal(false)}
                title=""
                footer={
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                            const assets = ASSET_FIELDS.map(f => ({ label: f.label, value: Number(nwAssets[f.key]) || 0 }));
                            const liabilities = LIABILITY_FIELDS.map(f => ({ label: f.label, value: Number(nwLiabilities[f.key]) || 0 }));
                            const totalAssets = assets.reduce((s, a) => s + a.value, 0);
                            const totalLiabilities = liabilities.reduce((s, l) => s + l.value, 0);
                            const netWorth = totalAssets - totalLiabilities;
                            const month = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
                            addNetWorthSnapshot({ month, assets, liabilities, totalAssets, totalLiabilities, netWorth });
                            setShowNetWorthModal(false);
                            setNwAssets({});
                            setNwLiabilities({});
                        }}
                        className="w-full py-4 rounded-xl bg-brand-purple text-white font-bold text-base"
                        style={{ minHeight: 52 }}
                    >
                        Apply
                    </motion.button>
                }
            >
                {/* Fixed header */}
                <div className="pb-3 flex items-center justify-between flex-shrink-0">
                    <h3 className="text-foreground font-semibold text-base">{t('expenses.updateNetWorth')}</h3>
                    <button onClick={() => setShowNetWorthModal(false)} className="p-1.5 rounded-xl bg-muted text-muted-foreground">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div className="h-px bg-border mb-4" />

                {/* Assets Section */}
                <div className="mb-4">
                    <p className="text-green-500 text-xs font-bold uppercase tracking-wider mb-2">{t('expenses.assets')}</p>
                    <div className="space-y-2">
                        {ASSET_FIELDS.map(f => (
                            <div key={f.key} className="flex items-center gap-3">
                                <span className="text-muted-foreground text-xs w-28 flex-shrink-0">{f.label}</span>
                                <div className="flex-1 relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                                    <input type="number" value={nwAssets[f.key] || ''} onChange={e => setNwAssets(prev => ({ ...prev, [f.key]: e.target.value }))}
                                        className="w-full pl-7 pr-3 py-2.5 bg-card border-border border border-slate-600 rounded-xl text-foreground text-sm focus:outline-none focus:border-green-500" placeholder="0" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Liabilities Section */}
                <div className="mb-2">
                    <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">{t('expenses.liabilities')}</p>
                    <div className="space-y-2">
                        {LIABILITY_FIELDS.map(f => (
                            <div key={f.key} className="flex items-center gap-3">
                                <span className="text-muted-foreground text-xs w-28 flex-shrink-0">{f.label}</span>
                                <div className="flex-1 relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                                    <input type="number" value={nwLiabilities[f.key] || ''} onChange={e => setNwLiabilities(prev => ({ ...prev, [f.key]: e.target.value }))}
                                        className="w-full pl-7 pr-3 py-2.5 bg-card border-border border border-slate-600 rounded-xl text-foreground text-sm focus:outline-none focus:border-red-500" placeholder="0" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </BottomSheet>
            
            {/* Edit Savings Goal Balance Sheet */}
            <BottomSheet
                isOpen={isEditSavingsOpen}
                onClose={() => setIsEditSavingsOpen(false)}
                title=""
                footer={
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            const parsed = parseInt(manualSavingsInput, 10);
                            if (!isNaN(parsed) && parsed >= 0) {
                                setMonthlyBalance(currentMonthKey, parsed, autoCalculatedSavings);
                            }
                            setIsEditSavingsOpen(false);
                        }}
                        className="w-full py-4 rounded-xl bg-brand-purple text-white font-bold text-base"
                        style={{ minHeight: 52 }}
                    >
                        Save Balance
                    </motion.button>
                }
            >
                <div className="pb-3 flex items-center justify-between flex-shrink-0">
                    <h3 className="text-foreground font-semibold text-base">Edit Savings Balance</h3>
                    <button onClick={() => setIsEditSavingsOpen(false)} className="p-1.5 rounded-xl bg-muted text-muted-foreground">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div className="h-px bg-border mb-4" />

                <div className="mb-4">
                    <p className="text-muted-foreground text-sm mb-4">
                        Set a manual balance to track money saved outside of fincalix. To use auto-tracking, set the balance to 0.
                    </p>
                    <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-bold">₹</span>
                        <input 
                            type="number" 
                            value={manualSavingsInput} 
                            onChange={e => setManualSavingsInput(e.target.value)}
                            className="w-full pl-8 pr-3 py-4 bg-card border-border border border-slate-600 rounded-xl text-foreground text-lg font-bold focus:outline-none focus:border-brand-purple" 
                            placeholder="0" 
                            autoFocus
                        />
                    </div>
                </div>
            </BottomSheet>

        </div>
    );
}
