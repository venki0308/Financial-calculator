/**
 * /home-loan-prepayment — primary query "home loan prepayment calculator" (SEO_PLAN.md §5a).
 * Every figure is computed by the app's calculateAdvancedMortgage (src/utils/calculations.ts)
 * through derive.prepaymentScenario. Rules: seo/research/verified-facts-2026-11-17.md.
 */
import { prepaymentScenario, yearsMonths } from '../derive';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RBI_RBC = { label: 'RBI Responsible Business Conduct Directions, 2025 (paras 352–353)', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13140' };
const RBI_PREPAY = { label: 'RBI Pre-payment Charges on Loans Directions, 2025', url: 'https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12878' };
const ACT = { label: 'Income-tax Act, 2025', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };

// The page's main example: ₹30 lakh at 8.5% for 20 years, ₹3 lakh prepaid with the 36th EMI.
const P = 3000000, R = 8.5, Y = 20, PRE = 300000, AT = 36;
const tenure = prepaymentScenario(P, R, Y, PRE, AT, 'reduce_tenure');
const emi = prepaymentScenario(P, R, Y, PRE, AT, 'reduce_emi');

function Body() {
    const amounts = [100000, 200000, 300000, 500000, 1000000];
    const timings = [12, 36, 60, 120, 180];
    const s1 = prepaymentScenario(5000000, 7.5, 25, 500000, 24, 'reduce_tenure');
    const s2 = prepaymentScenario(7500000, 8, 30, 1000000, 60, 'reduce_emi');
    const s3 = prepaymentScenario(2000000, 9, 15, 200000, 96, 'reduce_tenure');
    const s4t = prepaymentScenario(4000000, 8.25, 20, 150000, 12, 'reduce_tenure');
    return (
        <>
            <Section title="Why a prepayment saves so much interest">
                <p>
                    Every EMI pays the month’s interest on what you still owe and the rest goes to the principal. In the early years
                    most of the EMI is interest: on a {amt(P)} loan at {R}% the first EMI of {inr(tenure.emi)} carries
                    {' '}{inr(Math.round((P * R) / 1200))} of interest. A prepayment goes straight to the principal, so every later month
                    charges interest on a smaller balance. That is why the same amount saves more the earlier you pay it.
                </p>
                <p>After a prepayment the lender asks you to choose one of two options:</p>
                <ul>
                    <li><strong>Keep the EMI, cut the tenure.</strong> You pay the same EMI and the loan ends sooner. This saves the most interest.</li>
                    <li><strong>Keep the tenure, cut the EMI.</strong> The loan ends on the original date with a lower EMI. You save less interest but free up monthly cash.</li>
                </ul>
            </Section>

            <Section title="Reduce tenure or reduce EMI: the same prepayment, both ways">
                <DataTable
                    caption={`${amt(P)} loan, ${R}%, ${Y} years (EMI ${inr(tenure.emi)}), prepayment paid with the ${AT}th EMI`}
                    head={['Prepayment', 'Interest saved (keep EMI)', 'Loan ends earlier by', 'Interest saved (keep tenure)', 'New EMI']}
                    rows={amounts.map((a) => {
                        const t = prepaymentScenario(P, R, Y, a, AT, 'reduce_tenure');
                        const e = prepaymentScenario(P, R, Y, a, AT, 'reduce_emi');
                        return [amt(a), inr(t.saved), yearsMonths(t.monthsSaved), inr(e.saved), inr(e.newEmi)];
                    })}
                    note={`Total interest with no prepayment: ${inr(tenure.baseInterest)}. Computed with the same mortgage maths as the FinCalix app (reducing balance, EMI rounded up to the rupee).`}
                />
            </Section>

            <Section title="When you prepay matters as much as how much">
                <DataTable
                    caption={`${amt(PRE)} prepaid on the same ${amt(P)} loan, keeping the EMI`}
                    head={['Paid after', 'Interest saved', 'Loan ends earlier by']}
                    rows={timings.map((m) => {
                        const t = prepaymentScenario(P, R, Y, PRE, m, 'reduce_tenure');
                        return [yearsMonths(m), inr(t.saved), yearsMonths(t.monthsSaved)];
                    })}
                />
                <p>
                    The same {amt(PRE)} saves {inr(prepaymentScenario(P, R, Y, PRE, 12, 'reduce_tenure').saved)} if paid after one year
                    but only {inr(prepaymentScenario(P, R, Y, PRE, 180, 'reduce_tenure').saved)} after fifteen years, because by then
                    little interest is left to save.
                </p>
            </Section>

            <Section title="How the calculator works it out">
                <ol className="steps">
                    <li>Work out the EMI for the full loan: {inr(tenure.emi)} for {amt(P)} at {R}% over {Y} years.</li>
                    <li>Run the loan month by month: interest = balance × {R}% ÷ 12; principal = EMI − interest.</li>
                    <li>In the month of the prepayment, take the extra {amt(PRE)} off the balance as well.</li>
                    <li>Keep EMI: carry on with {inr(tenure.emi)} until the balance is zero — here {yearsMonths(tenure.newMonths)} instead of {Y} years. Keep tenure: recompute the EMI on the new balance for the months left — here {inr(emi.newEmi)}.</li>
                    <li>Interest saved = total interest without the prepayment ({inr(tenure.baseInterest)}) minus total interest with it ({inr(tenure.newInterest)} keeping the EMI, {inr(emi.newInterest)} keeping the tenure).</li>
                </ol>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `${amt(5000000)} at 7.5% for 25 years, ${amt(500000)} prepaid after 2 years`, body: <>Keeping the EMI of {inr(s1.emi)}, the loan ends {yearsMonths(s1.monthsSaved)} early and you save {inr(s1.saved)} of interest.</> },
                    { title: `${amt(7500000)} at 8% for 30 years, ${amt(1000000)} prepaid after 5 years, EMI reduced`, body: <>The EMI drops from {inr(s2.emi)} to {inr(s2.newEmi)} for the rest of the loan, and total interest falls by {inr(s2.saved)}.</> },
                    { title: `${amt(2000000)} at 9% for 15 years, ${amt(200000)} prepaid after 8 years`, body: <>A late prepayment still helps, but less: {inr(s3.saved)} of interest saved and the loan ends {yearsMonths(s3.monthsSaved)} early.</> },
                    { title: `A yearly bonus of ${amt(150000)} on a ${amt(4000000)} loan at 8.25%`, body: <>Even one bonus prepaid after the first year saves {inr(s4t.saved)} and ends the loan {yearsMonths(s4t.monthsSaved)} early. The FinCalix app lets you add several prepayments to the same loan.</> },
                ]} />
            </Section>

            <Section title="Prepay or invest the money?">
                <p>
                    A prepayment earns you exactly your loan’s interest rate, with no risk, because that is the interest you stop paying.
                    Investing earns whatever the investment returns, which can be more or less. Things to weigh before you prepay:
                </p>
                <ul>
                    <li><strong>Keep an emergency fund first.</strong> Money paid into the loan can’t be taken back out.</li>
                    <li><strong>Your tax regime.</strong> In the old regime, interest on a home loan for the house you live in is deductible up to {inr(200000)} a year, and the principal counts towards the {inr(150000)} limit of section 123 (the old 80C). In the new regime neither is deductible, so a prepayment there saves the full interest.</li>
                    <li><strong>Your rate.</strong> The higher the loan rate, the stronger the case for prepaying. Compare it with the after-tax return you realistically expect.</li>
                </ul>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Banks and other lenders may not charge any pre-payment penalty on a floating-rate loan to an individual for a non-business purpose — for part or full prepayment, from any source of funds, with no minimum lock-in. This covers loans sanctioned or renewed from 1 January 2026; existing floating-rate loans to individuals carry no charge either.', source: RBI_RBC },
                { text: 'For other loans (for example fixed-rate loans), any pre-payment charge must be disclosed in the sanction letter, loan agreement and Key Facts Statement; a charge that was not disclosed can’t be levied.', source: RBI_PREPAY },
                { text: 'Old regime only: interest on a home loan for a self-occupied house is deductible up to ₹2 lakh a year (section 22 of the Income-tax Act, 2025) and principal repaid counts under section 123 (old 80C). Neither is allowed in the new regime.', source: ACT },
            ]} />
        </>
    );
}

