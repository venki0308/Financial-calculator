import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import { formatINR } from '../utils/calculations';

/**
 * Compact post-tax preview surfaced on investment calculators (SIP, Lumpsum,
 * Compound Interest, etc.). Shows the user what their pre-tax projection
 * actually looks like after Indian capital-gains tax — defaulting to the
 * equity LTCG rule (12.5% above ₹1.25L gain after 12 months, post 23-Jul-2024)
 * but letting them switch to debt (slab rate, no indexation post Apr 2023).
 *
 * SEBI / AMC best-practice: never show only pre-tax wealth. Showing both
 * "Pre-tax" and "After 12.5% LTCG" lets users compare apples-to-apples
 * against tax-advantaged products (PPF, EPF, ULIP) where the gross IS
 * the take-home.
 */
interface Props {
    /** Amount the user invested (their cost basis). */
    invested: number;
    /** Final corpus / maturity value before any tax. */
    grossMaturity: number;
    /** Indian-currency formatter. Allows the parent to override if needed. */
    fmt?: (n: number) => string;
}

type AssetClass = 'equity' | 'debt';

export default function PostTaxBanner({ invested, grossMaturity, fmt }: Props) {
    const { t } = useTranslation();
    const [assetClass, setAssetClass] = useState<AssetClass>('equity');
    const [slab, setSlab] = useState(20); // marginal tax rate for debt path
    const [expanded, setExpanded] = useState(false);

    const format = fmt || ((v: number) => formatINR(Math.round(v)));
    const gain = Math.max(0, grossMaturity - invested);

    // ── Equity path ──────────────────────────────────────────────────────────
    // LTCG: 12.5% on gains above ₹1.25L (rule effective 23 Jul 2024). For STCG
    // we'd use 20% but the calculators are long-horizon; we assume LTCG.
    const EQUITY_LTCG_EXEMPT = 125000;
    const EQUITY_LTCG_RATE = 0.125;
    const equityTaxableGain = Math.max(0, gain - EQUITY_LTCG_EXEMPT);
    const equityTax = equityTaxableGain * EQUITY_LTCG_RATE;
    const equityPostTax = grossMaturity - equityTax;

    // ── Debt path ────────────────────────────────────────────────────────────
    // Post Apr 2023, debt fund gains are taxed at user's slab rate, no
    // indexation, regardless of holding period.
    const debtTax = gain * (slab / 100);
    const debtPostTax = grossMaturity - debtTax;

    const postTax = assetClass === 'equity' ? equityPostTax : debtPostTax;
    const taxPaid = assetClass === 'equity' ? equityTax : debtTax;
    const drag = grossMaturity > 0 ? (taxPaid / grossMaturity) * 100 : 0;

    return (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/5 to-indigo-500/5 border border-violet-500/20">
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <Receipt size={16} className="text-violet-500" />
                    <div className="text-left">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t('common.postTaxPreview', 'After-tax value')}
                        </p>
                        <p className="text-sm font-black text-foreground">
                            {format(postTax)}
                            <span className="text-[10px] text-muted-foreground font-normal ml-1.5">
                                ({assetClass === 'equity' ? t('common.equityLtcg', 'Equity LTCG') : t('common.debtSlab', 'Debt @ {{slab}}%', { slab })})
                            </span>
                        </p>
                    </div>
                </div>
                {expanded
                    ? <ChevronUp size={16} className="text-muted-foreground" />
                    : <ChevronDown size={16} className="text-muted-foreground" />}
            </button>

            {expanded && (
                <div className="mt-4 space-y-3">
                    {/* Asset class toggle */}
                    <div className="flex gap-1 bg-white dark:bg-card border border-border rounded-xl p-1">
                        {(['equity', 'debt'] as const).map(ac => (
                            <button
                                key={ac}
                                onClick={() => setAssetClass(ac)}
                                className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${assetClass === ac ? 'bg-violet-600 text-white shadow' : 'text-muted-foreground'}`}
                            >
                                {ac === 'equity'
                                    ? t('common.equityFund', '📈 Equity fund')
                                    : t('common.debtFund', '🏦 Debt fund')}
                            </button>
                        ))}
                    </div>

                    {/* Debt slab picker */}
                    {assetClass === 'debt' && (
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                                {t('common.yourSlab', 'Your tax slab')}
                            </label>
                            <div className="flex gap-1.5">
                                {[5, 10, 15, 20, 30].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setSlab(s)}
                                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold ${slab === s ? 'bg-violet-600 text-white' : 'border border-border text-muted-foreground'}`}
                                    >
                                        {s}%
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Breakdown */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-card border border-border">
                            <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('common.preTax', 'Pre-tax')}</p>
                            <p className="font-black text-foreground">{format(grossMaturity)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-card border border-emerald-500/30">
                            <p className="text-emerald-500 text-[9px] uppercase font-bold mb-0.5">{t('common.postTax', 'Post-tax')}</p>
                            <p className="font-black text-emerald-500">{format(postTax)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-card border border-border">
                            <p className="text-muted-foreground text-[9px] uppercase font-bold mb-0.5">{t('common.totalGain', 'Total gain')}</p>
                            <p className="font-black text-foreground">{format(gain)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-card border border-red-500/30">
                            <p className="text-red-500 text-[9px] uppercase font-bold mb-0.5">{t('common.taxPaid', 'Tax')}</p>
                            <p className="font-black text-red-500">{format(taxPaid)}</p>
                        </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground leading-snug">
                        {assetClass === 'equity'
                            ? t('common.equityTaxNote', 'Equity LTCG @ 12.5% on gains above ₹1.25L for holdings ≥ 12 months (rule effective 23 Jul 2024). PPF, EPF, ULIP are tax-free at maturity and not covered here.')
                            : t('common.debtTaxNote', 'Post April 2023, all debt fund gains are taxed at your slab rate with no indexation, regardless of holding period.')}
                        {' '}{t('common.taxDrag', 'Tax drag: {{pct}}% of corpus.', { pct: drag.toFixed(2) })}
                    </p>
                </div>
            )}
        </div>
    );
}
