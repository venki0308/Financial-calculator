/**
 * /home-loan calculator island: EMI, total interest and the first year's interest/principal
 * split, with the part of that interest deductible for a self-occupied house in the old regime
 * (₹2 lakh cap, Income-tax Act, 2025 s. 22). The app's calculateReducingEMI and
 * calculateTaxBenefits (src/utils/calculations.ts).
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { calculateReducingEMI, calculateTaxBenefits } from '../../../../utils/calculations';

const num = (v: unknown, d: number) => (typeof v === 'number' ? v : d);

export default function HomeLoanCalc(p: Record<string, unknown>) {
    const [amount, setAmount] = useState(num(p.amount, 5000000));
    const [rate, setRate] = useState(num(p.rate, 8.5));
    const [years, setYears] = useState(num(p.years, 25));
    const [regime, setRegime] = useState<'old' | 'new'>('old');
    const r = calculateReducingEMI(amount, rate, years * 12);
    const y1 = calculateTaxBenefits(r.schedule).schedule[0];
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Home loan, reducing balance"
            inputs={<>
                <Field label="Loan amount" money prefix="₹" value={amount} min={500000} max={30000000} step={100000} onChange={setAmount} />
                <Field label="Interest rate (per year)" suffix="%" value={rate} min={6} max={14} step={0.05} onChange={(v) => setRate(Math.round(v * 100) / 100)} />
                <Field label="Tenure" suffix=" years" value={years} min={5} max={30} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
                <Toggle label="Your tax regime (house you live in)" value={regime} onChange={setRegime}
                    options={[{ id: 'old', label: 'Old regime' }, { id: 'new', label: 'New regime' }]} />
            </>}
            label="Monthly EMI"
            figure={inr(r.emi)}
            words={`${inr(r.totalInterest)} interest over ${years} years`}
            rows={[
                { label: 'Interest in year 1', value: y1 ? inr(y1.interest) : '₹0' },
                { label: 'Principal repaid in year 1', value: y1 ? inr(y1.principal) : '₹0' },
                { label: 'Year-1 interest you can deduct', value: regime === 'old' && y1 ? inr(y1.deduction24) : '₹0', tone: 'money' },
                { label: 'Total you repay', value: inr(r.totalPayment) },
            ]}
            note="Deduction shown for a self-occupied house: up to ₹2 lakh of interest a year in the old regime (s. 22), none in the new regime. Year 1 = the first 12 EMIs." />
    );
}
