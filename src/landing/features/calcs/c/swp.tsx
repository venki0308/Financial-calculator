/** /swp calculator: monthly withdrawals from a corpus (src/pages/SWPCalculator.tsx via math-invest.swpPlan). */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { swpPlan } from '../../math-invest';
import { yearsMonths } from '../../derive';

export default function SwpCalc(p: Record<string, unknown>) {
    const [corpus, setCorpus] = useState(Number(p.corpus ?? 5000000));
    const [withdrawal, setWithdrawal] = useState(Number(p.withdrawal ?? 40000));
    const [rate, setRate] = useState(Number(p.rate ?? 8));
    const [years, setYears] = useState(Number(p.years ?? 20));
    const inflation = Number(p.inflation ?? 5);
    const s = swpPlan(corpus, withdrawal, rate, years, inflation);
    const lasts = s.perpetual ? 'Never runs out (growth covers the withdrawal)' : s.longevityMonths === null ? 'More than 100 years' : yearsMonths(s.longevityMonths);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Fixed withdrawal at the end of every month"
            inputs={<>
                <Field label="Corpus invested" money prefix="₹" value={corpus} min={100000} max={50000000} step={100000} onChange={setCorpus} />
                <Field label="Monthly withdrawal" money prefix="₹" value={withdrawal} min={1000} max={500000} step={1000} onChange={setWithdrawal} />
                <Field label="Expected return (per year)" suffix="%" value={rate} min={1} max={15} step={0.5} onChange={(v) => setRate(Math.round(v * 10) / 10)} />
                <Field label="Plan length" suffix=" years" value={years} min={1} max={40} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
            </>}
            label={s.depletionMonth ? 'Money runs out after' : `Left after ${years} years`}
            figure={s.depletionMonth ? yearsMonths(s.depletionMonth) : inr(s.finalBalance)}
            words={`${inr(s.totalWithdrawn)} withdrawn in all`}
            rows={[
                { label: 'How long the corpus lasts', value: lasts, tone: s.depletionMonth ? 'warn' : undefined },
                { label: `Most you can take for exactly ${years} years`, value: `${inr(s.maxSustainableWithdrawal)} a month`, tone: 'money' },
                { label: `Last withdrawal in today's money (${inflation}% inflation)`, value: inr(s.realWithdrawalValueAtEnd) },
            ]}
            note="Same maths as the app's SWP calculator: a month's return is added, then the withdrawal is paid. Returns are assumptions; tax is not deducted." />
    );
}
