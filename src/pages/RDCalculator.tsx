import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function RDCalculator() {
    const navigate = useNavigate();
    useEffect(() => { AnalyticsService.trackScreen('RD_Calculator'); }, []);

    const [monthly, setMonthly] = useState(5000);
    const [rate, setRate] = useState(6.7);
    const [months, setMonths] = useState(12);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const result = useMemo(() => {
        // RBI standard: quarterly compounding
        // M = R × [(1 + r/4)^(4n) − 1] / [1 − (1 + r/4)^(−1/3)]
        // Simple approximation used by most banks: Maturity = Σ R × (1 + r/4)^(remaining_quarters)
        const r = rate / 400; // quarterly rate
        let maturity = 0;
        const schedule: { month: number; deposit: number; interestEarned: number; cumInterest: number; balance: number }[] = [];
        let runningBalance = 0;
        let cumulativeInterest = 0;

        for (let i = 1; i <= months; i++) {
            // Each installment grows with remaining quarters
            const remainingQuarters = (months - i + 1) / 3;
            const installmentGrowth = monthly * Math.pow(1 + r, remainingQuarters);
            maturity += installmentGrowth;

            runningBalance = 0;
            for (let j = 1; j <= i; j++) {
                runningBalance += monthly * Math.pow(1 + r, (i - j + 1) / 3);
            }
            const interestEarned = runningBalance - monthly * i;
            cumulativeInterest = interestEarned;

            schedule.push({
                month: i,
                deposit: monthly,
                interestEarned: Math.max(0, interestEarned - (schedule[i - 2]?.cumInterest ?? 0)),
                cumInterest: Math.max(0, interestEarned),
                balance: runningBalance
            });
        }

        const invested = monthly * months;
        const totalInterest = maturity - invested;
        // Effective Annual Yield
        const effectiveYield = (Math.pow(1 + rate / 400, 4) - 1) * 100;

        return { maturity, invested, totalInterest, effectiveYield, schedule };
    }, [monthly, rate, months]);

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base font-semibold focus:outline-none focus:border-brand-blue";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Recurring Deposit</h1>
                        <p className="text-muted-foreground text-xs">RD returns calculator</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 pb-28 space-y-4">
                <div className="space-y-3">
                    {[
                        { label: 'Monthly Deposit', val: monthly, set: setMonthly, prefix: '₹' },
                        { label: 'Interest Rate (p.a.)', val: rate, set: setRate, suffix: '%', step: 0.1 },
                        { label: 'Time Period (months)', val: months, set: setMonths, suffix: ' months' },
                    ].map(({ label, val, set, prefix, suffix }) => (
                        <div key={label}>
                            <label className="text-muted-foreground text-xs font-medium mb-1 block">{label}</label>
                            <div className="relative">
                                {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{prefix}</span>}
                                <input type="number" value={val} onChange={e => set(Number(e.target.value) || 0)}
                                    className={inputCls + (prefix ? ' pl-8' : '') + (suffix ? ' pr-20' : '')} />
                                {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{suffix}</span>}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-brand-blue/20 to-blue-500/10 border border-brand-blue/30 p-5">
                    <p className="text-muted-foreground text-xs font-medium mb-1">Maturity Amount</p>
                    <p className="text-foreground font-bold text-3xl">{fmtINR(result.maturity)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-muted-foreground text-[11px]">Total Invested</p>
                            <p className="text-foreground font-bold text-base">{fmtINR(result.invested)}</p>
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

                                    <div className="p-3 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-between">
                                        <p className="text-brand-blue text-xs font-semibold">Effective Annual Yield</p>
                                        <p className="text-brand-blue font-bold text-lg">{result.effectiveYield.toFixed(2)}%</p>
                                    </div>

                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                        <p className="text-amber-500 text-[11px] font-semibold">📋 Quarterly Compounding (RBI Standard)</p>
                                        <p className="text-muted-foreground text-[10px] mt-0.5 leading-relaxed">
                                            Interest is compounded quarterly as mandated by RBI for all bank RDs.
                                            The effective yield ({result.effectiveYield.toFixed(2)}%) is higher than the nominal rate ({rate}%).
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Month-by-Month Schedule</p>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-4 bg-muted px-3 py-2">
                                                {['Mo', 'Deposit', 'Int.', 'Balance'].map(h => (
                                                    <p key={h} className="text-muted-foreground text-[9px] font-bold uppercase">{h}</p>
                                                ))}
                                            </div>
                                            {result.schedule.map((row, i) => (
                                                <div key={row.month} className={`grid grid-cols-4 px-3 py-2 ${i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                    <p className="text-foreground text-[10px] font-medium">{row.month}</p>
                                                    <p className="text-foreground text-[10px]">{fmtINR(row.deposit)}</p>
                                                    <p className="text-brand-green text-[10px]">+{fmtINR(row.cumInterest)}</p>
                                                    <p className="text-foreground text-[10px] font-semibold">{fmtINR(row.balance)}</p>
                                                </div>
                                            ))}
                                        </div>
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
