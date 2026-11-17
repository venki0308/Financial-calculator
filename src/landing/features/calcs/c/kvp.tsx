/**
 * /kvp calculator: Kisan Vikas Patra doubles the deposit on maturity (KVP Scheme 2019, para 5).
 * Maturity period: NSI's published months for the current rate (the app's SMALL_SAVINGS.kvpMaturityMonths,
 * which the KVP screen's formula in math-deposits.kvpProjection also gives at 7.5%).
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { kvpProjection } from '../../math-deposits';

export default function KvpCalc(p: Record<string, unknown>) {
    const rate = Number(p.rate ?? 7.5);
    const months = Number(p.months ?? 115);
    const [amount, setAmount] = useState(Number(p.amount ?? 100000));
    const r = kvpProjection(amount, rate);
    const y = Math.floor(months / 12);
    const m = months % 12;
    return (
        <Shell campaign={String(p.campaign)} eyebrow={`KVP bought in Oct–Dec 2026: ${rate}% a year`}
            inputs={<>
                <Field label="Amount invested" money prefix="₹" value={amount} min={1000} max={2000000} step={1000} onChange={(v) => setAmount(Math.max(1000, Math.round(v / 100) * 100))}
                    hint="Minimum ₹1,000, then multiples of ₹100. No upper limit." />
            </>}
            label={`Paid on maturity (${months} months)`}
            figure={inr(r.maturity)}
            words={`${y} years ${m} months after you invest`}
            rows={[
                { label: 'You invest', value: inr(amount) },
                { label: 'Interest earned', value: inr(r.interest), tone: 'money' },
            ]}
            note="The maturity period is fixed by the rate on the day you buy. Encashment is allowed after 2½ years at the scheme's table values, which are lower than the full maturity." />
    );
}
