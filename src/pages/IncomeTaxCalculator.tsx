import { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Info, TrendingUp, Download, ExternalLink, ChevronDown, ChevronUp, Lightbulb, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToPDF } from '../utils/exportUtils';
import { AnalyticsService } from '../lib/analytics';
import { triggerCalcNotification } from '../services/calcNotifications';
import FinancialQuote from '../components/FinancialQuote';

// ─── Tax Slab Tables ──────────────────────────────────────────────────────────
const OLD_REGIME = [
 { min: 0, max: 250000, rate: 0 },
 { min: 250000, max: 500000, rate: 5 },
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

function applyRebate87A(tax: number, taxableIncome: number, regime: 'old' | 'new', fy: '2026-27' | '2025-26'): number {
 if (regime === 'new') {
 if (fy === '2026-27') {
 // Budget 2026-27: Full rebate — zero tax if taxable income ≤ ₹12,00,000
 if (taxableIncome <= 1200000) return 0;
 } else {
 // FY 2025-26: Rebate up to ₹12,500 if taxable income ≤ ₹7,00,000
 if (taxableIncome <= 700000) return Math.max(0, tax - 12500);
 }
 } else {
 // Old regime: rebate up to ₹12,500 if taxable income ≤ ₹5,00,000
 if (taxableIncome <= 500000) return 0;
 }
 return tax;
}

// Surcharge calculation (New Regime)
function computeSurcharge(tax: number, taxableIncome: number, regime: 'old' | 'new'): number {
 if (tax <= 0) return 0;
 if (taxableIncome > 20000000) return tax * 0.25; // >₹2Cr: 25%
 if (taxableIncome > 10000000) return tax * 0.15; // >₹1Cr: 15%
 if (taxableIncome > 5000000) return tax * 0.10; // >₹50L: 10%
 return 0;
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
 <label className="text-muted-foreground text-xs font-semibold">{label}</label>
 <div className={`flex items-center gap-2 bg-slate-50 border-border border rounded-xl px-3 py-2.5 transition-colors ${warning ? 'border-amber-400 ' : 'border-slate-200 focus-within:border-brand-purple'}`}>
 {prefix && <span className="text-brand-purple font-bold text-sm flex-shrink-0">{prefix}</span>}
 <input
 type="number"
 inputMode="decimal"
 value={value}
 onChange={(e) => onChange(k, e.target.value)}
 placeholder="0"
 className="flex-1 bg-transparent text-slate-900 text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
 />
 </div>
 {warning && (
 <div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--warning-bg)] border border-[var(--warning-border)] ">
 <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
 <p className="text-amber-600 text-[10px] leading-tight">{warning}</p>
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
 <span className="text-slate-700 text-xs font-bold uppercase tracking-wider">{title}</span>
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

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function IncomeTaxCalculator() {
 useEffect(() => { AnalyticsService.trackScreen('Income_Tax'); }, []);
 useTrackCalculator();
 const navigate = useNavigate();
 const [regime, setRegime] = useState<'old' | 'new'>('new');
 const [fy, setFy] = useState<'2026-27' | '2025-26'>('2026-27');
 const [inputMode, setInputMode] = useState<'monthly' | 'annual' | 'ctc' | 'payslip'>('monthly');
 const [showDisclaimer, setShowDisclaimer] = useState(false);
 const [inputs, setInputs] = useState<Inputs>({
 basicSalary: '',
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
 const allEarnings = num('basicSalary') + num('hra') + num('special') + num('lta') + num('bonus') + num('otherIncome') + num('transportAllowance') + num('medicalAllowance') + num('foodAllowance');
 const grossSalary = inputMode === 'ctc' ? ctcGross : allEarnings * multiplier;

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
 const basic = num('basicSalary') * multiplier;
 const isMetro = inputs.isMetro === 'true';
 if (!rentPaid || !hraRcvd) return 0;
 return Math.max(0, Math.min(hraRcvd, rentPaid - basic * 0.1, basic * (isMetro ? 0.5 : 0.4)));
 }, [inputs, num, multiplier]);

 // ─── Old Regime Deductions (always computed for comparison) ────────────────
 const oldDeductions = useMemo(() => {
 const stdDed = 50000;
 return (
 stdDed +
 Math.min(num('section80C'), 150000) +
 Math.min(num('section80D'), 25000) +
 Math.min(num('section80CCD'), 50000) +
 num('section80E') +
 num('section80G') +
 Math.min(num('homeLoan'), 200000) +
 hraExemption
 );
 }, [inputs, num, hraExemption]);

 // ─── Select correct slab table based on FY ─────────────────────────────────
 const NEW_REGIME = fy === '2026-27' ? NEW_REGIME_2026_27 : NEW_REGIME_2025_26;
 const newStdDed = 75000; // Same for both years
 const oldStdDed = 50000;

 // ─── Compute Both Regimes ─────────────────────────────────────────────────
 const newTaxableIncome = Math.max(0, grossSalary - newStdDed);
 const newRawTax = computeSlabTax(newTaxableIncome, NEW_REGIME);
 const newAfterRebate = applyRebate87A(newRawTax, newTaxableIncome, 'new', fy);
 const newSurcharge = computeSurcharge(newAfterRebate, newTaxableIncome, 'new');
 const newTaxAfterSurcharge = newAfterRebate + newSurcharge;
 const newCess = newTaxAfterSurcharge * 0.04;
 const newTotalTax = newTaxAfterSurcharge + newCess;
 const newNoTax = fy === '2026-27' ? newTaxableIncome <= 1200000 : newTaxableIncome <= 700000;

 const oldTaxableIncome = Math.max(0, grossSalary - oldDeductions);
 const oldRawTax = computeSlabTax(oldTaxableIncome, OLD_REGIME);
 const oldAfterRebate = applyRebate87A(oldRawTax, oldTaxableIncome, 'old', fy);
 const oldSurcharge = computeSurcharge(oldAfterRebate, oldTaxableIncome, 'old');
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
 const activeSlabs = regime === 'new' ? NEW_REGIME : OLD_REGIME;

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
 const regimeExplanation = useMemo(() => {
 if (bothZero || grossSalary === 0) return '';
 if (betterRegime === 'Old') {
 const totalDedUsed = oldDeductions - 50000; // exclude std deduction
 return `Old Regime saves ${fmt(saving)} because your deductions (80C, 80D, HRA, etc.) total ${fmt(totalDedUsed)}, which reduces your taxable income significantly. With deductions exceeding ${fmt(75000 - 50000)} (difference between new std deduction and old), the old regime is more beneficial.`;
 }
 return `New Regime saves ${fmt(saving)} because the higher standard deduction of ${fmt(75000)} and revised tax slabs offset your old regime deductions of ${fmt(oldDeductions - 50000)}. The new regime offers simpler filing with lower rates.`;
 }, [bothZero, grossSalary, betterRegime, saving, oldDeductions]);

 // ─── Tax-Saving Suggestions ───────────────────────────────────────────────
 const tips: string[] = useMemo(() => {
 const t: string[] = [];
 if (grossSalary === 0) return t;
 const used80C = Math.min(num('section80C'), 150000);
 if (used80C < 150000) t.push(`Invest ${fmt(150000 - used80C)} more under Section 80C (PPF, ELSS, LIC, etc.) — max limit Rs 1,50,000.`);
 if (num('section80D') < 25000) t.push(`Claim health insurance under Section 80D — up to Rs 25,000 for self & family.`);
 if (!num('section80CCD')) t.push(`NPS contribution under Section 80CCD(1B) offers additional deduction up to Rs 50,000.`);
 if (!num('homeLoan')) t.push(`Home loan interest under Section 24 allows deduction up to Rs 2,00,000.`);
 return t;
 }, [inputs, grossSalary, num]);

 // ─── Notification trigger ────────────────────────────────────────────────
 useEffect(() => {
 if (grossSalary <= 0) return;
 const t = setTimeout(() => {
 triggerCalcNotification('tax', `Tax ₹${Math.round(activeTotalTax).toLocaleString('en-IN')}/yr`);
 }, 2000);
 return () => clearTimeout(t);
 }, [activeTotalTax, grossSalary]);

 // ─── PDF Handler ──────────────────────────────────────────────────────────
 const handleDownloadPDF = async () => {
 const headers = ['Particulars', 'Amount'];
 const modeLabel = inputMode === 'monthly' ? 'Monthly' : inputMode === 'annual' ? 'Annual' : inputMode === 'ctc' ? 'CTC' : 'Payslip';
 const rows: (string | number)[][] = [
 ['--- INCOME SUMMARY ---', ''],
 ['Input Mode', modeLabel],
 ];
 if (inputMode === 'ctc') {
 rows.push(
 ['Annual CTC', fmt(num('ctcAmount'))],
 ['Basic (40%)', fmt(num('ctcAmount') * 0.4)],
 ['Employer PF', fmt(Math.min(num('ctcAmount') * 0.4 * 0.12, 21600))],
 ['Gratuity', fmt(num('ctcAmount') * 0.4 * 0.0481)],
 ['Gross Salary (In-hand)', fmt(ctcGross)],
 );
 } else {
 rows.push(
 ['Basic Salary', fmt(num('basicSalary') * multiplier)],
 ['HRA', fmt(num('hra') * multiplier)],
 ['Special Allowance', fmt(num('special') * multiplier)],
 ['Transport Allowance', fmt(num('transportAllowance') * multiplier)],
 ['Medical Allowance', fmt(num('medicalAllowance') * multiplier)],
 ['Food Allowance', fmt(num('foodAllowance') * multiplier)],
 ['LTA', fmt(num('lta') * multiplier)],
 ['Bonus / Other Allowances', fmt(num('bonus') * multiplier)],
 ['Other Income', fmt(num('otherIncome') * multiplier)],
 );
 }
 rows.push(['Gross Annual Income', fmt(grossSalary)], ['---', '']);
 // Payroll deductions
 if (payrollDeductions.total > 0) {
 rows.push(
 ['--- PAYROLL DEDUCTIONS ---', ''],
 ['Employee PF', fmt(payrollDeductions.pf)],
 ['Professional Tax', fmt(payrollDeductions.pt)],
 ['ESI', fmt(payrollDeductions.esi)],
 ['NPS (Employee)', fmt(payrollDeductions.nps)],
 ['Total Payroll Deductions', fmt(payrollDeductions.total)],
 ['Net Salary after Payroll', fmt(netSalaryAfterPayroll)],
 ['---', ''],
 );
 }
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
 rows.push(['Standard Deduction (New Regime)', fmt(75000)], ['---', '']);
 }
 rows.push(['Taxable Income', fmt(activeTaxableIncome)], ['---', ''], ['--- TAX SLAB BREAKDOWN ---', '']);
 activeSlabs.forEach((slab) => {
 if (activeTaxableIncome > slab.min) {
 const upper = slab.max === Infinity ? activeTaxableIncome : slab.max;
 const slabAmt = Math.max(0, Math.min(activeTaxableIncome, upper) - slab.min);
 const slabTax = slabAmt * (slab.rate / 100);
 const label = slab.max === Infinity ? `Above ${fmt(slab.min)}` : `${fmt(slab.min)} - ${fmt(slab.max)}`;
 rows.push([`${label} @ ${slab.rate}%`, slab.rate === 0 ? 'Nil' : fmt(slabTax)]);
 }
 });
 rows.push(
 ['---', ''],
 ['Income Tax (After Rebate)', fmt(activeAfterRebate)],
 );
 if (activeSurcharge > 0) {
 rows.push(['Surcharge', fmt(activeSurcharge)]);
 }
 rows.push(
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
 ['Monthly Tax', fmt(monthlyTax)],
 ['Monthly Take-Home', fmt(monthlyTakeHome)],
 ['Net Annual Income', fmt(netAnnual)],
 ['Effective Tax Rate', `${effectiveRate.toFixed(2)}%`],
 );
 await exportToPDF(`Income Tax Report - ${regime === 'old' ? 'Old' : 'New'} Regime (FY ${fy})`, headers, rows, `Income_Tax_Report_FY${fy}`);
 };

 // ══════════════════════════════════════════════════════════════════════════
 // RENDER
 // ══════════════════════════════════════════════════════════════════════════
 return (
 <div className="min-h-dvh bg-slate-50 ">
 {/* Header */}
 <div className="sticky top-0 z-30 bg-slate-50/95 0F172A]/95 backdrop-blur-xl border-b border-slate-200 pt-14 px-4 py-3 flex items-center gap-3">
 <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-[var(--bg-primary)] border border-slate-200 ">
 <ArrowLeft size={18} className="text-slate-700 " />
 </button>
 <div className="flex-1">
 <h1 className="text-slate-900 font-bold text-base">Income Tax Calculator</h1>
 <p className="text-muted-foreground text-[11px]">FY {fy} (AY {fy === '2026-27' ? '2027-28' : '2026-27'}) {fy === '2026-27' ? '• Union Budget 2026' : ''}</p>
 </div>
 </div>

 <div className="px-4 pt-4 pb-28 space-y-4">
 {/* FY Year Selector */}
 <div className="flex gap-2 bg-[var(--bg-primary)] border border-slate-200 rounded-xl p-1">
 {(['2026-27', '2025-26'] as const).map((y) => (
 <motion.button
 key={y}
 onClick={() => setFy(y)}
 className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${fy === y ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-muted-foreground '}`}
 >
 FY {y} {y === '2026-27' ? '(Current)' : ''}
 </motion.button>
 ))}
 </div>

 {/* Budget Info Banner */}
 {fy === '2026-27' && (
 <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/25">
 <div className="flex items-start gap-2">
 <TrendingUp size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
 <div>
 <p className="text-emerald-300 text-xs font-bold">Budget 2026-27 Update</p>
 <p className="text-emerald-400/80 text-[10px] mt-0.5 leading-relaxed">
 Zero tax on income up to ₹12 Lakh under New Regime (after ₹75,000 standard deduction for salaried — effective ₹12.75L for salaried)
 </p>
 </div>
 </div>
 </motion.div>
 )}

 {/* Regime Toggle */}
 <div className="flex gap-1 bg-[var(--bg-primary)] border border-slate-200 rounded-xl p-1">
 {(['new', 'old'] as const).map((r) => (
 <motion.button
 key={r}
 onClick={() => setRegime(r)}
 className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${regime === r ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/30' : 'text-muted-foreground '}`}
 >
 {r === 'new' ? 'New Regime' : 'Old Regime'}
 <br />
 <span className="font-normal text-[9px] opacity-80">{r === 'new' ? `FY ${fy}` : 'With deductions'}</span>
 </motion.button>
 ))}
 </div>

 {/* Salary Input Mode Toggle */}
 <div className="bg-[var(--bg-primary)] border border-slate-200 rounded-2xl p-4">
 <p className="text-muted-foreground text-xs font-semibold mb-2">Input Mode</p>
 <div className="grid grid-cols-2 gap-2">
 {([
 { key: 'monthly' as const, label: 'Monthly Salary' },
 { key: 'annual' as const, label: 'Annual Salary' },
 { key: 'ctc' as const, label: 'CTC Mode' },
 { key: 'payslip' as const, label: 'Payslip Mode' },
 ]).map((m) => (
 <button
 key={m.key}
 onClick={() => setInputMode(m.key)}
 className={`py-2.5 rounded-xl text-xs font-bold transition-all ${inputMode === m.key ? 'bg-brand-purple/10 text-brand-purple border-2 border-brand-purple' : 'bg-slate-50 border-border text-muted-foreground border-2 border-transparent'}`}
 >
 <span className={`inline-block w-3 h-3 rounded-full mr-1.5 align-middle ${inputMode === m.key ? 'bg-brand-purple' : 'bg-slate-300 '}`} />
 {m.label}
 </button>
 ))}
 </div>
 <p className="text-muted-foreground text-[10px] mt-2">
 {inputMode === 'monthly' ? 'Enter monthly values. Annual = Monthly × 12' : inputMode === 'annual' ? 'Enter annual (yearly) values directly.' : inputMode === 'ctc' ? 'Enter total CTC. Auto-computes employer PF, gratuity, and in-hand salary.' : 'Enter exact payslip values (monthly earnings & deductions).'}
 </p>
 </div>

 {/* Income Inputs */}
 {inputMode === 'ctc' ? (
 <div className="bg-[var(--bg-primary)] border border-slate-200 rounded-2xl p-4 space-y-3">
 <h3 className="font-bold text-slate-900 text-sm">CTC Details</h3>
 <InputRow label="Annual CTC" k="ctcAmount" value={inputs.ctcAmount} onChange={set} />
 {num('ctcAmount') > 0 && (
 <div className="bg-slate-50 rounded-xl p-3 space-y-2">
 <p className="text-muted-foreground text-xs font-semibold">Auto-computed Breakdown</p>
 {[
 { label: 'Basic (40%)', val: num('ctcAmount') * 0.4 },
 { label: 'Employer PF (12%)', val: Math.min(num('ctcAmount') * 0.4 * 0.12, 21600) },
 { label: 'Gratuity (4.81%)', val: num('ctcAmount') * 0.4 * 0.0481 },
 { label: 'Gross Salary (In-hand)', val: ctcGross },
 ].map(r => (
 <div key={r.label} className={`flex justify-between ${r.label.includes('Gross') ? 'border-t border-slate-200 pt-2 font-bold' : ''}`}>
 <span className="text-muted-foreground text-xs">{r.label}</span>
 <span className={`text-xs font-semibold ${r.label.includes('Gross') ? 'text-brand-purple' : 'text-slate-700 '}`}>{fmt(r.val)}</span>
 </div>
 ))}
 </div>
 )}
 <InputRow label="Other Income (FD interest, rental, etc.)" k="otherIncome" value={inputs.otherIncome} onChange={set} />
 </div>
 ) : (
 <>
 <div className="bg-[var(--bg-primary)] border border-slate-200 rounded-2xl p-4 space-y-3">
 <h3 className="font-bold text-slate-900 text-sm">
 {inputMode === 'monthly' ? 'Monthly' : inputMode === 'payslip' ? 'Payslip' : 'Annual'} Income Details
 </h3>
 <InputRow label="Basic Salary" k="basicSalary" value={inputs.basicSalary} onChange={set} />
 <InputRow label="HRA (House Rent Allowance)" k="hra" value={inputs.hra} onChange={set} />
 <InputRow label="Special Allowance" k="special" value={inputs.special} onChange={set} />
 <InputRow label="Transport Allowance" k="transportAllowance" value={inputs.transportAllowance} onChange={set} />
 <InputRow label="Medical Allowance" k="medicalAllowance" value={inputs.medicalAllowance} onChange={set} />
 <InputRow label="Food Allowance" k="foodAllowance" value={inputs.foodAllowance} onChange={set} />
 <InputRow label="LTA (Leave Travel Allowance)" k="lta" value={inputs.lta} onChange={set} />
 <InputRow label="Bonus & Other Allowances" k="bonus" value={inputs.bonus} onChange={set} />
 <InputRow label="Other Income (FD interest, rental, etc.)" k="otherIncome" value={inputs.otherIncome} onChange={set} />
 </div>

 {/* Payroll Deductions */}
 <div className="bg-[var(--bg-primary)] border border-slate-200 rounded-2xl p-4 space-y-1">
 <CollapsibleSection title="Payroll Deductions" defaultOpen={inputMode === 'payslip'}>
 <InputRow label="Employee PF (Provident Fund)" k="employeePF" value={inputs.employeePF} onChange={set} hint={inputMode === 'payslip' ? 'From payslip' : '12% of Basic typically'} />
 <InputRow label="Professional Tax" k="professionalTax" value={inputs.professionalTax} onChange={set} hint="Usually ₹200/month (₹2,400/year)" />
 <InputRow label="ESI (Employee State Insurance)" k="esi" value={inputs.esi} onChange={set} hint="1.75% of gross if salary < ₹21,000/month" />
 <InputRow label="NPS (Employee Contribution)" k="npsEmployee" value={inputs.npsEmployee} onChange={set} hint="Voluntary NPS contribution" />
 {payrollDeductions.total > 0 && (
 <div className="bg-[var(--info-bg)] border border-[var(--info-border)] rounded-xl p-3 flex justify-between">
 <span className="text-blue-600 text-xs font-semibold">Total Payroll Deductions</span>
 <span className="text-blue-600 font-bold text-sm">-{fmt(payrollDeductions.total)}</span>
 </div>
 )}
 </CollapsibleSection>
 </div>
 </>
 )}

 {/* Salary Summary Card */}
 <div className="bg-gradient-to-br from-brand-purple/5 to-blue-500/5 border border-brand-purple/20 rounded-2xl p-4">
 <h3 className="font-bold text-slate-900 text-sm mb-3">Salary Summary</h3>
 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <span className="text-muted-foreground text-xs">Gross Annual Income</span>
 <span className="font-extrabold text-slate-900 text-base">{fmt(grossSalary)}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-muted-foreground text-xs">Standard Deduction</span>
 <span className="font-bold text-blue-500 text-sm">-{fmt(regime === 'new' ? newStdDed : 50000)}</span>
 </div>
 <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
 <span className="text-slate-700 text-xs font-bold">Taxable Income</span>
 <span className="font-extrabold text-brand-purple text-base">{fmt(activeTaxableIncome)}</span>
 </div>
 </div>

 {/* New regime no-tax notice */}
 {regime === 'new' && newNoTax && grossSalary > 0 && (
 <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
 <p className="text-emerald-700 text-xs font-semibold text-center">
 No income tax payable under the new regime.
 </p>
 <p className="text-emerald-600 text-[10px] text-center mt-0.5">
 Taxable income is within Rs 12,00,000 exemption limit (Budget 2026-27)
 </p>
 </div>
 )}
 </div>

 {/* Old Regime Deductions */}
 {regime === 'old' && (
 <>
 {/* HRA Exemption */}
 <div className="bg-[var(--bg-primary)] border border-slate-200 rounded-2xl p-4 space-y-3">
 <CollapsibleSection title="Housing Benefits">
 <InputRow label={`HRA Received (${inputMode === 'monthly' ? 'Monthly' : 'Annual'})`} k="hraReceived" value={inputs.hraReceived} onChange={set} />
 <InputRow label={`Rent Paid (${inputMode === 'monthly' ? 'Monthly' : 'Annual'})`} k="rentPaid" value={inputs.rentPaid} onChange={set} />
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={inputs.isMetro === 'true'} onChange={(e) => set('isMetro', e.target.checked ? 'true' : 'false')} className="w-4 h-4 accent-brand-purple" />
 <span className="text-slate-600 text-xs">Metro city (Mumbai, Delhi, Kolkata, Chennai)</span>
 </label>
 <div className="bg-brand-green/10 border border-brand-green/20 rounded-xl p-3 flex justify-between">
 <span className="text-brand-green text-xs font-semibold">HRA Exemption</span>
 <span className="text-brand-green font-bold text-sm">{fmt(hraExemption)}</span>
 </div>
 <InputRow label="Home Loan Interest (Section 24)" k="homeLoan" value={inputs.homeLoan} onChange={set} hint="Max Rs 2,00,000 per year" warning={getWarning('homeLoan', inputs.homeLoan)} />
 </CollapsibleSection>
 </div>

 {/* Section Deductions */}
 <div className="bg-[var(--bg-primary)] border border-slate-200 rounded-2xl p-4 space-y-1">
 <h3 className="font-bold text-slate-900 text-sm mb-2">Deductions (Old Regime)</h3>
 <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center">
 <span className="text-muted-foreground text-xs font-semibold">Standard Deduction</span>
 <span className="font-bold text-brand-purple text-sm">{fmt(50000)}</span>
 </div>

 <CollapsibleSection title="Investment Deductions">
 <InputRow label="Section 80C (PPF, ELSS, LIC)" k="section80C" value={inputs.section80C} onChange={set} hint="Max Rs 1,50,000" warning={getWarning('section80C', inputs.section80C)} />
 <InputRow label="Section 80CCD(1B) — NPS" k="section80CCD" value={inputs.section80CCD} onChange={set} hint="Max Rs 50,000" warning={getWarning('section80CCD', inputs.section80CCD)} />
 </CollapsibleSection>

 <CollapsibleSection title="Insurance & Medical">
 <InputRow label="Section 80D (Health Insurance)" k="section80D" value={inputs.section80D} onChange={set} hint="Max Rs 25,000 (self & family)" warning={getWarning('section80D', inputs.section80D)} />
 </CollapsibleSection>

 <CollapsibleSection title="Additional Deductions">
 <InputRow label="Section 80E (Education Loan Interest)" k="section80E" value={inputs.section80E} onChange={set} hint="No upper limit" />
 <InputRow label="Section 80G (Donations)" k="section80G" value={inputs.section80G} onChange={set} hint="Amount varies by donee" />
 </CollapsibleSection>

 <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
 <span className="text-slate-600 text-sm font-medium">Total Deductions</span>
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
 <p className="text-brand-purple font-semibold text-sm">New Regime — FY {fy}</p>
 <p className="text-muted-foreground text-xs mt-1">
 Standard deduction of Rs 75,000 applied automatically. No manual deductions (HRA, 80C, 80D, etc.) available in the new regime.
 </p>
 <p className="text-brand-purple text-[10px] mt-1 font-semibold">
 {fy === '2026-27'
 ? 'No tax if taxable income ≤ Rs 12,00,000 (Section 87A rebate)'
 : 'Rebate u/s 87A: Up to Rs 12,500 if taxable income ≤ Rs 7,00,000'}
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
 {regime === 'old' ? 'Old Regime' : 'New Regime'} — Total Tax
 </p>
 <h2 className="text-4xl font-extrabold">{activeTotalTax === 0 ? 'NIL' : fmt(activeTotalTax)}</h2>
 <p className="text-foreground/60 text-sm mt-1">
 {activeTotalTax === 0 ? 'No tax payable — within exemption limit' : 'Annual Tax Liability'}
 </p>
 <div className="grid grid-cols-3 gap-3 mt-4">
 {[
 { label: 'Monthly TDS', value: fmt(monthlyTax) },
 { label: 'Eff. Rate', value: `${effectiveRate.toFixed(1)}%` },
 { label: 'Taxable', value: fmt(activeTaxableIncome) },
 ].map((s) => (
 <div key={s.label} className="bg-[var(--bg-primary)]/10 rounded-xl p-2.5 text-center">
 <p className="text-foreground/60 text-[9px] uppercase font-bold tracking-wider mb-0.5">{s.label}</p>
 <p className="text-foreground font-bold text-xs">{s.value}</p>
 </div>
 ))}
 </div>
 </motion.div>

 {/* Step-by-Step Breakdown */}
 <div className="bg-[var(--bg-primary)] border border-slate-200 rounded-2xl p-4 space-y-2">
 <h3 className="font-bold text-slate-900 text-sm mb-3">Step-by-Step Tax Breakdown</h3>
 {[
 { label: 'Gross Annual Income', val: grossSalary, color: 'text-brand-green' },
 { label: `Less: ${regime === 'new' ? 'Standard Deduction' : 'Total Deductions'}`, val: -activeDeductions, color: 'text-blue-400' },
 { label: 'Taxable Income', val: activeTaxableIncome, color: 'text-brand-purple', bold: true },
 { label: 'Income Tax (slab-wise)', val: activeRawTax, color: 'text-muted-foreground' },
 ...(activeRawTax !== activeAfterRebate ? [{ label: 'Less: Rebate u/s 87A', val: -(activeRawTax - activeAfterRebate), color: 'text-emerald-500' }] : []),
 { label: 'Income Tax (after rebate)', val: activeAfterRebate, color: 'text-red-400' },
 ...(activeSurcharge > 0 ? [{ label: 'Surcharge', val: activeSurcharge, color: 'text-amber-500' }] : []),
 { label: 'Health & Education Cess (4%)', val: activeCess, color: 'text-orange-400' },
 { label: 'Final Tax Liability', val: activeTotalTax, color: 'text-red-500', bold: true },
 ].map((row) => (
 <div key={row.label} className={`flex justify-between items-center py-2 ${row.bold ? 'border-t border-slate-100 mt-1' : ''}`}>
 <span className={`text-muted-foreground text-xs ${row.bold ? 'font-bold text-slate-700 ' : ''}`}>{row.label}</span>
 <span className={`font-bold text-sm ${row.color}`}>{row.val < 0 ? '-' : ''}{fmt(Math.abs(row.val))}</span>
 </div>
 ))}
 </div>

 {/* Slab Breakdown */}
 {activeTaxableIncome > 0 && (
 <div className="bg-[var(--bg-primary)] border border-slate-200 rounded-2xl p-4">
 <h3 className="font-bold text-slate-900 text-sm mb-3">Tax Slab Computation</h3>
 <div className="space-y-2">
 {activeSlabs.map((slab, i) => {
 if (activeTaxableIncome <= slab.min) return null;
 const upper = slab.max === Infinity ? activeTaxableIncome : slab.max;
 const slabAmount = Math.max(0, Math.min(activeTaxableIncome, upper) - slab.min);
 const slabTax = slabAmount * (slab.rate / 100);
 return (
 <div key={i} className={`p-3 rounded-xl ${slab.rate === 0 ? 'bg-green-50 ' : slab.rate >= 25 ? 'bg-red-50 ' : 'bg-slate-50 '}`}>
 <div className="flex justify-between items-center">
 <span className="text-xs text-slate-600 font-medium">
 {slab.max === Infinity ? `Above ${fmt(slab.min)}` : `${fmt(slab.min)} – ${fmt(slab.max)}`}
 </span>
 <span className="text-xs font-bold text-slate-800 ">{slab.rate}%</span>
 </div>
 <div className="flex justify-between items-center mt-1">
 <span className="text-[10px] text-muted-foreground">On {fmt(slabAmount)}</span>
 <span className="text-xs font-bold text-brand-purple">{slab.rate === 0 ? 'Nil' : `Tax: ${fmt(slabTax)}`}</span>
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
 <p className="text-brand-green text-xs font-semibold uppercase tracking-wider">Monthly Take-Home</p>
 <p className="text-3xl font-extrabold text-brand-green mt-1">{fmt(monthlyTakeHome)}</p>
 </div>
 <TrendingUp className="w-12 h-12 text-brand-green opacity-30" />
 </div>
 <p className="text-brand-green/50 text-[10px] mt-1">
 Net Annual Income ({fmt(netAnnual)}) ÷ 12
 </p>
 <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-brand-green/20">
 {[
 { label: 'Monthly Salary', value: fmt(grossSalary / 12), color: 'text-brand-green' },
 { label: 'Monthly Tax', value: fmt(monthlyTax), color: 'text-red-400' },
 { label: 'Net Annual Income', value: fmt(netAnnual), color: 'text-brand-green' },
 { label: 'Effective Tax Rate', value: `${effectiveRate.toFixed(1)}%`, color: 'text-brand-purple' },
 ].map((item) => (
 <div key={item.label} className="text-center bg-[var(--bg-primary)]/50 rounded-xl p-2.5">
 <p className="text-brand-green/60 text-[9px] uppercase font-bold">{item.label}</p>
 <p className={`${item.color} font-bold text-xs mt-0.5`}>{item.value}</p>
 </div>
 ))}
 </div>
 </div>

 {/* Regime Comparison */}
 <div className="bg-[var(--bg-primary)] border border-slate-200 rounded-2xl p-4">
 <h3 className="font-bold text-slate-900 text-sm mb-3">Old vs New Regime</h3>
 <div className="space-y-2 mb-4">
 {[
 { label: 'Old Regime', tax: oldTotalTax, better: betterRegime === 'Old' && !bothZero },
 { label: 'New Regime', tax: newTotalTax, better: betterRegime === 'New' && !bothZero },
 ].map((r) => (
 <div key={r.label} className={`flex items-center justify-between p-3 rounded-xl border-2 ${r.better ? 'border-brand-green bg-brand-green/5' : 'border-slate-100 bg-slate-50 '}`}>
 <div className="flex items-center gap-2">
 {r.better && <span className="w-5 h-5 rounded-full bg-brand-green flex items-center justify-center text-foreground text-[10px] font-bold">✓</span>}
 <span className="text-slate-700 text-sm font-medium">{r.label}</span>
 </div>
 <span className={`font-extrabold text-sm ${r.better ? 'text-brand-green' : 'text-slate-700 '}`}>
 {r.tax === 0 ? 'NIL' : fmt(r.tax)}
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
 <div key={i} className="h-5 bg-slate-100 border-border rounded-full overflow-hidden">
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
 <div className={`p-4 rounded-xl text-center ${bothZero ? 'bg-emerald-50 border border-emerald-200 ' : 'bg-brand-green/10 border border-brand-green/20'}`}>
 <p className="text-xs text-muted-foreground mb-1">Recommended Regime</p>
 {bothZero ? (
 <>
 <p className="font-extrabold text-lg text-emerald-600 ">NO TAX DUE</p>
 <p className="text-emerald-600/80 text-xs mt-1">Income within exemption limit under both regimes</p>
 </>
 ) : (
 <>
 <p className="font-extrabold text-lg text-brand-green">{betterRegime.toUpperCase()} REGIME</p>
 <p className="text-brand-green text-xs mt-1">Estimated Tax Saving: {fmt(saving)}</p>
 {regimeExplanation && (
 <p className="text-muted-foreground text-[10px] mt-2 leading-relaxed text-left">{regimeExplanation}</p>
 )}
 </>
 )}
 </div>
 </div>

 {/* Tax-Saving Suggestions */}
 {tips.length > 0 && (
 <div className="bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded-2xl p-4">
 <div className="flex items-center gap-2 mb-3">
 <Lightbulb size={16} className="text-amber-600" />
 <h3 className="font-bold text-amber-800 text-sm">Tax-Saving Suggestions</h3>
 </div>
 <div className="space-y-2">
 {tips.map((tip, i) => (
 <p key={i} className="text-amber-700 text-xs leading-relaxed flex gap-2">
 <span className="text-amber-500 font-bold flex-shrink-0">{i + 1}.</span>{tip}
 </p>
 ))}
 </div>
 </div>
 )}

 {/* Download PDF */}
 <motion.button whileTap={{ scale: 0.97 }} onClick={handleDownloadPDF} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-purple text-white font-bold shadow-lg shadow-brand-purple/30">
 <Download size={18} /> Download Tax Report (PDF)
 </motion.button>
 </>
 )}

 <FinancialQuote />

 {/* Collapsible Disclaimer */}
 <div className="bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded-2xl overflow-hidden">
 <button onClick={() => setShowDisclaimer(!showDisclaimer)} className="w-full flex items-center justify-between p-4">
 <div className="flex items-center gap-2">
 <Info size={16} className="text-amber-600" />
 <span className="font-bold text-amber-800 text-sm">Important Disclaimer</span>
 </div>
 <div className="flex items-center gap-1">
 <span className="text-amber-500 text-[10px]">Tap to View</span>
 {showDisclaimer ? <ChevronUp size={14} className="text-amber-500" /> : <ChevronDown size={14} className="text-amber-500" />}
 </div>
 </button>
 <AnimatePresence>
 {showDisclaimer && (
 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
 <div className="px-4 pb-4">
 <p className="text-amber-700 text-xs leading-relaxed">
 <strong>⚠️ This calculator is for estimation purposes only.</strong> Actual tax liability may vary depending on your complete financial profile, surcharges, additional income sources, or special circumstances. Tax laws are subject to change. Please consult a <strong>Chartered Accountant (CA)</strong> or qualified tax professional for actual tax filing and planning. All calculations are based on FY {fy} tax rules as per publicly available budget documents.
 </p>
 <a href="https://www.incometax.gov.in" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-amber-700 text-xs font-semibold mt-2">
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