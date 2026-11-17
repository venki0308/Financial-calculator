/**
 * /fd calculator: bank FD maturity with the app's calculateFD (src/utils/calculations.ts, used by
 * FDCalculator.tsx) and the first year's interest against the TDS threshold of s.393(1) Table
 * Sl. 5(ii), Income-tax Act 2025 (₹50,000; ₹1,00,000 at 60+), at the 10% rate in force.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { calculateFD } from '../../../../utils/calculations';

type Comp = '4' | '12' | '1';
type Age = 'under60' | 'senior';

export default function FdCalc(p: Record<string, unknown>) {
    const [amount, setAmount] = useState(Number(p.amount ?? 500000));
    const [rate, setRate] = useState(Number(p.rate ?? 6.5));
    const [years, setYears] = useState(Number(p.years ?? 5));
    const [comp, setComp] = useState<Comp>(String(p.comp ?? '4') as Comp);
    const [age, setAge] = useState<Age>('under60');
    const n = Number(comp);
    const r = calculateFD(amount, rate, years, n);
    const firstYear = calculateFD(amount, rate, Math.min(1, years), n).interest;
    const threshold = age === 'senior' ? 100000 : 50000;
    const tds = firstYear > threshold ? firstYear * 0.1 : 0;
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Bank fixed deposit, interest reinvested"
            inputs={<>
                <Field label="Deposit" money prefix="₹" value={amount} min={10000} max={10000000} step={10000} onChange={(v) => setAmount(Math.max(1000, Math.round(v)))} />
                <Field label="Your bank's rate (per year)" suffix="%" value={rate} min={3} max={9.5} step={0.05} onChange={(v) => setRate(Math.round(v * 100) / 100)} />
                <Field label="Tenure" suffix=" years" value={years} min={1} max={10} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
                <Toggle label="Interest compounded" value={comp} onChange={setComp}
                    options={[{ id: '4', label: 'Quarterly' }, { id: '12', label: 'Monthly' }, { id: '1', label: 'Yearly' }]} />
                <Toggle label="Depositor's age" value={age} onChange={setAge}
                    options={[{ id: 'under60', label: 'Below 60' }, { id: 'senior', label: '60 or more' }]} />
            </>}
            label="Maturity amount"
            figure={inr(r.amount)}
            words={`after ${years} year${years === 1 ? '' : 's'} at ${rate}%`}
            rows={[
                { label: 'Interest earned', value: inr(r.interest), tone: 'money' },
                { label: 'Interest in the first year', value: inr(firstYear) },
                tds > 0
                    ? { label: `TDS at 10% (above ${inr(threshold)})`, value: inr(tds), tone: 'warn' }
                    : { label: `TDS in year one (limit ${inr(threshold)})`, value: 'None' },
            ]}
            note="TDS counts all your interest from the same bank in a tax year, so other deposits there can cross the limit. TDS is not a final tax." />
    );
}
