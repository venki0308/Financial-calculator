import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronUp, FileText, BrainCircuit, AlertTriangle, TrendingUp, CreditCard, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, type ExportConfig, dateTag } from '../utils/exportReport';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { useHistoryTracker } from '../hooks/useHistoryTracker';
import { useAppColors } from '../theme/useAppColors';
import { getDailyInterest, getPeriodInterest, getGSTOnInterest, getTrueCost, getCashAdvanceCost } from '../utils/creditCardCalculations';
import { getAllCreditCards } from '../utils/creditCardStorage';
import { useCibil } from '../context/CibilContext';
import CibilAdvisoryCard from '../components/CibilAdvisoryCard';
import CibilBadge from '../components/CibilBadge';

const fmtINR = (v: number) => formatINR(Math.round(v));

const RATE_PRESETS: { rate: number; label: string }[] = [
  { rate: 24, label: 'Low 24%' },
  { rate: 30, label: 'Standard 30%' },
  { rate: 36, label: 'Mid 36%' },
  { rate: 42, label: 'High 42%' },
  { rate: 45, label: 'Very High 45%' },
];

interface Insight { text: string; tone: 'warning' | 'success' | 'info' }

function generateCCInsights(balance: number, rate: number, days: number, includeGST: boolean, t: (k: string, fb: string, opts?: Record<string, unknown>) => string): Insight[] {
    const out: Insight[] = [];
    if (balance <= 0) return out;
    const daily = getDailyInterest(balance, rate);
    const periodInt = getPeriodInterest(balance, rate, days);
    const gst = includeGST ? getGSTOnInterest(periodInt) : 0;
    const total = periodInt + gst;
    const trueAPR = includeGST ? Math.round(rate * 1.18 * 100) / 100 : rate;

    if (daily > 10) out.push({ text: t('ccInterest.insightDaily', 'You are paying INR {{daily}}/day in interest on your outstanding balance.', { daily: Math.round(daily) }), tone: 'warning' });
    if (trueAPR > 40)
        out.push({ text: t('ccInterest.insightHighAPR', 'Effective APR of {{apr}}% is extremely high. Consider a balance transfer or personal loan.', { apr: trueAPR }), tone: 'warning' });
    if (balance >= 50000)
        out.push({ text: t('ccInterest.insightPayFull', 'Paying the full balance saves you {{amount}} in finance charges this period.', { amount: fmtINR(total) }), tone: 'success' });
    if (days > 45)
        out.push({ text: t('ccInterest.insightLongOutstanding', '{{days}} days outstanding significantly increases your interest burden.', { days }), tone: 'info' });
    if (includeGST && gst > 100)
        out.push({ text: t('ccInterest.insightGST', 'GST alone adds {{amount}} to your finance charges.', { amount: fmtINR(gst) }), tone: 'info' });
    return out;
}

