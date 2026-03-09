import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Info, Share2, ChevronDown, ChevronUp, Save, Check, Download } from 'lucide-react';
import { nativeShare } from '../utils/nativeShare';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import NumberInput from '../components/NumberInput';
import DisclaimerBanner from '../components/DisclaimerBanner';
import BottomSheet from '../components/BottomSheet';
import { calculateReducingEMI, calculateFlatEMI, formatINR } from '../utils/calculations';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useAuthStore } from '../store/useAuthStore';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import { AnalyticsService } from '../lib/analytics';
import SmartInsight from '../components/SmartInsight';
import ShareableCard from '../components/ShareableCard';
import WhatIfSimulator from '../components/WhatIfSimulator';

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title
);

const loanTypes = ['Home Loan', 'Personal Loan', 'Car Loan', 'Education Loan'];

export default function EMICalculator() {
    useEffect(() => { AnalyticsService.trackScreen('EMI_Calculator'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const [loanType, setLoanType] = useState('Home Loan');
    const [method, setMethod] = useState<'reducing' | 'flat'>('reducing');
    const [principal, setPrincipal] = useState(1000000);
    const [rate, setRate] = useState(8.5);
    const [tenure, setTenure] = useState(60);
    const [tenureUnit, setTenureUnit] = useState<'months' | 'years'>('months');
    const [showAmortization, setShowAmortization] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const { addHistory, addSaved, savedCalculations } = useCalculatorStore();
    const [showInfo, setShowInfo] = useState(false);
    const [prepayAmount, setPrepayAmount] = useState(0);
    const [prepayMonth, setPrepayMonth] = useState(12);

    const months = tenureUnit === 'years' ? tenure * 12 : tenure;

    // Prepayment calculation
    const prepayResult = useMemo(() => {
        if (prepayAmount <= 0 || method !== 'reducing') return null;
        const r = rate / 12 / 100;
        const n = months;
        const emi = r === 0 ? principal / n : principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
        // Simulate without prepayment
        const totalWithout = emi * n;
        // Simulate with prepayment at prepayMonth
        let balance = principal;
        let totalPaid = 0;
        let month = 0;
        while (balance > 0 && month < n * 2) {
            month++;
            const intPart = balance * r;
            const prinPart = Math.min(emi - intPart, balance);
            balance -= prinPart;
            totalPaid += emi;
            if (month === prepayMonth && balance > prepayAmount) {
                balance -= prepayAmount;
                totalPaid += prepayAmount;
            }
            if (balance <= 0) break;
        }
        const interestSaved = totalWithout - totalPaid;
        const monthsSaved = n - month;
        return { interestSaved: Math.max(0, interestSaved), monthsSaved: Math.max(0, monthsSaved), newTenure: month };
    }, [prepayAmount, prepayMonth, principal, rate, months, method]);

    const chartRef = useRef<any>(null);

    const result = useMemo(() => {
        if (method === 'reducing') return calculateReducingEMI(principal, rate, months);
        const r = calculateFlatEMI(principal, rate, months);
        return { ...r, schedule: [] };
    }, [principal, rate, months, method]);

    const chartData = {
        labels: ['Principal', 'Interest'],
        datasets: [{
            data: [principal, result.totalInterest],
            backgroundColor: ['#10B981', '#F59E0B'],
            borderColor: ['#10B98140', '#F59E0B40'],
            borderWidth: 1,
        }]
    };

    // History Tracking
    useEffect(() => {
        const timer = setTimeout(() => {
            addHistory({
                id: `EMI-${Date.now()}`,
                calculatorType: 'Loan EMI Calculator',
                inputValues: { principal, rate, months, method },
                resultValues: { primary: result.emi, ...result },
                timestamp: Date.now()
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [principal, rate, months, method, result.emi, addHistory]);

    const handleSave = () => {
        addSaved({
            id: `EMI-Save-${Date.now()}`,
            calculatorType: 'Loan EMI Calculator',
            inputValues: { principal, rate, months, method },
            resultValues: { primary: result.emi, ...result },
            timestamp: Date.now()
        });
        setIsSaved(true);
    };

    const isAlreadySaved = useMemo(() => {
        return savedCalculations.some(s => s.calculatorType === 'Loan EMI Calculator' && JSON.stringify(s.inputValues) === JSON.stringify({ principal, rate, months, method }));
    }, [savedCalculations, principal, rate, months, method]);

    const handleDownloadPDF = async () => {
        let chartImage = undefined;
        if (chartRef.current) {
            chartImage = chartRef.current.toBase64Image();
        }
        const headers = ['Month', 'Principal Repayment', 'Interest Repayment', 'Balance'];
        const data = (result.schedule || []).map(row => [
            row.month.toString(),
            formatINR(row.principal),
            formatINR(row.interest),
            formatINR(row.balance)
        ]);
        const chartSummary = [
            { label: 'Principal', value: formatINR(principal), color: [16, 185, 129] as [number, number, number] },
            { label: 'Interest', value: formatINR(result.totalInterest), color: [245, 158, 11] as [number, number, number] },
            { label: 'Total Payment', value: formatINR(result.totalPayment), color: [79, 70, 229] as [number, number, number] },
        ];
        await exportToPDF('EMI Payment Schedule', headers, data, 'EMI_Schedule', chartImage, chartSummary);
    };

    const handleDownloadExcel = async () => {
        const headers = ['Month', 'Principal Repayment', 'Interest Repayment', 'Balance'];
        const data = (result.schedule || []).map(row => [
            row.month,
            Math.round(row.principal),
            Math.round(row.interest),
            Math.round(row.balance)
        ]);
        await exportToExcel(headers, data, 'EMI_Schedule');
    };

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
                            <h1 className="text-lg font-bold text-white">EMI Calculator</h1>
                            <p className="text-slate-500 text-xs">Calculate your monthly EMI</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                            <Info size={16} className="text-slate-400" />
                        </button>
                        <button
                            className="p-2 rounded-xl bg-dark-card border border-dark-border"
                            onClick={() => nativeShare('EMI Calculator', 'Calculate your EMI with FinCalix!', window.location.href)}
                        >
                            <Share2 size={16} className="text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>

            <DisclaimerBanner type="calculator" />

            <div className="px-4 pb-28">
                {/* Loan Type Pills */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar py-3">
                    {loanTypes.map((t) => (
                        <button
                            key={t}
                            onClick={() => setLoanType(t)}
                            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${loanType === t ? 'bg-brand-green text-white' : 'bg-dark-card border border-dark-border text-slate-400'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* EMI Type Toggle */}
                <div className="flex rounded-2xl bg-dark-card border border-dark-border p-1 mb-5">
                    {(['reducing', 'flat'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMethod(m)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${method === m ? 'bg-brand-green text-white' : 'text-slate-500'
                                }`}
                        >
                            {m === 'reducing' ? 'Reducing Balance' : 'Flat Rate'}
                        </button>
                    ))}
                </div>

                {/* Input Fields */}
                <div className="space-y-3 mb-5">
                    <NumberInput
                        label="Loan Amount"
                        value={principal}
                        onChange={setPrincipal}
                        min={100000}
                        max={50000000}
                        prefix="₹"
                        helperText="₹1,00,000 - ₹5,00,00,000"
                    />
                    <NumberInput
                        label="Interest Rate (p.a.)"
                        value={rate}
                        onChange={setRate}
                        min={1}
                        max={30}
                        suffix="%"
                        step={0.05}
                        helperText="1% - 30%"
                    />
                    <div>
                        <div className="flex rounded-xl bg-dark-card border border-dark-border p-1 mb-2">
                            {(['months', 'years'] as const).map((u) => (
                                <button
                                    key={u}
                                    onClick={() => {
                                        if (u === 'years' && tenureUnit === 'months') setTenure(Math.round(tenure / 12) || 1);
                                        if (u === 'months' && tenureUnit === 'years') setTenure(tenure * 12);
                                        setTenureUnit(u);
                                    }}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize ${tenureUnit === u ? 'bg-brand-green text-white' : 'text-slate-500'
                                        }`}
                                >
                                    {u}
                                </button>
                            ))}
                        </div>
                        <NumberInput
                            label="Loan Tenure"
                            value={tenure}
                            onChange={setTenure}
                            min={tenureUnit === 'months' ? 1 : 1}
                            max={tenureUnit === 'months' ? 360 : 30}
                            suffix={tenureUnit === 'months' ? ' months' : ' years'}
                            helperText={tenureUnit === 'months' ? '1 - 360 months' : '1 - 30 years'}
                        />
                    </div>
                </div>

                {/* Result Card */}
                <motion.div
                    layout
                    className="p-5 rounded-2xl bg-dark-card border border-dark-border mb-4"
                >
                    <div className="text-center mb-6">
                        <p className="text-slate-400 text-sm mb-1">Monthly EMI</p>
                        <motion.p
                            key={result.emi}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-3xl font-bold text-brand-green"
                        >
                            {formatINR(result.emi)}
                        </motion.p>
                    </div>

                    {/* Chart Visualization */}
                    <div className="h-44 mb-8 flex justify-center">
                        <Pie
                            ref={chartRef}
                            data={chartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                    tooltip: { enabled: true }
                                }
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="text-center p-3 rounded-xl bg-slate-800/20">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-brand-green" />
                                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Principal</span>
                            </div>
                            <p className="text-white font-bold text-sm">{formatINR(principal)}</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-slate-800/20">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-brand-gold" />
                                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Interest</span>
                            </div>
                            <p className="text-white font-bold text-sm">{formatINR(result.totalInterest)}</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-dark-border/40 text-center">
                        <p className="text-slate-500 text-xs mb-1">Total Payment</p>
                        <p className="text-xl font-bold text-white">{formatINR(result.totalPayment)}</p>
                    </div>
                </motion.div>

                <SmartInsight
                    calculatorType="emi"
                    inputs={{ principal, rate, months }}
                    results={{ emi: result.emi, totalInterest: result.totalInterest, totalPayment: result.totalPayment }}
                />

                {/* Prepayment Simulation */}
                {method === 'reducing' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3">
                        <h3 className="text-white font-bold text-sm flex items-center gap-2">💰 Prepayment Simulator</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <NumberInput label="Lump-sum Amount" value={prepayAmount} onChange={setPrepayAmount} prefix="₹" min={0} max={principal} />
                            <NumberInput label="At Month" value={prepayMonth} onChange={setPrepayMonth} min={1} max={months} />
                        </div>
                        {prepayResult && (
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                {[
                                    { label: 'Interest Saved', value: formatINR(prepayResult.interestSaved), color: 'text-brand-green' },
                                    { label: 'Months Saved', value: `${prepayResult.monthsSaved}`, color: 'text-brand-gold' },
                                    { label: 'New Tenure', value: `${prepayResult.newTenure} mo`, color: 'text-blue-400' },
                                ].map(s => (
                                    <div key={s.label} className="text-center p-2 rounded-xl bg-slate-800/30">
                                        <p className="text-slate-500 text-[9px] uppercase font-bold">{s.label}</p>
                                        <p className={`font-bold text-xs mt-1 ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}


                {/* What-If Simulator */}
                <WhatIfSimulator
                    sliders={[
                        { key: 'principal', label: 'Loan Amount', min: 100000, max: 20000000, step: 100000, prefix: '₹' },
                        { key: 'rate', label: 'Interest Rate', min: 5, max: 18, step: 0.25, suffix: '%' },
                    ]}
                    currentInputs={{ principal, rate, months }}
                    calculateResult={(inputs) => {
                        const r = inputs.rate / 12 / 100;
                        const n = inputs.months;
                        return r === 0 ? Math.round(inputs.principal / n) : Math.round(inputs.principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
                    }}
                    resultLabel="Monthly EMI"
                />

                {/* Action Buttons */}
                <div className="space-y-3 mb-6">
                    {method === 'reducing' && (
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setShowAmortization(true)}
                            className="w-full py-4 rounded-2xl border border-dark-border text-slate-300 font-bold text-sm bg-dark-card/50"
                        >
                            View Amortization Table
                        </motion.button>
                    )}
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSave}
                        disabled={isSaved || isAlreadySaved}
                        className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isSaved || isAlreadySaved
                            ? 'bg-brand-green/10 text-brand-green border border-brand-green/20'
                            : 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                            }`}
                    >
                        {isSaved || isAlreadySaved ? <><Check size={18} /> Saved</> : <><Save size={18} /> Save Calculation</>}
                    </motion.button>
                </div>

                {/* Amortization Bottom Sheet */}
                <BottomSheet isOpen={showAmortization} onClose={() => setShowAmortization(false)} title="Payment Schedule">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-slate-500 border-b border-dark-border">
                                    <th className="py-2 text-left font-medium">Month</th>
                                    <th className="py-2 text-right font-medium">Principal</th>
                                    <th className="py-2 text-right font-medium">Interest</th>
                                    <th className="py-2 text-right font-medium">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(result.schedule || []).slice(0, 60).map((row) => (
                                    <tr key={row.month} className="border-b border-dark-border/50">
                                        <td className="py-2 text-slate-300">{row.month}</td>
                                        <td className="py-2 text-right text-brand-green">{formatINR(row.principal)}</td>
                                        <td className="py-2 text-right text-brand-gold">{formatINR(row.interest)}</td>
                                        <td className="py-2 text-right text-white">{formatINR(row.balance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Download buttons */}
                    <div className="flex gap-3 mt-4 pt-4 border-t border-dark-border mb-2">
                        <button
                            onClick={handleDownloadPDF}
                            className="flex-1 py-4 rounded-2xl bg-brand-purple/10 border border-brand-purple/30 text-brand-purple font-bold text-sm flex items-center justify-center gap-2"
                        >
                            📄 Download PDF
                        </button>
                        <button
                            onClick={handleDownloadExcel}
                            className="flex-1 py-4 rounded-2xl bg-brand-green/10 border border-brand-green/30 text-brand-green font-bold text-sm flex items-center justify-center gap-2"
                        >
                            📊 Download Excel
                        </button>
                    </div>
                </BottomSheet>

                {/* Shareable Result Card */}
                <ShareableCard
                    title={`My ${loanType} EMI`}
                    highlight={formatINR(result.emi)}
                    subtitle={`${loanType} @ ${rate}% for ${tenureUnit === 'years' ? tenure + ' years' : months + ' months'}`}
                    details={[
                        { label: 'Loan Amount', value: formatINR(principal) },
                        { label: 'Total Interest', value: formatINR(result.totalInterest) },
                        { label: 'Total Payment', value: formatINR(result.totalPayment) },
                        { label: 'Interest Rate', value: `${rate}% p.a.` },
                    ]}
                    gradient="from-violet-600 via-purple-500 to-indigo-600"
                />

                <CalculatorInfoModal
                    isOpen={showInfo}
                    onClose={() => setShowInfo(false)}
                    calculatorTitle="EMI Calculator"
                />
            </div>
        </div>
    );
}