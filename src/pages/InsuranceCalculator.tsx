import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import {
  ArrowLeft, Info, Share2, Shield, HeartPulse,
  CheckCircle, AlertTriangle, ChevronDown, ChevronUp,
  Plus, X, TrendingUp, Banknote, Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DateInput from '../components/DateInput';
import SnapshotPreviewCard from '../components/SnapshotPreviewCard';
import DisclaimerComponent from '../components/DisclaimerComponent';
import SaveNameDialog from '../components/SaveNameDialog';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import { AnalyticsService } from '../lib/analytics';
import { nativeShare } from '../utils/nativeShare';
import { useAppColors } from '../theme/useAppColors';
import { useLiveStatusStore } from '../store/useLiveStatusStore';

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

const CITY_OPTION_VALUES: ('metro' | 'tier2' | 'tier3')[] = ['metro', 'tier2', 'tier3'];

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

function ScoreDial({ score, label: overrideLabel }: { score: number; label?: string }) {
  const { t } = useTranslation();
  const c = useAppColors();
  const R = 90;
  const circ = Math.PI * R;
  const color = score <= 40 ? '#ef4444' : score <= 75 ? '#f59e0b' : '#22c55e';
  const label = overrideLabel || (score <= 40 ? t('ins.health.scoreUnderinsured')
    : score <= 60 ? t('ins.health.scoreUnder')
    : score <= 75 ? t('ins.health.scoreAdequate')
    : score <= 88 ? t('ins.health.scoreWell')
    : t('ins.health.scoreComprehensive'));

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
        <text x="100" y="100" textAnchor="middle" fontSize="11" fill={c.textMuted}>/100</text>
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

function VerdictBadge({ verdict, label }: { verdict: 'best' | 'acceptable' | 'avoid' | 'complex'; label?: string }) {
  const { t } = useTranslation();
  const config = {
    best: { fallback: t('ins.verdicts.best'), cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    acceptable: { fallback: t('ins.verdicts.acceptable'), cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    avoid: { fallback: t('ins.verdicts.avoid'), cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
    complex: { fallback: t('ins.verdicts.complex'), cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  }[verdict];
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.cls}`}>{label || config.fallback}</span>;
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
  const { t } = useTranslation();
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

  // Save-to-MyLoans
  const addProfile = useLiveStatusStore(s => s.addProfile);
  const removeProfile = useLiveStatusStore(s => s.removeProfile);
  const [trackerSaved, setTrackerSaved] = useState(false);
  const [trackerSavedId, setTrackerSavedId] = useState<string | null>(null);
  const [showHealthNameDialog, setShowHealthNameDialog] = useState(false);
  const [showLifeNameDialog, setShowLifeNameDialog] = useState(false);
  const [policyStartDate, setPolicyStartDate] = useState('');

  // ── Life state ───────────────────────────────────────────────────────────────
  const [lifeAge, setLifeAge] = useState(30);
  const [lifeGender, setLifeGender] = useState<'male' | 'female'>('male');
  const [lifeSmoker, setLifeSmoker] = useState(false);
  const [annualIncome, setAnnualIncome] = useState(1200000);
  const [dependents, setDependents] = useState(2);
  const [outstandingLoans, setOutstandingLoans] = useState(0);
  const [policyTerm, setPolicyTerm] = useState(25);
  const [customCover, setCustomCover] = useState(0);

  // ── Translated constants ─────────────────────────────────────────────────────
  const CHECKLIST_KEYS = ['roomRent','restoration','ncb','ped','renew','csr','tpa'] as const;
  const tChecklist = useMemo(() => CHECKLIST_KEYS.map(k => ({
    title: t(`ins.checklist.${k}Title`), body: t(`ins.checklist.${k}Body`),
  })), [t]);

  const IRDAI_KEYS = ['noAge','pedWait','lifetime','moratorium','renewCap','freeLook','cashless','gst','portability','ombudsman'] as const;
  const tIrdaiRights = useMemo(() => IRDAI_KEYS.map(k => ({
    title: t(`ins.irdaiRights.${k}Title`), body: t(`ins.irdaiRights.${k}Body`),
  })), [t]);

  const HOW_TO_BUY_NUMS = [1,2,3,4,5,6,7] as const;
  const tHowToBuy = useMemo(() => HOW_TO_BUY_NUMS.map(n => ({
    step: n, title: t(`ins.howToBuy.step${n}Title`), body: t(`ins.howToBuy.step${n}Body`),
  })), [t]);

  const LIFE_FACT_KEYS = ['f1','f2','f3','f4','f5','f6','f7'] as const;
  const tLifeFacts = useMemo(() => LIFE_FACT_KEYS.map(k => t(`ins.lifeFacts.${k}`)), [t]);

  const CITY_OPTIONS = useMemo(() => CITY_OPTION_VALUES.map(v => ({
    label: t(`ins.health.${v}`),
    value: v,
  })), [t]);

  const PLAN_KEYS = ['term','trop','endowment','ulip'] as const;
  const tPlanTypes = useMemo(() => PLAN_KEYS.map((k, i) => ({
    ...LIFE_PLAN_TYPES[i],
    title: t(`ins.planTypes.${k}.title`),
    what: t(`ins.planTypes.${k}.what`),
    premiumRange: t(`ins.planTypes.${k}.premiumRange`),
    maturity: t(`ins.planTypes.${k}.maturity`),
    xirr: t(`ins.planTypes.${k}.xirr`),
    note: t(`ins.planTypes.${k}.note`),
  })), [t]);

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
    add(`${t('ins.health.self')} (${t('ins.health.ageLbl')} ${selfAge})`, selfAge);
    if (hasSpouse) add(`${t('ins.health.spouse')} (${t('ins.health.ageLbl')} ${spouseAge})`, spouseAge);
    children.forEach((age, i) => add(`${t('ins.health.childLabel', { n: i + 1 })} (${t('ins.health.ageLbl')} ${age === 0 ? '<1' : age})`, age));
    parents.forEach((age, i) => add(`${t('ins.health.parentLabel', { n: i + 1 })} (${t('ins.health.ageLbl')} ${age})`, age));
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
    const cityLabel = city === 'metro' ? t('ins.health.metroCities') : city === 'tier2' ? t('ins.health.tier2Cities') : t('ins.health.yourCity');
    if (adequacyScore < 50)
      return t('ins.health.adequacyLow', { cityLabel, cover: fmtCr(si) });
    if (adequacyScore <= 75)
      return t('ins.health.adequacyMid');
    return t('ins.health.adequacyHigh');
  }, [adequacyScore, city, si, t]);

  // ── Profile-based checklist ──────────────────────────────────────────────────
  const profileChecklist = useMemo(() => {
    const items = [...tChecklist];
    if (children.some(c => c <= 4))
      items.push({ title: t('ins.checklist.newbornCoverTitle'), body: t('ins.checklist.newbornCoverBody') });
    if (children.some(c => c < 18))
      items.push({ title: t('ins.checklist.vaccineTitle'), body: t('ins.checklist.vaccineBody') });
    if (parents.some(a => a >= 60))
      items.push({ title: t('ins.checklist.seniorCopayTitle'), body: t('ins.checklist.seniorCopayBody') });
    if (parents.some(a => a >= 60))
      items.push({ title: t('ins.checklist.seniorSeparateTitle'), body: t('ins.checklist.seniorSeparateBody') });
    if (parents.some(a => a >= 70))
      items.push({ title: t('ins.checklist.elderlyTitle'), body: t('ins.checklist.elderlyBody') });
    if (preExisting)
      items.push({ title: t('ins.checklist.pedDeclareTitle'), body: t('ins.checklist.pedDeclareBody') });
    if (si < 1000000 && city === 'metro')
      items.push({ title: t('ins.checklist.siWarnTitle'), body: t('ins.checklist.siWarnBody') });
    if (allAges.length >= 5)
      items.push({ title: t('ins.checklist.floaterTitle'), body: t('ins.checklist.floaterBody') });
    return items;
  }, [children, parents, preExisting, si, city, allAges.length, t, tChecklist]);

  // ── SI advisory ──────────────────────────────────────────────────────────────
  const siAdvisory = useMemo(() => {
    if (si <= 500000) return { type: 'warn' as const, text: '⚠ ' + t('ins.health.siWarn') };
    if (si <= 1500000) return { type: 'ok' as const, text: '✓ ' + t('ins.health.siOkLow') };
    if (si <= 5000000) return { type: 'ok' as const, text: '✓ ' + t('ins.health.siOkHigh') };
    return { type: 'info' as const, text: t('ins.health.siInfo') };
  }, [si, t]);

  // ── Life results ─────────────────────────────────────────────────────────────
  const coverRec = useMemo(() => ({
    minimum: annualIncome * 15,
    recommended: annualIncome * 20,
    withLoans: annualIncome * 15 + outstandingLoans,
  }), [annualIncome, outstandingLoans]);

  // Active cover: use custom if set, else recommended (income × 20)
  const activeCover = customCover > 0 ? customCover : coverRec.recommended;
  // Scale premiums by the ACTUAL cover shown in the UI. The old 0.5 Cr floor
  // silently priced a ₹50L policy for anyone with a smaller cover (e.g. a
  // ₹40L recommendation was quoted at ₹50L rates). Guard only against <= 0.
  const activeCoverCr = Math.max(activeCover / 10000000, 0.05);

  const termRange = useMemo(
    () => calcTermRange(lifeAge, lifeGender, lifeSmoker, activeCoverCr, policyTerm),
    [lifeAge, lifeGender, lifeSmoker, activeCoverCr, policyTerm],
  );
  const termRange20 = useMemo(
    () => calcTermRange(lifeAge, lifeGender, lifeSmoker, activeCoverCr, 20),
    [lifeAge, lifeGender, lifeSmoker, activeCoverCr],
  );
  const termRange30 = useMemo(
    () => calcTermRange(lifeAge, lifeGender, lifeSmoker, activeCoverCr, 30),
    [lifeAge, lifeGender, lifeSmoker, activeCoverCr],
  );
  const termRange40 = useMemo(
    () => calcTermRange(lifeAge, lifeGender, lifeSmoker, activeCoverCr, 40),
    [lifeAge, lifeGender, lifeSmoker, activeCoverCr],
  );

  const tax80C = useMemo(() => {
    const ded = Math.min(termRange.lo, 150000);
    return { ded, saved30: Math.round(ded * 0.30 * 1.04), saved20: Math.round(ded * 0.20 * 1.04) };
  }, [termRange.lo]);

  const suggestedHealthName = `Health Cover — ${fmtCr(si)} • ${allAges.length} members`;
  const suggestedLifeName = `Life Term — ${fmtCr(activeCover)}`;

  // ── 1. FINAL RECOMMENDATION ENGINE (Health: Base + Top-Up Split) ──────────
  const healthRec = useMemo(() => {
    const cityMinBase = city === 'metro' ? 1000000 : city === 'tier2' ? 500000 : 300000;
    let totalNeed = city === 'metro' ? 2500000 : city === 'tier2' ? 1500000 : 1000000;
    if (parents.some(a => a >= 60)) totalNeed = Math.round(totalNeed * 1.4);
    if (preExisting) totalNeed = Math.round(totalNeed * 1.2);
    if (allAges.length >= 5) totalNeed = Math.round(totalNeed * 1.15);
    const recBase = Math.min(si, cityMinBase);
    const topUpNeeded = Math.max(0, totalNeed - si);
    const topUpPremiumEst = topUpNeeded > 0 ? Math.round(topUpNeeded * 0.003) : 0; // ~₹3 per ₹1000 SI
    return { totalNeed, recBase, topUpNeeded, topUpPremiumEst, isAdequate: si >= totalNeed };
  }, [si, city, parents, preExisting, allAges.length]);

  // ── 2. UNDERINSURANCE ALERTS ──────────────────────────────────────────────
  const underinsuranceAlerts = useMemo(() => {
    const alerts: { type: 'critical' | 'warning'; title: string; desc: string }[] = [];
    const icuDaily = city === 'metro' ? 45000 : city === 'tier2' ? 25000 : 15000;
    const icuCost10Days = icuDaily * 10;
    if (si < icuCost10Days)
      alerts.push({ type: 'critical', title: t('ins.advisor.alertICU', 'Coverage < 10-Day ICU Cost'), desc: t('ins.advisor.alertICUDesc', { cost: fmt(icuCost10Days), cover: fmtCr(si), defaultValue: '10-day ICU stay costs ~{{cost}} in your city. Your cover of {{cover}} may not be enough.' }) });
    const heartSurgeryCost = city === 'metro' ? 600000 : 350000;
    if (si < heartSurgeryCost)
      alerts.push({ type: 'critical', title: t('ins.advisor.alertHeart', 'Coverage < Heart Surgery Cost'), desc: t('ins.advisor.alertHeartDesc', { cost: fmt(heartSurgeryCost), defaultValue: 'Heart bypass/stent surgery costs ~{{cost}} in your city. Consider increasing cover.' }) });
    if (parents.some(a => a >= 60) && si < 1500000)
      alerts.push({ type: 'warning', title: t('ins.advisor.alertSenior', 'Senior Parents — Low Cover'), desc: t('ins.advisor.alertSeniorDesc', 'Parents 60+ have higher hospitalisation rates. ₹15L+ cover recommended for families with senior members.') });
    const siL = si / 100000;
    if (city === 'metro' && siL < 10)
      alerts.push({ type: 'warning', title: t('ins.advisor.alertMetro', 'Metro City — Cover Below ₹10L'), desc: t('ins.advisor.alertMetroDesc', 'Average metro hospitalisation costs ₹3-5L. With ICU/surgery, costs reach ₹10-25L. ₹10L is the minimum for metros.') });
    return alerts;
  }, [si, city, parents, t]);

  // ── 3. REAL-WORLD COST TABLE ──────────────────────────────────────────────
  const hospitalCosts = useMemo(() => {
    const mul = city === 'metro' ? 1.0 : city === 'tier2' ? 0.6 : 0.4;
    return [
      { procedure: t('ins.advisor.costICU', 'ICU (per day)'), cost: Math.round(45000 * mul), range: `${fmt(Math.round(35000 * mul))} — ${fmt(Math.round(55000 * mul))}` },
      { procedure: t('ins.advisor.costHeart', 'Heart Surgery'), cost: Math.round(600000 * mul), range: `${fmt(Math.round(400000 * mul))} — ${fmt(Math.round(800000 * mul))}` },
      { procedure: t('ins.advisor.costKnee', 'Knee Replacement'), cost: Math.round(350000 * mul), range: `${fmt(Math.round(250000 * mul))} — ${fmt(Math.round(500000 * mul))}` },
      { procedure: t('ins.advisor.costCancer', 'Cancer Treatment'), cost: Math.round(1500000 * mul), range: `${fmt(Math.round(800000 * mul))} — ${fmt(Math.round(2500000 * mul))}` },
      { procedure: t('ins.advisor.costMaternity', 'Normal Delivery'), cost: Math.round(80000 * mul), range: `${fmt(Math.round(50000 * mul))} — ${fmt(Math.round(150000 * mul))}` },
      { procedure: t('ins.advisor.costCSection', 'C-Section'), cost: Math.round(200000 * mul), range: `${fmt(Math.round(120000 * mul))} — ${fmt(Math.round(350000 * mul))}` },
    ];
  }, [city, t]);

  // ── 4. FAMILY INTELLIGENCE ────────────────────────────────────────────────
  const familyInsights = useMemo(() => {
    const tips: { icon: string; text: string }[] = [];
    if (parents.length > 0 && parents.some(a => a >= 60))
      tips.push({ icon: '👴', text: t('ins.advisor.famSenior', 'Consider a separate policy for parents 60+. Family floater with senior members significantly increases premiums for younger members.') });
    if (hasSpouse && children.length === 0)
      tips.push({ icon: '👫', text: t('ins.advisor.famCouple', 'Young couple without kids — ideal time to lock in low premiums. Add maternity cover if planning children.') });
    if (children.some(c => c <= 1))
      tips.push({ icon: '👶', text: t('ins.advisor.famNewborn', 'Newborns need day-care procedure cover (not just hospitalisation). Check if your plan covers vaccinations & paediatric emergencies.') });
    if (allAges.length >= 5)
      tips.push({ icon: '👨‍👩‍👧‍👦', text: t('ins.advisor.famLarge', 'Large family (5+ members) — consider splitting into 2 policies: one for young family, one for parents. Better coverage at similar cost.') });
    if (allAges.every(a => a < 35))
      tips.push({ icon: '💪', text: t('ins.advisor.famYoung', 'All members under 35 — you get the best premium rates now. Lock in a high sum insured (₹25L+) with lifetime renewability.') });
    return tips;
  }, [parents, hasSpouse, children, allAges, t]);

  // ── 5. LIFE COVER LOGIC (Enhanced) ────────────────────────────────────────
  const lifeCoverDetailed = useMemo(() => {
    const incomeReplace = annualIncome * 15;
    const loanCover = outstandingLoans;
    const childEducation = children.length > 0 ? children.length * 2500000 : dependents * 2000000; // ₹25L per child
    const emergencyFund = annualIncome; // 1 year
    const total = incomeReplace + loanCover + childEducation + emergencyFund;
    return { incomeReplace, loanCover, childEducation, emergencyFund, total };
  }, [annualIncome, outstandingLoans, children.length, dependents]);

  // ── 6. WHAT-IF STATE ──────────────────────────────────────────────────────
  const [whatIfSi, setWhatIfSi] = useState(si);
  const [whatIfTerm, setWhatIfTerm] = useState(policyTerm);
  useEffect(() => { setWhatIfSi(si); }, [si]);
  useEffect(() => { setWhatIfTerm(policyTerm); }, [policyTerm]);
  const whatIfHealthPremium = useMemo(() => {
    const siL = whatIfSi / 100000;
    let rawLo = 0, rawHi = 0;
    allAges.forEach(age => {
      const [lo, hi] = getMemberPremium(age, siL >= 1 ? whatIfSi : whatIfSi, city, preExisting);
      rawLo += lo; rawHi += hi;
    });
    const ff = getFloaterFactor(allAges.length);
    return { lo: Math.round(rawLo * ff / 100) * 100, hi: Math.round(rawHi * ff / 100) * 100 };
  }, [whatIfSi, allAges, city, preExisting]);
  const whatIfLifePremium = useMemo(
    () => calcTermRange(lifeAge, lifeGender, lifeSmoker, activeCoverCr, whatIfTerm),
    [lifeAge, lifeGender, lifeSmoker, activeCoverCr, whatIfTerm],
  );

  // ── 7. CSR IMPACT INSIGHT ─────────────────────────────────────────────────
  const csrInsight = useMemo(() => {
    // Illustrative: show how CSR affects claim probability
    return [
      { csr: 98, label: t('ins.advisor.csrExcellent', 'CSR 98%+'), desc: t('ins.advisor.csrExcellentDesc', '98 out of 100 claims settled. Top-tier insurers. Look for this.'), color: '#22c55e' },
      { csr: 95, label: t('ins.advisor.csrGood', 'CSR 95-97%'), desc: t('ins.advisor.csrGoodDesc', '95-97 claims settled per 100. Reliable. Most major insurers fall here.'), color: '#84cc16' },
      { csr: 90, label: t('ins.advisor.csrAvg', 'CSR 90-94%'), desc: t('ins.advisor.csrAvgDesc', '5-10 claims rejected per 100. Check complaint ratio before choosing.'), color: '#f59e0b' },
      { csr: 85, label: t('ins.advisor.csrPoor', 'CSR <90%'), desc: t('ins.advisor.csrPoorDesc', 'More than 10% claims rejected. Avoid unless very low premiums justify the risk.'), color: '#ef4444' },
    ];
  }, [t]);

  // ── Save snapshot to My Loans tracker ────────────────────────────────────────
  const handleHealthTrackerSave = (customName: string) => {
    const id = `ins-h-${Date.now()}`;
    addProfile({
      id,
      name: customName,
      calculatorType: 'Insurance',
      profileData: {
        tab: 'health',
        sumInsured: si,
        premiumMin: premiumData.lo,
        premiumMax: premiumData.hi,
        members: allAges.length,
        city,
        startDate: policyStartDate || new Date().toISOString().slice(0, 10),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setTrackerSavedId(id);
    setTrackerSaved(true);
  };

  const handleLifeTrackerSave = (customName: string) => {
    const id = `ins-l-${Date.now()}`;
    addProfile({
      id,
      name: customName,
      calculatorType: 'Insurance',
      profileData: {
        tab: 'life',
        sumInsured: activeCover,
        premiumMin: termRange.lo,
        premiumMax: termRange.hi,
        age: lifeAge,
        policyTerm,
        startDate: policyStartDate || new Date().toISOString().slice(0, 10),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setTrackerSavedId(id);
    setTrackerSaved(true);
  };

  const handleTrackerRemove = () => {
    if (trackerSavedId) {
      removeProfile(trackerSavedId);
      setTrackerSavedId(null);
      setTrackerSaved(false);
    }
  };

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
      await nativeShare(t('ins.share.healthTitle'),
        t('ins.share.healthBody', { members: allAges.length, cover: fmtCr(si), city: city.charAt(0).toUpperCase() + city.slice(1), premium: fmtRange(premiumData.lo, premiumData.hi), score: adequacyScore })
      );
    } else {
      await nativeShare(t('ins.share.lifeTitle'),
        t('ins.share.lifeBody', { age: lifeAge, income: fmtCr(annualIncome), cover: fmtCr(coverRec.recommended), premium: fmtRange(termRange.lo, termRange.hi) })
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
              <h1 className="text-lg font-bold text-slate-900 dark:text-foreground">{t('ins.title')}</h1>
              <p className="text-muted-foreground text-xs">{t('ins.subtitle')}</p>
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
            { key: 'health' as InsuranceTab, label: t('ins.healthTab'), icon: HeartPulse },
            { key: 'life' as InsuranceTab, label: t('ins.lifeTab'), icon: Shield },
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
                <h2 className="text-sm font-bold text-slate-900 dark:text-foreground">{t('ins.health.whoNeeds')}</h2>
              </div>

              {/* Self */}
              <div className="mb-3">
                <NumberInput label={t('ins.health.selfAge')} value={selfAge} onChange={setSelfAge} min={18} max={80} suffix={` ${t('ins.health.years')}`} />
              </div>

              {/* Spouse */}
              {hasSpouse ? (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">{t('ins.health.spouse')}</span>
                    <button onClick={() => setHasSpouse(false)} className="p-1 rounded-lg hover:bg-muted">
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                  <NumberInput label={t('ins.health.spouseAge')} value={spouseAge} onChange={setSpouseAge} min={18} max={80} suffix={` ${t('ins.health.years')}`} />
                </div>
              ) : (
                <button onClick={() => setHasSpouse(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-brand-green/40 text-brand-green text-xs font-semibold mb-3 hover:bg-brand-green/5 transition-colors">
                  <Plus size={14} /> {t('ins.health.addSpouse')}
                </button>
              )}

              {/* Children */}
              {children.map((age, i) => (
                <div key={i} className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {t('ins.health.childLabel', { n: i + 1 })} {age === 0 ? `— ${t('ins.health.infant')}` : `— ${age} ${t('ins.health.years')}`}
                    </span>
                    <button onClick={() => removeChild(i)} className="p-1 rounded-lg hover:bg-muted">
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                  <NumberInput label={t('ins.health.childAge', { n: i + 1 })} value={age} onChange={v => updateChild(i, v)} min={0} max={25} suffix={` ${t('ins.health.years')}`} />
                  {age === 0 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-[11px] text-amber-400 flex items-start gap-1.5">
                        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                        {t('ins.health.newbornWarn')}
                      </p>
                    </div>
                  )}
                  {age >= 25 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-[11px] text-amber-400 flex items-start gap-1.5">
                        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                        {t('ins.health.childAbove25')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {children.length < 4 && (
                <button onClick={addChild}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-blue-500/40 text-blue-400 text-xs font-semibold mb-3 hover:bg-blue-500/5 transition-colors">
                  <Plus size={14} /> {t('ins.health.addChild')}
                </button>
              )}

              {/* Parents */}
              {parents.map((age, i) => (
                <div key={i} className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">{t('ins.health.parentLabel', { n: i + 1 })}</span>
                    <button onClick={() => removeParent(i)} className="p-1 rounded-lg hover:bg-muted">
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                  <NumberInput label={t('ins.health.parentAge', { n: i + 1 })} value={age} onChange={v => updateParent(i, v)} min={40} max={90} suffix={` ${t('ins.health.years')}`} />
                  {age >= 70 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-[11px] text-red-400 flex items-start gap-1.5">
                        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                        {t('ins.health.parent70Warn')}
                      </p>
                    </div>
                  )}
                  {age >= 60 && age < 70 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-[11px] text-amber-400 flex items-start gap-1.5">
                        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                        {t('ins.health.parent60Warn')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {parents.length < 4 && (
                <button onClick={addParent}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-purple-500/40 text-purple-400 text-xs font-semibold hover:bg-purple-500/5 transition-colors">
                  <Plus size={14} /> {t('ins.health.addParent')}
                </button>
              )}
            </div>

            {/* SECTION 2 — Coverage Details */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
              <h2 className="text-sm font-bold text-slate-900 dark:text-foreground mb-4">{t('ins.health.coverageDetails')}</h2>
              <PillSelector label={t('ins.health.sumInsured')} options={SUM_INSURED_OPTIONS} value={si} onChange={v => { setSi(v); setHealthCalced(false); }} />
              <div className={`mb-4 px-3 py-2.5 rounded-xl text-[11px] font-medium ${
                siAdvisory.type === 'warn' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : siAdvisory.type === 'ok' ? 'bg-brand-green/10 text-brand-green border border-brand-green/20'
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>{siAdvisory.text}</div>
              <PillSelector label={t('ins.health.cityType')} options={CITY_OPTIONS} value={city} onChange={v => { setCity(v); setHealthCalced(false); }} />
              <Toggle label={t('ins.health.preExisting')} value={preExisting} onChange={v => { setPreExisting(v); setHealthCalced(false); }} />
            </div>

            {/* SECTION 3 — Calculate */}
            <button onClick={() => setHealthCalced(true)}
              className="w-full py-4 rounded-2xl bg-brand-green text-black font-bold text-sm shadow-lg shadow-brand-green/20 active:scale-[0.98] transition-transform">
              {t('ins.health.calcButton')}
            </button>

            {/* ── RESULTS ─────────────────────────────────────────────────────── */}
            <AnimatePresence>
              {healthCalced && (
                <motion.div key="health-results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                  {/* CARD A — Coverage Adequacy Score */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                    <p className="text-sm font-bold text-foreground mb-0.5">{t('ins.health.adequacyTitle')}</p>
                    <p className="text-[10px] text-muted-foreground mb-3">{t('ins.health.adequacySubtitle')}</p>
                    <ScoreDial score={adequacyScore} label={
                      adequacyScore <= 40 ? t('ins.health.scoreUnderinsured')
                      : adequacyScore <= 60 ? t('ins.health.scoreUnder')
                      : adequacyScore <= 75 ? t('ins.health.scoreAdequate')
                      : adequacyScore <= 88 ? t('ins.health.scoreWell')
                      : t('ins.health.scoreComprehensive')
                    } />
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-4 text-center px-2">{adequacyExplanation}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[
                        { label: t('ins.health.cover'), val: fmtCr(si) },
                        { label: t('ins.health.city'), val: city.charAt(0).toUpperCase() + city.slice(1) },
                        { label: t('ins.health.members'), val: String(allAges.length) },
                      ].map(({ label, val }) => (
                        <div key={label} className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold">{label}</p>
                          <p className="text-xs font-bold text-foreground">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── UNDERINSURANCE ALERTS ── */}
                  {underinsuranceAlerts.length > 0 && (
                    <div className="space-y-2">
                      {underinsuranceAlerts.map((alert, i) => (
                        <div key={i} className="p-3 rounded-2xl flex gap-3 items-start" style={{ backgroundColor: alert.type === 'critical' ? '#EF444415' : '#F59E0B15', border: `1px solid ${alert.type === 'critical' ? '#EF444440' : '#F59E0B40'}` }}>
                          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: alert.type === 'critical' ? '#EF4444' : '#F59E0B' }} />
                          <div>
                            <p className="text-xs font-bold" style={{ color: alert.type === 'critical' ? '#EF4444' : '#F59E0B' }}>{alert.title}</p>
                            <p className="text-[10px] mt-0.5 text-muted-foreground">{alert.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── FINAL RECOMMENDATION: Base + Top-Up Split ── */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield size={15} className="text-brand-green" />
                      <h3 className="text-sm font-bold text-foreground">{t('ins.advisor.recTitle', 'Coverage Recommendation')}</h3>
                    </div>
                    <div className={`grid ${healthRec.topUpNeeded > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mb-3`}>
                      <div className="p-3 rounded-xl text-center" style={{ background: '#22c55e10' }}>
                        <p className="text-[9px] uppercase font-bold text-emerald-500">{t('ins.advisor.basePlan', 'Base Plan')}</p>
                        <p className="text-lg font-black text-emerald-600">{fmtCr(si)}</p>
                        <p className="text-[9px] text-muted-foreground">{t('ins.advisor.yourCurrent', 'Your current selection')}</p>
                      </div>
                      {healthRec.topUpNeeded > 0 && (
                        <div className="p-3 rounded-xl text-center" style={{ background: '#3b82f610' }}>
                          <p className="text-[9px] uppercase font-bold text-blue-500">{t('ins.advisor.topUp', '+ Top-Up Plan')}</p>
                          <p className="text-lg font-black text-blue-600">{fmtCr(healthRec.topUpNeeded)}</p>
                          <p className="text-[9px] text-muted-foreground">~{fmt(healthRec.topUpPremiumEst)}/{t('ins.life.yr', 'yr')}</p>
                        </div>
                      )}
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: healthRec.isAdequate ? '#22c55e10' : '#f59e0b10', border: `1px solid ${healthRec.isAdequate ? '#22c55e30' : '#f59e0b30'}` }}>
                      <p className="text-[11px] leading-relaxed" style={{ color: healthRec.isAdequate ? '#22c55e' : '#f59e0b' }}>
                        {healthRec.isAdequate
                          ? t('ins.advisor.recAdequate', 'Your coverage meets the recommended level for your city and family profile.')
                          : t('ins.advisor.recTopUp', { total: fmtCr(healthRec.totalNeed), topUp: fmtCr(healthRec.topUpNeeded), premium: fmt(healthRec.topUpPremiumEst), defaultValue: 'Recommended total: {{total}}. Add a top-up of {{topUp}} at ~{{premium}}/yr for full protection.' })}
                      </p>
                    </div>
                  </div>

                  {/* CARD B — Estimated Premium Range */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-green/5 to-emerald-500/5 border border-brand-green/20">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t('ins.health.premiumTitle')}</p>
                    <p className="text-[9px] text-muted-foreground mb-3">{t('ins.health.premiumSubtitle', { members: allAges.length, cover: fmtCr(si), city })}</p>
                    <p className="text-2xl font-black text-foreground mb-0.5">{fmtRange(premiumData.lo, premiumData.hi)}</p>
                    <p className="text-brand-green text-sm font-semibold mb-4">
                      ≈ {fmtRange(Math.round(premiumData.lo / 12 / 100) * 100, Math.round(premiumData.hi / 12 / 100) * 100)} {t('ins.health.perMonth')}
                    </p>

                    {/* Per-member breakdown */}
                    <button
                      onClick={() => setShowPremiumBreakdown(v => !v)}
                      className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/60 dark:bg-black/10 border border-brand-green/15 mb-3">
                      <span className="text-[11px] font-semibold text-foreground">{t('ins.health.memberBreakdown')}</span>
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
                              <span className="text-[11px] text-muted-foreground">{t('ins.health.floaterDiscount')}</span>
                              <span className="text-[11px] font-bold text-brand-green">−{premiumData.floaterPct}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-foreground">{t('ins.health.total')}</span>
                              <span className="text-[11px] font-black text-foreground">{fmtRange(premiumData.lo, premiumData.hi)}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {preExisting && (
                      <p className="text-[10px] text-amber-400 mb-3 flex items-center gap-1">
                        <AlertTriangle size={11} /> {t('ins.health.preExistingLoading')}
                      </p>
                    )}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-border">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {t('ins.health.premiumDisclaimer')}
                      </p>
                    </div>
                  </div>

                  {/* SECTION 80D TAX BENEFIT — old regime only.
                      Section 80D limits (FY 2025-26):
                        • Self / spouse / kids (all <60): up to ₹25,000
                        • Self / spouse / kids if any insured is 60+: up to ₹50,000
                        • Parents (<60): additional up to ₹25,000
                        • Parents (60+): additional up to ₹50,000
                      Total max possible = ₹1,00,000 (senior self + senior parents).
                      Health insurance premium GST EXEMPT since 22 Sep 2025 (per
                      56th GST Council). We compute the *eligible cap*, not the
                      actual premium paid, and let the user see how much of that
                      cap they are fully utilising. */}
                  {(() => {
                    const adultsForSelf = [selfAge, ...(hasSpouse ? [spouseAge] : []), ...children];
                    const selfFamilySeniorPresent = adultsForSelf.some(a => a >= 60);
                    const selfFamilyCap = selfFamilySeniorPresent ? 50000 : 25000;
                    const parentsSeniorPresent = parents.some(a => a >= 60);
                    const parentsCap = parents.length > 0 ? (parentsSeniorPresent ? 50000 : 25000) : 0;
                    const totalCap = selfFamilyCap + parentsCap;
                    // Premium midpoint as a quick estimate of how much they will actually spend.
                    const premiumMid = (premiumData.lo + premiumData.hi) / 2;
                    const eligibleClaim = Math.min(premiumMid, totalCap);
                    // Tax saved depends on the user's slab — show 30% (top slab) as the
                    // best-case savings, and 20% as a more typical case.
                    const savedAt30 = Math.round(eligibleClaim * 0.30);
                    const savedAt20 = Math.round(eligibleClaim * 0.20);
                    return (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/5 to-indigo-500/5 border border-violet-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">💸</span>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {t('ins.health.section80dTitle', 'Section 80D Tax Benefit')}
                          </p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-3">
                          {t('ins.health.section80dSubtitle', 'You can claim health-insurance premiums as a deduction in the OLD tax regime')}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/40 border border-violet-500/10">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">
                              {t('ins.health.eligibleClaim', 'Eligible to claim')}
                            </p>
                            <p className="text-sm font-black text-violet-500">{fmt(eligibleClaim)}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              {t('ins.health.outOfCap', 'of {{cap}} cap', { cap: fmt(totalCap) })}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/40 border border-emerald-500/10">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">
                              {t('ins.health.taxSaved', 'Tax saved')}
                            </p>
                            <p className="text-sm font-black text-emerald-500">{fmt(savedAt30)}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              {t('ins.health.taxSavedAt', '30% slab · {{lower}} at 20%', { lower: fmt(savedAt20) })}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1 text-[10px] text-muted-foreground">
                          <p>• {t('ins.health.section80dCap1', 'Self + family: {{cap}}', { cap: fmt(selfFamilyCap) })}{selfFamilySeniorPresent ? ` (${t('ins.health.seniorIncluded', 'senior member included')})` : ''}</p>
                          {parents.length > 0 && (
                            <p>• {t('ins.health.section80dCap2', 'Parents: {{cap}}', { cap: fmt(parentsCap) })}{parentsSeniorPresent ? ` (${t('ins.health.seniorParents', 'senior parents')})` : ''}</p>
                          )}
                          <p className="pt-1 italic">
                            {t('ins.health.section80dNote', '⚠ Available only in OLD tax regime. Health insurance premiums are GST-exempt since 22 Sep 2025.')}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* POLICY START DATE — feeds the My Loans / Trackers card */}
                  {!trackerSaved && (
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2 block">
                        {t('common.investmentDate', 'Investment Date (optional)')}
                      </label>
                      <DateInput
                        value={policyStartDate}
                        onChange={setPolicyStartDate}
                        max={new Date().toISOString().slice(0, 10)}
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground text-left"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {t('common.investmentDateHint', 'Used for tracking in My Loans')}
                      </p>
                    </div>
                  )}

                  {/* HEALTH POLICY SNAPSHOT — appears the moment user picks a date */}
                  {policyStartDate && (
                    <SnapshotPreviewCard
                      anchorDate={policyStartDate}
                      headline={fmt(si)}
                      headlineLabel={t('ins.health.cover', 'Sum Insured')}
                      subtitle={t('ins.health.snapshotSubtitle', '{{members}} members, IRDAI-based premium estimate', { members: allAges.length })}
                      metrics={[
                        { label: t('ins.health.premiumMin', 'Premium (min)'), value: fmt(premiumData.lo), tone: 'investment' },
                        { label: t('ins.health.premiumMax', 'Premium (max)'), value: fmt(premiumData.hi), tone: 'expense' },
                        { label: t('ins.health.members', 'Members'), value: String(allAges.length), tone: 'neutral' },
                      ]}
                      notes={[
                        { label: t('ins.health.city', 'City'), value: city === 'metro' ? 'Metro' : city === 'tier2' ? 'Tier 2' : 'Tier 3' },
                        { label: t('ins.health.adequacy', 'Adequacy score'), value: `${adequacyScore}%` },
                        { label: t('ins.health.preExisting', 'Pre-existing'), value: preExisting ? 'Yes' : 'No' },
                      ]}
                      label={t('ins.health.snapshotTitle', 'Health Insurance Snapshot')}
                    />
                  )}

                  {/* Save to My Loans */}
                  {trackerSaved ? (
                    <div className="flex gap-2">
                      <div className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle size={16} /> {t('common.saved')}
                      </div>
                      <button onClick={() => navigate('/my-loans')}
                        className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-brand-green/10 text-brand-green border border-brand-green/20">
                        {t('common.viewInMyLoans', 'View')}
                      </button>
                      <button onClick={handleTrackerRemove}
                        className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowHealthNameDialog(true)}
                      className="w-full py-3.5 rounded-2xl bg-brand-green text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-green/20">
                      💾 {t('myLoans.saveToTracker')}
                    </button>
                  )}

                  <SaveNameDialog
                    open={showHealthNameDialog}
                    onClose={() => setShowHealthNameDialog(false)}
                    onConfirm={(name) => handleHealthTrackerSave(name)}
                    defaultName={suggestedHealthName}
                  />

                  {/* ── REAL-WORLD HOSPITAL COSTS ── */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <HeartPulse size={15} className="text-red-500" />
                      <h3 className="text-sm font-bold text-foreground">{t('ins.advisor.costTitle', 'Real Hospital Costs in Your City')}</h3>
                    </div>
                    <div className="space-y-1.5">
                      {hospitalCosts.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: si < item.cost ? '#ef44440a' : '#22c55e0a' }}>
                          <span className="text-[11px] font-medium text-foreground">{item.procedure}</span>
                          <div className="text-right">
                            <span className={`text-[10px] font-bold ${si < item.cost ? 'text-red-500' : 'text-emerald-500'}`}>{item.range}</span>
                            {si < item.cost && <p className="text-[8px] text-red-400">{t('ins.advisor.exceedsCover', 'exceeds your cover')}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-2 italic">{t('ins.advisor.costNote', 'Costs are indicative ranges based on city type. Actual costs vary by hospital.')}</p>
                  </div>

                  {/* ── FAMILY INTELLIGENCE ── */}
                  {familyInsights.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <Users size={15} className="text-violet-500" />
                        <h3 className="text-sm font-bold text-foreground">{t('ins.advisor.familyTitle', 'Family-Specific Advice')}</h3>
                      </div>
                      <div className="space-y-2">
                        {familyInsights.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-violet-500/5 border border-violet-500/15">
                            <span className="text-base flex-shrink-0">{tip.icon}</span>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{tip.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── WHAT-IF SIMULATOR (Health) ── */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp size={15} className="text-blue-500" />
                      <h3 className="text-sm font-bold text-foreground">{t('ins.advisor.whatIfTitle', 'What-If: Change Coverage')}</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-3">{t('ins.advisor.whatIfDesc', 'Slide to see how coverage amount affects your premium')}</p>
                    <div className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-bold text-foreground">{t('ins.advisor.whatIfCover', 'Coverage')}</span>
                        <span className="text-[10px] font-bold text-blue-500">{fmtCr(whatIfSi)}</span>
                      </div>
                      <input type="range" min={300000} max={10000000} step={100000} value={whatIfSi} onChange={e => setWhatIfSi(Number(e.target.value))} className="w-full accent-blue-500 h-2" />
                      <div className="flex justify-between text-[8px] text-muted-foreground"><span>₹3L</span><span>₹25L</span><span>₹50L</span><span>₹1Cr</span></div>
                    </div>
                    <div className="p-3 rounded-xl text-center" style={{ background: '#3b82f610' }}>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">{t('ins.advisor.whatIfPremium', 'Estimated Annual Premium')}</p>
                      <p className="text-xl font-black text-blue-600">{fmtRange(whatIfHealthPremium.lo, whatIfHealthPremium.hi)}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">≈ {fmtRange(Math.round(whatIfHealthPremium.lo / 12 / 100) * 100, Math.round(whatIfHealthPremium.hi / 12 / 100) * 100)}/{t('ins.health.perMonth', 'mo')}</p>
                    </div>
                  </div>

                  {/* ── CSR CLAIM RISK INSIGHTS ── */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle size={15} className="text-emerald-500" />
                      <h3 className="text-sm font-bold text-foreground">{t('ins.advisor.csrTitle', 'Claim Settlement — What CSR Means')}</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-3">{t('ins.advisor.csrDesc', 'CSR (Claim Settlement Ratio) = claims paid ÷ claims received. Higher = better.')}</p>
                    <div className="space-y-1.5">
                      {csrInsight.map((tier, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: `${tier.color}08`, border: `1px solid ${tier.color}20` }}>
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${tier.color}15` }}>
                            <span className="text-sm font-black" style={{ color: tier.color }}>{tier.csr}%</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-[11px] font-bold" style={{ color: tier.color }}>{tier.label}</p>
                            <p className="text-[10px] text-muted-foreground">{tier.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-2 italic">{t('ins.advisor.csrSource', 'Source: IRDAI Annual Report. Always verify at irdai.gov.in')}</p>
                  </div>

                  {/* CARD C — Personalised Checklist */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                    <p className="text-sm font-bold text-foreground mb-0.5">{t('ins.health.checklistTitle')}</p>
                    <p className="text-[10px] text-muted-foreground mb-4">{t('ins.health.checklistSubtitle')}</p>
                    <div className="space-y-2">
                      {profileChecklist.map((item, i) => (
                        <AccordionItem key={i} idx={i} title={item.title} body={item.body}
                          open={openChecklist.has(i)} onToggle={() => toggleChecklist(i)} />
                      ))}
                    </div>
                  </div>

                  {/* CARD D — IRDAI Rights */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                    <p className="text-sm font-bold text-foreground mb-0.5">{t('ins.health.rightsTitle')}</p>
                    <p className="text-[10px] text-muted-foreground mb-3">{t('ins.health.rightsSubtitle')}</p>
                    <div className="space-y-3">
                      {tIrdaiRights.map((right, i) => (
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
                      {t('ins.health.rightsSource')}
                    </p>
                  </div>

                  {/* CARD E — How to Buy */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                    <p className="text-sm font-bold text-foreground mb-4">{t('ins.health.howToBuyTitle')}</p>
                    <div className="space-y-4">
                      {tHowToBuy.map((s) => (
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
                    <p className="text-[10px] font-bold text-foreground mb-1">{t('ins.health.disclaimerTitle')}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
                      {t('ins.health.disclaimerBody1')}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
                      {t('ins.health.disclaimerBody2')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('ins.health.disclaimerBody3')}
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
              <h2 className="text-sm font-bold text-slate-900 dark:text-foreground mb-4">{t('ins.life.calcTitle')}</h2>
              <NumberInput label={t('ins.life.yourAge')} value={lifeAge} onChange={setLifeAge} min={18} max={65} suffix={` ${t('ins.health.years')}`} />
              <div className="h-3" />
              <PillSelector label={t('ins.life.gender')}
                options={[{ label: `👨 ${t('ins.life.male')}`, value: 'male' as const }, { label: `👩 ${t('ins.life.female')}`, value: 'female' as const }]}
                value={lifeGender} onChange={setLifeGender} />
              <Toggle label={t('ins.life.smoker')} value={lifeSmoker} onChange={setLifeSmoker} />
              <NumberInput label={t('ins.life.annualIncome')} value={annualIncome} onChange={setAnnualIncome} min={100000} max={100000000} prefix="₹" helperText={t('ins.life.annualIncomeHelper')} />
              <div className="h-3" />
              <PillSelector label={t('ins.life.dependents')}
                options={[0, 1, 2, 3].map(n => ({ label: n === 0 ? t('ins.life.none') : String(n), value: n })).concat([{ label: t('ins.life.fourPlus'), value: 4 }])}
                value={dependents} onChange={setDependents} />
              <NumberInput label={t('ins.life.outstandingLoans')} value={outstandingLoans} onChange={setOutstandingLoans}
                min={0} max={100000000} prefix="₹" helperText={t('ins.life.loansHelper')} />
              <div className="h-3" />
              <p className="text-xs font-medium text-muted-foreground mb-2">{t('ins.life.policyTerm')}</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-foreground">{policyTerm} {t('ins.health.years')}</span>
                <span className="text-[10px] text-muted-foreground">{t('ins.life.termRange', { min: 10, max: 40 })}</span>
              </div>
              <input type="range" min={10} max={40} step={5} value={policyTerm}
                onChange={e => setPolicyTerm(Number(e.target.value))}
                className="w-full h-2 rounded-full accent-brand-green cursor-pointer" />
              <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                {[10, 15, 20, 25, 30, 35, 40].map(y => <span key={y}>{y}</span>)}
              </div>
              <div className="h-3" />
              <p className="text-xs font-medium text-muted-foreground mb-2">{t('ins.life.customCover')}</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  { label: t('ins.life.none'), value: 0 },
                  { label: '₹1Cr', value: 10000000 },
                  { label: '₹2Cr', value: 20000000 },
                  { label: '₹3Cr', value: 30000000 },
                  { label: '₹5Cr', value: 50000000 },
                  { label: '₹10Cr', value: 100000000 },
                  { label: '₹15Cr', value: 150000000 },
                  { label: '₹20Cr', value: 200000000 },
                  { label: '₹25Cr', value: 250000000 },
                  { label: '₹50Cr', value: 500000000 },
                  { label: '₹100Cr', value: 1000000000 },
                  { label: '₹200Cr', value: 2000000000 },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setCustomCover(opt.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      customCover === opt.value
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-card border border-border text-muted-foreground'
                    }`}>{opt.label}</button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">{t('ins.life.customCoverHelper')}</p>
            </div>

            {/* R1 — Recommended Cover */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-green/5 to-emerald-500/5 border border-brand-green/20">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t('ins.life.recTitle')}</p>
              <p className="text-[9px] text-muted-foreground mb-4">{t('ins.life.recSubtitle')}</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs text-muted-foreground">{t('ins.life.minimum')}</p>
                  <span className="text-sm font-bold text-foreground">{fmtCr(coverRec.minimum)}</span>
                </div>
                <div className={`flex items-center justify-between p-3 rounded-xl ${
                  customCover <= 0 ? 'bg-brand-green/10 border border-brand-green/25' : 'bg-slate-50 dark:bg-slate-800/30'
                }`}>
                  <div>
                    <p className="text-xs font-bold text-foreground">{t('ins.life.recommended')}</p>
                    <p className="text-[9px] text-brand-green font-semibold mt-0.5">{t('ins.life.irdaiConsensus')}</p>
                  </div>
                  <span className={`text-xl font-black ${customCover <= 0 ? 'text-brand-green' : 'text-foreground'}`}>{fmtCr(coverRec.recommended)}</span>
                </div>
                {outstandingLoans > 0 && (
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-muted-foreground">{t('ins.life.withLoans')}</p>
                    <span className="text-sm font-bold text-amber-400">{fmtCr(coverRec.withLoans)}</span>
                  </div>
                )}
                {customCover > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/25">
                    <div>
                      <p className="text-xs font-bold text-foreground">{t('ins.life.chosenCover')}</p>
                      <p className="text-[9px] text-blue-500 font-semibold mt-0.5">{t('ins.life.customAmount')}</p>
                    </div>
                    <span className="text-xl font-black text-blue-500">{fmtCr(customCover)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── ENHANCED LIFE COVER BREAKDOWN ── */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
              <div className="flex items-center gap-2 mb-3">
                <Banknote size={15} className="text-amber-500" />
                <h3 className="text-sm font-bold text-foreground">{t('ins.advisor.lifeBreakTitle', 'Your Life Cover — Detailed Breakdown')}</h3>
              </div>
              <div className="space-y-2">
                {[
                  { label: t('ins.advisor.lifeIncome', 'Income Replacement (15× annual)'), value: lifeCoverDetailed.incomeReplace, color: '#22c55e' },
                  ...(lifeCoverDetailed.loanCover > 0 ? [{ label: t('ins.advisor.lifeLoan', 'Outstanding Loans'), value: lifeCoverDetailed.loanCover, color: '#ef4444' }] : []),
                  { label: t('ins.advisor.lifeChild', 'Children Education Fund'), value: lifeCoverDetailed.childEducation, color: '#3b82f6' },
                  { label: t('ins.advisor.lifeEmergency', 'Emergency Fund (1 yr income)'), value: lifeCoverDetailed.emergencyFund, color: '#f59e0b' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: `${item.color}08` }}>
                    <span className="text-[11px] text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-bold" style={{ color: item.color }}>{fmtCr(item.value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-xl bg-brand-green/10 border border-brand-green/20 mt-1">
                  <span className="text-xs font-bold text-foreground">{t('ins.advisor.lifeTotalNeed', 'Total Life Cover Needed')}</span>
                  <span className="text-lg font-black text-brand-green">{fmtCr(lifeCoverDetailed.total)}</span>
                </div>
              </div>
              {activeCover < lifeCoverDetailed.total && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[11px] text-amber-500 font-semibold">
                    ⚠ {t('ins.advisor.lifeUnder', { gap: fmtCr(lifeCoverDetailed.total - activeCover), defaultValue: 'Your current cover is {{gap}} short of the recommended amount. Consider increasing.' })}
                  </p>
                </div>
              )}
            </div>

            {/* R2 — Plan type comparison */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
              <p className="text-sm font-bold text-foreground mb-1">{t('ins.life.planTypeTitle')}</p>
              <p className="text-[10px] text-muted-foreground mb-4">{t('ins.life.planTypeSubtitle')}</p>
              <div className="space-y-3">
                {tPlanTypes.map((plan, i) => {
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
                              <VerdictBadge verdict={plan.verdict} label={t(`ins.verdicts.${plan.verdict}`)} />
                            </div>
                            <p className="text-[11px] text-muted-foreground">{plan.what}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">{t('ins.life.premiumRange')}</p>
                            <p className="text-[10px] font-semibold text-foreground">{plan.premiumRange}</p>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">{t('ins.life.xirrReturn')}</p>
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
              <p className="text-sm font-bold text-foreground mb-1">{t('ins.life.premiumSimTitle')}</p>
              <p className="text-[10px] text-muted-foreground mb-4">{t('ins.life.premiumSimSubtitle', { cover: fmtCr(activeCover), type: customCover > 0 ? t('ins.life.chosen') : t('ins.life.recommendedLbl') })}</p>

              <div className="p-3 rounded-2xl bg-brand-green/10 border border-brand-green/20 mb-4">
                <p className="text-[10px] text-muted-foreground mb-1">{fmtCr(activeCover)} {t('ins.life.coverLbl')} · {policyTerm}-{t('ins.life.yearTerm')}</p>
                <p className="text-xl font-black text-foreground">{fmtRange(termRange.lo, termRange.hi)}<span className="text-xs font-normal text-muted-foreground"> /{t('ins.life.year')}</span></p>
                <p className="text-brand-green text-xs font-semibold mt-0.5">
                  ≈ {fmtRange(Math.round(termRange.lo / 12 / 50) * 50, Math.round(termRange.hi / 12 / 50) * 50)} /{t('ins.life.month')}
                </p>
                {lifeGender === 'female' && <p className="text-[10px] text-emerald-400 mt-1.5">✓ {t('ins.life.femaleDiscount')}</p>}
                {lifeSmoker && <p className="text-[10px] text-amber-400 mt-1.5">⚠ {t('ins.life.smokerLoading')}</p>}
              </div>

              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('ins.life.compareByTerm')}</p>
              <div className="space-y-1.5 mb-4">
                {[{ term: 20, range: termRange20 }, { term: 30, range: termRange30 }, { term: 40, range: termRange40 }].map(({ term, range }) => (
                  <div key={term} className={`flex items-center justify-between p-2.5 rounded-xl ${
                    policyTerm === term ? 'bg-brand-green/10 border border-brand-green/20' : 'bg-slate-50 dark:bg-slate-800/30'
                  }`}>
                    <span className="text-xs font-semibold text-foreground">{term}-{t('ins.life.yearTerm')}</span>
                    <span className={`text-xs font-bold ${policyTerm === term ? 'text-brand-green' : 'text-muted-foreground'}`}>{fmtRange(range.lo, range.hi)}/{t('ins.life.yr')}</span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {t('ins.life.premiumNote')}
              </p>
              {/* GST disclosure for life term insurance.
                  Individual life (term/endowment/ULIP) and health premiums are
                  GST-exempt since 22 Sep 2025 (56th GST Council / GST 2.0).
                  Employer group covers and motor policies still attract 18%. */}
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/15">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                  ✅ {t('ins.life.gstNoteTitle', 'No GST on term premiums')}
                </p>
                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 leading-snug">
                  {t('ins.life.gstNoteBody', 'Individual term life premiums are GST-exempt since 22 Sep 2025 (56th GST Council). The quoted premium is what you pay — employer group covers still attract 18% GST.')}
                </p>
              </div>
              {/* Section 10(10D) — death benefit and (for term) any maturity benefit
                  is tax-free for the nominee, irrespective of the 10%-of-SI premium
                  rule. Term plans don't pay maturity, so this is mainly relevant
                  to clarify the death-claim treatment. */}
              <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/15">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                  ✅ {t('ins.life.section10dTitle', 'Section 10(10D) — death claim tax-free')}
                </p>
                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 leading-snug">
                  {t('ins.life.section10dBody', 'The full sum assured paid to your nominee is tax-free under Section 10(10D), with no upper cap. Endowment / TROP maturity is tax-free only if annual premium ≤ 10% of sum assured (post-Apr 2012 policies).')}
                </p>
              </div>
            </div>

            {/* ── WHAT-IF SIMULATOR (Life) ── */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={15} className="text-blue-500" />
                <h3 className="text-sm font-bold text-foreground">{t('ins.advisor.whatIfLifeTitle', 'What-If: Change Policy Term')}</h3>
              </div>
              <p className="text-[10px] text-muted-foreground mb-3">{t('ins.advisor.whatIfLifeDesc', 'See how policy term affects your annual premium')}</p>
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-bold text-foreground">{t('ins.advisor.whatIfTerm', 'Policy Term')}</span>
                  <span className="text-[10px] font-bold text-blue-500">{whatIfTerm} {t('ins.health.years', 'years')}</span>
                </div>
                <input type="range" min={10} max={40} step={5} value={whatIfTerm} onChange={e => setWhatIfTerm(Number(e.target.value))} className="w-full accent-blue-500 h-2" />
                <div className="flex justify-between text-[8px] text-muted-foreground">{[10, 15, 20, 25, 30, 35, 40].map(y => <span key={y}>{y}</span>)}</div>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: '#3b82f610' }}>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">{fmtCr(activeCover)} · {whatIfTerm}-{t('ins.life.yearTerm', 'year term')}</p>
                <p className="text-xl font-black text-blue-600">{fmtRange(whatIfLifePremium.lo, whatIfLifePremium.hi)}<span className="text-xs font-normal text-muted-foreground"> /{t('ins.life.year', 'year')}</span></p>
                {whatIfTerm !== policyTerm && (
                  <p className="text-[10px] mt-1" style={{ color: whatIfLifePremium.lo < termRange.lo ? '#22c55e' : '#f59e0b' }}>
                    {whatIfLifePremium.lo < termRange.lo
                      ? `↓ ${fmt(termRange.lo - whatIfLifePremium.lo)} ${t('ins.advisor.lessPerYear', 'less/year vs your selection')}`
                      : `↑ ${fmt(whatIfLifePremium.lo - termRange.lo)} ${t('ins.advisor.morePerYear', 'more/year vs your selection')}`}
                  </p>
                )}
              </div>
            </div>

            {/* R4 — 80C Tax Benefit */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
              <p className="text-sm font-bold text-foreground mb-1">{t('ins.life.taxTitle')}</p>
              <p className="text-[10px] text-muted-foreground mb-4">{t('ins.life.taxSubtitle')}</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t('ins.life.estPremium')}</span>
                  <span className="text-xs font-semibold text-foreground">{fmt(termRange.lo)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t('ins.life.ded80C')}</span>
                  <span className="text-xs font-bold text-brand-green">{fmt(tax80C.ded)}</span>
                </div>
                <div className="pt-2 border-t border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t('ins.life.taxSaved30')}</span>
                    <span className="text-xs font-bold text-emerald-400">{fmt(tax80C.saved30)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t('ins.life.taxSaved20')}</span>
                    <span className="text-xs font-bold text-brand-green">{fmt(tax80C.saved20)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] text-amber-400">{t('ins.life.newRegimeNote')}</p>
              </div>
            </div>

            {/* R5 — IRDAI Life Protections */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
              <p className="text-sm font-bold text-foreground mb-1">{t('ins.life.lifeRightsTitle')}</p>
              <p className="text-[10px] text-muted-foreground mb-3">{t('ins.life.lifeRightsSubtitle')}</p>
              <div className="space-y-2.5">
                {tLifeFacts.map((fact, i) => (
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
                <span className="font-bold text-foreground">{t('ins.life.disclaimer')}</span>
                {t('ins.life.lifeDisclaimer')}
              </p>
            </div>

            {/* POLICY START DATE — feeds the My Loans / Trackers card */}
            {!trackerSaved && (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card">
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2 block">
                  {t('common.investmentDate', 'Investment Date (optional)')}
                </label>
                <DateInput
                  value={policyStartDate}
                  onChange={setPolicyStartDate}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground text-left"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {t('common.investmentDateHint', 'Used for tracking in My Loans')}
                </p>
              </div>
            )}

            {/* LIFE POLICY SNAPSHOT — appears the moment user picks a date */}
            {policyStartDate && (
              <SnapshotPreviewCard
                anchorDate={policyStartDate}
                headline={fmtCr(activeCover)}
                headlineLabel={t('ins.life.cover', 'Life Cover')}
                subtitle={t('ins.life.snapshotSubtitle', 'Term insurance estimate at age {{age}} for {{term}} years', { age: lifeAge, term: policyTerm })}
                metrics={[
                  { label: t('ins.life.premiumMin', 'Premium (min)'), value: fmt(termRange.lo), tone: 'investment' },
                  { label: t('ins.life.premiumMax', 'Premium (max)'), value: fmt(termRange.hi), tone: 'expense' },
                  { label: t('ins.life.term', 'Term'), value: `${policyTerm}y`, tone: 'neutral' },
                ]}
                notes={[
                  { label: t('ins.life.age', 'Age at purchase'), value: `${lifeAge} years` },
                  { label: t('ins.life.gender', 'Gender'), value: lifeGender === 'male' ? 'Male' : 'Female' },
                  { label: t('ins.life.smoker', 'Smoker'), value: lifeSmoker ? 'Yes' : 'No' },
                ]}
                label={t('ins.life.snapshotTitle', 'Life Insurance Snapshot')}
              />
            )}

            {/* Save to My Loans */}
            {trackerSaved ? (
              <div className="flex gap-2">
                <div className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <CheckCircle size={16} /> {t('common.saved')}
                </div>
                <button onClick={() => navigate('/my-loans')}
                  className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-brand-green/10 text-brand-green border border-brand-green/20">
                  {t('common.viewInMyLoans', 'View')}
                </button>
                <button onClick={handleTrackerRemove}
                  className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowLifeNameDialog(true)}
                className="w-full py-3.5 rounded-2xl bg-brand-green text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-green/20">
                💾 {t('myLoans.saveToTracker')}
              </button>
            )}

            <SaveNameDialog
              open={showLifeNameDialog}
              onClose={() => setShowLifeNameDialog(false)}
              onConfirm={(name) => handleLifeTrackerSave(name)}
              defaultName={suggestedLifeName}
            />

          </div>
        )}

        <CalculatorInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} calculatorTitle={t('ins.title')} />
      </div>

      <DisclaimerComponent module="insurance" />
    </div>
  );
}