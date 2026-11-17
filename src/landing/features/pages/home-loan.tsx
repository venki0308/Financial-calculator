/**
 * /home-loan — primary query "home loan emi calculator" (SEO_PLAN.md §5a). Prepayment has its
 * own page (/home-loan-prepayment) and is only linked here.
 * Figures: the app's calculateReducingEMI and calculateTaxBenefits (src/utils/calculations.ts),
 * and math-loans.loanForEmi (a search over calculateReducingEMI).
 * Rules: Income-tax Act, 2025 ss. 21, 22, 109, 110, 123, 202 and Schedule XV (as amended by the
 * Finance Act, 2026); RBI Responsible Business Conduct Directions, 2025 — seo/research/verified-facts-loans.md.
 */
import { calculateReducingEMI, calculateTaxBenefits } from '../../../utils/calculations';
import { loanForEmi } from '../math-loans';
import { amt, inr, pct } from '../fmt';
import { yearsMonths } from '../derive';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025 (ss. 22, 109, 123, 202)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const FA26 = { label: 'Finance Act, 2026 (s. 38: amends s. 22(2))', url: 'https://egazette.gov.in/WriteReadData/2026/271439.pdf' };
const RBI_RBC = { label: 'RBI Responsible Business Conduct Directions, 2025 (paras 349, 352–353)', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13140' };

const emi = (p: number, r: number, years: number) => calculateReducingEMI(p, r, years * 12);

// Answer and calculator default: ₹50 lakh at 8.5% for 25 years.
const P = 5000000, R = 8.5, Y = 25;
const main = emi(P, R, Y);
const tax = calculateTaxBenefits(main.schedule);
const y1 = tax.schedule[0];

// Worked example: ₹40 lakh at 8.4% for 20 years.
const W_P = 4000000, W_R = 8.4, W_Y = 20;
const w = emi(W_P, W_R, W_Y);
const wr = W_R / 1200;
const wInt1 = W_P * wr;
const wAfter1 = w.schedule[11].closingBalance;
const wCross = w.schedule.findIndex((m) => m.principal > m.interest) + 1;

// Rate reset: the same ₹50 lakh loan after 3 years, rate up from 8.5% to 9%.
const RESET_AT = 36, NEW_R = 9;
const bal = main.schedule[RESET_AT - 1].closingBalance;
const left = Y * 12 - RESET_AT;
const higherEmi = calculateReducingEMI(bal, NEW_R, left);
const sameEmiMonths = (() => {
    for (let n = left; n <= 600; n++) if (calculateReducingEMI(bal, NEW_R, n).emi <= main.emi) return n;
    return null;
})();
const oldRest = calculateReducingEMI(bal, R, left);
const keepEmiPlan = sameEmiMonths ? calculateReducingEMI(bal, NEW_R, sameEmiMonths) : null;

const AMOUNTS = [2000000, 3000000, 4000000, 5000000, 7500000, 10000000];
const TENURES = [15, 20, 25, 30];
const INCOMES = [50000, 75000, 100000, 150000];

function Body() {
    const s1 = emi(3500000, 8.1, 20);
    const s2 = emi(10000000, 8.6, 30);
    const s3 = emi(6000000, 8.75, 15);
    const s4 = emi(2500000, 9.25, 25);
    return (
        <>
            <Section title={`Home loan EMI by amount and tenure at ${R}%`}>
                <DataTable
                    caption={`Monthly EMI at ${R}% a year (reducing balance)`}
                    head={['Loan', ...TENURES.map((t) => `${t} years`)]}
                    rows={AMOUNTS.map((a) => [amt(a), ...TENURES.map((t) => inr(emi(a, R, t).emi))])}
                    note={`${R}% is only an example rate; banks price each loan by its benchmark and your profile. Change the rate in the calculator above for your offer.`}
                />
                <DataTable
                    caption={`Total interest paid over the loan at ${R}%`}
                    head={['Loan', ...TENURES.map((t) => `${t} years`)]}
                    rows={AMOUNTS.map((a) => [amt(a), ...TENURES.map((t) => inr(emi(a, R, t).totalInterest))])}
                    note="Stretching from 20 to 30 years lowers the EMI a little but adds a lot of interest."
                />
            </Section>

            <Section title={`Worked example: ${amt(W_P)} at ${W_R}% for ${W_Y} years`}>
                <ol className="steps">
                    <li>Monthly rate = {W_R} ÷ 12 ÷ 100 = {wr.toFixed(5)}; instalments = {W_Y} × 12 = {W_Y * 12}.</li>
                    <li>EMI = 40,00,000 × r × (1 + r)<sup>240</sup> ÷ ((1 + r)<sup>240</sup> − 1) = {inr(w.emi)} (rounded up, as the FinCalix app does).</li>
                    <li>The first EMI carries {inr(wInt1)} of interest; only {inr(w.emi - wInt1)} goes to the principal.</li>
                    <li>After 12 EMIs you still owe {inr(wAfter1)} — about {inr(W_P - wAfter1)} less than you borrowed, though you paid {inr(w.emi * 12)}.</li>
                    <li>Principal first exceeds interest in EMI number {wCross} ({yearsMonths(wCross)} into the loan). Over {W_Y} years the interest totals {inr(w.totalInterest)}.</li>
                </ol>
            </Section>

            <Section title="Tax on a home loan under the Income-tax Act, 2025">
                <p>
                    From tax year 2026-27 the Income-tax Act, 2025 replaces the 1961 Act, so the familiar section numbers changed. The rules
                    for a home loan depend on your regime and on whether you live in the house or rent it out.
                </p>
                <ul>
                    <li><strong>House you live in, old regime.</strong> Interest is deductible under section 22(1)(b) (the old section 24(b)) up to {inr(200000)} a year in all for up to two such houses, provided the purchase or construction is completed within five years from the end of the tax year in which you borrowed and the lender certifies the interest. If that condition fails, the cap is {inr(30000)}. Principal repaid to a bank, housing finance company or other listed lender counts towards the {inr(150000)} limit of section 123 (the old 80C), together with your other Schedule XV items such as PPF or life insurance.</li>
                    <li><strong>House you live in, new regime.</strong> Section 202(2) removes both: no interest deduction for a self-occupied house and no section 123 deduction.</li>
                    <li><strong>Let-out house.</strong> The interest is deducted from the rent in either regime, with no cap. In the old regime a resulting loss can reduce other income by up to {inr(200000)} a year (section 109) and the rest is carried forward for up to eight years against house-property income (section 110). In the new regime the loss cannot be set off against salary or other heads.</li>
                    <li><strong>Interest before you get possession.</strong> Interest for the years before the house is bought or built is allowed in five equal yearly instalments from the year of completion (section 22(1)(c)); from tax year 2026-27 these instalments count within the same {inr(200000)} cap for a self-occupied house.</li>
                </ul>
                <DataTable
                    caption={`${amt(P)} at ${R}% for ${Y} years: interest and principal in the first five years`}
                    head={['Year', 'Interest paid', 'Principal repaid', 'Interest deductible (old regime, self-occupied)', 'New regime (self-occupied)']}
                    rows={tax.schedule.slice(0, 5).map((r) => [`Year ${r.year}`, inr(r.interest), inr(r.principal), inr(r.deduction24), '₹0'])}
                    note={`Interest above ₹2,00,000 a year is lost for a self-occupied house. The principal column counts towards the ₹1,50,000 section 123 limit only together with your other Schedule XV payments. Loan years are counted from the first EMI, not by tax year.`}
                />
            </Section>

            <Section title="When the rate goes up: higher EMI or longer loan?">
                <p>
                    On a floating-rate loan, a rise in the benchmark raises your rate too. RBI rules then require the bank to tell you and to let you choose
                    a higher EMI, a longer tenure or a mix, or to prepay. On the {amt(P)} loan above, suppose the rate moves from {R}% to {NEW_R}% after
                    three years, when {inr(bal)} is still owed:
                </p>
                <DataTable
                    caption={`Rate reset from ${R}% to ${NEW_R}% after ${RESET_AT} EMIs`}
                    head={['Option', 'EMI', 'Months left', 'Interest from here on']}
                    rows={[
                        [`No change (${R}%)`, inr(oldRest.emi), String(left), inr(oldRest.totalInterest)],
                        ['Raise the EMI, keep the end date', inr(higherEmi.emi), String(left), inr(higherEmi.totalInterest)],
                        ...(keepEmiPlan && sameEmiMonths ? [['Keep the EMI, extend the loan', inr(keepEmiPlan.emi), String(sameEmiMonths), inr(keepEmiPlan.totalInterest)]] : []),
                    ]}
                    note={keepEmiPlan && sameEmiMonths ? `Keeping the EMI stretches the loan by ${yearsMonths(sameEmiMonths - left)} and costs ${inr(keepEmiPlan.totalInterest - higherEmi.totalInterest)} more interest than raising the EMI.` : undefined}
                />
            </Section>

            <Section title="How much home loan an income can carry">
                <p>
                    The FinCalix app shows a warning when the EMI goes above 40% of the monthly income you enter. Lenders apply their own limits,
                    so treat the table as a starting point, not an eligibility check:
                </p>
                <DataTable
                    caption={`Loan whose EMI is 40% of take-home pay, at ${R}%`}
                    head={['Monthly take-home', 'EMI (40%)', 'Loan over 20 years', 'Loan over 30 years']}
                    rows={INCOMES.map((i) => [inr(i), inr(i * 0.4), amt(loanForEmi(i * 0.4, R, 240)), amt(loanForEmi(i * 0.4, R, 360))])}
                    note="Loan amounts rounded down to the nearest ₹1,000. Existing EMIs on other loans reduce what is left for a home loan."
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `${amt(3500000)} at 8.1% for 20 years`, body: <>EMI {inr(s1.emi)}; total interest {inr(s1.totalInterest)} over 240 instalments.</> },
                    { title: `${amt(10000000)} at 8.6% for 30 years`, body: <>EMI {inr(s2.emi)}. The interest, {inr(s2.totalInterest)}, is {pct((s2.totalInterest / 10000000) * 100, 0)} of the loan — the price of the longest tenure.</> },
                    { title: `${amt(6000000)} at 8.75% for 15 years`, body: <>EMI {inr(s3.emi)}, and interest of {inr(s3.totalInterest)}: a short tenure keeps interest below the amount borrowed.</> },
                    { title: `${amt(2500000)} at 9.25% for 25 years`, body: <>EMI {inr(s4.emi)}; you would repay {inr(s4.totalPayment)} in all.</> },
                ]} />
                <p>
                    Planning to pay part of the loan early? The <a href="/home-loan-prepayment">home loan prepayment calculator</a> shows how much
                    interest a lump sum saves, cutting the EMI or the tenure.
                </p>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Self-occupied house (up to two): interest deduction capped at ₹2,00,000 a year in all, or ₹30,000 if the purchase or construction is not completed within five years from the end of the tax year of borrowing; a certificate from the lender is required. Section 22(2) and (5), Income-tax Act, 2025.', source: ACT },
                { text: 'Pre-construction interest is allowed in five equal instalments from the year of completion; from 1 April 2026 it falls within the same ₹2,00,000 cap.', source: FA26 },
                { text: 'Principal repaid on a loan from a bank, the Central or a State Government, LIC, the National Housing Bank, a housing finance company or certain employers counts under section 123 (limit ₹1,50,000 with other Schedule XV items), as do stamp duty and registration fees.', source: ACT },
                { text: 'New regime (section 202(2)): no deduction for interest on a self-occupied house, no Chapter VIII deductions such as section 123, and no set-off of a house-property loss against other income.', source: ACT },
                { text: 'Old regime: a house-property loss is set off against other income up to ₹2,00,000 a year (section 109); the rest is carried forward for up to eight tax years (section 110).', source: ACT },
                { text: 'Floating-rate home loans to individuals carry no pre-payment charge, in part or in full, from any source of funds and without a lock-in; at a rate reset you may choose a higher EMI, a longer tenure or both.', source: RBI_RBC },
            ]} />
        </>
    );
}

