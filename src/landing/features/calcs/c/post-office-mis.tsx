/**
 * /post-office-mis calculator: monthly income from the Post Office MIS screen's formula
 * (src/pages/POMISCalculator.tsx → math-deposits.misIncome): deposit × rate ÷ 12 every month,
 * capped at ₹9 lakh single / ₹15 lakh joint (2023 amendments); early-closure deductions (para 6).
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { MIS_LIMIT, misIncome } from '../../math-deposits';

type Kind = 'single' | 'joint';

export default function MisCalc(p: Record<string, unknown>) {
    const rate = Number(p.rate ?? 7.4);
    const [amount, setAmount] = useState(Number(p.amount ?? 900000));
    const [kind, setKind] = useState<Kind>(String(p.kind ?? 'single') as Kind);
    const r = misIncome(amount, rate, kind === 'joint');
    const capped = r.clampedInvestment < amount;
    return (
        <Shell campaign={String(p.campaign)} eyebrow={`Post Office MIS at ${rate}% (Oct–Dec 2026)`}
            inputs={<>
                <Field label="Deposit" money prefix="₹" value={amount} min={1000} max={MIS_LIMIT.joint} step={1000} onChange={(v) => setAmount(Math.max(1000, Math.round(v / 1000) * 1000))}
                    hint="₹1,000 and multiples of ₹1,000. Limit ₹9 lakh single, ₹15 lakh joint." />
                <Toggle label="Account" value={kind} onChange={setKind}
                    options={[{ id: 'single', label: 'Single' }, { id: 'joint', label: 'Joint (2 or 3 adults)' }]} />
            </>}
            label="Interest every month"
            figure={inr(r.monthlyIncome)}
            words={capped ? `on ${inr(r.clampedInvestment)}, the ${kind} limit` : `for 60 months on ${inr(r.clampedInvestment)}`}
            rows={[
                { label: 'Interest in a year', value: inr(r.yearlyInterest) },
                { label: 'Interest over 5 years', value: inr(r.totalInterest), tone: 'money' },
                { label: 'Cut if closed in years 2–3 (2%)', value: inr(r.deductionTo3Years), tone: 'warn' },
                { label: 'Cut if closed after 3 years (1%)', value: inr(r.deductionAfter3Years) },
            ]}
            note="The deposit is returned in full after 5 years. Monthly interest you leave unclaimed earns nothing extra." />
    );
}
