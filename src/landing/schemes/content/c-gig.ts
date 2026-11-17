import type { SchemeContent } from '../types';

export default {
    id: 'c-gig',
    title: 'e-Shram Registration for Gig Workers: Eligibility, UAN Card',
    description: 'e-Shram: free registration for gig, platform and unorganised workers aged 16+, with a 12-digit UAN. Who can register, documents, card download, helpline.',
    h1: 'e-Shram registration for gig and platform workers: eligibility, steps and UAN card',
    answer: [
        'Any unorganised worker aged 16 or above, including gig and platform workers, who does not pay income tax and is not a member of EPFO or ESIC can register free on e-Shram with an Aadhaar number and a mobile number, and gets a 12-digit Universal Account Number (UAN) (PIB, 25 August 2026).',
        'The e-Shram card does not pay money by itself; through the portal, registered workers can enrol in PM Suraksha Bima Yojana (₹2 lakh for accidental death or permanent disability) and PM Jeevan Jyoti Bima Yojana (₹2 lakh life cover), and in PM-SYM for a ₹3,000 monthly pension from age 60.',
        'e-Shram had 31.89 crore registrations by August 2026, including about 11.5 lakh platform workers.',
    ],
    table: {
        caption: 'e-Shram registration at a glance, and the schemes you can join through it',
        head: ['Item', 'Detail'],
        rows: [
            ['Who can register', 'Unorganised workers aged 16 and above — gig and platform, construction, migrant, domestic, agricultural workers, street vendors and others'],
            ['Who cannot', 'Income-tax payers and members of EPFO or ESIC'],
            ['What you need', 'Aadhaar number for e-KYC and a mobile number (preferably linked to Aadhaar)'],
            ['Cost', 'Free; no fee to any agency'],
            ['What you get', 'A 12-digit Universal Account Number (UAN) and the e-Shram card'],
            ['PMSBY through the portal', '₹2 lakh for accidental death or permanent disability, ₹1 lakh for partial disability; premium ₹20 a year'],
            ['PMJJBY through the portal', '₹2 lakh life cover for death from any cause'],
            ['PM-SYM through the portal', 'Minimum assured pension of ₹3,000 a month from age 60, subject to eligibility'],
        ],
        note: 'Sources: PIB backgrounder "5 Years of e-Shram Portal" (25 August 2026); PMSBY premium from the Department of Financial Services.',
    },
    eligibility: [
        'A worker aged 16 or above in the unorganised sector, including gig and platform workers',
        'Also a worker in the organised sector who is not a member of ESIC or EPFO and is not a government employee',
        'Not an income-tax payer',
    ],
    notEligible: [
        'Members of EPFO or ESIC',
        'Income-tax payers',
        'Government employees',
    ],
    benefits: [
        '12-digit Universal Account Number (UAN) and e-Shram card',
        'One-stop access to 15 social security and welfare schemes, including PM-SYM, PMSBY, PMJJBY, NSAP, One Nation One Ration Card and PMAY-G',
        'Enrolment in PMSBY (₹2 lakh accident cover) and PMJJBY (₹2 lakh life cover) from the portal; each scheme\'s own premium applies',
        'Links to the National Career Service for jobs and to the Skill India Digital Hub for skilling and apprenticeships',
    ],
    howToApply: [
        'Self-register at register.eshram.gov.in, or visit the nearest Common Service Centre or State Seva Kendra; state field officers also hold registration drives.',
        'Enter your Aadhaar number and mobile number and complete Aadhaar e-KYC.',
        'Fill in the personal and occupation details the form asks for; bank details can also be added later through a profile update.',
        'Submit to get your UAN, then download the e-Shram card after logging in.',
    ],
    statusSteps: [
        'Open eshram.gov.in and log in with your UAN and the OTP sent to your registered mobile.',
        'Choose "Download UAN Card" to get your e-Shram card.',
        'Use the profile update option to change details, or visit a CSC; for problems call 14434.',
    ],
    portal: { label: 'e-Shram portal (Ministry of Labour and Employment)', url: 'https://eshram.gov.in' },
    helpline: '14434, or 1800-889-6811 (9 am to 6 pm, all days including Sunday)',
    sources: [
        { label: 'PIB backgrounder — 5 Years of e-Shram Portal (25 August 2026)', url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/aug/doc_9692_20260825_14270901.pdf' },
        { label: 'e-Shram — FAQs (age, free registration, UAN card, helpline)', url: 'https://eshram.gov.in/faqs' },
        { label: 'e-Shram self-registration', url: 'https://register.eshram.gov.in/#/user/self' },
        { label: 'Department of Financial Services — PMSBY premium and cover', url: 'https://financialservices.gov.in/pmsby' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'Can food-delivery riders, cab drivers and other app-based workers register on e-Shram?',
            a: 'Yes. Gig and platform workers are covered as unorganised workers, as long as they are 16 or older, do not pay income tax and are not EPFO or ESIC members. About 11.5 lakh platform workers had registered by August 2026.',
        },
        {
            q: 'Is there an upper age limit for e-Shram?',
            a: 'No upper limit is stated in the latest official material: the Ministry\'s August 2026 backgrounder and the portal FAQ both say workers aged 16 and above are eligible.',
        },
        {
            q: 'Does the e-Shram card give ₹2 lakh insurance automatically?',
            a: 'No. You enrol in PM Suraksha Bima Yojana through the portal and pay its own premium of ₹20 a year; the cover is then ₹2 lakh for accidental death or permanent disability.',
        },
        {
            q: 'Does e-Shram registration cost anything?',
            a: 'No. Registration is completely free, and you should not pay any fee to a cyber café, agent or service provider.',
        },
        {
            q: 'Do I need a bank account to register?',
            a: 'Only Aadhaar and a mobile number are required to register. Bank details can be added or changed later through a profile update.',
        },
        {
            q: 'I pay into EPF at my job. Can I still register?',
            a: 'No. Members of EPFO or ESIC are already covered by organised-sector social security and cannot register on e-Shram.',
        },
        {
            q: 'How do I get a pension through e-Shram?',
            a: 'By enrolling in PM Shram Yogi Maan-Dhan from the portal, if you meet its conditions; it promises a minimum pension of ₹3,000 a month after you turn 60.',
        },
    ],
    related: [
        { href: '/schemes/c-pmsby', label: 'PM Suraksha Bima Yojana', note: '₹2 lakh accident cover for ₹20 a year' },
        { href: '/schemes/c-pmsym', label: 'PM Shram Yogi Maandhan', note: '₹3,000 monthly pension from 60' },
        { href: '/schemes/c-pmjjby', label: 'PM Jeevan Jyoti Bima Yojana', note: '₹2 lakh life cover' },
        { href: '/expense-tracker', label: 'Expense tracker', note: 'Track irregular gig income and spending' },
    ],
    appIssues: [
        'App eligibility says age 16–59; the official FAQ and the August 2026 PIB backgrounder say 16 and above with no upper limit.',
        'App benefit "₹2 lakh accidental cover under PMSBY" reads as automatic; it is a separate PMSBY enrolment through the portal with its own ₹20 yearly premium.',
        'App eligibility omits that income-tax payers cannot register.',
    ],
} satisfies SchemeContent;
