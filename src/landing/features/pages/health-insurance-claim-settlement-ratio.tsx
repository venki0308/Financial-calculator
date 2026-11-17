/**
 * /health-insurance-claim-settlement-ratio — primary query "health insurance claim settlement ratio 2026"
 * (SEO_PLAN.md §5e, §8). Owner decision (Phase 0): IRDAI Annual Report figures ONLY. Source: IRDAI Annual
 * Report 2024-25 (latest; no 2025-26 report yet) — Table I.29 (status of health claims, printed p. 43),
 * paras I.6.5.5–I.6.5.6 (p. 42). The Annual Report has no insurer-wise health claims table, so the page shows
 * no insurer-wise ratios. Shares are computed at build time from the Table I.29 counts
 * (calcs/c/health-insurance-claim-settlement-ratio.claimShares). Rules: IRDAI Master Circular on Health
 * Insurance Business (29 May 2024) and on Protection of Policyholders' Interests (5 Sep 2024).
 * See seo/research/verified-facts-planning.md.
 */
import { HEALTH_INDUSTRY_2024_25 as H, HEALTH_INDUSTRY_AMT_2024_25 as HA, claimShares } from '../calcs/c/health-insurance-claim-settlement-ratio';
import { inr, pct } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const AR = { label: 'IRDAI Annual Report 2024-25 (Table I.29, p. 43; paras I.6.5.5–I.6.5.6, p. 42)', url: 'https://irdai.gov.in/annual-reports' };
const MC_HEALTH = { label: 'IRDAI Master Circular on Health Insurance Business, 29 May 2024', url: 'https://irdai.gov.in/documents/37343/365525/%E0%A4%B8%E0%A5%8D%E0%A4%B5%E0%A4%BE%E0%A4%B8%E0%A5%8D%E0%A4%A5%E0%A5%8D%E0%A4%AF+%E0%A4%AC%E0%A5%80%E0%A4%AE%E0%A4%BE+%E0%A4%B5%E0%A5%8D%E0%A4%AF%E0%A4%B5%E0%A4%B8%E0%A4%BE%E0%A4%AF+%E0%A4%AA%E0%A4%B0+%E0%A4%AE%E0%A4%BE%E0%A4%B8%E0%A5%8D%E0%A4%9F%E0%A4%B0+%E0%A4%AA%E0%A4%B0%E0%A4%BF%E0%A4%AA%E0%A4%A4%E0%A5%8D%E0%A4%B0+_+Master+Circular+on+Health+Insurance+Business+29052024.pdf/5e707a91-b5de-1ec1-cf18-b66273a6839d?version=2.1&t=1719834812962&download=true' };
const MC_PP = { label: 'IRDAI Master Circular on Protection of Policyholders’ Interests, 2024', url: 'https://irdai.gov.in/documents/37343/365525/%E0%A4%AA%E0%A4%BE%E0%A4%B2%E0%A4%BF%E0%A4%B8%E0%A5%80%E0%A4%A7%E0%A4%BE%E0%A4%B0%E0%A4%95%E0%A5%8B%E0%A4%82+%E0%A4%95%E0%A5%87+%E0%A4%B9%E0%A4%BF%E0%A4%A4%E0%A5%8B%E0%A4%82+%E0%A4%95%E0%A5%87+%E0%A4%B8%E0%A4%82%E0%A4%B0%E0%A4%95%E0%A5%8D%E0%A4%B7%E0%A4%A3+%E0%A4%B8%E0%A4%82%E0%A4%AC%E0%A4%82%E0%A4%A7%E0%A5%80+%E0%A4%AE%E0%A4%BE%E0%A4%B8%E0%A5%8D%E0%A4%9F%E0%A4%B0+%E0%A4%AA%E0%A4%B0%E0%A4%BF%E0%A4%AA%E0%A4%A4%E0%A5%8D%E0%A4%B0,+2024+_+Master+Circular+on+Protection+of+Policyholders\'+interests+2024.pdf/2bc6a186-5c96-461b-2946-89945b9d488c?version=5.1&t=1737118636654&download=true' };

