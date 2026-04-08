import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Info, Share2, Save, Check, Trash2 } from 'lucide-react';
import { nativeShare } from '../utils/nativeShare';
import { motion } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DateInput from '../components/DateInput';
import LiveInvestmentTracker from '../components/LiveInvestmentTracker';
import SaveNameDialog from '../components/SaveNameDialog';
import DisclaimerComponent from '../components/DisclaimerComponent';

import { formatINR } from '../utils/calculations';
import { useAuthStore } from '../store/useAuthStore';
import { useLiveStatusStore } from '../store/useLiveStatusStore';
import { saveLoan as saveLoanToStorage, deleteLoan as deleteLoanFromStorage, generateLoanId, type SavedLoan } from '../utils/loanStorage';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import { AnalyticsService } from '../lib/analytics';

type Mode = 'flat' | 'simple' | 'compound';

// Payment frequency: how many months per period
// 1 = monthly, 3 = quarterly, 6 = half-yearly, 12 = yearly
type FrequencyMonths = 1 | 3 | 6 | 12;

interface PeriodRow {
    period: number;
    dueDate: string;
    interest: number;
    cumulative: number;
}

function buildPeriodTable(
    principal: number,
    monthlyInterest: number,
    startDate: Date,
    tenure: number,
    freqMonths: FrequencyMonths
): PeriodRow[] {
    const rows: PeriodRow[] = [];
    let cumulative = 0;
    const totalPeriods = Math.ceil(tenure / freqMonths);
    let months = new Date(startDate);

    for (let p = 1; p <= totalPeriods; p++) {
        const monthsInPeriod = Math.min(freqMonths, tenure - (p - 1) * freqMonths);
        const interest = monthlyInterest * monthsInPeriod;
        cumulative += interest;
        months.setMonth(months.getMonth() + freqMonths);
        rows.push({
            period: p,
            dueDate: months.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            interest,
            cumulative,
        });
    }
    return rows;
}

