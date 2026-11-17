import type { SchemeContent } from '../types';

export default {
    id: 'c-pmsgmby',
    title: 'PM Surya Ghar Muft Bijli Yojana: ₹78,000 Subsidy, Status',
    description: 'PM Surya Ghar rooftop solar subsidy: ₹30,000 (1 kW), ₹60,000 (2 kW), ₹78,000 (3 kW+), repo-linked loans, how to apply and check status online.',
    h1: 'PM Surya Ghar Muft Bijli Yojana: subsidy by kW, how to apply and track your application',
    answer: [
        'PM Surya Ghar pays a central subsidy of ₹30,000 for a 1 kW rooftop solar system, ₹60,000 for 2 kW and ₹78,000 for 3 kW or more — 60% of the cost up to 2 kW and 40% of the extra cost from 2 to 3 kW, capped at 3 kW (Cabinet decision, PIB, 29 February 2024).',
        'By 4 August 2026, 50.06 lakh households had rooftop solar under the scheme and ₹28,024 crore of subsidy had been paid straight to their bank accounts; concessional loans were priced at the repo rate plus 0.5 percentage point, 5.75% at that date (PIB).',
    ],
    table: {
        caption: 'Which rooftop solar size suits your bill, and the subsidy for it',
        head: ['Average monthly consumption', 'Suitable rooftop solar size', 'Central subsidy'],
        rows: [
            ['0–150 units', '1–2 kW', '₹30,000 to ₹60,000'],
            ['150–300 units', '2–3 kW', '₹60,000 to ₹78,000'],
            ['Above 300 units', 'Above 3 kW', '₹78,000 (the cap)'],
        ],
        note: 'The subsidy stops growing after 3 kW, so a 5 kW system still gets ₹78,000. A 3 kW system generates more than 300 units a month on average (PIB). Subsidy is released within about 15 days of the redemption request once the plant is commissioned.',
    },
    eligibility: [
        'An Indian citizen household',
        'Owns a house with a roof suitable for solar panels',
        'Has a valid, grid-connected electricity connection from the local DISCOM',
        'Has not taken any other subsidy for solar panels',
    ],
    benefits: [
        'Central subsidy of ₹30,000 (1 kW), ₹60,000 (2 kW) or ₹78,000 (3 kW and above)',
        'Collateral-free concessional loan for systems up to 3 kW, benchmarked to the repo rate plus 0.5 percentage point',
        'Lower or zero electricity bills; PIB reported about 19 lakh households on zero bills by August 2026',
        'Surplus power can be sold to the DISCOM through net metering',
        'Fully online process: no technical feasibility approval needed up to 10 kW, and 32 states and UTs have removed application and net-metering charges',
    ],
    documents: [
        'Electricity consumer number and a recent bill',
        'Mobile number for registration and login',
        'Bank account details and a cancelled cheque, for the subsidy',
        'KYC and income papers the bank asks for, only if you take the concessional loan',
    ],
    howToApply: [
        'Visit pmsuryaghar.gov.in and register by giving your personal and electricity connection details.',
        'Log in with your consumer number and mobile number, and fill the rooftop solar application form.',
        'Wait for DISCOM approval, then get the plant installed by a registered vendor (the portal shows vendor ratings).',
        'Submit the plant details on the portal and apply for the net meter.',
        'After the net meter is installed and the DISCOM inspects the plant, download the commissioning certificate from the portal.',
        'Enter your bank details and a cancelled cheque to receive the subsidy.',
    ],
    statusSteps: [
        'Go to pmsuryaghar.gov.in and log in with your electricity consumer number and registered mobile number.',
        'Open your application to see where it stands: DISCOM approval, installation, net meter, inspection and commissioning, or subsidy release.',
        'If a stage stays pending, raise it through the grievance redressal mechanism on the portal.',
        'For help, call the scheme call centre on 15555 (12 languages).',
    ],
    portal: { label: 'PM Surya Ghar national portal', url: 'https://pmsuryaghar.gov.in/' },
    helpline: '15555 — PM Surya Ghar call centre (12 languages)',
    sources: [
        { label: 'PIB, 29 February 2024 — Cabinet approves PM Surya Ghar: ₹75,021 crore, 60%/40% CFA, ₹30,000/₹60,000/₹78,000, up to 300 free units', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2010133' },
        { label: 'PIB document, 13 March 2025 — subsidy by monthly consumption, eligibility, nine application steps', url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/mar/doc2025313520001.pdf' },
        { label: 'PIB, 4 August 2026 — 50.06 lakh households, ₹28,024 crore DBT, loans at 5.75% (repo + 50 bps), 10 kW feasibility waiver', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2294208' },
        { label: 'PIB, 8 December 2025 — 1 crore homes target by FY 2026-27, call centre 15555 in 12 languages', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2200441' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'How much subsidy do I get for a 3 kW rooftop solar system?',
            a: '₹78,000, the maximum under PM Surya Ghar. That is ₹30,000 a kW for the first 2 kW (60% of the benchmark cost) plus 40% of the cost of the third kW.',
        },
        {
            q: 'Is electricity really free under PM Surya Ghar Muft Bijli Yojana?',
            a: 'The scheme aims at up to 300 free units a month: a 3 kW system generates more than 300 units a month on average, which can wipe out a typical bill. Your actual saving depends on your usage and your state\'s net-metering tariff.',
        },
        {
            q: 'How do I check my PM Surya Ghar application status?',
            a: 'Log in on pmsuryaghar.gov.in with your electricity consumer number and registered mobile; the application page shows each stage up to subsidy release. You can also call 15555.',
        },
        {
            q: 'What is the interest rate on a PM Surya Ghar solar loan?',
            a: 'It is linked to the RBI repo rate plus 0.5 percentage point. PIB quoted 5.75% on 4 August 2026; because it is repo-linked, the rate moves when the repo rate moves.',
        },
        {
            q: 'Can I get the subsidy if I live in a rented house?',
            a: 'The eligibility listed by MNRE requires the household to own a house with a suitable roof and to hold a valid electricity connection, so a tenant does not meet the criteria in his or her own name.',
        },
        {
            q: 'How long does the PM Surya Ghar subsidy take to arrive?',
            a: 'About 15 days after the redemption request once the plant is commissioned and bank details are correct, according to MNRE; PIB says PFMS integration allows release within 15 days.',
        },
    ],
    related: [
        { href: '/break-even', label: 'Break-even calculator', note: 'Find how many years the solar plant takes to pay for itself' },
        { href: '/emi', label: 'EMI calculator', note: 'Work out the instalment on a solar loan' },
        { href: '/schemes/c-pmay-u', label: 'PM Awas Yojana Urban', note: 'Housing support for urban families' },
        { href: '/schemes/c-pmuy', label: 'PM Ujjwala Yojana', note: 'LPG connection and refill subsidy' },
    ],
    appIssues: [
        'App says "Up to 300 free units/month" as a fixed benefit; PIB frames it as the aim — a 3 kW system generates over 300 units a month on average — so the free units depend on system size and use.',
        'App eligibility omits that the household must own a house with a suitable roof and must not have taken any other solar subsidy.',
        'App does not mention the concessional loan (repo rate + 0.5 percentage point) or the subsidy tiers by size (₹30,000 for 1 kW, ₹60,000 for 2 kW).',
    ],
} satisfies SchemeContent;
