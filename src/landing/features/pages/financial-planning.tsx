/**
 * /financial-planning — the app's Smart Planner (route /financial-advisor, src/pages/AIFinancialAssistant.tsx).
 * Primary query "financial planning calculator" (secondary "financial health score"). The planner is
 * rules-based and deterministic: every figure comes from math-planning.smartPlan, copied from the screen's
 * `plan` useMemo. Its tax estimate equals compareSalaryTax (new regime, FY 2026-27) up to ₹50 lakh a year
 * but leaves out surcharge above that, so this page stays below ₹4 lakh a month (reported to the coordinator).
 * HealthScoreService / InsightEngine / DecisionEngine are not used by this screen and are not described.
 */
import { smartPlan } from '../math-planning';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025 — new regime slabs (s.202) and rebate (s.156)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const PIB = { label: 'PIB: Income-tax Act, 2025 in force from 1 April 2026', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2248005' };
const FAME = { label: 'RBI Financial Awareness Messages (FAME), Feb 2024', url: 'https://www.rbi.org.in/commonman/images/FAME202426022024.pdf' };

/** The app's starting inputs. */
const IN = { salary: 50000, age: 28, expenses: 25000, savings: 100000, emi: 0 };
const base = smartPlan(IN.salary, IN.age, IN.expenses, IN.savings, IN.emi);
const one = (v: number) => (Math.round(v * 10) / 10).toLocaleString('en-IN');

const PROFILES = [
    { who: 'Fresher, renting', salary: 35000, age: 25, expenses: 22000, savings: 30000, emi: 5000 },
    { who: 'Young professional', salary: 50000, age: 28, expenses: 25000, savings: 100000, emi: 0 },
    { who: 'Couple with a car loan', salary: 80000, age: 32, expenses: 40000, savings: 300000, emi: 15000 },
    { who: 'Home loan, two children', salary: 150000, age: 35, expenses: 60000, savings: 400000, emi: 50000 },
    { who: 'Mid-career, big EMIs', salary: 120000, age: 40, expenses: 55000, savings: 700000, emi: 35000 },
];

function Body() {
    const plans = PROFILES.map((x) => ({ x, s: smartPlan(x.salary, x.age, x.expenses, x.savings, x.emi) }));
    const ages = [25, 30, 35, 40, 45];
    const RETIRE_EXP = 40000;
    const fresher = plans[0], couple = plans[2], mid = plans[4];
    return (
        <>
            <Section title="How the money health score is built">
                <p>The Smart Planner in the FinCalix app scores your finances out of 100 from five numbers you enter. It is a fixed set of rules, shown in full below, not a prediction or a personalised recommendation.</p>
                <DataTable
                    caption="The four parts of the score"
                    head={['Part', 'What is measured', 'Points']}
                    rows={[
                        ['Savings rate', '(salary − expenses − EMIs) ÷ gross salary', '30 at 30% or more · 22 at 20% · 12 at 10% · 5 below'],
                        ['EMI load', 'EMIs ÷ take-home pay after income tax', '25 up to 20% · 18 up to 30% · 10 up to 40% · 3 above'],
                        ['Emergency fund', 'savings ÷ monthly expenses', '25 at 6 months or more · 15 at 3 months · 5 below'],
                        ['Investing for your age', 'savings rate ÷ (100 − age, at most 80) × 20', 'up to 20'],
                    ]}
                    note="Take-home pay uses the new tax regime for FY 2026-27: standard deduction ₹75,000, nil tax up to ₹12 lakh of taxable income with marginal relief above it, and 4% cess."
                />
            </Section>

            <Section title="The default example, step by step">
                <ol className="steps">
                    <li>Salary {inr(IN.salary)} a month is {amt(IN.salary * 12)} a year; income tax under the new regime is {inr(base.annualTax)}, so take-home is {inr(base.postTaxMonthly)} a month.</li>
                    <li>Savings rate: ({inr(IN.salary)} − {inr(IN.expenses)} − {inr(IN.emi)}) ÷ {inr(IN.salary)} = {one(base.savingsRatio)}%, worth {base.savingsPts} points.</li>
                    <li>EMI load: {one(base.emiRatio)}% of take-home, {base.emiPts} points. The planner’s ceiling for all EMIs is 40% of take-home: {inr(base.maxEmiAllowed)}.</li>
                    <li>Emergency fund: {inr(IN.savings)} ÷ {inr(IN.expenses)} = {one(base.emergencyMonths)} months, {base.emergencyPts} points. Six months would be {inr(base.emergencyTarget)}.</li>
                    <li>Investing for age {IN.age}: {one(base.savingsRatio)}% ÷ {base.idealInvestPct}% × 20 = {base.investPts} points.</li>
                    <li>Total: {base.savingsPts} + {base.emiPts} + {base.emergencyPts} + {base.investPts} = <strong>{base.score}/100</strong>. On take-home pay the 50/30/20 split is {inr(base.needs50)} needs, {inr(base.wants30)} wants and {inr(base.savings20)} savings.</li>
                </ol>
            </Section>

            <Section title="Scores for five households">
                <DataTable
                    caption="Smart Planner results (monthly figures)"
                    head={['Household', 'Salary', 'Take-home', 'Savings rate', 'EMI load', 'Emergency fund', 'Score']}
                    rows={plans.map(({ x, s }) => [x.who, inr(x.salary), inr(s.postTaxMonthly), `${one(s.savingsRatio)}%`, `${one(s.emiRatio)}%`, `${one(s.emergencyMonths)} months`, `${s.score}/100`])}
                />
            </Section>

            <Section title="Retirement and education goals">
                <p>When you pick a goal, the planner turns it into a monthly SIP at an assumed 12% a year. For retirement it plans for 1.5 times today’s monthly expenses, for 25 years, from age 60. For a child’s education it targets {amt(base.educationCost)}.</p>
                <DataTable
                    caption={`Retirement plan for ${inr(RETIRE_EXP)} of monthly expenses today`}
                    head={['Age now', 'Years to 60', 'Monthly need in retirement', 'Corpus target', 'SIP a month']}
                    rows={ages.map((a) => { const s = smartPlan(100000, a, RETIRE_EXP, 0, 0); return [String(a), String(s.yearsToRetire), inr(s.retireMonthly), amt(s.retireCorpus), inr(s.retireSip)]; })}
                    note="The planner does not add inflation to the target or count money already saved; treat the SIP as a starting point and use the goal planner for an inflation-adjusted figure."
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: fresher.x.who, body: <>Saving {one(fresher.s.savingsRatio)}% with only {one(fresher.s.emergencyMonths)} months of expenses put by scores {fresher.s.score}/100. Building the emergency fund to {inr(fresher.s.emergencyTarget)} is the quickest way up: it is worth up to 20 more points.</> },
                    { title: couple.x.who, body: <>EMIs are {one(couple.s.emiRatio)}% of take-home and savings cover {one(couple.s.emergencyMonths)} months, so the score is {couple.s.score}/100. Room for more EMIs before the 40% ceiling: {inr(couple.s.maxAdditionalEmi)} a month.</> },
                    { title: mid.x.who, body: <>Income tax of {inr(mid.s.annualTax)} a year leaves {inr(mid.s.postTaxMonthly)} a month; EMIs take {one(mid.s.emiRatio)}% of it, which costs points. Score {mid.s.score}/100, with {inr(mid.s.maxAdditionalEmi)} of EMI headroom left.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'New tax regime for FY 2026-27 (tax year 2026-27): standard deduction ₹75,000; slabs nil up to ₹4 lakh, then 5% to ₹8 lakh, 10% to ₹12 lakh, 15% to ₹16 lakh, 20% to ₹20 lakh, 25% to ₹24 lakh and 30% above; rebate makes tax nil up to ₹12 lakh of taxable income, with marginal relief above it; 4% cess.', source: ACT },
                { text: 'The Income-tax Act, 2025 replaced the 1961 Act from 1 April 2026.', source: PIB },
                { text: 'RBI’s financial-awareness booklet advises setting aside part of income before spending, and keeping some savings liquid for emergencies.', source: FAME },
                { text: 'The 40% EMI ceiling, the six-month emergency fund and the 12% SIP return are the planner’s rules of thumb, not limits set by RBI or any lender.' },
            ]} />
        </>
    );
}

