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
import { useCibil } from '../context/CibilContext';

const fmtINR = (v: number) => formatINR(Math.round(v));

const RATE_PRESETS: { rate: number; label: string }[] = [
  { rate: 24, label: '24%' },
  { rate: 36, label: 'IDFC 36%' },
  { rate: 40, label: 'SBI 40%' },
  { rate: 42, label: 'HDFC 42%' },
  { rate: 43, label: 'Axis 43%' },
  { rate: 45, label: '45%' },
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

            {/* ── CIBIL Cross-Link ── */}
            {cibilScore > 0 && (
                <div className="mx-4 my-4 p-4 rounded-xl border flex items-center justify-between" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black" style={{ backgroundColor: cibilScore >= 750 ? '#22c55e20' : '#eab30820', color: cibilScore >= 750 ? '#22c55e' : '#eab308' }}>{cibilScore}</div>
                        <div>
                            <p className="text-xs font-bold" style={{ color: c.text }}>{t('ccInterest.cibilScore', 'Your CIBIL')}: {cibilScore}</p>
                            <p className="text-[10px]" style={{ color: c.textSecondary }}>
                                {cibilScore >= 750 ? t('ccInterest.cibilGood', 'Eligible for lower-rate personal loan to pay off CC debt')
                                 : t('ccInterest.cibilLow', 'High CC utilization may impact your score')}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/cibil-score')} className="text-[10px] font-bold text-brand-blue">{t('cc.viewCibil', 'View')} →</button>
                </div>
            )}

            <DisclaimerComponent module="creditCard" />
        </div>
    );
}
