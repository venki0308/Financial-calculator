import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronUp, Save, Check, FileText, Download, ShieldAlert, ChevronLeft, ChevronRight, Activity, BrainCircuit, Target, BarChart2, Info, TrendingUp, RotateCw, ShieldCheck, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import { useCalculatorStore } from '../store/useCalculatorStore';
import TaxInputGroup from '../components/TaxInputGroup';
import RiskCategoryTags from '../components/RiskCategoryTags';
import { TaxRegime, calculateAssetTax } from '../utils/taxEngine';
import { DecisionEngine } from '../services/DecisionEngine';
import DisclaimerComponent from '../components/DisclaimerComponent';
import LiveStatusCard from '../components/LiveStatusCard';
import DateInput from '../components/DateInput';
import { calculatePomisStatus, type PomisStatusInput } from '../utils/investmentStatusEngine';

const fmtINR = (v: number) => formatINR(Math.round(v));
const LOCK_IN_YEARS = 5;
const ITEMS_PER_PAGE = 12;

export default function POMISCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addSaved, removeSaved } = useCalculatorStore();

    useEffect(() => { AnalyticsService.trackScreen('POMIS_Calculator'); }, []);

    const [investment, setInvestment] = useState(450000);
    const [rate, setRate] = useState(7.4);
    const [isJoint, setIsJoint] = useState(false);
    
    // Tax & Decision Engine states
    const [userIncome, setUserIncome] = useState(1200000);
    const [taxRegime, setTaxRegime] = useState<TaxRegime>('new');
    const [inflation, setInflation] = useState(6.0);
    const [reinvestRate, setReinvestRate] = useState(7.1);
    const [fdRate, setFdRate] = useState(7.0);

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [saved, setSaved] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [pomisStartDate, setPomisStartDate] = useState('');

    const maxLimit = isJoint ? 1500000 : 900000;

    const result = useMemo(() => {
        const clampedInvestment = Math.min(investment, maxLimit);
        const monthlyIncome = (clampedInvestment * rate / 100) / 12;
        const totalMonths = LOCK_IN_YEARS * 12;
        const totalInterest = monthlyIncome * totalMonths;
        const yearlyInterest = monthlyIncome * 12;

        // Month-by-month schedule
        const schedule: { month: number; payout: number; cumulative: number }[] = [];
        for (let m = 1; m <= totalMonths; m++) {
            schedule.push({ month: m, payout: monthlyIncome, cumulative: monthlyIncome * m });
        }

        // Annual summary
        const annualSummary: { year: number; payout: number; cumulative: number }[] = [];
        for (let y = 1; y <= LOCK_IN_YEARS; y++) {
            annualSummary.push({ year: y, payout: yearlyInterest, cumulative: yearlyInterest * y });
        }

        // Reinvestment scenario (monthly payout → RD)
        const rq = reinvestRate / 400; // quarterly compounding for postal RD roughly
        let reinvestMaturity = 0;
        for (let m = 1; m <= totalMonths; m++) {
            const remaining = totalMonths - m;
            reinvestMaturity += monthlyIncome * Math.pow(1 + rq, remaining / 3);
        }
        const reinvestGain = reinvestMaturity - totalInterest;

        // Tax calculation using TaxEngine
        const taxImpact = calculateAssetTax({
            annualIncome: userIncome,
            regime: taxRegime,
            assetInterest: yearlyInterest,
            deduction80c: 0
        });

        const annualTaxOnInterest = Math.max(0, taxImpact.taxPayableOnAsset);
        const netYearlyAfterTax = yearlyInterest - annualTaxOnInterest;
        const netMonthlyAfterTax = netYearlyAfterTax / 12;
        
        const totalTaxOverTenure = annualTaxOnInterest * LOCK_IN_YEARS;
        const netTotalInterest = totalInterest - totalTaxOverTenure;

        // Effective yield (post-tax)
        const postTaxYield = ((netTotalInterest / clampedInvestment) / LOCK_IN_YEARS) * 100;

        // Inflation-adjusted real values
        const realPrincipalValue = clampedInvestment / Math.pow(1 + inflation / 100, LOCK_IN_YEARS);
        const realMonthlyIncome = netMonthlyAfterTax / Math.pow(1 + inflation / 100, LOCK_IN_YEARS); // Approximation of purchasing power loss at end
        
        const realReturn = postTaxYield - inflation;

        // FD comparison (quarterly compounding, same tenure)
        const fdMaturity = clampedInvestment * Math.pow(1 + fdRate / 400, 4 * LOCK_IN_YEARS);
        const fdInterest = fdMaturity - clampedInvestment;
        // FD tax assuming IFOS at same marginal rate via TaxEngine
        const fdTaxImpact = calculateAssetTax({
            annualIncome: userIncome,
            regime: taxRegime,
            assetInterest: fdInterest / LOCK_IN_YEARS, // Approx annual tax impact for FD
            deduction80c: 0
        });
        const fdPostTaxInterest = fdInterest - (Math.max(0, fdTaxImpact.taxPayableOnAsset) * LOCK_IN_YEARS);

        return {
            clampedInvestment, monthlyIncome, totalInterest, yearlyInterest,
            schedule, annualSummary,
            reinvestMaturity, reinvestGain,
            annualTaxOnInterest, netMonthlyAfterTax, totalTaxOverTenure, netTotalInterest,
            realMonthlyIncome, realPrincipalValue, realReturn,
            fdMaturity, fdInterest, fdPostTaxInterest,
            postTaxYield
        };
    }, [investment, rate, isJoint, maxLimit, userIncome, taxRegime, reinvestRate, inflation, fdRate]);

    const pomisStatus = useMemo(() => {
        if (!pomisStartDate) return null;
        return calculatePomisStatus({ principal: Math.min(investment, maxLimit), rate, startDate: pomisStartDate });
    }, [investment, rate, pomisStartDate, maxLimit]);

    const riskConfig = DecisionEngine.getRiskConfig('POMIS');
    const recommendation = useMemo(() => DecisionEngine.getRecommendation({
        calculatorId: 'POMIS',
        realReturn: result.realReturn,
        is80CEligible: false,
        postTaxCAGR: result.postTaxYield,
        liquidityScore: 4, // Excellent cashflow liquidity
        riskLevel: riskConfig.risk
    }), [result.realReturn, result.postTaxYield, riskConfig.risk]);

    const handleSave = () => {
        const calcId = crypto.randomUUID();
        addSaved({
            id: calcId,
            calculatorType: 'Post Office MIS',
            inputValues: { investment, rate, isJoint, userIncome, taxRegime },
            resultValues: { primary: result.monthlyIncome, totalInterest: result.totalInterest },
            timestamp: Date.now()
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

    const handlePDFExport = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        await exportToPDF({
            title: 'Post Office MIS (Monthly Income Scheme) Report',
            inputs: [
                { label: 'Investment Amount', value: `₹${Math.round(result.clampedInvestment).toLocaleString('en-IN')}` },
                { label: 'Account Type', value: isJoint ? 'Joint Account' : 'Single Account' },
                { label: 'Interest Rate', value: `${rate}% p.a.` },
                { label: 'Tenure', value: '5 Years (60 months)' },
            ],
            results: [
                { label: 'Monthly Income (Gross)', value: `₹${Math.round(result.monthlyIncome).toLocaleString('en-IN')}` },
                { label: 'Annual Earnings', value: `₹${Math.round(result.yearlyInterest).toLocaleString('en-IN')}` },
                { label: 'Total Interest over 5 Years', value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
                { label: 'Net Monthly Income (After Tax)', value: `₹${Math.round(result.netMonthlyAfterTax).toLocaleString('en-IN')}` },
                { label: 'Post-Tax Effective Yield', value: `${result.postTaxYield.toFixed(2)}%` },
            ],
            projectionTitle: 'Monthly Payout Schedule (60 Months)',
            projectionColumns: ['Month', 'Monthly Payout', 'Cumulative Income'],
            projectionRows: result.schedule.map((r: any) => [
                `Month ${r.month}`,
                `₹${Math.round(r.payout).toLocaleString('en-IN')}`,
                `₹${Math.round(r.cumulative).toLocaleString('en-IN')}`,
            ]),
            filename: `FinCalix_POMIS_Report_${tag}`,
        });
    };

    const handleExcelExport = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        await exportToExcel({
            title: 'Post Office MIS (Monthly Income Scheme) Report',
            inputs: [
                { label: 'Investment Amount', value: `₹${Math.round(result.clampedInvestment).toLocaleString('en-IN')}` },
                { label: 'Account Type', value: isJoint ? 'Joint Account' : 'Single Account' },
                { label: 'Interest Rate', value: `${rate}% p.a.` },
                { label: 'Tenure', value: '5 Years (60 months)' },
            ],
            results: [
                { label: 'Monthly Income (Gross)', value: `₹${Math.round(result.monthlyIncome).toLocaleString('en-IN')}` },
                { label: 'Annual Earnings', value: `₹${Math.round(result.yearlyInterest).toLocaleString('en-IN')}` },
                { label: 'Total Interest over 5 Years', value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
                { label: 'Net Monthly Income (After Tax)', value: `₹${Math.round(result.netMonthlyAfterTax).toLocaleString('en-IN')}` },
                { label: 'Post-Tax Effective Yield', value: `${result.postTaxYield.toFixed(2)}%` },
            ],
            projectionTitle: 'Monthly Payout Schedule (60 Months)',
            projectionColumns: ['Month', 'Monthly Payout', 'Cumulative Income'],
            projectionRows: result.schedule.map((r: any) => [
                `Month ${r.month}`,
                `₹${Math.round(r.payout).toLocaleString('en-IN')}`,
                `₹${Math.round(r.cumulative).toLocaleString('en-IN')}`,
            ]),
            filename: `FinCalix_POMIS_Report_${tag}`,
        });
    };

    const totalPages = Math.ceil(result.schedule.length / ITEMS_PER_PAGE);
    const paginatedMonths = result.schedule.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm font-semibold focus:outline-none focus:border-brand-blue";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                            <ArrowLeft size={18} className="text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">{t('pomis.title')}</h1>
                            <p className="text-muted-foreground text-xs">{t('pomis.subtitle')}</p>
                        </div>
                    </div>
                    {saved ? (
                        <div className="flex gap-1">
                            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                                <Check size={18} />
                            </div>
                            <button onClick={handleRemove} className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 transition-all active:scale-95">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleSave} className="p-2 rounded-xl bg-card border border-border text-brand-blue">
                            <Save size={18} />
                        </button>
                    )}
                </div>
                <RiskCategoryTags risk={riskConfig.risk} categories={riskConfig.categories} />
            </div>

            <div className="px-4 pt-5 pb-28 space-y-4">
                <div className="space-y-3">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-muted-foreground text-xs font-medium">{t('pomis.totalInvestment')}</label>
                            <p className="text-brand-blue/80 text-[10px] font-medium">{t('pomis.max')}: {isJoint ? '₹15L' : '₹9L'}</p>
                        </div>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={investment} onChange={e => setInvestment(Number(e.target.value) || 0)} className={inputCls + " pl-8"} />
                        </div>
                    </div>
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">{t('pomis.interestRate')}</label>
                        <p className="text-muted-foreground text-[10px] mb-1">{t('pomis.currentRate')}</p>
                        <div className="relative">
                            <input type="number" value={rate} step={0.1} onChange={e => setRate(Number(e.target.value) || 0)} className={inputCls + " pr-8"} />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                        </div>
                    </div>

                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">Investment Start Date (optional)</label>
                        <DateInput
                            value={pomisStartDate}
                            onChange={setPomisStartDate}
                            max={new Date().toISOString().slice(0, 10)}
                            className={inputCls}
                        />
                    </div>

                    {/* Account type toggle */}
                    <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                        <div>
                            <p className="text-foreground font-medium text-sm">{t('pomis.jointAccount')}</p>
                            <p className="text-muted-foreground text-xs">{t('pomis.jointAccountDesc')}</p>
                        </div>
                        <button onClick={() => setIsJoint(p => !p)}
                            className={`w-12 h-7 rounded-full p-0.5 transition-colors ${isJoint ? 'bg-brand-blue' : 'bg-muted-foreground/30'}`}>
                            <motion.div layout className={`w-6 h-6 rounded-full bg-white shadow ${isJoint ? 'ml-auto' : 'ml-0'}`} />
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-brand-blue/20 to-blue-500/10 border border-brand-blue/30 p-5">
                    <p className="text-muted-foreground text-xs font-medium mb-1">{t('pomis.grossMonthlyIncome')}</p>
                    <p className="text-foreground font-bold text-3xl">{fmtINR(result.monthlyIncome)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-muted-foreground text-[11px]">{t('pomis.investedAmount')}</p>
                            <p className="text-foreground font-bold text-base">{fmtINR(result.clampedInvestment)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[11px]">{t('pomis.totalEarnings5y')}</p>
                            <p className="text-brand-green font-bold text-base">{fmtINR(result.totalInterest)}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-4 bg-muted/30">
                        <div className="flex items-center gap-2">
                            <BrainCircuit size={18} className="text-brand-blue" />
                            <span className="text-foreground font-semibold text-sm">{t('pomis.decisionAnalytics')}</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence initial={false}>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                <div className="px-4 pb-4 space-y-6 pt-2">

                                    <div className="flex items-center justify-end gap-2 border-b border-border pb-4">
                                        <button onClick={handlePDFExport} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-blue/10 text-brand-blue text-xs font-medium hover:bg-brand-blue/20 transition-colors">
                                            <FileText size={14} /> {t('pomis.exportPDF')}
                                        </button>
                                        <button onClick={handleExcelExport} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-green/10 text-brand-green text-xs font-medium hover:bg-brand-green/20 transition-colors">
                                            <Download size={14} /> {t('pomis.exportExcel')}
                                        </button>
                                    </div>

                                    {/* 1. Final Recommendation */}
                                    <div className={`p-4 rounded-xl border ${recommendation.status === 'success' ? 'bg-brand-green/10 border-brand-green/30' : recommendation.status === 'warning' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-brand-blue/10 border-brand-blue/30'}`}>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <ShieldCheck size={16} className={recommendation.status === 'success' ? 'text-brand-green' : recommendation.status === 'warning' ? 'text-orange-500' : 'text-brand-blue'} />
                                            <h3 className={`text-sm font-bold ${recommendation.status === 'success' ? 'text-brand-green' : recommendation.status === 'warning' ? 'text-orange-600 dark:text-orange-400' : 'text-brand-blue'}`}>
                                                {t('pomis.finalRecommendation')}
                                            </h3>
                                        </div>
                                        <p className="text-foreground font-semibold text-sm mb-1">{recommendation.title}</p>
                                        <p className="text-muted-foreground text-xs leading-relaxed">{recommendation.description}</p>
                                    </div>

                                    {/* 2. Smart Insights */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Activity size={14} /> {t('pomis.smartInsights')}
                                        </h3>
                                        <div className="grid gap-2">
                                            {investment > maxLimit && (
                                                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3">
                                                    <Info size={16} className="text-orange-500 shrink-0 mt-0.5" />
                                                    <p className="text-[11px] font-medium text-foreground">{t('pomis.amountExceedsLimit', { limit: maxLimit / 100000 })}</p>
                                                </div>
                                            )}
                                            {result.postTaxYield < inflation ? (
                                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3">
                                                    <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5" />
                                                    <p className="text-[11px] font-medium text-red-500">{t('pomis.postTaxBelowInflation', { yield: result.postTaxYield.toFixed(2), inflation })}</p>
                                                </div>
                                            ) : (
                                                <div className="p-3 rounded-xl bg-brand-green/10 border border-brand-green/20 flex gap-3">
                                                    <TrendingUp size={16} className="text-brand-green shrink-0 mt-0.5" />
                                                    <p className="text-[11px] font-medium text-brand-green">{t('pomis.cashflowBeatsInflation')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. Tax Analysis */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <BarChart2 size={14} /> {t('pomis.taxationNetIncome')}
                                        </h3>
                                        
                                        <TaxInputGroup 
                                            income={userIncome} setIncome={setUserIncome} 
                                            regime={taxRegime} setRegime={setTaxRegime} 
                                        />

                                        <div className="space-y-2 bg-background p-3 rounded-xl border border-border mt-3">
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-muted-foreground text-[11px]">{t('pomis.grossAnnualIncome')}</span>
                                                <span className="text-foreground font-medium text-[11px]">{fmtINR(result.yearlyInterest)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-muted-foreground text-[11px]">{t('pomis.estAnnualTax')}</span>
                                                <span className="text-red-500 font-bold text-[11px] font-mono">-{fmtINR(result.annualTaxOnInterest)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 pt-2 border-t border-border">
                                                <span className="text-foreground font-semibold text-[11px]">{t('pomis.netMonthlyPayout')}</span>
                                                <span className="text-brand-green font-bold text-[12px]">{fmtINR(result.netMonthlyAfterTax)}/mo</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 bg-muted/50 px-2 rounded-lg mt-1">
                                                <span className="text-foreground font-semibold text-[11px]">{t('pomis.postTaxEffectiveYield')}</span>
                                                <span className="text-brand-blue font-bold text-[12px]">{result.postTaxYield.toFixed(2)}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. Alternative: Reinvestment Scenario */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <RotateCw size={14} /> {t('pomis.reinvestPayoutsRD')}
                                        </h3>
                                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-muted-foreground text-[10px] font-medium">{t('pomis.postalRDRate')}</span>
                                                <div className="relative">
                                                    <input type="number" value={reinvestRate} step={0.1} onChange={e => setReinvestRate(Number(e.target.value) || 0)} className="w-16 bg-background border border-border rounded-md px-2 py-1 text-foreground text-xs font-semibold focus:outline-none focus:border-amber-500 pr-5" />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">%</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-muted-foreground text-[10px] mb-1">{t('pomis.maturityIfReinvested')}</p>
                                                    <p className="text-amber-500 font-bold text-sm">{fmtINR(result.reinvestMaturity)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground text-[10px] mb-1">{t('pomis.extraWealthGained')}</p>
                                                    <p className="text-amber-600 dark:text-amber-400 font-bold text-sm">+{fmtINR(result.reinvestGain)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5. Alternative: Bank FD */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <RotateCw size={14} /> {t('pomis.bankFDComparison')}
                                        </h3>
                                        <div className="bg-muted border border-border rounded-xl p-3">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-muted-foreground text-[10px] font-medium">{t('pomis.fdRate')}</span>
                                                <div className="relative">
                                                    <input type="number" value={fdRate} step={0.1} onChange={e => setFdRate(Number(e.target.value) || 0)} className="w-16 bg-background border border-border rounded-md px-2 py-1 text-foreground text-xs font-semibold focus:outline-none focus:border-brand-blue pr-5" />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">%</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-muted-foreground text-[10px] mb-1">{t('pomis.misPostTaxInterest')}</p>
                                                    <p className="text-foreground font-bold text-sm">{fmtINR(result.netTotalInterest)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground text-[10px] mb-1">{t('pomis.fdPostTaxInterest')}</p>
                                                    <p className={`font-bold text-sm ${result.fdPostTaxInterest > result.netTotalInterest ? 'text-brand-green' : 'text-foreground'}`}>{fmtINR(result.fdPostTaxInterest)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 6. Inflation impact */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <TrendingUp size={14} /> {t('pomis.inflationImpact')}
                                        </h3>
                                        <div className="bg-muted border border-border rounded-xl p-3 flex justify-between items-center">
                                            <div>
                                                <label className="text-muted-foreground text-[10px] font-medium block mb-1">{t('pomis.inflationRate')}</label>
                                                <input type="number" value={inflation} onChange={e => setInflation(Number(e.target.value) || 0)} className="w-20 bg-background border border-border rounded-md px-2 py-1 text-foreground text-xs font-semibold focus:outline-none focus:border-brand-blue" />
                                            </div>
                                            <div className="text-right">
                                                <p className="text-muted-foreground text-[10px] mb-1">{t('pomis.purchasingPowerPrincipal')}</p>
                                                <p className="text-foreground font-bold text-sm">{fmtINR(result.realPrincipalValue)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 7. Growth Breakdown (Months) */}
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('pomis.monthlyPayoutSchedule')}</h3>
                                        </div>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-3 bg-muted px-3 py-2">
                                                {[t('pomis.month'), t('pomis.payout'), t('pomis.cumulative')].map(h => (
                                                    <p key={h} className="text-muted-foreground text-[9px] font-bold uppercase">{h}</p>
                                                ))}
                                            </div>
                                            {paginatedMonths.map((row, i) => (
                                                <div key={row.month} className={`grid grid-cols-3 px-3 py-1.5 text-[10px] ${i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                                                    <p className="text-foreground font-medium">{t('pomis.monthNumber', { number: row.month })}</p>
                                                    <p className="text-brand-green font-semibold">{fmtINR(row.payout)}</p>
                                                    <p className="text-foreground">{fmtINR(row.cumulative)}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Pagination */}
                                        {totalPages > 1 && (
                                            <div className="flex items-center justify-between pt-2">
                                                <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="p-1 rounded-lg hover:bg-muted disabled:opacity-50">
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                    {t('pomis.pageOf', { current: currentPage + 1, total: totalPages })}
                                                </span>
                                                <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} className="p-1 rounded-lg hover:bg-muted disabled:opacity-50">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {pomisStatus && (
                <LiveStatusCard
                    title="MIS Status Today"
                    subtitle={`${pomisStatus.monthsCompleted} of 60 months complete`}
                    startDate={pomisStartDate}
                    metrics={[
                        { label: 'Monthly Income', value: formatINR(pomisStatus.monthlyIncome), color: 'green' },
                        { label: 'Total Received', value: formatINR(pomisStatus.totalIncomeReceived), color: 'blue' },
                        { label: 'Months Left', value: `${pomisStatus.monthsRemaining}` },
                    ]}
                    progressPercent={(pomisStatus.monthsCompleted / 60) * 100}
                    progressLabel={`${pomisStatus.monthsCompleted} of 60 months (${((pomisStatus.monthsCompleted / 60) * 100).toFixed(0)}%)`}
                    insightText={`Received ${formatINR(pomisStatus.totalIncomeReceived)} income so far. ${pomisStatus.monthsRemaining} months to maturity on ${new Date(pomisStatus.maturityDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}.`}
                />
            )}

            <DisclaimerComponent module="pomis" />
        </div>
    );
}
