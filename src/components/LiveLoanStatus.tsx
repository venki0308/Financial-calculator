import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Lightbulb, Calendar, Clock, TrendingDown, IndianRupee, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import { formatINR } from '../utils/calculations';
import { calculateLiveLoanStatus, type LoanProfile } from '../utils/loanStatusEngine';

function fmtDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
    profile: LoanProfile;
}

export default function LiveLoanStatus({ profile }: Props) {
    const { t } = useTranslation();
    const c = useAppColors();
    const [showCloseInsight, setShowCloseInsight] = useState(false);

    const status = useMemo(() => calculateLiveLoanStatus(profile), [profile]);

    // Loan not started
    if (status.loanNotStarted) {
        return (
            <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-sm" style={{ color: c.text }}>{t('liveStatus.title')}</h3>
                </div>
                <p className="text-sm" style={{ color: c.textSecondary }}>
                    {t('liveStatus.notStarted', { date: fmtDate(profile.disbursementDate) })}
                </p>
            </div>
        );
    }

    // Loan fully paid
    if (status.loanFullyPaid) {
        return (
            <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: '#10B98115', borderColor: '#10B98140' }}>
                <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{t('liveStatus.fullyPaid')}</h3>
                </div>
                <p className="text-sm" style={{ color: c.textSecondary }}>
                    {t('liveStatus.fullyPaidDesc', { total: formatINR(status.totalPaidSoFar), interest: formatINR(status.interestPaidSoFar) })}
                </p>
            </div>
        );
    }

    const interestPct = status.nextEmiInterest > 0 ? (status.nextEmiInterest / profile.emiAmount) * 100 : 0;
    const principalPct = 100 - interestPct;

    return (
        <div className="space-y-4">
            {/* A: Live Status Header */}
            <div className="flex items-center gap-2 px-1">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>
                    {t('liveStatus.liveAsOf', { date: fmtDate(status.today) })}
                </p>
            </div>

            {/* B: Today's Exact Position */}
            <div className="p-5 rounded-2xl border-2 shadow-sm" style={{ backgroundColor: c.card, borderColor: '#10B981' }}>
                <div className="flex items-center gap-2 mb-3">
                    <IndianRupee className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold text-sm" style={{ color: c.text }}>{t('liveStatus.ifYouPayToday')}</h3>
                </div>

                <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: c.textSecondary }}>
                    {t('liveStatus.exactAmountToClose')}
                </p>
                <p className="text-3xl font-black text-emerald-500 tracking-tight mb-1">
                    {formatINR(status.totalSettlementToday)}
                </p>
                <p className="text-[10px] mb-4" style={{ color: c.textSecondary }}>
                    ({t('liveStatus.principalPlusDays', { days: status.daysSinceLastEmi })})
                </p>

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span style={{ color: c.textSecondary }}>{t('liveStatus.principalOutstanding')}</span>
                        <span className="font-medium" style={{ color: c.text }}>{formatINR(status.principalOutstanding)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span style={{ color: c.textSecondary }}>
                            + {t('liveStatus.interestAccrued')}
                        </span>
                        <span className="font-medium text-amber-500">+{formatINR(status.interestAccruedToday)}</span>
                    </div>
                    <p className="text-[10px] text-right" style={{ color: c.textSecondary }}>
                        ({status.daysSinceLastEmi} {t('liveStatus.daysAt')} {profile.annualRate}% p.a.)
                    </p>
                    {status.foreclosureCharge > 0 && (
                        <div className="flex justify-between">
                            <span style={{ color: c.textSecondary }}>+ {t('liveStatus.foreclosureCharge')}</span>
                            <span className="font-medium text-red-500">+{formatINR(status.foreclosureCharge)}</span>
                        </div>
                    )}
                    {status.foreclosureCharge === 0 && (
                        <div className="flex justify-between">
                            <span style={{ color: c.textSecondary }}>+ {t('liveStatus.foreclosureCharge')}</span>
                            <span className="font-medium text-emerald-500">{t('liveStatus.nil')}</span>
                        </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-bold" style={{ borderColor: c.border }}>
                        <span style={{ color: c.text }}>{t('liveStatus.totalToPay')}</span>
                        <span className="text-emerald-500">{formatINR(status.totalSettlementToday)}</span>
                    </div>
                </div>
                <p className="text-[9px] mt-3" style={{ color: c.textSecondary }}>
                    {t('liveStatus.amountChangesDaily')}
                </p>
            </div>

            {/* C: EMI Countdown */}
            <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <p className="text-[9px] uppercase font-bold tracking-wider mb-1" style={{ color: c.textSecondary }}>{t('liveStatus.lastEmiPaid')}</p>
                    <p className="text-xs font-bold" style={{ color: c.text }}>{fmtDate(status.lastEmiDate)}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: c.textSecondary }}>{status.daysSinceLastEmi} {t('liveStatus.daysAgo')}</p>
                </div>
                <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: c.card, borderColor: '#3B82F640' }}>
                    <p className="text-[9px] uppercase font-bold tracking-wider mb-1 text-blue-500">{t('liveStatus.nextEmiDue')}</p>
                    <p className="text-xs font-bold text-blue-500">{fmtDate(status.nextEmiDate)}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: c.textSecondary }}>
                        {status.daysToNextEmi === 0 ? t('liveStatus.today') : t('liveStatus.inDays', { days: status.daysToNextEmi })}
                    </p>
                </div>
                <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <p className="text-[9px] uppercase font-bold tracking-wider mb-1" style={{ color: c.textSecondary }}>{t('liveStatus.emisRemaining')}</p>
                    <p className="text-xs font-bold" style={{ color: c.text }}>{status.emisRemaining} {t('liveStatus.months')}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: c.textSecondary }}>{(status.emisRemaining / 12).toFixed(1)} {t('liveStatus.yrs')}</p>
                </div>
            </div>

            {/* D: Next EMI Breakdown */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <p className="text-xs font-bold mb-3" style={{ color: c.text }}>
                    {t('liveStatus.yourNextEmi')} — {formatINR(profile.emiAmount)} {t('liveStatus.due')} {fmtDate(status.nextEmiDate)}
                </p>
                <div className="space-y-2">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: c.textSecondary }}>{t('liveStatus.interestPortion')}</span>
                            <span className="font-medium text-amber-500">{formatINR(status.nextEmiInterest)} ({interestPct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: c.bg }}>
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${interestPct}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: c.textSecondary }}>{t('liveStatus.principalPortion')}</span>
                            <span className="font-medium text-emerald-500">{formatINR(status.nextEmiPrincipal)} ({principalPct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: c.bg }}>
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${principalPct}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* E: Progress Snapshot */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <p className="text-[10px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('liveStatus.paidSoFar')}</p>
                        <p className="text-sm font-bold text-emerald-500">{formatINR(status.totalPaidSoFar)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('liveStatus.stillOwe')}</p>
                        <p className="text-sm font-bold text-amber-500">{formatINR(status.principalOutstanding)}</p>
                    </div>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: c.bg }}>
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(status.percentComplete, 100)}%` }}></div>
                </div>
                <p className="text-[10px] font-bold text-center mt-1.5" style={{ color: c.textSecondary }}>
                    {status.percentComplete.toFixed(1)}% {t('liveStatus.complete')}
                </p>
            </div>

            {/* F: Close Today Insight */}
            <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <button onClick={() => setShowCloseInsight(!showCloseInsight)}
                    className="w-full p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-bold" style={{ color: c.text }}>{t('liveStatus.whatIfCloseToday')}</span>
                    </div>
                    {showCloseInsight ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                </button>
                <AnimatePresence>
                    {showCloseInsight && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden">
                            <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: c.border }}>
                                <div className="grid grid-cols-3 gap-2 pt-3">
                                    <div className="text-center">
                                        <p className="text-[9px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('liveStatus.payToday')}</p>
                                        <p className="text-sm font-bold text-emerald-500">{formatINR(status.totalSettlementToday)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('liveStatus.interestSaved')}</p>
                                        <p className="text-sm font-bold text-emerald-500">{formatINR(status.interestSavedIfCloseToday)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('liveStatus.yearsSaved')}</p>
                                        <p className="text-sm font-bold text-emerald-500">{(status.emisRemaining / 12).toFixed(1)} {t('liveStatus.yrs')}</p>
                                    </div>
                                </div>
                                <p className="text-xs leading-relaxed" style={{ color: c.textSecondary }}>
                                    {t('liveStatus.closeInsightDesc', {
                                        settlement: formatINR(status.totalSettlementToday),
                                        saved: formatINR(status.interestSavedIfCloseToday),
                                        years: (status.emisRemaining / 12).toFixed(1)
                                    })}
                                </p>
                                {profile.loanType === 'floating' && (
                                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#10B98115', border: '1px solid #10B98130' }}>
                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                            {t('liveStatus.rbiNoCharge')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* G: Daily Interest Meter */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <p className="text-xs font-bold" style={{ color: c.text }}>{t('liveStatus.interestAccruingDaily')}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F59E0B10', border: '1px solid #F59E0B30' }}>
                        <p className="text-[9px] uppercase font-bold text-amber-500 mb-1">{t('liveStatus.perDay')}</p>
                        <p className="text-lg font-black text-amber-500">{formatINR(status.dailyInterest)}</p>
                    </div>
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F59E0B10', border: '1px solid #F59E0B30' }}>
                        <p className="text-[9px] uppercase font-bold text-amber-500 mb-1">{t('liveStatus.perHour')}</p>
                        <p className="text-lg font-black text-amber-500">{formatINR(status.hourlyInterest)}</p>
                    </div>
                </div>
                <p className="text-[10px]" style={{ color: c.textSecondary }}>
                    {t('liveStatus.untilNextEmi', {
                        date: fmtDate(status.nextEmiDate),
                        amount: formatINR(status.daysToNextEmi * status.dailyInterest)
                    })}
                </p>
            </div>
        </div>
    );
}
