/**
 * Capital gains tax on a sale today: the app's computeCapitalGains (src/utils/calculations.ts),
 * with the purchase date set from the months held.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { computeCapitalGains } from '../../../../utils/calculations';
import type { CgAssetType } from '../../../../utils/calculations';

const SALE_DATE = '2026-11-17';
const boughtMonthsAgo = (m: number) => {
    const d = new Date(`${SALE_DATE}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - m);
    return d.toISOString().slice(0, 10);
};
const METHOD: Record<string, string> = {
    ltcgEquity: 'Long-term: 12.5% above ₹1.25 lakh (section 198)',
    stcgEquity: 'Short-term: 20% (section 196)',
    ltcgFlat: 'Long-term: 12.5% (section 197)',
    ltcgIndexed: 'Long-term: 20% with indexation (lower, section 197(3))',
    slab: 'Short-term: taxed at your slab rate',
};

export default function CapitalGainsCalc(p: Record<string, unknown>) {
    const [asset, setAsset] = useState<CgAssetType>((String(p.asset ?? 'equity') as CgAssetType));
    const [cost, setCost] = useState(Number(p.cost ?? 1000000));
    const [sale, setSale] = useState(Number(p.sale ?? 1500000));
    const [months, setMonths] = useState(Number(p.months ?? 30));
    const [slab, setSlab] = useState(Number(p.slab ?? 30));
    const r = computeCapitalGains({ asset, purchaseDate: boughtMonthsAgo(months), saleDate: SALE_DATE, cost, sale, expenses: 0, improvement: 0, slabRate: slab });
    const loss = r.gain <= 0;
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Sale in tax year 2026-27 · resident individual"
            inputs={<>
                <Toggle label="What you sold" value={asset} onChange={setAsset}
                    options={[{ id: 'equity', label: 'Shares / equity fund' }, { id: 'debtMF', label: 'Debt fund' }, { id: 'property', label: 'Property' }, { id: 'gold', label: 'Gold' }]} />
                <Field label="Bought for" money prefix="₹" value={cost} min={10000} max={50000000} step={10000} onChange={setCost} />
                <Field label="Sold for" money prefix="₹" value={sale} min={0} max={100000000} step={10000} onChange={setSale} />
                <Field label="Months held" value={months} min={1} max={240} step={1} suffix="months" onChange={(v) => setMonths(Math.max(1, Math.round(v)))} />
                {asset !== 'equity' && (
                    <Field label="Your slab rate (for short-term gains)" value={slab} min={0} max={30} step={5} suffix="%" onChange={setSlab} />
                )}
            </>}
            label={loss ? 'Capital loss: no tax' : 'Tax on the gain, with 4% cess'}
            figure={inr(r.totalTax)}
            words={loss ? `${inr(-r.gain)} loss` : METHOD[r.method]}
            rows={[
                { label: 'Gain', value: inr(r.gain) },
                ...(r.exemptionUsed > 0 ? [{ label: 'Tax-free part (₹1.25 lakh a year)', value: inr(r.exemptionUsed) }] : []),
                ...(r.indexedCost !== undefined ? [{ label: 'Indexed cost (CII)', value: inr(r.indexedCost) }] : []),
                { label: 'You keep after tax', value: inr(r.netProceeds), tone: 'money' as const },
                ...(r.insightWaitDays ? [{ label: `Wait ${r.insightWaitDays} days for long-term: saves`, value: inr(r.insightWaitSaving ?? 0), tone: 'warn' as const }] : []),
            ]}
            note="Sale dated 17 Nov 2026, no brokerage or improvement cost. Surcharge, the rebate and the unused basic exemption are not applied. Estimate only." />
    );
}
