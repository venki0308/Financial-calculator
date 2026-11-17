/**
 * /education-loan — primary query "education loan emi calculator" (SEO_PLAN.md §5a; owner's
 * decision §9-1 (a): explain moratorium interest with a worked example; the app has no moratorium
 * input and the page says so). Figures: math-loans.educationLoan (simple interest during the
 * moratorium, then the app's calculateReducingEMI) and calculateReducingEMI directly.
 * Rules: Income-tax Act, 2025 s. 129 and s. 202(2); PIB on PM-Vidyalaxmi and PM-USP CSIS
 * (seo/research/verified-facts-loans.md).
 */
import { calculateReducingEMI } from '../../../utils/calculations';
import { educationLoan } from '../math-loans';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025 (s. 129; s. 202(2))', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const PIB_PMV = { label: 'PIB: Cabinet approves PM-Vidyalaxmi (6 Nov 2024)', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2071131' };
const PIB_PMV_2026 = { label: 'PIB backgrounder: PM Vidyalaxmi Scheme (29 Jul 2026)', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2290972' };

// Main example: ₹10 lakh at 10%, 4-year course + 1 year = 5-year moratorium, repaid over 10 years.
const P = 1000000, R = 10, MOR = 5, REPAY = 10;
/** Both subvention schemes pay on at most ₹10 lakh of the loan (PIB, 29 Jul 2026). */
const SUB_CAP = 1000000;
const added = educationLoan(P, R, MOR, REPAY, 'added');
const paid = educationLoan(P, R, MOR, REPAY, 'paid');
const pmv = educationLoan(P, R, MOR, REPAY, 'added', 3, SUB_CAP);
const csis = educationLoan(P, R, MOR, REPAY, 'added', R, SUB_CAP);
const firstYearInterest = added.schedule.slice(0, 12).reduce((s, m) => s + m.interest, 0);

const LOANS = [500000, 750000, 1000000, 2000000, 3000000];
const EMI_LOANS = [500000, 1000000, 2000000, 3000000, 5000000];
const EMI_YEARS = [5, 7, 10, 15];

function Body() {
    const s1 = educationLoan(750000, 9.5, 3, 7, 'added');
    const s2 = educationLoan(2000000, 10.5, 3, 10, 'paid');
    const s2a = educationLoan(2000000, 10.5, 3, 10, 'added');
    const s3 = educationLoan(400000, 9, 4, 5, 'added');
    return (
        <>
            <Section title="What the moratorium does to an education loan">
                <p>
                    Many education loans come with a repayment holiday — the moratorium — while you study and for a while after. Under
                    PM-Vidyalaxmi it is the course period plus one year, and repayment can then run for up to 15 years. Unless a subvention
                    scheme pays it, interest keeps running on the amount disbursed during the holiday. So the question is what happens to that interest.
                </p>
                <ul>
                    <li><strong>You pay it as it falls due.</strong> The EMI later is worked out on the loan itself.</li>
                    <li><strong>It is added to the loan</strong> when repayment starts. The EMI is then worked out on the larger balance, and you pay interest on that interest for the whole repayment period.</li>
                </ul>
                <p>
                    The FinCalix app’s EMI calculator has an education-loan setting but no moratorium input: it treats the loan as repayable from
                    the first month. The calculator on this page adds the moratorium interest first, then works out the EMI with the same EMI maths
                    as the app.
                </p>
            </Section>

            <Section title={`Worked example: ${amt(P)} at ${R}%, ${MOR}-year moratorium, ${REPAY}-year repayment`}>
                <ol className="steps">
                    <li>Assume the full {amt(P)} is paid out at the start of a 4-year course, and repayment begins one year after the course ends: a {MOR}-year moratorium.</li>
                    <li>Interest for one year = {inr(P)} × {R}% = {inr(P * R / 100)}, or about {inr(paid.monthlyInterest)} a month. Over {MOR} years (simple interest): {inr(added.moratoriumInterest)}.</li>
                    <li><strong>Added to the loan:</strong> repayment starts on {inr(added.startBalance)}. EMI over {REPAY} years at {R}% = {inr(added.emi)}. You repay {inr(added.totalPaid)} in all, so the loan costs {inr(added.totalInterest)} in interest.</li>
                    <li><strong>Paid during the moratorium:</strong> {inr(paid.monthlyInterest)} a month for {MOR} years, then an EMI of {inr(paid.emi)} on {inr(P)}. Total paid {inr(paid.totalPaid)}; interest {inr(paid.totalInterest)}.</li>
                    <li>Paying the interest as you go saves {inr(added.totalPaid - paid.totalPaid)} and keeps the EMI {inr(added.emi - paid.emi)} a month lower.</li>
                </ol>
                <p>
                    Real loans are paid out in instalments (fees each year), so interest runs on a smaller amount in the early years; and lenders’
                    terms on moratorium interest differ. Your sanction letter and Key Facts Statement say how your lender charges it.
                </p>
            </Section>

            <Section title="Moratorium interest by loan size">
                <DataTable
                    caption={`Interest that builds up during the moratorium at ${R}% (simple interest), and the EMI over ${REPAY} years if it is added to the loan`}
                    head={['Loan', 'Interest, 3-year moratorium', 'EMI if added (3 yr)', 'Interest, 5-year moratorium', 'EMI if added (5 yr)', 'EMI if paid as you go']}
                    rows={LOANS.map((l) => {
                        const a3 = educationLoan(l, R, 3, REPAY, 'added');
                        const a5 = educationLoan(l, R, 5, REPAY, 'added');
                        const pg = educationLoan(l, R, 5, REPAY, 'paid');
                        return [amt(l), inr(a3.moratoriumInterest), inr(a3.emi), inr(a5.moratoriumInterest), inr(a5.emi), inr(pg.emi)];
                    })}
                    note="Assumes the whole loan is disbursed at the start. Paying the interest during the moratorium keeps the EMI at the last column’s level, whatever the length of the moratorium."
                />
            </Section>

            <Section title="Education loan EMI once repayment starts">
                <DataTable
                    caption={`EMI at ${R}% on the balance when repayment begins`}
                    head={['Balance at start of repayment', ...EMI_YEARS.map((y) => `${y} years`)]}
                    rows={EMI_LOANS.map((l) => [amt(l), ...EMI_YEARS.map((y) => inr(calculateReducingEMI(l, R, y * 12).emi))])}
                    note="If the moratorium interest was added, look up the larger balance (loan + interest), not the amount you borrowed."
                />
            </Section>

            <Section title="Government help with moratorium interest">
                <ul>
                    <li><strong>PM-USP CSIS:</strong> full interest subvention during the moratorium on education loans up to {amt(1000000)}, for students with family income up to {amt(450000)} a year in technical or professional courses at approved institutions.</li>
                    <li><strong>PM-Vidyalaxmi:</strong> 3% interest subvention during the moratorium on loans up to {amt(1000000)}, for students admitted on merit to the listed quality institutions with family income up to {amt(800000)}, for up to one lakh new students a year. Students getting another government scholarship or interest subvention are not eligible.</li>
                </ul>
                <DataTable
                    caption={`Effect on the ${amt(P)} example (interest added to the loan)`}
                    head={['Case', 'Moratorium interest you bear', 'EMI over 10 years', 'Total interest']}
                    rows={[
                        ['No subvention', inr(added.moratoriumInterest), inr(added.emi), inr(added.totalInterest)],
                        ['3% subvention (PM-Vidyalaxmi)', inr(pmv.moratoriumInterest), inr(pmv.emi), inr(pmv.totalInterest)],
                        ['Full subvention (CSIS)', inr(csis.moratoriumInterest), inr(csis.emi), inr(csis.totalInterest)],
                    ]}
                    note={`Subvention lowers the rate you bear during the moratorium only; after it, the full ${R}% applies to the balance.`}
                />
            </Section>

            <Section title="Tax deduction for education loan interest (old 80E, now section 129)">
                <p>
                    Section 129 of the Income-tax Act, 2025 replaces section 80E. An individual can deduct the interest paid in a tax year on a
                    loan for higher education — their own, or that of a spouse, child or a student they are legal guardian of — taken from a
                    bank, another notified financial institution or an approved charitable institution, and paid out of taxable income. The
                    section sets no rupee limit. The deduction runs for the tax year in which you start paying interest and the seven years after,
                    or until the interest is fully paid, whichever is earlier.
                </p>
                <p>
                    In the example above, the first twelve EMIs on {inr(added.startBalance)} carry {inr(firstYearInterest)} of interest, all of it
                    deductible in the old regime. The new regime allows no section 129 deduction. Because the eight years start from the first
                    interest payment, paying interest during the moratorium out of taxable income also starts that clock.
                </p>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `${amt(750000)} at 9.5%, 2-year course + 1 year, repaid over 7 years (interest added)`, body: <>Moratorium interest {inr(s1.moratoriumInterest)}; EMI {inr(s1.emi)} on {inr(s1.startBalance)}.</> },
                    { title: `${amt(2000000)} at 10.5%, 3-year moratorium, 10-year repayment`, body: <>Paying {inr(s2.monthlyInterest)} a month while studying keeps the EMI at {inr(s2.emi)}; letting the interest pile up raises it to {inr(s2a.emi)} and adds {inr(s2a.totalPaid - s2.totalPaid)} to what you repay.</> },
                    { title: `${amt(400000)} at 9%, 4-year moratorium, 5-year repayment (interest added)`, body: <>{inr(s3.moratoriumInterest)} of interest builds up; the EMI is {inr(s3.emi)}.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Section 129: deduction of interest on a loan for higher education of the individual or a relative (spouse, children, or a student of whom the individual is legal guardian), from a bank, notified financial institution or approved charitable institution, paid out of income chargeable to tax; for the initial tax year and the seven following, or until the interest is paid, if earlier. Higher education = any course after the senior secondary examination.', source: ACT },
                { text: 'In the new regime (section 202(2)(a)(xii)) Chapter VIII deductions, including section 129, are not allowed.', source: ACT },
                { text: 'PM-Vidyalaxmi: collateral-free, guarantor-free loans for merit admissions to listed quality institutions; 75% credit guarantee on loans up to ₹7.5 lakh; 3% interest subvention during the moratorium on loans up to ₹10 lakh for family income up to ₹8 lakh.', source: PIB_PMV },
                { text: 'PM-Vidyalaxmi loans: rate capped at the bank’s EBLR + 0.5%; moratorium = course period plus one year; repayment up to 15 years after it; no upper cut-off on the loan, which follows fees and course-related costs. PM-USP CSIS: full interest subvention during the moratorium for family income up to ₹4.5 lakh, loans up to ₹10 lakh.', source: PIB_PMV_2026 },
            ]} />
        </>
    );
}

