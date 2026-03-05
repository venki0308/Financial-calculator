import { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Calculator, FileText, Clock, Percent, PiggyBank, Landmark, Wallet, TrendingUp, LayoutGrid, RefreshCcw, ArrowUpRight, DollarSign, Target, GraduationCap, Heart, BarChart3, Minus, Building2, Car, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AnalyticsService } from '../lib/analytics';

interface CalcItem { nameKey: string; descKey: string; icon: React.ElementType; color: string; path: string; category: string; }

const allCalcs: CalcItem[] = [
    // Tax & Salary
    { nameKey: 'calculators.incomeTax.name', descKey: 'calculators.incomeTax.desc', icon: FileText, color: '#F59E0B', path: '/calculator/income-tax', category: 'taxSalary' },
    { nameKey: 'calculators.salaryHike.name', descKey: 'calculators.salaryHike.desc', icon: ArrowUpRight, color: '#10B981', path: '/calculator/salary-hike', category: 'taxSalary' },
    { nameKey: 'calculators.hra.name', descKey: 'calculators.hra.desc', icon: GraduationCap, color: '#F59E0B', path: '/calculator/hra', category: 'taxSalary' },
    // Banking
    { nameKey: 'calculators.emi.name', descKey: 'calculators.emi.desc', icon: Calculator, color: '#10B981', path: '/calculator/loan-emi', category: 'banking' },
    { nameKey: 'calculators.fd.name', descKey: 'calculators.fd.desc', icon: PiggyBank, color: '#F59E0B', path: '/calculator/fixed-deposit', category: 'banking' },
    { nameKey: 'calculators.rd.name', descKey: 'calculators.rd.desc', icon: Clock, color: '#3B82F6', path: '/calculator/recurring-deposit', category: 'banking' },
    { nameKey: 'calculators.compound.name', descKey: 'calculators.compound.desc', icon: Percent, color: '#8B5CF6', path: '/calculator/compound-interest', category: 'banking' },
    { nameKey: 'calculators.simple.name', descKey: 'calculators.simple.desc', icon: Minus, color: '#6B7280', path: '/calculator/simple-interest', category: 'banking' },
    // Investments
    { nameKey: 'calculators.sip.name', descKey: 'calculators.sip.desc', icon: Percent, color: '#3B82F6', path: '/calculator/sip', category: 'investments' },
    { nameKey: 'calculators.advancedSip.name', descKey: 'calculators.advancedSip.desc', icon: BarChart3, color: '#06B6D4', path: '/calculator/advanced-sip', category: 'investments' },
    { nameKey: 'calculators.lumpsum.name', descKey: 'calculators.lumpsum.desc', icon: Wallet, color: '#10B981', path: '/calculator/lumpsum', category: 'investments' },
    { nameKey: 'calculators.swp.name', descKey: 'calculators.swp.desc', icon: TrendingUp, color: '#F59E0B', path: '/calculator/swp', category: 'investments' },
    { nameKey: 'calculators.cagr.name', descKey: 'calculators.cagr.desc', icon: BarChart3, color: '#8B5CF6', path: '/calculator/cagr', category: 'investments' },
    { nameKey: 'calculators.stepUpSip.name', descKey: 'calculators.stepUpSip.desc', icon: ArrowUpRight, color: '#10B981', path: '/calculator/step-up-sip', category: 'investments' },
    { nameKey: 'calculators.goalSip.name', descKey: 'calculators.goalSip.desc', icon: Target, color: '#EF4444', path: '/calculator/goal-sip', category: 'investments' },
    // Retirement
    { nameKey: 'calculators.ppf.name', descKey: 'calculators.ppf.desc', icon: Landmark, color: '#10B981', path: '/calculator/ppf', category: 'retirement' },
    { nameKey: 'calculators.nps.name', descKey: 'calculators.nps.desc', icon: LayoutGrid, color: '#3B82F6', path: '/calculator/nps', category: 'retirement' },
    { nameKey: 'calculators.epf.name', descKey: 'calculators.epf.desc', icon: Wallet, color: '#F59E0B', path: '/calculator/epf', category: 'retirement' },
    { nameKey: 'calculators.gratuity.name', descKey: 'calculators.gratuity.desc', icon: DollarSign, color: '#8B5CF6', path: '/calculator/gratuity', category: 'retirement' },
    // Post Office
    { nameKey: 'calculators.ssy.name', descKey: 'calculators.ssy.desc', icon: Heart, color: '#EF4444', path: '/calculator/sukanya-samriddhi', category: 'postOffice' },
    { nameKey: 'calculators.nsc.name', descKey: 'calculators.nsc.desc', icon: RefreshCcw, color: '#3B82F6', path: '/calculator/nsc', category: 'postOffice' },
    { nameKey: 'calculators.kvp.name', descKey: 'calculators.kvp.desc', icon: Clock, color: '#F59E0B', path: '/calculator/kvp', category: 'postOffice' },
    { nameKey: 'calculators.pomis.name', descKey: 'calculators.pomis.desc', icon: DollarSign, color: '#10B981', path: '/calculator/post-office-mis', category: 'postOffice' },
    { nameKey: 'calculators.scss.name', descKey: 'calculators.scss.desc', icon: Landmark, color: '#8B5CF6', path: '/calculator/senior-citizen-savings', category: 'postOffice' },
    { nameKey: 'calculators.potd.name', descKey: 'calculators.potd.desc', icon: PiggyBank, color: '#3B82F6', path: '/calculator/post-office-td', category: 'postOffice' },
    // Property
    { nameKey: 'calculators.property.name', descKey: 'calculators.property.desc', icon: Building2, color: '#F97316', path: '/calculator/property', category: 'property' },
    // Business
    { nameKey: 'calculators.gst.name', descKey: 'calculators.gst.desc', icon: Receipt, color: '#06B6D4', path: '/calculator/gst', category: 'business' },
    { nameKey: 'calculators.breakEven.name', descKey: 'calculators.breakEven.desc', icon: BarChart3, color: '#10B981', path: '/calculator/break-even', category: 'business' },
    { nameKey: 'calculators.carLoan.name', descKey: 'calculators.carLoan.desc', icon: Car, color: '#3B82F6', path: '/calculator/car-loan', category: 'others' },
];

