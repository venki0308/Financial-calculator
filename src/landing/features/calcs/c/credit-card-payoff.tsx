/**
 * /credit-card-payoff calculator: up to three cards and one monthly budget, avalanche or snowball,
 * with the app's calculateAvalanche / calculateSnowball / calculateMinimumOnly and getMinimumDue
 * (src/utils/creditCardCalculations.ts). As in the app, the budget is never below the total of
 * the minimum dues.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { calculateAvalanche, calculateMinimumOnly, calculateSnowball, getMinimumDue, type PayoffCardInput } from '../../../../utils/creditCardCalculations';
import { yearsMonths } from '../../derive';

type Method = 'avalanche' | 'snowball';

export default function CreditCardPayoffCalc(p: Record<string, unknown>) {
    const [b1, setB1] = useState(Number(p.b1 ?? 90000));
    const [r1, setR1] = useState(Number(p.r1 ?? 42));
    const [b2, setB2] = useState(Number(p.b2 ?? 45000));
    const [r2, setR2] = useState(Number(p.r2 ?? 39));
    const [b3, setB3] = useState(Number(p.b3 ?? 25000));
    const [r3, setR3] = useState(Number(p.r3 ?? 30));
    const [budget, setBudget] = useState(Number(p.budget ?? 10000));
    const [method, setMethod] = useState<Method>('avalanche');
    const cards: PayoffCardInput[] = [
        { id: '1', name: 'Card 1', balance: b1, apr: r1, minDue: 0 },
        { id: '2', name: 'Card 2', balance: b2, apr: r2, minDue: 0 },
        { id: '3', name: 'Card 3', balance: b3, apr: r3, minDue: 0 },
    ].filter((c) => c.balance > 0).map((c) => ({ ...c, minDue: getMinimumDue(c.balance, c.apr) }));
    const totalMin = cards.reduce((s, c) => s + c.minDue, 0);
    const pay = Math.max(budget, totalMin);
    const a = calculateAvalanche(cards, pay);
    const s = calculateSnowball(cards, pay);
    const r = method === 'avalanche' ? a : s;
    const other = method === 'avalanche' ? s : a;
    const minOnly = calculateMinimumOnly(cards);
    const rate = (v: number) => Math.round(v * 10) / 10;
    const none = cards.length === 0;
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Up to three cards, one monthly budget"
            inputs={<>
                <Field label="Card 1 balance" money prefix="₹" value={b1} min={0} max={500000} step={1000} onChange={setB1} />
                <Field label="Card 1 rate (per year)" suffix="%" value={r1} min={12} max={48} step={0.5} onChange={(v) => setR1(rate(v))} />
                <Field label="Card 2 balance" money prefix="₹" value={b2} min={0} max={500000} step={1000} onChange={setB2} />
                <Field label="Card 2 rate (per year)" suffix="%" value={r2} min={12} max={48} step={0.5} onChange={(v) => setR2(rate(v))} />
                <Field label="Card 3 balance" money prefix="₹" value={b3} min={0} max={500000} step={1000} onChange={setB3} />
                <Field label="Card 3 rate (per year)" suffix="%" value={r3} min={12} max={48} step={0.5} onChange={(v) => setR3(rate(v))} />
                <Field label="You can pay every month (all cards)" money prefix="₹" value={budget} min={1000} max={200000} step={500} onChange={setBudget}
                    hint={budget < totalMin ? `Raised to the minimum dues, ${inr(totalMin)}.` : `Minimum dues now: ${inr(totalMin)}.`} />
                <Toggle label="Extra money goes to" value={method} onChange={setMethod}
                    options={[{ id: 'avalanche', label: 'Highest rate first' }, { id: 'snowball', label: 'Smallest balance first' }]} />
            </>}
            label="Debt-free in"
            figure={none ? '—' : r.neverPaysOff ? 'Never' : yearsMonths(r.totalMonths)}
            words={none ? 'enter a balance' : `${inr(r.totalInterest)} of interest + GST`}
            rows={[
                { label: method === 'avalanche' ? 'Snowball instead' : 'Avalanche instead', value: none ? '—' : `${yearsMonths(other.totalMonths)} · ${inr(other.totalInterest)}` },
                { label: 'First card cleared', value: r.payoffOrder[0] ? `${r.payoffOrder[0].name}, month ${r.payoffOrder[0].month}` : '—' },
                { label: 'Minimum dues only', value: none ? '—' : minOnly.neverPaysOff ? 'Never' : `${yearsMonths(minOnly.totalMonths)} · ${inr(minOnly.totalInterest)}`, tone: 'warn' },
            ]}
            note="Same engine as the app: monthly interest plus 18% GST, minimums recalculated each month, no new spending. Your card's MITC and statements are final." />
    );
}
