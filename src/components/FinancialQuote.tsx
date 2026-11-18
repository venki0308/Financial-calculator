import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { getDailyQuote, normalizeQuoteLang, peekDailyQuote, type ResolvedQuote } from '../data/quotes';

/**
 * FinancialQuote — today's quote in the user's language (English if that language's text is
 * unavailable). Same data and day rule as the morning notification (src/data/quotes.ts), so
 * both always show the same quote, and every user sees the same quote on the same date.
 */
export default function FinancialQuote({ className = 'mx-4 my-4' }: { className?: string }) {
    const { t, i18n } = useTranslation();
    const lang = normalizeQuoteLang(i18n.language);
    // The date is fixed when the card mounts, as before (a card left open past midnight keeps its quote).
    const date = useMemo(() => new Date(), []);
    const [quote, setQuote] = useState<ResolvedQuote | null>(() => peekDailyQuote(lang, date));

    useEffect(() => {
        let live = true;
        getDailyQuote(lang, date).then((q) => { if (live) setQuote(q); }).catch(() => { /* keep what is shown */ });
        return () => { live = false; };
    }, [lang, date]);

    return (
        <div className={`${className} p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-yellow-500/10 border border-amber-500/20 dark:border-amber-500/15`}>
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={14} className="text-amber-500" />
                </div>
                <div className="flex-1 min-w-0 min-h-[2.5rem]">
                    {/* Letter-spacing and italics are for Latin text only: Indic scripts have no italic
                        (the browser would slant the letters) and spacing breaks their joined letters. */}
                    <p className={`text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1 ${lang === 'en' ? 'uppercase tracking-wider' : 'text-[11px]'}`}>💡 {t('quote.dailyTitle')}</p>
                    {quote && (
                        <div lang={quote.lang} data-quote-id={quote.quote.id}>
                            <p className={`text-foreground/80 dark:text-foreground/70 ${quote.lang === 'en' ? 'text-xs leading-relaxed italic' : 'text-[13px] leading-[1.75]'}`}>“{quote.text.text}”</p>
                            {quote.text.by && (
                                <p className={`mt-1 text-foreground/60 dark:text-foreground/55 ${quote.lang === 'en' ? 'text-[11px]' : 'text-xs leading-relaxed'}`}>— {quote.text.by}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
