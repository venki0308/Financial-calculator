import type { SchemeContent } from '../types';

export default {
    id: 'c-pmis',
    title: 'PM Internship Scheme 2026: ₹9,000 Stipend, Apply Online',
    description: 'PM Internship Scheme: ₹9,000 a month plus a ₹6,000 one-time grant, age 18–25, final-year students allowed with an NOC. Eligibility and how to apply online.',
    h1: 'PM Internship Scheme 2026: stipend, eligibility and how to apply online',
    answer: [
        'The PM Internship Scheme pays an intern at least ₹9,000 a month, shared by the Government and the host company and subject to attendance, plus a one-time grant of ₹6,000, and insures the intern under PMJJBY and PMSBY (PIB, May 2026).',
        'Youth aged 18 to 25 apply on pminternship.mca.gov.in, and since 22 April 2026 final-year graduate and postgraduate students can also apply with a no-objection certificate from their institution (Ministry of Corporate Affairs).',
        'The scheme is still in its pilot phase: round 3 was under way in April 2026 with companies posting openings on a rolling basis, and over 63,000 internships were listed in May 2026.',
    ],
    table: {
        caption: 'What a PM Internship Scheme intern gets, and who can apply (pilot round 3)',
        head: ['Item', 'Detail'],
        rows: [
            ['Monthly financial assistance', 'At least ₹9,000 (Government + company), subject to attendance'],
            ['One-time grant', '₹6,000 for incidentals on joining'],
            ['Insurance', 'Cover under PM Jeevan Jyoti Bima Yojana and PM Suraksha Bima Yojana'],
            ['Certificate', 'Joint digital certificate from MCA and the host company'],
            ['Age', '18 to 25 years'],
            ['Students', 'Final-year UG and PG students, with an NOC from the institution'],
            ['Opportunities', '63,000+ internships in 25+ sectors across 730+ districts (May 2026); 300+ companies in the pilot'],
        ],
        note: 'Sources: PIB releases of 22 April 2026 (MCA) and 21 May 2026, and the PIB youth backgrounder of May 2026.',
    },
    eligibility: [
        'Age 18 to 25 years',
        'Final-year undergraduate and postgraduate students are eligible if they submit a No Objection Certificate from their institution',
        'The other eligibility conditions of the pilot phase continue to apply; read them on pminternship.mca.gov.in before applying',
    ],
    howToApply: [
        'Register on the official portal pminternship.mca.gov.in (or the PMIS mobile app) and complete your profile.',
        'Browse internships by sector, district and company, and apply to the ones that suit you.',
        'Final-year students upload an NOC signed by the Head of Department, Dean, Principal or Training & Placement Officer, confirming the internship will not interfere with studies.',
        'Accept the company\'s offer on the portal; the monthly assistance is paid during the internship and the ₹6,000 grant on joining.',
    ],
    portal: { label: 'PM Internship Scheme portal (Ministry of Corporate Affairs)', url: 'https://pminternship.mca.gov.in' },
    sources: [
        { label: 'PIB, 22 April 2026 — MCA opens PMIS to final-year students; ₹9,000 a month; age 18–25', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2254498' },
        { label: 'PIB, 21 May 2026 — ₹9,000 a month subject to attendance and ₹6,000 joining grant', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2263832' },
        { label: 'PIB backgrounder, May 2026 — PMIS key features (insurance, certificate, 63,000+ openings)', url: 'https://www.pib.gov.in/PressNoteDetails.aspx?NoteId=158887&ModuleId=3' },
        { label: 'PIB, March 2025 — PMIS round 2 and the PMIS mobile app', url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/mar/doc2025321524001.pdf' },
        { label: 'PM Internship Scheme portal', url: 'https://pminternship.mca.gov.in' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'How much stipend does the PM Internship Scheme pay?',
            a: 'At least ₹9,000 a month, made up of a Government contribution and a company contribution and paid subject to attendance. On top of that, each intern gets a one-time ₹6,000 grant.',
        },
        {
            q: 'Can college students apply for the PM Internship Scheme?',
            a: 'Final-year students of graduate and postgraduate programmes can, from 22 April 2026, if they upload a no-objection certificate from their institution saying the internship will not clash with their studies.',
        },
        {
            q: 'What is the age limit for PMIS?',
            a: '18 to 25 years for the current pilot round, according to the Ministry of Corporate Affairs.',
        },
        {
            q: 'Are interns insured?',
            a: 'Yes. Interns are covered under PM Jeevan Jyoti Bima Yojana (life cover) and PM Suraksha Bima Yojana (accident cover).',
        },
        {
            q: 'Who can sign the NOC for a final-year student?',
            a: 'The Head of Department, Dean, Principal or Training & Placement Officer of the institution.',
        },
        {
            q: 'Has the full PM Internship Scheme started?',
            a: 'Not as of the latest MCA release checked (22 April 2026), which described round 3 of the pilot phase as under way, with companies adding internships continuously. Check the portal for the current round.',
        },
    ],
    related: [
        { href: '/schemes/c-naps', label: 'National Apprenticeship Promotion Scheme', note: 'Paid apprenticeships with stipend support' },
        { href: '/schemes/c-pmkvy', label: 'PM Kaushal Vikas Yojana', note: 'Free short-term skill courses' },
        { href: '/schemes/c-pmvbry', label: 'PM Viksit Bharat Rozgar Yojana', note: 'Incentive for first-time employees' },
        { href: '/schemes/c-pmjjby', label: 'PM Jeevan Jyoti Bima Yojana', note: 'The life cover interns are given' },
    ],
    appIssues: [
        'App eligibility does not mention that final-year UG/PG students can apply with an NOC (MCA, 22 April 2026).',
        'App states a ₹8,100 Government + ₹900 company split, a ₹8 lakh family income limit, internships "of up to 12 months" and that round 3 "runs till Dec 2026"; none of these was confirmed in the official 2026 releases checked, which say only "₹9,000 (Government + Company contribution)".',
        'App benefits omit the PMJJBY/PMSBY insurance cover and the joint MCA–company certificate.',
    ],
} satisfies SchemeContent;
