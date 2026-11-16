// Renders every image in content.mjs to PNG at its exact pixel size, runs QA
// on each one, and writes manifest.csv, qa-report.json and the index.html
// contact sheet.
//
//   node tools/marketing/capture.mjs      (real app screens → marketing-assets/_captures)
//   node tools/marketing/render.mjs       (all images)
//   node tools/marketing/render.mjs tips phone-te    (only files/folders containing these words)
//
// Needs the dev dependency playwright-core, an installed Google Chrome and
// internet access (fonts come from Google Fonts).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { page as renderPage } from './templates.mjs';
import { build } from './content.mjs';
import { pngInfo, toRgb, toRgba } from './lib/png.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(ROOT, 'marketing-assets');
const CAPTURES = path.join(OUT, '_captures');
const HTML_DIR = path.join(OUT, '_html');
const filters = process.argv.slice(2).filter(a => !a.startsWith('--'));

const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } };

// Facts the app computed (written by capture.mjs). Content refers to them by
// path; anything missing is reported and fails QA, so no figure is ever typed by hand.
const facts = readJson(path.join(CAPTURES, 'facts.json'), {});
const missingFacts = new Set();
const fact = (key) => {
    const value = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), facts);
    if (value === undefined || value === null || value === '') { missingFacts.add(key); return `[${key}]`; }
    return String(value);
};

const missingCaptures = new Set();
const ctx = {
    asset: (name) => pathToFileURL(path.join(HERE, 'assets', name)).href,
    capture: ({ id, lang = 'en', theme = 'dark' }) => {
        const file = path.join(CAPTURES, lang, theme, `${id}.png`);
        if (!fs.existsSync(file)) missingCaptures.add(path.relative(CAPTURES, file));
        return pathToFileURL(file).href;
    },
};

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const PLAY = (folder) => folder.startsWith('playstore/');

