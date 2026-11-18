import type { MouseEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink as ExternalIcon, Info, Landmark } from 'lucide-react';
import { openExternal } from '../utils/openExternal';
import { hostOf, type OfficialSource } from '../data/officialSources';

/** An official source's name in the user's language (English name when no translation). */
export function sourceName(s: OfficialSource, t: (key: string, fallback: string) => string): string {
    return t(`appUi.source.${s.id}`, s.name);
}

/** A link to an official page: a real <a href> (readable, testable), opened in the in-app browser. */
export function OfficialLink({ url, children, className = '' }: { url: string; children: ReactNode; className?: string }) {
    const onClick = (e: MouseEvent) => { e.preventDefault(); void openExternal(url); };
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" data-official-link={url} onClick={onClick}
            className={`inline-flex items-center gap-1 font-semibold underline underline-offset-2 text-brand-blue break-all ${className}`}>
            {children}
            <ExternalIcon size={12} className="shrink-0" aria-hidden />
        </a>
    );
}

/**
 * "FinCalix is not a government app …" with one official portal link, for the top of the Schemes
 * list and of every scheme screen (visible without scrolling).
 */
export function GovtNotice({ url, label }: { url?: string; label?: string }) {
    const { t } = useTranslation();
    return (
        <div data-govt-notice className="rounded-xl border border-amber-300/60 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800 px-3 py-2.5 text-xs leading-snug">
            <p className="flex items-start gap-2">
                <Info size={14} className="shrink-0 mt-0.5" aria-hidden />
                <span>{t('sources.notGovt', 'FinCalix is not a government app and does not represent any government entity.')}</span>
            </p>
            {url && (
                <p className="mt-1.5 pl-[22px]">
                    {label}: <OfficialLink url={url}>{hostOf(url)}</OfficialLink>
                </p>
            )}
        </div>
    );
}

/** "Official source: Income Tax Department (incometax.gov.in) ↗" — shown on calculators. */
export function OfficialSourceRow({ sources }: { sources: readonly OfficialSource[] }) {
    const { t } = useTranslation();
    if (!sources.length) return null;
    return (
        <div data-official-source className="flex items-start gap-2 text-xs leading-snug">
            <Landmark size={14} className="shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0">
                <span className="font-semibold">{t('sources.officialSource', 'Official source')}: </span>
                {sources.map((s, i) => (
                    <span key={s.url}>
                        {i > 0 && ' · '}
                        {sourceName(s, t)} (<OfficialLink url={s.url}>{s.host}</OfficialLink>)
                    </span>
                ))}
            </div>
        </div>
    );
}
