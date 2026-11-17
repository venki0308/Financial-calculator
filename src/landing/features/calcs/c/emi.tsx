/**
 * /emi calculator island: EMI on any loan, reducing balance or flat rate — the app's
 * calculateReducingEMI, calculateFlatEMI and calculateEffectiveRate (src/utils/calculations.ts),
 * the same three the app's EMI screen uses.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { calculateEffectiveRate, calculateFlatEMI, calculateReducingEMI } from '../../../../utils/calculations';

const num = (v: unknown, d: number) => (typeof v === 'number' ? v : d);

export default function EmiCalc(p: Record<string, unknown>) {
    const [amount, setAmount] = useState(num(p.amount, 1000000));
    const [rate, setRate] = useState(num(p.rate, 9));
    const [years, setYears] = useState(num(p.years, 5));
    const [method, setMethod] = useState<'reducing' | 'flat'>('reducing');
    const months = Math.max(1, Math.round(years * 12));
    const r = method === 'reducing' ? calculateReducingEMI(amount, rate, months) : calculateFlatEMI(amount, rate, months);
    const eff = method === 'flat' ? calculateEffectiveRate(rate, months) : null;
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Any loan"
            inputs={<>
                <Field label="Loan amount" money prefix="₹" value={amount} min={10000} max={20000000} step={10000} onChange={setAmount} />
                <Field label="Interest rate (per year)" suffix="%" value={rate} min={1} max={30} step={0.05} onChange={(v) => setRate(Math.round(v * 100) / 100)} />
                <Field label="Tenure" suffix=" years" value={years} min={1} max={30} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
                <Toggle label="How interest is charged" value={method} onChange={setMethod}
                    options={[{ id: 'reducing', label: 'Reducing balance' }, { id: 'flat', label: 'Flat rate' }]} />
            </>}
            label="Monthly EMI"
            figure={inr(r.emi)}
            words={`for ${months} months`}
            rows={[
                { label: 'Total interest', value: inr(r.totalInterest) },
                { label: 'Total you repay', value: inr(r.totalPayment), tone: 'money' },
                ...(eff !== null ? [{ label: 'Same cost as a reducing rate of', value: `${eff.toLocaleString('en-IN')}%`, tone: 'warn' as const }] : []),
            ]}
            note="Same maths as the FinCalix app's EMI calculator (EMI rounded up to the rupee). Fees and GST are not included." />
    );
}
