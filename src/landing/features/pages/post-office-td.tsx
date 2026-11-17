/**
 * /post-office-td — primary query "post office td calculator" (SEO_PLAN.md §5d). Replaces the
 * hand-written guide. Interest follows the scheme rule (features/math.poTd: compounded quarterly,
 * paid yearly, no interest on unwithdrawn interest — NSTD Scheme 2019 paras 7(2), 7(7)), not the
 * app screen, which compounds across years (APP_IDEAS.md). Rates: the app's SMALL_SAVINGS.
 * Premature closure: Fourth Amendment 2023 (seo/research/verified-facts-2026-11-17.md).
 */
import { SMALL_SAVINGS } from '../../../data/rateEnvironment';
import { poTd } from '../math';
import { amt, inr, pct } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const SCHEME = { label: 'National Savings Time Deposit Scheme, 2019', url: 'https://www.indiapost.gov.in/documents/offerings/schemesandservices/posb/NationalSavingsTimeDepositScheme2019English.pdf' };
const AMEND = { label: 'NSTD (Fourth Amendment) Scheme, 2023 — premature closure', url: 'https://www.indiapost.gov.in/documents/posb/SB22_2023ECE_9187.pdf' };
const NSI = { label: 'National Savings Institute: Time Deposit', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=58' };
const DEA = { label: 'DEA small savings rate notices', url: 'http://www.dea.gov.in/budget-division/475' };

const R = SMALL_SAVINGS.rates;
const RATES: Record<1 | 2 | 3 | 5, number> = { 1: R.td1y, 2: R.td2y, 3: R.td3y, 5: R.td5y };
const TENURES = [1, 2, 3, 5] as const;
const L = 100000;
const five = poTd(L, RATES[5], 5);
const one = poTd(L, RATES[1], 1);

function Body() {
    const amounts = [10000, 50000, 100000, 200000, 500000, 1000000];
    const big = poTd(500000, RATES[5], 5);
    const three = poTd(L, RATES[3], 3);
    return (
        <>
            <Section title={`What ${inr(L)} earns, by tenure`}>
                <DataTable
                    caption={`Post Office Time Deposit of ${inr(L)} at ${SMALL_SAVINGS.label} rates`}
                    head={['Tenure', 'Rate a year', 'Effective yield', 'Interest every year', 'Total interest', 'Deposit + interest']}
                    rows={TENURES.map((y) => {
                        const t = poTd(L, RATES[y], y);
                        return [`${y} year${y === 1 ? '' : 's'}`, `${RATES[y]}%`, pct(t.effectiveYield), inr(t.yearlyInterest), inr(t.interest), inr(t.total)];
                    })}
                    note="Interest is compounded quarterly within each year and paid out at the end of the year; the deposit comes back at maturity. Interest you leave in the account earns nothing more."
                />
            </Section>

            <Section title="Yearly interest on a 5-year TD, by amount">
                <DataTable
                    caption={`5-year Post Office TD at ${RATES[5]}%`}
                    head={['Deposit', 'Interest every year', 'Interest over 5 years', 'Deposit + interest']}
                    rows={amounts.map((a) => { const t = poTd(a, RATES[5], 5); return [inr(a), inr(t.yearlyInterest), inr(t.interest), inr(t.total)]; })}
                />
            </Section>

            <Section title="How the interest is worked out">
                <ol className="steps">
                    <li>The yearly rate is split into four quarters: {RATES[5]}% ÷ 4 = {pct(RATES[5] / 4, 3)} a quarter.</li>
                    <li>It compounds over the four quarters of the year: (1 + {RATES[5] / 400})<sup>4</sup> − 1 = {pct(five.effectiveYield)}. On {inr(L)} that is {inr(five.yearlyInterest)}.</li>
                    <li>That interest is paid to you at the end of every year. It is not added to the deposit, so each year pays the same {inr(five.yearlyInterest)}: {inr(five.interest)} over 5 years.</li>
                    <li>At maturity the {inr(L)} deposit is paid back. To earn on the yearly interest, you have to reinvest it yourself.</li>
                </ol>
            </Section>

            <Section title="Closing a TD early">
                <DataTable
                    caption="Premature closure rules (from the 2023 amendment)"
                    head={['When you close it', 'Interest you get']}
                    rows={[
                        ['Before 6 months', 'Not allowed'],
                        ['1, 2 or 3-year TD, after 6 months but before 1 year', `Post Office savings account rate (${R.savings}% now)`],
                        ['2 or 3-year TD, after 1 year', 'The rate for the shorter completed term, minus 2 percentage points'],
                        ['5-year TD, before 4 years', 'Not allowed'],
                        ['5-year TD, after 4 years', `Post Office savings account rate (${R.savings}% now)`],
                    ]}
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `${inr(L)} for 1 year`, body: <>Earns {inr(one.yearlyInterest)} at {RATES[1]}%, paid with the deposit at the end of the year: {inr(one.total)}.</> },
                    { title: `${amt(500000)} for 5 years`, body: <>Pays {inr(big.yearlyInterest)} every year — {amt(big.interest)} in all — and the {amt(500000)} comes back after 5 years.</> },
                    { title: '3 years or 5 years?', body: <>{inr(L)} for 3 years at {RATES[3]}% earns {inr(three.interest)}; for 5 years at {RATES[5]}%, {inr(five.interest)}. The 5-year TD can’t be closed in its first 4 years.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: `Rates for October–December 2026: 1 year ${RATES[1]}%, 2 years ${RATES[2]}%, 3 years ${RATES[3]}%, 5 years ${RATES[5]}% — unchanged since 1 January 2024. A TD keeps the rate it was opened at.`, source: DEA },
                { text: 'Interest is compounded quarterly and paid every year. No additional interest is paid on interest that has become due but is not withdrawn.', source: SCHEME },
                { text: 'Minimum deposit ₹1,000, then multiples of ₹100, with no upper limit.', source: SCHEME },
                { text: 'No closure in the first 6 months; a 5-year TD can be closed only after 4 years, at the savings account rate.', source: AMEND },
                { text: 'A 5-year TD qualifies for the deduction under section 123 of the Income-tax Act, 2025 (the old 80C) in the old regime only. The interest is taxable.', source: NSI },
            ]} />
        </>
    );
}

