import type { SchemeContent } from '../types';

export default {
    id: 'c-pmsvanidhi',
    title: 'PM SVANidhi Scheme: ₹15k, ₹25k, ₹50k Loans, Eligibility',
    description: 'PM SVANidhi gives street vendors collateral-free loans of ₹15,000, ₹25,000 and ₹50,000 with 7% interest subsidy till March 2030. Documents, LoR and status.',
    h1: 'PM SVANidhi scheme details: loan amounts, eligibility, documents and status check',
    answer: [
        'PM SVANidhi gives a street vendor three collateral-free working-capital loans in a row: up to ₹15,000 for 12 months, then ₹25,000 for 18 months, then ₹50,000 for 36 months, each unlocked by repaying the previous one, with a 7% a year interest subsidy.',
        'The Union Cabinet restructured the scheme on 27 August 2025 and extended lending to 31 March 2030, with an outlay of ₹7,332 crore for 1.15 crore vendors (PMIndia).',
        'Vendors who repay the second loan can also get a UPI-linked RuPay credit card, and digital payments earn cashback of up to ₹1,600.',
    ],
    table: {
        caption: 'PM SVANidhi loan tranches under the restructured scheme',
        head: ['Tranche', 'Loan amount', 'Repayment period', 'Most interest subsidy you can get'],
        rows: [
            ['1st loan', 'Up to ₹15,000 (minimum ₹5,000)', '12 months', '₹603'],
            ['2nd loan', 'Up to ₹25,000 (minimum ₹15,000)', '18 months', '₹1,408'],
            ['3rd loan', 'Up to ₹50,000 (minimum ₹30,000)', '36 months', '₹5,579'],
        ],
        note: 'All three loans together come to ₹90,000. The subsidy figures are the maximum for the full amount repaid on schedule; the actual subsidy can be lower. Source: PM SVANidhi Loan Operational Guidelines (MoHUA, Annexures 1 and 2).',
    },
    eligibility: [
        'A street vendor aged 18 or over (no upper age limit)',
        'Vending in a city with a Certificate of Vending, ID card or Letter of Recommendation (LoR) from the Urban Local Body or Town Vending Committee, or',
        'Vending in a census town or peri-urban area with an LoR approved by the Block Development Officer',
        'The vendor\'s state or UT must have notified its rules and scheme',
        'Each next loan only after the previous one is fully repaid',
    ],
    documents: [
        'Certificate of Vending, ID card or LoR issued by the ULB/TVC (or an LoR approved by the BDO for census towns and peri-urban areas)',
        'Aadhaar card (Voter ID only for vendors in Assam and Meghalaya who have no Aadhaar)',
        'Savings bank passbook or statement',
        'A valid UPI ID linked to the same bank account (mandatory)',
    ],
    howToApply: [
        'If you hold a Certificate of Vending or ID card, apply for the loan directly on pmsvanidhi.mohua.gov.in and choose your lender.',
        'If you do not, submit an "LoR cum loan application" yourself on the portal or the PM SVANidhi app, or at the ULB office, block office or an authorised CSC.',
        'The ULB or block verifies you and issues a digital LoR on the portal (manually written LoRs are not valid); your loan application then goes to the lender.',
        'After repaying, apply for the next tranche from the same portal (separate "Apply for 25k" and "Apply for 50k" options).',
    ],
    statusSteps: [
        'Open pmsvanidhi.mohua.gov.in and click "Know Your Application Status".',
        'Enter your application number and mobile number.',
        'Tap "Request OTP", type the OTP you receive and press Search.',
    ],
    portal: { label: 'PM SVANidhi portal (Ministry of Housing and Urban Affairs)', url: 'https://pmsvanidhi.mohua.gov.in' },
    helpline: 'Portal and login support: pmsvanidhi.support@sidbi.in. Credit-guarantee queries: CGTMSE help desk 93217 02101 (pmsvanidhi.mohua.gov.in/Home/Contact).',
    sources: [
        { label: 'PM SVANidhi Loan Operational Guidelines (MoHUA, PDF)', url: 'https://www.mohua.gov.in/static/uploads/2026/01/a3a17370145e0870a79df74bfbab766f.pdf' },
        { label: 'PMIndia — Cabinet approves restructuring and extension of PM SVANidhi', url: 'https://www.pmindia.gov.in/en/news_updates/cabinet-approves-restructuring-extension-of-lending-period-beyond-31-12-2024-of-pm-street-vendors-atmanirbhar-nidhi-pm-svanidhi-scheme/' },
        { label: 'PM SVANidhi portal — apply, credit card and status', url: 'https://pmsvanidhi.mohua.gov.in' },
        { label: 'PM SVANidhi — help and contact', url: 'https://pmsvanidhi.mohua.gov.in/Home/Contact' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'Does PM SVANidhi check my CIBIL score?',
            a: 'No. The guidelines say a credit score does not apply to street vendors under this scheme; a loan can be refused only if you have an existing loan that is an NPA or written off.',
        },
        {
            q: 'How is the 7% interest subsidy paid?',
            a: 'It is credited straight into your loan account every quarter, but only for the months your account stayed standard (not overdue to NPA level). Paying on schedule is the only way to get the full ₹603, ₹1,408 or ₹5,579.',
        },
        {
            q: 'Is there any processing fee or collateral?',
            a: 'No collateral is taken; the loans are guaranteed by CGTMSE at no fee to you and only a demand promissory note is signed. The first and second loans have no processing fee; for the third, the lender may charge as per its policy.',
        },
        {
            q: 'I have no vending certificate. Can I still get the loan?',
            a: 'Yes. File an "LoR cum loan application" on the portal, the app, the ULB or block office, or a CSC. After the ULB or block verifies you, it issues a digital Letter of Recommendation and your loan request moves to the bank.',
        },
        {
            q: 'Can I close my SVANidhi loan early?',
            a: 'Yes. Prepayment is allowed at any time without a penalty, and early full repayment is what makes you eligible for the next, bigger tranche.',
        },
        {
            q: 'Do I need Udyam registration or a project report?',
            a: 'Neither. The guidelines list Udyam registration and a project proposal as "not required" for all three tranches.',
        },
        {
            q: 'Who gets the PM SVANidhi credit card?',
            a: 'Vendors who have repaid their second loan. The portal shows an "Apply Credit Card" option for them, and the card is UPI-linked RuPay, for urgent business or personal needs.',
        },
    ],
    related: [
        { href: '/schemes/c-pmvishwakarma', label: 'PM Vishwakarma Yojana', note: 'Up to ₹3 lakh at 5% for traditional artisans' },
        { href: '/schemes/c-mudra', label: 'PM MUDRA Yojana', note: 'Bigger business loans once you outgrow SVANidhi' },
        { href: '/schemes/c-pmjdy', label: 'PM Jan Dhan Yojana', note: 'A zero-balance account to receive the loan' },
        { href: '/credit-card-interest', label: 'Credit card interest calculator', note: 'What carrying a card balance costs' },
    ],
    appIssues: [
        'App documents omit the mandatory UPI ID linked to the vendor\'s bank account, and the Voter-ID exception for Assam and Meghalaya.',
        'App does not give the loan tenures (12, 18 and 36 months) or the minimum amounts per tranche.',
        'App eligibility says census-town and peri-urban vendors are covered but not that they need an LoR approved by the Block Development Officer, issued on the portal.',
    ],
} satisfies SchemeContent;