export const educationLoanPage: FeatureDef = {
    slug: 'education-loan',
    title: 'Education Loan EMI Calculator with Moratorium Interest',
    description: 'Education loan EMI after the moratorium: interest during study, paid or added to the loan, government subvention and the section 129 tax deduction.',
    h1: 'Education loan EMI calculator, with the moratorium worked out',
    crumb: 'Education loan EMI',
    category: 'loans',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Education Loan EMI',
    eyebrow: 'Education loan · moratorium',
    answer: (
        <>
            <p>On a {amt(P)} education loan at {R}% with a {MOR}-year moratorium (4-year course + 1 year), {inr(added.moratoriumInterest)} of interest builds up before the first EMI. Added to the loan, it makes the EMI {inr(added.emi)} over 10 years; paying it while you study (about {inr(paid.monthlyInterest)} a month) keeps the EMI at {inr(paid.emi)}.</p>
            <p>The interest you pay is deductible without a rupee limit for up to eight tax years under section 129 of the Income-tax Act, 2025, in the old regime only.</p>
        </>
    ),
    sources: [ACT, PIB_PMV, PIB_PMV_2026],
    calc: { key: 'education-loan', props: { amount: P, rate: R, moratorium: MOR, repay: REPAY } },
    Body,
    faqs: [
        { q: 'What is the moratorium period in an education loan?', a: 'It is the repayment holiday before your first EMI; under PM-Vidyalaxmi it is the course period plus one year. Interest still runs during it unless a subvention scheme covers it, which is why the EMI can be higher than the loan amount suggests.' },
        { q: 'When does the EMI start on an education loan?', a: 'After the moratorium ends, on the date in your sanction letter. Under PM-Vidyalaxmi that is one year after the course, with up to 15 years to repay.' },
        { q: 'What is the EMI on a ₹20 lakh education loan for 5 years?', a: `${inr(calculateReducingEMI(2000000, R, 60).emi)} a month at ${R}% if ₹20 lakh is the balance when repayment starts. If moratorium interest was added, work it out on the larger balance: after a 3-year moratorium at ${R}% it would be ${inr(educationLoan(2000000, R, 3, 5, 'added').emi)}.` },
        { q: 'Which section replaced 80E for education loan interest?', a: 'Section 129 of the Income-tax Act, 2025, from tax year 2026-27. It allows the interest paid, with no rupee limit, for eight tax years starting with the year you begin paying interest — in the old regime only.' },
        { q: 'Does the FinCalix app calculate the moratorium?', a: 'No. The app’s EMI calculator has an education-loan setting, but it assumes repayment starts in the first month. Use the calculator on this page to add the moratorium interest, then save the EMI in the app.' },
        { q: 'Education loan kitna milta hai?', a: 'PM-Vidyalaxmi mein loan ki koi upper limit tay nahi hai — course fees, hostel-mess, laptop aur zaroori kharche jitna loan ban sakta hai, bina collateral aur guarantor ke, agar admission listed institution mein merit par hua ho. Doosre loans mein limit bank khud tay karta hai.' },
    ],
    related: [
        { href: '/emi', label: 'EMI calculator', note: 'EMI per lakh for any loan' },
        { href: '/lrs-tcs', label: 'TCS on foreign remittance', note: 'Paying fees abroad' },
        { href: '/old-vs-new-tax-regime', label: 'Old vs new tax regime', note: 'Whether the section 129 deduction tips the balance' },
        { href: '/personal-loan', label: 'Personal loan EMI calculator', note: 'Fees, GST and APR on other loans' },
    ],
    disclaimer: { text: 'Education loan figures assume the whole loan is paid out at the start and simple interest during the moratorium. Lenders disburse in stages and set their own moratorium terms in the sanction letter and Key Facts Statement; subvention eligibility is decided under each scheme. FinCalix is not a bank, NBFC or lender.' },
};
