/**
 * /property-appreciation — primary query "property appreciation calculator india" (SEO_PLAN.md §5e).
 * Figures: the app's appreciation forecast (math-planning.appreciatedValue / appreciationForecast,
 * copied from src/pages/PropertyCalculator.tsx) and its inflation adjustment (math-planning.todaysMoney,
 * copied from src/pages/FDCalculator.tsx). Index: RBI All-India House Price Index, Q1 2026-27,
 * press release 2026-2027/958 of 24 Aug 2026 (seo/research/verified-facts-planning.md).
 */
import { APPRECIATION_YEARS, appreciatedValue, appreciationForecast, todaysMoney } from '../math-planning';
import { amt, inr, pct } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RBI_HPI = { label: 'RBI: All-India House Price Index for Q1:2026-27 (24 Aug 2026)', url: 'https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=63436' };

/** RBI HPI, Q1 2026-27 (provisional): annual growth 3.6%, index 117.5 (base 2022-23 = 100). */
const HPI_YOY = 3.6, HPI_LEVEL = 117.5, HPI_QOQ = 1.1;

const V = 6000000, R = 6, INF = 5, Y = 10;
const fv = appreciatedValue(V, R, Y);
const real = todaysMoney(fv, INF, Y);
const atHpi = appreciatedValue(V, HPI_YOY, Y);
const atHpiReal = todaysMoney(atHpi, INF, Y);

function Body() {
    const rates = [3, HPI_YOY, 5, 6, 8, 10];
    const prices = [3000000, 5000000, 7500000, 10000000, 20000000];
    const plot = appreciationForecast(2500000, 8);
    const flat = 9000000;
    const flat15 = appreciatedValue(flat, 5, 15);
    return (
        <>
            <Section title="How property appreciation is calculated">
                <p>The app compounds the value once a year at the rate you assume: value after <em>n</em> years = today’s value × (1 + rate)<sup>n</sup>. It is the same arithmetic as a deposit, but the rate is your guess, not a promise.</p>
                <ol className="steps">
                    <li>Start with what the home would sell for today: {amt(V)}.</li>
                    <li>Pick a yearly growth rate. At {R}%, one year multiplies the value by {1 + R / 100}.</li>
                    <li>Repeat for {Y} years: {amt(V)} × {1 + R / 100}<sup>{Y}</sup> = {inr(fv)}.</li>
                    <li>To see what that buys in today’s prices, divide by (1 + inflation)<sup>{Y}</sup>. At {INF}% inflation: {inr(fv)} ÷ {(1 + INF / 100)}<sup>{Y}</sup> = {inr(real)}, so only {inr(real - V)} of the rise is real growth.</li>
                </ol>
            </Section>

            <Section title={`What ${amt(V)} grows to, by rate`}>
                <DataTable
                    caption={`A ${amt(V)} property at different yearly appreciation rates`}
                    head={['Rate a year', ...APPRECIATION_YEARS.map((y) => `After ${y} years`), `${Y} years, today’s money`]}
                    rows={rates.map((r) => [
                        r === HPI_YOY ? `${pct(r, 1)} (RBI HPI, last year)` : pct(r, 1),
                        ...appreciationForecast(V, r).map((p) => inr(p.value)),
                        inr(todaysMoney(appreciatedValue(V, r, Y), INF, Y)),
                    ])}
                    note={`The last column deflates the 10-year value at ${INF}% inflation a year. Below roughly ${INF}% appreciation, the home loses value in real terms.`}
                />
            </Section>

            <Section title={`Value in 10 and 20 years at ${R}%`}>
                <DataTable
                    caption={`Property values at ${R}% a year`}
                    head={['Value today', 'After 10 years', 'After 20 years', 'Rise in 20 years']}
                    rows={prices.map((v) => {
                        const ten = appreciatedValue(v, R, 10), twenty = appreciatedValue(v, R, 20);
                        return [inr(v), inr(ten), inr(twenty), inr(twenty - v)];
                    })}
                />
            </Section>

            <Section title="Nominal value vs real value">
                <p>
                    A rupee figure in 2036 is not comparable with a rupee figure today. At the pace the RBI index showed over the last year
                    ({pct(HPI_YOY, 1)}), {amt(V)} becomes {inr(atHpi)} in {Y} years, which looks like a gain of {inr(atHpi - V)}. In today’s
                    prices, at {INF}% inflation, it is worth {inr(atHpiReal)}: {atHpiReal < V ? 'less than you paid' : 'only a little more than you paid'}.
                    At {R}% a year the real value is {inr(real)}. The gap between the two rates, not the size of the rupee number, decides whether the home built wealth.
                </p>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `Plot of ${amt(2500000)} at 8% a year`, body: <>Worth {inr(plot[0].value)} in 5 years, {inr(plot[1].value)} in 10 and {inr(plot[3].value)} in 20, the same four milestones the app’s forecast shows.</> },
                    { title: `Flat of ${amt(flat)} for 15 years at 5%`, body: <>Grows to {inr(flat15)}. At {INF}% inflation its value in today’s money stays at {inr(todaysMoney(flat15, INF, 15))}: no real gain.</> },
                    { title: 'One year at the index rate', body: <>{amt(V)} rising {pct(HPI_YOY, 1)} in a year is {inr(appreciatedValue(V, HPI_YOY, 1))}, a rise of {inr(appreciatedValue(V, HPI_YOY, 1) - V)}.</> },
                ]} />
            </Section>

            <Section title="What the app adds">
                <p>The property calculator in the FinCalix app forecasts the value 5, 10, 15 and 20 years ahead at your rate, with PDF and Excel export. On the same screen it estimates rental yield, stamp duty and registration by state, the home-loan EMI, and a rent-versus-buy comparison that weighs the down payment and EMIs against investing the difference.</p>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: `RBI’s All-India House Price Index rose ${pct(HPI_YOY, 1)} year on year in Q1 2026-27 (April–June 2026), the same rate as a year earlier, and ${pct(HPI_QOQ, 1)} over the previous quarter, to ${HPI_LEVEL}. The figures are provisional.`, source: RBI_HPI },
                { text: 'The index uses transaction-level data from property registration authorities in eighteen major cities, with 2022-23 as the base year. It is an average across cities; your locality can move very differently.', source: RBI_HPI },
                { text: 'Appreciation in this calculator is an assumption you set. It is not a forecast by RBI or by FinCalix.' },
            ]} />
        </>
    );
}

