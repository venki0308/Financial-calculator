import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Info, Plus, Trash2, ChevronDown, ChevronUp, Calculator, Home, AlertTriangle, AlertCircle, CheckCircle2, IndianRupee, Receipt, FileText, Download, TrendingDown, Sliders, Save, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import NumberInput from '../components/NumberInput';
import {
    calculateAdvancedMortgage,
    calculateLTV,
    formatINR,
    formatINRShort,
} from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';
import { useCalculatorStore } from '../store/useCalculatorStore';
import DisclaimerComponent from '../components/DisclaimerComponent';
import DateInput from '../components/DateInput';
import LiveLoanStatus from '../components/LiveLoanStatus';
import CibilBadge from '../components/CibilBadge';
import CibilAdvisoryCard from '../components/CibilAdvisoryCard';
import { useCibil } from '../context/CibilContext';
import { saveLoan as saveLoanToStorage, generateLoanId, type SavedLoan } from '../utils/loanStorage';
import { calculateLiveLoanStatus, type LoanProfile } from '../utils/loanStatusEngine';
import { exportToPDF, exportToExcel, dateTag, type ExportConfig } from '../utils/exportReport';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { useHistoryTracker } from '../hooks/useHistoryTracker';

ChartJS.register(ArcElement, Tooltip, Legend);

const ROWS_PER_PAGE = 24; // Show 2 years per page for better view

