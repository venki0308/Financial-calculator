/**
 * /break-even — primary query "break even point calculator" (SEO_PLAN.md §5e). Figures: the app's
 * break-even formula (features/math-planning.breakEven / profitAt, copied from
 * src/pages/BreakEvenCalculator.tsx). Tax dates for business owners: seo/research/verified-facts-2026-11-17.md.
 */
import { breakEven, profitAt } from '../math-planning';
import { inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025 (Gazette)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const FA26 = { label: 'Finance Act, 2026 (Gazette)', url: 'https://egazette.gov.in/WriteReadData/2026/271439.pdf' };

/** The app's starting example: ₹50,000 fixed, ₹200 price, ₹120 variable cost. */
const F = 50000, P = 200, V = 120;
const base = breakEven(F, P, V);

/** Small-business cases (monthly fixed costs; prices and costs per unit). */
const TEA = { fixed: 30000, price: 15, variable: 6 };
const TAILOR = { fixed: 25000, price: 600, variable: 250 };
const BAKERY = { fixed: 60000, price: 450, variable: 270 };
const tea = breakEven(TEA.fixed, TEA.price, TEA.variable);
const tailor = breakEven(TAILOR.fixed, TAILOR.price, TAILOR.variable);
const bakery = breakEven(BAKERY.fixed, BAKERY.price, BAKERY.variable);
const DAYS = 30;
const teaPerDay = Math.ceil(tea.breakEvenUnits / DAYS);

/** What a price rise or a rent rise does to the base case. */
const pricedUp = breakEven(F, 220, V);
const rentUp = breakEven(F + 10000, P, V);
const loss = breakEven(20000, 100, 110);

function Body() {
    const fixedRange = [20000, 50000, 100000, 200000];
    const margins = [20, 40, 60, 80, 100, 150];
    const rows = base.projection.filter((_, i) => i % 2 === 0);
    return (
        <>
            <Section title="How the break-even point is calculated">
                <p>Every unit you sell brings in its price but also costs you its variable cost. What is left over, the contribution, goes first towards rent, wages and other costs that stay the same however much you sell. Break-even is reached when those contributions add up to the fixed costs.</p>
                <ol className="steps">
                    <li>Contribution per unit = price − variable cost = {inr(P)} − {inr(V)} = {inr(base.contribution)}.</li>
                    <li>Contribution margin = {inr(base.contribution)} ÷ {inr(P)} = {base.marginPct}% of every sale.</li>
                    <li>Break-even units = fixed costs ÷ contribution = {inr(F)} ÷ {inr(base.contribution)}, rounded up to {base.breakEvenUnits.toLocaleString('en-IN')} units.</li>
                    <li>Break-even sales = {base.breakEvenUnits.toLocaleString('en-IN')} × {inr(P)} = {inr(base.breakEvenSales)}. Unit {(base.breakEvenUnits + 1).toLocaleString('en-IN')} onwards, each sale adds {inr(base.contribution)} of profit.</li>
                </ol>
            </Section>

            <Section title="Profit and loss around break-even">
                <DataTable
                    caption={`Fixed costs ${inr(F)}, price ${inr(P)}, variable cost ${inr(V)} a unit`}
                    head={['Units sold', 'Sales', 'Total cost', 'Profit or loss']}
                    rows={rows.map((r) => [r.units.toLocaleString('en-IN'), inr(r.revenue), inr(r.totalCost), inr(r.profit)])}
                    note="Total cost = fixed costs + units × variable cost. The app shows this table in finer steps, from zero up to twice the break-even volume, with a chart of sales against costs."
                />
            </Section>

            <Section title="Break-even units by fixed costs and margin per unit">
                <DataTable
                    caption="Units a month needed to cover fixed costs"
                    head={['Contribution per unit', ...fixedRange.map((f) => `Fixed ${inr(f)}`)]}
                    rows={margins.map((m) => [inr(m), ...fixedRange.map((f) => breakEven(f, m + 100, 100).breakEvenUnits.toLocaleString('en-IN'))])}
                    note="Only the gap between price and variable cost matters for the unit count; the price itself changes the sales figure."
                />
            </Section>

            <Section title="Worked examples for small businesses">
                <Scenarios items={[
                    { title: 'Tea stall', body: <>Rent and a helper cost {inr(TEA.fixed)} a month. A cup sells for {inr(TEA.price)} and milk, tea, sugar and gas cost {inr(TEA.variable)}. The stall needs {tea.breakEvenUnits.toLocaleString('en-IN')} cups a month, about {teaPerDay} a day over {DAYS} days, before it earns anything.</> },
                    { title: 'Tailoring unit', body: <>Fixed costs of {inr(TAILOR.fixed)}, {inr(TAILOR.price)} charged per blouse, {inr(TAILOR.variable)} of lining, thread and the karigar’s piece rate: {tailor.breakEvenUnits} blouses a month cover the costs, sales of {inr(tailor.breakEvenSales)}.</> },
                    { title: 'Home bakery', body: <>With {inr(BAKERY.fixed)} of fixed costs and cakes at {inr(BAKERY.price)} that cost {inr(BAKERY.variable)} to bake, {bakery.breakEvenUnits} cakes ({inr(bakery.breakEvenSales)}) is the line between loss and profit.</> },
                    { title: 'Price below cost', body: <>Selling at {inr(100)} something that costs {inr(110)} to make loses {inr(-loss.contribution)} on every unit, so no sales volume ever covers the {inr(20000)} of fixed costs. The app flags this case instead of showing a number.</> },
                ]} />
            </Section>

            <Section title="Raise the price or cut the rent?">
                <p>
                    In the base case, raising the price from {inr(P)} to {inr(220)} lifts the contribution to {inr(pricedUp.contribution)} and brings break-even down
                    from {base.breakEvenUnits} to {pricedUp.breakEvenUnits} units. A {inr(10000)} rise in rent works the other way: break-even climbs
                    to {rentUp.breakEvenUnits} units. At twice the break-even volume the base case earns {inr(profitAt(base.breakEvenUnits * 2, F, P, V))};
                    small changes to price or variable cost move that profit more than most owners expect.
                </p>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Break-even here is a planning figure, not an accounting or tax figure: it ignores depreciation, GST and income tax. Use prices and costs before GST if you are registered, since GST collected is not your income.' },
                { text: 'Advance tax: a business that declares presumptive income pays all of it by 15 March; others pay 15%, 45%, 75% and 100% by 15 June, 15 September, 15 December and 15 March (section 408 of the Income-tax Act, 2025).', source: ACT },
                { text: 'Return due date for tax year 2026-27: 31 August 2027 for a business that does not need a tax audit, 31 October 2027 if it does (section 263(1)(c) as substituted by the Finance Act, 2026).', source: FA26 },
            ]} />
        </>
    );
}