/** Annual Report 2024-25, para I.6.5.5: settlement channel and mode, as printed (per cent). */
const VIA_TPA = 69, IN_HOUSE = 31, CASHLESS_NO = 58, REIMB_NO = 41, BOTH_NO = 1, CASHLESS_AMT = 66.35;

const LAKH = 100000, CRORE = 10000000;
const lakh = (v: number) => `${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })} lakh`;
const crore = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')} crore`;

const n = claimShares(H);
const a = claimShares(HA);
/** Average rupees per claim: ₹ crore ÷ lakh claims. */
const perClaim = (cr: number, lk: number) => (cr * CRORE) / (lk * LAKH);
const avgPaid = perClaim(HA.paid, H.paid);
const avgNew = perClaim(HA.registered, H.registered);
const avgRepudiated = perClaim(HA.repudiated, H.repudiated);
/** Two other denominators people use, on the same Table I.29 counts. */
const paidOverNew = (H.paid / H.registered) * 100;
const paidOverDecided = (H.paid / (H.paid + H.repudiated)) * 100;
const notPaidAmt = 100 - a.paidPct;

/** A made-up insurer for the worked example (round figures). */
const EX = { osStart: 2000, registered: 48000, paid: 43500, disallowed: 0, repudiated: 3500, osEnd: 3000 };
const ex = claimShares(EX);

