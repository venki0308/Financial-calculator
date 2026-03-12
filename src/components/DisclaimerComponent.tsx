import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

type ModuleName = 'emi' | 'sip' | 'tax' | 'investment' | 'property' | 'government' | 'general' | 'world_clock';

const DISCLAIMER_CONTENT: Record<ModuleName, string> = {
    emi: 'This EMI calculation is for illustrative purposes only. Actual EMI and interest rates may vary based on your bank, credit score, and current market conditions. Please verify with your financial institution before making any commitments.',
    sip: 'Mutual fund and market investments are subject to market risks. Read all scheme related documents carefully. Past performance is not indicative of future returns. The calculations assume a constant rate of return, which differs from actual market volatility.',
    tax: 'Tax laws are subject to change by the government. The calculations provided here are based on the latest available tax slabs but do not constitute professional tax advice. Always consult a certified tax professional for your specific situation.',
    investment: 'Investment calculations are projections based on assumed rates of return. Actual returns will fluctuate based on market conditions, inflation, and fee structures. Do not base financial decisions solely on these projections.',
    property: 'Property calculations do not include fluctuating hidden costs like varying local stamp duties, registration fees, maintenance, and property taxes which differ by state. Consult a local real estate advisor.',
    government: 'Government scheme rules, interest rates, and tax benefits are subject to change by official authorities. The details shown are estimates based on broadly available data. Please verify with official post office or bank branches.',
    world_clock: 'Timezone conversions may be affected by current Daylight Saving Time (DST) observations which can change based on local government policies. Keep in mind that exact offsets can fluctuate.',
    general: 'The results provided by this calculator are estimates for informational and planning purposes only. FinCalix does not guarantee the accuracy or applicability of these results to your specific financial situation.',
};

interface DisclaimerProps {
    module?: ModuleName;
}

export default function DisclaimerComponent({ module = 'general' }: DisclaimerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const text = DISCLAIMER_CONTENT[module];

    return (
        <div className="mx-4 my-6 p-4 rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-card">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">FinCalix Disclaimer</span>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            
            {isOpen && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-border">
                    <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed text-left">
                        {text}
                    </p>
                </div>
            )}
        </div>
    );
}
