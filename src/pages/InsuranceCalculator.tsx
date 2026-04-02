import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import {
  ArrowLeft, Info, Download, Shield, Heart, HeartPulse, Users, Building2,
  Crown, Star, CheckCircle, AlertTriangle, TrendingUp, ChevronDown, ChevronUp,
  Share2, Award, Zap, Banknote,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import { AnalyticsService } from '../lib/analytics';
import { nativeShare } from '../utils/nativeShare';
import { exportToPDF, dateTag, type ExportConfig } from '../utils/exportReport';
import {
  calculateHealthPremiums,
  calculateLifePremiums,
  type HealthInsuranceInputs,
  type LifeInsuranceInputs,
  type HealthInsurancePlan,
  type LifeInsurancePlan,
} from '../utils/insuranceUtils';

type InsuranceTab = 'health' | 'life';

const SUM_INSURED_OPTIONS = [
  { label: '₹3L', value: 300000 },
  { label: '₹5L', value: 500000 },
  { label: '₹10L', value: 1000000 },
  { label: '₹25L', value: 2500000 },
  { label: '₹50L', value: 5000000 },
  { label: '₹1Cr', value: 10000000 },
];

const LIFE_COVER_OPTIONS = [
  { label: '₹50L', value: 5000000 },
  { label: '₹1Cr', value: 10000000 },
  { label: '₹2.5Cr', value: 25000000 },
  { label: '₹5Cr', value: 50000000 },
  { label: '₹10Cr', value: 100000000 },
];

const CITY_OPTIONS: { label: string; value: 'metro' | 'tier2' | 'tier3' }[] = [
  { label: 'Metro', value: 'metro' },
  { label: 'Tier 2', value: 'tier2' },
  { label: 'Tier 3', value: 'tier3' },
];

const MEMBER_OPTIONS = [
  { label: 'Self', value: 1 },
  { label: 'Self + Spouse', value: 2 },
  { label: 'Family (3)', value: 3 },
  { label: 'Family (4)', value: 4 },
];

function formatINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function formatCompact(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return formatINR(n);
}

// Star Rating component
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
        />
      ))}
      <span className="text-[10px] text-muted-foreground ml-1">{rating}</span>
    </div>
  );
}

// Pill selector component
function PillSelector<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-muted-foreground mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              value === opt.value
                ? 'bg-brand-green text-black shadow-lg shadow-brand-green/20'
                : 'bg-card border border-border text-muted-foreground hover:border-slate-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Toggle switch component
