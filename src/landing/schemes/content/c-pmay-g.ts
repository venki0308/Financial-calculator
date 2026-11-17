import type { SchemeContent } from '../types';

export default {
    id: 'c-pmay-g',
    title: 'PM Awas Yojana Gramin 2026: Amount, List, Status Check',
    description: 'PMAY-G pays ₹1.20 lakh (plains) or ₹1.30 lakh (hill and NE states) to build a pucca house, plus ₹12,000 for a toilet. Who qualifies, Awaas+ survey, status.',
    h1: 'PM Awas Yojana Gramin (PMAY-G): assistance amount, eligibility and status check',
    answer: [
        'PMAY-G gives ₹1.20 lakh per house in plain areas and ₹1.30 lakh in the North-Eastern states, Himachal Pradesh, Uttarakhand, Jammu & Kashmir and Ladakh, plus ₹12,000 for a toilet and wages for unskilled work on the house (Ministry of Rural Development reply in the Lok Sabha, August 2026).',
        'The Cabinet approved 2 crore more rural houses for 2024-25 to 2028-29 at these amounts, and new households were identified through the Awaas+ 2024 survey using an income cut-off of ₹15,000 a month.',
    ],
    table: {
        caption: 'What a PMAY-G beneficiary receives',
        head: ['Item', 'Plain areas', 'NE states, Himachal Pradesh, Uttarakhand, J&K, Ladakh'],
        rows: [
            ['Unit assistance for building the house', '₹1,20,000', '₹1,30,000'],
            ['Toilet (through SBM-G, MGNREGS / VB-G RAM G or other funds)', '₹12,000', '₹12,000'],
            ['Unskilled labour on your own house', 'Prescribed person-days of wages at prevailing rates', 'Prescribed person-days of wages at prevailing rates'],
            ['Minimum house size', '25 sq m with a hygienic cooking space', '25 sq m with a hygienic cooking space'],
        ],
        note: 'Unit assistance is shared 60:40 between Centre and state in plain areas and 90:10 in the NE states, Himachal Pradesh, Uttarakhand and J&K; some states add a top-up of their own.',
    },
    eligibility: [
        'Houseless households, or households in kutcha houses (kutcha walls and roof, zero to two rooms)',
        'Identified through SECC 2011, Awaas+ 2018 or the Awaas+ 2024 survey, and verified by the Gram Sabha',
        'Included automatically: destitute households living on alms, manual scavengers, primitive tribal groups, legally released bonded labourers',
        'Priority within the list: houseless families and those with the fewest rooms, then deprivation scores (no adult 16–59, female-headed, no literate adult over 25, disabled member, landless manual labour)',
    ],
    notEligible: [
        'Households with a pucca roof and/or pucca walls, or more than two rooms',
        'Any household owning a motorised three- or four-wheeler, or mechanised three- or four-wheel farm equipment',
        'A Kisan Credit Card with a limit of ₹50,000 or more',
        'A government employee in the family, or a non-agricultural enterprise registered with the government',
        'Any member earning more than ₹15,000 a month, or paying income tax or professional tax',
        'Owning 2.5 acres or more of irrigated land, or 5 acres or more of unirrigated land',
    ],
    howToApply: [
        'There is no open online application: households enter the scheme through the Awaas+ survey, done by surveyors with Aadhaar face authentication; the 2024 app also allowed a self-survey that a surveyor then corroborates.',
        'The Gram Sabha verifies the list, which becomes the ranked permanent wait list for the panchayat.',
        'When your turn comes, the block registers you on AwaasSoft and issues a sanction order; instalments are paid by DBT to your bank account as geo-tagged photos confirm each construction stage.',
        'If your household was missed or wrongly excluded, raise it with the Gram Panchayat or the Block Development Office.',
    ],
    statusSteps: [
        'Find your registration number on the sanction order, the SMS you received or the Gram Panchayat record.',
        'On pmayg.dord.gov.in, open Stakeholders → IAY/PMAYG Beneficiary.',
        'Enter the registration number and captcha to see the sanction, instalments released and construction stage.',
        'Without a number, search the panchayat-wise lists and reports on the same portal by state, district, block and gram panchayat to find your name and registration number first.',
    ],
    portal: { label: 'PMAY-Gramin portal (Ministry of Rural Development)', url: 'https://pmayg.dord.gov.in/netiayHome/Home.aspx' },
    sources: [
        { label: 'Lok Sabha Unstarred Q. 2546 (2026) — unit assistance and cost sharing', url: 'https://sansad.in/getFile/lsapps/loksabhaquestions/annex/188/AU2546_iSdRX6.pdf' },
        { label: 'Lok Sabha Starred Q. 339, 11 August 2026 — toilet support, wages, Awaas+ 2024 survey', url: 'https://sansad.in/getFile/lsapps/loksabhaquestions/annex/188/AS339_cCbJAO.pdf' },
        { label: 'PIB, 3 December 2024 — revised exclusion criteria', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2080091' },
        { label: 'PIB, 20 November 2024 — 2 crore more houses, house size, women ownership', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2075171' },
        { label: 'PIB, 19 November 2024 — eligibility, inclusion and priority rules', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2074713' },
    ],
    verified: '2026-11-17',
    faqs: [
        {
            q: 'How much money does PM Awas Yojana Gramin give in 2026?',
            a: '₹1.20 lakh in plain areas and ₹1.30 lakh in the North-Eastern and hill states and the UTs of J&K and Ladakh, plus ₹12,000 for a toilet and wage days for unskilled work. The Centre kept these unit amounts for the 2024-29 phase; some states pay a top-up.',
        },
        {
            q: 'Who is left out of PMAY-G?',
            a: 'A household is excluded if it already has a pucca house or more than two rooms, or meets any one of 10 conditions — for example a member earning over ₹15,000 a month, paying income tax, a KCC limit of ₹50,000 or more, or owning 2.5 acres of irrigated land.',
        },
        {
            q: 'Will owning a motorcycle or fridge disqualify me now?',
            a: 'No. The 2024 revision removed motorised two-wheelers, mechanised fishing boats, landline phones and refrigerators from the exclusion list, and raised the income limit from ₹10,000 to ₹15,000 a month.',
        },
        {
            q: 'Can I apply for PM Awas Yojana Gramin online?',
            a: 'Not through an open form. Selection comes from the Awaas+ survey and Gram Sabha verification; the Awaas+ 2024 app allowed self-survey, but each case had to be corroborated by a surveyor.',
        },
        {
            q: 'Is the Awaas+ 2024 survey still open?',
            a: 'The survey began on 27 December 2024 and, the ministry told the Lok Sabha in August 2026, has been completed in every state except Assam and West Bengal. If you were missed, take it up with your Gram Panchayat.',
        },
        {
            q: 'In whose name is the PMAY-G house sanctioned?',
            a: 'The scheme favours women: 74% of sanctioned houses are owned by women alone or jointly, and the ministry aims for full women ownership (PIB, November 2024).',
        },
        {
            q: 'What is the difference between PMAY-G and PMAY-U?',
            a: 'PMAY-G is the rural scheme of the Ministry of Rural Development, with beneficiaries chosen from surveys. Families in towns and cities apply separately under PMAY-Urban 2.0, which has its own income bands and portal.',
        },
    ],
    related: [
        { href: '/schemes/c-pmay-u', label: 'PM Awas Yojana Urban 2.0', note: 'The scheme for towns and cities' },
        { href: '/schemes/c-mgnrega', label: 'VB-G RAM G (ex-MGNREGA)', note: 'Source of the wage days for building your house' },
        { href: '/schemes/c-pmuy', label: 'PM Ujjwala Yojana', note: 'LPG connection for PMAY-G households' },
        { href: '/schemes/c-jjm', label: 'Jal Jeevan Mission', note: 'Tap water connection for rural homes' },
    ],
    appIssues: [
        'App says beneficiaries are "SECC 2011 identified households" only; the current phase also uses Awaas+ 2018 and the Awaas+ 2024 survey with revised exclusion criteria (income limit ₹15,000 a month).',
        'App labels the higher amount only as "hilly"; it applies to the North-Eastern states, Himachal Pradesh, Uttarakhand, J&K and Ladakh.',
        'App says the ₹12,000 toilet money and wages come from MGNREGA; the ministry now names SBM-G and MGNREGS / VB-G RAM G convergence.',
    ],
} satisfies SchemeContent;
