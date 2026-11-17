/**
 * /fd — primary query "fd calculator" (SEO_PLAN.md §5b). Replaces the hand-written guide.
 * Figures: the app's calculateFD (src/utils/calculations.ts, FDCalculator.tsx), poTd (features/math)
 * and nscProjection (features/math-deposits) for the comparison. The 6.5% rate is an example input,
 * not a bank's quote. TDS: s.393(1) Table Sl. 5(ii) of the Income-tax Act 2025 + Finance Act 2026
 * Part II (10%); DICGC ₹5 lakh; Schedule XV item (s). Facts: seo/research/verified-facts-deposits.md.
 */
import { SMALL_SAVINGS } from '../../../data/rateEnvironment';
import { calculateFD } from '../../../utils/calculations';
import { poTd } from '../math';
import { nscProjection } from '../math-deposits';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const S393 = { label: 'Income-tax Act, 2025: section 393 (TDS)', url: 'https://www.incometaxindia.gov.in/w/section-393-6' };
const FA26 = { label: 'Finance Act, 2026 (First Schedule, Part II)', url: 'https://egazette.gov.in/WriteReadData/2026/271439.pdf' };
const DICGC = { label: 'DICGC: deposit insurance FAQs', url: 'https://dicgc.org.in/FAQs' };
const SCH15 = { label: 'Income-tax Act, 2025: Schedule XV (section 123)', url: 'https://www.incometaxindia.gov.in/w/schedule-xv-3' };
const FORM121 = { label: 'Form No. 121 guidance note (Income Tax Department)', url: 'https://www.incometaxindia.gov.in/documents/d/guest/fn-121' };

const RATE = 6.5;                      // example bank rate (an input, not a market figure)
const P = 500000;
const main = calculateFD(P, RATE, 5, 4);
const lakh = calculateFD(100000, RATE, 1, 4);
const quarterly = (a: number) => calculateFD(a, RATE, 0.25, 4).interest;
const monthly = (a: number) => calculateFD(a, RATE, 1 / 12, 12).interest;
const perRupeeYear = calculateFD(1, RATE, 1, 4).interest;
const crossAt = (limit: number) => Math.ceil(limit / perRupeeYear / 1000) * 1000;

