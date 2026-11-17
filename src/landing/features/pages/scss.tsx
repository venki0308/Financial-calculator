/**
 * /scss — primary query "senior citizen savings scheme calculator" (SEO_PLAN.md §5d). Replaces the
 * hand-written guide and absorbs /schemes/c-scss (308 → here): eligibility, how to open and documents
 * are taken from the SCSS 2019 text and its 2023 amendments, not the app's record (see the report).
 * Figures: SCSS screen formula (SCSSCalculator.tsx → math-deposits.scssIncome), features/math.poTd for
 * the comparison. TDS: s.393 Income-tax Act 2025 + Finance Act 2026. Facts: verified-facts-deposits.md.
 */
import { SMALL_SAVINGS } from '../../../data/rateEnvironment';
import { SCSS_MAX, scssIncome } from '../math-deposits';
import { poTd } from '../math';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const SCHEME = { label: 'Senior Citizens\' Savings Scheme, 2019 (India Post)', url: 'https://www.indiapost.gov.in/documents/offerings/schemesandservices/posb/SeniorCitizensSavingsScheme2019English.pdf' };
const LIMIT = { label: 'India Post order: SCSS limit raised to ₹30 lakh (2023)', url: 'https://www.indiapost.gov.in/documents/posb/SB6_2023ECE_7731_SB.pdf' };
const NSI = { label: 'National Savings Institute: SCSS', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=62' };
const AMEND = { label: 'SCSS (Fourth Amendment) Scheme, 2023 — G.S.R. 829(E)', url: 'https://www.indiapost.gov.in/documents/posb/SB22_2023ECE_9187.pdf' };
const RATES = { label: 'NSI interest rate table', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=132' };
const DEA = { label: 'DEA small savings rate notices', url: 'http://www.dea.gov.in/budget-division/475' };
const S393 = { label: 'Income-tax Act, 2025: section 393 (TDS)', url: 'https://www.incometaxindia.gov.in/w/section-393-6' };
const SCH15 = { label: 'Income-tax Act, 2025: Schedule XV', url: 'https://www.incometaxindia.gov.in/w/schedule-xv-3' };

const RATE = SMALL_SAVINGS.rates.scss;          // 8.2
const top = scssIncome(SCSS_MAX, RATE, 5);
const half = scssIncome(1500000, RATE, 5);

function Body() {
    const amounts = [500000, 1000000, 1500000, 2000000, 2500000, 3000000];
    const td = poTd(1500000, SMALL_SAVINGS.rates.td5y, 5);
    const twelve = scssIncome(1200000, RATE, 5);
    const ext = scssIncome(SCSS_MAX, RATE, 8);
    const old = scssIncome(1500000, 7.4, 5);
    return (
        <>
            <Section title="Quarterly interest from ₹5 lakh to ₹30 lakh">
                <DataTable
                    caption={`SCSS at ${RATE}% a year, paid every quarter`}
                    head={['Deposit', 'Every quarter', 'Every year', 'Over 5 years', 'TDS a year at 10%']}
                    rows={amounts.map((a) => {
                        const r = scssIncome(a, RATE, 5);
                        return [amt(a), inr(r.quarterlyIncome), inr(r.annualInterest), inr(r.totalInterest), r.annualInterest > 100000 ? inr(r.annualInterest * 0.1) : 'None'];
                    })}
                    note="TDS applies when the post office's interest to you in a tax year exceeds ₹1 lakh; a nil-tax declaration stops it. The deposit is returned in full at maturity."
                />
            </Section>

            <Section title="How the quarterly interest is worked out">
                <ol className="steps">
                    <li>Yearly interest = deposit × {RATE}%: {inr(SCSS_MAX)} earns {inr(top.annualInterest)}.</li>
                    <li>It is paid in four parts, on the first working day of April, July, October and January: {inr(top.quarterlyIncome)} each time.</li>
                    <li>The first payment covers only the days from your deposit to the end of that quarter, worked out as days held ÷ days in the quarter × the quarter's interest.</li>
                    <li>Interest is paid out, not added to the deposit, so it does not compound — over 5 years you receive {inr(top.totalInterest)}.</li>
                </ol>
            </Section>

            <Section title="Who can open SCSS, and how">
                <div className="cols">
                    <div>
                        <h3>Eligibility</h3>
                        <ul>
                            <li>Anyone aged 60 or more on the day the account is opened</li>
                            <li>Aged 55 to 60 and retired (superannuation or otherwise), if the account is opened within three months of receiving the retirement benefits; the deposit cannot exceed those benefits</li>
                            <li>Retired defence personnel (not civilian defence staff) from age 50, on the same conditions</li>
                            <li>The spouse of a government employee who died in harness at 50 or older</li>
                            <li>Single account, or joint with your spouse only; the first holder's age decides eligibility</li>
                        </ul>
                    </div>
                    <div>
                        <h3>Documents and opening</h3>
                        <ul>
                            <li>Account opening form (Form-1) with a photograph, Aadhaar number and PAN</li>
                            <li>For 55–60 retirees: proof of the date the retirement benefits were paid, and the employer's certificate of retirement, benefits and service</li>
                            <li>The deposit by cash or cheque, ₹1,000 or multiples of ₹1,000 — one deposit per account</li>
                            <li>Open it at a post office or an authorised bank branch; you can ask for the quarterly interest to go to your savings account</li>
                        </ul>
                    </div>
                </div>
            </Section>

            <Section title="Closing early or extending">
                <DataTable
                    caption={`What happens to a ${amt(SCSS_MAX)} deposit`}
                    head={['When you close it', 'Rule', 'Cost on this deposit']}
                    rows={[
                        ['Within the first year', 'Interest already paid is taken back', 'All interest received so far'],
                        ['After 1 year, before 2', '1.5% of the deposit deducted', inr(top.penaltyAfter1Yr)],
                        ['After 2 years, before 5', '1% of the deposit deducted', inr(top.penaltyAfter2Yrs)],
                        ['Within a year of an extension', '1% of the deposit deducted', inr(top.penaltyAfter2Yrs)],
                        ['More than a year into an extension', 'No deduction', '—'],
                    ]}
                    note="After 5 years you can extend in blocks of 3 years by applying within a year of maturity (or of each block's end). The extended account earns the rate in force on the maturity date."
                />
            </Section>

            <Section title="SCSS interest rate history">
                <DataTable
                    caption="Senior Citizens' Savings Scheme rate"
                    head={['Opened in', 'Rate a year', 'Quarterly on ₹15 lakh']}
                    rows={([
                        ['Apr – Sep 2016', 8.6], ['Oct 2016 – Mar 2017', 8.5], ['Apr – Jun 2017', 8.4], ['Jul 2017 – Sep 2018', 8.3],
                        ['Oct 2018 – Jun 2019', 8.7], ['Jul 2019 – Mar 2020', 8.6], ['Apr 2020 – Sep 2022', 7.4], ['Oct – Dec 2022', 7.6],
                        ['Jan – Mar 2023', 8.0], ['Apr 2023 – Dec 2026', RATE],
                    ] as Array<[string, number]>).map(([p, r]) => [p, `${r}%`, inr(scssIncome(1500000, r, 5).quarterlyIncome)])}
                    note="Each account keeps the rate of the quarter it was opened in. The maximum was ₹15 lakh until 31 March 2023."
                />
            </Section>

            <Section title={`SCSS or a 5-year Post Office TD for ${amt(1500000)}`}>
                <DataTable
                    caption={`${amt(1500000)} at ${SMALL_SAVINGS.months} rates`}
                    head={['', 'SCSS', '5-year Time Deposit']}
                    rows={[
                        ['Rate', `${RATE}%`, `${SMALL_SAVINGS.rates.td5y}%`],
                        ['Interest paid', `${inr(half.quarterlyIncome)} every quarter`, `${inr(td.yearlyInterest)} once a year`],
                        ['Interest over 5 years', inr(half.totalInterest), inr(td.interest)],
                        ['Who can open', '60+ (some retirees from 55 or 50)', 'Anyone'],
                        ['Section 123 (old regime)', 'Deposit counts', 'Deposit counts'],
                    ]}
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: 'A retired couple with two accounts', body: <>Each spouse who is eligible can hold up to {amt(SCSS_MAX)}. Two full accounts pay {inr(top.quarterlyIncome * 2)} a quarter between them.</> },
                    { title: `Retiring at 58 with ${amt(1200000)} of benefits`, body: <>Opening within three months of receiving the money, the whole {amt(1200000)} can go in and pays {inr(twelve.quarterlyIncome)} a quarter. The deposit cannot exceed the retirement benefits received.</> },
                    { title: 'Extending for 3 more years', body: <>Extending a {amt(SCSS_MAX)} account at today's rate keeps {inr(top.quarterlyIncome)} coming for 3 more years: {amt(ext.totalInterest)} over 8 years in all.</> },
                    { title: 'Opened in 2021 versus now', body: <>{amt(1500000)} opened at 7.4% in 2021 pays {inr(old.quarterlyIncome)} a quarter; opened today at {RATE}%, {inr(half.quarterlyIncome)}.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: `Interest for accounts opened in October–December 2026: ${RATE}% a year, paid quarterly; unchanged since 1 April 2023.`, source: DEA },
                { text: 'Maximum ₹30 lakh across all your SCSS accounts (raised from ₹15 lakh in 2023); minimum ₹1,000 in multiples of ₹1,000.', source: LIMIT },
                { text: 'Open at 60, or at 55–60 after retirement within three months of receiving the benefits (defence retirees from 50); extend in 3-year blocks; 1% deducted if closed within a year of an extension.', source: AMEND },
                { text: 'Premature closure: interest paid is recovered within the first year, 1.5% of the deposit is deducted in the second year and 1% after that. Unclaimed quarterly interest earns nothing more.', source: SCHEME },
                { text: 'Interest is paid on the first working day of April, July, October and January; the account can be closed after 5 years.', source: NSI },
                { text: 'The deposit counts towards the ₹1.5 lakh section 123 deduction (old regime only); money withdrawn before 5 years is taxed in the year of withdrawal.', source: SCH15 },
                { text: 'TDS applies when interest from the post office or bank exceeds ₹1 lakh in a tax year for a senior citizen, at the 10% rate in force.', source: S393 },
                { text: 'Rate history from the National Savings Institute.', source: RATES },
            ]} />
        </>
    );
}

