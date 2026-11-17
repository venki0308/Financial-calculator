/**
 * /simple-interest — primary query "byaj calculator" (+ "simple interest calculator"; SEO_PLAN §5b).
 * Figures: the app's simple-interest and flat "₹ per ₹100 a month" formulas, copied from
 * src/pages/SimpleInterestCalculator.tsx into features/math-credit.ts (simpleInterest, flatByaj),
 * and calculateCompoundInterest (src/utils/calculations.ts) for the comparison.
 * Rules: Income-tax Act 2025 interest sections (seo/research/verified-facts-2026-11-17.md) and
 * RBI's monthly-rests rule (seo/research/verified-facts-credit.md).
 */
import { calculateCompoundInterest } from '../../../utils/calculations';
import { flatByaj, simpleInterest } from '../math-credit';
import { amt, inr, pct } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025 (sections 424 and 437)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const RBI_ADV = { label: 'RBI Interest Rates on Advances Directions, 2025 (para 6(7))', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13149' };

const P = 100000, R = 8, MONTHS = 36;
const si = simpleInterest(P, R, MONTHS);
const sekda = flatByaj(P, 2, 12);
const sekdaAdded = calculateCompoundInterest(P, sekda.equivalentAnnualPct, 1, 12);
const tax = simpleInterest(50000, 12, 4);
const refund = simpleInterest(40000, 6, 7);

function Body() {
    const per100 = [0.5, 0.75, 1, 1.5, 2, 2.5, 3];
    const spans = [3, 6, 12, 18, 24, 36];
    const big = flatByaj(200000, 1, 24);
    return (
        <>
            <Section title="Byaj per ₹100 a month, turned into a yearly rate">
                <p>
                    Money lent between people is often quoted as rupees of interest per ₹100 per month — “₹1 sekda”, “₹2 ka byaj”. Multiply
                    by 12 to get the yearly rate, and by the number of hundreds you borrowed to get the monthly interest.
                </p>
                <DataTable
                    caption={`Interest on ${amt(P)} at different “per ₹100 a month” rates`}
                    head={['Byaj per ₹100 a month', 'Yearly rate', 'Interest a month', '12 months', '24 months']}
                    rows={per100.map((r) => {
                        const one = flatByaj(P, r, 12), two = flatByaj(P, r, 24);
                        return [`₹${r}`, pct(one.equivalentAnnualPct), inr(one.monthlyInterest), inr(one.totalInterest), inr(two.totalInterest)];
                    })}
                    note="Flat interest: the same amount every month on the original sum, as in the FinCalix app’s “per ₹100” mode."
                />
            </Section>

            <Section title="Simple interest by period">
                <DataTable
                    caption={`${amt(50000)} at 9% a year, simple interest`}
                    head={['Period', 'Interest', 'Total to repay']}
                    rows={spans.map((m) => { const r = simpleInterest(50000, 9, m); return [`${m} months`, inr(r.totalInterest), inr(r.totalAmount)]; })}
                    note="Time is counted in years: 6 months = 0.5 year, 18 months = 1.5 years."
                />
            </Section>

            <Section title="How simple interest is calculated">
                <ol className="steps">
                    <li>Write down the principal (P), the yearly rate (R) and the time in years (T): {inr(P)}, {R}%, {MONTHS / 12} years.</li>
                    <li>Simple interest = P × R × T ÷ 100 = {inr(P)} × {R} × {MONTHS / 12} ÷ 100 = {inr(si.totalInterest)}.</li>
                    <li>Amount to repay = P + interest = {inr(si.totalAmount)}.</li>
                    <li>Paid monthly instead, the interest alone is {inr(si.monthlyInterestOnly)} a month; principal and interest spread over {MONTHS} months come to {inr(si.monthlyEMI)} a month.</li>
                </ol>
                <p>Interest is charged only on the original principal, never on interest already due — that is what makes it “simple”.</p>
            </Section>

            <Section title="When unpaid byaj is added to the loan">
                <p>
                    If interest that is not paid each month gets added to the principal, the next month’s interest is worked out on the
                    bigger sum. That is compound interest, and it costs more:
                </p>
                <DataTable
                    caption={`${amt(P)} at ₹2 per ₹100 a month for one year`}
                    head={['How interest is handled', 'Interest for the year']}
                    rows={[
                        ['Paid every month (simple)', inr(sekda.totalInterest)],
                        ['Added to the loan every month (compound)', inr(sekdaAdded.interest)],
                    ]}
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `Advance tax short by ${inr(50000)} for 4 months`, body: <>The Income-tax Act charges a simple 1% a month on a shortfall: {inr(tax.totalInterest)} for 4 months.</> },
                    { title: `A ${inr(40000)} income-tax refund that takes 7 months`, body: <>Refund interest is 0.5% a month, simple: {inr(refund.totalInterest)} on top of the refund.</> },
                    { title: `${amt(200000)} borrowed at ₹1 sekda for 2 years`, body: <>₹1 per ₹100 a month is {pct(big.equivalentAnnualPct)} a year: {inr(big.monthlyInterest)} a month, {inr(big.totalInterest)} over 24 months, {inr(big.totalPayable)} in all.</> },
                    { title: 'Money from family with no interest', body: <>The app’s interest-free switch turns the plan into equal repayments of principal only, with a schedule of dates.</> },
                ]} />
            </Section>

            <Section title="Byaj calculator in the FinCalix app">
                <p>
                    The app’s simple interest screen has three ways to quote a rate — rupees per ₹100 a month, a yearly percentage, or
                    compound — an interest-free switch for family loans, and a repayment schedule by month, quarter, half-year or year. You
                    can save the loan to My Loans and track what is left. Your financial data stays on your device and it works offline.
                </p>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Interest for a shortfall in advance tax is 1% a month (section 424 of the Income-tax Act, 2025).', source: ACT },
                { text: 'Interest paid to you on an income-tax refund is 0.5% a month (section 437, the old 244A).', source: ACT },
                { text: 'Bank loans are not simple interest: RBI requires banks to charge interest on all advances at monthly rests.', source: RBI_ADV },
            ]} />
        </>
    );
}

