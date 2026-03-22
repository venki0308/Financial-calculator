import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';

const fmtINR = (v: number) => formatINR(Math.round(v));

export default function GratuityCalculator() {
    const navigate = useNavigate();
    useEffect(() => { AnalyticsService.trackScreen('Gratuity'); }, []);

    const [salary, setSalary] = useState(50000);
    const [years, setYears] = useState(10);
    const [taxRate, setTaxRate] = useState(20);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const result = useMemo(() => {
        // Formula: (Last Drawn Salary × 15 × Years of Service) / 26
        const gratuity = (salary * 15 * years) / 26;
        const exemptionLimit = 2000000; // ₹20 lakhs as per latest limit
        const taxableGratuity = Math.max(0, gratuity - exemptionLimit);
        const estimatedTax = taxableGratuity * (taxRate / 100);
        const netGratuity = gratuity - estimatedTax;

        // Service milestones
        const milestones = [5, 10, 15, 20, 25, years].filter((y, i, arr) => y <= years && arr.indexOf(y) === i).sort((a, b) => a - b);
        const milestoneData = milestones.map(y => ({
            years: y,
            gratuity: (salary * 15 * y) / 26
        }));

        return { gratuity, exemptionLimit, taxableGratuity, estimatedTax, netGratuity, milestoneData };
    }, [salary, years, taxRate]);

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base font-semibold focus:outline-none focus:border-brand-blue";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Gratuity Calculator</h1>
                        <p className="text-muted-foreground text-xs">Service gratuity estimate</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 pb-28 space-y-4">
                <div className="space-y-3">
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">Last Drawn Salary (Basic + DA)</label>
                        <p className="text-muted-foreground text-[10px] mb-1">Monthly Basic + DA</p>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={salary} onChange={e => setSalary(Number(e.target.value) || 0)} className={inputCls + " pl-8"} />
                        </div>
                    </div>
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">Years of Service</label>
                        <p className="text-muted-foreground text-[10px] mb-1">Minimum 5 years for eligibility</p>
                        <div className="relative">
                            <input type="number" value={years} min={5} onChange={e => setYears(Math.max(5, Number(e.target.value) || 5))} className={inputCls + " pr-16"} />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">years</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-brand-blue/20 to-blue-500/10 border border-brand-blue/30 p-5">
                    <p className="text-muted-foreground text-xs font-medium mb-1">Estimated Gratuity</p>
                    <p className="text-foreground font-bold text-3xl">{fmtINR(result.gratuity)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-muted-foreground text-[11px]">Service Period</p>
                            <p className="text-foreground font-bold text-base">{years} years</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[11px]">Tax Exemption</p>
                            <p className="text-brand-green font-bold text-base">Up to ₹20 Lakh</p>
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

                                    {/* Formula display */}
                                    <div className="p-3 rounded-xl bg-muted">
                                        <p className="text-muted-foreground text-xs font-semibold mb-2">Calculation Formula</p>
                                        <p className="text-foreground text-xs font-mono">
                                            Gratuity = (Salary × 15 × Years) ÷ 26
                                        </p>
                                        <p className="text-muted-foreground text-[10px] mt-1">
                                            = (₹{salary.toLocaleString('en-IN')} × 15 × {years}) ÷ 26 = {fmtINR(result.gratuity)}
                                        </p>
                                    </div>

                                    {/* Tax treatment */}
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Tax Treatment</p>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-muted-foreground text-xs">Your Income Tax Rate:</span>
                                            <input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value) || 0)}
                                                className="w-16 text-center py-1 rounded-lg bg-card border border-border text-foreground text-sm font-bold focus:outline-none focus:border-brand-blue" />
                                            <span className="text-muted-foreground text-xs">%</span>
                                        </div>
                                        {[
                                            { label: 'Total Gratuity', val: result.gratuity },
                                            { label: 'Statutory Exemption Limit', val: result.exemptionLimit, green: true },
                                            { label: 'Taxable Portion', val: result.taxableGratuity, red: result.taxableGratuity > 0 },
                                            { label: `Estimated Tax (@ ${taxRate}%)`, val: result.estimatedTax, red: result.estimatedTax > 0 },
                                            { label: 'Net In-Hand Gratuity', val: result.netGratuity, green: true },
                                        ].map(({ label, val, green, red }) => (
                                            <div key={label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                                                <span className="text-muted-foreground text-xs">{label}</span>
                                                <span className={`font-bold text-xs ${green ? 'text-brand-green' : red ? 'text-red-400' : 'text-foreground'}`}>{fmtINR(val)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Service milestone table */}
                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Service Milestone Table</p>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-2 bg-muted px-3 py-2">
                                                <p className="text-muted-foreground text-[10px] font-bold uppercase">Years of Service</p>
                                                <p className="text-muted-foreground text-[10px] font-bold uppercase">Gratuity</p>
                                            </div>
                                            {result.milestoneData.map((m, i) => (
                                                <div key={m.years} className={`grid grid-cols-2 px-3 py-2 ${i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                    <p className="text-foreground text-xs font-medium">{m.years} years</p>
                                                    <p className="text-brand-green text-xs font-semibold">{fmtINR(m.gratuity)}</p>
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
