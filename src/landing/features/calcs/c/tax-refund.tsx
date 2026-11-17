/**
 * Refund or balance due for a salaried person: the app's calculateJobSwitchTax (src/utils/jobSwitchTax.ts),
 * the engine behind the app's Form 16 tax calculator, with one employer.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { calculateJobSwitchTax } from '../../../../utils/jobSwitchTax';

export default function TaxRefundCalc(p: Record<string, unknown>) {
    const [regime, setRegime] = useState<'new' | 'old'>(p.regime === 'old' ? 'old' : 'new');
    const [salary, setSalary] = useState(Number(p.salary ?? 1500000));
    const [tds, setTds] = useState(Number(p.tds ?? 120000));
    const [interest, setInterest] = useState(Number(p.interest ?? 0));
    const [bankTds, setBankTds] = useState(Number(p.bankTds ?? 0));
    const [s123, setS123] = useState(Number(p.s123 ?? 150000));
    const [hraExempt, setHraExempt] = useState(Number(p.hraExempt ?? 0));
    const r = calculateJobSwitchTax({
        employers: [{ name: 'Employer', grossSalary: salary, gratuityExempt: 0, leaveEncashmentExempt: 0, hraExempt: regime === 'old' ? hraExempt : 0, otherExempt: 0, professionalTax: 0, tdsDeducted: tds }],
        otherIncome: { savingsInterest: 0, otherInterest: interest, tdsOtherIncome: bankTds },
        regime, fy: '2026-27', ageCategory: 'below_60',
        oldDeductions: { section80C: regime === 'old' ? s123 : 0, section80D: 0, section80CCD1B: 0 },
        advanceTaxPaid: 0,
    });
    const refund = r.balancePayable < 0;
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Salaried, below 60 · tax year 2026-27"
            inputs={<>
                <Toggle label="Regime" value={regime} onChange={setRegime}
                    options={[{ id: 'new', label: 'New regime' }, { id: 'old', label: 'Old regime' }]} />
                <Field label="Gross salary (Form No. 130)" money prefix="₹" value={salary} min={0} max={10000000} step={10000} onChange={setSalary} />
                <Field label="TDS deducted by your employer" money prefix="₹" value={tds} min={0} max={3000000} step={1000} onChange={setTds} />
                <Field label="FD and other interest income" money prefix="₹" value={interest} min={0} max={2000000} step={1000} onChange={setInterest} />
                <Field label="TDS deducted by the bank" money prefix="₹" value={bankTds} min={0} max={500000} step={500} onChange={setBankTds} />
                {regime === 'old' && <>
                    <Field label="Section 123 investments (old 80C)" money prefix="₹" value={s123} min={0} max={150000} step={5000} onChange={setS123} />
                    <Field label="Exempt HRA" money prefix="₹" value={hraExempt} min={0} max={1000000} step={5000} onChange={setHraExempt} />
                </>}
            </>}
            label={refund ? 'Refund due to you' : r.balancePayable > 0 ? 'Tax still to pay' : 'Fully settled'}
            figure={inr(Math.abs(r.balancePayable))}
            words={`Tax for the year ${inr(r.totalTaxLiability)} − TDS ${inr(r.totalTDS)}`}
            rows={[
                { label: 'Total income', value: inr(r.totalIncomeRounded) },
                { label: 'Tax for the year (with cess)', value: inr(r.totalTaxLiability) },
                { label: 'TDS already paid', value: inr(r.totalTDS) },
                { label: refund ? 'Refund' : 'Balance to pay', value: inr(Math.abs(r.balancePayable)), tone: refund ? 'money' : r.balancePayable > 0 ? 'warn' : undefined },
            ]}
            note="A refund is paid only after you file your return and e-verify it. Interest at 0.5% a month is added under section 437 when the refund is at least 10% of your tax." />
    );
}
