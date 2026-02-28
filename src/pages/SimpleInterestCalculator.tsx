import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { formatINR } from '../utils/calculations';
import { useAuthStore } from '../store/useAuthStore';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import CalculatorInfoModal from '../components/CalculatorInfoModal';

type Mode = 'flat' | 'simple' | 'compound';

export default function SimpleInterestCalculator() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<Mode>('flat');
    const [principal, setPrincipal] = useState(100000);
    const [flatRate, setFlatRate] = useState(2); // ₹ per ₹100/month
    const [annualRate, setAnnualRate] = useState(12);
    const [tenure, setTenure] = useState(12); // months
    const [compoundFreq, setCompoundFreq] = useState(12); // monthly
    const [showInfo, setShowInfo] = useState(false);
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

    const handleDownloadPDF = () => {
        const headers = ['Field', 'Value'];
        const data: (string | number)[][] = [];
        data.push(['Mode', mode === 'flat' ? 'Flat ₹ Interest' : mode === 'simple' ? 'Simple Interest' : 'Compound Interest']);
        data.push(['Principal', formatINR(principal)]);
        if (mode === 'flat') {
            const r = result as { monthlyInterest: number; equivalentMonthlyPct: number; equivalentAnnualPct: number; totalInterest: number; totalPayable: number };
            data.push(['Rate', `₹${flatRate} per ₹100/month`]);
            data.push(['Monthly Interest', formatINR(r.monthlyInterest)]);
            data.push(['Equiv. Monthly %', `${r.equivalentMonthlyPct}%`]);
            data.push(['Equiv. Annual %', `${r.equivalentAnnualPct}%`]);
            data.push(['Total Interest', formatINR(r.totalInterest)]);
            data.push(['Total Payable', formatINR(r.totalPayable)]);
        } else if (mode === 'simple') {
            const r = result as { totalInterest: number; totalAmount: number; monthlyEMI: number };
            data.push(['Annual Rate', `${annualRate}%`]);
            data.push(['Tenure', `${tenure} months`]);
            data.push(['Total Interest', formatINR(r.totalInterest)]);
            data.push(['Total Amount', formatINR(r.totalAmount)]);
            data.push(['Monthly EMI', formatINR(r.monthlyEMI)]);
        } else {
            const r = result as { compoundInterest: number; totalPayable: number; monthlyEMI: number };
            data.push(['Annual Rate', `${annualRate}%`]);
            data.push(['Tenure', `${tenure} months`]);
            data.push(['Compound Interest', formatINR(r.compoundInterest)]);
            data.push(['Total Payable', formatINR(r.totalPayable)]);
            data.push(['Monthly EMI', formatINR(r.monthlyEMI)]);
        }
        exportToPDF('Interest Calculator Report', headers, data, 'Interest_Report');
    };

    const handleDownloadExcel = () => {
        const headers = ['Field', 'Value'];
        const data: (string | number)[][] = [['Mode', mode], ['Principal', principal]];
        if (mode === 'flat') {
            const r = result as { monthlyInterest: number; totalInterest: number; totalPayable: number };
            data.push(['Rate (₹/₹100)', flatRate], ['Monthly Interest', r.monthlyInterest], ['Total Interest', r.totalInterest], ['Total Payable', r.totalPayable]);
        } else if (mode === 'simple') {
            const r = result as { totalInterest: number; totalAmount: number; monthlyEMI: number };
            data.push(['Rate (%)', annualRate], ['Tenure (months)', tenure], ['Total Interest', r.totalInterest], ['Total Amount', r.totalAmount], ['Monthly EMI', r.monthlyEMI]);
        } else {
            const r = result as { compoundInterest: number; totalPayable: number; monthlyEMI: number };
            data.push(['Rate (%)', annualRate], ['Tenure (months)', tenure], ['CI', r.compoundInterest], ['Total Payable', r.totalPayable], ['Monthly EMI', r.monthlyEMI]);
        }
        exportToExcel(headers, data, 'Interest_Report');
    };

    const modes: { key: Mode; label: string; color: string }[] = [
        { key: 'flat', label: 'Flat ₹ Interest', color: 'bg-amber-500' },
        { key: 'simple', label: 'Simple Interest', color: 'bg-brand-blue' },
        { key: 'compound', label: 'Compound Interest', color: 'bg-brand-purple' },
    ];

    const freqOptions = [
        { label: 'Monthly', val: 12 },
        { label: 'Quarterly', val: 4 },
        { label: 'Half-Yr', val: 2 },
        { label: 'Yearly', val: 1 },
    ];

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-[#0F172A] animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-slate-200 dark:border-dark-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border">
                            <ArrowLeft size={18} className="text-slate-500 dark:text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Interest Calculator</h1>
                            <p className="text-slate-500 text-xs">Flat ₹ · Simple · Compound</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border">
                            <Info size={16} className="text-slate-400" />
                        </button>
                        <button
                            className="p-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border"
                            onClick={() => { if (navigator.share) navigator.share({ title: 'Interest Calculator', url: window.location.href }); }}
                        >
                            <Share2 size={16} className="text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>

            <DisclaimerBanner type="calculator" />

            <div className="px-4 pb-28">
                {/* Mode Selector */}
                <div className="flex gap-1 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-1 my-4">
                    {modes.map((m) => (
                        <button
                            key={m.key}
                            onClick={() => setMode(m.key)}
                            className={`flex-1 py-3 rounded-lg text-[11px] font-bold transition-all ${mode === m.key
                                ? `${m.color} text-white shadow-lg`
                                : 'text-slate-500'
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
                            <label className="text-xs text-slate-500 dark:text-slate-400 mb-2 block font-medium">Compounding Frequency</label>
                            <div className="grid grid-cols-4 gap-2">
                                {freqOptions.map(opt => (
                                    <button
                                        key={opt.val}
                                        onClick={() => setCompoundFreq(opt.val)}
                                        className={`py-3 rounded-xl text-[11px] font-bold transition-all border ${compoundFreq === opt.val
                                            ? 'bg-brand-purple border-brand-purple text-white'
                                            : 'bg-white dark:bg-dark-card border-slate-200 dark:border-dark-border text-slate-500'
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
                <motion.div layout className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border mb-4 shadow-sm">
                    {mode === 'flat' && (() => {
                        const r = result as { monthlyInterest: number; equivalentMonthlyPct: number; equivalentAnnualPct: number; totalInterest: number; totalPayable: number };
                        return (
                            <>
                                <div className="text-center mb-4">
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Monthly Interest Payable</p>
                                    <motion.p key={r.monthlyInterest} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                        className="text-3xl font-bold text-amber-500">
                                        {formatINR(r.monthlyInterest)}
                                    </motion.p>
                                    <p className="text-brand-blue text-sm font-medium mt-1">
                                        ₹{flatRate} per ₹100 per month
                                    </p>
                                </div>

                                <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-dark-border">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Loan Amount</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{formatINR(principal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Rate</span>
                                        <span className="font-semibold text-sm text-amber-500">₹{flatRate} per ₹100/month</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Monthly Interest</span>
                                        <span className="font-semibold text-sm text-brand-green">{formatINR(r.monthlyInterest)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Equiv. Monthly Rate</span>
                                        <span className="font-semibold text-sm text-brand-blue">{r.equivalentMonthlyPct.toFixed(2)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Equiv. Annual Rate</span>
                                        <span className="font-semibold text-sm text-brand-purple">{r.equivalentAnnualPct.toFixed(2)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Total Interest ({tenure} months)</span>
                                        <span className="font-semibold text-sm text-red-500">{formatINR(r.totalInterest)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-dark-border">
                                        <span className="text-slate-900 dark:text-white text-xs font-bold">Total Payable</span>
                                        <span className="font-bold text-sm text-brand-green">{formatINR(r.totalPayable)}</span>
                                    </div>
                                </div>

                                {/* Quick Reference Table */}
                                <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/15">
                                    <p className="text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-2">Quick Reference — Village Rate</p>
                                    <div className="space-y-1">
                                        {[1, 1.5, 2, 3, 5].map(r => (
                                            <div key={r} className="flex justify-between">
                                                <span className="text-slate-600 dark:text-slate-400 text-[11px]">₹{r}/₹100 → ₹{((principal / 100) * r).toLocaleString('en-IN')}/month</span>
                                                <span className="text-slate-500 text-[11px]">= {(r * 12).toFixed(0)}% p.a.</span>
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
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Total Amount</p>
                                    <motion.p key={r.totalAmount} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                        className="text-3xl font-bold text-brand-blue">
                                        {formatINR(r.totalAmount)}
                                    </motion.p>
                                </div>
                                <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-dark-border">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Principal</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{formatINR(principal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Annual Rate</span>
                                        <span className="font-semibold text-sm text-brand-blue">{annualRate}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Tenure</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{tenure} months ({r.tenureInYears.toFixed(1)} yrs)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Total Interest (SI)</span>
                                        <span className="font-semibold text-sm text-brand-green">{formatINR(r.totalInterest)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Monthly Interest Only</span>
                                        <span className="font-semibold text-sm text-amber-500">{formatINR(r.monthlyInterestOnly)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Village Rate (per ₹100/month)</span>
                                        <span className="font-semibold text-sm text-amber-400">₹{(annualRate / 12).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-dark-border">
                                        <span className="text-slate-900 dark:text-white text-xs font-bold">Monthly EMI (P+I)</span>
                                        <span className="font-bold text-sm text-brand-green">{formatINR(r.monthlyEMI)}</span>
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    {mode === 'compound' && (() => {
                        const r = result as { compoundInterest: number; totalPayable: number; monthlyEMI: number; tenureInYears: number };
                        const freqLabel = freqOptions.find(f => f.val === compoundFreq)?.label || 'Monthly';
                        return (
                            <>
                                <div className="text-center mb-4">
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Total Payable</p>
                                    <motion.p key={r.totalPayable} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                        className="text-3xl font-bold text-brand-purple">
                                        {formatINR(r.totalPayable)}
                                    </motion.p>
                                </div>
                                <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-dark-border">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Principal</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{formatINR(principal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Annual Rate</span>
                                        <span className="font-semibold text-sm text-brand-purple">{annualRate}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Compounding</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{freqLabel}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Tenure</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{tenure} months ({r.tenureInYears.toFixed(1)} yrs)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Compound Interest</span>
                                        <span className="font-semibold text-sm text-brand-green">{formatINR(r.compoundInterest)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs">Village Rate (per ₹100/month)</span>
                                        <span className="font-semibold text-sm text-amber-400">₹{(annualRate / 12).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-dark-border">
                                        <span className="text-slate-900 dark:text-white text-xs font-bold">Monthly EMI</span>
                                        <span className="font-bold text-sm text-brand-green">{formatINR(r.monthlyEMI)}</span>
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    {/* Formula */}
                    <div className="mt-4 p-3 rounded-xl bg-brand-blue/5 border border-brand-blue/15">
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                            {mode === 'flat' && 'Monthly Interest = (Loan ÷ 100) × Rate per ₹100'}
                            {mode === 'simple' && 'SI = (P × R × T) / 100'}
                            {mode === 'compound' && 'A = P × (1 + r/n)^(n×t)'}
                        </p>
                    </div>
                </motion.div>

                {/* Download buttons */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-400 font-medium text-xs"
                    >
                        📄 Download PDF
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-400 font-medium text-xs"
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