import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Info, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';

const fmtINR = (v: number) => formatINR(Math.round(v));
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PAGE_SIZE = 24;

export default function SWPCalculator() {
    const navigate = useNavigate();
    useEffect(() => { AnalyticsService.trackScreen('SWP_Calculator'); }, []);

    const [principal, setPrincipal] = useState(1000000);
    const [withdrawal, setWithdrawal] = useState(10000);
    const [rate, setRate] = useState(8);
    const [years, setYears] = useState(10);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [page, setPage] = useState(0);

    const result = useMemo(() => {
        const r = rate / 12 / 100;
        const n = years * 12;
        let balance = principal;
        let totalWithdrawn = 0;
        let depletionMonth: number | null = null;

        const schedule: { month: number; withdrawal: number; balance: number }[] = [];

        for (let i = 1; i <= n; i++) {
            balance = balance * (1 + r) - withdrawal;
            totalWithdrawn += withdrawal;
            if (balance <= 0 && depletionMonth === null) {
                depletionMonth = i;
                balance = 0;
            }
            schedule.push({ month: i, withdrawal, balance: Math.max(0, balance) });
            if (balance <= 0) break;
        }

        // Break-even withdrawal: SWP amount that exactly depletes the corpus in n months
        // PWA formula: PMT = PV * r / (1 - (1+r)^(-n))
        const breakEvenWd = r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));

        const finalBalance = schedule[schedule.length - 1]?.balance ?? 0;

        return { finalBalance, totalWithdrawn, schedule, depletionMonth, breakEvenWd };
    }, [principal, withdrawal, rate, years]);

    const totalPages = Math.ceil(result.schedule.length / PAGE_SIZE);
    const currentRows = result.schedule.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const baseDate = new Date();

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base font-semibold focus:outline-none focus:border-brand-blue";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">SWP Calculator</h1>
                        <p className="text-muted-foreground text-xs">Systematic Withdrawal Plan</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 pb-28 space-y-4">
                <div className="space-y-3">
                    {[
                        { label: 'Total Investment', val: principal, set: setPrincipal, prefix: '₹' },
                        { label: 'Monthly Withdrawal', val: withdrawal, set: setWithdrawal, prefix: '₹' },
                        { label: 'Expected Return (p.a.)', val: rate, set: setRate, suffix: '%' },
                        { label: 'Time Period (years)', val: years, set: setYears, suffix: ' yrs' },
                    ].map(({ label, val, set, prefix, suffix }) => (
                        <div key={label}>
                            <label className="text-muted-foreground text-xs font-medium mb-1 block">{label}</label>
                            <div className="relative">
                                {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{prefix}</span>}
                                <input type="number" value={val} onChange={e => set(Number(e.target.value) || 0)}
                                    className={inputCls + (prefix ? ' pl-8' : '') + (suffix ? ' pr-14' : '')} />
                                {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{suffix}</span>}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Result Card */}
                <div className="rounded-2xl bg-gradient-to-br from-brand-blue/20 to-blue-500/10 border border-brand-blue/30 p-5">
                    <p className="text-muted-foreground text-xs font-medium mb-1">Final Balance</p>
                    <p className="text-foreground font-bold text-3xl">{fmtINR(result.finalBalance)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-muted-foreground text-[11px]">Total Withdrawn</p>
                            <p className="text-brand-green font-bold text-base">{fmtINR(result.totalWithdrawn)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[11px]">Initial Principal</p>
                            <p className="text-foreground font-bold text-base">{fmtINR(principal)}</p>
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

                                    {/* Key insights */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Break-Even Withdrawal</p>
                                            <p className="text-amber-500 font-bold text-base">{fmtINR(result.breakEvenWd)}<span className="text-[10px] font-normal">/mo</span></p>
                                            <p className="text-muted-foreground text-[10px] mt-0.5">Corpus depletes in exactly {years}y</p>
                                        </div>
                                        <div className={`p-3 rounded-xl border text-center ${result.depletionMonth ? 'bg-red-500/10 border-red-500/20' : 'bg-brand-green/10 border-brand-green/20'}`}>
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Corpus Depletion</p>
                                            {result.depletionMonth ? (
                                                <>
                                                    <p className="text-red-400 font-bold text-base">Month {result.depletionMonth}</p>
                                                    <p className="text-muted-foreground text-[10px] mt-0.5">~{(result.depletionMonth / 12).toFixed(1)} years</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-brand-green font-bold text-base">Intact</p>
                                                    <p className="text-muted-foreground text-[10px] mt-0.5">Corpus survives period</p>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Month-by-month withdrawal schedule */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Withdrawal Schedule</p>
                                            {totalPages > 1 && (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0} className="p-1 rounded-lg bg-muted disabled:opacity-40">
                                                        <ChevronLeft size={12} className="text-foreground" />
                                                    </button>
                                                    <span className="text-muted-foreground text-[10px]">{page+1}/{totalPages}</span>
                                                    <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page >= totalPages-1} className="p-1 rounded-lg bg-muted disabled:opacity-40">
                                                        <ChevronRightIcon size={12} className="text-foreground" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-3 bg-muted px-3 py-2">
                                                {['Month', 'Withdrawal', 'Balance'].map(h => (
                                                    <p key={h} className="text-muted-foreground text-[10px] font-bold uppercase">{h}</p>
                                                ))}
                                            </div>
                                            {currentRows.map((row, i) => {
                                                const d = new Date(baseDate);
                                                d.setMonth(d.getMonth() + row.month - 1);
                                                return (
                                                    <div key={row.month} className={`grid grid-cols-3 px-3 py-2 ${i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                        <p className="text-foreground text-[11px] font-medium">{MONTHS[d.getMonth()]} '{String(d.getFullYear()).slice(2)}</p>
                                                        <p className="text-red-400 text-[11px] font-semibold">-{fmtINR(row.withdrawal)}</p>
                                                        <p className={`text-[11px] font-semibold ${row.balance <= 0 ? 'text-red-400' : 'text-foreground'}`}>{fmtINR(row.balance)}</p>
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
            </div>
        </div>
    );
}
