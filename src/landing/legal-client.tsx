/**
 * Browser entry for the pre-rendered legal pages (privacy policy, data privacy,
 * terms, about). Re-renders the page component over the static HTML so the language
 * selector and the visitor's saved theme work; no app shell, no app bundle.
 */
import { createRoot } from 'react-dom/client';
import { initExportBanner } from './exportBanner';
import { WEB_LEGAL_PAGES } from './legal-pages';

const name = document.body.dataset.page || '';
const Page = WEB_LEGAL_PAGES[name];
const root = document.getElementById('root');
if (Page && root) createRoot(root).render(<Page />);

// The web app is not offered on fincalix.com: drop any old web-app service worker.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => { void r.unregister(); })).catch(() => {});
}

// One-time banner for a browser that still holds FinCalix data from the old web app.
initExportBanner();
