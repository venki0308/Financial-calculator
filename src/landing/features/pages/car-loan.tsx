/**
 * /car-loan — primary query "car loan emi calculator" (SEO_PLAN.md §5a): on-road price → down
 * payment → loan → EMI, EMI per lakh for 5 and 7 years, and the total outlay on the car.
 * Figures: the app's calculateReducingEMI (src/utils/calculations.ts); loan = on-road price −
 * down payment (plain arithmetic). Depreciation figures are deliberately left out: the IDV
 * schedules on irdai.gov.in differ between policy wordings (seo/research/verified-facts-loans.md).
 */
import { calculateReducingEMI } from '../../../utils/calculations';
import { amt, inr, pct } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RBI_RBC = { label: 'RBI Responsible Business Conduct Directions, 2025 (paras 348, 353)', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13140' };

const emi = (p: number, r: number, years: number) => calculateReducingEMI(p, r, years * 12);

// Main example: ₹12 lakh on-road, 20% down, 9% for 5 years.
const ONROAD = 1200000, DOWN_PCT = 20, R = 9, Y = 5;
const DOWN = Math.round(ONROAD * DOWN_PCT / 100);
const LOAN = ONROAD - DOWN;
const five = emi(LOAN, R, 5);
const seven = emi(LOAN, R, 7);
const outlay5 = DOWN + five.totalPayment;
const outlay7 = DOWN + seven.totalPayment;

const RATES = [8, 8.5, 9, 9.5, 10, 10.5, 11, 12];
const DOWNS = [10, 15, 20, 25, 30, 40];

function Body() {
    const s1 = emi(650000, 9.5, 5);
    const s2 = emi(1600000, 8.75, 7);
    const s3 = emi(450000, 12, 4);
    const s4 = emi(1000000, 9, 3);
    return (
        <>
            <Section title="From on-road price to loan amount">
                <ol className="steps">
                    <li>Start from the on-road quote, not the ex-showroom price. It adds registration and road tax, the first insurance premium and any dealer charges you agree to.</li>
                    <li>Decide the down payment. On a {amt(ONROAD)} on-road price, {DOWN_PCT}% is {inr(DOWN)}.</li>
                    <li>Loan = on-road price − down payment = {inr(ONROAD)} − {inr(DOWN)} = {inr(LOAN)}.</li>
                    <li>EMI at {R}% over {Y} years: monthly rate {(R / 1200).toFixed(4)}, 60 instalments, giving {inr(five.emi)} (rounded up to the rupee, like the FinCalix app).</li>
                    <li>What the car costs you through the loan: {inr(DOWN)} down + 60 × EMI ({inr(five.totalPayment)}) = {inr(outlay5)}, which is {inr(outlay5 - ONROAD)} above the on-road price.</li>
                </ol>
            </Section>

            <Section title="Car loan EMI per lakh for 5 and 7 years">
                <DataTable
                    caption="EMI and total interest for every ₹1,00,000 of car loan"
                    head={['Rate', 'EMI, 5 years', 'Interest, 5 years', 'EMI, 7 years', 'Interest, 7 years']}
                    rows={RATES.map((r) => {
                        const a = emi(100000, r, 5), b = emi(100000, r, 7);
                        return [pct(r), inr(a.emi), inr(a.totalInterest), inr(b.emi), inr(b.totalInterest)];
                    })}
                    note={`Multiply by the lakhs you borrow: a ${amt(LOAN)} loan is ${LOAN / 100000} × the row. Rates here are examples; the lender’s Key Facts Statement gives your actual rate and APR.`}
                />
            </Section>

            <Section title="How the down payment changes the EMI">
                <DataTable
                    caption={`${amt(ONROAD)} on-road price, ${R}% for ${Y} years`}
                    head={['Down payment', 'You pay upfront', 'Loan', 'EMI', 'Total interest', 'Total outlay on the car']}
                    rows={DOWNS.map((d) => {
                        const dp = Math.round(ONROAD * d / 100);
                        const r = emi(ONROAD - dp, R, Y);
                        return [`${d}%`, inr(dp), inr(ONROAD - dp), inr(r.emi), inr(r.totalInterest), inr(dp + r.totalPayment)];
                    })}
                    note="Total outlay = down payment + every EMI. Every extra rupee paid upfront saves its share of interest; keep enough cash aside for emergencies."
                />
            </Section>

            <Section title="5 years or 7 years? The full cost of ownership view">
                <DataTable
                    caption={`${amt(LOAN)} loan at ${R}% after a ${inr(DOWN)} down payment`}
                    head={['', '5 years', '7 years']}
                    rows={[
                        ['EMI', inr(five.emi), inr(seven.emi)],
                        ['Total interest', inr(five.totalInterest), inr(seven.totalInterest)],
                        ['Down payment + all EMIs', inr(outlay5), inr(outlay7)],
                        ['Paid above the on-road price', inr(outlay5 - ONROAD), inr(outlay7 - ONROAD)],
                    ]}
                    note={`The 7-year loan lowers the EMI by ${inr(five.emi - seven.emi)} a month but costs ${inr(seven.totalInterest - five.totalInterest)} more in interest. Fuel, servicing and yearly insurance renewals come on top of these figures.`}
                />
                <p>
                    <strong>What about depreciation?</strong> A car loses value from the day it is registered, while the loan balance falls slowly
                    in the early years, so on a long loan you can owe more than the car would fetch. We do not print a depreciation table: the
                    insured declared value (IDV) schedules in the motor policy wordings filed with IRDAI differ between products. Your policy
                    schedule states this year’s IDV — compare it with the outstanding balance in your loan statement.
                </p>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `${amt(650000)} hatchback loan at 9.5% for 5 years`, body: <>EMI {inr(s1.emi)}; interest {inr(s1.totalInterest)} over the loan.</> },
                    { title: `${amt(1600000)} SUV loan at 8.75% for 7 years`, body: <>EMI {inr(s2.emi)}, but {inr(s2.totalInterest)} of interest — the longest tenure costs the most.</> },
                    { title: `${amt(450000)} used-car loan quoted at 12% for 4 years`, body: <>EMI {inr(s3.emi)}; total interest {inr(s3.totalInterest)}. Compare the APR in the Key Facts Statement, not just the headline rate.</> },
                    { title: `${amt(1000000)} at 9% for only 3 years`, body: <>EMI {inr(s4.emi)} — high, but interest stays at {inr(s4.totalInterest)}.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'A bank must give you a Key Facts Statement for a car loan (a retail term loan) before you sign: interest rate, all fees, the APR on the amount actually disbursed and the full repayment schedule. You have at least three working days to accept it on those terms.', source: RBI_RBC },
                { text: 'Pre-payment: no charge on a floating-rate loan to an individual for a non-business purpose. On a fixed-rate car loan a charge is allowed under the bank’s policy, but it must be worked out on the amount prepaid and disclosed in the sanction letter, loan agreement and KFS; an undisclosed charge cannot be levied.', source: RBI_RBC },
            ]} />
        </>
    );
}