export const propertyAppreciation: FeatureDef = {
    slug: 'property-appreciation',
    title: 'Property Appreciation Calculator India: Future Value',
    description: 'What your house or plot could be worth in 5, 10, 15 or 20 years at an assumed growth rate, in rupees and today’s money, with RBI’s house price index.',
    h1: 'Property appreciation calculator: what your home could be worth',
    crumb: 'Property appreciation',
    category: 'utilities',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Property Appreciation',
    eyebrow: 'Real estate · RBI HPI Q1 2026-27',
    answer: (
        <>
            <p>A {amt(V)} home that appreciates {R}% a year would be worth {inr(fv)} in {Y} years; at {INF}% inflation that is {inr(real)} in today’s money.</p>
            <p>For a reference rate, RBI’s All-India House Price Index rose {pct(HPI_YOY, 1)} in the year to April–June 2026 (released 24 August 2026). At that pace the same home reaches {inr(atHpi)} in {Y} years.</p>
        </>
    ),
    sources: [RBI_HPI],
    calc: { key: 'property-appreciation', props: { value: V, rate: R, years: Y, inflation: INF } },
    Body,
    faqs: [
        { q: 'How much will my house be worth in 10 years?', a: `It depends on the yearly rate you assume: at ${R}% a ${amt(V)} house becomes ${inr(fv)}, at ${pct(HPI_YOY, 1)} (RBI's index over the last year) ${inr(atHpi)}. Formula: value × (1 + rate)^years.` },
        { q: 'How do you calculate property appreciation?', a: `Multiply today’s value by (1 + yearly rate) once for every year. ${amt(V)} at ${R}% for ${Y} years: ${amt(V)} × ${1 + R / 100}^${Y} = ${inr(fv)}.` },
        { q: 'What is the property appreciation rate in India right now?', a: `RBI’s All-India House Price Index rose ${pct(HPI_YOY, 1)} in the year to Q1 2026-27, across 18 cities. Individual cities and localities differ, so use a rate that fits your area.` },
        { q: 'Does property beat inflation?', a: `Only if it appreciates faster than prices in general. At ${pct(HPI_YOY, 1)} a year against ${INF}% inflation, ${amt(V)} is worth ${inr(atHpiReal)} in today’s money after ${Y} years, less than today.` },
        { q: 'Is appreciation the same as the return on a property?', a: 'No. Your return also counts rent received, and subtracts stamp duty, registration, brokerage, maintenance, property tax and loan interest. The app’s rent-versus-buy tool weighs these.' },
    ],
    related: [
        { href: '/home-loan', label: 'Home loan EMI calculator', note: 'What the purchase costs each month' },
        { href: '/capital-gains', label: 'Capital gains calculator', note: 'Tax when you sell the property' },
        { href: '/home-loan-prepayment', label: 'Home loan prepayment calculator', note: 'Interest saved by paying early' },
        { href: '/compound-interest', label: 'Compound interest calculator', note: 'The same growth maths for savings' },
    ],
    disclaimer: { text: 'Property values are projections at the rate you assume, compounded yearly. They are not valuations or price forecasts. Actual prices depend on location, condition, demand and costs of sale. The RBI index is an average across 18 cities. FinCalix is not a property advisor or valuer.' },
};
