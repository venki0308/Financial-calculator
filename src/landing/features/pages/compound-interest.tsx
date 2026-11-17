/**
 * /compound-interest — primary query "compound interest calculator" (SEO_PLAN.md §5b).
 * Figures: the app's calculateCompoundInterest (src/utils/calculations.ts) and, for the simple
 * comparison, simpleInterest (features/math-credit.ts, copied from SimpleInterestCalculator.tsx).
 * Rules: RBI deposit Directions 2025; Post Office TD rate and quarterly compounding
 * (seo/research/verified-facts-2026-11-17.md and verified-facts-credit.md).
 */
import { calculateCompoundInterest } from '../../../utils/calculations';
import { SMALL_SAVINGS } from '../../../data/rateEnvironment';
import { simpleInterest } from '../math-credit';
import { amt, inr, pct } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RBI_DEP = { label: 'RBI Interest Rate on Deposits Directions, 2025 (paras 9, 18)', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13157' };
const NSTD = { label: 'National Savings Time Deposit Scheme, 2019', url: 'https://www.indiapost.gov.in/documents/offerings/schemesandservices/posb/NationalSavingsTimeDepositScheme2019English.pdf' };
const NSI = { label: 'NSI: small savings interest rates', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=132' };

const P = 100000, R = 8, Y = 5;
const q = calculateCompoundInterest(P, R, Y, 4);
const simple5 = simpleInterest(P, R, Y * 12);
/** Post Office 1-year TD, Oct–Dec 2026 rate. */
const TD = SMALL_SAVINGS.rates, TD1 = TD.td1y;
const td = calculateCompoundInterest(P, TD1, 1, 4);
/** Effective yearly rate for `n` compoundings a year: interest on ₹100 for one year. */
const eff = (rate: number, n: number) => calculateCompoundInterest(100, rate, 1, n).interest;
/** Whole years for money to double with yearly compounding. */
const doubleIn = (rate: number) => { let y = 1; while (calculateCompoundInterest(1, rate, y, 1).amount < 2) y++; return y; };

const FREQS: Array<[string, number]> = [['Yearly', 1], ['Half-yearly', 2], ['Quarterly', 4], ['Monthly', 12], ['Daily', 365]];

function Body() {
    const years = [1, 3, 5, 10, 15, 20];
    const rates = [6, 7, 8, 9, 10, 12];
    const long = calculateCompoundInterest(10000, 12, 30, 1);
    const three = calculateCompoundInterest(500000, 7.5, 3, 4);
    return (
        <>
            <Section title="How often interest is added changes what you earn">
                <DataTable
                    caption={`${amt(P)} at ${R}% a year for ${Y} years`}
                    head={['Interest added', 'Maturity amount', 'Interest earned', 'Effective yearly rate']}
                    rows={FREQS.map(([label, n]) => { const r = calculateCompoundInterest(P, R, Y, n); return [label, inr(r.amount), inr(r.interest), pct(eff(R, n))]; })}
                    note="The more often interest is added, the sooner it starts earning interest itself. The gain from monthly to daily is small; from yearly to quarterly it is larger."
                />
            </Section>

            <Section title="Simple vs compound interest over the years">
                <DataTable
                    caption={`${amt(P)} at ${R}% a year`}
                    head={['After', 'Simple interest', 'Compounded yearly', 'Compounded quarterly']}
                    rows={years.map((y) => [
                        `${y} year${y === 1 ? '' : 's'}`,
                        inr(simpleInterest(P, R, y * 12).totalInterest),
                        inr(calculateCompoundInterest(P, R, y, 1).interest),
                        inr(calculateCompoundInterest(P, R, y, 4).interest),
                    ])}
                    note="In the first year yearly compounding and simple interest are the same; after that the gap widens every year."
                />
            </Section>

            <Section title="The compound interest formula, worked through">
                <ol className="steps">
                    <li>Formula: A = P × (1 + r ÷ n)<sup>n × t</sup>, where P is the principal, r the yearly rate as a decimal, n the number of times interest is added each year and t the years.</li>
                    <li>For {inr(P)} at {R}% compounded quarterly for {Y} years: r ÷ n = 0.08 ÷ 4 = 0.02, and n × t = 4 × {Y} = {4 * Y} quarters.</li>
                    <li>A = {inr(P)} × 1.02<sup>{4 * Y}</sup> = {inr(q.amount)}.</li>
                    <li>Compound interest = A − P = {inr(q.interest)}, compared with {inr(simple5.totalInterest)} of simple interest over the same {Y} years.</li>
                </ol>
            </Section>

            <Section title="How long money takes to double">
                <DataTable
                    caption="Whole years for a sum to at least double, interest added yearly"
                    head={['Rate a year', 'Years to double']}
                    rows={rates.map((r) => [`${r}%`, String(doubleIn(r))])}
                    note="The old “rule of 72” (72 ÷ rate) gives a quick estimate close to these figures."
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `Post Office 1-year time deposit at ${TD1}%`, body: <>Interest is compounded every quarter, so {amt(P)} earns {inr(td.interest)} in the year — slightly more than {TD1}% of the deposit.</> },
                    { title: `${amt(500000)} at 7.5% compounded quarterly for 3 years`, body: <>It grows to {inr(three.amount)}: {inr(three.interest)} of interest, if it is all left to compound.</> },
                    { title: `${inr(10000)} left for 30 years at 12% a year`, body: <>Compounded yearly it becomes {inr(long.amount)} — about {Math.round(long.amount / 10000)} times the start, though 30 years of simple interest would add only {inr(simpleInterest(10000, 12, 360).totalInterest)}.</> },
                    { title: 'A savings account', body: <>Banks work out savings interest on each day’s closing balance and credit it at least every quarter, so credited interest starts earning too.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Savings account interest is calculated on a daily product basis (each day’s closing balance) and credited at quarterly or shorter intervals.', source: RBI_DEP },
                { text: 'A Post Office Time Deposit earns interest compounded quarterly, paid out every year; interest left unwithdrawn earns no further interest.', source: NSTD },
                { text: `Post Office TD rates for October–December 2026: 1 year ${TD1}%, 2 years ${TD.td2y}%, 3 years ${TD.td3y}%, 5 years ${TD.td5y}%.`, source: NSI },
            ]} />
        </>
    );
}

