import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Info, Download, Share2, ChevronDown, ChevronUp, BookOpen, AlertCircle, GraduationCap, Shield, Calendar, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import NumberInput from '../components/NumberInput';
import DisclaimerBanner from '../components/DisclaimerBanner';
import SmartInsight from '../components/SmartInsight';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import { AnalyticsService } from '../lib/analytics';
import { useCalculatorStore } from '../store/useCalculatorStore';
import ShareableCard from '../components/ShareableCard';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface YearWise { year: number; age: number; deposit: number; interest: number; balance: number; cumDeposit: number; cumInterest: number; }

export default function SSYCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('SSY_Calculator_Advanced'); }, []);
    const navigate = useNavigate();
    const { addSaved } = useCalculatorStore();
    const chartRef = useRef<any>(null);

    const [annual, setAnnual] = useState(50000);
    const [rate, setRate] = useState(8.2);
    const [childAge, setChildAge] = useState(1);
    const [showTimeline, setShowTimeline] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const [saved, setSaved] = useState(false);

    const investYears = 15;
    const maturityYears = 21;

    const result = useMemo(() => {
        const r = rate / 100;
        const timeline: YearWise[] = [];
        let balance = 0;
        let cumDeposit = 0;
        let cumInterest = 0;

        for (let i = 1; i <= maturityYears; i++) {
            const deposit = i <= investYears ? annual : 0;
            cumDeposit += deposit;
            balance += deposit;
            const interest = balance * r;
            cumInterest += interest;
            balance += interest;
            timeline.push({
                year: i,
                age: childAge + i,
                deposit,
                interest: Math.round(interest),
                balance: Math.round(balance),
                cumDeposit,
                cumInterest: Math.round(cumInterest),
            });
        }

        const invested = annual * investYears;
        const totalInterest = Math.round(balance - invested);
        const maturityAge = childAge + maturityYears;
        const withdrawalAt18 = childAge < 18 ? timeline.find(t => t.age >= 18) : null;
        const withdrawalAmount = withdrawalAt18 ? Math.round(withdrawalAt18.balance * 0.5) : 0;

        return {
            invested,
            totalInterest,
            maturity: Math.round(balance),
            maturityAge,
            timeline,
            withdrawalAt18Year: withdrawalAt18 ? withdrawalAt18.year : null,
            withdrawalAmount,
        };
    }, [annual, rate, childAge]);

    // Pie chart
    const pieData = useMemo(() => ({
        labels: ['Total Invested', 'Interest Earned'],
        datasets: [{
            data: [result.invested, result.totalInterest],
            backgroundColor: ['#3B82F6', '#10B981'],
            borderColor: ['#1E293B', '#1E293B'],
            borderWidth: 2,
        }]
    }), [result]);

    // Year-wise bar chart
    const barData = useMemo(() => ({
        labels: result.timeline.map(t => `Yr ${t.year}`),
        datasets: [
            { label: 'Deposit', data: result.timeline.map(t => t.cumDeposit), backgroundColor: '#3B82F6' },
            { label: 'Interest', data: result.timeline.map(t => t.cumInterest), backgroundColor: '#10B981' },
        ]
    }), [result.timeline]);

    const handleSave = () => {
        addSaved({
            id: `ssy-${Date.now()}`,
            type: 'ssy',
            inputs: { annual, rate, childAge },
            result: { primary: result.maturity, label: 'Maturity Amount', invested: result.invested, returns: result.totalInterest },
            timestamp: Date.now(),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleDownloadPDF = () => {
        const chartCanvas = chartRef.current?.canvas;
        const img = chartCanvas ? chartCanvas.toDataURL('image/png') : undefined;
        exportToPDF(
            'Sukanya Samriddhi Yojana – Report',
            ['Parameter', 'Value'],
            [
                ['Annual Deposit', formatINR(annual)],
                ['Interest Rate', `${rate}%`],
                ['Child Age', `${childAge} years`],
                ['Deposit Period', `${investYears} years`],
                ['---', '---'],
                ['Total Invested', formatINR(result.invested)],
                ['Interest Earned', formatINR(result.totalInterest)],
                ['Maturity Amount', formatINR(result.maturity)],
                ['Maturity Age', `${result.maturityAge} years`],
            ],
            'SSY_Calculation',
            img,
            [
                { label: 'Invested', value: formatINR(result.invested), color: [59, 130, 246] },
                { label: 'Interest', value: formatINR(result.totalInterest), color: [16, 185, 129] },
            ]
        );
    };

    const handleDownloadExcel = () => {
        exportToExcel(
            ['Year', 'Age', 'Deposit', 'Interest', 'Balance', 'Cumulative Deposit', 'Cumulative Interest'],
            result.timeline.map(t => [t.year, t.age, t.deposit, t.interest, t.balance, t.cumDeposit, t.cumInterest]),
            'SSY_YearWise'
        );
    };

    const handleShare = async () => {
        const text = `🌸 My Sukanya Samriddhi Investment\n\n💰 Annual Deposit: ${formatINR(annual)}\n📈 Interest Rate: ${rate}%\n🎂 Child Age: ${childAge} years\n\n✅ Maturity Amount: ${formatINR(result.maturity)}\n📅 Maturity Age: ${result.maturityAge} years\n💰 Total Invested: ${formatINR(result.invested)}\n📊 Interest Earned: ${formatINR(result.totalInterest)}\n\nCalculated with FinCalix 🧮`;
        try {
            if (navigator.share) {
                await navigator.share({ title: 'SSY Calculation – FinCalix', text });
            } else {
                await navigator.clipboard.writeText(text);
                // Show toast
                const t = document.createElement('div');
                t.textContent = '✅ Copied to clipboard!';
                Object.assign(t.style, { position: 'fixed', bottom: '110px', left: '50%', transform: 'translateX(-50%)', background: '#10B981', color: '#fff', padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', zIndex: '99999' });
                document.body.appendChild(t);
                setTimeout(() => t.remove(), 3000);
            }
        } catch { }
    };

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-dark-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-white">Sukanya Samriddhi Yojana</h1>
                        <p className="text-slate-500 text-xs">Girl Child Savings Scheme</p>
                    </div>
                    <Heart size={20} className="text-pink-400" />
                </div>
            </div>

            <DisclaimerBanner type="calculator" />

            <div className="px-4 pb-28 pt-4 space-y-5">
                {/* Inputs */}
                <div className="space-y-3">
                    <NumberInput label="Annual Deposit" value={annual} onChange={setAnnual} min={250} max={150000} prefix="₹" helperText="Min ₹250, Max ₹1,50,000/year" />
                    <NumberInput label="Interest Rate (p.a.)" value={rate} onChange={setRate} min={1} max={15} suffix="%" step={0.1} helperText="Current rate: 8.2%" />
                    <NumberInput label="Girl Child Age" value={childAge} onChange={setChildAge} min={0} max={10} suffix=" years" helperText="Account can be opened until age 10" />
                </div>

                {/* Result Card */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-gradient-to-br from-pink-600/20 to-rose-600/20 border border-pink-500/20">
                    <p className="text-pink-300/60 text-[10px] font-bold uppercase tracking-wider mb-1">Maturity Amount</p>
                    <p className="text-3xl font-black text-white mb-4">{formatINR(result.maturity)}</p>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-slate-500 text-[10px] uppercase font-bold">Total Invested</p>
                            <p className="text-white font-bold text-sm">{formatINR(result.invested)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-[10px] uppercase font-bold">Interest Earned</p>
                            <p className="text-brand-green font-bold text-sm">{formatINR(result.totalInterest)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-[10px] uppercase font-bold">Maturity Age</p>
                            <p className="text-blue-400 font-bold text-sm">{result.maturityAge} years</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-[10px] uppercase font-bold">Returns Multiplier</p>
                            <p className="text-amber-400 font-bold text-sm">{(result.maturity / result.invested).toFixed(2)}x</p>
                        </div>
                    </div>

                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white font-bold text-sm">
                        <Save size={16} /> {saved ? '✅ Saved!' : 'Save Calculation'}
                    </motion.button>
                </motion.div>

                {/* Education Withdrawal Info */}
                {result.withdrawalAt18Year && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                        <div className="flex items-start gap-3">
                            <GraduationCap size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-white font-bold text-sm">Education Withdrawal at 18</h3>
                                <p className="text-slate-400 text-xs mt-1">After your child turns 18, you can withdraw up to <span className="text-blue-400 font-bold">50%</span> of the balance for higher education.</p>
                                <p className="text-blue-400 text-xs font-bold mt-1">Eligible amount: {formatINR(result.withdrawalAmount)}</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Max Deposit Info */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-white font-bold text-xs">Maximum Annual Deposit: ₹1,50,000</h3>
                            <p className="text-slate-400 text-[11px] mt-1">Minimum ₹250/year required to keep account active. Tax deduction under Section 80C available.</p>
                        </div>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="p-4 rounded-2xl bg-dark-card border border-dark-border">
                    <h3 className="text-white font-bold text-sm mb-3">Investment vs Interest</h3>
                    <div className="w-48 h-48 mx-auto">
                        <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: '#94A3B8', font: { size: 11 } } } } }} />
                    </div>
                </div>

                {/* Year-wise Growth Chart */}
                <div className="p-4 rounded-2xl bg-dark-card border border-dark-border">
                    <h3 className="text-white font-bold text-sm mb-3">Year-wise Growth</h3>
                    <div className="h-56">
                        <Bar
                            ref={chartRef}
                            data={barData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: { stacked: true, grid: { color: '#1E293B' }, ticks: { color: '#64748B', font: { size: 8 }, callback: (v: any) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K` } },
                                    x: { stacked: true, grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 8 }, maxRotation: 45 } }
                                },
                                plugins: { legend: { labels: { color: '#94A3B8', font: { size: 10 } } } }
                            }}
                        />
                    </div>
                </div>

                {/* Smart Insight */}
                <SmartInsight calculatorType="ppf" inputs={{ annual, rate }} results={{ maturity: result.maturity, invested: result.invested }} />

                {/* Year-wise Timeline Toggle */}
                <button onClick={() => setShowTimeline(!showTimeline)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-dark-card border border-dark-border text-white font-bold text-sm">
                    <span className="flex items-center gap-2"><Calendar size={16} className="text-slate-400" /> Year-wise Timeline</span>
                    {showTimeline ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>

                <AnimatePresence>
                    {showTimeline && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="rounded-2xl bg-dark-card border border-dark-border overflow-hidden">
                                <div className="grid grid-cols-5 text-[9px] font-bold text-slate-500 uppercase p-2 bg-slate-800/50">
                                    <span>Year</span><span>Age</span><span>Deposit</span><span>Interest</span><span>Balance</span>
                                </div>
                                {result.timeline.map((t, i) => (
                                    <div key={i} className={`grid grid-cols-5 text-[10px] p-2 ${i % 2 === 0 ? 'bg-dark-card' : 'bg-slate-800/20'} ${t.deposit === 0 ? 'text-slate-500' : 'text-slate-300'}`}>
                                        <span>{t.year}</span>
                                        <span>{t.age}</span>
                                        <span>{t.deposit > 0 ? formatINR(t.deposit) : '—'}</span>
                                        <span className="text-brand-green">{formatINR(t.interest)}</span>
                                        <span className="font-bold text-white">{formatINR(t.balance)}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scheme Rules Toggle */}
                <button onClick={() => setShowRules(!showRules)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-dark-card border border-dark-border text-white font-bold text-sm">
                    <span className="flex items-center gap-2"><BookOpen size={16} className="text-slate-400" /> SSY Scheme Rules</span>
                    {showRules ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>

                <AnimatePresence>
                    {showRules && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-4 rounded-2xl bg-dark-card border border-dark-border space-y-3">
                                {[
                                    { icon: Shield, title: 'Eligibility', desc: 'Girl child below 10 years. Max 2 accounts per family.' },
                                    { icon: Calendar, title: 'Tenure', desc: 'Deposit for 15 years. Account matures 21 years from opening.' },
                                    { icon: AlertCircle, title: 'Deposit Limits', desc: 'Minimum ₹250/year, Maximum ₹1,50,000/year.' },
                                    { icon: GraduationCap, title: 'Partial Withdrawal', desc: '50% withdrawal after child turns 18, for higher education only.' },
                                    { icon: Heart, title: 'Tax Benefits', desc: 'Deposits qualify for 80C deduction. Interest and maturity are tax-free (EEE status).' },
                                    { icon: Info, title: 'Premature Closure', desc: 'Allowed after 5 years in case of medical emergency or death of account holder.' },
                                ].map((rule, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <rule.icon size={16} className="text-pink-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-white font-bold text-xs">{rule.title}</p>
                                            <p className="text-slate-400 text-[11px]">{rule.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Export & Share Buttons */}
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={handleDownloadPDF} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-dark-card border border-dark-border text-slate-400 text-[10px] font-medium">
                        <Download size={16} /> PDF
                    </button>
                    <button onClick={handleDownloadExcel} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-dark-card border border-dark-border text-slate-400 text-[10px] font-medium">
                        <Download size={16} /> Excel
                    </button>
                    <button onClick={handleShare} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white text-[10px] font-bold">
                        <Share2 size={16} /> Share
                    </button>
                </div>

                {/* Shareable Result Card */}
                <ShareableCard
                    title="My Sukanya Samriddhi Investment"
                    highlight={formatINR(result.maturity)}
                    subtitle={`will grow in ${maturityYears} years at ${rate}% p.a.`}
                    details={[
                        { label: 'Annual Deposit', value: formatINR(annual) },
                        { label: 'Total Invested', value: formatINR(result.invested) },
                        { label: 'Interest Earned', value: formatINR(result.totalInterest) },
                        { label: 'Maturity Age', value: `${result.maturityAge} years` },
                    ]}
                    gradient="from-pink-600 via-rose-500 to-red-500"
                />
            </div>
        </div>
    );
}