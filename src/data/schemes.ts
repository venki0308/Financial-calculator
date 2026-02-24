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

    // === KARNATAKA ===
    s('ka-gl', 'Gruha Lakshmi', 'state', 'Women', 'Monthly financial assistance to the woman head of every household in Karnataka.', 'Govt of Karnataka', {
        state: 'Karnataka', officialWebsite: 'https://sevasindhu.karnataka.gov.in/', popular: true, benefitAmount: '₹2,000/month',
        eligibility: ['Woman head of household', 'APL/BPL/Antyodaya ration card holder'],
        benefits: ['₹2,000 direct benefit transfer monthly'],
        lastVerified: '2026-02-22', launchYear: 2023
    }),
    s('ka-gj', 'Gruha Jyoti', 'state', 'Social Welfare', 'Free electricity up to 200 units for every domestic household in Karnataka.', 'Govt of Karnataka', {
        state: 'Karnataka', officialWebsite: 'https://bescom.karnataka.gov.in/', popular: true,
        benefits: ['Zero bill up to 200 units per month'],
        lastVerified: '2026-02-22', launchYear: 2023
    }),
    s('ka-sk', 'Shakti Scheme', 'state', 'Women', 'Free bus travel for women and girl students within Karnataka in non-premium buses.', 'Govt of Karnataka', {
        state: 'Karnataka', officialWebsite: 'https://ksrtc.in/',
        benefits: ['Free travel in KSRTC/BMTC/NWKRTC/KKRTC buses'],
        lastVerified: '2026-02-22', launchYear: 2023
    }),
    s('ka-ab', 'Anna Bhagya', 'state', 'Social Welfare', 'Providing additional rice or cash in lieu of rice to BPL families.', 'Govt of Karnataka', {
        state: 'Karnataka', officialWebsite: 'https://ahara.kar.nic.in/', benefitAmount: '10kg Rice',
        benefits: ['10kg free rice per person per month'],
        lastVerified: '2026-02-22', launchYear: 2023
    }),
    s('ka-yn', 'Yuva Nidhi', 'state', 'Employment', 'Financial assistance to unemployed graduates and diploma holders.', 'Govt of Karnataka', {
        state: 'Karnataka', officialWebsite: 'https://kaushalkar.com/', benefitAmount: '₹3,000/month',
        eligibility: ['Graduates/Diploma holders unemployed for 6 months'],
        benefits: ['₹3,000 for graduates', '₹1,500 for diploma holders monthly'],
        lastVerified: '2026-02-22', launchYear: 2023
    }),

    // === TELANGANA - Congress Government (2023-2026) ===
    s('ts-ml', 'Mahalakshmi Scheme', 'state', 'Women', 'Free bus travel for women in TSRTC buses across Telangana.', 'Govt of Telangana', {
        state: 'Telangana', officialWebsite: 'https://tsrtc.telangana.gov.in/', popular: true,
        benefits: ['Free travel in all TSRTC bus services for women'],
        lastVerified: '2026-02-22', launchYear: 2023
    }),
    s('ts-rb', 'Rythu Bharosa', 'state', 'Farmers', 'Enhanced investment support scheme for farmers to cover cultivation costs.', 'Govt of Telangana', {
        state: 'Telangana', officialWebsite: 'https://rythubharosa.telangana.gov.in/', popular: true, benefitAmount: '₹15,000/acre/year',
        benefits: ['₹7,500 per acre per season (Kharif + Rabi)'],
        lastVerified: '2026-02-22', launchYear: 2024
    }),
    s('ts-gj', 'Gruha Jyoti (Indiramma Indlu)', 'state', 'Housing', 'Free housing for poor families under the Indiramma housing initiative.', 'Govt of Telangana', {
        state: 'Telangana', officialWebsite: 'https://webtgplanning.cgg.gov.in/',
        benefits: ['Free pucca house for eligible BPL families'],
        lastVerified: '2026-02-22', launchYear: 2024
    }),
    s('ts-iab', 'Indiramma Atmiya Bharosa', 'state', 'Women', '₹12,000 per year for LPG cylinders to women from BPL families.', 'Govt of Telangana', {
        state: 'Telangana', officialWebsite: 'https://www.telangana.gov.in/', benefitAmount: '₹12,000/year',
        eligibility: ['Women from BPL families', 'Resident of Telangana'],
        benefits: ['₹12,000 annual support for LPG cylinder purchases'],
        lastVerified: '2026-02-22', launchYear: 2024
    }),
    s('ts-ch2', 'Cheyutha 2.0', 'state', 'Women', '₹2,500 per month financial support to women SHG members.', 'Govt of Telangana', {
        state: 'Telangana', officialWebsite: 'https://www.telangana.gov.in/', benefitAmount: '₹2,500/month',
        eligibility: ['Women members of Self Help Groups'],
        benefits: ['Monthly financial assistance of ₹2,500'],
        lastVerified: '2026-02-22', launchYear: 2024
    }),
    s('ts-ihc', 'Indiramma Health Card', 'state', 'Health', '₹10 lakh health coverage for all Telangana families.', 'Govt of Telangana', {
        state: 'Telangana', officialWebsite: 'https://webportal.telangana.gov.in/', benefitAmount: '₹10 Lakh',
        benefits: ['₹10 lakh cashless treatment in empaneled hospitals'],
        lastVerified: '2026-02-22', launchYear: 2024
    }),

    // === ANDHRA PRADESH - NDA Government (2024-2026) ===
    s('ap-ntb', 'NTR Bharosa (Pension Scheme)', 'state', 'Pension', 'Enhanced pension scheme for senior citizens, widows, and disabled persons.', 'Govt of AP', {
        state: 'Andhra Pradesh', officialWebsite: 'https://navasakam.ap.gov.in/', popular: true, benefitAmount: '₹4,000/month',
        eligibility: ['Senior citizens aged 60+', 'Widows', 'Persons with disabilities'],
        benefits: ['₹4,000 monthly pension (increased from ₹3,000)'],
        lastVerified: '2026-02-22', launchYear: 2024
    }),
    s('ap-ac', 'Anna Canteen', 'state', 'Social Welfare', 'Subsidized meals for the public at affordable prices across AP.', 'Govt of AP', {
        state: 'Andhra Pradesh', officialWebsite: 'https://www.ap.gov.in/', benefitAmount: '₹5 meals',
        benefits: ['Nutritious meals at ₹5 per plate'],
        lastVerified: '2026-02-22', launchYear: 2024
    }),
    s('ap-fgc', 'Free Gas Cylinder Scheme', 'state', 'Women', '3 free LPG cylinders per year for women from BPL families.', 'Govt of AP', {
        state: 'Andhra Pradesh', officialWebsite: 'https://www.ap.gov.in/', benefitAmount: '3 free cylinders/year',
        eligibility: ['Women from BPL families', 'Domestic LPG connection holder'],
        benefits: ['3 free LPG cylinders annually'],
        lastVerified: '2026-02-22', launchYear: 2024
    }),
    s('ap-tv', 'Talliki Vandanam', 'state', 'Education', '₹15,000 per year for parents of school-going children.', 'Govt of AP', {
        state: 'Andhra Pradesh', officialWebsite: 'https://navasakam.ap.gov.in/', benefitAmount: '₹15,000/year',
        eligibility: ['Parents of children studying in government schools'],
        benefits: ['₹15,000 annual education support'],
        lastVerified: '2026-02-22', launchYear: 2024
    }),
    s('ap-as', 'Aarogya Sri', 'state', 'Health', 'Health insurance scheme covering up to ₹25 lakh for medical treatment.', 'Govt of AP', {
        state: 'Andhra Pradesh', officialWebsite: 'https://aarogyasri.ap.gov.in/', popular: true, benefitAmount: '₹25 Lakh',
        benefits: ['₹25 lakh cashless treatment in empaneled hospitals'],
        lastVerified: '2026-02-22', launchYear: 2024
    }),

    // === TAMIL NADU ===
    s('tn-kmut', 'Kalaignar Magalir Urimai Thogai', 'state', 'Women', 'Monthly honorarium to women heads of families.', 'Govt of Tamil Nadu', {
        state: 'Tamil Nadu', officialWebsite: 'https://www.tn.gov.in/', popular: true, benefitAmount: '₹1,000/month',
        benefits: ['Monthly direct transfer of ₹1,000'],
        lastVerified: '2026-02-22', launchYear: 2023
    }),
    s('tn-bs', 'Chief Minister\'s Breakfast Scheme', 'state', 'Education', 'Providing nutritious breakfast to government school students.', 'Govt of Tamil Nadu', {
        state: 'Tamil Nadu', officialWebsite: 'https://schooleducation.tn.gov.in/',
        benefits: ['Daily free breakfast for students in Classes 1-5'],
        lastVerified: '2026-02-22', launchYear: 2022
    }),

    // === MAHARASHTRA ===
    s('mh-lby', 'Ladki Bahin Yojana', 'state', 'Women', 'Direct cash transfer to women for financial independence and health.', 'Govt of Maharashtra', {
        state: 'Maharashtra', officialWebsite: 'https://womenchild.maharashtra.gov.in/', popular: true, benefitAmount: '₹1,500/month',
        eligibility: ['Women aged 21-65', 'Annual income below ₹2.5 lakh'],
        benefits: ['₹1,500 monthly benefit'],
        lastVerified: '2026-02-22', launchYear: 2024
    }),
    s('mh-nsy', 'Namo Shetkari Yojana', 'state', 'Farmers', 'Supplementing PM-KISAN to provide additional income to farmers.', 'Govt of Maharashtra', {
        state: 'Maharashtra', officialWebsite: 'https://mahakrishidoot.maharashtra.gov.in/', benefitAmount: '₹6,000/year',
        benefits: ['₹6,000 additional annual support for farmers'],
        lastVerified: '2026-02-22', launchYear: 2023
    }),

    // === GUJARAT ===
    s('gj-vdy2', 'Vahali Dikri Yojana 2.0', 'state', 'Women', 'Improving the life style of the girl child and promoting education.', 'Govt of Gujarat', {
        state: 'Gujarat', officialWebsite: 'https://esamajkalyan.gujarat.gov.in/', benefitAmount: '₹1.1 Lakh',
        benefits: ['₹4,000 (Class 1)', '₹6,000 (Class 9)', '₹1 Lakh (Age 18)'],
        lastVerified: '2026-02-22', launchYear: 2019
    }),

    // === UTTAR PRADESH ===
    s('up-ksy', 'Mukhyamantri Kanya Sumangala Yojana', 'state', 'Women', 'Financial assistance to girl child at various developmental stages.', 'Govt of UP', {
        state: 'Uttar Pradesh', officialWebsite: 'https://mksy.up.gov.in/', popular: true, benefitAmount: '₹25,000',
        benefits: ['Fixed amount at birth, vaccination, and education milestones'],
        lastVerified: '2026-02-22', launchYear: 2019
    }),
    s('up-bs', 'UP BC Sakhi Yojana', 'state', 'Employment', 'Empowering women as Banking Correspondent Sakhis in rural areas.', 'Govt of UP', {
        state: 'Uttar Pradesh', officialWebsite: 'https://upbcsakhi.upsrlm.org/',
        benefits: ['Digital banking training', 'Monthly stipend during initial months'],
        lastVerified: '2026-02-22', launchYear: 2020
    }),

    // === WEST BENGAL ===
    s('wb-lb2', 'Lakshmir Bhandar 2.0', 'state', 'Women', 'Providing financial support specifically to women heads of the household.', 'Govt of West Bengal', {
        state: 'West Bengal', officialWebsite: 'https://wb.gov.in/', popular: true, benefitAmount: '₹1,200/month',
        benefits: ['₹1,200 (SC/ST)', '₹1,000 (General) monthly'],
        lastVerified: '2026-02-22', launchYear: 2021
    }),

    // === RAJASTHAN ===
    s('rj-ch', 'Chiranjeevi Health Insurance', 'state', 'Health', 'Universal health insurance scheme covering almost all families.', 'Govt of Rajasthan', {
        state: 'Rajasthan', officialWebsite: 'https://chiranjeevi.rajasthan.gov.in/', popular: true, benefitAmount: 'Free Healthcare',
        benefits: ['Cashless treatment in govt/private hospitals'],
        lastVerified: '2026-02-22', launchYear: 2021
    }),

    // === DELHI ===
    s('dl-mmsy', 'Mukhyamantri Mahila Samman Yojana', 'state', 'Women', 'Providing monthly support to every woman aged 18 and above.', 'Govt of Delhi', {
        state: 'Delhi', officialWebsite: 'https://delhigovt.nic.in/', benefitAmount: '₹1,000/month',
        eligibility: ['Women aged 18+', 'Voter in Delhi', 'Not a taxpayer'],
        benefits: ['Monthly allowance of ₹1,000'],
        lastVerified: '2026-02-22', launchYear: 2024
    }),
];
