import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, BarChart2, ClipboardList, TrendingUp, Landmark, ShieldCheck, Target, CreditCard, AlertCircle, Scale, Building2, Briefcase } from 'lucide-react';

export type ModuleName = 'advisor' | 'emi' | 'tax' | 'sip' | 'fd' | 'rd' | 'ppf' | 'hra' | 'gratuity' | 'gst' | 'goal' | 'expense' | 'overdraft' | 'schemes' | 'compare' | 'general' | 'time' | 'scientific' | 'swp' | 'cagr' | 'lumpsum' | 'epf' | 'nps' | 'ssy' | 'nsc' | 'kvp' | 'pomis' | 'potd' | 'scss' | 'budget';

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
    },
    time: {
        icon: AlertCircle,
        title: "Time & Utility Data",
        text: "Data is provided for general informational purposes only. Time zones, daylight saving changes, and calculations may vary slightly depending on system data. Please verify with official sources for critical scheduling.",
        colorClass
    },
    scientific: {
        icon: AlertCircle,
        title: "Scientific Calculator",
        text: "Results are approximate and intended for informational use only. Please verify values independently for critical decisions. Floating-point precision limitations may cause minor rounding differences.",
        colorClass
    },
    swp: {
        icon: TrendingUp,
        title: "SWP Projections",
        text: "Systematic Withdrawal Plan projections assume a constant rate of return. Actual mutual fund returns fluctuate with market conditions. Your corpus may deplete faster or slower than projected.",
        colorClass
    },
    cagr: {
        icon: BarChart2,
        title: "CAGR Note",
        text: "CAGR represents a smoothed annual growth rate and does not reflect actual year-to-year volatility. Past performance is not indicative of future results. Use CAGR as a benchmark, not a guarantee.",
        colorClass
    },
    lumpsum: {
        icon: TrendingUp,
        title: "Lumpsum Investment",
        text: "Lumpsum projections are based on assumed constant returns. Actual market returns vary significantly. Mutual fund investments are subject to market risks — read all scheme-related documents carefully.",
        colorClass
    },
    epf: {
        icon: ShieldCheck,
        title: "EPF Rates",
        text: "EPF interest rates are set annually by the EPFO and Government of India. The rate used here is based on the latest declared rate. Actual credited interest may differ based on EPFO notifications.",
        colorClass
    },
    nps: {
        icon: ShieldCheck,
        title: "NPS Returns",
        text: "NPS returns are market-linked and vary by fund manager and asset class. The projections shown are indicative only. Verify your actual returns on the NPS portal (enps.nsdl.com).",
        colorClass
    },
    ssy: {
        icon: ShieldCheck,
        title: "SSY Interest",
        text: "Sukanya Samriddhi Yojana interest rates are reviewed and set quarterly by the Government of India. Current rates may differ from those used in this calculation. Verify on India Post or your bank.",
        colorClass
    },
    nsc: {
        icon: Landmark,
        title: "NSC Rates",
        text: "National Savings Certificate rates are set by the Ministry of Finance and reviewed quarterly. The maturity amount shown is based on the current declared rate. Confirm rates at your nearest Post Office.",
        colorClass
    },
    kvp: {
        icon: Landmark,
        title: "KVP Doubling",
        text: "Kisan Vikas Patra doubling time is approximate and based on the current government-declared rate. Rates are reviewed quarterly. Confirm the exact maturity period before investing.",
        colorClass
    },
    pomis: {
        icon: Landmark,
        title: "POMIS Monthly Income",
        text: "Post Office Monthly Income Scheme interest rates are reviewed quarterly by the Government. Monthly payout amounts shown are based on the current rate. Verify at your nearest Post Office branch.",
        colorClass
    },
    potd: {
        icon: Landmark,
        title: "Post Office TD",
        text: "Post Office Time Deposit rates are set quarterly by the Government. Maturity amounts are estimated based on the latest declared rates. Verify with India Post for the most current rates.",
        colorClass
    },
    scss: {
        icon: ShieldCheck,
        title: "SCSS Eligibility",
        text: "Senior Citizens Savings Scheme interest rates are reviewed quarterly. Eligibility is restricted to individuals aged 60 and above (55 for retired defence personnel). Verify terms at your bank or Post Office.",
        colorClass
    },
    budget: {
        icon: CreditCard,
        title: "Budget Data",
        text: "All budget and expense data is stored locally on your device. Insights and recommendations are generated algorithmically and should not be considered professional financial advice. Consult a financial advisor for personalized guidance.",
        colorClass
    },
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

