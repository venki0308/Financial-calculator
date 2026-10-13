import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Info, Download, Share2, Shield, Calendar, TrendingUp, IndianRupee, ChevronDown, ChevronUp, Save, Check, Trash2 } from 'lucide-react';
import { nativeShare } from '../utils/nativeShare';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement,
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';

import SmartInsight from '../components/SmartInsight';
import ShareableCard from '../components/ShareableCard';
import WhatIfSimulator from '../components/WhatIfSimulator';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import { AnalyticsService } from '../lib/analytics';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useLiveStatusStore } from '../store/useLiveStatusStore';
import DateInput from '../components/DateInput';
import LiveInvestmentTracker from '../components/LiveInvestmentTracker';
import SaveNameDialog from '../components/SaveNameDialog';
import { useAppColors } from '../theme/useAppColors';
import { useHistoryTracker } from '../hooks/useHistoryTracker';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

interface YearEntry { year: number; age: number; contrib: number; corpus: number; cumContrib: number; }

export default function NPSCalculator() {
    const { t } = useTranslation();
    useEffect(() => { AnalyticsService.trackScreen('NPS_Calculator_Advanced'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const { addSaved, removeSaved } = useCalculatorStore();
    const addProfile = useLiveStatusStore(s => s.addProfile);
    const removeProfile = useLiveStatusStore(s => s.removeProfile);
    const chartRef = useRef<any>(null);
    const c = useAppColors();

    const [monthly, setMonthly] = useState(5000);
    const [rate, setRate] = useState(10);
    const [age, setAge] = useState(30);
    const [retireAge, setRetireAge] = useState(60);
    const [annuityPct, setAnnuityPct] = useState(40);
    const [annuityRate, setAnnuityRate] = useState(6); // annuity provider return rate (IRDA-approved range: 5–7.5%)
    // Equity allocation under PFRDA Active Choice: capped at 75% till age 50,
    // then declining 2.5% per year of age until age 60, where it bottoms at 50%.
    // Cap formula: max(50, 75 - max(0, age-50) * 2.5)
    const [equityPct, setEquityPct] = useState(50);
    const [showTimeline, setShowTimeline] = useState(false);
    const [showTaxInfo, setShowTaxInfo] = useState(false);
    const [saved, setSaved] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);
    const [accountStartDate, setAccountStartDate] = useState('');
    const [showNameDialog, setShowNameDialog] = useState(false);

    // When equity allocation changes, auto-update the expected return to blended rate
    // Equity ~13%, Corporate Bonds ~9.5%, Govt Securities ~8.5%
    useEffect(() => {
        const eqW = equityPct / 100;
        const debtW = 1 - eqW;
        const blended = eqW * 13 + debtW * 0.6 * 9.5 + debtW * 0.4 * 8.5;
        setRate(Math.round(blended * 10) / 10);
    }, [equityPct]);

    const result = useMemo(() => {
        const years = Math.max(retireAge - age, 1);
        const r = rate / 12 / 100;
        const n = years * 12;
        const invested = monthly * n;
        const fv = r === 0 ? invested : monthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
        const annuity = fv * (annuityPct / 100);
        const lumpsum = fv - annuity;
        const monthlyPension = annuity * (annuityRate / 100) / 12;

        const timeline: YearEntry[] = [];
        let cumContrib = 0;
        for (let y = 1; y <= years; y++) {
            const nY = y * 12;
            cumContrib += monthly * 12;
            const corpus = r === 0 ? cumContrib : monthly * (((Math.pow(1 + r, nY) - 1) / r) * (1 + r));
            timeline.push({ year: y, age: age + y, contrib: monthly * 12, corpus: Math.round(corpus), cumContrib });
        }

        return { invested, corpus: Math.round(fv), wealthGained: Math.round(fv - invested), annuity: Math.round(annuity), lumpsum: Math.round(lumpsum), monthlyPension: Math.round(monthlyPension), years, timeline };
    }, [monthly, rate, age, retireAge, annuityPct, annuityRate]);

    const pieData = useMemo(() => ({
        labels: [t('nps.totalInvested'), t('nps.wealthGained')],
        datasets: [{ data: [result.invested, result.wealthGained], backgroundColor: ['#3B82F6', '#10B981'], borderColor: [c.card, c.card], borderWidth: 2 }]
    }), [result, c.card, t]);

    useHistoryTracker('NPS Calculator', { monthly, rate, age, retireAge }, { pension: result.monthlyPension }, result.corpus);

    const corpusChart = useMemo(() => ({
        labels: result.timeline.map(row => `${t('nps.age')} ${row.age}`),
        datasets: [
            { label: t('nps.corpus'), data: result.timeline.map(row => row.corpus), borderColor: '#10B981', backgroundColor: '#10B98130', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 },
            { label: t('nps.invested'), data: result.timeline.map(row => row.cumContrib), borderColor: '#3B82F6', backgroundColor: '#3B82F630', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 },
        ]
    }), [result.timeline, t]);

    const suggestedName = `NPS — ${formatINR(monthly)}/mo × ${result.years}Y`;

    const handleSave = (customName: string) => {
        const calcId = `nps-${Date.now()}`;
        addSaved({ id: calcId, calculatorType: t('nps.calculatorType'), inputValues: { monthly, rate, age, retireAge, annuityPct, name: customName }, resultValues: { primary: result.corpus }, timestamp: Date.now() });
        // Mirror into live tracker store so it appears in My Loans
        addProfile({
            id: calcId,
            name: customName,
            calculatorType: 'NPS',
            profileData: {
                monthly,
                rate,
                age,
                retireAge,
                annuityPct,
                annuityRate,
                years: result.years,
                totalInvested: result.invested,
                corpus: result.corpus,
                monthlyPension: result.monthlyPension,
                startDate: accountStartDate || new Date().toISOString().slice(0, 10),
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

    // PDF: English labels — jsPDF Helvetica doesn't support Indian scripts
    const handleDownloadPDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const config: ExportConfig = {
            title: 'NPS Retirement Report',
            inputs: [
                { label: 'Monthly Contribution', value: `INR ${Math.round(monthly).toLocaleString('en-IN')}` },
                { label: 'Expected Return Rate (%)', value: `${rate}% p.a.` },
                { label: 'Current Age', value: `${age} years` },
                { label: 'Retirement Age', value: `${retireAge} years` },
                { label: 'Annuity %', value: `${annuityPct}%` },
                { label: 'Annuity Rate', value: `${annuityRate}% p.a.` },
            ],
            results: [
                { label: 'Total Corpus at Retirement', value: `INR ${Math.round(result.corpus).toLocaleString('en-IN')}` },
                { label: 'Total Invested', value: `INR ${Math.round(result.invested).toLocaleString('en-IN')}` },
                { label: 'Wealth Gained', value: `INR ${Math.round(result.wealthGained).toLocaleString('en-IN')}` },
                { label: `Lump Sum (${100 - annuityPct}%)`, value: `INR ${Math.round(result.lumpsum).toLocaleString('en-IN')}` },
                { label: `Annuity Amount (${annuityPct}%)`, value: `INR ${Math.round(result.annuity).toLocaleString('en-IN')}` },
                { label: 'Est. Monthly Pension', value: `INR ${Math.round(result.monthlyPension).toLocaleString('en-IN')}` },
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: 'Total Invested', value: result.invested, color: '#4F46E5' },
                    { label: 'Wealth Gained', value: result.wealthGained, color: '#10B981' },
                ],
            },
            projectionTitle: 'Yearly Growth Schedule',
            projectionColumns: ['Year', 'Age', 'Annual Contribution', 'Cumulative Contribution', 'Total Corpus'],
            projectionRows: result.timeline.map((r: any) => [
                `Year ${r.year}`,
                r.age,
                `INR ${Math.round(r.contrib).toLocaleString('en-IN')}`,
                `INR ${Math.round(r.cumContrib).toLocaleString('en-IN')}`,
                `INR ${Math.round(r.corpus).toLocaleString('en-IN')}`,
            ]),
            filename: `FinCalix_NPS_Report_${tag}`,
        };
        await exportToPDF(config);
    };

    // PDF: English labels — jsPDF Helvetica doesn't support Indian scripts
    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const config: ExportConfig = {
            title: 'NPS Retirement Report',
            inputs: [
                { label: 'Monthly Contribution', value: `INR ${Math.round(monthly).toLocaleString('en-IN')}` },
                { label: 'Return Rate', value: `${rate}%` },
                { label: 'Current Age', value: String(age) },
                { label: 'Retirement Age', value: String(retireAge) },
            ],
            results: [
                { label: 'Total Corpus at Retirement', value: `INR ${Math.round(result.corpus).toLocaleString('en-IN')}` },
                { label: 'Monthly Pension', value: `INR ${Math.round(result.monthlyPension).toLocaleString('en-IN')}` },
                { label: 'Lumpsum at 60', value: `INR ${Math.round(result.lumpsum).toLocaleString('en-IN')}` },
            ],
            projectionTitle: 'Yearly Growth',
            projectionColumns: ['Year', 'Age', 'Annual Contribution', 'Cumulative Contribution', 'Total Corpus'],
            projectionRows: result.timeline.map((r: any) => [r.year, r.age, Math.round(r.contrib), Math.round(r.cumContrib), Math.round(r.corpus)]),
            filename: `FinCalix_NPS_Report_${tag}`,
        };
        await exportToExcel(config);
    };

    const handleShare = async () => {
        const text = `🏦 ${t('nps.shareTitle')}\n\n💰 ${t('nps.monthlyContribution')}: ${formatINR(monthly)}\n📈 ${t('nps.returnRate')}: ${rate}%\n🎂 ${t('nps.age')}: ${age} → ${retireAge}\n\n✅ ${t('nps.corpus')}: ${formatINR(result.corpus)}\n💵 ${t('nps.monthlyPension')}: ${formatINR(result.monthlyPension)}\n\n${t('nps.calculatedWithFinCalix')}`;
        await nativeShare(t('nps.shareNativeTitle'), text);
    };

    return (
        <div className="min-h-dvh bg-background animate-fade-in">
            <div className="sticky top-0 z-10 bg-background  px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border"><ArrowLeft size={18} className="text-muted-foreground" /></button>
                    <div className="flex-1"><h1 className="text-lg font-bold text-foreground">{t('nps.title')}</h1><p className="text-muted-foreground text-xs">{t('nps.subtitle')}</p></div>
                </div>
            </div>
            <div className="px-4 pb-28 pt-4 space-y-5">
                <div className="space-y-3">
                    <NumberInput label={t('nps.monthlyContribution')} value={monthly} onChange={setMonthly} min={500} max={200000} prefix="₹" />
                    <NumberInput label={t('nps.expectedReturn')} value={rate} onChange={setRate} min={4} max={14} suffix="%" step={0.5} />
                    <NumberInput label={t('nps.currentAge')} value={age} onChange={setAge} min={18} max={55} suffix={` ${t('nps.years')}`} />
                    <NumberInput label={t('nps.retirementAge')} value={retireAge} onChange={setRetireAge} min={55} max={70} suffix={` ${t('nps.years')}`} />
                    <NumberInput label={t('nps.annuityPurchase')} value={annuityPct} onChange={setAnnuityPct} min={20} max={100} suffix="%" helperText={t('nps.annuityPurchaseHelper')} />
                    <NumberInput label={t('nps.annuityReturnRate')} value={annuityRate} onChange={setAnnuityRate} min={4} max={9} step={0.25} suffix="%" helperText={t('nps.annuityReturnHelper')} />

                    {/* PFRDA Active Choice — equity allocation cap.
                        Cap: 75% till age 50, then declines 2.5% per year of age
                        beyond 50, floored at 50% at age 60. We render the cap
                        right next to the slider and clamp the user's input.
                        Auto-Choice (default) follows the same age-based glide
                        path automatically — Active Choice lets the user override
                        within these limits. */}
                    {(() => {
                        const equityCap = Math.max(50, 75 - Math.max(0, age - 50) * 2.5);
                        const clamped = Math.min(equityPct, equityCap);
                        if (clamped !== equityPct) {
                            // Clamp via microtask so React doesn't warn about
                            // setState during render.
                            queueMicrotask(() => setEquityPct(clamped));
                        }
                        const overCap = equityPct > equityCap;
                        return (
                            <div className="p-4 rounded-2xl border border-border bg-card">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                        {t('nps.equityAllocation', 'Equity allocation (Active Choice)')}
                                    </label>
                                    <span className="text-[10px] font-bold text-violet-500">
                                        {t('nps.pfrdaCapAt', 'PFRDA cap at age {{age}}: {{cap}}%', { age, cap: equityCap })}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={equityCap}
                                    step={5}
                                    value={Math.min(equityPct, equityCap)}
                                    onChange={e => setEquityPct(Number(e.target.value))}
                                    className="w-full"
                                />
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs font-semibold text-foreground">{Math.min(equityPct, equityCap)}% {t('nps.equity', 'Equity')}</span>
                                    <span className="text-xs text-muted-foreground">{100 - Math.min(equityPct, equityCap)}% {t('nps.debt', 'Debt + Govt')}</span>
                                </div>
                                {overCap && (
                                    <p className="text-[10px] text-amber-500 mt-1.5">
                                        ⚠ {t('nps.cappedNotice', 'Capped at {{cap}}% per PFRDA glide path', { cap: equityCap })}
                                    </p>
                                )}
                                <p className="text-[9px] text-muted-foreground mt-1.5 leading-snug">
                                    {t('nps.pfrdaNote', 'PFRDA caps equity at 75% till age 50, then 2.5%/year decline to 50% at age 60. Auto-Choice (default) follows this glide automatically.')}
                                </p>
                            </div>
                        );
                    })()}
                </div>

                {/* Result Card */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20">
                    <p className="text-blue-300/60 text-[10px] font-bold uppercase tracking-wider mb-1">{t('nps.totalCorpusAtRetirement')}</p>
                    <p className="text-3xl font-black text-foreground mb-4">{formatINR(result.corpus)}</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-muted-foreground text-[10px] uppercase font-bold">{t('nps.totalInvested')}</p><p className="text-foreground font-bold text-sm">{formatINR(result.invested)}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase font-bold">{t('nps.wealthGained')}</p><p className="text-brand-green font-bold text-sm">{formatINR(result.wealthGained)}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase font-bold">{t('nps.lumpsumAt60')}</p><p className="text-blue-400 font-bold text-sm">{formatINR(result.lumpsum)}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase font-bold">{t('nps.monthlyPension')}</p><p className="text-amber-400 font-bold text-sm">{formatINR(result.monthlyPension)}</p></div>
                    </div>
                    {!saved && (
                        <div className="mt-4 p-4 rounded-2xl border border-border bg-card">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2 block">
                                {t('common.investmentDate', 'Investment Date (optional)')}
                            </label>
                            <DateInput
                                value={accountStartDate}
                                onChange={setAccountStartDate}
                                max={new Date().toISOString().slice(0, 10)}
                                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1.5">
                                {t('common.investmentDateHint', 'Used for tracking in My Loans')}
                            </p>
                        </div>
                    )}
                    {/* LIVE NPS TRACKER — appears the moment user picks a date */}
                    {accountStartDate && (
                        <div className="mt-4">
                            <LiveInvestmentTracker
                                mode="recurring"
                                startDate={accountStartDate}
                                totalYears={result.years}
                                rate={rate}
                                monthlyContribution={monthly}
                                projectedMaturity={result.corpus}
                                label={t('nps.liveTracker', 'Live NPS Tracker')}
                            />
                        </div>
                    )}
                    {saved ? (
                        <div className="flex gap-2 mt-4">
                            <div className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <Check size={16} /> {t('common.saved')}
                            </div>
                            <button onClick={() => navigate('/my-loans')}
                                className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 transition-all active:scale-95">
                                {t('common.viewInMyLoans', 'View')}
                            </button>
                            <button onClick={handleRemove}
                                className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 transition-all active:scale-95">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ) : (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowNameDialog(true)} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-foreground font-bold text-sm">
                            <Save size={16} /> {t('nps.saveCalculation')}
                        </motion.button>
                    )}

                    <SaveNameDialog
                        open={showNameDialog}
                        onClose={() => setShowNameDialog(false)}
                        onConfirm={(name) => handleSave(name)}
                        defaultName={suggestedName}
                    />
                </motion.div>

                {/* Pension Visualization */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <h3 className="text-foreground font-bold text-sm mb-2 flex items-center gap-2"><IndianRupee size={16} className="text-amber-400" /> {t('nps.retirementIncomeProjection')}</h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <p className="text-muted-foreground text-[9px] uppercase font-bold">{t('nps.monthlyPension')}</p>
                            <p className="text-amber-400 font-bold text-lg">{formatINR(result.monthlyPension)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <p className="text-muted-foreground text-[9px] uppercase font-bold">{t('nps.annualPension')}</p>
                            <p className="text-amber-400 font-bold text-lg">{formatINR(result.monthlyPension * 12)}</p>
                        </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <p className="text-muted-foreground text-[9px] uppercase font-bold">{t('nps.annuityInvestment')}</p>
                        <p className="text-foreground font-bold text-sm">{formatINR(result.annuity)} <span className="text-muted-foreground text-xs">({t('nps.annuityBreakdown', { annuityPct, annuityRate })})</span></p>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="p-4 rounded-2xl bg-card border border-border">
                    <h3 className="text-foreground font-bold text-sm mb-3">{t('nps.investmentVsReturns')}</h3>
                    <div className="w-48 h-48 mx-auto"><Pie data={pieData} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: c.textSecondary, font: { size: 11 } } } } }} /></div>
                </div>

                {/* Corpus Growth Line Chart */}
                <div className="p-4 rounded-2xl bg-card border border-border">
                    <h3 className="text-foreground font-bold text-sm mb-3">{t('nps.corpusGrowthTimeline')}</h3>
                    <div className="h-56">
                        <Line ref={chartRef} data={corpusChart} options={{
                            responsive: true, maintainAspectRatio: false,
                            scales: {
                                y: { grid: { color: c.border }, ticks: { color: c.textMuted, font: { size: 8 }, callback: (v: any) => v >= 10000000 ? `${(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K` } },
                                x: { grid: { display: false }, ticks: { color: c.textMuted, font: { size: 8 }, maxTicksLimit: 8 } },
                            },
                            plugins: { legend: { labels: { color: c.textSecondary, font: { size: 10 } } } }
                        }} />
                    </div>
                </div>

                {/* What-If Simulator */}
                <WhatIfSimulator
                    sliders={[
                        { key: 'monthly', label: t('nps.monthlyContribution'), min: 500, max: 100000, step: 500, prefix: '₹' },
                        { key: 'rate', label: t('nps.expectedReturn'), min: 6, max: 14, step: 0.5, suffix: '%' },
                    ]}
                    currentInputs={{ monthly, rate, years: result.years }}
                    calculateResult={(inputs) => {
                        const r = inputs.rate / 12 / 100;
                        const n = inputs.years * 12;
                        return r === 0 ? inputs.monthly * n : Math.round(inputs.monthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r)));
                    }}
                    resultLabel={t('nps.totalCorpus')}
                />

                <SmartInsight calculatorType="nps" inputs={{ monthly, rate, years: result.years }} results={{ corpus: result.corpus, invested: result.invested }} />

                {/* Tax Benefit Section */}
                <button onClick={() => setShowTaxInfo(!showTaxInfo)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm">
                    <span className="flex items-center gap-2"><Shield size={16} className="text-green-400" /> {t('nps.taxBenefitsSummary')}</span>
                    {showTaxInfo ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                    {showTaxInfo && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                                {[
                                    { title: t('nps.taxSec80CCD1Title'), desc: t('nps.taxSec80CCD1Desc') },
                                    { title: t('nps.taxSec80CCD1BTitle'), desc: t('nps.taxSec80CCD1BDesc') },
                                    { title: t('nps.taxSec80CCD2Title'), desc: t('nps.taxSec80CCD2Desc') },
                                    { title: t('nps.taxFreeLumpsumTitle'), desc: t('nps.taxFreeLumpsumDesc') },
                                    {
                                        title: t('nps.phasedLumpsumTitle', 'Phased withdrawal — heads up'),
                                        desc: t('nps.phasedLumpsumDesc', 'The 60% lump-sum is tax-free only when taken at retirement (one-shot or via SLW until age 85 per PFRDA 2026 rules). Pre-retirement partial withdrawals (Tier-1) are tax-free up to 25% of own contribution. Annuity payouts are fully taxable as income.'),
                                    },
                                    { title: t('nps.totalPotentialSavingTitle'), desc: t('nps.totalPotentialSavingDesc', { amount: Math.min(monthly * 12, 200000).toLocaleString('en-IN') }) },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <Shield size={14} className="text-green-400 flex-shrink-0 mt-1" />
                                        <div><p className="text-foreground font-bold text-xs">{item.title}</p><p className="text-muted-foreground text-[11px]">{item.desc}</p></div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Year-wise Timeline */}
                <button onClick={() => setShowTimeline(!showTimeline)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm">
                    <span className="flex items-center gap-2"><Calendar size={16} className="text-muted-foreground" /> {t('nps.yearWiseTimeline')}</span>
                    {showTimeline ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                    {showTimeline && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="rounded-2xl bg-card border border-border overflow-hidden">
                                <div className="grid grid-cols-4 text-[9px] font-bold text-muted-foreground uppercase p-2 bg-slate-100 dark:bg-slate-800/50"><span>{t('nps.year')}</span><span>{t('nps.age')}</span><span>{t('nps.contrib')}</span><span>{t('nps.corpus')}</span></div>
                                {result.timeline.map((row, i) => (
                                    <div key={i} className={`grid grid-cols-4 text-[10px] p-2 ${i % 2 === 0 ? 'bg-card' : 'bg-slate-50 dark:bg-slate-800/20'} text-slate-600 dark:text-slate-300`}>
                                        <span>{row.year}</span><span>{row.age}</span><span>{formatINR(row.cumContrib)}</span><span className="font-bold text-foreground">{formatINR(row.corpus)}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Export & Share */}
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={handleDownloadPDF} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-muted-foreground text-[10px] font-medium"><Download size={16} /> {t('nps.pdf')}</button>
                    <button onClick={handleDownloadExcel} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-muted-foreground text-[10px] font-medium"><Download size={16} /> {t('nps.excel')}</button>
                    <button onClick={handleShare} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-bold"><Share2 size={16} /> {t('nps.share')}</button>
                </div>

                <ShareableCard
                    title={t('nps.shareTitle')}
                    highlight={formatINR(result.corpus)}
                    subtitle={t('nps.shareSubtitle', { age: retireAge, rate })}
                    details={[
                        { label: t('nps.monthlySIP'), value: formatINR(monthly) },
                        { label: t('nps.monthlyPension'), value: formatINR(result.monthlyPension) },
                        { label: t('nps.totalInvested'), value: formatINR(result.invested) },
                        { label: t('nps.wealthGained'), value: formatINR(result.wealthGained) },
                    ]}
                    gradient="from-blue-600 via-indigo-600 to-violet-600"
                />

                
                
            </div>

            <DisclaimerComponent module="nps" />
        </div>
    );
}
