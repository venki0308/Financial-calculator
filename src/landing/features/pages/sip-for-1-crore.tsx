/**
 * /sip-for-1-crore — primary query "sip for 1 crore" (SEO_PLAN.md §5b).
 * Monthly SIP needed: the app's goal-SIP formula (features/math.goalSip, copied from SIPCalculator.tsx).
 * Step-up starts: derive.stepUpStartFor over the app's step-up formula. Inflation: the app's
 * calculateCompoundInterest. Tax rule: Income-tax Act, 2025 s.198 (verified 17 Nov 2026).
 */
import { calculateCompoundInterest, calculateSIP } from '../../../utils/calculations';
import { stepUpStartFor } from '../derive';
import { goalSip } from '../math';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025 (section 198)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const SEBI = { label: 'SEBI investor education', url: 'https://investor.sebi.gov.in/' };

const CRORE = 10000000;
const g15 = goalSip(CRORE, 15, 12);
const g20 = goalSip(CRORE, 20, 12);
const g10 = goalSip(CRORE, 10, 12);
const step15 = stepUpStartFor(CRORE, 15, 12, 10);
/** What ₹1 crore after n years buys in today's money at i% inflation (the app's compound-interest function). */
const todayValue = (years: number, inflation: number) => CRORE / calculateCompoundInterest(1, inflation, years, 1).amount;
/** First whole year in which a ₹5,000 SIP at 12% reaches ₹1 crore (the app's calculateSIP). */
const years5k = (() => { let y = 1; while (calculateSIP(5000, 12, y).futureValue < CRORE) y++; return y; })();

function Body() {
    const years = [5, 10, 15, 20, 25, 30];
    const delay = calculateSIP(g20.monthlyNeeded, 12, 15).futureValue;
    return (
        <>
            <Section title="Monthly SIP needed for ₹1 crore">
                <DataTable
                    caption="Monthly SIP to reach ₹1 crore, by years and assumed yearly return"
                    head={['Years', 'At 10% a year', 'At 12% a year', 'At 14% a year', 'Total invested at 12%']}
                    rows={years.map((y) => [`${y} years`, inr(goalSip(CRORE, y, 10).monthlyNeeded), inr(goalSip(CRORE, y, 12).monthlyNeeded), inr(goalSip(CRORE, y, 14).monthlyNeeded), amt(goalSip(CRORE, y, 12).invested)])}
                    note="SIP paid at the start of every month, returns compounded monthly — the same formula as the goal SIP in the FinCalix app. Returns are assumptions, not promises."
                />
                <p>
                    Time does most of the work. Over 30 years at 12% you put in {amt(goalSip(CRORE, 30, 12).invested)} and growth adds
                    the rest; over 10 years you put in {amt(g10.invested)} yourself.
                </p>
            </Section>

            <Section title="Start smaller with a yearly step-up">
                <p>
                    Most salaries rise every year, so you don’t have to start at the full amount. With a step-up you raise the SIP by a
                    fixed percentage once a year.
                </p>
                <DataTable
                    caption="Starting monthly SIP for ₹1 crore at 12%, flat vs raised 10% every year"
                    head={['Years', 'Flat SIP', 'With 10% step-up, start at']}
                    rows={[10, 15, 20, 25].map((y) => [`${y} years`, inr(goalSip(CRORE, y, 12).monthlyNeeded), inr(stepUpStartFor(CRORE, y, 12, 10))])}
                    note="Step-up figures use the app’s step-up SIP maths: the monthly amount rises once a year, starting amount rounded up to ₹100."
                />
            </Section>

            <Section title="What ₹1 crore will be worth">
                <p>
                    Prices rise, so ₹1 crore in the future buys less than ₹1 crore today. At 6% inflation a year, ₹1 crore in 15 years
                    buys roughly what {amt(todayValue(15, 6))} buys today; in 20 years, what {amt(todayValue(20, 6))} buys today. If
                    your goal is a house or a child’s education, set the target in future rupees, not today’s.
                </p>
                <DataTable
                    caption="₹1 crore in the future, in today’s money"
                    head={['Years from now', 'At 5% inflation', 'At 6% inflation', 'At 7% inflation']}
                    rows={[10, 15, 20, 25].map((y) => [`${y} years`, amt(todayValue(y, 5)), amt(todayValue(y, 6)), amt(todayValue(y, 7))])}
                />
            </Section>

            <Section title="How the monthly amount is worked out">
                <p>
                    Monthly SIP = goal ÷ ( [ (1 + r)<sup>n</sup> − 1 ] ÷ r × (1 + r) ), where r is the yearly return ÷ 12 and n is the
                    number of months. For ₹1 crore in 15 years at 12%: r = 1% a month, n = 180, and the monthly SIP comes to
                    {' '}{inr(g15.monthlyNeeded)}. You invest {amt(g15.invested)} in total; the assumed growth adds {amt(g15.gain)}.
                </p>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: 'A 30-year-old who wants ₹1 crore by 45', body: <>At 12% that needs {inr(g15.monthlyNeeded)} a month for 15 years, or a start of {inr(step15)} raised by 10% every year.</> },
                    { title: 'Starting five years late', body: <>{inr(g20.monthlyNeeded)} a month reaches ₹1 crore in 20 years. Start the same SIP five years later and stop at the same date — 15 years — and it reaches only {amt(delay)}.</> },
                    { title: 'A shorter goal: ₹1 crore in 10 years', body: <>{inr(g10.monthlyNeeded)} a month at 12%. At 10% it is {inr(goalSip(CRORE, 10, 10).monthlyNeeded)} — the assumed return changes the answer a lot over short periods.</> },
                    { title: 'Bigger goals', body: <>₹2 crore in 20 years at 12% needs {inr(goalSip(2 * CRORE, 20, 12).monthlyNeeded)} a month; ₹5 crore in 25 years needs {inr(goalSip(5 * CRORE, 25, 12).monthlyNeeded)}.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Gains on equity mutual fund units held for more than 12 months are taxed at 12.5% on the part above ₹1.25 lakh a year; held 12 months or less, at 20%. The figures on this page are before tax.', source: ACT },
                { text: 'Mutual fund returns are not guaranteed and past returns don’t predict future returns. Check a fund’s scheme documents before investing.', source: SEBI },
            ]} />
        </>
    );
}

