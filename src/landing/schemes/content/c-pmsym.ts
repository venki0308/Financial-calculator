import type { SchemeContent } from '../types';

export default {
    id: 'c-pmsym',
    title: 'PM Shram Yogi Maandhan (PM-SYM): ₹3,000 Pension Chart',
    description: 'PM-SYM gives unorganised workers aged 18–40 earning up to ₹15,000 a ₹3,000 pension at 60. Age-wise contribution ₹55–₹200, exit rules, CSC enrolment.',
    h1: 'PM Shram Yogi Maandhan Yojana: contribution chart, eligibility and how to enrol',
    answer: [
        'PM-SYM guarantees a pension of ₹3,000 a month from age 60 to unorganised workers who join between 18 and 40 and earn ₹15,000 a month or less; the worker pays ₹55 to ₹200 a month depending on entry age and the Central Government adds the same amount (Ministry of Labour and Employment).',
        'More than 54 lakh workers had enrolled by 29 July 2026, and since the scheme began in February 2019 the first pensions will not be paid before February 2039 (PIB, 3 August 2026).',
    ],
    table: {
        caption: 'PM-SYM monthly contribution by age at entry (paid every month until 60)',
        head: ['Age when you join', 'You pay', 'Centre adds', 'Total credited'],
        rows: [
            ['18', '₹55', '₹55', '₹110'],
            ['22', '₹68', '₹68', '₹136'],
            ['25', '₹80', '₹80', '₹160'],
            ['29', '₹100', '₹100', '₹200'],
            ['30', '₹105', '₹105', '₹210'],
            ['35', '₹150', '₹150', '₹300'],
            ['40', '₹200', '₹200', '₹400'],
        ],
        note: 'The Ministry of Labour and Employment\'s scheme page gives the full chart for every entry age from 18 to 40. Contributions are auto-debited from a savings or Jan Dhan account.',
    },
    eligibility: [
        'Unorganised worker — e.g. street vendor, domestic worker, construction or agricultural worker, head loader, rickshaw puller, beedi, handloom or leather worker',
        'Entry age 18 to 40 years',
        'Monthly income ₹15,000 or less',
        'Not covered by EPFO, ESIC or NPS (government-contributed)',
        'Not an income-tax payer',
        'Has Aadhaar, a mobile phone and a savings bank or Jan Dhan account',
    ],
    benefits: [
        'Minimum assured pension of ₹3,000 a month after 60',
        'If the pensioner dies, the spouse gets 50% of the pension as family pension (spouse only)',
        'If the subscriber dies before 60 after regular contributions, the spouse can continue the scheme or exit with the money',
        'Husband and wife can both join and draw ₹6,000 a month together',
    ],
    howToApply: [
        'Take your Aadhaar card, savings or Jan Dhan account passbook and mobile phone to the nearest Common Service Centre.',
        'The CSC operator registers you on a self-certification basis; pay the first month\'s contribution in cash and keep the receipt.',
        'Later contributions are auto-debited from your bank account every month until you turn 60.',
        'You can also self-enrol on maandhan.in using your Aadhaar and bank account details.',
    ],
    portal: { label: 'Maandhan portal (Ministry of Labour and Employment)', url: 'https://maandhan.in' },
    helpline: '1800 267 6888 — PM-SYM customer care (24×7)',
    sources: [
        { label: 'Ministry of Labour and Employment — PM Shram Yogi Maan-dhan scheme page', url: 'https://www.labour.gov.in/offerings/schemes-and-services/details/pm-sym-QTOzATMtQWa' },
        { label: 'PIB, 3 August 2026 — PM-SYM enrolment and eligibility', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2293891' },
        { label: 'e-Shram — social security welfare schemes (PM-SYM)', url: 'https://eshram.gov.in/social-security-welfare-schemes' },
        { label: 'Maandhan portal', url: 'https://maandhan.in' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'How much do I pay in PM-SYM if I join at 30?',
            a: '₹105 a month until you turn 60, and the Central Government puts in another ₹105 every month, so ₹210 is credited each month.',
        },
        {
            q: 'What happens if I leave PM-SYM before 10 years?',
            a: 'Only your own contributions come back, with savings-bank interest. If you leave after 10 years but before 60, you get your share plus the interest actually earned by the fund or savings-bank interest, whichever is higher.',
        },
        {
            q: 'Can I join PM Shram Yogi Maandhan if I have a PF account?',
            a: 'No. Members of EPFO, ESIC or government-contributed NPS cannot join, and neither can income-tax payers.',
        },
        {
            q: 'What does my spouse get after my death?',
            a: 'If you die while receiving the pension, your spouse gets half of it — ₹1,500 a month on the ₹3,000 pension. Family pension goes only to the spouse; once both have died, the corpus goes back to the fund.',
        },
        {
            q: 'What if I miss some monthly payments?',
            a: 'You can regularise the account by paying all outstanding contributions together with any penalty the government fixes.',
        },
        {
            q: 'How is PM-SYM different from Atal Pension Yojana?',
            a: 'PM-SYM pays a fixed ₹3,000 with an equal contribution from the Centre and is limited to unorganised workers earning up to ₹15,000 a month. Atal Pension Yojana lets non-taxpayers aged 18–40 pick a pension between ₹1,000 and ₹5,000, with the contribution set by the pension chosen and the age of joining.',
        },
    ],
    related: [
        { href: '/atal-pension', label: 'Atal Pension Yojana', note: 'Choose a ₹1,000–₹5,000 pension instead' },
        { href: '/nps', label: 'NPS calculator', note: 'For workers who outgrow the ₹15,000 income limit' },
        { href: '/schemes/c-pmjjby', label: 'PM Jeevan Jyoti Bima Yojana', note: 'Add ₹2 lakh life cover for ₹436 a year' },
        { href: '/schemes/c-nsap', label: 'PM Samajik Sahayata Yojana', note: 'Old-age pension for BPL households' },
    ],
    appIssues: [
        'App says income "below ₹15,000"; the rule is ₹15,000 a month or less.',
        'App eligibility omits that income-tax payers cannot join.',
        'App says the spouse gets 50% "on death"; family pension applies when the subscriber dies while drawing pension — before 60 the spouse can instead continue contributing or exit with the balance.',
    ],
} satisfies SchemeContent;
