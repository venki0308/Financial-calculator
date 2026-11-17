/**
 * /lrs-tcs — primary query "tcs on foreign remittance" (SEO_PLAN.md §5c). §8 contested rule resolved
 * from the official text: section 394(1) Table Sl. 7 and 8 of the Income-tax Act, 2025, as amended by
 * section 85 of the Finance Act, 2026 (from 1 April 2026); section 394(4); RBI LRS limit.
 * Every figure: the app's computeLrsTcs (src/utils/calculations.ts). Facts: seo/research/verified-facts-tax.md.
 */
import { LRS_TCS_THRESHOLD, computeLrsTcs } from '../../../utils/calculations';
import type { LrsPurpose } from '../../../utils/calculations';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025 (section 394)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const FA26 = { label: 'Finance Act, 2026 (section 85)', url: 'https://egazette.gov.in/WriteReadData/2026/271439.pdf' };
const MEMO = { label: 'Memorandum to the Finance Bill 2026', url: 'https://www.indiabudget.gov.in/doc/memo.pdf' };
const RBI = { label: 'RBI: LRS FAQ', url: 'https://www.rbi.org.in/commonman/english/Scripts/FAQs.aspx?Id=1834' };
const RULES = { label: 'Income-tax Rules, 2026', url: 'https://www.incometax.gov.in/iec/foportal/sites/default/files/2026-03/En-Notified-IT-Rules-2026-20-03-2026.pdf' };

const fees = computeLrsTcs('eduMedical', 1500000, 0);
const invest = computeLrsTcs('other', 1500000, 0);
const loanFees = computeLrsTcs('eduLoan', 2000000, 0);

// Scenarios.
const second = computeLrsTcs('eduMedical', 700000, 600000);
const stocks = computeLrsTcs('other', 1200000, 400000);
const tour = computeLrsTcs('tour', 300000, 0);
const under = computeLrsTcs('other', 900000, 0);

const AMOUNTS = [500000, 800000, 1000000, 1200000, 1500000, 2000000, 2500000, 5000000];
const tcsOf = (p: LrsPurpose, a: number) => computeLrsTcs(p, a, 0).tcs;

