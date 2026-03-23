import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Save, Check, FileText, ShieldAlert, ChevronLeft, ChevronRight, Activity, BrainCircuit, Target, BarChart2, Info, TrendingUp, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF } from '../utils/exportUtils';
import { useCalculatorStore } from '../store/useCalculatorStore';

const fmtINR = (v: number) => formatINR(Math.round(v));
const ITEMS_PER_PAGE = 5;

// Current KVP rate: 7.5% p.a. -> doubles in 115 months
// Premature encashment is allowed after 2.5 years (30 months)
const PREMATURE_LOCK = 30;

export default function KVPCalculator() {
    const navigate = useNavigate();
    const { addSaved } = useCalculatorStore();

    useEffect(() => { AnalyticsService.trackScreen('KVP_Calculator'); }, []);

    const [investment, setInvestment] = useState(50000);
    const [rate, setRate] = useState(7.5);
    const [taxRate, setTaxRate] = useState(20);
    const [inflation, setInflation] = useState(6.0);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [saved, setSaved] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

    const result = useMemo(() => {
        // Doubling period in months (Rule of 72 variant for months)
        const monthlyRate = rate / 12 / 100;
        const doublingMonths = Math.round(Math.log(2) / Math.log(1 + monthlyRate));
        const maturity = investment * 2;
        const doublingYearsTotal = doublingMonths / 12;

        // Value at every year for pagination table
        const yearTable = [];
        let curVal = investment;
        for (let y = 1; y <= Math.ceil(doublingYearsTotal); y++) {
            const monthsInThisYear = Math.min(12, doublingMonths - (y - 1) * 12);
            // KVP compounds annually, but practically values are stated via formula
            const newVal = investment * Math.pow(1 + rate / 100, y);
            const displayVal = y === Math.ceil(doublingYearsTotal) ? maturity : newVal;
            
            yearTable.push({
                year: y,
                openBal: curVal,
                interest: displayVal - curVal,
                closeBal: displayVal
            });
            curVal = displayVal;
        }

        // Premature encashment values (after lock-in) every 6 months
        const premature: { months: number; value: number; penalty: string }[] = [];
        for (let m = PREMATURE_LOCK; m < doublingMonths; m += 6) {
            const fv = investment * Math.pow(1 + monthlyRate, m);
            premature.push({ months: m, value: fv, penalty: m < 36 ? '1% approx penalty' : 'No penalty' });
        }

        // Effective annual return (CAGR)
        const cagr = (Math.pow(maturity / investment, 1 / doublingYearsTotal) - 1) * 100;
        
        // Tax Impact (Taxed under IFOS)
        const totalInterest = maturity - investment;
        const taxLiable = totalInterest * (taxRate / 100);
        const postTaxMaturity = maturity - taxLiable;
        const postTaxCAGR = (Math.pow(postTaxMaturity / investment, 1 / doublingYearsTotal) - 1) * 100;

        // Inflation Impact
        const inflationFactor = Math.pow(1 + inflation / 100, doublingYearsTotal);
        const realMaturity = postTaxMaturity / inflationFactor;

        return { 
            maturity, doublingMonths, doublingYearsTotal, yearTable, premature, 
            cagr, taxLiable, postTaxMaturity, postTaxCAGR, realMaturity, totalInterest
        };
    }, [investment, rate, taxRate, inflation]);

    const doublingYears = Math.floor(result.doublingMonths / 12);
    const doublingMonthsRem = result.doublingMonths % 12;

    const handleSave = () => {
        addSaved({
            id: crypto.randomUUID(),
            calculatorType: 'KVP Calculator',
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
            ['Doubling Time', `${doublingYears}y ${doublingMonthsRem}m (${result.doublingMonths} months)`],
            ['Maturity Amount', fmtINR(result.maturity)],
            ['Effective CAGR', `${result.cagr.toFixed(2)}%`],
            ['', ''],
            ['Tax Bracket Assumed', `${taxRate}%`],
            ['Est. Tax Liability (IFOS)', fmtINR(result.taxLiable)],
            ['Net Post-Tax Maturity', fmtINR(result.postTaxMaturity)],
            ['Post-Tax CAGR', `${result.postTaxCAGR.toFixed(2)}%`],
            ['', ''],
            ['Inflation Assumed', `${inflation}% p.a.`],
            ['Purchasing Power (Real Value)', fmtINR(result.realMaturity)]
        ];

        result.yearTable.forEach(y => {
            data.push([`Year ${y.year}`, fmtINR(y.openBal), fmtINR(y.interest), fmtINR(y.closeBal)]);
        });

        exportToPDF('KVP Analysis Report', headers, data, 'KVP_Analysis');
    };

    const totalPages = Math.ceil(result.yearTable.length / ITEMS_PER_PAGE);
    const paginatedYears = result.yearTable.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base font-semibold focus:outline-none focus:border-brand-green";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                            <ArrowLeft size={18} className="text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">KVP Calculator</h1>
                            <p className="text-muted-foreground text-xs">Kisan Vikas Patra</p>
                        </div>
                    </div>
                    <button onClick={handleSave} className="p-2 rounded-xl bg-card border border-border text-brand-green">
                        {saved ? <Check size={18} /> : <Save size={18} />}
                    </button>
                </div>
            </div>

            <div className="px-4 pt-5 pb-28 space-y-4">
                <div className="space-y-3">
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">Investment Amount</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={investment} onChange={e => setInvestment(Number(e.target.value) || 0)} className={inputCls + " pl-8"} />
                        </div>
                    </div>
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">Interest Rate (p.a.)</label>
                        <p className="text-muted-foreground text-[10px] mb-1">Current: 7.5% (FY 2025-26)</p>
                        <div className="relative">
                            <input type="number" value={rate} step={0.1} onChange={e => setRate(Number(e.target.value) || 0)} className={inputCls + " pr-8"} />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-brand-green/20 to-emerald-500/10 border border-brand-green/30 p-5">
                    <p className="text-muted-foreground text-xs font-medium mb-1">Maturity Amount</p>
                    <p className="text-foreground font-bold text-3xl">{fmtINR(result.maturity)}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                        <div>
                            <p className="text-muted-foreground text-[10px]">Principal</p>
                            <p className="text-foreground font-bold text-sm">{fmtINR(investment)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[10px]">Doubling Period</p>
                            <p className="text-brand-blue font-bold text-sm">{doublingYears}y {doublingMonthsRem}m</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[10px]">Interest Earned</p>
                            <p className="text-brand-green font-bold text-sm">{fmtINR(investment)}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-4 bg-muted/30">
                        <div className="flex items-center gap-2">
                            <BrainCircuit size={18} className="text-brand-green" />
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
                                        <button onClick={handlePDFExport} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-green/10 text-brand-green text-xs font-medium hover:bg-brand-green/20 transition-colors">
                                            <FileText size={14} /> Export PDF
                                        </button>
                                    </div>

                                    {/* Smart Insights */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Activity size={14} /> Smart Insights
                                        </h3>
                                        <div className="grid gap-2">
                                            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3">
                                                <Info size={16} className="text-orange-500 shrink-0 mt-0.5" />
                                                <p className="text-[11px] font-medium text-foreground">KVP offers no Section 80C deductions. Interest is fully taxable under 'Income from Other Sources'.</p>
                                            </div>
                                            {result.postTaxCAGR > inflation ? (
                                                <div className="p-3 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex gap-3">
                                                    <TrendingUp size={16} className="text-brand-blue shrink-0 mt-0.5" />
                                                    <p className="text-[11px] font-medium text-foreground">Your real return safely beats inflation by {(result.postTaxCAGR - inflation).toFixed(2)}% even after taxes.</p>
                                                </div>
                                            ) : (
                                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3">
                                                    <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5" />
                                                    <p className="text-[11px] font-medium text-red-500">Inflation ({inflation}%) outpaces your post-tax return ({result.postTaxCAGR.toFixed(2)}%). Consider diversifying into equities if lock-in is acceptable.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tax benefits & Effective Return */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <BarChart2 size={14} /> Taxation & Effective Return
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-muted-foreground text-[11px] font-medium block mb-1">Your Income Tax Slab Rate (%)</label>
                                                <div className="relative">
                                                    <input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value) || 0)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm font-semibold focus:outline-none focus:border-brand-green" />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-muted border border-border rounded-xl p-3">
                                                    <p className="text-muted-foreground text-[10px] mb-1">Pre-Tax CAGR</p>
                                                    <p className="text-foreground font-bold text-sm">{result.cagr.toFixed(2)}%</p>
                                                </div>
                                                <div className="bg-brand-green/10 border border-brand-green/20 rounded-xl p-3">
                                                    <p className="text-brand-green/80 text-[10px] mb-1 font-semibold">Post-Tax CAGR</p>
                                                    <p className="text-brand-green font-bold text-sm">{result.postTaxCAGR.toFixed(2)}%</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2 bg-background p-3 rounded-xl border border-border">
                                                <div className="flex justify-between items-center py-1">
                                                    <span className="text-muted-foreground text-[11px]">Gross Maturity</span>
                                                    <span className="text-foreground font-medium text-[11px]">{fmtINR(result.maturity)}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1">
                                                    <span className="text-muted-foreground text-[11px]">Tax Liability (IFOS)</span>
                                                    <span className="text-red-500 font-bold text-[11px] font-mono">-{fmtINR(result.taxLiable)}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1 pt-2 border-t border-border">
                                                    <span className="text-foreground font-semibold text-[11px]">Post-Tax Maturity</span>
                                                    <span className="text-brand-green font-bold text-[11px] font-mono">{fmtINR(result.postTaxMaturity)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Inflation impact */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <TrendingUp size={14} /> Inflation Impact
                                        </h3>
                                        <div className="bg-muted border border-border rounded-xl p-3 flex justify-between items-center">
                                            <div>
                                                <label className="text-muted-foreground text-[10px] font-medium block mb-1">Inflation Rate (%)</label>
                                                <input type="number" value={inflation} onChange={e => setInflation(Number(e.target.value) || 0)} className="w-20 bg-background border border-border rounded-md px-2 py-1 text-foreground text-xs font-semibold focus:outline-none focus:border-brand-green" />
                                            </div>
                                            <div className="text-right">
                                                <p className="text-muted-foreground text-[10px] mb-1">Purchasing Power at Maturity</p>
                                                <p className="text-foreground font-bold text-sm">{fmtINR(result.realMaturity)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Year-by-year table */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Year-by-Year Growth</h3>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-4 bg-muted px-2 py-2">
                                                <p className="text-muted-foreground text-[9px] font-bold uppercase">Year</p>
                                                <p className="text-muted-foreground text-[9px] font-bold uppercase">Opening</p>
                                                <p className="text-muted-foreground text-[9px] font-bold uppercase">Int. Earned</p>
                                                <p className="text-muted-foreground text-[9px] font-bold uppercase text-right">Closing</p>
                                            </div>
                                            {paginatedYears.map((row, i) => (
                                                <div key={row.year} className={`grid grid-cols-4 px-2 py-2 text-[10px] ${i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                                                    <p className="text-foreground font-medium">Year {row.year}</p>
                                                    <p className="text-foreground">{fmtINR(row.openBal)}</p>
                                                    <p className="text-brand-green">+{fmtINR(row.interest)}</p>
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

                                    {/* Premature encashment */}
                                    {result.premature.length > 0 && (
                                        <div className="space-y-3 pt-2">
                                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Premature Encashment (After 2.5 yrs)</h3>
                                            <div className="rounded-xl overflow-hidden border border-border">
                                                <div className="grid grid-cols-3 bg-muted px-3 py-2">
                                                    {['Months', 'Approx Value', 'Penalty Info'].map(h => (
                                                        <p key={h} className="text-muted-foreground text-[9px] font-bold uppercase">{h}</p>
                                                    ))}
                                                </div>
                                                <div className="max-h-40 overflow-y-auto">
                                                    {result.premature.map((row, i) => (
                                                        <div key={row.months} className={`grid grid-cols-3 px-3 py-2 ${i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                            <p className="text-foreground text-[10px]">{Math.floor(row.months / 12)}y {row.months % 12 ? (row.months % 12) + 'm' : ''}</p>
                                                            <p className="text-foreground text-[10px] font-semibold">{fmtINR(row.value)}</p>
                                                            <p className={`text-[10px] ${row.penalty === 'No penalty' ? 'text-brand-green' : 'text-amber-500'}`}>{row.penalty}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
