import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronUp, Lightbulb, Shield, TrendingUp, Download, AlertTriangle, Target, Zap, Clock } from 'lucide-react';
import { getAllCreditCards } from '../utils/creditCardStorage';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { formatINR, calculateReducingEMI } from '../utils/calculations';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { AnalyticsService } from '../lib/analytics';
import { exportToPDF, getEnglishT, type ExportConfig } from '../utils/exportReport';
import { CIBIL_RANGES, getCibilTier, getTierId, LOAN_CIBIL_RATES, CIBIL_TIPS, CIBIL_MYTHS, RBI_NOTES } from '../data/cibilData';
import { todayStr } from '../utils/dateUtils';

const LOAN_TYPES_FOR_CALC = [
    { id: 'home_loan', label: 'cibil.homeLoan', icon: '🏠' },
    { id: 'car_loan', label: 'cibil.carLoan', icon: '🚗' },
    { id: 'personal_loan', label: 'cibil.personalLoan', icon: '💳' },
    { id: 'two_wheeler_loan', label: 'cibil.twoWheeler', icon: '🛵' },
    { id: 'education_loan', label: 'cibil.educationLoan', icon: '🎓' },
    { id: 'gold_loan', label: 'cibil.goldLoan', icon: '🥇' },
    { id: 'mortgage', label: 'cibil.mortgage', icon: '🏦' },
    { id: 'overdraft', label: 'cibil.overdraft', icon: '🏧' },
    { id: 'credit_card', label: 'cibil.creditCard', icon: '💳' },
];

// Maps the rate-impact loan type → the actual calculator route. Lets the user
// jump straight from "here's what your CIBIL costs you" → the calculator that
// applies, rather than having to leave CIBIL and search for it.
const LOAN_TYPE_ROUTE: Record<string, string> = {
    home_loan: '/calculator/loan-emi',
    car_loan: '/calculator/car-loan',
    personal_loan: '/calculator/personal-loan',
    two_wheeler_loan: '/two-wheeler-loan',
    education_loan: '/calculator/education-loan',
    gold_loan: '/gold-loan',
    mortgage: '/calculator/mortgage-calculator',
    overdraft: '/calculator/overdraft',
    credit_card: '/calculator/credit-card-interest',
};

