/**
 * /income-tax-due-dates — primary query "income tax due dates 2026-27" (SEO_PLAN.md §5c).
 * The app's /notifications route 308s here. Dates: Income-tax Act, 2025 (as amended by the
 * Finance Act, 2026) and the Income-tax Rules, 2026 (seo/research/verified-facts-2026-11-17.md).
 * Reminders claim: src/services/NotificationScheduler.ts (advance-tax and ITR alerts).
 */
import { inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const FA26 = { label: 'Finance Act, 2026', url: 'https://egazette.gov.in/WriteReadData/2026/271439.pdf' };
const RULES = { label: 'Income-tax Rules, 2026', url: 'https://www.incometax.gov.in/iec/foportal/sites/default/files/2026-03/En-Notified-IT-Rules-2026-20-03-2026.pdf' };
const PORTAL = { label: 'Income Tax e-filing portal', url: 'https://www.incometax.gov.in/iec/foportal/' };

/** Advance tax instalments (s.408): cumulative share of the year's tax due by each date. */
const INSTALMENTS = [
    { date: '15 June 2026', share: 15 },
    { date: '15 September 2026', share: 45 },
    { date: '15 December 2026', share: 75 },
    { date: '15 March 2027', share: 100 },
];
const EX_TAX = 100000;

function Body() {
    let prev = 0;
    const steps = INSTALMENTS.map((i) => { const cum = (EX_TAX * i.share) / 100; const pay = cum - prev; prev = cum; return { ...i, cum, pay }; });
    return (
        <>
            <Section title="Tax calendar for tax year 2026-27 (FY 2026-27)">
                <DataTable
                    caption="Income-tax due dates for income earned from 1 April 2026 to 31 March 2027"
                    head={['Due date', 'What is due', 'Who it applies to']}
                    rows={[
                        ['15 June 2026', 'Advance tax, 1st instalment (15% of the year’s tax)', 'Most taxpayers whose tax isn’t covered by TDS'],
                        ['15 September 2026', 'Advance tax, 2nd instalment (45% in total)', 'Same'],
                        ['15 December 2026', 'Advance tax, 3rd instalment (75% in total)', 'Same'],
                        ['15 March 2027', 'Advance tax, last instalment (100%)', 'Same; presumptive-income taxpayers pay all of it by this date'],
                        ['7th of every month', 'TDS deducted in the previous month to be deposited (March’s TDS by 30 April 2027)', 'Employers and other deductors'],
                        ['31 Jul, 31 Oct 2026, 31 Jan, 31 May 2027', 'Quarterly TDS statements', 'Employers and other deductors'],
                        ['15 June 2027', 'Salary TDS certificate (Form No. 130, which replaces Form 16)', 'Employers, to employees'],
                        ['31 July 2027', 'Income-tax return', 'Salaried people and others without a business'],
                        ['31 August 2027', 'Income-tax return', 'Business or profession, accounts not audited'],
                        ['31 October 2027', 'Income-tax return', 'Accounts audited'],
                        ['30 November 2027', 'Income-tax return', 'Transfer-pricing cases'],
                        ['31 December 2027', 'Belated return (late fee applies)', 'Anyone who missed their due date'],
                        ['31 March 2028', 'Last date to revise a return', 'Anyone who filed and needs to correct it'],
                    ]}
                    note="If a due date is extended, the tax department announces it on the e-filing portal."
                />
            </Section>

            <Section title="Advance tax: how much by each date">
                <p>
                    Advance tax is income tax paid during the year instead of after it. Salaried people whose tax is fully deducted from
                    salary usually don’t need to pay it; if you also have interest, rent, capital gains or freelance income, check whether
                    tax is still due on it.
                </p>
                <DataTable
                    caption={`Advance tax instalments if the year’s tax (after TDS) is ${inr(EX_TAX)}`}
                    head={['Pay by', 'Total paid by then', 'This instalment']}
                    rows={steps.map((s) => [s.date, `${inr(s.cum)} (${s.share}%)`, inr(s.pay)])}
                />
            </Section>

            <Section title="What a missed date costs">
                <ol className="steps">
                    <li>Short advance tax: interest on the shortfall at 1% a month — in effect 3% of the shortfall for each of the first three instalments and 1% for the March one — and further interest of 1% a month from 1 April if too little advance tax was paid for the year.</li>
                    <li>Late return: a late fee of {inr(1000)} if your total income is up to {inr(500000)}, otherwise {inr(5000)}, plus interest of 1% a month on any unpaid tax.</li>
                    <li>A return not filed by the due date can still be filed up to 31 December 2027 as a belated return.</li>
                    <li>Revised return: allowed up to 31 March 2028. Revising after 31 December 2027 costs a fee of {inr(1000)} (income up to {inr(500000)}) or {inr(5000)}.</li>
                </ol>
            </Section>

            <Section title="Examples">
                <Scenarios items={[
                    { title: 'Salaried, only salary income', body: <>Your employer deducts tax every month and gives you Form No. 130 by 15 June 2027. File your return by 31 July 2027.</> },
                    { title: 'Salary plus FD interest', body: <>If the TDS on the interest doesn’t cover the tax on it, pay the balance as advance tax by the dates above, or as self-assessment tax before filing (with interest for the delay).</> },
                    { title: `Freelancer with ${inr(EX_TAX)} of tax for the year`, body: <>Pay {inr(steps[0].pay)} by 15 June 2026, {inr(steps[1].pay)} by 15 September, {inr(steps[2].pay)} by 15 December and {inr(steps[3].pay)} by 15 March 2027. If you use presumptive taxation, the whole amount can be paid by 15 March.</> },
                ]} />
                <p>The FinCalix app on Android can remind you before each advance-tax instalment and the return due dates.</p>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'From 1 April 2026 the Income-tax Act, 2025 applies and the year is called tax year 2026-27; there is no assessment year 2027-28.', source: ACT },
                { text: 'Return due dates: 31 July for people without a business; 31 August for a business or profession whose accounts need no audit; 31 October for audit cases; 30 November for transfer-pricing cases. Belated returns within 9 months of the year end; revised returns within 12 months.', source: FA26 },
                { text: 'Advance tax: 15%, 45%, 75% and 100% of the year’s tax by 15 June, 15 September, 15 December and 15 March; presumptive taxpayers pay 100% by 15 March.', source: ACT },
                { text: 'TDS is deposited by the 7th of the next month (March by 30 April); TDS statements by 31 July, 31 October, 31 January and 31 May; the salary TDS certificate (Form No. 130) by 15 June.', source: RULES },
                { text: 'Late fee for a late return: ₹1,000 if total income is up to ₹5 lakh, otherwise ₹5,000. Interest of 1% a month for a late return and short advance tax.', source: ACT },
                { text: 'Returns are filed on the Income Tax e-filing portal.', source: PORTAL },
            ]} />
        </>
    );
}

