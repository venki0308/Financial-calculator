/**
 * Added at build time to the 27 static calculator pages (which have no other script):
 * removes an old web-app service worker and shows the one-time export banner. No analytics.
 */
import { initExportBanner } from './exportBanner';

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => { void r.unregister(); })).catch(() => {});
}
initExportBanner();
