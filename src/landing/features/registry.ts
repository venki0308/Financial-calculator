/**
 * Every feature page: each module in features/pages exports one FeatureDef (collected by the
 * generated index, so adding a page means adding one file). Pages are ordered as in
 * seoRoutes.FEATURE_PAGES; the build fails if that list and the page files disagree, or if a
 * page breaks the title/description limits.
 */
import { FEATURE_PAGES } from '../seoRoutes';
import type { FeatureDef } from './types';
import { PAGE_MODULES } from './generated';
import { hasCalc } from './calcs/resolve';

const isFeature = (v: unknown): v is FeatureDef =>
    !!v && typeof v === 'object' && typeof (v as FeatureDef).slug === 'string' && typeof (v as FeatureDef).Body === 'function';

const found = PAGE_MODULES.flatMap((m) => Object.values(m).filter(isFeature));
const order = (slug: string) => { const i = FEATURE_PAGES.indexOf(slug); return i < 0 ? Number.MAX_SAFE_INTEGER : i; };

export const FEATURES: readonly FeatureDef[] = [...found].sort((a, b) => order(a.slug) - order(b.slug));

const ANALYTICS_TITLE = /^[A-Za-z0-9 &()'./-]{1,60}$/;   // services/providers/types.ts page_title rule
const URL_OK = /^https:\/\//;

/** Throws on any rule a feature page breaks (run by entry-server before rendering). */
export function checkFeatures(): void {
    const slugs = FEATURES.map((f) => f.slug);
    const problems: string[] = [];
    for (const f of FEATURES) {
        if (!FEATURE_PAGES.includes(f.slug)) problems.push(`${f.slug}: not in seoRoutes.FEATURE_PAGES`);
        if (f.title.length > 60) problems.push(`${f.slug}: title ${f.title.length} chars (max 60)`);
        if (f.description.length > 155) problems.push(`${f.slug}: description ${f.description.length} chars (max 155)`);
        if (!ANALYTICS_TITLE.test(f.analyticsTitle)) problems.push(`${f.slug}: analytics title "${f.analyticsTitle}" breaks the page_title rule`);
        if (f.faqs.length < 5 || f.faqs.length > 8) problems.push(`${f.slug}: ${f.faqs.length} FAQs (5–8)`);
        if (f.related.length < 3 || f.related.length > 6) problems.push(`${f.slug}: ${f.related.length} related links (3–6)`);
        if (!f.sources.length) problems.push(`${f.slug}: no official source`);
        if (f.sources.some((s) => !URL_OK.test(s.url) && !/^http:\/\/(www\.)?(dea|nsiindia)\.gov\.in/.test(s.url))) problems.push(`${f.slug}: a source URL is not https`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(f.updated)) problems.push(`${f.slug}: updated must be YYYY-MM-DD`);
        if (f.calc && !hasCalc(f.calc.key)) problems.push(`${f.slug}: calculator "${f.calc.key}" does not exist`);
        if (f.related.some((r) => r.href === `/${f.slug}`)) problems.push(`${f.slug}: links to itself in related`);
    }
    for (const p of FEATURE_PAGES) if (!slugs.includes(p)) problems.push(`${p}: in FEATURE_PAGES but no page module`);
    if (new Set(slugs).size !== slugs.length) problems.push('duplicate slug');
    if (new Set(FEATURES.map((f) => f.title)).size !== FEATURES.length) problems.push('duplicate title');
    if (new Set(FEATURES.map((f) => f.description)).size !== FEATURES.length) problems.push('duplicate description');
    if (problems.length) throw new Error(`feature pages:\n  ${problems.join('\n  ')}`);
}
