import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Bookmark, Users, GraduationCap, Tractor, Building2, UserCheck, Shield, Home as HomeIcon, Landmark, Heart, Briefcase, HandHeart, Clock, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { schemes, schemeCategories } from '../data/schemes';
import { useSchemeStore } from '../store/useSchemeStore';
import { useTranslatedSchemeList } from '../hooks/useTranslatedScheme';
import { AnalyticsService } from '../lib/analytics';
import DisclaimerComponent from '../components/DisclaimerComponent';

const catIcons: Record<string, React.ElementType> = { Women: Users, Education: GraduationCap, Farmers: Tractor, MSME: Building2, 'Senior Citizens': UserCheck, Insurance: Shield, Housing: HomeIcon, Banking: Landmark, Pension: Clock, Health: Heart, Employment: Briefcase, 'Social Welfare': HandHeart };

export default function Schemes() {
    useEffect(() => { AnalyticsService.trackScreen('Schemes_List'); }, []);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { bookmarkedSchemes, addBookmark, removeBookmark } = useSchemeStore();
    const [search, setSearch] = useState('');
    const [selectedCat, setSelectedCat] = useState('');

    const translatedSchemes = useTranslatedSchemeList(schemes);

    const filtered = useMemo(() => translatedSchemes.filter((s) => {
        const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
        const matchCat = !selectedCat || s.category === selectedCat;
        return matchSearch && matchCat;
    }), [search, selectedCat, translatedSchemes]);

    return (
        <div className="px-4 pt-14 animate-fade-in">
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-foreground">{t('schemes.title')}</h1>
                <p className="text-muted-foreground text-sm mt-1">{t('schemes.subtitle')}</p>
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder={t('schemes.search')} value={search} onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border text-slate-900 dark:text-foreground placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-brand-green/50" />
            </div>

            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-5 pb-1">
                <button onClick={() => setSelectedCat('')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${!selectedCat ? 'bg-brand-green text-white' : 'bg-white dark:bg-card border border-slate-200 dark:border-border text-muted-foreground dark:text-muted-foreground'}`}>{t('schemes.all')}</button>
                {schemeCategories.map((c) => {
                    const catMap: Record<string, string> = { 'Women': 'schemes.catWomen', 'Education': 'schemes.catEducation', 'Farmers': 'schemes.catFarmers', 'MSME': 'schemes.catMSME', 'Senior Citizens': 'schemes.catSenior', 'Insurance': 'schemes.catInsurance', 'Housing': 'schemes.catHousing', 'Health': 'schemes.catHealth', 'Banking': 'schemes.catBanking', 'Pension': 'schemes.catPension', 'Employment': 'schemes.catEmployment', 'Social Welfare': 'schemes.catSocialWelfare', 'Digital': 'schemes.catDigital', 'Energy': 'schemes.catEnergy', 'Youth': 'schemes.catYouth', 'Skill Development': 'schemes.catSkillDev', 'Infrastructure': 'schemes.catInfra' };
                    return (
                        <button key={c.name} onClick={() => setSelectedCat(selectedCat === c.name ? '' : c.name)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${selectedCat === c.name ? 'bg-brand-green text-white' : 'bg-white dark:bg-card border border-slate-200 dark:border-border text-muted-foreground dark:text-muted-foreground'}`}>{catMap[c.name] ? t(catMap[c.name]) : c.name}</button>
                    );
                })}
            </div>

            {/* Results count */}
            <p className="text-muted-foreground text-xs mb-3">{t('schemes.showing')} {filtered.length} {t('schemes.schemesCount')}</p>

            {/* Quarterly rate disclaimer — small-savings interest rates are
                revised by the Govt of India every quarter (Mar / Jun / Sep / Dec).
                Surface this once at the top of the browse page so users don't
                plan around stale numbers. */}
            <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/15">
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mb-0.5">
                    📅 {t('schemes.quarterlyNoteTitle', 'Rates revised every quarter')}
                </p>
                <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 leading-snug">
                    {t('schemes.quarterlyNoteBody', 'PPF, SSY, NSC, KVP, POMIS, SCSS rates are notified by the Govt of India each quarter (Mar / Jun / Sep / Dec). Verify the current rate at indiapost.gov.in or rbi.org.in before investing.')}
                </p>
            </div>

            {/* Scheme Cards */}
            <div className="space-y-3 mb-6">
                {filtered.map((scheme) => {
                    const isBookmarked = bookmarkedSchemes.includes(scheme.id);
                    return (
                        <div key={scheme.id}
                            className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border active:scale-[0.98] transition-transform">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-brand-blue/15 text-brand-blue">{t('schemes.centralGovt')}</span>
                                    {scheme.popular && <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-brand-green/15 text-brand-green">{t('schemes.popular')}</span>}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); isBookmarked ? removeBookmark(scheme.id) : addBookmark(scheme.id); }}>
                                    <Bookmark size={16} className={isBookmarked ? 'text-brand-gold fill-brand-gold' : 'text-muted-foreground'} />
                                </button>
                            </div>
                            <button onClick={() => navigate(`/scheme/${scheme.id}`)} className="w-full text-left">
                                <h3 className="text-slate-900 dark:text-foreground font-semibold text-sm">{scheme.name}</h3>
                                <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{scheme.description}</p>
                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-brand-green text-xs font-medium">{scheme.interestRate || scheme.benefitAmount || ''}</span>
                                    <ChevronRight size={16} className="text-muted-foreground" />
                                </div>
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="pb-32">
                <DisclaimerComponent module="schemes" />
            </div>
        </div>
    );
}