export default function AdvancedMortgageCalculator() {
    const { t } = useTranslation();
    useEffect(() => { AnalyticsService.trackScreen('Advanced_Mortgage_Calculator'); }, []);
    const navigate = useNavigate();
    const c = useAppColors();
    const { addSaved, removeSaved } = useCalculatorStore();
    const { profile: cibilProfile } = useCibil();
    const cibilScore = cibilProfile?.isNTC ? 0 : (cibilProfile?.score ?? 750);
    const [saved, setSaved] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);

    // ─── Input State ────────────────────────────────────────────────────────
    const [propertyValue, setPropertyValue] = useState(10000000);
    const [downPayment, setDownPayment] = useState(2000000);
    const [interestRate, setInterestRate] = useState(8.75);
    const [tenureYears, setTenureYears] = useState(20);
    const [monthlyIncome, setMonthlyIncome] = useState(150000);
    const [loanRateType, setLoanRateType] = useState<'floating' | 'fixed'>('floating');
    const [loanPurpose, setLoanPurpose] = useState<'home' | 'plot' | 'renovation'>('home');

    // ─── Live Loan Status Inputs ───────────────────────────────────────────
    const [loanStartDate, setLoanStartDate] = useState('');
    const [emiDueDay, setEmiDueDay] = useState(5);

    // ─── True Cost Inputs ──────────────────────────────────────────────────
    const [processingFee, setProcessingFee] = useState(0);
    const [insurancePremium, setInsurancePremium] = useState(0);
    const [preEmiInterest, setPreEmiInterest] = useState(0);

    // ─── Prepayment State ───────────────────────────────────────────────────
    const [enablePrepayment, setEnablePrepayment] = useState(false);
    const [monthlyExtraEMI, setMonthlyExtraEMI] = useState(0);
    const [lumpSums, setLumpSums] = useState<{ id: string; month: number; amount: number }[]>([
        { id: '1', month: 12, amount: 100000 }
    ]);
    const [prepaymentMode, setPrepaymentMode] = useState<'reduce_tenure' | 'reduce_emi'>('reduce_tenure');

    const [showAmortization, setShowAmortization] = useState(false);
    const [amortPage, setAmortPage] = useState(0);

    // ─── Foreclosure State ─────────────────────────────────────────────────
    const [showForeclosure, setShowForeclosure] = useState(false);
    const [fcMonths, setFcMonths] = useState(60);
    const [fcRateType, setFcRateType] = useState<'floating' | 'fixed'>('floating');
    const [fcChargePercent, setFcChargePercent] = useState(0); // RBI: 0% for floating

    // ─── What-If State ─────────────────────────────────────────────────────
    const [showWhatIf, setShowWhatIf] = useState(false);
    const [wiRate, setWiRate] = useState(interestRate);
    const [wiTenure, setWiTenure] = useState(tenureYears);

    // ─── Computed Values ────────────────────────────────────────────────────
    const loanAmount = Math.max(0, propertyValue - downPayment);
    const ltv = calculateLTV(loanAmount, propertyValue);
    // RBI tiered LTV based on property value: ≤₹30L → 90%, ₹30L–₹75L → 80%, >₹75L → 75%
    const maxLtv = propertyValue <= 3000000 ? 90 : propertyValue <= 7500000 ? 80 : 75;
    const months = tenureYears * 12;

    const result = useMemo(() => {
        const config = {
            monthlyExtraEMI: enablePrepayment ? monthlyExtraEMI : 0,
            lumpSums: enablePrepayment ? lumpSums : [],
            mode: prepaymentMode
        };
        return calculateAdvancedMortgage(loanAmount, interestRate, months, config);
    }, [loanAmount, interestRate, months, enablePrepayment, monthlyExtraEMI, lumpSums, prepaymentMode]);

    // ─── True Cost of Loan ─────────────────────────────────────────────────
    useHistoryTracker('Mortgage Calculator', { loanAmount, interestRate, months }, { totalInterest: result.totalInterest }, result.emi);

    const trueCost = useMemo(() => {
        const totalEmiInterest = result.totalInterest;
        const extras = processingFee + insurancePremium + preEmiInterest;
        const totalAmountPaid = result.totalPayment + extras;
        const costOverLoan = totalAmountPaid - loanAmount;
        const costPercent = loanAmount > 0 ? (costOverLoan / loanAmount) * 100 : 0;
        return { totalEmiInterest, extras, totalAmountPaid, costOverLoan, costPercent };
    }, [result, processingFee, insurancePremium, preEmiInterest, loanAmount]);

    // ─── Chart Config ───────────────────────────────────────────────────────
    const chartData = {
        labels: [t('mortgage.chartPrincipal'), t('mortgage.chartInterest')],
        datasets: [{
            data: [loanAmount, result.totalInterest],
            backgroundColor: ['#10B981', '#F59E0B'],
            borderColor: [c.card, c.card],
            borderWidth: 2,
        }]
    };

    const chartOptions = {
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    color: c.textSecondary,
                    padding: 20,
                    font: { family: 'Inter', size: 13 }
                }
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => ` ${context.label}: ${formatINR(context.raw)}`
                }
            }
        },
        maintainAspectRatio: false
    };

    // ─── Pagination ─────────────────────────────────────────────────────────
    const totalPages = Math.ceil(result.schedule.length / ROWS_PER_PAGE);
    const pagedSchedule = useMemo(() => {
        const start = amortPage * ROWS_PER_PAGE;
        return result.schedule.slice(start, start + ROWS_PER_PAGE);
    }, [result.schedule, amortPage]);

    // ─── Handlers ───────────────────────────────────────────────────────────
    const addLumpSum = () => {
        setLumpSums([...lumpSums, { id: Date.now().toString(), month: 12, amount: 0 }]);
    };

    const removeLumpSum = (id: string) => {
        setLumpSums(lumpSums.filter(ls => ls.id !== id));
    };

    const updateLumpSum = (id: string, field: 'month' | 'amount', value: number) => {
        setLumpSums(lumpSums.map(ls => ls.id === id ? { ...ls, [field]: value } : ls));
    };

    // ─── Foreclosure Computation ──────────────────────────────────────────
    const fcResult = useMemo(() => {
        if (!showForeclosure || !result.schedule.length || fcMonths < 1 || fcMonths >= result.schedule.length) return null;
        const chargeRate = fcRateType === 'floating' ? 0 : fcChargePercent;
        const row = result.schedule[fcMonths - 1];
        const outstanding = row.closingBalance;
        const intPaid = row.cumulativeInterest;
        const totalIntFull = result.schedule[result.schedule.length - 1].cumulativeInterest;
        const intSaved = totalIntFull - intPaid;
        const charge = (outstanding * chargeRate) / 100;
        const settlement = outstanding + charge;
        const emisPaid = result.schedule.slice(0, fcMonths).reduce((s, r) => s + r.emi, 0);
        const totalCostClose = emisPaid + settlement;
        const totalCostFull = result.totalPayment;
        return { outstanding: Math.round(outstanding), intPaid: Math.round(intPaid), intSaved: Math.round(intSaved),
            charge: Math.round(charge), settlement: Math.round(settlement), emisPaid: Math.round(emisPaid),
            totalCostClose: Math.round(totalCostClose), totalCostFull: Math.round(totalCostFull),
            saving: Math.round(totalCostFull - totalCostClose), netBenefit: Math.round(intSaved - charge) };
    }, [showForeclosure, fcMonths, fcRateType, fcChargePercent, result]);

    // ─── Yearly Foreclosure Timeline ─────────────────────────────────────
    const fcTimeline = useMemo(() => {
        if (!showForeclosure || !result.schedule.length) return [];
        const chargeRate = fcRateType === 'floating' ? 0 : fcChargePercent;
        const totalIntFull = result.schedule[result.schedule.length - 1].cumulativeInterest;
        const totalYears = Math.ceil(result.schedule.length / 12);
        const timeline = [];
        for (let yr = 1; yr <= totalYears; yr++) {
            const m = Math.min(yr * 12, result.schedule.length - 1);
            const row = result.schedule[m - 1];
            if (!row) continue;
            const outstanding = row.closingBalance;
            const intSaved = totalIntFull - row.cumulativeInterest;
            const charge = (outstanding * chargeRate) / 100;
            const emisPaid = result.schedule.slice(0, m).reduce((s, r) => s + r.emi, 0);
            const settlement = outstanding + charge;
            const saving = result.totalPayment - (emisPaid + settlement);
            timeline.push({ year: yr, outstanding: Math.round(outstanding), settlement: Math.round(settlement), intSaved: Math.round(intSaved), saving: Math.round(saving) });
        }
        return timeline;
    }, [showForeclosure, fcRateType, fcChargePercent, result]);

    // ─── What-If Computation ────────────────────────────────────────────
    const wiResult = useMemo(() => {
        if (!showWhatIf) return null;
        const wiMonths = wiTenure * 12;
        const r = wiRate / 12 / 100;
        const wiEmi = r === 0 ? Math.ceil(loanAmount / wiMonths) : Math.ceil((loanAmount * r * Math.pow(1 + r, wiMonths)) / (Math.pow(1 + r, wiMonths) - 1));
        const wiTotalPayment = wiEmi * wiMonths;
        const wiTotalInterest = wiTotalPayment - loanAmount;
        return {
            emi: wiEmi, totalInterest: wiTotalInterest, totalPayment: wiTotalPayment, months: wiMonths,
            emiDiff: wiEmi - result.originalEmi,
            interestDiff: wiTotalInterest - result.totalInterest,
            paymentDiff: wiTotalPayment - result.totalPayment,
        };
    }, [showWhatIf, wiRate, wiTenure, loanAmount, result]);

    // ─── Live Loan Status Profile ────────────────────────────────────────
    const loanProfile = useMemo<LoanProfile | null>(() => {
        if (!loanStartDate || loanAmount <= 0 || result.originalEmi <= 0) return null;
        return {
            loanAmount,
            annualRate: interestRate,
            tenureMonths: months,
            emiAmount: result.originalEmi,
            disbursementDate: loanStartDate,
            emiDueDay,
            loanType: loanRateType,
        };
    }, [loanStartDate, emiDueDay, loanAmount, interestRate, months, result, loanRateType]);

    // ─── Export helpers ──────────────────────────────────────────────────
    // PDF: English labels — jsPDF Helvetica doesn't support Indian scripts
    const buildExportConfig = (forExcel = false): ExportConfig => {
        const tag = dateTag();
        const emiRatio = monthlyIncome > 0 ? (result.originalEmi / monthlyIncome) * 100 : 0;
        const affordStatus = emiRatio > 50 ? 'High Risk' : emiRatio > 40 ? 'Caution' : 'Safe';

        const inputs: ExportConfig['inputs'] = [
            { label: 'Property Value', value: formatINR(propertyValue) },
            { label: 'Down Payment', value: formatINR(downPayment) },
            { label: 'Loan Amount', value: formatINR(loanAmount) },
            { label: 'LTV Ratio', value: `${ltv.toFixed(1)}% (RBI Max: ${maxLtv}%)` },
            { label: 'Interest Rate', value: `${interestRate}% p.a.` },
            { label: 'Tenure', value: `${tenureYears} Years (${months} Months)` },
            ...(monthlyIncome > 0 ? [{ label: 'Monthly Income', value: formatINR(monthlyIncome) }] : []),
            { label: 'Loan Purpose', value: loanPurpose === 'home' ? 'Home Purchase / Construction' : loanPurpose === 'plot' ? 'Residential Plot / Land' : 'Home Renovation' },
        ];

        const results: ExportConfig['results'] = [
            { label: 'Monthly EMI', value: formatINR(result.originalEmi) },
            ...(preEmiInterest > 0 ? [
                { label: 'Pre-EMI Interest', value: formatINR(preEmiInterest) },
                { label: 'EMI Interest', value: formatINR(result.totalInterest) },
                { label: 'Total Interest (EMI + Pre-EMI)', value: formatINR(result.totalInterest + preEmiInterest) },
            ] : [
                { label: 'Total Interest', value: formatINR(result.totalInterest) },
            ]),
            { label: 'Total Payment', value: formatINR(result.totalPayment + preEmiInterest) },
            ...(monthlyIncome > 0 ? [
                { label: 'EMI-to-Income Ratio', value: `${emiRatio.toFixed(1)}%` },
                { label: 'Affordability Status', value: affordStatus },
            ] : []),
            ...(enablePrepayment ? [
                { label: 'Prepayment Strategy', value: prepaymentMode === 'reduce_tenure' ? 'Reduce Tenure' : 'Reduce EMI' },
                ...(monthlyExtraEMI > 0 ? [{ label: 'Monthly Extra EMI', value: formatINR(monthlyExtraEMI) }] : []),
                ...(result.interestSaved > 0 ? [{ label: 'Interest Saved', value: formatINR(result.interestSaved) }] : []),
                ...(result.timeSavedMonths > 0 ? [{ label: 'Time Saved', value: `${Math.floor(result.timeSavedMonths / 12)}y ${result.timeSavedMonths % 12}m` }] : []),
            ] : []),
            { label: 'Sec 80C Deduction', value: formatINR(result.taxBenefits.total80C) },
            { label: 'Sec 24(b) Deduction', value: formatINR(result.taxBenefits.total24) },
            ...(trueCost.extras > 0 ? [
                { label: 'True Cost of Loan', value: formatINR(trueCost.totalAmountPaid) },
                { label: 'Cost Over Loan Amount', value: `${formatINR(trueCost.costOverLoan)} (+${trueCost.costPercent.toFixed(1)}%)` },
            ] : []),
        ];

        // Year-wise summary: aggregate monthly schedule into annual rows
        const yearlyMap = new Map<number, { principal: number; interest: number; totalPaid: number; closingBalance: number }>();
        result.schedule.forEach(row => {
            const yr = Math.ceil(row.month / 12);
            const existing = yearlyMap.get(yr) || { principal: 0, interest: 0, totalPaid: 0, closingBalance: 0 };
            existing.principal += row.principal;
            existing.interest += row.interest;
            existing.totalPaid += row.emi;
            existing.closingBalance = row.closingBalance;
            yearlyMap.set(yr, existing);
        });

        const yearlyRows = Array.from(yearlyMap.entries()).map(([yr, d]) => [
            yr,
            forExcel ? Math.round(d.totalPaid) : formatINR(d.totalPaid),
            forExcel ? Math.round(d.principal) : formatINR(d.principal),
            forExcel ? Math.round(d.interest) : formatINR(d.interest),
            forExcel ? Math.round(d.closingBalance) : formatINR(d.closingBalance),
        ]);

        const taxRows = result.taxBenefits.schedule.map(tb => [
            tb.year,
            forExcel ? tb.principal : formatINR(tb.principal),
            forExcel ? tb.interest : formatINR(tb.interest),
            forExcel ? tb.deduction80C : formatINR(tb.deduction80C),
            forExcel ? tb.deduction24 : formatINR(tb.deduction24),
            forExcel ? (tb.deduction80C + tb.deduction24) : formatINR(tb.deduction80C + tb.deduction24),
        ]);

        return {
            title: 'Advanced Mortgage Report',
            subtitle: 'Home Loan Analysis',
            inputs,
            results,
            chart: {
                type: 'pie',
                segments: [
                    { label: 'Principal', value: loanAmount, color: '#10B981' },
                    { label: 'Total Interest', value: result.totalInterest + preEmiInterest, color: '#F59E0B' },
                ],
            },
            projectionTitle: 'EMI Schedule',
            projectionColumns: ['Month', 'Payment', 'Principal', 'Interest', 'Balance'],
            projectionRows: result.schedule.map(r => [
                r.month,
                forExcel ? Math.round(r.emi) : formatINR(r.emi),
                forExcel ? Math.round(r.principal) : formatINR(r.principal),
                forExcel ? Math.round(r.interest) : formatINR(r.interest),
                forExcel ? Math.round(r.closingBalance) : formatINR(r.closingBalance),
            ]),
            additionalTables: [
                {
                    title: 'Yearly Summary',
                    columns: ['Year', 'Total Paid', 'Principal', 'Interest', 'Balance'],
                    rows: yearlyRows,
                },
                {
                    title: loanPurpose === 'plot'
                        ? 'Tax Benefits (Plot Loan — Special Rules)'
                        : 'Tax Benefits',
                    columns: ['Year', 'Principal Paid', 'Interest Paid', '80C', '24(b)', 'Total Benefit'],
                    rows: taxRows,
                },
                ...(fcTimeline.length > 1 ? [{
                    title: 'Foreclosure Timeline',
                    columns: ['Year', 'Outstanding', 'Settlement', 'You save'],
                    rows: fcTimeline.map(fc => [
                        fc.year,
                        forExcel ? fc.outstanding : formatINR(fc.outstanding),
                        forExcel ? fc.settlement : formatINR(fc.settlement),
                        forExcel ? fc.saving : formatINR(fc.saving),
                    ]),
                }] : []),
                ...(fcResult ? [{
                    title: 'Foreclosure Simulation',
                    columns: ['Metric', 'Amount'],
                    rows: [
                        ['Months Paid', String(fcMonths)],
                        ['Rate Type', fcRateType === 'floating' ? 'Floating (NIL charge)' : `Fixed (${fcChargePercent}% charge)`],
                        ['EMIs Paid', forExcel ? fcResult.emisPaid : formatINR(fcResult.emisPaid)],
                        ['Outstanding Principal', forExcel ? fcResult.outstanding : formatINR(fcResult.outstanding)],
                        ['Interest Already Paid', forExcel ? fcResult.intPaid : formatINR(fcResult.intPaid)],
                        ['Foreclosure Charge', forExcel ? fcResult.charge : formatINR(fcResult.charge)],
                        ['Settlement Amount', forExcel ? fcResult.settlement : formatINR(fcResult.settlement)],
                        ['Interest Saved', forExcel ? fcResult.intSaved : formatINR(fcResult.intSaved)],
                        ['Cost to Close Today', forExcel ? fcResult.totalCostClose : formatINR(fcResult.totalCostClose)],
                        ['Cost if Full Term', forExcel ? fcResult.totalCostFull : formatINR(fcResult.totalCostFull)],
                        ['Total Savings', forExcel ? fcResult.saving : formatINR(fcResult.saving)],
                    ] as Array<Array<string | number>>,
                }] : []),
                ...(wiResult ? [{
                    title: 'What-If Simulation',
                    columns: ['Metric', 'Current', 'What-If', 'Difference'],
                    rows: [
                        ['Interest Rate', `${interestRate}%`, `${wiRate}%`, `${(wiRate - interestRate) > 0 ? '+' : ''}${(wiRate - interestRate).toFixed(1)}%`],
                        ['Tenure', `${tenureYears} yrs`, `${wiTenure} yrs`, `${wiTenure - tenureYears} yrs`],
                        ['Monthly EMI', forExcel ? result.originalEmi : formatINR(result.originalEmi), forExcel ? wiResult.emi : formatINR(wiResult.emi), forExcel ? wiResult.emiDiff : formatINR(wiResult.emiDiff)],
                        ['Total Interest', forExcel ? result.totalInterest : formatINR(result.totalInterest), forExcel ? wiResult.totalInterest : formatINR(wiResult.totalInterest), forExcel ? wiResult.interestDiff : formatINR(wiResult.interestDiff)],
                        ['Total Payment', forExcel ? result.totalPayment : formatINR(result.totalPayment), forExcel ? wiResult.totalPayment : formatINR(wiResult.totalPayment), forExcel ? wiResult.paymentDiff : formatINR(wiResult.paymentDiff)],
                    ] as Array<Array<string | number>>,
                }] : []),
                ...(() => {
                    if (!loanProfile) return [];
                    const liveStatus = calculateLiveLoanStatus(loanProfile);
                    if (liveStatus.loanNotStarted) return [];
                    return [{
                        title: `Live Mortgage Status — as of ${new Date().toLocaleDateString('en-IN')}`,
                        columns: ['Metric', 'Value'],
                        rows: [
                            ['EMIs Paid', String(liveStatus.emisPaid)],
                            ['Principal Outstanding', formatINR(liveStatus.principalOutstanding)],
                            ['Interest Paid', formatINR(liveStatus.interestPaidSoFar)],
                            ['Total Paid', formatINR(liveStatus.totalPaidSoFar)],
                            ['Next EMI Date', liveStatus.nextEmiDate],
                            ['Daily Interest', formatINR(liveStatus.dailyInterest)],
                            ['Settlement Today', formatINR(liveStatus.totalSettlementToday)],
                            ['Interest Saved if Closed', formatINR(liveStatus.interestSavedIfCloseToday)],
                        ] as Array<Array<string | number>>,
                    }];
                })(),
            ],
            filename: `FinCalix_Mortgage_Report_${tag}`,
        };
    };

    const handleDownloadPDF = async () => {
        await exportToPDF(buildExportConfig(false));
    };

    const handleDownloadExcel = async () => {
        await exportToExcel(buildExportConfig(true));
    };

    const handleSave = () => {
        // Save to calculator history (Profile > Saved Calculations)
        const newId = `AdvMortgage-Save-${Date.now()}`;
        addSaved({
            id: newId,
            calculatorType: t('mortgage.calculatorType'),
            inputValues: { propertyValue, downPayment, loanAmount, interestRate, tenureYears, loanRateType, loanPurpose },
            resultValues: { originalEmi: result.originalEmi, totalInterest: result.totalInterest, totalPayment: result.totalPayment },
            timestamp: Date.now(),
        });

        // Also save to My Loans tracker so the user can find it under /my-loans.
        // Use the disbursement date if entered, otherwise default to today so the
        // entry appears in the loan tracker immediately.
        const trackerId = generateLoanId();
        const disbursement = loanStartDate || new Date().toISOString().split('T')[0];
        const loanData: SavedLoan = {
            id: trackerId,
            nickName: `${t('mortgage.calculatorType')} — ${formatINRShort(loanAmount)}`,
            loanType: 'home_loan',
            lenderName: '',
            loanAmount,
            interestRate,
            tenureMonths: months,
            emiAmount: result.originalEmi,
            rateType: loanRateType,
            disbursementDate: disbursement,
            emiDueDay,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
        };
        saveLoanToStorage(loanData);

        setLastSavedId(newId);
        setSaved(true);
    };

    const handleRemove = () => {
        if (lastSavedId) {
            removeSaved(lastSavedId);
            setLastSavedId(null);
            setSaved(false);
        }
    };

    // ─── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen pb-safe-nav" style={{ backgroundColor: c.bg, color: c.text }}>
            {/* Header */}
            <div className="sticky top-0 z-40 px-4 pt-14 pb-3 flex items-center gap-3 backdrop-blur-md shadow-sm border-b"
                 style={{ backgroundColor: `${c.card}E6`, borderColor: c.border }}>
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full transition-colors"
                        style={{ color: c.textSecondary }}>
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold" style={{ color: c.text }}>{t('mortgage.title')}</h1>
                    <p className="text-xs" style={{ color: c.textSecondary }}>{t('mortgage.subtitle')}</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-6">
                
                {/* 1. INPUTS SECTION */}
                <div className="p-5 rounded-2xl border shadow-sm space-y-6" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: c.border }}>
                        <Home className="w-5 h-5" style={{ color: '#10B981' }} />
                        <h2 className="font-semibold text-lg">{t('mortgage.propertyLoanDetails')}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <NumberInput
                            label={t('mortgage.propertyValue')}
                            value={propertyValue}
                            onChange={setPropertyValue}
                            min={100000}
                            max={500000000}
                            step={100000}
                            prefix="₹"
                        />
                        <NumberInput
                            label={t('mortgage.downPayment')}
                            value={downPayment}
                            onChange={setDownPayment}
                            min={0}
                            max={propertyValue}
                            step={100000}
                            prefix="₹"
                        />
                    </div>
                    
                    <div className="p-4 rounded-xl flex flex-wrap justify-between items-center gap-4" style={{ backgroundColor: c.bg }}>
                        <div>
                            <p className="text-sm font-medium" style={{ color: c.textSecondary }}>{t('mortgage.loanAmount')}</p>
                            <p className="text-2xl font-bold" style={{ color: c.text }}>{formatINR(loanAmount)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium" style={{ color: c.textSecondary }}>{t('mortgage.ltvLoanToValue')}</p>
                            <p className={`text-xl font-bold ${ltv > maxLtv ? 'text-red-500' : 'text-emerald-500'}`}>
                                {ltv.toFixed(1)}%
                            </p>
                            {ltv > maxLtv && <p className="text-xs mt-1 text-red-500">{t('mortgage.rbiMax', { maxLtv })}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <NumberInput
                            label={t('mortgage.interestRate')}
                            value={interestRate}
                            onChange={setInterestRate}
                            min={4}
                            max={20}
                            step={0.1}
                            suffix="%"
                            helperText="Typical range 8.5-9.5% (Apr 2026)"
                        />
                        <NumberInput
                            label={t('mortgage.tenureYears')}
                            value={tenureYears}
                            onChange={setTenureYears}
                            min={1}
                            max={30}
                            step={1}
                            suffix="Yr"
                        />
                    </div>
                    
                    <NumberInput
                        label={t('mortgage.netMonthlyIncome')}
                        value={monthlyIncome}
                        onChange={setMonthlyIncome}
                        min={0}
                        max={10000000}
                        step={10000}
                        prefix="₹"
                        helperText={t('mortgage.affordabilityHelper')}
                    />

                    {/* Loan Rate Type */}
                    <div>
                        <p className="text-sm font-medium mb-2" style={{ color: c.textSecondary }}>{t('mortgage.loanRateType')}</p>
                        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: c.border }}>
                            <button onClick={() => { setLoanRateType('floating'); setFcRateType('floating'); setFcChargePercent(0); }}
                                className="flex-1 py-2.5 text-sm font-medium transition-colors"
                                style={{ backgroundColor: loanRateType === 'floating' ? '#10B981' : 'transparent', color: loanRateType === 'floating' ? '#fff' : c.textSecondary }}>
                                {t('mortgage.floatingRate')}
                            </button>
                            <button onClick={() => { setLoanRateType('fixed'); setFcRateType('fixed'); setFcChargePercent(2); }}
                                className="flex-1 py-2.5 text-sm font-medium transition-colors border-l"
                                style={{ borderColor: c.border, backgroundColor: loanRateType === 'fixed' ? '#F59E0B' : 'transparent', color: loanRateType === 'fixed' ? '#fff' : c.textSecondary }}>
                                {t('mortgage.fixedRate')}
                            </button>
                        </div>
                        {loanRateType === 'floating' && (
                            <p className="text-xs mt-2" style={{ color: c.textSecondary }}>
                                {t('mortgage.floatingRateDesc')}
                            </p>
                        )}
                    </div>

                    {/* Loan Purpose */}
                    <div>
                        <p className="text-sm font-medium mb-2" style={{ color: c.textSecondary }}>{t('mortgage.loanPurpose')}</p>
                        <div className="flex gap-2 flex-wrap">
                            {([
                                { id: 'home' as const, label: t('mortgage.purposeHome') },
                                { id: 'plot' as const, label: t('mortgage.purposePlot') },
                                { id: 'renovation' as const, label: t('mortgage.purposeRenovation') },
                            ]).map(opt => (
                                <button key={opt.id} onClick={() => setLoanPurpose(opt.id)}
                                    className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all border"
                                    style={{
                                        backgroundColor: loanPurpose === opt.id ? '#3B82F6' : 'transparent',
                                        color: loanPurpose === opt.id ? '#fff' : c.textSecondary,
                                        borderColor: loanPurpose === opt.id ? '#3B82F6' : c.border,
                                    }}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* True Cost Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <NumberInput label={t('mortgage.processingFee')} value={processingFee} onChange={setProcessingFee}
                            min={0} max={1000000} step={1000} prefix="₹" helperText={t('mortgage.processingFeeHelper')} />
                        <NumberInput label={t('mortgage.loanInsurance')} value={insurancePremium} onChange={setInsurancePremium}
                            min={0} max={5000000} step={1000} prefix="₹" helperText={t('mortgage.loanInsuranceHelper')} />
                        <NumberInput label={t('mortgage.preEmiInterest')} value={preEmiInterest} onChange={setPreEmiInterest}
                            min={0} max={5000000} step={1000} prefix="₹" helperText={t('mortgage.preEmiInterestHelper')} />
                    </div>

                </div>

                {/* 2. AFFORDABILITY & INSIGHTS */}
                <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                        <h2 className="font-semibold text-lg">{t('mortgage.affordabilityAnalysis')}</h2>
                    </div>
                    
                    {(() => {
                        const emiRatio = monthlyIncome > 0 ? (result.originalEmi / monthlyIncome) * 100 : 0;
                        let statusColor = '#10B981'; // Emerald
                        let icon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
                        let message = t('mortgage.emiSafe');

                        if (emiRatio > 50) {
                            statusColor = '#EF4444'; // Red
                            icon = <AlertTriangle className="w-5 h-5 text-red-500" />;
                            message = t('mortgage.emiDanger');
                        } else if (emiRatio > 40) {
                            statusColor = '#F59E0B'; // Amber
                            icon = <AlertTriangle className="w-5 h-5 text-amber-500" />;
                            message = t('mortgage.emiCaution');
                        }

                        return monthlyIncome === 0 ? (
                            <p className="text-sm italic" style={{ color: c.textSecondary }}>{t('mortgage.enterIncomeForInsights')}</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: `${statusColor}1A` }}>
                                    {icon}
                                    <div>
                                        <p className="font-semibold" style={{ color: statusColor }}>{t('mortgage.emiToIncomeRatio')}: {emiRatio.toFixed(1)}%</p>
                                        <p className="text-sm mt-1" style={{ color: c.textSecondary }}>{message}</p>
                                    </div>
                                </div>
                                <div className="h-2 w-full rounded-full overflow-hidden flex" style={{ backgroundColor: c.border }}>
                                    <div className="h-full transition-all duration-500" style={{ width: `${Math.min(emiRatio, 100)}%`, backgroundColor: statusColor }} />
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* 3. PREPAYMENT ENGINE */}
                <div className="p-5 rounded-2xl border shadow-sm space-y-4" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calculator className="w-5 h-5" style={{ color: '#10B981' }} />
                            <h2 className="font-semibold text-lg">{t('mortgage.smartPrepaymentEngine')}</h2>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={enablePrepayment} onChange={(e) => setEnablePrepayment(e.target.checked)} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    <AnimatePresence>
                        {enablePrepayment && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-5 pt-4 border-t"
                                style={{ borderColor: c.border }}
                            >
                                {/* Strategy Selector */}
                                <div>
                                    <p className="text-sm font-medium mb-3">{t('mortgage.prepaymentStrategy')}</p>
                                    <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: c.border }}>
                                        <button
                                            onClick={() => setPrepaymentMode('reduce_tenure')}
                                            className="flex-1 py-2 text-sm font-medium transition-colors"
                                            style={{
                                                backgroundColor: prepaymentMode === 'reduce_tenure' ? '#10B981' : 'transparent',
                                                color: prepaymentMode === 'reduce_tenure' ? '#fff' : c.textSecondary
                                            }}
                                        >
                                            {t('mortgage.reduceTenure')}
                                        </button>
                                        <button
                                            onClick={() => setPrepaymentMode('reduce_emi')}
                                            className="flex-1 py-2 text-sm font-medium transition-colors border-l"
                                            style={{
                                                borderColor: c.border,
                                                backgroundColor: prepaymentMode === 'reduce_emi' ? '#10B981' : 'transparent',
                                                color: prepaymentMode === 'reduce_emi' ? '#fff' : c.textSecondary
                                            }}
                                        >
                                            {t('mortgage.reduceEMI')}
                                        </button>
                                    </div>
                                    <p className="text-xs mt-2" style={{ color: c.textSecondary }}>
                                        {prepaymentMode === 'reduce_tenure'
                                            ? t('mortgage.reduceTenureDesc')
                                            : t('mortgage.reduceEMIDesc')}
                                    </p>
                                </div>

                                {/* Monthly Extra EMI */}
                                <div>
                                    <NumberInput
                                        label={t('mortgage.monthlyExtraEMI')}
                                        value={monthlyExtraEMI}
                                        onChange={setMonthlyExtraEMI}
                                        min={0}
                                        max={loanAmount}
                                        step={1000}
                                        prefix="₹"
                                        helperText={t('mortgage.monthlyExtraEMIHelper')}
                                    />
                                </div>

                                {/* Lump Sums */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-sm font-medium">{t('mortgage.lumpSumPrepayments')}</p>
                                        <button onClick={addLumpSum} className="text-xs flex items-center gap-1 text-emerald-500 font-medium px-2 py-1 rounded hover:bg-emerald-500/10 transition-colors">
                                            <Plus className="w-3 h-3" /> {t('mortgage.add')}
                                        </button>
                                    </div>
                                    
                                    {lumpSums.length === 0 ? (
                                        <p className="text-xs italic" style={{ color: c.textSecondary }}>{t('mortgage.noLumpSumScheduled')}</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {lumpSums.map((ls, idx) => (
                                                <div key={ls.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: c.border, backgroundColor: c.bg }}>
                                                    <div className="w-20">
                                                        <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: c.textSecondary }}>{t('mortgage.month')}</label>
                                                        <input
                                                            type="number"
                                                            value={ls.month}
                                                            onChange={(e) => updateLumpSum(ls.id, 'month', Math.max(1, parseInt(e.target.value) || 1))}
                                                            className="w-full bg-transparent outline-none font-medium text-sm border-b focus:border-emerald-500 transition-colors"
                                                            style={{ color: c.text, borderColor: c.border }}
                                                            min={1}
                                                            max={months}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: c.textSecondary }}>{t('mortgage.amount')}</label>
                                                        <input
                                                            type="number"
                                                            value={ls.amount}
                                                            onChange={(e) => updateLumpSum(ls.id, 'amount', parseInt(e.target.value) || 0)}
                                                            className="w-full bg-transparent outline-none font-medium text-sm border-b focus:border-emerald-500 transition-colors"
                                                            style={{ color: c.text, borderColor: c.border }}
                                                            min={0}
                                                        />
                                                    </div>
                                                    <button onClick={() => removeLumpSum(ls.id)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* CIBIL Badge — links to profile, shows saved score & rate hint */}
                <CibilBadge loanType="home_loan" />

                {/* 4. RESULTS SECTION */}
                <div className="p-5 rounded-2xl shadow-sm text-white relative overflow-hidden"
                     style={{ background: `linear-gradient(135deg, #10B981, #059669)` }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <IndianRupee className="w-32 h-32" />
                    </div>
                    
                    <div className="relative z-10 grid grid-cols-2 gap-y-6">
                        <div className="col-span-2">
                            <p className="text-emerald-100 text-sm font-medium">{t('mortgage.baseMonthlyEMI')}</p>
                            <p className="text-4xl font-bold mt-1 tracking-tight">
                                {formatINR(result.originalEmi)}
                            </p>
                            {enablePrepayment && result.emi !== result.originalEmi && (
                                <p className="text-sm mt-1 text-emerald-200">
                                    {t('mortgage.currentEffectiveEMI')}: {formatINR(result.emi)}
                                </p>
                            )}
                        </div>

                        <div>
                            <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">{t('mortgage.totalInterest')}</p>
                            {preEmiInterest > 0 ? (
                                <div>
                                    <p className="text-xl font-bold mt-1">{formatINR(result.totalInterest + preEmiInterest)}</p>
                                    <p className="text-emerald-200/70 text-[10px] mt-0.5">
                                        {t('mortgage.emiLabel')}: {formatINRShort(result.totalInterest)} + {t('mortgage.preEmiLabel')}: {formatINRShort(preEmiInterest)}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xl font-bold mt-1">{formatINR(result.totalInterest)}</p>
                            )}
                        </div>

                        <div>
                            <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">{t('mortgage.totalPayment')}</p>
                            <p className="text-xl font-bold mt-1">{formatINR(result.totalPayment + preEmiInterest)}</p>
                        </div>
                    </div>
                </div>

                {/* Export Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadPDF}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border font-bold text-sm"
                        style={{ backgroundColor: c.card, borderColor: c.border, color: c.textSecondary }}>
                        <FileText size={18} className="text-violet-500" /> {t('mortgage.exportPDF')}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadExcel}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border font-bold text-sm"
                        style={{ backgroundColor: c.card, borderColor: c.border, color: c.textSecondary }}>
                        <Download size={18} className="text-emerald-500" /> {t('mortgage.exportExcel')}
                    </motion.button>
                </div>

                {/* Save / Remove Button */}
                {saved ? (
                    <div className="flex gap-2">
                        <div className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2" style={{ backgroundColor: '#10B98115', color: '#10B981', border: '1px solid #10B98130' }}>
                            <Check size={16} /> {t('mortgage.saved')}
                        </div>
                        <button onClick={handleRemove} className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2" style={{ backgroundColor: '#EF444415', color: '#EF4444', border: '1px solid #EF444430' }}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                ) : (
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg">
                        <Save size={16} /> {t('mortgage.saveCalculation')}
                    </motion.button>
                )}

                {/* Savings Banner */}
                {enablePrepayment && (result.interestSaved > 0 || result.timeSavedMonths > 0) && (
                    <div className="p-4 rounded-xl border flex flex-col md:flex-row gap-4 items-start md:items-center justify-between" 
                         style={{ backgroundColor: c.card, borderColor: '#10B981', borderLeftWidth: '4px' }}>
                        <div>
                            <h3 className="font-bold text-lg" style={{ color: c.text }}>{t('mortgage.prepaymentImpact')}</h3>
                            <p className="text-sm mt-1" style={{ color: c.textSecondary }}>{t('mortgage.prepaymentImpactDesc')}</p>
                        </div>
                        <div className="flex gap-4 text-right">
                            {result.interestSaved > 0 && (
                                <div>
                                    <p className="text-xs uppercase font-bold" style={{ color: c.textSecondary }}>{t('mortgage.interestSaved')}</p>
                                    <p className="text-emerald-500 font-bold text-xl">{formatINR(result.interestSaved)}</p>
                                </div>
                            )}
                            {result.timeSavedMonths > 0 && (
                                <div>
                                    <p className="text-xs uppercase font-bold" style={{ color: c.textSecondary }}>{t('mortgage.timeSaved')}</p>
                                    <p className="text-emerald-500 font-bold text-xl">
                                        {Math.floor(result.timeSavedMonths / 12)}y {result.timeSavedMonths % 12}m
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TRUE COST OF LOAN */}
                {trueCost.extras > 0 && (
                    <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <div className="flex items-center gap-2 mb-4">
                            <IndianRupee className="w-5 h-5" style={{ color: '#EF4444' }} />
                            <h2 className="font-semibold text-lg">{t('mortgage.trueCostOfLoan')}</h2>
                        </div>
                        <div className="space-y-2">
                            {[
                                { label: t('mortgage.loanAmount'), value: formatINR(loanAmount), bold: false },
                                ...(insurancePremium > 0 ? [{ label: `+ ${t('mortgage.loanInsurance')}`, value: formatINR(insurancePremium), bold: false }] : []),
                                ...(processingFee > 0 ? [{ label: `+ ${t('mortgage.processingFee')}`, value: formatINR(processingFee), bold: false }] : []),
                                ...(preEmiInterest > 0 ? [{ label: `+ ${t('mortgage.preEmiInterest')}`, value: formatINR(preEmiInterest), bold: false }] : []),
                                { label: `+ ${t('mortgage.totalEMIInterest')}`, value: formatINR(trueCost.totalEmiInterest), bold: false },
                            ].map(row => (
                                <div key={row.label} className="flex justify-between items-center py-1">
                                    <span className="text-sm" style={{ color: c.textSecondary }}>{row.label}</span>
                                    <span className="text-sm font-medium" style={{ color: c.text }}>{row.value}</span>
                                </div>
                            ))}
                            <div className="border-t pt-3 mt-2" style={{ borderColor: c.border }}>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold" style={{ color: c.text }}>{t('mortgage.totalAmountYouPay')}</span>
                                    <span className="text-lg font-bold text-red-500">{formatINR(trueCost.totalAmountPaid)}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs" style={{ color: c.textSecondary }}>{t('mortgage.costOverLoanAmount')}</span>
                                    <span className="text-xs font-bold text-red-500">
                                        {formatINR(trueCost.costOverLoan)} (+{trueCost.costPercent.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. VISUALIZATION */}
                <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <h2 className="font-semibold text-lg mb-4 text-center">{t('mortgage.principalVsInterest')}</h2>
                    <div className="h-64 relative">
                        <Pie data={chartData} options={chartOptions} />
                    </div>
                </div>

                {/* 6. TAX BENEFITS */}
                <div className="p-5 rounded-2xl border shadow-sm space-y-4" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5" style={{ color: '#10B981' }} />
                        <h2 className="font-semibold text-lg">{t('mortgage.incomeTaxBenefits')}</h2>
                    </div>
                    <p className="text-sm" style={{ color: c.textSecondary }}>
                        {t('mortgage.taxBenefitsDesc')}
                    </p>

                    {/* Plot Loan Tax Warning */}
                    {loanPurpose === 'plot' && (
                        <div className="p-4 rounded-xl border border-amber-500/30" style={{ backgroundColor: '#F59E0B15' }}>
                            <div className="flex items-start gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{t('mortgage.plotLoanTitle')}</p>
                            </div>
                            <div className="space-y-2 text-xs leading-relaxed" style={{ color: c.textSecondary }}>
                                <p>{t('mortgage.plotLoanSec24')}</p>
                                <p>{t('mortgage.plotLoanPreConstruction')}</p>
                                <p>{t('mortgage.plotLoanSec80C')}</p>
                                <p className="font-semibold text-amber-600 dark:text-amber-400">{t('mortgage.plotLoanConsultCA')}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-4 rounded-xl border" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: c.textSecondary }}>{t('mortgage.sec80CPrincipal')}</p>
                            <p className="text-2xl font-bold text-emerald-500">{formatINRShort(result.taxBenefits.total80C)}</p>
                            <div className="flex items-center gap-1 mt-1">
                                <p className="text-xs" style={{ color: c.textSecondary }}>{t('mortgage.totalPotentialClaim')}</p>
                                {loanPurpose === 'plot' && (
                                    <span className="text-[9px] text-amber-500 font-bold">*</span>
                                )}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl border" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: c.textSecondary }}>{t('mortgage.sec24Interest')}</p>
                            <p className="text-2xl font-bold text-amber-500">{formatINRShort(result.taxBenefits.total24)}</p>
                            <div className="flex items-center gap-1 mt-1">
                                <p className="text-xs" style={{ color: c.textSecondary }}>{t('mortgage.totalPotentialClaim')}</p>
                                {loanPurpose === 'plot' && (
                                    <span className="text-[9px] text-amber-500 font-bold">*</span>
                                )}
                            </div>
                        </div>
                        {loanPurpose === 'plot' && (
                            <p className="col-span-2 text-[10px] text-amber-500 font-medium">* {t('mortgage.plotLoanDisclaimer')}</p>
                        )}
                    </div>
                </div>

                {/* 7. AMORTIZATION SCHEDULE */}
                <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <button 
                        onClick={() => setShowAmortization(!showAmortization)}
                        className="w-full flex items-center justify-between font-semibold text-lg"
                        style={{ color: c.text }}
                    >
                        {t('mortgage.amortizationSchedule')}
                        {showAmortization ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    <AnimatePresence>
                        {showAmortization && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 overflow-hidden"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right text-sm">
                                        <thead>
                                            <tr className="border-b" style={{ borderColor: c.border, color: c.textSecondary }}>
                                                <th className="py-3 px-2 text-center font-medium">{t('mortgage.month')}</th>
                                                <th className="py-3 px-2 font-medium hidden sm:table-cell">{t('mortgage.opening')}</th>
                                                <th className="py-3 px-2 font-medium">{t('mortgage.payment')}</th>
                                                <th className="py-3 px-2 font-medium">{t('mortgage.interest')}</th>
                                                <th className="py-3 px-2 font-medium">{t('mortgage.principal')}</th>
                                                <th className="py-3 px-2 font-medium">{t('mortgage.balance')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pagedSchedule.map((row) => (
                                                <tr key={row.month} className="border-b border-opacity-50" style={{ borderColor: c.border, color: c.text }}>
                                                    <td className="py-3 px-2 text-center font-medium">{row.month}</td>
                                                    <td className="py-3 px-2 hidden sm:table-cell" style={{ color: c.textSecondary }}>{formatINR(row.openingBalance)}</td>
                                                    <td className="py-3 px-2 font-medium text-emerald-500">{formatINR(row.emi)}</td>
                                                    <td className="py-3 px-2 text-amber-500">{formatINR(row.interest)}</td>
                                                    <td className="py-3 px-2 text-blue-500">{formatINR(row.principal)}</td>
                                                    <td className="py-3 px-2 font-medium">{formatINR(row.closingBalance)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-4 mt-6">
                                        <button
                                            onClick={() => setAmortPage(p => Math.max(0, p - 1))}
                                            disabled={amortPage === 0}
                                            className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                                            style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                                        >
                                            ← {t('mortgage.prev')}
                                        </button>
                                        <span className="text-sm font-medium" style={{ color: c.textSecondary }}>
                                            {t('mortgage.yr')} {amortPage * 2 + 1}–{Math.min((amortPage + 1) * 2, Math.ceil(result.schedule.length / 12))} {t('mortgage.of')} {Math.ceil(result.schedule.length / 12)}
                                        </span>
                                        <button
                                            onClick={() => setAmortPage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={amortPage === totalPages - 1}
                                            className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                                            style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                                        >
                                            {t('mortgage.next')} →
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* 8. FORECLOSURE SIMULATOR */}
                <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <button onClick={() => setShowForeclosure(!showForeclosure)}
                        className="w-full flex items-center justify-between font-semibold text-lg" style={{ color: c.text }}>
                        <div className="flex items-center gap-2">
                            <TrendingDown className="w-5 h-5" style={{ color: '#EF4444' }} />
                            {t('mortgage.foreclosureSimulator')}
                        </div>
                        {showForeclosure ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    <AnimatePresence>
                        {showForeclosure && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }} className="mt-4 space-y-4 overflow-hidden">

                                <div className="p-3 rounded-xl" style={{ backgroundColor: `${c.bg}`, border: `1px solid ${c.border}` }}>
                                    <p className="text-xs font-medium mb-1" style={{ color: '#10B981' }}>{t('mortgage.rbiRule')}</p>
                                    <p className="text-xs" style={{ color: c.textSecondary }}>
                                        {t('mortgage.rbiRuleDesc')}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <NumberInput label={t('mortgage.monthsAlreadyPaid')} value={fcMonths}
                                        onChange={v => setFcMonths(Math.min(v, result.schedule.length - 1))}
                                        min={1} max={result.schedule.length - 1} suffix=" mo" />
                                    <div>
                                        <p className="text-xs font-medium mb-2" style={{ color: c.textSecondary }}>{t('mortgage.rateType')}</p>
                                        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: c.border }}>
                                            <button onClick={() => { setFcRateType('floating'); setFcChargePercent(0); }}
                                                className="flex-1 py-2 text-xs font-medium transition-colors"
                                                style={{ backgroundColor: fcRateType === 'floating' ? '#10B981' : 'transparent',
                                                    color: fcRateType === 'floating' ? '#fff' : c.textSecondary }}>
                                                {t('mortgage.floating')}
                                            </button>
                                            <button onClick={() => { setFcRateType('fixed'); setFcChargePercent(2); }}
                                                className="flex-1 py-2 text-xs font-medium transition-colors border-l"
                                                style={{ borderColor: c.border,
                                                    backgroundColor: fcRateType === 'fixed' ? '#F59E0B' : 'transparent',
                                                    color: fcRateType === 'fixed' ? '#fff' : c.textSecondary }}>
                                                {t('mortgage.fixed')}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {fcRateType === 'fixed' && (
                                    <NumberInput label={t('mortgage.foreclosureCharge')} value={fcChargePercent}
                                        onChange={setFcChargePercent} min={0} max={5} step={0.5} suffix="%" />
                                )}

                                {fcResult && (
                                    <div className="space-y-3">
                                        <div className="p-3 rounded-xl" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs" style={{ color: c.textSecondary }}>{t('mortgage.emisPaid')} ({fcMonths} {t('mortgage.mo')} × {formatINR(result.originalEmi)})</span>
                                                <span className="text-xs font-bold" style={{ color: c.text }}>{formatINR(fcResult.emisPaid)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs" style={{ color: c.textSecondary }}>{t('mortgage.interestPaidSoFar')}</span>
                                                <span className="text-xs font-bold text-amber-500">{formatINR(fcResult.intPaid)}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { label: t('mortgage.outstandingPrincipal'), value: formatINR(fcResult.outstanding), cls: '' },
                                                { label: t('mortgage.foreclosureChargeLabel'), value: fcRateType === 'floating' ? t('mortgage.nilRBI') : formatINR(fcResult.charge), cls: 'text-red-500' },
                                                { label: t('mortgage.interestYouSkip'), value: formatINR(fcResult.intSaved), cls: 'text-emerald-500' },
                                                { label: t('mortgage.netBenefit'), value: formatINR(fcResult.netBenefit), cls: 'text-emerald-500' },
                                            ].map(item => (
                                                <div key={item.label} className="p-3 rounded-xl text-center" style={{ backgroundColor: c.bg }}>
                                                    <p className="text-[9px] uppercase font-bold mb-1" style={{ color: c.textSecondary }}>{item.label}</p>
                                                    <p className={`text-xs font-bold ${item.cls}`} style={!item.cls ? { color: c.text } : undefined}>{item.value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-4 rounded-xl text-center" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                                            <p className="text-emerald-100 text-[10px] uppercase font-bold tracking-wider mb-1">{t('mortgage.payBankTodayToClose')}</p>
                                            <p className="text-2xl font-bold text-white">{formatINR(fcResult.settlement)}</p>
                                        </div>

                                        <div className="p-3 rounded-xl" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
                                            <p className="text-[10px] uppercase font-bold mb-2" style={{ color: c.textSecondary }}>{t('mortgage.totalCostComparison')}</p>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs" style={{ color: c.textSecondary }}>{t('mortgage.closeToday')}</span>
                                                <span className="text-xs font-bold" style={{ color: c.text }}>{formatINR(fcResult.totalCostClose)}</span>
                                            </div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs" style={{ color: c.textSecondary }}>{t('mortgage.continueFullTerm')}</span>
                                                <span className="text-xs font-bold" style={{ color: c.text }}>{formatINR(fcResult.totalCostFull)}</span>
                                            </div>
                                            <div className="border-t pt-2 flex justify-between items-center" style={{ borderColor: c.border }}>
                                                <span className="text-xs font-bold text-emerald-500">{t('mortgage.youSave')}</span>
                                                <span className="text-sm font-bold text-emerald-500">{formatINR(fcResult.saving)}</span>
                                            </div>
                                        </div>

                                        {/* Yearly Foreclosure Timeline */}
                                        {fcTimeline.length > 1 && (
                                            <div className="rounded-xl overflow-hidden border" style={{ borderColor: c.border }}>
                                                <p className="text-[10px] uppercase font-bold p-3 pb-1" style={{ color: c.textSecondary }}>
                                                    {t('mortgage.optimalForeclosureTimeline')}
                                                </p>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-right text-[11px]">
                                                        <thead>
                                                            <tr style={{ borderBottom: `1px solid ${c.border}`, color: c.textSecondary }}>
                                                                <th className="py-2 px-2 text-center font-medium text-[10px]">{t('mortgage.year')}</th>
                                                                <th className="py-2 px-2 font-medium text-[10px]">{t('mortgage.outstanding')}</th>
                                                                <th className="py-2 px-2 font-medium text-[10px]">{t('mortgage.settlement')}</th>
                                                                <th className="py-2 px-2 font-medium text-[10px]">{t('mortgage.youSave')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {fcTimeline.map(t => {
                                                                const bestYear = fcTimeline.reduce((a, b) => b.saving > a.saving ? b : a).year;
                                                                const isBest = t.year === bestYear;
                                                                return (
                                                                    <tr key={t.year} style={{
                                                                        borderBottom: `1px solid ${c.border}`,
                                                                        color: c.text,
                                                                        backgroundColor: isBest ? '#10B98115' : 'transparent',
                                                                    }}>
                                                                        <td className="py-2 px-2 text-center font-medium">
                                                                            {t.year}{isBest && <span className="text-emerald-500 text-[8px] ml-0.5">★</span>}
                                                                        </td>
                                                                        <td className="py-2 px-2">{formatINRShort(t.outstanding)}</td>
                                                                        <td className="py-2 px-2">{formatINRShort(t.settlement)}</td>
                                                                        <td className="py-2 px-2 font-bold text-emerald-500">{formatINRShort(t.saving)}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <p className="text-[9px] p-2 text-center" style={{ color: c.textSecondary }}>
                                                    {t('mortgage.bestYearNote')}
                                                </p>
                                            </div>
                                        )}

                                        {/* Foreclosure Export Buttons */}
                                        <div className="grid grid-cols-2 gap-2 pt-2">
                                            <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadPDF}
                                                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border font-bold text-xs"
                                                style={{ backgroundColor: c.card, borderColor: c.border, color: c.textSecondary }}>
                                                <FileText size={14} className="text-violet-500" /> {t('mortgage.exportPDF')}
                                            </motion.button>
                                            <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadExcel}
                                                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border font-bold text-xs"
                                                style={{ backgroundColor: c.card, borderColor: c.border, color: c.textSecondary }}>
                                                <Download size={14} className="text-emerald-500" /> {t('mortgage.exportExcel')}
                                            </motion.button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 9. WHAT-IF SIMULATOR */}
                <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <button onClick={() => { setShowWhatIf(!showWhatIf); if (!showWhatIf) { setWiRate(interestRate); setWiTenure(tenureYears); } }}
                        className="w-full flex items-center justify-between font-semibold text-lg" style={{ color: c.text }}>
                        <div className="flex items-center gap-2">
                            <Sliders className="w-5 h-5" style={{ color: '#3B82F6' }} />
                            {t('mortgage.whatIfSimulator')}
                        </div>
                        {showWhatIf ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    <AnimatePresence>
                        {showWhatIf && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }} className="mt-4 space-y-4 overflow-hidden">

                                <p className="text-xs" style={{ color: c.textSecondary }}>
                                    {t('mortgage.whatIfDesc')}
                                </p>

                                <div className="grid grid-cols-2 gap-3">
                                    <NumberInput label={t('mortgage.newInterestRate')} value={wiRate}
                                        onChange={setWiRate} min={4} max={20} step={0.1} suffix="%" />
                                    <NumberInput label={t('mortgage.newTenureYears')} value={wiTenure}
                                        onChange={setWiTenure} min={1} max={30} step={1} suffix="Yr" />
                                </div>

                                {wiResult && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { label: t('mortgage.emiChange'), current: formatINR(result.originalEmi), newVal: formatINR(wiResult.emi), diff: wiResult.emiDiff },
                                                { label: t('mortgage.interestChange'), current: formatINR(result.totalInterest), newVal: formatINR(wiResult.totalInterest), diff: wiResult.interestDiff },
                                                { label: t('mortgage.totalChange'), current: formatINR(result.totalPayment), newVal: formatINR(wiResult.totalPayment), diff: wiResult.paymentDiff },
                                            ].map(item => (
                                                <div key={item.label} className="p-3 rounded-xl text-center" style={{ backgroundColor: c.bg }}>
                                                    <p className="text-[8px] uppercase font-bold mb-1" style={{ color: c.textSecondary }}>{item.label}</p>
                                                    <p className="text-[10px]" style={{ color: c.textSecondary }}>{item.current}</p>
                                                    <p className="text-xs font-bold" style={{ color: c.text }}>{item.newVal}</p>
                                                    <p className={`text-[10px] font-bold mt-1 ${item.diff < 0 ? 'text-emerald-500' : item.diff > 0 ? 'text-red-500' : ''}`}
                                                        style={item.diff === 0 ? { color: c.textSecondary } : undefined}>
                                                        {item.diff > 0 ? '+' : ''}{formatINR(item.diff)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        {wiResult.interestDiff !== 0 && (
                                            <div className={`p-3 rounded-xl border text-center ${wiResult.interestDiff < 0
                                                ? 'border-emerald-500/30'
                                                : 'border-red-500/30'}`}
                                                style={{ backgroundColor: wiResult.interestDiff < 0 ? '#10B98115' : '#EF444415' }}>
                                                <p className={`text-sm font-bold ${wiResult.interestDiff < 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {wiResult.interestDiff < 0
                                                        ? t('mortgage.youSaveInInterest', { amount: formatINR(Math.abs(wiResult.interestDiff)) })
                                                        : t('mortgage.youPayMoreInInterest', { amount: formatINR(wiResult.interestDiff) })}
                                                </p>
                                                <p className="text-xs mt-1" style={{ color: c.textSecondary }}>
                                                    {t('mortgage.emiLabel')} {wiResult.emiDiff < 0 ? t('mortgage.decreases') : t('mortgage.increases')} {t('mortgage.by')} {formatINR(Math.abs(wiResult.emiDiff))}/{t('mortgage.month')}
                                                </p>
                                            </div>
                                        )}

                                        {(wiRate < interestRate) && (
                                            <div className="p-3 rounded-xl" style={{ backgroundColor: '#3B82F615', border: '1px solid #3B82F630' }}>
                                                <p className="text-xs font-bold" style={{ color: '#3B82F6' }}>{t('mortgage.balanceTransferTip')}</p>
                                                <p className="text-xs mt-1" style={{ color: c.textSecondary }}>
                                                    {t('mortgage.balanceTransferDesc', { rate: wiRate, savings: formatINR(Math.abs(wiResult.interestDiff)) })}
                                                </p>
                                            </div>
                                        )}

                                        {/* What-If Export Buttons */}
                                        <div className="grid grid-cols-2 gap-2 pt-2">
                                            <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadPDF}
                                                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border font-bold text-xs"
                                                style={{ backgroundColor: c.card, borderColor: c.border, color: c.textSecondary }}>
                                                <FileText size={14} className="text-violet-500" /> {t('mortgage.exportPDF')}
                                            </motion.button>
                                            <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadExcel}
                                                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border font-bold text-xs"
                                                style={{ backgroundColor: c.card, borderColor: c.border, color: c.textSecondary }}>
                                                <Download size={14} className="text-emerald-500" /> {t('mortgage.exportExcel')}
                                            </motion.button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Live Loan Tracker ──────────────────────────── */}
                <div className="p-5 rounded-2xl border shadow-sm space-y-4" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">📍</span>
                        <div>
                            <h3 className="font-semibold text-sm" style={{ color: c.text }}>{t('mortgage.liveTracker')}</h3>
                            <p className="text-[10px]" style={{ color: c.textSecondary }}>{t('mortgage.liveTrackerDesc')}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-medium mb-1.5" style={{ color: c.textSecondary }}>{t('mortgage.disbursementDate')}</p>
                        <DateInput value={loanStartDate} onChange={setLoanStartDate} />
                    </div>
                    {loanStartDate && (
                        <div>
                            <p className="text-xs font-medium mb-1.5" style={{ color: c.textSecondary }}>{t('mortgage.emiDueDay')}</p>
                            <div className="flex gap-2 flex-wrap">
                                {[1, 5, 7, 10, 15].map(day => (
                                    <button key={day} onClick={() => setEmiDueDay(day)}
                                        className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all border"
                                        style={{
                                            backgroundColor: emiDueDay === day ? '#3B82F6' : 'transparent',
                                            color: emiDueDay === day ? '#fff' : c.textSecondary,
                                            borderColor: emiDueDay === day ? '#3B82F6' : c.border,
                                        }}>
                                        {day}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] mt-1" style={{ color: c.textSecondary }}>{t('mortgage.emiDueDayHint')}</p>
                        </div>
                    )}
                </div>

                {loanProfile && <LiveLoanStatus profile={loanProfile} />}

                {/* CIBIL Score Advisory — rate band, approval status, savings potential */}
                <div className="mt-2">
                    <CibilAdvisoryCard score={cibilScore} loanType="home_loan" loanAmount={loanAmount} tenureMonths={months} />
                </div>

                <DisclaimerComponent module="mortgage" />

                {/* Spacer so content is not hidden behind safe navigation */}
                <div className="h-6"></div>
            </div>
        </div>
    );
}
