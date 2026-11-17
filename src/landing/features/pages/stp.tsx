/**
 * /stp — primary query "stp calculator mutual fund" (SEO_PLAN.md §5b).
 * Every figure: the app's calculateSTP (src/utils/stpCalculations.ts), run with no exit load and
 * no tax so the page needs no assumed slab. "SIP from savings" = the same function with the waiting
 * money at the Post Office savings rate (SMALL_SAVINGS.rates.savings). Tax: Income-tax Act, 2025
 * ss.72, 76 (seo/research/verified-facts-invest.md).
 */
import { calculateSTP } from '../../../utils/stpCalculations';
import type { STPInputs } from '../../../utils/stpCalculations';
import { SMALL_SAVINGS } from '../../../data/rateEnvironment';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025 (ss. 72, 76)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const DEA = { label: 'DEA small savings rates', url: 'http://www.dea.gov.in/budget-division/475' };
const SEBI = { label: 'SEBI investor site', url: 'https://investor.sebi.gov.in/' };

const A = 1200000, MONTHS = 12, SRC = 7, TGT = 12;
const SAVINGS = SMALL_SAVINGS.rates.savings;
const stp = (o: Partial<STPInputs> = {}) => calculateSTP({
    initialAmount: A, transferAmount: A / MONTHS, frequency: 'monthly', sourceRate: SRC, targetRate: TGT, durationMonths: MONTHS,
    stpType: 'fixed', exitLoadPercent: 0, exitLoadFreeMonths: 12, taxSlabPercent: 0, ...o,
});
const main = stp();
const fromSavings = stp({ sourceRate: SAVINGS });
const idle = stp({ sourceRate: 0 });

