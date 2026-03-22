import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';

import { calculateCompoundInterest, formatINR } from '../utils/calculations';
import { useAuthStore } from '../store/useAuthStore';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import { AnalyticsService } from '../lib/analytics';

export default function CompoundInterestCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('Compound_Interest'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const [principal, setPrincipal] = useState(100000);
    const [rate, setRate] = useState(8);
    const [years, setYears] = useState(10);
    const [freq, setFreq] = useState(4); const [showInfo, setShowInfo] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const result = useMemo(() => calculateCompoundInterest(principal, rate, years, freq), [principal, rate, years, freq]);
    const interestPct = result.amount > 0 ? (result.interest / result.amount) * 100 : 0;

    // Advanced computations – all memoized
    const advanced = useMemo(() => {
        const ear = (Math.pow(1 + rate / 100 / freq, freq) - 1) * 100;
        const rule72 = rate > 0 ? 72 / rate : 0;
        const table: { year: number; value: number; interest: number }[] = [];
        for (let y = 1; y <= years; y++) {
            const v = principal * Math.pow(1 + rate / 100 / freq, freq * y);
            table.push({ year: y, value: v, interest: v - principal });
        }
        return { ear, rule72, table };
    }, [principal, rate, years, freq]);

    const handleDownloadPDF = () => {
        const headers = ['Metric', 'Value'];
        const data = [
            ['Principal', formatINR(principal)],
            ['Annual Rate', `${rate}%`],
            ['Time Period', `${years} years`],
            ['Compounding Frequency', freqOptions.find(o => o.val === freq)?.label || ''],
            ['---', '---'],
            ['Total Amount', formatINR(result.amount)],
            ['Interest Earned', formatINR(result.interest)]
        ];
        exportToPDF('Compound Interest Report', headers, data, 'CI_Report');
    };

    const handleDownloadExcel = () => {
        const headers = ['Metric', 'Value'];
        const data = [
            ['Principal', principal],
            ['Annual Rate', rate],
            ['Time Period', years],
            ['Compounding Frequency', freq],
            ['Total Amount', result.amount],
            ['Interest Earned', result.interest]
        ];
        exportToExcel(headers, data, 'CI_Report');
    };

    const freqOptions = [
        { label: 'Yearly', val: 1 },
        { label: 'Half-Yr', val: 2 },
        { label: 'Qtrly', val: 4 },
        { label: 'Monthly', val: 12 },
    ];

    return (
        <div className="min-h-dvh bg-background animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background  px-4 pt-14 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                            <ArrowLeft size={18} className="text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Compound Interest</h1>
                            <p className="text-muted-foreground text-xs">Calculate compound growth</p>
                        </div>
                    </div>
                    <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-card border border-border">
                        <Info size={16} className="text-muted-foreground" />
                    </button>
                </div>
            </div>

            
            <DisclaimerComponent module="general" />

            <div className="px-4 pb-28">
                <div className="flex rounded-2xl bg-card border border-border p-1 my-5">
                    {freqOptions.map((opt) => (
                        <button
                            key={opt.val}
                            onClick={() => setFreq(opt.val)}
                            className={`flex-1 py-2.5 rounded-xl text-[11px] font-medium transition-all ${freq === opt.val ? 'bg-brand-purple text-white' : 'text-muted-foreground'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-3 mb-5">
                    <NumberInput label="Principal Amount" value={principal} onChange={setPrincipal} min={1000} max={10000000} prefix="₹" helperText="₹1,000 - ₹1,00,00,000" />
                    <NumberInput label="Annual Rate" value={rate} onChange={setRate} min={1} max={25} suffix="%" step={0.1} helperText="1% - 25%" />
                    <NumberInput label="Time Period (years)" value={years} onChange={setYears} min={1} max={30} suffix=" years" helperText="1 - 30 years" />
                </div>

                <motion.div layout className="p-5 rounded-2xl bg-card border border-border mb-4">
                    <div className="text-center mb-4">
                        <p className="text-muted-foreground text-sm mb-1">Total Amount</p>
                        <motion.p key={result.amount} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-bold text-brand-purple">
                            {formatINR(result.amount)}
                        </motion.p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-background text-center">
                            <p className="text-muted-foreground text-xs mb-1">Principal</p>
                            <p className="text-foreground font-bold text-sm">{formatINR(principal)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-background text-center">
                            <p className="text-muted-foreground text-xs mb-1">Interest Earned</p>
                            <p className="text-brand-green font-bold text-sm">{formatINR(result.interest)}</p>
                        </div>
                    </div>
                    <div className="w-full h-3 rounded-full bg-background overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            style={{ background: 'linear-gradient(90deg, #8B5CF6, #10B981)' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${interestPct}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                    <div className="flex justify-between mt-2">
                        <span className="text-muted-foreground text-[10px]">Principal ({(100 - interestPct).toFixed(0)}%)</span>
                        <span className="text-muted-foreground text-[10px]">Interest ({interestPct.toFixed(0)}%)</span>
                    </div>

                    {/* Village-style Interest Breakdown */}
                    <div className="mt-4 pt-3 border-t border-border space-y-2">
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-2">Village / Monthly Breakdown</p>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Monthly Interest Payable</span>
                            <span className="text-brand-blue font-semibold text-sm">{formatINR(result.interest / (years * 12))}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Village Rate (per ₹100/month)</span>
                            <span className="text-amber-400 font-semibold text-sm">₹{(rate / 12).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Interest per ₹1 Lakh/month</span>
                            <span className="text-brand-purple font-semibold text-sm">{formatINR((100000 * rate) / (100 * 12))}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Advanced Details */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                            <Info size={16} className="text-brand-purple" />
                            <span className="text-foreground font-semibold text-sm">Advanced Details</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </button>
                    <AnimatePresence initial={false}>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                <div className="px-4 pb-4 space-y-4">
                                    <div className="h-px bg-border" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-center">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Effective Annual Rate</p>
                                            <p className="text-brand-purple font-bold text-xl">{advanced.ear.toFixed(3)}%</p>
                                            <p className="text-muted-foreground text-[10px] mt-0.5">True annualised yield</p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-brand-gold/10 border border-brand-gold/20 text-center">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Rule of 72</p>
                                            <p className="text-brand-gold font-bold text-xl">{advanced.rule72.toFixed(1)}y</p>
                                            <p className="text-muted-foreground text-[10px] mt-0.5">Approx. doubling time</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Year-by-Year Compounding</p>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-3 bg-muted px-3 py-2">
                                                {['Year', 'Total Value', 'Cum. Interest'].map(h => (<p key={h} className="text-muted-foreground text-[10px] font-bold uppercase">{h}</p>))}
                                            </div>
                                            {advanced.table.map((row, i) => (
                                                <div key={row.year} className={`grid grid-cols-3 px-3 py-2 ${i % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                                                    <p className="text-foreground text-[10px] font-medium">Year {row.year}</p>
                                                    <p className="text-foreground text-[10px] font-semibold">{formatINR(row.value)}</p>
                                                    <p className="text-brand-green text-[10px] font-semibold">+{formatINR(row.interest)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>



                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-card border border-border text-muted-foreground font-medium text-xs"
                    >
                        📄 Download PDF
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-card border border-border text-muted-foreground font-medium text-xs"
                    >
                        📊 Download Excel
                    </button>
                </div>


                <CalculatorInfoModal
                    isOpen={showInfo}
                    onClose={() => setShowInfo(false)}
                    calculatorTitle="Compound Interest"
                />
            </div>
        </div>
    );
}
