/**
 * /gst — primary query "gst calculator" (SEO_PLAN.md §5c). Figures: the app's GST screen formula
 * (math-tax.gstStandard). §8 contested rule (slab structure after the 2025 rationalisation) resolved
 * from the GST Council / PIB releases and Notification 9/2025-Integrated Tax (Rate).
 * Facts: seo/research/verified-facts-tax.md.
 */
import { gstStandard } from '../math-tax';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const GSTC = { label: 'GST Council: 56th meeting recommendations (PIB, 3 Sep 2025)', url: 'https://gstcouncil.gov.in/sites/default/files/2025-09/press_release_press_information_bureau_0.pdf' };
const PIB25 = { label: 'PIB: GST Reforms 2025 (4 Sep 2025)', url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/sep/doc202594628401.pdf' };
const PIB26 = { label: 'PIB: Next-Gen GST Process Reforms (9 Oct 2026)', url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/oct/doc_10142_20261009_21430401.pdf' };
const IGST9 = { label: 'Notification 9/2025-Integrated Tax (Rate), copy on cbic.gov.in', url: 'https://courier.cbic.gov.in/ECCS/advisory/2025/NOTIFICATION%20NO.%209_2025-INTEGRATED%20TAX%20(RATE)%20-1759486719.pdf' };

/** Rupees, with paise only when the amount is not a whole rupee. */
const rs = (n: number) => {
    const v = Math.round(n * 100) / 100;
    return '₹' + v.toLocaleString('en-IN', Number.isInteger(v) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const pc = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString('en-IN')}%`;
const g = (amount: number, rate: number, dir: 'add' | 'remove') => gstStandard(amount, rate, dir)!;

const add18 = g(10000, 18, 'add');
const out18 = g(11800, 18, 'remove');
const out5 = g(1050, 5, 'remove');

// Scenarios.
const tv = g(47200, 18, 'remove');
const jewel = g(100000, 3, 'add');
const car = g(1500000, 40, 'add');
const before = g(1000, 12, 'add');
const after = g(1000, 5, 'add');
const shampoo = g(105, 5, 'remove');

const RATES = [5, 18, 40, 3];
const TOTALS = [100, 500, 1000, 2500, 5000, 10000, 25000, 100000];
const PRICES = [100, 999, 1500, 5000, 20000, 50000, 100000];

function Body() {
    return (
        <>
            <Section title="The two formulas">
                <ol className="steps">
                    <li><strong>Adding GST to a price:</strong> GST = price × rate ÷ 100, and the bill = price + GST. At 18%, {rs(10000)} becomes {rs(add18.total)}, of which {rs(add18.gst)} is GST.</li>
                    <li><strong>Taking GST out of a total that already includes it:</strong> price = total × 100 ÷ (100 + rate), and GST = total − price. From a bill of {rs(11800)} at 18%: {rs(11800)} × 100 ÷ 118 = {rs(out18.base)}, so the GST inside it is {rs(out18.gst)}.</li>
                </ol>
                <p>
                    The common mistake is to take 18% of the total: 18% of {rs(11800)} is {rs(11800 * 0.18)}, more than the {rs(out18.gst)} actually charged.
                    The same rule works at any rate: a {rs(1050)} bill at 5% hides {rs(out5.gst)} of GST on a {rs(out5.base)} price.
                </p>
            </Section>

            <Section title="Divisors and the GST share of a bill">
                <DataTable
                    caption="To find the price before GST, divide the total by the divisor"
                    head={['GST rate', 'Divide the total by', 'GST as a share of the total', 'GST in a ₹1,000 bill']}
                    rows={RATES.map((r) => {
                        const x = g(1000, r, 'remove');
                        return [`${r}%`, String(1 + r / 100), pc((x.gst / x.total) * 100), rs(x.gst)];
                    })}
                    note="Share of the total = rate ÷ (100 + rate). Computed with the FinCalix app's GST formula."
                />
            </Section>

            <Section title="Price before GST for common bill totals">
                <DataTable
                    caption="GST-inclusive total → price before GST, at each rate"
                    head={['Total paid', 'At 5%', 'At 18%', 'At 40%', 'At 3%']}
                    rows={TOTALS.map((t) => [rs(t), ...RATES.map((r) => rs(g(t, r, 'remove').base))])}
                />
                <DataTable
                    caption="Price before GST → total with GST, at each rate"
                    head={['Price', 'At 5%', 'At 18%', 'At 40%', 'At 3%']}
                    rows={PRICES.map((p) => [rs(p), ...RATES.map((r) => rs(g(p, r, 'add').total))])}
                />
            </Section>

            <Section title="The GST rate structure since 22 September 2025">
                <p>
                    On the GST Council’s recommendation at its 56th meeting (3 September 2025), the four main rates of 5%, 12%, 18% and
                    28% gave way to two: a merit rate of <strong>5%</strong> and a standard rate of <strong>18%</strong>, with a special
                    rate of <strong>40%</strong> for a short list of goods and services. The new rates for services and for almost
                    all goods applied from 22 September 2025; the Council kept pan masala, cigarettes and some other tobacco products
                    on their earlier rates and compensation cess until the cess account’s loans are repaid. A PIB note of 9 October
                    2026 describes the same structure.
                </p>
                <DataTable
                    caption="Rates in Notification 9/2025-Integrated Tax (Rate) and the Council’s decisions (examples)"
                    head={['Rate', 'Examples']}
                    rows={[
                        ['5%', 'Hair oil, soap bars, shampoo, toothbrushes; many packaged foods; tractors and farm machinery; most medicines (33 life-saving drugs: nil)'],
                        ['18%', 'The standard rate: TVs, air-conditioners, cement, small cars and motorcycles up to 350 cc (all cut from 28%), and goods not listed in another schedule'],
                        ['40%', 'Sweetened and aerated drinks, larger cars, motorcycles above 350 cc, yachts, aircraft for personal use'],
                        ['3%', 'Gold, silver, platinum, jewellery and coins'],
                        ['0.25% / 1.5%', 'Rough diamonds and precious stones / other diamonds'],
                        ['Nil', 'Individual life and health insurance policies (exempt since 22 Sep 2025)'],
                    ]}
                    note="Whether a particular item falls in a rate depends on its tariff heading in the notification; the examples are from the Council’s and PIB’s releases."
                />
            </Section>

            <Section title="Five bills, worked out">
                <Scenarios items={[
                    {
                        title: `A TV billed at ${rs(47200)}`,
                        body: <>TVs are now at 18%. {rs(47200)} ÷ 1.18 = {rs(tv.base)} before tax, so the GST in the bill is {rs(tv.gst)}.</>,
                    },
                    {
                        title: 'Gold jewellery worth ₹1 lakh',
                        body: <>Jewellery is taxed at 3%: GST of {rs(jewel.gst)} brings the bill to {rs(jewel.total)}.</>,
                    },
                    {
                        title: 'A larger car at 40%',
                        body: <>On a price of {rs(1500000)} before tax, GST at 40% is {rs(car.gst)}, for {rs(car.total)} in all. Cars within the small-car limits are at 18% instead.</>,
                    },
                    {
                        title: 'An item moved from 12% to 5%',
                        body: <>A {rs(1000)} item that used to carry 12% cost {rs(before.total)}; at 5% it costs {rs(after.total)}, {rs(before.total - after.total)} less.</>,
                    },
                    {
                        title: 'Shampoo for ₹105',
                        body: <>At 5%, {rs(105)} × 100 ÷ 105 = {rs(shampoo.base)} before tax and {rs(shampoo.gst)} of GST.</>,
                    },
                ]} />
            </Section>

            <Section title="More GST tools in the app">
                <p>
                    Besides adding and removing GST, the GST calculator in the FinCalix app builds a bill with several items at
                    different rates, nets input tax credit against GST on sales, and works out profit margin with GST. Your
                    financial data stays on your device.
                </p>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Two-rate structure: 5% (merit) and 18% (standard), with a special 40% rate for select goods and services; services and almost all goods from 22 September 2025; pan masala, cigarettes and some tobacco products stay on earlier rates and compensation cess until the cess loans are repaid; individual life and health insurance exempt.', source: GSTC },
                { text: 'The earlier 12% and 28% rates removed; 40% for goods such as pan masala, tobacco, aerated drinks, high-end cars, yachts and private aircraft.', source: PIB25 },
                { text: 'Integrated tax rates of 5%, 18%, 40%, 3% (gold, silver, jewellery), 0.25% and 1.5% (precious stones, diamonds) by schedule, from 22 September 2025.', source: IGST9 },
                { text: 'The structure of 5%, 18% and a special 40% rate, as described in October 2026.', source: PIB26 },
            ]} />
        </>
    );
}

export const gstPage: FeatureDef = {
    slug: 'gst',
    title: 'GST Calculator: Add or Remove GST (5%, 18%, 40%)',
    description: 'GST calculator: add GST to a price or take it out of a total, divisors for 5%, 18% and 40%, tables of common bills, and the rates since 22 Sep 2025.',
    h1: 'GST calculator: add GST to a price or remove it from a total',
    crumb: 'GST calculator',
    category: 'tax',
    updated: '2026-11-17',
    analyticsTitle: 'Website - GST',
    eyebrow: 'GST · rates since 22 September 2025',
    answer: (
        <>
            <p>To add 18% GST to {rs(10000)}, take 18% of it: {rs(add18.gst)} of GST and a bill of {rs(add18.total)}. To take GST out of a total, divide by 1 plus the rate: {rs(11800)} ÷ 1.18 = {rs(out18.base)}, so {rs(out18.gst)} of that bill is GST.</p>
            <p>Since 22 September 2025 most goods and services are taxed at 5% or 18%, with a special 40% rate for a short list, on the GST Council’s recommendation of 3 September 2025.</p>
        </>
    ),
    sources: [GSTC, PIB25, IGST9, PIB26],
    calc: { key: 'gst', props: { direction: 'add', amount: 10000, rate: '18' } },
    Body,
    faqs: [
        {
            q: 'How do I calculate GST from the total amount?',
            a: `Divide the total by (1 + rate ÷ 100) to get the price before GST, then subtract it from the total. At 18%, ${rs(11800)} ÷ 1.18 = ${rs(out18.base)}, so the GST is ${rs(out18.gst)}. Taking 18% of the total would overstate it.`,
        },
        {
            q: 'What is the formula to add GST to a price?',
            a: `GST = price × rate ÷ 100, and the amount payable = price + GST. On ${rs(10000)} at 18%, GST is ${rs(add18.gst)} and the total ${rs(add18.total)}.`,
        },
        {
            q: 'GST kaise nikale formula?',
            a: `Agar price mein GST jodna hai: GST = price × rate ÷ 100. Agar total mein se GST nikalna hai: asli price = total × 100 ÷ (100 + rate), aur GST = total − asli price. Jaise ${rs(1050)} ke bill mein 5% GST ho to asli price ${rs(out5.base)} aur GST ${rs(out5.gst)} hai.`,
        },
        {
            q: 'What are the GST slabs now?',
            a: 'Two main rates, 5% and 18%, and a special 40% rate for a short list of goods and services such as aerated drinks, larger cars and yachts, in force since 22 September 2025. Gold, silver and jewellery are at 3%, and diamonds and precious stones at 0.25% or 1.5%.',
        },
        {
            q: 'Are the 12% and 28% GST slabs removed?',
            a: 'Yes, as main rates: the GST Council moved items from 12% and 28% into the 5%, 18% or 40% rates from 22 September 2025. It kept pan masala, cigarettes and some tobacco products on their earlier rates and compensation cess until the cess account’s loans are repaid.',
        },
        {
            q: 'Is there GST on health and life insurance?',
            a: 'No, not on individual policies: the GST Council exempted all individual life and health insurance policies, including family floater and senior-citizen health policies, from 22 September 2025.',
        },
    ],
    related: [
        { href: '/business-tracker', label: 'Business tracker', note: 'Record sales and expenses for a small business' },
        { href: '/break-even', label: 'Break-even calculator', note: 'Units you must sell to cover costs' },
        { href: '/credit-card-interest', label: 'Credit card interest calculator', note: 'Interest and the 18% GST on card charges' },
        { href: '/expense-tracker', label: 'Expense tracker', note: 'Track what you spend, GST included' },
        { href: '/income-tax', label: 'Income tax calculator FY 2026-27', note: 'Tax on your salary for the year' },
    ],
    disclaimer: { text: 'GST figures apply the rate you choose to the amount you enter. The rate for a particular item or service depends on its classification in the GST rate notifications and can change on the GST Council’s recommendation; check the invoice or ask a GST practitioner. FinCalix is not affiliated with CBIC or the GST Council.' },
};
