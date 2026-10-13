import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Landmark } from 'lucide-react';
import { RATE_CONTEXT } from '../data/rateEnvironment';

/**
 * Collapsible "market context" card — surfaces the quarterly-refreshed rate
 * commentary from rateEnvironment.ts (repo decision, bank floors, tips).
 * Title/body are i18n keys with English fallbacks, so every locale shows
 * current numbers even before a translation lands.
 */
export default function RateContextNote({ type }: { type: keyof typeof RATE_CONTEXT }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const ctx = RATE_CONTEXT[type];
    if (!ctx) return null;
    return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
            <button onClick={() => setOpen(p => !p)} className="w-full flex items-center justify-between p-4" aria-expanded={open}>
                <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1 bg-blue-500/10 rounded text-blue-500 shrink-0"><Landmark size={14} /></div>
                    <span className="text-foreground font-bold text-sm truncate">{t(ctx.titleKey, ctx.titleFallback)}</span>
                </div>
                {open ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
            </button>
            {open && (
                <p className="px-4 pb-4 text-[11px] text-foreground/80 leading-relaxed whitespace-pre-line">
                    {t(ctx.bodyKey, ctx.bodyFallback)}
                </p>
            )}
        </div>
    );
}
