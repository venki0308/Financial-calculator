import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Save, Check, Download, Info, Receipt, ArrowUpRight, Percent, FileText, BarChart3, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import NumberInput from '../components/NumberInput';
import DisclaimerBanner from '../components/DisclaimerBanner';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
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
import { AnalyticsService } from '../lib/analytics';
import { triggerCalcNotification } from '../services/calcNotifications';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

type GSTMode = 'standard' | 'reverse' | 'profit' | 'itc' | 'invoice';

const modes: { key: GSTMode; label: string; icon: React.ElementType; desc: string }[] = [
    { key: 'standard', label: 'Standard', icon: Receipt, desc: 'Add/Remove GST' },
    { key: 'reverse', label: 'Reverse', icon: ArrowUpRight, desc: 'Find base price' },
    { key: 'profit', label: 'Profit Margin', icon: Percent, desc: 'GST on profit' },
    { key: 'itc', label: 'ITC', icon: BarChart3, desc: 'Input Tax Credit' },
    { key: 'invoice', label: 'Invoice', icon: FileText, desc: 'Generate invoice' },
];

const gstRates = [0, 5, 12, 18, 28];

interface InvoiceItem {
    id: number;
    name: string;
    qty: number;
    price: number;
    rate: number;
}

export default function GSTCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('GST_Calculator'); }, []);
    useTrackCalculator();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addSaved, savedCalculations } = useCalculatorStore();

    const [mode, setMode] = useState<GSTMode>('standard');
    const [showInfo, setShowInfo] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showBreakdown, setShowBreakdown] = useState(false);

    // Standard / Reverse mode
    const [stdDirection, setStdDirection] = useState<'add' | 'remove'>('add');
    const [stdAmount, setStdAmount] = useState(10000);
    const [stdRate, setStdRate] = useState(18);
    const [isIGST, setIsIGST] = useState(false);

    // Profit Margin mode
    const [costPrice, setCostPrice] = useState(1000);
    const [sellingPrice, setSellingPrice] = useState(1500);
    const [profitGstRate, setProfitGstRate] = useState(18);

    // ITC mode
    const [purchaseGst, setPurchaseGst] = useState(5000);
    const [salesGst, setSalesGst] = useState(8000);

    // Invoice mode
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
        { id: 1, name: 'Item 1', qty: 1, price: 1000, rate: 18 },
    ]);
    const [invoiceIsIGST, setInvoiceIsIGST] = useState(false);

    const chartRef = useRef<any>(null);

    // ── Standard/Reverse calculation ──
    const stdResult = useMemo(() => {
        if (!stdAmount || !stdRate) return null;
        if (stdDirection === 'add') {
            const gst = stdAmount * (stdRate / 100);
            const total = stdAmount + gst;
            return { base: stdAmount, gst, cgst: isIGST ? 0 : gst / 2, sgst: isIGST ? 0 : gst / 2, igst: isIGST ? gst : 0, total };
        } else {
            const base = stdAmount / (1 + stdRate / 100);
            const gst = stdAmount - base;
            return { base, gst, cgst: isIGST ? 0 : gst / 2, sgst: isIGST ? 0 : gst / 2, igst: isIGST ? gst : 0, total: stdAmount };
        }
    }, [stdAmount, stdRate, stdDirection, isIGST]);

    // ─── Notification trigger ────
    useEffect(() => {
        if (!stdResult?.total) return;
        const t = setTimeout(() => {
            triggerCalcNotification('gst', `Total ₹${Math.round(stdResult.total).toLocaleString('en-IN')} @${stdRate}%`);
        }, 2000);
        return () => clearTimeout(t);
    }, [stdResult?.total, stdRate]);


    // ── Reverse calculation (explicit) ──
    const reverseResult = useMemo(() => {
        if (!stdAmount || !stdRate) return null;
        const base = stdAmount / (1 + stdRate / 100);
        const gst = stdAmount - base;
        return { base, gst, cgst: isIGST ? 0 : gst / 2, sgst: isIGST ? 0 : gst / 2, igst: isIGST ? gst : 0, total: stdAmount };
    }, [stdAmount, stdRate, isIGST]);

    // ── Profit Margin calculation ──
    const profitResult = useMemo(() => {
        if (!costPrice || !sellingPrice) return null;
        const profit = sellingPrice - costPrice;
        const profitPct = costPrice > 0 ? (profit / costPrice) * 100 : 0;
        const gstOnSale = sellingPrice * (profitGstRate / 100);
        const gstOnCost = costPrice * (profitGstRate / 100);
        const netGst = gstOnSale - gstOnCost;
        const totalWithGst = sellingPrice + gstOnSale;
        return { profit, profitPct, gstOnSale, gstOnCost, netGst, totalWithGst, sellingPrice };
    }, [costPrice, sellingPrice, profitGstRate]);

    // ── ITC calculation ──
    const itcResult = useMemo(() => {
        if (purchaseGst === undefined || salesGst === undefined) return null;
        const itc = purchaseGst;
        const liability = salesGst;
        const netPayable = Math.max(0, liability - itc);
        const refund = Math.max(0, itc - liability);
        return { itc, liability, netPayable, refund };
    }, [purchaseGst, salesGst]);

    // ── Invoice calculation ──
    const invoiceResult = useMemo(() => {
        return invoiceItems.map(item => {
            const amount = item.qty * item.price;
            const gst = amount * (item.rate / 100);
            return {
                ...item,
                amount,
                gst,
                cgst: invoiceIsIGST ? 0 : gst / 2,
                sgst: invoiceIsIGST ? 0 : gst / 2,
                igst: invoiceIsIGST ? gst : 0,
                total: amount + gst,
            };
        });
    }, [invoiceItems, invoiceIsIGST]);

    const invoiceTotals = useMemo(() => {
        return invoiceResult.reduce((acc, item) => ({
            amount: acc.amount + item.amount,
            gst: acc.gst + item.gst,
            cgst: acc.cgst + item.cgst,
            sgst: acc.sgst + item.sgst,
            igst: acc.igst + item.igst,
            total: acc.total + item.total,
        }), { amount: 0, gst: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });
    }, [invoiceResult]);

    const chartData = useMemo(() => {
        if (mode === 'standard' && stdResult) {
            return {
                labels: ['Base Amount', 'GST Amount'],
                datasets: [{ data: [stdResult.base, stdResult.gst], backgroundColor: ['#4F46E5', '#10B981'], borderColor: ['#4F46E540', '#10B98140'], borderWidth: 1 }]
            };
        }
        if (mode === 'reverse' && reverseResult) {
            return {
                labels: ['Base Amount', 'GST Amount'],
                datasets: [{ data: [reverseResult.base, reverseResult.gst], backgroundColor: ['#4F46E5', '#10B981'], borderColor: ['#4F46E540', '#10B98140'], borderWidth: 1 }]
            };
        }
        if (mode === 'invoice') {
            return {
                labels: ['Taxable Amount', 'Total GST'],
                datasets: [{ data: [invoiceTotals.amount, invoiceTotals.gst], backgroundColor: ['#4F46E5', '#10B981'], borderColor: ['#4F46E540', '#10B98140'], borderWidth: 1 }]
            };
        }
        if (mode === 'itc' && itcResult) {
            return {
                labels: ['Input Tax (Purchase)', 'Output Tax (Sales)', 'Net Payable'],
                datasets: [{
                    data: [itcResult.itc, itcResult.liability, itcResult.netPayable],
                    backgroundColor: ['#3B82F6', '#EF4444', '#F59E0B'],
                    borderColor: ['#3B82F640', '#EF444440', '#F59E0B40'],
                    borderWidth: 1,
                }],
            };
        }
        return null;
    }, [mode, stdResult, reverseResult, invoiceTotals, itcResult]);

    const handleSave = () => {
        let inputValues: any = {};
        let resultValues: any = {};
        if (mode === 'standard' && stdResult) { inputValues = { stdAmount, stdRate, stdDirection, isIGST }; resultValues = { primary: stdResult.total, ...stdResult }; }
        else if (mode === 'reverse' && reverseResult) { inputValues = { stdAmount, stdRate, isIGST }; resultValues = { primary: reverseResult.base, ...reverseResult }; }
        else if (mode === 'profit' && profitResult) { inputValues = { costPrice, sellingPrice, profitGstRate }; resultValues = { primary: profitResult.totalWithGst, ...profitResult }; }
        else if (mode === 'itc' && itcResult) { inputValues = { purchaseGst, salesGst }; resultValues = { primary: itcResult.netPayable, ...itcResult }; }
        else if (mode === 'invoice') { inputValues = { items: invoiceItems.map(i => ({ name: i.name, qty: i.qty, price: i.price, rate: i.rate })), invoiceIsIGST }; resultValues = { primary: invoiceTotals.total, ...invoiceTotals }; }

        addSaved({ id: `GST-${mode}-${Date.now()}`, calculatorType: `GST Calculator (${mode})`, inputValues, resultValues, timestamp: Date.now() });
        setSaved(true);
    };

    const handleDownloadPDF = async () => {
        let title = 'GST Calculation Report';
        let headers = ['Component', 'Value'];
        let data: (string | number)[][] = [];
        let chartImage: string | undefined;

        if (chartRef.current) {
            await new Promise(r => setTimeout(r, 100));
            try { chartImage = chartRef.current.toBase64Image('image/png', 1.0); } catch { }
        }

        if (mode === 'standard' && stdResult) {
            title = `GST ${stdDirection === 'add' ? 'Addition' : 'Removal'} Report`;
            data = [
                ['Base Amount', formatINR(stdResult.base)],
                ['GST Rate', `${stdRate}%`],
                ...(isIGST ? [['IGST', formatINR(stdResult.igst)] as [string, string]] : [['CGST', formatINR(stdResult.cgst)] as [string, string], ['SGST', formatINR(stdResult.sgst)] as [string, string]]),
                ['Total GST', formatINR(stdResult.gst)],
                ['Final Amount', formatINR(stdResult.total)],
            ];
        } else if (mode === 'reverse' && reverseResult) {
            title = 'GST Reverse Calculation Report';
            data = [
                ['Amount (incl. GST)', formatINR(stdAmount)],
                ['GST Rate', `${stdRate}%`],
                ['Base Price', formatINR(reverseResult.base)],
                ...(isIGST ? [['IGST', formatINR(reverseResult.igst)] as [string, string]] : [['CGST', formatINR(reverseResult.cgst)] as [string, string], ['SGST', formatINR(reverseResult.sgst)] as [string, string]]),
                ['Total GST', formatINR(reverseResult.gst)],
            ];
        } else if (mode === 'profit' && profitResult) {
            title = 'GST Profit Margin Report';
            data = [
                ['Cost Price', formatINR(costPrice)],
                ['Selling Price', formatINR(sellingPrice)],
                ['Profit', formatINR(profitResult.profit)],
                ['Profit %', `${profitResult.profitPct.toFixed(1)}%`],
                ['GST on Sale', formatINR(profitResult.gstOnSale)],
                ['GST on Purchase (ITC)', formatINR(profitResult.gstOnCost)],
                ['Net GST Payable', formatINR(profitResult.netGst)],
                ['Total with GST', formatINR(profitResult.totalWithGst)],
            ];
        } else if (mode === 'itc' && itcResult) {
            title = 'Input Tax Credit Report';
            headers = ['Component', 'Amount'];
            data = [
                ['GST Paid on Purchases (ITC)', formatINR(itcResult.itc)],
                ['GST Collected on Sales', formatINR(itcResult.liability)],
                ['Net GST Payable', formatINR(itcResult.netPayable)],
                ...(itcResult.refund > 0 ? [['ITC Refund Available', formatINR(itcResult.refund)] as [string, string]] : []),
            ];
        } else if (mode === 'invoice') {
            title = 'GST Invoice';
            headers = ['Item', 'Qty', 'Price', 'GST', 'Total'];
            data = invoiceResult.map(i => [i.name, String(i.qty), formatINR(i.price), formatINR(i.gst), formatINR(i.total)]);
            data.push(['', '', '', '', '']);
            data.push(['Grand Total', '', formatINR(invoiceTotals.amount), formatINR(invoiceTotals.gst), formatINR(invoiceTotals.total)]);
        }

        await exportToPDF(title, headers, data, `GST_${mode}_Report`, chartImage);
    };

    const handleDownloadExcel = async () => {
        if (mode === 'invoice') {
            await exportToExcel(
                ['Item', 'Qty', 'Price', 'Amount', 'GST', 'Total'],
                invoiceResult.map(i => [i.name, i.qty, i.price, i.amount, i.gst, i.total]),
                'GST_Invoice'
            );
        } else {
            let data: any[][] = [];
            if (mode === 'standard' && stdResult) data = [['Base', stdResult.base], ['GST', stdResult.gst], ['Total', stdResult.total]];
            else if (mode === 'reverse' && reverseResult) data = [['Total (incl. GST)', stdAmount], ['Base', reverseResult.base], ['GST', reverseResult.gst]];
            else if (mode === 'itc' && itcResult) data = [['Input Tax', itcResult.itc], ['Output Tax', itcResult.liability], ['Net Payable', itcResult.netPayable]];
            await exportToExcel(['Component', 'Value'], data, `GST_${mode}_Report`);
        }
    };

    const addInvoiceItem = () => {
        setInvoiceItems(prev => [...prev, { id: Date.now(), name: `Item ${prev.length + 1}`, qty: 1, price: 0, rate: 18 }]);
    };

    const removeInvoiceItem = (id: number) => {
        if (invoiceItems.length <= 1) return;
        setInvoiceItems(prev => prev.filter(i => i.id !== id));
    };

    const updateInvoiceItem = (id: number, field: keyof InvoiceItem, value: any) => {
        setInvoiceItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    // Smart Insight
    const insight = useMemo(() => {
        if (mode === 'standard' && stdResult) {
            const gstPct = ((stdResult.gst / stdResult.total) * 100).toFixed(1);
            return `GST constitutes ${gstPct}% of the total amount. ${stdRate >= 18 ? 'This falls in the higher GST slab — check if ITC is available.' : ''}`;
        }
        if (mode === 'profit' && profitResult) {
            return profitResult.profitPct >= 30
                ? `High profit margin of ${profitResult.profitPct.toFixed(1)}%. Net GST liability: ${formatINR(profitResult.netGst)}`
                : `Profit margin: ${profitResult.profitPct.toFixed(1)}%. Consider optimizing costs to improve margin.`;
        }
        if (mode === 'itc' && itcResult) {
            return itcResult.refund > 0
                ? `You have an ITC surplus of ${formatINR(itcResult.refund)}. You can claim this as a refund.`
                : `Net GST payable after ITC offset: ${formatINR(itcResult.netPayable)}`;
        }
        return null;
    }, [mode, stdResult, profitResult, itcResult, stdRate]);

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in">
            <div className="px-4 pt-14 pb-28">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-white">GST Calculator</h1>
                        <p className="text-slate-500 text-xs">Advanced tax calculations</p>
                    </div>
                    <button onClick={() => setShowInfo(true)} className="ml-auto p-2 rounded-xl bg-dark-card border border-dark-border">
                        <Info size={16} className="text-slate-400" />
                    </button>
                </div>

                <DisclaimerBanner type="calculator" />

                {/* Mode Selector */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 scrollbar-hide">
                    {modes.map(m => {
                        const Icon = m.icon;
                        const active = mode === m.key;
                        return (
                            <button
                                key={m.key}
                                onClick={() => { setMode(m.key); setSaved(false); }}
                                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${active
                                    ? 'bg-brand-purple border-brand-purple text-white shadow-lg shadow-brand-purple/20'
                                    : 'bg-dark-card border-dark-border text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                <Icon size={14} />
                                {m.label}
                            </button>
                        );
                    })}
                </div>

                {/* ─── STANDARD MODE ─── */}
                {mode === 'standard' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="flex gap-1 bg-dark-card border border-dark-border rounded-xl p-1 mb-5">
                            <button onClick={() => setStdDirection('add')} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${stdDirection === 'add' ? 'bg-brand-purple text-white shadow-lg' : 'text-slate-500'}`}>Add GST</button>
                            <button onClick={() => setStdDirection('remove')} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${stdDirection === 'remove' ? 'bg-brand-gold text-black' : 'text-slate-500'}`}>Remove GST</button>
                        </div>

                        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-4 mb-5">
                            <NumberInput label={stdDirection === 'add' ? 'Base Amount (excl. GST)' : 'Total Amount (incl. GST)'} value={stdAmount} onChange={setStdAmount} prefix="₹" min={0} max={999999999} />
                            <div>
                                <label className="text-xs text-slate-400 mb-2 block">GST Rate</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {gstRates.map(r => (
                                        <button key={r} onClick={() => setStdRate(r)} className={`py-3 rounded-xl text-xs font-bold transition-all border ${stdRate === r ? 'bg-brand-purple border-brand-purple text-white' : 'bg-dark-bg border-dark-border text-slate-500'}`}>{r}%</button>
                                    ))}
                                </div>
                            </div>
                            <ToggleIGST value={isIGST} onChange={setIsIGST} />
                        </div>

                        {stdResult && <ResultCard result={stdResult} rate={stdRate} isIGST={isIGST} chartData={chartData} chartRef={chartRef} showBreakdown={showBreakdown} setShowBreakdown={setShowBreakdown} />}
                    </motion.div>
                )}

                {/* ─── REVERSE MODE ─── */}
                {mode === 'reverse' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-4 mb-5">
                            <NumberInput label="Total Amount (incl. GST)" value={stdAmount} onChange={setStdAmount} prefix="₹" min={0} max={999999999} />
                            <div>
                                <label className="text-xs text-slate-400 mb-2 block">GST Rate</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {gstRates.map(r => (
                                        <button key={r} onClick={() => setStdRate(r)} className={`py-3 rounded-xl text-xs font-bold transition-all border ${stdRate === r ? 'bg-brand-purple border-brand-purple text-white' : 'bg-dark-bg border-dark-border text-slate-500'}`}>{r}%</button>
                                    ))}
                                </div>
                            </div>
                            <ToggleIGST value={isIGST} onChange={setIsIGST} />
                        </div>

                        {reverseResult && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-dark-card border border-dark-border rounded-2xl p-5 mb-5 shadow-xl shadow-black/20">
                                <div className="text-center mb-4">
                                    <p className="text-slate-400 text-xs mb-1">Original Base Price</p>
                                    <p className="text-3xl font-bold text-brand-green">{formatINR(reverseResult.base)}</p>
                                </div>
                                <div className="space-y-2">
                                    <Row label="Total (incl. GST)" value={stdAmount} color="text-white" />
                                    <Row label="Base Price" value={reverseResult.base} color="text-brand-green" dot="bg-brand-green" />
                                    {isIGST ? (
                                        <Row label={`IGST (${stdRate}%)`} value={reverseResult.igst} color="text-brand-purple" dot="bg-brand-purple" />
                                    ) : (
                                        <>
                                            <Row label={`CGST (${stdRate / 2}%)`} value={reverseResult.cgst} color="text-brand-blue" dot="bg-brand-blue" />
                                            <Row label={`SGST (${stdRate / 2}%)`} value={reverseResult.sgst} color="text-brand-gold" dot="bg-brand-gold" />
                                        </>
                                    )}
                                    <div className="pt-2 border-t border-dark-border/40">
                                        <Row label="Total GST" value={reverseResult.gst} color="text-amber-400" dot="bg-amber-400" isBold />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* ─── PROFIT MARGIN MODE ─── */}
                {mode === 'profit' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-4 mb-5">
                            <NumberInput label="Cost Price (Purchase)" value={costPrice} onChange={setCostPrice} prefix="₹" min={0} max={999999999} />
                            <NumberInput label="Selling Price" value={sellingPrice} onChange={setSellingPrice} prefix="₹" min={0} max={999999999} />
                            <div>
                                <label className="text-xs text-slate-400 mb-2 block">GST Rate on Sale</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {gstRates.map(r => (
                                        <button key={r} onClick={() => setProfitGstRate(r)} className={`py-3 rounded-xl text-xs font-bold transition-all border ${profitGstRate === r ? 'bg-brand-purple border-brand-purple text-white' : 'bg-dark-bg border-dark-border text-slate-500'}`}>{r}%</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {profitResult && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-dark-card border border-dark-border rounded-2xl p-5 mb-5 shadow-xl shadow-black/20">
                                <div className="text-center mb-5">
                                    <p className="text-slate-400 text-xs mb-1">Total Amount (incl. GST)</p>
                                    <p className="text-3xl font-bold text-white">{formatINR(profitResult.totalWithGst)}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="p-3 rounded-xl bg-slate-800/30 text-center">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Profit</p>
                                        <p className="text-brand-green font-bold text-sm">{formatINR(profitResult.profit)}</p>
                                        <p className="text-[10px] text-slate-500">{profitResult.profitPct.toFixed(1)}%</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-800/30 text-center">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Net GST</p>
                                        <p className="text-amber-400 font-bold text-sm">{formatINR(profitResult.netGst)}</p>
                                        <p className="text-[10px] text-slate-500">payable to govt</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Row label="Cost Price" value={costPrice} color="text-slate-400" />
                                    <Row label="Selling Price" value={sellingPrice} color="text-white" />
                                    <Row label="GST on Sale" value={profitResult.gstOnSale} color="text-red-400" dot="bg-red-400" />
                                    <Row label="GST on Purchase (ITC)" value={profitResult.gstOnCost} color="text-brand-green" dot="bg-brand-green" />
                                    <div className="pt-2 border-t border-dark-border/40">
                                        <Row label="Net GST Payable" value={profitResult.netGst} color="text-amber-400" isBold />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* ─── ITC MODE ─── */}
                {mode === 'itc' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-4 mb-5">
                            <NumberInput label="GST Paid on Purchases (Input Tax)" value={purchaseGst} onChange={setPurchaseGst} prefix="₹" min={0} max={999999999} helperText="Total GST paid on your purchases" />
                            <NumberInput label="GST Collected on Sales (Output Tax)" value={salesGst} onChange={setSalesGst} prefix="₹" min={0} max={999999999} helperText="Total GST collected from customers" />
                        </div>

                        {itcResult && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-dark-card border border-dark-border rounded-2xl p-5 mb-5 shadow-xl shadow-black/20">
                                <div className="text-center mb-5">
                                    <p className="text-slate-400 text-xs mb-1">{itcResult.refund > 0 ? 'ITC Refund Available' : 'Net GST Payable'}</p>
                                    <p className={`text-3xl font-bold ${itcResult.refund > 0 ? 'text-brand-green' : 'text-amber-400'}`}>
                                        {formatINR(itcResult.refund > 0 ? itcResult.refund : itcResult.netPayable)}
                                    </p>
                                </div>

                                {chartData && (
                                    <div className="h-44 mb-5 flex justify-center">
                                        <Pie ref={chartRef} data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Row label="Input Tax (Purchases)" value={itcResult.itc} color="text-blue-400" dot="bg-blue-400" />
                                    <Row label="Output Tax (Sales)" value={itcResult.liability} color="text-red-400" dot="bg-red-400" />
                                    <div className="pt-2 border-t border-dark-border/40">
                                        {itcResult.refund > 0 ? (
                                            <Row label="Refund Claimable" value={itcResult.refund} color="text-brand-green" dot="bg-brand-green" isBold />
                                        ) : (
                                            <Row label="Net GST Payable" value={itcResult.netPayable} color="text-amber-400" dot="bg-amber-400" isBold />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* ─── INVOICE MODE ─── */}
                {mode === 'invoice' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <ToggleIGST value={invoiceIsIGST} onChange={setInvoiceIsIGST} />

                        <div className="space-y-3 mt-4 mb-5">
                            {invoiceItems.map((item, idx) => (
                                <div key={item.id} className="bg-dark-card border border-dark-border rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-slate-400">Item #{idx + 1}</span>
                                        {invoiceItems.length > 1 && (
                                            <button onClick={() => removeInvoiceItem(item.id)} className="text-red-400 text-xs font-bold">Remove</button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <input
                                            value={item.name}
                                            onChange={e => updateInvoiceItem(item.id, 'name', e.target.value)}
                                            className="w-full px-3.5 py-3 rounded-xl bg-dark-bg border border-dark-border text-white text-sm"
                                            placeholder="Item name"
                                        />
                                        <div className="grid grid-cols-3 gap-2">
                                            <NumberInput label="Qty" value={item.qty} onChange={v => updateInvoiceItem(item.id, 'qty', v)} min={1} max={99999} />
                                            <NumberInput label="Price" value={item.price} onChange={v => updateInvoiceItem(item.id, 'price', v)} prefix="₹" min={0} max={999999999} />
                                            <div>
                                                <label className="text-[10px] text-slate-400 mb-1 block">GST %</label>
                                                <select
                                                    value={item.rate}
                                                    onChange={e => updateInvoiceItem(item.id, 'rate', Number(e.target.value))}
                                                    className="w-full px-2 py-3 rounded-xl bg-dark-bg border border-dark-border text-white text-xs"
                                                >
                                                    {gstRates.map(r => <option key={r} value={r}>{r}%</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-xs pt-1">
                                            <span className="text-slate-500">Amount: <span className="text-white font-bold">{formatINR(item.qty * item.price)}</span></span>
                                            <span className="text-slate-500">GST: <span className="text-brand-green font-bold">{formatINR(item.qty * item.price * item.rate / 100)}</span></span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={addInvoiceItem} className="w-full py-3 mb-5 rounded-xl border-2 border-dashed border-dark-border text-slate-500 text-xs font-bold hover:border-brand-purple hover:text-brand-purple transition-all">
                            + Add Item
                        </button>

                        {/* Invoice Totals */}
                        <motion.div layout className="bg-dark-card border border-dark-border rounded-2xl p-5 mb-5 shadow-xl shadow-black/20">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Invoice Summary</h3>

                            {/* Items table */}
                            <div className="overflow-x-auto mb-4">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-slate-500 border-b border-dark-border/40">
                                            <th className="text-left py-2 font-medium">Item</th>
                                            <th className="text-right py-2 font-medium">Amt</th>
                                            <th className="text-right py-2 font-medium">GST</th>
                                            <th className="text-right py-2 font-medium">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoiceResult.map(item => (
                                            <tr key={item.id} className="border-b border-dark-border/20">
                                                <td className="py-2 text-slate-300">{item.name}</td>
                                                <td className="py-2 text-right text-white">{formatINR(item.amount)}</td>
                                                <td className="py-2 text-right text-brand-green">{formatINR(item.gst)}</td>
                                                <td className="py-2 text-right text-white font-bold">{formatINR(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="space-y-2 pt-3 border-t border-dark-border/40">
                                <Row label="Taxable Amount" value={invoiceTotals.amount} color="text-white" />
                                {invoiceIsIGST ? (
                                    <Row label="IGST" value={invoiceTotals.igst} color="text-brand-purple" dot="bg-brand-purple" />
                                ) : (
                                    <>
                                        <Row label="CGST" value={invoiceTotals.cgst} color="text-brand-blue" dot="bg-brand-blue" />
                                        <Row label="SGST" value={invoiceTotals.sgst} color="text-brand-gold" dot="bg-brand-gold" />
                                    </>
                                )}
                                <div className="pt-2 border-t border-dark-border/40">
                                    <Row label="Grand Total" value={invoiceTotals.total} color="text-brand-green" isBold />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Smart Insight */}
                {insight && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-5">
                        <Info size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-900 dark:text-amber-200/80 leading-relaxed">{insight}</p>
                    </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mb-5">
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saved}
                        className={`flex-1 py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${saved
                            ? 'bg-brand-green/10 text-brand-green border border-brand-green/20'
                            : 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                            }`}>
                        {saved ? <><Check size={18} /> Saved</> : <><Save size={18} /> Save</>}
                    </motion.button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-8">
                    <button onClick={handleDownloadPDF} className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-purple/10 border-2 border-brand-purple/40 text-brand-purple font-bold text-sm">
                        📄 PDF
                    </button>
                    <button onClick={handleDownloadExcel} className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-green/10 border-2 border-brand-green/40 text-brand-green font-bold text-sm">
                        📊 Excel
                    </button>
                </div>

                <CalculatorInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} calculatorTitle="GST Calculator" />
            </div>
        </div>
    );
}

// ── Reusable Components ──

function ToggleIGST({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-dark-card border border-dark-border">
            <div className="flex items-center gap-2">
                <Info size={14} className="text-slate-500" />
                <span className="text-white text-xs font-medium">Interstate (IGST)</span>
            </div>
            <button onClick={() => onChange(!value)} className={`w-11 h-6 rounded-full p-1 transition-colors ${value ? 'bg-brand-purple' : 'bg-slate-700'}`}>
                <motion.div animate={{ x: value ? 20 : 0 }} className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
        </div>
    );
}

function ResultCard({ result, rate, isIGST, chartData, chartRef, showBreakdown, setShowBreakdown }: {
    result: { base: number; gst: number; cgst: number; sgst: number; igst: number; total: number };
    rate: number; isIGST: boolean; chartData: any; chartRef: any;
    showBreakdown: boolean; setShowBreakdown: (v: boolean) => void;
}) {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-dark-card border border-dark-border rounded-2xl p-5 mb-5 shadow-xl shadow-black/20">
            <div className="text-center mb-5">
                <p className="text-slate-400 text-xs mb-1">Final Amount</p>
                <p className="text-3xl font-bold text-white">{formatINR(result.total)}</p>
            </div>

            {chartData && (
                <div className="h-44 mb-5 flex justify-center">
                    <Pie ref={chartRef} data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true } } }} />
                </div>
            )}

            <div className="space-y-2 mb-4">
                <Row label="Base Amount" value={result.base} color="text-slate-400" />
                {isIGST ? (
                    <Row label={`IGST (${rate}%)`} value={result.igst} color="text-brand-purple" dot="bg-brand-purple" />
                ) : (
                    <>
                        <Row label={`CGST (${rate / 2}%)`} value={result.cgst} color="text-brand-blue" dot="bg-brand-blue" />
                        <Row label={`SGST (${rate / 2}%)`} value={result.sgst} color="text-brand-gold" dot="bg-brand-gold" />
                    </>
                )}
                <div className="pt-2 border-t border-dark-border/40">
                    <Row label="Total GST" value={result.gst} color="text-brand-green" dot="bg-brand-green" isBold />
                </div>
            </div>

            <button onClick={() => setShowBreakdown(!showBreakdown)} className="flex items-center gap-1 text-xs text-brand-purple font-bold">
                {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showBreakdown ? 'Hide' : 'Show'} Rate Comparison
            </button>
            <AnimatePresence>
                {showBreakdown && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 space-y-2">
                            {[5, 12, 18, 28].map(r => {
                                const g = result.base * (r / 100);
                                return (
                                    <div key={r} className={`flex justify-between items-center py-2 px-3 rounded-lg ${r === rate ? 'bg-brand-purple/10 border border-brand-purple/30' : 'bg-slate-800/20'}`}>
                                        <span className="text-xs text-slate-400">{r}% GST</span>
                                        <div className="text-right">
                                            <span className="text-xs text-white font-bold">{formatINR(result.base + g)}</span>
                                            <span className="text-[10px] text-slate-500 ml-2">(GST: {formatINR(g)})</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
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