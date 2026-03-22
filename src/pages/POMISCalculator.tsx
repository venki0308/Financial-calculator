import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';

const fmtINR = (v: number) => formatINR(Math.round(v));
const MONTHS_PER_YEAR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const LOCK_IN_YEARS = 5;

export default function POMISCalculator() {
    const navigate = useNavigate();
    useEffect(() => { AnalyticsService.trackScreen('POMIS_Calculator'); }, []);

    const [investment, setInvestment] = useState(450000);
    const [rate, setRate] = useState(7.4);
    const [isJoint, setIsJoint] = useState(false);
    const [reinvestRate, setReinvestRate] = useState(7.1); // e.g. reinvesting in MIS again / RD
    const [showAdvanced, setShowAdvanced] = useState(false);

    const maxLimit = isJoint ? 1500000 : 900000;

    const result = useMemo(() => {
        const clampedInvestment = Math.min(investment, maxLimit);
        const monthlyIncome = (clampedInvestment * rate / 100) / 12;
        const totalMonths = LOCK_IN_YEARS * 12;
        const totalInterest = monthlyIncome * totalMonths;

        // Month-by-month (constant payout scheme)
        const schedule: { month: number; payout: number; cumulative: number }[] = [];
        for (let m = 1; m <= totalMonths; m++) {
            schedule.push({ month: m, payout: monthlyIncome, cumulative: monthlyIncome * m });
        }

        // Annual summary
        const annualSummary: { year: number; payout: number }[] = [];
        for (let y = 1; y <= LOCK_IN_YEARS; y++) {
            annualSummary.push({ year: y, payout: monthlyIncome * 12 });
        }

        // Reinvestment scenario: if monthly income is re-invested in an RD @ reinvestRate
        // RD maturity = Σ P × (1 + r')^(remaining months) where r' = quarterly rate
        const rq = reinvestRate / 400;
        let reinvestMaturity = 0;
        for (let m = 1; m <= totalMonths; m++) {
            const remaining = totalMonths - m;
            reinvestMaturity += monthlyIncome * Math.pow(1 + rq, remaining / 3);
        }

        return { clampedInvestment, monthlyIncome, totalInterest, schedule, annualSummary, reinvestMaturity };
    }, [investment, rate, isJoint, maxLimit, reinvestRate]);

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base font-semibold focus:outline-none focus:border-brand-blue";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Post Office MIS</h1>
                        <p className="text-muted-foreground text-xs">Monthly Income Scheme</p>
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

                                    {/* Annual summary */}
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
                                                    <p className="text-foreground text-[10px]">{fmtINR(row.payout * row.year)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Reinvestment scenario */}
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                                        <p className="text-amber-500 text-xs font-semibold">Reinvestment Scenario (RD @ rate)</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs">Park monthly payout in RD @</span>
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
                                                <p className="text-muted-foreground text-[10px]">Reinvested Maturity</p>
                                                <p className="text-amber-500 font-bold text-sm">{fmtINR(result.reinvestMaturity)}</p>
                                            </div>
                                        </div>
                                        <p className="text-muted-foreground text-[10px]">
                                            Extra gain from re-investing: {fmtINR(Math.max(0, result.reinvestMaturity - result.totalInterest))}
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-xl bg-muted">
                                        <p className="text-muted-foreground text-[10px] leading-relaxed">
                                            💡 MIS interest is taxable as income. No TDS but must be declared in ITR.
                                            Principal is returned at maturity without any deduction.
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
