import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Clock, Bell, Settings, ChevronRight, User, Globe, Pencil, Check, Heart, Activity, Trash2, TrendingUp, Banknote, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { APP_VERSION } from '../config/app';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useSchemeStore } from '../store/useSchemeStore';
import { useLiveStatusStore, type SavedLiveProfile } from '../store/useLiveStatusStore';
import { useTranslation } from 'react-i18next';
import { AnalyticsService } from '../lib/analytics';
import { useAppColors } from '../theme/useAppColors';
import { formatINR } from '../utils/calculations';
import { calculateLiveLoanStatus, type LoanProfile } from '../utils/loanStatusEngine';
import {
    calculateSipStatus, calculateFdStatus, calculateRdStatus,
    calculatePpfStatus, calculateSsyStatus, calculateNscStatus,
    calculateKvpStatus, calculatePomisStatus, calculateScssStatus,
} from '../utils/investmentStatusEngine';

const languages: Record<string, string> = {
    en: 'English', hi: 'हिंदी', te: 'తెలుగు', ta: 'தமிழ்', kn: 'ಕನ್ನಡ', ml: 'മലയാളം'
};

const calcTypeToPath: Record<string, string> = {
    'Loan EMI': '/calculator/loan-emi',
    'Mortgage': '/calculator/advanced-mortgage',
    'SIP Calculator': '/calculator/sip',
    'FD Calculator': '/calculator/fixed-deposit',
    'PPF Calculator': '/calculator/ppf',
    'RD': '/calculator/recurring-deposit',
    'NSC Calculator': '/calculator/nsc',
    'KVP Calculator': '/calculator/kvp',
    'Post Office MIS': '/calculator/post-office-mis',
    'SCSS Calculator': '/calculator/senior-citizen-savings',
    'Post Office TD': '/calculator/post-office-td',
    'SSY Calculator': '/calculator/sukanya-samriddhi',
    'Goal Planner': '/calculator/sip',
};

const calcTypeColors: Record<string, string> = {
    'Loan EMI': '#8B5CF6',
    'Mortgage': '#8B5CF6',
    'SIP Calculator': '#3B82F6',
    'FD Calculator': '#F59E0B',
    'PPF Calculator': '#06B6D4',
    'RD': '#F59E0B',
    'NSC Calculator': '#14B8A6',
    'KVP Calculator': '#22C55E',
    'Post Office MIS': '#8B5CF6',
    'SCSS Calculator': '#EC4899',
    'Post Office TD': '#F97316',
    'SSY Calculator': '#EC4899',
    'Goal Planner': '#3B82F6',
};

const calcTypeIcons: Record<string, typeof Banknote> = {
    'Loan EMI': Banknote,
    'Mortgage': Banknote,
    'SIP Calculator': TrendingUp,
    'FD Calculator': TrendingUp,
    'PPF Calculator': TrendingUp,
    'RD': TrendingUp,
    'NSC Calculator': TrendingUp,
    'KVP Calculator': TrendingUp,
    'Post Office MIS': TrendingUp,
    'SCSS Calculator': TrendingUp,
    'Post Office TD': TrendingUp,
    'SSY Calculator': TrendingUp,
    'Goal Planner': TrendingUp,
};

