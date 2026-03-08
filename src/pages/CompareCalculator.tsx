import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GitCompare, TrendingUp, Calculator, PiggyBank, Download, Share2, FileText, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import NumberInput from '../components/NumberInput';
import { formatINR, calculateSIP } from '../utils/calculations';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { AnalyticsService } from '../lib/analytics';
import { exportComparisonPDF } from '../utils/exportUtils';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

type CompareType = 'emi' | 'sip' | 'fd';

const types: { key: CompareType; label: string; icon: React.ElementType; gradient: string }[] = [
    { key: 'emi', label: 'EMI / Loan', icon: Calculator, gradient: 'from-emerald-500 to-teal-600' },
    { key: 'sip', label: 'SIP', icon: TrendingUp, gradient: 'from-blue-500 to-indigo-600' },
    { key: 'fd', label: 'Fixed Deposit', icon: PiggyBank, gradient: 'from-amber-500 to-orange-600' },
];

export interface AmortEntry { month: number; emi: number; principal: number; interest: number; balance: number; }

export function calcEMIFull(principal: number, rate: number, tenure: number) {
    const r = rate / 12 / 100;
    const n = tenure * 12;
    if (r === 0) {
        const emi = Math.round(principal / n);
        return { emi, totalInterest: 0, totalPayment: principal, amortization: [] as AmortEntry[] };
    }
    const emi = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    const amortization: AmortEntry[] = [];
    let balance = principal;
    for (let m = 1; m <= n; m++) {
        const interest = balance * r;
        const princ = emi - interest;
        balance -= princ;
        amortization.push({ month: m, emi: Math.round(emi), principal: Math.round(princ), interest: Math.round(interest), balance: Math.max(0, Math.round(balance)) });
    }
    return { emi: Math.round(emi), totalInterest: Math.round(totalPayment - principal), totalPayment: Math.round(totalPayment), amortization };
}

function calcFD(principal: number, rate: number, tenure: number) {
    const maturity = principal * Math.pow(1 + rate / 400, tenure * 4);
    return { maturity: Math.round(maturity), interest: Math.round(maturity - principal) };
}

