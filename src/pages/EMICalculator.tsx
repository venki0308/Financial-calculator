import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import {
    ArrowLeft, Info, Share2, ChevronDown, ChevronUp, Save, Check, Download,
    Calculator, TrendingDown, FileText, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';
import { nativeShare } from '../utils/nativeShare';
import { useAppColors } from '../theme/useAppColors';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend,
    CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import NumberInput from '../components/NumberInput';
import DateInput from '../components/DateInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import LiveLoanStatus from '../components/LiveLoanStatus';
import { calculateLiveLoanStatus, type LoanProfile } from '../utils/loanStatusEngine';

import {
    calculateReducingEMI, calculateFlatEMI, calculateEffectiveRate,
    calculateForeclosure, calculatePrepaymentSavings,
    formatINR, formatINRShort, formatINRWords,
    LOAN_TYPE_CONFIGS, type AmortizationRow, type ForeclosureResult, type PrepaymentInsight,
} from '../utils/calculations';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { exportToPDF, exportToExcel, dateTag, type ExportConfig } from '../utils/exportReport';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import CibilAdvisoryCard from '../components/CibilAdvisoryCard';
import CibilBadge from '../components/CibilBadge';
import { useCibil } from '../context/CibilContext';
import { AnalyticsService } from '../lib/analytics';
import ShareableCard from '../components/ShareableCard';
import { triggerCalcNotification } from '../services/calcNotifications';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

const loanTypes = Object.keys(LOAN_TYPE_CONFIGS);
const ROWS_PER_PAGE = 12;

export default function EMICalculator() {
    const { t } = useTranslation();
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
    const [rate, setRate] = useState(8.75);
    const [tenure, setTenure] = useState(20);
    const [tenureUnit, setTenureUnit] = useState<'months' | 'years'>('years');
    const [showAmortization, setShowAmortization] = useState(false);
    const [amortPage, setAmortPage] = useState(0);
    const [isSaved, setIsSaved] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const { profile: cibilProfile } = useCibil();
    const cibilScore = cibilProfile?.isNTC ? 0 : (cibilProfile?.score ?? 750);

    // Live Loan Tracker state
    const [loanStartDate, setLoanStartDate] = useState('');
    const [emiDueDay, setEmiDueDay] = useState(5);

    // Foreclosure state
    const [showForeclosure, setShowForeclosure] = useState(false);
    const [foreclosureMonths, setForeclosureMonths] = useState(24);
    const [foreclosureChargePercent, setForeclosureChargePercent] = useState(2);

    // Reminder state
    const [enableReminder, setEnableReminder] = useState(false);
    const [reminderDate, setReminderDate] = useState(5);

    const { addHistory, addSaved, removeSaved, updateSaved, savedCalculations } = useCalculatorStore();
    const chartRef = useRef<any>(null);

    const c = useAppColors();
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

    // ─── Live Loan Profile ─────────────────────────────────────────────
    const loanProfile = useMemo<LoanProfile | null>(() => {
        if (!loanStartDate || !result || result.emi <= 0) return null;
        return {
            loanAmount: principal,
            annualRate: rate,
            tenureMonths: months,
            emiAmount: result.emi,
            disbursementDate: loanStartDate,
            emiDueDay,
            loanType: 'floating',
        };
    }, [loanStartDate, emiDueDay, principal, rate, months, result]);

    // ─── Amortization pagination ────────────────────────────────────────
    const totalPages = Math.ceil((result.schedule?.length || 0) / ROWS_PER_PAGE);
    const pagedSchedule = useMemo(() => {
        if (!result.schedule) return [];
        const start = amortPage * ROWS_PER_PAGE;
        return result.schedule.slice(start, start + ROWS_PER_PAGE);
    }, [result.schedule, amortPage]);

    // ─── Chart Data ─────────────────────────────────────────────────────
    const chartData = {
        labels: [t('emi.principal'), t('emi.interest')],
        datasets: [{
            data: [principal, result.totalInterest],
            backgroundColor: ['#10B981', '#F59E0B'],
            borderColor: [c.card, c.card],
            borderWidth: 2,
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
            items.push({ type: 'tip', text: t('emi.prepayTip', 'Paying just {{extra}} extra/month saves {{saved}} and closes loan {{months}} months earlier.', { extra: formatINR(prepayInsight.extraMonthlyAmount), saved: formatINR(prepayInsight.interestSaved), months: prepayInsight.monthsSaved }) });
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

        triggerCalcNotification({
            type: 'emi_saved',
            metadata: {
                calcId: savedId || `EMI-Save-${Date.now()}`,
                loanName: name,
                loanType: loanType,
                principal: principal,
                rate: rate,
                tenureYears: tenureYears,
                emi: result.emi
            }
        });
    };

    const handleRemove = () => {
        if (savedId) {
            removeSaved(savedId);
            setSavedId(null);
            setIsSaved(false);
        }
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

    // ─── Shared export helpers ────────────────────────────────────────
    const buildExtraTables = (): ExportConfig['additionalTables'] => {
        const tables: NonNullable<ExportConfig['additionalTables']> = [];
        if (foreclosureResult && showForeclosure) {
            const emisPaid = foreclosureMonths * result.emi;
            const totalCostClose = emisPaid + foreclosureResult.totalSettlement;
            tables.push({
                title: 'Foreclosure Simulation',
                columns: ['Metric', 'Amount'],
                rows: [
                    ['Months Paid', String(foreclosureMonths)],
                    ['EMIs Paid So Far', formatINR(emisPaid)],
                    ['Outstanding Principal', formatINR(foreclosureResult.outstandingPrincipal)],
                    ['Interest Already Paid', formatINR(foreclosureResult.totalInterestPaid)],
                    ['Foreclosure Charge (' + foreclosureChargePercent + '%)', formatINR(foreclosureResult.foreclosureCharge)],
                    ['Pay Bank Today (Settlement)', formatINR(foreclosureResult.totalSettlement)],
                    ['Interest You Skip', formatINR(foreclosureResult.interestSaved)],
                    ['---', '---'],
                    ['Total Cost if Close Today', formatINR(totalCostClose)],
                    ['Total Cost if Full Term', formatINR(result.totalPayment)],
                    ['Total Savings', formatINR(result.totalPayment - totalCostClose)],
                    ['Net Benefit (Saved - Charge)', formatINR(foreclosureResult.netBenefit)],
                ],
            });
        }
        if (prepayInsight && prepayInsight.interestSaved > 0) {
            tables.push({
                title: 'Prepayment What-If (10% Extra EMI)',
                columns: ['Metric', 'Value'],
                rows: [
                    ['Current EMI', formatINR(result.emi)],
                    ['Extra Amount/Month (10%)', formatINR(prepayInsight.extraMonthlyAmount)],
                    ['New EMI', formatINR(result.emi + prepayInsight.extraMonthlyAmount)],
                    ['Original Tenure', months + ' months'],
                    ['New Tenure', prepayInsight.newTenureMonths + ' months'],
                    ['Months Saved', String(prepayInsight.monthsSaved)],
                    ['Interest Saved', formatINR(prepayInsight.interestSaved)],
                ],
            });
        }
        if (loanProfile) {
            const liveStatus = calculateLiveLoanStatus(loanProfile);
            if (!liveStatus.loanNotStarted) {
                tables.push({
                    title: `Live Status (as of ${new Date().toLocaleDateString('en-IN')})`,
                    columns: ['Metric', 'Value'],
                    rows: [
                        ['EMIs Paid', String(liveStatus.emisPaid)],
                        ['Principal Outstanding', formatINR(liveStatus.principalOutstanding)],
                        ['Interest Paid So Far', formatINR(liveStatus.interestPaidSoFar)],
                        ['Total Paid So Far', formatINR(liveStatus.totalPaidSoFar)],
                        ['Next EMI Date', liveStatus.nextEmiDate],
                        ['Daily Interest', formatINR(liveStatus.dailyInterest)],
                        ['Settlement Amount Today', formatINR(liveStatus.totalSettlementToday)],
                        ['Interest Saved if Closed Today', formatINR(liveStatus.interestSavedIfCloseToday)],
                    ],
                });
            }
        }
        return tables.length > 0 ? tables : undefined;
    };

    // ─── PDF Export ─────────────────────────────────────────────────────
    const handleDownloadPDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;

        // Build yearly breakdown from monthly schedule
        const schedule = result.schedule || [];
        const yearlyRows: Array<[number, string, string, string]> = [];
        for (let y = 1; y <= Math.ceil(months / 12); y++) {
            const monthSlice = schedule.filter((r: any) => r.month > (y-1)*12 && r.month <= y*12);
            if (monthSlice.length === 0) continue;
            const princPaid = monthSlice.reduce((s: number, r: any) => s + r.principal, 0);
            const intPaid = monthSlice.reduce((s: number, r: any) => s + r.interest, 0);
            const closing = monthSlice[monthSlice.length - 1]?.closingBalance ?? 0;
            yearlyRows.push([
                y,
                `₹${Math.round(princPaid).toLocaleString('en-IN')}`,
                `₹${Math.round(intPaid).toLocaleString('en-IN')}`,
                `₹${Math.round(closing).toLocaleString('en-IN')}`,
            ]);
        }

        const config: ExportConfig = {
            title: `${loanType} ${t('emi.emiReport')}`,
            subtitle: `${method === 'flat' ? t('emi.flatRate') : t('emi.reducingBalance')} ${t('emi.method')}`,
            inputs: [
                { label: t('common.loanAmount'), value: `₹${principal.toLocaleString('en-IN')}` },
                { label: t('emi.annualInterestRate'), value: `${rate}% p.a.` },
                { label: t('emi.loanTenure'), value: `${tenureYears} ${t('common.years')} (${months} ${t('common.months')})` },
                { label: t('emi.interestMethod'), value: method === 'flat' ? t('emi.flatRate') : t('emi.reducingBalance') },
            ],
            results: [
                { label: t('common.monthlyEmi'), value: `₹${Math.round(result.emi).toLocaleString('en-IN')}` },
                { label: t('common.totalInterest'), value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
                { label: t('emi.totalPayment'), value: `₹${Math.round(result.totalPayment).toLocaleString('en-IN')}` },
                { label: t('common.loanAmount'), value: `₹${principal.toLocaleString('en-IN')}` },
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: t('common.principalAmount'), value: principal, color: '#10B981' },
                    { label: t('common.totalInterest'), value: result.totalInterest, color: '#EF4444' },
                ],
            },
            projectionTitle: t('emi.amortizationSchedule'),
            projectionColumns: [t('emi.month'), t('emi.emiCol'), t('emi.principalCol'), t('emi.interestCol'), t('emi.balanceCol')],
            projectionRows: schedule.map((r: any) => [
                r.month,
                Math.round(r.emi),
                Math.round(r.principal),
                Math.round(r.interest),
                Math.round(r.closingBalance),
            ]),
            additionalTables: buildExtraTables(),
            filename: `FinCalix_${loanType.replace(/\s+/g,'')}_Report_${tag}`,
        };
        await exportToPDF(config);
    };

    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const schedule = result.schedule || [];

        const config: ExportConfig = {
            title: `${loanType} ${t('emi.emiReport')}`,
            inputs: [
                { label: t('common.loanAmount'), value: `₹${principal.toLocaleString('en-IN')}` },
                { label: t('emi.annualInterestRate'), value: `${rate}% p.a.` },
                { label: t('emi.loanTenure'), value: `${tenureYears} ${t('common.years')} (${months} ${t('common.months')})` },
                { label: t('emi.interestMethod'), value: method === 'flat' ? t('emi.flatRate') : t('emi.reducingBalance') },
            ],
            results: [
                { label: t('common.monthlyEmi'), value: `₹${Math.round(result.emi).toLocaleString('en-IN')}` },
                { label: t('common.totalInterest'), value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
                { label: t('emi.totalPayment'), value: `₹${Math.round(result.totalPayment).toLocaleString('en-IN')}` },
            ],
            projectionTitle: t('emi.amortizationSchedule'),
            projectionColumns: [t('emi.month'), t('emi.emiShort'), t('emi.principalCol'), t('emi.interestCol'), t('emi.outstandingBalance')],
            projectionRows: schedule.map((r: any) => [
                r.month,
                Math.round(r.emi),
                Math.round(r.principal),
                Math.round(r.interest),
                Math.round(r.closingBalance),
            ]),
            additionalTables: buildExtraTables(),
            filename: `FinCalix_${loanType.replace(/\s+/g,'')}_Report_${tag}`,
        };
        await exportToExcel(config);
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
            <div className="sticky top-0 z-10 bg-white dark:bg-[#0F172A]  px-4 pt-14 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                            <ArrowLeft size={18} className="text-slate-600 dark:text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-foreground">{t('emi.loanAnalytics')}</h1>
                            <p className="text-muted-foreground dark:text-muted-foreground text-xs">{t('emi.bankingGradeEmiCalculator')}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                            <Info size={16} className="text-slate-600 dark:text-muted-foreground" />
                        </button>
                        <button className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border"
                            onClick={() => nativeShare(t('emi.emiCalculator'), t('emi.calculateYourEmi'), window.location.href)}>
                            <Share2 size={16} className="text-slate-600 dark:text-muted-foreground" />
                        </button>
                    </div>
                </div>
            </div>

            <DisclaimerComponent module="emi" />

            <div className="px-4 pb-28">
                {/* CIBIL Badge */}
                <CibilBadge loanType={loanType === 'Home Loan' ? 'home_loan' : loanType === 'Car Loan' ? 'car_loan' : loanType === 'Education Loan' ? 'education_loan' : 'personal_loan'} />

                {/* ── Loan Type Pills ─────────────────────────────── */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar py-3">
                    {loanTypes.map((lt) => (
                        <button key={lt} onClick={() => setLoanType(lt)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${loanType === lt
                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20'
                                : 'bg-slate-100 dark:bg-card border border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground hover:border-slate-400 dark:hover:border-slate-600'
                            }`}>
                            <span>{LOAN_TYPE_CONFIGS[lt].icon}</span>
                            {t(LOAN_TYPE_CONFIGS[lt].labelKey, lt)}
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
                            {m === 'reducing' ? `📉 ${t('emi.reducingBalance')}` : `📊 ${t('emi.flatRate')}`}
                        </button>
                    ))}
                </div>

                {/* Flat Rate comparison banner */}
                {effectiveRate && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                            <span className="font-bold">{t('emi.effectiveRate')}:</span> {t('emi.effectiveRateDescription', { flatRate: rate, reducingRate: effectiveRate })}
                        </p>
                    </motion.div>
                )}

                {/* ── Input Fields ────────────────────────────────── */}
                <div className="space-y-3 mb-5">
                    <NumberInput label={t('emi.loanAmount')} value={principal} onChange={setPrincipal}
                        min={config.minAmount} max={config.maxAmount} prefix="₹"
                        helperText={`${formatINR(config.minAmount)} - ${formatINR(config.maxAmount)}`} />

                    <NumberInput label={t('emi.interestRate')} value={rate} onChange={setRate}
                        min={1} max={30} suffix="%" step={0.05} helperText="Typical range 8-14% (Apr 2026)" />

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
                        <NumberInput label={t('emi.loanTenure')} value={tenure} onChange={setTenure}
                            min={1} max={tenureUnit === 'months' ? config.maxTenureYears * 12 : config.maxTenureYears}
                            suffix={tenureUnit === 'months' ? ' months' : ' years'}
                            helperText={tenureUnit === 'months' ? `1 - ${config.maxTenureYears * 12} months` : `1 - ${config.maxTenureYears} years`} />
                    </div>
                </div>

                {/* ── Result Card ─────────────────────────────────── */}
                <motion.div layout className="p-5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-lg dark:shadow-none mb-4">
                    <div className="text-center mb-5">
                        <p className="text-muted-foreground text-sm mb-1">{t('emi.monthlyEmi')}</p>
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
                        <div className="text-center p-3 rounded-xl bg-muted/30 border border-slate-200 dark:border-transparent">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <span className="text-slate-600 dark:text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{t('emi.principal')}</span>
                            </div>
                            <p className="text-slate-900 dark:text-foreground font-bold text-sm">{formatINR(principal)}</p>
                            {principal >= 100000 && <p className="text-muted-foreground dark:text-muted-foreground text-[9px] mt-0.5">({formatINRWords(principal)})</p>}
                        </div>
                        <div className="text-center p-3 rounded-xl bg-muted/30 border border-slate-200 dark:border-transparent">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                <span className="text-slate-600 dark:text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{t('emi.interest')}</span>
                            </div>
                            <p className="text-slate-900 dark:text-foreground font-bold text-sm">{formatINR(result.totalInterest)}</p>
                            {result.totalInterest >= 100000 && <p className="text-muted-foreground dark:text-muted-foreground text-[9px] mt-0.5">({formatINRWords(result.totalInterest)})</p>}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-border/40 text-center">
                        <p className="text-muted-foreground text-xs mb-1">{t('emi.totalPayment')}</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-foreground">{formatINR(result.totalPayment)}</p>
                        {result.totalPayment >= 100000 && <p className="text-muted-foreground dark:text-muted-foreground text-[9px] mt-0.5">({formatINRWords(result.totalPayment)})</p>}
                    </div>
                </motion.div>

                {/* ── Smart EMI Insights ──────────────────────────── */}
                <div className="mb-4">
                    <div className="flex items-center gap-1.5 px-1 mb-2">
                        <span className="text-amber-400 text-sm">💡</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('emi.smartEmiInsights')}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-card border border-slate-200 dark:border-border mb-3">
                        <NumberInput label={t('emi.yourMonthlyIncome')} value={monthlyIncome} onChange={setMonthlyIncome}
                            min={0} max={10000000} prefix="₹" helperText={t('emi.enterToSeeAnalysis')} />
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
                            className="w-full py-3.5 rounded-2xl border border-slate-200 dark:border-border text-muted-foreground font-bold text-sm bg-white dark:bg-card/50 flex items-center justify-center gap-2 mb-3 shadow-sm dark:shadow-none">
                            <Calculator size={16} />
                            {showAmortization ? t('emi.hide') : t('emi.view')} {t('emi.amortizationSchedule')}
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
                                                    <th className="py-2 text-left font-semibold">{t('emi.mo')}</th>
                                                    <th className="py-2 text-right font-semibold">{t('emi.opening')}</th>
                                                    <th className="py-2 text-right font-semibold">{t('emi.emi')}</th>
                                                    <th className="py-2 text-right font-semibold">{t('emi.principal')}</th>
                                                    <th className="py-2 text-right font-semibold">{t('emi.interest')}</th>
                                                    <th className="py-2 text-right font-semibold">{t('emi.closing')}</th>
                                                    <th className="py-2 text-right font-semibold">{t('emi.cumP')}</th>
                                                    <th className="py-2 text-right font-semibold">{t('emi.cumI')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pagedSchedule.map((row) => {
                                                    const isYearEnd = row.month % 12 === 0;
                                                    return (
                                                        <tr key={row.month} className={`border-b border-slate-100 dark:border-border/30 ${isYearEnd ? 'bg-violet-50 dark:bg-violet-500/5' : ''}`}>
                                                            <td className={`py-1.5 text-muted-foreground ${isYearEnd ? 'font-bold text-violet-700 dark:text-violet-300' : ''}`}>
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
                                                    {t('emi.page')} {amortPage + 1} {t('emi.of')} {totalPages} ({result.schedule.length} {t('emi.months')})
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
                            className="w-full py-3.5 rounded-2xl border border-slate-200 dark:border-border text-muted-foreground font-bold text-sm bg-white dark:bg-card/50 flex items-center justify-center gap-2 mb-3 shadow-sm dark:shadow-none">
                            <TrendingDown size={16} />
                            {showForeclosure ? t('emi.hide') : t('emi.foreclosureCalculator')}
                            {showForeclosure ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        <AnimatePresence>
                            {showForeclosure && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                    <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-4 space-y-3 shadow-sm dark:shadow-none">
                                        <h3 className="text-slate-800 dark:text-foreground font-bold text-sm flex items-center gap-2">
                                            <TrendingDown size={16} className="text-violet-600 dark:text-violet-400" />
                                            {t('emi.foreclosureSimulation')}
                                        </h3>

                                        <div className="grid grid-cols-2 gap-3">
                                            <NumberInput label={t('emi.monthsAlreadyPaid')} value={foreclosureMonths}
                                                onChange={(v) => setForeclosureMonths(Math.min(v, months - 1))}
                                                min={1} max={months - 1} suffix=" mo" />
                                            <NumberInput label={t('emi.foreclosureChargePercent')} value={foreclosureChargePercent}
                                                onChange={setForeclosureChargePercent}
                                                min={0} max={5} suffix="%" step={0.5} />
                                        </div>

                                        {foreclosureResult && (() => {
                                            const emisPaidTotal = foreclosureMonths * result.emi;
                                            const totalCostForeclosure = emisPaidTotal + foreclosureResult.totalSettlement;
                                            const totalCostFullTerm = result.totalPayment;
                                            const totalSaving = totalCostFullTerm - totalCostForeclosure;
                                            return (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 mt-3">
                                                {/* EMIs Paid Summary */}
                                                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground text-[10px] font-bold">{t('emi.emisPaid')} ({foreclosureMonths} {t('emi.months')} × {formatINR(result.emi)})</span>
                                                        <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">{formatINR(emisPaidTotal)}</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { label: t('emi.outstandingPrincipal'), value: formatINR(foreclosureResult.outstandingPrincipal), color: 'text-slate-800 dark:text-foreground' },
                                                        { label: t('emi.interestAlreadyPaid'), value: formatINR(foreclosureResult.totalInterestPaid), color: 'text-amber-600 dark:text-amber-400' },
                                                        { label: t('emi.foreclosureCharge'), value: formatINR(foreclosureResult.foreclosureCharge), color: 'text-red-600 dark:text-red-400' },
                                                        { label: t('emi.interestYouSkip'), value: formatINR(foreclosureResult.interestSaved), color: 'text-emerald-600 dark:text-emerald-400' },
                                                    ].map(item => (
                                                        <div key={item.label} className="p-3 rounded-xl bg-muted/40 text-center">
                                                            <p className="text-muted-foreground text-[9px] uppercase font-bold mb-1">{item.label}</p>
                                                            <p className={`font-bold text-xs ${item.color}`}>{item.value}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 border border-violet-200 dark:border-violet-500/30 text-center">
                                                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">{t('emi.payBankTodayToClose')}</p>
                                                    <p className="text-xl font-bold text-slate-900 dark:text-foreground">{formatINR(foreclosureResult.totalSettlement)}</p>
                                                    <p className="text-muted-foreground text-[9px] mt-1">
                                                        {formatINR(foreclosureResult.outstandingPrincipal)} principal + {formatINR(foreclosureResult.foreclosureCharge)} charge
                                                    </p>
                                                </div>

                                                {/* Total Cost Comparison */}
                                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-border space-y-2">
                                                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-2">{t('emi.totalCostComparison')}</p>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground text-xs">{t('emi.ifYouCloseToday')}</span>
                                                        <span className="text-foreground font-bold text-xs">{formatINR(totalCostForeclosure)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground text-xs">{t('emi.ifYouContinueFullTerm')}</span>
                                                        <span className="text-foreground font-bold text-xs">{formatINR(totalCostFullTerm)}</span>
                                                    </div>
                                                    <div className="border-t border-border pt-2 flex justify-between items-center">
                                                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">{t('emi.youSave')}</span>
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{formatINR(totalSaving)}</span>
                                                    </div>
                                                </div>

                                                <div className={`p-3 rounded-xl border text-center ${foreclosureResult.netBenefit >= 0
                                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                                                    : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                                                    }`}>
                                                    <p className={`text-xs font-bold ${foreclosureResult.netBenefit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {foreclosureResult.netBenefit >= 0 ? `✓ ${t('emi.foreclosingIsBeneficial')}` : `✗ ${t('emi.foreclosureChargeExceedsInterest')}`} — {t('emi.net')}: {foreclosureResult.netBenefit >= 0 ? '+' : ''}{formatINR(foreclosureResult.netBenefit)}
                                                    </p>
                                                </div>
                                            </motion.div>
                                            );
                                        })()}
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
                            <p className="font-bold text-slate-800 dark:text-foreground text-sm">{t('emi.monthlyEmiReminder')}</p>
                            <p className="text-muted-foreground text-[10px]">{t('emi.getNotifiedWhenDue')}</p>
                        </div>
                    </label>
                    <AnimatePresence>
                        {enableReminder && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3">
                                <div className="pl-8 flex items-center gap-3">
                                    <span className="text-xs font-semibold text-muted-foreground">{t('emi.remindMeOnThe')}</span>
                                    <div className="flex-1 max-w-[100px]">
                                        <NumberInput label="" value={reminderDate} onChange={(v) => setReminderDate(Math.max(1, Math.min(28, v)))} min={1} max={28} suffix="th" />
                                    </div>
                                    <span className="text-xs font-semibold text-muted-foreground">{t('emi.ofEveryMonth')}</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 mb-5">
                    <div className="grid grid-cols-2 gap-3">
                        <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadPDF}
                            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border text-muted-foreground font-bold text-sm">
                            <FileText size={18} className="text-violet-500" /> {t('emi.exportPdf')}
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadExcel}
                            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border text-muted-foreground font-bold text-sm">
                            <Download size={18} className="text-emerald-500" /> {t('emi.exportExcel')}
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
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={handleSave}
                            className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20"
                        >
                            {savedId ? (
                                <><Save size={18} /> {t('emi.updateCalculation')}</>
                            ) : (
                                <><Save size={18} /> {t('emi.saveCalculation')}</>
                            )}
                        </motion.button>
                    )}
                </div>

                {/* ── Shareable Card ──────────────────────────────── */}
                <ShareableCard
                    title={`My ${loanType} EMI`}
                    highlight={formatINR(result.emi)}
                    subtitle={`${loanType} @ ${rate}% for ${tenureYears} years`}
                    details={[
                        { label: t('emi.loanAmount'), value: formatINR(principal) },
                        { label: t('emi.totalInterest'), value: formatINR(result.totalInterest) },
                        { label: t('emi.totalPayment'), value: formatINR(result.totalPayment) },
                        { label: t('emi.interestRate'), value: `${rate}% p.a. (${method === 'reducing' ? t('emi.reducingBalance') : t('emi.flatRate')})` },
                    ]}
                    gradient="from-violet-600 via-purple-500 to-indigo-600"
                />

                {/* ── Live Loan Tracker ────────────────────────────── */}
                <div className="space-y-4 mt-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm dark:shadow-none space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📍</span>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-foreground">{t('emi.liveTracker')}</h3>
                                <p className="text-[10px] text-muted-foreground">{t('emi.liveTrackerDesc')}</p>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-muted-foreground mb-1.5 block">{t('emi.disbursementDate')}</label>
                            <DateInput value={loanStartDate} onChange={setLoanStartDate} />
                        </div>
                        {loanStartDate && (
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-muted-foreground mb-1.5 block">{t('emi.emiDueDay')}</label>
                                <div className="flex gap-2 flex-wrap">
                                    {[1, 5, 7, 10, 15].map((d) => (
                                        <button key={d} onClick={() => setEmiDueDay(d)}
                                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${emiDueDay === d
                                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                                                : 'bg-slate-100 dark:bg-card border border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground'
                                            }`}>
                                            {d}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[9px] text-muted-foreground mt-1">{t('emi.emiDueDayHint')}</p>
                            </div>
                        )}
                    </div>

                    {loanProfile && <LiveLoanStatus
                        profile={loanProfile}
                        loanCategory={loanType === 'Home Loan' ? 'home_loan' : loanType === 'Car Loan' ? 'car_loan' : loanType === 'Education Loan' ? 'education_loan' : 'personal_loan'}
                    />}
                </div>

                {/* CIBIL Score Advisory */}
                <div className="mt-4">
                    <CibilAdvisoryCard score={cibilScore} loanType={loanType === 'Home Loan' ? 'home_loan' : loanType === 'Car Loan' ? 'car_loan' : loanType === 'Education Loan' ? 'education_loan' : 'personal_loan'} loanAmount={principal} tenureMonths={months} />
                </div>

                <CalculatorInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} calculatorTitle={t('emi.loanAnalyticsCalculator')} />
            </div>
        </div>
    );
}
