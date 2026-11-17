/**
 * A feature page on fincalix.com: one app feature, one primary search query (SEO_PLAN.md §5).
 * Every figure on the page is computed at build time by the app's calculation functions
 * (src/utils/*) or, where the app keeps the formula inside a screen, by features/math.ts,
 * which copies that screen's formula and is checked by scripts/qa-feature-pages.mjs.
 */
import type { ComponentType, ReactNode } from 'react';
import type { CATEGORY_SLUGS } from '../seoRoutes';
/** A calculator: one of calcs/keys.ts (batch 1, in calcs/all.tsx) or a file name in calcs/c/ (checked at build time). */
export type CalcKey = string;

export type CategoryKey = keyof typeof CATEGORY_SLUGS;

/** An official source the page relies on (shown on the page). */
export interface Source { label: string; url: string }

/** One FAQ. `a` is plain text whose first sentence answers the question directly. */
export interface Faq { q: string; a: string }

export interface RelatedLink { href: string; label: string; note: string }

/**
 * Which disclaimer the page shows (texts in features/ui.tsx). The app's own texts are reused
 * where they are accurate (SIP, SSY); the others were rewritten because the app's versions
 * carry outdated references (seo/research/verified-facts-2026-11-17.md, "App issues").
 */
export type DisclaimerKey = 'tax' | 'invest' | 'ssy' | 'loan' | 'deposit' | 'card' | 'gold';

export interface FeatureDef {
    /** URL slug, without the leading slash: /old-vs-new-tax-regime → 'old-vs-new-tax-regime'. */
    slug: string;
    /** <title>, at most 60 characters. */
    title: string;
    /** Meta description, at most 155 characters. */
    description: string;
    h1: string;
    /** Breadcrumb label (short). */
    crumb: string;
    category: CategoryKey;
    /** ISO date the page's content last changed: "Last updated" line and sitemap lastmod. */
    updated: string;
    /** Analytics page title (allowed characters only, at most 60). */
    analyticsTitle: string;
    /** Eyebrow line above the H1. */
    eyebrow: string;
    /** The answer-first block: 2–3 plain sentences with one computed example. */
    answer: ReactNode;
    /** Official sources for the answer and the rules on the page. */
    sources: Source[];
    /** Interactive calculator (an island hydrated in the browser), with its starting values. */
    calc?: { key: CalcKey; props: Record<string, number | string | boolean> };
    /** Everything between the calculator and the FAQ. */
    Body: ComponentType;
    faqs: Faq[];
    related: RelatedLink[];
    /** A shared disclaimer (features/ui.tsx) or the page's own text. */
    disclaimer: DisclaimerKey | { text: string };
    /** Extra JSON-LD objects (FAQPage, BreadcrumbList and WebApplication are added automatically). */
    ld?: object[];
    /** Set when the page fails a quality gate: it is built but served noindex and left out of the sitemap. */
    noindex?: string;
}
