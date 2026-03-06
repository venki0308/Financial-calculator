import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, TrendingUp, Download, ExternalLink, ChevronDown, ChevronUp, Lightbulb, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToPDF } from '../utils/exportUtils';
import { AnalyticsService } from '../lib/analytics';

// ─── Slab Tables ──────────────────────────────────────────────────────────────
const OLD_REGIME = [
    { min: 0, max: 250000, rate: 0 },
    { min: 250000, max: 500000, rate: 5 },
    { min: 500000, max: 1000000, rate: 20 },
    { min: 1000000, max: Infinity, rate: 30 },
];

const NEW_REGIME = [
    { min: 0, max: 300000, rate: 0 },
    { min: 300000, max: 600000, rate: 5 },
    { min: 600000, max: 900000, rate: 10 },
    { min: 900000, max: 1200000, rate: 15 },
    { min: 1200000, max: 1500000, rate: 20 },
    { min: 1500000, max: Infinity, rate: 30 },
];

// Deduction limits for validation
const LIMITS = {
    section80C: 150000,
    section80D: 25000,
    section80CCD: 50000,
    homeLoan: 200000,
} as Record<string, number>;

function computeSlabTax(income: number, slabs: typeof OLD_REGIME): number {
    let tax = 0;
    for (const slab of slabs) {
        if (income > slab.min) {
            const upper = slab.max === Infinity ? income : slab.max;
            tax += (Math.min(income, upper) - slab.min) * (slab.rate / 100);
        }
    }
    return tax;
}

function applyRebate87A(tax: number, taxableIncome: number, regime: 'old' | 'new'): number {
    if (regime === 'new') {
        // New regime: full rebate if taxable income <= 12L (Section 87A)
        if (taxableIncome <= 1200000) return 0;
    } else {
        // Old regime: rebate up to 12,500 if taxable income <= 5L
        if (taxableIncome <= 500000) return 0;
    }
    return tax;
}

const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

type Inputs = Record<string, string>;

