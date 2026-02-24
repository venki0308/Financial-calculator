import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Check, Download, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useAuthStore } from '../store/useAuthStore';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import NumberInput from '../components/NumberInput';
import DisclaimerBanner from '../components/DisclaimerBanner';
import AuthorizationTable from '../components/AuthorizationTable';
import PremiumModal from '../components/PremiumModal';
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

export default function GSTCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addSaved, savedCalculations } = useCalculatorStore();
    const hasPremium = useAuthStore(s => s.hasPremium);
    const isAdmin = useAuthStore(s => s.isAdmin());
    const canAccessAll = hasPremium || isAdmin;

    const [mode, setMode] = useState<'add' | 'remove'>('add');
    const [amount, setAmount] = useState(1000);
    const [gstRate, setGstRate] = useState(18);
    const [isIGST, setIsIGST] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    const chartRef = useRef<any>(null);

    const result = useMemo(() => {
        if (!amount || !gstRate) return null;
        if (mode === 'add') {
            const gstAmount = amount * (gstRate / 100);
            const total = amount + gstAmount;
            const cgst = isIGST ? 0 : gstAmount / 2;
            const sgst = isIGST ? 0 : gstAmount / 2;
            const igst = isIGST ? gstAmount : 0;
            return { preGst: amount, gstAmount, cgst, sgst, igst, postGst: total };
        } else {
            const preGst = amount / (1 + gstRate / 100);
            const gstAmount = amount - preGst;
            const cgst = isIGST ? 0 : gstAmount / 2;
            const sgst = isIGST ? 0 : gstAmount / 2;
            const igst = isIGST ? gstAmount : 0;
            return { preGst, gstAmount, cgst, sgst, igst, postGst: amount };
        }
    }, [amount, gstRate, mode, isIGST]);

    const chartData = useMemo(() => {
        if (!result) return null;
        return {
            labels: ['Base Amount', 'GST Amount'],
            datasets: [{
                data: [result.preGst, result.gstAmount],
                backgroundColor: ['#4F46E5', '#10B981'],
                borderColor: ['#4F46E540', '#10B98140'],
                borderWidth: 1,
            }]
        };
    }, [result]);

    const handleSave = () => {
        if (!result) return;
        addSaved({
            id: `GST-${Date.now()}`,
            type: 'GST Calculator',
            inputs: { amount, gstRate, mode, isIGST },
            result: { primary: result.postGst, ...result },
            timestamp: Date.now()
        });
        setSaved(true);
    };

    const isAlreadySaved = useMemo(() => {
        return savedCalculations.some(s => s.type === 'GST Calculator' && JSON.stringify(s.inputs) === JSON.stringify({ amount, gstRate, mode, isIGST }));
    }, [savedCalculations, amount, gstRate, mode, isIGST]);

    const handleDownloadPDF = () => {
        if (!canAccessAll) {
            setShowPremiumModal(true);
            return;
        }
        if (!result) return;

        let chartImage = undefined;
        if (chartRef.current) {
            chartImage = chartRef.current.toBase64Image();
        }

        const headers = ['Component', 'Value'];
        const data = [
            ['Principal Amount', formatINR(result.preGst)],
            ['GST Rate', `${gstRate}%`],
            ['GST Mode', mode === 'add' ? 'Added' : 'Slashed'],
            ['---', '---'],
        ];

        if (isIGST) {
            data.push(['IGST', formatINR(result.igst)]);
        } else {
            data.push(['CGST', formatINR(result.cgst)]);
            data.push(['SGST', formatINR(result.sgst)]);
        }

        data.push(['Total GST', formatINR(result.gstAmount)]);
        data.push(['Final Amount', formatINR(result.postGst)]);

        exportToPDF('GST Report', headers, data, 'GST_Report', chartImage);
    };

    const rates = [5, 12, 18, 28];

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in">
            <div className="px-4 pt-14 pb-28">
                <div className="flex items-center gap-3 mb-5">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-white">GST Calculator</h1>
                        <p className="text-slate-500 text-xs text-lowercase">Tax calculations made simple</p>
                    </div>
                </div>

                <DisclaimerBanner type="calculator" />

                {/* Mode Toggle */}
                <div className="flex gap-1 bg-dark-card border border-dark-border rounded-xl p-1 mb-6">
                    <button onClick={() => setMode('add')} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${mode === 'add' ? 'bg-brand-purple text-white shadow-lg' : 'text-slate-500'}`}>Add GST</button>
                    <button onClick={() => setMode('remove')} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${mode === 'remove' ? 'bg-brand-gold text-black' : 'text-slate-500'}`}>Remove GST</button>
                </div>

                <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-4 mb-5">
                    <NumberInput label="Principal Amount" value={amount} onChange={setAmount} prefix="₹" min={0} max={999999999} />

                    <div>
                        <label className="text-xs text-slate-400 mb-2 block">GST Rate (%)</label>
                        <div className="grid grid-cols-4 gap-2">
                            {rates.map(r => (
                                <button key={r} onClick={() => setGstRate(r)}
                                    className={`py-3 rounded-xl text-xs font-bold transition-all border ${gstRate === r ? 'bg-brand-purple border-brand-purple text-white' : 'bg-dark-bg border-dark-border text-slate-500'}`}>{r}%</button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-dark-bg border border-dark-border">
                        <div className="flex items-center gap-2">
                            <Info size={14} className="text-slate-500" />
                            <span className="text-white text-xs font-medium">Interstate (IGST)</span>
                        </div>
                        <button onClick={() => setIsIGST(!isIGST)} className={`w-11 h-6 rounded-full p-1 transition-colors ${isIGST ? 'bg-brand-purple' : 'bg-slate-700'}`}>
                            <motion.div animate={{ x: isIGST ? 20 : 0 }} className="w-4 h-4 rounded-full bg-white shadow-sm" />
                        </button>
                    </div>
                </div>

                {result && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-dark-card border border-dark-border rounded-2xl p-5 mb-5 shadow-xl shadow-black/20">
                        <div className="text-center mb-6">
                            <p className="text-slate-400 text-xs mb-1">Final Amount</p>
                            <p className="text-3xl font-bold text-white">{formatINR(result.postGst)}</p>
                        </div>

                        {chartData && (
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
                        )}

                        <div className="space-y-3 mb-6">
                            <Row label="Base Amount" value={result.preGst} color="text-slate-400" />
                            {isIGST ? (
                                <Row label={`IGST (${gstRate}%)`} value={result.igst} color="text-brand-purple" dot="bg-brand-purple" />
                            ) : (
                                <>
                                    <Row label={`CGST (${gstRate / 2}%)`} value={result.cgst} color="text-brand-blue" dot="bg-brand-blue" />
                                    <Row label={`SGST (${gstRate / 2}%)`} value={result.sgst} color="text-brand-gold" dot="bg-brand-gold" />
                                </>
                            )}
                            <div className="pt-2 border-t border-dark-border/40">
                                <Row label="Total GST" value={result.gstAmount} color="text-brand-green" dot="bg-brand-green" isBold />
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
                )}

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button onClick={handleDownloadPDF} className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-dark-card border border-dark-border text-slate-400 font-medium text-xs">
                        📄 Download PDF {!canAccessAll && <span className="text-brand-gold text-[10px]">Premium</span>}
                    </button>
                    <button onClick={() => canAccessAll ? exportToExcel(['Component', 'Value'], [
                        ['Base', result?.preGst ?? 0],
                        ['GST', result?.gstAmount ?? 0],
                        ['Total', result?.postGst ?? 0]
                    ], 'GST_Report') : setShowPremiumModal(true)}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-dark-card border border-dark-border text-slate-400 font-medium text-xs">
                        📊 Download Excel {!canAccessAll && <span className="text-brand-gold text-[10px]">Premium</span>}
                    </button>
                </div>

                <AuthorizationTable />

                <PremiumModal
                    isOpen={showPremiumModal}
                    onClose={() => setShowPremiumModal(false)}
                    onPurchase={() => alert('Razorpay coming soon!')}
                />
            </div>
        </div>
    );
}

function Row({ label, value, color, dot, isBold }: { label: string; value: number; color?: string; dot?: string; isBold?: boolean }) {
    return (
        <div className="flex justify-between items-center py-1">
            <div className="flex items-center gap-2">
                {dot && <div className={`w-2 h-2 rounded-full ${dot}`} />}
                <span className="text-slate-500 text-[11px] font-medium">{label}</span>
            </div>
            <span className={`text-sm ${isBold ? 'font-bold' : 'font-semibold'} ${color || 'text-white'}`}>{formatINR(value)}</span>
        </div>
    );
}
