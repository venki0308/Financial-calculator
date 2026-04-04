import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Save, Check, ShieldAlert, FileText, ChevronLeft, ChevronRight, Activity, BrainCircuit, TrendingUp, Target, BarChart2, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import { useCalculatorStore } from '../store/useCalculatorStore';
import DisclaimerComponent from '../components/DisclaimerComponent';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function EPFCalculator() {
    const navigate = useNavigate();
    const { addSaved } = useCalculatorStore();

    useEffect(() => { AnalyticsService.trackScreen('EPF_Advanced'); }, []);

    // Base Inputs
    const [basic, setBasic] = useState(30000);
    const [empPct, setEmpPct] = useState(12);
    const [vpfPct, setVpfPct] = useState(0);
    const [rate, setRate] = useState(8.25);
    const [age, setAge] = useState(28);
    const [retireAge, setRetireAge] = useState(58);
    const [hike, setHike] = useState(5);
    const totalEmpPct = empPct + vpfPct;

    // Advanced Inputs
    const [inflationRate, setInflationRate] = useState(6.0);
    const [whatIfHike, setWhatIfHike] = useState(10);
    const [whatIfRetire, setWhatIfRetire] = useState(60);

    // UI States
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showWhatIf, setShowWhatIf] = useState(false);
    const [showTable, setShowTable] = useState(false);
    const [saved, setSaved] = useState(false);
    const [page, setPage] = useState(1);

    // 1. CORE CALCULATION
    const result = useMemo(() => {
        const years = Math.max(retireAge - age, 1);
        let balance = 0;
        let totalEmp = 0;
        let totalEmployer = 0;
        let salary = basic;

        const schedule: { year: number; age: number; empContrib: number; emplerContrib: number; interest: number; closingBal: number }[] = [];

        for (let y = 0; y < years; y++) {
            let openingBal = balance;
            let yearEmp = 0;
            let yearEmpler = 0;
            let runningBal = openingBal;
            let yearlyInterest = 0;
            const monthlyRate = rate / 100 / 12;

            for (let m = 0; m < 12; m++) {
                const emp = salary * totalEmpPct / 100;
                // Employer 12% is split: EPS (capped at 8.33% × ₹15,000 = ₹1,250/mo), rest to EPF
                // For basic > ₹15,000: Employer EPF = 12% × basic − ₹1,250
                // For basic ≤ ₹15,000: Employer EPF = 12% − 8.33% = 3.67% × basic
                const EPS_WAGE_CEILING = 15000;
                const epsContrib = Math.min(salary * 0.0833, EPS_WAGE_CEILING * 0.0833);
                const employer = (salary * 0.12) - epsContrib;
                runningBal += emp + employer;
                // Interest on closing balance of each month (EPFO method)
                yearlyInterest += runningBal * monthlyRate;
                yearEmp += emp;
                yearEmpler += employer;
            }

            balance = runningBal + yearlyInterest;
            totalEmp += yearEmp;
            totalEmployer += yearEmpler;

            schedule.push({
                year: y + 1,
                age: age + y + 1,
                empContrib: yearEmp,
                emplerContrib: yearEmpler,
                interest: yearlyInterest,
                closingBal: balance,
            });

            salary *= (1 + hike / 100);
        }

        const totalInterest = Math.max(0, balance - totalEmp - totalEmployer);
        const corpus = balance;

        // Breakdown
        const empPctOfCorpus = corpus > 0 ? (totalEmp / corpus) * 100 : 0;
        const employerPctOfCorpus = corpus > 0 ? (totalEmployer / corpus) * 100 : 0;
        const interestPctOfCorpus = corpus > 0 ? (totalInterest / corpus) * 100 : 0;

        // Inflation Adj
        const purchasingPower = corpus / Math.pow(1 + inflationRate / 100, years);
        const realReturn = ((1 + rate / 100) / (1 + inflationRate / 100) - 1) * 100;

        // Final Salary
        const finalMonthlySalary = basic * Math.pow(1 + hike / 100, years);
        // Retirement Readiness (Rule of thumb: 20x annual salary)
        const targetCorpus = finalMonthlySalary * 12 * 20;
        const readinessPct = Math.min(100, (corpus / targetCorpus) * 100);

        // Taxable interest check: Budget 2021 — interest on employee contribution > Rs 2.5L/yr is taxable
        const annualEmpContrib = basic * totalEmpPct / 100 * 12;
        const taxableThreshold = 250000;
        const isInterestTaxable = annualEmpContrib > taxableThreshold;
        const taxableExcess = Math.max(0, annualEmpContrib - taxableThreshold);

        return { corpus, totalEmp, totalEmployer, totalInterest, empPctOfCorpus, employerPctOfCorpus, interestPctOfCorpus, schedule, years, purchasingPower, realReturn, finalMonthlySalary, targetCorpus, readinessPct, annualEmpContrib, isInterestTaxable, taxableExcess };
    }, [basic, totalEmpPct, rate, age, retireAge, hike, inflationRate]);

    // 2. WHAT-IF SIMULATOR
    const whatIf = useMemo(() => {
        const simYears = Math.max(whatIfRetire - age, 1);
        let simBalance = 0;
        let simSalary = basic;

        const simMonthlyRate = rate / 100 / 12;
        for (let y = 0; y < simYears; y++) {
            let simRunningBal = simBalance;
            let simYearlyInterest = 0;

            for (let m = 0; m < 12; m++) {
                const emp = simSalary * totalEmpPct / 100;
                const EPS_WAGE_CEILING = 15000;
                const epsContrib = Math.min(simSalary * 0.0833, EPS_WAGE_CEILING * 0.0833);
                const employer = (simSalary * 0.12) - epsContrib;
                simRunningBal += emp + employer;
                simYearlyInterest += simRunningBal * simMonthlyRate;
            }

            simBalance = simRunningBal + simYearlyInterest;

            simSalary *= (1 + whatIfHike / 100);
        }

        const addedWealth = simBalance - result.corpus;

        return { simBalance, addedWealth };
    }, [whatIfHike, whatIfRetire, age, basic, totalEmpPct, rate, result.corpus]);

    // 3. SMART INSIGHTS
    const insight = useMemo(() => {
        if (result.interestPctOfCorpus > 60) {
            return { msg: `The power of compounding! ${result.interestPctOfCorpus.toFixed(1)}% of your retirement wealth is purely from interest, heavily outweighing your actual contributions.`, type: 'success' };
        }
        if (result.readinessPct < 30) {
            return { msg: `Your projected EPF corpus covers only ${result.readinessPct.toFixed(1)}% of an ideal retirement nest egg (20x final salary). Consider increasing your VPF contribution or investing in equity.`, type: 'warn' };
        }
        if (result.realReturn < 1) {
            return { msg: `With inflation at ${inflationRate}%, your real EPF growth is only ${result.realReturn.toFixed(1)}%. It preserves capital but may not aggressively grow your wealth.`, type: 'info' };
        }
        return { msg: `Your employer's matching contributions effectively give you a ${result.employerPctOfCorpus.toFixed(1)}% "free" boost to your retirement corpus.`, type: 'success' };
    }, [result, inflationRate]);

    const handleSave = () => {
        addSaved({
            id: `epf-${Date.now()}`,
            calculatorType: 'epf',
            inputValues: { basic, empPct, rate, age, retireAge, hike },
            resultValues: { primary: result.corpus, label: 'Retirement Corpus', invested: result.totalEmp + result.totalEmployer, returns: result.totalInterest },
            timestamp: Date.now(),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleDownloadPDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const config: ExportConfig = {
            title: 'EPF Calculator Report',
            inputs: [
                { label: 'Basic Monthly Salary', value: `₹${Math.round(basic).toLocaleString('en-IN')}` },
                { label: 'Employee Contribution', value: `${totalEmpPct}%${vpfPct > 0 ? ` (12% + ${vpfPct}% VPF)` : ''}` },
                { label: 'EPF Interest Rate', value: `${rate}% p.a.` },
                { label: 'Current Age', value: `${age} Years` },
                { label: 'Retirement Age', value: `${retireAge} Years` },
                { label: 'Annual Salary Hike', value: `${hike}%` },
                { label: 'Assumed Inflation', value: `${inflationRate}%` },
            ],
            results: [
                { label: 'Expected EPF Corpus', value: `₹${Math.round(result.corpus).toLocaleString('en-IN')}` },
                { label: 'Total Employee Contribution', value: `₹${Math.round(result.totalEmp).toLocaleString('en-IN')}` },
                { label: 'Total Employer EPF Share', value: `₹${Math.round(result.totalEmployer).toLocaleString('en-IN')}` },
                { label: 'Total Interest Earned', value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
                { label: 'Years to Retirement', value: `${result.years} Years` },
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: 'Employee Contributions', value: result.totalEmp, color: '#4F46E5' },
                    { label: 'Employer Contributions', value: result.totalEmployer, color: '#F59E0B' },
                    { label: 'Interest Earned', value: result.totalInterest, color: '#10B981' },
                ],
            },
            projectionTitle: 'Yearly EPF Growth Schedule',
            projectionColumns: ['Year', 'Age', 'Employee Contrib', 'Employer Contrib', 'Interest', 'Closing Balance'],
            projectionRows: result.schedule.map((r: any) => [
                `Year ${r.year}`,
                r.age,
                `₹${Math.round(r.empContrib).toLocaleString('en-IN')}`,
                `₹${Math.round(r.emplerContrib).toLocaleString('en-IN')}`,
                `₹${Math.round(r.interest).toLocaleString('en-IN')}`,
                `₹${Math.round(r.closingBal).toLocaleString('en-IN')}`,
            ]),
            filename: `FinCalix_EPF_Report_${tag}`,
        };
        await exportToPDF(config);
    };

    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const config: ExportConfig = {
            title: 'EPF Calculator Report',
            inputs: [
                { label: 'Basic Monthly Salary', value: `₹${Math.round(basic).toLocaleString('en-IN')}` },
                { label: 'Employee Contribution', value: `${totalEmpPct}%${vpfPct > 0 ? ` (12% + ${vpfPct}% VPF)` : ''}` },
                { label: 'EPF Interest Rate', value: `${rate}%` },
                { label: 'Current Age', value: `${age}` },
                { label: 'Retirement Age', value: `${retireAge}` },
            ],
            results: [
                { label: 'Expected EPF Corpus', value: `₹${Math.round(result.corpus).toLocaleString('en-IN')}` },
                { label: 'Total Employee Contribution', value: `₹${Math.round(result.totalEmp).toLocaleString('en-IN')}` },
                { label: 'Total Employer Share', value: `₹${Math.round(result.totalEmployer).toLocaleString('en-IN')}` },
                { label: 'Total Interest Earned', value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
            ],
            projectionTitle: 'Yearly EPF Growth',
            projectionColumns: ['Year', 'Age', 'Employee Contrib', 'Employer Contrib', 'Interest', 'Closing Balance'],
            projectionRows: result.schedule.map((r: any) => [r.year, r.age, Math.round(r.empContrib), Math.round(r.emplerContrib), Math.round(r.interest), Math.round(r.closingBal)]),
            filename: `FinCalix_EPF_Report_${tag}`,
        };
        await exportToExcel(config);
    };

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm font-semibold focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50";

    return (
        <div className="min-h-dvh bg-background pb-28 animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border hover:bg-muted transition-all">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground leading-tight">EPF Calculator</h1>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Employee Provident Fund</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 space-y-5">
                {/* 1. CORE INPUTS */}
                <div className="space-y-4">
                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">Basic + DA (Monthly)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={basic} onChange={e => setBasic(Number(e.target.value)||0)} className={inputCls + " pl-7 bg-brand-gold/5 focus:bg-card"} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">Current Age</label>
                            <div className="relative">
                                <input type="number" value={age} onChange={e => setAge(Number(e.target.value)||0)} className={inputCls + " pr-8 bg-muted/30 focus:bg-card"} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold">YRS</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">Retirement Age</label>
                            <div className="relative">
                                <input type="number" value={retireAge} onChange={e => setRetireAge(Number(e.target.value)||0)} className={inputCls + " pr-8 bg-muted/30 focus:bg-card"} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold">YRS</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">Annual Hike</label>
                            <div className="relative">
                                <input type="number" step="0.1" value={hike} onChange={e => setHike(Number(e.target.value)||0)} className={inputCls + " pr-7 bg-muted/30 focus:bg-card"} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">EPF Interest Rate</label>
                            <div className="relative">
                                <input type="number" step="0.01" value={rate} onChange={e => setRate(Number(e.target.value)||0)} className={inputCls + " pr-7 bg-muted/30 focus:bg-card"} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                            </div>
                        </div>
                    </div>
                    {/* VPF Input */}
                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">VPF — Voluntary PF (%)</label>
                        <div className="relative">
                            <input type="number" step="1" value={vpfPct} onChange={e => setVpfPct(Math.min(88, Math.max(0, Number(e.target.value) || 0)))} className={inputCls + " pr-7 bg-emerald-500/5 focus:bg-card"} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                        </div>
                        <p className="text-muted-foreground text-[9px] mt-1">Extra contribution over 12% mandatory. Same 8.25% guaranteed return. Total: {totalEmpPct}%</p>
                    </div>
                    {/* Taxable Interest Warning */}
                    {result.isInterestTaxable && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <p className="text-amber-500 text-[10px] font-bold mb-1">Taxable Interest Warning</p>
                            <p className="text-muted-foreground text-[10px]">
                                Your annual employee contribution ({totalEmpPct}% of ₹{basic.toLocaleString('en-IN')} = ₹{result.annualEmpContrib.toLocaleString('en-IN')}/yr) exceeds ₹2.5L threshold.
                                Interest on the excess ₹{result.taxableExcess.toLocaleString('en-IN')} will be taxable at your slab rate (Budget 2021 rule).
                            </p>
                        </div>
                    )}
                </div>

                {/* 2. RESULTS HERO */}
                <motion.div layout className="p-6 rounded-3xl bg-card border border-border shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-bold">Projected Retirement Corpus</p>
                        <div className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-brand-gold/10 border-brand-gold/20 text-brand-gold">
                            {result.years} Yrs Left
                        </div>
                    </div>
                    
                    <p className="text-4xl font-black text-foreground tracking-tight mb-5 drop-shadow-sm">
                        {fmtINR(result.corpus)}
                    </p>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="p-2.5 rounded-xl bg-background border border-border/50">
                            <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">Your Share</p>
                            <p className="text-foreground font-black text-xs">{fmtINR(result.totalEmp)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-brand-gold/5 border border-brand-gold/20">
                            <p className="text-brand-gold/80 text-[9px] uppercase font-bold mb-0.5">Employer EPF</p>
                            <p className="text-brand-gold font-black text-xs">{fmtINR(result.totalEmployer)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-brand-green/10 border border-brand-green/20">
                            <p className="text-brand-green text-[9px] uppercase font-bold mb-0.5">Interest Gained</p>
                            <p className="text-brand-green font-black text-xs">+{fmtINR(result.totalInterest)}</p>
                        </div>
                    </div>
                </motion.div>

                {/* SMART INSIGHT (Dynamic) */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${insight.type === 'warn' ? 'bg-amber-500/10 border-amber-500/30' : insight.type === 'success' ? 'bg-brand-green/10 border-brand-green/30' : 'bg-brand-gold/10 border-brand-gold/30'}`}>
                    <BrainCircuit size={18} className={`shrink-0 mt-0.5 ${insight.type === 'warn' ? 'text-amber-500' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-gold'}`} />
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${insight.type === 'warn' ? 'text-amber-600' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-gold'}`}>Smart Insight</p>
                        <p className={`text-xs font-medium leading-relaxed ${insight.type === 'warn' ? 'text-amber-700 dark:text-amber-400' : insight.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-yellow-700 dark:text-yellow-400'}`}>{insight.msg}</p>
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
                            <div className="p-1.5 bg-brand-gold/10 rounded-lg text-brand-gold"><Activity size={16} /></div>
                            <span className="text-foreground font-bold text-sm">Advanced Details</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-5">
                                    <div className="h-px bg-border w-full -mt-2" />

                                    {/* Composition Bar */}
                                    <div>
                                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-2">Portfolio Composition</p>
                                        <div className="h-4 w-full rounded-full flex overflow-hidden bg-brand-green/20">
                                            <div className="h-full bg-foreground transition-all duration-1000" style={{ width: `${result.empPctOfCorpus}%` }} />
                                            <div className="h-full bg-brand-gold transition-all duration-1000" style={{ width: `${result.employerPctOfCorpus}%` }} />
                                            <div className="h-full bg-brand-green transition-all duration-1000" style={{ width: `${result.interestPctOfCorpus}%` }} />
                                        </div>
                                        <div className="flex justify-between mt-2 flex-wrap gap-2">
                                            <p className="text-[10px] font-bold text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full bg-foreground mr-1" /> You: {result.empPctOfCorpus.toFixed(1)}%</p>
                                            <p className="text-[10px] font-bold text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full bg-brand-gold mr-1" /> Employer: {result.employerPctOfCorpus.toFixed(1)}%</p>
                                            <p className="text-[10px] font-bold text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full bg-brand-green mr-1" /> Interest: {result.interestPctOfCorpus.toFixed(1)}%</p>
                                        </div>
                                    </div>

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
                                                 <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">Real Return</p>
                                                 <p className={`font-black text-sm ${result.realReturn > 0 ? 'text-brand-green' : 'text-rose-500'}`}>{result.realReturn.toFixed(2)}%</p>
                                            </div>
                                            <div className="bg-card p-3 rounded-xl border border-border/50 text-center">
                                                 <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">Purchasing Power</p>
                                                 <p className="text-foreground font-black text-sm">{fmtINR(result.purchasingPower)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Retirement Readiness */}
                                    <div className="p-4 rounded-2xl bg-brand-purple/5 border border-brand-purple/10">
                                         <p className="text-brand-purple/80 text-[10px] uppercase font-bold tracking-wider mb-2">Retirement Readiness</p>
                                         <p className="text-xs text-brand-purple/90 font-medium mb-3">Rule of thumb: Aim for a corpus equivalent to <b>20 times</b> your final annual salary to sustain your lifestyle.</p>
                                         <div className="flex justify-between items-center bg-background rounded-xl p-3 border border-border/50">
                                             <div>
                                                 <p className="text-[10px] text-muted-foreground uppercase font-bold">Target needed</p>
                                                 <p className="text-sm font-black text-foreground">{fmtINR(result.targetCorpus)}</p>
                                             </div>
                                             <div className="text-right">
                                                 <p className="text-[10px] text-muted-foreground uppercase font-bold">Achieved</p>
                                                 <p className={`text-sm font-black ${result.readinessPct >= 100 ? 'text-brand-green' : 'text-amber-500'}`}>{result.readinessPct.toFixed(1)}%</p>
                                             </div>
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
                            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500"><RotateCw size={16} /></div>
                            <span className="text-foreground font-bold text-sm">What-If Salary / Tenure</span>
                        </div>
                        {showWhatIf ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showWhatIf && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-4">
                                    <div className="h-px bg-border w-full -mt-2" />
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">What if Hike was?</label>
                                            <div className="relative">
                                                <input type="number" step="0.1" value={whatIfHike} onChange={e => setWhatIfHike(Number(e.target.value)||0)} className={inputCls + " pr-7 border-blue-500/30"} />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">Retire Age was?</label>
                                            <div className="relative">
                                                <input type="number" value={whatIfRetire} onChange={e => setWhatIfRetire(Number(e.target.value)||0)} className={inputCls} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl border bg-blue-500/5 border-blue-500/20 text-center">
                                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-wider mb-3">Revised Outcome</p>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                 <p className="text-blue-600 dark:text-blue-400 text-[10px] font-bold mb-0.5">New Corpus</p>
                                                 <p className="text-foreground font-black text-base">{fmtINR(whatIf.simBalance)}</p>
                                            </div>
                                            <div>
                                                 <p className="text-blue-600 dark:text-blue-400 text-[10px] font-bold mb-0.5">Extra Wealth</p>
                                                 <p className="text-brand-green font-black text-base">{whatIf.addedWealth >= 0 ? '+' : ''}{fmtINR(whatIf.addedWealth)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 5. YEAR-WISE SCHEDULE TABLE */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden mb-6">
                    <button onClick={() => setShowTable(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-foreground rounded-lg text-background"><BarChart2 size={16} /></div>
                            <span className="text-foreground font-bold text-sm">Yearly Schedule</span>
                        </div>
                        {showTable ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showTable && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 pt-1">
                                    <div className="rounded-2xl overflow-hidden border border-border mt-2">
                                        <div className="grid grid-cols-3 bg-muted px-3 py-2.5">
                                            {['Age', 'Contribs', 'End Balance'].map(h => (<p key={h} className="text-muted-foreground text-[10px] font-black uppercase tracking-wider">{h}</p>))}
                                        </div>
                                        <div className="divide-y divide-border/50">
                                            {result.schedule.slice((page - 1) * 10, page * 10).map((row) => (
                                                <div key={row.year} className="grid grid-cols-3 px-3 py-3 bg-background items-center">
                                                    <p className="text-foreground text-xs font-bold">{row.age} yrs</p>
                                                    <div>
                                                        <p className="text-muted-foreground text-[10px] font-mono leading-tight">+{fmtINR(row.empContrib + row.emplerContrib)}</p>
                                                        <p className="text-brand-green text-[9px] font-mono leading-tight">+{fmtINR(row.interest)} Int</p>
                                                    </div>
                                                    <p className="text-foreground text-xs font-bold font-mono">{fmtINR(row.closingBal)}</p>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {/* Pagination */}
                                        {result.schedule.length > 10 && (
                                            <div className="bg-muted px-3 py-2.5 flex justify-between items-center border-t border-border">
                                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Page {page} of {Math.ceil(result.schedule.length / 10)}</p>
                                                <button disabled={page === Math.ceil(result.schedule.length / 10)} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-center text-[9px] text-muted-foreground mt-3 uppercase tracking-widest font-bold">Standard 12% Emp / 3.67% Employer Split</p>
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

            <DisclaimerComponent module="epf" />
        </div>
    );
}
