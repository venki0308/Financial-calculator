/**
 * /compound-interest calculator: the app's calculateCompoundInterest (src/utils/calculations.ts)
 * for the chosen compounding frequency, with simple interest (features/math-credit.simpleInterest,
 * from SimpleInterestCalculator.tsx) alongside.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { calculateCompoundInterest } from '../../../../utils/calculations';
import { simpleInterest } from '../../math-credit';

type Freq = '1' | '2' | '4' | '12';

export default function CompoundInterestCalc(p: Record<string, unknown>) {
    const [principal, setPrincipal] = useState(Number(p.principal ?? 100000));
    const [rate, setRate] = useState(Number(p.rate ?? 8));
    const [years, setYears] = useState(Number(p.years ?? 5));
    const [freq, setFreq] = useState<Freq>(String(p.freq ?? '4') as Freq);
    const n = Number(freq);
    const c = calculateCompoundInterest(principal, rate, years, n);
    const s = simpleInterest(principal, rate, years * 12);
    const eff = calculateCompoundInterest(100, rate, 1, n).interest;
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Interest on interest"
            inputs={<>
                <Field label="Principal" money prefix="₹" value={principal} min={1000} max={10000000} step={1000} onChange={setPrincipal} />
                <Field label="Interest rate (per year)" suffix="%" value={rate} min={1} max={20} step={0.05} onChange={(v) => setRate(Math.round(v * 100) / 100)} />
                <Field label="Time" suffix=" years" value={years} min={1} max={40} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
                <Toggle label="Interest added" value={freq} onChange={setFreq}
                    options={[{ id: '1', label: 'Yearly' }, { id: '2', label: 'Half-yearly' }, { id: '4', label: 'Quarterly' }, { id: '12', label: 'Monthly' }]} />
            </>}
            label="Amount at the end"
            figure={inr(c.amount)}
            words={`${inr(c.interest)} of compound interest`}
            rows={[
                { label: 'Simple interest instead', value: inr(s.totalInterest) },
                { label: 'Extra from compounding', value: inr(c.interest - s.totalInterest), tone: 'money' },
                { label: 'Effective yearly rate', value: `${Math.round(eff * 100) / 100}%` },
            ]}
            note="A = P × (1 + r/n)^(n×t), as in the app. Before tax; deposit and investment rates change." />
    );
}
