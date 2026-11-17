/**
 * /two-wheeler-loan calculator island: on-road price → down payment → loan → EMI, with the
 * on-road/down-payment formula of src/pages/TwoWheelerLoanCalculator.tsx (math-loans.twoWheelerOnRoad)
 * and the app's calculateReducingEMI (src/utils/calculations.ts).
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { calculateReducingEMI } from '../../../../utils/calculations';
import { twoWheelerOnRoad } from '../../math-loans';

const num = (v: unknown, d: number) => (typeof v === 'number' ? v : d);

export default function TwoWheelerLoanCalc(p: Record<string, unknown>) {
    const [exShowroom, setExShowroom] = useState(num(p.exShowroom, 110000));
    const [rto, setRto] = useState(num(p.rto, 9500));
    const [insurance, setInsurance] = useState(num(p.insurance, 7500));
    const [other, setOther] = useState(num(p.other, 1500));
    const [downPct, setDownPct] = useState(num(p.downPct, 15));
    const [rate, setRate] = useState(num(p.rate, 11.5));
    const [months, setMonths] = useState(num(p.months, 36));
    const o = twoWheelerOnRoad({ exShowroom, rto, insurance, handling: other, accessories: 0, downPaymentPct: downPct });
    const r = calculateReducingEMI(o.loanAmount, rate, months);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Bike or scooter loan"
            inputs={<>
                <Field label="Ex-showroom price" money prefix="₹" value={exShowroom} min={30000} max={500000} step={1000} onChange={setExShowroom} />
                <Field label="RTO (registration + road tax)" money prefix="₹" value={rto} min={0} max={60000} step={500} onChange={setRto} />
                <Field label="Insurance" money prefix="₹" value={insurance} min={0} max={30000} step={500} onChange={setInsurance} />
                <Field label="Handling and accessories" money prefix="₹" value={other} min={0} max={30000} step={500} onChange={setOther} />
                <Field label="Down payment" suffix="%" value={downPct} min={0} max={50} step={5} onChange={(v) => setDownPct(Math.min(100, Math.max(0, Math.round(v))))} hint={`${inr(o.downPayment)} of the ${inr(o.onRoadPrice)} on-road price`} />
                <Field label="Interest rate (per year)" suffix="%" value={rate} min={6} max={24} step={0.25} onChange={(v) => setRate(Math.round(v * 100) / 100)} />
                <Field label="Tenure" suffix=" months" value={months} min={6} max={60} step={6} onChange={(v) => setMonths(Math.max(1, Math.round(v)))} />
            </>}
            label="Monthly EMI"
            figure={inr(r.emi)}
            words={`on a loan of ${inr(o.loanAmount)}`}
            rows={[
                { label: 'On-road price', value: inr(o.onRoadPrice) },
                { label: 'Total interest', value: inr(r.totalInterest) },
                { label: 'Down payment + all EMIs', value: inr(o.downPayment + r.totalPayment), tone: 'money' },
            ]}
            note="Same on-road and EMI maths as the FinCalix app's two-wheeler calculator. Processing fee not included." />
    );
}
