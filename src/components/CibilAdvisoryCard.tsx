import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Shield, TrendingUp, Lightbulb, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import { formatINR, calculateReducingEMI } from '../utils/calculations';
import { getCibilTier, getTierId, LOAN_CIBIL_RATES, CIBIL_TIPS, RBI_NOTES, type LoanCibilConfig } from '../data/cibilData';

interface Props {
    score: number;
    loanType: string; // key into LOAN_CIBIL_RATES
    loanAmount: number;
    tenureMonths: number;
}

export default function CibilAdvisoryCard({ score, loanType, loanAmount, tenureMonths }: Props) {
    const { t } = useTranslation();
    const c = useAppColors();
    const [showTips, setShowTips] = useState(false);
    const [showRbi, setShowRbi] = useState(false);

    const tier = getCibilTier(score);
    const tierId = getTierId(score);
    const config: LoanCibilConfig | undefined = LOAN_CIBIL_RATES[loanType];
    if (!config) return null;

    const currentRates = config.rates[tierId] || config.rates['good'];
    const bestRates = config.rates['excellent'];
    const currentLtv = config.ltv[tierId] || 75;

    // Approval status
    let approvalStatus: 'green' | 'yellow' | 'red' | 'blue' = 'green';
    let approvalMsg = 'cibil.approvalGreen';
    if (score <= 0) { approvalStatus = 'blue'; approvalMsg = 'cibil.approvalNH'; }
    else if (score < config.minNBFC) { approvalStatus = 'red'; approvalMsg = 'cibil.approvalRed'; }
    else if (score < config.minBank) { approvalStatus = 'yellow'; approvalMsg = 'cibil.approvalYellow'; }

    // Cost comparison
    const comparison = useMemo(() => {
        if (loanAmount <= 0 || tenureMonths <= 0) return [];
        const tiers = [
            { label: '650-699', rate: config.rates['average'] },
            { label: '700-749', rate: config.rates['good'] },
            { label: '750-779', rate: config.rates['very_good'] },
            { label: '780+', rate: config.rates['excellent'] },
        ];
        return tiers.map(t => {
            const midRate = (t.rate.min + t.rate.max) / 2;
            const calc = calculateReducingEMI(loanAmount, midRate, tenureMonths);
            return { label: t.label, rate: midRate, emi: calc.emi, totalInterest: calc.totalInterest, isCurrent: score >= parseInt(t.label) && score <= (parseInt(t.label.replace('+', '')) + 49 || 900) };
        });
    }, [loanAmount, tenureMonths, score, config]);

    const currentMidRate = (currentRates.min + currentRates.max) / 2;
    const bestMidRate = (bestRates.min + bestRates.max) / 2;
    const currentCalc = loanAmount > 0 && tenureMonths > 0 ? calculateReducingEMI(loanAmount, currentMidRate, tenureMonths) : null;
    const bestCalc = loanAmount > 0 && tenureMonths > 0 ? calculateReducingEMI(loanAmount, bestMidRate, tenureMonths) : null;
    const potentialSaving = currentCalc && bestCalc ? currentCalc.totalInterest - bestCalc.totalInterest : 0;

    // Tips selection based on tier
    const tipsToShow = useMemo(() => {
        if (tierId === 'nh') return CIBIL_TIPS.filter(t => ['secured_card', 'payment', 'credit_mix'].includes(t.id));
        if (tierId === 'very_poor' || tierId === 'poor' || tierId === 'average') return CIBIL_TIPS.filter(t => ['payment', 'utilisation', 'errors'].includes(t.id));
        return CIBIL_TIPS.filter(t => ['utilisation', 'applications', 'credit_mix'].includes(t.id));
    }, [tierId]);

    const statusColors: Record<string, { bg: string; text: string; border: string }> = {
        green: { bg: '#10B98115', text: '#10B981', border: '#10B98130' },
        yellow: { bg: '#F59E0B15', text: '#F59E0B', border: '#F59E0B30' },
        red: { bg: '#EF444415', text: '#EF4444', border: '#EF444430' },
        blue: { bg: '#3B82F615', text: '#3B82F6', border: '#3B82F630' },
    };
    const sc = statusColors[approvalStatus];

    return (
        <div className="space-y-3">
            {/* Score Badge */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4" style={{ color: tier.color }} />
                    <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('cibil.scoreAnalysis')}</h3>
                </div>

                {/* Score Display */}
                <div className="flex items-center gap-4 mb-3">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white" style={{ backgroundColor: tier.color }}>
                        {score > 0 ? score : 'NH'}
                    </div>
                    <div>
                        <p className="text-sm font-bold" style={{ color: tier.color }}>{tier.emoji} {tier.label} ({tier.range})</p>
                        <p className="text-[10px]" style={{ color: c.textSecondary }}>{t(tier.description)}</p>
                    </div>
                </div>

                {/* Approval Status */}
                <div className="p-3 rounded-xl" style={{ backgroundColor: sc.bg, border: `1px solid ${sc.border}` }}>
                    <p className="text-xs font-bold" style={{ color: sc.text }}>{t(approvalMsg)}</p>
                </div>
            </div>

            {/* Rate & LTV for this loan */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <h4 className="text-xs font-bold mb-3" style={{ color: c.textSecondary }}>{t('cibil.forYourLoan', { type: config.loanType })}</h4>
                <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: `${tier.color}15` }}>
                        <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('cibil.expectedRate')}</p>
                        <p className="text-[11px] font-black" style={{ color: tier.color }}>{currentRates.min}%-{currentRates.max}%</p>
                    </div>
                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: `${tier.color}15` }}>
                        <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>LTV</p>
                        <p className="text-[11px] font-black" style={{ color: tier.color }}>{t('cibil.upTo')} {currentLtv}%</p>
                    </div>
                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: `${tier.color}15` }}>
                        <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('cibil.approval')}</p>
                        <p className="text-[11px] font-black" style={{ color: tier.color }}>{t(tier.approvalChance)}</p>
                    </div>
                </div>

                {/* Savings potential */}
                {potentialSaving > 10000 && score < 780 && (
                    <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: '#10B98110', border: '1px solid #10B98125' }}>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                            <strong>💡</strong> {t('cibil.improveSave', { from: score > 0 ? score : 'NH', amount: formatINR(Math.round(potentialSaving)) })}
                        </p>
                    </div>
                )}
            </div>

            {/* Cost Comparison Table */}
            {comparison.length > 0 && (
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <h4 className="text-xs font-bold mb-2" style={{ color: c.textSecondary }}>{t('cibil.costComparison')}</h4>
                    <table className="w-full text-[10px]">
                        <thead><tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}><th className="py-1.5 text-left font-bold">CIBIL</th><th className="py-1.5 text-right font-bold">{t('cibil.rate')}</th><th className="py-1.5 text-right font-bold">EMI</th><th className="py-1.5 text-right font-bold">{t('cibil.totalInt')}</th></tr></thead>
                        <tbody>
                            {comparison.map((row, i) => (
                                <tr key={i} className={row.isCurrent ? 'bg-emerald-500/10' : ''} style={{ borderBottom: `1px solid ${c.border}40`, color: c.text }}>
                                    <td className={`py-1.5 ${row.isCurrent ? 'font-bold text-emerald-500' : ''}`}>{row.label}{row.isCurrent ? ' ←' : ''}</td>
                                    <td className="py-1.5 text-right">{row.rate.toFixed(1)}%</td>
                                    <td className="py-1.5 text-right font-medium">{formatINR(row.emi)}</td>
                                    <td className="py-1.5 text-right">{formatINR(row.totalInterest)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Improvement Tips */}
            <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <button onClick={() => setShowTips(!showTips)} className="w-full p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('cibil.improveTips')}</h3></div>
                    {showTips ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                </button>
                <AnimatePresence>
                    {showTips && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 pb-4 border-t space-y-2" style={{ borderColor: c.border }}>
                                {tipsToShow.map(tip => (
                                    <div key={tip.id} className="p-3 rounded-xl border" style={{ borderColor: c.border }}>
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-bold" style={{ color: c.text }}>{t(tip.titleKey)}</p>
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${tip.impact === 'High' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>{tip.impact} · {tip.points} pts</span>
                                        </div>
                                        <p className="text-[10px]" style={{ color: c.textSecondary }}>{t(tip.descKey)}</p>
                                        <p className="text-[9px] mt-1 font-medium" style={{ color: c.textSecondary }}>⏱ {tip.time}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* RBI Rights */}
            <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <button onClick={() => setShowRbi(!showRbi)} className="w-full p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('cibil.rbiRights')}</h3></div>
                    {showRbi ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                </button>
                <AnimatePresence>
                    {showRbi && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 pb-4 border-t space-y-1.5" style={{ borderColor: c.border }}>
                                {RBI_NOTES.map((noteKey, i) => (
                                    <div key={i} className="flex gap-2 text-[10px]" style={{ color: c.textSecondary }}>
                                        <span className="text-blue-500 flex-shrink-0">✅</span>
                                        <p>{t(noteKey)}</p>
                                    </div>
                                ))}
                                <p className="text-[8px] italic mt-2" style={{ color: c.textSecondary }}>{t('cibil.rbiSource')}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