export const postOfficeTd: FeatureDef = {
    slug: 'post-office-td',
    title: `Post Office TD Calculator 2026: ${RATES[1]}% to ${RATES[5]}% Interest`,
    description: `Post Office Time Deposit interest at ${RATES[1]}–${RATES[5]}% for 1, 2, 3 and 5 years: yearly payout, maturity, how it is calculated and early-closure rules.`,
    h1: 'Post Office Time Deposit calculator: interest and maturity',
    crumb: 'Post Office TD',
    category: 'retire',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Post Office TD',
    eyebrow: `Post Office savings · ${SMALL_SAVINGS.label}`,
    answer: (
        <>
            <p>A {inr(L)} Post Office Time Deposit for 5 years at {RATES[5]}% pays {inr(five.yearlyInterest)} of interest every year — {inr(five.interest)} over 5 years — and the {inr(L)} comes back at maturity.</p>
            <p>Rates for October–December 2026 are {RATES[1]}% for 1 year, {RATES[2]}% for 2, {RATES[3]}% for 3 and {RATES[5]}% for 5 years. Interest is compounded quarterly but paid out yearly, so it doesn’t earn interest on itself.</p>
        </>
    ),
    sources: [SCHEME, DEA, AMEND],
    calc: { key: 'poTd', props: { amount: L, tenure: '5', r1: RATES[1], r2: RATES[2], r3: RATES[3], r5: RATES[5] } },
    Body,
    faqs: [
        { q: 'What are Post Office Time Deposit rates now?', a: `For October–December 2026: ${RATES[1]}% for 1 year, ${RATES[2]}% for 2 years, ${RATES[3]}% for 3 years and ${RATES[5]}% for 5 years, unchanged since 1 January 2024.` },
        { q: 'How much will ₹1 lakh earn in a 5-year Post Office TD?', a: `${inr(five.yearlyInterest)} a year at ${RATES[5]}%, ${inr(five.interest)} over 5 years. You get the ${inr(L)} back at maturity.` },
        { q: 'Is Post Office TD interest paid yearly or at maturity?', a: 'Yearly. It is compounded every quarter within the year and paid at the end of each year. Interest you leave in the account does not earn more interest.' },
        { q: 'Does a Post Office TD qualify for tax saving?', a: 'Only the 5-year TD, and only in the old regime, under section 123 of the Income-tax Act, 2025 (the old 80C). The interest from every TD is taxable.' },
        { q: 'Can I close a Post Office TD before maturity?', a: `Not in the first 6 months. A 1, 2 or 3-year TD closed between 6 and 12 months gets the savings account rate (${R.savings}% now); a 2 or 3-year TD closed after a year gets the rate for the shorter completed term minus 2 points. A 5-year TD can be closed only after 4 years, at the savings rate.` },
        { q: 'Post office FD kitna deta hai?', a: `Post office ka FD (Time Deposit) abhi 1 saal par ${RATES[1]}% aur 5 saal par ${RATES[5]}% deta hai. ${inr(L)} 5 saal ke liye rakhne par har saal ${inr(five.yearlyInterest)} byaj milta hai, kul ${inr(five.interest)}, aur ant mein ${inr(L)} wapas.` },
    ],
    related: [
        { href: '/post-office-mis', label: 'Post Office MIS calculator', note: 'Monthly income instead of yearly' },
        { href: '/fd', label: 'FD calculator', note: 'Compare a bank fixed deposit' },
        { href: '/nsc', label: 'NSC calculator', note: '5-year certificate, interest reinvested' },
        { href: '/sukanya-samriddhi', label: 'Sukanya Samriddhi calculator', note: 'Higher-rate savings for a daughter' },
    ],
    disclaimer: 'deposit',
};
