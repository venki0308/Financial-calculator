export interface Scheme {
    id: string;
    name: string;
    governmentLevel: 'central' | 'state';
    state?: string;
    category: string;
    tags: string[];
    popular: boolean;
    interestRate?: string;
    benefitAmount?: string;
    tenure?: string;
    minAmount?: string;
    maxAmount?: string;
    description: string;
    ministry: string;
    taxBenefit?: string;
    officialWebsite: string;
    eligibility: string[];
    benefits: string[];
    documents: string[];
    howToApply: string[];
    lastVerified?: string;
    launchYear?: number;
    isActive?: boolean;
}

export const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];
export const unionTerritories = [
    'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
    'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export const schemeCategories = [
    { name: 'Women', color: '#EC4899', count: 6 },
    { name: 'Education', color: '#3B82F6', count: 5 },
    { name: 'Farmers', color: '#10B981', count: 7 },
    { name: 'MSME', color: '#F59E0B', count: 7 },
    { name: 'Senior Citizens', color: '#8B5CF6', count: 4 },
    { name: 'Insurance', color: '#EF4444', count: 3 },
    { name: 'Housing', color: '#F97316', count: 2 },
    { name: 'Banking', color: '#3B82F6', count: 3 },
    { name: 'Pension', color: '#6366F1', count: 3 },
    { name: 'Health', color: '#EF4444', count: 5 },
    { name: 'Employment', color: '#14B8A6', count: 5 },
    { name: 'Social Welfare', color: '#06B6D4', count: 4 },
    { name: 'Digital', color: '#818CF8', count: 2 },
    { name: 'Energy', color: '#FBBF24', count: 2 },
    { name: 'Youth', color: '#34D399', count: 3 },
];

const s = (id: string, name: string, gl: 'central' | 'state', cat: string, desc: string, ministry: string, opts: Partial<Scheme> = {}): Scheme => ({
    id, name, governmentLevel: gl, category: cat, tags: [], popular: false, description: desc, ministry,
    officialWebsite: 'https://www.india.gov.in', eligibility: ['Indian citizen'],
    benefits: ['Financial assistance'], documents: ['Aadhaar Card', 'Bank passbook'],
    howToApply: ['Visit official portal', 'Submit application', 'Upload documents'],
    lastVerified: '2026-03-05', launchYear: 2024, isActive: true,
    ...opts,
});

