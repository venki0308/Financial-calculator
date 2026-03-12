import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import FinancialQuote from '../components/FinancialQuote';
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
 const result = useMemo(() => calculateCompoundInterest(principal, rate, years, freq), [principal, rate, years, freq]);
 const interestPct = result.amount > 0 ? (result.interest / result.amount) * 100 : 0;

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
 <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg px-4 pt-14 pb-3">
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

 <FinancialQuote />
 <DisclaimerComponent module="investment" />

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