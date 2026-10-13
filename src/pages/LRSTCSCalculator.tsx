import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BrainCircuit, Globe, Info } from 'lucide-react';
import { AnalyticsService } from '../lib/analytics';
import { formatINR, computeLrsTcs, LRS_TCS_THRESHOLD, type LrsPurpose } from '../utils/calculations';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { useHistoryTracker } from '../hooks/useHistoryTracker';

const fmtINR = (v: number) => formatINR(Math.round(v));

const PURPOSES: { id: LrsPurpose; key: string }[] = [
    { id: 'eduLoan', key: 'lrs.pEduLoan' },
    { id: 'eduMedical', key: 'lrs.pEduMedical' },
    { id: 'tour', key: 'lrs.pTour' },
    { id: 'other', key: 'lrs.pOther' },
];

export default function LRSTCSCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    useEffect(() => { AnalyticsService.trackScreen('LRS_TCS_Calculator'); }, []);

    const [purpose, setPurpose] = useState<LrsPurpose>('eduMedical');
    const [amount, setAmount] = useState(1500000);
    const [already, setAlready] = useState(0);

    const r = useMemo(() => computeLrsTcs(purpose, amount, already), [purpose, amount, already]);
    useHistoryTracker('LRS TCS', { purpose, amount, already }, { tcs: r.tcs, rate: r.rate }, r.tcs);

    const insight = r.tcs === 0
        ? t('lrs.insightNoTcs')
        : (r.taxableAmount < amount ? t('lrs.insightSplit', { amount: fmtINR(r.taxableAmount) }) : t('lrs.creditNote'));

    return (
        <div className="px-5 pt-14 pb-28 animate-fade-in max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border text-foreground"><ArrowLeft size={18} /></button>
                <div>
                    <h1 className="text-lg font-bold text-foreground leading-tight">{t('lrs.title')}</h1>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{t('lrs.subtitle')}</p>
                </div>
            </div>

            <div className="space-y-5">
                <div>
                    <label className="text-muted-foreground text-[10px] uppercase font-bold mb-1.5 block">{t('lrs.purpose')}</label>
                    <div className="grid grid-cols-2 gap-2">
                        {PURPOSES.map(p => (
                            <button key={p.id} onClick={() => setPurpose(p.id)}
                                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all leading-tight ${purpose === p.id ? 'bg-primary text-white border-primary shadow-sm' : 'bg-card border-border text-foreground'}`}>
                                {t(p.key)}
                            </button>
                        ))}
                    </div>
                </div>

                <NumberInput label={t('lrs.amount')} value={amount} onChange={setAmount} min={0} max={250000000} prefix="₹" step={10000} />
                {purpose !== 'tour' && purpose !== 'eduLoan' && (
                    <NumberInput label={t('lrs.already')} value={already} onChange={setAlready} min={0} max={250000000} prefix="₹" step={10000} helperText={t('lrs.thresholdLeft') + ': ' + fmtINR(r.thresholdLeft)} />
                )}

                {/* Results */}
                <div className={`rounded-[24px] overflow-hidden border p-6 ${r.tcs > 0 ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/30' : 'bg-gradient-to-br from-brand-green/20 to-emerald-500/10 border-brand-green/30'}`}>
                    <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider mb-1">{t('lrs.tcs')}</p>
                    <p className={`font-black text-4xl tracking-tight mb-1 ${r.tcs > 0 ? 'text-amber-600' : 'text-brand-green'}`}>{fmtINR(r.tcs)}</p>
                    <p className="text-[10px] text-muted-foreground mb-4">{t('lrs.rateApplied')}: {r.rate}%</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-background/50 p-3 rounded-xl border border-border/50">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold truncate">{t('lrs.taxablePortion')}</p>
                            <p className="text-foreground font-bold text-lg">{fmtINR(r.taxableAmount)}</p>
                        </div>
                        <div className="bg-background/50 p-3 rounded-xl border border-border/50">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold truncate">{t('lrs.totalOutflow')}</p>
                            <p className="text-foreground font-bold text-lg">{fmtINR(r.totalOutflow)}</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 rounded-xl border bg-primary/10 border-primary/30 flex items-start gap-3">
                    <BrainCircuit size={18} className="shrink-0 mt-0.5 text-primary" />
                    <p className="text-[11px] text-foreground/80 leading-relaxed font-medium">{insight}</p>
                </div>

                {/* Rules card */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1 bg-blue-500/10 rounded text-blue-500"><Globe size={14} /></div>
                        <span className="text-foreground font-bold text-sm">{t('lrs.rulesTitle')}</span>
                    </div>
                    {[t('lrs.ruleEduLoan'), t('lrs.ruleEduMedical'), t('lrs.ruleTour'), t('lrs.ruleOther')].map((line, i) => (
                        <div key={i} className="flex gap-2 text-xs leading-snug">
                            <span className="shrink-0 w-4 h-4 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center font-bold text-[10px] mt-0.5">✓</span>
                            <span className="text-foreground/90">{line}</span>
                        </div>
                    ))}
                    <div className="flex gap-2 text-[10px] text-muted-foreground leading-snug pt-2 border-t border-border/50">
                        <Info size={12} className="shrink-0 mt-0.5" />
                        <span>{t('lrs.limitNote', { threshold: fmtINR(LRS_TCS_THRESHOLD) })}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">{t('lrs.creditNote')}</p>
                </div>
            </div>

            <DisclaimerComponent module="tax" />
        </div>
    );
}
