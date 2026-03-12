import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, Calculator, PieChart, Star, History as HistoryIcon, Bookmark, Wallet, TrendingUp, FileText, Percent, PiggyBank, Landmark, Clock, ArrowUpRight, DollarSign, Target, GraduationCap, Heart, BarChart3, Minus, LayoutGrid, RefreshCcw, Building2, Car, Receipt, Sparkles, GitCompare, Calendar, Globe, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { useBudgetTrackerStore } from '../store/useBudgetTrackerStore';
import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';
import { allCalcs } from '../data/calculatorList';
import { schemes } from '../data/schemes';
import { useNotificationStore } from '../store/useNotificationStore';

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
    '/calculator/age': { icon: Calendar, color: '#F97316', label: 'Age Calculator' },
    '/world-clock': { icon: Globe, color: '#3B82F6', label: 'World Clock' },
    '/calculator/ppf-advanced': { icon: Landmark, color: '#10B981', label: 'PPF Advanced' },
};

// Default items if history is empty
const defaultItems = [
    { label: 'EMI', icon: Calculator, color: '#10B981', path: '/calculator/loan-emi' },
    { label: 'SIP', icon: PieChart, color: '#3B82F6', path: '/calculator/sip' },
    { label: 'FD', icon: Star, color: '#F59E0B', path: '/calculator/fixed-deposit' },
    { label: 'Tax', icon: FileText, color: '#F59E0B', path: '/calculator/income-tax' },
];

