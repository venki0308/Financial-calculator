/**
 * /ppf — primary query "ppf calculator" (SEO_PLAN.md §5d). Replaces the hand-written guide.
 * Figures: the PPF screen's formula (AdvancedPPFCalculator.tsx computePPF → math-deposits.ppfSchedule);
 * the SSY comparison uses features/math.ssyProjection. Loan and withdrawal amounts apply PPF Scheme
 * 2019 paras 8 and 10 to that schedule. Rate history: NSI table. Facts: verified-facts-deposits.md.
 */
import { SMALL_SAVINGS } from '../../../data/rateEnvironment';
import { ppfSchedule } from '../math-deposits';
import { ssyProjection } from '../math';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RULES = { label: 'Public Provident Fund Scheme, 2019 (NSI)', url: 'http://www.nsiindia.gov.in/writereaddata/SchemeRules/PublicProvidentFundSchemeRule.pdf' };
const NSI = { label: 'National Savings Institute: PPF', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?ID_PK=55' };
const RATES = { label: 'NSI interest rate table', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=132' };
const DEA = { label: 'DEA small savings rate notices', url: 'http://www.dea.gov.in/budget-division/475' };
const SCH15 = { label: 'Income-tax Act, 2025: Schedule XV', url: 'https://www.incometaxindia.gov.in/w/schedule-xv-3' };

const RATE = SMALL_SAVINGS.rates.ppf;          // 7.1
const MAX = 150000;
const full = ppfSchedule(MAX, 1, RATE, 15);
const maturity = full[14].closing;

function Body() {
    const yearlyAmounts = [12000, 25000, 50000, 100000, 150000];
    const monthly = ppfSchedule(MAX / 12, 12, RATE, 15);
    const twenty = ppfSchedule(MAX, 1, RATE, 20);
    const small = ppfSchedule(500, 1, RATE, 15);
    const ssy = ssyProjection(MAX, SMALL_SAVINGS.rates.ssy, 0);
    const bal = (y: number) => (y >= 1 ? full[y - 1].closing : 0);
    return (
        <>
            <Section title={`Year by year: ${inr(MAX)} deposited by 5 April`}>
                <DataTable
                    caption={`PPF at ${RATE}% a year, with the loan and withdrawal you could take in each year`}
                    head={['Year', 'Deposit', 'Interest credited', 'Balance on 31 March', 'Loan up to', 'Withdrawal up to']}
                    rows={full.map((r) => [
                        String(r.year), inr(r.contribution), inr(r.interest), inr(r.closing),
                        r.year >= 3 && r.year <= 6 ? inr(Math.floor(bal(r.year - 2) * 0.25)) : '—',
                        r.year >= 7 ? inr(Math.floor(Math.min(bal(r.year - 4), bal(r.year - 1)) * 0.5)) : '—',
                    ])}
                    note="Year 1 is the financial year you open the account. A loan (years 3–6) is up to 25% of the balance at the end of the second year before; a withdrawal (from year 7, once a year) is up to 50% of the lower of the balance four years earlier or last year."
                />
            </Section>

            <Section title="Maturity for different yearly amounts">
                <DataTable
                    caption={`Deposited by 5 April every year, at ${RATE}%`}
                    head={['Every year', 'After 15 years', 'Extended to 20 years', 'Extended to 25 years']}
                    rows={yearlyAmounts.map((a) => [inr(a), ...[15, 20, 25].map((y) => amt(ppfSchedule(a, 1, RATE, y)[y - 1].closing))])}
                    note="Extension means continuing with deposits for blocks of 5 years after maturity, opted for within a year of maturity."
                />
            </Section>

            <Section title="How PPF interest is calculated">
                <ol className="steps">
                    <li>Each month, interest is worked out on the lowest balance between the close of the 5th and the month end, at {RATE}% ÷ 12. Money that arrives after the 5th earns nothing for that month.</li>
                    <li>The twelve months' interest is added to the account once, on 31 March.</li>
                    <li>Year 1: {inr(MAX)} deposited by 5 April earns {inr(full[0].interest)}, so the balance is {inr(full[0].closing)}.</li>
                    <li>Year 2: another {inr(MAX)} makes {inr(full[0].closing + MAX)}, which earns {inr(full[1].interest)} → {inr(full[1].closing)}. Repeat for 15 years to reach {inr(maturity)}.</li>
                </ol>
                <DataTable
                    caption="When you deposit changes the result (15 years, same yearly total)"
                    head={['How you pay in', 'Maturity', 'Interest earned']}
                    rows={[
                        [`${inr(MAX)} once a year, by 5 April`, inr(maturity), inr(maturity - MAX * 15)],
                        [`${inr(MAX / 12)} every month, by the 5th`, inr(monthly[14].closing), inr(monthly[14].closing - MAX * 15)],
                    ]}
                />
            </Section>

            <Section title="PPF interest rate history">
                <DataTable
                    caption="Rate on the whole PPF balance, set by the Government"
                    head={['Period', 'Rate a year']}
                    rows={[
                        ['1 Dec 2011 – 31 Mar 2012', '8.6%'],
                        ['2012-13', '8.8%'],
                        ['2013-14 to 2015-16', '8.7%'],
                        ['Apr – Sep 2016', '8.1%'],
                        ['Oct 2016 – Mar 2017', '8.0%'],
                        ['Apr – Jun 2017', '7.9%'],
                        ['Jul – Dec 2017', '7.8%'],
                        ['Jan – Sep 2018', '7.6%'],
                        ['Oct 2018 – Jun 2019', '8.0%'],
                        ['Jul 2019 – Mar 2020', '7.9%'],
                        ['1 Apr 2020 – 31 Dec 2026', `${RATE}%`],
                    ]}
                    note="Unlike a fixed deposit, a PPF account does not lock in a rate: each quarter's rate applies to the entire balance."
                />
            </Section>

            <Section title="PPF or Sukanya Samriddhi for the same deposits">
                <DataTable
                    caption={`${inr(MAX)} a year for 15 years (rates for ${SMALL_SAVINGS.months})`}
                    head={['Scheme', 'Rate', 'Money locked until', 'Value then']}
                    rows={[
                        ['PPF', `${RATE}%`, 'End of 15 financial years', amt(maturity)],
                        ['PPF extended 5 years with deposits', `${RATE}%`, '20 years (₹30 lakh deposited)', amt(twenty[19].closing)],
                        ['Sukanya Samriddhi (girl below 10)', `${SMALL_SAVINGS.rates.ssy}%`, '21 years from opening', amt(ssy.maturity)],
                    ]}
                    note="Both deposits count towards the section 123 deduction in the old regime. Sukanya Samriddhi is open only for a daughter below 10."
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: 'The minimum to keep it active', body: <>Paying only {inr(500)} a year for 15 years builds {inr(small[14].closing)}. Missing even that makes the account "discontinued": no loans or withdrawals until you pay ₹50 for each year plus the {inr(500)} arrears.</> },
                    { title: 'Monthly instead of yearly', body: <>Spreading {inr(MAX)} as {inr(MAX / 12)} a month gives {amt(monthly[14].closing)} after 15 years, {inr(maturity - monthly[14].closing)} less than one deposit by 5 April, because later instalments earn fewer months.</> },
                    { title: 'A loan in year 3', body: <>With {inr(MAX)} a year, the year-3 loan limit is 25% of the year-1 balance: {inr(Math.floor(full[0].closing * 0.25))}. It is repaid within 36 months at 1% a year.</> },
                    { title: 'Keeping it going after 15 years', body: <>One 5-year extension with deposits takes the balance to {amt(twenty[19].closing)}; during that block you may withdraw up to 60% of the balance at its start.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: `Deposit ₹500 to ₹1,50,000 a financial year in multiples of ₹50, as a lump sum or in instalments. The limit includes any account you hold for a minor; joint accounts are not allowed.`, source: RULES },
                { text: `Interest for October–December 2026: ${RATE}% a year (unchanged since 1 April 2020), on the lowest balance between the 5th and month end, credited on 31 March.`, source: DEA },
                { text: 'Loan from the 3rd to the 6th year, up to 25% of the balance at the end of the second preceding year, repayable in 36 months at 1% interest (6% if not repaid in time). One loan a year.', source: RULES },
                { text: 'Withdrawal once a year from the 7th year, up to 50% of the lower of the balance at the end of the 4th preceding year or the preceding year.', source: RULES },
                { text: 'Matures after 15 full financial years; can be extended with deposits in 5-year blocks or kept without deposits. Early closure after 5 years only for serious illness, higher education or change of residency, at 1% less interest.', source: RULES },
                { text: 'Deposits count towards the ₹1.5 lakh deduction under section 123 (old regime only). NSI states that PPF interest is free from income tax.', source: SCH15 },
                { text: 'Rate history from the National Savings Institute.', source: RATES },
            ]} />
        </>
    );
}

