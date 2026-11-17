/**
 * /car-loan calculator island: on-road price → down payment → loan → EMI, with the total outlay
 * on the car (down payment + all EMIs). EMI from the app's calculateReducingEMI
 * (src/utils/calculations.ts); loan = price − down payment.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { calculateReducingEMI } from '../../../../utils/calculations';

const num = (v: unknown, d: number) => (typeof v === 'number' ? v : d);

export default function CarLoanCalc(p: Record<string, unknown>) {
    const [onRoad, setOnRoad] = useState(num(p.onRoad, 1200000));
    const [downPct, setDownPct] = useState(num(p.downPct, 20));
    const [rate, setRate] = useState(num(p.rate, 9));
    const [years, setYears] = useState(num(p.years, 5));
    const down = Math.round(onRoad * downPct / 100);
    const loan = Math.max(0, onRoad - down);
    const r = calculateReducingEMI(loan, rate, years * 12);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Car loan from the on-road price"
            inputs={<>
                <Field label="On-road price" money prefix="₹" value={onRoad} min={300000} max={5000000} step={10000} onChange={setOnRoad} />
                <Field label="Down payment" suffix="%" value={downPct} min={0} max={90} step={5} onChange={(v) => setDownPct(Math.min(100, Math.max(0, Math.round(v))))} hint={`${inr(down)} upfront`} />
                <Field label="Interest rate (per year)" suffix="%" value={rate} min={6} max={18} step={0.05} onChange={(v) => setRate(Math.round(v * 100) / 100)} />
                <Field label="Tenure" suffix=" years" value={years} min={1} max={7} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
            </>}
            label="Monthly EMI"
            figure={inr(r.emi)}
            words={`on a loan of ${inr(loan)}`}
            rows={[
                { label: 'Total interest', value: inr(r.totalInterest) },
                { label: 'Down payment + all EMIs', value: inr(down + r.totalPayment), tone: 'money' },
                { label: 'Above the on-road price', value: inr(down + r.totalPayment - onRoad), tone: 'warn' },
            ]}
            note="Same EMI maths as the FinCalix app. Processing fees, insurance renewals and running costs are not included." />
    );
}
