/**
 * /cibil-score calculator: the band the app gives a score you enter (getCibilTier,
 * src/data/cibilData.ts), and your card utilisation (getUtilization / getUtilizationLabel,
 * src/utils/creditCardCalculations.ts) with the payment that brings it to 30%.
 * It does not fetch or estimate a bureau score.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, inr } from '../Shell';
import { getCibilTier } from '../../../../data/cibilData';
import { getUtilization, getUtilizationLabel } from '../../../../utils/creditCardCalculations';

export default function CibilScoreCalc(p: Record<string, unknown>) {
    const [score, setScore] = useState(Number(p.score ?? 720));
    const [balance, setBalance] = useState(Number(p.balance ?? 90000));
    const [limit, setLimit] = useState(Number(p.limit ?? 200000));
    const tier = getCibilTier(score);
    const u = getUtilization(balance, limit);
    // Smallest whole-rupee payment that takes utilisation below 30% (the app marks under 30% as good).
    let toThirty = 0;
    if (u >= 30) {
        toThirty = Math.max(1, Math.ceil(balance - limit * 0.3));
        while (toThirty < balance && getUtilization(balance - toThirty, limit) >= 30) toThirty++;
    }
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Read your score and card use"
            inputs={<>
                <Field label="Score on your bureau report" value={score} min={300} max={900} step={1} onChange={(v) => setScore(Math.min(900, Math.max(300, Math.round(v))))}
                    hint="Type the score from your free credit report. FinCalix does not fetch or verify scores." />
                <Field label="Total owed on your credit cards" money prefix="₹" value={balance} min={0} max={2000000} step={1000} onChange={setBalance} />
                <Field label="Total credit limit" money prefix="₹" value={limit} min={10000} max={5000000} step={10000} onChange={(v) => setLimit(Math.max(1000, v))} />
            </>}
            label="Band in the FinCalix app"
            figure={tier.label}
            words={`${tier.range} on the 300–900 scale`}
            rows={[
                { label: 'Card utilisation', value: `${u}% · ${getUtilizationLabel(u).label}`, tone: u >= 50 ? 'warn' : undefined },
                { label: 'Pay off to get below 30%', value: toThirty > 0 ? inr(toThirty) : 'Already below 30%' },
            ]}
            note="Bands and labels are the app's rule of thumb, not a bureau or lender scale. Lenders decide using your full credit report and their own policy." />
    );
}