function Body() {
    return (
        <>
            <Section title="TCS rates on money sent abroad, from 1 April 2026">
                <DataTable
                    caption="Section 394(1), Table Sl. 7 and 8, as amended by the Finance Act, 2026"
                    head={['What the money is for', 'TCS-free amount', 'Rate on the rest', 'Rate before 1 April 2026']}
                    rows={[
                        ['Education, paid out of an education loan from a bank or notified institution', 'All of it', 'Nil', '—'],
                        ['Education or medical treatment, from your own money', `First ${amt(LRS_TCS_THRESHOLD)} in the year`, `${fees.rate}%`, '5%'],
                        ['Anything else under LRS: investment, gifts, family maintenance, personal travel', `First ${amt(LRS_TCS_THRESHOLD)} in the year`, `${invest.rate}%`, '20%'],
                        ['Overseas tour package bought from a seller in India', 'None', `${tour.rate}% from the first rupee`, '5% up to ₹10 lakh, 20% above'],
                    ]}
                    note="The bank (authorised dealer) collects TCS on LRS remittances; for a tour package the seller collects it, and the bank does not collect again on that amount."
                />
            </Section>

            <Section title="Worked example: university fees of ₹15 lakh">
                <p>
                    You send {amt(1500000)} for your child’s tuition from savings, your first remittance this tax year.
                </p>
                <DataTable
                    caption="TCS on an education remittance from your own money"
                    head={['Step', 'Amount']}
                    rows={[
                        ['Remittance', inr(1500000)],
                        ['Threshold for the year', `− ${inr(LRS_TCS_THRESHOLD)}`],
                        ['Amount TCS applies to', inr(fees.taxableAmount)],
                        [`TCS at ${fees.rate}%`, inr(fees.tcs)],
                        ['Total the bank debits', inr(fees.totalOutflow)],
                    ]}
                    note={`The same ${amt(1500000)} sent as an investment would carry ${inr(invest.tcs)} of TCS at ${invest.rate}%. Paid from an education loan, it would carry none. Computed with the FinCalix app's LRS code.`}
                />
            </Section>

            <Section title="TCS by amount and purpose">
                <DataTable
                    caption="First remittance of the tax year, no earlier LRS transfers"
                    head={['Amount sent', 'Education or medical (own money)', 'Investment, gift, other', 'Tour package']}
                    rows={AMOUNTS.map((a) => [amt(a), tcsOf('eduMedical', a) === 0 ? 'Nil' : inr(tcsOf('eduMedical', a)), tcsOf('other', a) === 0 ? 'Nil' : inr(tcsOf('other', a)), inr(tcsOf('tour', a))])}
                    note={`Education paid from an education loan: nil at every amount. The ${amt(LRS_TCS_THRESHOLD)} counts the amount or aggregate of amounts you send in the tax year.`}
                />
            </Section>

            <Section title="Four remittances, worked out">
                <Scenarios items={[
                    {
                        title: 'Fees in two instalments',
                        body: <>{amt(600000)} for the first semester in July uses up part of the threshold. In January you send {amt(700000)} more: only {inr(second.taxableAmount)} is above {amt(LRS_TCS_THRESHOLD)} for the year, so TCS is {inr(second.tcs)} at {second.rate}%.</>,
                    },
                    {
                        title: 'Buying US shares after a gift abroad',
                        body: <>A {amt(400000)} gift to a sibling earlier in the year, then {amt(1200000)} to a foreign brokerage: {inr(stocks.taxableAmount)} of the second transfer crosses the threshold and is charged {stocks.rate}%, so {inr(stocks.tcs)} is collected.</>,
                    },
                    {
                        title: `A ${amt(300000)} holiday package`,
                        body: <>Tour packages have no threshold any more: the operator collects {tour.rate}% on the whole price, {inr(tour.tcs)}, and you pay {inr(tour.totalOutflow)}.</>,
                    },
                    {
                        title: 'Staying under the limit',
                        body: <>{amt(900000)} sent for any purpose as your only remittance of the year carries {under.tcs === 0 ? 'no TCS' : inr(under.tcs)}, and leaves {inr(under.thresholdLeft)} of the threshold for later in the year.</>,
                    },
                ]} />
            </Section>

            <Section title="Getting the TCS back">
                <ol className="steps">
                    <li>TCS is not a separate charge: the Act treats tax collected from you as tax paid on your behalf (section 390(5)).</li>
                    <li>The bank or tour operator gives you a TCS certificate in Form No. 133, and the amount appears in your Annual Information Statement (Form No. 168) on the e-filing portal.</li>
                    <li>If you are salaried, you can give your employer the TCS details in Form No. 122 so that less tax is deducted from your salary in the same year (section 392(4), rule 204).</li>
                    <li>Otherwise claim it in your income tax return: it reduces the tax you owe, and anything above your tax for the year is refunded.</li>
                </ol>
            </Section>

            <Section title="How much you can send under LRS">
                <p>
                    The RBI’s Liberalised Remittance Scheme lets a resident individual, including a minor, send up to USD 2,50,000
                    in each financial year (April to March) for permitted purposes, and a PAN is required for every LRS transaction.
                    The TCS threshold and the LRS limit are separate: the ₹10 lakh decides when TCS starts, the dollar limit decides
                    how much you may send at all.
                </p>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'TCS on LRS remittances above ₹10 lakh (amount or aggregate): education or medical treatment 2% (was 5%), other purposes 20%; overseas tour packages 2% on any amount (was 5% / 20%).', source: FA26 },
                { text: 'No TCS on a remittance that is a loan from a financial institution for education, or on an amount on which the tour seller has already collected TCS: section 394(4). TCS counts as tax paid on your behalf: section 390(5).', source: ACT },
                { text: 'The rate cuts and the removal of the tour-package threshold take effect from 1 April 2026.', source: MEMO },
                { text: 'TCS certificate Form No. 133 (rule 215); TCS details to the employer in Form No. 122 (rule 204); Annual Information Statement Form No. 168 (rule 245).', source: RULES },
                { text: 'LRS limit USD 2,50,000 per financial year per resident individual; PAN mandatory.', source: RBI },
            ]} />
        </>
    );
}

