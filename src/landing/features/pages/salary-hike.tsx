/**
 * /salary-hike — primary query "salary hike calculator" (SEO_PLAN.md §5c). Hike arithmetic copied from
 * the app's Salary Hike screen (math-tax.salaryHike); tax from the app's compareSalaryTax (new regime).
 * Rules: seo/research/verified-facts-2026-11-17.md (slabs, standard deduction, rebate, surcharge).
 */
import { compareSalaryTax } from '../../../utils/incomeTax';
import { salaryHike } from '../math-tax';
import { amt, inr, pct, taxText } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const FA26 = { label: 'Finance Act, 2026', url: 'https://egazette.gov.in/WriteReadData/2026/271439.pdf' };

/** One hike: new salary, tax before and after (new regime), and what is left in hand. */
function hike(current: number, pctHike: number) {
    const h = salaryHike('findSalary', current, 0, pctHike);
    const c0 = compareSalaryTax(current, 0);
    const c1 = compareSalaryTax(h.newSalary, 0);
    const extraTax = c1.newTax.totalTax - c0.newTax.totalTax;
    return { ...h, current, c0, c1, extraTax, kept: h.hikeAmount - extraTax };
}
function offer(current: number, offered: number) {
    const h = salaryHike('findHike', current, offered, 0);
    const extraTax = compareSalaryTax(offered, 0).newTax.totalTax - compareSalaryTax(current, 0).newTax.totalTax;
    return { ...h, extraTax, kept: h.hikeAmount - extraTax };
}

const main = hike(1500000, 10);
const cliff = hike(1200000, 8);
const switchJob = offer(1300000, 1800000);
const low = hike(600000, 20);
const high = hike(4800000, 10);
const at30 = hike(3000000, 10);
const monthly = salaryHike('findSalary', 100000, 0, 10);

const HIKES = [5, 8, 10, 12, 15, 20, 30];
const BASES = [500000, 800000, 1000000, 1200000, 1500000, 2000000, 2500000, 3000000];
const TAX_ROWS = [600000, 1000000, 1200000, 1500000, 1800000, 2000000, 2500000, 3000000, 4000000, 4800000];

