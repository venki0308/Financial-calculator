import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, ChevronDown, ChevronUp, Trash2, Calculator, TrendingUp, IndianRupee, Calendar, Percent, CreditCard, PiggyBank, Home, Briefcase, Heart, GraduationCap, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCalculatorStore, Calculation } from '../store/useCalculatorStore';
import { formatINR } from '../utils/calculations';

// Map calculator types to readable labels and icons
const calcMeta: Record<string, { label: string; icon: any; color: string; gradient: string }> = {
    'emi': { label: 'saved.calc.emiCalculator', icon: CreditCard, color: '#8B5CF6', gradient: 'from-violet-600/20 to-purple-600/20' },
    'EMI Calculator': { label: 'saved.calc.emiCalculator', icon: CreditCard, color: '#8B5CF6', gradient: 'from-violet-600/20 to-purple-600/20' },
    'Loan EMI Calculator': { label: 'saved.calc.loanEmi', icon: CreditCard, color: '#8B5CF6', gradient: 'from-violet-600/20 to-purple-600/20' },
    'sip': { label: 'saved.calc.sipCalculator', icon: TrendingUp, color: '#3B82F6', gradient: 'from-blue-600/20 to-indigo-600/20' },
    'SIP Calculator': { label: 'saved.calc.sipCalculator', icon: TrendingUp, color: '#3B82F6', gradient: 'from-blue-600/20 to-indigo-600/20' },
    'Advanced SIP Calculator': { label: 'saved.calc.advancedSip', icon: TrendingUp, color: '#3B82F6', gradient: 'from-blue-600/20 to-indigo-600/20' },
    'fd': { label: 'saved.calc.fdCalculator', icon: PiggyBank, color: '#F59E0B', gradient: 'from-amber-600/20 to-yellow-600/20' },
    'FD Calculator': { label: 'saved.calc.fdCalculator', icon: PiggyBank, color: '#F59E0B', gradient: 'from-amber-600/20 to-yellow-600/20' },
    'nps': { label: 'calculators.nps.name', icon: Heart, color: '#10B981', gradient: 'from-green-600/20 to-emerald-600/20' },
    'NPS Calculator': { label: 'calculators.nps.name', icon: Heart, color: '#10B981', gradient: 'from-green-600/20 to-emerald-600/20' },
    'ppf': { label: 'calculators.ppf.name', icon: PiggyBank, color: '#06B6D4', gradient: 'from-cyan-600/20 to-teal-600/20' },
    'PPF Calculator': { label: 'calculators.ppf.name', icon: PiggyBank, color: '#06B6D4', gradient: 'from-cyan-600/20 to-teal-600/20' },
    'epf': { label: 'calculators.epf.name', icon: Briefcase, color: '#14B8A6', gradient: 'from-teal-600/20 to-cyan-600/20' },
    'EPF Calculator': { label: 'calculators.epf.name', icon: Briefcase, color: '#14B8A6', gradient: 'from-teal-600/20 to-cyan-600/20' },
    'ssy': { label: 'calculators.ssy.name', icon: GraduationCap, color: '#EC4899', gradient: 'from-pink-600/20 to-rose-600/20' },
    'SSY Calculator': { label: 'calculators.ssy.name', icon: GraduationCap, color: '#EC4899', gradient: 'from-pink-600/20 to-rose-600/20' },
    'tax': { label: 'saved.calc.incomeTax', icon: IndianRupee, color: '#EF4444', gradient: 'from-red-600/20 to-orange-600/20' },
    'breakeven': { label: 'saved.calc.breakEven', icon: Calculator, color: '#22C55E', gradient: 'from-green-600/20 to-lime-600/20' },
    'Break Even Calculator': { label: 'saved.calc.breakEvenCalculator', icon: Calculator, color: '#22C55E', gradient: 'from-green-600/20 to-lime-600/20' },
    'home_loan': { label: 'saved.calc.homeLoan', icon: Home, color: '#8B5CF6', gradient: 'from-violet-600/20 to-purple-600/20' },
    'car_loan': { label: 'saved.calc.carLoan', icon: CreditCard, color: '#F97316', gradient: 'from-orange-600/20 to-amber-600/20' },
    'Car Loan Calculator': { label: 'saved.calc.carLoan', icon: CreditCard, color: '#F97316', gradient: 'from-orange-600/20 to-amber-600/20' },
    'lumpsum': { label: 'calculators.lumpsum.name', icon: TrendingUp, color: '#6366F1', gradient: 'from-indigo-600/20 to-blue-600/20' },
    'Lumpsum Calculator': { label: 'calculators.lumpsum.name', icon: TrendingUp, color: '#6366F1', gradient: 'from-indigo-600/20 to-blue-600/20' },
    'salary_hike': { label: 'calculators.salaryHike.name', icon: TrendingUp, color: '#22D3EE', gradient: 'from-cyan-600/20 to-sky-600/20' },
    'Salary Hike Calculator': { label: 'calculators.salaryHike.name', icon: TrendingUp, color: '#22D3EE', gradient: 'from-cyan-600/20 to-sky-600/20' },
    'gst': { label: 'saved.calc.gstCalculator', icon: Calculator, color: '#A855F7', gradient: 'from-purple-600/20 to-fuchsia-600/20' },
    'GST Calculator (standard)': { label: 'saved.calc.gstStandard', icon: Calculator, color: '#A855F7', gradient: 'from-purple-600/20 to-fuchsia-600/20' },
    'GST Calculator (reverse)': { label: 'saved.calc.gstReverse', icon: Calculator, color: '#A855F7', gradient: 'from-purple-600/20 to-fuchsia-600/20' },
    'GST Calculator (profit)': { label: 'saved.calc.gstProfitMargin', icon: Calculator, color: '#A855F7', gradient: 'from-purple-600/20 to-fuchsia-600/20' },
    'GST Calculator (itc)': { label: 'saved.calc.gstItc', icon: Calculator, color: '#A855F7', gradient: 'from-purple-600/20 to-fuchsia-600/20' },
    'GST Calculator (invoice)': { label: 'saved.calc.gstInvoice', icon: Calculator, color: '#A855F7', gradient: 'from-purple-600/20 to-fuchsia-600/20' },
    // Short-ID keys used by individual calculator pages
    'swp': { label: 'saved.calc.swpCalculator', icon: TrendingUp, color: '#EF4444', gradient: 'from-red-600/20 to-orange-600/20' },
    'rd': { label: 'saved.calc.rdCalculator', icon: PiggyBank, color: '#F59E0B', gradient: 'from-amber-600/20 to-yellow-600/20' },
    'ci': { label: 'saved.calc.compoundInterest', icon: Calculator, color: '#6366F1', gradient: 'from-indigo-600/20 to-purple-600/20' },
    'cagr': { label: 'saved.calc.cagrCalculator', icon: TrendingUp, color: '#6366F1', gradient: 'from-indigo-600/20 to-purple-600/20' },
    // GenericCalculator-based types (full name keys)
    'CAGR Calculator': { label: 'saved.calc.cagrCalculator', icon: TrendingUp, color: '#6366F1', gradient: 'from-indigo-600/20 to-purple-600/20' },
    'Gratuity Calculator': { label: 'saved.calc.gratuityCalculator', icon: Briefcase, color: '#F59E0B', gradient: 'from-amber-600/20 to-yellow-600/20' },
    'HRA Calculator': { label: 'saved.calc.hraCalculator', icon: Home, color: '#10B981', gradient: 'from-green-600/20 to-emerald-600/20' },
    'Goal SIP Calculator': { label: 'saved.calc.goalSip', icon: TrendingUp, color: '#3B82F6', gradient: 'from-blue-600/20 to-indigo-600/20' },
    'Step Up SIP': { label: 'saved.calc.stepUpSip', icon: TrendingUp, color: '#06B6D4', gradient: 'from-cyan-600/20 to-teal-600/20' },
    'Recurring Deposit': { label: 'saved.calc.rdCalculator', icon: PiggyBank, color: '#F59E0B', gradient: 'from-amber-600/20 to-yellow-600/20' },
    'NSC Calculator': { label: 'saved.calc.nscCalculator', icon: PiggyBank, color: '#14B8A6', gradient: 'from-teal-600/20 to-cyan-600/20' },
    'KVP Calculator': { label: 'saved.calc.kvpCalculator', icon: PiggyBank, color: '#22C55E', gradient: 'from-green-600/20 to-lime-600/20' },
    'SCSS Calculator': { label: 'saved.calc.scssCalculator', icon: Heart, color: '#EC4899', gradient: 'from-pink-600/20 to-rose-600/20' },
    'Post Office TD': { label: 'saved.calc.postOfficeTd', icon: PiggyBank, color: '#F97316', gradient: 'from-orange-600/20 to-amber-600/20' },
    'Post Office MIS': { label: 'saved.calc.postOfficeMis', icon: PiggyBank, color: '#8B5CF6', gradient: 'from-violet-600/20 to-purple-600/20' },
    'SWP Calculator': { label: 'saved.calc.swpCalculator', icon: TrendingUp, color: '#EF4444', gradient: 'from-red-600/20 to-orange-600/20' },
    'Villa Construction': { label: 'saved.calc.villaConstruction', icon: Home, color: '#F97316', gradient: 'from-orange-600/20 to-amber-600/20' },
    'Land Value': { label: 'saved.calc.landValueCalculator', icon: Home, color: '#22C55E', gradient: 'from-green-600/20 to-emerald-600/20' },
    'Flat Price': { label: 'saved.calc.flatPriceCalculator', icon: Home, color: '#3B82F6', gradient: 'from-blue-600/20 to-indigo-600/20' },
    'Simple Interest': { label: 'saved.calc.simpleInterest', icon: Calculator, color: '#F59E0B', gradient: 'from-amber-600/20 to-yellow-600/20' },
    'Compound Interest': { label: 'saved.calc.compoundInterest', icon: Calculator, color: '#6366F1', gradient: 'from-indigo-600/20 to-purple-600/20' },
    'Advanced Mortgage': { label: 'saved.calc.advancedMortgage', icon: Home, color: '#3B82F6', gradient: 'from-blue-600/20 to-indigo-600/20' },
    'Advanced Mortgage Calculator': { label: 'saved.calc.advancedMortgage', icon: Home, color: '#3B82F6', gradient: 'from-blue-600/20 to-indigo-600/20' },
    'Break-Even Calculator': { label: 'saved.calc.breakEven', icon: Calculator, color: '#22C55E', gradient: 'from-green-600/20 to-lime-600/20' },
    'Two Wheeler Loan': { label: 'saved.calc.twoWheeler', icon: CreditCard, color: '#06B6D4', gradient: 'from-cyan-600/20 to-teal-600/20' },
    'Gold Loan Calculator': { label: 'saved.calc.goldLoan', icon: IndianRupee, color: '#F59E0B', gradient: 'from-amber-600/20 to-yellow-600/20' },
    'Goal Planner': { label: 'saved.calc.goalPlanner', icon: TrendingUp, color: '#8B5CF6', gradient: 'from-violet-600/20 to-purple-600/20' },
    'Overdraft Calculator': { label: 'saved.calc.overdraftCalculator', icon: CreditCard, color: '#F97316', gradient: 'from-orange-600/20 to-amber-600/20' },
    'Live Loan Status': { label: 'saved.calc.loanTracker', icon: Activity, color: '#10B981', gradient: 'from-emerald-600/20 to-teal-600/20' },
};

