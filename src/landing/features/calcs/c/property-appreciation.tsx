/**
 * /property-appreciation calculator: future value at an assumed yearly rate (src/pages/PropertyCalculator.tsx,
 * calculateAppreciation) and that value in today's money (src/pages/FDCalculator.tsx inflation adjustment),
 * both via math-planning.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { appreciatedValue, todaysMoney } from '../../math-planning';

export default function PropertyAppreciationCalc(p: Record<string, unknown>) {
    const [value, setValue] = useState(Number(p.value ?? 6000000));
    const [rate, setRate] = useState(Number(p.rate ?? 6));
    const [years, setYears] = useState(Number(p.years ?? 10));
    const [inflation, setInflation] = useState(Number(p.inflation ?? 5));
    const fv = appreciatedValue(value, rate, years);
    const real = todaysMoney(fv, inflation, years);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Assumed growth, compounded yearly"
            inputs={<>
                <Field label="Property value today" money prefix="₹" value={value} min={500000} max={50000000} step={100000} onChange={setValue} />
                <Field label="Appreciation (per year)" suffix="%" value={rate} min={0} max={15} step={0.5} onChange={(v) => setRate(Math.round(v * 10) / 10)} />
                <Field label="Years from now" suffix=" years" value={years} min={1} max={30} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
                <Field label="Inflation (per year)" suffix="%" value={inflation} min={0} max={10} step={0.5} onChange={(v) => setInflation(Math.round(v * 10) / 10)} />
            </>}
            label={`Value in ${years} year${years === 1 ? '' : 's'}`}
            figure={inr(fv)}
            words={`up ${inr(fv - value)} in rupees`}
            rows={[
                { label: `In today's money (${inflation}% inflation)`, value: inr(real), tone: 'money' },
                { label: 'Real gain after inflation', value: inr(real - value), tone: real >= value ? undefined : 'warn' },
                { label: 'Rate assumed', value: `${rate}% a year` },
            ]}
            note="Same growth formula as the app's property calculator. The rate is your assumption; real prices move unevenly and differ by city and locality." />
    );
}
