import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Check } from 'lucide-react';
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
import { formatINR } from '../utils/calculations';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useAuthStore } from '../store/useAuthStore';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import { Share2, Info } from 'lucide-react';
import CalculatorInfoModal from './CalculatorInfoModal';

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

interface CalcConfig {
    title: string;
    subtitle: string;
    color: string;
    fields: FieldConfig[];
    compute: (vals: Record<string, number>) => {
        primary: number | string;
        label: string;
        rows: ResultRow[]
    };
    formulaText?: string;
}

interface ResultRow {
    label: string;
    value: string;
    numericValue?: number;
    color?: string;
}

interface FieldConfig {
    key: string;
    label: string;
    defaultVal: number;
    min: number;
    max: number;
    prefix?: string;
    suffix?: string;
    step?: number;
    helperText?: string;
}

export default function GenericCalculator({ config }: { config: CalcConfig }) {
    const navigate = useNavigate();
    const { addHistory, addSaved, savedCalculations } = useCalculatorStore();
    const [vals, setVals] = useState<Record<string, number>>(
        Object.fromEntries(config.fields.map((f) => [f.key, f.defaultVal]))
    );
    const [saved, setSaved] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    const setVal = (key: string, v: number) => {
        setVals((prev) => ({ ...prev, [key]: v }));
        setSaved(false);
    };

    const result = useMemo(() => config.compute(vals), [vals, config]);

    // Handle History
    useEffect(() => {
        const timer = setTimeout(() => {
            addHistory({
                id: `${config.title}-${Date.now()}`,
                type: config.title,
                inputs: vals,
                result: result,
                timestamp: Date.now()
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [vals, result, config.title, addHistory]);

    // Track recent calculator usage
    useEffect(() => {
        try {
            const recent: string[] = JSON.parse(localStorage.getItem('recentCalculators') || '[]');
            const path = window.location.pathname;
            const updated = [path, ...recent.filter((p) => p !== path)].slice(0, 4);
            localStorage.setItem('recentCalculators', JSON.stringify(updated));
        } catch { }
    }, []);

    const handleSave = () => {
        addSaved({
            id: `${config.title}-${Date.now()}`,
            type: config.title,
            inputs: vals,
            result: result,
            timestamp: Date.now()
        });
        setSaved(true);
    };

    const isAlreadySaved = useMemo(() => {
        return savedCalculations.some(s => s.type === config.title && JSON.stringify(s.inputs) === JSON.stringify(vals));
    }, [savedCalculations, config.title, vals]);

    const chartRef = useRef<any>(null);

    const chartData = useMemo(() => {
        const rowsWithData = result.rows.filter(r => r.numericValue !== undefined && r.numericValue > 0);
        const labels = rowsWithData.map(r => r.label);
        const data = rowsWithData.map(r => r.numericValue!);
        const colors = rowsWithData.map(r => r.color || '#4F46E5');

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: colors.map(c => c + '40'),
                borderWidth: 1,
            }]
        };
    }, [result.rows]);

    const handleDownloadPDF = async () => {
        let chartImage = undefined;
        if (chartRef.current) {
            chartImage = chartRef.current.toBase64Image();
        }
        const headers = ['Field', 'Value'];
        const data = [
            ...config.fields.map(f => [f.label, `${vals[f.key]}${f.suffix || ''}`]),
            ['---', '---'],
            [result.label, typeof result.primary === 'number' ? formatINR(result.primary) : result.primary],
            ...result.rows.map(r => [r.label, r.value.toString()])
        ];
        await exportToPDF(`${config.title} Report`, headers, data, config.title.replace(/\s+/g, '_'), chartImage);
    };

    const handleDownloadExcel = async () => {
        const headers = ['Field', 'Value'];
        const data = [
            ...config.fields.map(f => [f.label, vals[f.key]]),
            [result.label, result.primary],
            ...result.rows.map(r => [r.label, r.value])
        ];
        await exportToExcel(headers, data, config.title.replace(/\s+/g, '_'));
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
                            <h1 className="text-lg font-bold text-white">{config.title}</h1>
                            <p className="text-slate-500 text-xs">{config.subtitle}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                            <Info size={16} className="text-slate-400" />
                        </button>
                        <button
                            className="p-2 rounded-xl bg-dark-card border border-dark-border"
                            onClick={() => {
                                if (navigator.share) navigator.share({ title: config.title, text: `Check out this ${config.title} calculation!`, url: window.location.href });
                            }}
                        >
                            <Share2 size={16} className="text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>

            <DisclaimerBanner type="calculator" />

            <div className="px-4 pb-28 pt-4">
                <div className="space-y-3 mb-5">
                    {config.fields.map((f) => (
                        <NumberInput
                            key={f.key}
                            label={f.label}
                            value={vals[f.key]}
                            onChange={(v) => setVal(f.key, v)}
                            min={f.min}
                            max={f.max}
                            prefix={f.prefix}
                            suffix={f.suffix}
                            step={f.step || 1}
                            helperText={f.helperText}
                        />
                    ))}
                </div>

                {result && (
                    <motion.div layout className="p-5 rounded-2xl bg-dark-card border border-dark-border mb-4">
                        <div className="text-center mb-6">
                            <p className="text-slate-400 text-sm mb-1">{result.label}</p>
                            <motion.p
                                key={result.primary}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`text-3xl font-bold text-${config.color}`}
                            >
                                {typeof result.primary === 'number' ? formatINR(result.primary) : result.primary}
                            </motion.p>
                        </div>

                        {/* Chart Visualization */}
                        {chartData.labels.length > 1 && (
                            <div className="h-48 mb-8 flex justify-center">
                                <Pie
                                    ref={chartRef}
                                    data={chartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false },
                                            tooltip: { enabled: true }
                                        }
                                    }}
                                />
                            </div>
                        )}

                        <div className="space-y-3 mb-6">
                            {result.rows.map((r, i) => (
                                <div key={i} className="flex items-center justify-between py-1.5 border-b border-dark-border/40 last:border-0 font-medium">
                                    <div className="flex items-center gap-2">
                                        {r.color && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />}
                                        <span className="text-slate-500 text-xs">{r.label}</span>
                                    </div>
                                    <span className={`text-sm ${r.color || 'text-white'}`}>{r.value}</span>
                                </div>
                            ))}
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={handleSave}
                            disabled={saved || isAlreadySaved}
                            className={`w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${saved || isAlreadySaved
                                ? 'bg-brand-green/10 text-brand-green border border-brand-green/20'
                                : 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                                }`}
                        >
                            {saved || isAlreadySaved ? <><Check size={18} /> Saved</> : <><Save size={18} /> Save Calculation</>}
                        </motion.button>
                    </motion.div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-dark-card border border-dark-border text-slate-400 font-medium text-xs"
                    >
                        📄 Download PDF
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-dark-card border border-dark-border text-slate-400 font-medium text-xs"
                    >
                        📊 Download Excel
                    </button>
                </div>




                <CalculatorInfoModal
                    isOpen={showInfo}
                    onClose={() => setShowInfo(false)}
                    calculatorTitle={config.title}
                />
            </div>
        </div>
    );
}