function Body() {
    return (
        <>
            <Section title="How the hike and the new salary are worked out">
                <ol className="steps">
                    <li><strong>Hike percentage</strong> = (new salary − current salary) ÷ current salary × 100.</li>
                    <li><strong>New salary</strong> = current salary × (1 + hike% ÷ 100). Use the same figure, gross salary or CTC, on both sides, and the same period, monthly or yearly.</li>
                    <li><strong>In hand</strong>: the hike less the extra income tax it brings. Tax here is the new regime for FY 2026-27, after the {inr(75000)} standard deduction.</li>
                </ol>
                <DataTable
                    caption={`A 10% hike on ${amt(1500000)}, new regime, FY 2026-27`}
                    head={['Step', 'Before', 'After']}
                    rows={[
                        ['Gross salary', inr(main.current), inr(main.newSalary)],
                        ['Taxable income (− ₹75,000)', inr(main.c0.newTaxableIncome), inr(main.c1.newTaxableIncome)],
                        ['Slab tax', inr(main.c0.newTax.rawTax), inr(main.c1.newTax.rawTax)],
                        ['+ 4% cess = tax for the year', inr(main.c0.newTax.totalTax), inr(main.c1.newTax.totalTax)],
                        ['Salary after tax', inr(main.current - main.c0.newTax.totalTax), inr(main.newSalary - main.c1.newTax.totalTax)],
                    ]}
                    note={`The hike is ${inr(main.hikeAmount)} a year; ${inr(main.extraTax)} of it goes in tax, so take-home rises by ${inr(main.kept)} a year, about ${inr(main.kept / 12)} a month. Computed with the FinCalix app's tax code.`}
                />
            </Section>

            <Section title="New salary for each hike percentage">
                <DataTable
                    caption="Yearly gross salary after the hike"
                    head={['Current salary', ...HIKES.map((h) => `${h}%`)]}
                    rows={BASES.map((b) => [amt(b), ...HIKES.map((h) => inr(salaryHike('findSalary', b, 0, h).newSalary))])}
                />
            </Section>

            <Section title="How much of a 10% hike you keep after tax">
                <DataTable
                    caption="New regime, FY 2026-27: extra tax and extra take-home from a 10% hike"
                    head={['Current salary', 'Hike a year', 'Extra tax', 'Extra take-home a month', 'Share of hike kept']}
                    rows={TAX_ROWS.map((s) => {
                        const x = hike(s, 10);
                        return [amt(s), inr(x.hikeAmount), taxText(x.extraTax), inr(x.kept / 12), pct((x.kept / x.hikeAmount) * 100, 1)];
                    })}
                    note="Tax includes the rebate up to ₹60,000 (taxable income up to ₹12 lakh), marginal relief, surcharge above ₹50 lakh and 4% cess. Employee PF and professional tax also come out of monthly pay and are not included."
                />
            </Section>

            <Section title="Five hikes with real numbers">
                <Scenarios items={[
                    {
                        title: `${amt(1200000)} with an 8% hike: crossing the rebate line`,
                        body: <>At {amt(1200000)} you pay no tax, because taxable income ({inr(cliff.c0.newTaxableIncome)}) is within the {inr(1200000)} rebate limit. The hike to {inr(cliff.newSalary)} lifts taxable income to {inr(cliff.c1.newTaxableIncome)}; marginal relief caps the tax at the amount above {inr(1200000)} plus cess, {inr(cliff.extraTax)}. You still keep {inr(cliff.kept)} of the {inr(cliff.hikeAmount)} hike.</>,
                    },
                    {
                        title: `Job switch from ${amt(1300000)} to ${amt(1800000)}`,
                        body: <>That is a {pct(switchJob.hikePct)} hike, {inr(switchJob.hikeAmount)} a year. New-regime tax rises by {inr(switchJob.extraTax)}, so take-home goes up by about {inr(switchJob.kept / 12)} a month.</>,
                    },
                    {
                        title: `${amt(600000)} with a 20% hike`,
                        body: <>The new salary of {inr(low.newSalary)} is still within the rebate, so the tax stays {taxText(low.c1.newTax.totalTax)} and the whole {inr(low.hikeAmount)} reaches you, {inr(low.hikeMonthly)} a month.</>,
                    },
                    {
                        title: `${amt(4800000)} with a 10% hike`,
                        body: <>The new salary of {amt(high.newSalary)} takes taxable income past {amt(5000000)}, so a 10% surcharge applies, with marginal relief. Extra tax: {inr(high.extraTax)} on a {inr(high.hikeAmount)} hike; take-home rises by {inr(high.kept)} a year.</>,
                    },
                    {
                        title: 'A 10% hike on a monthly salary',
                        body: <>On {inr(100000)} a month, a 10% hike gives {inr(monthly.newSalary)} a month. The percentage is the same whether you work monthly or yearly; only tax has to be worked out on the yearly figure.</>,
                    },
                ]} />
            </Section>

            <Section title="Does a hike push you into a higher slab?">
                <p>
                    Only the part of your income inside each slab is taxed at that slab’s rate, so a hike never leaves you with less.
                    In the table above, a 10% hike at {amt(1000000)} reaches you in full, while at {amt(3000000)} you keep
                    {' '}{pct((at30.kept / at30.hikeAmount) * 100, 1)} of it, because every extra rupee there is taxed at 30% plus cess.
                    For tax on your whole salary, slab by slab, see the income tax calculator; if you claim large deductions, check
                    whether the old regime suits your new salary.
                </p>
            </Section>

            <Section title="More in the app">
                <p>
                    The salary hike calculator in the FinCalix app also splits a CTC into fixed and variable pay, estimates monthly
                    take-home after PF and professional tax, and compares two job offers side by side. No login, and it works offline.
                </p>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'New regime slabs for tax year 2026-27 (section 202): nil to ₹4 lakh, then 5%, 10%, 15%, 20%, 25% for each ₹4 lakh, 30% above ₹24 lakh; standard deduction ₹75,000.', source: ACT },
                { text: 'Rebate up to ₹60,000 when taxable income is up to ₹12 lakh, with marginal relief just above (section 156).', source: ACT },
                { text: 'Surcharge of 10% above ₹50 lakh (higher tiers above ₹1 crore and ₹2 crore, capped at 25% in the new regime) and 4% health and education cess.', source: FA26 },
            ]} />
        </>
    );
}

