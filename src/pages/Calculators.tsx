import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Calculator, FileText, Clock, Percent, PiggyBank, Landmark, Wallet, TrendingUp, LayoutGrid, RefreshCcw, ArrowUpRight, DollarSign, Target, GraduationCap, Heart, BarChart3, Minus, Building2, Car, Receipt, Sparkles, History, Briefcase, Mail, CreditCard, GitCompare, Calendar, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AnalyticsService } from '../lib/analytics';

import { allCalcs, CalcItem } from '../data/calculatorList';
import DisclaimerComponent from '../components/DisclaimerComponent';

// Most Used calculators (featured)
const mostUsed = [
    { path: '/calculator/loan-emi', gradient: 'from-emerald-500 to-teal-600' },
    { path: '/calculator/sip', gradient: 'from-blue-500 to-indigo-600' },
    { path: '/calculator/income-tax', gradient: 'from-amber-500 to-orange-600' },
    { path: '/calculator/fixed-deposit', gradient: 'from-purple-500 to-violet-600' },
    { path: '/calculator/car-loan', gradient: 'from-sky-500 to-blue-600' },
];

const categoryMeta: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    taxSalary: { icon: FileText, color: '#F59E0B', bg: '#F59E0B15' },
    loans: { icon: CreditCard, color: '#8B5CF6', bg: '#8B5CF615' },
    investments: { icon: TrendingUp, color: '#10B981', bg: '#10B98115' },
    banking: { icon: Landmark, color: '#3B82F6', bg: '#3B82F615' },
    retirement: { icon: Sparkles, color: '#6366F1', bg: '#6366F115' },
    postOffice: { icon: Mail, color: '#F43F5E', bg: '#F43F5E15' },
    business: { icon: Briefcase, color: '#06B6D4', bg: '#06B6D415' },
    property: { icon: Building2, color: '#F97316', bg: '#F9731615' },
    tools: { icon: Calculator, color: '#EC4899', bg: '#EC489915' },
};

const categoryOrder = ['all', 'taxSalary', 'loans', 'investments', 'banking', 'retirement', 'postOffice', 'business', 'property', 'tools'];

