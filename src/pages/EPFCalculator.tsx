import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function EPFCalculator() {
    const navigate = useNavigate();
    useEffect(() => { AnalyticsService.trackScreen('EPF_Calculator'); }, []);

    const [basic, setBasic] = useState(30000);
    const [empPct, setEmpPct] = useState(12);
    const [rate, setRate] = useState(8.25);
    const [age, setAge] = useState(28);
    const [retireAge, setRetireAge] = useState(58);
    const [hike, setHike] = useState(5);
    const [taxRate, setTaxRate] = useState(20);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const result = useMemo(() => {
        const years = Math.max(retireAge - age, 1);
        let balance = 0;
        let totalEmp = 0;
        let totalEmployer = 0;
        let salary = basic;

        // Year-by-year table (EPF: annual interest credited on monthly running balance)
        const table: { year: number; age: number; empContrib: number; emplerContrib: number; interest: number; closingBal: number }[] = [];

        for (let y = 0; y < years; y++) {
            let openingBal = balance;
            let yearEmp = 0;
            let yearEmpler = 0;
            let runningBal = openingBal;

            for (let m = 0; m < 12; m++) {
                const emp = salary * empPct / 100;
                const employer = salary * 3.67 / 100; // 8.33% to EPS, 3.67% to EPF
                runningBal += emp + employer;
                yearEmp += emp;
                yearEmpler += employer;
            }

            const yearlyInterest = runningBal * (rate / 100);
            balance = runningBal + yearlyInterest;
            totalEmp += yearEmp;
            totalEmployer += yearEmpler;

            table.push({
                year: y + 1,
                age: age + y + 1,
                empContrib: yearEmp,
                emplerContrib: yearEmpler,
                interest: yearlyInterest,
                closingBal: balance,
            });

            salary *= (1 + hike / 100);
        }

        const fdValue = (totalEmp + totalEmployer) * Math.pow(1 + 6.5 / 400, 4 * years);

        return { balance, totalEmp, totalEmployer, totalInterest: balance - totalEmp - totalEmployer, table, fdValue };
    }, [basic, empPct, rate, age, retireAge, hike]);

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base font-semibold focus:outline-none focus:border-brand-gold";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">EPF Calculator</h1>
                        <p className="text-muted-foreground text-xs">Employee Provident Fund</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 pb-28 space-y-4">
                <div className="space-y-3">
                    {[
                        { label: 'Basic Salary + DA (Monthly)', val: basic, set: setBasic, prefix: '₹', helper: 'Monthly basic + DA' },
                        { label: 'Employee Contribution (%)', val: empPct, set: setEmpPct, suffix: '%', helper: '12% minimum' },
                        { label: 'EPF Interest Rate', val: rate, set: setRate, suffix: '%', helper: 'FY 2025-26: 8.25%' },
                        { label: 'Current Age', val: age, set: setAge, suffix: ' years' },
                        { label: 'Retirement Age', val: retireAge, set: setRetireAge, suffix: ' years' },
                        { label: 'Annual Salary Hike', val: hike, set: setHike, suffix: '%' },
                    ].map(({ label, val, set, prefix, suffix, helper }) => (
                        <div key={label}>
                            <label className="text-muted-foreground text-xs font-medium mb-1 block">{label}</label>
                            {helper && <p className="text-muted-foreground text-[10px] mb-1">{helper}</p>}
                            <div className="relative">
                                {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{prefix}</span>}
                                <input type="number" value={val} onChange={e => set(Number(e.target.value) || 0)}
                                    className={inputCls + (prefix ? ' pl-8' : '') + (suffix ? ' pr-16' : '')} />
                                {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{suffix}</span>}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-brand-gold/20 to-amber-500/10 border border-brand-gold/30 p-5">
                    <p className="text-muted-foreground text-xs font-medium mb-1">EPF Corpus at Retirement</p>
                    <p className="text-foreground font-bold text-3xl">{fmtINR(result.balance)}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                        <div>
                            <p className="text-muted-foreground text-[10px]">Your Contribution</p>
                            <p className="text-foreground font-bold text-sm">{fmtINR(result.totalEmp)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[10px]">Employer EPF</p>
                            <p className="text-foreground font-bold text-sm">{fmtINR(result.totalEmployer)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[10px]">Interest Earned</p>
                            <p className="text-brand-green font-bold text-sm">{fmtINR(result.totalInterest)}</p>
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

                                    {/* FD Comparison */}
                                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                        <p className="text-blue-400 text-xs font-semibold mb-2">vs. FD Comparison (@ 6.5% p.a. Quarterly)</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-muted-foreground text-[10px]">EPF Corpus</p>
                                                <p className="text-brand-green font-bold">{fmtINR(result.balance)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-[10px]">FD Equivalent</p>
                                                <p className="text-blue-400 font-bold">{fmtINR(result.fdValue)}</p>
                                            </div>
                                        </div>
                                        <p className="text-muted-foreground text-[10px] mt-1">
                                            EPF beats FD by {fmtINR(Math.max(0, result.balance - result.fdValue))}
                                        </p>
                                    </div>

                                    {/* Year-by-year table */}
                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Year-by-Year Growth</p>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-4 bg-muted px-3 py-2">
                                                {['Age', 'Emp.', 'Int.', 'Balance'].map(h => (
                                                    <p key={h} className="text-muted-foreground text-[9px] font-bold uppercase">{h}</p>
                                                ))}
                                            </div>
                                            {result.table.map((row, i) => (
                                                <div key={row.year} className={`grid grid-cols-4 px-3 py-2 ${i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                    <p className="text-foreground text-[10px] font-medium">{row.age}y</p>
                                                    <p className="text-foreground text-[10px]">{fmtINR(row.empContrib + row.emplerContrib)}</p>
                                                    <p className="text-brand-green text-[10px]">+{fmtINR(row.interest)}</p>
                                                    <p className="text-foreground text-[10px] font-semibold">{fmtINR(row.closingBal)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-muted">
                                        <p className="text-muted-foreground text-[10px] leading-relaxed">
                                            💡 Employer contributes 12% of Basic: 8.33% to EPS (pension) + 3.67% to EPF.
                                            EPF withdrawals after 5 continuous years of service are tax-free.
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