function Body() {
    const payoutAmounts = [500000, 1000000, 2000000, 3000000, 5000000];
    const grid = [100000, 200000, 500000, 1000000];
    const tenures = [1, 2, 3, 5, 10];
    const L = 100000;
    const q = RATE / 4;
    const ten = calculateFD(1000000, RATE, 1, 4);
    const td = poTd(L, SMALL_SAVINGS.rates.td5y, 5);
    const nsc = nscProjection(L, SMALL_SAVINGS.rates.nsc);
    const bank5 = calculateFD(L, RATE, 5, 4);
    return (
        <>
            <Section title="Monthly and quarterly interest on a payout FD">
                <DataTable
                    caption={`Interest paid out at ${RATE}% a year (deposit stays the same)`}
                    head={['Deposit', 'Every month', 'Every quarter', 'Every year (paid yearly)']}
                    rows={payoutAmounts.map((a) => [amt(a), inr(monthly(a)), inr(quarterly(a)), inr(calculateFD(a, RATE, 1, 1).interest)])}
                    note="A payout FD sends the interest to your savings account instead of adding it to the deposit, so the interest does not compound. Ask your bank for its exact monthly figure; it can differ from rate ÷ 12."
                />
            </Section>

            <Section title="Maturity value by amount and tenure">
                <DataTable
                    caption={`Cumulative FD at ${RATE}%, compounded quarterly`}
                    head={['Deposit', ...tenures.map((t) => `${t} yr${t === 1 ? '' : 's'}`)]}
                    rows={grid.map((a) => [amt(a), ...tenures.map((t) => inr(calculateFD(a, RATE, t, 4).amount))])}
                />
            </Section>

            <Section title="How the maturity is worked out">
                <ol className="steps">
                    <li>Split the yearly rate into the compounding periods: {RATE}% ÷ 4 = {q}% a quarter.</li>
                    <li>Count the periods: 5 years × 4 = 20 quarters.</li>
                    <li>Grow the deposit: {inr(P)} × (1 + {q / 100})<sup>20</sup> = {inr(main.amount)}.</li>
                    <li>Take away the deposit to get the interest: {inr(main.amount)} − {inr(P)} = {inr(main.interest)}. This is the figure before tax.</li>
                </ol>
                <DataTable
                    caption={`How often interest compounds: ${inr(L)} for 5 years at ${RATE}%`}
                    head={['Compounding', 'Maturity', 'Interest']}
                    rows={[['Yearly', 1], ['Quarterly', 4], ['Monthly', 12]].map(([label, c]) => {
                        const r = calculateFD(L, RATE, 5, c as number);
                        return [label as string, inr(r.amount), inr(r.interest)];
                    })}
                />
            </Section>

            <Section title="When the bank deducts TDS">
                <p>Under section 393 of the Income-tax Act, 2025, a bank deducts tax at source once the interest it pays or credits to you in a tax year goes above {inr(50000)}, or {inr(100000)} if you are 60 or older. The rate in force for residents is 10%. The limit is per bank, not per deposit: all your FDs and recurring deposits with that bank are added together.</p>
                <p>At {RATE}% compounded quarterly, a deposit of about {amt(crossAt(50000))} earns more than {inr(50000)} in a year, and about {amt(crossAt(100000))} crosses the {inr(100000)} limit for seniors.</p>
            </Section>

            <Section title="Bank FD, Post Office TD or NSC for 5 years">
                <DataTable
                    caption={`${inr(L)} for 5 years (rates for ${SMALL_SAVINGS.months}; the bank rate is an example)`}
                    head={['Option', 'Rate', 'How interest comes', 'Interest over 5 years']}
                    rows={[
                        ['Bank FD (cumulative)', `${RATE}%`, 'Compounded quarterly, paid at maturity', inr(bank5.interest)],
                        ['Post Office 5-year TD', `${SMALL_SAVINGS.rates.td5y}%`, `Paid yearly, ${inr(td.yearlyInterest)} a year`, inr(td.interest)],
                        ['NSC', `${SMALL_SAVINGS.rates.nsc}%`, 'Compounded yearly, paid at maturity', inr(nsc.interest)],
                    ]}
                    note="Post Office rates are set by the Government every quarter and stay fixed for the deposit; a bank FD keeps the rate printed on its receipt."
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `A retiree living on ${amt(2000000)}`, body: <>A quarterly payout FD of {amt(2000000)} at {RATE}% pays {inr(quarterly(2000000))} every quarter. That is {inr(quarterly(2000000) * 4)} in a year, above the {inr(100000)} TDS limit for seniors, so the bank deducts 10% unless a nil-tax declaration is on file.</> },
                    { title: `${amt(1000000)} for one year, below 60`, body: <>The deposit earns {inr(ten.interest)} in the year. Because that is more than {inr(50000)}, the bank deducts about {inr(ten.interest * 0.1)} as TDS, which you adjust against your tax when you file.</> },
                    { title: `${inr(L)} parked for a year`, body: <>At {RATE}% compounded quarterly it grows to {inr(lakh.amount)}. Quarterly compounding adds {inr(lakh.interest - calculateFD(L, RATE, 1, 1).interest)} over yearly compounding at the same rate.</> },
                    { title: 'Large deposits and insurance', body: <>DICGC insures up to {amt(500000)} per depositor in each bank, principal and interest together. {amt(800000)} kept as {amt(400000)} in each of two banks is still within the cover after a year ({inr(calculateFD(400000, RATE, 1, 4).amount)} per bank); in a single bank, only {amt(500000)} of it would be covered.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: `TDS on interest from a bank, co-operative bank or post office applies when the year's interest from that payer exceeds ${inr(50000)} (${inr(100000)} for a senior citizen).`, source: S393 },
                { text: 'TDS rate in force on interest (other than interest on securities) for resident individuals: 10% in tax year 2026-27.', source: FA26 },
                { text: 'A depositor whose tax for the year will be nil can give the bank a declaration under section 393(6) in Form No. 121, and no tax is deducted. Below 60, the year\'s interest must also be within the amount not chargeable to tax.', source: FORM121 },
                { text: 'A term deposit of five years or more with a scheduled bank, under the notified scheme, counts towards the ₹1.5 lakh deduction under section 123 — old regime only.', source: SCH15 },
                { text: 'Deposit insurance covers up to ₹5 lakh per depositor per bank, principal and interest together, with all branches counted as one.', source: DICGC },
            ]} />
        </>
    );
}

