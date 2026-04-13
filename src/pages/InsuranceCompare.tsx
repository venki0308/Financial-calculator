import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Shield, Minus, AlertTriangle,
  ChevronDown, ChevronUp, Users, Baby, UserPlus,
  Heart, CheckCircle, Info, Save, Check, Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { AnalyticsService } from '../lib/analytics';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { useLiveStatusStore } from '../store/useLiveStatusStore';
import DateInput from '../components/DateInput';
import SnapshotPreviewCard from '../components/SnapshotPreviewCard';
import SaveNameDialog from '../components/SaveNameDialog';

// ─── Constants ──────────────────────────────────────────────────────────────────

const SUM_INSURED_VALUES = [5, 10, 15, 25, 50, 100] as const;

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

function ScoreDial({ score, label: overrideLabel }: { score: number; label?: string }) {
  const { t } = useTranslation();
  const R = 90;
  const circ = Math.PI * R;
  const color = score <= 40 ? '#ef4444' : score <= 75 ? '#f59e0b' : '#22c55e';
  const label = overrideLabel || (score <= 40 ? t('insCompare.scoreCriticallyUnderinsured')
    : score <= 60 ? t('insCompare.scoreUnderinsured')
    : score <= 75 ? t('insCompare.scoreAdequateForBasics')
    : score <= 88 ? t('insCompare.scoreWellCovered')
    : t('insCompare.scoreComprehensivelyCovered'));
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

// ─── Helpers ────────────────────────────────────────────────────────────────────

const childAgeLabel = (age: number, t: (key: string) => string): string => {
  if (age < 1) return t('ins.compare.childNewborn');
  if (age <= 4) return t('ins.compare.childToddler');
  if (age <= 12) return t('ins.compare.childSchoolAge');
  if (age <= 17) return t('ins.compare.childTeenager');
  return t('ins.compare.childYoungAdult');
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

  // ── Save to My Loans state ────────────────────────────────────────────────────
  const addProfile = useLiveStatusStore(s => s.addProfile);
  const removeProfile = useLiveStatusStore(s => s.removeProfile);
  const [saved, setSaved] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [policyStartDate, setPolicyStartDate] = useState('');
  const [showNameDialog, setShowNameDialog] = useState(false);

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

  const tSumInsuredOptions = useMemo(() => SUM_INSURED_VALUES.map(value => ({
    label: t(`insCompare.sumInsured_${value}`),
    value,
  })), [t]);

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
    add(t('ins.compare.selfAge', { age: selfAge }), selfAge);
    if (hasSpouse) add(t('ins.compare.spouseAge', { age: spouseAge }), spouseAge);
    children.forEach((age, i) => add(t('ins.compare.childAge', { n: i + 1, age: age === 0 ? '<1' : age }), age));
    parents.forEach((age, i) => add(t('ins.compare.parentAge', { n: i + 1, age }), age));
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
  }, [selfAge, hasSpouse, spouseAge, children, parents, sumInsured, cityType, hasPreExisting, t]);

  // ── Adequacy score ────────────────────────────────────────────────────────────
  const adequacyScore = useMemo(
    () => calcAdequacy(sumInsured, cityType, allAges, parents, hasPreExisting),
    [sumInsured, cityType, allAges, parents, hasPreExisting],
  );

  const adequacyExplanation = useMemo(() => {
    const cityLabel = cityType === 'metro' ? t('ins.compare.metroCities') : cityType === 'tier2' ? t('ins.compare.tier2Cities') : t('ins.compare.yourCity');
    if (adequacyScore < 50)
      return t('ins.compare.adequacyLow', { cityLabel, cover: fmtL(sumInsured) });
    if (adequacyScore <= 75)
      return t('ins.compare.adequacyMid');
    return t('ins.compare.adequacyHigh');
  }, [adequacyScore, cityType, sumInsured, t]);

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

  // ── 1. PLAN COMPARISON: Base + Top-Up vs Full Coverage ──────────────────────
  const planComparison = useMemo(() => {
    const siAmount = sumInsured * 100000;
    const baseSi = cityType === 'metro' ? 10 : cityType === 'tier2' ? 5 : 5; // lakhs
    const topUpSi = Math.max(0, sumInsured - baseSi);
    const [baseLo, baseHi] = [premiumData.lo * 0.55, premiumData.hi * 0.55]; // base portion
    const topUpPremium = topUpSi > 0 ? Math.round(topUpSi * 100000 * 0.003) : 0;
    const planACost = Math.round(baseLo) + topUpPremium;
    const planBCost = premiumData.lo;
    return {
      baseSi, topUpSi, siAmount,
      planA: { name: t('ins.cmp.planA', 'Plan A: Base + Top-Up'), baseCover: baseSi, topUpCover: topUpSi, premium: planACost, desc: t('ins.cmp.planADesc', 'Lower base premium + affordable top-up for high coverage') },
      planB: { name: t('ins.cmp.planB', 'Plan B: Single Full Plan'), cover: sumInsured, premium: planBCost, desc: t('ins.cmp.planBDesc', 'One comprehensive plan — simpler but higher premium') },
      savings: planBCost - planACost,
    };
  }, [sumInsured, cityType, premiumData, t]);

  // ── 2. PRIORITY MAPPING ───────────────────────────────────────────────────────
  const priorityMapping = useMemo(() => {
    const map: { priority: string; label: string; metric: string; recommendation: string }[] = [];
    priorities.forEach(p => {
      if (p === 'csr') map.push({ priority: p, label: t('ins.cmp.csrLabel', 'Claim Settlement'), metric: t('ins.cmp.csrMetric', 'Look for CSR > 95%'), recommendation: t('ins.cmp.csrRec', 'Verify only at irdai.gov.in. Third-party sites show stale data.') });
      if (p === 'network') map.push({ priority: p, label: t('ins.cmp.networkLabel', 'Hospital Network'), metric: t('ins.cmp.networkMetric', 'Check your hospital on insurer website'), recommendation: t('ins.cmp.networkRec', 'Network lists change frequently. Never rely on broker sites.') });
      if (p === 'claim_speed') map.push({ priority: p, label: t('ins.cmp.claimLabel', 'Claim Speed'), metric: t('ins.cmp.claimMetric', 'In-house > TPA processing'), recommendation: t('ins.cmp.claimRec', 'Ask insurer: "Who processes cashless claims?" In-house = faster.') });
      if (p === 'restoration') map.push({ priority: p, label: t('ins.cmp.restoreLabel', 'Restoration'), metric: t('ins.cmp.restoreMetric', 'Unlimited > Once/year'), recommendation: t('ins.cmp.restoreRec', 'Ask if restoration applies to same illness or different only.') });
      if (p === 'opd') map.push({ priority: p, label: t('ins.cmp.opdLabel', 'OPD Cover'), metric: t('ins.cmp.opdMetric', 'Check annual OPD limit'), recommendation: t('ins.cmp.opdRec', 'Check sublimits per visit and network doctor requirement.') });
      if (p === 'senior') map.push({ priority: p, label: t('ins.cmp.seniorLabel', 'Senior Friendly'), metric: t('ins.cmp.seniorMetric', 'Zero co-pay + no age sublimits'), recommendation: t('ins.cmp.seniorRec', 'Avoid plans with age-based co-payment (10-20% of every claim).') });
      if (p === 'child') map.push({ priority: p, label: t('ins.cmp.childLabel', 'Child Focused'), metric: t('ins.cmp.childMetric', 'Day 1 newborn + vaccination'), recommendation: t('ins.cmp.childRec', 'Verify newborn clause and paediatric sublimits.') });
      if (p === 'wellness') map.push({ priority: p, label: t('ins.cmp.wellnessLabel', 'Wellness'), metric: t('ins.cmp.wellnessMetric', 'Premium discount for healthy habits'), recommendation: t('ins.cmp.wellnessRec', 'Read fine print — reward redemption often requires specific apps.') });
    });
    return map;
  }, [priorities, t]);

  // ── 3. TRADE-OFF ANALYSIS ─────────────────────────────────────────────────────
  const tradeOffs = useMemo(() => {
    const items: { title: string; choice1: string; choice2: string; verdict: string }[] = [];
    items.push({
      title: t('ins.cmp.tradeoffCost', 'Cost vs Coverage'),
      choice1: t('ins.cmp.tradeoffLowPremium', 'Lower premium (₹5-10L cover) — save ₹5-15K/yr'),
      choice2: t('ins.cmp.tradeoffHighCover', 'Higher cover (₹25-50L) — protected against major illness'),
      verdict: cityType === 'metro' ? t('ins.cmp.tradeoffMetroVerdict', 'In metros, higher cover wins. One ICU stay can exceed ₹5L.') : t('ins.cmp.tradeoffTierVerdict', 'In Tier 2/3, ₹10-15L is usually adequate.'),
    });
    items.push({
      title: t('ins.cmp.tradeoffRisk', 'Risk vs Premium'),
      choice1: t('ins.cmp.tradeoffCopay', 'Co-pay plan (10-20% you pay) — 15-25% lower premium'),
      choice2: t('ins.cmp.tradeoffZeroCopay', 'Zero co-pay plan — higher premium but full coverage'),
      verdict: hasPreExisting ? t('ins.cmp.tradeoffPedVerdict', 'With pre-existing conditions, zero co-pay is critical. Co-pay on chronic illness claims adds up.') : t('ins.cmp.tradeoffNoPedVerdict', 'For healthy families, co-pay plans can save money if you rarely claim.'),
    });
    if (parents.length > 0) {
      items.push({
        title: t('ins.cmp.tradeoffFamily', 'Floater vs Individual'),
        choice1: t('ins.cmp.tradeoffFloater', 'Family floater — one policy, shared sum insured'),
        choice2: t('ins.cmp.tradeoffIndividual', 'Separate policies — higher cost but independent cover'),
        verdict: seniorParents.length > 0 ? t('ins.cmp.tradeoffSeniorVerdict', 'Separate policy for parents 60+ recommended. Floater with seniors inflates young family premium.') : t('ins.cmp.tradeoffYoungVerdict', 'Floater is cost-effective when all members are under 60.'),
      });
    }
    return items;
  }, [cityType, hasPreExisting, parents.length, seniorParents.length, t]);

  // ── 4. FAMILY-BASED RECOMMENDATIONS ───────────────────────────────────────────
  const familyRecs = useMemo(() => {
    const recs: { icon: string; text: string }[] = [];
    if (seniorParents.length > 0) recs.push({ icon: '👴', text: t('ins.cmp.famSenior', 'Parents 60+ should ideally be on a separate senior citizen plan to avoid inflating your family floater premium.') });
    if (elderlyParents.length > 0) recs.push({ icon: '🏥', text: t('ins.cmp.famElderly', 'Parents 70+ have very high hospitalisation risk. Ensure zero co-pay and no room rent capping. Consider ₹25L+ cover for them.') });
    if (children.some(c => c <= 4)) recs.push({ icon: '👶', text: t('ins.cmp.famToddler', 'Toddlers need day-care procedure cover and vaccination OPD. Verify the newborn clause — Day 1 cover is best.') });
    if (hasSpouse && children.length === 0) recs.push({ icon: '💑', text: t('ins.cmp.famCouple', 'Planning children? Add maternity benefit now. Most plans have 2-4 year waiting period for maternity.') });
    if (allAges.every(a => a < 35)) recs.push({ icon: '💪', text: t('ins.cmp.famYoung', 'All members under 35 — lock in a high sum insured now. Premiums are lowest at this age and won\'t increase for existing members.') });
    return recs;
  }, [seniorParents.length, elderlyParents.length, children, hasSpouse, allAges, t]);

  // ── 5. REAL RISK CONTEXT (Hospital costs + coverage gaps) ─────────────────────
  const riskContext = useMemo(() => {
    const mul = cityType === 'metro' ? 1.0 : cityType === 'tier2' ? 0.6 : 0.4;
    const siAmount = sumInsured * 100000;
    const scenarios = [
      { event: t('ins.cmp.scenarioICU', '10-Day ICU Stay'), cost: Math.round(450000 * mul), covered: siAmount >= Math.round(450000 * mul) },
      { event: t('ins.cmp.scenarioHeart', 'Heart Surgery + Recovery'), cost: Math.round(700000 * mul), covered: siAmount >= Math.round(700000 * mul) },
      { event: t('ins.cmp.scenarioCancer', 'Cancer (1yr treatment)'), cost: Math.round(1500000 * mul), covered: siAmount >= Math.round(1500000 * mul) },
      { event: t('ins.cmp.scenarioKnee', 'Joint Replacement'), cost: Math.round(400000 * mul), covered: siAmount >= Math.round(400000 * mul) },
    ];
    const gaps = scenarios.filter(s => !s.covered);
    return { scenarios, gaps, hasGaps: gaps.length > 0 };
  }, [sumInsured, cityType, t]);

  // ── 6. COST OPTIMIZATION ──────────────────────────────────────────────────────
  const costOptimization = useMemo(() => {
    const options = SUM_INSURED_VALUES.map(siL => {
      const ages = allAges;
      const rawLo = ages.reduce((s, age) => s + getMemberPremium(age, siL, cityType, hasPreExisting)[0], 0);
      const ff = getFloaterFactor(ages.length);
      const premium = Math.round(rawLo * ff / 100) * 100;
      const adequacy = calcAdequacy(siL, cityType, allAges, parents, hasPreExisting);
      const valueScore = adequacy > 0 && premium > 0 ? Math.round((adequacy / premium) * 10000) : 0;
      return { siL, premium, adequacy, valueScore, isCurrent: siL === sumInsured };
    });
    const best = options.reduce((a, b) => (b.valueScore > a.valueScore && b.adequacy >= 70) ? b : a, options[0]);
    return { options, best };
  }, [sumInsured, allAges, parents, cityType, hasPreExisting]);

  // ── Save / Remove handlers ────────────────────────────────────────────────────
  const suggestedName = `Health Compare — ${allAges.length} members · ${fmtL(sumInsured)} cover`;

  const handleSaveCompare = (customName: string) => {
    const calcId = `inscmp-${Date.now()}`;
    addProfile({
      id: calcId,
      name: customName,
      calculatorType: 'Insurance Compare',
      profileData: {
        sumInsured: sumInsured * 100000,
        members: allAges.length,
        cityType,
        hasPreExisting,
        premiumA: premiumData.lo,
        premiumB: premiumData.hi,
        winner: hasPreExisting ? 'PED Plan' : 'Standard',
        tab: 'health',
        startDate: policyStartDate || new Date().toISOString().slice(0, 10),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setSaved(true);
    setLastSavedId(calcId);
  };

  const handleRemoveCompare = () => {
    if (lastSavedId) {
      removeProfile(lastSavedId);
      setLastSavedId(null);
      setSaved(false);
    }
  };

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
                  {t('ins.compare.profileTitle')}
                </h2>

                {/* Self & Spouse */}
                <div className="p-4 rounded-2xl bg-card border border-border mb-3">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block mb-3">{t('ins.compare.self')}</span>
                  <div className="flex items-center gap-3 mb-4">
                    <label className="text-xs text-muted-foreground w-16">{t('ins.compare.yourAge')}</label>
                    <input type="text" inputMode="numeric" value={selfAge}
                      onChange={e => { const v = e.target.value.replace(/\D/g, ''); setSelfAge(v === '' ? 0 : Number(v)); }}
                      onBlur={() => setSelfAge(a => Math.min(70, Math.max(18, a)))}
                      className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm font-bold text-center"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border/40">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('ins.compare.spouse')}</span>
                    <button onClick={() => setHasSpouse(!hasSpouse)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${hasSpouse ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-muted text-muted-foreground border border-border'}`}>
                      {hasSpouse ? t('ins.compare.added') : t('ins.compare.addSpouse')}
                    </button>
                  </div>
                  {hasSpouse && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden mt-3">
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-muted-foreground w-16">{t('ins.compare.age')}</label>
                        <input type="text" inputMode="numeric" value={spouseAge}
                          onChange={e => { const v = e.target.value.replace(/\D/g, ''); setSpouseAge(v === '' ? 0 : Number(v)); }}
                          onBlur={() => setSpouseAge(a => Math.min(70, Math.max(18, a)))}
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
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('ins.compare.children')}</span>
                    </div>
                    {children.length < 4 && (
                      <button onClick={addChild} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
                        {t('ins.compare.addChild')}
                      </button>
                    )}
                  </div>
                  {children.length === 0 && <p className="text-xs text-muted-foreground">{t('ins.compare.noChildren')}</p>}
                  <div className="space-y-2.5">
                    {children.map((age, idx) => (
                      <div key={idx}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-muted-foreground w-14">{t('ins.compare.childN', { n: idx + 1 })}</span>
                          <input type="text" inputMode="numeric" value={age}
                            onChange={e => { const v = e.target.value.replace(/\D/g, ''); updateChild(idx, v === '' ? 0 : Number(v)); }}
                            onBlur={() => updateChild(idx, Math.min(25, Math.max(0, children[idx])))}
                            className="w-16 px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground text-sm font-bold text-center"
                          />
                          <span className="text-[10px] text-muted-foreground flex-1">{childAgeLabel(age, t)}</span>
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
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('ins.compare.parents')}</span>
                    </div>
                    {parents.length < 4 && (
                      <button onClick={addParent} className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold">
                        {t('ins.compare.addParent')}
                      </button>
                    )}
                  </div>
                  {parents.length === 0 && <p className="text-xs text-muted-foreground">{t('ins.compare.noParents')}</p>}
                  <div className="space-y-2.5">
                    {parents.map((age, idx) => (
                      <div key={idx}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-muted-foreground w-14">{t('ins.compare.parentN', { n: idx + 1 })}</span>
                          <input type="text" inputMode="numeric" value={age}
                            onChange={e => { const v = e.target.value.replace(/\D/g, ''); updateParent(idx, v === '' ? 0 : Number(v)); }}
                            onBlur={() => updateParent(idx, Math.min(85, Math.max(40, parents[idx])))}
                            className="w-16 px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground text-sm font-bold text-center"
                          />
                          <span className="text-[10px] text-muted-foreground flex-1">
                            {age >= 70 ? t('ins.compare.elderly') : age >= 60 ? t('ins.compare.senior') : t('ins.compare.adult')}
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
                      <p className="text-xs font-bold text-foreground">{t('ins.compare.preExisting')}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t('ins.compare.preExistingHint')}</p>
                    </div>
                    <button onClick={() => setHasPreExisting(!hasPreExisting)}
                      className={`w-12 h-7 rounded-full transition-all relative ${hasPreExisting ? 'bg-emerald-500' : 'bg-muted border border-border'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${hasPreExisting ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                {/* City Type */}
                <div className="p-4 rounded-2xl bg-card border border-border mb-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">{t('ins.compare.cityType')}</p>
                  <div className="flex gap-2">
                    {(['metro', 'tier2', 'tier3'] as const).map(c => (
                      <button key={c} onClick={() => setCityType(c)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${cityType === c
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-muted text-muted-foreground border border-border'}`}>
                        {c === 'metro' ? t('ins.compare.metro') : c === 'tier2' ? t('ins.compare.tier2') : t('ins.compare.tier3')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sum Insured */}
                <div className="p-4 rounded-2xl bg-card border border-border mb-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">{t('ins.compare.sumInsured')}</p>
                  <div className="flex flex-wrap gap-2">
                    {tSumInsuredOptions.map(opt => (
                      <button key={opt.value} onClick={() => setSumInsured(opt.value)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${sumInsured === opt.value
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-muted text-muted-foreground border border-border'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {sumInsured <= 5 && (
                    <p className="text-[10px] text-amber-400 mt-2.5">{t('ins.compare.lowSiWarning')}</p>
                  )}
                </div>

                {/* Priorities */}
                <div className="p-4 rounded-2xl bg-card border border-border mb-5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{t('ins.compare.whatMatters')}</p>
                  <p className="text-[10px] text-muted-foreground mb-3">{t('ins.compare.selectPriorities')}</p>
                  <div className="flex flex-wrap gap-2">
                    {tPriorityOptions.map(opt => {
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
                  t('ins.compare.memberCount', { count: allAges.length }),
                  fmtL(sumInsured),
                  cityType === 'metro' ? t('ins.compare.metro') : cityType === 'tier2' ? t('ins.compare.tier2') : t('ins.compare.tier3'),
                  hasPreExisting ? t('ins.compare.preExistingTag') : null,
                ].filter(Boolean).map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">{tag}</span>
                ))}
              </div>

              {/* Card A — Coverage Adequacy */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <p className="text-sm font-bold text-foreground mb-0.5">{t('ins.health.adequacyTitle')}</p>
                <p className="text-[10px] text-muted-foreground mb-2">{t('ins.health.adequacySubtitle')}</p>
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
                    { label: t('ins.health.cover'), val: fmtL(sumInsured) },
                    { label: t('ins.health.city'), val: cityType === 'metro' ? t('ins.compare.metro') : cityType === 'tier2' ? t('ins.compare.tier2') : t('ins.compare.tier3') },
                    { label: t('ins.health.members'), val: String(allAges.length) },
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
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t('ins.health.premiumTitle')}</p>
                <p className="text-[9px] text-muted-foreground mb-3">{t('ins.compare.irdaiBasis')}</p>
                <p className="text-2xl font-black text-foreground mb-0.5">{fmtRange(premiumData.lo, premiumData.hi)}</p>
                <p className="text-emerald-400 text-sm font-semibold mb-4">
                  {t('ins.compare.perMonth', { range: fmtRange(Math.round(premiumData.lo / 12 / 100) * 100, Math.round(premiumData.hi / 12 / 100) * 100) })}
                </p>

                <button onClick={() => setShowBreakdown(v => !v)}
                  className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/60 dark:bg-black/10 border border-emerald-500/15 mb-3">
                  <span className="text-[11px] font-semibold text-foreground">{t('ins.health.memberBreakdown')}</span>
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
                          <span className="text-[11px] text-muted-foreground">{t('ins.health.floaterDiscount')}</span>
                          <span className="text-[11px] font-bold text-emerald-400">−{premiumData.floaterPct}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-foreground">{t('ins.health.total')}</span>
                          <span className="text-[11px] font-black text-foreground">{fmtRange(premiumData.lo, premiumData.hi)}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {hasPreExisting && (
                  <p className="text-[10px] text-amber-400 mb-3 flex items-center gap-1">
                    <AlertTriangle size={11} /> {t('ins.health.preExistingLoading')}
                  </p>
                )}
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {t('ins.compare.premiumDisclaimer')}
                  </p>
                </div>
              </div>

              {/* ── 1. PLAN COMPARISON: Base + Top-Up vs Full ── */}
              {sumInsured >= 10 && (
                <div className="p-4 rounded-2xl bg-card border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={15} className="text-blue-400" />
                    <h3 className="text-sm font-bold text-foreground">{t('ins.cmp.planCompareTitle', 'Plan Comparison')}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className={`p-3 rounded-xl border ${planComparison.savings > 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'}`}>
                      <p className="text-[9px] uppercase font-bold text-emerald-400 mb-1">{planComparison.planA.name}</p>
                      <p className="text-xs text-muted-foreground mb-1">{fmtL(planComparison.baseSi)} + {fmtL(planComparison.topUpSi)} {t('ins.cmp.topUpLabel', 'top-up')}</p>
                      <p className="text-lg font-black text-foreground">~{fmt(planComparison.planA.premium)}<span className="text-[9px] font-normal text-muted-foreground">/{t('ins.life.yr', 'yr')}</span></p>
                      <p className="text-[9px] text-muted-foreground mt-1">{planComparison.planA.desc}</p>
                    </div>
                    <div className={`p-3 rounded-xl border ${planComparison.savings <= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'}`}>
                      <p className="text-[9px] uppercase font-bold text-blue-400 mb-1">{planComparison.planB.name}</p>
                      <p className="text-xs text-muted-foreground mb-1">{fmtL(sumInsured)} {t('ins.cmp.singlePlan', 'single plan')}</p>
                      <p className="text-lg font-black text-foreground">~{fmt(planComparison.planB.premium)}<span className="text-[9px] font-normal text-muted-foreground">/{t('ins.life.yr', 'yr')}</span></p>
                      <p className="text-[9px] text-muted-foreground mt-1">{planComparison.planB.desc}</p>
                    </div>
                  </div>
                  {planComparison.savings > 0 && (
                    <p className="text-[10px] text-center font-semibold text-emerald-400">💡 {t('ins.cmp.planASaves', { amount: fmt(planComparison.savings), defaultValue: 'Base + Top-Up can save ~{{amount}}/yr with same total coverage' })}</p>
                  )}
                </div>
              )}

              {/* ── 3. TRADE-OFF EXPLANATIONS ── */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Info size={15} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-foreground">{t('ins.cmp.tradeoffTitle', 'Key Trade-Offs to Consider')}</h3>
                </div>
                <div className="space-y-3">
                  {tradeOffs.map((tf, i) => (
                    <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border">
                      <p className="text-xs font-bold text-foreground mb-2">{tf.title}</p>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <p className="text-[10px] text-muted-foreground p-2 rounded-lg bg-blue-500/5">⚖️ {tf.choice1}</p>
                        <p className="text-[10px] text-muted-foreground p-2 rounded-lg bg-emerald-500/5">⚖️ {tf.choice2}</p>
                      </div>
                      <p className="text-[10px] font-semibold text-emerald-400">→ {tf.verdict}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 5. REAL RISK CONTEXT — Hospital cost scenarios ── */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Heart size={15} className="text-red-400" />
                  <h3 className="text-sm font-bold text-foreground">{t('ins.cmp.riskTitle', 'Will Your Cover Handle This?')}</h3>
                </div>
                <div className="space-y-1.5">
                  {riskContext.scenarios.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: s.covered ? '#22c55e08' : '#ef44440a' }}>
                      <span className="text-[11px] font-medium text-foreground">{s.event}</span>
                      <div className="text-right">
                        <span className={`text-[10px] font-bold ${s.covered ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(s.cost)}</span>
                        <p className="text-[8px]" style={{ color: s.covered ? '#22c55e' : '#ef4444' }}>{s.covered ? '✅ ' + t('ins.cmp.covered', 'Covered') : '⚠ ' + t('ins.cmp.gap', 'Gap!')}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {riskContext.hasGaps && (
                  <p className="text-[10px] text-red-400 mt-2 font-semibold">{t('ins.cmp.gapWarning', { count: riskContext.gaps.length, defaultValue: '{{count}} scenario(s) exceed your coverage. Consider increasing sum insured.' })}</p>
                )}
              </div>

              {/* ── 4. FAMILY-BASED RECOMMENDATIONS ── */}
              {familyRecs.length > 0 && (
                <div className="p-4 rounded-2xl bg-card border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={15} className="text-violet-400" />
                    <h3 className="text-sm font-bold text-foreground">{t('ins.cmp.familyRecTitle', 'Family-Specific Advice')}</h3>
                  </div>
                  <div className="space-y-2">
                    {familyRecs.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-violet-500/5 border border-violet-500/15">
                        <span className="text-base flex-shrink-0">{rec.icon}</span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{rec.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 6. COST OPTIMIZATION ── */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={15} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-foreground">{t('ins.cmp.optimizeTitle', 'Best Value Coverage')}</h3>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">{t('ins.cmp.optimizeDesc', 'Coverage adequacy vs premium — find the sweet spot')}</p>
                <div className="space-y-1.5">
                  {costOptimization.options.filter(o => o.adequacy > 0).map(o => (
                    <div key={o.siL} className={`flex items-center justify-between p-2.5 rounded-xl ${o.siL === costOptimization.best.siL ? 'bg-emerald-500/10 border border-emerald-500/25' : o.isCurrent ? 'bg-blue-500/5 border border-blue-500/20' : ''}`} style={o.siL !== costOptimization.best.siL && !o.isCurrent ? { border: '1px solid transparent' } : {}}>
                      <div>
                        <p className="text-xs font-bold text-foreground">{fmtL(o.siL)}</p>
                        <p className="text-[9px] text-muted-foreground">~{fmt(o.premium)}/{t('ins.life.yr', 'yr')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full overflow-hidden bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${o.adequacy}%`, background: o.adequacy >= 75 ? '#22c55e' : o.adequacy >= 50 ? '#f59e0b' : '#ef4444' }} />
                        </div>
                        <span className="text-[10px] font-bold w-8 text-right" style={{ color: o.adequacy >= 75 ? '#22c55e' : o.adequacy >= 50 ? '#f59e0b' : '#ef4444' }}>{o.adequacy}%</span>
                        {o.siL === costOptimization.best.siL && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">{t('ins.cmp.bestValue', 'Best')}</span>}
                        {o.isCurrent && o.siL !== costOptimization.best.siL && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">{t('ins.cmp.yourPick', 'Yours')}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 2. PRIORITY-BASED LOGIC — if priorities selected ── */}
              {priorityMapping.length > 0 && (
                <div className="p-4 rounded-2xl bg-card border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={15} className="text-amber-400" />
                    <h3 className="text-sm font-bold text-foreground">{t('ins.cmp.priorityMapTitle', 'What to Check Based on Your Priorities')}</h3>
                  </div>
                  <div className="space-y-2.5">
                    {priorityMapping.map((pm, i) => (
                      <div key={i} className="p-3 rounded-xl border border-border">
                        <p className="text-xs font-bold text-foreground mb-1">{pm.label}</p>
                        <p className="text-[10px] text-amber-400 font-semibold mb-1">📊 {pm.metric}</p>
                        <p className="text-[10px] text-muted-foreground">{pm.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save to My Loans / Trackers */}
              <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                {!saved && (
                  <div>
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
                {/* COMPARE SNAPSHOT — appears the moment user picks a date */}
                {policyStartDate && (
                  <SnapshotPreviewCard
                    anchorDate={policyStartDate}
                    headline={fmtL(sumInsured)}
                    headlineLabel={t('insCompare.cover', 'Compared Cover')}
                    subtitle={t('insCompare.snapshotSubtitle', 'IRDAI-based premium range for {{members}} members', { members: allAges.length })}
                    metrics={[
                      { label: t('insCompare.premiumLow', 'Min Premium'), value: fmt(premiumData.lo), tone: 'investment' },
                      { label: t('insCompare.premiumHigh', 'Max Premium'), value: fmt(premiumData.hi), tone: 'expense' },
                      { label: t('insCompare.members', 'Members'), value: String(allAges.length), tone: 'neutral' },
                    ]}
                    notes={[
                      { label: t('insCompare.city', 'City tier'), value: cityType === 'metro' ? t('insCompare.metro', 'Metro') : cityType === 'tier2' ? t('insCompare.tier2', 'Tier 2') : t('insCompare.tier3', 'Tier 3') },
                      { label: t('insCompare.preExisting', 'Pre-existing conditions'), value: hasPreExisting ? t('liveStatus.yes', 'Yes') : t('liveStatus.no', 'No') },
                      { label: t('insCompare.adequacy', 'Adequacy'), value: `${adequacyScore}%` },
                    ]}
                    label={t('insCompare.snapshotTitle', 'Insurance Compare Snapshot')}
                  />
                )}
                {saved ? (
                  <div className="flex gap-2">
                    <div className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <Check size={16} /> {t('common.saved')}
                    </div>
                    <button onClick={() => navigate('/my-loans')}
                      className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 transition-all active:scale-95">
                      {t('common.viewInMyLoans', 'View')}
                    </button>
                    <button onClick={handleRemoveCompare}
                      className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 transition-all active:scale-95">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowNameDialog(true)}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95">
                    <Save size={16} /> {t('common.saveCalculation', 'Save Calculation')}
                  </button>
                )}

                <SaveNameDialog
                  open={showNameDialog}
                  onClose={() => setShowNameDialog(false)}
                  onConfirm={(name) => handleSaveCompare(name)}
                  defaultName={suggestedName}
                />
              </div>

              {/* Priority guidance — shown if user selected priorities */}
              {priorities.length > 0 && (
                <div className="p-4 rounded-2xl bg-card border border-border">
                  <p className="text-sm font-bold text-foreground mb-1">{t('ins.compare.priorityGuide')}</p>
                  <p className="text-[10px] text-muted-foreground mb-3">{t('ins.compare.priorityGuideSubtitle')}</p>
                  <div className="space-y-3">
                    {priorities.map(pid => {
                      const opt = tPriorityOptions.find(o => o.id === pid);
                      if (!opt) return null;
                      return (
                        <div key={pid} className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Info size={11} className="text-amber-400" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-foreground mb-0.5">{opt.label}</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{t(`ins.compare.priorityGuide_${pid}`)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Card C — Personalised Checklist */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <p className="text-sm font-bold text-foreground mb-0.5">{t('ins.health.checklistTitle')}</p>
                <p className="text-[10px] text-muted-foreground mb-4">{t('ins.health.checklistSubtitle')}</p>
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
                  {t('ins.compare.irdaiSource')}
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
                    <p className="text-[10px] font-bold text-foreground mb-1">{t('ins.compare.simulatorTitle')}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mb-1">
                      {t('ins.compare.simulatorDesc')}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {t('ins.compare.simulatorDisclaimer')}
                    </p>
                  </div>
                </div>
              </div>

              {/* IRDAI advisory tip */}
              <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-start gap-2.5">
                  <CheckCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-blue-600 dark:text-blue-300 leading-relaxed">
                    {t('ins.compare.separateSeniorTip')}
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