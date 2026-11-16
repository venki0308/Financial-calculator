import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { dailyQuoteKey } from '../data/quotes';

/**
 * FinancialQuote — shows a rotating daily inspirational quote in the user's
 * language. Uses day-of-year so every user sees the same quote on the same day
 * (and the same one the daily-quote notification carries).
 */
export default function FinancialQuote({ className = 'mx-4 my-4' }: { className?: string }) {
    const { t } = useTranslation();
    const quoteKey = useMemo(() => dailyQuoteKey(), []);

    return (
        <div className={`${className} p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-yellow-500/10 border border-amber-500/20 dark:border-amber-500/15`}>
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={14} className="text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">💡 {t('quote.dailyTitle')}</p>
                    <p className="text-xs text-foreground/80 dark:text-foreground/70 leading-relaxed italic">
                        "{t(quoteKey)}"
                    </p>
                </div>
            </div>
        </div>
    );
}
