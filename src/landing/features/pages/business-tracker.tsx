/**
 * /business-tracker — primary query "daily income expense app for shop" (SEO_PLAN.md §5e). App claims
 * checked against src/pages/business/BusinessTracker.tsx, BusinessDetail.tsx and src/utils/businessStorage.ts.
 * Figures: the app's calcBizTotals (src/utils/businessStorage.ts) and profit margin (math-planning.bizMargin,
 * copied from BusinessDetail.tsx). Tax dates: seo/research/verified-facts-2026-11-17.md.
 */
import { BIZ_EXPENSE_CATEGORIES, BIZ_INCOME_CATEGORIES, BUSINESS_TYPES, BUSINESS_TYPE_META, calcBizTotals, type BizEntry } from '../../../utils/businessStorage';
import { bizMargin } from '../math-planning';
import { monthEntries } from '../calcs/c/business-tracker';
import { inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025 — advance tax (section 408)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const FA26 = { label: 'Finance Act, 2026 — return due dates (section 263)', url: 'https://egazette.gov.in/WriteReadData/2026/271439.pdf' };

const entry = (type: 'income' | 'expense', amount: number, category: string, note: string): BizEntry =>
    ({ id: `${category}-${amount}`, businessId: 'kirana', date: '2026-11-17', type, amount, category, note, createdAt: '2026-11-17T00:00:00.000Z' });
const catLabel = (id: string) => [...BIZ_EXPENSE_CATEGORIES, ...BIZ_INCOME_CATEGORIES].find((c) => c.id === id)?.label ?? id;

/** One day at a kirana shop. */
const DAY: BizEntry[] = [
    entry('income', 14200, 'sales', 'Counter sales, cash and UPI'),
    entry('income', 1800, 'online', 'Home-delivery orders'),
    entry('expense', 10500, 'ingredients', 'Stock from the wholesaler'),
    entry('expense', 350, 'transport', 'Auto to the market'),
    entry('expense', 250, 'packaging', 'Carry bags'),
];
const day = calcBizTotals(DAY);
const dayMargin = bizMargin(day.income, day.net) ?? 0;

/** The calculator's starting month: ₹15,000 sales and ₹11,000 stock a day for 26 days, with fixed costs. */
const M = { sales: 15000, stock: 11000, days: 26, rent: 20000, staff: 30000, other: 6000 };
const month = calcBizTotals(monthEntries(M.sales, M.stock, M.days, M.rent, M.staff, M.other));
const monthMargin = bizMargin(month.income, month.net) ?? 0;
const fixed = M.rent + M.staff + M.other;

const TYPE_LABELS = BUSINESS_TYPES.map((b) => BUSINESS_TYPE_META[b].label.toLowerCase());
const TYPES = `a ${TYPE_LABELS.slice(0, -1).join(', ')} or ${TYPE_LABELS[TYPE_LABELS.length - 1]}`;

const m1 = (v: number) => `${(Math.round(v * 10) / 10).toLocaleString('en-IN')}%`;

function Body() {
    const salesLevels = [8000, 12000, 15000, 20000, 30000];
    const slowMonth = calcBizTotals(monthEntries(11000, 8200, 26, M.rent, M.staff, M.other));
    const cafe = calcBizTotals(monthEntries(9000, 4000, 30, 25000, 45000, 9000));
    const salon = calcBizTotals(monthEntries(6000, 900, 26, 15000, 40000, 5000));
    return (
        <>
            <Section title="What the Business Tracker records">
                <ul>
                    <li><strong>One book per business:</strong> add as many as you run, each marked as {TYPES} business. Shop and home money stay apart from your personal expense tracker.</li>
                    <li><strong>Income entries:</strong> {BIZ_INCOME_CATEGORIES.map((c) => c.label).join(', ')}.</li>
                    <li><strong>Expense entries:</strong> {BIZ_EXPENSE_CATEGORIES.map((c) => c.label).join(', ')}.</li>
                    <li><strong>Every entry</strong> has a date (you can fill in a missed day later), an amount, a category and an optional note.</li>
                    <li><strong>Daily, weekly, monthly and yearly views</strong> with income, expenses, net profit and profit margin, an expense breakdown by category, and a month-by-month table in the yearly view.</li>
                    <li><strong>PDF and Excel export</strong> for any period, to share with your accountant or partner. No login, and the data stays on your phone.</li>
                </ul>
            </Section>

            <Section title="A day’s hisab, worked out">
                <DataTable
                    caption="One day at a kirana shop, as entered in the app"
                    head={['Entry', 'Category', 'Income', 'Expense']}
                    rows={DAY.map((e) => [e.note ?? '', catLabel(e.category), e.type === 'income' ? inr(e.amount) : '', e.type === 'expense' ? inr(e.amount) : ''])}
                />
                <ol className="steps">
                    <li>Income = {DAY.filter((e) => e.type === 'income').map((e) => inr(e.amount)).join(' + ')} = {inr(day.income)}.</li>
                    <li>Expenses = {DAY.filter((e) => e.type === 'expense').map((e) => inr(e.amount)).join(' + ')} = {inr(day.expenses)}.</li>
                    <li>Net profit = {inr(day.income)} − {inr(day.expenses)} = {inr(day.net)}.</li>
                    <li>Profit margin = {inr(day.net)} ÷ {inr(day.income)} = {m1(dayMargin)}. Rent and salaries are not in this day; they show up when you look at the month.</li>
                </ol>
            </Section>

            <Section title="Monthly profit by daily sales">
                <DataTable
                    caption={`${M.days} days open; stock at the same share of sales as the example; rent ${inr(M.rent)}, staff ${inr(M.staff)}, other ${inr(M.other)}`}
                    head={['Sales a day', 'Income in the month', 'Expenses', 'Net profit', 'Margin']}
                    rows={salesLevels.map((sl) => {
                        const st = Math.round(sl * (M.stock / M.sales));
                        const t = calcBizTotals(monthEntries(sl, st, M.days, M.rent, M.staff, M.other));
                        const mg = bizMargin(t.income, t.net);
                        return [inr(sl), inr(t.income), inr(t.expenses), inr(t.net), mg === null ? '—' : m1(mg)];
                    })}
                    note={`Fixed costs of ${inr(fixed)} a month do not shrink in a slow month, so profit falls faster than sales.`}
                />
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: 'A slow month for the same shop', body: <>Sales drop to {inr(11000)} a day with stock at {inr(8200)}: income {inr(slowMonth.income)}, expenses {inr(slowMonth.expenses)}, net {inr(slowMonth.net)}. The tracker’s monthly view shows that the fixed {inr(fixed)} is eating most of the margin.</> },
                    { title: 'A small café open every day', body: <>{inr(9000)} of sales and {inr(4000)} of ingredients a day for 30 days, with {inr(25000)} rent, {inr(45000)} wages and {inr(9000)} of bills: net {inr(cafe.net)}, a margin of {m1(bizMargin(cafe.income, cafe.net) ?? 0)}.</> },
                    { title: 'A salon (services)', body: <>{inr(6000)} a day from services and {inr(900)} of products, {inr(15000)} rent and {inr(40000)} for two stylists: net {inr(salon.net)} on income of {inr(salon.income)}.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'For tax year 2026-27, the income-tax return of a business that is not liable to audit is due by 31 August 2027 (by 31 October 2027 with an audit).', source: FA26 },
                { text: 'Advance tax on business income is paid in four parts — 15%, 45%, 75% and 100% by 15 June, 15 September, 15 December and 15 March. If you declare presumptive income, the whole amount is due by 15 March.', source: ACT },
                { text: 'The tracker’s profit is cash in minus cash out for the period you choose. It is not taxable profit: depreciation, stock left unsold and money owed to or by you are not counted.' },
            ]} />
        </>
    );
}

