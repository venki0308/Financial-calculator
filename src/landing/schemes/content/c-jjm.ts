import type { SchemeContent } from '../types';

export default {
    id: 'c-jjm',
    title: 'Jal Jeevan Mission 2.0: Details and Tap Connection Status',
    description: 'Jal Jeevan Mission runs to December 2028 with a ₹8.69 lakh crore outlay; 15.89 crore of 19.36 crore rural homes have tap water. How a home gets connected.',
    h1: 'Jal Jeevan Mission: details, progress and how a rural home gets a tap connection',
    answer: [
        'Jal Jeevan Mission aims to give every rural household a tap that supplies at least 55 litres of safe drinking water per person per day; on 10 March 2026 the Cabinet extended it to December 2028 as JJM 2.0 and raised the total outlay to ₹8.69 lakh crore, with a central share of ₹3.59 lakh crore (PIB).',
        'As of 18 July 2026, 15.89 crore of the 19.36 crore rural households (82.09%) had tap water at home, against 3.23 crore when the mission began in August 2019 (PIB, 27 July 2026).',
    ],
    table: {
        caption: 'Jal Jeevan Mission in numbers',
        head: ['Measure', 'Figure', 'Date'],
        rows: [
            ['Rural homes with tap water when JJM started', '3.23 crore (16.71%)', 'August 2019'],
            ['Connections added under JJM', 'About 12.66 crore', '18 July 2026'],
            ['Rural homes with tap water now', '15.89 crore of 19.36 crore (82.09%)', '18 July 2026'],
            ['Total outlay (after JJM 2.0)', '₹8.69 lakh crore, of which central share ₹3.59 lakh crore', 'Approved 10 March 2026'],
            ['Deadline for all rural homes', 'December 2028', 'JJM 2.0'],
        ],
        note: 'Coverage figures are as reported by states on the JJM-IMIS system (PIB, 27 July 2026).',
    },
    benefits: [
        'A functional household tap connection for every rural home',
        'At least 55 litres per person per day, of BIS:10500 quality, on a regular long-term basis',
        'Village schemes handed over to the Gram Panchayat and Village Water & Sanitation Committee ("Jal Arpan")',
        'Under JJM 2.0, every village gets a Sujal Gaon / Service Area ID on the "Sujalam Bharat" digital framework mapping water supply from source to tap',
    ],
    howToApply: [
        'No individual application is needed — the state\'s drinking water department plans and builds the piped scheme for the whole village with the Gram Panchayat.',
        'If your home was left out of the village scheme, raise it with the Gram Panchayat or its Village Water & Sanitation Committee (Pani Samiti), or at the Gram Sabha.',
        'Ask the panchayat about the local user charge: states have been told to let Gram Panchayats or VWSCs collect it for operation and maintenance, often through women\'s self-help groups.',
        'A Gram Panchayat declares itself "Har Ghar Jal" only after every home is connected and maintenance arrangements are in place.',
    ],
    portal: { label: 'Jal Jeevan Mission (Department of Drinking Water & Sanitation)', url: 'https://jaljeevanmission.gov.in' },
    sources: [
        { label: 'PIB, 10 March 2026 — Cabinet extends JJM to December 2028 (JJM 2.0)', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2237548' },
        { label: 'PIB, 27 July 2026 — 15.89 crore households, 55 lpcd, user charges', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2290048' },
        { label: 'PIB, 25 March 2026 — JJM 2.0 reform areas and MoUs with states', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2245008' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'How do I apply for a Jal Jeevan Mission tap connection?',
            a: 'You don\'t apply individually. The state water department builds the village scheme and connects every household; if your home was skipped, take it up with the Gram Panchayat or Pani Samiti.',
        },
        {
            q: 'What is JJM 2.0?',
            a: 'The restructured phase approved on 10 March 2026. It shifts the focus from building pipelines to reliable service, adds the Sujalam Bharat digital IDs, hands schemes to panchayats through "Jal Arpan", promotes an annual "Jal Utsav", and is run through separate MoUs with states — 11 had signed by March 2026.',
        },
        {
            q: 'How much water should a JJM tap give?',
            a: 'At least 55 litres per person per day of water that meets the BIS:10500 drinking water standard, supplied regularly.',
        },
        {
            q: 'Is Jal Jeevan Mission water free?',
            a: 'Not necessarily. Drinking water is a state subject, and states have been advised to let Gram Panchayats or VWSCs levy user charges to pay for running and maintaining the system; the amount is decided locally.',
        },
        {
            q: 'What does "Har Ghar Jal" village mean?',
            a: 'It is a village whose Gram Panchayat has certified that every household has a working tap connection. Under JJM 2.0 the certification is allowed only once in-village operation and maintenance arrangements are in place.',
        },
        {
            q: 'When will every rural home have tap water?',
            a: 'The target under JJM 2.0 is December 2028, for all 19.36 crore rural households.',
        },
    ],
    related: [
        { href: '/schemes/c-pmay-g', label: 'PM Awas Yojana Gramin', note: 'Rural housing that converges with JJM' },
        { href: '/schemes/c-mgnrega', label: 'VB-G RAM G (ex-MGNREGA)', note: 'Rural wage employment guarantee' },
        { href: '/schemes/c-pmksy', label: 'PM Krishi Sinchayee Yojana', note: 'Water for farms: irrigation and micro-irrigation' },
    ],
} satisfies SchemeContent;