function Body() {
    return (
        <>
            <Section title="Health claims across all insurers, 2024-25">
                <DataTable
                    caption="Health insurance claims of general and health insurers, 2024-25 (IRDAI Annual Report, Table I.29)"
                    head={['', 'Number of claims', 'Share', 'Amount', 'Share']}
                    rows={[
                        ['Pending at the start of the year', lakh(H.osStart), '', crore(HA.osStart), ''],
                        ['New claims registered', lakh(H.registered), '', crore(HA.registered), ''],
                        ['Total to be dealt with', lakh(n.total), '100%', crore(a.total), '100%'],
                        ['Paid', lakh(H.paid), pct(n.paidPct), crore(HA.paid), pct(a.paidPct)],
                        ['Disallowed under policy terms', lakh(H.disallowed), pct(n.disallowedPct), crore(HA.disallowed), pct(a.disallowedPct)],
                        ['Repudiated', lakh(H.repudiated), pct(n.repudiatedPct), crore(HA.repudiated), pct(a.repudiatedPct)],
                        ['Pending on 31 March 2025', lakh(H.osEnd), pct(n.pendingPct), crore(HA.osEnd), pct(a.pendingPct)],
                    ]}
                    note="Shares are of the total to be dealt with: claims pending at the start of the year plus new claims registered, the basis IRDAI prints in this table. IRDAI shows no claims as wholly disallowed by number; the amount disallowed is the part of claims cut under policy terms."
                />
            </Section>

            <Section title="By number and by amount tell different stories">
                <p>
                    Counted claim by claim, {pct(n.paidPct)} were paid. Counted in rupees, only {pct(a.paidPct)} of the amount claimed was paid, and {pct(a.disallowedPct)} was
                    disallowed under policy terms (room-rent limits, items the policy does not pay for, co-payment and similar). A claim that is paid
                    in part counts as paid in the first figure, but its unpaid part shows up in the second.
                </p>
                <DataTable
                    caption="Average rupees per claim, 2024-25 (from Table I.29)"
                    head={['', 'Amount', 'Claims', 'Average per claim']}
                    rows={[
                        ['New claims registered', crore(HA.registered), lakh(H.registered), inr(avgNew)],
                        ['Claims paid', crore(HA.paid), lakh(H.paid), inr(avgPaid)],
                        ['Claims repudiated', crore(HA.repudiated), lakh(H.repudiated), inr(avgRepudiated)],
                    ]}
                    note="Rejected claims were larger on average than the claims paid; the paid average is within ₹1 of the ₹28,910 IRDAI states in para I.6.5.5 (the table’s counts are rounded to the nearest thousand claims)."
                />
            </Section>

            <Section title="How the claim settlement ratio is worked out">
                <p>Take a made-up insurer with {EX.osStart.toLocaleString('en-IN')} claims pending on 1 April and {EX.registered.toLocaleString('en-IN')} new claims during the year.</p>
                <ol className="steps">
                    <li>Claims to be dealt with = {EX.osStart.toLocaleString('en-IN')} + {EX.registered.toLocaleString('en-IN')} = {ex.total.toLocaleString('en-IN')}.</li>
                    <li>It paid {EX.paid.toLocaleString('en-IN')}: {EX.paid.toLocaleString('en-IN')} ÷ {ex.total.toLocaleString('en-IN')} = {pct(ex.paidPct)} settled.</li>
                    <li>It rejected {EX.repudiated.toLocaleString('en-IN')} ({pct(ex.repudiatedPct)}) and {EX.osEnd.toLocaleString('en-IN')} were still open on 31 March ({pct(ex.pendingPct)}).</li>
                    <li>The three shares add up to 100%. The same arithmetic on IRDAI’s industry figures gives {lakh(H.paid)} ÷ {lakh(n.total)} = {pct(n.paidPct)}.</li>
                </ol>
            </Section>

            <Section title="Why ratios quoted online differ">
                <Scenarios items={[
                    { title: 'Paid ÷ new claims only', body: <>Dividing the {lakh(H.paid)} claims paid by only the {lakh(H.registered)} registered during the year gives {pct(paidOverNew)}, higher than {pct(n.paidPct)}, because some of the claims paid were already pending on 1 April.</> },
                    { title: 'Paid ÷ claims decided', body: <>Leaving out claims still pending and dividing by paid plus repudiated ({lakh(H.paid + H.repudiated)}) gives {pct(paidOverDecided)}. It hides a backlog: {lakh(H.osEnd)} claims were still open at the year end.</> },
                    { title: 'By amount', body: <>Measured in rupees, {pct(notPaidAmt)} of the amount to be dealt with was not paid in the year: disallowed, repudiated or still pending.</> },
                    { title: 'Who settled and how', body: <>{VIA_TPA}% of claims were settled through third-party administrators and {IN_HOUSE}% in-house; {CASHLESS_NO}% by number were cashless, {REIMB_NO}% reimbursement and {BOTH_NO}% both. By amount, {CASHLESS_AMT}% was settled cashless.</> },
                ]} />
            </Section>

            <Section title="What the ratio does and does not tell you">
                <ul>
                    <li><strong>It tells you</strong> how many claims an insurer paid in a year, compared with all the claims it had to deal with.</li>
                    <li><strong>It does not tell you</strong> how much of each bill was paid, how long it took, or why claims were rejected. A high ratio by number can sit next to large deductions by amount.</li>
                    <li><strong>It describes the past year.</strong> It does not predict how your claim will be decided; that depends on your policy wording, waiting periods and disclosures.</li>
                </ul>
            </Section>

            <Section title="Reading an insurer’s own figure">
                <p>
                    IRDAI’s Annual Report gives health claims for the industry as a whole, not insurer by insurer. If an insurer or a website quotes a
                    claim settlement ratio, check four things before comparing it with another: the financial year; whether it is by number or by amount;
                    the denominator (all claims due, only new claims, or only claims decided); and whether it covers health alone or also personal accident
                    and travel. Use the calculator above to rework any figure on the same basis as IRDAI’s table. The insurer’s website must also list its
                    cashless network hospitals and explain how to claim cashless and by reimbursement.
                </p>
            </Section>

            <Section title="What the app does">
                <p>The FinCalix app’s insurance compare screen sets health plans side by side for your family size and sum insured, and lists what to check in a policy: room-rent limits, restoration, no-claim bonus, the waiting period for pre-existing diseases, renewal terms, claim settlement and who handles claims. It does not rank insurers.</p>
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'IRDAI Annual Report 2024-25 (the latest; none yet for 2025-26): insurers settled about 87% of health claims, repudiated about 8%, and about 5% were pending on 31 March 2025 (para I.6.5.6).', source: AR },
                { text: 'Cashless requests must be decided within one hour, and final authorisation at discharge given within three hours; extra hospital charges caused by a delay beyond three hours are borne by the insurer.', source: MC_HEALTH },
                { text: 'No claim may be repudiated without the approval of the insurer’s Product Management Committee or its Claims Review Committee.', source: MC_HEALTH },
                { text: 'Insurers must show on their website the hospitals with which they have cashless tie-ups and the procedure for cashless and reimbursement claims.', source: MC_HEALTH },
                { text: 'Reimbursement claims must be settled within 15 days of submission; if late, the insurer pays interest at bank rate plus 2% without being asked.', source: MC_PP },
            ]} />
        </>
    );
}