function ToggleSwitch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border mb-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-all relative ${
          value ? 'bg-brand-green' : 'bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
            value ? 'left-[26px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

// ─── Health Plan Card ────────────────────────────────────────────────────────

function HealthPlanCard({
  plan,
  rank,
  isBestValue,
  isBestCoverage,
}: {
  plan: HealthInsurancePlan;
  rank: number;
  isBestValue: boolean;
  isBestCoverage: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08 }}
      className={`rounded-2xl border overflow-hidden ${
        rank === 0
          ? 'bg-gradient-to-br from-brand-green/5 to-emerald-500/5 border-brand-green/30'
          : 'bg-card border-border'
      }`}
    >
      {/* Badges */}
      {(isBestValue || isBestCoverage) && (
        <div className="flex gap-2 px-4 pt-3">
          {isBestValue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              <Award size={10} /> Best Value
            </span>
          )}
          {isBestCoverage && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold">
              <Crown size={10} /> Best Coverage
            </span>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-foreground font-bold text-sm">{plan.insurer}</h3>
            <p className="text-muted-foreground text-[11px]">{plan.planName}</p>
            <StarRating rating={plan.rating} />
          </div>
          <div className="text-right">
            <p className="text-foreground font-bold text-lg">{formatINR(plan.annualPremium)}</p>
            <p className="text-muted-foreground text-[10px]">per year</p>
            <p className="text-brand-green text-[10px] font-medium">
              ~{formatINR(Math.round(plan.annualPremium / 12))}/mo
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/40 text-center">
            <p className="text-[9px] text-muted-foreground uppercase font-bold">NCB</p>
            <p className="text-foreground font-bold text-xs">{plan.noClaimBonus}%</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/40 text-center">
            <p className="text-[9px] text-muted-foreground uppercase font-bold">Room</p>
            <p className="text-foreground font-bold text-xs">
              {plan.roomRent === 'no-limit' ? 'No Cap' : plan.roomRent === 'single-ac' ? 'Single AC' : 'Shared'}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/40 text-center">
            <p className="text-[9px] text-muted-foreground uppercase font-bold">5yr Cover</p>
            <p className="text-foreground font-bold text-xs">{formatCompact(plan.coverAfter5Yrs)}</p>
          </div>
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-brand-green text-[11px] font-semibold py-1"
        >
          {expanded ? 'Less Details' : 'More Details'}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-2">
                {plan.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle size={12} className="text-brand-green flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground text-[11px]">{h}</span>
                  </div>
                ))}
                {plan.waitingPeriod > 0 && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground text-[11px]">
                      Pre-existing: {plan.waitingPeriod} year waiting period
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Zap size={12} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-[11px]">
                    Copay: {plan.copay === 0 ? 'None' : `${plan.copay}%`}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Life Plan Card ──────────────────────────────────────────────────────────

function LifePlanCard({ plan, rank }: { plan: LifeInsurancePlan; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  const typeColors: Record<string, string> = {
    term: 'from-emerald-500/10 to-green-500/10',
    trop: 'from-blue-500/10 to-indigo-500/10',
    endowment: 'from-amber-500/10 to-orange-500/10',
    ulip: 'from-purple-500/10 to-violet-500/10',
  };

  const typeIcons: Record<string, React.ElementType> = {
    term: Shield,
    trop: HeartPulse,
    endowment: Banknote,
    ulip: TrendingUp,
  };

  const TypeIcon = typeIcons[plan.type] || Shield;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
      className={`rounded-2xl border overflow-hidden bg-gradient-to-br ${typeColors[plan.type]} ${
        plan.type === 'term' ? 'border-brand-green/30' : 'border-border'
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            plan.type === 'term' ? 'bg-emerald-500/20' : plan.type === 'trop' ? 'bg-blue-500/20' : plan.type === 'endowment' ? 'bg-amber-500/20' : 'bg-purple-500/20'
          }`}>
            <TypeIcon size={20} className={
              plan.type === 'term' ? 'text-emerald-400' : plan.type === 'trop' ? 'text-blue-400' : plan.type === 'endowment' ? 'text-amber-400' : 'text-purple-400'
            } />
          </div>
          <div className="flex-1">
            <h3 className="text-foreground font-bold text-sm">{plan.typeName}</h3>
            <p className="text-muted-foreground text-[11px]">{plan.insurer} — {plan.planName}</p>
            <StarRating rating={plan.rating} />
          </div>
        </div>

        {/* Premium */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-muted-foreground text-[10px] uppercase font-bold">Annual Premium</p>
            <p className="text-foreground font-bold text-lg">{formatINR(plan.annualPremium)}</p>
            <p className="text-muted-foreground text-[10px]">~{formatINR(plan.monthlyPremium)}/month</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-[10px] uppercase font-bold">Death Benefit</p>
            <p className="text-foreground font-bold text-sm">{formatCompact(plan.deathBenefit)}</p>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/40 text-center">
            <p className="text-[9px] text-muted-foreground uppercase font-bold">Total Paid</p>
            <p className="text-foreground font-bold text-xs">{formatCompact(plan.totalPremiumPaid)}</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/40 text-center">
            <p className="text-[9px] text-muted-foreground uppercase font-bold">Maturity</p>
            <p className={`font-bold text-xs ${plan.maturityBenefit > 0 ? 'text-brand-green' : 'text-red-400'}`}>
              {plan.maturityBenefit > 0 ? formatCompact(plan.maturityBenefit) : 'Nil'}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/40 text-center">
            <p className="text-[9px] text-muted-foreground uppercase font-bold">XIRR</p>
            <p className={`font-bold text-xs ${
              plan.effectiveReturn > 6 ? 'text-brand-green' : plan.effectiveReturn > 0 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {plan.effectiveReturn === -100 ? 'N/A' : `${plan.effectiveReturn}%`}
            </p>
          </div>
        </div>

        {/* Expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-brand-green text-[11px] font-semibold py-1"
        >
          {expanded ? 'Less Details' : 'View Analysis'}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-2">
                {plan.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle size={12} className="text-brand-green flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground text-[11px]">{h}</span>
                  </div>
                ))}
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/30 mt-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Tax Benefits</p>
                  <p className="text-foreground text-[11px]">
                    80C deduction up to {formatINR(plan.taxBenefit80C)}
                  </p>
                  <p className="text-muted-foreground text-[10px] mt-0.5">{plan.taxBenefit10_10D}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 mt-2">
                  <p className="text-[10px] text-blue-400 uppercase font-bold mb-1">Expert Verdict</p>
                  <p className="text-muted-foreground text-[11px]">{plan.verdict}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function InsuranceCalculator() {
  useEffect(() => { AnalyticsService.trackScreen('Insurance_Calculator'); }, []);
  useTrackCalculator();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<InsuranceTab>('health');
  const [showInfo, setShowInfo] = useState(false);

  // ─── Health Insurance state ─────────────────────────────────────────
  const [healthAge, setHealthAge] = useState(30);
  const [healthMembers, setHealthMembers] = useState(2);
  const [healthSumInsured, setHealthSumInsured] = useState(1000000);
  const [healthPreExisting, setHealthPreExisting] = useState(false);
  const [healthCity, setHealthCity] = useState<'metro' | 'tier2' | 'tier3'>('metro');

  // ─── Life Insurance state ───────────────────────────────────────────
  const [lifeAge, setLifeAge] = useState(30);
  const [lifeGender, setLifeGender] = useState<'male' | 'female'>('male');
  const [lifeSmoker, setLifeSmoker] = useState(false);
  const [lifeCover, setLifeCover] = useState(10000000);
  const [lifePolicyTerm, setLifePolicyTerm] = useState(25);
  const [lifePremiumTerm, setLifePremiumTerm] = useState(25);

  // Clamp premium payment term if policy term is reduced below it
  useEffect(() => {
    if (lifePremiumTerm > lifePolicyTerm) setLifePremiumTerm(lifePolicyTerm);
  }, [lifePolicyTerm]);

  // ─── Calculations ───────────────────────────────────────────────────
  const healthResult = useMemo(() => calculateHealthPremiums({
    age: healthAge,
    members: healthMembers,
    sumInsured: healthSumInsured,
    preExisting: healthPreExisting,
    city: healthCity,
  }), [healthAge, healthMembers, healthSumInsured, healthPreExisting, healthCity]);

  const lifeResult = useMemo(() => calculateLifePremiums({
    age: lifeAge,
    gender: lifeGender,
    smoker: lifeSmoker,
    coverAmount: lifeCover,
    policyTerm: lifePolicyTerm,
    premiumPaymentTerm: lifePremiumTerm,
  }), [lifeAge, lifeGender, lifeSmoker, lifeCover, lifePolicyTerm, lifePremiumTerm]);

  // ─── PDF Export ─────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    const tag = dateTag();
    if (activeTab === 'health') {
      const config: ExportConfig = {
        title: 'Health Insurance Comparison',
        subtitle: `Age ${healthAge} | ${healthMembers === 1 ? 'Self' : healthMembers === 2 ? 'Self+Spouse' : `Family(${healthMembers})`} | ${formatCompact(healthSumInsured)} Cover`,
        inputs: [
          { label: 'Age', value: `${healthAge} years` },
          { label: 'Members', value: `${healthMembers}` },
          { label: 'Sum Insured', value: formatINR(healthSumInsured) },
          { label: 'City', value: healthCity.charAt(0).toUpperCase() + healthCity.slice(1) },
          { label: 'Pre-existing', value: healthPreExisting ? 'Yes' : 'No' },
        ],
        results: healthResult.plans.map(p => ({
          label: `${p.insurer} — ${p.planName}`,
          value: `${formatINR(p.annualPremium)}/yr | NCB: ${p.noClaimBonus}% | Room: ${p.roomRent === 'no-limit' ? 'No cap' : p.roomRent}`,
        })),
        projectionTitle: 'Plan Comparison Details',
        projectionColumns: ['Insurer', 'Annual Premium', 'NCB %', 'Room Rent', 'Cover in 5 Yrs'],
        projectionRows: healthResult.plans.map(p => [
          p.insurer, formatINR(p.annualPremium), `${p.noClaimBonus}%`,
          p.roomRent === 'no-limit' ? 'No Cap' : p.roomRent,
          formatCompact(p.coverAfter5Yrs),
        ]),
        notes: healthResult.expertVerdict,
        filename: `FinCalix_Health_Insurance_${tag}`,
      };
      await exportToPDF(config);
    } else {
      const config: ExportConfig = {
        title: 'Life Insurance Comparison',
        subtitle: `Age ${lifeAge} | ${lifeGender === 'male' ? 'Male' : 'Female'} | ${formatCompact(lifeCover)} Cover | ${lifePolicyTerm}yr`,
        inputs: [
          { label: 'Age', value: `${lifeAge} years` },
          { label: 'Gender', value: lifeGender === 'male' ? 'Male' : 'Female' },
          { label: 'Smoker', value: lifeSmoker ? 'Yes' : 'No' },
          { label: 'Cover Amount', value: formatINR(lifeCover) },
          { label: 'Policy Term', value: `${lifePolicyTerm} years` },
        ],
        results: lifeResult.plans.map(p => ({
          label: `${p.typeName} (${p.insurer})`,
          value: `${formatINR(p.annualPremium)}/yr | Maturity: ${p.maturityBenefit > 0 ? formatCompact(p.maturityBenefit) : 'Nil'} | XIRR: ${p.effectiveReturn === -100 ? 'N/A' : p.effectiveReturn + '%'}`,
        })),
        projectionTitle: 'Plan Type Comparison',
        projectionColumns: ['Type', 'Annual Premium', 'Total Paid', 'Maturity', 'XIRR'],
        projectionRows: lifeResult.plans.map(p => [
          p.typeName, formatINR(p.annualPremium), formatINR(p.totalPremiumPaid),
          p.maturityBenefit > 0 ? formatCompact(p.maturityBenefit) : 'Nil',
          p.effectiveReturn === -100 ? 'N/A' : `${p.effectiveReturn}%`,
        ]),
        notes: lifeResult.expertVerdict,
        filename: `FinCalix_Life_Insurance_${tag}`,
      };
      await exportToPDF(config);
    }
  };

  // ─── Share ──────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (activeTab === 'health') {
      const cheapest = healthResult.plans[0];
      const text = `🏥 Health Insurance Comparison\n\n👤 Age: ${healthAge} | Members: ${healthMembers}\n💰 Sum Insured: ${formatCompact(healthSumInsured)}\n\n🏆 Best Value: ${cheapest.insurer}\n  Premium: ${formatINR(cheapest.annualPremium)}/yr\n  NCB: ${cheapest.noClaimBonus}%\n\n${healthResult.plans.map((p, i) => `${i + 1}. ${p.insurer}: ${formatINR(p.annualPremium)}/yr`).join('\n')}\n\nCompared with FinCalix 🧮`;
      await nativeShare('Health Insurance — FinCalix', text);
    } else {
      const term = lifeResult.plans.find(p => p.type === 'term');
      const text = `🛡️ Life Insurance Comparison\n\n👤 Age: ${lifeAge} | ${lifeGender === 'male' ? 'Male' : 'Female'}\n💰 Cover: ${formatCompact(lifeCover)} | Term: ${lifePolicyTerm}yr\n\n${lifeResult.plans.map(p => `${p.typeName}: ${formatINR(p.annualPremium)}/yr${p.maturityBenefit > 0 ? ` | Maturity: ${formatCompact(p.maturityBenefit)}` : ''}`).join('\n')}\n\n✅ Expert Pick: ${term ? `${term.insurer} Term at just ${formatINR(term.monthlyPremium)}/mo` : 'Term Insurance'}\n\nCompared with FinCalix 🧮`;
      await nativeShare('Life Insurance — FinCalix', text);
    }
  };

  return (
    <div className="min-h-dvh bg-background animate-fade-in">
      {/* ─── Sticky Header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
              <ArrowLeft size={18} className="text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Insurance Calculator</h1>
              <p className="text-muted-foreground text-xs">Compare plans & premiums</p>
            </div>
          </div>
          <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-card border border-border">
            <Info size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-28 pt-4">
        {/* ─── Tab Switcher ──────────────────────────────────────────── */}
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-5">
          {[
            { key: 'health' as InsuranceTab, label: 'Health Insurance', icon: HeartPulse },
            { key: 'life' as InsuranceTab, label: 'Life Insurance', icon: Shield },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-brand-green text-black shadow-lg shadow-brand-green/20'
                  : 'text-muted-foreground hover:text-slate-300'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Health Insurance Tab ──────────────────────────────────── */}
        {activeTab === 'health' && (
          <div>
            {/* Inputs */}
            <div className="space-y-0 mb-6">
              <NumberInput label="Your Age" value={healthAge} onChange={setHealthAge} min={18} max={70} suffix=" years" />
              <div className="h-3" />
              <PillSelector label="Members to Cover" options={MEMBER_OPTIONS} value={healthMembers} onChange={setHealthMembers} />
              <PillSelector label="Sum Insured (Coverage)" options={SUM_INSURED_OPTIONS} value={healthSumInsured} onChange={setHealthSumInsured} />
              <PillSelector label="City Type" options={CITY_OPTIONS} value={healthCity} onChange={setHealthCity} />
              <ToggleSwitch label="Pre-existing Conditions?" value={healthPreExisting} onChange={setHealthPreExisting} />
            </div>

            {/* Expert Verdict */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/20 mb-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Award size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-foreground font-bold text-xs mb-1">Expert Analysis</h3>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">{healthResult.expertVerdict}</p>
                </div>
              </div>
            </motion.div>

            {/* Plan Cards */}
            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <Heart size={14} className="text-red-400" />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {healthResult.plans.length} Plans Compared
                </h2>
              </div>
              {healthResult.plans.map((plan, i) => (
                <HealthPlanCard
                  key={plan.insurer}
                  plan={plan}
                  rank={i}
                  isBestValue={plan.insurer === healthResult.bestValue}
                  isBestCoverage={plan.insurer === healthResult.bestCoverage}
                />
              ))}
            </div>

            {/* Quick Comparison Table */}
            <div className="bg-card border border-border rounded-2xl p-4 mb-5 overflow-x-auto">
              <h3 className="text-foreground font-bold text-sm mb-3">Quick Comparison</h3>
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-muted-foreground font-semibold py-2 pr-2">Insurer</th>
                    <th className="text-right text-muted-foreground font-semibold py-2 px-1">Premium</th>
                    <th className="text-right text-muted-foreground font-semibold py-2 px-1">NCB</th>
                    <th className="text-right text-muted-foreground font-semibold py-2 pl-1">5Y Cover</th>
                  </tr>
                </thead>
                <tbody>
                  {healthResult.plans.map((plan) => (
                    <tr key={plan.insurer} className="border-b border-border/50">
                      <td className="text-foreground font-medium py-2 pr-2">{plan.insurer}</td>
                      <td className="text-right text-foreground py-2 px-1">{formatINR(plan.annualPremium)}</td>
                      <td className="text-right text-brand-green py-2 px-1">{plan.noClaimBonus}%</td>
                      <td className="text-right text-foreground py-2 pl-1">{formatCompact(plan.coverAfter5Yrs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Life Insurance Tab ────────────────────────────────────── */}
        {activeTab === 'life' && (
          <div>
            {/* Inputs */}
            <div className="space-y-0 mb-6">
              <NumberInput label="Your Age" value={lifeAge} onChange={setLifeAge} min={18} max={60} suffix=" years" />
              <div className="h-3" />
              <PillSelector
                label="Gender"
                options={[
                  { label: '👨 Male', value: 'male' as const },
                  { label: '👩 Female', value: 'female' as const },
                ]}
                value={lifeGender}
                onChange={setLifeGender}
              />
              <ToggleSwitch label="Smoker / Tobacco User?" value={lifeSmoker} onChange={setLifeSmoker} />
              <PillSelector label="Cover Amount" options={LIFE_COVER_OPTIONS} value={lifeCover} onChange={setLifeCover} />
              <NumberInput label="Policy Term" value={lifePolicyTerm} onChange={setLifePolicyTerm} min={10} max={40} suffix=" years" />
              <div className="h-3" />
              <NumberInput label="Premium Payment Term" value={lifePremiumTerm} onChange={setLifePremiumTerm} min={5} max={lifePolicyTerm} suffix=" years" />
            </div>

            {/* Expert Verdict */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border border-blue-500/20 mb-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Award size={16} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-foreground font-bold text-xs mb-1">💡 Buy Term, Invest the Rest</h3>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">{lifeResult.expertVerdict}</p>
                </div>
              </div>
            </motion.div>

            {/* Plan Cards */}
            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={14} className="text-blue-400" />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Plan Type Comparison
                </h2>
              </div>
              {lifeResult.plans.map((plan, i) => (
                <LifePlanCard key={plan.type} plan={plan} rank={i} />
              ))}
            </div>

            {/* Comparison Summary */}
            <div className="bg-card border border-border rounded-2xl p-4 mb-5">
              <h3 className="text-foreground font-bold text-sm mb-3">Comparison Summary</h3>
              <div className="space-y-3">
                {[
                  { label: 'Cheapest', value: lifeResult.comparisonSummary.cheapest, icon: Banknote, color: 'text-emerald-400' },
                  { label: 'Highest Cover', value: lifeResult.comparisonSummary.highestCover, icon: Shield, color: 'text-blue-400' },
                  { label: 'Best Return', value: lifeResult.comparisonSummary.bestReturn, icon: TrendingUp, color: 'text-purple-400' },
                  { label: 'Our Recommendation', value: lifeResult.comparisonSummary.recommendation, icon: Crown, color: 'text-amber-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <Icon size={14} className={`${color} flex-shrink-0`} />
                    <div className="flex-1">
                      <p className="text-muted-foreground text-[10px] uppercase font-bold">{label}</p>
                      <p className="text-foreground text-xs font-medium">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Full Comparison Table */}
            <div className="bg-card border border-border rounded-2xl p-4 mb-5 overflow-x-auto">
              <h3 className="text-foreground font-bold text-sm mb-3">Full Comparison</h3>
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-muted-foreground font-semibold py-2 pr-2">Type</th>
                    <th className="text-right text-muted-foreground font-semibold py-2 px-1">Premium/yr</th>
                    <th className="text-right text-muted-foreground font-semibold py-2 px-1">Maturity</th>
                    <th className="text-right text-muted-foreground font-semibold py-2 pl-1">XIRR</th>
                  </tr>
                </thead>
                <tbody>
                  {lifeResult.plans.map((plan) => (
                    <tr key={plan.type} className="border-b border-border/50">
                      <td className="text-foreground font-medium py-2 pr-2">{plan.typeName}</td>
                      <td className="text-right text-foreground py-2 px-1">{formatINR(plan.annualPremium)}</td>
                      <td className={`text-right py-2 px-1 ${plan.maturityBenefit > 0 ? 'text-brand-green' : 'text-red-400'}`}>
                        {plan.maturityBenefit > 0 ? formatCompact(plan.maturityBenefit) : 'Nil'}
                      </td>
                      <td className={`text-right py-2 pl-1 ${
                        plan.effectiveReturn > 6 ? 'text-brand-green' : plan.effectiveReturn > 0 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {plan.effectiveReturn === -100 ? 'N/A' : `${plan.effectiveReturn}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Action Buttons ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={handleDownloadPDF}
            className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-card border border-border text-muted-foreground text-[10px] font-medium"
          >
            <Download size={16} />
            Export PDF
          </button>
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-bold"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>

        {/* ─── Info Modal ───────────────────────────────────────────── */}
        <CalculatorInfoModal
          isOpen={showInfo}
          onClose={() => setShowInfo(false)}
          calculatorTitle="Insurance Calculator"
        />
      </div>

      <DisclaimerComponent module="insurance" />
    </div>
  );
}
