import type { SchemeContent } from '../types';

export default {
    id: 'c-telemanas',
    title: 'Tele MANAS Helpline Number 14416: Free Mental Health Help',
    description: 'Tele MANAS: call 14416 or 1-800-891-4416 for free, confidential 24×7 mental health counselling in 20 languages. How a call works, the app, video consults.',
    h1: 'Tele MANAS helpline 14416: what it is and how to use it',
    answer: [
        'Tele MANAS is the Union Health Ministry\'s free, round-the-clock mental health helpline: dial 14416 or 1-800-891-4416 from any phone to speak to a trained counsellor (telemanas.mohfw.gov.in).',
        'It began on 10 October 2022 and had received 47,75,644 calls by October 2026, answered by 53 Tele MANAS cells covering all 36 states and union territories (PIB, 9 October 2026).',
    ],
    table: {
        caption: 'Tele MANAS at a glance',
        head: ['Item', 'Detail'],
        rows: [
            ['Toll-free numbers', '14416 and 1-800-891-4416'],
            ['Cost and hours', 'Free, 24 hours a day, 7 days a week'],
            ['Languages on the helpline', '20, depending on the languages each state has opted for'],
            ['Cells', '53, in all 36 states and UTs'],
            ['Calls since launch', '47,75,644 (October 2026)'],
            ['Mobile app', 'Launched 10 October 2024; English, Hindi and 10 regional languages'],
            ['Video consultation', 'Added as an upgrade to audio calls'],
        ],
        note: 'Figures from PIB releases of February, March and October 2026.',
    },
    howToApply: [
        'Dial 14416 (or 1-800-891-4416) from any mobile or landline — no registration and no charge.',
        'Choose your language; a trained counsellor takes the call and offers support.',
        'If you need more help, you can be connected to a mental health professional, including by video consultation, or referred to services under the District Mental Health Programme.',
        'The Tele MANAS mobile app offers support for concerns ranging from everyday well-being to mental disorders, with an interface designed for visually challenged users.',
    ],
    portal: { label: 'Tele MANAS (Ministry of Health and Family Welfare)', url: 'https://telemanas.mohfw.gov.in/home' },
    helpline: '14416 or 1-800-891-4416 (toll-free, 24×7)',
    sources: [
        { label: 'Tele MANAS official site — helpline numbers', url: 'https://telemanas.mohfw.gov.in/home' },
        { label: 'PIB, 9 October 2026 — 47.75 lakh calls, 53 cells', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2321522' },
        { label: 'PIB, 6 February 2026 — app languages, video consultation, AFMC cell', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2224522' },
        { label: 'PIB, 27 March 2026 — 20 languages, National Tele Mental Health Programme', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2245967' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'What is the Tele MANAS helpline number?',
            a: '14416. The official site also lists 1-800-891-4416 as a second toll-free number; both work round the clock and cost nothing.',
        },
        {
            q: 'What is the full form of Tele MANAS?',
            a: 'Tele Mental Health Assistance and Networking Across States. It is the service arm of the National Tele Mental Health Programme launched on 10 October 2022.',
        },
        {
            q: 'Is calling Tele MANAS confidential?',
            a: 'Yes. The Health Ministry describes the service as free, confidential and available 24×7. Nearly 44% of recorded caller profiles were women, according to the October 2026 PIB release.',
        },
        {
            q: 'Do I need to sign in or register to get help?',
            a: 'No. Calling 14416 needs no sign-in, registration or smartphone; the app is optional.',
        },
        {
            q: 'Which languages does Tele MANAS support?',
            a: 'The phone service works in 20 languages, based on the choices of each state. The app is in English, Hindi, Assamese, Bengali, Gujarati, Kannada, Malayalam, Marathi, Tamil, Telugu, Odia and Punjabi.',
        },
        {
            q: 'Is there a Tele MANAS service for the armed forces?',
            a: 'Yes. A dedicated Tele MANAS cell at the Armed Forces Medical College, Pune, serves armed forces personnel and their dependents.',
        },
    ],
    related: [
        { href: '/schemes/c-abdm', label: 'Ayushman Bharat Digital Mission', note: 'Create an ABHA number for your health records' },
        { href: '/schemes/c-abpmjay', label: 'Ayushman Bharat PM-JAY', note: '₹5 lakh hospital cover for eligible families' },
    ],
    appIssues: [
        'App lists only 14416; the official site also gives the toll-free number 1-800-891-4416.',
        'App does not mention the Tele MANAS mobile app (launched 10 October 2024) or the video consultation facility.',
    ],
} satisfies SchemeContent;
