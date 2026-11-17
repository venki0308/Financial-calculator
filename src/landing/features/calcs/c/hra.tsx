/**
 * HRA exemption (old regime): the three limits from the app's HRA screen (math-tax.computeHRA),
 * and the tax the exemption saves, from the app's compareSalaryTax.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { computeHRA } from '../../math-tax';
import { compareSalaryTax } from '../../../../utils/incomeTax';

export default function HraCalc(p: Record<string, unknown>) {
    const [basic, setBasic] = useState(Number(p.basic ?? 50000));
    const [hra, setHra] = useState(Number(p.hra ?? 25000));
    const [rent, setRent] = useState(Number(p.rent ?? 22000));
    const [city, setCity] = useState<'metro' | 'other'>(p.metro === false ? 'other' : 'metro');
    const [salary, setSalary] = useState(Number(p.salary ?? 1500000));
    const [other, setOther] = useState(Number(p.other ?? 150000));
    const r = computeHRA(basic, 0, hra, rent, city === 'metro', 'old');
    const without = compareSalaryTax(salary, other);
    const withHra = compareSalaryTax(salary, other + r.exempt);
    const saved = without.oldTax.totalTax - withHra.oldTax.totalTax;
    const limits = ['the HRA you receive', `${city === 'metro' ? '50%' : '40%'} of basic + DA`, 'rent minus 10% of basic + DA'];
    return (
        <Shell campaign={String(p.campaign)} eyebrow="HRA exemption · old regime · tax year 2026-27"
            inputs={<>
                <Field label="Basic + DA per month" money prefix="₹" value={basic} min={5000} max={300000} step={1000} onChange={setBasic} />
                <Field label="HRA received per month" money prefix="₹" value={hra} min={0} max={150000} step={500} onChange={setHra} />
                <Field label="Rent you pay per month" money prefix="₹" value={rent} min={0} max={200000} step={500} onChange={setRent} />
                <Toggle label="Where you rent" value={city} onChange={setCity}
                    options={[{ id: 'metro', label: '8 metro cities · 50%' }, { id: 'other', label: 'Any other place · 40%' }]} />
                <Field label="Gross salary per year" money prefix="₹" value={salary} min={300000} max={10000000} step={25000} onChange={setSalary} />
                <Field label="Other old-regime deductions" money prefix="₹" value={other} min={0} max={1000000} step={5000}
                    hint="Section 123 (old 80C), health insurance, home-loan interest and similar. The standard deduction is added for you." onChange={setOther} />
            </>}
            label="HRA exempt from tax, per year"
            figure={inr(r.exempt)}
            words={r.exempt > 0 ? `Limited by ${limits[r.minIdx]}` : 'Rent must be more than 10% of basic + DA'}
            rows={[
                { label: 'HRA still taxable', value: inr(r.taxable) },
                { label: 'Old regime tax saved by HRA', value: inr(saved), tone: 'money' },
                { label: 'Old regime tax (with HRA)', value: inr(withHra.oldTax.totalTax) },
                { label: 'New regime tax (no HRA)', value: inr(withHra.newTax.totalTax), tone: withHra.newTax.totalTax < withHra.oldTax.totalTax ? 'warn' : undefined },
            ]}
            note="Tax includes rebate, surcharge and 4% cess for a resident below 60. The new regime does not allow the HRA exemption. Estimate only." />
    );
}
