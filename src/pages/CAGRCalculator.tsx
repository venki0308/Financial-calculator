import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronUp, Save, Check, ShieldAlert, FileText, ChevronLeft, ChevronRight, Activity, BrainCircuit, TrendingUp, Target, BarChart2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, type ExportConfig } from '../utils/exportReport';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useLiveStatusStore } from '../store/useLiveStatusStore';
import DateInput from '../components/DateInput';
import SnapshotPreviewCard from '../components/SnapshotPreviewCard';
import DisclaimerComponent from '../components/DisclaimerComponent';
import SaveNameDialog from '../components/SaveNameDialog';
import { useHistoryTracker } from '../hooks/useHistoryTracker';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function CAGRCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addSaved, removeSaved } = useCalculatorStore();
    const addProfile = useLiveStatusStore(s => s.addProfile);
    const removeProfile = useLiveStatusStore(s => s.removeProfile);

    useEffect(() => { AnalyticsService.trackScreen('CAGR_Advanced'); }, []);

    // Base Inputs
    const [initial, setInitial] = useState(100000);
    const [final, setFinal] = useState(200000);
    const [years, setYears] = useState(5);

    // Goal Planning
    const [targetAmount, setTargetAmount] = useState(500000);

    // UI States
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showGoal, setShowGoal] = useState(false);
    const [showTable, setShowTable] = useState(false);
    const [saved, setSaved] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);
    const [investmentDate, setInvestmentDate] = useState('');
    const [showNameDialog, setShowNameDialog] = useState(false);
    const [page, setPage] = useState(1);

    // 1. CORE CALCULATION
    const result = useMemo(() => {
        // Handle edge cases
        const validInitial = Math.max(1, initial);
        const validFinal = Math.max(validInitial, final);
        const validYears = Math.max(0.1, years);

        const cagr = (Math.pow(validFinal / validInitial, 1 / validYears) - 1) * 100;
        const absReturn = ((validFinal / validInitial) - 1) * 100;
        
        let doubleTime = 0;
        if (cagr > 0) doubleTime = 72 / cagr;
        else if (cagr < 0) doubleTime = -1; // Never

        // Investment Quality Tag
        let qualityTag = t('cagr.qualityLowGrowth'); let qualityColor = 'text-rose-500'; let qualityBg = 'bg-rose-500/10 border-rose-500/20';
        if (cagr > 15) { qualityTag = t('cagr.qualityAggressive'); qualityColor = 'text-brand-green'; qualityBg = 'bg-brand-green/10 border-brand-green/20'; }
        else if (cagr >= 8) { qualityTag = t('cagr.qualityGood'); qualityColor = 'text-blue-500'; qualityBg = 'bg-blue-500/10 border-blue-500/20'; }

        // Year-wise schedule
        // In reality, CAGR implies a smooth curve. We just show the theoretical year-end values.
        const schedule: { year: number; value: number; growthPct: number }[] = [];
        let curVal = validInitial;
        for (let y = 1; y <= Math.ceil(validYears); y++) {
             const t = Math.min(y, validYears);
             const v = validInitial * Math.pow(1 + cagr / 100, t);
             const growth = y === 1 ? ((v / validInitial) - 1)*100 : cagr;
             schedule.push({ year: y, value: v, growthPct: growth });
        }

        return { cagr, absReturn, doubleTime, qualityTag, qualityColor, qualityBg, schedule, validInitial, validFinal, validYears };
    }, [initial, final, years, t]);

    useHistoryTracker('CAGR Calculator', { initial, final, years }, { cagr: result.cagr, returns: result.validFinal - result.validInitial }, result.validFinal);

    // 2. GOAL MATCHING ENGINE
    const goalData = useMemo(() => {
        if (targetAmount <= result.validInitial) return { requiredYears: 0, requiredRate: 0, gap: 0, achievable: true };
        
        // If we keep the same CAGR, how many years total to reach target from initial?
        let reqYears = 0;
        if (result.cagr > 0) {
            reqYears = Math.log(targetAmount / result.validInitial) / Math.log(1 + (result.cagr / 100));
        }

        // If we keep the same years, what CAGR is needed?
        const reqCagr = result.validYears > 0 ? (Math.pow(targetAmount / result.validInitial, 1 / result.validYears) - 1) * 100 : 0;
        const gap = targetAmount - result.validFinal;

        return {
            requiredYears: reqYears > 0 ? reqYears : 0,
            requiredRate: reqCagr > 0 ? reqCagr : 0,
            gap,
            achievable: gap <= 0
        };
    }, [targetAmount, result]);

    // 3. SMART INSIGHTS
    const insight = useMemo(() => {
        if (result.doubleTime > 0 && result.doubleTime <= result.validYears) {
            return { msg: t('cagr.insightStrongPerformance', { doubleTime: result.doubleTime.toFixed(1) }), type: 'success' };
        }
        if (result.cagr < 6) {
            return { msg: t('cagr.insightLowCAGR', { cagr: result.cagr.toFixed(1) }), type: 'warn' };
        }
        if (result.absReturn > 100 && result.cagr < 10) {
             return { msg: t('cagr.insightHighAbsLowCAGR', { absReturn: result.absReturn.toFixed(0), cagr: result.cagr.toFixed(1) }), type: 'info' };
        }
        return { msg: t('cagr.insightSteadyGrowth', { cagr: result.cagr.toFixed(1) }), type: 'info' };
    }, [result, t]);

    const suggestedName = `CAGR — ${formatINR(initial)} → ${formatINR(final)}`;

    const handleSave = (customName: string) => {
        const calcId = `cagr-${Date.now()}`;
        addSaved({
            id: calcId,
            calculatorType: 'cagr',
            inputValues: { initial, final, years, name: customName },
            resultValues: { primary: result.cagr, label: t('cagr.cagrPercent'), invested: initial, returns: final - initial },
            timestamp: Date.now(),
        });
        // Mirror into live tracker store so it appears in My Loans
        addProfile({
            id: calcId,
            name: customName,
            calculatorType: 'CAGR',
            profileData: {
                initialValue: initial,
                finalValue: final,
                principal: initial,
                maturity: final,
                years,
                cagr: result.cagr,
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
            title: 'CAGR Calculator Report',
            inputs: [
                { label: 'Initial Investment', value: `₹${initial.toLocaleString('en-IN')}` },
                { label: 'Final Value', value: `₹${final.toLocaleString('en-IN')}` },
                { label: 'Investment Period', value: `${years} years` },
            ],
            results: [
                { label: 'Compound Annual Growth Rate (CAGR)', value: `${result.cagr.toFixed(2)}%` },
                { label: 'Absolute Return', value: `${result.absReturn.toFixed(2)}%` },
                { label: 'Total Profit Generated', value: `₹${Math.round(final - initial).toLocaleString('en-IN')}` },
                { label: 'Investment Quality', value: result.qualityTag },
                { label: 'Doubling Time (Rule of 72)', value: result.doubleTime > 0 ? `${result.doubleTime.toFixed(1)} years` : 'N/A' },
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: 'Initial Investment', value: initial, color: '#4F46E5' },
                    { label: 'Total Profit', value: final - initial, color: '#10B981' },
                ],
            },
            projectionTitle: 'Yearly Value Progression',
            projectionColumns: ['Year', 'Year-End Value', 'Growth %', 'Abs. Return from Initial'],
            projectionRows: result.schedule.map((r: any) => [
                `Year ${r.year}`,
                `₹${Math.round(r.value).toLocaleString('en-IN')}`,
                `${Number(r.growthPct).toFixed(2)}%`,
                `₹${Math.round(r.value - initial).toLocaleString('en-IN')}`,
            ]),
            filename: `FinCalix_CAGR_Report_${tag}`,
        };
        await exportToPDF(config);
    };

    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const config: ExportConfig = {
            title: 'CAGR Calculator Report',
            inputs: [
                { label: 'Initial Investment', value: `₹${initial.toLocaleString('en-IN')}` },
                { label: 'Final Value', value: `₹${final.toLocaleString('en-IN')}` },
                { label: 'Investment Period', value: `${years} years` },
            ],
            results: [
                { label: 'CAGR', value: `${result.cagr.toFixed(2)}%` },
                { label: 'Absolute Return', value: `${result.absReturn.toFixed(2)}%` },
                { label: 'Total Profit', value: `₹${Math.round(final - initial).toLocaleString('en-IN')}` },
            ],
            projectionTitle: 'Yearly Value Progression',
            projectionColumns: ['Year', 'Year-End Value', 'Growth %', 'Abs. Return'],
            projectionRows: result.schedule.map((r: any) => [
                r.year,
                Math.round(r.value),
                Number(r.growthPct).toFixed(2),
                Math.round(r.value - initial),
            ]),
            filename: `FinCalix_CAGR_Report_${tag}`,
        };
        await exportToExcel(config);
    };

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm font-semibold focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50";

    return (
        <div className="min-h-dvh bg-background pb-28 animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border hover:bg-muted transition-all">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground leading-tight">{t('cagr.title')}</h1>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{t('cagr.subtitle')}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 space-y-5">
                {/* 1. CORE INPUTS */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('cagr.initialValue')}</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                                <input type="number" value={initial} onChange={e => setInitial(Number(e.target.value)||0)} className={inputCls + " pl-7 bg-muted/30 focus:bg-card"} />
                            </div>
                        </div>
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('cagr.finalValue')}</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                                <input type="number" value={final} onChange={e => setFinal(Number(e.target.value)||0)} className={inputCls + " pl-7 bg-brand-purple/5 focus:bg-card"} />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('cagr.timePeriodYears')}</label>
                        <input type="number" step="0.5" value={years} onChange={e => setYears(Number(e.target.value)||0)} className={inputCls} />
                    </div>
                </div>

                {/* 2. RESULTS HERO */}
                <motion.div layout className="p-6 rounded-3xl bg-card border border-border shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-bold">{t('cagr.effectiveCAGR')}</p>
                        <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${result.qualityBg} ${result.qualityColor}`}>
                            {result.qualityTag}
                        </div>
                    </div>
                    
                    <p className="text-5xl font-black text-brand-purple tracking-tighter mb-5">
                        {result.cagr.toFixed(2)}%
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-3.5 rounded-2xl bg-background border border-border/50">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-0.5">{t('cagr.absoluteGain')}</p>
                            <p className="text-foreground font-black text-sm">+{fmtINR(result.validFinal - result.validInitial)}</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-brand-purple/10 border border-brand-purple/20">
                            <p className="text-brand-purple/80 text-[10px] uppercase font-bold mb-0.5">{t('cagr.absoluteReturn')}</p>
                            <p className="text-brand-purple font-black text-sm">{result.absReturn.toFixed(1)}%</p>
                        </div>
                    </div>
                </motion.div>

                {/* SMART INSIGHT (Dynamic) */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${insight.type === 'warn' ? 'bg-amber-500/10 border-amber-500/30' : insight.type === 'success' ? 'bg-brand-green/10 border-brand-green/30' : 'bg-brand-purple/10 border-brand-purple/30'}`}>
                    <BrainCircuit size={18} className={`shrink-0 mt-0.5 ${insight.type === 'warn' ? 'text-amber-500' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-purple'}`} />
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${insight.type === 'warn' ? 'text-amber-600' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-purple'}`}>{t('cagr.smartInsight')}</p>
                        <p className={`text-xs font-medium leading-relaxed ${insight.type === 'warn' ? 'text-amber-700 dark:text-amber-400' : insight.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-purple-700 dark:text-purple-300'}`}>{insight.msg}</p>
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

                {/* CAGR SNAPSHOT — appears the moment user picks a date */}
                {investmentDate && (
                    <SnapshotPreviewCard
                        anchorDate={investmentDate}
                        headline={`${result.cagr.toFixed(2)}%`}
                        headlineLabel={t('cagr.cagrPercent', 'CAGR')}
                        subtitle={t('cagr.snapshotSubtitle', 'Compounded annual growth rate over {{years}} years', { years })}
                        metrics={[
                            { label: t('cagr.initial', 'Initial'), value: fmtINR(initial), tone: 'investment' },
                            { label: t('cagr.final', 'Final'), value: fmtINR(final), tone: 'income' },
                            { label: t('cagr.absReturn', 'Total Return'), value: `${result.absReturn.toFixed(1)}%`, tone: 'neutral' },
                        ]}
                        notes={[
                            { label: t('cagr.wealthMultiplier', 'Multiplier'), value: `${(final / Math.max(1, initial)).toFixed(2)}x` },
                            { label: t('cagr.doublingTime', 'Doubling Time'), value: result.doubleTime > 0 ? `${result.doubleTime.toFixed(1)} yrs` : 'N/A' },
                        ]}
                        label={t('cagr.snapshotTitle', 'CAGR Snapshot')}
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
                        <Save size={18} /> {t('cagr.saveCalculation')}
                    </button>
                )}

                <SaveNameDialog
                    open={showNameDialog}
                    onClose={() => setShowNameDialog(false)}
                    onConfirm={(name) => handleSave(name)}
                    defaultName={suggestedName}
                />



                {/* 3. ADVANCED DETAILS */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-brand-purple/10 rounded-lg text-brand-purple"><Activity size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('cagr.advancedDetails')}</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-5">
                                    <div className="h-px bg-border w-full -mt-2" />

                                    {/* Absolute vs CAGR */}
                                    <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-background to-muted text-center">
                                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-2">{t('cagr.absoluteReturnVsCAGR')}</p>
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div>
                                                 <p className="font-black text-xl text-foreground">{result.absReturn.toFixed(1)}%</p>
                                                 <p className="text-[9px] text-muted-foreground leading-tight px-2 mt-1">{t('cagr.totalGrowthOverPeriod')}</p>
                                            </div>
                                            <div>
                                                 <p className="font-black text-xl text-brand-purple">{result.cagr.toFixed(1)}%</p>
                                                 <p className="text-[9px] text-muted-foreground leading-tight px-2 mt-1">{t('cagr.smoothedAnnualGrowth')}</p>
                                            </div>
                                        </div>
                                        <div className="bg-card p-2 rounded-xl border border-border/50 text-left flex gap-2">
                                            <ShieldAlert size={14} className="text-amber-500 shrink-0 mt-0.5"/>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                                <span className="font-bold text-foreground">{t('cagr.whyCAGR')}</span> {t('cagr.whyCAGRDescription')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Doubling Time */}
                                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center flex items-center justify-between">
                                        <div className="text-left">
                                            <p className="text-amber-600 dark:text-amber-400 text-[10px] uppercase font-bold mb-0.5">{t('cagr.ruleOf72')}</p>
                                            <p className="text-amber-700 dark:text-amber-300 text-xs font-medium">{t('cagr.estimatedDoublingTime')}</p>
                                        </div>
                                        <p className="font-black text-xl text-amber-500">
                                            {result.doubleTime > 0 ? `${result.doubleTime.toFixed(1)}${t('cagr.yShort')}` : t('cagr.na')}
                                        </p>
                                    </div>

                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


                {/* 4. GOAL PLANNING (POWER FEATURE) */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowGoal(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500"><Target size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('cagr.targetGoalMatcher')}</span>
                        </div>
                        {showGoal ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showGoal && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-4">
                                    <div className="h-px bg-border w-full -mt-2" />

                                    <div>
                                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('cagr.whatIsYourTargetAmount')}</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                                            <input type="number" value={targetAmount} onChange={e => setTargetAmount(Number(e.target.value)||0)} className={inputCls + " pl-7 border-emerald-500/30"} />
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-2xl border ${goalData.achievable ? 'bg-brand-green/10 border-brand-green/30' : 'bg-background border-border'}`}>
                                        {goalData.achievable ? (
                                            <div className="text-center py-2">
                                                <p className="text-brand-green tracking-tight font-black text-lg mb-1">{t('cagr.goalAchieved')}</p>
                                                <p className="text-brand-green/80 text-[11px] font-bold">{t('cagr.finalValueExceedsTarget', { value: fmtINR(result.validFinal) })}</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <p className="text-amber-500 text-[10px] font-black uppercase tracking-wider text-center">{t('cagr.shortfall')}: {fmtINR(goalData.gap)}</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-card border border-border/50 p-2.5 rounded-xl text-center">
                                                        <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('cagr.requiredRate')}</p>
                                                        <p className="text-foreground font-black text-sm">{goalData.requiredRate.toFixed(1)} <span className="text-[10px] font-bold">{t('cagr.percentPA')}</span></p>
                                                        <p className="text-muted-foreground text-[8px] leading-tight mt-0.5">{t('cagr.toReachIn', { years: result.validYears })}</p>
                                                    </div>
                                                    <div className="bg-card border border-border/50 p-2.5 rounded-xl text-center">
                                                        <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('cagr.requiredTime')}</p>
                                                        <p className="text-foreground font-black text-sm">{goalData.requiredYears.toFixed(1)} <span className="text-[10px] font-bold">{t('cagr.yrs')}</span></p>
                                                        <p className="text-muted-foreground text-[8px] leading-tight mt-0.5">{t('cagr.toReachAt', { rate: result.cagr.toFixed(1) })}</p>
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

                {/* 5. YEAR-WISE GROWTH TABLE */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden mb-6">
                    <button onClick={() => setShowTable(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500"><BarChart2 size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('cagr.theoreticalGrowthPath')}</span>
                        </div>
                        {showTable ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showTable && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 pt-1">
                                    <div className="rounded-2xl overflow-hidden border border-border mt-2">
                                        <div className="grid grid-cols-3 bg-muted px-3 py-2.5">
                                            {[t('cagr.year'), t('cagr.estValue'), t('cagr.growthPercent')].map(h => (<p key={h} className="text-muted-foreground text-[10px] font-black uppercase tracking-wider">{h}</p>))}
                                        </div>
                                        <div className="divide-y divide-border/50">
                                            {result.schedule.slice((page - 1) * 10, page * 10).map((row) => (
                                                <div key={row.year} className="grid grid-cols-3 px-3 py-3 bg-background items-center">
                                                    <p className="text-foreground text-xs font-bold">{t('cagr.yr')} {row.year}</p>
                                                    <p className="text-foreground text-xs font-bold font-mono">{fmtINR(row.value)}</p>
                                                    <p className="text-brand-purple text-xs font-bold font-mono">{row.growthPct.toFixed(2)}%</p>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {/* Pagination */}
                                        {result.schedule.length > 10 && (
                                            <div className="bg-muted px-3 py-2.5 flex justify-between items-center border-t border-border">
                                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('cagr.page')} {page} {t('cagr.of')} {Math.ceil(result.schedule.length / 10)}</p>
                                                <button disabled={page === Math.ceil(result.schedule.length / 10)} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
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
                        <FileText size={20} /> {t('cagr.exportReport')}
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-brand-green/5 border border-brand-green/20 text-brand-green font-bold text-xs transition-colors hover:bg-brand-green/10 active:scale-95"
                    >
                        <FileText size={20} /> {t('cagr.excelData')}
                    </button>
                </div>
            </div>

            <DisclaimerComponent module="cagr" />
        </div>
    );
}