export default function Calculators() {
    useEffect(() => { AnalyticsService.trackScreen('Calculators_List'); }, []);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [recentPaths, setRecentPaths] = useState<string[]>([]);

    const loadRecent = useCallback(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('fincalix_recently_used') || '[]');
            if (stored.length > 0) setRecentPaths(stored);
        } catch { }
    }, []);

    // Read recently-used with a delayed retry for Android WebView timing
    useEffect(() => {
        loadRecent();
        const timer = setTimeout(loadRecent, 300);
        return () => clearTimeout(timer);
    }, [loadRecent]);

    // Deduplicate by path (compound interest appears in loans + banking)
    const uniqueCalcs = allCalcs.filter((c, i, arr) =>
        selectedCategory !== 'all'
            ? c.category === selectedCategory
            : arr.findIndex(x => x.path === c.path) === i
    );

    const recentCalcs = recentPaths
        .map(path => allCalcs.find(c => c.path === path))
        .filter(Boolean) as CalcItem[];

    const filtered = uniqueCalcs.filter((c) => {
        const name = t(c.nameKey as any);
        const desc = t(c.descKey as any);
        const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || desc.toLowerCase().includes(search.toLowerCase());
        const matchCategory = selectedCategory === 'all' || c.category === selectedCategory;
        return matchSearch && matchCategory;
    });

    const grouped = filtered.reduce<Record<string, CalcItem[]>>((acc, c) => {
        (acc[c.category] = acc[c.category] || []).push(c);
        return acc;
    }, {});

    const sortedCategories = categoryOrder.filter(cat => cat !== 'all' && grouped[cat]);
    const showHero = selectedCategory === 'all' && !search;

    return (
        <div className="px-4 pt-14 animate-fade-in pb-24">
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-foreground">{t('calculators.title')}</h1>
                <p className="text-muted-foreground text-sm mt-1">{t('calculators.subtitle')}</p>
            </div>


            {/* Search */}
            <div className="relative mb-4 sticky top-12 z-10">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder={t('calculators.search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border text-slate-900 dark:text-foreground placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
                />
            </div>

            {/* Most Used Calculators — Hero Cards */}
            {showHero && (
                <section className="mb-6">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Sparkles size={14} className="text-amber-400" />
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Most Used</h2>
                    </div>
                    <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1">
                        {mostUsed.map((mu, i) => {
                            const calc = allCalcs.find(c => c.path === mu.path);
                            if (!calc) return null;
                            const Icon = calc.icon;
                            return (
                                <motion.button
                                    key={mu.path}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => navigate(mu.path)}
                                    className={`min-w-[140px] p-4 rounded-2xl bg-gradient-to-br ${mu.gradient} border border-white/10 shadow-lg flex-shrink-0`}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white/20  flex items-center justify-center mb-3">
                                        <Icon size={20} className="text-foreground" />
                                    </div>
                                    <p className="text-foreground font-bold text-sm text-left leading-tight">{t(calc.nameKey as any)}</p>
                                    <p className="text-foreground/60 text-[10px] mt-1 text-left">{t(calc.descKey as any)}</p>
                                </motion.button>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Recently Used */}
            {showHero && recentCalcs.length > 0 && (
                <section className="mb-6">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <History size={14} className="text-blue-400" />
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recently Used</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                        {recentCalcs.slice(0, 4).map((item, i) => (
                            <motion.button
                                key={item.path}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate(item.path)}
                                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                            >
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${item.color}15` }}>
                                    <item.icon size={18} style={{ color: item.color }} />
                                </div>
                                <span className="text-slate-900 dark:text-foreground font-medium text-xs truncate">{t(item.nameKey as any)}</span>
                            </motion.button>
                        ))}
                    </div>
                </section>
            )}

            {/* Compare Banner */}
            {showHero && (
                <section className="mb-6">
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate('/compare')}
                        className="w-full p-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 border border-violet-400/30 shadow-lg flex items-center gap-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                            <GitCompare size={20} className="text-foreground" />
                        </div>
                        <div className="text-left flex-1">
                            <h3 className="text-foreground font-bold text-sm">Compare Scenarios</h3>
                            <p className="text-foreground/60 text-[10px] mt-0.5">Loan A vs B, SIP rates, FD tenures</p>
                        </div>
                        <ChevronRight size={18} className="text-foreground/40" />
                    </motion.button>
                </section>
            )}

            {/* Category Filter Pills with Icons */}
            <div className="mb-5 -mx-4 px-4 overflow-x-auto hide-scrollbar">
                <div className="flex gap-2 pb-1 min-w-max">
                    {categoryOrder.map(cat => {
                        const isActive = selectedCategory === cat;
                        const label = cat === 'all' ? t('common.all') : t(`calculators.categories.${cat}` as any);
                        const meta = categoryMeta[cat];
                        const CatIcon = meta?.icon;
                        return (
                            <motion.button
                                key={cat}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedCategory(cat)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${isActive
                                        ? 'bg-brand-green text-black shadow-lg shadow-brand-green/20'
                                        : 'bg-white dark:bg-card border border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                            >
                                {cat === 'all' ? (
                                    <span className="text-sm">📊</span>
                                ) : CatIcon ? (
                                    <CatIcon size={13} style={{ color: isActive ? '#000' : meta.color }} />
                                ) : null}
                                {label}
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Count */}
            <p className="text-muted-foreground text-xs mb-3 px-1">{filtered.length} calculators</p>

            {/* Calculator Cards */}
            <div className="space-y-7 mb-6">
                {sortedCategories.map((category) => {
                    const items = grouped[category];
                    const categoryLabel = t(`calculators.categories.${category}` as any);
                    const meta = categoryMeta[category];
                    const CatIcon = meta?.icon;
                    return (
                        <section key={category}>
                            <div className="flex items-center gap-2 mb-3">
                                {CatIcon && (
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: meta.bg }}>
                                        <CatIcon size={13} style={{ color: meta.color }} />
                                    </div>
                                )}
                                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {categoryLabel} ({items.length})
                                </h2>
                            </div>
                            <div className="space-y-2.5">
                                {items.map((item, i) => (
                                    <motion.button
                                        key={item.nameKey + item.category}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => navigate(item.path)}
                                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border hover:border-slate-300 dark:hover:border-slate-600 transition-colors animate-slide-up"
                                        style={{ animationDelay: `${i * 40}ms` }}
                                    >
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${item.color}15` }}>
                                            <item.icon size={20} style={{ color: item.color }} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <h3 className="text-slate-800 dark:text-foreground font-medium text-sm">{t(item.nameKey as any)}</h3>
                                            <p className="text-muted-foreground text-xs mt-0.5">{t(item.descKey as any)}</p>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
                                    </motion.button>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
                <div className="text-center py-16">
                    <Calculator size={48} className="text-slate-600 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">{t('calculators.search')} — no results</p>
                </div>
            )}
            
            <DisclaimerComponent module="general" />
        </div>
    );
}
