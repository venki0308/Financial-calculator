import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Save, Check, Shield, Calendar, IndianRupee, ChevronDown, ChevronUp, Download, Share2, Trash2 } from 'lucide-react';
import { nativeShare } from '../utils/nativeShare';
import { motion, AnimatePresence } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import NumberInput from '../components/NumberInput';
import DateInput from '../components/DateInput';
import LiveStatusCard from '../components/LiveStatusCard';
import DisclaimerComponent from '../components/DisclaimerComponent';
import SmartInsight from '../components/SmartInsight';
import WhatIfSimulator from '../components/WhatIfSimulator';
import ShareableCard from '../components/ShareableCard';
import { formatINR } from '../utils/calculations';
import { calculateScssStatus, type ScssStatusInput } from '../utils/investmentStatusEngine';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import { AnalyticsService } from '../lib/analytics';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useAppColors } from '../theme/useAppColors';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function SCSSCalculator() {
    const { t } = useTranslation();
    useEffect(() => { AnalyticsService.trackScreen('SCSS_Calculator_Advanced'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const { addSaved, removeSaved } = useCalculatorStore();
    const c = useAppColors();

    const [investment, setInvestment] = useState(1500000);
    const [rate, setRate] = useState(8.2);
    const [tenure, setTenure] = useState<5 | 8>(5);
    const [saved, setSaved] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);
    const [scssStartDate, setScssStartDate] = useState('');
    const [showTaxInfo, setShowTaxInfo] = useState(false);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showPenalty, setShowPenalty] = useState(false);

    const scssStatus = useMemo(() => {
        if (!scssStartDate) return null;
        return calculateScssStatus({
            principal: investment,
            rate,
            startDate: scssStartDate,
            tenure,
        });
    }, [scssStartDate, investment, rate, tenure]);

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
        labels: [t('scss.principalLabel'), t('scss.totalInterestLabel')],
        datasets: [{
            data: [investment, result.totalInterest],
            backgroundColor: ['#3B82F6', '#8B5CF6'],
            borderColor: [c.card, c.card],
            borderWidth: 2,
        }],
    }), [investment, result.totalInterest, c.card, t]);

    const handleSave = () => {
        const calcId = `scss-${Date.now()}`;
        addSaved({
            id: calcId,
            calculatorType: t('scss.calculatorType'),
            inputValues: { investment, rate, tenure },
            resultValues: { primary: result.quarterlyIncome, maturity: result.maturityAmount },
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
        await exportToPDF({
            title: t('scss.reportTitle'),
            inputs: [
                { label: t('scss.investmentAmountLabel'), value: `₹${Math.round(investment).toLocaleString('en-IN')}` },
                { label: t('scss.interestRateLabel'), value: `${rate}% p.a.` },
                { label: t('scss.tenureLabel'), value: `${tenure} ${t('scss.years')}` },
            ],
            results: [
                { label: t('scss.quarterlyInterestPayout'), value: `₹${Math.round(result.quarterlyIncome).toLocaleString('en-IN')}` },
                { label: t('scss.annualInterestLabel'), value: `₹${Math.round(result.annualInterest).toLocaleString('en-IN')}` },
                { label: t('scss.totalInterestOverTenure'), value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
                { label: t('scss.maturityAmountLabel'), value: `₹${Math.round(result.maturityAmount).toLocaleString('en-IN')}` },
                ...(result.tdsApplicable ? [
                    { label: t('scss.annualTDS10'), value: `₹${Math.round(result.annualTDS).toLocaleString('en-IN')}` },
                    { label: t('scss.netAnnualIncomeLabel'), value: `₹${Math.round(result.netAnnualIncome).toLocaleString('en-IN')}` },
                ] : []),
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: t('scss.principalInvested'), value: investment, color: '#4F46E5' },
                    { label: t('scss.totalInterestLabel'), value: result.totalInterest, color: '#10B981' },
                ],
            },
            projectionTitle: t('scss.annualInterestPayoutSchedule'),
            projectionColumns: [t('scss.yearCol'), t('scss.annualInterestLabel'), t('scss.tdsDeducted'), t('scss.netInterestCol'), t('scss.cumulativeInterestCol')],
            projectionRows: result.yearlyBreakdown.map((r: any) => [
                `${t('scss.yearCol')} ${r.year}`,
                `₹${Math.round(r.interest).toLocaleString('en-IN')}`,
                `₹${Math.round(r.tds).toLocaleString('en-IN')}`,
                `₹${Math.round(r.netInterest).toLocaleString('en-IN')}`,
                `₹${Math.round(r.cumInterest).toLocaleString('en-IN')}`,
            ]),
            additionalTables: [
                ...(scssStatus ? [{
                    title: t('scss.liveStatusAsOf', { date: new Date().toLocaleDateString('en-IN') }),
                    columns: [t('scss.metricCol'), t('scss.valueCol')],
                    rows: [
                        [t('scss.quartersCompleted'), String(scssStatus.quartersCompleted)],
                        [t('scss.quarterlyIncomeLabel'), formatINR(scssStatus.quarterlyIncome)],
                        [t('scss.totalIncomeReceived'), formatINR(scssStatus.totalIncomeReceived)],
                        [t('scss.quartersRemaining'), String(scssStatus.quartersRemaining)],
                        [t('scss.maturityDateLabel'), scssStatus.maturityDate],
                    ] as Array<Array<string | number>>,
                }] : []),
            ],
            filename: `FinCalix_SCSS_Report_${tag}`,
        });
    };

    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        await exportToExcel({
            title: t('scss.reportTitle'),
            inputs: [
                { label: t('scss.investmentAmountLabel'), value: `₹${Math.round(investment).toLocaleString('en-IN')}` },
                { label: t('scss.interestRateLabel'), value: `${rate}%` },
                { label: t('scss.tenureLabel'), value: `${tenure} ${t('scss.years')}` },
            ],
            results: [
                { label: t('scss.quarterlyPayout'), value: `₹${Math.round(result.quarterlyIncome).toLocaleString('en-IN')}` },
                { label: t('scss.totalInterestLabel'), value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
            ],
            projectionTitle: t('scss.annualPayoutSchedule'),
            projectionColumns: [t('scss.yearCol'), t('scss.annualInterestLabel'), t('scss.tdsDeducted'), t('scss.netInterestCol'), t('scss.cumulativeInterestCol')],
            projectionRows: result.yearlyBreakdown.map((r: any) => [r.year, Math.round(r.interest), Math.round(r.tds), Math.round(r.netInterest), Math.round(r.cumInterest)]),
            additionalTables: [
                ...(scssStatus ? [{
                    title: t('scss.liveStatusAsOf', { date: new Date().toLocaleDateString('en-IN') }),
                    columns: [t('scss.metricCol'), t('scss.valueCol')],
                    rows: [
                        [t('scss.quartersCompleted'), String(scssStatus.quartersCompleted)],
                        [t('scss.quarterlyIncomeLabel'), formatINR(scssStatus.quarterlyIncome)],
                        [t('scss.totalIncomeReceived'), formatINR(scssStatus.totalIncomeReceived)],
                        [t('scss.quartersRemaining'), String(scssStatus.quartersRemaining)],
                        [t('scss.maturityDateLabel'), scssStatus.maturityDate],
                    ] as Array<Array<string | number>>,
                }] : []),
            ],
            filename: `FinCalix_SCSS_Report_${tag}`,
        });
    };

    const handleShare = async () => {
        const text = `🏦 ${t('scss.shareTitle')}\n\n💰 ${t('scss.investmentAmountLabel')}: ${formatINR(investment)}\n📈 ${t('scss.rateLabel')}: ${rate}% p.a.\n📅 ${t('scss.tenureLabel')}: ${tenure} ${t('scss.years')}\n\n✅ ${t('scss.quarterlyIncomeLabel')}: ${formatINR(result.quarterlyIncome)}\n✅ ${t('scss.totalInterestLabel')}: ${formatINR(result.totalInterest)}\n✅ ${t('scss.maturityAmountLabel')}: ${formatINR(result.maturityAmount)}\n\n${t('scss.calculatedWithFinCalix')} 🧮`;
        await nativeShare(t('scss.sharePlanTitle'), text);
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
                        <h1 className="text-lg font-bold text-foreground">{t('scss.title')}</h1>
                        <p className="text-muted-foreground text-xs">{t('scss.subtitle')}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pb-28 pt-4 space-y-5">
                {/* Inputs */}
                <div className="space-y-3">
                    <NumberInput label={t('scss.investmentAmount')} value={investment} onChange={setInvestment} min={1000} max={3000000} prefix="₹" helperText={t('scss.maxInvestment')} />
                    <NumberInput label={t('scss.interestRate')} value={rate} onChange={setRate} min={1} max={15} suffix="%" step={0.1} helperText={t('scss.currentRate')} />

                    {/* Tenure Toggle */}
                    <div className="space-y-1.5">
                        <p className="text-foreground text-sm font-medium">{t('scss.tenure')}</p>
                        <div className="flex gap-2">
                            {([5, 8] as const).map(yr => (
                                <button
                                    key={yr}
                                    onClick={() => setTenure(yr)}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${tenure === yr ? 'bg-brand-purple/15 border-brand-purple text-brand-purple' : 'bg-card border-border text-muted-foreground'}`}
                                >
                                    {yr === 5 ? t('scss.fiveYears') : t('scss.eightYears')}
                                </button>
                            ))}
                        </div>
                        {tenure === 8 && (
                            <p className="text-[10px] text-muted-foreground px-1">{t('scss.extensionNote')}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-foreground text-sm font-medium mb-1.5 block">{t('scss.scssStartDate')}</label>
                        <DateInput
                            value={scssStartDate}
                            onChange={setScssStartDate}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm font-semibold focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50"
                        />
                    </div>
                </div>

                {/* Result Card */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/30">
                    <p className="text-purple-600 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wider mb-1">{t('scss.quarterlyIncome')}</p>
                    <p className="text-3xl font-black text-foreground mb-4">{formatINR(result.quarterlyIncome)}</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">{t('scss.annualIncome')}</p>
                            <p className="text-green-600 dark:text-brand-green font-bold text-sm">{formatINR(result.annualInterest)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">{t('scss.totalInterestYrs', { years: tenure })}</p>
                            <p className="text-slate-800 dark:text-slate-100 font-bold text-sm">{formatINR(result.totalInterest)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">{t('scss.principal')}</p>
                            <p className="text-blue-600 dark:text-blue-400 font-bold text-sm">{formatINR(investment)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">{t('scss.maturityAmount')}</p>
                            <p className="text-amber-600 dark:text-amber-400 font-bold text-sm">{formatINR(result.maturityAmount)}</p>
                        </div>
                    </div>
                    {saved ? (
                        <div className="flex gap-2 mt-4">
                            <div className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <Check size={16} /> {t('common.saved')}
                            </div>
                            <button onClick={handleRemove}
                                className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 transition-all active:scale-95">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ) : (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/20 dark:bg-white/10 border border-white/20 text-slate-800 dark:text-slate-100 font-bold text-sm">
                            <Save size={16} /> {t('scss.saveCalculation')}
                        </motion.button>
                    )}
                </motion.div>

                {/* TDS Alert Banner */}
                {result.tdsApplicable && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                        <IndianRupee size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-amber-600 dark:text-amber-400 font-bold text-xs mb-1">{t('scss.tdsApplicableTitle')}</p>
                            <p className="text-slate-600 dark:text-slate-300 text-xs">{t('scss.tdsApplicableDesc', { annualInterest: formatINR(result.annualInterest), annualTDS: formatINR(result.annualTDS) })}</p>
                            <p className="text-green-600 dark:text-brand-green font-bold text-xs mt-1">{t('scss.netQuarterlyAfterTDS', { amount: formatINR(result.netQuarterlyIncome) })}</p>
                        </div>
                    </motion.div>
                )}

                {/* Pie Chart */}
                <div className="p-4 rounded-2xl bg-card border border-border">
                    <h3 className="text-foreground font-bold text-sm mb-3">{t('scss.principalVsInterest')}</h3>
                    <div className="w-44 h-44 mx-auto">
                        <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: c.textSecondary, font: { size: 11 } } } } }} />
                    </div>
                </div>

                {/* What-If Simulator */}
                <WhatIfSimulator
                    sliders={[
                        { key: 'investment', label: t('scss.investmentAmount'), min: 100000, max: 3000000, step: 50000, prefix: '₹' },
                        { key: 'rate', label: t('scss.interestRateLabel'), min: 6, max: 10, step: 0.1, suffix: '%' },
                    ]}
                    currentInputs={{ investment, rate, tenure }}
                    calculateResult={(inputs) => Math.round((inputs.investment * inputs.rate / 100) / 4)}
                    resultLabel={t('scss.quarterlyIncome')}
                />

                <SmartInsight
                    calculatorType="scss"
                    inputs={{ investment, rate, tenure }}
                    results={{ quarterlyIncome: result.quarterlyIncome, totalInterest: result.totalInterest, annualInterest: result.annualInterest }}
                />

                {/* Tax & TDS Info */}
                <button onClick={() => setShowTaxInfo(!showTaxInfo)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm">
                    <span className="flex items-center gap-2"><Shield size={16} className="text-green-400" /> {t('scss.taxTDSInfo')}</span>
                    {showTaxInfo ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                    {showTaxInfo && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                                {[
                                    { title: t('scss.interestTaxability'), desc: t('scss.interestTaxabilityDesc') },
                                    { title: t('scss.tdsThreshold'), desc: t('scss.tdsThresholdDesc') },
                                    { title: t('scss.form15H'), desc: t('scss.form15HDesc') },
                                    { title: t('scss.sec80CBenefit'), desc: t('scss.sec80CBenefitDesc') },
                                    { title: t('scss.jointAccount'), desc: t('scss.jointAccountDesc') },
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
                    <span className="flex items-center gap-2"><Calendar size={16} className="text-muted-foreground" /> {t('scss.yearWiseBreakdown')}</span>
                    {showBreakdown ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                    {showBreakdown && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="rounded-2xl bg-card border border-border overflow-hidden">
                                <div className="grid grid-cols-4 text-[9px] font-bold text-muted-foreground uppercase p-2 bg-slate-200 dark:bg-slate-800/50">
                                    <span>{t('scss.yearCol')}</span><span>{t('scss.interestCol')}</span><span>{t('scss.tdsCol')}</span><span>{t('scss.cumulativeCol')}</span>
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
                    <span className="flex items-center gap-2"><IndianRupee size={16} className="text-red-400" /> {t('scss.prematureWithdrawalPenalty')}</span>
                    {showPenalty ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                    {showPenalty && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-500/10 border border-slate-500/20">
                                    <p className="text-slate-600 dark:text-slate-400 font-bold text-xs">{t('scss.before1Year')}</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs ml-auto">{t('scss.closureNotPermitted')}</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                        <div>
                                            <p className="text-red-500 dark:text-red-400 font-bold text-xs">{t('scss.after1YrBefore2Yrs')}</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs">{t('scss.penalty1_5Percent')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-red-500 dark:text-red-400 font-bold text-xs">−{formatINR(result.penaltyAfter1Yr)}</p>
                                            <p className="text-slate-700 dark:text-slate-200 text-xs font-semibold">{t('scss.youGet', { amount: formatINR(result.amtAfter1Yr) })}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                        <div>
                                            <p className="text-amber-600 dark:text-amber-400 font-bold text-xs">{t('scss.after2YrsBeforeMaturity')}</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs">{t('scss.penalty1Percent')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-amber-600 dark:text-amber-400 font-bold text-xs">−{formatINR(result.penaltyAfter2Yrs)}</p>
                                            <p className="text-slate-700 dark:text-slate-200 text-xs font-semibold">{t('scss.youGet', { amount: formatINR(result.amtAfter2Yrs) })}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                                        <div>
                                            <p className="text-green-600 dark:text-green-400 font-bold text-xs">{t('scss.atMaturity', { years: tenure })}</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs">{t('scss.noPenaltyFullAmount')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-green-600 dark:text-green-400 font-bold text-xs">{t('scss.noDeduction')}</p>
                                            <p className="text-slate-700 dark:text-slate-200 text-xs font-semibold">{t('scss.youGet', { amount: formatINR(result.maturityAmount) })}</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs">{t('scss.penaltyNote')}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Export & Share */}
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={handleDownloadPDF} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-slate-600 dark:text-slate-300 text-[10px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <Download size={16} /> {t('scss.pdf')}
                    </button>
                    <button onClick={handleDownloadExcel} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-slate-600 dark:text-slate-300 text-[10px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <Download size={16} /> {t('scss.excel')}
                    </button>
                    <button onClick={handleShare} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-[10px] font-bold">
                        <Share2 size={16} /> {t('scss.share')}
                    </button>
                </div>

                <ShareableCard
                    title={t('scss.mySCSSInvestment')}
                    highlight={formatINR(result.quarterlyIncome)}
                    subtitle={t('scss.shareSubtitle', { investment: (investment / 100000).toFixed(1), rate })}
                    details={[
                        { label: t('scss.annualIncome'), value: formatINR(result.annualInterest) },
                        { label: t('scss.totalInterest'), value: formatINR(result.totalInterest) },
                        { label: t('scss.tenure'), value: `${tenure} ${t('scss.years')}` },
                        { label: t('scss.maturityAmount'), value: formatINR(result.maturityAmount) },
                    ]}
                    gradient="from-purple-600 via-indigo-600 to-violet-600"
                />
            </div>

            {scssStatus && (
                <div className="px-4 mb-5">
                    <LiveStatusCard
                        calculatorType="SCSS"
                        profileData={{ principal: investment, rate, startDate: scssStartDate, tenure }}
                        title={t('scss.liveScssStatus')}
                        subtitle={t('scss.liveScssSubtitle', { tenure, rate })}
                        startDate={scssStartDate}
                        metrics={[
                            { label: t('scss.quarterlyIncomeLabel'), value: formatINR(scssStatus.quarterlyIncome), color: 'green' },
                            { label: t('scss.totalReceived'), value: formatINR(scssStatus.totalIncomeReceived), color: 'blue' },
                            { label: t('scss.remaining'), value: formatINR(scssStatus.totalIncomeOnMaturity - scssStatus.totalIncomeReceived) },
                        ]}
                        progressPercent={(scssStatus.quartersCompleted / (tenure * 4)) * 100}
                        progressLabel={t('scss.progressLabel', { completed: scssStatus.quartersCompleted, total: tenure * 4 })}
                        insightText={scssStatus.quartersRemaining > 0 ? t('scss.insightRemaining', { quarters: scssStatus.quartersRemaining, amount: formatINR(scssStatus.totalIncomeOnMaturity) }) : t('scss.insightMatured', { amount: formatINR(scssStatus.totalIncomeOnMaturity) })}
                    />
                </div>
            )}

            <DisclaimerComponent module="scss" />
        </div>
    );
}