export default function CreditCardInterestCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const c = useAppColors();
    const { profile: cibilProfile } = useCibil();
    const cibilScore = cibilProfile?.isNTC ? 0 : (cibilProfile?.score ?? 0);

    // ── Saved cards for quick-load ──
    const savedCards = getAllCreditCards().filter(cc => cc.isActive);

    // ── Core Inputs ──
    const [balance, setBalance] = useState(50000);
    const [selectedRate, setSelectedRate] = useState(42);
    const [customRate, setCustomRate] = useState(42);
    const [useCustomRate, setUseCustomRate] = useState(false);
    const [days, setDays] = useState(30);
    const [includeGST, setIncludeGST] = useState(true);

    // ── Cash Advance ──
    const [showCashAdvance, setShowCashAdvance] = useState(false);
    const [caAmount, setCaAmount] = useState(10000);
    const [caFeePercent, setCaFeePercent] = useState(2.5);
    const [caDays, setCaDays] = useState(30);

    const rate = useCustomRate ? customRate : selectedRate;

    // ── Calculations ──
    const result = useMemo(() => {
        const dailyInt = getDailyInterest(balance, rate);
        const periodInt = getPeriodInterest(balance, rate, days);
        const gst = includeGST ? getGSTOnInterest(periodInt) : 0;
        const totalCharge = periodInt + gst;
        const costPerMonth = days > 0 ? (totalCharge / days) * 30 : 0;
        const trueAPR = includeGST ? Math.round(rate * 1.18 * 100) / 100 : rate;
        return { dailyInt, periodInt, gst, totalCharge, costPerMonth, trueAPR };
    }, [balance, rate, days, includeGST]);

    // Indian CC rule: if you don't pay FULL statement, interest is on the ENTIRE
    // original balance (grace period is lost). Only 100% payment = zero interest.
    const scenarios = useMemo(() => {
        const pcts = [1, 0.8, 0.5, 0.05];
        const labels = [t('ccInterest.payFull', 'Full (100%)'), '80%', '50%', t('ccInterest.payMin', 'Min (5%)')];
        // Base cost: minimum payment scenario (interest on full balance)
        const fullBalanceInt = getPeriodInterest(balance, rate, days);
        const fullBalanceGst = includeGST ? getGSTOnInterest(fullBalanceInt) : 0;
        const baseCost = fullBalanceInt + fullBalanceGst;
        return pcts.map((pct, i) => {
            const paid = Math.round(balance * pct);
            const remaining = balance - paid;
            // Full payment = no interest (grace period preserved)
            // Any partial payment = interest on FULL balance (grace period lost)
            const interestCharged = pct >= 1 ? 0 : fullBalanceInt;
            const gstCharged = pct >= 1 ? 0 : fullBalanceGst;
            const totalOwed = remaining + interestCharged + gstCharged;
            const saved = pct >= 1 ? baseCost : pct === 0.05 ? 0 : Math.round(baseCost * 0); // partial payments don't save vs min — all pay full interest
            return { label: labels[i], pct, remaining: Math.round(remaining), saved: pct >= 1 ? Math.round(baseCost) : 0, total: Math.round(totalOwed) };
        });
    }, [balance, rate, days, includeGST, t]);

    const caResult = useMemo(() => getCashAdvanceCost(caAmount, caFeePercent, rate, caDays), [caAmount, caFeePercent, rate, caDays]);

    const insights = useMemo(() => generateCCInsights(balance, rate, days, includeGST, t), [balance, rate, days, includeGST, t]);

    // ── Debt-Free Timeline ──
    const debtTimeline = useMemo(() => {
        if (balance <= 0) return [];
        const r = rate / 100 / 12;
        const paymentLevels = [
            { label: 'Fixed 5% of Today\'s Balance', pct: 0.05 },
            { label: '10% of Balance', pct: 0.10 },
            { label: '25% of Balance', pct: 0.25 },
            { label: 'Full Statement', pct: 1.0 },
        ];
        return paymentLevels.map(({ label, pct }) => {
            const payment = Math.max(Math.round(balance * pct), 200);
            if (pct >= 1) return { label, payment, months: 1, totalInterest: 0, totalPaid: balance };
            if (r <= 0 || payment <= balance * r) return { label, payment, months: Infinity, totalInterest: Infinity, totalPaid: Infinity };
            let bal = balance, totalInt = 0, m = 0;
            while (bal > 0.5 && m < 600) {
                const interest = bal * r;
                const gst = includeGST ? interest * 0.18 : 0;
                totalInt += interest + gst;
                bal = bal + interest + gst - payment;
                m++;
            }
            return { label, payment, months: m, totalInterest: Math.round(totalInt), totalPaid: Math.round(balance + totalInt) };
        });
    }, [balance, rate, includeGST]);

    // ── The Minimum-Due Trap ──
    // Banks bill the minimum as a % of CURRENT outstanding (≈5%, ₹200 floor),
    // so the payment shrinks with the balance and barely dents principal —
    // unlike the fixed-payment rows in debtTimeline above. This simulates the
    // real billing behaviour to show the true cost of "just paying min due".
    const minDueTrap = useMemo(() => {
        if (balance <= 0 || rate <= 0) return null;
        const r = rate / 100 / 12;
        let bal = balance, totalInt = 0, m = 0;
        while (bal > 0.5 && m < 1200) {
            const interest = bal * r;
            const gst = includeGST ? interest * 0.18 : 0;
            const payment = Math.max(bal * 0.05, 200);
            totalInt += interest + gst;
            bal = bal + interest + gst - payment;
            if (payment <= interest + gst && bal >= balance) return { months: Infinity, totalInterest: Infinity, neverEnds: true };
            m++;
        }
        return { months: m, totalInterest: Math.round(totalInt), neverEnds: m >= 1200 };
    }, [balance, rate, includeGST]);

    // ── Loan Alternative Comparison ──
    const loanAlternatives = useMemo(() => {
        if (balance <= 0) return [];
        const ccMonthlyRate = rate / 100 / 12;
        const alts = [
            { name: t('ccInterest.altCC', 'Credit Card (current)'), apr: rate, color: '#EF4444' },
            { name: t('ccInterest.altBT', 'Balance Transfer Card'), apr: 12, color: '#F59E0B' },
            { name: t('ccInterest.altPL', 'Personal Loan'), apr: 14, color: '#3B82F6' },
        ];
        return alts.map(({ name, apr, color }) => {
            const r = apr / 100 / 12;
            const tenure = 24;
            const emi = r > 0 ? balance * r * Math.pow(1 + r, tenure) / (Math.pow(1 + r, tenure) - 1) : balance / tenure;
            const totalPaid = Math.round(emi * tenure);
            const totalInterest = totalPaid - balance;
            return { name, apr, emi: Math.round(emi), totalInterest, totalPaid, color };
        });
    }, [balance, rate, t]);

    // ── History Tracking ──
    useHistoryTracker(
        'CC Interest Calculator',
        { balance, rate, days, includeGST },
        { totalCharge: result.totalCharge, trueAPR: result.trueAPR },
        result.totalCharge,
    );

    // ── Export ──
    const handleDownloadPDF = async () => {
        const tag = dateTag();
        const config: ExportConfig = {
            title: 'Credit Card Interest Calculator Report',
            inputs: [
                { label: 'Outstanding Balance', value: `INR ${balance.toLocaleString('en-IN')}` },
                { label: 'Annual Interest Rate', value: `${rate}% p.a.` },
                { label: 'Days Since Payment', value: `${days} days` },
                { label: 'GST Included', value: includeGST ? 'Yes (18%)' : 'No' },
            ],
            results: [
                { label: 'Daily Interest', value: `INR ${Math.round(result.dailyInt).toLocaleString('en-IN')}` },
                { label: 'Interest for Period', value: `INR ${Math.round(result.periodInt).toLocaleString('en-IN')}` },
                { label: 'GST (18%)', value: `INR ${Math.round(result.gst).toLocaleString('en-IN')}` },
                { label: 'Total Finance Charge', value: `INR ${Math.round(result.totalCharge).toLocaleString('en-IN')}` },
                { label: 'Effective APR', value: `${result.trueAPR}% p.a.` },
            ],
            projectionTitle: 'Payment Scenarios',
            projectionColumns: ['If you pay...', 'Interest Saved', 'Remaining Balance'],
            projectionRows: scenarios.map(s => [s.label, `INR ${s.saved.toLocaleString('en-IN')}`, `INR ${s.remaining.toLocaleString('en-IN')}`]),
            notes: 'Interest calculated using Indian daily balance method. GST at 18% on finance charges as per RBI guidelines.',
            filename: `FinCalix_CC_Interest_${tag}`,
        };
        await exportToPDF(config);
    };

    const handleDownloadExcel = async () => {
        const tag = dateTag();
        const config: ExportConfig = {
            title: 'Credit Card Interest Calculator Report',
            inputs: [
                { label: 'Outstanding Balance', value: `INR ${balance.toLocaleString('en-IN')}` },
                { label: 'Annual Interest Rate', value: `${rate}% p.a.` },
                { label: 'Days Since Payment', value: `${days} days` },
                { label: 'GST Included', value: includeGST ? 'Yes (18%)' : 'No' },
            ],
            results: [
                { label: 'Daily Interest', value: `INR ${Math.round(result.dailyInt).toLocaleString('en-IN')}` },
                { label: 'Interest for Period', value: `INR ${Math.round(result.periodInt).toLocaleString('en-IN')}` },
                { label: 'GST (18%)', value: `INR ${Math.round(result.gst).toLocaleString('en-IN')}` },
                { label: 'Total Finance Charge', value: `INR ${Math.round(result.totalCharge).toLocaleString('en-IN')}` },
                { label: 'Effective APR', value: `${result.trueAPR}% p.a.` },
            ],
            projectionTitle: 'Payment Scenarios',
            projectionColumns: ['If you pay...', 'Interest Saved', 'Remaining Balance'],
            projectionRows: scenarios.map(s => [s.label, `INR ${s.saved.toLocaleString('en-IN')}`, `INR ${s.remaining.toLocaleString('en-IN')}`]),
            filename: `FinCalix_CC_Interest_${tag}`,
        };
        await exportToExcel(config);
    };

    // ── Render ──
    return (
        <div className="min-h-dvh bg-background pb-28 animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border hover:bg-muted transition-all">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground leading-tight">{t('ccInterest.title', 'CC Interest Calculator')}</h1>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{t('ccInterest.subtitle', 'Credit Card Finance Charges')}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 space-y-5">
                {/* Load from My Cards */}
                {savedCards.length > 0 && (
                    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: c.border, background: c.card }}>
                        <p className="px-4 pt-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>
                            {t('ccInterest.loadFromCards', 'Load from My Cards')}
                        </p>
                        <div className="flex gap-2 px-4 pb-3 pt-2 overflow-x-auto">
                            {savedCards.map(card => (
                                <button key={card.id} onClick={() => {
                                    setBalance(card.currentBalance);
                                    setSelectedRate(card.annualInterestRate);
                                    setCustomRate(card.annualInterestRate);
                                    setUseCustomRate(false);
                                }}
                                    className="flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-95"
                                    style={{ borderColor: c.border, background: c.inputBg, color: c.text }}>
                                    {card.bankName || card.cardName} {card.cardNetwork}{card.last4Digits ? ` •• ${card.last4Digits}` : ''}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Outstanding Balance */}
                <NumberInput
                    label={t('ccInterest.balance', 'Outstanding Balance')}
                    value={balance} onChange={setBalance}
                    min={0} max={100000000} prefix="₹"
                    helperText={t('ccInterest.balanceHelper', 'Total unpaid amount on your card')}
                />

                {/* Annual Interest Rate */}
                <div>
                    <NumberInput
                        label={t('ccInterest.rate', 'Annual Interest Rate')}
                        value={useCustomRate ? customRate : selectedRate}
                        onChange={v => { setUseCustomRate(true); setCustomRate(v); }}
                        min={0} max={60} suffix="%"
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                        {RATE_PRESETS.map(p => (
                            <button key={p.rate} onClick={() => { setSelectedRate(p.rate); setUseCustomRate(false); }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                    !useCustomRate && selectedRate === p.rate
                                        ? 'bg-brand-blue/20 border-brand-blue text-brand-blue'
                                        : 'bg-card border-border text-muted-foreground hover:bg-muted'
                                }`}>
                                {p.label}
                            </button>
                        ))}
                        <button onClick={() => setUseCustomRate(true)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                useCustomRate
                                    ? 'bg-brand-blue/20 border-brand-blue text-brand-blue'
                                    : 'bg-card border-border text-muted-foreground hover:bg-muted'
                            }`}>
                            {t('ccInterest.custom', 'Custom')}
                        </button>
                    </div>
                </div>

                {/* Days Since Payment */}
                <NumberInput
                    label={t('ccInterest.days', 'Days Since Payment')}
                    value={days} onChange={setDays}
                    min={1} max={365}
                    helperText={t('ccInterest.daysHelper', 'Number of days balance is outstanding')}
                />

                {/* GST Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border">
                    <div>
                        <p className="text-sm font-bold text-foreground">{t('ccInterest.gstToggle', 'Include 18% GST on Interest')}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{t('ccInterest.gstNote', 'RBI mandates GST on finance charges')}</p>
                    </div>
                    <button onClick={() => setIncludeGST(!includeGST)}
                        className={`w-12 h-7 rounded-full transition-all relative ${includeGST ? 'bg-brand-blue' : 'bg-muted-foreground/30'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-1 transition-all ${includeGST ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>

                {/* ── Hero Results Card ── */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border border-border bg-card overflow-hidden">
                    <div className="p-5 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-red-500/10 rounded-lg"><CreditCard size={16} className="text-red-500" /></div>
                            <span className="text-foreground font-bold text-sm">{t('ccInterest.results', 'Finance Charge Breakdown')}</span>
                        </div>

                        <div className="space-y-3">
                            {[
                                { label: t('ccInterest.principal', 'Principal Balance'), value: fmtINR(balance), color: c.text },
                                { label: t('ccInterest.dailyInt', 'Daily Interest'), value: fmtINR(result.dailyInt), color: '#f59e0b' },
                                { label: t('ccInterest.periodInt', `Interest for ${days} days`), value: fmtINR(result.periodInt), color: '#ef4444' },
                                { label: t('ccInterest.gstAmount', 'GST (18%)'), value: includeGST ? fmtINR(result.gst) : '---', color: '#8b5cf6' },
                            ].map((row, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">{row.label}</span>
                                    <span className="text-sm font-bold" style={{ color: row.color }}>{row.value}</span>
                                </div>
                            ))}
                            <div className="border-t border-border pt-3 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-foreground">{t('ccInterest.totalCharge', 'Total Finance Charge')}</span>
                                    <span className="text-lg font-black text-red-500">{fmtINR(result.totalCharge)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">{t('ccInterest.costPerMonth', 'Effective cost per month')}</span>
                                    <span className="text-sm font-bold text-amber-500">{fmtINR(result.costPerMonth)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">{t('ccInterest.effectiveRate', 'Interest + GST Rate')}</span>
                                    <span className="text-sm font-bold text-red-500">{result.trueAPR}% {t('ccInterest.pa', 'p.a.')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── Monthly Scenarios Table ── */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg"><TrendingUp size={16} className="text-blue-500" /></div>
                            <span className="text-foreground font-bold text-sm">{t('ccInterest.scenarios', 'Payment Scenarios')}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-2 text-muted-foreground font-bold">{t('ccInterest.ifYouPay', 'If you pay...')}</th>
                                        <th className="text-right py-2 text-muted-foreground font-bold">{t('ccInterest.intSaved', 'Interest saved')}</th>
                                        <th className="text-right py-2 text-muted-foreground font-bold">{t('ccInterest.remaining', 'Remaining')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scenarios.map((s, i) => (
                                        <tr key={i} className={`border-b border-border/50 ${i === 0 ? 'bg-green-500/5' : ''}`}>
                                            <td className="py-2.5 font-bold text-foreground">{s.label}</td>
                                            <td className={`py-2.5 text-right font-bold ${s.saved > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                                                {i === 0 ? t('ccInterest.noInterest', 'No interest!') : s.saved > 0 ? fmtINR(s.saved) : t('ccInterest.baseLine', 'Baseline')}
                                            </td>
                                            <td className="py-2.5 text-right font-bold text-foreground">{fmtINR(s.remaining)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* ── Cash Advance Section (Collapsible) ── */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowCashAdvance(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-500"><Banknote size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('ccInterest.cashAdvance', 'Cash Advance Calculator')}</span>
                        </div>
                        {showCashAdvance ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>
                    <AnimatePresence>
                        {showCashAdvance && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-4">
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                                            {t('ccInterest.caWarning', 'Cash advances have NO interest-free period. Interest is charged from day 1.')}
                                        </p>
                                    </div>
                                    <NumberInput label={t('ccInterest.caAmount', 'Cash Advance Amount')} value={caAmount} onChange={setCaAmount} min={0} max={100000000} prefix="₹" />
                                    <NumberInput label={t('ccInterest.caFee', 'Cash Advance Fee')} value={caFeePercent} onChange={setCaFeePercent} min={0} max={10} suffix="%" step={0.5} />
                                    <NumberInput label={t('ccInterest.caDays', 'Days Outstanding')} value={caDays} onChange={setCaDays} min={1} max={365} />

                                    <div className="space-y-2 pt-2">
                                        {[
                                            { label: t('ccInterest.caFeeGst', 'Fee + GST'), value: fmtINR(caResult.fee + caResult.feeGst) },
                                            { label: t('ccInterest.caIntGst', 'Interest + GST'), value: fmtINR(caResult.interest + caResult.interestGst) },
                                            { label: t('ccInterest.caTotalCost', 'Total Cost'), value: fmtINR(caResult.total), bold: true },
                                            { label: t('ccInterest.caEffAPR', 'Effective APR'), value: `${caResult.effectiveAPR}%`, bold: true },
                                        ].map((row, i) => (
                                            <div key={i} className="flex justify-between items-center">
                                                <span className="text-xs text-muted-foreground">{row.label}</span>
                                                <span className={`text-sm font-bold ${row.bold ? 'text-red-500' : 'text-foreground'}`}>{row.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Smart Insights ── */}
                {insights.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                            <BrainCircuit size={14} className="text-brand-blue" />
                            {t('ccInterest.smartInsights', 'Smart Insights')}
                        </p>
                        {insights.map((ins, idx) => (
                            <div key={idx}
                                className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
                                    ins.tone === 'warning' ? 'bg-amber-500/10 border-amber-500/30'
                                    : ins.tone === 'success' ? 'bg-brand-green/10 border-brand-green/30'
                                    : 'bg-brand-blue/10 border-brand-blue/30'
                                }`}>
                                {ins.tone === 'warning' && <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />}
                                {ins.tone === 'success' && <TrendingUp size={14} className="text-brand-green flex-shrink-0 mt-0.5" />}
                                {ins.tone === 'info' && <BrainCircuit size={14} className="text-brand-blue flex-shrink-0 mt-0.5" />}
                                <p className={`text-xs font-medium leading-relaxed ${
                                    ins.tone === 'warning' ? 'text-amber-700 dark:text-amber-400'
                                    : ins.tone === 'success' ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-blue-700 dark:text-blue-300'
                                }`}>
                                    {ins.text}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── The Minimum-Due Trap ── */}
                {balance > 0 && minDueTrap && (
                    <div className="rounded-3xl border border-red-500/25 bg-red-500/5 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-red-500/10 rounded-lg"><TrendingUp size={16} className="text-red-500 rotate-180" /></div>
                            <span className="text-foreground font-bold text-sm">{t('ccInterest.minDueTrapTitle', 'The Minimum-Due Trap')}</span>
                        </div>
                        {minDueTrap.neverEnds || minDueTrap.months === Infinity ? (
                            <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed font-medium">
                                {t('ccInterest.minDueTrapNever', 'At this rate, paying only the minimum due never clears this balance — the minimum shrinks with the balance while interest keeps compounding. Pay a fixed amount instead.')}
                            </p>
                        ) : (
                            <>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-2xl font-black text-red-500">
                                        {minDueTrap.months >= 12
                                            ? `${Math.floor(minDueTrap.months / 12)}y ${minDueTrap.months % 12}m`
                                            : `${minDueTrap.months} mo`}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{t('ccInterest.minDueTrapToClear', 'to become debt-free')}</span>
                                </div>
                                <p className="text-xs text-foreground leading-relaxed mb-2">
                                    {t('ccInterest.minDueTrapBody', 'Paying only the minimum due (5% of outstanding, min ₹200) on your {{balance}} balance costs {{interest}} in interest — the minimum shrinks every month, so it barely touches the principal.', { balance: fmtINR(balance), interest: fmtINR(minDueTrap.totalInterest) })}
                                </p>
                                {debtTimeline.length > 0 && debtTimeline[0].months < minDueTrap.months && (
                                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium leading-relaxed">
                                        {t('ccInterest.minDueTrapFix', 'Keep paying today\'s {{payment}} every month instead (don\'t let it shrink): debt-free in {{months}} months and {{saved}} of interest saved.', {
                                            payment: fmtINR(debtTimeline[0].payment),
                                            months: debtTimeline[0].months,
                                            saved: fmtINR(Math.max(0, minDueTrap.totalInterest - debtTimeline[0].totalInterest)),
                                        })}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ── Debt-Free Timeline ── */}
                {balance > 0 && debtTimeline.length > 0 && (
                    <div className="rounded-3xl border border-border bg-card overflow-hidden">
                        <div className="p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-green-500/10 rounded-lg"><TrendingUp size={16} className="text-green-500" /></div>
                                <span className="text-foreground font-bold text-sm">{t('ccInterest.debtTimeline', 'Debt-Free Timeline')}</span>
                            </div>
                            <div className="space-y-2">
                                {debtTimeline.map((d, i) => (
                                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${i === debtTimeline.length - 1 ? 'bg-green-500/5 border-green-500/20' : 'border-border/50'}`}>
                                        <div>
                                            <p className="text-xs font-bold text-foreground">{d.label}</p>
                                            <p className="text-[10px] text-muted-foreground">{fmtINR(d.payment)}/mo</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-black ${d.months === 1 ? 'text-green-500' : d.months > 60 ? 'text-red-500' : 'text-foreground'}`}>
                                                {d.months === Infinity ? '∞' : d.months === 1 ? t('ccInterest.zeroInterest', '0 interest!') : `${d.months} mo`}
                                            </p>
                                            {d.totalInterest > 0 && d.totalInterest < Infinity && (
                                                <p className="text-[10px] text-red-400">{t('ccInterest.interestLabel', 'Interest')}: {fmtINR(d.totalInterest)}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── GST Context ── */}
                {balance > 0 && includeGST && result.gst > 0 && (
                    <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                        <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">💡 {t('ccInterest.gstImpact', 'GST Impact on Your Debt')}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {t('ccInterest.gstDesc1', 'GST at 18% on interest adds')} <span className="font-bold text-purple-500">{fmtINR(result.gst)}</span> {t('ccInterest.gstDesc2', 'to your charges. Over 12 months, that\'s ~')}<span className="font-bold text-purple-500">{fmtINR(Math.round(result.gst * 12))}</span> {t('ccInterest.gstDesc3', 'in hidden tax.')}
                            <span className="font-semibold text-foreground"> {t('ccInterest.gstDesc4', 'Pay in full each month = zero interest = zero GST.')}</span>
                        </p>
                    </div>
                )}

                {/* ── Behavior Insight: Pay Full vs Carry Balance ── */}
                {balance > 0 && (
                    <div className="rounded-3xl border border-border bg-card overflow-hidden">
                        <div className="p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-amber-500/10 rounded-lg"><AlertTriangle size={16} className="text-amber-500" /></div>
                                <span className="text-foreground font-bold text-sm">{t('ccInterest.behavior', 'Pay Full vs Carry Balance')}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                                    <p className="text-[9px] text-green-500 uppercase font-bold mb-1">{t('ccInterest.payFullLabel', '✅ Pay Full')}</p>
                                    <p className="text-lg font-black text-green-600">₹0</p>
                                    <p className="text-[10px] text-muted-foreground">{t('ccInterest.intPerYear', 'interest/year')}</p>
                                    <p className="text-[9px] text-green-500 mt-1">{t('ccInterest.graceActive', 'Grace period active')}</p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                                    <p className="text-[9px] text-red-500 uppercase font-bold mb-1">{t('ccInterest.carryBalance', '⚠️ Carry Balance')}</p>
                                    <p className="text-lg font-black text-red-600">{fmtINR(Math.round(balance * rate / 100 * (includeGST ? 1.18 : 1)))}</p>
                                    <p className="text-[10px] text-muted-foreground">{t('ccInterest.intPerYear', 'interest/year')}</p>
                                    <p className="text-[9px] text-red-500 mt-1">{t('ccInterest.graceLost', 'Grace period LOST')}</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-3 text-center leading-relaxed">
                                {t('ccInterest.partialWarning', 'Even ₹1 less than full payment = interest on entire balance from transaction date')}
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Smart Loan Alternatives ── */}
                {balance >= 25000 && loanAlternatives.length > 0 && (
                    <div className="rounded-3xl border border-border bg-card overflow-hidden">
                        <div className="p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-blue-500/10 rounded-lg"><CreditCard size={16} className="text-blue-500" /></div>
                                <span className="text-foreground font-bold text-sm">{t('ccInterest.loanAlt', 'Smarter Alternatives (24 months)')}</span>
                            </div>
                            <div className="space-y-2">
                                {loanAlternatives.map((alt, i) => (
                                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${i === 0 ? 'border-red-200 dark:border-red-800 bg-red-500/5' : 'border-border/50'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: alt.color }} />
                                            <div>
                                                <p className="text-xs font-bold text-foreground">{alt.name}</p>
                                                <p className="text-[10px] text-muted-foreground">{alt.apr}% APR · {fmtINR(alt.emi)}/mo</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xs font-black ${i === 0 ? 'text-red-500' : 'text-foreground'}`}>{fmtINR(alt.totalInterest)}</p>
                                            <p className="text-[9px] text-muted-foreground">{t('ccInterest.totalInt', 'total interest')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {loanAlternatives.length >= 3 && loanAlternatives[0].totalInterest > loanAlternatives[2].totalInterest && (
                                <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold mt-3 text-center">
                                    💡 {t('ccInterest.switchSaves', 'Switching to a personal loan saves {{amount}} in interest', { amount: fmtINR(loanAlternatives[0].totalInterest - loanAlternatives[2].totalInterest) })}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Actionable Recommendation ── */}
                {balance > 0 && debtTimeline.length >= 3 && debtTimeline[2].months < Infinity && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                        <p className="text-xs font-black text-green-700 dark:text-green-400 mb-1">🎯 {t('ccInterest.recAction', 'Recommended Action')}</p>
                        <p className="text-[11px] text-foreground leading-relaxed">
                            {t('ccInterest.recPay', 'Pay')} <span className="font-black text-green-600">{fmtINR(debtTimeline[2].payment)}/{t('ccInterest.recMo', 'mo')}</span> {t('ccInterest.recPct', '(25% of balance)')} →
                            {t('ccInterest.recDebtFree', 'debt-free in')} <span className="font-black text-blue-600">{debtTimeline[2].months} {t('ccInterest.recMonths', 'months')}</span>,
                            {t('ccInterest.recSaving', 'saving')} <span className="font-black text-green-600">{fmtINR(debtTimeline[0].totalInterest < Infinity ? debtTimeline[0].totalInterest - debtTimeline[2].totalInterest : debtTimeline[2].totalInterest)}</span> {t('ccInterest.recVsMin', 'vs minimum payments')}
                        </p>
                    </div>
                )}

                {/* ── Export Buttons ── */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button onClick={handleDownloadPDF}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-brand-blue/5 border border-brand-blue/20 text-brand-blue font-bold text-xs transition-colors hover:bg-brand-blue/10 active:scale-95">
                        <FileText size={20} /> {t('ccInterest.exportPDF', 'Download PDF')}
                    </button>
                    <button onClick={handleDownloadExcel}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-brand-green/5 border border-brand-green/20 text-brand-green font-bold text-xs transition-colors hover:bg-brand-green/10 active:scale-95">
                        <FileText size={20} /> {t('ccInterest.exportExcel', 'Download Excel')}
                    </button>
                </div>
            </div>

            {/* ── CIBIL Score Analysis ── */}
            <div className="mx-4 my-4">
                <CibilBadge loanType="credit_card" />
            </div>
            <CibilAdvisoryCard
                score={cibilScore}
                loanType="credit_card"
                loanAmount={balance}
                tenureMonths={12}
            />

            <DisclaimerComponent module="creditCard" />
        </div>
    );
}
