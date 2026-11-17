/**
 * /credit-card-tracker calculator: statement day + due day + the day you buy → which statement,
 * the due date, interest-free days and the last day before a late fee can apply.
 * Calendar arithmetic only (math-credit.cardCycleDates); the statement-to-due gap is the app's
 * own count from CreditCardAdd.tsx (math-credit.statementToDueDays). Example month: Dec 2026.
 */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell } from '../Shell';
import { cardCycleDates, statementToDueDays } from '../../math-credit';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const show = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
const whole = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));

export default function CreditCardTrackerCalc(p: Record<string, unknown>) {
    const [stmt, setStmt] = useState(Number(p.statementDay ?? 15));
    const [due, setDue] = useState(Number(p.dueDay ?? 5));
    const [buy, setBuy] = useState(Number(p.buyDay ?? 16));
    const purchase = `2026-12-${String(buy).padStart(2, '0')}`;
    const c = cardCycleDates(purchase, stmt, due);
    const gap = statementToDueDays(stmt, due);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Your card's cycle, for a purchase in December 2026"
            inputs={<>
                <Field label="Statement generated on day" value={stmt} min={1} max={28} step={1} onChange={(v) => setStmt(whole(v, 1, 28))} />
                <Field label="Payment due on day" value={due} min={1} max={28} step={1} onChange={(v) => setDue(whole(v, 1, 28))}
                    hint={`${gap} days after the statement, by the app's count.`} />
                <Field label="You buy on December" value={buy} min={1} max={31} step={1} onChange={(v) => setBuy(whole(v, 1, 31))} />
            </>}
            label="Interest-free days"
            figure={String(c.interestFreeDays)}
            words={`if you pay the bill in full by ${show(c.due)}`}
            rows={[
                { label: 'Billed on the statement of', value: show(c.statement) },
                { label: 'Payment due', value: show(c.due), tone: 'money' },
                { label: 'Late fee possible only after', value: show(c.threeDaysAfterDue), tone: 'warn' },
            ]}
            note="Interest-free only when the previous bill was paid in full. Your issuer's statement shows the exact cycle and cut-off time." />
    );
}
