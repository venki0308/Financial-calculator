import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import {
  ArrowLeft, Info, Share2, Shield, HeartPulse,
  CheckCircle, AlertTriangle, ChevronDown, ChevronUp,
  Plus, X, TrendingUp, Banknote, Award, Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import { AnalyticsService } from '../lib/analytics';
import { nativeShare } from '../utils/nativeShare';

type InsuranceTab = 'health' | 'life';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Formatting helpers ───────────────────────────────────────────────────────

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

// ─── Health calculation ───────────────────────────────────────────────────────

function getAgeBase(age: number): [number, number] {
  if (age <= 30) return [2800, 4500];
  if (age <= 40) return [4000, 6500];
  if (age <= 50) return [7000, 12000];
  if (age <= 60) return [12000, 22000];
  if (age <= 70) return [22000, 42000];
  if (age <= 80) return [38000, 70000];
  return [55000, 95000];
}

function getCovMul(si: number): number {
  if (si <= 300000) return 0.6;
  if (si <= 500000) return 0.8;
  if (si <= 1000000) return 1.0;
  if (si <= 1500000) return 1.25;
  if (si <= 2500000) return 1.6;
  if (si <= 5000000) return 2.2;
  return 3.0;
}

function floaterFactor(n: number): number {
  if (n <= 1) return 1.0;
  if (n === 2) return 0.85;
  if (n === 3) return 0.80;
  if (n === 4) return 0.75;
  return 0.72;
}

function calcHealthRange(
  ages: number[], si: number,
  city: 'metro' | 'tier2' | 'tier3', preExisting: boolean
): { lo: number; hi: number } {
  if (!ages.length) return { lo: 0, hi: 0 };
  const covMul = getCovMul(si);
  const cityMul = city === 'metro' ? 1.2 : city === 'tier2' ? 1.0 : 0.85;
  const ff = floaterFactor(ages.length);
  const preLo = preExisting ? 1.15 : 1.0;
  const preHi = preExisting ? 1.35 : 1.0;
  let sumLo = 0, sumHi = 0;
  for (const a of ages) { const [l, h] = getAgeBase(a); sumLo += l; sumHi += h; }
  return {
    lo: Math.round((sumLo * covMul * cityMul * preLo * ff) / 100) * 100,
    hi: Math.round((sumHi * covMul * cityMul * preHi * ff) / 100) * 100,
  };
}

function calcAdequacy(si: number, city: 'metro' | 'tier2' | 'tier3', ages: number[]): number {
  const siL = si / 100000;
  let score = 0;
  if (city === 'metro') {
    if (siL <= 5) score = 30 + (siL / 5) * 10;
    else if (siL <= 10) score = 55 + ((siL - 5) / 5) * 15;
    else if (siL <= 25) score = 70 + ((siL - 10) / 15) * 15;
    else score = 85 + Math.min(15, ((siL - 25) / 75) * 15);
  } else if (city === 'tier2') {
    if (siL <= 5) score = 40 + (siL / 5) * 20;
    else if (siL <= 10) score = 65 + ((siL - 5) / 5) * 15;
    else score = 80 + Math.min(20, ((siL - 10) / 90) * 20);
  } else {
    if (siL <= 5) score = 55 + (siL / 5) * 15;
    else if (siL <= 10) score = 70 + ((siL - 5) / 5) * 15;
    else score = 85 + Math.min(15, ((siL - 10) / 90) * 15);
  }
  const avgAge = ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 30;
  if (avgAge > 60) score -= 15;
  else if (avgAge > 50) score -= 8;
  else if (avgAge > 45) score -= 4;
  if (ages.length >= 5) score -= 10;
  else if (ages.length >= 4) score -= 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Life calculation ─────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function ScoreBar({ score }: { score: number }) {
  const label = score <= 40
    ? 'Underinsured — Consider increasing cover'
    : score <= 65 ? 'Adequate for basic hospitalisation'
    : score <= 85 ? 'Good coverage for most scenarios'
    : 'Comprehensive — Well protected';
  const barColor = score <= 40 ? 'bg-red-500' : score <= 65 ? 'bg-amber-500' : 'bg-brand-green';
  const textColor = score <= 40 ? 'text-red-400' : score <= 65 ? 'text-amber-400' : 'text-brand-green';
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-2xl font-black ${textColor}`}>{score}<span className="text-sm font-normal text-muted-foreground">/100</span></span>
        <span className={`text-xs font-semibold ${textColor} text-right max-w-[55%]`}>{label}</span>
      </div>
      <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${barColor}`} />
      </div>
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function InsuranceCalculator() {
  useEffect(() => { AnalyticsService.trackScreen('Insurance_Calculator'); }, []);
  useTrackCalculator();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<InsuranceTab>('health');
  const [showInfo, setShowInfo] = useState(false);

  // ── Health state ─────────────────────────────────────────────────────
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

  // ── Life state ───────────────────────────────────────────────────────
  const [lifeAge, setLifeAge] = useState(30);
  const [lifeGender, setLifeGender] = useState<'male' | 'female'>('male');
  const [lifeSmoker, setLifeSmoker] = useState(false);
  const [annualIncome, setAnnualIncome] = useState(1200000);
  const [dependents, setDependents] = useState(2);
  const [outstandingLoans, setOutstandingLoans] = useState(0);
  const [policyTerm, setPolicyTerm] = useState(25);

  // ── Family ages ──────────────────────────────────────────────────────
  const allAges = useMemo(() => {
    const ages = [selfAge];
    if (hasSpouse) ages.push(spouseAge);
    ages.push(...children, ...parents);
    return ages;
  }, [selfAge, hasSpouse, spouseAge, children, parents]);

  // ── Health results ───────────────────────────────────────────────────
  const healthRange = useMemo(
    () => calcHealthRange(allAges, si, city, preExisting),
    [allAges, si, city, preExisting]
  );
  const adequacyScore = useMemo(
    () => calcAdequacy(si, city, allAges),
    [si, city, allAges]
  );

  // ── Life results ─────────────────────────────────────────────────────
  const coverRec = useMemo(() => ({
    minimum: annualIncome * 15,
    recommended: annualIncome * 20,
    withLoans: annualIncome * 15 + outstandingLoans,
  }), [annualIncome, outstandingLoans]);

  const recCoverCr = annualIncome > 0 ? Math.max((annualIncome * 20) / 10000000, 0.5) : 1;

  const termRange = useMemo(
    () => calcTermRange(lifeAge, lifeGender, lifeSmoker, recCoverCr, policyTerm),
    [lifeAge, lifeGender, lifeSmoker, recCoverCr, policyTerm]
  );
  const termRange20 = useMemo(
    () => calcTermRange(lifeAge, lifeGender, lifeSmoker, recCoverCr, 20),
    [lifeAge, lifeGender, lifeSmoker, recCoverCr]
  );
  const termRange30 = useMemo(
    () => calcTermRange(lifeAge, lifeGender, lifeSmoker, recCoverCr, 30),
    [lifeAge, lifeGender, lifeSmoker, recCoverCr]
  );
  const termRange40 = useMemo(
    () => calcTermRange(lifeAge, lifeGender, lifeSmoker, recCoverCr, 40),
    [lifeAge, lifeGender, lifeSmoker, recCoverCr]
  );

  const tax80C = useMemo(() => {
    const ded = Math.min(termRange.lo, 150000);
    return { ded, saved30: Math.round(ded * 0.30 * 1.04), saved20: Math.round(ded * 0.20 * 1.04) };
  }, [termRange.lo]);

  // ── Contextual health tips ────────────────────────────────────────────
  const healthTips = useMemo(() => {
    const tips: string[] = [];
    if (children.some(c => c <= 5))
      tips.push("Newborns must be added to the policy within 90 days of birth to avoid a waiting period. Check your insurer's specific clause.");
    if (parents.some(a => a >= 60 && a < 70))
      tips.push('Including parents above 60 in a family floater significantly raises the premium for everyone. Consider buying a separate senior citizen plan for parents — cheaper overall.');
    if (parents.some(a => a >= 70))
      tips.push('For parents above 70, very few comprehensive plans are available. Always compare at least 3 quotes directly from IRDAI-registered insurers before deciding.');
    if (si < 1000000 && city === 'metro')
      tips.push(`₹${(si / 100000).toFixed(0)}L may be insufficient in metro cities. A single ICU stay in Mumbai or Delhi can cost ₹3–8L. Metro families should aim for ₹15–25L minimum.`);
    if (preExisting)
      tips.push("Disclose all pre-existing conditions accurately. Non-disclosure is the #1 reason for claim rejection. IRDAI's 5-year moratorium protects you after continuous coverage.");
    if (allAges.length >= 5)
      tips.push('Family floaters work on the assumption that not all members claim in the same year. With 5+ members, consider individual policies for high-risk members + floater for healthy ones.');
    tips.push("Buy health insurance when you're young and healthy. Premiums are lowest, waiting periods complete earlier, and NCB accumulates faster. Delaying by 5 years can double your premium.");
    return tips;
  }, [children, parents, si, city, preExisting, allAges.length]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const addChild = () => { if (children.length < 4) setChildren(p => [...p, 5]); };
  const removeChild = (i: number) => setChildren(p => p.filter((_, idx) => idx !== i));
  const updateChild = (i: number, v: number) => setChildren(p => p.map((c, idx) => idx === i ? v : c));
  const addParent = () => { if (parents.length < 4) setParents(p => [...p, 60]); };
  const removeParent = (i: number) => setParents(p => p.filter((_, idx) => idx !== i));
  const updateParent = (i: number, v: number) => setParents(p => p.map((a, idx) => idx === i ? v : a));
  const toggleChecklist = (i: number) => setOpenChecklist(prev => {
    const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n;
  });

  // ── SI advisory ───────────────────────────────────────────────────────
  const siAdvisory = useMemo(() => {
    if (si <= 500000) return { type: 'warn' as const, text: '⚠ Medical inflation is 14%/yr in India. ₹5L may be insufficient for metro hospitals by 2030. Consider ₹10L minimum.' };
    if (si <= 1500000) return { type: 'ok' as const, text: '✓ Good for most Indian families in Tier 1/2 cities.' };
    if (si <= 5000000) return { type: 'ok' as const, text: '✓ Comprehensive. Covers most hospitalisation scenarios including ICU + surgery.' };
    return { type: 'info' as const, text: 'For high-risk families or those planning treatment abroad.' };
  }, [si]);

  // ── Static content ────────────────────────────────────────────────────
  const irdaiHealthFacts = [
    'Waiting period for PED: MAX 36 months (reduced from 48 months — IRDAI 2025 rule)',
    'Moratorium period: 5 years (after which insurer cannot reject claims for non-disclosure)',
    'No age limit: Insurers cannot deny a new policy based on age alone (IRDAI 2025 rule)',
    'Lifetime renewability: No exit age if renewed without break (IRDAI HIR 2016 Reg 12)',
    'Premium cap for 65+: Max 10% annual increase for senior policyholders (IRDAI Jan 2025)',
    'Portability right: Switch insurer without losing accumulated waiting period credits',
    '30-day initial waiting period: Standard for all illnesses except accidents',
    'Cashless Everywhere: Emergency cashless at non-network hospitals (IRDAI 2024 initiative)',
    'GST exempt: Individual health insurance premiums are GST-free from September 22, 2025',
  ];

  const irdaiLifeFacts = [
    'Free-look period: 30 days to return the policy for a full refund',
    'Grace period: 30 days for premium payment before the policy lapses',
    'Revival: A lapsed policy can be revived within 5 years by paying arrears + interest',
    'Nomination: Always nominate a beneficiary — mandatory under the Insurance Act',
    'Assignment: Policy can be assigned to a bank as collateral for a loan',
    'Suicide clause: After 12 months of policy, death by suicide is also covered',
    'IRDAI Ombudsman: Free dispute resolution at irdai.gov.in if a claim is rejected',
  ];

  const advisorChecklist = [
    { title: 'Room Rent Cap', body: 'Avoid plans with room rent sub-limits. A ₹5,000/day cap on a ₹15,000/day room means all other bills are also proportionally reduced — you end up paying 66% of the total bill out-of-pocket.' },
    { title: 'Co-payment Clause', body: 'If a plan has 20% co-pay, you pay ₹20,000 on a ₹1L claim. Avoid co-pay plans if possible, especially for senior members where claim amounts are typically higher.' },
    { title: 'Sum Insured Restoration', body: 'After one family member exhausts the cover in a policy year, restoration refills it for the same or a different member. This is critical for families sharing a floater policy.' },
    { title: 'No-Claim Bonus (NCB)', body: 'For every claim-free year, your sum insured increases by 10–50% at no extra cost. Check the NCB % and whether it is protected even after a claim is made.' },
    { title: 'Pre-existing Disease Waiting Period', body: 'All plans have a 1–4 year wait for PED. IRDAI now caps this at 36 months. Shorter waiting period = better plan for those with existing health conditions.' },
    { title: 'Network Hospital Check', body: 'Before buying, check if your preferred hospital is in the insurer\'s cashless network. Visit the insurer website directly — not a broker or aggregator site — for the most accurate list.' },
    { title: 'Claim Settlement Ratio (CSR)', body: 'CSR above 95% is considered good. Check IRDAI\'s annual report at irdai.gov.in for the latest verified data. Third-party broker sites may show outdated or adjusted numbers.' },
    { title: 'In-House vs TPA Claims', body: 'Insurers with in-house claim teams process claims significantly faster than those using Third Party Administrators (TPAs). Always ask: who handles your claim when you are hospitalised?' },
    { title: 'Sub-limits on Specific Procedures', body: 'Some plans cap specific treatments like cataract surgery or maternity at fixed amounts regardless of actual costs. Always read the full Policy Wording document — not just the sales brochure.' },
    { title: 'Free-Look Period', body: 'You get 15–30 days after receiving the policy document to review it and return it for a full refund. Use this time to read the complete policy wording carefully, not just the highlights.' },
  ];

  const lifeTypes: {
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

  const handleShare = async () => {
    if (activeTab === 'health') {
      await nativeShare('Health Insurance Simulator — FinCalix',
        `🏥 Health Insurance Estimate\n\nMembers: ${allAges.length} | Cover: ${fmtCr(si)} | ${city.charAt(0).toUpperCase() + city.slice(1)}\nEst. Annual Premium: ${fmtRange(healthRange.lo, healthRange.hi)}\nAdequacy Score: ${adequacyScore}/100\n\nEstimated with FinCalix 🧮`
      );
    } else {
      await nativeShare('Life Insurance Simulator — FinCalix',
        `🛡️ Life Insurance Estimate\n\nAge: ${lifeAge} | Income: ${fmtCr(annualIncome)}/yr\nRecommended Cover: ${fmtCr(coverRec.recommended)}\nEst. Term Premium: ${fmtRange(termRange.lo, termRange.hi)}/yr\n\nEstimated with FinCalix 🧮`
      );
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-white dark:bg-background animate-fade-in">

      {/* ─── Header ──────────────────────────────────────────────────────── */}
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

        {/* ─── Tab Switcher ─────────────────────────────────────────────── */}
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

        {/* ═══════════════════════ HEALTH TAB ════════════════════════════ */}
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
                  {age >= 25 && (
                    <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1">
                      <AlertTriangle size={11} /> Children above 25 need separate individual cover
                    </p>
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
                  {age >= 80 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-[11px] text-red-400 flex items-start gap-1.5">
                        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                        Very few insurers accept new proposals beyond age 80. Existing policy renewals are protected under IRDAI guidelines.
                      </p>
                    </div>
                  )}
                  {age >= 70 && age < 80 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-[11px] text-amber-400 flex items-start gap-1.5">
                        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                        Parents above 70 are classified as elderly by insurers. Premium will be significantly higher and options limited. Consider a dedicated senior citizen plan.
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

            {/* SECTION 3 — Calculate button */}
            <button onClick={() => setHealthCalced(true)}
              className="w-full py-4 rounded-2xl bg-brand-green text-black font-bold text-sm shadow-lg shadow-brand-green/20 active:scale-[0.98] transition-transform">
              Calculate Coverage Need
            </button>

            {/* ── RESULTS ────────────────────────────────────────────────── */}
            <AnimatePresence>
              {healthCalced && (
                <motion.div key="health-results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                  {/* R1 — Premium Range */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-green/5 to-emerald-500/5 border border-brand-green/20">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Estimated Annual Premium Range</p>
                    <p className="text-[9px] text-muted-foreground mb-3">Based on IRDAI actuarial factors · {allAges.length} member{allAges.length !== 1 ? 's' : ''} · {fmtCr(si)} cover · {city}</p>
                    <p className="text-2xl font-black text-foreground mb-0.5">{fmtRange(healthRange.lo, healthRange.hi)}</p>
                    <p className="text-brand-green text-sm font-semibold mb-4">
                      ≈ {fmtRange(Math.round(healthRange.lo / 12 / 100) * 100, Math.round(healthRange.hi / 12 / 100) * 100)} per month
                    </p>
                    {preExisting && (
                      <p className="text-[10px] text-amber-400 mb-3 flex items-center gap-1">
                        <AlertTriangle size={11} /> Pre-existing loading of 15–35% applied
                      </p>
                    )}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-border">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        This is an estimated range based on IRDAI actuarial factors. Actual premium varies by insurer, plan features, and your health profile. Always get quotes from 2–3 insurers directly.
                      </p>
                    </div>
                  </div>

                  {/* R2 — Adequacy Score */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                    <p className="text-sm font-bold text-foreground mb-1">Is Your Coverage Adequate?</p>
                    <p className="text-[10px] text-muted-foreground mb-4">Scored against city-level medical costs and family risk profile</p>
                    <ScoreBar score={adequacyScore} />
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

                  {/* R3 — IRDAI Rights */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                    <p className="text-sm font-bold text-foreground mb-1">Your Rights Under IRDAI (2025)</p>
                    <p className="text-[10px] text-muted-foreground mb-3">Source: IRDAI Master Circular 2024, IRDAI HIR 2016, IRDAI Circular Jan 2025</p>
                    <div className="space-y-2.5">
                      {irdaiHealthFacts.map((fact, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle size={13} className="text-brand-green flex-shrink-0 mt-0.5" />
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{fact}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* R4 — Advisor Checklist */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                    <p className="text-sm font-bold text-foreground mb-1">Advisor Checklist — What to Verify</p>
                    <p className="text-[10px] text-muted-foreground mb-4">Tap each item for detailed explanation</p>
                    <div className="space-y-2">
                      {advisorChecklist.map((item, i) => (
                        <AccordionItem key={i} idx={i} title={item.title} body={item.body}
                          open={openChecklist.has(i)} onToggle={() => toggleChecklist(i)} />
                      ))}
                    </div>
                  </div>

                  {/* R5 — Advisory Tips */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Award size={15} className="text-blue-400" />
                      <p className="text-sm font-bold text-foreground">Insurance Advisor Tips</p>
                    </div>
                    <div className="space-y-3">
                      {healthTips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-blue-400 font-black text-sm flex-shrink-0 mt-0.5">→</span>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-border">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      <span className="font-bold text-foreground">Disclaimer: </span>
                      FinCalix Insurance Simulator provides educational estimates based on IRDAI actuarial principles. This is NOT financial advice and does NOT represent any specific insurer's pricing. Actual premiums depend on your health profile, insurer underwriting, and plan features. Always compare quotes from IRDAI-registered insurers at irdai.gov.in before purchasing. FinCalix does not sell insurance.
                    </p>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ═══════════════════════ LIFE TAB ══════════════════════════════ */}
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
                {lifeTypes.map((plan, i) => {
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
                {irdaiLifeFacts.map((fact, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle size={13} className="text-brand-green flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{fact}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
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