/**
 * Browser entry for the pre-rendered /data-safety page: the app's own Data & Privacy
 * screen (src/pages/DataSafety.tsx) with its language selector, without the app shell.
 */
import '../i18n';
import '../index.css';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import DataSafety from '../pages/DataSafety';
import { useSettingsStore } from '../store/useSettingsStore';

// Same theme switch the app applies on start (App.tsx): the saved setting, dark by default.
const dark = useSettingsStore.getState().darkMode;
document.documentElement.classList.toggle('dark', dark);
document.documentElement.classList.toggle('light', !dark);

const root = document.getElementById('root');
if (root) createRoot(root).render(<BrowserRouter><DataSafety /></BrowserRouter>);

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => { void r.unregister(); })).catch(() => {});
}
