/**
 * /rd — primary query "rd calculator" (SEO_PLAN.md §5b). Replaces the hand-written guide.
 * Figures: the RD screen's formula (src/pages/RDCalculator.tsx → math-deposits.rdProjection), which
 * reproduces the NSRD Scheme 2019 tables exactly (₹100 at 7.2% → ₹7,231.38; continuation table) and
 * India Post's ₹1,500 → ₹1,07,049 at 6.7%. Rate: the app's SMALL_SAVINGS. Rules and history:
 * seo/research/verified-facts-deposits.md.
 */
import { SMALL_SAVINGS } from '../../../data/rateEnvironment';
import { rdProjection } from '../math-deposits';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const SCHEME = { label: 'National Savings Recurring Deposit Scheme, 2019', url: 'https://www.indiapost.gov.in/documents/offerings/schemesandservices/posb/NationalSavingsRecurringDepositScheme2019English.pdf' };
const LEAFLET = { label: 'India Post: RD account features', url: 'https://www.indiapost.gov.in/api/documents/file/103pg0i2m4g701grd3jv2e3da860fhn10sjr80fiob3ennq01gju3mn7q07234' };
const NSI = { label: 'NSI interest rate table', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=132' };
const DEA = { label: 'DEA small savings rate notices', url: 'http://www.dea.gov.in/budget-division/475' };

const RATE = SMALL_SAVINGS.rates.rd5y;        // 6.7 for Oct–Dec 2026
const M = 5000;
const main = rdProjection(M, RATE, 60);

function Body() {
    const monthlies = [500, 1000, 2000, 3000, 5000, 10000, 25000];
    const thousand = rdProjection(1000, RATE, 60);
    const q = RATE / 4;
    const check2019 = rdProjection(100, 7.2, 60);
    const leaflet = rdProjection(1500, RATE, 60);
    const tenYears = rdProjection(10000, RATE, 120);
    const old = rdProjection(2000, 5.8, 60);
    const now2k = rdProjection(2000, RATE, 60);
    return (
        <>
            <Section title="What a monthly RD grows to in 5 years">
                <DataTable
                    caption={`Post Office RD, 60 monthly deposits at ${RATE}%`}
                    head={['Every month', 'You deposit', 'Interest', 'Maturity amount']}
                    rows={monthlies.map((m) => { const r = rdProjection(m, RATE, 60); return [inr(m), inr(r.invested), inr(r.interest), inr(r.maturity)]; })}
                    note="Amounts are rounded to the rupee, as the post office does at closure."
                />
            </Section>

            <Section title={`Balance year by year on ${inr(M)} a month`}>
                <DataTable
                    caption={`${inr(M)} a month at ${RATE}%, including up to 5 years of continuation`}
                    head={['After', 'Deposited so far', 'Balance with interest']}
                    rows={[12, 24, 36, 48, 60, 72, 84, 96, 108, 120].map((m) => {
                        const r = rdProjection(M, RATE, m);
                        return [`${m / 12} year${m === 12 ? '' : 's'}${m === 60 ? ' (maturity)' : ''}`, inr(r.invested), inr(r.maturity)];
                    })}
                    note="Years 6 to 10 apply if you continue the account with the same monthly deposit after maturity; India Post keeps the rate the account was opened at for that period."
                />
            </Section>

            <Section title="The RD interest formula, step by step">
                <ol className="steps">
                    <li>Interest compounds every quarter, so the quarterly rate is {RATE}% ÷ 4 = {q}%.</li>
                    <li>Each deposit earns only for the months it stays in. The first {inr(1000)} of a 5-year RD stays 60 months (20 quarters) and becomes 1,000 × (1 + {q / 100})<sup>20</sup>; the last stays one month and becomes 1,000 × (1 + {q / 100})<sup>1/3</sup>.</li>
                    <li>Add all 60 of them: {inr(1000)} a month adds up to {inr(thousand.maturity)}, of which {inr(thousand.interest)} is interest.</li>
                    <li>The same sum gives {check2019.maturity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} for ₹100 a month at the 2019 rate of 7.2% — exactly the figure printed in the scheme's maturity table.</li>
                </ol>
            </Section>

            <Section title="Post Office RD rate history">
                <DataTable
                    caption="5-year Recurring Deposit rate set by the Government"
                    head={['Period', 'Rate a year']}
                    rows={[
                        ['1 Apr 2020 – 31 Mar 2023', '5.8%'],
                        ['1 Apr – 30 Jun 2023', '6.2%'],
                        ['1 Jul – 30 Sep 2023', '6.5%'],
                        [`1 Oct 2023 – 31 Dec 2026`, `${RATE}%`],
                    ]}
                    note="An RD keeps the rate in force on the day it was opened for its whole 5 years."
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `${inr(1500)} a month`, body: <>Sixty deposits of {inr(1500)} total {inr(leaflet.invested)} and mature at {inr(leaflet.maturity)} — the same amount India Post quotes in its own leaflet.</> },
                    { title: `${inr(10000)} a month for 10 years`, body: <>Five years plus a five-year continuation at {RATE}% builds {amt(tenYears.maturity)} from {amt(tenYears.invested)} of deposits.</> },
                    { title: 'What the rate change meant', body: <>{inr(2000)} a month opened at the 2020–2023 rate of 5.8% matures at {inr(old.maturity)}; opened today at {RATE}%, at {inr(now2k.maturity)}.</> },
                    { title: 'A loan instead of closing', body: <>After a year and 12 deposits of {inr(M)}, you can borrow up to half of what you have paid in — {inr(M * 12 * 0.5)} — at {RATE + 2}% simple interest, and repay it while the RD keeps running.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: `Interest rate for October–December 2026: ${RATE}% a year, compounded quarterly; unchanged since 1 October 2023.`, source: DEA },
                { text: 'Minimum ₹100 a month, then multiples of ₹10; 60 monthly deposits over 5 years. Pay by the 15th if the account was opened between the 1st and 15th, otherwise by the last working day.', source: SCHEME },
                { text: 'Up to four missed months can be made good by extending the term; after more than four, the account is discontinued and can be revived within two months with a fee of ₹1 for every ₹100 a month missed.', source: SCHEME },
                { text: 'Premature closure is allowed after 3 years, with interest at the Post Office savings account rate (4% now). The account can be continued for up to 5 more years after maturity.', source: SCHEME },
                { text: 'Loan of up to 50% of the deposits after one year and 12 deposits, at 2 percentage points above the RD rate.', source: SCHEME },
                { text: 'Rate history from the National Savings Institute.', source: NSI },
            ]} />
        </>
    );
}

