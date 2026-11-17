/**
 * /hra — primary query "hra exemption calculator" (SEO_PLAN.md §5c). The three limits come from the
 * app's HRA screen (math-tax.computeHRA, copied unchanged); tax figures from compareSalaryTax.
 * Rules: seo/research/verified-facts-tax.md (Schedule III Sl. 11 of the Act; rule 279 of the Rules 2026).
 */
import { compareSalaryTax } from '../../../utils/incomeTax';
import { computeHRA } from '../math-tax';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const RULES = { label: 'Income-tax Rules, 2026', url: 'https://www.incometax.gov.in/iec/foportal/sites/default/files/2026-03/En-Notified-IT-Rules-2026-20-03-2026.pdf' };

/** The eight places in rule 279 (Table, Sl. No. 1), in the Rules' order. */
const METROS = ['Mumbai', 'Kolkata', 'Delhi', 'Chennai', 'Hyderabad', 'Pune', 'Ahmedabad', 'Bengaluru'];

const hraOld = (basic: number, hra: number, rent: number, metro: boolean) => computeHRA(basic, 0, hra, rent, metro, 'old');

// Main example: basic ₹50,000, HRA ₹25,000, rent ₹22,000 a month, metro.
const main = hraOld(50000, 25000, 22000, true);
const OTHER = 150000;
const mainWithout = compareSalaryTax(1500000, OTHER);
const mainWith = compareSalaryTax(1500000, OTHER + main.exempt);
const mainSaved = mainWithout.oldTax.totalTax - mainWith.oldTax.totalTax;

// Scenarios.
const smallTown = hraOld(50000, 25000, 22000, false);
const bigRentMetro = hraOld(50000, 25000, 40000, true);
const bigRentOther = hraOld(50000, 25000, 40000, false);
const lowRent = hraOld(50000, 25000, 5000, true);
const lowHra = hraOld(30000, 6000, 15000, false);

/** Comparison table: basic = 40% of gross, HRA = half of basic, rent ₹25,000 a month in a metro, ₹1.75 lakh of other deductions. */
const STRUCT_OTHER = 175000;
const structRow = (gross: number) => {
    const basic = (gross * 0.4) / 12;
    const h = hraOld(basic, basic / 2, 25000, true);
    const c = compareSalaryTax(gross, STRUCT_OTHER + h.exempt);
    return { gross, exempt: h.exempt, oldTax: c.oldTax.totalTax, newTax: c.newTax.totalTax };
};
const STRUCT = [1000000, 1500000, 2000000, 2500000, 3000000, 4000000].map(structRow);
const s20 = STRUCT[2];

