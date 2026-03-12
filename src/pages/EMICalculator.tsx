import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import {
    ArrowLeft, Info, Share2, ChevronDown, ChevronUp, Save, Check, Download,
    Calculator, TrendingDown, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';
import { nativeShare } from '../utils/nativeShare';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend,
    CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import FinancialQuote from '../components/FinancialQuote';
import {
    calculateReducingEMI, calculateFlatEMI, calculateEffectiveRate,
    calculateForeclosure, calculatePrepaymentSavings,
    formatINR, formatINRShort, formatINRWords,
    LOAN_TYPE_CONFIGS, type AmortizationRow, type ForeclosureResult, type PrepaymentInsight,
} from '../utils/calculations';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import { AnalyticsService } from '../lib/analytics';
import ShareableCard from '../components/ShareableCard';
import { triggerCalcNotification } from '../services/calcNotifications';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

const loanTypes = Object.keys(LOAN_TYPE_CONFIGS);
const ROWS_PER_PAGE = 12;

export default function EMICalculator() {
    useEffect(() => { AnalyticsService.trackScreen('EMI_Calculator'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();

    // ─── State ──────────────────────────────────────────────────────────
    const location = useLocation();
    const [loanType, setLoanType] = useState(() => {
        if (location.pathname.includes('car-loan')) return 'Car Loan';
        if (location.pathname.includes('personal-loan')) return 'Personal Loan';
        if (location.pathname.includes('education-loan')) return 'Education Loan';
        return 'Home Loan';
    });
    const [method, setMethod] = useState<'reducing' | 'flat'>('reducing');
    const [principal, setPrincipal] = useState(3000000);
    const [rate, setRate] = useState(8.5);
    const [tenure, setTenure] = useState(20);
    const [tenureUnit, setTenureUnit] = useState<'months' | 'years'>('years');
    const [showAmortization, setShowAmortization] = useState(false);
    const [amortPage, setAmortPage] = useState(0);
    const [isSaved, setIsSaved] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [monthlyIncome, setMonthlyIncome] = useState(0);

    // Foreclosure state
    const [showForeclosure, setShowForeclosure] = useState(false);
    const [foreclosureMonths, setForeclosureMonths] = useState(24);
    const [foreclosureChargePercent, setForeclosureChargePercent] = useState(2);

    // Reminder state
    const [enableReminder, setEnableReminder] = useState(false);
    const [reminderDate, setReminderDate] = useState(5);

    const { addHistory, addSaved, updateSaved, savedCalculations } = useCalculatorStore();
    const chartRef = useRef<any>(null);

    const config = LOAN_TYPE_CONFIGS[loanType];
    const months = tenureUnit === 'years' ? tenure * 12 : tenure;
    const tenureYears = tenureUnit === 'years' ? tenure : Math.round(tenure / 12);

    // Auto-update defaults when loan type changes
    useEffect(() => {
        const c = LOAN_TYPE_CONFIGS[loanType];
        setRate(c.defaultRate);
        if (tenureUnit === 'years') {
            setTenure(Math.min(tenure, c.maxTenureYears));
        } else {
            setTenure(Math.min(tenure, c.maxTenureYears * 12));
        }
    }, [loanType]);

    // ─── Calculations ───────────────────────────────────────────────────
    const result = useMemo(() => {
        if (method === 'reducing') return calculateReducingEMI(principal, rate, months);
        const r = calculateFlatEMI(principal, rate, months);
        return { ...r, schedule: [] as AmortizationRow[] };
    }, [principal, rate, months, method]);

    const effectiveRate = useMemo(() => method === 'flat' ? calculateEffectiveRate(rate) : null, [method, rate]);

    const foreclosureResult = useMemo((): ForeclosureResult | null => {
        if (!showForeclosure || method !== 'reducing' || !result.schedule.length) return null;
        return calculateForeclosure(result.schedule, foreclosureMonths, foreclosureChargePercent);
    }, [showForeclosure, foreclosureMonths, foreclosureChargePercent, result.schedule, method]);

    const prepayInsight = useMemo((): PrepaymentInsight | null => {
        if (method !== 'reducing' || !result.emi) return null;
        return calculatePrepaymentSavings(principal, rate, months, result.emi);
    }, [principal, rate, months, result.emi, method]);

    // ─── Notification trigger ────────────────────────────────────────────
    useEffect(() => {
        if (!result.emi) return;
        const t = setTimeout(() => {
            triggerCalcNotification('emi', `EMI ₹${Math.round(result.emi).toLocaleString('en-IN')}/mo`);
        }, 2000);
        return () => clearTimeout(t);
    }, [result.emi]);

    // ─── Amortization pagination ────────────────────────────────────────
    const totalPages = Math.ceil((result.schedule?.length || 0) / ROWS_PER_PAGE);
    const pagedSchedule = useMemo(() => {
        if (!result.schedule) return [];
        const start = amortPage * ROWS_PER_PAGE;
        return result.schedule.slice(start, start + ROWS_PER_PAGE);
    }, [result.schedule, amortPage]);

    // ─── Chart Data ─────────────────────────────────────────────────────
    const chartData = {
        labels: ['Principal', 'Interest'],
        datasets: [{
            data: [principal, result.totalInterest],
            backgroundColor: ['#10B981', '#F59E0B'],
            borderColor: ['#10B98140', '#F59E0B40'],
            borderWidth: 1,
        }]
    };

    // ─── Smart Insights ─────────────────────────────────────────────────
    const insights = useMemo(() => {
        const items: { type: 'warning' | 'caution' | 'positive' | 'tip'; text: string }[] = [];

        if (monthlyIncome > 0) {
            const emiRatio = (result.emi / monthlyIncome) * 100;
            if (emiRatio > 40) {
                items.push({ type: 'warning', text: `Your EMI exceeds ${emiRatio.toFixed(0)}% of income. Most banks recommend keeping EMI below 40% of take-home salary.` });
            } else if (emiRatio >= 30) {
                items.push({ type: 'caution', text: `Your EMI is ${emiRatio.toFixed(0)}% of income — manageable but at the higher end. Maintain 6 months EMI (${formatINR(result.emi * 6)}) as emergency fund.` });
            } else {
                items.push({ type: 'positive', text: `Healthy EMI ratio at ${emiRatio.toFixed(0)}%. You have good repayment capacity.` });
            }
        }

        if (result.totalInterest > principal) {
            items.push({ type: 'warning', text: `You will pay more in interest (${formatINR(result.totalInterest)}) than the loan itself. Consider shorter tenure or prepayments.` });
        }

        if (prepayInsight && prepayInsight.interestSaved > 10000) {
            items.push({ type: 'tip', text: `Paying just ${formatINR(prepayInsight.extraMonthlyAmount)} extra/month saves ${formatINR(prepayInsight.interestSaved)} and closes loan ${prepayInsight.monthsSaved} months earlier.` });
        }

        return items;
    }, [result.emi, result.totalInterest, monthlyIncome, principal, prepayInsight]);

    // ─── History Tracking ───────────────────────────────────────────────
    useEffect(() => {
        const timer = setTimeout(() => {
            addHistory({
                id: `EMI-${Date.now()}`,
                calculatorType: 'Loan EMI Calculator',
                inputValues: { principal, rate, months, method, loanType },
                resultValues: { primary: result.emi, ...result },
                timestamp: Date.now()
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [principal, rate, months, method, loanType, result.emi, addHistory]);

    // ─── Reset Save State on Input Change ───────────────────────────────
    useEffect(() => {
        setIsSaved(false);
        setSavedId(null); // Also clear savedId when inputs change to allow saving as new
    }, [principal, rate, tenure, tenureUnit, method, loanType, showForeclosure, foreclosureMonths, foreclosureChargePercent, enableReminder, reminderDate]);

    const handleSave = () => {
        const name = `${loanType} - ${formatINRShort(principal)} - ${tenureYears}yr`;
        const updatedResult = { primary: result.emi, emi: result.emi, totalInterest: result.totalInterest, totalPayment: result.totalPayment };
        const inputVars = { principal, rate, months, method, loanType, name, enableReminder, reminderDate };
        
        if (savedId) {
            updateSaved(savedId, inputVars, updatedResult);
        } else {
            const newId = `EMI-Save-${Date.now()}`;
            addSaved({
                id: newId,
                calculatorType: 'Loan EMI Calculator',
                inputValues: inputVars,
                resultValues: updatedResult,
                timestamp: Date.now()
            });
            setSavedId(newId);
        }
        setIsSaved(true);
    };

    const isAlreadySaved = useMemo(() => {
        return savedCalculations.some(s =>
            s.calculatorType === 'Loan EMI Calculator' &&
            s.inputValues.principal === principal &&
            s.inputValues.rate === rate &&
            s.inputValues.months === months &&
            s.inputValues.method === method &&
            s.inputValues.loanType === loanType &&
            s.inputValues.enableReminder === enableReminder &&
            s.inputValues.reminderDate === reminderDate
        );
    }, [savedCalculations, principal, rate, months, method, loanType, enableReminder, reminderDate]);

    // ─── PDF Export ─────────────────────────────────────────────────────
    const handleDownloadPDF = async () => {
        let chartImage: string | undefined;
        if (chartRef.current) chartImage = chartRef.current.toBase64Image();

        const headers = ['Month', 'Opening Bal', 'EMI', 'Principal', 'Interest', 'Closing Bal', 'Cum.P', 'Cum.I'];
        const data = (result.schedule || []).map(row => [
            row.month.toString(), formatINR(row.openingBalance), formatINR(row.emi),
            formatINR(row.principal), formatINR(row.interest), formatINR(row.closingBalance),
            formatINR(row.cumulativePrincipal), formatINR(row.cumulativeInterest),
        ]);
        const chartSummary: any[] = [
            { label: 'Loan Type', value: loanType, color: [79, 70, 229] },
            { label: 'Principal', value: formatINR(principal), color: [16, 185, 129] },
            { label: 'Interest Rate', value: `${rate}% p.a.`, color: [59, 130, 246] },
            { label: 'Tenure', value: `${tenureYears} years (${months} months)`, color: [139, 92, 246] },
            { label: 'Monthly EMI', value: formatINR(result.emi), color: [245, 158, 11] },
            { label: 'Total Interest', value: formatINR(result.totalInterest), color: [239, 68, 68] },
            { label: 'Total Payment', value: formatINR(result.totalPayment), color: [16, 185, 129] },
        ];

        if (showForeclosure && foreclosureResult) {
            chartSummary.push(
                { label: '--- Foreclosure Details ---', value: '', color: [100, 116, 139] },
                { label: 'Months Paid', value: `${foreclosureMonths} months`, color: [100, 116, 139] },
                { label: 'Outstanding Principal', value: formatINR(foreclosureResult.outstandingPrincipal), color: [15, 23, 42] },
                { label: 'Foreclosure Charge', value: formatINR(foreclosureResult.foreclosureCharge), color: [220, 38, 38] },
                { label: 'Interest Saved', value: formatINR(foreclosureResult.interestSaved), color: [16, 185, 129] },
                { label: 'Total Settlement', value: formatINR(foreclosureResult.totalSettlement), color: [79, 70, 229] },
                { label: 'Net Benefit', value: formatINR(foreclosureResult.netBenefit), color: foreclosureResult.netBenefit >= 0 ? [16, 185, 129] : [220, 38, 38] }
            );
        }

        await exportToPDF(`${loanType} - Loan Report`, headers, data,
            `FinCalix_${loanType.replace(/\s/g, '')}_${new Date().toISOString().slice(0, 10)}`, chartImage, chartSummary);
    };

    const handleDownloadExcel = async () => {
        const headers = ['Month', 'Opening Balance', 'EMI', 'Principal', 'Interest', 'Closing Balance', 'Cum. Principal', 'Cum. Interest'];
        const data = (result.schedule || []).map(row => [
            row.month, Math.round(row.openingBalance), Math.round(row.emi),
            Math.round(row.principal), Math.round(row.interest), Math.round(row.closingBalance),
            Math.round(row.cumulativePrincipal), Math.round(row.cumulativeInterest),
        ]);
        await exportToExcel(headers, data, `FinCalix_${loanType.replace(/\s/g, '')}_${new Date().toISOString().slice(0, 10)}`);
    };

    // ─── Insight styles ─────────────────────────────────────────────────
    const insightStyle = (type: string) => {
        switch (type) {
            case 'warning': return { bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/30', text: 'text-red-700 dark:text-red-400', icon: '⚠️' };
            case 'caution': return { bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30', text: 'text-amber-700 dark:text-amber-400', icon: '⚡' };
            case 'positive': return { bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-400', icon: '✅' };
            case 'tip': return { bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/30', text: 'text-blue-700 dark:text-blue-400', icon: '💡' };
            default: return { bg: 'bg-slate-50 dark:bg-slate-500/10', border: 'border-slate-200 dark:border-slate-500/30', text: 'text-slate-700 dark:text-muted-foreground', icon: 'ℹ️' };
        }
    };

    return (
        <div className="min-h-dvh bg-white dark:bg-background animate-fade-in">
            {/* ── Header ───────────────────────────────────────────── */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                            <ArrowLeft size={18} className="text-slate-600 dark:text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-foreground">Loan Analytics</h1>
                            <p className="text-muted-foreground dark:text-muted-foreground text-xs">Banking-grade EMI calculator</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                            <Info size={16} className="text-slate-600 dark:text-muted-foreground" />
                        </button>
                        <button className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border"
                            onClick={() => nativeShare('EMI Calculator', 'Calculate your EMI with FinCalix!', window.location.href)}>
                            <Share2 size={16} className="text-slate-600 dark:text-muted-foreground" />
                        </button>
                    </div>
                </div>
            </div>

            <FinancialQuote />
            <DisclaimerComponent module="emi" />

            <div className="px-4 pb-28">
                {/* ── Loan Type Pills ─────────────────────────────── */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar py-3">
                    {loanTypes.map((t) => (
                        <button key={t} onClick={() => setLoanType(t)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${loanType === t
                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20'
                                : 'bg-slate-100 dark:bg-card border border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground hover:border-slate-400 dark:hover:border-slate-600'
                            }`}>
                            <span>{LOAN_TYPE_CONFIGS[t].icon}</span>
                            {t}
                        </button>
                    ))}
                </div>

                {/* ── Interest Method Toggle ──────────────────────── */}
                <div className="flex rounded-2xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border p-1 mb-4">
                    {(['reducing', 'flat'] as const).map((m) => (
                        <button key={m} onClick={() => setMethod(m)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${method === m
                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                                : 'text-muted-foreground dark:text-muted-foreground'
                            }`}>
                            {m === 'reducing' ? '📉 Reducing Balance' : '📊 Flat Rate'}
                        </button>
                    ))}
                </div>

                {/* Flat Rate comparison banner */}
                {effectiveRate && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                            <span className="font-bold">Effective Rate:</span> This {rate}% flat rate = ~{effectiveRate}% reducing balance rate.
                            Banks use reducing balance for home/car loans.
                        </p>
                    </motion.div>
                )}

                {/* ── Input Fields ────────────────────────────────── */}
                <div className="space-y-3 mb-5">
                    <NumberInput label="Loan Amount" value={principal} onChange={setPrincipal}
                        min={config.minAmount} max={config.maxAmount} prefix="₹"
                        helperText={`${formatINR(config.minAmount)} - ${formatINR(config.maxAmount)}`} />

                    <NumberInput label="Interest Rate (p.a.)" value={rate} onChange={setRate}
                        min={1} max={30} suffix="%" step={0.05} helperText="1% - 30%" />

                    <div>
                        <div className="flex rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border p-1 mb-2">
                            {(['months', 'years'] as const).map((u) => (
                                <button key={u} onClick={() => {
                                    if (u === 'years' && tenureUnit === 'months') setTenure(Math.round(tenure / 12) || 1);
                                    if (u === 'months' && tenureUnit === 'years') setTenure(tenure * 12);
                                    setTenureUnit(u);
                                }}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize ${tenureUnit === u
                                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                                        : 'text-muted-foreground dark:text-muted-foreground'
                                    }`}>
                                    {u}
                                </button>
                            ))}
                        </div>
                        <NumberInput label="Loan Tenure" value={tenure} onChange={setTenure}
                            min={1} max={tenureUnit === 'months' ? config.maxTenureYears * 12 : config.maxTenureYears}
                            suffix={tenureUnit === 'months' ? ' months' : ' years'}
                            helperText={tenureUnit === 'months' ? `1 - ${config.maxTenureYears * 12} months` : `1 - ${config.maxTenureYears} years`} />
                    </div>
                </div>

                {/* ── Result Card ─────────────────────────────────── */}
                <motion.div layout className="p-5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-lg dark:shadow-none mb-4">
                    <div className="text-center mb-5">
                        <p className="text-muted-foreground text-sm mb-1">Monthly EMI</p>
                        <motion.p key={result.emi} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 dark:from-emerald-400 dark:to-green-300 bg-clip-text text-transparent">
                            {formatINR(result.emi)}
                        </motion.p>
                        {result.emi > 100000 && (
                            <p className="text-muted-foreground dark:text-muted-foreground text-[10px] mt-1">({formatINRWords(result.emi)})</p>
                        )}
                    </div>

                    {/* Chart */}
                    <div className="h-44 mb-6 flex justify-center">
                        <Pie ref={chartRef} data={chartData} options={{
                            responsive: true, maintainAspectRatio: false,
                            plugins: { legend: { display: false }, tooltip: { enabled: true } }
                        }} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="text-center p-3 rounded-xl bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-transparent">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <span className="text-slate-600 dark:text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Principal</span>
                            </div>
                            <p className="text-slate-900 dark:text-foreground font-bold text-sm">{formatINR(principal)}</p>
                            {principal >= 100000 && <p className="text-muted-foreground dark:text-muted-foreground text-[9px] mt-0.5">({formatINRWords(principal)})</p>}
                        </div>
                        <div className="text-center p-3 rounded-xl bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-transparent">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                <span className="text-slate-600 dark:text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Interest</span>
                            </div>
                            <p className="text-slate-900 dark:text-foreground font-bold text-sm">{formatINR(result.totalInterest)}</p>
                            {result.totalInterest >= 100000 && <p className="text-muted-foreground dark:text-muted-foreground text-[9px] mt-0.5">({formatINRWords(result.totalInterest)})</p>}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-border/40 text-center">
                        <p className="text-muted-foreground text-xs mb-1">Total Payment</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-foreground">{formatINR(result.totalPayment)}</p>
                        {result.totalPayment >= 100000 && <p className="text-muted-foreground dark:text-muted-foreground text-[9px] mt-0.5">({formatINRWords(result.totalPayment)})</p>}
                    </div>
                </motion.div>

                {/* ── Smart EMI Insights ──────────────────────────── */}
                <div className="mb-4">
                    <div className="flex items-center gap-1.5 px-1 mb-2">
                        <span className="text-amber-400 text-sm">💡</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Smart EMI Insights</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-card border border-slate-200 dark:border-border mb-3">
                        <NumberInput label="Your Monthly Income (optional)" value={monthlyIncome} onChange={setMonthlyIncome}
                            min={0} max={10000000} prefix="₹" helperText="Enter to see EMI-to-income analysis" />
                    </div>

                    {insights.map((ins, i) => {
                        const style = insightStyle(ins.type);
                        return (
                            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={`flex items-start gap-3 p-3.5 rounded-xl border mb-2 ${style.bg} ${style.border}`}>
                                <span className="text-sm mt-0.5 flex-shrink-0">{style.icon}</span>
                                <p className={`text-xs font-medium leading-relaxed ${style.text}`}>{ins.text}</p>
                            </motion.div>
                        );
                    })}
                </div>

                {/* ── Amortization Table ──────────────────────────── */}
                {method === 'reducing' && result.schedule && result.schedule.length > 0 && (
                    <div className="mb-4">
                        <button onClick={() => { setShowAmortization(!showAmortization); setAmortPage(0); }}
                            className="w-full py-3.5 rounded-2xl border border-slate-200 dark:border-border text-slate-700 dark:text-slate-300 font-bold text-sm bg-white dark:bg-card/50 flex items-center justify-center gap-2 mb-3 shadow-sm dark:shadow-none">
                            <Calculator size={16} />
                            {showAmortization ? 'Hide' : 'View'} Amortization Schedule
                            {showAmortization ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        <AnimatePresence>
                            {showAmortization && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                    <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-3 overflow-x-auto shadow-sm dark:shadow-none">
                                        <table className="w-full text-[10px] min-w-[650px]">
                                            <thead>
                                                <tr className="text-muted-foreground border-b border-slate-200 dark:border-border">
                                                    <th className="py-2 text-left font-semibold">Mo.</th>
                                                    <th className="py-2 text-right font-semibold">Opening</th>
                                                    <th className="py-2 text-right font-semibold">EMI</th>
                                                    <th className="py-2 text-right font-semibold">Principal</th>
                                                    <th className="py-2 text-right font-semibold">Interest</th>
                                                    <th className="py-2 text-right font-semibold">Closing</th>
                                                    <th className="py-2 text-right font-semibold">Cum.P</th>
                                                    <th className="py-2 text-right font-semibold">Cum.I</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pagedSchedule.map((row) => {
                                                    const isYearEnd = row.month % 12 === 0;
                                                    return (
                                                        <tr key={row.month} className={`border-b border-slate-100 dark:border-border/30 ${isYearEnd ? 'bg-violet-50 dark:bg-violet-500/5' : ''}`}>
                                                            <td className={`py-1.5 text-slate-700 dark:text-slate-300 ${isYearEnd ? 'font-bold text-violet-700 dark:text-violet-300' : ''}`}>
                                                                {row.month}
                                                                {isYearEnd && <span className="text-[8px] text-violet-500 dark:text-violet-400 ml-1">Y{row.month / 12}</span>}
                                                            </td>
                                                            <td className="py-1.5 text-right text-muted-foreground dark:text-muted-foreground">{formatINR(row.openingBalance)}</td>
                                                            <td className="py-1.5 text-right text-slate-800 dark:text-foreground font-medium">{formatINR(row.emi)}</td>
                                                            <td className="py-1.5 text-right text-emerald-600 dark:text-emerald-400">{formatINR(row.principal)}</td>
                                                            <td className="py-1.5 text-right text-amber-600 dark:text-amber-400">{formatINR(row.interest)}</td>
                                                            <td className="py-1.5 text-right text-slate-800 dark:text-foreground">{formatINR(row.closingBalance)}</td>
                                                            <td className="py-1.5 text-right text-muted-foreground dark:text-muted-foreground">{formatINR(row.cumulativePrincipal)}</td>
                                                            <td className="py-1.5 text-right text-muted-foreground dark:text-muted-foreground">{formatINR(row.cumulativeInterest)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>

                                        {totalPages > 1 && (
                                            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-border mt-2">
                                                <button onClick={() => setAmortPage(Math.max(0, amortPage - 1))}
                                                    disabled={amortPage === 0}
                                                    className="p-2 rounded-lg bg-slate-100 dark:bg-card border-border text-muted-foreground dark:text-muted-foreground disabled:opacity-30">
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <span className="text-muted-foreground text-[10px] font-medium">
                                                    Page {amortPage + 1} of {totalPages} ({result.schedule.length} months)
                                                </span>
                                                <button onClick={() => setAmortPage(Math.min(totalPages - 1, amortPage + 1))}
                                                    disabled={amortPage === totalPages - 1}
                                                    className="p-2 rounded-lg bg-slate-100 dark:bg-card border-border text-muted-foreground dark:text-muted-foreground disabled:opacity-30">
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* ── Foreclosure Simulator ───────────────────────── */}
                {method === 'reducing' && result.schedule && result.schedule.length > 0 && (
                    <div className="mb-4">
                        <button onClick={() => setShowForeclosure(!showForeclosure)}
                            className="w-full py-3.5 rounded-2xl border border-slate-200 dark:border-border text-slate-700 dark:text-slate-300 font-bold text-sm bg-white dark:bg-card/50 flex items-center justify-center gap-2 mb-3 shadow-sm dark:shadow-none">
                            <TrendingDown size={16} />
                            {showForeclosure ? 'Hide' : 'Foreclosure Calculator'}
                            {showForeclosure ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        <AnimatePresence>
                            {showForeclosure && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                    <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-4 space-y-3 shadow-sm dark:shadow-none">
                                        <h3 className="text-slate-800 dark:text-foreground font-bold text-sm flex items-center gap-2">
                                            <TrendingDown size={16} className="text-violet-600 dark:text-violet-400" />
                                            Foreclosure Simulation
                                        </h3>

                                        <div className="grid grid-cols-2 gap-3">
                                            <NumberInput label="Months Already Paid" value={foreclosureMonths}
                                                onChange={(v) => setForeclosureMonths(Math.min(v, months - 1))}
                                                min={1} max={months - 1} suffix=" mo" />
                                            <NumberInput label="Foreclosure Charge %" value={foreclosureChargePercent}
                                                onChange={setForeclosureChargePercent}
                                                min={0} max={5} suffix="%" step={0.5} />
                                        </div>

                                        {foreclosureResult && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 mt-3">
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { label: 'Outstanding Principal', value: formatINR(foreclosureResult.outstandingPrincipal), color: 'text-slate-800 dark:text-foreground' },
                                                        { label: 'Interest Already Paid', value: formatINR(foreclosureResult.totalInterestPaid), color: 'text-amber-600 dark:text-amber-400' },
                                                        { label: 'Interest Saved', value: formatINR(foreclosureResult.interestSaved), color: 'text-emerald-600 dark:text-emerald-400' },
                                                        { label: 'Foreclosure Charge', value: formatINR(foreclosureResult.foreclosureCharge), color: 'text-red-600 dark:text-red-400' },
                                                    ].map(item => (
                                                        <div key={item.label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center">
                                                            <p className="text-muted-foreground text-[9px] uppercase font-bold mb-1">{item.label}</p>
                                                            <p className={`font-bold text-xs ${item.color}`}>{item.value}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 border border-violet-200 dark:border-violet-500/30 text-center">
                                                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Total Amount to Pay Bank Today</p>
                                                    <p className="text-xl font-bold text-slate-900 dark:text-foreground">{formatINR(foreclosureResult.totalSettlement)}</p>
                                                    {foreclosureResult.totalSettlement >= 100000 && (
                                                        <p className="text-muted-foreground dark:text-muted-foreground text-[9px] mt-0.5">({formatINRWords(foreclosureResult.totalSettlement)})</p>
                                                    )}
                                                </div>

                                                <div className={`p-4 rounded-xl border text-center ${foreclosureResult.netBenefit >= 0
                                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                                                    : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                                                    }`}>
                                                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Net Benefit of Foreclosing</p>
                                                    <p className={`text-lg font-bold ${foreclosureResult.netBenefit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {foreclosureResult.netBenefit >= 0 ? '+' : ''}{formatINR(foreclosureResult.netBenefit)}
                                                    </p>
                                                    <p className="text-muted-foreground dark:text-muted-foreground text-[9px] mt-1">
                                                        You save {formatINR(foreclosureResult.interestSaved)} in interest. Charge: {formatINR(foreclosureResult.foreclosureCharge)}.
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* ── Reminder Config ─────────────────────────────── */}
                <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-4 mb-5 shadow-sm dark:shadow-none">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={enableReminder} onChange={(e) => setEnableReminder(e.target.checked)} className="w-5 h-5 accent-violet-600 rounded-md" />
                        <div>
                            <p className="font-bold text-slate-800 dark:text-foreground text-sm">Monthly EMI Reminder</p>
                            <p className="text-muted-foreground text-[10px]">Get notified when your EMI is due</p>
                        </div>
                    </label>
                    <AnimatePresence>
                        {enableReminder && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3">
                                <div className="pl-8 flex items-center gap-3">
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Remind me on the</span>
                                    <div className="flex-1 max-w-[100px]">
                                        <NumberInput label="" value={reminderDate} onChange={(v) => setReminderDate(Math.max(1, Math.min(28, v)))} min={1} max={28} suffix="th" />
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">of every month</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 mb-5">
                    <div className="grid grid-cols-2 gap-3">
                        <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadPDF}
                            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border text-slate-700 dark:text-slate-300 font-bold text-sm">
                            <FileText size={18} className="text-violet-500" /> Export PDF
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadExcel}
                            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border text-slate-700 dark:text-slate-300 font-bold text-sm">
                            <Download size={18} className="text-emerald-500" /> Export Excel
                        </motion.button>
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSave}
                        disabled={isSaved}
                        className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isSaved
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20'
                            }`}
                    >
                        {isSaved ? (
                            <><Check size={18} /> Saved</>
                        ) : savedId ? (
                            <><Save size={18} /> Update Calculation</>
                        ) : (
                            <><Save size={18} /> Save Calculation</>
                        )}
                    </motion.button>
                </div>

                {/* ── Shareable Card ──────────────────────────────── */}
                <ShareableCard
                    title={`My ${loanType} EMI`}
                    highlight={formatINR(result.emi)}
                    subtitle={`${loanType} @ ${rate}% for ${tenureYears} years`}
                    details={[
                        { label: 'Loan Amount', value: formatINR(principal) },
                        { label: 'Total Interest', value: formatINR(result.totalInterest) },
                        { label: 'Total Payment', value: formatINR(result.totalPayment) },
                        { label: 'Interest Rate', value: `${rate}% p.a. (${method === 'reducing' ? 'Reducing' : 'Flat'})` },
                    ]}
                    gradient="from-violet-600 via-purple-500 to-indigo-600"
                />

                <CalculatorInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} calculatorTitle="Loan Analytics Calculator" />
            </div>
        </div>
    );
}