export const incomeTaxDueDates: FeatureDef = {
    slug: 'income-tax-due-dates',
    title: 'Income Tax Due Dates 2026-27: ITR, Advance Tax, TDS',
    description: 'Every income-tax due date for tax year 2026-27: advance tax instalments, ITR deadlines, belated and revised returns, TDS, Form No. 130 and late fees.',
    h1: 'Income tax due dates for FY 2026-27 (tax year 2026-27)',
    crumb: 'Income tax due dates',
    category: 'tax',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Income Tax Due Dates',
    eyebrow: 'Income tax · calendar',
    answer: (
        <>
            <p>For FY 2026-27 (tax year 2026-27), the income-tax return is due by 31 July 2027 for salaried people, 31 August 2027 for a business without an audit and 31 October 2027 for audit cases. A belated return can be filed until 31 December 2027.</p>
            <p>Advance tax is due in four instalments: 15% by 15 June 2026, 45% by 15 September, 75% by 15 December 2026 and 100% by 15 March 2027.</p>
        </>
    ),
    sources: [ACT, FA26, RULES],
    Body,
    faqs: [
        { q: 'What is the last date to file ITR for FY 2026-27?', a: '31 July 2027 for salaried people and others without a business; 31 August 2027 if you have a business or profession that doesn’t need an audit; 31 October 2027 if your accounts are audited.' },
        { q: 'When is the next advance tax instalment due?', a: '15 December 2026, by which 75% of the year’s tax should be paid. The last instalment, 100%, is due on 15 March 2027.' },
        { q: 'What happens if I miss the ITR due date?', a: `You can file a belated return until 31 December 2027 with a late fee of ${inr(1000)} if your income is up to ${inr(500000)}, or ${inr(5000)} otherwise, plus 1% a month interest on any unpaid tax.` },
        { q: 'Until when can I revise my return?', a: 'Until 31 March 2028, twelve months after the end of the tax year. A revision after 31 December 2027 carries a fee.' },
        { q: 'When will I get Form 16 for FY 2026-27?', a: 'The salary TDS certificate is now Form No. 130 under the Income-tax Rules, 2026. Employers must issue it by 15 June 2027.' },
        { q: 'ITR filing last date 2027 kya hai?', a: 'Salaried logon ke liye 31 July 2027; bina audit wale business ya profession ke liye 31 August 2027; audit wale cases ke liye 31 October 2027. Chhoot jaaye to late fee ke saath 31 December 2027 tak belated return bhar sakte hain.' },
    ],
    related: [
        { href: '/income-tax', label: 'Income tax calculator', note: 'Tax on your salary for 2026-27' },
        { href: '/old-vs-new-tax-regime', label: 'Old vs new tax regime', note: 'Pick the regime before you file' },
        { href: '/capital-gains', label: 'Capital gains tax calculator', note: 'Tax on gains that may need advance tax' },
    ],
    disclaimer: 'tax',
};