export const compoundInterest: FeatureDef = {
    slug: 'compound-interest',
    title: 'Compound Interest Calculator with Formula and Tables',
    description: 'Compound interest with yearly, quarterly, monthly or daily compounding, the formula worked step by step, simple vs compound tables and doubling time.',
    h1: 'Compound interest calculator: formula, frequency and growth tables',
    crumb: 'Compound interest',
    category: 'investments',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Compound Interest',
    eyebrow: 'Interest · chakravridhi byaj',
    answer: (
        <>
            <p>{amt(P)} at {R}% a year compounded quarterly grows to {inr(q.amount)} in {Y} years — {inr(q.interest)} of interest, against {inr(simple5.totalInterest)} with simple interest. The formula is A = P × (1 + r/n)<sup>n×t</sup>.</p>
            <p>A Post Office 1-year time deposit at {TD1}% (October–December 2026) compounds every quarter, so {amt(P)} earns {inr(td.interest)} in the year.</p>
        </>
    ),
    sources: [NSTD, NSI, RBI_DEP],
    calc: { key: 'compound-interest', props: { principal: P, rate: R, years: Y, freq: '4' } },
    Body,
    faqs: [
        { q: 'What is the compound interest formula?', a: `A = P × (1 + r/n)^(n × t); compound interest = A − P. For ${inr(P)} at ${R}% compounded quarterly for ${Y} years, A = ${inr(q.amount)} and the interest is ${inr(q.interest)}.` },
        { q: `How much is compound interest on 1 lakh?`, a: `At ${R}% a year for ${Y} years, ${inr(calculateCompoundInterest(P, R, Y, 1).interest)} if interest is added yearly, ${inr(q.interest)} quarterly and ${inr(calculateCompoundInterest(P, R, Y, 12).interest)} monthly.` },
        { q: 'Is quarterly or monthly compounding better?', a: `Monthly earns a little more: ${R}% compounded monthly is an effective ${pct(eff(R, 12))} a year against ${pct(eff(R, 4))} quarterly. The difference is small next to the rate itself.` },
        { q: 'How long does money take to double with compound interest?', a: `At 8% a year compounded yearly, ${doubleIn(8)} years; at 12%, ${doubleIn(12)} years. Dividing 72 by the rate gives a quick estimate.` },
        { q: 'Why does compound interest grow faster than simple interest?', a: `Because interest already earned is added to the balance and earns interest too. ${amt(P)} at ${R}% earns ${inr(simpleInterest(P, R, 240).totalInterest)} simple over 20 years, but ${inr(calculateCompoundInterest(P, R, 20, 1).interest)} compounded yearly.` },
        { q: 'Chakravridhi byaj kaise nikale?', a: `Mool × (1 + dar ÷ 100 ÷ n)^(n × saal) se kul rakam nikalti hai; usme se mool ghatayein to chakravridhi byaj milta hai. ₹1 lakh par 8% saalana, har teen mahine jodne par, 5 saal mein byaj ${inr(q.interest)} hota hai.` },
    ],
    related: [
        { href: '/simple-interest', label: 'Simple interest (byaj) calculator', note: 'Interest on the original sum only' },
        { href: '/fd', label: 'FD calculator', note: 'Bank deposits with quarterly compounding' },
        { href: '/post-office-td', label: 'Post Office TD calculator', note: 'Yearly payouts at government rates' },
        { href: '/lumpsum', label: 'Lumpsum calculator', note: 'One-time investment at an assumed return' },
        { href: '/cagr', label: 'CAGR calculator', note: 'The yearly rate behind a growth figure' },
    ],
    disclaimer: { text: 'Figures use the compound interest formula of the FinCalix app on the rate and period you enter, before tax. Deposit rates are set by your bank or, for Post Office schemes, by the Government each quarter; investment returns are not guaranteed. FinCalix is not a bank or investment adviser.' },
};