function Body() {
    const cap = stp({ stpType: 'capital', transferAmount: 0 });
    const quarterly = calculateSTP({ initialAmount: 2400000, transferAmount: 600000, frequency: 'quarterly', sourceRate: SRC, targetRate: TGT, durationMonths: 12, stpType: 'fixed', exitLoadPercent: 0, exitLoadFreeMonths: 12, taxSlabPercent: 0 });
    const small = calculateSTP({ initialAmount: 500000, transferAmount: 25000, frequency: 'monthly', sourceRate: SRC, targetRate: TGT, durationMonths: 20, stpType: 'fixed', exitLoadPercent: 0, exitLoadFreeMonths: 12, taxSlabPercent: 0 });
    return (
        <>
            <Section title="What an STP does">
                <p>
                    A systematic transfer plan moves a fixed sum, on a fixed date, from one mutual fund to another —
                    typically from a liquid or short-term debt fund where a large amount is parked, into an equity fund. The money waiting
                    in the first fund keeps earning, and the equity fund is bought in instalments instead of all on one day.
                </p>
            </Section>

            <Section title={`${amt(A)} moved over ${MONTHS} months, month by month`}>
                <DataTable
                    caption={`${inr(A / MONTHS)} a month from a fund earning ${SRC}% into one earning ${TGT}%`}
                    head={['Month', 'Source fund before transfer', 'Return that month', 'Moved', 'Left in source', 'Equity fund value']}
                    rows={main.schedule.map((s) => [String(s.month), inr(s.sourceOpening + s.sourceInterest), inr(s.sourceInterest), inr(s.transferAmount), inr(s.sourceClosing), inr(s.targetValueAccumulated)])}
                    note="The FinCalix app’s STP engine with steady returns, no exit load and before tax. The source fund’s return is added before each transfer."
                />
                <p>
                    All {MONTHS} transfers together move {inr(main.totalTransferred)}; the source fund earned {inr(main.totalSourceInterestEarned)}
                    {' '}while it waited, and that {inr(main.finalSourceBalance)} is still there at the end. The two funds are worth
                    {' '}{inr(main.totalPortfolioValue)} in all.
                </p>
            </Section>

            <Section title="STP vs lump sum vs SIP from a savings account">
                <DataTable
                    caption={`The same ${amt(A)}, value after ${MONTHS} months (equity fund at ${TGT}%)`}
                    head={['How the money goes in', 'Where the rest waits', 'Value after 12 months']}
                    rows={[
                        ['All into equity on day one', 'Nothing waits', inr(main.lumpsumDirectComparison)],
                        [`STP, ${inr(A / MONTHS)} a month`, `Liquid/debt fund at ${SRC}%`, inr(main.totalPortfolioValue)],
                        [`SIP, ${inr(A / MONTHS)} a month`, `Post Office savings account at ${SAVINGS}%`, inr(fromSavings.totalPortfolioValue)],
                        [`SIP, ${inr(A / MONTHS)} a month`, 'Cash earning nothing', inr(idle.totalPortfolioValue)],
                    ]}
                    note={`All four use the app’s STP maths; the savings-account rate is the Post Office rate for ${SMALL_SAVINGS.months}.`}
                />
                <p>
                    With returns that rise smoothly, investing on day one always wins, because every rupee is in equity for the full year.
                    That is the limit of any calculator: real equity prices rise and fall from month to month, and spreading purchases
                    means buying more units after a fall and fewer after a rise. An STP buys that protection for a lower expected value;
                    among the gradual routes it ends highest, because the waiting money earns more than in a savings account.
                </p>
            </Section>

            <Section title="Shorter or longer transfer periods">
                <DataTable
                    caption={`${amt(A)} spread evenly over different periods (source ${SRC}%, equity ${TGT}%)`}
                    head={['Spread over', 'Moved each month', 'STP value at the end', 'Day-one investment at the same date']}
                    rows={[6, 12, 18, 24].map((m) => { const x = stp({ durationMonths: m, transferAmount: A / m }); return [`${m} months`, inr(A / m), inr(x.totalPortfolioValue), inr(x.lumpsumDirectComparison)]; })}
                    note="Each row ends on a different date, so compare the two value columns within a row, not down the table."
                />
            </Section>

            <Section title="Three other ways to run an STP">
                <Scenarios items={[
                    { title: 'Move only the gains (capital-appreciation STP)', body: <>Transferring just the source fund’s monthly return from {amt(A)} at {SRC}% moves {inr(cap.totalTransferred)} over a year and leaves the {amt(A)} untouched; the equity fund ends at {inr(cap.finalTargetValue)}.</> },
                    { title: `${amt(2400000)} in four quarterly transfers`, body: <>{inr(600000)} a quarter ends at {inr(quarterly.totalPortfolioValue)} after a year, against {inr(quarterly.lumpsumDirectComparison)} invested at once.</> },
                    { title: `${amt(500000)} at ${inr(25000)} a month`, body: <>Twenty transfers move the whole sum; the source fund’s return leaves {inr(small.finalSourceBalance)} over at the end, and both funds total {inr(small.totalPortfolioValue)}.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Every transfer sells units of the source fund. The gain in those units (sale value minus cost) is a capital gain in the year of the transfer.', source: ACT },
                { text: 'If the source is a debt fund (more than 65% in debt and money-market instruments) and the units were bought on or after 1 April 2023, that gain counts as short-term however long you held them, and is taxed with your other income.', source: ACT },
                { text: `Post Office savings account rate ${SAVINGS}% for ${SMALL_SAVINGS.months}, used here for the savings-account comparison.`, source: DEA },
                { text: 'Fund returns are not guaranteed; the source and equity returns on this page are assumptions. Check the exit load in each fund’s scheme documents.', source: SEBI },
            ]} />
        </>
    );
}

export const stpPage: FeatureDef = {
    slug: 'stp',
    title: 'STP Calculator: Systematic Transfer Plan for Mutual Funds',
    description: 'Systematic transfer plan from a liquid fund into equity: monthly schedule, STP vs lump sum vs SIP with the same money, and how transfers are taxed.',
    h1: 'STP calculator: move a lump sum into equity in monthly steps',
    crumb: 'STP calculator',
    category: 'investments',
    updated: '2026-11-17',
    analyticsTitle: 'Website - STP',
    eyebrow: 'Mutual funds · systematic transfer plan',
    answer: (
        <>
            <p>Parking {amt(A)} in a liquid fund at an assumed {SRC}% and moving {inr(A / MONTHS)} a month into an equity fund at {TGT}% leaves you with {inr(main.totalPortfolioValue)} after {MONTHS} months, including {inr(main.totalSourceInterestEarned)} earned while the money waited.</p>
            <p>Investing all of it on day one would show {inr(main.lumpsumDirectComparison)} at the same steady return; an STP gives up some of that to avoid buying everything at one price. Each transfer is a sale of units for tax purposes.</p>
        </>
    ),
    sources: [ACT, SEBI],
    calc: { key: 'stp', props: { amount: A, months: MONTHS, sourceRate: SRC, targetRate: TGT } },
    Body,
    faqs: [
        { q: 'What is a systematic transfer plan?', a: 'A standing instruction to move a set amount from one mutual fund to another at regular intervals, for example from a liquid fund holding a lump sum into an equity fund.' },
        { q: 'What is the difference between STP and SIP?', a: `A SIP is paid from your bank account; an STP is paid from another mutual fund, so the waiting money earns a fund’s return. On ${amt(A)} over a year that is ${inr(main.totalPortfolioValue)} through an STP against ${inr(fromSavings.totalPortfolioValue)} through a SIP from a ${SAVINGS}% savings account, at the assumed returns.` },
        { q: 'Is STP better than investing a lump sum?', a: `Not on expected value: with steady returns, ${amt(A)} invested at once ends at ${inr(main.lumpsumDirectComparison)} against ${inr(main.totalPortfolioValue)} through a 12-month STP. An STP is about lowering the risk of buying everything just before a fall.` },
        { q: 'How long should an STP run?', a: 'There is no fixed rule; it is your choice when you set it up. The table above shows how the result changes with the period, and the app flags plans under 6 months as very short.' },
        { q: 'Is tax charged on every STP transfer?', a: 'Yes, on the gain inside each transfer, because each one sells units of the source fund. For debt-fund units bought from 1 April 2023 that gain is always short-term.' },
        { q: 'Systematic transfer plan kya hota hai?', a: `STP mein ek fund (jaise liquid fund) se har mahine tay rakam doosre fund (jaise equity fund) mein jaati hai. Jaise ${amt(A)} liquid fund mein rakh kar ${inr(A / MONTHS)} mahina equity mein bhejein to ${SRC}% aur ${TGT}% maan kar saal ke ant mein lagbhag ${inr(main.totalPortfolioValue)} bante hain.` },
    ],
    related: [
        { href: '/lumpsum', label: 'Lumpsum calculator', note: 'Invest the whole amount on day one' },
        { href: '/sip', label: 'SIP calculator', note: 'Monthly investing from your bank account' },
        { href: '/swp', label: 'SWP calculator', note: 'The reverse: regular withdrawals' },
        { href: '/portfolio-rebalancing', label: 'Portfolio rebalancing calculator', note: 'Bring your equity–debt mix back on target' },
    ],
    disclaimer: 'invest',
};
