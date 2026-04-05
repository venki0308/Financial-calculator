import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Download, Share2, Save, TrendingUp, ChevronDown, ChevronUp, DollarSign, Target } from 'lucide-react';
import { nativeShare } from '../utils/nativeShare';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';

import ShareableCard from '../components/ShareableCard';
import WhatIfSimulator from '../components/WhatIfSimulator';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, type ExportConfig } from '../utils/exportReport';
import { AnalyticsService } from '../lib/analytics';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useAppColors } from '../theme/useAppColors';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

export default function BreakEvenCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('BreakEven'); }, []);
    useTrackCalculator();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addSaved } = useCalculatorStore();
    const chartRef = useRef<any>(null);
    const c = useAppColors();

    const [fixed, setFixed] = useState(50000);
    const [price, setPrice] = useState(200);
    const [variable, setVariable] = useState(120);
    const [showProjection, setShowProjection] = useState(false);
    const [saved, setSaved] = useState(false);

    const result = useMemo(() => {
        const contribution = price - variable;
        const breakEvenUnits = contribution > 0 ? Math.ceil(fixed / contribution) : 0;
        const breakEvenSales = breakEvenUnits * price;
        const marginPct = contribution > 0 ? ((contribution / price) * 100).toFixed(1) : '0';

        // Profit projection table — units from 0 to 2x breakeven
        const projection = [];
        const maxUnits = Math.max(breakEvenUnits * 2, 20);
        const step = Math.max(Math.ceil(maxUnits / 10), 1);
        for (let u = 0; u <= maxUnits; u += step) {
            const revenue = u * price;
            const totalCost = fixed + u * variable;
            const profit = revenue - totalCost;
            projection.push({ units: u, revenue, totalCost, profit });
        }

        return { breakEvenUnits, breakEvenSales, contribution, marginPct, projection };
    }, [fixed, price, variable]);

    // Revenue timeline chart
    const chartData = useMemo(() => ({
        labels: result.projection.map(p => `${p.units}`),
        datasets: [
            { label: t('breakeven.revenue'), data: result.projection.map(p => p.revenue), borderColor: '#10B981', backgroundColor: '#10B98130', fill: false, tension: 0.3, pointRadius: 2, borderWidth: 2 },
            { label: t('breakeven.totalCost'), data: result.projection.map(p => p.totalCost), borderColor: '#EF4444', backgroundColor: '#EF444430', fill: false, tension: 0.3, pointRadius: 2, borderWidth: 2 },
        ]
    }), [result.projection, t]);

    // Profit bar chart
    const profitChart = useMemo(() => ({
        labels: result.projection.map(p => `${p.units}`),
        datasets: [{
            label: t('breakeven.profitLoss'),
            data: result.projection.map(p => p.profit),
            backgroundColor: result.projection.map(p => p.profit >= 0 ? '#10B981' : '#EF4444'),
        }]
    }), [result.projection, t]);

    const handleSave = () => {
        addSaved({ id: `be-${Date.now()}`, calculatorType: 'Break Even Calculator', inputValues: { fixed, price, variable }, resultValues: { primary: result.breakEvenUnits }, timestamp: Date.now() });
        setSaved(true); setTimeout(() => setSaved(false), 2000);
    };

    const handlePDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        await exportToPDF({
            title: t('breakeven.reportTitle'),
            inputs: [
                { label: t('breakeven.fixedCosts'), value: `₹${Math.round(fixed).toLocaleString('en-IN')}` },
                { label: t('breakeven.sellingPricePerUnit'), value: `₹${Math.round(price).toLocaleString('en-IN')}` },
                { label: t('breakeven.variableCostPerUnit'), value: `₹${Math.round(variable).toLocaleString('en-IN')}` },
            ],
            results: [
                { label: t('breakeven.breakEvenUnits'), value: `${Math.round(result.breakEvenUnits).toLocaleString('en-IN')} ${t('breakeven.units')}` },
                { label: t('breakeven.breakEvenRevenue'), value: `₹${Math.round(result.breakEvenSales).toLocaleString('en-IN')}` },
                { label: t('breakeven.contributionMarginPerUnit'), value: `₹${Math.round(result.contribution).toLocaleString('en-IN')}` },
                { label: t('breakeven.contributionMarginPercent'), value: `${result.marginPct}%` },
            ],
            projectionTitle: t('breakeven.profitLossAtVolumes'),
            projectionColumns: [t('breakeven.unitsSold'), t('breakeven.revenue'), t('breakeven.totalCost'), t('breakeven.profitLoss'), t('breakeven.marginPercent')],
            projectionRows: result.projection.map((r: any) => [
                Math.round(r.units).toLocaleString('en-IN'),
                `₹${Math.round(r.revenue).toLocaleString('en-IN')}`,
                `₹${Math.round(r.totalCost).toLocaleString('en-IN')}`,
                `₹${Math.round(r.profit).toLocaleString('en-IN')}`,
                r.revenue > 0 ? `${((r.profit / r.revenue) * 100).toFixed(1)}%` : '0%',
            ]),
            filename: `FinCalix_BreakEven_Report_${tag}`,
        });
    };

    const handleExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        await exportToExcel({
            title: t('breakeven.reportTitle'),
            inputs: [
                { label: t('breakeven.fixedCosts'), value: `₹${Math.round(fixed).toLocaleString('en-IN')}` },
                { label: t('breakeven.sellingPricePerUnit'), value: `₹${price}` },
                { label: t('breakeven.variableCostPerUnit'), value: `₹${variable}` },
            ],
            results: [
                { label: t('breakeven.breakEvenUnits'), value: String(Math.round(result.breakEvenUnits)) },
                { label: t('breakeven.breakEvenRevenue'), value: `₹${Math.round(result.breakEvenSales).toLocaleString('en-IN')}` },
                { label: t('breakeven.contributionMarginPercent'), value: `${result.marginPct}%` },
            ],
            projectionTitle: t('breakeven.profitLossProjection'),
            projectionColumns: [t('breakeven.unitsSold'), t('breakeven.revenue'), t('breakeven.totalCost'), t('breakeven.profitLoss'), t('breakeven.marginPercent')],
            projectionRows: result.projection.map((r: any) => [
                Math.round(r.units),
                Math.round(r.revenue),
                Math.round(r.totalCost),
                Math.round(r.profit),
                r.revenue > 0 ? ((r.profit / r.revenue) * 100).toFixed(1) : '0',
            ]),
            filename: `FinCalix_BreakEven_Report_${tag}`,
        });
    };

    const handleShare = async () => {
        const text = `📊 ${t('breakeven.breakEvenAnalysis')}\n\n🔧 ${t('breakeven.fixedCosts')}: ${formatINR(fixed)}\n💰 ${t('breakeven.pricePerUnit')}: ${formatINR(price)}\n📦 ${t('breakeven.variableCostSlash')}: ${formatINR(variable)}\n\n✅ ${t('breakeven.breakEvenUnits')}: ${result.breakEvenUnits} ${t('breakeven.units')}\n💵 ${t('breakeven.revenueNeeded')}: ${formatINR(result.breakEvenSales)}\n📈 ${t('breakeven.marginPercent')}: ${result.marginPct}%\n\n${t('breakeven.calculatedWith')} 🧮`;
        await nativeShare(`${t('breakeven.breakEvenAnalysis')} – FinCalix`, text);
    };

    return (
        <div className="min-h-dvh bg-background animate-fade-in">
            <div className="sticky top-0 z-10 bg-background  px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border"><ArrowLeft size={18} className="text-muted-foreground" /></button>
                    <div><h1 className="text-lg font-bold text-foreground">{t('breakeven.title')}</h1><p className="text-muted-foreground text-xs">{t('breakeven.subtitle')}</p></div>
                </div>
            </div>

            
            <DisclaimerComponent module="general" />

            <div className="px-4 pb-28 pt-4 space-y-5">
                <div className="space-y-3">
                    <NumberInput label={t('breakeven.fixedCosts')} value={fixed} onChange={setFixed} min={0} max={10000000} prefix="₹" helperText={t('breakeven.fixedCostsHelper')} />
                    <NumberInput label={t('breakeven.sellingPricePerUnit')} value={price} onChange={setPrice} min={1} max={1000000} prefix="₹" />
                    <NumberInput label={t('breakeven.variableCostPerUnit')} value={variable} onChange={setVariable} min={0} max={1000000} prefix="₹" />
                </div>

                {/* Result Card */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/20">
                    <p className="text-emerald-300/60 text-[10px] font-bold uppercase tracking-wider mb-1">{t('breakeven.unitsToBreakEven')}</p>
                    <p className="text-3xl font-black text-foreground mb-4">{result.breakEvenUnits.toLocaleString('en-IN')}</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-muted-foreground text-[10px] uppercase font-bold">{t('breakeven.breakEvenRevenue')}</p><p className="text-brand-green font-bold text-sm">{formatINR(result.breakEvenSales)}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase font-bold">{t('breakeven.marginPerUnit')}</p><p className="text-blue-400 font-bold text-sm">{formatINR(result.contribution)}</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase font-bold">{t('breakeven.contributionMargin')}</p><p className="text-amber-400 font-bold text-sm">{result.marginPct}%</p></div>
                        <div><p className="text-muted-foreground text-[10px] uppercase font-bold">{t('breakeven.fixedCostRecovery')}</p><p className="text-foreground font-bold text-sm">{formatINR(fixed)}</p></div>
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-foreground font-bold text-sm">
                        <Save size={16} /> {saved ? t('breakeven.saved') : t('breakeven.saveCalculation')}
                    </motion.button>
                </motion.div>

                {/* Revenue vs Cost Chart */}
                <div className="p-4 rounded-2xl bg-card border border-border">
                    <h3 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-green-400" /> {t('breakeven.revenueVsCost')}</h3>
                    <div className="h-52">
                        <Line ref={chartRef} data={chartData} options={{
                            responsive: true, maintainAspectRatio: false,
                            scales: {
                                y: { grid: { color: c.border }, ticks: { color: c.textMuted, font: { size: 8 }, callback: (v: any) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K` } },
                                x: { grid: { display: false }, ticks: { color: c.textMuted, font: { size: 9 } }, title: { display: true, text: t('breakeven.units'), color: c.textMuted, font: { size: 9 } } },
                            },
                            plugins: { legend: { labels: { color: c.textSecondary, font: { size: 10 } } } }
                        }} />
                    </div>
                    <p className="text-muted-foreground text-[10px] mt-2 text-center">{t('breakeven.chartDescription', { units: result.breakEvenUnits })}</p>
                </div>

                {/* Profit/Loss Bar Chart */}
                <div className="p-4 rounded-2xl bg-card border border-border">
                    <h3 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2"><DollarSign size={16} className="text-emerald-400" /> {t('breakeven.profitProjection')}</h3>
                    <div className="h-48">
                        <Bar data={profitChart} options={{
                            responsive: true, maintainAspectRatio: false,
                            scales: {
                                y: { grid: { color: c.border }, ticks: { color: c.textMuted, font: { size: 8 }, callback: (v: any) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K` } },
                                x: { grid: { display: false }, ticks: { color: c.textMuted, font: { size: 9 } }, title: { display: true, text: t('breakeven.units'), color: c.textMuted, font: { size: 9 } } },
                            },
                            plugins: { legend: { display: false } }
                        }} />
                    </div>
                </div>

                {/* Projection Table */}
                <button onClick={() => setShowProjection(!showProjection)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm">
                    <span className="flex items-center gap-2"><Target size={16} className="text-muted-foreground" /> {t('breakeven.profitProjectionTable')}</span>
                    {showProjection ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                    {showProjection && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="rounded-2xl bg-card border border-border overflow-hidden">
                                <div className="grid grid-cols-4 text-[9px] font-bold text-muted-foreground uppercase p-2 bg-slate-100 dark:bg-slate-800/50"><span>{t('breakeven.units')}</span><span>{t('breakeven.revenue')}</span><span>{t('breakeven.cost')}</span><span>{t('breakeven.profit')}</span></div>
                                {result.projection.map((p, i) => (
                                    <div key={i} className={`grid grid-cols-4 text-[10px] p-2 ${p.units === result.breakEvenUnits ? 'bg-green-500/10 border-l-2 border-green-500' : i % 2 === 0 ? 'bg-card' : 'bg-slate-100 dark:bg-slate-800/20'}`}>
                                        <span className="text-slate-600 dark:text-slate-300">{p.units}</span>
                                        <span className="text-blue-600 dark:text-blue-400">{formatINR(p.revenue)}</span>
                                        <span className="text-orange-600 dark:text-orange-400">{formatINR(p.totalCost)}</span>
                                        <span className={`font-bold ${p.profit >= 0 ? 'text-brand-green' : 'text-red-400'}`}>{formatINR(p.profit)}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Export & Share */}
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={handlePDF} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-muted-foreground text-[10px] font-medium"><Download size={16} /> {t('breakeven.pdf')}</button>
                    <button onClick={handleExcel} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-muted-foreground text-[10px] font-medium"><Download size={16} /> {t('breakeven.excel')}</button>
                    <button onClick={handleShare} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white text-[10px] font-bold"><Share2 size={16} /> {t('breakeven.share')}</button>
                </div>

                {/* What-If Simulator */}
                <WhatIfSimulator
                    sliders={[
                        { key: 'price', label: t('breakeven.sellingPriceSlash'), min: 10, max: 10000, step: 10, prefix: '₹' },
                        { key: 'variable', label: t('breakeven.variableCostSlash'), min: 0, max: 10000, step: 10, prefix: '₹' },
                        { key: 'fixed', label: t('breakeven.fixedCosts'), min: 10000, max: 1000000, step: 5000, prefix: '₹' },
                    ]}
                    currentInputs={{ price, variable, fixed }}
                    calculateResult={(inputs) => {
                        const c = inputs.price - inputs.variable;
                        return c > 0 ? Math.ceil(inputs.fixed / c) : 0;
                    }}
                    resultLabel={t('breakeven.breakEvenUnits')}
                    resultPrefix=""
                />

                <ShareableCard
                    title={t('breakeven.breakEvenAnalysis')}
                    highlight={`${result.breakEvenUnits} ${t('breakeven.units')}`}
                    subtitle={`${t('breakeven.revenueTarget')}: ${formatINR(result.breakEvenSales)}`}
                    details={[
                        { label: t('breakeven.fixedCosts'), value: formatINR(fixed) },
                        { label: t('breakeven.pricePerUnit'), value: formatINR(price) },
                        { label: t('breakeven.marginPerUnit'), value: formatINR(result.contribution) },
                        { label: t('breakeven.marginPercent'), value: `${result.marginPct}%` },
                    ]}
                    gradient="from-green-600 via-emerald-500 to-teal-500"
                />
            </div>
        </div>
    );
}
