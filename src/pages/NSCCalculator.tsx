import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Save, Check, ShieldAlert, FileText, ChevronLeft, ChevronRight, Activity, BrainCircuit, Target, BarChart2, Info, TrendingUp, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF } from '../utils/exportUtils';
import { useCalculatorStore } from '../store/useCalculatorStore';

const fmtINR = (v: number) => formatINR(Math.round(v));
const ITEMS_PER_PAGE = 5; // NSC is strictly 5 years anyway, but keeping pagination structure if needed.
const LOCK_IN = 5;

export default function NSCCalculator() {
    const navigate = useNavigate();
    const { addSaved } = useCalculatorStore();

    useEffect(() => { AnalyticsService.trackScreen('NSC_Calculator'); }, []);

    const [investment, setInvestment] = useState(50000);
    const [rate, setRate] = useState(7.7);
    const [taxRate, setTaxRate] = useState(20);
    const [inflation, setInflation] = useState(6.0);
    const [fdRate, setFdRate] = useState(7.0);

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [saved, setSaved] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

    const result = useMemo(() => {
        // NSC: annually compounded, 5-year lock-in
        const maturity = investment * Math.pow(1 + rate / 100, LOCK_IN);
        const totalInterest = maturity - investment;

        // Year-by-year
        const table = [];
        let bal = investment;
        for (let y = 1; y <= LOCK_IN; y++) {
            const interest = bal * (rate / 100);
            const newBal = bal + interest;
            table.push({
                year: y,
                openBal: bal,
                interest,
                cumInterest: newBal - investment,
                closeBal: newBal,
            });
            bal = newBal;
        }

        // 80C deduction: Investment in Year 1 + reinvested interest in yrs 1 to 4
        // However simple deduction calculation for user input:
        const sec80cDeduction = Math.min(investment, 150000);
        const taxSaving = sec80cDeduction * (taxRate / 100);

        // Tax details (assuming 5th-year interest is taxed)
        const fifthYearInterest = table[4].interest;
        const taxOnInterest = fifthYearInterest * (taxRate / 100);
        const postTaxMaturity = maturity - taxOnInterest;
        
        // Effective CAGR post tax
        const postTaxReturn = ((postTaxMaturity / investment) - 1) * 100;
        const postTaxCAGR = (Math.pow(postTaxMaturity / investment, 1 / LOCK_IN) - 1) * 100;

        // Inflation adjustment
        const inflationFactor = Math.pow(1 + inflation / 100, LOCK_IN);
        const realValue = postTaxMaturity / inflationFactor;

        // FD Comparison
        const fdMaturity = investment * Math.pow(1 + fdRate / 100, LOCK_IN);
        // FD interest taxed every year, but using simple comparison at end:
        const fdInterest = fdMaturity - investment;
        const fdTax = fdInterest * (taxRate / 100);
        const fdPostTaxMaturity = fdMaturity - fdTax;

        return { 
            maturity, totalInterest, table, sec80cDeduction, taxSaving, 
            taxOnInterest, postTaxMaturity, postTaxReturn, postTaxCAGR, 
            realValue, fdMaturity, fdPostTaxMaturity 
        };
    }, [investment, rate, taxRate, inflation, fdRate]);

    const handleSave = () => {
        addSaved({
            id: crypto.randomUUID(),
            calculatorType: 'NSC Calculator',
            inputValues: { investment, rate },
            resultValues: { primary: result.maturity, ...result },
            timestamp: Date.now()
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handlePDFExport = () => {
        const headers = ['Parameter', 'Value'];
        const data: (string | number)[][] = [
            ['Total Investment', fmtINR(investment)],
            ['Interest Rate (p.a.)', `${rate}%`],
            ['Maturity Amount (5 Years)', fmtINR(result.maturity)],
            ['Total Interest Earned', fmtINR(result.totalInterest)],
            ['', ''],
            ['Tax Bracket Assumed', `${taxRate}%`],
            ['Eligible 80C Deduction (Yr 1)', fmtINR(result.sec80cDeduction)],
            ['Initial Tax Savings under 80C', fmtINR(result.taxSaving)],
            ['Tax on Maturity (5th Yr Interest)', fmtINR(result.taxOnInterest)],
            ['Net Post-Tax Maturity', fmtINR(result.postTaxMaturity)],
            ['Effective Post-Tax CAGR', `${result.postTaxCAGR.toFixed(2)}%`],
            ['', ''],
            ['Inflation Assumed', `${inflation}% p.a.`],
            ['Purchasing Power (Real Value)', fmtINR(result.realValue)]
        ];

        result.table.forEach(y => {
            data.push([`Year ${y.year}`, fmtINR(y.openBal), fmtINR(y.interest), fmtINR(y.closeBal)]);
        });

        exportToPDF('NSC Analysis Report', headers, data, 'NSC_Analysis');
    };

    const totalPages = Math.ceil(result.table.length / ITEMS_PER_PAGE);
    const paginatedYears = result.table.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base font-semibold focus:outline-none focus:border-brand-gold";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                            <ArrowLeft size={18} className="text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">NSC Calculator</h1>
                            <p className="text-muted-foreground text-xs">National Savings Certificate</p>
                        </div>
                    </div>
                    <button onClick={handleSave} className="p-2 rounded-xl bg-card border border-border text-brand-gold">
                        {saved ? <Check size={18} /> : <Save size={18} />}
                    </button>
                </div>
            </div>

            <div className="px-4 pt-5 pb-28 space-y-4">
                <div className="space-y-3">
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">Total Investment</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={investment} onChange={e => setInvestment(Number(e.target.value) || 0)} className={inputCls + " pl-8"} />
                        </div>
                    </div>
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">Interest Rate (p.a.)</label>
                        <p className="text-muted-foreground text-[10px] mb-1">Current: 7.7% (FY 2025-26)</p>
                        <div className="relative">
                            <input type="number" value={rate} step={0.1} onChange={e => setRate(Number(e.target.value) || 0)} className={inputCls + " pr-8"} />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-brand-gold/20 to-amber-500/10 border border-brand-gold/30 p-5">
                    <p className="text-muted-foreground text-xs font-medium mb-1">Maturity Amount (5 Years)</p>
                    <p className="text-foreground font-bold text-3xl">{fmtINR(result.maturity)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-muted-foreground text-[11px]">Total Invested</p>
                            <p className="text-foreground font-bold text-base">{fmtINR(investment)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[11px]">Interest Earned</p>
                            <p className="text-brand-green font-bold text-base">{fmtINR(result.totalInterest)}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-4 bg-muted/30">
                        <div className="flex items-center gap-2">
                            <BrainCircuit size={18} className="text-brand-gold" />
                            <span className="text-foreground font-semibold text-sm">Decision Analytics & Details</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>
                    
                    <AnimatePresence initial={false}>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                <div className="px-4 pb-4 space-y-6 pt-2">
                                    
                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-end gap-2 border-b border-border pb-4">
                                        <button onClick={handlePDFExport} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-gold/10 text-brand-gold text-xs font-medium hover:bg-brand-gold/20 transition-colors">
                                            <FileText size={14} /> Export PDF
                                        </button>
                                    </div>

                                    {/* Smart Insights */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Activity size={14} /> Smart Insights
                                        </h3>
                                        <div className="grid gap-2">
                                            {result.postTaxMaturity > result.fdPostTaxMaturity ? (
                                                <div className="p-3 rounded-xl bg-brand-green/10 border border-brand-green/20 flex gap-3">
                                                    <Check size={16} className="text-brand-green shrink-0 mt-0.5" />
                                                    <p className="text-xs font-medium text-brand-green">NSC outperforms a comparable FD in tax efficiency, providing {fmtINR(result.postTaxMaturity - result.fdPostTaxMaturity)} more in post-tax returns.</p>
                                                </div>
                                            ) : (
                                                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3">
                                                    <ShieldAlert size={16} className="text-orange-500 shrink-0 mt-0.5" />
                                                    <p className="text-xs font-medium text-orange-600 dark:text-orange-400">FD yields higher post-tax returns compared to NSC at current configurations.</p>
                                                </div>
                                            )}
                                            {result.postTaxCAGR > inflation ? (
                                                <div className="p-3 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex gap-3">
                                                    <TrendingUp size={16} className="text-brand-blue shrink-0 mt-0.5" />
                                                    <p className="text-xs font-medium text-brand-blue">Your real return beats inflation by {(result.postTaxCAGR - inflation).toFixed(2)}%.</p>
                                                </div>
                                            ) : (
                                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3">
                                                    <TrendingUp size={16} className="text-red-500 shrink-0 mt-0.5" />
                                                    <p className="text-xs font-medium text-red-500">Your real return after inflation is negative (loss of purchasing power).</p>
                                                </div>
                                            )}
                                            <div className="p-3 rounded-xl bg-muted border border-border flex gap-3">
                                                <Info size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                                                <p className="text-[11px] font-medium text-foreground">NSC interest is deemed reinvested and qualifies for 80C deduction in years 1 to 4, but Year 5 interest is fully taxable.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tax benefits & Effective Return */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <BarChart2 size={14} /> Tax Engine & Effective Return
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-muted-foreground text-[11px] font-medium block mb-1">Your Income Tax Slab Rate (%)</label>
                                                <div className="relative">
                                                    <input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value) || 0)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm font-semibold focus:outline-none focus:border-brand-gold" />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 bg-background p-3 rounded-xl border border-border">
                                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border border-dashed">
                                                    <span className="text-muted-foreground text-xs font-semibold">80C Deduction Claim</span>
                                                    <span className="text-brand-green font-bold text-xs">{fmtINR(result.sec80cDeduction)}</span>
                                                </div>
                                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border border-dashed">
                                                    <span className="text-muted-foreground text-xs">Initial Tax Saving</span>
                                                    <span className="text-brand-green font-bold text-xs">{fmtINR(result.taxSaving)}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1">
                                                    <span className="text-muted-foreground text-[11px]">Gross Maturity</span>
                                                    <span className="text-foreground font-medium text-[11px]">{fmtINR(result.maturity)}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1">
                                                    <span className="text-muted-foreground text-[11px]">Tax on Yr 5 Interest</span>
                                                    <span className="text-red-500 font-bold text-[11px] font-mono">-{fmtINR(result.taxOnInterest)}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1 pt-2 border-t border-border">
                                                    <span className="text-foreground font-semibold text-[11px]">Post-Tax Maturity</span>
                                                    <span className="text-brand-green font-bold text-[11px] font-mono">{fmtINR(result.postTaxMaturity)}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1">
                                                    <span className="text-foreground font-semibold text-[11px]">Effective Post-Tax CAGR</span>
                                                    <span className="text-brand-gold font-bold text-[13px]">{result.postTaxCAGR.toFixed(2)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Inflation & FD Comparison */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <TrendingUp size={14} /> Real Value
                                            </h3>
                                            <div className="bg-muted border border-border rounded-xl p-3">
                                                <label className="text-muted-foreground text-[10px] font-medium block mb-1">Inflation Rate (%)</label>
                                                <div className="relative mb-2">
                                                    <input type="number" value={inflation} onChange={e => setInflation(Number(e.target.value) || 0)} className="w-full bg-background border border-border rounded-md px-2 py-1 text-foreground text-xs font-semibold focus:outline-none focus:border-brand-gold pr-5" />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">%</span>
                                                </div>
                                                <p className="text-muted-foreground text-[10px] mb-1">Purchasing Power</p>
                                                <p className="text-foreground font-bold text-sm">{fmtINR(result.realValue)}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <RotateCw size={14} /> Vs Bank FD
                                            </h3>
                                            <div className="bg-muted border border-border rounded-xl p-3">
                                                <label className="text-muted-foreground text-[10px] font-medium block mb-1">FD Rate (%)</label>
                                                <div className="relative mb-2">
                                                    <input type="number" value={fdRate} onChange={e => setFdRate(Number(e.target.value) || 0)} className="w-full bg-background border border-border rounded-md px-2 py-1 text-foreground text-xs font-semibold focus:outline-none focus:border-brand-gold pr-5" />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">%</span>
                                                </div>
                                                <p className="text-muted-foreground text-[10px] mb-1">FD Post-Tax Value</p>
                                                <p className="text-foreground font-bold text-sm">{fmtINR(result.fdPostTaxMaturity)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Year-by-year table */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Year-by-Year Growth</h3>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-4 bg-muted px-2 py-2">
                                                <p className="text-muted-foreground text-[9px] font-bold uppercase">Year</p>
                                                <p className="text-muted-foreground text-[9px] font-bold uppercase">Interest</p>
                                                <p className="text-muted-foreground text-[9px] font-bold uppercase">Cum. Int</p>
                                                <p className="text-muted-foreground text-[9px] font-bold uppercase text-right">Balance</p>
                                            </div>
                                            {paginatedYears.map((row, i) => (
                                                <div key={row.year} className={`grid grid-cols-4 px-2 py-2 text-[10px] ${i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                                                    <p className="text-foreground font-medium">Year {row.year}</p>
                                                    <p className="text-brand-green">+{fmtINR(row.interest)}</p>
                                                    <p className="text-foreground">{fmtINR(row.cumInterest)}</p>
                                                    <p className="text-foreground font-semibold text-right">{fmtINR(row.closeBal)}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Pagination */}
                                        {totalPages > 1 && (
                                            <div className="flex items-center justify-between pt-2">
                                                <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="p-1 rounded-lg hover:bg-muted disabled:opacity-50">
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                    Page {currentPage + 1} of {totalPages}
                                                </span>
                                                <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} className="p-1 rounded-lg hover:bg-muted disabled:opacity-50">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        )}
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
