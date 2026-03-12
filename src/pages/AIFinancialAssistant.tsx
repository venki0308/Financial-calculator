import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Home, GraduationCap, Car, Umbrella, Briefcase, TrendingUp, PiggyBank, Shield, AlertTriangle, CheckCircle, Check, Share2, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { formatINR } from '../utils/calculations';
import { exportToPDF } from '../utils/exportUtils';
import { AnalyticsService } from '../lib/analytics';
import { nativeShare } from '../utils/nativeShare';

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
 useEffect(() => { AnalyticsService.trackScreen('Financial_Advisor'); }, []);
 const navigate = useNavigate();
 const { t } = useTranslation();

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

 const monthlySavings = salary - expenses - emi;
 const savingsRatio = monthlySavings / salary * 100;
 const emiRatio = emi / salary * 100;
 const emergencyMonths = savings / expenses;
 const annualIncome = salary * 12;

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
 timeline = downPaymentYears > 0 ? `${downPaymentYears} years to save down payment` : 'Down payment ready!';
 recs.push(
 { icon: Home, title: 'Home Loan Affordability', value: formatINR(affordability), detail: 'Based on 5x annual income', color: '#10B981' },
 { icon: PiggyBank, title: 'Recommended Max EMI', value: formatINR(recommendedEMI) + '/mo', detail: '28% of monthly income', color: '#3B82F6' },
 { icon: Shield, title: 'Down Payment Target', value: formatINR(downPayment), detail: `20% of property value • ${timeline}`, color: '#8B5CF6' },
 );
 break;
 }
 case 'education': {
 const yearsToEducation = Math.max(5, 18 - (age > 30 ? age - 28 : 0));
 const educationCost = 2500000;
 monthlySIP = Math.round(sipForCorpus(educationCost, yearsToEducation));
 targetCorpus = educationCost;
 timeline = `${yearsToEducation} years`;
 recs.push(
 { icon: GraduationCap, title: 'Education Corpus Target', value: formatINR(educationCost), detail: `In ${yearsToEducation} years at current costs`, color: '#3B82F6' },
 { icon: TrendingUp, title: 'Required Monthly SIP', value: formatINR(monthlySIP) + '/mo', detail: `Invest in equity mutual funds for ${yearsToEducation} years`, color: '#10B981' },
 { icon: PiggyBank, title: 'Projected Growth', value: formatINR(sipFV(monthlySIP, yearsToEducation)), detail: 'At 12% annual return', color: '#8B5CF6' },
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
 timeline = `${yearsToRetire} years to retirement`;
 recs.push(
 { icon: Umbrella, title: 'Retirement Corpus', value: formatINR(corpusNeeded), detail: `For comfortable life after age ${retireAge}`, color: '#8B5CF6' },
 { icon: TrendingUp, title: 'Monthly SIP Required', value: formatINR(monthlySIP) + '/mo', detail: `${yearsToRetire} years of investing`, color: '#10B981' },
 { icon: Shield, title: 'Monthly Pension (est.)', value: formatINR(monthlyCorpus) + '/mo', detail: '4% withdrawal rate', color: '#F59E0B' },
 );
 break;
 }
 case 'car': {
 const carBudget = Math.round(salary * 15);
 const carEMI = Math.round(carBudget * 0.8 / 60);
 const downPay = Math.round(carBudget * 0.2);
 const saveMonths = Math.ceil(downPay / (monthlySavings * 0.3));
 monthlySIP = Math.round(downPay / Math.max(saveMonths, 1));
 targetCorpus = carBudget;
 timeline = `${Math.ceil(saveMonths / 12)} years to save down payment`;
 recs.push(
 { icon: Car, title: 'Affordable Car Budget', value: formatINR(carBudget), detail: '~15 months salary', color: '#F59E0B' },
 { icon: PiggyBank, title: 'Down Payment (20%)', value: formatINR(downPay), detail: `Save ~${formatINR(monthlySIP)}/mo for ${saveMonths} months`, color: '#3B82F6' },
 { icon: Shield, title: 'Estimated Car EMI', value: formatINR(carEMI) + '/mo', detail: '80% financed over 5 years', color: '#10B981' },
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
 timeline = '10+ years growth plan';
 recs.push(
 { icon: TrendingUp, title: 'Monthly SIP', value: formatINR(idealSIP) + '/mo', detail: '50% of monthly surplus', color: '#10B981' },
 { icon: PiggyBank, title: '5-Year Value', value: formatINR(fv5), detail: 'At 12% annual return', color: '#3B82F6' },
 { icon: Shield, title: '10-Year Value', value: formatINR(fv10), detail: 'Power of compounding', color: '#8B5CF6' },
 { icon: Sparkles, title: '20-Year Value', value: formatINR(fv20), detail: 'Long-term wealth creation', color: '#F59E0B' },
 );
 break;
 }
 case 'business': {
 const businessFund = Math.round(annualIncome * 1.5);
 const saveYears = 3;
 monthlySIP = Math.round(sipForCorpus(businessFund, saveYears, 10));
 targetCorpus = businessFund;
 timeline = `${saveYears} years to build fund`;
 recs.push(
 { icon: Briefcase, title: 'Business Fund Target', value: formatINR(businessFund), detail: '1.5x annual income recommended', color: '#EC4899' },
 { icon: TrendingUp, title: 'Monthly Savings Needed', value: formatINR(monthlySIP) + '/mo', detail: `Save over ${saveYears} years`, color: '#10B981' },
 { icon: Shield, title: 'Emergency Buffer', value: formatINR(expenses * 12), detail: '12 months expenses before starting', color: '#F59E0B' },
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
 if (emiRatio > 35) alerts.push({ type: 'warning', text: `Your EMI is ${emiRatio.toFixed(0)}% of income — dangerously high. Recommended: below 30%.` });
 if (savingsRatio < 15) alerts.push({ type: 'warning', text: `You're saving only ${savingsRatio.toFixed(0)}% of income. Target: 20%+ for financial security.` });
 if (emergencyMonths < 3) alerts.push({ type: 'warning', text: `Emergency fund covers only ${emergencyMonths.toFixed(1)} months. Build 6-month buffer first.` });
 if (totalMonthlySIP > monthlySavings * 0.9) alerts.push({ type: 'warning', text: `Total SIP needed (${formatINR(totalMonthlySIP)}/mo) exceeds 90% of your surplus. Consider prioritizing goals.` });
 if (savingsRatio >= 25) alerts.push({ type: 'positive', text: `Great savings rate of ${savingsRatio.toFixed(0)}%! You're building wealth faster than most.` });
 if (emiRatio <= 15 && emi > 0) alerts.push({ type: 'positive', text: `Your debt is well-managed at ${emiRatio.toFixed(0)}% of income. Keep it up!` });
 if (emergencyMonths >= 6) alerts.push({ type: 'positive', text: `You have a solid emergency fund covering ${emergencyMonths.toFixed(1)} months. Well done!` });

 const monthlyBudget = {
 savings: monthlySavings,
 investments: Math.min(totalMonthlySIP, monthlySavings * 0.8),
 emi: emi,
 expenses: expenses,
 };

 return { score, goalPlans, alerts, totalMonthlySIP, monthlyBudget };
 }, [showResults, salary, age, expenses, savings, emi, selectedGoals]);

 const handleDownloadPDF = async () => {
 if (!plan) return;
 const headers = ['Category', 'Details'];
 const data: (string | number)[][] = [
 ['Monthly Salary', formatINR(salary)],
 ['Monthly Expenses', formatINR(expenses)],
 ['Monthly Surplus', formatINR(salary - expenses - emi)],
 ['Financial Health Score', `${plan.score}/100`],
 ['---', '---'],
 ['SELECTED GOALS', selectedGoals.map(g => goals.find(gl => gl.id === g)?.label).join(', ')],
 ['Total Monthly SIP Needed', formatINR(plan.totalMonthlySIP)],
 ['---', '---'],
 ];
 plan.goalPlans.forEach(gp => {
 data.push([`Goal: ${gp.goalLabel}`, `SIP: ${formatINR(gp.monthlySIP)}/mo | Target: ${formatINR(gp.targetCorpus)}`]);
 gp.recommendations.forEach(r => { data.push([r.title, `${r.value} - ${r.detail}`]); });
 data.push(['---', '---']);
 });
 plan.alerts.forEach(a => { data.push([a.type === 'warning' ? '⚠ Alert' : '✓ Positive', a.text]); });
 await exportToPDF('Financial Plan Report', headers, data, 'FinCalix_Financial_Plan');
 };

 return (
 <div className="min-h-dvh bg-background animate-fade-in">
 {/* Header */}
 <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-border">
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
 <NumberInput label="Age" value={age} onChange={setAge} min={18} max={70} suffix=" years" />
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
 <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--bg-primary)]/20 flex items-center justify-center">
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
 {selectedGoals.length} goal{selectedGoals.length > 1 ? 's' : ''} selected
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
 <circle cx="60" cy="60" r="50" stroke="#1E293B" strokeWidth="10" fill="none" />
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
 {plan.score >= 80 ? 'Excellent!' : plan.score >= 60 ? 'Good' : plan.score >= 40 ? 'Needs Improvement' : 'At Risk'}
 </p>
 </div>

 {/* Monthly Budget Overview */}
 <div className="p-4 rounded-2xl bg-card border border-border mb-5">
 <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{t('advisor.monthlyBudget')}</h3>
 <div className="grid grid-cols-2 gap-2.5">
 <BudgetCard label={t('advisor.monthlyIncome')} value={formatINR(salary)} color="#10B981" />
 <BudgetCard label={t('advisor.expenses')} value={formatINR(expenses)} color="#EF4444" />
 <BudgetCard label={t('advisor.emi')} value={formatINR(emi)} color="#F59E0B" />
 <BudgetCard label={t('advisor.savings')} value={formatINR(salary - expenses - emi)} color="#3B82F6" />
 </div>
 <div className="mt-3 p-3 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning-border)]/20">
 <div className="flex justify-between items-center">
 <span className="text-xs text-muted-foreground">Total SIP needed for all goals</span>
 <span className={`text-sm font-bold ${plan.totalMonthlySIP > (salary - expenses - emi) * 0.9 ? 'text-red-500' : 'text-brand-green'}`}>
 {formatINR(plan.totalMonthlySIP)}/mo
 </span>
 </div>
 </div>
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
 Goal-wise Financial Plan
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
 <div className="w-10 h-10 rounded-xl bg-[var(--bg-primary)]/15 flex items-center justify-center">
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
 <span className="text-xs text-muted-foreground">Target Corpus:</span>
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
 <div className="p-4 rounded-2xl bg-[var(--warning-bg)] border border-[var(--warning-border)]/20 mb-5">
 <div className="flex items-center gap-3">
 <Shield size={20} className="text-amber-500" />
 <div>
 <p className="text-xs text-muted-foreground uppercase font-bold">Emergency Fund</p>
 <p className="text-foreground font-bold">{formatINR(expenses * 6)}</p>
 <p className="text-xs text-muted-foreground">6 months of expenses • You have {(savings / expenses).toFixed(1)} months saved</p>
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
 nativeShare('My Financial Plan - FinCalix', `My Financial Health Score: ${plan.score}/100\n\n${goalSummary}\n\nTotal SIP: ${formatINR(plan.totalMonthlySIP)}/mo\n\nGenerated with FinCalix`);
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
