import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrackCalculator } from '../hooks/useTrackCalculator'
import { ArrowLeft, Info, Save, Check, Download, TrendingUp, Target, ArrowUpRight, Share2 } from 'lucide-react'
import { motion } from 'framer-motion'
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';

import { calculateSIP, formatINR } from '../utils/calculations';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { exportToPDF, exportToExcel, dateTag, type ExportConfig } from '../utils/exportReport';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import { AnalyticsService } from '../lib/analytics';
import SmartInsight from '../components/SmartInsight';
import ShareableCard from '../components/ShareableCard';
import WhatIfSimulator from '../components/WhatIfSimulator';
import { nativeShare } from '../utils/nativeShare';
import { triggerCalcNotification } from '../services/calcNotifications';

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title
);

type SIPTab = 'basic' | 'stepup' | 'goal';

const tabConfig: { key: SIPTab; label: string; icon: React.ElementType }[] = [
    { key: 'basic', label: 'Basic SIP', icon: TrendingUp },
    { key: 'stepup', label: 'Step-Up SIP', icon: ArrowUpRight },
    { key: 'goal', label: 'Goal SIP', icon: Target },
];

export default function SIPCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('SIP_Calculator'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const { addHistory, addSaved, savedCalculations } = useCalculatorStore();
    const [activeTab, setActiveTab] = useState<SIPTab>('basic');
    const [isSaved, setIsSaved] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const chartRef = useRef<any>(null);

    // Basic SIP state
    const [monthly, setMonthly] = useState(5000);
    const [rate, setRate] = useState(12);
    const [years, setYears] = useState(10);

    // Step-Up SIP state
    const [suInitial, setSuInitial] = useState(5000);
    const [suStepUp, setSuStepUp] = useState(10);
    const [suRate, setSuRate] = useState(12);
    const [suYears, setSuYears] = useState(10);

    // Goal SIP state
    const [goalTarget, setGoalTarget] = useState(1000000);
    const [goalYears, setGoalYears] = useState(5);
    const [goalRate, setGoalRate] = useState(12);

    // Reset saved state when switching tabs or changing inputs
    useEffect(() => { setIsSaved(false); }, [activeTab, monthly, rate, years, suInitial, suStepUp, suRate, suYears, goalTarget, goalYears, goalRate]);

    // ---- Basic SIP calculation ----
    const basicResult = useMemo(() => calculateSIP(monthly, rate, years), [monthly, rate, years]);

    // Removed automatic notification trigger


    // ---- Step-Up SIP calculation ----
    const stepUpResult = useMemo(() => {
        const r = suRate / 12 / 100;
        let balance = 0;
        let totalInvested = 0;
        let monthlyAmt = suInitial;
        const yearlyData: { year: number; invested: number; value: number; returns: number }[] = [];

        for (let y = 1; y <= suYears; y++) {
            for (let m = 1; m <= 12; m++) {
                balance = (balance + monthlyAmt) * (1 + r);
                totalInvested += monthlyAmt;
            }
            yearlyData.push({ year: y, invested: Math.round(totalInvested), value: Math.round(balance), returns: Math.round(balance - totalInvested) });
            monthlyAmt *= (1 + suStepUp / 100);
        }
        return { futureValue: Math.round(balance), invested: Math.round(totalInvested), wealthGained: Math.round(balance - totalInvested), yearlyData };
    }, [suInitial, suStepUp, suRate, suYears]);

    // ---- Goal SIP calculation ----
    const goalResult = useMemo(() => {
        const r = goalRate / 12 / 100;
        const n = goalYears * 12;
        const denominator = ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
        const monthlyNeeded = goalTarget / denominator;
        const totalInvested = monthlyNeeded * n;
        return { monthlyNeeded: Math.round(monthlyNeeded), totalInvested: Math.round(totalInvested), returns: Math.round(goalTarget - totalInvested), target: goalTarget };
    }, [goalTarget, goalYears, goalRate]);

    // Active result for display
    const displayValues = useMemo(() => {
        if (activeTab === 'basic') return { primary: basicResult.futureValue, invested: basicResult.invested, returns: basicResult.wealthGained, label: 'Expected Future Value' };
        if (activeTab === 'stepup') return { primary: stepUpResult.futureValue, invested: stepUpResult.invested, returns: stepUpResult.wealthGained, label: 'Expected Future Value' };
        return { primary: goalResult.monthlyNeeded, invested: goalResult.totalInvested, returns: goalResult.returns, label: 'Monthly SIP Required' };
    }, [activeTab, basicResult, stepUpResult, goalResult]);

    // Chart data
    const chartData = {
        labels: activeTab === 'goal' ? ['Total Investment', 'Est. Returns'] : ['Invested Amount', 'Est. Returns'],
        datasets: [{
            data: [displayValues.invested, displayValues.returns],
            backgroundColor: ['#4F46E5', '#10B981'],
            borderColor: ['#4F46E540', '#10B98140'],
            borderWidth: 1,
        }]
    };

    // Year-wise growth bar chart (for basic & step-up)
    const growthData = useMemo(() => {
        if (activeTab === 'goal') return null;
        const yrs = activeTab === 'basic' ? years : suYears;
        const entries: { year: number; invested: number; returns: number }[] = [];
        if (activeTab === 'basic') {
            const r = rate / 12 / 100;
            const P = monthly;
            for (let y = 1; y <= yrs; y++) {
                const n = y * 12;
                const fv = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
                const inv = P * n;
                entries.push({ year: y, invested: Math.round(inv), returns: Math.round(fv - inv) });
            }
        } else {
            entries.push(...stepUpResult.yearlyData.map(d => ({ year: d.year, invested: d.invested, returns: d.returns })));
        }
        return entries;
    }, [activeTab, monthly, rate, years, stepUpResult]);

    const barChartData = growthData ? {
        labels: growthData.map(d => `Yr ${d.year}`),
        datasets: [
            { label: 'Invested', data: growthData.map(d => d.invested), backgroundColor: '#3B82F6' },
            { label: 'Returns', data: growthData.map(d => d.returns), backgroundColor: '#10B981' },
        ]
    } : null;

    // History Tracking
    useEffect(() => {
        const timer = setTimeout(() => {
            addHistory({
                id: `SIP-${Date.now()}`,
                calculatorType: 'SIP Calculator',
                inputValues: activeTab === 'basic' ? { monthly, rate, years } : activeTab === 'stepup' ? { initial: suInitial, stepUp: suStepUp, rate: suRate, years: suYears } : { target: goalTarget, years: goalYears, rate: goalRate },
                resultValues: { primary: displayValues.primary, invested: displayValues.invested, returns: displayValues.returns, label: displayValues.label },
                timestamp: Date.now()
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [displayValues.primary]);

    const handleSave = () => {
        const calcId = `SIP-Save-${Date.now()}`;
        addSaved({
            id: calcId,
            calculatorType: 'SIP Calculator',
            inputValues: activeTab === 'basic' ? { monthly, rate, years } : activeTab === 'stepup' ? { initial: suInitial, stepUp: suStepUp, rate: suRate, years: suYears } : { target: goalTarget, years: goalYears, rate: goalRate },
            resultValues: { primary: displayValues.primary, invested: displayValues.invested, returns: displayValues.returns, label: displayValues.label },
            timestamp: Date.now()
        });
        setIsSaved(true);
        triggerCalcNotification({
            type: 'sip_due',
            metadata: {
                fundName: 'SIP Investment',
                amount: displayValues.primary,
                isTomorrow: false
            }
        });
    };

    const isAlreadySaved = useMemo(() => {
        const inputs = activeTab === 'basic' ? { monthly, rate, years } : activeTab === 'stepup' ? { initial: suInitial, stepUp: suStepUp, rate: suRate, years: suYears } : { target: goalTarget, years: goalYears, rate: goalRate };
        return savedCalculations.some(s => s.calculatorType === 'SIP Calculator' && JSON.stringify(s.inputValues) === JSON.stringify(inputs));
    }, [savedCalculations, activeTab, monthly, rate, years, suInitial, suStepUp, suRate, suYears, goalTarget, goalYears, goalRate]);

    const handleDownloadPDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const tabLabel = activeTab === 'basic' ? 'Basic SIP' : activeTab === 'stepup' ? 'Step-Up SIP' : 'Goal SIP';
        const config: ExportConfig = {
            title: 'SIP Calculator Report',
            subtitle: tabLabel,
            inputs: activeTab === 'goal' ? [
                { label: 'Target Amount', value: `₹${goalTarget.toLocaleString('en-IN')}` },
                { label: 'Investment Period', value: `${goalYears} Years` },
                { label: 'Expected Return', value: `${goalRate}% p.a.` },
            ] : [
                { label: 'Monthly SIP Amount', value: `₹${monthly.toLocaleString('en-IN')}` },
                { label: 'Expected Return Rate', value: `${rate}% p.a.` },
                { label: 'Investment Period', value: `${years} Years` },
            ],
            results: activeTab === 'goal' ? [
                { label: 'Monthly SIP Required', value: `₹${Math.round(goalResult.monthlyNeeded).toLocaleString('en-IN')}` },
                { label: 'Total to be Invested', value: `₹${Math.round(goalResult.totalInvested).toLocaleString('en-IN')}` },
                { label: 'Estimated Returns', value: `₹${Math.round(goalResult.returns).toLocaleString('en-IN')}` },
                { label: 'Target Amount', value: `₹${goalTarget.toLocaleString('en-IN')}` },
            ] : [
                { label: 'Total Invested', value: `₹${Math.round(displayValues.invested).toLocaleString('en-IN')}` },
                { label: 'Estimated Returns', value: `₹${Math.round(displayValues.returns).toLocaleString('en-IN')}` },
                { label: 'Total Value', value: `₹${Math.round(displayValues.primary).toLocaleString('en-IN')}` },
            ],
            chart: activeTab !== 'goal' ? {
                type: 'pie',
                segments: [
                    { label: 'Amount Invested', value: displayValues.invested, color: '#4F46E5' },
                    { label: 'Est. Returns', value: displayValues.returns, color: '#10B981' },
                ],
            } : undefined,
            projectionTitle: 'Yearly Growth Schedule',
            projectionColumns: ['Year', 'Amount Invested', 'Est. Returns', 'Total Value'],
            projectionRows: (growthData || []).map((r: any) => [
                `Year ${r.year}`,
                `₹${Math.round(r.invested).toLocaleString('en-IN')}`,
                `₹${Math.round(r.returns).toLocaleString('en-IN')}`,
                `₹${Math.round(r.invested + r.returns).toLocaleString('en-IN')}`,
            ]),
            filename: `FinCalix_SIP_Report_${tag}`,
        };
        await exportToPDF(config);
    };

    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const config: ExportConfig = {
            title: 'SIP Calculator Report',
            inputs: activeTab === 'goal' ? [
                { label: 'Target Amount', value: `₹${goalTarget.toLocaleString('en-IN')}` },
                { label: 'Investment Period', value: `${goalYears} Years` },
                { label: 'Expected Return', value: `${goalRate}% p.a.` },
            ] : [
                { label: 'Monthly SIP Amount', value: `₹${monthly.toLocaleString('en-IN')}` },
                { label: 'Expected Return Rate', value: `${rate}% p.a.` },
                { label: 'Investment Period', value: `${years} Years` },
            ],
            results: activeTab === 'goal' ? [
                { label: 'Monthly SIP Required', value: `₹${Math.round(goalResult.monthlyNeeded).toLocaleString('en-IN')}` },
                { label: 'Total to be Invested', value: `₹${Math.round(goalResult.totalInvested).toLocaleString('en-IN')}` },
                { label: 'Estimated Returns', value: `₹${Math.round(goalResult.returns).toLocaleString('en-IN')}` },
            ] : [
                { label: 'Total Invested', value: `₹${Math.round(displayValues.invested).toLocaleString('en-IN')}` },
                { label: 'Estimated Returns', value: `₹${Math.round(displayValues.returns).toLocaleString('en-IN')}` },
                { label: 'Total Value', value: `₹${Math.round(displayValues.primary).toLocaleString('en-IN')}` },
            ],
            projectionTitle: 'Yearly Growth Schedule',
            projectionColumns: ['Year', 'Amount Invested', 'Est. Returns', 'Total Value'],
            projectionRows: (growthData || []).map((r: any) => [
                r.year,
                Math.round(r.invested),
                Math.round(r.returns),
                Math.round(r.invested + r.returns),
            ]),
            filename: `FinCalix_SIP_Report_${tag}`,
        };
        await exportToExcel(config);
    };

    return (
        <div className="min-h-dvh bg-background animate-fade-in">
            <div className="sticky top-0 z-10 bg-background  px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                            <ArrowLeft size={18} className="text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">SIP Calculator</h1>
                            <p className="text-muted-foreground text-xs">Mutual Fund wealth planner</p>
                        </div>
                    </div>
                    <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-card border border-border">
                        <Info size={16} className="text-muted-foreground" />
                    </button>
                </div>
            </div>


            <div className="px-4 pb-28 pt-4">
                {/* SIP Type Tabs */}
                <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-5">
                    {tabConfig.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold rounded-lg transition-all ${activeTab === tab.key
                                    ? 'bg-brand-green text-black shadow-lg shadow-brand-green/20'
                                    : 'text-muted-foreground hover:text-slate-300'
                                }`}
                        >
                            <tab.icon size={13} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Input Fields — varies by tab */}
                <div className="space-y-4 mb-6">
                    {activeTab === 'basic' && (
                        <>
                            <NumberInput label="Monthly Investment" value={monthly} onChange={setMonthly} min={500} max={1000000} prefix="₹" />
                            <NumberInput label="Expected Return (p.a.)" value={rate} onChange={setRate} min={1} max={30} suffix="%" step={0.5} />
                            <NumberInput label="Time Period (years)" value={years} onChange={setYears} min={1} max={40} suffix=" years" />
                        </>
                    )}
                    {activeTab === 'stepup' && (
                        <>
                            <NumberInput label="Initial Monthly SIP" value={suInitial} onChange={setSuInitial} min={500} max={1000000} prefix="₹" />
                            <NumberInput label="Annual Step-up (%)" value={suStepUp} onChange={setSuStepUp} min={1} max={100} suffix="%" step={1} />
                            <NumberInput label="Expected Return (p.a.)" value={suRate} onChange={setSuRate} min={1} max={30} suffix="%" step={0.5} />
                            <NumberInput label="Time Period (years)" value={suYears} onChange={setSuYears} min={1} max={40} suffix=" years" />
                        </>
                    )}
                    {activeTab === 'goal' && (
                        <>
                            <NumberInput label="Target Amount" value={goalTarget} onChange={setGoalTarget} min={10000} max={1000000000} prefix="₹" />
                            <NumberInput label="In how many years?" value={goalYears} onChange={setGoalYears} min={1} max={40} suffix=" years" />
                            <NumberInput label="Expected Return (p.a.)" value={goalRate} onChange={setGoalRate} min={1} max={30} suffix="%" step={0.5} />
                        </>
                    )}
                </div>

                {/* Result Card */}
                <motion.div layout className="p-5 rounded-2xl bg-card border border-border mb-6">
                    <div className="text-center mb-6">
                        <p className="text-muted-foreground text-sm mb-1">{displayValues.label}</p>
                        <motion.p key={displayValues.primary} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-bold text-foreground">
                            {formatINR(displayValues.primary)}
                        </motion.p>
                    </div>

                    {/* Pie Chart */}
                    <div className="h-44 mb-8 flex justify-center">
                        <Pie
                            ref={chartRef}
                            data={chartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false }, tooltip: { enabled: true } }
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/30 text-center">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Invested</p>
                            <p className="text-foreground font-bold text-sm">{formatINR(displayValues.invested)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/30 text-center">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Returns</p>
                            <p className="text-brand-green font-bold text-sm">{formatINR(displayValues.returns)}</p>
                        </div>
                    </div>

                    {/* Goal SIP: extra row */}
                    {activeTab === 'goal' && (
                        <div className="p-3 rounded-xl bg-brand-green/5 border border-brand-green/20 text-center mb-4">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Target Amount</p>
                            <p className="text-brand-green font-bold text-sm">{formatINR(goalTarget)}</p>
                        </div>
                    )}

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSave}
                        disabled={isSaved || isAlreadySaved}
                        className={`w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${isSaved || isAlreadySaved
                            ? 'bg-brand-green/10 text-brand-green border border-brand-green/20'
                            : 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                            }`}
                    >
                        {isSaved || isAlreadySaved ? <><Check size={18} /> Saved</> : <><Save size={18} /> Save Investment</>}
                    </motion.button>
                </motion.div>

                {/* Growth Chart (Basic & Step-Up only) */}
                {barChartData && (
                    <div className="bg-card border border-border rounded-2xl p-4 mb-6">
                        <h3 className="text-foreground font-bold text-sm mb-4">Year-wise Growth</h3>
                        <div className="h-56">
                            <Bar
                                data={barChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: {
                                        y: { stacked: true, grid: { color: '#1E293B' }, ticks: { color: '#64748B', font: { size: 10 }, callback: (v: any) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K` } },
                                        x: { stacked: true, grid: { display: false }, ticks: { color: '#64748B', font: { size: 9 } } }
                                    },
                                    plugins: { legend: { display: false } }
                                }}
                            />
                        </div>
                        <div className="flex gap-4 mt-3 justify-center">
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 bg-[#3B82F6] rounded-full" /> Invested</span>
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 bg-brand-green rounded-full" /> Returns</span>
                        </div>
                    </div>
                )}

                {/* Smart Insights */}
                <SmartInsight
                    calculatorType="sip"
                    inputs={activeTab === 'basic' ? { monthly, rate, years } : activeTab === 'stepup' ? { monthly: suInitial, rate: suRate, years: suYears } : { monthly: goalResult.monthlyNeeded, rate: goalRate, years: goalYears }}
                    results={{ futureValue: displayValues.primary, invested: displayValues.invested, wealthGained: displayValues.returns }}
                />

                {/* What-If Simulator */}
                {activeTab === 'basic' && (
                    <WhatIfSimulator
                        sliders={[
                            { key: 'monthly', label: 'Monthly SIP', min: 500, max: 100000, step: 500, prefix: '₹' },
                            { key: 'rate', label: 'Expected Return', min: 4, max: 20, step: 0.5, suffix: '%' },
                        ]}
                        currentInputs={{ monthly, rate, years }}
                        calculateResult={(inputs) => {
                            const r = inputs.rate / 12 / 100;
                            const n = inputs.years * 12;
                            return r === 0 ? inputs.monthly * n : Math.round(inputs.monthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r)));
                        }}
                        resultLabel="Future Value"
                    />
                )}

                <div className="grid grid-cols-3 gap-3 mb-5 mt-4">
                    <button onClick={handleDownloadPDF} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-muted-foreground text-[10px] font-medium">
                        <Download size={16} /> PDF
                    </button>
                    <button onClick={handleDownloadExcel} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-muted-foreground text-[10px] font-medium">
                        <Download size={16} /> Excel
                    </button>
                    <button onClick={async () => {
                        const text = `📈 My SIP Investment Plan\n\n💰 Monthly: ${formatINR(displayValues.invested / (activeTab === 'basic' ? years * 12 : activeTab === 'stepup' ? suYears * 12 : goalYears * 12))}\n📅 Duration: ${activeTab === 'basic' ? years : activeTab === 'stepup' ? suYears : goalYears} years\n\n✅ Future Value: ${formatINR(displayValues.primary)}\n💵 Invested: ${formatINR(displayValues.invested)}\n📊 Returns: ${formatINR(displayValues.returns)}\n\nCalculated with FinCalix 🧮`;
                        await nativeShare('SIP Plan – FinCalix', text);
                    }} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-bold">
                        <Share2 size={16} /> Share
                    </button>
                </div>

                {/* Inflation-adjusted Insight */}
                {activeTab !== 'goal' && (
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 mb-5">
                        <div className="flex items-start gap-3">
                            <TrendingUp size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-foreground font-bold text-xs">Inflation-Adjusted Value</h3>
                                <p className="text-muted-foreground text-[11px] mt-1">Assuming ~6% inflation, your {formatINR(displayValues.primary)} will be worth approximately:</p>
                                <p className="text-amber-400 font-bold text-sm mt-1">{formatINR(Math.round(displayValues.primary / Math.pow(1.06, activeTab === 'basic' ? years : suYears)))} in today's money</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Shareable Card */}
                <ShareableCard
                    title={activeTab === 'goal' ? 'My SIP Goal Plan' : 'My SIP Investment'}
                    highlight={formatINR(displayValues.primary)}
                    subtitle={`${activeTab === 'basic' ? years : activeTab === 'stepup' ? suYears : goalYears} year SIP plan`}
                    details={[
                        { label: 'Total Invested', value: formatINR(displayValues.invested) },
                        { label: 'Returns', value: formatINR(displayValues.returns) },
                        { label: 'Type', value: activeTab === 'basic' ? 'Basic SIP' : activeTab === 'stepup' ? 'Step-Up SIP' : 'Goal SIP' },
                        { label: 'Multiplier', value: `${(displayValues.primary / displayValues.invested).toFixed(2)}x` },
                    ]}
                    gradient="from-blue-600 via-indigo-500 to-purple-600"
                />

                <CalculatorInfoModal
                    isOpen={showInfo}
                    onClose={() => setShowInfo(false)}
                    calculatorTitle="SIP Calculator"
                />
            </div>
            
            
            <DisclaimerComponent module="sip" />
        </div>
    );
}
