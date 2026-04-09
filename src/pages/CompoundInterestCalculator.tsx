import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Info, ChevronDown, ChevronUp, Save, Check, BrainCircuit, Activity, Settings, FileText, ChevronLeft, ChevronRight, TrendingUp, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DisclaimerComponent from '../components/DisclaimerComponent';

import { calculateCompoundInterest, formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import { AnalyticsService } from '../lib/analytics';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useLiveStatusStore } from '../store/useLiveStatusStore';
import DateInput from '../components/DateInput';
import LiveInvestmentTracker from '../components/LiveInvestmentTracker';
import SaveNameDialog from '../components/SaveNameDialog';
import PostTaxBanner from '../components/PostTaxBanner';
import { useHistoryTracker } from '../hooks/useHistoryTracker';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function CompoundInterestCalculator() {
    const { t } = useTranslation();
    useEffect(() => { AnalyticsService.trackScreen('Compound_Interest_Advanced'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const { addSaved, removeSaved } = useCalculatorStore();
    const addProfile = useLiveStatusStore(s => s.addProfile);

    // Base States
    const [principal, setPrincipal] = useState(100000);
    const [rate, setRate] = useState(12);
    const [years, setYears] = useState(10);
    const [freq, setFreq] = useState(12); 
    const [inflation, setInflation] = useState(5); // Updated FY 2025-26: RBI CPI projection ~4.8%

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
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);
    const [investmentDate, setInvestmentDate] = useState('');
    const [showNameDialog, setShowNameDialog] = useState(false);
    const [page, setPage] = useState(1);

    // Core Calculation (Actual)
    const result = useMemo(() => calculateCompoundInterest(principal, rate, years, freq), [principal, rate, years, freq]);
    const interestPct = result.amount > 0 ? (result.interest / result.amount) * 100 : 0;

    useHistoryTracker('Compound Interest Calculator', { principal, rate, years, freq }, { interest: result.interest }, result.amount);

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

    const suggestedName = `Compound Interest — ${formatINR(principal)} × ${years}Y`;

    const handleSave = (customName: string) => {
        const calcId = `ci-${Date.now()}`;
        addSaved({
            id: calcId,
            calculatorType: 'ci',
            inputValues: { principal, rate, years, freq, name: customName },
            resultValues: { primary: result.amount, label: t('ci.maturityValue'), invested: principal, returns: result.interest },
            timestamp: Date.now(),
        });
        // Also save to live tracker store so it appears in My Loans
        addProfile({
            id: calcId,
            name: customName,
            calculatorType: 'Compound Interest',
            profileData: {
                principal,
                rate,
                years,
                freq,
                maturity: Math.round(result.amount),
                interest: Math.round(result.interest),
                startDate: investmentDate || new Date().toISOString().slice(0, 10),
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        setSaved(true);
        setLastSavedId(calcId);
    };

    const removeProfile = useLiveStatusStore(s => s.removeProfile);
    const handleRemove = () => {
        if (lastSavedId) {
            removeSaved(lastSavedId);
            removeProfile(lastSavedId);
            setLastSavedId(null);
            setSaved(false);
        }
    };

    const handleDownloadPDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const freqLabel = (freqOptions || []).find((o: any) => o.val === freq)?.label || `${freq}x/year`;
        const config: ExportConfig = {
            title: t('ci.reportTitle'),
            inputs: [
                { label: t('ci.principalAmount'), value: `₹${principal.toLocaleString('en-IN')}` },
                { label: t('ci.annualRate'), value: `${rate}%` },
                { label: t('ci.timePeriod'), value: `${years} ${t('ci.years')}` },
                { label: t('ci.compoundingFrequency'), value: freqLabel },
                { label: t('ci.assumedInflation'), value: `${inflation}% p.a.` },
            ],
            results: [
                { label: t('ci.totalAmount'), value: `₹${Math.round(result.amount).toLocaleString('en-IN')}` },
                { label: t('ci.interestEarned'), value: `₹${Math.round(result.interest).toLocaleString('en-IN')}` },
                { label: t('ci.wealthMultiplier'), value: `${(result.amount / principal).toFixed(2)}x` },
                { label: t('ci.effectiveRateEAR'), value: `${advanced.ear.toFixed(2)}%` },
                { label: t('ci.doublingTime'), value: `${advanced.rule72.toFixed(1)} ${t('ci.years')}` },
                { label: t('ci.realMaturityValue'), value: `₹${Math.round(advanced.realMaturity).toLocaleString('en-IN')}` },
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: t('ci.principalAmount'), value: principal, color: '#4F46E5' },
                    { label: t('ci.interestEarned'), value: result.interest, color: '#10B981' },
                ],
            },
            projectionTitle: t('ci.yearWiseGrowth'),
            projectionColumns: [t('ci.year'), t('ci.opening'), t('ci.interestEarned'), t('ci.closing')],
            projectionRows: advanced.table.map((r: any) => [
                `${t('ci.year')} ${r.year}`,
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
            title: t('ci.reportTitle'),
            inputs: [
                { label: t('ci.principal'), value: `₹${principal.toLocaleString('en-IN')}` },
                { label: t('ci.rate'), value: `${rate}%` },
                { label: t('ci.timePeriod'), value: `${years} ${t('ci.years')}` },
            ],
            results: [
                { label: t('ci.totalAmount'), value: `₹${Math.round(result.amount).toLocaleString('en-IN')}` },
                { label: t('ci.interestEarned'), value: `₹${Math.round(result.interest).toLocaleString('en-IN')}` },
            ],
            projectionTitle: t('ci.yearWiseGrowth'),
            projectionColumns: [t('ci.year'), t('ci.opening'), t('ci.interestEarned'), t('ci.closing')],
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

                {/* After-tax preview — collapsible. */}
                <PostTaxBanner invested={principal} grossMaturity={result.amount} fmt={fmtINR} />

                {/* SMART INSIGHT (Dynamic) */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${insight.type === 'warn' ? 'bg-amber-500/10 border-amber-500/30' : insight.type === 'success' ? 'bg-brand-green/10 border-brand-green/30' : 'bg-brand-purple/10 border-brand-purple/30'}`}>
                    <BrainCircuit size={18} className={`shrink-0 mt-0.5 ${insight.type === 'warn' ? 'text-amber-500' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-purple'}`} />
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${insight.type === 'warn' ? 'text-amber-600' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-purple'}`}>{t('ci.smartInsight')}</p>
                        <p className={`text-xs font-medium leading-relaxed ${insight.type === 'warn' ? 'text-amber-700 dark:text-amber-400' : insight.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-700 dark:text-indigo-300'}`}>{insight.msg}</p>
                    </div>
                </div>

                {/* INVESTMENT START DATE — feeds the My Loans / Trackers card */}
                {!saved && (
                    <div className="p-4 rounded-2xl border border-border bg-card">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2 block">
                            {t('common.investmentDate', 'Investment Date (optional)')}
                        </label>
                        <DateInput
                            value={investmentDate}
                            onChange={setInvestmentDate}
                            max={new Date().toISOString().slice(0, 10)}
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground text-left"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                            {t('common.investmentDateHint', 'Used for tracking in My Loans')}
                        </p>
                    </div>
                )}

                {/* LIVE INVESTMENT TRACKER — appears the moment user picks a date */}
                {investmentDate && (
                    <LiveInvestmentTracker
                        mode="compound"
                        startDate={investmentDate}
                        totalYears={years}
                        rate={rate}
                        principal={principal}
                        freq={freq}
                        projectedMaturity={result.amount}
                        label={t('ci.liveTracker', 'Live Compound Interest Tracker')}
                    />
                )}

                {/* SAVE BUTTON */}
                {saved ? (
                    <div className="flex gap-2">
                        <div className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <Check size={16} /> {t('common.saved')}
                        </div>
                        <button onClick={() => navigate('/my-loans')}
                            className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-brand-purple/10 text-brand-purple border border-brand-purple/20 transition-all active:scale-95">
                            {t('common.viewInMyLoans', 'View')}
                        </button>
                        <button onClick={handleRemove}
                            className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 transition-all active:scale-95">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setShowNameDialog(true)} className="w-full py-3.5 rounded-2xl bg-brand-purple text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-brand-purple/20">
                        <Save size={18} /> {t('ci.saveCalculation')}
                    </button>
                )}

                <SaveNameDialog
                    open={showNameDialog}
                    onClose={() => setShowNameDialog(false)}
                    onConfirm={(name) => handleSave(name)}
                    defaultName={suggestedName}
                />


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
