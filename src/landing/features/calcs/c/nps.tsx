/**
 * /nps calculator: corpus, lump sum and annuity pension with the formula of
 * src/pages/NPSCalculator.tsx (features/math-retire.npsProjection). The exit slab shown is the
 * PFRDA normal-exit rule for All Citizen / Corporate subscribers (16 Dec 2025 amendment).
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { npsExitSlab, npsProjection } from '../../math-retire';

const SLAB_NOTE = {
    all: 'Corpus of ₹8 lakh or less: you may take all of it as a lump sum or in instalments.',
    mid: 'Corpus between ₹8 lakh and ₹12 lakh: up to ₹6 lakh as a lump sum and the rest as an annuity or instalments over at least 6 years, or the 80:20 route.',
    big: 'Corpus above ₹12 lakh: up to 80% as a lump sum or instalments, at least 20% in an annuity.',
} as const;

export default function NpsCalc(p: Record<string, unknown>) {
    const [monthly, setMonthly] = useState(Number(p.monthly ?? 5000));
    const [age, setAge] = useState(Number(p.age ?? 30));
    const [retire, setRetire] = useState(Number(p.retire ?? 60));
    const [rate, setRate] = useState(Number(p.rate ?? 10));
    const [annuityPct, setAnnuityPct] = useState(Number(p.annuityPct ?? 20));
    const [annuityRate, setAnnuityRate] = useState(Number(p.annuityRate ?? 6));
    const r = npsProjection(monthly, rate, age, retire, annuityPct, annuityRate);
    const slab = npsExitSlab(r.corpus);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="NPS Tier I, All Citizen or Corporate"
            inputs={<>
                <Field label="Your contribution (per month)" money prefix="₹" value={monthly} min={500} max={200000} step={500} onChange={(v) => setMonthly(Math.max(100, Math.round(v)))} />
                <Field label="Your age now" suffix=" years" value={age} min={18} max={59} step={1} onChange={(v) => setAge(Math.min(59, Math.max(18, Math.round(v))))} />
                <Field label="Exit age" suffix=" years" value={retire} min={40} max={70} step={1} onChange={(v) => setRetire(Math.min(70, Math.max(age + 1, Math.round(v))))} />
                <Field label="Assumed return (per year)" suffix="%" value={rate} min={4} max={14} step={0.5} onChange={(v) => setRate(Math.round(v * 10) / 10)} hint="Not guaranteed: NPS is market-linked." />
                <Field label="Share used to buy an annuity" suffix="%" value={annuityPct} min={20} max={100} step={5} onChange={(v) => setAnnuityPct(Math.min(100, Math.max(20, Math.round(v))))} hint="At least 20% for a corpus above ₹12 lakh." />
                <Field label="Assumed annuity rate" suffix="%" value={annuityRate} min={4} max={9} step={0.25} onChange={(v) => setAnnuityRate(Math.round(v * 100) / 100)} />
            </>}
            label={`Corpus at ${retire}`}
            figure={inr(r.corpus)}
            words={`from ${inr(r.invested)} paid in over ${r.years} years`}
            rows={[
                { label: `Lump sum (${100 - annuityPct}%)`, value: inr(r.lumpsum), tone: 'money' },
                { label: `Annuity purchase (${annuityPct}%)`, value: inr(r.annuity) },
                { label: 'Pension from the annuity (per month)', value: inr(r.monthlyPension), tone: 'money' },
            ]}
            note={`${SLAB_NOTE[slab]} Same maths as the app; returns and annuity rates are assumptions.`} />
    );
}
