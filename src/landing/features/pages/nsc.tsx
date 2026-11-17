/**
 * /nsc — primary query "nsc calculator" (SEO_PLAN.md §5d). Replaces the hand-written guide.
 * Figures: the NSC screen's formula (NSCCalculator.tsx → math-deposits.nscProjection; yearly
 * compounding matches the scheme's ₹1,000 interest table) and features/math.poTd for the comparison.
 * Rules: NSC VIII Issue Scheme 2019 (NSI). Facts: seo/research/verified-facts-deposits.md.
 * Left out (unverified in the 2025 Act): a deduction for the deemed-reinvested interest.
 */
import { SMALL_SAVINGS } from '../../../data/rateEnvironment';
import { nscProjection } from '../math-deposits';
import { poTd } from '../math';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const SCHEME = { label: 'NSC (VIII Issue) Scheme, 2019 (NSI)', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=167' };
const RATES = { label: 'NSI interest rate table', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=132' };
const DEA = { label: 'DEA small savings rate notices', url: 'http://www.dea.gov.in/budget-division/475' };
const LEAFLET = { label: 'India Post: NSC features', url: 'https://www.indiapost.gov.in/api/documents/file/103pg0i2m4g701grd3jv2e3da860fhn10sjr80fiob3ennq01gju3mn7q07234' };
const SCH15 = { label: 'Income-tax Act, 2025: Schedule XV', url: 'https://www.incometaxindia.gov.in/w/schedule-xv-3' };

const RATE = SMALL_SAVINGS.rates.nsc;          // 7.7
const L = 100000;
const main = nscProjection(L, RATE);
const perK = nscProjection(1000, RATE);

function Body() {
    const amounts = [10000, 50000, 100000, 150000, 500000, 1000000];
    const td = poTd(L, SMALL_SAVINGS.rates.td5y, 5);
    const at68 = nscProjection(L, 6.8);
    const at70 = nscProjection(L, 7.0);
    const big = nscProjection(1500000, RATE);
    const sec = nscProjection(150000, RATE);
    return (
        <>
            <Section title={`How ${inr(L)} grows inside the certificate`}>
                <DataTable
                    caption={`NSC of ${inr(L)} at ${RATE}%, interest added at the end of each year`}
                    head={['Year', 'Value at start', 'Interest for the year', 'Value at end', 'What happens to it']}
                    rows={main.table.map((r) => [String(r.year), inr(r.openBal), inr(r.interest), inr(r.closeBal), r.year < 5 ? 'Treated as reinvested' : 'Paid with the deposit'])}
                    note="Nothing is paid out during the 5 years. The scheme treats each of the first four years' interest as reinvested in the certificate, which is why the yearly interest rises."
                />
            </Section>

            <Section title="Maturity value by amount">
                <DataTable
                    caption={`NSC bought in ${SMALL_SAVINGS.months}, held 5 years at ${RATE}%`}
                    head={['You invest', 'Interest earned', 'Paid at maturity']}
                    rows={amounts.map((a) => { const r = nscProjection(a, RATE); return [inr(a), inr(r.interest), inr(r.maturity)]; })}
                />
            </Section>

            <Section title="How the maturity value is worked out">
                <ol className="steps">
                    <li>Year 1: {inr(L)} × {RATE}% = {inr(main.table[0].interest)}, so the certificate is worth {inr(main.table[0].closeBal)}.</li>
                    <li>Year 2 earns {RATE}% on that new value: {inr(main.table[1].interest)}. Each later year works the same way.</li>
                    <li>In one line: {inr(L)} × (1 + {RATE / 100})<sup>5</sup> = {inr(main.maturity)}. Per {inr(1000)} that is {perK.maturity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, rounded to the rupee when paid.</li>
                </ol>
            </Section>

            <Section title="NSC interest rate history">
                <DataTable
                    caption="5-year National Savings Certificate rate"
                    head={['Period of purchase', 'Rate a year']}
                    rows={[
                        ['2012-13', 8.6], ['2013-14 to 2015-16', 8.5], ['Apr – Sep 2016', 8.1], ['Oct 2016 – Mar 2017', 8.0],
                        ['Apr – Jun 2017', 7.9], ['Jul – Dec 2017', 7.8], ['Jan – Sep 2018', 7.6], ['Oct 2018 – Jun 2019', 8.0],
                        ['Jul 2019 – Mar 2020', 7.9], ['Apr 2020 – Dec 2022', 6.8], ['Jan – Mar 2023', 7.0], ['Apr 2023 – Dec 2026', RATE],
                    ].map(([period, r]) => [period as string, `${r}%`])}
                    note="A certificate keeps the rate of the quarter it was bought in. Certificates bought before 12 December 2019 follow older rules and tables."
                />
            </Section>

            <Section title="NSC or a 5-year Post Office TD">
                <DataTable
                    caption={`${inr(L)} for 5 years at ${SMALL_SAVINGS.months} rates`}
                    head={['', 'NSC', '5-year Time Deposit']}
                    rows={[
                        ['Rate', `${RATE}%`, `${SMALL_SAVINGS.rates.td5y}%`],
                        ['Interest', 'Added to the certificate every year', `Paid out every year (${inr(td.yearlyInterest)})`],
                        ['Total interest', inr(main.interest), inr(td.interest)],
                        ['Early exit', 'Only on death, pledge forfeiture or court order', 'After 4 years, at the savings rate'],
                        ['Section 123 (old regime)', 'Deposit counts', 'Deposit counts'],
                    ]}
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `${amt(150000)} in March for the old regime`, body: <>A {amt(150000)} certificate matures at {inr(sec.maturity)} after 5 years. The deposit uses up the full ₹1.5 lakh section 123 limit for that year.</> },
                    { title: 'A larger lump sum', body: <>There is no upper limit: {amt(1500000)} becomes {amt(big.maturity)}, all paid on the fifth anniversary of the purchase.</> },
                    { title: 'Bought in 2021 versus today', body: <>The same {inr(L)} bought at 6.8% in 2021 matures at {inr(at68.maturity)}; at 7.0% in early 2023, {inr(at70.maturity)}; at today's {RATE}%, {inr(main.maturity)}.</> },
                    { title: 'Needing money in year 2', body: <>You cannot cash an NSC just because you need the money. It can, however, be pledged as security for a loan from a bank or another approved lender.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: `Interest for certificates bought in October–December 2026: ${RATE}% a year, compounded yearly and paid at maturity; unchanged since 1 April 2023.`, source: DEA },
                { text: 'Minimum ₹1,000, then any amount in multiples of ₹100; no maximum and any number of certificates. Single, or joint for up to three adults; a guardian can buy for a minor and a minor of 10 or more for himself.', source: SCHEME },
                { text: 'Matures 5 years from the date of deposit. Each year\'s interest accrues at the year end, and the first four years\' interest is deemed reinvested.', source: SCHEME },
                { text: 'Closure before maturity only on the holder\'s death, forfeiture by a pledgee or a court order: principal only within one year, savings-account interest between one and three years, table values after three years.', source: SCHEME },
                { text: 'India Post states that NSC deposits qualify for the income-tax deduction (section 80C of the old Act, now section 123 with Schedule XV of the 2025 Act; old regime only).', source: LEAFLET },
                { text: 'Schedule XV lists subscriptions to notified savings certificates among the section 123 deductions.', source: SCH15 },
                { text: 'Rate history from the National Savings Institute.', source: RATES },
            ]} />
        </>
    );
}

export const nsc: FeatureDef = {
    slug: 'nsc',
    title: `NSC Calculator: ${RATE}% Maturity Value for 5 Years`,
    description: `National Savings Certificate maturity at ${RATE}% for any amount, the yearly interest table, NSC rate history since 2012 and when you can cash it early.`,
    h1: 'NSC calculator: National Savings Certificate maturity value',
    crumb: 'NSC calculator',
    category: 'retire',
    updated: '2026-11-17',
    analyticsTitle: 'Website - NSC',
    eyebrow: `Post Office certificates · ${RATE}% for Oct–Dec 2026`,
    answer: (
        <>
            <p>A {inr(L)} National Savings Certificate bought now pays {inr(main.maturity)} after 5 years at {RATE}% a year, compounded yearly — {inr(main.interest)} of interest, all paid at maturity.</p>
            <p>The {RATE}% rate is notified for October–December 2026 and stays fixed for the certificate. There is no maximum, and the minimum is {inr(1000)}.</p>
        </>
    ),
    sources: [DEA, SCHEME, RATES],
    calc: { key: 'nsc', props: { amount: L, rate: RATE } },
    Body,
    faqs: [
        { q: 'What is the NSC interest rate in 2026?', a: `${RATE}% a year for certificates bought in October–December 2026, compounded yearly. It has been ${RATE}% since 1 April 2023.` },
        { q: 'What will ₹1 lakh in NSC become after 5 years?', a: `${inr(main.maturity)} at ${RATE}%, paid in one go at maturity.` },
        { q: 'Is NSC interest paid every year?', a: 'No. Interest accrues at the end of each year and stays in the certificate; the first four years\' interest is treated as reinvested, and everything is paid at the end of 5 years.' },
        { q: 'Can I withdraw from NSC before 5 years?', a: 'Not by choice. Early closure is allowed only on the holder\'s death, forfeiture by a pledgee or a court order, and then at reduced interest.' },
        { q: 'Does NSC save income tax?', a: 'The amount you invest counts towards the ₹1.5 lakh deduction under section 123 (formerly 80C), but only in the old regime.' },
        { q: 'How has the NSC rate changed?', a: `It was 6.8% from April 2020 to December 2022, 7.0% in January–March 2023 and ${RATE}% since April 2023. Between 2012 and March 2020 it moved between 7.6% and 8.6%.` },
    ],
    related: [
        { href: '/kvp', label: 'KVP calculator', note: 'Post Office certificate that doubles your money' },
        { href: '/post-office-td', label: 'Post Office TD calculator', note: 'Yearly interest instead of at maturity' },
        { href: '/ppf', label: 'PPF calculator', note: 'Long-term tax-saving account' },
        { href: '/fd', label: 'FD calculator', note: 'Compare with a bank deposit' },
    ],
    disclaimer: { text: 'NSC maturity values are before tax and assume the certificate is held for the full 5 years at the rate of the quarter it was bought in. India Post\'s passbook or certificate decides the actual amount. FinCalix is not affiliated with India Post.' },
};
