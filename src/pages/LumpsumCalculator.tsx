import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function LumpsumCalculator() {
    const navigate = useNavigate();
    useEffect(() => { AnalyticsService.trackScreen('Lumpsum'); }, []);

    const [principal, setPrincipal] = useState(100000);
    const [rate, setRate] = useState(12);
    const [years, setYears] = useState(10);
    const [inflation, setInflation] = useState(6);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const result = useMemo(() => {
        const fv = principal * Math.pow(1 + rate / 100, years);
        const cagr = rate; // by definition for lumpsum
        const realRate = ((1 + rate / 100) / (1 + inflation / 100) - 1) * 100;
        const realValue = principal * Math.pow(1 + realRate / 100, years);
        const wealthRatio = fv / principal;

        // Year-by-year table
        const table: { year: number; value: number; gain: number }[] = [];
        for (let y = 1; y <= years; y++) {
            const v = principal * Math.pow(1 + rate / 100, y);
            table.push({ year: y, value: v, gain: v - principal });
        }

        return { fv, cagr, realRate, realValue, wealthRatio, table };
    }, [principal, rate, years, inflation]);

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base font-semibold focus:outline-none focus:border-brand-blue";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Lumpsum Calculator</h1>
                        <p className="text-muted-foreground text-xs">One-time investment growth</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 pb-28 space-y-4">
                <div className="space-y-3">
                    {[
                        { label: 'Total Investment', val: principal, set: setPrincipal, prefix: '₹', min: 1000 },
                        { label: 'Expected Return (p.a.)', val: rate, set: setRate, suffix: '%', min: 1, max: 30 },
                        { label: 'Time Period (years)', val: years, set: setYears, suffix: ' yrs', min: 1, max: 40 },
                    ].map(({ label, val, set, prefix, suffix }) => (
                        <div key={label}>
                            <label className="text-muted-foreground text-xs font-medium mb-1 block">{label}</label>
                            <div className="relative">
                                {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{prefix}</span>}
                                <input type="number" value={val} onChange={e => set(Number(e.target.value) || 0)}
                                    className={inputCls + (prefix ? ' pl-8' : '') + (suffix ? ' pr-12' : '')} />
                                {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{suffix}</span>}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Result Card */}
                <div className="rounded-2xl bg-gradient-to-br from-brand-blue/20 to-blue-500/10 border border-brand-blue/30 p-5">
                    <p className="text-muted-foreground text-xs font-medium mb-1">Estimated Maturity Value</p>
                    <p className="text-foreground font-bold text-3xl">{fmtINR(result.fv)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-muted-foreground text-[11px]">Total Invested</p>
                            <p className="text-foreground font-bold text-base">{fmtINR(principal)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[11px]">Wealth Gained</p>
                            <p className="text-brand-green font-bold text-base">{fmtINR(result.fv - principal)}</p>
                        </div>
                    </div>
                </div>

                {/* Advanced Details */}
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

                                    {/* CAGR + Real Return */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-center">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1">CAGR</p>
                                            <p className="text-brand-blue font-bold text-xl">{result.cagr.toFixed(2)}%</p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-brand-green/10 border border-brand-green/20 text-center">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Wealth Ratio</p>
                                            <p className="text-brand-green font-bold text-xl">{result.wealthRatio.toFixed(2)}x</p>
                                        </div>
                                    </div>

                                    {/* Inflation-adjusted real return */}
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-amber-500 text-xs font-semibold">Inflation-Adjusted Real Return</p>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-muted-foreground text-xs">Inflation Rate:</span>
                                            <input type="number" value={inflation} onChange={e => setInflation(Number(e.target.value) || 0)}
                                                className="w-16 text-center py-1 rounded-lg bg-card border border-border text-foreground text-sm font-bold focus:outline-none focus:border-amber-500" />
                                            <span className="text-muted-foreground text-xs">%</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-muted-foreground text-[10px]">Real Return Rate</p>
                                                <p className="text-amber-500 font-bold">{result.realRate.toFixed(2)}% p.a.</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-[10px]">Inflation-adj. Value</p>
                                                <p className="text-amber-500 font-bold">{fmtINR(result.realValue)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Year-by-year table */}
                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Year-by-Year Growth</p>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-3 bg-muted px-3 py-2">
                                                {['Year', 'Value', 'Gain'].map(h => (
                                                    <p key={h} className="text-muted-foreground text-[10px] font-bold uppercase">{h}</p>
                                                ))}
                                            </div>
                                            {result.table.map((row, i) => (
                                                <div key={row.year} className={`grid grid-cols-3 px-3 py-2 ${i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                    <p className="text-foreground text-xs font-medium">Year {row.year}</p>
                                                    <p className="text-foreground text-xs font-semibold">{fmtINR(row.value)}</p>
                                                    <p className="text-brand-green text-xs font-semibold">+{fmtINR(row.gain)}</p>
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