function fmtDate(dateStr: string | number): string {
    if (!dateStr) return '—';
    const d = typeof dateStr === 'number' ? new Date(dateStr) : new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Compute live status for a saved profile based on current date/time
function computeLiveData(profile: SavedLiveProfile): { label1: string; value1: string; label2: string; value2: string; label3: string; value3: string; progress: number; statusText: string } | null {
    const d = profile.profileData;
    if (!d) return null;

    try {
        const type = profile.calculatorType;

        // Loan types
        if (type === 'Loan EMI' || type === 'Mortgage') {
            const loanProfile: LoanProfile = {
                loanAmount: d.loanAmount,
                annualRate: d.annualRate,
                tenureMonths: d.tenureMonths,
                emiAmount: d.emiAmount,
                disbursementDate: d.disbursementDate,
                emiDueDay: d.emiDueDay || 5,
                loanType: d.loanType || 'floating',
            };
            const s = calculateLiveLoanStatus(loanProfile);
            if (s.loanFullyPaid) {
                return {
                    label1: 'Total Paid', value1: formatINR(s.totalPaidSoFar),
                    label2: 'Interest Paid', value2: formatINR(s.interestPaidSoFar),
                    label3: 'Status', value3: 'Fully Paid',
                    progress: 100, statusText: 'Loan Complete'
                };
            }
            return {
                label1: 'Outstanding', value1: formatINR(s.principalOutstanding),
                label2: 'EMIs Paid', value2: `${s.emisPaid}/${loanProfile.tenureMonths}`,
                label3: 'Next EMI', value3: fmtDate(s.nextEmiDate),
                progress: s.percentComplete, statusText: `${s.percentComplete.toFixed(1)}% done`
            };
        }

        // SIP
        if (type === 'SIP Calculator') {
            const s = calculateSipStatus({ monthlySip: d.monthlyAmount || 0, annualReturn: d.annualReturn || 0, startDate: d.startDate });
            return {
                label1: 'Invested', value1: formatINR(s.totalInvested),
                label2: 'Current Value', value2: formatINR(s.currentValue),
                label3: 'Gain', value3: formatINR(s.wealthGained),
                progress: s.progressToGoal, statusText: `${s.sipRunningYears}Y ${s.sipRunningMonths}M`
            };
        }

        // FD
        if (type === 'FD Calculator') {
            const s = calculateFdStatus({ principal: d.principal, annualRate: d.annualRate, tenureMonths: d.tenureMonths, startDate: d.startDate, compoundingFreq: d.compoundingFreq || 4 });
            return {
                label1: 'Deposited', value1: formatINR(d.principal),
                label2: 'Value Today', value2: formatINR(s.valueToday),
                label3: 'Interest', value3: formatINR(s.interestEarnedToday),
                progress: s.percentComplete, statusText: `${s.percentComplete.toFixed(1)}% tenure`
            };
        }

        // RD
        if (type === 'RD') {
            const s = calculateRdStatus({ monthlyDeposit: d.monthlyDeposit || 0, annualRate: d.annualRate || 5.8, tenureMonths: d.tenureMonths || 60, startDate: d.startDate });
            return {
                label1: 'Deposited', value1: formatINR(s.totalDeposited),
                label2: 'Value Today', value2: formatINR(s.currentValue),
                label3: 'Interest', value3: formatINR(s.interestEarned),
                progress: s.percentComplete, statusText: `${s.percentComplete.toFixed(1)}% tenure`
            };
        }

        // PPF
        if (type === 'PPF Calculator') {
            const s = calculatePpfStatus({ yearlyDeposit: d.yearlyDeposit || 0, rate: d.annualRate || 7.1, openingDate: d.startDate });
            return {
                label1: 'Deposited', value1: formatINR(s.totalDeposited),
                label2: 'Balance', value2: formatINR(s.balanceToday),
                label3: 'Interest', value3: formatINR(s.interestEarned),
                progress: Math.min(100, (s.yearsCompleted / 15) * 100), statusText: `Year ${s.currentYear}/15`
            };
        }

        // SSY
        if (type === 'SSY Calculator') {
            const s = calculateSsyStatus({ yearlyDeposit: d.yearlyDeposit || 0, rate: d.annualRate || 8.2, openingDate: d.startDate, girlDob: d.girlDob || d.startDate });
            return {
                label1: 'Deposited', value1: formatINR(s.totalDeposited),
                label2: 'Balance', value2: formatINR(s.balanceToday),
                label3: 'Interest', value3: formatINR(s.interestEarned),
                progress: Math.min(100, (s.accountAge / 21) * 100), statusText: `Year ${s.accountAge}/21`
            };
        }

        // NSC
        if (type === 'NSC Calculator') {
            const s = calculateNscStatus({ principal: d.principal || 0, rate: d.annualRate || 7.7, purchaseDate: d.startDate });
            return {
                label1: 'Invested', value1: formatINR(d.principal),
                label2: 'Value Today', value2: formatINR(s.valueToday),
                label3: 'Interest', value3: formatINR(s.interestEarned),
                progress: Math.min(100, (s.yearsCompleted / 5) * 100), statusText: `${(Math.min(1, s.yearsCompleted/5)*100).toFixed(1)}% of 5yr`
            };
        }

        // KVP
        if (type === 'KVP Calculator') {
            const s = calculateKvpStatus({ principal: d.principal || 0, rate: d.annualRate || 7.5, purchaseDate: d.startDate });
            return {
                label1: 'Invested', value1: formatINR(d.principal),
                label2: 'Value Today', value2: formatINR(s.valueToday),
                label3: 'Doubles On', value3: fmtDate(s.doublingDate),
                progress: s.progressToDoubling, statusText: `${s.progressToDoubling.toFixed(1)}% done`
            };
        }

        // POMIS
        if (type === 'Post Office MIS') {
            const s = calculatePomisStatus({ principal: d.principal || 0, rate: d.annualRate || 7.4, startDate: d.startDate });
            return {
                label1: 'Invested', value1: formatINR(d.principal),
                label2: 'Monthly Income', value2: formatINR(s.monthlyIncome),
                label3: 'Total Earned', value3: formatINR(s.totalIncomeReceived),
                progress: Math.min(100, (s.monthsCompleted / 60) * 100), statusText: `${s.monthsCompleted}/60 payouts`
            };
        }

        // SCSS
        if (type === 'SCSS Calculator') {
            const s = calculateScssStatus({ principal: d.principal || 0, rate: d.annualRate || 8.2, startDate: d.startDate, tenure: 5 });
            return {
                label1: 'Invested', value1: formatINR(d.principal),
                label2: 'Quarterly', value2: formatINR(s.quarterlyIncome),
                label3: 'Total Earned', value3: formatINR(s.totalIncomeReceived),
                progress: Math.min(100, (s.quartersCompleted / 20) * 100), statusText: `${(Math.min(1, s.quartersCompleted/20)*100).toFixed(1)}% of 5yr`
            };
        }

        // Post Office TD
        if (type === 'Post Office TD') {
            const s = calculateFdStatus({ principal: d.principal, annualRate: d.annualRate || 7.5, tenureMonths: d.tenureMonths || 60, startDate: d.startDate, compoundingFreq: 4 });
            return {
                label1: 'Deposited', value1: formatINR(d.principal),
                label2: 'Value Today', value2: formatINR(s.valueToday),
                label3: 'Interest', value3: formatINR(s.interestEarnedToday),
                progress: s.percentComplete, statusText: `${s.percentComplete.toFixed(1)}% tenure`
            };
        }
    } catch {
        return null;
    }

    return null;
}

export default function Profile() {
    useEffect(() => { AnalyticsService.trackScreen('Profile'); }, []);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { user, updateName } = useAuthStore();
    const c = useAppColors();
    const savedCount = useCalculatorStore((s) => s.savedCalculations.length);
    const historyCount = useCalculatorStore((s) => s.history.length);
    const bookmarkCount = useSchemeStore((s) => s.bookmarkedSchemes.length);
    const { savedProfiles, removeProfile } = useLiveStatusStore();

    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(user.name);

    const currentLangName = languages[i18n.language] || languages[i18n.language?.split('-')[0]] || 'English';

    const handleSaveName = () => {
        updateName(nameInput);
        setEditingName(false);
    };

    // Compute live data for all saved profiles
    const liveProfileData = useMemo(() => {
        return savedProfiles.map(p => ({
            profile: p,
            live: computeLiveData(p),
        }));
    }, [savedProfiles]);

    // Separate loans vs investments
    const loanProfiles = liveProfileData.filter(p => p.profile.calculatorType === 'Loan EMI' || p.profile.calculatorType === 'Mortgage');
    const investmentProfiles = liveProfileData.filter(p => p.profile.calculatorType !== 'Loan EMI' && p.profile.calculatorType !== 'Mortgage');

    const menuItems = [
        { icon: Bookmark, label: t('profile.saved'), color: '#10B981', key: 'saved', path: '/profile/saved' },
        { icon: Clock, label: t('profile.history'), color: '#3B82F6', key: 'history', path: '/profile/history' },
        { icon: Bookmark, label: t('profile.bookmarks'), color: '#F59E0B', key: 'bookmarks', path: '/profile/bookmarks' },
        { icon: Bell, label: t('settings.notifications'), color: '#8B5CF6', key: 'notif', path: '/notifications' },
        { icon: Settings, label: t('settings.title'), color: '#6B7280', key: 'settings', path: '/settings' },
    ];

    const getBadge = (key: string) => {
        if (key === 'saved') return savedCount;
        if (key === 'history') return historyCount;
        if (key === 'bookmarks') return bookmarkCount;
        return 0;
    };

    const initials = (user.name || 'U').slice(0, 2).toUpperCase();

    const renderTrackerCard = ({ profile, live }: { profile: SavedLiveProfile; live: ReturnType<typeof computeLiveData> }) => {
        const color = calcTypeColors[profile.calculatorType] || '#64748B';
        const path = calcTypeToPath[profile.calculatorType] || '/calculators';
        const IconComp = calcTypeIcons[profile.calculatorType] || Activity;

        return (
            <div key={profile.id} className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                        <IconComp size={18} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate" style={{ color: c.text }}>{profile.name}</h3>
                        <p className="text-[10px]" style={{ color: c.textSecondary }}>{profile.calculatorType}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                            onClick={() => navigate(path)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold border"
                            style={{ borderColor: `${color}40`, color }}
                        >
                            {t('liveStatus.viewBtn')}
                        </button>
                        <button
                            onClick={() => removeProfile(profile.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>

                {/* Live Data */}
                {live && (
                    <>
                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: c.bg }}>
                            <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(live.progress, 100)}%`, backgroundColor: color }}></div>
                        </div>
                        <p className="text-[9px] font-bold text-right mb-2" style={{ color }}>{live.statusText}</p>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-2 rounded-lg text-center" style={{ backgroundColor: `${color}10` }}>
                                <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>{live.label1}</p>
                                <p className="text-[11px] font-black" style={{ color: c.text }}>{live.value1}</p>
                            </div>
                            <div className="p-2 rounded-lg text-center" style={{ backgroundColor: `${color}10` }}>
                                <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>{live.label2}</p>
                                <p className="text-[11px] font-black" style={{ color }}>{live.value2}</p>
                            </div>
                            <div className="p-2 rounded-lg text-center" style={{ backgroundColor: `${color}10` }}>
                                <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>{live.label3}</p>
                                <p className="text-[11px] font-black" style={{ color: c.text }}>{live.value3}</p>
                            </div>
                        </div>
                    </>
                )}

                {/* Saved Date */}
                <p className="text-[9px] mt-2" style={{ color: c.textSecondary }}>
                    <Calendar size={9} className="inline mr-1" />
                    {t('liveStatus.savedOn', { date: fmtDate(profile.createdAt) })}
                </p>
            </div>
        );
    };

    return (
        <div className="px-4 pt-14 animate-fade-in">
            <h1 className="text-2xl font-bold text-foreground mb-6">{t('profile.title')}</h1>

            {/* User Card */}
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-brand-green/10 to-brand-blue/10 border border-border mb-6">
                <div className="w-14 h-14 rounded-full bg-brand-green/20 flex items-center justify-center shrink-0">
                    <span className="text-brand-green font-bold text-xl">{initials}</span>
                </div>

                <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                        {editingName ? (
                            <motion.div
                                key="edit"
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2"
                            >
                                <input
                                    autoFocus
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                    className="flex-1 bg-card border border-brand-green/40 rounded-lg px-3 py-1.5 text-foreground text-sm outline-none"
                                    maxLength={30}
                                />
                                <button onClick={handleSaveName} className="p-1.5 rounded-lg bg-brand-green/15 text-brand-green">
                                    <Check size={16} />
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="show"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2"
                            >
                                <h2 className="text-foreground font-semibold text-lg truncate">{user.name}</h2>
                                <button
                                    onClick={() => { setNameInput(user.name); setEditingName(true); }}
                                    className="p-1 rounded-lg text-muted-foreground hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    <Pencil size={14} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
                        <User size={11} />
                        <span>{t('profile.localData')}</span>
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                    { label: t('profile.saved'), value: savedCount },
                    { label: t('profile.bookmarks'), value: bookmarkCount },
                    { label: t('profile.history'), value: historyCount },
                ].map((s) => (
                    <div key={s.label} className="p-4 rounded-2xl bg-card border border-border text-center">
                        <p className="text-2xl font-bold text-foreground">{s.value}</p>
                        <p className="text-muted-foreground text-xs mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Current Language */}
            <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/15 flex items-center justify-center">
                    <Globe size={20} className="text-brand-blue" />
                </div>
                <div className="flex-1 text-left">
                    <span className="text-foreground font-medium text-sm block">{t('settings.language')}</span>
                    <span className="text-muted-foreground text-xs">{currentLangName}</span>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
            </button>

            {/* Menu */}
            <div className="space-y-2.5 mb-8">
                {menuItems.map(({ icon: Icon, label, color, key, path }) => {
                    const badge = getBadge(key);
                    return (
                        <motion.button
                            key={key}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate(path)}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border"
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                                <Icon size={20} style={{ color }} />
                            </div>
                            <span className="text-foreground font-medium text-sm flex-1 text-left">{label}</span>
                            {badge > 0 && <span className="px-2 py-0.5 rounded-full bg-brand-green/15 text-brand-green text-xs font-medium">{badge}</span>}
                            <ChevronRight size={16} className="text-muted-foreground" />
                        </motion.button>
                    );
                })}
            </div>

            {/* ═══ LIVE LOAN TRACKER ═══ */}
            {loanProfiles.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Banknote size={18} className="text-violet-500" />
                        <h2 className="font-bold text-sm" style={{ color: c.text }}>{t('liveStatus.myLoanTrackers')}</h2>
                        <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-500 text-xs font-bold">{loanProfiles.length}</span>
                    </div>
                    <div className="space-y-3">
                        {loanProfiles.map(renderTrackerCard)}
                    </div>
                </div>
            )}

            {/* ═══ LIVE INVESTMENT TRACKER ═══ */}
            {investmentProfiles.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <TrendingUp size={18} className="text-emerald-500" />
                        <h2 className="font-bold text-sm" style={{ color: c.text }}>{t('liveStatus.myInvestmentTrackers')}</h2>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-bold">{investmentProfiles.length}</span>
                    </div>
                    <div className="space-y-3">
                        {investmentProfiles.map(renderTrackerCard)}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {savedProfiles.length === 0 && (
                <div className="mb-8 p-6 rounded-2xl border border-dashed text-center" style={{ borderColor: c.border }}>
                    <Activity size={32} className="text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium" style={{ color: c.textSecondary }}>{t('liveStatus.noTrackers')}</p>
                    <p className="text-[10px] mt-1" style={{ color: c.textSecondary }}>{t('liveStatus.noTrackersDesc')}</p>
                </div>
            )}

            <div className="text-center mt-12 mb-8 animate-fade-in delay-400">
                <p className="text-slate-500 dark:text-slate-400 font-medium">FinCalix</p>
                <p className="text-slate-600 text-xs text-brand-blue/80 dark:text-cyan-400 font-bold mt-1">Version {APP_VERSION}</p>
                <div className="flex items-center justify-center gap-1 mt-2 text-xs text-slate-400">
                    {t('profile.madeWith')} <Heart size={10} className="text-red-500 fill-red-500" /> {t('profile.inIndia')}
                </div>
            </div>
        </div>
    );
}
