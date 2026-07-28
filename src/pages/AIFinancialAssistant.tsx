import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Home, GraduationCap, Car, Umbrella, Briefcase, TrendingUp, PiggyBank, Shield, AlertTriangle, CheckCircle, Check, Share2, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { formatINR } from '../utils/calculations';
import { exportToPDF as exportToPDFNew, dateTag, type ExportConfig } from '../utils/exportReport';
import { AnalyticsService } from '../lib/analytics';
import { nativeShare } from '../utils/nativeShare';
import { useAppColors } from '../theme/useAppColors';

interface GoalPlan {
    goalId: string;
    goalLabel: string;
    icon: React.ElementType;
    gradient: string;
    recommendations: { icon: React.ElementType; title: string; value: string; detail: string; color: string }[];
    timeline: string;
    monthlySIP: number;
    targetCorpus: number;
}

interface FinancialPlan {
    score: number;
    goalPlans: GoalPlan[];
    alerts: { type: 'warning' | 'positive'; text: string }[];
    totalMonthlySIP: number;
    monthlyBudget: { savings: number; investments: number; emi: number; expenses: number };
    postTaxMonthly: number;
    annualTax: number;
    needs50: number;
    wants30: number;
    savings20: number;
    maxEmiAllowed: number;
    maxAdditionalEmi: number;
    emiRatio: number;
}

const goalsMeta = [
    { id: 'house', icon: Home, gradient: 'from-emerald-500 to-teal-600' },
    { id: 'education', icon: GraduationCap, gradient: 'from-blue-500 to-indigo-600' },
    { id: 'retirement', icon: Umbrella, gradient: 'from-purple-500 to-violet-600' },
    { id: 'car', icon: Car, gradient: 'from-amber-500 to-orange-600' },
    { id: 'wealth', icon: TrendingUp, gradient: 'from-sky-500 to-blue-600' },
    { id: 'business', icon: Briefcase, gradient: 'from-rose-500 to-pink-600' },
];

