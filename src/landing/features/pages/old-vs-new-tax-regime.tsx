/**
 * /old-vs-new-tax-regime — primary query "old vs new tax regime calculator" (SEO_PLAN.md §5c).
 * Every tax figure is computed by the app's compareSalaryTax / taxForRegime (src/utils/incomeTax.ts).
 * Rules: seo/research/verified-facts-2026-11-17.md (Income-tax Act, 2025; Finance Act, 2026).
 */
import { NEW_REGIME_2026_27, OLD_REGIME, compareSalaryTax } from '../../../utils/incomeTax';
import { breakEvenDeductions } from '../derive';
import { amt, inr, taxText } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const FA26 = { label: 'Finance Act, 2026', url: 'https://egazette.gov.in/WriteReadData/2026/271439.pdf' };
const MEMO = { label: 'Memorandum to the Finance Bill 2026', url: 'https://www.indiabudget.gov.in/doc/memo.pdf' };

/** Typical old-regime deductions used in the tables: section 123 (old 80C) + 126 (old 80D) + home-loan interest. */
const TYPICAL = 150000 + 25000 + 200000;
const SALARIES = [500000, 750000, 1000000, 1200000, 1275000, 1300000, 1500000, 1800000, 2000000, 2500000, 3000000, 4000000, 5000000];
/** Scenario 4: HRA ₹4 lakh + section 123 ₹1.5 lakh + section 126 ₹25,000 + home-loan interest ₹2 lakh + own NPS ₹50,000. */
const BIG = 400000 + 150000 + 25000 + 200000 + 50000;

/** Slab-by-slab tax on a taxable income (before rebate, surcharge, cess), from the app's slab tables. */
function slabSteps(taxable: number, slabs: typeof OLD_REGIME) {
    return slabs
        .filter((s) => taxable > s.min)
        .map((s) => {
            const top = Math.min(taxable, s.max);
            return { band: `${amt(s.min)} – ${s.max === Infinity ? 'above' : amt(s.max)}`, rate: s.rate, on: top - s.min, tax: ((top - s.min) * s.rate) / 100 };
        });
}

const ex15 = compareSalaryTax(1500000, 0);
const be15 = breakEvenDeductions(1500000) ?? 0;
const ex18 = compareSalaryTax(1800000, TYPICAL);
const ex1285 = compareSalaryTax(1285000, 0);
const ex20big = compareSalaryTax(2000000, BIG);
const ex10 = compareSalaryTax(1000000, TYPICAL);
const ans = (s: number) => ({ c: compareSalaryTax(s, TYPICAL), be: breakEvenDeductions(s), c0: compareSalaryTax(s, 0) });
const f15 = ans(1500000), f20 = ans(2000000), f30 = ans(3000000);

