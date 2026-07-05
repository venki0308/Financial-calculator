import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronUp, Save, Check, ShieldAlert, FileText, ChevronLeft, ChevronRight, Activity, BrainCircuit, TrendingUp, Target, BarChart2, RotateCw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, getEnglishT, ExportConfig } from '../utils/exportReport';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useLiveStatusStore } from '../store/useLiveStatusStore';
import DateInput from '../components/DateInput';
import LiveInvestmentTracker from '../components/LiveInvestmentTracker';
import DisclaimerComponent from '../components/DisclaimerComponent';
import SaveNameDialog from '../components/SaveNameDialog';
import { useHistoryTracker } from '../hooks/useHistoryTracker';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function EPFCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addSaved, removeSaved } = useCalculatorStore();
    const addProfile = useLiveStatusStore(s => s.addProfile);
    const removeProfile = useLiveStatusStore(s => s.removeProfile);

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
    const [inflationRate, setInflationRate] = useState(5.0); // Updated FY 2025-26: RBI CPI projection ~4.8%
    const [whatIfHike, setWhatIfHike] = useState(10);
    const [whatIfRetire, setWhatIfRetire] = useState(60);

    // UI States
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showWhatIf, setShowWhatIf] = useState(false);
    const [showTable, setShowTable] = useState(false);
    const [saved, setSaved] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);
    const [joiningDate, setJoiningDate] = useState('');
    const [showNameDialog, setShowNameDialog] = useState(false);
    const [page, setPage] = useState(1);

    // 1. CORE CALCULATION
    const result = useMemo(() => {
        // 0 when age >= retireAge — yields an empty schedule instead of inventing a fictitious year
        const years = Math.max(retireAge - age, 0);
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

    useHistoryTracker('EPF Calculator', { basic, age, retireAge, rate }, { totalInterest: result.totalInterest }, result.corpus);

    // 2. WHAT-IF SIMULATOR
    const whatIf = useMemo(() => {
        const simYears = Math.max(whatIfRetire - age, 0);
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
            return { msg: t('epf.insightCompounding', { pct: result.interestPctOfCorpus.toFixed(1) }), type: 'success' };
        }
        if (result.readinessPct < 30) {
            return { msg: t('epf.insightLowReadiness', { pct: result.readinessPct.toFixed(1) }), type: 'warn' };
        }
        if (result.realReturn < 1) {
            return { msg: t('epf.insightLowRealReturn', { inflation: inflationRate, realReturn: result.realReturn.toFixed(1) }), type: 'info' };
        }
        return { msg: t('epf.insightEmployerBoost', { pct: result.employerPctOfCorpus.toFixed(1) }), type: 'success' };
    }, [result, inflationRate, t]);

    const suggestedName = `EPF — ${formatINR(basic)}/mo basic`;

    const handleSave = (customName: string) => {
        const calcId = `epf-${Date.now()}`;
        addSaved({
            id: calcId,
            calculatorType: 'epf',
            inputValues: { basic, empPct, rate, age, retireAge, hike, name: customName },
            resultValues: { primary: result.corpus, label: t('epf.retirementCorpus'), invested: result.totalEmp + result.totalEmployer, returns: result.totalInterest },
            timestamp: Date.now(),
        });
        // Mirror into live tracker store so it appears in My Loans
        addProfile({
            id: calcId,
            name: customName,
            calculatorType: 'EPF',
            profileData: {
                basic,
                empPct,
                rate,
                years: result.years,
                totalInvested: Math.round(result.totalEmp + result.totalEmployer),
                corpus: Math.round(result.corpus),
                interest: Math.round(result.totalInterest),
                startDate: joiningDate || new Date().toISOString().slice(0, 10),
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        setSaved(true);
        setLastSavedId(calcId);
    };

    const handleRemove = () => {
        if (lastSavedId) {
            removeSaved(lastSavedId);
            removeProfile(lastSavedId);
            setLastSavedId(null);
            setSaved(false);
        }
    };

    const handleDownloadPDF = async () => {
        const te = getEnglishT();
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const config: ExportConfig = {
            title: te('epf.reportTitle', 'EPF Report'),
            inputs: [
                { label: te('epf.basicMonthlySalary', 'Basic Monthly Salary'), value: `₹${Math.round(basic).toLocaleString('en-IN')}` },
                { label: te('epf.employeeContribution', 'Employee Contribution'), value: `${totalEmpPct}%${vpfPct > 0 ? ` (incl. VPF ${vpfPct}%)` : ''}` },
                { label: te('epf.epfInterestRate', 'EPF Interest Rate'), value: `${rate}% ${te('epf.perAnnum', 'p.a.')}` },
                { label: te('epf.currentAge', 'Current Age'), value: `${age} ${te('epf.years', 'years')}` },
                { label: te('epf.retirementAge', 'Retirement Age'), value: `${retireAge} ${te('epf.years', 'years')}` },
                { label: te('epf.annualSalaryHike', 'Annual Salary Hike'), value: `${hike}%` },
                { label: te('epf.assumedInflation', 'Assumed Inflation'), value: `${inflationRate}%` },
            ],
            results: [
                { label: te('epf.expectedCorpus', 'Expected Corpus'), value: `₹${Math.round(result.corpus).toLocaleString('en-IN')}` },
                { label: te('epf.totalEmployeeContrib', 'Total Employee Contribution'), value: `₹${Math.round(result.totalEmp).toLocaleString('en-IN')}` },
                { label: te('epf.totalEmployerShare', 'Total Employer Share'), value: `₹${Math.round(result.totalEmployer).toLocaleString('en-IN')}` },
                { label: te('epf.totalInterestEarned', 'Total Interest Earned'), value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
                { label: te('epf.yearsToRetirement', 'Years to Retirement'), value: `${result.years} ${te('epf.years', 'years')}` },
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: te('epf.employeeContributions', 'Employee Contributions'), value: result.totalEmp, color: '#4F46E5' },
                    { label: te('epf.employerContributions', 'Employer Contributions'), value: result.totalEmployer, color: '#F59E0B' },
                    { label: te('epf.interestEarned', 'Interest Earned'), value: result.totalInterest, color: '#10B981' },
                ],
            },
            projectionTitle: te('epf.yearlyGrowthSchedule', 'Yearly Growth Schedule'),
            projectionColumns: [te('epf.yearCol', 'Year'), te('epf.age', 'Age'), te('epf.employeeContrib', 'Employee Contrib.'), te('epf.employerContrib', 'Employer Contrib.'), te('epf.interestLabel', 'Interest'), te('epf.closingBalance', 'Closing Balance')],
            projectionRows: result.schedule.map((r: any) => [
                `${te('epf.yearCol', 'Year')} ${r.year}`,
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
        const te = getEnglishT();
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const config: ExportConfig = {
            title: te('epf.reportTitle', 'EPF Report'),
            inputs: [
                { label: te('epf.basicMonthlySalary', 'Basic Monthly Salary'), value: `₹${Math.round(basic).toLocaleString('en-IN')}` },
                { label: te('epf.employeeContribution', 'Employee Contribution'), value: `${totalEmpPct}%${vpfPct > 0 ? ` (incl. VPF ${vpfPct}%)` : ''}` },
                { label: te('epf.epfInterestRate', 'EPF Interest Rate'), value: `${rate}%` },
                { label: te('epf.currentAge', 'Current Age'), value: `${age}` },
                { label: te('epf.retirementAge', 'Retirement Age'), value: `${retireAge}` },
            ],
            results: [
                { label: te('epf.expectedCorpus', 'Expected Corpus'), value: `₹${Math.round(result.corpus).toLocaleString('en-IN')}` },
                { label: te('epf.totalEmployeeContrib', 'Total Employee Contribution'), value: `₹${Math.round(result.totalEmp).toLocaleString('en-IN')}` },
                { label: te('epf.totalEmployerShare', 'Total Employer Share'), value: `₹${Math.round(result.totalEmployer).toLocaleString('en-IN')}` },
                { label: te('epf.totalInterestEarned', 'Total Interest Earned'), value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
            ],
            projectionTitle: te('epf.yearlyGrowth', 'Yearly Growth'),
            projectionColumns: [te('epf.yearCol', 'Year'), te('epf.age', 'Age'), te('epf.employeeContrib', 'Employee Contrib.'), te('epf.employerContrib', 'Employer Contrib.'), te('epf.interestLabel', 'Interest'), te('epf.closingBalance', 'Closing Balance')],
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
                        <h1 className="text-lg font-bold text-foreground leading-tight">{t('epf.title')}</h1>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{t('epf.subtitle')}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 space-y-5">
                {/* 1. CORE INPUTS */}
                <div className="space-y-4">
                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('epf.basicDA')}</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={basic} onChange={e => setBasic(Number(e.target.value)||0)} className={inputCls + " pl-7 bg-brand-gold/5 focus:bg-card"} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('epf.currentAge')}</label>
                            <div className="relative">
                                <input type="number" min={18} max={70} value={age} onChange={e => setAge(Number(e.target.value)||0)} className={inputCls + " pr-8 bg-muted/30 focus:bg-card"} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold">{t('epf.yrs')}</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('epf.retirementAge')}</label>
                            <div className="relative">
                                <input type="number" min={45} max={70} value={retireAge} onChange={e => setRetireAge(Number(e.target.value)||0)} className={inputCls + " pr-8 bg-muted/30 focus:bg-card"} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold">{t('epf.yrs')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('epf.annualHike')}</label>
                            <div className="relative">
                                <input type="number" step="0.1" value={hike} onChange={e => setHike(Number(e.target.value)||0)} className={inputCls + " pr-7 bg-muted/30 focus:bg-card"} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('epf.epfInterestRate')}</label>
                            <div className="relative">
                                <input type="number" step="0.01" value={rate} onChange={e => setRate(Number(e.target.value)||0)} className={inputCls + " pr-7 bg-muted/30 focus:bg-card"} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                            </div>
                            {/* EPFO declares the rate annually after the FY closes (typically Feb-Mar).
                                8.25% is the most recently confirmed rate (FY 2025-26, declared Mar 2026). Users planning
                                long-term should treat this as indicative — actual yearly accrual may differ. */}
                            <p className="text-[9px] text-muted-foreground mt-1 leading-tight">
                                {t('epf.rateNote', '8.25% — FY 2025-26 declared rate. EPFO revises annually; verify at epfindia.gov.in')}
                            </p>
                        </div>
                    </div>
                    {/* VPF Input */}
                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('epf.vpfLabel')}</label>
                        <div className="relative">
                            <input type="number" step="1" value={vpfPct} onChange={e => setVpfPct(Math.min(88, Math.max(0, Number(e.target.value) || 0)))} className={inputCls + " pr-7 bg-emerald-500/5 focus:bg-card"} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                        </div>
                        <p className="text-muted-foreground text-[9px] mt-1">{t('epf.vpfHelper', { total: totalEmpPct })}</p>
                    </div>
                    {/* Taxable Interest Warning */}
                    {result.isInterestTaxable && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <p className="text-amber-500 text-[10px] font-bold mb-1">{t('epf.taxableWarningTitle')}</p>
                            <p className="text-muted-foreground text-[10px]">
                                {t('epf.taxableWarningDesc', { pct: totalEmpPct, basic: basic.toLocaleString('en-IN'), annual: result.annualEmpContrib.toLocaleString('en-IN'), excess: result.taxableExcess.toLocaleString('en-IN') })}
                            </p>
                        </div>
                    )}
                </div>

                {/* 2. RESULTS HERO */}
                {result.years === 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-amber-500 text-[10px] font-bold">
                            {t('epf.pastRetirementNote', 'Current age is at or beyond retirement age — nothing left to project')}
                        </p>
                    </div>
                )}
                <motion.div layout className="p-6 rounded-3xl bg-card border border-border shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-bold">{t('epf.projectedCorpus')}</p>
                        <div className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-brand-gold/10 border-brand-gold/20 text-brand-gold">
                            {result.years} {t('epf.yrsLeft')}
                        </div>
                    </div>
                    
                    <p className="text-4xl font-black text-foreground tracking-tight mb-5 drop-shadow-sm">
                        {fmtINR(result.corpus)}
                    </p>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="p-2.5 rounded-xl bg-background border border-border/50">
                            <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('epf.yourShare')}</p>
                            <p className="text-foreground font-black text-xs">{fmtINR(result.totalEmp)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-brand-gold/5 border border-brand-gold/20">
                            <p className="text-brand-gold/80 text-[9px] uppercase font-bold mb-0.5">{t('epf.employerEPF')}</p>
                            <p className="text-brand-gold font-black text-xs">{fmtINR(result.totalEmployer)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-brand-green/10 border border-brand-green/20">
                            <p className="text-brand-green text-[9px] uppercase font-bold mb-0.5">{t('epf.interestGained')}</p>
                            <p className="text-brand-green font-black text-xs">+{fmtINR(result.totalInterest)}</p>
                        </div>
                    </div>
                </motion.div>

                {/* SMART INSIGHT (Dynamic) */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${insight.type === 'warn' ? 'bg-amber-500/10 border-amber-500/30' : insight.type === 'success' ? 'bg-brand-green/10 border-brand-green/30' : 'bg-brand-gold/10 border-brand-gold/30'}`}>
                    <BrainCircuit size={18} className={`shrink-0 mt-0.5 ${insight.type === 'warn' ? 'text-amber-500' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-gold'}`} />
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${insight.type === 'warn' ? 'text-amber-600' : insight.type === 'success' ? 'text-brand-green' : 'text-brand-gold'}`}>{t('epf.smartInsight')}</p>
                        <p className={`text-xs font-medium leading-relaxed ${insight.type === 'warn' ? 'text-amber-700 dark:text-amber-400' : insight.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-yellow-700 dark:text-yellow-400'}`}>{insight.msg}</p>
                    </div>
                </div>

                {/* JOINING DATE — feeds the My Loans / Trackers card */}
                {!saved && (
                    <div className="p-4 rounded-2xl border border-border bg-card">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2 block">
                            {t('common.investmentDate', 'Investment Date (optional)')}
                        </label>
                        <DateInput
                            value={joiningDate}
                            onChange={setJoiningDate}
                            max={new Date().toISOString().slice(0, 10)}
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                            {t('common.investmentDateHint', 'Used for tracking in My Loans')}
                        </p>
                    </div>
                )}

                {/* LIVE EPF TRACKER — appears the moment user picks a date */}
                {joiningDate && (
                    <LiveInvestmentTracker
                        mode="recurring"
                        startDate={joiningDate}
                        totalYears={result.years}
                        rate={rate}
                        // Employee share + employer EPF share (12% minus EPS portion), matching the schedule's formula
                        monthlyContribution={basic * (totalEmpPct / 100) + (basic * 0.12 - Math.min(basic * 0.0833, 15000 * 0.0833))}
                        projectedMaturity={result.corpus}
                        label={t('epf.liveTracker', 'Live EPF Tracker')}
                    />
                )}

                {/* SAVE BUTTON */}
                {saved ? (
                    <div className="flex gap-2">
                        <div className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <Check size={16} /> {t('common.saved')}
                        </div>
                        <button onClick={() => navigate('/my-loans')}
                            className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-foreground/10 text-foreground border border-foreground/20 transition-all active:scale-95">
                            {t('common.viewInMyLoans', 'View')}
                        </button>
                        <button onClick={handleRemove}
                            className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 transition-all active:scale-95">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setShowNameDialog(true)} className="w-full py-3.5 rounded-2xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-foreground/10">
                        <Save size={18} /> {t('epf.saveCalculation')}
                    </button>
                )}

                <SaveNameDialog
                    open={showNameDialog}
                    onClose={() => setShowNameDialog(false)}
                    onConfirm={(name) => handleSave(name)}
                    defaultName={suggestedName}
                />



                {/* 3. ADVANCED DETAILS */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-brand-gold/10 rounded-lg text-brand-gold"><Activity size={16} /></div>
                            <span className="text-foreground font-bold text-sm">{t('epf.advancedDetails')}</span>
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
                                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-2">{t('epf.portfolioComposition')}</p>
                                        <div className="h-4 w-full rounded-full flex overflow-hidden bg-brand-green/20">
                                            <div className="h-full bg-foreground transition-all duration-1000" style={{ width: `${result.empPctOfCorpus}%` }} />
                                            <div className="h-full bg-brand-gold transition-all duration-1000" style={{ width: `${result.employerPctOfCorpus}%` }} />
                                            <div className="h-full bg-brand-green transition-all duration-1000" style={{ width: `${result.interestPctOfCorpus}%` }} />
                                        </div>
                                        <div className="flex justify-between mt-2 flex-wrap gap-2">
                                            <p className="text-[10px] font-bold text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full bg-foreground mr-1" /> {t('epf.you')}: {result.empPctOfCorpus.toFixed(1)}%</p>
                                            <p className="text-[10px] font-bold text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full bg-brand-gold mr-1" /> {t('epf.employer')}: {result.employerPctOfCorpus.toFixed(1)}%</p>
                                            <p className="text-[10px] font-bold text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full bg-brand-green mr-1" /> {t('epf.interestLabel')}: {result.interestPctOfCorpus.toFixed(1)}%</p>
                                        </div>
                                    </div>

                                    {/* Real Return & Purchasing Power */}
                                    <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-background to-muted">
                                        <div className="flex justify-between items-center mb-3">
                                             <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{t('epf.inflationAdjuster')}</p>
                                             <div className="flex items-center gap-1.5">
                                                 <span className="text-[10px] font-bold text-muted-foreground">{t('epf.inflPct')}</span>
                                                 <input type="number" step="0.1" value={inflationRate} onChange={e => setInflationRate(Number(e.target.value)||0)} className="w-14 bg-card border border-border rounded px-2 py-0.5 text-xs focus:outline-none" />
                                             </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div className="bg-card p-3 rounded-xl border border-border/50 text-center">
                                                 <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('epf.realReturn')}</p>
                                                 <p className={`font-black text-sm ${result.realReturn > 0 ? 'text-brand-green' : 'text-rose-500'}`}>{result.realReturn.toFixed(2)}%</p>
                                            </div>
                                            <div className="bg-card p-3 rounded-xl border border-border/50 text-center">
                                                 <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('epf.purchasingPower')}</p>
                                                 <p className="text-foreground font-black text-sm">{fmtINR(result.purchasingPower)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Retirement Readiness */}
                                    <div className="p-4 rounded-2xl bg-brand-purple/5 border border-brand-purple/10">
                                         <p className="text-brand-purple/80 text-[10px] uppercase font-bold tracking-wider mb-2">{t('epf.retirementReadiness')}</p>
                                         <p className="text-xs text-brand-purple/90 font-medium mb-3">{t('epf.retirementReadinessDesc')}</p>
                                         <div className="flex justify-between items-center bg-background rounded-xl p-3 border border-border/50">
                                             <div>
                                                 <p className="text-[10px] text-muted-foreground uppercase font-bold">{t('epf.targetNeeded')}</p>
                                                 <p className="text-sm font-black text-foreground">{fmtINR(result.targetCorpus)}</p>
                                             </div>
                                             <div className="text-right">
                                                 <p className="text-[10px] text-muted-foreground uppercase font-bold">{t('epf.achieved')}</p>
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
                            <span className="text-foreground font-bold text-sm">{t('epf.whatIfTitle')}</span>
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
                                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('epf.whatIfHike')}</label>
                                            <div className="relative">
                                                <input type="number" step="0.1" value={whatIfHike} onChange={e => setWhatIfHike(Number(e.target.value)||0)} className={inputCls + " pr-7 border-blue-500/30"} />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('epf.whatIfRetireAge')}</label>
                                            <div className="relative">
                                                <input type="number" value={whatIfRetire} onChange={e => setWhatIfRetire(Number(e.target.value)||0)} className={inputCls} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl border bg-blue-500/5 border-blue-500/20 text-center">
                                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-wider mb-3">{t('epf.revisedOutcome')}</p>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                 <p className="text-blue-600 dark:text-blue-400 text-[10px] font-bold mb-0.5">{t('epf.newCorpus')}</p>
                                                 <p className="text-foreground font-black text-base">{fmtINR(whatIf.simBalance)}</p>
                                            </div>
                                            <div>
                                                 <p className="text-blue-600 dark:text-blue-400 text-[10px] font-bold mb-0.5">{t('epf.extraWealth')}</p>
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
                            <span className="text-foreground font-bold text-sm">{t('epf.yearlySchedule')}</span>
                        </div>
                        {showTable ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showTable && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 pt-1">
                                    <div className="rounded-2xl overflow-hidden border border-border mt-2">
                                        <div className="grid grid-cols-3 bg-muted px-3 py-2.5">
                                            {[t('epf.age'), t('epf.contribs'), t('epf.endBalance')].map(h => (<p key={h} className="text-muted-foreground text-[10px] font-black uppercase tracking-wider">{h}</p>))}
                                        </div>
                                        <div className="divide-y divide-border/50">
                                            {result.schedule.slice((page - 1) * 10, page * 10).map((row) => (
                                                <div key={row.year} className="grid grid-cols-3 px-3 py-3 bg-background items-center">
                                                    <p className="text-foreground text-xs font-bold">{row.age} {t('epf.yrs')}</p>
                                                    <div>
                                                        <p className="text-muted-foreground text-[10px] font-mono leading-tight">+{fmtINR(row.empContrib + row.emplerContrib)}</p>
                                                        <p className="text-brand-green text-[9px] font-mono leading-tight">+{fmtINR(row.interest)} {t('epf.int')}</p>
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
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('epf.page')} {page} {t('epf.of')} {Math.ceil(result.schedule.length / 10)}</p>
                                                <button disabled={page === Math.ceil(result.schedule.length / 10)} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded bg-background border border-border disabled:opacity-50 text-foreground transition-opacity">
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-center text-[9px] text-muted-foreground mt-3 uppercase tracking-widest font-bold">{t('epf.standardSplit')}</p>
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
                        <FileText size={20} /> {t('epf.exportReport')}
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-brand-green/5 border border-brand-green/20 text-brand-green font-bold text-xs transition-colors hover:bg-brand-green/10 active:scale-95"
                    >
                        <FileText size={20} /> {t('epf.excelData')}
                    </button>
                </div>
            </div>

            <DisclaimerComponent module="epf" />
        </div>
    );
}
