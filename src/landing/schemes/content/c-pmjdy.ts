import type { SchemeContent } from '../types';

export default {
    id: 'c-pmjdy',
    title: 'PM Jan Dhan Yojana: Age Limit, Benefits, Open Account',
    description: 'Jan Dhan account: zero balance, free RuPay card with ₹2 lakh accident cover, ₹10,000 overdraft after 6 months, no upper age limit. How to open.',
    h1: 'PM Jan Dhan Yojana: benefits, age limit and how to open a zero-balance account',
    answer: [
        'A Jan Dhan (PMJDY) account is a basic savings bank account with no minimum balance, a free RuPay debit card carrying ₹2 lakh of accident insurance, and an overdraft of up to ₹10,000 after six months of satisfactory use (PIB, 27 August 2026).',
        'Any Indian citizen without a bank account can open one, with no upper age limit. On 19 August 2026 there were 59.09 crore Jan Dhan accounts holding ₹3,16,514 crore, an average of ₹5,356 each.',
    ],
    table: {
        caption: 'What a Jan Dhan account comes with',
        head: ['Feature', 'Detail'],
        rows: [
            ['Minimum balance', 'None, and no maintenance charges'],
            ['Interest', 'The bank\'s normal savings account rate'],
            ['RuPay debit card', 'Free; accepted at all ATMs and most PoS machines'],
            ['Accident insurance on the RuPay card', '₹2 lakh for accounts opened after 28 August 2018; ₹1 lakh for older accounts; premium paid by NPCI'],
            ['Overdraft', 'Up to ₹10,000, for one account holder per household, after 6 months of satisfactory operation'],
            ['Linked schemes', 'DBT, PM Jeevan Jyoti Bima, PM Suraksha Bima, Atal Pension Yojana, MUDRA'],
            ['Where to open', 'Any bank branch or Business Correspondent (Bank Mitra) outlet'],
        ],
        note: 'Women own 55.7% (32.92 crore) of Jan Dhan accounts, and 77.8% are in rural and semi-urban areas (PIB, 27 August 2026).',
    },
    eligibility: [
        'Any citizen of Indian nationality who does not already have a bank account',
        'No upper age limit',
        'One basic savings bank account per unbanked person; joint accounts are allowed',
    ],
    benefits: [
        'Zero-balance savings account with no maintenance charges',
        'Free RuPay debit card with built-in accident insurance of ₹2 lakh (₹1 lakh for accounts opened before the August 2018 enhancement)',
        'Overdraft up to ₹10,000 for one member per household after six months of good account use',
        'Gateway to DBT payments and to PMJJBY, PMSBY, Atal Pension Yojana and MUDRA loans',
    ],
    documents: [
        'Aadhaar card',
        'Government ID proof: voter ID, PAN card or ration card',
        'Permanent address proof: passport, driving licence, or an electricity, telephone or water bill',
        'Passport-size photograph',
        'Filled and signed PMJDY account opening form',
    ],
    howToApply: [
        'Visit any bank branch or a Business Correspondent (Bank Mitra) outlet near you.',
        'Ask for the PMJDY account opening form (also downloadable in Hindi and English from pmjdy.gov.in) and fill it in.',
        'Submit it with Aadhaar and the other KYC documents and a photograph.',
        'Once the bank verifies the KYC, the account is activated and the RuPay card is issued.',
    ],
    portal: { label: 'Pradhan Mantri Jan-Dhan Yojana (Department of Financial Services)', url: 'https://pmjdy.gov.in/' },
    helpline: 'National toll-free: 1800 11 0001 and 1800 180 1111 (as listed on pmjdy.gov.in)',
    sources: [
        { label: 'PIB, 27 August 2026 — PMJDY completes 12 years: 59.09 crore accounts, ₹3.17 lakh crore deposits, ₹2 lakh accident cover, ₹10,000 overdraft', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2303643' },
        { label: 'PIB explainer, 27 August 2026 — eligibility (no upper age limit), documents, overdraft rules, accident cover premium paid by NPCI', url: 'https://www.pib.gov.in/PressNoteDetails.aspx?NoteId=159721&ModuleId=3' },
        { label: 'PMJDY scheme details (DFS) — no minimum balance, RuPay card, ₹1 lakh/₹2 lakh accident cover, ₹10,000 overdraft', url: 'https://pmjdy.gov.in/scheme' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'What is the age limit for a PM Jan Dhan account?',
            a: 'There is no upper age limit: PIB says all Indian citizens are eligible. For a child\'s account, ask the bank about its rules for minors.',
        },
        {
            q: 'How do I get the ₹10,000 overdraft in a Jan Dhan account?',
            a: 'Use the account regularly for six months; after that the bank can allow an overdraft of up to ₹10,000, subject to its eligibility checks. Only one member of a household can get it.',
        },
        {
            q: 'Is there a minimum balance in a Jan Dhan account?',
            a: 'No. A PMJDY account needs no minimum balance and has no maintenance charges.',
        },
        {
            q: 'How much accident insurance comes with a Jan Dhan RuPay card?',
            a: '₹2 lakh for accounts opened after 28 August 2018 and ₹1 lakh for accounts opened earlier. The account holder pays no premium; NPCI pays it.',
        },
        {
            q: 'Can I open a Jan Dhan account if I already have a savings account?',
            a: 'No. A PMJDY account is meant for people who do not have any other bank account; one basic account is opened per unbanked person.',
        },
        {
            q: 'Do Jan Dhan accounts earn interest?',
            a: 'Yes, at the same savings account rate the bank pays on its other savings accounts.',
        },
    ],
    related: [
        { href: '/schemes/c-pmjjby', label: 'PM Jeevan Jyoti Bima Yojana', note: 'Life cover you can link to the account' },
        { href: '/atal-pension', label: 'Atal Pension Yojana calculator', note: 'A pension scheme Jan Dhan account holders can join' },
        { href: '/schemes/c-mudra', label: 'PM MUDRA Yojana', note: 'Collateral-free business loans up to ₹20 lakh' },
        { href: '/overdraft-interest', label: 'Overdraft interest calculator', note: 'See what an overdraft costs for the days you use it' },
    ],
    appIssues: [
        'App eligibility says "Minimum age 10 years"; the official PIB explainer (27 Aug 2026) states only that there is no upper age limit, so the minimum age is not shown here.',
        'App says accident cover is ₹2 lakh without noting that accounts opened before 28 August 2018 have ₹1 lakh.',
        'App overdraft line omits that only one account holder per household can get it.',
        'App documents list only Aadhaar (or any ID) and a photo; PIB lists Aadhaar, a government ID, a permanent address proof, a photograph and the account opening form.',
    ],
} satisfies SchemeContent;