function Body() {
    const rents = [5000, 8000, 10000, 12000, 15000, 18000, 20000, 25000, 30000, 40000];
    return (
        <>
            <Section title="The three limits, worked through">
                <p>
                    Schedule III of the Income-tax Act, 2025 (Table, Sl. No. 11) exempts a special allowance your employer pays
                    for rent, to the extent the Rules allow. Rule 279 sets that extent: the <strong>least</strong> of three amounts,
                    each counted for the months you rented. Salary here means basic pay plus dearness allowance (when your terms of
                    employment provide for it); other allowances and perks are left out.
                </p>
                <DataTable
                    caption={`Basic ${inr(50000)}, HRA ${inr(25000)}, rent ${inr(22000)} a month, rented in a metro city`}
                    head={['Limit', 'How it is worked out', 'Amount for the year']}
                    rows={[
                        ['1. HRA actually received', `${inr(25000)} × 12`, inr(main.opt1)],
                        ['2. 50% of salary (metro)', `50% of ${inr(main.annualBasicDA)}`, inr(main.opt2)],
                        ['3. Rent paid minus 10% of salary', `${inr(main.annualRent)} − ${inr(main.annualBasicDA * 0.1)}`, inr(main.opt3)],
                        ['Exempt HRA (the least)', 'Limit 3 is the smallest', inr(main.exempt)],
                        ['Taxable HRA', `${inr(main.opt1)} − ${inr(main.exempt)}`, inr(main.taxable)],
                    ]}
                    note="Computed with the same formula as the FinCalix app's HRA calculator."
                />
                <p>
                    On a gross salary of {amt(1500000)} with another {inr(OTHER)} of old-regime deductions, that {inr(main.exempt)} cuts
                    old-regime tax from {inr(mainWithout.oldTax.totalTax)} to {inr(mainWith.oldTax.totalTax)}, a saving
                    of {inr(mainSaved)} including cess. The new regime, which ignores HRA, would still charge
                    only {inr(mainWith.newTax.totalTax)} on the same salary, so check both before you tell your employer which regime you want.
                </p>
            </Section>

            <Section title="Which cities get the 50% limit">
                <p>
                    The table in rule 279 of the Income-tax Rules, 2026 names eight places where the second limit is 50% of salary:
                    {' '}{METROS.join(', ')}. Every other place is in the second row of that table, at 40%. What counts is where the
                    rented home is, not where your office is.
                </p>
            </Section>

            <Section title="Exempt HRA at different rents">
                <DataTable
                    caption={`Basic ${inr(40000)} and HRA ${inr(20000)} a month: exempt HRA for the year by monthly rent`}
                    head={['Rent per month', 'Exempt, metro city', 'Exempt, other place', 'Taxable HRA, metro']}
                    rows={rents.map((r) => {
                        const m = hraOld(40000, 20000, r, true);
                        const o = hraOld(40000, 20000, r, false);
                        return [inr(r), inr(m.exempt), inr(o.exempt), inr(m.taxable)];
                    })}
                    note={`Rent up to ${inr(4000)} a month (10% of basic) gives no exemption at all. Past the point where the HRA itself or the 40%/50% limit binds, more rent adds nothing.`}
                />
            </Section>

            <Section title="Does HRA make the old regime cheaper? Salary by salary">
                <p>
                    A common pay structure: basic is 40% of gross pay, HRA is half of basic, you pay {inr(25000)} a month in a metro
                    city and claim another {inr(STRUCT_OTHER)} of deductions (section 123, the old 80C, plus health insurance).
                </p>
                <DataTable
                    caption="Old regime with HRA against the new regime, FY 2026-27 (tax year 2026-27)"
                    head={['Gross salary', 'Exempt HRA', 'Old regime tax', 'New regime tax', 'Cheaper']}
                    rows={STRUCT.map((r) => [amt(r.gross), inr(r.exempt), inr(r.oldTax), inr(r.newTax), r.oldTax < r.newTax ? `Old by ${inr(r.newTax - r.oldTax)}` : `New by ${inr(r.oldTax - r.newTax)}`])}
                    note="Tax includes rebate, surcharge and 4% cess for a resident below 60, from the app's tax code. Home-loan interest or your own NPS would add to the old-regime deductions."
                />
                <p>
                    At {amt(s20.gross)} the exempt HRA is {inr(s20.exempt)} and the old regime costs {inr(s20.oldTax)} against {inr(s20.newTax)}
                    {' '}in the new one. For a fuller comparison with all your deductions, use the old vs new tax regime calculator.
                </p>
            </Section>

            <Section title="Four more cases">
                <Scenarios items={[
                    {
                        title: 'Same pay, rented outside the eight cities',
                        body: <>With basic {inr(50000)}, HRA {inr(25000)} and rent {inr(22000)} in a town not on the list, limit 2 drops to {inr(smallTown.opt2)}, but rent minus 10% ({inr(smallTown.opt3)}) is still lower, so the exemption stays {inr(smallTown.exempt)}. The city only matters when limit 2 is the smallest.</>,
                    },
                    {
                        title: `Rent of ${inr(40000)} a month`,
                        body: <>Now limit 3 is {inr(bigRentMetro.opt3)}, more than the HRA. In a metro city the exemption is the full {inr(bigRentMetro.exempt)} of HRA received; elsewhere the 40% limit caps it at {inr(bigRentOther.exempt)}, leaving {inr(bigRentOther.taxable)} taxable.</>,
                    },
                    {
                        title: `Rent of only ${inr(5000)} a month`,
                        body: <>Yearly rent of {inr(lowRent.annualRent)} is exactly 10% of the {inr(lowRent.annualBasicDA)} basic, so limit 3 is {inr(lowRent.opt3)} and all {inr(lowRent.taxable)} of HRA is taxed. The exemption only starts once rent exceeds a tenth of basic.</>,
                    },
                    {
                        title: 'A small HRA component',
                        body: <>Basic {inr(30000)}, HRA {inr(6000)}, rent {inr(15000)} outside the eight cities: limit 1 (the HRA itself, {inr(lowHra.opt1)}) is the smallest, so {inr(lowHra.exempt)} is exempt and nothing more, however much rent you pay.</>,
                    },
                ]} />
            </Section>

            <Section title="Claiming it through your employer">
                <ol className="steps">
                    <li>The new regime is the default, so tell your employer if you want the old one; otherwise the monthly tax deducted ignores HRA.</li>
                    <li>Give your employer the rent details in Form No. 124, the declaration of claims under rule 205. If rent for the year is more than {inr(100000)}, include the landlord’s name, address, PAN and any relationship to you.</li>
                    <li>Keep rent receipts and the agreement. Your employer issues the salary certificate, Form No. 130 (the old Form 16), by 15 June after the year ends.</li>
                </ol>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'HRA is exempt only if it is a special allowance for rent of a home you live in, the home is not owned by you, and you actually pay rent: Schedule III, Table, Sl. No. 11.', source: ACT },
                { text: 'Exempt amount = least of HRA received, rent paid minus 10% of salary, and 50% of salary (Mumbai, Kolkata, Delhi, Chennai, Hyderabad, Pune, Ahmedabad, Bengaluru) or 40% (any other place), for the period you rented; salary = basic + DA if the terms of employment provide for it: rule 279.', source: RULES },
                { text: 'The new regime does not allow the HRA exemption: section 202(2)(a).', source: ACT },
                { text: 'Rent details go to the employer in Form No. 124, with the landlord’s PAN when rent for the year exceeds ₹1,00,000 (rule 205); Form No. 130 is due by 15 June (rule 215).', source: RULES },
            ]} />
        </>
    );
}

