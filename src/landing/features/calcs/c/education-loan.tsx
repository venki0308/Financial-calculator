/**
 * /education-loan calculator island: interest during the moratorium (simple interest, paid as it
 * falls due or added to the loan, optionally reduced by a government subvention), then the EMI with
 * the app's calculateReducingEMI — math-loans.educationLoan. The app itself has no moratorium input.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { educationLoan, type MoratoriumMode } from '../../math-loans';

const num = (v: unknown, d: number) => (typeof v === 'number' ? v : d);
type Sub = 'none' | 'pmv' | 'csis';

export default function EducationLoanCalc(p: Record<string, unknown>) {
    const [amount, setAmount] = useState(num(p.amount, 1000000));
    const [rate, setRate] = useState(num(p.rate, 10));
    const [mor, setMor] = useState(num(p.moratorium, 5));
    const [repay, setRepay] = useState(num(p.repay, 10));
    const [mode, setMode] = useState<MoratoriumMode>('added');
    const [sub, setSub] = useState<Sub>('none');
    const subPct = sub === 'csis' ? rate : sub === 'pmv' ? Math.min(3, rate) : 0;
    const e = educationLoan(amount, rate, mor, repay, mode, subPct, 1000000);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Education loan with moratorium"
            inputs={<>
                <Field label="Loan amount" money prefix="₹" value={amount} min={50000} max={10000000} step={50000} onChange={setAmount} />
                <Field label="Interest rate (per year)" suffix="%" value={rate} min={5} max={16} step={0.05} onChange={(v) => setRate(Math.round(v * 100) / 100)} />
                <Field label="Moratorium (course + grace)" suffix=" years" value={mor} min={0} max={7} step={0.5} onChange={(v) => setMor(Math.max(0, Math.round(v * 2) / 2))} />
                <Field label="Repayment period" suffix=" years" value={repay} min={1} max={15} step={1} onChange={(v) => setRepay(Math.max(1, Math.round(v)))} />
                <Toggle label="Interest during the moratorium" value={mode} onChange={setMode}
                    options={[{ id: 'added', label: 'Added to the loan' }, { id: 'paid', label: 'Paid while studying' }]} />
                <Toggle label="Government subvention (if eligible)" value={sub} onChange={setSub}
                    options={[{ id: 'none', label: 'None' }, { id: 'pmv', label: '3% (PM-Vidyalaxmi)' }, { id: 'csis', label: 'Full (CSIS)' }]} />
            </>}
            label="EMI after the moratorium"
            figure={inr(e.emi)}
            words={`for ${repay * 12} months on ${inr(e.startBalance)}`}
            rows={[
                { label: 'Interest during the moratorium', value: inr(e.moratoriumInterest), tone: 'warn' },
                ...(mode === 'paid' ? [{ label: 'Monthly interest while studying', value: inr(e.monthlyInterest) }] : []),
                { label: 'Total interest, whole loan', value: inr(e.totalInterest) },
                { label: 'Total you repay', value: inr(e.totalPaid), tone: 'money' as const },
            ]}
            note="Assumes the full loan is paid out at the start and simple interest in the moratorium; subvention is applied to at most ₹10 lakh of the loan. Your sanction letter and KFS are final." />
    );
}
