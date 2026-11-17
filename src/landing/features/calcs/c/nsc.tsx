/**
 * /nsc calculator: NSC VIII Issue maturity with the NSC screen's formula (src/pages/NSCCalculator.tsx
 * → math-deposits.nscProjection): yearly compounding for 5 years, interest paid at maturity.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { nscProjection } from '../../math-deposits';

export default function NscCalc(p: Record<string, unknown>) {
    const rate = Number(p.rate ?? 7.7);
    const [amount, setAmount] = useState(Number(p.amount ?? 100000));
    const r = nscProjection(amount, rate);
    const reinvested = r.table.slice(0, 4).reduce((s, y) => s + y.interest, 0);
    return (
        <Shell campaign={String(p.campaign)} eyebrow={`NSC bought in Oct–Dec 2026 earns ${rate}%`}
            inputs={<>
                <Field label="Amount invested" money prefix="₹" value={amount} min={1000} max={2000000} step={1000} onChange={(v) => setAmount(Math.max(1000, Math.round(v / 100) * 100))}
                    hint="Minimum ₹1,000, then multiples of ₹100. No upper limit." />
            </>}
            label="Maturity value after 5 years"
            figure={inr(r.maturity)}
            words={`${inr(r.interest)} of interest`}
            rows={[
                { label: 'Interest added in years 1–4', value: inr(reinvested) },
                { label: 'Interest for year 5', value: inr(r.table[4].interest), tone: 'money' },
            ]}
            note="Interest is added to the certificate at the end of each year and paid only at maturity. The rate is fixed for the certificate's 5 years." />
    );
}
