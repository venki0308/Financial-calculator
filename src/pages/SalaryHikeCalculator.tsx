import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DisclaimerBanner from '../components/DisclaimerBanner';
import AuthorizationTable from '../components/AuthorizationTable';
import BottomSheet from '../components/BottomSheet';
import { formatINR } from '../utils/calculations';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { Save, Check, Lock } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import PremiumModal from '../components/PremiumModal';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';

export default function SalaryHikeCalculator() {
    const navigate = useNavigate();
    const [currentSalary, setCurrentSalary] = useState(50000);
    const [hikePct, setHikePct] = useState(10);
    const [period, setPeriod] = useState(1);
    const [periodUnit, setPeriodUnit] = useState<'months' | 'years'>('years');
    const [showProjection, setShowProjection] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const { addHistory, addSaved, savedCalculations } = useCalculatorStore();
    const hasPremium = useAuthStore((s) => s.hasPremium);
    const isAdmin = useAuthStore((s) => s.isAdmin());
    const canAccessAll = hasPremium || isAdmin;
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    const totalMonths = periodUnit === 'years' ? period * 12 : period;

    const result = useMemo(() => {
        const hikeAmount = currentSalary * (hikePct / 100);
        const newSalary = currentSalary + hikeAmount;
        const currentAnnual = currentSalary * 12;
        const newAnnual = newSalary * 12;
        const annualIncrease = hikeAmount * 12;

        // Build month-wise projection
        const projection: { month: number; salary: number; cumulative: number; year: number; isNewYear: boolean }[] = [];
        let cumulative = 0;
        const yearsToProject = periodUnit === 'years' ? period : Math.ceil(period / 12);
        const maxYears = Math.max(yearsToProject + 1, 2); // Show at least 2 years

        for (let yr = 1; yr <= maxYears; yr++) {
            const monthlySalary = yr === 1 ? currentSalary : currentSalary * Math.pow(1 + hikePct / 100, yr - 1);
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
            newSalary,
            currentAnnual,
            newAnnual,
            annualIncrease,
            projection,
        };
    }, [currentSalary, hikePct, period, periodUnit]);

    const handleDownloadPDF = () => {
        if (!canAccessAll) {
            setShowPremiumModal(true);
            return;
        }
        const headers = ['Month', 'Monthly Salary', 'Cumulative Earnings'];
        const data = result.projection.map(row => [
            row.month,
            formatINR(row.salary),
            formatINR(row.cumulative)
        ]);
        exportToPDF('Salary Hike Projection', headers, data, 'Salary_Hike_Projection');
    };

    const handleDownloadExcel = () => {
        if (!canAccessAll) {
            setShowPremiumModal(true);
            return;
        }
        const headers = ['Month', 'Monthly Salary', 'Cumulative Earnings'];
        const data = result.projection.map(row => [
            row.month,
            Math.round(row.salary),
            Math.round(row.cumulative)
        ]);
        exportToExcel(headers, data, 'Salary_Hike_Projection');
    };

    // History tracking
    useEffect(() => {
        const timer = setTimeout(() => {
            addHistory({
                id: `SalaryHike-${Date.now()}`,
                type: 'Salary Hike Calculator',
                inputs: { currentSalary, hikePct, period, periodUnit },
                result: { primary: result.newSalary, ...result },
                timestamp: Date.now(),
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [currentSalary, hikePct, period, periodUnit, result.newSalary, addHistory]);

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
            inputs: { currentSalary, hikePct, period, periodUnit },
            result: { primary: result.newSalary, ...result },
            timestamp: Date.now(),
        });
        setIsSaved(true);
    };

    const isAlreadySaved = useMemo(() => {
        return savedCalculations.some(
            (s) => s.type === 'Salary Hike Calculator' && JSON.stringify(s.inputs) === JSON.stringify({ currentSalary, hikePct, period, periodUnit })
        );
    }, [savedCalculations, currentSalary, hikePct, period, periodUnit]);

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                            <ArrowLeft size={18} className="text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-white">Salary Hike Calculator</h1>
                            <p className="text-slate-500 text-xs">Plan your increment</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 rounded-xl bg-dark-card border border-dark-border">
                            <Info size={16} className="text-slate-400" />
                        </button>
                        <button
                            className="p-2 rounded-xl bg-dark-card border border-dark-border"
                            onClick={() => {
                                if (navigator.share) {
                                    navigator.share({ title: 'Salary Hike Calculator', text: `My salary after ${hikePct}% hike: ${formatINR(result.newSalary)}`, url: window.location.href });
                                }
                            }}
                        >
                            <Share2 size={16} className="text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>

            <DisclaimerBanner type="calculator" />

            <div className="px-4 pb-28">
                {/* Input Fields */}
                <div className="space-y-3 mb-5 mt-2">
                    <NumberInput
                        label="Current Salary (Monthly)"
                        value={currentSalary}
                        onChange={setCurrentSalary}
                        min={10000}
                        max={500000}
                        prefix="₹"
                        helperText="₹10,000 - ₹5,00,000"
                    />
                    <NumberInput
                        label="Expected Hike Percentage"
                        value={hikePct}
                        onChange={setHikePct}
                        min={0}
                        max={100}
                        suffix="%"
                        step={0.5}
                        helperText="0% - 100%"
                    />
                    <div>
                        <div className="flex rounded-xl bg-dark-card border border-dark-border p-1 mb-2">
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
                <motion.div layout className="p-5 rounded-2xl bg-dark-card border border-dark-border mb-4">
                    <div className="text-center mb-4">
                        <p className="text-slate-400 text-sm mb-1">Salary After Hike</p>
                        <motion.p
                            key={result.newSalary}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-3xl font-bold text-brand-green"
                        >
                            {formatINR(result.newSalary)}
                        </motion.p>
                        <p className="text-brand-blue text-sm font-medium mt-1">Annual Increase: {formatINR(result.annualIncrease)}</p>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-2.5 pt-3 border-t border-dark-border">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">Current Monthly Salary</span>
                            <span className="font-semibold text-sm text-white">{formatINR(currentSalary)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">Hike Amount (Monthly)</span>
                            <span className="font-semibold text-sm text-brand-green">{formatINR(result.hikeAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">Current Annual Salary</span>
                            <span className="font-semibold text-sm text-white">{formatINR(result.currentAnnual)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">New Annual Salary</span>
                            <span className="font-semibold text-sm text-brand-blue">{formatINR(result.newAnnual)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">Total Increase</span>
                            <span className="font-semibold text-sm text-brand-green">{formatINR(result.annualIncrease)}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowProjection(true)}
                    className="w-full py-3.5 rounded-2xl border border-dark-border text-slate-300 font-semibold text-sm mb-3 active:bg-dark-card transition-colors"
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
                <div className="flex items-start gap-2 p-3 rounded-xl bg-brand-blue/5 border border-brand-blue/15">
                    <p className="text-slate-500 text-[10px] leading-relaxed italic">
                        📐 This is a projection only. Actual hikes depend on company performance, individual performance, and market conditions. For reference purposes only.
                    </p>
                </div>

                {/* Monthly Projection Bottom Sheet */}
                <BottomSheet isOpen={showProjection} onClose={() => setShowProjection(false)} title="Month-wise Salary Projection">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-slate-500 border-b border-dark-border">
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
                                                        Year {row.year} — After {hikePct}% Hike
                                                    </span>
                                                </td>
                                            </tr>
                                        )}
                                        <tr key={row.month} className="border-b border-dark-border/50">
                                            <td className="py-2 text-slate-300">{row.month}</td>
                                            <td className="py-2 text-right text-brand-green">{formatINR(row.salary)}</td>
                                            <td className="py-2 text-right text-white">{formatINR(row.cumulative)}</td>
                                        </tr>
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Download buttons */}
                    <div className="flex gap-3 mt-4 pt-4 border-t border-dark-border">
                        <button
                            onClick={handleDownloadPDF}
                            className="flex-1 py-3 rounded-2xl bg-dark-card border border-dark-border text-slate-400 font-medium text-xs flex items-center justify-center gap-2"
                        >
                            📄 Download PDF {!canAccessAll && <span className="text-brand-gold text-[10px]">Premium</span>}
                        </button>
                        <button
                            onClick={handleDownloadExcel}
                            className="flex-1 py-3 rounded-2xl bg-dark-card border border-dark-border text-slate-400 font-medium text-xs flex items-center justify-center gap-2"
                        >
                            📊 Download Excel {!canAccessAll && <span className="text-brand-gold text-[10px]">Premium</span>}
                        </button>
                    </div>
                </BottomSheet>

                <AuthorizationTable />

                <PremiumModal
                    isOpen={showPremiumModal}
                    onClose={() => setShowPremiumModal(false)}
                    onPurchase={() => { setShowPremiumModal(false); alert('Razorpay integration required. Contact support.'); }}
                />
            </div>
        </div>
    );
}
