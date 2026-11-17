/**
 * /term-insurance-cover — primary query "how much term insurance do i need" (SEO_PLAN.md §5e).
 * Figures: the app's life-cover rules (math-planning.lifeCover, copied from src/pages/InsuranceCalculator.tsx:
 * 15× / 20× income, 15× + loans, and the needs breakdown). The app's premium estimates are NOT shown:
 * they are not taken from any insurer's published rates. Rules: IRDAI Master Circular on Protection of
 * Policyholders' Interests 2024; GST exemption: Department of Financial Services (seo/research/verified-facts-planning.md).
 */
import { lifeCover } from '../math-planning';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const IRDAI_PP = { label: 'IRDAI Master Circular on Protection of Policyholders’ Interests, 2024', url: 'https://irdai.gov.in/documents/37343/365525/%E0%A4%AA%E0%A4%BE%E0%A4%B2%E0%A4%BF%E0%A4%B8%E0%A5%80%E0%A4%A7%E0%A4%BE%E0%A4%B0%E0%A4%95%E0%A5%8B%E0%A4%82+%E0%A4%95%E0%A5%87+%E0%A4%B9%E0%A4%BF%E0%A4%A4%E0%A5%8B%E0%A4%82+%E0%A4%95%E0%A5%87+%E0%A4%B8%E0%A4%82%E0%A4%B0%E0%A4%95%E0%A5%8D%E0%A4%B7%E0%A4%A3+%E0%A4%B8%E0%A4%82%E0%A4%AC%E0%A4%82%E0%A4%A7%E0%A5%80+%E0%A4%AE%E0%A4%BE%E0%A4%B8%E0%A5%8D%E0%A4%9F%E0%A4%B0+%E0%A4%AA%E0%A4%B0%E0%A4%BF%E0%A4%AA%E0%A4%A4%E0%A5%8D%E0%A4%B0,+2024+_+Master+Circular+on+Protection+of+Policyholders\'+interests+2024.pdf/2bc6a186-5c96-461b-2946-89945b9d488c?version=5.1&t=1737118636654&download=true' };
const DFS_GST = { label: 'Dept. of Financial Services: GST exemption on individual life and health policies', url: 'https://financialservices.gov.in/exemption-gst-all-individual-life-insurance-and-health-insurance-policies' };

const INCOME = 1200000, DEPS = 2;
const c = lifeCover(INCOME, 0, DEPS);
const ONE_CRORE = 10000000;
/** Incomes at which ₹1 crore equals the app's 20× and 15× multiples. */
const incomeAt20 = ONE_CRORE / 20, incomeAt15 = ONE_CRORE / 15;
const sixL = lifeCover(600000, 0, DEPS);

function Body() {
    const incomes = [500000, 800000, 1000000, 1500000, 2000000, 3000000];
    const loanCase = lifeCover(1500000, 4000000, DEPS);
    const single = lifeCover(900000, 0, 0);
    const family = lifeCover(1800000, 6000000, 3);
    return (
        <>
            <Section title="How the app works out your cover">
                <p>The FinCalix insurance calculator gives two answers side by side. The first is a multiple of income, a quick stand-in for the income your family would lose. The second adds up specific needs, so you can see which part of the cover is for what.</p>
                <ol className="steps">
                    <li>Income replacement: {inr(INCOME)} × 15 = {inr(c.incomeReplace)}. This is also the minimum the app suggests; the recommended figure is 20 × income, {inr(c.recommended)}.</li>
                    <li>Loans still owed are added in full, so that the family is not left with the EMIs: none in this example.</li>
                    <li>Education: ₹20 lakh for each of the {DEPS} dependents (₹25 lakh per child if you enter children separately in the app) = {inr(c.childEducation)}.</li>
                    <li>Emergency fund: one year’s income, {inr(c.emergencyFund)}.</li>
                    <li>Needs-based total: {inr(c.incomeReplace)} + {inr(c.loanCover)} + {inr(c.childEducation)} + {inr(c.emergencyFund)} = {inr(c.total)}.</li>
                </ol>
                <p>A full human life value calculation would instead add up your expected future earnings, less your own spending, and discount them to today. The income multiple is a shortcut to the same idea; the needs-based list is a check on it.</p>
            </Section>

            <Section title="Term cover by income">
                <DataTable
                    caption={`Cover for ${DEPS} dependents and no loans`}
                    head={['Yearly income', 'Minimum (15×)', 'Recommended (20×)', 'Needs-based total']}
                    rows={incomes.map((i) => { const x = lifeCover(i, 0, DEPS); return [inr(i), amt(x.minimum), amt(x.recommended), amt(x.total)]; })}
                    note="Needs-based total = 15 × income + loans + ₹20 lakh per dependent + one year’s income."
                />
            </Section>

            <Section title="How dependents and loans change the needs-based figure">
                <DataTable
                    caption={`Income ${amt(1500000)} with a ${amt(4000000)} home loan`}
                    head={['Dependents', 'Income replacement', 'Loans', 'Education', 'Emergency', 'Total']}
                    rows={[0, 1, 2, 3, 4].map((d) => { const x = lifeCover(1500000, 4000000, d); return [String(d === 4 ? '4 or more' : d), amt(x.incomeReplace), amt(x.loanCover), amt(x.childEducation), amt(x.emergencyFund), amt(x.total)]; })}
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `${amt(1500000)} income with a ${amt(4000000)} home loan`, body: <>15 × income plus the loan is {amt(loanCase.withLoans)}; the needs list comes to {amt(loanCase.total)}. Both are above the plain 15× figure of {amt(loanCase.minimum)}, which would leave the loan unpaid.</> },
                    { title: `Single, ${amt(900000)} income, no dependents`, body: <>The multiples give {amt(single.minimum)} to {amt(single.recommended)}; the needs list, with no education fund, is {amt(single.total)}. With nobody relying on the income, some people choose cover only for their debts.</> },
                    { title: `Family of three dependents, ${amt(1800000)} income, ${amt(6000000)} of loans`, body: <>Needs-based cover is {amt(family.total)}, against {amt(family.recommended)} for 20 × income. Splitting it across two policies with different terms is one way to match cover to the years the loan and the children need it.</> },
                ]} />
            </Section>

            <Section title="Is ₹1 crore of term insurance enough?">
                <p>
                    ₹1 crore equals the app’s recommended 20 × income for someone earning {inr(incomeAt20)} a year, and the 15 × minimum at {inr(incomeAt15)}.
                    At {inr(600000)} with {DEPS} dependents the needs list already reaches {amt(sixL.total)}, so ₹1 crore falls short once education and an emergency
                    fund are counted. Above about {amt(incomeAt15)} of income, ₹1 crore is below even the minimum multiple.
                </p>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Since 22 September 2025 individual life insurance policies, including term plans, carry no GST (earlier 18%). Group policies bought by an employer still carry 18%.', source: DFS_GST },
                { text: 'Free-look period: 30 days from receiving a life policy with a term of a year or more. You can return it for any reason and get the premium back, less proportionate risk premium, medical-test and stamp-duty costs, within 7 days.', source: IRDAI_PP },
                { text: 'Grace period for premiums: 15 days for monthly payment, 30 days for quarterly, half-yearly or yearly; the cover continues during it.', source: IRDAI_PP },
                { text: 'Death claims must be settled within 15 days of intimation, or 45 days if the claim needs investigation; a late settlement earns interest at bank rate plus 2%.', source: IRDAI_PP },
                { text: 'After three years from the policy (or revival or rider) date, a life policy cannot be contested on any ground.', source: IRDAI_PP },
            ]} />
        </>
    );
}

