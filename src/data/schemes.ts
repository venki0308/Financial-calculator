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
    { name: 'Women', color: '#EC4899', count: 42 },
    { name: 'Education', color: '#3B82F6', count: 35 },
    { name: 'Farmers', color: '#10B981', count: 38 },
    { name: 'MSME', color: '#F59E0B', count: 20 },
    { name: 'Senior Citizens', color: '#8B5CF6', count: 18 },
    { name: 'Insurance', color: '#EF4444', count: 15 },
    { name: 'Housing', color: '#F97316', count: 12 },
    { name: 'Banking', color: '#3B82F6', count: 25 },
    { name: 'Pension', color: '#6366F1', count: 10 },
    { name: 'Health', color: '#EF4444', count: 22 },
    { name: 'Employment', color: '#14B8A6', count: 16 },
    { name: 'Social Welfare', color: '#06B6D4', count: 30 },
];

const s = (id: string, name: string, gl: 'central' | 'state', cat: string, desc: string, ministry: string, opts: Partial<Scheme> = {}): Scheme => ({
    id, name, governmentLevel: gl, category: cat, tags: [], popular: false, description: desc, ministry,
    officialWebsite: 'https://www.india.gov.in', eligibility: ['Indian citizen'],
    benefits: ['Financial assistance'], documents: ['Aadhaar Card', 'Bank passbook'],
    howToApply: ['Visit official portal', 'Submit application', 'Upload documents'],
    lastVerified: '2026-02-22', launchYear: 2024, isActive: true,
    ...opts,
});

