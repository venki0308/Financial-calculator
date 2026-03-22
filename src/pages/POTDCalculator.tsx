import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';

const fmtINR = (v: number) => formatINR(Math.round(v));

// Current Post Office TD Rates (FY 2025-26)
const TD_RATES: Record<string, number> = {
    '1': 6.9,
    '2': 7.0,
    '3': 7.1,
    '5': 7.5, // 5-year TD is eligible for 80C
};

export default function POTDCalculator() {
    const navigate = useNavigate();
    useEffect(() => { AnalyticsService.trackScreen('POTD_Calculator'); }, []);

    const [investment, setInvestment] = useState(100000);
    const [years, setYears] = useState<'1' | '2' | '3' | '5'>('5');
    const [taxRate, setTaxRate] = useState(20);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const rate = TD_RATES[years];

    const result = useMemo(() => {
        const yr = Number(years);
        // Quarterly compounding, payable annually
        const r = rate / 400;
        const maturity = investment * Math.pow(1 + r, 4 * yr);
        const totalInterest = maturity - investment;
        const effectiveYield = (Math.pow(1 + r, 4) - 1) * 100;

        // Year-by-year table
        const table: { year: number; openBal: number; interest: number; closeBal: number }[] = [];
        let bal = investment;
        for (let y = 1; y <= yr; y++) {
            const close = bal * Math.pow(1 + r, 4);
            const interest = close - bal;
            table.push({ year: y, openBal: bal, interest, closeBal: close });
            bal = close;
        }

        // Comparison: All tenures for same amount
        const comparison = Object.entries(TD_RATES).map(([y, rt]) => ({
            tenure: y,
            maturity: investment * Math.pow(1 + rt / 400, 4 * Number(y)),
        }));

        // Post-tax for 5-year only (80C eligible)
        const is5Year = years === '5';
        const sec80cSaving = is5Year ? Math.min(investment, 150000) * (taxRate / 100) : 0;
        const taxOnInterest = totalInterest * (taxRate / 100);
        const postTaxMaturity = maturity - taxOnInterest + sec80cSaving;

        return { maturity, totalInterest, effectiveYield, table, comparison, is5Year, sec80cSaving, taxOnInterest, postTaxMaturity };
    }, [investment, years, rate, taxRate]);

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base font-semibold focus:outline-none focus:border-brand-blue";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Post Office TD</h1>
                        <p className="text-muted-foreground text-xs">Time Deposit (Fixed Deposit)</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 pb-28 space-y-4">
                {/* Tenure selector */}
                <div>
                    <label className="text-muted-foreground text-xs font-medium mb-2 block">Tenure</label>
                    <div className="grid grid-cols-4 gap-2">
                        {(['1', '2', '3', '5'] as const).map(y => (
                            <button
                                key={y}
                                onClick={() => setYears(y)}
                                className={`py-2.5 rounded-xl font-semibold text-sm transition-colors border ${years === y ? 'bg-brand-blue text-white border-brand-blue' : 'bg-card text-foreground border-border hover:border-brand-blue/50'}`}
                            >
                                {y}Y
                                <p className="text-[9px] font-normal opacity-80">{TD_RATES[y]}%</p>
                            </button>
                        ))}
                    </div>
                    {years === '5' && (
                        <p className="text-brand-green text-[10px] mt-1.5 font-semibold">✓ 5-Year TD is eligible for Section 80C deduction</p>
                    )}
                </div>

                <div>
                    <label className="text-muted-foreground text-xs font-medium mb-1 block">Investment Amount</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                        <input type="number" value={investment} onChange={e => setInvestment(Number(e.target.value) || 0)} className={inputCls + " pl-8"} />
                    </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-brand-blue/20 to-blue-500/10 border border-brand-blue/30 p-5">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-muted-foreground text-xs font-medium">Maturity Amount ({years} years @ {rate}%)</p>
                    </div>
                    <p className="text-foreground font-bold text-3xl">{fmtINR(result.maturity)}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                        <div>
                            <p className="text-muted-foreground text-[10px]">Total Invested</p>
                            <p className="text-foreground font-bold text-sm">{fmtINR(investment)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[10px]">Interest Earned</p>
                            <p className="text-brand-green font-bold text-sm">{fmtINR(result.totalInterest)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[10px]">Eff. Yield</p>
                            <p className="text-brand-blue font-bold text-sm">{result.effectiveYield.toFixed(2)}%</p>
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

                                    {/* Year-by-year growth */}
                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Year-by-Year Growth</p>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-4 bg-muted px-3 py-2">
                                                {['Year', 'Open.', 'Int.', 'Close'].map(h => (
                                                    <p key={h} className="text-muted-foreground text-[9px] font-bold uppercase">{h}</p>
                                                ))}
                                            </div>
                                            {result.table.map((row, i) => (
                                                <div key={row.year} className={`grid grid-cols-4 px-3 py-2 ${i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                    <p className="text-foreground text-[10px] font-medium">Year {row.year}</p>
                                                    <p className="text-foreground text-[10px]">{fmtINR(row.openBal)}</p>
                                                    <p className="text-brand-green text-[10px]">+{fmtINR(row.interest)}</p>
                                                    <p className="text-foreground text-[10px] font-semibold">{fmtINR(row.closeBal)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Tenure Comparison */}
                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Tenure Comparison (Same Amount)</p>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-3 bg-muted px-3 py-2">
                                                {['Tenure', 'Rate', 'Maturity'].map(h => (
                                                    <p key={h} className="text-muted-foreground text-[10px] font-bold uppercase">{h}</p>
                                                ))}
                                            </div>
                                            {result.comparison.map((row, i) => {
                                                const isSelected = row.tenure === years;
                                                return (
                                                    <div key={row.tenure} className={`grid grid-cols-3 px-3 py-2 ${isSelected ? 'bg-brand-blue/10' : i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                        <p className={`text-[10px] font-medium ${isSelected ? 'text-brand-blue' : 'text-foreground'}`}>{row.tenure} Year{Number(row.tenure) > 1 ? 's' : ''}</p>
                                                        <p className="text-foreground text-[10px]">{TD_RATES[row.tenure]}%</p>
                                                        <p className={`text-[10px] font-semibold ${isSelected ? 'text-brand-blue' : 'text-foreground'}`}>{fmtINR(row.maturity)}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 80C + post-tax (5 year only) */}
                                    {result.is5Year && (
                                        <div className="p-3 rounded-xl bg-brand-green/10 border border-brand-green/20 space-y-2">
                                            <p className="text-brand-green text-xs font-semibold">Section 80C Benefit (5-Year TD only)</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground text-xs">Your Tax Rate:</span>
                                                <input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value) || 0)}
                                                    className="w-14 py-1 text-center rounded-lg bg-card border border-border text-foreground text-sm font-bold focus:outline-none" />
                                                <span className="text-muted-foreground text-xs">%</span>
                                            </div>
                                            {[
                                                { label: '80C Tax Saving (on investment)', val: result.sec80cSaving, green: true },
                                                { label: 'Tax on Interest', val: result.taxOnInterest, red: true },
                                                { label: 'Net Post-Tax Maturity', val: result.postTaxMaturity, green: true },
                                            ].map(({ label, val, green, red }) => (
                                                <div key={label} className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">{label}</span>
                                                    <span className={`font-bold ${green ? 'text-brand-green' : red ? 'text-red-400' : 'text-foreground'}`}>{fmtINR(val)}</span>
                                                </div>
                                            ))}
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
