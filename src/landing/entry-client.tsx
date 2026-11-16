/**
 * Browser entry for the website. Hydrates the islands, records taps on the
 * Google Play badges, removes any web-app service worker left from earlier
 * versions (production hosts only), and starts usage analytics once the
 * browser is idle. Analytics follow the app's rules exactly
 * (services/analyticsService): on by default, nothing sent while switched off
 * in the app's Settings → Privacy, only allow-listed events and parameters,
 * test-traffic flag honoured.
 */
import { hydrateRoot } from 'react-dom/client';
import './landing.css';
import { ISLANDS, Shell } from './islands';
import type { IslandName, IslandProps } from './islands';
import { AnalyticsService } from '../services/analyticsService';
import { AnalyticsEvent } from '../services/providers/types';

const propsEl = document.getElementById('landing-props');
const props: IslandProps = propsEl ? JSON.parse(propsEl.textContent || '{}') : { tools: [] };

document.querySelectorAll<HTMLElement>('[data-island]').forEach((el) => {
    const name = el.dataset.island as IslandName;
    const render = ISLANDS[name];
    if (render) hydrateRoot(el, <Shell>{render(props)}</Shell>);
});

// The web app is not offered on fincalix.com: drop any service worker an older
// version installed (public/sw.js also turns itself off on these hosts).
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => { void r.unregister(); })).catch(() => {});
}

// One page view for the website. Queued until the provider has loaded.
AnalyticsService.trackPage({ page_title: 'Website', page_location: `${location.origin}/` });

// Google Play badges: "play_badge_click" with where the badge sits. If the provider
// is not loaded yet, the event is queued on the device and sent once it is.
document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest<HTMLElement>('[data-play]');
    if (!a) return;
    AnalyticsService.trackEvent(AnalyticsEvent.PLAY_BADGE_CLICK, { placement: a.dataset.play || '' });
}, { capture: true });

// Load the analytics provider only after the page is idle (outside the page-weight budget).
const start = () => { void AnalyticsService.initialize(); };
if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 5000 });
else setTimeout(start, 3000);
