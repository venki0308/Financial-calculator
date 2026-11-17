/**
 * /business-tracker calculator: a month of shop entries totalled with the app's calcBizTotals
 * (src/utils/businessStorage.ts) and the profit margin from src/pages/business/BusinessDetail.tsx
 * (math-planning.bizMargin).
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { calcBizTotals, type BizEntry } from '../../../../utils/businessStorage';
import { bizMargin } from '../../math-planning';

/** One month of entries as the app would store them: daily sales and stock for each working day, plus monthly fixed costs. */
export function monthEntries(dailySales: number, dailyStock: number, days: number, rent: number, staff: number, other: number): BizEntry[] {
    const e = (type: 'income' | 'expense', amount: number, category: string, i: number): BizEntry =>
        ({ id: `${category}-${i}`, businessId: 'shop', date: '2026-11-01', type, amount, category, createdAt: '2026-11-01T00:00:00.000Z' });
    const out: BizEntry[] = [];
    for (let d = 0; d < days; d++) {
        out.push(e('income', dailySales, 'sales', d));
        out.push(e('expense', dailyStock, 'ingredients', d));
    }
    out.push(e('expense', rent, 'rent', 0), e('expense', staff, 'staff', 0), e('expense', other, 'utilities', 0));
    return out;
}

export default function BusinessTrackerCalc(p: Record<string, unknown>) {
    const [sales, setSales] = useState(Number(p.sales ?? 15000));
    const [stock, setStock] = useState(Number(p.stock ?? 11000));
    const [days, setDays] = useState(Number(p.days ?? 26));
    const [rent, setRent] = useState(Number(p.rent ?? 20000));
    const [staff, setStaff] = useState(Number(p.staff ?? 30000));
    const [other, setOther] = useState(Number(p.other ?? 6000));
    const t = calcBizTotals(monthEntries(sales, stock, days, rent, staff, other));
    const m = bizMargin(t.income, t.net);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="One month of a shop’s daily hisab"
            inputs={<>
                <Field label="Sales a day" money prefix="₹" value={sales} min={0} max={500000} step={500} onChange={setSales} />
                <Field label="Stock and purchases a day" money prefix="₹" value={stock} min={0} max={500000} step={500} onChange={setStock} />
                <Field label="Days open in the month" value={days} min={1} max={31} step={1} onChange={(v) => setDays(Math.min(31, Math.max(1, Math.round(v))))} />
                <Field label="Rent (monthly)" money prefix="₹" value={rent} min={0} max={500000} step={1000} onChange={setRent} />
                <Field label="Staff salaries (monthly)" money prefix="₹" value={staff} min={0} max={1000000} step={1000} onChange={setStaff} />
                <Field label="Electricity and other (monthly)" money prefix="₹" value={other} min={0} max={500000} step={500} onChange={setOther} />
            </>}
            label={t.net >= 0 ? 'Net profit for the month' : 'Net loss for the month'}
            figure={inr(Math.abs(t.net))}
            words={m === null ? 'no sales entered' : `profit margin ${(Math.round(m * 10) / 10).toLocaleString('en-IN')}%`}
            rows={[
                { label: 'Income', value: inr(t.income), tone: 'money' },
                { label: 'Expenses', value: inr(t.expenses), tone: 'warn' },
                { label: 'Average profit a day open', value: inr(t.net / days) },
            ]}
            note="Totals and margin are worked out the way the app's Business Tracker does it: income − expenses, and net ÷ income." />
    );
}
