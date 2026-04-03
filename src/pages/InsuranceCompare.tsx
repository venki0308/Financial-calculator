import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Shield, Minus, AlertTriangle,
  ChevronDown, ChevronUp, Users, Baby, UserPlus,
  Heart, CheckCircle, Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { AnalyticsService } from '../lib/analytics';
import { useTrackCalculator } from '../hooks/useTrackCalculator';

// ─── Constants ──────────────────────────────────────────────────────────────────

const SUM_INSURED_OPTIONS = [
  { label: '₹5L', value: 5 },
  { label: '₹10L', value: 10 },
  { label: '₹15L', value: 15 },
  { label: '₹25L', value: 25 },
  { label: '₹50L', value: 50 },
  { label: '₹1Cr', value: 100 },
];

const PRIORITY_OPTIONS = [
  { id: 'csr', label: 'Highest CSR' },
  { id: 'restoration', label: 'Unlimited Restore' },
  { id: 'network', label: 'Best Network' },
  { id: 'opd', label: 'OPD Cover' },
  { id: 'wellness', label: 'Wellness Rewards' },
  { id: 'claim_speed', label: 'Fast Claims' },
  { id: 'senior', label: 'Senior Friendly' },
  { id: 'child', label: 'Child Focused' },
];

// ─── Formatting ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function fmtL(lakhs: number): string {
  if (lakhs >= 100) return `₹${lakhs / 100}Cr`;
  return `₹${lakhs}L`;
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

