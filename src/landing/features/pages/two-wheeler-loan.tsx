/**
 * /two-wheeler-loan — primary query "two wheeler loan emi calculator" (SEO_PLAN.md §5a): bike and
 * scooter loan EMI for ₹50,000–₹2.5 lakh over 1–5 years, on-road price and down payment.
 * Figures: the app's calculateReducingEMI (src/utils/calculations.ts) and the on-road/down-payment
 * formula of src/pages/TwoWheelerLoanCalculator.tsx (copied in math-loans.twoWheelerOnRoad).
 * Rules: RBI Responsible Business Conduct Directions, 2025 (seo/research/verified-facts-loans.md).
 */
import { calculateReducingEMI } from '../../../utils/calculations';
import { twoWheelerOnRoad } from '../math-loans';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RBI_RBC = { label: 'RBI Responsible Business Conduct Directions, 2025 (paras 348, 351, 353)', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13140' };

const R = 11.5; // the app's starting rate on its two-wheeler screen
const emiM = (p: number, months: number, r = R) => calculateReducingEMI(p, r, months);

// Answer: ₹1.5 lakh at 11.5% for 5 years (and 3 years).
const A = 150000;
const a60 = emiM(A, 60), a36 = emiM(A, 36);

// On-road example (an illustrative dealer quote) and 15% down payment, 36 months.
const QUOTE = { exShowroom: 110000, rto: 9500, insurance: 7500, handling: 1500, accessories: 0 };
const DP = 15, M = 36;
const ex = twoWheelerOnRoad({ ...QUOTE, downPaymentPct: DP });
const exEmi = emiM(ex.loanAmount, M);

const AMOUNTS = [50000, 75000, 100000, 150000, 200000, 250000];
const YEARS = [1, 2, 3, 4, 5];
const DPS = [10, 15, 20, 25, 30];

function Body() {
    const s1 = emiM(85000, 24, 12);
    const s2 = emiM(100000, 36, 10.5);
    const s3 = emiM(250000, 48, 11);
    const s4 = emiM(60000, 12, 13);
    return (
        <>
            <Section title={`Bike and scooter loan EMI table at ${R}%`}>
                <DataTable
                    caption={`Monthly EMI by loan amount and tenure, ${R}% a year`}
                    head={['Loan', ...YEARS.map((y) => `${y} yr`)]}
                    rows={AMOUNTS.map((a) => [inr(a), ...YEARS.map((y) => inr(emiM(a, y * 12).emi))])}
                    note={`${R}% is the starting rate on the FinCalix app’s two-wheeler screen, used here only as an example.`}
                />
                <DataTable
                    caption={`Total interest by loan amount and tenure, ${R}% a year`}
                    head={['Loan', ...YEARS.map((y) => `${y} yr`)]}
                    rows={AMOUNTS.map((a) => [inr(a), ...YEARS.map((y) => inr(emiM(a, y * 12).totalInterest))])}
                />
            </Section>

            <Section title="On-road price, down payment and loan amount">
                <p>
                    Dealers quote the ex-showroom price, but you pay the on-road price: registration and road tax at the RTO, the insurance
                    premium, and any handling charges or accessories. The lender finances what is left after your down payment. With an
                    example quote:
                </p>
                <ol className="steps">
                    <li>Ex-showroom {inr(QUOTE.exShowroom)} + RTO {inr(QUOTE.rto)} + insurance {inr(QUOTE.insurance)} + handling {inr(QUOTE.handling)} = on-road price {inr(ex.onRoadPrice)}.</li>
                    <li>Down payment {DP}% of {inr(ex.onRoadPrice)} = {inr(ex.downPayment)}.</li>
                    <li>Loan = {inr(ex.onRoadPrice)} − {inr(ex.downPayment)} = {inr(ex.loanAmount)}.</li>
                    <li>EMI at {R}% for {M} months: monthly rate {(R / 1200).toFixed(5)}, giving {inr(exEmi.emi)}; interest over the loan {inr(exEmi.totalInterest)}.</li>
                    <li>All in, the bike costs you {inr(ex.downPayment)} + {inr(exEmi.totalPayment)} = {inr(ex.downPayment + exEmi.totalPayment)}, before any processing fee.</li>
                </ol>
                <p>
                    The FinCalix app’s two-wheeler calculator builds the on-road price the same way (ex-showroom, RTO, insurance, handling,
                    accessories), lets you set the down payment and processing fee, and shows the EMI at nearby rates and a year-by-year schedule.
                </p>
            </Section>

            <Section title="Down payment vs EMI">
                <DataTable
                    caption={`On-road price ${inr(ex.onRoadPrice)}, ${R}% for ${M} months`}
                    head={['Down payment', 'Paid upfront', 'Loan', 'EMI', 'Interest']}
                    rows={DPS.map((d) => {
                        const o = twoWheelerOnRoad({ ...QUOTE, downPaymentPct: d });
                        const r = emiM(o.loanAmount, M);
                        return [`${d}%`, inr(o.downPayment), inr(o.loanAmount), inr(r.emi), inr(r.totalInterest)];
                    })}
                />
            </Section>

            <Section title="Short or long tenure?">
                <DataTable
                    caption={`${inr(ex.loanAmount)} loan at ${R}%`}
                    head={['Tenure', 'EMI', 'Total interest', 'Total repaid']}
                    rows={[12, 24, 36, 48, 60].map((m) => {
                        const r = emiM(ex.loanAmount, m);
                        return [`${m} months`, inr(r.emi), inr(r.totalInterest), inr(r.totalPayment)];
                    })}
                    note="Doubling the tenure does not halve the EMI, but it does roughly double the interest."
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `Scooter: ${inr(85000)} at 12% for 2 years`, body: <>EMI {inr(s1.emi)}; total interest {inr(s1.totalInterest)}.</> },
                    { title: `Commuter bike: ${amt(100000)} at 10.5% for 3 years`, body: <>EMI {inr(s2.emi)} and {inr(s2.totalInterest)} of interest.</> },
                    { title: `Premium bike: ${amt(250000)} at 11% for 4 years`, body: <>EMI {inr(s3.emi)}; interest adds {inr(s3.totalInterest)} to the price.</> },
                    { title: `Small top-up: ${inr(60000)} at 13% for 1 year`, body: <>EMI {inr(s4.emi)}; only {inr(s4.totalInterest)} of interest because the loan is short.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'A two-wheeler loan from a bank is a retail term loan, so you get a Key Facts Statement first: rate, fees, APR and the repayment schedule. A fee not listed there needs your explicit consent to be charged later.', source: RBI_RBC },
                { text: 'A missed EMI can attract only a penal charge, not a higher “penal interest” rate; the charge must be reasonable, levied on the amount in default, disclosed in the agreement and KFS, and never itself charged interest. Interest on the unpaid EMI at the contract rate is allowed.', source: RBI_RBC },
                { text: 'Prepaying a floating-rate loan taken by an individual for personal use carries no charge. For fixed-rate loans any charge follows the bank’s policy, is based on the amount prepaid and must be disclosed upfront.', source: RBI_RBC },
            ]} />
        </>
    );
}

