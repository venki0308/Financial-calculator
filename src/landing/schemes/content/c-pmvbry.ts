import type { SchemeContent } from '../types';

export default {
    id: 'c-pmvbry',
    title: 'PM Viksit Bharat Rozgar Yojana: ₹15,000, Benefits, Apply',
    description: 'PM-VBRY: first-time EPFO employees earning up to ₹1 lakh get one month\'s EPF wage (max ₹15,000); employers up to ₹3,000 a month per hire.',
    h1: 'PM Viksit Bharat Rozgar Yojana (PM-VBRY): who gets ₹15,000 and how employers claim',
    answer: [
        'Under PM-VBRY a first-time employee earning up to ₹1 lakh a month in an EPFO-covered job gets a one-time incentive equal to one month\'s EPF wage, capped at ₹15,000, paid in two instalments after 6 and 12 months of service (PIB, 1 August 2026).',
        'Employers get up to ₹3,000 a month for two years for each additional worker kept at least six months (four years in manufacturing). The scheme covers jobs created between 1 August 2025 and 31 July 2027 and has an outlay of ₹99,446 crore; over 72 lakh first-time employees had joined by its first anniversary.',
    ],
    table: {
        caption: 'Employer incentive per additional employee per month (Part B)',
        head: ['EPF wage of the additional employee', 'Incentive to the employer', 'Period'],
        rows: [
            ['Up to ₹10,000', 'Up to ₹1,000 (10% of EPF wage when the wage is below ₹10,000)', 'Two years; third and fourth year too in manufacturing'],
            ['Above ₹10,000 up to ₹20,000', '₹2,000', 'Two years; third and fourth year too in manufacturing'],
            ['Above ₹20,000 up to ₹1,00,000 (gross wage at joining)', '₹3,000', 'Two years; third and fourth year too in manufacturing'],
        ],
        note: 'Employers qualify only for net additional hiring above their baseline: at least 2 more employees if the baseline is under 50, or at least 5 more if it is 50 or above. Payment is made every six months, after six completed months of ECRs.',
    },
    eligibility: [
        'Employee (Part A): a "first timer" joining an establishment covered by the EPF & MP Act, 1952 (including exempted establishments), with gross wages up to ₹1 lakh a month at joining',
        'The employer must file ECRs with contributions for six continuous months for the first instalment, and 12 months (within 18 months of joining) for the second',
        'UAN authenticated through Face Authentication Technology on the UMANG app, and an Aadhaar-linked bank account for DBT',
        'Employer (Part B): an EPFO-registered establishment that adds at least 2 employees over its baseline (baseline under 50) or at least 5 (baseline 50 or more), keeps each for at least six months, and gives PAN and GST details',
    ],
    benefits: [
        'First timers: one month\'s EPF wage, maximum ₹15,000, in two instalments',
        'First instalment up to ₹7,500 (half the average EPF wage of six months) after six months',
        'Second instalment after 12 months and a Financial Literacy Course; it is kept in a savings instrument or deposit account and can be withdrawn later',
        'Employers: ₹1,000 to ₹3,000 a month per additional employee for two years, extended to the third and fourth year for manufacturing',
        'All payments by Direct Benefit Transfer',
    ],
    documents: [
        'UAN activated and authenticated by face authentication on the UMANG app',
        'Aadhaar-seeded bank account in the employee\'s name',
        'For employers: PAN and GST details on the PM-VBRY portal',
    ],
    howToApply: [
        'Employee: there is no separate form. Your employer registers you with EPFO and files monthly ECRs with your contribution.',
        'Activate your UAN and complete face authentication on the UMANG app; the incentive is not paid without it.',
        'Make sure your bank account is linked to Aadhaar so the DBT can reach it.',
        'After 12 months, complete the Financial Literacy Course offered through EPFO to unlock the second instalment.',
        'Employer: log in through the Employer Login on pmvbry.epfindia.gov.in, submit PAN and GST details, and keep filing ECRs so additional hiring above your baseline is counted.',
    ],
    portal: { label: 'PM-VBRY portal (EPFO)', url: 'https://pmvbry.epfindia.gov.in/' },
    sources: [
        { label: 'PIB document, 1 August 2026 — PM-VBRY one year: Part A and Part B, ₹99,446 crore, 72 lakh first-time employees, face authentication on UMANG', url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/aug/doc202681940301.pdf' },
        { label: 'PM-VBRY Guidelines (EPFO) — first-timer definition, instalment formula, employer wage slabs and baseline thresholds', url: 'https://pmvbry.epfindia.gov.in/wp-content/themes/epfo-child/assets/images/PMVBRY-Final.pdf' },
        { label: 'EPFO PM-VBRY scheme page — scheme period 1 Aug 2025 to 31 Jul 2027, Financial Literacy Course, employer PAN/GST', url: 'https://pmvbry.epfindia.gov.in/pmvbry-scheme/' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'How much will a first-time employee get under PM-VBRY?',
            a: 'One month\'s EPF wage, up to ₹15,000. Someone with an EPF wage of ₹12,000 would get ₹6,000 after six months and the remaining ₹6,000 after 12 months; anyone earning ₹15,000 or more gets ₹7,500 twice.',
        },
        {
            q: 'How do I apply online for PM Viksit Bharat Rozgar Yojana as an employee?',
            a: 'You do not fill an application. Once your employer files your EPF contributions, the incentive is processed automatically, provided your UAN is face-authenticated on UMANG and your bank account is seeded with Aadhaar.',
        },
        {
            q: 'Who counts as a "first timer" under PM-VBRY?',
            a: 'A person joining an EPFO-covered establishment, including an exempted one, for the first time, with gross wages up to ₹1 lakh a month at joining. The job must start between 1 August 2025 and 31 July 2027.',
        },
        {
            q: 'Why is the second PM-VBRY instalment not paid in cash?',
            a: 'The guidelines put the second instalment into a savings instrument or deposit account to build savings; the employee can withdraw it later. It is released only after 12 months of ECRs and the Financial Literacy Course.',
        },
        {
            q: 'How much does an employer get for hiring under PM-VBRY?',
            a: 'Up to ₹1,000, ₹2,000 or ₹3,000 a month per additional employee, depending on the employee\'s EPF wage, for two years. Manufacturing employers get it for the third and fourth years as well.',
        },
        {
            q: 'Does a small employer qualify if it hires just one person?',
            a: 'No. An establishment with a baseline of fewer than 50 employees must add at least 2 more; one with 50 or more must add at least 5. Each new hire must stay at least six months.',
        },
    ],
    related: [
        { href: '/epf', label: 'EPF calculator', note: 'See how your EPF balance grows from the first month' },
        { href: '/salary-hike', label: 'Salary hike calculator', note: 'Compare in-hand pay across job offers' },
        { href: '/schemes/c-pmis', label: 'PM Internship Scheme', note: 'Another central scheme for young job-seekers' },
        { href: '/schemes/c-pmjdy', label: 'PM Jan Dhan Yojana', note: 'A zero-balance account for DBT payments' },
    ],
    appIssues: [
        'App says first-timers get the money "in 2 instalments (after 6 and 12 months of continued EPFO employment)" but omits that the second instalment needs a Financial Literacy Course and is kept in a savings instrument.',
        'App lists "First DBT disbursal ~₹2,400 crore to ~15 lakh beneficiaries (Jun 2026)"; PIB (1 Aug 2026) confirms more than 15 lakh beneficiaries paid but no ₹2,400 crore figure or June date was found in an official source.',
        'App does not give the employer wage slabs (₹1,000/₹2,000/₹3,000) or the 2-or-5 additional-employee threshold, and omits the third and fourth year for manufacturing.',
    ],
} satisfies SchemeContent;
