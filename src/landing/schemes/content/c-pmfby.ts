import type { SchemeContent } from '../types';

export default {
    id: 'c-pmfby',
    title: 'PM Fasal Bima Yojana 2026: Premium, Last Date, Status',
    description: 'PMFBY crop insurance: farmers pay at most 2% (kharif), 1.5% (rabi) or 5% (commercial crops). Rabi 2026-27 cut-off, claims, 14447 helpline, status check.',
    h1: 'PM Fasal Bima Yojana (PMFBY): premium rates, Rabi 2026-27 enrolment and claim status',
    answer: [
        'Under PMFBY a farmer pays at most 2% of the sum insured for kharif food grain and oilseed crops, 1.5% for rabi ones and 5% for commercial or horticultural crops; the Centre and the state share the rest 50:50, or 90:10 in North-Eastern and Himalayan states (PIB, 29 August 2026).',
        'The Union Budget 2026-27 allocated ₹12,200 crore to the scheme, and the enrolment cut-off for the rabi season is generally 31 December, though each state notifies the date for its crops and districts.',
        'From Kharif 2026, crop damage by wild animals (where the state has notified it) must be reported within 72 hours on the Crop Insurance app with geotagged photos.',
    ],
    table: {
        caption: 'Most a farmer pays as premium under PMFBY',
        head: ['Crop and season', 'Farmer\'s share (maximum, % of sum insured)', 'Who pays the balance premium'],
        rows: [
            ['Kharif food grains and oilseeds', '2%', 'Centre and state, 50:50 (90:10 in North-Eastern and Himalayan states/UTs)'],
            ['Rabi food grains and oilseeds', '1.5%', 'Centre and state, 50:50 (90:10 in North-Eastern and Himalayan states/UTs)'],
            ['Annual commercial and horticultural crops', '5%', 'Centre and state, 50:50 (90:10 in North-Eastern and Himalayan states/UTs)'],
        ],
        note: 'The sum insured per hectare is fixed by the state for each crop and district, so the rupee premium differs by place. In a PIB example, an Assam farmer who paid ₹100 received ₹50,600 after heavy rain damaged the crop.',
    },
    eligibility: [
        'Farmers growing notified crops in notified areas during the notified season — owners, tenant farmers and sharecroppers',
        'Insurable interest shown through land records, a tenancy agreement or a sowing certificate, as the state requires',
        'Loanee farmers (active crop loan or KCC) have the premium deducted by their bank; non-loanee farmers join voluntarily',
        'Enrolment has been voluntary for all farmers since the 2020 kharif season',
        'Application and premium must reach the insurer before the state\'s cut-off date',
    ],
    benefits: [
        'Yield loss in the notified area from drought, dry spell, flood, inundation, cyclone, hailstorm, lightning, pests and diseases',
        'Prevented sowing because of adverse weather: up to 25% of the sum insured',
        'Post-harvest loss of crops left in cut-and-spread condition, up to 14 days after harvest, from cyclone or unseasonal rain',
        'Localised calamity at farm level: hailstorm, landslide, inundation, cloudburst, natural fire',
        'From Kharif 2026, where the state notifies them: wild animal attack (fifth add-on cover) and paddy inundation',
        'Claims calculated on the National Crop Insurance Portal (DigiClaim) and paid directly into the bank account',
    ],
    howToApply: [
        'Check your state\'s PMFBY notification: your crop and your village or insurance unit must be notified for the season.',
        'Loanee farmer: the bank enrols you and deducts the premium from the crop loan or KCC unless you opt out before the cut-off.',
        'Non-loanee farmer: apply on pmfby.gov.in, at a bank branch, at a Common Service Centre, or through an insurance intermediary using the AIDE app.',
        'Provide land record or tenancy proof, sowing details, Aadhaar and bank details, and pay your share of the premium.',
        'Keep the receipt or application number; you will need it to track the policy.',
    ],
    statusSteps: [
        'Keep the receipt or application number issued when your premium was paid.',
        'Open pmfby.gov.in and use the application status option with that number.',
        'If the insurer sends an application back for documents (it can reject incomplete ones within 60 days of the cut-off), upload them through the bank, CSC or intermediary that enrolled you.',
        'For a rejected application or an unpaid claim, call the Krishi Rakshak helpline 14447 or approach the District Level Grievance Redressal Committee.',
    ],
    portal: { label: 'National Crop Insurance Portal', url: 'https://pmfby.gov.in' },
    helpline: '14447 — Krishi Rakshak Portal & Helpline (toll-free, for grievances and crop-loss intimation)',
    sources: [
        { label: 'PIB, 29 August 2026 — PMFBY: affordable crop insurance for every farmer', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2304549' },
        { label: 'PIB, 18 November 2025 — wild animal attack and paddy inundation covers from Kharif 2026', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2191224' },
        { label: 'PIB, 2 December 2025 — application checks, 60-day window, cut-off dates', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2197713' },
        { label: 'MyGov — PMFBY campaign (voluntary enrolment since Kharif 2020, crop calendar)', url: 'https://www.mygov.in/campaigns/pmfby' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'What is the PMFBY premium for wheat in Rabi 2026-27?',
            a: 'At most 1.5% of the sum insured, because wheat is a rabi food grain. The sum insured per hectare is notified by your state for each district, so the rupee amount varies from place to place.',
        },
        {
            q: 'What is the last date for PMFBY Rabi 2026-27?',
            a: 'It is generally 31 December for the rabi season, as the Agriculture Ministry told Parliament on 2 December 2025, but each state fixes the cut-off for every crop and district and some close earlier. Check your state notification or bank branch.',
        },
        {
            q: 'Is crop insurance compulsory for Kisan Credit Card holders?',
            a: 'No. PMFBY has been voluntary for all farmers since Kharif 2020. A loanee farmer\'s bank still deducts the premium automatically unless the farmer opts out before the cut-off.',
        },
        {
            q: 'Are crop losses from wild animals covered?',
            a: 'Yes, from Kharif 2026, as the fifth add-on cover under localised risks — but only in states that notify it and only for the animals and districts they list. The farmer must report the loss within 72 hours on the Crop Insurance app with geotagged photographs.',
        },
        {
            q: 'How are PMFBY claims paid?',
            a: 'Claims are calculated on the National Crop Insurance Portal through the DigiClaim module and paid through PFMS straight into the farmer\'s bank account. More than ₹55,000 crore has been paid this way since Kharif 2022 (PIB).',
        },
        {
            q: 'Can tenant farmers and sharecroppers buy PMFBY cover?',
            a: 'Yes, with a tenancy agreement or sowing certificate in the format their state asks for. Over 1.44 crore tenant and sharecropper farmers have enrolled since 2018 (PIB, August 2026).',
        },
        {
            q: 'What does PMFBY not cover?',
            a: 'Losses in non-notified areas, before sowing or after the crop is removed from the field (except the 14-day cut-and-spread window), and losses from war, nuclear risk, riots, theft, negligence or other preventable causes.',
        },
    ],
    related: [
        { href: '/schemes/c-kcc', label: 'Kisan Credit Card', note: 'Loanee farmers are enrolled in PMFBY through their KCC' },
        { href: '/schemes/c-pmkisan', label: 'PM Kisan Samman Nidhi', note: '₹6,000 a year income support' },
        { href: '/schemes/c-digital-agri', label: 'Digital Agriculture Mission', note: 'Farmer ID now used for PMFBY enrolment' },
        { href: '/schemes/c-pmksy', label: 'PM Krishi Sinchayee Yojana', note: 'Drip and sprinkler subsidy to cut drought risk' },
    ],
    appIssues: [
        'App lists the 2% (kharif) and 1.5% (rabi) premiums but omits the 5% maximum for annual commercial and horticultural crops and the 50:50 / 90:10 subsidy sharing.',
        'App says "Post-harvest losses covered" without the limit: only crops left in cut-and-spread condition, up to 14 days after harvest, against cyclone or unseasonal rain.',
        'App eligibility does not mention tenant farmers and sharecroppers, who are covered, or that enrolment is voluntary for loanee farmers since Kharif 2020.',
    ],
} satisfies SchemeContent;
