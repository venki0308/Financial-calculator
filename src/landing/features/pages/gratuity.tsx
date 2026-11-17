/**
 * /gratuity — primary query "gratuity calculator" (SEO_PLAN.md §5d). Replaces the hand-written guide.
 * Figures: features/math-retire.gratuityCalc, copied from src/pages/GratuityCalculator.tsx, always
 * called with whole counted years (a part-year counts only above six months, s.53(2)) and only for
 * five or more years (s.53(1)), so the app's ≥ 0.5-year rounding and 4-years-240-days threshold
 * never reach the page. Rules (§8): Code on Social Security, 2020, ss.53–54 (in force 21 Nov 2025),
 * Labour Ministry FAQs of 25 Oct 2026 (₹20 lakh ceiling, fixed-term after 1 year, 30 days to pay);
 * tax: Income-tax Act, 2025 s.19 Table Sl. 3, 5, 6 (the notified limit is not stated: not verified).
 * Facts: seo/research/verified-facts-retire.md.
 */
import { gratuityCalc } from '../math-retire';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const CODE = { label: 'Code on Social Security, 2020 (sections 53–54)', url: 'https://www.labour.gov.in/static/uploads/2025/07/b0620548445580767b5c0d18c95c26f7.pdf' };
const FAQ = { label: 'Labour Ministry: FAQs on the Labour Codes (25 Oct 2026)', url: 'https://www.labour.gov.in/static/uploads/2026/11/da640b1558a315e81e22ce5ac12f463f.pdf' };
const ACT = { label: 'Income-tax Act, 2025 (section 19)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };

const WAGE = 50000;
const YEARS = 10;
const main = gratuityCalc(WAGE, YEARS);
const perYear = (WAGE * 15) / 26;
/** Gratuity for whole years plus extra months, counting the part-year only above six months. */
const forService = (wage: number, years: number, months: number) => gratuityCalc(wage, years + (months > 6 ? 1 : 0));

function Body() {
    const wages = [20000, 30000, 50000, 75000, 100000, 150000];
    const spans = [5, 10, 15, 20, 25, 30];
    const fteOne = gratuityCalc(20000, 1, { isFTE: true });
    const fteThree = gratuityCalc(35000, 3, { isFTE: true });
    const plain = gratuityCalc(25000, 10);
    const floored = gratuityCalc(25000, 10, { grossMonthly: 80000 });
    const capped = gratuityCalc(200000, 30);
    const five = forService(30000, 7, 5);
    const seven = forService(30000, 7, 7);
    const six = forService(30000, 7, 6);
    const longStay = gratuityCalc(75000, 25);
    return (
        <>
            <Section title="The gratuity formula, step by step">
                <ol className="steps">
                    <li>Take the last monthly wages: basic pay + dearness allowance, {inr(WAGE)} here.</li>
                    <li>One day’s wage is the month ÷ 26 (working days), so 15 days’ wages = {inr(WAGE)} × 15 ÷ 26 = {inr(perYear)}.</li>
                    <li>Count the years: every completed year, plus one more if the leftover part is more than six months. {YEARS} years exactly counts as {main.payoutYears}.</li>
                    <li>Multiply: {inr(perYear)} × {main.payoutYears} = {inr(main.gratuity)}. Payments are capped at {amt(2000000)}.</li>
                </ol>
            </Section>

            <Section title="Gratuity by last salary and years of service">
                <DataTable
                    caption="Gratuity at 15 days’ wages per year (wages ÷ 26 × 15), capped at ₹20 lakh"
                    head={['Last basic + DA', ...spans.map((s) => `${s} yrs`)]}
                    rows={wages.map((w) => [inr(w), ...spans.map((s) => { const g = gratuityCalc(w, s); return g.capped ? `${amt(g.gratuity)} (cap)` : amt(g.gratuity); })])}
                    note="Cells marked “cap” are where the formula exceeds ₹20 lakh, the ceiling notified by the Central Government; an employer may still pay more under a contract or award."
                />
            </Section>

            <Section title="When a part-year counts">
                <DataTable
                    caption={`Last wages ${inr(30000)} a month`}
                    head={['Service', 'Years counted', 'Gratuity']}
                    rows={[
                        ['7 years 5 months', String(five.payoutYears), inr(five.gratuity)],
                        ['7 years 6 months', String(six.payoutYears), inr(six.gratuity)],
                        ['7 years 7 months', String(seven.payoutYears), inr(seven.gratuity)],
                    ]}
                    note="The Code counts a part of a year only when it is in excess of six months, so exactly six extra months add nothing."
                />
            </Section>

            <Section title="Regular and fixed-term employees under the Code">
                <DataTable
                    caption="Code on Social Security, 2020, in force from 21 November 2025"
                    head={['', 'Regular employee', 'Fixed-term employee']}
                    rows={[
                        ['Minimum service', '5 years of continuous service', 'One year under the contract'],
                        ['How it is worked out', '15 days’ wages for each counted year', 'The same, paid pro rata'],
                        ['Paid when', 'Retirement, resignation, termination, death or disablement', 'When the contract ends, or earlier on death or disablement'],
                        ['Wages counted', 'Basic + DA; allowances above 50% of total pay are added back', 'Same'],
                        [`${inr(25000)} basic, ${inr(80000)} total pay, 10 years`, inr(floored.gratuity), inr(floored.gratuity)],
                        ['Ceiling', '₹20 lakh', '₹20 lakh'],
                    ]}
                    note={<>Without the 50% rule the same example would count only the {inr(25000)} basic and pay {inr(plain.gratuity)}. The new wages definition applies to everyone leaving on or after 21 November 2025, for their whole service.</>}
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: 'Fixed-term contract of one year', body: <>A fixed-term employee on {inr(20000)} a month who completes the one-year contract gets {inr(fteOne.gratuity)}. Over a three-year contract at {inr(35000)}, it is {inr(fteThree.gratuity)}.</> },
                    { title: 'Allowance-heavy pay', body: <>With {inr(25000)} basic in an {inr(80000)} package, half of total pay ({inr(floored.wageBase)}) counts as wages, so 10 years earns {inr(floored.gratuity)} instead of {inr(plain.gratuity)}.</> },
                    { title: '25 years at one company', body: <>Last wages of {inr(75000)} give {amt(longStay.gratuity)} — still under the ceiling.</> },
                    { title: 'A senior salary that hits the cap', body: <>{inr(200000)} a month for 30 years works out to {amt(capped.formulaGratuity)} by the formula, but the payable amount stops at {amt(capped.gratuity)}.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Payable on superannuation, retirement, resignation, death, disablement or the end of a fixed-term contract, after at least 5 years of continuous service; 5 years are not needed on death, disablement or expiry of a fixed-term contract.', source: CODE },
                { text: '15 days’ wages for every completed year, or part of a year in excess of six months, at the last wages drawn; for a monthly-rated employee, monthly wages ÷ 26 × 15. Seasonal workers get 7 days’ wages per season.', source: CODE },
                { text: 'Fixed-term employees are eligible after one year of service under the contract; the Code applies from 21 November 2025 and the maximum gratuity is ₹20 lakh as notified.', source: FAQ },
                { text: 'The employer must pay within 30 days of the gratuity becoming payable.', source: FAQ },
                { text: 'Gratuity may be forfeited, wholly or partly, if service is terminated for damage to the employer’s property, violence or an offence involving moral turpitude.', source: CODE },
                { text: 'Tax: death-cum-retirement gratuity of government employees is fully deductible; for other employees, section 19 limits the deductible part (for “any other gratuity”, the least of the amount received, half a month’s average salary per completed year and a limit the Central Government notifies).', source: ACT },
            ]} />
        </>
    );
}

