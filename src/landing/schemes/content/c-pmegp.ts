import type { SchemeContent } from '../types';

export default {
    id: 'c-pmegp',
    title: 'PMEGP Loan 2026: 15–35% Subsidy, Eligibility, Apply Online',
    description: 'PMEGP margin-money subsidy of 15–35% on projects up to ₹50 lakh (manufacturing) or ₹20 lakh (services). A worked ₹10 lakh example, eligibility, portal.',
    h1: 'PMEGP (Prime Minister\'s Employment Generation Programme): subsidy, eligibility and how to apply online',
    answer: [
        'PMEGP gives a margin-money subsidy of 15% to 35% of the project cost on a bank loan for a new non-farm micro-enterprise costing up to ₹50 lakh in manufacturing or ₹20 lakh in services; on a ₹10 lakh rural project of a general-category applicant that means ₹2.5 lakh subsidy, ₹1 lakh of your own money and a ₹6.5 lakh bank loan.',
        'The programme is running in 2026-27: the Ministry of MSME released ₹1,000 crore of subsidy for 11,333 units on 28 October 2026, after ₹794.52 crore for 25,895 units earlier in the year (PIB).',
        'Anyone aged 18 or above can apply online on the Ministry of MSME\'s PMEGP portal; there is no income ceiling.',
    ],
    table: {
        caption: 'PMEGP subsidy and own contribution by category, with a ₹10 lakh project worked out',
        head: ['Category and area', 'Subsidy', 'Own contribution', 'Bank loan', '₹10 lakh project: subsidy / own / loan'],
        rows: [
            ['General, urban', '15%', '10%', '75%', '₹1,50,000 / ₹1,00,000 / ₹7,50,000'],
            ['General, rural', '25%', '10%', '65%', '₹2,50,000 / ₹1,00,000 / ₹6,50,000'],
            ['Special category, urban', '25%', '5%', '70%', '₹2,50,000 / ₹50,000 / ₹7,00,000'],
            ['Special category, rural', '35%', '5%', '60%', '₹3,50,000 / ₹50,000 / ₹6,00,000'],
        ],
        note: 'Special category: SC, ST, OBC, minorities, women, ex-servicemen, persons with disabilities, transgenders, North-Eastern Region, hill and border areas and aspirational districts. Maximum project cost ₹50 lakh (manufacturing), ₹20 lakh (service/business). Sources: PIB, 20 July 2023; Ministry of MSME "Schemes for MSMEs" (June 2025); PIB, 27 March 2026.',
    },
    eligibility: [
        'Any individual aged 18 or above; there is no income ceiling',
        'At least Class VIII pass for projects above ₹10 lakh in manufacturing or above ₹5 lakh in business/service',
        'Only new projects: existing units, and units that have already received a government subsidy under PMRY, REGP or another scheme, cannot apply for the first loan',
        'Only one person per family (self, spouse and unmarried children)',
        'The project must include capital expenditure; land cost is not counted in the project cost',
    ],
    howToApply: [
        'Open the PMEGP portal of the Ministry of MSME (pmegp.msme.gov.in) and choose Online Application, or download the sample project reports there to prepare yours.',
        'Fill in your Aadhaar and personal details, the project cost and activity, the implementing agency (KVIC, KVIB, DIC or Coir Board) and your preferred bank, and upload your documents.',
        'The implementing agency scrutinises the application and sends it to the bank; the bank appraises and sanctions the loan.',
        'Complete the entrepreneurship development (EDP) training offered online or offline, register on Udyam (required before physical verification), and the margin-money subsidy is released to your bank branch.',
    ],
    statusSteps: [
        'Open pmegp.msme.gov.in and choose Login, then Applicant Login.',
        'Sign in with the applicant details from your application to see which stage it has reached.',
        'For a delay at the bank, use the Bank Nodal Officers list or the Grievances option on the same portal.',
    ],
    portal: { label: 'PMEGP portal (Ministry of MSME)', url: 'https://pmegp.msme.gov.in/' },
    helpline: 'Helpdesk numbers, MSME DFO and nodal office lists are under "Contact us" on pmegp.msme.gov.in.',
    sources: [
        { label: 'PIB, 28 October 2026 — ₹1,000 crore PMEGP margin-money subsidy released', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2329819' },
        { label: 'PIB, 20 July 2023 — PMEGP subsidy rates, own contribution and project limits', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=1941066' },
        { label: 'PIB, 27 March 2026 — PMEGP subsidy up to 35%, ₹50 lakh / ₹20 lakh project cost', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2246085' },
        { label: 'Ministry of MSME — Schemes for MSMEs (June 2025, PDF): PMEGP and the second loan', url: 'https://www.msme.gov.in/static/uploads/2025/06/a42b2a428d7b1df097c82ce23a990657.pdf' },
        { label: 'PMEGP portal — eligibility, application and EDP', url: 'https://pmegp.msme.gov.in/' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'Can an existing business get a PMEGP loan?',
            a: 'Not the first loan, which is only for new units. A well-performing PMEGP, REGP or MUDRA unit can take a second loan to upgrade: up to ₹1 crore in manufacturing or ₹25 lakh in service/trading, with 15% subsidy (20% in the North-East and hill states), if it has made profits for the last three years and repaid its first loan on time.',
        },
        {
            q: 'Is there an income limit for PMEGP?',
            a: 'No. Any individual aged 18 or above can apply, whatever the family income.',
        },
        {
            q: 'How much education do I need for PMEGP?',
            a: 'None for small projects. Class VIII pass is required only if the project costs more than ₹10 lakh in manufacturing or more than ₹5 lakh in business or services.',
        },
        {
            q: 'Can I include the cost of land in the project?',
            a: 'No. Land cost is excluded from the project cost, and the project must include capital expenditure on items such as machinery or equipment.',
        },
        {
            q: 'Can a trading business be set up under PMEGP?',
            a: 'Yes, within the business/service limit of ₹20 lakh, but trading activities can use at most 10% of a state\'s yearly allocation, so slots are limited.',
        },
        {
            q: 'Who counts as special category?',
            a: 'SC, ST, OBC, minorities, women, ex-servicemen, persons with disabilities, transgenders, and applicants from the North-East, hill and border areas and aspirational districts. They get a higher subsidy and put in only 5% themselves.',
        },
        {
            q: 'How is the PMEGP subsidy paid?',
            a: 'The margin money is released online directly to the financing bank branch against your loan, not to you in cash; Udyam registration must be done before the physical verification and adjustment of the margin money.',
        },
    ],
    related: [
        { href: '/schemes/c-mudra', label: 'PM MUDRA Yojana', note: 'Business loans without the subsidy, up to higher amounts' },
        { href: '/schemes/c-udyam', label: 'Udyam Registration', note: 'Required before the PMEGP subsidy is adjusted' },
        { href: '/schemes/c-cgtmse', label: 'CGTMSE', note: 'Credit guarantee that lets banks lend without collateral' },
        { href: '/break-even', label: 'Break-even calculator', note: 'Check when your new unit will cover its costs' },
        { href: '/emi', label: 'EMI calculator', note: 'Instalment on the bank loan part of the project' },
    ],
    appIssues: [
        'App links the old KVIC e-portal (kviconline.gov.in/pmegpeportal); the Ministry of MSME now runs the PMEGP portal at pmegp.msme.gov.in (online application, applicant login, EDP).',
        'App eligibility lists "Eligible entities: Individuals, SHGs (BPL only), Co-operative Societies, Charitable Trusts"; the entity list could not be confirmed on the current portal, which states individuals aged 18+, one per family, no income ceiling.',
        'App benefit "No collateral for loans up to ₹10 lakh (covered under CGTMSE/CGFMU)" and "Second loan available after 3 years of successful operation" were not confirmed as stated; the official second-loan rule is profit in the last three years, first loan repaid on time, Udyam registration, up to ₹1 crore / ₹25 lakh with 15% (20% NER/hill) subsidy.',
    ],
} satisfies SchemeContent;
