import type { SchemeContent } from '../types';

export default {
    id: 'c-bbbp',
    title: 'Beti Bachao Beti Padhao: Official Website, Benefits, Facts',
    description: 'Beti Bachao Beti Padhao pays no cash and has no application form. What the scheme funds, sex ratio at birth 918 → 929, and the fake-form warning.',
    h1: 'Beti Bachao Beti Padhao: what the scheme does, and why there is no cash benefit',
    answer: [
        'Beti Bachao Beti Padhao pays no money to individuals: the Ministry of Women and Child Development states there is no provision for Direct Benefit Transfer or creation of capital assets, so any "BBBP form" promising cash is fraudulent (wcd.gov.in).',
        'Launched on 22 January 2015 and now part of the Sambal vertical of Mission Shakti in every district, it funds awareness and convergence work; the national sex ratio at birth rose from 918 in 2014-15 to 929 in 2025-26 (provisional), the ministry told the Lok Sabha on 31 July 2026.',
    ],
    table: {
        caption: 'Yearly BBBP grant to a district, by its sex ratio at birth (Mission Shakti guidelines)',
        head: ['District sex ratio at birth (girls per 1,000 boys)', 'Grant per district per year'],
        rows: [
            ['918 or lower', '₹40 lakh'],
            ['Above 918, up to 952', '₹30 lakh'],
            ['Above 952', '₹20 lakh'],
            ['New districts without sex-ratio data', '₹30 lakh'],
        ],
        note: 'Use of each grant: up to 50% for Women & Child Development activities, 40% for work with partner departments, 10% flexi fund. The Centre pays 100%.',
    },
    benefits: [
        'Raise the sex ratio at birth by 2 points a year',
        'Keep institutional deliveries at 95% or more',
        'Increase first-trimester antenatal care registration by 1% a year',
        'Increase girls\' secondary-level enrolment and skilling by 1% a year, and check dropouts at secondary and higher secondary level',
        'Spread awareness of safe menstrual hygiene management',
    ],
    howToApply: [
        'There is nothing to apply for: BBBP is carried out by states and district administrations through campaigns, school and health activities.',
        'To take part in local events, contact your district\'s Women and Child Development office.',
        'For money for a daughter\'s future, open a Sukanya Samriddhi account; for maternity cash support, see PM Matru Vandana Yojana — both are separate schemes.',
        'If anyone sells or distributes a BBBP cash form, report it to the nearest police station or the District Collector, as the ministry advises.',
    ],
    portal: { label: 'Ministry of Women and Child Development — Beti Bachao Beti Padhao', url: 'https://wcd.gov.in/offerings/beti-bachao-beti-padhao-scheme' },
    sources: [
        { label: 'Ministry of Women and Child Development — BBBP (no DBT, objectives)', url: 'https://wcd.gov.in/offerings/beti-bachao-beti-padhao-scheme' },
        { label: 'BBBP operational manual under Mission Shakti — targets and district grants (PDF)', url: 'https://spniwcd.wcd.gov.in/uploads/pdf/1710061539_9xKA1jy6eB.pdf' },
        { label: 'Lok Sabha Unstarred Q. 2086, 31 July 2026 — SRB, GER, expenditure', url: 'https://sansad.in/getFile/lsapps/loksabhaquestions/annex/188/AU2086_0EfUqE.pdf' },
        { label: 'PIB, 31 July 2026 — BBBP status', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2292322' },
        { label: 'PIB, 21 March 2017 — warning on fake BBBP cash forms', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=1485017' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'What is the official website of Beti Bachao Beti Padhao?',
            a: 'The scheme page sits on the Ministry of Women and Child Development website, wcd.gov.in. There is no separate application portal because nobody applies individually.',
        },
        {
            q: 'Does Beti Bachao Beti Padhao give money to girls?',
            a: 'No. The ministry has repeatedly clarified that BBBP has no individual cash transfer of any kind and is not a DBT scheme; people distributing cash forms in its name are committing fraud.',
        },
        {
            q: 'Who runs Beti Bachao Beti Padhao?',
            a: 'It is a joint effort of the Ministries of Women & Child Development, Education, and Health & Family Welfare. States and UTs implement it, with 100% central funding.',
        },
        {
            q: 'Has BBBP made a difference?',
            a: 'The sex ratio at birth went from 918 to 929 between 2014-15 and 2025-26 (provisional), and girls\' gross enrolment at secondary level rose from 75.51% to 83.4% (UDISE). NITI Aayog evaluations in 2020 and 2025 rated the scheme satisfactory.',
        },
        {
            q: 'How much has been spent on BBBP?',
            a: '₹1,075.37 crore from launch to June 2026, on 78,305 activities that reached more than 3.37 crore participants.',
        },
        {
            q: 'Is Beti Bachao Beti Padhao still running in 2026?',
            a: 'Yes. It continues as a component of the Sambal vertical of Mission Shakti, alongside One Stop Centres, the 181 Women Helpline and Nari Adalat.',
        },
    ],
    related: [
        { href: '/sukanya-samriddhi', label: 'Sukanya Samriddhi calculator', note: 'The savings account for a girl child' },
        { href: '/schemes/c-pmmvy', label: 'PM Matru Vandana Yojana', note: 'Maternity cash benefit' },
        { href: '/schemes/c-saksham', label: 'Saksham Anganwadi & Poshan 2.0', note: 'Nutrition for girls and mothers at the Anganwadi' },
    ],
    appIssues: [
        'App lists "Convergence with SSY and Ujjwala" as a benefit; the ministry\'s documents describe convergence with the Health and Education departments, and an SSY/Ujjwala link could not be verified.',
        'App does not state the central fact that BBBP has no cash/DBT component and that "BBBP cash forms" are fraudulent.',
    ],
} satisfies SchemeContent;
