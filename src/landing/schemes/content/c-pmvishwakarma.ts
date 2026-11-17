import type { SchemeContent } from '../types';

export default {
    id: 'c-pmvishwakarma',
    title: 'PM Vishwakarma Yojana 2026: ₹3 Lakh Loan at 5%, Status',
    description: 'PM Vishwakarma Yojana: ₹1 lakh + ₹2 lakh collateral-free loans at 5%, ₹15,000 toolkit e-voucher, ₹500/day stipend. Who can apply, CSC registration, status.',
    h1: 'PM Vishwakarma Yojana: loan, toolkit, eligibility, registration and status',
    answer: [
        'PM Vishwakarma lends a registered artisan up to ₹3 lakh without collateral in two tranches, ₹1 lakh repayable over 18 months and then ₹2 lakh over 30 months, at a fixed 5% interest, and adds a toolkit e-voucher of up to ₹15,000.',
        'Training pays a stipend of ₹500 a day, so the 5–7 day basic course earns ₹2,500 to ₹3,500 and the 15-day advanced course ₹7,500 (Ministry of MSME scheme guidelines, checked on pmvishwakarma.gov.in on 17 November 2026).',
        'The scheme is approved up to 2027-28, and enrolment is free, through a Common Service Centre or the portal with Aadhaar biometric authentication.',
    ],
    table: {
        caption: 'PM Vishwakarma benefits, amounts and when each one is paid',
        head: ['Benefit', 'Amount', 'When you get it'],
        rows: [
            ['PM Vishwakarma certificate and ID card', 'Recognition as a Vishwakarma', 'After the three-stage verification'],
            ['Basic training (5–7 days, 40 hours)', '₹500 a day: ₹2,500–₹3,500', 'Credited by DBT after training and certification'],
            ['Advanced training (15 days, 120 hours)', '₹500 a day: ₹7,500', 'Optional, only after basic training'],
            ['Toolkit incentive', 'Up to ₹15,000 as e-RUPI / e-voucher', 'After skill assessment; spent at designated centres on improved tools'],
            ['First loan tranche', 'Up to ₹1,00,000, 18 months, 5% interest', 'After completing basic training'],
            ['Second loan tranche', 'Up to ₹2,00,000, 30 months, 5% interest', 'After the first loan is fully repaid, and not before 6 months from its disbursement'],
            ['Digital transaction incentive', '₹1 per transaction, up to 100 a month (₹1,200 a year at most)', 'Credited monthly through Aadhaar Payment Bridge'],
            ['Marketing support', 'Quality certification, branding, e-commerce and trade-fair linkage', 'Through the National Committee for Marketing'],
        ],
        note: 'The Ministry of MSME pays the lender interest subvention of up to 8% upfront, and the Government bears the credit guarantee fee. Source: PM Vishwakarma guidelines (v30) and pmvishwakarma.gov.in.',
    },
    eligibility: [
        'An artisan or craftsperson working with hands and tools in one of the 18 family-based trades listed by the scheme (for example carpenter, boat maker, armourer, blacksmith, locksmith, goldsmith, potter, sculptor or stone breaker, cobbler, mason, basket or mat maker, doll maker, barber, garland maker, washerman, tailor, fishing-net maker)',
        'Self-employed in the unorganised sector and working in that trade on the date of registration',
        'At least 18 years old on the date of registration',
        'Only one member of a family can register (family = husband, wife and unmarried children)',
    ],
    notEligible: [
        'Anyone who took a self-employment or business loan under a similar central or state credit scheme (such as PMEGP, PM SVANidhi or MUDRA) in the last 5 years, counted from the date of sanction; MUDRA and SVANidhi borrowers who have fully repaid are eligible',
        'Government employees and members of their families',
    ],
    documents: [
        'Aadhaar (authentication is done by biometric at the CSC)',
        'Mobile number',
        'Bank account details, preferably the Aadhaar-seeded account; the CSC helps open one if needed',
        'Ration card; without one, the Aadhaar numbers of all family members',
    ],
    howToApply: [
        'Go to your nearest Common Service Centre, or apply yourself on pmvishwakarma.gov.in; enrolment is free.',
        'Complete Aadhaar biometric authentication and give your mobile number, bank details, ration card and trade details.',
        'Your application is checked by the Gram Panchayat or Urban Local Body, then vetted by the District Implementation Committee, and finally approved by the Screening Committee.',
        'Once registered, attend skill assessment and basic training; the toolkit voucher and the first loan tranche follow.',
    ],
    statusSteps: [
        'Open pmvishwakarma.gov.in and choose Login, then the Applicant/Beneficiary login.',
        'Enter the mobile number used at registration and the captcha.',
        'Check where your application stands in the three verification stages (panchayat or ULB, district committee, screening committee).',
        'If it is stuck, call the helpline 18002677777 or 17923.',
    ],
    portal: { label: 'PM Vishwakarma portal (Ministry of MSME)', url: 'https://pmvishwakarma.gov.in' },
    helpline: 'Toll-free 18002677777 and 17923; Champions Desk email champions@gov.in (pmvishwakarma.gov.in/Home/ContactUs).',
    sources: [
        { label: 'PM Vishwakarma scheme guidelines (Ministry of MSME, PDF)', url: 'https://pmvishwakarma.gov.in/cdn/MiscFiles/eng_v30.0_PM_Vishwakarma_Guidelines_final.pdf' },
        { label: 'PM Vishwakarma portal — benefits, eligibility and trades', url: 'https://pmvishwakarma.gov.in' },
        { label: 'PM Vishwakarma — contact and helpline', url: 'https://pmvishwakarma.gov.in/Home/ContactUs' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'Is the PM Vishwakarma loan interest really only 5%?',
            a: 'Yes. The borrower pays a fixed 5%; the Ministry of MSME pays the bank interest subvention of up to 8% upfront. No collateral is taken and the Government pays the credit guarantee fee.',
        },
        {
            q: 'Can I take the ₹2 lakh second loan straight away?',
            a: 'No. You must first repay the ₹1 lakh tranche in full, keep the account standard, and either use digital transactions in your business or complete advanced training. The second tranche is not granted within six months of the first disbursement.',
        },
        {
            q: 'Is the ₹15,000 toolkit given in cash?',
            a: 'No. It comes as an e-RUPI or e-voucher after skill assessment and can only be spent at designated centres on improved tools for your trade.',
        },
        {
            q: 'I already have a MUDRA loan. Can I still join PM Vishwakarma?',
            a: 'Only if it is fully repaid. A loan under a similar self-employment credit scheme such as PMEGP, PM SVANidhi or MUDRA in the last five years disqualifies you, but repaid MUDRA and SVANidhi borrowers are allowed.',
        },
        {
            q: 'Can my wife and I both register?',
            a: 'No. The benefits are limited to one member per family, where a family means husband, wife and unmarried children.',
        },
        {
            q: 'How much can I earn from the digital transaction incentive?',
            a: 'At most ₹100 a month. The scheme pays ₹1 for each eligible digital payment or receipt in your bank account, capped at 100 transactions a month, which is ₹1,200 a year.',
        },
        {
            q: 'Till when does PM Vishwakarma run?',
            a: 'It is approved for five years up to 2027-28. The portal reports that its target of 30 lakh registrations was reached in September 2025.',
        },
    ],
    related: [
        { href: '/schemes/c-mudra', label: 'PM MUDRA Yojana', note: 'Business loans for micro enterprises' },
        { href: '/schemes/c-pmegp', label: 'PMEGP', note: 'Margin-money subsidy of up to 35% for a new unit' },
        { href: '/schemes/c-udyam', label: 'Udyam Registration', note: 'Free MSME registration for artisans who grow into a business' },
        { href: '/emi', label: 'EMI calculator', note: 'Work out the monthly instalment on your tranche' },
    ],
    appIssues: [
        'App eligibility omits the exclusion of anyone with a PMEGP, PM SVANidhi or MUDRA loan in the last 5 years (unless MUDRA/SVANidhi is fully repaid) and of government employees and their families.',
        'App documents list only Aadhaar, bank account and mobile; the guidelines also ask for a ration card (or the Aadhaar numbers of all family members).',
        'App says to "Register at pmvishwakarma.gov.in"; registration is through a CSC or the portal with Aadhaar biometric authentication, followed by three-stage verification.',
        'App benefits omit the loan tenures (18 and 30 months), the ₹1-per-transaction digital incentive (up to 100 a month) and the advanced-training stipend.',
    ],
} satisfies SchemeContent;
