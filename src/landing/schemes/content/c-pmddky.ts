import type { SchemeContent } from '../types';

export default {
    id: 'c-pmddky',
    title: 'PM Dhan Dhanya Krishi Yojana: 100 Districts, Benefits',
    description: 'PM Dhan-Dhaanya Krishi Yojana: ₹24,000 crore a year for six years in 100 low-productivity districts, by pooling 36 farm schemes. How farmers benefit.',
    h1: 'PM Dhan-Dhaanya Krishi Yojana: what it is, which districts and how farmers benefit',
    answer: [
        'PM Dhan-Dhaanya Krishi Yojana (PMDDKY) spends ₹24,000 crore a year for six years from 2025-26 to lift farming in 100 districts with low productivity, low cropping intensity and weak farm credit, and aims to reach about 1.7 crore farmers (PIB, 19 July 2025).',
        'It has no separate application form: it works by pooling 36 existing Central schemes across 11 ministries with state schemes in those districts. The Cabinet approved it on 16 July 2025 and the Prime Minister launched it on 11 October 2025 (PIB factsheet, 10 October 2026).',
    ],
    table: {
        caption: 'PM Dhan-Dhaanya Krishi Yojana at a glance',
        head: ['Feature', 'Detail'],
        rows: [
            ['Outlay', '₹24,000 crore a year for six years, starting 2025-26'],
            ['Coverage', '100 Aspirational Agricultural Districts; at least one in every state'],
            ['How districts were picked', 'Low productivity, low cropping intensity and low farm credit disbursement, weighted by each state\'s share of net cropped area and operational holdings'],
            ['Delivery', 'Convergence of 36 Central schemes across 11 ministries, plus state schemes and private partners'],
            ['Farmers expected to benefit', 'About 1.7 crore'],
            ['Who plans locally', 'District Dhan Dhaanya Krishi Yojana Samiti headed by the District Collector, with a District Action Plan'],
            ['Monitoring', '121 indicators (74 output, 47 outcome); districts ranked monthly on the pmddky.niti.gov.in dashboard'],
        ],
        note: 'Progress reported by PIB: the average district score across the six objectives rose from 18.85 in April 2026 to 46.89 in August 2026; the credit-access objective moved from 2.40 to 6.53 and post-harvest storage from 2.14 to 5.19.',
    },
    eligibility: [
        'Farmers in one of the 100 selected PMDDKY districts',
        'Benefits reach you through the schemes being converged (for example crop credit, irrigation, storage, seeds and allied activities), so each benefit follows the rules of the scheme that delivers it',
        'Farmer Producer Organisations in these districts can also take part in district plans and events such as the PM-DDKY FPO Sangam',
    ],
    benefits: [
        'Higher productivity and crop diversification support under the District Action Plan',
        'Post-harvest storage built at panchayat and block level',
        'Better irrigation through converged schemes',
        'Easier access to short-term and long-term farm credit',
        'Encouragement for natural and organic farming, water and soil conservation',
    ],
    documents: [
        'No separate PMDDKY document set: carry what the converged scheme asks for, usually Aadhaar, land records and bank account details',
    ],
    howToApply: [
        'Check whether your district is one of the 100 PMDDKY districts with your district agriculture office or Krishi Vigyan Kendra.',
        'Ask the office which schemes are part of your district\'s action plan this year (credit, irrigation, storage, seeds, livestock and so on).',
        'Apply to those individual schemes through their usual channels, such as your bank for a Kisan Credit Card or the state portal for irrigation support.',
        'Join a Farmer Producer Organisation if you want to benefit from district storage, processing and market links.',
    ],
    portal: { label: 'PM-DDKY dashboard (NITI Aayog)', url: 'https://pmddky.niti.gov.in/' },
    sources: [
        { label: 'PIB, 16 July 2025 — Cabinet approves PMDDKY: six years from 2025-26, 100 districts, 36 schemes across 11 departments', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2145147' },
        { label: 'PIB explainer, 19 July 2025 — ₹24,000 crore a year for six years; 1.7 crore farmers', url: 'https://www.pib.gov.in/PressNoteDetails.aspx?NoteId=154909&ModuleId=3' },
        { label: 'PIB factsheet, 10 October 2026 — one year of PMDDKY: launched 11 October 2025, 121 indicators, dashboard, district scores', url: 'https://www.pib.gov.in/FactsheetDetails.aspx?Id=151112' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'When was PM Dhan-Dhaanya Krishi Yojana launched?',
            a: 'The Prime Minister launched it on 11 October 2025, after Cabinet approval on 16 July 2025. It was first announced in the Union Budget 2025-26 and completed its first year on 11 October 2026.',
        },
        {
            q: 'What is the budget of PM Dhan-Dhaanya Krishi Yojana?',
            a: '₹24,000 crore a year for six years, beginning in 2025-26, according to PIB. The money is spent largely through the 36 existing schemes being converged in the selected districts.',
        },
        {
            q: 'How do I apply for PM Dhan-Dhaanya Krishi Yojana?',
            a: 'You do not apply to PMDDKY itself. If you farm in one of the 100 districts, you apply to the converged schemes in your district\'s action plan; the district agriculture office can tell you which ones are open.',
        },
        {
            q: 'How were the 100 Dhan-Dhaanya districts chosen?',
            a: 'On three indicators: low productivity, low cropping intensity and low agricultural credit disbursement. The number per state follows its share of net cropped area and operational holdings, with at least one district in every state.',
        },
        {
            q: 'Is PMDDKY the same as PM-KISAN?',
            a: 'No. PM-KISAN pays ₹6,000 a year to every eligible landholding family in India, while PMDDKY is an area programme for 100 districts that improves credit, irrigation, storage and productivity rather than paying cash.',
        },
        {
            q: 'How is progress of the scheme tracked?',
            a: 'Each district reports on 121 indicators, and districts are ranked every month on output indicators on the pmddky.niti.gov.in dashboard, which went live in late October 2025.',
        },
    ],
    related: [
        { href: '/schemes/c-kcc', label: 'Kisan Credit Card', note: 'Crop credit, one of the goals PMDDKY pushes' },
        { href: '/schemes/c-pmkisan', label: 'PM Kisan Samman Nidhi', note: 'Direct ₹6,000 a year income support' },
        { href: '/schemes/c-pmksy', label: 'PM Krishi Sinchayee Yojana', note: 'Drip and sprinkler irrigation support' },
        { href: '/schemes/c-pmfby', label: 'PM Fasal Bima Yojana', note: 'Crop insurance for farmers in these districts' },
    ],
    appIssues: [
        'App lists "Priority to small & marginal farmers, women and young farmers"; the Cabinet release, PIB explainer and October 2026 factsheet do not state such a priority, so it is left out here.',
        'App application type is "Bank Application"; there is no individual application for PMDDKY — benefits come through the converged schemes.',
        'App says "₹1.44 lakh crore over 6 years"; PIB gives ₹24,000 crore a year for six years (the product is ₹1.44 lakh crore, but PIB does not state that total).',
    ],
} satisfies SchemeContent;
