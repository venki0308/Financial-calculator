import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, GraduationCap, Car, Umbrella, Target, TrendingUp, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';

import { formatINR } from '../utils/calculations';
import { exportToPDF, type ExportConfig, dateTag } from '../utils/exportReport';
import { AnalyticsService } from '../lib/analytics';
import { useNotificationStore } from '../store/useNotificationStore';

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
    { id: 'custom', label: 'Custom Goal', icon: Target, gradient: 'from-pink-500 to-rose-600', defaultTarget: 2000000, defaultYears: 5, description: 'Any financial goal you want' },
];

export default function GoalPlanner() {
    useEffect(() => { AnalyticsService.trackScreen('Goal_Planner'); }, []);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [selectedGoal, setSelectedGoal] = useState<GoalPreset | null>(null);
    const [currentCost, setCurrentCost] = useState(5000000);
    const [inflationRate, setInflationRate] = useState(6);
    const [targetYears, setTargetYears] = useState(10);
    const [expectedReturn, setExpectedReturn] = useState(12);
    const [currentSavings, setCurrentSavings] = useState(0);

    const handleSelectGoal = (goal: GoalPreset) => {
        setSelectedGoal(goal);
        setCurrentCost(goal.defaultTarget);
        setTargetYears(goal.defaultYears);
        setCurrentSavings(0);
        notifiedGoalRef.current = null;
    };

    const notifiedGoalRef = useRef<string | null>(null);

    useEffect(() => {
        if (selectedGoal && currentCost > 0 && currentSavings >= currentCost) {
            if (notifiedGoalRef.current !== selectedGoal.id) {
                useNotificationStore.getState().addNotification({
                    type: 'saving_insight',
                    category: 'insight',
                    title: '🎉 Goal Reached!',
                    body: `Congratulations! You have reached your target of ${formatINR(currentCost)} for ${selectedGoal.label}.`,
                    icon: '🎉',
                    actionRoute: '/goal-planner',
                    isActionable: true,
                    metadata: { calcId: `Goal-${Date.now()}` }
                });
                notifiedGoalRef.current = selectedGoal.id;
            }
        } else if (currentSavings < currentCost) {
            notifiedGoalRef.current = null;
        }
    }, [currentSavings, currentCost, selectedGoal]);

    const result = useMemo(() => {
        const targetFV = currentCost * Math.pow(1 + (inflationRate / 100), targetYears);
        const remaining = Math.max(0, targetFV - currentSavings);
        const r = expectedReturn / 12 / 100;
        const n = targetYears * 12;
        const realRate = ((1 + expectedReturn / 100) / (1 + inflationRate / 100)) - 1;

        if (r === 0 || n === 0) return { monthlySIP: remaining / Math.max(n, 1), totalInvested: remaining, wealthGained: 0, futureValue: remaining, targetFV, realRate };
        
        // Reverse SIP formula: monthlySIP = FV * r / ((1+r)^n - 1) / (1+r)
        const sipFactor = (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
        const monthlySIP = remaining / sipFactor;
        const totalInvested = monthlySIP * n;
        
        return {
            monthlySIP,
            totalInvested,
            wealthGained: remaining - totalInvested, // interest earned = FV - principal invested
            futureValue: remaining,
            targetFV,
            realRate,
        };
    }, [currentCost, targetYears, expectedReturn, currentSavings, inflationRate]);

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

    const handleDownloadPDF = async () => {
        const config: ExportConfig = {
            title: 'Goal Planner Report',
            subtitle: selectedGoal ? selectedGoal.label : 'Custom Goal',
            inputs: [
                { label: 'Goal', value: selectedGoal ? selectedGoal.label : 'Custom' },
                { label: 'Current Cost', value: `₹${currentCost.toLocaleString('en-IN')}` },
                { label: 'Current Savings', value: `₹${currentSavings.toLocaleString('en-IN')}` },
                { label: 'Target Years', value: `${targetYears} Years` },
                { label: 'Inflation Rate', value: `${inflationRate}% p.a.` },
                { label: 'Expected Return', value: `${expectedReturn}% p.a.` },
            ],
            results: [
                { label: 'Monthly SIP Needed', value: `₹${Math.round(result.monthlySIP).toLocaleString('en-IN')}` },
                { label: 'Total Investment', value: `₹${Math.round(result.totalInvested).toLocaleString('en-IN')}` },
                { label: 'Returns Earned', value: `₹${Math.round(result.wealthGained).toLocaleString('en-IN')}` },
                { label: 'Future Target Cost', value: `₹${Math.round(result.targetFV).toLocaleString('en-IN')}` },
                { label: 'Real Rate of Return', value: `${(result.realRate * 100).toFixed(2)}%` },
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: 'Total Investment', value: result.totalInvested, color: '#4F46E5' },
                    { label: 'Returns Earned', value: result.wealthGained, color: '#10B981' },
                ],
            },
            projectionTitle: 'Year-wise Growth Projection',
            projectionColumns: ['Year', 'Amount Invested', 'Portfolio Value'],
            projectionRows: projection.map(p => [
                `Year ${p.year}`,
                `₹${Math.round(p.invested).toLocaleString('en-IN')}`,
                `₹${Math.round(p.value).toLocaleString('en-IN')}`,
            ]),
            filename: `FinCalix_Goal_Planner_${dateTag()}`,
        };
        await exportToPDF(config);
    };

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
                            <NumberInput label="Current Cost" value={currentCost} onChange={setCurrentCost} min={10000} max={1000000000} prefix="₹" helperText="Today's cost of the goal" />
                            <NumberInput label={t('goalPlanner.currentSaving')} value={currentSavings} onChange={setCurrentSavings} min={0} max={currentCost * 10} prefix="₹" helperText="Amount already saved" />
                            <div className="grid grid-cols-2 gap-3">
                                <NumberInput label="Target Years" value={targetYears} onChange={setTargetYears} min={1} max={40} suffix=" yrs" />
                                <NumberInput label="Inflation (p.a.)" value={inflationRate} onChange={setInflationRate} min={0} max={20} suffix="%" step={0.5} />
                            </div>
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

                            <div className="pt-4 border-t border-border/40 flex justify-between gap-4">
                                <div className="flex-1 text-center">
                                    <p className="text-muted-foreground text-xs mb-1">Current Cost</p>
                                    <p className="text-lg font-bold text-foreground">{formatINR(currentCost)}</p>
                                    <p className="text-muted-foreground text-[10px] mt-1">Real Rate {(result.realRate * 100).toFixed(1)}%</p>
                                </div>
                                <div className="flex-1 text-center border-l border-border/40 pl-4">
                                    <p className="text-muted-foreground text-xs mb-1">Target Cost ({targetYears}Y)</p>
                                    <p className="text-xl font-bold text-rose-500">{formatINR(result.targetFV)}</p>
                                    <p className="text-muted-foreground text-[10px] mt-1">{inflationRate}% Inflation</p>
                                </div>
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
                                        const progress = Math.min(100, (p.value / result.targetFV) * 100);
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

                        {/* Export PDF */}
                        <button
                            onClick={handleDownloadPDF}
                            className="w-full mt-4 flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-brand-blue/5 border border-brand-blue/20 text-brand-blue font-bold text-xs transition-colors hover:bg-brand-blue/10 active:scale-95"
                        >
                            <FileText size={20} /> Export Report
                        </button>
                    </div>
                )}

                
                <DisclaimerComponent module="goal" />
            </div>
        </div>
    );
}
