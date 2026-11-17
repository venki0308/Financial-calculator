/**
 * Add GST to a price or take it out of a GST-inclusive total: the app's GST screen formula
 * (math-tax.gstStandard, copied from src/pages/GSTCalculator.tsx).
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle } from '../Shell';
import { gstStandard } from '../../math-tax';

/** Rupees, with paise only when the amount is not a whole rupee (GST on small bills often is not). */
const rs = (n: number) => {
    const v = Math.round(n * 100) / 100;
    return '₹' + v.toLocaleString('en-IN', Number.isInteger(v) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function GstCalc(p: Record<string, unknown>) {
    const [dir, setDir] = useState<'add' | 'remove'>(p.direction === 'remove' ? 'remove' : 'add');
    const [amount, setAmount] = useState(Number(p.amount ?? 10000));
    const [rate, setRate] = useState<'5' | '18' | '40' | '3'>((String(p.rate ?? '18') as '5' | '18' | '40' | '3'));
    const r = gstStandard(amount, Number(rate), dir);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="GST rates in force since 22 September 2025"
            inputs={<>
                <Toggle label="I have" value={dir} onChange={setDir}
                    options={[{ id: 'add', label: 'Price before GST (add GST)' }, { id: 'remove', label: 'Total with GST (remove GST)' }]} />
                <Field label={dir === 'add' ? 'Price before GST' : 'Total including GST'} money prefix="₹" value={amount} min={1} max={10000000} step={100} onChange={setAmount} />
                <Toggle label="GST rate" value={rate} onChange={setRate}
                    options={[{ id: '5', label: '5%' }, { id: '18', label: '18%' }, { id: '40', label: '40%' }, { id: '3', label: '3% (gold, silver)' }]} />
            </>}
            label={dir === 'add' ? 'Total with GST' : 'Price before GST'}
            figure={r ? rs(dir === 'add' ? r.total : r.base) : '₹0'}
            words={r ? `GST of ${rs(r.gst)} at ${rate}%` : undefined}
            rows={r ? [
                { label: 'Price before GST', value: rs(r.base) },
                { label: `GST at ${rate}%`, value: rs(r.gst), tone: 'warn' },
                { label: 'Total with GST', value: rs(r.total), tone: 'money' },
                { label: 'GST as a share of the total', value: `${(Math.round((r.gst / r.total) * 10000) / 100).toLocaleString('en-IN')}%` },
            ] : []}
            note="The rate depends on how the item or service is classified in the GST rate notifications; check the invoice." />
    );
}
