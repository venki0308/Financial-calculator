/** /stp calculator: fixed monthly STP from a debt/liquid fund into an equity fund (the app's calculateSTP, src/utils/stpCalculations.ts). */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { calculateSTP } from '../../../../utils/stpCalculations';

export default function StpCalc(p: Record<string, unknown>) {
    const [amount, setAmount] = useState(Number(p.amount ?? 1200000));
    const [months, setMonths] = useState(Number(p.months ?? 12));
    const [sourceRate, setSourceRate] = useState(Number(p.sourceRate ?? 7));
    const [targetRate, setTargetRate] = useState(Number(p.targetRate ?? 12));
    const transfer = Math.round(amount / Math.max(1, months));
    const s = calculateSTP({
        initialAmount: amount, transferAmount: transfer, frequency: 'monthly', sourceRate, targetRate,
        durationMonths: months, stpType: 'fixed', exitLoadPercent: 0, exitLoadFreeMonths: 12, taxSlabPercent: 0,
    });
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Equal monthly transfers, source fund to equity fund"
            inputs={<>
                <Field label="Amount parked in the source fund" money prefix="₹" value={amount} min={50000} max={50000000} step={50000} onChange={setAmount} />
                <Field label="Spread over" suffix=" months" value={months} min={3} max={36} step={1} onChange={(v) => setMonths(Math.max(1, Math.round(v)))} />
                <Field label="Source (liquid/debt) fund return" suffix="%" value={sourceRate} min={0} max={10} step={0.25} onChange={(v) => setSourceRate(Math.round(v * 100) / 100)} />
                <Field label="Target (equity) fund return" suffix="%" value={targetRate} min={1} max={20} step={0.5} onChange={(v) => setTargetRate(Math.round(v * 10) / 10)} />
            </>}
            label={`Both funds after ${months} months`}
            figure={inr(s.totalPortfolioValue)}
            words={`${inr(transfer)} moved every month`}
            rows={[
                { label: 'Equity fund value', value: inr(s.finalTargetValue) },
                { label: 'Still in the source fund', value: inr(s.finalSourceBalance) },
                { label: 'Interest earned while waiting', value: inr(s.totalSourceInterestEarned), tone: 'money' },
                { label: 'All in equity on day one, at the same return', value: inr(s.lumpsumDirectComparison) },
            ]}
            note="The app's STP maths with steady returns, before tax and exit load. Real equity prices swing; that averaging is what an STP is for, and this model cannot show it." />
    );
}
