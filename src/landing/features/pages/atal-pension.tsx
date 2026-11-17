/**
 * /atal-pension — primary query "atal pension yojana chart" (SEO_PLAN.md §5d). Replaces the
 * hand-written guide; /schemes/c-apy already redirects here. Contribution chart:
 * features/math-retire.APY_CHART, copied from src/components/APYContributionCalculator.tsx and
 * checked cell by cell against Annex-1 of the official scheme details (jansuraksha.gov.in).
 * Rules: NPS Trust APY pages and FAQ. Facts: seo/research/verified-facts-retire.md.
 */
import { APY_CHART, APY_NOMINEE_CORPUS, APY_PENSIONS, apyPlan } from '../math-retire';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const DETAILS = { label: 'APY scheme details with the contribution chart (Annex-1)', url: 'https://jansuraksha.gov.in/Files/APY/ENGLISH/APY.pdf' };
const ABOUT = { label: 'NPS Trust: about APY', url: 'https://npstrust.org.in/about-apy' };
const ELIG = { label: 'NPS Trust: APY eligibility', url: 'https://npstrust.org.in/apy-eligibility' };
const FAQ = { label: 'NPS Trust: APY FAQs', url: 'https://npstrust.org.in/sites/default/files/inline-images/01-APY_FAQ.pdf' };

const AGE = 30;
const TOP = 4;                       // index of the ₹5,000 slab
const main = apyPlan(AGE, TOP);
const youngest = apyPlan(18, TOP);
const oldest = apyPlan(40, TOP);
const ages = Object.keys(APY_CHART).map(Number);

function Body() {
    const early = apyPlan(25, TOP);
    const later = apyPlan(35, TOP);
    const smallest = apyPlan(22, 0);
    const mid = apyPlan(28, 2);
    const late = (60 - AGE) * 12;
    return (
        <>
            <Section title="Atal Pension Yojana chart: monthly contribution by age">
                <DataTable
                    caption="Monthly contribution for each guaranteed pension from 60"
                    head={['Age at joining', 'Years to pay', ...APY_PENSIONS.map((p) => `${inr(p)} pension`)]}
                    rows={ages.map((a) => [String(a), String(60 - a), ...APY_CHART[a].map((c) => inr(c))])}
                    note={<>Return of corpus to the nominee: {APY_NOMINEE_CORPUS.map((c, i) => `${amt(c)} for ${inr(APY_PENSIONS[i])}`).join(', ')}. Quarterly and half-yearly contributions are also allowed; the official Annex-1 lists those amounts too.</>}
                />
            </Section>

            <Section title="How your contribution is fixed">
                <ol className="steps">
                    <li>Pick the pension you want at 60: {APY_PENSIONS.map((p) => inr(p)).join(', ')} a month.</li>
                    <li>Find your age at joining in the chart. Joining at {AGE} for {inr(main.pension)} means {inr(main.monthly)} a month.</li>
                    <li>You pay that amount until 60: {main.years} years, or {late} monthly debits, {inr(main.totalPaid)} in all.</li>
                    <li>From 60 you get {inr(main.pension)} a month for life; your spouse then gets the same, and after both, the nominee receives {amt(main.nomineeCorpus)}.</li>
                </ol>
            </Section>

            <Section title={`What you pay in total for ${inr(5000)} a month`}>
                <DataTable
                    caption={`Total contributions till 60 for the ${inr(5000)} pension`}
                    head={['Age at joining', 'Monthly', 'Months', 'Total paid', 'Returned to nominee']}
                    rows={[18, 22, 25, 30, 35, 38, 40].map((a) => { const x = apyPlan(a, TOP); return [String(a), inr(x.monthly), String(x.months), inr(x.totalPaid), amt(x.nomineeCorpus)]; })}
                    note="The pension amount is guaranteed by the Government of India; if the fund earns more than assumed, the extra goes to the subscriber."
                />
            </Section>

            <Section title="Who can join and how">
                <div className="cols">
                    <div>
                        <h3>Eligibility</h3>
                        <ul>
                            <li>Indian citizens aged 18 to 40 (up to 39 years 364 days)</li>
                            <li>A savings account with a bank or the Post Office</li>
                            <li>Not open to anyone who is or has been an income-tax payer, from 1 October 2022</li>
                            <li>One APY account per person</li>
                        </ul>
                    </div>
                    <div>
                        <h3>Joining</h3>
                        <ul>
                            <li>At the bank branch or post office where you have your savings account, or through your bank’s digital channel</li>
                            <li>Fill the APY registration form: pension amount, nominee (your spouse by default if married), and monthly, quarterly or half-yearly debit</li>
                            <li>Aadhaar is needed to join online; at a branch it is optional but advised</li>
                            <li>Keep enough balance for the auto-debit each month</li>
                        </ul>
                    </div>
                </div>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: 'Joining at 25 instead of 35', body: <>For the {inr(5000)} pension, joining at 25 costs {inr(early.monthly)} a month ({inr(early.totalPaid)} in total); waiting until 35 raises it to {inr(later.monthly)} a month ({inr(later.totalPaid)}).</> },
                    { title: `The smallest plan at 22`, body: <>{inr(smallest.monthly)} a month for {smallest.years} years secures {inr(smallest.pension)} a month from 60.</> },
                    { title: `${inr(3000)} pension at 28`, body: <>{inr(mid.monthly)} a month for {mid.years} years; the nominee would later get {amt(mid.nomineeCorpus)}.</> },
                    { title: 'Joining at the last eligible age', body: <>At 40 the {inr(5000)} plan costs {inr(oldest.monthly)} a month for 20 years, {(oldest.monthly / youngest.monthly).toFixed(1)} times the {inr(youngest.monthly)} paid by someone who joins at 18.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Monthly, quarterly and half-yearly contributions by entry age and pension slab, and the corpus returned to the nominee (₹1.7 lakh to ₹8.5 lakh).', source: DETAILS },
                { text: 'Age 18 to 40 with a bank or post office savings account; from 1 October 2022 anyone who is or has been an income-tax payer cannot join, and such an account opened later is closed with the savings paid back.', source: ELIG },
                { text: 'Pension of ₹1,000 to ₹5,000 a month from 60, guaranteed by the Government of India; the same pension to the spouse, then the corpus to the nominee.', source: ABOUT },
                { text: 'Late payment costs ₹1 a month for every ₹100 of contribution; the pension slab can be changed once a year.', source: FAQ },
                { text: 'If the subscriber dies before 60, the spouse may continue the account until the subscriber would have turned 60, or take the accumulated corpus.', source: FAQ },
            ]} />
        </>
    );
}

