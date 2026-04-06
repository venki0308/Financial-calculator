import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronUp, Save, Check, ShieldAlert, FileText, ChevronLeft, ChevronRight, Activity, BrainCircuit, TrendingUp, Target, BarChart2, RotateCw, Info, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import { useCalculatorStore } from '../store/useCalculatorStore';
import DateInput from '../components/DateInput';
import LiveStatusCard from '../components/LiveStatusCard';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { calculateRdStatus, type RdStatusInput } from '../utils/investmentStatusEngine';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function RDCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addSaved, removeSaved } = useCalculatorStore();

    useEffect(() => { AnalyticsService.trackScreen('RD_Advanced'); }, []);

    // Base Inputs
    const [monthly, setMonthly] = useState(5000);
    const [rate, setRate] = useState(6.7);
    const [months, setMonths] = useState(12);
    const [isSeniorCitizen, setIsSeniorCitizen] = useState(false);
    const effectiveRate = isSeniorCitizen ? rate + 0.5 : rate;

    // Live Status
    const [rdStartDate, setRdStartDate] = useState('');

    const rdStatus = useMemo(() => {
        if (!rdStartDate) return null;
        return calculateRdStatus({
            monthlyDeposit: monthly,
            annualRate: effectiveRate,
            tenureMonths: months,
            startDate: rdStartDate,
        });
    }, [rdStartDate, monthly, effectiveRate, months]);

    // Advanced Inputs
    const [inflationRate, setInflationRate] = useState(6.0);
    const [whatIfExtra, setWhatIfExtra] = useState(1000);

    // UI States
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showWhatIf, setShowWhatIf] = useState(false);
    const [showTable, setShowTable] = useState(false);
    const [saved, setSaved] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);
    const [page, setPage] = useState(1);

    // 1. CORE CALCULATION — RBI standard: quarterly compounding at whole-quarter boundaries.
    // Each monthly deposit earns interest for the number of complete quarters from the
    // start of its deposit quarter to the end of the tenure.
    const result = useMemo(() => {
        const r = (effectiveRate || 0) / 400; // quarterly rate (annual / 4 / 100)
        const validMonths = Math.max(1, months || 1);
        const validMonthly = Math.max(1, monthly || 0);
        const totalQuarters = Math.ceil(validMonths / 3);

        // Maturity: each deposit in quarter q earns (totalQuarters - q) whole quarters
        let maturity = 0;
        for (let i = 1; i <= validMonths; i++) {
            const depositQIdx = Math.floor((i - 1) / 3);
            maturity += validMonthly * Math.pow(1 + r, totalQuarters - depositQIdx);
        }

        // Schedule: balance shown after each month, with interest credited at quarter-end
        const schedule: { month: number; deposit: number; interestEarned: number; cumInterest: number; balance: number }[] = [];
        let prevCumInterest = 0;

        for (let i = 1; i <= validMonths; i++) {
            const currentQIdx = Math.floor((i - 1) / 3);
            const isQEnd = (i % 3 === 0) || (i === validMonths); // quarter-end or last month

            let balance = 0;
            for (let j = 1; j <= i; j++) {
                const depositQIdx = Math.floor((j - 1) / 3);
                const completedQ = currentQIdx - depositQIdx + (isQEnd ? 1 : 0);
                balance += validMonthly * Math.pow(1 + r, completedQ);
            }

            const cumInterest = Math.max(0, balance - validMonthly * i);
            schedule.push({
                month: i,
                deposit: validMonthly,
                interestEarned: Math.max(0, cumInterest - prevCumInterest),
                cumInterest,
                balance
            });
            prevCumInterest = cumInterest;
        }

        const invested = validMonthly * validMonths;
        const totalInterest = Math.max(0, maturity - invested);
        const effectiveYield = (Math.pow(1 + r, 4) - 1) * 100;

        // Inflation Impact
        const realRate = ((1 + (effectiveYield / 100)) / (1 + (inflationRate / 100)) - 1) * 100;
        const purchasingPower = maturity / Math.pow(1 + inflationRate / 100, validMonths / 12);

        // Composition
        const interestPct = maturity > 0 ? (totalInterest / maturity) * 100 : 0;
        const principalPct = maturity > 0 ? (invested / maturity) * 100 : 0;

        return { maturity, invested, totalInterest, effectiveYield, realRate, purchasingPower, interestPct, principalPct, schedule, validMonths, validMonthly };
    }, [monthly, effectiveRate, months, inflationRate]);

    // 2. WHAT-IF SIMULATOR
    const whatIf = useMemo(() => {
        const extraM = Math.max(100, whatIfExtra || 0);
        const newMonthly = result.validMonthly + extraM;
        const r = (effectiveRate || 0) / 400;
        const totalQuarters = Math.ceil(result.validMonths / 3);

        let newMaturity = 0;
        for (let i = 1; i <= result.validMonths; i++) {
            const depositQIdx = Math.floor((i - 1) / 3);
            newMaturity += newMonthly * Math.pow(1 + r, totalQuarters - depositQIdx);
        }

        const addedWealth = newMaturity - result.maturity;
        const extraInvested = extraM * result.validMonths;
        const extraInterest = addedWealth - extraInvested;

        return { newMonthly, newMaturity, addedWealth, extraInvested, extraInterest };
    }, [whatIfExtra, result, effectiveRate]);

    // 3. SMART INSIGHTS
    const insight = useMemo(() => {
        if (result.effectiveYield > inflationRate + 1.5) {
            return { msg: t('rd.insightGoodChoice', { effectiveYield: result.effectiveYield.toFixed(2), inflationRate }), type: 'success' };
        }
        if (result.interestPct > 35) {
             return { msg: t('rd.insightLongTenure', { interestPct: result.interestPct.toFixed(1) }), type: 'success' };
        }
        if (result.effectiveYield <= inflationRate) {
             return { msg: t('rd.insightInflationWarning', { realRate: result.realRate.toFixed(2), purchasingPower: fmtINR(result.purchasingPower) }), type: 'warn' };
        }
        return { msg: t('rd.insightCompounding', { rate, effectiveYield: result.effectiveYield.toFixed(2) }), type: 'info' };
    }, [result, rate, inflationRate, t]);

    const handleSave = () => {
        const calcId = `rd-${Date.now()}`;
        addSaved({
            id: calcId,
            calculatorType: 'rd',
            inputValues: { monthly, rate, months },
            resultValues: { primary: result.maturity, label: t('rd.maturityAmount'), invested: result.invested, returns: result.totalInterest },
            timestamp: Date.now(),
        });
        setSaved(true);
        setLastSavedId(calcId);
    };

    const handleRemove = () => {
        if (lastSavedId) {
            removeSaved(lastSavedId);
            setLastSavedId(null);
            setSaved(false);
        }
    };

    const handleDownloadPDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const config: ExportConfig = {
            title: t('rd.reportTitle'),
            inputs: [
                { label: t('rd.monthlyDeposit'), value: `₹${monthly.toLocaleString('en-IN')}` },
                { label: t('rd.interestRate'), value: `${effectiveRate}% ${t('rd.perAnnum')}${isSeniorCitizen ? ` (${t('rd.seniorExtra')})` : ''}` },
                { label: t('rd.tenure'), value: `${months} ${t('rd.months')}` },
                { label: t('rd.assumedInflation'), value: `${inflationRate}% ${t('rd.perAnnum')}` },
            ],
            results: [
                { label: t('rd.totalInvested'), value: `₹${Math.round(result.invested).toLocaleString('en-IN')}` },
                { label: t('rd.interestEarned'), value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
                { label: t('rd.maturityAmount'), value: `₹${Math.round(result.maturity).toLocaleString('en-IN')}` },
                { label: t('rd.effectiveAnnualYield'), value: `${result.effectiveYield.toFixed(2)}%` },
                { label: t('rd.purchasingPowerInflAdj'), value: `₹${Math.round(result.purchasingPower).toLocaleString('en-IN')}` },
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: t('rd.totalDeposits'), value: result.invested, color: '#4F46E5' },
                    { label: t('rd.interestEarned'), value: result.totalInterest, color: '#10B981' },
                ],
            },
            projectionTitle: t('rd.monthlyRdSchedule'),
            projectionColumns: [t('rd.month'), t('rd.monthlyDeposit'), t('rd.interestAccrued'), t('rd.cumulativeInterest'), t('rd.balance')],
            projectionRows: result.schedule.map((r: any) => [
                `${t('rd.month')} ${r.month}`,
                `₹${Math.round(r.deposit).toLocaleString('en-IN')}`,
                `₹${Math.round(r.interestEarned).toLocaleString('en-IN')}`,
                `₹${Math.round(r.cumInterest).toLocaleString('en-IN')}`,
                `₹${Math.round(r.balance).toLocaleString('en-IN')}`,
            ]),
            additionalTables: [
                ...(rdStatus ? [{
                    title: t('rd.liveStatusAsOf', { date: new Date().toLocaleDateString('en-IN') }),
                    columns: [t('rd.metric'), t('rd.value')],
                    rows: [
                        [t('rd.monthsCompleted'), String(rdStatus.monthsInvested)],
                        [t('rd.totalDeposited'), formatINR(rdStatus.totalDeposited)],
                        [t('rd.interestEarned'), formatINR(rdStatus.interestEarned)],
                        [t('rd.currentValue'), formatINR(rdStatus.currentValue)],
                        [t('rd.monthsRemaining'), String(rdStatus.monthsRemaining)],
                        [t('rd.maturityDate'), rdStatus.maturityDate],
                    ] as Array<Array<string | number>>,
                }] : []),
            ],
            filename: `FinCalix_RD_Report_${tag}`,
        };
        await exportToPDF(config);
    };

    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const config: ExportConfig = {
            title: t('rd.reportTitle'),
            inputs: [
                { label: t('rd.monthlyDeposit'), value: `₹${monthly.toLocaleString('en-IN')}` },
                { label: t('rd.interestRate'), value: `${effectiveRate}% ${t('rd.perAnnum')}${isSeniorCitizen ? ` (${t('rd.seniorExtra')})` : ''}` },
                { label: t('rd.tenure'), value: `${months} ${t('rd.months')}` },
            ],
            results: [
                { label: t('rd.totalInvested'), value: `₹${Math.round(result.invested).toLocaleString('en-IN')}` },
                { label: t('rd.interestEarned'), value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
                { label: t('rd.maturityAmount'), value: `₹${Math.round(result.maturity).toLocaleString('en-IN')}` },
            ],
            projectionTitle: t('rd.monthlyRdSchedule'),
            projectionColumns: [t('rd.month'), t('rd.monthlyDeposit'), t('rd.interestAccrued'), t('rd.cumulativeInterest'), t('rd.balance')],
            projectionRows: result.schedule.map((r: any) => [r.month, Math.round(r.deposit), Math.round(r.interestEarned), Math.round(r.cumInterest), Math.round(r.balance)]),
            additionalTables: [
                ...(rdStatus ? [{
                    title: t('rd.liveStatusAsOf', { date: new Date().toLocaleDateString('en-IN') }),
                    columns: [t('rd.metric'), t('rd.value')],
                    rows: [
                        [t('rd.monthsCompleted'), String(rdStatus.monthsInvested)],
                        [t('rd.totalDeposited'), formatINR(rdStatus.totalDeposited)],
                        [t('rd.interestEarned'), formatINR(rdStatus.interestEarned)],
                        [t('rd.currentValue'), formatINR(rdStatus.currentValue)],
                        [t('rd.monthsRemaining'), String(rdStatus.monthsRemaining)],
                        [t('rd.maturityDate'), rdStatus.maturityDate],
                    ] as Array<Array<string | number>>,
                }] : []),
            ],
            filename: `FinCalix_RD_Report_${tag}`,
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
                        <h1 className="text-lg font-bold text-foreground leading-tight">{t('rd.rdCalculator')}</h1>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{t('rd.recurringDeposit')}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 space-y-5">
                {/* 1. CORE INPUTS */}
                <div className="space-y-4">
                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('rd.monthlyDeposit')}</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={monthly} onChange={e => setMonthly(Number(e.target.value)||0)} className={inputCls + " pl-7 bg-brand-blue/5 focus:bg-card"} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('rd.interestRate')}</label>
                            <div className="relative">
                                <input type="number" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value)||0)} className={inputCls + " pr-7 bg-muted/30 focus:bg-card"} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('rd.timePeriod')}</label>
                            <div className="relative">
                                <input type="number" value={months} onChange={e => setMonths(Number(e.target.value)||0)} className={inputCls + " pr-10 bg-muted/30 focus:bg-card"} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold">{t('rd.moAbbr')}</span>
                            </div>
                        </div>
                    </div>
                    {/* Senior Citizen Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                        <div>
                            <span className="text-xs font-medium text-foreground">{t('rd.seniorCitizen')}</span>
                            <p className="text-[10px] text-muted-foreground">{t('rd.seniorCitizenExtraRate')}</p>
                        </div>
                        <button onClick={() => setIsSeniorCitizen(!isSeniorCitizen)}
                            className={`w-12 h-6 rounded-full transition-all relative ${isSeniorCitizen ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isSeniorCitizen ? 'left-[26px]' : 'left-0.5'}`} />
                        </button>
                    </div>
                    {isSeniorCitizen && (
                        <p className="text-[10px] text-emerald-500 font-medium -mt-1">{t('rd.effectiveRateLabel', { effectiveRate, baseRate: rate })}</p>
                    )}
                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('rd.rdStartDate')}</label>
                        <DateInput
                            value={rdStartDate}
                            onChange={setRdStartDate}
                            max={new Date().toISOString().split('T')[0]}
                            className={inputCls}
                        />
                    </div>
                </div>

                {/* 2. RESULTS HERO */}
                <motion.div layout className="p-6 rounded-3xl bg-card border border-border shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-bold">{t('rd.maturityAmount')}</p>
                        <div className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-brand-blue/10 border-brand-blue/20 text-brand-blue">
                            {t('rd.yield')}: {result.effectiveYield.toFixed(2)}%
                        </div>
                    </div>
                    
                    <p className="text-4xl font-black text-foreground tracking-tight mb-5 drop-shadow-sm">
                        {fmtINR(result.maturity)}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3.5 rounded-2xl bg-background border border-border/50">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-0.5">{t('rd.totalInvested')}</p>
                            <p className="text-foreground font-black text-sm">{fmtINR(result.invested)}</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-brand-green/10 border border-brand-green/20">
                            <p className="text-brand-green text-[10px] uppercase font-bold mb-0.5">{t('rd.wealthGained')}</p>
                            <p className="text-brand-green font-black text-sm">+{fmtINR(result.totalInterest)}</p>
                        </div>
                    </div>
                </motion.div>

                {/* SMART INSIGHT (Dynamic) */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${insight.type === 'warn' ? 'bg-amber-500/10 border-amber-500/30' : insight.type === 'success' ? 'bg-brand-green/10 border-brand-green/30' : 'bg-brand-blue/10 border-brand-blue/30'}`}>
                    <BrainCircuit size={18} className={`shrink-0 mt-0.5 ${insight.type === 'warn' ? 'text-amber-500' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-blue'}`} />
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${insight.type === 'warn' ? 'text-amber-600' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-blue'}`}>{t('rd.smartInsight')}</p>
                        <p className={`text-xs font-medium leading-relaxed ${insight.type === 'warn' ? 'text-amber-700 dark:text-amber-400' : insight.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-300'}`}>{insight.msg}</p>
                    </div>
                </div>

                {/* SAVE BUTTON */}
                {saved ? (
                    <div className="flex gap-2">
                        <div className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <Check size={16} /> {t('common.saved')}
                        </div>
                        <button onClick={handleRemove}
                            className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 transition-all active:scale-95">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ) : (
                    <button onClick={handleSave} className="w-full py-3.5 rounded-2xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-foreground/10">
                        <Save size={18} /> {t('rd.saveCalculation')}
                    </button>
                )}


                {/* 3. ADVANCED DETAILS */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-brand-blue/10 rounded-lg text-brand-blue"><Activity size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('rd.advancedDetails')}</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-5">
                                    <div className="h-px bg-border w-full -mt-2" />

                                    {/* Real Return & Purchasing Power */}
                                    <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-background to-muted">
                                        <div className="flex justify-between items-center mb-3">
                                             <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{t('rd.inflationAdjuster')}</p>
                                             <div className="flex items-center gap-1.5">
                                                 <span className="text-[10px] font-bold text-muted-foreground">{t('rd.inflPercent')}</span>
                                                 <input type="number" step="0.1" value={inflationRate} onChange={e => setInflationRate(Number(e.target.value)||0)} className="w-14 bg-card border border-border rounded px-2 py-0.5 text-xs focus:outline-none" />
                                             </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div className="bg-card p-3 rounded-xl border border-border/50 text-center">
                                                 <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('rd.realYield')}</p>
                                                 <p className={`font-black text-sm ${result.realRate > 0 ? 'text-brand-green' : 'text-rose-500'}`}>{result.realRate.toFixed(2)}%</p>
                                            </div>
                                            <div className="bg-card p-3 rounded-xl border border-border/50 text-center">
                                                 <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('rd.purchasingPower')}</p>
                                                 <p className="text-foreground font-black text-sm">{fmtINR(result.purchasingPower)}</p>
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-muted-foreground leading-tight px-1 text-center">
                                            {t('rd.dueToInflation', { maturity: fmtINR(result.maturity), purchasingPower: fmtINR(result.purchasingPower) })}
                                        </p>
                                    </div>

                                    {/* Composition Bar */}
                                    <div>
                                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-2">{t('rd.finalValueComposition')}</p>
                                        <div className="h-4 w-full rounded-full flex overflow-hidden bg-brand-green/20">
                                            <div className="h-full bg-foreground transition-all duration-1000" style={{ width: `${result.principalPct}%` }} />
                                            <div className="h-full bg-brand-green transition-all duration-1000" style={{ width: `${result.interestPct}%` }} />
                                        </div>
                                        <div className="flex justify-between mt-2">
                                            <p className="text-[10px] font-bold text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full bg-foreground mr-1" /> {t('rd.principal')}: {result.principalPct.toFixed(1)}%</p>
                                            <p className="text-[10px] font-bold text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full bg-brand-green mr-1" /> {t('rd.interestLabel')}: {result.interestPct.toFixed(1)}%</p>
                                        </div>
                                    </div>

                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


                {/* 4. WHAT-IF SIMULATOR */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowWhatIf(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500"><RotateCw size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('rd.whatIfSimulator')}</span>
                        </div>
                        {showWhatIf ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showWhatIf && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-4">
                                    <div className="h-px bg-border w-full -mt-2" />
                                    
                                    <div>
                                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('rd.whatIfExtraDeposit')}</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">+₹</span>
                                            <input type="number" value={whatIfExtra} onChange={e => setWhatIfExtra(Number(e.target.value)||0)} className={inputCls + " pl-8 border-amber-500/30"} />
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl border bg-amber-500/5 border-amber-500/20 text-center">
                                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-wider mb-3">{t('rd.revisedOutcome')}</p>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                 <p className="text-amber-600 dark:text-amber-400 text-[10px] font-bold mb-0.5">{t('rd.newMaturity')}</p>
                                                 <p className="text-foreground font-black text-base">{fmtINR(whatIf.newMaturity)}</p>
                                            </div>
                                            <div>
                                                 <p className="text-amber-600 dark:text-amber-400 text-[10px] font-bold mb-0.5">{t('rd.extraWealth')}</p>
                                                 <p className="text-brand-green font-black text-base">+{fmtINR(whatIf.addedWealth)}</p>
                                            </div>
                                        </div>
                                        <div className="bg-card p-2 rounded-xl border border-border/50 text-[10px] text-muted-foreground flex gap-2 text-left">
                                             <Info size={14} className="text-amber-500 shrink-0"/>
                                             <p>{t('rd.justExtraYields', { extra: whatIfExtra, bonus: Math.round(whatIf.extraInterest) })}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 5. MONTH-WISE SCHEDULE TABLE */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden mb-6">
                    <button onClick={() => setShowTable(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-foreground rounded-lg text-background"><BarChart2 size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('rd.monthlySchedule')}</span>
                        </div>
                        {showTable ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showTable && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 pt-1">
                                    <div className="rounded-2xl overflow-hidden border border-border mt-2">
                                        <div className="grid grid-cols-3 bg-muted px-3 py-2.5">
                                            {[t('rd.month'), t('rd.totalDeposit'), t('rd.balance')].map(h => (<p key={h} className="text-muted-foreground text-[10px] font-black uppercase tracking-wider">{h}</p>))}
                                        </div>
                                        <div className="divide-y divide-border/50">
                                            {result.schedule.slice((page - 1) * 12, page * 12).map((row) => (
                                                <div key={row.month} className="grid grid-cols-3 px-3 py-3 bg-background items-center">
                                                    <p className="text-foreground text-xs font-bold">{t('rd.mo')} {row.month}</p>
                                                    <p className="text-muted-foreground text-xs font-mono">{fmtINR(row.deposit * row.month)}</p>
                                                    <div>
                                                        <p className="text-foreground text-xs font-bold font-mono">{fmtINR(row.balance)}</p>
                                                        <p className="text-brand-green text-[9px] font-mono mt-0.5">+{fmtINR(row.cumInterest)} {t('rd.int')}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {/* Pagination */}
                                        {result.schedule.length > 12 && (
                                            <div className="bg-muted px-3 py-2.5 flex justify-between items-center border-t border-border">
                                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('rd.page')} {page} {t('rd.of')} {Math.ceil(result.schedule.length / 12)}</p>
                                                <button disabled={page === Math.ceil(result.schedule.length / 12)} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-center text-[9px] text-muted-foreground mt-3 uppercase tracking-widest font-bold">{t('rd.quarterlyCompoundedRbi')}</p>
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
                        <FileText size={20} /> {t('rd.exportReport')}
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-brand-green/5 border border-brand-green/20 text-brand-green font-bold text-xs transition-colors hover:bg-brand-green/10 active:scale-95"
                    >
                        <FileText size={20} /> {t('rd.excelData')}
                    </button>
                </div>
            </div>

            {rdStatus && (
                <div className="px-4 mb-5">
                    <LiveStatusCard
                        calculatorType="RD"
                        profileData={{ monthlyDeposit: monthly, annualRate: effectiveRate, tenureMonths: months, startDate: rdStartDate }}
                        title={t('rd.liveRdStatus')}
                        subtitle={t('rd.liveRdSubtitle', { months, effectiveRate })}
                        startDate={rdStartDate}
                        metrics={[
                            { label: t('rd.deposited'), value: fmtINR(rdStatus.totalDeposited) },
                            { label: t('rd.interest'), value: fmtINR(rdStatus.interestEarned), color: 'amber' },
                            { label: t('rd.currentValue'), value: fmtINR(rdStatus.currentValue), color: 'green' },
                        ]}
                        progressPercent={rdStatus.percentComplete}
                        progressLabel={t('rd.progressLabel', { monthsInvested: rdStatus.monthsInvested, months, percentComplete: rdStatus.percentComplete.toFixed(1) })}
                        insightText={rdStatus.monthsRemaining > 0 ? t('rd.insightMaturityPending', { maturityDate: rdStatus.maturityDate, maturityValue: fmtINR(rdStatus.maturityValue) }) : t('rd.insightMatured', { maturityValue: fmtINR(rdStatus.maturityValue) })}
                    />
                </div>
            )}

            <DisclaimerComponent module="rd" />
        </div>
    );
}