export const scss: FeatureDef = {
    slug: 'scss',
    title: `Senior Citizen Savings Scheme Calculator: ${RATE}% SCSS`,
    description: `SCSS quarterly interest at ${RATE}% for ₹5–30 lakh, TDS above ₹1 lakh, eligibility (60+, retirees from 55), documents, early closure and extension rules.`,
    h1: 'Senior Citizen Savings Scheme calculator: quarterly interest and rules',
    crumb: 'SCSS calculator',
    category: 'retire',
    updated: '2026-11-17',
    analyticsTitle: 'Website - SCSS',
    eyebrow: `Senior Citizens' Savings Scheme · ${RATE}% for Oct–Dec 2026`,
    answer: (
        <>
            <p>The maximum {amt(SCSS_MAX)} in the Senior Citizens' Savings Scheme pays {inr(top.quarterlyIncome)} every quarter at {RATE}% a year — {inr(top.annualInterest)} a year for 5 years. {amt(1500000)} pays {inr(half.quarterlyIncome)} a quarter.</p>
            <p>The {RATE}% rate applies to accounts opened in October–December 2026 and stays for the 5-year term. You can open one at 60, or from 55 if you have retired.</p>
        </>
    ),
    sources: [DEA, SCHEME, AMEND],
    calc: { key: 'scss', props: { amount: 1500000, rate: RATE } },
    Body,
    faqs: [
        { q: 'Senior citizen saving scheme mein kitna byaaj milta hai?', a: `October–December 2026 mein khole gaye account par ${RATE}% saalana, jo har teen mahine mein milta hai. ${amt(1500000)} par ${inr(half.quarterlyIncome)} har quarter, aur ${amt(SCSS_MAX)} par ${inr(top.quarterlyIncome)}.` },
        { q: 'How much interest will ₹30 lakh earn in SCSS?', a: `${inr(top.quarterlyIncome)} a quarter, or ${inr(top.annualInterest)} a year, at ${RATE}%. Over the 5-year term that is ${inr(top.totalInterest)}.` },
        { q: 'What is the maximum amount in SCSS?', a: '₹30 lakh across all your SCSS accounts, since the 2023 amendment. A husband and wife who are both eligible can each hold up to ₹30 lakh.' },
        { q: 'Who is eligible for the Senior Citizens\' Savings Scheme?', a: 'Anyone 60 or older; retirees aged 55–60 who open the account within three months of receiving their retirement benefits; retired defence personnel from 50; and the spouse of a government employee who died in harness at 50 or above.' },
        { q: 'Is TDS deducted on SCSS interest?', a: 'Yes, at 10% once the interest paid to you in a tax year goes above ₹1 lakh, under section 393 of the Income-tax Act, 2025. If your total tax for the year will be nil, a declaration in Form No. 121 stops the deduction.' },
        { q: 'Can I close SCSS before 5 years?', a: 'Yes, at any time. In the first year the interest already paid is taken back; between one and two years 1.5% of the deposit is deducted, and after two years 1%.' },
        { q: 'Can SCSS be extended after 5 years?', a: 'Yes, in blocks of 3 years, as many times as you like, by applying within a year of maturity. The extension earns the rate in force on the maturity date.' },
    ],
    related: [
        { href: '/post-office-mis', label: 'Post Office MIS calculator', note: 'Monthly income, open to all ages' },
        { href: '/fd', label: 'FD calculator', note: 'Bank deposits and the ₹1 lakh TDS limit' },
        { href: '/post-office-td', label: 'Post Office TD calculator', note: 'Another 5-year option that counts for section 123' },
        { href: '/nps', label: 'NPS calculator', note: 'Pension planning before retirement' },
        { href: '/schemes', label: 'Government schemes', note: 'Every central scheme in the app' },
    ],
    disclaimer: { text: 'SCSS figures are before tax and use the rate for accounts opened this quarter. Eligibility for retirees under 60 depends on documents your employer issues; the post office or bank decides. FinCalix is not affiliated with India Post or any bank.' },
};
