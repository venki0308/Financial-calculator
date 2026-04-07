import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Trash2, Plus, TrendingUp, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import NumberInput from '../components/NumberInput';
import { useCibil } from '../context/CibilContext';
import { getCibilTier, CIBIL_RANGES, LOAN_CIBIL_RATES } from '../data/cibilData';
import { getCibilColor, type CibilProfile, clearCibilProfile } from '../utils/cibilProfile';
import { formatINR, calculateReducingEMI } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { todayStr } from '../utils/dateUtils';

const EMPLOYMENT_TYPES = [
    { id: 'salaried_govt', icon: '🏛', labelKey: 'cp.govtSalaried' },
    { id: 'salaried_private', icon: '💼', labelKey: 'cp.privateSalaried' },
    { id: 'self_employed', icon: '🏢', labelKey: 'cp.selfEmployed' },
    { id: 'business_owner', icon: '🏪', labelKey: 'cp.businessOwner' },
    { id: 'student', icon: '🎓', labelKey: 'cp.student' },
    { id: 'retired', icon: '🏠', labelKey: 'cp.retired' },
];

export default function CibilProfileSetup() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const c = useAppColors();
    const { profile, save, refresh } = useCibil();
    useTrackCalculator();
    useEffect(() => { AnalyticsService.trackScreen('CIBIL_Profile'); }, []);

    const [score, setScore] = useState(profile?.score || 720);
    const [isNTC, setIsNTC] = useState(profile?.isNTC ?? false);
    const [empType, setEmpType] = useState<string | null>(profile?.employmentType || null);
    const [gender, setGender] = useState<string | null>(profile?.gender || null);
    const [history, setHistory] = useState<CibilProfile['history']>(profile?.history || []);
    const [saved, setSaved] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);

    const openCibilWebsite = () => {
        window.open('https://www.cibil.com', '_blank', 'noopener,noreferrer');
        setShowExitModal(false);
    };

    // Impact calculator
    const [homeValue, setHomeValue] = useState(5000000);
    const [carValue, setCarValue] = useState(800000);

    const effectiveScore = isNTC ? null : score;
    const tier = getCibilTier(effectiveScore || 0);
    const tierColor = getCibilColor(effectiveScore, isNTC);

    // Rate preview for different loan types
    const ratePreviews = useMemo(() => {
        const types = [
            { key: 'home_loan', label: t('cibil.homeLoan') },
            { key: 'car_loan', label: t('cibil.carLoan') },
            { key: 'personal_loan', label: t('cibil.personalLoan') },
            { key: 'two_wheeler_loan', label: t('cibil.twoWheeler') },
        ];
        return types.map(lt => {
            const cfg = LOAN_CIBIL_RATES[lt.key];
            if (!cfg) return { ...lt, min: 0, max: 0 };
            const tierId = isNTC ? 'nh' : (effectiveScore && effectiveScore >= 780 ? 'excellent' : effectiveScore && effectiveScore >= 750 ? 'very_good' : effectiveScore && effectiveScore >= 700 ? 'good' : effectiveScore && effectiveScore >= 650 ? 'average' : 'poor');
            const rates = cfg.rates[tierId] || cfg.rates['good'];
            return { ...lt, min: rates.min, max: rates.max };
        });
    }, [effectiveScore, isNTC, t]);

    // Lifetime savings calculator
    const lifetimeSavings = useMemo(() => {
        if (isNTC || !effectiveScore) return null;
        const avgScore = 650; // baseline
        const avgTier = 'average';
        const userTier = effectiveScore >= 780 ? 'excellent' : effectiveScore >= 750 ? 'very_good' : effectiveScore >= 700 ? 'good' : effectiveScore >= 650 ? 'average' : 'poor';
        if (userTier === 'poor' || userTier === 'average') return null;

        const homeCfg = LOAN_CIBIL_RATES['home_loan'];
        const carCfg = LOAN_CIBIL_RATES['car_loan'];

        const homeUserRate = (homeCfg.rates[userTier].min + homeCfg.rates[userTier].max) / 2;
        const homeAvgRate = (homeCfg.rates[avgTier].min + homeCfg.rates[avgTier].max) / 2;
        const homeUser = calculateReducingEMI(homeValue * 0.8, homeUserRate, 240);
        const homeAvg = calculateReducingEMI(homeValue * 0.8, homeAvgRate, 240);
        const homeSaving = homeAvg.totalInterest - homeUser.totalInterest;

        const carUserRate = (carCfg.rates[userTier].min + carCfg.rates[userTier].max) / 2;
        const carAvgRate = (carCfg.rates[avgTier].min + carCfg.rates[avgTier].max) / 2;
        const carUser = calculateReducingEMI(carValue * 0.85, carUserRate, 60);
        const carAvg = calculateReducingEMI(carValue * 0.85, carAvgRate, 60);
        const carSaving = carAvg.totalInterest - carUser.totalInterest;

        return { homeSaving: Math.round(homeSaving), carSaving: Math.round(carSaving), total: Math.round(homeSaving + carSaving) };
    }, [effectiveScore, isNTC, homeValue, carValue]);

    const handleSave = () => {
        const p: CibilProfile = {
            score: isNTC ? null : score,
            isNTC,
            lastUpdated: new Date().toISOString(),
            employmentType: empType as any,
            gender: gender as any,
            history: isNTC ? [] : [...history, ...(score ? [{ score, date: todayStr() }] : [])],
            isSimulated: true,
        };
        save(p);
        setSaved(true);
        setTimeout(() => navigate(-1), 1200);
    };

    const handleClear = () => {
        clearCibilProfile();
        refresh();
        setScore(720);
        setIsNTC(false);
        setEmpType(null);
        setGender(null);
        setHistory([]);
        setSaved(false);
    };

    return (
        <div className="min-h-dvh" style={{ backgroundColor: c.bg }}>
            <div className="sticky top-0 z-10 px-4 pt-14 pb-3 border-b" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}><ArrowLeft size={18} style={{ color: c.textSecondary }} /></button>
                    <div><h1 className="text-lg font-bold" style={{ color: c.text }}>📊 {t('cp.title')}</h1><p className="text-[10px]" style={{ color: c.textSecondary }}>{t('cp.subtitle')}</p></div>
                </div>
            </div>

            <div className="px-4 pb-28 pt-4 space-y-4">
                {/* Why */}
                <div className="p-4 rounded-2xl" style={{ backgroundColor: '#8B5CF610', border: '1px solid #8B5CF625' }}>
                    <p className="text-xs font-bold mb-2" style={{ color: c.text }}>{t('cp.whyTitle')}</p>
                    <div className="space-y-1.5 text-[11px]" style={{ color: c.textSecondary }}>
                        <p>🎯 {t('cp.why1')}</p>
                        <p>⚡ {t('cp.why2')}</p>
                        <p>💡 {t('cp.why3')}</p>
                    </div>
                    <p className="text-[9px] mt-2 italic" style={{ color: c.textSecondary }}>{t('cp.privacy')}</p>
                </div>

                {/* Score Entry */}
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t('cp.enterScore')}</h3>
                    <div className="flex gap-2 mb-3">
                        <button onClick={() => setIsNTC(false)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${!isNTC ? 'bg-violet-600 text-white' : 'border'}`} style={isNTC ? { borderColor: c.border, color: c.textSecondary } : {}}>{t('cibil.knowScore')}</button>
                        <button onClick={() => setIsNTC(true)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${isNTC ? 'bg-violet-600 text-white' : 'border'}`} style={!isNTC ? { borderColor: c.border, color: c.textSecondary } : {}}>🆕 {t('cibil.noHistory')}</button>
                    </div>

                    {!isNTC ? (
                        <>
                            <NumberInput label={t('cibil.enterScore')} value={score} onChange={setScore} min={300} max={900} />
                            <input type="range" min={300} max={900} value={score} onChange={e => setScore(Number(e.target.value))} className="w-full mt-2 accent-violet-600" />

                            {/* User-entered disclaimer (legal compliance) */}
                            <p className="mt-2 text-[10px] leading-snug italic" style={{ color: c.textSecondary }}>
                                ⓘ {t('cibil.userEnteredDisclaimer')}
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowExitModal(true)}
                                className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400 underline underline-offset-2"
                            >
                                {t('cibil.checkOnCibilWebsite')} <ExternalLink size={10} />
                            </button>

                            {/* Live score feedback */}
                            <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: `${tierColor}15`, border: `1px solid ${tierColor}30` }}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-white" style={{ backgroundColor: tierColor }}>{score}</div>
                                    <div>
                                        <p className="text-sm font-bold" style={{ color: tierColor }}>{tier.emoji} {tier.label}</p>
                                        <p className="text-[10px]" style={{ color: c.textSecondary }}>{t(tier.description)}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {ratePreviews.map(rp => (
                                        <div key={rp.key} className="p-2 rounded-lg text-center" style={{ backgroundColor: c.bg }}>
                                            <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>{rp.label}</p>
                                            <p className="text-[10px] font-black" style={{ color: tierColor }}>{rp.min.toFixed(1)}%–{rp.max.toFixed(1)}%</p>
                                        </div>
                                    ))}
                                </div>
                                {/* Indicative-rate footnote (legal compliance) */}
                                <p className="mt-2 text-[9px] leading-snug italic" style={{ color: c.textSecondary }}>
                                    {t('cibil.ratesIndicative')}
                                </p>
                            </div>

                            {/* Score bar */}
                            <div className="mt-3">
                                <div className="flex h-2.5 rounded-full overflow-hidden">
                                    {CIBIL_RANGES.slice(1).map(r => <div key={r.id} className="flex-1 h-full" style={{ backgroundColor: r.color }} />)}
                                </div>
                                <div className="relative h-4">
                                    <div className="absolute w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent" style={{ left: `${Math.max(0, Math.min(100, ((score - 300) / 600) * 100))}%`, borderBottomColor: tierColor, transform: 'translateX(-5px)' }} />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-3 rounded-xl" style={{ backgroundColor: '#3B82F615', border: '1px solid #3B82F630' }}>
                            <p className="text-xs text-blue-600 dark:text-blue-400">{t('cibil.nhExplain')}</p>
                        </div>
                    )}
                </div>

                {/* Employment Type */}
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <h3 className="text-xs font-bold mb-1" style={{ color: c.text }}>{t('cp.employment')}</h3>
                    <p className="text-[9px] mb-3" style={{ color: c.textSecondary }}>{t('cp.employmentHint')}</p>
                    <div className="flex flex-wrap gap-2">
                        {EMPLOYMENT_TYPES.map(et => (
                            <button key={et.id} onClick={() => setEmpType(empType === et.id ? null : et.id)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 ${empType === et.id ? 'bg-violet-600 text-white' : 'border'}`}
                                style={empType !== et.id ? { borderColor: c.border, color: c.textSecondary } : {}}
                            >{et.icon} {t(et.labelKey)}</button>
                        ))}
                    </div>
                </div>

                {/* Gender */}
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <h3 className="text-xs font-bold mb-1" style={{ color: c.text }}>{t('cp.gender')}</h3>
                    <p className="text-[9px] mb-3" style={{ color: c.textSecondary }}>{t('cp.genderHint')}</p>
                    <div className="flex gap-2">
                        {[{ id: 'male', label: t('cp.male') }, { id: 'female', label: t('cp.female') }, { id: 'other', label: t('cp.other') }].map(g => (
                            <button key={g.id} onClick={() => setGender(gender === g.id ? null : g.id)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold ${gender === g.id ? 'bg-violet-600 text-white' : 'border'}`}
                                style={gender !== g.id ? { borderColor: c.border, color: c.textSecondary } : {}}
                            >{g.label}</button>
                        ))}
                    </div>
                </div>

                {/* Lifetime Savings */}
                {lifetimeSavings && lifetimeSavings.total > 10000 && (
                    <div className="p-4 rounded-2xl border-2 shadow-sm" style={{ backgroundColor: '#10B98108', borderColor: '#10B981' }}>
                        <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-emerald-500" /><h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{t('cp.lifetimeValue')}</h3></div>
                        <p className="text-3xl font-black text-emerald-500 mb-1">{formatINR(lifetimeSavings.total)}</p>
                        <p className="text-[10px] mb-3" style={{ color: c.textSecondary }}>{t('cp.lifetimeDesc', { score: score })}</p>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#10B98115' }}>
                                <p className="text-[8px] uppercase font-bold text-emerald-500">{t('cibil.homeLoan')}</p>
                                <p className="text-[11px] font-black text-emerald-500">{formatINR(lifetimeSavings.homeSaving)}</p>
                            </div>
                            <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#3B82F615' }}>
                                <p className="text-[8px] uppercase font-bold text-blue-500">{t('cibil.carLoan')}</p>
                                <p className="text-[11px] font-black text-blue-500">{formatINR(lifetimeSavings.carSaving)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Score History */}
                {history.length > 0 && (
                    <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <h3 className="text-xs font-bold mb-2" style={{ color: c.text }}>{t('cp.scoreHistory')}</h3>
                        {history.map((h, i) => (
                            <div key={i} className="flex justify-between py-1.5 border-b text-xs" style={{ borderColor: `${c.border}50` }}>
                                <span style={{ color: c.textSecondary }}>{h.date}</span>
                                <span className="font-bold" style={{ color: c.text }}>{h.score}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Save */}
                {saved ? (
                    <div className="p-4 rounded-2xl text-center" style={{ backgroundColor: '#10B98115', border: '1px solid #10B98130' }}>
                        <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm font-bold text-emerald-500">{t('cp.saved')}</p>
                    </div>
                ) : (
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
                        className="w-full py-4 rounded-2xl font-bold text-sm text-white bg-emerald-500 shadow-lg shadow-emerald-500/20"
                    >{t('cp.saveBtn')}</motion.button>
                )}

                {profile && (
                    <button onClick={handleClear} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                        <Trash2 size={16} /> {t('cp.clearProfile')}
                    </button>
                )}

                {/* Cross-link to CIBIL Score Guide (educational) */}
                <button
                    onClick={() => navigate('/cibil-score')}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold border"
                    style={{ borderColor: c.border, color: c.textSecondary }}
                >
                    📖 {t('cp.viewScoreGuide')}
                </button>

                <p className="text-[9px] text-center" style={{ color: c.textSecondary }}>{t('cp.updateNote')}</p>
            </div>

            {/* Exit confirmation modal — leaving FinCalix for cibil.com */}
            {showExitModal && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
                    onClick={() => setShowExitModal(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full sm:max-w-md p-5 rounded-t-3xl sm:rounded-3xl border shadow-xl"
                        style={{ backgroundColor: c.card, borderColor: c.border }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <ExternalLink size={18} className="text-violet-500" />
                            <h3 className="text-base font-bold" style={{ color: c.text }}>{t('cibil.exitModalTitle')}</h3>
                        </div>
                        <p className="text-[12px] leading-relaxed mb-5" style={{ color: c.textSecondary }}>
                            {t('cibil.exitModalBody')}
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowExitModal(false)}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold border"
                                style={{ borderColor: c.border, color: c.textSecondary }}
                            >
                                {t('cibil.exitModalCancel')}
                            </button>
                            <button
                                type="button"
                                onClick={openCibilWebsite}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-violet-600"
                            >
                                {t('cibil.exitModalContinue')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}