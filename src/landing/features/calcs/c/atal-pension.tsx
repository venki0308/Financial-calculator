/**
 * /atal-pension calculator: the official APY contribution chart (src/components/
 * APYContributionCalculator.tsx TABLE, copied in features/math-retire.APY_CHART) by entry age and
 * pension slab, with months and total paid till 60 and the nominee's corpus from Annex-1.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { APY_PENSIONS, apyPlan } from '../../math-retire';

type Slab = '0' | '1' | '2' | '3' | '4';

export default function ApyCalc(p: Record<string, unknown>) {
    const [age, setAge] = useState(Number(p.age ?? 30));
    const [slab, setSlab] = useState<Slab>(String(p.slab ?? '4') as Slab);
    const plan = apyPlan(age, Number(slab));
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Atal Pension Yojana, monthly auto-debit"
            inputs={<>
                <Field label="Age when you join" suffix=" years" value={age} min={18} max={40} step={1} onChange={(v) => setAge(Math.min(40, Math.max(18, Math.round(v))))} />
                <Toggle label="Pension you want from 60 (per month)" value={slab} onChange={setSlab}
                    options={APY_PENSIONS.map((amount, i) => ({ id: String(i) as Slab, label: `₹${amount / 1000}k` }))} />
            </>}
            label="You pay every month"
            figure={inr(plan.monthly)}
            words={`for ${plan.years} years, from ${plan.age} to 60`}
            rows={[
                { label: 'Pension from 60 (guaranteed minimum)', value: `${inr(plan.pension)}/month`, tone: 'money' },
                { label: `Total paid in ${plan.months} months`, value: inr(plan.totalPaid) },
                { label: 'Returned to the nominee after you and your spouse', value: inr(plan.nomineeCorpus) },
            ]}
            note="Contributions from the official APY chart. Income-tax payers cannot join (since 1 October 2022)." />
    );
}
