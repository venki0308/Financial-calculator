import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, ChevronDown, ChevronUp, Trash2, Calculator, TrendingUp, IndianRupee, Calendar, Percent, CreditCard, PiggyBank, Home, Briefcase, Heart, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCalculatorStore, Calculation } from '../store/useCalculatorStore';
import { formatINR } from '../utils/calculations';

// Map calculator types to readable labels and icons
const calcMeta: Record<string, { label: string; icon: any; color: string; gradient: string }> = {
    'emi': { label: 'EMI Calculator', icon: CreditCard, color: '#8B5CF6', gradient: 'from-violet-600/20 to-purple-600/20' },
    'EMI Calculator': { label: 'EMI Calculator', icon: CreditCard, color: '#8B5CF6', gradient: 'from-violet-600/20 to-purple-600/20' },
    'sip': { label: 'SIP Calculator', icon: TrendingUp, color: '#3B82F6', gradient: 'from-blue-600/20 to-indigo-600/20' },
    'SIP Calculator': { label: 'SIP Calculator', icon: TrendingUp, color: '#3B82F6', gradient: 'from-blue-600/20 to-indigo-600/20' },
    'fd': { label: 'FD Calculator', icon: PiggyBank, color: '#F59E0B', gradient: 'from-amber-600/20 to-yellow-600/20' },
    'FD Calculator': { label: 'FD Calculator', icon: PiggyBank, color: '#F59E0B', gradient: 'from-amber-600/20 to-yellow-600/20' },
    'nps': { label: 'NPS Calculator', icon: Heart, color: '#10B981', gradient: 'from-green-600/20 to-emerald-600/20' },
    'ppf': { label: 'PPF Calculator', icon: PiggyBank, color: '#06B6D4', gradient: 'from-cyan-600/20 to-teal-600/20' },
    'epf': { label: 'EPF Calculator', icon: Briefcase, color: '#14B8A6', gradient: 'from-teal-600/20 to-cyan-600/20' },
    'ssy': { label: 'SSY Calculator', icon: GraduationCap, color: '#EC4899', gradient: 'from-pink-600/20 to-rose-600/20' },
    'tax': { label: 'Income Tax', icon: IndianRupee, color: '#EF4444', gradient: 'from-red-600/20 to-orange-600/20' },
    'breakeven': { label: 'Break-even', icon: Calculator, color: '#22C55E', gradient: 'from-green-600/20 to-lime-600/20' },
    'home_loan': { label: 'Home Loan', icon: Home, color: '#8B5CF6', gradient: 'from-violet-600/20 to-purple-600/20' },
    'car_loan': { label: 'Car Loan', icon: CreditCard, color: '#F97316', gradient: 'from-orange-600/20 to-amber-600/20' },
    'lumpsum': { label: 'Lumpsum', icon: TrendingUp, color: '#6366F1', gradient: 'from-indigo-600/20 to-blue-600/20' },
    'salary_hike': { label: 'Salary Hike', icon: TrendingUp, color: '#22D3EE', gradient: 'from-cyan-600/20 to-sky-600/20' },
    'gst': { label: 'GST Calculator', icon: Calculator, color: '#A855F7', gradient: 'from-purple-600/20 to-fuchsia-600/20' },
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
};

function formatValue(key: string, val: any): string {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'string') return val;
    if (key === 'rate' || key === 'annuityPct' || key === 'stepUp') return `${val}%`;
    if (key === 'compounding') return val === 4 ? 'Quarterly' : val === 12 ? 'Monthly' : val === 1 ? 'Yearly' : `${val}x/yr`;
    if (key === 'years' || key === 'age' || key === 'retireAge' || key === 'childAge' || key === 'months' || key === 'tenure') return `${val}`;
    if (typeof val === 'number' && val > 100) return formatINR(val);
    if (typeof val === 'number') return val.toLocaleString('en-IN');
    return String(val);
}

function SavedCard({ calc, onRemove }: { calc: Calculation; onRemove: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const meta = calcMeta[calc.type] || defaultMeta;
    const Icon = meta.icon;
    const primaryValue = typeof calc.result === 'number' ? calc.result : (calc.result?.primary || 0);

    // Parse inputs and results for detailed display
    const inputEntries = Object.entries(calc.inputs || {}).filter(([k, v]) => v !== undefined && v !== null && k !== 'type');
    const resultEntries = Object.entries(calc.result || {}).filter(([k, v]) => k !== 'primary' && k !== 'amortization' && k !== 'schedule' && v !== undefined && v !== null && typeof v !== 'object');

    return (
        <motion.div layout className={`rounded-2xl bg-gradient-to-br ${meta.gradient} border border-white/5 overflow-hidden`}>
            <button onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.color}20` }}>
                        <Icon size={20} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white font-bold text-sm">{meta.label}</h3>
                            <div className="flex items-center gap-2">
                                {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                            </div>
                        </div>
                        <p className="text-2xl font-black mt-1" style={{ color: meta.color }}>{formatINR(primaryValue)}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{new Date(calc.timestamp).toLocaleString('en-IN')}</p>
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
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">📥 Inputs</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {inputEntries.map(([key, val]) => (
                                            <div key={key} className="p-2 rounded-lg bg-slate-800/50">
                                                <p className="text-[9px] text-slate-500 uppercase font-bold">{labelMap[key] || key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                                <p className="text-white font-bold text-xs mt-0.5">{formatValue(key, val)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Results Section */}
                            {resultEntries.length > 0 && (
                                <div className="mb-3">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">📊 Results</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {resultEntries.map(([key, val]) => (
                                            <div key={key} className="p-2 rounded-lg bg-slate-800/50">
                                                <p className="text-[9px] text-slate-500 uppercase font-bold">{labelMap[key] || key.replace(/([A-Z])/g, ' $1').trim()}</p>
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
        <div className="min-h-dvh bg-[#0F172A] pb-10 animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-4 border-b border-dark-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-white">Saved Calculations</h1>
                        <p className="text-slate-500 text-xs">{savedCalculations.length} saved plan{savedCalculations.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 mt-6">
                {savedCalculations.length === 0 ? (
                    <div className="text-center py-20">
                        <Bookmark size={48} className="text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500 text-sm">No saved calculations yet</p>
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
