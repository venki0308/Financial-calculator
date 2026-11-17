import type { SchemeContent } from '../types';

export default {
    id: 'c-udyam',
    title: 'MSME Udyam Registration 2026: Free, Eligibility, Limits',
    description: 'Udyam (MSME) registration is free and paperless on udyamregistration.gov.in. New micro, small and medium limits from 1 April 2025, documents, 45-day rule.',
    h1: 'MSME Udyam Registration: who is eligible, the new limits and how to register free',
    answer: [
        'Udyam Registration is the Ministry of MSME\'s free, paperless registration for micro, small and medium enterprises, done with Aadhaar and PAN on udyamregistration.gov.in; the portal says no private agency, website or person is authorised to register you.',
        'From 1 April 2025 a business is micro if investment in plant, machinery or equipment is up to ₹2.5 crore and turnover up to ₹10 crore, small up to ₹25 crore and ₹100 crore, and medium up to ₹125 crore and ₹500 crore (notification S.O. 1364(E), 21 March 2025).',
    ],
    table: {
        caption: 'MSME classification before and after 1 April 2025 (₹ crore, "not exceeding")',
        head: ['Category', 'Investment limit: 2020 to 31 Mar 2025', 'Investment limit: from 1 Apr 2025', 'Turnover limit: 2020 to 31 Mar 2025', 'Turnover limit: from 1 Apr 2025'],
        rows: [
            ['Micro', '1', '2.5', '5', '10'],
            ['Small', '10', '25', '50', '100'],
            ['Medium', '50', '125', '250', '500'],
        ],
        note: 'Both tests apply together: a unit with ₹2 crore of machinery but ₹12 crore of turnover is small, not micro.',
    },
    eligibility: [
        'Any enterprise whose investment in plant, machinery or equipment is up to ₹125 crore and turnover up to ₹500 crore',
        'It is classed as micro, small or medium on both tests together, under the limits in force from 1 April 2025',
        'Informal micro enterprises that do not have PAN or GST can be registered on the Udyam Assist Platform (UAP) instead',
    ],
    benefits: [
        'Official MSME status with an Udyam Registration Number and an e-certificate you can print or verify on the portal',
        'Required for MSME-linked credit schemes such as the Mutual Credit Guarantee Scheme, which asks for a valid Udyam Registration Number',
        'Micro and small suppliers can claim payment within 45 days of acceptance; a late buyer owes compound interest at three times the RBI bank rate, and disputes go to the MSE Facilitation Council (MSME Samadhaan)',
        'Units can onboard on TReDS platforms to discount their invoices',
    ],
    documents: [
        'Aadhaar of the proprietor, managing partner, karta or authorised signatory (OTP verification)',
        'PAN of the enterprise (verification is part of the form)',
        'GSTIN, where the business is required to have GST registration',
        'Basic business details asked in the form (the NIC Code page on the portal helps you pick your activity code)',
    ],
    howToApply: [
        'Open udyamregistration.gov.in — the only government portal for MSME registration — and choose "For New Entrepreneurs who are not Registered yet as MSME".',
        'Enter the Aadhaar number and name of the owner or authorised signatory and verify with the OTP.',
        'Verify the PAN of the enterprise in the next step of the form.',
        'Fill in the basic details of the business, check them and submit the form.',
        'Download the Udyam certificate from "Print Udyam Certificate"; an old Udyog Aadhaar (UAM) holder uses "UAM Migration to Udyam" instead.',
    ],
    portal: { label: 'Udyam Registration portal (Ministry of MSME)', url: 'https://udyamregistration.gov.in/' },
    helpline: 'Grievances: call or WhatsApp +91 8308809334 (Mon–Fri, 10 am–6 pm), email champions@gov.in, as listed on the portal',
    sources: [
        { label: 'Udyam Registration portal — free and paperless, classification limits pre and post 1 April 2025, UAP, contact', url: 'https://udyamregistration.gov.in/' },
        { label: 'Ministry of MSME notification S.O. 1364(E), 21 March 2025 (Gazette) — revised investment and turnover limits from 1 April 2025', url: 'https://udyamregistration.gov.in/docs/261838_220191.pdf' },
        { label: 'Udyam portal — Important to Know (only the government portal can register MSMEs)', url: 'https://udyamregistration.gov.in/Important.aspx' },
        { label: 'MSME Samadhaan — delayed payment: 45 days, compound interest at three times the bank rate (MSMED Act, Sections 15–16)', url: 'https://samadhaan.msme.gov.in/MyMsme/MSEFC/MSEFC_Welcome.aspx' },
        { label: 'PIB, 29 January 2025 — MCGS-MSME requires a valid Udyam Registration Number', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2097455' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'Is MSME Udyam registration free?',
            a: 'Yes. Registration on udyamregistration.gov.in costs nothing and needs no paper documents. The portal warns about fake sites and says no private agency or person is authorised to register MSMEs.',
        },
        {
            q: 'What are the MSME limits in 2026?',
            a: 'Micro: investment up to ₹2.5 crore and turnover up to ₹10 crore. Small: up to ₹25 crore and ₹100 crore. Medium: up to ₹125 crore and ₹500 crore. These apply from 1 April 2025.',
        },
        {
            q: 'What documents do I need for Udyam registration?',
            a: 'The Aadhaar of the owner or authorised signatory and the PAN of the business, both verified online in the form; the portal describes registration as paperless, so nothing is uploaded.',
        },
        {
            q: 'I have an old Udyog Aadhaar (UAM). Do I need Udyam registration?',
            a: 'Yes, move it across with "UAM Migration to Udyam" on udyamregistration.gov.in, or "Assisted UAM Migration" if your UAM was filed through assisted filing.',
        },
        {
            q: 'How do I download my Udyam certificate again?',
            a: 'Use "Print Udyam Certificate" on udyamregistration.gov.in; "Verify Udyam Registration" on the same menu lets a buyer or bank check a number. If you have forgotten the number, use "Forgot Udyam/UAM Number" on the same portal.',
        },
        {
            q: 'What can I do if a buyer delays payment to my MSME?',
            a: 'If you are a micro or small supplier, the buyer must pay within 45 days of accepting the goods or services. After that compound interest at three times the RBI bank rate is due, and you can file a case with the MSE Facilitation Council through MSME Samadhaan.',
        },
    ],
    related: [
        { href: '/schemes/c-cgtmse', label: 'CGTMSE', note: 'Collateral-free loans for micro and small units' },
        { href: '/schemes/c-mcgs-msme', label: 'MCGS-MSME', note: 'Guarantee for machinery loans up to ₹100 crore' },
        { href: '/schemes/c-mudra', label: 'PM MUDRA Yojana', note: 'Business loans up to ₹20 lakh' },
        { href: '/schemes/c-startup-india', label: 'Startup India', note: 'DPIIT recognition and tax benefits for startups' },
        { href: '/gst', label: 'GST calculator', note: 'Work out GST on your invoices' },
        { href: '/business-tracker', label: 'Business tracker', note: 'Track turnover against the MSME limits' },
    ],
    appIssues: [
        'App eligibility omits that informal micro enterprises without PAN/GST register on the Udyam Assist Platform.',
        'App says Udyam is a "mandatory prerequisite for CGTMSE, PMEGP, CLCSS, NSIC and RAMP-linked schemes"; this was not confirmed in an official source checked today (the CGTMSE scheme document does not state Udyam as a condition), so it is left out here.',
        'App says the MSMED Act 45-day rule protects all MSMEs; it applies to micro and small suppliers.',
    ],
} satisfies SchemeContent;