// ─── Input Row with Validation Warning ────────────────────────────────────────
const InputRow = memo(({ label, k, value, onChange, prefix = '₹', hint, warning }: {
    label: string;
    k: string;
    value: string;
    onChange: (k: string, v: string) => void;
    prefix?: string;
    hint?: string;
    warning?: string;
}) => {
    return (
        <div className="space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{label}</label>
            <div className={`flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2.5 transition-colors ${warning ? 'border-amber-400 dark:border-amber-500' : 'border-slate-200 dark:border-slate-700 focus-within:border-brand-purple'}`}>
                {prefix && <span className="text-brand-purple font-bold text-sm flex-shrink-0">{prefix}</span>}
                <input
                    type="number"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => onChange(k, e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-transparent text-slate-900 dark:text-white text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
            </div>
            {warning && (
                <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40">
                    <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-600 dark:text-amber-400 text-[10px] leading-tight">{warning}</p>
                </div>
            )}
            {hint && !warning && <p className="text-slate-400 text-[10px]">{hint}</p>}
        </div>
    );
});

// ─── Collapsible Section ──────────────────────────────────────────────────────
function CollapsibleSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div>
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-2">
                <span className="text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">{title}</span>
                {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-3 pb-2">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Validation ───────────────────────────────────────────────────────────────
function getWarning(k: string, rawValue: string): string | undefined {
    const val = parseFloat(rawValue || '0') || 0;
    const limit = LIMITS[k];
    if (!limit || val <= limit) return undefined;
    const labels: Record<string, string> = {
        section80C: 'Section 80C',
        section80D: 'Section 80D',
        section80CCD: 'Section 80CCD(1B)',
        homeLoan: 'Home Loan Interest (Sec 24)',
    };
    return `You entered ${fmt(val)} in ${labels[k]}. Maximum allowed is ${fmt(limit)}. Only ${fmt(limit)} will be considered.`;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function IncomeTaxCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('Income_Tax'); }, []);
    const navigate = useNavigate();
    const [regime, setRegime] = useState<'old' | 'new'>('new');
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [inputs, setInputs] = useState<Inputs>({
        basicSalary: '',
        hra: '',
        special: '',
        bonus: '',
        otherIncome: '',
        // Old regime deductions
        section80C: '',
        section80D: '',
        section80CCD: '',
        section80E: '',
        section80G: '',
        homeLoan: '',
        hraReceived: '',
        rentPaid: '',
        isMetro: 'false',
    });

    const set = useCallback((k: string, v: string) => setInputs((p) => ({ ...p, [k]: v })), []);
    const num = useCallback((k: string) => parseFloat(inputs[k] || '0') || 0, [inputs]);

    // ─── Gross Income (always same for both regimes) ──────────────────────────
    const grossSalary = num('basicSalary') + num('hra') + num('special') + num('bonus') + num('otherIncome');

    // ─── HRA Exemption ────────────────────────────────────────────────────────
    const hraExemption = useMemo(() => {
        const hraRcvd = num('hraReceived');
        const rentPaid = num('rentPaid');
        const basic = num('basicSalary');
        const isMetro = inputs.isMetro === 'true';
        if (!rentPaid || !hraRcvd) return 0;
        return Math.max(
            0,
            Math.min(
                hraRcvd,
                rentPaid - basic * 0.1,
                basic * (isMetro ? 0.5 : 0.4)
            )
        );
    }, [inputs, num]);

    // ─── Compute Old Regime Deductions (always, for comparison) ───────────────
    const oldDeductions = useMemo(() => {
        const stdDed = 50000; // Fixed for old regime
        const ded80C = Math.min(num('section80C'), 150000);
        const ded80D = Math.min(num('section80D'), 25000);
        const dedNPS = Math.min(num('section80CCD'), 50000);
        const ded80E = num('section80E');
        const ded80G = num('section80G');
        const dedHL = Math.min(num('homeLoan'), 200000);
        return stdDed + ded80C + ded80D + dedNPS + ded80E + ded80G + dedHL + hraExemption;
    }, [inputs, num, hraExemption]);

    // ─── Compute Both Regimes (always, for comparison) ────────────────────────
    // New regime computation
    const newTaxableIncome = Math.max(0, grossSalary - 75000); // 75k standard deduction
    const newRawTax = computeSlabTax(newTaxableIncome, NEW_REGIME);
    const newAfterRebate = applyRebate87A(newRawTax, newTaxableIncome, 'new');
    const newCess = newAfterRebate * 0.04;
    const newTotalTax = newAfterRebate + newCess;

    // Old regime computation
    const oldTaxableIncome = Math.max(0, grossSalary - oldDeductions);
    const oldRawTax = computeSlabTax(oldTaxableIncome, OLD_REGIME);
    const oldAfterRebate = applyRebate87A(oldRawTax, oldTaxableIncome, 'old');
    const oldCess = oldAfterRebate * 0.04;
    const oldTotalTax = oldAfterRebate + oldCess;

    // Active regime's values
    const activeDeductions = regime === 'new' ? 75000 : oldDeductions;
    const activeTaxableIncome = regime === 'new' ? newTaxableIncome : oldTaxableIncome;
    const activeRawTax = regime === 'new' ? newRawTax : oldRawTax;
    const activeAfterRebate = regime === 'new' ? newAfterRebate : oldAfterRebate;
    const activeCess = regime === 'new' ? newCess : oldCess;
    const activeTotalTax = regime === 'new' ? newTotalTax : oldTotalTax;
    const activeSlabs = regime === 'new' ? NEW_REGIME : OLD_REGIME;

    const monthlyTax = activeTotalTax / 12;
    const monthlyTakeHome = (grossSalary - activeTotalTax) / 12;
    const effectiveRate = grossSalary > 0 ? (activeTotalTax / grossSalary) * 100 : 0;

    // ─── Comparison ───────────────────────────────────────────────────────────
    const betterRegime = oldTotalTax <= newTotalTax ? 'Old' : 'New';
    const saving = Math.abs(oldTotalTax - newTotalTax);
    const maxTax = Math.max(oldTotalTax, newTotalTax, 1);
    const bothZero = oldTotalTax === 0 && newTotalTax === 0;

    // ─── Tax-Saving Tips ──────────────────────────────────────────────────────
    const tips: string[] = useMemo(() => {
        const t: string[] = [];
        if (grossSalary === 0) return t;

        // Show tips for old regime or when new regime has higher tax
        const used80C = Math.min(num('section80C'), 150000);
        if (used80C < 150000) {
            const gap = 150000 - used80C;
            t.push(`You can invest ${fmt(gap)} more under Section 80C (PPF, ELSS, LIC) to reduce taxable income.`);
        }
        const used80D = Math.min(num('section80D'), 25000);
        if (used80D < 25000) {
            t.push(`You can claim health insurance deduction under Section 80D (up to ${fmt(25000 - used80D)} more).`);
        }
        if (!num('section80CCD')) {
            t.push(`You may invest up to Rs 50,000 in NPS under Section 80CCD(1B) for additional deduction.`);
        }
        if (!num('section80E') && !num('homeLoan')) {
            t.push(`Education loan interest (80E) and home loan interest (Sec 24) are additional deductions available.`);
        }
        return t;
    }, [inputs, grossSalary, num]);

    // ─── PDF Handler ──────────────────────────────────────────────────────────
    const handleDownloadPDF = async () => {
        const headers = ['Particulars', 'Amount'];
        const rows: (string | number)[][] = [
            ['--- INCOME SUMMARY ---', ''],
            ['Basic Salary', fmt(num('basicSalary'))],
            ['HRA (House Rent Allowance)', fmt(num('hra'))],
            ['Special Allowance', fmt(num('special'))],
            ['Bonus / Other Allowances', fmt(num('bonus'))],
            ['Other Income', fmt(num('otherIncome'))],
            ['Gross Annual Income', fmt(grossSalary)],
            ['---', ''],
        ];

        if (regime === 'old') {
            rows.push(
                ['--- DEDUCTION SUMMARY ---', ''],
                ['Standard Deduction', fmt(50000)],
                ['Section 80C', fmt(Math.min(num('section80C'), 150000))],
                ['Section 80D', fmt(Math.min(num('section80D'), 25000))],
                ['Section 80CCD(1B) NPS', fmt(Math.min(num('section80CCD'), 50000))],
                ['Section 80E Education Loan', fmt(num('section80E'))],
                ['Section 80G Donations', fmt(num('section80G'))],
                ['Home Loan Interest (Sec 24)', fmt(Math.min(num('homeLoan'), 200000))],
                ['HRA Exemption', fmt(hraExemption)],
                ['Total Deductions', fmt(oldDeductions)],
                ['---', ''],
            );
        } else {
            rows.push(
                ['Standard Deduction (New Regime)', fmt(75000)],
                ['---', ''],
            );
        }

        rows.push(
            ['Taxable Income', fmt(activeTaxableIncome)],
            ['---', ''],
            ['--- TAX SLAB BREAKDOWN ---', ''],
        );
        activeSlabs.forEach((slab) => {
            if (activeTaxableIncome > slab.min) {
                const upper = slab.max === Infinity ? activeTaxableIncome : slab.max;
                const slabAmount = Math.max(0, Math.min(activeTaxableIncome, upper) - slab.min);
                const slabTax = slabAmount * (slab.rate / 100);
                const label = slab.max === Infinity ? `Above ${fmt(slab.min)}` : `${fmt(slab.min)} - ${fmt(slab.max)}`;
                rows.push([`${label} @ ${slab.rate}%`, slab.rate === 0 ? 'Nil' : fmt(slabTax)]);
            }
        });
        rows.push(
            ['---', ''],
            ['Income Tax (Before Cess)', fmt(activeAfterRebate)],
            ['Health & Education Cess (4%)', fmt(activeCess)],
            ['Total Tax Liability', fmt(activeTotalTax)],
            ['---', ''],
            ['--- REGIME COMPARISON ---', ''],
            ['Old Regime Tax', fmt(oldTotalTax)],
            ['New Regime Tax', fmt(newTotalTax)],
            [`Recommended: ${betterRegime} Regime`, saving > 0 ? `Save ${fmt(saving)}` : 'Equal'],
            ['---', ''],
            ['--- MONTHLY TAKE-HOME ---', ''],
            ['Monthly Salary (Gross)', fmt(grossSalary / 12)],
            ['Estimated Monthly Tax', fmt(monthlyTax)],
            ['Estimated Monthly Take-Home', fmt(monthlyTakeHome)],
            ['Annual Take-Home', fmt(grossSalary - activeTotalTax)],
            ['Effective Tax Rate', `${effectiveRate.toFixed(2)}%`],
        );

        await exportToPDF(
            `Income Tax Report - ${regime === 'old' ? 'Old' : 'New'} Regime (FY 2025-26)`,
            headers,
            rows,
            `Income_Tax_Report_FY2025-26`
        );
    };

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-[#0F172A]">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 pt-safe px-4 py-3 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <ArrowLeft size={18} className="text-slate-700 dark:text-white" />
                </button>
                <div>
                    <h1 className="text-slate-900 dark:text-white font-bold text-base">Income Tax Calculator</h1>
                    <p className="text-slate-400 text-[11px]">FY 2025-26 (AY 2026-27)</p>
                </div>
            </div>

            <div className="px-4 pt-4 pb-28 space-y-4">
                {/* Regime Toggle */}
                <div className="flex gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
                    {(['new', 'old'] as const).map((r) => (
                        <motion.button
                            key={r}
                            onClick={() => setRegime(r)}
                            className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${regime === r ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/30' : 'text-slate-400 dark:text-slate-500'}`}
                        >
                            {r === 'new' ? 'New Regime' : 'Old Regime'}
                            <br />
                            <span className="font-normal text-[9px] opacity-80">{r === 'new' ? 'Lower rates' : 'With deductions'}</span>
                        </motion.button>
                    ))}
                </div>

                {/* Income Inputs */}
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Annual Income Details</h3>
                    <InputRow label="Basic Salary" k="basicSalary" value={inputs.basicSalary} onChange={set} />
                    <InputRow label="HRA (House Rent Allowance)" k="hra" value={inputs.hra} onChange={set} />
                    <InputRow label="Special Allowance" k="special" value={inputs.special} onChange={set} />
                    <InputRow label="Bonus & Other Allowances" k="bonus" value={inputs.bonus} onChange={set} />
                    <InputRow label="Other Income (FD interest, rental, etc.)" k="otherIncome" value={inputs.otherIncome} onChange={set} />
                    <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">Gross Annual Income</span>
                        <span className="font-extrabold text-slate-900 dark:text-white text-base">{fmt(grossSalary)}</span>
                    </div>
                </div>

                {/* Deductions */}
                {regime === 'old' ? (
                    <>
                        {/* HRA Exemption */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                            <CollapsibleSection title="Housing Benefits">
                                <InputRow label="HRA Received (Annual)" k="hraReceived" value={inputs.hraReceived} onChange={set} />
                                <InputRow label="Rent Paid (Annual)" k="rentPaid" value={inputs.rentPaid} onChange={set} />
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={inputs.isMetro === 'true'}
                                        onChange={(e) => set('isMetro', e.target.checked ? 'true' : 'false')}
                                        className="w-4 h-4 accent-brand-purple"
                                    />
                                    <span className="text-slate-600 dark:text-slate-400 text-xs">Metro city (Mumbai, Delhi, Kolkata, Chennai)</span>
                                </label>
                                <div className="bg-brand-green/10 border border-brand-green/20 rounded-xl p-3 flex justify-between">
                                    <span className="text-brand-green text-xs font-semibold">HRA Exemption</span>
                                    <span className="text-brand-green font-bold text-sm">{fmt(hraExemption)}</span>
                                </div>
                                <InputRow
                                    label="Home Loan Interest (Section 24)"
                                    k="homeLoan"
                                    value={inputs.homeLoan}
                                    onChange={set}
                                    hint="Max Rs 2,00,000"
                                    warning={getWarning('homeLoan', inputs.homeLoan)}
                                />
                            </CollapsibleSection>
                        </div>

                        {/* Section Deductions */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-1">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-2">Deductions (Old Regime)</h3>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex justify-between items-center">
                                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Standard Deduction</span>
                                <span className="font-bold text-brand-purple text-sm">{fmt(50000)}</span>
                            </div>

                            <CollapsibleSection title="Investment Deductions">
                                <InputRow
                                    label="Section 80C (PPF, ELSS, LIC, etc.)"
                                    k="section80C"
                                    value={inputs.section80C}
                                    onChange={set}
                                    hint="Max Rs 1,50,000"
                                    warning={getWarning('section80C', inputs.section80C)}
                                />
                                <InputRow
                                    label="Section 80CCD(1B) — NPS"
                                    k="section80CCD"
                                    value={inputs.section80CCD}
                                    onChange={set}
                                    hint="Max Rs 50,000"
                                    warning={getWarning('section80CCD', inputs.section80CCD)}
                                />
                            </CollapsibleSection>

                            <CollapsibleSection title="Insurance & Medical">
                                <InputRow
                                    label="Section 80D (Health Insurance)"
                                    k="section80D"
                                    value={inputs.section80D}
                                    onChange={set}
                                    hint="Max Rs 25,000 (self & family)"
                                    warning={getWarning('section80D', inputs.section80D)}
                                />
                            </CollapsibleSection>

                            <CollapsibleSection title="Additional Deductions">
                                <InputRow label="Section 80E (Education Loan Interest)" k="section80E" value={inputs.section80E} onChange={set} hint="No upper limit" />
                                <InputRow label="Section 80G (Donations)" k="section80G" value={inputs.section80G} onChange={set} hint="Amount varies by donee" />
                            </CollapsibleSection>

                            <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex justify-between items-center">
                                <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Deductions</span>
                                <span className="font-extrabold text-brand-green text-base">-{fmt(oldDeductions)}</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-brand-purple/5 border border-brand-purple/20 rounded-2xl p-4 space-y-2">
                        <div className="flex gap-3">
                            <Info size={18} className="text-brand-purple flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-brand-purple font-semibold text-sm">New Regime — Standard Deduction: Rs 75,000</p>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                                    Lower slab rates but no manual deductions (HRA, 80C, etc.) except the Rs 75,000 standard deduction applied automatically.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-brand-purple/10">
                            <span className="text-slate-500 text-xs">Taxable Income</span>
                            <span className="font-bold text-brand-purple text-sm">{fmt(newTaxableIncome)}</span>
                        </div>
                    </div>
                )}

                {/* ════════ Results (only when gross > 0) ════════ */}
                {grossSalary > 0 && (
                    <>
                        {/* Tax Summary Hero Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-3xl p-6 text-white shadow-xl ${activeTotalTax === 0
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                : 'bg-gradient-to-br from-red-500 to-orange-600'
                                }`}
                        >
                            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
                                {regime === 'old' ? 'Old Regime' : 'New Regime'} — Total Tax
                            </p>
                            <h2 className="text-4xl font-extrabold">
                                {activeTotalTax === 0 ? 'NIL' : fmt(activeTotalTax)}
                            </h2>
                            <p className="text-white/60 text-sm mt-1">
                                {activeTotalTax === 0 ? 'No tax due — Income within exemption limit' : 'Annual Tax Liability'}
                            </p>
                            <div className="grid grid-cols-3 gap-3 mt-4">
                                {[
                                    { label: 'Monthly TDS', value: fmt(monthlyTax) },
                                    { label: 'Eff. Rate', value: `${effectiveRate.toFixed(1)}%` },
                                    { label: 'Taxable', value: fmt(activeTaxableIncome) },
                                ].map((s) => (
                                    <div key={s.label} className="bg-white/10 rounded-xl p-2.5 text-center">
                                        <p className="text-white/60 text-[9px] uppercase font-bold tracking-wider mb-0.5">{s.label}</p>
                                        <p className="text-white font-bold text-xs">{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Step-by-Step Breakdown */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Step-by-Step Breakdown</h3>
                            {[
                                { label: 'Gross Annual Income', val: grossSalary, color: 'text-brand-green' },
                                { label: 'Less: Deductions', val: -activeDeductions, color: 'text-blue-400' },
                                { label: 'Taxable Income', val: activeTaxableIncome, color: 'text-brand-purple', bold: true },
                                { label: `Income Tax (before rebate)`, val: activeRawTax, color: 'text-slate-500' },
                                { label: `Income Tax (after rebate)`, val: activeAfterRebate, color: 'text-red-400' },
                                { label: 'Health & Education Cess (4%)', val: activeCess, color: 'text-orange-400' },
                                { label: 'Final Tax Liability', val: activeTotalTax, color: 'text-red-500', bold: true },
                            ].map((row) => (
                                <div key={row.label} className={`flex justify-between items-center py-2 ${row.bold ? 'border-t border-slate-100 dark:border-white/10 mt-1' : ''}`}>
                                    <span className={`text-slate-500 dark:text-slate-400 text-xs ${row.bold ? 'font-bold text-slate-700 dark:text-white' : ''}`}>{row.label}</span>
                                    <span className={`font-bold text-sm ${row.color}`}>{row.val < 0 ? '-' : ''}{fmt(Math.abs(row.val))}</span>
                                </div>
                            ))}
                        </div>

                        {/* Slab Breakdown */}
                        {activeTaxableIncome > 0 && (
                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Tax Slab Computation</h3>
                                <div className="space-y-2">
                                    {activeSlabs.map((slab, i) => {
                                        if (activeTaxableIncome <= slab.min) return null;
                                        const upper = slab.max === Infinity ? activeTaxableIncome : slab.max;
                                        const slabAmount = Math.max(0, Math.min(activeTaxableIncome, upper) - slab.min);
                                        const slabTax = slabAmount * (slab.rate / 100);
                                        return (
                                            <div key={i} className={`flex justify-between p-2 rounded-lg ${slab.rate === 0 ? 'bg-green-50 dark:bg-green-900/10' : slab.rate >= 30 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {slab.max === Infinity ? `Above ${fmt(slab.min)}` : `${fmt(slab.min)} - ${fmt(slab.max)}`}
                                                    <span className="ml-2 font-bold text-slate-700 dark:text-slate-300">@ {slab.rate}%</span>
                                                </span>
                                                <span className="text-xs font-bold text-slate-800 dark:text-white">{slab.rate === 0 ? 'Nil' : fmt(slabTax)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Monthly Take-Home */}
                        <div className="bg-brand-green/10 border border-brand-green/20 rounded-2xl p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-brand-green text-xs font-semibold uppercase tracking-wider">Monthly Take-Home</p>
                                    <p className="text-3xl font-extrabold text-brand-green mt-1">{fmt(monthlyTakeHome)}</p>
                                </div>
                                <TrendingUp className="w-12 h-12 text-brand-green opacity-30" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-brand-green/20">
                                {[
                                    { label: 'Monthly Salary', value: fmt(grossSalary / 12), color: 'text-brand-green' },
                                    { label: 'Monthly Tax', value: fmt(monthlyTax), color: 'text-red-400' },
                                    { label: 'Annual Take-Home', value: fmt(grossSalary - activeTotalTax), color: 'text-brand-green' },
                                    { label: 'Effective Tax Rate', value: `${effectiveRate.toFixed(1)}%`, color: 'text-brand-purple' },
                                ].map((item) => (
                                    <div key={item.label} className="text-center bg-white/50 dark:bg-white/5 rounded-xl p-2.5">
                                        <p className="text-brand-green/60 text-[9px] uppercase font-bold">{item.label}</p>
                                        <p className={`${item.color} font-bold text-xs mt-0.5`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ═══ Regime Comparison ═══ */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Old vs New Regime</h3>

                            {/* Summary Table */}
                            <div className="space-y-2 mb-4">
                                {/* Old Regime Row */}
                                <div className={`flex items-center justify-between p-3 rounded-xl border-2 ${betterRegime === 'Old' && !bothZero ? 'border-brand-green bg-brand-green/5' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
                                    <div className="flex items-center gap-2">
                                        {betterRegime === 'Old' && !bothZero && (
                                            <span className="w-5 h-5 rounded-full bg-brand-green flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                                        )}
                                        <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Old Regime</span>
                                    </div>
                                    <span className={`font-extrabold text-sm ${betterRegime === 'Old' && !bothZero ? 'text-brand-green' : 'text-slate-700 dark:text-white'}`}>
                                        {oldTotalTax === 0 ? 'NIL' : fmt(oldTotalTax)}
                                    </span>
                                </div>

                                {/* New Regime Row */}
                                <div className={`flex items-center justify-between p-3 rounded-xl border-2 ${betterRegime === 'New' && !bothZero ? 'border-brand-green bg-brand-green/5' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
                                    <div className="flex items-center gap-2">
                                        {betterRegime === 'New' && !bothZero && (
                                            <span className="w-5 h-5 rounded-full bg-brand-green flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                                        )}
                                        <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">New Regime</span>
                                    </div>
                                    <span className={`font-extrabold text-sm ${betterRegime === 'New' && !bothZero ? 'text-brand-green' : 'text-slate-700 dark:text-white'}`}>
                                        {newTotalTax === 0 ? 'NIL' : fmt(newTotalTax)}
                                    </span>
                                </div>
                            </div>

                            {/* Visual Bars */}
                            {!bothZero && (
                                <div className="space-y-2 mb-4">
                                    <div>
                                        <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.max((oldTotalTax / maxTax) * 100, 2)}%` }}
                                                transition={{ duration: 0.6 }}
                                                className={`h-full rounded-full ${betterRegime === 'Old' ? 'bg-brand-green' : 'bg-red-400'}`}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.max((newTotalTax / maxTax) * 100, 2)}%` }}
                                                transition={{ duration: 0.6, delay: 0.1 }}
                                                className={`h-full rounded-full ${betterRegime === 'New' ? 'bg-brand-green' : 'bg-red-400'}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Recommendation */}
                            <div className={`p-4 rounded-xl text-center ${bothZero ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-700/30' : 'bg-brand-green/10 border border-brand-green/20'}`}>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Recommended Regime</p>
                                {bothZero ? (
                                    <>
                                        <p className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400">NO TAX DUE</p>
                                        <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1">
                                            Your income is within the exemption limit under both regimes.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-extrabold text-lg text-brand-green">{betterRegime.toUpperCase()} REGIME</p>
                                        <p className="text-brand-green text-xs mt-1">Estimated Tax Saving: {fmt(saving)}</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Tax-Saving Suggestions */}
                        {tips.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/40 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Lightbulb size={16} className="text-amber-600" />
                                    <h3 className="font-bold text-amber-800 dark:text-amber-400 text-sm">Tax-Saving Suggestions</h3>
                                </div>
                                <div className="space-y-2">
                                    {tips.map((tip, i) => (
                                        <p key={i} className="text-amber-700 dark:text-amber-300 text-xs leading-relaxed flex gap-2">
                                            <span className="text-amber-500 font-bold flex-shrink-0">{i + 1}.</span>
                                            {tip}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Download Button */}
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={handleDownloadPDF}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-purple text-white font-bold shadow-lg shadow-brand-purple/30"
                        >
                            <Download size={18} /> Download Tax Report (PDF)
                        </motion.button>
                    </>
                )}

                {/* Collapsible Disclaimer */}
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/40 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setShowDisclaimer(!showDisclaimer)}
                        className="w-full flex items-center justify-between p-4"
                    >
                        <div className="flex items-center gap-2">
                            <Info size={16} className="text-amber-600" />
                            <span className="font-bold text-amber-800 dark:text-amber-400 text-sm">Important Disclaimer</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-amber-500 text-[10px]">Tap to View</span>
                            {showDisclaimer ? <ChevronUp size={14} className="text-amber-500" /> : <ChevronDown size={14} className="text-amber-500" />}
                        </div>
                    </button>
                    <AnimatePresence>
                        {showDisclaimer && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-4">
                                    <p className="text-amber-700 dark:text-amber-300 text-xs leading-relaxed">
                                        This calculator provides estimates for FY 2025-26 based on the Finance Act 2025. Actual tax liability may vary depending on your complete financial profile, surcharges, or special circumstances. Please consult a{' '}
                                        <strong>Chartered Accountant</strong> for precise tax planning or visit the official portal.
                                    </p>
                                    <a
                                        href="https://www.incometax.gov.in"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-amber-700 dark:text-amber-400 text-xs font-semibold mt-2"
                                    >
                                        <ExternalLink size={12} /> incometax.gov.in (Official Portal)
                                    </a>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}