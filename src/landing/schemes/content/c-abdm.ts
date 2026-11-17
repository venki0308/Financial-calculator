import type { SchemeContent } from '../types';

export default {
    id: 'c-abdm',
    title: 'Ayushman Bharat Digital Mission: ABHA Number Registration',
    description: 'ABDM gives a free 14-digit ABHA number to link and share health records with consent; 97.61 crore made by Sept 2026. Create one with Aadhaar or a licence.',
    h1: 'Ayushman Bharat Digital Mission: ABHA number registration and what it does',
    answer: [
        'The Ayushman Bharat Digital Mission gives each person a free 14-digit ABHA (Ayushman Bharat Health Account) number to link health records and share them with doctors only with consent; the mission was launched in September 2021 (PIB).',
        'As of 17 September 2026, 97.61 crore ABHAs had been created and 119.95 crore health records linked, with 5.78 lakh verified health facilities on the network (PIB, 22 September 2026).',
    ],
    table: {
        caption: 'Two ways to create an ABHA number on abha.abdm.gov.in',
        head: ['Route', 'What you need', 'What you get'],
        rows: [
            ['Aadhaar', 'Aadhaar number and the OTP sent to your Aadhaar-linked mobile', 'ABHA number after Aadhaar authentication'],
            ['Driving licence', 'Mobile OTP, licence number, name, date of birth and gender, photos of both sides of the licence', 'An enrolment number; carry the licence to an ABDM participating facility to get the ABHA number'],
        ],
        note: 'Creating an ABHA is voluntary and can be deactivated later.',
    },
    howToApply: [
        'Open abha.abdm.gov.in (or an ABDM-enabled health app) and choose to create an ABHA number.',
        'With Aadhaar: enter the number, accept the consent text and verify the OTP sent to your Aadhaar-linked mobile.',
        'With a driving licence: verify your mobile, enter the licence details and upload both sides; take the enrolment number and licence to an ABDM participating facility for verification.',
        'Create an ABHA address (a username such as name@abdm) and link it to your ABHA number so records can be shared with you.',
    ],
    portal: { label: 'ABHA — Ayushman Bharat Health Account (National Health Authority)', url: 'https://abha.abdm.gov.in/abha/v3/' },
    helpline: '1800-11-4477 (National Health Authority, toll-free)',
    sources: [
        { label: 'ABHA portal — what the ABHA number and address are, opt-out, helpline', url: 'https://abha.abdm.gov.in/abha/v3/' },
        { label: 'ABHA portal — create ABHA using a driving licence', url: 'https://abha.abdm.gov.in/abha/v3/register/driving-licence' },
        { label: 'PIB, 22 September 2026 — 97.61 crore ABHAs, 119.95 crore records', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2313393' },
        { label: 'Lok Sabha Unstarred Q. 2091 (2026) — no central repository, privacy by design', url: 'https://sansad.in/getFile/lsapps/loksabhaquestions/annex/188/AU2091_MtBfWs.pdf' },
        { label: 'PIB, 25 September 2026 — Arogya Manthan: five years of ABDM', url: 'https://www.pib.gov.in/newsite/erelcontent.aspx?lang=1&reg=3&relid=295258' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'Is the ABHA card the same as the Ayushman card?',
            a: 'No. The ABHA number is a health ID for storing and sharing records and anyone can create one. The Ayushman card is for hospital treatment under AB PM-JAY and only for eligible families; NHA counts them separately — about 49 crore Ayushman cards against about 98 crore ABHAs in September 2026.',
        },
        {
            q: 'What is the difference between an ABHA number and an ABHA address?',
            a: 'The ABHA number is a 14-digit identifier issued after KYC. The ABHA address is a self-chosen username, like xyz@abdm, that is used to share and receive health records with consent.',
        },
        {
            q: 'Can I create an ABHA without Aadhaar?',
            a: 'Yes. Choose the driving licence option: you get an enrolment number online and the ABHA number is issued after a participating health facility checks your licence.',
        },
        {
            q: 'Can I delete my ABHA number?',
            a: 'Yes. Joining is voluntary and you can opt out at any time by deactivating the ABHA number.',
        },
        {
            q: 'Where are my health records kept?',
            a: 'There is no central store. ABDM uses a federated design, and records move between hospitals, labs and apps only with your consent, the Health Ministry told the Lok Sabha in 2026.',
        },
        {
            q: 'When was the Ayushman Bharat Digital Mission launched?',
            a: 'In September 2021, by the Government of India; it marked five years at Arogya Manthan 2026 in September 2026, implemented by the National Health Authority.',
        },
    ],
    related: [
        { href: '/schemes/c-abpmjay', label: 'Ayushman Bharat PM-JAY', note: '₹5 lakh cashless hospital cover for eligible families' },
        { href: '/schemes/c-telemanas', label: 'Tele MANAS 14416', note: 'Free mental health helpline' },
        { href: '/schemes/c-pmrahat', label: 'PM RAHAT', note: 'Cashless road-accident treatment' },
    ],
    appIssues: [
        'App implies Aadhaar is required ("Link Aadhaar for verification"); an ABHA number can also be created with a driving licence, verified at a participating facility.',
        'App\'s link abdm.gov.in is the mission site; ABHA creation happens on abha.abdm.gov.in.',
    ],
} satisfies SchemeContent;
