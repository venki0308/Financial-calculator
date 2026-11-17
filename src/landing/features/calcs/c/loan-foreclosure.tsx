/**
 * /loan-foreclosure calculator: principal owed after N EMIs, interest avoided, charge and net
 * saving — the app's calculateReducingEMI + calculateForeclosure (src/utils/calculations.ts).
 * The charge is whatever the user's agreement says (0 for floating-rate loans from banks).
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { calculateForeclosure, calculateReducingEMI } from '../../../../utils/calculations';
import { yearsMonths } from '../../derive';

export default function LoanForeclosureCalc(p: Record<string, unknown>) {
    const [amount, setAmount] = useState(Number(p.amount ?? 500000));
    const [rate, setRate] = useState(Number(p.rate ?? 11));
    const [years, setYears] = useState(Number(p.years ?? 5));
    const [paid, setPaid] = useState(Number(p.paid ?? 24));
    const [charge, setCharge] = useState(Number(p.charge ?? 0));
    const months = Math.max(2, Math.round(years * 12));
    const n = Math.min(months - 1, Math.max(1, Math.round(paid)));
    const e = calculateReducingEMI(amount, rate, months);
    const f = calculateForeclosure(e.schedule, n, charge);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Close the loan right after an EMI"
            inputs={<>
                <Field label="Loan amount" money prefix="₹" value={amount} min={50000} max={20000000} step={10000} onChange={setAmount} />
                <Field label="Interest rate (per year)" suffix="%" value={rate} min={6} max={24} step={0.05} onChange={(v) => setRate(Math.round(v * 100) / 100)} />
                <Field label="Original tenure" suffix=" years" value={years} min={1} max={30} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
                <Field label="EMIs already paid" value={n} min={1} max={months - 1} step={1} onChange={(v) => setPaid(Math.round(v))} />
                <Field label="Foreclosure charge in your agreement" suffix="%" value={charge} min={0} max={5} step={0.25} onChange={(v) => setCharge(Math.round(v * 100) / 100)}
                    hint="Nil for a floating-rate loan from a bank to an individual. Otherwise use the figure in your sanction letter or Key Facts Statement." />
            </>}
            label="Pay to close"
            figure={f ? inr(f.totalSettlement) : '—'}
            words={f ? `after ${yearsMonths(n)} of EMIs of ${inr(e.emi)}` : 'check the inputs'}
            rows={[
                { label: 'Principal still owed', value: f ? inr(f.outstandingPrincipal) : '—' },
                { label: 'Foreclosure charge', value: f ? (f.foreclosureCharge ? inr(f.foreclosureCharge) : 'Nil') : '—' },
                { label: 'Future interest avoided', value: f ? inr(f.interestSaved) : '—', tone: 'money' },
                { label: 'Net saving after the charge', value: f ? inr(f.netBenefit) : '—', tone: f && f.netBenefit < 0 ? 'warn' : 'money' },
            ]}
            note="Closing between EMI dates adds interest for the extra days. Your lender's foreclosure statement is final." />
    );
}