export const schemes: Scheme[] = [
    // === CENTRAL GOVERNMENT - LATEST 2026 ===
    s('c-pv', 'PM Vishwakarma Yojana', 'central', 'MSME', 'Support for artisans and craftspeople with collateral-free loans, skill training, and toolkit incentives.', 'Ministry of MSME', {
        officialWebsite: 'https://pmvishwakarma.gov.in/', popular: true, tags: ['New', 'Popular'], benefitAmount: '₹1-3 Lakh Loans',
        eligibility: ['Traditional artisans/craftspeople', 'Family of 1 member only', 'No previous loans under similar schemes'],
        benefits: ['₹15,000 for Toolkits', '₹1-3 Lakh collateral-free loans @ 5%', 'Stipend for training'],
        howToApply: ['Register at Common Service Center (CSC)', 'Biometric verification', 'Approval by District Committee'],
        lastVerified: '2026-02-22', launchYear: 2023
    }),
    s('c-sv', 'PM SVANidhi 2.0', 'central', 'Banking', 'Micro-credit facility for street vendors to resume their livelihoods in urban/rural areas.', 'MoHUA', {
        officialWebsite: 'https://pmsvanidhi.mohua.gov.in/', tags: ['Extended 2026'], benefitAmount: '₹10,000-50,000',
        eligibility: ['Street vendors in urban/rural areas', 'Possess Certificate of Vending'],
        benefits: ['First loan: ₹10,000', 'Second loan: ₹20,000', 'Third loan: ₹50,000', '7% interest subsidy'],
        lastVerified: '2026-02-22', launchYear: 2020
    }),
    s('c-ld', 'Lakhpati Didi Scheme', 'central', 'Women', 'Empowering 2 crore rural women to become self-reliant and earn at least ₹1 lakh per annum.', 'Ministry of Rural Development', {
        tags: ['2023-2026', 'Popular'], popular: true,
        eligibility: ['Rural women', 'Members of Self Help Groups (SHGs)'],
        benefits: ['Interest-free loans', 'Skill training', 'Market linkage support', 'Financial literacy'],
        lastVerified: '2026-02-22', launchYear: 2023
    }),
    s('c-pmay2', 'PM Awas Yojana 2.0', 'central', 'Housing', 'Housing for all initiative providing subsidies for permanent houses in urban and rural areas.', 'MoHUA', {
        officialWebsite: 'https://pmaymis.gov.in/', tags: ['Updated 2024'], popular: true,
        eligibility: ['No pucca house in family', 'Income limits based on EWS/LIG category'],
        benefits: ['Interest subsidy up to 6.5%', 'Direct financial assistance', 'Women co-ownership preferred'],
        lastVerified: '2026-02-22', launchYear: 2024
    }),
    s('c-pd', 'PM-DAKSH', 'central', 'Employment', 'Skill development and vocational training for marginalized sections including SC/ST and Safai Karamcharis.', 'Ministry of Social Justice', {
        officialWebsite: 'https://pmdaksh.dosje.gov.in/', tags: ['Updated 2025'],
        eligibility: ['SC/ST/OBC/Safai Karamcharis', 'Age 18-45'],
        benefits: ['Up-skilling/Reskilling', 'Short-term training', 'Long-term vocational training', 'Stipend provided'],
        lastVerified: '2026-02-22', launchYear: 2021
    }),

    // PM-KISAN
    s('c-pmkisan', 'PM-KISAN', 'central', 'Farmers', 'Direct income support of ₹6,000 per year to farmer families across India.', 'Ministry of Agriculture', {
        officialWebsite: 'https://pmkisan.gov.in/', popular: true, tags: ['Popular'], benefitAmount: '₹6,000/year',
        eligibility: ['All landholding farmer families', 'Subject to exclusion criteria'],
        benefits: ['₹2,000 every 4 months via DBT', '3 installments per year'],
        lastVerified: '2026-02-22', launchYear: 2019
    }),
    // Ayushman Bharat
    s('c-ayushman', 'Ayushman Bharat PM-JAY', 'central', 'Health', 'Health insurance of ₹5 lakh per family per year for secondary and tertiary hospitalisation.', 'Ministry of Health', {
        officialWebsite: 'https://pmjay.gov.in/', popular: true, tags: ['Popular'], benefitAmount: '₹5 Lakh',
        eligibility: ['Families identified via SECC 2011 data', 'No cap on family size'],
        benefits: ['₹5 lakh cashless treatment per family/year', 'Pre-existing diseases covered from Day 1'],
        lastVerified: '2026-02-22', launchYear: 2018
    }),
    // PMJJBY
    s('c-pmjjby', 'PM Jeevan Jyoti Bima Yojana', 'central', 'Insurance', 'Life insurance scheme at ₹436/year for people aged 18–50.', 'Ministry of Finance', {
        officialWebsite: 'https://www.jansuraksha.gov.in/Forms-PMJJBY.aspx', benefitAmount: '₹2 Lakh',
        eligibility: ['Age 18–50', 'Bank account with auto-debit'],
        benefits: ['₹2 lakh life cover on death due to any cause'],
        lastVerified: '2026-02-22', launchYear: 2015
    }),
    // PMSBY
    s('c-pmsby', 'PM Suraksha Bima Yojana', 'central', 'Insurance', 'Accident insurance at just ₹20/year for people aged 18–70.', 'Ministry of Finance', {
        officialWebsite: 'https://www.jansuraksha.gov.in/Forms-PMSBY.aspx', popular: true, benefitAmount: '₹2 Lakh',
        eligibility: ['Age 18–70', 'Bank account with auto-debit'],
        benefits: ['₹2 lakh on accidental death', '₹1 lakh on partial disability'],
        lastVerified: '2026-02-22', launchYear: 2015
    }),
    // PMFBY
    s('c-pmfby', 'PM Fasal Bima Yojana', 'central', 'Farmers', 'Comprehensive crop insurance scheme for farmers against natural calamities.', 'Ministry of Agriculture', {
        officialWebsite: 'https://pmfby.gov.in/', popular: true,
        eligibility: ['All farmers including sharecroppers and tenant farmers'],
        benefits: ['Premium: 2% Kharif, 1.5% Rabi', 'Government subsidises remaining premium'],
        lastVerified: '2026-02-22', launchYear: 2016
    }),
    // Atal Pension Yojana
    s('c-apy', 'Atal Pension Yojana', 'central', 'Pension', 'Guaranteed minimum pension of ₹1,000–₹5,000 for unorganised sector workers.', 'Ministry of Finance', {
        officialWebsite: 'https://www.npscra.nsdl.co.in/scheme-details.php', popular: true, benefitAmount: '₹1,000–₹5,000/month',
        eligibility: ['Age 18–40', 'Savings bank account', 'Not an income tax payer'],
        benefits: ['Guaranteed pension of ₹1,000 to ₹5,000/month after age 60'],
        lastVerified: '2026-02-22', launchYear: 2015
    }),
    // SSY
    s('c-ssy', 'Sukanya Samriddhi Yojana', 'central', 'Women', 'Government savings scheme for girl child education and marriage with high interest rate.', 'Ministry of Finance', {
        officialWebsite: 'https://www.indiapost.gov.in/', popular: true, interestRate: '8.2% p.a.', benefitAmount: 'Up to ₹1.5 Lakh/yr',
        eligibility: ['Parents/legal guardian of girl child below 10 years'],
        benefits: ['8.2% interest (highest among small savings)', 'Tax-free maturity', 'Section 80C deduction'],
        lastVerified: '2026-02-22', launchYear: 2015
    }),
    // Ujjwala
    s('c-ujjwala', 'PM Ujjwala Yojana 2.0', 'central', 'Social Welfare', 'Free LPG connections to women from BPL families and migrant workers.', 'Ministry of Petroleum', {
        officialWebsite: 'https://www.pmuy.gov.in/', popular: true,
        eligibility: ['Women from BPL families', 'No existing LPG connection in household'],
        benefits: ['Free LPG connection', 'First refill and stove free'],
        lastVerified: '2026-02-22', launchYear: 2016
    }),
    // PM-KUSUM
    s('c-kusum', 'PM-KUSUM', 'central', 'Farmers', 'Solar energy for farmers — solarisation of agricultural pumps and grid-connected solar plants.', 'MNRE', {
        officialWebsite: 'https://mnre.gov.in/pmkusum',
        eligibility: ['Farmers with grid-connected pumps', 'Farmer/Farmer groups for solar plants'],
        benefits: ['60% government subsidy on solar pumps', 'Additional income from selling solar power'],
        lastVerified: '2026-02-22', launchYear: 2019
    }),
    // MGNREGA
    s('c-mgnrega', 'MGNREGA', 'central', 'Employment', '100 days guaranteed wage employment per year to rural household adults.', 'Ministry of Rural Development', {
        officialWebsite: 'https://nrega.nic.in/', popular: true, benefitAmount: '100 days work/year',
        eligibility: ['Adult members of rural household', 'Willing to do unskilled manual work'],
        benefits: ['100 days guaranteed employment', 'State-wise minimum wages', 'Unemployment allowance if work not provided'],
        lastVerified: '2026-02-22', launchYear: 2006
    }),
    // Startup India
    s('c-startup', 'Startup India', 'central', 'MSME', 'Supporting entrepreneurs with tax benefits, easy compliance, and funding access.', 'DPIIT', {
        officialWebsite: 'https://www.startupindia.gov.in/',
        eligibility: ['Entity registered as startup for up to 10 years', 'Turnover below ₹100 Cr'],
        benefits: ['Tax holiday for 3 years', 'Self-certification compliance', 'Fund of Funds (₹10,000 Cr)'],
        lastVerified: '2026-02-22', launchYear: 2016
    }),
    // Jan Dhan
    s('c-jandhan', 'PM Jan Dhan Yojana', 'central', 'Banking', 'Universal banking access with zero-balance accounts, RuPay card, and insurance.', 'Ministry of Finance', {
        officialWebsite: 'https://pmjdy.gov.in/', popular: true,
        eligibility: ['Any Indian citizen aged 10+', 'No minimum balance requirement'],
        benefits: ['Zero-balance bank account', 'RuPay debit card', '₹2 lakh accident cover', '₹30,000 life cover'],
        lastVerified: '2026-02-22', launchYear: 2014
    }),
    // Mudra
    s('c-mudra', 'PM Mudra Yojana', 'central', 'MSME', 'Collateral-free loans up to ₹10 lakh for micro and small enterprises.', 'Ministry of Finance', {
        officialWebsite: 'https://www.mudra.org.in/', popular: true, benefitAmount: 'Up to ₹10 Lakh',
        eligibility: ['Non-corporate, non-farm small/micro enterprises'],
        benefits: ['Shishu: Up to ₹50,000', 'Kishore: ₹50K–₹5L', 'Tarun: ₹5L–₹10L', 'No collateral required'],
        lastVerified: '2026-02-22', launchYear: 2015
    }),
    // NPS
    s('c-nps', 'National Pension System', 'central', 'Pension', 'Voluntary retirement savings scheme with market-linked returns and tax benefits.', 'PFRDA', {
        officialWebsite: 'https://www.npscra.nsdl.co.in/', popular: true,
        eligibility: ['Any Indian citizen aged 18–70'],
        benefits: ['Additional ₹50,000 deduction under 80CCD(1B)', 'Market-linked returns', 'Choice of fund managers'],
        lastVerified: '2026-02-22', launchYear: 2004
    }),
    // Skill India
    s('c-skill', 'Skill India Mission', 'central', 'Employment', 'Skill development training programmes for youth to improve employability.', 'MSDE', {
        officialWebsite: 'https://www.skillindia.gov.in/',
        eligibility: ['Indian youth aged 15–45', 'Minimum 5th pass (scheme dependent)'],
        benefits: ['Free skill training', 'Industry-recognised certificates', 'Placement support'],
        lastVerified: '2026-02-22', launchYear: 2015
    }),

    // === NEW 2025-2026 CENTRAL SCHEMES ===
    s('c-pmvbry', 'PM Viksit Bharat Rozgar Yojana', 'central', 'Employment', 'Incentivizing creation of 3.5 crore jobs through EPF-linked benefits for new hires.', 'Ministry of Labour', {
        officialWebsite: 'https://www.india.gov.in/', popular: true, tags: ['New 2025', 'Popular'], benefitAmount: '₹99,446 Cr outlay',
        eligibility: ['New employees registered under EPF', 'Employers hiring fresh workforce'],
        benefits: ['EPF-linked employment incentives', '3.5 crore new jobs targeted', 'Subsidy for first-time formal sector employees'],
        lastVerified: '2026-02-25', launchYear: 2025
    }),
    s('c-gigworkers', 'Gig Workers Welfare Scheme', 'central', 'Employment', 'Identity cards and healthcare coverage for online platform gig workers via e-Shram portal.', 'Ministry of Labour', {
        officialWebsite: 'https://eshram.gov.in/', tags: ['New 2025'], benefitAmount: 'Healthcare Coverage',
        eligibility: ['Online platform gig workers', 'Registration on e-Shram portal'],
        benefits: ['Identity cards for gig workers', 'Healthcare under PM Jan Arogya Yojana', 'Social security benefits'],
        lastVerified: '2026-02-25', launchYear: 2025
    }),
    s('c-pmddky', 'PM Dhan-Dhaanya Krishi Yojana', 'central', 'Farmers', 'Six-year scheme covering 100 low-productivity districts to support 1.7 crore farmers on pulses and millets.', 'Ministry of Agriculture', {
        officialWebsite: 'https://www.india.gov.in/', tags: ['New 2025'], popular: true,
        eligibility: ['Farmers in 100 identified low-productivity districts'],
        benefits: ['Support for pulses and millet cultivation', 'Convergence of existing agricultural schemes', '1.7 crore farmers covered'],
        lastVerified: '2026-02-25', launchYear: 2025
    }),
    s('c-mecc', 'Micro-Enterprise Credit Cards', 'central', 'MSME', '₹5 lakh credit cards for Udyam-registered micro-enterprises to boost small business growth.', 'Ministry of Finance', {
        officialWebsite: 'https://udyamregistration.gov.in/', tags: ['New 2025'], benefitAmount: '₹5 Lakh Credit',
        eligibility: ['Udyam-registered micro-enterprises'],
        benefits: ['₹5 lakh credit card facility', 'Easy access to working capital', '10 lakh enterprises in first year'],
        lastVerified: '2026-02-25', launchYear: 2025
    }),
    s('c-fte', 'First-Time Entrepreneurs Scheme', 'central', 'MSME', 'Term loans up to ₹2 crore for women, SC, and ST first-time entrepreneurs.', 'Ministry of Finance', {
        officialWebsite: 'https://www.india.gov.in/', tags: ['New 2025'], benefitAmount: 'Up to ₹2 Crore',
        eligibility: ['First-time entrepreneurs', 'Women, Scheduled Castes, and Scheduled Tribes'],
        benefits: ['Term loans up to ₹2 crore over 5 years', '5 lakh entrepreneurs targeted'],
        lastVerified: '2026-02-25', launchYear: 2025
    }),
    s('c-smegf', 'SME Growth Fund', 'central', 'MSME', 'Dedicated ₹10,000 crore fund to create Champion SMEs and boost manufacturing.', 'DPIIT', {
        officialWebsite: 'https://www.investindia.gov.in/', tags: ['New 2026'], benefitAmount: '₹10,000 Cr Fund',
        eligibility: ['Small and Medium Enterprises with growth potential'],
        benefits: ['Equity and growth capital', 'Champion SME development', 'Manufacturing and export boost'],
        lastVerified: '2026-02-25', launchYear: 2026
    }),
    s('c-bvistaar', 'Bharat-VISTAAR', 'central', 'Farmers', 'Multilingual AI-based platform integrating agricultural resources and providing customized advisory to farmers.', 'Ministry of Agriculture', {
        officialWebsite: 'https://www.india.gov.in/', tags: ['New 2026'],
        eligibility: ['All Indian farmers'],
        benefits: ['AI-powered crop advisory', 'Multilingual support', 'Integrated agricultural resources'],
        lastVerified: '2026-02-25', launchYear: 2026
    }),
    s('c-caregiver', 'Caregiver Training Scheme', 'central', 'Health', 'Training 1.5 lakh caregivers with blended health and allied skills for elderly and patient care.', 'Ministry of Health', {
        officialWebsite: 'https://www.india.gov.in/', tags: ['New 2026'],
        eligibility: ['Indian citizens interested in healthcare caregiving'],
        benefits: ['Professional caregiver certification', 'Blended health skills training', '1.5 lakh trained caregivers'],
        lastVerified: '2026-02-25', launchYear: 2026
    }),
    s('c-saksham', 'Saksham Anganwadi & Poshan 2.0', 'central', 'Health', 'Nutritional support to 8 crore children, 1 crore lactating mothers, and 20 lakh adolescent girls.', 'Ministry of WCD', {
        officialWebsite: 'https://www.india.gov.in/', tags: ['Updated 2025'], popular: true,
        eligibility: ['Children 0-6 years', 'Pregnant/lactating women', 'Adolescent girls in targeted regions'],
        benefits: ['Nutritional supplementation', 'Growth monitoring', 'Early childhood care and education'],
        lastVerified: '2026-02-25', launchYear: 2025
    }),
    s('c-textile', 'Integrated Textile Programme', 'central', 'MSME', 'Five-component programme: National Fibre, Textile Expansion, Handloom/Handicraft, Tex-Eco, and Samarth 2.0.', 'Ministry of Textiles', {
        officialWebsite: 'https://www.investindia.gov.in/', tags: ['New 2026'],
        eligibility: ['Textile industry stakeholders', 'Handloom and handicraft artisans'],
        benefits: ['National Fibre Scheme', 'Employment generation in textiles', 'Handloom and handicraft promotion', 'Sustainable textile initiatives'],
        lastVerified: '2026-02-25', launchYear: 2026
    }),


    // === PM MUDRA Yojana (Free for all users) ===
    s('c-mudra', 'Pradhan Mantri MUDRA Yojana', 'central', 'MSME', 'Micro Units Development and Refinance Agency provides loans up to ₹10 Lakh to non-corporate, non-farm small/micro enterprises.', 'Ministry of Finance', {
        officialWebsite: 'https://www.mudra.org.in/', popular: true, tags: ['Popular', 'Free'],
        benefitAmount: '₹50,000 - ₹10 Lakh',
        interestRate: '7.3% - 12%',
        eligibility: ['Any Indian citizen with a business plan', 'Non-corporate small businesses', 'Manufacturing, trading, services, agri-allied activities'],
        benefits: ['Shishu: Loans up to ₹50,000', 'Kishore: Loans ₹50,001 to ₹5 Lakh', 'Tarun: Loans ₹5,00,001 to ₹10 Lakh', 'No collateral required', 'No processing fee'],
        documents: ['Aadhaar Card', 'PAN Card', 'Business plan/proposal', 'Address proof', 'Passport size photos', 'Caste certificate (if applicable)'],
        howToApply: ['Visit any bank/NBFC/MFI', 'Submit MUDRA loan application', 'Provide business plan', 'Bank evaluates and sanctions'],
        lastVerified: '2026-02-26', launchYear: 2015
    }),

    // === Sukanya Samriddhi Yojana (Free for all users) ===
    s('c-ssy', 'Sukanya Samriddhi Yojana', 'central', 'Women', 'A small deposit scheme for the girl child under Beti Bachao Beti Padhao campaign offering attractive interest rates and tax benefits.', 'Ministry of Finance', {
        officialWebsite: 'https://www.nsiindia.gov.in/', popular: true, tags: ['Popular', 'Free'],
        benefitAmount: '₹250 - ₹1.5 Lakh/year',
        interestRate: '8.2% p.a.',
        tenure: '21 years (deposits for 15 years)',
        minAmount: '₹250',
        maxAmount: '₹1,50,000/year',
        taxBenefit: 'EEE — Exempt under 80C, Interest exempt, Maturity exempt',
        eligibility: ['Girl child below 10 years of age', 'Only 2 accounts per family (exception for twins)', 'Indian resident'],
        benefits: ['High interest rate (8.2% p.a.)', 'Tax deduction under Section 80C', 'Partial withdrawal at age 18 for education', 'Full maturity at age 21', 'Transferable across India'],
        documents: ['Birth certificate of girl child', 'Parents\' Aadhaar Card', 'Address proof', 'Passport photos'],
        howToApply: ['Visit any post office or authorized bank', 'Fill SSY account opening form', 'Submit documents', 'Make initial deposit of ₹250+'],
        lastVerified: '2026-02-26', launchYear: 2015
    }),
];

// Free schemes available to all users (non-premium)
export const FREE_SCHEME_IDS = ['c-mudra', 'c-ssy'];

