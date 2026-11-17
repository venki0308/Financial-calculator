/**
 * /capital-gains — primary query "capital gains tax calculator" (SEO_PLAN.md §5c). Every figure comes
 * from the app's computeCapitalGains and CII table (src/utils/calculations.ts).
 * Rules: seo/research/verified-facts-tax.md (sections 2(101), 76, 196, 197, 198 of the Act; CII notification).
 */
import { CII, computeCapitalGains, fyOfDate } from '../../../utils/calculations';
import type { CgAssetType } from '../../../utils/calculations';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const CII_NOTE = { label: 'CII notification for 2026-27', url: 'https://egazette.gov.in/WriteReadData/2026/274522.pdf' };
const CII_TABLE = { label: 'Cost Inflation Index table (Income Tax Department)', url: 'https://wm.incometaxindia.gov.in/w/view-all-cii' };
const FA26 = { label: 'Finance Act, 2026', url: 'https://egazette.gov.in/WriteReadData/2026/271439.pdf' };

const SALE = '2026-11-17';
const cg = (asset: CgAssetType, bought: string, cost: number, sale: number, slab = 30) =>
    computeCapitalGains({ asset, purchaseDate: bought, saleDate: SALE, cost, sale, expenses: 0, improvement: 0, slabRate: slab });

// Headline: ₹5 lakh gain on equity, held over 12 months vs under 12 months.
const eqLong = cg('equity', '2023-06-01', 1000000, 1500000);
const eqShort = cg('equity', '2026-03-01', 1000000, 1500000);

// Property bought June 2015 for ₹40 lakh, sold for ₹90 lakh.
const prop = cg('property', '2015-06-01', 4000000, 9000000);
const PROP_YEARS = ['2005-06-01', '2010-06-01', '2013-06-01', '2015-06-01', '2018-06-01', '2020-06-01', '2022-06-01', '2024-06-01', '2024-09-01'];

// Scenarios.
const debt = cg('debtMF', '2024-02-01', 500000, 600000, 30);
const gold = cg('gold', '2023-01-01', 300000, 420000);
const early = cg('equity', '2025-12-15', 800000, 1000000);
const newFlat = cg('property', '2024-09-01', 6000000, 7500000);

const EQ_GAINS = [100000, 125000, 200000, 300000, 500000, 1000000, 2000000];