export const fd: FeatureDef = {
    slug: 'fd',
    title: 'FD Calculator: Maturity, Monthly Interest and TDS',
    description: 'Fixed deposit maturity for any amount, rate and tenure; monthly and quarterly interest on ₹5–50 lakh; and when banks deduct TDS under the 2025 Act.',
    h1: 'FD calculator: maturity, monthly payout and TDS on interest',
    crumb: 'FD calculator',
    category: 'investments',
    updated: '2026-11-17',
    analyticsTitle: 'Website - FD',
    eyebrow: 'Bank fixed deposits · tax year 2026-27',
    answer: (
        <>
            <p>A {amt(P)} fixed deposit for 5 years at {RATE}% a year, compounded quarterly, matures at {inr(main.amount)} — {inr(main.interest)} of interest before tax.</p>
            <p>Under section 393 of the Income-tax Act, 2025, the bank deducts 10% TDS once your interest from it in a tax year crosses {inr(50000)}, or {inr(100000)} if you are 60 or older. Enter your own bank's rate in the calculator below.</p>
        </>
    ),
    sources: [S393, FA26, DICGC],
    calc: { key: 'fd', props: { amount: P, rate: RATE, years: 5, comp: '4' } },
    Body,
    faqs: [
        { q: 'How much interest does a ₹20 lakh FD give per month?', a: `About ${inr(monthly(2000000))} a month at ${RATE}% in a monthly payout FD, or ${inr(quarterly(2000000))} a quarter in a quarterly payout. The deposit itself stays at ${amt(2000000)}.` },
        { q: 'Is FD interest taxable?', a: 'Yes. FD interest is part of your income for the year. The bank also deducts 10% TDS once its interest to you crosses ₹50,000 in a tax year (₹1 lakh at 60+), and that TDS is credited against your final tax.' },
        { q: 'How much FD interest is tax-free?', a: 'There is no tax-free slice built into an FD. The ₹50,000 and ₹1 lakh figures only decide whether the bank deducts TDS; the interest still counts as income when you file.' },
        { q: 'Is TDS counted per FD or per bank?', a: 'Per bank. Section 393 adds up all interest the same bank pays or credits to you in the tax year, so several small FDs in one bank can together cross the limit.' },
        { q: 'Is my FD safe if the bank fails?', a: 'Up to ₹5 lakh per bank is insured by DICGC, covering principal and interest together. Amounts above that in one bank are not covered.' },
        { q: 'Which FD saves income tax?', a: 'Only a tax-saving term deposit of five years or more with a scheduled bank, under the notified scheme, and only in the old regime: it counts towards the ₹1.5 lakh limit of section 123. Its interest is still taxable.' },
        { q: 'FD par interest kitna milta hai?', a: `${inr(100000)} ka FD ${RATE}% par ek saal mein lagbhag ${inr(lakh.interest)} byaj deta hai (quarterly compounding). ${amt(P)} ko 5 saal rakhein to ${inr(main.amount)} milta hai — apne bank ki rate calculator mein daal kar dekhiye.` },
    ],
    related: [
        { href: '/post-office-td', label: 'Post Office TD calculator', note: 'Government time deposit, 1 to 5 years' },
        { href: '/rd', label: 'RD calculator', note: 'Save a fixed amount every month' },
        { href: '/scss', label: 'Senior Citizen Savings Scheme', note: 'Quarterly income for 60+' },
        { href: '/compound-interest', label: 'Compound interest calculator', note: 'Any rate, any compounding' },
        { href: '/income-tax', label: 'Income tax calculator', note: 'Tax on your total income' },
    ],
    disclaimer: { text: `The ${RATE}% rate is only an example: banks set their own FD rates and change them often. Figures are before tax and use the method shown; your bank's deposit receipt decides the actual interest and TDS. FinCalix is not a bank and does not accept deposits.` },
};
