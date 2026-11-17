/**
 * /epf — primary query "epf calculator" (SEO_PLAN.md §5d). Replaces the hand-written guide.
 * Figures: features/math-retire.epfProjection / epfMonthlySplit, copied from src/pages/EPFCalculator.tsx.
 * Rate (§8): 8.25% — declared for 2024-25 and recommended by the CBT for 2025-26 (PIB, 2 Mar 2026).
 * Wage ceiling ₹25,000 from 17 Sep 2026 (S.O. 5109(E); EPFO wage-ceiling FAQs). Facts and URLs:
 * seo/research/verified-facts-retire.md.
 */
import { epfMonthlySplit, epfProjection } from '../math-retire';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const CBT26 = { label: 'PIB, 2 Mar 2026: CBT recommends 8.25% for 2025-26', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2234502' };
const CBT24 = { label: 'PIB, 10 Feb 2024: 8.25% for 2023-24', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2004768' };
const CBT23 = { label: 'PIB, 28 Mar 2023: 8.15% for 2022-23', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=1911334' };
const WC_FAQ = { label: 'EPFO: wage ceiling FAQs (S.O. 5109(E))', url: 'https://pmvbry-cdn.epfindia.gov.in/wp-content/uploads/2026/09/EPFO_Wage_Ceiling_FAQs.pdf' };
const WC_PIB = { label: 'PIB, 23 Sep 2026: ceiling raised to ₹25,000', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2313829' };
const EPFO_FAQ = { label: 'EPFO FAQs', url: 'https://www.epfo.gov.in/faq-epfo/' };
const MOLE_FAQ = { label: 'Labour Ministry: FAQs on the Labour Codes (25 Oct 2026)', url: 'https://www.labour.gov.in/static/uploads/2026/11/da640b1558a315e81e22ce5ac12f463f.pdf' };

const RATE = 8.25;
const BASIC = 25000;
const AGE = 25;
const RETIRE = 58;
const HIKE = 5;
const main = epfProjection(BASIC, 12, RATE, AGE, RETIRE, HIKE);
const flat = epfProjection(BASIC, 12, RATE, AGE, RETIRE, 0);
const split = epfMonthlySplit(BASIC);
const paise = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Body() {
    const basics = [15000, 20000, 25000, 40000, 60000, 100000];
    const spans = [10, 20, 30];
    const splits = [15000, 20000, 25000, 35000, 50000];
    const y1 = main.schedule[0];
    const sumBal = 66 * split.intoEpf;          // 0 + 1 + … + 11 months of contributions in the account
    const twenty = epfProjection(20000, 12, RATE, 30, RETIRE, HIKE);
    const vpf = epfProjection(50000, 22, RATE, 30, RETIRE, HIKE);
    const noVpf = epfProjection(50000, 12, RATE, 30, RETIRE, HIKE);
    const late = epfProjection(40000, 12, RATE, 40, RETIRE, HIKE);
    const low = epfProjection(BASIC, 12, 8.15, AGE, RETIRE, HIKE);
    return (
        <>
            <Section title="How the EPF balance is worked out">
                <ol className="steps">
                    <li>You pay 12% of basic pay + DA: on {inr(BASIC)} that is {inr(split.emp)} a month.</li>
                    <li>Your employer also pays 12%, but 8.33% of pay (up to the {inr(25000)} ceiling) goes to the Employees’ Pension Scheme: {paise(split.eps)}. The remaining {paise(split.employerEpf)} goes into your EPF account.</li>
                    <li>So {paise(split.intoEpf)} reaches EPF every month. Interest is worked out on the balance at each month-end before that month’s deposit, so in year one the balances add up to 66 × {paise(split.intoEpf)} = {inr(sumBal)}.</li>
                    <li>That total × {RATE}% ÷ 12 = {inr(y1.interest)} of interest, credited at the end of the year. The year closes at {inr(y1.closingBal)}, and next year’s interest is earned on that.</li>
                    <li>Repeat for every year to {RETIRE}, with pay rising {HIKE}% a year: the balance reaches {amt(main.corpus)}. Without any raise it would be {amt(flat.corpus)}.</li>
                </ol>
            </Section>

            <Section title="EPF corpus at 58 by basic pay and years of service">
                <DataTable
                    caption={`EPF balance at retirement at ${RATE}%, pay rising ${HIKE}% a year`}
                    head={['Basic + DA now', ...spans.map((s) => `${s} years to go`)]}
                    rows={basics.map((b) => [inr(b), ...spans.map((s) => amt(epfProjection(b, 12, RATE, RETIRE - s, RETIRE, HIKE).corpus))])}
                    note="Employee 12% plus the employer’s share left after EPS, on full basic + DA; the same rate assumed every year."
                />
            </Section>

            <Section title={`Year by year: ${inr(BASIC)} basic from age ${AGE}`}>
                <DataTable
                    caption={`EPF account at ${RATE}% a year, basic rising ${HIKE}% a year`}
                    head={['Age', 'You pay in the year', 'Employer share to EPF', 'Interest', 'Balance at year end']}
                    rows={main.schedule.map((r) => [String(r.age), inr(r.empContrib), inr(r.emplerContrib), inr(r.interest), amt(r.closingBal)])}
                    note="From the second year the basic is above ₹25,000, so the EPS part stays at its cap and every extra rupee of the employer’s 12% lands in EPF."
                />
            </Section>

            <Section title="Monthly split of the 24% after the ₹25,000 ceiling">
                <DataTable
                    caption="Contributions on basic pay + DA, for an EPS member, from October 2026"
                    head={['Basic + DA', 'You (12%)', 'Employer to EPS', 'Employer to EPF', 'Total into EPF']}
                    rows={splits.map((b) => { const s = epfMonthlySplit(b); return [inr(b), inr(s.emp), paise(s.eps), paise(s.employerEpf), paise(s.intoEpf)]; })}
                    note="EPS takes 8.33% of pay up to ₹25,000, so at most ₹2,083 a month. Someone not in EPS (for example, a new joiner earning above the ceiling) has the employer’s whole 12% credited to EPF. The employer also pays 0.5% for EDLI insurance and 0.5% admin charges, which don’t reach your account."
                />
            </Section>

            <Section title="EPF interest rate by year">
                <DataTable
                    caption="Rate recommended by EPFO’s Central Board of Trustees for each financial year"
                    head={['Financial year', 'Rate']}
                    rows={[['2022-23', '8.15%'], ['2023-24', '8.25%'], ['2024-25', '8.25% (declared)'], ['2025-26', '8.25% (recommended on 2 March 2026)']]}
                    note="The Board recommends a rate after the year ends; EPFO credits it once the Government notifies it. Interest compounds on the monthly running balance."
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `${inr(20000)} basic, newly covered`, body: <>Pay between ₹15,000 and ₹25,000 now brings compulsory EPF and EPS membership (from 17 September 2026). Joining at 30 with {inr(20000)} and {HIKE}% raises, the EPF account reaches about {amt(twenty.corpus)} at 58.</> },
                    { title: 'Adding 10% VPF', body: <>On {inr(50000)} basic from age 30, the standard 12% builds {amt(noVpf.corpus)} by 58. Paying 22% (12% + 10% voluntary) lifts it to {amt(vpf.corpus)}; the employer’s share does not change.</> },
                    { title: 'Starting at 40', body: <>{inr(40000)} basic with 18 years left grows to about {amt(late.corpus)}, of which {amt(late.totalInterest)} is interest.</> },
                    { title: 'If the rate drops to 8.15%', body: <>The {inr(BASIC)} case above ends at {amt(low.corpus)} instead of {amt(main.corpus)} — a 0.1-point lower rate for 33 years.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Employee and employer each contribute 12% of wages (basic pay, DA and retaining allowance).', source: MOLE_FAQ },
                { text: 'Of the employer’s 12%, 8.33% goes to EPS and 3.67% to EPF; the wage ceiling is ₹25,000 a month from 17 September 2026 (was ₹15,000), so the EPS share is at most ₹2,083.', source: WC_FAQ },
                { text: 'EPS membership is open only to employees whose wages, when they joined or on 17 September 2026, did not exceed the ceiling.', source: WC_FAQ },
                { text: 'An employer may contribute voluntarily on wages above the ₹25,000 ceiling.', source: MOLE_FAQ },
                { text: `Rate: ${RATE}% declared for 2024-25 and recommended for 2025-26; interest is credited only after the Government notifies it.`, source: CBT26 },
                { text: 'Interest is compounded on the monthly running balance; an account turns inoperative, and stops earning, 36 months after retirement at 55 or later.', source: EPFO_FAQ },
                { text: 'Earlier years: 8.15% for 2022-23 and 8.25% for 2023-24.', source: CBT23 },
                { text: 'The 2023-24 rate of 8.25% was the Board’s recommendation of 10 February 2024.', source: CBT24 },
                { text: 'The ceiling revision follows the Union Cabinet decision and Gazette notification S.O. 5109(E).', source: WC_PIB },
            ]} />
        </>
    );
}

export const epf: FeatureDef = {
    slug: 'epf',
    title: `EPF Calculator 2026: PF Balance at ${RATE}% Interest`,
    description: `EPF calculator with the ₹25,000 wage ceiling: employee 12%, employer EPF and EPS split, ${RATE}% interest, year-by-year balance to 58 and rate history.`,
    h1: 'EPF calculator: provident fund balance at retirement',
    crumb: 'EPF',
    category: 'retire',
    updated: '2026-11-17',
    analyticsTitle: 'Website - EPF',
    eyebrow: `Provident fund · ${RATE}% · ₹25,000 ceiling`,
    answer: (
        <>
            <p>With {inr(BASIC)} basic pay + DA at age {AGE}, a {HIKE}% raise every year and {RATE}% interest, your EPF account holds about {amt(main.corpus)} at {RETIRE}: {amt(main.totalEmp)} from you, {amt(main.totalEmployer)} from your employer and {amt(main.totalInterest)} of interest.</p>
            <p>{RATE}% is the rate declared for 2024-25 and recommended by EPFO’s board for 2025-26 on 2 March 2026. Since 17 September 2026 contributions use a wage ceiling of {inr(25000)} instead of ₹15,000.</p>
        </>
    ),
    sources: [CBT26, WC_FAQ, EPFO_FAQ],
    calc: { key: 'epf', props: { basic: BASIC, age: AGE, retire: RETIRE, hike: HIKE, rate: RATE } },
    Body,
    faqs: [
        { q: 'What is the EPF interest rate for 2025-26?', a: `${RATE}%, as recommended by EPFO’s Central Board of Trustees on 2 March 2026 — the same as the rate declared for 2024-25. EPFO credits it after the Government notifies the rate.` },
        { q: 'How much of my employer’s 12% goes to EPF?', a: `Whatever is left after 8.33% of pay (on pay up to ${inr(25000)}) goes to the pension scheme. On ${inr(BASIC)} that is ${paise(split.employerEpf)} to EPF and ${paise(split.eps)} to EPS; above ₹25,000 of pay, the EPS part stays at about ₹2,083.` },
        { q: 'What changed with the ₹25,000 wage ceiling?', a: 'From 17 September 2026, EPF and EPS are compulsory for employees earning up to ₹25,000 a month (earlier ₹15,000), and the maximum employer EPS contribution rose from ₹1,250 to ₹2,083 a month.' },
        { q: 'How is EPF interest calculated?', a: 'Monthly, on the running balance, and added to the account once a year. This calculator, like the FinCalix app, counts each deposit from the month after it is paid, so year one earns less than a full 12 months on every rupee.' },
        { q: 'Does EPF keep earning interest after I leave my job?', a: 'Yes, until the account becomes inoperative: 36 months after you retire at 55 or later. If you leave work before 55, interest continues until you turn 58.' },
        { q: 'PF calculation kaise hota hai?', a: `Basic + DA ka 12% aapki salary se katta hai aur 12% employer deta hai; employer ke hisse mein se 8.33% (₹25,000 tak) pension (EPS) mein jaata hai, baaki EPF mein. ${inr(BASIC)} basic par har mahine ${paise(split.intoEpf)} EPF mein jaata hai, aur us par ${RATE}% saalana byaj mahine ke balance par lagta hai.` },
    ],
    related: [
        { href: '/nps', label: 'NPS calculator', note: 'Pension savings on top of EPF' },
        { href: '/gratuity', label: 'Gratuity calculator', note: 'The other lump sum your employer pays' },
        { href: '/ppf', label: 'PPF calculator', note: 'Long-term savings if you are self-employed' },
        { href: '/salary-hike', label: 'Salary hike calculator', note: 'How a raise changes your take-home pay' },
        { href: '/financial-planning', label: 'Financial planning', note: 'Put EPF into a full retirement plan' },
    ],
    disclaimer: { text: 'EPF figures are projections that assume the same interest rate every year, contributions on your full basic pay + DA and EPS membership. EPFO declares the rate each year and credits interest after Government approval; your passbook on the EPFO member portal is the record. FinCalix is not affiliated with EPFO.' },
};
