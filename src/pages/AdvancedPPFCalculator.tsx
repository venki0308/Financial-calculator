import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Info, Share2, Save, Check, Download, FileText, Landmark, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { nativeShare } from '../utils/nativeShare';
import NumberInput from '../components/NumberInput';
import DateInput from '../components/DateInput';
import LiveStatusCard from '../components/LiveStatusCard';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { calculatePpfStatus, type PpfStatusInput } from '../utils/investmentStatusEngine';

import { formatINR, formatINRWords } from '../utils/calculations';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import { AnalyticsService } from '../lib/analytics';
import ShareableCard from '../components/ShareableCard';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import { useTrackCalculator } from '../hooks/useTrackCalculator';

type Frequency = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
const FREQ_OPTIONS: { key: Frequency; labelKey: string; factor: number }[] = [
    { key: 'monthly', labelKey: 'ppf.monthly', factor: 12 },
    { key: 'quarterly', labelKey: 'ppf.quarterly', factor: 4 },
    { key: 'half-yearly', labelKey: 'ppf.halfYearly', factor: 2 },
    { key: 'yearly', labelKey: 'ppf.yearly', factor: 1 },
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
    const { t } = useTranslation();
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
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);
    const [ppfOpenDate, setPpfOpenDate] = useState('');

    const { addHistory, addSaved, removeSaved } = useCalculatorStore();

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

    const ppfStatus = useMemo(() => {
        if (!ppfOpenDate) return null;
        return calculatePpfStatus({ yearlyDeposit: annualContribution, rate, openingDate: ppfOpenDate });
    }, [annualContribution, rate, ppfOpenDate]);

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
        const calcId = `PPF-Save-${Date.now()}`;
        addSaved({
            id: calcId,
            calculatorType: 'PPF Calculator',
            inputValues: { annualContribution, rate, years, frequency },
            resultValues: { primary: maturityValue, totalInvested, totalInterest },
            timestamp: Date.now()
        });
        setIsSaved(true);
        setLastSavedId(calcId);
    };

    const handleRemove = () => {
        if (lastSavedId) {
            removeSaved(lastSavedId);
            setLastSavedId(null);
            setIsSaved(false);
        }
    };

    const handlePDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const freqLabel = frequency === 'monthly' ? t('ppf.monthly') : frequency === 'quarterly' ? t('ppf.quarterly') : frequency === 'half-yearly' ? t('ppf.halfYearly') : t('ppf.yearly');
        await exportToPDF({
            title: t('ppf.reportTitle'),
            inputs: [
                { label: t('ppf.contributionFrequency'), value: freqLabel },
                { label: t('ppf.amountPerPeriod'), value: `₹${Math.round(amountPerPeriod).toLocaleString('en-IN')}` },
                { label: t('ppf.interestRateLabel'), value: `${rate}% p.a.` },
                { label: t('ppf.investmentPeriod'), value: `${years} ${t('ppf.years')}` },
            ],
            results: [
                { label: t('ppf.totalAmountInvested'), value: `₹${Math.round(totalInvested).toLocaleString('en-IN')}` },
                { label: t('ppf.totalInterestEarned'), value: `₹${Math.round(totalInterest).toLocaleString('en-IN')}` },
                { label: t('ppf.maturityValue'), value: `₹${Math.round(maturityValue).toLocaleString('en-IN')}` },
                { label: t('ppf.wealthMultiplier'), value: `${(maturityValue / totalInvested).toFixed(2)}x` },
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: t('ppf.totalInvested'), value: totalInvested, color: '#4F46E5' },
                    { label: t('ppf.interestEarned'), value: totalInterest, color: '#10B981' },
                ],
            },
            projectionTitle: t('ppf.yearlyGrowth'),
            projectionColumns: [t('ppf.year'), t('ppf.openingBalance'), t('ppf.annualDeposit'), t('ppf.interestEarned'), t('ppf.closingBalance')],
            projectionRows: schedule.map((r: any) => [
                `${t('ppf.year')} ${r.year}`,
                `₹${Math.round(r.opening || 0).toLocaleString('en-IN')}`,
                `₹${Math.round(r.contribution).toLocaleString('en-IN')}`,
                `₹${Math.round(r.interest).toLocaleString('en-IN')}`,
                `₹${Math.round(r.closing).toLocaleString('en-IN')}`,
            ]),
            additionalTables: [
                ...(ppfStatus ? [{
                    title: `${t('ppf.liveStatus')} (${t('ppf.asOf')} ${new Date().toLocaleDateString('en-IN')})`,
                    columns: [t('ppf.metric'), t('ppf.value')],
                    rows: [
                        [t('ppf.accountAgeYears'), String(ppfStatus.yearsCompleted)],
                        [t('ppf.currentYearOf15'), String(ppfStatus.currentYear)],
                        [t('ppf.balanceToday'), formatINR(ppfStatus.balanceToday)],
                        [t('ppf.totalDepositedLabel'), formatINR(ppfStatus.totalDeposited)],
                        [t('ppf.interestEarnedLabel'), formatINR(ppfStatus.interestEarned)],
                        [t('ppf.maturityDateLabel'), ppfStatus.maturityDate],
                        [t('ppf.loanEligible'), ppfStatus.loanEligible ? t('ppf.yes') : t('ppf.no')],
                        [t('ppf.withdrawalEligible'), ppfStatus.withdrawalEligible ? t('ppf.yes') : t('ppf.no')],
                    ] as Array<Array<string | number>>,
                }] : []),
            ],
            filename: `FinCalix_PPF_Report_${tag}`,
        });
    };

    const handleExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        await exportToExcel({
            title: t('ppf.reportTitle'),
            inputs: [
                { label: t('ppf.interestRateLabel'), value: `${rate}%` },
                { label: t('ppf.investmentPeriod'), value: `${years} ${t('ppf.years')}` },
            ],
            results: [
                { label: t('ppf.totalInvested'), value: `₹${Math.round(totalInvested).toLocaleString('en-IN')}` },
                { label: t('ppf.interestEarned'), value: `₹${Math.round(totalInterest).toLocaleString('en-IN')}` },
                { label: t('ppf.maturityValue'), value: `₹${Math.round(maturityValue).toLocaleString('en-IN')}` },
            ],
            projectionTitle: t('ppf.yearlyGrowth'),
            projectionColumns: [t('ppf.year'), t('ppf.openingBalance'), t('ppf.annualDeposit'), t('ppf.interestEarned'), t('ppf.closingBalance')],
            projectionRows: schedule.map((r: any) => [r.year, Math.round(r.opening || 0), Math.round(r.contribution), Math.round(r.interest), Math.round(r.closing)]),
            additionalTables: [
                ...(ppfStatus ? [{
                    title: `${t('ppf.liveStatus')} (${t('ppf.asOf')} ${new Date().toLocaleDateString('en-IN')})`,
                    columns: [t('ppf.metric'), t('ppf.value')],
                    rows: [
                        [t('ppf.accountAgeYears'), String(ppfStatus.yearsCompleted)],
                        [t('ppf.currentYearOf15'), String(ppfStatus.currentYear)],
                        [t('ppf.balanceToday'), formatINR(ppfStatus.balanceToday)],
                        [t('ppf.totalDepositedLabel'), formatINR(ppfStatus.totalDeposited)],
                        [t('ppf.interestEarnedLabel'), formatINR(ppfStatus.interestEarned)],
                        [t('ppf.maturityDateLabel'), ppfStatus.maturityDate],
                        [t('ppf.loanEligible'), ppfStatus.loanEligible ? t('ppf.yes') : t('ppf.no')],
                        [t('ppf.withdrawalEligible'), ppfStatus.withdrawalEligible ? t('ppf.yes') : t('ppf.no')],
                    ] as Array<Array<string | number>>,
                }] : []),
            ],
            filename: `FinCalix_PPF_Report_${tag}`,
        });
    };

    return (
        <div className="min-h-dvh bg-white dark:bg-background animate-fade-in">
            <div className="sticky top-0 z-10 bg-white dark:bg-[#0F172A]  px-4 pt-14 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                            <ArrowLeft size={18} className="text-slate-600 dark:text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-foreground">{t('ppf.title')}</h1>
                            <p className="text-muted-foreground text-xs">{t('ppf.subtitle')}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                            <Info size={16} className="text-slate-600 dark:text-muted-foreground" />
                        </button>
                        <button className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border"
                            onClick={() => nativeShare(t('ppf.title'), t('ppf.shareText'), window.location.href)}>
                            <Share2 size={16} className="text-slate-600 dark:text-muted-foreground" />
                        </button>
                    </div>
                </div>
            </div>

            
            

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
                            {t(f.labelKey)}
                        </button>
                    ))}
                </div>

                {/* Inputs */}
                <div className="space-y-3 mb-5">
                    <NumberInput label={t('ppf.investmentPer', { period: frequency === 'yearly' ? t('ppf.year') : frequency === 'half-yearly' ? t('ppf.halfYear') : frequency === 'quarterly' ? t('ppf.quarter') : t('ppf.month') })}
                        value={amountPerPeriod} onChange={setAmountPerPeriod}
                        min={PPF_MIN_INVEST} max={maxPerPeriod} prefix="₹"
                        helperText={`₹${PPF_MIN_INVEST.toLocaleString()} - ₹${maxPerPeriod.toLocaleString()} (${t('ppf.annualMax')})`} />
                    <NumberInput label={t('ppf.interestRate')} value={rate} onChange={setRate}
                        min={1} max={15} suffix="%" step={0.1} helperText={t('ppf.currentGovtRate')} />
                    <NumberInput label={t('ppf.investmentPeriod')} value={years} onChange={setYears}
                        min={PPF_LOCK_IN_YEARS} max={50} suffix={` ${t('ppf.years')}`}
                        helperText={t('ppf.minYearsHelper', { min: PPF_LOCK_IN_YEARS, ext: PPF_EXTENSION_YEARS })} />
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">{t('ppf.accountOpeningDate')}</label>
                        <DateInput
                            value={ppfOpenDate}
                            onChange={setPpfOpenDate}
                            max={new Date().toISOString().slice(0, 10)}
                            className="w-full bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl px-4 py-3 text-slate-900 dark:text-foreground text-sm font-semibold focus:outline-none"
                        />
                    </div>
                </div>

                {/* Annual Contribution Banner */}
                <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        <span className="font-bold">{t('ppf.annualContribution')}:</span> {formatINR(annualContribution)}/{t('ppf.year')}
                        {frequency !== 'yearly' && ` (${formatINR(amountPerPeriod)} × ${freqFactor} = ${formatINR(amountPerPeriod * freqFactor)})`}
                        {amountPerPeriod * freqFactor > PPF_MAX_INVEST && (
                            <span className="text-amber-600 dark:text-amber-400"> — {t('ppf.cappedAtMax')}</span>
                        )}
                    </p>
                </div>

                {/* Result Card */}
                <motion.div layout className="p-5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-lg dark:shadow-none mb-4">
                    <div className="text-center mb-4">
                        <p className="text-muted-foreground text-sm mb-1">{t('ppf.maturityValue')}</p>
                        <motion.p key={maturityValue} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                            {formatINR(maturityValue)}
                        </motion.p>
                        {maturityValue >= 100000 && <p className="text-muted-foreground text-[10px] mt-1">({formatINRWords(maturityValue)})</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-3 rounded-xl bg-muted/30">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1">{t('ppf.totalInvested')}</p>
                            <p className="text-slate-900 dark:text-foreground font-bold text-sm">{formatINR(totalInvested)}</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-muted/30">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1">{t('ppf.interestEarned')}</p>
                            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{formatINR(totalInterest)}</p>
                        </div>
                    </div>
                </motion.div>

                {/* PPF Rules & Benefits */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-1.5 px-1 mb-1">
                        <Landmark size={13} className="text-emerald-500" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('ppf.rulesAndBenefits')}</span>
                    </div>
                    {[
                        { icon: '🔒', text: t('ppf.ruleLockIn', { years: PPF_LOCK_IN_YEARS, ext: PPF_EXTENSION_YEARS }), type: 'info' },
                        { icon: '💰', text: t('ppf.ruleWithdrawal', { year: PPF_WITHDRAWAL_YEAR }), type: 'tip' },
                        { icon: '🏦', text: t('ppf.ruleLoan', { start: PPF_LOAN_START_YEAR, end: PPF_LOAN_END_YEAR }), type: 'tip' },
                        { icon: '📋', text: t('ppf.ruleTaxBenefit'), type: 'positive' },
                        { icon: '⚡', text: t('ppf.ruleSovereign'), type: 'positive' },
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
                    className="w-full py-3.5 rounded-2xl border border-slate-200 dark:border-border text-muted-foreground font-bold text-sm bg-white dark:bg-card/50 flex items-center justify-center gap-2 mb-3 shadow-sm dark:shadow-none">
                    {showTable ? t('ppf.hide') : t('ppf.view')} {t('ppf.yearByYearBreakdown')}
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
                                            <th className="py-2 text-left font-semibold">{t('ppf.year')}</th>
                                            <th className="py-2 text-right font-semibold">{t('ppf.deposit')}</th>
                                            <th className="py-2 text-right font-semibold">{t('ppf.opening')}</th>
                                            <th className="py-2 text-right font-semibold">{t('ppf.interest')}</th>
                                            <th className="py-2 text-right font-semibold">{t('ppf.closing')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {schedule.map(row => (
                                            <tr key={row.year} className={`border-b border-slate-100 dark:border-border/30 ${
                                                row.year === PPF_LOCK_IN_YEARS ? 'bg-emerald-50 dark:bg-emerald-500/5' : ''
                                            }`}>
                                                <td className="py-1.5 text-muted-foreground font-medium">
                                                    {row.year}
                                                    {row.year === PPF_LOCK_IN_YEARS && <span className="text-[8px] text-emerald-500 ml-1">{t('ppf.maturity')}</span>}
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
                            <FileText size={16} /> {t('ppf.pdf')}
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.97 }} onClick={handleExcel}
                            className="flex-1 py-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center justify-center gap-2">
                            <Download size={16} /> {t('ppf.excel')}
                        </motion.button>
                    </div>
                    {isSaved ? (
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
                            className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                            <Save size={18} /> {t('ppf.saveCalculation')}
                        </motion.button>
                    )}
                </div>

                <ShareableCard
                    title={t('ppf.myPPFMaturity')}
                    highlight={formatINR(maturityValue)}
                    subtitle={t('ppf.shareSubtitle', { rate, years })}
                    details={[
                        { label: t('ppf.totalInvested'), value: formatINR(totalInvested) },
                        { label: t('ppf.interestEarned'), value: formatINR(totalInterest) },
                        { label: t('ppf.taxBenefitLabel'), value: t('ppf.taxBenefitValue') },
                    ]}
                    gradient="from-emerald-600 via-teal-500 to-cyan-600"
                />

                {ppfStatus && (
                    <div className="mb-5">
                        <LiveStatusCard
                            calculatorType="PPF"
                            profileData={{ yearlyDeposit: annualContribution, rate, openingDate: ppfOpenDate }}
                            title={t('ppf.ppfLiveStatus')}
                            subtitle={t('ppf.yearXOf15', { year: ppfStatus.currentYear })}
                            startDate={ppfOpenDate}
                            metrics={[
                                { label: t('ppf.deposited'), value: formatINR(ppfStatus.totalDeposited) },
                                { label: t('ppf.interestLabel'), value: formatINR(ppfStatus.interestEarned), color: 'amber' },
                                { label: t('ppf.balanceLabel'), value: formatINR(ppfStatus.balanceToday), color: 'green' },
                            ]}
                            progressPercent={(ppfStatus.yearsCompleted / 15) * 100}
                            progressLabel={`${t('ppf.yearXOf15Completed', { year: ppfStatus.yearsCompleted })}${ppfStatus.daysToMaturity > 0 ? ` — ${t('ppf.daysToMaturity', { days: ppfStatus.daysToMaturity })}` : ''}`}
                            warningText={ppfStatus.yearsCompleted < 3 ? t('ppf.noWithdrawalOrLoanYet') : undefined}
                            insightText={
                                ppfStatus.yearsCompleted >= 15
                                    ? t('ppf.ppfMaturedInsight', { maturityValue: formatINR(ppfStatus.maturityValue) })
                                    : ppfStatus.yearsCompleted >= 7
                                        ? t('ppf.partialWithdrawalInsight', { amount: formatINR(ppfStatus.withdrawalAmount) })
                                        : ppfStatus.yearsCompleted >= 3
                                            ? t('ppf.loanFacilityInsight', { amount: formatINR(ppfStatus.loanAmount) })
                                            : undefined
                            }
                        />
                    </div>
                )}

                <DisclaimerComponent module="ppf" />
                <CalculatorInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} calculatorTitle={t('ppf.title')} />
            </div>
        </div>
    );
}
