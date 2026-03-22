import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, GraduationCap, Car, Umbrella, Target, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';

import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';
import { useNotificationStore } from '../store/useNotificationStore';
import { useRef } from 'react';

interface GoalPreset {
    id: string;
    label: string;
    icon: React.ElementType;
    gradient: string;
    defaultTarget: number;
    defaultYears: number;
    description: string;
}

const goalPresets: GoalPreset[] = [
    { id: 'house', label: 'House Purchase', icon: Home, gradient: 'from-emerald-500 to-teal-600', defaultTarget: 5000000, defaultYears: 10, description: 'Save for your dream home' },
    { id: 'education', label: 'Child Education', icon: GraduationCap, gradient: 'from-blue-500 to-indigo-600', defaultTarget: 2000000, defaultYears: 15, description: 'Secure your child\'s future' },
    { id: 'retirement', label: 'Retirement', icon: Umbrella, gradient: 'from-purple-500 to-violet-600', defaultTarget: 10000000, defaultYears: 25, description: 'Retire comfortably' },
    { id: 'car', label: 'Car Purchase', icon: Car, gradient: 'from-amber-500 to-orange-600', defaultTarget: 1000000, defaultYears: 3, description: 'Drive your dream car' },
];

export default function GoalPlanner() {
    useEffect(() => { AnalyticsService.trackScreen('Goal_Planner'); }, []);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [selectedGoal, setSelectedGoal] = useState<GoalPreset | null>(null);
    const [targetAmount, setTargetAmount] = useState(5000000);
    const [targetYears, setTargetYears] = useState(10);
    const [expectedReturn, setExpectedReturn] = useState(12);
    const [currentSavings, setCurrentSavings] = useState(0);

    const handleSelectGoal = (goal: GoalPreset) => {
        setSelectedGoal(goal);
        setTargetAmount(goal.defaultTarget);
        setTargetYears(goal.defaultYears);
        setCurrentSavings(0);
        notifiedGoalRef.current = null;
    };

    const notifiedGoalRef = useRef<string | null>(null);

    useEffect(() => {
        if (selectedGoal && targetAmount > 0 && currentSavings >= targetAmount) {
            if (notifiedGoalRef.current !== selectedGoal.id) {
                useNotificationStore.getState().addNotification({
                    type: 'saving_insight',
                    category: 'insight',
                    title: '🎉 Goal Reached!',
                    body: `Congratulations! You have reached your target of ${formatINR(targetAmount)} for ${selectedGoal.label}.`,
                    icon: '🎉',
                    actionRoute: '/goal-planner',
                    isActionable: true,
                    metadata: { calcId: `Goal-${Date.now()}` }
                });
                notifiedGoalRef.current = selectedGoal.id;
            }
        } else if (currentSavings < targetAmount) {
            notifiedGoalRef.current = null;
        }
    }, [currentSavings, targetAmount, selectedGoal]);

    const result = useMemo(() => {
        const remaining = Math.max(0, targetAmount - currentSavings);
        const r = expectedReturn / 12 / 100;
        const n = targetYears * 12;
        if (r === 0 || n === 0) return { monthlySIP: remaining / Math.max(n, 1), totalInvested: remaining, wealthGained: 0, futureValue: remaining };
        // Reverse SIP formula: monthlySIP = FV * r / ((1+r)^n - 1) / (1+r)
        const sipFactor = (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
        const monthlySIP = remaining / sipFactor;
        const totalInvested = monthlySIP * n;
        return {
            monthlySIP,
            totalInvested,
            wealthGained: remaining - totalInvested, // interest earned = FV - principal invested
            futureValue: remaining,
        };
    }, [targetAmount, targetYears, expectedReturn, currentSavings]);

    // Year-wise projection data
    const projection = useMemo(() => {
        const r = expectedReturn / 12 / 100;
        const data: { year: number; invested: number; value: number }[] = [];
        for (let yr = 1; yr <= targetYears; yr++) {
            const n = yr * 12;
            const invested = result.monthlySIP * n;
            const value = result.monthlySIP * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
            data.push({ year: yr, invested, value: value + currentSavings });
        }
        return data;
    }, [targetYears, expectedReturn, result.monthlySIP, currentSavings]);

    return (
        <div className="min-h-dvh bg-background animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background  px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">{t('goalPlanner.title')}</h1>
                        <p className="text-muted-foreground text-xs">{t('goalPlanner.subtitle')}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pb-28 pt-4">
                {!selectedGoal ? (
                    /* Goal Selection */
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Target size={16} className="text-amber-500" />
                            <h2 className="text-sm font-bold text-foreground">{t('goalPlanner.addGoal')}</h2>
                        </div>
                        {goalPresets.map((goal, i) => {
                            const Icon = goal.icon;
                            return (
                                <motion.button
                                    key={goal.id}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => handleSelectGoal(goal)}
                                    className={`w-full p-5 rounded-2xl bg-gradient-to-br ${goal.gradient} border border-white/10 shadow-lg text-left`}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                            <Icon size={24} className="text-foreground" />
                                        </div>
                                        <div>
                                            <h3 className="text-foreground font-bold text-base">{goal.label}</h3>
                                            <p className="text-foreground/80 text-xs mt-0.5">{goal.description}</p>
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                ) : (
                    /* Goal Calculator */
                    <div>
                        {/* Selected Goal Header */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 rounded-2xl bg-gradient-to-br ${selectedGoal.gradient} border border-white/10 mb-5 flex items-center gap-3`}
                        >
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                <selectedGoal.icon size={20} className="text-foreground" />
                            </div>
                            <div>
                                <h3 className="text-foreground font-bold text-sm">{selectedGoal.label}</h3>
                                <p className="text-foreground/80 text-xs">{selectedGoal.description}</p>
                            </div>
                            <button onClick={() => setSelectedGoal(null)} className="ml-auto px-3 py-1.5 rounded-lg bg-white/20 text-foreground text-xs font-bold border border-white/30">
                                Change
                            </button>
                        </motion.div>

                        {/* Inputs */}
                        <div className="space-y-3 mb-5">
                            <NumberInput label={t('goalPlanner.targetAmount')} value={targetAmount} onChange={setTargetAmount} min={10000} max={100000000} prefix="₹" helperText="Your financial goal amount" />
                            <NumberInput label={t('goalPlanner.currentSaving')} value={currentSavings} onChange={setCurrentSavings} min={0} max={targetAmount} prefix="₹" helperText="Amount already saved" />
                            <NumberInput label="Target Years" value={targetYears} onChange={setTargetYears} min={1} max={40} suffix=" years" />
                            <NumberInput label="Expected Return (p.a.)" value={expectedReturn} onChange={setExpectedReturn} min={1} max={30} suffix="%" step={0.5} />
                        </div>

                        {/* Result */}
                        <motion.div layout className="p-5 rounded-2xl bg-card border border-border mb-5">
                            <div className="text-center mb-5">
                                <p className="text-muted-foreground text-sm mb-1">{t('goalPlanner.monthlySIP')}</p>
                                <motion.p
                                    key={result.monthlySIP}
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-3xl font-bold text-brand-green"
                                >
                                    {formatINR(result.monthlySIP)}
                                </motion.p>
                                <p className="text-muted-foreground text-xs mt-1">per month to reach your goal</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="p-3 rounded-xl bg-muted text-center">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Total to Invest</p>
                                    <p className="text-foreground font-bold text-sm">{formatINR(result.totalInvested)}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted text-center">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Returns Earned</p>
                                    <p className="text-brand-green font-bold text-sm">{formatINR(result.wealthGained)}</p>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-border/40 text-center">
                                <p className="text-muted-foreground text-xs mb-1">Goal Amount</p>
                                <p className="text-xl font-bold text-foreground">{formatINR(targetAmount)}</p>
                            </div>
                        </motion.div>

                        {/* Growth Projection */}
                        {projection.length > 0 && (
                            <div className="p-4 rounded-2xl bg-card border border-border mb-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <TrendingUp size={14} className="text-blue-500" />
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Growth Projection</h3>
                                </div>
                                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                                    {projection.filter((_, i) => i % Math.max(1, Math.floor(targetYears / 10)) === 0 || i === projection.length - 1).map((p) => {
                                        const progress = Math.min(100, (p.value / targetAmount) * 100);
                                        return (
                                            <div key={p.year} className="flex items-center gap-3">
                                                <span className="text-xs text-muted-foreground w-10 text-right">Yr {p.year}</span>
                                                <div className="flex-1 h-6 rounded-lg bg-muted overflow-hidden relative">
                                                    <motion.div
                                                        className="h-full rounded-lg bg-gradient-to-r from-brand-green/80 to-brand-green"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ delay: 0.2, duration: 0.5 }}
                                                    />
                                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground drop-shadow-md">
                                                        {formatINR(p.value)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                
                <DisclaimerComponent module="goal" />
            </div>
        </div>
    );
}
