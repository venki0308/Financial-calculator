import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BrainCircuit, ChevronDown, ChevronUp, Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { AnalyticsService } from '../lib/analytics';
import { formatINR, computeCapitalGains, CII, type CgAssetType } from '../utils/calculations';
import NumberInput from '../components/NumberInput';
import DateInput from '../components/DateInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { useHistoryTracker } from '../hooks/useHistoryTracker';

const fmtINR = (v: number) => formatINR(Math.round(v));
const todayISO = () => new Date().toISOString().slice(0, 10);
const yearsAgoISO = (y: number) => { const d = new Date(); d.setFullYear(d.getFullYear() - y); return d.toISOString().slice(0, 10); };

const ASSETS: { id: CgAssetType; key: string }[] = [
    { id: 'equity', key: 'cgt.assetEquity' },
    { id: 'debtMF', key: 'cgt.assetDebt' },
    { id: 'property', key: 'cgt.assetProperty' },
    { id: 'gold', key: 'cgt.assetGold' },
];
const SLABS = [5, 10, 15, 20, 25, 30];

export default function CapitalGainsCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    useEffect(() => { AnalyticsService.trackScreen('CapitalGains_Calculator'); }, []);

    const [asset, setAsset] = useState<CgAssetType>('equity');
    const [purchaseDate, setPurchaseDate] = useState(yearsAgoISO(3));
    const [saleDate, setSaleDate] = useState(todayISO());
    const [cost, setCost] = useState(500000);
    const [sale, setSale] = useState(900000);
    const [expenses, setExpenses] = useState(0);
    const [improvement, setImprovement] = useState(0);
    const [slabRate, setSlabRate] = useState(30);
    const [showBreakdown, setShowBreakdown] = useState(false);

    const result = useMemo(() => computeCapitalGains({
        asset, purchaseDate, saleDate, cost, sale, expenses,
        improvement: asset === 'property' ? improvement : 0,
        slabRate,
    }), [asset, purchaseDate, saleDate, cost, sale, expenses, improvement, slabRate]);

    useHistoryTracker('Capital Gains', { asset, purchaseDate, saleDate, cost, sale, expenses, improvement, slabRate }, { gain: result.gain, tax: result.totalTax }, result.totalTax);

    const usesSlab = result.method === 'slab';
    const isLoss = result.gain <= 0;

    // ── Smart insight ──
    const insight = useMemo(() => {
        if (isLoss) return { msg: t('cgt.loss'), tone: 'info' as const };
        if (result.insightWaitDays && result.insightWaitSaving && result.insightWaitSaving > 0) {
            return { msg: t('cgt.insightWaitLtcg', { days: result.insightWaitDays, amount: fmtINR(result.insightWaitSaving) }), tone: 'warn' as const };
        }
        if (asset === 'property' && result.taxIndexed !== undefined && result.taxIndexed < result.taxNoIndex) {
            return { msg: t('cgt.insightIndexSaves', { amount: fmtINR(result.taxNoIndex - result.taxIndexed) }), tone: 'success' as const };
        }
        if (asset === 'debtMF' && result.specifiedMF) return { msg: t('cgt.insightSpecifiedMF'), tone: 'info' as const };
        if (asset === 'equity' && result.isLong) return { msg: t('cgt.insightEquityExempt'), tone: 'success' as const };
        return { msg: t('cgt.note'), tone: 'info' as const };
    }, [asset, result, isLoss, t]);

    const methodLabel = (() => {
        switch (result.method) {
            case 'ltcgEquity': return t('cgt.methodLtcgEquity');
            case 'stcgEquity': return t('cgt.methodStcgEquity');
            case 'ltcgIndexed': return t('cgt.methodIndexed');
            case 'ltcgFlat': return t('cgt.methodNoIndex');
            default: return t('cgt.methodSlab', { rate: slabRate });
        }
    })();

    const toneCls = insight.tone === 'warn' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : insight.tone === 'success' ? 'bg-brand-green/10 border-brand-green/30 text-brand-green' : 'bg-primary/10 border-primary/30 text-primary';

    return (
        <div className="px-5 pt-14 pb-28 animate-fade-in max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border text-foreground"><ArrowLeft size={18} /></button>
                <div>
                    <h1 className="text-lg font-bold text-foreground leading-tight">{t('cgt.title')}</h1>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{t('cgt.subtitle')}</p>
                </div>
            </div>

            <div className="space-y-5">
                {/* Asset type */}
                <div>
                    <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('cgt.assetType')}</label>
                    <div className="grid grid-cols-2 gap-2">
                        {ASSETS.map(a => (
                            <button key={a.id} onClick={() => setAsset(a.id)}
                                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${asset === a.id ? 'bg-primary text-white border-primary shadow-sm' : 'bg-card border-border text-foreground'}`}>
                                {t(a.key)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                    <DateInput label={t('cgt.purchaseDate')} value={purchaseDate} onChange={setPurchaseDate} max={saleDate || todayISO()} />
                    <DateInput label={t('cgt.saleDate')} value={saleDate} onChange={setSaleDate} min={purchaseDate} max={todayISO()} />
                </div>
                {result.pre2001 && <p className="text-[10px] text-amber-600 -mt-2">{t('cgt.pre2001')}</p>}

                {/* Amounts */}
                <NumberInput label={t('cgt.cost')} value={cost} onChange={setCost} min={0} max={1000000000} prefix="₹" step={1000} />
                <NumberInput label={t('cgt.salePrice')} value={sale} onChange={setSale} min={0} max={1000000000} prefix="₹" step={1000} />
                <NumberInput label={t('cgt.expenses')} value={expenses} onChange={setExpenses} min={0} max={100000000} prefix="₹" step={500} />
                {asset === 'property' && (
                    <NumberInput label={t('cgt.improvement')} value={improvement} onChange={setImprovement} min={0} max={100000000} prefix="₹" step={1000} />
                )}

                {/* Slab (only when gains can be taxed at slab) */}
                {asset !== 'equity' && (
                    <div>
                        <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('cgt.slabRate')}</label>
                        <div className="flex gap-1.5">
                            {SLABS.map(s => (
                                <button key={s} onClick={() => setSlabRate(s)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${slabRate === s ? 'bg-brand-gold text-white border-brand-gold' : 'bg-card border-border text-foreground'}`}>
                                    {s}%
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Results */}
                <div className={`rounded-[24px] overflow-hidden border p-6 ${isLoss ? 'bg-card border-border' : 'bg-gradient-to-br from-brand-green/20 to-emerald-500/10 border-brand-green/30'}`}>
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">{t('cgt.taxPayable')}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${result.isLong ? 'bg-brand-green text-white' : 'bg-amber-500 text-white'}`}>
                            {result.isLong ? t('cgt.longTerm') : t('cgt.shortTerm')}
                        </span>
                    </div>
                    <p className={`font-black text-4xl tracking-tight mb-1 ${isLoss ? 'text-foreground' : 'text-brand-green'}`}>{fmtINR(result.totalTax)}</p>
                    <p className="text-[10px] text-muted-foreground mb-4">{methodLabel}</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-background/50 p-3 rounded-xl border border-border/50">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold truncate">{t('cgt.gain')}</p>
                            <p className={`font-bold text-lg flex items-center gap-1 ${isLoss ? 'text-red-500' : 'text-foreground'}`}>
                                {isLoss ? <TrendingDown size={14} /> : <TrendingUp size={14} />}{fmtINR(result.gain)}
                            </p>
                        </div>
                        <div className="bg-background/50 p-3 rounded-xl border border-border/50">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold truncate">{t('cgt.effectiveRate')}</p>
                            <p className="text-foreground font-bold text-lg">{result.effectiveRate.toFixed(1)}%</p>
                        </div>
                        <div className="bg-background/50 p-3 rounded-xl border border-border/50 col-span-2">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold truncate">{t('cgt.netProceeds')}</p>
                            <p className="text-foreground font-bold text-lg">{fmtINR(result.netProceeds)}</p>
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3">{t('cgt.holding', { months: result.holdingMonths })}</p>
                </div>

                {/* Insight */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${toneCls}`}>
                    <BrainCircuit size={18} className="shrink-0 mt-0.5" />
                    <p className="text-[11px] text-foreground/80 leading-relaxed font-medium">{insight.msg}</p>
                </div>

                {/* Breakdown */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowBreakdown(p => !p)} className="w-full flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-amber-500/10 rounded text-amber-500"><Calculator size={14} /></div>
                            <span className="text-foreground font-bold text-sm">{t('cgt.breakdown')}</span>
                        </div>
                        {showBreakdown ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </button>
                    {showBreakdown && (
                        <div className="px-4 pb-4 space-y-2 text-xs">
                            <Row k={t('cgt.purchaseDate')} v={t('cgt.fyLabel', { fy: result.purchaseFY, cii: CII[result.purchaseFY] ?? '—' })} />
                            <Row k={t('cgt.saleDate')} v={t('cgt.fyLabel', { fy: result.saleFY, cii: CII[result.saleFY] ?? '—' })} />
                            {result.indexedCost !== undefined && <Row k={t('cgt.indexedCost', { p: CII[result.purchaseFY], s: CII[result.saleFY] })} v={fmtINR(result.indexedCost)} />}
                            {asset === 'property' && result.taxIndexed !== undefined && (
                                <>
                                    <Row k={t('cgt.methodNoIndex')} v={fmtINR(result.taxNoIndex)} />
                                    <Row k={t('cgt.methodIndexed')} v={fmtINR(result.taxIndexed)} />
                                    <p className="text-[10px] text-brand-green font-semibold">{t('cgt.chosenLower')}</p>
                                </>
                            )}
                            {result.exemptionUsed > 0 && <Row k={t('cgt.exemption')} v={fmtINR(result.exemptionUsed)} />}
                            <Row k={t('cgt.taxableGain')} v={fmtINR(result.taxableGain)} />
                            <Row k={usesSlab ? t('cgt.methodSlab', { rate: slabRate }) : `${t('cgt.taxRate')} ${result.rate}%`} v={fmtINR(result.tax)} />
                            <Row k={t('cgt.cess')} v={fmtINR(result.cess)} />
                            <p className="text-[10px] text-muted-foreground pt-1 leading-snug">{t('cgt.note')}</p>
                        </div>
                    )}
                </div>
            </div>

            <DisclaimerComponent module="tax" />
        </div>
    );
}

function Row({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex justify-between gap-3 py-1 border-b border-border/40 last:border-0">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-bold text-foreground text-right">{v}</span>
        </div>
    );
}
