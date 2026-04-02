// ═══════════════════════════════════════════════════════════════
//  FinCalix — Health Insurance Comparison Data
//  Source: IRDAI Annual Report 2023-24 & verified insurer disclosures
//  This is STATIC data for INFORMATIONAL comparison only.
//  FinCalix does NOT sell insurance.
// ═══════════════════════════════════════════════════════════════

// ── Insurer Master Data ──────────────────────────────────────

export interface Insurer {
  id: string;
  name: string;
  shortName: string;
  planName: string;
  type: 'standalone' | 'general';
  csr: number;
  networkHospitals: number;
  inHouseClaims: boolean;
  overallRating: number;
  bestFor: string;
  website: string;
}

export const INSURERS: Insurer[] = [
  {
    id: 'hdfc_ergo', name: 'HDFC ERGO', shortName: 'HDFC ERGO',
    planName: 'Optima Secure', type: 'general', csr: 99.16,
    networkHospitals: 13000, inHouseClaims: true, overallRating: 4.7,
    bestFor: 'Best overall — highest trust & digital claims',
    website: 'hdfcergo.com'
  },
  {
    id: 'niva_bupa', name: 'Niva Bupa', shortName: 'Niva Bupa',
    planName: 'ReAssure 2.0', type: 'standalone', csr: 92.4,
    networkHospitals: 10000, inHouseClaims: true, overallRating: 4.5,
    bestFor: 'Best for families — unlimited restoration',
    website: 'nivabupa.com'
  },
  {
    id: 'care_health', name: 'Care Health', shortName: 'Care',
    planName: 'Care Supreme', type: 'standalone', csr: 92.77,
    networkHospitals: 11400, inHouseClaims: true, overallRating: 4.4,
    bestFor: 'Best value — strong CSR + no room rent cap',
    website: 'careinsurance.com'
  },
  {
    id: 'star_health', name: 'Star Health', shortName: 'Star Health',
    planName: 'Family Health Optima', type: 'standalone', csr: 99.01,
    networkHospitals: 14000, inHouseClaims: true, overallRating: 4.2,
    bestFor: 'Largest network — best for Tier 2/3 cities',
    website: 'starhealth.in'
  },
  {
    id: 'aditya_birla', name: 'Aditya Birla', shortName: 'ABHI',
    planName: 'Activ One MAX', type: 'standalone', csr: 92.97,
    networkHospitals: 13000, inHouseClaims: true, overallRating: 4.3,
    bestFor: 'Best wellness benefits — earn premium discounts',
    website: 'adityabirlacapital.com'
  },
  {
    id: 'tata_aig', name: 'Tata AIG', shortName: 'Tata AIG',
    planName: 'Medicare Premier', type: 'general', csr: 98.0,
    networkHospitals: 10000, inHouseClaims: false, overallRating: 4.3,
    bestFor: 'Best balanced performer across all metrics',
    website: 'tataaig.com'
  },
  {
    id: 'icici_lombard', name: 'ICICI Lombard', shortName: 'ICICI Lomb.',
    planName: 'Health AdvantEdge', type: 'general', csr: 99.30,
    networkHospitals: 10800, inHouseClaims: false, overallRating: 4.2,
    bestFor: 'Fastest cashless approval — 30 min processing',
    website: 'icicilombard.com'
  },
  {
    id: 'acko', name: 'Acko Health', shortName: 'Acko',
    planName: 'Platinum Health', type: 'general', csr: 99.91,
    networkHospitals: 7000, inHouseClaims: true, overallRating: 4.1,
    bestFor: 'Highest CSR — best for digital-first users',
    website: 'acko.com'
  }
];

// ── Coverage Features Matrix ─────────────────────────────────

export interface CoverageFeature {
  id: string;
  category: string;
  label: string;
  description: string;
  importance: 'critical' | 'important' | 'good_to_have';
}

export interface InsurerFeature {
  insurerId: string;
  featureId: string;
  covered: 'yes' | 'no' | 'partial' | 'addon';
  note: string;
}

