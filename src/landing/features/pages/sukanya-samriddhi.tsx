/**
 * /sukanya-samriddhi — primary query "sukanya samriddhi yojana calculator" (SEO_PLAN.md §5d).
 * Replaces the hand-written guide and the /schemes/c-ssy page (308 → here). Projections: the app's
 * SSY formula (features/math.ssyProjection, copied from SSYCalculator.tsx); current rate: the app's
 * SMALL_SAVINGS. Rules and rate history: seo/research/verified-facts-2026-11-17.md.
 */
import { SMALL_SAVINGS } from '../../../data/rateEnvironment';
import { ssyProjection } from '../math';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RULES = { label: 'Sukanya Samriddhi Account Scheme, 2019 (NSI)', url: 'http://www.nsiindia.gov.in/writereaddata/SchemeRules/SukanyaSamriddhiAccountSchemeRule.pdf' };
const NSI = { label: 'National Savings Institute: SSY', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=89' };
const RATES = { label: 'NSI interest rate table', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=132' };
const DEA = { label: 'DEA small savings rate notices', url: 'http://www.dea.gov.in/budget-division/475' };

const RATE = SMALL_SAVINGS.rates.ssy;            // 8.2 for Oct–Dec 2026 (DEA OM 30.09.2026)
const MAX = 150000;
const main = ssyProjection(MAX, RATE, 5);
const born = ssyProjection(MAX, RATE, 0);

function Body() {
    const deposits = [12000, 25000, 50000, 100000, 150000];
    const low = ssyProjection(MAX, 7.6, 0);
    const small = ssyProjection(12000, RATE, 2);
    return (
        <>
            <Section title="Maturity value by yearly deposit">
                <DataTable
                    caption={`Sukanya Samriddhi at ${RATE}% a year, account opened at birth (deposits for 15 years, maturity at 21)`}
                    head={['Yearly deposit', 'Monthly equivalent', 'You deposit', 'Interest earned', 'Maturity value']}
                    rows={deposits.map((d) => {
                        const r = ssyProjection(d, RATE, 0);
                        return [inr(d), inr(d / 12), amt(r.invested), amt(r.interest), amt(r.maturity)];
                    })}
                    note="Assumes the full year’s deposit is made by 5 April and today’s rate holds for all 21 years — the same method as the FinCalix app."
                />
            </Section>

            <Section title={`Year by year: ${inr(MAX)} a year, account opened at age 5`}>
                <DataTable
                    caption={`Balance at the end of each financial year at ${RATE}%`}
                    head={['Year', 'Girl’s age', 'Deposit', 'Interest credited', 'Balance']}
                    rows={main.timeline.map((r) => [String(r.year), String(r.age), r.deposit ? inr(r.deposit) : '—', inr(r.interest), amt(r.balance)])}
                    note={`Deposits stop after year 15; the balance keeps earning interest until the account matures in year 21, when she is ${main.maturityAge}.`}
                />
            </Section>

            <Section title="Interest rate history">
                <DataTable
                    caption="Sukanya Samriddhi interest rate set by the Government"
                    head={['Period', 'Rate a year']}
                    rows={[
                        ['1 Apr 2020 – 31 Mar 2023', '7.6%'],
                        ['1 Apr 2023 – 31 Dec 2023', '8.0%'],
                        ['1 Jan 2024 – 31 Dec 2026', `${RATE}%`],
                    ]}
                    note="The rate is reviewed every quarter and applies to the whole balance of every account, not just new deposits."
                />
            </Section>

            <Section title="How the interest is worked out">
                <ol className="steps">
                    <li>Interest is calculated every month on the lowest balance between the close of the 5th and the end of the month, so a deposit made by the 5th earns interest for that month.</li>
                    <li>The month’s interest is {RATE}% ÷ 12 of that balance; the year’s interest is added to the account at the end of the financial year (31 March), so it compounds yearly.</li>
                    <li>Example: {inr(MAX)} deposited by 5 April earns {inr(Math.round((MAX * RATE) / 100))} in its first year ({inr(MAX)} × {RATE}%). The next year’s interest is on {inr(MAX + Math.round((MAX * RATE) / 100))} plus that year’s deposit.</li>
                </ol>
            </Section>

            <Section title="Who can open it, and how">
                <div className="cols">
                    <div>
                        <h3>Eligibility</h3>
                        <ul>
                            <li>A girl below 10, by a parent or legal guardian</li>
                            <li>One account per girl; up to two girls per family (more for twins or triplets in the first or second birth)</li>
                            <li>Minimum {inr(250)} and maximum {inr(MAX)} each financial year, in multiples of ₹50</li>
                        </ul>
                    </div>
                    <div>
                        <h3>Documents and opening</h3>
                        <ul>
                            <li>The girl’s birth certificate</li>
                            <li>Identity and address proof (KYC) of the parent or guardian</li>
                            <li>Open it at any post office or authorised bank branch with the account opening form and the first deposit</li>
                        </ul>
                    </div>
                </div>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `Opened at birth, ${inr(MAX)} every year`, body: <>The account matures at 21 with about {amt(born.maturity)}: {amt(born.invested)} deposited and {amt(born.interest)} of interest.</> },
                    { title: 'Taking money out for college', body: <>For the account opened at age 5 above, the balance when she turns 18 is about {amt(main.at18?.balance ?? 0)}; up to half of the previous year-end balance can be withdrawn for her education.</> },
                    { title: `${inr(1000)} a month (${inr(12000)} a year), opened at age 2`, body: <>Matures at 23 with about {amt(small.maturity)} from {amt(small.invested)} of deposits.</> },
                    { title: 'If the rate goes back to 7.6%', body: <>At the 2020–2023 rate of 7.6% for all 21 years, {inr(MAX)} a year from birth would mature at about {amt(low.maturity)} instead of {amt(born.maturity)}.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Deposits for 15 years from opening; the account matures 21 years from opening. A year with less than the minimum deposit can be regularised by paying ₹50 for each year missed plus the minimum deposits.', source: RULES },
                { text: 'Up to 50% of the balance at the end of the previous financial year can be withdrawn for education once she turns 18 or passes Class 10. The account can be closed early for her marriage after she turns 18.', source: RULES },
                { text: `Interest rate for October–December 2026: ${RATE}% a year, unchanged since 1 January 2024.`, source: DEA },
                { text: 'Deposits qualify for the deduction under section 123 of the Income-tax Act, 2025 (the old 80C) in the old regime only; NSI states that the interest is exempt from income tax.', source: NSI },
                { text: 'Rate history from the National Savings Institute.', source: RATES },
            ]} />
        </>
    );
}