export const homeLoan: FeatureDef = {
    slug: 'home-loan',
    title: 'Home Loan EMI Calculator: EMI Table and Tax Rules 2026-27',
    description: 'Home loan EMI for ₹20 lakh to ₹1 crore over 15–30 years, the income-tax rules for home loans under the 2025 Act, and what a rate rise does.',
    h1: 'Home loan EMI calculator with tax rules for 2026-27',
    crumb: 'Home loan EMI',
    category: 'loans',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Home Loan EMI',
    eyebrow: 'Home loan · EMI and tax',
    answer: (
        <>
            <p>A {amt(P)} home loan at {R}% for {Y} years has an EMI of {inr(main.emi)}; over the full term you pay {inr(main.totalInterest)} of interest.</p>
            <p>In the first year {inr(y1.interest)} of that is interest. Under the Income-tax Act, 2025, only {inr(y1.deduction24)} of it is deductible, and only in the old regime for a house you live in (section 22). The new regime allows nothing for a self-occupied home.</p>
        </>
    ),
    sources: [ACT, FA26, RBI_RBC],
    calc: { key: 'home-loan', props: { amount: P, rate: R, years: Y } },
    Body,
    faqs: [
        { q: 'What is the EMI on a ₹30 lakh home loan?', a: `${inr(emi(3000000, R, 20).emi)} a month at ${R}% for 20 years, or ${inr(emi(3000000, R, 30).emi)} over 30 years. Total interest is ${inr(emi(3000000, R, 20).totalInterest)} and ${inr(emi(3000000, R, 30).totalInterest)} respectively.` },
        { q: 'What is the EMI for a ₹1 crore home loan?', a: `${inr(emi(10000000, R, 25).emi)} a month at ${R}% over 25 years, and ${inr(emi(10000000, R, 30).emi)} over 30 years.` },
        { q: 'How much home loan can I get on a ₹50,000 salary?', a: `About ${amt(loanForEmi(20000, R, 240))} over 20 years or ${amt(loanForEmi(20000, R, 360))} over 30 years at ${R}%, if the EMI is kept to 40% of take-home pay (₹20,000). Lenders decide the actual limit from your income, other EMIs and credit record.` },
        { q: 'Can I claim home loan interest in the new tax regime?', a: 'Not for a house you live in. Section 202(2) of the Income-tax Act, 2025 excludes the self-occupied interest deduction and section 123 in the new regime; interest on a let-out house is still deducted from its rent, but a resulting loss cannot reduce your salary income.' },
        { q: 'Which section replaces 24(b) and 80C for home loans?', a: 'Section 22 replaces 24(b) for interest (₹2 lakh cap for a self-occupied house) and section 123 with Schedule XV replaces 80C for principal (₹1.5 lakh overall), from tax year 2026-27. Both apply only in the old regime for a self-occupied house.' },
        { q: 'Is interest paid before possession deductible?', a: 'Yes, in five equal yearly instalments starting from the year the house is bought or built (section 22(1)(c)). For a self-occupied house the instalments share the ₹2 lakh yearly cap with the current year’s interest.' },
        { q: 'Home loan EMI kitna hota hai?', a: `Loan amount, rate aur saal par depend karta hai. ${R}% par ${amt(P)} ka loan 25 saal ke liye lein to EMI ${inr(main.emi)} hota hai, aur ${amt(3000000)} ka 20 saal ke liye ${inr(emi(3000000, R, 20).emi)}. Upar ki table mein ₹20 lakh se ₹1 crore tak sab diya hai.` },
    ],
    related: [
        { href: '/home-loan-prepayment', label: 'Home loan prepayment calculator', note: 'Interest saved by paying early' },
        { href: '/old-vs-new-tax-regime', label: 'Old vs new tax regime', note: 'Whether home-loan deductions make the old regime cheaper' },
        { href: '/emi', label: 'EMI calculator', note: 'EMI per lakh and flat vs reducing rate' },
        { href: '/property-appreciation', label: 'Property appreciation calculator', note: 'What the house may be worth later' },
        { href: '/cibil-score', label: 'CIBIL score for a home loan', note: 'How your credit record is read' },
    ],
    disclaimer: 'loan',
};
