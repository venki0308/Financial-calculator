/**
 * /tax-refund — primary query "income tax refund calculator" (SEO_PLAN.md §5c). Refund or balance due:
 * the app's calculateJobSwitchTax (src/utils/jobSwitchTax.ts, behind the app's Form 16 tax calculator).
 * Refund interest: section 437 of the Income-tax Act, 2025 (0.5% a month) — the app has no function for
 * it, so the page multiplies by the rule's rate (checked in scripts/qa-features/tax.mjs).
 * Rules: seo/research/verified-facts-tax.md.
 */
import { calculateJobSwitchTax } from '../../../utils/jobSwitchTax';
import type { EmployerInput, Regime } from '../../../utils/jobSwitchTax';
import { amt, inr, pct } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const RULES = { label: 'Income-tax Rules, 2026', url: 'https://www.incometax.gov.in/iec/foportal/sites/default/files/2026-03/En-Notified-IT-Rules-2026-20-03-2026.pdf' };
const PORTAL = { label: 'e-filing portal: refund status guide', url: 'https://www.incometax.gov.in/iec/foportal/help/refund_status_user_manual' };
const FA26 = { label: 'Finance Act, 2026', url: 'https://egazette.gov.in/WriteReadData/2026/271439.pdf' };

const emp = (name: string, grossSalary: number, tdsDeducted: number): EmployerInput =>
    ({ name, grossSalary, gratuityExempt: 0, leaveEncashmentExempt: 0, hraExempt: 0, otherExempt: 0, professionalTax: 0, tdsDeducted });
const run = (employers: EmployerInput[], interest = 0, bankTds = 0, regime: Regime = 'new') => calculateJobSwitchTax({
    employers, otherIncome: { savingsInterest: 0, otherInterest: interest, tdsOtherIncome: bankTds },
    regime, fy: '2026-27', ageCategory: 'below_60', oldDeductions: { section80C: 0, section80D: 0, section80CCD1B: 0 }, advanceTaxPaid: 0,
});

/** Section 437: simple interest at 0.5% for every month or part of a month. */
const RATE_437 = 0.5;
const interest437 = (refund: number, months: number) => Math.round((refund * RATE_437 * months) / 100);

// Main: ₹15 lakh salary, employer TDS ₹1,20,000, new regime.
const main = run([emp('Employer', 1500000, 120000)]);
const mainRefund = -main.balancePayable;
// Refund granted in October 2027 on a return filed by 31 July 2027: April to October = 7 months.
const octInterest = interest437(mainRefund, 7);
const GRANTS: Array<[string, number]> = [['August 2027', 5], ['September 2027', 6], ['October 2027', 7], ['December 2027', 9], ['March 2028', 12]];

// Scenarios.
const fd = run([emp('Employer', 900000, 0)], 80000, 8000);
const switcher = run([emp('First employer', 800000, 0), emp('Second employer', 700000, 0)]);
const exact = run([emp('Employer', 1500000, main.totalTaxLiability)]);
const small = run([emp('Employer', 1500000, main.totalTaxLiability + 5000)]);

const FD_SALARIES = [500000, 700000, 900000, 1000000, 1100000, 1150000, 1175000, 1200000];