export const financialPlanning: FeatureDef = {
    slug: 'financial-planning',
    title: 'Financial Planning Calculator: Money Health Score',
    description: 'Score your finances out of 100 from salary, expenses, EMIs and savings: savings rate, EMI load, emergency fund, 50/30/20 split and goal SIPs, rules shown.',
    h1: 'Financial planning calculator with a money health score',
    crumb: 'Financial planning',
    category: 'goals',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Financial Planning',
    eyebrow: 'Smart Planner · Rules-based, not advice',
    answer: (
        <>
            <p>On a {inr(IN.salary)} monthly salary at age {IN.age}, with {inr(IN.expenses)} of expenses, no EMIs and {amt(IN.savings)} saved, the FinCalix Smart Planner scores your finances {base.score}/100: a {one(base.savingsRatio)}% savings rate, but only {one(base.emergencyMonths)} months of emergency money against a six-month target of {inr(base.emergencyTarget)}.</p>
            <p>Take-home pay is worked out under the new tax regime for FY 2026-27, where tax is nil up to ₹12 lakh of taxable income; here it is {inr(base.postTaxMonthly)} a month.</p>
        </>
    ),
    sources: [ACT, PIB, FAME],
    calc: { key: 'financial-planning', props: { salary: IN.salary, age: IN.age, expenses: IN.expenses, savings: IN.savings, emi: IN.emi } },
    Body,
    faqs: [
        { q: 'What is a financial health score?', a: 'A single number that sums up how well your money is organised. The Smart Planner gives up to 30 points for your savings rate, 25 for a low EMI load, 25 for an emergency fund and 20 for investing enough for your age.' },
        { q: 'How many months of emergency fund do I need?', a: `The planner aims for six months of expenses and gives partial credit from three. On ${inr(IN.expenses)} of monthly expenses that is ${inr(base.emergencyTarget)}.` },
        { q: 'How much EMI is safe for my salary?', a: `The planner keeps all EMIs within 40% of take-home pay: ${inr(base.maxEmiAllowed)} a month on ${inr(base.postTaxMonthly)}. It gives full points only up to 20%.` },
        { q: 'Is the Smart Planner AI or financial advice?', a: 'Neither. It applies the fixed rules on this page to the numbers you type. Use it to spot gaps, and see a SEBI-registered adviser for advice.' },
        { q: 'Does the planner count inflation?', a: 'Not in its goal targets: retirement uses 1.5 times today’s expenses and education a fixed ₹25 lakh. Use the goal planner for inflation-adjusted targets.' },
    ],
    related: [
        { href: '/expense-tracker', label: 'Expense tracker and 50/30/20 budget', note: 'Track the expenses behind the score' },
        { href: '/goal-planner', label: 'Goal planner', note: 'Inflation-adjusted SIP for a goal' },
        { href: '/term-insurance-cover', label: 'Term insurance cover calculator', note: 'Protect the plan' },
        { href: '/emi', label: 'EMI calculator', note: 'What a new loan would cost' },
        { href: '/income-tax', label: 'Income tax calculator', note: 'Your take-home pay in detail' },
    ],
    disclaimer: { text: 'The Smart Planner applies fixed rules of thumb to the figures you enter. It is not financial, tax or investment advice, does not consider your full situation, and assumes returns that are not guaranteed. FinCalix is not a SEBI-registered investment adviser.' },
};
