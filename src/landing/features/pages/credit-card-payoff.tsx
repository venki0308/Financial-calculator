/**
 * /credit-card-payoff — primary query "credit card payoff calculator" (SEO_PLAN.md §5a).
 * Figures: the app's calculateAvalanche, calculateSnowball, calculateHybrid, calculateEqual,
 * calculateMinimumOnly and getMinimumDue (src/utils/creditCardCalculations.ts), the same engine
 * as the app's Credit Card Payoff screen. Rules: seo/research/verified-facts-credit.md.
 */
import {
    calculateAvalanche, calculateEqual, calculateHybrid, calculateMinimumOnly, calculateSnowball, getMinimumDue, getTrueCost,
    type PayoffCardInput, type PayoffResult,
} from '../../../utils/creditCardCalculations';
import { yearsMonths } from '../derive';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RBI_CARDS = { label: 'RBI Credit Cards and Debit Cards Directions, 2025 (para 23)', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13155' };
const GST12 = { label: 'CGST notification 12/2017, entry 27 (card interest is taxable)', url: 'https://cbic-gst.gov.in/hindi/pdf/central-tax-rate/Notification12-CGST.pdf' };

const card = (id: string, name: string, balance: number, apr: number): PayoffCardInput => ({ id, name, balance, apr, minDue: getMinimumDue(balance, apr) });
/** The page's three cards: ₹1.6 lakh in all. */
const CARDS = [card('r', 'Rewards card', 90000, 42), card('f', 'Fuel card', 45000, 39), card('s', 'Store card', 25000, 30)];
const TOTAL = CARDS.reduce((s, c) => s + c.balance, 0);
const MIN_TOTAL = CARDS.reduce((s, c) => s + c.minDue, 0);
const BUDGET = 10000;
const av = calculateAvalanche(CARDS, BUDGET);
const sn = calculateSnowball(CARDS, BUDGET);
const minOnly = calculateMinimumOnly(CARDS);
const firstWin = (r: PayoffResult) => r.payoffOrder[0];
const order = (r: PayoffResult) => r.payoffOrder.map((p) => `${p.name} (month ${p.month})`).join(' → ');

/** Two cards with very different rates. */
const DUO = [card('h', 'High-rate card', 150000, 43.2), card('l', 'Low-rate card', 20000, 24)];
const duoA = calculateAvalanche(DUO, 15000), duoS = calculateSnowball(DUO, 15000);

function Body() {
    const budgets = [8000, 10000, 12000, 15000, 20000, 30000];
    const e = calculateEqual(CARDS, BUDGET);
    const h = calculateHybrid(CARDS, BUDGET);
    const a20 = calculateAvalanche(CARDS, 20000);
    return (
        <>
            <Section title="Avalanche and snowball, side by side">
                <p>
                    Both methods pay the minimum due on every card each month and send whatever is left of your budget to one
                    card at a time. They differ only in which card gets the extra money first:
                </p>
                <ul>
                    <li><strong>Avalanche:</strong> the card with the highest interest rate. It costs the least.</li>
                    <li><strong>Snowball:</strong> the card with the smallest balance. You close a card sooner, which some people find easier to stick with.</li>
                </ul>
                <DataTable
                    caption={`Clearing three cards (${inr(TOTAL)} in all) at different monthly budgets`}
                    head={['You pay every month', 'Avalanche: debt-free in', 'Avalanche: interest + GST', 'Snowball: debt-free in', 'Snowball: interest + GST', 'Snowball costs more by']}
                    rows={budgets.map((b) => {
                        const a = calculateAvalanche(CARDS, b), s = calculateSnowball(CARDS, b);
                        return [inr(b), yearsMonths(a.totalMonths), inr(a.totalInterest), yearsMonths(s.totalMonths), inr(s.totalInterest), inr(s.totalInterest - a.totalInterest)];
                    })}
                    note={`Cards: ${CARDS.map((c) => `${c.name} ${inr(c.balance)} at ${c.apr}% a year`).join(', ')}. Minimum dues to start: ${inr(MIN_TOTAL)} a month in all. No new spending. Same engine as the FinCalix app's payoff calculator: interest at the yearly rate ÷ 12 each month plus 18% GST, minimums recalculated every month.`}
                />
            </Section>

            <Section title={`Which card is cleared when, at ${inr(BUDGET)} a month`}>
                <DataTable
                    caption={`Month in which each card reaches zero, paying ${inr(BUDGET)} a month in all`}
                    head={['Card', 'Balance', 'Rate a year', 'Avalanche', 'Snowball']}
                    rows={CARDS.map((c) => {
                        const a = av.payoffOrder.find((p) => p.id === c.id), s = sn.payoffOrder.find((p) => p.id === c.id);
                        return [c.name, inr(c.balance), `${c.apr}%`, a ? `Month ${a.month}` : '—', s ? `Month ${s.month}` : '—'];
                    })}
                    note={`Avalanche order: ${order(av)}. Snowball order: ${order(sn)}.`}
                />
                <p>
                    The snowball gives you a closed card in month {firstWin(sn).month}; the avalanche makes you wait until month {firstWin(av).month} for
                    the first one, but the expensive {CARDS[0].name.toLowerCase()} shrinks fastest, so the total bill is {inr(sn.totalInterest - av.totalInterest)} lower.
                </p>
            </Section>

            <Section title="How the payoff calculator works it out">
                <ol className="steps">
                    <li>Start of each month: every card adds a month of interest — balance × yearly rate ÷ 12 — plus 18% GST on that interest. The {CARDS[0].name.toLowerCase()} adds {inr(CARDS[0].balance * CARDS[0].apr / 1200 * 1.18)} in month one.</li>
                    <li>Pay each card’s minimum due, recalculated on its new balance: the larger of 5% of the balance or the month’s interest plus 1% of the balance, at least ₹200. In month one the three minimums come to about {inr(MIN_TOTAL)}.</li>
                    <li>Whatever is left of the {inr(BUDGET)} goes to the priority card — the highest rate for avalanche, the smallest balance for snowball.</li>
                    <li>When a card reaches zero, its minimum is freed up and joins the extra payment for the next card in line.</li>
                    <li>Repeat until every balance is zero: {yearsMonths(av.totalMonths)} and {inr(av.totalInterest)} of interest and GST with the avalanche.</li>
                </ol>
                <p>Your card’s own minimum-due rule is in its Most Important Terms and Conditions; the app’s formula is an estimate.</p>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `Paying only the minimum due on all three cards`, body: <>The minimums shrink as the balances shrink, so the debt drags on for {yearsMonths(minOnly.totalMonths)} and costs {amt(minOnly.totalInterest)} in interest and GST — about {Math.round(minOnly.totalInterest / av.totalInterest)} times what the {inr(BUDGET)}-a-month avalanche costs.</> },
                    { title: `Doubling the budget to ${inr(20000)} a month`, body: <>The avalanche clears the same {amt(TOTAL)} in {yearsMonths(a20.totalMonths)} with {inr(a20.totalInterest)} of interest and GST, {inr(av.totalInterest - a20.totalInterest)} less than at {inr(BUDGET)}.</> },
                    { title: `${amt(1.5e5)} at 43.2% and ${inr(20000)} at 24%, paying ${inr(15000)} a month`, body: <>When the small card is also the cheap one, the methods pull apart: avalanche {inr(duoA.totalInterest)} over {yearsMonths(duoA.totalMonths)}, snowball {inr(duoS.totalInterest)} over {yearsMonths(duoS.totalMonths)}.</> },
                    { title: 'Splitting the extra money across all cards', body: <>Spreading the surplus in proportion to each balance (the app’s “equal” option) costs {inr(e.totalInterest)} at {inr(BUDGET)} a month — between the two methods. The app’s “hybrid” option, which goes smallest-first only among cards whose rates are within 2 points, comes to {inr(h.totalInterest)} here.</> },
                ]} />
            </Section>

            <Section title="Before you start">
                <ul>
                    <li><strong>Stop adding to the balance.</strong> Every figure above assumes no new spending on the cards being cleared.</li>
                    <li><strong>Never let a minimum slip.</strong> Missing one can bring a late fee once you are more than three days past the due date, and that is also when the card can be reported to the credit bureaus as past due.</li>
                    <li><strong>Pay as soon as the money is in.</strong> Interest is charged only on what is outstanding after your payments and refunds, so paying earlier in the month trims the next bill.</li>
                </ul>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'The minimum amount due has to be set so that the balance does not grow when you pay it (no negative amortisation), and no interest may be charged on unpaid taxes, levies or charges.', source: RBI_CARDS },
                { text: 'While any part of the previous bill is unpaid, the interest-free credit period is suspended, so new purchases attract interest too.', source: RBI_CARDS },
                { text: 'A card account can be reported to credit bureaus as past due, or charged a late fee, only after it has been past due for more than three days.', source: RBI_CARDS },
                { text: 'Interest on credit cards is excluded from the GST exemption for loan interest, so GST applies to it (18% for financial services).', source: GST12 },
            ]} />
        </>
    );
}

