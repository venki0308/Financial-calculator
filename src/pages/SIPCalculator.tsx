import { useState, useMemo, useEffect, useRef } from 'react';
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
import { calculateSIP, formatINR } from '../utils/calculations';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useAuthStore } from '../store/useAuthStore';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
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

export default function SIPCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('SIP_Calculator'); }, []);
    const navigate = useNavigate();
    const { addHistory, addSaved, savedCalculations } = useCalculatorStore();
    const [monthly, setMonthly] = useState(5000);
    const [rate, setRate] = useState(12);
    const [years, setYears] = useState(10);
    const [isSaved, setIsSaved] = useState(false); const [showInfo, setShowInfo] = useState(false);

    const chartRef = useRef<any>(null);

    const result = useMemo(() => calculateSIP(monthly, rate, years), [monthly, rate, years]);

    const chartData = {
        labels: ['Invested Amount', 'Est. Returns'],
        datasets: [{
            data: [result.invested, result.wealthGained],
            backgroundColor: ['#4F46E5', '#10B981'],
            borderColor: ['#4F46E540', '#10B98140'],
            borderWidth: 1,
        }]
    };

    // History Tracking
    useEffect(() => {
        const timer = setTimeout(() => {
            addHistory({
                id: `SIP-${Date.now()}`,
                type: 'SIP Calculator',
                inputs: { monthly, rate, years },
                result: { primary: result.futureValue, ...result },
                timestamp: Date.now()
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [monthly, rate, years, result.futureValue, addHistory]);

    const handleSave = () => {
        addSaved({
            id: `SIP-Save-${Date.now()}`,
            type: 'SIP Calculator',
            inputs: { monthly, rate, years },
            result: { primary: result.futureValue, ...result },
            timestamp: Date.now()
        });
        setIsSaved(true);
    };

    const isAlreadySaved = useMemo(() => {
        return savedCalculations.some(s => s.type === 'SIP Calculator' && JSON.stringify(s.inputs) === JSON.stringify({ monthly, rate, years }));
    }, [savedCalculations, monthly, rate, years]);

    const handleDownloadPDF = async () => {
        // Give chart canvas time to render fully before capture
        await new Promise(r => setTimeout(r, 150));

        let chartImage: string | undefined = undefined;
        if (chartRef.current) {
            chartImage = chartRef.current.toBase64Image('image/png', 1.0);
        }

        const total = result.invested + result.wealthGained;
        const investedPct = ((result.invested / total) * 100).toFixed(1);
        const returnsPct = ((result.wealthGained / total) * 100).toFixed(1);

        const chartSummary: { label: string; value: string; color: [number, number, number] }[] = [
            { label: `Invested (${investedPct}%)`, value: formatINR(result.invested), color: [79, 70, 229] },
            { label: `Est. Returns (${returnsPct}%)`, value: formatINR(result.wealthGained), color: [16, 185, 129] },
        ];

        const headers = ['Metric', 'Value'];
        const data = [
            ['Monthly Investment', formatINR(monthly)],
            ['Expected Return Rate', `${rate}%`],
            ['Time Period', `${years} years`],
            ['---', '---'],
            ['Total Invested', formatINR(result.invested)],
            ['Wealth Gained', formatINR(result.wealthGained)],
            ['Future Value', formatINR(result.futureValue)],
        ];
        exportToPDF('SIP Investment Report', headers, data, 'SIP_Report', chartImage, chartSummary);
    };

    const handleDownloadExcel = () => {
        const headers = ['Metric', 'Value'];
        const data = [
            ['Monthly Investment', monthly],
            ['Expected Return Rate', rate],
            ['Time Period', years],
            ['Total Invested', result.invested],
            ['Wealth Gained', result.wealthGained],
            ['Future Value', result.futureValue]
        ];
        exportToExcel(headers, data, 'SIP_Report');
    };

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in">
            <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-dark-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                            <ArrowLeft size={18} className="text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-white">SIP Calculator</h1>
                            <p className="text-slate-500 text-xs">Mutual Fund wealth planner</p>
                        </div>
                    </div>
                    <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <Info size={16} className="text-slate-400" />
                    </button>
                </div>
            </div>

            <DisclaimerBanner type="calculator" />

            <div className="px-4 pb-28 pt-4">
                <div className="space-y-4 mb-6">
                    <NumberInput label="Monthly Investment" value={monthly} onChange={setMonthly} min={500} max={1000000} prefix="₹" />
                    <NumberInput label="Expected Return (p.a.)" value={rate} onChange={setRate} min={1} max={30} suffix="%" step={0.5} />
                    <NumberInput label="Time Period (years)" value={years} onChange={setYears} min={1} max={40} suffix=" years" />
                </div>

                <motion.div layout className="p-5 rounded-2xl bg-dark-card border border-dark-border mb-6">
                    <div className="text-center mb-6">
                        <p className="text-slate-400 text-sm mb-1">Expected Future Value</p>
                        <motion.p key={result.futureValue} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-bold text-white">
                            {formatINR(result.futureValue)}
                        </motion.p>
                    </div>

                    {/* Chart Visualization */}
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
                            <p className="text-white font-bold text-sm">{formatINR(result.invested)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-800/20 text-center">
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Returns</p>
                            <p className="text-brand-green font-bold text-sm">{formatINR(result.wealthGained)}</p>
                        </div>
                    </div>

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

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button onClick={handleDownloadPDF} className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-dark-card border border-dark-border text-slate-400 font-medium text-xs">
                        📄 Download PDF
                    </button>
                    <button onClick={handleDownloadExcel} className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-dark-card border border-dark-border text-slate-400 font-medium text-xs">
                        📊 Download Excel
                    </button>
                </div>


                <CalculatorInfoModal
                    isOpen={showInfo}
                    onClose={() => setShowInfo(false)}
                    calculatorTitle="SIP Calculator"
                />
            </div>
        </div>
    );
}