export const COVERAGE_FEATURES: CoverageFeature[] = [
  // HOSPITALIZATION
  { id: 'room_rent', category: 'Hospitalization', label: 'Room Rent Cap', importance: 'critical', description: 'Limit on hospital room rent per day' },
  { id: 'icu_cover', category: 'Hospitalization', label: 'ICU Cover', importance: 'critical', description: 'Intensive care unit charges covered' },
  { id: 'daycare', category: 'Hospitalization', label: 'Day Care (500+ procedures)', importance: 'critical', description: 'Procedures not needing 24hr admission' },
  { id: 'domiciliary', category: 'Hospitalization', label: 'Domiciliary Treatment', importance: 'important', description: 'Home-based treatment if hospital unavailable' },
  { id: 'pre_post_hosp', category: 'Hospitalization', label: 'Pre & Post Hospitalisation', importance: 'critical', description: '60 days pre + 180 days post cover' },
  { id: 'ambulance', category: 'Hospitalization', label: 'Ambulance Cover', importance: 'important', description: 'Emergency ambulance charges' },
  { id: 'organ_donor', category: 'Hospitalization', label: 'Organ Donor Cover', importance: 'good_to_have', description: 'Donor treatment expenses covered' },

  // RESTORATION & BONUS
  { id: 'restoration', category: 'Restoration & Bonus', label: 'Sum Insured Restoration', importance: 'critical', description: 'Automatic refill after claim exhaustion' },
  { id: 'ncb', category: 'Restoration & Bonus', label: 'No Claim Bonus (NCB)', importance: 'critical', description: '% increase in SI for claim-free years' },
  { id: 'ncb_protection', category: 'Restoration & Bonus', label: 'NCB Protection', importance: 'important', description: 'NCB kept intact even after small claim' },

  // WAITING PERIODS
  { id: 'ped_waiting', category: 'Waiting Periods', label: 'PED Waiting Period', importance: 'critical', description: 'Months to wait for pre-existing diseases' },
  { id: 'initial_waiting', category: 'Waiting Periods', label: 'Initial Waiting Period', importance: 'critical', description: 'Days before any claim allowed (usually 30d)' },
  { id: 'specific_waiting', category: 'Waiting Periods', label: 'Specific Disease Waiting', importance: 'important', description: 'Wait for conditions like hernia, cataract' },

  // FAMILY COVERAGE
  { id: 'maternity', category: 'Family Coverage', label: 'Maternity Cover', importance: 'important', description: 'Pre/post delivery + newborn expenses' },
  { id: 'newborn', category: 'Family Coverage', label: 'Newborn Cover from Day 1', importance: 'important', description: 'Newborn covered from birth, no waiting' },
  { id: 'child_vaccination', category: 'Family Coverage', label: 'Child Vaccination Cover', importance: 'good_to_have', description: 'Routine vaccination costs covered' },
  { id: 'children_cover', category: 'Family Coverage', label: 'Children Age Coverage', importance: 'critical', description: 'Minimum and maximum age for children' },

  // SENIOR COVERAGE
  { id: 'senior_cover', category: 'Senior Coverage', label: 'Senior Citizen Cover (60+)', importance: 'critical', description: 'Coverage availability for 60+ members' },
  { id: 'no_copay_senior', category: 'Senior Coverage', label: 'No Co-pay for Seniors', importance: 'important', description: 'Seniors covered without extra co-payment' },
  { id: 'cataract', category: 'Senior Coverage', label: 'Cataract Surgery Cover', importance: 'important', description: 'Cataract treatment included' },
  { id: 'joint_replacement', category: 'Senior Coverage', label: 'Joint Replacement Cover', importance: 'important', description: 'Knee/hip replacement included' },

  // MODERN COVERAGE
  { id: 'mental_health', category: 'Modern Coverage', label: 'Mental Health Cover', importance: 'important', description: 'Psychiatric treatment & counselling' },
  { id: 'ayush', category: 'Modern Coverage', label: 'AYUSH Treatment', importance: 'good_to_have', description: 'Ayurveda, Yoga, Unani, Siddha, Homeopathy' },
  { id: 'opd', category: 'Modern Coverage', label: 'OPD / Outpatient Cover', importance: 'good_to_have', description: 'Doctor consultations without hospitalisation' },
  { id: 'teleconsult', category: 'Modern Coverage', label: 'Tele-consultation', importance: 'good_to_have', description: 'Online doctor consult included' },
  { id: 'wellness', category: 'Modern Coverage', label: 'Wellness & Health Rewards', importance: 'good_to_have', description: 'Fitness rewards, premium discounts' },
  { id: 'consumables', category: 'Modern Coverage', label: 'Consumables Cover', importance: 'important', description: 'Gloves, syringes, PPE covered' },
  { id: 'robotic_surgery', category: 'Modern Coverage', label: 'Robotic Surgery Cover', importance: 'good_to_have', description: 'Advanced surgical procedures included' },

  // CLAIMS
  { id: 'cashless_everywhere', category: 'Claims', label: 'Cashless Everywhere', importance: 'important', description: 'Cashless at non-network hospitals too' },
  { id: 'claim_speed', category: 'Claims', label: 'Cashless Approval Speed', importance: 'critical', description: 'Time to approve cashless hospitalisation' },
  { id: 'lifetime_renewability', category: 'Claims', label: 'Lifetime Renewability', importance: 'critical', description: 'Policy renewable for life, no age bar' },
  { id: 'portability', category: 'Claims', label: 'Free Portability', importance: 'important', description: 'Switch insurer without losing benefits' },
];