export const carLoan: FeatureDef = {
    slug: 'car-loan',
    title: 'Car Loan EMI Calculator: On-Road Price, Down Payment, EMI',
    description: 'Work out a car loan from the on-road price and down payment: EMI per lakh for 5 and 7 years, total interest and what the car costs you in all.',
    h1: 'Car loan EMI calculator: from on-road price to monthly EMI',
    crumb: 'Car loan EMI',
    category: 'loans',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Car Loan EMI',
    eyebrow: 'Car loan · new or used',
    answer: (
        <>
            <p>On a car with an on-road price of {amt(ONROAD)}, a {DOWN_PCT}% down payment ({inr(DOWN)}) leaves a {amt(LOAN)} loan. At {R}% for 5 years the EMI is {inr(five.emi)}; over 7 years it is {inr(seven.emi)}.</p>
            <p>The 5-year loan costs {inr(five.totalInterest)} in interest and the 7-year one {inr(seven.totalInterest)}. RBI rules require the bank to show the full cost, as an APR, in a Key Facts Statement before you sign.</p>
        </>
    ),
    sources: [RBI_RBC],
    calc: { key: 'car-loan', props: { onRoad: ONROAD, downPct: DOWN_PCT, rate: R, years: Y } },
    Body,
    faqs: [
        { q: 'What is the EMI on a ₹10 lakh car loan?', a: `${inr(emi(1000000, R, 5).emi)} a month at ${R}% for 5 years, or ${inr(emi(1000000, R, 7).emi)} over 7 years. Total interest is ${inr(emi(1000000, R, 5).totalInterest)} and ${inr(emi(1000000, R, 7).totalInterest)}.` },
        { q: 'What is the car loan EMI per lakh?', a: `At ${R}%, ${inr(emi(100000, R, 5).emi)} for every ₹1 lakh over 5 years and ${inr(emi(100000, R, 7).emi)} over 7 years. The table above covers rates from 8% to 12%.` },
        { q: 'Is a 7-year car loan a good idea?', a: `Only if you need the lower EMI. On ${amt(LOAN)} at ${R}%, 7 years saves ${inr(five.emi - seven.emi)} a month against 5 years but adds ${inr(seven.totalInterest - five.totalInterest)} of interest, and the car keeps losing value while you owe more for longer.` },
        { q: 'How much down payment should I make on a car?', a: `As much as you can spare without touching your emergency fund. On a ${amt(ONROAD)} car at ${R}% for 5 years, going from 10% to 30% down cuts the EMI from ${inr(emi(ONROAD - Math.round(ONROAD * 0.1), R, 5).emi)} to ${inr(emi(ONROAD - Math.round(ONROAD * 0.3), R, 5).emi)}.` },
        { q: 'Can I close my car loan early?', a: 'Yes. A floating-rate car loan to an individual carries no pre-payment charge under RBI rules; a fixed-rate one may carry a charge, but only if your sanction letter and Key Facts Statement disclose it, and it must be calculated on the amount you prepay.' },
        { q: 'Car loan EMI kaise nikale?', a: `On-road price se down payment ghataiye — wahi loan amount hai. Phir rate aur saal daal kar EMI nikaliye: ${amt(LOAN)} ka loan ${R}% par 5 saal ke liye ${inr(five.emi)} mahina padta hai. Upar ka calculator yahi karta hai.` },
    ],
    related: [
        { href: '/emi', label: 'EMI calculator', note: 'Flat vs reducing rate, any loan' },
        { href: '/two-wheeler-loan', label: 'Two-wheeler loan EMI calculator', note: 'Bike and scooter loans' },
        { href: '/personal-loan', label: 'Personal loan EMI calculator', note: 'If you fund the car without a car loan' },
        { href: '/loan-foreclosure', label: 'Loan foreclosure calculator', note: 'Closing the car loan early' },
    ],
    disclaimer: 'loan',
};
