/**
 * /emi — primary query "emi calculator" (SEO_PLAN.md §5a). The general hub: the EMI formula,
 * EMI per ₹1 lakh, flat vs reducing rate and what moves an EMI; each loan type has its own page.
 * Figures: the app's calculateReducingEMI, calculateFlatEMI and calculateEffectiveRate
 * (src/utils/calculations.ts). Rules: seo/research/verified-facts-loans.md.
 */
import { calculateEffectiveRate, calculateFlatEMI, calculateReducingEMI } from '../../../utils/calculations';
import { amt, inr, pct } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RBI_RBC = { label: 'RBI (Commercial Banks – Responsible Business Conduct) Directions, 2025, paras 348–349', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13140' };

const emi = (p: number, r: number, months: number) => calculateReducingEMI(p, r, months);

// Answer: ₹10 lakh at 9% for 5 years.
const A_P = 1000000, A_R = 9, A_N = 60;
const ans = emi(A_P, A_R, A_N);

// Worked example: ₹5 lakh at 9% for 4 years, step by step.
const W_P = 500000, W_R = 9, W_N = 48;
const wr = W_R / 12 / 100;
const wPow = Math.pow(1 + wr, W_N);
const wExact = (W_P * wr * wPow) / (wPow - 1);
const w = emi(W_P, W_R, W_N);
const wInt1 = W_P * wr;

// Flat vs reducing: ₹3 lakh at a quoted 10%.
const F_P = 300000, F_R = 10;
const flat3 = calculateFlatEMI(F_P, F_R, 36);
const red3 = emi(F_P, F_R, 36);
const eff3 = calculateEffectiveRate(F_R, 36);

const RATES = [8, 9, 10, 11, 12, 14, 16];
const TENURES = [1, 3, 5, 7, 10, 15, 20];

function Body() {
    const base = emi(A_P, A_R, A_N);
    const levers: Array<[string, ReturnType<typeof emi>]> = [
        [`${amt(A_P)}, ${A_R}%, 5 years (starting point)`, base],
        [`Borrow ${amt(100000)} more (${amt(A_P + 100000)})`, emi(A_P + 100000, A_R, A_N)],
        [`Rate 1 point higher (${A_R + 1}%)`, emi(A_P, A_R + 1, A_N)],
        [`Rate 1 point lower (${A_R - 1}%)`, emi(A_P, A_R - 1, A_N)],
        ['One year longer (6 years)', emi(A_P, A_R, 72)],
        ['One year shorter (4 years)', emi(A_P, A_R, 48)],
    ];
    const s1 = emi(200000, 14, 24);
    const s2 = emi(2500000, 8.75, 180);
    const s3 = emi(750000, 10.5, 72);
    const s4 = emi(60000, 16, 12);
    return (
        <>
            <Section title="The EMI formula, in words">
                <p>
                    An equated monthly instalment is the one fixed amount that, paid every month, clears both the loan and the
                    interest on it by the last month. Three inputs decide it: the amount borrowed (P), the monthly rate (r, which is
                    the yearly rate divided by 12 and by 100) and the number of monthly instalments (n).
                </p>
                <p><strong>EMI = P × r × (1 + r)<sup>n</sup> ÷ ((1 + r)<sup>n</sup> − 1)</strong></p>
                <p>
                    Each month the lender first charges interest on the balance still owed; whatever is left of the EMI reduces that
                    balance. So the interest share of each instalment shrinks and the principal share grows month after month, even though the EMI never changes.
                </p>
            </Section>

            <Section title="Worked example: ₹5 lakh at 9% for 4 years">
                <ol className="steps">
                    <li>Monthly rate r = 9 ÷ 12 ÷ 100 = {wr.toFixed(4)}; number of instalments n = 4 × 12 = {W_N}.</li>
                    <li>(1 + r)<sup>n</sup> = 1.0075<sup>48</sup> = {wPow.toFixed(4)}.</li>
                    <li>EMI = 5,00,000 × {wr.toFixed(4)} × {wPow.toFixed(4)} ÷ ({wPow.toFixed(4)} − 1) = ₹{wExact.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, which the FinCalix app rounds up to {inr(w.emi)}.</li>
                    <li>Month 1: interest = 5,00,000 × {wr.toFixed(4)} = {inr(wInt1)}, so {inr(w.emi - wInt1)} of the first EMI cuts the principal.</li>
                    <li>Over {W_N} months you repay {inr(w.totalPayment)}: the {amt(W_P)} borrowed plus {inr(w.totalInterest)} of interest. The final instalment is trimmed so the balance lands exactly on zero.</li>
                </ol>
            </Section>

            <Section title="EMI per ₹1 lakh by rate and tenure">
                <DataTable
                    caption="Monthly EMI for every ₹1,00,000 borrowed (reducing balance)"
                    head={['Rate', ...TENURES.map((t) => `${t} yr`)]}
                    rows={RATES.map((r) => [pct(r), ...TENURES.map((t) => inr(emi(100000, r, t * 12).emi))])}
                    note="Multiply by the number of lakhs you borrow for a quick estimate (₹7 lakh = 7 × the figure). Because each EMI is rounded up to the rupee, the scaled figure can differ from an exact calculation by a few rupees."
                />
            </Section>

            <Section title="Flat rate vs reducing rate">
                <p>
                    A flat rate charges interest on the full original amount for the whole tenure, even though you repay part of it every month.
                    A reducing (diminishing-balance) rate charges interest only on what is still outstanding. The same number on paper
                    therefore costs very different amounts:
                </p>
                <DataTable
                    caption={`${amt(F_P)} borrowed at a quoted ${F_R}%: flat vs reducing`}
                    head={['Tenure', 'Flat EMI', 'Reducing EMI', 'Flat interest', 'Reducing interest', 'Flat rate equals (reducing)']}
                    rows={[1, 2, 3, 4, 5].map((y) => {
                        const fl = calculateFlatEMI(F_P, F_R, y * 12);
                        const rd = emi(F_P, F_R, y * 12);
                        return [`${y} yr`, inr(fl.emi), inr(rd.emi), inr(fl.totalInterest), inr(rd.totalInterest), pct(calculateEffectiveRate(F_R, y * 12))];
                    })}
                    note="Last column: the reducing-balance rate that gives the same EMI as the flat loan — what the flat loan really costs. Same calculation as the FinCalix app's flat-rate mode."
                />
                <p>
                    Over 3 years, {F_R}% flat means an EMI of {inr(flat3.emi)} and {inr(flat3.totalInterest)} of interest, against {inr(red3.emi)} and
                    {' '}{inr(red3.totalInterest)} at {F_R}% reducing. The flat loan is really a {pct(eff3)} loan. Ask any lender quoting a flat rate
                    for the annual percentage rate (APR) in the Key Facts Statement.
                </p>
            </Section>

            <Section title="What changes your EMI">
                <DataTable
                    caption="One change at a time, against a ₹10 lakh loan at 9% for 5 years"
                    head={['Change', 'EMI', 'Total interest']}
                    rows={levers.map(([label, r]) => [label, inr(r.emi), inr(r.totalInterest)])}
                    note="A longer tenure lowers the EMI but raises the total interest; a shorter one does the opposite."
                />
                <p>
                    Once the loan is running, the EMI moves only if the rate is reset (floating-rate loans), if you prepay and ask for a lower EMI,
                    or if the lender changes the tenure instead. Processing fees and the GST on them are not part of the EMI; they raise the APR instead.
                </p>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `${amt(200000)} at 14% for 2 years`, body: <>EMI {inr(s1.emi)}; total interest {inr(s1.totalInterest)}, or {pct((s1.totalInterest / 200000) * 100, 1)} of the amount borrowed even over two years.</> },
                    { title: `${amt(2500000)} at 8.75% for 15 years`, body: <>EMI {inr(s2.emi)}; over 180 instalments the interest adds up to {inr(s2.totalInterest)} — {pct((s2.totalInterest / 2500000) * 100, 0)} of the loan itself.</> },
                    { title: `${amt(750000)} at 10.5% for 6 years`, body: <>EMI {inr(s3.emi)}, and {inr(s3.totalInterest)} of interest in all.</> },
                    { title: `${inr(60000)} at 16% for 12 months`, body: <>EMI {inr(s4.emi)}; total interest {inr(s4.totalInterest)}.</> },
                ]} />
            </Section>

            <Section title="Pick the calculator for your loan">
                <ul>
                    <li><a href="/home-loan">Home loan EMI</a> — ₹30 lakh to ₹1 crore over 15–30 years, and the house-property tax rules.</li>
                    <li><a href="/car-loan">Car loan EMI</a> — from on-road price and down payment to the EMI, for 5 or 7 years.</li>
                    <li><a href="/personal-loan">Personal loan EMI</a> — processing fee with GST, the real APR and the flat-rate trap.</li>
                    <li><a href="/two-wheeler-loan">Two-wheeler loan EMI</a> — bike and scooter loans from ₹50,000.</li>
                    <li><a href="/education-loan">Education loan EMI</a> — what the moratorium adds before the first EMI.</li>
                    <li><a href="/gold-loan-calculator">Gold loan</a> and <a href="/home-loan-prepayment">home loan prepayment</a> have their own pages too.</li>
                </ul>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'For retail and MSME term loans sanctioned from 1 October 2024, a bank must give you a Key Facts Statement before you sign, with an APR computation sheet and the full repayment schedule; the APR includes every charge the bank levies. The KFS stays valid for at least three working days for loans of seven days or more.', source: RBI_RBC },
                { text: 'Fees or charges not stated in the KFS cannot be charged later without your explicit consent.', source: RBI_RBC },
                { text: 'When the benchmark rate of a floating-rate EMI loan rises, the bank must tell you, and offer a higher EMI, a longer tenure or a mix of the two, plus the option to prepay; extending the tenure must not lead to negative amortisation.', source: RBI_RBC },
                { text: 'For EMI-based personal loans the bank must make a quarterly statement available with principal and interest recovered so far, the EMI, the EMIs left and the annualised rate or APR.', source: RBI_RBC },
            ]} />
        </>
    );
}

