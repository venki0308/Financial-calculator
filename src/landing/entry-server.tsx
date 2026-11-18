/**
 * Pre-render entry (built with `vite build --ssr`, run by scripts/landing/prerender.mjs).
 * - render():       the website "/" (HTML, <head>, island JSON)
 * - renderLegal():  the 5 legal pages as static HTML, same components as the app used
 * - renderSite():   category pages, /calculators, /schemes(/<id>), /in-the-app, 404, /export-my-data
 */
import './ssr-shim';
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../i18n';
import { Landing } from './Landing';
import { buildData } from './data';
import { headTags, jsonForScript, pageHead } from './head';
import type { IslandProps } from './islands';
import { WEB_LEGAL_PAGES } from './legal-pages';
import DataSafety from '../pages/DataSafety';
import { setWebsiteTheme } from '../theme/useAppColors';
import { EXPORT_PAGE, IN_THE_APP, ORIGIN } from './seoRoutes';
import { buildCategoryPages, buildSchemePages, firstSentence } from './site-data';
import { schemes } from '../data/schemes';
import { CalculatorsView, CategoryView, ExportView, InTheAppView, NotFoundView, SchemeView, SchemesView, schemeLd, HowWeCalculateView, UpdatesView, HOW_FAQS } from './SitePages';
import { UPDATES } from './trust-content';
import iconUrl from './assets/fincalix-icon-96.webp';
import { FEATURES, checkFeatures } from './features/registry';
import { FeatureView, faqLd } from './features/ui';

