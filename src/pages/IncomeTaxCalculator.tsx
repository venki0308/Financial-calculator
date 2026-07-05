import { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Info, TrendingUp, Download, ExternalLink, ChevronDown, ChevronUp, Lightbulb, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import { AnalyticsService } from '../lib/analytics';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { useHistoryTracker } from '../hooks/useHistoryTracker';


// ─── Tax Slab Tables ──────────────────────────────────────────────────────────
const OLD_REGIME = [
    { min: 0, max: 250000, rate: 0 },
    { min: 250000, max: 500000, rate: 5 },
    { min: 500000, max: 1000000, rate: 20 },
    { min: 1000000, max: Infinity, rate: 30 },
];

// Old regime — Senior Citizen (60-79). Higher basic exemption ₹3L.
const OLD_REGIME_SENIOR = [
    { min: 0, max: 300000, rate: 0 },
    { min: 300000, max: 500000, rate: 5 },
    { min: 500000, max: 1000000, rate: 20 },
    { min: 1000000, max: Infinity, rate: 30 },
];

// Old regime — Super Senior (80+). Higher basic exemption ₹5L (no 5% slab).
const OLD_REGIME_SUPER_SENIOR = [
    { min: 0, max: 500000, rate: 0 },
    { min: 500000, max: 1000000, rate: 20 },
    { min: 1000000, max: Infinity, rate: 30 },
];

// Union Budget 2026-27 — New Regime Slabs (FY 2026-27)
const NEW_REGIME_2026_27 = [
    { min: 0, max: 400000, rate: 0 },
    { min: 400000, max: 800000, rate: 5 },
    { min: 800000, max: 1200000, rate: 10 },
    { min: 1200000, max: 1600000, rate: 15 },
    { min: 1600000, max: 2000000, rate: 20 },
    { min: 2000000, max: 2400000, rate: 25 },
    { min: 2400000, max: Infinity, rate: 30 },
];

// FY 2025-26 New Regime (same bracket structure, different 87A rebate)
const NEW_REGIME_2025_26 = [
    { min: 0, max: 400000, rate: 0 },
    { min: 400000, max: 800000, rate: 5 },
    { min: 800000, max: 1200000, rate: 10 },
    { min: 1200000, max: 1600000, rate: 15 },
    { min: 1600000, max: 2000000, rate: 20 },
    { min: 2000000, max: 2400000, rate: 25 },
    { min: 2400000, max: Infinity, rate: 30 },
];

// Deduction limits for validation
const LIMITS: Record<string, number> = {
    section80C: 150000,
    section80D: 25000,
    section80CCD: 50000,
    homeLoan: 200000,
};

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

// Section 87A rebate + marginal relief.
// Without marginal relief, a user at ₹12.1L taxable pays ₹61,500 while at
// ₹12L they pay ₹0 — a cliff of ₹61K on ₹10K of income. Every top Indian
// tax calculator (ClearTax, Groww, BankBazaar) handles this; we must too.
function applyRebate87A(tax: number, taxableIncome: number, regime: 'old' | 'new', _fy: '2026-27' | '2025-26'): number {
    if (regime === 'new') {
        const threshold = 1200000;
        if (taxableIncome <= threshold) return 0;
        // Marginal relief: tax payable must not exceed the income above the
        // rebate threshold. Prevents the ₹0→₹61K cliff at ₹12L boundary.
        const excess = taxableIncome - threshold;
        return Math.min(tax, excess);
    } else {
        // Old-regime 87A is a strict cliff: full rebate (max ₹12,500) at taxable
        // income ≤ ₹5L, nothing above it. Marginal relief on the 87A rebate exists
        // ONLY in the new regime (introduced by Budget 2023 for 115BAC).
        return taxableIncome <= 500000 ? 0 : tax;
    }
}

// Surcharge with marginal relief — old regime has 37% tier (>₹5Cr); new regime capped at 25%.
// Marginal relief (law-mandated): tax + surcharge cannot exceed
// (tax at the threshold, with the lower tier's surcharge) + (income above the threshold).
function computeSurcharge(tax: number, taxableIncome: number, regime: 'old' | 'new', slabs: typeof OLD_REGIME): number {
    if (tax <= 0) return 0;
    let rate = 0, threshold = 0, prevRate = 0;
    if (regime === 'old' && taxableIncome > 50000000) { rate = 0.37; threshold = 50000000; prevRate = 0.25; } // >₹5Cr (old only)
    else if (taxableIncome > 20000000) { rate = 0.25; threshold = 20000000; prevRate = 0.15; } // >₹2Cr
    else if (taxableIncome > 10000000) { rate = 0.15; threshold = 10000000; prevRate = 0.10; } // >₹1Cr
    else if (taxableIncome > 5000000)  { rate = 0.10; threshold = 5000000;  prevRate = 0;    } // >₹50L
    else return 0;
    const surcharge = tax * rate;
    const taxAtThreshold = computeSlabTax(threshold, slabs);
    const maxTotal = taxAtThreshold * (1 + prevRate) + (taxableIncome - threshold);
    return tax + surcharge > maxTotal ? Math.max(0, maxTotal - tax) : surcharge;
}

const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

type Inputs = Record<string, string>;

// ─── Input Row with validation ────────────────────────────────────────────────
const InputRow = memo(({ label, k, value, onChange, prefix = '₹', hint, warning }: {
    label: string;
    k: string;
    value: string;
    onChange: (k: string, v: string) => void;
    prefix?: string;
    hint?: string;
    warning?: string;
}) => (
    <div className="space-y-1">
        <label className="text-muted-foreground dark:text-muted-foreground text-xs font-semibold">{label}</label>
        <div className={`flex items-center gap-2 bg-slate-50 dark:bg-card border-border border rounded-xl px-3 py-2.5 transition-colors ${warning ? 'border-amber-400 dark:border-amber-500' : 'border-border focus-within:border-brand-purple'}`}>
            {prefix && <span className="text-brand-purple font-bold text-sm flex-shrink-0">{prefix}</span>}
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
                value={value}
                onChange={(e) => onChange(k, e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent text-slate-900 dark:text-foreground text-sm font-semibold outline-none"
            />
        </div>
        {warning && (
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40">
                <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-amber-600 dark:text-amber-400 text-[10px] leading-tight">{warning}</p>
            </div>
        )}
        {hint && !warning && <p className="text-muted-foreground text-[10px]">{hint}</p>}
    </div>
));

// ─── Collapsible Section ──────────────────────────────────────────────────────
function CollapsibleSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div>
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-2">
                <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">{title}</span>
                {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="space-y-3 pb-2">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Validation ───────────────────────────────────────────────────────────────
function getWarning(k: string, rawValue: string, t: (key: string, opts?: Record<string, unknown>) => string): string | undefined {
    const val = parseFloat(rawValue || '0') || 0;
    const limit = LIMITS[k];
    if (!limit || val <= limit) return undefined;
    const labelKeys: Record<string, string> = {
        section80C: 'tax.warningLabelSec80C',
        section80D: 'tax.warningLabelSec80D',
        section80CCD: 'tax.warningLabelSec80CCD',
        homeLoan: 'tax.warningLabelHomeLoan',
    };
    return t('tax.warningExceeded', { value: fmt(val), label: t(labelKeys[k]), limit: fmt(limit) });
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function IncomeTaxCalculator() {
    const { t } = useTranslation();
    useEffect(() => { AnalyticsService.trackScreen('Income_Tax'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const [regime, setRegime] = useState<'old' | 'new'>('new');
    const [fy, setFy] = useState<'2026-27' | '2025-26'>('2026-27');
    // Age category drives the OLD-regime basic exemption.
    //  • below_60   : ₹2.5L exemption (default)
    //  • senior     : 60+ → ₹3L exemption
    //  • super_senior: 80+ → ₹5L exemption
    // New regime ignores this since slabs are uniform across ages.
    const [ageCategory, setAgeCategory] = useState<'below_60' | 'senior' | 'super_senior'>('below_60');
    const [inputMode, setInputMode] = useState<'monthly' | 'annual' | 'ctc' | 'payslip'>('monthly');
    const [inputs, setInputs] = useState<Inputs>({
        basicSalary: '',
        da: '',
        hra: '',
        special: '',
        lta: '',
        bonus: '',
        otherIncome: '',
        // New allowance fields
        transportAllowance: '',
        medicalAllowance: '',
        foodAllowance: '',
        // Payroll deductions
        employeePF: '',
        professionalTax: '',
        esi: '',
        npsEmployee: '',
        // CTC fields
        ctcAmount: '',
        employerPF: '',
        gratuity: '',
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
        // Children's allowances (Old Regime, Sec 10(14))
        childEducationAllowance: '',
        childHostelAllowance: '',
        // Variable / performance pay (fully taxable)
        variablePay: '',
        annualBonus: '',
    });

    const set = useCallback((k: string, v: string) => setInputs((p) => ({ ...p, [k]: v })), []);
    const num = useCallback((k: string) => parseFloat(inputs[k] || '0') || 0, [inputs]);

    // ─── Multiplier for monthly→annual conversion ─────────────────────────────
    const multiplier = (inputMode === 'monthly' || inputMode === 'payslip') ? 12 : 1;

    // ─── CTC Auto-compute ─────────────────────────────────────────────────────
    const ctcGross = useMemo(() => {
        if (inputMode !== 'ctc') return 0;
        const ctc = num('ctcAmount');
        const basic = ctc * 0.4; // 40% of CTC
        const empPF = Math.min(basic * 0.12, 21600); // 12% of basic, max ₹1800/month
        const grat = basic * 0.0481;
        return ctc - empPF - grat;
    }, [inputMode, inputs, num]);

    // ─── Gross Income (always annual internally) ──────────────────────────────
    const allEarnings = num('basicSalary') + num('da') + num('hra') + num('special') + num('lta') + num('bonus') + num('otherIncome') + num('transportAllowance') + num('medicalAllowance') + num('foodAllowance') + num('variablePay') + num('annualBonus');
    // CTC mode: gross is auto-derived; variable pay & bonus are additional annual amounts on top
    const grossSalary = inputMode === 'ctc' ? ctcGross + num('variablePay') + num('annualBonus') : allEarnings * multiplier;

    // ─── Payroll Deductions ───────────────────────────────────────────────────
    const payrollDeductions = useMemo(() => {
        const pf = num('employeePF') * multiplier;
        const pt = num('professionalTax') * multiplier;
        const esiVal = num('esi') * multiplier;
        const nps = num('npsEmployee') * multiplier;
        return { pf, pt, esi: esiVal, nps, total: pf + pt + esiVal + nps };
    }, [inputs, num, multiplier]);

    const netSalaryAfterPayroll = grossSalary - payrollDeductions.total;

    // ─── HRA Exemption (Old regime only) ──────────────────────────────────────
    const hraExemption = useMemo(() => {
        const hraRcvd = num('hraReceived') * multiplier;
        const rentPaid = num('rentPaid') * multiplier;
        // In CTC mode basicSalary field is 0 — derive basic as 40% of CTC instead
        const basicPlusDA = inputMode === 'ctc'
            ? num('ctcAmount') * 0.4
            : (num('basicSalary') + num('da')) * multiplier;
        const isMetro = inputs.isMetro === 'true';
        if (!rentPaid || !hraRcvd) return 0;
        return Math.max(0, Math.min(hraRcvd, rentPaid - basicPlusDA * 0.1, basicPlusDA * (isMetro ? 0.5 : 0.4)));
    }, [inputs, num, multiplier, inputMode]);

    // ─── Old Regime Deductions (always computed for comparison) ────────────────
    const oldDeductions = useMemo(() => {
        const stdDed = 50000;
        // Children's allowance exemption per Rule 2BB: ₹100/month/child (max 2) = ₹2,400/yr (education)
        //                                             ₹300/month/child (max 2) = ₹7,200/yr (hostel)
        const childEduExempt = Math.min(num('childEducationAllowance') * multiplier, 2400);
        const childHostelExempt = Math.min(num('childHostelAllowance') * multiplier, 7200);
        // Employee PF counts toward 80C; Professional Tax is deductible under Sec 16(iii)
        // In CTC mode the payroll PF field isn't shown — use the auto-derived annual employee PF (12% of basic, capped ₹21,600/yr)
        const employeePF = inputMode === 'ctc'
            ? Math.min(num('ctcAmount') * 0.4 * 0.12, 21600)
            : num('employeePF') * multiplier;
        const profTax = num('professionalTax') * multiplier;
        const total80C = Math.min(num('section80C') + employeePF, 150000);
        return (
            stdDed +
            profTax + // Sec 16(iii) — Professional Tax deduction
            total80C +
            Math.min(num('section80D'), 25000) +
            Math.min(num('section80CCD'), 50000) +
            num('section80E') +
            num('section80G') +
            Math.min(num('homeLoan'), 200000) +
            hraExemption +
            childEduExempt +
            childHostelExempt
        );
    }, [inputs, num, hraExemption, multiplier, inputMode]);

    // ─── Select correct slab table based on FY ─────────────────────────────────
    const NEW_REGIME = fy === '2026-27' ? NEW_REGIME_2026_27 : NEW_REGIME_2025_26;
    // Old-regime slab table picks up the right age category. Senior citizens
    // get a higher basic exemption (₹3L), super seniors get ₹5L. New regime
    // ignores age — slabs are uniform.
    const OLD_REGIME_ACTIVE = ageCategory === 'super_senior'
        ? OLD_REGIME_SUPER_SENIOR
        : ageCategory === 'senior'
            ? OLD_REGIME_SENIOR
            : OLD_REGIME;
    const newStdDed = 75000; // Same for both years
    const oldStdDed = 50000;

    // ─── Compute Both Regimes ─────────────────────────────────────────────────
    const newTaxableIncome = Math.max(0, grossSalary - newStdDed);
    const newRawTax = computeSlabTax(newTaxableIncome, NEW_REGIME);
    const newAfterRebate = applyRebate87A(newRawTax, newTaxableIncome, 'new', fy);
    const newSurcharge = computeSurcharge(newAfterRebate, newTaxableIncome, 'new', NEW_REGIME);
    const newTaxAfterSurcharge = newAfterRebate + newSurcharge;
    const newCess = newTaxAfterSurcharge * 0.04;
    const newTotalTax = newTaxAfterSurcharge + newCess;
    const newNoTax = newTaxableIncome <= 1200000; // Full rebate ≤ ₹12L applies for both FY 2025-26 and 2026-27

    const oldTaxableIncome = Math.max(0, grossSalary - oldDeductions);
    const oldRawTax = computeSlabTax(oldTaxableIncome, OLD_REGIME_ACTIVE);
    const oldAfterRebate = applyRebate87A(oldRawTax, oldTaxableIncome, 'old', fy);
    const oldSurcharge = computeSurcharge(oldAfterRebate, oldTaxableIncome, 'old', OLD_REGIME_ACTIVE);
    const oldTaxAfterSurcharge = oldAfterRebate + oldSurcharge;
    const oldCess = oldTaxAfterSurcharge * 0.04;
    const oldTotalTax = oldTaxAfterSurcharge + oldCess;

    // Active regime values
    const activeDeductions = regime === 'new' ? newStdDed : oldDeductions;
    const activeTaxableIncome = regime === 'new' ? newTaxableIncome : oldTaxableIncome;
    const activeRawTax = regime === 'new' ? newRawTax : oldRawTax;
    const activeAfterRebate = regime === 'new' ? newAfterRebate : oldAfterRebate;
    const activeSurcharge = regime === 'new' ? newSurcharge : oldSurcharge;
    const activeCess = regime === 'new' ? newCess : oldCess;
    const activeTotalTax = regime === 'new' ? newTotalTax : oldTotalTax;
    const activeSlabs = regime === 'new' ? NEW_REGIME : OLD_REGIME_ACTIVE;

    const monthlyTax = activeTotalTax / 12;
    const netAnnual = grossSalary - activeTotalTax;
    const monthlyTakeHome = netAnnual / 12;
    const effectiveRate = grossSalary > 0 ? (activeTotalTax / grossSalary) * 100 : 0;

    // Comparison
    const betterRegime = oldTotalTax <= newTotalTax ? 'Old' : 'New';
    const saving = Math.abs(oldTotalTax - newTotalTax);
    const maxTax = Math.max(oldTotalTax, newTotalTax, 1);
    const bothZero = oldTotalTax === 0 && newTotalTax === 0;

    // ─── Regime Explanation ───────────────────────────────────────────────────
    useHistoryTracker('Income Tax Calculator', { regime, fy }, { netAnnual: netAnnual }, activeTotalTax);

    const regimeExplanation = useMemo(() => {
        if (bothZero || grossSalary === 0) return '';
        if (betterRegime === 'Old') {
            const totalDedUsed = oldDeductions - 50000; // exclude std deduction
            return t('tax.regimeExplanationOld', { saving: fmt(saving), totalDeductions: fmt(totalDedUsed), difference: fmt(75000 - 50000) });
        }
        return t('tax.regimeExplanationNew', { saving: fmt(saving), stdDeduction: fmt(75000), oldDeductions: fmt(oldDeductions - 50000) });
    }, [bothZero, grossSalary, betterRegime, saving, oldDeductions, t]);

    // ─── Tax-Saving Suggestions ───────────────────────────────────────────────
    const tips: string[] = useMemo(() => {
        const suggestions: string[] = [];
        if (grossSalary === 0) return suggestions;
        const used80C = Math.min(num('section80C'), 150000);
        if (used80C < 150000) suggestions.push(t('tax.tipInvest80C', { amount: fmt(150000 - used80C) }));
        if (num('section80D') < 25000) suggestions.push(t('tax.tipClaim80D'));
        if (!num('section80CCD') && regime === 'old') suggestions.push(t('tax.tipNPS80CCD'));
        if (!num('homeLoan')) suggestions.push(t('tax.tipHomeLoan'));
        return suggestions;
    }, [inputs, grossSalary, num, regime, t]);

    // Removed automatic notification trigger

    // ─── Shared config builder (PDF + Excel stay identical) ──────────────────
    // PDF: English labels — jsPDF Helvetica doesn't support Indian scripts
    const buildExportConfig = (): ExportConfig => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const modeLabel = inputMode === 'monthly' ? 'Monthly' : inputMode === 'annual' ? 'Annual' : inputMode === 'ctc' ? 'CTC' : 'Payslip';

        const inputFields: Array<{ label: string; value: string }> = [
            { label: 'Financial Year', value: `FY ${fy}` },
            { label: 'Input Mode', value: modeLabel },
            { label: 'Tax Regime', value: regime === 'old' ? 'Old Regime' : 'New Regime' },
        ];
        if (inputMode === 'ctc') {
            inputFields.push(
                { label: 'Annual CTC', value: fmt(num('ctcAmount')) },
                { label: 'Gross Salary (In-hand)', value: fmt(ctcGross) },
            );
        } else {
            inputFields.push(
                { label: 'Basic Salary (Annual)', value: fmt(num('basicSalary') * multiplier) },
                { label: 'HRA (Annual)', value: fmt(num('hra') * multiplier) },
                { label: 'Special Allowance (Annual)', value: fmt(num('special') * multiplier) },
                { label: 'Other Income (Annual)', value: fmt(num('otherIncome') * multiplier) },
            );
        }
        if (num('variablePay') > 0) inputFields.push({ label: 'Variable Pay / Performance Bonus', value: fmt(num('variablePay') * (inputMode === 'ctc' ? 1 : multiplier)) });
        if (num('annualBonus') > 0) inputFields.push({ label: 'Annual Bonus / Ex-Gratia', value: fmt(num('annualBonus') * (inputMode === 'ctc' ? 1 : multiplier)) });
        inputFields.push({ label: 'Gross Annual Income', value: fmt(grossSalary) });

        const resultFields: Array<{ label: string; value: string }> = [
            { label: 'Taxable Income', value: fmt(activeTaxableIncome) },
            { label: 'Old Regime Tax', value: fmt(oldTotalTax) },
            { label: 'New Regime Tax', value: fmt(newTotalTax) },
            { label: 'Recommended Regime', value: `${betterRegime} Regime${saving > 0 ? ` (Save ${fmt(saving)})` : ''}` },
            { label: 'Total Tax Liability', value: fmt(activeTotalTax) },
            { label: 'Health & Education Cess (4%)', value: fmt(activeCess) },
            { label: 'Net Annual Income', value: fmt(netAnnual) },
            { label: 'Monthly Take-Home', value: fmt(monthlyTakeHome) },
            { label: 'Effective Tax Rate', value: `${effectiveRate.toFixed(2)}%` },
        ];

        // Build slab breakdown comparing old vs new regime
        const slabRows: Array<Array<string | number>> = [];
        const combinedSlabs = [...new Set([...OLD_REGIME_ACTIVE.map(s => s.min), ...NEW_REGIME_2026_27.map(s => s.min)])].sort((a, b) => a - b);
        for (let i = 0; i < combinedSlabs.length; i++) {
            const slabMin = combinedSlabs[i];
            const slabMax = i + 1 < combinedSlabs.length ? combinedSlabs[i + 1] : Infinity;
            const oldSlab = OLD_REGIME_ACTIVE.find(s => s.min === slabMin);
            const newSlab = NEW_REGIME.find(s => s.min === slabMin);
            const oldRate = oldSlab ? oldSlab.rate : OLD_REGIME_ACTIVE.filter(s => s.min <= slabMin).pop()?.rate ?? 0;
            const newRate = newSlab ? newSlab.rate : NEW_REGIME.filter(s => s.min <= slabMin).pop()?.rate ?? 0;
            const label = slabMax === Infinity ? `above ${fmt(slabMin)}` : `${fmt(slabMin)} – ${fmt(slabMax)}`;

            const oldAmt = oldTaxableIncome > slabMin ? Math.min(oldTaxableIncome, slabMax === Infinity ? oldTaxableIncome : slabMax) - slabMin : 0;
            const newAmt = newTaxableIncome > slabMin ? Math.min(newTaxableIncome, slabMax === Infinity ? newTaxableIncome : slabMax) - slabMin : 0;
            const oldTaxAmt = oldAmt > 0 ? oldAmt * (oldRate / 100) : 0;
            const newTaxAmt = newAmt > 0 ? newAmt * (newRate / 100) : 0;

            if (oldAmt > 0 || newAmt > 0) {
                slabRows.push([
                    label,
                    oldAmt > 0 ? fmt(oldAmt) : '-',
                    `${oldRate}%`,
                    oldTaxAmt > 0 ? fmt(oldTaxAmt) : 'NIL',
                    `${newRate}%`,
                    newTaxAmt > 0 ? fmt(newTaxAmt) : 'NIL',
                ]);
            }
        }

        return {
            title: 'Income Tax Calculator Report (FY 2026-27)',
            subtitle: `Tax Regime: ${regime === 'old' ? 'Old Regime' : 'New Regime'}`,
            inputs: inputFields,
            results: resultFields,
            projectionTitle: 'Tax Slab Breakdown',
            projectionColumns: ['Slab', 'Taxable Amount', 'Old Rate', 'Old Tax', 'New Rate', 'New Tax'],
            projectionRows: slabRows,
            filename: `FinCalix_IncomeTax_Report_${tag}`,
        };
    };
    const handleDownloadPDF = async () => { await exportToPDF(buildExportConfig()); };
    const handleDownloadExcel = async () => { await exportToExcel(buildExportConfig()); };

    // ══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-background">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-[#0F172A]  border-b border-slate-200 dark:border-white/10 pt-14 px-4 py-3 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <ArrowLeft size={18} className="text-slate-700 dark:text-foreground" />
                </button>
                <div className="flex-1">
                    <h1 className="text-slate-900 dark:text-foreground font-bold text-base">{t('tax.title')}</h1>
                    <p className="text-muted-foreground text-[11px]">{t('tax.fyLabel', { fy, ay: fy === '2026-27' ? '2027-28' : '2026-27' })} {fy === '2026-27' ? `• ${t('tax.unionBudget2026')}` : ''}</p>
                </div>
            </div>

            <div className="px-4 pt-4 pb-28 space-y-4">
                {/* FY Year Selector */}
                <div className="flex gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
                    {(['2026-27', '2025-26'] as const).map((y) => (
                        <motion.button
                            key={y}
                            onClick={() => setFy(y)}
                            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${fy === y ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-muted-foreground dark:text-muted-foreground'}`}
                        >
                            {t('tax.fy')} {y} {y === '2026-27' ? `(${t('tax.current')})` : ''}
                        </motion.button>
                    ))}
                </div>

                {/* Budget Info Banner */}
                {fy === '2026-27' && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/25">
                        <div className="flex items-start gap-2">
                            <TrendingUp size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-emerald-300 text-xs font-bold">{t('tax.budgetUpdate')}</p>
                                <p className="text-emerald-400/80 text-[10px] mt-0.5 leading-relaxed">
                                    {t('tax.budgetUpdateDesc')}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Regime Toggle */}
                <div className="flex gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
                    {(['new', 'old'] as const).map((r) => (
                        <motion.button
                            key={r}
                            onClick={() => setRegime(r)}
                            className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${regime === r ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/30' : 'text-muted-foreground dark:text-muted-foreground'}`}
                        >
                            {r === 'new' ? t('tax.newRegime') : t('tax.oldRegime')}
                            <br />
                            <span className="font-normal text-[9px] opacity-80">{r === 'new' ? `${t('tax.fy')} ${fy}` : t('tax.withDeductions')}</span>
                        </motion.button>
                    ))}
                </div>

                {/* Age Category — only meaningful in OLD regime where the basic
                    exemption changes for 60+ and 80+ taxpayers. New regime uses
                    uniform slabs across all ages. */}
                {regime === 'old' && (
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                            {t('tax.ageCategory', 'Age category')}
                        </label>
                        <div className="flex gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
                            {([
                                { id: 'below_60', label: t('tax.below60', 'Below 60'), exempt: '₹2.5L' },
                                { id: 'senior', label: t('tax.senior', 'Senior 60–79'), exempt: '₹3L' },
                                { id: 'super_senior', label: t('tax.superSenior', 'Super 80+'), exempt: '₹5L' },
                            ] as const).map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setAgeCategory(opt.id)}
                                    className={`flex-1 py-2 px-1 text-[10px] font-bold rounded-lg transition-all ${ageCategory === opt.id ? 'bg-brand-purple text-white shadow-md' : 'text-muted-foreground'}`}
                                >
                                    {opt.label}
                                    <br />
                                    <span className="font-normal text-[8px] opacity-80">{t('tax.exempt', 'exempt')} {opt.exempt}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Salary Input Mode Toggle */}
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                    <p className="text-muted-foreground dark:text-muted-foreground text-xs font-semibold mb-2">{t('tax.inputMode')}</p>
                    <div className="grid grid-cols-2 gap-2">
                        {([
                            { key: 'monthly' as const, label: t('tax.monthlySalary') },
                            { key: 'annual' as const, label: t('tax.annualSalary') },
                            { key: 'ctc' as const, label: t('tax.ctcMode') },
                            { key: 'payslip' as const, label: t('tax.payslipMode') },
                        ]).map((m) => (
                            <button
                                key={m.key}
                                onClick={() => setInputMode(m.key)}
                                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${inputMode === m.key ? 'bg-brand-purple/10 text-brand-purple border-2 border-brand-purple' : 'bg-slate-50 dark:bg-card border-border text-muted-foreground border-2 border-transparent'}`}
                            >
                                <span className={`inline-block w-3 h-3 rounded-full mr-1.5 align-middle ${inputMode === m.key ? 'bg-brand-purple' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                {m.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-muted-foreground text-[10px] mt-2">
                        {inputMode === 'monthly' ? t('tax.inputModeMonthlyDesc') : inputMode === 'annual' ? t('tax.inputModeAnnualDesc') : inputMode === 'ctc' ? t('tax.inputModeCtcDesc') : t('tax.inputModePayslipDesc')}
                    </p>
                </div>

                {/* Income Inputs */}
                {inputMode === 'ctc' ? (
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                        <h3 className="font-bold text-slate-900 dark:text-foreground text-sm">{t('tax.ctcDetails')}</h3>
                        <InputRow label={t('tax.annualCTC')} k="ctcAmount" value={inputs.ctcAmount} onChange={set} />
                        {num('ctcAmount') > 0 && (
                            <div className="bg-muted rounded-xl p-3 space-y-2">
                                <p className="text-muted-foreground text-xs font-semibold">{t('tax.autoComputedBreakdown')}</p>
                                {[
                                    { label: t('tax.basic40'), val: num('ctcAmount') * 0.4, isTotal: false },
                                    { label: t('tax.employerPF12'), val: Math.min(num('ctcAmount') * 0.4 * 0.12, 21600), isTotal: false },
                                    { label: t('tax.gratuity481'), val: num('ctcAmount') * 0.4 * 0.0481, isTotal: false },
                                    { label: t('tax.grossSalaryInHand'), val: ctcGross, isTotal: true },
                                ].map(r => (
                                    <div key={r.label} className={`flex justify-between ${r.isTotal ? 'border-t border-slate-200 dark:border-white/10 pt-2 font-bold' : ''}`}>
                                        <span className="text-muted-foreground dark:text-muted-foreground text-xs">{r.label}</span>
                                        <span className={`text-xs font-semibold ${r.isTotal ? 'text-brand-purple' : 'text-slate-700 dark:text-foreground'}`}>{fmt(r.val)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <InputRow label={t('tax.variablePay')} k="variablePay" value={inputs.variablePay} onChange={set} hint={t('tax.variablePayHint')} />
                        <InputRow label={t('tax.annualBonus')} k="annualBonus" value={inputs.annualBonus} onChange={set} hint={t('tax.annualBonusHint')} />
                        <InputRow label={t('tax.otherIncome')} k="otherIncome" value={inputs.otherIncome} onChange={set} />
                    </div>
                ) : (
                    <>
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                            <h3 className="font-bold text-slate-900 dark:text-foreground text-sm">
                                {inputMode === 'monthly' ? t('tax.monthly') : inputMode === 'payslip' ? t('tax.payslip') : t('tax.annual')} {t('tax.incomeDetails')}
                            </h3>
                            <InputRow label={t('tax.basicSalary')} k="basicSalary" value={inputs.basicSalary} onChange={set} />
                            <InputRow label={t('tax.dearnessAllowance')} k="da" value={inputs.da} onChange={set} hint={t('tax.daHint')} />
                            <InputRow label={t('tax.hra')} k="hra" value={inputs.hra} onChange={set} />
                            <InputRow label={t('tax.specialAllowance')} k="special" value={inputs.special} onChange={set} />
                            <InputRow label={t('tax.transportAllowance')} k="transportAllowance" value={inputs.transportAllowance} onChange={set} />
                            <InputRow label={t('tax.medicalAllowance')} k="medicalAllowance" value={inputs.medicalAllowance} onChange={set} />
                            <InputRow label={t('tax.foodAllowance')} k="foodAllowance" value={inputs.foodAllowance} onChange={set} />
                            <InputRow label={t('tax.lta')} k="lta" value={inputs.lta} onChange={set} />
                            <InputRow label={t('tax.bonusOtherAllowances')} k="bonus" value={inputs.bonus} onChange={set} />
                            <InputRow label={t('tax.variablePay')} k="variablePay" value={inputs.variablePay} onChange={set} hint={t('tax.variablePayHint')} />
                            <InputRow label={t('tax.annualBonus')} k="annualBonus" value={inputs.annualBonus} onChange={set} hint={t('tax.annualBonusHint')} />
                            <InputRow label={t('tax.otherIncome')} k="otherIncome" value={inputs.otherIncome} onChange={set} />
                        </div>

                        {/* Payroll Deductions */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-1">
                            <CollapsibleSection title={t('tax.payrollDeductions')} defaultOpen={inputMode === 'payslip'}>
                                <InputRow label={t('tax.employeePF')} k="employeePF" value={inputs.employeePF} onChange={set} hint={inputMode === 'payslip' ? t('tax.fromPayslip') : t('tax.pfHint')} />
                                <InputRow label={t('tax.professionalTax')} k="professionalTax" value={inputs.professionalTax} onChange={set} hint={t('tax.professionalTaxHint')} />
                                <InputRow label={t('tax.esi')} k="esi" value={inputs.esi} onChange={set} hint={t('tax.esiHint')} />
                                <InputRow label={t('tax.npsEmployee')} k="npsEmployee" value={inputs.npsEmployee} onChange={set} hint={t('tax.npsHint')} />
                                {payrollDeductions.total > 0 && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-xl p-3 flex justify-between">
                                        <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold">{t('tax.totalPayrollDeductions')}</span>
                                        <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">-{fmt(payrollDeductions.total)}</span>
                                    </div>
                                )}
                            </CollapsibleSection>
                        </div>
                    </>
                )}

                {/* Salary Summary Card */}
                <div className="bg-gradient-to-br from-brand-purple/5 to-blue-500/5 border border-brand-purple/20 rounded-2xl p-4">
                    <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-3">{t('tax.salarySummary')}</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground dark:text-muted-foreground text-xs">{t('tax.grossAnnualIncome')}</span>
                            <span className="font-extrabold text-slate-900 dark:text-foreground text-base">{fmt(grossSalary)}</span>
                        </div>
                        {(num('variablePay') > 0 || num('annualBonus') > 0) && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground dark:text-muted-foreground text-xs">{t('tax.variablePayBonus')}</span>
                                <span className="font-semibold text-amber-500 text-sm">{fmt((num('variablePay') + num('annualBonus')) * (inputMode === 'ctc' ? 1 : multiplier))}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground dark:text-muted-foreground text-xs">{t('tax.standardDeduction')}</span>
                            <span className="font-bold text-blue-500 text-sm">-{fmt(regime === 'new' ? newStdDed : 50000)}</span>
                        </div>
                        <div className="border-t border-slate-100 dark:border-white/10 pt-2 flex justify-between items-center">
                            <span className="text-slate-700 dark:text-foreground text-xs font-bold">{t('tax.taxableIncome')}</span>
                            <span className="font-extrabold text-brand-purple text-base">{fmt(activeTaxableIncome)}</span>
                        </div>
                    </div>

                    {/* New regime no-tax notice */}
                    {regime === 'new' && newNoTax && grossSalary > 0 && (
                        <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 rounded-xl">
                            <p className="text-emerald-700 dark:text-emerald-400 text-xs font-semibold text-center">
                                {t('tax.noTaxPayable')}
                            </p>
                            <p className="text-emerald-600 dark:text-emerald-500 text-[10px] text-center mt-0.5">
                                {t('tax.withinExemptionLimit', { budget: fy === '2026-27' ? '2026' : '2025' })}
                            </p>
                        </div>
                    )}
                </div>

                {/* Old Regime Deductions */}
                {regime === 'old' && (
                    <>
                        {/* HRA Exemption */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                            <CollapsibleSection title={t('tax.housingBenefits')}>
                                <InputRow label={`${t('tax.hraReceived')} (${inputMode === 'monthly' ? t('tax.monthly') : t('tax.annual')})`} k="hraReceived" value={inputs.hraReceived} onChange={set} />
                                <InputRow label={`${t('tax.rentPaid')} (${inputMode === 'monthly' ? t('tax.monthly') : t('tax.annual')})`} k="rentPaid" value={inputs.rentPaid} onChange={set} />
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={inputs.isMetro === 'true'} onChange={(e) => set('isMetro', e.target.checked ? 'true' : 'false')} className="w-4 h-4 accent-brand-purple" />
                                    <span className="text-slate-600 dark:text-muted-foreground text-xs">{t('tax.metroCity')}</span>
                                </label>
                                <div className="bg-brand-green/10 border border-brand-green/20 rounded-xl p-3 flex justify-between">
                                    <span className="text-brand-green text-xs font-semibold">{t('tax.hraExemption')}</span>
                                    <span className="text-brand-green font-bold text-sm">{fmt(hraExemption)}</span>
                                </div>
                                <InputRow label={t('tax.homeLoanInterest')} k="homeLoan" value={inputs.homeLoan} onChange={set} hint={t('tax.homeLoanHint')} warning={getWarning('homeLoan', inputs.homeLoan, t)} />
                            </CollapsibleSection>
                        </div>

                        {/* Section Deductions */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-1">
                            <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-2">{t('tax.deductionsOldRegime')}</h3>
                            <div className="bg-muted rounded-xl p-3 flex justify-between items-center">
                                <span className="text-muted-foreground dark:text-muted-foreground text-xs font-semibold">{t('tax.standardDeduction')}</span>
                                <span className="font-bold text-brand-purple text-sm">{fmt(50000)}</span>
                            </div>

                            <CollapsibleSection title={t('tax.investmentDeductions')}>
                                <InputRow label={t('tax.sec80C')} k="section80C" value={inputs.section80C} onChange={set} hint={t('tax.sec80CHint')} warning={getWarning('section80C', inputs.section80C, t)} />
                                <InputRow label={t('tax.sec80CCD')} k="section80CCD" value={inputs.section80CCD} onChange={set} hint={t('tax.sec80CCDHint')} warning={getWarning('section80CCD', inputs.section80CCD, t)} />
                            </CollapsibleSection>

                            <CollapsibleSection title={t('tax.insuranceMedical')}>
                                <InputRow label={t('tax.sec80D')} k="section80D" value={inputs.section80D} onChange={set} hint={t('tax.sec80DHint')} warning={getWarning('section80D', inputs.section80D, t)} />
                            </CollapsibleSection>

                            <CollapsibleSection title={t('tax.additionalDeductions')}>
                                <InputRow label={t('tax.sec80E')} k="section80E" value={inputs.section80E} onChange={set} hint={t('tax.sec80EHint')} />
                                <InputRow label={t('tax.sec80G')} k="section80G" value={inputs.section80G} onChange={set} hint={t('tax.sec80GHint')} />
                                <InputRow label={`${t('tax.childEducationAllowance')} (${inputMode === 'monthly' || inputMode === 'payslip' ? t('tax.monthly') : t('tax.annual')})`} k="childEducationAllowance" value={inputs.childEducationAllowance} onChange={set} hint={t('tax.childEducationHint')} />
                                <InputRow label={`${t('tax.childHostelAllowance')} (${inputMode === 'monthly' || inputMode === 'payslip' ? t('tax.monthly') : t('tax.annual')})`} k="childHostelAllowance" value={inputs.childHostelAllowance} onChange={set} hint={t('tax.childHostelHint')} />
                            </CollapsibleSection>

                            <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex justify-between items-center">
                                <span className="text-slate-600 dark:text-muted-foreground text-sm font-medium">{t('tax.totalDeductions')}</span>
                                <span className="font-extrabold text-brand-green text-base">-{fmt(oldDeductions)}</span>
                            </div>
                        </div>
                    </>
                )}

                {/* New regime info card */}
                {regime === 'new' && (
                    <div className="bg-brand-purple/5 border border-brand-purple/20 rounded-2xl p-4">
                        <div className="flex gap-3">
                            <Info size={18} className="text-brand-purple flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-brand-purple font-semibold text-sm">{t('tax.newRegimeFY', { fy })}</p>
                                <p className="text-muted-foreground dark:text-muted-foreground text-xs mt-1">
                                    {t('tax.newRegimeDesc')}
                                </p>
                                <p className="text-brand-purple text-[10px] mt-1 font-semibold">
                                    {t('tax.newRegimeRebateNote')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ════════ RESULTS ════════ */}
                {grossSalary > 0 && (
                    <>
                        {/* Tax Summary Hero */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-3xl p-6 text-white shadow-xl ${activeTotalTax === 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-red-500 to-orange-600'}`}
                        >
                            <p className="text-foreground/70 text-xs font-semibold uppercase tracking-wider mb-1">
                                {regime === 'old' ? t('tax.oldRegime') : t('tax.newRegime')} — {t('tax.totalTax')}
                            </p>
                            <h2 className="text-4xl font-extrabold">{activeTotalTax === 0 ? t('tax.nil') : fmt(activeTotalTax)}</h2>
                            <p className="text-foreground/60 text-sm mt-1">
                                {activeTotalTax === 0 ? t('tax.noTaxWithinLimit') : t('tax.annualTaxLiability')}
                            </p>
                            <div className="grid grid-cols-3 gap-3 mt-4">
                                {[
                                    { label: t('tax.monthlyTDS'), value: fmt(monthlyTax) },
                                    { label: t('tax.effRate'), value: `${effectiveRate.toFixed(1)}%` },
                                    { label: t('tax.taxable'), value: fmt(activeTaxableIncome) },
                                ].map((s) => (
                                    <div key={s.label} className="bg-white/10 rounded-xl p-2.5 text-center">
                                        <p className="text-foreground/60 text-[9px] uppercase font-bold tracking-wider mb-0.5">{s.label}</p>
                                        <p className="text-foreground font-bold text-xs">{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Step-by-Step Breakdown */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2">
                            <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-3">{t('tax.stepByStepBreakdown')}</h3>
                            {[
                                { label: t('tax.grossAnnualIncome'), val: grossSalary, color: 'text-brand-green' },
                                { label: `${t('tax.less')}: ${regime === 'new' ? t('tax.standardDeduction') : t('tax.totalDeductions')}`, val: -activeDeductions, color: 'text-blue-400' },
                                { label: t('tax.taxableIncome'), val: activeTaxableIncome, color: 'text-brand-purple', bold: true },
                                { label: t('tax.incomeTaxSlabWise'), val: activeRawTax, color: 'text-muted-foreground' },
                                ...(activeRawTax !== activeAfterRebate ? [{ label: t('tax.lessRebate87A'), val: -(activeRawTax - activeAfterRebate), color: 'text-emerald-500' }] : []),
                                { label: t('tax.incomeTaxAfterRebate'), val: activeAfterRebate, color: 'text-red-400' },
                                ...(activeSurcharge > 0 ? [{ label: t('tax.surcharge'), val: activeSurcharge, color: 'text-amber-500' }] : []),
                                { label: t('tax.healthEducationCess'), val: activeCess, color: 'text-orange-400' },
                                { label: t('tax.finalTaxLiability'), val: activeTotalTax, color: 'text-red-500', bold: true },
                            ].map((row) => (
                                <div key={row.label} className={`flex justify-between items-center py-2 ${row.bold ? 'border-t border-slate-100 dark:border-white/10 mt-1' : ''}`}>
                                    <span className={`text-muted-foreground dark:text-muted-foreground text-xs ${row.bold ? 'font-bold text-slate-700 dark:text-foreground' : ''}`}>{row.label}</span>
                                    <span className={`font-bold text-sm ${row.color}`}>{row.val < 0 ? '-' : ''}{fmt(Math.abs(row.val))}</span>
                                </div>
                            ))}
                        </div>

                        {/* Slab Breakdown */}
                        {activeTaxableIncome > 0 && (
                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                                <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-3">{t('tax.taxSlabComputation')}</h3>
                                <div className="space-y-2">
                                    {activeSlabs.map((slab, i) => {
                                        if (activeTaxableIncome <= slab.min) return null;
                                        const upper = slab.max === Infinity ? activeTaxableIncome : slab.max;
                                        const slabAmount = Math.max(0, Math.min(activeTaxableIncome, upper) - slab.min);
                                        const slabTax = slabAmount * (slab.rate / 100);
                                        return (
                                            <div key={i} className={`p-3 rounded-xl ${slab.rate === 0 ? 'bg-green-50 dark:bg-green-900/10' : slab.rate >= 25 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-muted'}`}>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-slate-600 dark:text-muted-foreground font-medium">
                                                        {slab.max === Infinity ? `${t('tax.above')} ${fmt(slab.min)}` : `${fmt(slab.min)} – ${fmt(slab.max)}`}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-800 dark:text-foreground">{slab.rate}%</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-[10px] text-muted-foreground">{t('tax.on')} {fmt(slabAmount)}</span>
                                                    <span className="text-xs font-bold text-brand-purple">{slab.rate === 0 ? t('tax.nil') : `${t('tax.taxLabel')}: ${fmt(slabTax)}`}</span>
                                                </div>
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
                                    <p className="text-brand-green text-xs font-semibold uppercase tracking-wider">{t('tax.monthlyTakeHome')}</p>
                                    <p className="text-3xl font-extrabold text-brand-green mt-1">{fmt(monthlyTakeHome)}</p>
                                </div>
                                <TrendingUp className="w-12 h-12 text-brand-green opacity-30" />
                            </div>
                            <p className="text-brand-green/50 text-[10px] mt-1">
                                {t('tax.netAnnualIncome')} ({fmt(netAnnual)}) ÷ 12
                            </p>
                            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-brand-green/20">
                                {[
                                    { label: t('tax.monthlySalaryLabel'), value: fmt(grossSalary / 12), color: 'text-brand-green' },
                                    { label: t('tax.monthlyTax'), value: fmt(monthlyTax), color: 'text-red-400' },
                                    { label: t('tax.netAnnualIncome'), value: fmt(netAnnual), color: 'text-brand-green' },
                                    { label: t('tax.effectiveTaxRate'), value: `${effectiveRate.toFixed(1)}%`, color: 'text-brand-purple' },
                                ].map((item) => (
                                    <div key={item.label} className="text-center bg-white/50 dark:bg-white/5 rounded-xl p-2.5">
                                        <p className="text-brand-green/60 text-[9px] uppercase font-bold">{item.label}</p>
                                        <p className={`${item.color} font-bold text-xs mt-0.5`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Regime Comparison */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                            <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-3">{t('tax.oldVsNewRegime')}</h3>
                            <div className="space-y-2 mb-4">
                                {[
                                    { label: t('tax.oldRegime'), tax: oldTotalTax, better: betterRegime === 'Old' && !bothZero },
                                    { label: t('tax.newRegime'), tax: newTotalTax, better: betterRegime === 'New' && !bothZero },
                                ].map((r) => (
                                    <div key={r.label} className={`flex items-center justify-between p-3 rounded-xl border-2 ${r.better ? 'border-brand-green bg-brand-green/5' : 'border-slate-100 dark:border-slate-700 bg-muted'}`}>
                                        <div className="flex items-center gap-2">
                                            {r.better && <span className="w-5 h-5 rounded-full bg-brand-green flex items-center justify-center text-foreground text-[10px] font-bold">✓</span>}
                                            <span className="text-muted-foreground text-sm font-medium">{r.label}</span>
                                        </div>
                                        <span className={`font-extrabold text-sm ${r.better ? 'text-brand-green' : 'text-slate-700 dark:text-foreground'}`}>
                                            {r.tax === 0 ? t('tax.nil') : fmt(r.tax)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Visual Bars */}
                            {!bothZero && (
                                <div className="space-y-2 mb-4">
                                    {[
                                        { tax: oldTotalTax, better: betterRegime === 'Old' },
                                        { tax: newTotalTax, better: betterRegime === 'New' },
                                    ].map((bar, i) => (
                                        <div key={i} className="h-5 bg-slate-100 dark:bg-card border-border rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.max((bar.tax / maxTax) * 100, 3)}%` }}
                                                transition={{ duration: 0.6, delay: i * 0.1 }}
                                                className={`h-full rounded-full ${bar.better ? 'bg-brand-green' : 'bg-red-400'}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Recommendation */}
                            <div className={`p-4 rounded-xl text-center ${bothZero ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-700/30' : 'bg-brand-green/10 border border-brand-green/20'}`}>
                                <p className="text-xs text-muted-foreground dark:text-muted-foreground mb-1">{t('tax.recommendedRegime')}</p>
                                {bothZero ? (
                                    <>
                                        <p className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400">{t('tax.noTaxDue')}</p>
                                        <p className="text-emerald-600/80 text-xs mt-1">{t('tax.incomeWithinExemption')}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-extrabold text-lg text-brand-green">{betterRegime.toUpperCase()} {t('tax.regime')}</p>
                                        <p className="text-brand-green text-xs mt-1">{t('tax.estimatedTaxSaving')}: {fmt(saving)}</p>
                                        {regimeExplanation && (
                                            <p className="text-muted-foreground dark:text-muted-foreground text-[10px] mt-2 leading-relaxed text-left">{regimeExplanation}</p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Tax-Saving Suggestions */}
                        {tips.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/40 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Lightbulb size={16} className="text-amber-600" />
                                    <h3 className="font-bold text-amber-800 dark:text-amber-400 text-sm">{t('tax.taxSavingSuggestions')}</h3>
                                </div>
                                <div className="space-y-2">
                                    {tips.map((tip, i) => (
                                        <p key={i} className="text-amber-700 dark:text-amber-300 text-xs leading-relaxed flex gap-2">
                                            <span className="text-amber-500 font-bold flex-shrink-0">{i + 1}.</span>{tip}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Download PDF + Excel */}
                        <div className="grid grid-cols-2 gap-2">
                            <motion.button whileTap={{ scale: 0.97 }} onClick={handleDownloadPDF} className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-purple text-white font-bold shadow-lg shadow-brand-purple/30">
                                <Download size={18} /> PDF
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.97 }} onClick={handleDownloadExcel} className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-green text-white font-bold shadow-lg shadow-brand-green/30">
                                <Download size={18} /> Excel
                            </motion.button>
                        </div>
                    </>
                )}

                

                <DisclaimerComponent module="tax" />
            </div>
        </div>
    );
}
