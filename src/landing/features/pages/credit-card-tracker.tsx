/**
 * /credit-card-tracker — primary query "credit card due date tracker" (SEO_PLAN.md §5a).
 * The app's credit card manager (src/pages/expenses/CreditCards.tsx, CreditCardAdd.tsx,
 * CreditCardDetail.tsx) and its reminders (src/services/NotificationScheduler.ts: 3 days before
 * and on the due date, 9 am, cards with a balance). Figures: math-credit.cardCycleDates (calendar)
 * and statementToDueDays (copied from CreditCardAdd.tsx), getTrueCost and getUtilization
 * (src/utils/creditCardCalculations.ts). Rules: seo/research/verified-facts-credit.md.
 */
import { getTrueCost, getUtilization } from '../../../utils/creditCardCalculations';
import { cardCycleDates, statementToDueDays } from '../math-credit';
import { longDate } from '../../site-data';
import { inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RBI_CARDS = { label: 'RBI Credit Cards and Debit Cards Directions, 2025', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13155' };

const STMT = 15, DUE = 5;
const early = cardCycleDates('2026-10-16', STMT, DUE);
const late = cardCycleDates('2026-11-15', STMT, DUE);
const d = (iso: string) => longDate(iso) ?? iso;
/** 1st, 2nd, 3rd, 4th … 21st, 22nd. */
const nth = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
/** Missing the full payment: ₹40,000 at 3.5% a month, interest for 30 days, before any late fee. */
const MISS = getTrueCost(40000, 42, 30);

function Body() {
    const buys = ['2026-10-16', '2026-10-24', '2026-11-01', '2026-11-08', '2026-11-15', '2026-11-16'];
    const cycles: Array<[number, number]> = [[1, 21], [5, 25], [10, 30], [15, 5], [20, 10], [25, 14]];
    const s1 = cardCycleDates('2026-11-02', 1, 21);
    return (
        <>
            <Section title="Statement date, due date and the interest-free days in between">
                <p>
                    Every card runs on a billing cycle. On the statement date the cycle closes and the bill is made; the due date
                    comes a set number of days later. A purchase is interest-free from the day you make it until the due date of the
                    bill it lands on — provided you pay that bill in full. So the same card gives a long interest-free run to a
                    purchase made just after a statement and a short one to a purchase made on the statement day.
                </p>
                <DataTable
                    caption={`A card with its statement on the ${nth(STMT)} and payment due on the ${nth(DUE)}`}
                    head={['You buy on', 'On the statement of', 'Pay in full by', 'Interest-free days']}
                    rows={buys.map((b) => {
                        const c = cardCycleDates(b, STMT, DUE);
                        return [d(b), d(c.statement), d(c.due), String(c.interestFreeDays)];
                    })}
                    note="A purchase on the statement day itself is taken as part of that statement. Card issuers set their own cut-off times; your statement shows the exact cycle."
                />
            </Section>

            <Section title="Worked example: one purchase through one cycle">
                <ol className="steps">
                    <li>You buy something on {d('2026-10-16')}, the day after a statement.</li>
                    <li>The next statement is generated on {d(early.statement)} and includes it.</li>
                    <li>That bill is due on {d(early.due)}, {early.statementToDue} days after the statement — RBI asks issuers to leave at least a fortnight between bill and interest.</li>
                    <li>Pay the total amount due by {d(early.due)} and the purchase has cost no interest over {early.interestFreeDays} days.</li>
                    <li>Pay late or pay part, and interest is charged. A late payment fee can be added only if the payment is still outstanding more than three days after the due date — that is, after {d(early.threeDaysAfterDue)} here.</li>
                </ol>
            </Section>

            <Section title="Choosing a billing cycle that fits your salary">
                <p>
                    RBI lets you change your card’s billing cycle at least once, to any start or closing date you choose. If your salary
                    arrives on the 1st, a due date a few days later is easier to meet than one at the end of the month.
                </p>
                <DataTable
                    caption="Common statement and due-day pairs"
                    head={['Statement on', 'Due on', 'Days from statement to due', 'Best day to buy (longest wait)']}
                    rows={cycles.map(([s, du]) => [`${nth(s)} of the month`, nth(du), String(statementToDueDays(s, du)), nth(s + 1)])}
                    note="Days from statement to due: the app’s own count (due day − statement day, plus 30 if the due date falls in the next month). The longest interest-free run goes to purchases made the day after the statement."
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: 'Statement on the 1st, due on the 21st', body: <>A purchase on {d('2026-11-02')} lands on the {d(s1.statement)} statement, due {d(s1.due)}: {s1.interestFreeDays} days without interest if paid in full.</> },
                    { title: 'Buying on the statement day', body: <>On the {nth(STMT)}/{nth(DUE)} card, a purchase on {d('2026-11-15')} is billed the same day and due on {d(late.due)} — only {late.interestFreeDays} interest-free days.</> },
                    { title: `Missing the full payment on a ${inr(40000)} bill`, body: <>At 3.5% a month, one month of interest on {inr(40000)} is {inr(MISS.interest)} plus {inr(MISS.gst)} of GST — {inr(MISS.total)} before any late fee, and new purchases lose their interest-free days until the bill is cleared.</> },
                    { title: `${inr(45000)} spent on a ${inr(150000)} limit`, body: <>That is {getUtilization(45000, 150000)}% of the limit. The app’s card screen shows this utilisation for each card and for all cards together, and flags it when it climbs.</> },
                ]} />
            </Section>

            <Section title="What the FinCalix card tracker keeps for each card">
                <ul>
                    <li><strong>The card:</strong> bank, card name, network, colour and, if you like, the last four digits. Never the full card number.</li>
                    <li><strong>Money:</strong> credit limit, current balance, statement balance, minimum due and the yearly interest rate.</li>
                    <li><strong>Dates:</strong> statement day and due day; the list sorts your cards by the nearest due date and shows the days left on each.</li>
                    <li><strong>Costs and rewards:</strong> annual fee and fee-waiver spend, late, over-limit and cash-advance fees, forex markup, reward points and their expiry.</li>
                    <li><strong>Reminders:</strong> with Calculation Reminders on in Settings and notifications allowed, the app schedules a phone reminder at 9 am three days before and on the due date for every card that has a balance, and shows due-soon alerts in the app.</li>
                </ul>
                <p>Your financial data stays on your device. No login, no ads.</p>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Interest-free credit period means the time from the date of a transaction to the payment due date. It is suspended while any balance of the previous month’s bill is outstanding (paras 5(16), 23(3)).', source: RBI_CARDS },
                { text: 'Bills must be sent without delay and leave you at least one fortnight to pay before interest starts (para 24).', source: RBI_CARDS },
                { text: 'You can change your card’s billing cycle at least once, choosing any start or closing date (para 29).', source: RBI_CARDS },
                { text: 'Late payment charges apply only once the account has been past due for more than three days, counted from the due date on the statement, and only on the amount outstanding after the due date. The same three-day line applies before an account is reported to credit bureaus as past due (para 23(5)).', source: RBI_CARDS },
                { text: 'A request to close a card must be honoured within seven working days once dues are paid; after that the issuer owes you ₹500 for each day of delay (para 19).', source: RBI_CARDS },
            ]} />
        </>
    );
}

