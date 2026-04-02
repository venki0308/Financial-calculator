import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBudgetTrackerStore, EXPENSE_CATEGORIES, INVESTMENT_TYPES, INCOME_CATEGORIES, type EntryType } from '../../store/useBudgetTrackerStore';

/* ── helpers ── */
const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekRange(weekOffset: number) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(now.getDate() + diff + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { monday, sunday };
}



function fmtWeekHeader(mon: Date, sun: Date) {
    const m = mon.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const s = sun.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    return `${m} — ${s}`;
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ── Sub-tab chip colours ── */
const SUB_TABS: { id: EntryType; label: string; emoji: string; accent: string; bg: string }[] = [
    { id: 'expense', label: 'Expenses', emoji: '💸', accent: 'text-red-400', bg: 'bg-red-500' },
    { id: 'income', label: 'Income', emoji: '💰', accent: 'text-emerald-400', bg: 'bg-emerald-500' },
    { id: 'investment', label: 'Investments', emoji: '📈', accent: 'text-blue-400', bg: 'bg-blue-500' },
];

export default function WeeklyTab() {
    const { entries } = useBudgetTrackerStore();
    const [weekOffset, setWeekOffset] = useState(0);
    const [activeSubTab, setActiveSubTab] = useState<EntryType>('expense');
    const [expandedDay, setExpandedDay] = useState<number | null>(null);

    const { monday, sunday } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
    const isCurrentWeek = weekOffset === 0;

    /* Filter entries within the week */
    const weekEntries = useMemo(() =>
        entries.filter(e => {
            const d = new Date(e.date);
            return d >= monday && d <= sunday;
        }),
        [entries, monday, sunday]
    );

    /* Previous week entries for comparison */
    const prevWeekRange = useMemo(() => getWeekRange(weekOffset - 1), [weekOffset]);
    const prevWeekEntries = useMemo(() =>
        entries.filter(e => {
            const d = new Date(e.date);
            return d >= prevWeekRange.monday && d <= prevWeekRange.sunday;
        }),
        [entries, prevWeekRange]
    );

    /* Split by entryType */
    const expenseEntries = weekEntries.filter(e => (e.entryType || 'expense') === 'expense');
    const incomeEntries = weekEntries.filter(e => e.entryType === 'income');
    const investmentEntries = weekEntries.filter(e => e.entryType === 'investment');

    const prevExpenses = prevWeekEntries.filter(e => (e.entryType || 'expense') === 'expense');
    const prevIncome = prevWeekEntries.filter(e => e.entryType === 'income');
    const prevInvestments = prevWeekEntries.filter(e => e.entryType === 'investment');

    const totalExpense = expenseEntries.reduce((s, e) => s + e.amount, 0);
    const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);
    const totalInvestment = investmentEntries.reduce((s, e) => s + e.amount, 0);

    const prevTotalExpense = prevExpenses.reduce((s, e) => s + e.amount, 0);
    const prevTotalIncome = prevIncome.reduce((s, e) => s + e.amount, 0);
    const prevTotalInvestment = prevInvestments.reduce((s, e) => s + e.amount, 0);

    const pctChange = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
    };

    /* Day-by-day data */
    const dayData = useMemo(() => {
        const filtered = activeSubTab === 'expense' ? expenseEntries
            : activeSubTab === 'income' ? incomeEntries
            : investmentEntries;

        return Array.from({ length: 7 }, (_, i) => {
            const day = new Date(monday);
            day.setDate(monday.getDate() + i);
            const dayEntries = filtered.filter(e => isSameDay(new Date(e.date), day));
            const total = dayEntries.reduce((s, e) => s + e.amount, 0);
            return { dayIndex: i, date: new Date(day), entries: dayEntries, total };
        });
    }, [monday, activeSubTab, expenseEntries, incomeEntries, investmentEntries]);

    const maxDayTotal = Math.max(...dayData.map(d => d.total), 1);

    /* Category/investment breakdown */
    const breakdown = useMemo(() => {
        const filtered = activeSubTab === 'expense' ? expenseEntries
            : activeSubTab === 'income' ? incomeEntries
            : investmentEntries;

        const map: Record<string, number> = {};
        filtered.forEach(e => {
            const key = activeSubTab === 'investment' ? (e.investmentType || 'other_investment') : (e.category || 'others');
            map[key] = (map[key] || 0) + e.amount;
        });

        return Object.entries(map)
            .map(([id, total]) => {
                let icon = '📌', label = id, color = '#8b5cf6';
                if (activeSubTab === 'investment') {
                    const inv = INVESTMENT_TYPES.find(t => t.id === id);
                    if (inv) { icon = inv.icon; label = inv.label; color = inv.color; }
                } else if (activeSubTab === 'income') {
                    const inc = INCOME_CATEGORIES.find(c => c.id === id);
                    if (inc) { icon = inc.icon; label = inc.name; }
                } else {
                    const cat = EXPENSE_CATEGORIES.find(c => c.id === id);
                    if (cat) { icon = cat.icon; label = cat.name; }
                }
                return { id, icon, label, total, color };
            })
            .sort((a, b) => b.total - a.total);
    }, [activeSubTab, expenseEntries, incomeEntries, investmentEntries]);

    const breakdownTotal = breakdown.reduce((s, b) => s + b.total, 0);

    /* Summary cards config */
    const summaryCards = useMemo(() => {
        if (activeSubTab === 'expense') {
            const change = pctChange(totalExpense, prevTotalExpense);
            return [
                { label: 'Total Spent', value: fmt(totalExpense), sub: 'this week', accent: 'text-red-400' },
                { label: 'Daily Average', value: fmt(totalExpense / 7), sub: 'per day avg', accent: 'text-orange-400' },
                { label: 'vs Last Week', value: `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`, sub: change > 0 ? '↑ more' : change < 0 ? '↓ less' : 'same', accent: change <= 0 ? 'text-emerald-400' : 'text-red-400' },
            ];
        } else if (activeSubTab === 'income') {
            const net = totalIncome - totalExpense;
            const change = pctChange(totalIncome, prevTotalIncome);
            return [
                { label: 'Total Earned', value: fmt(totalIncome), sub: 'this week', accent: 'text-emerald-400' },
                { label: 'Net Balance', value: `${net >= 0 ? '+' : '-'}${fmt(net)}`, sub: 'income − expenses', accent: net >= 0 ? 'text-emerald-400' : 'text-red-400' },
                { label: 'vs Last Week', value: `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`, sub: 'income change', accent: change >= 0 ? 'text-emerald-400' : 'text-red-400' },
            ];
        } else {
            const change = pctChange(totalInvestment, prevTotalInvestment);
            const uniqueTypes = new Set(investmentEntries.map(e => e.investmentType));
            return [
                { label: 'Total Invested', value: fmt(totalInvestment), sub: 'this week', accent: 'text-blue-400' },
                { label: 'Asset Classes', value: `${uniqueTypes.size}`, sub: 'asset classes', accent: 'text-purple-400' },
                { label: 'vs Last Week', value: `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`, sub: 'invested', accent: change >= 0 ? 'text-emerald-400' : 'text-red-400' },
            ];
        }
    }, [activeSubTab, totalExpense, totalIncome, totalInvestment, prevTotalExpense, prevTotalIncome, prevTotalInvestment, investmentEntries]);

    const barColor = activeSubTab === 'expense' ? { full: '#ef4444', muted: 'rgba(239,68,68,0.3)' }
        : activeSubTab === 'income' ? { full: '#10b981', muted: 'rgba(16,185,129,0.3)' }
        : { full: '#3b82f6', muted: 'rgba(59,130,246,0.3)' };

    const today = new Date();

    return (
        <div className="space-y-4 pb-6">
            {/* Week Navigator */}
            <div className="flex items-center gap-2">
                <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <ChevronLeft size={18} className="text-muted-foreground" />
                </button>
                <div className="flex-1 text-center">
                    <p className="text-sm font-bold text-slate-800 dark:text-foreground">{fmtWeekHeader(monday, sunday)}</p>
                    {isCurrentWeek && <p className="text-[10px] text-brand-purple font-semibold">This Week</p>}
                </div>
                <button
                    onClick={() => setWeekOffset(w => w + 1)} disabled={isCurrentWeek}
                    className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 disabled:opacity-30"
                >
                    <ChevronRight size={18} className="text-muted-foreground" />
                </button>
            </div>

            {/* Sub-tab Switcher */}
            <div className="flex gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
                {SUB_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveSubTab(tab.id); setExpandedDay(null); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === tab.id
                            ? `${tab.bg} text-white shadow`
                            : 'text-muted-foreground'
                        }`}
                    >
                        {tab.emoji} {tab.label}
                    </button>
                ))}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2">
                {summaryCards.map(card => (
                    <div key={card.label} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-3 text-center">
                        <p className="text-[10px] text-muted-foreground font-medium mb-1">{card.label}</p>
                        <p className={`text-base font-extrabold ${card.accent}`}>{card.value}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* Day-by-Day Bar Chart */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-4">Day-by-Day</h3>
                <div className="space-y-2">
                    {dayData.map((day, i) => {
                        const isToday = isSameDay(day.date, today);
                        const isExpanded = expandedDay === i;
                        const pct = maxDayTotal > 0 ? (day.total / maxDayTotal) * 100 : 0;
                        return (
                            <div key={i}>
                                <button
                                    onClick={() => setExpandedDay(isExpanded ? null : i)}
                                    className={`w-full flex items-center gap-3 py-2 px-3 rounded-xl transition-all ${isToday ? 'bg-brand-purple/5 border border-brand-purple/20' : 'hover:bg-white/5'}`}
                                >
                                    <span className={`text-xs font-bold w-8 ${isToday ? 'text-brand-purple' : 'text-muted-foreground'}`}>
                                        {DAY_NAMES[i]}
                                    </span>
                                    <div className="flex-1 h-5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.5, delay: i * 0.05 }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: day.total === maxDayTotal && day.total > 0 ? barColor.full : barColor.muted }}
                                        />
                                    </div>
                                    <span className={`text-xs font-bold min-w-[60px] text-right ${day.total === 0 ? 'text-muted-foreground' : SUB_TABS.find(t => t.id === activeSubTab)?.accent}`}>
                                        {day.total === 0 ? '—' : fmt(day.total)}
                                    </span>
                                </button>

                                {/* Expanded day entries */}
                                <AnimatePresence>
                                    {isExpanded && day.entries.length > 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="pl-11 pr-3 overflow-hidden"
                                        >
                                            <div className="space-y-1.5 py-2 border-l-2 border-slate-200 dark:border-white/10 pl-3">
                                                {day.entries.map(entry => {
                                                    const catInfo = activeSubTab === 'investment'
                                                        ? INVESTMENT_TYPES.find(t => t.id === entry.investmentType)
                                                        : activeSubTab === 'income'
                                                        ? INCOME_CATEGORIES.find(c => c.id === entry.category)
                                                        : EXPENSE_CATEGORIES.find(c => c.id === entry.category);
                                                    return (
                                                        <div key={entry.id} className="flex items-center gap-2 text-xs">
                                                            <span>{catInfo && 'icon' in catInfo ? catInfo.icon : '📌'}</span>
                                                            <span className="flex-1 text-slate-700 dark:text-slate-300 truncate">{entry.description}</span>
                                                            <span className={`font-bold ${SUB_TABS.find(t => t.id === activeSubTab)?.accent}`}>{fmt(entry.amount)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                    {isExpanded && day.entries.length === 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="pl-11 pr-3 overflow-hidden"
                                        >
                                            <p className="text-[11px] text-muted-foreground py-2 italic">No entries this day</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Category / Investment Breakdown */}
            {breakdown.length > 0 && (
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                    <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-4">
                        {activeSubTab === 'expense' ? 'Spending by Category' : activeSubTab === 'income' ? 'Income Sources' : 'Investment Breakdown'}
                    </h3>
                    <div className="space-y-3">
                        {breakdown.map((item, idx) => {
                            const pct = breakdownTotal > 0 ? (item.total / breakdownTotal) * 100 : 0;
                            return (
                                <div key={item.id} className="flex items-center gap-3">
                                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 dark:text-foreground truncate">{item.label}</p>
                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mt-1">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.5, delay: idx * 0.05 }}
                                                className="h-full rounded-full"
                                                style={{ backgroundColor: activeSubTab === 'investment' ? item.color : undefined }}
                                                {...(activeSubTab !== 'investment' && { className: `h-full rounded-full ${activeSubTab === 'expense' ? 'bg-red-400' : 'bg-emerald-400'}` })}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-xs font-bold text-slate-800 dark:text-foreground">{fmt(item.total)}</p>
                                        <p className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Investment insight */}
                    {activeSubTab === 'investment' && totalInvestment > 0 && (
                        <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-400/20">
                            <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                                This week you invested <strong>{fmt(totalInvestment)}</strong> across{' '}
                                <strong>{breakdown.length}</strong> asset class{breakdown.length > 1 ? 'es' : ''}.
                                {breakdown.length > 0 && (
                                    <> {breakdown[0].icon} <strong>{breakdown[0].label}</strong> is your largest allocation at{' '}
                                    <strong>{breakdownTotal > 0 ? ((breakdown[0].total / breakdownTotal) * 100).toFixed(0) : 0}%</strong>.</>
                                )}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* All entries this week */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-3">All Entries This Week</h3>
                {weekEntries.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-3xl mb-2">🌿</p>
                        <p className="text-muted-foreground text-sm">No entries recorded this week</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {[...weekEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => {
                            const type = entry.entryType || 'expense';
                            const badgeConfig = type === 'income'
                                ? { text: 'Earned', cls: 'bg-emerald-500/15 text-emerald-400' }
                                : type === 'investment'
                                ? { text: 'Invested', cls: 'bg-blue-500/15 text-blue-400' }
                                : { text: 'Spent', cls: 'bg-red-500/15 text-red-400' };
                            const amtColor = type === 'income' ? 'text-emerald-400' : type === 'investment' ? 'text-blue-400' : 'text-red-400';
                            const catInfo = type === 'investment' ? INVESTMENT_TYPES.find(t => t.id === entry.investmentType) : EXPENSE_CATEGORIES.find(c => c.id === entry.category);
                            const icon = catInfo && 'icon' in catInfo ? catInfo.icon : '📌';
                            const d = new Date(entry.date);
                            return (
                                <div key={entry.id} className="flex items-center gap-3 py-2">
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-base flex-shrink-0">{icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 dark:text-foreground truncate">{entry.description}</p>
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${badgeConfig.cls}`}>{badgeConfig.text}</span>
                                            {d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                                        </p>
                                    </div>
                                    <p className={`text-sm font-bold ${amtColor}`}>
                                        {type === 'expense' ? '-' : '+'}{fmt(entry.amount)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