const defaultMeta = { label: 'saved.calc.default', icon: Calculator, color: '#64748B', gradient: 'from-slate-600/20 to-gray-600/20' };

// Format input/result labels nicely
const labelMap: Record<string, string> = {
    principal: 'saved.label.principal', rate: 'saved.label.rate', years: 'saved.label.years', months: 'saved.label.months',
    tenure: 'saved.label.tenure', monthly: 'saved.label.monthly', annual: 'saved.label.annual', amount: 'saved.label.amount',
    emi: 'saved.label.emi', totalInterest: 'saved.label.totalInterest', totalPayment: 'saved.label.totalPayment',
    futureValue: 'saved.label.futureValue', invested: 'saved.label.invested', wealthGained: 'saved.label.wealthGained',
    maturity: 'saved.label.maturity', interest: 'saved.label.interest', corpus: 'saved.label.corpus',
    monthlyPension: 'saved.label.monthlyPension', lumpsum: 'saved.label.lumpsum', annuity: 'saved.label.annuity',
    primary: 'saved.label.primary', compounding: 'saved.label.compounding', retireAge: 'saved.label.retireAge',
    age: 'saved.label.age', annuityPct: 'saved.label.annuityPct', childAge: 'saved.label.childAge',
    price: 'saved.label.price', variable: 'saved.label.variable', fixed: 'saved.label.fixed',
    stepUp: 'saved.label.stepUp', goalTarget: 'saved.label.goalTarget', loanType: 'saved.label.loanType',
    method: 'saved.label.method', tenureUnit: 'saved.label.tenureUnit',
    items: 'saved.label.items', invoiceIsIGST: 'saved.label.invoiceIsIGST', stdAmount: 'saved.label.stdAmount', stdRate: 'saved.label.stdRate',
    stdDirection: 'saved.label.stdDirection', isIGST: 'saved.label.isIGST', costPrice: 'saved.label.costPrice',
    sellingPrice: 'saved.label.sellingPrice', profitGstRate: 'saved.label.profitGstRate', purchaseGst: 'saved.label.purchaseGst',
    salesGst: 'saved.label.salesGst', carPrice: 'saved.label.carPrice', discount: 'saved.label.discount', downPayment: 'saved.label.downPayment',
    interestRate: 'saved.label.interestRate',
};

