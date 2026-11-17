/**
 * /gratuity calculator: wages × 15 × years ÷ 26 with the rules of src/pages/GratuityCalculator.tsx
 * (features/math-retire.gratuityCalc): part-year of 6 months or more counts as a year, wage base
 * at least half of total pay under the Code on Social Security, ₹20 lakh ceiling, fixed-term
 * employees after 1 year.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { gratuityCalc } from '../../math-retire';

type Kind = 'regular' | 'fixed';

export default function GratuityCalcIsland(p: Record<string, unknown>) {
    const [wage, setWage] = useState(Number(p.wage ?? 50000));
    const [years, setYears] = useState(Number(p.years ?? 10));
    const [months, setMonths] = useState(0);
    const [gross, setGross] = useState(0);
    const [kind, setKind] = useState<Kind>('regular');
    // Code on Social Security s.53(2): a part-year counts only when it is more than six months.
    const counted = years + (months > 6 ? 1 : 0);
    const raw = gratuityCalc(wage, counted, { grossMonthly: gross, isFTE: kind === 'fixed' });
    // s.53(1): five years of continuous service for regular staff (the site does not apply the app's 4-years-240-days reading).
    const g = years < (kind === 'regular' ? 5 : 1) ? { ...raw, isEligible: false, gratuity: 0 } : raw;
    const minYears = kind === 'fixed' ? 'one year' : 'five years';
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Private-sector employee, Code on Social Security"
            inputs={<>
                <Field label="Last basic pay + DA (per month)" money prefix="₹" value={wage} min={5000} max={500000} step={500} onChange={(v) => setWage(Math.max(1000, Math.round(v)))} />
                <Field label="Years of service" suffix=" years" value={years} min={0} max={45} step={1} onChange={(v) => setYears(Math.min(50, Math.max(0, Math.round(v))))} />
                <Field label="Extra months" suffix=" months" value={months} min={0} max={11} step={1} onChange={(v) => setMonths(Math.min(11, Math.max(0, Math.round(v))))} />
                <Field label="Total monthly pay (optional)" money prefix="₹" value={gross} min={0} max={1000000} step={1000} onChange={(v) => setGross(Math.max(0, Math.round(v)))}
                    hint="Fill this in if allowances are more than half your pay: the Code then counts at least 50% of it as wages." />
                <Toggle label="Employment" value={kind} onChange={setKind}
                    options={[{ id: 'regular', label: 'Regular' }, { id: 'fixed', label: 'Fixed-term' }]} />
            </>}
            label="Gratuity payable"
            figure={g.isEligible ? inr(g.gratuity) : 'Not yet due'}
            words={g.isEligible ? `for ${g.payoutYears} counted year${g.payoutYears === 1 ? '' : 's'} of service` : `needs ${minYears} of continuous service (except on death or disablement)`}
            rows={[
                { label: 'Wages used (monthly)', value: inr(g.wageBase) },
                { label: 'One year of gratuity (15 days)', value: inr((g.wageBase * 15) / 26) },
                ...(g.floorApplied ? [{ label: 'Raised to 50% of total pay', value: 'Yes' }] : []),
                ...(g.capped ? [{ label: 'Formula amount above the ₹20 lakh ceiling', value: inr(g.formulaGratuity), tone: 'warn' as const }] : []),
            ]}
            note="Same formula as the app. Extra months count as a full year only above six. Government staff under their own service rules, and employers with a better scheme, may pay differently." />
    );
}