export const sukanyaSamriddhi: FeatureDef = {
    slug: 'sukanya-samriddhi',
    title: `Sukanya Samriddhi Calculator 2026: ${RATE}% SSY Maturity`,
    description: `Sukanya Samriddhi maturity at ${RATE}% for any yearly deposit, with a year-by-year table, rate history, withdrawal rules, eligibility and documents.`,
    h1: 'Sukanya Samriddhi Yojana calculator: maturity, rules and how to open',
    crumb: 'Sukanya Samriddhi',
    category: 'retire',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Sukanya Samriddhi',
    eyebrow: `Government savings · ${RATE}% for Oct–Dec 2026`,
    answer: (
        <>
            <p>Depositing {inr(MAX)} a year in a Sukanya Samriddhi account opened at birth grows to about {amt(born.maturity)} when she turns 21, at the current {RATE}% a year: {amt(born.invested)} of deposits and {amt(born.interest)} of interest.</p>
            <p>You deposit for 15 years; the account matures 21 years after opening. The {RATE}% rate applies for October–December 2026 and is reviewed every quarter.</p>
        </>
    ),
    sources: [RULES, DEA, NSI],
    calc: { key: 'ssy', props: { yearly: MAX, age: 5, rate: RATE } },
    Body,
    faqs: [
        { q: 'What is the maturity amount for ₹1.5 lakh a year in Sukanya Samriddhi?', a: `About ${amt(born.maturity)} if the account is opened at birth and the rate stays at ${RATE}% for all 21 years. You deposit ${amt(born.invested)} over 15 years.` },
        { q: 'What is the Sukanya Samriddhi interest rate now?', a: `${RATE}% a year for October–December 2026, unchanged since 1 January 2024. It was 8.0% from April to December 2023 and 7.6% before that.` },
        { q: 'When can I withdraw money from a Sukanya Samriddhi account?', a: 'Up to 50% of the previous year-end balance can be withdrawn for education after she turns 18 or passes Class 10. The full amount is paid at maturity, 21 years after opening, or earlier if the account is closed for her marriage after 18.' },
        { q: 'What happens if I miss a deposit?', a: 'The account becomes a defaulted account but keeps earning interest. You can regularise it within the 15-year deposit period by paying ₹50 for each year missed plus the minimum ₹250 for each of those years.' },
        { q: 'Is Sukanya Samriddhi tax-free?', a: 'Deposits qualify for the section 123 deduction (the old 80C) in the old regime only, and NSI states that the interest is exempt from income tax. In the new regime there is no deduction for the deposit.' },
        { q: 'Can I open Sukanya Samriddhi accounts for two daughters?', a: 'Yes: one account per girl and up to two per family, with an exception for twins or triplets born in the first or second birth.' },
        { q: 'Sukanya Samriddhi Yojana ka calculation kaise karen?', a: `Har saal ka deposit 5 April tak jama karein; byaj har mahine sabse kam balance par ${RATE}% ÷ 12 se lagta hai aur saal ke ant mein judta hai. ${inr(MAX)} saalana, janm se, 21 saal baad lagbhag ${amt(born.maturity)} banta hai — upar ka calculator apni rakam ke saath chalaiye.` },
    ],
    related: [
        { href: '/sip-for-1-crore', label: 'SIP for ₹1 crore', note: 'A market-linked goal plan' },
        { href: '/ppf', label: 'PPF calculator', note: 'Another 15-year government savings scheme' },
        { href: '/post-office-td', label: 'Post Office Time Deposit', note: '1 to 5-year deposits at the post office' },
        { href: '/schemes', label: 'Government schemes', note: 'Every central scheme in the app, explained' },
    ],
    disclaimer: 'ssy',
};
