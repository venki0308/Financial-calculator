import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {ArrowLeft, ChevronDown, ChevronUp, Activity, BrainCircuit, FileText, Share2, HelpCircle, AlertCircle, Settings, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService, CrashlyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF } from '../utils/exportUtils';
import { nativeShare } from '../utils/nativeShare';
import DisclaimerComponent from '../components/DisclaimerComponent';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function HRACalculator() {
    const navigate = useNavigate();

    useEffect(() => { AnalyticsService.trackScreen('HRA_Calculator'); }, []);

    // 1. STATE & TOGGLES
    const [taxRegime, setTaxRegime] = useState<'old' | 'new'>('old');
    const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('annual');
    
    // Core Inputs
    const [basic, setBasic] = useState(40000);
    const [da, setDa] = useState(0); 
    const [hra, setHra] = useState(20000);
    const [rent, setRent] = useState(15000);
    const [isMetro, setIsMetro] = useState(true);
    
    // Tax Engine Inputs
    const [taxSlab, setTaxSlab] = useState<number>(30); 

    // What-If Simulator Sliders (Overrides)
    const [simRent, setSimRent] = useState(rent);
    const [simBasic, setSimBasic] = useState(basic);
    useEffect(() => { setSimRent(rent); setSimBasic(basic); }, [rent, basic]); 

    // UI Sections
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showWhatIf, setShowWhatIf] = useState(false);
    const [showDocs, setShowDocs] = useState(false);

    // 2. CORE CALCULATION ENGINE
    const computeHRA = (b: number, d: number, h: number, r: number, metro: boolean, regime: 'old' | 'new') => {
        try {
            const annualBasicDA = (b + d) * 12;
            const annualHRA = h * 12;
            const annualRent = r * 12;

            const opt1 = annualHRA;                                               // Condition 1
            const opt2 = metro ? annualBasicDA * 0.5 : annualBasicDA * 0.4;       // Condition 2
            const opt3 = Math.max(0, annualRent - (annualBasicDA * 0.1));         // Condition 3

            let exempt = 0;
            if (regime === 'old') {
                exempt = Math.min(opt1, opt2, opt3);
            }

            const taxable = Math.max(0, annualHRA - exempt);
            const minIdx = regime === 'old' ? [opt1, opt2, opt3].indexOf(Math.min(opt1, opt2, opt3)) : -1;

            return { annualBasicDA, annualHRA, annualRent, opt1, opt2, opt3, exempt, taxable, minIdx };
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            CrashlyticsService.logError(error, 'HRA_Calculator_compute');
            // Return safe zero-state so the UI doesn't crash
            return { annualBasicDA: 0, annualHRA: 0, annualRent: 0, opt1: 0, opt2: 0, opt3: 0, exempt: 0, taxable: 0, minIdx: -1 };
        }
    };

    const actualResult = useMemo(() => computeHRA(basic, da, hra, rent, isMetro, taxRegime), [basic, da, hra, rent, isMetro, taxRegime]);
    const simResult = useMemo(() => computeHRA(simBasic, da, hra, simRent, isMetro, taxRegime), [simBasic, da, hra, simRent, isMetro, taxRegime]);

    // 3. TAX IMPACT CALCULATION
    const actualTaxSaved = actualResult.exempt * (taxSlab / 100);
    const simTaxSaved = simResult.exempt * (taxSlab / 100);
    const taxDiff = simTaxSaved - actualTaxSaved;

    // 4. SMART INSIGHTS ENGINE
    const getInsight = () => {
        if (taxRegime === 'new') return { msg: "Switch to Old Regime to claim HRA benefits.", type: 'warn' };
        if (actualResult.exempt === 0) return { msg: "You have zero HRA exemption. Increase your rent above 10% of Basic+DA.", type: 'warn' };
        
        switch (actualResult.minIdx) {
            case 0: return { msg: "Your HRA received is the limiting factor. You are maximizing your exemption based on your current salary structure.", type: 'success' };
            case 1: return { msg: `Your salary structure (${isMetro ? '50%' : '40%'} of Basic+DA) limits your exemption.`, type: 'info' };
            case 2: return { msg: "Your HRA benefit is limited by your rent. Increasing your rent will directly increase your tax exemption (up to your actual HRA).", type: 'warn' };
            default: return { msg: "Optimize your salary components to maximize tax benefits.", type: 'info' };
        }
    };
    const insight = getInsight();

    // 5. VIEW TOGGLE MULTIPLIER
    const mult = viewMode === 'annual' ? 1 : (1 / 12);
    const periodLabel = viewMode === 'annual' ? 'Annual' : 'Monthly';

    // 6. EXPORT PDF
    const handleDownloadPDF = async () => {
        const headers = ['Parameter', 'Value'];
        const data: (string | number)[][] = [
            ['Tax Regime', taxRegime === 'old' ? 'Old Regime' : 'New Regime'],
            ['City Type', isMetro ? 'Metro (50% rule)' : 'Non-Metro (40% rule)'],
            ['Basic Salary (Annual)', fmtINR(basic * 12)],
            ['Dearness Allowance (Annual)', fmtINR(da * 12)],
            ['HRA Received (Annual)', fmtINR(hra * 12)],
            ['Rent Paid (Annual)', fmtINR(rent * 12)],
            ['--- Calculation Breakdown ---', ''],
            ['Condition 1: Actual HRA Received', fmtINR(actualResult.opt1)],
            [`Condition 2: ${isMetro ? '50%' : '40%'} of Salary`, fmtINR(actualResult.opt2)],
            ['Condition 3: Rent - 10% of Salary', fmtINR(actualResult.opt3)],
            ['--- Final Exemption Summary ---', ''],
            ['Exempted HRA (Annual)', fmtINR(actualResult.exempt)],
            ['Taxable HRA (Annual)', fmtINR(actualResult.taxable)],
            ['--- Tax Impact ---', ''],
            ['Tax Slab', `${taxSlab}%`],
            ['Estimated Tax Saved (Annual)', fmtINR(actualTaxSaved)],
            ['--- Smart Insights ---', ''],
            ['Insight', insight.msg],
            ['--- Required Documents ---', ''],
            ['1. Rent Receipts', 'Signed by landlord'],
            ['2. Rental Agreement', 'Registered agreement'],
            ['3. Landlord PAN', 'If rent > 1L/year'],
            ['4. Payment Proof', 'Bank statement/UPI'],
        ];

        await exportToPDF('HRA Tax Optimization Report', headers, data, 'HRA_Calculator_Report');
    };

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm font-semibold focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border hover:bg-muted active:scale-95 transition-all">
                            <ArrowLeft size={18} className="text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-foreground leading-tight">Smart Tax Advisor</h1>
                            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">HRA Calculator</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => nativeShare("HRA Tax Savings", `I saved ${fmtINR(actualTaxSaved)} in taxes with my HRA! Check FinCalix.`)} className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:bg-muted active:scale-95 transition-all">
                            <Share2 size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 pb-28 space-y-6">

                {/* --- 1. TAX REGIME AWARENESS --- */}
                <div className="bg-muted p-1 rounded-xl flex items-center">
                    {(['old', 'new'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setTaxRegime(mode)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${taxRegime === mode ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {mode === 'old' ? 'Old Regime' : 'New Regime'}
                        </button>
                    ))}
                </div>

                <AnimatePresence>
                    {taxRegime === 'new' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex gap-3 mb-2">
                                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-red-500 text-xs font-bold">HRA Exemption is N/A</p>
                                    <p className="text-red-500/80 text-[10px] mt-1 leading-relaxed">
                                        Under the New Tax Regime, you cannot claim House Rent Allowance exemptions. Your entire HRA will be fully taxable.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- 2. SALARY STRUCTURE INPUTS --- */}
                <div className={`space-y-4 ${taxRegime === 'new' ? 'opacity-50 pointer-events-none grayscale' : ''} transition-opacity duration-300`}>
                    
                    {/* View Toggle */}
                    <div className="flex justify-between items-center bg-card border border-border p-1.5 rounded-xl">
                        {(['monthly', 'annual'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-lg transition-all ${viewMode === mode ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 flex items-center gap-1">Basic Salary <HelpCircle size={10} /></label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                                <input type="number" value={viewMode==='monthly'?basic:basic*12} onChange={e => setBasic(viewMode==='monthly' ? Number(e.target.value)||0 : (Number(e.target.value)||0)/12)} className={inputCls + " pl-7"} />
                            </div>
                        </div>
                        <div>
                            <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 flex items-center gap-1">DA (Optional) <HelpCircle size={10} /></label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                                <input type="number" value={viewMode==='monthly'?da:da*12} onChange={e => setDa(viewMode==='monthly' ? Number(e.target.value)||0 : (Number(e.target.value)||0)/12)} className={inputCls + " pl-7"} placeholder="0" />
                            </div>
                        </div>
                    </div>

                    <p className="text-[9px] text-muted-foreground leading-tight -mt-2">
                        * DA (Dearness Allowance) is considered only if it forms part of retirement benefits. Formula: Salary = Basic + DA.
                    </p>

                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">HRA Received {viewMode==='monthly' ? '(Monthly)':'(Annual)'}</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={viewMode==='monthly'?hra:hra*12} onChange={e => setHra(viewMode==='monthly' ? Number(e.target.value)||0 : (Number(e.target.value)||0)/12)} className={inputCls + " pl-7"} />
                        </div>
                    </div>

                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">Rent Paid {viewMode==='monthly' ? '(Monthly)':'(Annual)'}</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={viewMode==='monthly'?rent:rent*12} onChange={e => setRent(viewMode==='monthly' ? Number(e.target.value)||0 : (Number(e.target.value)||0)/12)} className={inputCls + " pl-7"} />
                        </div>
                    </div>

                    {/* Metro toggle */}
                    <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                        <div>
                            <p className="text-foreground font-bold text-xs uppercase tracking-wider mb-0.5">Metro City Residence</p>
                            <p className="text-muted-foreground text-[10px]">Delhi, Mumbai, Chennai, Kolkata (50% rule)</p>
                        </div>
                        <button onClick={() => setIsMetro(p => !p)} className={`w-12 h-7 rounded-full p-0.5 transition-colors ${isMetro ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                            <motion.div layout className={`w-6 h-6 rounded-full bg-white shadow ${isMetro ? 'ml-auto' : 'ml-0'}`} />
                        </button>
                    </div>
                </div>

                {/* --- 8. RESULTS DASHBOARD --- */}
                <div className={`rounded-[24px] overflow-hidden border ${actualResult.exempt > 0 ? 'bg-gradient-to-br from-brand-green/20 to-emerald-500/10 border-brand-green/30' : 'bg-card border-border'}`}>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                                {periodLabel} Exempted HRA
                            </p>
                            {taxRegime === 'old' && actualResult.exempt > 0 && <span className="bg-brand-green flex items-center gap-1 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"><Activity size={10}/> Applied</span>}
                        </div>
                        <p className={`font-black text-4xl tracking-tight mb-4 ${actualResult.exempt > 0 ? 'text-brand-green' : 'text-foreground'}`}>
                            {fmtINR(actualResult.exempt * mult)}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1 bg-background/50 p-3 rounded-xl border border-border/50">
                                <p className="text-muted-foreground text-[10px] uppercase font-bold truncate">Taxable HRA</p>
                                <p className="text-red-500 font-bold text-lg">{fmtINR(actualResult.taxable * mult)}</p>
                            </div>
                            <div className="space-y-1 bg-background/50 p-3 rounded-xl border border-border/50">
                                <p className="text-muted-foreground text-[10px] uppercase font-bold truncate">Total Received</p>
                                <p className="text-foreground font-bold text-lg">{fmtINR(actualResult.annualHRA * mult)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                {taxRegime === 'old' && (
                    <button
                        onClick={handleDownloadPDF}
                        className="w-full py-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center gap-2 transition-colors active:bg-indigo-100 dark:active:bg-indigo-500/20"
                    >
                        <FileText size={18} /> Export PDF Report
                    </button>
                )}

                {/* --- 3. SMART TAX SAVINGS ENGINE --- */}
                {taxRegime === 'old' && (
                    <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-brand-gold/10 text-brand-gold rounded-lg"><Activity size={16} /></div>
                            <p className="text-foreground text-sm font-bold tracking-tight">Tax Impact Engine</p>
                        </div>
                        
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-3">Select Your Tax Slab</p>
                        <div className="flex gap-2 mb-5">
                            {[5, 10, 20, 30].map((slab) => (
                                <button
                                    key={slab}
                                    onClick={() => setTaxSlab(slab)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${taxSlab === slab ? 'bg-brand-gold text-white border-brand-gold shadow-sm' : 'bg-transparent border-border text-muted-foreground hover:bg-muted'}`}
                                >
                                    {slab}%
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                            <div>
                                <p className="text-amber-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Estimated Tax Saved</p>
                                <p className="text-amber-600 font-black text-xl">{fmtINR(actualTaxSaved * mult)} <span className="text-amber-600/60 text-[10px] font-semibold">/{viewMode==='annual'?'year':'mo'}</span></p>
                            </div>
                            <SparklesIcon className="text-amber-500/50 w-10 h-10" />
                        </div>
                    </div>
                )}


                {/* --- 6. OPTIMIZATION INSIGHTS --- */}
                {taxRegime === 'old' && (
                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${insight.type === 'warn' ? 'bg-amber-500/10 border-amber-500/30' : insight.type === 'success' ? 'bg-brand-green/10 border-brand-green/30' : 'bg-primary/10 border-primary/30'}`}>
                        <BrainCircuit size={18} className={`shrink-0 mt-0.5 ${insight.type === 'warn' ? 'text-amber-500' : insight.type === 'success' ? 'text-brand-green' : 'text-primary'}`} />
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${insight.type === 'warn' ? 'text-amber-500' : insight.type === 'success' ? 'text-brand-green' : 'text-primary'}`}>Smart Insight</p>
                            <p className="text-[11px] text-foreground/80 leading-relaxed font-medium">{insight.msg}</p>
                        </div>
                    </div>
                )}


                {/* --- 5. WHAT-IF SIMULATOR --- */}
                {taxRegime === 'old' && (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden">
                        <button onClick={() => setShowWhatIf(p => !p)} className="w-full flex items-center justify-between p-4">
                            <div className="flex items-center gap-2">
                                <div className="p-1 bg-indigo-500/10 rounded text-indigo-500"><Settings size={14} /></div>
                                <span className="text-foreground font-bold text-sm">What-If Simulator</span>
                            </div>
                            {showWhatIf ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                        </button>

                        <AnimatePresence>
                            {showWhatIf && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="px-4 pb-5 space-y-5">
                                        <div className="h-px bg-border -mt-2 mb-2" />
                                        
                                        <p className="text-[10px] text-muted-foreground leading-relaxed -mt-1 mb-4">
                                            Adjust sliders to see how changes in salary or rent impact your tax savings.
                                        </p>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-foreground">Basic Salary</span>
                                                <span className="text-xs font-mono text-primary font-bold">₹{simBasic.toLocaleString('en-IN')}/mo</span>
                                            </div>
                                            <input type="range" min={basic * 0.5} max={basic * 2} step={1000} value={simBasic} onChange={e => setSimBasic(Number(e.target.value))} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-foreground">Rent Paid</span>
                                                <span className="text-xs font-mono text-emerald-500 font-bold">₹{simRent.toLocaleString('en-IN')}/mo</span>
                                            </div>
                                            <input type="range" min={rent * 0.5} max={rent * 2} step={500} value={simRent} onChange={e => setSimRent(Number(e.target.value))} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                        </div>

                                        {/* Sim Output Box */}
                                        <div className="mt-4 p-4 rounded-xl bg-background border border-border flex flex-col gap-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Est. Annual Exemption</span>
                                                <span className="font-black text-sm text-foreground">{fmtINR(simResult.exempt)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Est. Tax Saved ({taxSlab}%)</span>
                                                <span className="font-black text-sm text-amber-500">{fmtINR(simTaxSaved)}/yr</span>
                                            </div>

                                            {taxDiff !== 0 && (
                                                <div className={`mt-2 p-2 rounded justify-center items-center flex gap-1.5 text-[10px] font-bold ${taxDiff > 0 ? 'bg-brand-green/10 text-brand-green' : 'bg-red-500/10 text-red-500'}`}>
                                                    {taxDiff > 0 ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                                    {Math.abs(taxDiff).toLocaleString('en-IN')} {taxDiff > 0 ? 'saved more' : 'lost'} in taxes/year
                                                </div>
                                            )}
                                            {taxDiff === 0 && <div className="mt-2 text-center text-muted-foreground text-[10px]">No change in tax savings.</div>}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}


                {/* --- 4. ADVANCED FORMULA VISUALIZATION --- */}
                {taxRegime === 'old' && (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden">
                        <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-4">
                            <div className="flex items-center gap-2">
                                <div className="p-1 bg-amber-500/10 rounded text-amber-500"><Calculator size={14} /></div>
                                <span className="text-foreground font-bold text-sm">Calculation Breakdown</span>
                            </div>
                            {showAdvanced ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                        </button>

                        <AnimatePresence>
                            {showAdvanced && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="px-4 pb-4 space-y-4">
                                        <div className="h-px bg-border" />

                                        <div>
                                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-3">HRA Exemption is the Least of 3 Conditions (Annualized)</p>
                                            <div className="space-y-2">
                                                {[
                                                    { label: 'Condition 1: Actual HRA Received', value: actualResult.opt1, desc: `${fmtINR(hra)} × 12 months` },
                                                    { label: `Condition 2: ${isMetro ? '50%' : '40%'} of Salary (Basic+DA)`, value: actualResult.opt2, desc: `${isMetro ? '50%' : '40%'} × ${fmtINR(basic+da)} × 12` },
                                                    { label: 'Condition 3: Rent Paid – 10% of Salary', value: actualResult.opt3, desc: `(${fmtINR(rent)} × 12) − (10% of ${fmtINR((basic+da)*12)})` },
                                                ].map((cond, i) => {
                                                    const isMin = i === actualResult.minIdx;
                                                    return (
                                                        <div key={i} className={`p-3 rounded-xl border ${isMin ? 'bg-brand-green/10 border-brand-green/30' : 'bg-background border-border'} transition-colors`}>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <p className={`text-xs font-bold leading-tight ${isMin ? 'text-brand-green' : 'text-foreground'}`}>
                                                                    {cond.label}
                                                                </p>
                                                                <p className={`font-black text-sm font-mono tracking-tight shrink-0 ml-2 ${isMin ? 'text-brand-green' : 'text-foreground'}`}>
                                                                    {fmtINR(cond.value)}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center justify-between mt-1">
                                                                 <p className="text-muted-foreground text-[10px] font-mono select-all bg-muted px-1.5 py-0.5 rounded inline-block">{cond.desc}</p>
                                                                 {isMin && <span className="text-[9px] uppercase tracking-wider font-bold bg-brand-green/20 text-brand-green px-1.5 py-0.5 rounded">✓ Applied Exemption</span>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}


                {/* --- 7. DOCUMENT & COMPLIANCE GUIDE --- */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowDocs(p => !p)} className="w-full flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-blue-500/10 rounded text-blue-500"><FileText size={14} /></div>
                            <span className="text-foreground font-bold text-sm">Required Documents</span>
                        </div>
                        {showDocs ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {showDocs && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 pt-1 space-y-4">
                                    <p className="text-[11px] text-muted-foreground leading-relaxed -mt-1">
                                        To successfully claim your calculated HRA exemption of {fmtINR(actualResult.exempt)} during tax filing or from your employer, keep these ready:
                                    </p>
                                    <ul className="space-y-3">
                                        {[
                                            "Rent Receipts for all paid months (signed by landlord).",
                                            "Registered Rental Agreement (highly recommended).",
                                            "Landlord's PAN Card (Mandatory if Annual Rent > ₹1,00,000).",
                                            "Proof of Payment (Bank transfers or UPI are preferred over cash to avoid tax scrutiny)."
                                        ].map((item, i) => (
                                            <li key={i} className="flex gap-3 text-xs leading-snug">
                                                <div className="shrink-0 w-4 h-4 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center font-bold text-[10px] mt-0.5">✓</div>
                                                <span className="text-foreground/90">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>

            <DisclaimerComponent module="hra" />
        </div>
    );
}

// Decorative graphic for UI richness
function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a4.25 4.25 0 0 1 0-8.16l6.135-1.583a2 2 0 0 0 1.437-1.437l1.582-6.135a4.25 4.25 0 0 1 8.16 0l1.583 6.135a2 2 0 0 0 1.437 1.437l6.135 1.582a4.25 4.25 0 0 1 0 8.16l-6.135 1.583a2 2 0 0 0-1.437 1.437l-1.582 6.135a4.25 4.25 0 0 1-8.16 0zM20 3v4M22 5h-4M4 17v4M6 19H2" />
    </svg>
  );
}