export const sipFor1Crore: FeatureDef = {
    slug: 'sip-for-1-crore',
    title: 'SIP for 1 Crore: Monthly Amount by Years',
    description: 'How much SIP you need each month to build ₹1 crore in 10, 15, 20 or 25 years, with a step-up option and what ₹1 crore will be worth then.',
    h1: 'SIP for ₹1 crore: how much to invest every month',
    crumb: 'SIP for ₹1 crore',
    category: 'investments',
    updated: '2026-11-17',
    analyticsTitle: 'Website - SIP for 1 Crore',
    eyebrow: 'Mutual fund SIP · goal planning',
    answer: (
        <>
            <p>To build ₹1 crore in 15 years at an assumed 12% a year, you need a monthly SIP of {inr(g15.monthlyNeeded)}; in 20 years, {inr(g20.monthlyNeeded)}; in 10 years, {inr(g10.monthlyNeeded)}.</p>
            <p>If you raise the SIP by 10% every year, you can start the 15-year plan at {inr(step15)} a month. Returns are assumptions, not guaranteed.</p>
        </>
    ),
    sources: [ACT, SEBI],
    calc: { key: 'goalSip', props: { target: CRORE, years: 15, rate: 12 } },
    Body,
    faqs: [
        { q: 'How much SIP is needed for 1 crore in 10 years?', a: `About ${inr(g10.monthlyNeeded)} a month at an assumed 12% a year, or ${inr(goalSip(CRORE, 10, 10).monthlyNeeded)} at 10%. You would invest about ${amt(g10.invested)} yourself.` },
        { q: 'How much SIP is needed for 1 crore in 15 years?', a: `About ${inr(g15.monthlyNeeded)} a month at 12%. With a 10% yearly step-up you can start at ${inr(step15)} a month.` },
        { q: 'How much SIP is needed for 1 crore in 20 years?', a: `About ${inr(g20.monthlyNeeded)} a month at 12%, or ${inr(goalSip(CRORE, 20, 10).monthlyNeeded)} at 10%.` },
        { q: 'Can a ₹5,000 SIP become ₹1 crore?', a: `Yes, given time: ${inr(5000)} a month at an assumed 12% a year passes ₹1 crore in year ${years5k} (about ${amt(calculateSIP(5000, 12, years5k).futureValue)} after ${years5k} years). At a lower return it takes longer.` },
        { q: 'SIP se 1 crore kaise banaye?', a: `Har mahine ek fixed SIP lambe samay tak chalaiye: 12% saalana return maan kar 15 saal mein ₹1 crore ke liye lagbhag ${inr(g15.monthlyNeeded)} mahina chahiye, 20 saal mein ${inr(g20.monthlyNeeded)}. Har saal SIP 10% badhayein to shuruaat ${inr(step15)} se kar sakte hain. Return guaranteed nahi hota.` },
        { q: 'Is ₹1 crore enough for retirement?', a: `It depends on when you retire. At 6% inflation, ₹1 crore in 20 years buys about what ${amt(todayValue(20, 6))} buys today, so plan in future rupees and review the goal every few years.` },
    ],
    related: [
        { href: '/step-up-sip', label: 'Step-up SIP calculator', note: 'Corpus when your SIP rises every year' },
        { href: '/sip', label: 'SIP calculator', note: 'What a monthly SIP grows to' },
        { href: '/sukanya-samriddhi', label: 'Sukanya Samriddhi calculator', note: 'A government-backed goal for a daughter' },
        { href: '/home-loan-prepayment', label: 'Home loan prepayment', note: 'Prepay the loan or invest the money?' },
    ],
    disclaimer: 'invest',
};