export const salaryHikePage: FeatureDef = {
    slug: 'salary-hike',
    title: 'Salary Hike Calculator: New Salary and In-Hand After Tax',
    description: 'Salary hike calculator: hike percentage, new salary and how much of the raise you keep after new-regime tax in FY 2026-27, with tables by salary.',
    h1: 'Salary hike calculator: your new salary and what you keep after tax',
    crumb: 'Salary hike',
    category: 'tax',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Salary Hike',
    eyebrow: 'Salary · appraisal · FY 2026-27',
    answer: (
        <>
            <p>A 10% hike on a {amt(1500000)} salary takes it to {inr(main.newSalary)}, {inr(main.hikeAmount)} more a year. Under the new regime for FY 2026-27, {inr(main.extraTax)} of that goes in extra income tax, so your take-home rises by about {inr(main.kept / 12)} a month.</p>
            <p>Hike % = (new salary − old salary) ÷ old salary × 100. Tax uses the section 202 slabs of the Income-tax Act, 2025 with the {inr(75000)} standard deduction.</p>
        </>
    ),
    sources: [ACT, FA26],
    calc: { key: 'salary-hike', props: { mode: 'findSalary', current: 1500000, hike: 10, offered: 1800000 } },
    Body,
    faqs: [
        {
            q: 'How do I calculate my salary hike percentage?',
            a: `Subtract your old salary from the new one, divide by the old salary and multiply by 100. Going from ${amt(1300000)} to ${amt(1800000)} is a ${pct(switchJob.hikePct)} hike. Compare like with like: CTC with CTC, or gross with gross.`,
        },
        {
            q: 'How much will my in-hand salary increase after a 10% hike?',
            a: `Less than 10%, once tax is taken out, unless you stay within the rebate limit. On ${amt(1500000)}, a 10% hike adds ${inr(main.hikeAmount)} a year but ${inr(main.extraTax)} of it is extra new-regime tax, leaving about ${inr(main.kept / 12)} a month more in hand, before any change in PF.`,
        },
        {
            q: 'Can a salary hike reduce my take-home pay?',
            a: `No. Each slab rate applies only to the income inside that slab, and marginal relief stops the tax just above ${inr(1200000)} of taxable income from exceeding the income above that limit. Even crossing it, a hike from ${amt(1200000)} by 8% leaves you ${inr(cliff.kept)} better off for the year.`,
        },
        {
            q: 'How do I calculate the hike on a monthly salary?',
            a: `Multiply the monthly salary by (1 + hike% ÷ 100): ${inr(100000)} a month with a 10% hike becomes ${inr(monthly.newSalary)}. Work out tax on the yearly figure, since slabs are yearly.`,
        },
        {
            q: 'Is my whole hike taxed at 30%?',
            a: `Only if your taxable income is already above ${amt(2400000)} in the new regime, where every extra rupee is taxed at 30% plus cess (and surcharge once taxable income passes ₹50 lakh). Below that, the hike is taxed at the rate of the slab it falls in, from nil up to 25%.`,
        },
    ],
    related: [
        { href: '/income-tax', label: 'Income tax calculator FY 2026-27', note: 'Tax on your new salary, slab by slab' },
        { href: '/old-vs-new-tax-regime', label: 'Old vs new tax regime', note: 'Which regime suits your new pay' },
        { href: '/hra', label: 'HRA exemption calculator', note: 'Rent exemption if you choose the old regime' },
        { href: '/epf', label: 'EPF calculator', note: 'How your PF grows with a higher basic' },
        { href: '/sip', label: 'SIP calculator', note: 'Invest part of the raise every month' },
    ],
    disclaimer: 'tax',
};
