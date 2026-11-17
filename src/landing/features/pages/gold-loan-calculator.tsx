/**
 * /gold-loan-calculator — primary query "gold loan calculator" (SEO_PLAN.md §5a). The slug is not
 * /gold-loan because that is the app route (it 308s here). Figures: the app's gold-loan formula
 * (features/math.goldLoanEligibility, copied from GoldLoanCalculator.tsx) and calculateReducingEMI.
 * Rules: RBI Lending Against Gold and Silver Collateral Directions, 2025; rate: IBJA 17 Nov 2026
 * (seo/research/verified-facts-2026-11-17.md).
 */
import { calculateReducingEMI } from '../../../utils/calculations';
import { GOLD_PURITY, goldLoanEligibility, type GoldPurity } from '../math';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RBI_GOLD = { label: 'RBI Lending Against Gold and Silver Collateral Directions, 2025', url: 'https://www.rbi.org.in/scripts/FS_Notification.aspx?Id=12859' };
const IBJA = { label: 'IBJA gold rates', url: 'https://ibjarates.com/' };

const RATE24 = 13420, RATE_DATE = '17 Nov 2026';
const g50 = goldLoanEligibility(50, RATE24, '22K');
const g10 = goldLoanEligibility(10, RATE24, '22K');
const g20 = goldLoanEligibility(20, RATE24, '22K');
const g100 = goldLoanEligibility(100, RATE24, '22K');
/** Bullet loan: the LTV applies to principal plus interest due at maturity. Illustration at 10% simple interest for 12 months. */
const BULLET_RATE = 10;
const bulletMax = Math.floor(g50.maxLoan / (1 + BULLET_RATE / 100));
const emi12 = calculateReducingEMI(g50.maxLoan, BULLET_RATE, 12);

function Body() {
    const weights = [5, 10, 20, 30, 50, 75, 100, 200];
    const purities: GoldPurity[] = ['24K', '22K', '20K', '18K'];
    return (
        <>
            <Section title="Gold loan by weight (22 carat)">
                <DataTable
                    caption={`Most a lender can lend on 22K gold at the IBJA 24K rate of ${inr(RATE24)}/g (${RATE_DATE})`}
                    head={['Gold (net weight)', 'Gold value', 'Loan-to-value', 'Maximum loan', 'Per gram']}
                    rows={weights.map((w) => {
                        const g = goldLoanEligibility(w, RATE24, '22K');
                        return [`${w} g`, inr(g.value), `${g.ltv}%`, inr(g.maxLoan), inr(g.perGram)];
                    })}
                    note="Gold value = weight × 24K rate × purity (0.916 for 22K). The loan-to-value limit falls as the loan grows: 85% up to ₹2.5 lakh, 80% up to ₹5 lakh, 75% above — the same maths as the FinCalix app."
                />
                <p>
                    Close to ₹2.5 lakh and ₹5 lakh the limits overlap: a loan of up to ₹2.5 lakh is allowed at 85% even when 80% of the
                    gold’s value is less, so a lender may offer slightly more than this table shows near those amounts.
                </p>
            </Section>

            <Section title="Loan per gram by purity">
                <DataTable
                    caption={`Loan per gram of gold at each loan-to-value limit (24K rate ${inr(RATE24)}/g)`}
                    head={['Purity', 'Value per gram', 'At 85% (loan up to ₹2.5 lakh)', 'At 80% (up to ₹5 lakh)', 'At 75% (above ₹5 lakh)']}
                    rows={purities.map((p) => {
                        const v = RATE24 * GOLD_PURITY[p];
                        return [p, inr(v), inr(v * 0.85), inr(v * 0.8), inr(v * 0.75)];
                    })}
                    note="Lenders test the purity and weigh the gold net of stones, so the weight they use can be lower than the jewellery’s gross weight."
                />
            </Section>

            <Section title="How the loan amount is worked out">
                <ol className="steps">
                    <li>The lender weighs the gold and tests its purity. Stones and other metals are not counted.</li>
                    <li>It values the gold at the lower of two IBJA (or SEBI-regulated exchange) prices for that purity: the average closing price of the last 30 days, or the previous day’s closing price.</li>
                    <li>It applies the loan-to-value limit. For 50 g of 22K at {inr(RATE24)}/g: 50 × {inr(RATE24)} × 0.916 = {inr(g50.value)}; the loan would be above ₹2.5 lakh but within ₹5 lakh, so 80% applies, giving up to {inr(g50.maxLoan)}.</li>
                    <li>For a bullet loan (interest and principal paid together at the end), the limit applies to the total you’ll owe at maturity, so the amount you get is lower.</li>
                </ol>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: '10 g of 22K jewellery', body: <>Valued at {inr(g10.value)}; the loan stays within ₹2.5 lakh, so 85% applies: up to {inr(g10.maxLoan)}, or {inr(g10.perGram)} a gram.</> },
                    { title: '20 g of 22K jewellery', body: <>Valued at {inr(g20.value)}; up to {inr(g20.maxLoan)} at {g20.ltv}%.</> },
                    { title: `50 g as a 12-month bullet loan at ${BULLET_RATE}%`, body: <>The limit of {inr(g50.maxLoan)} covers principal plus interest, so at {BULLET_RATE}% simple interest for a year the most you can borrow is about {inr(bulletMax)}. As an EMI loan over 12 months instead, {inr(g50.maxLoan)} at {BULLET_RATE}% costs {inr(emi12.emi)} a month.</> },
                    { title: '100 g of 22K gold', body: <>Valued at {amt(g100.value)}; the loan is above ₹5 lakh, so 75% applies: up to {amt(g100.maxLoan)}, or {inr(g100.perGram)} a gram.</> },
                ]} />
                <p>The {BULLET_RATE}% rate is only an illustration; check your lender’s rate and charges.</p>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Loan-to-value limits for gold loans taken for consumption: 85% for loans up to ₹2.5 lakh, 80% above ₹2.5 lakh up to ₹5 lakh, and 75% above ₹5 lakh. Lenders had to comply by 1 April 2026.', source: RBI_GOLD },
                { text: 'Gold is valued at the lower of the 30-day average closing price or the previous day’s closing price for the same purity, published by IBJA or a SEBI-regulated commodity exchange. Stones and other metals are not counted.', source: RBI_GOLD },
                { text: 'For bullet repayment loans, the loan-to-value limit is checked on the total amount payable at maturity, and the tenure can be at most 12 months.', source: RBI_GOLD },
                { text: `IBJA 999 (24K) rate on ${RATE_DATE}: ${inr(RATE24)}/g; 916 (22K): ₹12,293/g, both before GST.`, source: IBJA },
            ]} />
        </>
    );
}

