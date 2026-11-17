/**
 * /income-tax — primary query "income tax calculator fy 2026-27" (SEO_PLAN.md §5c). Replaces the
 * hand-written guide. New-regime tax by salary, marginal relief and surcharge; the regime comparison
 * lives on /old-vs-new-tax-regime. Figures: the app's compareSalaryTax (src/utils/incomeTax.ts).
 */
import { NEW_REGIME_2026_27, compareSalaryTax } from '../../../utils/incomeTax';
import { amt, inr, pct, taxText } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const FA26 = { label: 'Finance Act, 2026', url: 'https://egazette.gov.in/WriteReadData/2026/271439.pdf' };
const PORTAL = { label: 'Income Tax e-filing portal', url: 'https://www.incometax.gov.in/iec/foportal/' };

const t = (s: number) => compareSalaryTax(s, 0);
const at12 = t(1200000), at1275 = t(1275000), at15 = t(1500000), at20 = t(2000000), at25 = t(2500000), at60 = t(6000000);

function Body() {
    const salaries = [600000, 800000, 1000000, 1200000, 1275000, 1300000, 1400000, 1500000, 1600000, 1800000, 2000000, 2400000, 2500000, 3000000, 4000000, 5000000];
    const relief = [1275000, 1280000, 1285000, 1300000, 1325000, 1350000];
    return (
        <>
            <Section title="Tax on your salary in FY 2026-27 (new regime)">
                <DataTable
                    caption="New regime tax for a salaried resident below 60, after the ₹75,000 standard deduction"
                    head={['Salary (gross)', 'Taxable income', 'Tax for the year', 'About per month', 'Effective rate']}
                    rows={salaries.map((s) => {
                        const c = t(s);
                        return [amt(s), inr(c.newTaxableIncome), taxText(c.newTax.totalTax), taxText(c.newTax.totalTax / 12), pct((c.newTax.totalTax / s) * 100, 1)];
                    })}
                    note="Tax includes the rebate, marginal relief and 4% cess, computed with the same code as the FinCalix app. The new regime is the default; compare it with the old regime on the old vs new regime page."
                />
            </Section>

            <Section title="New regime slab rates">
                <DataTable
                    caption="Income-tax rates under section 202, FY 2026-27 (tax year 2026-27)"
                    head={['Taxable income', 'Rate', 'Tax on the full slab']}
                    rows={NEW_REGIME_2026_27.map((s) => [
                        s.max === Infinity ? `Above ${amt(s.min)}` : `${amt(s.min)} – ${amt(s.max)}`,
                        s.rate === 0 ? 'Nil' : `${s.rate}%`,
                        s.max === Infinity ? '—' : inr(((s.max - s.min) * s.rate) / 100),
                    ])}
                    note="Budget 2026 did not change these rates."
                />
            </Section>

            <Section title="How tax on a salary is worked out">
                <ol className="steps">
                    <li>Start with gross salary and subtract the {inr(75000)} standard deduction (and your employer’s NPS contribution, if any) to get taxable income.</li>
                    <li>Apply each slab in turn. For a {amt(2500000)} salary, taxable income is {inr(at25.newTaxableIncome)}: nothing on the first {amt(400000)}, then 5%, 10%, 15%, 20% and 25% on each {amt(400000)} band, and 30% on the rest — {inr(at25.newTax.rawTax)} in all.</li>
                    <li>Apply the rebate: if taxable income is up to {inr(1200000)}, tax up to {inr(60000)} is cancelled, so the tax is nil.</li>
                    <li>Add surcharge if taxable income is above {amt(5000000)}, then 4% health and education cess on the tax: {inr(at25.newTax.cess)} here, for a total of {inr(at25.newTax.totalTax)}.</li>
                </ol>
            </Section>

            <Section title="Just above ₹12 lakh: marginal relief">
                <p>
                    Without relief, earning one rupee over {inr(1200000)} of taxable income would cost about {inr(60000)} of tax. Marginal
                    relief caps the tax at the amount by which your taxable income exceeds {inr(1200000)}, until the normal tax is lower.
                </p>
                <DataTable
                    caption="Tax just above the rebate limit (new regime, salaried)"
                    head={['Salary (gross)', 'Taxable income', 'Slab tax', 'Tax after relief + cess']}
                    rows={relief.map((s) => { const c = t(s); return [amt(s), inr(c.newTaxableIncome), inr(c.newTax.rawTax), taxText(c.newTax.totalTax)]; })}
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `${amt(1275000)} salary`, body: <>Taxable income {inr(at1275.newTaxableIncome)} is within the rebate limit, so the tax is nil.</> },
                    { title: `${amt(1500000)} salary`, body: <>Taxable income {inr(at15.newTaxableIncome)}; tax {inr(at15.newTax.totalTax)} for the year, about {inr(at15.newTax.totalTax / 12)} a month deducted from salary.</> },
                    { title: `${amt(2000000)} salary`, body: <>Tax {inr(at20.newTax.totalTax)}, an effective rate of {pct((at20.newTax.totalTax / 2000000) * 100, 1)} of the salary.</> },
                    { title: `${amt(6000000)} salary: surcharge`, body: <>Taxable income above {amt(5000000)} attracts a 10% surcharge: tax {inr(at60.newTax.rawTax)}, surcharge {inr(at60.newTax.surcharge)}, cess {inr(at60.newTax.cess)}, total {inr(at60.newTax.totalTax)}.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'FY 2026-27 is tax year 2026-27, the first under the Income-tax Act, 2025. The new regime (section 202) is the default.', source: ACT },
                { text: 'Standard deduction ₹75,000 in the new regime; rebate up to ₹60,000 on taxable income up to ₹12 lakh, with marginal relief just above (section 156). The rebate does not cover tax on capital gains taxed at special rates.', source: ACT },
                { text: 'Surcharge: 10% above ₹50 lakh, 15% above ₹1 crore, 25% above ₹2 crore (the new regime stops at 25%); 4% health and education cess on tax plus surcharge.', source: FA26 },
                { text: 'Income-tax returns for tax year 2026-27 are due by 31 July 2027 for salaried people; employers issue the salary TDS certificate (Form No. 130, which replaces Form 16) by 15 June 2027.', source: PORTAL },
            ]} />
        </>
    );
}

