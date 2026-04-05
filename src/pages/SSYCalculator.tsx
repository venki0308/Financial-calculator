import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Heart, Info, Download, Share2, ChevronDown, ChevronUp, BookOpen, AlertCircle, GraduationCap, Shield, Calendar, Save, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import NumberInput from '../components/NumberInput';
import DateInput from '../components/DateInput';
import LiveStatusCard from '../components/LiveStatusCard';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { calculateSsyStatus, type SsyStatusInput } from '../utils/investmentStatusEngine';

import SmartInsight from '../components/SmartInsight';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import { AnalyticsService } from '../lib/analytics';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useAppColors } from '../theme/useAppColors';
import ShareableCard from '../components/ShareableCard';
import { nativeShare } from '../utils/nativeShare';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface YearWise { year: number; age: number; deposit: number; interest: number; balance: number; cumDeposit: number; cumInterest: number; }

export default function SSYCalculator() {
    const { t } = useTranslation();
    useEffect(() => { AnalyticsService.trackScreen('SSY_Calculator_Advanced'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const { addSaved, removeSaved } = useCalculatorStore();
    const chartRef = useRef<any>(null);
    const c = useAppColors();

    const [depositMode, setDepositMode] = useState<'yearly' | 'monthly'>('yearly');
    const [annual, setAnnual] = useState(50000);
    const [monthly, setMonthly] = useState(5000);
    const effectiveAnnual = depositMode === 'monthly' ? monthly * 12 : annual;
    const [rate, setRate] = useState(8.2);
    const [childAge, setChildAge] = useState(1);
    const [showTimeline, setShowTimeline] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const [saved, setSaved] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);
    const [ssyOpenDate, setSsyOpenDate] = useState('');
    const [girlDob, setGirlDob] = useState('');

    const investYears = 15;
    const maturityYears = 21;

    const result = useMemo(() => {
        const r = rate / 100;
        const timeline: YearWise[] = [];
        let balance = 0;
        let cumDeposit = 0;
        let cumInterest = 0;

        for (let i = 1; i <= maturityYears; i++) {
            const deposit = i <= investYears ? effectiveAnnual : 0;
            cumDeposit += deposit;
            balance += deposit;
            const interest = balance * r;
            cumInterest += interest;
            balance += interest;
            timeline.push({
                year: i,
                age: childAge + i,
                deposit,
                interest: Math.round(interest),
                balance: Math.round(balance),
                cumDeposit,
                cumInterest: Math.round(cumInterest),
            });
        }

        const invested = annual * investYears;
        const totalInterest = Math.round(balance - invested);
        const maturityAge = childAge + maturityYears;
        const withdrawalAt18 = childAge < 18 ? timeline.find(row => row.age >= 18) : null;
        const withdrawalAmount = withdrawalAt18 ? Math.round(withdrawalAt18.balance * 0.5) : 0;

        return {
            invested,
            totalInterest,
            maturity: Math.round(balance),
            maturityAge,
            timeline,
            withdrawalAt18Year: withdrawalAt18 ? withdrawalAt18.year : null,
            withdrawalAmount,
        };
    }, [effectiveAnnual, rate, childAge]);

    const ssyStatus = useMemo(() => {
        if (!ssyOpenDate || !girlDob) return null;
        return calculateSsyStatus({ yearlyDeposit: effectiveAnnual, rate, openingDate: ssyOpenDate, girlDob });
    }, [effectiveAnnual, rate, ssyOpenDate, girlDob]);

    // Pie chart
    const pieData = useMemo(() => ({
        labels: [t('ssy.totalInvested'), t('ssy.interestEarned')],
        datasets: [{
            data: [result.invested, result.totalInterest],
            backgroundColor: ['#3B82F6', '#10B981'],
            borderColor: [c.card, c.card],
            borderWidth: 2,
        }]
    }), [result, c.card, t]);

    // Year-wise bar chart
    const barData = useMemo(() => ({
        labels: result.timeline.map(row => `${t('ssy.yr')} ${row.year}`),
        datasets: [
            { label: t('ssy.deposit'), data: result.timeline.map(row => row.cumDeposit), backgroundColor: '#3B82F6' },
            { label: t('ssy.interest'), data: result.timeline.map(row => row.cumInterest), backgroundColor: '#10B981' },
        ]
    }), [result.timeline, t]);

    const handleSave = () => {
        const calcId = `ssy-${Date.now()}`;
        addSaved({
            id: calcId,
            calculatorType: 'ssy',
            inputValues: { annual, rate, childAge },
            resultValues: { primary: result.maturity, label: t('ssy.maturityAmount'), invested: result.invested, returns: result.totalInterest },
            timestamp: Date.now(),
        });
        setSaved(true);
        setLastSavedId(calcId);
    };

    const handleRemove = () => {
        if (lastSavedId) {
            removeSaved(lastSavedId);
            setLastSavedId(null);
            setSaved(false);
        }
    };

    const handleDownloadPDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        await exportToPDF({
            title: t('ssy.reportTitle'),
            inputs: [
                { label: t('ssy.annualDeposit'), value: `₹${Math.round(annual).toLocaleString('en-IN')}` },
                { label: t('ssy.interestRateLabel'), value: `${rate}% p.a.` },
                { label: t('ssy.childAge'), value: `${childAge} ${t('ssy.years')}` },
                { label: t('ssy.depositPeriod'), value: `${investYears} ${t('ssy.yearsMandatory')}` },
                { label: t('ssy.maturityAge'), value: `${result.maturityAge} ${t('ssy.years')}` },
            ],
            results: [
                { label: t('ssy.totalAmountInvested'), value: `₹${Math.round(result.invested).toLocaleString('en-IN')}` },
                { label: t('ssy.totalInterestEarned'), value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
                { label: t('ssy.maturityAmount'), value: `₹${Math.round(result.maturity).toLocaleString('en-IN')}` },
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: t('ssy.totalInvested'), value: result.invested, color: '#4F46E5' },
                    { label: t('ssy.interestEarned'), value: result.totalInterest, color: '#10B981' },
                ],
            },
            projectionTitle: t('ssy.yearlyGrowthTitle'),
            projectionColumns: [t('ssy.year'), t('ssy.age'), t('ssy.annualDeposit'), t('ssy.interest'), t('ssy.balance'), t('ssy.cumDeposit'), t('ssy.depositEligible')],
            projectionRows: result.timeline.map((row: any) => [
                `${row.year}`,
                row.age,
                row.deposit > 0 ? `₹${Math.round(row.deposit).toLocaleString('en-IN')}` : '-',
                `₹${Math.round(row.interest).toLocaleString('en-IN')}`,
                `₹${Math.round(row.balance).toLocaleString('en-IN')}`,
                `₹${Math.round(row.cumDeposit).toLocaleString('en-IN')}`,
                row.deposit > 0 ? t('ssy.yes') : t('ssy.no'),
            ]),
            filename: `FinCalix_SSY_Report_${tag}`,
        });
    };

    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        await exportToExcel({
            title: t('ssy.reportTitle'),
            inputs: [
                { label: t('ssy.annualDeposit'), value: `₹${Math.round(annual).toLocaleString('en-IN')}` },
                { label: t('ssy.interestRateLabel'), value: `${rate}%` },
                { label: t('ssy.childAge'), value: String(childAge) },
            ],
            results: [
                { label: t('ssy.totalInvested'), value: `₹${Math.round(result.invested).toLocaleString('en-IN')}` },
                { label: t('ssy.interestEarned'), value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
                { label: t('ssy.maturityAmount'), value: `₹${Math.round(result.maturity).toLocaleString('en-IN')}` },
            ],
            projectionTitle: t('ssy.yearlyGrowth'),
            projectionColumns: [t('ssy.year'), t('ssy.age'), t('ssy.deposit'), t('ssy.interest'), t('ssy.balance'), t('ssy.cumulativeDeposit'), t('ssy.cumulativeInterest')],
            projectionRows: result.timeline.map((row: any) => [row.year, row.age, Math.round(row.deposit), Math.round(row.interest), Math.round(row.balance), Math.round(row.cumDeposit), Math.round(row.cumInterest)]),
            filename: `FinCalix_SSY_Report_${tag}`,
        });
    };

    const handleShare = async () => {
        const text = `🌸 ${t('ssy.shareTitle')}\n\n💰 ${t('ssy.annualDeposit')}: ${formatINR(annual)}\n📈 ${t('ssy.interestRateLabel')}: ${rate}%\n🎂 ${t('ssy.childAge')}: ${childAge} ${t('ssy.years')}\n\n✅ ${t('ssy.maturityAmount')}: ${formatINR(result.maturity)}\n📅 ${t('ssy.maturityAge')}: ${result.maturityAge} ${t('ssy.years')}\n💰 ${t('ssy.totalInvested')}: ${formatINR(result.invested)}\n📊 ${t('ssy.interestEarned')}: ${formatINR(result.totalInterest)}\n\nCalculated with FinCalix 🧮`;
        await nativeShare(t('ssy.shareNativeTitle'), text);
    };

    return (
        <div className="min-h-dvh bg-background animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background  px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-foreground">{t('ssy.title')}</h1>
                        <p className="text-muted-foreground text-xs">{t('ssy.subtitle')}</p>
                    </div>
                    <Heart size={20} className="text-pink-400" />
                </div>
            </div>

            <div className="px-4 pb-28 pt-4 space-y-5">
                {/* Inputs */}
                <div className="space-y-3">
                    <div className="flex rounded-lg overflow-hidden border border-border mb-2">
                        <button onClick={() => setDepositMode('yearly')}
                            className={`flex-1 py-2 text-xs font-medium transition-colors ${depositMode === 'yearly' ? 'bg-brand-green text-black' : 'text-muted-foreground'}`}>
                            {t('ssy.yearly')}
                        </button>
                        <button onClick={() => setDepositMode('monthly')}
                            className={`flex-1 py-2 text-xs font-medium transition-colors border-l border-border ${depositMode === 'monthly' ? 'bg-brand-green text-black' : 'text-muted-foreground'}`}>
                            {t('ssy.monthlyToggle')}
                        </button>
                    </div>
                    {depositMode === 'yearly' ? (
                        <NumberInput label={t('ssy.annualDeposit')} value={annual} onChange={setAnnual} min={250} max={150000} prefix="₹" helperText={t('ssy.annualDepositHelper')} />
                    ) : (
                        <NumberInput label={t('ssy.monthlyDeposit')} value={monthly} onChange={setMonthly} min={21} max={12500} prefix="₹" helperText={`₹${monthly.toLocaleString('en-IN')}/${t('ssy.mo')} = ₹${(monthly * 12).toLocaleString('en-IN')}/${t('ssy.year')}`} />
                    )}
                    <NumberInput label={t('ssy.interestRate')} value={rate} onChange={setRate} min={1} max={15} suffix="%" step={0.1} helperText={t('ssy.currentRate')} />
                    <NumberInput label={t('ssy.girlChildAge')} value={childAge} onChange={setChildAge} min={0} max={10} suffix={` ${t('ssy.years')}`} helperText={t('ssy.ageHelper')} />
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">Account Opening Date (optional)</label>
                        <DateInput
                            value={ssyOpenDate}
                            onChange={setSsyOpenDate}
                            max={new Date().toISOString().slice(0, 10)}
                            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm font-semibold focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">Girl's Date of Birth (optional)</label>
                        <DateInput
                            value={girlDob}
                            onChange={setGirlDob}
                            max={new Date().toISOString().slice(0, 10)}
                            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm font-semibold focus:outline-none"
                        />
                    </div>
                </div>

                {/* Result Card */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-gradient-to-br from-pink-600/20 to-rose-600/20 border border-pink-500/20">
                    <p className="text-pink-300/60 text-[10px] font-bold uppercase tracking-wider mb-1">{t('ssy.maturityAmount')}</p>
                    <p className="text-3xl font-black text-foreground mb-4">{formatINR(result.maturity)}</p>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-muted-foreground text-[10px] uppercase font-bold">{t('ssy.totalInvested')}</p>
                            <p className="text-foreground font-bold text-sm">{formatINR(result.invested)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[10px] uppercase font-bold">{t('ssy.interestEarned')}</p>
                            <p className="text-brand-green font-bold text-sm">{formatINR(result.totalInterest)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[10px] uppercase font-bold">{t('ssy.maturityAge')}</p>
                            <p className="text-blue-400 font-bold text-sm">{result.maturityAge} {t('ssy.years')}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[10px] uppercase font-bold">{t('ssy.returnsMultiplier')}</p>
                            <p className="text-amber-400 font-bold text-sm">{(result.maturity / result.invested).toFixed(2)}x</p>
                        </div>
                    </div>

                    {saved ? (
                        <div className="flex gap-2 mt-4">
                            <div className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <Check size={16} /> {t('common.saved')}
                            </div>
                            <button onClick={handleRemove}
                                className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 transition-all active:scale-95">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ) : (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-foreground font-bold text-sm">
                            <Save size={16} /> {t('ssy.saveCalculation')}
                        </motion.button>
                    )}
                </motion.div>

                {/* Education Withdrawal Info */}
                {result.withdrawalAt18Year && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                        <div className="flex items-start gap-3">
                            <GraduationCap size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-foreground font-bold text-sm">{t('ssy.educationWithdrawalTitle')}</h3>
                                <p className="text-muted-foreground text-xs mt-1">{t('ssy.educationWithdrawalDesc')} <span className="text-blue-400 font-bold">50%</span> {t('ssy.educationWithdrawalDesc2')}</p>
                                <p className="text-blue-400 text-xs font-bold mt-1">{t('ssy.eligibleAmount')}: {formatINR(result.withdrawalAmount)}</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Max Deposit Info */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-foreground font-bold text-xs">{t('ssy.maxAnnualDeposit')}</h3>
                            <p className="text-muted-foreground text-[11px] mt-1">{t('ssy.minDepositNote')}</p>
                        </div>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="p-4 rounded-2xl bg-card border border-border">
                    <h3 className="text-foreground font-bold text-sm mb-3">{t('ssy.investmentVsInterest')}</h3>
                    <div className="w-48 h-48 mx-auto">
                        <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: c.textSecondary, font: { size: 11 } } } } }} />
                    </div>
                </div>

                {/* Year-wise Growth Chart */}
                <div className="p-4 rounded-2xl bg-card border border-border">
                    <h3 className="text-foreground font-bold text-sm mb-3">{t('ssy.yearWiseGrowth')}</h3>
                    <div className="h-56">
                        <Bar
                            ref={chartRef}
                            data={barData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: { stacked: true, grid: { color: c.border }, ticks: { color: c.textMuted, font: { size: 8 }, callback: (v: any) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K` } },
                                    x: { stacked: true, grid: { display: false }, ticks: { color: c.textMuted, font: { size: 8 }, maxRotation: 45 } }
                                },
                                plugins: { legend: { labels: { color: c.textSecondary, font: { size: 10 } } } }
                            }}
                        />
                    </div>
                </div>

                {/* Smart Insight */}
                <SmartInsight calculatorType="ssy" inputs={{ annual, rate }} results={{ maturity: result.maturity, invested: result.invested }} />

                {/* Year-wise Timeline Toggle */}
                <button onClick={() => setShowTimeline(!showTimeline)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm">
                    <span className="flex items-center gap-2"><Calendar size={16} className="text-muted-foreground" /> {t('ssy.yearWiseTimeline')}</span>
                    {showTimeline ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>

                <AnimatePresence>
                    {showTimeline && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="rounded-2xl bg-card border border-border overflow-hidden">
                                <div className="grid grid-cols-5 text-[9px] font-bold text-muted-foreground uppercase p-2 bg-slate-100 dark:bg-slate-800/50">
                                    <span>{t('ssy.year')}</span><span>{t('ssy.age')}</span><span>{t('ssy.deposit')}</span><span>{t('ssy.interest')}</span><span>{t('ssy.balance')}</span>
                                </div>
                                {result.timeline.map((row, i) => (
                                    <div key={i} className={`grid grid-cols-5 text-[10px] p-2 ${i % 2 === 0 ? 'bg-card' : 'bg-slate-50 dark:bg-slate-800/20'} ${row.deposit === 0 ? 'text-muted-foreground' : 'text-slate-600 dark:text-slate-300'}`}>
                                        <span>{row.year}</span>
                                        <span>{row.age}</span>
                                        <span>{row.deposit > 0 ? formatINR(row.deposit) : '—'}</span>
                                        <span className="text-brand-green">{formatINR(row.interest)}</span>
                                        <span className="font-bold text-foreground">{formatINR(row.balance)}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scheme Rules Toggle */}
                <button onClick={() => setShowRules(!showRules)} className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm">
                    <span className="flex items-center gap-2"><BookOpen size={16} className="text-muted-foreground" /> {t('ssy.schemeRules')}</span>
                    {showRules ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>

                <AnimatePresence>
                    {showRules && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                                {[
                                    { icon: Shield, title: t('ssy.ruleEligibilityTitle'), desc: t('ssy.ruleEligibilityDesc') },
                                    { icon: Calendar, title: t('ssy.ruleTenureTitle'), desc: t('ssy.ruleTenureDesc') },
                                    { icon: AlertCircle, title: t('ssy.ruleDepositLimitsTitle'), desc: t('ssy.ruleDepositLimitsDesc') },
                                    { icon: GraduationCap, title: t('ssy.rulePartialWithdrawalTitle'), desc: t('ssy.rulePartialWithdrawalDesc') },
                                    { icon: Heart, title: t('ssy.ruleTaxBenefitsTitle'), desc: t('ssy.ruleTaxBenefitsDesc') },
                                    { icon: Info, title: t('ssy.rulePrematureClosureTitle'), desc: t('ssy.rulePrematureClosureDesc') },
                                ].map((rule, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <rule.icon size={16} className="text-pink-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-foreground font-bold text-xs">{rule.title}</p>
                                            <p className="text-muted-foreground text-[11px]">{rule.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Export & Share Buttons */}
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={handleDownloadPDF} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-muted-foreground text-[10px] font-medium">
                        <Download size={16} /> {t('ssy.pdf')}
                    </button>
                    <button onClick={handleDownloadExcel} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border text-muted-foreground text-[10px] font-medium">
                        <Download size={16} /> {t('ssy.excel')}
                    </button>
                    <button onClick={handleShare} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white text-[10px] font-bold">
                        <Share2 size={16} /> {t('ssy.share')}
                    </button>
                </div>

                {/* Shareable Result Card */}
                <ShareableCard
                    title={t('ssy.shareTitle')}
                    highlight={formatINR(result.maturity)}
                    subtitle={t('ssy.shareSubtitle', { years: maturityYears, rate })}
                    details={[
                        { label: t('ssy.annualDeposit'), value: formatINR(annual) },
                        { label: t('ssy.totalInvested'), value: formatINR(result.invested) },
                        { label: t('ssy.interestEarned'), value: formatINR(result.totalInterest) },
                        { label: t('ssy.maturityAge'), value: `${result.maturityAge} ${t('ssy.years')}` },
                    ]}
                    gradient="from-pink-600 via-rose-500 to-red-500"
                />

                {ssyStatus && (
                    <div className="mb-5">
                        <LiveStatusCard
                            title="SSY Live Status"
                            subtitle={`Girl's age: ${ssyStatus.girlAge} years | Account age: ${ssyStatus.accountAge} years`}
                            startDate={ssyOpenDate}
                            metrics={[
                                { label: 'Deposited', value: formatINR(ssyStatus.totalDeposited) },
                                { label: 'Interest', value: formatINR(ssyStatus.interestEarned), color: 'amber' },
                                { label: 'Balance', value: formatINR(ssyStatus.balanceToday), color: 'green' },
                            ]}
                            progressPercent={(ssyStatus.accountAge / 21) * 100}
                            progressLabel={`Year ${ssyStatus.accountAge} of 21${ssyStatus.daysToMaturity > 0 ? ` — ${ssyStatus.daysToMaturity} days to maturity` : ''}`}
                            warningText={
                                !ssyStatus.depositPhaseActive
                                    ? 'Deposit phase (15 years) is over. Interest continues to accrue until maturity at 21 years.'
                                    : undefined
                            }
                            insightText={
                                ssyStatus.withdrawalEligible
                                    ? `Partial withdrawal eligible (girl is 18+) — up to ${formatINR(ssyStatus.withdrawalAmount)} (50% of balance) for education/marriage.`
                                    : ssyStatus.depositPhaseActive
                                        ? `Deposit phase active — ${ssyStatus.depositYearsRemaining} year(s) of deposits remaining.`
                                        : undefined
                            }
                        />
                    </div>
                )}

            </div>

            <DisclaimerComponent module="ssy" />
        </div>
    );
}
