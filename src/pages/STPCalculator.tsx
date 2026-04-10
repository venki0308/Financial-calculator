import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronUp, FileText, ChevronLeft, ChevronRight, BrainCircuit, AlertTriangle, ArrowRightLeft, TrendingUp, Landmark, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, type ExportConfig, dateTag } from '../utils/exportReport';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { useHistoryTracker } from '../hooks/useHistoryTracker';
import { calculateSTP, getSTPInsights, type STPInputs } from '../utils/stpCalculations';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function STPCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // STP Type
    const [stpType, setStpType] = useState<'fixed' | 'capital' | 'flex'>('fixed');

    // Core inputs
    const [initialAmount, setInitialAmount] = useState(1500000);
    const [transferAmount, setTransferAmount] = useState(50000);
    const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');
    const [sourceRate, setSourceRate] = useState(7);
    const [targetRate, setTargetRate] = useState(12);
    const [durationMonths, setDurationMonths] = useState(12);
    const [exitLoadPercent, setExitLoadPercent] = useState(0);
    const [taxSlabPercent, setTaxSlabPercent] = useState(20);

    // Flex-specific
    const [flexBaseAmount, setFlexBaseAmount] = useState(50000);
    const [flexMultiplier, setFlexMultiplier] = useState(1.5);

    // Capital-specific
    const [capitalMinThreshold, setCapitalMinThreshold] = useState(500);

    // UI State
    const [showSchedule, setShowSchedule] = useState(false);
    const [showTax, setShowTax] = useState(false);
    const [page, setPage] = useState(1);

    // Build inputs object
    const inputs: STPInputs = useMemo(() => ({
        initialAmount,
        transferAmount,
        frequency,
        sourceRate,
        targetRate,
        durationMonths,
        stpType,
        exitLoadPercent,
        exitLoadFreeMonths: 12,
        taxSlabPercent,
        flexBaseAmount: stpType === 'flex' ? flexBaseAmount : undefined,
        flexMultiplier: stpType === 'flex' ? flexMultiplier : undefined,
        capitalMinThreshold: stpType === 'capital' ? capitalMinThreshold : undefined,
    }), [initialAmount, transferAmount, frequency, sourceRate, targetRate, durationMonths, stpType, exitLoadPercent, taxSlabPercent, flexBaseAmount, flexMultiplier, capitalMinThreshold]);

    // Calculate
    const result = useMemo(() => calculateSTP(inputs), [inputs]);
    const insights = useMemo(() => getSTPInsights(inputs, result), [inputs, result]);

    // History tracking
    useHistoryTracker(
        'STP Calculator',
        { initialAmount, transferAmount, sourceRate, targetRate, durationMonths, stpType },
        { totalPortfolio: result.totalPortfolioValue },
        result.totalPortfolioValue,
    );

    // Pie chart data
    const sourcePercent = result.totalPortfolioValue > 0
        ? Math.round((result.finalSourceBalance / result.totalPortfolioValue) * 100)
        : 0;
    const targetPercent = 100 - sourcePercent;

    // STP vs Lumpsum advantage
    const stpAdvantage = result.totalPortfolioValue - result.lumpsumDirectComparison;
    const stpBetter = stpAdvantage >= 0;

    // Export handlers
    // PDF uses English labels — jsPDF Helvetica doesn't support Indian scripts
    const handleDownloadPDF = async () => {
        const tag = dateTag();
        const config: ExportConfig = {
            title: 'STP Calculator Report',
            inputs: [
                { label: 'Initial Investment', value: `INR ${initialAmount.toLocaleString('en-IN')}` },
                { label: 'Transfer Amount', value: `INR ${transferAmount.toLocaleString('en-IN')}` },
                { label: 'Source Fund Return', value: `${sourceRate}% p.a.` },
                { label: 'Target Fund Return', value: `${targetRate}% p.a.` },
                { label: 'Duration', value: `${durationMonths} months` },
                { label: 'STP Type', value: stpType.charAt(0).toUpperCase() + stpType.slice(1) },
            ],
            results: [
                { label: 'Total Portfolio Value', value: `INR ${result.totalPortfolioValue.toLocaleString('en-IN')}` },
                { label: 'Target Fund Value', value: `INR ${result.finalTargetValue.toLocaleString('en-IN')}` },
                { label: 'Source Fund Remaining', value: `INR ${Math.round(result.finalSourceBalance).toLocaleString('en-IN')}` },
                { label: 'Lumpsum Comparison', value: `INR ${result.lumpsumDirectComparison.toLocaleString('en-IN')}` },
                { label: 'Avg Purchase Price', value: `INR ${result.averagePurchasePrice}` },
                { label: 'Total Installments', value: `${result.numberOfInstallments}` },
            ],
            chart: {
                type: 'pie' as const,
                segments: [
                    { label: 'Source Residual', value: Math.max(0, result.finalSourceBalance), color: '#3B82F6' },
                    { label: 'Target Accumulated', value: result.finalTargetValue, color: '#10B981' },
                ],
            },
            projectionTitle: 'Monthly Transfer Schedule',
            projectionColumns: ['Month', 'Source Open', 'Transfer', 'Net Transfer', 'Source Close', 'Target Value'],
            projectionRows: result.schedule.map((r) => [
                `M${r.month}`,
                `INR ${Math.round(r.sourceOpening).toLocaleString('en-IN')}`,
                `INR ${Math.round(r.transferAmount).toLocaleString('en-IN')}`,
                `INR ${Math.round(r.netTransfer).toLocaleString('en-IN')}`,
                `INR ${Math.round(r.sourceClosing).toLocaleString('en-IN')}`,
                `INR ${Math.round(r.targetValueAccumulated).toLocaleString('en-IN')}`,
            ]),
            filename: `FinCalix_STP_Report_${tag}`,
        };
        await exportToPDF(config);
    };

    const handleDownloadExcel = async () => {
        const tag = dateTag();
        const config: ExportConfig = {
            title: 'STP Calculator Report',
            inputs: [
                { label: 'Initial Investment', value: `INR ${initialAmount.toLocaleString('en-IN')}` },
                { label: 'Transfer Amount', value: `INR ${transferAmount.toLocaleString('en-IN')}` },
                { label: 'Source Fund Return', value: `${sourceRate}% p.a.` },
                { label: 'Target Fund Return', value: `${targetRate}% p.a.` },
                { label: 'Duration', value: `${durationMonths} months` },
            ],
            results: [
                { label: 'Total Portfolio Value', value: `INR ${result.totalPortfolioValue.toLocaleString('en-IN')}` },
                { label: 'Target Fund Value', value: `INR ${result.finalTargetValue.toLocaleString('en-IN')}` },
                { label: 'Source Fund Remaining', value: `INR ${Math.round(result.finalSourceBalance).toLocaleString('en-IN')}` },
            ],
            projectionTitle: 'Monthly Transfer Schedule',
            projectionColumns: ['Month', 'Source Open', 'Interest', 'Transfer', 'Exit Load', 'Tax', 'Net Transfer', 'Source Close', 'NAV', 'Target Value'],
            projectionRows: result.schedule.map((r) => [
                r.month,
                Math.round(r.sourceOpening),
                Math.round(r.sourceInterest),
                Math.round(r.transferAmount),
                Math.round(r.exitLoadPaid),
                Math.round(r.taxPaid),
                Math.round(r.netTransfer),
                Math.round(r.sourceClosing),
                r.assumedNAV,
                Math.round(r.targetValueAccumulated),
            ]),
            filename: `FinCalix_STP_Report_${tag}`,
        };
        await exportToExcel(config);
    };

    const tabConfig = [
        { key: 'fixed' as const, label: t('stp.fixed', 'Fixed'), icon: Landmark },
        { key: 'capital' as const, label: t('stp.capitalAppreciation', 'Capital'), icon: TrendingUp },
        { key: 'flex' as const, label: t('stp.flex', 'Flex'), icon: Zap },
    ];

    const freqConfig = [
        { key: 'weekly' as const, label: t('stp.weekly', 'Weekly') },
        { key: 'monthly' as const, label: t('stp.monthly', 'Monthly') },
        { key: 'quarterly' as const, label: t('stp.quarterly', 'Quarterly') },
    ];

    return (
        <div className="min-h-dvh bg-background pb-28 animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border hover:bg-muted transition-all">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground leading-tight">{t('stp.title', 'STP Calculator')}</h1>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{t('stp.subtitle', 'Systematic Transfer Plan')}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 space-y-5">
                {/* STP Type Tabs */}
                <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
                    {tabConfig.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setStpType(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold rounded-lg transition-all ${stpType === tab.key
                                ? 'bg-brand-green text-black shadow-lg shadow-brand-green/20'
                                : 'text-muted-foreground hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            <tab.icon size={13} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* STP Type Description */}
                <div className="p-3 rounded-2xl bg-brand-blue/5 border border-brand-blue/20">
                    <p className="text-[11px] text-brand-blue font-medium leading-relaxed">
                        {stpType === 'fixed' && t('stp.fixedDesc', 'Transfers a fixed amount at every interval from source to target fund.')}
                        {stpType === 'capital' && t('stp.capitalDesc', 'Transfers only the capital appreciation (interest earned) from source fund.')}
                        {stpType === 'flex' && t('stp.flexDesc', 'Adjusts transfer amount based on market conditions — transfers more when markets dip.')}
                    </p>
                </div>

                {/* Core Inputs */}
                <div className="space-y-4">
                    <NumberInput
                        label={t('stp.initialInvestment', 'Initial Investment in Source Fund')}
                        value={initialAmount}
                        onChange={setInitialAmount}
                        min={10000}
                        max={100000000}
                        prefix="₹"
                    />

                    {stpType === 'fixed' && (
                        <NumberInput
                            label={t('stp.transferAmount', 'Transfer Amount per Installment')}
                            value={transferAmount}
                            onChange={setTransferAmount}
                            min={500}
                            max={initialAmount}
                            prefix="₹"
                        />
                    )}

                    {stpType === 'flex' && (
                        <>
                            <NumberInput
                                label={t('stp.flexBaseAmount', 'Base Transfer Amount')}
                                value={flexBaseAmount}
                                onChange={setFlexBaseAmount}
                                min={500}
                                max={initialAmount}
                                prefix="₹"
                            />
                            <NumberInput
                                label={t('stp.flexMultiplier', 'Dip Multiplier')}
                                value={flexMultiplier}
                                onChange={setFlexMultiplier}
                                min={1}
                                max={5}
                                suffix="x"
                                step={0.1}
                            />
                        </>
                    )}

                    {stpType === 'capital' && (
                        <NumberInput
                            label={t('stp.capitalMinThreshold', 'Minimum Transfer Threshold')}
                            value={capitalMinThreshold}
                            onChange={setCapitalMinThreshold}
                            min={0}
                            max={100000}
                            prefix="₹"
                            helperText={t('stp.capitalMinHelp', 'Skip transfer if appreciation is below this')}
                        />
                    )}

                    {/* Frequency selector */}
                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-2 block">{t('stp.frequency', 'Transfer Frequency')}</label>
                        <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
                            {freqConfig.map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setFrequency(f.key)}
                                    className={`flex-1 py-2 text-[11px] font-semibold rounded-lg transition-all ${frequency === f.key
                                        ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                                        : 'text-muted-foreground hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <NumberInput
                            label={t('stp.sourceReturn', 'Source Return (p.a.)')}
                            value={sourceRate}
                            onChange={setSourceRate}
                            min={1}
                            max={30}
                            suffix="%"
                            step={0.5}
                        />
                        <NumberInput
                            label={t('stp.targetReturn', 'Target Return (p.a.)')}
                            value={targetRate}
                            onChange={setTargetRate}
                            min={1}
                            max={30}
                            suffix="%"
                            step={0.5}
                        />
                    </div>

                    <NumberInput
                        label={t('stp.duration', 'Duration (Months)')}
                        value={durationMonths}
                        onChange={setDurationMonths}
                        min={1}
                        max={120}
                        suffix={` ${t('stp.months', 'months')}`}
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <NumberInput
                            label={t('stp.exitLoad', 'Exit Load')}
                            value={exitLoadPercent}
                            onChange={setExitLoadPercent}
                            min={0}
                            max={5}
                            suffix="%"
                            step={0.1}
                        />
                        <NumberInput
                            label={t('stp.taxSlab', 'Tax Slab')}
                            value={taxSlabPercent}
                            onChange={setTaxSlabPercent}
                            min={0}
                            max={42.7}
                            suffix="%"
                            step={1}
                        />
                    </div>
                </div>

                {/* Results Hero Card */}
                <motion.div layout className="p-6 rounded-3xl bg-card border border-border shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-bold">{t('stp.totalPortfolio', 'Total Portfolio Value')}</p>
                        {result.isSourceExhausted ? (
                            <div className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-amber-500/10 border-amber-500/20 text-amber-500">
                                {t('stp.sourceExhausted', 'Source Exhausted')}
                            </div>
                        ) : (
                            <div className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-brand-green/10 border-brand-green/20 text-brand-green">
                                {t('stp.active', 'Active')}
                            </div>
                        )}
                    </div>

                    <p className="text-5xl font-black tracking-tighter mb-5 text-brand-blue">
                        {fmtINR(result.totalPortfolioValue)}
                    </p>

                    {/* Source exhaustion warning */}
                    {result.isSourceExhausted && (
                        <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[11px] font-black text-amber-600 dark:text-amber-400">
                                    {t('stp.exhaustedHeadline', 'Source fund exhausted in month {{month}}', { month: result.exhaustionMonth })}
                                </p>
                                <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 leading-snug mt-0.5">
                                    {t('stp.exhaustedHelp', 'Reduce transfer amount or shorten the STP duration to preserve source fund.')}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="p-3.5 rounded-2xl bg-brand-green/10 border border-brand-green/20">
                            <p className="text-brand-green/80 text-[10px] uppercase font-bold mb-0.5">{t('stp.targetValue', 'Target Fund Value')}</p>
                            <p className="text-brand-green font-black text-sm">{fmtINR(result.finalTargetValue)}</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-brand-blue/10 border border-brand-blue/20">
                            <p className="text-brand-blue/80 text-[10px] uppercase font-bold mb-0.5">{t('stp.sourceRemaining', 'Source Remaining')}</p>
                            <p className="text-brand-blue font-black text-sm">{fmtINR(result.finalSourceBalance)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="p-2.5 rounded-xl bg-background border border-border/50 text-center">
                            <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('stp.totalTransferred', 'Transferred')}</p>
                            <p className="text-foreground font-black text-[11px]">{fmtINR(result.totalTransferred)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-background border border-border/50 text-center">
                            <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('stp.totalUnitsLabel', 'Units')}</p>
                            <p className="text-foreground font-black text-[11px]">{result.totalUnits}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-background border border-border/50 text-center">
                            <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('stp.avgNAV', 'Avg NAV')}</p>
                            <p className="text-foreground font-black text-[11px]">₹{result.averagePurchasePrice}</p>
                        </div>
                    </div>
                </motion.div>

                {/* STP vs Lumpsum Comparison */}
                <motion.div layout className="p-5 rounded-3xl bg-card border border-border shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-500"><ArrowRightLeft size={16} /></div>
                        <p className="text-foreground font-bold text-sm">{t('stp.vsLumpsum', 'STP vs Lumpsum')}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className={`p-3.5 rounded-2xl border text-center ${stpBetter ? 'bg-brand-green/10 border-brand-green/20' : 'bg-background border-border/50'}`}>
                            <p className={`text-[10px] uppercase font-bold mb-1 ${stpBetter ? 'text-brand-green/80' : 'text-muted-foreground'}`}>{t('stp.stpValue', 'STP Portfolio')}</p>
                            <p className={`font-black text-base ${stpBetter ? 'text-brand-green' : 'text-foreground'}`}>{fmtINR(result.totalPortfolioValue)}</p>
                        </div>
                        <div className={`p-3.5 rounded-2xl border text-center ${!stpBetter ? 'bg-brand-green/10 border-brand-green/20' : 'bg-background border-border/50'}`}>
                            <p className={`text-[10px] uppercase font-bold mb-1 ${!stpBetter ? 'text-brand-green/80' : 'text-muted-foreground'}`}>{t('stp.lumpsumValue', 'Lumpsum Direct')}</p>
                            <p className={`font-black text-base ${!stpBetter ? 'text-brand-green' : 'text-foreground'}`}>{fmtINR(result.lumpsumDirectComparison)}</p>
                        </div>
                    </div>

                    <div className={`p-3 rounded-xl border text-center ${stpBetter ? 'bg-brand-green/5 border-brand-green/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                        <p className={`text-xs font-bold ${stpBetter ? 'text-brand-green' : 'text-amber-500'}`}>
                            {stpBetter
                                ? t('stp.stpWins', 'STP outperforms by {{amount}}', { amount: fmtINR(Math.abs(stpAdvantage)) })
                                : t('stp.lumpsumWins', 'Lumpsum leads by {{amount}} — but STP reduces risk', { amount: fmtINR(Math.abs(stpAdvantage)) })
                            }
                        </p>
                    </div>
                </motion.div>

                {/* Pie Chart — Source vs Target */}
                <motion.div layout className="p-5 rounded-3xl bg-card border border-border shadow-sm">
                    <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-bold mb-4">{t('stp.portfolioBreakdown', 'Portfolio Breakdown')}</p>

                    <div className="flex items-center gap-6">
                        {/* SVG Pie */}
                        <div className="relative" style={{ width: 120, height: 120 }}>
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3B82F6" strokeWidth="3.8"
                                    strokeDasharray={`${sourcePercent} ${100 - sourcePercent}`} strokeDashoffset="0" />
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10B981" strokeWidth="3.8"
                                    strokeDasharray={`${targetPercent} ${100 - targetPercent}`} strokeDashoffset={`${-sourcePercent}`} />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <p className="text-foreground font-black text-sm">{result.numberOfInstallments}</p>
                                    <p className="text-muted-foreground text-[8px] uppercase font-bold">{t('stp.installments', 'Installments')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold">{t('stp.sourceResidual', 'Source Residual')}</p>
                                    <p className="text-foreground font-black text-xs">{fmtINR(result.finalSourceBalance)} ({sourcePercent}%)</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold">{t('stp.targetAccumulated', 'Target Accumulated')}</p>
                                    <p className="text-foreground font-black text-xs">{fmtINR(result.finalTargetValue)} ({targetPercent}%)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Smart Insights */}
                {insights.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                            <BrainCircuit size={14} className="text-brand-blue" />
                            {t('stp.smartInsights', 'Smart Insights')}
                        </p>
                        {insights.map((ins, idx) => (
                            <div
                                key={idx}
                                className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
                                    ins.tone === 'warning' ? 'bg-amber-500/10 border-amber-500/30'
                                    : ins.tone === 'success' ? 'bg-brand-green/10 border-brand-green/30'
                                    : 'bg-brand-blue/10 border-brand-blue/30'
                                }`}
                            >
                                {ins.tone === 'warning' && <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />}
                                {ins.tone === 'success' && <TrendingUp size={14} className="text-brand-green flex-shrink-0 mt-0.5" />}
                                {ins.tone === 'info' && <BrainCircuit size={14} className="text-brand-blue flex-shrink-0 mt-0.5" />}
                                <p className={`text-xs font-medium leading-relaxed ${
                                    ins.tone === 'warning' ? 'text-amber-700 dark:text-amber-400'
                                    : ins.tone === 'success' ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-blue-700 dark:text-blue-300'
                                }`}>
                                    {t(ins.key, ins.text)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tax Impact Card */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowTax(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-500"><Landmark size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('stp.taxImpact', 'Tax & Charges Impact')}</span>
                        </div>
                        {showTax ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showTax && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-3">
                                    <div className="h-px bg-border w-full -mt-2" />

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                                            <p className="text-rose-500/80 text-[10px] uppercase font-bold mb-0.5">{t('stp.totalTaxPaid', 'Tax Paid')}</p>
                                            <p className="text-rose-500 font-black text-lg">{fmtINR(result.totalTaxPaid)}</p>
                                            <p className="text-rose-500/60 text-[9px] font-bold">{t('stp.atSlab', '@ {{pct}}% slab', { pct: taxSlabPercent })}</p>
                                        </div>
                                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                                            <p className="text-amber-500/80 text-[10px] uppercase font-bold mb-0.5">{t('stp.totalExitLoad', 'Exit Load')}</p>
                                            <p className="text-amber-500 font-black text-lg">{fmtINR(result.totalExitLoadPaid)}</p>
                                            <p className="text-amber-500/60 text-[9px] font-bold">{exitLoadPercent > 0 ? t('stp.withinFreePeriod', '@ {{pct}}%', { pct: exitLoadPercent }) : t('stp.noExitLoad', 'None')}</p>
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-background border border-border/50">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold">{t('stp.sourceInterestEarned', 'Source Interest Earned')}</p>
                                            <p className="text-brand-green font-black text-sm">+{fmtINR(result.totalSourceInterestEarned)}</p>
                                        </div>
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold">{t('stp.netEffectiveReturn', 'Net Effective Source Return')}</p>
                                            <p className="text-foreground font-black text-sm">{result.netEffectiveSourceReturn}%</p>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold">{t('stp.finalNAV', 'Final Target NAV')}</p>
                                            <p className="text-foreground font-black text-sm">₹{result.finalNAV}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Month-by-Month Schedule */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <button onClick={() => { setShowSchedule(p => !p); setPage(1); }} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-500"><FileText size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('stp.transferSchedule', 'Transfer Schedule')}</span>
                        </div>
                        {showSchedule ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showSchedule && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 pt-1">
                                    <div className="rounded-2xl overflow-hidden border border-border mt-2">
                                        {/* Table header */}
                                        <div className="grid grid-cols-6 bg-muted px-2 py-2.5">
                                            {[
                                                t('stp.colMonth', 'Mo'),
                                                t('stp.colSrcOpen', 'Source'),
                                                t('stp.colTransferShort', 'Xfer'),
                                                t('stp.colNetShort', 'Net'),
                                                t('stp.colSrcCloseShort', 'Src Bal'),
                                                t('stp.colTgtValShort', 'Target'),
                                            ].map(h => (
                                                <p key={h} className="text-muted-foreground text-[8px] font-black uppercase tracking-wider text-center">{h}</p>
                                            ))}
                                        </div>

                                        {/* Table rows */}
                                        <div className="divide-y divide-border/50">
                                            {result.schedule.slice((page - 1) * 12, page * 12).map((row) => (
                                                <div key={row.month} className={`grid grid-cols-6 px-2 py-2.5 items-center text-center ${row.sourceClosing <= 0 ? 'bg-red-500/5' : 'bg-background'}`}>
                                                    <p className={`text-[10px] font-bold ${row.sourceClosing <= 0 ? 'text-amber-500' : 'text-foreground'}`}>M{row.month}</p>
                                                    <p className="text-foreground text-[9px] font-bold font-mono">{fmtINR(row.sourceOpening)}</p>
                                                    <p className="text-rose-400 text-[9px] font-bold font-mono">-{fmtINR(row.transferAmount)}</p>
                                                    <p className="text-brand-green text-[9px] font-bold font-mono">{fmtINR(row.netTransfer)}</p>
                                                    <p className={`text-[9px] font-bold font-mono ${row.sourceClosing <= 0 ? 'text-amber-500' : 'text-foreground'}`}>{fmtINR(Math.max(0, row.sourceClosing))}</p>
                                                    <p className="text-brand-blue text-[9px] font-bold font-mono">{fmtINR(row.targetValueAccumulated)}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pagination */}
                                        {result.schedule.length > 12 && (
                                            <div className="bg-muted px-3 py-2.5 flex justify-between items-center border-t border-border">
                                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                    {t('stp.pageOf', 'Page {{current}} of {{total}}', { current: page, total: Math.ceil(result.schedule.length / 12) })}
                                                </p>
                                                <button disabled={page === Math.ceil(result.schedule.length / 12)} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-[10px] text-muted-foreground text-center mt-3 font-medium px-2">
                                        {t('stp.scheduleFootnote', 'NAV and returns are assumed. Actual values depend on market conditions.')}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Export Buttons */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-brand-blue/5 border border-brand-blue/20 text-brand-blue font-bold text-xs transition-colors hover:bg-brand-blue/10 active:scale-95"
                    >
                        <FileText size={20} /> {t('stp.exportReport', 'Download PDF')}
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-brand-green/5 border border-brand-green/20 text-brand-green font-bold text-xs transition-colors hover:bg-brand-green/10 active:scale-95"
                    >
                        <FileText size={20} /> {t('stp.excelData', 'Download Excel')}
                    </button>
                </div>
            </div>

            <DisclaimerComponent module="stp" />
        </div>
    );
}
