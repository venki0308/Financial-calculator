import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronUp, Save, Check, FileText, Download, ChevronLeft, ChevronRight, Activity, BrainCircuit, Target, BarChart2, Info, TrendingUp, ShieldCheck, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import { useCalculatorStore } from '../store/useCalculatorStore';
import TaxInputGroup from '../components/TaxInputGroup';
import RiskCategoryTags from '../components/RiskCategoryTags';
import { TaxRegime, calculateAssetTax } from '../utils/taxEngine';
import { DecisionEngine } from '../services/DecisionEngine';
import DateInput from '../components/DateInput';
import LiveStatusCard from '../components/LiveStatusCard';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { calculateNscStatus, type NscStatusInput } from '../utils/investmentStatusEngine';

const fmtINR = (v: number) => formatINR(Math.round(v));
const ITEMS_PER_PAGE = 5;
const LOCK_IN = 5;

export default function NSCCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addSaved, removeSaved } = useCalculatorStore();

    useEffect(() => { AnalyticsService.trackScreen('NSC_Calculator'); }, []);

    const [investment, setInvestment] = useState(50000);
    const [rate, setRate] = useState(7.7);
    const [annualIncome, setAnnualIncome] = useState(1200000);
    const [taxRegime, setTaxRegime] = useState<TaxRegime>('new');
    const [inflation, setInflation] = useState(5.0); // RBI FY 2025-26 CPI ~4.8%

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [saved, setSaved] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [nscPurchaseDate, setNscPurchaseDate] = useState('');

    const result = useMemo(() => {
        // NSC: annually compounded, 5-year lock-in
        const maturity = investment * Math.pow(1 + rate / 100, LOCK_IN);
        const totalInterest = maturity - investment;

        // Year-by-year growth
        const rawTable: { year: number; openBal: number; interest: number; cumInterest: number; closeBal: number }[] = [];
        let bal = investment;
        for (let y = 1; y <= LOCK_IN; y++) {
            const interest = bal * (rate / 100);
            const newBal = bal + interest;
            rawTable.push({ year: y, openBal: bal, interest, cumInterest: newBal - investment, closeBal: newBal });
            bal = newBal;
        }

        // 80C Deduction: Investment in Year 1 up to 1.5L
        const sec80cDeduction = Math.min(investment, 150000);

        // Marginal tax rate: tax on (income + avg annual interest) minus tax on income, divided by interest
        // NSC interest is taxable as IFOS in each year it accrues (deemed reinvestment rule)
        const avgAnnualInterest = totalInterest / LOCK_IN;
        const taxImpact = calculateAssetTax({
            annualIncome,
            regime: taxRegime,
            assetInterest: avgAnnualInterest,
            deduction80c: sec80cDeduction
        });
        const effectiveRate = taxImpact.effectiveTaxRate / 100; // marginal rate on scheme interest
        const taxSaving = taxImpact.taxSaved80C; // 80C upfront tax benefit

        // Apply marginal rate to each year's accrued interest
        const table = rawTable.map(row => ({
            ...row,
            taxOnInterest: Math.max(0, Math.round(row.interest * effectiveRate))
        }));

        const totalTaxOnInterest = table.reduce((s, r) => s + r.taxOnInterest, 0);
        const postTaxMaturity = maturity - totalTaxOnInterest + taxSaving;
        const postTaxCAGR = (Math.pow(postTaxMaturity / investment, 1 / LOCK_IN) - 1) * 100;
        const realValue = postTaxMaturity / Math.pow(1 + inflation / 100, LOCK_IN);
        const realReturn = postTaxCAGR - inflation;

        return {
            maturity, totalInterest, table, sec80cDeduction, taxSaving,
            taxOnInterest: totalTaxOnInterest, postTaxMaturity, postTaxCAGR, realValue, realReturn, taxImpact
        };
    }, [investment, rate, annualIncome, taxRegime, inflation]);

    const nscStatus = useMemo(() => {
        if (!nscPurchaseDate) return null;
        return calculateNscStatus({ principal: investment, rate, purchaseDate: nscPurchaseDate });
    }, [investment, rate, nscPurchaseDate]);

    const riskConfig = DecisionEngine.getRiskConfig('NSC');
    const recommendation = useMemo(() => DecisionEngine.getRecommendation({
        calculatorId: 'NSC',
        realReturn: result.realReturn,
        is80CEligible: taxRegime === 'old' && result.taxSaving > 0,
        postTaxCAGR: result.postTaxCAGR,
        liquidityScore: 2,
        riskLevel: riskConfig.risk
    }), [result, taxRegime, riskConfig.risk]);

    const handleSave = () => {
        const calcId = crypto.randomUUID();
        addSaved({
            id: calcId,
            calculatorType: t('nsc.calculatorType'),
            inputValues: { investment, rate, annualIncome, taxRegime },
            resultValues: { primary: result.maturity, ...result },
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
            title: t('nsc.reportTitle'),
            inputs: [
                { label: t('nsc.investmentAmountLabel'), value: `₹${Math.round(investment).toLocaleString('en-IN')}` },
                { label: t('nsc.interestRateLabel'), value: `${rate}% ${t('nsc.perAnnum')}` },
                { label: t('nsc.tenureLabel'), value: t('nsc.fiveYearsFixed') },
                { label: t('nsc.taxRegimeLabel'), value: taxRegime === 'old' ? t('nsc.oldRegime') : t('nsc.newRegime') },
            ],
            results: [
                { label: t('nsc.maturityAmountLabel'), value: `₹${Math.round(result.maturity).toLocaleString('en-IN')}` },
                { label: t('nsc.totalInterestEarnedLabel'), value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
                { label: t('nsc.sec80CDeductionLabel'), value: `₹${Math.round(result.sec80cDeduction).toLocaleString('en-IN')}` },
                { label: t('nsc.taxSavingLabel'), value: `₹${Math.round(result.taxSaving).toLocaleString('en-IN')}` },
                { label: t('nsc.postTaxMaturityLabel'), value: `₹${Math.round(result.postTaxMaturity).toLocaleString('en-IN')}` },
                { label: t('nsc.inflationAdjustedValueLabel'), value: `₹${Math.round(result.realValue).toLocaleString('en-IN')}` },
            ],
            chart: {
                type: 'pie',
                segments: [
                    { label: t('nsc.principalInvested'), value: investment, color: '#4F46E5' },
                    { label: t('nsc.interestEarnedChart'), value: result.totalInterest, color: '#10B981' },
                ],
            },
            projectionTitle: t('nsc.yearWiseGrowth'),
            projectionColumns: [t('nsc.yearCol'), t('nsc.openingBalanceCol'), t('nsc.interestEarnedCol'), t('nsc.closingBalanceCol')],
            projectionRows: result.table.map((y: any) => [
                `${t('nsc.yearPrefix')} ${y.year}`,
                `₹${Math.round(y.openBal).toLocaleString('en-IN')}`,
                `₹${Math.round(y.interest).toLocaleString('en-IN')}`,
                `₹${Math.round(y.closeBal).toLocaleString('en-IN')}`,
            ]),
            additionalTables: [
                ...(nscStatus ? [{
                    title: `${t('nsc.liveStatusAsOf')} ${new Date().toLocaleDateString('en-IN')})`,
                    columns: [t('nsc.metricCol'), t('nsc.valueCol')],
                    rows: [
                        [t('nsc.nscAge'), `${nscStatus.yearsCompleted}y ${nscStatus.monthsInCurrentYear}m`],
                        [t('nsc.currentValue'), fmtINR(nscStatus.valueToday)],
                        [t('nsc.interestEarnedMetric'), fmtINR(nscStatus.interestEarned)],
                        [t('nsc.maturityDate'), nscStatus.maturityDate],
                        [t('nsc.daysToMaturity'), String(nscStatus.daysToMaturity)],
                        [t('nsc.maturityValue'), fmtINR(nscStatus.maturityValue)],
                    ] as Array<Array<string | number>>,
                }] : []),
            ],
            filename: `FinCalix_NSC_Report_${tag}`,
        });
    };

    const handleExcelExport = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        await exportToExcel({
            title: t('nsc.reportTitle'),
            inputs: [
                { label: t('nsc.investmentAmountLabel'), value: `₹${Math.round(investment).toLocaleString('en-IN')}` },
                { label: t('nsc.interestRateLabel'), value: `${rate}% ${t('nsc.perAnnum')}` },
                { label: t('nsc.tenureLabel'), value: t('nsc.fiveYearsFixed') },
                { label: t('nsc.taxRegimeLabel'), value: taxRegime === 'old' ? t('nsc.oldRegime') : t('nsc.newRegime') },
            ],
            results: [
                { label: t('nsc.maturityAmountLabel'), value: `₹${Math.round(result.maturity).toLocaleString('en-IN')}` },
                { label: t('nsc.totalInterestEarnedLabel'), value: `₹${Math.round(result.totalInterest).toLocaleString('en-IN')}` },
                { label: t('nsc.sec80CDeductionLabel'), value: `₹${Math.round(result.sec80cDeduction).toLocaleString('en-IN')}` },
                { label: t('nsc.taxSavingLabel'), value: `₹${Math.round(result.taxSaving).toLocaleString('en-IN')}` },
                { label: t('nsc.postTaxMaturityLabel'), value: `₹${Math.round(result.postTaxMaturity).toLocaleString('en-IN')}` },
                { label: t('nsc.inflationAdjustedValueLabel'), value: `₹${Math.round(result.realValue).toLocaleString('en-IN')}` },
            ],
            projectionTitle: t('nsc.yearWiseGrowth'),
            projectionColumns: [t('nsc.yearCol'), t('nsc.openingBalanceCol'), t('nsc.interestEarnedCol'), t('nsc.closingBalanceCol')],
            projectionRows: result.table.map((y: any) => [
                `${t('nsc.yearPrefix')} ${y.year}`,
                `₹${Math.round(y.openBal).toLocaleString('en-IN')}`,
                `₹${Math.round(y.interest).toLocaleString('en-IN')}`,
                `₹${Math.round(y.closeBal).toLocaleString('en-IN')}`,
            ]),
            additionalTables: [
                ...(nscStatus ? [{
                    title: `${t('nsc.liveStatusAsOf')} ${new Date().toLocaleDateString('en-IN')})`,
                    columns: [t('nsc.metricCol'), t('nsc.valueCol')],
                    rows: [
                        [t('nsc.nscAge'), `${nscStatus.yearsCompleted}y ${nscStatus.monthsInCurrentYear}m`],
                        [t('nsc.currentValue'), fmtINR(nscStatus.valueToday)],
                        [t('nsc.interestEarnedMetric'), fmtINR(nscStatus.interestEarned)],
                        [t('nsc.maturityDate'), nscStatus.maturityDate],
                        [t('nsc.daysToMaturity'), String(nscStatus.daysToMaturity)],
                        [t('nsc.maturityValue'), fmtINR(nscStatus.maturityValue)],
                    ] as Array<Array<string | number>>,
                }] : []),
            ],
            filename: `FinCalix_NSC_Report_${tag}`,
        });
    };

    const totalPages = Math.ceil(result.table.length / ITEMS_PER_PAGE);
    const paginatedYears = result.table.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm font-semibold focus:outline-none focus:border-brand-gold";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                            <ArrowLeft size={18} className="text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">{t('nsc.title')}</h1>
                            <p className="text-muted-foreground text-xs">{t('nsc.subtitle')}</p>
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
                        <button onClick={handleSave} className="p-2 rounded-xl bg-card border border-border text-brand-gold">
                            <Save size={18} />
                        </button>
                    )}
                </div>
                <RiskCategoryTags risk={riskConfig.risk} categories={riskConfig.categories} />
            </div>

            <div className="px-4 pt-5 pb-28 space-y-4">
                <div className="space-y-3">
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">{t('nsc.totalInvestment')}</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={investment} onChange={e => setInvestment(Number(e.target.value) || 0)} className={inputCls + " pl-8"} />
                        </div>
                    </div>
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">{t('nsc.interestRatePA')}</label>
                        <p className="text-muted-foreground text-[10px] mb-1">{t('nsc.currentRate')}</p>
                        <div className="relative">
                            <input type="number" value={rate} step={0.1} onChange={e => setRate(Number(e.target.value) || 0)} className={inputCls + " pr-8"} />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">{t('nsc.purchaseDateLabel')}</label>
                        <DateInput
                            value={nscPurchaseDate}
                            onChange={setNscPurchaseDate}
                            max={new Date().toISOString().slice(0, 10)}
                            className={inputCls}
                        />
                    </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-brand-gold/20 to-amber-500/10 border border-brand-gold/30 p-5">
                    <p className="text-muted-foreground text-xs font-medium mb-1">{t('nsc.maturityAmount5Years')}</p>
                    <p className="text-foreground font-bold text-3xl">{fmtINR(result.maturity)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-muted-foreground text-[11px]">{t('nsc.totalInvested')}</p>
                            <p className="text-foreground font-bold text-base">{fmtINR(investment)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[11px]">{t('nsc.interestEarned')}</p>
                            <p className="text-brand-green font-bold text-base">{fmtINR(result.totalInterest)}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-4 bg-muted/30">
                        <div className="flex items-center gap-2">
                            <BrainCircuit size={18} className="text-brand-gold" />
                            <span className="text-foreground font-semibold text-sm">{t('nsc.decisionAnalytics')}</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>

                    <AnimatePresence initial={false}>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                <div className="px-4 pb-4 space-y-6 pt-2">

                                    <div className="flex items-center justify-end gap-2 border-b border-border pb-4">
                                        <button onClick={handlePDFExport} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-gold/10 text-brand-gold text-xs font-medium hover:bg-brand-gold/20 transition-colors">
                                            <FileText size={14} /> {t('nsc.exportPDF')}
                                        </button>
                                        <button onClick={handleExcelExport} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-green/10 text-brand-green text-xs font-medium hover:bg-brand-green/20 transition-colors">
                                            <Download size={14} /> {t('nsc.exportExcel')}
                                        </button>
                                    </div>

                                    {/* 1. Final Recommendation */}
                                    <div className={`p-4 rounded-xl border ${recommendation.status === 'success' ? 'bg-brand-green/10 border-brand-green/30' : recommendation.status === 'warning' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-brand-blue/10 border-brand-blue/30'}`}>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <ShieldCheck size={16} className={recommendation.status === 'success' ? 'text-brand-green' : recommendation.status === 'warning' ? 'text-orange-500' : 'text-brand-blue'} />
                                            <h3 className={`text-sm font-bold ${recommendation.status === 'success' ? 'text-brand-green' : recommendation.status === 'warning' ? 'text-orange-600 dark:text-orange-400' : 'text-brand-blue'}`}>
                                                {t('nsc.finalRecommendation')}
                                            </h3>
                                        </div>
                                        <p className="text-foreground font-semibold text-sm mb-1">{recommendation.title}</p>
                                        <p className="text-muted-foreground text-xs leading-relaxed">{recommendation.description}</p>
                                    </div>

                                    {/* 2. Tax Analysis */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <BarChart2 size={14} /> {t('nsc.taxAnalysis')}
                                        </h3>
                                        
                                        <TaxInputGroup 
                                            income={annualIncome} setIncome={setAnnualIncome} 
                                            regime={taxRegime} setRegime={setTaxRegime} 
                                        />

                                        <div className="space-y-2 bg-background p-3 rounded-xl border border-border">
                                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border border-dashed">
                                                <span className="text-muted-foreground text-xs font-semibold">{t('nsc.sec80CDeduction')}</span>
                                                <span className="text-brand-green font-bold text-xs">{fmtINR(result.sec80cDeduction)}</span>
                                            </div>
                                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border border-dashed">
                                                <span className="text-muted-foreground text-xs">{t('nsc.initialTaxSaving')}</span>
                                                <span className="text-brand-green font-bold text-xs">{fmtINR(result.taxSaving)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-muted-foreground text-[11px]">{t('nsc.grossMaturity')}</span>
                                                <span className="text-foreground font-medium text-[11px]">{fmtINR(result.maturity)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-muted-foreground text-[11px]">{t('nsc.totalTaxOnInterest5Yrs')}</span>
                                                <span className="text-red-500 font-bold text-[11px] font-mono">-{fmtINR(result.taxOnInterest)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 pt-2 border-t border-border">
                                                <span className="text-foreground font-semibold text-[11px]">{t('nsc.postTaxMaturity')}</span>
                                                <span className="text-brand-green font-bold text-[11px] font-mono">{fmtINR(result.postTaxMaturity)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 mt-1 bg-muted/50 px-2 rounded-lg">
                                                <span className="text-foreground font-semibold text-[11px]">{t('nsc.effectivePostTaxCAGR')}</span>
                                                <span className="text-brand-gold font-bold text-[13px]">{result.postTaxCAGR.toFixed(2)}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Inflation Adjustments */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <TrendingUp size={14} /> {t('nsc.realValuePurchasingPower')}
                                        </h3>
                                        <div className="bg-muted border border-border rounded-xl p-3">
                                            <label className="text-muted-foreground text-[10px] font-medium block mb-1">{t('nsc.expectedInflationRate')}</label>
                                            <div className="relative mb-3">
                                                <input type="number" value={inflation} onChange={e => setInflation(Number(e.target.value) || 0)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-xs font-semibold focus:outline-none focus:border-brand-gold" />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">%</span>
                                            </div>
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <p className="text-muted-foreground text-[10px] mb-1">{t('nsc.realValueAtMaturity')}</p>
                                                    <p className="text-foreground font-bold text-sm">{fmtINR(result.realValue)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-muted-foreground text-[10px] mb-1">{t('nsc.realAnnualReturn')}</p>
                                                    <p className={`font-bold text-sm ${result.realReturn >= 0 ? 'text-brand-green' : 'text-red-500'}`}>{result.realReturn.toFixed(2)}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. Year-by-year table */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('nsc.growthBreakdown')}</h3>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-5 bg-muted px-2 py-2">
                                                <p className="text-muted-foreground text-[9px] font-bold uppercase">{t('nsc.year')}</p>
                                                <p className="text-muted-foreground text-[9px] font-bold uppercase">{t('nsc.interest')}</p>
                                                <p className="text-muted-foreground text-[9px] font-bold uppercase">{t('nsc.tax')}</p>
                                                <p className="text-muted-foreground text-[9px] font-bold uppercase">{t('nsc.cumInt')}</p>
                                                <p className="text-muted-foreground text-[9px] font-bold uppercase text-right">{t('nsc.balance')}</p>
                                            </div>
                                            {paginatedYears.map((row, i) => (
                                                <div key={row.year} className={`grid grid-cols-5 px-2 py-2 text-[10px] ${i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                                                    <p className="text-foreground font-medium">{t('nsc.yr')} {row.year}</p>
                                                    <p className="text-brand-green">+{fmtINR(row.interest)}</p>
                                                    <p className="text-red-400">-{fmtINR(row.taxOnInterest)}</p>
                                                    <p className="text-foreground">{fmtINR(row.cumInterest)}</p>
                                                    <p className="text-foreground font-semibold text-right">{fmtINR(row.closeBal)}</p>
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
                                                    {t('nsc.page')} {currentPage + 1} {t('nsc.of')} {totalPages}
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

            {nscStatus && (
                <div className="px-4 mb-5">
                    <LiveStatusCard
                        calculatorType="NSC"
                        profileData={{ principal: investment, rate, purchaseDate: nscPurchaseDate }}
                        title={t('nsc.liveStatusTitle')}
                        subtitle={`${t('nsc.yearPrefix')} ${nscStatus.yearsCompleted} ${t('nsc.ofTotal')} 5${nscStatus.yearsCompleted >= 5 ? ` — ${t('nsc.matured')}` : ''}`}
                        startDate={nscPurchaseDate}
                        metrics={[
                            { label: t('nsc.invested'), value: fmtINR(investment) },
                            { label: t('nsc.currentValue'), value: fmtINR(nscStatus.valueToday), color: 'green' },
                            { label: t('nsc.interestLabel'), value: fmtINR(nscStatus.interestEarned), color: 'amber' },
                        ]}
                        progressPercent={(nscStatus.yearsCompleted / 5) * 100}
                        progressLabel={`${t('nsc.yearPrefix')} ${nscStatus.yearsCompleted} ${t('nsc.ofTotal')} 5 ${t('nsc.completed')}${nscStatus.daysToMaturity > 0 ? ` — ${nscStatus.daysToMaturity} ${t('nsc.daysToMaturitySuffix')}` : ''}`}
                        insightText={
                            nscStatus.yearsCompleted >= 5
                                ? `${t('nsc.maturedInsight', { maturityValue: fmtINR(nscStatus.maturityValue) })}`
                                : `${t('nsc.yearWiseValues')}: ${nscStatus.yearValues.slice(1, nscStatus.yearsCompleted + 2).map((v, i) => `${t('nsc.yr')}${i + 1}: ${fmtINR(v)}`).join(' | ')}`
                        }
                    />
                </div>
            )}

            <DisclaimerComponent module="nsc" />
        </div>
    );
}
