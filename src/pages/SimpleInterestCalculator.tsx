import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Info, Share2 } from 'lucide-react';
import { nativeShare } from '../utils/nativeShare';
import { motion } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';

import { formatINR } from '../utils/calculations';
import { useAuthStore } from '../store/useAuthStore';
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

const FREQ_OPTIONS: { label: string; val: FrequencyMonths }[] = [
    { label: 'Monthly', val: 1 },
    { label: 'Quarterly', val: 3 },
    { label: 'Half-yearly', val: 6 },
    { label: 'Yearly', val: 12 },
];

const FREQ_LABEL: Record<FrequencyMonths, string> = {
    1: 'Monthly',
    3: 'Quarterly',
    6: 'Half-yearly',
    12: 'Yearly',
};

export default function SimpleInterestCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('Simple_Interest'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const [mode, setMode] = useState<Mode>('flat');
    const [principal, setPrincipal] = useState(100000);
    const [flatRate, setFlatRate] = useState(2); // ₹ per ₹100/month
    const [annualRate, setAnnualRate] = useState(12);
    const [tenure, setTenure] = useState(12); // months
    const [compoundFreq, setCompoundFreq] = useState(12); // monthly
    const [showInfo, setShowInfo] = useState(false);
    const [payFreq, setPayFreq] = useState<FrequencyMonths>(1); // payment frequency

    const result = useMemo(() => {
        if (mode === 'flat') {
            // Flat ₹ per ₹100 per month model
            const monthlyInterest = (principal / 100) * flatRate;
            const equivalentMonthlyPct = flatRate; // flatRate per ₹100 = flatRate %
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
    }, [mode, principal, flatRate, annualRate, tenure, compoundFreq]);

    // Compute period breakdown table for flat and simple modes
    const periodRows = useMemo((): PeriodRow[] => {
        if (mode === 'compound') return [];
        const monthlyInterest = mode === 'flat'
            ? (principal / 100) * flatRate
            : ((principal * annualRate) / 100) / 12;
        return buildPeriodTable(principal, monthlyInterest, new Date(), tenure, payFreq);
    }, [mode, principal, flatRate, annualRate, tenure, payFreq]);

    const handleDownloadPDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const freqName = FREQ_LABEL[payFreq];

        const inputs: Array<{ label: string; value: string }> = [
            { label: 'Principal Amount', value: `₹${principal.toLocaleString('en-IN')}` },
            { label: 'Interest Mode', value: mode === 'flat' ? 'Flat Rate' : mode === 'simple' ? 'Simple Interest' : 'Compound Interest' },
        ];
        const results: Array<{ label: string; value: string }> = [];

        if (mode === 'flat') {
            const r = result as { monthlyInterest: number; equivalentMonthlyPct: number; equivalentAnnualPct: number; totalInterest: number; totalPayable: number };
            inputs.push(
                { label: 'Rate', value: `₹${flatRate} per ₹100/month` },
                { label: 'Tenure', value: `${tenure} Months` },
                { label: 'Payment Frequency', value: freqName },
            );
            results.push(
                { label: 'Monthly Interest', value: `₹${Math.round(r.monthlyInterest).toLocaleString('en-IN')}` },
                { label: 'Equiv. Monthly Rate', value: `${r.equivalentMonthlyPct.toFixed(2)}%` },
                { label: 'Equiv. Annual Rate', value: `${r.equivalentAnnualPct.toFixed(2)}%` },
                { label: 'Total Interest', value: `₹${Math.round(r.totalInterest).toLocaleString('en-IN')}` },
                { label: 'Total Payable', value: `₹${Math.round(r.totalPayable).toLocaleString('en-IN')}` },
            );
        } else if (mode === 'simple') {
            const r = result as { totalInterest: number; totalAmount: number; monthlyEMI: number };
            inputs.push(
                { label: 'Annual Rate', value: `${annualRate}%` },
                { label: 'Tenure', value: `${tenure} Months` },
                { label: 'Payment Frequency', value: freqName },
            );
            results.push(
                { label: 'Total Interest (SI)', value: `₹${Math.round(r.totalInterest).toLocaleString('en-IN')}` },
                { label: 'Total Amount', value: `₹${Math.round(r.totalAmount).toLocaleString('en-IN')}` },
                { label: 'Monthly EMI', value: `₹${Math.round(r.monthlyEMI).toLocaleString('en-IN')}` },
            );
        } else {
            const r = result as { compoundInterest: number; totalPayable: number; monthlyEMI: number };
            const compFreqLabel = compFreqOptions.find(f => f.val === compoundFreq)?.label || 'Monthly';
            inputs.push(
                { label: 'Annual Rate', value: `${annualRate}%` },
                { label: 'Tenure', value: `${tenure} Months` },
                { label: 'Compounding Frequency', value: compFreqLabel },
            );
            results.push(
                { label: 'Compound Interest', value: `₹${Math.round(r.compoundInterest).toLocaleString('en-IN')}` },
                { label: 'Total Payable', value: `₹${Math.round(r.totalPayable).toLocaleString('en-IN')}` },
                { label: 'Avg Monthly Payment', value: `₹${Math.round(r.monthlyEMI).toLocaleString('en-IN')}` },
            );
        }

        const config: ExportConfig = {
            title: 'Interest Calculator Report',
            subtitle: mode === 'flat' ? 'Flat Rate Interest' : mode === 'simple' ? 'Simple Interest' : 'Compound Interest',
            inputs,
            results,
            projectionTitle: 'Payment Schedule',
            projectionColumns: periodRows.length > 0 ? ['Period', 'Due Date', 'Interest', 'Cumulative Interest'] : undefined,
            projectionRows: periodRows.map((r: any) => [
                `Period ${r.period}`,
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
            { label: 'Principal', value: `₹${principal.toLocaleString('en-IN')}` },
            { label: 'Mode', value: mode },
        ];
        const results: Array<{ label: string; value: string }> = [];

        if (mode === 'flat') {
            const r = result as { monthlyInterest: number; totalInterest: number; totalPayable: number };
            inputs.push({ label: 'Rate (₹/₹100/month)', value: String(flatRate) });
            results.push(
                { label: 'Monthly Interest', value: `₹${Math.round(r.monthlyInterest).toLocaleString('en-IN')}` },
                { label: 'Total Interest', value: `₹${Math.round(r.totalInterest).toLocaleString('en-IN')}` },
                { label: 'Total Payable', value: `₹${Math.round(r.totalPayable).toLocaleString('en-IN')}` },
            );
        } else if (mode === 'simple') {
            const r = result as { totalInterest: number; totalAmount: number; monthlyEMI: number };
            inputs.push(
                { label: 'Rate (%)', value: String(annualRate) },
                { label: 'Tenure (months)', value: String(tenure) },
            );
            results.push(
                { label: 'Total Interest', value: `₹${Math.round(r.totalInterest).toLocaleString('en-IN')}` },
                { label: 'Total Amount', value: `₹${Math.round(r.totalAmount).toLocaleString('en-IN')}` },
                { label: 'Monthly EMI', value: `₹${Math.round(r.monthlyEMI).toLocaleString('en-IN')}` },
            );
        } else {
            const r = result as { compoundInterest: number; totalPayable: number; monthlyEMI: number };
            inputs.push(
                { label: 'Rate (%)', value: String(annualRate) },
                { label: 'Tenure (months)', value: String(tenure) },
            );
            results.push(
                { label: 'Compound Interest', value: `₹${Math.round(r.compoundInterest).toLocaleString('en-IN')}` },
                { label: 'Total Payable', value: `₹${Math.round(r.totalPayable).toLocaleString('en-IN')}` },
                { label: 'Monthly EMI', value: `₹${Math.round(r.monthlyEMI).toLocaleString('en-IN')}` },
            );
        }

        const config: ExportConfig = {
            title: 'Interest Calculator Report',
            inputs,
            results,
            projectionTitle: 'Payment Schedule',
            projectionColumns: periodRows.length > 0 ? ['Period', 'Due Date', 'Interest', 'Cumulative'] : undefined,
            projectionRows: periodRows.map((r: any) => [r.period, r.dueDate || '', Math.round(r.interest), Math.round(r.cumulative)]),
            filename: `FinCalix_Interest_Report_${tag}`,
        };
        await exportToExcel(config);
    };

    const modes: { key: Mode; label: string; color: string }[] = [
        { key: 'flat', label: 'Flat ₹ Interest', color: 'bg-amber-500' },
        { key: 'simple', label: 'Simple Interest', color: 'bg-brand-blue' },
        { key: 'compound', label: 'Compound Interest', color: 'bg-brand-purple' },
    ];

    const compFreqOptions = [
        { label: 'Monthly', val: 12 },
        { label: 'Quarterly', val: 4 },
        { label: 'Half-Yr', val: 2 },
        { label: 'Yearly', val: 1 },
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
                            <h1 className="text-lg font-bold text-slate-900 dark:text-foreground">Interest Calculator</h1>
                            <p className="text-muted-foreground text-xs">Flat ₹ · Simple · Compound</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                            <Info size={16} className="text-muted-foreground" />
                        </button>
                        <button
                            className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border"
                            onClick={() => nativeShare('Interest Calculator', 'Check out this Interest Calculator on FinCalix!', window.location.href)}
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
                        label="Loan / Principal Amount"
                        value={principal}
                        onChange={setPrincipal}
                        min={100}
                        max={1000000000}
                        prefix="₹"
                        helperText="₹100 - ₹100 Cr"
                    />

                    {mode === 'flat' ? (
                        <NumberInput
                            label="Interest Rate (₹ per ₹100/month)"
                            value={flatRate}
                            onChange={setFlatRate}
                            min={0.1}
                            max={50}
                            prefix="₹"
                            step={0.1}
                            helperText="₹0.1 - ₹50 per ₹100/month"
                        />
                    ) : (
                        <NumberInput
                            label="Annual Interest Rate"
                            value={annualRate}
                            onChange={setAnnualRate}
                            min={0.1}
                            max={100}
                            suffix="%"
                            step={0.1}
                            helperText="0.1% - 100%"
                        />
                    )}

                    <NumberInput
                        label="Tenure (Months)"
                        value={tenure}
                        onChange={setTenure}
                        min={1}
                        max={600}
                        suffix=" months"
                        helperText="1 - 600 months (50 years)"
                    />

                    {mode === 'compound' && (
                        <div>
                            <label className="text-xs text-muted-foreground dark:text-muted-foreground mb-2 block font-medium">Compounding Frequency</label>
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
                            <label className="text-xs text-muted-foreground dark:text-muted-foreground mb-2 block font-medium">Payment Frequency</label>
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
                        return (
                            <>
                                <div className="text-center mb-4">
                                    <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-1">Monthly Interest Payable</p>
                                    <motion.p key={r.monthlyInterest} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                        className="text-3xl font-bold text-amber-500">
                                        {formatINR(r.monthlyInterest)}
                                    </motion.p>
                                    <p className="text-brand-blue text-sm font-medium mt-1">
                                        ₹{flatRate} per ₹100 per month
                                    </p>
                                </div>

                                <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-border">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Loan Amount</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-foreground">{formatINR(principal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Rate</span>
                                        <span className="font-semibold text-sm text-amber-500">₹{flatRate} per ₹100/month</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Monthly Interest</span>
                                        <span className="font-semibold text-sm text-brand-green">{formatINR(r.monthlyInterest)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Equiv. Monthly Rate</span>
                                        <span className="font-semibold text-sm text-brand-blue">{r.equivalentMonthlyPct.toFixed(2)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Equiv. Annual Rate</span>
                                        <span className="font-semibold text-sm text-brand-purple">{r.equivalentAnnualPct.toFixed(2)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Total Interest ({tenure} months)</span>
                                        <span className="font-semibold text-sm text-red-500">{formatINR(r.totalInterest)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-border">
                                        <span className="text-slate-900 dark:text-foreground text-xs font-bold">Total Payable</span>
                                        <span className="font-bold text-sm text-brand-green">{formatINR(r.totalPayable)}</span>
                                    </div>
                                </div>

                                {/* Quick Reference Table */}
                                <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/15">
                                    <p className="text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-2">Quick Reference — Village Rate</p>
                                    <div className="space-y-1">
                                        {[1, 1.5, 2, 3, 5].map(r => (
                                            <div key={r} className="flex justify-between">
                                                <span className="text-slate-600 dark:text-muted-foreground text-[11px]">₹{r}/₹100 → ₹{((principal / 100) * r).toLocaleString('en-IN')}/month</span>
                                                <span className="text-muted-foreground text-[11px]">= {(r * 12).toFixed(0)}% p.a.</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    {mode === 'simple' && (() => {
                        const r = result as { totalInterest: number; totalAmount: number; monthlyEMI: number; monthlyInterestOnly: number; tenureInYears: number };
                        return (
                            <>
                                <div className="text-center mb-4">
                                    <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-1">Total Amount</p>
                                    <motion.p key={r.totalAmount} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                        className="text-3xl font-bold text-brand-blue">
                                        {formatINR(r.totalAmount)}
                                    </motion.p>
                                </div>
                                <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-border">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Principal</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-foreground">{formatINR(principal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Annual Rate</span>
                                        <span className="font-semibold text-sm text-brand-blue">{annualRate}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Tenure</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-foreground">{tenure} months ({r.tenureInYears.toFixed(1)} yrs)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Total Interest (SI)</span>
                                        <span className="font-semibold text-sm text-brand-green">{formatINR(r.totalInterest)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Monthly Interest Only</span>
                                        <span className="font-semibold text-sm text-amber-500">{formatINR(r.monthlyInterestOnly)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Village Rate (per ₹100/month)</span>
                                        <span className="font-semibold text-sm text-amber-400">₹{(annualRate / 12).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-border">
                                        <span className="text-slate-900 dark:text-foreground text-xs font-bold">Monthly EMI (P+I)</span>
                                        <span className="font-bold text-sm text-brand-green">{formatINR(r.monthlyEMI)}</span>
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    {mode === 'compound' && (() => {
                        const r = result as { compoundInterest: number; totalPayable: number; monthlyEMI: number; tenureInYears: number };
                        const freqLabel = compFreqOptions.find(f => f.val === compoundFreq)?.label || 'Monthly';
                        return (
                            <>
                                <div className="text-center mb-4">
                                    <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-1">Total Payable</p>
                                    <motion.p key={r.totalPayable} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                        className="text-3xl font-bold text-brand-purple">
                                        {formatINR(r.totalPayable)}
                                    </motion.p>
                                </div>
                                <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-border">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Principal</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-foreground">{formatINR(principal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Annual Rate</span>
                                        <span className="font-semibold text-sm text-brand-purple">{annualRate}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Compounding</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-foreground">{freqLabel}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Tenure</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-foreground">{tenure} months ({r.tenureInYears.toFixed(1)} yrs)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Compound Interest</span>
                                        <span className="font-semibold text-sm text-brand-green">{formatINR(r.compoundInterest)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-xs">Village Rate (per ₹100/month)</span>
                                        <span className="font-semibold text-sm text-amber-400">₹{(annualRate / 12).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-border">
                                        <span className="text-slate-900 dark:text-foreground text-xs font-bold">Avg Monthly Payment</span>
                                        <span className="font-bold text-sm text-brand-green">{formatINR(r.monthlyEMI)}</span>
                                    </div>
                                    <p className="text-muted-foreground text-[10px] leading-tight">Total ÷ tenure. For true reducing-balance EMI use the Loan EMI calculator.</p>
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
                                <p className="text-xs font-bold text-foreground">{FREQ_LABEL[payFreq]} Interest Schedule</p>
                                <p className="text-[10px] text-muted-foreground">{periodRows.length} periods · {tenure} months total</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${mode === 'flat' ? 'bg-amber-500/10 text-amber-600' : 'bg-brand-blue/10 text-brand-blue'}`}>
                                {mode === 'flat' ? 'FLAT' : 'SI'}
                            </span>
                        </div>
                        <div className="overflow-x-auto max-h-64 overflow-y-auto relative border-t border-slate-200 dark:border-slate-700 shadow-inner dark:shadow-none">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-sm">
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">Period</th>
                                        <th className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">Due Date</th>
                                        <th className="py-2 px-3 text-right font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">Interest</th>
                                        <th className="py-2 px-3 text-right font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">Cumulative</th>
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

                {/* Download buttons */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-purple/10 border-2 border-brand-purple/40 text-brand-purple font-bold text-sm"
                    >
                        📄 Download PDF
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-green/10 border-2 border-brand-green/40 text-brand-green font-bold text-sm"
                    >
                        📊 Download Excel
                    </button>
                </div>


                <CalculatorInfoModal
                    isOpen={showInfo}
                    onClose={() => setShowInfo(false)}
                    calculatorTitle="Simple Interest"
                />
            </div>
        </div>
    );
}
