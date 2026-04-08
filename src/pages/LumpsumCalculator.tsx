import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronUp, Info, Save, Check, Target, TrendingUp, ShieldAlert, FileText, ChevronLeft, ChevronRight, Activity, BrainCircuit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, type ExportConfig } from '../utils/exportReport';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useLiveStatusStore } from '../store/useLiveStatusStore';
import DateInput from '../components/DateInput';
import DisclaimerComponent from '../components/DisclaimerComponent';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function LumpsumCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addSaved, removeSaved } = useCalculatorStore();
    const addProfile = useLiveStatusStore(s => s.addProfile);
    const removeProfile = useLiveStatusStore(s => s.removeProfile);

    useEffect(() => { AnalyticsService.trackScreen('Lumpsum_Advanced'); }, []);

    // Base Inputs
    const [principal, setPrincipal] = useState(100000);
    const [rate, setRate] = useState(12);
    const [years, setYears] = useState(10);
    const [inflation, setInflation] = useState(6);

    // Goal Matching
    const [targetAmount, setTargetAmount] = useState(500000);

    // Simulators
    const [simPrincipal, setSimPrincipal] = useState(principal);
    const [simRate, setSimRate] = useState(rate);
    const [simYears, setSimYears] = useState(years);
    useEffect(() => { setSimPrincipal(principal); setSimRate(rate); setSimYears(years); }, [principal, rate, years]);

    // UI States
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showWhatIf, setShowWhatIf] = useState(false);
    const [showGoal, setShowGoal] = useState(false);
    const [showTable, setShowTable] = useState(false);
    const [saved, setSaved] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);
    const [investmentDate, setInvestmentDate] = useState('');
    const [page, setPage] = useState(1);

    // 1. CORE CALCULATION
    const result = useMemo(() => {
        const rDecimal = rate / 100;
        const iDecimal = inflation / 100;
        
        const fv = principal * Math.pow(1 + rDecimal, years);
        const wealthRatio = fv / principal;
        
        const cagr = rate; // Fixed lumpsum assumption
        const realRate = ((1 + rDecimal) / (1 + iDecimal)) - 1;
        const realValue = principal * Math.pow(1 + realRate, years);
        const wealthErosion = fv - realValue;

        // Risk Indicator (<6% Low, 6-12% Moderate, >12% High)
        let riskLevel = t('lumpsum.riskLow'); let riskColor = 'text-brand-green'; let riskBg = 'bg-brand-green/10 border-brand-green/20';
        if (rate >= 6 && rate <= 12) { riskLevel = t('lumpsum.riskModerate'); riskColor = 'text-amber-500'; riskBg = 'bg-amber-500/10 border-amber-500/20'; }
        else if (rate > 12) { riskLevel = t('lumpsum.riskHigh'); riskColor = 'text-rose-500'; riskBg = 'bg-rose-500/10 border-rose-500/20'; }

        // Year-by-year table
        const table: { year: number; value: number; gain: number; yearlyGain: number }[] = [];
        let prev = principal;
        for (let y = 1; y <= years; y++) {
            const v = principal * Math.pow(1 + rDecimal, y);
            table.push({ year: y, value: v, gain: v - principal, yearlyGain: v - prev });
            prev = v;
        }

        return { fv, cagr, realRate, realValue, wealthRatio, table, wealthErosion, riskLevel, riskColor, riskBg };
    }, [principal, rate, years, inflation, t]);

    // 2. GOAL MATCHING ENGINE
    const goalData = useMemo(() => {
        if (targetAmount <= principal) return { requiredYears: 0, requiredRate: 0, gap: 0, achievable: true };
        
        const reqYears = rate > 0 ? Math.log(targetAmount / principal) / Math.log(1 + (rate / 100)) : Infinity;
        const reqRate = years > 0 ? (Math.pow(targetAmount / principal, 1 / years) - 1) * 100 : 0;
        const gap = targetAmount - result.fv;

        return {
            requiredYears: reqYears > 0 ? reqYears : 0,
            requiredRate: reqRate > 0 ? reqRate : 0,
            gap,
            achievable: gap <= 0
        };
    }, [targetAmount, principal, rate, years, result.fv]);

    // 3. SIMULATOR
    const simResult = useMemo(() => {
        return simPrincipal * Math.pow(1 + simRate / 100, simYears);
    }, [simPrincipal, simRate, simYears]);

    // 4. SMART INSIGHTS
    const insight = useMemo(() => {
        if (!goalData.achievable && showGoal && targetAmount > 0) {
            return { msg: t('lumpsum.insightGoalShortfall', { gap: fmtINR(goalData.gap), years: goalData.requiredYears.toFixed(1), rate: goalData.requiredRate.toFixed(1) }), type: 'warn' };
        }
        if (rate > 0 && result.realRate <= 0) {
            return { msg: t('lumpsum.insightInflationEroding', { inflation, minRate: inflation + 2 }), type: 'warn' };
        }
        if (years >= 15 && rate >= 10) {
            return { msg: t('lumpsum.insightLongTerm'), type: 'success' };
        }
        return { msg: t('lumpsum.insightInflationImpact', { erosion: fmtINR(result.wealthErosion), years }), type: 'info' };
    }, [rate, result.realRate, inflation, years, result.wealthErosion, goalData, showGoal, targetAmount, t]);


    const handleSave = () => {
        const calcId = `lump-${Date.now()}`;
        addSaved({
            id: calcId,
            calculatorType: 'lumpsum',
            inputValues: { principal, rate, years },
            resultValues: { primary: result.fv, label: t('lumpsum.wealthGenerated'), invested: principal, returns: result.fv - principal },
            timestamp: Date.now(),
        });
        // Also save to live tracker store so it appears in My Loans / Trackers
        addProfile({
            id: calcId,
            name: `${formatINR(principal)} @ ${rate}% × ${years}Y`,
            calculatorType: 'Lumpsum',
            profileData: {
                principal,
                rate,
                years,
                inflation,
                maturity: Math.round(result.fv),
                gain: Math.round(result.fv - principal),
                startDate: investmentDate || new Date().toISOString().slice(0, 10),
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        setSaved(true);
        setLastSavedId(calcId);
    };

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
        const config: ExportConfig = {
            title: t('lumpsum.pdfTitle'),
            inputs: [
                { label: t('lumpsum.pdfInvestmentAmount'), value: `₹${principal.toLocaleString('en-IN')}` },
                { label: t('lumpsum.pdfExpectedReturnRate'), value: `${rate}% ${t('lumpsum.pdfPA')} (${result.riskLevel} ${t('lumpsum.risk')})` },
                { label: t('lumpsum.pdfInvestmentPeriod'), value: `${years} ${t('lumpsum.pdfYears')}` },
                { label: t('lumpsum.pdfInflationRate'), value: `${inflation}% ${t('lumpsum.pdfPA')}` },
            ],
            results: [
                { label: t('lumpsum.pdfMaturityValue'), value: `₹${Math.round(result.fv).toLocaleString('en-IN')}` },
                { label: t('lumpsum.pdfWealthGained'), value: `₹${Math.round(result.fv - principal).toLocaleString('en-IN')}` },
                { label: t('lumpsum.pdfWealthMultiplier'), value: `${result.wealthRatio.toFixed(2)}x` },
                { label: t('lumpsum.pdfEffectiveCAGR'), value: `${result.cagr.toFixed(2)}%` },
                { label: t('lumpsum.pdfRealMaturityValue'), value: `₹${Math.round(result.realValue).toLocaleString('en-IN')}` },
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: t('lumpsum.pdfPrincipalInvested'), value: principal, color: '#4F46E5' },
                    { label: t('lumpsum.pdfWealthGained'), value: result.fv - principal, color: '#10B981' },
                ],
            },
            projectionTitle: t('lumpsum.pdfYearlyGrowthSchedule'),
            projectionColumns: [t('lumpsum.pdfColYear'), t('lumpsum.pdfColOpeningValue'), t('lumpsum.pdfColYearlyGrowth'), t('lumpsum.pdfColClosingValue')],
            projectionRows: result.table.map((r: any) => [
                `${t('lumpsum.pdfColYear')} ${r.year}`,
                `₹${Math.round(r.value - r.yearlyGain).toLocaleString('en-IN')}`,
                `₹${Math.round(r.yearlyGain).toLocaleString('en-IN')}`,
                `₹${Math.round(r.value).toLocaleString('en-IN')}`,
            ]),
            filename: `FinCalix_Lumpsum_Report_${tag}`,
        };
        await exportToPDF(config);
    };

    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const config: ExportConfig = {
            title: t('lumpsum.pdfTitle'),
            inputs: [
                { label: t('lumpsum.pdfInvestmentAmount'), value: `₹${principal.toLocaleString('en-IN')}` },
                { label: t('lumpsum.pdfExpectedReturnRate'), value: `${rate}% ${t('lumpsum.pdfPA')}` },
                { label: t('lumpsum.pdfInvestmentPeriod'), value: `${years} ${t('lumpsum.pdfYears')}` },
            ],
            results: [
                { label: t('lumpsum.pdfMaturityValue'), value: `₹${Math.round(result.fv).toLocaleString('en-IN')}` },
                { label: t('lumpsum.pdfWealthGained'), value: `₹${Math.round(result.fv - principal).toLocaleString('en-IN')}` },
                { label: t('lumpsum.pdfCAGR'), value: `${result.cagr.toFixed(2)}%` },
            ],
            projectionTitle: t('lumpsum.pdfYearlyGrowthSchedule'),
            projectionColumns: [t('lumpsum.pdfColYear'), t('lumpsum.pdfColYearlyGrowth'), t('lumpsum.pdfColCumulativeGain'), t('lumpsum.pdfColClosingValue')],
            projectionRows: result.table.map((r: any) => [r.year, Math.round(r.yearlyGain), Math.round(r.gain), Math.round(r.value)]),
            filename: `FinCalix_Lumpsum_Report_${tag}`,
        };
        await exportToExcel(config);
    };

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm font-semibold focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50";

    return (
        <div className="min-h-dvh bg-background pb-28 animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border hover:bg-muted transition-all">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground leading-tight">{t('lumpsum.title')}</h1>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{t('lumpsum.subtitle')}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 space-y-5">
                {/* 1. CORE INPUTS */}
                <div className="space-y-4">
                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('lumpsum.totalInvestment')}</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={principal} onChange={e => setPrincipal(Number(e.target.value)||0)} className={inputCls + " pl-7"} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('lumpsum.returnRate')}</label>
                            <input type="number" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value)||0)} className={inputCls} />
                        </div>
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('lumpsum.timeYears')}</label>
                            <input type="number" value={years} onChange={e => setYears(Number(e.target.value)||0)} className={inputCls} />
                        </div>
                    </div>
                </div>

                {/* 2. RESULTS HERO */}
                <motion.div layout className="p-6 rounded-3xl bg-card border border-border shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-bold">{t('lumpsum.maturityValue')}</p>
                        <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${result.riskBg} ${result.riskColor}`}>
                            {result.riskLevel} {t('lumpsum.risk')}
                        </div>
                    </div>
                    
                    <p className="text-5xl font-black text-brand-blue tracking-tighter mb-5">
                        {fmtINR(result.fv)}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-background border border-border/50">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-0.5">{t('lumpsum.invested')}</p>
                            <p className="text-foreground font-black text-sm">{fmtINR(principal)}</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-brand-green/10 border border-brand-green/20">
                            <p className="text-brand-green/80 text-[10px] uppercase font-bold mb-0.5">{t('lumpsum.wealthGained')}</p>
                            <p className="text-brand-green font-black text-sm">{fmtINR(result.fv - principal)}</p>
                        </div>
                    </div>
                </motion.div>

                {/* SMART INSIGHT (Dynamic) */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${insight.type === 'warn' ? 'bg-amber-500/10 border-amber-500/30' : insight.type === 'success' ? 'bg-brand-green/10 border-brand-green/30' : 'bg-brand-blue/10 border-brand-blue/30'}`}>
                    <BrainCircuit size={18} className={`shrink-0 mt-0.5 ${insight.type === 'warn' ? 'text-amber-500' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-blue'}`} />
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${insight.type === 'warn' ? 'text-amber-600' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-blue'}`}>{t('lumpsum.smartInsight')}</p>
                        <p className={`text-xs font-medium leading-relaxed ${insight.type === 'warn' ? 'text-amber-700 dark:text-amber-400' : insight.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-300'}`}>{insight.msg}</p>
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
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                            {t('common.investmentDateHint', 'Used for tracking in My Loans')}
                        </p>
                    </div>
                )}

                {/* SAVE BUTTON */}
                {saved ? (
                    <div className="flex gap-2">
                        <div className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <Check size={16} /> {t('common.saved')}
                        </div>
                        <button onClick={() => navigate('/my-loans')}
                            className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-brand-blue/10 text-brand-blue border border-brand-blue/20 transition-all active:scale-95">
                            {t('common.viewInMyLoans', 'View')}
                        </button>
                        <button onClick={handleRemove}
                            className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 transition-all active:scale-95">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ) : (
                    <button onClick={handleSave} className="w-full py-3.5 rounded-2xl bg-brand-blue text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-brand-blue/20">
                        <Save size={18} /> {t('lumpsum.saveCalculation')}
                    </button>
                )}


                {/* 3. ADVANCED DETAILS */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-brand-blue/10 rounded-lg text-brand-blue"><Activity size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('lumpsum.advancedDetails')}</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-5">
                                    <div className="h-px bg-border w-full -mt-2" />

                                    {/* CAGR & Multiplier */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-4 rounded-2xl bg-background border border-border text-center">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-0.5">{t('lumpsum.cagr')}</p>
                                            <p className="text-brand-blue font-black text-xl mb-1">{result.cagr.toFixed(2)}%</p>
                                            <p className="text-muted-foreground text-[9px] leading-tight px-1">{t('lumpsum.effectiveAnnualGrowthRate')}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-background border border-border text-center">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-0.5">{t('lumpsum.wealthMultiplier')}</p>
                                            <p className="text-brand-green font-black text-xl mb-1">{result.wealthRatio.toFixed(1)}x</p>
                                            <p className="text-muted-foreground text-[9px] leading-tight px-1">{t('lumpsum.moneyGrewTimes', { times: result.wealthRatio.toFixed(1) })}</p>
                                        </div>
                                    </div>

                                    {/* Inflation Adjusted Return */}
                                    <div className="bg-gradient-to-br from-background to-muted p-4 rounded-2xl border border-border space-y-3">
                                        <div className="flex justify-between items-center">
                                            <p className="text-foreground text-xs font-bold flex items-center gap-1.5"><ShieldAlert size={14} className="text-amber-500"/> {t('lumpsum.inflationImpact')}</p>
                                            <div className="flex items-center gap-1.5 bg-card border border-border px-2 py-1 rounded-lg">
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase">{t('lumpsum.rate')}</span>
                                                <input type="number" className="w-8 bg-transparent text-xs font-bold text-amber-500 outline-none p-0 text-center" value={inflation} onChange={e => setInflation(Number(e.target.value)||0)} />
                                                <span className="text-[10px] text-muted-foreground font-bold">%</span>
                                            </div>
                                        </div>
                                        
                                        <div className="p-3 rounded-xl bg-card border border-border/50 grid grid-cols-2 gap-2 mt-2">
                                            <div>
                                                <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('lumpsum.realReturnRate')}</p>
                                                <p className={`font-black text-sm ${result.realRate > 0 ? 'text-brand-green' : 'text-red-500'}`}>{result.realRate.toFixed(2)}%</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('lumpsum.realPurchasingPower')}</p>
                                                <p className="font-bold text-sm text-foreground">{fmtINR(result.realValue)}</p>
                                            </div>
                                        </div>
                                        
                                        {result.wealthErosion > 0 && (
                                            <p className="text-muted-foreground text-[10px] text-center italic mt-1 pb-1">
                                                {t('lumpsum.wealthErosionDueToInflation')}: <span className="text-amber-500 font-bold">-{fmtINR(result.wealthErosion)}</span>
                                            </p>
                                        )}
                                    </div>

                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


                {/* 4. GOAL MATCHING (POWER FEATURE) */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowGoal(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500"><Target size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('lumpsum.targetGoalMatcher')}</span>
                        </div>
                        {showGoal ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showGoal && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-4">
                                    <div className="h-px bg-border w-full -mt-2" />
                                    
                                    <div>
                                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('lumpsum.whatIsYourTargetAmount')}</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                                            <input type="number" value={targetAmount} onChange={e => setTargetAmount(Number(e.target.value)||0)} className={inputCls + " pl-7 border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500/20"} />
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-2xl border ${goalData.achievable ? 'bg-brand-green/10 border-brand-green/30' : 'bg-background border-border'}`}>
                                        {goalData.achievable ? (
                                            <div className="text-center py-2">
                                                <p className="text-brand-green tracking-tight font-black text-lg mb-1">{t('lumpsum.goalReached')}</p>
                                                <p className="text-brand-green/80 text-[11px] font-bold">{t('lumpsum.maturityExceedsTarget', { maturity: fmtINR(result.fv) })}</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <p className="text-amber-500 text-[10px] font-black uppercase tracking-wider text-center">{t('lumpsum.shortfall')}: {fmtINR(goalData.gap)}</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-card border border-border/50 p-2.5 rounded-xl text-center">
                                                        <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('lumpsum.requiredTime')}</p>
                                                        <p className="text-foreground font-black text-sm">{goalData.requiredYears.toFixed(1)} <span className="text-[10px] font-bold">{t('lumpsum.yrs')}</span></p>
                                                    </div>
                                                    <div className="bg-card border border-border/50 p-2.5 rounded-xl text-center">
                                                        <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('lumpsum.requiredRate')}</p>
                                                        <p className="text-foreground font-black text-sm">{goalData.requiredRate.toFixed(1)} <span className="text-[10px] font-bold">{t('lumpsum.percentPA')}</span></p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


                {/* 5. WHAT-IF SIMULATOR */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowWhatIf(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-500"><TrendingUp size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('lumpsum.whatIfSimulator')}</span>
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
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('lumpsum.investedAmount')}</span>
                                            <span className="text-sm font-black text-blue-500">{fmtINR(simPrincipal)}</span>
                                        </div>
                                        <input type="range" min={1000} max={principal * 3} step={5000} value={simPrincipal} onChange={e => setSimPrincipal(Number(e.target.value))} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('lumpsum.expectedReturn')}</span>
                                            <span className="text-sm font-black text-emerald-500">{simRate}%</span>
                                        </div>
                                        <input type="range" min={1} max={30} step={0.5} value={simRate} onChange={e => setSimRate(Number(e.target.value))} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('lumpsum.timePeriod')}</span>
                                            <span className="text-sm font-black text-rose-500">{simYears} {t('lumpsum.yrs')}</span>
                                        </div>
                                        <input type="range" min={1} max={40} step={1} value={simYears} onChange={e => setSimYears(Number(e.target.value))} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-rose-500" />
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-600 text-center">
                                        <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">{t('lumpsum.simulatedValue')}</p>
                                        <p className="font-black text-2xl text-foreground mb-1">{fmtINR(simResult)}</p>
                                        <p className="text-emerald-600 dark:text-brand-green text-xs font-bold">+ {fmtINR(simResult - simPrincipal)} {t('lumpsum.totalGain')}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


                {/* 6. YEAR-BY-YEAR GROWTH TABLE */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden mb-6">
                    <button onClick={() => setShowTable(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-500"><FileText size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('lumpsum.yearWiseTimeline')}</span>
                        </div>
                        {showTable ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showTable && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 pt-1">
                                    <div className="rounded-2xl overflow-hidden border border-border mt-2">
                                        <div className="grid grid-cols-3 bg-muted px-3 py-2.5">
                                            {[t('lumpsum.year'), t('lumpsum.totalValue'), t('lumpsum.gain')].map(h => (<p key={h} className="text-muted-foreground text-[10px] font-black uppercase tracking-wider">{h}</p>))}
                                        </div>
                                        <div className="divide-y divide-border/50">
                                            {result.table.slice((page - 1) * 10, page * 10).map((row) => (
                                                <div key={row.year} className="grid grid-cols-3 px-3 py-3 bg-background items-center">
                                                    <p className="text-foreground text-xs font-bold">{t('lumpsum.yr')} {row.year}</p>
                                                    <p className="text-foreground text-xs font-bold font-mono">{fmtINR(row.value)}</p>
                                                    <div className="flex flex-col">
                                                        <p className="text-brand-green text-xs font-bold font-mono">+{fmtINR(row.gain)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {/* Pagination */}
                                        {result.table.length > 10 && (
                                            <div className="bg-muted px-3 py-2.5 flex justify-between items-center border-t border-border">
                                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('lumpsum.page')} {page} {t('lumpsum.of')} {Math.ceil(result.table.length / 10)}</p>
                                                <button disabled={page === Math.ceil(result.table.length / 10)} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
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
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-brand-blue/5 border border-brand-blue/20 text-brand-blue font-bold text-xs transition-colors hover:bg-brand-blue/10 active:scale-95"
                    >
                        <FileText size={20} /> {t('lumpsum.exportReport')}
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-brand-green/5 border border-brand-green/20 text-brand-green font-bold text-xs transition-colors hover:bg-brand-green/10 active:scale-95"
                    >
                        <FileText size={20} /> {t('lumpsum.excelData')}
                    </button>
                </div>
            </div>

            <DisclaimerComponent module="lumpsum" />
        </div>
    );
}