export const ppf: FeatureDef = {
    slug: 'ppf',
    title: `PPF Calculator 2026: ${RATE}% Interest, Year-by-Year Table`,
    description: `PPF maturity at ${RATE}% for any yearly deposit, with a 15-year table, rate history since 2011, loan and withdrawal limits and the 5 April rule.`,
    h1: 'PPF calculator: maturity, yearly balance and withdrawal limits',
    crumb: 'PPF calculator',
    category: 'retire',
    updated: '2026-11-17',
    analyticsTitle: 'Website - PPF',
    eyebrow: `Public Provident Fund · ${RATE}% for Oct–Dec 2026`,
    answer: (
        <>
            <p>Investing {inr(MAX)} in PPF by 5 April every year for 15 years grows to {inr(maturity)} at the current {RATE}% a year: {inr(MAX * 15)} of deposits and {inr(maturity - MAX * 15)} of interest.</p>
            <p>The {RATE}% rate has applied since 1 April 2020 and is reviewed every quarter by the Government; whatever rate is set applies to your whole balance.</p>
        </>
    ),
    sources: [RULES, DEA, NSI],
    calc: { key: 'ppf', props: { yearly: MAX, years: 15, rate: RATE } },
    Body,
    faqs: [
        { q: 'What is the PPF interest rate in 2026?', a: `${RATE}% a year for October–December 2026, the same since 1 April 2020. The Government reviews it every quarter.` },
        { q: 'How much will ₹1.5 lakh a year in PPF give after 15 years?', a: `About ${amt(maturity)} if each deposit is made by 5 April and the rate stays at ${RATE}%. You put in ${amt(MAX * 15)}.` },
        { q: 'When should I deposit in PPF to earn the most interest?', a: 'By the 5th of the month — ideally by 5 April for the whole year. Interest is paid on the lowest balance after the 5th, so money that comes in on the 6th waits a month to start earning.' },
        { q: 'Can I withdraw money from PPF before 15 years?', a: 'Partly, from the 7th financial year: once a year, up to half of the lower of the balance four years earlier or at the end of the previous year. From the 3rd to the 6th year you can take a loan instead.' },
        { q: 'Can a PPF account be extended after 15 years?', a: 'Yes, in blocks of 5 years with deposits (apply within a year of maturity), or you can simply leave the balance in without deposits and it keeps earning interest.' },
        { q: 'Is PPF tax-free?', a: 'Deposits count towards the section 123 deduction only in the old regime, and NSI states that the interest is free from income tax. In the new regime there is no deduction for the deposit.' },
        { q: 'PPF kaise calculate hota hai?', a: `Har mahine 5 tareekh ke baad ke sabse kam balance par ${RATE}% ÷ 12 byaj banta hai, aur saal bhar ka byaj 31 March ko account mein judta hai. ${inr(MAX)} har saal 5 April tak daalne par 15 saal mein lagbhag ${amt(maturity)} banta hai.` },
    ],
    related: [
        { href: '/sukanya-samriddhi', label: 'Sukanya Samriddhi calculator', note: 'Higher rate, for a daughter below 10' },
        { href: '/nsc', label: 'NSC calculator', note: '5-year certificate that also counts for section 123' },
        { href: '/elss', label: 'ELSS calculator', note: 'Market-linked tax saver with a 3-year lock-in' },
        { href: '/old-vs-new-tax-regime', label: 'Old vs new tax regime', note: 'Check if the PPF deduction helps you' },
        { href: '/epf', label: 'EPF calculator', note: 'Your workplace provident fund' },
    ],
    disclaimer: { text: 'PPF projections assume today\'s rate for every remaining year. The Government can change the rate every quarter and the new rate applies to the full balance, so the final amount will differ. FinCalix is not affiliated with India Post, NSI or any bank.' },
};
