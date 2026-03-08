import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GitCompare, TrendingUp, Calculator, PiggyBank } from 'lucide-react';
import { motion } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import { formatINR, calculateSIP } from '../utils/calculations';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { AnalyticsService } from '../lib/analytics';

type CompareType = 'emi' | 'sip' | 'fd';

const types: { key: CompareType; label: string; icon: React.ElementType; gradient: string }[] = [
    { key: 'emi', label: 'EMI / Loan', icon: Calculator, gradient: 'from-emerald-500 to-teal-600' },
    { key: 'sip', label: 'SIP', icon: TrendingUp, gradient: 'from-blue-500 to-indigo-600' },
    { key: 'fd', label: 'Fixed Deposit', icon: PiggyBank, gradient: 'from-amber-500 to-orange-600' },
];

function calcEMI(principal: number, rate: number, tenure: number) {
    const r = rate / 12 / 100;
    const n = tenure * 12;
    if (r === 0) return { emi: Math.round(principal / n), totalInterest: 0, totalPayment: principal };
    const emi = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    return { emi: Math.round(emi), totalInterest: Math.round(totalPayment - principal), totalPayment: Math.round(totalPayment) };
}

function calcFD(principal: number, rate: number, tenure: number) {
    const maturity = principal * Math.pow(1 + rate / 400, tenure * 4);
    return { maturity: Math.round(maturity), interest: Math.round(maturity - principal) };
}

