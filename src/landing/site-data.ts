/**
 * Content for the generated website pages, built at pre-render time from the app's own
 * sources: the calculator registry (calculatorList.ts, names and one-line descriptions
 * from en.json) and schemes.ts. Nothing here is hand-typed except the intros in content.ts.
 */
import { schemes } from '../data/schemes';
import { SCHEME_CONTENT } from './schemes/generated';
import { listedOnWebsite } from './schemes/ended';
import type { SchemeContent } from './schemes/types';
import type { Scheme } from '../data/schemes';
import { SITE_CATEGORIES } from './categories';
import type { SiteCategory } from './categories';
import { CATEGORY_INTROS } from './content';
import { APP_CANONICAL, CATEGORY_SLUGS, categoryPath } from './seoRoutes';
import type { LandingData, ToolCard } from './data';

/** A scheme page needs at least this many words of its own text to be indexed. */
export const SCHEME_MIN_WORDS = 60;
/** Schemes must have been checked against the official source on or after this date. */
export const SCHEME_VERIFIED_SINCE = '2026-04-01';

/** Scheme → the calculator guide for the same scheme on this site. */
const SCHEME_GUIDES: Readonly<Record<string, string>> = {
    'c-ssy': '/sukanya-samriddhi',
    'c-scss': '/scss',
    'c-nps': '/nps',
};

export interface CategoryPage {
    key: SiteCategory;
    path: string;
    label: string;
    title: string;
    intro: string;
    more: string;
    tools: Array<ToolCard & { guide: string | null }>;
}

export interface SchemePage {
    id: string;
    path: string;
    scheme: Scheme;
    words: number;
    verified: string | null;
    index: boolean;
    reason: string;
    guide: string | null;
    /** Website-only verified content (schemes/content/<id>.ts), when written. */
    content: SchemeContent | null;
}

/** Problems that keep a scheme page with content out of the index (empty = fine). */
export function schemeContentProblems(c: SchemeContent): string[] {
    const p: string[] = [];
    if (c.title.length > 60) p.push(`title ${c.title.length} chars`);
    if (c.description.length > 155) p.push(`description ${c.description.length} chars`);
    if (c.answer.length < 2) p.push('answer needs 2–3 sentences');
    if (c.faqs.length < 5 || c.faqs.length > 8) p.push(`${c.faqs.length} FAQs (5–8)`);
    if (c.related.length < 2) p.push('needs at least 2 related links');
    if (!c.sources.length) p.push('no official source');
    if (!c.howToApply.length) p.push('no how-to-apply steps');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.verified)) p.push('verified must be YYYY-MM-DD');
    if (c.verified < SCHEME_VERIFIED_SINCE) p.push(`verified before ${SCHEME_VERIFIED_SINCE}`);
    return p;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const longDate = (iso?: string) => {
    const m = iso && iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : null;
};

const contentWords = (c: SchemeContent) =>
    [...c.answer, ...(c.eligibility ?? []), ...(c.notEligible ?? []), ...(c.benefits ?? []), ...(c.documents ?? []), ...c.howToApply,
        ...(c.statusSteps ?? []), ...c.faqs.flatMap((f) => [f.q, f.a]), ...(c.table ? c.table.rows.flat() : [])]
        .join(' ').split(/\s+/).filter(Boolean).length;

const ownWords = (s: Scheme) =>
    [s.description, ...s.benefits, ...s.eligibility, ...s.documents, ...s.howToApply, s.notes || '']
        .join(' ').split(/\s+/).filter(Boolean).length;

export function buildCategoryPages(data: LandingData): CategoryPage[] {
    return SITE_CATEGORIES.map((c) => {
        const copy = CATEGORY_INTROS[c.id];
        if (!copy) throw new Error(`site: no intro for category ${c.id}`);
        const tools = data.tools.filter((t) => t.cat === c.id).map((t) => ({ ...t, guide: APP_CANONICAL[t.path] ?? null }));
        if (!tools.length) throw new Error(`site: category ${c.id} has no tools`);
        return { key: c.id, path: categoryPath(c.id as keyof typeof CATEGORY_SLUGS), label: c.label, title: copy.title, intro: copy.intro, more: copy.more, tools };
    });
}

export function buildSchemePages(): SchemePage[] {
    return schemes
        .filter(listedOnWebsite)
        // /scheme/c-apy has its own guide page (/atal-pension); no second page for it.
        .filter((s) => !APP_CANONICAL[`/scheme/${s.id}`])
        .map((s) => {
            const content = SCHEME_CONTENT[s.id] ?? null;
            const words = ownWords(s) + (content ? contentWords(content) : 0);
            const verifiedIso = content?.verified ?? s.lastVerified;
            const recent = !!verifiedIso && verifiedIso >= SCHEME_VERIFIED_SINCE;
            const enough = words >= SCHEME_MIN_WORDS;
            const problems = content ? schemeContentProblems(content) : [];
            // Indexed only with verified website content; a scheme that could not be verified stays noindex.
            const index = !!content && recent && enough && problems.length === 0;
            const reason = !content ? 'no verified website content (official source not confirmed)' : problems.length ? `content: ${problems.join('; ')}` : !recent ? `not verified since ${SCHEME_VERIFIED_SINCE}` : !enough ? `only ${words} words of scheme text (minimum ${SCHEME_MIN_WORDS})` : 'indexed';
            return { id: s.id, path: `/schemes/${s.id}`, scheme: s, words, verified: longDate(verifiedIso), index, reason, guide: SCHEME_GUIDES[s.id] ?? null, content };
        });
}

/** The /schemes/<id> link for a scheme, or its own guide page where one exists. */
export const schemeHref = (id: string) => APP_CANONICAL[`/scheme/${id}`] ?? `/schemes/${id}`;

/** First sentence of a description, for lists. */
export const firstSentence = (s: string) => {
    const m = s.match(/^(.+?[.!?])(\s|$)/);
    return (m ? m[1] : s).trim();
};

export function schemesByCategory(): Array<{ category: string; items: Scheme[] }> {
    const central = schemes.filter(listedOnWebsite);
    const cats = [...new Set(central.map((s) => s.category))];
    return cats.map((category) => ({ category, items: central.filter((s) => s.category === category) }));
}
