/**
 * Salary hike: new salary or hike % (math-tax.salaryHike, copied from the app's Salary Hike screen)
 * and the change in new-regime tax and take-home (the app's compareSalaryTax).
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { salaryHike } from '../../math-tax';
import { compareSalaryTax } from '../../../../utils/incomeTax';

const pct = (v: number) => `${(Math.round(v * 100) / 100).toLocaleString('en-IN')}%`;

export default function SalaryHikeCalc(p: Record<string, unknown>) {
    const [mode, setMode] = useState<'findSalary' | 'findHike'>(p.mode === 'findHike' ? 'findHike' : 'findSalary');
    const [current, setCurrent] = useState(Number(p.current ?? 1500000));
    const [hikePct, setHikePct] = useState(Number(p.hike ?? 10));
    const [offered, setOffered] = useState(Number(p.offered ?? 1800000));
    const h = salaryHike(mode, current, offered, hikePct);
    const before = compareSalaryTax(current, 0).newTax.totalTax;
    const after = compareSalaryTax(h.newSalary, 0).newTax.totalTax;
    const extraTax = after - before;
    const kept = h.hikeAmount - extraTax;
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Gross salary · new regime · FY 2026-27"
            inputs={<>
                <Toggle label="I know" value={mode} onChange={setMode}
                    options={[{ id: 'findSalary', label: 'The hike %' }, { id: 'findHike', label: 'The new salary' }]} />
                <Field label="Current salary per year (gross)" money prefix="₹" value={current} min={100000} max={10000000} step={10000} onChange={setCurrent} />
                {mode === 'findSalary'
                    ? <Field label="Hike" value={hikePct} min={0} max={100} step={0.5} suffix="%" onChange={setHikePct} />
                    : <Field label="New salary per year (gross)" money prefix="₹" value={offered} min={100000} max={20000000} step={10000} onChange={setOffered} />}
            </>}
            label={mode === 'findSalary' ? 'New salary per year' : 'Your hike'}
            figure={mode === 'findSalary' ? inr(h.newSalary) : pct(h.hikePct)}
            words={`${inr(h.hikeAmount)} more a year, ${inr(h.hikeMonthly)} a month before tax`}
            rows={[
                { label: 'Tax before the hike', value: inr(before) },
                { label: 'Tax after the hike', value: inr(after) },
                { label: 'Extra tax a year', value: inr(extraTax), tone: extraTax > 0 ? 'warn' : undefined },
                { label: 'Extra take-home a month', value: inr(kept / 12), tone: 'money' },
            ]}
            note="New-regime tax with the ₹75,000 standard deduction, rebate, surcharge and 4% cess. Employee PF and professional tax are not deducted." />
    );
}
