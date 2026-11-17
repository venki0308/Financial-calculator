/**
 * /credit-card-interest — primary query "credit card interest calculator" (SEO_PLAN.md §5a).
 * Figures: the app's getTrueCost, getMinimumDue, getPayoffMonths, getTotalInterest
 * (src/utils/creditCardCalculations.ts). Rules: RBI card Directions 2025 and the GST rate
 * notifications (seo/research/verified-facts-2026-11-17.md).
 */
import { getMinimumDue, getPayoffMonths, getTotalInterest, getTrueCost } from '../../../utils/creditCardCalculations';
import { yearsMonths } from '../derive';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RBI_CARDS = { label: 'RBI Credit Card and Debit Card Directions, 2025 (paras 23, 29)', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13155' };
const GST11 = { label: 'CGST rate notification 11/2017 (financial services)', url: 'https://cbic-gst.gov.in/hindi/pdf/central-tax-rate/Notification11-CGST.pdf' };
const GST12 = { label: 'CGST notification 12/2017 (card interest not exempt)', url: 'https://cbic-gst.gov.in/hindi/pdf/central-tax-rate/Notification12-CGST.pdf' };

const BAL = 50000, MONTHLY = 3.5, APR = MONTHLY * 12, DAYS = 30;
const cost = getTrueCost(BAL, APR, DAYS);
const minDue = getMinimumDue(BAL, APR);
const months = (pay: number) => getPayoffMonths(BAL, APR, pay);
const interestTill = (pay: number) => getTotalInterest(BAL, APR, pay);

function Body() {
    const rates = [2.5, 3, 3.5, 3.75, 4];
    const pays = [minDue, 5000, 10000, 25000];
    return (
        <>
            <Section title="What carrying a balance costs">
                <DataTable
                    caption={`Interest plus 18% GST on an unpaid ${inr(BAL)}, by monthly rate and number of days`}
                    head={['Card rate a month (a year)', '15 days', '30 days', '45 days']}
                    rows={rates.map((m) => [`${m}% (${m * 12}%)`, inr(getTrueCost(BAL, m * 12, 15).total), inr(getTrueCost(BAL, m * 12, 30).total), inr(getTrueCost(BAL, m * 12, 45).total)])}
                    note="Daily-balance method: balance × yearly rate ÷ 365 × days, plus 18% GST on the interest — the same maths as the FinCalix app."
                />
            </Section>

            <Section title="The minimum-due trap">
                <p>
                    The minimum amount due keeps your card in good standing, but interest keeps running on everything you haven’t paid.
                    Here is how long {inr(BAL)} at {MONTHLY}% a month takes to clear at different fixed monthly payments, with no new
                    spending.
                </p>
                <DataTable
                    caption={`Clearing ${inr(BAL)} at ${MONTHLY}% a month, interest including GST`}
                    head={['You pay every month', 'Time to clear', 'Interest + GST paid']}
                    rows={pays.map((p) => {
                        const m = months(p);
                        const i = interestTill(p);
                        return [p === minDue ? `${inr(p)} (about the first minimum due)` : inr(p), m === Infinity ? 'Never' : yearsMonths(m), i === Infinity ? '—' : inr(i)];
                    })}
                    note={`The first minimum due shown is the app's estimate (the higher of 5% of the balance or a month's interest plus 1% of the balance, at least ₹200). Your card's own rule is in its MITC; the real minimum usually falls as the balance falls, which makes clearing take even longer.`}
                />
            </Section>

            <Section title="How credit card interest is calculated">
                <ol className="steps">
                    <li>If you pay the total amount due by the due date, there is no interest on purchases.</li>
                    <li>If you pay less, the interest-free period is lost and interest can be charged from the date of each purchase, on the outstanding amount after your payments and refunds.</li>
                    <li>Interest per day = outstanding × yearly rate ÷ 365. For {inr(BAL)} at {MONTHLY}% a month ({APR}% a year) for {DAYS} days: {inr(cost.interest)}.</li>
                    <li>GST at 18% is added to the interest: {inr(cost.gst)}, for a total of {inr(cost.total)} — an effective {cost.trueAPR}% a year.</li>
                </ol>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `You pay ${inr(40000)} of a ${inr(BAL)} bill`, body: <>The interest-free period is lost, so interest can run from each purchase date on the outstanding amount — not just on the {inr(10000)} you left unpaid. Paying the full bill is the only way to avoid interest on purchases.</> },
                    { title: `Paying about ${inr(minDue)} a month`, body: <>{inr(BAL)} at {MONTHLY}% a month takes {yearsMonths(months(minDue))} to clear and costs {inr(interestTill(minDue))} in interest and GST.</> },
                    { title: `Paying ${inr(10000)} a month instead`, body: <>The same balance clears in {yearsMonths(months(10000))} with {inr(interestTill(10000))} of interest and GST — {inr(interestTill(minDue) - interestTill(10000))} less.</> },
                    { title: 'A larger balance', body: <>An unpaid {amt(200000)} at {MONTHLY}% a month costs {inr(getTrueCost(200000, APR, 30).total)} for a single month, interest plus GST.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'The minimum amount due must be set so there is no negative amortisation, and issuers can’t charge interest on unpaid taxes or charges.', source: RBI_CARDS },
                { text: 'Interest is levied only on the outstanding amount after payments, refunds and reversals. If you pay part of the bill, the interest-free period is lost and interest may be charged from the date of each transaction.', source: RBI_CARDS },
                { text: 'Late payment charges apply only when a payment is more than three days past the due date, and only on the amount outstanding after the due date.', source: RBI_CARDS },
                { text: 'You can change your card’s billing cycle at least once.', source: RBI_CARDS },
                { text: 'Credit card interest is not exempt from GST (unlike ordinary loan interest), so 18% GST applies to it and to card fees.', source: GST12 },
                { text: 'The 18% rate for financial services is in the CGST rate notification and was not changed by the 2025 GST rate changes.', source: GST11 },
            ]} />
        </>
    );
}

