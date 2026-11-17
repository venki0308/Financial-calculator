/**
 * /cagr — primary query "cagr calculator" (SEO_PLAN.md §5b). Replaces public/cagr.
 * CAGR, absolute return, rule-of-72 and the year-by-year path: src/pages/CAGRCalculator.tsx
 * (math-invest.cagrResult). SIP example: the app's calculateSIP. XIRR is explained, not computed
 * (the app has no XIRR function). PPF rate: SMALL_SAVINGS (DEA, verified-facts-2026-11-17.md).
 */
import { calculateSIP } from '../../../utils/calculations';
import { SMALL_SAVINGS } from '../../../data/rateEnvironment';
import { cagrResult } from '../math-invest';
import { amt, inr, pct } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const SEBI = { label: 'SEBI investor site', url: 'https://investor.sebi.gov.in/' };
const DEA = { label: 'DEA small savings rates', url: 'http://www.dea.gov.in/budget-division/475' };

const S = 250000, E = 410000, Y = 4;
const main = cagrResult(S, E, Y);
const ratio = E / S;
const root = Math.pow(ratio, 1 / Y);
const sip = calculateSIP(5000, 12, 10);
const sipNaive = cagrResult(sip.invested, sip.futureValue, 10);
const PPF = SMALL_SAVINGS.rates.ppf;

function Body() {
    const mults = [1.5, 2, 3, 4];
    const spans = [3, 5, 7, 10, 15];
    const loss = cagrResult(500000, 450000, 3);
    const fast = cagrResult(100000, 300000, 3);
    const slow = cagrResult(100000, 300000, 10);
    const flat = cagrResult(200000, 350000, 3);
    return (
        <>
            <Section title="The CAGR formula, worked through">
                <p>CAGR = (end value ÷ start value)<sup>1 ÷ years</sup> − 1.</p>
                <ol className="steps">
                    <li>End ÷ start: {inr(E)} ÷ {inr(S)} = {ratio.toFixed(2)}.</li>
                    <li>Take the {Y}th root (raise to the power 1/{Y}): {ratio.toFixed(2)}<sup>{1 / Y}</sup> = {root.toFixed(4)}.</li>
                    <li>Subtract 1: {root.toFixed(4)} − 1 = {(root - 1).toFixed(4)}, or <strong>{pct(main.cagr)}</strong> a year.</li>
                    <li>Check: {inr(S)} growing {pct(main.cagr)} every year reaches {inr(main.schedule[main.schedule.length - 1].value)} after {Y} years.</li>
                </ol>
                <DataTable
                    caption={`The smooth path CAGR assumes: ${inr(S)} at ${pct(main.cagr)} a year`}
                    head={['End of year', 'Value']}
                    rows={main.schedule.map((s) => [String(s.year), inr(s.value)])}
                    note="The real investment may have jumped and dipped in between; CAGR replaces that path with one steady rate."
                />
            </Section>

            <Section title="CAGR when money multiplies">
                <DataTable
                    caption="Yearly growth rate needed to multiply money in a given number of years"
                    head={['Money becomes', ...spans.map((y) => `in ${y} years`)]}
                    rows={mults.map((m) => [`${m}×`, ...spans.map((y) => pct(cagrResult(100000, 100000 * m, y).cagr))])}
                    note="Computed with the FinCalix app’s CAGR formula. 2× is “doubling”; 3× is “tripling”."
                />
            </Section>

            <Section title="CAGR, absolute return and XIRR">
                <DataTable
                    caption="Three ways to state a return"
                    head={['Measure', 'What it tells you', 'Best for']}
                    rows={[
                        ['Absolute return', `Total gain as a % of the start, with no time in it: ${inr(S)} → ${inr(E)} is ${pct(main.absReturn)}`, 'Holding periods under a year'],
                        ['CAGR', `The steady yearly rate that links start to end: ${pct(main.cagr)} a year here`, 'One amount in, one amount out'],
                        ['XIRR', 'The yearly rate that fits every dated payment in and out', 'SIPs, top-ups, part-withdrawals'],
                    ]}
                />
                <p>
                    Why CAGR misleads for a SIP: {inr(5000)} a month for 10 years at an assumed 12% a year ends at {inr(sip.futureValue)} on
                    {' '}{inr(sip.invested)} paid in. Plug those two totals into the CAGR formula and you get {pct(sipNaive.cagr)} — far below
                    the 12% a year (1% a month) every instalment was grown at, because most instalments were invested for much less than 10 years. XIRR solves for the
                    one rate that, applied to each instalment from its own date, produces the final value; spreadsheet programs have an
                    XIRR function for this. Use CAGR only when there was a single investment and nothing added or taken out.
                </p>
            </Section>

            <Section title="Four results, read correctly">
                <Scenarios items={[
                    { title: `${inr(500000)} fell to ${inr(450000)} in 3 years`, body: <>CAGR {pct(loss.cagr)} a year; absolute return {pct(loss.absReturn)}. A negative CAGR means the investment shrank on average every year.</> },
                    { title: 'Tripled in 3 years vs in 10 years', body: <>Both show an absolute return of {pct(fast.absReturn)}, but the CAGR is {pct(fast.cagr)} for 3 years and {pct(slow.cagr)} for 10. Absolute return hides time; CAGR doesn’t.</> },
                    { title: `${inr(200000)} to ${inr(350000)} in 3 years`, body: <>{pct(flat.cagr)} a year. By the rule of 72 the app also shows, money growing at that rate doubles in about {(Math.round(flat.doubleTime * 10) / 10).toLocaleString('en-IN')} years.</> },
                    { title: 'Compare with a fixed rate', body: <>The PPF pays {PPF}% a year (Oct–Dec 2026). An investment with a {pct(main.cagr)} CAGR beat that over these {Y} years, but with risk the PPF does not carry, and past CAGR says nothing certain about the next {Y} years.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'A past CAGR is a description of what happened, not a promise. Mutual fund and share returns are not guaranteed.', source: SEBI },
                { text: `PPF interest ${PPF}% a year for October–December 2026, set by the Government each quarter.`, source: DEA },
            ]} />
        </>
    );
}

