import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CreditCard, ChevronDown, ChevronUp, TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { useHistoryTracker } from '../hooks/useHistoryTracker';
import { formatINR } from '../utils/calculations';
import { calcCardTypeResults, type SpendProfile, type CardTypeResult } from '../utils/creditCardCalculations';
import { useCibil } from '../context/CibilContext';
import CibilAdvisoryCard from '../components/CibilAdvisoryCard';
import CibilBadge from '../components/CibilBadge';
import DisclaimerComponent from '../components/DisclaimerComponent';
import NumberInput from '../components/NumberInput';

// ─── Accordion ────────────────────────────────────────────────────────────────
function Accordion({ title, children, defaultOpen, color }: { title: string; children: React.ReactNode; defaultOpen?: boolean; color: string }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const c = useAppColors();
  return (
    <div className="rounded-xl border overflow-hidden mb-2" style={{ borderColor: c.border }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left" style={{ background: c.card }}>
        <span className="text-xs font-bold" style={{ color }}>{title}</span>
        {open ? <ChevronUp size={14} style={{ color: c.textMuted }} /> : <ChevronDown size={14} style={{ color: c.textMuted }} />}
      </button>
      <AnimatePresence>{open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="px-4 pb-3 text-xs leading-relaxed" style={{ color: c.textSecondary }}>{children}</div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

// ─── Score Dial ───────────────────────────────────────────────────────────────
function ScoreDial({ score, label, color }: { score: number; label: string; color: string }) {
  const c = useAppColors();
  const pct = Math.min(100, Math.max(0, score));
  const r = 40, circ = 2 * Math.PI * r, offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={96} height={96} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" stroke={c.border} strokeWidth={8} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x={50} y={46} textAnchor="middle" fontSize={22} fontWeight={800} fill={color}>{score}</text>
        <text x={50} y={60} textAnchor="middle" fontSize={8} fontWeight={600} fill={c.textMuted}>/100</text>
      </svg>
      <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── SPEND CATEGORIES ─────────────────────────────────────────────────────────
const SPEND_CATS: { key: keyof SpendProfile; labelKey: string; emoji: string }[] = [
  { key: 'groceries', labelKey: 'ccCompare.groceries', emoji: '🛒' },
  { key: 'fuel', labelKey: 'ccCompare.fuel', emoji: '⛽' },
  { key: 'dining', labelKey: 'ccCompare.dining', emoji: '🍽️' },
  { key: 'onlineShopping', labelKey: 'ccCompare.onlineShopping', emoji: '📦' },
  { key: 'travel', labelKey: 'ccCompare.travel', emoji: '✈️' },
  { key: 'utilities', labelKey: 'ccCompare.utilities', emoji: '💡' },
  { key: 'rent', labelKey: 'ccCompare.rent', emoji: '🏠' },
  { key: 'entertainment', labelKey: 'ccCompare.entertainment', emoji: '🎬' },
  { key: 'medical', labelKey: 'ccCompare.medical', emoji: '🏥' },
  { key: 'other', labelKey: 'ccCompare.other', emoji: '📋' },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function CreditCardCompare() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const c = useAppColors();
  useTrackCalculator();
  const { profile: cibilProfile } = useCibil();
  const cibilScore = cibilProfile?.isNTC ? 0 : (cibilProfile?.score ?? 750);

  // ── Step ──
  const [step, setStep] = useState<'profile' | 'results'>('profile');

  // ── Profile inputs ──
  const [monthlyIncome, setMonthlyIncome] = useState(50000);
  const [spend, setSpend] = useState<SpendProfile>({
    groceries: 5000, fuel: 3000, dining: 3000, onlineShopping: 5000,
    travel: 2000, utilities: 3000, rent: 0, entertainment: 1000,
    medical: 1000, other: 2000,
  });
  const [domesticFlights, setDomesticFlights] = useState(2);
  const [paysFull, setPaysFull] = useState(true);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [apr, setApr] = useState(42);

  const updateSpend = (key: keyof SpendProfile, val: number) => setSpend(prev => ({ ...prev, [key]: val }));
  const totalMonthly = Object.values(spend).reduce((s, v) => s + v, 0);

  // ── Results ──
  const results = useMemo<CardTypeResult[]>(() => {
    return calcCardTypeResults(spend, monthlyIncome, cibilScore, domesticFlights, paysFull, outstandingBalance, apr);
  }, [spend, monthlyIncome, cibilScore, domesticFlights, paysFull, outstandingBalance, apr]);

  const topResult = results[0];
  useHistoryTracker('Credit Card Compare', { monthlyIncome, totalMonthly, domesticFlights }, { bestType: topResult?.type.id || '', score: topResult?.suitabilityScore || 0 }, topResult?.netAnnualValue || 0);

  // ── Smart insights ──
  const insights = useMemo(() => {
    const out: { text: string; tone: 'warning' | 'success' | 'info' }[] = [];
    if (!paysFull && outstandingBalance > 0) {
      const intCost = Math.round(outstandingBalance * (apr / 100) * 1.18);
      out.push({ text: t('ccCompare.insightInterest', { cost: formatINR(intCost), defaultValue: 'Carrying balance costs you {{cost}}/year in interest + GST — this erases ALL reward benefits' }), tone: 'warning' });
    }
    if (spend.rent > 0) out.push({ text: t('ccCompare.insightRent', { amount: formatINR(spend.rent), defaultValue: 'Rent ({{amount}}/mo) is excluded from rewards on most cards' }), tone: 'info' });
    if (spend.fuel >= 5000) out.push({ text: t('ccCompare.insightFuel', { defaultValue: 'High fuel spend — a fuel card saves via 1% surcharge waiver (capped ₹250/cycle)' }), tone: 'info' });
    if (domesticFlights >= 6) out.push({ text: t('ccCompare.insightTravel', { defaultValue: 'Frequent flyer — lounge access alone is worth ₹3,000+/year on a travel card' }), tone: 'success' });
    const top = results[0];
    if (top && top.netAnnualValue > 0) out.push({ text: t('ccCompare.insightBest', { type: t(top.type.labelKey), value: formatINR(top.netAnnualValue), defaultValue: 'A {{type}} gives you net ₹{{value}}/year after fees' }), tone: 'success' });
    return out;
  }, [results, spend, paysFull, outstandingBalance, apr, domesticFlights, t]);

  // ── CHECKLIST ──
  const CHECKLIST = [
    { titleKey: 'ccCompare.checkFee', descKey: 'ccCompare.checkFeeDesc' },
    { titleKey: 'ccCompare.checkExclusions', descKey: 'ccCompare.checkExclusionsDesc' },
    { titleKey: 'ccCompare.checkRewardValue', descKey: 'ccCompare.checkRewardValueDesc' },
    { titleKey: 'ccCompare.checkFuelWaiver', descKey: 'ccCompare.checkFuelWaiverDesc' },
    { titleKey: 'ccCompare.checkLounge', descKey: 'ccCompare.checkLoungeDesc' },
    { titleKey: 'ccCompare.checkMITC', descKey: 'ccCompare.checkMITCDesc' },
    { titleKey: 'ccCompare.checkInterestFree', descKey: 'ccCompare.checkInterestFreeDesc' },
    { titleKey: 'ccCompare.checkMilestone', descKey: 'ccCompare.checkMilestoneDesc' },
    { titleKey: 'ccCompare.checkForex', descKey: 'ccCompare.checkForexDesc' },
    { titleKey: 'ccCompare.checkNetwork', descKey: 'ccCompare.checkNetworkDesc' },
  ];

  const RBI_RIGHTS = [
    { titleKey: 'ccCompare.rbiNoUnsolicited', descKey: 'ccCompare.rbiNoUnsolicitedDesc' },
    { titleKey: 'ccCompare.rbiKeyFact', descKey: 'ccCompare.rbiKeyFactDesc' },
    { titleKey: 'ccCompare.rbiBillingDate', descKey: 'ccCompare.rbiBillingDateDesc' },
    { titleKey: 'ccCompare.rbiClosure', descKey: 'ccCompare.rbiClosureDesc' },
    { titleKey: 'ccCompare.rbiGracePeriod', descKey: 'ccCompare.rbiGracePeriodDesc' },
    { titleKey: 'ccCompare.rbiOmbudsman', descKey: 'ccCompare.rbiOmbudsmanDesc' },
  ];

  const sectionStyle: React.CSSProperties = { background: c.card, borderRadius: 16, padding: 16, border: `1px solid ${c.border}`, marginBottom: 14 };

  // ── RENDER ──
  return (
    <div className="min-h-screen pb-safe-nav" style={{ background: c.bg, color: c.text }}>
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3 backdrop-blur-md shadow-sm border-b" style={{ background: `${c.card}E6`, borderColor: c.border, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
        <button onClick={() => step === 'results' ? setStep('profile') : navigate(-1)} className="p-2 -ml-2 rounded-full" style={{ color: c.textSecondary }}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{t('ccCompare.title', 'Credit Card Compare')}</h1>
          <p className="text-xs" style={{ color: c.textSecondary }}>{t('ccCompare.subtitle', 'Find the right card type for your spending')}</p>
        </div>
        <CreditCard size={22} style={{ color: '#8B5CF6' }} />
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 pb-24">
        <AnimatePresence mode="wait">
          {step === 'profile' ? (
            <motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

              {/* Income */}
              <div style={sectionStyle}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: c.textSecondary }}>
                  {t('ccCompare.income', 'Monthly Income')}
                </h3>
                <NumberInput label={t('ccCompare.monthlyIncome', 'Net Monthly Income')} value={monthlyIncome}
                  onChange={setMonthlyIncome} min={0} max={5000000} prefix="₹" step={5000} />
              </div>

              {/* Spending */}
              <div style={sectionStyle}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>
                    {t('ccCompare.spendPattern', 'Monthly Spending Pattern')}
                  </h3>
                  <span className="text-xs font-bold" style={{ color: '#3b82f6' }}>{formatINR(totalMonthly)}/mo</span>
                </div>
                <div className="space-y-2">
                  {SPEND_CATS.map(cat => (
                    <NumberInput key={cat.key}
                      label={`${cat.emoji} ${t(cat.labelKey, cat.key)}`}
                      value={spend[cat.key]} onChange={v => updateSpend(cat.key, v)}
                      min={0} max={1000000} prefix="₹" step={500} />
                  ))}
                </div>
              </div>

              {/* Travel */}
              <div style={sectionStyle}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: c.textSecondary }}>
                  {t('ccCompare.travelProfile', 'Travel Profile')}
                </h3>
                <NumberInput label={t('ccCompare.domesticFlights', 'Domestic Flights / Year')} value={domesticFlights}
                  onChange={setDomesticFlights} min={0} max={50} step={1} />
              </div>

              {/* Payment behavior */}
              <div style={sectionStyle}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: c.textSecondary }}>
                  {t('ccCompare.paymentBehavior', 'Payment Behavior')}
                </h3>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setPaysFull(true)} className="flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all"
                    style={paysFull ? { background: '#22c55e', color: '#fff', borderColor: '#22c55e' } : { background: c.inputBg, color: c.textSecondary, borderColor: c.border }}>
                    {t('ccCompare.payFull', 'Always Pay Full')}
                  </button>
                  <button onClick={() => setPaysFull(false)} className="flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all"
                    style={!paysFull ? { background: '#ef4444', color: '#fff', borderColor: '#ef4444' } : { background: c.inputBg, color: c.textSecondary, borderColor: c.border }}>
                    {t('ccCompare.carryBalance', 'Carry Balance')}
                  </button>
                </div>
                {!paysFull && (
                  <div className="space-y-2">
                    <NumberInput label={t('ccCompare.outstanding', 'Avg Outstanding Balance')} value={outstandingBalance}
                      onChange={setOutstandingBalance} min={0} max={5000000} prefix="₹" step={5000} />
                    <NumberInput label={t('ccCompare.aprRate', 'APR %')} value={apr}
                      onChange={setApr} min={12} max={52} suffix="%" step={1} />
                  </div>
                )}
              </div>

              {/* Analyze Button */}
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setStep('results')}
                className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg mb-4"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}>
                <Sparkles size={18} /> {t('ccCompare.analyze', 'Analyze My Spending')}
              </motion.button>

            </motion.div>
          ) : (
            <motion.div key="results" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>

              {/* Top 3 Matches */}
              <div style={sectionStyle}>
                <h3 className="text-sm font-bold mb-4" style={{ color: c.text }}>
                  {t('ccCompare.bestMatch', 'Best Card Types for You')}
                </h3>
                <div className="flex gap-3 justify-center mb-4">
                  {results.slice(0, 3).map((r, i) => (
                    <ScoreDial key={r.type.id} score={r.suitabilityScore}
                      label={`${r.type.emoji} ${t(r.type.labelKey, r.type.id)}`}
                      color={i === 0 ? '#22c55e' : i === 1 ? '#3b82f6' : '#f59e0b'} />
                  ))}
                </div>
                {topResult && (
                  <div className="p-3 rounded-xl text-xs leading-relaxed" style={{ background: '#22c55e15', color: '#22c55e', border: '1px solid #22c55e30' }}>
                    <CheckCircle2 size={14} className="inline mr-1" />
                    {t('ccCompare.verdict', { type: t(topResult.type.labelKey), defaultValue: 'A {{type}} card is the best match for your spending pattern' })}
                  </div>
                )}
              </div>

              {/* Comparison Table */}
              <div style={sectionStyle}>
                <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>
                  {t('ccCompare.costBenefit', 'Cost-Benefit Analysis')}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[9px] min-w-[400px]">
                    <thead>
                      <tr style={{ color: c.textMuted, borderBottom: `1px solid ${c.border}` }}>
                        <th className="py-1.5 text-left font-bold">{t('ccCompare.cardType', 'Card Type')}</th>
                        <th className="py-1.5 text-right font-bold">{t('ccCompare.rewardVal', 'Rewards')}</th>
                        <th className="py-1.5 text-right font-bold">{t('ccCompare.fee', 'Fee')}</th>
                        <th className="py-1.5 text-right font-bold text-emerald-500">{t('ccCompare.netValue', 'Net Value')}</th>
                        <th className="py-1.5 text-right font-bold">{t('ccCompare.score', 'Score')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={r.type.id} className={i === 0 ? 'bg-emerald-500/10' : ''} style={{ borderBottom: `1px solid ${c.border}40` }}>
                          <td className="py-1.5 font-medium">{r.type.emoji} {t(r.type.labelKey)}</td>
                          <td className="py-1.5 text-right">{formatINR(r.annualRewardValue)}</td>
                          <td className="py-1.5 text-right">{r.annualFee > 0 ? formatINR(r.annualFee) : t('ccCompare.free', 'Free')}</td>
                          <td className="py-1.5 text-right font-bold" style={{ color: r.netAnnualValue >= 0 ? '#22c55e' : '#ef4444' }}>
                            {r.netAnnualValue >= 0 ? '+' : ''}{formatINR(r.netAnnualValue)}
                          </td>
                          <td className="py-1.5 text-right font-bold" style={{ color: i === 0 ? '#22c55e' : c.text }}>{r.suitabilityScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[9px] italic" style={{ color: c.textMuted }}>
                  {t('ccCompare.tableNote', 'Based on typical market rates. Actual rewards vary by issuer.')}
                </p>
              </div>

              {/* Spending Breakdown */}
              <div style={sectionStyle}>
                <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>
                  {t('ccCompare.spendBreakdown', 'Your Spending Breakdown')}
                </h3>
                {SPEND_CATS.filter(c => spend[c.key] > 0).map(cat => {
                  const pct = totalMonthly > 0 ? (spend[cat.key] / totalMonthly) * 100 : 0;
                  const excluded = ['rent', 'utilities'].includes(cat.key);
                  return (
                    <div key={cat.key} className="mb-2">
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span style={{ color: excluded ? '#ef4444' : c.text }}>{cat.emoji} {t(cat.labelKey)} {excluded ? `(${t('ccCompare.noRewards', 'no rewards')})` : ''}</span>
                        <span className="font-bold" style={{ color: c.text }}>{formatINR(spend[cat.key])} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: c.inputBg }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: excluded ? '#ef4444' : '#3b82f6' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Explainable Scoring — WHY this card scored X ── */}
              {topResult && (
                <div style={sectionStyle}>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}>
                    <Sparkles size={16} color="#8B5CF6" /> {t('ccCompare.whyThisScore', 'Why This Score?')}
                  </h3>
                  <div className="p-3 rounded-xl mb-3" style={{ background: '#22c55e10', border: '1px solid #22c55e30' }}>
                    <p className="text-xs font-bold mb-2" style={{ color: '#22c55e' }}>{topResult.type.emoji} {t(topResult.type.labelKey)} — Score {topResult.suitabilityScore}/100</p>
                    {[
                      { label: t('ccCompare.factorIncome', 'Income Match'), weight: '15%', score: monthlyIncome >= 50000 ? t('ccCompare.scoreHigh', 'High') : monthlyIncome >= 25000 ? t('ccCompare.scoreMedium', 'Medium') : t('ccCompare.scoreLow', 'Low'), color: monthlyIncome >= 50000 ? '#22c55e' : '#f59e0b' },
                      { label: t('ccCompare.factorSpend', 'Spending Alignment'), weight: '35%', score: topResult.suitabilityScore >= 70 ? t('ccCompare.scoreStrong', 'Strong') : t('ccCompare.scorePartial', 'Partial'), color: topResult.suitabilityScore >= 70 ? '#22c55e' : '#3b82f6' },
                      { label: t('ccCompare.factorCost', 'Cost Efficiency'), weight: '25%', score: topResult.netAnnualValue >= 0 ? t('ccCompare.scorePositiveROI', 'Positive ROI') : t('ccCompare.scoreNegativeROI', 'Negative ROI'), color: topResult.netAnnualValue >= 0 ? '#22c55e' : '#ef4444' },
                      { label: t('ccCompare.factorCredit', 'Credit Profile'), weight: '10%', score: cibilScore >= 750 ? t('ccCompare.scoreExcellent', 'Excellent') : cibilScore >= 650 ? t('ccCompare.scoreGood', 'Good') : t('ccCompare.scoreFair', 'Fair'), color: cibilScore >= 750 ? '#22c55e' : '#f59e0b' },
                      { label: t('ccCompare.factorTravel', 'Travel Fit'), weight: '15%', score: domesticFlights >= 4 ? t('ccCompare.scoreFrequent', 'Frequent') : domesticFlights >= 1 ? t('ccCompare.scoreOccasional', 'Occasional') : t('ccCompare.scoreNone', 'None'), color: domesticFlights >= 4 ? '#22c55e' : '#6b7280' },
                    ].map((factor, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: `${c.border}40` }}>
                        <span className="text-[10px]" style={{ color: c.textSecondary }}>{factor.label} ({factor.weight})</span>
                        <span className="text-[10px] font-bold" style={{ color: factor.color }}>{factor.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Category Tips ── */}
              {topResult && (
                <div style={sectionStyle}>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}>
                    <CreditCard size={16} color="#6366F1" /> {t('ccCompare.categoryTipsTitle', 'Tips for Your Best Card Type')}
                  </h3>
                  {(() => {
                    const categoryTips: Record<string, { title: string; tips: string[] }> = {
                      cashback: {
                        title: t('ccCompare.tipCashback', 'What to Look For in Cashback Cards'),
                        tips: [
                          t('ccCompare.tipCb1', 'Look for 1-5% cashback on online & grocery spending'),
                          t('ccCompare.tipCb2', 'Check if cashback is auto-credited or needs redemption'),
                          t('ccCompare.tipCb3', 'Compare monthly cashback caps across cards'),
                        ],
                      },
                      rewards: {
                        title: t('ccCompare.tipRewards', 'What to Look For in Rewards Cards'),
                        tips: [
                          t('ccCompare.tipRw1', 'Higher reward rate per ₹100-₹150 spent = better value'),
                          t('ccCompare.tipRw2', 'Check point expiry rules — some expire in 2-3 years'),
                          t('ccCompare.tipRw3', 'Milestone bonuses can significantly boost annual value'),
                        ],
                      },
                      travel: {
                        title: t('ccCompare.tipTravel', 'What to Look For in Travel Cards'),
                        tips: [
                          t('ccCompare.tipTr1', 'Lounge access (domestic + international) is the biggest perk'),
                          t('ccCompare.tipTr2', 'Look for complimentary travel insurance coverage'),
                          t('ccCompare.tipTr3', 'Low forex markup (1.5-2%) saves money on international spends'),
                        ],
                      },
                      fuel: {
                        title: t('ccCompare.tipFuel', 'What to Look For in Fuel Cards'),
                        tips: [
                          t('ccCompare.tipFl1', 'Fuel surcharge waiver (1% saved on every fill) is essential'),
                          t('ccCompare.tipFl2', 'Check if surcharge waiver has monthly/annual cap'),
                          t('ccCompare.tipFl3', 'Some cards offer extra cashback at specific fuel stations'),
                        ],
                      },
                    };
                    const tips = categoryTips[topResult.type.id] || categoryTips.cashback;
                    return (
                      <div>
                        <p className="text-xs font-bold mb-2" style={{ color: c.text }}>{tips.title}</p>
                        {tips.tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 mb-1.5">
                            <span className="text-emerald-500 flex-shrink-0 mt-0.5">✓</span>
                            <p className="text-[11px]" style={{ color: c.textSecondary }}>{tip}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── Loss Detection: Missed Rewards + Interest Leakage ── */}
              <div style={sectionStyle}>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}>
                  <AlertTriangle size={16} color="#ef4444" /> {t('ccCompare.lossDetection', 'Loss Detection')}
                </h3>
                {/* Missed Rewards */}
                {(() => {
                  const excludedSpend = (spend.rent || 0) + (spend.utilities || 0);
                  const rewardableSpend = totalMonthly - excludedSpend;
                  const missedAnnual = Math.round(rewardableSpend * 12 * 0.01); // 1% average reward
                  const interestLoss = !paysFull && outstandingBalance > 0 ? Math.round(outstandingBalance * (apr / 100) * 1.18) : 0;
                  return (
                    <div className="space-y-2">
                      {excludedSpend > 0 && (
                        <div className="p-3 rounded-xl text-xs" style={{ background: '#ef44440d', border: '1px solid #ef444420' }}>
                          <p className="font-bold text-red-500 mb-0.5">💸 {t('ccCompare.lossExcluded', { amount: formatINR(excludedSpend), defaultValue: '{{amount}}/mo excluded from rewards' })}</p>
                          <p style={{ color: c.textMuted }}>{t('ccCompare.lossExcludedDesc', { monthly: formatINR(excludedSpend), annual: formatINR(excludedSpend * 12), defaultValue: 'Rent & utilities ({{monthly}}/mo) earn zero rewards on most cards. That\'s {{annual}}/yr invisible to reward programs.' })}</p>
                        </div>
                      )}
                      {missedAnnual > 0 && (
                        <div className="p-3 rounded-xl text-xs" style={{ background: '#f59e0b0d', border: '1px solid #f59e0b20' }}>
                          <p className="font-bold text-amber-500 mb-0.5">🎯 {t('ccCompare.lossPotentialRewards', { amount: formatINR(missedAnnual), defaultValue: 'Potential rewards: ~{{amount}}/year' })}</p>
                          <p style={{ color: c.textMuted }}>{t('ccCompare.lossPotentialRewardsDesc', { spend: formatINR(rewardableSpend), defaultValue: 'On {{spend}}/mo eligible spend at ~1% average reward rate. The right card could earn even more.' })}</p>
                        </div>
                      )}
                      {interestLoss > 0 && (
                        <div className="p-3 rounded-xl text-xs" style={{ background: '#ef44440d', border: '1px solid #ef444420' }}>
                          <p className="font-bold text-red-500 mb-0.5">🔥 {t('ccCompare.lossInterest', { amount: formatINR(interestLoss), defaultValue: 'Interest leakage: {{amount}}/year' })}</p>
                          <p style={{ color: c.textMuted }}>{t('ccCompare.lossInterestDesc', { balance: formatINR(outstandingBalance), apr: apr, defaultValue: 'Carrying {{balance}} at {{apr}}% APR + 18% GST. This completely erases any reward benefits. Pay in full to stop the leak.' })}</p>
                        </div>
                      )}
                      {interestLoss === 0 && paysFull && (
                        <div className="p-3 rounded-xl text-xs" style={{ background: '#22c55e0d', border: '1px solid #22c55e20' }}>
                          <p className="font-bold text-green-500">✅ {t('ccCompare.lossNone', 'No interest leakage — you pay in full!')}</p>
                          <p style={{ color: c.textMuted }}>{t('ccCompare.lossNoneDesc', 'Great habit! Your rewards are pure profit.')}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Smart Insights */}
              {insights.length > 0 && (
                <div style={sectionStyle}>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}>
                    <TrendingUp size={16} color="#3b82f6" /> {t('ccCompare.insights', 'Smart Insights')}
                  </h3>
                  {insights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2 p-2.5 rounded-lg text-xs" style={{
                      background: ins.tone === 'warning' ? '#ef44441a' : ins.tone === 'success' ? '#22c55e1a' : '#3b82f61a',
                      color: ins.tone === 'warning' ? '#ef4444' : ins.tone === 'success' ? '#22c55e' : '#3b82f6',
                    }}>
                      {ins.tone === 'warning' ? <AlertTriangle size={14} /> : ins.tone === 'success' ? <CheckCircle2 size={14} /> : <TrendingUp size={14} />}
                      <span className="leading-relaxed">{ins.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Checklist */}
              <div className="mb-4">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 px-1" style={{ color: c.text }}>
                  <CheckCircle2 size={16} color="#22c55e" /> {t('ccCompare.checklist', 'Checklist Before Choosing')}
                </h3>
                {CHECKLIST.map((item, i) => (
                  <Accordion key={i} title={`${i + 1}. ${t(item.titleKey, item.titleKey)}`} color="#22c55e">
                    {t(item.descKey, item.descKey)}
                  </Accordion>
                ))}
              </div>

              {/* RBI Rights */}
              <div className="mb-4">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 px-1" style={{ color: c.text }}>
                  <ShieldCheck size={16} color="#3b82f6" /> {t('ccCompare.rbiRights', 'Your RBI Rights')}
                </h3>
                {RBI_RIGHTS.map((item, i) => (
                  <Accordion key={i} title={t(item.titleKey, item.titleKey)} color="#3b82f6">
                    {t(item.descKey, item.descKey)}
                  </Accordion>
                ))}
              </div>

              {/* ── CIBIL Score Analysis ── */}
              <div className="mb-3">
                <CibilBadge loanType="credit_card" />
              </div>
              <CibilAdvisoryCard
                score={cibilScore}
                loanType="credit_card"
                loanAmount={outstandingBalance || totalMonthly}
                tenureMonths={12}
              />

              {/* Back to edit */}
              <button onClick={() => setStep('profile')}
                className="w-full py-3 rounded-xl text-xs font-bold border mb-4" style={{ borderColor: c.border, color: c.textSecondary, background: c.card }}>
                {t('ccCompare.editProfile', '← Edit Spending Profile')}
              </button>

              <DisclaimerComponent module="creditCard" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
