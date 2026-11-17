/**
 * /lumpsum — primary query "lumpsum calculator" (SEO_PLAN.md §5b). Replaces public/lumpsum.
 * Growth and real value: src/pages/LumpsumCalculator.tsx (math-invest.lumpsumGrowth).
 * Lumpsum vs SIP with the same total money: the app's calculateSIP. Tax: Income-tax Act, 2025
 * ss.196, 198 (seo/research/verified-facts-invest.md).
 */
import { calculateSIP } from '../../../utils/calculations';
import { lumpsumGrowth } from '../math-invest';
import { amt, inr, pct } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025 (ss. 196, 198)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const SEBI = { label: 'SEBI: investor education', url: 'https://investor.sebi.gov.in/' };

const P = 100000, R = 12, Y = 10, INF = 5;
const main = lumpsumGrowth(P, R, Y, INF);
const pow = Math.pow(1 + R / 100, Y);

/** The same total money, paid as one lump sum today or as a monthly SIP over the same years. */
const pairs = [[5000, 10], [5000, 20], [10000, 5], [25000, 3]].map(([m, y]) => {
    const total = m * 12 * y;
    return { m, y, total, lump: lumpsumGrowth(total, R, y, INF).fv, sip: calculateSIP(m, R, y).futureValue };
});

