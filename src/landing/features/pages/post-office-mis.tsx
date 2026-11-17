/**
 * /post-office-mis — primary query "post office mis calculator" (SEO_PLAN.md §5d). Replaces the guide.
 * Figures: the MIS screen's formula (POMISCalculator.tsx → math-deposits.misIncome), scssIncome and
 * rdProjection for the comparisons. Limits: G.S.R. 239(E) and 490(E) of 2023; premature closure:
 * MIS Scheme 2019 para 6 (no later amendment found). Facts: seo/research/verified-facts-deposits.md.
 */
import { SMALL_SAVINGS } from '../../../data/rateEnvironment';
import { MIS_LIMIT, misIncome, rdProjection, scssIncome } from '../math-deposits';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const SCHEME = { label: 'Monthly Income Account Scheme, 2019 (India Post)', url: 'https://www.indiapost.gov.in/documents/offerings/schemesandservices/posb/MonthlyIncomeAccountScheme2019English.pdf' };
const LIMITS = { label: 'India Post order: MIS limits raised to ₹9 lakh / ₹15 lakh (2023)', url: 'https://www.indiapost.gov.in/documents/posb/SB7_23ECE_7732_SB.pdf' };
const RATES = { label: 'NSI interest rate table', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=132' };
const DEA = { label: 'DEA small savings rate notices', url: 'http://www.dea.gov.in/budget-division/475' };
const SCH15 = { label: 'Income-tax Act, 2025: Schedule XV', url: 'https://www.incometaxindia.gov.in/w/schedule-xv-3' };

const RATE = SMALL_SAVINGS.rates.pomis;         // 7.4
const single = misIncome(MIS_LIMIT.single, RATE, false);
const joint = misIncome(MIS_LIMIT.joint, RATE, true);

function Body() {
    const amounts = [100000, 200000, 300000, 500000, 750000, 900000, 1200000, 1500000];
    const reinvest = rdProjection(Math.round(single.monthlyIncome), SMALL_SAVINGS.rates.rd5y, 60);
    const scss9 = scssIncome(MIS_LIMIT.single, SMALL_SAVINGS.rates.scss, 5);
    const twoLakh = misIncome(200000, RATE, false);
    return (
        <>
            <Section title="Monthly income from ₹1 lakh to ₹15 lakh">
                <DataTable
                    caption={`Post Office MIS at ${RATE}% a year (${SMALL_SAVINGS.months})`}
                    head={['Deposit', 'Every month', 'Every year', 'Over 5 years', 'Account needed']}
                    rows={amounts.map((a) => {
                        const r = misIncome(a, RATE, a > MIS_LIMIT.single);
                        return [amt(a), inr(r.monthlyIncome), inr(r.yearlyInterest), inr(r.totalInterest), a > MIS_LIMIT.single ? 'Joint' : 'Single or joint'];
                    })}
                    note="The deposit comes back in full after 5 years. Monthly interest is rounded to the nearest rupee."
                />
            </Section>

            <Section title="How the monthly payout is worked out">
                <ol className="steps">
                    <li>Yearly interest = deposit × rate: {inr(MIS_LIMIT.single)} × {RATE}% = {inr(single.yearlyInterest)}.</li>
                    <li>It is paid in twelve equal parts: {inr(single.yearlyInterest)} ÷ 12 = {inr(single.monthlyIncome)}, on completion of each month from the date you deposit.</li>
                    <li>Nothing compounds: interest you do not collect earns nothing more, so the payout stays the same for all 60 months — {inr(single.totalInterest)} in all.</li>
                </ol>
            </Section>

            <Section title="Closing an MIS account early">
                <DataTable
                    caption={`What you get back on a ${amt(MIS_LIMIT.single)} deposit`}
                    head={['When you close it', 'Deduction', 'Deposit returned']}
                    rows={[
                        ['Within the first year', '—', 'Not allowed'],
                        ['After 1 year, up to 3 years', `2% (${inr(single.deductionTo3Years)})`, inr(MIS_LIMIT.single - single.deductionTo3Years)],
                        ['After 3 years, before 5', `1% (${inr(single.deductionAfter3Years)})`, inr(MIS_LIMIT.single - single.deductionAfter3Years)],
                        ['On maturity (5 years)', 'None', inr(MIS_LIMIT.single)],
                    ]}
                    note="The deduction is a percentage of the deposit, taken before it is paid back."
                />
            </Section>

            <Section title="MIS rate history">
                <DataTable
                    caption="5-year Monthly Income Account rate"
                    head={['Opened in', 'Rate a year', `Monthly on ${amt(MIS_LIMIT.single)}`]}
                    rows={([
                        ['Apr – Sep 2016', 7.8], ['Oct 2016 – Mar 2017', 7.7], ['Apr – Jun 2017', 7.6], ['Jul – Dec 2017', 7.5],
                        ['Jan – Sep 2018', 7.3], ['Oct 2018 – Jun 2019', 7.7], ['Jul 2019 – Mar 2020', 7.6], ['Apr 2020 – Sep 2022', 6.6],
                        ['Oct – Dec 2022', 6.7], ['Jan – Mar 2023', 7.1], ['Apr 2023 – Dec 2026', RATE],
                    ] as Array<[string, number]>).map(([p, r]) => [p, `${r}%`, inr(misIncome(MIS_LIMIT.single, r, false).monthlyIncome)])}
                    note="An account earns the rate of the quarter it was opened in for all 5 years. The ₹9 lakh single limit applies only to accounts opened after the 2023 change; earlier accounts had lower limits."
                />
            </Section>

            <Section title={`MIS or SCSS for ${amt(MIS_LIMIT.single)}`}>
                <DataTable
                    caption={`Income from ${amt(MIS_LIMIT.single)} at ${SMALL_SAVINGS.months} rates`}
                    head={['', 'Monthly Income Scheme', 'Senior Citizen Savings Scheme']}
                    rows={[
                        ['Who can open', 'Any adult (up to 3 jointly)', '60+, or certain retirees from 55 / 50'],
                        ['Rate', `${RATE}%`, `${SMALL_SAVINGS.rates.scss}%`],
                        ['Paid', `${inr(single.monthlyIncome)} every month`, `${inr(scss9.quarterlyIncome)} every quarter`],
                        ['Interest in a year', inr(single.yearlyInterest), inr(scss9.annualInterest)],
                        ['Maximum deposit', '₹9 lakh single, ₹15 lakh joint', '₹30 lakh'],
                    ]}
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: 'A couple using a joint account', body: <>{amt(MIS_LIMIT.joint)} in one joint account pays {inr(joint.monthlyIncome)} a month. For the limit, each holder's share of a joint account counts as half (or a third with three holders).</> },
                    { title: 'Turning the payout into savings', body: <>Paying the {inr(single.monthlyIncome)} monthly interest into a Post Office RD at {SMALL_SAVINGS.rates.rd5y}% for 5 years builds {inr(reinvest.maturity)} on top of the {amt(MIS_LIMIT.single)} that comes back at maturity.</> },
                    { title: 'A smaller start', body: <>{amt(200000)} pays {inr(twoLakh.monthlyIncome)} a month — {inr(twoLakh.totalInterest)} over the 5 years.</> },
                    { title: 'Closing in year 2', body: <>On {amt(MIS_LIMIT.single)}, closing after 18 months costs {inr(single.deductionTo3Years)} (2% of the deposit). Waiting past 3 years halves that to {inr(single.deductionAfter3Years)}.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: `Interest for accounts opened in October–December 2026: ${RATE}% a year, paid monthly; unchanged since 1 April 2023.`, source: DEA },
                { text: 'One deposit per account, ₹1,000 or multiples of ₹1,000. A single adult, up to three adults jointly, a guardian for a minor, or a minor aged 10 or more can open one.', source: SCHEME },
                { text: 'All your MIS accounts together may hold at most ₹9 lakh in single accounts and ₹15 lakh in joint accounts (limits raised in 2023).', source: LIMITS },
                { text: 'Interest is due on completion of every month from the deposit date; unclaimed interest earns no further interest.', source: SCHEME },
                { text: 'No closure in the first year; 2% of the deposit is deducted if closed up to 3 years, 1% after 3 years. The account matures after 5 years.', source: SCHEME },
                { text: 'MIS is not among the section 123 deductions listed in Schedule XV of the Income-tax Act, 2025.', source: SCH15 },
                { text: 'Rate history from the National Savings Institute.', source: RATES },
            ]} />
        </>
    );
}

