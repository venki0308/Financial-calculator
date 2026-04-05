import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Pencil, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import { formatINR } from '../utils/calculations';
import { type SavedLoan, LOAN_TYPE_META } from '../utils/loanStorage';
import { calculateLiveLoanStatus, type LoanProfile } from '../utils/loanStatusEngine';

interface Props {
    loan: SavedLoan;
    onEdit: (loan: SavedLoan) => void;
    onMenu: (loan: SavedLoan) => void;
    index: number;
}

function fmtDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function LoanCard({ loan, onEdit, onMenu, index }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const c = useAppColors();
    const meta = LOAN_TYPE_META[loan.loanType];

    const status = useMemo(() => {
        if (!loan.isActive) return null;
        const profile: LoanProfile = {
            loanAmount: loan.loanAmount,
            annualRate: loan.interestRate,
            tenureMonths: loan.tenureMonths,
            emiAmount: loan.emiAmount,
            disbursementDate: loan.disbursementDate,
            emiDueDay: loan.emiDueDay,
            loanType: loan.rateType,
        };
        return calculateLiveLoanStatus(profile);
    }, [loan]);

    const principalRepaidPct = status ? ((loan.loanAmount - status.principalOutstanding) / loan.loanAmount) * 100 : 0;
    const progressColor = principalRepaidPct > 50 ? '#10B981' : principalRepaidPct > 20 ? '#F59E0B' : '#EF4444';

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="p-4 rounded-2xl border shadow-sm"
            style={{ backgroundColor: c.card, borderColor: c.border }}
        >
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ backgroundColor: `${meta.color}15` }}>
                    {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate" style={{ color: c.text }}>{loan.nickName}</h3>
                    <p className="text-[10px] truncate" style={{ color: c.textSecondary }}>{loan.lenderName || t(meta.label)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${loan.isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                    {loan.isActive ? t('myLoans.active') : t('myLoans.closed')}
                </span>
            </div>

            {/* Metrics */}
            {status && !status.loanNotStarted && !status.loanFullyPaid && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: c.bg }}>
                        <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('myLoans.outstanding')}</p>
                        <p className="text-[11px] font-black" style={{ color: c.text }}>{formatINR(status.principalOutstanding)}</p>
                    </div>
                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: c.bg }}>
                        <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('myLoans.emi')}</p>
                        <p className="text-[11px] font-black" style={{ color: meta.color }}>{formatINR(loan.emiAmount)}</p>
                    </div>
                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: c.bg }}>
                        <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('myLoans.nextDue')}</p>
                        <p className="text-[11px] font-black" style={{ color: c.text }}>{fmtDate(status.nextEmiDate)}</p>
                    </div>
                </div>
            )}

            {status && status.loanFullyPaid && (
                <div className="p-2 rounded-lg text-center mb-3 bg-emerald-500/10">
                    <p className="text-xs font-bold text-emerald-500">{t('myLoans.fullyPaidOff')}</p>
                </div>
            )}

            {/* Progress */}
            {status && !status.loanNotStarted && (
                <div className="mb-3">
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: c.bg }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(principalRepaidPct, 100)}%`, backgroundColor: progressColor }} />
                    </div>
                    <p className="text-[9px] font-bold text-right mt-0.5" style={{ color: progressColor }}>
                        {principalRepaidPct.toFixed(1)}% {t('myLoans.principalRepaid')}
                    </p>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => navigate(`/my-loans/${loan.id}`)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                    style={{ backgroundColor: meta.color }}
                >
                    {t('myLoans.viewDetails')}
                </button>
                <button onClick={() => onEdit(loan)} className="p-2 rounded-xl border" style={{ borderColor: c.border }}>
                    <Pencil size={14} style={{ color: c.textSecondary }} />
                </button>
                <button onClick={() => onMenu(loan)} className="p-2 rounded-xl border" style={{ borderColor: c.border }}>
                    <MoreVertical size={14} style={{ color: c.textSecondary }} />
                </button>
            </div>
        </motion.div>
    );
}