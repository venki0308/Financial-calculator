/**
 * /step-up-sip — primary query "step up sip calculator" (SEO_PLAN.md §5b).
 * Corpus: the app's step-up SIP formula (features/math.stepUpSip, copied from SIPCalculator.tsx);
 * flat SIP: the app's calculateSIP; "flat SIP that matches": the app's goal-SIP formula.
 */
import { calculateSIP } from '../../../utils/calculations';
import { goalSip, stepUpSip } from '../math';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025 (section 198)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const SEBI = { label: 'SEBI investor education', url: 'https://investor.sebi.gov.in/' };

const S = 10000, STEP = 10, R = 12, Y = 15;
const main = stepUpSip(S, STEP, R, Y);
const flat = calculateSIP(S, R, Y);
const extraPct = Math.round(((main.futureValue - flat.futureValue) / flat.futureValue) * 100);
const matchFlat = goalSip(main.futureValue, Y, R).monthlyNeeded;

function Body() {
    const tenures = [10, 15, 20, 25];
    const steps = [0, 5, 10, 15];
    const a = stepUpSip(5000, 10, 12, 20);
    const b = stepUpSip(20000, 5, 12, 10);
    const c = stepUpSip(3000, 15, 12, 25);
    return (
        <>
            <Section title="Step-up vs flat SIP, side by side">
                <DataTable
                    caption={`Corpus from a ${inr(S)} monthly SIP at an assumed ${R}% a year`}
                    head={['Years', 'Flat (no step-up)', '5% step-up', '10% step-up', '15% step-up']}
                    rows={tenures.map((y) => [`${y} years`, ...steps.map((st) => amt(stepUpSip(S, st, R, y).futureValue))])}
                    note="The monthly SIP rises once a year by the step-up percentage — the same maths as the step-up SIP in the FinCalix app."
                />
                <p>
                    A step-up adds most over long periods, because the larger later instalments still get years to grow. Over {Y} years,
                    a {STEP}% step-up turns {inr(S)} a month into {amt(main.futureValue)} — {extraPct}% more than the {amt(flat.futureValue)} a
                    flat SIP reaches — but you also invest more: {amt(main.invested)} against {amt(flat.invested)}.
                </p>
            </Section>

            <Section title={`Year by year: ${inr(S)} a month, raised ${STEP}% every year`}>
                <DataTable
                    caption={`Step-up SIP at ${R}%: monthly amount, total invested and value at each year end`}
                    head={['Year', 'Monthly SIP', 'Invested so far', 'Value at year end']}
                    rows={main.yearly.map((r) => [String(r.year), inr(r.monthly), amt(r.invested), amt(r.value)])}
                />
            </Section>

            <Section title="How a step-up SIP is calculated">
                <ol className="steps">
                    <li>Each month, add the SIP to the balance and grow the balance by one month’s return (yearly return ÷ 12).</li>
                    <li>After every 12 instalments, raise the monthly SIP by the step-up percentage: {inr(S)} becomes {inr(S * 1.1)} in year 2 at {STEP}%.</li>
                    <li>Repeat until the last year. Your corpus is the balance at the end; the gain is the corpus minus everything you put in.</li>
                </ol>
                <p>To match the step-up corpus of {amt(main.futureValue)} with a flat SIP, you would need {inr(matchFlat)} a month from day one.</p>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `${inr(5000)} a month for 20 years, raised 10% a year`, body: <>Grows to {amt(a.futureValue)} at 12%; you invest {amt(a.invested)}, and the monthly SIP reaches {inr(a.yearly[a.yearly.length - 1].monthly)} in the last year.</> },
                    { title: `${inr(20000)} a month for 10 years, raised 5% a year`, body: <>Grows to {amt(b.futureValue)} against {amt(calculateSIP(20000, 12, 10).futureValue)} without the step-up.</> },
                    { title: `${inr(3000)} a month for 25 years, raised 15% a year`, body: <>A small start with an aggressive step-up reaches {amt(c.futureValue)}; the monthly SIP ends at {inr(c.yearly[c.yearly.length - 1].monthly)}, so check the later amounts are affordable.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Gains on equity mutual fund units held for more than 12 months are taxed at 12.5% on the part above ₹1.25 lakh a year; held 12 months or less, at 20%. Each SIP instalment has its own holding period. Figures here are before tax.', source: ACT },
                { text: 'Mutual fund returns are not guaranteed; the 12% used here is an assumption for illustration.', source: SEBI },
            ]} />
        </>
    );
}

export const stepUpSipPage: FeatureDef = {
    slug: 'step-up-sip',
    title: 'Step Up SIP Calculator: Raise Your SIP Every Year',
    description: 'See what a SIP raised 5%, 10% or 15% every year grows to, against a flat SIP, with a year-by-year table and real examples.',
    h1: 'Step-up SIP calculator: what a yearly increase adds',
    crumb: 'Step-up SIP',
    category: 'investments',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Step Up SIP',
    eyebrow: 'Mutual fund SIP · yearly top-up',
    answer: (
        <>
            <p>A {inr(S)} monthly SIP raised {STEP}% every year grows to {amt(main.futureValue)} in {Y} years at an assumed {R}% a year, against {amt(flat.futureValue)} if the SIP never rises — {extraPct}% more.</p>
            <p>You invest {amt(main.invested)} instead of {amt(flat.invested)}. A flat SIP would need {inr(matchFlat)} a month to reach the same amount.</p>
        </>
    ),
    sources: [ACT, SEBI],
    calc: { key: 'stepUpSip', props: { start: S, step: STEP, rate: R, years: Y } },
    Body,
    faqs: [
        { q: 'What is a step-up SIP?', a: 'A SIP whose monthly amount rises by a fixed percentage once a year, usually in line with your salary. It is also called a top-up SIP.' },
        { q: 'Is a step-up SIP better than a regular SIP?', a: `It builds a bigger corpus because you invest more as your income grows: ${inr(S)} a month raised ${STEP}% a year reaches ${amt(main.futureValue)} in ${Y} years at ${R}%, against ${amt(flat.futureValue)} for a flat SIP.` },
        { q: 'How much should I step up my SIP every year?', a: 'A common approach is to match your expected yearly salary increase. A higher step-up grows the corpus faster, but the later monthly amounts get large, so pick a rate you can keep up.' },
        { q: 'Can I step up an existing SIP?', a: 'Ask your fund house or investment platform how it handles top-ups. You can always start a second SIP in the same fund for the extra amount, which has the same effect.' },
        { q: 'Top up SIP kya hai?', a: `Top-up ya step-up SIP mein har saal aapki mahine ki SIP ek tay pratishat se badhti hai, jaise salary badhti hai. ${inr(S)} mahina, har saal ${STEP}% badhakar, ${R}% maan kar ${Y} saal mein lagbhag ${amt(main.futureValue)} ban sakta hai. Return guaranteed nahi hota.` },
    ],
    related: [
        { href: '/sip-for-1-crore', label: 'SIP for ₹1 crore', note: 'Monthly SIP needed for a goal' },
        { href: '/sip', label: 'SIP calculator', note: 'A flat monthly SIP' },
        { href: '/lumpsum', label: 'Lumpsum calculator', note: 'A one-time investment' },
    ],
    disclaimer: 'invest',
};
