import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft, Pencil, IndianRupee, Calendar, BarChart3, Clock, ChevronDown, ChevronUp,
    TrendingDown, Shield, AlertTriangle, Lightbulb, Download, Trash2, CheckCircle2, Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import { formatINR, calculateReducingEMI } from '../utils/calculations';
import { getLoanById, saveLoan, deleteLoan, LOAN_TYPE_META } from '../utils/loanStorage';
import { calculateLiveLoanStatus, type LoanProfile } from '../utils/loanStatusEngine';
import AddLoanSheet from '../components/AddLoanSheet';
import NumberInput from '../components/NumberInput';
import { AnalyticsService } from '../lib/analytics';

function fmtDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtYM(months: number, t: (k: string, o?: any) => string): string {
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y === 0) return `${m} ${t('myLoans.moShort')}`;
    if (m === 0) return `${y} ${t('myLoans.yrShort')}`;
    return `${y}y ${m}m`;
}

export default function LoanDetail() {
    const { loanId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const c = useAppColors();

    const [loan, setLoan] = useState(() => getLoanById(loanId || ''));
    const [showEditSheet, setShowEditSheet] = useState(false);
    const [showPaymentHistory, setShowPaymentHistory] = useState(false);
    const [showAllFutureEmis, setShowAllFutureEmis] = useState(false);
    const [showYearlySummary, setShowYearlySummary] = useState(false);
    const [showLoanInfo, setShowLoanInfo] = useState(false);
    const [prepayAmount, setPrepayAmount] = useState(0);

    useEffect(() => { AnalyticsService.trackScreen('Loan_Detail'); }, []);

    const refreshLoan = () => {
        setLoan(getLoanById(loanId || ''));
    };

    if (!loan) {
        return (
            <div className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: c.bg }}>
                <div className="text-center">
                    <p className="text-4xl mb-3">😕</p>
                    <p className="text-sm font-medium" style={{ color: c.textSecondary }}>{t('myLoans.loanNotFound')}</p>
                    <button onClick={() => navigate('/my-loans')} className="mt-4 px-5 py-2 rounded-xl text-sm font-bold text-white bg-violet-600">
                        {t('myLoans.backToLoans')}
                    </button>
                </div>
            </div>
        );
    }

    const meta = LOAN_TYPE_META[loan.loanType];
    const profile: LoanProfile = {
        loanAmount: loan.loanAmount,
        annualRate: loan.interestRate,
        tenureMonths: loan.tenureMonths,
        emiAmount: loan.emiAmount,
        disbursementDate: loan.disbursementDate,
        emiDueDay: loan.emiDueDay,
        loanType: loan.rateType,
    };

    const status = calculateLiveLoanStatus(profile);
    const isFloating = loan.rateType === 'floating';

    // Full amortization schedule
    const fullSchedule = useMemo(() => {
        const r = loan.interestRate / 12 / 100;
        const rows: { month: number; date: string; emi: number; interest: number; principal: number; balance: number; isPaid: boolean; isNext: boolean }[] = [];
        let bal = loan.loanAmount;
        const disbDate = new Date(loan.disbursementDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let m = 1; m <= loan.tenureMonths; m++) {
            const emiDate = new Date(disbDate.getFullYear(), disbDate.getMonth() + m, loan.emiDueDay);
            const intPart = Math.round(bal * r);
            const prinPart = Math.min(loan.emiAmount - intPart, bal);
            bal = Math.max(0, bal - prinPart);
            const isPaid = emiDate <= today;
            const isNext = !isPaid && (rows.length === 0 || rows[rows.length - 1].isPaid);
            rows.push({
                month: m,
                date: emiDate.toISOString().split('T')[0],
                emi: loan.emiAmount,
                interest: intPart,
                principal: prinPart,
                balance: bal,
                isPaid,
                isNext,
            });
        }
        return rows;
    }, [loan]);

    // Yearly summary
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

    const principalRepaidPct = ((loan.loanAmount - status.principalOutstanding) / loan.loanAmount) * 100;
    const interestPct = loan.emiAmount > 0 ? (status.nextEmiInterest / loan.emiAmount) * 100 : 0;
    const principalPct = 100 - interestPct;

    // Maturity date
    const maturityDate = useMemo(() => {
        const d = new Date(loan.disbursementDate);
        d.setMonth(d.getMonth() + loan.tenureMonths);
        return fmtDate(d.toISOString().split('T')[0]);
    }, [loan]);

    // FY tax benefit (Apr-Mar)
    const taxBenefit = useMemo(() => {
        const now = new Date();
        const fyStart = now.getMonth() >= 3 ? new Date(now.getFullYear(), 3, 1) : new Date(now.getFullYear() - 1, 3, 1);
        const fyEnd = new Date(fyStart.getFullYear() + 1, 2, 31);
        let prinThisYear = 0, intThisYear = 0;
        fullSchedule.forEach(row => {
            const rd = new Date(row.date);
            if (rd >= fyStart && rd <= fyEnd) {
                prinThisYear += row.principal;
                intThisYear += row.interest;
            }
        });
        return { principal80C: Math.round(prinThisYear), interest24b: Math.round(intThisYear), fyLabel: `${fyStart.getFullYear()}-${(fyStart.getFullYear() + 1).toString().slice(2)}` };
    }, [fullSchedule]);

    // Prepayment simulator
    const prepayResult = useMemo(() => {
        if (prepayAmount <= 0) return null;
        const r = loan.interestRate / 12 / 100;
        const withoutPrepay = calculateReducingEMI(loan.loanAmount, loan.interestRate, loan.tenureMonths);

        // Simulate: reduce outstanding by prepay amount, recalculate tenure
        const newPrincipal = Math.max(0, status.principalOutstanding - prepayAmount);
        if (newPrincipal <= 0) return { interestSaved: withoutPrepay.totalInterest - status.interestPaidSoFar, monthsReduced: status.emisRemaining, newClosureDate: t('myLoans.today') };

        // How many months to pay off newPrincipal at same EMI?
        let bal = newPrincipal;
        let newMonths = 0;
        let newInterest = 0;
        while (bal > 0 && newMonths < loan.tenureMonths) {
            const intPart = bal * r;
            const prinPart = loan.emiAmount - intPart;
            if (prinPart <= 0) break;
            bal = Math.max(0, bal - prinPart);
            newInterest += intPart;
            newMonths++;
        }

        const currentRemainingInterest = (status.emisRemaining * loan.emiAmount) - status.principalOutstanding;
        const interestSaved = Math.max(0, currentRemainingInterest - newInterest);
        const monthsReduced = status.emisRemaining - newMonths;
        const closureDate = new Date();
        closureDate.setMonth(closureDate.getMonth() + newMonths);

        return {
            interestSaved: Math.round(interestSaved),
            monthsReduced: Math.max(0, monthsReduced),
            newClosureDate: fmtDate(closureDate.toISOString().split('T')[0]),
        };
    }, [prepayAmount, status, loan]);

    // Visible payment history rows
    const visibleSchedule = useMemo(() => {
        if (showAllFutureEmis) return fullSchedule;
        // Show paid rows + next 3
        const nextIdx = fullSchedule.findIndex(r => r.isNext);
        if (nextIdx < 0) return fullSchedule.filter(r => r.isPaid);
        return fullSchedule.slice(0, Math.min(nextIdx + 3, fullSchedule.length));
    }, [fullSchedule, showAllFutureEmis]);

    const handleDelete = () => {
        deleteLoan(loan.id);
        navigate('/my-loans');
    };

    const handleMarkClosed = () => {
        saveLoan({ ...loan, isActive: false });
        refreshLoan();
    };

    return (
        <div className="min-h-dvh" style={{ backgroundColor: c.bg }}>
            {/* Header */}
            <div className="sticky top-0 z-10 px-4 pt-14 pb-3 border-b" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/my-loans')} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <ArrowLeft size={18} style={{ color: c.textSecondary }} />
                        </button>
                        <div>
                            <h1 className="text-base font-bold" style={{ color: c.text }}>{meta.icon} {loan.nickName}</h1>
                            <p className="text-[10px]" style={{ color: c.textSecondary }}>{loan.lenderName}</p>
                        </div>
                    </div>
                    <button onClick={() => setShowEditSheet(true)} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <Pencil size={16} style={{ color: c.textSecondary }} />
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

                {/* Close Today Card */}
                {!status.loanNotStarted && !status.loanFullyPaid && (
                    <div className="p-5 rounded-2xl border-2 shadow-sm" style={{ backgroundColor: c.card, borderColor: '#10B981' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <IndianRupee className="w-5 h-5 text-emerald-500" />
                            <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('liveStatus.closeThisLoanToday')}</h3>
                        </div>
                        <p className="text-2xl font-black text-emerald-500 mb-3">{formatINR(status.totalSettlementToday)}</p>
                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between"><span style={{ color: c.textSecondary }}>{t('liveStatus.principalOutstanding')}</span><span className="font-medium" style={{ color: c.text }}>{formatINR(status.principalOutstanding)}</span></div>
                            <div className="flex justify-between"><span style={{ color: c.textSecondary }}>{t('liveStatus.interestAccruedDays', { days: status.daysSinceLastEmi, rate: loan.interestRate })}</span><span className="font-medium text-amber-500">+{formatINR(status.interestAccruedToday)}</span></div>
                            <div className="flex justify-between"><span style={{ color: c.textSecondary }}>{t('liveStatus.foreclosureChargeLabel', { type: isFloating ? t('liveStatus.nilRbi2014') : '3%' })}</span><span className={`font-medium ${status.foreclosureCharge > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{status.foreclosureCharge > 0 ? `+${formatINR(status.foreclosureCharge)}` : t('liveStatus.nil')}</span></div>
                        </div>
                        <p className="text-[10px] mt-3 text-center" style={{ color: c.textSecondary }}>
                            {t('liveStatus.perDay')}: {formatINR(status.dailyInterest)}/day
                        </p>
                    </div>
                )}

                {/* EMI Status Row */}
                {!status.loanNotStarted && !status.loanFullyPaid && (
                    <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.emiStatus')}</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#10B98115' }}>
                                <p className="text-[9px] uppercase font-bold text-emerald-500">{t('liveStatus.emisPaidLabel')}</p>
                                <p className="text-lg font-black text-emerald-500">{status.emisPaid}</p>
                            </div>
                            <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F59E0B15' }}>
                                <p className="text-[9px] uppercase font-bold text-amber-500">{t('myLoans.emisLeft')}</p>
                                <p className="text-lg font-black text-amber-500">{status.emisRemaining}</p>
                            </div>
                            <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#3B82F615' }}>
                                <p className="text-[9px] uppercase font-bold text-blue-500">{t('myLoans.nextEmiDue')}</p>
                                <p className="text-[11px] font-black text-blue-500">{fmtDate(status.nextEmiDate)}</p>
                            </div>
                        </div>
                        {/* Next EMI breakdown */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span style={{ color: c.textSecondary }}>{t('liveStatus.interestToBank')}</span>
                                <span className="font-medium text-amber-500">{formatINR(status.nextEmiInterest)} ({interestPct.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: c.bg }}>
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${interestPct}%` }} />
                            </div>
                            <div className="flex justify-between text-xs">
                                <span style={{ color: c.textSecondary }}>{t('liveStatus.principalToEquity')}</span>
                                <span className="font-medium text-emerald-500">{formatINR(status.nextEmiPrincipal)} ({principalPct.toFixed(1)}%)</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress */}
                {!status.loanNotStarted && (
                    <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className="w-4 h-4 text-violet-500" />
                            <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.loanProgress')}</h3>
                        </div>
                        {/* Principal progress */}
                        <div className="mb-3">
                            <div className="w-full h-3 rounded-full overflow-hidden mb-1" style={{ backgroundColor: c.bg }}>
                                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all" style={{ width: `${Math.min(principalRepaidPct, 100)}%` }} />
                            </div>
                            <p className="text-[9px] font-bold text-right" style={{ color: '#10B981' }}>{principalRepaidPct.toFixed(1)}% {t('myLoans.principalRepaid')}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                            <div><p className="font-bold" style={{ color: c.textSecondary }}>{t('myLoans.repaid')}</p><p className="font-black text-emerald-500">{formatINR(loan.loanAmount - status.principalOutstanding)}</p></div>
                            <div><p className="font-bold" style={{ color: c.textSecondary }}>{t('myLoans.stillOwe')}</p><p className="font-black text-red-500">{formatINR(status.principalOutstanding)}</p></div>
                            <div><p className="font-bold" style={{ color: c.textSecondary }}>{t('myLoans.original')}</p><p className="font-black" style={{ color: c.text }}>{formatINR(loan.loanAmount)}</p></div>
                        </div>
                        {/* Time progress */}
                        <div className="mt-4 pt-3 border-t" style={{ borderColor: c.border }}>
                            <div className="w-full h-2 rounded-full overflow-hidden mb-1" style={{ backgroundColor: c.bg }}>
                                <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${status.percentComplete}%` }} />
                            </div>
                            <p className="text-[9px]" style={{ color: c.textSecondary }}>
                                {status.emisPaid} {t('myLoans.monthsDone')} · {status.emisRemaining} {t('myLoans.monthsRemaining')} · {t('myLoans.closes')} {maturityDate}
                            </p>
                        </div>
                    </div>
                )}

                {/* Loan Information */}
                <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <button onClick={() => setShowLoanInfo(!showLoanInfo)} className="w-full p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-500" />
                            <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.loanInformation')}</h3>
                        </div>
                        {showLoanInfo ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                    </button>
                    <AnimatePresence>
                        {showLoanInfo && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-4 pb-4 space-y-2 border-t text-xs" style={{ borderColor: c.border }}>
                                    {[
                                        [t('myLoans.loanType'), `${meta.icon} ${t(meta.label)}`],
                                        [t('myLoans.lenderName'), loan.lenderName || '—'],
                                        ...(loan.accountNumber ? [[t('myLoans.accountNumber'), loan.accountNumber]] : []),
                                        [t('myLoans.rateType'), loan.rateType === 'floating' ? t('myLoans.floating') : t('myLoans.fixed')],
                                        [t('myLoans.interestRate'), `${loan.interestRate}% p.a.`],
                                        [t('myLoans.tenure'), `${loan.tenureMonths} ${t('myLoans.moShort')} (${Math.round(loan.tenureMonths / 12)} ${t('myLoans.yrShort')})`],
                                        [t('myLoans.emiAmount'), formatINR(loan.emiAmount)],
                                        [t('myLoans.disbursed'), fmtDate(loan.disbursementDate)],
                                        [t('myLoans.emiDueDay'), `${loan.emiDueDay}${t('myLoans.thOfMonth')}`],
                                        [t('myLoans.maturityDate'), maturityDate],
                                        [t('myLoans.originalAmount'), formatINR(loan.loanAmount)],
                                        ...(loan.notes ? [[t('myLoans.notes'), loan.notes]] : []),
                                    ].map(([label, value], i) => (
                                        <div key={i} className="flex justify-between py-1.5 border-b" style={{ borderColor: `${c.border}60` }}>
                                            <span style={{ color: c.textSecondary }}>{label}</span>
                                            <span className="font-medium text-right max-w-[55%] truncate" style={{ color: c.text }}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Payment History */}
                <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <button onClick={() => setShowPaymentHistory(!showPaymentHistory)} className="w-full p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.paymentHistory')}</h3>
                        </div>
                        {showPaymentHistory ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                    </button>
                    <AnimatePresence>
                        {showPaymentHistory && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-4 pb-4 border-t overflow-x-auto" style={{ borderColor: c.border }}>
                                    <table className="w-full text-[10px] min-w-[500px] mt-2">
                                        <thead>
                                            <tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}>
                                                <th className="py-2 text-left font-bold">#</th>
                                                <th className="py-2 text-left font-bold">{t('myLoans.thDate')}</th>
                                                <th className="py-2 text-right font-bold">EMI</th>
                                                <th className="py-2 text-right font-bold">{t('liveStatus.interestLabel')}</th>
                                                <th className="py-2 text-right font-bold">{t('liveStatus.principalLabel')}</th>
                                                <th className="py-2 text-right font-bold">{t('myLoans.thBalance')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visibleSchedule.map(row => (
                                                <tr key={row.month}
                                                    className={row.isNext ? 'bg-blue-500/10' : row.isPaid ? '' : 'opacity-40'}
                                                    style={{ borderBottom: `1px solid ${c.border}40`, color: c.text }}
                                                >
                                                    <td className="py-1.5 font-medium">
                                                        {row.isNext ? <span className="text-blue-500 font-bold">NEXT→</span> : row.month}
                                                    </td>
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
                                        <button onClick={() => setShowAllFutureEmis(true)} className="w-full mt-2 py-2 text-[10px] font-bold text-violet-500">
                                            {t('myLoans.showAllEmis', { count: fullSchedule.length - visibleSchedule.length })}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Yearly Summary */}
                <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <button onClick={() => setShowYearlySummary(!showYearlySummary)} className="w-full p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-violet-500" />
                            <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.yearlySummary')}</h3>
                        </div>
                        {showYearlySummary ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                    </button>
                    <AnimatePresence>
                        {showYearlySummary && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-4 pb-4 border-t overflow-x-auto" style={{ borderColor: c.border }}>
                                    <table className="w-full text-[10px] min-w-[400px] mt-2">
                                        <thead>
                                            <tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}>
                                                <th className="py-2 text-left font-bold">{t('liveStatus.thYear')}</th>
                                                <th className="py-2 text-right font-bold">{t('myLoans.thTotalPaid')}</th>
                                                <th className="py-2 text-right font-bold">{t('liveStatus.principalLabel')}</th>
                                                <th className="py-2 text-right font-bold">{t('liveStatus.interestLabel')}</th>
                                                <th className="py-2 text-right font-bold">{t('myLoans.thBalance')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {yearlySummary.map(row => {
                                                const isCurrent = row.year === new Date().getFullYear();
                                                return (
                                                    <tr key={row.year} className={isCurrent ? 'bg-violet-500/5' : ''} style={{ borderBottom: `1px solid ${c.border}40`, color: c.text }}>
                                                        <td className={`py-1.5 font-medium ${isCurrent ? 'text-violet-500 font-bold' : ''}`}>{row.year}</td>
                                                        <td className="py-1.5 text-right">{formatINR(row.totalPaid)}</td>
                                                        <td className="py-1.5 text-right text-blue-500">{formatINR(row.principal)}</td>
                                                        <td className="py-1.5 text-right text-amber-500">{formatINR(row.interest)}</td>
                                                        <td className="py-1.5 text-right font-medium">{formatINR(row.closingBal)}</td>
                                                    </tr>
                                                );
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
                        <div className="flex items-center gap-2 mb-3">
                            <Lightbulb className="w-4 h-4 text-emerald-500" />
                            <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.whatIfPrepay')}</h3>
                        </div>
                        <NumberInput label={t('myLoans.prepayAmount')} value={prepayAmount} onChange={setPrepayAmount} min={0} max={status.principalOutstanding} prefix="₹" />
                        {prepayResult && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#10B98115' }}>
                                    <p className="text-[8px] uppercase font-bold text-emerald-500">{t('liveStatus.interestSaved')}</p>
                                    <p className="text-[11px] font-black text-emerald-500">{formatINR(prepayResult.interestSaved)}</p>
                                </div>
                                <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#3B82F615' }}>
                                    <p className="text-[8px] uppercase font-bold text-blue-500">{t('myLoans.tenureReduced')}</p>
                                    <p className="text-[11px] font-black text-blue-500">{fmtYM(prepayResult.monthsReduced, t)}</p>
                                </div>
                                <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#8B5CF615' }}>
                                    <p className="text-[8px] uppercase font-bold text-violet-500">{t('myLoans.newClosure')}</p>
                                    <p className="text-[11px] font-black text-violet-500">{prepayResult.newClosureDate}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tax Benefits */}
                {(loan.loanType === 'home_loan') && (
                    <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-4 h-4 text-blue-500" />
                            <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.taxBenefits')} (FY {taxBenefit.fyLabel})</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl" style={{ backgroundColor: '#3B82F615' }}>
                                <p className="text-[9px] font-bold text-blue-500">Sec 80C ({t('liveStatus.principalLabel')})</p>
                                <p className="text-sm font-black text-blue-500">{formatINR(Math.min(taxBenefit.principal80C, 150000))}</p>
                                <p className="text-[8px]" style={{ color: c.textSecondary }}>{t('myLoans.maxLimit')}: ₹1,50,000</p>
                            </div>
                            <div className="p-3 rounded-xl" style={{ backgroundColor: '#F59E0B15' }}>
                                <p className="text-[9px] font-bold text-amber-500">Sec 24(b) ({t('liveStatus.interestLabel')})</p>
                                <p className="text-sm font-black text-amber-500">{formatINR(Math.min(taxBenefit.interest24b, 200000))}</p>
                                <p className="text-[8px]" style={{ color: c.textSecondary }}>{t('myLoans.maxLimit')}: ₹2,00,000</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-2">
                    <button onClick={() => setShowEditSheet(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border" style={{ borderColor: c.border, color: c.text }}>
                        <Pencil size={16} /> {t('myLoans.editLoan')}
                    </button>
                    {loan.isActive && (
                        <button onClick={handleMarkClosed} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 size={16} /> {t('myLoans.markClosed')}
                        </button>
                    )}
                    <button onClick={handleDelete} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                        <Trash2 size={16} /> {t('myLoans.deleteLoan')}
                    </button>
                </div>
            </div>

            {/* Edit Sheet */}
            <AddLoanSheet
                open={showEditSheet}
                onClose={() => setShowEditSheet(false)}
                onSaved={refreshLoan}
                editLoan={loan}
            />
        </div>
    );
}