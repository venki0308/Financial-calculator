/**
 * /goal-planner — primary query "child education planning calculator" (SEO_PLAN.md §5e).
 * Future cost, monthly SIP, effect of savings: src/pages/GoalPlanner.tsx (math-invest.goalPlan).
 * Lump sum alternative: math-invest.goalLumpSumToday (search over the same formula).
 * SSY facts: verified-facts-2026-11-17.md (SSA Scheme 2019, NSI); rates from SMALL_SAVINGS.
 */
import { SMALL_SAVINGS } from '../../../data/rateEnvironment';
import { goalLumpSumToday, goalPlan } from '../math-invest';
import { amt, inr, pct } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const SSY = { label: 'Sukanya Samriddhi Account Scheme, 2019 (NSI)', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=89' };
const DEA = { label: 'DEA small savings rates', url: 'http://www.dea.gov.in/budget-division/475' };
const SEBI = { label: 'SEBI investor site', url: 'https://investor.sebi.gov.in/' };

const COST = 2000000, YRS = 15, INF = 8, RET = 12;
const main = goalPlan(COST, INF, YRS, RET, 0);
const lump = goalLumpSumToday(COST, INF, YRS, RET);
const SAVED = 300000;
const withSaved = goalPlan(COST, INF, YRS, RET, SAVED);
const R = SMALL_SAVINGS.rates;

function Body() {
    const spans = [5, 10, 15, 18];
    const infl = [5, 8, 10];
    const abroad = goalPlan(5000000, 7, 18, RET, 0);
    const cautious = goalPlan(1500000, INF, 12, 10, 0);
    const house = goalPlan(1500000, 6, 6, 9, 0);
    const step1 = Math.pow(1 + INF / 100, YRS);
    return (
        <>
            <Section title="What education will cost by the time it is needed">
                <DataTable
                    caption={`A course costing ${amt(COST)} today, priced in future rupees`}
                    head={['Years away', ...infl.map((i) => `${i}% cost inflation`)]}
                    rows={spans.map((y) => [`${y} years`, ...infl.map((i) => amt(goalPlan(COST, i, y, RET, 0).targetFV))])}
                    note="Cost inflation is your assumption, not an official figure. Try more than one rate before you fix the plan."
                />
            </Section>

            <Section title="Monthly SIP needed, and the one-time alternative">
                <DataTable
                    caption={`To pay for a ${amt(COST)} course at ${INF}% cost inflation, investing at an assumed ${RET}% a year`}
                    head={['Years away', 'Future cost', 'Monthly SIP', 'You pay in (SIP)', 'Or one lump sum today']}
                    rows={spans.map((y) => { const g = goalPlan(COST, INF, y, RET, 0); return [`${y} years`, amt(g.targetFV), inr(g.monthlySIP), amt(g.totalInvested), amt(goalLumpSumToday(COST, INF, y, RET))]; })}
                    note="SIP paid at the start of each month, returns compounded monthly — the FinCalix Goal Planner’s formula. The lump sum is the amount today at which the planner needs no SIP, rounded up to ₹1,000."
                />
                <p>
                    Starting early changes the effort completely: at 5 years the plan needs {inr(goalPlan(COST, INF, 5, RET, 0).monthlySIP)} a month;
                    at 18 years, {inr(goalPlan(COST, INF, 18, RET, 0).monthlySIP)}, even though the future cost is far higher.
                </p>
            </Section>

            <Section title="How the plan is worked out">
                <ol className="steps">
                    <li>Future cost = today’s cost × (1 + inflation)<sup>years</sup>: {inr(COST)} × 1.0{INF}<sup>{YRS}</sup> = {inr(COST)} × {step1.toFixed(4)} = {inr(main.targetFV)}.</li>
                    <li>Subtract what your existing savings will grow to (none in this example).</li>
                    <li>Monthly SIP = amount still needed ÷ ( [ (1 + i)<sup>n</sup> − 1 ] ÷ i × (1 + i) ), with i = {RET}% ÷ 12 and n = {YRS * 12} months: <strong>{inr(main.monthlySIP)}</strong>.</li>
                    <li>You pay in {inr(main.totalInvested)}; assumed growth supplies {inr(main.wealthGained)}. Return after inflation: {pct(main.realRate * 100)} a year.</li>
                </ol>
            </Section>

            <Section title="Other families, other numbers">
                <Scenarios items={[
                    { title: `${amt(SAVED)} already saved`, body: <>Left to grow at {RET}% for {YRS} years, it reaches {amt(withSaved.savingsFV)}, and the monthly SIP for the {amt(COST)} course drops from {inr(main.monthlySIP)} to {inr(withSaved.monthlySIP)}.</> },
                    { title: `Postgraduate study abroad: ${amt(5000000)} today, 18 years away`, body: <>At 7% cost inflation that becomes {amt(abroad.targetFV)}; a SIP of {inr(abroad.monthlySIP)} a month at {RET}% covers it.</> },
                    { title: 'A more cautious return', body: <>A {amt(1500000)} course 12 years away at {INF}% inflation needs {inr(cautious.monthlySIP)} a month if the money earns 10% — or {amt(goalLumpSumToday(1500000, INF, 12, 10))} set aside today.</> },
                    { title: 'Not just education: a home down payment', body: <>{amt(1500000)} in today’s prices, needed in 6 years at 6% inflation, with money in a 9% option: {inr(house.monthlySIP)} a month. Short goals leave little time for growth.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: `For a daughter under 10, Sukanya Samriddhi pays ${R.ssy}% (Oct–Dec 2026), takes ₹250 to ₹1.5 lakh a year for 15 years, and allows a withdrawal of up to 50% for education once she turns 18 or passes Class 10.`, source: SSY },
                { text: `Small-savings rates are reset every quarter; PPF pays ${R.ppf}% for Oct–Dec 2026.`, source: DEA },
                { text: 'Equity fund returns are not guaranteed; a market fall shortly before the fees are due would leave a gap the plan has to absorb.', source: SEBI },
            ]} />
        </>
    );
}

export const goalPlannerPage: FeatureDef = {
    slug: 'goal-planner',
    title: 'Child Education Planning Calculator: SIP or Lump Sum',
    description: 'Plan for a child’s education: future fees with inflation, the monthly SIP needed, the one-time amount instead, and how existing savings cut the SIP.',
    h1: 'Child education planning calculator: future cost and monthly SIP',
    crumb: 'Goal planner',
    category: 'goals',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Goal Planner',
    eyebrow: 'Goal planning · child’s education',
    answer: (
        <>
            <p>A course that costs {amt(COST)} today will cost about {inr(main.targetFV)} in {YRS} years if fees rise {INF}% a year. Investing {inr(main.monthlySIP)} a month at an assumed {RET}% gets you there — or about {inr(lump)} invested once today.</p>
            <p>Inflation and returns are assumptions; review the plan each year. For a daughter, Sukanya Samriddhi pays {R.ssy}% for October–December 2026.</p>
        </>
    ),
    sources: [SSY, DEA, SEBI],
    calc: { key: 'goal-planner', props: { cost: COST, years: YRS, inflation: INF, rate: RET, saved: 0 } },
    Body,
    faqs: [
        { q: 'How much should I save for my child’s education?', a: `Enough to cover the future cost, not today’s. A ${amt(COST)} course ${YRS} years away is about ${amt(main.targetFV)} at ${INF}% inflation, which needs ${inr(main.monthlySIP)} a month at an assumed ${RET}%.` },
        { q: 'How do I calculate the future cost of education?', a: `Multiply today’s cost by (1 + inflation) for each year until it is needed: ${inr(COST)} × 1.0${INF}^${YRS} = ${inr(main.targetFV)}.` },
        { q: 'Is a SIP or a lump sum better for an education goal?', a: `Either works; a lump sum needs far less in total if you have it now — about ${amt(lump)} today against ${amt(main.totalInvested)} paid in through a SIP for the same goal at the same return. A SIP suits money that comes from monthly income.` },
        { q: 'What if I have already saved something?', a: `It reduces the SIP. ${amt(SAVED)} saved today grows to about ${amt(withSaved.savingsFV)} in ${YRS} years at ${RET}%, cutting the monthly SIP from ${inr(main.monthlySIP)} to ${inr(withSaved.monthlySIP)}.` },
        { q: 'Which inflation rate should I assume for education?', a: 'There is no official education-inflation figure for planning, so test more than one. The tables show 5%, 8% and 10%; a higher rate leaves a cushion if fees rise faster than you expected.' },
        { q: 'Goal setting kaise kare?', a: `Har goal ke liye teen cheezein tay kijiye: aaj ki keemat, kitne saal baad chahiye, aur mehngai ka andaaza. Jaise ${amt(COST)} ki padhai ${YRS} saal baad ${INF}% mehngai par lagbhag ${amt(main.targetFV)} ki hogi; ${RET}% maan kar ${inr(main.monthlySIP)} mahina SIP chahiye.` },
    ],
    related: [
        { href: '/sukanya-samriddhi', label: 'Sukanya Samriddhi calculator', note: 'Government scheme for a daughter’s education' },
        { href: '/sip', label: 'SIP calculator', note: 'What a monthly SIP grows to' },
        { href: '/step-up-sip', label: 'Step-up SIP calculator', note: 'Start smaller, raise it every year' },
        { href: '/lumpsum', label: 'Lumpsum calculator', note: 'Growth of a one-time investment' },
        { href: '/ppf', label: 'PPF calculator', note: 'Fixed-rate, government-backed saving' },
    ],
    disclaimer: { text: 'Goal figures are planning estimates. Future costs depend on the inflation rate you assume, and investment returns are assumptions, not promises: mutual fund investments are subject to market risks. Small-savings rates change every quarter. FinCalix is not a SEBI-registered investment advisor.' },
};
