/** /break-even calculator: units and sales needed to cover fixed costs (src/pages/BreakEvenCalculator.tsx via math-planning.breakEven). */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { breakEven, profitAt } from '../../math-planning';

export default function BreakEvenCalc(p: Record<string, unknown>) {
    const [fixed, setFixed] = useState(Number(p.fixed ?? 50000));
    const [price, setPrice] = useState(Number(p.price ?? 200));
    const [variable, setVariable] = useState(Number(p.variable ?? 120));
    const b = breakEven(fixed, price, variable);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Fixed costs for one month or one project"
            inputs={<>
                <Field label="Fixed costs (rent, salaries, EMI…)" money prefix="₹" value={fixed} min={0} max={1000000} step={1000} onChange={setFixed} />
                <Field label="Selling price per unit" money prefix="₹" value={price} min={1} max={10000} step={5} onChange={(v) => setPrice(Math.max(1, v))} />
                <Field label="Variable cost per unit" money prefix="₹" value={variable} min={0} max={10000} step={5}
                    hint="Raw material, packing, commission: whatever each extra sale costs you." onChange={setVariable} />
            </>}
            label={b.neverBreaksEven ? 'Never breaks even' : 'Units to break even'}
            figure={b.neverBreaksEven ? '—' : b.breakEvenUnits.toLocaleString('en-IN')}
            words={b.neverBreaksEven ? 'The price must be higher than the variable cost per unit' : `sales of ${inr(b.breakEvenSales)}`}
            rows={[
                { label: 'Contribution per unit', value: inr(b.contribution), tone: b.contribution > 0 ? 'money' : 'warn' },
                { label: 'Contribution margin', value: `${b.marginPct}%` },
                { label: 'Profit at twice that volume', value: b.neverBreaksEven ? '—' : inr(profitAt(b.breakEvenUnits * 2, fixed, price, variable)) },
            ]}
            note="Same formula as the app's break-even calculator: fixed costs ÷ (price − variable cost), rounded up to a whole unit." />
    );
}
