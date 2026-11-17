/**
 * Browser entry for the generated website pages (category pages, /calculators, /schemes,
 * scheme pages, /in-the-app, 404, /export-my-data): theme switch, shared runtime and,
 * on /export-my-data, the export.
 */
import { hydrateRoot } from 'react-dom/client';
import './landing.css';
import { ISLANDS, Shell } from './islands';
import { startSiteRuntime } from './site-runtime';
import { initExportPage } from './exportPage';

document.querySelectorAll<HTMLElement>('[data-island="header"]').forEach((el) => {
    hydrateRoot(el, <Shell>{ISLANDS.header()}</Shell>);
});

const exportRoot = document.querySelector<HTMLElement>('[data-export-root]');
if (exportRoot) initExportPage(exportRoot);

// Feature pages: the calculator is pre-rendered with its starting values; make it interactive
// from one lazily loaded chunk, so reading the page needs no JavaScript.
const calcRoots = document.querySelectorAll<HTMLElement>('[data-calc]');
if (calcRoots.length) {
    void import('./features/calcs/all').then(({ CALCS }) => {
        calcRoots.forEach((el) => {
            const C = CALCS[el.dataset.calc as keyof typeof CALCS];
            if (!C) return;
            hydrateRoot(el, <C {...JSON.parse(el.dataset.props || '{}')} />);
        });
    });
}

startSiteRuntime(document.body.dataset.title || 'Website');