export const breakEvenPage: FeatureDef = {
    slug: 'break-even',
    title: 'Break Even Point Calculator: Units, Sales and Profit',
    description: 'Find how many units you must sell to cover fixed costs, with the break-even formula, a profit table and worked examples for a tea stall, tailor and bakery.',
    h1: 'Break-even point calculator for a small business',
    crumb: 'Break-even',
    category: 'utilities',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Break Even',
    eyebrow: 'Business planning · Break-even analysis',
    answer: (
        <>
            <p>With {inr(F)} of fixed costs a month, a product selling at {inr(P)} that costs {inr(V)} to make must sell {base.breakEvenUnits.toLocaleString('en-IN')} units, or {inr(base.breakEvenSales)} of sales, before the business makes a profit.</p>
            <p>The formula is fixed costs ÷ (price − variable cost per unit), rounded up. Here each sale contributes {inr(base.contribution)}, a {base.marginPct}% contribution margin.</p>
        </>
    ),
    sources: [ACT, FA26],
    calc: { key: 'break-even', props: { fixed: F, price: P, variable: V } },
    Body,
    faqs: [
        { q: 'What is the break-even point formula?', a: `Break-even units = fixed costs ÷ (selling price − variable cost per unit). With ${inr(F)} of fixed costs and a ${inr(base.contribution)} margin per unit, that is ${base.breakEvenUnits} units.` },
        { q: 'How do I find break-even sales in rupees?', a: `Multiply the break-even units by the price: ${base.breakEvenUnits} × ${inr(P)} = ${inr(base.breakEvenSales)}. You can also divide fixed costs by the contribution margin (${base.marginPct}%).` },
        { q: 'What counts as a fixed cost for a shop?', a: 'Costs that do not change with daily sales: rent, salaried staff, shop EMI, electricity minimum charges, software and licence fees. Stock, packing material and per-piece wages are variable costs.' },
        { q: 'What if my price is lower than my variable cost?', a: 'Then you never break even, because every extra sale adds to the loss. Raise the price, cut the cost per unit, or drop that product.' },
        { q: 'Break even point kaise nikale?', a: `Fixed kharche ko (bechne ki keemat − har unit ka variable kharcha) se bhaag dijiye. Jaise ${inr(F)} fixed kharcha, ${inr(P)} keemat aur ${inr(V)} lagat ho to ${base.breakEvenUnits} unit bechne par na faayda na nuksaan; uske baad har unit par ${inr(base.contribution)} munaafa.` },
        { q: 'Does the break-even figure include GST and income tax?', a: 'No. It is a before-tax planning figure. Enter prices and costs without GST if you are registered, and remember income tax is due on the profit above break-even.' },
    ],
    related: [
        { href: '/business-tracker', label: 'Daily business income and expense tracker', note: 'Check actual sales against break-even' },
        { href: '/gst', label: 'GST calculator', note: 'Add or remove GST from a price' },
        { href: '/personal-loan', label: 'Personal loan EMI calculator', note: 'If the fixed costs include a loan' },
        { href: '/income-tax-due-dates', label: 'Income tax due dates', note: 'Advance tax and return deadlines' },
    ],
    disclaimer: { text: 'Break-even figures use only the fixed costs, price and variable cost you enter. They leave out GST, income tax, depreciation, credit sales and seasonal demand. FinCalix is not an accountant or business advisor; check important decisions with a Chartered Accountant.' },
};