export const healthClaimRatio: FeatureDef = {
    slug: 'health-insurance-claim-settlement-ratio',
    title: 'Health Insurance Claim Settlement Ratio 2026: IRDAI Data',
    description: `IRDAI’s latest health claim data: ${pct(n.paidPct)} of claims paid by number, ${pct(a.paidPct)} by amount, how the ratio is worked out and claim timelines.`,
    h1: 'Health insurance claim settlement ratio: what IRDAI’s figures show',
    crumb: 'Claim settlement ratio',
    category: 'goals',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Health Claim Settlement Ratio',
    eyebrow: 'Health insurance · IRDAI Annual Report 2024-25',
    answer: (
        <>
            <p>Insurers in India paid {pct(n.paidPct)} of health insurance claims by number in 2024-25 ({lakh(H.paid)} of {lakh(n.total)}), repudiated {pct(n.repudiatedPct)} and had {pct(n.pendingPct)} still pending on 31 March 2025, according to IRDAI’s Annual Report 2024-25 (Table I.29), the latest available.</p>
            <p>By amount the picture is weaker: {pct(a.paidPct)} of the rupees claimed was paid and {pct(a.disallowedPct)} was disallowed under policy terms.</p>
        </>
    ),
    sources: [AR, MC_HEALTH, MC_PP],
    calc: { key: 'health-insurance-claim-settlement-ratio', props: { basis: 'number' } },
    Body,
    faqs: [
        { q: 'What is the health insurance claim settlement ratio for 2026?', a: `The latest IRDAI figures are for 2024-25: insurers paid ${pct(n.paidPct)} of health claims by number and ${pct(a.paidPct)} by amount. IRDAI has not yet published its Annual Report for 2025-26.` },
        { q: 'How is the claim settlement ratio calculated?', a: `Claims paid ÷ (claims pending at the start of the year + new claims received). For 2024-25: ${lakh(H.paid)} ÷ ${lakh(n.total)} = ${pct(n.paidPct)}.` },
        { q: 'Why is the ratio by amount lower than by number?', a: `Because many claims are paid only in part. In 2024-25, ${pct(a.disallowedPct)} of the amount claimed was disallowed under policy terms such as room-rent caps and non-payable items.` },
        { q: 'Does IRDAI publish a claim settlement ratio for each health insurer?', a: 'Not in its Annual Report, which gives health claims for the industry as a whole. Check any insurer-wise figure for its year, its basis (number or amount) and its denominator before comparing.' },
        { q: 'What share of health claims were rejected in 2024-25?', a: `${pct(n.repudiatedPct)} by number (${lakh(H.repudiated)} claims) and ${pct(a.repudiatedPct)} by amount, by IRDAI’s count.` },
        { q: 'How fast must a health insurer settle a claim?', a: 'Cashless requests within one hour and discharge approval within three hours; reimbursement claims within 15 days of submitting the documents, under IRDAI’s 2024 master circulars.' },
    ],
    related: [
        { href: '/term-insurance-cover', label: 'Term insurance cover calculator', note: 'How much life cover you need' },
        { href: '/financial-planning', label: 'Financial planning calculator', note: 'Emergency fund and money health score' },
        { href: '/expense-tracker', label: 'Expense tracker app', note: 'Track premiums and medical bills' },
    ],
    disclaimer: { text: 'Claim figures are IRDAI’s industry totals for 2024-25 from its Annual Report, for all general and health insurers together; they describe the past year and do not predict how any claim will be decided. FinCalix is not an insurer, broker or IRDAI-registered intermediary and does not rank or recommend insurers.' },
};