export default function AIFinancialAssistant() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const c = useAppColors();
    useEffect(() => { AnalyticsService.trackScreen('Financial_Advisor'); }, []);

    // Build goals with translated labels
    const goals = goalsMeta.map(g => ({ ...g, label: t(`advisor.goals.${g.id}`) }));

    const [salary, setSalary] = useState(50000);
    const [age, setAge] = useState(28);
    const [expenses, setExpenses] = useState(25000);
    const [savings, setSavings] = useState(100000);
    const [emi, setEmi] = useState(0);
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

    const toggleGoal = (id: string) => {
        setSelectedGoals(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    const plan = useMemo((): FinancialPlan | null => {
        if (!showResults || selectedGoals.length === 0) return null;

        // ── Rough India income-tax estimate (new regime, FY 2025-26 onwards) ──
        const annualGross = salary * 12;
        const estimateAnnualTax = (gross: number): number => {
            const taxable = Math.max(0, gross - 75000); // standard deduction u/s 16(ia)
            const slabs = [
                { upto: 400000, rate: 0 },
                { upto: 800000, rate: 0.05 },
                { upto: 1200000, rate: 0.10 },
                { upto: 1600000, rate: 0.15 },
                { upto: 2000000, rate: 0.20 },
                { upto: 2400000, rate: 0.25 },
                { upto: Infinity, rate: 0.30 },
            ];
            let tax = 0; let prev = 0;
            for (const slab of slabs) {
                if (taxable <= prev) break;
                tax += (Math.min(taxable, slab.upto) - prev) * slab.rate;
                prev = slab.upto;
            }
            // Rebate u/s 87A: nil tax up to ₹12L taxable, marginal relief above
            tax = taxable <= 1200000 ? 0 : Math.min(tax, taxable - 1200000);
            // Add 4% cess
            return Math.round(tax * 1.04);
        };
        const annualTax = estimateAnnualTax(annualGross);
        const postTaxAnnual = annualGross - annualTax;
        const postTaxMonthly = Math.round(postTaxAnnual / 12);

        const monthlySavings = salary - expenses - emi;
        const savingsRatio = monthlySavings / salary * 100;
        // EMI-to-NMI ratio uses post-tax monthly (industry standard)
        const emiRatio = postTaxMonthly > 0 ? (emi / postTaxMonthly) * 100 : 0;
        // Max eligible additional EMI at 40% of post-tax monthly
        const maxEmiAllowed = Math.round(postTaxMonthly * 0.40);
        const maxAdditionalEmi = Math.max(0, maxEmiAllowed - emi);
        const emergencyMonths = expenses > 0 ? savings / expenses : 0;
        const annualIncome = salary * 12;

        // 50-30-20 on post-tax income
        const needs50 = Math.round(postTaxMonthly * 0.50);
        const wants30 = Math.round(postTaxMonthly * 0.30);
        const savings20 = Math.round(postTaxMonthly * 0.20);

        // Compute health score
        let score = 0;
        if (savingsRatio >= 30) score += 30; else if (savingsRatio >= 20) score += 22; else if (savingsRatio >= 10) score += 12; else score += 5;
        if (emiRatio <= 20) score += 25; else if (emiRatio <= 30) score += 18; else if (emiRatio <= 40) score += 10; else score += 3;
        if (emergencyMonths >= 6) score += 25; else if (emergencyMonths >= 3) score += 15; else score += 5;
        const idealInvestPct = Math.min(100 - age, 80);
        score += Math.min(20, Math.round(savingsRatio / idealInvestPct * 20));
        score = Math.min(100, score);

        // Helper to compute SIP future value
        const sipFV = (sip: number, years: number, rate: number = 12) => {
            const r = rate / 12 / 100;
            const n = years * 12;
            return sip * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
        };

        const sipForCorpus = (corpus: number, years: number, rate: number = 12) => {
            const r = rate / 12 / 100;
            const n = years * 12;
            const factor = (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
            return corpus / factor;
        };

        // Build goal-specific plans
        const goalPlans: GoalPlan[] = selectedGoals.map(gId => {
            const goalData = goals.find(g => g.id === gId)!;
            const recs: GoalPlan['recommendations'] = [];
            let timeline = '';
            let monthlySIP = 0;
            let targetCorpus = 0;

            switch (gId) {
                case 'house': {
                    const affordability = Math.round(annualIncome * 5);
                    const recommendedEMI = Math.round(salary * 0.28);
                    const downPayment = Math.round(affordability * 0.2);
                    const downPaymentYears = downPayment > savings ? Math.ceil((downPayment - savings) / (monthlySavings * 0.4) / 12) : 0;
                    monthlySIP = Math.round((downPayment - savings) > 0 ? (downPayment - savings) / (downPaymentYears * 12) : 0);
                    targetCorpus = downPayment;
                    timeline = downPaymentYears > 0 ? t('advisor.rec.yearsToSaveDownPayment', { years: downPaymentYears }) : t('advisor.rec.downPaymentReady');
                    recs.push(
                        { icon: Home, title: t('advisor.rec.homeLoanAffordability'), value: formatINR(affordability), detail: t('advisor.rec.basedOn5xIncome'), color: '#10B981' },
                        { icon: PiggyBank, title: t('advisor.rec.recommendedMaxEMI'), value: formatINR(recommendedEMI) + '/mo', detail: t('advisor.rec.pctOfMonthlyIncome', { pct: 28 }), color: '#3B82F6' },
                        { icon: Shield, title: t('advisor.rec.downPaymentTarget'), value: formatINR(downPayment), detail: t('advisor.rec.pctOfPropertyValue', { pct: 20, timeline }), color: '#8B5CF6' },
                    );
                    break;
                }
                case 'education': {
                    const yearsToEducation = Math.max(5, 18 - (age > 30 ? age - 28 : 0));
                    const educationCost = 2500000;
                    monthlySIP = Math.round(sipForCorpus(educationCost, yearsToEducation));
                    targetCorpus = educationCost;
                    timeline = t('advisor.rec.nYears', { n: yearsToEducation });
                    recs.push(
                        { icon: GraduationCap, title: t('advisor.rec.educationCorpusTarget'), value: formatINR(educationCost), detail: t('advisor.rec.inYearsAtCurrentCosts', { years: yearsToEducation }), color: '#3B82F6' },
                        { icon: TrendingUp, title: t('advisor.rec.requiredMonthlySIP'), value: formatINR(monthlySIP) + '/mo', detail: t('advisor.rec.investEquityForYears', { years: yearsToEducation }), color: '#10B981' },
                        { icon: PiggyBank, title: t('advisor.rec.projectedGrowth'), value: formatINR(sipFV(monthlySIP, yearsToEducation)), detail: t('advisor.rec.at12Return'), color: '#8B5CF6' },
                    );
                    break;
                }
                case 'retirement': {
                    const retireAge = 60;
                    const yearsToRetire = retireAge - age;
                    const monthlyCorpus = expenses * 1.5;
                    const corpusNeeded = monthlyCorpus * 12 * 25;
                    monthlySIP = Math.round(sipForCorpus(corpusNeeded, yearsToRetire));
                    targetCorpus = corpusNeeded;
                    timeline = t('advisor.rec.yearsToRetirement', { years: yearsToRetire });
                    recs.push(
                        { icon: Umbrella, title: t('advisor.rec.retirementCorpus'), value: formatINR(corpusNeeded), detail: t('advisor.rec.comfortableLifeAfterAge', { age: retireAge }), color: '#8B5CF6' },
                        { icon: TrendingUp, title: t('advisor.rec.monthlySIPRequired'), value: formatINR(monthlySIP) + '/mo', detail: t('advisor.rec.yearsOfInvesting', { years: yearsToRetire }), color: '#10B981' },
                        { icon: Shield, title: t('advisor.rec.monthlyPension'), value: formatINR(monthlyCorpus) + '/mo', detail: t('advisor.rec.withdrawalRate', { pct: 4 }), color: '#F59E0B' },
                    );
                    break;
                }
                case 'car': {
                    const carBudget = Math.round(salary * 15);
                    const carEMI = Math.round(carBudget * 0.8 / 60);
                    const downPay = Math.round(carBudget * 0.2);
                    const saveMonths = monthlySavings > 0 ? Math.ceil(downPay / (monthlySavings * 0.3)) : 60;
                    monthlySIP = Math.round(downPay / Math.max(saveMonths, 1));
                    targetCorpus = carBudget;
                    timeline = t('advisor.rec.yearsToSaveDownPayment', { years: Math.ceil(saveMonths / 12) });
                    recs.push(
                        { icon: Car, title: t('advisor.rec.affordableCarBudget'), value: formatINR(carBudget), detail: t('advisor.rec.monthsSalary', { months: 15 }), color: '#F59E0B' },
                        { icon: PiggyBank, title: t('advisor.rec.downPayment20'), value: formatINR(downPay), detail: t('advisor.rec.savePerMonthForMonths', { amount: formatINR(monthlySIP), months: saveMonths }), color: '#3B82F6' },
                        { icon: Shield, title: t('advisor.rec.estimatedCarEMI'), value: formatINR(carEMI) + '/mo', detail: t('advisor.rec.financedOverYears', { pct: 80, years: 5 }), color: '#10B981' },
                    );
                    break;
                }
                case 'wealth': {
                    const idealSIP = Math.round(monthlySavings * 0.5);
                    const fv5 = sipFV(idealSIP, 5);
                    const fv10 = sipFV(idealSIP, 10);
                    const fv20 = sipFV(idealSIP, 20);
                    monthlySIP = idealSIP;
                    targetCorpus = fv10;
                    timeline = t('advisor.rec.growthPlanTimeline');
                    recs.push(
                        { icon: TrendingUp, title: t('advisor.rec.monthlySIPLabel'), value: formatINR(idealSIP) + '/mo', detail: t('advisor.rec.pctOfSurplus', { pct: 50 }), color: '#10B981' },
                        { icon: PiggyBank, title: t('advisor.rec.fiveYearValue'), value: formatINR(fv5), detail: t('advisor.rec.at12Return'), color: '#3B82F6' },
                        { icon: Shield, title: t('advisor.rec.tenYearValue'), value: formatINR(fv10), detail: t('advisor.rec.powerOfCompounding'), color: '#8B5CF6' },
                        { icon: Sparkles, title: t('advisor.rec.twentyYearValue'), value: formatINR(fv20), detail: t('advisor.rec.longTermWealthCreation'), color: '#F59E0B' },
                    );
                    break;
                }
                case 'business': {
                    const businessFund = Math.round(annualIncome * 1.5);
                    const saveYears = 3;
                    monthlySIP = Math.round(sipForCorpus(businessFund, saveYears, 10));
                    targetCorpus = businessFund;
                    timeline = t('advisor.rec.yearsToBuildFund', { years: saveYears });
                    recs.push(
                        { icon: Briefcase, title: t('advisor.rec.businessFundTarget'), value: formatINR(businessFund), detail: t('advisor.rec.annualIncomeRecommended', { factor: '1.5x' }), color: '#EC4899' },
                        { icon: TrendingUp, title: t('advisor.rec.monthlySavingsNeeded'), value: formatINR(monthlySIP) + '/mo', detail: t('advisor.rec.saveOverYears', { years: saveYears }), color: '#10B981' },
                        { icon: Shield, title: t('advisor.rec.emergencyBuffer'), value: formatINR(expenses * 12), detail: t('advisor.rec.monthsExpensesBeforeStarting', { months: 12 }), color: '#F59E0B' },
                    );
                    break;
                }
            }

            return { goalId: gId, goalLabel: goalData.label, icon: goalData.icon, gradient: goalData.gradient, recommendations: recs, timeline, monthlySIP, targetCorpus };
        });

        const totalMonthlySIP = goalPlans.reduce((sum, gp) => sum + gp.monthlySIP, 0);

        // Emergency fund recommendation is always added
        const emergencyTarget = expenses * 6;

        // Alerts
        const alerts: FinancialPlan['alerts'] = [];
        // EMI alert: RBI guideline is 40% of net monthly income
        if (emiRatio > 40) alerts.push({ type: 'warning', text: t('advisor.alert.emiAboveLimit', { pct: emiRatio.toFixed(0), limit: 40 }) });
        else if (emiRatio > 30) alerts.push({ type: 'warning', text: t('advisor.alert.emiWarning', { pct: emiRatio.toFixed(0), limit: 40 }) });
        if (savingsRatio < 15) alerts.push({ type: 'warning', text: t('advisor.alert.lowSavings', { pct: savingsRatio.toFixed(0), target: 20 }) });
        if (emergencyMonths < 3) alerts.push({ type: 'warning', text: t('advisor.alert.emergencyLow', { months: emergencyMonths.toFixed(1) }) });
        else if (emergencyMonths < 6) alerts.push({ type: 'warning', text: t('advisor.alert.emergencyBelow6', { months: emergencyMonths.toFixed(1), target: formatINR(expenses * 6) }) });
        if (totalMonthlySIP > monthlySavings * 0.9) alerts.push({ type: 'warning', text: t('advisor.alert.sipExceedsSurplus', { sip: formatINR(totalMonthlySIP) }) });
        if (savingsRatio >= 25) alerts.push({ type: 'positive', text: t('advisor.alert.greatSavings', { pct: savingsRatio.toFixed(0) }) });
        if (emiRatio <= 15 && emi > 0) alerts.push({ type: 'positive', text: t('advisor.alert.debtWellManaged', { pct: emiRatio.toFixed(0) }) });
        if (emergencyMonths >= 6) alerts.push({ type: 'positive', text: t('advisor.alert.solidEmergencyFund', { months: emergencyMonths.toFixed(1) }) });

        const monthlyBudget = {
            savings: monthlySavings,
            investments: Math.min(totalMonthlySIP, monthlySavings * 0.8),
            emi: emi,
            expenses: expenses,
        };

        return {
            score, goalPlans, alerts, totalMonthlySIP, monthlyBudget,
            postTaxMonthly, annualTax,
            needs50, wants30, savings20,
            maxEmiAllowed, maxAdditionalEmi, emiRatio,
        };
    }, [showResults, salary, age, expenses, savings, emi, selectedGoals]);

    const handleDownloadPDF = async () => {
        if (!plan) return;
        const tag = dateTag();

        const inputs: ExportConfig['inputs'] = [
            { label: t('advisor.export.monthlySalary'), value: formatINR(salary) },
            { label: t('advisor.export.age'), value: `${age} ${t('advisor.export.years')}` },
            { label: t('advisor.export.monthlyExpenses'), value: formatINR(expenses) },
            { label: t('advisor.export.existingSavings'), value: formatINR(savings) },
            { label: t('advisor.export.existingEMI'), value: formatINR(emi) },
            { label: t('advisor.export.selectedGoals'), value: selectedGoals.map(g => goals.find(gl => gl.id === g)?.label).join(', ') },
        ];

        const results: ExportConfig['results'] = [
            { label: t('advisor.export.financialHealthScore'), value: `${plan.score}/100` },
            { label: t('advisor.export.monthlySurplus'), value: formatINR(salary - expenses - emi) },
            { label: t('advisor.export.totalMonthlySIP'), value: formatINR(plan.totalMonthlySIP) },
            { label: t('advisor.export.needs50'), value: formatINR(plan.needs50) },
            { label: t('advisor.export.wants30'), value: formatINR(plan.wants30) },
            { label: t('advisor.export.savings20'), value: formatINR(plan.savings20) },
            { label: t('advisor.export.maxEMIAllowed'), value: formatINR(plan.maxEmiAllowed) },
            { label: t('advisor.export.emiToIncomeRatio'), value: `${plan.emiRatio.toFixed(1)}%` },
        ];

        // Goal-wise breakdown as projection table
        const goalRows: (string | number)[][] = [];
        plan.goalPlans.forEach(gp => {
            goalRows.push([gp.goalLabel, formatINR(gp.monthlySIP) + '/mo', formatINR(gp.targetCorpus), gp.timeline]);
            gp.recommendations.forEach(r => {
                goalRows.push(['  ' + r.title, r.value, r.detail, '']);
            });
        });

        // Alerts as additional table
        const alertRows = plan.alerts.map(a => [
            a.type === 'warning' ? t('advisor.export.warning') : t('advisor.export.positive'),
            a.text,
        ]);

        const config: ExportConfig = {
            title: t('advisor.export.reportTitle'),
            subtitle: t('advisor.export.reportSubtitle'),
            inputs,
            results,
            chart: {
                type: 'pie',
                segments: [
                    { label: t('advisor.chart.expenses'), value: expenses, color: '#EF4444' },
                    { label: t('advisor.chart.emi'), value: emi || 1, color: '#F59E0B' },
                    { label: t('advisor.chart.investmentsSIP'), value: plan.totalMonthlySIP, color: '#10B981' },
                    { label: t('advisor.chart.remaining'), value: Math.max(0, salary - expenses - emi - plan.totalMonthlySIP), color: '#6366F1' },
                ],
            },
            projectionTitle: t('advisor.export.projectionTitle'),
            projectionColumns: [t('advisor.export.colGoal'), t('advisor.export.colMonthlySIP'), t('advisor.export.colTargetCorpus'), t('advisor.export.colTimeline')],
            projectionRows: goalRows,
            additionalTables: alertRows.length > 0 ? [{
                title: t('advisor.export.alertsTitle'),
                columns: [t('advisor.export.colType'), t('advisor.export.colDetails')],
                rows: alertRows,
            }] : [],
            filename: `FinCalix_Financial_Plan_${tag}`,
        };

        await exportToPDFNew(config);
    };

    return (
        <div className="min-h-dvh bg-background animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background  px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-amber-500" />
                        <div>
                            <h1 className="text-lg font-bold text-foreground">{t('advisor.title')}</h1>
                            <p className="text-muted-foreground text-xs">{t('advisor.subtitle')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 pb-[80px] pt-4">
                <AnimatePresence mode="wait">
                    {!showResults ? (
                        <motion.div key="inputs" initial={{ opacity: 1 }} exit={{ opacity: 0, x: -50 }}>
                            {/* Income Details */}
                            <div className="mb-5">
                                <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-brand-green/10 flex items-center justify-center text-brand-green text-xs font-bold">1</span>
                                    {t('advisor.step1')}
                                </h2>
                                <div className="space-y-3">
                                    <NumberInput label={t('advisor.monthlyIncome')} value={salary} onChange={setSalary} min={5000} max={10000000} prefix="₹" />
                                    <NumberInput label={t('advisor.age')} value={age} onChange={setAge} min={18} max={70} suffix={` ${t('advisor.export.years')}`} />
                                    <NumberInput label={t('advisor.monthlyExpenses')} value={expenses} onChange={setExpenses} min={0} max={salary} prefix="₹" />
                                    <NumberInput label={t('advisor.existingSavings')} value={savings} onChange={setSavings} min={0} max={100000000} prefix="₹" />
                                    <NumberInput label={t('advisor.existingEMI')} value={emi} onChange={setEmi} min={0} max={salary} prefix="₹" />
                                </div>
                            </div>

                            {/* Multi-Goal Selection */}
                            <div className="mb-5">
                                <h2 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple text-xs font-bold">2</span>
                                    {t('advisor.step2')}
                                </h2>
                                <p className="text-muted-foreground text-[11px] mb-3 ml-8">{t('advisor.selectGoals')}</p>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {goals.map((g) => {
                                        const Icon = g.icon;
                                        const isSelected = selectedGoals.includes(g.id);
                                        return (
                                            <motion.button
                                                key={g.id}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => toggleGoal(g.id)}
                                                className={`p-3.5 rounded-xl border text-left transition-all relative ${isSelected
                                                    ? `bg-gradient-to-br ${g.gradient} border-white/20 shadow-lg`
                                                    : 'bg-card border-border hover:border-foreground/30'
                                                    }`}
                                            >
                                                {isSelected && (
                                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                                                        <Check size={12} className="text-foreground" />
                                                    </motion.div>
                                                )}
                                                <Icon size={20} className={isSelected ? 'text-foreground' : 'text-muted-foreground'} />
                                                <p className={`text-xs font-bold mt-2 ${isSelected ? 'text-foreground' : 'text-muted-foreground/80'}`}>{g.label}</p>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                                {selectedGoals.length > 0 && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-brand-purple font-bold mt-3 text-center">
                                        {t('advisor.goalsSelected', { count: selectedGoals.length })}
                                    </motion.p>
                                )}
                            </div>

                            {/* Generate Button */}
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setShowResults(true)}
                                disabled={selectedGoals.length === 0}
                                className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${selectedGoals.length > 0
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20'
                                    : 'bg-card border border-border text-muted-foreground'
                                    }`}
                            >
                                <Sparkles size={18} />
                                {t('advisor.generatePlan')}
                            </motion.button>
                        </motion.div>
                    ) : plan && (
                        <motion.div key="results" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}>
                            {/* Financial Health Score */}
                            <div className="p-6 rounded-2xl bg-card border border-border mb-5 text-center">
                                <p className="text-muted-foreground text-sm mb-2">{t('advisor.financialScore')}</p>
                                <div className="relative w-32 h-32 mx-auto mb-3">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                        <circle cx="60" cy="60" r="50" stroke={c.border} strokeWidth="10" fill="none" />
                                        <motion.circle
                                            cx="60" cy="60" r="50"
                                            stroke={plan.score >= 70 ? '#10B981' : plan.score >= 40 ? '#F59E0B' : '#EF4444'}
                                            strokeWidth="10" fill="none"
                                            strokeLinecap="round"
                                            strokeDasharray={`${plan.score * 3.14} 314`}
                                            initial={{ strokeDashoffset: 314 }}
                                            animate={{ strokeDashoffset: 0 }}
                                            transition={{ duration: 1.2, ease: 'easeOut' }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div>
                                            <motion.p className="text-3xl font-bold text-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                                                {plan.score}
                                            </motion.p>
                                            <p className="text-[10px] text-muted-foreground font-bold">/100</p>
                                        </div>
                                    </div>
                                </div>
                                <p className={`text-sm font-bold ${plan.score >= 70 ? 'text-brand-green' : plan.score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                                    {plan.score >= 80 ? t('advisor.score.excellent') : plan.score >= 60 ? t('advisor.score.good') : plan.score >= 40 ? t('advisor.score.needsImprovement') : t('advisor.score.atRisk')}
                                </p>
                            </div>

                            {/* Monthly Budget Overview */}
                            <div className="p-4 rounded-2xl bg-card border border-border mb-4">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{t('advisor.monthlyBudget')}</h3>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <BudgetCard label={t('advisor.budget.grossIncome')} value={formatINR(salary)} color="#10B981" />
                                    <BudgetCard label={t('advisor.budget.estPostTax')} value={formatINR(plan.postTaxMonthly)} color="#3B82F6" />
                                    <BudgetCard label={t('advisor.expenses')} value={formatINR(expenses)} color="#EF4444" />
                                    <BudgetCard label={t('advisor.emi')} value={formatINR(emi)} color="#F59E0B" />
                                </div>
                                <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">{t('advisor.totalSIPNeeded')}</span>
                                        <span className={`text-sm font-bold ${plan.totalMonthlySIP > (salary - expenses - emi) * 0.9 ? 'text-red-500' : 'text-brand-green'}`}>
                                            {formatINR(plan.totalMonthlySIP)}/mo
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 50-30-20 Rule (on post-tax income) */}
                            <div className="p-4 rounded-2xl bg-card border border-border mb-4">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('advisor.rule503020')}</h3>
                                    <span className="text-[10px] text-muted-foreground">{t('advisor.onPostTaxIncome')}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mb-3">{t('advisor.estPostTax')}: <span className="font-bold text-foreground">{formatINR(plan.postTaxMonthly)}/mo</span> ({t('advisor.taxPerYear', { amount: formatINR(plan.annualTax) })})</p>
                                {/* Progress bar */}
                                <div className="flex rounded-full overflow-hidden h-3 mb-3">
                                    <div style={{ width: '50%' }} className="bg-blue-500" />
                                    <div style={{ width: '30%' }} className="bg-purple-500" />
                                    <div style={{ width: '20%' }} className="bg-green-500" />
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto mb-1" />
                                        <p className="text-[10px] text-muted-foreground font-bold">{t('advisor.budget.needs')}</p>
                                        <p className="text-foreground text-xs font-bold">{formatINR(plan.needs50)}</p>
                                        <p className="text-[9px] text-muted-foreground">50%</p>
                                    </div>
                                    <div>
                                        <div className="w-2 h-2 rounded-full bg-purple-500 mx-auto mb-1" />
                                        <p className="text-[10px] text-muted-foreground font-bold">{t('advisor.budget.wants')}</p>
                                        <p className="text-foreground text-xs font-bold">{formatINR(plan.wants30)}</p>
                                        <p className="text-[9px] text-muted-foreground">30%</p>
                                    </div>
                                    <div>
                                        <div className="w-2 h-2 rounded-full bg-green-500 mx-auto mb-1" />
                                        <p className="text-[10px] text-muted-foreground font-bold">{t('advisor.budget.savingsLabel')}</p>
                                        <p className="text-foreground text-xs font-bold">{formatINR(plan.savings20)}</p>
                                        <p className="text-[9px] text-muted-foreground">20%</p>
                                    </div>
                                </div>
                            </div>

                            {/* Loan Eligibility */}
                            <div className="p-4 rounded-2xl bg-card border border-border mb-5">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{t('advisor.loan.title')}</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                                        <span className="text-xs text-muted-foreground">{t('advisor.loan.netMonthlyIncome')}</span>
                                        <span className="text-sm font-bold text-foreground">{formatINR(plan.postTaxMonthly)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                                        <span className="text-xs text-muted-foreground">{t('advisor.loan.maxEMIAllowed')}</span>
                                        <span className="text-sm font-bold text-brand-green">{formatINR(plan.maxEmiAllowed)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                                        <span className="text-xs text-muted-foreground">{t('advisor.loan.currentEMI')}</span>
                                        <span className={`text-sm font-bold ${plan.emiRatio > 40 ? 'text-red-500' : 'text-foreground'}`}>{formatINR(emi)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-xs text-muted-foreground">{t('advisor.loan.additionalHeadroom')}</span>
                                        <span className={`text-sm font-bold ${plan.maxAdditionalEmi > 0 ? 'text-brand-green' : 'text-red-500'}`}>
                                            {plan.maxAdditionalEmi > 0 ? `+ ${formatINR(plan.maxAdditionalEmi)}` : t('advisor.loan.overLimit')}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-2">{t('advisor.loan.disclaimer')}</p>
                            </div>


                            {/* Alerts */}
                            {plan.alerts.length > 0 && (
                                <div className="space-y-2 mb-5">
                                    {plan.alerts.map((alert, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 + i * 0.1 }}
                                            className={`flex items-start gap-3 p-3.5 rounded-xl border ${alert.type === 'warning'
                                                ? 'bg-red-500/5 border-red-500/20'
                                                : 'bg-brand-green/5 border-brand-green/20'
                                                }`}
                                        >
                                            {alert.type === 'warning'
                                                ? <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                                : <CheckCircle size={16} className="text-brand-green mt-0.5 flex-shrink-0" />
                                            }
                                            <p className="text-xs text-foreground/80 leading-relaxed">{alert.text}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* Goal-wise Plans */}
                            <div className="mb-5">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Sparkles size={13} className="text-amber-500" />
                                    {t('advisor.goalWisePlan')}
                                </h3>
                                <div className="space-y-3">
                                    {plan.goalPlans.map((gp, gi) => {
                                        const Icon = gp.icon;
                                        const isExpanded = expandedGoal === gp.goalId;
                                        return (
                                            <motion.div
                                                key={gp.goalId}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.4 + gi * 0.12 }}
                                                className="rounded-2xl bg-card border border-border overflow-hidden"
                                            >
                                                {/* Goal Header */}
                                                <button
                                                    onClick={() => setExpandedGoal(isExpanded ? null : gp.goalId)}
                                                    className={`w-full p-4 flex items-center gap-3 bg-gradient-to-r ${gp.gradient}`}
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                                                        <Icon size={20} className="text-foreground" />
                                                    </div>
                                                    <div className="flex-1 text-left">
                                                        <p className="text-foreground font-bold text-sm">{gp.goalLabel}</p>
                                                        <p className="text-foreground/70 text-[11px]">{gp.timeline}</p>
                                                    </div>
                                                    <div className="text-right mr-2">
                                                        <p className="text-foreground font-bold text-sm">{formatINR(gp.monthlySIP)}/mo</p>
                                                        <p className="text-foreground/50 text-[10px]">{t('advisor.monthlySIP')}</p>
                                                    </div>
                                                    {isExpanded ? <ChevronUp size={16} className="text-foreground/60" /> : <ChevronDown size={16} className="text-foreground/60" />}
                                                </button>

                                                {/* Expanded Details */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="p-4 space-y-3">
                                                                <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                                                                    <Shield size={14} className="text-amber-500" />
                                                                    <span className="text-xs text-muted-foreground">{t('advisor.targetCorpus')}:</span>
                                                                    <span className="text-sm font-bold text-foreground">{formatINR(gp.targetCorpus)}</span>
                                                                </div>
                                                                {gp.recommendations.map((rec, i) => {
                                                                    const RecIcon = rec.icon;
                                                                    return (
                                                                        <div key={i} className="flex items-center gap-3">
                                                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${rec.color}15` }}>
                                                                                <RecIcon size={16} style={{ color: rec.color }} />
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{rec.title}</p>
                                                                                <p className="text-foreground font-bold text-sm">{rec.value}</p>
                                                                                <p className="text-muted-foreground text-[11px]">{rec.detail}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Emergency Fund */}
                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 mb-5">
                                <div className="flex items-center gap-3">
                                    <Shield size={20} className="text-amber-500" />
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold">{t('advisor.emergencyFund')}</p>
                                        <p className="text-foreground font-bold">{formatINR(expenses * 6)}</p>
                                        <p className="text-xs text-muted-foreground">{t('advisor.emergencyFundDetail', { target: 6, saved: (savings / expenses).toFixed(1) })}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 mb-3">
                                <button
                                    onClick={() => setShowResults(false)}
                                    className="flex-1 py-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm"
                                >
                                    {t('advisor.restart')}
                                </button>
                                <button
                                    onClick={() => {
                                        const goalSummary = plan.goalPlans.map(gp => `${gp.goalLabel}: SIP ${formatINR(gp.monthlySIP)}/mo → ${formatINR(gp.targetCorpus)}`).join('\n');
                                        nativeShare(t('advisor.share.title'), t('advisor.share.body', { score: plan.score, goalSummary, totalSIP: formatINR(plan.totalMonthlySIP) }));
                                    }}
                                    className="flex-1 py-4 rounded-2xl bg-brand-purple text-white font-bold text-sm shadow-lg shadow-brand-purple/20 flex items-center justify-center gap-2"
                                >
                                    <Share2 size={16} /> {t('advisor.sharePlan')}
                                </button>
                            </div>
                            <button
                                onClick={handleDownloadPDF}
                                className="w-full py-4 rounded-2xl bg-brand-green/10 border border-brand-green/30 text-brand-green font-bold text-sm flex items-center justify-center gap-2"
                            >
                                <Download size={16} /> {t('advisor.downloadPlan')}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <DisclaimerComponent module="advisor" />
        </div>
    );
}

function BudgetCard({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="p-3 rounded-xl bg-muted text-center">
            <div className="w-2 h-2 rounded-full mx-auto mb-1.5" style={{ backgroundColor: color }} />
            <p className="text-[10px] text-muted-foreground uppercase font-bold">{label}</p>
            <p className="text-foreground font-bold text-sm">{value}</p>
        </div>
    );
}
