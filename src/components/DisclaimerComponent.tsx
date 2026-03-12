import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, BarChart2, ClipboardList, TrendingUp, Landmark, ShieldCheck, Target, CreditCard, AlertCircle, Scale, Building2, Briefcase } from 'lucide-react';

export type ModuleName = 'advisor' | 'emi' | 'tax' | 'sip' | 'fd' | 'rd' | 'ppf' | 'hra' | 'gratuity' | 'gst' | 'goal' | 'expense' | 'overdraft' | 'schemes' | 'compare' | 'general';

interface DisclaimerConfig {
    icon: React.ElementType;
    title: string;
    text: string;
    colorClass: string;
}

const colorClass = "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900";

const DISCLAIMER_CONTENT: Record<ModuleName, DisclaimerConfig> = {
    emi: {
        icon: Lightbulb,
        title: "EMI Calculation Basis",
        text: "EMI amounts are calculated using the standard reducing balance method. Your final schedule may vary slightly depending on your bank's specific rounding rules. Please check with your lender for the exact figures before finalizing.",
        colorClass
    },
    overdraft: {
        icon: Building2,
        title: "OD Interest",
        text: "Overdraft interest is charged daily only on the utilized amount, not the sanctioned limit. This uses the standard daily reducing balance formulation. Exact charges depend on your bank's billing cycle.",
        colorClass
    },
    tax: {
        icon: ClipboardList,
        title: "Tax Estimation",
        text: "These tax estimates are based on the latest Union Budget tax slabs for both regimes. The calculation assumes standard circumstances. For complex scenarios like capital gains, please consult a Chartered Accountant.",
        colorClass
    },
    sip: {
        icon: TrendingUp,
        title: "Projected Returns",
        text: "Returns shown are mathematical projections based on your expected rate. Mutual fund investments are subject to market risks. Actual returns will fluctuate.",
        colorClass
    },
    fd: {
        icon: Landmark,
        title: "FD Maturity",
        text: "Maturity amounts are estimated based on the rates entered. Current interest rates vary by bank, tenure, and deposit amount. Check your bank's website for today's exact rates.",
        colorClass
    },
    rd: {
        icon: Landmark,
        title: "RD Maturity",
        text: "Maturity amounts are estimated based on entered rates and compounding frequency. Actual returns may differ slightly based on your bank's specific compounding rules. Always confirm with your bank.",
        colorClass
    },
    ppf: {
        icon: ShieldCheck,
        title: "PPF Rules",
        text: "PPF has a mandatory 15-year lock-in with specific conditions for partial withdrawals. The interest rate is reviewed and set quarterly by the government. Keep this in mind when planning liquidity.",
        colorClass
    },
    hra: {
        icon: ClipboardList,
        title: "HRA Exemption",
        text: "HRA exemption is calculated based on Section 10(13A) of the Income Tax Act. It requires valid rent receipts and PAN details of the landlord for higher amounts. Ensure compliance for accurate tax exemptions.",
        colorClass
    },
    gratuity: {
        icon: Briefcase,
        title: "Gratuity Act",
        text: "Gratuity estimates are based on the Payment of Gratuity Act, 1972. Eligibility requires continuous service of five years with the same employer. Check with your HR for company-specific policies.",
        colorClass
    },
    gst: {
        icon: ClipboardList,
        title: "GST Rates",
        text: "GST calculations are based on standard slab rates for general goods and services. Rates for specific items can vary based on their HSN/SAC codes. Confirm the exact rate on gst.gov.in.",
        colorClass
    },
    advisor: {
        icon: Lightbulb,
        title: "Financial Advice",
        text: "Recommendations are algorithmically generated based on your inputs. Use this as a starting point for your financial roadmap. For crucial decisions, please consult a certified financial planner.",
        colorClass
    },
    goal: {
        icon: Target,
        title: "Goal Projections",
        text: "Projections illustrate the monthly savings required to hit your target amounts. They do not account for inflation or changing tax rates. Revisit your goals periodically to stay on track.",
        colorClass
    },
    expense: {
        icon: CreditCard,
        title: "Data Privacy",
        text: "All expense data is stored completely locally on your device. We do not transmit, collect, or store your financial habits. You can clear your data anytime from the Settings.",
        colorClass
    },
    compare: {
        icon: Scale,
        title: "Comparison Metrics",
        text: "Comparisons are strictly mathematical based on the provided assumptions. Real-world scenarios involve inflation, tax implications, and changing interest rates. Use these as a directional guide only.",
        colorClass
    },
    schemes: {
        icon: Landmark,
        title: "Government Schemes",
        text: "Scheme details are provided for general educational purposes. Eligibility criteria and benefits are subject to change by ministries. Always verify details on the official portals before applying.",
        colorClass
    },
    general: {
        icon: AlertCircle,
        title: "Disclaimer",
        text: "The calculations provided are estimates for informational and planning purposes only. They should not be considered formal financial advice. Please verify specific figures with your financial institution.",
        colorClass
    }
};

export interface DisclaimerProps {
    module?: ModuleName;
}

export default function DisclaimerComponent({ module = 'general' }: DisclaimerProps) {
    const config = DISCLAIMER_CONTENT[module];
    const [isOpen, setIsOpen] = useState(false);

    if (!config) return null;

    const Icon = config.icon;

    return (
        <div className={`mx-4 my-6 p-4 rounded-xl border transition-colors ${config.colorClass}`}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
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
                </div>
            )}
        </div>
    );
}

