/**
 * /kvp — primary query "kvp calculator" (SEO_PLAN.md §5d). Replaces the hand-written guide.
 * Figures: maturity = 2 × deposit (KVP Scheme 2019, para 5) via math-deposits.kvpProjection (copied from
 * KVPCalculator.tsx; gives 115 months at 7.5%, as NSI publishes). Doubling periods for past rates are
 * NSI's published months, not the formula (which is off by a month at some old rates).
 * Left out: KVP tax treatment and encashment table values for accounts opened since April 2023
 * (not verified from an official source today). Facts: seo/research/verified-facts-deposits.md.
 */
import { SMALL_SAVINGS } from '../../../data/rateEnvironment';
import { kvpProjection, nscProjection } from '../math-deposits';
import { yearsMonths } from '../derive';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const SCHEME = { label: 'Kisan Vikas Patra Scheme, 2019 (NSI)', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=170' };
const NSI = { label: 'National Savings Institute: KVP', url: 'http://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=56' };
const RATES = { label: 'NSI interest rate table', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=132' };
const DEA = { label: 'DEA small savings rate notices', url: 'http://www.dea.gov.in/budget-division/475' };

const RATE = SMALL_SAVINGS.rates.kvp;                 // 7.5
const MONTHS = SMALL_SAVINGS.rates.kvpMaturityMonths; // 115 (NSI)
const L = 100000;
const main = kvpProjection(L, RATE);

/** NSI rate table: rate and the months to double, by period of purchase. */
const HISTORY: Array<[string, number, number]> = [
    ['2014-15 and 2015-16', 8.7, 100],
    ['Apr – Sep 2016', 7.8, 110],
    ['Oct 2016 – Mar 2017', 7.7, 112],
    ['Apr – Jun 2017', 7.6, 113],
    ['Jul – Dec 2017', 7.5, 115],
    ['Jan – Sep 2018', 7.3, 118],
    ['Oct 2018 – Jun 2019', 7.7, 112],
    ['Jul 2019 – Mar 2020', 7.6, 113],
    ['Apr 2020 – Sep 2022', 6.9, 124],
    ['Oct – Dec 2022', 7.0, 123],
    ['Jan – Mar 2023', 7.2, 120],
    ['Apr 2023 – Dec 2026', RATE, MONTHS],
];

function Body() {
    const amounts = [10000, 50000, 100000, 200000, 500000, 1000000];
    const nsc = nscProjection(L, SMALL_SAVINGS.rates.nsc);
    const child = kvpProjection(50000, RATE);
    const five = kvpProjection(500000, RATE);
    return (
        <>
            <Section title="What your KVP pays on maturity">
                <DataTable
                    caption={`Kisan Vikas Patra bought in ${SMALL_SAVINGS.months}: doubles in ${MONTHS} months`}
                    head={['You invest', 'Interest earned', `Paid after ${yearsMonths(MONTHS)}`]}
                    rows={amounts.map((a) => { const r = kvpProjection(a, RATE); return [inr(a), inr(r.interest), inr(r.maturity)]; })}
                />
            </Section>

            <Section title="How long KVP has taken to double">
                <DataTable
                    caption="Maturity period fixed by the rate on the date of purchase"
                    head={['Bought in', 'Rate a year', 'Months to double', 'That is']}
                    rows={HISTORY.map(([p, r, m]) => [p, `${r}%`, String(m), yearsMonths(m)])}
                    note="A certificate keeps the period of the quarter it was bought in, even if the rate changes later."
                />
            </Section>

            <Section title="Why it is 115 months">
                <ol className="steps">
                    <li>KVP compounds once a year. The question is how many years at {RATE}% turn ₹1 into ₹2.</li>
                    <li>The answer is log 2 ÷ log(1 + {RATE / 100}) ≈ {(main.doublingMonths / 12).toLocaleString('en-IN', { maximumFractionDigits: 2 })} years, which is {main.doublingMonths} months when rounded to the nearest month.</li>
                    <li>So {inr(L)} becomes {inr(main.maturity)} after {yearsMonths(main.doublingMonths)}. The quick "rule of 72" (72 ÷ {RATE} ≈ {(72 / RATE).toLocaleString('en-IN', { maximumFractionDigits: 1 })} years) lands close to the same answer.</li>
                    <li>The Government publishes the exact period with each rate; for older rates it is sometimes a month shorter than this rounding, so the table above uses the official months.</li>
                </ol>
            </Section>

            <Section title="KVP or NSC">
                <DataTable
                    caption={`${inr(L)} at ${SMALL_SAVINGS.months} rates`}
                    head={['', 'Kisan Vikas Patra', 'NSC']}
                    rows={[
                        ['Rate', `${RATE}%`, `${SMALL_SAVINGS.rates.nsc}%`],
                        ['Term', yearsMonths(MONTHS), '5 years'],
                        ['Paid at the end', inr(main.maturity), inr(nsc.maturity)],
                        ['Cash it early', 'After 2½ years, at table values', 'Only on death, pledge forfeiture or court order'],
                        ['Transfer to another person', 'Allowed', 'Only in listed cases (death, court order, pledge)'],
                    ]}
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: 'A gift for a newborn', body: <>{inr(50000)} in a KVP bought now becomes {inr(child.maturity)} when the child is about {Math.round(MONTHS / 12 * 10) / 10} years old — a guardian can hold it in the child's name.</> },
                    { title: `${amt(500000)} kept aside`, body: <>{amt(500000)} doubles to {amt(five.maturity)} after {MONTHS} months. There is no upper limit, so the same applies to any amount in multiples of ₹100.</> },
                    { title: 'Bought during the 6.9% years', body: <>A KVP bought between April 2020 and September 2022 took 124 months to double — 9 months longer than one bought today.</> },
                    { title: 'Needing the money early', body: <>From 2½ years after purchase, a KVP can be encashed at the amounts in the scheme's table, which are below the doubled value; before that, only on the holder's death, a pledgee's forfeiture or a court order.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: `Rate for KVPs bought in October–December 2026: ${RATE}% a year; the deposit doubles in ${MONTHS} months (unchanged since 1 April 2023).`, source: DEA },
                { text: 'Minimum ₹1,000, then any amount in multiples of ₹100; no maximum and any number of accounts. Single adult, up to three adults jointly, a guardian for a minor, or a minor aged 10 or more.', source: SCHEME },
                { text: 'The maturity period is fixed by the rate applicable on the date the account is opened, and the deposit doubles on maturity.', source: SCHEME },
                { text: 'Encashment is allowed after 2½ years from the date of investment at the scheme\'s table values; earlier closure only on death, forfeiture by a pledgee or a court order.', source: NSI },
                { text: 'A KVP can be transferred from one person to another and from one post office to another, and pledged as security.', source: NSI },
                { text: 'Doubling periods for each rate since 2014 from the National Savings Institute.', source: RATES },
            ]} />
        </>
    );
}

export const kvp: FeatureDef = {
    slug: 'kvp',
    title: `KVP Calculator: Money Doubles in ${MONTHS} Months at ${RATE}%`,
    description: `Kisan Vikas Patra maturity for any amount at ${RATE}%: doubles in ${MONTHS} months (${yearsMonths(MONTHS)}). Doubling periods since 2014 and encashment rules.`,
    h1: 'KVP calculator: when your Kisan Vikas Patra doubles',
    crumb: 'KVP calculator',
    category: 'retire',
    updated: '2026-11-17',
    analyticsTitle: 'Website - KVP',
    eyebrow: `Kisan Vikas Patra · ${RATE}% for Oct–Dec 2026`,
    answer: (
        <>
            <p>A {inr(L)} Kisan Vikas Patra bought now pays {inr(main.maturity)} after {MONTHS} months — {yearsMonths(MONTHS)} — at {RATE}% a year, compounded yearly.</p>
            <p>The {RATE}% rate and {MONTHS}-month period are notified for October–December 2026 and stay fixed for the certificate.</p>
        </>
    ),
    sources: [DEA, RATES, SCHEME],
    calc: { key: 'kvp', props: { amount: L, rate: RATE, months: MONTHS } },
    Body,
    faqs: [
        { q: 'Kisan Vikas Patra kitne saal ka hota hai?', a: `Abhi kharida gaya KVP ${MONTHS} mahine yaani ${Math.floor(MONTHS / 12)} saal ${MONTHS % 12} mahine mein double hota hai, ${RATE}% saalana byaj par. ${inr(L)} lagane par ant mein ${inr(main.maturity)} milte hain.` },
        { q: 'In how many months does KVP double?', a: `${MONTHS} months for certificates bought in October–December 2026, at ${RATE}% a year. Certificates bought earlier keep the period of their own quarter — 124 months for April 2020 to September 2022, for example.` },
        { q: 'What is the KVP interest rate now?', a: `${RATE}% a year, compounded yearly, for October–December 2026. It has been ${RATE}% since April 2023.` },
        { q: 'Can I encash KVP before maturity?', a: 'Yes, after 2½ years from purchase, at the amounts set in the scheme\'s table, which are less than the doubled value. Before that, only on the holder\'s death, forfeiture by a pledgee or a court order.' },
        { q: 'Is there a maximum limit for KVP?', a: 'No. The minimum is ₹1,000 and you can invest any larger amount in multiples of ₹100, in as many certificates as you like.' },
        { q: 'Is Kisan Vikas Patra only for farmers?', a: 'No. Any adult can buy one, singly or jointly with up to two other adults, and a guardian can buy one for a minor.' },
    ],
    related: [
        { href: '/nsc', label: 'NSC calculator', note: '5-year certificate, higher rate' },
        { href: '/post-office-mis', label: 'Post Office MIS calculator', note: 'Monthly income instead of a lump sum' },
        { href: '/compound-interest', label: 'Compound interest calculator', note: 'Doubling time at any rate' },
        { href: '/post-office-td', label: 'Post Office TD calculator', note: 'Fixed deposits from 1 to 5 years' },
    ],
    disclaimer: { text: 'KVP figures assume the certificate is held to maturity. Early encashment pays the lower amounts in the scheme\'s table. The Government sets the rate and period each quarter for new certificates. FinCalix is not affiliated with India Post or NSI.' },
};