export const atalPension: FeatureDef = {
    slug: 'atal-pension',
    title: 'Atal Pension Yojana Chart 2026: APY Contribution by Age',
    description: 'Official Atal Pension Yojana chart: monthly contribution for ₹1,000 to ₹5,000 pension at every age from 18 to 40, total paid, eligibility and how to join.',
    h1: 'Atal Pension Yojana chart and APY calculator',
    crumb: 'Atal Pension Yojana',
    category: 'retire',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Atal Pension Yojana',
    eyebrow: 'Government pension scheme · ₹1,000 to ₹5,000 a month',
    answer: (
        <>
            <p>To get the highest Atal Pension Yojana pension of {inr(5000)} a month from 60, you pay {inr(main.monthly)} a month if you join at {AGE} — {inr(youngest.monthly)} if you join at 18, {inr(oldest.monthly)} at 40.</p>
            <p>The amounts come from the official APY contribution chart. Citizens aged 18 to 40 with a savings account can join, except income-tax payers (excluded since 1 October 2022).</p>
        </>
    ),
    sources: [DETAILS, ELIG, ABOUT],
    calc: { key: 'atal-pension', props: { age: AGE, slab: String(TOP) } },
    Body,
    faqs: [
        { q: 'How much do I pay for ₹5,000 pension in Atal Pension Yojana?', a: `It depends on your age at joining: ${inr(youngest.monthly)} a month at 18, ${inr(main.monthly)} at ${AGE} and ${inr(oldest.monthly)} at 40, paid every month until 60.` },
        { q: 'Who cannot join Atal Pension Yojana?', a: 'Anyone who is or has been an income-tax payer, since 1 October 2022, and anyone younger than 18 or 40 and older. You also need a bank or post office savings account.' },
        { q: 'What happens to APY after the subscriber dies?', a: 'The spouse gets the same pension for life, and after both have died the nominee receives the corpus — ₹1.7 lakh for each ₹1,000 of monthly pension, up to ₹8.5 lakh.' },
        { q: 'What if I miss an APY payment?', a: 'The bank collects it later with an overdue charge of ₹1 a month for every ₹100 due. The account is not closed for missed payments, but charges are deducted and it closes if the balance falls to zero.' },
        { q: 'Can I change my APY pension amount?', a: 'Yes, once a year during the contribution period, up or down; the monthly debit changes to match the chart.' },
        { q: 'Is the Atal Pension Yojana pension guaranteed?', a: 'Yes, the slab you choose is a minimum guaranteed by the Government of India. If the invested contributions earn less than assumed, the Government funds the shortfall; if they earn more, the higher benefit goes to the subscriber.' },
    ],
    related: [
        { href: '/nps', label: 'NPS calculator', note: 'Market-linked pension, open up to age 85' },
        { href: '/schemes/c-pmsym', label: 'PM Shram Yogi Maandhan', note: 'Another pension scheme for unorganised workers' },
        { href: '/ppf', label: 'PPF calculator', note: 'Tax-free savings for any age' },
        { href: '/post-office-mis', label: 'Post Office MIS', note: 'Monthly income from a lump sum' },
        { href: '/schemes', label: 'Government schemes', note: 'Every central scheme in the app' },
    ],
    disclaimer: { text: 'Contribution amounts are from the official Atal Pension Yojana chart for monthly payments. The pension is guaranteed at the slab you choose; the corpus returned to the nominee is indicative. Eligibility is decided by your bank and PFRDA. FinCalix is not affiliated with PFRDA or any bank.' },
};