export const rd: FeatureDef = {
    slug: 'rd',
    title: `RD Calculator: Post Office RD at ${RATE}% (Oct–Dec 2026)`,
    description: `Recurring deposit maturity for any monthly amount: Post Office RD at ${RATE}% compounded quarterly, the formula step by step, and loan and closure rules.`,
    h1: 'RD calculator: monthly deposit to maturity amount',
    crumb: 'RD calculator',
    category: 'investments',
    updated: '2026-11-17',
    analyticsTitle: 'Website - RD',
    eyebrow: `Recurring deposits · ${SMALL_SAVINGS.label}`,
    answer: (
        <>
            <p>Depositing {inr(M)} every month in a 5-year Post Office RD at {RATE}% gives {inr(main.maturity)} at maturity: {inr(main.invested)} of your own deposits and {inr(main.interest)} of interest.</p>
            <p>The {RATE}% rate applies to accounts opened in October–December 2026 and is compounded every quarter. Change the amount, rate or tenure below for a bank RD.</p>
        </>
    ),
    sources: [DEA, SCHEME, LEAFLET],
    calc: { key: 'rd', props: { monthly: M, rate: RATE, years: 5 } },
    Body,
    faqs: [
        { q: 'What is the formula for RD interest?', a: `Each monthly deposit grows at the quarterly rate for the time it stays in: deposit × (1 + rate/400)^(months left ÷ 3). Adding all of them gives the maturity amount — ${inr(main.maturity)} for ${inr(M)} a month over 5 years at ${RATE}%.` },
        { q: 'How much will ₹2,000 a month give in a Post Office RD?', a: `${inr(rdProjection(2000, RATE, 60).maturity)} after 5 years at ${RATE}%, from ${inr(120000)} of deposits.` },
        { q: 'What is the minimum amount for a Post Office RD?', a: '₹100 a month, and any higher amount in multiples of ₹10. There is no upper limit, and you can hold more than one RD.' },
        { q: 'Can I close a Post Office RD before 5 years?', a: 'Only after 3 years from opening, and then interest is paid at the Post Office savings account rate (4% now) instead of the RD rate.' },
        { q: 'What happens if I miss an RD instalment?', a: 'You pay the missed month later with a default fee of ₹1 for every ₹100. After more than four missed months the account is discontinued, and it can be revived only within two months.' },
        { q: 'RD ka calculation kaise kare?', a: `Har mahine ki kisht us din se maturity tak quarterly byaj kamaati hai: kisht × (1 + ${RATE}/400)^(bache mahine ÷ 3). Sab kishton ko jodiye — ${inr(M)} mahine ke 5 saal mein ${inr(main.maturity)} bante hain.` },
    ],
    related: [
        { href: '/fd', label: 'FD calculator', note: 'Lump-sum deposit instead of monthly' },
        { href: '/sip', label: 'SIP calculator', note: 'Monthly investing in mutual funds' },
        { href: '/post-office-mis', label: 'Post Office MIS calculator', note: 'Monthly income from a deposit' },
        { href: '/ppf', label: 'PPF calculator', note: '15-year tax-free savings' },
    ],
    disclaimer: { text: 'Post Office RD rates are notified by the Government each quarter and stay fixed for the account. Bank RD rates and compounding vary by bank, so check your bank\'s terms. Figures are before tax. FinCalix is not affiliated with India Post or any bank.' },
};
