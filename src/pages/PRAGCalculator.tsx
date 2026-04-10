import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Download, PieChart, TrendingUp, Shield, Target,
  BarChart3, Info, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppColors } from '../theme/useAppColors';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { exportToPDF, exportToExcel, type ExportConfig, dateTag } from '../utils/exportReport';
import { useHistoryTracker } from '../hooks/useHistoryTracker';
import { formatINR } from '../utils/calculations';
import { calculatePRAG, type PRAGInputs } from '../utils/pragCalculations';
import {
  ASSET_CLASSES,
  suggestAllocation,
  type AssetKey,
  type RiskAppetite,
  type InvestmentGoal,
} from '../constants/assetAllocation';

const fmtINR = (v: number) => formatINR(Math.round(v));

const RISK_OPTIONS: { value: RiskAppetite; labelKey: string; fallback: string; icon: React.ReactNode }[] = [
  { value: 'conservative', labelKey: 'prag.conservative', fallback: 'Conservative', icon: <Shield size={14} /> },
  { value: 'moderate', labelKey: 'prag.moderate', fallback: 'Moderate', icon: <Target size={14} /> },
  { value: 'aggressive', labelKey: 'prag.aggressive', fallback: 'Aggressive', icon: <TrendingUp size={14} /> },
];

const GOAL_OPTIONS: { value: InvestmentGoal; labelKey: string; fallback: string }[] = [
  { value: 'wealth', labelKey: 'prag.goalWealth', fallback: 'Wealth Creation' },
  { value: 'retirement', labelKey: 'prag.goalRetirement', fallback: 'Retirement' },
  { value: 'childEducation', labelKey: 'prag.goalChildEdu', fallback: 'Child Education' },
  { value: 'homePurchase', labelKey: 'prag.goalHome', fallback: 'Home Purchase' },
  { value: 'emergency', labelKey: 'prag.goalEmergency', fallback: 'Emergency Fund' },
];

const REBALANCE_MODES: { value: 'full' | 'newInvestment' | 'partial'; labelKey: string; fallback: string }[] = [
  { value: 'full', labelKey: 'prag.modeFull', fallback: 'Full Rebalance' },
  { value: 'newInvestment', labelKey: 'prag.modeNewInvestment', fallback: 'New Investment' },
  { value: 'partial', labelKey: 'prag.modePartial', fallback: 'Partial' },
];

const cardAnim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

