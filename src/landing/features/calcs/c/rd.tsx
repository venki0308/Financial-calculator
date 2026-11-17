/**
 * /rd calculator: recurring deposit maturity with the RD screen's formula
 * (src/pages/RDCalculator.tsx via math-deposits.rdProjection), which reproduces the NSRD Scheme
 * 2019 maturity table. Default: Post Office RD, 60 months at the Oct–Dec 2026 rate.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { rdProjection } from '../../math-deposits';

export default function RdCalc(p: Record<string, unknown>) {
    const [monthly, setMonthly] = useState(Number(p.monthly ?? 5000));
    const [rate, setRate] = useState(Number(p.rate ?? 6.7));
    const [years, setYears] = useState(Number(p.years ?? 5));
    const r = rdProjection(monthly, rate, years * 12);
    return (
        <Shell campaign={String(p.campaign)} eyebrow={`Post Office RD is ${Number(p.rate ?? 6.7)}% for Oct–Dec 2026`}
            inputs={<>
                <Field label="Monthly deposit" money prefix="₹" value={monthly} min={100} max={200000} step={100} onChange={(v) => setMonthly(Math.max(100, Math.round(v / 10) * 10))} />
                <Field label="Interest rate (per year)" suffix="%" value={rate} min={3} max={9.5} step={0.05} onChange={(v) => setRate(Math.round(v * 100) / 100)} />
                <Field label="Tenure" suffix=" years" value={years} min={1} max={10} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
            </>}
            label="Maturity amount"
            figure={inr(r.maturity)}
            words={`after ${years * 12} monthly deposits`}
            rows={[
                { label: 'You deposit', value: inr(r.invested) },
                { label: 'Interest earned', value: inr(r.interest), tone: 'money' },
                { label: 'Effective yearly yield', value: `${(Math.round(r.effectiveYield * 100) / 100).toLocaleString('en-IN')}%` },
            ]}
            note="Interest compounds every quarter; each deposit earns for the months it stays in the account. A Post Office RD runs 5 years and can be continued for up to 5 more." />
    );
}
