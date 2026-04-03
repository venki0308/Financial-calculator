import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import {
  ArrowLeft, Info, Share2, Shield, HeartPulse,
  CheckCircle, AlertTriangle, ChevronDown, ChevronUp,
  Plus, X, TrendingUp, Banknote, Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import { AnalyticsService } from '../lib/analytics';
import { nativeShare } from '../utils/nativeShare';

type InsuranceTab = 'health' | 'life';

// ─── Constants ─────────────────────────────────────────────────────────────────

const SUM_INSURED_OPTIONS = [
  { label: '₹3L', value: 300000 },
  { label: '₹5L', value: 500000 },
  { label: '₹10L', value: 1000000 },
  { label: '₹15L', value: 1500000 },
  { label: '₹25L', value: 2500000 },
  { label: '₹50L', value: 5000000 },
  { label: '₹1Cr', value: 10000000 },
];

const CITY_OPTIONS: { label: string; value: 'metro' | 'tier2' | 'tier3' }[] = [
  { label: 'Metro', value: 'metro' },
  { label: 'Tier 2', value: 'tier2' },
  { label: 'Tier 3', value: 'tier3' },
];

// ─── Formatting ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function fmtCr(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1).replace('.0', '')}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1).replace('.0', '')}L`;
  return fmt(n);
}

function fmtRange(lo: number, hi: number): string {
  return `${fmt(lo)} — ${fmt(hi)}`;
}

// ─── Health Calculations ────────────────────────────────────────────────────────

function getAgeBase(age: number): [number, number] {
  if (age <= 17) return [2000, 4000];
  if (age <= 30) return [3500, 6000];
  if (age <= 40) return [5500, 9500];
  if (age <= 50) return [9000, 16000];
  if (age <= 60) return [15000, 28000];
  if (age <= 70) return [28000, 55000];
  if (age <= 80) return [50000, 90000];
  return [80000, 140000];
}

function getSiMul(si: number): number {
  if (si <= 300000) return 0.55;
  if (si <= 500000) return 0.75;
  if (si <= 1000000) return 1.00;
  if (si <= 1500000) return 1.30;
  if (si <= 2500000) return 1.70;
  if (si <= 5000000) return 2.40;
  return 3.20;
}

function getCityMul(city: 'metro' | 'tier2' | 'tier3'): number {
  return city === 'metro' ? 1.25 : city === 'tier2' ? 1.00 : 0.82;
}

function getFloaterFactor(n: number): number {
  if (n <= 1) return 1.0;
  if (n === 2) return 0.82;
  if (n === 3) return 0.76;
  if (n === 4) return 0.72;
  return 0.68;
}

function getMemberPremium(age: number, si: number, city: 'metro' | 'tier2' | 'tier3', preExisting: boolean): [number, number] {
  const [bLo, bHi] = getAgeBase(age);
  const mul = getSiMul(si) * getCityMul(city) * (preExisting ? 1.20 : 1.00);
  return [
    Math.round((bLo * mul) / 100) * 100,
    Math.round((bHi * mul) / 100) * 100,
  ];
}

function calcAdequacy(
  si: number,
  city: 'metro' | 'tier2' | 'tier3',
  allAges: number[],
  parentAges: number[],
  preExisting: boolean,
): number {
  const siL = si / 100000;
  let base = 0;

  if (city === 'metro') {
    if (siL <= 3) base = 20;
    else if (siL <= 5) base = 35;
    else if (siL <= 10) base = 60;
    else if (siL <= 15) base = 72;
    else if (siL <= 25) base = 82;
    else if (siL <= 50) base = 90;
    else base = 97;
  } else if (city === 'tier2') {
    if (siL <= 5) base = 45;
    else if (siL <= 10) base = 70;
    else if (siL <= 15) base = 80;
    else if (siL <= 25) base = 90;
    else base = 93;
  } else {
    if (siL <= 5) base = 55;
    else if (siL <= 10) base = 78;
    else if (siL <= 25) base = 92;
    else base = 95;
  }

  // Risk deductions
  if (preExisting) base -= 8;
  if (parentAges.some(a => a >= 70)) base -= 18;
  else if (parentAges.some(a => a >= 60)) base -= 10;
  if (allAges.length >= 5) base -= 7;
  if (allAges.some(a => a <= 1)) base -= 5;

  // Strengths
  if (!preExisting) base += 5;
  if (allAges.every(a => a < 40)) base += 5;
  if (city === 'tier3') base += 3;

  return Math.max(0, Math.min(100, Math.round(base)));
}

// ─── Life Calculations ──────────────────────────────────────────────────────────

function getTermBase(age: number): [number, number] {
  if (age <= 25) return [5500, 8000];
  if (age <= 30) return [7000, 11000];
  if (age <= 35) return [9000, 15000];
  if (age <= 40) return [14000, 24000];
  if (age <= 45) return [22000, 38000];
  if (age <= 50) return [35000, 60000];
  if (age <= 55) return [55000, 90000];
  if (age <= 60) return [80000, 130000];
  return [120000, 200000];
}

