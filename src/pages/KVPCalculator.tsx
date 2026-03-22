import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';

const fmtINR = (v: number) => formatINR(Math.round(v));

// Current KVP rate: 7.5% p.a. → doubles in 115 months
// Premature encashment is allowed after 2.5 years (30 months)
const PREMATURE_LOCK = 30;

export default function KVPCalculator() {
    const navigate = useNavigate();
    useEffect(() => { AnalyticsService.trackScreen('KVP_Calculator'); }, []);

    const [investment, setInvestment] = useState(50000);
    const [rate, setRate] = useState(7.5);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const result = useMemo(() => {
        // Doubling period in months (Rule of 72 variant for months)
        const monthlyRate = rate / 12 / 100;
        const doublingMonths = Math.round(Math.log(2) / Math.log(1 + monthlyRate));
        const maturity = investment * 2;

        // Value at every 6-month interval up to doubling
        const intervals: { months: number; value: number }[] = [];
        for (let m = 6; m <= doublingMonths + 6; m += 6) {
            intervals.push({ months: m, value: investment * Math.pow(1 + monthlyRate, m) });
        }

        // Premature encashment values (after lock-in)
        const premature: { months: number; value: number; penalty: string }[] = [];
        for (let m = PREMATURE_LOCK; m < doublingMonths; m += 6) {
            const fv = investment * Math.pow(1 + monthlyRate, m);
            const y = Math.floor(m / 12);
            const mo = m % 12;
            premature.push({ months: m, value: fv, penalty: m < 36 ? '1% penalty' : 'No penalty' });
        }

        // Effective monthly return
        const effectiveMonthlyReturn = monthlyRate * 100;

        return { maturity, doublingMonths, intervals, premature, effectiveMonthlyReturn };
    }, [investment, rate]);

    const doublingYears = Math.floor(result.doublingMonths / 12);
    const doublingMonthsRem = result.doublingMonths % 12;
    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base font-semibold focus:outline-none focus:border-brand-green";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">KVP Calculator</h1>
                        <p className="text-muted-foreground text-xs">Kisan Vikas Patra</p>
                    </div>
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
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                            <Info size={16} className="text-brand-green" />
                            <span className="text-foreground font-semibold text-sm">Advanced Details</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </button>
                    <AnimatePresence initial={false}>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                <div className="px-4 pb-4 space-y-4">
                                    <div className="h-px bg-border" />

                                    {/* Doubling verification + monthly return */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-xl bg-brand-green/10 border border-brand-green/20 text-center">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Doubling Period</p>
                                            <p className="text-brand-green font-bold text-lg">{doublingYears}y {doublingMonthsRem}m</p>
                                            <p className="text-muted-foreground text-[10px]">{result.doublingMonths} months</p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Monthly Return</p>
                                            <p className="text-blue-400 font-bold text-lg">{result.effectiveMonthlyReturn.toFixed(3)}%</p>
                                            <p className="text-muted-foreground text-[10px]">≈ {fmtINR(investment * result.effectiveMonthlyReturn / 100)}/mo</p>
                                        </div>
                                    </div>

                                    {/* 6-month interval table */}
                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Value at Every 6 Months</p>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-3 bg-muted px-3 py-2">
                                                {['Period', 'Months', 'Value'].map(h => (
                                                    <p key={h} className="text-muted-foreground text-[10px] font-bold uppercase">{h}</p>
                                                ))}
                                            </div>
                                            {result.intervals.map((row, i) => (
                                                <div key={row.months} className={`grid grid-cols-3 px-3 py-2 ${i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                    <p className="text-foreground text-[10px] font-medium">{Math.floor(row.months / 12)}y {row.months % 12 ? (row.months % 12) + 'm' : ''}</p>
                                                    <p className="text-foreground text-[10px]">{row.months}</p>
                                                    <p className="text-brand-green text-[10px] font-semibold">{fmtINR(row.value)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Premature encashment */}
                                    {result.premature.length > 0 && (
                                        <div>
                                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Premature Encashment (after 2.5 years)</p>
                                            <div className="rounded-xl overflow-hidden border border-border">
                                                <div className="grid grid-cols-3 bg-muted px-3 py-2">
                                                    {['Months', 'Value', 'Penalty'].map(h => (
                                                        <p key={h} className="text-muted-foreground text-[10px] font-bold uppercase">{h}</p>
                                                    ))}
                                                </div>
                                                {result.premature.map((row, i) => (
                                                    <div key={row.months} className={`grid grid-cols-3 px-3 py-2 ${i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                        <p className="text-foreground text-[10px]">{row.months}m</p>
                                                        <p className="text-foreground text-[10px] font-semibold">{fmtINR(row.value)}</p>
                                                        <p className={`text-[10px] ${row.penalty === 'No penalty' ? 'text-brand-green' : 'text-amber-500'}`}>{row.penalty}</p>
                                                    </div>
                                                ))}
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
