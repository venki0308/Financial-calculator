import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Lightbulb, Calendar, Clock, IndianRupee, CheckCircle2, AlertTriangle, TrendingDown, Shield, Banknote, Target, BarChart3, Save, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import { formatINR } from '../utils/calculations';
import { calculateLiveLoanStatus, type LoanProfile } from '../utils/loanStatusEngine';
import { useLiveStatusStore } from '../store/useLiveStatusStore';
import { saveLoan as saveLoanToStorage, deleteLoan as deleteLoanFromStorage, getAllLoans, generateLoanId, type SavedLoan } from '../utils/loanStorage';

function fmtDate(dateStr: string, locale: string = 'en-IN'): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtYearsMonths(totalMonths: number, t: (key: string, opts?: any) => string): string {
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    if (y === 0) return t('liveStatus.nMonths', { count: m });
    if (m === 0) return t('liveStatus.nYears', { count: y });
    return `${y}${t('liveStatus.yShort')} ${m}${t('liveStatus.mShort')}`;
}

interface Props {
    profile: LoanProfile;
}

export default function LiveLoanStatus({ profile }: Props) {
    const { t } = useTranslation();
    const c = useAppColors();
    const [expandForeclosure, setExpandForeclosure] = useState(false);
    const [expandTimeline, setExpandTimeline] = useState(false);
    const [profileName, setProfileName] = useState('');
    const [lenderName, setLenderName] = useState('');
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);
    const [savedProfileId, setSavedProfileId] = useState<string | null>(null);

    const { addProfile, removeProfile, savedProfiles } = useLiveStatusStore();

    const status = useMemo(() => calculateLiveLoanStatus(profile), [profile]);

    // Check if this loan is already saved (in either store)
    const existingSaved = useMemo(() => {
        const fromLiveStore = savedProfiles.find(p =>
            p.profileData?.disbursementDate === profile.disbursementDate &&
            p.profileData?.loanAmount === profile.loanAmount &&
            p.calculatorType === 'Loan EMI'
        );
        if (fromLiveStore) return fromLiveStore;
        const fromLoanStorage = getAllLoans().find(l =>
            l.disbursementDate === profile.disbursementDate &&
            l.loanAmount === profile.loanAmount &&
            l.isActive
        );
        return fromLoanStorage ? { id: fromLoanStorage.id } : undefined;
    }, [savedProfiles, profile]);

    const isAlreadySaved = profileSaved || !!existingSaved;
    const currentSavedId = savedProfileId || existingSaved?.id || null;

    // Loan not started
    if (status.loanNotStarted) {
        return (
            <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-sm" style={{ color: c.text }}>{t('liveStatus.liveLoanTracker')}</h3>
                </div>
                <p className="text-sm" style={{ color: c.textSecondary }}>
                    {t('liveStatus.loanNotStartedYet', { date: fmtDate(profile.disbursementDate) })}
                </p>
            </div>
        );
    }

    // Loan fully paid
    if (status.loanFullyPaid) {
        return (
            <div className="p-5 rounded-2xl border-2 shadow-sm" style={{ backgroundColor: '#10B98115', borderColor: '#10B98140' }}>
                <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{t('liveStatus.loanFullyPaid')}</h3>
                </div>
                <p className="text-sm" style={{ color: c.textSecondary }}>
                    {t('liveStatus.totalPaidDesc', { total: formatINR(status.totalPaidSoFar), interest: formatINR(status.interestPaidSoFar), tenure: fmtYearsMonths(profile.tenureMonths, t) })}
                </p>
            </div>
        );
    }

    const interestPct = profile.emiAmount > 0 ? (status.nextEmiInterest / profile.emiAmount) * 100 : 0;
    const principalPct = 100 - interestPct;

    // Foreclosure charges based on RBI rules
    const isFloating = profile.loanType === 'floating';
    const foreclosureChargeRate = isFloating ? 0 : 3;

    // Year-wise amortization snapshot (next 5 years from current position)
    const yearlySnapshot = useMemo(() => {
        const rows: { year: number; opening: number; principalPaid: number; interestPaid: number; closing: number }[] = [];
        let bal = status.principalOutstanding;
        const r = profile.annualRate / 12 / 100;
        const currentYear = new Date().getFullYear();

        for (let yr = 0; yr < Math.min(5, Math.ceil(status.emisRemaining / 12)); yr++) {
            const opening = bal;
            let yearP = 0, yearI = 0;
            const monthsThisYear = Math.min(12, status.emisRemaining - yr * 12);
            for (let m = 0; m < monthsThisYear; m++) {
                const intPart = bal * r;
                const prinPart = profile.emiAmount - intPart;
                yearI += intPart;
                yearP += prinPart;
                bal = Math.max(0, bal - prinPart);
            }
            rows.push({ year: currentYear + yr, opening, principalPaid: yearP, interestPaid: yearI, closing: bal });
        }
        return rows;
    }, [status, profile]);

    return (
        <div className="space-y-4">
            {/* HEADER */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>
                        {t('liveStatus.liveAsOf', { date: fmtDate(status.today) })}
                    </p>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {t('liveStatus.percentDone', { percent: status.percentComplete.toFixed(1) })}
                </span>
            </div>

            {/* 1. LOAN JOURNEY OVERVIEW */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('liveStatus.yourLoanJourney')}</h3>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div>
                        <p className="text-[9px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('liveStatus.loanStarted')}</p>
                        <p className="text-xs font-bold" style={{ color: c.text }}>{fmtDate(profile.disbursementDate)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('liveStatus.emisPaidLabel')}</p>
                        <p className="text-xs font-bold" style={{ color: c.text }}>{status.emisPaid} / {profile.tenureMonths}</p>
                    </div>
                    <div>
                        <p className="text-[9px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('liveStatus.remaining')}</p>
                        <p className="text-xs font-bold" style={{ color: c.text }}>{fmtYearsMonths(status.emisRemaining, t)}</p>
                    </div>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: c.bg }}>
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                        style={{ width: `${status.percentComplete}%` }}></div>
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[9px] font-medium" style={{ color: c.textSecondary }}>{t('liveStatus.start')}</span>
                    <span className="text-[9px] font-bold" style={{ color: c.textSecondary }}>{t('liveStatus.percentComplete', { percent: status.percentComplete.toFixed(1) })}</span>
                    <span className="text-[9px] font-medium" style={{ color: c.textSecondary }}>{t('liveStatus.end')}</span>
                </div>
            </div>

            {/* 2. MONEY PAID SO FAR */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-3">
                    <Banknote className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('liveStatus.paidTillDate')}</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#10B98115', border: '1px solid #10B98130' }}>
                        <p className="text-[9px] uppercase font-bold text-emerald-500 mb-1">{t('liveStatus.totalPaid')}</p>
                        <p className="text-sm font-black text-emerald-500">{formatINR(status.totalPaidSoFar)}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: c.textSecondary }}>{t('liveStatus.nEmis', { count: status.emisPaid })}</p>
                    </div>
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#3B82F615', border: '1px solid #3B82F630' }}>
                        <p className="text-[9px] uppercase font-bold text-blue-500 mb-1">{t('liveStatus.principalLabel')}</p>
                        <p className="text-sm font-black text-blue-500">{formatINR(status.principalPaidSoFar)}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: c.textSecondary }}>{t('liveStatus.percentOfEmis', { percent: (status.principalPaidSoFar / status.totalPaidSoFar * 100).toFixed(0) })}</p>
                    </div>
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B30' }}>
                        <p className="text-[9px] uppercase font-bold text-amber-500 mb-1">{t('liveStatus.interestLabel')}</p>
                        <p className="text-sm font-black text-amber-500">{formatINR(status.interestPaidSoFar)}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: c.textSecondary }}>{t('liveStatus.percentOfEmis', { percent: (status.interestPaidSoFar / status.totalPaidSoFar * 100).toFixed(0) })}</p>
                    </div>
                </div>
            </div>

            {/* 3. WHAT YOU STILL OWE */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-red-500" />
                    <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('liveStatus.whatYouStillOwe')}</h3>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center py-1">
                        <span className="text-sm" style={{ color: c.textSecondary }}>{t('liveStatus.principalOutstanding')}</span>
                        <span className="text-sm font-bold" style={{ color: c.text }}>{formatINR(status.principalOutstanding)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span className="text-sm" style={{ color: c.textSecondary }}>{t('liveStatus.remainingEmisCount', { count: status.emisRemaining })}</span>
                        <span className="text-sm font-medium" style={{ color: c.text }}>{formatINR(status.emisRemaining * profile.emiAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span className="text-sm" style={{ color: c.textSecondary }}>{t('liveStatus.remainingInterest')}</span>
                        <span className="text-sm font-medium text-amber-500">{formatINR((status.emisRemaining * profile.emiAmount) - status.principalOutstanding)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-center" style={{ borderColor: c.border }}>
                        <span className="text-sm font-bold" style={{ color: c.text }}>{t('liveStatus.totalStillToPay')}</span>
                        <span className="text-sm font-bold text-red-500">{formatINR(status.emisRemaining * profile.emiAmount)}</span>
                    </div>
                </div>
            </div>

            {/* 4. NEXT EMI DETAILS */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('liveStatus.nextEmiAmount', { amount: formatINR(profile.emiAmount) })}</h3>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {status.daysToNextEmi === 0 ? t('liveStatus.dueToday') : t('liveStatus.inNDays', { days: status.daysToNextEmi })}
                    </span>
                </div>
                <p className="text-xs mb-3" style={{ color: c.textSecondary }}>{t('liveStatus.dueOn', { date: fmtDate(status.nextEmiDate) })}</p>
                <div className="space-y-2">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: c.textSecondary }}>{t('liveStatus.interestToBank')}</span>
                            <span className="font-medium text-amber-500">{formatINR(status.nextEmiInterest)} ({interestPct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: c.bg }}>
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${interestPct}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: c.textSecondary }}>{t('liveStatus.principalToEquity')}</span>
                            <span className="font-medium text-emerald-500">{formatINR(status.nextEmiPrincipal)} ({principalPct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: c.bg }}>
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${principalPct}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. DAILY INTEREST COST */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: '#F59E0B08', borderColor: '#F59E0B30' }}>
                <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('liveStatus.interestRunningNow')}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B30' }}>
                        <p className="text-[9px] uppercase font-bold text-amber-500 mb-1">{t('liveStatus.perDay')}</p>
                        <p className="text-lg font-black text-amber-500">{formatINR(status.dailyInterest)}</p>
                    </div>
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B30' }}>
                        <p className="text-[9px] uppercase font-bold text-amber-500 mb-1">{t('liveStatus.perHour')}</p>
                        <p className="text-lg font-black text-amber-500">{formatINR(status.hourlyInterest)}</p>
                    </div>
                </div>
                <p className="text-[10px]" style={{ color: c.textSecondary }}>
                    {t('liveStatus.sinceLastEmiAccrual', {
                        lastDate: fmtDate(status.lastEmiDate),
                        accrued: formatINR(status.interestAccruedToday),
                        days: status.daysSinceLastEmi,
                        nextDate: fmtDate(status.nextEmiDate),
                        moreAccrual: formatINR(status.daysToNextEmi * status.dailyInterest)
                    })}
                </p>
            </div>

            {/* 6. FORECLOSURE / CLOSE TODAY */}
            <div className="rounded-2xl border-2 shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: '#10B981' }}>
                <button onClick={() => setExpandForeclosure(!expandForeclosure)}
                    className="w-full p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <IndianRupee className="w-5 h-5 text-emerald-500" />
                        <div className="text-left">
                            <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('liveStatus.closeThisLoanToday')}</h3>
                            <p className="text-[10px]" style={{ color: c.textSecondary }}>{t('liveStatus.exactForeclosureAmount')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-emerald-500">{formatINR(status.totalSettlementToday)}</span>
                        {expandForeclosure ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                    </div>
                </button>

                <AnimatePresence>
                    {expandForeclosure && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden">
                            <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: c.border }}>
                                <div className="space-y-2 pt-3">
                                    <div className="flex justify-between text-sm">
                                        <span style={{ color: c.textSecondary }}>{t('liveStatus.principalOutstanding')}</span>
                                        <span className="font-medium" style={{ color: c.text }}>{formatINR(status.principalOutstanding)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span style={{ color: c.textSecondary }}>{t('liveStatus.interestAccruedDays', { days: status.daysSinceLastEmi, rate: profile.annualRate })}</span>
                                        <span className="font-medium text-amber-500">+{formatINR(status.interestAccruedToday)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span style={{ color: c.textSecondary }}>{t('liveStatus.foreclosureChargeLabel', { type: isFloating ? t('liveStatus.nilRbi2014') : `${foreclosureChargeRate}%` })}</span>
                                        <span className={`font-medium ${status.foreclosureCharge > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {status.foreclosureCharge > 0 ? `+${formatINR(status.foreclosureCharge)}` : t('liveStatus.nil')}
                                        </span>
                                    </div>
                                    <div className="border-t pt-2 flex justify-between font-bold" style={{ borderColor: c.border }}>
                                        <span style={{ color: c.text }}>{t('liveStatus.totalSettlementToday')}</span>
                                        <span className="text-lg text-emerald-500">{formatINR(status.totalSettlementToday)}</span>
                                    </div>
                                </div>

                                {/* Savings analysis */}
                                <div className="p-3 rounded-xl" style={{ backgroundColor: '#10B98115', border: '1px solid #10B98130' }}>
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">{t('liveStatus.ifYouCloseYouSave')}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[9px] uppercase font-bold text-emerald-500">{t('liveStatus.interestSaved')}</p>
                                            <p className="text-sm font-black text-emerald-500">{formatINR(status.interestSavedIfCloseToday)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] uppercase font-bold text-emerald-500">{t('liveStatus.timeSaved')}</p>
                                            <p className="text-sm font-black text-emerald-500">{fmtYearsMonths(status.emisRemaining, t)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* RBI Rule */}
                                {isFloating && (
                                    <div className="p-3 rounded-xl flex items-start gap-2" style={{ backgroundColor: '#3B82F615', border: '1px solid #3B82F630' }}>
                                        <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-blue-600 dark:text-blue-400 leading-relaxed">
                                            <strong>{t('liveStatus.rbiCircular2014Title')}:</strong> {t('liveStatus.rbiCircular2014Desc')}
                                        </p>
                                    </div>
                                )}
                                {!isFloating && (
                                    <div className="p-3 rounded-xl flex items-start gap-2" style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B30' }}>
                                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed">
                                            <strong>{t('liveStatus.fixedRateLoanTitle')}:</strong> {t('liveStatus.fixedRateLoanDesc')}
                                        </p>
                                    </div>
                                )}

                                <p className="text-[9px] text-center" style={{ color: c.textSecondary }}>
                                    {t('liveStatus.amountChangesDaily')}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 7. YEAR-WISE REMAINING SCHEDULE */}
            <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <button onClick={() => setExpandTimeline(!expandTimeline)}
                    className="w-full p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-violet-500" />
                        <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('liveStatus.yearWiseSchedule')}</h3>
                    </div>
                    {expandTimeline ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                </button>
                <AnimatePresence>
                    {expandTimeline && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden">
                            <div className="px-4 pb-4 border-t" style={{ borderColor: c.border }}>
                                <div className="overflow-x-auto mt-3">
                                    <table className="w-full text-[11px]">
                                        <thead>
                                            <tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}>
                                                <th className="py-2 text-left font-bold">{t('liveStatus.thYear')}</th>
                                                <th className="py-2 text-right font-bold">{t('liveStatus.thOpening')}</th>
                                                <th className="py-2 text-right font-bold">{t('liveStatus.principalLabel')}</th>
                                                <th className="py-2 text-right font-bold">{t('liveStatus.interestLabel')}</th>
                                                <th className="py-2 text-right font-bold">{t('liveStatus.thClosing')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {yearlySnapshot.map((row) => (
                                                <tr key={row.year} style={{ borderBottom: `1px solid ${c.border}`, color: c.text }}>
                                                    <td className="py-2 font-medium">{row.year}</td>
                                                    <td className="py-2 text-right" style={{ color: c.textSecondary }}>{formatINR(row.opening)}</td>
                                                    <td className="py-2 text-right text-blue-500">{formatINR(row.principalPaid)}</td>
                                                    <td className="py-2 text-right text-amber-500">{formatINR(row.interestPaid)}</td>
                                                    <td className="py-2 text-right font-medium">{formatINR(row.closing)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {yearlySnapshot.length < Math.ceil(status.emisRemaining / 12) && (
                                    <p className="text-[9px] text-center mt-2" style={{ color: c.textSecondary }}>
                                        {t('liveStatus.showingNext5Years')}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 8. SMART INSIGHT */}
            <div className="p-4 rounded-2xl" style={{ backgroundColor: '#10B98110', border: '1px solid #10B98125' }}>
                <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">{t('liveStatus.financialAdvisorInsight')}</p>
                        <p className="text-[11px] leading-relaxed" style={{ color: c.textSecondary }}>
                            {interestPct > 60
                                ? t('liveStatus.highInterestAdvice', { percent: interestPct.toFixed(0) })
                                : t('liveStatus.goodProgressAdvice', { percent: principalPct.toFixed(0) })
                            }
                            {status.interestSavedIfCloseToday > 100000 && ` ${t('liveStatus.closeTodaySaveAdvice', { amount: formatINR(status.interestSavedIfCloseToday) })}`}
                        </p>
                        {/* Not-advice footnote (legal compliance) */}
                        <p className="mt-1.5 text-[9px] italic" style={{ color: c.textSecondary }}>
                            {t('liveStatus.notFinancialAdvice')}
                        </p>
                    </div>
                </div>
            </div>

            {/* 9. SAVE THIS TRACKER */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                {isAlreadySaved ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-bold text-emerald-500">{t('liveStatus.savedToProfile')}</span>
                        </div>
                        <button
                            onClick={() => {
                                if (currentSavedId) {
                                    removeProfile(currentSavedId);
                                    deleteLoanFromStorage(currentSavedId);
                                    setProfileSaved(false);
                                    setSavedProfileId(null);
                                }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20"
                        >
                            <Trash2 size={12} /> {t('liveStatus.removeBtn')}
                        </button>
                    </div>
                ) : showSaveForm ? (
                    <div className="space-y-3">
                        <p className="text-sm font-bold" style={{ color: c.text }}>{t('liveStatus.nameThisLoanTracker')}</p>
                        <input
                            autoFocus
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder={t('liveStatus.namePlaceholder')}
                            className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none"
                            style={{ borderColor: c.border, color: c.text }}
                            maxLength={40}
                        />
                        <input
                            value={lenderName}
                            onChange={(e) => setLenderName(e.target.value)}
                            placeholder={t('myLoans.lenderPlaceholder')}
                            className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none"
                            style={{ borderColor: c.border, color: c.text }}
                            maxLength={50}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowSaveForm(false)}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold border"
                                style={{ borderColor: c.border, color: c.textSecondary }}
                            >
                                {t('liveStatus.cancelBtn')}
                            </button>
                            <button
                                onClick={() => {
                                    if (!profileName.trim()) return;
                                    const id = generateLoanId();
                                    // Save to live status store
                                    addProfile({
                                        id,
                                        name: profileName.trim(),
                                        calculatorType: 'Loan EMI',
                                        profileData: { ...profile },
                                        createdAt: Date.now(),
                                        updatedAt: Date.now(),
                                    });
                                    // Also save to loanStorage for My Loans page
                                    const loanData: SavedLoan = {
                                        id,
                                        nickName: profileName.trim(),
                                        loanType: 'home_loan',
                                        lenderName: lenderName.trim(),
                                        loanAmount: profile.loanAmount,
                                        interestRate: profile.annualRate,
                                        tenureMonths: profile.tenureMonths,
                                        emiAmount: profile.emiAmount,
                                        rateType: profile.loanType === 'floating' ? 'floating' : 'fixed',
                                        disbursementDate: profile.disbursementDate,
                                        emiDueDay: profile.emiDueDay,
                                        createdAt: new Date().toISOString(),
                                        updatedAt: new Date().toISOString(),
                                        isActive: true,
                                    };
                                    saveLoanToStorage(loanData);
                                    setProfileSaved(true);
                                    setSavedProfileId(id);
                                    setShowSaveForm(false);
                                }}
                                disabled={!profileName.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold disabled:opacity-40"
                            >
                                {t('liveStatus.saveBtn')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowSaveForm(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-sm border border-emerald-500/20"
                    >
                        <Save size={16} /> {t('liveStatus.saveLoanTracker')}
                    </button>
                )}
            </div>
        </div>
    );
}
