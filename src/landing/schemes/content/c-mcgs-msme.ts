import type { SchemeContent } from '../types';

export default {
    id: 'c-mcgs-msme',
    title: 'Mutual Credit Guarantee Scheme for MSME: 60% Cover, ₹100 Cr',
    description: 'MCGS-MSME: NCGTC guarantees 60% of MSME machinery loans up to ₹100 crore. 2026 changes: refundable 5% contribution, services, exporters at 75%.',
    h1: 'Mutual Credit Guarantee Scheme for MSMEs (MCGS-MSME): cover, eligibility and 2026 changes',
    answer: [
        'MCGS-MSME gives lenders a 60% guarantee from NCGTC on loans of up to ₹100 crore that MSMEs take to buy plant, machinery or equipment; the borrower needs a valid Udyam Registration Number and must not be an NPA with any lender (PIB, 29 January 2025).',
        'Changes announced on 21 March 2026 made the 5% upfront contribution refundable (1% a year from the fourth year), opened the scheme to service-sector MSMEs, cut the minimum machinery share to 60% of project cost, and added an exporter window: loans up to ₹20 crore with 75% cover and a 2% upfront contribution (PIB).',
    ],
    table: {
        caption: 'MCGS-MSME terms: general window and exporter window (after the March 2026 changes)',
        head: ['Term', 'General MSMEs', 'Eligible exporters'],
        rows: [
            ['Guarantee cover', '60%', '75% of the amount in default'],
            ['Loan guaranteed', 'Up to ₹100 crore', 'Up to ₹20 crore'],
            ['Upfront contribution', '5% of the loan; refundable 1% a year from the 4th year if the account performs', '2% of the loan (max ₹40 lakh); 1% refundable in each of the 4th and 5th years'],
            ['Annual guarantee fee', 'Nil in the year of sanction; 1.5% of outstanding for the next 3 years; 1% after that (as notified in January 2025)', 'Nil in the first year; 0.50% of outstanding every year after'],
            ['Machinery/equipment share of project', 'At least 60% (was 75%)', 'Not stated separately in the March 2026 release'],
            ['Repayment (loans up to ₹50 crore)', 'Up to 8 years, with up to 2 years\' moratorium on principal', 'Not stated separately in the March 2026 release'],
            ['Guarantee tenure', 'Expires after 10 years', 'Not stated separately in the March 2026 release'],
        ],
        note: 'Eligible exporters are profitable units that exported at least 25% of their sales turnover in each of the previous three financial years and meet export-realisation conditions. Loans above ₹50 crore can have a longer repayment and moratorium.',
    },
    eligibility: [
        'An MSME with a valid Udyam Registration Number',
        'Not an NPA with any lender',
        'Loan for buying plant, machinery or equipment, which must make up at least 60% of the project cost (75% before March 2026); the project cost itself can be higher',
        'Manufacturing and, since March 2026, service-sector MSMEs',
        'Loan from a scheduled commercial bank, NBFC or All India Financial Institution registered with NCGTC under the scheme',
    ],
    benefits: [
        '60% guarantee cover to the lender on machinery loans up to ₹100 crore, so less collateral is needed',
        'Repayment of up to 8 years with up to 2 years\' moratorium on principal for loans up to ₹50 crore',
        '5% upfront contribution now refundable: 1% a year from the fourth year if the loan performs well',
        'Exporter window: up to ₹20 crore with 75% cover, 2% upfront contribution and 0.50% annual fee',
    ],
    documents: [
        'Udyam Registration certificate',
        'Project report with quotations for the plant, machinery or equipment',
        'Financial statements and KYC of the business and promoters, as the lender asks',
        'For the exporter window: export turnover records for the last three financial years',
    ],
    howToApply: [
        'Approach a scheduled commercial bank, NBFC or All India Financial Institution that has registered with NCGTC for MCGS-MSME.',
        'Submit the machinery or equipment project with quotations; at least 60% of the project cost must be machinery or equipment.',
        'The lender sanctions the loan and enters it on the NCGTC portal with the upfront contribution and fees.',
        'NCGTC confirms the guarantee, and the loan is treated as guaranteed under the scheme.',
    ],
    portal: { label: 'NCGTC — MCGS-MSME', url: 'https://www.ncgtc.in/en/product-details/MCGSMSME/Mutual-Credit-Guarantee-Scheme-for-MSMEs-(MCGS-MSME)' },
    sources: [
        { label: 'PIB, 29 January 2025 — MCGS-MSME approved: 60% cover, ₹100 crore, Udyam, 8-year repayment, 5% upfront, fee schedule, 4-year window or ₹7 lakh crore', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2097455' },
        { label: 'PIB, 18 March 2025 — eligibility (valid Udyam, not NPA) and eligible lenders', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2112322' },
        { label: 'PIB, 21 March 2026 — MCGS-MSME modified: refundable upfront contribution, services included, 60% machinery share, 10-year tenure, exporter window', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2243388' },
        { label: 'NCGTC — MCGS-MSME product page (operational guidelines and FAQs)', url: 'https://www.ncgtc.in/en/product-details/MCGSMSME/Mutual-Credit-Guarantee-Scheme-for-MSMEs-(MCGS-MSME)' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'What is the Mutual Credit Guarantee Scheme for MSMEs?',
            a: 'It is a central scheme, run by NCGTC, that guarantees 60% of loans up to ₹100 crore given to MSMEs for buying plant, machinery or equipment. It was launched in January 2025 and changed in March 2026.',
        },
        {
            q: 'How is MCGS-MSME different from CGTMSE?',
            a: 'MCGS-MSME is for machinery and equipment loans of any MSME, including medium units, up to ₹100 crore with 60% cover. CGTMSE covers general loans to micro and small enterprises up to ₹10 crore with 75% to 90% cover.',
        },
        {
            q: 'Is the 5% upfront contribution refundable?',
            a: 'Yes, since the March 2026 change: 1% is returned each year from the fourth year onwards if the loan account performs satisfactorily. Exporters pay 2% (up to ₹40 lakh) and get 1% back in each of the fourth and fifth years.',
        },
        {
            q: 'Can a service-sector MSME use MCGS-MSME?',
            a: 'Yes. Service-sector MSMEs were added in the March 2026 modification; earlier the scheme was aimed at manufacturing.',
        },
        {
            q: 'How long can the repayment period be?',
            a: 'Up to 8 years with up to 2 years\' moratorium on principal for loans up to ₹50 crore; larger loans can get a longer schedule. The guarantee itself expires after 10 years.',
        },
        {
            q: 'Until when can loans be covered?',
            a: 'For loans sanctioned within four years from the date the operational guidelines were issued, or until guarantees total ₹7 lakh crore, whichever comes first (PIB, 29 January 2025).',
        },
    ],
    related: [
        { href: '/schemes/c-cgtmse', label: 'CGTMSE', note: 'Collateral-free loans up to ₹10 crore for micro and small units' },
        { href: '/schemes/c-udyam', label: 'Udyam Registration', note: 'The Udyam number this scheme requires' },
        { href: '/emi', label: 'EMI calculator', note: 'Plan instalments after a two-year moratorium' },
        { href: '/break-even', label: 'Break-even calculator', note: 'Check when new machinery pays for itself' },
    ],
    appIssues: [
        'App says "Repayment up to 8 years with 2-year moratorium on principal" without the limit: this applies to loans up to ₹50 crore.',
        'App omits the March 2026 additions: service-sector MSMEs, a 10-year guarantee tenure, and the exporter window (₹20 crore, 75% cover, 2% upfront, 0.50% fee).',
        'App note says ECLGS 5.0 was "reported closed in late Aug 2026"; that could not be confirmed from an official source today, so it is not repeated here.',
    ],
} satisfies SchemeContent;