export default function CompareCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('Compare_Calculator'); }, []);
    const navigate = useNavigate();
    const [selectedType, setSelectedType] = useState<CompareType>('emi');

    // EMI states
    const [emiA, setEmiA] = useState({ principal: 2000000, rate: 8.5, years: 20 });
    const [emiB, setEmiB] = useState({ principal: 2000000, rate: 9.5, years: 20 });

    // SIP states
    const [sipA, setSipA] = useState({ monthly: 5000, rate: 12, years: 10 });
    const [sipB, setSipB] = useState({ monthly: 7000, rate: 12, years: 10 });

    // FD states
    const [fdA, setFdA] = useState({ principal: 500000, rate: 7, years: 5 });
    const [fdB, setFdB] = useState({ principal: 500000, rate: 7.5, years: 7 });

    // Results
    const emiResultA = useMemo(() => calcEMI(emiA.principal, emiA.rate, emiA.years), [emiA]);
    const emiResultB = useMemo(() => calcEMI(emiB.principal, emiB.rate, emiB.years), [emiB]);
    const sipResultA = useMemo(() => calculateSIP(sipA.monthly, sipA.rate, sipA.years), [sipA]);
    const sipResultB = useMemo(() => calculateSIP(sipB.monthly, sipB.rate, sipB.years), [sipB]);
    const fdResultA = useMemo(() => calcFD(fdA.principal, fdA.rate, fdA.years), [fdA]);
    const fdResultB = useMemo(() => calcFD(fdB.principal, fdB.rate, fdB.years), [fdB]);

    // Delta insight
    const deltaInsight = useMemo(() => {
        if (selectedType === 'emi') {
            const diff = emiResultB.totalInterest - emiResultA.totalInterest;
            if (diff > 0) return { text: `Scenario A saves you ${formatINR(diff)} in interest`, color: 'text-brand-green', winner: 'A' };
            if (diff < 0) return { text: `Scenario B saves you ${formatINR(-diff)} in interest`, color: 'text-brand-green', winner: 'B' };
            return { text: 'Both scenarios have the same total interest', color: 'text-slate-400', winner: null };
        }
        if (selectedType === 'sip') {
            const diff = sipResultB.futureValue - sipResultA.futureValue;
            if (diff > 0) return { text: `Scenario B grows ${formatINR(diff)} more wealth`, color: 'text-brand-green', winner: 'B' };
            if (diff < 0) return { text: `Scenario A grows ${formatINR(-diff)} more wealth`, color: 'text-brand-green', winner: 'A' };
            return { text: 'Both scenarios have equal returns', color: 'text-slate-400', winner: null };
        }
        const diff = fdResultB.maturity - fdResultA.maturity;
        if (diff > 0) return { text: `Scenario B earns ${formatINR(diff)} more at maturity`, color: 'text-brand-green', winner: 'B' };
        if (diff < 0) return { text: `Scenario A earns ${formatINR(-diff)} more at maturity`, color: 'text-brand-green', winner: 'A' };
        return { text: 'Both scenarios have equal maturity', color: 'text-slate-400', winner: null };
    }, [selectedType, emiResultA, emiResultB, sipResultA, sipResultB, fdResultA, fdResultB]);

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in">
            <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-dark-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-white">Compare Scenarios</h1>
                        <p className="text-slate-500 text-xs">Side-by-side financial comparison</p>
                    </div>
                </div>
            </div>

            <DisclaimerBanner type="calculator" />

            <div className="px-4 pb-28 pt-4">
                {/* Type Selector */}
                <div className="flex gap-2 mb-5">
                    {types.map(tp => (
                        <motion.button
                            key={tp.key}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedType(tp.key)}
                            className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                selectedType === tp.key
                                    ? `bg-gradient-to-br ${tp.gradient} text-white shadow-lg`
                                    : 'bg-dark-card border border-dark-border text-slate-400'
                            }`}
                        >
                            <tp.icon size={14} />
                            {tp.label}
                        </motion.button>
                    ))}
                </div>

                {/* Scenario Inputs */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    {/* Scenario A Column */}
                    <div className="space-y-3">
                        <div className="text-center py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <span className="text-blue-400 text-xs font-bold">📘 Scenario A</span>
                        </div>
                        {selectedType === 'emi' && (
                            <>
                                <NumberInput label="Loan Amount" value={emiA.principal} onChange={v => setEmiA({ ...emiA, principal: v })} min={10000} max={100000000} prefix="₹" />
                                <NumberInput label="Interest Rate" value={emiA.rate} onChange={v => setEmiA({ ...emiA, rate: v })} min={1} max={30} suffix="%" step={0.1} />
                                <NumberInput label="Tenure (Years)" value={emiA.years} onChange={v => setEmiA({ ...emiA, years: v })} min={1} max={30} suffix=" yr" />
                            </>
                        )}
                        {selectedType === 'sip' && (
                            <>
                                <NumberInput label="Monthly SIP" value={sipA.monthly} onChange={v => setSipA({ ...sipA, monthly: v })} min={500} max={1000000} prefix="₹" />
                                <NumberInput label="Return Rate" value={sipA.rate} onChange={v => setSipA({ ...sipA, rate: v })} min={1} max={30} suffix="%" step={0.5} />
                                <NumberInput label="Years" value={sipA.years} onChange={v => setSipA({ ...sipA, years: v })} min={1} max={40} suffix=" yr" />
                            </>
                        )}
                        {selectedType === 'fd' && (
                            <>
                                <NumberInput label="Principal" value={fdA.principal} onChange={v => setFdA({ ...fdA, principal: v })} min={1000} max={100000000} prefix="₹" />
                                <NumberInput label="Interest Rate" value={fdA.rate} onChange={v => setFdA({ ...fdA, rate: v })} min={1} max={15} suffix="%" step={0.1} />
                                <NumberInput label="Tenure (Years)" value={fdA.years} onChange={v => setFdA({ ...fdA, years: v })} min={1} max={10} suffix=" yr" />
                            </>
                        )}
                    </div>

                    {/* Scenario B Column */}
                    <div className="space-y-3">
                        <div className="text-center py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <span className="text-amber-400 text-xs font-bold">📙 Scenario B</span>
                        </div>
                        {selectedType === 'emi' && (
                            <>
                                <NumberInput label="Loan Amount" value={emiB.principal} onChange={v => setEmiB({ ...emiB, principal: v })} min={10000} max={100000000} prefix="₹" />
                                <NumberInput label="Interest Rate" value={emiB.rate} onChange={v => setEmiB({ ...emiB, rate: v })} min={1} max={30} suffix="%" step={0.1} />
                                <NumberInput label="Tenure (Years)" value={emiB.years} onChange={v => setEmiB({ ...emiB, years: v })} min={1} max={30} suffix=" yr" />
                            </>
                        )}
                        {selectedType === 'sip' && (
                            <>
                                <NumberInput label="Monthly SIP" value={sipB.monthly} onChange={v => setSipB({ ...sipB, monthly: v })} min={500} max={1000000} prefix="₹" />
                                <NumberInput label="Return Rate" value={sipB.rate} onChange={v => setSipB({ ...sipB, rate: v })} min={1} max={30} suffix="%" step={0.5} />
                                <NumberInput label="Years" value={sipB.years} onChange={v => setSipB({ ...sipB, years: v })} min={1} max={40} suffix=" yr" />
                            </>
                        )}
                        {selectedType === 'fd' && (
                            <>
                                <NumberInput label="Principal" value={fdB.principal} onChange={v => setFdB({ ...fdB, principal: v })} min={1000} max={100000000} prefix="₹" />
                                <NumberInput label="Interest Rate" value={fdB.rate} onChange={v => setFdB({ ...fdB, rate: v })} min={1} max={15} suffix="%" step={0.1} />
                                <NumberInput label="Tenure (Years)" value={fdB.years} onChange={v => setFdB({ ...fdB, years: v })} min={1} max={10} suffix=" yr" />
                            </>
                        )}
                    </div>
                </div>

                {/* Delta Insight Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-violet-600/10 to-indigo-600/10 border border-violet-500/20 mb-5 flex items-center gap-3"
                >
                    <GitCompare size={20} className="text-violet-400 flex-shrink-0" />
                    <p className={`text-sm font-bold ${deltaInsight.color}`}>{deltaInsight.text}</p>
                </motion.div>

                {/* Result Comparison Cards */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Scenario A Result */}
                    <motion.div
                        className={`p-4 rounded-2xl border ${deltaInsight.winner === 'A' ? 'bg-brand-green/5 border-brand-green/30' : 'bg-dark-card border-dark-border'}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <p className="text-blue-400 text-[10px] font-bold uppercase mb-3">Scenario A</p>
                        {selectedType === 'emi' && (
                            <div className="space-y-2">
                                <ResultRow label="Monthly EMI" value={formatINR(emiResultA.emi)} highlight />
                                <ResultRow label="Total Interest" value={formatINR(emiResultA.totalInterest)} />
                                <ResultRow label="Total Payment" value={formatINR(emiResultA.totalPayment)} />
                            </div>
                        )}
                        {selectedType === 'sip' && (
                            <div className="space-y-2">
                                <ResultRow label="Future Value" value={formatINR(sipResultA.futureValue)} highlight />
                                <ResultRow label="Invested" value={formatINR(sipResultA.invested)} />
                                <ResultRow label="Returns" value={formatINR(sipResultA.wealthGained)} green />
                            </div>
                        )}
                        {selectedType === 'fd' && (
                            <div className="space-y-2">
                                <ResultRow label="Maturity" value={formatINR(fdResultA.maturity)} highlight />
                                <ResultRow label="Interest" value={formatINR(fdResultA.interest)} green />
                            </div>
                        )}
                        {deltaInsight.winner === 'A' && <p className="text-brand-green text-[10px] font-bold mt-2">★ Better</p>}
                    </motion.div>

                    {/* Scenario B Result */}
                    <motion.div
                        className={`p-4 rounded-2xl border ${deltaInsight.winner === 'B' ? 'bg-brand-green/5 border-brand-green/30' : 'bg-dark-card border-dark-border'}`}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <p className="text-amber-400 text-[10px] font-bold uppercase mb-3">Scenario B</p>
                        {selectedType === 'emi' && (
                            <div className="space-y-2">
                                <ResultRow label="Monthly EMI" value={formatINR(emiResultB.emi)} highlight />
                                <ResultRow label="Total Interest" value={formatINR(emiResultB.totalInterest)} />
                                <ResultRow label="Total Payment" value={formatINR(emiResultB.totalPayment)} />
                            </div>
                        )}
                        {selectedType === 'sip' && (
                            <div className="space-y-2">
                                <ResultRow label="Future Value" value={formatINR(sipResultB.futureValue)} highlight />
                                <ResultRow label="Invested" value={formatINR(sipResultB.invested)} />
                                <ResultRow label="Returns" value={formatINR(sipResultB.wealthGained)} green />
                            </div>
                        )}
                        {selectedType === 'fd' && (
                            <div className="space-y-2">
                                <ResultRow label="Maturity" value={formatINR(fdResultB.maturity)} highlight />
                                <ResultRow label="Interest" value={formatINR(fdResultB.interest)} green />
                            </div>
                        )}
                        {deltaInsight.winner === 'B' && <p className="text-brand-green text-[10px] font-bold mt-2">★ Better</p>}
                    </motion.div>
                </div>

                {/* Visual Bar Comparison */}
                <div className="mt-5 p-4 rounded-2xl bg-dark-card border border-dark-border">
                    <h3 className="text-white font-bold text-sm mb-4">Visual Comparison</h3>
                    {selectedType === 'emi' && <CompareBar labelA="A Interest" labelB="B Interest" valA={emiResultA.totalInterest} valB={emiResultB.totalInterest} />}
                    {selectedType === 'sip' && <CompareBar labelA="A Future Value" labelB="B Future Value" valA={sipResultA.futureValue} valB={sipResultB.futureValue} />}
                    {selectedType === 'fd' && <CompareBar labelA="A Maturity" labelB="B Maturity" valA={fdResultA.maturity} valB={fdResultB.maturity} />}
                </div>
            </div>
        </div>
    );
}

function ResultRow({ label, value, highlight, green }: { label: string; value: string; highlight?: boolean; green?: boolean }) {
    return (
        <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold">{label}</p>
            <p className={`font-bold ${highlight ? 'text-white text-sm' : green ? 'text-brand-green text-xs' : 'text-slate-300 text-xs'}`}>{value}</p>
        </div>
    );
}

function CompareBar({ labelA, labelB, valA, valB }: { labelA: string; labelB: string; valA: number; valB: number }) {
    const max = Math.max(valA, valB, 1);
    const pctA = (valA / max) * 100;
    const pctB = (valB / max) * 100;

    return (
        <div className="space-y-3">
            <div>
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-blue-400 font-medium">{labelA}</span>
                    <span className="text-white font-bold">{formatINR(valA)}</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pctA}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                    />
                </div>
            </div>
            <div>
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-amber-400 font-medium">{labelB}</span>
                    <span className="text-white font-bold">{formatINR(valB)}</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pctB}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                    />
                </div>
            </div>
        </div>
    );
}
