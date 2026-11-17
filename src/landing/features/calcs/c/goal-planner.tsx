/** /goal-planner calculator: future cost, monthly SIP and lump-sum alternative (src/pages/GoalPlanner.tsx via math-invest.goalPlan). */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { goalLumpSumToday, goalPlan } from '../../math-invest';

export default function GoalPlannerCalc(p: Record<string, unknown>) {
    const [cost, setCost] = useState(Number(p.cost ?? 2000000));
    const [years, setYears] = useState(Number(p.years ?? 15));
    const [inflation, setInflation] = useState(Number(p.inflation ?? 8));
    const [ret, setRet] = useState(Number(p.rate ?? 12));
    const [saved, setSaved] = useState(Number(p.saved ?? 0));
    const g = goalPlan(cost, inflation, years, ret, saved);
    const lump = goalLumpSumToday(cost, inflation, years, ret);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Child's education or any goal"
            inputs={<>
                <Field label="What it costs today" money prefix="₹" value={cost} min={100000} max={50000000} step={50000} onChange={setCost} />
                <Field label="Years until you need it" suffix=" years" value={years} min={1} max={30} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
                <Field label="Cost inflation (per year)" suffix="%" value={inflation} min={0} max={15} step={0.5} onChange={(v) => setInflation(Math.round(v * 10) / 10)} />
                <Field label="Expected return (per year)" suffix="%" value={ret} min={1} max={18} step={0.5} onChange={(v) => setRet(Math.round(v * 10) / 10)} />
                <Field label="Already saved for it" money prefix="₹" value={saved} min={0} max={20000000} step={10000} onChange={setSaved} />
            </>}
            label="Monthly SIP needed"
            figure={inr(g.monthlySIP)}
            words={`to have ${inr(g.targetFV)} in ${years} years`}
            rows={[
                { label: 'Cost when you need it', value: inr(g.targetFV) },
                { label: 'You invest in total', value: inr(g.totalInvested) },
                { label: 'Or one lump sum today, in all', value: inr(lump), tone: 'money' },
            ]}
            note="Same maths as the app's Goal Planner. Inflation and returns are your assumptions; review the plan every year." />
    );
}
