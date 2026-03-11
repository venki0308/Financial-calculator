import { AlertTriangle } from 'lucide-react';

interface DisclaimerBannerProps {
    type: 'calculator' | 'scheme';
}

const DISCLAIMER_TEXT = {
    calculator: 'Results are for reference only. Actual values may vary based on bank policies and market conditions. Please consult a qualified financial advisor before making decisions.',
    scheme: 'Scheme details shown are based on publicly available government data. Eligibility and benefits may change. Please verify with official government sources.',
};

export default function DisclaimerBanner({ type }: DisclaimerBannerProps) {
    return (
        <div className="mx-4 my-3 p-3 rounded-xl border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-500/10">
            <div className="flex gap-2.5 items-start">
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-amber-900 dark:text-amber-200/80 text-xs leading-relaxed">
                    <span className="font-semibold text-amber-700 dark:text-amber-400">Disclaimer: </span>
                    {DISCLAIMER_TEXT[type]}
                </p>
            </div>
        </div>
    );
}