export const termInsuranceCover: FeatureDef = {
    slug: 'term-insurance-cover',
    title: 'How Much Term Insurance Do I Need? Cover Calculator',
    description: 'Term life cover from your income, loans and dependents: 15× and 20× income, a needs-based total, a table by income and IRDAI rules on free-look and claims.',
    h1: 'How much term insurance do I need?',
    crumb: 'Term insurance cover',
    category: 'goals',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Term Insurance Cover',
    eyebrow: 'Life insurance · IRDAI rules checked 17 Nov 2026',
    answer: (
        <>
            <p>On a {amt(INCOME)} income with {DEPS} dependents and no loans, the FinCalix calculator recommends {amt(c.recommended)} of term cover (20 × income), with {amt(c.minimum)} as the minimum; adding up needs gives {amt(c.total)}.</p>
            <p>Add every outstanding loan on top. Individual term premiums have carried no GST since 22 September 2025, and IRDAI gives you 30 days to return a new policy.</p>
        </>
    ),
    sources: [IRDAI_PP, DFS_GST],
    calc: { key: 'term-insurance-cover', props: { income: INCOME, dependents: DEPS, loans: 0 } },
    Body,
    faqs: [
        { q: 'How much term insurance do I need?', a: `Start at 15 to 20 times your yearly income and add your loans. For ${amt(INCOME)} of income that is ${amt(c.minimum)} to ${amt(c.recommended)}; listing needs for ${DEPS} dependents gives ${amt(c.total)}.` },
        { q: 'Is 1 crore term insurance enough?', a: `It is 20 times an income of ${inr(incomeAt20)} and 15 times ${inr(incomeAt15)}. If you earn more, have loans or have children to educate, ₹1 crore is usually too little.` },
        { q: 'What is human life value in insurance?', a: 'It is the present value of the income your family would lose if you died, after your own expenses. The app uses 15–20 times income as a shortcut to it, and a needs-based list as a check.' },
        { q: 'Should loans be added to term cover?', a: 'Yes, in full, unless a loan has its own insurance that pays it off. Otherwise the family has to keep paying the EMIs out of the claim.' },
        { q: 'Is there GST on term insurance premiums?', a: 'No, not on individual policies since 22 September 2025; the rate was cut from 18% to zero. Employer group policies still carry 18%.' },
        { q: 'How long does a term insurance claim take?', a: 'IRDAI requires a death claim to be settled within 15 days of intimation, or 45 days if it needs investigation. Delay earns interest at bank rate plus 2%.' },
        { q: 'Can I cancel a term policy after buying it?', a: 'Yes, within the 30-day free-look period, for any reason. The premium comes back within 7 days, less proportionate risk premium and medical and stamp-duty costs.' },
    ],
    related: [
        { href: '/health-insurance-claim-settlement-ratio', label: 'Health insurance claim settlement ratio', note: 'IRDAI claim figures by insurer' },
        { href: '/financial-planning', label: 'Financial planning calculator', note: 'Emergency fund, EMI limit and goals' },
        { href: '/home-loan', label: 'Home loan EMI calculator', note: 'The loan your cover should repay' },
        { href: '/goal-planner', label: 'Child education planner', note: 'Size the education part of the cover' },
    ],
    disclaimer: { text: 'Cover amounts follow the rules of thumb in the FinCalix app (income multiples and a needs-based list). They are not advice, a quote or an offer of insurance. Premiums and acceptance depend on each insurer’s underwriting. FinCalix is not an insurer, broker or IRDAI-registered intermediary; read the policy wording before you buy.' },
};
