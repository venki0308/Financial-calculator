import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Wallet, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import { formatINR } from '../utils/calculations';
import { getAllLoans, deleteLoan, saveLoan, type SavedLoan, generateLoanId } from '../utils/loanStorage';
import { calculateLiveLoanStatus, type LoanProfile } from '../utils/loanStatusEngine';
import { useLiveStatusStore } from '../store/useLiveStatusStore';
import LoanCard from '../components/LoanCard';
import AddLoanSheet from '../components/AddLoanSheet';
import { AnalyticsService } from '../lib/analytics';

export default function MyLoans() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const c = useAppColors();
    const [loans, setLoans] = useState<SavedLoan[]>([]);
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [editLoan, setEditLoan] = useState<SavedLoan | null>(null);
    const [showClosed, setShowClosed] = useState(false);
    const [menuLoan, setMenuLoan] = useState<SavedLoan | null>(null);

    const { savedProfiles } = useLiveStatusStore();

    useEffect(() => { AnalyticsService.trackScreen('My_Loans'); }, []);

    // Migrate any old useLiveStatusStore loan profiles that aren't yet in loanStorage
    useEffect(() => {
        const existing = getAllLoans();
        const existingIds = new Set(existing.map(l => l.id));
        let migrated = false;
        savedProfiles.forEach(p => {
            if ((p.calculatorType === 'Loan EMI' || p.calculatorType === 'Mortgage') && !existingIds.has(p.id)) {
                const d = p.profileData;
                if (d?.loanAmount && d?.disbursementDate) {
                    // Check if already exists by matching data
                    const alreadyExists = existing.some(l => l.disbursementDate === d.disbursementDate && l.loanAmount === d.loanAmount);
                    if (!alreadyExists) {
                        saveLoan({
                            id: p.id || generateLoanId(),
                            nickName: p.name || 'My Loan',
                            loanType: 'home_loan',
                            lenderName: '',
                            loanAmount: d.loanAmount,
                            interestRate: d.annualRate || 8.5,
                            tenureMonths: d.tenureMonths || 240,
                            emiAmount: d.emiAmount || 0,
                            rateType: d.loanType === 'fixed' ? 'fixed' : 'floating',
                            disbursementDate: d.disbursementDate,
                            emiDueDay: d.emiDueDay || 5,
                            createdAt: new Date(p.createdAt).toISOString(),
                            updatedAt: new Date().toISOString(),
                            isActive: true,
                        });
                        migrated = true;
                    }
                }
            }
        });
        if (migrated) refreshLoans();
    }, [savedProfiles]);

    const refreshLoans = useCallback(() => {
        setLoans(getAllLoans());
    }, []);

    useEffect(() => { refreshLoans(); }, [refreshLoans]);

    const activeLoans = useMemo(() => loans.filter(l => l.isActive), [loans]);
    const closedLoans = useMemo(() => loans.filter(l => !l.isActive), [loans]);

    // Portfolio summary
    const summary = useMemo(() => {
        let totalOutstanding = 0;
        let totalMonthlyEmi = 0;
        let totalInterestRemaining = 0;

        activeLoans.forEach(loan => {
            const profile: LoanProfile = {
                loanAmount: loan.loanAmount,
                annualRate: loan.interestRate,
                tenureMonths: loan.tenureMonths,
                emiAmount: loan.emiAmount,
                disbursementDate: loan.disbursementDate,
                emiDueDay: loan.emiDueDay,
                loanType: loan.rateType,
            };
            const s = calculateLiveLoanStatus(profile);
            if (!s.loanNotStarted && !s.loanFullyPaid) {
                totalOutstanding += s.principalOutstanding;
                totalMonthlyEmi += loan.emiAmount;
                totalInterestRemaining += (s.emisRemaining * loan.emiAmount) - s.principalOutstanding;
            }
        });

        return { totalOutstanding, totalMonthlyEmi, totalInterestRemaining, count: activeLoans.length };
    }, [activeLoans]);

    const handleDelete = (loan: SavedLoan) => {
        deleteLoan(loan.id);
        setMenuLoan(null);
        refreshLoans();
    };

    const handleMarkClosed = (loan: SavedLoan) => {
        saveLoan({ ...loan, isActive: false });
        setMenuLoan(null);
        refreshLoans();
    };

    const handleEdit = (loan: SavedLoan) => {
        setEditLoan(loan);
        setShowAddSheet(true);
    };

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
                            <p className="text-[10px]" style={{ color: c.textSecondary }}>{t('myLoans.subtitle')}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setEditLoan(null); setShowAddSheet(true); }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500 shadow-lg shadow-emerald-500/20"
                    >
                        <Plus size={16} /> {t('myLoans.addLoan')}
                    </button>
                </div>
            </div>

            <div className="px-4 pb-28 pt-4 space-y-4">
                {/* Portfolio Summary */}
                {activeLoans.length > 0 && (
                    <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <div className="flex items-center gap-2 mb-3">
                            <Wallet className="w-5 h-5 text-violet-500" />
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>{t('myLoans.portfolioSummary')}</span>
                        </div>
                        <p className="text-2xl font-black mb-1" style={{ color: c.text }}>{formatINR(summary.totalOutstanding)}</p>
                        <p className="text-[10px] mb-4" style={{ color: c.textSecondary }}>
                            {t('myLoans.acrossLoans', { count: summary.count })}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl" style={{ backgroundColor: c.bg }}>
                                <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('myLoans.monthlyEmiBurden')}</p>
                                <p className="text-sm font-black text-violet-500">{formatINR(summary.totalMonthlyEmi)}</p>
                                <p className="text-[9px]" style={{ color: c.textSecondary }}>{t('myLoans.perMonth')}</p>
                            </div>
                            <div className="p-3 rounded-xl" style={{ backgroundColor: c.bg }}>
                                <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('myLoans.totalInterestLeft')}</p>
                                <p className="text-sm font-black text-amber-500">{formatINR(Math.max(0, summary.totalInterestRemaining))}</p>
                                <p className="text-[9px]" style={{ color: c.textSecondary }}>{t('myLoans.remaining')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Active Loans */}
                {activeLoans.length > 0 && (
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-3 px-1" style={{ color: c.textSecondary }}>
                            {t('myLoans.activeLoans')} ({activeLoans.length})
                        </p>
                        <div className="space-y-3">
                            {activeLoans.map((loan, i) => (
                                <LoanCard key={loan.id} loan={loan} onEdit={handleEdit} onMenu={setMenuLoan} index={i} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Closed Loans */}
                {closedLoans.length > 0 && (
                    <div>
                        <button onClick={() => setShowClosed(!showClosed)}
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-1 mb-2"
                            style={{ color: c.textSecondary }}
                        >
                            {t('myLoans.closedLoans')} ({closedLoans.length})
                            {showClosed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <AnimatePresence>
                            {showClosed && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="space-y-3 opacity-60">
                                        {closedLoans.map((loan, i) => (
                                            <LoanCard key={loan.id} loan={loan} onEdit={handleEdit} onMenu={setMenuLoan} index={i} />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Empty State */}
                {loans.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-5xl mb-4">🏦</p>
                        <h3 className="text-base font-bold mb-2" style={{ color: c.text }}>{t('myLoans.emptyTitle')}</h3>
                        <p className="text-xs max-w-[260px] mx-auto mb-6" style={{ color: c.textSecondary }}>{t('myLoans.emptyDesc')}</p>
                        <button
                            onClick={() => { setEditLoan(null); setShowAddSheet(true); }}
                            className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-emerald-500 shadow-lg shadow-emerald-500/20"
                        >
                            {t('myLoans.addFirstLoan')}
                        </button>
                    </div>
                )}
            </div>

            {/* Add/Edit Sheet */}
            <AddLoanSheet
                open={showAddSheet}
                onClose={() => { setShowAddSheet(false); setEditLoan(null); }}
                onSaved={refreshLoans}
                editLoan={editLoan}
            />

            {/* Context Menu Overlay */}
            <AnimatePresence>
                {menuLoan && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 z-50" onClick={() => setMenuLoan(null)} />
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl p-5 space-y-2"
                            style={{ backgroundColor: c.card }}
                        >
                            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto mb-3" />
                            <p className="text-sm font-bold mb-3" style={{ color: c.text }}>{menuLoan.nickName}</p>

                            {menuLoan.isActive && (
                                <button onClick={() => handleMarkClosed(menuLoan)}
                                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium"
                                    style={{ borderColor: c.border, color: c.text }}
                                >
                                    ✅ {t('myLoans.markClosed')}
                                </button>
                            )}
                            <button onClick={() => handleDelete(menuLoan)}
                                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-red-500/20 text-sm font-medium text-red-500"
                            >
                                <Trash2 size={16} /> {t('myLoans.deleteLoan')}
                            </button>
                            <button onClick={() => setMenuLoan(null)}
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