export default function CibilScoreCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const c = useAppColors();
    useTrackCalculator();
    useEffect(() => { AnalyticsService.trackScreen('CIBIL_Score_Guide'); }, []);

    const [score, setScore] = useState(720);
    const [isNH, setIsNH] = useState(false);
    const [calcLoanType, setCalcLoanType] = useState('home_loan');
    const [calcAmount, setCalcAmount] = useState(2000000);
    const [calcTenure, setCalcTenure] = useState(20);
    const [showTips, setShowTips] = useState(true);
    const [showMyths, setShowMyths] = useState(false);
    const [showNtc, setShowNtc] = useState(false);
    const [showActionPlan, setShowActionPlan] = useState(true);
    const [showSimulator, setShowSimulator] = useState(false);
    const [showTimeline, setShowTimeline] = useState(false);
    const [simUtilization, setSimUtilization] = useState(30);
    const [simOnTimeMonths, setSimOnTimeMonths] = useState(6);
    const [simNoNewLoans, setSimNoNewLoans] = useState(true);

    const effectiveScore = isNH ? 0 : score;
    const tier = getCibilTier(effectiveScore);
    const tierId = getTierId(effectiveScore);

    // Credit card data for personalization
    const cards = getAllCreditCards().filter(cc => cc.isActive);
    const totalLimit = cards.reduce((s, cc) => s + cc.creditLimit, 0);
    const totalBalance = cards.reduce((s, cc) => s + cc.currentBalance, 0);
    const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : null;
    const cardCount = cards.length;

    // ── Risk Alerts ─────────────────────────────────────────────
    const riskAlerts = useMemo(() => {
        if (isNH) return [];
        const a: Array<{ type: string; title: string; desc: string }> = [];
        if (utilization !== null && utilization > 50)
            a.push({ type: 'critical', title: t('cibil.riskHighUtil', 'Credit Utilization Over 50%'), desc: t('cibil.riskHighUtilDesc', { pct: Math.round(utilization), defaultValue: 'Your cards are {{pct}}% utilized — significantly hurting your score. Target below 30%.' }) });
        else if (utilization !== null && utilization > 30)
            a.push({ type: 'warning', title: t('cibil.riskModUtil', 'Utilization Above 30%'), desc: t('cibil.riskModUtilDesc', { pct: Math.round(utilization), defaultValue: 'Utilization at {{pct}}% — reducing below 30% boosts your score.' }) });
        if (effectiveScore > 0 && effectiveScore < 650)
            a.push({ type: 'critical', title: t('cibil.riskLowScore', 'Score Below 650 — Limited Options'), desc: t('cibil.riskLowScoreDesc', 'Most banks need 650+ for unsecured loans. Focus on on-time payments.') });
        if (effectiveScore > 0 && effectiveScore < 750)
            a.push({ type: 'warning', title: t('cibil.riskMissedEmi', '1 Missed EMI = −50 to −100 Points'), desc: t('cibil.riskMissedEmiDesc', 'Payment history is 35% of score. Set auto-pay for all loans & cards.') });
        return a;
    }, [effectiveScore, utilization, isNH, t]);

    // ── Personalized Action Plan ────────────────────────────────
    const personalizedActions = useMemo(() => {
        const a: Array<{ priority: string; color: string; title: string; desc: string; impact: string; time: string }> = [];
        if (isNH) {
            a.push(
                { priority: 'High', color: '#F59E0B', title: t('cibil.actGetCard', 'Get a Secured Credit Card'), desc: t('cibil.actGetCardDesc', 'Open a card against FD (₹10K min). Small purchases, pay full bill monthly.'), impact: '0→700+', time: '6-12 mo' },
                { priority: 'Medium', color: '#3B82F6', title: t('cibil.actSmallLoan', 'Take a Small Consumer Loan'), desc: t('cibil.actSmallLoanDesc', '₹5,000 EMI paid on time for 12 months builds solid credit.'), impact: '+50-100', time: '12 mo' },
                { priority: 'Medium', color: '#3B82F6', title: t('cibil.actMaintain12', 'Clean Record for 12 Months'), desc: t('cibil.actMaintain12Desc', '12 months clean → 700+ score → qualifies for most loans.'), impact: '→700+', time: '12 mo' },
            );
            return a;
        }
        if (utilization !== null && utilization > 50)
            a.push({ priority: 'Critical', color: '#EF4444', title: t('cibil.actReduceUtil', 'Urgently Reduce Utilization'), desc: t('cibil.actReduceUtilDesc', { pct: Math.round(utilization), defaultValue: 'At {{pct}}% — pay down to below 30% of limit.' }), impact: '+20-50', time: '1-2 mo' });
        else if (utilization !== null && utilization > 30)
            a.push({ priority: 'Important', color: '#F59E0B', title: t('cibil.actOptimizeUtil', 'Reduce Utilization Below 30%'), desc: t('cibil.actOptimizeUtilDesc', { pct: Math.round(utilization), defaultValue: 'Currently {{pct}}% — drop below 30% for +10-25 pts.' }), impact: '+10-25', time: '1-2 mo' });
        if (tierId === 'very_poor' || tierId === 'poor')
            a.push({ priority: 'Critical', color: '#EF4444', title: t('cibil.actPayOnTime', 'Pay All EMIs & Bills On Time'), desc: t('cibil.actPayOnTimeDesc', 'Payment history = 35% of score. Set auto-pay. 1 miss = −50-100 pts.'), impact: '+50-100', time: '3-6 mo' });
        else if (tierId !== 'excellent')
            a.push({ priority: 'Important', color: '#F59E0B', title: t('cibil.actPayOnTime', 'Pay All EMIs & Bills On Time'), desc: t('cibil.actPayOnTimeDesc', 'Payment history = 35% of score. Set auto-pay. 1 miss = −50-100 pts.'), impact: '+50-100', time: '3-6 mo' });
        if (tierId === 'very_poor' || tierId === 'poor' || tierId === 'average')
            a.push({ priority: 'High', color: '#F97316', title: t('cibil.actCheckErrors', 'Check Report for Errors'), desc: t('cibil.actCheckErrorsDesc', '1 in 5 reports has errors. Free check at cibil.com — dispute takes 30 days.'), impact: '+100', time: '30-45 days' });
        if (cardCount === 0)
            a.push({ priority: 'Medium', color: '#3B82F6', title: t('cibil.actGetCard', 'Get a Secured Credit Card'), desc: t('cibil.actGetCardDesc', 'Open a card against FD (₹10K min). Small purchases, pay full bill monthly.'), impact: '+30-50', time: '6-12 mo' });
        else if (tierId === 'good' || tierId === 'average')
            a.push({ priority: 'Medium', color: '#3B82F6', title: t('cibil.actCreditMix', 'Diversify Credit Mix'), desc: t('cibil.actCreditMixDesc', 'Both secured (home/car) and unsecured (card) credit improves score.'), impact: '+10-20', time: 'Gradual' });
        if (tierId === 'excellent' || tierId === 'very_good')
            a.push({ priority: 'Low', color: '#10B981', title: t('cibil.actMaintain', 'Maintain Excellent Habits'), desc: t('cibil.actMaintainDesc', 'Keep utilization <30%, never miss payments, keep old accounts open.'), impact: 'Maintain', time: 'Ongoing' });
        return a.slice(0, 3);
    }, [isNH, tierId, utilization, cardCount, t]);

    // ── Score Simulator ─────────────────────────────────────────
    const simulatedScore = useMemo(() => {
        if (isNH || effectiveScore <= 0) return 0;
        let delta = 0;
        const curUtil = utilization ?? 50;
        if (simUtilization < curUtil) {
            if (curUtil > 50 && simUtilization <= 30) delta += 40;
            else if (curUtil > 30 && simUtilization <= 30) delta += 25;
            else delta += Math.round((curUtil - simUtilization) * 0.5);
        }
        const ppm = effectiveScore < 650 ? 12 : effectiveScore < 750 ? 8 : 5;
        delta += Math.min(100, simOnTimeMonths * ppm);
        if (simNoNewLoans) delta += 10;
        return Math.min(900, effectiveScore + delta);
    }, [effectiveScore, isNH, utilization, simUtilization, simOnTimeMonths, simNoNewLoans]);
    const simTier = getCibilTier(simulatedScore);
    const simDelta = simulatedScore - effectiveScore;

    // ── Money Impact ────────────────────────────────────────────
    const moneyImpact = useMemo(() => {
        if (isNH || effectiveScore <= 0 || tierId === 'excellent') return null;
        const cfg = LOAN_CIBIL_RATES['home_loan'];
        const curR = cfg.rates[tierId] || cfg.rates['good'];
        const exR = cfg.rates['excellent'];
        const curMid = (curR.min + curR.max) / 2;
        const exMid = (exR.min + exR.max) / 2;
        const curC = calculateReducingEMI(3000000, curMid, 240);
        const exC = calculateReducingEMI(3000000, exMid, 240);
        const extra = curC.totalInterest - exC.totalInterest;
        return { extraTotal: extra, extraPerMonth: Math.round(extra / 240), extraPerDay: Math.round(extra / 7200), currentRate: curMid, excellentRate: exMid };
    }, [effectiveScore, isNH, tierId]);

    // ── Probability Eligibility ─────────────────────────────────
    const probabilityEligibility = useMemo(() => {
        return Object.entries(LOAN_CIBIL_RATES).map(([key, cfg]) => {
            let probability: string, pct: number, color: string;
            if (cfg.minBank === 0) { probability = t('cibil.probHigh', 'High'); pct = 95; color = '#10B981'; }
            else if (effectiveScore <= 0) { probability = t('cibil.probMedium', 'Medium'); pct = 50; color = '#3B82F6'; }
            else if (effectiveScore < cfg.minNBFC) { probability = t('cibil.probLow', 'Low'); pct = 15; color = '#EF4444'; }
            else if (effectiveScore < cfg.minBank) { probability = t('cibil.probMedium', 'Medium'); pct = 55; color = '#F59E0B'; }
            else if (effectiveScore < cfg.ideal) { probability = t('cibil.probHigh', 'High'); pct = 80; color = '#22C55E'; }
            else { probability = t('cibil.probHigh', 'High'); pct = 95; color = '#10B981'; }
            return { key, loanType: cfg.loanType, probability, pct, color };
        });
    }, [effectiveScore, t]);

    // ── Target Timeline ─────────────────────────────────────────
    const targetTimeline = useMemo(() => {
        if (isNH || effectiveScore <= 0 || effectiveScore >= 780) return null;
        const rate = effectiveScore < 600 ? 12 : effectiveScore < 700 ? 10 : effectiveScore < 750 ? 7 : 5;
        return { to750: effectiveScore >= 750 ? 0 : Math.ceil((750 - effectiveScore) / rate), to780: Math.ceil((780 - effectiveScore) / rate), rate };
    }, [effectiveScore, isNH]);

    // Eligibility table
    const eligibility = useMemo(() => {
        return Object.entries(LOAN_CIBIL_RATES).map(([key, cfg]) => {
            let status = '✅'; let statusColor = '#10B981';
            if (cfg.minBank === 0) { status = '✅'; } // Gold loan
            else if (effectiveScore <= 0) { status = '🔵'; statusColor = '#3B82F6'; }
            else if (effectiveScore < cfg.minNBFC) { status = '❌'; statusColor = '#EF4444'; }
            else if (effectiveScore < cfg.minBank) { status = '🟠'; statusColor = '#F97316'; }
            return { key, loanType: cfg.loanType, minBank: cfg.minBank, minNBFC: cfg.minNBFC, status, statusColor };
        });
    }, [effectiveScore]);

    // Rate impact calculator
    const rateComparison = useMemo(() => {
        const config = LOAN_CIBIL_RATES[calcLoanType];
        if (!config || calcAmount <= 0 || calcTenure <= 0) return [];
        const tenureMonths = calcTenure * 12;
        const tiers: [string, string][] = [['very_poor', '300-549'], ['poor', '550-649'], ['average', '650-699'], ['good', '700-749'], ['very_good', '750-779'], ['excellent', '780+']];
        const bestCalc = calculateReducingEMI(calcAmount, (config.rates['excellent'].min + config.rates['excellent'].max) / 2, tenureMonths);
        return tiers.map(([tid, label]) => {
            const rates = config.rates[tid] || config.rates['good'];
            const midRate = (rates.min + rates.max) / 2;
            const calc = calculateReducingEMI(calcAmount, midRate, tenureMonths);
            const isCurrent = tid === tierId;
            return { label, rate: midRate, emi: calc.emi, totalInterest: calc.totalInterest, extra: calc.totalInterest - bestCalc.totalInterest, isCurrent };
        });
    }, [calcLoanType, calcAmount, calcTenure, tierId]);

    const handlePDF = async () => {
        const te = getEnglishT();
        const config: ExportConfig = {
            title: te('cibil.title', 'CIBIL Score Guide'),
            subtitle: `CIBIL ${effectiveScore > 0 ? effectiveScore : te('cibil.noHistory', 'No History')} — ${tier.label}`,
            inputs: [{ label: te('cibil.pdfCibilScore', 'CIBIL Score'), value: effectiveScore > 0 ? String(effectiveScore) : te('cibil.noHistory', 'No History') }, { label: te('cibil.pdfTier', 'Tier'), value: `${tier.emoji} ${tier.label}` }],
            results: eligibility.map(e => ({ label: e.loanType, value: `${e.status} ${te('cibil.pdfBank', 'Bank: ')}${e.minBank || te('cibil.pdfNA', 'N/A')} | ${te('cibil.pdfNBFC', 'NBFC: ')}${e.minNBFC || te('cibil.pdfNA', 'N/A')}` })),
            projectionTitle: te('cibil.rateImpact', 'Rate Impact Analysis'),
            projectionColumns: [te('cibil.pdfScore', 'Score'), te('cibil.rate', 'Rate'), te('cibil.pdfEmi', 'EMI'), te('cibil.totalInt', 'Total Interest'), te('cibil.extraCost', 'Extra Cost')],
            projectionRows: rateComparison.map(r => [r.label, `${r.rate.toFixed(1)}%`, formatINR(r.emi), formatINR(r.totalInterest), r.extra > 0 ? `+${formatINR(r.extra)}` : '—']),
            filename: `FinCalix_CIBIL_Guide_${todayStr()}`,
        };
        await exportToPDF(config);
    };

    return (
        <div className="min-h-dvh" style={{ backgroundColor: c.bg }}>
            <div className="sticky top-0 z-10 px-4 pt-14 pb-3 border-b" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}><ArrowLeft size={18} style={{ color: c.textSecondary }} /></button>
                    <div><h1 className="text-lg font-bold" style={{ color: c.text }}>📊 {t('cibil.title')}</h1><p className="text-[10px]" style={{ color: c.textSecondary }}>{t('cibil.subtitle')}</p></div>
                </div>
            </div>

            <div className="px-4 pb-28 pt-4 space-y-4">
                {/* Score Input */}
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t('cibil.yourScore')}</h3>
                    <div className="flex gap-2 mb-3">
                        <button onClick={() => setIsNH(false)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${!isNH ? 'bg-violet-600 text-white' : 'border'}`} style={isNH ? { borderColor: c.border, color: c.textSecondary } : {}}>{t('cibil.knowScore')}</button>
                        <button onClick={() => setIsNH(true)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${isNH ? 'bg-violet-600 text-white' : 'border'}`} style={!isNH ? { borderColor: c.border, color: c.textSecondary } : {}}>🆕 {t('cibil.noHistory')}</button>
                    </div>
                    {!isNH ? (
                        <>
                            <NumberInput label={t('cibil.enterScore')} value={score} onChange={setScore} min={300} max={900} />
                            <input type="range" min={300} max={900} value={score} onChange={e => setScore(Number(e.target.value))} className="w-full mt-2 accent-violet-600" />
                            {/* User-entered disclaimer (legal compliance) */}
                            <p className="mt-2 text-[10px] leading-snug italic" style={{ color: c.textSecondary }}>
                                ⓘ {t('cibil.userEnteredDisclaimer')}
                            </p>
                            <div className="flex items-center gap-3 mt-3">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white" style={{ backgroundColor: tier.color }}>{score}</div>
                                <div>
                                    <p className="text-sm font-bold" style={{ color: tier.color }}>{tier.emoji} {tier.label}</p>
                                    <p className="text-[10px]" style={{ color: c.textSecondary }}>{t(tier.description)}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-3 rounded-xl" style={{ backgroundColor: '#3B82F615', border: '1px solid #3B82F630' }}>
                            <p className="text-xs text-blue-600 dark:text-blue-400">{t('cibil.nhExplain')}</p>
                        </div>
                    )}
                </div>

                {/* Score Bar */}
                <div className="p-3 rounded-2xl border" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex h-3 rounded-full overflow-hidden">
                        {CIBIL_RANGES.slice(1).map(r => (
                            <div key={r.id} className="flex-1 h-full" style={{ backgroundColor: r.color }} />
                        ))}
                    </div>
                    <div className="flex justify-between mt-1 text-[8px] font-bold" style={{ color: c.textSecondary }}>
                        <span>{t('cibil.score300')}</span><span>{t('cibil.score550')}</span><span>{t('cibil.score650')}</span><span>{t('cibil.score700')}</span><span>{t('cibil.score750')}</span><span>{t('cibil.score780')}</span><span>{t('cibil.score900')}</span>
                    </div>
                </div>

                {/* ── Risk Alerts ── */}
                {riskAlerts.length > 0 && (
                    <div className="space-y-2">
                        {riskAlerts.map((alert, i) => (
                            <div key={i} className="p-3 rounded-2xl flex gap-3 items-start" style={{ backgroundColor: alert.type === 'critical' ? '#EF444415' : '#F59E0B15', border: `1px solid ${alert.type === 'critical' ? '#EF444440' : '#F59E0B40'}` }}>
                                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: alert.type === 'critical' ? '#EF4444' : '#F59E0B' }} />
                                <div>
                                    <p className="text-xs font-bold" style={{ color: alert.type === 'critical' ? '#EF4444' : '#F59E0B' }}>{alert.title}</p>
                                    <p className="text-[10px] mt-0.5" style={{ color: c.textSecondary }}>{alert.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Money Impact Summary ── */}
                {moneyImpact && (
                    <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <h3 className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: c.text }}>
                            <Zap className="w-4 h-4 text-amber-500" /> {t('cibil.moneyImpact', 'Your Score Costs You')}
                        </h3>
                        <p className="text-[10px] mb-3" style={{ color: c.textSecondary }}>
                            {t('cibil.moneyImpactSub', { curRate: moneyImpact.currentRate.toFixed(1), exRate: moneyImpact.excellentRate.toFixed(1), defaultValue: 'On ₹30L home loan, 20yr: {{curRate}}% vs {{exRate}}% (780+ score)' })}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#EF444410' }}>
                                <p className="text-lg font-black text-red-500">₹{moneyImpact.extraPerDay}</p>
                                <p className="text-[9px] font-bold mt-0.5" style={{ color: c.textSecondary }}>{t('cibil.perDay', 'Per Day')}</p>
                            </div>
                            <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F59E0B10' }}>
                                <p className="text-lg font-black text-amber-500">{formatINR(moneyImpact.extraPerMonth)}</p>
                                <p className="text-[9px] font-bold mt-0.5" style={{ color: c.textSecondary }}>{t('cibil.perMonth', 'Per Month')}</p>
                            </div>
                            <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#EF444410' }}>
                                <p className="text-lg font-black text-red-500">{formatINR(moneyImpact.extraTotal)}</p>
                                <p className="text-[9px] font-bold mt-0.5" style={{ color: c.textSecondary }}>{t('cibil.totalExtra', '20yr Extra')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Personalized Action Plan ── */}
                {personalizedActions.length > 0 && (
                    <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <button onClick={() => setShowActionPlan(!showActionPlan)} className="w-full p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2"><Target className="w-4 h-4 text-violet-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('cibil.actionPlan', 'Your Personalized Action Plan')}</h3></div>
                            {showActionPlan ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                        </button>
                        <AnimatePresence>
                            {showActionPlan && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="px-4 pb-4 border-t space-y-2" style={{ borderColor: c.border }}>
                                        {personalizedActions.map((action, i) => (
                                            <div key={i} className="p-3 rounded-xl border" style={{ borderColor: c.border }}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-xs font-bold flex-1" style={{ color: c.text }}>{action.title}</p>
                                                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold ml-2" style={{ backgroundColor: action.color + '20', color: action.color }}>{action.priority}</span>
                                                </div>
                                                <p className="text-[10px]" style={{ color: c.textSecondary }}>{action.desc}</p>
                                                <div className="flex gap-3 mt-1.5">
                                                    <span className="text-[9px] font-bold text-emerald-500">↑ {action.impact} {t('cibil.pts', 'pts')}</span>
                                                    <span className="text-[9px]" style={{ color: c.textSecondary }}>⏱ {action.time}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* ── Score Simulator ── */}
                {!isNH && effectiveScore > 0 && (
                    <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <button onClick={() => setShowSimulator(!showSimulator)} className="w-full p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('cibil.simulator', 'Score Simulator')}</h3></div>
                            {showSimulator ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                        </button>
                        <AnimatePresence>
                            {showSimulator && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="px-4 pb-4 border-t space-y-4" style={{ borderColor: c.border }}>
                                        {/* Utilization slider */}
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <p className="text-[10px] font-bold" style={{ color: c.text }}>{t('cibil.simUtil', 'Target Credit Utilization')}</p>
                                                <p className="text-[10px] font-bold" style={{ color: simUtilization <= 30 ? '#10B981' : simUtilization <= 50 ? '#F59E0B' : '#EF4444' }}>{simUtilization}%</p>
                                            </div>
                                            <input type="range" min={0} max={100} value={simUtilization} onChange={e => setSimUtilization(Number(e.target.value))} className="w-full accent-violet-600" />
                                            <div className="flex justify-between text-[8px]" style={{ color: c.textSecondary }}><span>0%</span><span>30%</span><span>50%</span><span>100%</span></div>
                                        </div>
                                        {/* On-time months slider */}
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <p className="text-[10px] font-bold" style={{ color: c.text }}>{t('cibil.simOnTime', 'On-Time Payments')}</p>
                                                <p className="text-[10px] font-bold text-emerald-500">{simOnTimeMonths} {t('cibil.simMonths', 'months')}</p>
                                            </div>
                                            <input type="range" min={1} max={24} value={simOnTimeMonths} onChange={e => setSimOnTimeMonths(Number(e.target.value))} className="w-full accent-violet-600" />
                                            <div className="flex justify-between text-[8px]" style={{ color: c.textSecondary }}><span>1</span><span>6</span><span>12</span><span>24</span></div>
                                        </div>
                                        {/* No new loans toggle */}
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-bold" style={{ color: c.text }}>{t('cibil.simNoNewLoans', 'Avoid New Loan Applications')}</p>
                                            <button onClick={() => setSimNoNewLoans(!simNoNewLoans)} className={`w-10 h-5 rounded-full relative transition-colors ${simNoNewLoans ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${simNoNewLoans ? 'right-0.5' : 'left-0.5'}`} />
                                            </button>
                                        </div>
                                        {/* Simulated result */}
                                        <div className="p-4 rounded-xl text-center" style={{ background: `linear-gradient(135deg, ${tier.color}15, ${simTier.color}15)` }}>
                                            <div className="flex items-center justify-center gap-6">
                                                <div>
                                                    <p className="text-[9px] font-bold" style={{ color: c.textSecondary }}>{t('cibil.simCurrent', 'Current')}</p>
                                                    <p className="text-2xl font-black" style={{ color: tier.color }}>{effectiveScore}</p>
                                                    <p className="text-[9px]" style={{ color: tier.color }}>{tier.emoji} {tier.label}</p>
                                                </div>
                                                <div className="text-xl" style={{ color: c.textSecondary }}>→</div>
                                                <div>
                                                    <p className="text-[9px] font-bold" style={{ color: c.textSecondary }}>{t('cibil.simPredicted', 'Predicted')}</p>
                                                    <p className="text-2xl font-black" style={{ color: simTier.color }}>{simulatedScore}</p>
                                                    <p className="text-[9px]" style={{ color: simTier.color }}>{simTier.emoji} {simTier.label}</p>
                                                </div>
                                            </div>
                                            {simDelta > 0 && (
                                                <p className="text-sm font-black text-emerald-500 mt-2">+{simDelta} {t('cibil.ptsGain', 'points improvement')}</p>
                                            )}
                                        </div>
                                        <p className="text-[9px] italic" style={{ color: c.textSecondary }}>
                                            {t('cibil.simDisclaimer', 'Estimates based on typical CIBIL scoring patterns. Actual changes depend on your full credit profile.')}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* ── Target Score Timeline ── */}
                {targetTimeline && targetTimeline.to780 > 0 && (
                    <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <button onClick={() => setShowTimeline(!showTimeline)} className="w-full p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('cibil.timeline', 'Target Score Timeline')}</h3></div>
                            {showTimeline ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                        </button>
                        <AnimatePresence>
                            {showTimeline && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="px-4 pb-4 border-t space-y-3" style={{ borderColor: c.border }}>
                                        <p className="text-[10px]" style={{ color: c.textSecondary }}>
                                            {t('cibil.timelineDesc', { rate: targetTimeline.rate, defaultValue: 'With consistent good behavior (~{{rate}} pts/month):' })}
                                        </p>
                                        {targetTimeline.to750 > 0 && (
                                            <div className="p-3 rounded-xl border" style={{ borderColor: c.border }}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs font-bold" style={{ color: c.text }}>{t('cibil.target750', 'Reach 750 (Very Good)')}</p>
                                                    <span className="text-xs font-black text-emerald-500">{targetTimeline.to750} {t('cibil.mo', 'mo')}</span>
                                                </div>
                                                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: c.border }}>
                                                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (effectiveScore - 300) / (750 - 300) * 100)}%` }} />
                                                </div>
                                            </div>
                                        )}
                                        <div className="p-3 rounded-xl border" style={{ borderColor: c.border }}>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-bold" style={{ color: c.text }}>{t('cibil.target780', 'Reach 780+ (Excellent)')}</p>
                                                <span className="text-xs font-black text-violet-500">{targetTimeline.to780} {t('cibil.mo', 'mo')}</span>
                                            </div>
                                            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: c.border }}>
                                                <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${Math.min(100, (effectiveScore - 300) / (780 - 300) * 100)}%` }} />
                                            </div>
                                        </div>
                                        <p className="text-[9px] italic" style={{ color: c.textSecondary }}>
                                            {t('cibil.timelineNote', 'Based on paying all EMIs on time, keeping utilization <30%, and no new hard inquiries.')}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* ── Probability-Based Eligibility ── */}
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t('cibil.probEligibility', 'Approval Probability')}</h3>
                    <div className="space-y-2">
                        {probabilityEligibility.map(e => (
                            <div key={e.key} className="flex items-center gap-3">
                                <p className="text-[10px] font-medium w-24 flex-shrink-0" style={{ color: c.text }}>{e.loanType}</p>
                                <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ backgroundColor: c.border + '40' }}>
                                    <div className="h-full rounded-full transition-all" style={{ width: `${e.pct}%`, backgroundColor: e.color }} />
                                </div>
                                <span className="text-[9px] font-bold w-12 text-right" style={{ color: e.color }}>{e.probability}</span>
                            </div>
                        ))}
                    </div>
                    <p className="mt-3 text-[9px] italic" style={{ color: c.textSecondary }}>
                        {t('cibil.probNote', 'Probability is indicative. Actual approval depends on income, employment, existing debts & lender policy.')}
                    </p>
                </div>

                {/* Rate Impact Calculator */}
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t('cibil.rateImpact')}</h3>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {LOAN_TYPES_FOR_CALC.map(lt => (
                            <button key={lt.id} onClick={() => setCalcLoanType(lt.id)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold ${calcLoanType === lt.id ? 'bg-violet-600 text-white' : 'border'}`}
                                style={calcLoanType !== lt.id ? { borderColor: c.border, color: c.textSecondary } : {}}
                            >{lt.icon} {t(lt.label)}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <NumberInput label={t('cibil.loanAmount')} value={calcAmount} onChange={setCalcAmount} min={50000} max={100000000} prefix="₹" />
                        <NumberInput label={t('cibil.tenureYrs')} value={calcTenure} onChange={setCalcTenure} min={1} max={30} suffix=" yrs" />
                    </div>
                    {rateComparison.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[9px] min-w-[350px]">
                                <thead><tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}><th className="py-1.5 text-left font-bold">CIBIL</th><th className="py-1.5 text-right font-bold">{t('cibil.rate')}</th><th className="py-1.5 text-right font-bold">{t('cibil.pdfEmi')}</th><th className="py-1.5 text-right font-bold">{t('cibil.totalInt')}</th><th className="py-1.5 text-right font-bold text-red-500">{t('cibil.extraCost')}</th></tr></thead>
                                <tbody>
                                    {rateComparison.map((r, i) => (
                                        <tr key={i} className={r.isCurrent ? 'bg-emerald-500/10' : ''} style={{ borderBottom: `1px solid ${c.border}40`, color: c.text }}>
                                            <td className={`py-1.5 ${r.isCurrent ? 'font-bold text-emerald-500' : ''}`}>{r.label}{r.isCurrent ? ' ←' : ''}</td>
                                            <td className="py-1.5 text-right">{r.rate.toFixed(1)}%</td>
                                            <td className="py-1.5 text-right font-medium">{formatINR(r.emi)}</td>
                                            <td className="py-1.5 text-right">{formatINR(r.totalInterest)}</td>
                                            <td className="py-1.5 text-right text-red-500">{r.extra > 0 ? `+${formatINR(r.extra)}` : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {/* Indicative-rate footnote (legal compliance) */}
                    <p className="mt-3 text-[9px] leading-snug italic" style={{ color: c.textSecondary }}>
                        {t('cibil.ratesIndicative')}
                    </p>
                    {/* CTA — jump to the matching loan calculator */}
                    {LOAN_TYPE_ROUTE[calcLoanType] && (
                        <button
                            onClick={() => navigate(LOAN_TYPE_ROUTE[calcLoanType])}
                            className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-violet-600 text-white transition-all active:scale-95"
                        >
                            {t('cibil.openCalculator', 'Open this calculator →')}
                        </button>
                    )}
                </div>

                {/* My Loans shortcut */}
                <button
                    onClick={() => navigate('/my-loans')}
                    className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border transition-all active:scale-95"
                    style={{ backgroundColor: c.card, borderColor: c.border, color: c.text }}
                >
                    📂 {t('cibil.viewMyLoans', 'View my saved loans')}
                </button>

                {/* Improvement Tips */}
                <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <button onClick={() => setShowTips(!showTips)} className="w-full p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('cibil.howToImprove')}</h3></div>
                        {showTips ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                    </button>
                    <AnimatePresence>
                        {showTips && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-4 pb-4 border-t space-y-2" style={{ borderColor: c.border }}>
                                    {CIBIL_TIPS.map(tip => (
                                        <div key={tip.id} className="p-3 rounded-xl border" style={{ borderColor: c.border }}>
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-xs font-bold" style={{ color: c.text }}>{t(tip.titleKey)}</p>
                                                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${tip.impact === 'High' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>{tip.impact} · {tip.points}</span>
                                            </div>
                                            <p className="text-[10px]" style={{ color: c.textSecondary }}>{t(tip.descKey)}</p>
                                            <p className="text-[9px] mt-1" style={{ color: c.textSecondary }}>⏱ {tip.time}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Myths & Facts */}
                <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <button onClick={() => setShowMyths(!showMyths)} className="w-full p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-violet-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('cibil.mythsTitle')}</h3></div>
                        {showMyths ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                    </button>
                    <AnimatePresence>
                        {showMyths && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-4 pb-4 border-t space-y-3" style={{ borderColor: c.border }}>
                                    {CIBIL_MYTHS.map((m, i) => (
                                        <div key={i} className="p-3 rounded-xl border" style={{ borderColor: c.border }}>
                                            <p className="text-xs font-bold text-red-500 mb-1">❌ {t(m.mythKey)}</p>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400">✅ {t(m.factKey)}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* NTC Guide */}
                {(isNH || effectiveScore < 550) && (
                    <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <button onClick={() => setShowNtc(!showNtc)} className="w-full p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('cibil.ntcGuide')}</h3></div>
                            {showNtc ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                        </button>
                        <AnimatePresence>
                            {showNtc && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="px-4 pb-4 border-t space-y-2 text-[11px]" style={{ borderColor: c.border, color: c.textSecondary }}>
                                        <p><strong>1.</strong> {t('cibil.ntcStep1')}</p>
                                        <p><strong>2.</strong> {t('cibil.ntcStep2')}</p>
                                        <p><strong>3.</strong> {t('cibil.ntcStep3')}</p>
                                        <p><strong>4.</strong> {t('cibil.ntcStep4')}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* RBI Rights */}
                <div className="p-3 rounded-2xl" style={{ backgroundColor: '#3B82F610', border: '1px solid #3B82F625' }}>
                    {RBI_NOTES.slice(0, 3).map((key, i) => (
                        <div key={i} className="flex gap-2 text-[10px] py-1" style={{ color: c.textSecondary }}>
                            <span className="text-blue-500">✅</span><p>{t(key)}</p>
                        </div>
                    ))}
                </div>

                {/* Cross-link to CIBIL Profile Setup (persistent storage) */}
                <button
                    onClick={() => navigate('/cibil-profile')}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white bg-violet-600 shadow-lg shadow-violet-500/20"
                >
                    📊 {t('cibil.openMyProfile')}
                </button>

                {/* PDF */}
                <button onClick={handlePDF} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border text-sm font-bold" style={{ borderColor: c.border, color: c.text }}>
                    <Download size={18} /> {t('cibil.downloadPdf')}
                </button>

                <DisclaimerComponent module="advisor" />
            </div>
        </div>
    );
}
