/** /term-insurance-cover calculator: the app's life-cover recommendation (src/pages/InsuranceCalculator.tsx, Life tab, via math-planning.lifeCover). */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { lifeCover } from '../../math-planning';

export default function TermInsuranceCoverCalc(p: Record<string, unknown>) {
    const [income, setIncome] = useState(Number(p.income ?? 1200000));
    const [dependents, setDependents] = useState(Number(p.dependents ?? 2));
    const [loans, setLoans] = useState(Number(p.loans ?? 0));
    const c = lifeCover(income, loans, dependents);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Life cover from income, loans and dependents"
            inputs={<>
                <Field label="Yearly income (gross)" money prefix="₹" value={income} min={100000} max={10000000} step={50000} onChange={setIncome} />
                <Field label="Dependents" value={dependents} min={0} max={4} step={1} hint="Spouse, children or parents who rely on your income (4 means 4 or more)." onChange={(v) => setDependents(Math.min(4, Math.max(0, Math.round(v))))} />
                <Field label="Loans outstanding" money prefix="₹" value={loans} min={0} max={20000000} step={50000} hint="Home, car, personal and other loans together." onChange={setLoans} />
            </>}
            label="Recommended cover (20 × income)"
            figure={inr(c.recommended)}
            words={`at least ${inr(c.minimum)} (15 × income)`}
            rows={[
                { label: '15 × income + loans', value: inr(c.withLoans) },
                { label: 'Needs-based total', value: inr(c.total), tone: 'money' },
                { label: 'of which education fund', value: inr(c.childEducation) },
            ]}
            note="Same rules as the app's insurance calculator. Premiums depend on the insurer's underwriting; get quotes from IRDAI-registered insurers." />
    );
}
