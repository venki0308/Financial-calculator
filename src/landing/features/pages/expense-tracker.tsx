/**
 * /expense-tracker — primary query "expense tracker app" (SEO_PLAN.md §5e), with the 50/30/20 budget
 * planner as a section (owner decision, §9.4). Replaces the hand-written guide public/expense-tracker.
 * App claims checked against src/pages/ExpenseTracker.tsx, src/pages/expenses/*, src/pages/BudgetTracker.tsx,
 * src/components/AddEntrySheet.tsx, src/types/expense.ts and src/utils/expenseReportPDF.ts.
 * Figures: the app's 50/30/20 split (math-planning.split503020, copied from expenseReportPDF.generateMonthlyPDF).
 * Budgeting guidance: RBI Financial Awareness Messages (FAME), 4th edition, Feb 2024, Message 1.
 */
import { DEFAULT_EXPENSE_CATEGORIES } from '../../../types/expense';
import { NEEDS_CATEGORIES, WANTS_CATEGORIES, split503020 } from '../math-planning';
import { inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const FAME = { label: 'RBI Financial Awareness Messages (FAME), Feb 2024 — Message 1: Budgeting and saving', url: 'https://www.rbi.org.in/commonman/images/FAME202426022024.pdf' };

const PAY = 50000;
const s = split503020(PAY);
const catName = (id: string) => DEFAULT_EXPENSE_CATEGORIES.find((c) => c.id === id)?.name ?? id;
const NEEDS = NEEDS_CATEGORIES.map(catName);
const WANTS = WANTS_CATEGORIES.map(catName);
const OTHER = DEFAULT_EXPENSE_CATEGORIES.filter((c) => !(NEEDS_CATEGORIES as readonly string[]).includes(c.id) && !(WANTS_CATEGORIES as readonly string[]).includes(c.id)).map((c) => c.name);

/** Worked months for the scenarios. */
const RENTER = { pay: 30000, rent: 8000, groceries: 5000, bills: 1800, emi: 0 };
const renter = split503020(RENTER.pay);
const renterNeeds = RENTER.rent + RENTER.groceries + RENTER.bills;
const FAMILY = { pay: 90000, rent: 22000, emi: 18000, groceries: 12000, school: 6000 };
const family = split503020(FAMILY.pay);
const familyNeeds = FAMILY.rent + FAMILY.emi + FAMILY.groceries + FAMILY.school;
const HIGH = 150000;
const high = split503020(HIGH);

function Body() {
    const pays = [25000, 30000, 40000, 50000, 75000, 100000, 150000, 200000];
    return (
        <>
            <Section title="What the FinCalix expense tracker does">
                <ul>
                    <li><strong>Log in seconds:</strong> each entry is an expense, income, investment or transfer between your accounts, with amount, date, category, payment method (cash, UPI, debit or credit card, net banking, cheque, auto-debit) and an optional note.</li>
                    <li><strong>Categories ready to use:</strong> {DEFAULT_EXPENSE_CATEGORIES.length} expense categories, from {DEFAULT_EXPENSE_CATEGORIES[0].name} to {DEFAULT_EXPENSE_CATEGORIES[DEFAULT_EXPENSE_CATEGORIES.length - 2].name}, plus your own.</li>
                    <li><strong>See it by period:</strong> daily, weekly, monthly and yearly views, and a search across every transaction.</li>
                    <li><strong>Plan the month:</strong> a budget with your income, fixed bills and their due dates, limits per category, investment targets, and the option to carry unspent money forward or copy last month’s plan. The month can start on your salary day instead of the 1st.</li>
                    <li><strong>Repeat automatically:</strong> recurring transactions for rent or SIPs, plus subscriptions, bank accounts, cash in hand and credit-card dues in one place.</li>
                    <li><strong>Reports you can keep:</strong> PDF reports for a day, week, month, year or any date range, a report for a single category, and CSV or Excel files for your accountant.</li>
                    <li><strong>Private by design:</strong> no login, works offline, and your financial data stays on your device. You can back it up to a file from Settings.</li>
                </ul>
            </Section>

            <Section title="The 50/30/20 budget, in rupees" id="budget-503020">
                <p>The 50/30/20 rule is a simple way to split take-home pay: half for needs you cannot skip, under a third for wants, and at least a fifth set aside first for savings and investments. It is a rule of thumb, not a regulation; if rent alone takes 40% of your pay, adjust the split but keep the savings share.</p>
                <DataTable
                    caption="50/30/20 split of monthly take-home pay"
                    head={['Take-home pay', 'Needs (50%)', 'Wants (30%)', 'Savings (20%)', 'Savings in a year']}
                    rows={pays.map((p) => { const x = split503020(p); return [inr(p), inr(x.needs), inr(x.wants), inr(x.savings), inr(x.savings * 12)]; })}
                    note="Use take-home pay (after tax, PF and other deductions), not your CTC."
                />
            </Section>

            <Section title="How the app checks your month against 50/30/20">
                <ol className="steps">
                    <li>It takes the income you logged that month, or the income in your budget if you have not logged salary yet: say {inr(PAY)}.</li>
                    <li>It sets the targets: needs {inr(s.needs)}, wants {inr(s.wants)}, savings and investments {inr(s.savings)}.</li>
                    <li>It adds up your spending by category. Needs are {NEEDS.join(', ')}. Wants are {WANTS.join(', ')}. Anything else ({OTHER.join(', ')}) is counted as a need.</li>
                    <li>Savings are what is left of income plus what you logged as investments. Each line is marked on track or over budget in the monthly PDF report.</li>
                </ol>
                <p>In the Budget Tracker you set the plan once a month. The Budget tab then shows, for each category, what you have spent against its limit and how much is left; the monthly PDF from the Reports tab adds the 50/30/20 analysis.</p>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `${inr(RENTER.pay)} a month, sharing a flat`, body: <>Rent {inr(RENTER.rent)}, groceries {inr(RENTER.groceries)} and bills {inr(RENTER.bills)} come to {inr(renterNeeds)}, {renterNeeds <= renter.needs ? 'inside' : 'above'} the {inr(renter.needs)} for needs. That leaves {inr(renter.wants)} for wants and {inr(renter.savings)} to save: {inr(renter.savings * 12)} in a year.</> },
                    { title: `Family on ${inr(FAMILY.pay)} with a home loan`, body: <>Rent, a {inr(FAMILY.emi)} EMI, groceries and school fees add up to {inr(familyNeeds)}, which is {inr(familyNeeds - family.needs)} over the {inr(family.needs)} needs share. To protect the {inr(family.savings)} savings target, wants have to shrink to {inr(FAMILY.pay - familyNeeds - family.savings)}.</> },
                    { title: `${inr(HIGH)} take-home`, body: <>20% is {inr(high.savings)} a month. Many people at this income save more than 20%; the split is a floor for savings, not a ceiling.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'A budget is a plan of future income and expenses (yearly, monthly or weekly); comparing it with what you actually spent shows where you spent more or less. RBI’s financial-awareness booklet recommends setting aside part of your income before you spend anything.', source: FAME },
                { text: 'The same booklet suggests keeping part of your savings in liquid form so you can withdraw it when needed.', source: FAME },
                { text: 'The 50/30/20 split is a budgeting convention, not a rule set by RBI or any regulator.' },
            ]} />
        </>
    );
}

