import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Wallet, Trash2, TrendingUp, Banknote, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import { formatINR } from '../utils/calculations';
import { useLiveStatusStore, type SavedLiveProfile } from '../store/useLiveStatusStore';
import { getAllLoans } from '../utils/loanStorage';
import { calculateLiveLoanStatus, type LoanProfile } from '../utils/loanStatusEngine';
import {
    calculateSipStatus, calculateFdStatus, calculateRdStatus,
    calculatePpfStatus, calculateSsyStatus, calculateNscStatus,
    calculateKvpStatus, calculatePomisStatus, calculateScssStatus,
} from '../utils/investmentStatusEngine';
import AddLoanSheet from '../components/AddLoanSheet';
import { AnalyticsService } from '../lib/analytics';
import { useEffect } from 'react';

const TYPE_META: Record<string, { icon: string; color: string }> = {
    'Loan EMI': { icon: '🏠', color: '#8B5CF6' },
    'Mortgage': { icon: '🏗️', color: '#8B5CF6' },
    'SIP Calculator': { icon: '📈', color: '#3B82F6' },
    'FD Calculator': { icon: '🏦', color: '#F59E0B' },
    'RD': { icon: '💰', color: '#F59E0B' },
    'PPF Calculator': { icon: '🏛️', color: '#06B6D4' },
    'SSY Calculator': { icon: '👧', color: '#EC4899' },
    'NSC Calculator': { icon: '📜', color: '#14B8A6' },
    'KVP Calculator': { icon: '📋', color: '#22C55E' },
    'Post Office MIS': { icon: '📬', color: '#8B5CF6' },
    'SCSS Calculator': { icon: '👴', color: '#EC4899' },
    'Post Office TD': { icon: '📮', color: '#F97316' },
    'Goal Planner': { icon: '🎯', color: '#3B82F6' },
};

