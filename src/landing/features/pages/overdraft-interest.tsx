/**
 * /overdraft-interest — primary query "od interest calculator" (SEO_PLAN.md §5a).
 * Figures: the app's overdraft formula, copied from src/pages/OverdraftCalculator.tsx into
 * features/math-credit.ts (odInterest, odStretches, odEffectiveCost), and calculateReducingEMI
 * (src/utils/calculations.ts) for the loan comparison. The screen's extra rate on drawings above
 * the limit is not used (penal interest; see the APP BUG in the credit group's report).
 * Rules: seo/research/verified-facts-credit.md.
 */
import { calculateReducingEMI } from '../../../utils/calculations';
import { odEffectiveCost, odInterest, odStretches } from '../math-credit';
import { amt, inr, pct } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RBI_ADV = { label: 'RBI Interest Rates on Advances Directions, 2025 (para 6(7))', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13149' };
const RBI_RBC = { label: 'RBI Responsible Business Conduct Directions, 2025 (paras 351, 353)', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13140' };

const LIMIT = 1000000, DRAWN = 500000, RATE = 10.5, DAYS = 30;
const main = odInterest({ limit: LIMIT, utilized: DRAWN, rate: RATE, days: DAYS });
const whole = odInterest({ limit: LIMIT, utilized: LIMIT, rate: RATE, days: DAYS });
const MONTH = [{ balance: 200000, days: 10 }, { balance: 650000, days: 12 }, { balance: 350000, days: 8 }];
const month = odStretches(MONTH, LIMIT, RATE);
const yearOd = odInterest({ limit: LIMIT, utilized: DRAWN, rate: RATE, days: 365 });
const yearPl = calculateReducingEMI(DRAWN, RATE, 12);
const FEE = 0.5;
const eff = odEffectiveCost({ limit: LIMIT, utilized: DRAWN, rate: RATE, days: DAYS, processingFeePct: FEE, amc: 0 });

function Body() {
    const amounts = [100000, 250000, 500000, 1000000];
    const spans = [7, 15, 30, 90];
    const fdOd = odInterest({ limit: 270000, utilized: 200000, rate: 8, days: 45 });
    const salOd = odInterest({ limit: 100000, utilized: 50000, rate: 15, days: 20 });
    return (
        <>
            <Section title="Interest by amount drawn and days">
                <DataTable
                    caption={`Interest on an overdraft at ${RATE}% a year, by the amount you draw and how long it stays drawn`}
                    head={['Amount drawn', ...spans.map((s) => `${s} days`)]}
                    rows={amounts.map((a) => [amt(a), ...spans.map((s) => inr(odInterest({ limit: LIMIT, utilized: a, rate: RATE, days: s }).totalInterest))])}
                    note="Amount drawn × rate ÷ 365 × days — the formula in the FinCalix app’s overdraft calculator. The undrawn part of the limit carries no interest in this calculation; check your sanction letter for any charge on the limit itself."
                />
            </Section>

            <Section title="A month with a changing balance">
                <p>
                    A real OD balance moves every few days: you draw for a supplier, receipts come in, you draw again. Work out each stretch
                    at its own balance and add them up. On a {amt(LIMIT)} limit at {RATE}%:
                </p>
                <DataTable
                    caption="One 30-day month, stretch by stretch"
                    head={['Balance drawn', 'Days at that balance', 'Interest']}
                    rows={[...month.rows.map((r) => [inr(r.balance), String(r.days), inr(r.interest)]), ['Month', String(month.days), inr(month.total)]]}
                    note={`Had the whole ${amt(LIMIT)} stayed drawn all month, the interest would have been ${inr(whole.totalInterest)}.`}
                />
            </Section>

            <Section title="How OD interest is calculated">
                <ol className="steps">
                    <li>Interest for one day = balance drawn × yearly rate ÷ 365. For {amt(DRAWN)} at {RATE}%: {inr(main.dailyInterest)} a day.</li>
                    <li>Multiply by the days the balance stays the same: {DAYS} days give {inr(main.totalInterest)}.</li>
                    <li>When the balance changes, start a new stretch and add the stretches together.</li>
                    <li>The bank debits the month’s interest to the account: RBI requires interest on all advances to be charged at monthly rests. Left unpaid, it becomes part of the balance you owe.</li>
                </ol>
            </Section>

            <Section title="OD or personal loan for the same money?">
                <p>
                    An OD is cheaper when you need money for days or weeks, because interest stops the moment you pay it back. For money you
                    will keep for a year, a loan that is repaid every month can cost less, because its balance keeps falling:
                </p>
                <DataTable
                    caption={`${amt(DRAWN)} for 12 months at ${RATE}%`}
                    head={['How you borrow', 'Interest for the year']}
                    rows={[
                        [`OD, full ${amt(DRAWN)} drawn all year, interest paid monthly`, inr(yearOd.totalInterest)],
                        ['Loan repaid in 12 EMIs', inr(yearPl.totalInterest)],
                    ]}
                    note={`The loan’s EMI is ${inr(yearPl.emi)} (app’s reducing-balance EMI). Repay the OD in instalments and its cost falls in the same way.`}
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `Overdraft against a fixed deposit, ${inr(200000)} for 45 days`, body: <>If the bank charges 8% on the OD, 45 days cost {inr(fdOd.totalInterest)} ({inr(fdOd.dailyInterest)} a day), and the FD keeps earning its own interest.</> },
                    { title: `Salary overdraft, ${inr(50000)} for 20 days at 15%`, body: <>Interest comes to {inr(salOd.totalInterest)}. Clearing it when the salary is credited stops the meter.</> },
                    { title: `What a ${FEE}% processing fee does to the cost`, body: <>On the {amt(LIMIT)} limit, {amt(DRAWN)} drawn for {DAYS} days, the app’s first-year effective cost works out to {pct(eff)} a year instead of {RATE}%, because the fee is worked out on the whole limit, not just the part you use.</> },
                    { title: 'Drawing beyond the limit', body: <>Banks may not raise your interest rate as a penalty. A breach can attract a separate penal charge, which must be reasonable and carries no further interest.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Interest is charged on all advances at monthly rests.', source: RBI_ADV },
                { text: 'Penalties for breaking loan terms are penal charges, not penal interest added to the rate; they must be reasonable, levied only on the amount in default, and never capitalised (no interest on them). In force for new loans from 1 April 2024 and for all loans from 30 June 2024; credit cards are excluded.', source: RBI_RBC },
                { text: 'No pre-payment or closure charge on floating-rate loans to individuals (for business or other purposes) or floating-rate business loans to micro and small enterprises, sanctioned or renewed from 1 January 2026. Where a charge is allowed on a cash credit or overdraft, it is on an amount not exceeding the sanctioned limit and must be disclosed upfront.', source: RBI_RBC },
            ]} />
        </>
    );
}