export const expenseTracker: FeatureDef = {
    slug: 'expense-tracker',
    title: 'Expense Tracker App: Daily Expenses and 50/30/20 Budget',
    description: 'A free expense tracker app with no login: log daily spending, set a monthly budget, and see the 50/30/20 split for take-home pay from ₹25,000 to ₹2 lakh.',
    h1: 'Expense tracker app with a 50/30/20 budget planner',
    crumb: 'Expense tracker',
    category: 'goals',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Expense Tracker',
    eyebrow: 'Money tracking · Budget planner',
    answer: (
        <>
            <p>The FinCalix expense tracker logs every expense, income and investment by category and payment method, sets a monthly budget, and checks each month against the 50/30/20 rule. On {inr(PAY)} of take-home pay that is {inr(s.needs)} for needs, {inr(s.wants)} for wants and {inr(s.savings)} to save.</p>
            <p>There is no login and your data stays on your device. RBI’s financial-awareness booklet (February 2024) gives the same advice behind the rule: plan the budget, then set savings aside before you spend.</p>
        </>
    ),
    sources: [FAME],
    calc: { key: 'expense-tracker', props: { income: PAY, needs: 28000, wants: 12000 } },
    Body,
    faqs: [
        { q: 'What is the 50/30/20 rule?', a: `It splits take-home pay into 50% for needs, 30% for wants and 20% for savings and investments. On ${inr(PAY)} that is ${inr(s.needs)}, ${inr(s.wants)} and ${inr(s.savings)}.` },
        { q: '50 30 20 rule kya hai?', a: `Yeh budget banane ka seedha tareeka hai: haath mein aane wali salary ka 50% zaroori kharchon (kiraya, EMI, bill, ration) par, 30% shauk ke kharchon par aur 20% bachat ya nivesh mein. ${inr(30000)} salary par ${inr(split503020(30000).needs)}, ${inr(split503020(30000).wants)} aur ${inr(split503020(30000).savings)}.` },
        { q: 'How do I track daily expenses?', a: 'Log each spend when it happens, with its category and how you paid, then look at the week and month totals against your budget. The app’s daily, weekly and monthly views and recurring entries make this quick.' },
        { q: 'Does the expense tracker work offline?', a: 'Yes. Entries, budgets and reports are kept on your phone, so it works without internet and without an account.' },
        { q: 'How does the 50/30/20 rule work on a ₹30,000 salary?', a: `${inr(split503020(30000).needs)} for needs, ${inr(split503020(30000).wants)} for wants and ${inr(split503020(30000).savings)} for savings each month, or ${inr(split503020(30000).savings * 12)} saved in a year.` },
        { q: 'Can I export my expenses?', a: 'Yes. The app makes PDF reports for any day, week, month, year or date range, and CSV or Excel files of the raw entries.' },
    ],
    related: [
        { href: '/business-tracker', label: 'Daily income and expense app for a shop', note: 'Separate books for your business' },
        { href: '/credit-card-tracker', label: 'Credit card tracker', note: 'Bills, due dates and limits' },
        { href: '/goal-planner', label: 'Goal planner', note: 'Turn the 20% into a target' },
        { href: '/sip', label: 'SIP calculator', note: 'What monthly savings grow to' },
        { href: '/financial-planning', label: 'Financial planning calculator', note: 'Emergency fund and money health score' },
    ],
    disclaimer: { text: 'The 50/30/20 split is a general budgeting guideline, not financial advice, and may not suit every household. Figures are based only on the amounts you enter. FinCalix is not a bank or financial advisor.' },
};
