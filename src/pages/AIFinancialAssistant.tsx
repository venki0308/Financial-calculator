import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Home, GraduationCap, Car, Umbrella, Briefcase, TrendingUp, PiggyBank, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';

interface FinancialPlan {
    score: number;
    recommendations: { icon: React.ElementType; title: string; value: string; detail: string; color: string }[];
    alerts: { type: 'warning' | 'positive'; text: string }[];
}

export default function AIFinancialAssistant() {
    useEffect(() => { AnalyticsService.trackScreen('AI_Financial_Assistant'); }, []);
    const navigate = useNavigate();

    const [salary, setSalary] = useState(50000);
    const [age, setAge] = useState(28);
    const [expenses, setExpenses] = useState(25000);
    const [savings, setSavings] = useState(100000);
    const [emi, setEmi] = useState(0);
    const [goal, setGoal] = useState('');
    const [showResults, setShowResults] = useState(false);

    const goals = [
        { id: 'house', label: 'Buy House', icon: Home, gradient: 'from-emerald-500 to-teal-600' },
        { id: 'education', label: 'Child Education', icon: GraduationCap, gradient: 'from-blue-500 to-indigo-600' },
        { id: 'retirement', label: 'Retirement', icon: Umbrella, gradient: 'from-purple-500 to-violet-600' },
        { id: 'car', label: 'Buy Car', icon: Car, gradient: 'from-amber-500 to-orange-600' },
        { id: 'wealth', label: 'Wealth Growth', icon: TrendingUp, gradient: 'from-sky-500 to-blue-600' },
        { id: 'business', label: 'Start Business', icon: Briefcase, gradient: 'from-rose-500 to-pink-600' },
    ];

    const plan = useMemo((): FinancialPlan | null => {
        if (!showResults) return null;

        const monthlySavings = salary - expenses - emi;
        const savingsRatio = monthlySavings / salary * 100;
        const emiRatio = emi / salary * 100;
        const emergencyMonths = savings / expenses;
        const annualIncome = salary * 12;

        const recommendations: FinancialPlan['recommendations'] = [];
        const alerts: FinancialPlan['alerts'] = [];

        // Savings Score
        let score = 0;
        if (savingsRatio >= 30) score += 30;
        else if (savingsRatio >= 20) score += 22;
        else if (savingsRatio >= 10) score += 12;
        else score += 5;

        // EMI Score
        if (emiRatio <= 20) score += 25;
        else if (emiRatio <= 30) score += 18;
        else if (emiRatio <= 40) score += 10;
        else score += 3;

        // Emergency Fund Score
        if (emergencyMonths >= 6) score += 25;
        else if (emergencyMonths >= 3) score += 15;
        else score += 5;

        // Age-based investment score
        const idealInvestPct = Math.min(100 - age, 80);
        score += Math.min(20, Math.round(savingsRatio / idealInvestPct * 20));

        score = Math.min(100, score);

        // Goal-specific recommendations
        switch (goal) {
            case 'house': {
                const affordability = Math.round(annualIncome * 5);
                const recommendedEMI = Math.round(salary * 0.28);
                recommendations.push(
                    { icon: Home, title: 'Home Loan Affordability', value: formatINR(affordability), detail: `Based on 5x annual income`, color: '#10B981' },
                    { icon: PiggyBank, title: 'Recommended EMI', value: formatINR(recommendedEMI) + '/mo', detail: '28% of monthly income', color: '#3B82F6' },
                );
                const downPayment = Math.round(affordability * 0.2);
                recommendations.push(
                    { icon: Shield, title: 'Down Payment Target', value: formatINR(downPayment), detail: '20% of property value', color: '#8B5CF6' },
                );
                break;
            }
            case 'retirement': {
                const retirementAge = 60;
                const yearsToRetire = retirementAge - age;
                const monthlyCorpus = expenses * 1.5;
                const corpusNeeded = monthlyCorpus * 12 * 25;
                const r = 12 / 12 / 100;
                const n = yearsToRetire * 12;
                const sipFactor = (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
                const requiredSIP = corpusNeeded / sipFactor;
                recommendations.push(
                    { icon: TrendingUp, title: 'Start Monthly SIP', value: formatINR(requiredSIP) + '/mo', detail: `${yearsToRetire} years to retirement`, color: '#10B981' },
                    { icon: Umbrella, title: 'Target Corpus', value: formatINR(corpusNeeded), detail: `At age ${retirementAge}`, color: '#8B5CF6' },
                );
                break;
            }
            case 'car': {
                const carBudget = Math.round(salary * 15); // ~15 months salary
                const carEMI = Math.round(carBudget * 0.8 / 60); // 80% financed, 5 years
                recommendations.push(
                    { icon: Car, title: 'Affordable Car Budget', value: formatINR(carBudget), detail: 'Based on your income', color: '#F59E0B' },
                    { icon: PiggyBank, title: 'Estimated EMI', value: formatINR(carEMI) + '/mo', detail: '80% financed, 5 years', color: '#3B82F6' },
                );
                break;
            }
            default: {
                const idealSIP = Math.round(monthlySavings * 0.6);
                const r = 12 / 12 / 100;
                const n = 10 * 12;
                const futureValue = idealSIP * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
                recommendations.push(
                    { icon: TrendingUp, title: 'Suggested SIP', value: formatINR(idealSIP) + '/mo', detail: '60% of monthly surplus', color: '#10B981' },
                    { icon: PiggyBank, title: '10-Year Projection', value: formatINR(futureValue), detail: 'At 12% annual return', color: '#3B82F6' },
                );
            }
        }

        // Emergency fund recommendation
        const emergencyTarget = expenses * 6;
        recommendations.push(
            { icon: Shield, title: 'Emergency Fund', value: formatINR(emergencyTarget), detail: `6 months expenses (you have ${emergencyMonths.toFixed(1)} months)`, color: '#F59E0B' },
        );

        // Alerts
        if (emiRatio > 35) {
            alerts.push({ type: 'warning', text: `Your EMI is ${emiRatio.toFixed(0)}% of income — dangerously high. Recommended: below 30%.` });
        }
        if (savingsRatio < 15) {
            alerts.push({ type: 'warning', text: `You're saving only ${savingsRatio.toFixed(0)}% of income. Target: 20%+ for financial security.` });
        }
        if (emergencyMonths < 3) {
            alerts.push({ type: 'warning', text: `Emergency fund covers only ${emergencyMonths.toFixed(1)} months. Build 6-month buffer first.` });
        }
        if (savingsRatio >= 25) {
            alerts.push({ type: 'positive', text: `Great savings rate of ${savingsRatio.toFixed(0)}%! You're building wealth faster than most.` });
        }
        if (emiRatio <= 15 && emi > 0) {
            alerts.push({ type: 'positive', text: `Your debt is well-managed at ${emiRatio.toFixed(0)}% of income. Keep it up!` });
        }

        return { score, recommendations, alerts };
    }, [showResults, salary, age, expenses, savings, emi, goal]);

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-dark-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-amber-400" />
                        <div>
                            <h1 className="text-lg font-bold text-white">AI Financial Advisor</h1>
                            <p className="text-slate-500 text-xs">Personalized financial insights</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 pb-28 pt-4">
                <AnimatePresence mode="wait">
                    {!showResults ? (
                        <motion.div key="inputs" initial={{ opacity: 1 }} exit={{ opacity: 0, x: -50 }}>
                            {/* Income Details */}
                            <div className="mb-5">
                                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-brand-green/10 flex items-center justify-center text-brand-green text-xs font-bold">1</span>
                                    Your Details
                                </h2>
                                <div className="space-y-3">
                                    <NumberInput label="Monthly Salary" value={salary} onChange={setSalary} min={5000} max={10000000} prefix="₹" />
                                    <NumberInput label="Age" value={age} onChange={setAge} min={18} max={70} suffix=" years" />
                                    <NumberInput label="Monthly Expenses" value={expenses} onChange={setExpenses} min={0} max={salary} prefix="₹" />
                                    <NumberInput label="Current Savings" value={savings} onChange={setSavings} min={0} max={100000000} prefix="₹" />
                                    <NumberInput label="Existing EMI (if any)" value={emi} onChange={setEmi} min={0} max={salary} prefix="₹" />
                                </div>
                            </div>

                            {/* Goal Selection */}
                            <div className="mb-5">
                                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple text-xs font-bold">2</span>
                                    Your Financial Goal
                                </h2>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {goals.map((g) => {
                                        const Icon = g.icon;
                                        const isSelected = goal === g.id;
                                        return (
                                            <motion.button
                                                key={g.id}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setGoal(g.id)}
                                                className={`p-3.5 rounded-xl border text-left transition-all ${isSelected
                                                    ? `bg-gradient-to-br ${g.gradient} border-white/20 shadow-lg`
                                                    : 'bg-dark-card border-dark-border hover:border-slate-600'
                                                    }`}
                                            >
                                                <Icon size={20} className={isSelected ? 'text-white' : 'text-slate-400'} />
                                                <p className={`text-xs font-bold mt-2 ${isSelected ? 'text-white' : 'text-slate-300'}`}>{g.label}</p>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Generate Button */}
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setShowResults(true)}
                                disabled={!goal}
                                className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${goal
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20'
                                    : 'bg-dark-card border border-dark-border text-slate-500'
                                    }`}
                            >
                                <Sparkles size={18} />
                                Generate Financial Plan
                            </motion.button>
                        </motion.div>
                    ) : plan && (
                        <motion.div key="results" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}>
                            {/* Financial Health Score */}
                            <div className="p-6 rounded-2xl bg-dark-card border border-dark-border mb-5 text-center">
                                <p className="text-slate-400 text-sm mb-2">Financial Health Score</p>
                                <div className="relative w-32 h-32 mx-auto mb-3">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                        <circle cx="60" cy="60" r="50" stroke="#1E293B" strokeWidth="10" fill="none" />
                                        <motion.circle
                                            cx="60" cy="60" r="50"
                                            stroke={plan.score >= 70 ? '#10B981' : plan.score >= 40 ? '#F59E0B' : '#EF4444'}
                                            strokeWidth="10" fill="none"
                                            strokeLinecap="round"
                                            strokeDasharray={`${plan.score * 3.14} 314`}
                                            initial={{ strokeDashoffset: 314 }}
                                            animate={{ strokeDashoffset: 0 }}
                                            transition={{ duration: 1.2, ease: 'easeOut' }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div>
                                            <motion.p
                                                className="text-3xl font-bold text-white"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.5 }}
                                            >
                                                {plan.score}
                                            </motion.p>
                                            <p className="text-[10px] text-slate-500 font-bold">/100</p>
                                        </div>
                                    </div>
                                </div>
                                <p className={`text-sm font-bold ${plan.score >= 70 ? 'text-brand-green' : plan.score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                    {plan.score >= 80 ? 'Excellent!' : plan.score >= 60 ? 'Good' : plan.score >= 40 ? 'Needs Improvement' : 'At Risk'}
                                </p>
                            </div>

                            {/* Alerts */}
                            {plan.alerts.length > 0 && (
                                <div className="space-y-2 mb-5">
                                    {plan.alerts.map((alert, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 + i * 0.1 }}
                                            className={`flex items-start gap-3 p-3.5 rounded-xl border ${alert.type === 'warning'
                                                ? 'bg-red-500/5 border-red-500/20'
                                                : 'bg-brand-green/5 border-brand-green/20'
                                                }`}
                                        >
                                            {alert.type === 'warning'
                                                ? <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                                                : <CheckCircle size={16} className="text-brand-green mt-0.5 flex-shrink-0" />
                                            }
                                            <p className="text-xs text-slate-300 leading-relaxed">{alert.text}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* Recommendations */}
                            <div className="mb-5">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Sparkles size={13} className="text-amber-400" />
                                    Suggested Plan
                                </h3>
                                <div className="space-y-3">
                                    {plan.recommendations.map((rec, i) => {
                                        const Icon = rec.icon;
                                        return (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.5 + i * 0.12 }}
                                                className="p-4 rounded-xl bg-dark-card border border-dark-border"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${rec.color}15` }}>
                                                        <Icon size={20} style={{ color: rec.color }} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{rec.title}</p>
                                                        <p className="text-white font-bold text-lg">{rec.value}</p>
                                                        <p className="text-slate-500 text-xs mt-0.5">{rec.detail}</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Modify / Restart */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowResults(false)}
                                    className="flex-1 py-4 rounded-2xl bg-dark-card border border-dark-border text-slate-300 font-bold text-sm"
                                >
                                    Modify Inputs
                                </button>
                                <button
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({
                                                title: 'My Financial Plan - FinCalix',
                                                text: `My Financial Health Score: ${plan.score}/100\n${plan.recommendations.map(r => `${r.title}: ${r.value}`).join('\n')}\n\nGenerated with FinCalix`,
                                                url: window.location.href,
                                            });
                                        }
                                    }}
                                    className="flex-1 py-4 rounded-2xl bg-brand-purple text-white font-bold text-sm shadow-lg shadow-brand-purple/20"
                                >
                                    Share Plan
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