function formatValue(key: string, val: any, t: (key: string) => string): string {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'boolean') return val ? t('saved.yes') : t('saved.no');
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) {
        // Handle arrays of objects (e.g., invoice items)
        if (val.length > 0 && typeof val[0] === 'object') {
            return val.map((item: any) => item.name || item.label || JSON.stringify(item)).join(', ');
        }
        return val.join(', ');
    }
    if (typeof val === 'object') {
        // Handle plain objects - show key fields
        const name = val.name || val.label || val.title;
        if (name) return String(name);
        return JSON.stringify(val);
    }
    if (key === 'rate' || key === 'annuityPct' || key === 'stepUp' || key === 'profitGstRate' || key === 'stdRate') return `${val}%`;
    if (key === 'compounding') return val === 4 ? t('saved.quarterly') : val === 12 ? t('saved.monthly') : val === 1 ? t('saved.yearly') : `${val}x/yr`;
    if (key === 'years' || key === 'age' || key === 'retireAge' || key === 'childAge' || key === 'months' || key === 'tenure') return `${val}`;
    if (typeof val === 'number' && val > 100) return formatINR(val);
    if (typeof val === 'number') return val.toLocaleString('en-IN');
    return String(val);
}

function SavedCard({ calc, onRemove }: { calc: Calculation; onRemove: () => void }) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const meta = calcMeta[calc.calculatorType] || defaultMeta;
    const Icon = meta.icon;
    const primaryValue = (() => {
        if (typeof calc.resultValues === 'number') return calc.resultValues;
        if (!calc.resultValues || typeof calc.resultValues !== 'object') return 0;
        const rv = calc.resultValues as Record<string, any>;
        // Try common result keys in priority order
        for (const key of ['primary', 'emi', 'maturity', 'totalPayment', 'totalAmount', 'futureValue', 'corpus', 'totalValue', 'total', 'netPay', 'totalSalary', 'taxPayable']) {
            if (typeof rv[key] === 'number' && rv[key] > 0) return rv[key];
        }
        // Fallback: first numeric value > 0
        const firstNum = Object.values(rv).find(v => typeof v === 'number' && v > 0);
        return firstNum || 0;
    })();

    // Parse inputs and results for detailed display
    const inputEntries = Object.entries(calc.inputValues || {}).filter(([k, v]) => v !== undefined && v !== null && k !== 'type');
    const resultEntries = Object.entries(calc.resultValues || {}).filter(([k, v]) => k !== 'primary' && k !== 'amortization' && k !== 'schedule' && v !== undefined && v !== null && typeof v !== 'object');

    return (
        <motion.div layout className={`rounded-2xl bg-gradient-to-br ${meta.gradient} border border-border overflow-hidden`}>
            <button onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.color}20` }}>
                        <Icon size={20} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <h3 className="text-foreground font-bold text-sm">{t(meta.label as any, meta.label)}</h3>
                            <div className="flex items-center gap-2">
                                {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                            </div>
                        </div>
                        <p className="text-2xl font-black mt-1" style={{ color: meta.color }}>{formatINR(primaryValue)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(calc.timestamp).toLocaleString('en-IN')}</p>
                    </div>
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4">
                            {/* Inputs Section */}
                            {inputEntries.length > 0 && (
                                <div className="mb-3">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2">📥 {t('saved.inputs')}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {inputEntries.map(([key, val]) => (
                                            <div key={key} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                                                <p className="text-[9px] text-muted-foreground uppercase font-bold">{t(labelMap[key] || key.replace(/([A-Z])/g, ' $1').trim())}</p>
                                                <p className="text-foreground font-bold text-xs mt-0.5">{formatValue(key, val, t)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Results Section */}
                            {resultEntries.length > 0 && (
                                <div className="mb-3">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2">📊 {t('saved.results')}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {resultEntries.map(([key, val]) => (
                                            <div key={key} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                                                <p className="text-[9px] text-muted-foreground uppercase font-bold">{t(labelMap[key] || key.replace(/([A-Z])/g, ' $1').trim())}</p>
                                                <p className="text-brand-green font-bold text-xs mt-0.5">{formatValue(key, val, t)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Delete button */}
                            <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 font-bold text-xs border border-red-500/20 mt-1">
                                <Trash2 size={14} /> {t('saved.remove')}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function SavedCalculations() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { savedCalculations, removeSaved } = useCalculatorStore();

    return (
        <div className="min-h-dvh bg-background pb-10 animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background  px-4 pt-14 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-foreground">{t('saved.title')}</h1>
                        <p className="text-muted-foreground text-xs">{t('saved.savedPlanCount', { count: savedCalculations.length })}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 mt-6">
                {savedCalculations.length === 0 ? (
                    <div className="text-center py-20">
                        <Bookmark size={48} className="text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground text-sm">{t('saved.noSavedYet')}</p>
                        <p className="text-slate-600 text-xs mt-2">{t('saved.saveHint')}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {savedCalculations.map((item) => (
                            <SavedCard key={item.id} calc={item} onRemove={() => removeSaved(item.id)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
