/**
 * Content for the generated website pages, built at pre-render time from the app's own
 * sources: the calculator registry (calculatorList.ts, names and one-line descriptions
 * from en.json) and schemes.ts. Nothing here is hand-typed except the intros in content.ts.
 */
import { schemes } from '../data/schemes';
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
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const longDate = (iso?: string) => {
    const m = iso && iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : null;
};

const ownWords = (s: Scheme) =>
    [s.description, ...s.benefits, ...s.eligibility, ...s.documents, ...s.howToApply, s.notes || '']
        .join(' ').split(/\s+/).filter(Boolean).length;

export function buildCategoryPages(data: LandingData): CategoryPage[] {
    return SITE_CATEGORIES.map((c) => {
        const copy = CATEGORY_INTROS[c.id];
        if (!copy) throw new Error(`site: no intro for category ${c.id}`);
        const tools = data.tools.filter((t) => t.cat === c.id).map((t) => ({ ...t, guide: APP_CANONICAL[t.path] ?? null }));
        if (!tools.length) throw new Error(`site: category ${c.id} has no tools`);
        return { key: c.id, path: categoryPath(c.id as keyof typeof CATEGORY_SLUGS), label: c.label, title: copy.title, intro: copy.intro, tools };
    });
}

export function buildSchemePages(): SchemePage[] {
    return schemes
        .filter((s) => s.governmentLevel === 'central' && s.isActive !== false)
        // /scheme/c-apy has its own guide page (/atal-pension); no second page for it.
        .filter((s) => !APP_CANONICAL[`/scheme/${s.id}`])
        .map((s) => {
            const words = ownWords(s);
            const recent = !!s.lastVerified && s.lastVerified >= SCHEME_VERIFIED_SINCE;
            const enough = words >= SCHEME_MIN_WORDS;
            const index = recent && enough;
            const reason = !recent ? `not verified since ${SCHEME_VERIFIED_SINCE}` : !enough ? `only ${words} words of scheme text (minimum ${SCHEME_MIN_WORDS})` : 'indexed';
            return { id: s.id, path: `/schemes/${s.id}`, scheme: s, words, verified: longDate(s.lastVerified), index, reason, guide: SCHEME_GUIDES[s.id] ?? null };
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
    const central = schemes.filter((s) => s.governmentLevel === 'central' && s.isActive !== false);
    const cats = [...new Set(central.map((s) => s.category))];
    return cats.map((category) => ({ category, items: central.filter((s) => s.category === category) }));
}
