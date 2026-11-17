import type { SchemeContent } from '../types';

export default {
    id: 'c-digital-india',
    title: 'Digital India Programme: What It Is, Launch Date, Services',
    description: 'Digital India, launched 1 July 2015, runs DigiLocker (72 crore+ users), UMANG (about 2,575 services) and 4 lakh+ CSCs. What you can use and how.',
    h1: 'Digital India programme: what it is and the services you can use',
    answer: [
        'Digital India is the Government of India\'s umbrella programme, launched on 1 July 2015 and run by the Ministry of Electronics and IT, to put public services online; it pays no cash benefit, but citizens use its platforms directly.',
        'By 31 July 2026 DigiLocker had more than 72.43 crore registered users and UMANG offered about 2,575 government services, while 4,07,122 Common Service Centres were working at gram panchayat level on 30 June 2026 (PIB, 12 August 2026).',
    ],
    table: {
        caption: 'Digital India platforms people use most',
        head: ['Platform', 'What it does for you', 'Scale (PIB, 2026)'],
        rows: [
            ['DigiLocker', 'Holds official documents digitally and shares them for verification', '72.43 crore+ users; 5,437 document types (31 July 2026)'],
            ['UMANG', 'One app for central and state government services', 'About 2,575 services (880 central, 1,695 state); 11.66 crore+ users'],
            ['Common Service Centres', 'Assisted access to government, banking, insurance, pension and bill-payment services', '4,07,122 at gram panchayat level, 70,069 run by women (30 June 2026)'],
            ['Aadhaar-linked DBT', 'Welfare payments straight to bank accounts', '318 schemes across 56 ministries; over ₹52 lakh crore transferred'],
        ],
        note: 'DBT figures from the PIB backgrounder "Empowering Governance through Digital" (August 2026).',
    },
    howToApply: [
        'Digital India itself has no registration — you sign up for the individual services.',
        'Use DigiLocker or UMANG through their web portals or mobile apps to fetch documents and reach services.',
        'If you need help online, visit a Common Service Centre, which offers assisted government, banking and insurance services.',
        'For basic digital skills, the government runs the PMGDISHA digital literacy programme.',
    ],
    portal: { label: 'Digital India (Ministry of Electronics and Information Technology)', url: 'https://www.digitalindia.gov.in' },
    sources: [
        { label: 'PIB, 12 August 2026 — UMANG, DigiLocker and CSC figures', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2298116' },
        { label: 'PIB backgrounder, June 2026 — Digital India: 11 years, 9 pillars (PDF)', url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/jun/doc2026627904001.pdf' },
        { label: 'PIB backgrounder, August 2026 — Empowering governance through digital (PDF)', url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/aug/doc2026812952501.pdf' },
        { label: 'Digital India — milestones (launch on 1 July 2015)', url: 'https://www.digitalindia.gov.in/milestones/' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'When was the Digital India programme launched?',
            a: 'Prime Minister Narendra Modi launched it on 1 July 2015; it completed 11 years on 1 July 2026.',
        },
        {
            q: 'What is Digital India in simple words?',
            a: 'It is a government programme to make India a digitally empowered society — broadband and mobile access, services delivered online, and digital literacy — rather than a scheme that you join or that pays you.',
        },
        {
            q: 'How many pillars does Digital India have?',
            a: 'Nine. They include the Public Internet Access Programme (CSCs and post offices delivering digital services) and e-Governance (platforms such as DigiLocker and single sign-on).',
        },
        {
            q: 'Does Digital India pay money or give free devices?',
            a: 'The programme itself pays no cash. Welfare money from other schemes reaches people through Aadhaar-linked DBT — 318 schemes across 56 ministries use it — so treat any "Digital India" cash offer with suspicion.',
        },
        {
            q: 'Where can I read about the programme officially?',
            a: 'On MeitY\'s site digitalindia.gov.in and in PIB\'s backgrounder for the 11th anniversary (June 2026), both linked in the sources below.',
        },
    ],
    related: [
        { href: '/schemes/c-abdm', label: 'Ayushman Bharat Digital Mission', note: 'Digital health ID and records' },
        { href: '/schemes/c-digital-agri', label: 'Digital Agriculture Mission', note: 'Farmer ID and AgriStack' },
        { href: '/schemes/c-pmkvy', label: 'PM Kaushal Vikas Yojana', note: 'Skill courses including AI and cybersecurity' },
    ],
} satisfies SchemeContent;