export const creditCardTracker: FeatureDef = {
    slug: 'credit-card-tracker',
    title: 'Credit Card Due Date Tracker and Interest-Free Days',
    description: 'How statement date, due date and interest-free days work on an Indian credit card, RBI’s late-fee and billing-cycle rules, and a tracker with reminders.',
    h1: 'Credit card due date tracker: statement date, due date and reminders',
    crumb: 'Card due date tracker',
    category: 'cards',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Credit Card Tracker',
    eyebrow: 'Credit cards · billing cycle and due dates',
    answer: (
        <>
            <p>On a card with its statement on the {nth(STMT)} and payment due on the {nth(DUE)}, a purchase on {d('2026-10-16')} is billed on {d(early.statement)} and due on {d(early.due)} — {early.interestFreeDays} days without interest if you pay the bill in full. Bought on {d('2026-11-15')}, it gets only {late.interestFreeDays} days.</p>
            <p>Under RBI’s 2025 card Directions a late fee can be charged only when a payment is more than three days past the due date, and you may change your billing cycle at least once.</p>
        </>
    ),
    sources: [RBI_CARDS],
    calc: { key: 'credit-card-tracker', props: { statementDay: STMT, dueDay: DUE, buyDay: 16 } },
    Body,
    faqs: [
        { q: 'How do I know my credit card due date?', a: 'Look for the payment due date on your monthly card statement — RBI counts any late days from that date. It comes some days after the statement date, and RBI requires bills to leave you at least a fortnight before interest starts.' },
        { q: 'What is the interest-free period on a credit card?', a: `It is the time from the day you buy to the due date of the bill that purchase appears on. On a ${nth(STMT)}/${nth(DUE)} card it ranges from ${late.interestFreeDays} to ${early.interestFreeDays} days, and it applies only if the previous bill was paid in full.` },
        { q: 'Is there a late fee if I pay one day after the due date?', a: 'No late fee can be charged for that: RBI allows late payment charges only when the account is past due for more than three days. Interest can still apply because the bill was not paid in full by the due date.' },
        { q: 'Can I change my credit card statement date?', a: 'Yes. RBI requires card issuers to let you change the billing cycle at least once, to any closing date you pick. Ask your issuer through its app, website or customer care.' },
        { q: 'Does the FinCalix app remind me before my card bill is due?', a: 'Yes, for cards with a balance: when the app runs it schedules phone reminders at 9 am three days before and on the due date, as long as Calculation Reminders is on in Settings and notifications are allowed. Due-soon alerts also appear inside the app.' },
    ],
    related: [
        { href: '/credit-card-interest', label: 'Credit card interest calculator', note: 'What a missed full payment costs' },
        { href: '/credit-card-payoff', label: 'Credit card payoff calculator', note: 'Plan to clear balances on several cards' },
        { href: '/expense-tracker', label: 'Expense tracker', note: 'See card spending before the bill' },
        { href: '/cibil-score', label: 'CIBIL score guide', note: 'When a late card payment reaches your report' },
    ],
    disclaimer: { text: 'Dates are worked out from the statement and due days you enter; card issuers set their own cut-off times and your statement shows the actual billing cycle and due date. Interest figures use the daily-balance method with 18% GST. FinCalix is not affiliated with any bank or card issuer.' },
};