export const twoWheelerLoan: FeatureDef = {
    slug: 'two-wheeler-loan',
    title: 'Two Wheeler Loan EMI Calculator: Bike and Scooter EMI',
    description: 'Bike and scooty loan EMI for ₹50,000 to ₹2.5 lakh over 1–5 years, with on-road price, down payment and what a missed EMI can cost.',
    h1: 'Two wheeler loan EMI calculator for bikes and scooters',
    crumb: 'Two-wheeler loan EMI',
    category: 'loans',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Two Wheeler Loan EMI',
    eyebrow: 'Bike and scooter loans',
    answer: (
        <>
            <p>A {amt(A)} bike loan at {R}% costs {inr(a60.emi)} a month over 5 years ({inr(a60.totalInterest)} interest) or {inr(a36.emi)} over 3 years ({inr(a36.totalInterest)} interest).</p>
            <p>Borrow on the on-road price minus your down payment, and check the APR in the Key Facts Statement that RBI requires banks to give you before you sign.</p>
        </>
    ),
    sources: [RBI_RBC],
    calc: { key: 'two-wheeler-loan', props: { exShowroom: QUOTE.exShowroom, rto: QUOTE.rto, insurance: QUOTE.insurance, other: QUOTE.handling + QUOTE.accessories, downPct: DP, rate: R, months: M } },
    Body,
    faqs: [
        { q: 'What is the EMI on a ₹1.5 lakh bike loan for 5 years?', a: `${inr(a60.emi)} a month at ${R}%, with ${inr(a60.totalInterest)} of interest over the 60 months. Over 3 years it would be ${inr(a36.emi)}.` },
        { q: 'What is the EMI on a scooty loan of ₹80,000?', a: `At ${R}%, ${inr(emiM(80000, 24).emi)} a month over 2 years or ${inr(emiM(80000, 36).emi)} over 3 years.` },
        { q: 'Is the loan on the ex-showroom or the on-road price?', a: `On whatever the lender agrees to finance, but you pay the on-road price, so start from it. In our example, an ex-showroom price of ${inr(QUOTE.exShowroom)} becomes ${inr(ex.onRoadPrice)} on the road, and a ${DP}% down payment leaves a loan of ${inr(ex.loanAmount)}.` },
        { q: 'How much does a bigger down payment save?', a: `On the ${inr(ex.onRoadPrice)} example at ${R}% for 3 years, raising the down payment from 10% to 30% cuts the EMI from ${inr(emiM(twoWheelerOnRoad({ ...QUOTE, downPaymentPct: 10 }).loanAmount, M).emi)} to ${inr(emiM(twoWheelerOnRoad({ ...QUOTE, downPaymentPct: 30 }).loanAmount, M).emi)}.` },
        { q: 'What happens if I miss a bike loan EMI?', a: 'The lender can charge interest on the unpaid EMI at your normal rate and a penal charge disclosed in your agreement, but RBI rules bar penal interest and interest on the penal charge itself. The overdue EMI is also reported to the credit information companies.' },
        { q: 'Bike loan ki EMI kaise nikale?', a: `On-road price mein se down payment ghata kar loan amount nikaliye, phir rate aur mahine daaliye. ${inr(ex.loanAmount)} ka loan ${R}% par 36 mahine ke liye ${inr(exEmi.emi)} mahina EMI deta hai — upar ka calculator yahi hisaab karta hai.` },
    ],
    related: [
        { href: '/car-loan', label: 'Car loan EMI calculator', note: 'For four-wheelers' },
        { href: '/emi', label: 'EMI calculator', note: 'Any loan, flat or reducing' },
        { href: '/personal-loan', label: 'Personal loan EMI calculator', note: 'If you skip the vehicle loan' },
        { href: '/cibil-score', label: 'CIBIL score', note: 'How repayments build your record' },
    ],
    disclaimer: 'loan',
};