export const hraPage: FeatureDef = {
    slug: 'hra',
    title: 'HRA Exemption Calculator FY 2026-27 (Old Regime)',
    description: 'HRA exemption calculator: the three limits under rule 279, the 8 cities that get 50%, exempt HRA at every rent, and tax saved in the old regime.',
    h1: 'HRA exemption calculator: how much of your HRA is tax-free',
    crumb: 'HRA exemption',
    category: 'tax',
    updated: '2026-11-17',
    analyticsTitle: 'Website - HRA Exemption',
    eyebrow: 'Salary · old regime · tax year 2026-27',
    answer: (
        <>
            <p>With basic pay of {inr(50000)} a month, HRA of {inr(25000)} and rent of {inr(22000)} in a metro city, {inr(main.exempt)} of your HRA is tax-free for the year; the other {inr(main.taxable)} is taxed.</p>
            <p>The exemption is the least of the HRA you get, rent minus 10% of basic + DA, and 50% of basic + DA in eight cities (40% elsewhere), under rule 279 of the Income-tax Rules, 2026. It applies only in the old regime.</p>
        </>
    ),
    sources: [RULES, ACT],
    calc: { key: 'hra', props: { basic: 50000, hra: 25000, rent: 22000, metro: true, salary: 1500000, other: OTHER } },
    Body,
    faqs: [
        {
            q: 'Is HRA exemption available in the new tax regime?',
            a: 'No. Section 202(2)(a) of the Income-tax Act, 2025 takes away the HRA exemption in the new regime, so all HRA is taxed there. You get it only if you opt for the old regime.',
        },
        {
            q: 'Which are the metro cities for HRA in 2026-27?',
            a: `Eight places get the 50% limit under rule 279 of the Income-tax Rules, 2026: ${METROS.join(', ')}. Anywhere else the limit is 40% of basic plus DA.`,
        },
        {
            q: 'How is HRA exemption calculated?',
            a: `It is the smallest of three amounts for the months you rented: HRA received, rent paid minus 10% of basic + DA, and 50% (metro) or 40% of basic + DA. For basic ${inr(50000)}, HRA ${inr(25000)} and rent ${inr(22000)} in a metro city, the three are ${inr(main.opt1)}, ${inr(main.opt3)} and ${inr(main.opt2)}, so ${inr(main.exempt)} is exempt.`,
        },
        {
            q: 'HRA ka calculation kaise hota hai?',
            a: `Teen amounts nikaliye aur jo sabse kam ho, utna HRA tax-free hai: (1) saal bhar mein mila HRA, (2) saal ka rent minus basic + DA ka 10%, (3) basic + DA ka 50% (8 metro shehron mein) ya 40% (baaki jagah). Jaise basic ${inr(50000)}, HRA ${inr(25000)}, rent ${inr(22000)} metro mein: ${inr(main.exempt)} chhoot milegi. Yeh sirf old regime mein milta hai.`,
        },
        {
            q: 'Do I need my landlord’s PAN to claim HRA?',
            a: `Yes, when the rent for the year is more than ${inr(100000)}. Rule 205 of the Income-tax Rules, 2026 asks for the landlord’s name, address and PAN in Form No. 124, the declaration you give your employer.`,
        },
        {
            q: 'Can I claim HRA if I live in my own house?',
            a: 'No. The exemption needs a rented home that you do not own and rent that you actually pay. If you live in your own flat, the whole HRA is taxable.',
        },
        {
            q: 'What does salary mean for the HRA limits?',
            a: 'Basic pay plus dearness allowance, if your terms of employment provide for DA. Rule 279 leaves out every other allowance and perquisite, so a bonus or special allowance does not raise the limits.',
        },
    ],
    related: [
        { href: '/old-vs-new-tax-regime', label: 'Old vs new tax regime', note: 'Whether HRA and other deductions make the old regime cheaper' },
        { href: '/income-tax', label: 'Income tax calculator FY 2026-27', note: 'Your new-regime tax, slab by slab' },
        { href: '/tax-refund', label: 'Income tax refund calculator', note: 'TDS against your actual tax: refund or balance due' },
        { href: '/salary-hike', label: 'Salary hike calculator', note: 'New salary and in-hand change after tax' },
        { href: '/home-loan', label: 'Home loan EMI calculator', note: 'Rent or buy: the EMI on a home loan' },
    ],
    disclaimer: 'tax',
};