function calcTermRange(
  age: number, gender: 'male' | 'female', smoker: boolean, coverCr: number, term: number
): { lo: number; hi: number } {
  const [bLo, bHi] = getTermBase(age);
  const gf = gender === 'female' ? 0.82 : 1.0;
  const sfLo = smoker ? 1.5 : 1.0;
  const sfHi = smoker ? 1.8 : 1.0;
  const tf = term <= 20 ? 0.9 : term <= 30 ? 1.0 : 1.12;
  return {
    lo: Math.round((bLo * coverCr * gf * sfLo * tf) / 100) * 100,
    hi: Math.round((bHi * coverCr * gf * sfHi * tf) / 100) * 100,
  };
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function PillSelector<T extends string | number>({
  label, options, value, onChange,
}: { label: string; options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={String(o.value)} onClick={() => onChange(o.value)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              value === o.value
                ? 'bg-brand-green text-black shadow-sm'
                : 'bg-card border border-border text-muted-foreground'
            }`}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border mb-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <button onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-all relative ${value ? 'bg-brand-green' : 'bg-slate-600'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? 'left-[26px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function ScoreDial({ score }: { score: number }) {
  const R = 90;
  const circ = Math.PI * R;
  const color = score <= 40 ? '#ef4444' : score <= 75 ? '#f59e0b' : '#22c55e';
  const label = score <= 40 ? 'Critically Underinsured'
    : score <= 60 ? 'Underinsured'
    : score <= 75 ? 'Adequate for basics'
    : score <= 88 ? 'Well covered'
    : 'Comprehensively covered';

  return (
    <div className="flex flex-col items-center py-2">
      <svg viewBox="0 0 200 110" className="w-56 h-[130px]" style={{ overflow: 'visible' }}>
        <path d="M10 110 A 90 90 0 0 1 190 110"
          fill="none" strokeWidth="14" strokeLinecap="round"
          className="stroke-slate-200 dark:stroke-slate-700" />
        <motion.path
          d="M10 110 A 90 90 0 0 1 190 110"
          fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - score / 100) }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        <text x="100" y="82" textAnchor="middle" fontSize="40" fontWeight="900" fill={color}>{score}</text>
        <text x="100" y="100" textAnchor="middle" fontSize="11" fill="#94a3b8">/100</text>
      </svg>
      <span className="text-sm font-bold mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

function AccordionItem({ title, body, idx, open, onToggle }: {
  title: string; body: string; idx: number; open: boolean; onToggle: () => void;
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 bg-card text-left">
        <span className="text-xs font-semibold text-foreground">{idx + 1}. {title}</span>
        {open
          ? <ChevronUp size={14} className="text-muted-foreground flex-shrink-0 ml-2" />
          : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0 ml-2" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="px-4 py-3 text-[11px] text-muted-foreground leading-relaxed border-t border-border bg-slate-50 dark:bg-slate-800/30">{body}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: 'best' | 'acceptable' | 'avoid' | 'complex' }) {
  const config = {
    best: { label: 'BEST CHOICE', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    acceptable: { label: 'ACCEPTABLE', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    avoid: { label: 'AVOID', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
    complex: { label: 'EVALUATE CAREFULLY', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  }[verdict];
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.cls}`}>{config.label}</span>;
}

// ─── Static data ────────────────────────────────────────────────────────────────

const BASE_CHECKLIST: { title: string; body: string }[] = [
  {
    title: 'No Room Rent Capping',
    body: 'Ensure the plan has NO sub-limit on room rent. A plan capping room rent at ₹5,000/day in a metro hospital means ALL linked charges (doctor fees, nursing, procedures) are also proportionally reduced. Avoid any plan with room rent sub-limits.',
  },
  {
    title: 'Sum Insured Restoration',
    body: 'After one member uses up the sum insured, it should automatically restore — either once per year or unlimited. This is critical for families where multiple members may need hospitalisation. Ask: "Does restoration apply to the same illness or a different illness?" Unlimited is better.',
  },
  {
    title: 'No Claim Bonus (NCB)',
    body: 'Every claim-free year should increase your sum insured by 10–50% at no extra cost. Check: 1) What % NCB per year? 2) Is NCB protected after a small claim? 3) What is the maximum NCB cap? (50% is good, 100% is excellent)',
  },
  {
    title: 'Pre-Existing Disease Waiting Period',
    body: 'IRDAI 2025 rules: maximum PED waiting period is now 36 months (3 years) for new policies. Shorter is better. Look for plans with 36-month or less PED waiting. After the waiting period, your pre-existing conditions must be covered. Never hide a pre-existing condition — it is the #1 cause of claim rejection.',
  },
  {
    title: 'Lifetime Renewability',
    body: 'Under IRDAI HIR 2016 Regulation 12, any policy renewed without a break cannot be denied renewal due to age. Ensure the policy explicitly states "Lifelong Renewable". Never let your health policy lapse — you lose accumulated waiting period credits.',
  },
  {
    title: 'Claim Settlement Ratio (CSR)',
    body: 'CSR = claims settled / claims received × 100. Look for CSR above 95%. Verify from IRDAI\'s official annual report at irdai.gov.in — not from broker or comparison websites. Also check the Complaint Volume per 10,000 claims — lower complaints = smoother process.',
  },
  {
    title: 'In-House vs TPA Claim Processing',
    body: 'Insurers that process claims in-house (no Third Party Administrator) typically settle faster and with fewer disputes. When buying, ask the insurer: "Who processes my cashless claims at the hospital?" In-house = better.',
  },
];

const IRDAI_HEALTH_RIGHTS = [
  { title: 'No Age Limit for New Policies', body: 'Insurers cannot deny new health insurance based on age. (IRDAI 2025 guideline)' },
  { title: 'Maximum 36-Month PED Waiting Period', body: 'Waiting period for pre-existing diseases capped at 36 months for new policies. (IRDAI 2025)' },
  { title: 'Lifetime Renewability', body: 'No policy can be denied renewal due to age if renewed without break. (IRDAI HIR 2016 Reg 12)' },
  { title: '5-Year Moratorium Period', body: 'After 5 years continuous coverage, insurer cannot reject claims citing non-disclosure (except fraud). (IRDAI Master Circular 2024)' },
  { title: '10% Renewal Premium Cap for 65+', body: 'Insurers cannot increase renewal premium for policyholders above 65 by more than 10% per year. (IRDAI Circular January 2025)' },
  { title: 'Free 30-Day Policy Review', body: 'You can return the policy within 30 days for a full refund if unsatisfied. (IRDAI free-look rule)' },
  { title: 'Cashless Everywhere', body: 'Emergency cashless treatment allowed even at non-network hospitals. (IRDAI initiative 2024)' },
  { title: 'GST-Free Individual Premiums', body: 'Individual health insurance premiums are GST exempt from September 22, 2025. (56th GST Council)' },
  { title: 'Portability Right', body: 'Switch insurer without losing accrued waiting period benefits. Apply 45 days before renewal.' },
  { title: 'Insurance Ombudsman', body: 'Free dispute resolution if claim is rejected. File at irdai.gov.in — no lawyer needed.' },
];

const HOW_TO_BUY_STEPS = [
  {
    step: 1,
    title: 'Fix your sum insured first',
    body: 'Before comparing premiums, decide your sum insured. Rule of thumb: 1 year of gross income OR minimum ₹10L for Tier 2/3, ₹15–25L for metro. Medical inflation is 14%/year in India — choose a sum insured that will still be adequate in 10 years.',
  },
  {
    step: 2,
    title: 'Shortlist 3–4 insurers using IRDAI data',
    body: 'Go to irdai.gov.in → Statistics → Annual Report. Check Claim Settlement Ratio and Complaint Volume per 10,000 claims. Focus on insurers with CSR above 95% AND complaint ratio below 20.',
  },
  {
    step: 3,
    title: 'Read the Policy Wording — not the brochure',
    body: 'The brochure shows benefits. The Policy Wording Document shows exclusions, sub-limits, and conditions. Search for: "room rent", "co-pay", "sub-limit", "waiting period", "restoration". These are your risk areas.',
  },
  {
    step: 4,
    title: 'Get quotes for the same sum insured from 3 insurers',
    body: 'Visit 3 insurer websites directly and get quotes for identical sum insured and members. Do not compare a ₹10L plan from one insurer with a ₹5L plan from another.',
  },
  {
    step: 5,
    title: 'Check network hospitals in your city',
    body: 'Visit the insurer\'s website directly and search your preferred hospital name in their network. Do not rely on broker sites for this check — hospital lists change frequently.',
  },
  {
    step: 6,
    title: 'Buy directly from the insurer website',
    body: 'Buying directly (insurer website or app) is cheaper than through a broker — no commission loading. You can still use a broker for advice, but buy direct to avoid markup.',
  },
  {
    step: 7,
    title: 'Declare everything honestly',
    body: 'Fill the proposal form yourself. Disclose all pre-existing conditions, past surgeries, family medical history. Non-disclosure = claim rejection at the worst possible time.',
  },
];

const IRDAI_LIFE_FACTS = [
  'Free-look period: 30 days to return the policy for a full refund',
  'Grace period: 30 days for premium payment before the policy lapses',
  'Revival: A lapsed policy can be revived within 5 years by paying arrears + interest',
  'Nomination: Always nominate a beneficiary — mandatory under the Insurance Act',
  'Assignment: Policy can be assigned to a bank as collateral for a loan',
  'Suicide clause: After 12 months of policy, death by suicide is also covered',
  'IRDAI Ombudsman: Free dispute resolution at irdai.gov.in if a claim is rejected',
];

const LIFE_PLAN_TYPES: {
  verdict: 'best' | 'acceptable' | 'avoid' | 'complex';
  title: string; what: string; premiumRange: string;
  maturity: string; xirr: string; note: string;
  icon: React.ElementType; color: string; gradFrom: string;
}[] = [
  {
    verdict: 'best',
    title: 'Pure Term Insurance',
    what: 'Pays the death benefit only. Zero maturity payout.',
    premiumRange: '₹6,000–₹18,000 for ₹1Cr (age 25–35, non-smoker, 30yr)',
    maturity: 'None',
    xirr: 'N/A — pure protection',
    note: 'For every ₹1Cr of protection, pure term costs ₹6,000–₹18,000/year. This is the most cost-efficient life cover available. Invest the premium savings in mutual funds via SIP.',
    icon: Shield, color: 'text-emerald-400', gradFrom: 'from-emerald-500/10',
  },
  {
    verdict: 'acceptable',
    title: 'Term + Return of Premium (TROP)',
    what: 'Pays all premiums back if you survive the full policy term.',
    premiumRange: '₹18,000–₹35,000 for ₹1Cr cover',
    maturity: '100% premiums returned at maturity',
    xirr: '2.5%–4% effective XIRR',
    note: 'You get your premiums back, but the effective return is only 2.5–4% XIRR — below inflation and below FD rates. Better than Endowment. Choose only if you cannot tolerate paying for pure term.',
    icon: HeartPulse, color: 'text-blue-400', gradFrom: 'from-blue-500/10',
  },
  {
    verdict: 'avoid',
    title: 'Endowment / Money Back Plan',
    what: 'A mix of life insurance + guaranteed savings.',
    premiumRange: '₹60,000–₹1,20,000 for ₹1Cr cover',
    maturity: 'Lower than premiums paid in real terms',
    xirr: '3.5%–5.5% effective XIRR',
    note: 'You pay 6–8x more premium than term for the same cover. Returns are below Fixed Deposit rates. Classic trap: mixing insurance with investment destroys both. Use term + SIP instead.',
    icon: Banknote, color: 'text-amber-400', gradFrom: 'from-amber-500/10',
  },
  {
    verdict: 'complex',
    title: 'ULIP (Market-Linked Plan)',
    what: 'Life insurance combined with a market-linked investment fund.',
    premiumRange: '₹25,000–₹60,000 per year',
    maturity: 'Market-linked (equity/debt)',
    xirr: '7%–11% if equity performs; high charges in years 1–5',
    note: 'ULIPs can generate decent returns over 15+ years if equity performs. But high charges in years 1–5 significantly reduce real XIRR. Better alternative for most: pure term + separate ELSS SIP.',
    icon: TrendingUp, color: 'text-purple-400', gradFrom: 'from-purple-500/10',
  },
];

// ─── Main component ─────────────────────────────────────────────────────────────

export default function InsuranceCalculator() {
  useEffect(() => { AnalyticsService.trackScreen('Insurance_Calculator'); }, []);
  useTrackCalculator();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<InsuranceTab>('health');
  const [showInfo, setShowInfo] = useState(false);

  // ── Health state ─────────────────────────────────────────────────────────────
  const [selfAge, setSelfAge] = useState(30);
  const [hasSpouse, setHasSpouse] = useState(false);
  const [spouseAge, setSpouseAge] = useState(28);
  const [children, setChildren] = useState<number[]>([]);
  const [parents, setParents] = useState<number[]>([]);
  const [si, setSi] = useState(1000000);
  const [city, setCity] = useState<'metro' | 'tier2' | 'tier3'>('metro');
  const [preExisting, setPreExisting] = useState(false);
  const [healthCalced, setHealthCalced] = useState(false);
  const [openChecklist, setOpenChecklist] = useState<Set<number>>(new Set());
  const [showPremiumBreakdown, setShowPremiumBreakdown] = useState(false);

  // ── Life state ───────────────────────────────────────────────────────────────
  const [lifeAge, setLifeAge] = useState(30);
  const [lifeGender, setLifeGender] = useState<'male' | 'female'>('male');
  const [lifeSmoker, setLifeSmoker] = useState(false);
  const [annualIncome, setAnnualIncome] = useState(1200000);
  const [dependents, setDependents] = useState(2);
  const [outstandingLoans, setOutstandingLoans] = useState(0);
  const [policyTerm, setPolicyTerm] = useState(25);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const allAges = useMemo(() => {
    const ages = [selfAge];
    if (hasSpouse) ages.push(spouseAge);
    ages.push(...children, ...parents);
    return ages;
  }, [selfAge, hasSpouse, spouseAge, children, parents]);

  // ── Premium breakdown ────────────────────────────────────────────────────────
  const premiumData = useMemo(() => {
    const members: { label: string; lo: number; hi: number }[] = [];
    const add = (label: string, age: number) => {
      const [lo, hi] = getMemberPremium(age, si, city, preExisting);
      members.push({ label, lo, hi });
    };
    add(`Self (age ${selfAge})`, selfAge);
    if (hasSpouse) add(`Spouse (age ${spouseAge})`, spouseAge);
    children.forEach((age, i) => add(`Child ${i + 1} (age ${age === 0 ? '<1' : age})`, age));
    parents.forEach((age, i) => add(`Parent ${i + 1} (age ${age})`, age));
    const rawLo = members.reduce((s, m) => s + m.lo, 0);
    const rawHi = members.reduce((s, m) => s + m.hi, 0);
    const ff = getFloaterFactor(members.length);
    return {
      members,
      rawLo, rawHi,
      floaterPct: Math.round((1 - ff) * 100),
      lo: Math.round(rawLo * ff / 100) * 100,
      hi: Math.round(rawHi * ff / 100) * 100,
    };
  }, [selfAge, hasSpouse, spouseAge, children, parents, si, city, preExisting]);

  // ── Adequacy score ───────────────────────────────────────────────────────────
  const adequacyScore = useMemo(
    () => calcAdequacy(si, city, allAges, parents, preExisting),
    [si, city, allAges, parents, preExisting],
  );

  const adequacyExplanation = useMemo(() => {
    const cityLabel = city === 'metro' ? 'metro cities' : city === 'tier2' ? 'Tier 2 cities' : 'your city';
    if (adequacyScore < 50)
      return `A single ICU surgery in ${cityLabel} can cost ₹3–8 lakhs. Your current cover of ${fmtCr(si)} may not be sufficient for major hospitalisation.`;
    if (adequacyScore <= 75)
      return 'Your cover is adequate for most routine hospitalisations. Consider increasing for critical illness or surgical emergencies.';
    return 'Good coverage for your family profile. Ensure you have restoration benefit and no room rent capping in your plan.';
  }, [adequacyScore, city, si]);

  // ── Profile-based checklist ──────────────────────────────────────────────────
  const profileChecklist = useMemo(() => {
    const items = [...BASE_CHECKLIST];
    if (children.some(c => c <= 4))
      items.push({
        title: 'Newborn Coverage Clause',
        body: 'Newborns should be covered from Day 1 or within 90 days without a fresh waiting period. Check the exact newborn clause in the policy wording document — not the brochure.',
      });
    if (children.some(c => c < 18))
      items.push({
        title: 'Vaccination Coverage for Children',
        body: 'Some plans cover routine vaccinations under OPD benefit. Check if this is included or available as an add-on. Useful for families with young children.',
      });
    if (parents.some(a => a >= 60))
      items.push({
        title: 'Senior Co-payment Clause',
        body: 'Many plans add a co-payment clause for members above 60 — meaning you pay 10–20% of every claim. This defeats the purpose of insurance for seniors. Look specifically for plans with ZERO co-payment regardless of age.',
      });
    if (parents.some(a => a >= 60))
      items.push({
        title: 'Separate Senior Citizen Plan Consideration',
        body: 'Including parents above 60 in a family floater raises the entire family\'s premium significantly. Often it is cheaper to buy a dedicated senior citizen plan for parents and keep the main family floater for younger members. Get quotes both ways from IRDAI-registered insurers before deciding.',
      });
    if (parents.some(a => a >= 70))
      items.push({
        title: 'Elderly Member Coverage Limitations',
        body: 'Above age 70, very few insurers accept new proposals. If a parent has an existing policy, NEVER let it lapse — renewal cannot be denied under IRDAI rules. If no existing policy, check IRDAI\'s list of senior-friendly products at irdai.gov.in.',
      });
    if (preExisting)
      items.push({
        title: 'Pre-Existing Disease Declaration',
        body: 'Disclose ALL pre-existing conditions accurately in your proposal form. Under IRDAI\'s moratorium period rules (5 years as of 2024), after 5 years of continuous coverage, your insurer CANNOT reject claims citing non-disclosure (except proven fraud). Never hide conditions — claims get rejected at the worst time.',
      });
    if (si < 1000000 && city === 'metro')
      items.push({
        title: 'Sum Insured Adequacy Warning',
        body: 'In metro cities, a single surgery with ICU stay costs ₹3–8 lakhs on average. A cardiac bypass or cancer treatment can cost ₹8–20 lakhs. ₹5L cover is inadequate for metro hospitals. Consider ₹15–25L minimum for families in Mumbai, Delhi, Bengaluru, Chennai, Hyderabad.',
      });
    if (allAges.length >= 5)
      items.push({
        title: 'Floater vs Individual Cover Strategy',
        body: 'Family floaters assume not all members claim in the same year. With 5+ members, the probability of multiple claims increases. Consider buying individual covers for high-risk members (seniors, those with pre-existing conditions) and keeping the floater only for younger, healthy members. Get quotes for both structures.',
      });
    return items;
  }, [children, parents, preExisting, si, city, allAges.length]);

  // ── SI advisory ──────────────────────────────────────────────────────────────
  const siAdvisory = useMemo(() => {
    if (si <= 500000) return { type: 'warn' as const, text: '⚠ Medical inflation is 14%/yr in India. ₹5L may be insufficient for metro hospitals by 2030. Consider ₹10L minimum.' };
    if (si <= 1500000) return { type: 'ok' as const, text: '✓ Good for most Indian families in Tier 1/2 cities.' };
    if (si <= 5000000) return { type: 'ok' as const, text: '✓ Comprehensive. Covers most hospitalisation scenarios including ICU + surgery.' };
    return { type: 'info' as const, text: 'For high-risk families or those planning treatment abroad.' };
  }, [si]);

  // ── Life results ─────────────────────────────────────────────────────────────
  const coverRec = useMemo(() => ({
    minimum: annualIncome * 15,
    recommended: annualIncome * 20,
    withLoans: annualIncome * 15 + outstandingLoans,
  }), [annualIncome, outstandingLoans]);

  const recCoverCr = annualIncome > 0 ? Math.max((annualIncome * 20) / 10000000, 0.5) : 1;

  const termRange = useMemo(
    () => calcTermRange(lifeAge, lifeGender, lifeSmoker, recCoverCr, policyTerm),
    [lifeAge, lifeGender, lifeSmoker, recCoverCr, policyTerm],
  );
  const termRange20 = useMemo(
    () => calcTermRange(lifeAge, lifeGender, lifeSmoker, recCoverCr, 20),
    [lifeAge, lifeGender, lifeSmoker, recCoverCr],
  );
  const termRange30 = useMemo(
    () => calcTermRange(lifeAge, lifeGender, lifeSmoker, recCoverCr, 30),
    [lifeAge, lifeGender, lifeSmoker, recCoverCr],
  );
  const termRange40 = useMemo(
    () => calcTermRange(lifeAge, lifeGender, lifeSmoker, recCoverCr, 40),
    [lifeAge, lifeGender, lifeSmoker, recCoverCr],
  );

  const tax80C = useMemo(() => {
    const ded = Math.min(termRange.lo, 150000);
    return { ded, saved30: Math.round(ded * 0.30 * 1.04), saved20: Math.round(ded * 0.20 * 1.04) };
  }, [termRange.lo]);

  // ── Family helpers ───────────────────────────────────────────────────────────
  const addChild = () => { if (children.length < 4) setChildren(p => [...p, 5]); };
  const removeChild = (i: number) => setChildren(p => p.filter((_, idx) => idx !== i));
  const updateChild = (i: number, v: number) => setChildren(p => p.map((c, idx) => idx === i ? v : c));
  const addParent = () => { if (parents.length < 4) setParents(p => [...p, 60]); };
  const removeParent = (i: number) => setParents(p => p.filter((_, idx) => idx !== i));
  const updateParent = (i: number, v: number) => setParents(p => p.map((a, idx) => idx === i ? v : a));
  const toggleChecklist = (i: number) => setOpenChecklist(prev => {
    const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n;
  });

  const handleShare = async () => {
    if (activeTab === 'health') {
      await nativeShare('Health Insurance Simulator — FinCalix',
        `🏥 Health Insurance Estimate\n\nMembers: ${allAges.length} | Cover: ${fmtCr(si)} | ${city.charAt(0).toUpperCase() + city.slice(1)}\nEst. Annual Premium: ${fmtRange(premiumData.lo, premiumData.hi)}\nAdequacy Score: ${adequacyScore}/100\n\nEstimated with FinCalix 🧮`
      );
    } else {
      await nativeShare('Life Insurance Simulator — FinCalix',
        `🛡️ Life Insurance Estimate\n\nAge: ${lifeAge} | Income: ${fmtCr(annualIncome)}/yr\nRecommended Cover: ${fmtCr(coverRec.recommended)}\nEst. Term Premium: ${fmtRange(termRange.lo, termRange.hi)}/yr\n\nEstimated with FinCalix 🧮`
      );
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-white dark:bg-background animate-fade-in">

      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white dark:bg-[#0F172A] px-4 pt-14 pb-3 border-b border-slate-200 dark:border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
              <ArrowLeft size={18} className="text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-foreground">Insurance Simulator</h1>
              <p className="text-muted-foreground text-xs">IRDAI-based educational tool</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
              <Info size={16} className="text-muted-foreground" />
            </button>
            <button onClick={handleShare} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
              <Share2 size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-32 pt-4">

        {/* ─── Tab Switcher ─────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-5">
          {([
            { key: 'health' as InsuranceTab, label: 'Health Insurance', icon: HeartPulse },
            { key: 'life' as InsuranceTab, label: 'Life Insurance', icon: Shield },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold rounded-lg transition-all ${
                activeTab === tab.key ? 'bg-brand-green text-black shadow-lg' : 'text-muted-foreground'
              }`}>
              <tab.icon size={14} />{tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════ HEALTH TAB ════════════════════════════════ */}
        {activeTab === 'health' && (
          <div className="space-y-4">

            {/* SECTION 1 — Family members */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
              <div className="flex items-center gap-2 mb-4">
                <Users size={15} className="text-brand-green" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-foreground">Who needs coverage?</h2>
              </div>

              {/* Self */}
              <div className="mb-3">
                <NumberInput label="Self — Age" value={selfAge} onChange={setSelfAge} min={18} max={80} suffix=" years" />
              </div>

              {/* Spouse */}
              {hasSpouse ? (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">Spouse</span>
                    <button onClick={() => setHasSpouse(false)} className="p-1 rounded-lg hover:bg-muted">
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                  <NumberInput label="Spouse — Age" value={spouseAge} onChange={setSpouseAge} min={18} max={80} suffix=" years" />
                </div>
              ) : (
                <button onClick={() => setHasSpouse(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-brand-green/40 text-brand-green text-xs font-semibold mb-3 hover:bg-brand-green/5 transition-colors">
                  <Plus size={14} /> Add Spouse
                </button>
              )}

              {/* Children */}
              {children.map((age, i) => (
                <div key={i} className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Child {i + 1} {age === 0 ? '— Infant (< 1 year)' : `— ${age} years`}
                    </span>
                    <button onClick={() => removeChild(i)} className="p-1 rounded-lg hover:bg-muted">
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                  <NumberInput label={`Child ${i + 1} Age`} value={age} onChange={v => updateChild(i, v)} min={0} max={25} suffix=" years" />
                  {age === 0 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-[11px] text-amber-400 flex items-start gap-1.5">
                        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                        Newborns must be added to policy within 90 days of birth. Verify this clause with your insurer.
                      </p>
                    </div>
                  )}
                  {age >= 25 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-[11px] text-amber-400 flex items-start gap-1.5">
                        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                        Children above 25 need a separate individual policy — they cannot be on a family floater.
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {children.length < 4 && (
                <button onClick={addChild}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-blue-500/40 text-blue-400 text-xs font-semibold mb-3 hover:bg-blue-500/5 transition-colors">
                  <Plus size={14} /> Add Child
                </button>
              )}

              {/* Parents */}
              {parents.map((age, i) => (
                <div key={i} className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">Parent / In-law {i + 1}</span>
                    <button onClick={() => removeParent(i)} className="p-1 rounded-lg hover:bg-muted">
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                  <NumberInput label={`Parent ${i + 1} Age`} value={age} onChange={v => updateParent(i, v)} min={40} max={90} suffix=" years" />
                  {age >= 70 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-[11px] text-red-400 flex items-start gap-1.5">
                        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                        Very few plans accept new proposals above 70. If they have an existing policy, ensure renewal continuity. IRDAI mandates lifetime renewability if renewed without break.
                      </p>
                    </div>
                  )}
                  {age >= 60 && age < 70 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-[11px] text-amber-400 flex items-start gap-1.5">
                        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                        Consider a separate senior citizen plan for parents 60+. Combining with family floater significantly increases everyone's premium.
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {parents.length < 4 && (
                <button onClick={addParent}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-purple-500/40 text-purple-400 text-xs font-semibold hover:bg-purple-500/5 transition-colors">
                  <Plus size={14} /> Add Parent / In-law
                </button>
              )}
            </div>

            {/* SECTION 2 — Coverage Details */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
              <h2 className="text-sm font-bold text-slate-900 dark:text-foreground mb-4">Coverage Details</h2>
              <PillSelector label="Sum Insured (Coverage)" options={SUM_INSURED_OPTIONS} value={si} onChange={v => { setSi(v); setHealthCalced(false); }} />
              <div className={`mb-4 px-3 py-2.5 rounded-xl text-[11px] font-medium ${
                siAdvisory.type === 'warn' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : siAdvisory.type === 'ok' ? 'bg-brand-green/10 text-brand-green border border-brand-green/20'
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>{siAdvisory.text}</div>
              <PillSelector label="City Type" options={CITY_OPTIONS} value={city} onChange={v => { setCity(v); setHealthCalced(false); }} />
              <Toggle label="Pre-existing Conditions?" value={preExisting} onChange={v => { setPreExisting(v); setHealthCalced(false); }} />
            </div>

            {/* SECTION 3 — Calculate */}
            <button onClick={() => setHealthCalced(true)}
              className="w-full py-4 rounded-2xl bg-brand-green text-black font-bold text-sm shadow-lg shadow-brand-green/20 active:scale-[0.98] transition-transform">
              Calculate My Coverage Need
            </button>

            {/* ── RESULTS ─────────────────────────────────────────────────────── */}
            <AnimatePresence>
              {healthCalced && (
                <motion.div key="health-results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                  {/* CARD A — Coverage Adequacy Score */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                    <p className="text-sm font-bold text-foreground mb-0.5">Your Coverage Adequacy</p>
                    <p className="text-[10px] text-muted-foreground mb-3">Scored against city-level medical costs and family risk profile</p>
                    <ScoreDial score={adequacyScore} />
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-4 text-center px-2">{adequacyExplanation}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[
                        { label: 'Cover', val: fmtCr(si) },
                        { label: 'City', val: city.charAt(0).toUpperCase() + city.slice(1) },
                        { label: 'Members', val: String(allAges.length) },
                      ].map(({ label, val }) => (
                        <div key={label} className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold">{label}</p>
                          <p className="text-xs font-bold text-foreground">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CARD B — Estimated Premium Range */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-green/5 to-emerald-500/5 border border-brand-green/20">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Estimated Annual Premium Range</p>
                    <p className="text-[9px] text-muted-foreground mb-3">Based on IRDAI actuarial rating factors · {allAges.length} member{allAges.length !== 1 ? 's' : ''} · {fmtCr(si)} cover · {city}</p>
                    <p className="text-2xl font-black text-foreground mb-0.5">{fmtRange(premiumData.lo, premiumData.hi)}</p>
                    <p className="text-brand-green text-sm font-semibold mb-4">
                      ≈ {fmtRange(Math.round(premiumData.lo / 12 / 100) * 100, Math.round(premiumData.hi / 12 / 100) * 100)} per month
                    </p>

                    {/* Per-member breakdown */}
                    <button
                      onClick={() => setShowPremiumBreakdown(v => !v)}
                      className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/60 dark:bg-black/10 border border-brand-green/15 mb-3">
                      <span className="text-[11px] font-semibold text-foreground">Per-member breakdown</span>
                      {showPremiumBreakdown
                        ? <ChevronUp size={14} className="text-muted-foreground" />
                        : <ChevronDown size={14} className="text-muted-foreground" />}
                    </button>
                    <AnimatePresence>
                      {showPremiumBreakdown && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
                          <div className="space-y-1.5 p-3 rounded-xl bg-white/60 dark:bg-black/10 border border-border">
                            {premiumData.members.map((m, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground">{m.label}</span>
                                <span className="text-[11px] font-semibold text-foreground">{fmtRange(m.lo, m.hi)}</span>
                              </div>
                            ))}
                            <div className="border-t border-border pt-1.5 flex items-center justify-between">
                              <span className="text-[11px] text-muted-foreground">Family floater discount</span>
                              <span className="text-[11px] font-bold text-brand-green">−{premiumData.floaterPct}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-foreground">Total</span>
                              <span className="text-[11px] font-black text-foreground">{fmtRange(premiumData.lo, premiumData.hi)}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {preExisting && (
                      <p className="text-[10px] text-amber-400 mb-3 flex items-center gap-1">
                        <AlertTriangle size={11} /> Pre-existing loading of 20% applied
                      </p>
                    )}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-border">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        This range is based on IRDAI actuarial rating factors. Actual premium depends on your health declaration, insurer underwriting, and the specific plan features you choose. Premium varies across insurers — always get quotes from at least 2–3 IRDAI-registered insurers before deciding.
                      </p>
                    </div>
                  </div>

                  {/* CARD C — Personalised Checklist */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                    <p className="text-sm font-bold text-foreground mb-0.5">Your Personalised Checklist</p>
                    <p className="text-[10px] text-muted-foreground mb-4">Based on your family profile — tap each item for details</p>
                    <div className="space-y-2">
                      {profileChecklist.map((item, i) => (
                        <AccordionItem key={i} idx={i} title={item.title} body={item.body}
                          open={openChecklist.has(i)} onToggle={() => toggleChecklist(i)} />
                      ))}
                    </div>
                  </div>

                  {/* CARD D — IRDAI Rights */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                    <p className="text-sm font-bold text-foreground mb-0.5">Your Rights Under IRDAI</p>
                    <p className="text-[10px] text-muted-foreground mb-3">These protections apply to every insurer</p>
                    <div className="space-y-3">
                      {IRDAI_HEALTH_RIGHTS.map((right, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <Shield size={13} className="text-brand-green flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[11px] font-bold text-foreground">{right.title}</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{right.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-4 pt-3 border-t border-border leading-relaxed">
                      Source: IRDAI Annual Report 2023–24, IRDAI Master Circular on Health Insurance 2024, IRDAI HIR 2016, IRDAI Circular January 2025, 56th GST Council 2025
                    </p>
                  </div>

                  {/* CARD E — How to Buy */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                    <p className="text-sm font-bold text-foreground mb-4">How to Buy — Advisor's Step-by-Step</p>
                    <div className="space-y-4">
                      {HOW_TO_BUY_STEPS.map((s) => (
                        <div key={s.step} className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-brand-green/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[11px] font-black text-brand-green">{s.step}</span>
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-foreground mb-0.5">{s.title}</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{s.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Final Disclaimer */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800/30">
                    <p className="text-[10px] font-bold text-foreground mb-1">FinCalix Health Insurance Simulator</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
                      Provides educational guidance based on IRDAI regulations and actuarial principles. Premium estimates are ranges — actual premiums depend on your health declaration, insurer underwriting, and plan features.
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
                      FinCalix does <span className="font-bold text-foreground">NOT</span> sell insurance, does <span className="font-bold text-foreground">NOT</span> partner with any insurer, and does <span className="font-bold text-foreground">NOT</span> receive commission. This tool helps you understand what you need — you make your own informed choice directly with IRDAI-registered insurers.
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Verify all insurer data at: <span className="font-semibold text-foreground">irdai.gov.in</span>
                    </p>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ═══════════════════════ LIFE TAB ═══════════════════════════════════ */}
        {activeTab === 'life' && (
          <div className="space-y-4">

            {/* Inputs */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
              <h2 className="text-sm font-bold text-slate-900 dark:text-foreground mb-4">Life Cover Calculator</h2>
              <NumberInput label="Your Age" value={lifeAge} onChange={setLifeAge} min={18} max={65} suffix=" years" />
              <div className="h-3" />
              <PillSelector label="Gender"
                options={[{ label: '👨 Male', value: 'male' as const }, { label: '👩 Female', value: 'female' as const }]}
                value={lifeGender} onChange={setLifeGender} />
              <Toggle label="Smoker / Tobacco User?" value={lifeSmoker} onChange={setLifeSmoker} />
              <NumberInput label="Annual Income" value={annualIncome} onChange={setAnnualIncome} min={100000} max={100000000} prefix="₹" helperText="Gross annual income" />
              <div className="h-3" />
              <PillSelector label="Number of Dependents"
                options={[0, 1, 2, 3].map(n => ({ label: n === 0 ? 'None' : String(n), value: n })).concat([{ label: '4+', value: 4 }])}
                value={dependents} onChange={setDependents} />
              <NumberInput label="Outstanding Loans Total" value={outstandingLoans} onChange={setOutstandingLoans}
                min={0} max={100000000} prefix="₹" helperText="Home loan + car loan + other" />
              <div className="h-3" />
              <p className="text-xs font-medium text-muted-foreground mb-2">Policy Term</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-foreground">{policyTerm} years</span>
                <span className="text-[10px] text-muted-foreground">10 — 40 years</span>
              </div>
              <input type="range" min={10} max={40} step={5} value={policyTerm}
                onChange={e => setPolicyTerm(Number(e.target.value))}
                className="w-full h-2 rounded-full accent-brand-green cursor-pointer" />
              <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                {[10, 15, 20, 25, 30, 35, 40].map(y => <span key={y}>{y}</span>)}
              </div>
            </div>

            {/* R1 — Recommended Cover */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-green/5 to-emerald-500/5 border border-brand-green/20">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Recommended Life Cover</p>
              <p className="text-[9px] text-muted-foreground mb-4">Human Life Value method — IRDAI advisor standard</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs text-muted-foreground">Minimum (income × 15)</p>
                  <span className="text-sm font-bold text-foreground">{fmtCr(coverRec.minimum)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-brand-green/10 border border-brand-green/25">
                  <div>
                    <p className="text-xs font-bold text-foreground">Recommended (income × 20)</p>
                    <p className="text-[9px] text-brand-green font-semibold mt-0.5">IRDAI advisor consensus</p>
                  </div>
                  <span className="text-xl font-black text-brand-green">{fmtCr(coverRec.recommended)}</span>
                </div>
                {outstandingLoans > 0 && (
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-muted-foreground">With your loans (income × 15 + loans)</p>
                    <span className="text-sm font-bold text-amber-400">{fmtCr(coverRec.withLoans)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* R2 — Plan type comparison */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
              <p className="text-sm font-bold text-foreground mb-1">Which Life Insurance Type Is Right?</p>
              <p className="text-[10px] text-muted-foreground mb-4">IRDAI advisor consensus — unbiased product comparison</p>
              <div className="space-y-3">
                {LIFE_PLAN_TYPES.map((plan, i) => {
                  const Icon = plan.icon;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className={`rounded-2xl border border-border overflow-hidden bg-gradient-to-br ${plan.gradFrom} to-transparent`}>
                      <div className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/10 dark:bg-black/10">
                            <Icon size={18} className={plan.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <h3 className="text-sm font-bold text-foreground">{plan.title}</h3>
                              <VerdictBadge verdict={plan.verdict} />
                            </div>
                            <p className="text-[11px] text-muted-foreground">{plan.what}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Premium Range</p>
                            <p className="text-[10px] font-semibold text-foreground">{plan.premiumRange}</p>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">XIRR / Return</p>
                            <p className={`text-[10px] font-bold ${
                              plan.verdict === 'best' ? 'text-muted-foreground'
                              : plan.verdict === 'avoid' ? 'text-red-400'
                              : plan.verdict === 'acceptable' ? 'text-amber-400'
                              : 'text-blue-400'
                            }`}>{plan.xirr}</p>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/15">
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{plan.note}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* R3 — Premium Simulator */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
              <p className="text-sm font-bold text-foreground mb-1">Estimated Term Premium Range</p>
              <p className="text-[10px] text-muted-foreground mb-4">Pure term — most cost-efficient · For {fmtCr(coverRec.recommended)} recommended cover</p>

              <div className="p-3 rounded-2xl bg-brand-green/10 border border-brand-green/20 mb-4">
                <p className="text-[10px] text-muted-foreground mb-1">{fmtCr(coverRec.recommended)} cover · {policyTerm}-year term</p>
                <p className="text-xl font-black text-foreground">{fmtRange(termRange.lo, termRange.hi)}<span className="text-xs font-normal text-muted-foreground"> /year</span></p>
                <p className="text-brand-green text-xs font-semibold mt-0.5">
                  ≈ {fmtRange(Math.round(termRange.lo / 12 / 50) * 50, Math.round(termRange.hi / 12 / 50) * 50)} /month
                </p>
                {lifeGender === 'female' && <p className="text-[10px] text-emerald-400 mt-1.5">✓ Female discount (15–20%) applied</p>}
                {lifeSmoker && <p className="text-[10px] text-amber-400 mt-1.5">⚠ Smoker loading (50–80%) applied</p>}
              </div>

              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Compare by Policy Term</p>
              <div className="space-y-1.5 mb-4">
                {[{ term: 20, range: termRange20 }, { term: 30, range: termRange30 }, { term: 40, range: termRange40 }].map(({ term, range }) => (
                  <div key={term} className={`flex items-center justify-between p-2.5 rounded-xl ${
                    policyTerm === term ? 'bg-brand-green/10 border border-brand-green/20' : 'bg-slate-50 dark:bg-slate-800/30'
                  }`}>
                    <span className="text-xs font-semibold text-foreground">{term}-year term</span>
                    <span className={`text-xs font-bold ${policyTerm === term ? 'text-brand-green' : 'text-muted-foreground'}`}>{fmtRange(range.lo, range.hi)}/yr</span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Actual premium depends on health declaration, smoking status, occupation, and insurer underwriting. Always get quotes from 2–3 IRDAI-registered insurers.
              </p>
            </div>

            {/* R4 — 80C Tax Benefit */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
              <p className="text-sm font-bold text-foreground mb-1">Tax Benefit on Life Insurance Premium</p>
              <p className="text-[10px] text-muted-foreground mb-4">Section 80C — Old Tax Regime only</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Est. annual premium (low estimate)</span>
                  <span className="text-xs font-semibold text-foreground">{fmt(termRange.lo)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">80C deduction (max ₹1,50,000)</span>
                  <span className="text-xs font-bold text-brand-green">{fmt(tax80C.ded)}</span>
                </div>
                <div className="pt-2 border-t border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tax saved @ 30% slab (incl. 4% cess)</span>
                    <span className="text-xs font-bold text-emerald-400">{fmt(tax80C.saved30)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tax saved @ 20% slab (incl. 4% cess)</span>
                    <span className="text-xs font-bold text-brand-green">{fmt(tax80C.saved20)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] text-amber-400">New tax regime has no 80C deduction for life insurance premiums.</p>
              </div>
            </div>

            {/* R5 — IRDAI Life Protections */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
              <p className="text-sm font-bold text-foreground mb-1">Your Rights — Life Insurance</p>
              <p className="text-[10px] text-muted-foreground mb-3">IRDAI regulatory protections for all policyholders</p>
              <div className="space-y-2.5">
                {IRDAI_LIFE_FACTS.map((fact, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle size={13} className="text-brand-green flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{fact}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Life Disclaimer */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-border">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-bold text-foreground">Disclaimer: </span>
                Life insurance premium estimates are based on published industry ranges and IRDAI actuarial principles. Actual premiums depend on health declaration, lifestyle, and insurer underwriting. This is an educational tool — not financial advice. Always consult an IRDAI-registered financial advisor before purchasing. Verify the Claim Settlement Ratio of any insurer at irdai.gov.in before buying.
              </p>
            </div>

          </div>
        )}

        <CalculatorInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} calculatorTitle="Insurance Calculator" />
      </div>

      <DisclaimerComponent module="insurance" />
    </div>
  );
}