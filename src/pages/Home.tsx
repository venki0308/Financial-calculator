import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, Calculator, PieChart, Star, History as HistoryIcon, Bookmark, Wallet, TrendingUp, FileText, Percent, PiggyBank, Landmark, Clock, ArrowUpRight, DollarSign, Target, GraduationCap, Heart, BarChart3, Minus, LayoutGrid, RefreshCcw, Building2, Car, Receipt, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { useBudgetTrackerStore } from '../store/useBudgetTrackerStore';
import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';

// Full calculator catalog for icon/color resolution
const calcCatalog: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    '/calculator/loan-emi': { icon: Calculator, color: '#10B981', label: 'EMI Calculator' },
    '/calculator/sip': { icon: Percent, color: '#3B82F6', label: 'SIP Calculator' },
    '/calculator/fixed-deposit': { icon: PiggyBank, color: '#F59E0B', label: 'FD Calculator' },
    '/calculator/income-tax': { icon: FileText, color: '#F59E0B', label: 'Income Tax' },
    '/calculator/salary-hike': { icon: ArrowUpRight, color: '#10B981', label: 'Salary Hike' },
    '/calculator/hra': { icon: GraduationCap, color: '#F59E0B', label: 'HRA Calculator' },
    '/calculator/recurring-deposit': { icon: Clock, color: '#3B82F6', label: 'RD Calculator' },
    '/calculator/compound-interest': { icon: Percent, color: '#8B5CF6', label: 'Compound Interest' },
    '/calculator/simple-interest': { icon: Minus, color: '#6B7280', label: 'Simple Interest' },
    '/calculator/advanced-sip': { icon: BarChart3, color: '#06B6D4', label: 'Advanced SIP' },
    '/calculator/lumpsum': { icon: Wallet, color: '#10B981', label: 'Lumpsum' },
    '/calculator/swp': { icon: TrendingUp, color: '#F59E0B', label: 'SWP Calculator' },
    '/calculator/cagr': { icon: BarChart3, color: '#8B5CF6', label: 'CAGR Calculator' },
    '/calculator/step-up-sip': { icon: ArrowUpRight, color: '#10B981', label: 'Step-Up SIP' },
    '/calculator/goal-sip': { icon: Target, color: '#EF4444', label: 'Goal SIP' },
    '/calculator/ppf': { icon: Landmark, color: '#10B981', label: 'PPF Calculator' },
    '/calculator/nps': { icon: LayoutGrid, color: '#3B82F6', label: 'NPS Calculator' },
    '/calculator/epf': { icon: Wallet, color: '#F59E0B', label: 'EPF Calculator' },
    '/calculator/gratuity': { icon: DollarSign, color: '#8B5CF6', label: 'Gratuity' },
    '/calculator/sukanya-samriddhi': { icon: Heart, color: '#EF4444', label: 'SSY Calculator' },
    '/calculator/nsc': { icon: RefreshCcw, color: '#3B82F6', label: 'NSC Calculator' },
    '/calculator/kvp': { icon: Clock, color: '#F59E0B', label: 'KVP Calculator' },
    '/calculator/post-office-mis': { icon: DollarSign, color: '#10B981', label: 'PO MIS' },
    '/calculator/senior-citizen-savings': { icon: Landmark, color: '#8B5CF6', label: 'SCSS Calculator' },
    '/calculator/post-office-td': { icon: PiggyBank, color: '#3B82F6', label: 'PO TD' },
    '/calculator/property': { icon: Building2, color: '#F97316', label: 'Property' },
    '/calculator/gst': { icon: Receipt, color: '#06B6D4', label: 'GST Calculator' },
    '/calculator/break-even': { icon: BarChart3, color: '#10B981', label: 'Break Even' },
    '/calculator/car-loan': { icon: Car, color: '#3B82F6', label: 'Car Loan' },
};

// Default items if history is empty
const defaultItems = [
    { label: 'EMI', icon: Calculator, color: '#10B981', path: '/calculator/loan-emi' },
    { label: 'SIP', icon: PieChart, color: '#3B82F6', path: '/calculator/sip' },
    { label: 'FD', icon: Star, color: '#F59E0B', path: '/calculator/fixed-deposit' },
    { label: 'PPF', icon: Bookmark, color: '#8B5CF6', path: '/calculator/ppf' },
];

