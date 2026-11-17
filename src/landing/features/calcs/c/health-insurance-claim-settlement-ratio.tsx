/**
 * /health-insurance-claim-settlement-ratio: "how the ratio works" calculator. Starts from IRDAI Annual Report
 * 2024-25, Table I.29 (health insurance claims of all general and health insurers, printed p. 43), by number
 * (lakh claims) or by amount (₹ crore); every field can be changed. No app function exists for this.
 * Share = item ÷ (claims outstanding at the start + new claims registered), IRDAI's "percentage to total".
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle } from '../Shell';

export interface ClaimStatus { osStart: number; registered: number; paid: number; disallowed: number; repudiated: number; osEnd: number }

/** IRDAI Annual Report 2024-25, Table I.29, number of claims in lakh. */
export const HEALTH_INDUSTRY_2024_25: ClaimStatus = { osStart: 20.73, registered: 351.85, paid: 326.01, disallowed: 0, repudiated: 29.51, osEnd: 17.07 };
/** Same table, amounts in ₹ crore. */
export const HEALTH_INDUSTRY_AMT_2024_25: ClaimStatus = { osStart: 7584.58, registered: 124903.22, paid: 94247.60, disallowed: 18521.02, repudiated: 11412.42, osEnd: 8306.76 };

/** Each outcome as a share of all claims to be dealt with (outstanding at the start + new). */
export function claimShares(c: ClaimStatus) {
    const total = c.osStart + c.registered;
    const s = (v: number) => (total > 0 ? (v / total) * 100 : 0);
    return { total, paidPct: s(c.paid), disallowedPct: s(c.disallowed), repudiatedPct: s(c.repudiated), pendingPct: s(c.osEnd) };
}

const p2 = (v: number) => `${(Math.round(v * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
type Basis = 'number' | 'amount';

export default function ClaimRatioCalc(p: Record<string, unknown>) {
    const [basis, setBasis] = useState<Basis>(p.basis === 'amount' ? 'amount' : 'number');
    const [c, setC] = useState<ClaimStatus>(basis === 'amount' ? HEALTH_INDUSTRY_AMT_2024_25 : HEALTH_INDUSTRY_2024_25);
    const unit = basis === 'number' ? 'lakh claims' : '₹ crore';
    const max = basis === 'number' ? 1000 : 300000;
    const step = basis === 'number' ? 0.01 : 1;
    const set = (k: keyof ClaimStatus) => (v: number) => setC((o) => ({ ...o, [k]: Math.max(0, v) }));
    const s = claimShares(c);
    const pick = (b: Basis) => { setBasis(b); setC(b === 'amount' ? HEALTH_INDUSTRY_AMT_2024_25 : HEALTH_INDUSTRY_2024_25); };
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Starts from IRDAI Annual Report 2024-25, Table I.29"
            inputs={<>
                <Toggle label="Count claims by" value={basis} onChange={pick} options={[{ id: 'number', label: 'Number' }, { id: 'amount', label: 'Amount (₹)' }]} />
                <Field label={`Pending at the start (${unit})`} value={c.osStart} min={0} max={max} step={step} onChange={set('osStart')} />
                <Field label={`New claims in the year (${unit})`} value={c.registered} min={0} max={max} step={step} onChange={set('registered')} />
                <Field label={`Paid (${unit})`} value={c.paid} min={0} max={max} step={step} onChange={set('paid')} />
                <Field label={`Disallowed under policy terms (${unit})`} value={c.disallowed} min={0} max={max} step={step} onChange={set('disallowed')} />
                <Field label={`Repudiated (${unit})`} value={c.repudiated} min={0} max={max} step={step} onChange={set('repudiated')} />
                <Field label={`Still pending at year end (${unit})`} value={c.osEnd} min={0} max={max} step={step} onChange={set('osEnd')} />
            </>}
            label={basis === 'number' ? 'Share of claims paid' : 'Share of the amount paid'}
            figure={p2(s.paidPct)}
            words={`of ${s.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${unit} to be dealt with`}
            rows={[
                { label: 'Disallowed under policy terms', value: p2(s.disallowedPct) },
                { label: 'Repudiated', value: p2(s.repudiatedPct), tone: 'warn' },
                { label: 'Still pending at year end', value: p2(s.pendingPct) },
            ]}
            note="Change any figure to see how the ratio moves, or enter the numbers from an insurer's own public disclosure." />
    );
}
