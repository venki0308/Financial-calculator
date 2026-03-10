import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DisclaimerBannerProps {
    type: 'calculator' | 'scheme';
}

export default function DisclaimerBanner({ type }: DisclaimerBannerProps) {
    const { t } = useTranslation();

    const text = type === 'scheme'
        ? t('disclaimer.scheme')
        : t('disclaimer.calculator');

    return (
        <div className="mx-4 my-3 p-3 rounded-xl border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-500/10">
            <div className="flex gap-2.5 items-start">
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-amber-900 dark:text-amber-200/80 text-xs leading-relaxed">
                    <span className="font-semibold text-amber-700 dark:text-amber-400">{t('disclaimer.title')}: </span>
                    {text}
                </p>
            </div>
        </div>
    );
}