export default function CompareCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('Compare_Calculator'); }, []);
    const navigate = useNavigate();
    const [selectedType, setSelectedType] = useState<CompareType>('emi');
    const chartRef = useRef<any>(null);

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
    const emiResultA = useMemo(() => calcEMIFull(emiA.principal, emiA.rate, emiA.years), [emiA]);
    const emiResultB = useMemo(() => calcEMIFull(emiB.principal, emiB.rate, emiB.years), [emiB]);
    const sipResultA = useMemo(() => calculateSIP(sipA.monthly, sipA.rate, sipA.years), [sipA]);
    const sipResultB = useMemo(() => calculateSIP(sipB.monthly, sipB.rate, sipB.years), [sipB]);
    const fdResultA = useMemo(() => calcFD(fdA.principal, fdA.rate, fdA.years), [fdA]);
    const fdResultB = useMemo(() => calcFD(fdB.principal, fdB.rate, fdB.years), [fdB]);

    // Delta insights
    const deltaInsights = useMemo(() => {
        const insights: { text: string; type: 'positive' | 'info' | 'tip' }[] = [];
        if (selectedType === 'emi') {
            const interestDiff = Math.abs(emiResultB.totalInterest - emiResultA.totalInterest);
            const emiDiff = Math.abs(emiResultB.emi - emiResultA.emi);
            const winner = emiResultA.totalInterest <= emiResultB.totalInterest ? 'A' : 'B';
            if (interestDiff > 0) insights.push({ text: `Scenario ${winner} saves ${formatINR(interestDiff)} in total interest.`, type: 'positive' });
            if (emiDiff > 0) insights.push({ text: `EMI difference: ${formatINR(emiDiff)}/month between scenarios.`, type: 'info' });
            const rateDiff = Math.abs(emiA.rate - emiB.rate);
            if (rateDiff > 0 && emiA.principal === emiB.principal && emiA.years === emiB.years) {
                insights.push({ text: `Reducing interest by ${rateDiff.toFixed(1)}% lowers EMI by ${formatINR(emiDiff)}/month.`, type: 'tip' });
            }
            const totalDiff = Math.abs(emiResultA.totalPayment - emiResultB.totalPayment);
            if (totalDiff > 0) insights.push({ text: `Total payment difference: ${formatINR(totalDiff)} over full tenure.`, type: 'info' });
        } else if (selectedType === 'sip') {
            const diff = Math.abs(sipResultB.futureValue - sipResultA.futureValue);
            const winner = sipResultA.futureValue >= sipResultB.futureValue ? 'A' : 'B';
            if (diff > 0) insights.push({ text: `Scenario ${winner} grows ${formatINR(diff)} more wealth.`, type: 'positive' });
            const returnsDiff = Math.abs(sipResultA.wealthGained - sipResultB.wealthGained);
            if (returnsDiff > 0) insights.push({ text: `Returns difference: ${formatINR(returnsDiff)}`, type: 'info' });
        } else {
            const diff = Math.abs(fdResultB.maturity - fdResultA.maturity);
            const winner = fdResultA.maturity >= fdResultB.maturity ? 'A' : 'B';
            if (diff > 0) insights.push({ text: `Scenario ${winner} earns ${formatINR(diff)} more at maturity.`, type: 'positive' });
        }
        return insights;
    }, [selectedType, emiResultA, emiResultB, sipResultA, sipResultB, fdResultA, fdResultB, emiA, emiB]);

    const winner = useMemo(() => {
        if (selectedType === 'emi') return emiResultA.totalInterest <= emiResultB.totalInterest ? 'A' : 'B';
        if (selectedType === 'sip') return sipResultA.futureValue >= sipResultB.futureValue ? 'A' : 'B';
        return fdResultA.maturity >= fdResultB.maturity ? 'A' : 'B';
    }, [selectedType, emiResultA, emiResultB, sipResultA, sipResultB, fdResultA, fdResultB]);

    // Stacked bar chart data for EMI comparison
    const emiChartData = useMemo(() => ({
        labels: ['Scenario A', 'Scenario B'],
        datasets: [
            { label: 'Principal', data: [emiA.principal, emiB.principal], backgroundColor: '#3B82F6' },
            { label: 'Total Interest', data: [emiResultA.totalInterest, emiResultB.totalInterest], backgroundColor: '#EF4444' },
        ]
    }), [emiA.principal, emiB.principal, emiResultA.totalInterest, emiResultB.totalInterest]);

    const sipChartData = useMemo(() => ({
        labels: ['Scenario A', 'Scenario B'],
        datasets: [
            { label: 'Invested', data: [sipResultA.invested, sipResultB.invested], backgroundColor: '#3B82F6' },
            { label: 'Returns', data: [sipResultA.wealthGained, sipResultB.wealthGained], backgroundColor: '#10B981' },
        ]
    }), [sipResultA, sipResultB]);

    const fdChartData = useMemo(() => ({
        labels: ['Scenario A', 'Scenario B'],
        datasets: [
            { label: 'Principal', data: [fdA.principal, fdB.principal], backgroundColor: '#3B82F6' },
            { label: 'Interest', data: [fdResultA.interest, fdResultB.interest], backgroundColor: '#10B981' },
        ]
    }), [fdA.principal, fdB.principal, fdResultA.interest, fdResultB.interest]);

    const activeChartData = selectedType === 'emi' ? emiChartData : selectedType === 'sip' ? sipChartData : fdChartData;

    const handleDownloadPDF = async () => {
        if (selectedType === 'emi') {
            await exportComparisonPDF({
                type: 'emi',
                scenarioA: { label: 'Scenario A', principal: emiA.principal, rate: emiA.rate, years: emiA.years, emi: emiResultA.emi, totalInterest: emiResultA.totalInterest, totalPayment: emiResultA.totalPayment, amortization: emiResultA.amortization },
                scenarioB: { label: 'Scenario B', principal: emiB.principal, rate: emiB.rate, years: emiB.years, emi: emiResultB.emi, totalInterest: emiResultB.totalInterest, totalPayment: emiResultB.totalPayment, amortization: emiResultB.amortization },
                insights: deltaInsights.map(i => i.text),
                winner,
            });
        }
    };

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
                    {/* Scenario A */}
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

                    {/* Scenario B */}
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

                {/* Insights Banner */}
                <div className="space-y-2 mb-5">
                    {deltaInsights.map((insight, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`p-3.5 rounded-xl flex items-start gap-3 border ${
                                insight.type === 'positive' ? 'bg-brand-green/5 border-brand-green/20' :
                                insight.type === 'tip' ? 'bg-amber-500/5 border-amber-500/20' :
                                'bg-blue-500/5 border-blue-500/20'
                            }`}
                        >
                            <Lightbulb size={15} className={
                                insight.type === 'positive' ? 'text-brand-green' :
                                insight.type === 'tip' ? 'text-amber-400' : 'text-blue-400'
                            } />
                            <p className="text-xs font-medium text-slate-300 leading-relaxed">{insight.text}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Result Comparison Cards */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <motion.div className={`p-4 rounded-2xl border ${winner === 'A' ? 'bg-brand-green/5 border-brand-green/30' : 'bg-dark-card border-dark-border'}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
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
                        {winner === 'A' && <p className="text-brand-green text-[10px] font-bold mt-2">★ Better</p>}
                    </motion.div>

                    <motion.div className={`p-4 rounded-2xl border ${winner === 'B' ? 'bg-brand-green/5 border-brand-green/30' : 'bg-dark-card border-dark-border'}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
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
                        {winner === 'B' && <p className="text-brand-green text-[10px] font-bold mt-2">★ Better</p>}
                    </motion.div>
                </div>

                {/* EMI Difference Summary (only for EMI mode) */}
                {selectedType === 'emi' && (
                    <div className="p-4 rounded-2xl bg-dark-card border border-dark-border mb-5">
                        <h3 className="text-white font-bold text-sm mb-3">📊 Detailed Comparison</h3>
                        <div className="space-y-2.5">
                            <CompareRow label="Monthly EMI Difference" value={formatINR(Math.abs(emiResultA.emi - emiResultB.emi))} />
                            <CompareRow label="Total Interest Savings" value={formatINR(Math.abs(emiResultA.totalInterest - emiResultB.totalInterest))} highlight />
                            <CompareRow label="Total Payment Difference" value={formatINR(Math.abs(emiResultA.totalPayment - emiResultB.totalPayment))} />
                        </div>
                    </div>
                )}

                {/* Visual Bar Chart */}
                <div className="p-4 rounded-2xl bg-dark-card border border-dark-border mb-5">
                    <h3 className="text-white font-bold text-sm mb-4">Visual Comparison</h3>
                    <div className="h-52">
                        <Bar
                            ref={chartRef}
                            data={activeChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: { stacked: true, grid: { color: '#1E293B' }, ticks: { color: '#64748B', font: { size: 9 }, callback: (v: any) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K` } },
                                    x: { stacked: true, grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 11 } } }
                                },
                                plugins: { legend: { labels: { color: '#94A3B8', font: { size: 10 } } } }
                            }}
                        />
                    </div>
                </div>

                {/* Animated Bar Comparison */}
                <div className="p-4 rounded-2xl bg-dark-card border border-dark-border mb-5">
                    <h3 className="text-white font-bold text-sm mb-4">Head-to-Head</h3>
                    {selectedType === 'emi' && (
                        <div className="space-y-4">
                            <CompareBar labelA="A EMI" labelB="B EMI" valA={emiResultA.emi} valB={emiResultB.emi} />
                            <CompareBar labelA="A Interest" labelB="B Interest" valA={emiResultA.totalInterest} valB={emiResultB.totalInterest} />
                            <CompareBar labelA="A Total" labelB="B Total" valA={emiResultA.totalPayment} valB={emiResultB.totalPayment} />
                        </div>
                    )}
                    {selectedType === 'sip' && <CompareBar labelA="A Future Value" labelB="B Future Value" valA={sipResultA.futureValue} valB={sipResultB.futureValue} />}
                    {selectedType === 'fd' && <CompareBar labelA="A Maturity" labelB="B Maturity" valA={fdResultA.maturity} valB={fdResultB.maturity} />}
                </div>

                {/* Download PDF (EMI only for now with amortization) */}
                {selectedType === 'emi' && (
                    <button
                        onClick={handleDownloadPDF}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-violet-500/20 mb-4"
                    >
                        <FileText size={18} />
                        Download Comparison PDF Report
                    </button>
                )}
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

function CompareRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs">{label}</span>
            <span className={`font-bold ${highlight ? 'text-brand-green text-sm' : 'text-white text-xs'}`}>{value}</span>
        </div>
    );
}

function CompareBar({ labelA, labelB, valA, valB }: { labelA: string; labelB: string; valA: number; valB: number }) {
    const max = Math.max(valA, valB, 1);
    const pctA = (valA / max) * 100;
    const pctB = (valB / max) * 100;

    return (
        <div className="space-y-2.5">
            <div>
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-blue-400 font-medium">{labelA}</span>
                    <span className="text-white font-bold">{formatINR(valA)}</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pctA}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
                </div>
            </div>
            <div>
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-amber-400 font-medium">{labelB}</span>
                    <span className="text-white font-bold">{formatINR(valB)}</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pctB}%` }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }} className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                </div>
            </div>
        </div>
    );
}
