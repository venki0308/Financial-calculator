/**
 * /swp — primary query "swp calculator" (SEO_PLAN.md §5b). Replaces public/swp.
 * Every figure: src/pages/SWPCalculator.tsx's core loop, longevity search, max sustainable
 * withdrawal and real-value line (math-invest.swpPlan). Corpus for a target withdrawal scales the
 * app's max-sustainable figure (linear in the corpus). Tax: Income-tax Act, 2025 ss.72, 76, 196,
 * 198 (seo/research/verified-facts-invest.md).
 */
import { swpPlan } from '../math-invest';
import { yearsMonths } from '../derive';
import { amt, inr, pct } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025 (ss. 72, 76, 196, 198)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const SEBI = { label: 'SEBI investor portal', url: 'https://investor.sebi.gov.in/' };

const C = 5000000, W = 40000, R = 8, Y = 20, INF = 5;
const main = swpPlan(C, W, R, Y, INF);
const lastsText = (corpus: number, w: number, rate: number) => {
    const s = swpPlan(corpus, w, rate, 1, INF);
    return s.perpetual ? 'Does not run out' : s.longevityMonths === null ? '100+ years' : yearsMonths(s.longevityMonths);
};
const mainLasts = lastsText(C, W, R);
const at30k = swpPlan(C, 30000, R, Y, INF);
/** Corpus that pays `w` a month for `years` (the app's max-sustainable withdrawal scaled to the target). */
const corpusFor = (w: number, rate: number, years: number) => {
    const per = swpPlan(10000000, w, rate, years, INF).maxSustainableWithdrawal / 10000000;
    return Math.ceil(w / per / 100000) * 100000;
};
const tenL = swpPlan(1000000, 10000, R, 10, INF);

