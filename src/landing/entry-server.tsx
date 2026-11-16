/**
 * Pre-render entry (built with `vite build --ssr`, run by scripts/landing/prerender.mjs).
 * Returns the page HTML, the <head> tags and the JSON the islands hydrate with.
 */
import { renderToString } from 'react-dom/server';
import { Landing } from './Landing';
import { buildData } from './data';
import { headTags, jsonForScript } from './head';
import type { IslandProps } from './islands';

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
