import { useState, useMemo, useRef, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, BarChart3, FileText, Save, Check, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useAuthStore } from '../store/useAuthStore';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import {
 Chart as ChartJS,
 CategoryScale,
 LinearScale,
 BarElement,
 PointElement,
 LineElement,
 Title,
 Tooltip,
 Legend,
 ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import DisclaimerComponent from '../components/DisclaimerComponent';
import FinancialQuote from '../components/FinancialQuote';
import { AnalyticsService } from '../lib/analytics';

ChartJS.register(
 CategoryScale,
 LinearScale,
 BarElement,
 PointElement,
 LineElement,
 Title,
 Tooltip,
 Legend,
 ArcElement
);

export default function AdvancedSIPCalculator() {
 useEffect(() => { AnalyticsService.trackScreen('Advanced_SIP'); }, []);
 const { t } = useTranslation();
 const navigate = useNavigate();
 const { addHistory, addSaved, savedCalculations } = useCalculatorStore();
 const [activeTab, setActiveTab] = useState<'input' | 'report' | 'graph'>('input');
 const [monthly, setMonthly] = useState('5000');
 const [rate, setRate] = useState('12');
 const [years, setYears] = useState('10');
 const [saved, setSaved] = useState(false);
 const chartRef = useRef<any>(null);

 const result = useMemo(() => {
 const P = Number(monthly), r = Number(rate) / 100 / 12, n = Number(years) * 12;
 if (!P || !r || !n) return null;
 const fv = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
 const invested = P * n;
 const returns = fv - invested;

 const yearlyData = [];
 for (let y = 1; y <= Number(years); y++) {
 const months = y * 12;
 const value = P * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
 yearlyData.push({
 year: y,
 invested: Math.round(P * months),
 value: Math.round(value),
 returns: Math.round(value - P * months)
 });
 }
 return { invested, returns: Math.round(returns), totalValue: Math.round(fv), yearlyData };
 }, [monthly, rate, years]);

 const handleSave = () => {
 if (!result) return;
 addSaved({
 id: `AdvSIP-${Date.now()}`,
 calculatorType: 'Advanced SIP Calculator',
 inputValues: { monthly, rate, years },
 resultValues: { primary: result.totalValue, ...result },
 timestamp: Date.now()
 });
 setSaved(true);
 };

 const isAlreadySaved = useMemo(() => {
 return savedCalculations.some(s => s.calculatorType === 'Advanced SIP Calculator' && JSON.stringify(s.inputValues) === JSON.stringify({ monthly, rate, years }));
 }, [savedCalculations, monthly, rate, years]);

 const handleDownloadPDF = async () => {
 if (!result) return;

 let chartImage = undefined;
 if (chartRef.current) {
 chartImage = chartRef.current.toBase64Image();
 }

 const headers = ['Year', 'Invested Amount', 'Est. Returns', 'Total Value'];
 const data = result.yearlyData.map(d => [
 d.year.toString(),
 formatINR(d.invested),
 formatINR(d.returns),
 formatINR(d.value)
 ]);

 await exportToPDF('Advanced SIP Report', headers, data, 'Advanced_SIP_Report', chartImage);
 };

 const handleDownloadExcel = async () => {
 if (!result) return;
 await exportToExcel(['Year', 'Invested', 'Returns', 'Value'], result.yearlyData.map(d => [d.year, d.invested, d.returns, d.value]), 'Adv_SIP');
 };

 const barChartData = {
 labels: result?.yearlyData.map(d => `Yr ${d.year}`) || [],
 datasets: [
 {
 label: 'Invested',
 data: result?.yearlyData.map(d => d.invested) || [],
 backgroundColor: '#3B82F6',
 },
 {
 label: 'Returns',
 data: result?.yearlyData.map(d => d.returns) || [],
 backgroundColor: '#10B981',
 }
 ]
 };

 return (
 <div className="min-h-dvh bg-background animate-fade-in">
 <div className="px-4 pt-14 pb-8">
 <div className="flex items-center gap-3 mb-5">
 <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
 <ArrowLeft size={18} className="text-muted-foreground" />
 </button>
 <div>
 <h1 className="text-lg font-bold text-foreground">Advanced SIP</h1>
 <p className="text-muted-foreground text-xs">Mutual Fund growth with yearly breakdown</p>
 </div>
 </div>

 <FinancialQuote />
 <DisclaimerComponent module="sip" />

 {/* Tab bar */}
 <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-5">
 {[
 { key: 'input', label: 'Inputs', icon: TrendingUp },
 { key: 'report', label: 'Report', icon: FileText },
 { key: 'graph', label: 'Growth', icon: BarChart3 },
 ].map(tab => (
 <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
 className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all ${activeTab === tab.key ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-muted-foreground'}`}>
 <tab.icon size={14} />{tab.label}
 </button>
 ))}
 </div>

 {activeTab === 'input' && (
 <div className="space-y-4">
 <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
 <InputField label="Monthly Investment" value={monthly} onChange={setMonthly} prefix="₹" />
 <InputField label="Expected Return (p.a)" value={rate} onChange={setRate} suffix="%" />
 <InputField label="Time Period" value={years} onChange={setYears} suffix="Years" />
 </div>

 {result && (
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
 className="bg-gradient-to-br from-brand-purple/10 to-brand-blue/10 border border-brand-purple/20 rounded-2xl p-5">
 <div className="text-center mb-6">
 <p className="text-foreground/60 text-xs mb-1">Estimated Future Value</p>
 <p className="text-3xl font-bold text-foreground">{formatINR(result.totalValue)}</p>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="p-3 rounded-xl bg-black/20 text-center">
 <p className="text-foreground/40 text-[10px] uppercase font-bold mb-1">Invested</p>
 <p className="text-foreground font-bold text-sm">{formatINR(result.invested)}</p>
 </div>
 <div className="p-3 rounded-xl bg-black/20 text-center">
 <p className="text-foreground/40 text-[10px] uppercase font-bold mb-1">Returns</p>
 <p className="text-brand-green font-bold text-sm">{formatINR(result.returns)}</p>
 </div>
 </div>
 </motion.div>
 )}

 <motion.button
 whileTap={{ scale: 0.97 }}
 onClick={handleSave}
 disabled={saved || isAlreadySaved}
 className={`w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${saved || isAlreadySaved
 ? 'bg-brand-green/10 text-brand-green border border-brand-green/20'
 : 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
 }`}
 >
 {saved || isAlreadySaved ? <><Check size={18} /> Saved</> : <><Save size={18} /> Save Calculation</>}
 </motion.button>

 <div className="grid grid-cols-2 gap-3 mb-8">
 <button onClick={handleDownloadPDF} className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-purple/10 border-2 border-brand-purple/40 text-brand-purple font-bold text-sm">
 📄 Download PDF
 </button>
 <button onClick={handleDownloadExcel}
 className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-green/10 border-2 border-brand-green/40 text-brand-green font-bold text-sm">
 📊 Download Excel
 </button>
 </div>
 </div>
 )}

 {activeTab === 'report' && result && (
 <div className="bg-card border border-border rounded-2xl p-4 overflow-hidden">
 <h3 className="text-foreground font-bold text-sm mb-4">Yearly Breakdown</h3>
 <div className="overflow-x-auto">
 <table className="w-full text-xs">
 <thead>
 <tr className="text-muted-foreground border-b border-border text-left">
 <th className="py-2">Year</th>
 <th className="py-2 text-right">Invested</th>
 <th className="py-2 text-right">Returns</th>
 <th className="py-2 text-right">Value</th>
 </tr>
 </thead>
 <tbody>
 {result.yearlyData.map((row) => (
 <tr key={row.year} className="border-b border-border/30">
 <td className="py-2.5 text-muted-foreground">{row.year}</td>
 <td className="py-2.5 text-right text-foreground">{formatINR(row.invested).replace('₹', '')}</td>
 <td className="py-2.5 text-right text-brand-green">{formatINR(row.returns).replace('₹', '')}</td>
 <td className="py-2.5 text-right text-foreground font-bold">{formatINR(row.value).replace('₹', '')}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {activeTab === 'graph' && result && (
 <div className="bg-card border border-border rounded-2xl p-4">
 <h3 className="text-foreground font-bold text-sm mb-6">Growth Visualization</h3>
 <div className="h-64">
 <Bar
 ref={chartRef}
 data={barChartData}
 options={{
 responsive: true,
 maintainAspectRatio: false,
 scales: {
 y: { grid: { color: '#1E293B' }, ticks: { color: '#64748B', font: { size: 10 } } },
 x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 10 } } }
 },
 plugins: { legend: { display: false } }
 }}
 />
 </div>
 <div className="flex gap-4 mt-6 justify-center">
 <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <span className="w-2.5 h-2.5 bg-brand-blue rounded-full" /> Invested
 </span>
 <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <span className="w-2.5 h-2.5 bg-brand-green rounded-full" /> Returns
 </span>
 </div>
 </div>
 )}

 <div className="mt-6">
 </div>
 </div>
 </div>
 );
}

function InputField({ label, value, onChange, prefix, suffix }: { label: string; value: string; onChange: (v: string) => void; prefix?: string; suffix?: string }) {
 return (
 <div>
 <label className="text-xs text-muted-foreground mb-2 block">{label}</label>
 <div className="relative">
 {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{prefix}</span>}
 <input type="number" value={value} onChange={e => onChange(e.target.value)}
 className={`w-full bg-dark-bg border border-border rounded-xl py-3.5 text-foreground text-sm focus:outline-none focus:border-brand-purple transition-all ${prefix ? 'pl-9 pr-4' : suffix ? 'pl-4 pr-16' : 'px-4'}`} />
 {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">{suffix}</span>}
 </div>
 </div>
 );
}