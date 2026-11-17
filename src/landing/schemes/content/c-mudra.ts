import type { SchemeContent } from '../types';

export default {
    id: 'c-mudra',
    title: 'PM Mudra Yojana 2026: Shishu, Kishor, Tarun Loan Limits',
    description: 'PM MUDRA Yojana: collateral-free business loans up to ₹20 lakh — Shishu ₹50,000, Kishor ₹5 lakh, Tarun ₹10 lakh, Tarun Plus ₹20 lakh. How to apply.',
    h1: 'PM MUDRA Yojana: loan limits by category, eligibility and how to apply',
    answer: [
        'PM MUDRA Yojana lets non-corporate, non-farm micro and small businesses borrow up to ₹20 lakh without collateral from banks, NBFCs and MFIs, in four categories: Shishu up to ₹50,000, Kishor up to ₹5 lakh, Tarun up to ₹10 lakh, and Tarun Plus up to ₹20 lakh for those who have repaid an earlier Tarun loan (mudra.org.in; PIB, 8 April 2026).',
        'As of 27 March 2026 the scheme had disbursed ₹40.07 lakh crore through more than 57 crore loan accounts, and women held 59.81% of the accounts (PIB).',
    ],
    table: {
        caption: 'MUDRA loan categories and limits',
        head: ['Category', 'Loan amount', 'Typical borrower'],
        rows: [
            ['Shishu', 'Up to ₹50,000', 'New or very small units: small shops, repair services, vendors; no credit history needed'],
            ['Kishor', 'Above ₹50,000 up to ₹5 lakh', 'New and existing units that need working capital or modest expansion'],
            ['Tarun', 'Above ₹5 lakh up to ₹10 lakh', 'Growing enterprises'],
            ['Tarun Plus', 'Above ₹10 lakh up to ₹20 lakh', 'Only for borrowers who have availed and repaid a previous Tarun loan (started 2024)'],
        ],
        note: 'There is no interest subsidy under PMMY; each lender sets its rate under RBI guidelines. Lenders\' risk on these loans is covered by the Credit Guarantee Fund for Micro Units (CGFMU) run by NCGTC.',
    },
    eligibility: [
        'Any Indian citizen with a business plan for a non-farm income-generating activity in manufacturing, processing, trading or services, needing credit up to ₹20 lakh',
        'Non-corporate small businesses: proprietorships and partnerships such as small manufacturing units, shopkeepers, fruit and vegetable vendors, truck operators, food-service units, repair shops, artisans and food processors',
        'Agri-allied activities such as pisciculture, bee keeping, poultry, livestock rearing, dairy, fishery, agri-clinics and food and agro-processing',
        'Tarun Plus (₹10–20 lakh) only for borrowers who have availed and successfully repaid a Tarun loan',
        'The lender\'s usual terms and conditions apply',
    ],
    benefits: [
        'Collateral-free loans up to ₹20 lakh',
        'Term loans for equipment and machinery, and working capital through a MUDRA Card (a RuPay debit card on a cash credit/overdraft account)',
        'Loans for commercial transport vehicles such as auto rickshaws, e-rickshaws and small goods carriers',
        'Available from commercial banks, RRBs, small finance banks, NBFCs and MFIs',
    ],
    howToApply: [
        'Prepare a simple business plan: what you will make, sell or offer, the cost, and how much you need to borrow.',
        'Approach any commercial bank, regional rural bank, small finance bank, NBFC or MFI branch, or apply online on the Udyamimitra portal (www.udyamimitra.in) or the JanSamarth portal.',
        'Choose the category that matches your need (Shishu, Kishor, Tarun or Tarun Plus) and submit the lender\'s form with KYC and business documents.',
        'The lender appraises the proposal and sanctions the loan; working capital can be given through a MUDRA Card.',
    ],
    portal: { label: 'MUDRA (Micro Units Development & Refinance Agency)', url: 'https://www.mudra.org.in/' },
    sources: [
        { label: 'MUDRA official site — four categories, Tarun Plus up to ₹20 lakh, lenders, Udyamimitra', url: 'https://www.mudra.org.in/' },
        { label: 'MUDRA FAQs — eligibility, no subsidy, interest per RBI guidelines, MUDRA Card', url: 'https://www.mudra.org.in/Faq' },
        { label: 'PIB document, 8 April 2026 — 11 years of PMMY: ₹40.07 lakh crore, 57 crore+ accounts, eligible activities, CGFMU, JanSamarth', url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/apr/doc202648842601.pdf' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'What is the maximum MUDRA loan amount?',
            a: '₹20 lakh, under the Tarun Plus category, but only for borrowers who have taken and repaid a Tarun loan. For everyone else the ceiling is ₹10 lakh (Tarun).',
        },
        {
            q: 'What is the interest rate on a MUDRA loan?',
            a: 'There is no fixed scheme rate: each bank, NBFC or MFI sets it under RBI guidelines. MUDRA itself only refinances lenders, and there is no interest subsidy under PMMY.',
        },
        {
            q: 'Do I need collateral or a guarantor for a MUDRA loan?',
            a: 'No collateral is needed for MUDRA loans up to ₹20 lakh. The lenders\' risk is covered by the Credit Guarantee Fund for Micro Units run by NCGTC.',
        },
        {
            q: 'Can a new business with no credit history get a MUDRA loan?',
            a: 'Yes. The Shishu category (up to ₹50,000) is meant for very small or early-stage businesses, including entrepreneurs with no credit history or collateral.',
        },
        {
            q: 'Is there a MUDRA loan form to download?',
            a: 'Each lender uses its own form, so ask the branch. Online, MUDRA points borrowers to the Udyamimitra portal, and PIB lists MUDRA loans among the schemes on the JanSamarth portal.',
        },
        {
            q: 'Can farmers get a MUDRA loan?',
            a: 'Not for crop farming, but yes for agri-allied income activities such as dairy, poultry, fishery, bee keeping, agri-clinics or food processing. Crop credit comes through the Kisan Credit Card instead.',
        },
        {
            q: 'Does a MUDRA loan come with a government subsidy?',
            a: 'No. MUDRA\'s FAQ says there is no subsidy under PMMY, though a loan linked to another government scheme that gives a capital subsidy can still get that subsidy.',
        },
    ],
    related: [
        { href: '/emi', label: 'EMI calculator', note: 'Check the monthly instalment on a ₹5 lakh or ₹10 lakh loan' },
        { href: '/schemes/c-udyam', label: 'Udyam Registration', note: 'Free MSME registration for your business' },
        { href: '/schemes/c-cgtmse', label: 'CGTMSE', note: 'Collateral-free guarantee for loans up to ₹10 crore' },
        { href: '/schemes/c-pmsvanidhi', label: 'PM SVANidhi', note: 'Small working-capital loans for street vendors' },
        { href: '/schemes/c-pmegp', label: 'PMEGP', note: 'Another central scheme for setting up new micro units' },
        { href: '/business-tracker', label: 'Business tracker', note: 'Keep income and expenses to show your lender' },
    ],
    appIssues: [
        'App eligibility says "No CIBIL defaulter status"; MUDRA\'s FAQ says only that the lender\'s usual terms apply, so that condition is not shown as a scheme rule here.',
        'App omits agri-allied activities (dairy, poultry, fishery, bee keeping) that MUDRA covers, and that there is no subsidy under PMMY.',
    ],
} satisfies SchemeContent;
