import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, AlertTriangle, ThumbsUp, Star, Zap } from 'lucide-react';
import { formatINR } from '../utils/calculations';

interface SmartInsightProps {
    calculatorType: string;
    inputs: Record<string, number>;
    results: Record<string, number>;
}

interface Insight {
    type: 'tip' | 'warning' | 'positive' | 'info' | 'best';
    text: string;
}

const iconMap = {
    tip: Lightbulb,
    warning: AlertTriangle,
    positive: ThumbsUp,
    info: TrendingUp,
    best: Star,
};

const colorMap = {
    tip: { bg: '#F59E0B15', border: '#F59E0B30', text: '#F59E0B' },
    warning: { bg: '#EF444415', border: '#EF444430', text: '#EF4444' },
    positive: { bg: '#10B98115', border: '#10B98130', text: '#10B981' },
    info: { bg: '#3B82F615', border: '#3B82F630', text: '#3B82F6' },
    best: { bg: '#8B5CF615', border: '#8B5CF630', text: '#8B5CF6' },
};

function getInsights(type: string, inputs: Record<string, number>, results: Record<string, number>, t: (key: string, opts?: Record<string, unknown>) => string): Insight[] {
    const insights: Insight[] = [];

    switch (type) {
        case 'emi': {
            const emi = results.emi || 0;
            const income = inputs.monthlyIncome || 50000;
            const emiRatio = (emi / income) * 100;
            if (emiRatio > 30) {
                insights.push({ type: 'warning', text: t('insight.emiHighRatio', { ratio: emiRatio.toFixed(0) }) });
            } else {
                insights.push({ type: 'positive', text: t('insight.emiSafeRatio', { ratio: emiRatio.toFixed(0) }) });
            }
            const totalInterest = results.totalInterest || 0;
            const principal = inputs.principal || 0;
            if (principal > 0) {
                const interestRatio = (totalInterest / principal * 100).toFixed(0);
                insights.push({ type: 'info', text: t('insight.emiInterestRatio', { ratio: interestRatio }) });
            }

            // What-if: reducing rate by 1%
            const rate = inputs.rate || 8.5;
            const months = inputs.months || 240;
            if (principal > 0 && rate > 1) {
                const r1 = rate / 12 / 100;
                const emi1 = principal * r1 * Math.pow(1 + r1, months) / (Math.pow(1 + r1, months) - 1);
                const r2 = (rate - 1) / 12 / 100;
                const emi2 = principal * r2 * Math.pow(1 + r2, months) / (Math.pow(1 + r2, months) - 1);
                const totalSaved = (emi1 - emi2) * months;
                if (totalSaved > 10000) {
                    insights.push({ type: 'tip', text: t('insight.emiRateReduction', { amount: formatINR(Math.round(totalSaved)) }) });
                }
            }

            // What-if: extra EMI per year
            if (principal > 5000000) {
                insights.push({ type: 'tip', text: t('insight.emiExtraPayment') });
            }

            // Best option
            if (principal > 2000000 && rate > 9) {
                insights.push({ type: 'best', text: t('insight.emiBestMove', { amount: formatINR(Math.round(totalInterest * 0.15)) }) });
            }
            break;
        }
        case 'sip': {
            const monthly = inputs.monthly || 0;
            const years = inputs.years || 0;
            const futureValue = results.futureValue || 0;
            const invested = results.invested || 0;
            if (monthly > 0 && years > 0) {
                const r = (inputs.rate || 12) / 12 / 100;
                const n = years * 12;
                const extra = 2000 * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
                if (extra > 100000) {
                    insights.push({ type: 'tip', text: t('insight.sipIncrease', { amount: formatINR(Math.round(extra)), years }) });
                }

                // What-if: start 3 years earlier
                if (years >= 5) {
                    const nEarly = (years + 3) * 12;
                    const fvEarly = monthly * (((Math.pow(1 + r, nEarly) - 1) / r) * (1 + r));
                    const diff = fvEarly - futureValue;
                    if (diff > 50000) {
                        insights.push({ type: 'info', text: t('insight.sipEarlierStart', { amount: formatINR(Math.round(diff)) }) });
                    }
                }
            }
            if (futureValue > 0 && invested > 0) {
                const multiplier = (futureValue / invested).toFixed(1);
                insights.push({ type: 'positive', text: t('insight.sipMultiplier', { multiplier }) });
            }
            if (years >= 15) {
                insights.push({ type: 'info', text: t('insight.sipLongTerm') });
            }

            // Best option: step-up SIP
            if (monthly > 0 && years > 5) {
                const r = (inputs.rate || 12) / 12 / 100;
                let stepUpFv = 0;
                for (let y = 0; y < years; y++) {
                    const sipM = monthly * Math.pow(1.1, y); // 10% annual step-up
                    for (let m = 0; m < 12; m++) {
                        const remaining = (years - y) * 12 - m;
                        stepUpFv += sipM * Math.pow(1 + r, remaining);
                    }
                }
                const extraWealth = stepUpFv - futureValue;
                if (extraWealth > 100000) {
                    insights.push({ type: 'best', text: t('insight.sipBestStepUp', { amount: formatINR(Math.round(extraWealth)) }) });
                }
            }
            break;
        }
        case 'fd': {
            const rate = inputs.rate || 0;
            const years = inputs.years || 0;
            const principal = inputs.principal || 0;
            const inflation = 6;
            const realReturn = rate - inflation;
            if (realReturn < 1) {
                insights.push({ type: 'warning', text: t('insight.fdLowReal', { realReturn: realReturn.toFixed(1) }) });
            } else {
                insights.push({ type: 'info', text: t('insight.fdRealReturn', { realReturn: realReturn.toFixed(1) }) });
            }

            // What-if: increase tenure by 2 years
            if (principal > 0 && years > 0 && years <= 18) {
                const currentMat = principal * Math.pow(1 + rate / 400, years * 4);
                const extraMat = principal * Math.pow(1 + rate / 400, (years + 2) * 4);
                const extraInterest = (extraMat - principal) - (currentMat - principal);
                if (extraInterest > 1000) {
                    insights.push({ type: 'tip', text: t('insight.fdTenureIncrease', { amount: formatINR(Math.round(extraInterest)) }) });
                }
            }

            if (principal >= 1500000) {
                insights.push({ type: 'tip', text: t('insight.fdTaxSaving') });
            }

            // Best option: monthly compounding
            if (principal > 0 && years > 0) {
                const qMat = principal * Math.pow(1 + rate / 400, years * 4);
                const mMat = principal * Math.pow(1 + rate / 1200, years * 12);
                const extra = mMat - qMat;
                if (extra > 100) {
                    insights.push({ type: 'best', text: t('insight.fdBestMonthly', { amount: formatINR(Math.round(extra)) }) });
                }
            }
            break;
        }
        case 'tax': {
            const taxable = results.taxableIncome || 0;
            if (taxable > 0 && taxable <= 1200000) {
                insights.push({ type: 'positive', text: t('insight.taxNoTax') });
            }
            if (taxable > 1500000) {
                insights.push({ type: 'tip', text: t('insight.taxMaxDeductions') });
            }
            if (taxable > 2400000) {
                insights.push({ type: 'info', text: t('insight.taxCompareRegimes') });
            }
            break;
        }
        case 'loan': {
            const rate = inputs.rate || 0;
            const years = inputs.years || 0;
            const principal = inputs.principal || 0;
            if (rate > 10) {
                insights.push({ type: 'warning', text: t('insight.loanHighRate', { rate }) });
            }
            if (years > 15 && principal > 2000000) {
                insights.push({ type: 'tip', text: t('insight.loanExtraEmi') });
            }
            // What-if: prepaying 10% of principal
            if (principal > 500000) {
                const prepayAmt = principal * 0.1;
                const newPrincipal = principal - prepayAmt;
                const r = rate / 12 / 100;
                const n = years * 12;
                const emi1 = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
                const emi2 = newPrincipal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
                const saved = (emi1 - emi2) * n;
                if (saved > 10000) {
                    insights.push({ type: 'info', text: t('insight.loanPrepay', { prepayAmt: formatINR(Math.round(prepayAmt)), saved: formatINR(Math.round(saved)) }) });
                }
            }
            break;
        }
        case 'ppf': {
            const invested = inputs.annual || 0;
            if (invested < 150000) {
                insights.push({ type: 'tip', text: t('insight.ppfRoom', { invested: formatINR(invested), remaining: formatINR(150000 - invested) }) });
            }
            insights.push({ type: 'info', text: t('insight.ppfLockIn') });
            insights.push({ type: 'best', text: t('insight.ppfBest') });
            break;
        }
        case 'nps': {
            const monthly = inputs.monthly || 0;
            const years = inputs.years || 0;
            insights.push({ type: 'tip', text: t('insight.npsTaxDeduction') });
            insights.push({ type: 'info', text: t('insight.npsCorpusSplit') });

            // What-if: increase monthly by 2000
            if (monthly > 0 && years > 0) {
                const r = (inputs.rate || 10) / 12 / 100;
                const n = years * 12;
                const extra = 2000 * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
                if (extra > 50000) {
                    insights.push({ type: 'tip', text: t('insight.npsIncrease', { amount: formatINR(Math.round(extra)) }) });
                }
            }

            insights.push({ type: 'best', text: t('insight.npsBest') });
            break;
        }
        case 'lumpsum': {
            const amount = inputs.amount || 0;
            const years = inputs.years || 0;
            const rate = inputs.rate || 12;
            if (amount > 0 && years > 0) {
                const r = rate / 12 / 100;
                const n = years * 12;
                const monthlySIP = amount / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
                insights.push({ type: 'info', text: t('insight.lumpsumAltSip', { amount: formatINR(Math.round(monthlySIP)), years }) });
            }
            insights.push({ type: 'best', text: t('insight.lumpsumBestStp') });
            break;
        }
        case 'stepup': {
            const initial = inputs.monthly || 0;
            const stepUp = inputs.stepUp || 10;
            const years = inputs.years || 0;
            const rate = inputs.rate || 12;
            if (initial > 0 && years > 0) {
                const r = rate / 12 / 100;
                const n = years * 12;
                const flatFV = initial * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
                const wealthGained = results.wealthGained || 0;
                const diff = (wealthGained + (initial * n)) - flatFV;
                if (diff > 0) {
                    insights.push({ type: 'positive', text: t('insight.stepupExtra', { extra: formatINR(Math.round(diff)), monthly: formatINR(initial) }) });
                }
            }
            insights.push({ type: 'tip', text: t('insight.stepupFollow', { percent: inputs.stepUp || 10 }) });
            insights.push({ type: 'best', text: t('insight.stepupBest') });
            break;
        }
        case 'breakeven': {
            const price = inputs.price || 0;
            const variable = inputs.variable || 0;
            const fixed = inputs.fixed || 0;
            const margin = price - variable;
            if (margin > 0 && price > 0) {
                const marginPct = (margin / price * 100).toFixed(0);
                if (Number(marginPct) < 30) {
                    insights.push({ type: 'warning', text: t('insight.breakevenLowMargin', { margin: marginPct }) });
                } else if (Number(marginPct) > 50) {
                    insights.push({ type: 'positive', text: t('insight.breakevenHighMargin', { margin: marginPct }) });
                }
                const beUnits = Math.ceil(fixed / margin);
                const doubleProfit = beUnits * 2 * margin - fixed;
                insights.push({ type: 'info', text: t('insight.breakevenDouble', { units: beUnits * 2, profit: formatINR(Math.round(doubleProfit)) }) });
            }
            if (fixed > 0 && margin > 0) {
                const reduced = Math.ceil((fixed * 0.9) / margin);
                const original = Math.ceil(fixed / margin);
                insights.push({ type: 'tip', text: t('insight.breakevenCutCosts', { original, reduced }) });
            }
            break;
        }
        case 'gratuity': {
            insights.push({ type: 'info', text: t('insight.gratuityInfo') });
            insights.push({ type: 'tip', text: t('insight.gratuityTaxFree') });
            break;
        }
        case 'hra': {
            insights.push({ type: 'tip', text: t('insight.hraExemption') });
            insights.push({ type: 'info', text: t('insight.hraNoHra') });
            break;
        }
        case 'scss': {
            const investment = inputs.investment || 0;
            const rate = inputs.rate || 8.2;
            const annualInterest = results.annualInterest || 0;
            if (investment < 3000000) {
                const remaining = 3000000 - investment;
                insights.push({ type: 'tip', text: t('insight.scssRoom', { remaining: formatINR(remaining) }) });
            }
            if (annualInterest > 50000) {
                insights.push({ type: 'warning', text: t('insight.scssTds') });
            } else {
                insights.push({ type: 'positive', text: t('insight.scssNoTds') });
            }
            insights.push({ type: 'info', text: t('insight.scss80c') });
            if (rate >= 8.0) {
                insights.push({ type: 'positive', text: t('insight.scssHighRate', { rate }) });
            }
            insights.push({ type: 'best', text: t('insight.scssBest') });
            break;
        }
        default:
            break;
    }

    return insights;
}