function Body() {
    const newSteps = slabSteps(ex18.newTaxableIncome, NEW_REGIME_2026_27);
    const oldSteps = slabSteps(ex18.oldTaxableIncome, OLD_REGIME);
    return (
        <>
            <Section title="Tax in both regimes, salary by salary">
                <p>
                    Each row is a resident salaried person below 60 with no other income. “Typical deductions” means {inr(TYPICAL)}:
                    {' '}{inr(150000)} under section 123 (the old 80C), {inr(25000)} of health insurance under section 126 (the old 80D)
                    and {inr(200000)} of interest on a home loan for the house you live in. The last column is the amount of old-regime
                    deductions at which both regimes cost the same; below it, the new regime is cheaper.
                </p>
                <DataTable
                    caption="Total tax for FY 2026-27, including rebate, surcharge and 4% cess"
                    head={['Salary (gross)', 'New regime', 'Old regime, no deductions', 'Old regime, typical deductions', 'Old regime wins from']}
                    rows={SALARIES.map((s) => {
                        const c0 = compareSalaryTax(s, 0);
                        const c1 = compareSalaryTax(s, TYPICAL);
                        const be = breakEvenDeductions(s);
                        return [amt(s), taxText(c0.newTax.totalTax), taxText(c0.oldTax.totalTax), taxText(c1.oldTax.totalTax), be === null ? 'Never' : be === 0 ? 'Any amount' : `${inr(be)} of deductions`];
                    })}
                    note="Computed with the same tax code as the FinCalix app. Salary means gross salary before the standard deduction."
                />
                <p>
                    Read across a row to answer “which tax regime is better for my salary”: the new regime wins unless your deductions
                    reach the last column. Few people get there without a large HRA claim, because the main deductions other than HRA
                    add up to about {inr(150000 + 25000 + 50000 + 200000)} (section 123, health insurance for yourself, your own NPS and
                    home-loan interest).
                </p>
            </Section>

            <Section title="How each regime is calculated">
                <ol className="steps">
                    <li><strong>New regime (the default).</strong> Gross salary minus the {inr(75000)} standard deduction gives taxable income. Apply the new slabs, then the rebate: if taxable income is up to {inr(1200000)}, the rebate cancels the tax (up to {inr(60000)}); just above {inr(1200000)} the tax can’t exceed the income above {inr(1200000)} (marginal relief). Add surcharge above {amt(5000000)} and 4% cess.</li>
                    <li><strong>Old regime (if you opt out).</strong> Gross salary minus the {inr(50000)} standard deduction and your deductions (HRA, section 123, section 126, home-loan interest, your own NPS and others) gives taxable income. Apply the old slabs; the rebate (up to {inr(12500)}) applies only if taxable income is up to {inr(500000)}. Add surcharge and 4% cess.</li>
                </ol>
                <p><strong>Worked example: {amt(1800000)} salary, {inr(TYPICAL)} of typical deductions.</strong></p>
                <DataTable
                    caption={`New regime: taxable income ${inr(ex18.newTaxableIncome)} (${amt(1800000)} − ${inr(75000)})`}
                    head={['Slab', 'Rate', 'Income in slab', 'Tax']}
                    rows={[
                        ...newSteps.map((s) => [s.band, `${s.rate}%`, inr(s.on), inr(s.tax)]),
                        ['Slab tax', '', '', inr(ex18.newTax.rawTax)],
                        ['+ 4% cess', '', '', inr(ex18.newTax.cess)],
                        ['Total tax', '', '', inr(ex18.newTax.totalTax)],
                    ]}
                />
                <DataTable
                    caption={`Old regime: taxable income ${inr(ex18.oldTaxableIncome)} (${amt(1800000)} − ${inr(50000)} − ${inr(TYPICAL)})`}
                    head={['Slab', 'Rate', 'Income in slab', 'Tax']}
                    rows={[
                        ...oldSteps.map((s) => [s.band, `${s.rate}%`, inr(s.on), inr(s.tax)]),
                        ['Slab tax', '', '', inr(ex18.oldTax.rawTax)],
                        ['+ 4% cess', '', '', inr(ex18.oldTax.cess)],
                        ['Total tax', '', '', inr(ex18.oldTax.totalTax)],
                    ]}
                    note={`The new regime is ${inr(ex18.oldTax.totalTax - ex18.newTax.totalTax)} a year cheaper here, even with ${inr(TYPICAL)} of deductions.`}
                />
            </Section>

            <Section title="The two slab tables">
                <DataTable
                    caption="New regime slabs, FY 2026-27 (section 202)"
                    head={['Taxable income', 'Rate']}
                    rows={NEW_REGIME_2026_27.map((s) => [s.max === Infinity ? `Above ${amt(s.min)}` : `${amt(s.min)} – ${amt(s.max)}`, s.rate === 0 ? 'Nil' : `${s.rate}%`])}
                />
                <DataTable
                    caption="Old regime slabs, below 60 (Finance Act, 2026)"
                    head={['Taxable income', 'Rate']}
                    rows={OLD_REGIME.map((s) => [s.max === Infinity ? `Above ${amt(s.min)}` : `${amt(s.min)} – ${amt(s.max)}`, s.rate === 0 ? 'Nil' : `${s.rate}%`])}
                    note="In the old regime the nil band is ₹3 lakh from age 60 and ₹5 lakh from age 80. Old-regime rates are set by each year’s Finance Act."
                />
            </Section>

            <Section title="What the new regime leaves out, and what it keeps">
                <div className="cols">
                    <div>
                        <h3>Not allowed in the new regime</h3>
                        <ul>
                            <li>House rent allowance (HRA) exemption</li>
                            <li>Section 123 (old 80C): PPF, ELSS, life insurance, home-loan principal, tuition fees</li>
                            <li>Section 126 (old 80D): health insurance</li>
                            <li>Your own NPS contribution, section 124(3) (old 80CCD(1B))</li>
                            <li>Interest on a home loan for the house you live in</li>
                            <li>Professional tax</li>
                        </ul>
                    </div>
                    <div>
                        <h3>Still allowed in the new regime</h3>
                        <ul>
                            <li>{inr(75000)} standard deduction (old regime: {inr(50000)})</li>
                            <li>Your employer’s NPS contribution, up to 14% of salary (section 124(1)–(2))</li>
                            <li>Interest on a let-out house (but a loss can’t be set off against your salary)</li>
                            <li>The rebate up to {inr(60000)} on taxable income up to {inr(1200000)}</li>
                        </ul>
                    </div>
                </div>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    {
                        title: `${amt(1285000)} salary: marginal relief`,
                        body: <>Taxable income in the new regime is {inr(ex1285.newTaxableIncome)}. The slab tax would be {inr(ex1285.newTax.rawTax)}, but marginal relief limits it to the {inr(ex1285.newTaxableIncome - 1200000)} earned above {inr(1200000)}, so the tax is {inr(ex1285.newTax.totalTax)} with cess. The old regime with no deductions would cost {inr(ex1285.oldTax.totalTax)}.</>,
                    },
                    {
                        title: `${amt(1000000)} salary, ${inr(TYPICAL)} of deductions`,
                        body: <>New regime: {taxText(ex10.newTax.totalTax)}, because taxable income ({inr(ex10.newTaxableIncome)}) is within the {inr(1200000)} rebate limit. Old regime even with all those deductions: {inr(ex10.oldTax.totalTax)}. The new regime wins.</>,
                    },
                    {
                        title: `${amt(1500000)} salary`,
                        body: <>New regime: {inr(ex15.newTax.totalTax)}. Old regime with no deductions: {inr(ex15.oldTax.totalTax)}. To make the old regime as cheap, you would need about {inr(be15)} of deductions on top of the standard deduction.</>,
                    },
                    {
                        title: `${amt(2000000)} salary with HRA and a home loan`,
                        body: <>Suppose deductions of {inr(BIG)}: HRA exemption {inr(400000)}, section 123 {inr(150000)}, health insurance {inr(25000)}, home-loan interest {inr(200000)} and your own NPS {inr(50000)}. Old regime: {inr(ex20big.oldTax.totalTax)}. New regime: {inr(ex20big.newTax.totalTax)}. {ex20big.betterRegime === 'Old' ? <>Here the old regime saves {inr(ex20big.saving)} a year.</> : <>The new regime still saves {inr(ex20big.saving)} a year.</>}</>,
                    },
                ]} />
            </Section>

            <Section title="Choosing, and switching every year">
                <p>
                    The new regime applies unless you opt out. If you have no business income, you choose each year when you file your
                    return, so you can pick whichever is cheaper that year. Tell your employer your choice at the start of the year so
                    the right amount of tax is deducted from your salary every month. If you have business or professional income, you
                    opt out by the return due date and can switch back only once.
                </p>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'New regime slabs, the ₹75,000 standard deduction and the rebate up to ₹60,000 (taxable income up to ₹12 lakh, with marginal relief) for FY 2026-27, the first tax year under the Income-tax Act, 2025. Budget 2026 did not change the slabs.', source: ACT },
                { text: 'The rebate does not apply to tax on income taxed at special rates, such as capital gains on shares and equity mutual funds.', source: ACT },
                { text: 'Old regime slabs, surcharge (10% above ₹50 lakh, 15% above ₹1 crore, 25% above ₹2 crore, 37% above ₹5 crore — capped at 25% in the new regime) and 4% health and education cess.', source: FA26 },
                { text: 'Deductions not allowed in the new regime, and the employer NPS deduction that is: section 202(2) of the Act.', source: ACT },
                { text: 'Salaried taxpayers without business income choose the regime with their return each year; FY 2026-27 is called tax year 2026-27 under the new Act.', source: MEMO },
            ]} />
        </>
    );
}

