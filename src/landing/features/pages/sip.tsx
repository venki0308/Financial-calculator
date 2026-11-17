/**
 * /sip — primary query "sip calculator" (SEO_PLAN.md §5b). Replaces public/sip.
 * Growth: the app's calculateSIP. Today's money: SIPCalculator.tsx's 6% inflation insight
 * (math-invest.sipTodaysMoney). Cost of delay: SIPCalculator.tsx costOfDelay (two calculateSIP calls).
 * Goal amount: math.goalSip. Tax: Income-tax Act, 2025 ss.196, 198 (seo/research/verified-facts-invest.md).
 */
import { calculateSIP } from '../../../utils/calculations';
import { SIP_INFLATION, sipTodaysMoney } from '../math-invest';
import { goalSip } from '../math';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025 (sections 196 and 198)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const SEBI = { label: 'SEBI investor website', url: 'https://investor.sebi.gov.in/' };

const M = 5000, R = 12, Y = 10;
const base = calculateSIP(M, R, Y);
const real = sipTodaysMoney(base.futureValue, Y);
const growth = Math.pow(1 + R / 1200, Y * 12);
const factor = ((growth - 1) / (R / 1200)) * (1 + R / 1200);
const ten20 = calculateSIP(10000, R, 20);
const delay = [1, 3, 5].map((d) => ({ d, lost: ten20.futureValue - calculateSIP(10000, R, 20 - d).futureValue }));
const tenLakh = goalSip(1000000, 10, R);

