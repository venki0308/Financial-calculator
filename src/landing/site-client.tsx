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

startSiteRuntime(document.body.dataset.title || 'Website');
