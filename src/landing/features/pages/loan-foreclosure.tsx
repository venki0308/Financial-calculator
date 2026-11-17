/**
 * /loan-foreclosure — primary query "loan foreclosure calculator" (SEO_PLAN.md §5a).
 * Figures: the app's calculateReducingEMI + calculateForeclosure (src/utils/calculations.ts) and,
 * for interest since the last EMI, getPeriodInterest (src/utils/creditCardCalculations.ts:
 * balance × rate ÷ 365 × days — the same per-day formula loanStatusEngine.calculateLiveLoanStatus
 * uses for My Loans' "close this loan today"). Part-prepayment lives on /home-loan-prepayment.
 * Rules: RBI Responsible Business Conduct Directions 2025 (seo/research/verified-facts-credit.md).
 */
import { calculateForeclosure, calculateReducingEMI } from '../../../utils/calculations';
import { getPeriodInterest } from '../../../utils/creditCardCalculations';
import { yearsMonths } from '../derive';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RBI_RBC = { label: 'RBI Responsible Business Conduct Directions, 2025 (paras 352–360)', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13140' };
const RBI_CIR = { label: 'RBI Credit Information Reporting Directions, 2025 (para 10)', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13154' };

/** Foreclosure after `paid` EMIs, with an optional charge (% of the amount prepaid). */
function close(P: number, rate: number, months: number, paid: number, chargePct = 0) {
    const e = calculateReducingEMI(P, rate, months);
    const f = calculateForeclosure(e.schedule, paid, chargePct)!;
    return { ...f, emi: e.emi, totalInterest: e.totalInterest };
}

// Main example: ₹5 lakh personal loan, 11%, 5 years, closed right after the 24th EMI.
const P = 500000, R = 11, N = 60, AT = 24;
const main = close(P, R, N, AT);
const GAP = 12;
const gapInterest = getPeriodInterest(main.outstandingPrincipal, R, GAP);
// Fixed-rate car loan whose sanction letter shows a 2% foreclosure charge.
const CAR = { P: 800000, R: 9, N: 84, AT: 36, CH: 2 };
const car = close(CAR.P, CAR.R, CAR.N, CAR.AT, CAR.CH);

function Body() {
    const points = [6, 12, 24, 36, 48];
    const charges = [0, 1, 2, 3, 4];
    const home = close(4000000, 8.5, 240, 60);
    const late = close(P, R, N, 48);
    return (
        <>
            <Section title="What you pay to close the loan, and what you save">
                <DataTable
                    caption={`${amt(P)} personal loan at ${R}% for ${N / 12} years (EMI ${inr(main.emi)}), closed right after an EMI`}
                    head={['Closed after', 'Principal still owed', 'Interest already paid', 'Future interest you no longer pay']}
                    rows={points.map((m) => {
                        const f = close(P, R, N, m);
                        return [`${m} EMIs (${yearsMonths(m)})`, inr(f.outstandingPrincipal), inr(f.totalInterestPaid), inr(f.interestSaved)];
                    })}
                    note={`Total interest over the full ${N / 12} years: ${inr(main.totalInterest)}. Same schedule as the FinCalix app (reducing balance, EMI rounded up to the rupee). Closing between EMI dates adds interest for the extra days.`}
                />
                <p>
                    By the halfway mark ({N / 2} EMIs) you have already paid {inr(close(P, R, N, N / 2).totalInterestPaid)} of the {inr(main.totalInterest)} interest, so the saving falls quickly: closing after 6 EMIs avoids
                    {' '}{inr(close(P, R, N, 6).interestSaved)} of interest, after 48 EMIs only {inr(late.interestSaved)}.
                </p>
            </Section>

            <Section title="How the foreclosure amount is worked out">
                <ol className="steps">
                    <li>Run the schedule up to the last EMI paid. After {AT} EMIs of {inr(main.emi)}, the principal still owed is {inr(main.outstandingPrincipal)}.</li>
                    <li>Add interest for the days since that EMI: balance × {R}% ÷ 365 × days. Paying {GAP} days after the EMI adds about {inr(gapInterest)}.</li>
                    <li>Add the foreclosure charge, if your loan can carry one — nil on a floating-rate loan to an individual; for other loans, the charge written in your sanction letter or Key Facts Statement.</li>
                    <li>Interest saved = the interest the remaining {N - AT} EMIs would have carried: {inr(main.interestSaved)} here, less any charge and the extra days’ interest.</li>
                </ol>
                <p>Ask the lender for a foreclosure statement before you pay; it is the figure that counts.</p>
            </Section>

            <Section title="When a foreclosure charge applies">
                <p>
                    RBI’s rules for banks leave no foreclosure charge on floating-rate loans to individuals, whether for personal or business use, and
                    none on floating-rate business loans to micro and small enterprises. Fixed-rate loans can carry a charge set by the
                    lender’s policy, but only if it is disclosed in the sanction letter and loan agreement, and on a term loan it is worked
                    out on the amount you prepay. Here is how much such a charge eats into the saving on a fixed-rate car loan:
                </p>
                <DataTable
                    caption={`${amt(CAR.P)} car loan at ${CAR.R}% for ${CAR.N / 12} years, closed after ${CAR.AT} EMIs (${inr(car.outstandingPrincipal)} prepaid)`}
                    head={['Charge in your agreement', 'Charge on the amount prepaid', 'Interest avoided', 'Net saving']}
                    rows={charges.map((c) => {
                        const f = close(CAR.P, CAR.R, CAR.N, CAR.AT, c);
                        return [c === 0 ? 'Nil' : `${c}%`, inr(f.foreclosureCharge), inr(f.interestSaved), inr(f.netBenefit)];
                    })}
                    note="Percentages here are only illustrations; your charge (if any) is the one in your sanction letter, loan agreement and Key Facts Statement."
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `A ${amt(4000000)} home loan at 8.5% over 20 years, closed after 5 years`, body: <>You pay off {inr(home.outstandingPrincipal)} of principal and avoid {inr(home.interestSaved)} of interest still scheduled. If the loan is on a floating rate, a bank can’t add a charge. To pay only part of it instead, see the prepayment calculator.</> },
                    { title: `The same ${amt(P)} personal loan, closed after 4 years`, body: <>Only {inr(late.outstandingPrincipal)} is left and closing saves {inr(late.interestSaved)} — useful if you need the loan off your books, but small in money terms.</> },
                    { title: `A fixed-rate car loan with a ${CAR.CH}% charge`, body: <>Closing the {amt(CAR.P)} loan after {CAR.AT / 12} years costs {inr(car.totalSettlement)} including a {inr(car.foreclosureCharge)} charge; the net saving is still {inr(car.netBenefit)}.</> },
                    { title: 'Getting your papers back', body: <>Once the loan is fully repaid, the lender has 30 days to return your original property documents and remove its charge. Each day of delay the lender causes after that owes you ₹5,000.</> },
                ]} />
            </Section>

            <Section title="Your loan, live, in the FinCalix app">
                <p>
                    Add a loan to My Loans once — amount, rate, tenure, EMI, disbursement date, EMI day and fixed or floating — and the app keeps
                    its position up to date: EMIs paid and left, principal still owed, the split of your next EMI and a “close this loan
                    today” figure that adds the interest since your last EMI, counted per day. For a floating-rate loan it shows no
                    foreclosure charge; for a fixed-rate loan it adds an estimate, so check it against your agreement. Your financial data
                    stays on your device.
                </p>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Banks may not levy a pre-payment charge on floating-rate loans to individuals for non-business purposes, or on floating-rate business loans to individuals and micro and small enterprises — for part or full prepayment, from any source of funds, with no lock-in. This covers loans sanctioned or renewed from 1 January 2026; existing floating-rate non-business loans to individuals carry no charge either.', source: RBI_RBC },
                { text: 'Other loans may carry a charge under the lender’s board-approved policy; on a term loan it is based on the amount prepaid. It must be in the sanction letter and loan agreement (and the Key Facts Statement where one is required), and no charge applies when the lender itself asks for the prepayment.', source: RBI_RBC },
                { text: 'Original property documents must be released within 30 days of full repayment, with compensation of ₹5,000 for each day of delay caused by the lender.', source: RBI_RBC },
                { text: 'Lenders must report every repayment to the credit bureaus, the last instalment included.', source: RBI_CIR },
            ]} />
        </>
    );
}

