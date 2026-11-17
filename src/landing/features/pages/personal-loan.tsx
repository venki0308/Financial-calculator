/**
 * /personal-loan — primary query "personal loan emi calculator" (SEO_PLAN.md §5a): processing fee
 * and GST, the APR on the money received, the flat-rate trap, credit reporting and foreclosure.
 * Figures: the app's calculateReducingEMI, calculateFlatEMI, calculateEffectiveRate and
 * calculateForeclosure (src/utils/calculations.ts); math-loans.aprOnNet (a search over
 * calculateReducingEMI). Rules: CGST notifications 11/2017 and 12/2017; RBI Responsible Business
 * Conduct Directions 2025; RBI Credit Information Companies Directions 2025
 * (seo/research/verified-facts-loans.md). No score-to-rate figures (SEO_PLAN §8).
 */
import { calculateEffectiveRate, calculateFlatEMI, calculateForeclosure, calculateReducingEMI } from '../../../utils/calculations';
import { aprOnNet } from '../math-loans';
import { amt, inr, pct } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const RBI_RBC = { label: 'RBI Responsible Business Conduct Directions, 2025 (paras 348, 353)', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13140' };
const RBI_CIC = { label: 'RBI Credit Information Companies Directions, 2025 (updated 1 July 2026)', url: 'https://www.rbi.org.in/scripts/NotificationUser.aspx?Id=12926' };
const GST_EXEMPT = { label: 'CGST Notification 12/2017-Central Tax (Rate), entry 27', url: 'https://cbic-gst.gov.in/hindi/pdf/central-tax-rate/Notification12-CGST.pdf' };
const GST_RATE = { label: 'CGST Notification 11/2017-Central Tax (Rate), Sl. 15', url: 'https://cbic-gst.gov.in/hindi/pdf/central-tax-rate/Notification11-CGST.pdf' };

const GST = 18;
const emi = (p: number, r: number, years: number) => calculateReducingEMI(p, r, years * 12);
const feeFor = (loan: number, feePct: number) => {
    const fee = Math.round(loan * feePct / 100);
    const gst = Math.round(fee * GST / 100);
    return { fee, gst, net: loan - fee - gst };
};

// Answer: ₹5 lakh at 12% for 5 years, 2% processing fee + GST deducted from the disbursal.
const P = 500000, R = 12, Y = 5, FEE = 2;
const main = emi(P, R, Y);
const f = feeFor(P, FEE);
const apr = aprOnNet(f.net, main.emi, Y * 12);

// Flat-rate trap: ₹2 lakh at 11% for 3 years.
const FL_P = 200000, FL_R = 11, FL_M = 36;
const flat = calculateFlatEMI(FL_P, FL_R, FL_M);
const red = calculateReducingEMI(FL_P, FL_R, FL_M);
const flatEff = calculateEffectiveRate(FL_R, FL_M);

// Foreclosure after 24 EMIs on the main loan.
const FC_AT = 24;
const fc = calculateForeclosure(main.schedule, FC_AT, 0);

const AMOUNTS = [100000, 200000, 300000, 500000, 1000000];
const TABLE_RATE = 13;
const FEES = [0, 1, 1.5, 2, 3];
const FLAT_RATES = [8, 10, 12, 14];

function Body() {
    const s1 = emi(150000, 15, 2);
    const s2 = emi(800000, 11.5, 6);
    const s3 = emi(300000, 13, 3);
    const s3f = feeFor(300000, 1.5);
    const s3apr = aprOnNet(s3f.net, s3.emi, 36);
    return (
        <>
            <Section title={`Personal loan EMI table at ${TABLE_RATE}%`}>
                <DataTable
                    caption={`Monthly EMI on common personal loan amounts at ${TABLE_RATE}% a year`}
                    head={['Loan', '1 year', '2 years', '3 years', '4 years', '5 years']}
                    rows={AMOUNTS.map((a) => [amt(a), ...[1, 2, 3, 4, 5].map((y) => inr(emi(a, TABLE_RATE, y).emi))])}
                    note={`${TABLE_RATE}% is the FinCalix app’s starting rate for a personal loan, not an offer; your rate depends on the lender and your credit record.`}
                />
            </Section>

            <Section title="Processing fee, GST and the money you actually get">
                <p>
                    The GST exemption for loans covers only the part of the price that is interest or discount. Your EMI is interest and
                    principal, so it carries no GST; a processing fee is a separate charge for a financial service, taxed at {GST}% (9% central + 9% state GST).
                    When the fee and its GST are deducted from the disbursal, as in the RBI’s own Key Facts Statement illustration, less reaches your account while the EMI stays the same.
                </p>
                <ol className="steps">
                    <li>Loan {inr(P)}, processing fee {FEE}% = {inr(f.fee)}; GST at {GST}% on the fee = {inr(f.gst)}.</li>
                    <li>Credited to your account: {inr(P)} − {inr(f.fee)} − {inr(f.gst)} = {inr(f.net)}.</li>
                    <li>EMI is still worked out on {inr(P)}: {inr(main.emi)} for 60 months at {R}%.</li>
                    <li>APR: the yearly rate at which {inr(f.net)} would need exactly that EMI over 60 months — {pct(apr)}. This is how the RBI’s Key Facts Statement illustration computes it: on the net amount disbursed, reducing balance.</li>
                </ol>
                <DataTable
                    caption={`What the processing fee does to a ${amt(P)} loan at ${R}%`}
                    head={['Fee', 'Fee + GST', 'You receive', 'APR over 5 years', 'APR over 2 years']}
                    rows={FEES.map((fp) => {
                        const x = feeFor(P, fp);
                        return [pct(fp), inr(x.fee + x.gst), inr(x.net), pct(aprOnNet(x.net, main.emi, 60)), pct(aprOnNet(x.net, emi(P, R, 2).emi, 24))];
                    })}
                    note="The shorter the loan, the more a fee raises the APR, because the same charge is spread over fewer months."
                />
            </Section>

            <Section title="The flat-rate trap, with real numbers">
                <p>
                    A flat-rate quote means interest on the full amount for every year of the loan, however much you have already repaid.
                    {' '}{amt(FL_P)} at {FL_R}% for 3 years looks the same either way, but:
                </p>
                <DataTable
                    caption={`${amt(FL_P)}, ${FL_R}%, 3 years`}
                    head={['', `${FL_R}% flat`, `${FL_R}% reducing`]}
                    rows={[
                        ['EMI', inr(flat.emi), inr(red.emi)],
                        ['Total interest', inr(flat.totalInterest), inr(red.totalInterest)],
                        ['Same cost as a reducing rate of', pct(flatEff), pct(FL_R)],
                    ]}
                    note={`The flat quote costs ${inr(flat.totalInterest - red.totalInterest)} more — it is really a ${pct(flatEff)} loan.`}
                />
                <DataTable
                    caption="Reducing-balance rate that a flat quote really means"
                    head={['Flat rate quoted', '1 year', '3 years', '5 years']}
                    rows={FLAT_RATES.map((r) => [pct(r), pct(calculateEffectiveRate(r, 12)), pct(calculateEffectiveRate(r, 36)), pct(calculateEffectiveRate(r, 60))])}
                    note="Computed with the FinCalix app’s flat-rate converter (the reducing rate that gives the same EMI)."
                />
            </Section>

            <Section title="How a personal loan shows up in your credit record">
                <p>
                    A personal loan is unsecured, so your credit record matters to the lender. What RBI rules say about that record — without
                    any made-up score figures:
                </p>
                <ul>
                    <li>Your lender reports the account to the credit information companies as on the 9th, 16th, 23rd and last day of every month, including any EMI that is overdue, so a missed EMI is reported within the month.</li>
                    <li>Credit scores are on a common 300–900 scale across all four credit information companies.</li>
                    <li>Each company must give you one free full credit report with your score, once in every calendar year, on request.</li>
                    <li>When a lender pulls your report, the company alerts you by SMS or email if it has your number or email ID — a quick way to spot applications you did not make.</li>
                </ul>
                <p>How lenders turn a score into a rate is their own policy; read more on the <a href="/cibil-score">CIBIL score page</a>.</p>
            </Section>

            <Section title="Foreclosure: closing the loan early">
                {fc && (
                    <p>
                        On the {amt(P)} loan at {R}%, after {FC_AT} EMIs you still owe {inr(fc.outstandingPrincipal)}. Paying it off then saves the
                        {' '}{inr(fc.interestSaved)} of interest due over the remaining {Y * 12 - FC_AT} months. If your loan is on a fixed rate and the Key
                        Facts Statement discloses a foreclosure charge, each 1% of it costs {inr(fc.outstandingPrincipal / 100)} here — set that against the interest saved.
                    </p>
                )}
                <p>On a floating-rate personal loan no pre-payment charge is allowed at all. The <a href="/loan-foreclosure">loan foreclosure calculator</a> works out any month.</p>
            </Section>

            <Section title="Examples with real numbers">
                <Scenarios items={[
                    { title: `${amt(150000)} at 15% for 2 years`, body: <>EMI {inr(s1.emi)}; total interest {inr(s1.totalInterest)}.</> },
                    { title: `${amt(800000)} at 11.5% for 6 years`, body: <>EMI {inr(s2.emi)} — but {inr(s2.totalInterest)} of interest, so a long personal loan gets expensive.</> },
                    { title: `${amt(300000)} at 13% for 3 years with a 1.5% fee`, body: <>EMI {inr(s3.emi)}; fee and GST of {inr(s3f.fee + s3f.gst)} leave {inr(s3f.net)} in hand, so the APR is {pct(s3apr)}.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'Loan interest is exempt from GST (heading 9971, “consideration represented by way of interest or discount”); a processing fee is not interest.', source: GST_EXEMPT },
                { text: 'Other financial and related services are taxed at 9% central tax plus the same state tax, 18% in all.', source: GST_RATE },
                { text: 'Before a retail loan is signed the bank must give a Key Facts Statement whose APR includes every charge it levies, worked out on the net amount disbursed; charges left out of the KFS need your explicit consent later.', source: RBI_RBC },
                { text: 'No pre-payment charge on floating-rate loans to individuals for non-business purposes. On other loans a charge must follow the bank’s policy, be based on the amount prepaid and be disclosed in the sanction letter, agreement and KFS.', source: RBI_RBC },
                { text: 'Lenders submit credit data as on the 9th, 16th, 23rd and last day of each month; scores run from 300 to 900; one free full credit report a calendar year; an alert each time your report is accessed.', source: RBI_CIC },
            ]} />
        </>
    );
}

export const personalLoan: FeatureDef = {
    slug: 'personal-loan',
    title: 'Personal Loan EMI Calculator with Processing Fee and GST',
    description: 'Personal loan EMI with the processing fee, 18% GST on it and the real APR, plus the flat-rate trap, credit reporting and foreclosure rules.',
    h1: 'Personal loan EMI calculator with processing fee, GST and APR',
    crumb: 'Personal loan EMI',
    category: 'loans',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Personal Loan EMI',
    eyebrow: 'Personal loan · unsecured',
    answer: (
        <>
            <p>A {amt(P)} personal loan at {R}% for 5 years has an EMI of {inr(main.emi)} and costs {inr(main.totalInterest)} in interest.</p>
            <p>The EMI carries no GST, but a {FEE}% processing fee ({inr(f.fee)}) attracts {GST}% GST ({inr(f.gst)}); if both are deducted, {inr(f.net)} reaches you and the real cost (APR) is {pct(apr)}, not {R}%.</p>
        </>
    ),
    sources: [GST_EXEMPT, GST_RATE, RBI_RBC, RBI_CIC],
    calc: { key: 'personal-loan', props: { amount: P, rate: R, years: Y, feePct: FEE } },
    Body,
    faqs: [
        { q: 'What is the EMI on a ₹5 lakh personal loan for 5 years?', a: `${inr(main.emi)} a month at ${R}%, or ${inr(emi(P, TABLE_RATE, 5).emi)} at ${TABLE_RATE}%. At ${R}% you repay ${inr(main.totalPayment)} in all.` },
        { q: 'What is the EMI on a ₹1 lakh personal loan?', a: `At ${TABLE_RATE}%, ${inr(emi(100000, TABLE_RATE, 1).emi)} a month over 1 year, ${inr(emi(100000, TABLE_RATE, 2).emi)} over 2 years and ${inr(emi(100000, TABLE_RATE, 3).emi)} over 3 years.` },
        { q: 'Personal loan EMI par GST kitna lagta hai?', a: `EMI par koi GST nahi lagta, kyunki byaaj GST se chhoot mein hai. GST sirf processing fee jaise charges par ${GST}% lagta hai — ${amt(P)} ke loan par ${FEE}% fee ${inr(f.fee)} ho to GST ${inr(f.gst)} banta hai.` },
        { q: 'Is a flat-rate personal loan cheaper?', a: `No. ${amt(FL_P)} at ${FL_R}% flat for 3 years costs ${inr(flat.totalInterest)} in interest against ${inr(red.totalInterest)} at ${FL_R}% reducing; the flat quote equals about ${pct(flatEff)} on a reducing basis.` },
        { q: 'Can I reduce my personal loan EMI?', a: 'Yes, mainly by prepaying part of the loan and asking for a lower EMI, or, on a floating-rate loan, by choosing a longer tenure when the rate is reset. A longer tenure lowers the EMI but raises the total interest.' },
        { q: 'Are there charges for closing a personal loan early?', a: 'Not on a floating-rate personal loan. A fixed-rate loan may carry a foreclosure charge only if the sanction letter, loan agreement and Key Facts Statement disclose it, and it must be calculated on the amount prepaid.' },
        { q: 'Will a personal loan affect my credit score?', a: 'It goes into your credit record either way: your lender reports the account and any overdue EMI to the credit information companies four times a month. Paying every EMI on time keeps that record clean; you can check it with one free full report a year from each company.' },
    ],
    related: [
        { href: '/cibil-score', label: 'CIBIL score', note: 'What lenders look at' },
        { href: '/loan-foreclosure', label: 'Loan foreclosure calculator', note: 'Close the loan early' },
        { href: '/emi', label: 'EMI calculator', note: 'EMI per lakh for any loan' },
        { href: '/gold-loan-calculator', label: 'Gold loan calculator', note: 'A secured alternative' },
        { href: '/credit-card-interest', label: 'Credit card interest calculator', note: 'What card debt costs instead' },
    ],
    disclaimer: 'loan',
};