function Body() {
    const corpora = [1000000, 2500000, 5000000, 10000000];
    const draws = [20000, 40000, 60000, 100000];
    const first12 = main.monthly.slice(0, 12);
    const yr1 = main.yearlySchedule[0];
    return (
        <>
            <Section title={`Month by month: ${amt(C)}, ${inr(W)} a month, ${R}% a year`}>
                <DataTable
                    caption="The first 12 months of the withdrawal plan"
                    head={['Month', 'Balance at start', 'Return added', 'Withdrawn', 'Balance at end']}
                    rows={first12.map((m) => [String(m.month), inr(m.open), inr(m.interest), inr(m.withdrawn), inr(m.close)])}
                    note={`Each month the balance earns ${R}% ÷ 12, then the withdrawal is paid — the order the FinCalix app’s SWP calculator uses.`}
                />
                <p>
                    In the first year {inr(yr1.withdrawn)} goes out and {inr(yr1.interest)} of return comes in, so the balance slips by
                    {' '}{inr(yr1.open - yr1.close)}. The fall speeds up each year because a smaller balance earns less, and at this rate the money
                    lasts {mainLasts}.
                </p>
            </Section>

            <Section title="How long a corpus lasts">
                <DataTable
                    caption={`Time until the money runs out at an assumed ${R}% a year`}
                    head={['Corpus', ...draws.map((d) => `${inr(d)} a month`)]}
                    rows={corpora.map((c) => [amt(c), ...draws.map((d) => lastsText(c, d, R))])}
                    note="“Does not run out” means one month’s return is at least the withdrawal, so the balance never falls — in rupees. Its buying power still shrinks with inflation."
                />
            </Section>

            <Section title="Corpus needed for a monthly income">
                <DataTable
                    caption="Corpus that pays a fixed amount every month until it reaches zero"
                    head={['Monthly withdrawal', '15 years at 8%', '20 years at 8%', '25 years at 8%', '25 years at 7%']}
                    rows={[25000, 50000, 100000].map((w) => [inr(w), amt(corpusFor(w, 8, 15)), amt(corpusFor(w, 8, 20)), amt(corpusFor(w, 8, 25)), amt(corpusFor(w, 7, 25))])}
                    note="From the app’s “most you can take for exactly N years” figure, rounded up to the next ₹1 lakh."
                />
            </Section>

            <Section title="How the SWP is calculated">
                <ol className="steps">
                    <li>Monthly return = {R}% ÷ 12 = {pct(R / 12, 4)}. On {inr(C)} the first month adds {inr(main.monthly[0].interest)}.</li>
                    <li>The {inr(W)} withdrawal is paid from the new balance: {inr(C)} + {inr(main.monthly[0].interest)} − {inr(W)} = {inr(main.monthly[0].close)}.</li>
                    <li>Repeat. Once a withdrawal is bigger than what is left, the last payment is the remainder and the plan ends.</li>
                    <li>Over {Y} years the largest steady withdrawal that ends exactly at zero is {inr(main.maxSustainableWithdrawal)} a month (annuity formula: corpus × i ÷ [1 − (1 + i)<sup>−n</sup>]).</li>
                </ol>
            </Section>

            <Section title="Inflation and a fixed withdrawal">
                <p>
                    An SWP pays the same rupee amount every month, but prices keep rising. At {INF}% inflation a year, the {inr(W)} you
                    receive in year {Y} buys what {inr(main.realWithdrawalValueAtEnd)} buys today — the figure the app shows under the
                    results. Plan to raise the withdrawal over time, and test a higher amount in the calculator to see how much sooner the
                    corpus would run down.
                </p>
                <DataTable
                    caption={`What a fixed ${inr(W)} a month is worth in today’s money`}
                    head={['After', 'At 4% inflation', 'At 5% inflation', 'At 6% inflation']}
                    rows={[5, 10, 20, 30].map((y) => [`${y} years`, ...[4, 5, 6].map((i) => inr(swpPlan(C, W, R, y, i).realWithdrawalValueAtEnd))])}
                />
            </Section>

            <Section title="Four withdrawal plans">
                <Scenarios items={[
                    { title: `${amt(C)} paying ${inr(30000)} a month`, body: <>At {R}% the first month earns more than {inr(30000)}, so the balance grows: after {Y} years {amt(at30k.finalBalance)} is still there.</> },
                    { title: `${amt(1000000)} paying ${inr(10000)} a month`, body: <>Lasts {lastsText(1000000, 10000, R)} at {R}%; after 10 years {inr(tenL.finalBalance)} remains. To last exactly 10 years the payout could be {inr(tenL.maxSustainableWithdrawal)}.</> },
                    { title: `₹1 lakh a month from ${amt(10000000)}`, body: <>Runs out in {lastsText(10000000, 100000, R)} at {R}%. For 25 years the corpus would need to be about {amt(corpusFor(100000, R, 25))}.</> },
                    { title: 'A lower return', body: <>The same {amt(C)} paying {inr(W)} lasts {lastsText(C, W, 6)} at 6% instead of {mainLasts} at {R}%.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Each SWP payment redeems units. Only the gain inside the redeemed units is a capital gain (sale value minus cost), not the whole payment.', source: ACT },
                { text: 'Equity-fund units: gains within 12 months taxed at 20%; after 12 months, 12.5% on long-term gains over ₹1.25 lakh a year.', source: ACT },
                { text: 'Units of a fund with more than 65% in debt, bought on or after 1 April 2023, give short-term gains whatever the holding period (section 76), taxed with your other income.', source: ACT },
                { text: 'The return you enter is an assumption; a fund’s value can fall while you are withdrawing from it.', source: SEBI },
            ]} />
        </>
    );
}

export const swpPage: FeatureDef = {
    slug: 'swp',
    title: 'SWP Calculator: Monthly Withdrawal and How Long It Lasts',
    description: 'Monthly SWP withdrawals from a mutual fund corpus: month-by-month schedule, how long the money lasts, corpus for ₹1 lakh a month and inflation.',
    h1: 'SWP calculator: how long your corpus will last',
    crumb: 'SWP calculator',
    category: 'investments',
    updated: '2026-11-17',
    analyticsTitle: 'Website - SWP',
    eyebrow: 'Systematic withdrawal plan · monthly income',
    answer: (
        <>
            <p>Withdrawing {inr(W)} a month from {amt(C)} that earns an assumed {R}% a year lasts {mainLasts}. To make the money last exactly {Y} years, the most you can take is {inr(main.maxSustainableWithdrawal)} a month.</p>
            <p>Each payment sells fund units, so only the gain inside it is taxed, under the Income-tax Act, 2025.</p>
        </>
    ),
    sources: [ACT, SEBI],
    calc: { key: 'swp', props: { corpus: C, withdrawal: W, rate: R, years: Y, inflation: INF } },
    Body,
    faqs: [
        { q: 'What is an SWP?', a: 'A systematic withdrawal plan pays you a fixed amount from a mutual fund at regular intervals by selling units; the rest stays invested and keeps earning.' },
        { q: 'How long will ₹50 lakh last with ₹40,000 a month?', a: `About ${mainLasts} at an assumed ${R}% a year, ${lastsText(C, W, 6)} at 6%. At ${inr(30000)} a month and ${R}% it does not run out in rupees.` },
        { q: 'How much corpus do I need for ₹1 lakh a month?', a: `About ${amt(corpusFor(100000, R, 25))} to draw ₹1 lakh a month for 25 years at an assumed ${R}%, or ${amt(corpusFor(100000, R, 20))} for 20 years. The amount stays fixed, so its buying power falls over time.` },
        { q: 'What SWP can ₹10 lakh give?', a: `About ${inr(tenL.maxSustainableWithdrawal)} a month for 10 years at ${R}%. A ${inr(10000)} monthly SWP lasts ${lastsText(1000000, 10000, R)}.` },
        { q: 'Is SWP income taxable?', a: 'Only the gain part. Each withdrawal is a sale of units, and capital gains tax applies to the gain in the units sold — at equity or debt-fund rates depending on the fund and how long you held the units.' },
        { q: 'SWP plan kaise kare?', a: `Pehle ek mutual fund mein corpus lagaiye, phir fund house ya platform par SWP form bharkar har mahine ki rakam aur tareekh chuniye. ${R}% maan kar ${amt(C)} se ${inr(W)} mahina lagbhag ${mainLasts} tak milega; ${inr(30000)} rakhein to paisa khatam nahi hota.` },
    ],
    related: [
        { href: '/lumpsum', label: 'Lumpsum calculator', note: 'How a corpus grows before withdrawals' },
        { href: '/stp', label: 'STP calculator', note: 'Move money between funds in steps' },
        { href: '/scss', label: 'SCSS calculator', note: 'Government scheme with quarterly interest' },
        { href: '/post-office-mis', label: 'Post Office MIS calculator', note: 'Fixed monthly interest from the Post Office' },
        { href: '/nps', label: 'NPS calculator', note: 'Pension corpus for retirement' },
    ],
    disclaimer: 'invest',
};
