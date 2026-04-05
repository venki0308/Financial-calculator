import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Info, ChevronDown, ChevronUp, Save, Check, BrainCircuit, Activity, Settings, FileText, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DisclaimerComponent from '../components/DisclaimerComponent';

import { calculateCompoundInterest, formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import { AnalyticsService } from '../lib/analytics';
import { useCalculatorStore } from '../store/useCalculatorStore';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function CompoundInterestCalculator() {
    const { t } = useTranslation();
    useEffect(() => { AnalyticsService.trackScreen('Compound_Interest_Advanced'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const { addSaved } = useCalculatorStore();

    // Base States
    const [principal, setPrincipal] = useState(100000);
    const [rate, setRate] = useState(12);
    const [years, setYears] = useState(10);
    const [freq, setFreq] = useState(12); 
    const [inflation, setInflation] = useState(6);

    // What-If Simulator States
    const [simRate, setSimRate] = useState(rate);
    const [simYears, setSimYears] = useState(years);
    useEffect(() => { setSimRate(rate); setSimYears(years); }, [rate, years]);

    // UI States
    const [showInfo, setShowInfo] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showWhatIf, setShowWhatIf] = useState(false);
    const [showTable, setShowTable] = useState(false);
    const [saved, setSaved] = useState(false);
    const [page, setPage] = useState(1);

    // Core Calculation (Actual)
    const result = useMemo(() => calculateCompoundInterest(principal, rate, years, freq), [principal, rate, years, freq]);
    const interestPct = result.amount > 0 ? (result.interest / result.amount) * 100 : 0;

    // Advanced computations
    const advanced = useMemo(() => {
        const rDecimal = rate / 100;
        const iDecimal = inflation / 100;

        // Effective Annual Rate calculation
        const ear = (Math.pow(1 + rDecimal / freq, freq) - 1) * 100;
        
        // Rule of 72
        const rule72 = rate > 0 ? 72 / rate : 0;
        
        // Inflation Adjusted (Real Return = ((1+r)/(1+i)) - 1)
        const realRate = ((1 + rDecimal) / (1 + iDecimal)) - 1;
        const realMaturity = principal * Math.pow(1 + realRate, years);
        const realGain = realMaturity - principal;

        // Table Generation
        const table: { year: number; opening: number; interest: number; closing: number }[] = [];
        let balance = principal;
        for (let y = 1; y <= years; y++) {
            const closing = principal * Math.pow(1 + rDecimal / freq, freq * y);
            const interest = closing - balance;
            table.push({ year: y, opening: balance, interest, closing });
            balance = closing;
        }

        return { ear, rule72, realMaturity, realGain, table };
    }, [principal, rate, years, freq, inflation]);

    // What-If Calculation
    const simResult = useMemo(() => calculateCompoundInterest(principal, simRate, simYears, freq), [principal, simRate, simYears, freq]);
    const valueDiff = simResult.amount - result.amount;

    // Smart Insights Engine
    const insight = useMemo(() => {
        if (rate <= inflation) return { msg: t('ci.insightInflationWarn', { rate, inflation }), type: 'warn' };
        if (years > 10) return { msg: t('ci.insightLongTerm', { multiplier: (result.amount / principal).toFixed(1) }), type: 'success' };
        if (rate > 15) return { msg: t('ci.insightHighRate'), type: 'warn' };
        return { msg: t('ci.insightDefault'), type: 'info' };
    }, [rate, inflation, years, result.amount, principal, t]);

    const handleSave = () => {
        addSaved({
            id: `ci-${Date.now()}`,
            calculatorType: 'ci',
            inputValues: { principal, rate, years, freq },
            resultValues: { primary: result.amount, label: 'Maturity Value', invested: principal, returns: result.interest },
            timestamp: Date.now(),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleDownloadPDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const freqLabel = (freqOptions || []).find((o: any) => o.val === freq)?.label || `${freq}x/year`;
        const config: ExportConfig = {
            title: 'Compound Interest Report',
            inputs: [
                { label: 'Principal Amount', value: `₹${principal.toLocaleString('en-IN')}` },
                { label: 'Annual Rate of Interest', value: `${rate}%` },
                { label: 'Time Period', value: `${years} Years` },
                { label: 'Compounding Frequency', value: freqLabel },
                { label: 'Assumed Inflation Rate', value: `${inflation}% p.a.` },
            ],
            results: [
                { label: 'Total Amount', value: `₹${Math.round(result.amount).toLocaleString('en-IN')}` },
                { label: 'Interest Earned', value: `₹${Math.round(result.interest).toLocaleString('en-IN')}` },
                { label: 'Wealth Multiplier', value: `${(result.amount / principal).toFixed(2)}x` },
                { label: 'Effective Annual Rate (EAR)', value: `${advanced.ear.toFixed(2)}%` },
                { label: 'Doubling Time (Rule of 72)', value: `${advanced.rule72.toFixed(1)} years` },
                { label: 'Real Maturity Value (Inflation-adj)', value: `₹${Math.round(advanced.realMaturity).toLocaleString('en-IN')}` },
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: 'Principal Amount', value: principal, color: '#4F46E5' },
                    { label: 'Interest Earned', value: result.interest, color: '#10B981' },
                ],
            },
            projectionTitle: 'Year-Wise Compound Growth',
            projectionColumns: ['Year', 'Opening Balance', 'Interest Earned', 'Closing Balance'],
            projectionRows: advanced.table.map((r: any) => [
                `Year ${r.year}`,
                `₹${Math.round(r.opening).toLocaleString('en-IN')}`,
                `₹${Math.round(r.interest).toLocaleString('en-IN')}`,
                `₹${Math.round(r.closing).toLocaleString('en-IN')}`,
            ]),
            filename: `FinCalix_CompoundInterest_Report_${tag}`,
        };
        await exportToPDF(config);
    };

    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const config: ExportConfig = {
            title: 'Compound Interest Report',
            inputs: [
                { label: 'Principal', value: `₹${principal.toLocaleString('en-IN')}` },
                { label: 'Rate', value: `${rate}%` },
                { label: 'Period', value: `${years} Years` },
            ],
            results: [
                { label: 'Total Amount', value: `₹${Math.round(result.amount).toLocaleString('en-IN')}` },
                { label: 'Interest Earned', value: `₹${Math.round(result.interest).toLocaleString('en-IN')}` },
            ],
            projectionTitle: 'Year-Wise Growth',
            projectionColumns: ['Year', 'Opening Balance', 'Interest Earned', 'Closing Balance'],
            projectionRows: advanced.table.map((r: any) => [r.year, Math.round(r.opening), Math.round(r.interest), Math.round(r.closing)]),
            filename: `FinCalix_CompoundInterest_Report_${tag}`,
        };
        await exportToExcel(config);
    };

    const freqOptions = [
        { label: t('ci.freqYearly'), val: 1 },
        { label: t('ci.freqHalfYr'), val: 2 },
        { label: t('ci.freqQtrly'), val: 4 },
        { label: t('ci.freqMonthly'), val: 12 },
    ];

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm font-semibold focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50";

    return (
        <div className="min-h-dvh bg-background animate-fade-in pb-28" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border hover:bg-muted transition-all">
                            <ArrowLeft size={18} className="text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-foreground leading-tight">{t('ci.title')}</h1>
                            <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">{t('ci.subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-card border border-border hover:bg-muted transition-all">
                        <Info size={16} className="text-muted-foreground" />
                    </button>
                </div>
            </div>

            <DisclaimerComponent module="general" />

            <div className="px-4 mt-5 space-y-5">
                {/* 1. INPUTS */}
                <div className="space-y-4">
                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('ci.principalAmount')}</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={principal} onChange={e => setPrincipal(Number(e.target.value)||0)} className={inputCls + " pl-7"} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('ci.annualRate')}</label>
                            <input type="number" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value)||0)} className={inputCls} />
                        </div>
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('ci.timeYears')}</label>
                            <input type="number" value={years} onChange={e => setYears(Number(e.target.value)||0)} className={inputCls} />
                        </div>
                    </div>

                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('ci.compoundingFrequency')}</label>
                        <div className="flex rounded-xl bg-card border border-border p-1">
                            {freqOptions.map((opt) => (
                                <button
                                    key={opt.val}
                                    onClick={() => setFreq(opt.val)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${freq === opt.val ? 'bg-brand-purple text-white shadow-sm' : 'text-muted-foreground'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. CORE RESULTS CARD */}
                <motion.div layout className="p-6 rounded-3xl bg-card border border-border shadow-sm">
                    <div className="text-center mb-5">
                        <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-bold mb-1">{t('ci.maturityValue')}</p>
                        <motion.p key={result.amount} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-black text-brand-purple tracking-tight">
                            {fmtINR(result.amount)}
                        </motion.p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="p-3.5 rounded-2xl bg-background border border-border/50 text-center">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1">{t('ci.totalInvested')}</p>
                            <p className="text-foreground font-black text-sm">{fmtINR(principal)}</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-brand-green/10 border border-brand-green/20 text-center">
                            <p className="text-brand-green/80 text-[10px] uppercase font-bold mb-1">{t('ci.interestEarned')}</p>
                            <p className="text-brand-green font-black text-sm">{fmtINR(result.interest)}</p>
                        </div>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            style={{ background: 'linear-gradient(90deg, #8B5CF6, #10B981)' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${interestPct}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 font-bold select-none">
                        <span className="text-muted-foreground text-[9px] uppercase tracking-wider">{t('ci.invested')} • {(100 - interestPct).toFixed(0)}%</span>
                        <span className="text-brand-green text-[9px] uppercase tracking-wider">{t('ci.returns')} • {interestPct.toFixed(0)}%</span>
                    </div>
                </motion.div>

                {/* SMART INSIGHT (Dynamic) */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${insight.type === 'warn' ? 'bg-amber-500/10 border-amber-500/30' : insight.type === 'success' ? 'bg-brand-green/10 border-brand-green/30' : 'bg-brand-purple/10 border-brand-purple/30'}`}>
                    <BrainCircuit size={18} className={`shrink-0 mt-0.5 ${insight.type === 'warn' ? 'text-amber-500' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-purple'}`} />
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${insight.type === 'warn' ? 'text-amber-600' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-purple'}`}>{t('ci.smartInsight')}</p>
                        <p className={`text-xs font-medium leading-relaxed ${insight.type === 'warn' ? 'text-amber-700 dark:text-amber-400' : insight.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-700 dark:text-indigo-300'}`}>{insight.msg}</p>
                    </div>
                </div>

                {/* SAVE BUTTON */}
                <button onClick={handleSave} className="w-full py-3.5 rounded-2xl bg-brand-purple text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-brand-purple/20">
                    {saved ? <Check size={18} /> : <Save size={18} />}
                    {saved ? t('ci.calculationSaved') : t('ci.saveCalculation')}
                </button>

                {/* 3. ADVANCED DETAILS (Collapsible) */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-brand-purple/10 rounded-lg text-brand-purple"><Activity size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('ci.advancedDetails')}</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-5">
                                    <div className="h-px bg-border w-full -mt-2" />

                                    {/* EAR and Rule 72 */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-4 rounded-2xl bg-background border border-border text-center">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-0.5">{t('ci.effectiveRateEAR')}</p>
                                            <p className="text-brand-purple font-black text-xl mb-1">{advanced.ear.toFixed(2)}%</p>
                                            <p className="text-muted-foreground text-[9px] leading-tight px-1">{t('ci.earDescription')}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-background border border-border text-center">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-0.5">{t('ci.doublingTime')}</p>
                                            <p className="text-brand-gold font-black text-xl mb-1">{advanced.rule72.toFixed(1)}y</p>
                                            <p className="text-muted-foreground text-[9px] leading-tight px-1">{t('ci.rule72Description')}</p>
                                        </div>
                                    </div>

                                    {/* Monthly Breakdown Smart */}
                                    <div className="bg-muted/50 p-4 rounded-2xl border border-border">
                                        <p className="text-foreground text-xs font-bold mb-3 flex items-center gap-1"><TrendingUp size={12}/> {t('ci.monthlyConversion')}</p>
                                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-border/50">
                                            <span className="text-muted-foreground text-xs font-medium">{t('ci.monthlyEquivalentRate')}</span>
                                            <span className="text-foreground font-bold text-sm">{(advanced.ear / 12).toFixed(2)}% / mo</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground text-xs font-medium">{t('ci.interestPer1LPerMonth')}</span>
                                            <span className="text-brand-green font-bold text-sm">{fmtINR((100000 * advanced.ear) / 100 / 12)}</span>
                                        </div>
                                    </div>

                                    {/* Inflation Adjusted Return */}
                                    <div className="bg-gradient-to-br from-background to-muted p-4 rounded-2xl border border-border space-y-3">
                                        <div className="flex justify-between items-center">
                                            <p className="text-foreground text-xs font-bold">{t('ci.inflationAdjustedValue')}</p>
                                            <div className="flex items-center gap-1.5 bg-card border border-border px-2 py-1 rounded-lg">
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase">{t('ci.rate')}</span>
                                                <input type="number" className="w-8 bg-transparent text-xs font-bold text-amber-500 outline-none p-0 text-center" value={inflation} onChange={e => setInflation(Number(e.target.value)||0)} />
                                                <span className="text-[10px] text-muted-foreground font-bold">%</span>
                                            </div>
                                        </div>
                                        <p className="text-muted-foreground text-[10px] leading-relaxed -mt-1">
                                            {t('ci.inflationDescription')}
                                        </p>
                                        <div className="flex justify-between items-end pt-1">
                                            <div>
                                                <p className="text-muted-foreground text-[10px] uppercase font-bold mb-0.5">{t('ci.realMaturityValue')}</p>
                                                <p className="text-foreground font-black text-lg">{fmtINR(advanced.realMaturity)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-muted-foreground text-[10px] uppercase font-bold mb-0.5">{t('ci.realGain')}</p>
                                                <p className="text-amber-500 font-bold text-sm">+{fmtINR(advanced.realGain)}</p>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 4. WHAT-IF SIMULATOR (Collapsible) */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowWhatIf(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-500"><Settings size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('ci.whatIfSimulator')}</span>
                        </div>
                        {showWhatIf ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showWhatIf && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-6">
                                    <div className="h-px bg-border w-full -mt-2" />
                                    
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('ci.simulatedRate')}</span>
                                            <span className="text-sm font-black text-indigo-500">{simRate}%</span>
                                        </div>
                                        <input type="range" min={1} max={30} step={0.5} value={simRate} onChange={e => setSimRate(Number(e.target.value))} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('ci.simulatedTenure')}</span>
                                            <span className="text-sm font-black text-rose-500">{simYears} yrs</span>
                                        </div>
                                        <input type="range" min={1} max={40} step={1} value={simYears} onChange={e => setSimYears(Number(e.target.value))} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-rose-500" />
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-600 text-center">
                                        <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">{t('ci.simulatedFinalValue')}</p>
                                        <p className="font-black text-2xl text-foreground mb-2">{fmtINR(simResult.amount)}</p>
                                        
                                        {valueDiff !== 0 && (
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${valueDiff > 0 ? 'bg-brand-green/10 text-brand-green' : 'bg-red-500/10 text-red-500'}`}>
                                                {valueDiff > 0 ? '▲' : '▼'} {fmtINR(Math.abs(valueDiff))} {valueDiff > 0 ? t('ci.more') : t('ci.less')}
                                            </div>
                                        )}
                                        {valueDiff === 0 && <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">{t('ci.noChange')}</span>}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


                {/* 5. YEAR-BY-YEAR GROWTH TABLE */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden mb-6">
                    <button onClick={() => setShowTable(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500"><FileText size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('ci.yearByYearGrowth')}</span>
                        </div>
                        {showTable ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showTable && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 pt-1">
                                    <div className="rounded-2xl overflow-hidden border border-border mt-2">
                                        <div className="grid grid-cols-3 bg-muted px-3 py-2.5">
                                            {[t('ci.year'), t('ci.opening'), t('ci.closing')].map(h => (<p key={h} className="text-muted-foreground text-[10px] font-black uppercase tracking-wider">{h}</p>))}
                                        </div>
                                        <div className="divide-y divide-border/50">
                                            {advanced.table.slice((page - 1) * 10, page * 10).map((row) => (
                                                <div key={row.year} className="grid grid-cols-3 px-3 py-3 bg-background items-center">
                                                    <p className="text-foreground text-xs font-bold">{t('ci.yr')} {row.year}</p>
                                                    <p className="text-foreground/80 text-xs font-mono">{fmtINR(row.opening)}</p>
                                                    <div className="flex flex-col">
                                                        <p className="text-foreground text-xs font-bold font-mono">{fmtINR(row.closing)}</p>
                                                        <p className="text-brand-green text-[9px] font-bold mt-0.5">+{fmtINR(row.interest)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {/* Pagination */}
                                        {advanced.table.length > 10 && (
                                            <div className="bg-muted px-3 py-2.5 flex justify-between items-center border-t border-border">
                                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('ci.page')} {page} {t('ci.of')} {Math.ceil(advanced.table.length / 10)}</p>
                                                <button disabled={page === Math.ceil(advanced.table.length / 10)} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


                {/* EXPORT OPTIONS */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-brand-purple/5 border border-brand-purple/20 text-brand-purple font-bold text-xs transition-colors hover:bg-brand-purple/10 active:scale-95"
                    >
                        <FileText size={20} /> {t('ci.exportReport')}
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-brand-green/5 border border-brand-green/20 text-brand-green font-bold text-xs transition-colors hover:bg-brand-green/10 active:scale-95"
                    >
                        <FileText size={20} /> {t('ci.excelData')}
                    </button>
                </div>

                <CalculatorInfoModal
                    isOpen={showInfo}
                    onClose={() => setShowInfo(false)}
                    calculatorTitle={t('ci.title')}
                />
            </div>
        </div>
    );
}
