import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, BarChart2, ClipboardList, TrendingUp, Landmark, ShieldCheck, Target, CreditCard, AlertCircle, Scale, Building2 } from 'lucide-react';

export type ModuleName = 'advisor' | 'emi' | 'tax' | 'sip' | 'investment' | 'government' | 'goal' | 'expense' | 'overdraft' | 'gst' | 'general' | 'world_clock' | 'ppf' | 'schemes' | 'compare';

interface DisclaimerConfig {
    icon: React.ElementType;
    title: string;
    text: string;
    colorClass: string;
    link?: { url: string; text: string };
}

const DISCLAIMER_CONTENT: Record<ModuleName, DisclaimerConfig | null> = {
    emi: {
        icon: Lightbulb,
        title: "About EMI calculations",
        text: "EMI shown uses the standard reducing balance method used by most Indian banks. Your bank may round off EMI slightly differently — typically within ₹1-2. Always confirm final figures with your lender before proceeding.",
        colorClass: "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
    },
    overdraft: {
        icon: Building2,
        title: "How OD interest works",
        text: "Overdraft interest is charged daily only on the utilized amount, not the full sanctioned limit. This calculator uses the daily reducing balance method. Actual charges depend on your bank's specific billing cycle and annual maintenance fees.",
        colorClass: "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
    },
    tax: {
        icon: ClipboardList,
        title: "Calculation basis",
        text: "Estimates are based on the latest Budget tax slabs (New and Old Regimes). For complex income situations involving capital gains, rental income, or freelance work, consulting a Chartered Accountant can help you optimize further.",
        colorClass: "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
    },
    sip: {
        icon: TrendingUp,
        title: "About projected returns",
        text: "Returns shown are mathematical projections based on the expected rate you entered. Mutual fund investments are subject to market risks, and actual returns will fluctuate. SIPs generally work best with a long-term investment horizon of 7+ years.",
        colorClass: "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
    },
    investment: {
        icon: Landmark,
        title: "Verify with your bank",
        text: "Maturity amounts are estimated based on the rates entered. Current interest rates vary by bank, tenure, and deposit amount. Senior citizens typically get an additional 0.25%-0.50%. Check your bank's official website for today's exact rates.",
        colorClass: "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
    },
    ppf: {
        icon: ShieldCheck,
        title: "About PPF rules",
        text: "PPF has a mandatory 15-year lock-in period. Partial withdrawals and loans against PPF are subject to specific government conditions. The interest rate is reviewed quarterly by the government. Keep this in mind when planning your liquidity.",
        colorClass: "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
    },
    advisor: {
        icon: Lightbulb,
        title: "How to use these insights",
        text: "These recommendations are algorithmically generated based on the numbers you entered. Think of them as a structured starting point for your financial roadmap. For decisions involving large sums, a certified financial planner can add personalized value.",
        colorClass: "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
    },
    goal: {
        icon: Target,
        title: "Your goals, your way",
        text: "These projections help you understand the monthly savings required to hit target amounts. Inflation and changing priorities mean you should ideally revisit and update your goals every 6-12 months.",
        colorClass: "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
    },
    expense: {
        icon: CreditCard,
        title: "Your data stays with you",
        text: "All your expense data is stored completely locally on this device. We do not transmit, collect, or store your financial habits. You can delete everything instantly at any time from the Settings menu.",
        colorClass: "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
    },
    schemes: {
        icon: Landmark,
        title: "Government schemes info",
        text: "Scheme details are provided for general awareness and educational purposes. Eligibility criteria, interest rates, and benefits are subject to change by the respective ministries. Always verify details on the official government portals before applying.",
        colorClass: "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
    },
    compare: {
        icon: Scale,
        title: "Understanding comparisons",
        text: "Comparisons are purely mathematical based on the assumptions provided. Real-world scenarios involve inflation, tax implications, and changing interest rates over time. Use these comparisons as a directional guide, not absolute financial advice.",
        colorClass: "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
    },
    government: null,
    world_clock: null,
    gst: {
        icon: ClipboardList,
        title: "GST rate verification",
        text: "GST rates shown are based on published GST council notifications. Rates for specific goods/services can vary — confirm the exact HSN/SAC code rate at gst.gov.in for official filing.",
        colorClass: "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
    },
    general: {
        icon: AlertCircle,
        title: "Friendly reminder",
        text: "The results provided by this calculator are estimates for informational and planning purposes to help you on your financial journey. Please verify specifics as needed.",
        colorClass: "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
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
            <button 
                onClick={handleToggle} 
                className="w-full flex items-center justify-between text-left"
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
                        <a 
                            href={config.link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
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

