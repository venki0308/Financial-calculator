import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Save, Check, Download } from 'lucide-react';
import { motion } from 'framer-motion';
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
import { Pie } from 'react-chartjs-2';
import NumberInput from '../components/NumberInput';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { calculateFD, formatINR } from '../utils/calculations';
import { useAuthStore } from '../store/useAuthStore';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import { AnalyticsService } from '../lib/analytics';

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

export default function FDCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('FD_Calculator'); }, []);
    const navigate = useNavigate();
    const { addSaved, savedCalculations } = useCalculatorStore();
    const [principal, setPrincipal] = useState(100000);
    const [rate, setRate] = useState(7);
    const [years, setYears] = useState(5);
    const [compounding, setCompounding] = useState<number>(4); const [saved, setSaved] = useState(false);

    const chartRef = useRef<any>(null);

    const result = useMemo(() => calculateFD(principal, rate, years, compounding), [principal, rate, years, compounding]);

    const chartData = {
        labels: ['Invested', 'Interest Earned'],
        datasets: [{
            data: [principal, result.interest],
            backgroundColor: ['#4F46E5', '#10B981'],
            borderColor: ['#4F46E540', '#10B98140'],
            borderWidth: 1,
        }]
    };

    const handleSave = () => {
        addSaved({
            id: `FD-${Date.now()}`,
            type: 'FD Calculator',
            inputs: { principal, rate, years, compounding },
            result: { primary: result.amount, ...result },
            timestamp: Date.now()
        });
        setSaved(true);
    };

    const isAlreadySaved = useMemo(() => {
        return savedCalculations.some(s => s.type === 'FD Calculator' && JSON.stringify(s.inputs) === JSON.stringify({ principal, rate, years, compounding }));
    }, [savedCalculations, principal, rate, years, compounding]);

    const handleDownloadPDF = async () => {
        let chartImage: string | undefined = undefined;
        if (chartRef.current) {
            await new Promise(r => setTimeout(r, 100));
            try { chartImage = chartRef.current.toBase64Image('image/png', 1.0); } catch { /* ignore */ }
        }
        const headers = ['Metric', 'Value'];
        const data = [
            ['Deposit Amount', formatINR(principal)],
            ['Interest Rate', `${rate}%`],
            ['Tenure', `${years} years`],
            ['Compounding', compounding === 4 ? 'Quarterly' : compounding === 12 ? 'Monthly' : 'Yearly'],
            ['---', '---'],
            ['Total Invested', formatINR(principal)],
            ['Interest Earned', formatINR(result.interest)],
            ['Maturity Amount', formatINR(result.amount)]
        ];
        const chartSummary = [
            { label: 'Invested', value: formatINR(principal), color: [79, 70, 229] as [number, number, number] },
            { label: 'Interest', value: formatINR(result.interest), color: [16, 185, 129] as [number, number, number] },
            { label: 'Maturity', value: formatINR(result.amount), color: [245, 158, 11] as [number, number, number] },
        ];
        exportToPDF('FD Maturity Report', headers, data, 'FD_Report', chartImage, chartSummary);
    };

    const handleDownloadExcel = () => {
        const headers = ['Metric', 'Value'];
        const data = [
            ['Deposit Amount', principal],
            ['Interest Rate', rate],
            ['Tenure', years],
            ['Compounding Frequency (per year)', compounding],
            ['Total Invested', principal],
            ['Interest Earned', result.interest],
            ['Maturity Amount', result.amount]
        ];
        exportToExcel(headers, data, 'FD_Report');
    };

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in">
            <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-dark-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-white">FD Calculator</h1>
                        <p className="text-slate-500 text-xs">Fixed Deposit returns</p>
                    </div>
                </div>
            </div>

            <DisclaimerBanner type="calculator" />

            <div className="px-4 pb-28 pt-4">
                <div className="flex rounded-2xl bg-dark-card border border-dark-border p-1 mb-5">
                    {([
                        { label: 'Quarterly', val: 4 },
                        { label: 'Monthly', val: 12 },
                        { label: 'Yearly', val: 1 },
                    ] as const).map((opt) => (
                        <button
                            key={opt.val}
                            onClick={() => setCompounding(opt.val)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${compounding === opt.val ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-slate-500'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-4 mb-5">
                    <NumberInput label="Deposit Amount" value={principal} onChange={setPrincipal} min={1000} max={10000000} prefix="₹" />
                    <NumberInput label="Interest Rate (p.a.)" value={rate} onChange={setRate} min={1} max={15} suffix="%" step={0.1} />
                    <NumberInput label="Tenure (years)" value={years} onChange={setYears} min={1} max={20} suffix=" years" />
                </div>

                <motion.div layout className="p-5 rounded-2xl bg-dark-card border border-dark-border mb-4">
                    <div className="text-center mb-6">
                        <p className="text-slate-400 text-sm mb-1">Maturity Amount</p>
                        <motion.p key={result.amount} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-bold text-white">
                            {formatINR(result.amount)}
                        </motion.p>
                    </div>

                    {/* Chart Optimization */}
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
                        <div className="p-3 rounded-xl bg-slate-800/20 text-center">
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Invested</p>
                            <p className="text-white font-bold text-sm">{formatINR(principal)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-800/20 text-center">
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Interest</p>
                            <p className="text-brand-green font-bold text-sm">{formatINR(result.interest)}</p>
                        </div>
                    </div>

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
                </motion.div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button onClick={handleDownloadPDF} className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-dark-card border border-dark-border text-slate-400 font-medium text-xs">
                        📄 Download PDF
                    </button>
                    <button onClick={handleDownloadExcel} className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-dark-card border border-dark-border text-slate-400 font-medium text-xs">
                        📊 Download Excel
                    </button>
                </div>

            </div>
        </div>
    );
}