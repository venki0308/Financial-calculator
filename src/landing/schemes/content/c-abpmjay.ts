import type { SchemeContent } from '../types';

export default {
    id: 'c-abpmjay',
    title: 'Ayushman Bharat PM-JAY: ₹5 Lakh Cover, 70+ Vay Vandana',
    description: 'Ayushman Bharat PM-JAY: ₹5 lakh cashless hospital cover per family a year; every citizen aged 70+ covered via Ayushman Vay Vandana. Card, status, 14555.',
    h1: 'Ayushman Bharat PM Jan Arogya Yojana: ₹5 lakh cover, who is eligible and the 70+ card',
    answer: [
        'Ayushman Bharat PM-JAY pays for up to ₹5 lakh of secondary and tertiary hospital treatment per family per year, cashless at empanelled public and private hospitals, with no limit on family size or age and with pre-existing illnesses covered from day one (Ministry of Health, September 2024).',
        'Since 29 October 2024 every citizen aged 70 or above is covered regardless of income through Ayushman Vay Vandana: ₹5 lakh per family per year, or a separate ₹5 lakh top-up just for the senior if the family is already in PM-JAY. By 20 October 2026 it had paid for 23.46 lakh hospital admissions worth ₹5,668.80 crore (PIB, 29 October 2026).',
    ],
    table: {
        caption: 'How much cover each group gets under AB PM-JAY',
        head: ['Who', 'Cover per year', 'How it works'],
        rows: [
            ['Eligible PM-JAY family (SECC 2011 and state-added lists)', 'Up to ₹5 lakh per family', 'Shared by all members; no cap on family size or age'],
            ['Person 70+ in a family already covered by PM-JAY', 'Extra ₹5 lakh top-up for the senior alone', 'Separate from the ₹5 lakh used by members under 70'],
            ['Person 70+ in a family not covered by PM-JAY', 'Up to ₹5 lakh per family', 'Shared by the family\'s members aged 70+; no income test'],
            ['What a hospital stay includes', '3 days before and 15 days after admission', 'Diagnostics, drugs (15 days post-discharge), food and lodging, at no cost to the patient'],
        ],
        note: 'The benefit package covers 1,949 procedures in 27 specialties (Ministry of Health, September 2024). Cashless treatment is portable: it works at any empanelled hospital in India.',
    },
    eligibility: [
        'Families identified under the deprivation and occupational criteria of SECC 2011 (rural and urban), plus families added by states in their own expanded lists',
        'Every Indian citizen aged 70 or above, irrespective of income or socio-economic status (Ayushman Vay Vandana, since 29 October 2024)',
        'No restriction on family size, age or gender',
    ],
    benefits: [
        'Cashless cover up to ₹5 lakh per family per year for secondary and tertiary hospitalisation',
        'Separate ₹5 lakh top-up for seniors aged 70+ whose family is already covered',
        'Pre-existing conditions covered from the first day',
        '3 days of pre-hospitalisation and 15 days of post-hospitalisation expenses, including diagnostics and medicines',
        'No premium for beneficiaries; public and private empanelled hospitals across India',
    ],
    documents: [
        'Aadhaar (used for eKYC when the Ayushman card is made)',
        'Ration card or other family identification where your state asks for it',
    ],
    howToApply: [
        'Check whether your family is listed on the NHA beneficiary portal (beneficiary.nha.gov.in) or by calling 14555.',
        'If listed, complete Aadhaar eKYC and get the Ayushman card made on the beneficiary portal, the Ayushman app, at a Common Service Centre or at an empanelled hospital\'s Ayushman help desk.',
        'For Ayushman Vay Vandana (age 70+), enrol with Aadhaar eKYC through the same channels; no income proof is needed.',
        'At admission, show the Ayushman card or Aadhaar at the empanelled hospital\'s help desk; treatment within the cover is cashless.',
    ],
    statusSteps: [
        'Open the NHA beneficiary portal, beneficiary.nha.gov.in, or the Ayushman app.',
        'Log in with your mobile number and the OTP sent to it.',
        'Search for yourself using the details the portal asks for, such as state and Aadhaar number.',
        'The result shows whether you are a listed beneficiary and whether your Ayushman card is approved; download the card once it is approved.',
        'If you cannot find your name or the card is pending, call the national helpline 14555.',
    ],
    portal: { label: 'NHA beneficiary portal (Ayushman card)', url: 'https://beneficiary.nha.gov.in/' },
    helpline: '14555 — AB PM-JAY national call centre (states also run their own toll-free lines)',
    sources: [
        { label: 'PIB, 29 October 2026 — Ayushman Vay Vandana completes two years: ₹5 lakh per family, ₹5 lakh top-up, 23.46 lakh admissions', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2330009' },
        { label: 'Ministry of Health (PIB document), 23 September 2024 — six years of PM-JAY: 3/15 days, no family-size limit, day-one cover, 1,949 procedures', url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2024/sep/doc2024923400001.pdf' },
        { label: 'NHA beneficiary portal', url: 'https://beneficiary.nha.gov.in/' },
        { label: 'State Health Agency, Manipur — AB PM-JAY national helpline 14555', url: 'https://shamanipur.mn.gov.in/Static/Grievance' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'Who is eligible for Ayushman Bharat PM Jan Arogya Yojana?',
            a: 'Families identified through SECC 2011 deprivation and occupation criteria and any families your state has added, plus every citizen aged 70 or above regardless of income. You can check your name on beneficiary.nha.gov.in or by calling 14555.',
        },
        {
            q: 'Is Ayushman Bharat free for everyone above 70 years?',
            a: 'Yes. Since 29 October 2024 every Indian citizen aged 70 or above can enrol under Ayushman Vay Vandana with Aadhaar, with no income limit, for cover of up to ₹5 lakh a year.',
        },
        {
            q: 'My parents are 72 and our family already has an Ayushman card. Do they get more cover?',
            a: 'Yes. A senior aged 70+ in a family already covered by PM-JAY gets an additional ₹5 lakh a year for himself or herself, separate from the family\'s ₹5 lakh used by members under 70.',
        },
        {
            q: 'Does PM-JAY cover a disease I already have?',
            a: 'Yes. The Health Ministry states that all pre-existing conditions are covered from the very first day of enrolment.',
        },
        {
            q: 'Does the Ayushman card pay for medicines after discharge?',
            a: 'Yes, for 15 days after discharge, along with expenses such as diagnostics from up to 3 days before admission. The scheme pays for hospitalisation (secondary and tertiary care), so these extras are tied to a hospital stay.',
        },
        {
            q: 'Can I use my Ayushman card in another state?',
            a: 'Yes. Cover is portable, so you can get cashless treatment at any empanelled public or private hospital in India.',
        },
        {
            q: 'Is the ₹5 lakh per person or per family?',
            a: 'Per family per year, shared among all members. The exception is the separate ₹5 lakh top-up that a senior aged 70+ gets if the family is already covered.',
        },
    ],
    related: [
        { href: '/health-insurance-claim-settlement-ratio', label: 'Health insurance claim ratios', note: 'Compare private insurers if you need cover beyond ₹5 lakh' },
        { href: '/schemes/c-pmrahat', label: 'PM RAHAT', note: 'Cashless road-accident care up to ₹1.5 lakh at PM-JAY hospitals' },
        { href: '/schemes/c-abdm', label: 'Ayushman Bharat Digital Mission', note: 'ABHA health ID for your records' },
        { href: '/schemes/c-pmjjby', label: 'PM Jeevan Jyoti Bima Yojana', note: 'Low-cost life insurance through your bank account' },
    ],
    appIssues: [
        'App says "Coverage at 38,000+ empanelled hospitals (Sep 2026)" and "1.36 crore cards by Sep 2026"; neither figure was found in an official source checked today, so they are left out here.',
        'App eligibility describes 70+ cover only as "a separate ₹5 lakh family top-up"; the top-up applies only where the family is already in PM-JAY. Seniors from other families get ₹5 lakh per family per year (PIB, 29 Oct 2026).',
        'App benefits omit the 3-day pre- and 15-day post-hospitalisation cover and portability across states.',
    ],
} satisfies SchemeContent;