export const goldLoanCalculator: FeatureDef = {
    slug: 'gold-loan-calculator',
    title: 'Gold Loan Calculator: Loan per Gram and RBI LTV Limits',
    description: 'How much loan you can get on your gold, per gram and by weight, with the RBI 85/80/75% loan-to-value limits and how lenders value gold.',
    h1: 'Gold loan calculator: how much loan per gram of gold',
    crumb: 'Gold loan',
    category: 'loans',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Gold Loan',
    eyebrow: `Gold loans · IBJA rate ${RATE_DATE}`,
    answer: (
        <>
            <p>At the IBJA 24K rate of {inr(RATE24)}/g ({RATE_DATE}), 50 g of 22-carat gold is valued at {inr(g50.value)} and can get a loan of up to {inr(g50.maxLoan)} — {inr(g50.perGram)} a gram at the 80% limit.</p>
            <p>RBI caps the loan at 85% of the gold’s value for loans up to ₹2.5 lakh, 80% up to ₹5 lakh and 75% above. Lenders value gold at the lower of the 30-day average or the previous day’s price, so their figure can be a little lower.</p>
        </>
    ),
    sources: [RBI_GOLD, IBJA],
    calc: { key: 'goldLoan', props: { grams: 50, purity: '22K', rate24: RATE24, rateDate: RATE_DATE } },
    Body,
    faqs: [
        { q: 'How much gold loan can I get on 10 grams?', a: `About ${inr(g10.maxLoan)} on 10 g of 22K gold at the ${RATE_DATE} IBJA rate: it is valued at ${inr(g10.value)}, and loans up to ₹2.5 lakh can be 85% of the value.` },
        { q: 'What is the maximum loan-to-value for a gold loan?', a: '85% of the gold’s value for loans up to ₹2.5 lakh, 80% for loans above ₹2.5 lakh up to ₹5 lakh, and 75% above ₹5 lakh, under RBI’s 2025 Directions.' },
        { q: 'Which gold rate do banks use for a gold loan?', a: 'The lower of the average closing price of the last 30 days or the previous day’s closing price for that purity, from IBJA or a SEBI-regulated commodity exchange.' },
        { q: 'Are stones counted in a gold loan?', a: 'No. Only the gold is valued; stones and other metals are left out, so the net weight the lender uses can be lower than the jewellery’s gross weight.' },
        { q: 'How long can a bullet gold loan run?', a: `Up to 12 months, and the loan-to-value limit applies to the total payable at maturity, principal plus interest. That lowers the amount you can borrow: about ${inr(bulletMax)} instead of ${inr(g50.maxLoan)} on 50 g of 22K at ${BULLET_RATE}% for a year.` },
        { q: 'Gold loan per gram kitna milta hai?', a: `${RATE_DATE} ke IBJA rate par 22 carat sone par ₹2.5 lakh tak ke loan mein lagbhag ${inr(RATE24 * GOLD_PURITY['22K'] * 0.85)} prati gram (85%) milta hai; bade loan par 80% ya 75%. Bank pichhle 30 din ke average aur kal ke bhav mein jo kam ho, us par sone ki keemat lagata hai.` },
    ],
    related: [
        { href: '/personal-loan', label: 'Personal loan EMI calculator', note: 'Compare an unsecured loan' },
        { href: '/emi', label: 'EMI calculator', note: 'Monthly payments for any loan' },
        { href: '/credit-card-interest', label: 'Credit card interest calculator', note: 'What card debt costs instead' },
    ],
    disclaimer: 'gold',
};
