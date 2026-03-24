import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Save, Check, ShieldAlert, FileText, ChevronLeft, ChevronRight, Activity, BrainCircuit, TrendingUp, Target, BarChart2, RotateCw, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import { useCalculatorStore } from '../store/useCalculatorStore';
import DisclaimerComponent from '../components/DisclaimerComponent';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function RDCalculator() {
    const navigate = useNavigate();
    const { addSaved } = useCalculatorStore();

    useEffect(() => { AnalyticsService.trackScreen('RD_Advanced'); }, []);

    // Base Inputs
    const [monthly, setMonthly] = useState(5000);
    const [rate, setRate] = useState(6.7);
    const [months, setMonths] = useState(12);

    // Advanced Inputs
    const [inflationRate, setInflationRate] = useState(6.0);
    const [whatIfExtra, setWhatIfExtra] = useState(1000);

    // UI States
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showWhatIf, setShowWhatIf] = useState(false);
    const [showTable, setShowTable] = useState(false);
    const [saved, setSaved] = useState(false);
    const [page, setPage] = useState(1);

    // 1. CORE CALCULATION (Keep exact same RBI formula equivalent)
    const result = useMemo(() => {
        const r = (rate || 0) / 400; // quarterly rate
        let maturity = 0;
        const validMonths = Math.max(1, months || 1);
        const validMonthly = Math.max(1, monthly || 0);

        const schedule: { month: number; deposit: number; interestEarned: number; cumInterest: number; balance: number }[] = [];
        let runningBalance = 0;

        for (let i = 1; i <= validMonths; i++) {
            const remainingQuarters = (validMonths - i + 1) / 3;
            const installmentGrowth = validMonthly * Math.pow(1 + r, remainingQuarters);
            maturity += installmentGrowth;

            runningBalance = 0;
            for (let j = 1; j <= i; j++) {
                runningBalance += validMonthly * Math.pow(1 + r, (i - j + 1) / 3);
            }
            const interestEarned = runningBalance - validMonthly * i;

            schedule.push({
                month: i,
                deposit: validMonthly,
                interestEarned: Math.max(0, interestEarned - (schedule[i - 2]?.cumInterest ?? 0)),
                cumInterest: Math.max(0, interestEarned),
                balance: runningBalance
            });
        }

        const invested = validMonthly * validMonths;
        const totalInterest = Math.max(0, maturity - invested);
        const effectiveYield = (Math.pow(1 + r, 4) - 1) * 100;

        // Inflation Impact
        const realRate = ((1 + (effectiveYield / 100)) / (1 + (inflationRate / 100)) - 1) * 100;
        const purchasingPower = maturity / Math.pow(1 + inflationRate / 100, validMonths / 12);

        // Composition
        const interestPct = maturity > 0 ? (totalInterest / maturity) * 100 : 0;
        const principalPct = maturity > 0 ? (invested / maturity) * 100 : 0;

        return { maturity, invested, totalInterest, effectiveYield, realRate, purchasingPower, interestPct, principalPct, schedule, validMonths, validMonthly };
    }, [monthly, rate, months, inflationRate]);

    // 2. WHAT-IF SIMULATOR
    const whatIf = useMemo(() => {
        const extraM= Math.max(100, whatIfExtra || 0);
        const newMonthly = result.validMonthly + extraM;
        const r = (rate || 0) / 400;

        let newMaturity = 0;
        for (let i = 1; i <= result.validMonths; i++) {
            const remainingQuarters = (result.validMonths - i + 1) / 3;
            newMaturity += newMonthly * Math.pow(1 + r, remainingQuarters);
        }

        const addedWealth = newMaturity - result.maturity;
        const extraInvested = extraM * result.validMonths;
        const extraInterest = addedWealth - extraInvested;

        return { newMonthly, newMaturity, addedWealth, extraInvested, extraInterest };
    }, [whatIfExtra, result, rate]);

    // 3. SMART INSIGHTS
    const insight = useMemo(() => {
        if (result.effectiveYield > inflationRate + 1.5) {
            return { msg: `Good choice! Your RD's effective yield (${result.effectiveYield.toFixed(2)}%) outpaces inflation (${inflationRate}%), meaningfully growing your real wealth.`, type: 'success' };
        }
        if (result.interestPct > 35) {
             return { msg: `Long tenure advantage: ${result.interestPct.toFixed(1)}% of your final maturity amount comes purely from earned interest!`, type: 'success' };
        }
        if (result.effectiveYield <= inflationRate) {
             return { msg: `Warning: Your effective return drops to ${result.realRate.toFixed(2)}% when adjusted for inflation. The purchasing power of your maturity amount will be roughly ${fmtINR(result.purchasingPower)}.`, type: 'warn' };
        }
        return { msg: `Quarterly compounding effectively bumps your nominal ${rate}% rate to a ${result.effectiveYield.toFixed(2)}% annual yield. Consistent saving pays off!`, type: 'info' };
    }, [result, rate, inflationRate]);

    const handleSave = () => {
        addSaved({
            id: `rd-${Date.now()}`,
            calculatorType: 'rd',
            inputValues: { monthly, rate, months },
            resultValues: { primary: result.maturity, label: 'Maturity Amount', invested: result.invested, returns: result.totalInterest },
            timestamp: Date.now(),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleDownloadPDF = async () => {
        const headers = ['Metric', 'Value'];
        const data: (string | number)[][] = [
            ['Monthly Deposit', fmtINR(monthly)],
            ['Interest Rate (p.a.)', `${rate}%`],
            ['Time Period', `${months} months`],
            ['--- Results ---', ''],
            ['Total Invested', fmtINR(result.invested)],
            ['Interest Earned', fmtINR(result.totalInterest)],
            ['Maturity Amount', fmtINR(result.maturity)],
            ['--- Advanced Analysis ---', ''],
            ['Effective Annual Yield (Quarterly Compounding)', `${result.effectiveYield.toFixed(2)}%`],
            ['Real Return (Adjusted for Inflation)', `${result.realRate.toFixed(2)}%`],
            ['Purchasing Power of Maturity', fmtINR(result.purchasingPower)],
            ['Maturity Breakdown', `${result.principalPct.toFixed(1)}% Principal | ${result.interestPct.toFixed(1)}% Interest`],
            ...(showWhatIf ? [
                ['--- What-If Scenario ---', ''],
                [`If Deposit increased by ${fmtINR(whatIfExtra)}/mo`, ''],
                ['New Monthly Deposit', fmtINR(whatIf.newMonthly)],
                ['New Maturity Amount', fmtINR(whatIf.newMaturity)],
                ['Extra Wealth Generated', fmtINR(whatIf.addedWealth)]
            ] : []),
            ['--- Smart Insights ---', ''],
            ['Insight', insight.msg],
        ];

        await exportToPDF('Smart RD Statement', headers, data, 'RD_Smart_Analysis');
    };

    const handleDownloadExcel = () => {
        const headers = ['Month', 'Monthly Deposit', 'Cum. Interest', 'End Balance'];
        const data = result.schedule.map(r => [r.month, Math.round(r.deposit), Math.round(r.cumInterest), Math.round(r.balance)]);
        exportToExcel(headers, data, 'RD_Schedule');
    };

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm font-semibold focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50";

    return (
        <div className="min-h-dvh bg-background pb-28 animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border hover:bg-muted transition-all">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground leading-tight">RD Calculator</h1>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Recurring Deposit</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 space-y-5">
                {/* 1. CORE INPUTS */}
                <div className="space-y-4">
                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">Monthly Deposit</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={monthly} onChange={e => setMonthly(Number(e.target.value)||0)} className={inputCls + " pl-7 bg-brand-blue/5 focus:bg-card"} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">Interest Rate</label>
                            <div className="relative">
                                <input type="number" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value)||0)} className={inputCls + " pr-7 bg-muted/30 focus:bg-card"} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">Time Period</label>
                            <div className="relative">
                                <input type="number" value={months} onChange={e => setMonths(Number(e.target.value)||0)} className={inputCls + " pr-10 bg-muted/30 focus:bg-card"} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold">MO.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. RESULTS HERO */}
                <motion.div layout className="p-6 rounded-3xl bg-card border border-border shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-bold">Maturity Amount</p>
                        <div className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-brand-blue/10 border-brand-blue/20 text-brand-blue">
                            Yield: {result.effectiveYield.toFixed(2)}%
                        </div>
                    </div>
                    
                    <p className="text-4xl font-black text-foreground tracking-tight mb-5 drop-shadow-sm">
                        {fmtINR(result.maturity)}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3.5 rounded-2xl bg-background border border-border/50">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-0.5">Total Invested</p>
                            <p className="text-foreground font-black text-sm">{fmtINR(result.invested)}</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-brand-green/10 border border-brand-green/20">
                            <p className="text-brand-green text-[10px] uppercase font-bold mb-0.5">Wealth Gained</p>
                            <p className="text-brand-green font-black text-sm">+{fmtINR(result.totalInterest)}</p>
                        </div>
                    </div>
                </motion.div>

                {/* SMART INSIGHT (Dynamic) */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${insight.type === 'warn' ? 'bg-amber-500/10 border-amber-500/30' : insight.type === 'success' ? 'bg-brand-green/10 border-brand-green/30' : 'bg-brand-blue/10 border-brand-blue/30'}`}>
                    <BrainCircuit size={18} className={`shrink-0 mt-0.5 ${insight.type === 'warn' ? 'text-amber-500' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-blue'}`} />
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${insight.type === 'warn' ? 'text-amber-600' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-blue'}`}>Smart Insight</p>
                        <p className={`text-xs font-medium leading-relaxed ${insight.type === 'warn' ? 'text-amber-700 dark:text-amber-400' : insight.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-300'}`}>{insight.msg}</p>
                    </div>
                </div>

                {/* SAVE BUTTON */}
                <button onClick={handleSave} className="w-full py-3.5 rounded-2xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-foreground/10">
                    {saved ? <Check size={18} /> : <Save size={18} />}
                    {saved ? 'Calculation Saved!' : 'Save Calculation'}
                </button>


                {/* 3. ADVANCED DETAILS */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-brand-blue/10 rounded-lg text-brand-blue"><Activity size={16} /></div>
                            <span className="text-foreground font-bold text-sm">Advanced Details</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-5">
                                    <div className="h-px bg-border w-full -mt-2" />

                                    {/* Real Return & Purchasing Power */}
                                    <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-background to-muted">
                                        <div className="flex justify-between items-center mb-3">
                                             <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Inflation Adjuster</p>
                                             <div className="flex items-center gap-1.5">
                                                 <span className="text-[10px] font-bold text-muted-foreground">Infl. %</span>
                                                 <input type="number" step="0.1" value={inflationRate} onChange={e => setInflationRate(Number(e.target.value)||0)} className="w-14 bg-card border border-border rounded px-2 py-0.5 text-xs focus:outline-none" />
                                             </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div className="bg-card p-3 rounded-xl border border-border/50 text-center">
                                                 <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">Real Yield</p>
                                                 <p className={`font-black text-sm ${result.realRate > 0 ? 'text-brand-green' : 'text-rose-500'}`}>{result.realRate.toFixed(2)}%</p>
                                            </div>
                                            <div className="bg-card p-3 rounded-xl border border-border/50 text-center">
                                                 <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">Purchasing Power</p>
                                                 <p className="text-foreground font-black text-sm">{fmtINR(result.purchasingPower)}</p>
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-muted-foreground leading-tight px-1 text-center">
                                            Due to inflation, your {fmtINR(result.maturity)} will only buy what {fmtINR(result.purchasingPower)} buys today.
                                        </p>
                                    </div>

                                    {/* Composition Bar */}
                                    <div>
                                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-2">Final Value Composition</p>
                                        <div className="h-4 w-full rounded-full flex overflow-hidden bg-brand-green/20">
                                            <div className="h-full bg-foreground transition-all duration-1000" style={{ width: `${result.principalPct}%` }} />
                                            <div className="h-full bg-brand-green transition-all duration-1000" style={{ width: `${result.interestPct}%` }} />
                                        </div>
                                        <div className="flex justify-between mt-2">
                                            <p className="text-[10px] font-bold text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full bg-foreground mr-1" /> Principal: {result.principalPct.toFixed(1)}%</p>
                                            <p className="text-[10px] font-bold text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full bg-brand-green mr-1" /> Interest: {result.interestPct.toFixed(1)}%</p>
                                        </div>
                                    </div>

                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


                {/* 4. WHAT-IF SIMULATOR */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowWhatIf(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500"><RotateCw size={16} /></div>
                            <span className="text-foreground font-bold text-sm">What-If Simulator</span>
                        </div>
                        {showWhatIf ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showWhatIf && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-4">
                                    <div className="h-px bg-border w-full -mt-2" />
                                    
                                    <div>
                                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">What if I deposit extra per month?</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">+₹</span>
                                            <input type="number" value={whatIfExtra} onChange={e => setWhatIfExtra(Number(e.target.value)||0)} className={inputCls + " pl-8 border-amber-500/30"} />
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl border bg-amber-500/5 border-amber-500/20 text-center">
                                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-wider mb-3">Revised Outcome</p>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                 <p className="text-amber-600 dark:text-amber-400 text-[10px] font-bold mb-0.5">New Maturity</p>
                                                 <p className="text-foreground font-black text-base">{fmtINR(whatIf.newMaturity)}</p>
                                            </div>
                                            <div>
                                                 <p className="text-amber-600 dark:text-amber-400 text-[10px] font-bold mb-0.5">Extra Wealth</p>
                                                 <p className="text-brand-green font-black text-base">+{fmtINR(whatIf.addedWealth)}</p>
                                            </div>
                                        </div>
                                        <div className="bg-card p-2 rounded-xl border border-border/50 text-[10px] text-muted-foreground flex gap-2 text-left">
                                             <Info size={14} className="text-amber-500 shrink-0"/>
                                             <p>Just <span className="text-foreground font-bold">₹{whatIfExtra}/mo</span> extra yields <span className="text-brand-green font-bold">₹{Math.round(whatIf.extraInterest)}</span> in bonus interest alone!</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 5. MONTH-WISE SCHEDULE TABLE */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden mb-6">
                    <button onClick={() => setShowTable(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-foreground rounded-lg text-background"><BarChart2 size={16} /></div>
                            <span className="text-foreground font-bold text-sm">Monthly Schedule</span>
                        </div>
                        {showTable ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showTable && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 pt-1">
                                    <div className="rounded-2xl overflow-hidden border border-border mt-2">
                                        <div className="grid grid-cols-3 bg-muted px-3 py-2.5">
                                            {['Month', 'Total Dept.', 'Balance'].map(h => (<p key={h} className="text-muted-foreground text-[10px] font-black uppercase tracking-wider">{h}</p>))}
                                        </div>
                                        <div className="divide-y divide-border/50">
                                            {result.schedule.slice((page - 1) * 12, page * 12).map((row) => (
                                                <div key={row.month} className="grid grid-cols-3 px-3 py-3 bg-background items-center">
                                                    <p className="text-foreground text-xs font-bold">Mo {row.month}</p>
                                                    <p className="text-muted-foreground text-xs font-mono">{fmtINR(row.deposit * row.month)}</p>
                                                    <div>
                                                        <p className="text-foreground text-xs font-bold font-mono">{fmtINR(row.balance)}</p>
                                                        <p className="text-brand-green text-[9px] font-mono mt-0.5">+{fmtINR(row.cumInterest)} Int.</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {/* Pagination */}
                                        {result.schedule.length > 12 && (
                                            <div className="bg-muted px-3 py-2.5 flex justify-between items-center border-t border-border">
                                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Page {page} of {Math.ceil(result.schedule.length / 12)}</p>
                                                <button disabled={page === Math.ceil(result.schedule.length / 12)} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-center text-[9px] text-muted-foreground mt-3 uppercase tracking-widest font-bold">Quarterly Compounded (RBI Std.)</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* EXPORT OPTIONS */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-brand-blue/5 border border-brand-blue/20 text-brand-blue font-bold text-xs transition-colors hover:bg-brand-blue/10 active:scale-95"
                    >
                        <FileText size={20} /> Export Report
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-brand-green/5 border border-brand-green/20 text-brand-green font-bold text-xs transition-colors hover:bg-brand-green/10 active:scale-95"
                    >
                        <FileText size={20} /> Excel Data
                    </button>
                </div>
            </div>

            <DisclaimerComponent module="rd" />
        </div>
    );
}
