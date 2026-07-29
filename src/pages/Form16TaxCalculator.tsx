import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Trash2, Download, AlertTriangle, Briefcase, FileText, ChevronDown, ChevronUp, Info, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import { AnalyticsService } from '../lib/analytics';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { useHistoryTracker } from '../hooks/useHistoryTracker';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import {
    calculateJobSwitchTax,
    EmployerInput,
    Regime,
    FY,
    AgeCategory,
    STD_DEDUCTION_NEW,
    STD_DEDUCTION_OLD,
    round288B,
    calculateLateFiling,
} from '../utils/jobSwitchTax';

// Statutory (non-audit) ITR due date: 31 July of the assessment year
const DUE_DATES: Record<FY, string> = { '2025-26': '31 Jul 2026', '2026-27': '31 Jul 2027' };
const AY_MAP: Record<FY, string> = { '2025-26': '2026-27', '2026-27': '2027-28' };

const todayISO = () => new Date().toISOString().slice(0, 10);

const fmt = (n: number) => `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;

// String-typed form model per employer; parsed to numbers at compute time
interface EmployerForm {
    name: string;
    grossSalary: string;
    gratuityExempt: string;
    leaveEncashmentExempt: string;
    hraExempt: string;
    otherExempt: string;
    professionalTax: string;
    tdsDeducted: string;
}

const emptyEmployer = (name: string): EmployerForm => ({
    name,
    grossSalary: '',
    gratuityExempt: '',
    leaveEncashmentExempt: '',
    hraExempt: '',
    otherExempt: '',
    professionalTax: '',
    tdsDeducted: '',
});

const n = (v: string) => parseFloat(v || '0') || 0;

const InputRow = memo(({ label, value, onChange, hint }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    hint?: string;
}) => (
    <div className="space-y-1">
        <label className="text-muted-foreground text-xs font-semibold">{label}</label>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-card border border-border rounded-xl px-3 py-2.5 focus-within:border-brand-purple transition-colors">
            <span className="text-brand-purple font-bold text-sm flex-shrink-0">₹</span>
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                spellCheck={false}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent text-slate-900 dark:text-foreground text-sm font-semibold outline-none"
            />
        </div>
        {hint && <p className="text-muted-foreground text-[10px]">{hint}</p>}
    </div>
));

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
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

export default function Form16TaxCalculator() {
    const { t } = useTranslation();
    useEffect(() => { AnalyticsService.trackScreen('Form16_Tax'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();

    const [regime, setRegime] = useState<Regime>('new');
    const [fy, setFy] = useState<FY>('2025-26');
    const [ageCategory, setAgeCategory] = useState<AgeCategory>('below_60');
    // Single Form 16 by default — most taxpayers hold one; job switchers add more.
    const [employers, setEmployers] = useState<EmployerForm[]>([
        emptyEmployer(t('jobTax.form16N', 'Form 16 #{{n}}', { n: 1 })),
    ]);
    const [savingsInterest, setSavingsInterest] = useState('');
    const [otherInterest, setOtherInterest] = useState('');
    const [advanceTax, setAdvanceTax] = useState('');
    const [sec80C, setSec80C] = useState('');
    const [sec80D, setSec80D] = useState('');
    const [sec80CCD1B, setSec80CCD1B] = useState('');
    const [housePropLoss, setHousePropLoss] = useState('');
    const [paymentDate, setPaymentDate] = useState(todayISO());
    const [filingDate, setFilingDate] = useState(todayISO());
    // Optional — printed on the exported statement only; never leaves the device
    const [reportName, setReportName] = useState('');
    const [reportPan, setReportPan] = useState('');

    const setEmp = useCallback((i: number, k: keyof EmployerForm, v: string) => {
        setEmployers((prev) => prev.map((e, idx) => (idx === i ? { ...e, [k]: v } : e)));
    }, []);

    const addEmployer = () => {
        if (employers.length >= 5) return;
        setEmployers((prev) => [...prev, emptyEmployer(t('jobTax.form16N', 'Form 16 #{{n}}', { n: prev.length + 1 }))]);
    };
    const removeEmployer = (i: number) => {
        if (employers.length <= 1) return;
        setEmployers((prev) => prev.filter((_, idx) => idx !== i));
    };

    const toEngineInput = useCallback((e: EmployerForm): EmployerInput => ({
        name: e.name,
        grossSalary: n(e.grossSalary),
        gratuityExempt: n(e.gratuityExempt),
        leaveEncashmentExempt: n(e.leaveEncashmentExempt),
        hraExempt: n(e.hraExempt),
        otherExempt: n(e.otherExempt),
        professionalTax: n(e.professionalTax),
        tdsDeducted: n(e.tdsDeducted),
    }), []);

    const baseParams = useMemo(() => ({
        employers: employers.map(toEngineInput),
        otherIncome: { savingsInterest: n(savingsInterest), otherInterest: n(otherInterest) },
        fy,
        ageCategory,
        oldDeductions: { section80C: n(sec80C), section80D: n(sec80D), section80CCD1B: n(sec80CCD1B), housePropertyLoss: n(housePropLoss) },
        advanceTaxPaid: n(advanceTax),
    }), [employers, toEngineInput, savingsInterest, otherInterest, fy, ageCategory, sec80C, sec80D, sec80CCD1B, housePropLoss, advanceTax]);

    const newResult = useMemo(() => calculateJobSwitchTax({ ...baseParams, regime: 'new' }), [baseParams]);
    const oldResult = useMemo(() => calculateJobSwitchTax({ ...baseParams, regime: 'old' }), [baseParams]);
    const result = regime === 'new' ? newResult : oldResult;

    const hasIncome = result.totalGrossSalary > 0;
    const betterRegime = oldResult.totalTaxLiability <= newResult.totalTaxLiability ? 'old' : 'new';
    const regimeSaving = Math.abs(oldResult.totalTaxLiability - newResult.totalTaxLiability);

    const lateResult = useMemo(() => calculateLateFiling({
        fy,
        regime,
        ageCategory,
        totalIncome: result.totalIncomeRounded,
        totalTaxLiability: result.totalTaxLiability,
        totalTDS: result.totalTDS,
        advanceTaxPaid: n(advanceTax),
        paymentDate,
        filingDate,
    }), [fy, regime, ageCategory, result, advanceTax, paymentDate, filingDate]);

    useHistoryTracker('Form 16 Tax Calculator', { regime, fy, employers: employers.length }, { totalIncome: result.totalIncomeRounded }, result.totalTaxLiability);

    // ─── Export (PDF labels stay English — jsPDF font limitation) ─────────────
    const buildExportConfig = (): ExportConfig => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2, '0')}${String(dt.getMonth() + 1).padStart(2, '0')}${dt.getFullYear()}`;
        return {
            title: `Statement of Income — FY ${fy} (AY ${AY_MAP[fy]})`,
            subtitle: `${reportName ? `${reportName}${reportPan ? ` · PAN ${reportPan}` : ''} — ` : ''}${regime === 'new' ? 'New Regime u/s 115BAC' : 'Old Regime'} · Individual, Resident`,
            inputs: [
                ...(reportName ? [{ label: 'Name of Assessee', value: reportName }] : []),
                ...(reportPan ? [{ label: 'PAN', value: reportPan }] : []),
                { label: 'Status', value: 'Individual — Resident' },
                { label: 'Previous Year / Assessment Year', value: `FY ${fy} / AY ${AY_MAP[fy]}` },
                { label: 'Tax Regime', value: regime === 'new' ? 'New Regime (u/s 115BAC)' : 'Old Regime' },
                { label: 'Form 16s combined', value: String(employers.length) },
                { label: 'Income from other sources', value: fmt(result.otherIncomeTotal) },
                { label: 'Prepared on', value: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
            ],
            results: [
                { label: 'Total salary (all employers)', value: fmt(result.totalSalary) },
                { label: 'Standard deduction u/s 16(ia) — applied ONCE', value: `-${fmt(result.standardDeduction)}` },
                ...(result.professionalTaxDeduction > 0 ? [{ label: 'Professional tax u/s 16(iii)', value: `-${fmt(result.professionalTaxDeduction)}` }] : []),
                { label: 'Income chargeable under "Salaries"', value: fmt(result.salaryIncome) },
                ...(result.chapterVIA > 0 ? [{ label: 'Chapter VI-A deductions', value: `-${fmt(result.chapterVIA)}` }] : []),
                { label: 'Total income (rounded u/s 288A)', value: fmt(result.totalIncomeRounded) },
                { label: 'Tax on total income', value: fmt(result.taxOnIncome) },
                { label: 'Rebate u/s 87A', value: `-${fmt(result.rebate87A)}` },
                ...(result.surcharge > 0 ? [{ label: 'Surcharge', value: fmt(result.surcharge) }] : []),
                { label: 'Health & Education Cess (4%)', value: fmt(result.cess) },
                { label: 'Net tax payable (incl. cess)', value: fmt(result.totalTaxLiability) },
                { label: 'TDS credit (all Form 16s)', value: `-${fmt(result.totalTDS)}` },
                ...(result.advanceTaxPaid > 0 ? [{ label: 'Advance / self-assessment tax', value: `-${fmt(result.advanceTaxPaid)}` }] : []),
                { label: result.balancePayable >= 0 ? 'BALANCE TAX PAYABLE (rounded u/s 288B)' : 'REFUND DUE (rounded u/s 288B)', value: fmt(result.balancePayable) },
                ...(result.balancePayable > 0 && lateResult.totalInterestAndFee > 0 ? [
                    ...(lateResult.interest234A > 0 ? [{ label: `Interest u/s 234A (pay by ${paymentDate})`, value: fmt(lateResult.interest234A) }] : []),
                    ...(lateResult.interest234B > 0 ? [{ label: 'Interest u/s 234B', value: fmt(lateResult.interest234B) }] : []),
                    ...(lateResult.interest234C > 0 ? [{ label: 'Interest u/s 234C', value: fmt(lateResult.interest234C) }] : []),
                    ...(lateResult.fee234F > 0 ? [{ label: 'Late-filing fee u/s 234F', value: fmt(lateResult.fee234F) }] : []),
                    { label: 'TOTAL PAYABLE (tax + interest + fee)', value: fmt(lateResult.totalPayableWithInterest) },
                ] : []),
                { label: 'Regime comparison', value: `Old ${fmt(oldResult.totalTaxLiability)} vs New ${fmt(newResult.totalTaxLiability)} — ${betterRegime === 'new' ? 'New' : 'Old'} regime saves ${fmt(regimeSaving)}` },
                { label: `File ITR-1 by`, value: DUE_DATES[fy] },
            ],
            projectionTitle: 'Employer-wise Form 16 Summary',
            projectionColumns: ['Employer', 'Gross Salary', 'Exempt u/s 10', 'Taxable Salary', 'TDS Deducted'],
            projectionRows: result.employers.map((e, i) => [
                e.name || `Employer ${i + 1}`, fmt(e.grossSalary), fmt(e.exemptTotal), fmt(e.taxableSalary), fmt(e.tdsDeducted),
            ]),
            additionalTables: [
                // CA-style per-employer schedules (mirrors the Received/Exempt/Taxable working)
                ...result.employers.map((e, i) => ({
                    title: `Schedule ${i + 1} — ${e.name || `Employer ${i + 1}`}`,
                    columns: ['Particulars', 'Amount'],
                    rows: [
                        ['Gross salary (Form 16 Part B, row 1(d))', fmt(e.grossSalary)],
                        ...(n(employers[i]?.gratuityExempt) > 0 ? [['Less: Gratuity exempt u/s 10(10)', `- ${fmt(n(employers[i].gratuityExempt))}`]] : []),
                        ...(n(employers[i]?.leaveEncashmentExempt) > 0 ? [['Less: Leave encashment exempt u/s 10(10AA)', `- ${fmt(n(employers[i].leaveEncashmentExempt))}`]] : []),
                        ...(n(employers[i]?.otherExempt) > 0 ? [['Less: Duty allowances exempt u/s 10(14)(i)', `- ${fmt(n(employers[i].otherExempt))}`]] : []),
                        ...(regime === 'old' && n(employers[i]?.hraExempt) > 0 ? [['Less: HRA exempt u/s 10(13A)', `- ${fmt(n(employers[i].hraExempt))}`]] : []),
                        ['Taxable salary from this employer', fmt(e.taxableSalary)],
                        ['TDS deducted (Form 16 Part A)', fmt(e.tdsDeducted)],
                        ['Tax this employer computed standalone', fmt(e.standaloneTax)],
                    ] as Array<Array<string | number>>,
                })),
                ...(result.balancePayable > 0 && lateResult.totalInterestAndFee > 0 ? [{
                    title: 'Interest & Late Fee (u/s 234A / 234B / 234C / 234F)',
                    columns: ['Particulars', 'Amount'],
                    rows: [
                        ...(lateResult.interest234A > 0 ? [['Interest u/s 234A — filing/payment after due date', fmt(lateResult.interest234A)]] : []),
                        ...(lateResult.interest234B > 0 ? [['Interest u/s 234B — advance tax default', fmt(lateResult.interest234B)]] : []),
                        ...(lateResult.interest234C > 0 ? [['Interest u/s 234C — instalment deferment', fmt(lateResult.interest234C)]] : []),
                        ...(lateResult.fee234F > 0 ? [['Late-filing fee u/s 234F', fmt(lateResult.fee234F)]] : []),
                        ['TOTAL PAYABLE (tax + interest + fee)', fmt(lateResult.totalPayableWithInterest)],
                    ] as Array<Array<string | number>>,
                }] : []),
                (() => {
                    const taxesPaidAfter = result.totalTDS + result.advanceTaxPaid + Math.max(0, result.balancePayable);
                    const predicted = round288B(result.totalTaxLiability - taxesPaidAfter);
                    return {
                        title: 'Predicted ITR Acknowledgement (ITR-V) — match these after filing',
                        columns: ['Line', 'Amount'],
                        rows: [
                            ['Total Income', fmt(result.totalIncomeRounded)],
                            ['Net tax payable', fmt(result.totalTaxLiability)],
                            ['Taxes Paid (incl. balance above)', fmt(taxesPaidAfter)],
                            [predicted < 0 ? '(-) Refundable' : '(+) Tax Payable', predicted === 0 ? 'NIL' : fmt(predicted)],
                        ] as Array<Array<string | number>>,
                    };
                })(),
                {
                    title: 'Notes & Disclaimer',
                    columns: ['Note'],
                    rows: [
                        ['1. Computerised estimate generated by FinCalix from figures entered by you. It is NOT a certificate, professional tax advice, or a document of the Income Tax Department.'],
                        ['2. Verify every salary and TDS figure against Form 26AS and AIS on the e-filing portal before filing — TDS credit is granted strictly as per Form 26AS.'],
                        ['3. Scope: salaried income within ITR-1. Capital gains beyond Sec 112A limits, business/professional income, foreign assets, or tax notices need a qualified professional.'],
                        ...(fy === '2026-27' ? [['4. FY 2026-27 falls under the Income-tax Act, 2025 — rates unchanged; section numbers differ (87A→156, 234A/B/C→423/424/425, 288A/288B→516).']] : []),
                        [`${fy === '2026-27' ? '5' : '4'}. Slab rates and rebates verified for FY ${fy} (post Budget 2026). Computation performed entirely on your device — no data is uploaded.`],
                    ] as Array<Array<string | number>>,
                },
            ],
            notes: result.multiEmployerTrap
                ? 'NOTE: Each employer applied the full standard deduction and Section 87A rebate on its own salary, so combined TDS fell short of the actual liability. Pay the balance as self-assessment tax before filing your ITR.'
                : undefined,
            filename: `FinCalix_Form16Tax_${tag}`,
        };
    };

    const statementRows = [
        { label: t('jobTax.rowTotalSalary', 'Total salary (all employers)'), val: result.totalSalary, color: 'text-brand-green' },
        { label: t('jobTax.rowStdDed', 'Less: Standard deduction u/s 16(ia) — once'), val: -result.standardDeduction, color: 'text-blue-400' },
        ...(result.professionalTaxDeduction > 0 ? [{ label: t('jobTax.rowProfTax', 'Less: Professional tax u/s 16(iii)'), val: -result.professionalTaxDeduction, color: 'text-blue-400' }] : []),
        { label: t('jobTax.rowSalaryIncome', 'Income under "Salaries"'), val: result.salaryIncome, color: 'text-brand-purple', bold: true },
        ...(result.otherIncomeTotal > 0 ? [{ label: t('jobTax.rowOtherIncome', 'Add: Income from other sources'), val: result.otherIncomeTotal, color: 'text-brand-green' }] : []),
        ...(result.chapterVIA > 0 ? [{ label: t('jobTax.rowChapterVIA', 'Less: Chapter VI-A (80C/80D/80TTA…)'), val: -result.chapterVIA, color: 'text-blue-400' }] : []),
        { label: t('jobTax.rowTotalIncome', 'Total income (rounded u/s 288A)'), val: result.totalIncomeRounded, color: 'text-brand-purple', bold: true },
        { label: t('jobTax.rowTaxOnIncome', 'Tax on total income'), val: result.taxOnIncome, color: 'text-muted-foreground' },
        ...(result.rebate87A > 0 ? [{ label: t('jobTax.rowRebate', 'Less: Rebate u/s 87A (marginal relief)'), val: -result.rebate87A, color: 'text-emerald-500' }] : []),
        ...(result.surcharge > 0 ? [{ label: t('jobTax.rowSurcharge', 'Add: Surcharge'), val: result.surcharge, color: 'text-amber-500' }] : []),
        { label: t('jobTax.rowCess', 'Add: Health & Education Cess (4%)'), val: result.cess, color: 'text-orange-400' },
        { label: t('jobTax.rowLiability', 'Net tax payable (incl. cess)'), val: result.totalTaxLiability, color: 'text-red-500', bold: true },
        { label: t('jobTax.rowTds', 'Less: TDS credit (all Form 16s)'), val: -result.totalTDS, color: 'text-emerald-500' },
        ...(result.advanceTaxPaid > 0 ? [{ label: t('jobTax.rowAdvance', 'Less: Advance / self-assessment tax'), val: -result.advanceTaxPaid, color: 'text-emerald-500' }] : []),
    ];

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-background">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-[#0F172A] border-b border-slate-200 dark:border-white/10 pt-14 px-4 py-3 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <ArrowLeft size={18} className="text-slate-700 dark:text-foreground" />
                </button>
                <div className="flex-1">
                    <h1 className="text-slate-900 dark:text-foreground font-bold text-base">{t('jobTax.title', 'Form 16 Tax Calculator')}</h1>
                    <p className="text-muted-foreground text-[11px]">{t('jobTax.subtitle', 'Enter Form 16 (Part A & B) → exact tax payable or refund → file ITR yourself')}</p>
                </div>
            </div>

            <div className="px-4 pt-4 pb-28 space-y-4">
                {/* Why this matters */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/25">
                    <div className="flex items-start gap-2">
                        <Info size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-amber-700 dark:text-amber-400/90 text-[11px] leading-relaxed">
                            {t('jobTax.whyBanner', 'One Form 16? See your exact refund or tax payable instantly. Switched jobs? Add every Form 16 — each employer applies the full standard deduction and 87A rebate on its own salary, so combined TDS often falls short. FinCalix prepares the same Statement of Income a CA would, so you file on the income-tax portal with zero surprises.')}
                        </p>
                    </div>
                </div>

                {/* How to read your Form 16 — plain-language mapping for first-timers */}
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-1">
                    <Collapsible title={t('jobTax.form16HelpTitle', 'Where do I find these numbers in my Form 16?')}>
                        <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
                            <p>• {t('jobTax.form16Help1', 'Part A (first pages): the "Total (Rs.)" of the quarterly TDS table → enter as "TDS deducted".')}</p>
                            <p>• {t('jobTax.form16Help2', 'Part B, row 1(d) "Total" → enter as "Gross salary".')}</p>
                            <p>• {t('jobTax.form16Help3', 'Part B, rows 2(a)–2(h) → the Section 10 exempt amounts (gratuity, leave encashment, HRA). Employers often miss some — payslips may show more.')}</p>
                            <p>• {t('jobTax.form16Help4', 'Switched jobs during the year? You get ONE Form 16 from EACH employer — add every one of them below.')}</p>
                        </div>
                    </Collapsible>
                </div>

                {/* FY selector */}
                <div className="flex gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
                    {(['2025-26', '2026-27'] as const).map((y) => (
                        <button key={y} onClick={() => setFy(y)}
                            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${fy === y ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-muted-foreground'}`}>
                            FY {y}
                        </button>
                    ))}
                </div>

                {/* Income-tax Act 2025 notice — applies from Tax Year 2026-27 */}
                {fy === '2026-27' && (
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-700/30 flex items-start gap-2">
                        <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-blue-700 dark:text-blue-400/90 text-[10px] leading-relaxed">
                            {t('jobTax.newActNote', 'FY 2026-27 falls under the new Income-tax Act, 2025 ("Tax Year 2026-27"). Rates are unchanged — only section numbers change: 87A→156, 234A/B/C→423/424/425, 288A/288B→516. Every figure here stays identical.')}
                        </p>
                    </div>
                )}

                {/* Regime toggle */}
                <div className="flex gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
                    {(['new', 'old'] as const).map((r) => (
                        <button key={r} onClick={() => setRegime(r)}
                            className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${regime === r ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/30' : 'text-muted-foreground'}`}>
                            {r === 'new' ? t('tax.newRegime', 'New Regime') : t('tax.oldRegime', 'Old Regime')}
                            <br />
                            <span className="font-normal text-[9px] opacity-80">
                                {r === 'new' ? `${t('jobTax.stdDed', 'Std deduction')} ${fmt(STD_DEDUCTION_NEW)}` : `${t('jobTax.stdDed', 'Std deduction')} ${fmt(STD_DEDUCTION_OLD)}`}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Age category (old regime only) */}
                {regime === 'old' && (
                    <div className="flex gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
                        {([
                            { id: 'below_60' as const, label: t('tax.below60', 'Below 60') },
                            { id: 'senior' as const, label: t('tax.senior', 'Senior 60–79') },
                            { id: 'super_senior' as const, label: t('tax.superSenior', 'Super 80+') },
                        ]).map((opt) => (
                            <button key={opt.id} onClick={() => setAgeCategory(opt.id)}
                                className={`flex-1 py-2 px-1 text-[10px] font-bold rounded-lg transition-all ${ageCategory === opt.id ? 'bg-brand-purple text-white shadow-md' : 'text-muted-foreground'}`}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Employer cards */}
                {employers.map((emp, i) => (
                    <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <Briefcase size={16} className="text-brand-purple flex-shrink-0" />
                            <input
                                type="text"
                                value={emp.name}
                                onChange={(e) => setEmp(i, 'name', e.target.value)}
                                className="flex-1 bg-transparent text-slate-900 dark:text-foreground text-sm font-bold outline-none border-b border-transparent focus:border-brand-purple"
                                placeholder={t('jobTax.employerName', 'Employer name (top of your Form 16)')}
                            />
                            {employers.length > 1 && (
                                <button onClick={() => removeEmployer(i)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                        <InputRow
                            label={t('jobTax.grossSalary', 'Gross salary — Form 16 Part B, row 1(d)')}
                            value={emp.grossSalary}
                            onChange={(v) => setEmp(i, 'grossSalary', v)}
                            hint={t('jobTax.grossSalaryHint', 'Salary u/s 17(1) + perquisites 17(2) + profits in lieu 17(3)')}
                        />
                        <InputRow
                            label={t('jobTax.tds', 'TDS deducted — Form 16 Part A, "Total (Rs.)"')}
                            value={emp.tdsDeducted}
                            onChange={(v) => setEmp(i, 'tdsDeducted', v)}
                            hint={t('jobTax.tdsHint', 'Part A is the TRACES pages with the quarterly TDS table. If TDS is 0, enter 0.')}
                        />
                        <Collapsible title={t('jobTax.exemptSection', 'Exempt allowances — Section 10 (optional)')}>
                            <InputRow label={t('jobTax.gratuity', 'Gratuity exempt u/s 10(10)')} value={emp.gratuityExempt} onChange={(v) => setEmp(i, 'gratuityExempt', v)} />
                            <InputRow label={t('jobTax.leaveEncashment', 'Leave encashment exempt u/s 10(10AA)')} value={emp.leaveEncashmentExempt} onChange={(v) => setEmp(i, 'leaveEncashmentExempt', v)} hint={t('jobTax.leaveEncashmentHint', 'On resignation/retirement — exempt in both regimes')} />
                            <InputRow label={t('jobTax.otherExempt', 'Duty allowances exempt u/s 10(14)(i)')} value={emp.otherExempt} onChange={(v) => setEmp(i, 'otherExempt', v)} hint={t('jobTax.otherExemptHint', 'Conveyance / daily / travel-on-tour allowances actually spent on duty — allowed even in the new regime')} />
                            {regime === 'old' && (
                                <>
                                    <InputRow label={t('jobTax.hraExempt', 'HRA exempt u/s 10(13A)')} value={emp.hraExempt} onChange={(v) => setEmp(i, 'hraExempt', v)} hint={t('jobTax.hraExemptHint', 'Old regime only — use the HRA Calculator to compute this')} />
                                    <InputRow label={t('jobTax.profTax', 'Professional tax u/s 16(iii)')} value={emp.professionalTax} onChange={(v) => setEmp(i, 'professionalTax', v)} />
                                </>
                            )}
                        </Collapsible>
                        {n(emp.grossSalary) > 0 && (
                            <div className="bg-muted rounded-xl p-3 flex justify-between items-center">
                                <span className="text-muted-foreground text-xs font-semibold">{t('jobTax.taxableFromEmployer', 'Taxable salary from this employer')}</span>
                                <span className="text-brand-purple font-bold text-sm">{fmt(result.employers[i]?.taxableSalary ?? 0)}</span>
                            </div>
                        )}
                    </div>
                ))}

                {employers.length < 5 && (
                    <button onClick={addEmployer}
                        className="w-full py-3 rounded-2xl border-2 border-dashed border-brand-purple/40 text-brand-purple text-sm font-bold flex items-center justify-center gap-2 hover:bg-brand-purple/5 transition-colors">
                        <Plus size={16} /> {t('jobTax.addForm16', 'Add another Form 16 (switched jobs?)')}
                    </button>
                )}

                {/* Other income */}
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                    <h3 className="font-bold text-slate-900 dark:text-foreground text-sm">{t('jobTax.otherIncomeTitle', 'Income from Other Sources')}</h3>
                    <p className="text-muted-foreground text-[10px] -mt-1.5 leading-relaxed">{t('jobTax.aisHint', 'Tip: open AIS on the e-filing portal — it already lists your savings/FD interest and dividends. Copy the amounts from there so nothing is missed.')}</p>
                    <InputRow label={t('jobTax.savingsInterest', 'Savings account interest')} value={savingsInterest} onChange={setSavingsInterest} hint={regime === 'old' ? t('jobTax.savingsInterestHint', '80TTA deduction up to ₹10,000 applied automatically') : undefined} />
                    <InputRow label={t('jobTax.otherInterest', 'FD/RD interest & other income')} value={otherInterest} onChange={setOtherInterest} />
                    <InputRow label={t('jobTax.advanceTax', 'Advance / self-assessment tax already paid')} value={advanceTax} onChange={setAdvanceTax} />
                </div>

                {/* Old regime Chapter VI-A */}
                {regime === 'old' && (
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                        <h3 className="font-bold text-slate-900 dark:text-foreground text-sm">{t('jobTax.deductionsTitle', 'Deductions — Chapter VI-A (Old Regime)')}</h3>
                        <InputRow label={t('tax.sec80C', 'Section 80C (max ₹1.5L)')} value={sec80C} onChange={setSec80C} />
                        <InputRow label={t('tax.sec80D', 'Section 80D — Health insurance')} value={sec80D} onChange={setSec80D} hint={t('jobTax.sec80DHint2', 'Enter the deductible amount from Form 16 row 10(g) — self ₹25K (₹50K senior) + parents up to ₹50K; max ₹1L')} />
                        <InputRow label={t('jobTax.sec80CCD1B', 'Section 80CCD(1B) — NPS (max ₹50K)')} value={sec80CCD1B} onChange={setSec80CCD1B} />
                        <InputRow
                            label={t('jobTax.housePropLoss', 'Home loan interest / house property loss (max ₹2L)')}
                            value={housePropLoss}
                            onChange={setHousePropLoss}
                            hint={t('jobTax.housePropLossHint', 'Form 16 Part B row 7(a) shows this as a negative figure — enter it as a positive number. Old regime only.')}
                        />
                    </div>
                )}

                {/* ════════ RESULTS ════════ */}
                {hasIncome && (
                    <>
                        {/* Multi-employer trap warning */}
                        {result.multiEmployerTrap && (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600">
                                <div className="flex items-start gap-2.5">
                                    <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-amber-800 dark:text-amber-300 text-xs font-bold">{t('jobTax.trapTitle', 'Job-switch TDS shortfall detected')}</p>
                                        <p className="text-amber-700 dark:text-amber-400/90 text-[11px] mt-1 leading-relaxed">
                                            {t('jobTax.trapDesc', 'Each employer computed TDS on its own salary alone — applying the full standard deduction and 87A rebate — so their combined TDS ({{tds}}) is less than your actual liability ({{liability}}). Pay the balance of {{balance}} as self-assessment tax on the e-filing portal before submitting your ITR to avoid interest u/s 234B/234C.', {
                                                tds: fmt(result.totalTDS),
                                                liability: fmt(result.totalTaxLiability),
                                                balance: fmt(result.balancePayable),
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Hero card */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className={`rounded-3xl p-6 text-white shadow-xl ${result.balancePayable > 0 ? 'bg-gradient-to-br from-red-500 to-orange-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
                            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
                                {result.balancePayable > 0 ? t('jobTax.balancePayable', 'Balance Tax Payable') : result.balancePayable < 0 ? t('jobTax.refundDue', 'Refund Due') : t('jobTax.fullySettled', 'Tax Fully Settled')}
                            </p>
                            <h2 className="text-4xl font-extrabold">{result.balancePayable === 0 ? t('tax.nil', 'NIL') : fmt(result.balancePayable)}</h2>
                            <p className="text-white/60 text-sm mt-1">
                                {t('jobTax.heroSub', 'Liability {{liability}} − TDS & taxes paid {{tds}}', { liability: fmt(result.totalTaxLiability), tds: fmt(result.totalTDS + result.advanceTaxPaid) })}
                            </p>
                            <div className="grid grid-cols-3 gap-3 mt-4">
                                {[
                                    { label: t('jobTax.totalIncomeShort', 'Total Income'), value: fmt(result.totalIncomeRounded) },
                                    { label: t('jobTax.liabilityShort', 'Tax Liability'), value: fmt(result.totalTaxLiability) },
                                    { label: t('jobTax.tdsShort', 'TDS Credit'), value: fmt(result.totalTDS) },
                                ].map((s) => (
                                    <div key={s.label} className="bg-white/10 rounded-xl p-2.5 text-center">
                                        <p className="text-white/60 text-[9px] uppercase font-bold tracking-wider mb-0.5">{s.label}</p>
                                        <p className="text-white font-bold text-xs">{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Statement of Income (CA-style) */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText size={15} className="text-brand-purple" />
                                <h3 className="font-bold text-slate-900 dark:text-foreground text-sm">{t('jobTax.statementTitle', 'Statement of Income (CA format)')}</h3>
                            </div>
                            {/* Per-employer lines */}
                            {result.employers.map((e, i) => (
                                n(employers[i]?.grossSalary) > 0 && (
                                    <div key={i} className="flex justify-between items-center py-1.5">
                                        <span className="text-muted-foreground text-xs">{e.name || t('jobTax.employerN', 'Employer {{n}}', { n: i + 1 })} — {t('jobTax.taxableShort', 'taxable salary')}</span>
                                        <span className="font-bold text-sm text-slate-700 dark:text-foreground">{fmt(e.taxableSalary)}</span>
                                    </div>
                                )
                            ))}
                            <div className="border-t border-slate-100 dark:border-white/10 my-1" />
                            {statementRows.map((row) => (
                                <div key={row.label} className={`flex justify-between items-center py-1.5 ${row.bold ? 'border-t border-slate-100 dark:border-white/10 mt-1 pt-2' : ''}`}>
                                    <span className={`text-xs ${row.bold ? 'font-bold text-slate-700 dark:text-foreground' : 'text-muted-foreground'}`}>{row.label}</span>
                                    <span className={`font-bold text-sm ${row.color}`}>{row.val < 0 ? '-' : ''}{fmt(row.val)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center py-2 border-t-2 border-slate-200 dark:border-white/20 mt-1">
                                <span className="text-xs font-extrabold text-slate-900 dark:text-foreground">
                                    {result.balancePayable >= 0 ? t('jobTax.balancePayable288B', 'Balance Tax Payable (rounded u/s 288B)') : t('jobTax.refundDue288B', 'Refund Due (rounded u/s 288B)')}
                                </span>
                                <span className={`font-extrabold text-base ${result.balancePayable > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{fmt(result.balancePayable)}</span>
                            </div>
                        </div>

                        {/* Interest & late fee — 234A/B/C/F */}
                        {result.balancePayable > 0 && (
                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                                <h3 className="font-bold text-slate-900 dark:text-foreground text-sm">{t('jobTax.interestTitle', 'Interest & late fee check (234A/B/C/F)')}</h3>
                                <p className="text-muted-foreground text-[10px] -mt-1.5">{t('jobTax.interestSub', 'Due date: {{due}}. Pick when you plan to pay and file — FinCalix computes the interest a CA would.', { due: DUE_DATES[fy] })}</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: t('jobTax.paymentDate', 'I will pay tax on'), value: paymentDate, set: setPaymentDate },
                                        { label: t('jobTax.filingDate', 'I will file ITR on'), value: filingDate, set: setFilingDate },
                                    ].map((d) => (
                                        <div key={d.label} className="space-y-1">
                                            <label className="text-muted-foreground text-xs font-semibold">{d.label}</label>
                                            <input
                                                type="date"
                                                value={d.value}
                                                onChange={(e) => d.set(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-card border border-border rounded-xl px-3 py-2.5 text-slate-900 dark:text-foreground text-sm font-semibold outline-none focus:border-brand-purple"
                                            />
                                        </div>
                                    ))}
                                </div>
                                {lateResult.totalInterestAndFee === 0 ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 rounded-xl p-3 flex items-center gap-2">
                                        <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                                        <p className="text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                                            {t('jobTax.noInterest', 'No interest or late fee on these dates — pay {{amount}} and you are fully settled.', { amount: fmt(result.balancePayable) })}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {[
                                            { label: t('jobTax.int234A', 'Interest u/s 234A — filing/paying after due date'), val: lateResult.interest234A },
                                            { label: t('jobTax.int234B', 'Interest u/s 234B — advance tax not paid (≥₹10K liability)'), val: lateResult.interest234B },
                                            { label: t('jobTax.int234C', 'Interest u/s 234C — advance instalments deferred'), val: lateResult.interest234C },
                                            { label: t('jobTax.fee234F', 'Late-filing fee u/s 234F'), val: lateResult.fee234F },
                                        ].filter(r => r.val > 0).map((r) => (
                                            <div key={r.label} className="flex justify-between items-center py-1">
                                                <span className="text-muted-foreground text-xs">{r.label}</span>
                                                <span className="font-bold text-sm text-amber-500">{fmt(r.val)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-white/10">
                                            <span className="text-xs font-extrabold text-slate-900 dark:text-foreground">{t('jobTax.totalWithInterest', 'Total to pay (tax + interest + fee)')}</span>
                                            <span className="font-extrabold text-base text-red-500">{fmt(lateResult.totalPayableWithInterest)}</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                                            {t('jobTax.interestNote', 'Interest runs at 1% per month (or part thereof) — every month you wait adds more. Paying today is always cheapest.')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Why each employer deducted less — the CA explanation */}
                        {employers.length > 1 && (
                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                                <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-2">{t('jobTax.whyTitle', 'Why did my employers deduct less TDS?')}</h3>
                                <div className="space-y-2">
                                    {result.employers.map((e, i) => (
                                        n(employers[i]?.grossSalary) > 0 && (
                                            <div key={i} className="bg-muted rounded-xl p-3">
                                                <p className="text-xs font-bold text-slate-700 dark:text-foreground">{e.name || t('jobTax.employerN', 'Employer {{n}}', { n: i + 1 })}</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                                    {t('jobTax.whyLine', 'Standalone tax on its salary alone: {{standalone}} → TDS deducted: {{tds}}', { standalone: fmt(e.standaloneTax), tds: fmt(e.tdsDeducted) })}
                                                </p>
                                            </div>
                                        )
                                    ))}
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        {t('jobTax.whySummary', 'Combined, your income lands in higher slabs and may cross the 87A rebate limit — that difference is the balance you see above.')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* CA Filing Roadmap — what a CA does after computing */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <ClipboardCheck size={15} className="text-brand-green" />
                                <h3 className="font-bold text-slate-900 dark:text-foreground text-sm">{t('jobTax.roadmapTitle', 'File it yourself — CA roadmap')}</h3>
                            </div>
                            <div className="space-y-2.5">
                                {[
                                    ...(result.balancePayable > 0 ? [{
                                        step: t('jobTax.roadmapStep1', 'Pay {{amount}} as self-assessment tax', { amount: fmt(result.balancePayable) }),
                                        detail: t('jobTax.roadmapStep1Detail', 'e-Filing portal → e-Pay Tax → Challan ITNS 280, type "(300) Self-Assessment Tax". Do this BEFORE filing to avoid interest u/s 234B/234C.'),
                                    }] : []),
                                    {
                                        step: t('jobTax.roadmapStep2', 'File ITR-1 (Sahaj) by {{due}}', { due: DUE_DATES[fy] }),
                                        detail: t('jobTax.roadmapStep2Detail', 'ITR-1 covers salary + one house property + other sources up to ₹50L total income. Filing late costs up to ₹5,000 u/s 234F (₹1,000 if income ≤ ₹5L).'),
                                    },
                                    {
                                        step: t('jobTax.roadmapStep3', 'Declare BOTH employers in Schedule Salary'),
                                        detail: t('jobTax.roadmapStep3Detail', 'The portal pre-fills from AIS/26AS — verify each employer’s salary and TDS line matches your Form 16s before submitting.'),
                                    },
                                    {
                                        step: t('jobTax.roadmapStep4', 'E-verify within 30 days'),
                                        detail: t('jobTax.roadmapStep4Detail', 'Aadhaar OTP is the fastest. An un-verified return is treated as never filed.'),
                                    },
                                    {
                                        step: t('jobTax.roadmapStep5', 'After filing — intimation u/s 143(1)'),
                                        detail: t('jobTax.roadmapStep5Detail', "CPC processes your return and emails an intimation u/s 143(1) comparing your figures with its records. TDS credit is granted strictly as per Form 26AS — employer-side mismatches surface here. Refunds are credited only after this processing; track under 'View Filed Returns' on the portal."),
                                    },
                                ].map((s, i) => (
                                    <div key={i} className="flex gap-3">
                                        <span className="w-6 h-6 rounded-full bg-brand-green/15 text-brand-green flex items-center justify-center text-[11px] font-bold flex-shrink-0">{i + 1}</span>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 dark:text-foreground">{s.step}</p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{s.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Predicted ITR Acknowledgement (ITR-V) preview */}
                        <div className="bg-gradient-to-br from-brand-purple/5 to-blue-500/5 border border-brand-purple/20 rounded-2xl p-4">
                            <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-1">{t('jobTax.itrvTitle', 'Your ITR acknowledgement will show')}</h3>
                            <p className="text-muted-foreground text-[10px] mb-3">{t('jobTax.itrvSub', 'Predicted ITR-V figures{{paid}} — match these after filing', { paid: result.balancePayable > 0 ? t('jobTax.itrvPaidSuffix', ' (after paying the balance above)') : '' })}</p>
                            {(() => {
                                const taxesPaidAfter = result.totalTDS + result.advanceTaxPaid + Math.max(0, result.balancePayable);
                                const predicted = round288B(result.totalTaxLiability - taxesPaidAfter);
                                return [
                                    { label: t('jobTax.itrvTotalIncome', 'Total Income'), value: fmt(result.totalIncomeRounded) },
                                    { label: t('jobTax.itrvNetTax', 'Net tax payable'), value: fmt(result.totalTaxLiability) },
                                    { label: t('jobTax.itrvTaxesPaid', 'Taxes Paid'), value: fmt(taxesPaidAfter) },
                                    { label: predicted < 0 ? t('jobTax.itrvRefund', '(-) Refundable') : t('jobTax.itrvPayable', '(+) Tax Payable'), value: predicted === 0 ? t('tax.nil', 'NIL') : fmt(predicted), highlight: true },
                                ].map((r) => (
                                    <div key={r.label} className={`flex justify-between items-center py-1.5 ${r.highlight ? 'border-t border-brand-purple/20 mt-1 pt-2' : ''}`}>
                                        <span className={`text-xs ${r.highlight ? 'font-bold text-slate-800 dark:text-foreground' : 'text-muted-foreground'}`}>{r.label}</span>
                                        <span className={`font-bold text-sm ${r.highlight ? 'text-emerald-500' : 'text-slate-700 dark:text-foreground'}`}>{r.value}</span>
                                    </div>
                                ));
                            })()}
                        </div>

                        {/* Regime comparison */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                            <h3 className="font-bold text-slate-900 dark:text-foreground text-sm mb-3">{t('tax.oldVsNewRegime', 'Old vs New Regime')}</h3>
                            <div className="space-y-2">
                                {[
                                    { id: 'new', label: t('tax.newRegime', 'New Regime'), tax: newResult.totalTaxLiability },
                                    { id: 'old', label: t('tax.oldRegime', 'Old Regime'), tax: oldResult.totalTaxLiability },
                                ].map((r) => (
                                    <div key={r.id} className={`flex items-center justify-between p-3 rounded-xl border-2 ${betterRegime === r.id ? 'border-brand-green bg-brand-green/5' : 'border-slate-100 dark:border-slate-700 bg-muted'}`}>
                                        <div className="flex items-center gap-2">
                                            {betterRegime === r.id && <CheckCircle2 size={16} className="text-brand-green" />}
                                            <span className="text-muted-foreground text-sm font-medium">{r.label}</span>
                                        </div>
                                        <span className={`font-extrabold text-sm ${betterRegime === r.id ? 'text-brand-green' : 'text-slate-700 dark:text-foreground'}`}>
                                            {r.tax === 0 ? t('tax.nil', 'NIL') : fmt(r.tax)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {regimeSaving > 0 && (
                                <p className="text-brand-green text-xs font-semibold text-center mt-3">
                                    {t('jobTax.regimeSaving', '{{regime}} regime saves you {{amount}}', { regime: betterRegime === 'new' ? t('tax.newRegime', 'New') : t('tax.oldRegime', 'Old'), amount: fmt(regimeSaving) })}
                                </p>
                            )}
                        </div>

                        {/* CA fee saved */}
                        <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/25">
                            <p className="text-emerald-600 dark:text-emerald-400 text-sm font-extrabold">
                                {t('jobTax.caFeeSavedTitle', 'You just did a CA’s job — for free 🎉')}
                            </p>
                            <p className="text-muted-foreground text-[11px] mt-1 leading-relaxed">
                                {t('jobTax.caFeeSavedDesc', 'CAs typically charge ₹1,500–₹3,000 for a multi-employer computation like this, and refund agents take up to 10% of your refund. FinCalix computed your Statement of Income, TDS reconciliation, and interest check at ₹0 — and your data never left this device.')}
                            </p>
                        </div>

                        {/* Report details — optional, printed on the statement only */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-1">
                            <Collapsible title={t('jobTax.reportDetails', 'Report details (optional)')}>
                                <div className="space-y-3 pt-1">
                                    <div className="space-y-1">
                                        <label className="text-muted-foreground text-xs font-semibold">{t('jobTax.yourName', 'Your name')}</label>
                                        <input type="text" value={reportName} onChange={(e) => setReportName(e.target.value)} autoComplete="off" spellCheck={false}
                                            className="w-full bg-slate-50 dark:bg-card border border-border rounded-xl px-3 py-2.5 text-slate-900 dark:text-foreground text-sm font-semibold outline-none focus:border-brand-purple" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-muted-foreground text-xs font-semibold">{t('jobTax.pan', 'PAN')}</label>
                                        <input type="text" value={reportPan} onChange={(e) => setReportPan(e.target.value.toUpperCase())} maxLength={10} autoComplete="off" spellCheck={false}
                                            className="w-full bg-slate-50 dark:bg-card border border-border rounded-xl px-3 py-2.5 text-slate-900 dark:text-foreground text-sm font-semibold outline-none focus:border-brand-purple" />
                                    </div>
                                    <p className="text-muted-foreground text-[10px]">{t('jobTax.reportPrivacyHint', 'Printed only on your downloaded statement — never leaves this device.')}</p>
                                </div>
                            </Collapsible>
                        </div>

                        {/* Export */}
                        <div className="grid grid-cols-2 gap-2">
                            <motion.button whileTap={{ scale: 0.97 }} onClick={async () => { await exportToPDF(buildExportConfig()); }}
                                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-purple text-white font-bold shadow-lg shadow-brand-purple/30">
                                <Download size={18} /> PDF
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.97 }} onClick={async () => { await exportToExcel(buildExportConfig()); }}
                                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-green text-white font-bold shadow-lg shadow-brand-green/30">
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
