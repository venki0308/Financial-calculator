import type { SchemeContent } from '../types';

export default {
    id: 'c-pmksy',
    title: 'PM Krishi Sinchayee Yojana: Drip Subsidy 55%, Components',
    description: 'PMKSY (Har Khet Ko Pani, More Crop Per Drop): 55% drip and sprinkler aid for small farmers, 45% for others, up to 5 ha. Components and how to apply.',
    h1: 'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY): components, drip subsidy and how farmers apply',
    answer: [
        'Under Per Drop More Crop, the Centre pays 55% of the cost of a drip or sprinkler system for small and marginal farmers and 45% for other farmers, for up to 5 hectares per beneficiary, and many states add a top-up (PIB, 29 August 2026).',
        'PMKSY was approved by the Cabinet on 1 July 2015; its 2021-26 phase has an outlay of ₹93,068.56 crore and the Union Budget 2026-27 allocated ₹6,587 crore (PIB backgrounder, June 2026).',
    ],
    table: {
        caption: 'Central assistance for drip and sprinkler irrigation (Per Drop More Crop)',
        head: ['Who', 'Assistance (share of benchmark cost)'],
        rows: [
            ['Small and marginal farmers', '55%'],
            ['Other farmers', '45%'],
            ['Forest Rights Act patta holders', '90%'],
            ['Area limit', 'Up to 5 hectares per beneficiary'],
            ['Help again for the same land', 'After 7 years'],
        ],
        note: 'Since 2022-23 Per Drop More Crop is run under PM-RKVY; states may pay an extra top-up from their own budgets.',
    },
    eligibility: [
        'Any farmer can seek drip or sprinkler assistance under Per Drop More Crop through the state agriculture or horticulture department',
        'Higher rate (55%) for small and marginal farmers; 90% for Forest Rights Act patta holders',
        'Up to 5 hectares per beneficiary; the same land qualifies again only after 7 years',
        'Canal, minor-irrigation and watershed works are taken up by state governments, not on individual applications',
    ],
    benefits: [
        'Accelerated Irrigation Benefit Programme (AIBP): completion of major and medium irrigation projects; a Modernisation of Command Area Development and Water Management sub-scheme with an initial ₹1,600 crore was approved in 2025-26',
        'Har Khet Ko Pani: new minor-irrigation sources and repair, renovation and restoration of water bodies',
        'Watershed Development: better use of rainfed and degraded land',
        'Per Drop More Crop: drip and sprinkler subsidy, paid through direct benefit transfer (now under PM-RKVY)',
    ],
    howToApply: [
        'Apply for a drip or sprinkler system to your state agriculture or horticulture department — most states take applications on their own online portals.',
        'Get the system designed and installed as your state\'s procedure requires; assistance is worked out on the benchmark cost.',
        'After the installation is verified, the subsidy is paid to you by direct benefit transfer.',
        'For canals, check dams or tank repairs, approach the state irrigation or rural development department through your Gram Panchayat — these are not individual subsidies.',
    ],
    portal: { label: 'PMKSY portal (Ministry of Agriculture and Farmers Welfare)', url: 'https://pmksy.gov.in/' },
    sources: [
        { label: 'PIB, 29 August 2026 — Per Drop More Crop: 55%/45%, 5 ha, 7 years, 115 lakh ha', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2304480' },
        { label: 'PIB backgrounder, June 2026 — PMKSY components and outlay (PDF)', url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/jun/doc2026630906701.pdf' },
        { label: 'PMKSY portal — approval on 1 July 2015, PDMC under RKVY', url: 'https://pmksy.gov.in/' },
        { label: 'Lok Sabha Unstarred Q. 3949 — 90% assistance for FRA patta holders', url: 'https://sansad.in/getFile/lsapps/loksabhaquestions/annex/187/AU3949_3xRqy3.pdf' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'When was PM Krishi Sinchayee Yojana launched?',
            a: 'The Cabinet Committee on Economic Affairs approved PMKSY on 1 July 2015; Per Drop More Crop began operating in 2015-16.',
        },
        {
            q: 'What is the motto of PMKSY?',
            a: '"Har Khet Ko Pani" (water to every field) for extending irrigation, and "More Crop Per Drop" for using water efficiently.',
        },
        {
            q: 'How much subsidy is there on drip irrigation in 2026?',
            a: 'The central share is 55% of the benchmark cost for small and marginal farmers and 45% for others, up to 5 hectares. Your state may add more, so the total you receive depends on where you farm.',
        },
        {
            q: 'Is Per Drop More Crop still part of PMKSY?',
            a: 'It was a PMKSY component from 2015-16 to 2021-22. Since 2022-23 it is implemented under the Pradhan Mantri Rashtriya Krishi Vikas Yojana (PM-RKVY), which in 2025-26 earmarked ₹3,226.36 crore for it.',
        },
        {
            q: 'How much land is under micro-irrigation?',
            a: 'About 115 lakh hectares as of July 2026, roughly 8.11% of India\'s net sown area. In 2025-26 alone, 12.30 lakh farmers benefited and around 20% of them were women.',
        },
        {
            q: 'What has PMKSY achieved so far?',
            a: 'Since 2016-17 it has benefited over 27 million farmers and created or restored irrigation potential on 24.61 million hectares, with central assistance of more than ₹64,407 crore (PIB, June 2026).',
        },
    ],
    related: [
        { href: '/schemes/c-pmkusum', label: 'PM KUSUM', note: 'Solar pumps to run your drip system' },
        { href: '/schemes/c-pmfby', label: 'PM Fasal Bima Yojana', note: 'Crop insurance against drought and flood' },
        { href: '/schemes/c-kcc', label: 'Kisan Credit Card', note: 'Credit for your share of the system cost' },
        { href: '/schemes/c-pmddky', label: 'PM Dhan-Dhaanya Krishi Yojana', note: 'Irrigation support in 100 low-productivity districts' },
    ],
    appIssues: [
        'App says PMKSY is "not directly applied by farmers"; farmers do apply individually for drip and sprinkler assistance (55% / 45%, up to 5 ha), now under PM-RKVY.',
        'App does not mention that Per Drop More Crop moved from PMKSY to PM-RKVY in 2022-23.',
    ],
} satisfies SchemeContent;