function Body() {
    return (
        <>
            <Section title="Rates and holding periods for each kind of asset">
                <DataTable
                    caption="Resident individual, sale in tax year 2026-27 (FY 2026-27), before 4% cess"
                    head={['Asset', 'Long-term if held', 'Short-term gain taxed at', 'Long-term gain taxed at']}
                    rows={[
                        ['Listed shares, equity mutual fund units (STT paid)', 'More than 12 months', '20% (section 196)', '12.5% on gains above ₹1.25 lakh a year (section 198)'],
                        ['Debt fund units bought on or after 1 Apr 2023', 'Never: always short-term (section 76)', 'Your slab rate', '—'],
                        ['Debt fund units bought before 1 Apr 2023 (not listed)', 'More than 24 months', 'Your slab rate', '12.5% (section 197)'],
                        ['Land or building', 'More than 24 months', 'Your slab rate', '12.5%, or 20% with indexation if bought before 23 Jul 2024, whichever is lower'],
                        ['Physical gold, jewellery', 'More than 24 months', 'Your slab rate', '12.5% (section 197)'],
                    ]}
                    note="A debt fund here is one with more than 65% of its money in debt and money-market instruments. Any security listed on an Indian stock exchange becomes long-term after 12 months."
                />
            </Section>

            <Section title="Worked example: equity shares held for three years">
                <p>
                    You bought shares for {amt(1000000)} in June 2023 and sell them for {amt(1500000)} on 17 November 2026. Held more
                    than 12 months, the gain is long-term.
                </p>
                <DataTable
                    caption="Long-term capital gain on listed equity, section 198"
                    head={['Step', 'Amount']}
                    rows={[
                        ['Sale price − purchase price = gain', inr(eqLong.gain)],
                        ['Less the yearly tax-free amount', `− ${inr(eqLong.exemptionUsed)}`],
                        ['Taxable gain', inr(eqLong.taxableGain)],
                        ['Tax at 12.5%', inr(eqLong.tax)],
                        ['+ 4% health and education cess', inr(eqLong.cess)],
                        ['Tax payable', inr(eqLong.totalTax)],
                    ]}
                    note={`Sold within 12 months instead, the whole ${inr(eqShort.gain)} is taxed at 20%: ${inr(eqShort.totalTax)} with cess. Computed with the FinCalix app's capital gains code.`}
                />
            </Section>

            <Section title="Equity gains: long-term against short-term tax">
                <DataTable
                    caption="Tax with 4% cess on a gain from listed shares or equity funds, sold in tax year 2026-27"
                    head={['Gain', 'Held over 12 months', 'Held 12 months or less', 'Difference']}
                    rows={EQ_GAINS.map((g) => {
                        const l = cg('equity', '2023-06-01', 1000000, 1000000 + g);
                        const s = cg('equity', '2026-03-01', 1000000, 1000000 + g);
                        return [amt(g), l.totalTax === 0 ? 'Nil' : inr(l.totalTax), inr(s.totalTax), inr(s.totalTax - l.totalTax)];
                    })}
                    note="The ₹1.25 lakh tax-free amount is for all your long-term equity gains in the year together, not per sale."
                />
            </Section>

            <Section title="Property bought before 23 July 2024: the two routes">
                <p>
                    For land or a building bought before 23 July 2024, a resident individual or HUF pays the lower of two figures:
                    12.5% of the plain gain, or 20% of the gain after indexing the purchase price with the Cost Inflation Index
                    (CII). The CII for 2026-27 is {CII['2026-27']}.
                </p>
                <p>
                    <strong>Example:</strong> a flat bought in June 2015 (CII {CII['2015-16']}) for {amt(4000000)} and sold now for
                    {' '}{amt(9000000)}. Indexed cost = {amt(4000000)} × {CII['2026-27']} ÷ {CII['2015-16']} = {inr(prop.indexedCost ?? 0)}.
                    The route without indexation costs {inr(prop.taxNoIndex)}; with indexation it is 20% of {inr(prop.taxableGain)}, or
                    {' '}{inr(prop.taxIndexed ?? 0)}. The lower one applies, so the tax is {inr(prop.totalTax)} with cess.
                </p>
                <DataTable
                    caption={`Bought for ${amt(4000000)}, sold for ${amt(9000000)} on 17 Nov 2026: tax by year of purchase`}
                    head={['Bought in', 'CII then', '12.5%, no indexation', '20% with indexation', 'Tax payable with cess']}
                    rows={PROP_YEARS.map((d) => {
                        const r = cg('property', d, 4000000, 9000000);
                        const fy = fyOfDate(d);
                        const month = new Date(`${d}T00:00:00Z`).toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
                        return [month, String(CII[fy]), inr(r.taxNoIndex), r.taxIndexed === undefined ? 'Not allowed' : inr(r.taxIndexed), inr(r.totalTax)];
                    })}
                    note="The older the purchase, the more indexation helps. A purchase from 23 July 2024 onwards has only the 12.5% route. Stamp duty, brokerage and improvement costs would lower the gain further."
                />
            </Section>

            <Section title="Four other sales">
                <Scenarios items={[
                    {
                        title: 'Debt fund bought in February 2024',
                        body: <>Units bought for {amt(500000)} and redeemed for {amt(600000)}: because they were bought after 1 April 2023, the {inr(debt.gain)} gain is short-term however long you held them, and at a 30% slab the tax is {inr(debt.totalTax)} with cess.</>,
                    },
                    {
                        title: 'Gold jewellery held almost four years',
                        body: <>Bought in January 2023 for {amt(300000)}, sold for {amt(420000)}. Held over 24 months, the {inr(gold.gain)} gain is long-term at 12.5%: {inr(gold.totalTax)} with cess. Sold within 24 months it would be taxed at your slab rate instead.</>,
                    },
                    {
                        title: 'Shares sold a month too early',
                        body: <>Bought on 15 December 2025 for {amt(800000)}, sold on 17 November 2026 for {amt(1000000)}: short-term, so {inr(early.totalTax)} on the {inr(early.gain)} gain. Waiting {early.insightWaitDays} more days would make it long-term and cut the tax by {inr(early.insightWaitSaving ?? 0)}.</>,
                    },
                    {
                        title: 'Flat bought in September 2024',
                        body: <>Bought for {amt(6000000)}, sold for {amt(7500000)} after {newFlat.holdingMonths} months. It is long-term, but bought after 22 July 2024, so there is no indexation choice: 12.5% of {inr(newFlat.gain)} is {inr(newFlat.totalTax)} with cess.</>,
                    },
                ]} />
            </Section>

            <Section title="What this calculator leaves out">
                <ul>
                    <li><strong>Unused basic exemption.</strong> If your other income is below the tax-free limit, a resident individual can use the shortfall against these gains before the special rate applies (sections 196(2), 197(2) and 198(3)).</li>
                    <li><strong>The rebate.</strong> The new-regime rebate (up to {inr(60000)}) is limited to tax at the normal slab rates (section 156(3)), so it does not cover tax on gains charged at these special rates.</li>
                    <li><strong>Surcharge</strong> above {amt(5000000)} of income, brokerage, and the cost of improvements to a property.</li>
                </ul>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Short-term = held not more than 24 months; 12 months for listed securities, equity-oriented fund units, UTI units and zero-coupon bonds: section 2(101).', source: ACT },
                { text: 'Short-term gain on equity shares, equity-oriented fund units and business-trust units with STT paid: 20%, section 196.', source: ACT },
                { text: 'Long-term gain on such equity: 12.5% on the amount above ₹1,25,000, section 198. Other long-term gains: 12.5%, section 197; land or building bought before 23 July 2024 (resident individual or HUF): tax not above 20% of the indexed gain, section 197(3).', source: ACT },
                { text: 'Units of a fund with more than 65% in debt and money-market instruments, bought on or after 1 April 2023, are always short-term: section 76.', source: ACT },
                { text: 'A resident individual whose other income is below the tax-free limit sets the shortfall against these gains: sections 196(2), 197(2), 198(3). The new-regime rebate cannot exceed tax at the slab rates: section 156(3).', source: ACT },
                { text: 'Cost Inflation Index 384 for 2026-27 (S.O. 3889(E), 15 July 2026); earlier years from the Department’s CII table.', source: CII_NOTE },
                { text: 'Health and education cess 4% on the tax.', source: FA26 },
            ]} />
        </>
    );
}

