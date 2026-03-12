import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Share2, Save, Check, Download, FileText, Landmark, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { nativeShare } from '../utils/nativeShare';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import FinancialQuote from '../components/FinancialQuote';
import { formatINR, formatINRWords } from '../utils/calculations';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import { AnalyticsService } from '../lib/analytics';
import ShareableCard from '../components/ShareableCard';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import { useTrackCalculator } from '../hooks/useTrackCalculator';

type Frequency = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
const FREQ_OPTIONS: { key: Frequency; label: string; factor: number }[] = [
    { key: 'monthly', label: 'Monthly', factor: 12 },
    { key: 'quarterly', label: 'Quarterly', factor: 4 },
    { key: 'half-yearly', label: 'Half-Yearly', factor: 2 },
    { key: 'yearly', label: 'Yearly', factor: 1 },
];

const PPF_RATE = 7.1;
const PPF_MIN_INVEST = 500;
const PPF_MAX_INVEST = 150000;
const PPF_LOCK_IN_YEARS = 15;
const PPF_EXTENSION_YEARS = 5;
const PPF_LOAN_START_YEAR = 3;
const PPF_LOAN_END_YEAR = 6;
const PPF_WITHDRAWAL_YEAR = 7;

interface PPFRow { year: number; contribution: number; opening: number; interest: number; closing: number; }

function computePPF(annualContribution: number, rate: number, years: number): PPFRow[] {
    const rows: PPFRow[] = [];
    let balance = 0;
    for (let y = 1; y <= years; y++) {
        const opening = balance;
        const interest = (opening + annualContribution) * rate / 100;
        balance = opening + annualContribution + interest;
        rows.push({ year: y, contribution: annualContribution, opening, interest: Math.round(interest), closing: Math.round(balance) });
    }
    return rows;
}