export const lrsTcsPage: FeatureDef = {
    slug: 'lrs-tcs',
    title: 'TCS on Foreign Remittance FY 2026-27: LRS TCS Calculator',
    description: 'TCS on foreign remittance from 1 April 2026: 2% above ₹10 lakh for education or medical, 20% for other LRS, 2% on tour packages, nil on education loans.',
    h1: 'TCS on foreign remittance in 2026-27: what your bank will collect',
    crumb: 'TCS on remittance',
    category: 'tax',
    updated: '2026-11-17',
    analyticsTitle: 'Website - LRS TCS',
    eyebrow: 'Income tax · LRS remittances · tax year 2026-27',
    answer: (
        <>
            <p>Sending {amt(1500000)} abroad for education from your own money in FY 2026-27 attracts TCS of {inr(fees.tcs)}: nothing on the first {amt(LRS_TCS_THRESHOLD)} and {fees.rate}% on the {inr(fees.taxableAmount)} above it, under section 394 of the Income-tax Act, 2025 as amended from 1 April 2026.</p>
            <p>For investments or gifts the rate above {amt(LRS_TCS_THRESHOLD)} is {invest.rate}% ({inr(invest.tcs)} on the same amount); money from an education loan carries no TCS.</p>
        </>
    ),
    sources: [FA26, ACT, MEMO, RBI],
    calc: { key: 'lrs-tcs', props: { purpose: 'eduMedical', amount: 1500000, already: 0 } },
    Body,
    faqs: [
        {
            q: 'What is the TCS rate on foreign remittance for education in FY 2026-27?',
            a: `2% on the amount above ${amt(LRS_TCS_THRESHOLD)} in the year when you pay from your own money, down from 5% before 1 April 2026. A ${amt(1500000)} fee payment carries ${inr(fees.tcs)}. If the money is an education loan from a bank or notified financial institution, there is no TCS.`,
        },
        {
            q: 'Is TCS charged when fees are paid from an education loan?',
            a: `No. Section 394(4)(b) says the bank shall not collect TCS on a remittance that is a loan from a financial institution for education, so ${amt(2000000)} of loan money sent abroad carries ${loanFees.tcs === 0 ? 'nil' : inr(loanFees.tcs)} TCS.`,
        },
        {
            q: 'What is the LRS limit for 2026-27?',
            a: 'USD 2,50,000 per resident individual per financial year (April to March), under the RBI’s Liberalised Remittance Scheme. A PAN is mandatory for LRS transactions.',
        },
        {
            q: 'Is TCS refundable?',
            a: 'Yes, in effect. TCS is treated as tax paid on your behalf, so it is set off against your income tax for the year when you file your return, and any amount above your tax is refunded. Salaried people can also ask their employer to count it and deduct less tax from salary.',
        },
        {
            q: 'How is the ₹10 lakh TCS threshold counted?',
            a: `Over the whole tax year: the Act applies TCS to an amount or aggregate of amounts above ${amt(LRS_TCS_THRESHOLD)}. If you sent ${amt(600000)} in July and ${amt(700000)} in January for fees, TCS applies only to the ${inr(second.taxableAmount)} that crosses the threshold.`,
        },
        {
            q: 'How much TCS is there on an overseas tour package?',
            a: `2% of the whole price from 1 April 2026, with no threshold, collected by the seller in India. A ${amt(300000)} package costs ${inr(tour.tcs)} in TCS. Earlier the rate was 5% up to ₹10 lakh and 20% above.`,
        },
    ],
    related: [
        { href: '/tax-refund', label: 'Income tax refund calculator', note: 'Claim TCS and excess TDS back in your return' },
        { href: '/education-loan', label: 'Education loan EMI calculator', note: 'EMI on a loan for studies abroad' },
        { href: '/income-tax', label: 'Income tax calculator FY 2026-27', note: 'The tax your TCS is set off against' },
        { href: '/income-tax-due-dates', label: 'Income tax due dates', note: 'When to file the return that claims TCS' },
        { href: '/goal-planner', label: 'Goal planner', note: 'Plan savings for a child’s education abroad' },
    ],
    disclaimer: { text: 'TCS figures are estimates using section 394 of the Income-tax Act, 2025 as amended by the Finance Act, 2026, for remittances from 1 April 2026. Your bank or tour operator collects the tax and records the purpose; the RBI’s LRS rules decide what you may send. TCS is set off against your income tax for the year. FinCalix is not a bank or a tax advisor; consult a Chartered Accountant for your return.' },
};
