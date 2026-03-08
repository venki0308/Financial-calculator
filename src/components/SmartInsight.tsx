import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, AlertTriangle, ThumbsUp } from 'lucide-react';
import { formatINR } from '../utils/calculations';

interface SmartInsightProps {
    calculatorType: string;
    inputs: Record<string, number>;
    results: Record<string, number>;
}

interface Insight {
    type: 'tip' | 'warning' | 'positive' | 'info';
    text: string;
}

const iconMap = {
    tip: Lightbulb,
    warning: AlertTriangle,
    positive: ThumbsUp,
    info: TrendingUp,
};

const colorMap = {
    tip: { bg: '#F59E0B15', border: '#F59E0B30', text: '#F59E0B' },
    warning: { bg: '#EF444415', border: '#EF444430', text: '#EF4444' },
    positive: { bg: '#10B98115', border: '#10B98130', text: '#10B981' },
    info: { bg: '#3B82F615', border: '#3B82F630', text: '#3B82F6' },
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
            if (principal > 5000000) {
                insights.push({ type: 'tip', text: 'For loans above ₹50L, compare offers from at least 3 lenders — even 0.25% difference saves lakhs.' });
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
                    insights.push({ type: 'tip', text: `Increasing SIP by ₹2,000/mo adds ${formatINR(extra)} to your wealth over ${years} years.` });
                }
            }
            if (futureValue > 0 && invested > 0) {
                const multiplier = (futureValue / invested).toFixed(1);
                insights.push({ type: 'positive', text: `Your money grows ${multiplier}x — power of compounding!` });
            }
            if (years >= 15) {
                insights.push({ type: 'info', text: 'Long-term SIP (15+ years) in equity funds has historically given 12-15% CAGR.' });
            }
            break;
        }
        case 'fd': {
            const rate = inputs.rate || 0;
            const inflation = 6;
            const realReturn = rate - inflation;
            if (realReturn < 1) {
                insights.push({ type: 'warning', text: `After ~6% inflation, your real return is only ${realReturn.toFixed(1)}%. Consider equity for long-term goals.` });
            } else {
                insights.push({ type: 'info', text: `After ~6% inflation, your real return is ~${realReturn.toFixed(1)}%.` });
            }
            const principal = inputs.principal || 0;
            if (principal >= 1500000) {
                insights.push({ type: 'tip', text: 'Consider Tax Saving FD (5-year lock-in) for Section 80C deduction up to ₹1.5L.' });
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
            const principal = inputs.principal || 0;
            const rate = inputs.rate || 0;
            const years = inputs.years || 0;
            if (rate > 10) {
                insights.push({ type: 'warning', text: `Your interest rate (${rate}%) is above 10%. Negotiate with your lender or consider balance transfer.` });
            }
            if (years > 15 && principal > 2000000) {
                insights.push({ type: 'tip', text: 'Making 1 extra EMI per year can reduce your loan tenure by 3-4 years.' });
            }
            break;
        }
        case 'ppf': {
            const invested = inputs.annual || 0;
            if (invested < 150000) {
                insights.push({ type: 'tip', text: `You can invest up to ₹1.5L/year in PPF. Currently investing ${formatINR(invested)} — ${formatINR(150000 - invested)} more is eligible for 80C.` });
            }
            insights.push({ type: 'info', text: 'PPF has a 15-year lock-in (extendable by 5). Interest is fully tax-free.' });
            break;
        }
        case 'nps': {
            insights.push({ type: 'tip', text: 'NPS gives additional ₹50,000 tax deduction under Section 80CCD(1B) — over and above 80C limit.' });
            insights.push({ type: 'info', text: '60% of NPS corpus is tax-free at retirement. 40% must be used for annuity.' });
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
            break;
        }
        case 'stepup': {
            const initial = inputs.monthly || 0;
            const stepUp = inputs.stepUp || 10;
            const years = inputs.years || 0;
            const rate = inputs.rate || 12;
            if (initial > 0 && years > 0) {
                // Compare flat vs step-up
                const r = rate / 12 / 100;
                const n = years * 12;
                const flatFV = initial * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
                const wealthGained = results.wealthGained || 0;
                const flatInvested = initial * n;
                const diff = (wealthGained + (initial * n)) - flatFV;
                if (diff > 0) {
                    insights.push({ type: 'positive', text: `Step-up SIP adds ${formatINR(Math.round(diff))} more than a flat SIP of ${formatINR(initial)}/mo!` });
                }
            }
            insights.push({ type: 'tip', text: `A ${inputs.stepUp || 10}% annual step-up follows your salary growth. Increase it with each raise.` });
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

    return (
        <div className="space-y-2.5 mt-4">
            <div className="flex items-center gap-1.5 px-1">
                <Lightbulb size={13} className="text-amber-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Smart Insights</span>
            </div>
            {insights.map((insight, i) => {
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
        </div>
    );
}
