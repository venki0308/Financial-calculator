import type { SchemeContent } from '../types';

export default {
    id: 'c-digital-agri',
    title: 'Digital Agriculture Mission: Farmer ID and AgriStack Guide',
    description: 'Digital Agriculture Mission (₹2,817 crore, approved 2 Sept 2024) builds AgriStack: 11 crore Farmer IDs by Oct 2026. What a Farmer ID does, how to get it.',
    h1: 'Digital Agriculture Mission: AgriStack, Farmer ID and what it means for farmers',
    answer: [
        'The Union Cabinet approved the Digital Agriculture Mission on 2 September 2024 with an outlay of ₹2,817 crore, including a central share of ₹1,940 crore, to build digital public infrastructure for farming such as AgriStack (PIB).',
        'Its target of 11 crore Farmer IDs was reached on 23 October 2026, five months before the 31 March 2027 deadline, and more than 6 crore farmers have received scheme benefits through Farmer ID-based delivery (PIB, 24 October 2026).',
    ],
    table: {
        caption: 'The three AgriStack registries',
        head: ['Registry', 'What it records', 'Progress'],
        rows: [
            ['Farmer Registry (Farmer ID)', 'Each farmer\'s details linked to the state\'s digitised land records', '11 crore Farmer IDs (23 October 2026)'],
            ['Crop Sown Registry (Digital Crop Survey)', 'The crop sown on each plot each season', 'Rabi 2025-26: over 31.3 crore plots in 648 districts'],
            ['Geo-referenced village maps', 'Plot boundaries on village maps', 'Created and maintained by the states'],
        ],
        note: 'All three registries are built and owned by the states in a federated design (PIB, 7 August 2026).',
    },
    eligibility: [
        'Landholding farmers, including women farmers, get a Farmer ID once their details are matched with digitised land records',
        'The Farmer Registry application also has provision to onboard tenants and sharecroppers',
    ],
    benefits: [
        'Farmer ID used for PM-Kisan registration, PMFBY crop insurance enrolment, MSP procurement and Soil Health Card linking',
        'Faster Kisan Credit Card sanction — within half an hour in some cases — and quicker disaster relief',
        'Fewer repeated document checks across schemes',
        'Digital Crop Survey data used for near real-time crop production estimates',
    ],
    howToApply: [
        'Create your Farmer ID through your state\'s Farmer Registry — farmers can self-register on a mobile phone, or use camps and Common Service Centres where the state runs them.',
        'Your details are matched with the state\'s digitised land records; data is collected only with your consent.',
        'Quote the Farmer ID when you register for PM-Kisan, crop insurance or MSP procurement.',
        'Each season the state records your crop through the Digital Crop Survey; check with your agriculture office if your plot\'s crop is wrong.',
    ],
    portal: { label: 'AgriStack (Ministry of Agriculture and Farmers Welfare)', url: 'https://agristack.gov.in/' },
    sources: [
        { label: 'PIB, 2 September 2024 — Cabinet approves Digital Agriculture Mission, ₹2,817 crore', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2050966' },
        { label: 'PIB, 24 October 2026 — 11 crore Farmer IDs created', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2327905' },
        { label: 'PIB, 7 August 2026 — AgriStack registries, data protection', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2296209' },
        { label: 'Lok Sabha Unstarred Q. 3879 (2026) — uses of Farmer ID, self-registration', url: 'https://sansad.in/getFile/lsapps/loksabhaquestions/annex/188/AU3879_hkKITk.pdf' },
        { label: 'PIB, 24 March 2026 — Farmer Registry covers women farmers, tenants and sharecroppers', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2244626' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'What is the Digital Agriculture Mission?',
            a: 'An umbrella scheme of the Agriculture Ministry for digital farm initiatives: building digital public infrastructure (AgriStack), running the Digital General Crop Estimation Survey, and IT projects by the Centre, states and research institutions.',
        },
        {
            q: 'What is a Farmer ID used for?',
            a: 'It is a single digital identity linked to your land records. States and the Centre use it for PM-Kisan registration, PMFBY enrolment, MSP procurement, KCC loans, fertiliser booking and disaster relief, so you do not have to prove the same details again.',
        },
        {
            q: 'Who controls the data in AgriStack?',
            a: 'The states. Registries are federated, data is collected with the farmer\'s consent under the Digital Personal Data Protection Act 2023 and Rules 2025, it is stored encrypted, and the system follows MeitY and CERT-In security guidelines.',
        },
        {
            q: 'Does the Digital Agriculture Mission pay farmers money?',
            a: 'No. It builds the digital system; money reaches farmers through schemes such as PM-Kisan or crop insurance, which now use the Farmer ID.',
        },
        {
            q: 'Which state has the most Farmer IDs?',
            a: 'Uttar Pradesh, with 2,47,59,182 Farmer IDs out of 10.34 crore nationwide on 6 August 2026, followed by Maharashtra with 1,36,28,992.',
        },
        {
            q: 'Can I register for a Farmer ID myself?',
            a: 'Yes. The Agriculture Ministry told the Lok Sabha that farmers can register for a Farmer ID themselves using their mobile phones; some states also run CSC campaigns to help.',
        },
    ],
    related: [
        { href: '/schemes/c-pmkisan', label: 'PM Kisan Samman Nidhi', note: 'Registration now uses the Farmer ID' },
        { href: '/schemes/c-pmfby', label: 'PM Fasal Bima Yojana', note: 'Crop insurance enrolment with Farmer ID' },
        { href: '/schemes/c-kcc', label: 'Kisan Credit Card', note: 'Faster KCC sanction through AgriStack' },
        { href: '/schemes/c-digital-india', label: 'Digital India', note: 'The wider digital public infrastructure' },
    ],
    appIssues: [
        'App says the mission has "no individual application"; farmers do register individually for a Farmer ID (self-registration on mobile or assisted camps/CSCs), the main citizen-facing part of the mission.',
        'App lists "AI-based crop advisory" and "satellite-based crop monitoring" as benefits; these could not be verified as components of this mission from official sources and were left out.',
    ],
} satisfies SchemeContent;