export default function Home() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { currentBalance, monthlyIncome, getTotalFixed, getTotalSpent } = useBudgetTrackerStore();

    const [recentPaths, setRecentPaths] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        AnalyticsService.trackScreen('Home');
    }, []);

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('recentCalculators') || '[]');
            setRecentPaths(stored);
        } catch { }
    }, []);

    const searchResults = useMemo(() => {
        const empty = { calcOnly: [] as any[], schemeResults: [] as any[], utilityResults: [] as any[], all: [] as any[] };
        if (!searchQuery.trim()) return empty;
        const q = searchQuery.toLowerCase();
        
        const calcResults = allCalcs.filter(c => {
            const label = t(c.nameKey) === c.nameKey ? c.nameKey : t(c.nameKey);
            const desc = t(c.descKey) === c.descKey ? c.descKey : t(c.descKey);
            return label.toLowerCase().includes(q) || 
                   desc.toLowerCase().includes(q) ||
                   c.keywords?.some(kw => kw.toLowerCase().includes(q));
        }).map(c => ({
            type: 'calculator',
            title: t(c.nameKey) === c.nameKey ? c.nameKey : t(c.nameKey),
            subtitle: t(c.descKey) === c.descKey ? c.descKey : t(c.descKey),
            icon: c.icon,
            color: c.color,
            path: c.path,
            category: c.category,
        }));

        const schemeResults = schemes.filter(s => {
            return s.name.toLowerCase().includes(q) ||
                   s.description.toLowerCase().includes(q) ||
                   s.ministry.toLowerCase().includes(q);
        }).map(s => ({
            type: 'scheme',
            title: s.name,
            subtitle: s.description,
            icon: Bookmark, 
            color: '#8B5CF6',
            path: `/scheme/${s.id}`
        }));

        const utilityResults = calcResults.filter(r => r.category === 'tools');
        const calcOnly = calcResults.filter(r => r.category !== 'tools');

        return { calcOnly: calcOnly.slice(0, 6), schemeResults: schemeResults.slice(0, 4), utilityResults: utilityResults.slice(0, 4), all: [...calcOnly, ...schemeResults, ...utilityResults] };
    }, [searchQuery, t]);

    const unreadCount = useNotificationStore(s => s.notifications.filter(n => !n.readAt && !n.dismissed).length);

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
        <div className="px-5 pt-14 animate-fade-in pb-20 max-w-md mx-auto">
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    <img src="/icons/fincalix-logo.jpg" alt="FinCalix" className="w-10 h-10 rounded-xl" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-foreground">{t('home.welcome')}</h1>
                        <p className="text-muted-foreground text-sm mt-0">{t('home.tagline')}</p>
                    </div>
                </div>
                <button onClick={() => navigate('/notifications')} className="relative p-2.5 rounded-xl bg-white dark:bg-card border border-slate-200 dark:border-border text-muted-foreground shadow-lg">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                </button>
            </div>

            {/* Global Search Bar */}
            <div className="relative z-50 mb-8">
                <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all ${isSearching ? 'bg-white dark:bg-card border-violet-500 shadow-lg shadow-violet-500/10' : 'bg-muted border-slate-200 dark:border-border text-muted-foreground'}`}>
                    <Search size={18} className={isSearching ? 'text-violet-500' : 'text-muted-foreground'} />
                    <input 
                        type="text" 
                        placeholder={t('home.searchTools', 'Search any calculator...')} 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearching(true)}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-foreground placeholder-slate-400"
                    />
                    {isSearching && (
                        <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="p-1 rounded-full bg-slate-100 dark:bg-slate-700 text-muted-foreground dark:text-muted-foreground">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {isSearching && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1E293B] border border-border/50 rounded-2xl shadow-xl overflow-hidden z-50 max-h-[60vh] overflow-y-auto"
                        >
                            {!searchQuery.trim() ? (
                                <div className="p-6 text-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-card border-border flex items-center justify-center mx-auto mb-3">
                                        <Search size={20} className="text-muted-foreground" />
                                    </div>
                                    <p className="text-sm font-semibold text-muted-foreground">What are you looking for?</p>
                                    <p className="text-xs text-muted-foreground mt-1">Try "home loan", "tax", "sip" or "ppf"</p>
                                </div>
                            ) : searchResults && searchResults.all && searchResults.all.length > 0 ? (
                                <div className="py-2">
                                    {/* Calculators Group */}
                                    {searchResults.calcOnly.length > 0 && (
                                        <div>
                                            <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500">Calculators</p>
                                            {searchResults.calcOnly.map((result: any, i: number) => (
                                                <button
                                                    key={i}
                                                    onClick={() => { setIsSearching(false); setSearchQuery(''); navigate(result.path); }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-card border-border transition-colors text-left"
                                                >
                                                    <div className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${result.color}15` }}>
                                                        <result.icon size={18} style={{ color: result.color }} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-foreground">{result.title}</h3>
                                                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {/* Govt Schemes Group */}
                                    {searchResults.schemeResults.length > 0 && (
                                        <div>
                                            <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-500">Government Schemes</p>
                                            {searchResults.schemeResults.map((result: any, i: number) => (
                                                <button
                                                    key={i}
                                                    onClick={() => { setIsSearching(false); setSearchQuery(''); navigate(result.path); }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-card border-border transition-colors text-left"
                                                >
                                                    <div className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center bg-violet-50 dark:bg-violet-500/10">
                                                        <result.icon size={18} className="text-violet-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-sm font-semibold text-slate-900 dark:text-foreground truncate">{result.title}</h3>
                                                            <span className="text-[9px] bg-violet-100 dark:bg-violet-500/10 text-violet-600 px-1.5 py-0.5 rounded font-bold uppercase flex-shrink-0">Scheme</span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {/* Utilities Group */}
                                    {searchResults.utilityResults.length > 0 && (
                                        <div>
                                            <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500">Tools & Utilities</p>
                                            {searchResults.utilityResults.map((result: any, i: number) => (
                                                <button
                                                    key={i}
                                                    onClick={() => { setIsSearching(false); setSearchQuery(''); navigate(result.path); }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-card border-border transition-colors text-left"
                                                >
                                                    <div className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${result.color}15` }}>
                                                        <result.icon size={18} style={{ color: result.color }} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-sm font-semibold text-slate-900 dark:text-foreground">{result.title}</h3>
                                                            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase">Tool</span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-8 text-center flex flex-col items-center justify-center">
                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 bg-brand-purple/20 blur-xl rounded-full" />
                                        <span className="text-5xl relative">🔍</span>
                                    </div>
                                    <p className="text-sm font-semibold text-muted-foreground">No results found</p>
                                    <p className="text-xs text-muted-foreground mt-1">Try "home loan", "tax", "sip" or "ppf"</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Darken background when searching */}
            <AnimatePresence>
                {isSearching && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 0.5 }} 
                        exit={{ opacity: 0 }} 
                        onClick={() => setIsSearching(false)}
                        className="fixed inset-0 bg-background z-40" 
                    />
                )}
            </AnimatePresence>


            <section className="mb-8">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('home.myBudget')}</h2>
                    <button onClick={() => navigate('/expenses')} className="text-brand-purple text-xs font-bold">{t('home.viewAll')}</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border group active:scale-95 transition-transform cursor-pointer" onClick={() => navigate('/expenses')}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                                <Wallet size={14} />
                            </div>
                            <ChevronRight size={14} className="text-slate-600" />
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{t('home.currentBalance')}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-foreground mt-0.5">{formatINR(effectiveBalance)}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border group active:scale-95 transition-transform cursor-pointer" onClick={() => navigate('/expenses')}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-brand-green/10 flex items-center justify-center text-brand-green">
                                <TrendingUp size={14} />
                            </div>
                            <ChevronRight size={14} className="text-slate-600" />
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{t('home.monthlyIncome')}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-foreground mt-0.5">{formatINR(monthlyIncome)}</p>
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
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-foreground group-hover:scale-110 transition-transform">
                            <HistoryIcon size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-foreground font-bold">{t('home.govSchemes')}</h3>
                            <p className="text-indigo-100 text-xs mt-0.5">{t('home.explore')}</p>
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <span className="px-3 py-1.5 rounded-lg bg-white/20 text-foreground text-[10px] font-bold uppercase tracking-wider">{t('home.new2026')}</span>
                        <span className="px-3 py-1.5 rounded-lg bg-white/20 text-foreground text-[10px] font-bold uppercase tracking-wider">Central Govt</span>
                    </div>
                </motion.button>
            </section>

            {/* AI Advisor & Goal Planner */}
            <section className="mb-8 grid grid-cols-2 gap-3">
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/financial-advisor')}
                    className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 border border-amber-400/30 shadow-lg text-left"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                        <Sparkles size={18} className="text-foreground" />
                    </div>
                    <h3 className="text-foreground font-bold text-sm">Financial Advisor</h3>
                    <p className="text-foreground/60 text-[10px] mt-0.5">Personal financial plan</p>
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
                        <Target size={18} className="text-foreground" />
                    </div>
                    <h3 className="text-foreground font-bold text-sm">Goal Planner</h3>
                    <p className="text-foreground/60 text-[10px] mt-0.5">Plan your milestones</p>
                </motion.button>
            </section>

            {/* Compare Scenarios */}
            <section className="mb-8">
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/compare')}
                    className="w-full p-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 border border-violet-400/30 shadow-lg flex items-center gap-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <GitCompare size={18} className="text-foreground" />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="text-foreground font-bold text-sm">Compare Scenarios</h3>
                        <p className="text-foreground/60 text-[10px] mt-0.5">Loan A vs B, SIP rates, FD tenures</p>
                    </div>
                    <ChevronRight size={16} className="text-foreground/40" />
                </motion.button>
            </section>

            {/* Utility Tools */}
            <section className="mb-8 grid grid-cols-2 gap-3">
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/world-clock')}
                    className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 border border-blue-400/30 shadow-lg text-left"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                        <Globe size={18} className="text-foreground" />
                    </div>
                    <h3 className="text-foreground font-bold text-sm">World Clock</h3>
                    <p className="text-foreground/60 text-[10px] mt-0.5">Compare time zones</p>
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/calculator/age')}
                    className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-600 border border-orange-400/30 shadow-lg text-left"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 }}
                >
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                        <Calendar size={18} className="text-foreground" />
                    </div>
                    <h3 className="text-foreground font-bold text-sm">Age Calculator</h3>
                    <p className="text-foreground/60 text-[10px] mt-0.5">Know your exact age</p>
                </motion.button>
            </section>

            <section className="pb-6">
                <h2 className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider mb-3 px-1">
                    {recentPaths.length > 0 ? t('home.recentlyUsed') : t('home.quickCalculate')}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    {displayItems.map((item, i) => (
                        <motion.button
                            key={item.path}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate(item.path)}
                            className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                                <item.icon size={22} style={{ color: item.color }} />
                            </div>
                            <span className="text-slate-900 dark:text-foreground font-semibold text-sm truncate">{item.label}</span>
                        </motion.button>
                    ))}
                </div>
            </section>
        </div>
    );
}