export const simpleInterestPage: FeatureDef = {
    slug: 'simple-interest',
    title: 'Byaj Calculator: Simple Interest per ₹100 a Month',
    description: 'Simple interest and “₹2 per ₹100” byaj worked out with the formula P × R × T ÷ 100, tables by rate and period, and when interest turns compound.',
    h1: 'Byaj calculator: simple interest, per year or per ₹100 a month',
    crumb: 'Simple interest (byaj)',
    category: 'investments',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Simple Interest',
    eyebrow: 'Interest · byaj and simple interest',
    answer: (
        <>
            <p>Simple interest on {amt(P)} at {R}% a year for {MONTHS / 12} years is {inr(si.totalInterest)} (principal × rate × years ÷ 100), so {inr(si.totalAmount)} is repaid. A byaj of ₹2 per ₹100 a month is {pct(sekda.equivalentAnnualPct)} a year: {inr(sekda.monthlyInterest)} a month on {amt(P)}.</p>
            <p>The Income-tax Act, 2025 uses simple interest too: 1% a month on a shortfall in advance tax, 0.5% a month on refunds.</p>
        </>
    ),
    sources: [ACT],
    calc: { key: 'simple-interest', props: { principal: P, rate: R, months: MONTHS, mode: 'year' } },
    Body,
    faqs: [
        { q: 'What is the simple interest formula?', a: `Simple interest = principal × rate × time ÷ 100, with the rate per year and the time in years. ${inr(P)} at ${R}% for ${MONTHS / 12} years earns ${inr(si.totalInterest)}.` },
        { q: 'How do I calculate ₹2 per hundred interest?', a: `Divide the amount by 100 and multiply by 2 for one month’s interest: ${amt(P)} gives ${inr(sekda.monthlyInterest)} a month, ${inr(sekda.totalInterest)} a year. ₹2 per ₹100 a month equals ${pct(sekda.equivalentAnnualPct)} a year.` },
        { q: 'What is the difference between simple and compound interest?', a: `Simple interest is charged only on the original sum; compound interest is also charged on interest already added. ${amt(P)} at ₹2 per ₹100 a month costs ${inr(sekda.totalInterest)} a year if interest is paid monthly, but ${inr(sekdaAdded.interest)} if unpaid interest is added to the loan each month.` },
        { q: 'How do I calculate simple interest for months?', a: `Turn the months into years by dividing by 12. ${amt(50000)} at 9% for 18 months: 50,000 × 9 × 1.5 ÷ 100 = ${inr(simpleInterest(50000, 9, 18).totalInterest)}.` },
        { q: 'Do banks charge simple interest on loans?', a: 'No. RBI requires banks to charge interest on all advances at monthly rests, and EMI loans work on a reducing balance. Simple interest is used for some tax interest, informal lending and quick estimates.' },
        { q: 'Byaj kaise nikale?', a: `Mool rakam × dar × samay ÷ 100 — dar saalana %, samay saal mein. ₹1 lakh par 8% saalana 3 saal ka byaj ${inr(si.totalInterest)} hota hai. ₹2 sekda ka matlab hai har ₹100 par mahine ka ₹2: ₹1 lakh par ${inr(sekda.monthlyInterest)} mahina.` },
    ],
    related: [
        { href: '/compound-interest', label: 'Compound interest calculator', note: 'When interest earns interest' },
        { href: '/emi', label: 'EMI calculator', note: 'Reducing-balance loans from banks' },
        { href: '/overdraft-interest', label: 'OD interest calculator', note: 'Interest by the day on a credit line' },
        { href: '/fd', label: 'FD calculator', note: 'What a deposit earns' },
    ],
    disclaimer: { text: 'Figures use the simple-interest and per-₹100 formulas of the FinCalix app on the amounts you enter. A written loan agreement, your lender or the tax department decides the actual interest. FinCalix is not a lender or tax advisor.' },
};
