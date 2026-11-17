/**
 * /personal-loan calculator island: EMI (reducing or flat), processing fee with 18% GST, the
 * amount received and the APR on it. The app's calculateReducingEMI, calculateFlatEMI and
 * calculateEffectiveRate (src/utils/calculations.ts); APR = math-loans.aprOnNet (a search over
 * calculateReducingEMI, the RBI KFS method).
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { calculateEffectiveRate, calculateFlatEMI, calculateReducingEMI } from '../../../../utils/calculations';
import { aprOnNet } from '../../math-loans';

const num = (v: unknown, d: number) => (typeof v === 'number' ? v : d);
const pc = (v: number) => `${(Math.round(v * 100) / 100).toLocaleString('en-IN')}%`;

export default function PersonalLoanCalc(p: Record<string, unknown>) {
    const [amount, setAmount] = useState(num(p.amount, 500000));
    const [rate, setRate] = useState(num(p.rate, 12));
    const [years, setYears] = useState(num(p.years, 5));
    const [feePct, setFeePct] = useState(num(p.feePct, 2));
    const [method, setMethod] = useState<'reducing' | 'flat'>('reducing');
    const months = years * 12;
    const r = method === 'reducing' ? calculateReducingEMI(amount, rate, months) : calculateFlatEMI(amount, rate, months);
    const fee = Math.round(amount * feePct / 100);
    const gst = Math.round(fee * 0.18);
    const net = amount - fee - gst;
    const apr = aprOnNet(net, r.emi, months);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Personal loan with fees"
            inputs={<>
                <Field label="Loan amount" money prefix="₹" value={amount} min={25000} max={4000000} step={5000} onChange={setAmount} />
                <Field label="Interest rate (per year)" suffix="%" value={rate} min={8} max={30} step={0.05} onChange={(v) => setRate(Math.round(v * 100) / 100)} />
                <Field label="Tenure" suffix=" years" value={years} min={1} max={7} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
                <Field label="Processing fee" suffix="%" value={feePct} min={0} max={5} step={0.25} onChange={(v) => setFeePct(Math.max(0, Math.round(v * 100) / 100))} hint="18% GST is added to the fee; both are assumed to be deducted from the disbursal." />
                <Toggle label="Rate quoted as" value={method} onChange={setMethod}
                    options={[{ id: 'reducing', label: 'Reducing balance' }, { id: 'flat', label: 'Flat rate' }]} />
            </>}
            label="Monthly EMI"
            figure={inr(r.emi)}
            words={`${inr(r.totalInterest)} interest in all`}
            rows={[
                { label: 'Fee + 18% GST', value: inr(fee + gst) },
                { label: 'Money you receive', value: inr(net), tone: 'money' },
                { label: 'APR on the money received', value: pc(apr), tone: 'warn' },
                ...(method === 'flat' ? [{ label: 'Flat rate equals a reducing rate of', value: pc(calculateEffectiveRate(rate, months)) }] : []),
            ]}
            note="EMI maths as in the FinCalix app. APR worked out on the net amount disbursed, the method in the RBI Key Facts Statement; your lender’s KFS is final." />
    );
}