export default function PRAGCalculator() {
  const { t } = useTranslation();
  const c = useAppColors();
  const navigate = useNavigate();

  // ---- Profile ----
  const [age, setAge] = useState(35);
  const [risk, setRisk] = useState<RiskAppetite>('moderate');
  const [goal, setGoal] = useState<InvestmentGoal>('retirement');
  const [horizon, setHorizon] = useState(10);

  // ---- Holdings (6 asset classes) ----
  const [holdings, setHoldings] = useState<Record<AssetKey, number>>({
    equity: 0, debt: 0, gold: 0, realEstate: 0, international: 0, cash: 0,
  });

  // ---- Target allocation ----
  const [targetAllocation, setTargetAllocation] = useState<Record<AssetKey, number>>({
    equity: 40, debt: 25, gold: 10, realEstate: 0, international: 10, cash: 15,
  });

  // ---- Rebalancing ----
  const [rebalanceMode, setRebalanceMode] = useState<'full' | 'newInvestment' | 'partial'>('full');
  const [newMonthlyInvestment, setNewMonthlyInvestment] = useState(25000);

  // ---- UI toggles ----
  const [showProjections, setShowProjections] = useState(false);

  // ---- Helpers ----
  const totalPortfolio = useMemo(
    () => Object.values(holdings).reduce((s, v) => s + v, 0),
    [holdings],
  );

  const targetSum = useMemo(
    () => Object.values(targetAllocation).reduce((s, v) => s + v, 0),
    [targetAllocation],
  );

  const setHolding = (key: AssetKey, val: number) => {
    setHoldings(prev => ({ ...prev, [key]: val }));
  };

  const setTarget = (key: AssetKey, val: number) => {
    setTargetAllocation(prev => ({ ...prev, [key]: val }));
  };

  // ---- Auto-suggest ----
  const handleAutoSuggest = () => {
    const suggested = suggestAllocation(age, risk, goal, horizon, totalPortfolio);
    setTargetAllocation(suggested);
  };

  // ---- Calculation ----
  const result = useMemo(() => calculatePRAG({
    holdings,
    targetAllocation,
    rebalanceMode,
    newMonthlyInvestment: rebalanceMode === 'newInvestment' ? newMonthlyInvestment : undefined,
    projectionYears: 10,
  }), [holdings, targetAllocation, rebalanceMode, newMonthlyInvestment]);

  // ---- History tracking ----
  useHistoryTracker(
    'Asset Rebalancer',
    { totalPortfolio, risk, goal, horizon },
    { healthScore: result.portfolioHealthScore },
    totalPortfolio,
  );

  // ---- Health score color ----
  const healthColor = result.portfolioHealthScore >= 80
    ? '#22c55e'
    : result.portfolioHealthScore >= 60
      ? '#3b82f6'
      : result.portfolioHealthScore >= 40
        ? '#eab308'
        : '#ef4444';

  // ---- Export PDF ----
  const handleExportPDF = async () => {
    const config: ExportConfig = {
      title: t('prag.reportTitle', 'Portfolio Rebalancing & Allocation Guide'),
      inputs: [
        { label: t('prag.totalPortfolio', 'Total Portfolio'), value: fmtINR(totalPortfolio) },
        { label: t('prag.riskAppetite', 'Risk Appetite'), value: risk },
        { label: t('prag.investmentGoal', 'Investment Goal'), value: goal },
        { label: t('prag.investmentHorizon', 'Horizon'), value: `${horizon} ${t('prag.years', 'years')}` },
        { label: t('prag.rebalanceMode', 'Rebalance Mode'), value: rebalanceMode },
      ],
      results: [
        { label: t('prag.healthScore', 'Health Score'), value: `${result.portfolioHealthScore}/100 (${result.healthGrade})` },
        { label: t('prag.currentReturn', 'Current Expected Return'), value: `${result.currentExpectedReturn}%` },
        { label: t('prag.targetReturn', 'Target Expected Return'), value: `${result.targetExpectedReturn}%` },
        { label: t('prag.currentVolatility', 'Current Volatility'), value: `${result.currentVolatility}%` },
        { label: t('prag.targetVolatility', 'Target Volatility'), value: `${result.targetVolatility}%` },
      ],
      chart: {
        type: 'pie',
        segments: ASSET_CLASSES.filter(a => targetAllocation[a.key] > 0).map(a => ({
          label: a.fallbackLabel,
          value: targetAllocation[a.key],
          color: a.color,
        })),
      },
      projectionTitle: t('prag.projectionTitle', '10-Year Growth Projection'),
      projectionColumns: [
        t('prag.year', 'Year'),
        t('prag.currentGrowth', 'Current Path'),
        t('prag.targetGrowth', 'Target Path'),
      ],
      projectionRows: result.projections.map(p => [
        `${t('prag.year', 'Year')} ${p.year}`,
        fmtINR(p.currentValue),
        fmtINR(p.targetValue),
      ]),
      filename: `FinCalix_PRAG_Report_${dateTag()}`,
    };
    await exportToPDF(config);
  };

  // ---- Export Excel ----
  const handleExportExcel = async () => {
    const config: ExportConfig = {
      title: t('prag.reportTitle', 'Portfolio Rebalancing & Allocation Guide'),
      inputs: [
        { label: t('prag.totalPortfolio', 'Total Portfolio'), value: fmtINR(totalPortfolio) },
        { label: t('prag.riskAppetite', 'Risk Appetite'), value: risk },
        { label: t('prag.investmentGoal', 'Investment Goal'), value: goal },
        { label: t('prag.investmentHorizon', 'Horizon'), value: `${horizon} years` },
      ],
      results: [
        { label: t('prag.healthScore', 'Health Score'), value: `${result.portfolioHealthScore}/100` },
        { label: t('prag.currentReturn', 'Current Return'), value: `${result.currentExpectedReturn}%` },
        { label: t('prag.targetReturn', 'Target Return'), value: `${result.targetExpectedReturn}%` },
      ],
      projectionTitle: t('prag.projectionTitle', '10-Year Growth Projection'),
      projectionColumns: ['Year', 'Current Path', 'Target Path'],
      projectionRows: result.projections.map(p => [p.year, Math.round(p.currentValue), Math.round(p.targetValue)]),
      filename: `FinCalix_PRAG_Report_${dateTag()}`,
    };
    await exportToExcel(config);
  };

  // ---- Render ----
  return (
    <div className="min-h-dvh pb-28 animate-fade-in" style={{ backgroundColor: c.bg, maxWidth: 428, margin: '0 auto' }}>

      {/* ===== HEADER ===== */}
      <div
        className="sticky top-0 z-20 backdrop-blur-xl px-4 pt-14 pb-3 border-b"
        style={{ backgroundColor: c.navBg, borderColor: c.border }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border"
            style={{ backgroundColor: c.card, borderColor: c.border }}
          >
            <ArrowLeft size={18} style={{ color: c.textMuted }} />
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: c.text }}>
              {t('prag.title', 'Asset Rebalancer')}
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: c.textSecondary }}>
              {t('prag.subtitle', 'Portfolio Rebalancing & Allocation Guide')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">

        {/* ===== SECTION 1: YOUR PROFILE ===== */}
        <motion.div
          {...cardAnim}
          className="p-5 rounded-2xl border space-y-4"
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <div className="flex items-center gap-2 mb-1">
            <PieChart size={16} style={{ color: '#3b82f6' }} />
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: c.text }}>
              {t('prag.yourProfile', 'Your Profile')}
            </h2>
          </div>

          {/* Age Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium" style={{ color: c.textSecondary }}>
                {t('prag.age', 'Age')}
              </label>
              <span className="text-xs font-bold" style={{ color: c.text }}>{age} {t('prag.years', 'years')}</span>
            </div>
            <input
              type="range" min={18} max={70} value={age}
              onChange={e => setAge(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[10px]" style={{ color: c.textMuted }}>
              <span>18</span><span>70</span>
            </div>
          </div>

          {/* Risk Appetite */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: c.textSecondary }}>
              {t('prag.riskAppetite', 'Risk Appetite')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {RISK_OPTIONS.map(opt => {
                const active = risk === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setRisk(opt.value)}
                    className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-[11px] font-semibold transition-all"
                    style={{
                      backgroundColor: active ? '#3b82f620' : c.bg,
                      borderColor: active ? '#3b82f6' : c.border,
                      color: active ? '#3b82f6' : c.textSecondary,
                    }}
                  >
                    {opt.icon}
                    {t(opt.labelKey, opt.fallback)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goal Selector */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: c.textSecondary }}>
              {t('prag.investmentGoal', 'Investment Goal')}
            </label>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map(opt => {
                const active = goal === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setGoal(opt.value)}
                    className="px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all"
                    style={{
                      backgroundColor: active ? '#22c55e20' : c.bg,
                      borderColor: active ? '#22c55e' : c.border,
                      color: active ? '#22c55e' : c.textSecondary,
                    }}
                  >
                    {t(opt.labelKey, opt.fallback)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horizon Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium" style={{ color: c.textSecondary }}>
                {t('prag.investmentHorizon', 'Investment Horizon')}
              </label>
              <span className="text-xs font-bold" style={{ color: c.text }}>{horizon} {t('prag.years', 'years')}</span>
            </div>
            <input
              type="range" min={1} max={30} value={horizon}
              onChange={e => setHorizon(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[10px]" style={{ color: c.textMuted }}>
              <span>1 {t('prag.yr', 'yr')}</span><span>30 {t('prag.yrs', 'yrs')}</span>
            </div>
          </div>
        </motion.div>

        {/* ===== SECTION 2: CURRENT PORTFOLIO ===== */}
        <motion.div
          {...cardAnim}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-2xl border space-y-3"
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={16} style={{ color: '#8b5cf6' }} />
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: c.text }}>
              {t('prag.currentPortfolio', 'Current Portfolio')}
            </h2>
          </div>

          {ASSET_CLASSES.map(asset => (
            <div key={asset.key} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{ backgroundColor: asset.color + '20' }}
              >
                {asset.icon}
              </div>
              <div className="flex-1">
                <NumberInput
                  label={t(asset.labelKey, asset.fallbackLabel)}
                  value={holdings[asset.key]}
                  onChange={v => setHolding(asset.key, v)}
                  min={0}
                  max={100000000}
                  prefix="₹"
                />
              </div>
            </div>
          ))}

          {/* Total */}
          <div
            className="flex items-center justify-between p-3 rounded-xl mt-2"
            style={{ backgroundColor: c.bg, borderColor: c.border }}
          >
            <span className="text-xs font-bold uppercase" style={{ color: c.textSecondary }}>
              {t('prag.totalPortfolio', 'Total Portfolio')}
            </span>
            <span className="text-sm font-black" style={{ color: c.text }}>
              {fmtINR(totalPortfolio)}
            </span>
          </div>
        </motion.div>

        {/* ===== SECTION 3: TARGET ALLOCATION ===== */}
        <motion.div
          {...cardAnim}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl border space-y-4"
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={16} style={{ color: '#22c55e' }} />
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: c.text }}>
                {t('prag.targetAllocation', 'Target Allocation')}
              </h2>
            </div>
            <button
              onClick={handleAutoSuggest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
              style={{ backgroundColor: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }}
            >
              <Sparkles size={12} />
              {t('prag.autoSuggest', 'Auto-Suggest')}
            </button>
          </div>

          {ASSET_CLASSES.map(asset => (
            <div key={asset.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: c.textSecondary }}>
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: asset.color }}
                  />
                  {t(asset.labelKey, asset.fallbackLabel)}
                </span>
                <span className="text-xs font-bold" style={{ color: asset.color }}>
                  {targetAllocation[asset.key]}%
                </span>
              </div>
              <input
                type="range"
                min={0} max={100} value={targetAllocation[asset.key]}
                onChange={e => setTarget(asset.key, Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  accentColor: asset.color,
                  background: `linear-gradient(to right, ${asset.color} ${targetAllocation[asset.key]}%, ${c.border} ${targetAllocation[asset.key]}%)`,
                }}
              />
            </div>
          ))}

          {/* Sum indicator */}
          <div
            className="flex items-center justify-between p-3 rounded-xl"
            style={{
              backgroundColor: targetSum === 100 ? '#22c55e10' : '#ef444410',
              border: `1px solid ${targetSum === 100 ? '#22c55e40' : '#ef444440'}`,
            }}
          >
            <span className="text-xs font-bold" style={{ color: targetSum === 100 ? '#22c55e' : '#ef4444' }}>
              {t('prag.totalAllocation', 'Total Allocation')}
            </span>
            <span className="text-sm font-black" style={{ color: targetSum === 100 ? '#22c55e' : '#ef4444' }}>
              {targetSum}%
              {targetSum !== 100 && (
                <span className="text-[10px] font-medium ml-1">
                  ({targetSum > 100 ? '+' : ''}{targetSum - 100}%)
                </span>
              )}
            </span>
          </div>
        </motion.div>

        {/* ===== SECTION 4: REBALANCE MODE ===== */}
        <motion.div
          {...cardAnim}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl border space-y-4"
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={16} style={{ color: '#06b6d4' }} />
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: c.text }}>
              {t('prag.rebalanceMode', 'Rebalance Mode')}
            </h2>
          </div>

          <div
            className="grid grid-cols-3 gap-1 p-1 rounded-xl"
            style={{ backgroundColor: c.bg }}
          >
            {REBALANCE_MODES.map(m => {
              const active = rebalanceMode === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => setRebalanceMode(m.value)}
                  className="py-2 px-2 rounded-lg text-[10px] font-bold transition-all"
                  style={{
                    backgroundColor: active ? c.card : 'transparent',
                    color: active ? '#3b82f6' : c.textSecondary,
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {t(m.labelKey, m.fallback)}
                </button>
              );
            })}
          </div>

          {rebalanceMode === 'newInvestment' && (
            <NumberInput
              label={t('prag.newMonthlyInvestment', 'Monthly Investment for Rebalancing')}
              value={newMonthlyInvestment}
              onChange={setNewMonthlyInvestment}
              min={1000}
              max={10000000}
              prefix="₹"
            />
          )}
        </motion.div>

        {/* ===== SECTION 5: RESULTS ===== */}
        {totalPortfolio > 0 && (
          <>
            {/* --- Health Score --- */}
            <motion.div
              {...cardAnim}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-2xl border"
              style={{ backgroundColor: c.card, borderColor: c.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Shield size={16} style={{ color: healthColor }} />
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: c.text }}>
                  {t('prag.portfolioHealth', 'Portfolio Health')}
                </h2>
              </div>

              <div className="flex items-center gap-5">
                {/* Score circle */}
                <div className="relative w-24 h-24 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke={c.border} strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={healthColor} strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${result.portfolioHealthScore * 2.64} 264`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black" style={{ color: healthColor }}>
                      {result.portfolioHealthScore}
                    </span>
                    <span className="text-[9px] font-bold uppercase" style={{ color: c.textMuted }}>
                      / 100
                    </span>
                  </div>
                </div>

                {/* Grade + description */}
                <div className="flex-1">
                  <div
                    className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold mb-2"
                    style={{ backgroundColor: healthColor + '20', color: healthColor }}
                  >
                    {result.healthGrade}
                  </div>
                  <p className="text-[11px] leading-snug" style={{ color: c.textSecondary }}>
                    {result.portfolioHealthScore >= 80
                      ? t('prag.healthExcellent', 'Your portfolio is well-diversified and aligned with your goals.')
                      : result.portfolioHealthScore >= 60
                        ? t('prag.healthGood', 'Good portfolio balance. Minor adjustments could improve alignment.')
                        : result.portfolioHealthScore >= 40
                          ? t('prag.healthFair', 'Your portfolio needs attention. Consider rebalancing soon.')
                          : t('prag.healthPoor', 'Portfolio is significantly misaligned. Rebalancing is recommended.')}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* --- Rebalancing Action Table --- */}
            <motion.div
              {...cardAnim}
              transition={{ delay: 0.25 }}
              className="p-5 rounded-2xl border"
              style={{ backgroundColor: c.card, borderColor: c.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={16} style={{ color: '#8b5cf6' }} />
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: c.text }}>
                  {t('prag.rebalancingActions', 'Rebalancing Actions')}
                </h2>
              </div>

              <div className="space-y-2">
                {/* Table header */}
                <div
                  className="grid grid-cols-5 gap-1 px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: c.bg, color: c.textMuted }}
                >
                  <span className="col-span-1">{t('prag.asset', 'Asset')}</span>
                  <span className="text-right">{t('prag.current', 'Current')}</span>
                  <span className="text-right">{t('prag.target', 'Target')}</span>
                  <span className="text-center">{t('prag.action', 'Action')}</span>
                  <span className="text-right">{t('prag.amount', 'Amount')}</span>
                </div>

                {result.rebalancingActions.map(act => {
                  const actionColor = act.action === 'BUY' ? '#22c55e' : act.action === 'SELL' ? '#ef4444' : c.textMuted;
                  return (
                    <div
                      key={act.key}
                      className="grid grid-cols-5 gap-1 px-3 py-2.5 rounded-lg border items-center"
                      style={{ borderColor: c.border, backgroundColor: c.bg }}
                    >
                      <span className="col-span-1 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: c.text }}>
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: act.color }}
                        />
                        <span className="truncate">{act.asset}</span>
                      </span>
                      <span className="text-right text-[11px] font-medium" style={{ color: c.textSecondary }}>
                        {act.currentPercent}%
                      </span>
                      <span className="text-right text-[11px] font-medium" style={{ color: c.textSecondary }}>
                        {act.targetPercent}%
                      </span>
                      <span className="text-center">
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold"
                          style={{ backgroundColor: actionColor + '20', color: actionColor }}
                        >
                          {act.action}
                        </span>
                      </span>
                      <span className="text-right text-[11px] font-bold" style={{ color: actionColor }}>
                        {act.amount > 0 ? fmtINR(act.amount) : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* New investment plan (when mode = newInvestment) */}
              {result.newInvestmentPlan && (
                <div
                  className="mt-4 p-4 rounded-xl border"
                  style={{ backgroundColor: '#3b82f610', borderColor: '#3b82f630' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={14} style={{ color: '#3b82f6' }} />
                    <span className="text-xs font-bold" style={{ color: '#3b82f6' }}>
                      {t('prag.newInvestmentPlan', 'Monthly Investment Plan')}
                    </span>
                  </div>
                  <p className="text-[11px] mb-2" style={{ color: c.textSecondary }}>
                    {t('prag.monthsToRebalance', 'Estimated time to rebalance: {{months}} months', {
                      months: result.newInvestmentPlan.monthsToRebalance,
                    })}
                  </p>
                  <div className="space-y-1">
                    {ASSET_CLASSES.filter(a => (result.newInvestmentPlan?.allocationPerMonth[a.key] || 0) > 0).map(a => (
                      <div key={a.key} className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5" style={{ color: c.textSecondary }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                          {t(a.labelKey, a.fallbackLabel)}
                        </span>
                        <span className="font-bold" style={{ color: c.text }}>
                          {fmtINR(result.newInvestmentPlan!.allocationPerMonth[a.key])}
                          <span className="font-normal" style={{ color: c.textMuted }}>/mo</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* --- Risk-Return Comparison --- */}
            <motion.div
              {...cardAnim}
              transition={{ delay: 0.3 }}
              className="p-5 rounded-2xl border"
              style={{ backgroundColor: c.card, borderColor: c.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} style={{ color: '#22c55e' }} />
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: c.text }}>
                  {t('prag.riskReturnComparison', 'Risk-Return Comparison')}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Current */}
                <div className="p-3.5 rounded-xl border" style={{ borderColor: c.border, backgroundColor: c.bg }}>
                  <p className="text-[10px] font-bold uppercase mb-2" style={{ color: c.textMuted }}>
                    {t('prag.currentPortfolio', 'Current Portfolio')}
                  </p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px]" style={{ color: c.textSecondary }}>
                        {t('prag.expectedReturn', 'Expected Return')}
                      </p>
                      <p className="text-lg font-black" style={{ color: c.text }}>
                        {result.currentExpectedReturn}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px]" style={{ color: c.textSecondary }}>
                        {t('prag.volatility', 'Volatility')}
                      </p>
                      <p className="text-sm font-bold" style={{ color: '#eab308' }}>
                        {result.currentVolatility}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Target */}
                <div
                  className="p-3.5 rounded-xl border"
                  style={{ borderColor: '#22c55e40', backgroundColor: '#22c55e08' }}
                >
                  <p className="text-[10px] font-bold uppercase mb-2" style={{ color: '#22c55e' }}>
                    {t('prag.targetPortfolio', 'Target Portfolio')}
                  </p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px]" style={{ color: c.textSecondary }}>
                        {t('prag.expectedReturn', 'Expected Return')}
                      </p>
                      <p className="text-lg font-black" style={{ color: '#22c55e' }}>
                        {result.targetExpectedReturn}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px]" style={{ color: c.textSecondary }}>
                        {t('prag.volatility', 'Volatility')}
                      </p>
                      <p className="text-sm font-bold" style={{ color: '#eab308' }}>
                        {result.targetVolatility}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delta row */}
              {result.targetExpectedReturn !== result.currentExpectedReturn && (
                <div
                  className="mt-3 p-3 rounded-xl flex items-center justify-between"
                  style={{ backgroundColor: '#3b82f610', border: '1px solid #3b82f630' }}
                >
                  <span className="text-[11px] font-semibold" style={{ color: '#3b82f6' }}>
                    {t('prag.returnDelta', 'Return improvement')}
                  </span>
                  <span className="text-sm font-black" style={{
                    color: result.targetExpectedReturn > result.currentExpectedReturn ? '#22c55e' : '#ef4444',
                  }}>
                    {result.targetExpectedReturn > result.currentExpectedReturn ? '+' : ''}
                    {(result.targetExpectedReturn - result.currentExpectedReturn).toFixed(2)}%
                  </span>
                </div>
              )}
            </motion.div>

            {/* --- 10-Year Growth Projection (Collapsible) --- */}
            <motion.div
              {...cardAnim}
              transition={{ delay: 0.35 }}
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: c.card, borderColor: c.border }}
            >
              <button
                onClick={() => setShowProjections(!showProjections)}
                className="w-full flex items-center justify-between p-5"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} style={{ color: '#06b6d4' }} />
                  <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: c.text }}>
                    {t('prag.growthProjection', '10-Year Growth Projection')}
                  </h2>
                </div>
                {showProjections
                  ? <ChevronUp size={18} style={{ color: c.textMuted }} />
                  : <ChevronDown size={18} style={{ color: c.textMuted }} />}
              </button>

              <AnimatePresence>
                {showProjections && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-1">
                      {/* Header */}
                      <div
                        className="grid grid-cols-3 gap-2 px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: c.bg, color: c.textMuted }}
                      >
                        <span>{t('prag.year', 'Year')}</span>
                        <span className="text-right">{t('prag.currentPath', 'Current Path')}</span>
                        <span className="text-right">{t('prag.targetPath', 'Target Path')}</span>
                      </div>

                      {result.projections.map(p => {
                        const diff = p.targetValue - p.currentValue;
                        return (
                          <div
                            key={p.year}
                            className="grid grid-cols-3 gap-2 px-3 py-2 rounded-lg border"
                            style={{ borderColor: c.border }}
                          >
                            <span className="text-[11px] font-semibold" style={{ color: c.text }}>
                              {t('prag.year', 'Year')} {p.year}
                            </span>
                            <span className="text-right text-[11px] font-medium" style={{ color: c.textSecondary }}>
                              {fmtINR(p.currentValue)}
                            </span>
                            <div className="text-right">
                              <span className="text-[11px] font-bold" style={{ color: '#22c55e' }}>
                                {fmtINR(p.targetValue)}
                              </span>
                              {diff > 0 && (
                                <span className="block text-[9px]" style={{ color: '#22c55e' }}>
                                  +{fmtINR(diff)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* --- Smart Insights --- */}
            {result.smartInsights.length > 0 && (
              <motion.div
                {...cardAnim}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={16} style={{ color: '#eab308' }} />
                  <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: c.text }}>
                    {t('prag.smartInsights', 'Smart Insights')}
                  </h2>
                </div>

                {result.smartInsights.map((insight, idx) => {
                  const toneColor = insight.tone === 'success'
                    ? '#22c55e'
                    : insight.tone === 'warning'
                      ? '#eab308'
                      : '#3b82f6';
                  const ToneIcon = insight.tone === 'success'
                    ? TrendingUp
                    : insight.tone === 'warning'
                      ? Info
                      : Info;
                  return (
                    <motion.div
                      key={insight.key}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * idx }}
                      className="p-4 rounded-xl border flex items-start gap-3"
                      style={{
                        backgroundColor: toneColor + '08',
                        borderColor: toneColor + '30',
                      }}
                    >
                      <ToneIcon size={16} className="flex-shrink-0 mt-0.5" style={{ color: toneColor }} />
                      <p className="text-[11px] leading-snug" style={{ color: c.textSecondary }}>
                        {t(insight.key, insight.text)}
                      </p>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* --- Export Buttons --- */}
            <motion.div
              {...cardAnim}
              transition={{ delay: 0.45 }}
              className="grid grid-cols-2 gap-3"
            >
              <button
                onClick={handleExportPDF}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border text-[11px] font-bold transition-all"
                style={{ backgroundColor: '#ef444410', borderColor: '#ef444430', color: '#ef4444' }}
              >
                <Download size={14} />
                {t('prag.exportPDF', 'Export PDF')}
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border text-[11px] font-bold transition-all"
                style={{ backgroundColor: '#22c55e10', borderColor: '#22c55e30', color: '#22c55e' }}
              >
                <Download size={14} />
                {t('prag.exportExcel', 'Export Excel')}
              </button>
            </motion.div>
          </>
        )}

        {/* ===== EMPTY STATE ===== */}
        {totalPortfolio === 0 && (
          <motion.div
            {...cardAnim}
            className="p-8 rounded-2xl border text-center"
            style={{ backgroundColor: c.card, borderColor: c.border }}
          >
            <PieChart size={40} className="mx-auto mb-3" style={{ color: c.textMuted }} />
            <p className="text-sm font-semibold mb-1" style={{ color: c.text }}>
              {t('prag.emptyTitle', 'Enter your portfolio holdings')}
            </p>
            <p className="text-xs" style={{ color: c.textSecondary }}>
              {t('prag.emptyDescription', 'Add your current asset values above to see rebalancing recommendations and portfolio health analysis.')}
            </p>
          </motion.div>
        )}

        {/* ===== DISCLAIMER ===== */}
        <DisclaimerComponent module="general" />
      </div>
    </div>
  );
}
