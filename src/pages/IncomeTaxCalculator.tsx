import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, TrendingDown, TrendingUp, Download, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToPDF } from '../utils/exportUtils';

// ─── Slab Tables ──────────────────────────────────────────────────────────────
const OLD_REGIME = [
    { min: 0, max: 250000, rate: 0 },
    { min: 250000, max: 500000, rate: 5 },
    { min: 500000, max: 1000000, rate: 20 },
    { min: 1000000, max: Infinity, rate: 30 },
];

const NEW_REGIME = [
    { min: 0, max: 300000, rate: 0 },
    { min: 300000, max: 700000, rate: 5 },
    { min: 700000, max: 1000000, rate: 10 },
    { min: 1000000, max: 1200000, rate: 15 },
    { min: 1200000, max: 1500000, rate: 20 },
    { min: 1500000, max: Infinity, rate: 30 },
];

function computeSlabTax(income: number, slabs: typeof OLD_REGIME): number {
    let tax = 0;
    for (const slab of slabs) {
        if (income > slab.min) {
            tax += (Math.min(income, slab.max === Infinity ? income : slab.max) - slab.min) * (slab.rate / 100);
        }
    }
    return tax;
}

function applyRebate87A(tax: number, taxableIncome: number, regime: 'old' | 'new'): number {
    const limit = regime === 'new' ? 1200000 : 500000;
    if (taxableIncome <= limit) return 0;
    return Math.max(0, tax - (regime === 'new' ? 60000 : 12500));
}

const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

type Inputs = Record<string, string>;

