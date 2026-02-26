import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Bookmark, Users, GraduationCap, Tractor, Building2, UserCheck, Shield, Home as HomeIcon, Landmark, Heart, Briefcase, HandHeart, Clock, ChevronDown, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { schemes, schemeCategories, FREE_SCHEME_IDS } from '../data/schemes';
import { useSchemeStore } from '../store/useSchemeStore';
import { useAuthStore } from '../store/useAuthStore';
import BottomSheet from '../components/BottomSheet';
import PremiumModal from '../components/PremiumModal';

const catIcons: Record<string, React.ElementType> = { Women: Users, Education: GraduationCap, Farmers: Tractor, MSME: Building2, 'Senior Citizens': UserCheck, Insurance: Shield, Housing: HomeIcon, Banking: Landmark, Pension: Clock, Health: Heart, Employment: Briefcase, 'Social Welfare': HandHeart };

export default function Schemes() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { bookmarkedSchemes, addBookmark, removeBookmark } = useSchemeStore();
    const hasPremium = useAuthStore((s) => s.hasPremium);
    const isAdmin = useAuthStore((s) => s.isAdmin());
    const canAccessAll = hasPremium || isAdmin;
    const [search, setSearch] = useState('');
    const [selectedCat, setSelectedCat] = useState('');
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    // All schemes are central now. Free users see all but can only access FREE schemes in detail
    const filtered = schemes.filter((s) => {
        const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase());
        const matchCat = !selectedCat || s.category === selectedCat;
        return matchSearch && matchCat;
    });

    const isFreeScheme = (id: string) => FREE_SCHEME_IDS.includes(id);

    const handleSchemeClick = (scheme: typeof schemes[0]) => {
        if (!canAccessAll && !isFreeScheme(scheme.id)) {
            setShowPremiumModal(true);
            return;
        }
        navigate(`/scheme/${scheme.id}`);
    };

    return (
        <div className="px-4 pt-14 animate-fade-in">
            <div className="mb-5">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('schemes.title')}</h1>
                <p className="text-slate-500 text-sm mt-1">{t('schemes.subtitle')}</p>
            </div>

            {/* Premium Banner */}
            {!canAccessAll && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="cursor-pointer mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-600/20 to-amber-700/20 border border-amber-500/30"
                    onClick={() => setShowPremiumModal(true)}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                            <Lock size={20} className="text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-slate-900 dark:text-white font-semibold text-sm">Unlock All Schemes</p>
                            <p className="text-amber-600 dark:text-amber-300/70 text-xs mt-0.5">Free users: MUDRA & Sukanya Samriddhi only</p>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold shrink-0">Premium</div>
                    </div>
                </motion.div>
            )}

            {/* Search */}
            <div className="relative mb-4">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder={t('schemes.search')} value={search} onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-brand-green/50" />
            </div>



            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-5 pb-1">
                <button onClick={() => setSelectedCat('')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${!selectedCat ? 'bg-brand-green text-white' : 'bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-500 dark:text-slate-400'}`}>{t('schemes.all')}</button>
                {schemeCategories.map((c) => {
                    const catMap: Record<string, string> = { 'Women': 'schemes.catWomen', 'Education': 'schemes.catEducation', 'Farmers': 'schemes.catFarmers', 'MSME': 'schemes.catMSME', 'Senior Citizens': 'schemes.catSenior', 'Insurance': 'schemes.catInsurance', 'Housing': 'schemes.catHousing', 'Health': 'schemes.catHealth', 'Banking': 'schemes.catBanking', 'Pension': 'schemes.catPension', 'Employment': 'schemes.catEmployment', 'Social Welfare': 'schemes.catSocialWelfare' };
                    return (
                        <button key={c.name} onClick={() => setSelectedCat(selectedCat === c.name ? '' : c.name)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${selectedCat === c.name ? 'bg-brand-green text-white' : 'bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-500 dark:text-slate-400'}`}>{catMap[c.name] ? t(catMap[c.name]) : c.name}</button>
                    );
                })}
            </div>

            {/* Results count */}
            <p className="text-slate-500 text-xs mb-3">{t('schemes.showing')} {filtered.length} {t('schemes.schemesCount')}</p>

            {/* Scheme Cards */}
            <div className="space-y-3 mb-6">
                {filtered.map((scheme, i) => {
                    const isBookmarked = bookmarkedSchemes.includes(scheme.id);
                    const isLocked = !canAccessAll && !isFreeScheme(scheme.id);
                    return (
                        <motion.div key={scheme.id} whileTap={{ scale: 0.98 }}
                            className={`p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border animate-slide-up ${isLocked ? 'opacity-75' : ''}`} style={{ animationDelay: `${i * 30}ms` }}>
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex gap-1.5 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${isFreeScheme(scheme.id) ? 'bg-brand-green/15 text-brand-green' : 'bg-brand-blue/15 text-brand-blue'}`}>
                                        {isFreeScheme(scheme.id) ? 'Free' : 'Central Govt'}
                                    </span>
                                    {scheme.popular && <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-brand-green/15 text-brand-green">{t('schemes.popular')}</span>}
                                    {isLocked && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/15 text-amber-500 flex items-center gap-0.5">
                                            <Lock size={8} /> {t('common.premium')}
                                        </span>
                                    )}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); isBookmarked ? removeBookmark(scheme.id) : addBookmark(scheme.id); }}>
                                    <Bookmark size={16} className={isBookmarked ? 'text-brand-gold fill-brand-gold' : 'text-slate-500'} />
                                </button>
                            </div>
                            <button onClick={() => handleSchemeClick(scheme)} className="w-full text-left">
                                <h3 className="text-slate-900 dark:text-white font-semibold text-sm">{scheme.name}</h3>
                                <p className="text-slate-500 text-xs mt-1 line-clamp-2">{scheme.description}</p>
                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-brand-green text-xs font-medium">{scheme.interestRate || scheme.benefitAmount || ''}</span>
                                    {isLocked ? <Lock size={14} className="text-amber-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                                </div>
                            </button>
                        </motion.div>
                    );
                })}
            </div>



            {/* Premium Modal for State Schemes */}
            <PremiumModal
                isOpen={showPremiumModal}
                onClose={() => setShowPremiumModal(false)}
                onPurchase={() => { setShowPremiumModal(false); alert('Razorpay integration coming soon!'); }}
            />
        </div>
    );
}
