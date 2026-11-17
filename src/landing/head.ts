/**
 * <head> of the website: title, description, social cards, structured data.
 * Uses only facts from data.ts (registry counts, schemes, FAQ) and real
 * screenshots. No street address is published.
 */
import type { LandingData } from './data';
import { PLAY_URL, SUPPORT_EMAIL } from './content';
import { ORIGIN } from './seoRoutes';
import { shotUrl } from './Shot';
import frauncesUrl from './fonts/fraunces-var.woff2?url';
import jakartaUrl from './fonts/jakarta-var.woff2?url';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** JSON inside <script>: never let "</script>" or "<!--" through. */
export const jsonForScript = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

export const TITLE = 'FinCalix — EMI, SIP and Income Tax Calculators for India';

export function description(d: LandingData) {
    return `Free money calculators for India: EMI, SIP, FD, PPF and income tax for FY 2026-27 (New vs Old Regime), ${d.schemeCount} government schemes and an expense tracker. No login.`;
}

export function headTags(d: LandingData): string {
    const desc = description(d);
    const ogImage = `${ORIGIN}/og/fincalix-og.png`;
    const logo = `${ORIGIN}/brand/fincalix-icon-512.png`;
    const screenshots = ['en-home', 'en-tax', 'en-foreclosure', 'en-expenses-monthly'].map((id) => ORIGIN + shotUrl(id, 'light', 560));

    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': `${ORIGIN}/#org`,
                name: 'FinCalix',
                url: `${ORIGIN}/`,
                logo: { '@type': 'ImageObject', url: logo, width: 512, height: 512 },
                email: SUPPORT_EMAIL,
                contactPoint: { '@type': 'ContactPoint', email: SUPPORT_EMAIL, contactType: 'customer support', availableLanguage: ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam'] },
                sameAs: [PLAY_URL],
            },
            {
                '@type': 'WebSite',
                '@id': `${ORIGIN}/#website`,
                name: 'FinCalix',
                url: `${ORIGIN}/`,
                inLanguage: 'en-IN',
                publisher: { '@id': `${ORIGIN}/#org` },
                potentialAction: {
                    '@type': 'SearchAction',
                    target: { '@type': 'EntryPoint', urlTemplate: `${ORIGIN}/?q={search_term_string}` },
                    'query-input': 'required name=search_term_string',
                },
            },
            {
                '@type': 'SoftwareApplication',
                name: 'FinCalix',
                operatingSystem: 'Android',
                applicationCategory: 'FinanceApplication',
                url: `${ORIGIN}/`,
                installUrl: PLAY_URL,
                downloadUrl: PLAY_URL,
                description: desc,
                inLanguage: ['en', 'hi', 'te', 'ta', 'kn', 'ml'],
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
                screenshot: screenshots,
                publisher: { '@id': `${ORIGIN}/#org` },
            },
            {
                '@type': 'FAQPage',
                mainEntity: d.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
            },
        ],
    };

    return [
        `<title>${esc(TITLE)}</title>`,
        `<meta name="description" content="${esc(desc)}">`,
        `<link rel="canonical" href="${ORIGIN}/">`,
        `<meta name="robots" content="index, follow, max-image-preview:large">`,
        `<meta name="application-name" content="FinCalix">`,
        // theme-color (light; dark only when the visitor picks it) is set by the template's head script.
        `<meta name="color-scheme" content="light dark">`,
        `<meta name="google-play-app" content="app-id=com.fincalix.app">`,
        `<link rel="icon" type="image/png" href="/brand/fincalix-icon-512.png">`,
        `<link rel="apple-touch-icon" href="/brand/fincalix-icon-512.png">`,
        `<link rel="preload" href="${frauncesUrl}" as="font" type="font/woff2" crossorigin>`,
        `<link rel="preload" href="${jakartaUrl}" as="font" type="font/woff2" crossorigin>`,
        `<meta property="og:type" content="website">`,
        `<meta property="og:site_name" content="FinCalix">`,
        `<meta property="og:url" content="${ORIGIN}/">`,
        `<meta property="og:title" content="${esc(TITLE)}">`,
        `<meta property="og:description" content="${esc(desc)}">`,
        `<meta property="og:image" content="${ogImage}">`,
        `<meta property="og:image:width" content="1200">`,
        `<meta property="og:image:height" content="630">`,
        `<meta property="og:image:alt" content="FinCalix: every money decision, worked out in seconds">`,
        `<meta property="og:locale" content="en_IN">`,
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:title" content="${esc(TITLE)}">`,
        `<meta name="twitter:description" content="${esc(desc)}">`,
        `<meta name="twitter:image" content="${ogImage}">`,
        `<script type="application/ld+json">${jsonForScript(graph)}</script>`,
    ].join('\n    ');
}

export interface PageHeadInput {
    title: string;
    description: string;
    path: string;
    index: boolean;
    crumbs?: Array<{ name: string; path: string }>;
}

/** <head> for the generated pages: apex canonical, robots, social cards, breadcrumbs. */
export function pageHead(p: PageHeadInput): string {
    const url = `${ORIGIN}${p.path}`;
    const ld = p.crumbs && p.crumbs.length > 1 ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: p.crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${ORIGIN}${c.path}` })),
    } : null;
    return [
        `<title>${esc(p.title)}</title>`,
        `<meta name="description" content="${esc(p.description)}">`,
        `<link rel="canonical" href="${url}">`,
        `<meta name="robots" content="${p.index ? 'index, follow' : 'noindex, follow'}">`,
        // theme-color (light; dark only when the visitor picks it) is set by the template's head script.
        `<meta name="color-scheme" content="light dark">`,
        `<link rel="icon" type="image/png" href="/brand/fincalix-icon-512.png">`,
        `<link rel="apple-touch-icon" href="/brand/fincalix-icon-512.png">`,
        `<link rel="preload" href="${frauncesUrl}" as="font" type="font/woff2" crossorigin>`,
        `<link rel="preload" href="${jakartaUrl}" as="font" type="font/woff2" crossorigin>`,
        `<meta property="og:type" content="website">`,
        `<meta property="og:site_name" content="FinCalix">`,
        `<meta property="og:url" content="${url}">`,
        `<meta property="og:title" content="${esc(p.title)}">`,
        `<meta property="og:description" content="${esc(p.description)}">`,
        `<meta property="og:image" content="${ORIGIN}/og/fincalix-og.png">`,
        `<meta property="og:locale" content="en_IN">`,
        `<meta name="twitter:card" content="summary_large_image">`,
        ...(ld ? [`<script type="application/ld+json">${jsonForScript(ld)}</script>`] : []),
    ].join('\n    ');
}
