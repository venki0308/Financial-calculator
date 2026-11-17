import type { SchemeContent } from '../types';

export default {
    id: 'c-pmmvy',
    title: 'PM Matru Vandana Yojana: ₹5,000 + ₹6,000, Status, Apply',
    description: 'PMMVY pays ₹5,000 in two instalments for the first child and ₹6,000 for a second girl child. Who qualifies, forms, how to apply and how to track status.',
    h1: 'PM Matru Vandana Yojana (PMMVY): amount, eligibility, how to apply and beneficiary status',
    answer: [
        'PMMVY pays ₹5,000 for a woman\'s first living child in two instalments — ₹3,000 once the pregnancy is registered with at least one antenatal check-up within six months of the last menstrual period, and ₹2,000 after the birth is registered and the baby gets the first round of vaccines — and ₹6,000 in one instalment if the second child is a girl.',
        'A mother whose second child is a daughter can therefore receive ₹11,000 in all; for the second child, registration during the pregnancy is compulsory (Mission Shakti guidelines; PIB, 9 June 2026).',
        'Apply through your Anganwadi worker, ASHA or ANM, on pmmvy.wcd.gov.in or through UMANG; the money goes by DBT to an Aadhaar-seeded account.',
    ],
    table: {
        caption: 'PMMVY instalments and the conditions for each',
        head: ['Child and instalment', 'Condition', 'Amount'],
        rows: [
            ['First child — 1st instalment', 'Pregnancy registered and at least one antenatal check-up within 6 months of the LMP date, at an Anganwadi centre or approved health facility', '₹3,000'],
            ['First child — 2nd instalment', 'Birth registered, and the child has had the first cycle of BCG, OPV, DPT and Hepatitis-B (or equivalent)', '₹2,000'],
            ['Second child, only if a girl — single instalment', 'Pregnancy registered under PMMVY before delivery; paid in one go after the birth', '₹6,000'],
            ['Total if the second child is a girl', '—', '₹11,000'],
        ],
        note: 'Source: Mission Shakti guidelines (PMMVY 2.0, from 1 April 2022) on pmmvy.wcd.gov.in. Any Janani Suraksha Yojana incentive for an institutional delivery is paid separately.',
    },
    eligibility: [
        'Pregnant women and lactating mothers, for the first living child and for a second child if it is a girl',
        'The woman must belong to at least one of these groups: Scheduled Caste or Scheduled Tribe; 40% or more disability (Divyangjan); BPL ration card holder; PM-JAY (Ayushman Bharat) beneficiary; e-Shram card holder; woman farmer under PM-Kisan; MGNREGA (now VB-G RAM G) job card holder; net family income below ₹8 lakh a year; pregnant or lactating Anganwadi worker, helper or ASHA',
    ],
    notEligible: [
        'Women in regular employment with the central or a state government or a public sector undertaking',
        'Women who already receive similar maternity benefits under any law',
    ],
    documents: [
        'Mother and Child Protection (MCP) card',
        'Proof of eligibility, such as a BPL or e-Shram card, caste or disability certificate, or income proof',
        'Aadhaar of the beneficiary (benefits are given only against Aadhaar)',
        'Aadhaar-seeded, DBT-enabled bank or post office account',
    ],
    howToApply: [
        'Register the pregnancy with your Anganwadi worker, ASHA or ANM, who enrols you on the PMMVY portal or app; you can also enrol yourself on pmmvy.wcd.gov.in or through UMANG.',
        'For the first instalment, fill Form 1-A with your MCP card and eligibility proof after the antenatal check-up.',
        'After the birth, claim the second instalment with Form 1-B once the birth is registered and the first vaccines are given.',
        'For a second daughter, register during the pregnancy and claim the ₹6,000 after the birth.',
    ],
    statusSteps: [
        'Open pmmvy.wcd.gov.in and choose "Track Application Status".',
        'Enter the details the page asks for to find your application.',
        'If a payment is held up, call the toll-free helpline 14408 or ask your Anganwadi worker.',
    ],
    portal: { label: 'PMMVY portal (Ministry of Women and Child Development)', url: 'https://pmmvy.wcd.gov.in/' },
    helpline: '14408 (toll-free, multilingual)',
    sources: [
        { label: 'Mission Shakti guidelines with PMMVY 2.0 (Ministry of WCD, PDF)', url: 'https://pmmvy.wcd.gov.in/Content/assets/PDF/MissionShaktiGuidelines.pdf' },
        { label: 'PIB, 9 June 2026 — PMMVY strengthens maternal health', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2270668' },
        { label: 'PIB backgrounder on PMMVY (August 2025) — portal, UMANG, documents, helpline 14408', url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/aug/doc2025825619601.pdf' },
        { label: 'PMMVY portal — track application status', url: 'https://pmmvy.wcd.gov.in/' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'Does PMMVY pay for the second child?',
            a: 'Only if the second child is a girl. Then ₹6,000 is paid in one instalment after the birth, provided the pregnancy was registered under PMMVY before delivery.',
        },
        {
            q: 'What happens after a miscarriage or stillbirth?',
            a: 'The woman is treated as a fresh beneficiary in her next pregnancy, so she can claim the benefit again.',
        },
        {
            q: 'Can a government employee get PMMVY?',
            a: 'No. Women in regular central or state government or PSU jobs, and women getting similar maternity benefits under any law, are excluded.',
        },
        {
            q: 'Is there an income limit for PMMVY?',
            a: 'Net family income below ₹8 lakh a year is one way to qualify, but not the only one: SC/ST women, BPL card holders, e-Shram or PM-JAY beneficiaries and the other listed groups qualify whatever their income.',
        },
        {
            q: 'Which forms are used for PMMVY?',
            a: 'Form 1-A is for registration and the first instalment, and Form 1-B is for claiming the second instalment. Both are in the PMMVY guidelines and are usually filled with help from the Anganwadi worker.',
        },
        {
            q: 'Does PMMVY replace Janani Suraksha Yojana money?',
            a: 'No. Any JSY incentive for delivering in a hospital is still paid on its own terms; the guidelines expect a woman to get about ₹6,000 on average from the two together for her first child.',
        },
        {
            q: 'How many mothers have received PMMVY?',
            a: '4.27 crore beneficiaries had been paid ₹20,150 crore by 30 April 2026, according to the Ministry of Women and Child Development.',
        },
    ],
    related: [
        { href: '/schemes/c-saksham', label: 'Saksham Anganwadi & Poshan 2.0', note: 'Nutrition and health check-ups for mother and baby' },
        { href: '/schemes/c-abpmjay', label: 'Ayushman Bharat PM-JAY', note: 'Free hospital cover, including for delivery complications' },
        { href: '/sukanya-samriddhi', label: 'Sukanya Samriddhi calculator', note: 'Start saving for a daughter early' },
        { href: '/schemes/c-gig', label: 'e-Shram registration', note: 'An e-Shram card is one of the PMMVY eligibility proofs' },
    ],
    appIssues: [
        'App benefits omit the ₹6,000 for a second child who is a girl (PMMVY 2.0, from 1 April 2022).',
        'App benefit "Additional ₹6,000 under JSSK for institutional delivery" is wrong: JSY (not JSSK) pays its own incentive, and the guidelines say the PMMVY and JSY amounts together come to about ₹6,000 on average.',
        'App eligibility ("pregnant and lactating women, first living child only") omits the second-girl-child rule, the eligible categories (SC/ST, 40% disability, BPL, PM-JAY, e-Shram, PM-Kisan woman farmer, job card, income below ₹8 lakh, AWW/AWH/ASHA) and the exclusion of regular government/PSU employees.',
        'App does not give the instalment split (₹3,000 after registration and ANC, ₹2,000 after birth registration and first vaccines).',
    ],
} satisfies SchemeContent;
