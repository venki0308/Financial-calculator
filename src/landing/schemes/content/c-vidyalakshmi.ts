import type { SchemeContent } from '../types';

export default {
    id: 'c-vidyalakshmi',
    title: 'PM Vidya Lakshmi Portal: Collateral-Free Loan, 3% Subsidy',
    description: 'PM-Vidyalaxmi: education loans with no collateral or guarantor at 1,425 top institutes, 3% interest subvention up to ₹10 lakh for income up to ₹8 lakh.',
    h1: 'PM Vidya Lakshmi portal and scheme: education loan without collateral, interest help and how to apply',
    answer: [
        'PM-Vidyalaxmi gives a student admitted on merit to one of 1,425 listed institutions an education loan with no collateral and no guarantor, at no more than the bank\'s EBLR plus 0.5%; if the family earns up to ₹8 lakh a year, the Government also pays 3% interest on up to ₹10 lakh during the course and one year after, which is ₹30,000 a year on a fully disbursed ₹10 lakh loan.',
        'The Union Cabinet approved the scheme on 6 November 2024 with ₹3,600 crore for 2024-25 to 2030-31, and students apply, track their application and claim the subvention on pmvidyalaxmi.co.in (PIB, 29 July 2026).',
    ],
    table: {
        caption: 'Interest help on education loans through the PM-Vidyalaxmi portal',
        head: ['Feature', 'PM-Vidyalaxmi', 'PM-USP CSIS (also on the portal)'],
        rows: [
            ['Institutions', 'Top 100 in NIRF, top 200 state-government HEIs in NIRF, all central-government HEIs', 'NAAC/NBA-accredited and other approved technical institutions'],
            ['Courses', 'All degree and diploma courses', 'Professional and technical courses'],
            ['Family income', 'Up to ₹8 lakh a year', 'Up to ₹4.5 lakh a year'],
            ['Interest support', '3% on loans up to ₹10 lakh during the moratorium', 'Full interest on loans up to ₹10 lakh during the moratorium'],
            ['Slots', '1 lakh fresh students a year', 'No limit'],
            ['Credit guarantee', '75% for loans up to ₹7.5 lakh', '—'],
            ['Repayment', 'Up to 15 years after the moratorium (course + 1 year)', 'Up to 15 years after the moratorium (course + 1 year)'],
        ],
        note: 'Source: PIB backgrounder "PM Vidyalaxmi Scheme", 29 July 2026. A student getting any other central or state scholarship, interest subvention or fee reimbursement cannot claim either subvention.',
    },
    eligibility: [
        'Admission on merit, through a competitive exam, to one of the designated Quality Higher Educational Institutions (QHEIs); management-quota and NRI-quota seats do not qualify',
        'Any degree or diploma course at that institution; students of all income levels can take the loan',
        'For the 3% interest subvention: family income up to ₹8 lakh a year and no other central or state scholarship, interest subvention or fee reimbursement',
        'Registration with Aadhaar, continued enrolment, and satisfactory academic performance from the second year',
        'Subvention and credit guarantee are available only once — for an undergraduate, postgraduate or integrated course',
    ],
    notEligible: [
        'Indian campuses of foreign institutions, foreign campuses of Indian institutions and foreign institutions',
        'Students who drop out midway or are expelled for disciplinary or academic reasons',
    ],
    howToApply: [
        'Register on pmvidyalaxmi.co.in with your Aadhaar details.',
        'Fill the common education loan application and choose the participating banks you want to apply to (scheduled banks, regional rural banks and co-operative banks).',
        'Track each bank\'s decision on the same portal.',
        'After the loan is disbursed, apply on the portal for interest subvention; it is credited to your PM Vidyalaxmi Digital Rupee (CBDC) wallet and then to the loan account.',
    ],
    statusSteps: [
        'Open pmvidyalaxmi.co.in and log in with your registered details.',
        'Open your loan application to see each bank\'s status.',
        'Use the grievance option on the same portal if a bank does not act on your application.',
    ],
    portal: { label: 'PM-Vidyalaxmi portal (Department of Higher Education)', url: 'https://pmvidyalaxmi.co.in' },
    sources: [
        { label: 'PIB backgrounder — PM Vidyalaxmi Scheme (29 July 2026)', url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/jul/doc2026729936401.pdf' },
        { label: 'PM-Vidyalaxmi portal', url: 'https://pmvidyalaxmi.co.in' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'Is there a maximum loan amount under PM-Vidyalaxmi?',
            a: 'No fixed ceiling. The loan depends on the institution\'s fees and related costs such as hostel and mess, a reasonably priced laptop and living expenses; the 3% subvention, though, is worked out on at most ₹10 lakh of principal.',
        },
        {
            q: 'What interest rate do banks charge on a PM-Vidyalaxmi loan?',
            a: 'At most the bank\'s Externally Benchmarked Lending Rate plus 0.5%, which is always lower than the bank\'s other education loans. Banks may cut up to 1% more if you service the interest during the course and moratorium.',
        },
        {
            q: 'Which colleges are covered?',
            a: '1,425 institutions as of July 2026: the top 100 in the NIRF rankings, the top 200 state-government institutions in NIRF and all other central-government institutions. The list is updated with each NIRF ranking.',
        },
        {
            q: 'Can I get both CSIS and PM-Vidyalaxmi interest help?',
            a: 'No, you get the one your income fits. CSIS pays the full interest during the moratorium for family income up to ₹4.5 lakh on technical or professional courses; PM-Vidyalaxmi pays 3% for family income up to ₹8 lakh at listed institutions.',
        },
        {
            q: 'How long do I get to repay?',
            a: 'Up to 15 years, starting after the moratorium, which is the course period plus one year.',
        },
        {
            q: 'Does a management-quota admission qualify?',
            a: 'No. Only admissions earned on merit through competitive exams qualify; management-quota and NRI-quota seats are excluded.',
        },
        {
            q: 'Is vidyalakshmi.co.in still the website?',
            a: 'No. The education-loan portal is now pmvidyalaxmi.co.in, which also handles the CSIS subsidy, the CBDC wallet and grievances.',
        },
    ],
    related: [
        { href: '/education-loan', label: 'Education loan EMI calculator', note: 'Repayment after the moratorium ends' },
        { href: '/schemes/c-nmms', label: 'NMMS scholarship', note: '₹12,000 a year for Classes IX–XII' },
        { href: '/goal-planner', label: 'Goal planner', note: 'Save part of the cost instead of borrowing it' },
        { href: '/emi', label: 'EMI calculator', note: 'Compare tenures for the same loan' },
    ],
    appIssues: [
        'App howToApply says "Register at vidyalakshmi.co.in"; the portal is pmvidyalaxmi.co.in.',
        'App describes only a common loan application portal (launch 2015) and misses the PM-Vidyalaxmi scheme approved on 6 November 2024: collateral- and guarantor-free loans at QHEIs, 75% credit guarantee up to ₹7.5 lakh, 3% subvention up to ₹10 lakh for family income up to ₹8 lakh, and the EBLR + 0.5% cap.',
        'App eligibility ("admitted to recognised institutions in India") is wider than the official rule: merit-based admission to one of the designated QHEIs.',
    ],
} satisfies SchemeContent;