export const INSURER_FEATURES: InsurerFeature[] = [
  // ── HDFC ERGO Optima Secure ──
  { insurerId:'hdfc_ergo', featureId:'room_rent', covered:'yes', note:'No room rent capping' },
  { insurerId:'hdfc_ergo', featureId:'icu_cover', covered:'yes', note:'Full ICU coverage' },
  { insurerId:'hdfc_ergo', featureId:'daycare', covered:'yes', note:'All daycare procedures' },
  { insurerId:'hdfc_ergo', featureId:'domiciliary', covered:'yes', note:'Covered up to SI' },
  { insurerId:'hdfc_ergo', featureId:'pre_post_hosp', covered:'yes', note:'60+180 days' },
  { insurerId:'hdfc_ergo', featureId:'ambulance', covered:'yes', note:'Emergency ambulance' },
  { insurerId:'hdfc_ergo', featureId:'organ_donor', covered:'yes', note:'Donor expenses covered' },
  { insurerId:'hdfc_ergo', featureId:'restoration', covered:'yes', note:'100% restore after first claim' },
  { insurerId:'hdfc_ergo', featureId:'ncb', covered:'yes', note:'50% NCB over 5 years' },
  { insurerId:'hdfc_ergo', featureId:'ncb_protection', covered:'addon', note:'Available as rider' },
  { insurerId:'hdfc_ergo', featureId:'ped_waiting', covered:'partial', note:'36 months PED waiting' },
  { insurerId:'hdfc_ergo', featureId:'initial_waiting', covered:'partial', note:'30 days initial wait' },
  { insurerId:'hdfc_ergo', featureId:'specific_waiting', covered:'partial', note:'24 months specific diseases' },
  { insurerId:'hdfc_ergo', featureId:'maternity', covered:'addon', note:'Available as add-on' },
  { insurerId:'hdfc_ergo', featureId:'newborn', covered:'yes', note:'Day 1 newborn cover' },
  { insurerId:'hdfc_ergo', featureId:'child_vaccination', covered:'no', note:'Not included in base' },
  { insurerId:'hdfc_ergo', featureId:'children_cover', covered:'yes', note:'91 days to 25 years' },
  { insurerId:'hdfc_ergo', featureId:'senior_cover', covered:'yes', note:'Covers up to 65 entry age' },
  { insurerId:'hdfc_ergo', featureId:'no_copay_senior', covered:'yes', note:'No copay for seniors' },
  { insurerId:'hdfc_ergo', featureId:'cataract', covered:'yes', note:'After 2yr waiting period' },
  { insurerId:'hdfc_ergo', featureId:'joint_replacement', covered:'yes', note:'After waiting period' },
  { insurerId:'hdfc_ergo', featureId:'mental_health', covered:'yes', note:'Psychiatric hospitalisation' },
  { insurerId:'hdfc_ergo', featureId:'ayush', covered:'yes', note:'AYUSH treatments covered' },
  { insurerId:'hdfc_ergo', featureId:'opd', covered:'addon', note:'Optima Wellbeing add-on' },
  { insurerId:'hdfc_ergo', featureId:'teleconsult', covered:'yes', note:'Virtual consultations' },
  { insurerId:'hdfc_ergo', featureId:'wellness', covered:'yes', note:'Annual health check-up' },
  { insurerId:'hdfc_ergo', featureId:'consumables', covered:'yes', note:'Covered under Protect benefit' },
  { insurerId:'hdfc_ergo', featureId:'robotic_surgery', covered:'yes', note:'Modern treatment covered' },
  { insurerId:'hdfc_ergo', featureId:'cashless_everywhere', covered:'yes', note:'Any hospital in emergency' },
  { insurerId:'hdfc_ergo', featureId:'claim_speed', covered:'yes', note:'Under 20 min approval' },
  { insurerId:'hdfc_ergo', featureId:'lifetime_renewability', covered:'yes', note:'Lifetime renewability' },
  { insurerId:'hdfc_ergo', featureId:'portability', covered:'yes', note:'IRDAI mandated portability' },

  // ── NIVA BUPA ReAssure 2.0 ──
  { insurerId:'niva_bupa', featureId:'room_rent', covered:'yes', note:'No room rent capping' },
  { insurerId:'niva_bupa', featureId:'icu_cover', covered:'yes', note:'Full ICU coverage' },
  { insurerId:'niva_bupa', featureId:'daycare', covered:'yes', note:'All daycare procedures' },
  { insurerId:'niva_bupa', featureId:'domiciliary', covered:'yes', note:'Home healthcare covered' },
  { insurerId:'niva_bupa', featureId:'pre_post_hosp', covered:'yes', note:'60+180 days' },
  { insurerId:'niva_bupa', featureId:'ambulance', covered:'yes', note:'Emergency + air ambulance' },
  { insurerId:'niva_bupa', featureId:'organ_donor', covered:'yes', note:'Donor expenses covered' },
  { insurerId:'niva_bupa', featureId:'restoration', covered:'yes', note:'Unlimited restoration — unique feature' },
  { insurerId:'niva_bupa', featureId:'ncb', covered:'yes', note:'Booster: up to 100% NCB' },
  { insurerId:'niva_bupa', featureId:'ncb_protection', covered:'yes', note:'NCB protected after small claim' },
  { insurerId:'niva_bupa', featureId:'ped_waiting', covered:'partial', note:'36 months PED waiting' },
  { insurerId:'niva_bupa', featureId:'initial_waiting', covered:'partial', note:'30 days initial wait' },
  { insurerId:'niva_bupa', featureId:'specific_waiting', covered:'partial', note:'24 months specific' },
  { insurerId:'niva_bupa', featureId:'maternity', covered:'partial', note:'2 yr waiting, covered in premium plans' },
  { insurerId:'niva_bupa', featureId:'newborn', covered:'yes', note:'Day 1 newborn cover' },
  { insurerId:'niva_bupa', featureId:'child_vaccination', covered:'yes', note:'Vaccination covered in some plans' },
  { insurerId:'niva_bupa', featureId:'children_cover', covered:'yes', note:'91 days to 25 years' },
  { insurerId:'niva_bupa', featureId:'senior_cover', covered:'yes', note:'Senior First plan for 60-75' },
  { insurerId:'niva_bupa', featureId:'no_copay_senior', covered:'partial', note:'Some plans have copay for seniors' },
  { insurerId:'niva_bupa', featureId:'cataract', covered:'yes', note:'After waiting period' },
  { insurerId:'niva_bupa', featureId:'joint_replacement', covered:'yes', note:'After waiting period' },
  { insurerId:'niva_bupa', featureId:'mental_health', covered:'yes', note:'Mental health included' },
  { insurerId:'niva_bupa', featureId:'ayush', covered:'yes', note:'AYUSH covered' },
  { insurerId:'niva_bupa', featureId:'opd', covered:'addon', note:'OPD add-on available' },
  { insurerId:'niva_bupa', featureId:'teleconsult', covered:'yes', note:'Tele-consultation included' },
  { insurerId:'niva_bupa', featureId:'wellness', covered:'yes', note:'Annual check-up from day 1' },
  { insurerId:'niva_bupa', featureId:'consumables', covered:'no', note:'Not in base plan' },
  { insurerId:'niva_bupa', featureId:'robotic_surgery', covered:'yes', note:'Modern treatments covered' },
  { insurerId:'niva_bupa', featureId:'cashless_everywhere', covered:'yes', note:'Cashless at network hospitals' },
  { insurerId:'niva_bupa', featureId:'claim_speed', covered:'yes', note:'30 min cashless approval' },
  { insurerId:'niva_bupa', featureId:'lifetime_renewability', covered:'yes', note:'Lifetime renewability' },
  { insurerId:'niva_bupa', featureId:'portability', covered:'yes', note:'Free portability allowed' },

  // ── CARE HEALTH Care Supreme ──
  { insurerId:'care_health', featureId:'room_rent', covered:'yes', note:'No room rent cap' },
  { insurerId:'care_health', featureId:'icu_cover', covered:'yes', note:'Full ICU coverage' },
  { insurerId:'care_health', featureId:'daycare', covered:'yes', note:'All daycare procedures' },
  { insurerId:'care_health', featureId:'domiciliary', covered:'yes', note:'Home treatment covered' },
  { insurerId:'care_health', featureId:'pre_post_hosp', covered:'yes', note:'60+180 days' },
  { insurerId:'care_health', featureId:'ambulance', covered:'yes', note:'Emergency ambulance' },
  { insurerId:'care_health', featureId:'organ_donor', covered:'yes', note:'Donor expenses' },
  { insurerId:'care_health', featureId:'restoration', covered:'yes', note:'Unlimited recharge — unique feature' },
  { insurerId:'care_health', featureId:'ncb', covered:'yes', note:'NCB up to 100% of SI' },
  { insurerId:'care_health', featureId:'ncb_protection', covered:'yes', note:'Protected after claim' },
  { insurerId:'care_health', featureId:'ped_waiting', covered:'partial', note:'48 months PED waiting' },
  { insurerId:'care_health', featureId:'initial_waiting', covered:'partial', note:'30 days initial' },
  { insurerId:'care_health', featureId:'specific_waiting', covered:'partial', note:'24 months specific' },
  { insurerId:'care_health', featureId:'maternity', covered:'partial', note:'Care Joy plan for maternity' },
  { insurerId:'care_health', featureId:'newborn', covered:'yes', note:'Newborn covered' },
  { insurerId:'care_health', featureId:'child_vaccination', covered:'no', note:'Not included' },
  { insurerId:'care_health', featureId:'children_cover', covered:'yes', note:'3 months to 25 years' },
  { insurerId:'care_health', featureId:'senior_cover', covered:'yes', note:'Care Senior up to age 80' },
  { insurerId:'care_health', featureId:'no_copay_senior', covered:'partial', note:'Some senior plans have copay' },
  { insurerId:'care_health', featureId:'cataract', covered:'yes', note:'After waiting period' },
  { insurerId:'care_health', featureId:'joint_replacement', covered:'yes', note:'After waiting period' },
  { insurerId:'care_health', featureId:'mental_health', covered:'yes', note:'Mental illness covered' },
  { insurerId:'care_health', featureId:'ayush', covered:'yes', note:'AYUSH covered' },
  { insurerId:'care_health', featureId:'opd', covered:'no', note:'Not in base plan' },
  { insurerId:'care_health', featureId:'teleconsult', covered:'yes', note:'Teleconsult included' },
  { insurerId:'care_health', featureId:'wellness', covered:'yes', note:'Annual health check-up' },
  { insurerId:'care_health', featureId:'consumables', covered:'no', note:'Not covered' },
  { insurerId:'care_health', featureId:'robotic_surgery', covered:'yes', note:'Modern treatments' },
  { insurerId:'care_health', featureId:'cashless_everywhere', covered:'yes', note:'Network cashless' },
  { insurerId:'care_health', featureId:'claim_speed', covered:'yes', note:'In-house, fast processing' },
  { insurerId:'care_health', featureId:'lifetime_renewability', covered:'yes', note:'Lifetime' },
  { insurerId:'care_health', featureId:'portability', covered:'yes', note:'Portable' },

  // ── STAR HEALTH Family Health Optima ──
  { insurerId:'star_health', featureId:'room_rent', covered:'yes', note:'No room rent capping' },
  { insurerId:'star_health', featureId:'icu_cover', covered:'yes', note:'Full ICU coverage' },
  { insurerId:'star_health', featureId:'daycare', covered:'yes', note:'405+ daycare procedures' },
  { insurerId:'star_health', featureId:'domiciliary', covered:'yes', note:'Domiciliary covered' },
  { insurerId:'star_health', featureId:'pre_post_hosp', covered:'yes', note:'60+90 days' },
  { insurerId:'star_health', featureId:'ambulance', covered:'yes', note:'Air + road ambulance' },
  { insurerId:'star_health', featureId:'organ_donor', covered:'yes', note:'Donor covered' },
  { insurerId:'star_health', featureId:'restoration', covered:'yes', note:'100% restore once per year' },
  { insurerId:'star_health', featureId:'ncb', covered:'yes', note:'Cumulative bonus' },
  { insurerId:'star_health', featureId:'ncb_protection', covered:'no', note:'Not available' },
  { insurerId:'star_health', featureId:'ped_waiting', covered:'partial', note:'48 months PED waiting' },
  { insurerId:'star_health', featureId:'initial_waiting', covered:'partial', note:'30 days initial' },
  { insurerId:'star_health', featureId:'specific_waiting', covered:'partial', note:'24 months specific' },
  { insurerId:'star_health', featureId:'maternity', covered:'yes', note:'Young Star plan includes maternity' },
  { insurerId:'star_health', featureId:'newborn', covered:'yes', note:'Newborn from day 1' },
  { insurerId:'star_health', featureId:'child_vaccination', covered:'yes', note:'Vaccination covered' },
  { insurerId:'star_health', featureId:'children_cover', covered:'yes', note:'16 days to 25 years' },
  { insurerId:'star_health', featureId:'senior_cover', covered:'yes', note:'Red Carpet for 60-75 seniors' },
  { insurerId:'star_health', featureId:'no_copay_senior', covered:'partial', note:'Co-pay applies for senior plans' },
  { insurerId:'star_health', featureId:'cataract', covered:'yes', note:'Cataract from year 2' },
  { insurerId:'star_health', featureId:'joint_replacement', covered:'yes', note:'Joint replacement covered' },
  { insurerId:'star_health', featureId:'mental_health', covered:'yes', note:'Mental illness covered' },
  { insurerId:'star_health', featureId:'ayush', covered:'yes', note:'AYUSH covered' },
  { insurerId:'star_health', featureId:'opd', covered:'no', note:'Not in base plan' },
  { insurerId:'star_health', featureId:'teleconsult', covered:'yes', note:'Tele-consult available' },
  { insurerId:'star_health', featureId:'wellness', covered:'yes', note:'Annual health check-up' },
  { insurerId:'star_health', featureId:'consumables', covered:'no', note:'Not covered' },
  { insurerId:'star_health', featureId:'robotic_surgery', covered:'yes', note:'Modern treatments' },
  { insurerId:'star_health', featureId:'cashless_everywhere', covered:'yes', note:'14000+ network hospitals' },
  { insurerId:'star_health', featureId:'claim_speed', covered:'yes', note:'30 min cashless at network' },
  { insurerId:'star_health', featureId:'lifetime_renewability', covered:'yes', note:'Lifetime' },
  { insurerId:'star_health', featureId:'portability', covered:'yes', note:'Portable' },

  // ── ADITYA BIRLA Activ One MAX ──
  { insurerId:'aditya_birla', featureId:'room_rent', covered:'yes', note:'No room rent cap' },
  { insurerId:'aditya_birla', featureId:'icu_cover', covered:'yes', note:'Full ICU' },
  { insurerId:'aditya_birla', featureId:'daycare', covered:'yes', note:'All daycare' },
  { insurerId:'aditya_birla', featureId:'domiciliary', covered:'yes', note:'Home healthcare covered' },
  { insurerId:'aditya_birla', featureId:'pre_post_hosp', covered:'yes', note:'60+180 days' },
  { insurerId:'aditya_birla', featureId:'ambulance', covered:'yes', note:'Emergency ambulance' },
  { insurerId:'aditya_birla', featureId:'organ_donor', covered:'yes', note:'Donor expenses' },
  { insurerId:'aditya_birla', featureId:'restoration', covered:'yes', note:'Restore after claim' },
  { insurerId:'aditya_birla', featureId:'ncb', covered:'yes', note:'NCB up to 100%' },
  { insurerId:'aditya_birla', featureId:'ncb_protection', covered:'yes', note:'Protected' },
  { insurerId:'aditya_birla', featureId:'ped_waiting', covered:'partial', note:'36 months PED wait' },
  { insurerId:'aditya_birla', featureId:'initial_waiting', covered:'partial', note:'30 days initial' },
  { insurerId:'aditya_birla', featureId:'specific_waiting', covered:'partial', note:'24 months specific' },
  { insurerId:'aditya_birla', featureId:'maternity', covered:'partial', note:'Maternity plan available' },
  { insurerId:'aditya_birla', featureId:'newborn', covered:'yes', note:'Newborn covered' },
  { insurerId:'aditya_birla', featureId:'child_vaccination', covered:'no', note:'Not in base' },
  { insurerId:'aditya_birla', featureId:'children_cover', covered:'yes', note:'91 days to 25 years' },
  { insurerId:'aditya_birla', featureId:'senior_cover', covered:'yes', note:'Covers seniors' },
  { insurerId:'aditya_birla', featureId:'no_copay_senior', covered:'yes', note:'No mandatory copay' },
  { insurerId:'aditya_birla', featureId:'cataract', covered:'yes', note:'After waiting' },
  { insurerId:'aditya_birla', featureId:'joint_replacement', covered:'yes', note:'After waiting' },
  { insurerId:'aditya_birla', featureId:'mental_health', covered:'yes', note:'Mental health covered' },
  { insurerId:'aditya_birla', featureId:'ayush', covered:'yes', note:'AYUSH covered' },
  { insurerId:'aditya_birla', featureId:'opd', covered:'yes', note:'OPD included — unique feature' },
  { insurerId:'aditya_birla', featureId:'teleconsult', covered:'yes', note:'Digital health consult' },
  { insurerId:'aditya_birla', featureId:'wellness', covered:'yes', note:'HealthReturns — earn up to 30% premium discount' },
  { insurerId:'aditya_birla', featureId:'consumables', covered:'no', note:'Not covered' },
  { insurerId:'aditya_birla', featureId:'robotic_surgery', covered:'yes', note:'Modern treatments' },
  { insurerId:'aditya_birla', featureId:'cashless_everywhere', covered:'yes', note:'13000+ hospitals' },
  { insurerId:'aditya_birla', featureId:'claim_speed', covered:'yes', note:'In-house settlement' },
  { insurerId:'aditya_birla', featureId:'lifetime_renewability', covered:'yes', note:'Lifetime' },
  { insurerId:'aditya_birla', featureId:'portability', covered:'yes', note:'Portable' },

  // ── TATA AIG Medicare Premier ──
  { insurerId:'tata_aig', featureId:'room_rent', covered:'yes', note:'No cap' },
  { insurerId:'tata_aig', featureId:'icu_cover', covered:'yes', note:'Full ICU' },
  { insurerId:'tata_aig', featureId:'daycare', covered:'yes', note:'All daycare' },
  { insurerId:'tata_aig', featureId:'domiciliary', covered:'yes', note:'Covered' },
  { insurerId:'tata_aig', featureId:'pre_post_hosp', covered:'yes', note:'60+90 days' },
  { insurerId:'tata_aig', featureId:'ambulance', covered:'yes', note:'Ambulance covered' },
  { insurerId:'tata_aig', featureId:'organ_donor', covered:'yes', note:'Donor expenses' },
  { insurerId:'tata_aig', featureId:'restoration', covered:'yes', note:'100% restore' },
  { insurerId:'tata_aig', featureId:'ncb', covered:'yes', note:'NCB available' },
  { insurerId:'tata_aig', featureId:'ncb_protection', covered:'yes', note:'NCB protected' },
  { insurerId:'tata_aig', featureId:'ped_waiting', covered:'partial', note:'48 months PED' },
  { insurerId:'tata_aig', featureId:'initial_waiting', covered:'partial', note:'30 days initial' },
  { insurerId:'tata_aig', featureId:'specific_waiting', covered:'partial', note:'24 months specific' },
  { insurerId:'tata_aig', featureId:'maternity', covered:'addon', note:'Add-on available' },
  { insurerId:'tata_aig', featureId:'newborn', covered:'yes', note:'Newborn covered' },
  { insurerId:'tata_aig', featureId:'child_vaccination', covered:'no', note:'Not in base' },
  { insurerId:'tata_aig', featureId:'children_cover', covered:'yes', note:'91 days to 25 years' },
  { insurerId:'tata_aig', featureId:'senior_cover', covered:'yes', note:'Seniors covered' },
  { insurerId:'tata_aig', featureId:'no_copay_senior', covered:'yes', note:'No mandatory copay' },
  { insurerId:'tata_aig', featureId:'cataract', covered:'yes', note:'After waiting' },
  { insurerId:'tata_aig', featureId:'joint_replacement', covered:'yes', note:'After waiting' },
  { insurerId:'tata_aig', featureId:'mental_health', covered:'yes', note:'Mental health' },
  { insurerId:'tata_aig', featureId:'ayush', covered:'yes', note:'AYUSH covered' },
  { insurerId:'tata_aig', featureId:'opd', covered:'addon', note:'OPD add-on' },
  { insurerId:'tata_aig', featureId:'teleconsult', covered:'yes', note:'Teleconsult included' },
  { insurerId:'tata_aig', featureId:'wellness', covered:'yes', note:'Wellness benefits' },
  { insurerId:'tata_aig', featureId:'consumables', covered:'yes', note:'Consumables covered' },
  { insurerId:'tata_aig', featureId:'robotic_surgery', covered:'yes', note:'Modern treatments' },
  { insurerId:'tata_aig', featureId:'cashless_everywhere', covered:'yes', note:'10000+ hospitals' },
  { insurerId:'tata_aig', featureId:'claim_speed', covered:'yes', note:'Fast processing' },
  { insurerId:'tata_aig', featureId:'lifetime_renewability', covered:'yes', note:'Lifetime' },
  { insurerId:'tata_aig', featureId:'portability', covered:'yes', note:'Portable' },

  // ── ICICI LOMBARD Health AdvantEdge ──
  { insurerId:'icici_lombard', featureId:'room_rent', covered:'partial', note:'Single AC room — some sub-limits' },
  { insurerId:'icici_lombard', featureId:'icu_cover', covered:'yes', note:'Full ICU' },
  { insurerId:'icici_lombard', featureId:'daycare', covered:'yes', note:'All daycare' },
  { insurerId:'icici_lombard', featureId:'domiciliary', covered:'yes', note:'Covered' },
  { insurerId:'icici_lombard', featureId:'pre_post_hosp', covered:'yes', note:'60+90 days' },
  { insurerId:'icici_lombard', featureId:'ambulance', covered:'yes', note:'Ambulance covered' },
  { insurerId:'icici_lombard', featureId:'organ_donor', covered:'yes', note:'Donor covered' },
  { insurerId:'icici_lombard', featureId:'restoration', covered:'yes', note:'Restore available' },
  { insurerId:'icici_lombard', featureId:'ncb', covered:'yes', note:'NCB available' },
  { insurerId:'icici_lombard', featureId:'ncb_protection', covered:'no', note:'Not in base' },
  { insurerId:'icici_lombard', featureId:'ped_waiting', covered:'partial', note:'48 months PED' },
  { insurerId:'icici_lombard', featureId:'initial_waiting', covered:'partial', note:'30 days' },
  { insurerId:'icici_lombard', featureId:'specific_waiting', covered:'partial', note:'24 months' },
  { insurerId:'icici_lombard', featureId:'maternity', covered:'addon', note:'Add-on available' },
  { insurerId:'icici_lombard', featureId:'newborn', covered:'yes', note:'Newborn covered' },
  { insurerId:'icici_lombard', featureId:'child_vaccination', covered:'no', note:'Not included' },
  { insurerId:'icici_lombard', featureId:'children_cover', covered:'yes', note:'3 months to 25 years' },
  { insurerId:'icici_lombard', featureId:'senior_cover', covered:'yes', note:'Senior plans available' },
  { insurerId:'icici_lombard', featureId:'no_copay_senior', covered:'partial', note:'Some copay for seniors' },
  { insurerId:'icici_lombard', featureId:'cataract', covered:'yes', note:'After waiting' },
  { insurerId:'icici_lombard', featureId:'joint_replacement', covered:'yes', note:'After waiting' },
  { insurerId:'icici_lombard', featureId:'mental_health', covered:'yes', note:'Mental health covered' },
  { insurerId:'icici_lombard', featureId:'ayush', covered:'yes', note:'AYUSH covered' },
  { insurerId:'icici_lombard', featureId:'opd', covered:'no', note:'Not in base' },
  { insurerId:'icici_lombard', featureId:'teleconsult', covered:'yes', note:'IL TakeCare app' },
  { insurerId:'icici_lombard', featureId:'wellness', covered:'yes', note:'Wellness rewards' },
  { insurerId:'icici_lombard', featureId:'consumables', covered:'no', note:'Not covered' },
  { insurerId:'icici_lombard', featureId:'robotic_surgery', covered:'yes', note:'Covered' },
  { insurerId:'icici_lombard', featureId:'cashless_everywhere', covered:'yes', note:'10800+ hospitals' },
  { insurerId:'icici_lombard', featureId:'claim_speed', covered:'yes', note:'30 min cashless approval' },
  { insurerId:'icici_lombard', featureId:'lifetime_renewability', covered:'yes', note:'Lifetime' },
  { insurerId:'icici_lombard', featureId:'portability', covered:'yes', note:'Portable' },

  // ── ACKO Platinum Health ──
  { insurerId:'acko', featureId:'room_rent', covered:'yes', note:'No cap in premium plan' },
  { insurerId:'acko', featureId:'icu_cover', covered:'yes', note:'Full ICU' },
  { insurerId:'acko', featureId:'daycare', covered:'yes', note:'All daycare' },
  { insurerId:'acko', featureId:'domiciliary', covered:'yes', note:'Covered' },
  { insurerId:'acko', featureId:'pre_post_hosp', covered:'yes', note:'60+180 days' },
  { insurerId:'acko', featureId:'ambulance', covered:'yes', note:'Ambulance included' },
  { insurerId:'acko', featureId:'organ_donor', covered:'yes', note:'Donor covered' },
  { insurerId:'acko', featureId:'restoration', covered:'yes', note:'Restore available' },
  { insurerId:'acko', featureId:'ncb', covered:'yes', note:'NCB available' },
  { insurerId:'acko', featureId:'ncb_protection', covered:'no', note:'Not confirmed' },
  { insurerId:'acko', featureId:'ped_waiting', covered:'partial', note:'36 months PED' },
  { insurerId:'acko', featureId:'initial_waiting', covered:'partial', note:'30 days initial' },
  { insurerId:'acko', featureId:'specific_waiting', covered:'partial', note:'24 months' },
  { insurerId:'acko', featureId:'maternity', covered:'partial', note:'Limited maternity cover' },
  { insurerId:'acko', featureId:'newborn', covered:'yes', note:'Newborn covered' },
  { insurerId:'acko', featureId:'child_vaccination', covered:'no', note:'Not confirmed' },
  { insurerId:'acko', featureId:'children_cover', covered:'yes', note:'3 months to 25 years' },
  { insurerId:'acko', featureId:'senior_cover', covered:'partial', note:'Limited senior coverage' },
  { insurerId:'acko', featureId:'no_copay_senior', covered:'partial', note:'Copay may apply' },
  { insurerId:'acko', featureId:'cataract', covered:'yes', note:'After waiting' },
  { insurerId:'acko', featureId:'joint_replacement', covered:'yes', note:'After waiting' },
  { insurerId:'acko', featureId:'mental_health', covered:'yes', note:'Mental health' },
  { insurerId:'acko', featureId:'ayush', covered:'yes', note:'AYUSH covered' },
  { insurerId:'acko', featureId:'opd', covered:'yes', note:'OPD included' },
  { insurerId:'acko', featureId:'teleconsult', covered:'yes', note:'Digital-first — strong teleconsult' },
  { insurerId:'acko', featureId:'wellness', covered:'yes', note:'Digital wellness tools' },
  { insurerId:'acko', featureId:'consumables', covered:'yes', note:'Covered' },
  { insurerId:'acko', featureId:'robotic_surgery', covered:'yes', note:'Modern treatments' },
  { insurerId:'acko', featureId:'cashless_everywhere', covered:'partial', note:'7000 hospitals — smaller network' },
  { insurerId:'acko', featureId:'claim_speed', covered:'yes', note:'Instant digital claim processing' },
  { insurerId:'acko', featureId:'lifetime_renewability', covered:'yes', note:'Lifetime' },
  { insurerId:'acko', featureId:'portability', covered:'yes', note:'Portable' },
];

