/** /sip calculator: what a monthly SIP grows to (the app's calculateSIP) and its value in today's money (SIPCalculator.tsx, 6%). */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { calculateSIP } from '../../../../utils/calculations';
import { SIP_INFLATION, sipTodaysMoney } from '../../math-invest';

export default function SipCalc(p: Record<string, unknown>) {
    const [monthly, setMonthly] = useState(Number(p.monthly ?? 5000));
    const [rate, setRate] = useState(Number(p.rate ?? 12));
    const [years, setYears] = useState(Number(p.years ?? 10));
    const s = calculateSIP(monthly, rate, years);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Monthly SIP, paid at the start of each month"
            inputs={<>
                <Field label="Monthly SIP" money prefix="₹" value={monthly} min={500} max={200000} step={500} onChange={setMonthly} />
                <Field label="Expected return (per year)" suffix="%" value={rate} min={1} max={20} step={0.5} onChange={(v) => setRate(Math.round(v * 10) / 10)} />
                <Field label="Time period" suffix=" years" value={years} min={1} max={40} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
            </>}
            label="Value at the end"
            figure={inr(s.futureValue)}
            words={`after ${years} year${years === 1 ? '' : 's'} of ${inr(monthly)} a month`}
            rows={[
                { label: 'You invest', value: inr(s.invested) },
                { label: 'Growth (assumed return)', value: inr(s.wealthGained), tone: 'money' },
                { label: `In today's money (${SIP_INFLATION}% inflation)`, value: inr(sipTodaysMoney(s.futureValue, years)) },
            ]}
            note="Same formula as the app's SIP calculator. The return is your assumption; mutual fund returns are not guaranteed." />
    );
}