export const postOfficeMis: FeatureDef = {
    slug: 'post-office-mis',
    title: `Post Office MIS Calculator: ${RATE}% Monthly Income 2026`,
    description: `Post Office Monthly Income Scheme payout at ${RATE}%: ${inr(single.monthlyIncome)} a month on ₹9 lakh, ${inr(joint.monthlyIncome)} on ₹15 lakh joint. Limits and early-closure cuts.`,
    h1: 'Post Office MIS calculator: monthly income from your deposit',
    crumb: 'Post Office MIS',
    category: 'retire',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Post Office MIS',
    eyebrow: `Monthly Income Scheme · ${RATE}% for Oct–Dec 2026`,
    answer: (
        <>
            <p>A {amt(MIS_LIMIT.single)} deposit in the Post Office Monthly Income Scheme pays {inr(single.monthlyIncome)} every month for 5 years at {RATE}% a year; a joint account with the {amt(MIS_LIMIT.joint)} maximum pays {inr(joint.monthlyIncome)}.</p>
            <p>The {RATE}% rate is notified for October–December 2026 and is fixed for the account's 5 years. The deposit is repaid in full at maturity.</p>
        </>
    ),
    sources: [DEA, SCHEME, LIMITS],
    calc: { key: 'post-office-mis', props: { amount: MIS_LIMIT.single, rate: RATE, kind: 'single' } },
    Body,
    faqs: [
        { q: 'How much monthly income will ₹15 lakh give in Post Office MIS?', a: `${inr(joint.monthlyIncome)} a month at ${RATE}%, but only in a joint account — a single account is capped at ₹9 lakh, which pays ${inr(single.monthlyIncome)}.` },
        { q: 'Post office MIS interest rate kitna hai?', a: `October–December 2026 ke liye ${RATE}% saalana, jo har mahine milta hai. ${amt(MIS_LIMIT.single)} par yeh ${inr(single.monthlyIncome)} mahina banta hai, 5 saal tak.` },
        { q: 'What is the maximum deposit in Post Office MIS?', a: '₹9 lakh across your single accounts and ₹15 lakh in joint accounts, after the 2023 increase. Your share of a joint account is counted as a half or a third.' },
        { q: 'Can I withdraw from Post Office MIS before 5 years?', a: 'Yes, after the first year. Up to 3 years, 2% of the deposit is deducted; after 3 years, 1%.' },
        { q: 'Does Post Office MIS give a tax deduction?', a: 'No. The MIS deposit is not among the investments listed for the section 123 deduction (the old 80C) in Schedule XV of the Income-tax Act, 2025.' },
        { q: 'When is MIS interest paid?', a: 'On completion of every month counted from your deposit date, for 60 months. If the date does not exist in a month (29th–31st), it is paid on that month\'s last day.' },
    ],
    related: [
        { href: '/scss', label: 'Senior Citizen Savings Scheme', note: 'Higher quarterly income for 60+' },
        { href: '/rd', label: 'RD calculator', note: 'Reinvest the monthly payout' },
        { href: '/post-office-td', label: 'Post Office TD calculator', note: 'Yearly interest, 1 to 5 years' },
        { href: '/swp', label: 'SWP calculator', note: 'Monthly withdrawals from mutual funds' },
        { href: '/kvp', label: 'KVP calculator', note: 'Lump sum that doubles' },
    ],
    disclaimer: { text: 'MIS income figures are before tax and use the rate for accounts opened this quarter. The Government sets a new rate each quarter for new accounts; your passbook decides the actual payout. FinCalix is not affiliated with India Post.' },
};