export const emiPage: FeatureDef = {
    slug: 'emi',
    title: 'EMI Calculator: Formula, EMI per Lakh, Flat vs Reducing',
    description: 'Calculate the EMI on any loan, see the formula worked step by step, EMI per ₹1 lakh by rate and tenure, and what a flat rate really costs.',
    h1: 'EMI calculator: the formula, EMI per lakh and flat vs reducing rate',
    crumb: 'EMI calculator',
    category: 'loans',
    updated: '2026-11-17',
    analyticsTitle: 'Website - EMI',
    eyebrow: 'Any loan · reducing balance',
    answer: (
        <>
            <p>The EMI on a {amt(A_P)} loan at {A_R}% a year for 5 years is {inr(ans.emi)} a month; you repay {inr(ans.totalPayment)}, of which {inr(ans.totalInterest)} is interest.</p>
            <p>The figure uses the reducing-balance method. For retail loans sanctioned since 1 October 2024, RBI requires banks to hand you a Key Facts Statement with the repayment schedule and the APR before you sign.</p>
        </>
    ),
    sources: [RBI_RBC],
    calc: { key: 'emi', props: { amount: A_P, rate: A_R, years: 5 } },
    Body,
    faqs: [
        { q: 'How is EMI calculated?', a: `With EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1), where P is the loan, r the monthly rate (yearly rate ÷ 12 ÷ 100) and n the number of months. For ${amt(W_P)} at ${W_R}% over 4 years that gives ${inr(w.emi)} a month.` },
        { q: 'What is the EMI for ₹1 lakh?', a: `It depends on rate and tenure: at 10% it is ${inr(emi(100000, 10, 12).emi)} a month over 1 year, ${inr(emi(100000, 10, 36).emi)} over 3 years and ${inr(emi(100000, 10, 60).emi)} over 5 years. The table above gives every rate from 8% to 16%.` },
        { q: 'Is a flat interest rate cheaper than a reducing rate?', a: `No — a flat rate costs far more than the same reducing rate. ${amt(F_P)} at ${F_R}% flat for 3 years carries ${inr(flat3.totalInterest)} of interest, against ${inr(red3.totalInterest)} at ${F_R}% reducing; the flat loan works out to about ${pct(eff3)} on a reducing basis.` },
        { q: 'Does a longer tenure reduce my EMI?', a: `Yes, but you pay more interest overall. ${amt(A_P)} at ${A_R}% costs ${inr(emi(A_P, A_R, 48).emi)} a month over 4 years and ${inr(emi(A_P, A_R, 72).emi)} over 6 years, while total interest rises from ${inr(emi(A_P, A_R, 48).totalInterest)} to ${inr(emi(A_P, A_R, 72).totalInterest)}.` },
        { q: 'Why is my last EMI a little different?', a: 'Because the EMI is rounded to a whole rupee, the final instalment is adjusted to clear exactly what is left. The FinCalix app rounds the EMI up and trims the last one, so it is usually a few rupees lower.' },
        { q: 'Does the EMI include processing fees and GST?', a: 'No. The EMI repays only the loan and its interest; processing fees, GST on them and similar charges are paid separately or deducted from the amount you receive. They show up in the APR in your Key Facts Statement, not in the EMI.' },
        { q: 'EMI kitna aayega, aur EMI calculator kaise kare?', a: `Loan amount, saalana interest rate aur tenure daaliye — EMI turant aa jaata hai. Jaise ${amt(A_P)} ka loan ${A_R}% par 5 saal ke liye lene par EMI ${inr(ans.emi)} mahina aayega, aur kul byaaj ${inr(ans.totalInterest)} hoga. Haath se nikalna ho to upar diya formula use kijiye.` },
    ],
    related: [
        { href: '/home-loan', label: 'Home loan EMI calculator', note: 'Long tenures and the house-property tax rules' },
        { href: '/personal-loan', label: 'Personal loan EMI calculator', note: 'Fees, GST and the real APR' },
        { href: '/car-loan', label: 'Car loan EMI calculator', note: 'From on-road price to EMI' },
        { href: '/loan-foreclosure', label: 'Loan foreclosure calculator', note: 'Closing a loan early' },
        { href: '/simple-interest', label: 'Simple interest calculator', note: 'Interest without compounding' },
    ],
    disclaimer: 'loan',
};
