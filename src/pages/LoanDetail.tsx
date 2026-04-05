import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft, IndianRupee, Calendar, BarChart3, Clock, ChevronDown, ChevronUp,
    TrendingDown, Lightbulb, Trash2, CheckCircle2, Info, Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import { formatINR } from '../utils/calculations';
import { useLiveStatusStore, type SavedLiveProfile } from '../store/useLiveStatusStore';
import { getLoanById, deleteLoan as deleteLoanFromStorage } from '../utils/loanStorage';
import { calculateLiveLoanStatus, type LoanProfile } from '../utils/loanStatusEngine';
import {
    calculateSipStatus, calculateFdStatus, calculateRdStatus,
    calculatePpfStatus, calculateSsyStatus, calculateNscStatus,
    calculateKvpStatus, calculatePomisStatus, calculateScssStatus,
} from '../utils/investmentStatusEngine';
import NumberInput from '../components/NumberInput';
import { exportToPDF, type ExportConfig } from '../utils/exportReport';
import { AnalyticsService } from '../lib/analytics';

function fmtDate(d: string | number): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtYM(months: number): string {
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y === 0) return `${m}m`;
    if (m === 0) return `${y}y`;
    return `${y}y ${m}m`;
}

export default function LoanDetail() {
    const { loanId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const c = useAppColors();

    const { savedProfiles, removeProfile } = useLiveStatusStore();

    useEffect(() => { AnalyticsService.trackScreen('Tracker_Detail'); }, []);

    // Find profile from useLiveStatusStore first, then fallback to loanStorage
    const profile: SavedLiveProfile | null = useMemo(() => {
        const fromStore = savedProfiles.find(p => p.id === loanId);
        if (fromStore) return fromStore;
        // Fallback: check loanStorage
        const fromLoanStorage = getLoanById(loanId || '');
        if (fromLoanStorage) {
            return {
                id: fromLoanStorage.id,
                name: fromLoanStorage.nickName,
                calculatorType: 'Loan EMI',
                profileData: {
                    loanAmount: fromLoanStorage.loanAmount,
                    annualRate: fromLoanStorage.interestRate,
                    tenureMonths: fromLoanStorage.tenureMonths,
                    emiAmount: fromLoanStorage.emiAmount,
                    disbursementDate: fromLoanStorage.disbursementDate,
                    emiDueDay: fromLoanStorage.emiDueDay,
                    loanType: fromLoanStorage.rateType,
                },
                createdAt: new Date(fromLoanStorage.createdAt).getTime(),
                updatedAt: new Date(fromLoanStorage.updatedAt).getTime(),
            };
        }
        return null;
    }, [loanId, savedProfiles]);

    const [showPaymentHistory, setShowPaymentHistory] = useState(false);
    const [showAllFutureEmis, setShowAllFutureEmis] = useState(false);
    const [showYearlySummary, setShowYearlySummary] = useState(false);
    const [prepayAmount, setPrepayAmount] = useState(0);

    if (!profile) {
        return (
            <div className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: c.bg }}>
                <div className="text-center">
                    <p className="text-4xl mb-3">😕</p>
                    <p className="text-sm font-medium" style={{ color: c.textSecondary }}>{t('myLoans.loanNotFound')}</p>
                    <button onClick={() => navigate('/my-loans')} className="mt-4 px-5 py-2 rounded-xl text-sm font-bold text-white bg-violet-600">{t('myLoans.backToLoans')}</button>
                </div>
            </div>
        );
    }

    const d = profile.profileData;
    const isLoan = profile.calculatorType === 'Loan EMI' || profile.calculatorType === 'Mortgage';

    const handleDelete = () => {
        removeProfile(profile.id);
        deleteLoanFromStorage(profile.id);
        navigate('/my-loans');
    };

    // ═══════════════════════════════════════════════════════════════
    // LOAN DETAIL
    // ═══════════════════════════════════════════════════════════════
    if (isLoan) {
        const loanProfile: LoanProfile = {
            loanAmount: d.loanAmount, annualRate: d.annualRate, tenureMonths: d.tenureMonths,
            emiAmount: d.emiAmount, disbursementDate: d.disbursementDate,
            emiDueDay: d.emiDueDay || 5, loanType: d.loanType || 'floating',
        };
        const status = calculateLiveLoanStatus(loanProfile);
        const isFloating = d.loanType === 'floating';
        const interestPct = d.emiAmount > 0 ? (status.nextEmiInterest / d.emiAmount) * 100 : 0;
        const principalPct = 100 - interestPct;
        const principalRepaidPct = ((d.loanAmount - status.principalOutstanding) / d.loanAmount) * 100;

        const maturityDate = useMemo(() => {
            const dt = new Date(d.disbursementDate);
            dt.setMonth(dt.getMonth() + d.tenureMonths);
            return fmtDate(dt.toISOString().split('T')[0]);
        }, [d]);

        // Amortization schedule
        const fullSchedule = useMemo(() => {
            const r = d.annualRate / 12 / 100;
            const rows: { month: number; date: string; emi: number; interest: number; principal: number; balance: number; isPaid: boolean; isNext: boolean }[] = [];
            let bal = d.loanAmount;
            const disbDate = new Date(d.disbursementDate);
            const now = new Date(); now.setHours(0, 0, 0, 0);
            for (let m = 1; m <= d.tenureMonths; m++) {
                const emiDate = new Date(disbDate.getFullYear(), disbDate.getMonth() + m, d.emiDueDay || 5);
                const intPart = Math.round(bal * r);
                const prinPart = Math.min(d.emiAmount - intPart, bal);
                bal = Math.max(0, bal - prinPart);
                const isPaid = emiDate <= now;
                const isNext = !isPaid && (rows.length === 0 || rows[rows.length - 1].isPaid);
                rows.push({ month: m, date: emiDate.toISOString().split('T')[0], emi: d.emiAmount, interest: intPart, principal: prinPart, balance: bal, isPaid, isNext });
            }
            return rows;
        }, [d]);

        const yearlySummary = useMemo(() => {
            const byYear: Record<number, { totalPaid: number; principal: number; interest: number; closingBal: number }> = {};
            fullSchedule.forEach(row => {
                const yr = new Date(row.date).getFullYear();
                if (!byYear[yr]) byYear[yr] = { totalPaid: 0, principal: 0, interest: 0, closingBal: 0 };
                byYear[yr].totalPaid += row.emi;
                byYear[yr].principal += row.principal;
                byYear[yr].interest += row.interest;
                byYear[yr].closingBal = row.balance;
            });
            return Object.entries(byYear).map(([year, data]) => ({ year: Number(year), ...data }));
        }, [fullSchedule]);

        const visibleSchedule = useMemo(() => {
            if (showAllFutureEmis) return fullSchedule;
            const nextIdx = fullSchedule.findIndex(r => r.isNext);
            if (nextIdx < 0) return fullSchedule.filter(r => r.isPaid);
            return fullSchedule.slice(0, Math.min(nextIdx + 3, fullSchedule.length));
        }, [fullSchedule, showAllFutureEmis]);

        // Prepayment simulator
        const prepayResult = useMemo(() => {
            if (prepayAmount <= 0) return null;
            const r = d.annualRate / 12 / 100;
            const newPrincipal = Math.max(0, status.principalOutstanding - prepayAmount);
            if (newPrincipal <= 0) return { interestSaved: 0, monthsReduced: status.emisRemaining, newClosureDate: 'Today' };
            let bal = newPrincipal, newMonths = 0, newInterest = 0;
            while (bal > 0 && newMonths < d.tenureMonths) {
                const intPart = bal * r;
                const prinPart = d.emiAmount - intPart;
                if (prinPart <= 0) break;
                bal = Math.max(0, bal - prinPart);
                newInterest += intPart;
                newMonths++;
            }
            const currentRemInt = (status.emisRemaining * d.emiAmount) - status.principalOutstanding;
            const closureDate = new Date();
            closureDate.setMonth(closureDate.getMonth() + newMonths);
            return { interestSaved: Math.round(Math.max(0, currentRemInt - newInterest)), monthsReduced: Math.max(0, status.emisRemaining - newMonths), newClosureDate: fmtDate(closureDate.toISOString().split('T')[0]) };
        }, [prepayAmount, status, d]);

        // PDF Export
        const handleExportPDF = async () => {
            const tag = new Date().toISOString().split('T')[0];
            const config: ExportConfig = {
                title: profile.name,
                subtitle: `Loan Tracker Report — ${fmtDate(status.today)}`,
                inputs: [
                    { label: 'Loan Amount', value: formatINR(d.loanAmount) },
                    { label: 'Interest Rate', value: `${d.annualRate}% p.a.` },
                    { label: 'Tenure', value: `${d.tenureMonths} months` },
                    { label: 'EMI', value: formatINR(d.emiAmount) },
                    { label: 'Disbursed', value: fmtDate(d.disbursementDate) },
                    { label: 'Rate Type', value: d.loanType === 'floating' ? 'Floating' : 'Fixed' },
                ],
                results: [
                    { label: 'Outstanding Principal', value: formatINR(status.principalOutstanding) },
                    { label: 'EMIs Paid', value: `${status.emisPaid} of ${d.tenureMonths}` },
                    { label: 'Total Paid So Far', value: formatINR(status.totalPaidSoFar) },
                    { label: 'Principal Paid', value: formatINR(status.principalPaidSoFar) },
                    { label: 'Interest Paid', value: formatINR(status.interestPaidSoFar) },
                    { label: 'Settlement Today', value: formatINR(status.totalSettlementToday) },
                    { label: 'Interest Saved if Close', value: formatINR(status.interestSavedIfCloseToday) },
                    { label: 'Daily Interest', value: formatINR(status.dailyInterest) },
                    { label: 'Progress', value: `${status.percentComplete.toFixed(1)}%` },
                ],
                projectionTitle: 'Year-wise Summary',
                projectionColumns: ['Year', 'Total Paid', 'Principal', 'Interest', 'Closing Balance'],
                projectionRows: yearlySummary.map(r => [r.year, formatINR(r.totalPaid), formatINR(r.principal), formatINR(r.interest), formatINR(r.closingBal)]),
                filename: `FinCalix_LoanTracker_${tag}`,
            };
            await exportToPDF(config);
        };

        return (
            <div className="min-h-dvh" style={{ backgroundColor: c.bg }}>
                <div className="sticky top-0 z-10 px-4 pt-14 pb-3 border-b" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/my-loans')} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}>
                                <ArrowLeft size={18} style={{ color: c.textSecondary }} />
                            </button>
                            <div>
                                <h1 className="text-base font-bold" style={{ color: c.text }}>{profile.name}</h1>
                                <p className="text-[10px]" style={{ color: c.textSecondary }}>{profile.calculatorType}</p>
                            </div>
                        </div>
                        <button onClick={handleExportPDF} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <Download size={16} style={{ color: c.textSecondary }} />
                        </button>
                    </div>
                </div>

                <div className="px-4 pb-28 pt-4 space-y-4">
                    {/* Live Banner */}
                    <div className="flex items-center gap-2 px-1">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>
                            {t('liveStatus.liveAsOf', { date: fmtDate(status.today) })}
                        </p>
                    </div>

                    {/* Close Today */}
                    {!status.loanNotStarted && !status.loanFullyPaid && (
                        <div className="p-5 rounded-2xl border-2 shadow-sm" style={{ backgroundColor: c.card, borderColor: '#10B981' }}>
                            <div className="flex items-center gap-2 mb-3">
                                <IndianRupee className="w-5 h-5 text-emerald-500" />
                                <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('liveStatus.closeThisLoanToday')}</h3>
                            </div>
                            <p className="text-2xl font-black text-emerald-500 mb-3">{formatINR(status.totalSettlementToday)}</p>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between"><span style={{ color: c.textSecondary }}>{t('liveStatus.principalOutstanding')}</span><span className="font-medium" style={{ color: c.text }}>{formatINR(status.principalOutstanding)}</span></div>
                                <div className="flex justify-between"><span style={{ color: c.textSecondary }}>{t('liveStatus.interestAccruedDays', { days: status.daysSinceLastEmi, rate: d.annualRate })}</span><span className="font-medium text-amber-500">+{formatINR(status.interestAccruedToday)}</span></div>
                                <div className="flex justify-between"><span style={{ color: c.textSecondary }}>{t('liveStatus.foreclosureChargeLabel', { type: isFloating ? t('liveStatus.nilRbi2014') : '3%' })}</span><span className={`font-medium ${status.foreclosureCharge > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{status.foreclosureCharge > 0 ? `+${formatINR(status.foreclosureCharge)}` : t('liveStatus.nil')}</span></div>
                            </div>
                            <p className="text-[10px] mt-3 text-center" style={{ color: c.textSecondary }}>{t('liveStatus.perDay')}: {formatINR(status.dailyInterest)}/day</p>
                        </div>
                    )}

                    {status.loanFullyPaid && (
                        <div className="p-5 rounded-2xl border-2" style={{ backgroundColor: '#10B98115', borderColor: '#10B98140' }}>
                            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /><h3 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{t('liveStatus.loanFullyPaid')}</h3></div>
                        </div>
                    )}

                    {/* EMI Status */}
                    {!status.loanNotStarted && !status.loanFullyPaid && (
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <div className="flex items-center gap-2 mb-3"><Calendar className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.emiStatus')}</h3></div>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#10B98115' }}><p className="text-[9px] uppercase font-bold text-emerald-500">{t('liveStatus.emisPaidLabel')}</p><p className="text-lg font-black text-emerald-500">{status.emisPaid}</p></div>
                                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F59E0B15' }}><p className="text-[9px] uppercase font-bold text-amber-500">{t('myLoans.emisLeft')}</p><p className="text-lg font-black text-amber-500">{status.emisRemaining}</p></div>
                                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#3B82F615' }}><p className="text-[9px] uppercase font-bold text-blue-500">{t('myLoans.nextEmiDue')}</p><p className="text-[11px] font-black text-blue-500">{fmtDate(status.nextEmiDate)}</p></div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs"><span style={{ color: c.textSecondary }}>{t('liveStatus.interestToBank')}</span><span className="font-medium text-amber-500">{formatINR(status.nextEmiInterest)} ({interestPct.toFixed(1)}%)</span></div>
                                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: c.bg }}><div className="h-full bg-amber-500 rounded-full" style={{ width: `${interestPct}%` }} /></div>
                                <div className="flex justify-between text-xs"><span style={{ color: c.textSecondary }}>{t('liveStatus.principalToEquity')}</span><span className="font-medium text-emerald-500">{formatINR(status.nextEmiPrincipal)} ({principalPct.toFixed(1)}%)</span></div>
                            </div>
                        </div>
                    )}

                    {/* Progress */}
                    {!status.loanNotStarted && (
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <div className="flex items-center gap-2 mb-3"><BarChart3 className="w-4 h-4 text-violet-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.loanProgress')}</h3></div>
                            <div className="w-full h-3 rounded-full overflow-hidden mb-1" style={{ backgroundColor: c.bg }}><div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${Math.min(principalRepaidPct, 100)}%` }} /></div>
                            <p className="text-[9px] font-bold text-right mb-3" style={{ color: '#10B981' }}>{principalRepaidPct.toFixed(1)}% {t('myLoans.principalRepaid')}</p>
                            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                                <div><p className="font-bold" style={{ color: c.textSecondary }}>{t('myLoans.repaid')}</p><p className="font-black text-emerald-500">{formatINR(d.loanAmount - status.principalOutstanding)}</p></div>
                                <div><p className="font-bold" style={{ color: c.textSecondary }}>{t('myLoans.stillOwe')}</p><p className="font-black text-red-500">{formatINR(status.principalOutstanding)}</p></div>
                                <div><p className="font-bold" style={{ color: c.textSecondary }}>{t('myLoans.original')}</p><p className="font-black" style={{ color: c.text }}>{formatINR(d.loanAmount)}</p></div>
                            </div>
                            <div className="mt-3 pt-3 border-t" style={{ borderColor: c.border }}>
                                <div className="w-full h-2 rounded-full overflow-hidden mb-1" style={{ backgroundColor: c.bg }}><div className="h-full bg-violet-500 rounded-full" style={{ width: `${status.percentComplete}%` }} /></div>
                                <p className="text-[9px]" style={{ color: c.textSecondary }}>{status.emisPaid} {t('myLoans.monthsDone')} · {status.emisRemaining} {t('myLoans.monthsRemaining')} · {t('myLoans.closes')} {maturityDate}</p>
                            </div>
                        </div>
                    )}

                    {/* Payment History */}
                    <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <button onClick={() => setShowPaymentHistory(!showPaymentHistory)} className="w-full p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.paymentHistory')}</h3></div>
                            {showPaymentHistory ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                        </button>
                        <AnimatePresence>
                            {showPaymentHistory && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="px-4 pb-4 border-t overflow-x-auto" style={{ borderColor: c.border }}>
                                        <table className="w-full text-[10px] min-w-[500px] mt-2">
                                            <thead><tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}><th className="py-2 text-left font-bold">#</th><th className="py-2 text-left font-bold">{t('myLoans.thDate')}</th><th className="py-2 text-right font-bold">EMI</th><th className="py-2 text-right font-bold">{t('liveStatus.interestLabel')}</th><th className="py-2 text-right font-bold">{t('liveStatus.principalLabel')}</th><th className="py-2 text-right font-bold">{t('myLoans.thBalance')}</th></tr></thead>
                                            <tbody>
                                                {visibleSchedule.map(row => (
                                                    <tr key={row.month} className={row.isNext ? 'bg-blue-500/10' : row.isPaid ? '' : 'opacity-40'} style={{ borderBottom: `1px solid ${c.border}40`, color: c.text }}>
                                                        <td className="py-1.5 font-medium">{row.isNext ? <span className="text-blue-500 font-bold">NEXT</span> : row.month}</td>
                                                        <td className="py-1.5" style={{ color: c.textSecondary }}>{fmtDate(row.date)}</td>
                                                        <td className="py-1.5 text-right font-medium">{formatINR(row.emi)}</td>
                                                        <td className="py-1.5 text-right text-amber-500">{formatINR(row.interest)}</td>
                                                        <td className="py-1.5 text-right text-emerald-500">{formatINR(row.principal)}</td>
                                                        <td className="py-1.5 text-right font-medium">{formatINR(row.balance)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {!showAllFutureEmis && fullSchedule.length > visibleSchedule.length && (
                                            <button onClick={() => setShowAllFutureEmis(true)} className="w-full mt-2 py-2 text-[10px] font-bold text-violet-500">{t('myLoans.showAllEmis', { count: fullSchedule.length - visibleSchedule.length })}</button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Yearly Summary */}
                    <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <button onClick={() => setShowYearlySummary(!showYearlySummary)} className="w-full p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2"><TrendingDown className="w-4 h-4 text-violet-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.yearlySummary')}</h3></div>
                            {showYearlySummary ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                        </button>
                        <AnimatePresence>
                            {showYearlySummary && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="px-4 pb-4 border-t overflow-x-auto" style={{ borderColor: c.border }}>
                                        <table className="w-full text-[10px] min-w-[400px] mt-2">
                                            <thead><tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}><th className="py-2 text-left font-bold">{t('liveStatus.thYear')}</th><th className="py-2 text-right font-bold">{t('myLoans.thTotalPaid')}</th><th className="py-2 text-right font-bold">{t('liveStatus.principalLabel')}</th><th className="py-2 text-right font-bold">{t('liveStatus.interestLabel')}</th><th className="py-2 text-right font-bold">{t('myLoans.thBalance')}</th></tr></thead>
                                            <tbody>
                                                {yearlySummary.map(row => {
                                                    const isCurrent = row.year === new Date().getFullYear();
                                                    return (<tr key={row.year} className={isCurrent ? 'bg-violet-500/5' : ''} style={{ borderBottom: `1px solid ${c.border}40`, color: c.text }}><td className={`py-1.5 font-medium ${isCurrent ? 'text-violet-500 font-bold' : ''}`}>{row.year}</td><td className="py-1.5 text-right">{formatINR(row.totalPaid)}</td><td className="py-1.5 text-right text-blue-500">{formatINR(row.principal)}</td><td className="py-1.5 text-right text-amber-500">{formatINR(row.interest)}</td><td className="py-1.5 text-right font-medium">{formatINR(row.closingBal)}</td></tr>);
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Prepayment Simulator */}
                    {!status.loanFullyPaid && !status.loanNotStarted && (
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <div className="flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4 text-emerald-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.whatIfPrepay')}</h3></div>
                            <NumberInput label={t('myLoans.prepayAmount')} value={prepayAmount} onChange={setPrepayAmount} min={0} max={status.principalOutstanding} prefix="₹" />
                            {prepayResult && (
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#10B98115' }}><p className="text-[8px] uppercase font-bold text-emerald-500">{t('liveStatus.interestSaved')}</p><p className="text-[11px] font-black text-emerald-500">{formatINR(prepayResult.interestSaved)}</p></div>
                                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#3B82F615' }}><p className="text-[8px] uppercase font-bold text-blue-500">{t('myLoans.tenureReduced')}</p><p className="text-[11px] font-black text-blue-500">{fmtYM(prepayResult.monthsReduced)}</p></div>
                                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#8B5CF615' }}><p className="text-[8px] uppercase font-bold text-violet-500">{t('myLoans.newClosure')}</p><p className="text-[11px] font-black text-violet-500">{prepayResult.newClosureDate}</p></div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleExportPDF} className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border" style={{ borderColor: c.border, color: c.text }}><Download size={16} /> PDF</button>
                        <button onClick={handleDelete} className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-red-500/10 text-red-500 border border-red-500/20"><Trash2 size={16} /> {t('myLoans.deleteTracker')}</button>
                    </div>
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════���══════════
    // INVESTMENT DETAIL (SIP, FD, RD, PPF, SSY, NSC, KVP, POMIS, SCSS, Goal)
    // ══════════════════════════��════════════════════════════════════
    const investmentMetrics = useMemo(() => {
        const type = profile.calculatorType;
        try {
            if (type === 'SIP Calculator') {
                const s = calculateSipStatus({ monthlySip: d.monthlyAmount || d.monthlySip || 0, annualReturn: d.annualReturn || 12, startDate: d.startDate });
                return { rows: [['Months Invested', String(s.monthsInvested)], ['Total Invested', formatINR(s.totalInvested)], ['Current Value', formatINR(s.currentValue)], ['Wealth Gained', formatINR(s.wealthGained)], ['Return %', `${s.returnPercent.toFixed(2)}%`], ['Running Since', `${s.sipRunningYears}Y ${s.sipRunningMonths}M`]], progress: Math.min(100, s.monthsInvested), statusText: `${s.sipRunningYears}Y ${s.sipRunningMonths}M`, headline: formatINR(s.currentValue), headlineLabel: 'Current Value' };
            }
            if (type === 'FD Calculator' || type === 'Post Office TD') {
                const s = calculateFdStatus({ principal: d.principal, annualRate: d.annualRate, tenureMonths: d.tenureMonths, startDate: d.startDate, compoundingFreq: d.compoundingFreq || 4 });
                return { rows: [['Days Invested', String(s.daysInvested)], ['Principal', formatINR(d.principal)], ['Value Today', formatINR(s.valueToday)], ['Interest Earned', formatINR(s.interestEarnedToday)], ['Daily Earning', formatINR(s.dailyEarning)], ['Maturity Date', fmtDate(s.maturityDate)], ['Maturity Value', formatINR(s.maturityValue)], ['Days Remaining', String(s.daysRemaining)]], progress: s.percentComplete, statusText: `${s.percentComplete.toFixed(1)}%`, headline: formatINR(s.valueToday), headlineLabel: 'Value Today' };
            }
            if (type === 'RD') {
                const s = calculateRdStatus({ monthlyDeposit: d.monthlyDeposit || 0, annualRate: d.annualRate || 5.8, tenureMonths: d.tenureMonths || 60, startDate: d.startDate });
                return { rows: [['Total Deposited', formatINR(s.totalDeposited)], ['Current Value', formatINR(s.currentValue)], ['Interest Earned', formatINR(s.interestEarned)], ['Completion', `${s.percentComplete.toFixed(1)}%`]], progress: s.percentComplete, statusText: `${s.percentComplete.toFixed(1)}%`, headline: formatINR(s.currentValue), headlineLabel: 'Current Value' };
            }
            if (type === 'PPF Calculator') {
                const s = calculatePpfStatus({ yearlyDeposit: d.yearlyDeposit || 0, rate: d.annualRate || 7.1, openingDate: d.startDate });
                return { rows: [['Year', `${s.currentYear} of 15`], ['Total Deposited', formatINR(s.totalDeposited)], ['Current Balance', formatINR(s.balanceToday)], ['Interest Earned', formatINR(s.interestEarned)], ['Maturity Date', fmtDate(s.maturityDate)]], progress: Math.min(100, (s.yearsCompleted / 15) * 100), statusText: `Year ${s.currentYear}/15`, headline: formatINR(s.balanceToday), headlineLabel: 'Balance' };
            }
            if (type === 'SSY Calculator') {
                const s = calculateSsyStatus({ yearlyDeposit: d.yearlyDeposit || 0, rate: d.annualRate || 8.2, openingDate: d.startDate, girlDob: d.girlDob || d.startDate });
                return { rows: [['Account Age', `${s.accountAge} years`], ['Total Deposited', formatINR(s.totalDeposited)], ['Current Balance', formatINR(s.balanceToday)], ['Interest Earned', formatINR(s.interestEarned)]], progress: Math.min(100, (s.accountAge / 21) * 100), statusText: `Year ${s.accountAge}/21`, headline: formatINR(s.balanceToday), headlineLabel: 'Balance' };
            }
            if (type === 'NSC Calculator') {
                const s = calculateNscStatus({ principal: d.principal || 0, rate: d.annualRate || 7.7, purchaseDate: d.startDate });
                return { rows: [['Invested', formatINR(d.principal)], ['Value Today', formatINR(s.valueToday)], ['Interest Earned', formatINR(s.interestEarned)], ['Years Completed', `${s.yearsCompleted.toFixed(1)} of 5`]], progress: Math.min(100, (s.yearsCompleted / 5) * 100), statusText: `${(Math.min(1, s.yearsCompleted / 5) * 100).toFixed(0)}%`, headline: formatINR(s.valueToday), headlineLabel: 'Value Today' };
            }
            if (type === 'KVP Calculator') {
                const s = calculateKvpStatus({ principal: d.principal || 0, rate: d.annualRate || 7.5, purchaseDate: d.startDate });
                return { rows: [['Invested', formatINR(d.principal)], ['Value Today', formatINR(s.valueToday)], ['Gain', formatINR(s.gainSoFar)], ['Progress to 2x', `${s.progressToDoubling.toFixed(1)}%`], ['Doubling Date', fmtDate(s.doublingDate)]], progress: s.progressToDoubling, statusText: `${s.progressToDoubling.toFixed(0)}% to 2x`, headline: formatINR(s.valueToday), headlineLabel: 'Value Today' };
            }
            if (type === 'Post Office MIS') {
                const s = calculatePomisStatus({ principal: d.principal || 0, rate: d.annualRate || 7.4, startDate: d.startDate });
                return { rows: [['Invested', formatINR(d.principal)], ['Monthly Income', formatINR(s.monthlyIncome)], ['Total Received', formatINR(s.totalIncomeReceived)], ['Months Completed', `${s.monthsCompleted}/60`]], progress: Math.min(100, (s.monthsCompleted / 60) * 100), statusText: `${s.monthsCompleted}/60`, headline: formatINR(s.monthlyIncome), headlineLabel: 'Monthly Income' };
            }
            if (type === 'SCSS Calculator') {
                const s = calculateScssStatus({ principal: d.principal || 0, rate: d.annualRate || 8.2, startDate: d.startDate, tenure: 5 });
                return { rows: [['Invested', formatINR(d.principal)], ['Quarterly Income', formatINR(s.quarterlyIncome)], ['Total Received', formatINR(s.totalIncomeReceived)], ['Quarters Done', `${s.quartersCompleted}/20`]], progress: Math.min(100, (s.quartersCompleted / 20) * 100), statusText: `${s.quartersCompleted}/20 qtrs`, headline: formatINR(s.quarterlyIncome), headlineLabel: 'Quarterly Income' };
            }
            if (type === 'Goal Planner') {
                const s = calculateSipStatus({ monthlySip: d.monthlyAmount || 0, annualReturn: d.annualReturn || 12, startDate: d.startDate, targetAmount: d.targetAmount });
                return { rows: [['Invested', formatINR(s.totalInvested)], ['Current Value', formatINR(s.currentValue)], ['Goal Progress', `${s.progressToGoal.toFixed(1)}%`], ['Wealth Gained', formatINR(s.wealthGained)]], progress: s.progressToGoal, statusText: `${s.progressToGoal.toFixed(0)}% to goal`, headline: formatINR(s.currentValue), headlineLabel: 'Current Value' };
            }
        } catch { /* skip */ }
        return { rows: [], progress: 0, statusText: '—', headline: '—', headlineLabel: '' };
    }, [profile, d]);

    // PDF for investment
    const handleInvestmentPDF = async () => {
        const tag = new Date().toISOString().split('T')[0];
        const config: ExportConfig = {
            title: profile.name,
            subtitle: `${profile.calculatorType} — Live Status Report`,
            inputs: Object.entries(d).filter(([k]) => k !== 'startDate').map(([k, v]) => ({ label: k, value: typeof v === 'number' ? formatINR(v) : String(v) })),
            results: investmentMetrics.rows.map(([label, value]) => ({ label, value: String(value) })),
            filename: `FinCalix_${profile.calculatorType.replace(/\s+/g, '_')}_${tag}`,
        };
        await exportToPDF(config);
    };

    return (
        <div className="min-h-dvh" style={{ backgroundColor: c.bg }}>
            <div className="sticky top-0 z-10 px-4 pt-14 pb-3 border-b" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/my-loans')} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}><ArrowLeft size={18} style={{ color: c.textSecondary }} /></button>
                        <div>
                            <h1 className="text-base font-bold" style={{ color: c.text }}>{profile.name}</h1>
                            <p className="text-[10px]" style={{ color: c.textSecondary }}>{profile.calculatorType}</p>
                        </div>
                    </div>
                    <button onClick={handleInvestmentPDF} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}><Download size={16} style={{ color: c.textSecondary }} /></button>
                </div>
            </div>

            <div className="px-4 pb-28 pt-4 space-y-4">
                {/* Live Banner */}
                <div className="flex items-center gap-2 px-1">
                    <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" /></span>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>{t('liveStatus.liveAsOf', { date: fmtDate(new Date().toISOString().split('T')[0]) })}</p>
                </div>

                {/* Headline */}
                <div className="p-5 rounded-2xl border-2 shadow-sm text-center" style={{ backgroundColor: c.card, borderColor: '#10B981' }}>
                    <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: c.textSecondary }}>{investmentMetrics.headlineLabel}</p>
                    <p className="text-3xl font-black text-emerald-500">{investmentMetrics.headline}</p>
                </div>

                {/* Progress */}
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="w-full h-3 rounded-full overflow-hidden mb-1" style={{ backgroundColor: c.bg }}><div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${Math.min(investmentMetrics.progress, 100)}%` }} /></div>
                    <p className="text-[10px] font-bold text-right" style={{ color: '#10B981' }}>{investmentMetrics.statusText}</p>
                </div>

                {/* Details Table */}
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center gap-2 mb-3"><Info className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.loanInformation')}</h3></div>
                    <div className="space-y-2">
                        {investmentMetrics.rows.map(([label, value], i) => (
                            <div key={i} className="flex justify-between py-1.5 border-b text-xs" style={{ borderColor: `${c.border}60` }}>
                                <span style={{ color: c.textSecondary }}>{label}</span>
                                <span className="font-medium" style={{ color: c.text }}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Saved Date */}
                <p className="text-[10px] text-center" style={{ color: c.textSecondary }}>{t('liveStatus.savedOn', { date: fmtDate(profile.createdAt) })}</p>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleInvestmentPDF} className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border" style={{ borderColor: c.border, color: c.text }}><Download size={16} /> PDF</button>
                    <button onClick={handleDelete} className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-red-500/10 text-red-500 border border-red-500/20"><Trash2 size={16} /> {t('myLoans.deleteTracker')}</button>
                </div>
            </div>
        </div>
    );
}