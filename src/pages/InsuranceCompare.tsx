import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Shield, Plus, Minus, X, Check, AlertTriangle,
  ChevronDown, ChevronUp, Star, Users, Baby, UserPlus,
  Heart, Building2, Activity, Zap, Info, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { AnalyticsService } from '../lib/analytics';
import {
  INSURERS, COVERAGE_FEATURES, INSURER_FEATURES,
  getCategories, getFeatureForInsurer, getRecommendations,
  type FamilyProfile, type Recommendation, type Insurer
} from '../data/insuranceData';

// ── Helpers ──────────────────────────────────────────────────

const childAgeLabel = (age: number): string => {
  if (age < 1) return 'Newborn (under 1 year)';
  if (age <= 4) return 'Toddler';
  if (age <= 12) return 'School age';
  if (age <= 17) return 'Teenager';
  return 'Young adult';
};

const IMPORTANCE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Critical' },
  important: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Important' },
  good_to_have: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Nice to Have' },
};

const COVERED_ICONS: Record<string, { icon: typeof Check; color: string; label: string }> = {
  yes: { icon: Check, color: 'text-emerald-400', label: 'Covered' },
  no: { icon: X, color: 'text-red-400', label: 'Not Covered' },
  partial: { icon: AlertTriangle, color: 'text-amber-400', label: 'Partial' },
  addon: { icon: Plus, color: 'text-blue-400', label: 'Add-on' },
};

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

const RANK_STYLES = [
  { bg: 'from-amber-500/20 to-yellow-600/10', border: 'border-amber-500/40', badge: 'bg-amber-500', text: 'text-amber-400' },
  { bg: 'from-slate-300/10 to-gray-400/5', border: 'border-slate-400/30', badge: 'bg-slate-400', text: 'text-slate-300' },
  { bg: 'from-orange-700/15 to-amber-800/5', border: 'border-orange-600/30', badge: 'bg-orange-600', text: 'text-orange-400' },
];

// ── Main Component ───────────────────────────────────────────

