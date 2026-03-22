import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function HRACalculator() {
    const navigate = useNavigate();
    useEffect(() => { AnalyticsService.trackScreen('HRA_Calculator'); }, []);

    const [basic, setBasic] = useState(40000);
    const [hra, setHra] = useState(20000);
    const [rent, setRent] = useState(15000);
    const [isMetro, setIsMetro] = useState(true);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const result = useMemo(() => {
        const annualBasic = basic * 12;
        const annualHRA = hra * 12;
        const annualRent = rent * 12;

        const opt1 = annualHRA;                                             // Actual HRA received
        const opt2 = isMetro ? annualBasic * 0.5 : annualBasic * 0.4;     // 50%/40% of Basic
        const opt3 = Math.max(0, annualRent - annualBasic * 0.1);          // Rent – 10% Basic

        const exempt = Math.min(opt1, opt2, opt3);
        const taxable = annualHRA - exempt;

        return { opt1, opt2, opt3, exempt, taxable, annualHRA, annualBasic, annualRent };
    }, [basic, hra, rent, isMetro]);

    const minIdx = [result.opt1, result.opt2, result.opt3].indexOf(Math.min(result.opt1, result.opt2, result.opt3));

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base font-semibold focus:outline-none focus:border-brand-gold";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">HRA Calculator</h1>
                        <p className="text-muted-foreground text-xs">House Rent Allowance exemption</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 pb-28 space-y-4">
                {/* Inputs */}
                <div className="space-y-3">
                    {[
                        { label: 'Basic Salary (Monthly)', val: basic, set: setBasic },
                        { label: 'HRA Received (Monthly)', val: hra, set: setHra },
                        { label: 'Rent Paid (Monthly)', val: rent, set: setRent },
                    ].map(({ label, val, set }) => (
                        <div key={label}>
                            <label className="text-muted-foreground text-xs font-medium mb-1 block">{label}</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                                <input type="number" value={val} onChange={e => set(Number(e.target.value) || 0)}
                                    className={inputCls + " pl-8"} />
                            </div>
                        </div>
                    ))}

                    {/* Metro toggle */}
                    <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                        <div>
                            <p className="text-foreground font-medium text-sm">Metro City</p>
                            <p className="text-muted-foreground text-xs">Delhi, Mumbai, Chennai, Kolkata</p>
                        </div>
                        <button onClick={() => setIsMetro(p => !p)}
                            className={`w-12 h-7 rounded-full p-0.5 transition-colors ${isMetro ? 'bg-brand-gold' : 'bg-muted-foreground/30'}`}>
                            <motion.div layout className={`w-6 h-6 rounded-full bg-white shadow ${isMetro ? 'ml-auto' : 'ml-0'}`} />
                        </button>
                    </div>
                </div>

                {/* Result Card */}
                <div className="rounded-2xl bg-gradient-to-br from-brand-gold/20 to-amber-500/10 border border-brand-gold/30 p-5">
                    <p className="text-muted-foreground text-xs font-medium mb-1">Annual Tax Exempted HRA</p>
                    <p className="text-foreground font-bold text-3xl">{fmtINR(result.exempt)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-muted-foreground text-[11px]">Taxable HRA</p>
                            <p className="text-red-400 font-bold text-base">{fmtINR(result.taxable)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[11px]">Monthly Exemption</p>
                            <p className="text-brand-green font-bold text-base">{fmtINR(result.exempt / 12)}</p>
                        </div>
                    </div>
                </div>

                {/* Advanced Details */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <button
                        onClick={() => setShowAdvanced(p => !p)}
                        className="w-full flex items-center justify-between p-4"
                    >
                        <div className="flex items-center gap-2">
                            <Info size={16} className="text-brand-gold" />
                            <span className="text-foreground font-semibold text-sm">Advanced Details</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence initial={false}>
                        {showAdvanced && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-4 space-y-4">
                                    <div className="h-px bg-border" />

                                    {/* Three condition breakdown */}
                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">HRA Exemption — Least of Three Conditions</p>
                                        <div className="space-y-2">
                                            {[
                                                { label: 'Condition 1: Actual HRA Received', value: result.opt1, desc: 'Full annual HRA' },
                                                { label: `Condition 2: ${isMetro ? '50%' : '40%'} of Annual Basic`, value: result.opt2, desc: `${isMetro ? '50%' : '40%'} × ₹${basic.toLocaleString('en-IN')} × 12` },
                                                { label: 'Condition 3: Rent – 10% of Basic', value: result.opt3, desc: `Rent ₹${rent.toLocaleString('en-IN')} × 12 − 10% of Basic` },
                                            ].map((cond, i) => {
                                                const isMin = i === minIdx;
                                                return (
                                                    <div key={i} className={`p-3 rounded-xl border ${isMin ? 'bg-brand-green/10 border-brand-green/30' : 'bg-background border-border'}`}>
                                                        <div className="flex items-center justify-between mb-0.5">
                                                            <p className={`text-xs font-semibold ${isMin ? 'text-brand-green' : 'text-foreground'}`}>
                                                                {cond.label} {isMin && <span className="ml-1 text-[10px] bg-brand-green/20 px-1.5 py-0.5 rounded-full">✓ Minimum</span>}
                                                            </p>
                                                            <p className={`font-bold text-sm ${isMin ? 'text-brand-green' : 'text-foreground'}`}>{fmtINR(cond.value)}</p>
                                                        </div>
                                                        <p className="text-muted-foreground text-[10px]">{cond.desc}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div className="p-3 rounded-xl bg-muted space-y-2">
                                        {[
                                            { label: 'Annual HRA Received', val: result.annualHRA },
                                            { label: 'HRA Exempt (Annual)', val: result.exempt, green: true },
                                            { label: 'Taxable HRA (Annual)', val: result.taxable, red: true },
                                            { label: 'Taxable HRA (Monthly)', val: result.taxable / 12, red: true },
                                        ].map(({ label, val, green, red }) => (
                                            <div key={label} className="flex justify-between text-sm">
                                                <span className="text-muted-foreground text-xs">{label}</span>
                                                <span className={`font-bold text-xs ${green ? 'text-brand-green' : red ? 'text-red-400' : 'text-foreground'}`}>{fmtINR(val)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Note */}
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                        <p className="text-amber-500 text-[11px] font-semibold">📝 Note</p>
                                        <p className="text-muted-foreground text-[10px] mt-0.5 leading-relaxed">
                                            HRA exemption is not available if you opt for the New Tax Regime.
                                            Under the old tax regime, this exempt amount reduces your gross taxable income.
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
