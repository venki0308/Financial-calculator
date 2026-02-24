import { AlertTriangle } from 'lucide-react';

interface DisclaimerBannerProps {
    type: 'calculator' | 'scheme';
}

const disclaimers = {
    calculator: {
        text: 'For simulation purposes only. Please consult your bank or financial advisor for accurate calculations. Visit official calculators at incometaxindia.gov.in (Tax), your bank\'s website (EMI), or SEBI-registered advisors (Investments).',
    },
    scheme: {
        text: 'For reference purposes only. Scheme information may change. Please visit the official government portal (link provided below) to verify current eligibility, benefits, and application process before applying.',
    },
};

export default function DisclaimerBanner({ type }: DisclaimerBannerProps) {
    const content = disclaimers[type];

    return (
        <div className="mx-4 my-3 p-3 rounded-xl border-l-4 border-amber-500 bg-amber-500/10">
            <div className="flex gap-2.5 items-start">
                <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-amber-200/80 text-xs leading-relaxed">
                    <span className="font-semibold text-amber-400">Disclaimer: </span>
                    {content.text}
                </p>
            </div>
        </div>
    );
}
