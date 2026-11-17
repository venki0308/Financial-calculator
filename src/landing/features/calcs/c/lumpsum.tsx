/** /lumpsum calculator: one-time investment growth and its real value (src/pages/LumpsumCalculator.tsx via math-invest.lumpsumGrowth). */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { lumpsumGrowth } from '../../math-invest';

export default function LumpsumCalc(p: Record<string, unknown>) {
    const [amount, setAmount] = useState(Number(p.amount ?? 100000));
    const [rate, setRate] = useState(Number(p.rate ?? 12));
    const [years, setYears] = useState(Number(p.years ?? 10));
    const [inflation, setInflation] = useState(Number(p.inflation ?? 5));
    const g = lumpsumGrowth(amount, rate, years, inflation);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="One-time investment, compounded yearly"
            inputs={<>
                <Field label="Amount invested today" money prefix="₹" value={amount} min={5000} max={10000000} step={5000} onChange={setAmount} />
                <Field label="Expected return (per year)" suffix="%" value={rate} min={1} max={20} step={0.5} onChange={(v) => setRate(Math.round(v * 10) / 10)} />
                <Field label="Years invested" suffix=" years" value={years} min={1} max={40} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
                <Field label="Inflation (per year)" suffix="%" value={inflation} min={0} max={12} step={0.5} onChange={(v) => setInflation(Math.round(v * 10) / 10)} />
            </>}
            label="Maturity value"
            figure={inr(g.fv)}
            words={`${(Math.round(g.wealthRatio * 100) / 100).toLocaleString('en-IN')} times what you put in`}
            rows={[
                { label: 'Gain', value: inr(g.gain), tone: 'money' },
                { label: `Worth in today's prices (${inflation}% inflation)`, value: inr(g.realValue) },
                { label: 'Return after inflation', value: `${(Math.round(g.realRate * 10000) / 100).toLocaleString('en-IN')}% a year` },
            ]}
            note="Same formula as the app's lumpsum calculator. Returns are assumptions, not guaranteed." />
    );
}