function getSiMul(siL: number): number {
  // siL in lakhs
  if (siL <= 3) return 0.55;
  if (siL <= 5) return 0.75;
  if (siL <= 10) return 1.00;
  if (siL <= 15) return 1.30;
  if (siL <= 25) return 1.70;
  if (siL <= 50) return 2.40;
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

function getMemberPremium(age: number, siL: number, city: 'metro' | 'tier2' | 'tier3', preExisting: boolean): [number, number] {
  const [bLo, bHi] = getAgeBase(age);
  const mul = getSiMul(siL) * getCityMul(city) * (preExisting ? 1.20 : 1.00);
  return [
    Math.round((bLo * mul) / 100) * 100,
    Math.round((bHi * mul) / 100) * 100,
  ];
}

function calcAdequacy(
  siL: number,
  city: 'metro' | 'tier2' | 'tier3',
  allAges: number[],
  parentAges: number[],
  preExisting: boolean,
): number {
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
  if (preExisting) base -= 8;
  if (parentAges.some(a => a >= 70)) base -= 18;
  else if (parentAges.some(a => a >= 60)) base -= 10;
  if (allAges.length >= 5) base -= 7;
  if (allAges.some(a => a <= 1)) base -= 5;
  if (!preExisting) base += 5;
  if (allAges.every(a => a < 40)) base += 5;
  if (city === 'tier3') base += 3;
  return Math.max(0, Math.min(100, Math.round(base)));
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

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

// ─── Static data ────────────────────────────────────────────────────────────────

const PRIORITY_GUIDANCE: Record<string, string> = {
  csr: 'CSR = claims settled ÷ claims received × 100. Look for CSR above 95%. Verify only at irdai.gov.in → Statistics → Annual Report. Third-party sites may show stale or adjusted numbers.',
  restoration: 'After one member exhausts cover, it should automatically restore — either once or unlimited per year. Unlimited restoration for different illnesses is the gold standard. Ask specifically whether restoration applies to the same illness too.',
  network: 'Before buying, search your preferred hospital on the insurer\'s own website. Hospital network lists change frequently — never rely on a broker or aggregator site for this verification.',
  opd: 'OPD benefit covers doctor consultations, diagnostics and medicines without hospitalisation. Check the annual OPD limit, sublimits per visit, and whether it requires a network doctor. Some plans offer OPD via teleconsultation.',
  wellness: 'Wellness rewards (gym, step count, health check-ups) reduce renewal premium in some plans. Read the fine print — reward redemption often requires specific apps or partner brands. Useful bonus, not a primary criterion.',
  claim_speed: 'Insurers with in-house claim processing settle cashless faster than TPA-based models. Ask the insurer directly: "Who processes my cashless claims?" Also check their median cashless settlement time.',
  senior: 'For members above 60, avoid plans with age-based co-payment (you pay 10–20% of every claim). Look for zero co-pay, higher room rent limits, and dedicated senior customer service. Consider a separate senior citizen plan.',
  child: 'For children under 5, verify the newborn clause (Day 1 or within 90 days). Check vaccination OPD benefit and whether paediatric sub-limits apply. Family floater sum insured should be adequate for a child hospitalisation.',
};

const BASE_CHECKLIST: { title: string; body: string }[] = [
  { title: 'No Room Rent Capping', body: 'Ensure the plan has NO sub-limit on room rent. A plan capping room rent at ₹5,000/day means ALL linked charges (doctor fees, nursing, procedures) are proportionally reduced. Avoid any plan with room rent sub-limits.' },
  { title: 'Sum Insured Restoration', body: 'After one member uses up the sum insured, it should automatically restore — either once per year or unlimited. Ask: "Does restoration apply to the same illness or a different illness?" Unlimited is better.' },
  { title: 'No Claim Bonus (NCB)', body: 'Every claim-free year should increase your sum insured by 10–50% at no extra cost. Check: 1) What % NCB per year? 2) Is NCB protected after a small claim? 3) What is the maximum NCB cap? 50% is good, 100% is excellent.' },
  { title: 'Pre-Existing Disease Waiting Period', body: 'IRDAI 2025 rules: maximum PED waiting period is now 36 months for new policies. Shorter is better. After the waiting period ends, your pre-existing conditions must be covered. Never hide a condition — non-disclosure is the #1 cause of claim rejection.' },
  { title: 'Lifetime Renewability', body: 'Under IRDAI HIR 2016 Regulation 12, any policy renewed without a break cannot be denied renewal due to age. Ensure the policy explicitly states "Lifelong Renewable". Never let your health policy lapse — you lose accumulated waiting period credits.' },
  { title: 'Claim Settlement Ratio', body: 'CSR = claims settled / claims received × 100. Look for CSR above 95%. Verify from IRDAI\'s official annual report at irdai.gov.in — not from broker or comparison websites. Also check Complaint Volume per 10,000 claims.' },
  { title: 'In-House vs TPA Claims', body: 'Insurers with in-house claim teams process cashless faster and with fewer disputes. Ask the insurer directly: "Who processes my cashless claims at the hospital?" In-house is better for smooth experience.' },
];

const IRDAI_RIGHTS = [
  { title: 'No Age Limit for New Policies', body: 'Insurers cannot deny new health insurance based on age alone. (IRDAI 2025 guideline)' },
  { title: 'Maximum 36-Month PED Waiting', body: 'Waiting period for pre-existing diseases capped at 36 months for new policies. (IRDAI 2025)' },
  { title: 'Lifetime Renewability', body: 'No policy can be denied renewal due to age if renewed without break. (IRDAI HIR 2016 Reg 12)' },
  { title: '5-Year Moratorium', body: 'After 5 years continuous coverage, insurer cannot reject claims citing non-disclosure except fraud. (IRDAI Master Circular 2024)' },
  { title: '10% Cap for 65+', body: 'Renewal premium increase capped at 10%/year for policyholders above 65. (IRDAI Circular Jan 2025)' },
  { title: 'Free 30-Day Review', body: 'Return the policy within 30 days for a full refund if unsatisfied. (IRDAI free-look rule)' },
  { title: 'Cashless Everywhere', body: 'Emergency cashless treatment allowed even at non-network hospitals. (IRDAI 2024)' },
  { title: 'GST-Free Premiums', body: 'Individual health insurance premiums are GST exempt from September 22, 2025. (56th GST Council)' },
  { title: 'Portability Right', body: 'Switch insurer without losing accrued waiting period benefits. Apply 45 days before renewal.' },
  { title: 'Insurance Ombudsman', body: 'Free dispute resolution if claim is rejected. File at irdai.gov.in — no lawyer needed.' },
];

const HOW_TO_BUY = [
  { step: 1, title: 'Fix your sum insured first', body: 'Rule of thumb: 1 year of gross income OR ₹10L minimum for Tier 2/3, ₹15–25L for metro. Medical inflation is 14%/year — choose a sum insured adequate for 10 years.' },
  { step: 2, title: 'Shortlist using IRDAI data', body: 'Go to irdai.gov.in → Statistics → Annual Report. Look for CSR above 95% AND complaint ratio below 20 per 10,000 claims.' },
  { step: 3, title: 'Read the Policy Wording, not the brochure', body: 'Search the document for: "room rent", "co-pay", "sub-limit", "waiting period", "restoration". These are your risk areas — not in the brochure.' },
  { step: 4, title: 'Get quotes from 3 insurers directly', body: 'Visit insurer websites directly for quotes with identical sum insured and members. Never compare a ₹10L plan from one insurer with a ₹5L plan from another.' },
  { step: 5, title: 'Check network hospitals yourself', body: 'Visit each insurer\'s own website and search your preferred hospital. Hospital lists change — never rely on broker or aggregator sites.' },
  { step: 6, title: 'Buy directly from the insurer', body: 'Buying directly (insurer website or app) avoids broker commission loading. Use a broker for advice but buy direct.' },
  { step: 7, title: 'Declare everything honestly', body: 'Disclose all pre-existing conditions, past surgeries, family medical history. Non-disclosure = claim rejection at the worst possible time.' },
];

const childAgeLabel = (age: number): string => {
  if (age < 1) return 'Newborn (under 1 year)';
  if (age <= 4) return 'Toddler';
  if (age <= 12) return 'School age';
  if (age <= 17) return 'Teenager';
  return 'Young adult';
};

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function InsuranceCompare() {
  const { t } = useTranslation();
  useEffect(() => { AnalyticsService.trackScreen('Insurance_Compare'); }, []);
  useTrackCalculator();
  const navigate = useNavigate();

  // ── Profile state ─────────────────────────────────────────────────────────────
  const [selfAge, setSelfAge] = useState(30);
  const [hasSpouse, setHasSpouse] = useState(false);
  const [spouseAge, setSpouseAge] = useState(28);
  const [children, setChildren] = useState<number[]>([]);
  const [parents, setParents] = useState<number[]>([]);
  const [hasPreExisting, setHasPreExisting] = useState(false);
  const [cityType, setCityType] = useState<'metro' | 'tier2' | 'tier3'>('metro');
  const [sumInsured, setSumInsured] = useState(10); // in lakhs
  const [priorities, setPriorities] = useState<string[]>([]);

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<'profile' | 'results'>('profile');
  const [openChecklist, setOpenChecklist] = useState<Set<number>>(new Set());
  const [showBreakdown, setShowBreakdown] = useState(false);

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

  const tPriorityOptions = useMemo(() => [
    { id: 'csr', label: t('ins.compare.priorityHighestCSR') },
    { id: 'restoration', label: t('ins.compare.priorityRestore') },
    { id: 'network', label: t('ins.compare.priorityNetwork') },
    { id: 'opd', label: t('ins.compare.priorityOPD') },
    { id: 'wellness', label: t('ins.compare.priorityWellness') },
    { id: 'claim_speed', label: t('ins.compare.priorityFastClaims') },
    { id: 'senior', label: t('ins.compare.prioritySenior') },
    { id: 'child', label: t('ins.compare.priorityChild') },
  ], [t]);

  // ── Family helpers ────────────────────────────────────────────────────────────
  const addChild = useCallback(() => { if (children.length < 4) setChildren(p => [...p, 5]); }, [children.length]);
  const removeChild = useCallback((i: number) => setChildren(p => p.filter((_, idx) => idx !== i)), []);
  const updateChild = useCallback((i: number, age: number) => setChildren(p => p.map((a, idx) => idx === i ? age : a)), []);
  const addParent = useCallback(() => { if (parents.length < 4) setParents(p => [...p, 60]); }, [parents.length]);
  const removeParent = useCallback((i: number) => setParents(p => p.filter((_, idx) => idx !== i)), []);
  const updateParent = useCallback((i: number, age: number) => setParents(p => p.map((a, idx) => idx === i ? age : a)), []);

  const togglePriority = useCallback((id: string) => {
    setPriorities(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }, []);

  const toggleChecklist = (i: number) => setOpenChecklist(prev => {
    const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n;
  });

  // ── Derived ───────────────────────────────────────────────────────────────────
  const allAges = useMemo(() => {
    const ages = [selfAge];
    if (hasSpouse) ages.push(spouseAge);
    ages.push(...children, ...parents);
    return ages;
  }, [selfAge, hasSpouse, spouseAge, children, parents]);

  const elderlyParents = parents.filter(a => a >= 70);
  const seniorParents = parents.filter(a => a >= 60);

  // ── Premium calculation ───────────────────────────────────────────────────────
  const premiumData = useMemo(() => {
    const members: { label: string; lo: number; hi: number }[] = [];
    const add = (label: string, age: number) => {
      const [lo, hi] = getMemberPremium(age, sumInsured, cityType, hasPreExisting);
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
  }, [selfAge, hasSpouse, spouseAge, children, parents, sumInsured, cityType, hasPreExisting]);

  // ── Adequacy score ────────────────────────────────────────────────────────────
  const adequacyScore = useMemo(
    () => calcAdequacy(sumInsured, cityType, allAges, parents, hasPreExisting),
    [sumInsured, cityType, allAges, parents, hasPreExisting],
  );

  const adequacyExplanation = useMemo(() => {
    const cityLabel = cityType === 'metro' ? 'metro cities' : cityType === 'tier2' ? 'Tier 2 cities' : 'your city';
    if (adequacyScore < 50)
      return `A single ICU surgery in ${cityLabel} can cost ₹3–8 lakhs. Your current cover of ${fmtL(sumInsured)} may not be sufficient for major hospitalisation.`;
    if (adequacyScore <= 75)
      return 'Your cover is adequate for most routine hospitalisations. Consider increasing for critical illness or surgical emergencies.';
    return 'Good coverage for your family profile. Ensure you have restoration benefit and no room rent capping in your plan.';
  }, [adequacyScore, cityType, sumInsured]);

  // ── Personalised checklist ───────���──────────────────────���─────────────────────
  const profileChecklist = useMemo(() => {
    const items = [...tChecklist];
    if (children.some(c => c <= 4))
      items.push({ title: t('ins.checklist.newbornCoverTitle'), body: t('ins.checklist.newbornCoverBody') });
    if (children.some(c => c < 18))
      items.push({ title: t('ins.checklist.vaccineTitle'), body: t('ins.checklist.vaccineBody') });
    if (seniorParents.length > 0)
      items.push({ title: t('ins.checklist.seniorCopayTitle'), body: t('ins.checklist.seniorCopayBody') });
    if (seniorParents.length > 0)
      items.push({ title: t('ins.checklist.seniorSeparateTitle'), body: t('ins.checklist.seniorSeparateBody') });
    if (elderlyParents.length > 0)
      items.push({ title: t('ins.checklist.elderlyTitle'), body: t('ins.checklist.elderlyBody') });
    if (hasPreExisting)
      items.push({ title: t('ins.checklist.pedDeclareTitle'), body: t('ins.checklist.pedDeclareBody') });
    if (sumInsured < 10 && cityType === 'metro')
      items.push({ title: t('ins.checklist.siWarnTitle'), body: t('ins.checklist.siWarnBody') });
    if (allAges.length >= 5)
      items.push({ title: t('ins.checklist.floaterTitle'), body: t('ins.checklist.floaterBody') });
    return items;
  }, [children, parents, seniorParents.length, elderlyParents.length, hasPreExisting, sumInsured, cityType, allAges.length]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-background animate-fade-in">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background px-4 pt-14 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={() => step === 'results' ? setStep('profile') : navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-emerald-400" />
            <div>
              <h1 className="text-lg font-bold text-foreground">{t('ins.compare.title')}</h1>
              <p className="text-muted-foreground text-xs">{t('ins.compare.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-28 pt-4">
        <AnimatePresence mode="wait">

          {/* ═══════════════════════ PROFILE STEP ═══════════════════════════════ */}
          {step === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 1 }} exit={{ opacity: 0, x: -50 }}>

              {/* Section A — Family Profile */}
              <div className="mb-5">
                <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Users size={15} className="text-emerald-400" />
                  Your Family Profile
                </h2>

                {/* Self & Spouse */}
                <div className="p-4 rounded-2xl bg-card border border-border mb-3">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block mb-3">Self</span>
                  <div className="flex items-center gap-3 mb-4">
                    <label className="text-xs text-muted-foreground w-16">Your age</label>
                    <input type="number" min={18} max={70} value={selfAge}
                      onChange={e => setSelfAge(Math.min(70, Math.max(18, Number(e.target.value))))}
                      className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm font-bold text-center"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border/40">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Spouse</span>
                    <button onClick={() => setHasSpouse(!hasSpouse)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${hasSpouse ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-muted text-muted-foreground border border-border'}`}>
                      {hasSpouse ? 'Added ✓' : '+ Add Spouse'}
                    </button>
                  </div>
                  {hasSpouse && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden mt-3">
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-muted-foreground w-16">Age</label>
                        <input type="number" min={18} max={70} value={spouseAge}
                          onChange={e => setSpouseAge(Math.min(70, Math.max(18, Number(e.target.value))))}
                          className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm font-bold text-center"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Children */}
                <div className="p-4 rounded-2xl bg-card border border-border mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Baby size={14} className="text-blue-400" />
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Children</span>
                    </div>
                    {children.length < 4 && (
                      <button onClick={addChild} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
                        + Add Child
                      </button>
                    )}
                  </div>
                  {children.length === 0 && <p className="text-xs text-muted-foreground">No children added</p>}
                  <div className="space-y-2.5">
                    {children.map((age, idx) => (
                      <div key={idx}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-muted-foreground w-14">Child {idx + 1}</span>
                          <input type="number" min={0} max={25} value={age}
                            onChange={e => updateChild(idx, Math.min(25, Math.max(0, Number(e.target.value))))}
                            className="w-16 px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground text-sm font-bold text-center"
                          />
                          <span className="text-[10px] text-muted-foreground flex-1">{childAgeLabel(age)}</span>
                          <button onClick={() => removeChild(idx)} className="p-1 rounded-lg bg-red-500/10 text-red-400">
                            <Minus size={12} />
                          </button>
                        </div>
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
                  </div>
                </div>

                {/* Parents */}
                <div className="p-4 rounded-2xl bg-card border border-border mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <UserPlus size={14} className="text-purple-400" />
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Parents / In-Laws</span>
                    </div>
                    {parents.length < 4 && (
                      <button onClick={addParent} className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold">
                        + Add Parent
                      </button>
                    )}
                  </div>
                  {parents.length === 0 && <p className="text-xs text-muted-foreground">No parents added</p>}
                  <div className="space-y-2.5">
                    {parents.map((age, idx) => (
                      <div key={idx}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-muted-foreground w-14">Parent {idx + 1}</span>
                          <input type="number" min={40} max={85} value={age}
                            onChange={e => updateParent(idx, Math.min(85, Math.max(40, Number(e.target.value))))}
                            className="w-16 px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground text-sm font-bold text-center"
                          />
                          <span className="text-[10px] text-muted-foreground flex-1">
                            {age >= 70 ? '⚠ Elderly' : age >= 60 ? 'Senior' : 'Adult'}
                          </span>
                          <button onClick={() => removeParent(idx)} className="p-1 rounded-lg bg-red-500/10 text-red-400">
                            <Minus size={12} />
                          </button>
                        </div>
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
                  </div>
                </div>

                {/* Pre-existing */}
                <div className="p-4 rounded-2xl bg-card border border-border mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">Pre-existing conditions in family</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Diabetes, BP, thyroid, heart, etc.</p>
                    </div>
                    <button onClick={() => setHasPreExisting(!hasPreExisting)}
                      className={`w-12 h-7 rounded-full transition-all relative ${hasPreExisting ? 'bg-emerald-500' : 'bg-muted border border-border'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${hasPreExisting ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                {/* City Type */}
                <div className="p-4 rounded-2xl bg-card border border-border mb-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">City Type</p>
                  <div className="flex gap-2">
                    {(['metro', 'tier2', 'tier3'] as const).map(c => (
                      <button key={c} onClick={() => setCityType(c)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${cityType === c
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-muted text-muted-foreground border border-border'}`}>
                        {c === 'metro' ? 'Metro' : c === 'tier2' ? 'Tier 2' : 'Tier 3'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sum Insured */}
                <div className="p-4 rounded-2xl bg-card border border-border mb-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Sum Insured</p>
                  <div className="flex flex-wrap gap-2">
                    {SUM_INSURED_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setSumInsured(opt.value)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${sumInsured === opt.value
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-muted text-muted-foreground border border-border'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {sumInsured <= 5 && (
                    <p className="text-[10px] text-amber-400 mt-2.5">⚠ Medical inflation is 14%/yr. ₹5L may be insufficient for metro hospitals by 2030. Consider ₹10L minimum.</p>
                  )}
                </div>

                {/* Priorities */}
                <div className="p-4 rounded-2xl bg-card border border-border mb-5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">What matters most?</p>
                  <p className="text-[10px] text-muted-foreground mb-3">Select up to 3 priorities — we'll explain each in your results</p>
                  <div className="flex flex-wrap gap-2">
                    {PRIORITY_OPTIONS.map(opt => {
                      const isSelected = priorities.includes(opt.id);
                      return (
                        <button key={opt.id}
                          onClick={() => { if (isSelected || priorities.length < 3) togglePriority(opt.id); }}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${isSelected
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-muted text-muted-foreground border border-border'}`}>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Analyse Button */}
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => { setStep('results'); setOpenChecklist(new Set()); setShowBreakdown(false); }}
                className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                <Shield size={18} />
                {t('ins.compare.analyzeButton')}
              </motion.button>
            </motion.div>
          )}

          {/* ═══════════════════════ RESULTS STEP ═══════════════════════════════ */}
          {step === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

              {/* Profile summary pill */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  `${allAges.length} member${allAges.length !== 1 ? 's' : ''}`,
                  fmtL(sumInsured),
                  cityType === 'metro' ? 'Metro' : cityType === 'tier2' ? 'Tier 2' : 'Tier 3',
                  hasPreExisting ? 'Pre-existing' : null,
                ].filter(Boolean).map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">{tag}</span>
                ))}
              </div>

              {/* Card A — Coverage Adequacy */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <p className="text-sm font-bold text-foreground mb-0.5">Your Coverage Adequacy</p>
                <p className="text-[10px] text-muted-foreground mb-2">Scored against city-level medical costs and family risk profile</p>
                <ScoreDial score={adequacyScore} />
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-4 text-center px-2">{adequacyExplanation}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Cover', val: fmtL(sumInsured) },
                    { label: 'City', val: cityType === 'metro' ? 'Metro' : cityType === 'tier2' ? 'Tier 2' : 'Tier 3' },
                    { label: 'Members', val: String(allAges.length) },
                  ].map(({ label, val }) => (
                    <div key={label} className="text-center p-2 rounded-xl bg-muted/50">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">{label}</p>
                      <p className="text-xs font-bold text-foreground">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card B — Premium Range */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/20">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Estimated Annual Premium Range</p>
                <p className="text-[9px] text-muted-foreground mb-3">Based on IRDAI actuarial rating factors</p>
                <p className="text-2xl font-black text-foreground mb-0.5">{fmtRange(premiumData.lo, premiumData.hi)}</p>
                <p className="text-emerald-400 text-sm font-semibold mb-4">
                  ≈ {fmtRange(Math.round(premiumData.lo / 12 / 100) * 100, Math.round(premiumData.hi / 12 / 100) * 100)} per month
                </p>

                <button onClick={() => setShowBreakdown(v => !v)}
                  className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/60 dark:bg-black/10 border border-emerald-500/15 mb-3">
                  <span className="text-[11px] font-semibold text-foreground">Per-member breakdown</span>
                  {showBreakdown ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {showBreakdown && (
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
                          <span className="text-[11px] font-bold text-emerald-400">−{premiumData.floaterPct}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-foreground">Total</span>
                          <span className="text-[11px] font-black text-foreground">{fmtRange(premiumData.lo, premiumData.hi)}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {hasPreExisting && (
                  <p className="text-[10px] text-amber-400 mb-3 flex items-center gap-1">
                    <AlertTriangle size={11} /> Pre-existing loading of 20% applied
                  </p>
                )}
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    This range is based on IRDAI actuarial rating factors. Actual premium depends on your health declaration, insurer underwriting, and the specific plan features you choose. Always get quotes from at least 2–3 IRDAI-registered insurers before deciding.
                  </p>
                </div>
              </div>

              {/* Priority guidance — shown if user selected priorities */}
              {priorities.length > 0 && (
                <div className="p-4 rounded-2xl bg-card border border-border">
                  <p className="text-sm font-bold text-foreground mb-1">Your Priority Guide</p>
                  <p className="text-[10px] text-muted-foreground mb-3">What to look for based on what matters most to you</p>
                  <div className="space-y-3">
                    {priorities.map(pid => {
                      const opt = PRIORITY_OPTIONS.find(o => o.id === pid);
                      if (!opt) return null;
                      return (
                        <div key={pid} className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Info size={11} className="text-amber-400" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-foreground mb-0.5">{opt.label}</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{PRIORITY_GUIDANCE[pid]}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Card C — Personalised Checklist */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <p className="text-sm font-bold text-foreground mb-0.5">Your Personalised Checklist</p>
                <p className="text-[10px] text-muted-foreground mb-4">Based on your family profile — tap each item for details</p>
                <div className="space-y-2">
                  {profileChecklist.map((item, i) => (
                    <AccordionItem key={i} idx={i} title={item.title} body={item.body}
                      open={openChecklist.has(i)} onToggle={() => toggleChecklist(i)} />
                  ))}
                </div>
              </div>

              {/* Card D — IRDAI Rights */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <p className="text-sm font-bold text-foreground mb-0.5">{t('ins.health.rightsTitle')}</p>
                <p className="text-[10px] text-muted-foreground mb-3">{t('ins.health.rightsSubtitle')}</p>
                <div className="space-y-3">
                  {tIrdaiRights.map((right, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Shield size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
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

              {/* Card E — How to Buy */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <p className="text-sm font-bold text-foreground mb-4">{t('ins.health.howToBuyTitle')}</p>
                <div className="space-y-4">
                  {tHowToBuy.map(s => (
                    <div key={s.step} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[11px] font-black text-emerald-400">{s.step}</span>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-foreground mb-0.5">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{s.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Back button */}
              <button onClick={() => setStep('profile')}
                className="w-full py-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm">
                ← {t('ins.compare.editProfile')}
              </button>

              {/* Disclaimer */}
              <div className="p-4 rounded-2xl border border-border bg-muted/20">
                <div className="flex items-start gap-2.5">
                  <Heart size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-foreground mb-1">FinCalix Health Insurance Simulator</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mb-1">
                      Provides educational guidance based on IRDAI regulations and actuarial principles. Premium estimates are ranges — actual premiums depend on your health declaration, insurer underwriting, and plan features.
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      FinCalix does <span className="font-bold text-foreground">NOT</span> sell insurance, does <span className="font-bold text-foreground">NOT</span> partner with any insurer, and does <span className="font-bold text-foreground">NOT</span> receive commission. Verify all insurer data at: <span className="font-semibold text-foreground">irdai.gov.in</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* IRDAI advisory tip */}
              <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-start gap-2.5">
                  <CheckCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-blue-300 leading-relaxed">
                    <span className="font-bold">Insurance Tip:</span> For families with parents over 60, consider buying a separate senior citizen plan for parents rather than including them in a family floater. It avoids premium loading and keeps the family floater affordable for everyone else.
                  </p>
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <DisclaimerComponent module="insurance" />
    </div>
  );
}