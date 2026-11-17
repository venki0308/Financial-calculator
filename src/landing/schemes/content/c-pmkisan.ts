import type { SchemeContent } from '../types';

export default {
    id: 'c-pmkisan',
    title: 'PM Kisan Samman Nidhi 2026: ₹6,000, Status, Eligibility',
    description: 'PM-KISAN pays ₹6,000 a year in three ₹2,000 instalments; the 24th was paid on 30 Oct 2026. Who is excluded, eKYC and how to check status on pmkisan.gov.in.',
    h1: 'PM Kisan Samman Nidhi: ₹6,000 a year, who qualifies and how to check your status',
    answer: [
        'PM-KISAN gives every eligible landholding farmer family ₹6,000 a year, paid as three instalments of ₹2,000 straight into an Aadhaar-seeded bank account (Revised Operational Guidelines, pmkisan.gov.in).',
        'The 24th instalment, about ₹18,690 crore for more than 9.34 crore farmers, went out on 30 October 2026, taking total payouts past ₹4.64 lakh crore; in July 2026 the Cabinet extended the scheme to 2030-31 with a ₹3.15 lakh crore outlay (PIB).',
        'Money is released only when three things are in place: land records seeded on the portal, a bank account linked to Aadhaar, and completed eKYC.',
    ],
    table: {
        caption: 'When the three PM-KISAN instalments fall due',
        head: ['Payment period (trimester)', 'Amount', 'What decides whether you get it'],
        rows: [
            ['April to July', '₹2,000', 'Land seeded, Aadhaar-linked account, eKYC done before the release'],
            ['August to November', '₹2,000', 'Same three checks; the 24th instalment (30 Oct 2026) was this period\'s payment for 2026-27'],
            ['December to March', '₹2,000', 'Same three checks, plus the family must still fall outside the exclusion list'],
            ['Whole year', '₹6,000', 'One payment per family, not per family member'],
        ],
        note: 'A "family" here means husband, wife and minor children who own cultivable land as per state land records. The Union Budget 2026-27 set aside ₹60,000 crore for the scheme (PIB).',
    },
    eligibility: [
        'A landholding farmer family (husband, wife and minor children) that owns cultivable land in the state\'s land records',
        'Land records verified and seeded on the PM-KISAN portal by the state government',
        'A bank account linked to Aadhaar, so the money can be paid through DBT',
        'eKYC completed by OTP, biometric or face authentication',
    ],
    notEligible: [
        'Institutional landholders',
        'Families with a member who holds or held a constitutional post',
        'Present or former Union/State ministers, MPs, MLAs, MLCs, mayors of municipal corporations and chairpersons of district panchayats',
        'Serving or retired officers and employees of Central or State governments, PSEs, autonomous bodies and regular local-body staff (Multi Tasking Staff, Class IV and Group D employees are not excluded)',
        'Retired pensioners drawing ₹10,000 or more a month (again except MTS, Class IV and Group D)',
        'Anyone in the family who paid income tax in the last assessment year',
        'Doctors, engineers, lawyers, chartered accountants and architects registered with their professional body and in practice',
        'Non-resident Indians, for new registrations',
    ],
    benefits: [
        '₹6,000 a year per eligible family as income support',
        'Three instalments of ₹2,000, one in each four-month period',
        'Paid by Direct Benefit Transfer to the Aadhaar-seeded bank account, with no middlemen',
        'Scheme approved to continue from 2026-27 to 2030-31',
    ],
    documents: [
        'Aadhaar of the farmer',
        'Mobile number linked to Aadhaar (needed for OTP-based eKYC)',
        'Bank account linked (seeded) with Aadhaar',
        'Land record details (khasra/khata or survey number) as held by the state',
    ],
    howToApply: [
        'On pmkisan.gov.in, open the Farmers Corner and choose "New Farmer Registration"; enter your Aadhaar, then your bank and land details. You can also register through a Common Service Centre.',
        'The state government checks your land record and the exclusion list before your name is approved.',
        'Finish eKYC: OTP on the portal or app (needs an Aadhaar-linked mobile), biometric at a CSC or State Seva Kendra (₹15 fee), or face authentication in the PM-KISAN app.',
        'Make sure your bank account is seeded with Aadhaar; payments are made only to Aadhaar-seeded accounts.',
    ],
    statusSteps: [
        'Go to pmkisan.gov.in and open "Know Your Status" in the Farmers Corner (the same option is in the PM-KISAN mobile app).',
        'Enter your registration number as the page asks, and complete the verification it shows.',
        'Read the eKYC, Aadhaar-bank seeding and land seeding lines: any one marked "No" stops the next instalment.',
        'If you registered yourself or at a CSC and are not yet approved, use "Status of Self Registered Farmer/ CSC Farmers" on the same portal instead.',
        'For a wrong name, rejected record or missing payment, ask through the Kisan eMitra chatbot on the portal or your district agriculture office.',
    ],
    portal: { label: 'PM-KISAN official portal', url: 'https://pmkisan.gov.in/' },
    sources: [
        { label: 'PM-KISAN Revised Operational Guidelines (family definition, exclusions, three ₹2,000 instalments)', url: 'https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines(English).pdf' },
        { label: 'PM-KISAN note on the three eKYC modes (OTP, biometric at CSC for ₹15, face authentication)', url: 'https://pmkisan.gov.in/Documents/Note-on-Modes-and-processes-of-ekyc-13th-Nov-English.pdf' },
        { label: 'PIB, 29 October 2026 — 24th instalment of over ₹18,690 crore to 9.34 crore farmers on 30 October', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2330171' },
        { label: 'PIB press note — 24th instalment released, ₹4.64 lakh crore cumulative, continuation to 2030-31 with ₹3.15 lakh crore, Budget 2026-27 ₹60,000 crore', url: 'https://www.pib.gov.in/PressNoteDetails.aspx?NoteId=160645&ModuleId=3' },
        { label: 'PM-KISAN portal — Know Your Status, New Farmer Registration, eKYC is mandatory', url: 'https://pmkisan.gov.in/' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'How much money does a farmer get under PM Kisan Samman Nidhi?',
            a: '₹6,000 a year per eligible farmer family, in three instalments of ₹2,000. The amount is per family (husband, wife and minor children), so two members of the same family do not each get ₹6,000.',
        },
        {
            q: 'When was the 24th PM-KISAN instalment paid?',
            a: 'On 30 October 2026. PIB reported about ₹18,690 crore going to more than 9.34 crore farmers that day. If yours did not arrive, check eKYC, Aadhaar-bank seeding and land seeding under "Know Your Status".',
        },
        {
            q: 'Is PM-KISAN only for small and marginal farmers?',
            a: 'No. The scheme covers all landholding farmer families with cultivable land, subject to the exclusions: institutional landholders, income-tax payers, government employees and pensioners above ₹10,000 a month, practising professionals and holders of high public office.',
        },
        {
            q: 'Can a retired government employee get PM-KISAN?',
            a: 'Only if the monthly pension is below ₹10,000, or the person retired as Multi Tasking Staff, Class IV or Group D. Other retired officers and employees of Central or State governments are excluded.',
        },
        {
            q: 'Why has my PM-KISAN instalment stopped?',
            a: 'The usual reasons are incomplete eKYC, a bank account not seeded with Aadhaar, or land records not seeded by the state. Someone in the family paying income tax also ends eligibility. "Know Your Status" on pmkisan.gov.in shows which check failed.',
        },
        {
            q: 'How can I do PM-KISAN eKYC without going to a CSC?',
            a: 'Use OTP eKYC on pmkisan.gov.in or the app if your mobile is linked to Aadhaar, or use face authentication in the PM-KISAN app with the Aadhaar Face RD app. Biometric eKYC at a CSC costs ₹15.',
        },
        {
            q: 'Do tenant farmers get PM-KISAN money?',
            a: 'No. Under the guidelines, benefits go to families that own cultivable land as shown in state land records. A tenant can still get farm credit through the Kisan Credit Card.',
        },
    ],
    related: [
        { href: '/schemes/c-kcc', label: 'Kisan Credit Card', note: 'Crop loans at 7%, 4% if repaid on time' },
        { href: '/schemes/c-pmfby', label: 'PM Fasal Bima Yojana', note: 'Crop insurance for notified crops' },
        { href: '/schemes/c-pmddky', label: 'PM Dhan-Dhaanya Krishi Yojana', note: 'Extra farm support in 100 low-productivity districts' },
        { href: '/schemes/c-pmjdy', label: 'PM Jan Dhan Yojana', note: 'A zero-balance account to receive DBT payments' },
    ],
    appIssues: [
        'App benefit "Applies to small and marginal farmers" is wrong: the scheme covers all landholding farmer families, subject to the exclusion list.',
        'App eligibility lists only income taxpayers and "certain government employees"; the guidelines also exclude institutional landholders, holders of constitutional posts, ministers/MPs/MLAs/mayors/district panchayat chairpersons, pensioners drawing ₹10,000+ a month, practising professionals and NRIs (new registrations), with the MTS/Class IV/Group D carve-out.',
        'App does not say eKYC is mandatory, or list the three eKYC modes.',
        'App note "Income taxpayers and government pensioners are not eligible" overstates the pension rule: pensioners below ₹10,000 a month (and MTS/Class IV/Group D retirees) remain eligible.',
    ],
} satisfies SchemeContent;