export const oldVsNewTaxRegime: FeatureDef = {
    slug: 'old-vs-new-tax-regime',
    title: 'Old vs New Tax Regime Calculator FY 2026-27',
    description: 'Old vs new tax regime for FY 2026-27: tax at every salary, the deductions you need for the old regime to win, and worked examples.',
    h1: 'Old vs new tax regime: which is better for you in FY 2026-27?',
    crumb: 'Old vs new regime',
    category: 'tax',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Old vs New Tax Regime',
    eyebrow: 'Income tax · FY 2026-27 (tax year 2026-27)',
    answer: (
        <>
            <p>For most salaried people the new tax regime costs less in FY 2026-27: with the {inr(75000)} standard deduction, a salary up to {amt(1275000)} pays no tax at all.</p>
            <p>The old regime wins only with large deductions. On a {amt(1500000)} salary the new regime tax is {inr(ex15.newTax.totalTax)}; the old regime costs the same only once you claim about {inr(be15)} of deductions such as section 123 (the old 80C), health insurance, home-loan interest and HRA.</p>
        </>
    ),
    sources: [ACT, FA26, MEMO],
    calc: { key: 'taxRegime', props: { salary: 1500000, deductions: 200000 } },
    Body,
    faqs: [
        {
            q: 'Which tax regime is better for a ₹15 lakh salary?',
            a: `The new regime, unless your deductions are about ${inr(f15.be ?? 0)} or more. On ${amt(1500000)} the new regime tax is ${inr(f15.c0.newTax.totalTax)}; the old regime is ${inr(f15.c.oldTax.totalTax)} even with ${inr(TYPICAL)} of section 123, health insurance and home-loan interest deductions.`,
        },
        {
            q: 'Which tax regime is better for a ₹20 lakh salary?',
            a: `The new regime in most cases: ${inr(f20.c0.newTax.totalTax)} against ${inr(f20.c.oldTax.totalTax)} in the old regime with ${inr(TYPICAL)} of deductions. The old regime becomes cheaper only above about ${inr(f20.be ?? 0)} of deductions, which usually needs a large HRA claim.`,
        },
        {
            q: 'Which tax regime is better for a ₹30 lakh salary?',
            a: `The new regime unless you claim more than about ${inr(f30.be ?? 0)} of deductions. On ${amt(3000000)} the new regime tax is ${inr(f30.c0.newTax.totalTax)} and the old regime with ${inr(TYPICAL)} of deductions is ${inr(f30.c.oldTax.totalTax)}.`,
        },
        {
            q: 'Can I switch between the old and new tax regime every year?',
            a: 'Yes, if you have no business or professional income: you choose each year when you file your return. With business income you opt out by the due date and can switch back only once.',
        },
        {
            q: 'Is HRA allowed in the new tax regime?',
            a: 'No. The new regime does not allow the HRA exemption, nor section 123 (old 80C), section 126 (old 80D), your own NPS or interest on a home loan for the house you live in. It keeps the ₹75,000 standard deduction and your employer’s NPS contribution up to 14% of salary.',
        },
        {
            q: 'Is income up to ₹12 lakh tax-free in the new regime?',
            a: `Yes for taxable income up to ${inr(1200000)}: the rebate cancels the tax, up to ${inr(60000)}. For a salaried person that means a gross salary up to ${amt(1275000)}, after the ${inr(75000)} standard deduction. The rebate does not cover tax on capital gains taxed at special rates.`,
        },
    ],
    related: [
        { href: '/income-tax', label: 'Income tax calculator FY 2026-27', note: 'Your tax in the new regime, slab by slab' },
        { href: '/hra', label: 'HRA exemption calculator', note: 'How much of your HRA is tax-free in the old regime' },
        { href: '/home-loan-prepayment', label: 'Home loan prepayment calculator', note: 'Interest saved by paying part of your loan early' },
        { href: '/income-tax-due-dates', label: 'Income tax due dates FY 2026-27', note: 'Advance tax, return and TDS deadlines' },
    ],
    disclaimer: 'tax',
};