/** The home page. `qrSvg` (made by prerender.mjs) is the desktop-only QR code to Google Play. */
export function render(qrSvg?: string) {
    const data = buildData();
    const html = renderToString(<Landing data={data} qrSvg={qrSvg} />);
    const islandProps: IslandProps = { tools: data.tools };
    return {
        html,
        head: headTags(data),
        islandJson: `<script id="landing-props" type="application/json">${jsonForScript(islandProps)}</script>`,
        data,
    };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

/** <head> for a legal page: the same title, description and canonical the page sets at runtime. */
function legalHead(name: string, h1: string, font: string): string {
    const title = `${h1} — FinCalix`;
    // Same text src/pages/legal/LegalLayout.tsx writes into the description at runtime.
    const desc = `${h1} — FinCalix, India's private offline financial calculator and expense tracker app. All data stays on your device.`;
    return [
        `<title>${esc(title)}</title>`,
        `<meta name="description" content="${esc(desc)}">`,
        `<link rel="canonical" href="${ORIGIN}/${name}">`,
        `<meta name="robots" content="index, follow">`,
        // theme-color (light; dark only when the visitor picked dark) is set by the template's head script.
        `<meta name="color-scheme" content="light dark">`,
        `<link rel="icon" type="image/png" href="/brand/fincalix-icon-512.png">`,
        `<link rel="apple-touch-icon" href="/brand/fincalix-icon-512.png">`,
        `<meta property="og:type" content="website">`,
        `<meta property="og:site_name" content="FinCalix">`,
        `<meta property="og:url" content="${ORIGIN}/${name}">`,
        `<meta property="og:title" content="${esc(title)}">`,
        `<meta property="og:image" content="${ORIGIN}/og/fincalix-og.png">`,
        font,
    ].join('\n    ');
}

export async function renderLegal() {
    if (!i18n.isInitialized) await new Promise<void>((ok) => i18n.on('initialized', () => ok()));
    setWebsiteTheme(false); // the website is light unless the visitor picks dark (legal-client.tsx)
    const pages: Array<{ name: string; template: 'legal' | 'datasafety'; html: string; head: string; h1: string }> = [];
    // Fonts are self-hosted (legal: fonts/poppins.css via legal-client; data safety: index.css).
    const poppins = '';
    for (const [name, Page] of Object.entries(WEB_LEGAL_PAGES)) {
        const html = renderToString(<Page />);
        const h1 = unesc((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '');
        pages.push({ name, template: 'legal', html, h1, head: legalHead(name, h1, poppins) });
    }
    const jakarta = '';
    const ds = renderToString(<MemoryRouter initialEntries={['/data-safety']}><DataSafety /></MemoryRouter>);
    const dsH1 = unesc((ds.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '');
    pages.push({ name: 'data-safety', template: 'datasafety', html: ds, h1: dsH1, head: legalHead('data-safety', dsH1, jakarta) });
    return { pages, iconUrl };
}

// ── Generated website pages ───────────────────────────────────────────────────

export interface SitePageOut {
    path: string;          // e.g. /calculators/loans
    html: string;
    head: string;
    index: boolean;        // listed in the sitemap and indexable
    analyticsTitle: string;
    note?: string;
    lastmod?: string;      // sitemap date when the page's content last changed (feature pages)
}

/** Category pages, /calculators, /schemes, /schemes/<id>, /in-the-app, 404, /export-my-data. */
export function renderSite(): { pages: SitePageOut[]; schemePages: Array<{ id: string; index: boolean; reason: string; verified: string | null }> } {
    const data = buildData();
    const footer = data.footer;
    const cats = buildCategoryPages(data);
    const schemePages = buildSchemePages();
    const out: SitePageOut[] = [];
    const add = (path: string, el: ReactElement, h: { title: string; description: string; index: boolean; crumbs?: Array<{ name: string; path: string }>; ld?: object[] }, analyticsTitle: string, note?: string) => {
        out.push({ path, html: renderToString(el), head: pageHead({ ...h, path }), index: h.index, analyticsTitle, note });
    };
    const home = { name: 'FinCalix', path: '/' };
    const calcCrumb = { name: 'Calculators', path: '/calculators' };

    add('/calculators', <CalculatorsView pages={cats} calculatorCount={data.calculatorCount} toolCount={data.toolCount} footer={footer} />, {
        title: 'All FinCalix calculators — loans, tax, SIP, savings',
        description: `${data.calculatorCount} money calculators and ${data.toolCount - data.calculatorCount} trackers for India: EMI, SIP, income tax, PPF, FD, credit cards and more, grouped by category.`,
        index: true, crumbs: [home, calcCrumb],
    }, 'Website - Calculators');
    for (const c of cats) {
        add(c.path, <CategoryView page={c} all={cats} footer={footer} />, {
            title: `${c.title} — FinCalix`,
            description: `${c.tools.length} ${c.label.toLowerCase()} tools in FinCalix: ${c.tools.slice(0, 4).map((t) => t.name).join(', ')} and more. Free, no login.`.slice(0, 158),
            index: true, crumbs: [home, calcCrumb, { name: c.label, path: c.path }],
        }, `Website - ${c.label}`.slice(0, 60));
    }
    add('/schemes', <SchemesView count={data.schemeCount} footer={footer} />, {
        title: `${data.schemeCount} government schemes explained — FinCalix`,
        description: `Eligibility, benefits, documents and how to apply for ${data.schemeCount} central government schemes, each with the date it was last checked against the official source.`,
        index: true, crumbs: [home, { name: 'Government schemes', path: '/schemes' }],
    }, 'Website - Schemes');
    for (const sp of schemePages) {
        add(sp.path, <SchemeView page={sp} footer={footer} />, {
            title: sp.content?.title ?? `${sp.scheme.name} — eligibility, benefits, how to apply`.slice(0, 70),
            description: sp.content?.description ?? firstSentence(sp.scheme.description).slice(0, 158),
            index: sp.index, crumbs: [home, { name: 'Government schemes', path: '/schemes' }, { name: sp.scheme.name, path: sp.path }],
            ld: schemeLd(sp),
        }, 'Website - Scheme', sp.reason);
    }
    // Feature pages: one app feature each (src/landing/features/).
    checkFeatures();
    for (const f of FEATURES) {
        const cat = cats.find((c) => c.key === f.category);
        if (!cat) throw new Error(`feature ${f.slug}: unknown category ${f.category}`);
        const path = `/${f.slug}`;
        out.push({
            path,
            html: renderToString(<FeatureView f={f} footer={footer} catLabel={cat.label} catPath={cat.path} />),
            head: pageHead({
                title: f.title, description: f.description, path, index: !f.noindex,
                crumbs: [home, calcCrumb, { name: cat.label, path: cat.path }, { name: f.crumb, path }],
                ld: [faqLd(f), ...(f.calc ? [{
                    '@context': 'https://schema.org', '@type': 'WebApplication', name: f.crumb, url: `${ORIGIN}${path}`,
                    description: f.description, applicationCategory: 'FinanceApplication', operatingSystem: 'Any (web browser)',
                    browserRequirements: 'Requires JavaScript', isAccessibleForFree: true, inLanguage: 'en-IN',
                    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
                    publisher: { '@id': `${ORIGIN}/#org` }, isPartOf: { '@id': `${ORIGIN}/#website` },
                }] : []), ...(f.ld ?? [])],
            }),
            index: !f.noindex,
            analyticsTitle: f.analyticsTitle,
            lastmod: f.updated,
            note: f.noindex ? `noindex: ${f.noindex}` : undefined,
        });
    }
    add('/how-we-calculate', <HowWeCalculateView footer={footer} />, {
        title: 'How FinCalix calculates and checks its numbers',
        description: 'The formulas, app functions and official sources behind every FinCalix figure, how each page is checked, and who makes FinCalix.',
        index: true, crumbs: [home, { name: 'How we calculate', path: '/how-we-calculate' }],
        ld: [{ '@context': 'https://schema.org', '@type': 'FAQPage', url: `${ORIGIN}/how-we-calculate`, mainEntity: HOW_FAQS.map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) }],
    }, 'Website - How we calculate');
    out[out.length - 1].lastmod = '2026-11-17';
    add('/updates', <UpdatesView footer={footer} />, {
        title: 'Updates — what changed on FinCalix',
        description: 'Dated list of new pages, corrected calculations and rate checks on FinCalix, for both the website and the Android app.',
        index: true, crumbs: [home, { name: 'Updates', path: '/updates' }],
    }, 'Website - Updates');
    out[out.length - 1].lastmod = UPDATES[0].date;
    add(IN_THE_APP, <InTheAppView footer={footer} />, {
        title: 'This part of FinCalix is in the Android app', description: 'Profile, saved calculations, history, settings and notifications are in the free FinCalix Android app.', index: false,
    }, 'Website - In the app');
    add('/404', <NotFoundView footer={footer} />, {
        title: 'Page not found — FinCalix', description: 'The page you were looking for is not on fincalix.com.', index: false,
    }, 'Website - Not found');
    add(EXPORT_PAGE, <ExportView footer={footer} />, {
        title: 'Export your FinCalix data', description: 'Download the FinCalix data saved in this browser and import it in the Android app.', index: false,
    }, 'Website - Export data');
    // Real lastmod for the sitemap: scheme pages = date verified; a category = its newest feature
    // page; /calculators = newest feature page; /schemes = newest verified scheme.
    const newest = (ds: Array<string | undefined>) => ds.filter((d): d is string => !!d).sort().pop();
    const schemeDate = (sp: (typeof schemePages)[number]) => sp.content?.verified ?? sp.scheme.lastVerified;
    for (const p of out) {
        if (p.lastmod) continue;
        const sp = schemePages.find((s) => s.path === p.path);
        const cat = cats.find((c) => c.path === p.path);
        if (sp) p.lastmod = schemeDate(sp);
        else if (cat) p.lastmod = newest(FEATURES.filter((f) => f.category === cat.key && !f.noindex).map((f) => f.updated));
        else if (p.path === '/calculators') p.lastmod = newest(FEATURES.map((f) => f.updated));
        else if (p.path === '/schemes') p.lastmod = newest(schemePages.filter((s) => s.index).map(schemeDate));
    }
    return { pages: out, schemePages: schemePages.map((s) => ({ id: s.id, index: s.index, reason: s.reason, verified: s.verified })) };
}

// For prerender.mjs: the Play link for the QR code, the static page list, scheme dates.
export { playUrl } from './play';
export { STATIC_PAGES, FEATURE_PAGES } from './seoRoutes';
export { ogKey } from './head';
export function schemeLastVerified(id: string): string | null {
    return schemes.find((s) => s.id === id)?.lastVerified ?? null;
}
