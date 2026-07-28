import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronUp, Save, Check, ShieldAlert, FileText, ChevronLeft, ChevronRight, Activity, BrainCircuit, TrendingUp, AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, type ExportConfig } from '../utils/exportReport';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useLiveStatusStore } from '../store/useLiveStatusStore';
import DateInput from '../components/DateInput';
import LiveInvestmentTracker from '../components/LiveInvestmentTracker';
import DisclaimerComponent from '../components/DisclaimerComponent';
import SaveNameDialog from '../components/SaveNameDialog';
import { useHistoryTracker } from '../hooks/useHistoryTracker';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function SWPCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addSaved, removeSaved } = useCalculatorStore();
    const addProfile = useLiveStatusStore(s => s.addProfile);
    const removeProfile = useLiveStatusStore(s => s.removeProfile);

    useEffect(() => { AnalyticsService.trackScreen('SWP_Advanced'); }, []);

    // Base Inputs
    const [principal, setPrincipal] = useState(1000000);
    const [withdrawal, setWithdrawal] = useState(10000);
    const [rate, setRate] = useState(8);
    const [years, setYears] = useState(10);
    const [inflation, setInflation] = useState(5); // RBI FY 2025-26 CPI ~4.8%

    // Simulators
    const [simWithdrawal, setSimWithdrawal] = useState(withdrawal);
    const [simRate, setSimRate] = useState(rate);
    const [simYears, setSimYears] = useState(years);

    useEffect(() => { setSimWithdrawal(withdrawal); setSimRate(rate); setSimYears(years); }, [principal, withdrawal, rate, years]);

    // UI States
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showWhatIf, setShowWhatIf] = useState(false);
    const [showTable, setShowTable] = useState(false);
    const [saved, setSaved] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);
    const [planStartDate, setPlanStartDate] = useState('');
    const [showNameDialog, setShowNameDialog] = useState(false);
    const [page, setPage] = useState(1);

    // 1. CORE CALCULATION
    const result = useMemo(() => {
        const r = rate / 12 / 100;
        const n = years * 12;
        
        let currentBalance = principal;
        let totalWithdrawn = 0;
        let depletionMonth: number | null = null;
        let depletionYear: number | null = null;

        const yearlySchedule: { year: number; open: number; withdrawn: number; interest: number; close: number }[] = [];

        let currentYearOpen = principal;
        let currentYearWithdrawn = 0;
        let currentYearInterest = 0;

        for (let i = 1; i <= n; i++) {
            const interestForMonth = currentBalance * r;
            currentYearInterest += interestForMonth;
            
            currentBalance += interestForMonth;
            
            if (currentBalance >= withdrawal) {
                currentBalance -= withdrawal;
                totalWithdrawn += withdrawal;
                currentYearWithdrawn += withdrawal;
            } else {
                totalWithdrawn += currentBalance;
                currentYearWithdrawn += currentBalance;
                currentBalance = 0;
            }

            if (currentBalance <= 0 && depletionMonth === null) {
                depletionMonth = i;
                depletionYear = Math.ceil(i / 12);
            }

            // End of year or end of tenure
            if (i % 12 === 0 || i === n || currentBalance === 0) {
                const yearNum = Math.ceil(i / 12);
                if (yearlySchedule.length === 0 || yearlySchedule[yearlySchedule.length - 1].year !== yearNum) {
                     yearlySchedule.push({
                        year: yearNum,
                        open: currentYearOpen,
                        withdrawn: currentYearWithdrawn,
                        interest: currentYearInterest,
                        close: currentBalance
                    });
                    currentYearOpen = currentBalance;
                    currentYearWithdrawn = 0;
                    currentYearInterest = 0;
                }
            }

            if (currentBalance <= 0) break;
        }

        const finalBalance = currentBalance;
        // Guard the division — a cleared principal input otherwise renders "Infinity%"
        const swr = principal > 0 ? (withdrawal * 12 / principal) * 100 : 0;

        // SWR Risk: <4% = Low, 4-6% = Moderate, >6% = High
        let swrRisk = t('swp.riskLow'); let swrColor = 'text-brand-green'; let swrBg = 'bg-brand-green/10 border-brand-green/20';
        if (swr > 6) { swrRisk = t('swp.riskHigh'); swrColor = 'text-rose-500'; swrBg = 'bg-rose-500/10 border-rose-500/20'; }
        else if (swr >= 4) { swrRisk = t('swp.riskModerate'); swrColor = 'text-amber-500'; swrBg = 'bg-amber-500/10 border-amber-500/20'; }

        // Inflation adjusted final withdrawal
        const realWithdrawalValueAtEnd = withdrawal / Math.pow(1 + (inflation / 100), years);

        return { finalBalance, totalWithdrawn, yearlySchedule, depletionMonth, depletionYear, swr, swrRisk, swrColor, swrBg, realWithdrawalValueAtEnd };
    }, [principal, withdrawal, rate, years, inflation, t]);


    useHistoryTracker('SWP Calculator', { principal, withdrawal, rate, years }, { totalWithdrawn: result.totalWithdrawn }, result.totalWithdrawn);

    // 3. SIMULATOR
    const simResult = useMemo(() => {
        const r = simRate / 12 / 100;
        const n = simYears * 12;
        let bal = principal;
        let dMonth: number | null = null;
        for (let i = 1; i <= n; i++) {
            bal = bal * (1 + r) - simWithdrawal;
            if (bal <= 0) { dMonth = i; bal = 0; break; }
        }
        return { finalBal: bal, depMonth: dMonth };
    }, [principal, simWithdrawal, simRate, simYears]);

    // 4. SMART INSIGHTS
    const insight = useMemo(() => {
        if (result.depletionMonth) {
            return { msg: t('swp.insightDepletion', { year: result.depletionYear }), type: 'warn' };
        }
        if (result.swr > 8) {
            return { msg: t('swp.insightAggressiveSWR', { swr: result.swr.toFixed(1) }), type: 'warn' };
        }
        if (rate <= 4 && withdrawal > 0) {
           return { msg: t('swp.insightLowReturns'), type: 'warn' };
        }
        if (result.finalBalance > principal) {
            return { msg: t('swp.insightGrowing'), type: 'success' };
        }
        return { msg: t('swp.insightSustainable'), type: 'info' };
    }, [result, rate, principal, withdrawal, t]);


    const suggestedName = `SWP — ${formatINR(withdrawal)}/mo × ${years}Y`;

    const handleSave = (customName: string) => {
        const calcId = `swp-${Date.now()}`;
        addSaved({
            id: calcId,
            calculatorType: 'swp',
            inputValues: { principal, withdrawal, rate, years, name: customName },
            resultValues: { primary: result.finalBalance, label: t('swp.finalBalance'), invested: principal, returns: result.totalWithdrawn },
            timestamp: Date.now(),
        });
        // Mirror into live tracker store so it appears in My Loans
        addProfile({
            id: calcId,
            name: customName,
            calculatorType: 'SWP',
            profileData: {
                totalInvestment: principal,
                principal,
                monthlyWithdrawal: withdrawal,
                rate,
                years,
                inflation,
                totalWithdrawn: Math.round(result.totalWithdrawn),
                finalBalance: Math.round(result.finalBalance),
                startDate: planStartDate || new Date().toISOString().slice(0, 10),
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
            title: 'SWP Calculator Report',
            inputs: [
                { label: 'Invested Corpus', value: `₹${principal.toLocaleString('en-IN')}` },
                { label: 'Monthly Withdrawal', value: `₹${withdrawal.toLocaleString('en-IN')}` },
                { label: 'Expected Return Rate', value: `${rate}% p.a.` },
                { label: 'Withdrawal Period', value: `${years} years` },
            ],
            results: [
                { label: 'Total Amount Withdrawn', value: `₹${Math.round(result.totalWithdrawn).toLocaleString('en-IN')}` },
                { label: 'Final Corpus Balance', value: `₹${Math.round(result.finalBalance).toLocaleString('en-IN')}` },
                { label: 'Safe Withdrawal Rate', value: `${result.swr.toFixed(1)}%` },
                { label: 'Corpus Status', value: result.depletionMonth ? `Depletes in ${(result.depletionMonth/12).toFixed(1)} years` : `Sustainable for ${years} years` },
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: 'Total Withdrawn', value: result.totalWithdrawn, color: '#EF4444' },
                    { label: 'Remaining Corpus', value: Math.max(0, result.finalBalance), color: '#10B981' },
                ],
            },
            projectionTitle: 'Annual Withdrawal Schedule',
            projectionColumns: ['Year', 'Opening Balance', 'Total Withdrawn', 'Returns Earned', 'Closing Balance'],
            projectionRows: result.yearlySchedule.map((r: any) => [
                `Year ${r.year}`,
                `₹${Math.round(r.open).toLocaleString('en-IN')}`,
                `₹${Math.round(r.withdrawn).toLocaleString('en-IN')}`,
                `₹${Math.round(r.interest).toLocaleString('en-IN')}`,
                `₹${Math.round(r.close).toLocaleString('en-IN')}`,
            ]),
            filename: `FinCalix_SWP_Report_${tag}`,
        };
        await exportToPDF(config);
    };

    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const config: ExportConfig = {
            title: 'SWP Calculator Report',
            inputs: [
                { label: 'Invested Corpus', value: `₹${principal.toLocaleString('en-IN')}` },
                { label: 'Monthly Withdrawal', value: `₹${withdrawal.toLocaleString('en-IN')}` },
                { label: 'Expected Return Rate', value: `${rate}% p.a.` },
                { label: 'Withdrawal Period', value: `${years} years` },
            ],
            results: [
                { label: 'Total Amount Withdrawn', value: `₹${Math.round(result.totalWithdrawn).toLocaleString('en-IN')}` },
                { label: 'Final Corpus Balance', value: `₹${Math.round(result.finalBalance).toLocaleString('en-IN')}` },
            ],
            projectionTitle: 'Annual Withdrawal Schedule',
            projectionColumns: ['Year', 'Opening Balance', 'Total Withdrawn', 'Returns Earned', 'Closing Balance'],
            projectionRows: result.yearlySchedule.map((r: any) => [
                r.year,
                Math.round(r.open),
                Math.round(r.withdrawn),
                Math.round(r.interest),
                Math.round(r.close),
            ]),
            filename: `FinCalix_SWP_Report_${tag}`,
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
                        <h1 className="text-lg font-bold text-foreground leading-tight">{t('swp.title')}</h1>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{t('swp.subtitle')}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 space-y-5">
                {/* 1. CORE INPUTS */}
                <div className="space-y-4">
                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('swp.totalInvestment')}</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={principal} onChange={e => setPrincipal(Number(e.target.value)||0)} className={inputCls + " pl-7"} />
                        </div>
                    </div>
                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('swp.monthlyWithdrawal')}</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={withdrawal} onChange={e => setWithdrawal(Number(e.target.value)||0)} className={inputCls + " pl-7"} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('swp.returnRate')}</label>
                            <input type="number" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value)||0)} className={inputCls} />
                        </div>
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('swp.timeYears')}</label>
                            <input type="number" value={years} onChange={e => setYears(Number(e.target.value)||0)} className={inputCls} />
                        </div>
                    </div>
                </div>

                {/* 2. RESULTS HERO */}
                <motion.div layout className="p-6 rounded-3xl bg-card border border-border shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-bold">{t('swp.finalBalance')}</p>
                        {result.depletionMonth ? (
                             <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-red-500/10 border-red-500/20 text-red-500`}>
                                {t('swp.depletedEarly')}
                            </div>
                        ) : (
                            <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-brand-green/10 border-brand-green/20 text-brand-green`}>
                                {t('swp.sustainable')}
                            </div>
                        )}
                    </div>
                    
                    <p className={`text-5xl font-black tracking-tighter mb-5 ${result.finalBalance === 0 ? 'text-red-500' : 'text-brand-blue'}`}>
                        {fmtINR(result.finalBalance)}
                    </p>

                    {/* PROMINENT depletion warning — was previously buried in
                        the smart-insight card below. SEBI best practice: any
                        scenario where the corpus is exhausted before the
                        intended tenure must be the FIRST thing the user sees,
                        not a footnote. */}
                    {result.depletionMonth && (
                        <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                            <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[11px] font-black text-red-500">
                                    {t('swp.depletionHeadline', '⚠ Corpus runs out in Year {{year}}', { year: result.depletionYear })}
                                </p>
                                <p className="text-[10px] text-red-500/80 leading-snug mt-0.5">
                                    {t('swp.depletionHelp', 'Reduce monthly withdrawal, lengthen the corpus by raising the rate, or shorten the plan to keep the corpus alive.')}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-brand-green/10 border border-brand-green/20">
                            <p className="text-brand-green/80 text-[10px] uppercase font-bold mb-0.5">{t('swp.totalWithdrawn')}</p>
                            <p className="text-brand-green font-black text-sm">{fmtINR(result.totalWithdrawn)}</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-background border border-border/50">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-0.5">{t('swp.totalInvested')}</p>
                            <p className="text-foreground font-black text-sm">{fmtINR(principal)}</p>
                        </div>
                    </div>
                </motion.div>

                {/* SMART INSIGHT (Dynamic) */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${insight.type === 'warn' ? 'bg-amber-500/10 border-amber-500/30' : insight.type === 'success' ? 'bg-brand-green/10 border-brand-green/30' : 'bg-brand-blue/10 border-brand-blue/30'}`}>
                    <BrainCircuit size={18} className={`shrink-0 mt-0.5 ${insight.type === 'warn' ? 'text-amber-500' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-blue'}`} />
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${insight.type === 'warn' ? 'text-amber-600' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-blue'}`}>{t('swp.smartInsight')}</p>
                        <p className={`text-xs font-medium leading-relaxed ${insight.type === 'warn' ? 'text-amber-700 dark:text-amber-400' : insight.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-300'}`}>{insight.msg}</p>
                    </div>
                </div>

                {/* PLAN START DATE — feeds the My Loans / Trackers card */}
                {!saved && (
                    <div className="p-4 rounded-2xl border border-border bg-card">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2 block">
                            {t('common.investmentDate', 'Investment Date (optional)')}
                        </label>
                        <DateInput
                            value={planStartDate}
                            onChange={setPlanStartDate}
                            max={new Date().toISOString().slice(0, 10)}
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                            {t('common.investmentDateHint', 'Used for tracking in My Loans')}
                        </p>
                    </div>
                )}

                {/* LIVE SWP TRACKER — appears the moment user picks a date */}
                {planStartDate && (
                    <LiveInvestmentTracker
                        mode="swp"
                        startDate={planStartDate}
                        totalYears={years}
                        rate={rate}
                        principal={principal}
                        monthlyWithdrawal={withdrawal}
                        projectedMaturity={result.finalBalance}
                        label={t('swp.liveTracker', 'Live SWP Tracker')}
                    />
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
                    <button onClick={() => setShowNameDialog(true)} className="w-full py-3.5 rounded-2xl bg-brand-blue text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-brand-blue/20">
                        <Save size={18} /> {t('swp.saveCalculation')}
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
                            <div className="p-1.5 bg-brand-blue/10 rounded-lg text-brand-blue"><Activity size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('swp.sustainabilityCheck')}</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-5">
                                    <div className="h-px bg-border w-full -mt-2" />

                                    {/* SWR badge and Depletion */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className={`p-4 rounded-2xl border text-center ${result.swrBg}`}>
                                            <p className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${result.swrColor}`}>{t('swp.safeWDRate')}</p>
                                            <p className={`font-black text-xl mb-1 ${result.swrColor}`}>{result.swr.toFixed(1)}%</p>
                                            <p className={`text-[9px] leading-tight px-1 font-bold ${result.swrColor}`}>{result.swrRisk} {t('swp.risk')}</p>
                                        </div>
                                        <div className={`p-4 rounded-2xl border text-center ${result.depletionMonth ? 'bg-red-500/10 border-red-500/20' : 'bg-brand-green/10 border-brand-green/20'}`}>
                                            <p className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${result.depletionMonth ? 'text-red-500' : 'text-brand-green'}`}>{t('swp.corpusLifespan')}</p>
                                            <p className={`font-black text-xl mb-1 ${result.depletionMonth ? 'text-red-500' : 'text-brand-green'}`}>
                                                {result.depletionMonth ? `${(result.depletionMonth/12).toFixed(1)}y` : `${years}y+`}
                                            </p>
                                            <p className={`text-[9px] leading-tight px-1 font-bold ${result.depletionMonth ? 'text-red-500' : 'text-brand-green'}`}>
                                                {result.depletionMonth ? t('swp.depletesEarly') : t('swp.sustainable')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Inflation Adjusted Return */}
                                    <div className="bg-gradient-to-br from-background to-muted p-4 rounded-2xl border border-border space-y-3">
                                        <div className="flex justify-between items-center">
                                            <p className="text-foreground text-xs font-bold flex items-center gap-1.5"><ShieldAlert size={14} className="text-amber-500"/> {t('swp.inflationImpact')}</p>
                                            <div className="flex items-center gap-1.5 bg-card border border-border px-2 py-1 rounded-lg">
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase">{t('swp.rate')}</span>
                                                <input type="number" className="w-8 bg-transparent text-xs font-bold text-amber-500 outline-none p-0 text-center" value={inflation} onChange={e => setInflation(Number(e.target.value)||0)} />
                                                <span className="text-[10px] text-muted-foreground font-bold">%</span>
                                            </div>
                                        </div>
                                        
                                        <div className="p-3 rounded-xl bg-card border border-border/50">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1">{t('swp.purchasingPowerDecline')}</p>
                                            <p className="text-xs text-foreground font-medium leading-relaxed">{t('swp.inflationDesc', { inflation, withdrawal: fmtINR(withdrawal), realValue: fmtINR(result.realWithdrawalValueAtEnd), years })}</p>
                                        </div>
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
                            <span className="text-foreground font-bold text-sm">{t('swp.whatIfSimulator')}</span>
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
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('swp.withdrawal')}</span>
                                            <span className="text-sm font-black text-rose-500">{fmtINR(simWithdrawal)}{t('swp.perMonth')}</span>
                                        </div>
                                        <input type="range" min={1000} max={principal * 0.05} step={1000} value={simWithdrawal} onChange={e => setSimWithdrawal(Number(e.target.value))} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-rose-500" />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('swp.expectedReturn')}</span>
                                            <span className="text-sm font-black text-emerald-500">{simRate}%</span>
                                        </div>
                                        <input type="range" min={1} max={30} step={0.5} value={simRate} onChange={e => setSimRate(Number(e.target.value))} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('swp.duration')}</span>
                                            <span className="text-sm font-black text-blue-500">{simYears} {t('swp.yrs')}</span>
                                        </div>
                                        <input type="range" min={1} max={40} step={1} value={simYears} onChange={e => setSimYears(Number(e.target.value))} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                    </div>

                                    <div className={`p-4 rounded-2xl border text-center ${simResult.depMonth ? 'bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/40' : 'bg-emerald-50 dark:bg-brand-green/15 border-emerald-200 dark:border-brand-green/30'}`}>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">{t('swp.simulatedFinalBalance')}</p>
                                        <p className={`font-black text-2xl mb-1 ${simResult.depMonth ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-brand-green'}`}>{fmtINR(simResult.finalBal)}</p>
                                        {simResult.depMonth ? (
                                             <p className="text-red-600 dark:text-red-400 text-xs font-bold"><AlertTriangle size={11} className="inline mr-1"/>{t('swp.depletesInYr', { year: Math.ceil(simResult.depMonth/12) })}</p>
                                        ) : (
                                             <p className="text-emerald-600 dark:text-brand-green text-xs font-bold"><ShieldCheck size={11} className="inline mr-1"/> {t('swp.fullySustainable')}</p>
                                        )}
                                       
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
                            <span className="text-foreground font-bold text-sm">{t('swp.portfolioDepletionTable')}</span>
                        </div>
                        {showTable ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showTable && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 pt-1">
                                    <div className="rounded-2xl overflow-hidden border border-border mt-2">
                                        <div className="grid grid-cols-5 bg-muted px-2 py-2.5">
                                            {[t('swp.colYear'), t('swp.colStart'), t('swp.colWD'), t('swp.colInterest'), t('swp.colEnd')].map(h => (<p key={h} className="text-muted-foreground text-[9px] font-black uppercase tracking-wider text-center">{h}</p>))}
                                        </div>
                                        <div className="divide-y divide-border/50">
                                            {result.yearlySchedule.slice((page - 1) * 10, page * 10).map((row) => (
                                                <div key={row.year} className={`grid grid-cols-5 px-2 py-3 items-center text-center ${row.close <= 0 ? 'bg-red-500/5' : 'bg-background'}`}>
                                                    <p className={`text-xs font-bold ${row.close <= 0 ? 'text-red-500' : 'text-foreground'}`}>{t('swp.yr')} {row.year}</p>
                                                    <p className="text-foreground text-[10px] font-bold font-mono">{fmtINR(row.open)}</p>
                                                    <p className="text-rose-400 text-[10px] font-bold font-mono">-{fmtINR(row.withdrawn)}</p>
                                                    <p className="text-brand-green text-[10px] font-bold font-mono">+{fmtINR(row.interest)}</p>
                                                    <p className={`text-[10px] font-bold font-mono ${row.close <= 0 ? 'text-red-500' : 'text-foreground'}`}>{fmtINR(Math.max(0, row.close))}</p>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {/* Pagination */}
                                        {result.yearlySchedule.length > 10 && (
                                            <div className="bg-muted px-3 py-2.5 flex justify-between items-center border-t border-border">
                                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('swp.pageOf', { current: page, total: Math.ceil(result.yearlySchedule.length / 10) })}</p>
                                                <button disabled={page === Math.ceil(result.yearlySchedule.length / 10)} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground text-center mt-3 font-medium px-2">
                                        {t('swp.tableFootnote')}
                                    </p>
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
                        <FileText size={20} /> {t('swp.exportReport')}
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-brand-green/5 border border-brand-green/20 text-brand-green font-bold text-xs transition-colors hover:bg-brand-green/10 active:scale-95"
                    >
                        <FileText size={20} /> {t('swp.excelData')}
                    </button>
                </div>
            </div>

            <DisclaimerComponent module="swp" />
        </div>
    );
}
