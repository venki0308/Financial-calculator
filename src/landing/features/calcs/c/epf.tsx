/**
 * /epf calculator: EPF corpus at retirement with the formula of src/pages/EPFCalculator.tsx
 * (features/math-retire.epfProjection): employee 12% (+ VPF), employer 12% split with EPS at
 * 8.33% of pay up to the ₹25,000 ceiling, interest on the monthly running balance.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { epfMonthlySplit, epfProjection } from '../../math-retire';

export default function EpfCalc(p: Record<string, unknown>) {
    const [basic, setBasic] = useState(Number(p.basic ?? 25000));
    const [age, setAge] = useState(Number(p.age ?? 25));
    const [retire, setRetire] = useState(Number(p.retire ?? 58));
    const [hike, setHike] = useState(Number(p.hike ?? 5));
    const [vpf, setVpf] = useState(0);
    const rate = Number(p.rate ?? 8.25);
    const r = epfProjection(basic, 12 + vpf, rate, age, retire, hike);
    const now = epfMonthlySplit(basic, 12 + vpf);
    return (
        <Shell campaign={String(p.campaign)} eyebrow={`EPF at ${rate}% (rate for 2025-26)`}
            inputs={<>
                <Field label="Basic pay + DA (per month)" money prefix="₹" value={basic} min={5000} max={300000} step={500} onChange={(v) => setBasic(Math.max(1000, Math.round(v)))} />
                <Field label="Your age now" suffix=" years" value={age} min={18} max={57} step={1} onChange={(v) => setAge(Math.min(57, Math.max(18, Math.round(v))))} />
                <Field label="Retirement age" suffix=" years" value={retire} min={50} max={60} step={1} onChange={(v) => setRetire(Math.min(60, Math.max(age + 1, Math.round(v))))} />
                <Field label="Yearly pay rise" suffix="%" value={hike} min={0} max={15} step={0.5} onChange={(v) => setHike(Math.round(v * 10) / 10)} />
                <Field label="Extra voluntary PF (VPF)" suffix="% of pay" value={vpf} min={0} max={20} step={1} onChange={(v) => setVpf(Math.max(0, Math.round(v)))} hint="Optional, on top of your 12%." />
            </>}
            label={`EPF balance at ${retire}`}
            figure={inr(r.corpus)}
            words={`after ${r.years} years of contributions`}
            rows={[
                { label: 'Your contributions', value: inr(r.totalEmp) },
                { label: 'Employer share into EPF', value: inr(r.totalEmployer) },
                { label: 'Interest earned', value: inr(r.totalInterest), tone: 'money' },
                { label: 'Going into EPF this month', value: inr(now.intoEpf) },
                { label: 'Employer share to EPS (pension) this month', value: inr(now.eps) },
            ]}
            note={`Same maths as the app. Assumes you are an EPS member, contributions on your full basic + DA, and ${rate}% every year; the rate is declared yearly.`} />
    );
}
