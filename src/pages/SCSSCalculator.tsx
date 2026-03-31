import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Save, Shield, Calendar, IndianRupee, ChevronDown, ChevronUp, Download, Share2 } from 'lucide-react';
import { nativeShare } from '../utils/nativeShare';
import { motion, AnimatePresence } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import SmartInsight from '../components/SmartInsight';
import WhatIfSimulator from '../components/WhatIfSimulator';
import ShareableCard from '../components/ShareableCard';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import { AnalyticsService } from '../lib/analytics';
import { useCalculatorStore } from '../store/useCalculatorStore';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function SCSSCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('SCSS_Calculator_Advanced'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const { addSaved } = useCalculatorStore();

    const [investment, setInvestment] = useState(1500000);
    const [rate, setRate] = useState(8.2);
    const [tenure, setTenure] = useState<5 | 8>(5);
    const [saved, setSaved] = useState(false);
    const [showTaxInfo, setShowTaxInfo] = useState(false);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showPenalty, setShowPenalty] = useState(false);

    const result = useMemo(() => {
        const annualInterest = investment * rate / 100;
        const quarterlyIncome = annualInterest / 4;
        const totalInterest = annualInterest * tenure;
        const maturityAmount = investment + totalInterest;

        // TDS: 10% if annual interest > ₹50,000 (senior citizens)
        const tdsApplicable = annualInterest > 50000;
        const annualTDS = tdsApplicable ? annualInterest * 0.10 : 0;
        const netAnnualIncome = annualInterest - annualTDS;
        const netQuarterlyIncome = netAnnualIncome / 4;

        const yearlyBreakdown = Array.from({ length: tenure }, (_, i) => ({
            year: i + 1,
            interest: Math.round(annualInterest),
            tds: Math.round(annualTDS),
            netInterest: Math.round(annualInterest - annualTDS),
            cumInterest: Math.round(annualInterest * (i + 1)),
        }));

        // Premature withdrawal penalties
        const penaltyAfter1Yr = Math.round(investment * 0.015);
        const amtAfter1Yr = investment - penaltyAfter1Yr;
        const penaltyAfter2Yrs = Math.round(investment * 0.010);
        const amtAfter2Yrs = investment - penaltyAfter2Yrs;

        return {
            quarterlyIncome: Math.round(quarterlyIncome),
            annualInterest: Math.round(annualInterest),
            totalInterest: Math.round(totalInterest),
            maturityAmount: Math.round(maturityAmount),
            tdsApplicable,
            annualTDS: Math.round(annualTDS),
            netAnnualIncome: Math.round(netAnnualIncome),
            netQuarterlyIncome: Math.round(netQuarterlyIncome),
            yearlyBreakdown,
            penaltyAfter1Yr,
            amtAfter1Yr,
            penaltyAfter2Yrs,
            amtAfter2Yrs,
        };
    }, [investment, rate, tenure]);

    const pieData = useMemo(() => ({
        labels: ['Principal', 'Total Interest'],
        datasets: [{
            data: [investment, result.totalInterest],
            backgroundColor: ['#3B82F6', '#8B5CF6'],
            borderColor: ['#1E293B', '#1E293B'],
            borderWidth: 2,
        }],
    }), [investment, result.totalInterest]);

    const handleSave = () => {
        addSaved({
            id: `scss-${Date.now()}`,
            calculatorType: 'SCSS Calculator',
            inputValues: { investment, rate, tenure },
            resultValues: { primary: result.quarterlyIncome, maturity: result.maturityAmount },
            timestamp: Date.now(),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleDownloadPDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        await exportToPDF({
            title: 'SCSS (Senior Citizen Savings Scheme) Report',
            inputs: [
                { label: 'Investment Amount', value: `₹${Math.round(investment).toLocaleString('en-IN')}` },
                { label: 'Interest Rate', value: `${rate}% p.a.` },
                { label: 'Tenure', value: `${tenure} Years` },
            ],
            results: [
                { label: 'Quarterly Interest Payout', value: `₹${Math.round(result.quarterlyIncome).toLocaleString('en-IN')}` },
                { label: 'Annual Interest', value: `₹${Math.round(result.annualInterest).toLocaleString('en-IN')}` },
                { label: 'Total Interest over Tenure', value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
                { label: 'Maturity Amount', value: `₹${Math.round(result.maturityAmount).toLocaleString('en-IN')}` },
                ...(result.tdsApplicable ? [
                    { label: 'Annual TDS (10%)', value: `₹${Math.round(result.annualTDS).toLocaleString('en-IN')}` },
                    { label: 'Net Annual Income', value: `₹${Math.round(result.netAnnualIncome).toLocaleString('en-IN')}` },
                ] : []),
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: 'Principal Invested', value: investment, color: '#4F46E5' },
                    { label: 'Total Interest', value: result.totalInterest, color: '#10B981' },
                ],
            },
            projectionTitle: 'Annual Interest Payout Schedule',
            projectionColumns: ['Year', 'Annual Interest', 'TDS Deducted', 'Net Interest', 'Cumulative Interest'],
            projectionRows: result.yearlyBreakdown.map((r: any) => [
                `Year ${r.year}`,
                `₹${Math.round(r.interest).toLocaleString('en-IN')}`,
                `₹${Math.round(r.tds).toLocaleString('en-IN')}`,
                `₹${Math.round(r.netInterest).toLocaleString('en-IN')}`,
                `₹${Math.round(r.cumInterest).toLocaleString('en-IN')}`,
            ]),
            filename: `FinCalix_SCSS_Report_${tag}`,
        });
    };

    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        await exportToExcel({
            title: 'SCSS (Senior Citizen Savings Scheme) Report',
            inputs: [
                { label: 'Investment Amount', value: `₹${Math.round(investment).toLocaleString('en-IN')}` },
                { label: 'Interest Rate', value: `${rate}%` },
                { label: 'Tenure', value: `${tenure} Years` },
            ],
            results: [
                { label: 'Quarterly Payout', value: `₹${Math.round(result.quarterlyIncome).toLocaleString('en-IN')}` },
                { label: 'Total Interest', value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
            ],
            projectionTitle: 'Annual Payout Schedule',
            projectionColumns: ['Year', 'Annual Interest', 'TDS Deducted', 'Net Interest', 'Cumulative Interest'],
            projectionRows: result.yearlyBreakdown.map((r: any) => [r.year, Math.round(r.interest), Math.round(r.tds), Math.round(r.netInterest), Math.round(r.cumInterest)]),
            filename: `FinCalix_SCSS_Report_${tag}`,
        });
    };

    const handleShare = async () => {
        const text = `🏦 My SCSS Investment Plan\n\n💰 Investment: ${formatINR(investment)}\n📈 Rate: ${rate}% p.a.\n📅 Tenure: ${tenure} Years\n\n✅ Quarterly Income: ${formatINR(result.quarterlyIncome)}\n✅ Total Interest: ${formatINR(result.totalInterest)}\n✅ Maturity Amount: ${formatINR(result.maturityAmount)}\n\nCalculated with FinCalix 🧮`;
        await nativeShare('SCSS Plan – FinCalix', text);
    };

    return (
        <div className="min-h-dvh bg-background animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-foreground">SCSS Calculator</h1>
                        <p className="text-muted-foreground text-xs">Senior Citizen Savings Scheme</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pb-28 pt-4 space-y-5">
                {/* Inputs */}
                <div className="space-y-3">
                    <NumberInput label="Investment Amount" value={investment} onChange={setInvestment} min={1000} max={3000000} prefix="₹" helperText="Max: ₹30 Lakhs" />
                    <NumberInput label="Interest Rate (p.a.)" value={rate} onChange={setRate} min={1} max={15} suffix="%" step={0.1} helperText="Current rate: 8.2% (Q1 FY2026-27)" />

                    {/* Tenure Toggle */}
                    <div className="space-y-1.5">
                        <p className="text-foreground text-sm font-medium">Tenure</p>
                        <div className="flex gap-2">
                            {([5, 8] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTenure(t)}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${tenure === t ? 'bg-brand-purple/15 border-brand-purple text-brand-purple' : 'bg-card border-border text-muted-foreground'}`}
                                >
                                    {t === 5 ? '5 Years' : '8 Years (5+3)'}
                                </button>
                            ))}
                        </div>
                        {tenure === 8 && (
                            <p className="text-[10px] text-muted-foreground px-1">Extension of 3 years must be applied within 1 year of maturity</p>
                        )}
                    </div>
                </div>

                {/* Result Card */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/30">
                    <p className="text-purple-600 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wider mb-1">Quarterly Income</p>
                    <p className="text-3xl font-black text-foreground mb-4">{formatINR(result.quarterlyIncome)}</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">Annual Income</p>
                            <p className="text-green-600 dark:text-brand-green font-bold text-sm">{formatINR(result.annualInterest)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">Total Interest ({tenure} yrs)</p>
                            <p className="text-slate-800 dark:text-slate-100 font-bold text-sm">{formatINR(result.totalInterest)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">Principal</p>
                            <p className="text-blue-600 dark:text-blue-400 font-bold text-sm">{formatINR(investment)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">Maturity Amount</p>
                            <p className="text-amber-600 dark:text-amber-400 font-bold text-sm">{formatINR(result.maturityAmount)}</p>
                        </div>
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/20 dark:bg-white/10 border border-white/20 text-slate-800 dark:text-slate-100 font-bold text-sm">
                        <Save size={16} /> {saved ? '✅ Saved!' : 'Save Calculation'}
                    </motion.button>
                </motion.div>

                {/* TDS Alert Banner */}
                {result.tdsApplicable && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                        <IndianRupee size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-amber-600 dark:text-amber-400 font-bold text-xs mb-1">TDS Applicable on Your Interest</p>
                            <p className="text-slate-600 dark:text-slate-300 text-xs">Annual interest {formatINR(result.annualInterest)} exceeds ₹50,000. TDS @ 10% = {formatINR(result.annualTDS)} p.a. Submit Form 15H to avoid TDS deduction.</p>
                            <p className="text-green-600 dark:text-brand-green font-bold text-xs mt-1">Net quarterly income after TDS: {formatINR(result.netQuarterlyIncome)}</p>
                        </div>
                    </motion.div>
                )}

                {/* Pie Chart */}
                <div className="p-4 rounded-2xl bg-card border border-border">
                    <h3 className="text-foreground font-bold text-sm mb-3">Principal vs Interest</h3>
                    <div className="w-44 h-44 mx-auto">
                        <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: '#94A3B8', font: { size: 11 } } } } }} />
                    </div>
                </div>

                {/* What-If Simulator */}
                <WhatIfSimulator
                    sliders={[
                        { key: 'investment', label: 'Investment Amount', min: 100000, max: 3000000, step: 50000, prefix: '₹' },
                        { key: 'rate', label: 'Interest Rate', min: 6, max: 10, step: 0.1, suffix: '%' },
                    ]}
                    currentInputs={{ investment, rate, tenure }}
                    calculateResult={(inputs) => Math.round((inputs.investment * inputs.rate / 100) / 4)}
                    resultLabel="Quarterly Income"
                />

                <SmartInsight
                    calculatorType="scss"
                    inputs={{ investment, rate, tenure }}
                    results={{ quarterlyIncome: result.quarterlyIncome, totalInterest: result.totalInterest, annualInterest: result.annualInterest }}
                />

                {/* Tax & TDS Info */}
                <button onClick={() => setShowTaxInfo(!showTaxInfo)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm">
                    <span className="flex items-center gap-2"><Shield size={16} className="text-green-400" /> Tax & TDS Information</span>
                    {showTaxInfo ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                    {showTaxInfo && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                                {[
                                    { title: 'Interest Taxability', desc: 'SCSS interest is fully taxable as per your income slab. It does not enjoy Section 80TTB exemption.' },
                                    { title: 'TDS Threshold', desc: 'TDS @ 10% is deducted if annual interest exceeds ₹50,000 for senior citizens (60+). PAN must be linked.' },
                                    { title: 'Form 15H', desc: 'Senior citizens with income below taxable limit can submit Form 15H annually to prevent TDS deduction.' },
                                    { title: 'Section 80C Benefit', desc: 'SCSS investment qualifies for deduction under Section 80C up to ₹1.5 lakh per financial year.' },
                                    { title: 'Joint Account', desc: 'Can be held jointly with spouse. Only the first holder is considered for the investment limit and eligibility.' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <Shield size={14} className="text-green-400 shrink-0 mt-1" />
                                        <div>
                                            <p className="text-foreground font-bold text-xs">{item.title}</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Year-wise Breakdown */}
                <button onClick={() => setShowBreakdown(!showBreakdown)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm">
                    <span className="flex items-center gap-2"><Calendar size={16} className="text-muted-foreground" /> Year-wise Interest Breakdown</span>
                    {showBreakdown ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                    {showBreakdown && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="rounded-2xl bg-card border border-border overflow-hidden">
                                <div className="grid grid-cols-4 text-[9px] font-bold text-muted-foreground uppercase p-2 bg-slate-200 dark:bg-slate-800/50">
                                    <span>Year</span><span>Interest</span><span>TDS</span><span>Cumulative</span>
                                </div>
                                {result.yearlyBreakdown.map((row, i) => (
                                    <div key={i} className={`grid grid-cols-4 text-[10px] p-2 ${i % 2 === 0 ? 'bg-card' : 'bg-slate-100 dark:bg-slate-800/40'}`}>
                                        <span className="text-slate-600 dark:text-slate-300">{row.year}</span>
                                        <span className="text-brand-green font-medium">{formatINR(row.interest)}</span>
                                        <span className="text-amber-500 dark:text-amber-400">{row.tds > 0 ? formatINR(row.tds) : '—'}</span>
                                        <span className="text-foreground font-bold">{formatINR(row.cumInterest)}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Premature Withdrawal */}
                <button onClick={() => setShowPenalty(!showPenalty)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm">
                    <span className="flex items-center gap-2"><IndianRupee size={16} className="text-red-400" /> Premature Withdrawal Penalty</span>
                    {showPenalty ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                    {showPenalty && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-500/10 border border-slate-500/20">
                                    <p className="text-slate-600 dark:text-slate-400 font-bold text-xs">Before 1 year</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs ml-auto">❌ Closure NOT permitted</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                        <div>
                                            <p className="text-red-500 dark:text-red-400 font-bold text-xs">After 1 yr, before 2 yrs</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs">1.5% penalty on principal</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-red-500 dark:text-red-400 font-bold text-xs">−{formatINR(result.penaltyAfter1Yr)}</p>
                                            <p className="text-slate-700 dark:text-slate-200 text-xs font-semibold">You get {formatINR(result.amtAfter1Yr)}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                        <div>
                                            <p className="text-amber-600 dark:text-amber-400 font-bold text-xs">After 2 years, before maturity</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs">1% penalty on principal</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-amber-600 dark:text-amber-400 font-bold text-xs">−{formatINR(result.penaltyAfter2Yrs)}</p>
                                            <p className="text-slate-700 dark:text-slate-200 text-xs font-semibold">You get {formatINR(result.amtAfter2Yrs)}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                                        <div>
                                            <p className="text-green-600 dark:text-green-400 font-bold text-xs">At maturity ({tenure} years)</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs">No penalty — full amount paid</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-green-600 dark:text-green-400 font-bold text-xs">No deduction</p>
                                            <p className="text-slate-700 dark:text-slate-200 text-xs font-semibold">You get {formatINR(result.maturityAmount)}</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs">* Interest accrued up to closure date is also paid. Penalty is deducted from the principal.</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Export & Share */}
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={handleDownloadPDF} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-slate-600 dark:text-slate-300 text-[10px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <Download size={16} /> PDF
                    </button>
                    <button onClick={handleDownloadExcel} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-slate-600 dark:text-slate-300 text-[10px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <Download size={16} /> Excel
                    </button>
                    <button onClick={handleShare} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-[10px] font-bold">
                        <Share2 size={16} /> Share
                    </button>
                </div>

                <ShareableCard
                    title="My SCSS Investment"
                    highlight={formatINR(result.quarterlyIncome)}
                    subtitle={`Quarterly income on ₹${(investment / 100000).toFixed(1)}L at ${rate}% p.a.`}
                    details={[
                        { label: 'Annual Income', value: formatINR(result.annualInterest) },
                        { label: 'Total Interest', value: formatINR(result.totalInterest) },
                        { label: 'Tenure', value: `${tenure} Years` },
                        { label: 'Maturity Amount', value: formatINR(result.maturityAmount) },
                    ]}
                    gradient="from-purple-600 via-indigo-600 to-violet-600"
                />
            </div>

            <DisclaimerComponent module="scss" />
        </div>
    );
}
