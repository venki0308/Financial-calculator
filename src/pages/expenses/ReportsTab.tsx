import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBudgetTrackerStore, EXPENSE_CATEGORIES } from '../../store/useBudgetTrackerStore';
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend,
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, Title,
} from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';
import { exportExpenseReportPDF, ExpenseReportData } from '../../utils/exportUtils';

ChartJS.register(
    ArcElement, Tooltip, Legend,
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, Title
);

const COLORS = [
    '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#3b82f6', '#ec4899', '#84cc16', '#f97316',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ReportsTab() {
    const { t } = useTranslation();
    const { monthlyIncome, entries, getTotalFixed, getEntriesByMonth, categoryBudgets, netWorthHistory, insights, subscriptions } = useBudgetTrackerStore();

    const pieChartRef = useRef<any>(null);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [period, setPeriod] = useState<'month' | 'year'>('month');

    const monthEntries = useMemo(
        () => getEntriesByMonth(selectedYear, selectedMonth),
        [entries, selectedYear, selectedMonth]
    );

    const yearEntries = useMemo(
        () => entries.filter((e) => new Date(e.date).getFullYear() === selectedYear),
        [entries, selectedYear]
    );

    // Architect fix: fixed expenses are a recurring monthly BUDGET.
    // They should only apply to the CURRENT month, or to past/future months
    // that have actual daily entries (confirming activity happened).
    // For months with zero daily entries that aren't the current month → treat as no data.
    const isCurrentMonth = selectedMonth === currentMonth && selectedYear === currentYear;
    const activeEntries = period === 'month' ? monthEntries : yearEntries;

    // Strict logic: 
    // - If current month, show data if income or fixed budget is set.
    // - If NOT current month, show ONLY if there are ACTUAL daily entries.
    const hasMonthData = (isCurrentMonth && (monthlyIncome > 0 || getTotalFixed() > 0)) || monthEntries.length > 0;
    const hasYearData = yearEntries.length > 0;
    const hasData = period === 'month' ? hasMonthData : hasYearData;

    // Subscriptions: calculate monthly equivalent
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

    const effectiveFixed = period === 'month'
        ? (hasMonthData ? getTotalFixed() : 0)
        : (hasYearData ? getTotalFixed() * 12 : 0);
    const totalFixed = effectiveFixed;
    const totalDaily = activeEntries.reduce((s, e) => s + e.amount, 0);
    const totalSubs = period === 'month' ? activeSubsMonthly : activeSubsMonthly * 12;
    const totalExpenses = totalFixed + totalDaily + (hasData ? totalSubs : 0);
    const income = (period === 'month' ? (hasMonthData ? monthlyIncome : 0) : (hasYearData ? monthlyIncome * 12 : 0));
    const savings = income - totalExpenses;
    const savingsRate = income > 1 ? (savings / income) * 100 : 0;

    // Category breakdown
    const categoryData = useMemo(() => {
        const map: Record<string, number> = {};
        activeEntries.forEach((e) => { map[e.categoryId] = (map[e.categoryId] || 0) + e.amount; });
        return Object.entries(map)
            .map(([id, total]) => {
                const cat = EXPENSE_CATEGORIES.find((c) => c.id === id);
                return { id, name: t(`expenses.categories.${id}`), icon: cat?.icon || '📌', total };
            })
            .sort((a, b) => b.total - a.total);
    }, [activeEntries, t]);

    // Daily Trend
    const dailyTrend = useMemo(() => {
        const map: Record<string, number> = {};
        monthEntries.forEach((e) => {
            const day = new Date(e.date).getDate().toString().padStart(2, '0');
            map[day] = (map[day] || 0) + e.amount;
        });
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => {
            const day = (i + 1).toString().padStart(2, '0');
            return { day, amount: map[day] || 0 };
        });
    }, [monthEntries, selectedYear, selectedMonth]);

    // Budget vs Actual
    const budgetVsActual = useMemo(() => {
        return EXPENSE_CATEGORIES.map((cat) => {
            const budget = (categoryBudgets as unknown as Record<string, number>)[cat.id] || 0;
            const actual = activeEntries.filter((e) => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0);
            return { category: cat.icon + ' ' + t(`expenses.categories.${cat.id}`).split(' ')[0], budget, actual };
        }).filter((row) => row.budget > 0 || row.actual > 0);
    }, [activeEntries, categoryBudgets, t]);

    // 6-Month Savings Trend
    const savingsTrend = useMemo(() => {
        const trend = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth - 1 - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const msEntries = entries.filter((e) => {
                const date = new Date(e.date);
                return date.getFullYear() === y && date.getMonth() + 1 === m;
            });
            const spent = msEntries.reduce((s, e) => s + e.amount, 0) + getTotalFixed();
            const hasMonthActive = (y === currentYear && m === currentMonth) || msEntries.length > 0;
            const inc = hasMonthActive ? monthlyIncome : 0;
            const saved = inc - spent;
            trend.push({ month: MONTHS[m - 1], saved, hasData: hasMonthActive });
        }
        return trend;
    }, [entries, currentMonth, currentYear, monthlyIncome, getTotalFixed]);

    const maxCategoryTotal = categoryData.length > 0 ? categoryData[0].total : 0;

    const handleDownloadPDF = async () => {
        let chartImage: string | undefined;
        if (pieChartRef.current) {
            chartImage = pieChartRef.current.toBase64Image();
        }

        const reportData: ExpenseReportData = {
            periodLabel: period === 'month' ? `${MONTHS[selectedMonth - 1]} ${selectedYear}` : `${selectedYear}`,
            income,
            expenses: totalExpenses,
            savings,
            savingsRate,
            categoryData: categoryData.map((c) => ({
                name: `${c.icon} ${c.name}`,
                total: c.total,
                percentage: totalDaily > 0 ? (c.total / totalDaily) * 100 : 0
            })),
            savingsTrend: savingsTrend,
            budgetVsActual: budgetVsActual.map(b => ({
                category: b.category,
                budget: b.budget,
                actual: b.actual
            })),
            chartImage,
            netWorth: netWorthHistory.length > 0 ? netWorthHistory[netWorthHistory.length - 1].netWorth : undefined,
            insights: insights.filter(i => !i.dismissed).map(i => i.title + ': ' + i.message)
        };

        await exportExpenseReportPDF(reportData);
    };

    const hexToRgb = (hex: string): [number, number, number] => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    };

    return (
        <div className="space-y-5 pb-6">
            {/* Period Toggle */}
            <div className="flex gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
                {(['month', 'year'] as const).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg capitalize transition-all ${period === p ? 'bg-brand-purple text-white shadow' : 'text-slate-400'}`}
                    >
                        {p === 'month' ? `${t(`expenses.periodMonth`)}: ${MONTHS[selectedMonth - 1]} ${selectedYear}` : `${t(`expenses.periodYear`)}: ${selectedYear}`}
                    </button>
                ))}
            </div>

            {/* Month / Year Selectors */}
            {period === 'month' ? (
                <div className="flex gap-2">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-white outline-none"
                    >
                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-white outline-none"
                    >
                        {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            ) : (
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-white outline-none"
                >
                    {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
            )}

            {/* Empty state: month with no activity and not current month */}
            {!hasData ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <span className="text-4xl">📭</span>
                    </div>
                    <h3 className="text-slate-800 dark:text-white font-bold text-base mb-2">
                        No data for {MONTHS[selectedMonth - 1]} {selectedYear}
                    </h3>
                    <p className="text-slate-500 text-sm text-center leading-relaxed">
                        No expenses were recorded for this month.<br />
                        Go to the <span className="font-semibold text-brand-purple">Daily tab</span> to add expenses.
                    </p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: t('expenses.income'), value: income, icon: TrendingUp, color: 'text-brand-green', bg: 'bg-brand-green/10' },
                            { label: t('expenses.expenses'), value: totalExpenses, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10' },
                            { label: t('expenses.savings'), value: savings, icon: PiggyBank, color: savings < 0 ? 'text-red-400' : 'text-blue-400', bg: 'bg-blue-500/10' },
                            { label: t('expenses.rate'), value: null, icon: TrendingUp, color: savingsRate < 0 ? 'text-red-400' : 'text-brand-purple', bg: 'bg-brand-purple/10', label2: `${savingsRate.toFixed(1)}%` },
                        ].map((card) => (
                            <div key={card.label} className={`${card.bg} rounded-2xl p-4`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <card.icon size={14} className={card.color} />
                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{card.label}</span>
                                </div>
                                <p className={`font-extrabold text-lg ${card.color}`}>
                                    {card.label2 || `₹${Math.abs(card.value!).toLocaleString('en-IN')}`}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Notice: fixed expenses present but no daily entries this month */}
                    {totalFixed > 0 && activeEntries.length === 0 && period === 'month' && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-400/20">
                            <span className="text-xl">ℹ️</span>
                            <div>
                                <p className="text-blue-800 dark:text-blue-300 font-semibold text-xs mb-0.5">
                                    Fixed expenses included
                                </p>
                                <p className="text-blue-600 dark:text-blue-400 text-xs leading-relaxed">
                                    Your ₹{totalFixed.toLocaleString('en-IN')} budget is shown above.
                                    No daily expense entries for <strong>{MONTHS[selectedMonth - 1]} {selectedYear}</strong> yet —
                                    add daily spends in the <strong>Daily tab</strong> to see spending charts.
                                </p>
                            </div>
                        </div>
                    )}


                    {categoryData.length > 0 && (
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">{t('expenses.spendingByCategory')}</h3>
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-full h-56 relative flex items-center justify-center">
                                    <Pie
                                        ref={pieChartRef}
                                        data={{
                                            labels: categoryData.map((c) => `${c.icon} ${c.name}`),
                                            datasets: [{ data: categoryData.map((c) => c.total), backgroundColor: COLORS, borderWidth: 2, borderColor: '#ffffff10' }],
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ₹${ctx.parsed.toLocaleString('en-IN')}` } } },
                                        }}
                                    />
                                </div>
                                <div className="w-full space-y-2">
                                    {categoryData.map((cat, i) => (
                                        <div key={cat.id} className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            <span className="text-slate-600 dark:text-slate-400 text-xs flex-1">{cat.icon} {cat.name}</span>
                                            <span className="text-slate-800 dark:text-white text-xs font-bold">₹{cat.total.toLocaleString('en-IN')}</span>
                                            <span className="text-slate-400 text-[10px] w-10 text-right">{totalDaily > 0 ? ((cat.total / totalDaily) * 100).toFixed(0) : 0}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Daily Spending Trend - Line Chart */}
                    {period === 'month' && monthEntries.length > 0 && (
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">{t('expenses.dailyTrend')}</h3>
                            <Line
                                data={{
                                    labels: dailyTrend.map(d => d.day),
                                    datasets: [{
                                        label: 'Amount',
                                        data: dailyTrend.map(d => d.amount),
                                        borderColor: '#8b5cf6',
                                        backgroundColor: 'rgba(139,92,246,0.1)',
                                        fill: true,
                                        tension: 0.4,
                                        pointBackgroundColor: '#8b5cf6',
                                        pointRadius: (ctx) => (ctx.raw as number) > 0 ? 4 : 0,
                                        pointHoverRadius: 6,
                                    }],
                                }}
                                options={{
                                    responsive: true,
                                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ₹${(ctx.parsed.y ?? ctx.parsed).toLocaleString('en-IN')}` } } },
                                    scales: {
                                        x: { grid: { display: false } },
                                        y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.1)' } }
                                    },
                                }}
                            />
                        </div>
                    )}

                    {/* Savings Trend 6-month */}
                    {savingsTrend.filter(t => t.hasData).length > 0 && (
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Savings Trend (6 Months)</h3>
                            <Bar
                                data={{
                                    labels: savingsTrend.map(t => t.month),
                                    datasets: [{
                                        label: 'Saved',
                                        data: savingsTrend.map(t => t.saved),
                                        backgroundColor: savingsTrend.map(t => t.saved >= 0 ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.8)'),
                                        borderRadius: 4
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ₹${(ctx.parsed.y ?? ctx.parsed).toLocaleString('en-IN')}` } } },
                                    scales: {
                                        x: { grid: { display: false } },
                                        y: { grid: { color: 'rgba(148,163,184,0.1)' } }
                                    }
                                }}
                            />
                        </div>
                    )}

                    {/* Budget vs Actual - Bar Chart */}
                    {budgetVsActual.length > 0 && (
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">{t('expenses.budgetVsActual')}</h3>
                            <Bar
                                data={{
                                    labels: budgetVsActual.map((r) => r.category),
                                    datasets: [
                                        { label: 'Budget', data: budgetVsActual.map((r) => r.budget), backgroundColor: 'rgba(139,92,246,0.6)', borderRadius: 6 },
                                        { label: 'Spent', data: budgetVsActual.map((r) => r.actual), backgroundColor: 'rgba(239,68,68,0.6)', borderRadius: 6 },
                                    ],
                                }}
                                options={{
                                    responsive: true,
                                    plugins: { legend: { position: 'bottom', align: 'start', labels: { boxWidth: 12, font: { size: 10 } } }, tooltip: { callbacks: { label: (ctx) => ` ₹${(ctx.parsed.y ?? ctx.parsed).toLocaleString('en-IN')}` } } },
                                    scales: { 
                                        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                                        y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.1)' } } 
                                    },
                                }}
                            />
                        </div>
                    )}

                    {/* Top 5 Categories */}
                    {categoryData.length > 0 && (
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">{t('expenses.topCategories')}</h3>
                            <div className="space-y-3">
                                {categoryData.slice(0, 5).map((cat, i) => (
                                    <div key={cat.id} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: COLORS[i] }}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-slate-800 dark:text-white text-xs font-semibold truncate">{cat.icon} {cat.name}</p>
                                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${maxCategoryTotal > 0 ? (cat.total / maxCategoryTotal) * 100 : 0}%` }}
                                                    transition={{ duration: 0.6 }}
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: COLORS[i] }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-800 dark:text-white text-xs font-bold">₹{cat.total.toLocaleString('en-IN')}</p>
                                            <p className="text-slate-400 text-[10px]">{totalDaily > 0 ? ((cat.total / totalDaily) * 100).toFixed(1) : 0}%</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Download PDF Button */}
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleDownloadPDF}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-purple/10 border-2 border-brand-purple/40 text-brand-purple font-bold text-sm"
                    >
                        <Download size={18} /> {t('expenses.downloadReport')}
                    </motion.button>
                </>
            )}
        </div>
    );
}