export const incomeTax: FeatureDef = {
    slug: 'income-tax',
    title: 'Income Tax Calculator FY 2026-27 for Salaried',
    description: 'Income tax on your salary for FY 2026-27 under the new regime: slab rates, tax at every salary, marginal relief above ₹12 lakh and worked examples.',
    h1: 'Income tax calculator FY 2026-27: tax on your salary',
    crumb: 'Income tax',
    category: 'tax',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Income Tax',
    eyebrow: 'Income tax · FY 2026-27 (tax year 2026-27)',
    answer: (
        <>
            <p>In FY 2026-27 a salaried person pays no income tax on a salary up to {amt(1275000)} under the new regime: the {inr(75000)} standard deduction brings taxable income to {amt(1200000)}, and the rebate cancels the tax on it.</p>
            <p>Above that, tax rises by slab: {inr(at15.newTax.totalTax)} on {amt(1500000)}, {inr(at20.newTax.totalTax)} on {amt(2000000)} and {inr(at25.newTax.totalTax)} on {amt(2500000)}, including 4% cess.</p>
        </>
    ),
    sources: [ACT, FA26],
    calc: { key: 'incomeTax', props: { salary: 1500000, deductions: 0 } },
    Body,
    faqs: [
        { q: 'How much tax do I pay on a ₹12 lakh salary?', a: `None under the new regime. After the ${inr(75000)} standard deduction, taxable income is ${inr(at12.newTaxableIncome)}, within the ${inr(1200000)} rebate limit.` },
        { q: 'How much tax on a ₹15 lakh salary in FY 2026-27?', a: `${inr(at15.newTax.totalTax)} under the new regime, including 4% cess — about ${inr(at15.newTax.totalTax / 12)} a month.` },
        { q: 'How much tax on a ₹20 lakh salary?', a: `${inr(at20.newTax.totalTax)} under the new regime, including cess: an effective rate of ${pct((at20.newTax.totalTax / 2000000) * 100, 1)}.` },
        { q: 'Income tax kitna lagta hai?', a: `New regime mein ${amt(1275000)} tak ki salary par koi tax nahi lagta (${inr(75000)} standard deduction ke baad ${amt(1200000)} tak rebate milta hai). Uske upar slab ke hisaab se: ${amt(1500000)} par ${inr(at15.newTax.totalTax)}, ${amt(2000000)} par ${inr(at20.newTax.totalTax)} saal ka, cess milakar.` },
        { q: 'What is marginal relief in the new tax regime?', a: `A cap that stops the tax from exceeding the income above ${inr(1200000)}. On a ${amt(1285000)} salary (taxable ${inr(t(1285000).newTaxableIncome)}), the tax is ${inr(t(1285000).newTax.totalTax)} instead of the ${inr(t(1285000).newTax.rawTax)} the slabs would give.` },
        { q: 'Is FY 2026-27 the same as AY 2027-28?', a: 'Under the Income-tax Act, 2025, which applies from 1 April 2026, there is no assessment year: the year is called tax year 2026-27. Income of FY 2025-26 is still AY 2026-27 under the old Act.' },
    ],
    related: [
        { href: '/old-vs-new-tax-regime', label: 'Old vs new tax regime', note: 'Which regime is cheaper for your deductions' },
        { href: '/income-tax-due-dates', label: 'Income tax due dates', note: 'Advance tax, ITR and TDS deadlines for 2026-27' },
        { href: '/hra', label: 'HRA exemption calculator', note: 'Old regime rent exemption' },
        { href: '/capital-gains', label: 'Capital gains tax calculator', note: 'Tax on shares, funds and property' },
    ],
    disclaimer: 'tax',
};
