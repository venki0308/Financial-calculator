/**
 * /simple-interest (byaj) calculator: the app's two simple modes from
 * src/pages/SimpleInterestCalculator.tsx — rupees per ₹100 a month (flatByaj) and % a year
 * (simpleInterest) — copied into features/math-credit.ts.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { flatByaj, simpleInterest } from '../../math-credit';

type Mode = 'year' | 'per100';

export default function SimpleInterestCalc(p: Record<string, unknown>) {
    const [mode, setMode] = useState<Mode>(String(p.mode ?? 'year') === 'per100' ? 'per100' : 'year');
    const [principal, setPrincipal] = useState(Number(p.principal ?? 100000));
    const [rate, setRate] = useState(Number(p.rate ?? 8));
    const [per100, setPer100] = useState(Number(p.per100 ?? 2));
    const [months, setMonths] = useState(Number(p.months ?? 36));
    const yearly = mode === 'year' ? simpleInterest(principal, rate, months) : null;
    const flat = mode === 'per100' ? flatByaj(principal, per100, months) : null;
    const interest = yearly ? yearly.totalInterest : flat!.totalInterest;
    const total = yearly ? yearly.totalAmount : flat!.totalPayable;
    const perMonth = yearly ? yearly.monthlyInterestOnly : flat!.monthlyInterest;
    const annual = yearly ? rate : flat!.equivalentAnnualPct;
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Simple interest (byaj)"
            inputs={<>
                <Toggle label="Rate quoted as" value={mode} onChange={setMode}
                    options={[{ id: 'year', label: '% a year' }, { id: 'per100', label: '₹ per ₹100 a month' }]} />
                <Field label="Amount (principal)" money prefix="₹" value={principal} min={1000} max={10000000} step={1000} onChange={setPrincipal} />
                {mode === 'year'
                    ? <Field label="Interest rate (per year)" suffix="%" value={rate} min={1} max={36} step={0.25} onChange={(v) => setRate(Math.round(v * 100) / 100)} />
                    : <Field label="Byaj per ₹100 a month" prefix="₹" value={per100} min={0.25} max={5} step={0.25} onChange={(v) => setPer100(Math.round(v * 100) / 100)} />}
                <Field label="Time" suffix=" months" value={months} min={1} max={120} step={1} onChange={(v) => setMonths(Math.max(1, Math.round(v)))} />
            </>}
            label="Interest (byaj)"
            figure={inr(interest)}
            words={`${inr(total)} to repay in all`}
            rows={[
                { label: 'Interest a month', value: inr(perMonth) },
                { label: 'Same rate a year', value: `${Math.round(annual * 100) / 100}%` },
                { label: 'Principal + interest a month', value: inr(total / months) },
            ]}
            note="Simple interest: charged on the original amount only. If unpaid interest is added to the loan, it becomes compound and costs more." />
    );
}
