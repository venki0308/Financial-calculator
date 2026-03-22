import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';

const fmtINR = (v: number) => formatINR(Math.round(v));
const LOCK_IN = 5;

export default function NSCCalculator() {
    const navigate = useNavigate();
    useEffect(() => { AnalyticsService.trackScreen('NSC_Calculator'); }, []);

    const [investment, setInvestment] = useState(50000);
    const [rate, setRate] = useState(7.7);
    const [taxRate, setTaxRate] = useState(20);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const result = useMemo(() => {
        // NSC: annually compounded, 5-year lock-in
        const maturity = investment * Math.pow(1 + rate / 100, LOCK_IN);
        const totalInterest = maturity - investment;

        // Year-by-year
        const table: { year: number; openBal: number; interest: number; cumInterest: number; closeBal: number }[] = [];
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

        // 80C deduction: only Investment in Year 1; interest is deemed reinvested (taxable in Year 5 as income)
        const sec80cDeduction = Math.min(investment, 150000);
        const taxSaving = sec80cDeduction * (taxRate / 100);

        // Post-tax return (interest in year 5 is taxable)
        const taxOnInterest = totalInterest * (taxRate / 100);
        const postTaxMaturity = maturity - taxOnInterest;
        const postTaxReturn = ((postTaxMaturity / investment) - 1) * 100;

        return { maturity, totalInterest, table, sec80cDeduction, taxSaving, taxOnInterest, postTaxMaturity, postTaxReturn };
    }, [investment, rate, taxRate]);

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base font-semibold focus:outline-none focus:border-brand-gold";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">NSC Calculator</h1>
                        <p className="text-muted-foreground text-xs">National Savings Certificate</p>
                    </div>
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
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                            <Info size={16} className="text-brand-gold" />
                            <span className="text-foreground font-semibold text-sm">Advanced Details</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </button>
                    <AnimatePresence initial={false}>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                <div className="px-4 pb-4 space-y-4">
                                    <div className="h-px bg-border" />

                                    {/* Year-by-year table */}
                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Year-by-Year Growth</p>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-4 bg-muted px-3 py-2">
                                                {['Year', 'Interest', 'Cum. Int.', 'Value'].map(h => (
                                                    <p key={h} className="text-muted-foreground text-[9px] font-bold uppercase">{h}</p>
                                                ))}
                                            </div>
                                            {result.table.map((row, i) => (
                                                <div key={row.year} className={`grid grid-cols-4 px-3 py-2 ${i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                    <p className="text-foreground text-[10px] font-medium">Year {row.year}</p>
                                                    <p className="text-brand-green text-[10px]">+{fmtINR(row.interest)}</p>
                                                    <p className="text-foreground text-[10px]">{fmtINR(row.cumInterest)}</p>
                                                    <p className="text-foreground text-[10px] font-semibold">{fmtINR(row.closeBal)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 80C benefit */}
                                    <div className="p-3 rounded-xl bg-brand-green/10 border border-brand-green/20 space-y-1.5">
                                        <p className="text-brand-green text-xs font-semibold">Section 80C Tax Benefit</p>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Eligible 80C Deduction</span>
                                            <span className="text-foreground font-bold">{fmtINR(result.sec80cDeduction)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs">Your Tax Rate:</span>
                                            <input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value) || 0)}
                                                className="w-14 text-center py-1 rounded-lg bg-card border border-border text-foreground text-sm font-bold focus:outline-none" />
                                            <span className="text-muted-foreground text-xs">%</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Estimated Tax Saving</span>
                                            <span className="text-brand-green font-bold">{fmtINR(result.taxSaving)}</span>
                                        </div>
                                    </div>

                                    {/* Post-tax return */}
                                    <div className="p-3 rounded-xl bg-muted space-y-1.5">
                                        <p className="text-foreground text-xs font-semibold">Post-Tax Effective Return</p>
                                        <p className="text-muted-foreground text-[10px] leading-relaxed">
                                            NSC interest in Year 5 is added to income and taxed at your slab rate.
                                        </p>
                                        {[
                                            { label: 'Gross Maturity', val: result.maturity },
                                            { label: 'Tax on Interest', val: result.taxOnInterest, red: true },
                                            { label: 'Net Maturity (Post-tax)', val: result.postTaxMaturity, green: true },
                                            { label: 'Post-Tax Return', val: null, extra: `${result.postTaxReturn.toFixed(2)}% total` },
                                        ].map(({ label, val, red, green, extra }) => (
                                            <div key={label} className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">{label}</span>
                                                <span className={`font-bold ${green ? 'text-brand-green' : red ? 'text-red-400' : 'text-foreground'}`}>
                                                    {extra || fmtINR(val!)}
                                                </span>
                                            </div>
                                        ))}
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
