/** /financial-planning calculator: the Smart Planner's money health score and limits (src/pages/AIFinancialAssistant.tsx via math-planning.smartPlan). */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { smartPlan } from '../../math-planning';

const one = (v: number) => (Math.round(v * 10) / 10).toLocaleString('en-IN');

export default function FinancialPlanningCalc(p: Record<string, unknown>) {
    const [salary, setSalary] = useState(Number(p.salary ?? 50000));
    const [age, setAge] = useState(Number(p.age ?? 28));
    const [expenses, setExpenses] = useState(Number(p.expenses ?? 25000));
    const [savings, setSavings] = useState(Number(p.savings ?? 100000));
    const [emi, setEmi] = useState(Number(p.emi ?? 0));
    const s = smartPlan(Math.max(1, salary), age, expenses, savings, emi);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Monthly figures, new tax regime FY 2026-27"
            inputs={<>
                <Field label="Monthly salary (gross)" money prefix="₹" value={salary} min={10000} max={400000} step={1000} hint="Up to ₹4 lakh a month: the planner's tax estimate does not include surcharge." onChange={(v) => setSalary(Math.min(400000, Math.max(1, v)))} />
                <Field label="Age" suffix=" years" value={age} min={18} max={70} step={1} onChange={(v) => setAge(Math.min(70, Math.max(18, Math.round(v))))} />
                <Field label="Monthly expenses (without EMI)" money prefix="₹" value={expenses} min={0} max={400000} step={1000} onChange={setExpenses} />
                <Field label="EMIs you pay a month" money prefix="₹" value={emi} min={0} max={300000} step={1000} onChange={setEmi} />
                <Field label="Savings you already have" money prefix="₹" value={savings} min={0} max={20000000} step={10000} hint="Money you could use in an emergency: bank balance, FDs, liquid funds." onChange={setSavings} />
            </>}
            label="Money health score"
            figure={`${s.score}/100`}
            words={`savings ${s.savingsPts}/30 · EMI ${s.emiPts}/25 · emergency fund ${s.emergencyPts}/25 · investing ${s.investPts}/20`}
            rows={[
                { label: 'You save of gross salary', value: `${one(s.savingsRatio)}%`, tone: s.savingsRatio >= 20 ? 'money' : 'warn' },
                { label: 'EMIs as share of take-home', value: `${one(s.emiRatio)}%`, tone: s.emiRatio <= 40 ? undefined : 'warn' },
                { label: 'Emergency fund covers', value: `${one(s.emergencyMonths)} months`, tone: s.emergencyMonths >= 6 ? 'money' : 'warn' },
                { label: 'EMI ceiling (40% of take-home)', value: inr(s.maxEmiAllowed) },
            ]}
            note="Same rules as the Smart Planner in the app. A rules-based check of your numbers, not financial advice." />
    );
}
