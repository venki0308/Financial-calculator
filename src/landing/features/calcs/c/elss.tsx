/**
 * /elss calculator. The app has no ELSS screen: growth is the app's calculateSIP, the tax effect
 * is the app's compareSalaryTax (math-invest.elssTaxSaved), section 123 limit ₹1.5 lakh.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { calculateSIP } from '../../../../utils/calculations';
import { SEC123_LIMIT, elssTaxSaved } from '../../math-invest';

export default function ElssCalc(p: Record<string, unknown>) {
    const [monthly, setMonthly] = useState(Number(p.monthly ?? 7500));
    const [salary, setSalary] = useState(Number(p.salary ?? 1500000));
    const [other123, setOther123] = useState(Number(p.other123 ?? 60000));
    const [otherDed, setOtherDed] = useState(Number(p.otherDed ?? 0));
    const [rate, setRate] = useState(Number(p.rate ?? 12));
    const [years, setYears] = useState(Number(p.years ?? 5));
    const t = elssTaxSaved(salary, monthly * 12, other123, otherDed);
    const g = calculateSIP(monthly, rate, years);
    const newWins = t.newTax <= t.oldWith;
    return (
        <Shell campaign={String(p.campaign)} eyebrow="ELSS SIP · Old Regime deduction (section 123)"
            inputs={<>
                <Field label="Monthly ELSS SIP" money prefix="₹" value={monthly} min={500} max={50000} step={500} onChange={setMonthly} />
                <Field label="Yearly salary (gross)" money prefix="₹" value={salary} min={300000} max={10000000} step={25000} onChange={setSalary} />
                <Field label="Other section 123 (80C) items" money prefix="₹" value={other123} min={0} max={SEC123_LIMIT} step={5000} onChange={setOther123}
                    hint="Your EPF share, PPF, life insurance premium, children's tuition fees … The whole section is capped at ₹1.5 lakh a year." />
                <Field label="Other Old Regime deductions" money prefix="₹" value={otherDed} min={0} max={1500000} step={5000} onChange={setOtherDed}
                    hint="HRA, health insurance (80D, now 126), home-loan interest and similar." />
                <Field label="Expected return (per year)" suffix="%" value={rate} min={1} max={18} step={0.5} onChange={(v) => setRate(Math.round(v * 10) / 10)} />
                <Field label="Years you keep investing" suffix=" years" value={years} min={3} max={30} step={1} onChange={(v) => setYears(Math.max(3, Math.round(v)))} />
            </>}
            label="Old Regime tax saved this year"
            figure={inr(t.saved)}
            words={`on ${inr(t.counted)} of ELSS that fits under the ₹1.5 lakh limit`}
            rows={[
                { label: 'Old Regime tax, with this ELSS', value: inr(t.oldWith) },
                { label: 'New Regime tax (no ELSS deduction)', value: inr(t.newTax), tone: newWins ? 'money' : undefined },
                { label: `ELSS value after ${years} years`, value: inr(g.futureValue) },
                { label: 'You invest', value: inr(g.invested) },
            ]}
            note={newWins ? 'The New Regime still costs less here, so the ELSS deduction would not lower your tax.' : 'The deduction counts only in the Old Regime. Returns are assumptions; ELSS units are locked in for 3 years.'} />
    );
}
