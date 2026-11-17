/**
 * /nps — primary query "nps calculator" (SEO_PLAN.md §5d). Replaces the hand-written guide and
 * absorbs /schemes/c-nps (308 → here): eligibility, how to open, documents.
 * Figures: features/math-retire.npsProjection, copied from src/pages/NPSCalculator.tsx (10% return
 * and 6% annuity rate are the app's default assumptions, not forecasts).
 * Exit rules (§8): PFRDA (Exits and Withdrawals under the NPS) (Amendment) Regulations, 2025,
 * gazetted 16 Dec 2025 (press release 19 Dec 2025; NPS Trust normal-exit page); the 2026 amendment
 * (13 Jul 2026) only adds specific-purpose-scheme provisions. Tax: Income-tax Act, 2025 s.124,
 * s.202(2)(a), Schedule II Sl. 6. Facts: seo/research/verified-facts-retire.md.
 */
import { npsExitSlab, npsProjection } from '../math-retire';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const PR = { label: 'PFRDA press release, 19 Dec 2025: exit rule changes', url: 'https://www.pfrda.org.in/documents/33652/86710/Press+Release+-+Key+changes+-+Exit+Regulations+.pdf' };
const REGS = { label: 'PFRDA Exits and Withdrawals Regulations (as amended 16 Dec 2025)', url: 'https://www.pfrda.org.in/documents/33652/184762/PFRDA+(Exits+and+Withdrawals+under+the+NPS)+Regulations,+2015+%5BLast+amended+on+16+December+2025%5D.pdf' };
const EXIT = { label: 'NPS Trust: normal exit', url: 'https://npstrust.org.in/normal-exit' };
const ELIG = { label: 'NPS Trust: eligibility', url: 'https://npstrust.org.in/eligibility' };
const OPEN = { label: 'NPS Trust: open an NPS account', url: 'https://npstrust.org.in/open-an-nps-account' };
const ACT = { label: 'Income-tax Act, 2025 (s.124, s.202, Schedule II)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };

const MONTHLY = 5000;
const AGE = 30;
const EXIT_AGE = 60;
const RET = 10;            // assumed yearly return (app default)
const ANN = 6;             // assumed annuity rate (app default)
const main = npsProjection(MONTHLY, RET, AGE, EXIT_AGE, 20, ANN);
const govt = npsProjection(MONTHLY, RET, AGE, EXIT_AGE, 40, ANN);

function Body() {
    const amounts = [2000, 5000, 10000, 20000];
    const spans = [15, 20, 25, 30];
    const shares = [20, 40, 60, 100];
    const r = RET / 12 / 100;
    const late = npsProjection(20000, RET, 40, EXIT_AGE, 20, ANN);
    const mid = npsProjection(1500, RET, 40, EXIT_AGE, 20, ANN);
    const small = npsProjection(1000, RET, 40, EXIT_AGE, 20, ANN);
    const slower = npsProjection(MONTHLY, 8, AGE, EXIT_AGE, 20, ANN);
    return (
        <>
            <Section title="How the NPS estimate is worked out">
                <ol className="steps">
                    <li>The assumed {RET}% a year becomes a monthly rate of {RET}% ÷ 12 = {(r * 100).toFixed(4)}%.</li>
                    <li>Each {inr(MONTHLY)} is treated as paid at the start of its month and compounds until you exit. Over {main.years} years that is {main.years * 12} payments, {amt(main.invested)} in total, which grow to {amt(main.corpus)}.</li>
                    <li>Above ₹12 lakh, at least 20% of the corpus must buy an annuity: {amt(main.annuity)}. The other {amt(main.lumpsum)} can be taken as a lump sum or in instalments.</li>
                    <li>An annuity paying {ANN}% a year on {amt(main.annuity)} gives {inr(main.monthlyPension)} a month for life. Using 40% for the annuity instead doubles that to {inr(govt.monthlyPension)}.</li>
                </ol>
            </Section>

            <Section title="NPS corpus by monthly contribution and years">
                <DataTable
                    caption={`Corpus at exit at an assumed ${RET}% a year`}
                    head={['Monthly contribution', ...spans.map((s) => `${s} years`)]}
                    rows={amounts.map((a) => [inr(a), ...spans.map((s) => amt(npsProjection(a, RET, EXIT_AGE - s, EXIT_AGE, 20, ANN).corpus))])}
                    note="Contributions stay the same every month; NPS returns are market-linked and not guaranteed."
                />
            </Section>

            <Section title={`Pension from a ${amt(main.corpus)} corpus by annuity share`}>
                <DataTable
                    caption={`${inr(MONTHLY)} a month from ${AGE} to ${EXIT_AGE}; annuity at an assumed ${ANN}%`}
                    head={['Share used for the annuity', 'Annuity purchase', 'Lump sum or instalments', 'Pension a month']}
                    rows={shares.map((s) => { const x = npsProjection(MONTHLY, RET, AGE, EXIT_AGE, s, ANN); return [`${s}%`, amt(x.annuity), amt(x.lumpsum), inr(x.monthlyPension)]; })}
                    note="20% is the minimum for All Citizen and Corporate subscribers with more than ₹12 lakh; government employees must use at least 40%. Actual annuity rates depend on the insurer and the plan you pick."
                />
            </Section>

            <Section title="Old and new exit rules compared">
                <DataTable
                    caption="Normal exit, All Citizen and Corporate subscribers"
                    head={['', 'Before 16 Dec 2025', 'Now']}
                    rows={[
                        ['Lump sum allowed', 'Up to 60%', 'Up to 80%'],
                        ['Minimum annuity', '40%', '20%'],
                        ['Whole corpus as lump sum', 'Corpus up to ₹5 lakh', 'Corpus up to ₹8 lakh'],
                        ['Corpus over ₹8 lakh up to ₹12 lakh', '60:40', '₹6 lakh lump sum + rest as annuity or instalments (6+ years), or 80:20'],
                        ['When you can exit normally (All Citizen)', 'At 60', 'At 60 or after 15 years, whichever is earlier'],
                        [`Example: ${inr(MONTHLY)}/month for ${main.years} years`, `${amt(govt.lumpsum)} lump sum, ${inr(govt.monthlyPension)}/month`, `${amt(main.lumpsum)} lump sum, ${inr(main.monthlyPension)}/month`],
                    ]}
                    note="Government-sector subscribers keep the 60% lump sum and 40% annuity split, with the same ₹8 lakh and ₹12 lakh slabs."
                />
            </Section>

            <Section title="Who can open NPS, and how">
                <div className="cols">
                    <div>
                        <h3>Eligibility (All Citizen model)</h3>
                        <ul>
                            <li>Indian citizens aged 18 to 85, resident or non-resident, and Overseas Citizens of India</li>
                            <li>Not open to Hindu Undivided Families or Persons of Indian Origin</li>
                            <li>One individual account per person; it cannot be opened for someone else</li>
                            <li>Central Government staff who joined on or after 1 January 2004 (except the armed forces) are covered compulsorily</li>
                        </ul>
                    </div>
                    <div>
                        <h3>Opening the account</h3>
                        <ul>
                            <li>Online: on the eNPS portal of a central recordkeeping agency (CAMS, Protean or KFin), including through DigiLocker</li>
                            <li>Offline: with the registration form at a Point of Presence, such as a bank branch</li>
                            <li>Documents: the KYC documents asked for in the Subscriber Registration Form</li>
                            <li>You get a 12-digit PRAN that stays with you across jobs and cities</li>
                        </ul>
                    </div>
                </div>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `${inr(20000)} a month from 40`, body: <>Twenty years at an assumed {RET}% builds about {amt(late.corpus)}. With the minimum 20% annuity, {amt(late.lumpsum)} is free to take and the pension is about {inr(late.monthlyPension)} a month.</> },
                    { title: 'A corpus between ₹8 and ₹12 lakh', body: <>{inr(1500)} a month from 40 reaches about {amt(mid.corpus)}{npsExitSlab(mid.corpus) === 'mid' ? '' : ' (outside the slab)'}. Here you can take up to ₹6 lakh as cash and draw the rest as an annuity or instalments lasting six years or more — or follow the 80:20 split instead.</> },
                    { title: 'A small corpus', body: <>{inr(1000)} a month from 40 comes to about {amt(small.corpus)}, under ₹8 lakh, so all of it can be withdrawn at exit with no annuity.</> },
                    { title: `If returns are 8%, not ${RET}%`, body: <>The {inr(MONTHLY)} plan from {AGE} ends near {amt(slower.corpus)} instead of {amt(main.corpus)}, and the 20% annuity pays about {inr(slower.monthlyPension)} a month.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'All Citizen and Corporate subscribers: up to 80% lump sum and at least 20% annuity at normal exit; whole corpus up to ₹8 lakh; ₹8–12 lakh: ₹6 lakh lump sum and the rest as annuity or systematic unit redemption for at least 6 years (or 80:20).', source: EXIT },
                { text: 'Government sector: up to 60% lump sum, at least 40% annuity, with the same ₹8 lakh / ₹12 lakh slabs.', source: EXIT },
                { text: 'Normal exit for All Citizen subscribers at 60 or after 15 years, whichever is earlier; premature exit: up to 20% lump sum (all of it if the corpus is ₹5 lakh or less); entry and exit age up to 85.', source: PR },
                { text: 'Partial withdrawals before 60: up to 4 times, at least 4 years apart.', source: PR },
                { text: 'Amended regulations gazetted on 16 December 2025.', source: REGS },
                { text: 'Tax: your own contribution up to ₹50,000 a year is deductible under section 124(3) in the old regime only; your employer’s contribution under section 124(1)-(2) is deductible in both regimes, up to 14% of salary in the new regime.', source: ACT },
                { text: 'On closure, the Act exempts a payment from the NPS Trust up to 60% of the amount payable (Schedule II, Sl. 6); the annuity pension is taxed as income (section 124(6)).', source: ACT },
                { text: 'Open to citizens aged 18 to 85, resident or not, and OCIs; not to HUFs or Persons of Indian Origin.', source: ELIG },
                { text: 'Online through eNPS or DigiLocker, or offline through a Point of Presence.', source: OPEN },
            ]} />
        </>
    );
}

