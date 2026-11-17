/**
 * /elss — primary query "elss calculator" (coordinator brief; ELSS is not in SEO_PLAN §5, so no
 * Hinglish FAQ). The app has no ELSS screen: growth is the app's calculateSIP; the tax effect is
 * the app's compareSalaryTax (math-invest.elssTaxSaved), break-even deductions derive.breakEvenDeductions.
 * Rules: Income-tax Act, 2025 s.123 + Schedule XV para 1(m), s.202(2)(a)(xii), s.198; SEBI circular
 * 6 Oct 2017 (ELSS 80% equity, 3-year statutory lock-in) — seo/research/verified-facts-invest.md.
 * Lock-in "per instalment" could not be verified officially and is left out.
 */
import { calculateSIP } from '../../../utils/calculations';
import { compareSalaryTax } from '../../../utils/incomeTax';
import { SEC123_LIMIT, elssTaxSaved } from '../math-invest';
import { breakEvenDeductions } from '../derive';
import { amt, inr, taxText } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025 (s. 123, Schedule XV; s. 202)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const SEBI_ELSS = { label: 'SEBI circular on scheme categories (ELSS)', url: 'https://www.sebi.gov.in/legal/circulars/oct-2017/categorization-and-rationalization-of-mutual-fund-schemes_36199.html' };
const ACT198 = { label: 'Income-tax Act, 2025 (s. 198)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };

const SAL = 1500000, MONTHLY = 12500, R = 12;
const main = elssTaxSaved(SAL, MONTHLY * 12, 0);
const be15 = breakEvenDeductions(SAL);
const grow3 = calculateSIP(MONTHLY, R, 3);
const steps = compareSalaryTax(SAL, 0);
const stepsWith = compareSalaryTax(SAL, SEC123_LIMIT);

function Body() {
    const salaries = [800000, 1000000, 1200000, 1500000, 2000000, 2500000];
    const sips = [5000, 7500, 12500];
    const epf = elssTaxSaved(1200000, 90000, 60000);
    const bigDed = 575000;
    const big = elssTaxSaved(2000000, SEC123_LIMIT, 0, bigDed);
    const nine = elssTaxSaved(900000, SEC123_LIMIT, 0);
    return (
        <>
            <Section title="Tax an ELSS saves, by salary">
                <DataTable
                    caption={`₹1.5 lakh a year in ELSS, salaried and below 60, FY 2026-27 — no other deductions`}
                    head={['Salary', 'Old Regime, no ELSS', 'Old Regime, with ELSS', 'Saved in the Old Regime', 'New Regime tax', 'Old Regime wins only with deductions of']}
                    rows={salaries.map((s) => {
                        const t = elssTaxSaved(s, SEC123_LIMIT, 0);
                        const be = breakEvenDeductions(s);
                        return [amt(s), taxText(t.oldWithout), taxText(t.oldWith), inr(t.saved), taxText(t.newTax), be === null ? 'Never' : be === 0 ? 'Any amount' : `${amt(be)} or more`];
                    })}
                    note="Tax from the FinCalix app’s income tax engine: slabs, standard deduction, rebate, surcharge and 4% cess. The last column is the total deductions at which the Old Regime stops costing more than the New."
                />
                <p>
                    The saving column looks attractive, but compare the Old Regime figure with ELSS against the New Regime column.
                    {salaries.every((s) => { const t = elssTaxSaved(s, SEC123_LIMIT, 0); return t.newTax < t.oldWith; }) ? ' In every row the New Regime is still cheaper' : ' In most rows the New Regime is still cheaper'}, because ₹1.5 lakh on its own is far below the deductions the Old Regime needs to
                    win. ELSS saves tax only for people who already claim large deductions — house rent, home-loan interest and the like.
                </p>
            </Section>

            <Section title="How the saving is worked out">
                <ol className="steps">
                    <li>Old Regime taxable income without ELSS: {inr(SAL)} − ₹50,000 standard deduction = {inr(steps.oldTaxableIncome)}; tax with cess {inr(steps.oldTax.totalTax)}.</li>
                    <li>Deduct ₹1.5 lakh of ELSS under section 123: taxable income {inr(stepsWith.oldTaxableIncome)}; tax {inr(stepsWith.oldTax.totalTax)}.</li>
                    <li>Saving: {inr(steps.oldTax.totalTax)} − {inr(stepsWith.oldTax.totalTax)} = <strong>{inr(main.saved)}</strong> — the 30% slab plus 4% cess on ₹1.5 lakh.</li>
                    <li>New Regime on the same salary: {inr(SAL)} − ₹75,000 = {inr(steps.newTaxableIncome)} taxable, tax {inr(steps.newTax.totalTax)}, with no ELSS deduction at all.</li>
                </ol>
                <p>The FinCalix app has no separate ELSS tool: its SIP calculator does the growth step and its income tax calculator the tax step, which is exactly what this page combines.</p>
            </Section>

            <Section title="What the ELSS itself could grow to">
                <DataTable
                    caption={`Monthly ELSS SIP at an assumed ${R}% a year`}
                    head={['Monthly SIP', 'Paid in a year', 'After 3 years', 'After 5 years', 'After 10 years']}
                    rows={sips.map((m) => [inr(m), inr(m * 12), amt(calculateSIP(m, R, 3).futureValue), amt(calculateSIP(m, R, 5).futureValue), amt(calculateSIP(m, R, 10).futureValue)])}
                    note="Same formula as the app’s SIP calculator. ELSS invests mostly in shares, so the value can also fall."
                />
            </Section>

            <Section title="Three salaries, three answers">
                <Scenarios items={[
                    { title: `${amt(1200000)} salary, ₹60,000 already going to EPF`, body: <>EPF uses part of the ₹1.5 lakh, leaving room for {inr(epf.counted)} of ELSS ({inr(epf.counted / 12)} a month). That cuts Old Regime tax by {inr(epf.saved)} — but the New Regime tax here is {taxText(epf.newTax)}, so in practice ELSS saves nothing.</> },
                    { title: `${amt(2000000)} salary with ${amt(bigDed)} of other deductions`, body: <>With HRA, home-loan interest and similar claims of {amt(bigDed)}, the full ₹1.5 lakh ELSS brings Old Regime tax to {inr(big.oldWith)} against {inr(big.newTax)} in the New Regime. Here the Old Regime wins and the ELSS is worth {inr(big.saved)} a year.</> },
                    { title: `${amt(900000)} salary, no other deductions`, body: <>ELSS would trim Old Regime tax from {inr(nine.oldWithout)} to {inr(nine.oldWith)}, yet the New Regime charges {taxText(nine.newTax)} — no reason to invest for tax.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Section 123 (the old 80C) allows up to ₹1,50,000 a year in total for the items in Schedule XV, which include units of a mutual fund plan notified by the Central Government — the ELSS. EPF, PPF, life insurance premium and the others share the same limit.', source: ACT },
                { text: 'The New Regime (section 202) is computed without Chapter VIII deductions other than sections 124(1)-(2), 125(2) and 146, so section 123 does not apply in it.', source: ACT },
                { text: 'An ELSS must keep at least 80% of its assets in equity and carries a statutory lock-in of 3 years.', source: SEBI_ELSS },
                { text: 'ELSS units are held at least 3 years, so a gain on redemption is long-term: taxed at 12.5% on such gains above ₹1.25 lakh in a tax year.', source: ACT198 },
            ]} />
        </>
    );
}

export const elssPage: FeatureDef = {
    slug: 'elss',
    title: 'ELSS Calculator: Tax Saving and Returns, FY 2026-27',
    description: 'ELSS tax saving under section 123 (old 80C) by salary, Old vs New Regime, what an ELSS SIP could grow to and the 3-year lock-in.',
    h1: 'ELSS calculator: tax saved and what your ELSS SIP grows to',
    crumb: 'ELSS calculator',
    category: 'investments',
    updated: '2026-11-17',
    analyticsTitle: 'Website - ELSS',
    eyebrow: 'Tax-saving mutual funds · section 123 (old 80C)',
    answer: (
        <>
            <p>Investing {inr(MONTHLY)} a month (₹1.5 lakh a year) in an ELSS cuts Old Regime tax on a {amt(SAL)} salary by {inr(main.saved)} for FY 2026-27. At {R}% that SIP could be worth {inr(grow3.futureValue)} when the first 3 years are up.</p>
            <p>But the deduction exists only in the Old Regime. On the same salary the New Regime tax is {inr(main.newTax)}, lower than the Old Regime’s {inr(main.oldWith)} even with ELSS; the Old Regime wins only with about {be15 === null ? 'very large' : amt(be15)} of deductions (Income-tax Act, 2025, sections 123 and 202).</p>
        </>
    ),
    sources: [ACT, SEBI_ELSS],
    calc: { key: 'elss', props: { monthly: MONTHLY, salary: SAL, other123: 0, otherDed: 0, rate: R, years: 3 } },
    Body,
    faqs: [
        { q: 'How much tax can I save with ELSS?', a: `Up to ${inr(main.saved)} a year in the 30% slab, on the ₹1.5 lakh section 123 limit, and only in the Old Regime. If EPF or PPF already use part of the limit, the ELSS share is smaller.` },
        { q: 'Does ELSS save tax in the New Regime?', a: 'No. The New Regime allows no section 123 (old 80C) deduction, so ELSS is then just an equity fund with a lock-in.' },
        { q: 'What is the lock-in period of ELSS?', a: 'Three years. SEBI describes ELSS as an open-ended equity scheme with a statutory lock-in of 3 years, investing at least 80% in equity.' },
        { q: 'How much should I put in ELSS for tax saving?', a: `No more than the room left under ₹1.5 lakh after EPF, PPF, insurance premium and other section 123 items. With ${inr(60000)} going to EPF, that is ${inr(SEC123_LIMIT - 60000)} a year, or ${inr((SEC123_LIMIT - 60000) / 12)} a month.` },
        { q: 'Are ELSS returns taxable?', a: 'Yes, when you redeem. Since units are held at least 3 years, the gain is long-term: 12.5% on long-term gains above ₹1.25 lakh in a tax year.' },
        { q: 'Should I pick the Old Regime just to invest in ELSS?', a: `Only if your total deductions pass the break-even point. At ${amt(SAL)} the Old Regime needs about ${be15 === null ? 'very large deductions' : amt(be15)} of deductions before it costs less than the New Regime; ELSS alone gives ₹1.5 lakh.` },
    ],
    related: [
        { href: '/old-vs-new-tax-regime', label: 'Old vs new tax regime', note: 'Which regime costs less for your salary' },
        { href: '/income-tax', label: 'Income tax calculator', note: 'Tax on your salary for FY 2026-27' },
        { href: '/sip', label: 'SIP calculator', note: 'Growth of any monthly SIP' },
        { href: '/ppf', label: 'PPF calculator', note: 'Fixed-rate option under the same limit' },
        { href: '/nps', label: 'NPS calculator', note: 'Another tax-linked retirement option' },
    ],
    disclaimer: { text: 'Tax figures are estimates for a resident salaried individual below 60 for FY 2026-27 (tax year 2026-27 under the Income-tax Act, 2025), with no deductions other than those entered. ELSS returns are assumptions, not promises: mutual fund investments are subject to market risks; read all scheme-related documents carefully. FinCalix is not a SEBI-registered investment advisor or a tax advisor and does not recommend any scheme.' },
};
