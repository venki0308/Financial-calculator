/**
 * Browser entry for the website. Hydrates the islands, records taps on the
 * Google Play badges, removes any web-app service worker left from earlier
 * versions (production hosts only), and starts usage analytics once the
 * browser is idle. Analytics follow the app's rules exactly
 * (services/analyticsService): on for every visitor, only allow-listed events
 * and parameters, test-traffic flag honoured.
 */
import { hydrateRoot } from 'react-dom/client';
import './landing.css';
import { ISLANDS, Shell } from './islands';
import type { IslandName, IslandProps } from './islands';
import { startSiteRuntime } from './site-runtime';

const propsEl = document.getElementById('landing-props');
const props: IslandProps = propsEl ? JSON.parse(propsEl.textContent || '{}') : { tools: [] };

document.querySelectorAll<HTMLElement>('[data-island]').forEach((el) => {
    const name = el.dataset.island as IslandName;
    const render = ISLANDS[name];
    if (render) hydrateRoot(el, <Shell>{render(props)}</Shell>);
});

startSiteRuntime('Website');