export const schemes: Scheme[] = [

    // ── WOMEN & CHILDREN ─────────────────────────────────────────────────────
    s('c-ld', 'Lakhpati Didi Scheme', 'central', 'Women',
        'Empowering 3 crore rural women to become self-reliant and earn at least ₹1 lakh per annum through SHGs.',
        'Ministry of Rural Development', {
        tags: ['Popular', 'Updated 2025'], popular: true, benefitAmount: '₹1 Lakh+ income/year',
        eligibility: ['Rural women', 'Members of Self Help Groups (SHGs)'],
        benefits: ['Interest-free loans up to ₹5 lakh', 'Skill training in agri/tech', 'Market linkage support', 'Financial literacy programs'],
        lastVerified: '2026-03-05', launchYear: 2023
    }),
    s('c-ssy', 'Sukanya Samriddhi Yojana', 'central', 'Women',
        'High-interest savings scheme for girl child under Beti Bachao Beti Padhao, with full EEE tax exemption.',
        'Ministry of Finance', {
        officialWebsite: 'https://www.nsiindia.gov.in/', popular: true, tags: ['Popular'],
        benefitAmount: '₹250 – ₹1.5 Lakh/year', interestRate: '8.2% p.a.', tenure: '21 years',
        minAmount: '₹250', maxAmount: '₹1,50,000/yr', taxBenefit: 'EEE – Exempt-Exempt-Exempt under 80C',
        eligibility: ['Girl child below 10 years', 'Max 2 accounts per family', 'Indian resident'],
        benefits: ['8.2% interest p.a. (highest govt scheme)', 'Full tax exemption EEE', 'Partial withdrawal at 18 for education', 'Full maturity at 21'],
        documents: ['Girl child birth certificate', "Parents' Aadhaar", 'Address proof', 'Passport photos'],
        howToApply: ['Visit any post office or authorised bank', 'Fill SSY form', 'Submit documents + initial deposit ₹250+'],
        lastVerified: '2026-03-05', launchYear: 2015
    }),
    s('c-bbbp', 'Beti Bachao Beti Padhao', 'central', 'Women',
        'National campaign addressing declining child sex ratio and promoting girl child welfare, education, and empowerment.',
        'Ministry of WCD', {
        officialWebsite: 'https://wcd.nic.in/', popular: true, tags: ['Popular'],
        eligibility: ['Families with girl children', 'Focus on districts with low sex ratio'],
        benefits: ['School enrollment support for girls', 'Conditional cash transfers', 'Awareness campaigns', 'Convergence with SSY & Ujjwala'],
        lastVerified: '2026-03-05', launchYear: 2015
    }),
    s('c-saksham', 'Saksham Anganwadi & Poshan 2.0', 'central', 'Women',
        'Nutritional support and early childhood development for 8 crore children, lactating mothers, and adolescent girls.',
        'Ministry of WCD', {
        officialWebsite: 'https://www.india.gov.in/', tags: ['Updated 2025'], popular: true,
        eligibility: ['Children 0-6 years', 'Pregnant/lactating women', 'Adolescent girls 14-18 years'],
        benefits: ['Supplementary nutrition', 'Growth monitoring', 'Pre-school education', 'Health checkups', 'Immunization support'],
        lastVerified: '2026-03-05', launchYear: 2025
    }),
    s('c-ujjwala', 'PM Ujjwala Yojana 2.0', 'central', 'Women',
        'Free LPG connections to BPL/SC/ST women and migrant workers with first refill and hotplate free.',
        'Ministry of Petroleum', {
        officialWebsite: 'https://www.pmuy.gov.in/', popular: true, tags: ['Extended 2026'],
        eligibility: ['Women from BPL/SC/ST families', 'No existing LPG connection', 'Migrant workers'],
        benefits: ['Free LPG connection', 'First refill free', 'Hotplate/stove free', 'Refill subsidy via DBT'],
        lastVerified: '2026-03-05', launchYear: 2016
    }),
    s('c-sv', 'PM SVANidhi 2.0', 'central', 'Women',
        'Micro-credit for street vendors from ₹10,000 to ₹50,000 with 7% interest subsidy and digital cashback.',
        'MoHUA', {
        officialWebsite: 'https://pmsvanidhi.mohua.gov.in/', tags: ['Extended 2026'], benefitAmount: '₹10,000–₹50,000',
        eligibility: ['Street vendors with Certificate of Vending', 'Urban/rural street vendors'],
        benefits: ['Loan 1: ₹10,000', 'Loan 2: ₹20,000', 'Loan 3: ₹50,000', '7% interest subsidy', 'Digital payment cashback'],
        lastVerified: '2026-03-05', launchYear: 2020
    }),

    // ── FARMERS ───────────────────────────────────────────────────────────────
    s('c-pmkisan', 'PM-KISAN', 'central', 'Farmers',
        'Direct income support of ₹6,000/year in 3 equal installments to all farmer families via direct bank transfer.',
        'Ministry of Agriculture', {
        officialWebsite: 'https://pmkisan.gov.in/', popular: true, tags: ['Popular'], benefitAmount: '₹6,000/year',
        eligibility: ['All landholding farmer families', 'Excludes income-tax payers and govt employees'],
        benefits: ['₹2,000 every 4 months via DBT', '3 installments/year', 'No middlemen – 100% direct transfer'],
        lastVerified: '2026-03-05', launchYear: 2019
    }),
    s('c-pmfby', 'PM Fasal Bima Yojana', 'central', 'Farmers',
        'Comprehensive crop insurance protecting against natural calamities, pests, and diseases at minimal farmer premium.',
        'Ministry of Agriculture', {
        officialWebsite: 'https://pmfby.gov.in/', popular: true, tags: ['Popular'],
        eligibility: ['All farmers including sharecroppers and tenant farmers', 'Loanee farmers mandatorily covered'],
        benefits: ['Premium: 2% Kharif, 1.5% Rabi, 5% horticulture', 'Govt pays remaining premium', 'Quick settlement via satellite imaging'],
        lastVerified: '2026-03-05', launchYear: 2016
    }),
    s('c-kusum', 'PM-KUSUM', 'central', 'Farmers',
        'Solar energy for agriculture — solarise pumps and earn extra income selling surplus power to the grid.',
        'MNRE', {
        officialWebsite: 'https://mnre.gov.in/pmkusum', tags: ['Active'],
        eligibility: ['Farmers with existing diesel/grid pumps', 'Farmer groups, cooperatives, panchayats'],
        benefits: ['60% subsidy on solar pumps', 'Extra income selling solar power', 'Reduces diesel costs', '₹30,800 Cr outlay'],
        lastVerified: '2026-03-05', launchYear: 2019
    }),
    s('c-pmkcc', 'Kisan Credit Card', 'central', 'Farmers',
        'Low-cost credit facility for farmers — crop, post-harvest, allied activities, and personal needs at concessional rates.',
        'NABARD / MoA', {
        officialWebsite: 'https://www.nabard.org/', popular: true, tags: ['Popular'], benefitAmount: 'Up to ₹3 Lakh @ 4%',
        interestRate: '4% (after interest subvention)',
        eligibility: ['All farmers, tenants, sharecroppers, SHG members', 'Allied fishery/livestock farmers'],
        benefits: ['Credit up to ₹3 lakh at 4% p.a.', 'Crop + post-harvest storage credit', 'Personal accident insurance ₹2 lakh'],
        lastVerified: '2026-03-05', launchYear: 1998
    }),
    s('c-pmddky', 'PM Dhan-Dhaanya Krishi Yojana', 'central', 'Farmers',
        'Six-year scheme for 100 low-productivity districts boosting pulses, millets, and crop diversification for 1.7 crore farmers.',
        'Ministry of Agriculture', {
        officialWebsite: 'https://www.india.gov.in/', tags: ['New 2025'], popular: true,
        eligibility: ['Farmers in 100 identified low-productivity districts'],
        benefits: ['Pulse & millet cultivation support', 'Irrigation improvements', 'Credit access for 1.7 crore farmers', '11+ existing scheme convergence'],
        lastVerified: '2026-03-05', launchYear: 2025
    }),
    s('c-bvistaar', 'Bharat-VISTAAR AI Farm Advisory', 'central', 'Farmers',
        'Multilingual AI platform giving customised crop, weather, and market guidance to farmers in local languages.',
        'Ministry of Agriculture', {
        officialWebsite: 'https://www.india.gov.in/', tags: ['New 2026'],
        eligibility: ['All Indian farmers with basic smartphone access'],
        benefits: ['AI crop advisory in local language', 'Weather-linked alerts', 'Market price updates', 'Integrated with PM-KISAN & KCC data'],
        lastVerified: '2026-03-05', launchYear: 2026
    }),
    s('c-pmgsy', 'PMGSY Phase IV', 'central', 'Farmers',
        'All-weather road connectivity to 25,000 unconnected rural habitations benefiting farmers and villages.',
        'Ministry of Rural Dev.', {
        officialWebsite: 'https://pmgsy.nic.in/', tags: ['New 2025'], benefitAmount: '25,000 km new roads',
        eligibility: ['Rural habitations 500+ population (plain) or 250+ (hilly/tribal)'],
        benefits: ['25,000 km rural roads in 5 years', 'Better market access for farmers', 'Improved emergency services', '1.25 lakh rural residences benefited'],
        lastVerified: '2026-03-05', launchYear: 2025
    }),

    // ── HEALTH ────────────────────────────────────────────────────────────────
    s('c-ayushman', 'Ayushman Bharat PM-JAY', 'central', 'Health',
        "World's largest health insurance — ₹5 lakh annual cover per family for secondary and tertiary hospitalisation at 23,000+ hospitals.",
        'Ministry of Health', {
        officialWebsite: 'https://pmjay.gov.in/', popular: true, tags: ['Popular', 'Expanded Sep 2024'], benefitAmount: '₹5 Lakh/family/year',
        eligibility: ['SECC 2011 listed families', 'ALL senior citizens 70+ (from Sep 2024)', 'No cap on family size'],
        benefits: ['₹5 lakh cashless treatment per family/year', 'Pre-existing diseases covered Day 1', '23,000+ empanelled hospitals', 'Portability across India'],
        lastVerified: '2026-03-05', launchYear: 2018
    }),
    s('c-vvandana', 'Ayushman Bharat Vaya Vandana', 'central', 'Health',
        'Healthcare security for ALL senior citizens aged 70+ regardless of income — ₹5 lakh/year cashless treatment.',
        'Ministry of Health', {
        officialWebsite: 'https://pmjay.gov.in/', popular: true, tags: ['New Oct 2024', 'Universal for 70+'], benefitAmount: '₹5 Lakh/year (70+)',
        eligibility: ['ALL citizens 70 years and above', 'No income limit — universal', '4.5 crore families, 6 crore seniors covered'],
        benefits: ['₹5 lakh annual cover', 'Cashless at 23,000+ hospitals', 'No SECC list requirement', 'Aadhaar-based auto-enrollment'],
        lastVerified: '2026-03-05', launchYear: 2024
    }),
    s('c-jjm', 'Jal Jeevan Mission', 'central', 'Health',
        '"Har Ghar Jal" — Safe piped drinking water connection to every rural household at 55 litres per person per day.',
        'MoJSW', {
        officialWebsite: 'https://jaljeevanmission.gov.in/', popular: true, tags: ['Active'],
        eligibility: ['All rural households without Functional Household Tap Connection (FHTC)'],
        benefits: ['55 LPCD safe tap water', 'Source sustainability & greywater management', 'Reduces waterborne diseases', 'Women & children time-saving'],
        lastVerified: '2026-03-05', launchYear: 2019
    }),
    s('c-caregiver', 'National Caregiver Training Scheme', 'central', 'Health',
        'Training 1.5 lakh certified caregivers with blended skills for professional elder and patient care.',
        'Ministry of Health', {
        officialWebsite: 'https://www.india.gov.in/', tags: ['New 2026'],
        eligibility: ['Indian citizens interested in healthcare caregiving'],
        benefits: ['Govt-certified caregiver qualification', 'Blended online + practical training', 'Job placement support', '1.5 lakh caregivers over 5 years'],
        lastVerified: '2026-03-05', launchYear: 2026
    }),
    s('c-telemanas', 'Tele-MANAS Mental Health', 'central', 'Health',
        'Free 24/7 tele-mental health helpline (14416) with professional counselling in multiple Indian languages.',
        'Ministry of Health', {
        officialWebsite: 'https://telemanas.mohfw.gov.in/', tags: ['Active'],
        eligibility: ['All Indian citizens — free and anonymous'],
        benefits: ['24/7 toll-free helpline: 14416', 'Professional counselling sessions', 'Multiple Indian languages', 'Referral to NIMHANS specialists'],
        lastVerified: '2026-03-05', launchYear: 2022
    }),

    // ── INSURANCE ─────────────────────────────────────────────────────────────
    s('c-pmjjby', 'PM Jeevan Jyoti Bima Yojana', 'central', 'Insurance',
        'Life insurance at just ₹436/year — ₹2 lakh death benefit for anyone aged 18-50 with a bank account.',
        'Ministry of Finance', {
        officialWebsite: 'https://www.jansuraksha.gov.in/', benefitAmount: '₹2 Lakh on death',
        eligibility: ['Age 18–50 years', 'Bank/Post-office account with auto-debit consent'],
        benefits: ['₹2 lakh on death from ANY cause', 'Annual auto-renewing premium ₹436', 'Easy bank enrollment'],
        lastVerified: '2026-03-05', launchYear: 2015
    }),
    s('c-pmsby', 'PM Suraksha Bima Yojana', 'central', 'Insurance',
        'Accident insurance at just ₹20/year — ₹2 lakh for accidental death/disability for those aged 18-70.',
        'Ministry of Finance', {
        officialWebsite: 'https://www.jansuraksha.gov.in/', popular: true, benefitAmount: '₹2 Lakh accident cover',
        eligibility: ['Age 18–70', 'Savings bank account with auto-debit'],
        benefits: ['₹2 lakh on accidental death', '₹1 lakh on permanent partial disability', 'Premium: just ₹20/year'],
        lastVerified: '2026-03-05', launchYear: 2015
    }),
    s('c-pmfby2', 'Restructured Weather-Based Crop Insurance', 'central', 'Insurance',
        'Weather index-based crop insurance offering quick, transparent claims without individual crop-cutting experiments.',
        'Ministry of Agriculture', {
        tags: ['Active'],
        eligibility: ['Farmers in notified areas', 'Loanee and non-loanee farmers'],
        benefits: ['Weather-index linked claims', 'Quick payouts without field visits', 'Transparent settlement process', 'Complements PMFBY'],
        lastVerified: '2026-03-05', launchYear: 2016
    }),

    // ── BANKING ───────────────────────────────────────────────────────────────
    s('c-jandhan', 'PM Jan Dhan Yojana', 'central', 'Banking',
        'Universal banking access — zero-balance accounts, RuPay card, accident insurance and life cover for all citizens.',
        'Ministry of Finance', {
        officialWebsite: 'https://pmjdy.gov.in/', popular: true, tags: ['Popular'],
        eligibility: ['Any Indian citizen 10+', 'No minimum balance required'],
        benefits: ['Zero-balance account', 'RuPay debit card', '₹2 lakh accident cover', '₹30,000 life cover', 'Overdraft up to ₹10,000'],
        lastVerified: '2026-03-05', launchYear: 2014
    }),
    s('c-mudra', 'PM MUDRA Yojana', 'central', 'Banking',
        'Collateral-free business loans from ₹50,000 to ₹20 lakh (enhanced 2024) for small businesses and entrepreneurs.',
        'Ministry of Finance', {
        officialWebsite: 'https://www.mudra.org.in/', popular: true, tags: ['Popular', 'Limit Enhanced 2024'],
        benefitAmount: '₹50,000 – ₹20 Lakh', interestRate: '7.3% – 12%',
        eligibility: ['Any citizen with a business plan', 'Non-corporate small businesses', 'Manufacturing/trading/services/agri-allied'],
        benefits: ['Shishu: Up to ₹50,000', 'Kishore: ₹50K–₹5 Lakh', 'Tarun: ₹5 Lakh–₹20 Lakh (enhanced 2024)', 'No collateral, no processing fee'],
        documents: ['Aadhaar', 'PAN', 'Business plan', 'Address proof', 'Photos'],
        howToApply: ['Visit any bank/NBFC/MFI', 'Submit MUDRA application', 'Provide business plan', 'Bank evaluates and sanctions'],
        lastVerified: '2026-03-05', launchYear: 2015
    }),
    s('c-standup', 'Stand Up India', 'central', 'Banking',
        'Greenfield enterprise loans of ₹10 lakh to ₹1 crore for SC/ST and women first-time borrowers.',
        'SIDBI / Ministry of Finance', {
        officialWebsite: 'https://www.standupmitra.in/', tags: ['Active'], benefitAmount: '₹10 Lakh – ₹1 Crore',
        eligibility: ['SC/ST entrepreneurs', 'Women entrepreneurs', 'First-time greenfield project borrowers'],
        benefits: ['Composite loan for manufacturing/services/trade', '7-year repayment term', 'Credit guarantee cover', 'RuPay card facility'],
        lastVerified: '2026-03-05', launchYear: 2016
    }),

    // ── MSME ──────────────────────────────────────────────────────────────────
    s('c-pv', 'PM Vishwakarma Yojana', 'central', 'MSME',
        'Comprehensive support for 18 artisan/craftspeople categories — toolkit, skill training, and collateral-free loans at 5%.',
        'Ministry of MSME', {
        officialWebsite: 'https://pmvishwakarma.gov.in/', popular: true, tags: ['Popular'], benefitAmount: '₹1–3 Lakh Loans',
        eligibility: ['18 traditional artisan/craft categories (carpenter, weaver, potter, etc.)', 'One member per family', 'No prior PM Vishwakarma benefit'],
        benefits: ['₹15,000 toolkit incentive', '₹1 lakh loan at 5% (collateral-free)', '₹2 lakh second tranche', 'Stipend ₹500/day during training'],
        lastVerified: '2026-03-05', launchYear: 2023
    }),
    s('c-startup', 'Startup India', 'central', 'MSME',
        'Tax holiday, compliance simplification, and ₹10,000 Cr Fund of Funds for DPIIT-recognized startups.',
        'DPIIT', {
        officialWebsite: 'https://www.startupindia.gov.in/', tags: ['Active'],
        eligibility: ['Startup registered up to 10 years', 'Turnover < ₹100 crore', 'Innovation/scalable business model'],
        benefits: ['3-year income tax holiday', 'Self-certification on labour laws', '₹10,000 Cr Fund of Funds', 'Fast patent examination', 'Free IPR services'],
        lastVerified: '2026-03-05', launchYear: 2016
    }),
    s('c-mecc', 'Micro-Enterprise Credit Cards', 'central', 'MSME',
        '₹5 lakh credit cards for Udyam-registered micro-enterprises for convenient working capital access.',
        'Ministry of Finance', {
        officialWebsite: 'https://udyamregistration.gov.in/', tags: ['New 2025'], benefitAmount: '₹5 Lakh Credit',
        eligibility: ['Udyam-registered micro-enterprises', 'Good credit history'],
        benefits: ['₹5 lakh revolving credit card', 'No collateral for micro units', '10 lakh enterprises in Year 1'],
        lastVerified: '2026-03-05', launchYear: 2025
    }),
    s('c-fte', 'First-Time Entrepreneurs Scheme', 'central', 'MSME',
        'Term loans up to ₹2 crore for first-time women, SC/ST entrepreneurs via govt credit guarantee.',
        'Ministry of Finance', {
        officialWebsite: 'https://www.india.gov.in/', tags: ['New 2025'], benefitAmount: 'Up to ₹2 Crore',
        eligibility: ['First-time entrepreneurs', 'Women, SC/ST priority', 'No prior business loan history needed'],
        benefits: ['Term loans up to ₹2 crore', '5-year repayment', 'Credit guarantee cover', '5 lakh entrepreneurs over 5 years'],
        lastVerified: '2026-03-05', launchYear: 2025
    }),
    s('c-smegf', 'SME Growth Fund', 'central', 'MSME',
        '₹10,000 crore dedicated fund to build Champion SMEs and boost Indian manufacturing and exports.',
        'DPIIT', {
        officialWebsite: 'https://www.investindia.gov.in/', tags: ['New 2026'], benefitAmount: '₹10,000 Cr Fund',
        eligibility: ['Small and Medium Enterprises with growth potential', 'Manufacturing and export focus'],
        benefits: ['Equity and growth capital investment', 'Market access support', 'Manufacturing capacity expansion'],
        lastVerified: '2026-03-05', launchYear: 2026
    }),
    s('c-makein', 'Make in India', 'central', 'MSME',
        'Flagship initiative to transform India into a global manufacturing hub, attract FDI, and create employment.',
        'DPIIT', {
        officialWebsite: 'https://www.makeinindia.com/', popular: true, tags: ['Active'],
        eligibility: ['Indian and foreign companies in 27 focus sectors', 'Startups and SMEs', 'Global manufacturers'],
        benefits: ['Investment facilitation', 'Single-window clearance', 'PLI schemes across 14 sectors', 'Ease of doing business improvements'],
        lastVerified: '2026-03-05', launchYear: 2014
    }),

    // ── EDUCATION & YOUTH ─────────────────────────────────────────────────────
    s('c-vidyalakshmi', 'PM Vidya Lakshmi', 'central', 'Education',
        'Single digital portal for education loans up to ₹10 lakh with central credit guarantee for meritorious students.',
        'Ministry of Education', {
        officialWebsite: 'https://www.vidyalakshmi.co.in/', popular: true, tags: ['Launched Jan 2025'], benefitAmount: 'Up to ₹10 Lakh',
        eligibility: ['60%+ marks in qualifying exam', 'Family income ≤ ₹8 lakh (for guarantee)', 'Admission in top 860 institutions'],
        benefits: ['Education loan with govt credit guarantee', 'No collateral up to ₹7.5 lakh', '3% interest subvention during study', 'Apply to multiple banks from one portal'],
        lastVerified: '2026-03-05', launchYear: 2025
    }),
    s('c-internship', 'PM Internship Scheme', 'central', 'Youth',
        'Structured 12-month internship in top 500 Indian companies with ₹5,000/month stipend for 1 crore youth.',
        'Ministry of Corporate Affairs', {
        officialWebsite: 'https://pminternship.mca.gov.in/', popular: true, tags: ['Launched Oct 2024'], benefitAmount: '₹5,000/month + ₹6,000',
        eligibility: ['Youth 21-24 years', 'Not in full-time employment or higher education', 'School/ITI/polytechnic/graduation passed'],
        benefits: ['₹5,000/month for 12 months', '₹6,000 one-time incidental aid', 'Top 500 company internship', 'Accident insurance', '1 crore youth in 5 years'],
        lastVerified: '2026-03-05', launchYear: 2024
    }),
    s('c-onos', 'One Nation One Subscription', 'central', 'Education',
        'Free national access to 13,000+ international academic journals and research publications for all Indian institutions.',
        'Ministry of Education', {
        officialWebsite: 'https://onos.inflibnet.ac.in/', tags: ['Launched Jan 2025'],
        eligibility: ['Students, researchers, faculty in participating institutions', 'Govt research labs'],
        benefits: ['Access to 13,000+ international journals', 'All major publishers included', 'No individual subscription cost', 'Boosts Indian research and patents'],
        lastVerified: '2026-03-05', launchYear: 2025
    }),
    s('c-skill', 'Skill India Mission 2.0', 'central', 'Youth',
        'Free market-linked skill training across 40+ sectors — 1 crore youth trained annually with placement support.',
        'MSDE', {
        officialWebsite: 'https://www.skillindia.gov.in/', popular: true, tags: ['Expanded 2025'],
        eligibility: ['Youth aged 15-45', 'Min 5th pass (varies by course)'],
        benefits: ['Free training', 'NSQF-aligned industry certificates', 'Placement support', 'Monthly stipend during training', 'RPL certification for prior learning'],
        lastVerified: '2026-03-05', launchYear: 2015
    }),
    s('c-nmmss', 'National Means-cum-Merit Scholarship', 'central', 'Education',
        '₹12,000/year scholarship for meritorious economically weaker section students in Class IX-XII to prevent dropout.',
        'Ministry of Education', {
        officialWebsite: 'https://scholarships.gov.in/', benefitAmount: '₹12,000/year',
        eligibility: ['Class IX students with 55%+ in Class VIII', 'Family income ≤ ₹3.5 lakh/year', 'Studying in govt/govt-aided schools'],
        benefits: ['₹12,000/year (₹1,000/month)', 'Continues Class IX to XII', 'Direct DBT payment', '1 lakh scholarships annually'],
        lastVerified: '2026-03-05', launchYear: 2008
    }),
    s('c-nai-roshni', 'Nai Roshni Scheme', 'central', 'Youth',
        'Leadership development programme for minority women aged 18-65 to build confidence and connect with government systems.',
        'Ministry of Minority Affairs', {
        officialWebsite: 'https://minorityaffairs.gov.in/', tags: ['Active'],
        eligibility: ['Minority women (Muslim, Christian, Sikh, Buddhist, Parsi, Jain) aged 18-65', 'BPL or near-BPL families'],
        benefits: ['Leadership training', 'Government scheme awareness', 'Health, legal, digital literacy', 'Connects women to self-employment opportunities'],
        lastVerified: '2026-03-05', launchYear: 2012
    }),

    // ── EMPLOYMENT ────────────────────────────────────────────────────────────
    s('c-mgnrega', 'MGNREGA', 'central', 'Employment',
        '100 days guaranteed wage employment per year for rural household adults at minimum wages, within 5 km radius.',
        'Ministry of Rural Development', {
        officialWebsite: 'https://nrega.nic.in/', popular: true, benefitAmount: '100 days work/year',
        eligibility: ['Adult members of any rural household', 'Willing to do unskilled manual work'],
        benefits: ['100 days guaranteed employment', 'State minimum wages', 'Unemployment allowance if work not provided', 'Work within 5 km', 'Overtime compensation'],
        lastVerified: '2026-03-05', launchYear: 2006
    }),
    s('c-pmvbry', 'PM Viksit Bharat Rozgar Yojana', 'central', 'Employment',
        'EPF-linked incentive scheme promoting 3.5 crore new formal jobs with subsidies to employers and employees.',
        'Ministry of Labour', {
        popular: true, tags: ['New 2025'], benefitAmount: '₹99,446 Cr outlay',
        eligibility: ['New EPF employees salary < ₹1 lakh/month', 'First-time registered employers'],
        benefits: ['EPF-linked subsidies for 24 months', '3.5 crore new jobs targeted', 'First-time formal sector focus', 'Benefits both employer and employee'],
        lastVerified: '2026-03-05', launchYear: 2025
    }),
    s('c-gigworkers', 'Gig Workers Welfare Scheme', 'central', 'Employment',
        'Social security, identity cards, and healthcare under PM-JAY for online platform gig workers via e-Shram.',
        'Ministry of Labour', {
        officialWebsite: 'https://eshram.gov.in/', tags: ['New 2025'],
        eligibility: ['Online platform gig workers (cab, delivery, home services)', 'Self-registration on e-Shram portal'],
        benefits: ['Official identity card', 'Healthcare under PM-JAY', 'Accident insurance', 'Social security benefits', 'Legal recognition of gig work'],
        lastVerified: '2026-03-05', launchYear: 2025
    }),
    s('c-pd', 'PM-DAKSH', 'central', 'Employment',
        'Free vocational training for SC/ST, OBC, safai karamcharis with monthly stipend and placement assistance.',
        'Ministry of Social Justice', {
        officialWebsite: 'https://pmdaksh.dosje.gov.in/', tags: ['Active'],
        eligibility: ['SC/ST/OBC/backward classes aged 18-45', 'Safai Karamcharis and rag-pickers'],
        benefits: ['Free up-skilling/re-skilling', 'Short and long-term vocational courses', 'Placement support', 'Monthly stipend during training'],
        lastVerified: '2026-03-05', launchYear: 2021
    }),
    s('c-pmsy', 'Pradhan Mantri Shram Yogi Maandhan', 'central', 'Employment',
        '₹3,000/month guaranteed pension at 60 for unorganised sector workers with tiny monthly contribution ₹55-200.',
        'Ministry of Labour', {
        officialWebsite: 'https://maandhan.in/', popular: true, tags: ['Popular'], benefitAmount: '₹3,000/month after 60',
        eligibility: ['Unorganised workers aged 18-40', 'Monthly income ≤ ₹15,000', 'Not EPF/NPS/ESIC member'],
        benefits: ['₹3,000/month pension after 60', 'Govt matches contribution', 'Spouse gets ₹1,500/month on worker death', 'Premium just ₹55–₹200/month'],
        lastVerified: '2026-03-05', launchYear: 2019
    }),

    // ── PENSION ───────────────────────────────────────────────────────────────
    s('c-apy', 'Atal Pension Yojana', 'central', 'Pension',
        'Guaranteed monthly pension ₹1,000–₹5,000 for unorganised sector workers after age 60 with govt co-contribution.',
        'Ministry of Finance', {
        officialWebsite: 'https://www.npscra.nsdl.co.in/', popular: true, benefitAmount: '₹1,000–₹5,000/month',
        eligibility: ['Age 18–40', 'Savings bank account', 'Not income tax payer or govt employee in EPF/NPS'],
        benefits: ['Guaranteed ₹1,000-₹5,000/month from age 60', 'Nominee gets lump sum on death', '80CCD tax benefit', 'Spouse pension on death'],
        lastVerified: '2026-03-05', launchYear: 2015
    }),
    s('c-nps', 'National Pension System', 'central', 'Pension',
        'Voluntary market-linked pension with multiple fund managers and extra ₹50,000 deduction under Section 80CCD(1B).',
        'PFRDA', {
        officialWebsite: 'https://www.npscra.nsdl.co.in/', popular: true,
        eligibility: ['Indian citizens/NRI aged 18–70'],
        benefits: ['Extra ₹50,000 under 80CCD(1B)', 'Choice of equity/debt allocation', 'Low cost fund management (0.01%)', 'Portable across employers and cities'],
        lastVerified: '2026-03-05', launchYear: 2004
    }),
    s('c-npsvatsalya', 'NPS Vatsalya Yojana', 'central', 'Pension',
        'Parents can open NPS accounts for minor children from birth — compounding pension corpus from childhood.',
        'Ministry of Finance', {
        officialWebsite: 'https://www.npscra.nsdl.co.in/', popular: true, tags: ['New Sep 2024'],
        eligibility: ['Minor Indian citizens (below 18)', 'NRI children eligible', 'Parent/guardian opens and manages account'],
        benefits: ['Start pension corpus from childhood', 'Converts to standard NPS at 18', '50+ years of compounding', 'Tax benefit for parent under 80C', 'Min contribution ₹1,000/year'],
        lastVerified: '2026-03-05', launchYear: 2024
    }),

    // ── HOUSING ───────────────────────────────────────────────────────────────
    s('c-pmay2', 'PM Awas Yojana Urban 2.0', 'central', 'Housing',
        'Housing for 1 crore urban poor/middle-class families via interest subsidy and financial assistance over 5 years.',
        'MoHUA', {
        officialWebsite: 'https://pmaymis.gov.in/', popular: true, tags: ['Approved Aug 2024'],
        eligibility: ['EWS: Annual income ≤ ₹3 lakh', 'LIG: ₹3-6 lakh', 'MIG: ₹6-18 lakh', 'No pucca house owned'],
        benefits: ['Interest subsidy 3-6.5%', 'Central assistance ₹1.5 lakh (EWS/LIG)', 'Women co-ownership', '1 crore houses 2024-2029'],
        lastVerified: '2026-03-05', launchYear: 2024
    }),
    s('c-pmayg', 'PM Awas Yojana Gramin', 'central', 'Housing',
        'Free pucca houses with basic amenities for rural houseless or kutcha-house dwellers in SECC list.',
        'Ministry of Rural Dev.', {
        officialWebsite: 'https://pmayg.nic.in/', popular: true, tags: ['3 Crore Target'],
        eligibility: ['SECC-2011 listed families', 'SC/ST households', 'Landless labourers', 'No pucca house'],
        benefits: ['₹1.2 lakh/house (plains), ₹1.3 lakh (hilly/north-east)', 'Toilet under SBM', 'MGNREGA work wages', '3 crore new houses 2024-2026'],
        lastVerified: '2026-03-05', launchYear: 2016
    }),

    // ── SOCIAL WELFARE ────────────────────────────────────────────────────────
    s('c-ignoaps', 'IGNOAPS – Senior Citizen Pension', 'central', 'Social Welfare',
        'Central monthly pension for BPL senior citizens aged 60+, 80+ receiving higher amounts under NSAP.',
        'Ministry of Rural Dev.', {
        officialWebsite: 'https://nsap.nic.in/', benefitAmount: '₹200–₹500 + state top-up',
        eligibility: ['Senior citizens aged 60+ below poverty line', '80+ get higher amount under NSSOAPs component'],
        benefits: ['₹200/month age 60-79 (centre contribution)', '₹500/month age 80+', 'State adds top-up (total varies ₹500-₹3,000)', 'Direct bank transfer'],
        lastVerified: '2026-03-05', launchYear: 1995
    }),
    s('c-nfbs', 'National Family Benefit Scheme', 'central', 'Social Welfare',
        'One-time grant of ₹20,000 to BPL families on death of breadwinner aged 18-59.',
        'Ministry of Rural Dev.', {
        officialWebsite: 'https://nsap.nic.in/', benefitAmount: '₹20,000 lump sum',
        eligibility: ['BPL families', 'Death of primary breadwinner aged 18-59', 'Natural or accidental death'],
        benefits: ['₹20,000 one-time payment within 4 weeks', 'Direct bank transfer to family member', 'No exclusion by religion, gender, or caste'],
        lastVerified: '2026-03-05', launchYear: 2000
    }),
    s('c-rprs', 'Rural Prosperity & Resilience Programme', 'central', 'Social Welfare',
        'Multi-sectoral programme addressing rural underemployment through agri-enterprise, technology, and skilling.',
        'Ministry of Rural Dev.', {
        officialWebsite: 'https://www.india.gov.in/', tags: ['New Budget 2025'],
        eligibility: ['Young farmers, rural women, marginal/small farmers, landless families'],
        benefits: ['Employment in rural areas', 'Technology skilling', 'Agri-enterprise development', 'Rural infrastructure investment'],
        lastVerified: '2026-03-05', launchYear: 2025
    }),
    s('c-nsap', 'National Social Assistance Programme', 'central', 'Social Welfare',
        'Social safety net providing pensions, scholarships, and maternity benefits to destitute persons below poverty line.',
        'Ministry of Rural Dev.', {
        officialWebsite: 'https://nsap.nic.in/', popular: true,
        eligibility: ['BPL households', 'Widows, senior citizens, disabled persons', 'States implement individually'],
        benefits: ['Monthly pension via IGNOAPS/IGNWPS/IGNDPS', 'Maternity benefit under IGMSY', 'Scholarships under NFBS children component'],
        lastVerified: '2026-03-05', launchYear: 1995
    }),

    // ── SENIOR CITIZENS ───────────────────────────────────────────────────────
    s('c-scss', 'Senior Citizen Savings Scheme', 'central', 'Senior Citizens',
        "India's highest government-guaranteed interest rate of 8.2% p.a. for senior citizens with quarterly payouts.",
        'Ministry of Finance', {
        officialWebsite: 'https://www.indiapost.gov.in/', popular: true, tags: ['Popular'],
        interestRate: '8.2% p.a. quarterly', tenure: '5 years (extendable 3 yrs)', maxAmount: '₹30 lakh',
        taxBenefit: 'Section 80C deduction up to ₹1.5 lakh',
        eligibility: ['Age 60+', 'Retired defence personnel age 50+', 'VRS/superannuation retiree within 1 month'],
        benefits: ['8.2% p.a. guaranteed – highest in India', 'Quarterly interest payout', '80C tax deduction', 'Max deposit ₹30 lakh per person'],
        howToApply: ['Visit any post office or authd bank', 'Fill SCSS account form', 'Submit age proof and retirement documents'],
        lastVerified: '2026-03-05', launchYear: 2004
    }),
    s('c-pomoisfsc', 'Senior Citizens Ombudsman Scheme', 'central', 'Senior Citizens',
        'Dedicated grievance redressal mechanism for senior citizens against banks, pension issues, and service denials.',
        'Ministry of Finance', {
        officialWebsite: 'https://www.india.gov.in/', tags: ['Active'],
        eligibility: ['Any Indian senior citizen 60+', 'Facing issues with banks, pension, or govt services'],
        benefits: ['Free complaint lodging', 'Grievance resolution within 30 days', 'Legal aid for senior citizens', 'Ombudsman in each district'],
        lastVerified: '2026-03-05', launchYear: 2007
    }),
    s('c-vaatsalya', 'PM Vaya Vandana Yojana', 'central', 'Senior Citizens',
        'LIC-managed pension scheme for senior citizens with 7.4% assured return and flexible payout options.',
        'Ministry of Finance / LIC', {
        officialWebsite: 'https://licindia.in/', benefitAmount: 'Up to ₹9,250/month', interestRate: '7.4% effective',
        tenure: '10 years', maxAmount: '₹15 lakh',
        eligibility: ['Senior citizens aged 60+', 'Purchase from LIC of India'],
        benefits: ['7.4% guaranteed return', 'Monthly/qtrly/half-yearly/annual pension options', 'Death benefit: return of purchase price', 'Loan up to 75% after 3 years'],
        lastVerified: '2026-03-05', launchYear: 2017
    }),

    // ── DIGITAL / ENERGY ──────────────────────────────────────────────────────
    s('c-suryaghar', 'PM Surya Ghar: Free Electricity', 'central', 'Energy',
        'Rooftop solar subsidy of 40% for 1 crore households targeting 300 units of free electricity per month.',
        'Ministry of New and Renewable Energy', {
        officialWebsite: 'https://pmsuryaghar.gov.in/', popular: true, tags: ['New Feb 2024', 'Popular'], benefitAmount: '300 units free/month',
        eligibility: ['Residential households', 'Grid-connected electricity connection', 'Suitable rooftop space'],
        benefits: ['40% subsidy on 3 kW solar panel', '300 units free electricity/month', 'Saves ₹15,000–18,000/year', '1 crore households target', 'Net metering for surplus sale'],
        lastVerified: '2026-03-05', launchYear: 2024
    }),
    s('c-edrive', 'PM e-Drive Scheme', 'central', 'Energy',
        'Demand incentives for electric 2W, 3W, ambulances, and buses with ₹10,900 Cr outlay for EV adoption.',
        'Ministry of Heavy Industries', {
        officialWebsite: 'https://fame.heavyindustries.gov.in/', tags: ['Launched Oct 2024'], benefitAmount: '₹10,900 Cr outlay',
        eligibility: ['Buyers of electric vehicles 2W/3W', 'Healthcare institutions for EV ambulances', 'State transport corporations for e-buses'],
        benefits: ['Incentives on 24.79 lakh electric 2W', '3.16 lakh electric 3W', 'EV ambulances for health facilities', 'Charging infra expansion at govt buildings'],
        lastVerified: '2026-03-05', launchYear: 2024
    }),
    s('c-digitalindia', 'Digital India Programme', 'central', 'Digital',
        'Transforming India into a digitally empowered society via BharatNet, DigiLocker, UPI, UMANG, and 1 lakh+ CSCs.',
        'MeitY', {
        officialWebsite: 'https://www.digitalindia.gov.in/', popular: true, tags: ['Active'],
        eligibility: ['All Indian citizens and businesses'],
        benefits: ['BharatNet broadband to gram panchayats', 'DigiLocker: Digital document storage', 'UMANG: 1,200+ govt services on one app', 'eSign: Digital signing', 'CSC in every panchayat'],
        lastVerified: '2026-03-05', launchYear: 2015
    }),
];

// Free schemes available to all users (non-premium)
export const FREE_SCHEME_IDS = ['c-mudra', 'c-ssy', 'c-pmkisan', 'c-jandhan', 'c-mgnrega', 'c-apy', 'c-pmsby'];