export default function AdvancedPPFCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('PPF_Advanced_Calculator'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();

    const [frequency, setFrequency] = useState<Frequency>('yearly');
    const [amountPerPeriod, setAmountPerPeriod] = useState(150000);
    const [rate, setRate] = useState(PPF_RATE);
    const [years, setYears] = useState(PPF_LOCK_IN_YEARS);
    const [showTable, setShowTable] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const { addHistory, addSaved } = useCalculatorStore();

    // Reset save state when inputs change
    useEffect(() => {
        setIsSaved(false);
    }, [frequency, amountPerPeriod, rate, years]);

    const freqFactor = FREQ_OPTIONS.find(f => f.key === frequency)?.factor || 1;
    const annualContribution = useMemo(() => {
        return Math.min(amountPerPeriod * freqFactor, PPF_MAX_INVEST);
    }, [amountPerPeriod, freqFactor]);

    const maxPerPeriod = Math.floor(PPF_MAX_INVEST / freqFactor);

    const schedule = useMemo(() => computePPF(annualContribution, rate, years), [annualContribution, rate, years]);

    const totalInvested = annualContribution * years;
    const maturityValue = schedule.length > 0 ? schedule[schedule.length - 1].closing : 0;
    const totalInterest = maturityValue - totalInvested;

    // History tracking
    useEffect(() => {
        const timer = setTimeout(() => {
            addHistory({
                id: `PPF-${Date.now()}`,
                calculatorType: 'PPF Calculator',
                inputValues: { annualContribution, rate, years, frequency },
                resultValues: { primary: maturityValue, totalInvested, totalInterest },
                timestamp: Date.now()
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [annualContribution, rate, years]);

    const handleSave = () => {
        addSaved({
            id: `PPF-Save-${Date.now()}`,
            calculatorType: 'PPF Calculator',
            inputValues: { annualContribution, rate, years, frequency },
            resultValues: { primary: maturityValue, totalInvested, totalInterest },
            timestamp: Date.now()
        });
        setIsSaved(true);
    };

    const handlePDF = async () => {
        const headers = ['Year', 'Contribution', 'Opening Balance', 'Interest Earned', 'Closing Balance'];
        const data = schedule.map(r => [
            r.year.toString(), formatINR(r.contribution), formatINR(r.opening),
            formatINR(r.interest), formatINR(r.closing),
        ]);
        const summary = [
            { label: 'Total Invested', value: formatINR(totalInvested), color: [16, 185, 129] as [number, number, number] },
            { label: 'Interest Earned', value: formatINR(totalInterest), color: [245, 158, 11] as [number, number, number] },
            { label: 'Maturity Value', value: formatINR(maturityValue), color: [139, 92, 246] as [number, number, number] },
            { label: 'Interest Rate', value: `${rate}% p.a.`, color: [59, 130, 246] as [number, number, number] },
            { label: 'Tenure', value: `${years} years`, color: [16, 185, 129] as [number, number, number] },
        ];
        await exportToPDF('PPF Calculator Report', headers, data, `FinCalix_PPF_${new Date().toISOString().slice(0, 10)}`, undefined, summary);
    };

    const handleExcel = async () => {
        const headers = ['Year', 'Contribution', 'Opening Balance', 'Interest Earned', 'Closing Balance'];
        const data = schedule.map(r => [r.year, r.contribution, r.opening, r.interest, r.closing]);
        await exportToExcel(headers, data, `FinCalix_PPF_${new Date().toISOString().slice(0, 10)}`);
    };

    return (
        <div className="min-h-dvh bg-white dark:bg-background animate-fade-in">
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                            <ArrowLeft size={18} className="text-slate-600 dark:text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-foreground">PPF Calculator</h1>
                            <p className="text-muted-foreground text-xs">Public Provident Fund</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                            <Info size={16} className="text-slate-600 dark:text-muted-foreground" />
                        </button>
                        <button className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border"
                            onClick={() => nativeShare('PPF Calculator', 'Calculate PPF maturity with FinCalix!', window.location.href)}>
                            <Share2 size={16} className="text-slate-600 dark:text-muted-foreground" />
                        </button>
                    </div>
                </div>
            </div>

            <FinancialQuote />
            <DisclaimerComponent module="government" />

            <div className="px-4 pb-28">
                {/* Frequency Toggle */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar py-3">
                    {FREQ_OPTIONS.map(f => (
                        <button key={f.key} onClick={() => {
                            setFrequency(f.key);
                            setAmountPerPeriod(Math.min(amountPerPeriod, Math.floor(PPF_MAX_INVEST / f.factor)));
                        }}
                            className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${frequency === f.key
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                                : 'bg-slate-100 dark:bg-card border border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground'
                            }`}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Inputs */}
                <div className="space-y-3 mb-5">
                    <NumberInput label={`Investment per ${frequency === 'yearly' ? 'Year' : frequency === 'half-yearly' ? 'Half-Year' : frequency === 'quarterly' ? 'Quarter' : 'Month'}`}
                        value={amountPerPeriod} onChange={setAmountPerPeriod}
                        min={PPF_MIN_INVEST} max={maxPerPeriod} prefix="₹"
                        helperText={`₹${PPF_MIN_INVEST.toLocaleString()} - ₹${maxPerPeriod.toLocaleString()} (Annual max: ₹1,50,000)`} />
                    <NumberInput label="Interest Rate (p.a.)" value={rate} onChange={setRate}
                        min={1} max={15} suffix="%" step={0.1} helperText="Current govt rate: 7.1%" />
                    <NumberInput label="Investment Period" value={years} onChange={setYears}
                        min={PPF_LOCK_IN_YEARS} max={50} suffix=" years"
                        helperText={`Min ${PPF_LOCK_IN_YEARS} years (+ ${PPF_EXTENSION_YEARS}-year blocks)`} />
                </div>

                {/* Annual Contribution Banner */}
                <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        <span className="font-bold">Annual Contribution:</span> {formatINR(annualContribution)}/year
                        {frequency !== 'yearly' && ` (${formatINR(amountPerPeriod)} × ${freqFactor} = ${formatINR(amountPerPeriod * freqFactor)})`}
                        {amountPerPeriod * freqFactor > PPF_MAX_INVEST && (
                            <span className="text-amber-600 dark:text-amber-400"> — Capped at ₹1,50,000/year</span>
                        )}
                    </p>
                </div>

                {/* Result Card */}
                <motion.div layout className="p-5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-lg dark:shadow-none mb-4">
                    <div className="text-center mb-4">
                        <p className="text-muted-foreground text-sm mb-1">Maturity Value</p>
                        <motion.p key={maturityValue} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                            {formatINR(maturityValue)}
                        </motion.p>
                        {maturityValue >= 100000 && <p className="text-muted-foreground text-[10px] mt-1">({formatINRWords(maturityValue)})</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Total Invested</p>
                            <p className="text-slate-900 dark:text-foreground font-bold text-sm">{formatINR(totalInvested)}</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Interest Earned</p>
                            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{formatINR(totalInterest)}</p>
                        </div>
                    </div>
                </motion.div>

                {/* PPF Rules & Benefits */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-1.5 px-1 mb-1">
                        <Landmark size={13} className="text-emerald-500" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">PPF Rules & Benefits</span>
                    </div>
                    {[
                        { icon: '🔒', text: `Lock-in period: ${PPF_LOCK_IN_YEARS} years (extendable in ${PPF_EXTENSION_YEARS}-year blocks)`, type: 'info' },
                        { icon: '💰', text: `Partial withdrawal allowed from Year ${PPF_WITHDRAWAL_YEAR} onwards (max 50% of balance at end of 4th year)`, type: 'tip' },
                        { icon: '🏦', text: `Loan against PPF available from Year ${PPF_LOAN_START_YEAR} to Year ${PPF_LOAN_END_YEAR} (max 25% of balance)`, type: 'tip' },
                        { icon: '📋', text: `Tax benefit under Section 80C: Up to ₹1,50,000/year. Interest & maturity fully tax-free (EEE status)`, type: 'positive' },
                        { icon: '⚡', text: `Sovereign guarantee — one of India's safest instruments`, type: 'positive' },
                    ].map((item, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                            item.type === 'positive' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' :
                            item.type === 'tip' ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30' :
                            'bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/30'
                        }`}>
                            <span className="text-sm flex-shrink-0">{item.icon}</span>
                            <p className={`text-xs font-medium leading-relaxed ${
                                item.type === 'positive' ? 'text-emerald-700 dark:text-emerald-400' :
                                item.type === 'tip' ? 'text-blue-700 dark:text-blue-400' :
                                'text-slate-600 dark:text-muted-foreground'
                            }`}>{item.text}</p>
                        </div>
                    ))}
                </div>

                {/* Year-by-Year Table */}
                <button onClick={() => setShowTable(!showTable)}
                    className="w-full py-3.5 rounded-2xl border border-slate-200 dark:border-border text-slate-700 dark:text-slate-300 font-bold text-sm bg-white dark:bg-card/50 flex items-center justify-center gap-2 mb-3 shadow-sm dark:shadow-none">
                    {showTable ? 'Hide' : 'View'} Year-by-Year Breakdown
                    {showTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                <AnimatePresence>
                    {showTable && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                            <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-3 overflow-x-auto shadow-sm dark:shadow-none">
                                <table className="w-full text-[10px] min-w-[450px]">
                                    <thead>
                                        <tr className="text-muted-foreground border-b border-slate-200 dark:border-border">
                                            <th className="py-2 text-left font-semibold">Year</th>
                                            <th className="py-2 text-right font-semibold">Deposit</th>
                                            <th className="py-2 text-right font-semibold">Opening</th>
                                            <th className="py-2 text-right font-semibold">Interest</th>
                                            <th className="py-2 text-right font-semibold">Closing</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {schedule.map(row => (
                                            <tr key={row.year} className={`border-b border-slate-100 dark:border-border/30 ${
                                                row.year === PPF_LOCK_IN_YEARS ? 'bg-emerald-50 dark:bg-emerald-500/5' : ''
                                            }`}>
                                                <td className="py-1.5 text-slate-700 dark:text-slate-300 font-medium">
                                                    {row.year}
                                                    {row.year === PPF_LOCK_IN_YEARS && <span className="text-[8px] text-emerald-500 ml-1">Maturity</span>}
                                                </td>
                                                <td className="py-1.5 text-right text-slate-600 dark:text-muted-foreground">{formatINR(row.contribution)}</td>
                                                <td className="py-1.5 text-right text-muted-foreground dark:text-muted-foreground">{formatINR(row.opening)}</td>
                                                <td className="py-1.5 text-right text-emerald-600 dark:text-emerald-400">{formatINR(row.interest)}</td>
                                                <td className="py-1.5 text-right text-slate-800 dark:text-foreground font-medium">{formatINR(row.closing)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="space-y-3 mb-5">
                    <div className="flex gap-3">
                        <motion.button whileTap={{ scale: 0.97 }} onClick={handlePDF}
                            className="flex-1 py-4 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 text-violet-600 dark:text-violet-400 font-bold text-sm flex items-center justify-center gap-2">
                            <FileText size={16} /> PDF
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.97 }} onClick={handleExcel}
                            className="flex-1 py-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center justify-center gap-2">
                            <Download size={16} /> Excel
                        </motion.button>
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={isSaved}
                        className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isSaved
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                        }`}>
                        {isSaved ? <><Check size={18} /> Saved</> : <><Save size={18} /> Save Calculation</>}
                    </motion.button>
                </div>

                <ShareableCard
                    title="My PPF Maturity"
                    highlight={formatINR(maturityValue)}
                    subtitle={`PPF @ ${rate}% for ${years} years`}
                    details={[
                        { label: 'Total Invested', value: formatINR(totalInvested) },
                        { label: 'Interest Earned', value: formatINR(totalInterest) },
                        { label: 'Tax Benefit (80C)', value: `Up to ₹1,50,000/yr` },
                    ]}
                    gradient="from-emerald-600 via-teal-500 to-cyan-600"
                />

                <CalculatorInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} calculatorTitle="PPF Calculator" />
            </div>
        </div>
    );
}