export const capitalGainsPage: FeatureDef = {
    slug: 'capital-gains',
    title: 'Capital Gains Tax Calculator FY 2026-27: LTCG and STCG',
    description: 'Capital gains tax for FY 2026-27: equity LTCG 12.5% above ₹1.25 lakh, STCG 20%, property indexation choice, debt funds and gold, with examples.',
    h1: 'Capital gains tax calculator for shares, funds, property and gold',
    crumb: 'Capital gains tax',
    category: 'tax',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Capital Gains Tax',
    eyebrow: 'Income tax · capital gains · tax year 2026-27',
    answer: (
        <>
            <p>A {inr(eqLong.gain)} gain on shares or equity funds held more than 12 months costs {inr(eqLong.totalTax)} in tax for FY 2026-27: the first {inr(125000)} is tax-free and the rest is taxed at 12.5% (section 198 of the Income-tax Act, 2025), plus 4% cess.</p>
            <p>Sell within 12 months and the same gain is short-term at 20% under section 196: {inr(eqShort.totalTax)}. Property and gold become long-term after 24 months.</p>
        </>
    ),
    sources: [ACT, CII_NOTE, CII_TABLE],
    calc: { key: 'capital-gains', props: { asset: 'equity', cost: 1000000, sale: 1500000, months: 30, slab: 30 } },
    Body,
    faqs: [
        {
            q: 'What is the LTCG tax rate for FY 2026-27?',
            a: `12.5% for long-term gains, plus 4% cess. On listed shares and equity funds, the first ${inr(125000)} of long-term gains in the year is tax-free (section 198); on property, gold and older debt funds the 12.5% applies to the whole gain (section 197).`,
        },
        {
            q: 'What is the STCG tax rate on shares in FY 2026-27?',
            a: `20% under section 196, for listed equity shares and equity-fund units sold within 12 months with STT paid. A ${inr(eqShort.gain)} short-term gain costs ${inr(eqShort.totalTax)} with cess. Short-term gains on other assets are added to your income and taxed at your slab rate.`,
        },
        {
            q: 'Is long-term capital gain up to ₹1.25 lakh tax-free?',
            a: 'Yes, for listed equity shares, equity-oriented fund units and business-trust units with STT paid. The ₹1,25,000 is for all such long-term gains in the tax year together; there is no such limit for property, gold or debt funds.',
        },
        {
            q: 'LTCG tax kitna lagta hai?',
            a: `Shares aur equity mutual fund par, 12 mahine se zyada rakhne ke baad, saal ke pehle ${inr(125000)} ke gain par koi tax nahi; uske upar 12.5% aur 4% cess. Jaise ${inr(eqLong.gain)} ke gain par ${inr(eqLong.totalTax)} tax banta hai. Property aur gold par 24 mahine baad 12.5% lagta hai.`,
        },
        {
            q: 'Can I still claim indexation on property?',
            a: 'Only for land or a building bought before 23 July 2024, and only as a resident individual or HUF. Your tax is then the lower of 12.5% without indexation and 20% with indexation (section 197(3)). Property bought on or after that date has only the 12.5% route.',
        },
        {
            q: 'How are debt mutual funds taxed now?',
            a: 'Units of a fund with more than 65% in debt, bought on or after 1 April 2023, are always short-term under section 76, so the gain is taxed at your slab rate whatever the holding period. Units bought before that date are long-term after 24 months and taxed at 12.5%.',
        },
        {
            q: 'Does the ₹12 lakh tax rebate cover capital gains?',
            a: 'No. In the new regime the rebate under section 156(2) is limited to tax at the normal slab rates (section 156(3)), so tax on gains charged at special rates, such as 20% and 12.5% on shares and equity funds, stays payable. A person with a modest salary can still owe tax on a large equity gain.',
        },
    ],
    related: [
        { href: '/income-tax', label: 'Income tax calculator FY 2026-27', note: 'Tax on your salary and other income' },
        { href: '/elss', label: 'ELSS calculator', note: 'Tax-saving equity funds and their lock-in' },
        { href: '/lumpsum', label: 'Lumpsum calculator', note: 'What a one-time investment grows to' },
        { href: '/property-appreciation', label: 'Property appreciation calculator', note: 'How much your property has gained' },
        { href: '/old-vs-new-tax-regime', label: 'Old vs new tax regime', note: 'Which regime suits your salary' },
    ],
    disclaimer: { text: 'Capital gains figures are estimates for a resident individual selling on 17 November 2026, at the rates in the Income-tax Act, 2025 for tax year 2026-27 with 4% cess. They leave out surcharge, brokerage, improvement costs, the unused basic exemption and set-off of losses. Your broker’s or fund’s capital gains statement and your return decide the tax. FinCalix is not a tax advisor; consult a Chartered Accountant for your return.' },
};