export const cagrPage: FeatureDef = {
    slug: 'cagr',
    title: 'CAGR Calculator: Compound Annual Growth Rate Formula',
    description: 'Work out CAGR from a start value, end value and years, with the formula step by step, a doubling/tripling table, and CAGR vs absolute return vs XIRR.',
    h1: 'CAGR calculator: your investment’s yearly growth rate',
    crumb: 'CAGR calculator',
    category: 'investments',
    updated: '2026-11-17',
    analyticsTitle: 'Website - CAGR',
    eyebrow: 'Returns · compound annual growth rate',
    answer: (
        <>
            <p>An investment that grew from {inr(S)} to {inr(E)} in {Y} years has a CAGR of {pct(main.cagr)} a year — the single steady rate that turns the first figure into the second. Its absolute return is {pct(main.absReturn)}.</p>
            <p>CAGR = (end ÷ start)<sup>1/years</sup> − 1. For a SIP or any investment with money added over time, use XIRR instead.</p>
        </>
    ),
    sources: [SEBI, DEA],
    calc: { key: 'cagr', props: { start: S, end: E, years: Y } },
    Body,
    faqs: [
        { q: 'What is the CAGR formula?', a: `CAGR = (end value ÷ start value)^(1 ÷ years) − 1. For ${inr(S)} to ${inr(E)} in ${Y} years: ${ratio.toFixed(2)}^(1/${Y}) − 1 = ${pct(main.cagr)}.` },
        { q: 'How do I calculate CAGR for 3 or 5 years?', a: `Use the same formula with 3 or 5 as the years. Money that doubles in 3 years has a CAGR of ${pct(cagrResult(100000, 200000, 3).cagr)}; doubling in 5 years is ${pct(cagrResult(100000, 200000, 5).cagr)}.` },
        { q: 'What is the difference between CAGR and absolute return?', a: `Absolute return ignores time; CAGR spreads the gain over the years. Tripling your money is a ${pct(200)} absolute return whether it takes 3 years (${pct(cagrResult(100000, 300000, 3).cagr)} CAGR) or 10 (${pct(cagrResult(100000, 300000, 10).cagr)}).` },
        { q: 'CAGR or XIRR — which should I use?', a: `CAGR for a single investment; XIRR when money went in or came out on different dates, as with a SIP. Totals from a 10-year ${inr(5000)} SIP give a misleading CAGR of ${pct(sipNaive.cagr)} although every instalment was grown at the assumed 12% a year.` },
        { q: 'Can CAGR be negative?', a: `Yes, when the end value is below the start. ${inr(500000)} falling to ${inr(450000)} over 3 years is a CAGR of ${pct(cagrResult(500000, 450000, 3).cagr)}.` },
        { q: 'CAGR kaise calculate karte hain?', a: `Aakhri value ko shuruaati value se bhaag dijiye, us par 1/saal ki power lagaiye aur 1 ghata dijiye. Jaise ${inr(S)} se ${inr(E)} ${Y} saal mein: (${ratio.toFixed(2)})^(1/${Y}) − 1 = ${pct(main.cagr)} saalana.` },
    ],
    related: [
        { href: '/lumpsum', label: 'Lumpsum calculator', note: 'Project a value from an assumed CAGR' },
        { href: '/sip', label: 'SIP calculator', note: 'Monthly investing, where XIRR applies' },
        { href: '/compound-interest', label: 'Compound interest calculator', note: 'Growth at a fixed compounding rate' },
        { href: '/property-appreciation', label: 'Property appreciation calculator', note: 'Yearly growth of a home’s price' },
        { href: '/portfolio-rebalancing', label: 'Portfolio rebalancing calculator', note: 'Keep your asset mix on target' },
    ],
    disclaimer: 'invest',
};