export default function IncomeTaxCalculator() {
    const navigate = useNavigate();
    const [regime, setRegime] = useState<'old' | 'new'>('new');
    const [inputs, setInputs] = useState<Inputs>({
        basicSalary: '',
        hra: '',
        special: '',
        bonus: '',
        otherIncome: '',
        standardDeduction: '75000',
        section80C: '',
        section80D: '',
        section80CCD: '',
        homeLoan: '',
        hraReceived: '',
        rentPaid: '',
        isMetro: 'false',
    });

    const set = (k: string, v: string) => setInputs((p) => ({ ...p, [k]: v }));
    const num = (k: string) => parseFloat(inputs[k] || '0') || 0;

    const grossSalary = num('basicSalary') + num('hra') + num('special') + num('bonus') + num('otherIncome');

    // HRA Exemption (Old Regime)
    const hraExemption = useMemo(() => {
        if (regime === 'new') return 0;
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputs, regime]);

    const totalDeductions = useMemo(() => {
        if (regime === 'new') return num('standardDeduction');
        return (
            num('standardDeduction') +
            Math.min(num('section80C'), 150000) +
            Math.min(num('section80D'), 50000) +
            Math.min(num('section80CCD'), 50000) +
            Math.min(num('homeLoan'), 200000) +
            hraExemption
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputs, regime, hraExemption]);

    const taxableIncome = Math.max(0, grossSalary - totalDeductions);

    const slabs = regime === 'old' ? OLD_REGIME : NEW_REGIME;
    const rawTax = computeSlabTax(taxableIncome, slabs);
    const afterRebate = applyRebate87A(rawTax, taxableIncome, regime);
    const cess = afterRebate * 0.04;
    const totalTax = afterRebate + cess;
    const monthlyTax = totalTax / 12;
    const monthlyTakeHome = (grossSalary - totalTax) / 12;
    const effectiveRate = grossSalary > 0 ? (totalTax / grossSalary) * 100 : 0;

    // New regime tax for comparison
    const newTaxableIncome = Math.max(0, grossSalary - 75000);
    const newRaw = computeSlabTax(newTaxableIncome, NEW_REGIME);
    const newAfter = applyRebate87A(newRaw, newTaxableIncome, 'new');
    const newTax = (newAfter + newAfter * 0.04);
    const saving = regime === 'old' ? Math.max(0, totalTax - newTax) : Math.max(0, newTax - totalTax);
    const betterRegime = regime === 'old' ? (totalTax <= newTax ? 'Old' : 'New') : (newTax <= totalTax ? 'New' : 'Old');

    const currentStdDeduction = regime === 'new' ? 75000 : 50000;

    const handleDownloadPDF = async () => {
        const headers = ['Particulars', 'Amount'];
        const rows = [
            ['Gross Annual Income', fmt(grossSalary)],
            ['Total Deductions', `-${fmt(totalDeductions)}`],
            ['Taxable Income', fmt(taxableIncome)],
            ['Income Tax', fmt(afterRebate)],
            ['Health & Education Cess (4%)', fmt(cess)],
            ['Total Tax Liability', fmt(totalTax)],
            ['Monthly Tax (TDS)', fmt(monthlyTax)],
            ['Annual Take-Home', fmt(grossSalary - totalTax)],
            ['Monthly Take-Home', fmt(monthlyTakeHome)],
            ['Effective Tax Rate', `${effectiveRate.toFixed(2)}%`],
        ];
        await exportToPDF(`Income Tax Report — ${regime === 'old' ? 'Old' : 'New'} Regime`, headers, rows, `Income_Tax_Report_FY2025-26`);
    };

    const InputRow = ({ label, k, prefix = '₹', hint }: { label: string; k: string; prefix?: string; hint?: string }) => (
        <div className="space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{label}</label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus-within:border-brand-purple transition-colors">
                {prefix && <span className="text-brand-purple font-bold text-sm flex-shrink-0">{prefix}</span>}
                <input
                    type="number"
                    value={inputs[k]}
                    onChange={(e) => set(k, e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-transparent text-slate-900 dark:text-white text-sm font-semibold outline-none"
                />
            </div>
            {hint && <p className="text-slate-400 text-[10px]">{hint}</p>}
        </div>
    );

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
                            onClick={() => {
                                setInputs((p) => ({ ...p, standardDeduction: r === 'new' ? '75000' : '50000' }));
                                setRegime(r);
                            }}
                            className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${regime === r ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/30' : 'text-slate-400 dark:text-slate-500'}`}
                        >
                            {r === 'new' ? '⚡ New Regime' : '📋 Old Regime'}
                            <br />
                            <span className="font-normal text-[9px] opacity-80">{r === 'new' ? 'Lower rates' : 'With deductions'}</span>
                        </motion.button>
                    ))}
                </div>

                {/* Income Inputs */}
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Annual Income Details</h3>
                    <InputRow label="💰 Basic Salary" k="basicSalary" />
                    <InputRow label="🏠 HRA (House Rent Allowance)" k="hra" />
                    <InputRow label="💵 Special Allowance" k="special" />
                    <InputRow label="🎁 Bonus & Other Allowances" k="bonus" />
                    <InputRow label="📊 Other Income (FD interest, etc.)" k="otherIncome" />
                    <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">Gross Annual Income</span>
                        <span className="font-extrabold text-slate-900 dark:text-white text-base">{fmt(grossSalary)}</span>
                    </div>
                </div>

                {/* Deductions */}
                {regime === 'old' ? (
                    <>
                        {/* HRA Exemption Calc */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">🏠 HRA Exemption Calculator</h3>
                            <InputRow label="HRA Received (Annual)" k="hraReceived" />
                            <InputRow label="Rent Paid (Annual)" k="rentPaid" />
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={inputs.isMetro === 'true'}
                                    onChange={(e) => set('isMetro', e.target.checked ? 'true' : 'false')}
                                    className="w-4 h-4 accent-brand-purple"
                                />
                                <span className="text-slate-600 dark:text-slate-400 text-xs">Living in Metro city (Mumbai, Delhi, Kolkata, Chennai)</span>
                            </label>
                            <div className="bg-brand-green/10 border border-brand-green/20 rounded-xl p-3 flex justify-between">
                                <span className="text-brand-green text-xs font-semibold">HRA Exemption</span>
                                <span className="text-brand-green font-bold text-sm">{fmt(hraExemption)}</span>
                            </div>
                        </div>

                        {/* Section Deductions */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Deductions (Old Regime)</h3>
                            <InputRow label="📋 Standard Deduction" k="standardDeduction" hint="Fixed Rs 50,000 for Old Regime" />
                            <InputRow label="💰 Section 80C (PPF, ELSS, LIC)" k="section80C" hint="Max Rs 1,50,000" />
                            <InputRow label="🏥 Section 80D (Health Insurance)" k="section80D" hint="Max Rs 25,000 (Rs 50,000 for senior citizens)" />
                            <InputRow label="💼 Section 80CCD(1B) — NPS" k="section80CCD" hint="Max Rs 50,000" />
                            <InputRow label="🏠 Home Loan Interest (Sec 24)" k="homeLoan" hint="Max Rs 2,00,000" />
                            <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex justify-between items-center">
                                <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Deductions</span>
                                <span className="font-extrabold text-brand-green text-base">-{fmt(totalDeductions)}</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-brand-purple/5 border border-brand-purple/20 rounded-2xl p-4 flex gap-3">
                        <Info size={18} className="text-brand-purple flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-brand-purple font-semibold text-sm">New Regime — Standard Deduction: Rs 75,000</p>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                                The New Regime has lower slab rates but no manual deductions (HRA, 80C, etc.) except the Rs 75,000 standard deduction and NPS (employer contribution).
                            </p>
                        </div>
                    </div>
                )}

                {/* Results — show when there's income */}
                {grossSalary > 0 && (
                    <>
                        {/* Tax Breakdown Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-br from-red-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl"
                        >
                            <p className="text-orange-100 text-xs font-semibold uppercase tracking-wider mb-1">
                                {regime === 'old' ? 'Old Regime' : 'New Regime'} — Total Tax
                            </p>
                            <h2 className="text-4xl font-extrabold">{fmt(totalTax)}</h2>
                            <p className="text-orange-200 text-sm mt-1">Annual Tax Liability</p>
                            <div className="grid grid-cols-3 gap-3 mt-4">
                                {[
                                    { label: 'Monthly TDS', value: fmt(monthlyTax) },
                                    { label: 'Eff. Rate', value: `${effectiveRate.toFixed(1)}%` },
                                    { label: 'Taxable', value: fmt(taxableIncome) },
                                ].map((s) => (
                                    <div key={s.label} className="bg-white/10 rounded-xl p-2.5 text-center">
                                        <p className="text-orange-200 text-[9px] uppercase font-bold tracking-wider mb-0.5">{s.label}</p>
                                        <p className="text-white font-bold text-xs">{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Step-by-step Breakdown */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">📊 Step-by-Step Breakdown</h3>
                            {[
                                { label: 'Gross Annual Income', val: grossSalary, color: 'text-brand-green' },
                                { label: 'Less: Deductions', val: -totalDeductions, color: 'text-blue-400' },
                                { label: 'Taxable Income', val: taxableIncome, color: 'text-brand-purple', bold: true },
                                { label: `Income Tax (${regime === 'old' ? 'Old' : 'New'} Regime)`, val: afterRebate, color: 'text-red-400' },
                                { label: 'Health & Education Cess (4%)', val: cess, color: 'text-orange-400' },
                                { label: 'Total Tax', val: totalTax, color: 'text-red-500', bold: true },
                            ].map((row) => (
                                <div key={row.label} className={`flex justify-between items-center py-2 ${row.bold ? 'border-t border-slate-100 dark:border-white/10 mt-1' : ''}`}>
                                    <span className={`text-slate-500 dark:text-slate-400 text-xs ${row.bold ? 'font-bold text-slate-700 dark:text-white' : ''}`}>{row.label}</span>
                                    <span className={`font-bold text-sm ${row.color}`}>{row.val < 0 ? '-' : ''}{fmt(Math.abs(row.val))}</span>
                                </div>
                            ))}
                        </div>

                        {/* Slab Breakdown */}
                        {taxableIncome > 0 && (
                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">🧮 Tax Slab Computation</h3>
                                <div className="space-y-2">
                                    {slabs.map((slab, i) => {
                                        const slabAmount = Math.max(0, Math.min(taxableIncome, slab.max === Infinity ? taxableIncome : slab.max) - slab.min);
                                        const slabTax = slabAmount * (slab.rate / 100);
                                        if (taxableIncome <= slab.min) return null;
                                        return (
                                            <div key={i} className={`flex justify-between p-2 rounded-lg ${slab.rate === 0 ? 'bg-green-50 dark:bg-green-900/10' : slab.rate >= 30 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {slab.max === Infinity ? `Above ${fmt(slab.min)}` : `${fmt(slab.min)} – ${fmt(slab.max)}`}
                                                    <span className="ml-2 font-bold text-slate-700 dark:text-slate-300">@ {slab.rate}%</span>
                                                </span>
                                                <span className="text-xs font-bold text-slate-800 dark:text-white">{slab.rate === 0 ? 'Nil' : fmt(slabTax)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Take Home */}
                        <div className="bg-brand-green/10 border border-brand-green/20 rounded-2xl p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-brand-green text-xs font-semibold uppercase tracking-wider">Monthly Take-Home</p>
                                    <p className="text-3xl font-extrabold text-brand-green mt-1">{fmt(monthlyTakeHome)}</p>
                                </div>
                                <TrendingUp className="w-12 h-12 text-brand-green opacity-30" />
                            </div>
                            <div className="flex justify-between mt-3 pt-3 border-t border-brand-green/20">
                                <span className="text-brand-green/70 text-xs">Annual Take-Home</span>
                                <span className="text-brand-green font-bold">{fmt(grossSalary - totalTax)}</span>
                            </div>
                        </div>

                        {/* Regime Comparison */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">⚖️ Old vs New Regime Comparison</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Old Regime', tax: regime === 'old' ? totalTax : newTax + (totalTax - newTax), active: regime === 'old' },
                                    { label: 'New Regime', tax: regime === 'new' ? totalTax : newTax, active: regime === 'new' },
                                ].map((row) => (
                                    <div key={row.label} className={`p-3 rounded-xl text-center ${row.active ? 'bg-brand-purple text-white' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                        <p className={`text-[10px] font-bold uppercase ${row.active ? 'text-purple-200' : 'text-slate-400'}`}>{row.label}</p>
                                        <p className={`font-extrabold text-lg mt-1 ${row.active ? 'text-white' : 'text-slate-700 dark:text-white'}`}>{fmt(row.tax)}</p>
                                        {row.active && <p className="text-purple-200 text-[9px] mt-0.5">Currently selected</p>}
                                    </div>
                                ))}
                            </div>
                            <div className={`mt-3 p-3 rounded-xl text-sm font-medium text-center ${betterRegime === regime.charAt(0).toUpperCase() + regime.slice(1) ? 'bg-green-50 dark:bg-green-900/20 text-brand-green' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'}`}>
                                {betterRegime === regime.charAt(0).toUpperCase() + regime.slice(1)
                                    ? `✅ You're using the better regime! Save ${fmt(saving)} vs the other.`
                                    : `💡 Consider switching to ${betterRegime} Regime to save ${fmt(saving)}`}
                            </div>
                        </div>

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

                {/* Disclaimer */}
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/40 rounded-2xl p-4 flex gap-3">
                    <Info size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm mb-1">Important Disclaimer</h4>
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
                </div>
            </div>
        </div>
    );
}