function Body() {
    return (
        <>
            <Section title="Refund or tax due: how it is worked out">
                <ol className="steps">
                    <li>Add up your income for the tax year: salary from Form No. 130 (the certificate that replaced Form 16), plus interest and other income listed in your Annual Information Statement.</li>
                    <li>Work out the tax on it, in the regime you choose, with rebate, surcharge and 4% cess.</li>
                    <li>Subtract every tax already paid for you: TDS by your employer and bank, TCS, and any advance tax.</li>
                    <li>A negative result is your refund; a positive one is tax you still owe and should pay before filing.</li>
                </ol>
                <DataTable
                    caption={`${amt(1500000)} salary, employer deducted ${inr(120000)}, new regime, tax year 2026-27`}
                    head={['Step', 'Amount']}
                    rows={[
                        ['Gross salary', inr(1500000)],
                        ['Less standard deduction', `− ${inr(main.standardDeduction)}`],
                        ['Total income', inr(main.totalIncomeRounded)],
                        ['Tax on it, with 4% cess', inr(main.totalTaxLiability)],
                        ['TDS deducted by the employer', `− ${inr(main.totalTDS)}`],
                        ['Refund due', inr(mainRefund)],
                    ]}
                    note="Computed with the engine behind the FinCalix app's Form 16 tax calculator."
                />
            </Section>

            <Section title="Interest on your refund (section 437, the old 244A)">
                <p>
                    A refund of TDS, TCS or advance tax earns simple interest of 0.5% for every month or part of a month. If you file
                    by the due date (31 July 2027 for most salaried people), it runs from 1 April 2027 to the date the refund is
                    granted; if you file late, from the date you file. No interest is paid when the refund is less than 10% of the
                    tax determined on your return.
                </p>
                <DataTable
                    caption={`Interest on a ${inr(mainRefund)} refund, return filed by 31 July 2027`}
                    head={['Refund granted in', 'Months counted (from April 2027)', 'Interest at 0.5% a month', 'Refund with interest']}
                    rows={GRANTS.map(([m, n]) => [m, String(n), inr(interest437(mainRefund, n)), inr(mainRefund + interest437(mainRefund, n))])}
                    note={`Here the refund is ${pct((mainRefund / main.totalTaxLiability) * 100, 1)} of the tax for the year, above the 10% floor, so interest is due. A part month counts as a full month.`}
                />
            </Section>

            <Section title="Refund of bank TDS when your income is within the rebate">
                <p>
                    A common case: your salary is within the new-regime rebate, but the bank deducted TDS on fixed-deposit interest.
                    The table assumes {inr(80000)} of FD interest with {inr(8000)} of TDS deducted by the bank and no TDS on salary.
                </p>
                <DataTable
                    caption="New regime, tax year 2026-27: salary + ₹80,000 FD interest, bank TDS ₹8,000"
                    head={['Salary', 'Total income', 'Tax for the year', 'Refund (+) or due (−)']}
                    rows={FD_SALARIES.map((s) => {
                        const r = run([emp('Employer', s, 0)], 80000, 8000);
                        return [amt(s), inr(r.totalIncomeRounded), inr(r.totalTaxLiability), r.balancePayable <= 0 ? `+ ${inr(-r.balancePayable)}` : `− ${inr(r.balancePayable)}`];
                    })}
                    note="Up to ₹12 lakh of total income the rebate wipes out the tax, so the whole bank TDS comes back. Just above it, marginal relief keeps the tax small."
                />
            </Section>

            <Section title="Four situations">
                <Scenarios items={[
                    {
                        title: 'FD interest on a ₹9 lakh salary',
                        body: <>Salary {amt(900000)} plus {inr(80000)} of FD interest is {inr(fd.totalIncomeRounded)} of income, within the rebate, so the tax is {inr(fd.totalTaxLiability)}. The {inr(8000)} the bank deducted is refunded in full: {inr(-fd.balancePayable)}.</>,
                    },
                    {
                        title: 'Two employers in one year: tax due, not a refund',
                        body: <>{amt(800000)} from the first job and {amt(700000)} from the second: each employer saw income within the rebate and deducted nothing. Together the {amt(1500000)} carries {inr(switcher.totalTaxLiability)} of tax, all still to pay before you file. Declare the earlier salary to your new employer in Form No. 122 to avoid this.</>,
                    },
                    {
                        title: 'TDS exactly right',
                        body: <>If your employer deducted exactly {inr(exact.totalTDS)} on {amt(1500000)}, the balance is {inr(Math.abs(exact.balancePayable))}: nothing to pay and nothing to come back, but you still file the return.</>,
                    },
                    {
                        title: 'A small refund earns no interest',
                        body: <>{inr(5000)} of extra TDS on a tax of {inr(small.totalTaxLiability)} gives a refund of {inr(-small.balancePayable)}, only {pct((-small.balancePayable / small.totalTaxLiability) * 100, 1)} of the tax, below the 10% floor, so section 437 pays no interest on it.</>,
                    },
                ]} />
            </Section>

            <Section title="Claiming the refund and checking its status">
                <ol className="steps">
                    <li>Check that every TDS amount shows in your Annual Information Statement (Form No. 168) on the e-filing portal.</li>
                    <li>Pre-validate your bank account on the portal: refunds go only to a pre-validated account.</li>
                    <li>File your return for tax year 2026-27 (the return is the claim for a refund) by 31 July 2027, or as a belated return by 31 December 2027, and e-verify it. Processing starts after e-verification.</li>
                    <li>To track it, log in and open e-File → Income Tax Returns → View Filed Returns, then View Details. The status shows the refund as issued, adjusted against a demand, or failed.</li>
                    <li>If it failed, check that your PAN is linked with Aadhaar and that the bank account name and IFSC match.</li>
                </ol>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'You are entitled to a refund of tax paid for you beyond your tax for the year (section 431); the claim is made by filing your return (section 433).', source: ACT },
                { text: 'Refund interest: 0.5% for every month or part of a month; from 1 April after the tax year to the date of grant if the return is filed by the due date, otherwise from the date of filing; none if the refund is under 10% of the tax determined: section 437.', source: ACT },
                { text: 'Return due date 31 July 2027 for salaried people and others not under audit; belated return by 31 December 2027, with a late fee under section 428.', source: FA26 },
                { text: 'Salary TDS certificate Form No. 130 by 15 June (rule 215); earlier salary told to a new employer in Form No. 122 (rule 204); Annual Information Statement Form No. 168 (rule 245).', source: RULES },
                { text: 'Refund status path, statuses, and the need for a pre-validated bank account and an operative PAN.', source: PORTAL },
            ]} />
        </>
    );
}