export const creditCardPayoff: FeatureDef = {
    slug: 'credit-card-payoff',
    title: 'Credit Card Payoff Calculator: Avalanche vs Snowball',
    description: 'Plan to clear several credit cards: months to debt-free and interest with the avalanche and snowball methods, with real numbers for three cards.',
    h1: 'Credit card payoff calculator: avalanche or snowball for several cards',
    crumb: 'Credit card payoff',
    category: 'cards',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Credit Card Payoff',
    eyebrow: 'Credit cards · clearing more than one card',
    answer: (
        <>
            <p>Three cards owing {amt(TOTAL)} at 42%, 39% and 30% a year are cleared in {yearsMonths(av.totalMonths)} by paying {inr(BUDGET)} a month highest-rate-first (avalanche), with {inr(av.totalInterest)} of interest and GST. Smallest-balance-first (snowball) takes {yearsMonths(sn.totalMonths)} and costs {inr(sn.totalInterest)}.</p>
            <p>Paying only the minimum dues would stretch it to {yearsMonths(minOnly.totalMonths)}. RBI’s 2025 card rules require the minimum due to stop the balance from growing, but interest keeps running on what stays unpaid.</p>
        </>
    ),
    sources: [RBI_CARDS, GST12],
    calc: { key: 'credit-card-payoff', props: { b1: 90000, r1: 42, b2: 45000, r2: 39, b3: 25000, r3: 30, budget: BUDGET } },
    Body,
    faqs: [
        { q: 'Which is better, avalanche or snowball?', a: `Avalanche usually costs less, because the most expensive balance shrinks first. On the page’s three cards at ${inr(BUDGET)} a month it saves ${inr(sn.totalInterest - av.totalInterest)}. Snowball closes a card earlier (month ${firstWin(sn).month} against month ${firstWin(av).month}), which can help you stay motivated.` },
        { q: 'How do I calculate my credit card payoff time?', a: 'Add a month’s interest plus 18% GST to each balance, pay the minimums, put the rest of your budget on one card, and repeat month by month until every balance is zero. The calculator above does this for up to three cards.' },
        { q: `How long will it take to pay off ${amt(TOTAL)} of card debt?`, a: `About ${yearsMonths(av.totalMonths)} at ${inr(BUDGET)} a month, or ${yearsMonths(calculateAvalanche(CARDS, 20000).totalMonths)} at ${inr(20000)}, for balances at 30–42% a year with no new spending. With minimum payments only it takes ${yearsMonths(minOnly.totalMonths)}.` },
        { q: 'Does paying the minimum due stop interest?', a: 'No. The minimum due is only part of the bill; interest and GST keep running on the unpaid balance, and the interest-free period on new purchases is suspended until the previous bill is fully paid.' },
        { q: 'Which credit card should I pay off first?', a: 'The one with the highest interest rate, if you want to pay the least. Keep paying the minimum on every other card so none falls past due; reporting to the bureaus or a late fee can follow once a card is more than three days past its due date.' },
        { q: 'Should I count GST when planning a card payoff?', a: `Yes. GST at 18% is charged on card interest, which raises a 42% yearly rate to an effective ${getTrueCost(TOTAL, 42, 30).trueAPR}%. The figures on this page include it.` },
    ],
    related: [
        { href: '/credit-card-interest', label: 'Credit card interest calculator', note: 'What one unpaid balance costs per day' },
        { href: '/credit-card-tracker', label: 'Credit card due date tracker', note: 'Never miss a minimum while you pay down' },
        { href: '/personal-loan', label: 'Personal loan EMI calculator', note: 'Compare a loan to replace card debt' },
        { href: '/cibil-score', label: 'CIBIL score guide', note: 'How card payments reach your credit report' },
    ],
    disclaimer: { text: 'Payoff figures use the FinCalix app’s monthly model: a month of interest at the yearly rate ÷ 12 plus 18% GST, minimum dues estimated at the larger of 5% of the balance or interest plus 1%, and no new spending. Your card issuer’s statements, its Most Important Terms and Conditions (MITC) and any fees decide the real amounts. FinCalix is not affiliated with any bank or card issuer.' },
};
