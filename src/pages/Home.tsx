import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, Calculator, PieChart, Star, History as HistoryIcon, Bookmark, Wallet, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { useBudgetTrackerStore } from '../store/useBudgetTrackerStore';
import { formatINR } from '../utils/calculations';

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
    const { currentBalance, monthlyIncome } = useBudgetTrackerStore();
    const userName = user?.name?.split(' ')[0] || 'User';

    const [recentPaths, setRecentPaths] = useState<string[]>([]);

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('recentCalculators') || '[]');
            setRecentPaths(stored);
        } catch { }
    }, []);

    const quickCalcItems = useMemo(() => {
        if (recentPaths.length === 0) return defaultItems;

        // Map paths to labels/icons (simplified for now)
        return recentPaths.map(path => {
            const parts = path.split('/');
            const slug = parts[parts.length - 1];
            const label = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ').replace('Emi', 'EMI').replace('Sip', 'SIP').replace('Fd', 'FD');
            return {
                label,
                path,
                icon: Calculator,
                color: '#10B981' // Dynamic color logic could be added
            };
        }).slice(0, 4);
    }, [recentPaths]);

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
                    {quickCalcItems.map((item, i) => (
                        <motion.button
                            key={item.path}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate(item.path)}
                            className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800/50">
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
                        <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{formatINR(currentBalance)}</p>
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
