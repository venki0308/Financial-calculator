import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, ChevronDown, ChevronUp, Trash2, Calculator, TrendingUp, IndianRupee, Calendar, Percent, CreditCard, PiggyBank, Home, Briefcase, Heart, GraduationCap, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCalculatorStore, Calculation } from '../store/useCalculatorStore';
import { formatINR } from '../utils/calculations';

// Map calculator types to readable labels and icons
const calcMeta: Record<string, { label: string; icon: any; color: string; gradient: string }> = {
    'emi': { label: 'EMI Calculator', icon: CreditCard, color: '#8B5CF6', gradient: 'from-violet-600/20 to-purple-600/20' },
    'EMI Calculator': { label: 'EMI Calculator', icon: CreditCard, color: '#8B5CF6', gradient: 'from-violet-600/20 to-purple-600/20' },
    'Loan EMI Calculator': { label: 'Loan EMI', icon: CreditCard, color: '#8B5CF6', gradient: 'from-violet-600/20 to-purple-600/20' },
    'sip': { label: 'SIP Calculator', icon: TrendingUp, color: '#3B82F6', gradient: 'from-blue-600/20 to-indigo-600/20' },
    'SIP Calculator': { label: 'SIP Calculator', icon: TrendingUp, color: '#3B82F6', gradient: 'from-blue-600/20 to-indigo-600/20' },
    'Advanced SIP Calculator': { label: 'Advanced SIP', icon: TrendingUp, color: '#3B82F6', gradient: 'from-blue-600/20 to-indigo-600/20' },
    'fd': { label: 'FD Calculator', icon: PiggyBank, color: '#F59E0B', gradient: 'from-amber-600/20 to-yellow-600/20' },
    'FD Calculator': { label: 'FD Calculator', icon: PiggyBank, color: '#F59E0B', gradient: 'from-amber-600/20 to-yellow-600/20' },
    'nps': { label: 'calculators.nps.name', icon: Heart, color: '#10B981', gradient: 'from-green-600/20 to-emerald-600/20' },
    'NPS Calculator': { label: 'calculators.nps.name', icon: Heart, color: '#10B981', gradient: 'from-green-600/20 to-emerald-600/20' },
    'ppf': { label: 'calculators.ppf.name', icon: PiggyBank, color: '#06B6D4', gradient: 'from-cyan-600/20 to-teal-600/20' },
    'PPF Calculator': { label: 'calculators.ppf.name', icon: PiggyBank, color: '#06B6D4', gradient: 'from-cyan-600/20 to-teal-600/20' },
    'epf': { label: 'calculators.epf.name', icon: Briefcase, color: '#14B8A6', gradient: 'from-teal-600/20 to-cyan-600/20' },
    'EPF Calculator': { label: 'calculators.epf.name', icon: Briefcase, color: '#14B8A6', gradient: 'from-teal-600/20 to-cyan-600/20' },
    'ssy': { label: 'calculators.ssy.name', icon: GraduationCap, color: '#EC4899', gradient: 'from-pink-600/20 to-rose-600/20' },
    'SSY Calculator': { label: 'calculators.ssy.name', icon: GraduationCap, color: '#EC4899', gradient: 'from-pink-600/20 to-rose-600/20' },
    'tax': { label: 'Income Tax', icon: IndianRupee, color: '#EF4444', gradient: 'from-red-600/20 to-orange-600/20' },
    'breakeven': { label: 'Break-even', icon: Calculator, color: '#22C55E', gradient: 'from-green-600/20 to-lime-600/20' },
    'Break Even Calculator': { label: 'Break-even Calculator', icon: Calculator, color: '#22C55E', gradient: 'from-green-600/20 to-lime-600/20' },
    'home_loan': { label: 'Home Loan', icon: Home, color: '#8B5CF6', gradient: 'from-violet-600/20 to-purple-600/20' },
    'car_loan': { label: 'Car Loan', icon: CreditCard, color: '#F97316', gradient: 'from-orange-600/20 to-amber-600/20' },
    'Car Loan Calculator': { label: 'Car Loan', icon: CreditCard, color: '#F97316', gradient: 'from-orange-600/20 to-amber-600/20' },
    'lumpsum': { label: 'calculators.lumpsum.name', icon: TrendingUp, color: '#6366F1', gradient: 'from-indigo-600/20 to-blue-600/20' },
    'Lumpsum Calculator': { label: 'calculators.lumpsum.name', icon: TrendingUp, color: '#6366F1', gradient: 'from-indigo-600/20 to-blue-600/20' },
    'salary_hike': { label: 'calculators.salaryHike.name', icon: TrendingUp, color: '#22D3EE', gradient: 'from-cyan-600/20 to-sky-600/20' },
    'Salary Hike Calculator': { label: 'calculators.salaryHike.name', icon: TrendingUp, color: '#22D3EE', gradient: 'from-cyan-600/20 to-sky-600/20' },
    'gst': { label: 'GST Calculator', icon: Calculator, color: '#A855F7', gradient: 'from-purple-600/20 to-fuchsia-600/20' },
    'GST Calculator (standard)': { label: 'GST Standard', icon: Calculator, color: '#A855F7', gradient: 'from-purple-600/20 to-fuchsia-600/20' },
    'GST Calculator (reverse)': { label: 'GST Reverse', icon: Calculator, color: '#A855F7', gradient: 'from-purple-600/20 to-fuchsia-600/20' },
    'GST Calculator (profit)': { label: 'GST Profit Margin', icon: Calculator, color: '#A855F7', gradient: 'from-purple-600/20 to-fuchsia-600/20' },
    'GST Calculator (itc)': { label: 'GST ITC', icon: Calculator, color: '#A855F7', gradient: 'from-purple-600/20 to-fuchsia-600/20' },
    'GST Calculator (invoice)': { label: 'GST Invoice', icon: Calculator, color: '#A855F7', gradient: 'from-purple-600/20 to-fuchsia-600/20' },
    // Short-ID keys used by individual calculator pages
    'swp': { label: 'SWP Calculator', icon: TrendingUp, color: '#EF4444', gradient: 'from-red-600/20 to-orange-600/20' },
    'rd': { label: 'RD Calculator', icon: PiggyBank, color: '#F59E0B', gradient: 'from-amber-600/20 to-yellow-600/20' },
    'ci': { label: 'Compound Interest', icon: Calculator, color: '#6366F1', gradient: 'from-indigo-600/20 to-purple-600/20' },
    'cagr': { label: 'CAGR Calculator', icon: TrendingUp, color: '#6366F1', gradient: 'from-indigo-600/20 to-purple-600/20' },
    // GenericCalculator-based types (full name keys)
    'CAGR Calculator': { label: 'CAGR Calculator', icon: TrendingUp, color: '#6366F1', gradient: 'from-indigo-600/20 to-purple-600/20' },
    'Gratuity Calculator': { label: 'Gratuity Calculator', icon: Briefcase, color: '#F59E0B', gradient: 'from-amber-600/20 to-yellow-600/20' },
    'HRA Calculator': { label: 'HRA Calculator', icon: Home, color: '#10B981', gradient: 'from-green-600/20 to-emerald-600/20' },
    'Goal SIP Calculator': { label: 'Goal SIP', icon: TrendingUp, color: '#3B82F6', gradient: 'from-blue-600/20 to-indigo-600/20' },
    'Step Up SIP': { label: 'Step-Up SIP', icon: TrendingUp, color: '#06B6D4', gradient: 'from-cyan-600/20 to-teal-600/20' },
    'Recurring Deposit': { label: 'RD Calculator', icon: PiggyBank, color: '#F59E0B', gradient: 'from-amber-600/20 to-yellow-600/20' },
    'NSC Calculator': { label: 'NSC Calculator', icon: PiggyBank, color: '#14B8A6', gradient: 'from-teal-600/20 to-cyan-600/20' },
    'KVP Calculator': { label: 'KVP Calculator', icon: PiggyBank, color: '#22C55E', gradient: 'from-green-600/20 to-lime-600/20' },
    'SCSS Calculator': { label: 'SCSS Calculator', icon: Heart, color: '#EC4899', gradient: 'from-pink-600/20 to-rose-600/20' },
    'Post Office TD': { label: 'Post Office TD', icon: PiggyBank, color: '#F97316', gradient: 'from-orange-600/20 to-amber-600/20' },
    'Post Office MIS': { label: 'Post Office MIS', icon: PiggyBank, color: '#8B5CF6', gradient: 'from-violet-600/20 to-purple-600/20' },
    'SWP Calculator': { label: 'SWP Calculator', icon: TrendingUp, color: '#EF4444', gradient: 'from-red-600/20 to-orange-600/20' },
    'Villa Construction': { label: 'Villa Construction', icon: Home, color: '#F97316', gradient: 'from-orange-600/20 to-amber-600/20' },
    'Land Value': { label: 'Land Value Calculator', icon: Home, color: '#22C55E', gradient: 'from-green-600/20 to-emerald-600/20' },
    'Flat Price': { label: 'Flat Price Calculator', icon: Home, color: '#3B82F6', gradient: 'from-blue-600/20 to-indigo-600/20' },
    'Simple Interest': { label: 'Simple Interest', icon: Calculator, color: '#F59E0B', gradient: 'from-amber-600/20 to-yellow-600/20' },
    'Compound Interest': { label: 'Compound Interest', icon: Calculator, color: '#6366F1', gradient: 'from-indigo-600/20 to-purple-600/20' },
    'Advanced Mortgage': { label: 'Advanced Mortgage', icon: Home, color: '#3B82F6', gradient: 'from-blue-600/20 to-indigo-600/20' },
    'Overdraft Calculator': { label: 'Overdraft Calculator', icon: CreditCard, color: '#F97316', gradient: 'from-orange-600/20 to-amber-600/20' },
    'Live Loan Status': { label: 'Loan Tracker', icon: Activity, color: '#10B981', gradient: 'from-emerald-600/20 to-teal-600/20' },
};

