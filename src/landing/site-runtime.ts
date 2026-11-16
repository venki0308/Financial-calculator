/**
 * Browser behaviour shared by every website page that has a client script (home, the
 * generated pages, legal pages): remove any old web-app service worker, record one
 * page view and the Google Play badge taps, start analytics after idle, and show the
 * one-time export banner. Analytics follow the app's rules (services/analyticsService).
 */
import { AnalyticsService } from '../services/analyticsService';
import { AnalyticsEvent } from '../services/providers/types';
import { initExportBanner } from './exportBanner';

export function startSiteRuntime(pageTitle: string): void {
    // The web app is not offered on fincalix.com: drop any service worker an older
    // version installed (public/sw.js also turns itself off on web hosts).
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => { void r.unregister(); })).catch(() => {});
    }

    // One page view per page. Queued until the provider has loaded.
    AnalyticsService.trackPage({ page_title: pageTitle, page_location: `${location.origin}${location.pathname}` });

    // Google Play badges: "play_badge_click" with where the badge sits.
    document.addEventListener('click', (e) => {
        const a = (e.target as Element | null)?.closest<HTMLElement>('[data-play]');
        if (!a) return;
        AnalyticsService.trackEvent(AnalyticsEvent.PLAY_BADGE_CLICK, { placement: a.dataset.play || '' });
    }, { capture: true });

    // Load the analytics provider only after the page is idle (outside the page-weight budget).
    const start = () => { void AnalyticsService.initialize(); };
    if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 5000 });
    else setTimeout(start, 3000);

    initExportBanner();
}
