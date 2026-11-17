/**
 * /expense-tracker calculator: the 50/30/20 split of take-home pay and an on-track check, as in the app's
 * monthly report (src/utils/expenseReportPDF.ts, "50/30/20 RULE ANALYSIS", via math-planning.split503020).
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { split503020 } from '../../math-planning';

export default function BudgetSplitCalc(p: Record<string, unknown>) {
    const [income, setIncome] = useState(Number(p.income ?? 50000));
    const [needs, setNeeds] = useState(Number(p.needs ?? 28000));
    const [wants, setWants] = useState(Number(p.wants ?? 12000));
    const s = split503020(income);
    const saved = Math.max(0, income - needs - wants);
    // Status wording as in the app's report: over the target = "Over budget", savings below target = "Under target".
    const status = (actual: number, target: number) => (actual <= target ? 'on track' : `over by ${inr(actual - target)}`);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="50/30/20 budget on take-home pay"
            inputs={<>
                <Field label="Monthly take-home pay" money prefix="₹" value={income} min={10000} max={500000} step={1000} onChange={setIncome} />
                <Field label="Spent on needs" money prefix="₹" value={needs} min={0} max={500000} step={500} hint="Rent, EMI, bills, insurance, groceries, medicines." onChange={setNeeds} />
                <Field label="Spent on wants" money prefix="₹" value={wants} min={0} max={500000} step={500} hint="Eating out, shopping, entertainment, travel, subscriptions." onChange={setWants} />
            </>}
            label="Save or invest each month"
            figure={inr(s.savings)}
            words={`20% of ${inr(income)}`}
            rows={[
                { label: `Needs, 50% = ${inr(s.needs)}`, value: status(needs, s.needs), tone: needs <= s.needs ? 'money' : 'warn' },
                { label: `Wants, 30% = ${inr(s.wants)}`, value: status(wants, s.wants), tone: wants <= s.wants ? 'money' : 'warn' },
                { label: 'Left to save now', value: inr(saved), tone: saved >= s.savings ? 'money' : 'warn' },
            ]}
            note="The app's monthly report runs this check on the expenses you log, grouping categories into needs and wants for you." />
    );
}