export const businessTracker: FeatureDef = {
    slug: 'business-tracker',
    title: 'Daily Income Expense App for Shop: Business Tracker',
    description: 'Keep a shop’s daily hisab: sales, stock, rent and wages, with daily to yearly profit and margin, PDF and Excel export, and a worked kirana example.',
    h1: 'Daily income and expense app for your shop',
    crumb: 'Business tracker',
    category: 'goals',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Business Tracker',
    eyebrow: 'Small business · Daily hisab',
    answer: (
        <>
            <p>A shop selling {inr(M.sales)} a day for {M.days} days and spending {inr(M.stock)} a day on stock, with {inr(fixed)} of rent, wages and bills, makes a net profit of {inr(month.net)} for the month: a {m1(monthMargin)} margin on {inr(month.income)} of income.</p>
            <p>The FinCalix Business Tracker records each day’s income and expenses by category and shows profit and margin by day, week, month or year. For tax year 2026-27, a business without a tax audit files its return by 31 August 2027.</p>
        </>
    ),
    sources: [FA26, ACT],
    calc: { key: 'business-tracker', props: { sales: M.sales, stock: M.stock, days: M.days, rent: M.rent, staff: M.staff, other: M.other } },
    Body,
    faqs: [
        { q: 'Which app is good for a shop’s daily income and expenses?', a: 'One that keeps the shop’s money apart from your personal spending and totals it by day and month. The FinCalix Business Tracker does that for each business you add, with profit, margin and PDF or Excel export, without a login.' },
        { q: 'Dukaan ka roz ka hisab kaise rakhein?', a: `Har din ki bikri ko income aur maal, kiraya, staff ki salary jaise kharchon ko expense mein likhiye. Jaise ${inr(day.income)} ki bikri aur ${inr(day.expenses)} ke kharche par us din ka munaafa ${inr(day.net)} hua. FinCalix ka Business Tracker yeh hisab din, hafte, mahine aur saal ke hisaab se jodta hai.` },
        { q: 'How do I calculate my shop’s monthly profit?', a: `Add all income for the month and subtract every expense, including rent and wages. In the example above: ${inr(month.income)} − ${inr(month.expenses)} = ${inr(month.net)}.` },
        { q: 'What is profit margin?', a: `Net profit as a share of income. ${inr(month.net)} of profit on ${inr(month.income)} of sales is a ${m1(monthMargin)} margin.` },
        { q: 'Can I track more than one business?', a: 'Yes. Each business gets its own book with its own entries and reports; deleting a business removes its entries with it.' },
        { q: 'Is the tracker’s profit the same as taxable income?', a: 'No. It is cash in minus cash out. Taxable profit also adjusts for depreciation, closing stock and money owed to or by you; ask your accountant.' },
    ],
    related: [
        { href: '/break-even', label: 'Break-even point calculator', note: 'Sales needed to cover fixed costs' },
        { href: '/expense-tracker', label: 'Personal expense tracker', note: 'Household spending, kept separate' },
        { href: '/gst', label: 'GST calculator', note: 'Prices with and without GST' },
        { href: '/income-tax-due-dates', label: 'Income tax due dates', note: 'Advance tax and return deadlines' },
    ],
    disclaimer: { text: 'Profit and margin are simple totals of the income and expenses you enter. They are not accounts prepared under accounting standards and are not taxable income. FinCalix is not an accountant or tax advisor; consult a Chartered Accountant for your books and returns.' },
};
