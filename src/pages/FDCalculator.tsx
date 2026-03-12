import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Info, Save, Check, Download, Share2, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { nativeShare } from '../utils/nativeShare';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import SmartInsight from '../components/SmartInsight';
import ShareableCard from '../components/ShareableCard';
import WhatIfSimulator from '../components/WhatIfSimulator';
import { calculateFD, formatINR } from '../utils/calculations';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import { AnalyticsService } from '../lib/analytics';
import { triggerCalcNotification } from '../services/calcNotifications';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

export default function FDCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('FD_Calculator'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const { addSaved, savedCalculations } = useCalculatorStore();
    const [principal, setPrincipal] = useState(100000);
    const [rate, setRate] = useState(7);
    const [years, setYears] = useState(5);
    const [compounding, setCompounding] = useState<number>(4);
    const [saved, setSaved] = useState(false);
    const [showCompare, setShowCompare] = useState(false);
    const [showGrowth, setShowGrowth] = useState(false);
    const chartRef = useRef<any>(null);

    const result = useMemo(() => calculateFD(principal, rate, years, compounding), [principal, rate, years, compounding]);

    // ─── Notification trigger ────────────────────────────────────────────
    useEffect(() => {
        if (!result.amount) return;
        const t = setTimeout(() => {
            triggerCalcNotification('fd', `Maturity ₹${Math.round(result.amount).toLocaleString('en-IN')}`);
        }, 2000);
        return () => clearTimeout(t);
    }, [result.amount]);

    // Compounding comparison
    const compoundingComparison = useMemo(() => {
        const freqs = [
            { label: 'Yearly', freq: 1 },
            { label: 'Quarterly', freq: 4 },
            { label: 'Monthly', freq: 12 },
            { label: 'Daily', freq: 365 },
        ];
        return freqs.map(f => {
            const mat = principal * Math.pow(1 + rate / (100 * f.freq), years * f.freq);
            return { ...f, maturity: Math.round(mat), interest: Math.round(mat - principal) };
        });
    }, [principal, rate, years]);

    // Year-wise growth
    const yearWise = useMemo(() => {
        const data = [];
        for (let y = 1; y <= years; y++) {
            const mat = principal * Math.pow(1 + rate / (100 * compounding), y * compounding);
            data.push({ year: y, value: Math.round(mat), interest: Math.round(mat - principal) });
        }
        return data;
    }, [principal, rate, years, compounding]);

    // Inflation-adjusted return
    const inflationAdj = useMemo(() => {
        const inflation = 6; // assumed average Indian inflation
        const nominalReturn = ((result.amount / principal) - 1) * 100;
        const realReturn = nominalReturn - (inflation * years);
        const realValue = result.amount / Math.pow(1 + inflation / 100, years);
        return { inflation, nominalReturn: nominalReturn.toFixed(1), realReturn: realReturn.toFixed(1), realValue: Math.round(realValue) };
    }, [result, principal, years]);

    const chartData = {
        labels: ['Invested', 'Interest Earned'],
        datasets: [{ data: [principal, result.interest], backgroundColor: ['#4F46E5', '#10B981'], borderColor: ['#1E293B', '#1E293B'], borderWidth: 2 }]
    };

    const growthBarData = useMemo(() => ({
        labels: yearWise.map(y => `Yr ${y.year}`),
        datasets: [
            { label: 'Principal', data: yearWise.map(() => principal), backgroundColor: '#3B82F6' },
            { label: 'Interest', data: yearWise.map(y => y.interest), backgroundColor: '#10B981' },
        ]
    }), [yearWise, principal]);

    const handleSave = () => {
        addSaved({ id: `FD-${Date.now()}`, calculatorType: 'FD Calculator', inputValues: { principal, rate, years, compounding }, resultValues: { primary: result.amount, ...result }, timestamp: Date.now() });
        setSaved(true);
    };

    const isAlreadySaved = useMemo(() => {
        return savedCalculations.some(s => s.calculatorType === 'FD Calculator' && JSON.stringify(s.inputValues) === JSON.stringify({ principal, rate, years, compounding }));
    }, [savedCalculations, principal, rate, years, compounding]);

    const handleDownloadPDF = async () => {
        let chartImage: string | undefined = undefined;
        if (chartRef.current) {
            await new Promise(r => setTimeout(r, 100));
            try { chartImage = chartRef.current.toBase64Image('image/png', 1.0); } catch { }
        }
        exportToPDF('FD Maturity Report', ['Metric', 'Value'], [
            ['Deposit Amount', formatINR(principal)], ['Interest Rate', `${rate}%`], ['Tenure', `${years} years`],
            ['Compounding', compounding === 4 ? 'Quarterly' : compounding === 12 ? 'Monthly' : compounding === 1 ? 'Yearly' : 'Daily'],
            ['---', '---'], ['Total Invested', formatINR(principal)], ['Interest Earned', formatINR(result.interest)], ['Maturity Amount', formatINR(result.amount)],
            ['---', '---'], ['Inflation-adjusted Value', formatINR(inflationAdj.realValue)], ['Real Return', `${inflationAdj.realReturn}%`],
        ], 'FD_Report', chartImage, [
            { label: 'Invested', value: formatINR(principal), color: [79, 70, 229] as [number, number, number] },
            { label: 'Interest', value: formatINR(result.interest), color: [16, 185, 129] as [number, number, number] },
            { label: 'Maturity', value: formatINR(result.amount), color: [245, 158, 11] as [number, number, number] },
        ]);
    };

    const handleDownloadExcel = () => {
        exportToExcel(['Metric', 'Value'], [
            ['Deposit Amount', principal], ['Interest Rate', rate], ['Tenure', years], ['Compounding', compounding],
            ['Interest Earned', result.interest], ['Maturity Amount', result.amount],
            ['Inflation-adj Value', inflationAdj.realValue],
        ], 'FD_Report');
    };

    const handleShare = async () => {
        const text = `🏦 My FD Investment\n\n💰 Deposit: ${formatINR(principal)}\n📈 Rate: ${rate}%\n📅 Tenure: ${years} years\n\n✅ Maturity: ${formatINR(result.amount)}\n💵 Interest: ${formatINR(result.interest)}\n📉 After inflation: ${formatINR(inflationAdj.realValue)}\n\nCalculated with FinCalix 🧮`;
        await nativeShare('FD Calculation – FinCalix', text);
    };

    return (
        <div className="min-h-dvh bg-background animate-fade-in">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border"><ArrowLeft size={18} className="text-muted-foreground" /></button>
                    <div><h1 className="text-lg font-bold text-foreground">FD Calculator</h1><p className="text-muted-foreground text-xs">Fixed Deposit returns</p></div>
                </div>
            </div>

            <DisclaimerComponent module="investment" />

            <div className="px-4 pb-28 pt-4 space-y-5">
                {/* Compounding Tabs */}
                <div className="flex rounded-2xl bg-card border border-border p-1">
                    {([{ label: 'Quarterly', val: 4 }, { label: 'Monthly', val: 12 }, { label: 'Yearly', val: 1 }] as const).map((opt) => (
                        <button key={opt.val} onClick={() => setCompounding(opt.val)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${compounding === opt.val ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-muted-foreground'}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-3">
                    <NumberInput label="Deposit Amount" value={principal} onChange={setPrincipal} min={1000} max={10000000} prefix="₹" />
                    <NumberInput label="Interest Rate (p.a.)" value={rate} onChange={setRate} min={1} max={15} suffix="%" step={0.1} />
                    <NumberInput label="Tenure (years)" value={years} onChange={setYears} min={1} max={20} suffix=" years" />
                </div>

                {/* Result Card */}
                <motion.div layout className="p-5 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/20">
                    <p className="text-purple-300/60 text-[10px] font-bold uppercase tracking-wider mb-1">Maturity Amount</p>
                    <motion.p key={result.amount} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-black text-foreground mb-4">
                        {formatINR(result.amount)}
                    </motion.p>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-2.5 rounded-xl bg-slate-800/50 text-center">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Invested</p>
                            <p className="text-foreground font-bold text-sm">{formatINR(principal)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-800/50 text-center">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Interest</p>
                            <p className="text-brand-green font-bold text-sm">{formatINR(result.interest)}</p>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="h-44 mb-4 flex justify-center">
                        <Pie ref={chartRef} data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                    </div>

                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saved || isAlreadySaved}
                        className={`w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${saved || isAlreadySaved ? 'bg-brand-green/10 text-brand-green border border-brand-green/20' : 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'}`}>
                        {saved || isAlreadySaved ? <><Check size={18} /> Saved</> : <><Save size={18} /> Save Calculation</>}
                    </motion.button>
                </motion.div>

                {/* Inflation-adjusted Insight */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-start gap-3">
                        <TrendingUp size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-foreground font-bold text-xs">Inflation-Adjusted Return</h3>
                            <p className="text-muted-foreground text-[11px] mt-1">After accounting for ~{inflationAdj.inflation}% inflation:</p>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div><p className="text-muted-foreground text-[9px] uppercase font-bold">Nominal Return</p><p className="text-foreground font-bold text-xs">{inflationAdj.nominalReturn}%</p></div>
                                <div><p className="text-muted-foreground text-[9px] uppercase font-bold">Real Return</p><p className={`font-bold text-xs ${Number(inflationAdj.realReturn) > 0 ? 'text-brand-green' : 'text-red-400'}`}>{inflationAdj.realReturn}%</p></div>
                                <div className="col-span-2"><p className="text-muted-foreground text-[9px] uppercase font-bold">Real Value (Today's ₹)</p><p className="text-amber-400 font-bold text-sm">{formatINR(inflationAdj.realValue)}</p></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compounding Comparison */}
                <button onClick={() => setShowCompare(!showCompare)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm">
                    <span className="flex items-center gap-2"><Info size={16} className="text-muted-foreground" /> Compounding Comparison</span>
                    {showCompare ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                    {showCompare && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="rounded-2xl bg-card border border-border overflow-hidden">
                                <div className="grid grid-cols-3 text-[9px] font-bold text-muted-foreground uppercase p-2 bg-slate-800/50"><span>Frequency</span><span>Interest</span><span>Maturity</span></div>
                                {compoundingComparison.map((c, i) => (
                                    <div key={i} className={`grid grid-cols-3 text-[11px] p-2.5 ${c.freq === compounding ? 'bg-brand-purple/10 border-l-2 border-brand-purple' : i % 2 === 0 ? 'bg-card' : 'bg-slate-800/20'}`}>
                                        <span className={`${c.freq === compounding ? 'text-brand-purple font-bold' : 'text-slate-300'}`}>{c.label}</span>
                                        <span className="text-brand-green">{formatINR(c.interest)}</span>
                                        <span className="text-foreground font-bold">{formatINR(c.maturity)}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Growth Chart */}
                <button onClick={() => setShowGrowth(!showGrowth)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm">
                    <span className="flex items-center gap-2"><TrendingUp size={16} className="text-muted-foreground" /> Maturity Growth Chart</span>
                    {showGrowth ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                    {showGrowth && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-4 rounded-2xl bg-card border border-border">
                                <div className="h-56">
                                    <Bar data={growthBarData} options={{
                                        responsive: true, maintainAspectRatio: false,
                                        scales: {
                                            y: { stacked: true, grid: { color: '#1E293B' }, ticks: { color: '#64748B', font: { size: 8 }, callback: (v: any) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K` } },
                                            x: { stacked: true, grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 10 } } },
                                        },
                                        plugins: { legend: { labels: { color: '#94A3B8', font: { size: 10 } } } }
                                    }} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* What-If Simulator */}
                <WhatIfSimulator
                    sliders={[
                        { key: 'principal', label: 'Deposit Amount', min: 10000, max: 5000000, step: 10000, prefix: '₹' },
                        { key: 'rate', label: 'Interest Rate', min: 3, max: 12, step: 0.25, suffix: '%' },
                        { key: 'years', label: 'Tenure', min: 1, max: 20, step: 1, suffix: ' yrs' },
                    ]}
                    currentInputs={{ principal, rate, years }}
                    calculateResult={(inputs) => Math.round(inputs.principal * Math.pow(1 + inputs.rate / (100 * compounding), inputs.years * compounding))}
                    resultLabel="Maturity Amount"
                />

                <SmartInsight calculatorType="fd" inputs={{ principal, rate, years }} results={{ amount: result.amount, interest: result.interest }} />

                {/* Export & Share */}
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={handleDownloadPDF} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-muted-foreground text-[10px] font-medium"><Download size={16} /> PDF</button>
                    <button onClick={handleDownloadExcel} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-muted-foreground text-[10px] font-medium"><Download size={16} /> Excel</button>
                    <button onClick={handleShare} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px] font-bold"><Share2 size={16} /> Share</button>
                </div>

                {/* Shareable Card */}
                <ShareableCard
                    title="My FD Investment"
                    highlight={formatINR(result.amount)}
                    subtitle={`${years} years at ${rate}% ${compounding === 4 ? 'quarterly' : compounding === 12 ? 'monthly' : 'yearly'} compounding`}
                    details={[
                        { label: 'Deposit', value: formatINR(principal) },
                        { label: 'Interest', value: formatINR(result.interest) },
                        { label: 'Real Value', value: formatINR(inflationAdj.realValue) },
                        { label: 'Real Return', value: `${inflationAdj.realReturn}%` },
                    ]}
                    gradient="from-indigo-600 via-purple-500 to-pink-500"
                />
            </div>
        </div>
    );
}