const categoryOrder = ['all', 'taxSalary', 'banking', 'investments', 'retirement', 'postOffice', 'property', 'business', 'others'];

const categoryEmojis: Record<string, string> = {
    all: '📊',
    taxSalary: '💰',
    banking: '🏦',
    investments: '📈',
    retirement: '🏖️',
    postOffice: '📮',
    property: '🏠',
    business: '💼',
    others: '📦',
};

export default function Calculators() {
    useEffect(() => { AnalyticsService.trackScreen('Calculators_List'); }, []);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const filtered = allCalcs.filter((c) => {
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

    return (
        <div className="px-4 pt-14 animate-fade-in">
            <div className="mb-5">
                <h1 className="text-2xl font-bold text-white">{t('calculators.title')}</h1>
                <p className="text-slate-500 text-sm mt-1">{t('calculators.subtitle')}</p>
            </div>

            {/* Search */}
            <div className="relative mb-4 sticky top-12 z-10">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                    type="text"
                    placeholder={t('calculators.search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-dark-card border border-dark-border text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
                />
            </div>

            {/* Category Filter Pills */}
            <div className="mb-5 -mx-4 px-4 overflow-x-auto hide-scrollbar">
                <div className="flex gap-2 pb-1 min-w-max">
                    {categoryOrder.map(cat => {
                        const isActive = selectedCategory === cat;
                        const label = cat === 'all' ? t('common.all') : t(`calculators.categories.${cat}` as any);
                        return (
                            <motion.button
                                key={cat}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedCategory(cat)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${isActive
                                        ? 'bg-brand-green text-black shadow-lg shadow-brand-green/20'
                                        : 'bg-dark-card border border-dark-border text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <span className="text-sm">{categoryEmojis[cat]}</span>
                                {label}
                            </motion.button>
                        );
                    })}
                </div>
            </div>



            {/* Count */}
            <p className="text-slate-500 text-xs mb-3 px-1">{filtered.length} {t('calculators.subtitle').toLowerCase().includes('calc') ? 'calculators' : t('calculators.subtitle')}</p>

            {/* List */}
            <div className="space-y-7 mb-6">
                {sortedCategories.map((category) => {
                    const items = grouped[category];
                    const categoryLabel = t(`calculators.categories.${category}` as any);
                    return (
                        <section key={category}>
                            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                <span className="mr-1.5">{categoryEmojis[category]}</span>
                                {categoryLabel} ({items.length})
                            </h2>
                            <div className="space-y-2.5">
                                {items.map((item, i) => (
                                    <motion.button
                                        key={item.nameKey}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => navigate(item.path)}
                                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-dark-card border border-dark-border transition-colors animate-slide-up"
                                        style={{ animationDelay: `${i * 40}ms` }}
                                    >
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${item.color}15` }}>
                                            <item.icon size={20} style={{ color: item.color }} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <h3 className="text-white font-medium text-sm">{t(item.nameKey as any)}</h3>
                                            <p className="text-slate-500 text-xs mt-0.5">{t(item.descKey as any)}</p>
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
                    <p className="text-slate-400 text-sm">{t('calculators.search')} — no results</p>
                </div>
            )}
        </div>
    );
}