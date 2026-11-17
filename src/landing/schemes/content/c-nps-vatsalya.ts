import type { SchemeContent } from '../types';

export default {
    id: 'c-nps-vatsalya',
    title: 'NPS Vatsalya 2026: ₹250 Minimum, Eligibility, Benefits',
    description: 'NPS Vatsalya: open a pension account for a child under 18 with ₹250. Withdrawals after 3 years, choices at 18, the ₹8 lakh exit rule and tax benefit.',
    h1: 'NPS Vatsalya: eligibility, minimum contribution, withdrawals and what happens at 18',
    answer: [
        'NPS Vatsalya lets a parent or legal guardian open a pension account for any Indian citizen under 18 with ₹250, then at least ₹250 each financial year, with no upper limit (PFRDA).',
        'Under the NPS Vatsalya Scheme Guidelines 2025, in force from 23 February 2026, the child can at 18 stay in the scheme up to 21, move the money to regular NPS, or exit: the whole corpus can be taken in cash if it is below ₹8 lakh; at ₹8 lakh or more, up to 80% in cash and at least 20% into an annuity.',
    ],
    table: {
        caption: 'NPS Vatsalya rules under the 2025 guidelines',
        head: ['Rule', 'What PFRDA allows'],
        rows: [
            ['Who can be the subscriber', 'An Indian citizen below 18 (NRI and OCI minors included); the guardian operates the account'],
            ['Opening contribution', '₹250'],
            ['Later contributions', 'From ₹10 each time; at least ₹250 in every financial year; no maximum'],
            ['Partial withdrawal', 'After 3 years from opening; up to 25% of the minor\'s own contributions (not returns); for education, specified illness or disability above 75%'],
            ['Number of partial withdrawals', 'Two before 18; two more between 18 and 21 after fresh KYC'],
            ['Exit, corpus below ₹8 lakh', 'Whole corpus as lump sum'],
            ['Exit, corpus ₹8 lakh or more', 'Up to 80% lump sum, at least 20% in an annuity'],
            ['No choice made by 21', 'Moved to a higher-equity scheme of the same pension fund under the Multiple Scheme Framework'],
            ['Investment', 'Pension fund may allocate up to 100% to equity, or follow an indicative 75% equity / 20% G-sec / 30% debt / 10% money-market limit'],
        ],
        note: 'Returns are market-linked; NPS Vatsalya has no fixed or guaranteed rate. Charges are the same as NPS Tier I under the All Citizen model.',
    },
    eligibility: [
        'The child must be an Indian citizen below 18 years; NRI and OCI minors are eligible',
        'The account is opened and operated by a parent or legal guardian; the minor is the only beneficiary and the PRAN is in the minor\'s name',
        'One NPS Vatsalya account per child',
        'The guardian need not have an NPS account or be a government employee; a grandparent can open it only as legal guardian, but anyone can contribute',
        'A child can hold NPS Vatsalya and a Sukanya Samriddhi account together',
    ],
    benefits: [
        'Start retirement saving from childhood with ₹250 a year minimum',
        'Choice of pension fund and asset allocation; up to 100% equity allowed',
        'Partial withdrawal for education, specified illness or disability after three years',
        'At 18: continue to 21, shift to regular NPS, or exit under the ₹8 lakh rule',
        'Old tax regime: the parent\'s contribution qualifies for a deduction of up to ₹50,000 under Section 124(4) of the Income-tax Act, 2025 (old Section 80CCD(1B)); no deduction in the new regime',
        'If the minor dies, the corpus goes to the guardian and is not treated as income',
    ],
    documents: [
        'Minor\'s proof of date of birth: birth certificate, school leaving or matriculation certificate, PAN or passport',
        'Guardian\'s KYC: Aadhaar, driving licence, passport, voter ID, NREGA job card or NPR document, with PAN or Form 60',
        'Court order, if the guardian is court-appointed',
        'Bank account: optional for resident Indians at opening, mandatory for NRI/OCI guardians, needed at withdrawal or exit',
    ],
    howToApply: [
        'Online: open the account through eNPS (NPS Trust) or the online facility of a Point of Presence such as a bank or India Post.',
        'Offline: visit a PFRDA-registered Point of Presence branch with the minor\'s birth proof and your KYC documents.',
        'Choose a Central Recordkeeping Agency, a pension fund and the investment choice, and pay at least ₹250.',
        'A PRAN is issued in the child\'s name; keep adding at least ₹250 each financial year to avoid the account being frozen.',
        'Within three months of the child turning 18, complete fresh KYC so contributions can continue and the child can choose the next option.',
    ],
    portal: { label: 'PFRDA — NPS Vatsalya', url: 'https://pfrda.org.in/schemes/national-pension-system/nps-vatsalya' },
    sources: [
        { label: 'PFRDA — NPS Vatsalya scheme page (₹250 minimum, withdrawal limits, exit at ₹8 lakh, tax treatment under ITA 2025)', url: 'https://pfrda.org.in/schemes/national-pension-system/nps-vatsalya' },
        { label: 'PFRDA circular PFRDA/2026/02/NPS-Vatsalya/01, 7 January 2026 — NPS Vatsalya Scheme Guidelines 2025', url: 'https://www.pfrda.org.in/web/pfrda/w/nps-vatsalya-scheme-guidelines-2025' },
        { label: 'PFRDA circular PFRDA/2026/14/NPS-Vatsalya/02 — guidelines effective from 23 February 2026', url: 'https://www.pfrda.org.in/documents/33652/153574/Circular+NPS+Vatsalya+Scheme+Guidelines+2025+effective+from+23rd+Feb+2026.pdf' },
        { label: 'PFRDA FAQs on NPS Vatsalya (who opens the account, KYC, minor\'s documents)', url: 'https://pfrda.org.in/web/pfrda/w/faqs/nps-vatsalya' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'What is the minimum amount for NPS Vatsalya?',
            a: '₹250 to open the account and at least ₹250 in each financial year after that; single contributions can be as small as ₹10. There is no maximum. The ₹1,000 minimum of the 2024 rules no longer applies.',
        },
        {
            q: 'Who is eligible for NPS Vatsalya?',
            a: 'Any Indian citizen below 18, including NRI and OCI children. A parent or legal guardian opens and runs the account, and only one account is allowed per child.',
        },
        {
            q: 'Can I withdraw money from NPS Vatsalya before my child turns 18?',
            a: 'Yes, after three years from opening, up to 25% of the child\'s own contributions (returns excluded), for education, treatment of specified illnesses or disability above 75%. Two such withdrawals are allowed before 18.',
        },
        {
            q: 'What happens to NPS Vatsalya at age 18?',
            a: 'The child completes fresh KYC and takes over the account, then chooses to stay in NPS Vatsalya until 21, shift the whole corpus to regular NPS, or exit. If no choice is made by 21, the money moves to a higher-equity scheme of the same pension fund.',
        },
        {
            q: 'Does NPS Vatsalya give a tax deduction?',
            a: 'Only under the old tax regime: the parent can claim up to ₹50,000 under Section 124(4) of the Income-tax Act, 2025, which replaced Section 80CCD(1B). The new regime gives no deduction for this contribution.',
        },
        {
            q: 'NPS Vatsalya or Sukanya Samriddhi — which is better for my child?',
            a: 'They do different jobs, and a child may hold both. Sukanya Samriddhi is for girls and pays a government-set rate, while NPS Vatsalya is open to any child, invests in markets (up to 100% equity) and is built for long-term retirement saving.',
        },
    ],
    related: [
        { href: '/nps', label: 'NPS calculator', note: 'Project the corpus once the account moves to regular NPS' },
        { href: '/sukanya-samriddhi', label: 'Sukanya Samriddhi calculator', note: 'Fixed-rate savings for a daughter' },
        { href: '/compound-interest', label: 'Compound interest calculator', note: 'See how 18 years of compounding adds up' },
        { href: '/goal-planner', label: 'Goal planner', note: 'Plan a child\'s education fund alongside' },
    ],
    appIssues: [
        'App benefit "Minimum annual contribution: ₹1,000" is outdated; under the 2025 guidelines (effective 23 Feb 2026) the minimum is ₹250 at opening and ₹250 a year.',
        'App says the "Account converts to regular NPS at age 18"; it now offers three choices at 18 — continue to 21, shift to NPS, or exit (full lump sum below ₹8 lakh; otherwise up to 80% lump sum, at least 20% annuity).',
        'App omits partial withdrawal (after 3 years, up to 25% of contributions), the old-regime ₹50,000 deduction under Section 124(4), and that NRI/OCI minors are eligible.',
        'App documents list "Aadhaar of guardian" only; PFRDA accepts several KYC documents for the guardian plus PAN or Form 60, and the bank account is optional for residents at opening.',
    ],
} satisfies SchemeContent;
