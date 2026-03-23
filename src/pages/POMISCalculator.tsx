import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Save, Check, Info, FileText, BrainCircuit, Activity, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF } from '../utils/exportUtils';
import { useCalculatorStore } from '../store/useCalculatorStore';

const fmtINR = (v: number) => formatINR(Math.round(v));
const LOCK_IN_YEARS = 5;
const ITEMS_PER_PAGE = 12;

export default function POMISCalculator() {
    const navigate = useNavigate();
    const { addSaved } = useCalculatorStore();

    useEffect(() => { AnalyticsService.trackScreen('POMIS_Calculator'); }, []);

    const [investment, setInvestment] = useState(450000);
    const [rate, setRate] = useState(7.4);
    const [isJoint, setIsJoint] = useState(false);
    const [reinvestRate, setReinvestRate] = useState(7.1);
    const [taxRate, setTaxRate] = useState(20);
    const [inflation, setInflation] = useState(6);
    const [fdRate, setFdRate] = useState(7.0);

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [saved, setSaved] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

    const maxLimit = isJoint ? 1500000 : 900000;

    const result = useMemo(() => {
        const clampedInvestment = Math.min(investment, maxLimit);
        const monthlyIncome = (clampedInvestment * rate / 100) / 12;
        const totalMonths = LOCK_IN_YEARS * 12;
        const totalInterest = monthlyIncome * totalMonths;
        const annualIncome = monthlyIncome * 12;

        // Month-by-month schedule
        const schedule: { month: number; payout: number; cumulative: number }[] = [];
        for (let m = 1; m <= totalMonths; m++) {
            schedule.push({ month: m, payout: monthlyIncome, cumulative: monthlyIncome * m });
        }

        // Annual summary
        const annualSummary: { year: number; payout: number; cumulative: number }[] = [];
        for (let y = 1; y <= LOCK_IN_YEARS; y++) {
            annualSummary.push({ year: y, payout: annualIncome, cumulative: annualIncome * y });
        }

        // Reinvestment scenario (monthly payout → RD)
        const rq = reinvestRate / 400;
        let reinvestMaturity = 0;
        for (let m = 1; m <= totalMonths; m++) {
            const remaining = totalMonths - m;
            reinvestMaturity += monthlyIncome * Math.pow(1 + rq, remaining / 3);
        }
        const reinvestGain = reinvestMaturity - totalInterest;

        // Tax calculation
        const annualTaxOnInterest = annualIncome * (taxRate / 100);
        const netMonthlyAfterTax = monthlyIncome * (1 - taxRate / 100);
        const totalTaxOverTenure = annualTaxOnInterest * LOCK_IN_YEARS;
        const netTotalInterest = totalInterest - totalTaxOverTenure;

        // Inflation-adjusted real values
        const realMonthlyIncome = monthlyIncome / Math.pow(1 + inflation / 100, LOCK_IN_YEARS);
        const realPrincipalValue = clampedInvestment / Math.pow(1 + inflation / 100, LOCK_IN_YEARS);

        // FD comparison (quarterly compounding, same tenure)
        const fdMaturity = clampedInvestment * Math.pow(1 + fdRate / 400, 4 * LOCK_IN_YEARS);
        const fdInterest = fdMaturity - clampedInvestment;
        const fdPostTaxInterest = fdInterest * (1 - taxRate / 100);

        // Effective yield (post-tax)
        const postTaxYield = ((netTotalInterest / clampedInvestment) / LOCK_IN_YEARS) * 100;

        return {
            clampedInvestment, monthlyIncome, totalInterest, annualIncome,
            schedule, annualSummary,
            reinvestMaturity, reinvestGain,
            annualTaxOnInterest, netMonthlyAfterTax, totalTaxOverTenure, netTotalInterest,
            realMonthlyIncome, realPrincipalValue,
            fdMaturity, fdInterest, fdPostTaxInterest,
            postTaxYield
        };
    }, [investment, rate, isJoint, maxLimit, reinvestRate, taxRate, inflation, fdRate]);

    const handleSave = () => {
        addSaved({
            id: crypto.randomUUID(),
            calculatorType: 'Post Office MIS',
            inputValues: { investment, rate, isJoint },
            resultValues: { primary: result.monthlyIncome, totalInterest: result.totalInterest },
            timestamp: Date.now()
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handlePDFExport = () => {
        const headers = ['Parameter', 'Value'];
        const data: (string | number)[][] = [
            ['Investment Amount', fmtINR(result.clampedInvestment)],
            ['Account Type', isJoint ? 'Joint' : 'Single'],
            ['Interest Rate', `${rate}% p.a.`],
            ['Monthly Income', fmtINR(result.monthlyIncome)],
            ['Annual Income', fmtINR(result.annualIncome)],
            ['Total Interest (5 years)', fmtINR(result.totalInterest)],
            ['', ''],
            ['Tax Rate Assumed', `${taxRate}%`],
            ['Annual Tax on Interest', fmtINR(result.annualTaxOnInterest)],
            ['Net Monthly After Tax', fmtINR(result.netMonthlyAfterTax)],
            ['Total Tax Over 5 Years', fmtINR(result.totalTaxOverTenure)],
            ['Net Interest After Tax', fmtINR(result.netTotalInterest)],
            ['', ''],
            ['FD Rate Comparison', `${fdRate}%`],
            ['FD Maturity (5Y)', fmtINR(result.fdMaturity)],
            ['FD Post-Tax Interest', fmtINR(result.fdPostTaxInterest)],
        ];

        result.annualSummary.forEach(y => {
            data.push([`Year ${y.year} Payout`, fmtINR(y.payout)]);
        });

        exportToPDF('Post Office MIS Report', headers, data, 'POMIS_Analysis');
    };

    const totalPages = Math.ceil(result.schedule.length / ITEMS_PER_PAGE);
    const paginatedMonths = result.schedule.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    // Smart Insights
    const insights: string[] = useMemo(() => {
        const arr: string[] = [];
        if (investment > maxLimit) arr.push(`⚠️ Investment exceeds ${isJoint ? 'joint' : 'single'} limit of ₹${(maxLimit/100000).toFixed(0)}L. Capped to ₹${(maxLimit/100000).toFixed(0)}L.`);
        if (result.monthlyIncome > 5000) arr.push(`✅ Monthly income of ${fmtINR(result.monthlyIncome)} is a strong supplement for monthly expenses.`);
        if (result.postTaxYield < inflation) arr.push(`⚠️ Post-tax yield (${result.postTaxYield.toFixed(1)}%) is below inflation (${inflation}%). Real returns are negative.`);
        if (result.fdPostTaxInterest > result.netTotalInterest) arr.push(`💡 An FD at ${fdRate}% gives better post-tax returns. Consider FD if monthly cash flow isn't needed.`);
        else arr.push(`✅ MIS provides regular cash flow advantage over FD despite similar/lower total returns.`);
        if (result.reinvestGain > 10000) arr.push(`🔄 Re-investing monthly payouts in RD @ ${reinvestRate}% earns an extra ${fmtINR(result.reinvestGain)}.`);
        arr.push(`📌 MIS interest is fully taxable. No TDS is deducted; report in ITR under "Income from Other Sources."`);
        return arr;
    }, [investment, maxLimit, isJoint, result, inflation, fdRate, reinvestRate]);

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base font-semibold focus:outline-none focus:border-brand-blue";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                            <ArrowLeft size={18} className="text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Post Office MIS</h1>
                            <p className="text-muted-foreground text-xs">Monthly Income Scheme</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePDFExport} className="p-2 rounded-xl bg-card border border-border" title="Export PDF">
                            <FileText size={16} className="text-brand-blue" />
                        </button>
                        <button onClick={handleSave} className="p-2 rounded-xl bg-card border border-border" title="Save">
                            {saved ? <Check size={16} className="text-brand-green" /> : <Save size={16} className="text-brand-blue" />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 pb-28 space-y-4">
                <div className="space-y-3">
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">Total Investment</label>
                        <p className="text-muted-foreground text-[10px] mb-1">Max: ₹9L (Single), ₹15L (Joint)</p>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={investment} onChange={e => setInvestment(Number(e.target.value) || 0)} className={inputCls + " pl-8"} />
                        </div>
                    </div>
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">Interest Rate (p.a.)</label>
                        <div className="relative">
                            <input type="number" value={rate} step={0.1} onChange={e => setRate(Number(e.target.value) || 0)} className={inputCls + " pr-8"} />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                        </div>
                    </div>

                    {/* Account type toggle */}
                    <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                        <div>
                            <p className="text-foreground font-medium text-sm">Joint Account</p>
                            <p className="text-muted-foreground text-xs">Max limit ₹15L (vs ₹9L single)</p>
                        </div>
                        <button onClick={() => setIsJoint(p => !p)}
                            className={`w-12 h-7 rounded-full p-0.5 transition-colors ${isJoint ? 'bg-brand-blue' : 'bg-muted-foreground/30'}`}>
                            <motion.div layout className={`w-6 h-6 rounded-full bg-white shadow ${isJoint ? 'ml-auto' : 'ml-0'}`} />
                        </button>
                    </div>
                </div>

                {/* Result Card — UNCHANGED */}
                <div className="rounded-2xl bg-gradient-to-br from-brand-blue/20 to-blue-500/10 border border-brand-blue/30 p-5">
                    <p className="text-muted-foreground text-xs font-medium mb-1">Monthly Income</p>
                    <p className="text-foreground font-bold text-3xl">{fmtINR(result.monthlyIncome)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-muted-foreground text-[11px]">Principal at Maturity</p>
                            <p className="text-foreground font-bold text-base">{fmtINR(result.clampedInvestment)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[11px]">Total Interest (5 yrs)</p>
                            <p className="text-brand-green font-bold text-base">{fmtINR(result.totalInterest)}</p>
                        </div>
                    </div>
                </div>

                {/* ADVANCED DETAILS SECTION */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                            <Info size={16} className="text-brand-blue" />
                            <span className="text-foreground font-semibold text-sm">Advanced Details</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </button>
                    <AnimatePresence initial={false}>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                <div className="px-4 pb-4 space-y-4">
                                    <div className="h-px bg-border" />

                                    {/* 1. Tax Calculation */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Target size={14} className="text-red-400" />
                                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Tax Impact</p>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-muted-foreground text-xs">Tax Bracket:</span>
                                            <input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value) || 0)}
                                                className="w-14 py-1 text-center rounded-lg bg-card border border-border text-foreground text-sm font-bold focus:outline-none" />
                                            <span className="text-muted-foreground text-xs">%</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { label: 'Annual Tax on Interest', val: fmtINR(result.annualTaxOnInterest), color: 'text-red-400' },
                                                { label: 'Net Monthly After Tax', val: fmtINR(result.netMonthlyAfterTax), color: 'text-brand-green' },
                                                { label: 'Total Tax (5 Years)', val: fmtINR(result.totalTaxOverTenure), color: 'text-red-400' },
                                                { label: 'Net Interest After Tax', val: fmtINR(result.netTotalInterest), color: 'text-brand-green' },
                                            ].map(item => (
                                                <div key={item.label} className="p-2 rounded-lg bg-muted">
                                                    <p className="text-muted-foreground text-[9px] uppercase font-bold">{item.label}</p>
                                                    <p className={`${item.color} font-bold text-sm mt-0.5`}>{item.val}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-muted-foreground text-[10px] mt-2">Post-tax effective yield: <span className="text-foreground font-bold">{result.postTaxYield.toFixed(2)}%</span></p>
                                    </div>

                                    {/* 2. Annual Payout Table */}
                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Annual Payout Summary</p>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-3 bg-muted px-3 py-2">
                                                {['Year', 'Annual Payout', 'Cumulative'].map(h => (
                                                    <p key={h} className="text-muted-foreground text-[10px] font-bold uppercase">{h}</p>
                                                ))}
                                            </div>
                                            {result.annualSummary.map((row, i) => (
                                                <div key={row.year} className={`grid grid-cols-3 px-3 py-2 ${i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                    <p className="text-foreground text-[10px] font-medium">Year {row.year}</p>
                                                    <p className="text-brand-green text-[10px] font-semibold">{fmtINR(row.payout)}</p>
                                                    <p className="text-foreground text-[10px]">{fmtINR(row.cumulative)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 3. Month-by-Month (paginated) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Monthly Payout Schedule</p>
                                            {totalPages > 1 && (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}
                                                        className="p-1 rounded bg-muted disabled:opacity-30"><ChevronLeft size={12} /></button>
                                                    <span className="text-muted-foreground text-[9px]">{currentPage + 1}/{totalPages}</span>
                                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}
                                                        className="p-1 rounded bg-muted disabled:opacity-30"><ChevronRight size={12} /></button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-3 bg-muted px-3 py-2">
                                                {['Month', 'Payout', 'Cumulative'].map(h => (
                                                    <p key={h} className="text-muted-foreground text-[9px] font-bold uppercase">{h}</p>
                                                ))}
                                            </div>
                                            {paginatedMonths.map((row, i) => (
                                                <div key={row.month} className={`grid grid-cols-3 px-3 py-1.5 ${i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                    <p className="text-foreground text-[10px] font-medium">Month {row.month}</p>
                                                    <p className="text-brand-green text-[10px] font-semibold">{fmtINR(row.payout)}</p>
                                                    <p className="text-foreground text-[10px]">{fmtINR(row.cumulative)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 4. Reinvestment Scenario */}
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Activity size={14} className="text-amber-500" />
                                            <p className="text-amber-500 text-xs font-semibold">Reinvestment Scenario (Payout → RD)</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs">RD Interest Rate:</span>
                                            <input type="number" value={reinvestRate} step={0.1} onChange={e => setReinvestRate(Number(e.target.value) || 0)}
                                                className="w-14 py-1 text-center rounded-lg bg-card border border-border text-foreground text-sm font-bold focus:outline-none" />
                                            <span className="text-muted-foreground text-xs">%</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-muted-foreground text-[10px]">MIS Total Payout</p>
                                                <p className="text-foreground font-bold text-sm">{fmtINR(result.totalInterest)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-[10px]">Reinvested Maturity (RD)</p>
                                                <p className="text-amber-500 font-bold text-sm">{fmtINR(result.reinvestMaturity)}</p>
                                            </div>
                                        </div>
                                        <p className="text-muted-foreground text-[10px]">
                                            Extra gain from re-investing: <span className="text-amber-500 font-bold">{fmtINR(result.reinvestGain)}</span>
                                        </p>
                                    </div>

                                    {/* 5. FD Comparison */}
                                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                                        <p className="text-brand-blue text-xs font-semibold">Comparison: MIS vs FD (5 Years)</p>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-muted-foreground text-xs">FD Rate:</span>
                                            <input type="number" value={fdRate} step={0.1} onChange={e => setFdRate(Number(e.target.value) || 0)}
                                                className="w-14 py-1 text-center rounded-lg bg-card border border-border text-foreground text-sm font-bold focus:outline-none" />
                                            <span className="text-muted-foreground text-xs">%</span>
                                        </div>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-3 bg-muted px-3 py-2">
                                                {['', 'MIS', 'FD'].map(h => (
                                                    <p key={h} className="text-muted-foreground text-[9px] font-bold uppercase">{h}</p>
                                                ))}
                                            </div>
                                            {[
                                                { label: 'Gross Interest', mis: fmtINR(result.totalInterest), fd: fmtINR(result.fdInterest) },
                                                { label: 'Post-Tax Interest', mis: fmtINR(result.netTotalInterest), fd: fmtINR(result.fdPostTaxInterest) },
                                                { label: 'Monthly Cash Flow', mis: fmtINR(result.monthlyIncome), fd: '—' },
                                            ].map((row, i) => (
                                                <div key={row.label} className={`grid grid-cols-3 px-3 py-2 ${i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                    <p className="text-muted-foreground text-[10px] font-medium">{row.label}</p>
                                                    <p className="text-brand-green text-[10px] font-bold">{row.mis}</p>
                                                    <p className="text-foreground text-[10px] font-bold">{row.fd}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 6. Inflation Impact */}
                                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                                        <p className="text-purple-400 text-xs font-semibold">Inflation Impact (Real Value at Maturity)</p>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-muted-foreground text-xs">Inflation:</span>
                                            <input type="number" value={inflation} step={0.5} onChange={e => setInflation(Number(e.target.value) || 0)}
                                                className="w-14 py-1 text-center rounded-lg bg-card border border-border text-foreground text-sm font-bold focus:outline-none" />
                                            <span className="text-muted-foreground text-xs">%</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-muted-foreground text-[10px]">Today's Monthly Income</p>
                                                <p className="text-foreground font-bold text-sm">{fmtINR(result.monthlyIncome)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-[10px]">Real Value in Year 5</p>
                                                <p className="text-purple-400 font-bold text-sm">{fmtINR(result.realMonthlyIncome)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-[10px]">Principal Today</p>
                                                <p className="text-foreground font-bold text-sm">{fmtINR(result.clampedInvestment)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-[10px]">Real Value of Principal</p>
                                                <p className="text-purple-400 font-bold text-sm">{fmtINR(result.realPrincipalValue)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 7. Smart Insights */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <BrainCircuit size={14} className="text-yellow-500" />
                                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Smart Insights</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            {insights.map((tip, i) => (
                                                <p key={i} className="text-muted-foreground text-[11px] leading-relaxed p-2 rounded-lg bg-muted">{tip}</p>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-muted">
                                        <p className="text-muted-foreground text-[10px] leading-relaxed">
                                            💡 MIS interest is taxable as income. No TDS is deducted but must be declared in ITR.
                                            Principal is returned at maturity without any deduction. Premature withdrawal allowed after 1 year with penalty.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