export const overdraftInterest: FeatureDef = {
    slug: 'overdraft-interest',
    title: 'OD Interest Calculator: Overdraft Interest per Day',
    description: 'Work out interest on a bank overdraft from the amount drawn and the days, with a changing-balance example, OD vs loan, and RBI rules on monthly rests.',
    h1: 'OD interest calculator: interest on an overdraft, day by day',
    crumb: 'Overdraft interest',
    category: 'loans',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Overdraft Interest',
    eyebrow: 'Loans · overdraft and cash credit',
    answer: (
        <>
            <p>Drawing {amt(DRAWN)} from a {amt(LIMIT)} overdraft at {RATE}% a year for {DAYS} days costs {inr(main.totalInterest)} of interest — about {inr(main.dailyInterest)} a day — and nothing on the {amt(LIMIT - DRAWN)} you leave undrawn.</p>
            <p>Interest = amount drawn × rate ÷ 365 × days, worked out for each stretch the balance stays the same; RBI requires banks to charge interest on advances at monthly rests.</p>
        </>
    ),
    sources: [RBI_ADV, RBI_RBC],
    calc: { key: 'overdraft-interest', props: { limit: LIMIT, drawn: DRAWN, rate: RATE, days: DAYS } },
    Body,
    faqs: [
        { q: 'How is interest calculated on an OD account?', a: `On the amount drawn, for the days it stays drawn: balance × yearly rate ÷ 365 × days. ${amt(DRAWN)} at ${RATE}% for ${DAYS} days is ${inr(main.totalInterest)}. When the balance changes, each stretch is worked out separately and added up.` },
        { q: 'What is the OD interest calculation formula?', a: 'Interest = amount drawn × annual rate × days ÷ (365 × 100). For a month with several balances, apply it to each stretch of days and add the results; the bank debits the total at the monthly rest.' },
        { q: 'Is OD interest charged on the full limit?', a: `Not in this calculation: interest runs only on what you draw. A ${amt(LIMIT)} limit with ${amt(DRAWN)} drawn for ${DAYS} days costs ${inr(main.totalInterest)}, half of the ${inr(whole.totalInterest)} a fully drawn limit would. Fees such as a processing fee may still be charged on the limit.` },
        { q: 'When is interest debited to an overdraft account?', a: 'Monthly. RBI requires interest on all advances to be charged at monthly rests, so each month’s interest is debited to the account and, if not paid, is added to the balance.' },
        { q: 'Is an overdraft cheaper than a personal loan?', a: `For short gaps, usually yes, because you pay interest only for the days you use the money. Kept fully drawn for a year, ${amt(DRAWN)} at ${RATE}% costs ${inr(yearOd.totalInterest)} on an OD against ${inr(yearPl.totalInterest)} on a 12-EMI loan at the same rate.` },
        { q: 'What happens if I draw more than my OD limit?', a: 'A breach of the sanctioned terms can bring a penal charge. RBI does not allow it to add penal interest to your rate, and no interest can be charged on the penal charge itself.' },
    ],
    related: [
        { href: '/personal-loan', label: 'Personal loan EMI calculator', note: 'The fixed-EMI alternative' },
        { href: '/simple-interest', label: 'Simple interest calculator', note: 'Interest on a principal that does not change' },
        { href: '/loan-foreclosure', label: 'Loan foreclosure calculator', note: 'Closing a term loan early' },
        { href: '/fd', label: 'FD calculator', note: 'What the deposit behind an OD earns' },
    ],
    disclaimer: { text: 'Overdraft figures use the daily formula of the FinCalix app on a balance you enter, for each stretch of days. Your bank’s sanction letter and account statement decide the rate, how interest is applied, and any processing, renewal or penal charges. FinCalix is not a bank or lender.' },
};