function Body() {
    const amounts = [100000, 200000, 500000, 1000000, 2500000];
    const spans = [3, 5, 10, 15, 20];
    const bonus = lumpsumGrowth(500000, 10, 7, INF);
    const grat = lumpsumGrowth(2500000, 8, 5, INF);
    const gift = lumpsumGrowth(200000, R, 18, 6);
    return (
        <>
            <Section title="One-time investment: amount × years">
                <DataTable
                    caption={`What a single investment becomes at an assumed ${R}% a year`}
                    head={['Invested today', ...spans.map((y) => `${y} years`)]}
                    rows={amounts.map((a) => [amt(a), ...spans.map((y) => amt(lumpsumGrowth(a, R, y, INF).fv))])}
                    note="Compounded once a year, as in the FinCalix app’s lumpsum calculator. Actual fund values move up and down along the way."
                />
            </Section>

            <Section title="How the maturity value is worked out">
                <p>Maturity value = P × (1 + r)<sup>t</sup>, with r the yearly return as a decimal and t the number of years.</p>
                <ol className="steps">
                    <li>P = {inr(P)}, r = {R}% = 0.{R}, t = {Y}.</li>
                    <li>1.{R}<sup>{Y}</sup> = {pow.toFixed(4)} — every rupee becomes about ₹{pow.toFixed(2)}.</li>
                    <li>{inr(P)} × {pow.toFixed(4)} = <strong>{inr(main.fv)}</strong>, a gain of {inr(main.gain)}.</li>
                    <li>After {INF}% inflation the real return is 1.{R} ÷ 1.0{INF} − 1 = {pct(main.realRate * 100)} a year, so the result buys what {inr(main.realValue)} buys today.</li>
                </ol>
            </Section>

            <Section title="Lumpsum or SIP with the same money?">
                <p>
                    Each row puts the same total into the market: once, on day one, or in equal monthly instalments over the same period.
                    With a steady return, the lump sum always ends higher because all of it is invested for the whole time.
                </p>
                <DataTable
                    caption={`Same total, two ways, at ${R}% a year`}
                    head={['Total money', 'Lump sum today', 'Monthly SIP instead', 'Lump sum ends at', 'SIP ends at']}
                    rows={pairs.map((x) => [amt(x.total), amt(x.total), `${inr(x.m)} × ${x.y * 12} months`, amt(x.lump), amt(x.sip)])}
                    note="SIP figures use the app’s calculateSIP; lump-sum figures the lumpsum formula above."
                />
                <p>
                    That gap is not the whole story. Markets don’t rise in a straight line, and a lump sum invested just before a fall takes
                    the full hit, while a SIP keeps buying at lower prices. Most people also don’t have the SIP total in hand on day one — for
                    them the choice doesn’t arise. If you do hold a large sum and worry about timing, a systematic transfer plan feeds it in
                    gradually.
                </p>
            </Section>

            <Section title={`${inr(P)} now, in rupees and in today’s prices`}>
                <DataTable
                    caption={`${inr(P)} at ${R}% with ${INF}% inflation`}
                    head={['Years', 'Value then', 'In today’s prices', 'Lost to inflation']}
                    rows={[5, 10, 15, 20, 25].map((y) => { const g = lumpsumGrowth(P, R, y, INF); return [`${y} years`, inr(g.fv), inr(g.realValue), inr(g.fv - g.realValue)]; })}
                />
            </Section>

            <Section title="Three one-time investments">
                <Scenarios items={[
                    { title: `A ${amt(500000)} bonus for 7 years at 10%`, body: <>Grows to {amt(bonus.fv)}, about {(Math.round(bonus.wealthRatio * 100) / 100).toLocaleString('en-IN')} times the bonus.</> },
                    { title: `${amt(2500000)} at retirement, 8% for 5 years`, body: <>Ends at {amt(grat.fv)}. In today’s prices at {INF}% inflation that is {amt(grat.realValue)} — the real gain is much smaller than the rupee gain.</> },
                    { title: `${amt(200000)} at a child’s birth, left for 18 years`, body: <>At {R}% it becomes {amt(gift.fv)}; with 6% inflation, worth {amt(gift.realValue)} in today’s money when the child turns 18.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Selling equity-fund units: a gain on units held up to 12 months is taxed at 20%; after 12 months, long-term gains above ₹1.25 lakh in a year are taxed at 12.5%. The values above are before tax.', source: ACT },
                { text: 'Mutual fund returns are not guaranteed, and a single investment is exposed to the market from its first day. Read the scheme information document before investing.', source: SEBI },
            ]} />
        </>
    );
}

export const lumpsumPage: FeatureDef = {
    slug: 'lumpsum',
    title: 'Lumpsum Calculator: One-Time Investment Growth',
    description: 'What a one-time mutual fund investment grows to by amount and years, its value after inflation, and lumpsum vs SIP with the same total money.',
    h1: 'Lumpsum calculator: what a one-time investment grows to',
    crumb: 'Lumpsum calculator',
    category: 'investments',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Lumpsum',
    eyebrow: 'Mutual funds · one-time investment',
    answer: (
        <>
            <p>{inr(P)} invested once at an assumed {R}% a year becomes {inr(main.fv)} in {Y} years. Allowing for {INF}% inflation, that buys what {inr(main.realValue)} buys today.</p>
            <p>Put {amt(pairs[0].total)} in at once and it reaches {amt(pairs[0].lump)} in 10 years; the same money as a {inr(5000)} monthly SIP reaches {amt(pairs[0].sip)}. Returns are assumptions, not promises.</p>
        </>
    ),
    sources: [SEBI, ACT],
    calc: { key: 'lumpsum', props: { amount: P, rate: R, years: Y, inflation: INF } },
    Body,
    faqs: [
        { q: 'How is a lumpsum return calculated?', a: `By compounding once a year: value = amount × (1 + r)^years. ${inr(P)} at ${R}% for ${Y} years is ${inr(P)} × ${pow.toFixed(4)} = ${inr(main.fv)}.` },
        { q: 'What will ₹1 lakh become in 10 years?', a: `About ${inr(main.fv)} at an assumed ${R}% a year, or ${inr(lumpsumGrowth(P, 8, Y, INF).fv)} at 8%. At ${INF}% inflation, ${inr(main.fv)} is worth about ${inr(main.realValue)} in today’s money.` },
        { q: 'Is lumpsum better than SIP?', a: `With a steady return, yes: ${amt(pairs[0].total)} invested at once ends at ${amt(pairs[0].lump)} after 10 years against ${amt(pairs[0].sip)} from a ${inr(5000)} SIP. In real markets a lump sum also carries the risk of investing just before a fall, which a SIP spreads out.` },
        { q: 'Should I invest a large amount all at once?', a: 'Only if you can sit through a fall soon after investing. Otherwise park it in a liquid or debt fund and move it in monthly with a systematic transfer plan.' },
        { q: 'Lump sum investment kaise kare?', a: `Poori rakam ek hi baar mein kisi mutual fund mein lagaiye — fund house ki website, app ya distributor ke zariye. 12% saalana maan kar ${inr(P)} 10 saal mein lagbhag ${inr(main.fv)} ho sakta hai. Bazaar girne ka darr ho to STP se dheere-dheere lagaiye.` },
    ],
    related: [
        { href: '/sip', label: 'SIP calculator', note: 'Invest a fixed amount every month' },
        { href: '/stp', label: 'STP calculator', note: 'Move a lump sum into equity in steps' },
        { href: '/cagr', label: 'CAGR calculator', note: 'Yearly growth rate of an investment' },
        { href: '/swp', label: 'SWP calculator', note: 'Monthly income from a lump sum' },
        { href: '/compound-interest', label: 'Compound interest calculator', note: 'Growth with other compounding periods' },
    ],
    disclaimer: 'invest',
};