function Body() {
    const monthlies = [1000, 2000, 3000, 5000, 10000, 25000];
    const spans = [5, 10, 15, 20, 25];
    const rates = [8, 10, 12, 14];
    const s2k = calculateSIP(2000, R, 30);
    const s15k = calculateSIP(15000, 10, 7);
    const s3k = calculateSIP(3000, R, 15);
    return (
        <>
            <Section title="What a monthly SIP grows to: amount × years">
                <DataTable
                    caption={`Value of a monthly SIP at an assumed ${R}% a year`}
                    head={['Monthly SIP', ...spans.map((y) => `${y} years`)]}
                    rows={monthlies.map((m) => [inr(m), ...spans.map((y) => amt(calculateSIP(m, R, y).futureValue))])}
                    note="Instalment paid on the first day of each month, growth compounded monthly at the yearly rate ÷ 12 — the formula in the FinCalix app's SIP calculator."
                />
                <p>
                    What you pay in grows in a straight line; the value curves upward. Going from 10 to 20 years doubles your payments
                    but takes {inr(M)} a month from {amt(base.futureValue)} to {amt(calculateSIP(M, R, 20).futureValue)}. Over 25 years
                    {' '}{amt(M * 12 * 25)} of your own money becomes {amt(calculateSIP(M, R, 25).futureValue)}.
                </p>
            </Section>

            <Section title="Same SIP, different returns">
                <DataTable
                    caption={`${inr(M)} a month for 15 years at different yearly returns`}
                    head={['Assumed return', 'You pay in', 'Value after 15 years', 'Growth']}
                    rows={rates.map((rt) => { const s = calculateSIP(M, rt, 15); return [`${rt}% a year`, amt(s.invested), amt(s.futureValue), amt(s.wealthGained)]; })}
                    note="No fund promises any of these rates. Equity funds rise and fall; a long SIP buys through both."
                />
            </Section>

            <Section title="The SIP formula, worked through">
                <p>FV = P × [ (1 + i)<sup>n</sup> − 1 ] ÷ i × (1 + i), where P is the monthly instalment, i the monthly return and n the number of instalments.</p>
                <ol className="steps">
                    <li>P = {inr(M)}; i = {R}% ÷ 12 = 1% = 0.01; n = {Y} × 12 = {Y * 12}.</li>
                    <li>(1.01)<sup>{Y * 12}</sup> = {growth.toFixed(4)}.</li>
                    <li>({growth.toFixed(4)} − 1) ÷ 0.01 × 1.01 = {factor.toFixed(4)}. Each rupee paid monthly becomes about ₹{factor.toFixed(2)} in total.</li>
                    <li>{inr(M)} × {factor.toFixed(4)} = <strong>{inr(base.futureValue)}</strong>. You paid {inr(base.invested)}; the other {inr(base.wealthGained)} is growth.</li>
                </ol>
                <p>The extra × (1 + i) is there because each instalment goes in at the start of its month and earns that month’s return too.</p>
            </Section>

            <Section title="Your SIP in today’s money">
                <p>
                    A rupee in ten years will buy less than a rupee does now. The FinCalix app shows every SIP result again at {SIP_INFLATION}%
                    inflation a year: the {inr(base.futureValue)} above is worth about {inr(real)} at today’s prices.
                </p>
                <DataTable
                    caption={`${inr(M)} a month at ${R}%: value then and in today’s prices (${SIP_INFLATION}% inflation)`}
                    head={['Years', 'Value at the end', 'In today’s money']}
                    rows={[10, 15, 20, 25, 30].map((y) => { const v = calculateSIP(M, R, y).futureValue; return [`${y} years`, amt(v), amt(sipTodaysMoney(v, y))]; })}
                />
            </Section>

            <Section title="What waiting costs">
                <p>
                    Take {inr(10000)} a month meant to run for 20 years, which reaches {amt(ten20.futureValue)} at {R}%. Start later but stop
                    on the same date, and the shortfall is large — the same comparison the app shows as “cost of delay”:
                </p>
                <DataTable
                    caption={`${inr(10000)} a month, 20-year plan, end date fixed`}
                    head={['Start delayed by', 'Value at the end date', 'Given up']}
                    rows={delay.map((x) => [`${x.d} year${x.d === 1 ? '' : 's'}`, amt(ten20.futureValue - x.lost), amt(x.lost)])}
                />
            </Section>

            <Section title="Four SIPs with real numbers">
                <Scenarios items={[
                    { title: `${inr(2000)} a month from age 25 to 55`, body: <>At {R}% the 30 years of instalments ({amt(s2k.invested)}) grow to {amt(s2k.futureValue)} — a small amount left alone for a long time.</> },
                    { title: `${inr(15000)} a month for 7 years at 10%`, body: <>Ends at {amt(s15k.futureValue)} on {amt(s15k.invested)} paid in. Over short spans most of the final value is your own money.</> },
                    { title: `${inr(3000)} a month for 15 years`, body: <>Reaches {amt(s3k.futureValue)} at {R}%, worth about {amt(sipTodaysMoney(s3k.futureValue, 15))} in today’s prices.</> },
                    { title: '₹10 lakh in 10 years', body: <>Working backwards, the app’s goal SIP says {inr(tenLakh.monthlyNeeded)} a month at {R}%. For ₹1 crore targets see the separate page linked below.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Each instalment buys units on its own date, so each has its own holding period. Redeeming equity-fund units within 12 months: 20% on the gain. After 12 months: 12.5% on yearly long-term gains beyond ₹1.25 lakh. Values on this page are before any tax.', source: ACT },
                { text: 'The return you enter is an assumption. Mutual fund investments carry market risk; read the scheme documents before investing.', source: SEBI },
            ]} />
        </>
    );
}

export const sipPage: FeatureDef = {
    slug: 'sip',
    title: 'SIP Calculator: Monthly SIP Returns by Amount and Years',
    description: 'See what a monthly SIP grows to by amount and years, the SIP formula worked through, the value in today’s money and what a late start costs.',
    h1: 'SIP calculator: what your monthly SIP will grow to',
    crumb: 'SIP calculator',
    category: 'investments',
    updated: '2026-11-17',
    analyticsTitle: 'Website - SIP',
    eyebrow: 'Mutual fund SIP · monthly investing',
    answer: (
        <>
            <p>A SIP of {inr(M)} a month for {Y} years grows to about {inr(base.futureValue)} at an assumed {R}% a year: {inr(base.invested)} you pay in plus {inr(base.wealthGained)} of growth.</p>
            <p>At {SIP_INFLATION}% inflation that sum buys what {inr(real)} buys today. Returns are assumptions; equity fund gains are taxed under sections 196 and 198 of the Income-tax Act, 2025.</p>
        </>
    ),
    sources: [SEBI, ACT],
    calc: { key: 'sip', props: { monthly: M, rate: R, years: Y } },
    Body,
    faqs: [
        { q: 'How is SIP return calculated?', a: `With the future-value formula for monthly instalments: FV = P × [(1 + i)^n − 1] ÷ i × (1 + i), with i the monthly return and n the number of months. ${inr(M)} for ${Y * 12} months at ${R}% gives ${inr(base.futureValue)}.` },
        { q: 'How much will ₹5,000 a month in a SIP give after 10 or 20 years?', a: `About ${amt(base.futureValue)} after 10 years and ${amt(calculateSIP(M, R, 20).futureValue)} after 20 years at an assumed ${R}% a year. You pay in ${amt(M * 120)} and ${amt(M * 240)}.` },
        { q: 'How much SIP should I do?', a: `Start from the goal, not the amount: ₹10 lakh in 10 years needs about ${inr(tenLakh.monthlyNeeded)} a month at ${R}%. Use the goal planner for goals priced in today’s rupees, such as a child’s education.` },
        { q: 'Are SIP returns guaranteed?', a: 'No. A SIP is only a way of paying into a mutual fund; the fund’s value moves with the market, and the rate you enter here is an assumption.' },
        { q: 'What is my SIP worth after inflation?', a: `Divide the result by (1 + inflation) for each year. At ${SIP_INFLATION}%, ${inr(base.futureValue)} in ${Y} years is about ${inr(real)} in today’s money.` },
        { q: 'SIP me kitna interest milta hai?', a: `SIP mein FD jaisa fixed byaj nahi milta — fund ki value market ke saath badhti-ghatti hai. Agar 12% saalana return maanein to ${inr(M)} mahina 10 saal mein lagbhag ${inr(base.futureValue)} ban sakta hai, jisme ${inr(base.wealthGained)} kamaai hai. Yeh guaranteed nahi hai.` },
    ],
    related: [
        { href: '/step-up-sip', label: 'Step-up SIP calculator', note: 'Raise the SIP every year' },
        { href: '/sip-for-1-crore', label: 'SIP for ₹1 crore', note: 'Monthly amount for a ₹1 crore target' },
        { href: '/lumpsum', label: 'Lumpsum calculator', note: 'Invest the whole amount at once' },
        { href: '/goal-planner', label: 'Goal planner', note: 'SIP for a goal priced in today’s rupees' },
        { href: '/elss', label: 'ELSS calculator', note: 'A SIP that can cut Old Regime tax' },
    ],
    disclaimer: 'invest',
};
