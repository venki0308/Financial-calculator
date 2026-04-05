import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Save, Check, Download, Info, Receipt, ArrowUpRight, Percent, FileText, BarChart3, ChevronDown, ChevronUp, Share2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, type ExportConfig } from '../utils/exportReport';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';

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
import { useAppColors } from '../theme/useAppColors';

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
    const { addSaved, removeSaved, savedCalculations } = useCalculatorStore();

    const [mode, setMode] = useState<GSTMode>('standard');
    const [showInfo, setShowInfo] = useState(false);
    const [saved, setSaved] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);
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
    const c = useAppColors();

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
                datasets: [{ data: [stdResult.base, stdResult.gst], backgroundColor: ['#4F46E5', '#10B981'], borderColor: [c.card, c.card], borderWidth: 2 }]
            };
        }
        if (mode === 'reverse' && reverseResult) {
            return {
                labels: ['Base Amount', 'GST Amount'],
                datasets: [{ data: [reverseResult.base, reverseResult.gst], backgroundColor: ['#4F46E5', '#10B981'], borderColor: [c.card, c.card], borderWidth: 2 }]
            };
        }
        if (mode === 'invoice') {
            return {
                labels: ['Taxable Amount', 'Total GST'],
                datasets: [{ data: [invoiceTotals.amount, invoiceTotals.gst], backgroundColor: ['#4F46E5', '#10B981'], borderColor: [c.card, c.card], borderWidth: 2 }]
            };
        }
        if (mode === 'itc' && itcResult) {
            return {
                labels: ['Input Tax (Purchase)', 'Output Tax (Sales)', 'Net Payable'],
                datasets: [{
                    data: [itcResult.itc, itcResult.liability, itcResult.netPayable],
                    backgroundColor: ['#3B82F6', '#EF4444', '#F59E0B'],
                    borderColor: [c.card, c.card, c.card],
                    borderWidth: 2,
                }],
            };
        }
        return null;
    }, [mode, stdResult, reverseResult, invoiceTotals, itcResult, c.card]);

    const handleSave = () => {
        let inputValues: any = {};
        let resultValues: any = {};
        if (mode === 'standard' && stdResult) { inputValues = { stdAmount, stdRate, stdDirection, isIGST }; resultValues = { primary: stdResult.total, ...stdResult }; }
        else if (mode === 'reverse' && reverseResult) { inputValues = { stdAmount, stdRate, isIGST }; resultValues = { primary: reverseResult.base, ...reverseResult }; }
        else if (mode === 'profit' && profitResult) { inputValues = { costPrice, sellingPrice, profitGstRate }; resultValues = { primary: profitResult.totalWithGst, ...profitResult }; }
        else if (mode === 'itc' && itcResult) { inputValues = { purchaseGst, salesGst }; resultValues = { primary: itcResult.netPayable, ...itcResult }; }
        else if (mode === 'invoice') { inputValues = { items: invoiceItems.map(i => ({ name: i.name, qty: i.qty, price: i.price, rate: i.rate })), invoiceIsIGST }; resultValues = { primary: invoiceTotals.total, ...invoiceTotals }; }

        const calcId = `GST-${mode}-${Date.now()}`;
        addSaved({ id: calcId, calculatorType: `GST Calculator (${mode})`, inputValues, resultValues, timestamp: Date.now() });
        setSaved(true);
        setLastSavedId(calcId);

        triggerCalcNotification({
            type: 'general',
            metadata: {
                calcId,
                title: `GST Calculation Saved (${mode})`,
                summary: `Successfully saved your GST ${mode} calculation.`,
                route: '/calculator/gst',
                icon: '🧾'
            }
        });
    };

    const handleRemove = () => {
        if (lastSavedId) {
            removeSaved(lastSavedId);
            setLastSavedId(null);
            setSaved(false);
        }
    };

    const handleDownloadPDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        let inputs: Array<{ label: string; value: string }> = [];
        let results: Array<{ label: string; value: string }> = [];
        let projCols: string[] = [];
        let projRows: Array<Array<string | number>> = [];

        if (mode === 'standard' || mode === 'reverse') {
            const r = (mode === 'standard' ? stdResult : reverseResult)!;
            if (!r) return;
            inputs = [
                { label: 'Mode', value: mode === 'standard' ? 'Add GST (Exclusive to Inclusive)' : 'Remove GST (Inclusive to Exclusive)' },
                { label: 'Amount', value: `₹${stdAmount.toLocaleString('en-IN')}` },
                { label: 'GST Rate', value: `${stdRate}%` },
                { label: 'Transaction Type', value: isIGST ? 'IGST (Inter-state)' : 'CGST + SGST (Intra-state)' },
            ];
            results = isIGST ? [
                { label: 'Base Amount', value: `₹${Math.round(r.base).toLocaleString('en-IN')}` },
                { label: 'IGST', value: `₹${Math.round(r.igst).toLocaleString('en-IN')}` },
                { label: 'Total Amount', value: `₹${Math.round(r.total).toLocaleString('en-IN')}` },
            ] : [
                { label: 'Base Amount', value: `₹${Math.round(r.base).toLocaleString('en-IN')}` },
                { label: 'CGST', value: `₹${Math.round(r.cgst).toLocaleString('en-IN')}` },
                { label: 'SGST/UTGST', value: `₹${Math.round(r.sgst).toLocaleString('en-IN')}` },
                { label: 'Total GST', value: `₹${Math.round(r.gst).toLocaleString('en-IN')}` },
                { label: 'Total Amount', value: `₹${Math.round(r.total).toLocaleString('en-IN')}` },
            ];
            projCols = ['Component', 'Rate', 'Amount'];
            projRows = isIGST ? [
                ['Base Amount', '-', `₹${Math.round(r.base).toLocaleString('en-IN')}`],
                ['IGST', `${stdRate}%`, `₹${Math.round(r.igst).toLocaleString('en-IN')}`],
                ['Total', '-', `₹${Math.round(r.total).toLocaleString('en-IN')}`],
            ] : [
                ['Base Amount', '-', `₹${Math.round(r.base).toLocaleString('en-IN')}`],
                ['CGST', `${stdRate / 2}%`, `₹${Math.round(r.cgst).toLocaleString('en-IN')}`],
                ['SGST/UTGST', `${stdRate / 2}%`, `₹${Math.round(r.sgst).toLocaleString('en-IN')}`],
                ['Total GST', `${stdRate}%`, `₹${Math.round(r.gst).toLocaleString('en-IN')}`],
                ['Total Amount', '-', `₹${Math.round(r.total).toLocaleString('en-IN')}`],
            ];
        } else if (mode === 'profit') {
            if (!profitResult) return;
            inputs = [
                { label: 'Cost Price', value: `₹${costPrice.toLocaleString('en-IN')}` },
                { label: 'Selling Price', value: `₹${sellingPrice.toLocaleString('en-IN')}` },
                { label: 'GST Rate', value: `${profitGstRate}%` },
            ];
            results = [
                { label: 'Profit (Before GST)', value: `₹${Math.round(profitResult.profit).toLocaleString('en-IN')}` },
                { label: 'Profit %', value: `${profitResult.profitPct.toFixed(2)}%` },
                { label: 'GST on Sale', value: `₹${Math.round(profitResult.gstOnSale).toLocaleString('en-IN')}` },
                { label: 'Net GST Payable', value: `₹${Math.round(profitResult.netGst).toLocaleString('en-IN')}` },
                { label: 'Total with GST', value: `₹${Math.round(profitResult.totalWithGst).toLocaleString('en-IN')}` },
            ];
            projCols = ['Component', 'Amount'];
            projRows = [
                ['Cost Price', `₹${costPrice.toLocaleString('en-IN')}`],
                ['Selling Price', `₹${sellingPrice.toLocaleString('en-IN')}`],
                ['Profit', `₹${Math.round(profitResult.profit).toLocaleString('en-IN')}`],
                ['GST on Sale', `₹${Math.round(profitResult.gstOnSale).toLocaleString('en-IN')}`],
                ['GST on Cost', `₹${Math.round(profitResult.gstOnCost).toLocaleString('en-IN')}`],
                ['Net GST Payable', `₹${Math.round(profitResult.netGst).toLocaleString('en-IN')}`],
            ];
        } else if (mode === 'itc') {
            if (!itcResult) return;
            inputs = [
                { label: 'Input GST Paid', value: `₹${purchaseGst.toLocaleString('en-IN')}` },
                { label: 'Output GST Collected', value: `₹${salesGst.toLocaleString('en-IN')}` },
            ];
            results = [
                { label: 'ITC Available', value: `₹${Math.round(itcResult.itc).toLocaleString('en-IN')}` },
                { label: 'GST Liability', value: `₹${Math.round(itcResult.liability).toLocaleString('en-IN')}` },
                { label: 'Net GST Payable', value: `₹${Math.round(itcResult.netPayable).toLocaleString('en-IN')}` },
                { label: 'ITC Refund', value: `₹${Math.round(itcResult.refund).toLocaleString('en-IN')}` },
            ];
            projCols = ['Component', 'Amount'];
            projRows = [
                ['Input GST (ITC)', `₹${Math.round(itcResult.itc).toLocaleString('en-IN')}`],
                ['Output GST Liability', `₹${Math.round(itcResult.liability).toLocaleString('en-IN')}`],
                ['Net Payable', `₹${Math.round(itcResult.netPayable).toLocaleString('en-IN')}`],
                ['Refund', `₹${Math.round(itcResult.refund).toLocaleString('en-IN')}`],
            ];
        } else if (mode === 'invoice') {
            inputs = [
                { label: 'Invoice Type', value: invoiceIsIGST ? 'IGST (Inter-state)' : 'CGST+SGST (Intra-state)' },
                { label: 'Total Line Items', value: String(invoiceItems.length) },
            ];
            results = [
                { label: 'Invoice Sub-total', value: `₹${Math.round(invoiceTotals.amount).toLocaleString('en-IN')}` },
                { label: 'Total GST', value: `₹${Math.round(invoiceTotals.gst).toLocaleString('en-IN')}` },
                { label: 'Invoice Total', value: `₹${Math.round(invoiceTotals.total).toLocaleString('en-IN')}` },
            ];
            projCols = invoiceIsIGST
                ? ['Item', 'Qty', 'Rate', 'GST%', 'Amount', 'IGST', 'Total']
                : ['Item', 'Qty', 'Rate', 'GST%', 'Amount', 'CGST', 'SGST', 'Total'];
            projRows = invoiceResult.map((item: any) => invoiceIsIGST ? [
                item.name || `Item ${item.id}`, item.qty, `₹${item.price}`, `${item.rate}%`,
                Math.round(item.amount), Math.round(item.igst), Math.round(item.total),
            ] : [
                item.name || `Item ${item.id}`, item.qty, `₹${item.price}`, `${item.rate}%`,
                Math.round(item.amount), Math.round(item.cgst), Math.round(item.sgst), Math.round(item.total),
            ]);
        }

        await exportToPDF({
            title: 'GST Calculator Report',
            subtitle: `Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
            inputs,
            results,
            projectionTitle: mode === 'invoice' ? 'Invoice Line Items' : 'GST Breakdown',
            projectionColumns: projCols,
            projectionRows: projRows,
            filename: `FinCalix_GST_Report_${tag}`,
        });
    };

    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        let inputs: Array<{ label: string; value: string }> = [];
        let results: Array<{ label: string; value: string }> = [];
        let projCols: string[] = [];
        let projRows: Array<Array<string | number>> = [];

        if (mode === 'standard' || mode === 'reverse') {
            const r = (mode === 'standard' ? stdResult : reverseResult)!;
            if (!r) return;
            inputs = [{ label: 'Mode', value: mode }, { label: 'Amount', value: String(stdAmount) }, { label: 'GST Rate', value: `${stdRate}%` }];
            results = [{ label: 'Base', value: String(Math.round(r.base)) }, { label: 'GST', value: String(Math.round(r.gst)) }, { label: 'Total', value: String(Math.round(r.total)) }];
            projCols = ['Component', 'Amount'];
            projRows = [['Base', Math.round(r.base)], ['CGST', Math.round(r.cgst)], ['SGST', Math.round(r.sgst)], ['IGST', Math.round(r.igst)], ['Total', Math.round(r.total)]];
        } else if (mode === 'invoice') {
            inputs = [{ label: 'Type', value: invoiceIsIGST ? 'IGST' : 'CGST+SGST' }];
            results = [{ label: 'Sub-total', value: String(Math.round(invoiceTotals.amount)) }, { label: 'Total GST', value: String(Math.round(invoiceTotals.gst)) }, { label: 'Invoice Total', value: String(Math.round(invoiceTotals.total)) }];
            projCols = ['Item', 'Qty', 'Price', 'GST%', 'Amount', 'GST', 'Total'];
            projRows = invoiceResult.map((item: any) => [item.name || `Item ${item.id}`, item.qty, item.price, item.rate, Math.round(item.amount), Math.round(item.gst), Math.round(item.total)]);
        }

        await exportToExcel({
            title: 'GST Calculator Report',
            inputs,
            results,
            projectionTitle: 'GST Breakdown',
            projectionColumns: projCols,
            projectionRows: projRows,
            filename: `FinCalix_GST_Report_${tag}`,
        });
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
        <div className="min-h-dvh bg-background animate-fade-in">
            <div className="px-4 pt-14 pb-28">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">{t('gst.title')}</h1>
                        <p className="text-muted-foreground text-xs">{t('gst.subtitle')}</p>
                    </div>
                    <button onClick={() => setShowInfo(true)} className="ml-auto p-2 rounded-xl bg-card border border-border">
                        <Info size={16} className="text-muted-foreground" />
                    </button>
                </div>

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
                                    : 'bg-card border-border text-muted-foreground hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                            >
                                <Icon size={14} />
                                {t(`gst.mode_${m.key}`)}
                            </button>
                        );
                    })}
                </div>

                {/* ─── STANDARD MODE ─── */}
                {mode === 'standard' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-5">
                            <button onClick={() => setStdDirection('add')} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${stdDirection === 'add' ? 'bg-brand-purple text-white shadow-lg' : 'text-muted-foreground'}`}>{t('gst.addGST')}</button>
                            <button onClick={() => setStdDirection('remove')} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${stdDirection === 'remove' ? 'bg-brand-gold text-black' : 'text-muted-foreground'}`}>{t('gst.removeGST')}</button>
                        </div>

                        <div className="bg-card border border-border rounded-2xl p-4 space-y-4 mb-5">
                            <NumberInput label={stdDirection === 'add' ? t('gst.baseAmountExcl') : t('gst.totalAmountIncl')} value={stdAmount} onChange={setStdAmount} prefix="₹" min={0} max={999999999} />
                            <div>
                                <label className="text-xs text-muted-foreground mb-2 block">{t('gst.gstRate')}</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {gstRates.map(r => (
                                        <button key={r} onClick={() => setStdRate(r)} className={`py-3 rounded-xl text-xs font-bold transition-all border ${stdRate === r ? 'bg-brand-purple border-brand-purple text-foreground' : 'bg-dark-bg border-border text-muted-foreground'}`}>{r}%</button>
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
                        <div className="bg-card border border-border rounded-2xl p-4 space-y-4 mb-5">
                            <NumberInput label={t('gst.totalAmountIncl')} value={stdAmount} onChange={setStdAmount} prefix="₹" min={0} max={999999999} />
                            <div>
                                <label className="text-xs text-muted-foreground mb-2 block">{t('gst.gstRate')}</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {gstRates.map(r => (
                                        <button key={r} onClick={() => setStdRate(r)} className={`py-3 rounded-xl text-xs font-bold transition-all border ${stdRate === r ? 'bg-brand-purple border-brand-purple text-foreground' : 'bg-dark-bg border-border text-muted-foreground'}`}>{r}%</button>
                                    ))}
                                </div>
                            </div>
                            <ToggleIGST value={isIGST} onChange={setIsIGST} />
                        </div>

                        {reverseResult && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-xl shadow-black/20">
                                <div className="text-center mb-4">
                                    <p className="text-muted-foreground text-xs mb-1">{t('gst.originalBasePrice')}</p>
                                    <p className="text-3xl font-bold text-brand-green">{formatINR(reverseResult.base)}</p>
                                </div>
                                <div className="space-y-2">
                                    <Row label={t('gst.totalInclGST')} value={stdAmount} color="text-foreground" />
                                    <Row label={t('gst.basePrice')} value={reverseResult.base} color="text-brand-green" dot="bg-brand-green" />
                                    {isIGST ? (
                                        <Row label={`IGST (${stdRate}%)`} value={reverseResult.igst} color="text-brand-purple" dot="bg-brand-purple" />
                                    ) : (
                                        <>
                                            <Row label={`CGST (${stdRate / 2}%)`} value={reverseResult.cgst} color="text-brand-blue" dot="bg-brand-blue" />
                                            <Row label={`SGST (${stdRate / 2}%)`} value={reverseResult.sgst} color="text-brand-gold" dot="bg-brand-gold" />
                                        </>
                                    )}
                                    <div className="pt-2 border-t border-border/40">
                                        <Row label={t('gst.totalGST')} value={reverseResult.gst} color="text-amber-400" dot="bg-amber-400" isBold />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* ─── PROFIT MARGIN MODE ─── */}
                {mode === 'profit' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-card border border-border rounded-2xl p-4 space-y-4 mb-5">
                            <NumberInput label={t('gst.costPrice')} value={costPrice} onChange={setCostPrice} prefix="₹" min={0} max={999999999} />
                            <NumberInput label={t('gst.sellingPrice')} value={sellingPrice} onChange={setSellingPrice} prefix="₹" min={0} max={999999999} />
                            <div>
                                <label className="text-xs text-muted-foreground mb-2 block">{t('gst.gstRateOnSale')}</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {gstRates.map(r => (
                                        <button key={r} onClick={() => setProfitGstRate(r)} className={`py-3 rounded-xl text-xs font-bold transition-all border ${profitGstRate === r ? 'bg-brand-purple border-brand-purple text-foreground' : 'bg-dark-bg border-border text-muted-foreground'}`}>{r}%</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {profitResult && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-xl shadow-black/20">
                                <div className="text-center mb-5">
                                    <p className="text-muted-foreground text-xs mb-1">{t('gst.totalAmountInclGST')}</p>
                                    <p className="text-3xl font-bold text-foreground">{formatINR(profitResult.totalWithGst)}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/30 text-center">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">{t('gst.profit')}</p>
                                        <p className="text-brand-green font-bold text-sm">{formatINR(profitResult.profit)}</p>
                                        <p className="text-[10px] text-muted-foreground">{profitResult.profitPct.toFixed(1)}%</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/30 text-center">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">{t('gst.netGST')}</p>
                                        <p className="text-amber-400 font-bold text-sm">{formatINR(profitResult.netGst)}</p>
                                        <p className="text-[10px] text-muted-foreground">{t('gst.payableToGovt')}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Row label={t('gst.costPriceLabel')} value={costPrice} color="text-muted-foreground" />
                                    <Row label={t('gst.sellingPriceLabel')} value={sellingPrice} color="text-foreground" />
                                    <Row label={t('gst.gstOnSale')} value={profitResult.gstOnSale} color="text-red-400" dot="bg-red-400" />
                                    <Row label={t('gst.gstOnPurchaseITC')} value={profitResult.gstOnCost} color="text-brand-green" dot="bg-brand-green" />
                                    <div className="pt-2 border-t border-border/40">
                                        <Row label={t('gst.netGSTPayable')} value={profitResult.netGst} color="text-amber-400" isBold />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* ─── ITC MODE ─── */}
                {mode === 'itc' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-card border border-border rounded-2xl p-4 space-y-4 mb-5">
                            <NumberInput label={t('gst.gstPaidOnPurchases')} value={purchaseGst} onChange={setPurchaseGst} prefix="₹" min={0} max={999999999} helperText={t('gst.totalGSTPaidHelper')} />
                            <NumberInput label={t('gst.gstCollectedOnSales')} value={salesGst} onChange={setSalesGst} prefix="₹" min={0} max={999999999} helperText={t('gst.totalGSTCollectedHelper')} />
                        </div>

                        {itcResult && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-xl shadow-black/20">
                                <div className="text-center mb-5">
                                    <p className="text-muted-foreground text-xs mb-1">{itcResult.refund > 0 ? t('gst.itcRefundAvailable') : t('gst.netGSTPayable')}</p>
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
                                    <Row label={t('gst.inputTaxPurchases')} value={itcResult.itc} color="text-blue-400" dot="bg-blue-400" />
                                    <Row label={t('gst.outputTaxSales')} value={itcResult.liability} color="text-red-400" dot="bg-red-400" />
                                    <div className="pt-2 border-t border-border/40">
                                        {itcResult.refund > 0 ? (
                                            <Row label={t('gst.refundClaimable')} value={itcResult.refund} color="text-brand-green" dot="bg-brand-green" isBold />
                                        ) : (
                                            <Row label={t('gst.netGSTPayable')} value={itcResult.netPayable} color="text-amber-400" dot="bg-amber-400" isBold />
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
                                <div key={item.id} className="bg-card border border-border rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-muted-foreground">{t('gst.itemNumber', { number: idx + 1 })}</span>
                                        {invoiceItems.length > 1 && (
                                            <button onClick={() => removeInvoiceItem(item.id)} className="text-red-400 text-xs font-bold">{t('gst.remove')}</button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <input
                                            value={item.name}
                                            onChange={e => updateInvoiceItem(item.id, 'name', e.target.value)}
                                            className="w-full px-3.5 py-3 rounded-xl bg-dark-bg border border-border text-foreground text-sm"
                                            placeholder={t('gst.itemName')}
                                        />
                                        <div className="grid grid-cols-3 gap-2">
                                            <NumberInput label={t('gst.qty')} value={item.qty} onChange={v => updateInvoiceItem(item.id, 'qty', v)} min={1} max={99999} />
                                            <NumberInput label={t('gst.price')} value={item.price} onChange={v => updateInvoiceItem(item.id, 'price', v)} prefix="₹" min={0} max={999999999} />
                                            <div>
                                                <label className="text-[10px] text-muted-foreground mb-1 block">{t('gst.gstPercent')}</label>
                                                <select
                                                    value={item.rate}
                                                    onChange={e => updateInvoiceItem(item.id, 'rate', Number(e.target.value))}
                                                    className="w-full px-2 py-3 rounded-xl bg-dark-bg border border-border text-foreground text-xs"
                                                >
                                                    {gstRates.map(r => <option key={r} value={r}>{r}%</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-xs pt-1">
                                            <span className="text-muted-foreground">{t('gst.amount')}: <span className="text-foreground font-bold">{formatINR(item.qty * item.price)}</span></span>
                                            <span className="text-muted-foreground">{t('gst.gstLabel')}: <span className="text-brand-green font-bold">{formatINR(item.qty * item.price * item.rate / 100)}</span></span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={addInvoiceItem} className="w-full py-3 mb-5 rounded-xl border-2 border-dashed border-border text-muted-foreground text-xs font-bold hover:border-brand-purple hover:text-brand-purple transition-all">
                            + {t('gst.addItem')}
                        </button>

                        {/* Invoice Totals */}
                        <motion.div layout className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-xl shadow-black/20">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">{t('gst.invoiceSummary')}</h3>

                            {/* Items table */}
                            <div className="overflow-x-auto mb-4">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-muted-foreground border-b border-border/40">
                                            <th className="text-left py-2 font-medium">{t('gst.item')}</th>
                                            <th className="text-right py-2 font-medium">{t('gst.amt')}</th>
                                            <th className="text-right py-2 font-medium">{t('gst.gstLabel')}</th>
                                            <th className="text-right py-2 font-medium">{t('gst.total')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoiceResult.map(item => (
                                            <tr key={item.id} className="border-b border-border/20">
                                                <td className="py-2 text-slate-600 dark:text-slate-300">{item.name}</td>
                                                <td className="py-2 text-right text-foreground">{formatINR(item.amount)}</td>
                                                <td className="py-2 text-right text-brand-green">{formatINR(item.gst)}</td>
                                                <td className="py-2 text-right text-foreground font-bold">{formatINR(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="space-y-2 pt-3 border-t border-border/40">
                                <Row label={t('gst.taxableAmount')} value={invoiceTotals.amount} color="text-foreground" />
                                {invoiceIsIGST ? (
                                    <Row label={t('gst.igst')} value={invoiceTotals.igst} color="text-brand-purple" dot="bg-brand-purple" />
                                ) : (
                                    <>
                                        <Row label={t('gst.cgst')} value={invoiceTotals.cgst} color="text-brand-blue" dot="bg-brand-blue" />
                                        <Row label={t('gst.sgst')} value={invoiceTotals.sgst} color="text-brand-gold" dot="bg-brand-gold" />
                                    </>
                                )}
                                <div className="pt-2 border-t border-border/40">
                                    <Row label={t('gst.grandTotal')} value={invoiceTotals.total} color="text-brand-green" isBold />
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
                    {saved ? (
                        <>
                            <div className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <Check size={16} /> {t('common.saved')}
                            </div>
                            <button onClick={handleRemove}
                                className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 transition-all active:scale-95">
                                <Trash2 size={16} />
                            </button>
                        </>
                    ) : (
                        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
                            className="flex-1 py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all bg-brand-purple text-white shadow-lg shadow-brand-purple/20">
                            <Save size={18} /> {t('gst.save')}
                        </motion.button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-8">
                    <button onClick={handleDownloadPDF} className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-purple/10 border-2 border-brand-purple/40 text-brand-purple font-bold text-sm">
                        📄 {t('gst.pdf')}
                    </button>
                    <button onClick={handleDownloadExcel} className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-green/10 border-2 border-brand-green/40 text-brand-green font-bold text-sm">
                        📊 {t('gst.excel')}
                    </button>
                </div>

                
                <DisclaimerComponent module="gst" />

                <CalculatorInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} calculatorTitle={t('gst.title')} />
            </div>
        </div>
    );
}

// ── Reusable Components ──

function ToggleIGST({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    const { t } = useTranslation();
    return (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2">
                <Info size={14} className="text-muted-foreground" />
                <span className="text-foreground text-xs font-medium">{t('gst.interstate')}</span>
            </div>
            <button onClick={() => onChange(!value)} className={`w-11 h-6 rounded-full p-1 transition-colors ${value ? 'bg-brand-purple' : 'bg-slate-300 dark:bg-slate-700'}`}>
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
    const { t } = useTranslation();
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-xl shadow-black/20">
            <div className="text-center mb-5">
                <p className="text-muted-foreground text-xs mb-1">{t('gst.finalAmount')}</p>
                <p className="text-3xl font-bold text-foreground">{formatINR(result.total)}</p>
            </div>

            {chartData && (
                <div className="h-44 mb-5 flex justify-center">
                    <Pie ref={chartRef} data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true } } }} />
                </div>
            )}

            <div className="space-y-2 mb-4">
                <Row label={t('gst.baseAmount')} value={result.base} color="text-muted-foreground" />
                {isIGST ? (
                    <Row label={`${t('gst.igst')} (${rate}%)`} value={result.igst} color="text-brand-purple" dot="bg-brand-purple" />
                ) : (
                    <>
                        <Row label={`${t('gst.cgst')} (${rate / 2}%)`} value={result.cgst} color="text-brand-blue" dot="bg-brand-blue" />
                        <Row label={`${t('gst.sgst')} (${rate / 2}%)`} value={result.sgst} color="text-brand-gold" dot="bg-brand-gold" />
                    </>
                )}
                <div className="pt-2 border-t border-border/40">
                    <Row label={t('gst.totalGST')} value={result.gst} color="text-brand-green" dot="bg-brand-green" isBold />
                </div>
            </div>

            <button onClick={() => setShowBreakdown(!showBreakdown)} className="flex items-center gap-1 text-xs text-brand-purple font-bold">
                {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showBreakdown ? t('gst.hideRateComparison') : t('gst.showRateComparison')}
            </button>
            <AnimatePresence>
                {showBreakdown && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 space-y-2">
                            {[5, 12, 18, 28].map(r => {
                                const g = result.base * (r / 100);
                                return (
                                    <div key={r} className={`flex justify-between items-center py-2 px-3 rounded-lg ${r === rate ? 'bg-brand-purple/10 border border-brand-purple/30' : 'bg-slate-100 dark:bg-slate-800/20'}`}>
                                        <span className="text-xs text-muted-foreground">{r}% {t('gst.gstLabel')}</span>
                                        <div className="text-right">
                                            <span className="text-xs text-foreground font-bold">{formatINR(result.base + g)}</span>
                                            <span className="text-[10px] text-muted-foreground ml-2">({t('gst.gstLabel')}: {formatINR(g)})</span>
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
                <span className="text-muted-foreground text-[11px] font-medium">{label}</span>
            </div>
            <span className={`text-sm ${isBold ? 'font-bold' : 'font-semibold'} ${color || 'text-foreground'}`}>{formatINR(value)}</span>
        </div>
    );
}
