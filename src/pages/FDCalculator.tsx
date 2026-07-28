import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Info, Save, Check, Download, Share2, ChevronDown, ChevronUp, TrendingUp, Trash2 } from 'lucide-react';
import { nativeShare } from '../utils/nativeShare';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import NumberInput from '../components/NumberInput';
import DateInput from '../components/DateInput';
import LiveStatusCard from '../components/LiveStatusCard';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { toLocalDateStr, todayStr } from '../utils/dateUtils';

import SmartInsight from '../components/SmartInsight';
import ShareableCard from '../components/ShareableCard';
import WhatIfSimulator from '../components/WhatIfSimulator';
import { calculateFD, formatINR } from '../utils/calculations';
import { calculateFdStatus, type FdStatusInput } from '../utils/investmentStatusEngine';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import { AnalyticsService } from '../lib/analytics';
import { triggerCalcNotification } from '../services/calcNotifications';
import { useAppColors } from '../theme/useAppColors';
import { useHistoryTracker } from '../hooks/useHistoryTracker';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

export default function FDCalculator() {
    const { t } = useTranslation();
    useEffect(() => { AnalyticsService.trackScreen('FD_Calculator'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const { addSaved, removeSaved, savedCalculations } = useCalculatorStore();
    const [principal, setPrincipal] = useState(100000);
    const [rate, setRate] = useState(7.0);
    const [years, setYears] = useState(5);
    const [compounding, setCompounding] = useState<number>(4);
    const [inflation, setInflation] = useState(5); // RBI FY 2025-26 CPI ~4.8%
    const [isSeniorCitizen, setIsSeniorCitizen] = useState(false);
    const [saved, setSaved] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);
    const [showCompare, setShowCompare] = useState(false);
    const [showGrowth, setShowGrowth] = useState(false);
    const [fdStartDate, setFdStartDate] = useState('');
    const chartRef = useRef<any>(null);
    const c = useAppColors();

    // Senior citizens get +0.50% extra on FD (most banks)
    const effectiveRate = isSeniorCitizen ? rate + 0.5 : rate;

    const fdStatus = useMemo(() => {
        if (!fdStartDate) return null;
        return calculateFdStatus({
            principal,
            annualRate: effectiveRate,
            tenureMonths: years * 12,
            startDate: fdStartDate,
            compoundingFreq: compounding,
        });
    }, [fdStartDate, principal, effectiveRate, years, compounding]);

    const result = useMemo(() => calculateFD(principal, effectiveRate, years, compounding), [principal, effectiveRate, years, compounding]);
    useHistoryTracker('FD Calculator', { principal, rate, years, compounding }, { interest: result.interest }, result.amount);

    // TDS Calculation: 10% TDS if annual interest exceeds threshold
    const tdsInfo = useMemo(() => {
        const annualInterest = result.interest / years;
        const threshold = isSeniorCitizen ? 100000 : 50000; // Sec 194A FY 2026-27: Rs 1L for seniors, Rs 50K for others
        const isTdsApplicable = annualInterest > threshold;
        const annualTds = isTdsApplicable ? Math.round(annualInterest * 0.1) : 0;
        const totalTds = annualTds * years;
        const netInterest = result.interest - totalTds;
        const form15 = isSeniorCitizen ? '15H' : '15G';
        return { annualInterest: Math.round(annualInterest), threshold, isTdsApplicable, annualTds, totalTds, netInterest, form15 };
    }, [result, years, isSeniorCitizen]);

    // Removed automatic notification trigger

    // Compounding comparison
    const compoundingComparison = useMemo(() => {
        const freqs = [
            { label: t('fd.yearly'), freq: 1 },
            { label: t('fd.quarterly'), freq: 4 },
            { label: t('fd.monthly'), freq: 12 },
            { label: t('fd.daily'), freq: 365 },
        ];
        return freqs.map(f => {
            const mat = principal * Math.pow(1 + effectiveRate / (100 * f.freq), years * f.freq);
            return { ...f, maturity: Math.round(mat), interest: Math.round(mat - principal) };
        });
    }, [principal, rate, years, isSeniorCitizen]);

    // Year-wise growth
    const yearWise = useMemo(() => {
        const data = [];
        for (let y = 1; y <= years; y++) {
            const mat = principal * Math.pow(1 + effectiveRate / (100 * compounding), y * compounding);
            data.push({ year: y, value: Math.round(mat), interest: Math.round(mat - principal) });
        }
        return data;
    }, [principal, rate, years, compounding, isSeniorCitizen]);

    // Inflation-adjusted return
    const inflationAdj = useMemo(() => {
        const realValue = result.amount / Math.pow(1 + inflation / 100, years);
        const nominalReturn = ((result.amount / principal) - 1) * 100;
        const realReturn = ((realValue / principal) - 1) * 100; // accurate: deflated maturity vs principal
        return { inflation, nominalReturn: nominalReturn.toFixed(1), realReturn: realReturn.toFixed(1), realValue: Math.round(realValue) };
    }, [result, principal, years, inflation]);

    const chartData = {
        labels: [t('fd.invested'), t('fd.interestEarned')],
        datasets: [{ data: [principal, result.interest], backgroundColor: ['#4F46E5', '#10B981'], borderColor: [c.card, c.card], borderWidth: 2 }]
    };

    const growthBarData = useMemo(() => ({
        labels: yearWise.map(y => `${t('fd.yr')} ${y.year}`),
        datasets: [
            { label: t('fd.principal'), data: yearWise.map(() => principal), backgroundColor: '#3B82F6' },
            { label: t('fd.interest'), data: yearWise.map(y => y.interest), backgroundColor: '#10B981' },
        ]
    }), [yearWise, principal]);

    const handleSave = () => {
        const calcId = `FD-${Date.now()}`;
        addSaved({ id: calcId, calculatorType: 'FD Calculator', inputValues: { principal, rate, years, compounding }, resultValues: { primary: result.amount, ...result }, timestamp: Date.now() });
        setSaved(true);
        setLastSavedId(calcId);
        triggerCalcNotification({
            type: 'fd_maturity',
            metadata: {
                amount: result.amount,
                rate: rate,
                date: toLocalDateStr(new Date(Date.now() + years * 31536000000))
            }
        });
    };

    const handleRemove = () => {
        if (lastSavedId) {
            removeSaved(lastSavedId);
            setLastSavedId(null);
            setSaved(false);
        }
    };

    const isAlreadySaved = useMemo(() => {
        return savedCalculations.some(s => s.calculatorType === 'FD Calculator' && JSON.stringify(s.inputValues) === JSON.stringify({ principal, rate, years, compounding }));
    }, [savedCalculations, principal, rate, years, compounding]);

    // PDF: English labels — jsPDF Helvetica doesn't support Indian scripts
    const handleDownloadPDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const compLabel = compounding === 12 ? 'Monthly' : compounding === 4 ? 'Quarterly' : compounding === 365 ? 'Daily' : 'Yearly';
        const config: ExportConfig = {
            title: 'Fixed Deposit (FD) Report',
            inputs: [
                { label: 'Deposit Amount', value: `INR ${principal.toLocaleString('en-IN')}` },
                { label: 'Interest Rate', value: `${effectiveRate}% p.a.${isSeniorCitizen ? ' (Senior Citizen +0.5%)' : ''}` },
                { label: 'Tenure', value: `${years} Years` },
                { label: 'Compounding Frequency', value: compLabel },
                { label: 'Senior Citizen (60+)', value: isSeniorCitizen ? 'Yes' : 'No' },
                { label: 'Assumed Inflation', value: `${inflation}% p.a.` },
            ],
            results: [
                { label: 'Principal Invested', value: `INR ${principal.toLocaleString('en-IN')}` },
                { label: 'Interest Earned (Gross)', value: `INR ${Math.round(result.interest).toLocaleString('en-IN')}` },
                { label: 'Maturity Amount', value: `INR ${Math.round(result.amount).toLocaleString('en-IN')}` },
                ...(tdsInfo.isTdsApplicable ? [
                    { label: 'TDS Deducted', value: `INR ${tdsInfo.totalTds.toLocaleString('en-IN')}` },
                    { label: 'Net Interest After TDS', value: `INR ${tdsInfo.netInterest.toLocaleString('en-IN')}` },
                ] : []),
                { label: 'Inflation-Adjusted Value', value: `INR ${Math.round(inflationAdj.realValue).toLocaleString('en-IN')}` },
                { label: 'Real Return Rate', value: `${inflationAdj.realReturn}%` },
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: 'Principal Invested', value: principal, color: '#4F46E5' },
                    { label: 'Interest Earned', value: result.interest, color: '#10B981' },
                ],
            },
            projectionTitle: 'Year-Wise FD Growth',
            projectionColumns: ['Year', 'Opening Balance', 'Interest Earned', 'Closing Balance'],
            projectionRows: yearWise.map((r: any) => [
                `Year ${r.year}`,
                `INR ${Math.round(r.value - r.interest).toLocaleString('en-IN')}`,
                `INR ${Math.round(r.interest).toLocaleString('en-IN')}`,
                `INR ${Math.round(r.value).toLocaleString('en-IN')}`,
            ]),
            additionalTables: [
                ...(fdStatus ? [{
                    title: `Live Status (${new Date().toLocaleDateString('en-IN')})`,
                    columns: ['Metric', 'Value'],
                    rows: [
                        ['FD Running For (days)', String(fdStatus.daysInvested)],
                        ['Interest Earned So Far', formatINR(fdStatus.interestEarnedToday)],
                        ['Current Value', formatINR(fdStatus.valueToday)],
                        ['Days to Maturity', String(fdStatus.daysRemaining)],
                        ['Maturity Value', formatINR(fdStatus.maturityValue)],
                        ['Daily Earning', formatINR(fdStatus.dailyEarning)],
                        ['Premature Value (if broken today)', formatINR(fdStatus.prematureValue)],
                    ] as Array<Array<string | number>>,
                }] : []),
            ],
            filename: `FinCalix_FD_Report_${tag}`,
        };
        await exportToPDF(config);
    };

    // Excel export — keep input labels in sync with the PDF flow.
    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const compLabel = compounding === 12 ? 'Monthly' : compounding === 4 ? 'Quarterly' : compounding === 365 ? 'Daily' : 'Yearly';
        const config: ExportConfig = {
            title: 'Fixed Deposit (FD) Report',
            inputs: [
                { label: 'Deposit Amount', value: `INR ${principal.toLocaleString('en-IN')}` },
                { label: 'Interest Rate', value: `${effectiveRate}% p.a.${isSeniorCitizen ? ' (Senior Citizen +0.5%)' : ''}` },
                { label: 'Tenure', value: `${years} Years` },
                { label: 'Compounding Frequency', value: compLabel },
            ],
            results: [
                { label: 'Interest Earned', value: `INR ${Math.round(result.interest).toLocaleString('en-IN')}` },
                { label: 'Maturity Amount', value: `INR ${Math.round(result.amount).toLocaleString('en-IN')}` },
            ],
            projectionTitle: 'Year-Wise FD Growth',
            projectionColumns: ['Year', 'Opening Balance', 'Interest Earned', 'Closing Balance'],
            projectionRows: yearWise.map((r: any) => [r.year, Math.round(r.value - r.interest), Math.round(r.interest), Math.round(r.value)]),
            additionalTables: [
                ...(fdStatus ? [{
                    title: `Live Status (${new Date().toLocaleDateString('en-IN')})`,
                    columns: ['Metric', 'Value'],
                    rows: [
                        ['FD Running For (days)', String(fdStatus.daysInvested)],
                        ['Interest Earned So Far', formatINR(fdStatus.interestEarnedToday)],
                        ['Current Value', formatINR(fdStatus.valueToday)],
                        ['Days to Maturity', String(fdStatus.daysRemaining)],
                        ['Maturity Value', formatINR(fdStatus.maturityValue)],
                        ['Daily Earning', formatINR(fdStatus.dailyEarning)],
                        ['Premature Value (if broken today)', formatINR(fdStatus.prematureValue)],
                    ] as Array<Array<string | number>>,
                }] : []),
            ],
            filename: `FinCalix_FD_Report_${tag}`,
        };
        await exportToExcel(config);
    };

    const handleShare = async () => {
        const text = `🏦 ${t('fd.myFdInvestment')}\n\n💰 ${t('fd.deposit')}: ${formatINR(principal)}\n📈 ${t('fd.rate')}: ${rate}%\n📅 ${t('fd.tenure')}: ${years} ${t('fd.years')}\n\n✅ ${t('fd.maturity')}: ${formatINR(result.amount)}\n💵 ${t('fd.interest')}: ${formatINR(result.interest)}\n📉 ${t('fd.afterInflation')}: ${formatINR(inflationAdj.realValue)}\n\nCalculated with FinCalix 🧮`;
        await nativeShare('FD Calculation – FinCalix', text);
    };

    return (
        <div className="min-h-dvh bg-background animate-fade-in">
            <div className="sticky top-0 z-10 bg-background  px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border"><ArrowLeft size={18} className="text-muted-foreground" /></button>
                    <div><h1 className="text-lg font-bold text-foreground">{t('fd.fdCalculator')}</h1><p className="text-muted-foreground text-xs">{t('fd.fixedDepositReturns')}</p></div>
                </div>
            </div>

            <DisclaimerComponent module="fd" />

            <div className="px-4 pb-28 pt-4 space-y-5">
                {/* Compounding Tabs */}
                <div className="flex rounded-2xl bg-card border border-border p-1">
                    {([{ label: t('fd.quarterly'), val: 4 }, { label: t('fd.monthly'), val: 12 }, { label: t('fd.yearly'), val: 1 }] as any[]).map((opt: any) => (
                        <button key={opt.val} onClick={() => setCompounding(opt.val)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${compounding === opt.val ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-muted-foreground'}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-3">
                    <NumberInput label={t('fd.depositAmount')} value={principal} onChange={setPrincipal} min={1000} max={10000000} prefix="₹" />
                    <NumberInput label={t('fd.interestRate')} value={rate} onChange={setRate} min={1} max={15} suffix="%" step={0.1} helperText="Typical range 6.0-6.5% (Jul 2026)" />
                    <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                        <div>
                            <span className="text-xs font-medium text-foreground">{t('fd.seniorCitizen')}</span>
                            <p className="text-[10px] text-muted-foreground">{t('fd.seniorCitizenExtraRate')}</p>
                        </div>
                        <button onClick={() => setIsSeniorCitizen(!isSeniorCitizen)}
                            className={`w-12 h-6 rounded-full transition-all relative ${isSeniorCitizen ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isSeniorCitizen ? 'left-[26px]' : 'left-0.5'}`} />
                        </button>
                    </div>
                    {isSeniorCitizen && (
                        <p className="text-[10px] text-emerald-500 font-medium -mt-1">{t('fd.effectiveRateLabel', { effectiveRate, baseRate: rate })}</p>
                    )}
                    <NumberInput label={t('fd.tenure')} value={years} onChange={setYears} min={1} max={20} suffix=" years" />
                    <NumberInput label={t('fd.assumedInflation')} value={inflation} onChange={setInflation} min={1} max={15} suffix="%" step={0.5} helperText={t('fd.usedForInflationAdjusted')} />
                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('fd.startDate')}</label>
                        <DateInput
                            value={fdStartDate}
                            onChange={setFdStartDate}
                            max={todayStr()}
                            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm font-semibold focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50"
                        />
                    </div>
                </div>

                {/* Result Card */}
                <motion.div layout className="p-5 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/20">
                    <p className="text-purple-300/60 text-[10px] font-bold uppercase tracking-wider mb-1">{t('fd.maturityAmount')}</p>
                    <motion.p key={result.amount} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-black text-foreground mb-4">
                        {formatINR(result.amount)}
                    </motion.p>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-center">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">{t('fd.invested')}</p>
                            <p className="text-foreground font-bold text-sm">{formatINR(principal)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-center">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">{t('fd.interest')}</p>
                            <p className="text-brand-green font-bold text-sm">{formatINR(result.interest)}</p>
                        </div>
                    </div>

                    {/* TDS Info */}
                    <div className={`p-3 rounded-xl mb-4 ${tdsInfo.isTdsApplicable ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${tdsInfo.isTdsApplicable ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {t('fd.tdsOnFdInterest')}
                        </p>
                        {tdsInfo.isTdsApplicable ? (
                            <div className="space-y-1">
                                <p className="text-xs text-foreground">{t('fd.annualInterestExceeds', { amount: formatINR(tdsInfo.annualInterest), threshold: `₹${(tdsInfo.threshold / 1000).toFixed(0)}K` })}</p>
                                <p className="text-xs text-amber-500 font-bold">{t('fd.tdsAtTenPercent')}: {formatINR(tdsInfo.annualTds)}/{t('fd.yr')} · {t('fd.total')}: {formatINR(tdsInfo.totalTds)}</p>
                                <p className="text-xs text-foreground font-medium">{t('fd.netInterestAfterTds')}: {formatINR(tdsInfo.netInterest)}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">{t('fd.submitFormToAvoidTds', { form: tdsInfo.form15 })}</p>
                            </div>
                        ) : (
                            <p className="text-xs text-emerald-500">{t('fd.noTds', { annualInterest: `₹${tdsInfo.annualInterest.toLocaleString('en-IN')}`, threshold: `₹${(tdsInfo.threshold / 1000).toFixed(0)}K` })}</p>
                        )}
                    </div>

                    {/* Chart */}
                    <div className="h-44 mb-4 flex justify-center">
                        <Pie ref={chartRef} data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                    </div>

                    {saved || isAlreadySaved ? (
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
                        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
                            className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all bg-brand-purple text-white shadow-lg shadow-brand-purple/20">
                            <Save size={18} /> {t('fd.saveCalculation')}
                        </motion.button>
                    )}
                </motion.div>

                {/* Inflation-adjusted Insight */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-start gap-3">
                        <TrendingUp size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-foreground font-bold text-xs">{t('fd.inflationAdjustedReturn')}</h3>
                            <p className="text-muted-foreground text-[11px] mt-1">{t('fd.afterAccountingForInflation', { inflation })}</p>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div><p className="text-muted-foreground text-[9px] uppercase font-bold">{t('fd.nominalReturn')}</p><p className="text-foreground font-bold text-xs">{inflationAdj.nominalReturn}%</p></div>
                                <div><p className="text-muted-foreground text-[9px] uppercase font-bold">{t('fd.realReturn')}</p><p className={`font-bold text-xs ${Number(inflationAdj.realReturn) > 0 ? 'text-brand-green' : 'text-red-400'}`}>{inflationAdj.realReturn}%</p></div>
                                <div className="col-span-2"><p className="text-muted-foreground text-[9px] uppercase font-bold">{t('fd.realValueToday')}</p><p className="text-amber-400 font-bold text-sm">{formatINR(inflationAdj.realValue)}</p></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compounding Comparison */}
                <button onClick={() => setShowCompare(!showCompare)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm">
                    <span className="flex items-center gap-2"><Info size={16} className="text-muted-foreground" /> {t('fd.compoundingComparison')}</span>
                    {showCompare ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                    {showCompare && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="rounded-2xl bg-card border border-border overflow-hidden">
                                <div className="grid grid-cols-3 text-[9px] font-bold text-muted-foreground uppercase p-2 bg-slate-100 dark:bg-slate-800/50"><span>{t('fd.frequency')}</span><span>{t('fd.interest')}</span><span>{t('fd.maturity')}</span></div>
                                {compoundingComparison.map((c, i) => (
                                    <div key={i} className={`grid grid-cols-3 text-[11px] p-2.5 ${c.freq === compounding ? 'bg-brand-purple/10 border-l-2 border-brand-purple' : i % 2 === 0 ? 'bg-card' : 'bg-slate-50 dark:bg-slate-800/20'}`}>
                                        <span className={`${c.freq === compounding ? 'text-brand-purple font-bold' : 'text-slate-600 dark:text-slate-300'}`}>{c.label}</span>
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
                    <span className="flex items-center gap-2"><TrendingUp size={16} className="text-muted-foreground" /> {t('fd.maturityGrowthChart')}</span>
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
                                            y: { stacked: true, grid: { color: c.border }, ticks: { color: c.textMuted, font: { size: 8 }, callback: (v: any) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K` } },
                                            x: { stacked: true, grid: { display: false }, ticks: { color: c.textMuted, font: { size: 10 } } },
                                        },
                                        plugins: { legend: { labels: { color: c.textSecondary, font: { size: 10 } } } }
                                    }} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* What-If Simulator */}
                <WhatIfSimulator
                    sliders={[
                        { key: 'principal', label: t('fd.depositAmount'), min: 10000, max: 5000000, step: 10000, prefix: '₹' },
                        { key: 'rate', label: t('fd.interestRateShort'), min: 3, max: 12, step: 0.25, suffix: '%' },
                        { key: 'years', label: t('fd.tenureShort'), min: 1, max: 20, step: 1, suffix: ' yrs' },
                    ]}
                    currentInputs={{ principal, rate, years }}
                    calculateResult={(inputs) => Math.round(inputs.principal * Math.pow(1 + inputs.rate / (100 * compounding), inputs.years * compounding))}
                    resultLabel={t('fd.maturityAmount')}
                />

                <SmartInsight calculatorType="fd" inputs={{ principal, rate, years }} results={{ amount: result.amount, interest: result.interest }} />

                {/* Export & Share */}
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={handleDownloadPDF} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-muted-foreground text-[10px] font-medium"><Download size={16} /> {t('fd.pdf')}</button>
                    <button onClick={handleDownloadExcel} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-muted-foreground text-[10px] font-medium"><Download size={16} /> {t('fd.excel')}</button>
                    <button onClick={handleShare} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px] font-bold"><Share2 size={16} /> {t('fd.share')}</button>
                </div>

                {/* Shareable Card */}
                <ShareableCard
                    title={t('fd.myFdInvestment')}
                    highlight={formatINR(result.amount)}
                    subtitle={`${years} ${t('fd.yearsAt')} ${rate}% ${compounding === 4 ? t('fd.quarterly') : compounding === 12 ? t('fd.monthly') : t('fd.yearly')} ${t('fd.compounding')}`}
                    details={[
                        { label: t('fd.deposit'), value: formatINR(principal) },
                        { label: t('fd.interest'), value: formatINR(result.interest) },
                        { label: t('fd.realValue'), value: formatINR(inflationAdj.realValue) },
                        { label: t('fd.realReturn'), value: `${inflationAdj.realReturn}%` },
                    ]}
                    gradient="from-indigo-600 via-purple-500 to-pink-500"
                />

                {/* Live FD Status */}
                {fdStatus && (
                    <LiveStatusCard
                        calculatorType="FD Calculator"
                        profileData={{ principal, annualRate: effectiveRate, tenureMonths: years * 12, startDate: fdStartDate, compoundingFreq: compounding }}
                        title={t('liveStatus.liveFdStatus')}
                        subtitle={`${years} ${t('fd.yearsAt')} ${effectiveRate}%`}
                        startDate={fdStartDate}
                        metrics={[
                            { label: t('fd.invested'), value: formatINR(principal) },
                            { label: t('liveStatus.interestEarned'), value: formatINR(fdStatus.interestEarnedToday), color: 'amber' },
                            { label: t('liveStatus.valueToday'), value: formatINR(fdStatus.valueToday), color: 'green' },
                        ]}
                        progressPercent={fdStatus.percentComplete}
                        progressLabel={t('liveStatus.tenureProgress', { percent: fdStatus.percentComplete.toFixed(1), done: fdStatus.daysInvested, total: fdStatus.daysInvested + fdStatus.daysRemaining })}
                        insightText={fdStatus.daysRemaining > 0 ? t('liveStatus.fdPrematureInsight', { cost: formatINR(fdStatus.costOfBreaking), date: fdStatus.maturityDate }) : t('liveStatus.fdMaturedInsight', { value: formatINR(fdStatus.maturityValue) })}
                    />
                )}
            </div>
        </div>
    );
}
