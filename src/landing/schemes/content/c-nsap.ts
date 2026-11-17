import type { SchemeContent } from '../types';

export default {
    id: 'c-nsap',
    title: 'PM Samajik Sahayata Yojana (NSAP): Pension Amounts 2026',
    description: 'NSAP is now PM Samajik Sahayata Yojana: ₹200–₹500 old-age pension, ₹300 widow pension, ₹20,000 family benefit, new ₹375 disability pension. Who qualifies.',
    h1: 'PM Samajik Sahayata Yojana (formerly NSAP): pension amounts, eligibility and how to apply',
    answer: [
        'Under PM Samajik Sahayata Yojana, the renamed National Social Assistance Programme, the Centre pays a BPL senior citizen ₹200 a month from age 60 to 79 and ₹500 from 80, a BPL widow ₹300 a month (₹500 from 80), and a one-time ₹20,000 to a poor family that loses its main earner; states add their own top-up.',
        'The Union Cabinet approved the programme for 2026-27 to 2030-31 with ₹53,428 crore on 14 October 2026, renamed it and its sub-schemes, and raised the disability pension to ₹375 a month (₹625 from age 80) with a 40% disability benchmark and no minimum age.',
        'The revised disability rules apply once new guidelines are issued, which the Cabinet said would be within three months; the old-age, widow and family schemes continue unchanged.',
    ],
    table: {
        caption: 'Central assistance under PM Samajik Sahayata Yojana (state top-ups are extra)',
        head: ['Sub-scheme (old name)', 'Who gets it', 'Central share a month', 'A year'],
        rows: [
            ['PM Vridhavastha Pension Yojana (IGNOAPS)', 'BPL, age 60–79', '₹200', '₹2,400'],
            ['PM Vridhavastha Pension Yojana (IGNOAPS)', 'BPL, age 80 and above', '₹500', '₹6,000'],
            ['PM Vidhawa Pension Yojana (IGNWPS)', 'BPL widow, age 40–79', '₹300', '₹3,600'],
            ['PM Vidhawa Pension Yojana (IGNWPS)', 'BPL widow, age 80 and above', '₹500', '₹6,000'],
            ['PM Divyangjan Pension Yojana (IGNDPS), current rules', 'BPL, age 18–79, severe or multiple disability', '₹300', '₹3,600'],
            ['PM Divyangjan Pension Yojana, revised (after new guidelines)', 'Benchmark disability of 40%, from birth to age 79', '₹375', '₹4,500'],
            ['PM Divyangjan Pension Yojana, revised (after new guidelines)', 'Benchmark disability of 40%, age 80 and above', '₹625', '₹7,500'],
            ['PM Parivar Labh Yojana (NFBS)', 'BPL family whose main earner died aged 18–59', '₹20,000 once', '—'],
        ],
        note: 'Sources: PIB backgrounder on NSAP (7 November 2025) for current amounts; Cabinet decision of 14 October 2026 (PMIndia) for the new names and the revised disability pension.',
    },
    eligibility: [
        'The household must be below the poverty line (BPL) as identified for the programme',
        'Old-age pension: age 60 or above',
        'Widow pension: widows aged 40 or above',
        'Disability pension today: age 18–79 with severe or multiple disabilities; under the revised rules, 40% benchmark disability with no minimum age, once the new guidelines are issued',
        'Family benefit: death of the household\'s primary breadwinner aged between 18 and 59',
    ],
    howToApply: [
        'Apply through your Gram Panchayat (villages) or municipality (towns); they help identify eligible people.',
        'Submit the state\'s pension form with proof of age, BPL status, widowhood, disability or the breadwinner\'s death, plus Aadhaar and bank or post office account details.',
        'The state department that runs the scheme sanctions the pension and adds its own top-up.',
        'Pensions are paid mostly by DBT into the bank or post office account; postal money order or doorstep cash is allowed in extreme cases.',
    ],
    portal: { label: 'NSAP portal (Ministry of Rural Development)', url: 'https://nsap.dord.gov.in/' },
    helpline: 'Applications and complaints are handled by the state department running the pension; contact the Gram Panchayat, block or municipal office.',
    sources: [
        { label: 'PMIndia — Cabinet approves continuation of NSAP for 2026-27 to 2030-31 (14 October 2026)', url: 'https://www.pmindia.gov.in/en/news_updates/cabinet-approves-continuation-of-the-national-social-assistance-programme-for-five-years-from-2026-27-to-2030-31/' },
        { label: 'PIB backgrounder — National Social Assistance Programme (November 2025)', url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc2025117686801.pdf' },
        { label: 'NSAP portal', url: 'https://nsap.dord.gov.in/' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'Why does my state pay more than ₹200 a month?',
            a: 'Because states add a top-up to the central share. PIB reported top-ups of ₹50 to ₹5,700 a month, taking the average NSAP pension to about ₹1,100 a month in many states.',
        },
        {
            q: 'When does the ₹375 disability pension start?',
            a: 'After the revised guidelines are issued. The Cabinet approved it on 14 October 2026 and said the guidelines on eligibility, number of beneficiaries and rate would be issued and implemented within three months.',
        },
        {
            q: 'What are the new names of the NSAP schemes?',
            a: 'NSAP became PM Samajik Sahayata Yojana; IGNOAPS is now PM Vridhavastha Pension Yojana, IGNWPS is PM Vidhawa Pension Yojana, IGNDPS is PM Divyangjan Pension Yojana and NFBS is PM Parivar Labh Yojana.',
        },
        {
            q: 'Why was the disability benchmark cut from 80% to 40%?',
            a: 'To match the Rights of Persons with Disabilities Act, 2016, which ties benefits to a 40% benchmark disability and asks that disability assistance be at least 25% higher than similar schemes for other groups.',
        },
        {
            q: 'How do pensioners give their yearly life certificate?',
            a: 'Through an Aadhaar-based Digital Life Certificate mobile app for NSAP pensioners, launched on 15 July 2025, instead of the manual check that states used to do.',
        },
        {
            q: 'Is the ₹20,000 family benefit paid every year?',
            a: 'No. PM Parivar Labh Yojana is a single lump sum to a BPL household after the death of its main earner who was 18 to 59 years old.',
        },
        {
            q: 'How many people get these pensions?',
            a: 'About 3.20 crore beneficiaries across all 36 states and UTs, according to the Cabinet decision of October 2026.',
        },
    ],
    related: [
        { href: '/atal-pension', label: 'Atal Pension Yojana', note: 'A contributory pension of ₹1,000–₹5,000 from age 60' },
        { href: '/schemes/c-pmsym', label: 'PM Shram Yogi Maandhan', note: 'Pension scheme for unorganised workers' },
        { href: '/schemes/c-mgnrega', label: 'VB-G RAM G', note: '125 days of rural wage work a year' },
        { href: '/schemes/c-abpmjay', label: 'Ayushman Bharat PM-JAY', note: 'Free hospital cover for poor families' },
    ],
    appIssues: [
        'App eligibility and benefits do not give the widow pension amount (₹300 a month at 40–79, ₹500 from 80) or the widow age limit.',
        'App says the disability benchmark is "being lowered" without stating today\'s rules (age 18–79, severe or multiple disability, ₹300 a month) that apply until the new guidelines are issued.',
    ],
} satisfies SchemeContent;