export const nps: FeatureDef = {
    slug: 'nps',
    title: 'NPS Calculator 2026: Corpus, Lump Sum and Pension',
    description: 'NPS calculator with the new PFRDA exit rules: corpus at 60, up to 80% lump sum, 20% annuity and monthly pension, plus eligibility and how to open.',
    h1: 'NPS calculator: corpus, lump sum and monthly pension',
    crumb: 'NPS',
    category: 'retire',
    updated: '2026-11-17',
    analyticsTitle: 'Website - NPS',
    eyebrow: 'National Pension System · exit rules of 16 Dec 2025',
    answer: (
        <>
            <p>Putting {inr(MONTHLY)} a month into NPS from age {AGE} to {EXIT_AGE} at an assumed {RET}% return builds about {amt(main.corpus)}. Under the new exit rules you can take up to 80% ({amt(main.lumpsum)}) as a lump sum; the 20% annuity pays about {inr(main.monthlyPension)} a month at a {ANN}% annuity rate.</p>
            <p>PFRDA’s amendment of 16 December 2025 cut the minimum annuity for All Citizen and Corporate subscribers from 40% to 20%; a corpus of ₹8 lakh or less can be withdrawn in full.</p>
        </>
    ),
    sources: [PR, EXIT, ACT],
    calc: { key: 'nps', props: { monthly: MONTHLY, age: AGE, retire: EXIT_AGE, rate: RET, annuityPct: 20, annuityRate: ANN } },
    Body,
    faqs: [
        { q: 'How much of my NPS corpus can I withdraw at 60?', a: 'Up to 80% as a lump sum if you are an All Citizen or Corporate subscriber with more than ₹12 lakh; at least 20% must buy an annuity. Up to ₹8 lakh you can take everything, and between ₹8 and ₹12 lakh you can take ₹6 lakh in cash with the rest as an annuity or instalments, or use the 80:20 split.' },
        { q: 'What is the minimum annuity in NPS now?', a: '20% for All Citizen and Corporate subscribers since PFRDA’s amendment of 16 December 2025; government employees still need 40%.' },
        { q: 'How is NPS pension calculated?', a: `Pension = annuity purchase × annuity rate ÷ 12. ${amt(main.annuity)} at ${ANN}% gives ${inr(main.monthlyPension)} a month; the rate is set by the insurer when you buy the annuity.` },
        { q: 'Is the NPS lump sum tax-free?', a: 'Up to 60% of the amount payable on closure is exempt under Schedule II of the Income-tax Act, 2025. The annuity pension is taxed as income in the year you receive it.' },
        { q: 'Who can open an NPS account?', a: 'Any Indian citizen aged 18 to 85, including NRIs and OCIs, who completes KYC. HUFs and Persons of Indian Origin cannot.' },
        { q: 'Can I leave NPS before 60?', a: 'Yes. All Citizen subscribers can exit normally after 15 years even before 60. An earlier exit lets you take up to 20% as cash, with 80% in an annuity, unless the corpus is ₹5 lakh or less.' },
        { q: 'NPS pension kitna milta hai?', a: `Pension aapke corpus ke annuity wale hisse par nirbhar hai. ${inr(MONTHLY)} mahina 30 se 60 saal tak, ${RET}% maankar, lagbhag ${amt(main.corpus)} banta hai; 20% (${amt(main.annuity)}) annuity mein ${ANN}% par lagbhag ${inr(main.monthlyPension)} mahina pension deta hai.` },
    ],
    related: [
        { href: '/epf', label: 'EPF calculator', note: 'Your provident fund at retirement' },
        { href: '/atal-pension', label: 'Atal Pension Yojana chart', note: 'Guaranteed pension of ₹1,000 to ₹5,000' },
        { href: '/old-vs-new-tax-regime', label: 'Old vs new tax regime', note: 'Where NPS deductions still count' },
        { href: '/swp', label: 'SWP calculator', note: 'Drawing an income from a lump sum' },
        { href: '/ppf', label: 'PPF calculator', note: 'A fixed-rate alternative for retirement' },
    ],
    disclaimer: { text: 'NPS figures are projections at an assumed return and annuity rate; NPS returns are market-linked and annuity rates are set by the insurer at purchase. Exit options depend on your sector and corpus on the date you exit. FinCalix is not affiliated with PFRDA, NPS Trust or any pension fund.' },
};
