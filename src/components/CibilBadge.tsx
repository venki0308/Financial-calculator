import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppColors } from '../theme/useAppColors';
import { useCibil } from '../context/CibilContext';
import { LOAN_CIBIL_RATES } from '../data/cibilData';
import { getCibilTier } from '../data/cibilData';

interface Props { loanType: string }

export default function CibilBadge({ loanType }: Props) {
    const { t } = useTranslation();
    const c = useAppColors();
    const navigate = useNavigate();
    const { profile, hasProfile, tier, color, rateFor } = useCibil();

    const config = LOAN_CIBIL_RATES[loanType];
    if (!config) return null;

    const score = profile?.score ?? null;
    const isNTC = profile?.isNTC ?? false;
    const rates = hasProfile ? rateFor(loanType) : null;
    const tierData = getCibilTier(score || 0);

    // Approval status
    let statusIcon = '🟢', statusText = t('cibil.approvalGreen');
    if (!hasProfile) { statusIcon = '📊'; statusText = t('cibil.addScorePrompt'); }
    else if (isNTC) { statusIcon = '🔵'; statusText = t('cibil.approvalNH'); }
    else if (score && score < config.minNBFC) { statusIcon = '🔴'; statusText = t('cibil.approvalRed'); }
    else if (score && score < config.minBank) { statusIcon = '🟡'; statusText = t('cibil.approvalYellow'); }

    if (!hasProfile) {
        return (
            <button onClick={() => navigate('/cibil-profile')}
                className="w-full p-3 rounded-2xl border flex items-center gap-3 mb-3"
                style={{ backgroundColor: `${c.card}`, borderColor: c.border }}
            >
                <span className="text-xl">📊</span>
                <div className="flex-1 text-left">
                    <p className="text-xs font-bold" style={{ color: c.text }}>{t('cibil.addScoreTitle')}</p>
                    <p className="text-[9px]" style={{ color: c.textSecondary }}>{t('cibil.addScoreDesc')}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-violet-600 text-white">{t('cibil.add')}</span>
            </button>
        );
    }

    return (
        <button onClick={() => navigate('/cibil-profile')}
            className="w-full p-3 rounded-2xl border flex items-center gap-3 mb-3"
            style={{ backgroundColor: `${color}08`, borderColor: `${color}30` }}
        >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white" style={{ backgroundColor: color }}>
                {isNTC ? 'NH' : score}
            </div>
            <div className="flex-1 text-left">
                <p className="text-xs font-bold" style={{ color }}>{tierData.emoji} {tierData.label}</p>
                <p className="text-[9px]" style={{ color: c.textSecondary }}>
                    {statusIcon} {statusText}
                    {rates && ` · ${rates.min.toFixed(1)}%–${rates.max.toFixed(1)}%`}
                </p>
            </div>
            <span className="text-[9px] font-medium" style={{ color: c.textSecondary }}>{t('cibil.update')}</span>
        </button>
    );
}