const defaultMeta = { label: 'Calculator', icon: Calculator, color: '#64748B', gradient: 'from-slate-600/20 to-gray-600/20' };

// Format input/result labels nicely
const labelMap: Record<string, string> = {
    principal: 'Loan/Deposit Amount', rate: 'Interest Rate', years: 'Tenure (Years)', months: 'Tenure (Months)',
    tenure: 'Tenure', monthly: 'Monthly Amount', annual: 'Annual Amount', amount: 'Amount',
    emi: 'Monthly EMI', totalInterest: 'Total Interest', totalPayment: 'Total Payment',
    futureValue: 'Future Value', invested: 'Total Invested', wealthGained: 'Returns',
    maturity: 'Maturity Amount', interest: 'Interest Earned', corpus: 'Total Corpus',
    monthlyPension: 'Monthly Pension', lumpsum: 'Lumpsum at Retirement', annuity: 'Annuity Amount',
    primary: 'Result', compounding: 'Compounding Freq.', retireAge: 'Retirement Age',
    age: 'Current Age', annuityPct: 'Annuity %', childAge: "Child's Age",
    price: 'Price/Unit', variable: 'Variable Cost/Unit', fixed: 'Fixed Costs',
    stepUp: 'Annual Step-Up %', goalTarget: 'Target Amount', loanType: 'Loan Type',
    method: 'Calculation Method', tenureUnit: 'Tenure Unit',
    items: 'Items', invoiceIsIGST: 'Is IGST', stdAmount: 'Amount', stdRate: 'GST Rate',
    stdDirection: 'Direction', isIGST: 'Interstate (IGST)', costPrice: 'Cost Price',
    sellingPrice: 'Selling Price', profitGstRate: 'GST Rate', purchaseGst: 'Purchase GST',
    salesGst: 'Sales GST', carPrice: 'Car Price', discount: 'Discount', downPayment: 'Down Payment',
    interestRate: 'Interest Rate',
};

