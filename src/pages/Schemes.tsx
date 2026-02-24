import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Bookmark, Users, GraduationCap, Tractor, Building2, UserCheck, Shield, Home as HomeIcon, Landmark, Heart, Briefcase, HandHeart, Clock, ChevronDown, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { schemes, schemeCategories, states, unionTerritories } from '../data/schemes';
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
    const [govLevel, setGovLevel] = useState<'all' | 'central' | 'state'>('all');
    const [selectedState, setSelectedState] = useState('');
    const [selectedCat, setSelectedCat] = useState('');
    const [showStatePicker, setShowStatePicker] = useState(false);
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    // Filter: only show central schemes unless user has premium
    const filtered = schemes.filter((s) => {
        // If not premium/admin, hide state schemes entirely unless the State tab is selected
        if (!canAccessAll && s.governmentLevel === 'state' && govLevel !== 'state') return false;
        const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()) || (s.state || '').toLowerCase().includes(search.toLowerCase());
        const matchLevel = govLevel === 'all' ? (canAccessAll ? true : s.governmentLevel === 'central') : s.governmentLevel === govLevel;
        const matchState = !selectedState || s.state === selectedState;
        const matchCat = !selectedCat || s.category === selectedCat;
        return matchSearch && matchLevel && matchState && matchCat;
    });

    const centralCount = schemes.filter(s => s.governmentLevel === 'central').length;
    const stateCount = schemes.filter(s => s.governmentLevel === 'state').length;

    const handleSchemeClick = (scheme: typeof schemes[0]) => {
        // State schemes require premium (unless admin)
        if (scheme.governmentLevel === 'state' && !canAccessAll) {
            setShowPremiumModal(true);
            return;
        }
        navigate(`/scheme/${scheme.id}`);
    };

    return (
        <div className="px-4 pt-14 animate-fade-in">
            <div className="mb-5">
                <h1 className="text-2xl font-bold text-white">Government Schemes</h1>
                <p className="text-slate-500 text-sm mt-1">Central & State government schemes</p>
            </div>

            {/* Premium Banner for State Schemes */}
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
                            <p className="text-white font-semibold text-sm">{t('premium.unlockStateSchemes')}</p>
                            <p className="text-amber-300/70 text-xs mt-0.5">{t('premium.stateSchemesBanner')}</p>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold shrink-0">₹75</div>
                    </div>
                </motion.div>
            )}

            {/* Search */}
            <div className="relative mb-4">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="Search by name, category, or state..." value={search} onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-dark-card border border-dark-border text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-green/50" />
            </div>

            {/* Gov Level Selector */}
            <div className="flex rounded-2xl bg-dark-card border border-dark-border p-1 mb-4">
                {(['all', 'central', 'state'] as const).map((l) => (
                    <button key={l} onClick={() => { setGovLevel(l); if (l !== 'state') setSelectedState(''); }}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-medium capitalize transition-all flex items-center justify-center gap-1 ${govLevel === l ? 'bg-brand-green text-white' : 'text-slate-500'}`}>
                        {l === 'all' ? `All (${centralCount + (canAccessAll ? stateCount : 0)})` : l === 'central' ? `Central (${centralCount})` : <>State ({stateCount}) {!canAccessAll && <Lock size={10} />}</>}
                    </button>
                ))}
            </div>

            {/* State Picker */}
            {govLevel === 'state' && (
                <>
                    {!canAccessAll ? (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-5 rounded-2xl bg-dark-card border border-dark-border mb-4 text-center"
                        >
                            <Lock size={28} className="text-amber-500 mx-auto mb-3" />
                            <p className="text-white font-semibold text-sm mb-1">{t('schemes.statePremium')}</p>
                            <p className="text-slate-400 text-xs mb-4">{t('schemes.statePremiumDesc')}</p>
                            <button onClick={() => setShowPremiumModal(true)}
                                className="px-6 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors">
                                {t('premium.unlockFor')}
                            </button>
                        </motion.div>
                    ) : (
                        <button onClick={() => setShowStatePicker(true)}
                            className="w-full flex items-center justify-between p-3 rounded-2xl bg-dark-card border border-dark-border mb-4">
                            <span className="text-sm text-white">{selectedState || 'Select State / UT'}</span>
                            <ChevronDown size={16} className="text-slate-500" />
                        </button>
                    )}
                </>
            )}

            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-5 pb-1">
                <button onClick={() => setSelectedCat('')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${!selectedCat ? 'bg-brand-green text-white' : 'bg-dark-card border border-dark-border text-slate-400'}`}>All</button>
                {schemeCategories.map((c) => (
                    <button key={c.name} onClick={() => setSelectedCat(selectedCat === c.name ? '' : c.name)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${selectedCat === c.name ? 'bg-brand-green text-white' : 'bg-dark-card border border-dark-border text-slate-400'}`}>{c.name}</button>
                ))}
            </div>

            {/* Results count */}
            <p className="text-slate-500 text-xs mb-3">Showing {filtered.length} schemes</p>

            {/* Scheme Cards */}
            <div className="space-y-3 mb-6">
                {filtered.map((scheme, i) => {
                    const isBookmarked = bookmarkedSchemes.includes(scheme.id);
                    const isLocked = scheme.governmentLevel === 'state' && !canAccessAll;
                    return (
                        <motion.div key={scheme.id} whileTap={{ scale: 0.98 }}
                            className={`p-4 rounded-2xl bg-dark-card border border-dark-border animate-slide-up ${isLocked ? 'opacity-75' : ''}`} style={{ animationDelay: `${i * 30}ms` }}>
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex gap-1.5 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${scheme.governmentLevel === 'central' ? 'bg-brand-blue/15 text-brand-blue' : 'bg-brand-purple/15 text-brand-purple'}`}>
                                        {scheme.governmentLevel === 'central' ? 'Central' : `State: ${scheme.state}`}
                                    </span>
                                    {scheme.popular && <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-brand-green/15 text-brand-green">Popular</span>}
                                    {isLocked && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/15 text-amber-500 flex items-center gap-0.5">
                                            <Lock size={8} /> Premium
                                        </span>
                                    )}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); isBookmarked ? removeBookmark(scheme.id) : addBookmark(scheme.id); }}>
                                    <Bookmark size={16} className={isBookmarked ? 'text-brand-gold fill-brand-gold' : 'text-slate-500'} />
                                </button>
                            </div>
                            <button onClick={() => handleSchemeClick(scheme)} className="w-full text-left">
                                <h3 className="text-white font-semibold text-sm">{scheme.name}</h3>
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

            {/* State Picker Bottom Sheet */}
            <BottomSheet isOpen={showStatePicker} onClose={() => setShowStatePicker(false)} title="Select State / UT">
                <div className="space-y-1">
                    <button onClick={() => { setSelectedState(''); setShowStatePicker(false); }} className="w-full text-left p-3 rounded-xl text-sm text-white hover:bg-dark-bg">All States</button>
                    <p className="text-xs text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1">States</p>
                    {states.map((st) => (
                        <button key={st} onClick={() => { setSelectedState(st); setShowStatePicker(false); }}
                            className={`w-full text-left p-3 rounded-xl text-sm transition-colors ${selectedState === st ? 'bg-brand-green/10 text-brand-green' : 'text-slate-300 hover:bg-dark-bg'}`}>{st}</button>
                    ))}
                    <p className="text-xs text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1">Union Territories</p>
                    {unionTerritories.map((ut) => (
                        <button key={ut} onClick={() => { setSelectedState(ut); setShowStatePicker(false); }}
                            className={`w-full text-left p-3 rounded-xl text-sm transition-colors ${selectedState === ut ? 'bg-brand-green/10 text-brand-green' : 'text-slate-300 hover:bg-dark-bg'}`}>{ut}</button>
                    ))}
                </div>
            </BottomSheet>

            {/* Premium Modal for State Schemes */}
            <PremiumModal
                isOpen={showPremiumModal}
                onClose={() => setShowPremiumModal(false)}
                onPurchase={() => { setShowPremiumModal(false); alert('Razorpay integration coming soon!'); }}
            />
        </div>
    );
}
