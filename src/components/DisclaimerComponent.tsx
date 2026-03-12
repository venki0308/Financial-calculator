import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, BarChart2, ClipboardList, TrendingUp, Landmark, ShieldCheck, Target, CreditCard, AlertCircle } from 'lucide-react';

export type ModuleName = 'advisor' | 'emi' | 'tax' | 'sip' | 'investment' | 'government' | 'goal' | 'expense' | 'overdraft' | 'gst' | 'general' | 'world_clock';

interface DisclaimerConfig {
 icon: React.ElementType;
 title: string;
 text: string;
 colorClass: string;
 link?: { url: string; text: string };
}

const DISCLAIMER_CONTENT: Record<ModuleName, DisclaimerConfig | null> = {
 advisor: {
 icon: Lightbulb,
 title: "How to use these insights",
 text: "These recommendations are personalized based on the numbers you've shared. Think of them as a starting point for your financial journey. For decisions involving large amounts, a certified financial planner can add extra value.",
 colorClass: "bg-blue-50 text-blue-800 border-blue-100 ",
 link: { url: "https://fincalix.com/methodology", text: "Learn more about our methodology" }
 },
 emi: {
 icon: BarChart2,
 title: "About this calculation",
 text: "EMI shown uses the standard reducing balance method used by most Indian banks. Your bank may round EMI slightly differently — typically within ₹1-2. Always confirm final figures with your lender.",
 colorClass: "bg-blue-50 text-blue-800 border-blue-100 ",
 },
 tax: {
 icon: ClipboardList,
 title: "Calculation basis",
 text: "Based on Budget 2026-27 tax slabs. For complex income situations — rental income, capital gains, freelance income — a CA can help you optimize further and ensure accuracy.",
 colorClass: "bg-blue-50 text-blue-800 border-blue-100 ",
 link: { url: "https://incometax.gov.in", text: "Open incometax.gov.in" }
 },
 sip: {
 icon: TrendingUp,
 title: "About projected returns",
 text: "Returns shown are projections based on the rate you entered. Markets go up and down — actual returns will vary. SIPs work best with a long investment horizon of 7+ years.",
 colorClass: "bg-green-50 text-green-800 border-green-100 ",
 },
 investment: {
 icon: Landmark,
 title: "Verify with your bank",
 text: "Rates shown are as you've entered. Current rates vary by bank and tenure. Senior citizens get an additional 0.25-0.50% in most banks. Check your bank's website for today's exact rates.",
 colorClass: "bg-blue-50 text-blue-800 border-blue-100 ",
 },
 government: {
 icon: ShieldCheck,
 title: "Government-backed safety",
 text: "PPF is one of India's safest investments, backed by the Government of India. The 7.1% rate is reviewed quarterly. Your entire investment, interest, and maturity are tax-free — a true triple benefit.",
 colorClass: "bg-green-50 text-green-800 border-green-100 ",
 },
 goal: {
 icon: Target,
 title: "Your goals, your way",
 text: "These projections help you understand how much to save for each goal. Revisit and update your goals every 6 months as your income and priorities evolve.",
 colorClass: "bg-purple-50 text-purple-800 border-purple-100 ",
 },
 expense: {
 icon: CreditCard,
 title: "Your data stays with you",
 text: "All your expense data is stored only on this device. Nobody else can see it — not even us. Delete everything anytime from Settings → Clear All Data.",
 colorClass: "bg-green-50 text-green-800 border-green-100 ",
 },
 overdraft: {
 icon: Landmark,
 title: "How overdraft interest works",
 text: "Overdraft interest is charged daily on the utilized amount, not the full limit. This calculator uses the daily reducing balance method. Actual charges depend on your bank's terms and any annual fees.",
 colorClass: "bg-blue-50 text-blue-800 border-blue-100 ",
 },
 gst: {
 icon: ClipboardList,
 title: "GST rate verification",
 text: "GST rates shown are based on published GST council notifications. Rates for specific goods/services can vary — confirm the exact HSN/SAC code rate at gst.gov.in for official filing.",
 colorClass: "bg-blue-50 text-blue-800 border-blue-100 ",
 },
 world_clock: null,
 general: {
 icon: AlertCircle,
 title: "Friendly reminder",
 text: "The results provided by this calculator are estimates for informational and planning purposes to help you on your financial journey. Please verify specifics as needed.",
 colorClass: "bg-blue-50 text-blue-800 border-blue-100 ",
 }
};

export interface DisclaimerProps {
 module?: ModuleName;
}

export default function DisclaimerComponent({ module = 'general' }: DisclaimerProps) {
 const config = DISCLAIMER_CONTENT[module];
 // Default closed
 const [isOpen, setIsOpen] = useState(false);
 useEffect(() => {
 if (!config) return;
 const saved = localStorage.getItem(`fincalix_disclaimer_${module}`);
 if (saved !== null) {
 setIsOpen(saved === 'true');
 }
 }, [module, config]);

 const handleToggle = () => {
 const newState = !isOpen;
 setIsOpen(newState);
 localStorage.setItem(`fincalix_disclaimer_${module}`, String(newState));
 };

 if (!config) return null;

 const Icon = config.icon;

 return (
 <div className={`mx-4 my-6 p-4 rounded-xl border transition-colors ${config.colorClass}`}>
 <button onClick={handleToggle} className="w-full flex items-center justify-between text-left"
 >
 <div className="flex items-start gap-3 flex-1 overflow-hidden pr-2">
 <Icon size={18} className="shrink-0 mt-0.5" />
 <div className="flex flex-col flex-1 min-w-0">
 <span className="font-semibold text-sm">{config.title}</span>
 {!isOpen && (
 <span className="text-xs opacity-80 truncate block w-full mt-0.5">
 {config.text}
 </span>
 )}
 </div>
 </div>
 {isOpen ? <ChevronUp size={16} className="shrink-0 opacity-70" /> : <ChevronDown size={16} className="shrink-0 opacity-70" />}
 </button>
 {isOpen && (
 <div className="mt-3 pt-3 border-t border-current/20">
 <p className="text-sm leading-relaxed text-left opacity-90">
 {config.text}
 </p>
 {config.link && (
 <a href={config.link.url} target="_blank" rel="noopener noreferrer"
 className="inline-block mt-3 text-sm font-medium underline opacity-90 hover:opacity-100 cursor-pointer"
 >
 {config.link.text}
 </a>
 )}
 </div>
 )}
 </div>
 );
}