export default function InsuranceCompare() {
  useEffect(() => { AnalyticsService.trackScreen('Insurance_Compare'); }, []);
  const navigate = useNavigate();

  // ── Profile State ──
  const [selfAge, setSelfAge] = useState(30);
  const [hasSpouse, setHasSpouse] = useState(false);
  const [spouseAge, setSpouseAge] = useState(28);
  const [children, setChildren] = useState<number[]>([]);
  const [parents, setParents] = useState<number[]>([]);
  const [hasPreExisting, setHasPreExisting] = useState(false);
  const [cityType, setCityType] = useState<'metro' | 'tier2' | 'tier3'>('metro');
  const [sumInsured, setSumInsured] = useState(10);
  const [priorities, setPriorities] = useState<string[]>([]);

  // ── Insurer Selection ──
  const [selectedInsurers, setSelectedInsurers] = useState<string[]>(INSURERS.map(i => i.id));

  // ── UI State ──
  const [step, setStep] = useState<'profile' | 'results'>('profile');
  const [activeCategory, setActiveCategory] = useState('All');
  const [noteModal, setNoteModal] = useState<{ feature: string; insurer: string; note: string } | null>(null);
  const [expandedInsurer, setExpandedInsurer] = useState<string | null>(null);
  const [expandedRec, setExpandedRec] = useState<string | null>(null);

  const categories = useMemo(() => ['All', ...getCategories()], []);

  const filteredFeatures = useMemo(() =>
    activeCategory === 'All'
      ? COVERAGE_FEATURES
      : COVERAGE_FEATURES.filter(f => f.category === activeCategory),
    [activeCategory]
  );

  const profile: FamilyProfile = useMemo(() => ({
    selfAge, spouseAge: hasSpouse ? spouseAge : null,
    children, parents, hasPreExisting, cityType, sumInsured, priorities
  }), [selfAge, spouseAge, hasSpouse, children, parents, hasPreExisting, cityType, sumInsured, priorities]);

  const recommendations: Recommendation[] = useMemo(
    () => step === 'results' ? getRecommendations(profile, selectedInsurers) : [],
    [profile, selectedInsurers, step]
  );

  const togglePriority = useCallback((id: string) => {
    setPriorities(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }, []);

  const toggleInsurer = useCallback((id: string) => {
    setSelectedInsurers(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev; // minimum 2
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  }, []);

  const addChild = useCallback(() => {
    if (children.length < 4) setChildren(prev => [...prev, 5]);
  }, [children.length]);

  const removeChild = useCallback((idx: number) => {
    setChildren(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateChild = useCallback((idx: number, age: number) => {
    setChildren(prev => prev.map((a, i) => i === idx ? age : a));
  }, []);

  const addParent = useCallback(() => {
    if (parents.length < 4) setParents(prev => [...prev, 60]);
  }, [parents.length]);

  const removeParent = useCallback((idx: number) => {
    setParents(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateParent = useCallback((idx: number, age: number) => {
    setParents(prev => prev.map((a, i) => i === idx ? age : a));
  }, []);

  const elderlyParents = parents.filter(a => a >= 70);

  // ── CSR badge color ──
  const csrColor = (csr: number) => csr >= 97 ? 'text-emerald-400' : csr >= 93 ? 'text-amber-400' : 'text-red-400';

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
              <h1 className="text-lg font-bold text-foreground">Health Insurance</h1>
              <p className="text-muted-foreground text-xs">Compare top 8 plans</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-28 pt-4">
        <AnimatePresence mode="wait">
          {step === 'profile' ? (
            <motion.div key="profile" initial={{ opacity: 1 }} exit={{ opacity: 0, x: -50 }}>
              {/* ══════════ SECTION A: FAMILY PROFILE ══════════ */}
              <div className="mb-5">
                <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Users size={15} className="text-emerald-400" />
                  Your Family Profile
                </h2>

                {/* Self & Spouse */}
                <div className="p-4 rounded-2xl bg-card border border-border mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Self</span>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <label className="text-xs text-muted-foreground w-16">Your age</label>
                    <input
                      type="number" min={18} max={70} value={selfAge}
                      onChange={e => setSelfAge(Math.min(70, Math.max(18, Number(e.target.value))))}
                      className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm font-bold text-center"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/40">
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Spouse</span>
                    </div>
                    <button
                      onClick={() => setHasSpouse(!hasSpouse)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${hasSpouse ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-muted text-muted-foreground border border-border'}`}
                    >
                      {hasSpouse ? 'Added ✓' : '+ Add Spouse'}
                    </button>
                  </div>
                  {hasSpouse && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden mt-3">
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-muted-foreground w-16">Age</label>
                        <input
                          type="number" min={18} max={70} value={spouseAge}
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
                  {children.length === 0 && (
                    <p className="text-xs text-muted-foreground">No children added</p>
                  )}
                  <div className="space-y-2.5">
                    {children.map((age, idx) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        <span className="text-xs text-muted-foreground w-14">Child {idx + 1}</span>
                        <input
                          type="number" min={0} max={25} value={age}
                          onChange={e => updateChild(idx, Math.min(25, Math.max(0, Number(e.target.value))))}
                          className="w-16 px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground text-sm font-bold text-center"
                        />
                        <span className="text-[10px] text-muted-foreground flex-1">{childAgeLabel(age)}</span>
                        <button onClick={() => removeChild(idx)} className="p-1 rounded-lg bg-red-500/10 text-red-400">
                          <Minus size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {children.some(a => a > 25) && (
                    <p className="text-[10px] text-amber-400 mt-2">⚠ Children above 25 should be added as separate members, not in family floater.</p>
                  )}
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
                  {parents.length === 0 && (
                    <p className="text-xs text-muted-foreground">No parents added</p>
                  )}
                  <div className="space-y-2.5">
                    {parents.map((age, idx) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        <span className="text-xs text-muted-foreground w-14">Parent {idx + 1}</span>
                        <input
                          type="number" min={40} max={85} value={age}
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
                    ))}
                  </div>
                  {elderlyParents.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-amber-300 leading-relaxed">
                          Age 70+ significantly limits plan options and increases premium.
                          Consider a separate senior citizen plan for elderly parents.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Pre-existing toggle */}
                <div className="p-4 rounded-2xl bg-card border border-border mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">Pre-existing conditions in family</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Diabetes, BP, thyroid, heart, etc.</p>
                    </div>
                    <button
                      onClick={() => setHasPreExisting(!hasPreExisting)}
                      className={`w-12 h-7 rounded-full transition-all relative ${hasPreExisting ? 'bg-emerald-500' : 'bg-muted border border-border'}`}
                    >
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
                          : 'bg-muted text-muted-foreground border border-border'}`}
                      >
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
                          : 'bg-muted text-muted-foreground border border-border'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priorities */}
                <div className="p-4 rounded-2xl bg-card border border-border mb-5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">What matters most?</p>
                  <p className="text-[10px] text-muted-foreground mb-3">Select up to 3 priorities</p>
                  <div className="flex flex-wrap gap-2">
                    {PRIORITY_OPTIONS.map(opt => {
                      const isSelected = priorities.includes(opt.id);
                      return (
                        <button key={opt.id}
                          onClick={() => {
                            if (isSelected || priorities.length < 3) togglePriority(opt.id);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${isSelected
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-muted text-muted-foreground border border-border'}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ══════════ SECTION B: INSURER SELECTOR ══════════ */}
              <div className="mb-5">
                <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Building2 size={15} className="text-blue-400" />
                  Select Insurers to Compare
                </h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {INSURERS.map(ins => {
                    const isSelected = selectedInsurers.includes(ins.id);
                    return (
                      <button key={ins.id} onClick={() => toggleInsurer(ins.id)}
                        className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${isSelected
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : 'bg-muted text-muted-foreground/60 border border-border line-through'}`}
                      >
                        {isSelected && <Check size={10} />}
                        {ins.shortName}
                        <span className={`text-[9px] font-normal ${isSelected ? 'opacity-70' : 'opacity-40'}`}>
                          {ins.csr}%
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mb-4">
                  {selectedInsurers.length} of {INSURERS.length} selected • Min 2 required
                </p>
              </div>

              {/* Compare Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep('results')}
                disabled={selectedInsurers.length < 2}
                className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${selectedInsurers.length >= 2
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-card border border-border text-muted-foreground'}`}
              >
                <Shield size={18} />
                Compare {selectedInsurers.length} Plans
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="results" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}>
              {/* ══════════ SECTION C: SMART RECOMMENDATIONS ══════════ */}
              <div className="mb-6">
                <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Award size={15} className="text-amber-400" />
                  Best Match for Your Family
                </h2>

                <div className="space-y-3">
                  {recommendations.slice(0, 3).map((rec, idx) => {
                    const insurer = INSURERS.find(i => i.id === rec.insurerId)!;
                    const style = RANK_STYLES[idx] || RANK_STYLES[2];
                    const isExpanded = expandedRec === rec.insurerId;
                    return (
                      <motion.div key={rec.insurerId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`rounded-2xl bg-gradient-to-br ${style.bg} border ${style.border} overflow-hidden`}
                      >
                        <button className="w-full p-4 text-left" onClick={() => setExpandedRec(isExpanded ? null : rec.insurerId)}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${style.badge} flex items-center justify-center text-white font-bold text-sm`}>
                              #{rec.rank}
                            </div>
                            <div className="flex-1">
                              <p className="text-foreground font-bold text-sm">{insurer.name}</p>
                              <p className="text-muted-foreground text-[11px]">{insurer.planName}</p>
                            </div>
                            <div className="text-right mr-1">
                              <p className={`text-lg font-bold ${style.text}`}>{rec.score}</p>
                              <p className="text-[9px] text-muted-foreground">score</p>
                            </div>
                            {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                          </div>
                          {/* Score bar */}
                          <div className="mt-2.5 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <motion.div className={`h-full rounded-full ${style.badge}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${rec.score}%` }}
                              transition={{ delay: 0.3 + idx * 0.1, duration: 0.6 }}
                            />
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="px-4 pb-4 space-y-2">
                                {rec.matchReasons.map((r, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <Check size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-foreground/80">{r}</p>
                                  </div>
                                ))}
                                {rec.watchOuts.map((w, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <AlertTriangle size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-foreground/60">{w}</p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Expert tip */}
                <div className="mt-4 p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <div className="flex items-start gap-2.5">
                    <Info size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-blue-300 leading-relaxed">
                      <span className="font-bold">Insurance Tip:</span> For families with parents over 60,
                      consider buying a separate senior citizen plan for parents rather than including them in
                      family floater. It avoids premium loading and keeps the family floater affordable.
                    </p>
                  </div>
                </div>
              </div>

              {/* ══════════ SECTION E: INSURER STATS ══════════ */}
              <div className="mb-6">
                <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Activity size={15} className="text-blue-400" />
                  Insurer Snapshot
                </h2>
                <div className="overflow-x-auto -mx-4 px-4 pb-2">
                  <div className="flex gap-3" style={{ width: `${selectedInsurers.length * 180}px` }}>
                    {selectedInsurers.map((id) => {
                      const ins = INSURERS.find(i => i.id === id)!;
                      return (
                        <div key={id} className="w-[170px] flex-shrink-0 p-3.5 rounded-2xl bg-card border border-border">
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold">
                              {ins.shortName.slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{ins.shortName}</p>
                              <p className="text-[9px] text-muted-foreground truncate">{ins.planName}</p>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-[10px] text-muted-foreground">CSR</span>
                              <span className={`text-[10px] font-bold ${csrColor(ins.csr)}`}>{ins.csr}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[10px] text-muted-foreground">Network</span>
                              <span className="text-[10px] font-bold text-foreground">{(ins.networkHospitals / 1000).toFixed(0)}k+</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[10px] text-muted-foreground">Claims</span>
                              <span className="text-[10px] font-bold text-foreground">{ins.inHouseClaims ? 'In-house' : 'TPA'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-muted-foreground">Rating</span>
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} size={8} className={i < Math.round(ins.overallRating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <p className="text-[9px] text-emerald-400 mt-2 leading-tight">{ins.bestFor}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ══════════ SECTION D: COMPARISON TABLE ══════════ */}
              <div className="mb-6">
                <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Zap size={15} className="text-amber-400" />
                  Feature-by-Feature Comparison
                </h2>

                {/* Category filters */}
                <div className="overflow-x-auto -mx-4 px-4 mb-4">
                  <div className="flex gap-2 pb-1">
                    {categories.map(cat => (
                      <button key={cat} onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${activeCategory === cat
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-muted text-muted-foreground border border-border'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto -mx-4 px-4">
                  <div style={{ minWidth: `${selectedInsurers.length * 80 + 160}px` }}>
                    {/* Table header */}
                    <div className="flex items-end mb-2">
                      <div className="w-[150px] flex-shrink-0 pr-2">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Feature</span>
                      </div>
                      {selectedInsurers.map(id => {
                        const ins = INSURERS.find(i => i.id === id)!;
                        return (
                          <button key={id} onClick={() => setExpandedInsurer(expandedInsurer === id ? null : id)}
                            className="w-[75px] flex-shrink-0 text-center"
                          >
                            <p className="text-[9px] font-bold text-foreground truncate">{ins.shortName}</p>
                            <p className="text-[8px] text-muted-foreground">{ins.csr}%</p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Table body */}
                    <div className="space-y-1">
                      {filteredFeatures.map(feature => {
                        const imp = IMPORTANCE_COLORS[feature.importance];
                        return (
                          <div key={feature.id} className="flex items-center py-2 border-b border-border/20">
                            <div className="w-[150px] flex-shrink-0 pr-2">
                              <p className="text-[11px] text-foreground font-medium leading-tight">{feature.label}</p>
                              <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold ${imp.bg} ${imp.text}`}>
                                {imp.label}
                              </span>
                            </div>
                            {selectedInsurers.map(insurerId => {
                              const entry = getFeatureForInsurer(insurerId, feature.id);
                              const status = entry?.covered || 'no';
                              const info = COVERED_ICONS[status];
                              const Icon = info.icon;
                              return (
                                <button key={`${insurerId}-${feature.id}`}
                                  onClick={() => entry && setNoteModal({ feature: feature.label, insurer: INSURERS.find(i => i.id === insurerId)!.shortName, note: entry.note })}
                                  className="w-[75px] flex-shrink-0 flex items-center justify-center"
                                >
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${status === 'yes' ? 'bg-emerald-500/10' : status === 'no' ? 'bg-red-500/10' : status === 'partial' ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
                                    <Icon size={12} className={info.color} />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border/30">
                  {Object.entries(COVERED_ICONS).map(([key, info]) => (
                    <div key={key} className="flex items-center gap-1">
                      <info.icon size={10} className={info.color} />
                      <span className="text-[9px] text-muted-foreground">{info.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Back button */}
              <button
                onClick={() => setStep('profile')}
                className="w-full py-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm mb-4"
              >
                ← Edit Family Profile
              </button>

              {/* ══════════ DATA DISCLAIMER ══════════ */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 mb-4">
                <div className="flex items-start gap-2.5">
                  <Heart size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    <span className="font-bold text-amber-300">Data Source:</span> IRDAI Annual Report 2023-24
                    and verified insurer disclosures. Features and premiums change periodically.
                    Always verify current plan details directly with the insurer before making a decision.
                    FinCalix does not sell insurance — this is a free comparison tool for educational purposes.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Disclaimer */}
      <DisclaimerComponent module="insurance" />

      {/* ══════════ NOTE MODAL ══════════ */}
      <AnimatePresence>
        {noteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center p-4"
            onClick={() => setNoteModal(null)}
          >
            <motion.div
              initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="w-full max-w-md bg-card rounded-2xl border border-border p-5 mb-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">{noteModal.insurer}</h3>
                <button onClick={() => setNoteModal(null)} className="p-1 rounded-lg bg-muted">
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{noteModal.feature}</p>
              <p className="text-sm text-foreground leading-relaxed">{noteModal.note}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ INSURER STATS MODAL ══════════ */}
      <AnimatePresence>
        {expandedInsurer && (() => {
          const ins = INSURERS.find(i => i.id === expandedInsurer) as Insurer;
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center p-4"
              onClick={() => setExpandedInsurer(null)}
            >
              <motion.div
                initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                className="w-full max-w-md bg-card rounded-2xl border border-border p-5 mb-4"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-sm">
                      {ins.shortName.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{ins.name}</h3>
                      <p className="text-xs text-muted-foreground">{ins.planName}</p>
                    </div>
                  </div>
                  <button onClick={() => setExpandedInsurer(null)} className="p-1 rounded-lg bg-muted">
                    <X size={14} className="text-muted-foreground" />
                  </button>
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between py-2 border-b border-border/30">
                    <span className="text-xs text-muted-foreground">Claim Settlement</span>
                    <span className={`text-sm font-bold ${csrColor(ins.csr)}`}>{ins.csr}%</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/30">
                    <span className="text-xs text-muted-foreground">Network Hospitals</span>
                    <span className="text-sm font-bold text-foreground">{ins.networkHospitals.toLocaleString()}+</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/30">
                    <span className="text-xs text-muted-foreground">Claims Processing</span>
                    <span className="text-sm font-bold text-foreground">{ins.inHouseClaims ? 'In-house' : 'TPA (Third Party)'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/30">
                    <span className="text-xs text-muted-foreground">Insurer Type</span>
                    <span className="text-sm font-bold text-foreground capitalize">{ins.type}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/30">
                    <span className="text-xs text-muted-foreground">Rating</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12} className={i < Math.round(ins.overallRating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'} />
                      ))}
                      <span className="text-xs text-foreground font-bold ml-1">{ins.overallRating}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-emerald-400 font-bold mt-3">{ins.bestFor}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{ins.website}</p>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
