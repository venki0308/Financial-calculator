import type { SchemeContent } from '../types';

export default {
    id: 'c-pmsby',
    title: 'PMSBY ₹20 Premium: PM Suraksha Bima Yojana Apply Online',
    description: 'PM Suraksha Bima Yojana: ₹2 lakh accident cover for ₹20 a year, age 18–70. Disability payouts, how to apply online or at your bank, and how claims work.',
    h1: 'PM Suraksha Bima Yojana (PMSBY): ₹20 accident cover, eligibility and how to apply',
    answer: [
        'PMSBY pays ₹2 lakh for accidental death or total disability and ₹1 lakh for losing the sight of one eye or the use of one hand or foot, for a premium of ₹20 a year (Department of Financial Services, page updated 5 January 2026).',
        'Savings account holders aged 18 to 70 can enrol at their bank or post office, or online through the Jan Suraksha portal, and each cover year runs 1 June to 31 May.',
        'Launched on 9 May 2015, the scheme had paid ₹3,667.52 crore on 1,84,662 claims by 29 April 2026 (PIB).',
    ],
    table: {
        caption: 'What PMSBY pays for each kind of accidental loss',
        head: ['Loss caused by an accident', 'Amount paid'],
        rows: [
            ['Death', '₹2,00,000'],
            ['Total and irrecoverable loss of both eyes, or loss of use of both hands or both feet, or loss of one eye plus use of one hand or foot', '₹2,00,000'],
            ['Total and irrecoverable loss of sight of one eye, or loss of use of one hand or one foot', '₹1,00,000'],
            ['Any other partial disability', 'Nothing'],
        ],
        note: 'Premium ₹20 per member per year, auto-debited in one instalment. Source: financialservices.gov.in/pmsby.',
    },
    eligibility: [
        'Individual (single or joint) savings account holder at a participating bank or post office',
        'Age 18 to 70 years',
        'Only one account per person can be used for the cover',
        'NRIs with an eligible Indian bank account can enrol; claims are paid in Indian rupees',
    ],
    howToApply: [
        'Make sure you are 18–70 and hold an individual savings account at a bank or post office that offers PMSBY.',
        'Enrol online through the Jan Suraksha portal, or hand in the PMSBY option form at your branch.',
        'Authorise the ₹20 auto-debit and name a nominee.',
        'Keep at least ₹20 in the account before each renewal so the 1 June–31 May cover continues; late renewal is allowed, with cover starting from the debit date.',
    ],
    portal: { label: 'Jan Suraksha portal (Department of Financial Services)', url: 'https://jansuraksha.gov.in' },
    helpline: 'Toll-free numbers by state are published on jansuraksha.gov.in (STATEWISETOLLFREE.pdf); claims are filed through the branch that holds the insured account.',
    sources: [
        { label: 'Department of Financial Services — PMSBY scheme details', url: 'https://financialservices.gov.in/pmsby' },
        { label: 'PIB, 9 May 2026 — 11 years of PMSBY, PMJJBY and APY', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2259251' },
        { label: 'Jan Suraksha — state-wise toll-free numbers (PDF)', url: 'https://jansuraksha.gov.in/files/STATEWISETOLLFREE.pdf' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'Is suicide covered under PM Suraksha Bima Yojana?',
            a: 'No. PMSBY only pays for accidents — a sudden, unforeseen and involuntary event caused by external, violent and visible means. Suicide is excluded, while death by murder is covered.',
        },
        {
            q: 'Does PMSBY pay hospital bills after an accident?',
            a: 'No. The scheme pays fixed lump sums for death or the listed disabilities only; hospitalisation expenses are not reimbursed.',
        },
        {
            q: 'What proof is needed for a PMSBY death claim?',
            a: 'Road, rail and other vehicle accidents, drowning and crime-related deaths must be reported to the police; for snake bite or a fall from a tree, hospital records are needed. A missing person is not paid until the death is confirmed by documents.',
        },
        {
            q: 'Who receives the PMSBY money?',
            a: 'For a death claim, the nominee named in the enrolment form (or the legal heirs if there is none) is paid into their account. Disability payouts go into the insured person\'s own account.',
        },
        {
            q: 'When does PMSBY cover end?',
            a: 'It ends when the member turns 70, or earlier if the account is closed or lacks the balance for the premium. Holding PMSBY through two accounts does not double the cover — it is limited to one account and the extra premium may be forfeited.',
        },
        {
            q: 'When was PMSBY launched?',
            a: 'On 9 May 2015, together with PM Jeevan Jyoti Bima Yojana and Atal Pension Yojana. By 29 April 2026 it had more than 58.09 crore cumulative enrolments (PIB).',
        },
        {
            q: 'Can I claim PMSBY more than once?',
            a: 'No. Only one claim is admitted per insured person.',
        },
    ],
    related: [
        { href: '/schemes/c-pmjjby', label: 'PM Jeevan Jyoti Bima Yojana', note: '₹2 lakh life cover for death from any cause' },
        { href: '/schemes/c-pmrahat', label: 'PM RAHAT', note: 'Cashless treatment for road-accident victims' },
        { href: '/term-insurance-cover', label: 'Term insurance cover calculator', note: 'Size the life cover your family would need' },
        { href: '/health-insurance-claim-settlement-ratio', label: 'Health insurance claim settlement ratio', note: 'PMSBY does not pay hospital bills — compare health insurers' },
    ],
    appIssues: [
        'App lists age 18–70 but not that cover ends at 70 or that a person may use only one account.',
        'App does not mention the verified exclusions: suicide is not covered, hospitalisation costs are not reimbursed, and partial disability other than loss of one eye, hand or foot pays nothing.',
    ],
} satisfies SchemeContent;