export default function Home() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { currentBalance, monthlyIncome, getTotalFixed, getTotalSpent } = useBudgetTrackerStore();

    const [recentPaths, setRecentPaths] = useState<string[]>([]);

    useEffect(() => {
        AnalyticsService.trackScreen('Home');
    }, []);

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('recentCalculators') || '[]');
            setRecentPaths(stored);
        } catch { }
    }, []);

    // Compute effective current balance: if user hasn't set one, derive from income - expenses
    const effectiveBalance = useMemo(() => {
        if (currentBalance > 0) return currentBalance;
        if (monthlyIncome > 0) {
            const fixed = getTotalFixed();
            const spent = getTotalSpent();
            return Math.max(0, monthlyIncome - fixed - spent);
        }
        return 0;
    }, [currentBalance, monthlyIncome, getTotalFixed, getTotalSpent]);

    const quickCalcItems = useMemo(() => {
        if (recentPaths.length === 0) return defaultItems;

        return recentPaths
            .filter(path => calcCatalog[path]) // Only include known paths
            .map(path => {
                const info = calcCatalog[path];
                return {
                    label: info.label,
                    path,
                    icon: info.icon,
                    color: info.color,
                };
            }).slice(0, 4);
    }, [recentPaths]);

    // If no valid recent items after filtering, fall back to defaults
    const displayItems = quickCalcItems.length > 0 ? quickCalcItems : defaultItems;

    const popularCalcs = [
        { name: t('calculators.incomeTax.name'), desc: t('calculators.incomeTax.desc'), path: '/calculator/income-tax' },
        { name: t('calculators.sip.name'), desc: t('calculators.sip.desc'), path: '/calculator/sip' },
        { name: t('calculators.emi.name'), desc: t('calculators.emi.desc'), path: '/calculator/loan-emi' },
    ];

    return (
        <div className="px-5 pt-14 animate-fade-in pb-20">
            <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-3">
                    <img src="/icons/fincalix-logo.jpg" alt="FinCalix" className="w-10 h-10 rounded-xl" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('home.welcome')}</h1>
                        <p className="text-slate-400 text-sm mt-0">{t('home.tagline')}</p>
                    </div>
                </div>
                <button onClick={() => navigate('/notifications')} className="p-2.5 rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-400 shadow-lg">
                    <Bell size={20} />
                </button>
            </div>

            <section className="mb-8">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
                    {recentPaths.length > 0 ? t('home.recentlyUsed') : t('home.quickCalculate')}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    {displayItems.map((item, i) => (
                        <motion.button
                            key={item.path}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate(item.path)}
                            className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                                <item.icon size={22} style={{ color: item.color }} />
                            </div>
                            <span className="text-slate-900 dark:text-white font-semibold text-sm truncate">{item.label}</span>
                        </motion.button>
                    ))}
                </div>
            </section>

            <section className="mb-8">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('home.myBudget')}</h2>
                    <button onClick={() => navigate('/expenses')} className="text-brand-purple text-xs font-bold">{t('home.viewAll')}</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border group active:scale-95 transition-transform cursor-pointer" onClick={() => navigate('/expenses')}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                                <Wallet size={14} />
                            </div>
                            <ChevronRight size={14} className="text-slate-600" />
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{t('home.currentBalance')}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{formatINR(effectiveBalance)}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border group active:scale-95 transition-transform cursor-pointer" onClick={() => navigate('/expenses')}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-brand-green/10 flex items-center justify-center text-brand-green">
                                <TrendingUp size={14} />
                            </div>
                            <ChevronRight size={14} className="text-slate-600" />
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{t('home.monthlyIncome')}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{formatINR(monthlyIncome)}</p>
                    </div>
                </div>
            </section>

            <section className="mb-8">
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/schemes')}
                    className="w-full p-6 rounded-3xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 border border-indigo-400/40 shadow-xl overflow-hidden relative group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                            <HistoryIcon size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-white font-bold">{t('home.govSchemes')}</h3>
                            <p className="text-indigo-100 text-xs mt-0.5">{t('home.explore')}</p>
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <span className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">{t('home.new2026')}</span>
                        <span className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">Central Govt</span>
                    </div>
                </motion.button>
            </section>

            {/* AI Advisor & Goal Planner */}
            <section className="mb-8 grid grid-cols-2 gap-3">
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/ai-advisor')}
                    className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 border border-amber-400/30 shadow-lg text-left"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                        <Sparkles size={18} className="text-white" />
                    </div>
                    <h3 className="text-white font-bold text-sm">AI Advisor</h3>
                    <p className="text-white/60 text-[10px] mt-0.5">Personal financial plan</p>
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/goal-planner')}
                    className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 border border-emerald-400/30 shadow-lg text-left"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                        <Target size={18} className="text-white" />
                    </div>
                    <h3 className="text-white font-bold text-sm">Goal Planner</h3>
                    <p className="text-white/60 text-[10px] mt-0.5">Plan your milestones</p>
                </motion.button>
            </section>

            <section className="pb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('home.popularCalcs')}</h2>
                    <button onClick={() => navigate('/calculators')} className="text-brand-green text-xs font-medium">{t('home.seeAll')}</button>
                </div>
                <div className="space-y-3">
                    {popularCalcs.map((c) => (
                        <button
                            key={c.name}
                            onClick={() => navigate(c.path)}
                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all"
                        >
                            <div className="text-left">
                                <h4 className="text-slate-800 dark:text-slate-200 font-bold text-sm">{c.name}</h4>
                                <p className="text-slate-500 text-[11px] mt-0.5">{c.desc}</p>
                            </div>
                            <ChevronRight size={18} className="text-slate-600" />
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
}

