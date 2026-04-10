import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronUp, Lightbulb, Shield, TrendingUp, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { formatINR, calculateReducingEMI } from '../utils/calculations';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { AnalyticsService } from '../lib/analytics';
import { exportToPDF, type ExportConfig } from '../utils/exportReport';
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

    const effectiveScore = isNH ? 0 : score;
    const tier = getCibilTier(effectiveScore);
    const tierId = getTierId(effectiveScore);

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
        const config: ExportConfig = {
            title: t('cibil.title'),
            subtitle: `CIBIL ${effectiveScore > 0 ? effectiveScore : t('cibil.noHistory')} — ${tier.label}`,
            inputs: [{ label: t('cibil.pdfCibilScore'), value: effectiveScore > 0 ? String(effectiveScore) : t('cibil.noHistory') }, { label: t('cibil.pdfTier'), value: `${tier.emoji} ${tier.label}` }],
            results: eligibility.map(e => ({ label: e.loanType, value: `${e.status} ${t('cibil.pdfBank')}${e.minBank || t('cibil.pdfNA')} | ${t('cibil.pdfNBFC')}${e.minNBFC || t('cibil.pdfNA')}` })),
            projectionTitle: t('cibil.rateImpact'),
            projectionColumns: [t('cibil.pdfScore'), t('cibil.rate'), t('cibil.pdfEmi'), t('cibil.totalInt'), t('cibil.extraCost')],
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

                {/* Eligibility Table */}
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t('cibil.eligibility')}</h3>
                    <table className="w-full text-[10px]">
                        <thead><tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}><th className="py-1.5 text-left font-bold">{t('cibil.loanType')}</th><th className="py-1.5 text-right font-bold">{t('cibil.bankMin')}</th><th className="py-1.5 text-right font-bold">{t('cibil.nbfcMin')}</th><th className="py-1.5 text-center font-bold">{t('cibil.status')}</th></tr></thead>
                        <tbody>
                            {eligibility.map(e => (
                                <tr key={e.key} style={{ borderBottom: `1px solid ${c.border}40`, color: c.text }}>
                                    <td className="py-1.5 font-medium">{e.loanType}</td>
                                    <td className="py-1.5 text-right">{e.minBank || '—'}</td>
                                    <td className="py-1.5 text-right">{e.minNBFC || '—'}</td>
                                    <td className="py-1.5 text-center text-sm">{e.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
