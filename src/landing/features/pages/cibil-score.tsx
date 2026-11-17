/**
 * /cibil-score — primary query "cibil score for home loan" (SEO_PLAN.md §5a).
 * The app's CIBIL screen (src/pages/CibilScoreCalculator.tsx, CibilProfileSetup.tsx): the user
 * enters a score; the app does not fetch one. Bands: CIBIL_RANGES / getCibilTier
 * (src/data/cibilData.ts). Utilisation: getUtilization / getUtilizationLabel
 * (src/utils/creditCardCalculations.ts). No score-to-interest-rate figures (SEO_PLAN §8: no
 * lender rate page with score bands could be verified today). Compensation = ₹100 × days past
 * 30 (RBI rule). Rules: seo/research/verified-facts-credit.md.
 */
import { CIBIL_RANGES } from '../../../data/cibilData';
import { getUtilization, getUtilizationLabel } from '../../../utils/creditCardCalculations';
import { longDate } from '../../site-data';
import { amt, inr } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RBI_CIC = { label: 'RBI Credit Information Companies Directions, 2025 (paras 21, 37, 41)', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12926' };
const RBI_CIR = { label: 'RBI Credit Information Reporting Directions, 2025 (paras 10, 34, 35, 38)', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13154' };
const RBI_CARDS = { label: 'RBI Credit Cards and Debit Cards Directions, 2025 (para 23)', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13155' };

/** RBI: ₹100 for every calendar day a complaint stays unresolved beyond 30 days from filing. */
const owed = (days: number) => Math.max(0, days - 30) * 100;
const FIX_DAYS = 45;

/** Calendar only: the next RBI reporting date (9th, 16th, 23rd or month-end) on or after `iso`, and that date + 4 days. */
function reportingFor(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const day = [9, 16, 23, last].find((x) => x >= d)!;
    const asOf = Date.UTC(y, m - 1, day);
    const iso10 = (t: number) => new Date(t).toISOString().slice(0, 10);
    return { asOf: iso10(asOf), by: iso10(asOf + 4 * 86400000) };
}
const ld = (iso: string) => longDate(iso) ?? iso;

function Body() {
    const bands = CIBIL_RANGES.filter((r) => r.id !== 'nh');
    const util: Array<[number, number]> = [[8000, 100000], [25000, 100000], [45000, 150000], [90000, 200000], [160000, 200000]];
    const events = ['2026-11-05', '2026-11-12', '2026-11-20', '2026-11-27'];
    const disputeDays = [25, 30, 38, FIX_DAYS, 60];
    return (
        <>
            <Section title="The 300 to 900 scale and the bands the app shows">
                <p>
                    RBI requires every credit bureau to calibrate its scores from 300 to 900. There are four bureaus registered with RBI —
                    TransUnion CIBIL, Experian, Equifax and CRIF — and each gives its own score. The FinCalix app sorts a score you enter
                    into these bands:
                </p>
                <DataTable
                    caption="Score bands used in the FinCalix app"
                    head={['Band in the app', 'Score range']}
                    rows={bands.map((b) => [b.label, b.range])}
                    note="These bands are FinCalix’s labels to help you read a score, not a bureau or RBI scale. Lenders set their own cut-offs."
                />
            </Section>

            <Section title="What a lender sees, and when it gets there">
                <p>
                    Your credit report lists your loans and cards, what is owed on each, any payment that went past its due date, and the
                    enquiries lenders have made. Lenders send this data four times a month — as on the 9th, 16th, 23rd and
                    the last day — within four days of each date. A missed payment can therefore reach the bureaus within days:
                </p>
                <DataTable
                    caption="When a payment made or missed in November 2026 is reported"
                    head={['Payment date', 'Reported as on', 'Sent to bureaus by']}
                    rows={events.map((e) => { const r = reportingFor(e); return [ld(e), ld(r.asOf), ld(r.by)]; })}
                    note="Lenders also send a full file by the 5th of the next month. When a lender reports a default or days past due, it must alert you by SMS or email if it has your contact details."
                />
            </Section>

            <Section title="Card utilisation: the part you can change this month">
                <p>
                    Card balances are part of what your report shows you owe. The app’s card tracker works out how much of each limit you
                    are using, card by card and in total:
                </p>
                <DataTable
                    caption="Utilisation = balance on the statement ÷ credit limit"
                    head={['Balance', 'Limit', 'Utilisation', 'FinCalix label']}
                    rows={util.map(([b, l]) => { const u = getUtilization(b, l); return [inr(b), inr(l), `${u}%`, getUtilizationLabel(u).label]; })}
                    note="The labels are the app’s rule of thumb (below 30% is marked good); bureaus do not publish a cut-off."
                />
            </Section>

            <Section title="How to get your free report and fix a mistake">
                <ol className="steps">
                    <li>Go to a bureau’s home page: each must show a link there to your Free Full Credit Report. After verifying your identity you get one free report, with your score, once every calendar year — from each of the four bureaus.</li>
                    <li>Check every account and enquiry. An unknown loan, a closed loan shown as open or a payment wrongly marked late is worth disputing.</li>
                    <li>Raise the complaint with the bureau or the lender. The lender has 21 days to send corrected data; the bureau gets the rest of the 30 days in all.</li>
                    <li>If it is not resolved within 30 days of filing, you are owed ₹100 for every extra calendar day, credited within five working days of the resolution. A rejection must come with reasons.</li>
                </ol>
                <DataTable
                    caption="Compensation owed for a delayed correction"
                    head={['Resolved after', 'Compensation owed to you']}
                    rows={disputeDays.map((dd) => [`${dd} days`, owed(dd) ? inr(owed(dd)) : 'Nil (within 30 days)'])}
                    note="Complaints about how a score is computed (the scoring model itself) are outside this compensation scheme."
                />
            </Section>

            <Section title="Examples">
                <Scenarios items={[
                    { title: 'Applying for your first home loan with no credit history', body: <>RBI’s Directions ask lenders not to reject a first-time borrower’s application only because there is no credit history. The app has a “no history” option that skips the score bands.</> },
                    { title: `Bringing card use down before applying`, body: <>Two cards with {inr(90000)} owed on {amt(200000)} of limits are at {getUtilization(90000, 200000)}%. Paying off {inr(32000)} takes it to {getUtilization(58000, 200000)}%, which the app marks as “{getUtilizationLabel(getUtilization(58000, 200000)).label}”.</> },
                    { title: 'An error that takes six weeks to fix', body: <>A complaint filed on day one and resolved on day {FIX_DAYS} earns {inr(owed(FIX_DAYS))} — ₹100 for each of the {FIX_DAYS - 30} days past the 30-day limit.</> },
                    { title: 'A card payment four days late', body: <>A card account can be reported as past due, or charged a late fee, only once it is more than three days past the due date — paying within those three days keeps it from being reported as past due.</> },
                ]} />
            </Section>

            <Section title="The CIBIL score screen in FinCalix">
                <p>
                    You type in the score from your latest bureau report (or choose “no history”). The app does not fetch or verify a score
                    from any bureau, so what you see is an estimate built on your number: the band it falls in, a short list of things to work
                    on that uses your card utilisation from the app’s card tracker, and a what-if simulator for lower utilisation and more
                    on-time payments. The simulator is a rough guide, not a bureau forecast. Your financial data stays on your device.
                </p>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Credit scores are calibrated from 300 to 900. Each bureau must give an individual one Free Full Credit Report with the score once in every calendar year (January–December), on request and after authentication, with the link on its home page.', source: RBI_CIC },
                { text: 'The bureau must alert you by SMS or email when a lender or other specified user accesses your credit report.', source: RBI_CIC },
                { text: 'Complaints must be resolved within 30 days in all (21 days for the lender); after that you are owed ₹100 a day, paid within five working days of resolution.', source: RBI_CIC },
                { text: 'Lenders report data as on the 9th, 16th, 23rd and last day of each month, within four days; they must alert you when reporting a default or days past due, and their policies should not reject a first-time borrower only for having no credit history.', source: RBI_CIR },
                { text: 'A credit card is reported as past due, or charged a late fee, only when it stays past due for more than three days.', source: RBI_CARDS },
            ]} />
        </>
    );
}

export const cibilScore: FeatureDef = {
    slug: 'cibil-score',
    title: 'CIBIL Score for Home Loan: Bands, Free Report, RBI Rules',
    description: 'What a CIBIL score of 300–900 means for a home loan, how to get your free credit report every year, how fast errors must be fixed and what is owed if not.',
    h1: 'CIBIL score for a home loan: what it means and how to check it free',
    crumb: 'CIBIL score',
    category: 'cards',
    updated: '2026-11-17',
    analyticsTitle: 'Website - CIBIL Score',
    eyebrow: 'Credit score · RBI rules checked 17 Nov 2026',
    answer: (
        <>
            <p>Credit scores in India run from 300 to 900, and you can get one free full credit report with your score from each of the four bureaus every calendar year. RBI’s credit-information Directions do not set a minimum score for a home loan, and they ask lenders not to reject a first-time borrower just for having no credit history.</p>
            <p>If a bureau takes {FIX_DAYS} days to correct an error you reported, RBI rules owe you {inr(owed(FIX_DAYS))} — ₹100 for every day past 30.</p>
        </>
    ),
    sources: [RBI_CIC, RBI_CIR],
    calc: { key: 'cibil-score', props: { score: 720, balance: 90000, limit: 200000 } },
    Body,
    faqs: [
        { q: 'How much CIBIL score is required for a home loan?', a: 'There is no single figure: RBI’s Directions on credit information do not set a minimum score, so each lender applies its own policy. Check your own report first so you know what the lender will see.' },
        { q: 'How can I check my CIBIL score for free?', a: 'Ask for your Free Full Credit Report on the bureau’s home page. RBI requires each of the four bureaus to give you one free report with the score every calendar year, after verifying your identity.' },
        { q: 'How long does it take to correct a mistake in my credit report?', a: `Up to 30 days in all: the lender has 21 days to send corrected data and the bureau the rest. After 30 days you are owed ₹100 a day, so a fix on day ${FIX_DAYS} earns ${inr(owed(FIX_DAYS))}.` },
        { q: 'Will a home loan be rejected if I have no credit history?', a: 'It should not be for that reason alone. Among the practices RBI’s Directions set for lenders’ board-approved policies: a first-time borrower’s application should not be rejected just because there is no credit history.' },
        { q: 'Does FinCalix show my real CIBIL score?', a: 'No. You enter the score from your bureau report and the app shows its band, tips and a what-if estimate. It does not fetch or verify scores from any credit bureau.' },
        { q: 'CIBIL score kaise badhaye?', a: 'Har EMI aur card bill due date tak bharein — card par 3 din se zyada der hone par hi late report ho sakta hai. Card ka istemal limit ke mukable kam rakhein, saal mein ek baar har bureau se muft report lekar galti dhoondhein, aur galti ho to shikayat karein: 30 din mein theek na ho to ₹100 roz ka muavza milta hai.' },
    ],
    related: [
        { href: '/home-loan', label: 'Home loan EMI calculator', note: 'EMI and interest once you are approved' },
        { href: '/credit-card-tracker', label: 'Credit card due date tracker', note: 'Pay every card on time' },
        { href: '/credit-card-payoff', label: 'Credit card payoff calculator', note: 'Bring balances down faster' },
        { href: '/loan-foreclosure', label: 'Loan foreclosure calculator', note: 'Closing a loan early' },
    ],
    disclaimer: { text: 'FinCalix does not fetch, compute or verify credit scores. Score bands, utilisation labels and the score simulator in the app are estimates to help you read a score you enter; your credit report from a credit bureau and each lender’s own policy decide whether and at what rate you get a loan. FinCalix is not a credit bureau, bank or lender.' },
};
