/**
 * /ppf calculator: PPF balance with the PPF screen's formula (src/pages/AdvancedPPFCalculator.tsx,
 * computePPF → math-deposits.ppfSchedule): monthly interest on the balance after deposits made by the
 * 5th, credited every 31 March (PPF Scheme 2019, para 7). Yearly limit ₹1,50,000.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import { ppfSchedule } from '../../math-deposits';

type Freq = 'yearly' | 'monthly';

export default function PpfCalc(p: Record<string, unknown>) {
    const rate = Number(p.rate ?? 7.1);
    const [yearly, setYearly] = useState(Number(p.yearly ?? 150000));
    const [years, setYears] = useState(Number(p.years ?? 15));
    const [freq, setFreq] = useState<Freq>('yearly');
    const perYear = freq === 'monthly' ? 12 : 1;
    const rows = ppfSchedule(yearly / perYear, perYear, rate, years);
    const last = rows[rows.length - 1];
    const deposited = yearly * years;
    return (
        <Shell campaign={String(p.campaign)} eyebrow={`At ${rate}% (Oct–Dec 2026 rate)`}
            inputs={<>
                <Field label="Deposit every year" money prefix="₹" value={yearly} min={500} max={150000} step={500} onChange={(v) => setYearly(Math.min(150000, Math.max(500, Math.round(v / 50) * 50)))} />
                <Toggle label="How you deposit" value={freq} onChange={setFreq}
                    options={[{ id: 'yearly', label: 'Once, by 5 April' }, { id: 'monthly', label: 'Monthly, by the 5th' }]} />
                <Field label="Years of deposits" suffix=" years" value={years} min={15} max={35} step={5} onChange={(v) => setYears(Math.min(35, Math.max(15, Math.round(v / 5) * 5)))}
                    hint="15 years, then blocks of 5 years if you extend with deposits." />
            </>}
            label={`Balance after ${years} years`}
            figure={inr(last.closing)}
            words={`${inr(deposited)} deposited`}
            rows={[
                { label: 'Interest earned', value: inr(last.closing - deposited), tone: 'money' },
                { label: 'Interest credited in the last year', value: inr(last.interest) },
            ]}
            note="Assumes today's rate for every year; the Government resets it each quarter and it applies to the whole balance." />
    );
}
