/**
 * TCS on a foreign remittance under LRS: the app's computeLrsTcs (src/utils/calculations.ts),
 * rates in force from 1 April 2026 (section 394 of the Income-tax Act, 2025, as amended by the Finance Act, 2026).
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { computeLrsTcs } from '../../../../utils/calculations';
import type { LrsPurpose } from '../../../../utils/calculations';

export default function LrsTcsCalc(p: Record<string, unknown>) {
    const [purpose, setPurpose] = useState<LrsPurpose>((String(p.purpose ?? 'eduMedical') as LrsPurpose));
    const [amount, setAmount] = useState(Number(p.amount ?? 1500000));
    const [already, setAlready] = useState(Number(p.already ?? 0));
    const usesThreshold = purpose === 'eduMedical' || purpose === 'other';
    const r = computeLrsTcs(purpose, amount, usesThreshold ? already : 0);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Remittance from 1 April 2026 · tax year 2026-27"
            inputs={<>
                <Toggle label="Purpose" value={purpose} onChange={setPurpose}
                    options={[
                        { id: 'eduMedical', label: 'Education or medical, own money' },
                        { id: 'eduLoan', label: 'Education, from an education loan' },
                        { id: 'other', label: 'Investment, gift, family, other' },
                        { id: 'tour', label: 'Overseas tour package' },
                    ]} />
                <Field label="This remittance" money prefix="₹" value={amount} min={10000} max={20000000} step={10000} onChange={setAmount} />
                {usesThreshold && (
                    <Field label="Already sent abroad this tax year" money prefix="₹" value={already} min={0} max={20000000} step={10000}
                        hint="Earlier LRS remittances since 1 April count towards the ₹10 lakh." onChange={setAlready} />
                )}
            </>}
            label="TCS collected"
            figure={inr(r.tcs)}
            words={r.tcs === 0 ? 'No TCS on this remittance' : `${r.rate}% on ${inr(r.taxableAmount)}`}
            rows={[
                { label: 'Rate applied', value: `${r.rate}%` },
                { label: 'Part above the ₹10 lakh threshold', value: usesThreshold ? inr(r.taxableAmount) : 'No threshold' },
                { label: 'Total you pay the bank or seller', value: inr(r.totalOutflow) },
                ...(usesThreshold ? [{ label: 'Threshold left this year', value: inr(r.thresholdLeft), tone: 'money' as const }] : []),
            ]}
            note="TCS is tax paid on your behalf: it counts against your income tax for the year, and any excess is refunded after you file your return." />
    );
}
