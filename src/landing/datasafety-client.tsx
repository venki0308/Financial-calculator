/**
 * Browser entry for the pre-rendered /data-safety page: the app's own Data & Privacy
 * screen (src/pages/DataSafety.tsx) with its language selector, without the app shell.
 */
import '../i18n';
import '../index.css';
import { createRoot } from 'react-dom/client';
import { initExportBanner } from './exportBanner';
import { BrowserRouter } from 'react-router-dom';
import DataSafety from '../pages/DataSafety';
import { SITE_THEME_KEY } from './HeaderControls';
import { setWebsiteTheme } from '../theme/useAppColors';

// The website's theme (light unless the visitor picked dark on fincalix.com), not the app setting.
let dark = false;
try { dark = localStorage.getItem(SITE_THEME_KEY) === 'dark'; } catch { /* light */ }
setWebsiteTheme(dark);
document.documentElement.classList.toggle('dark', dark);
document.documentElement.classList.toggle('light', !dark);

const root = document.getElementById('root');
if (root) createRoot(root).render(<BrowserRouter><DataSafety /></BrowserRouter>);

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => { void r.unregister(); })).catch(() => {});
}

// One-time banner for a browser that still holds FinCalix data from the old web app.
initExportBanner();