export const taxRefundPage: FeatureDef = {
    slug: 'tax-refund',
    title: 'Income Tax Refund Calculator FY 2026-27 (TDS vs Tax)',
    description: 'Income tax refund calculator: TDS against your tax for FY 2026-27, refund or balance due, 0.5% a month interest under section 437, and status steps.',
    h1: 'Income tax refund calculator: will you get money back?',
    crumb: 'Tax refund',
    category: 'tax',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Tax Refund',
    eyebrow: 'Income tax · TDS and refunds · tax year 2026-27',
    answer: (
        <>
            <p>If your employer deducted {inr(120000)} of TDS on a {amt(1500000)} salary but your new-regime tax for FY 2026-27 is {inr(main.totalTaxLiability)}, you get {inr(mainRefund)} back once you file and e-verify your return.</p>
            <p>The refund earns interest of 0.5% a month under section 437 of the Income-tax Act, 2025 (the old section 244A): {inr(octInterest)} if it is granted in October 2027 on a return filed by 31 July 2027.</p>
        </>
    ),
    sources: [ACT, FA26, RULES, PORTAL],
    calc: { key: 'tax-refund', props: { regime: 'new', salary: 1500000, tds: 120000, interest: 0, bankTds: 0, s123: 150000, hraExempt: 0 } },
    Body,
    faqs: [
        {
            q: 'How is an income tax refund calculated?',
            a: `Refund = tax already paid for you (TDS, TCS, advance tax) − the tax on your total income for the year. With ${inr(120000)} of TDS on a ${amt(1500000)} salary and new-regime tax of ${inr(main.totalTaxLiability)}, the refund is ${inr(mainRefund)}.`,
        },
        {
            q: 'How much interest is paid on an income tax refund?',
            a: `0.5% for every month or part of a month under section 437 (section 244A of the old Act). For a return filed on time it counts from 1 April 2027, so a ${inr(mainRefund)} refund granted in October 2027 earns ${inr(octInterest)}. No interest is paid if the refund is less than 10% of your tax.`,
        },
        {
            q: 'How do I check my income tax refund status?',
            a: 'Log in to the e-filing portal and open e-File → Income Tax Returns → View Filed Returns, then View Details for the year. It shows whether the refund was issued, adjusted against a demand or failed, for example because the PAN is inoperative or the bank account is not pre-validated.',
        },
        {
            q: 'How do I claim a TDS refund?',
            a: 'By filing your income tax return; there is no separate refund form. Report all income, claim the TDS shown in your Annual Information Statement, e-verify the return and keep a pre-validated bank account on the portal.',
        },
        {
            q: 'What replaced Form 16 for tax year 2026-27?',
            a: 'Form No. 130 under rule 215 of the Income-tax Rules, 2026. Your employer must issue it by 15 June after the tax year, so by 15 June 2027 for salary paid in 2026-27.',
        },
        {
            q: 'Can I get a refund if I file my return late?',
            a: 'Yes, through a belated return filed by 31 December 2027 for tax year 2026-27. Interest under section 437 then runs only from the date you file, not from 1 April, and a late fee under section 428 may apply.',
        },
    ],
    related: [
        { href: '/income-tax', label: 'Income tax calculator FY 2026-27', note: 'Your tax for the year in the new regime' },
        { href: '/income-tax-due-dates', label: 'Income tax due dates', note: 'Return, advance tax and Form No. 130 deadlines' },
        { href: '/old-vs-new-tax-regime', label: 'Old vs new tax regime', note: 'Which regime to file under' },
        { href: '/lrs-tcs', label: 'TCS on foreign remittance', note: 'TCS you can claim back in the return' },
        { href: '/fd', label: 'FD calculator', note: 'Interest your bank may deduct TDS on' },
    ],
    disclaimer: 'tax',
};
