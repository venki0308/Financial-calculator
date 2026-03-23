import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Save, Check, Info, FileText, BrainCircuit, Target, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF } from '../utils/exportUtils';
import { useCalculatorStore } from '../store/useCalculatorStore';

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
    const { addSaved } = useCalculatorStore();

    useEffect(() => { AnalyticsService.trackScreen('POTD_Calculator'); }, []);

    const [investment, setInvestment] = useState(100000);
    const [years, setYears] = useState<'1' | '2' | '3' | '5'>('5');
    const [taxRate, setTaxRate] = useState(20);
    const [inflation, setInflation] = useState(6);
    const [fdRate, setFdRate] = useState(7.0);

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [saved, setSaved] = useState(false);

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
            rate: rt,
            maturity: investment * Math.pow(1 + rt / 400, 4 * Number(y)),
            interest: investment * Math.pow(1 + rt / 400, 4 * Number(y)) - investment,
        }));

        // Post-tax for 5-year only (80C eligible)
        const is5Year = years === '5';
        const sec80cSaving = is5Year ? Math.min(investment, 150000) * (taxRate / 100) : 0;
        const taxOnInterest = totalInterest * (taxRate / 100);
        const postTaxMaturity = maturity - taxOnInterest + sec80cSaving;
        const postTaxCAGR = ((Math.pow(postTaxMaturity / investment, 1 / yr) - 1) * 100);

        // Inflation-adjusted real maturity
        const realMaturity = maturity / Math.pow(1 + inflation / 100, yr);
        const realReturn = ((realMaturity / investment - 1) / yr) * 100;

        // Bank FD comparison (same tenure, quarterly compounding)
        const fdMaturity = investment * Math.pow(1 + fdRate / 400, 4 * yr);
        const fdInterest = fdMaturity - investment;
        const fdPostTaxInterest = fdInterest * (1 - taxRate / 100);
        const fdPostTaxMaturity = investment + fdPostTaxInterest;

        // CAGR
        const cagr = (Math.pow(maturity / investment, 1 / yr) - 1) * 100;

        return {
            maturity, totalInterest, effectiveYield, table, comparison,
            is5Year, sec80cSaving, taxOnInterest, postTaxMaturity, postTaxCAGR,
            realMaturity, realReturn,
            fdMaturity, fdInterest, fdPostTaxInterest, fdPostTaxMaturity,
            cagr
        };
    }, [investment, years, rate, taxRate, inflation, fdRate]);

    const handleSave = () => {
        addSaved({
            id: crypto.randomUUID(),
            calculatorType: 'Post Office TD',
            inputValues: { investment, years, rate },
            resultValues: { primary: result.maturity, totalInterest: result.totalInterest },
            timestamp: Date.now()
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handlePDFExport = () => {
        const headers = ['Parameter', 'Value'];
        const data: (string | number)[][] = [
            ['Investment Amount', fmtINR(investment)],
            ['Tenure', `${years} Year(s)`],
            ['Interest Rate', `${rate}% p.a. (Quarterly Compounding)`],
            ['Maturity Amount', fmtINR(result.maturity)],
            ['Total Interest', fmtINR(result.totalInterest)],
            ['Effective Yield', `${result.effectiveYield.toFixed(2)}%`],
            ['CAGR', `${result.cagr.toFixed(2)}%`],
            ['', ''],
            ['Tax Rate', `${taxRate}%`],
            ['Tax on Interest', fmtINR(result.taxOnInterest)],
            ['80C Saving (5Y only)', fmtINR(result.sec80cSaving)],
            ['Post-Tax Maturity', fmtINR(result.postTaxMaturity)],
            ['', ''],
            ['Inflation', `${inflation}%`],
            ['Real Maturity Value', fmtINR(result.realMaturity)],
        ];

        result.table.forEach(y => {
            data.push([`Year ${y.year}`, `${fmtINR(y.openBal)} → ${fmtINR(y.closeBal)} (+${fmtINR(y.interest)})`]);
        });

        exportToPDF('Post Office TD Report', headers, data, 'POTD_Analysis');
    };

    // Smart Insights
    const insights: string[] = useMemo(() => {
        const yr = Number(years);
        const arr: string[] = [];
        if (result.is5Year) arr.push(`✅ 5-Year TD qualifies for Section 80C deduction up to ₹1.5L. Tax saving: ${fmtINR(result.sec80cSaving)}.`);
        else arr.push(`💡 Only 5-Year TD qualifies for 80C. Current ${years}Y tenure has no tax benefit on investment.`);

        if (result.realReturn < 0) arr.push(`⚠️ Real return after inflation is negative (${result.realReturn.toFixed(1)}% p.a.). Consider higher-return options.`);
        else arr.push(`✅ Real return after ${inflation}% inflation: ${result.realReturn.toFixed(1)}% p.a.`);

        if (result.fdPostTaxMaturity > result.postTaxMaturity) arr.push(`💡 Bank FD at ${fdRate}% gives ${fmtINR(result.fdPostTaxMaturity - result.postTaxMaturity)} more post-tax. But POTD offers sovereign guarantee.`);
        else arr.push(`✅ POTD beats bank FD post-tax by ${fmtINR(result.postTaxMaturity - result.fdPostTaxMaturity)}.`);

        if (yr >= 3) arr.push(`📌 For ${yr}-year lock-in, POTD offers guaranteed ${rate}% with zero credit risk (Government of India backing).`);
        arr.push(`📌 Interest is taxable under "Income from Other Sources." TDS applies if interest > ₹40K/year (₹50K for seniors).`);
        return arr;
    }, [years, result, inflation, fdRate, taxRate, rate]);

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base font-semibold focus:outline-none focus:border-brand-blue";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                            <ArrowLeft size={18} className="text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Post Office TD</h1>
                            <p className="text-muted-foreground text-xs">Time Deposit (Fixed Deposit)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePDFExport} className="p-2 rounded-xl bg-card border border-border" title="Export PDF">
                            <FileText size={16} className="text-brand-blue" />
                        </button>
                        <button onClick={handleSave} className="p-2 rounded-xl bg-card border border-border" title="Save">
                            {saved ? <Check size={16} className="text-brand-green" /> : <Save size={16} className="text-brand-blue" />}
                        </button>
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

                {/* Result Card — UNCHANGED */}
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

                {/* ADVANCED DETAILS */}
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

                                    {/* 1. Year-by-year growth */}
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
                                        <p className="text-muted-foreground text-[10px] mt-1.5">CAGR: <span className="text-foreground font-bold">{result.cagr.toFixed(2)}%</span></p>
                                    </div>

                                    {/* 2. Tenure Comparison */}
                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Tenure Comparison (Same Amount)</p>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-4 bg-muted px-3 py-2">
                                                {['Tenure', 'Rate', 'Interest', 'Maturity'].map(h => (
                                                    <p key={h} className="text-muted-foreground text-[9px] font-bold uppercase">{h}</p>
                                                ))}
                                            </div>
                                            {result.comparison.map((row, i) => {
                                                const isSelected = row.tenure === years;
                                                return (
                                                    <div key={row.tenure} className={`grid grid-cols-4 px-3 py-2 ${isSelected ? 'bg-brand-blue/10' : i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                        <p className={`text-[10px] font-medium ${isSelected ? 'text-brand-blue' : 'text-foreground'}`}>{row.tenure}Y</p>
                                                        <p className="text-foreground text-[10px]">{row.rate}%</p>
                                                        <p className="text-brand-green text-[10px]">{fmtINR(row.interest)}</p>
                                                        <p className={`text-[10px] font-semibold ${isSelected ? 'text-brand-blue' : 'text-foreground'}`}>{fmtINR(row.maturity)}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 3. Tax Impact */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Target size={14} className="text-red-400" />
                                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Tax Impact</p>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-muted-foreground text-xs">Tax Bracket:</span>
                                            <input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value) || 0)}
                                                className="w-14 py-1 text-center rounded-lg bg-card border border-border text-foreground text-sm font-bold focus:outline-none" />
                                            <span className="text-muted-foreground text-xs">%</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { label: 'Tax on Interest', val: fmtINR(result.taxOnInterest), color: 'text-red-400' },
                                                { label: '80C Savings (5Y)', val: fmtINR(result.sec80cSaving), color: 'text-brand-green' },
                                                { label: 'Post-Tax Maturity', val: fmtINR(result.postTaxMaturity), color: 'text-brand-green' },
                                                { label: 'Post-Tax CAGR', val: `${result.postTaxCAGR.toFixed(2)}%`, color: 'text-brand-blue' },
                                            ].map(item => (
                                                <div key={item.label} className="p-2 rounded-lg bg-muted">
                                                    <p className="text-muted-foreground text-[9px] uppercase font-bold">{item.label}</p>
                                                    <p className={`${item.color} font-bold text-sm mt-0.5`}>{item.val}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 4. Bank FD Comparison */}
                                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Activity size={14} className="text-brand-blue" />
                                            <p className="text-brand-blue text-xs font-semibold">Comparison: POTD vs Bank FD ({years}Y)</p>
                                        </div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-muted-foreground text-xs">FD Rate:</span>
                                            <input type="number" value={fdRate} step={0.1} onChange={e => setFdRate(Number(e.target.value) || 0)}
                                                className="w-14 py-1 text-center rounded-lg bg-card border border-border text-foreground text-sm font-bold focus:outline-none" />
                                            <span className="text-muted-foreground text-xs">%</span>
                                        </div>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-3 bg-muted px-3 py-2">
                                                {['', 'POTD', 'Bank FD'].map(h => (
                                                    <p key={h} className="text-muted-foreground text-[9px] font-bold uppercase">{h}</p>
                                                ))}
                                            </div>
                                            {[
                                                { label: 'Rate', potd: `${rate}%`, fd: `${fdRate}%` },
                                                { label: 'Maturity', potd: fmtINR(result.maturity), fd: fmtINR(result.fdMaturity) },
                                                { label: 'Post-Tax Maturity', potd: fmtINR(result.postTaxMaturity), fd: fmtINR(result.fdPostTaxMaturity) },
                                                { label: '80C Benefit', potd: result.is5Year ? '✅ Yes' : '❌ No', fd: result.is5Year ? '✅ Yes*' : '❌ No' },
                                            ].map((row, i) => (
                                                <div key={row.label} className={`grid grid-cols-3 px-3 py-2 ${i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                    <p className="text-muted-foreground text-[10px] font-medium">{row.label}</p>
                                                    <p className="text-brand-green text-[10px] font-bold">{row.potd}</p>
                                                    <p className="text-foreground text-[10px] font-bold">{row.fd}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-muted-foreground text-[9px]">*Bank 5Y Tax Saver FD also eligible for 80C</p>
                                    </div>

                                    {/* 5. Inflation Impact */}
                                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                                        <p className="text-purple-400 text-xs font-semibold">Inflation Impact (Real Value at Maturity)</p>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-muted-foreground text-xs">Inflation:</span>
                                            <input type="number" value={inflation} step={0.5} onChange={e => setInflation(Number(e.target.value) || 0)}
                                                className="w-14 py-1 text-center rounded-lg bg-card border border-border text-foreground text-sm font-bold focus:outline-none" />
                                            <span className="text-muted-foreground text-xs">%</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-muted-foreground text-[10px]">Nominal Maturity</p>
                                                <p className="text-foreground font-bold text-sm">{fmtINR(result.maturity)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-[10px]">Real Value (adj. for inflation)</p>
                                                <p className="text-purple-400 font-bold text-sm">{fmtINR(result.realMaturity)}</p>
                                            </div>
                                        </div>
                                        <p className="text-muted-foreground text-[10px]">
                                            Real annual return: <span className={`font-bold ${result.realReturn >= 0 ? 'text-brand-green' : 'text-red-400'}`}>{result.realReturn.toFixed(2)}%</span>
                                        </p>
                                    </div>

                                    {/* 6. Smart Insights */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <BrainCircuit size={14} className="text-yellow-500" />
                                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Smart Insights</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            {insights.map((tip, i) => (
                                                <p key={i} className="text-muted-foreground text-[11px] leading-relaxed p-2 rounded-lg bg-muted">{tip}</p>
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
