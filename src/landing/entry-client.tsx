/**
 * Browser entry for the website. Hydrates the four islands, records taps on
 * the calls to action, and starts usage analytics once the browser is idle.
 * Analytics follow the app's rules exactly (services/analyticsService): on by
 * default, nothing sent while switched off in the app's Settings → Privacy,
 * only allow-listed events and parameters, test-traffic flag honoured.
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

// One page view for the website. Queued until the provider has loaded.
AnalyticsService.trackPage({ page_title: 'Website', page_location: `${location.origin}/` });

// Calls to action: "open_app" / "play_badge" with where the button sits. If the
// provider is not loaded yet the event is queued on the device and sent by the
// website or by the app (same queue), never dropped by navigation.
document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest<HTMLElement>('[data-cta]');
    if (!a) return;
    const name = a.dataset.cta === 'play_badge' ? AnalyticsEvent.PLAY_BADGE : AnalyticsEvent.OPEN_APP;
    AnalyticsService.trackEvent(name, { cta_location: a.dataset.ctaLoc || '' });
}, { capture: true });

// Load the analytics provider only after the page is idle (outside the page-weight budget).
const start = () => { void AnalyticsService.initialize(); };
if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 5000 });
else setTimeout(start, 3000);
