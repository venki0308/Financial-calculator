import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Info, Download, Share2, Shield, Calendar, TrendingUp, IndianRupee, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { nativeShare } from '../utils/nativeShare';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement,
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import FinancialQuote from '../components/FinancialQuote';
import SmartInsight from '../components/SmartInsight';
import ShareableCard from '../components/ShareableCard';
import WhatIfSimulator from '../components/WhatIfSimulator';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import { AnalyticsService } from '../lib/analytics';
import { useCalculatorStore } from '../store/useCalculatorStore';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

interface YearEntry { year: number; age: number; contrib: number; corpus: number; cumContrib: number; }

export default function NPSCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('NPS_Calculator_Advanced'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const { addSaved } = useCalculatorStore();
    const chartRef = useRef<any>(null);

    const [monthly, setMonthly] = useState(5000);
    const [rate, setRate] = useState(10);
    const [age, setAge] = useState(30);
    const [retireAge, setRetireAge] = useState(60);
    const [annuityPct, setAnnuityPct] = useState(40);
    const [showTimeline, setShowTimeline] = useState(false);
    const [showTaxInfo, setShowTaxInfo] = useState(false);
    const [saved, setSaved] = useState(false);

    const result = useMemo(() => {
        const years = Math.max(retireAge - age, 1);
        const r = rate / 12 / 100;
        const n = years * 12;
        const invested = monthly * n;
        const fv = r === 0 ? invested : monthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
        const annuity = fv * (annuityPct / 100);
        const lumpsum = fv - annuity;
        const monthlyPension = annuity * 0.06 / 12;

        const timeline: YearEntry[] = [];
        let cumContrib = 0;
        for (let y = 1; y <= years; y++) {
            const nY = y * 12;
            cumContrib += monthly * 12;
            const corpus = r === 0 ? cumContrib : monthly * (((Math.pow(1 + r, nY) - 1) / r) * (1 + r));
            timeline.push({ year: y, age: age + y, contrib: monthly * 12, corpus: Math.round(corpus), cumContrib });
        }

        return { invested, corpus: Math.round(fv), wealthGained: Math.round(fv - invested), annuity: Math.round(annuity), lumpsum: Math.round(lumpsum), monthlyPension: Math.round(monthlyPension), years, timeline };
    }, [monthly, rate, age, retireAge, annuityPct]);

    const pieData = useMemo(() => ({
        labels: ['Total Invested', 'Wealth Gained'],
        datasets: [{ data: [result.invested, result.wealthGained], backgroundColor: ['#3B82F6', '#10B981'], borderColor: ['#1E293B', '#1E293B'], borderWidth: 2 }]
    }), [result]);

    const corpusChart = useMemo(() => ({
        labels: result.timeline.map(t => `Age ${t.age}`),
        datasets: [
            { label: 'Corpus', data: result.timeline.map(t => t.corpus), borderColor: '#10B981', backgroundColor: '#10B98130', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 },
            { label: 'Invested', data: result.timeline.map(t => t.cumContrib), borderColor: '#3B82F6', backgroundColor: '#3B82F630', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 },
        ]
    }), [result.timeline]);

    const handleSave = () => {
        addSaved({ id: `nps-${Date.now()}`, calculatorType: 'NPS Calculator', inputValues: { monthly, rate, age, retireAge, annuityPct }, resultValues: { primary: result.corpus }, timestamp: Date.now() });
        setSaved(true); setTimeout(() => setSaved(false), 2000);
    };

    const handleDownloadPDF = () => {
        exportToPDF('NPS Retirement Report', ['Parameter', 'Value'], [
            ['Monthly Contribution', formatINR(monthly)], ['Expected Return', `${rate}%`], ['Current Age', `${age}`], ['Retirement Age', `${retireAge}`],
            ['Annuity %', `${annuityPct}%`], ['---', '---'],
            ['Total Invested', formatINR(result.invested)], ['Total Corpus', formatINR(result.corpus)], ['Wealth Gained', formatINR(result.wealthGained)],
            ['Lumpsum', formatINR(result.lumpsum)], ['Annuity Investment', formatINR(result.annuity)], ['Est. Monthly Pension', formatINR(result.monthlyPension)],
        ], 'NPS_Report', undefined, [
            { label: 'Invested', value: formatINR(result.invested), color: [59, 130, 246] },
            { label: 'Wealth Gained', value: formatINR(result.wealthGained), color: [16, 185, 129] },
            { label: 'Monthly Pension', value: formatINR(result.monthlyPension), color: [245, 158, 11] },
        ]);
    };

    const handleDownloadExcel = () => {
        exportToExcel(
            ['Year', 'Age', 'Annual Contribution', 'Cumulative Contribution', 'Corpus'],
            result.timeline.map(t => [t.year, t.age, t.contrib, t.cumContrib, t.corpus]),
            'NPS_Timeline'
        );
    };

    const handleShare = async () => {
        const text = `🏦 My NPS Retirement Plan\n\n💰 Monthly: ${formatINR(monthly)}\n📈 Rate: ${rate}%\n🎂 Age: ${age} → ${retireAge}\n\n✅ Corpus: ${formatINR(result.corpus)}\n💵 Monthly Pension: ${formatINR(result.monthlyPension)}\n\nCalculated with FinCalix 🧮`;
        await nativeShare('NPS Plan – FinCalix', text);
    };

    return (
        <div className="min-h-dvh bg-background animate-fade-in">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border"><ArrowLeft size={18} className="text-muted-foreground" /></button>
                    <div className="flex-1"><h1 className="text-lg font-bold text-foreground">NPS Calculator</h1><p className="text-muted-foreground text-xs">National Pension System</p></div>
                </div>
            </div>
            <div className="px-4 pb-28 pt-4 space-y-5">
                <div className="space-y-3">
                    <NumberInput label="Monthly Contribution" value={monthly} onChange={setMonthly} min={500} max={200000} prefix="₹" />
                    <NumberInput label="Expected Return (p.a.)" value={rate} onChange={setRate} min={4} max={14} suffix="%" step={0.5} />
                    <NumberInput label="Current Age" value={age} onChange={setAge} min={18} max={55} suffix=" years" />
                    <NumberInput label="Retirement Age" value={retireAge} onChange={setRetireAge} min={55} max={70} suffix=" years" />
                    <NumberInput label="Annuity Purchase (%)" value={annuityPct} onChange={setAnnuityPct} min={40} max={100} suffix="%" helperText="Min 40% must buy annuity" />
                </div>

                {/* Result Card */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20">
                    <p className="text-blue-300/60 text-[10px] font-bold uppercase tracking-wider mb-1">Total Corpus at Retirement</p>
                    <p className="text-3xl font-black text-foreground mb-4">{formatINR(result.corpus)}</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-muted-foreground text-[10px] uppercase font-bold">Total Invested</p><p className="text-foreground font-bold text-sm">{formatINR(result.invested)}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase font-bold">Wealth Gained</p><p className="text-brand-green font-bold text-sm">{formatINR(result.wealthGained)}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase font-bold">Lumpsum at 60</p><p className="text-blue-400 font-bold text-sm">{formatINR(result.lumpsum)}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase font-bold">Monthly Pension</p><p className="text-amber-400 font-bold text-sm">{formatINR(result.monthlyPension)}</p></div>
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-foreground font-bold text-sm">
                        <Save size={16} /> {saved ? '✅ Saved!' : 'Save Calculation'}
                    </motion.button>
                </motion.div>

                {/* Pension Visualization */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <h3 className="text-foreground font-bold text-sm mb-2 flex items-center gap-2"><IndianRupee size={16} className="text-amber-400" /> Retirement Income Projection</h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-slate-800/50">
                            <p className="text-muted-foreground text-[9px] uppercase font-bold">Monthly Pension</p>
                            <p className="text-amber-400 font-bold text-lg">{formatINR(result.monthlyPension)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-800/50">
                            <p className="text-muted-foreground text-[9px] uppercase font-bold">Annual Pension</p>
                            <p className="text-amber-400 font-bold text-lg">{formatINR(result.monthlyPension * 12)}</p>
                        </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-800/50">
                        <p className="text-muted-foreground text-[9px] uppercase font-bold">Annuity Investment</p>
                        <p className="text-foreground font-bold text-sm">{formatINR(result.annuity)} <span className="text-muted-foreground text-xs">({annuityPct}% of corpus → ~6% annuity rate)</span></p>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="p-4 rounded-2xl bg-card border border-border">
                    <h3 className="text-foreground font-bold text-sm mb-3">Investment vs Returns</h3>
                    <div className="w-48 h-48 mx-auto"><Pie data={pieData} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: '#94A3B8', font: { size: 11 } } } } }} /></div>
                </div>

                {/* Corpus Growth Line Chart */}
                <div className="p-4 rounded-2xl bg-card border border-border">
                    <h3 className="text-foreground font-bold text-sm mb-3">Corpus Growth Timeline</h3>
                    <div className="h-56">
                        <Line ref={chartRef} data={corpusChart} options={{
                            responsive: true, maintainAspectRatio: false,
                            scales: {
                                y: { grid: { color: '#1E293B' }, ticks: { color: '#64748B', font: { size: 8 }, callback: (v: any) => v >= 10000000 ? `${(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K` } },
                                x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 8 }, maxTicksLimit: 8 } },
                            },
                            plugins: { legend: { labels: { color: '#94A3B8', font: { size: 10 } } } }
                        }} />
                    </div>
                </div>

                {/* What-If Simulator */}
                <WhatIfSimulator
                    sliders={[
                        { key: 'monthly', label: 'Monthly Contribution', min: 500, max: 100000, step: 500, prefix: '₹' },
                        { key: 'rate', label: 'Expected Return', min: 6, max: 14, step: 0.5, suffix: '%' },
                    ]}
                    currentInputs={{ monthly, rate, years: result.years }}
                    calculateResult={(inputs) => {
                        const r = inputs.rate / 12 / 100;
                        const n = inputs.years * 12;
                        return r === 0 ? inputs.monthly * n : Math.round(inputs.monthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r)));
                    }}
                    resultLabel="Total Corpus"
                />

                <SmartInsight calculatorType="nps" inputs={{ monthly, rate, years: result.years }} results={{ corpus: result.corpus, invested: result.invested }} />

                {/* Tax Benefit Section */}
                <button onClick={() => setShowTaxInfo(!showTaxInfo)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm">
                    <span className="flex items-center gap-2"><Shield size={16} className="text-green-400" /> Tax Benefits Summary</span>
                    {showTaxInfo ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                    {showTaxInfo && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                                {[
                                    { title: 'Section 80CCD(1)', desc: 'Employee contribution: Deduction up to 10% of salary (max ₹1.5L under 80C umbrella).' },
                                    { title: 'Section 80CCD(1B)', desc: 'Additional ₹50,000 deduction exclusively for NPS, beyond the 80C limit.' },
                                    { title: 'Section 80CCD(2)', desc: "Employer contribution: Up to 14% of salary (Central Govt) or 10% (others) — no upper cap under 80C." },
                                    { title: 'Tax-free Lumpsum', desc: '60% of corpus at retirement is tax-free. Only annuity income is taxed as per slab.' },
                                    { title: 'Total Potential Saving', desc: `Up to ₹${Math.min(monthly * 12, 200000).toLocaleString('en-IN')} per year in tax deductions.` },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <Shield size={14} className="text-green-400 flex-shrink-0 mt-1" />
                                        <div><p className="text-foreground font-bold text-xs">{item.title}</p><p className="text-muted-foreground text-[11px]">{item.desc}</p></div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Year-wise Timeline */}
                <button onClick={() => setShowTimeline(!showTimeline)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm">
                    <span className="flex items-center gap-2"><Calendar size={16} className="text-muted-foreground" /> Year-wise Timeline</span>
                    {showTimeline ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                    {showTimeline && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="rounded-2xl bg-card border border-border overflow-hidden">
                                <div className="grid grid-cols-4 text-[9px] font-bold text-muted-foreground uppercase p-2 bg-slate-800/50"><span>Year</span><span>Age</span><span>Contrib.</span><span>Corpus</span></div>
                                {result.timeline.map((t, i) => (
                                    <div key={i} className={`grid grid-cols-4 text-[10px] p-2 ${i % 2 === 0 ? 'bg-card' : 'bg-slate-800/20'} text-slate-300`}>
                                        <span>{t.year}</span><span>{t.age}</span><span>{formatINR(t.cumContrib)}</span><span className="font-bold text-foreground">{formatINR(t.corpus)}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Export & Share */}
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={handleDownloadPDF} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-muted-foreground text-[10px] font-medium"><Download size={16} /> PDF</button>
                    <button onClick={handleDownloadExcel} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-muted-foreground text-[10px] font-medium"><Download size={16} /> Excel</button>
                    <button onClick={handleShare} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-bold"><Share2 size={16} /> Share</button>
                </div>

                <ShareableCard
                    title="My NPS Retirement Plan"
                    highlight={formatINR(result.corpus)}
                    subtitle={`Corpus at age ${retireAge} with ${rate}% returns`}
                    details={[
                        { label: 'Monthly SIP', value: formatINR(monthly) },
                        { label: 'Monthly Pension', value: formatINR(result.monthlyPension) },
                        { label: 'Total Invested', value: formatINR(result.invested) },
                        { label: 'Wealth Gained', value: formatINR(result.wealthGained) },
                    ]}
                    gradient="from-blue-600 via-indigo-600 to-violet-600"
                />

                <FinancialQuote />
                <DisclaimerComponent module="government" />
            </div>
        </div>
    );
}