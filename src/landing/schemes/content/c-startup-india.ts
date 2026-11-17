import type { SchemeContent } from '../types';

export default {
    id: 'c-startup-india',
    title: 'Startup India Certificate: DPIIT Eligibility, Apply Online',
    description: 'DPIIT startup recognition since Feb 2026: under 10 years, turnover up to ₹200 crore (deep tech: 20 years, ₹300 crore). Eligibility, benefits, how to apply.',
    h1: 'Startup India certificate (DPIIT recognition): eligibility, benefits and how to apply online',
    answer: [
        'A private limited company, registered partnership, LLP or co-operative society gets DPIIT startup recognition if it is within 10 years of incorporation, its turnover has not crossed ₹200 crore in any year, and it works on innovation or a scalable business model with high potential for jobs or wealth.',
        'The Government raised the turnover limit from ₹100 crore to ₹200 crore, added a Deep Tech Startup category with a 20-year and ₹300 crore limit, and opened recognition to co-operatives on 5 February 2026 (PIB).',
        'Recognition unlocks benefits such as a 100% deduction of profits for any 3 consecutive tax years out of the first 10 under Section 140 of the Income-tax Act, 2025, which needs a separate Inter-Ministerial Board certificate.',
    ],
    table: {
        caption: 'DPIIT recognition limits after the February 2026 revision',
        head: ['Condition', 'Startup', 'Deep Tech Startup'],
        rows: [
            ['Age', 'Up to 10 years from incorporation or registration', 'Up to 20 years from incorporation or registration'],
            ['Turnover in every year since incorporation', 'Not above ₹200 crore', 'Not above ₹300 crore'],
            ['Legal form', 'Private limited company, registered partnership firm, LLP, multi-state or state co-operative society', 'Same, plus the deep-tech attributes (new scientific or engineering knowledge, high R&D spend)'],
            ['Activity', 'Innovation in products, processes or services, or a scalable model with high job or wealth potential', 'A solution still being developed from new science or engineering'],
            ['Section 140 tax holiday (separate IMB certificate)', 'Private limited company or LLP incorporated from 1 April 2016 to before 1 April 2030; 100% of profits for 3 consecutive years out of 10', 'Same'],
        ],
        note: 'An entity formed by splitting up or reconstructing an existing business is not a startup. Sources: PIB, 5 February 2026; Startup India "Startup Playbook" (April 2026) and "Tax Playbook" (May 2026).',
    },
    eligibility: [
        'Incorporated or registered in India as a private limited company, a partnership firm registered under the Partnership Act, an LLP, a multi-state co-operative society or a state/UT co-operative society',
        'Within 10 years of incorporation or registration (20 years for a Deep Tech Startup)',
        'Turnover not above ₹200 crore in any financial year since incorporation (₹300 crore for a Deep Tech Startup)',
        'Working towards innovation, development or improvement of products, processes or services, or a scalable business model with high potential for employment or wealth creation',
    ],
    notEligible: [
        'An entity formed by splitting up or reconstructing an existing business',
        'Sole proprietorships and unregistered partnerships (not among the eligible legal forms)',
    ],
    benefits: [
        'Income-tax: 100% deduction of profits for any 3 consecutive tax years within the first 10 years under Section 140 of the Income-tax Act, 2025 (Section 80-IAC of the 1961 Act), for companies and LLPs incorporated before 1 April 2030 that hold an Inter-Ministerial Board certificate',
        'Relaxed carry-forward and set-off of losses (Section 119, Income-tax Act 2025) and deferral of tax on employee stock options',
        'Self-certification under several labour and environment laws, with no labour inspections for a specified period',
        'Government tenders: exemption from earnest money deposit and relaxed prior-turnover and prior-experience conditions',
        'Faster exit: a recognised startup can wind up in 90 days instead of 180',
        'Access to the Fund of Funds for Startups, the Credit Guarantee Scheme for Startups and the Startup India Seed Fund Scheme through incubators',
    ],
    howToApply: [
        'Incorporate the business in one of the eligible legal forms.',
        'Register on startupindia.gov.in (or the National Single Window System) and fill the DPIIT recognition form with incorporation details and a short note on your innovation; deep-tech applicants submit extra supporting documents.',
        'Once recognised, download the certificate from your Startup India dashboard.',
        'For the tax holiday, apply separately for the Inter-Ministerial Board (IMB) certificate on the Startup India portal and claim the deduction in your return.',
    ],
    statusSteps: [
        'Log in on startupindia.gov.in with the account used to apply.',
        'Open "DPIIT Recognition and Benefits" on your dashboard to see the recognition status.',
        'Use "Access/Modify Certificate Details" to download or correct the certificate once it is issued.',
    ],
    portal: { label: 'Startup India portal (DPIIT)', url: 'https://www.startupindia.gov.in/content/sih/en/startupgov/startup_recognition_page.html' },
    sources: [
        { label: 'PIB, 5 February 2026 — revised startup recognition framework', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2224069' },
        { label: 'Startup India — Startup Playbook: benefits for DPIIT-recognised startups (April 2026, PDF)', url: 'https://www.startupindia.gov.in/content/dam/invest-india/HomePage/Startup-Playbook-Exclusive-Benefits-for-DPIIT-Recognised-Startups-in-India-April-2026.pdf' },
        { label: 'Startup India — Tax Playbook for the startup ecosystem (May 2026, PDF)', url: 'https://www.startupindia.gov.in/content/dam/startupindia/Tax-Playbook-for-Startup-Ecosystem-May-2026.pdf' },
        { label: 'Startup India — DPIIT recognition page', url: 'https://www.startupindia.gov.in/content/sih/en/startupgov/startup_recognition_page.html' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'Can a sole proprietorship get the Startup India certificate?',
            a: 'No. Only a private limited company, a registered partnership firm, an LLP or a co-operative society can be recognised as a startup.',
        },
        {
            q: 'What happens when my startup crosses ₹200 crore turnover?',
            a: 'It stops being a startup for DPIIT purposes, because the turnover must not have exceeded ₹200 crore in any financial year since incorporation. The same applies once it is more than 10 years old.',
        },
        {
            q: 'Does DPIIT recognition give the income-tax exemption automatically?',
            a: 'No. The Section 140 deduction needs a separate Inter-Ministerial Board certificate, and only private limited companies and LLPs incorporated before 1 April 2030 can get it.',
        },
        {
            q: 'What is a Deep Tech Startup?',
            a: 'A recognised startup building a solution from new scientific or engineering knowledge that is still being developed, with a high share of spending on research and development. It can stay recognised for up to 20 years and up to ₹300 crore turnover.',
        },
        {
            q: 'Can a co-operative society register as a startup?',
            a: 'Yes, since 5 February 2026. Multi-state co-operative societies and co-operatives registered under state or UT laws are eligible if they meet the other conditions.',
        },
        {
            q: 'Do I need to choose which 3 years to claim the tax holiday?',
            a: 'Yes. The 100% deduction can be taken for any 3 consecutive tax years within the first 10 years from incorporation, not necessarily the first three.',
        },
        {
            q: 'Can I restructure an old business into a new company to get recognition?',
            a: 'No. An entity formed by splitting up or reconstructing an existing business is not treated as a startup.',
        },
    ],
    related: [
        { href: '/schemes/c-udyam', label: 'Udyam Registration', note: 'Free MSME registration most startups also need' },
        { href: '/schemes/c-cgtmse', label: 'CGTMSE', note: 'Collateral-free credit guarantee for small businesses' },
        { href: '/schemes/c-pmegp', label: 'PMEGP', note: 'Subsidy for first-time micro entrepreneurs' },
        { href: '/income-tax', label: 'Income tax calculator', note: 'Tax on founder salary under the 2025 Act' },
    ],
    appIssues: [
        'App eligibility says turnover below ₹100 crore; the limit is ₹200 crore since 5 February 2026 (₹300 crore and 20 years for Deep Tech Startups), and co-operative societies are now eligible.',
        'App benefit "3-year income tax holiday (Sec 80-IAC)": under the Income-tax Act, 2025 it is Section 140; it is any 3 consecutive years out of the first 10, only for companies/LLPs incorporated before 1 April 2030, and needs an IMB certificate.',
        'App benefits "80% rebate on patent fees" and "Self-certification under 9 laws" could not be confirmed in the 2026 Startup India playbook checked, which speaks of self-certification under labour and environment laws and reduced IP filing costs.',    ],
} satisfies SchemeContent;