async function main() {
    const all = build(fact);
    const names = new Set();
    for (const item of all) {
        if (names.has(item.file)) throw new Error(`duplicate file name ${item.file}`);
        names.add(item.file);
    }
    const items = filters.length ? all.filter(i => filters.some(f => `${i.folder}/${i.file}`.includes(f))) : all;
    fs.mkdirSync(HTML_DIR, { recursive: true });

    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ deviceScaleFactor: 1 });
    const tab = await context.newPage();
    const report = [];

    for (const item of items) {
        const dir = path.join(OUT, item.folder);
        fs.mkdirSync(dir, { recursive: true });
        const target = path.join(dir, item.file);
        const qa = { file: `${item.folder}/${item.file}`, expected: `${item.w}x${item.h}`, problems: [] };

        if (item.layout === 'icon') {
            // The existing icon, pixels untouched, re-encoded as 32-bit PNG with alpha.
            const source = fs.readFileSync(path.join(HERE, 'assets', 'app-icon-512.png'));
            qa.sourceBitsPerPixel = pngInfo(source).bitsPerPixel;
            fs.writeFileSync(target, toRgba(source));
        } else {
            const html = renderPage(item, ctx);
            const htmlFile = path.join(HTML_DIR, item.file.replace(/\.png$/, '.html'));
            fs.writeFileSync(htmlFile, html);
            await tab.setViewportSize({ width: item.w, height: item.h });
            await tab.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
            await tab.waitForFunction(() => window.__qa, null, { timeout: 30000 });
            const m = await tab.evaluate(() => window.__qa);
            const shot = await tab.screenshot({ type: 'png', clip: { x: 0, y: 0, width: item.w, height: item.h } });
            // Play assets must be 24-bit with no alpha channel.
            fs.writeFileSync(target, PLAY(item.folder) ? toRgb(shot, [11, 18, 32]) : shot);

            Object.assign(qa, {
                contrastMin: Number(m.contrastMin.toFixed(2)),
                headlinePx: Math.round(m.headlinePx),
                minTextPx: Math.round(m.minTextPx),
                // Size of the headline / smallest text when the image is shown 360 px wide (a phone feed).
                headlineAtThumb: Number((m.headlinePx * 360 / item.w).toFixed(1)),
                minTextAtThumb: Number((m.minTextPx * 360 / item.w).toFixed(1)),
            });
            if (m.overflow.length) qa.problems.push(`text overflow: ${m.overflow.join(' | ')}`);
            if (m.offCanvas.length) qa.problems.push(`text off canvas: ${m.offCanvas.join(' | ')}`);
            if (m.contrastFails.length) qa.problems.push(`contrast below 4.5: ${m.contrastFails.slice(0, 3).join(' | ')}`);
            if (m.fontsMissing.length) qa.problems.push(`font not loaded: ${m.fontsMissing.join(', ')}`);
            if (m.images.length) qa.problems.push(`image missing: ${m.images.join(', ')}`);
            if (m.headlinePx && qa.headlineAtThumb < 12) qa.problems.push(`headline only ${qa.headlineAtThumb}px at thumbnail size`);
            if (m.badgeHeight !== undefined && m.badgeHeight < 28) qa.problems.push('Google Play badge under 28 px');
            // fact() leaves "[key]" in the copy when facts.json has no value for it.
            const { caption, sources, claims, ...visible } = item;
            const unresolved = [...new Set(JSON.stringify(visible).match(/\[[a-zA-Z]+(\.[a-zA-Z0-9]+)+\]/g) || [])];
            if (unresolved.length) qa.problems.push(`figure not found in facts.json: ${unresolved.join(', ')}`);
            const words = (item.headline || '').replace(/\*/g, '').trim().split(/\s+/).length;
            if (item.layout === 'play' && words > 7) qa.problems.push(`headline has ${words} words`);
        }

        const info = pngInfo(fs.readFileSync(target));
        qa.actual = `${info.width}x${info.height}`;
        qa.bitsPerPixel = info.bitsPerPixel;
        qa.kb = Math.round(info.bytes / 1024);
        if (qa.actual !== qa.expected) qa.problems.push(`size is ${qa.actual}`);
        if (PLAY(item.folder) && item.layout !== 'icon' && info.hasAlpha) qa.problems.push('has an alpha channel');
        if (item.layout === 'icon' && (info.bitsPerPixel !== 32 || info.bytes > 1024 * 1024)) qa.problems.push('icon is not 32-bit or is over 1 MB');
        if (PLAY(item.folder) && info.bytes > 8 * 1024 * 1024) qa.problems.push('over 8 MB');
        report.push(qa);
        console.log(`${qa.problems.length ? '✗' : '✓'} ${qa.file}${qa.problems.length ? '  ← ' + qa.problems.join('; ') : ''}`);
    }
    await browser.close();

    // The manifest and contact sheet always describe the full set.
    const onDisk = all.filter(i => fs.existsSync(path.join(OUT, i.folder, i.file)));
    const header = ['file', 'size', 'channel', 'headline', 'caption suggestion', 'claims used', 'sources'];
    const rows = onDisk.map(i => [
        `${i.folder}/${i.file}`, `${i.w}x${i.h}`, i.channel, (i.headline || '').replace(/\*/g, ''),
        i.caption || '', (i.claims || []).join('; '), (i.sources || []).join('; '),
    ]);
    fs.writeFileSync(path.join(OUT, 'manifest.csv'), '﻿' + [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n');

    const previous = readJson(path.join(OUT, 'qa-report.json'), { images: [] }).images.filter(r => !report.some(n => n.file === r.file) && fs.existsSync(path.join(OUT, r.file)));
    const merged = [...previous, ...report].sort((a, b) => a.file.localeCompare(b.file));
    fs.writeFileSync(path.join(OUT, 'qa-report.json'), JSON.stringify({ generated: new Date().toISOString(), missingCaptures: [...missingCaptures], images: merged }, null, 2));

    const status = new Map(merged.map(r => [r.file, r]));
    const groups = new Map();
    for (const i of onDisk) { if (!groups.has(i.folder)) groups.set(i.folder, []); groups.get(i.folder).push(i); }
    const sheet = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FinCalix marketing assets</title><style>
:root{color-scheme:dark}body{margin:0;padding:24px;background:#0B1220;color:#F8FAFC;font:14px/1.4 system-ui,sans-serif}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:32px 0 12px;padding-top:16px;border-top:1px solid #334155}
p{color:#A3B1C6;margin:0 0 8px}.grid{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}
figure{margin:0;width:200px}figure.wide{width:320px}figure img{width:100%;height:auto;display:block;border-radius:8px;border:1px solid #334155;background:#0F172A}
figcaption{font-size:11px;color:#A3B1C6;margin-top:6px;word-break:break-all}figcaption b{color:#F8FAFC;font-weight:600;display:block}
.bad{color:#F87171}a{color:inherit;text-decoration:none}</style></head><body>
<h1>FinCalix marketing assets</h1>
<p>${onDisk.length} images. Click a thumbnail for the full-size file. Details: <a href="manifest.csv"><u>manifest.csv</u></a>, <a href="qa-report.json"><u>qa-report.json</u></a>.</p>
${[...groups].map(([folder, list]) => `<h2>${folder} (${list.length})</h2><div class="grid">${list.map(i => {
        const r = status.get(`${i.folder}/${i.file}`);
        const bad = r && r.problems.length ? `<span class="bad">${r.problems.join('; ')}</span>` : '';
        return `<figure class="${i.w > i.h ? 'wide' : ''}"><a href="${i.folder}/${i.file}"><img loading="lazy" src="${i.folder}/${i.file}" alt=""></a><figcaption><b>${(i.headline || i.topic || '').replace(/\*/g, '').replace(/</g, '&lt;')}</b>${i.file} · ${i.w}×${i.h}${bad ? '<br>' + bad : ''}</figcaption></figure>`;
    }).join('')}</div>`).join('\n')}
</body></html>`;
    fs.writeFileSync(path.join(OUT, 'index.html'), sheet);

    const failed = report.filter(r => r.problems.length);
    console.log(`\nRendered ${report.length} image(s); ${failed.length} with problems. On disk: ${onDisk.length} of ${all.length}.`);
    if (missingCaptures.size) console.log(`Missing captures: ${[...missingCaptures].join(', ')}`);
    if (missingFacts.size) console.log(`Missing facts: ${[...missingFacts].join(', ')}`);
    process.exit(failed.length || missingCaptures.size ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