export const loanForeclosure: FeatureDef = {
    slug: 'loan-foreclosure',
    title: 'Loan Foreclosure Calculator: Amount, Charges, Savings',
    description: 'Foreclosure amount and interest saved when you close a loan early, after any number of EMIs, and RBI’s rules on charges for floating and fixed rates.',
    h1: 'Loan foreclosure calculator: how much to close your loan today',
    crumb: 'Loan foreclosure',
    category: 'loans',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Loan Foreclosure',
    eyebrow: 'Loans · closing early',
    answer: (
        <>
            <p>Closing a {amt(P)} personal loan at {R}% for {N / 12} years right after the {AT}th EMI takes {inr(main.outstandingPrincipal)} and saves {inr(main.interestSaved)} of interest you would otherwise have paid.</p>
            <p>A bank can’t charge for foreclosing a floating-rate loan to an individual under RBI’s 2025 rules; a fixed-rate loan may, but only the charge disclosed in your sanction letter, worked out on the amount you prepay.</p>
        </>
    ),
    sources: [RBI_RBC],
    calc: { key: 'loan-foreclosure', props: { amount: P, rate: R, years: N / 12, paid: AT, charge: 0 } },
    Body,
    faqs: [
        { q: 'How do I calculate my loan foreclosure amount?', a: `Take the principal still owed after your last EMI, add interest for the days since that EMI, and add any foreclosure charge in your agreement. For ${amt(P)} at ${R}% over ${N / 12} years, the principal after ${AT} EMIs is ${inr(main.outstandingPrincipal)}; ${GAP} extra days add about ${inr(gapInterest)}.` },
        { q: 'Is loan foreclosure good or bad?', a: `It saves money whenever the interest avoided is more than any charge: ${inr(main.interestSaved)} on the page’s personal loan after two years. Keep an emergency fund first, and compare with what the money would earn elsewhere.` },
        { q: 'Are there foreclosure charges on a personal loan?', a: 'Only on some. A bank can’t charge one on a floating-rate personal loan under RBI rules; a fixed-rate loan can carry the charge stated in your sanction letter and Key Facts Statement, calculated on the amount prepaid. Check which rate type your loan has.' },
        { q: 'Should I foreclose or make a part-payment?', a: 'Foreclosure ends the loan; a part-payment lowers the balance and then either the EMI or the tenure. If you can’t clear it all, a part-payment early in the loan still saves a lot — see the home loan prepayment calculator.' },
        { q: 'How soon do I get my property papers after closing a loan?', a: 'Within 30 days of full repayment. If the lender takes longer, RBI rules require it to pay you ₹5,000 for each day of delay (60 days are allowed if the documents were lost or damaged).' },
        { q: 'Will closing my loan early show on my credit report?', a: 'It should. RBI requires lenders to report every repayment to the credit bureaus, including the last instalment, so keep the closure letter and check your report a few weeks later.' },
    ],
    related: [
        { href: '/home-loan-prepayment', label: 'Home loan prepayment calculator', note: 'Pay part of the loan instead' },
        { href: '/personal-loan', label: 'Personal loan EMI calculator', note: 'EMI and interest before you borrow' },
        { href: '/emi', label: 'EMI calculator', note: 'Full schedule for any loan' },
        { href: '/cibil-score', label: 'CIBIL score guide', note: 'How a closed loan shows on your report' },
    ],
    disclaimer: 'loan',
};
