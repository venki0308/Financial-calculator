import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Info, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DisclaimerBanner from '../components/DisclaimerBanner';
import BottomSheet from '../components/BottomSheet';
import { formatINR } from '../utils/calculations';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { Save, Check, Lock } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import { AnalyticsService } from '../lib/analytics';
import { nativeShare } from '../utils/nativeShare';

export default function SalaryHikeCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('Salary_Hike'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();

    // Mode: 'findHike' = Find Hike % by entering current & new salary
    //        'findSalary' = Find New Salary by entering current salary & hike %
    const [mode, setMode] = useState<'findHike' | 'findSalary'>('findSalary');

    const [currentSalary, setCurrentSalary] = useState(1300000);
    const [newSalaryInput, setNewSalaryInput] = useState(1800000);
    const [hikePct, setHikePct] = useState(10);
    const [period, setPeriod] = useState(1);
    const [periodUnit, setPeriodUnit] = useState<'months' | 'years'>('years');
    const [showProjection, setShowProjection] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const { addHistory, addSaved, savedCalculations } = useCalculatorStore(); const [showInfo, setShowInfo] = useState(false);

    const totalMonths = periodUnit === 'years' ? period * 12 : period;

    const result = useMemo(() => {
        let computedHikePct: number;
        let computedNewSalary: number; // annual
        let hikeAmount: number; // annual

        if (mode === 'findHike') {
            // User entered current & new annual salary → compute hike %
            hikeAmount = newSalaryInput - currentSalary;
            computedHikePct = currentSalary > 0 ? (hikeAmount / currentSalary) * 100 : 0;
            computedNewSalary = newSalaryInput;
        } else {
            // User entered current annual salary & hike % → compute new annual salary
            computedHikePct = hikePct;
            hikeAmount = currentSalary * (hikePct / 100);
            computedNewSalary = currentSalary + hikeAmount;
        }

        const currentMonthly = currentSalary / 12;
        const newMonthly = computedNewSalary / 12;
        const hikeMonthly = hikeAmount / 12;

        // Build month-wise projection
        const projection: { month: number; salary: number; cumulative: number; year: number; isNewYear: boolean }[] = [];
        let cumulative = 0;
        const yearsToProject = periodUnit === 'years' ? period : Math.ceil(period / 12);
        const maxYears = Math.max(yearsToProject + 1, 2);

        for (let yr = 1; yr <= maxYears; yr++) {
            // Reset cumulative at the start of each year
            cumulative = 0;
            // For year 1 use current monthly, for subsequent years apply compounded hike
            const monthlySalary = yr === 1 ? currentMonthly : (currentSalary * Math.pow(1 + computedHikePct / 100, yr - 1)) / 12;
            for (let m = 1; m <= 12; m++) {
                cumulative += monthlySalary;
                projection.push({
                    month: (yr - 1) * 12 + m,
                    salary: Math.round(monthlySalary),
                    cumulative: Math.round(cumulative),
                    year: yr,
                    isNewYear: m === 1 && yr > 1,
                });
            }
        }

        return {
            hikeAmount,
            hikeMonthly,
            hikePctComputed: computedHikePct,
            newSalary: computedNewSalary,
            currentMonthly,
            newMonthly,
            currentAnnual: currentSalary,
            newAnnual: computedNewSalary,
            annualIncrease: hikeAmount,
            projection,
        };
    }, [currentSalary, newSalaryInput, hikePct, period, periodUnit, mode]);

    const handleDownloadPDF = async () => {
        const headers = ['Month', 'Monthly Salary', 'Cumulative Earnings'];
        const data = result.projection.map(row => [
            row.month,
            formatINR(row.salary),
            formatINR(row.cumulative)
        ]);
        await exportToPDF('Salary Hike Projection', headers, data, 'Salary_Hike_Projection');
    };

    const handleDownloadExcel = async () => {
        const headers = ['Month', 'Monthly Salary', 'Cumulative Earnings'];
        const data = result.projection.map(row => [
            row.month,
            Math.round(row.salary),
            Math.round(row.cumulative)
        ]);
        await exportToExcel(headers, data, 'Salary_Hike_Projection');
    };

    // History tracking
    useEffect(() => {
        const timer = setTimeout(() => {
            addHistory({
                id: `SalaryHike-${Date.now()}`,
                type: 'Salary Hike Calculator',
                inputs: { currentSalary, hikePct: mode === 'findHike' ? result.hikePctComputed : hikePct, period, periodUnit, mode },
                result: { primary: result.newSalary, ...result },
                timestamp: Date.now(),
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [currentSalary, hikePct, newSalaryInput, period, periodUnit, mode, result.newSalary, addHistory]);

    // Track recent
    useEffect(() => {
        try {
            const recent: string[] = JSON.parse(localStorage.getItem('recentCalculators') || '[]');
            const path = window.location.pathname;
            const updated = [path, ...recent.filter((p) => p !== path)].slice(0, 4);
            localStorage.setItem('recentCalculators', JSON.stringify(updated));
        } catch { }
    }, []);

    const handleSave = () => {
        addSaved({
            id: `SalaryHike-Save-${Date.now()}`,
            type: 'Salary Hike Calculator',
            inputs: { currentSalary, hikePct: mode === 'findHike' ? result.hikePctComputed : hikePct, period, periodUnit },
            result: { primary: result.newSalary, ...result },
            timestamp: Date.now(),
        });
        setIsSaved(true);
    };

    const isAlreadySaved = useMemo(() => {
        return savedCalculations.some(
            (s) => s.type === 'Salary Hike Calculator' && JSON.stringify(s.inputs) === JSON.stringify({ currentSalary, hikePct: mode === 'findHike' ? result.hikePctComputed : hikePct, period, periodUnit })
        );
    }, [savedCalculations, currentSalary, hikePct, period, periodUnit, mode, result.hikePctComputed]);

    return (
        <div className="min-h-dvh bg-white dark:bg-[#0F172A] animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-slate-200 dark:border-dark-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border">
                            <ArrowLeft size={18} className="text-slate-500 dark:text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Salary Hike Calculator</h1>
                            <p className="text-slate-500 text-xs">Plan your increment</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border">
                            <Info size={16} className="text-slate-400" />
                        </button>
                        <button
                            className="p-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border"
                            onClick={() => nativeShare('Salary Hike Calculator', `My salary after ${result.hikePctComputed.toFixed(1)}% hike: ${formatINR(result.newSalary)}`)}
                        >
                            <Share2 size={16} className="text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>

            <DisclaimerBanner type="calculator" />

            <div className="px-4 pb-28">
                {/* Mode Selector — matching reference design */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border mb-4 mt-2">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wider">Quarter Of Return Filing</p>
                    <div className="flex gap-3">
                        <label
                            className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all border ${mode === 'findHike' ? 'bg-brand-green/10 border-brand-green/30 dark:bg-brand-green/5' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-dark-border'}`}
                            onClick={() => setMode('findHike')}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mode === 'findHike' ? 'border-brand-green' : 'border-slate-300 dark:border-slate-600'}`}>
                                {mode === 'findHike' && <div className="w-2.5 h-2.5 rounded-full bg-brand-green" />}
                            </div>
                            <span className={`text-xs font-medium ${mode === 'findHike' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Find Hike Percentage By Salary</span>
                        </label>
                        <label
                            className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all border ${mode === 'findSalary' ? 'bg-brand-green/10 border-brand-green/30 dark:bg-brand-green/5' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-dark-border'}`}
                            onClick={() => setMode('findSalary')}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mode === 'findSalary' ? 'border-brand-green' : 'border-slate-300 dark:border-slate-600'}`}>
                                {mode === 'findSalary' && <div className="w-2.5 h-2.5 rounded-full bg-brand-green" />}
                            </div>
                            <span className={`text-xs font-medium ${mode === 'findSalary' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Find New Salary by Hike Percentage</span>
                        </label>
                    </div>
                </div>

                {/* Input Fields */}
                <div className="space-y-3 mb-5">
                    <NumberInput
                        label="Current Salary"
                        value={currentSalary}
                        onChange={setCurrentSalary}
                        min={1000}
                        max={100000000}
                        prefix="₹"
                        helperText="₹1,000 - ₹10,00,00,000"
                    />

                    {mode === 'findHike' ? (
                        <NumberInput
                            label="New Salary"
                            value={newSalaryInput}
                            onChange={setNewSalaryInput}
                            min={1000}
                            max={100000000}
                            prefix="₹"
                            helperText="₹1,000 - ₹10,00,00,000"
                        />
                    ) : (
                        <NumberInput
                            label="Expected Hike Percentage"
                            value={hikePct}
                            onChange={setHikePct}
                            min={0}
                            max={200}
                            suffix="%"
                            step={0.5}
                            helperText="0% - 200%"
                        />
                    )}

                    <div>
                        <div className="flex rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border p-1 mb-2">
                            {(['months', 'years'] as const).map((u) => (
                                <button
                                    key={u}
                                    onClick={() => {
                                        if (u === 'years' && periodUnit === 'months') setPeriod(Math.round(period / 12) || 1);
                                        if (u === 'months' && periodUnit === 'years') setPeriod(period * 12);
                                        setPeriodUnit(u);
                                    }}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize ${periodUnit === u ? 'bg-brand-green text-white' : 'text-slate-500'}`}
                                >
                                    {u}
                                </button>
                            ))}
                        </div>
                        <NumberInput
                            label="Projection Period"
                            value={period}
                            onChange={setPeriod}
                            min={periodUnit === 'months' ? 1 : 1}
                            max={periodUnit === 'months' ? 120 : 10}
                            suffix={periodUnit === 'months' ? ' months' : ' years'}
                            helperText={periodUnit === 'months' ? '1 - 120 months' : '1 - 10 years'}
                        />
                    </div>
                </div>

                {/* Result Card */}
                <motion.div layout className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border mb-4 shadow-sm">
                    <div className="text-center mb-4">
                        {mode === 'findHike' ? (
                            <>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Hike Percentage</p>
                                <motion.p
                                    key={result.hikePctComputed}
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-3xl font-bold text-brand-green"
                                >
                                    {result.hikePctComputed.toFixed(2)}%
                                </motion.p>
                                <p className="text-brand-blue text-sm font-medium mt-1">Hike Amount: {formatINR(result.hikeMonthly)}/month ({formatINR(result.hikeAmount)}/year)</p>
                            </>
                        ) : (
                            <>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Salary After Hike</p>
                                <motion.p
                                    key={result.newSalary}
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-3xl font-bold text-brand-green"
                                >
                                    {formatINR(result.newSalary)}
                                </motion.p>
                                <p className="text-brand-blue text-sm font-medium mt-1">Annual Increase: {formatINR(result.annualIncrease)}</p>
                            </>
                        )}
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-dark-border">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">Current Annual Salary</span>
                            <span className="font-semibold text-sm text-slate-900 dark:text-white">{formatINR(result.currentAnnual)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">Current Monthly Salary</span>
                            <span className="font-semibold text-sm text-slate-600 dark:text-slate-300">{formatINR(result.currentMonthly)}</span>
                        </div>
                        {mode === 'findHike' && (
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 text-xs">New Annual Salary</span>
                                <span className="font-semibold text-sm text-brand-blue">{formatINR(newSalaryInput)}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">Hike Percentage</span>
                            <span className="font-semibold text-sm text-brand-green">{result.hikePctComputed.toFixed(2)}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">Hike Amount (Annual)</span>
                            <span className="font-semibold text-sm text-brand-green">{formatINR(result.hikeAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">Hike Amount (Monthly)</span>
                            <span className="font-semibold text-sm text-brand-green">{formatINR(result.hikeMonthly)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">New Annual Salary</span>
                            <span className="font-semibold text-sm text-brand-blue">{formatINR(result.newAnnual)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">New Monthly Salary</span>
                            <span className="font-semibold text-sm text-brand-blue">{formatINR(result.newMonthly)}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowProjection(true)}
                    className="w-full py-3.5 rounded-2xl border border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300 font-semibold text-sm mb-3 active:bg-slate-50 dark:active:bg-dark-card transition-colors"
                >
                    📊 View Monthly Projection
                </motion.button>

                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    disabled={isSaved || isAlreadySaved}
                    className={`w-full py-3.5 rounded-2xl font-semibold text-sm mb-3 flex items-center justify-center gap-2 transition-all ${isSaved || isAlreadySaved ? 'bg-brand-green/10 text-brand-green border border-brand-green/20' : 'bg-brand-green text-white'}`}
                >
                    {isSaved || isAlreadySaved ? <><Check size={18} /> Saved</> : <><Save size={18} /> Save Calculation</>}
                </motion.button>

                {/* Disclaimer */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-brand-blue/5 border border-blue-100 dark:border-brand-blue/15">
                    <p className="text-slate-500 dark:text-slate-500 text-[10px] leading-relaxed italic">
                        📐 This is a projection only. Actual hikes depend on company performance, individual performance, and market conditions. For reference purposes only.
                    </p>
                </div>

                {/* Monthly Projection Bottom Sheet */}
                <BottomSheet isOpen={showProjection} onClose={() => setShowProjection(false)} title="Month-wise Salary Projection">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-slate-500 border-b border-slate-200 dark:border-dark-border">
                                    <th className="py-2 text-left font-medium">Month</th>
                                    <th className="py-2 text-right font-medium">Salary</th>
                                    <th className="py-2 text-right font-medium">Cumulative</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.projection.map((row) => (
                                    <>
                                        {row.isNewYear && (
                                            <tr key={`year-${row.year}`}>
                                                <td colSpan={3} className="py-2.5 text-center">
                                                    <span className="px-3 py-1 rounded-lg bg-brand-green/10 text-brand-green text-[10px] font-bold uppercase tracking-wider">
                                                        Year {row.year} — After {result.hikePctComputed.toFixed(1)}% Hike
                                                    </span>
                                                </td>
                                            </tr>
                                        )}
                                        <tr key={row.month} className="border-b border-slate-100 dark:border-dark-border/50">
                                            <td className="py-2 text-slate-700 dark:text-slate-300">{row.month}</td>
                                            <td className="py-2 text-right text-brand-green">{formatINR(row.salary)}</td>
                                            <td className="py-2 text-right text-slate-900 dark:text-white">{formatINR(row.cumulative)}</td>
                                        </tr>
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Download buttons */}
                    <div className="flex gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-dark-border mb-6">
                        <button
                            onClick={handleDownloadPDF}
                            className="flex-1 py-4 rounded-2xl bg-brand-purple/10 border-2 border-brand-purple/40 text-brand-purple font-bold text-sm flex items-center justify-center gap-2"
                        >
                            📄 PDF report
                        </button>
                        <button
                            onClick={handleDownloadExcel}
                            className="flex-1 py-4 rounded-2xl bg-brand-green/10 border-2 border-brand-green/40 text-brand-green font-bold text-sm flex items-center justify-center gap-2"
                        >
                            📊 Excel report
                        </button>
                    </div>
                </BottomSheet>


                <CalculatorInfoModal
                    isOpen={showInfo}
                    onClose={() => setShowInfo(false)}
                    calculatorTitle="Salary Hike Calculator"
                />
            </div>
        </div>
    );
}