/**
 * Pre-render entry (built with `vite build --ssr`, run by scripts/landing/prerender.mjs).
 * - render():       the website "/" (HTML, <head>, island JSON)
 * - renderLegal():  the 5 legal pages as static HTML, same components as the app used
 */
import './ssr-shim';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../i18n';
import { Landing } from './Landing';
import { buildData } from './data';
import { headTags, jsonForScript } from './head';
import type { IslandProps } from './islands';
import { WEB_LEGAL_PAGES } from './legal-pages';
import DataSafety from '../pages/DataSafety';
import { ORIGIN } from './seoRoutes';
import iconUrl from './assets/fincalix-icon-96.webp';

export function render() {
    const data = buildData();
    const html = renderToString(<Landing data={data} />);
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
        `<meta name="theme-color" content="#0F172A">`,
        `<link rel="icon" type="image/png" href="/brand/fincalix-icon-512.png">`,
        `<link rel="apple-touch-icon" href="/brand/fincalix-icon-512.png">`,
        `<meta property="og:type" content="website">`,
        `<meta property="og:site_name" content="FinCalix">`,
        `<meta property="og:url" content="${ORIGIN}/${name}">`,
        `<meta property="og:title" content="${esc(title)}">`,
        `<meta property="og:image" content="${ORIGIN}/og/fincalix-og.png">`,
        `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
        font,
    ].join('\n    ');
}

export async function renderLegal() {
    if (!i18n.isInitialized) await new Promise<void>((ok) => i18n.on('initialized', () => ok()));
    const pages: Array<{ name: string; template: 'legal' | 'datasafety'; html: string; head: string; h1: string }> = [];
    const poppins = '<link rel="stylesheet" data-fc-poppins="true" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap">';
    for (const [name, Page] of Object.entries(WEB_LEGAL_PAGES)) {
        const html = renderToString(<Page />);
        const h1 = unesc((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '');
        pages.push({ name, template: 'legal', html, h1, head: legalHead(name, h1, poppins) });
    }
    const jakarta = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap">';
    const ds = renderToString(<MemoryRouter initialEntries={['/data-safety']}><DataSafety /></MemoryRouter>);
    const dsH1 = unesc((ds.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '');
    pages.push({ name: 'data-safety', template: 'datasafety', html: ds, h1: dsH1, head: legalHead('data-safety', dsH1, jakarta) });
    return { pages, iconUrl };
}
