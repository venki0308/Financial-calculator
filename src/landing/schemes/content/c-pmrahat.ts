import type { SchemeContent } from '../types';

export default {
    id: 'c-pmrahat',
    title: 'PM RAHAT: ₹1.5 Lakh Cashless Road Accident Treatment',
    description: 'PM RAHAT gives road accident victims cashless treatment up to ₹1.5 lakh for 7 days at designated hospitals. Dial 112. How it works and who pays.',
    h1: 'PM RAHAT: cashless treatment of road accident victims up to ₹1.5 lakh',
    answer: [
        'Under PM RAHAT, every eligible road accident victim on any category of road gets cashless treatment of up to ₹1.5 lakh per person for up to 7 days from the date of the accident, at designated hospitals including AB PM-JAY empanelled ones (PIB, 14 February 2026).',
        'The scheme went nationwide on 13 February 2026 under Section 162 of the Motor Vehicles Act; by 31 July 2026 it had helped 22,481 victims across 34 states and UTs (PIB, 12 August 2026).',
    ],
    table: {
        caption: 'What PM RAHAT covers and who pays the hospital',
        head: ['Item', 'Rule'],
        rows: [
            ['Treatment cover', 'Up to ₹1.5 lakh per victim, cashless'],
            ['Time limit', '7 days from the date of the accident'],
            ['Stabilisation', 'Up to 24 hours for non-life-threatening cases, up to 48 hours for life-threatening ones, subject to police authentication'],
            ['Police confirmation', 'Within 24 hours (non-life-threatening) or 48 hours (life-threatening) on the integrated eDAR–TMS 2.0 system'],
            ['Who pays, offending vehicle insured', 'Motor Vehicle Accident Fund, from general insurers\' contributions'],
            ['Who pays, uninsured or hit-and-run', 'Motor Vehicle Accident Fund, from the Government of India budget'],
            ['Claim settlement to hospitals', 'Within 10 days of approval by the State Health Agency'],
        ],
        note: 'Up to 31 July 2026, State Health Agencies had approved ₹12.59 crore of hospital claims and paid ₹10.56 crore (PIB, 12 August 2026).',
    },
    eligibility: [
        'Any person injured in a road accident caused by the use of a motor vehicle, on any category of road in India',
        'Insured, uninsured and hit-and-run cases are all covered; payment comes from the Motor Vehicle Accident Fund',
        'Treatment at a designated hospital; AB PM-JAY empanelled hospitals that follow the NHA guidelines are deemed designated',
        'The accident must be authenticated by the police on the integrated system within the set time',
    ],
    benefits: [
        'Cashless treatment up to ₹1.5 lakh per victim',
        'Covers up to 7 days from the date of the accident',
        'Stabilisation for 24 or 48 hours depending on severity',
        'Help through 112: the caller is told the nearest designated hospital and can ask for an ambulance',
        'Denial of admission or treatment is non-compliance; states can act against the hospital, including de-empanelment',
    ],
    documents: [
        'No application by the victim; the hospital and police record the case on the digital system',
        'Any identity document of the victim helps the hospital register the case',
    ],
    howToApply: [
        'At the accident site, the victim, a Good Samaritan (Rah-Veer) or anyone present dials 112 for the nearest designated hospital and an ambulance.',
        'Take the victim to a designated hospital, such as an AB PM-JAY empanelled hospital, and tell the staff it is a road accident case.',
        'The hospital registers the case on the NHA system linked to the police eDAR platform; the police confirm the accident within 24 or 48 hours.',
        'Treatment up to ₹1.5 lakh within 7 days is cashless; the hospital claims payment from the State Health Agency.',
        'If a hospital refuses treatment, complain to the Grievance Redressal Officer nominated by the District Road Safety Committee (chaired by the District Collector).',
    ],
    portal: { label: 'Ministry of Road Transport and Highways', url: 'https://morth.nic.in/' },
    helpline: '112 — Emergency Response Support System (nearest designated hospital and ambulance)',
    sources: [
        { label: 'PIB, 14 February 2026 — PM RAHAT approved: ₹1.5 lakh, 7 days, stabilisation 24/48 hours, MVAF payment, 10-day claim settlement, grievance officer', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2228172' },
        { label: 'PIB, 12 August 2026 — PM-RAHAT launched nationwide 13 February 2026; 22,481 victims; designated hospitals; action on denial', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2298285' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'How much does PM RAHAT pay for a road accident victim?',
            a: 'Up to ₹1.5 lakh of cashless treatment per victim, for up to 7 days from the date of the accident. Costs beyond that are not covered by PM RAHAT.',
        },
        {
            q: 'Does PM RAHAT cover hit-and-run accidents?',
            a: 'Yes. For uninsured and hit-and-run cases the hospital is paid from the Motor Vehicle Accident Fund out of the Government of India\'s budget; for insured offending vehicles, general insurers fund it.',
        },
        {
            q: 'Do I need to register or show an Ayushman card for PM RAHAT?',
            a: 'No. The victim does not apply. The hospital records the case on the NHA system and the police confirm the accident; no Ayushman card or income proof is part of the process described by PIB.',
        },
        {
            q: 'Which hospitals give cashless treatment under PM RAHAT?',
            a: 'Designated hospitals. AB PM-JAY empanelled hospitals that follow the NHA guidelines are deemed designated, and states are designating more. Dialling 112 tells you the nearest one.',
        },
        {
            q: 'What if the hospital refuses to admit an accident victim?',
            a: 'Denying admission or treatment under the scheme is non-compliance. Complain to the district Grievance Redressal Officer; states can act under clinical establishment laws and empanelment rules, up to suspension or de-empanelment.',
        },
        {
            q: 'Is PM RAHAT only for national highways?',
            a: 'No. It applies to road accidents involving motor vehicles on any category of road, including state highways and city roads.',
        },
    ],
    related: [
        { href: '/schemes/c-abpmjay', label: 'Ayushman Bharat PM-JAY', note: 'Its empanelled hospitals are PM RAHAT hospitals' },
        { href: '/schemes/c-pmsby', label: 'PM Suraksha Bima Yojana', note: 'Low-cost accident insurance through your bank account' },
        { href: '/health-insurance-claim-settlement-ratio', label: 'Health insurance claim ratios', note: 'Cover for treatment beyond ₹1.5 lakh' },
        { href: '/term-insurance-cover', label: 'Term insurance calculator', note: 'Protect your family against the worst case' },
    ],
    appIssues: [
        'App eligibility says "Treatment must start within 24 hours of the accident at an empanelled hospital"; the PIB releases set a 7-day cover window and 24/48-hour limits for stabilisation and police confirmation, not a 24-hour start rule.',
        'App benefit says "non-empanelled hospitals stabilise (24–48 hrs) and refer"; PIB describes 24/48 hours as the stabilisation limit subject to police authentication, without that referral rule.',
        'App says launched 14 Feb 2026; PIB (12 Aug 2026) gives 13 February 2026 as the nationwide launch, with the approval announced on 14 February.',
        'App lists hit-and-run compensation of ₹2 lakh / ₹50,000 as a PM RAHAT benefit; that is a separate compensation scheme and was not checked against an official source today, so it is left out here.',
    ],
} satisfies SchemeContent;
