import type { SchemeContent } from '../types';

export default {
    id: 'c-daynrlm',
    title: 'National Rural Livelihood Mission (DAY-NRLM): SHG Funds',
    description: 'DAY-NRLM gives rural women\'s SHGs a ₹20,000–₹30,000 revolving fund, up to ₹2.5 lakh community fund and 7% bank loans up to ₹3 lakh. How to join.',
    h1: 'National Rural Livelihoods Mission (DAY-NRLM): SHG funds, loan interest and how to join',
    answer: [
        'DAY-NRLM organises poor rural households into women\'s self-help groups and gives each eligible group a Revolving Fund of ₹20,000–₹30,000, up to ₹2.5 lakh from the Community Investment Fund, and bank loans at 7% a year up to ₹3 lakh, which is ₹21,000 of interest a year on a full ₹3 lakh loan.',
        'By June 2026 the mission had brought about 10.08 crore households into nearly 92 lakh SHGs across 760 districts in 34 states and UTs, and SHGs had borrowed ₹13.41 lakh crore from banks (Lok Sabha reply, PIB, 4 August 2026).',
        'It is run through State Rural Livelihoods Missions; there is no individual online application, and households join by becoming members of a village SHG.',
    ],
    table: {
        caption: 'Money available to a self-help group under DAY-NRLM',
        head: ['Support', 'Amount or rate', 'Used for'],
        rows: [
            ['Revolving Fund (RF)', '₹20,000–₹30,000 per SHG', 'Capitalisation support for income-generating and livelihood activities'],
            ['Community Investment Fund (CIF)', 'Up to ₹2.50 lakh per SHG', 'Capitalisation support, including for entrepreneurial ventures'],
            ['Bank loan up to ₹3 lakh', '7% a year', 'Group and member livelihoods; 7% on ₹3 lakh is ₹21,000 a year'],
            ['Bank loan above ₹3 lakh up to ₹5 lakh', 'Bank\'s 1-year MCLR or external benchmark rate, or 10%, whichever is lower', 'Larger livelihood activities'],
        ],
        note: 'Source: Minister of State for Rural Development, written reply in Lok Sabha, 4 August 2026 (PIB). Interest worked at simple annual rate on the full amount.',
    },
    benefits: [
        'Membership of a women\'s self-help group supported by the State Rural Livelihoods Mission',
        'Revolving Fund of ₹20,000–₹30,000 and Community Investment Fund of up to ₹2.5 lakh per eligible SHG',
        'Bank credit at 7% a year for SHG loans up to ₹3 lakh, and at the bank\'s 1-year MCLR or 10% (whichever is lower) from ₹3 lakh to ₹5 lakh',
        'Market access for SHG products through SARAS Aajeevika melas and the eSARAS online platform',
        'Support to reach the Lakhpati Didi income level of ₹1 lakh a year per household',
    ],
    howToApply: [
        'Join an existing women\'s SHG in your village, or form a new one with neighbours, with help from the State Rural Livelihoods Mission\'s community resource persons or block staff.',
        'Once the SHG meets the mission\'s norms, it can receive the Revolving Fund and the Community Investment Fund as capitalisation support.',
        'Through its bank account the SHG can borrow from the bank at the concessional rate of 7% on loans up to ₹3 lakh.',
        'Ask the block or district mission unit about training, enterprise support and market linkages.',
    ],
    portal: { label: 'LokOS — public portal of DAY-NRLM (Ministry of Rural Development)', url: 'https://lokos.dord.gov.in/' },
    helpline: 'Contact the block or district office of your State Rural Livelihoods Mission.',
    sources: [
        { label: 'PIB, 4 August 2026 — Lok Sabha reply: DAY-NRLM coverage, RF, CIF and SHG interest', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2294301' },
        { label: 'PIB, 21 October 2026 — National SARAS Mela and eSARAS under DAY-NRLM', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2325711' },
        { label: 'PIB note — Lakhpati Didi definition (August 2024)', url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2024/aug/doc2024829382701.pdf' },
        { label: 'LokOS — DAY-NRLM public portal', url: 'https://lokos.dord.gov.in/' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'What does DAY stand for in DAY-NRLM?',
            a: 'Deendayal Antyodaya Yojana. The full name is Deendayal Antyodaya Yojana – National Rural Livelihoods Mission, a poverty-reduction programme of the Ministry of Rural Development.',
        },
        {
            q: 'Can an individual apply online for NRLM benefits?',
            a: 'No. Benefits flow through self-help groups, so you take part by joining or forming a women\'s SHG in your village with help from the State Rural Livelihoods Mission.',
        },
        {
            q: 'How much interest does an SHG pay on a ₹3 lakh loan?',
            a: '7% a year, which is ₹21,000 a year on the full ₹3 lakh. Above ₹3 lakh and up to ₹5 lakh, the bank charges its one-year MCLR or benchmark rate, or 10%, whichever is lower.',
        },
        {
            q: 'How much capitalisation support can one SHG get from DAY-NRLM?',
            a: 'Up to ₹2.8 lakh in capitalisation support: a Revolving Fund of ₹20,000–₹30,000 plus up to ₹2.5 lakh from the Community Investment Fund, both meant for income-generating and livelihood activities. Bank loans come on top of this.',
        },
        {
            q: 'How big is DAY-NRLM?',
            a: 'About 10.08 crore rural households in nearly 92 lakh SHGs as of June 2026, in 7,246 blocks of 760 districts across 34 states and UTs.',
        },
        {
            q: 'Where can SHG members sell their products?',
            a: 'At SARAS Aajeevika melas organised under DAY-NRLM, including the national SARAS Mela held in Vijayawada from 13 to 31 October 2026, and online through eSARAS.',
        },
    ],
    related: [
        { href: '/schemes/c-lakhpati', label: 'Lakhpati Didi', note: 'Helping SHG women reach ₹1 lakh household income' },
        { href: '/schemes/c-mgnrega', label: 'VB-G RAM G', note: 'Guaranteed wage work for rural households' },
        { href: '/schemes/c-ddugky', label: 'DDU Grameen Kaushalya Yojana', note: 'Skill training and placement for rural youth' },
        { href: '/simple-interest', label: 'Simple interest calculator', note: 'Interest on an SHG loan at 7%' },
    ],
    appIssues: [
        'App links nrlm.gov.in, which on 17 November 2026 served a certificate for lokos.in and a 404; the Ministry\'s public DAY-NRLM portal is lokos.dord.gov.in.',
        'App benefits ("SHG formation and revolving fund", "Bank credit linkage", "Skill training and placement") give no amounts; official figures: Revolving Fund ₹20,000–₹30,000, CIF up to ₹2.5 lakh, 7% interest on SHG loans up to ₹3 lakh.',
    ],
} satisfies SchemeContent;