export const homeLoanPrepayment: FeatureDef = {
    slug: 'home-loan-prepayment',
    title: 'Home Loan Prepayment Calculator: Cut EMI or Tenure',
    description: 'See how much interest a part-prepayment saves on your home loan, keeping the EMI or the tenure, with real examples and the RBI no-penalty rule.',
    h1: 'Home loan prepayment calculator: reduce tenure or reduce EMI?',
    crumb: 'Home loan prepayment',
    category: 'loans',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Home Loan Prepayment',
    eyebrow: 'Home loan · part-prepayment',
    answer: (
        <>
            <p>Prepaying {amt(PRE)} after three years on a {amt(P)} home loan at {R}% for {Y} years saves {inr(tenure.saved)} of interest if you keep the EMI of {inr(tenure.emi)}, and the loan ends {yearsMonths(tenure.monthsSaved)} early.</p>
            <p>If you keep the tenure instead, the EMI drops to {inr(emi.newEmi)} and you save {inr(emi.saved)}. Floating-rate home loans to individuals carry no prepayment charge under RBI rules.</p>
        </>
    ),
    sources: [RBI_RBC, RBI_PREPAY],
    calc: { key: 'prepayment', props: { amount: P, rate: R, years: Y, prepay: PRE, afterYears: 3 } },
    Body,
    faqs: [
        {
            q: 'Is it better to reduce EMI or tenure after a home loan prepayment?',
            a: `Reducing the tenure saves more interest. On ${amt(P)} at ${R}% for ${Y} years, ${amt(PRE)} prepaid after three years saves ${inr(tenure.saved)} if you keep the EMI, against ${inr(emi.saved)} if you lower the EMI. Lower the EMI only if you need the monthly cash.`,
        },
        {
            q: 'Are there prepayment charges on a home loan?',
            a: 'Not on a floating-rate home loan to an individual: RBI rules bar pre-payment charges on floating-rate loans to individuals for non-business purposes, for part or full prepayment and with no lock-in. A fixed-rate loan can carry a charge, but only if it was disclosed in your sanction letter and Key Facts Statement.',
        },
        {
            q: 'When is the best time to prepay a home loan?',
            a: `As early as you can, because the interest saved shrinks every year. The same ${amt(PRE)} saves ${inr(prepaymentScenario(P, R, Y, PRE, 12, 'reduce_tenure').saved)} after one year but ${inr(prepaymentScenario(P, R, Y, PRE, 120, 'reduce_tenure').saved)} after ten years on a ${amt(P)} loan at ${R}%.`,
        },
        {
            q: 'How much do I save by prepaying ₹1 lakh on my home loan?',
            a: `On a ${amt(P)} loan at ${R}% for ${Y} years, ${amt(100000)} prepaid after three years saves ${inr(prepaymentScenario(P, R, Y, 100000, AT, 'reduce_tenure').saved)} of interest and ends the loan ${yearsMonths(prepaymentScenario(P, R, Y, 100000, AT, 'reduce_tenure').monthsSaved)} early, if you keep the EMI.`,
        },
        {
            q: 'Should I prepay my home loan or invest the money?',
            a: 'Prepaying earns your loan rate with no risk; investing may earn more or less. Keep an emergency fund first, compare your loan rate with the after-tax return you expect, and remember that in the old regime home-loan interest is deductible up to ₹2 lakh a year, while in the new regime it is not.',
        },
        {
            q: 'Does prepaying reduce my tax benefit?',
            a: 'Only in the old regime. A prepayment lowers the interest you pay, so the home-loan interest deduction (up to ₹2 lakh a year for the house you live in) falls too. In the new regime there is no such deduction, so you lose nothing.',
        },
    ],
    related: [
        { href: '/home-loan', label: 'Home loan EMI calculator', note: 'EMI, total interest and the full schedule' },
        { href: '/emi', label: 'EMI calculator', note: 'Any loan: car, personal, education' },
        { href: '/old-vs-new-tax-regime', label: 'Old vs new tax regime', note: 'Whether your home-loan deductions make the old regime cheaper' },
        { href: '/sip-for-1-crore', label: 'SIP for ₹1 crore', note: 'If you invest the money instead of prepaying' },
    ],
    disclaimer: 'loan',
};