export const gratuity: FeatureDef = {
    slug: 'gratuity',
    title: 'Gratuity Calculator 2026: Formula, Labour Code Rules',
    description: 'Gratuity calculator under the Code on Social Security: the 15/26 formula worked through, the ₹20 lakh cap, fixed-term after 1 year and the 50% wages rule.',
    h1: 'Gratuity calculator: how much you get when you leave',
    crumb: 'Gratuity',
    category: 'retire',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Gratuity',
    eyebrow: 'Code on Social Security, 2020 · in force 21 Nov 2025',
    answer: (
        <>
            <p>With last basic pay + DA of {inr(WAGE)} a month and {YEARS} years of service, your gratuity is {inr(main.gratuity)}: {inr(WAGE)} × 15 ÷ 26 × {YEARS}.</p>
            <p>Since 21 November 2025 gratuity follows the Code on Social Security, 2020: regular staff still need five years, fixed-term employees qualify after one, and the maximum stays at ₹20 lakh.</p>
        </>
    ),
    sources: [CODE, FAQ],
    calc: { key: 'gratuity', props: { wage: WAGE, years: YEARS } },
    Body,
    faqs: [
        { q: 'What is the gratuity formula?', a: 'Gratuity = last monthly wages × 15 ÷ 26 × years of service. Wages means basic pay + DA, and a part-year counts as a full year only if it is more than six months.' },
        { q: 'How much gratuity for 5 years of service?', a: `For 5 years it is about ${((15 * 5) / 26).toFixed(1)} months of wages: on ${inr(30000)} a month, ${inr(gratuityCalc(30000, 5).gratuity)}. Below 5 years nothing is payable to a regular employee unless the exit is due to death or disablement.` },
        { q: 'Do fixed-term employees get gratuity after one year?', a: 'Yes. Under the Code on Social Security, a fixed-term employee is eligible after one year of service under the contract, paid on a pro-rata basis.' },
        { q: 'What is the maximum gratuity?', a: '₹20 lakh, the ceiling notified by the Central Government and confirmed by the Labour Ministry’s FAQs. An employer can pay more under a contract, agreement or award.' },
        { q: 'Does the 50% wages rule change my gratuity?', a: `It can raise it. If allowances are more than half your total pay, the excess is treated as wages: ${inr(25000)} basic in an ${inr(80000)} package counts as ${inr(40000)}.` },
        { q: 'How soon must the employer pay gratuity?', a: 'Within 30 days from the date it becomes payable, to you or, after a death, to your nominee or heirs.' },
        { q: 'Gratuity kaise calculate karte hain?', a: `Aakhri basic + DA ko 26 se bhaag dekar 15 se guna karein, phir saal ki sankhya se. ${inr(WAGE)} par 10 saal ki gratuity ${inr(main.gratuity)} banti hai; 6 mahine se zyada ka hissa poora saal gina jaata hai.` },
    ],
    related: [
        { href: '/epf', label: 'EPF calculator', note: 'Your provident fund on the same salary' },
        { href: '/salary-hike', label: 'Salary hike calculator', note: 'A raise also lifts future gratuity' },
        { href: '/income-tax', label: 'Income tax calculator', note: 'Tax for the year you leave' },
        { href: '/nps', label: 'NPS calculator', note: 'Pension savings for after you retire' },
        { href: '/financial-planning', label: 'Financial planning', note: 'Plan around your exit benefits' },
    ],
    disclaimer: { text: 'Gratuity figures use the Code on Social Security formula on the wages you enter. Your employer’s records, any better terms in your contract, and government service rules (which have their own gratuity) decide the amount. Tax on gratuity depends on your case; FinCalix is not a legal or tax advisor.' },
};