export default function SmartInsight({ calculatorType, inputs, results }: SmartInsightProps) {
    const { t } = useTranslation();
    const insights = useMemo(() => getInsights(calculatorType, inputs, results, t), [calculatorType, inputs, results, t]);

    if (insights.length === 0) return null;

    // Separate best option from regular insights
    const regular = insights.filter(i => i.type !== 'best');
    const bestOption = insights.find(i => i.type === 'best');

    return (
        <div className="space-y-2.5 mt-4">
            <div className="flex items-center gap-1.5 px-1">
                <Lightbulb size={13} className="text-amber-400" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('insight.smartInsights')}</span>
            </div>
            {regular.map((insight, i) => {
                const Icon = iconMap[insight.type];
                const colors = colorMap[insight.type];
                return (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-3.5 rounded-xl border"
                        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                    >
                        <Icon size={16} style={{ color: colors.text }} className="mt-0.5 flex-shrink-0" />
                        <p className="text-xs font-medium text-slate-300 leading-relaxed">{insight.text}</p>
                    </motion.div>
                );
            })}

            {/* Best Option Card */}
            {bestOption && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/30"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <Zap size={12} className="text-violet-400" />
                        </div>
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">{t('insight.bestOption')}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-300 leading-relaxed">{bestOption.text}</p>
                </motion.div>
            )}
        </div>
    );
}