// ── Lookup Helpers ───────────────────────────────────────────

export const getFeatureForInsurer = (insurerId: string, featureId: string): InsurerFeature | undefined =>
  INSURER_FEATURES.find(f => f.insurerId === insurerId && f.featureId === featureId);

export const getCategories = (): string[] =>
  [...new Set(COVERAGE_FEATURES.map(f => f.category))];

// ── Smart Recommendation Engine ──────────────────────────────

export interface FamilyProfile {
  selfAge: number;
  spouseAge: number | null;
  children: number[];
  parents: number[];
  hasPreExisting: boolean;
  cityType: 'metro' | 'tier2' | 'tier3';
  sumInsured: number;
  priorities: string[];
}

export interface Recommendation {
  insurerId: string;
  score: number;
  matchReasons: string[];
  watchOuts: string[];
  rank: number;
}

export const getRecommendations = (
  profile: FamilyProfile,
  insurerIds: string[]
): Recommendation[] => {
  return insurerIds.map(id => {
    const insurer = INSURERS.find(i => i.id === id)!;
    let score = 50;
    const matchReasons: string[] = [];
    const watchOuts: string[] = [];

    // Base score from CSR
    score += (insurer.csr - 90) * 2;

    // Senior parents check
    if (profile.parents.length > 0) {
      const maxParentAge = Math.max(...profile.parents);
      if (maxParentAge >= 60) {
        if (id === 'star_health') { score += 10; matchReasons.push('Star Health Red Carpet excellent for 60+ parents'); }
        if (id === 'care_health') { score += 8; matchReasons.push('Care Senior plan accepts up to age 80'); }
        if (id === 'hdfc_ergo') { score += 7; matchReasons.push('HDFC Ergo good for seniors — no room rent cap'); }
        if (id === 'icici_lombard') { score -= 3; watchOuts.push('Check copay terms for senior family members'); }
      }
    }

    // Children check
    if (profile.children.length > 0) {
      const hasInfant = profile.children.some(age => age < 1);
      if (hasInfant) {
        if (id === 'star_health') { score += 8; matchReasons.push('Star Health covers newborns from 16 days'); }
        if (id === 'niva_bupa') { score += 7; matchReasons.push('Niva Bupa covers newborns + vaccinations'); }
      }
      matchReasons.push('Covers children up to 25 years under family floater');
    }

    // Pre-existing conditions
    if (profile.hasPreExisting) {
      if (id === 'hdfc_ergo') { score += 5; matchReasons.push('HDFC Ergo: shorter 36-month PED waiting period'); }
      if (id === 'niva_bupa') { score += 5; matchReasons.push('Niva Bupa: 36-month PED, good for chronic conditions'); }
      if (id === 'star_health') { score -= 5; watchOuts.push('Star Health has 48-month PED waiting period'); }
      if (id === 'care_health') { score -= 5; watchOuts.push('Care Supreme: 48-month PED waiting period'); }
    }

    // Large family
    const totalMembers = 1 + (profile.spouseAge ? 1 : 0) + profile.children.length + profile.parents.length;
    if (totalMembers >= 4) {
      if (id === 'niva_bupa') { score += 8; matchReasons.push('Niva Bupa covers up to 19 relationships in one policy'); }
      if (id === 'star_health') { score += 5; matchReasons.push('Star Health Family Optima: strong for large families'); }
    }

    // City type — network hospitals
    if (profile.cityType === 'tier2' || profile.cityType === 'tier3') {
      if (id === 'star_health') { score += 10; matchReasons.push('Star Health: 14000+ hospitals — best Tier 2/3 coverage'); }
      if (id === 'hdfc_ergo') { score += 7; matchReasons.push('HDFC Ergo: 13000+ hospitals, strong in smaller cities'); }
      if (id === 'acko') { score -= 10; watchOuts.push('Acko: smaller 7000 hospital network — check your city'); }
    }

    // Priority features
    if (profile.priorities.includes('restoration')) {
      if (id === 'niva_bupa') { score += 10; matchReasons.push('Niva Bupa: UNLIMITED restoration — industry best'); }
      if (id === 'care_health') { score += 10; matchReasons.push('Care: unlimited recharge after every claim'); }
    }
    if (profile.priorities.includes('wellness')) {
      if (id === 'aditya_birla') { score += 12; matchReasons.push('Aditya Birla: earn up to 30% premium discount via fitness'); }
    }
    if (profile.priorities.includes('opd')) {
      if (id === 'aditya_birla') { score += 10; matchReasons.push('Aditya Birla Activ One: OPD included in base plan'); }
      if (id === 'acko') { score += 8; matchReasons.push('Acko: OPD covered'); }
    }
    if (profile.priorities.includes('claim_speed')) {
      if (id === 'acko') { score += 8; matchReasons.push('Acko: highest CSR 99.91%, fastest digital claims'); }
      if (id === 'icici_lombard') { score += 7; matchReasons.push('ICICI Lombard: 30 min cashless approval'); }
    }
    if (profile.priorities.includes('csr')) {
      score += (insurer.csr - 95) * 3;
    }
    if (profile.priorities.includes('network')) {
      score += (insurer.networkHospitals / 2000);
    }
    if (profile.priorities.includes('senior')) {
      if (id === 'star_health') { score += 8; matchReasons.push('Star Health: dedicated senior citizen plans'); }
      if (id === 'care_health') { score += 6; matchReasons.push('Care: senior plans up to age 80'); }
    }
    if (profile.priorities.includes('child')) {
      if (id === 'star_health') { score += 8; matchReasons.push('Star Health: newborn + vaccination cover'); }
      if (id === 'niva_bupa') { score += 6; matchReasons.push('Niva Bupa: child vaccination in some plans'); }
    }

    return {
      insurerId: id,
      score: Math.min(100, Math.max(0, Math.round(score))),
      matchReasons: matchReasons.slice(0, 3),
      watchOuts: watchOuts.slice(0, 2),
      rank: 0
    };
  })
  .sort((a, b) => b.score - a.score)
  .map((rec, idx) => ({ ...rec, rank: idx + 1 }));
};