function fmtDate(ts: number | string): string {
    const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface LiveMetrics {
    label1: string; value1: string;
    label2: string; value2: string;
    label3: string; value3: string;
    progress: number;
    statusText: string;
}

function computeMetrics(p: SavedLiveProfile): LiveMetrics | null {
    const d = p.profileData;
    if (!d) return null;
    try {
        const type = p.calculatorType;
        if (type === 'Loan EMI' || type === 'Mortgage') {
            const lp: LoanProfile = { loanAmount: d.loanAmount, annualRate: d.annualRate, tenureMonths: d.tenureMonths, emiAmount: d.emiAmount, disbursementDate: d.disbursementDate, emiDueDay: d.emiDueDay || 5, loanType: d.loanType || 'floating' };
            const s = calculateLiveLoanStatus(lp);
            if (s.loanFullyPaid) return { label1: 'Total Paid', value1: formatINR(s.totalPaidSoFar), label2: 'Interest', value2: formatINR(s.interestPaidSoFar), label3: 'Status', value3: 'Paid Off', progress: 100, statusText: 'Complete' };
            if (s.loanNotStarted) return { label1: 'Amount', value1: formatINR(d.loanAmount), label2: 'EMI', value2: formatINR(d.emiAmount), label3: 'Starts', value3: fmtDate(d.disbursementDate), progress: 0, statusText: 'Not Started' };
            return { label1: 'Outstanding', value1: formatINR(s.principalOutstanding), label2: 'EMIs Paid', value2: `${s.emisPaid}/${lp.tenureMonths}`, label3: 'Next EMI', value3: fmtDate(s.nextEmiDate), progress: s.percentComplete, statusText: `${s.percentComplete.toFixed(1)}%` };
        }
        if (type === 'SIP Calculator') {
            const s = calculateSipStatus({ monthlySip: d.monthlyAmount || d.monthlySip || 0, annualReturn: d.annualReturn || 12, startDate: d.startDate });
            return { label1: 'Invested', value1: formatINR(s.totalInvested), label2: 'Value', value2: formatINR(s.currentValue), label3: 'Gain', value3: formatINR(s.wealthGained), progress: Math.min(100, s.monthsInvested), statusText: `${s.sipRunningYears}Y ${s.sipRunningMonths}M` };
        }
        if (type === 'FD Calculator' || type === 'Post Office TD') {
            const s = calculateFdStatus({ principal: d.principal, annualRate: d.annualRate, tenureMonths: d.tenureMonths, startDate: d.startDate, compoundingFreq: d.compoundingFreq || 4 });
            return { label1: 'Deposited', value1: formatINR(d.principal), label2: 'Value', value2: formatINR(s.valueToday), label3: 'Interest', value3: formatINR(s.interestEarnedToday), progress: s.percentComplete, statusText: `${s.percentComplete.toFixed(1)}%` };
        }
        if (type === 'RD') {
            const s = calculateRdStatus({ monthlyDeposit: d.monthlyDeposit || 0, annualRate: d.annualRate || 5.8, tenureMonths: d.tenureMonths || 60, startDate: d.startDate });
            return { label1: 'Deposited', value1: formatINR(s.totalDeposited), label2: 'Value', value2: formatINR(s.currentValue), label3: 'Interest', value3: formatINR(s.interestEarned), progress: s.percentComplete, statusText: `${s.percentComplete.toFixed(1)}%` };
        }
        if (type === 'PPF Calculator') {
            const s = calculatePpfStatus({ yearlyDeposit: d.yearlyDeposit || 0, rate: d.annualRate || 7.1, openingDate: d.startDate });
            return { label1: 'Deposited', value1: formatINR(s.totalDeposited), label2: 'Balance', value2: formatINR(s.balanceToday), label3: 'Interest', value3: formatINR(s.interestEarned), progress: Math.min(100, (s.yearsCompleted / 15) * 100), statusText: `Year ${s.currentYear}/15` };
        }
        if (type === 'SSY Calculator') {
            const s = calculateSsyStatus({ yearlyDeposit: d.yearlyDeposit || 0, rate: d.annualRate || 8.2, openingDate: d.startDate, girlDob: d.girlDob || d.startDate });
            return { label1: 'Deposited', value1: formatINR(s.totalDeposited), label2: 'Balance', value2: formatINR(s.balanceToday), label3: 'Interest', value3: formatINR(s.interestEarned), progress: Math.min(100, (s.accountAge / 21) * 100), statusText: `Year ${s.accountAge}/21` };
        }
        if (type === 'NSC Calculator') {
            const s = calculateNscStatus({ principal: d.principal || 0, rate: d.annualRate || 7.7, purchaseDate: d.startDate });
            return { label1: 'Invested', value1: formatINR(d.principal), label2: 'Value', value2: formatINR(s.valueToday), label3: 'Interest', value3: formatINR(s.interestEarned), progress: Math.min(100, (s.yearsCompleted / 5) * 100), statusText: `${(Math.min(1, s.yearsCompleted / 5) * 100).toFixed(0)}% of 5yr` };
        }
        if (type === 'KVP Calculator') {
            const s = calculateKvpStatus({ principal: d.principal || 0, rate: d.annualRate || 7.5, purchaseDate: d.startDate });
            return { label1: 'Invested', value1: formatINR(d.principal), label2: 'Value', value2: formatINR(s.valueToday), label3: 'Gain', value3: formatINR(s.gainSoFar), progress: s.progressToDoubling, statusText: `${s.progressToDoubling.toFixed(0)}% to 2x` };
        }
        if (type === 'Post Office MIS') {
            const s = calculatePomisStatus({ principal: d.principal || 0, rate: d.annualRate || 7.4, startDate: d.startDate });
            return { label1: 'Invested', value1: formatINR(d.principal), label2: 'Monthly', value2: formatINR(s.monthlyIncome), label3: 'Earned', value3: formatINR(s.totalIncomeReceived), progress: Math.min(100, (s.monthsCompleted / 60) * 100), statusText: `${s.monthsCompleted}/60` };
        }
        if (type === 'SCSS Calculator') {
            const s = calculateScssStatus({ principal: d.principal || 0, rate: d.annualRate || 8.2, startDate: d.startDate, tenure: 5 });
            return { label1: 'Invested', value1: formatINR(d.principal), label2: 'Quarterly', value2: formatINR(s.quarterlyIncome), label3: 'Earned', value3: formatINR(s.totalIncomeReceived), progress: Math.min(100, (s.quartersCompleted / 20) * 100), statusText: `${s.quartersCompleted}/20 qtrs` };
        }
        if (type === 'Goal Planner') {
            const s = calculateSipStatus({ monthlySip: d.monthlyAmount || 0, annualReturn: d.annualReturn || 12, startDate: d.startDate, targetAmount: d.targetAmount });
            return { label1: 'Invested', value1: formatINR(s.totalInvested), label2: 'Value', value2: formatINR(s.currentValue), label3: 'Goal', value3: `${s.progressToGoal.toFixed(0)}%`, progress: s.progressToGoal, statusText: `${s.progressToGoal.toFixed(0)}% to goal` };
        }
    } catch { return null; }
    return null;
}

function isLoanType(type: string): boolean {
    return type === 'Loan EMI' || type === 'Mortgage';
}

export default function MyLoans() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const c = useAppColors();
    const { savedProfiles, removeProfile } = useLiveStatusStore();
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [menuProfile, setMenuProfile] = useState<SavedLiveProfile | null>(null);

    useEffect(() => { AnalyticsService.trackScreen('My_Loans'); }, []);

    // Also merge any loans from loanStorage that aren't in useLiveStatusStore
    const allProfiles = useMemo(() => {
        const liveIds = new Set(savedProfiles.map(p => p.id));
        const storedLoans = getAllLoans();
        const extraFromStorage: SavedLiveProfile[] = storedLoans
            .filter(l => !liveIds.has(l.id))
            .map(l => ({
                id: l.id,
                name: l.nickName,
                calculatorType: 'Loan EMI',
                profileData: {
                    loanAmount: l.loanAmount,
                    annualRate: l.interestRate,
                    tenureMonths: l.tenureMonths,
                    emiAmount: l.emiAmount,
                    disbursementDate: l.disbursementDate,
                    emiDueDay: l.emiDueDay,
                    loanType: l.rateType,
                },
                createdAt: new Date(l.createdAt).getTime(),
                updatedAt: new Date(l.updatedAt).getTime(),
            }));
        return [...savedProfiles, ...extraFromStorage];
    }, [savedProfiles]);

    const loanProfiles = useMemo(() => allProfiles.filter(p => isLoanType(p.calculatorType)), [allProfiles]);
    const investmentProfiles = useMemo(() => allProfiles.filter(p => !isLoanType(p.calculatorType)), [allProfiles]);

    // Loan portfolio summary
    const loanSummary = useMemo(() => {
        let totalOutstanding = 0, totalEmi = 0, count = 0;
        loanProfiles.forEach(p => {
            const d = p.profileData;
            if (!d?.loanAmount) return;
            try {
                const s = calculateLiveLoanStatus({ loanAmount: d.loanAmount, annualRate: d.annualRate, tenureMonths: d.tenureMonths, emiAmount: d.emiAmount, disbursementDate: d.disbursementDate, emiDueDay: d.emiDueDay || 5, loanType: d.loanType || 'floating' });
                if (!s.loanNotStarted && !s.loanFullyPaid) {
                    totalOutstanding += s.principalOutstanding;
                    totalEmi += d.emiAmount;
                    count++;
                }
            } catch { /* skip */ }
        });
        return { totalOutstanding, totalEmi, count };
    }, [loanProfiles]);

    const handleDelete = (p: SavedLiveProfile) => {
        removeProfile(p.id);
        // Also remove from loanStorage if it exists there
        try {
            const { deleteLoan } = require('../utils/loanStorage');
            deleteLoan(p.id);
        } catch { /* ignore */ }
        setMenuProfile(null);
    };

    const renderCard = (p: SavedLiveProfile, i: number) => {
        const meta = TYPE_META[p.calculatorType] || { icon: '📊', color: '#64748B' };
        const metrics = computeMetrics(p);

        return (
            <motion.div key={p.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-2xl border shadow-sm"
                style={{ backgroundColor: c.card, borderColor: c.border }}
            >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ backgroundColor: `${meta.color}15` }}>
                        {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate" style={{ color: c.text }}>{p.name}</h3>
                        <p className="text-[10px]" style={{ color: c.textSecondary }}>{p.calculatorType}</p>
                    </div>
                    {metrics && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                            {metrics.statusText}
                        </span>
                    )}
                </div>

                {/* Metrics */}
                {metrics && (
                    <>
                        <div className="w-full h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: c.bg }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(metrics.progress, 100)}%`, backgroundColor: meta.color }} />
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {[
                                { label: metrics.label1, value: metrics.value1 },
                                { label: metrics.label2, value: metrics.value2 },
                                { label: metrics.label3, value: metrics.value3 },
                            ].map((m, j) => (
                                <div key={j} className="p-2 rounded-lg text-center" style={{ backgroundColor: c.bg }}>
                                    <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>{m.label}</p>
                                    <p className="text-[11px] font-black" style={{ color: j === 0 ? c.text : meta.color }}>{m.value}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between">
                    <p className="text-[9px]" style={{ color: c.textSecondary }}>{t('liveStatus.savedOn', { date: fmtDate(p.createdAt) })}</p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/my-loans/${p.id}`)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white"
                            style={{ backgroundColor: meta.color }}
                        >
                            {t('myLoans.viewDetails')} <ChevronRight size={12} />
                        </button>
                        <button onClick={() => setMenuProfile(p)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    const totalTrackers = allProfiles.length;

    return (
        <div className="min-h-dvh" style={{ backgroundColor: c.bg }}>
            {/* Header */}
            <div className="sticky top-0 z-10 px-4 pt-14 pb-3 border-b" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <ArrowLeft size={18} style={{ color: c.textSecondary }} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold" style={{ color: c.text }}>{t('myLoans.title')}</h1>
                            <p className="text-[10px]" style={{ color: c.textSecondary }}>{totalTrackers} {t('myLoans.trackersActive')}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddSheet(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500 shadow-lg shadow-emerald-500/20"
                    >
                        <Plus size={16} /> {t('myLoans.addLoan')}
                    </button>
                </div>
            </div>

            <div className="px-4 pb-28 pt-4 space-y-4">
                {/* Loan Portfolio Summary */}
                {loanSummary.count > 0 && (
                    <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <div className="flex items-center gap-2 mb-3">
                            <Wallet className="w-5 h-5 text-violet-500" />
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>{t('myLoans.portfolioSummary')}</span>
                        </div>
                        <p className="text-2xl font-black mb-1" style={{ color: c.text }}>{formatINR(loanSummary.totalOutstanding)}</p>
                        <p className="text-[10px] mb-3" style={{ color: c.textSecondary }}>{t('myLoans.acrossLoans', { count: loanSummary.count })}</p>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: c.bg }}>
                            <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('myLoans.monthlyEmiBurden')}</p>
                            <p className="text-sm font-black text-violet-500">{formatINR(loanSummary.totalEmi)}<span className="text-[9px] font-normal" style={{ color: c.textSecondary }}> /{t('myLoans.perMonth')}</span></p>
                        </div>
                    </div>
                )}

                {/* Loan Trackers */}
                {loanProfiles.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Banknote size={16} className="text-violet-500" />
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>
                                {t('liveStatus.myLoanTrackers')} ({loanProfiles.length})
                            </p>
                        </div>
                        <div className="space-y-3">
                            {loanProfiles.map((p, i) => renderCard(p, i))}
                        </div>
                    </div>
                )}

                {/* Investment Trackers */}
                {investmentProfiles.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <TrendingUp size={16} className="text-emerald-500" />
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>
                                {t('liveStatus.myInvestmentTrackers')} ({investmentProfiles.length})
                            </p>
                        </div>
                        <div className="space-y-3">
                            {investmentProfiles.map((p, i) => renderCard(p, i))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {totalTrackers === 0 && (
                    <div className="text-center py-16">
                        <p className="text-5xl mb-4">💳</p>
                        <h3 className="text-base font-bold mb-2" style={{ color: c.text }}>{t('myLoans.emptyTitle')}</h3>
                        <p className="text-xs max-w-[260px] mx-auto mb-6" style={{ color: c.textSecondary }}>{t('myLoans.emptyDesc')}</p>
                        <button onClick={() => navigate('/calculators')}
                            className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-emerald-500 shadow-lg shadow-emerald-500/20"
                        >
                            {t('myLoans.goToCalc')}
                        </button>
                    </div>
                )}
            </div>

            {/* Add Loan Sheet */}
            <AddLoanSheet
                open={showAddSheet}
                onClose={() => setShowAddSheet(false)}
                onSaved={() => {/* loanStorage saved via sheet, will appear via allProfiles merge */}}
            />

            {/* Delete Confirm */}
            <AnimatePresence>
                {menuProfile && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 z-50" onClick={() => setMenuProfile(null)} />
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl p-5 space-y-2"
                            style={{ backgroundColor: c.card }}
                        >
                            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto mb-3" />
                            <p className="text-sm font-bold mb-3" style={{ color: c.text }}>{menuProfile.name}</p>
                            <button onClick={() => handleDelete(menuProfile)}
                                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-red-500/20 text-sm font-medium text-red-500"
                            >
                                <Trash2 size={16} /> {t('myLoans.deleteTracker')}
                            </button>
                            <button onClick={() => setMenuProfile(null)}
                                className="w-full py-3 rounded-xl text-sm font-bold border mt-2"
                                style={{ borderColor: c.border, color: c.textSecondary }}
                            >
                                {t('myLoans.cancel')}
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}