function formatValue(key: string, val: any): string {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
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
    if (key === 'compounding') return val === 4 ? 'Quarterly' : val === 12 ? 'Monthly' : val === 1 ? 'Yearly' : `${val}x/yr`;
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
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2">📥 Inputs</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {inputEntries.map(([key, val]) => (
                                            <div key={key} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                                                <p className="text-[9px] text-muted-foreground uppercase font-bold">{labelMap[key] || key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                                <p className="text-foreground font-bold text-xs mt-0.5">{formatValue(key, val)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Results Section */}
                            {resultEntries.length > 0 && (
                                <div className="mb-3">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2">📊 Results</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {resultEntries.map(([key, val]) => (
                                            <div key={key} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                                                <p className="text-[9px] text-muted-foreground uppercase font-bold">{labelMap[key] || key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                                <p className="text-brand-green font-bold text-xs mt-0.5">{formatValue(key, val)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Delete button */}
                            <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 font-bold text-xs border border-red-500/20 mt-1">
                                <Trash2 size={14} /> Remove
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function SavedCalculations() {
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
                        <h1 className="text-lg font-bold text-foreground">Saved Calculations</h1>
                        <p className="text-muted-foreground text-xs">{savedCalculations.length} saved plan{savedCalculations.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 mt-6">
                {savedCalculations.length === 0 ? (
                    <div className="text-center py-20">
                        <Bookmark size={48} className="text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground text-sm">No saved calculations yet</p>
                        <p className="text-slate-600 text-xs mt-2">Save from any calculator to track your plans</p>
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
