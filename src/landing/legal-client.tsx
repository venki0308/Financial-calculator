/**
 * Browser entry for the pre-rendered legal pages (privacy policy, data privacy,
 * terms, about). Re-renders the page component over the static HTML so the language
 * selector and the visitor's saved theme work; no app shell, no app bundle.
 */
import './fonts/poppins.css'; // self-hosted: the legal pages contact no font service
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { initExportBanner } from './exportBanner';
import { SITE_THEME_KEY } from './HeaderControls';
import { WEB_LEGAL_PAGES } from './legal-pages';
import { setWebsiteTheme } from '../theme/useAppColors';

// The website's theme (light unless the visitor picked dark on fincalix.com), not the app setting.
let dark = false;
try { dark = localStorage.getItem(SITE_THEME_KEY) === 'dark'; } catch { /* light */ }
setWebsiteTheme(dark);

const name = document.body.dataset.page || '';
const Page = WEB_LEGAL_PAGES[name];
const root = document.getElementById('root');
if (Page && root) flushSync(() => createRoot(root).render(<Page />));
// legal.html hides a dark page until this point so it never flashes light.
document.documentElement.style.visibility = '';

// The web app is not offered on fincalix.com: drop any old web-app service worker.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => { void r.unregister(); })).catch(() => {});
}

// One-time banner for a browser that still holds FinCalix data from the old web app.
initExportBanner();