export const creditCardInterest: FeatureDef = {
    slug: 'credit-card-interest',
    title: 'Credit Card Interest Calculator with GST and Minimum Due',
    description: 'What an unpaid credit card balance costs, with 18% GST, the minimum-due trap, how interest is calculated and the RBI rules on late fees.',
    h1: 'Credit card interest calculator: the real cost of the minimum due',
    crumb: 'Credit card interest',
    category: 'cards',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Credit Card Interest',
    eyebrow: 'Credit cards · interest and GST',
    answer: (
        <>
            <p>An unpaid credit card balance of {inr(BAL)} at {MONTHLY}% a month costs {inr(cost.interest)} of interest plus {inr(cost.gst)} of GST — {inr(cost.total)} — for 30 days.</p>
            <p>Paying about {inr(minDue)} a month, close to the minimum due, it takes {yearsMonths(months(minDue))} to clear and costs {inr(interestTill(minDue))} in interest and GST. If you don’t pay the full bill, interest can run from each purchase date.</p>
        </>
    ),
    sources: [RBI_CARDS, GST12],
    calc: { key: 'ccInterest', props: { balance: BAL, monthlyRate: MONTHLY, days: DAYS, payment: 5000 } },
    Body,
    faqs: [
        { q: 'How is credit card interest calculated?', a: `Daily: outstanding × yearly rate ÷ 365 for each day the money is unpaid, plus 18% GST. ${inr(BAL)} at ${MONTHLY}% a month for 30 days costs ${inr(cost.total)}. If you pay less than the full bill, interest can be charged from each purchase date.` },
        { q: 'What does minimum amount due mean on a credit card?', a: 'It is the smallest payment that keeps your account in good standing and avoids a late fee. It does not stop interest: the rest of the balance keeps attracting interest, and the interest-free period on new purchases is lost.' },
        { q: 'Is it OK to pay only the minimum due?', a: `Only as a stopgap. Paying about ${inr(minDue)} a month on ${inr(BAL)} at ${MONTHLY}% takes ${yearsMonths(months(minDue))} and costs ${inr(interestTill(minDue))} in interest and GST.` },
        { q: 'Is GST charged on credit card interest?', a: 'Yes, 18%. Ordinary loan interest is exempt from GST, but interest on credit cards is specifically excluded from that exemption, so GST applies to card interest and fees.' },
        { q: 'When is a late payment fee charged on a credit card?', a: 'Only if the payment is more than three days late. Once that happens, days past due are counted from the original due date, and the fee applies to the amount outstanding after the due date.' },
        { q: 'Credit card ka minimum due kitna hota hai?', a: `Har bank apna niyam MITC mein batata hai; aksar yeh bakaya ka chhota hissa hota hai. FinCalix app ${inr(BAL)} par lagbhag ${inr(minDue)} ka andaaza deta hai. Sirf minimum due bharne se late fee nahi lagti, par baaki rakam par byaj aur 18% GST lagta rehta hai.` },
    ],
    related: [
        { href: '/personal-loan', label: 'Personal loan EMI calculator', note: 'Compare a loan to clear card debt' },
        { href: '/emi', label: 'EMI calculator', note: 'What a card EMI conversion really costs' },
        { href: '/expense-tracker', label: 'Expense tracker', note: 'Track spending before the bill arrives' },
    ],
    disclaimer: 'card',
};
