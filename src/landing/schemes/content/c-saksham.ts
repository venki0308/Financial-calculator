import type { SchemeContent } from '../types';

export default {
    id: 'c-saksham',
    title: 'Saksham Anganwadi & Poshan 2.0: Benefits, Who Can Get It',
    description: 'Mission Saksham Anganwadi and Poshan 2.0: take-home ration or hot meals at Anganwadis for children under 6, pregnant women, mothers and adolescent girls.',
    h1: 'Mission Saksham Anganwadi and Poshan 2.0: who is covered and how to register',
    answer: [
        'Mission Saksham Anganwadi and Poshan 2.0 provides supplementary nutrition through the Anganwadi network to children up to 6 years, pregnant women, lactating mothers and adolescent girls aged 14–18 in aspirational districts and the North-East, for at least 300 days a year (Ministry of Women and Child Development guidelines).',
        'There is no caste or income test — registration at the nearest Anganwadi with Aadhaar is the only condition — and since 1 July 2025 take-home ration is given only after face authentication on the Poshan Tracker app (PIB).',
    ],
    table: {
        caption: 'Who gets what at the Anganwadi',
        head: ['Beneficiary', 'Form of nutrition', 'Norm per day (where published)'],
        rows: [
            ['Children 6–12 months', 'Take-home ration (THR)', '200 kcal, 8–10 g protein'],
            ['Children 1–3 years', 'Take-home ration', '400 kcal, 15–20 g protein'],
            ['Children 3–6 years', 'Morning snack and hot cooked meal at the centre', '400 kcal, 15–20 g protein'],
            ['Severely acutely malnourished children (6 months–5 years)', 'Additional take-home ration', 'Over and above the normal norm'],
            ['Pregnant women and lactating mothers', 'Take-home ration (states may give hot meals instead)', 'As per revised NFSA Schedule II (2023)'],
            ['Adolescent girls 14–18, aspirational districts and North-East', 'Take-home ration', 'As per revised NFSA Schedule II (2023)'],
        ],
        note: 'Child norms from PIB, 31 July 2026; norms also include 7 essential micronutrients. THR is distributed twice a month, preferably on the 1st and 15th.',
    },
    eligibility: [
        'Children from birth to 6 years',
        'Pregnant women, and lactating mothers up to 6 months after delivery for supplementary nutrition',
        'Adolescent girls aged 14–18 — only in aspirational districts and North-Eastern states',
        'No caste, religion or income criteria: the only precondition is registration at the local Anganwadi Centre with Aadhaar identification',
        'People living in an area even temporarily can register there; those registered elsewhere can be migrated on Poshan Tracker',
    ],
    documents: [
        'Aadhaar of the beneficiary — for a child, the mother\'s Aadhaar is enough (the child\'s own Aadhaar is not mandatory)',
        'Mobile number linked to Aadhaar for the one-time e-KYC OTP',
        'If you have no Aadhaar, the Anganwadi worker and supervisor must help you get one',
    ],
    howToApply: [
        'Go to the Anganwadi Centre that covers your village or ward and ask the Anganwadi worker to register you.',
        'The worker registers you on the Poshan Tracker app with Aadhaar identification.',
        'Complete the one-time e-KYC (OTP on your Aadhaar-linked mobile) and face capture; monthly face matching at THR distribution can work offline.',
        'Collect take-home ration on distribution days, or send children aged 3–6 to the centre for the snack and hot meal.',
        'If you move, ask to be migrated to the new Anganwadi in Poshan Tracker so the benefits continue.',
    ],
    portal: { label: 'Ministry of Women and Child Development — Poshan Tracker', url: 'https://wcd.gov.in/offerings/poshan-tracker' },
    sources: [
        { label: 'Mission Saksham Anganwadi and Poshan 2.0 scheme guidelines (PDF)', url: 'https://www.spniwcd.wcd.gov.in/uploads/pdf/Mission%20Saksham%20Anganwadi%20and%20Poshan%202.0%20scheme%20guidelines.pdf' },
        { label: 'PIB, 31 July 2026 — supplementary nutrition norms', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2292323' },
        { label: 'PIB, 11 August 2025 — face recognition mandatory for THR from 1 July 2025', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2155283' },
        { label: 'PIB, 25 March 2026 — e-KYC and face capture coverage', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2245025' },
        { label: 'PIB, 7 August 2026 — offline e-KYC and face matching', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2296047' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'What is Saksham Anganwadi and Poshan 2.0?',
            a: 'It is one of the three umbrella programmes of the Women and Child Development Ministry — alongside Mission Shakti and Mission Vatsalya — and covers Anganwadi services and supplementary nutrition for young children, mothers and adolescent girls.',
        },
        {
            q: 'Is there an income limit for Anganwadi nutrition?',
            a: 'No. The scheme is open on demand to every eligible beneficiary regardless of caste, religion or income; you only need to be registered at your Anganwadi Centre.',
        },
        {
            q: 'Is Aadhaar compulsory for take-home ration?',
            a: 'Registration needs Aadhaar identification, but a child can be registered on the mother\'s Aadhaar. Face authentication has been mandatory for THR since 1 July 2025, and the e-KYC OTP is needed only once in a beneficiary\'s life cycle.',
        },
        {
            q: 'What if there is no internet at the Anganwadi?',
            a: 'Poshan Tracker can do e-KYC and face matching offline, and the data has five days to sync once the network returns (PIB, 7 August 2026).',
        },
        {
            q: 'How many beneficiaries have completed face authentication?',
            a: 'By February 2026, 4,63,58,376 of 4,77,88,108 registered beneficiaries (97.01%) had completed e-KYC and face capture, up from 68.98% in July 2025.',
        },
        {
            q: 'How often is take-home ration given?',
            a: 'Twice a month, preferably on the 1st and 15th; if either day is a holiday, it is given on the next working day. Supplementary nutrition must be served on at least 300 days a year.',
        },
    ],
    related: [
        { href: '/schemes/c-pmmvy', label: 'PM Matru Vandana Yojana', note: 'Maternity cash benefit, also verified through Poshan Tracker' },
        { href: '/schemes/c-bbbp', label: 'Beti Bachao Beti Padhao', note: 'The girl-child awareness scheme under the same ministry' },
        { href: '/sukanya-samriddhi', label: 'Sukanya Samriddhi calculator', note: 'Savings for a daughter\'s education' },
    ],
    appIssues: [
        'App lists adolescent girls aged 14–18 without the limit that they are covered only in aspirational districts and North-Eastern states.',
        'App says Aadhaar is optional; the guidelines make registration with Aadhaar identification the only precondition (a child may use the mother\'s Aadhaar), and face authentication is mandatory for THR since 1 July 2025.',
        'App lists "health checkups" as a scheme benefit; the guidelines say check-ups and referrals at the Anganwadi are provided by ASHA/ANM through the National Health Mission.',
    ],
} satisfies SchemeContent;
