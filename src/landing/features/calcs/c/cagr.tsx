/** /cagr calculator: compound annual growth rate (src/pages/CAGRCalculator.tsx via math-invest.cagrResult). */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { cagrResult } from '../../math-invest';

const pc = (v: number) => `${(Math.round(v * 100) / 100).toLocaleString('en-IN')}%`;

export default function CagrCalc(p: Record<string, unknown>) {
    const [start, setStart] = useState(Number(p.start ?? 250000));
    const [end, setEnd] = useState(Number(p.end ?? 410000));
    const [years, setYears] = useState(Number(p.years ?? 4));
    const c = cagrResult(start, end, years);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Start value, end value, years held"
            inputs={<>
                <Field label="Value at the start" money prefix="₹" value={start} min={1000} max={10000000} step={1000} onChange={setStart} />
                <Field label="Value at the end" money prefix="₹" value={end} min={0} max={50000000} step={1000} onChange={setEnd} />
                <Field label="Years held" suffix=" years" value={years} min={0.5} max={40} step={0.5} onChange={(v) => setYears(Math.max(0.1, Math.round(v * 10) / 10))} />
            </>}
            label="CAGR"
            figure={pc(c.cagr)}
            words="a year, compounded"
            rows={[
                { label: 'Absolute return', value: pc(c.absReturn) },
                { label: 'Gain (or loss)', value: inr(end - start), tone: end >= start ? 'money' : 'warn' },
                { label: 'Doubles in about (rule of 72)', value: c.doubleTime > 0 ? `${(Math.round(c.doubleTime * 10) / 10).toLocaleString('en-IN')} years` : 'Not at this rate' },
            ]}
            note="Same formula as the app's CAGR calculator. CAGR fits one investment with no deposits or withdrawals in between." />
    );
}
