/**
 * /scss calculator: quarterly interest from the SCSS screen's formula (src/pages/SCSSCalculator.tsx →
 * math-deposits.scssIncome): deposit × rate ÷ 4, paid every quarter, not compounded. TDS check:
 * s.393(1) Table Sl. 5(ii), Income-tax Act 2025 (₹1,00,000 for a senior citizen) at the 10% rate in force.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { SCSS_MAX, scssIncome } from '../../math-deposits';

type Term = '5' | '8';

export default function ScssCalc(p: Record<string, unknown>) {
    const rate = Number(p.rate ?? 8.2);
    const [amount, setAmount] = useState(Number(p.amount ?? 1500000));
    const [term, setTerm] = useState<Term>('5');
    const years = Number(term);
    const r = scssIncome(amount, rate, years);
    const tds = r.annualInterest > 100000 ? r.annualInterest * 0.1 : 0;
    return (
        <Shell campaign={String(p.campaign)} eyebrow={`SCSS at ${rate}% (Oct–Dec 2026)`}
            inputs={<>
                <Field label="Deposit" money prefix="₹" value={amount} min={1000} max={SCSS_MAX} step={10000} onChange={(v) => setAmount(Math.min(SCSS_MAX, Math.max(1000, Math.round(v / 1000) * 1000)))}
                    hint="₹1,000 and multiples of ₹1,000, up to ₹30 lakh in all your SCSS accounts." />
                <Toggle label="Term" value={term} onChange={setTerm}
                    options={[{ id: '5', label: '5 years' }, { id: '8', label: '5 + 3-year extension' }]} />
            </>}
            label="Interest every quarter"
            figure={inr(r.quarterlyIncome)}
            words={`${inr(r.annualInterest)} a year`}
            rows={[
                { label: `Interest over ${years} years`, value: inr(r.totalInterest), tone: 'money' },
                tds > 0
                    ? { label: 'TDS a year at 10% (interest above ₹1 lakh)', value: inr(tds), tone: 'warn' }
                    : { label: 'TDS (interest up to ₹1 lakh a year)', value: 'None' },
                { label: 'Deposit returned at the end', value: inr(amount) },
            ]}
            note="The first payment covers the days from your deposit to the quarter end. The extension assumes today's rate; an extended account earns the rate in force on its maturity date." />
    );
}
