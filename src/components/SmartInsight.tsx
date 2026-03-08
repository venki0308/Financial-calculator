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
                insights.push({ type: 'warning', text: `Your EMI is ${emiRatio.toFixed(0)}% of estimated income. Keep it below 30% for financial safety.` });
            } else {
                insights.push({ type: 'positive', text: `Your EMI is ${emiRatio.toFixed(0)}% of estimated income — within the safe limit of 30%.` });
            }
            const totalInterest = results.totalInterest || 0;
            const principal = inputs.principal || 0;
            if (principal > 0) {
                const interestRatio = (totalInterest / principal * 100).toFixed(0);
                insights.push({ type: 'info', text: `You'll pay ${interestRatio}% of loan amount as interest. Consider prepayments to reduce this.` });
            }
            break;
        }
        case 'sip': {
            const monthly = inputs.monthly || 0;
            const years = inputs.years || 0;
            const futureValue = results.futureValue || 0;
            const invested = results.invested || 0;
            if (monthly > 0 && years > 0) {
                // Show impact of ₹2000 increase
                const r = (inputs.rate || 12) / 12 / 100;
                const n = years * 12;
                const extra = 2000 * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
                const diff = extra;
                if (diff > 100000) {
                    insights.push({ type: 'tip', text: `Increasing SIP by ₹2,000/mo adds ${formatINR(diff)} to your wealth over ${years} years.` });
                }
            }
            if (futureValue > 0 && invested > 0) {
                const multiplier = (futureValue / invested).toFixed(1);
                insights.push({ type: 'positive', text: `Your money grows ${multiplier}x — power of compounding!` });
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
