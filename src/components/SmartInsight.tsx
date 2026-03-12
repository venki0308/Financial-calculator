import { useMemo } from 'react';
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

function getInsights(type: string, inputs: Record<string, number>, results: Record<string, number>): Insight[] {
    const insights: Insight[] = [];

    switch (type) {
        case 'emi': {
            const emi = results.emi || 0;
            const income = inputs.monthlyIncome || 50000;
            const emiRatio = (emi / income) * 100;
            if (emiRatio > 30) {
                insights.push({ type: 'warning', text: `Your EMI is ${emiRatio.toFixed(0)}% of estimated income. Recommended EMI limit is below 30%.` });
            } else {
                insights.push({ type: 'positive', text: `Your EMI is ${emiRatio.toFixed(0)}% of estimated income — within the safe limit of 30%.` });
            }
            const totalInterest = results.totalInterest || 0;
            const principal = inputs.principal || 0;
            if (principal > 0) {
                const interestRatio = (totalInterest / principal * 100).toFixed(0);
                insights.push({ type: 'info', text: `You'll pay ${interestRatio}% of loan amount as interest. Consider prepayments to reduce this.` });
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
                    insights.push({ type: 'tip', text: `Reducing interest by 1% saves ${formatINR(Math.round(totalSaved))} over the full tenure.` });
                }
            }

            // What-if: extra EMI per year
            if (principal > 5000000) {
                insights.push({ type: 'tip', text: 'Making 1 extra EMI per year can reduce your loan tenure by 3-4 years and save lakhs in interest.' });
            }

            // Best option
            if (principal > 2000000 && rate > 9) {
                insights.push({ type: 'best', text: `Best move: Negotiate rate below 9% or consider a balance transfer to save up to ${formatINR(Math.round(totalInterest * 0.15))} in interest.` });
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
                    insights.push({ type: 'tip', text: `Increasing SIP by ₹2,000/mo adds ${formatINR(Math.round(extra))} to your wealth over ${years} years.` });
                }

                // What-if: start 3 years earlier
                if (years >= 5) {
                    const nEarly = (years + 3) * 12;
                    const fvEarly = monthly * (((Math.pow(1 + r, nEarly) - 1) / r) * (1 + r));
                    const diff = fvEarly - futureValue;
                    if (diff > 50000) {
                        insights.push({ type: 'info', text: `Starting SIP 3 years earlier would increase your wealth by ${formatINR(Math.round(diff))}.` });
                    }
                }
            }
            if (futureValue > 0 && invested > 0) {
                const multiplier = (futureValue / invested).toFixed(1);
                insights.push({ type: 'positive', text: `Your money grows ${multiplier}x — the power of compounding!` });
            }
            if (years >= 15) {
                insights.push({ type: 'info', text: 'Long-term SIP (15+ years) in equity funds has historically given 12-15% CAGR.' });
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
                    insights.push({ type: 'best', text: `Best option: Step-Up SIP (10% annual increase) adds ${formatINR(Math.round(extraWealth))} more wealth.` });
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
                insights.push({ type: 'warning', text: `After ~6% inflation, your real return is only ${realReturn.toFixed(1)}%. Consider equity for long-term goals.` });
            } else {
                insights.push({ type: 'info', text: `After ~6% inflation, your real return is ~${realReturn.toFixed(1)}%.` });
            }

            // What-if: increase tenure by 2 years
            if (principal > 0 && years > 0 && years <= 18) {
                const currentMat = principal * Math.pow(1 + rate / 400, years * 4);
                const extraMat = principal * Math.pow(1 + rate / 400, (years + 2) * 4);
                const extraInterest = (extraMat - principal) - (currentMat - principal);
                if (extraInterest > 1000) {
                    insights.push({ type: 'tip', text: `Increasing FD tenure by 2 years adds ${formatINR(Math.round(extraInterest))} interest.` });
                }
            }

            if (principal >= 1500000) {
                insights.push({ type: 'tip', text: 'Consider Tax Saving FD (5-year lock-in) for Section 80C deduction up to ₹1.5L.' });
            }

            // Best option: monthly compounding
            if (principal > 0 && years > 0) {
                const qMat = principal * Math.pow(1 + rate / 400, years * 4);
                const mMat = principal * Math.pow(1 + rate / 1200, years * 12);
                const extra = mMat - qMat;
                if (extra > 100) {
                    insights.push({ type: 'best', text: `Best option: Monthly compounding earns ${formatINR(Math.round(extra))} extra vs quarterly.` });
                }
            }
            break;
        }
        case 'tax': {
            const taxable = results.taxableIncome || 0;
            if (taxable > 0 && taxable <= 1200000) {
                insights.push({ type: 'positive', text: 'No income tax payable under the new regime — ₹12L rebate applies!' });
            }
            if (taxable > 1500000) {
                insights.push({ type: 'tip', text: 'Consider maximizing Section 80C (₹1.5L), NPS (₹50K), and health insurance (₹25K) to save tax.' });
            }
            if (taxable > 2400000) {
                insights.push({ type: 'info', text: 'At your income level, compare both old and new tax regimes to find the lower tax option.' });
            }
            break;
        }
        case 'loan': {
            const rate = inputs.rate || 0;
            const years = inputs.years || 0;
            const principal = inputs.principal || 0;
            if (rate > 10) {
                insights.push({ type: 'warning', text: `Your interest rate (${rate}%) is above 10%. Negotiate with your lender or consider balance transfer.` });
            }
            if (years > 15 && principal > 2000000) {
                insights.push({ type: 'tip', text: 'Making 1 extra EMI per year can reduce your loan tenure by 3-4 years.' });
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
                    insights.push({ type: 'info', text: `Prepaying ${formatINR(Math.round(prepayAmt))} (10%) saves ${formatINR(Math.round(saved))} in total interest.` });
                }
            }
            break;
        }
        case 'ppf': {
            const invested = inputs.annual || 0;
            if (invested < 150000) {
                insights.push({ type: 'tip', text: `You can invest up to ₹1.5L/year in PPF. Currently investing ${formatINR(invested)} — ${formatINR(150000 - invested)} more is eligible for 80C.` });
            }
            insights.push({ type: 'info', text: 'PPF has a 15-year lock-in (extendable by 5). Interest is fully tax-free.' });
            insights.push({ type: 'best', text: 'PPF is one of the safest instruments — guaranteed returns with sovereign guarantee + EEE tax status.' });
            break;
        }
        case 'nps': {
            const monthly = inputs.monthly || 0;
            const years = inputs.years || 0;
            insights.push({ type: 'tip', text: 'NPS gives additional ₹50,000 tax deduction under Section 80CCD(1B) — over and above 80C limit.' });
            insights.push({ type: 'info', text: '60% of NPS corpus is tax-free at retirement. 40% must be used for annuity.' });

            // What-if: increase monthly by 2000
            if (monthly > 0 && years > 0) {
                const r = (inputs.rate || 10) / 12 / 100;
                const n = years * 12;
                const extra = 2000 * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
                if (extra > 50000) {
                    insights.push({ type: 'tip', text: `Increasing NPS contribution by ₹2,000/mo adds ${formatINR(Math.round(extra))} to your retirement corpus.` });
                }
            }

            insights.push({ type: 'best', text: 'NPS is ideal for retirement — low-cost, diversified, and gives up to ₹2L tax savings (80C + 80CCD1B).' });
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
                insights.push({ type: 'info', text: `Alternatively, you could invest ${formatINR(Math.round(monthlySIP))}/month via SIP for ${years} years to reach the same goal.` });
            }
            insights.push({ type: 'best', text: 'For large lumpsum, consider STP (Systematic Transfer Plan) to reduce market-timing risk.' });
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
                    insights.push({ type: 'positive', text: `Step-up SIP adds ${formatINR(Math.round(diff))} more than a flat SIP of ${formatINR(initial)}/mo!` });
                }
            }
            insights.push({ type: 'tip', text: `A ${inputs.stepUp || 10}% annual step-up follows your salary growth. Increase it with each raise.` });
            insights.push({ type: 'best', text: 'Step-Up SIP is the smartest SIP strategy — small increments create massive wealth over time.' });
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
                    insights.push({ type: 'warning', text: `Your contribution margin is ${marginPct}%. Below 30% makes scaling difficult.` });
                } else if (Number(marginPct) > 50) {
                    insights.push({ type: 'positive', text: `Excellent margin at ${marginPct}%! You have strong pricing power.` });
                }
                const beUnits = Math.ceil(fixed / margin);
                const doubleProfit = beUnits * 2 * margin - fixed;
                insights.push({ type: 'info', text: `Selling ${beUnits * 2} units (2x breakeven) yields ${formatINR(Math.round(doubleProfit))} profit.` });
            }
            if (fixed > 0 && margin > 0) {
                const reduced = Math.ceil((fixed * 0.9) / margin);
                const original = Math.ceil(fixed / margin);
                insights.push({ type: 'tip', text: `Cutting fixed costs by 10% reduces breakeven from ${original} to ${reduced} units.` });
            }
            break;
        }
        case 'gratuity': {
            insights.push({ type: 'info', text: 'Gratuity is payable after 5 years of continuous service under the Payment of Gratuity Act.' });
            insights.push({ type: 'tip', text: 'Tax-free gratuity limit is ₹20L for employees under the Act and ₹25L for central/state govt employees.' });
            break;
        }
        case 'hra': {
            insights.push({ type: 'tip', text: 'HRA exemption is the minimum of: actual HRA, 50%/40% of salary, or rent paid minus 10% of salary.' });
            insights.push({ type: 'info', text: 'If you don\'t receive HRA, you can claim deduction under Section 80GG (up to ₹5,000/month).' });
            break;
        }
        default:
            break;
    }

    return insights;
}

export default function SmartInsight({ calculatorType, inputs, results }: SmartInsightProps) {
    const insights = useMemo(() => getInsights(calculatorType, inputs, results), [calculatorType, inputs, results]);

    if (insights.length === 0) return null;

    // Separate best option from regular insights
    const regular = insights.filter(i => i.type !== 'best');
    const bestOption = insights.find(i => i.type === 'best');

    return (
        <div className="space-y-2.5 mt-4">
            <div className="flex items-center gap-1.5 px-1">
                <Lightbulb size={13} className="text-amber-400" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Smart Insights</span>
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
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Best Financial Option</span>
                    </div>
                    <p className="text-xs font-medium text-slate-300 leading-relaxed">{bestOption.text}</p>
                </motion.div>
            )}
        </div>
    );
}