export default function SimpleInterestCalculator() {
    const { t } = useTranslation();

    const FREQ_OPTIONS: { label: string; val: FrequencyMonths }[] = [
        { label: t('si.freqMonthly'), val: 1 },
        { label: t('si.freqQuarterly'), val: 3 },
        { label: t('si.freqHalfyearly'), val: 6 },
        { label: t('si.freqYearly'), val: 12 },
    ];

    const FREQ_LABEL: Record<FrequencyMonths, string> = {
        1: t('si.freqMonthly'),
        3: t('si.freqQuarterly'),
        6: t('si.freqHalfyearly'),
        12: t('si.freqYearly'),
    };
    useEffect(() => { AnalyticsService.trackScreen('Simple_Interest'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const [mode, setMode] = useState<Mode>('flat');
    const [principal, setPrincipal] = useState(100000);
    const [flatRate, setFlatRate] = useState(2); // ₹ per ₹100/month
    // Rural use-case: money borrowed from family / friends with no interest.
    // Only meaningful in flat mode — toggling it forces flatRate math to zero
    // so the user just sees a simple principal-only repayment plan.
    const [interestFree, setInterestFree] = useState(false);
    const [annualRate, setAnnualRate] = useState(12);
    const [tenure, setTenure] = useState(12); // months
    const [compoundFreq, setCompoundFreq] = useState(12); // monthly
    const [showInfo, setShowInfo] = useState(false);
    const [payFreq, setPayFreq] = useState<FrequencyMonths>(1); // payment frequency

    // Save-to-MyLoans state
    const addProfile = useLiveStatusStore(s => s.addProfile);
    const removeProfile = useLiveStatusStore(s => s.removeProfile);
    const [trackerSaved, setTrackerSaved] = useState(false);
    const [trackerSavedId, setTrackerSavedId] = useState<string | null>(null);
    const [loanStartDate, setLoanStartDate] = useState('');
    const [showNameDialog, setShowNameDialog] = useState(false);

    const result = useMemo(() => {
        if (mode === 'flat') {
            // Flat ₹ per ₹100 per month model — when interestFree is on,
            // the rural / family-loan case, we collapse the rate to zero so
            // the borrower just sees a clean principal-only repayment plan.
            const effectiveFlatRate = interestFree ? 0 : flatRate;
            const monthlyInterest = (principal / 100) * effectiveFlatRate;
            const equivalentMonthlyPct = effectiveFlatRate;
            const equivalentAnnualPct = equivalentMonthlyPct * 12;
            const totalInterest = monthlyInterest * tenure;
            const totalPayable = principal + totalInterest;
            return {
                mode: 'flat' as const,
                monthlyInterest,
                equivalentMonthlyPct,
                equivalentAnnualPct,
                totalInterest,
                totalPayable,
                principal,
            };
        } else if (mode === 'simple') {
            // SI = (P × R × T) / 100, where T is in years
            const tenureInYears = tenure / 12;
            const totalInterest = (principal * annualRate * tenureInYears) / 100;
            const totalAmount = principal + totalInterest;
            const monthlyEMI = totalAmount / tenure;
            const monthlyInterestOnly = totalInterest / tenure;
            return {
                mode: 'simple' as const,
                totalInterest,
                totalAmount,
                monthlyEMI,
                monthlyInterestOnly,
                principal,
                tenureInYears,
            };
        } else {
            // CI = P(1 + r/n)^(n×t) - P
            const tenureInYears = tenure / 12;
            const n = compoundFreq;
            const r = annualRate / 100;
            const amount = principal * Math.pow(1 + r / n, n * tenureInYears);
            const compoundInterest = amount - principal;
            const monthlyEMI = amount / tenure;
            return {
                mode: 'compound' as const,
                compoundInterest,
                totalPayable: amount,
                monthlyEMI,
                principal,
                tenureInYears,
            };
        }
    }, [mode, principal, flatRate, annualRate, tenure, compoundFreq, interestFree]);

    // Normalised values across the three modes for the tracker snapshot
    const trackerSnapshot = useMemo(() => {
        if (mode === 'flat') {
            const r = result as { totalInterest: number; totalPayable: number };
            return {
                interest: Math.round(r.totalInterest),
                totalPayable: Math.round(r.totalPayable),
                rateLabel: interestFree ? t('si.interestFree', 'Interest-free') : `₹${flatRate}/100/mo`,
            };
        }
        if (mode === 'simple') {
            const r = result as { totalInterest: number; totalAmount: number };
            return { interest: Math.round(r.totalInterest), totalPayable: Math.round(r.totalAmount), rateLabel: `${annualRate}%` };
        }
        const r = result as { compoundInterest: number; totalPayable: number };
        return { interest: Math.round(r.compoundInterest), totalPayable: Math.round(r.totalPayable), rateLabel: `${annualRate}% (cmpd)` };
    }, [mode, result, flatRate, annualRate, interestFree, t]);

    const suggestedName = `Simple Interest — ${formatINR(principal)} × ${tenure}M`;

    const handleTrackerSave = (customName: string) => {
        const id = generateLoanId();
        addProfile({
            id,
            name: customName,
            calculatorType: 'Simple Interest',
            profileData: {
                principal,
                loanAmount: principal,
                rate: mode === 'flat' ? flatRate : annualRate,
                annualRate: mode === 'flat' ? flatRate * 12 : annualRate,
                tenureMonths: tenure,
                interest: trackerSnapshot.interest,
                totalPayable: trackerSnapshot.totalPayable,
                mode,
                interestFree,
                startDate: loanStartDate || new Date().toISOString().slice(0, 10),
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        // Mirror to loanStorage so the SI loan also shows up in the loan
        // portfolio summary at the top of MyLoans (total outstanding,
        // monthly burden) — previously SI loans existed only in the tracker
        // store and were invisible to the portfolio aggregate.
        // For interest-free loans the EMI is just principal/tenure.
        const monthlyEmi = interestFree
            ? Math.round(principal / Math.max(1, tenure))
            : Math.round(trackerSnapshot.totalPayable / Math.max(1, tenure));
        const loan: SavedLoan = {
            id,
            nickName: customName,
            loanType: 'personal_loan',
            lenderName: '',
            loanAmount: principal,
            interestRate: interestFree ? 0 : (mode === 'flat' ? flatRate * 12 : annualRate),
            tenureMonths: tenure,
            emiAmount: monthlyEmi,
            rateType: 'fixed',
            disbursementDate: loanStartDate || new Date().toISOString().slice(0, 10),
            emiDueDay: 5,
            notes: interestFree ? 'Interest-free loan (rural / family borrowing)' : `${mode} interest mode`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
        };
        saveLoanToStorage(loan);
        setTrackerSavedId(id);
        setTrackerSaved(true);
    };

    const handleTrackerRemove = () => {
        if (trackerSavedId) {
            removeProfile(trackerSavedId);
            // Also remove from loanStorage so the portfolio aggregate clears.
            try { deleteLoanFromStorage(trackerSavedId); } catch { /* ignore */ }
            setTrackerSavedId(null);
            setTrackerSaved(false);
        }
    };

    // Compute period breakdown table for flat and simple modes
    const periodRows = useMemo((): PeriodRow[] => {
        if (mode === 'compound') return [];
        const monthlyInterest = mode === 'flat'
            ? (principal / 100) * (interestFree ? 0 : flatRate)
            : ((principal * annualRate) / 100) / 12;
        return buildPeriodTable(principal, monthlyInterest, new Date(), tenure, payFreq);
    }, [mode, principal, flatRate, annualRate, tenure, payFreq, interestFree]);

    const handleDownloadPDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const freqName = FREQ_LABEL[payFreq];

        const inputs: Array<{ label: string; value: string }> = [
            { label: t('si.pdfPrincipalAmount'), value: `₹${principal.toLocaleString('en-IN')}` },
            { label: t('si.pdfInterestMode'), value: mode === 'flat' ? t('si.flatRate') : mode === 'simple' ? t('si.simpleInterest') : t('si.compoundInterest') },
        ];
        const results: Array<{ label: string; value: string }> = [];

        if (mode === 'flat') {
            const r = result as { monthlyInterest: number; equivalentMonthlyPct: number; equivalentAnnualPct: number; totalInterest: number; totalPayable: number };
            inputs.push(
                { label: t('si.rate'), value: `₹${flatRate} ${t('si.perHundredPerMonth')}` },
                { label: t('si.tenure'), value: `${tenure} ${t('si.months')}` },
                { label: t('si.paymentFrequency'), value: freqName },
            );
            results.push(
                { label: t('si.monthlyInterest'), value: `₹${Math.round(r.monthlyInterest).toLocaleString('en-IN')}` },
                { label: t('si.pdfEquivMonthlyRate'), value: `${r.equivalentMonthlyPct.toFixed(2)}%` },
                { label: t('si.pdfEquivAnnualRate'), value: `${r.equivalentAnnualPct.toFixed(2)}%` },
                { label: t('si.pdfTotalInterest'), value: `₹${Math.round(r.totalInterest).toLocaleString('en-IN')}` },
                { label: t('si.totalPayable'), value: `₹${Math.round(r.totalPayable).toLocaleString('en-IN')}` },
            );
        } else if (mode === 'simple') {
            const r = result as { totalInterest: number; totalAmount: number; monthlyEMI: number };
            inputs.push(
                { label: t('si.annualRate'), value: `${annualRate}%` },
                { label: t('si.tenure'), value: `${tenure} ${t('si.months')}` },
                { label: t('si.paymentFrequency'), value: freqName },
            );
            results.push(
                { label: t('si.totalInterestSI'), value: `₹${Math.round(r.totalInterest).toLocaleString('en-IN')}` },
                { label: t('si.totalAmount'), value: `₹${Math.round(r.totalAmount).toLocaleString('en-IN')}` },
                { label: t('si.monthlyEMI'), value: `₹${Math.round(r.monthlyEMI).toLocaleString('en-IN')}` },
            );
        } else {
            const r = result as { compoundInterest: number; totalPayable: number; monthlyEMI: number };
            const compFreqLabel = compFreqOptions.find(f => f.val === compoundFreq)?.label || t('si.freqMonthly');
            inputs.push(
                { label: t('si.annualRate'), value: `${annualRate}%` },
                { label: t('si.tenure'), value: `${tenure} ${t('si.months')}` },
                { label: t('si.compoundingFrequency'), value: compFreqLabel },
            );
            results.push(
                { label: t('si.compoundInterestLabel'), value: `₹${Math.round(r.compoundInterest).toLocaleString('en-IN')}` },
                { label: t('si.totalPayable'), value: `₹${Math.round(r.totalPayable).toLocaleString('en-IN')}` },
                { label: t('si.avgMonthlyPayment'), value: `₹${Math.round(r.monthlyEMI).toLocaleString('en-IN')}` },
            );
        }

        const config: ExportConfig = {
            title: t('si.pdfReportTitle'),
            subtitle: mode === 'flat' ? t('si.flatRateInterest') : mode === 'simple' ? t('si.simpleInterest') : t('si.compoundInterest'),
            inputs,
            results,
            projectionTitle: t('si.pdfPaymentSchedule'),
            projectionColumns: periodRows.length > 0 ? [t('si.period'), t('si.dueDate'), t('si.interest'), t('si.pdfCumulativeInterest')] : undefined,
            projectionRows: periodRows.map((r: any) => [
                `${t('si.period')} ${r.period}`,
                r.dueDate || '',
                `₹${Math.round(r.interest).toLocaleString('en-IN')}`,
                `₹${Math.round(r.cumulative).toLocaleString('en-IN')}`,
            ]),
            filename: `FinCalix_Interest_Report_${tag}`,
        };
        await exportToPDF(config);
    };

    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;

        const inputs: Array<{ label: string; value: string }> = [
            { label: t('si.principal'), value: `₹${principal.toLocaleString('en-IN')}` },
            { label: t('si.excelMode'), value: mode },
        ];
        const results: Array<{ label: string; value: string }> = [];

        if (mode === 'flat') {
            const r = result as { monthlyInterest: number; totalInterest: number; totalPayable: number };
            inputs.push({ label: t('si.excelRateFlat'), value: String(flatRate) });
            results.push(
                { label: t('si.monthlyInterest'), value: `₹${Math.round(r.monthlyInterest).toLocaleString('en-IN')}` },
                { label: t('si.pdfTotalInterest'), value: `₹${Math.round(r.totalInterest).toLocaleString('en-IN')}` },
                { label: t('si.totalPayable'), value: `₹${Math.round(r.totalPayable).toLocaleString('en-IN')}` },
            );
        } else if (mode === 'simple') {
            const r = result as { totalInterest: number; totalAmount: number; monthlyEMI: number };
            inputs.push(
                { label: t('si.excelRatePercent'), value: String(annualRate) },
                { label: t('si.excelTenureMonths'), value: String(tenure) },
            );
            results.push(
                { label: t('si.pdfTotalInterest'), value: `₹${Math.round(r.totalInterest).toLocaleString('en-IN')}` },
                { label: t('si.totalAmount'), value: `₹${Math.round(r.totalAmount).toLocaleString('en-IN')}` },
                { label: t('si.monthlyEMI'), value: `₹${Math.round(r.monthlyEMI).toLocaleString('en-IN')}` },
            );
        } else {
            const r = result as { compoundInterest: number; totalPayable: number; monthlyEMI: number };
            inputs.push(
                { label: t('si.excelRatePercent'), value: String(annualRate) },
                { label: t('si.excelTenureMonths'), value: String(tenure) },
            );
            results.push(
                { label: t('si.compoundInterestLabel'), value: `₹${Math.round(r.compoundInterest).toLocaleString('en-IN')}` },
                { label: t('si.totalPayable'), value: `₹${Math.round(r.totalPayable).toLocaleString('en-IN')}` },
                { label: t('si.monthlyEMI'), value: `₹${Math.round(r.monthlyEMI).toLocaleString('en-IN')}` },
            );
        }

        const config: ExportConfig = {
            title: t('si.pdfReportTitle'),
            inputs,
            results,
            projectionTitle: t('si.pdfPaymentSchedule'),
            projectionColumns: periodRows.length > 0 ? [t('si.period'), t('si.dueDate'), t('si.interest'), t('si.cumulative')] : undefined,
            projectionRows: periodRows.map((r: any) => [r.period, r.dueDate || '', Math.round(r.interest), Math.round(r.cumulative)]),
            filename: `FinCalix_Interest_Report_${tag}`,
        };
        await exportToExcel(config);
    };

    const modes: { key: Mode; label: string; color: string }[] = [
        { key: 'flat', label: t('si.flatInterest'), color: 'bg-amber-500' },
        { key: 'simple', label: t('si.simpleInterest'), color: 'bg-brand-blue' },
        { key: 'compound', label: t('si.compoundInterest'), color: 'bg-brand-purple' },
    ];

    const compFreqOptions = [
        { label: t('si.freqMonthly'), val: 12 },
        { label: t('si.freqQuarterly'), val: 4 },
        { label: t('si.freqHalfyearly'), val: 2 },
        { label: t('si.freqYearly'), val: 1 },
    ];

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-background animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-[#0F172A]  px-4 pt-14 pb-3 border-b border-slate-200 dark:border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                            <ArrowLeft size={18} className="text-muted-foreground dark:text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-foreground">{t('si.title')}</h1>
                            <p className="text-muted-foreground text-xs">{t('si.subtitle')}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                            <Info size={16} className="text-muted-foreground" />
                        </button>
                        <button
                            className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border"
                            onClick={() => nativeShare(t('si.shareTitle'), t('si.shareText'), window.location.href)}
                        >
                            <Share2 size={16} className="text-muted-foreground" />
                        </button>
                    </div>
                </div>
            </div>

            
            <DisclaimerComponent module="general" />

            <div className="px-4 pb-28">
                {/* Mode Selector */}
                <div className="flex gap-1 bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-1 my-4">
                    {modes.map((m) => (
                        <button
                            key={m.key}
                            onClick={() => setMode(m.key)}
                            className={`flex-1 py-3 rounded-lg text-[11px] font-bold transition-all ${mode === m.key
                                ? `${m.color} text-white shadow-lg`
                                : 'text-muted-foreground'
                                }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* Input Fields */}
                <div className="space-y-3 mb-5">
                    <NumberInput
                        label={t('si.loanPrincipalAmount')}
                        value={principal}
                        onChange={setPrincipal}
                        min={100}
                        max={1000000000}
                        prefix="₹"
                        helperText={t('si.principalRange')}
                    />

                    {mode === 'flat' ? (
                        <>
                            {/* Interest-free toggle for rural / family-loan use case.
                                When ON we hide the rate input completely so the user
                                isn't confused by a rate that does nothing. */}
                            <button
                                onClick={() => setInterestFree(v => !v)}
                                className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${interestFree
                                    ? 'border-emerald-500/40 bg-emerald-500/10'
                                    : 'border-slate-200 dark:border-border bg-white dark:bg-card'}`}
                            >
                                <div className={`w-10 h-6 rounded-full p-0.5 transition-all ${interestFree ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${interestFree ? 'translate-x-4' : ''}`} />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-xs font-bold" style={{ color: interestFree ? '#10b981' : undefined }}>
                                        🤝 {t('si.interestFreeTitle', 'Interest-free borrowing')}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {t('si.interestFreeHint', 'For loans from family / friends with no interest')}
                                    </p>
                                </div>
                            </button>

                            {!interestFree && (
                                <NumberInput
                                    label={t('si.flatRateLabel')}
                                    value={flatRate}
                                    onChange={setFlatRate}
                                    min={0.1}
                                    max={50}
                                    prefix="₹"
                                    step={0.1}
                                    helperText={t('si.flatRateRange')}
                                />
                            )}
                        </>
                    ) : (
                        <NumberInput
                            label={t('si.annualInterestRate')}
                            value={annualRate}
                            onChange={setAnnualRate}
                            min={0.1}
                            max={100}
                            suffix="%"
                            step={0.1}
                            helperText={t('si.annualRateRange')}
                        />
                    )}

                    <NumberInput
                        label={t('si.tenureMonths')}
                        value={tenure}
                        onChange={setTenure}
                        min={1}
                        max={600}
                        suffix={` ${t('si.months')}`}
                        helperText={t('si.tenureRange')}
                    />

                    {mode === 'compound' && (
                        <div>
                            <label className="text-xs text-muted-foreground dark:text-muted-foreground mb-2 block font-medium">{t('si.compoundingFrequency')}</label>
                            <div className="grid grid-cols-4 gap-2">
                                {compFreqOptions.map(opt => (
                                    <button
                                        key={opt.val}
                                        onClick={() => setCompoundFreq(opt.val)}
                                        className={`py-3 rounded-xl text-[11px] font-bold transition-all border ${compoundFreq === opt.val
                                            ? 'bg-brand-purple border-brand-purple text-foreground'
                                            : 'bg-white dark:bg-card border-slate-200 dark:border-border text-muted-foreground'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Payment Frequency Selector — flat & simple modes only */}
                    {mode !== 'compound' && (
                        <div>
                            <label className="text-xs text-muted-foreground dark:text-muted-foreground mb-2 block font-medium">{t('si.paymentFrequency')}</label>
                            <div className="grid grid-cols-4 gap-2">
                                {FREQ_OPTIONS.map(opt => (
                                    <button
                                        key={opt.val}
                                        onClick={() => setPayFreq(opt.val)}
                                        className={`py-3 rounded-xl text-[11px] font-bold transition-all border ${payFreq === opt.val
                                            ? 'bg-amber-500 border-amber-500 text-white'
                                            : 'bg-white dark:bg-card border-slate-200 dark:border-border text-muted-foreground'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Result Card */}
                <motion.div layout className="p-5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border mb-4 shadow-sm">
                    {mode === 'flat' && (() => {
                        const r = result as { monthlyInterest: number; equivalentMonthlyPct: number; equivalentAnnualPct: number; totalInterest: number; totalPayable: number };
                        // Interest-free path shows the principal-only repayment plan.
                        const monthlyPrincipalRepayment = principal / Math.max(1, tenure);
                        return (
                            <>
                                <div className="text-center mb-4">
                                    {interestFree ? (
                                        <>
                                            <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-1">{t('si.monthlyRepayment', 'Monthly repayment')}</p>
                                            <motion.p key={monthlyPrincipalRepayment} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                                className="text-3xl font-bold text-emerald-500">
                                                {formatINR(monthlyPrincipalRepayment)}
                                            </motion.p>
                                            <p className="text-emerald-500 text-sm font-medium mt-1">
                                                🤝 {t('si.interestFree', 'Interest-free')}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-1">{t('si.monthlyInterestPayable')}</p>
                                            <motion.p key={r.monthlyInterest} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                                className="text-3xl font-bold text-amber-500">
                                                {formatINR(r.monthlyInterest)}
                                            </motion.p>
                                            <p className="text-brand-blue text-sm font-medium mt-1">
                                                ₹{flatRate} {t('si.perHundredPerMonth')}
                                            </p>
                                        </>
                                    )}
                                </div>

                                <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-border">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">{t('si.loanAmount')}</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-foreground">{formatINR(principal)}</span>
                                    </div>
                                    {interestFree ? (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground text-xs">{t('si.tenure', 'Tenure')}</span>
                                                <span className="font-semibold text-sm text-slate-900 dark:text-foreground">{tenure} {t('si.month')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground text-xs">{t('si.monthlyRepayment', 'Monthly repayment')}</span>
                                                <span className="font-semibold text-sm text-emerald-500">{formatINR(monthlyPrincipalRepayment)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground text-xs">{t('si.totalInterestWithTenure', { tenure })}</span>
                                                <span className="font-semibold text-sm text-emerald-500">₹0</span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-border">
                                                <span className="text-slate-900 dark:text-foreground text-xs font-bold">{t('si.totalPayable')}</span>
                                                <span className="font-bold text-sm text-brand-green">{formatINR(principal)}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground text-xs">{t('si.rate')}</span>
                                                <span className="font-semibold text-sm text-amber-500">₹{flatRate} {t('si.perHundredPerMonthShort')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground text-xs">{t('si.monthlyInterest')}</span>
                                                <span className="font-semibold text-sm text-brand-green">{formatINR(r.monthlyInterest)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground text-xs">{t('si.equivMonthlyRate')}</span>
                                                <span className="font-semibold text-sm text-brand-blue">{r.equivalentMonthlyPct.toFixed(2)}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground text-xs">{t('si.equivAnnualRate')}</span>
                                                <span className="font-semibold text-sm text-brand-purple">{r.equivalentAnnualPct.toFixed(2)}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground text-xs">{t('si.totalInterestWithTenure', { tenure })}</span>
                                                <span className="font-semibold text-sm text-red-500">{formatINR(r.totalInterest)}</span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-border">
                                                <span className="text-slate-900 dark:text-foreground text-xs font-bold">{t('si.totalPayable')}</span>
                                                <span className="font-bold text-sm text-brand-green">{formatINR(r.totalPayable)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Quick Reference Table — only when interest is being charged */}
                                {!interestFree && (
                                    <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/15">
                                        <p className="text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-2">{t('si.quickReferenceVillageRate')}</p>
                                        <div className="space-y-1">
                                            {[1, 1.5, 2, 3, 5].map(r => (
                                                <div key={r} className="flex justify-between">
                                                    <span className="text-slate-600 dark:text-muted-foreground text-[11px]">₹{r}/₹100 → ₹{((principal / 100) * r).toLocaleString('en-IN')}/{t('si.month')}</span>
                                                    <span className="text-muted-foreground text-[11px]">= {(r * 12).toFixed(0)}% {t('si.perAnnum')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()}

                    {mode === 'simple' && (() => {
                        const r = result as { totalInterest: number; totalAmount: number; monthlyEMI: number; monthlyInterestOnly: number; tenureInYears: number };
                        return (
                            <>
                                <div className="text-center mb-4">
                                    <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-1">{t('si.totalAmount')}</p>
                                    <motion.p key={r.totalAmount} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                        className="text-3xl font-bold text-brand-blue">
                                        {formatINR(r.totalAmount)}
                                    </motion.p>
                                </div>
                                <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-border">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">{t('si.principal')}</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-foreground">{formatINR(principal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">{t('si.annualRate')}</span>
                                        <span className="font-semibold text-sm text-brand-blue">{annualRate}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">{t('si.tenure')}</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-foreground">{tenure} {t('si.months')} ({r.tenureInYears.toFixed(1)} {t('si.yrs')})</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">{t('si.totalInterestSI')}</span>
                                        <span className="font-semibold text-sm text-brand-green">{formatINR(r.totalInterest)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">{t('si.monthlyInterestOnly')}</span>
                                        <span className="font-semibold text-sm text-amber-500">{formatINR(r.monthlyInterestOnly)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">{t('si.villageRate')}</span>
                                        <span className="font-semibold text-sm text-amber-400">₹{(annualRate / 12).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-border">
                                        <span className="text-slate-900 dark:text-foreground text-xs font-bold">{t('si.monthlyEMI')}</span>
                                        <span className="font-bold text-sm text-brand-green">{formatINR(r.monthlyEMI)}</span>
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    {mode === 'compound' && (() => {
                        const r = result as { compoundInterest: number; totalPayable: number; monthlyEMI: number; tenureInYears: number };
                        const freqLabel = compFreqOptions.find(f => f.val === compoundFreq)?.label || t('si.freqMonthly');
                        return (
                            <>
                                <div className="text-center mb-4">
                                    <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-1">{t('si.totalPayable')}</p>
                                    <motion.p key={r.totalPayable} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                        className="text-3xl font-bold text-brand-purple">
                                        {formatINR(r.totalPayable)}
                                    </motion.p>
                                </div>
                                <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-border">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">{t('si.principal')}</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-foreground">{formatINR(principal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">{t('si.annualRate')}</span>
                                        <span className="font-semibold text-sm text-brand-purple">{annualRate}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">{t('si.compounding')}</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-foreground">{freqLabel}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">{t('si.tenure')}</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-foreground">{tenure} {t('si.months')} ({r.tenureInYears.toFixed(1)} {t('si.yrs')})</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">{t('si.compoundInterestLabel')}</span>
                                        <span className="font-semibold text-sm text-brand-green">{formatINR(r.compoundInterest)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">{t('si.villageRate')}</span>
                                        <span className="font-semibold text-sm text-amber-400">₹{(annualRate / 12).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-border">
                                        <span className="text-slate-900 dark:text-foreground text-xs font-bold">{t('si.avgMonthlyPayment')}</span>
                                        <span className="font-bold text-sm text-brand-green">{formatINR(r.monthlyEMI)}</span>
                                    </div>
                                    <p className="text-muted-foreground text-[10px] leading-tight">{t('si.avgPaymentNote')}</p>
                                </div>
                            </>
                        );
                    })()}
                </motion.div>

                {/* ── Payment Frequency Breakdown Table (flat & simple only) ── */}
                {mode !== 'compound' && periodRows.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm overflow-hidden"
                    >
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-border flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-foreground">{FREQ_LABEL[payFreq]} {t('si.interestSchedule')}</p>
                                <p className="text-[10px] text-muted-foreground">{periodRows.length} {t('si.periods')} · {tenure} {t('si.monthsTotal')}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${mode === 'flat' ? 'bg-amber-500/10 text-amber-600' : 'bg-brand-blue/10 text-brand-blue'}`}>
                                {mode === 'flat' ? t('si.flat') : t('si.si')}
                            </span>
                        </div>
                        <div className="overflow-x-auto max-h-64 overflow-y-auto relative border-t border-slate-200 dark:border-slate-700 shadow-inner dark:shadow-none">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-sm">
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">{t('si.period')}</th>
                                        <th className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">{t('si.dueDate')}</th>
                                        <th className="py-2 px-3 text-right font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">{t('si.interest')}</th>
                                        <th className="py-2 px-3 text-right font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">{t('si.cumulative')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {periodRows.map((row, i) => (
                                        <tr key={row.period} className={`border-b border-slate-200 dark:border-slate-700 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-[#0F172A]' : 'bg-slate-50 dark:bg-slate-800/40'}`}>
                                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-foreground">{row.period}</td>
                                            <td className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300">{row.dueDate}</td>
                                            <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400 font-bold">{formatINR(row.interest)}</td>
                                            <td className="py-2.5 px-3 text-right text-brand-green font-bold">{formatINR(row.cumulative)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {/* Save to My Loans */}
                <div className="mb-3">
                    {!trackerSaved && (
                        <div className="p-4 rounded-2xl border border-border bg-card mb-3">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2 block">
                                {t('common.investmentDate', 'Investment Date (optional)')}
                            </label>
                            <DateInput
                                value={loanStartDate}
                                onChange={setLoanStartDate}
                                max={new Date().toISOString().slice(0, 10)}
                                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground text-left"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1.5">
                                {t('common.investmentDateHint', 'Used for tracking in My Loans')}
                            </p>
                        </div>
                    )}
                    {/* LIVE INVESTMENT TRACKER — appears the moment user picks a date */}
                    {loanStartDate && (
                        <div className="mb-3">
                            <LiveInvestmentTracker
                                mode="simple"
                                startDate={loanStartDate}
                                totalYears={tenure / 12}
                                rate={mode === 'flat' ? flatRate * 12 : annualRate}
                                principal={principal}
                                projectedMaturity={trackerSnapshot.totalPayable}
                                label={t('si.liveTracker', 'Live Simple Interest Tracker')}
                            />
                        </div>
                    )}
                    {trackerSaved ? (
                        <div className="flex gap-2">
                            <div className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <Check size={16} /> {t('common.saved')}
                            </div>
                            <button onClick={() => navigate('/my-loans')}
                                className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
                                {t('common.viewInMyLoans', 'View')}
                            </button>
                            <button onClick={handleTrackerRemove}
                                className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setShowNameDialog(true)}
                            className="w-full py-3.5 rounded-2xl bg-brand-purple text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/20">
                            <Save size={18} /> {t('myLoans.saveToTracker')}
                        </button>
                    )}

                    <SaveNameDialog
                        open={showNameDialog}
                        onClose={() => setShowNameDialog(false)}
                        onConfirm={(name) => handleTrackerSave(name)}
                        defaultName={suggestedName}
                    />
                </div>

                {/* Download buttons */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-purple/10 border-2 border-brand-purple/40 text-brand-purple font-bold text-sm"
                    >
                        📄 {t('si.downloadPDF')}
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-green/10 border-2 border-brand-green/40 text-brand-green font-bold text-sm"
                    >
                        📊 {t('si.downloadExcel')}
                    </button>
                </div>


                <CalculatorInfoModal
                    isOpen={showInfo}
                    onClose={() => setShowInfo(false)}
                    calculatorTitle={t('si.simpleInterest')}
                />
            </div>
        </div>
    );
}
