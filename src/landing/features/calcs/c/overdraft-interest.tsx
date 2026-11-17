/**
 * /overdraft-interest calculator: interest on the amount drawn for a number of days, with the
 * formula copied from src/pages/OverdraftCalculator.tsx (features/math-credit.odInterest).
 * Drawings are capped at the limit here (the screen's extra rate above the limit is penal
 * interest, which RBI does not allow).
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { odInterest } from '../../math-credit';

export default function OverdraftInterestCalc(p: Record<string, unknown>) {
    const [limit, setLimit] = useState(Number(p.limit ?? 1000000));
    const [drawn, setDrawn] = useState(Number(p.drawn ?? 500000));
    const [rate, setRate] = useState(Number(p.rate ?? 10.5));
    const [days, setDays] = useState(Number(p.days ?? 30));
    const used = Math.min(drawn, limit);
    const r = odInterest({ limit, utilized: used, rate, days });
    const full = odInterest({ limit, utilized: limit, rate, days });
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Interest on what you draw"
            inputs={<>
                <Field label="Sanctioned OD limit" money prefix="₹" value={limit} min={10000} max={50000000} step={10000} onChange={setLimit} />
                <Field label="Amount drawn" money prefix="₹" value={drawn} min={0} max={50000000} step={5000} onChange={setDrawn}
                    hint={drawn > limit ? 'Capped at the limit: drawing beyond it is a breach that can bring a penal charge.' : undefined} />
                <Field label="Interest rate (per year)" suffix="%" value={rate} min={5} max={24} step={0.05} onChange={(v) => setRate(Math.round(v * 100) / 100)} />
                <Field label="Days the amount stays drawn" suffix=" days" value={days} min={1} max={365} step={1} onChange={(v) => setDays(Math.max(1, Math.round(v)))} />
            </>}
            label={`Interest for ${days} day${days === 1 ? '' : 's'}`}
            figure={inr(r.totalInterest)}
            words={`about ${inr(r.dailyInterest)} a day`}
            rows={[
                { label: 'Undrawn limit (no interest)', value: inr(Math.max(0, limit - used)) },
                { label: 'If the full limit were drawn', value: inr(full.totalInterest) },
                { label: 'One month of interest at this balance', value: inr(r.monthlyInterestEMI) },
            ]}
            note="Balance × rate ÷ 365 × days, as in the app. Banks debit interest monthly; your statement is final." />
    );
}
