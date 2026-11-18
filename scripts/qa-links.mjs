// QA audit: official sources and the "not a government app" notice (Play Misleading Claims policy).
//
//  1. Wiring (no network): the Sources & Disclaimer screen is in Settings → About; its 10 required
//     sources are listed; every language has the screen's strings and the notice; the notice is on the
//     Schemes list and every scheme screen; every calculator that uses government rules or rates has
//     an "Official source"; every website tax page has the notice; app links open through
//     openExternal (in-app browser) and never as a plain new-window link.
//  2. Built website (needs `npm run build:web`): every scheme page, the /schemes index and every
//     mapped guide carry the notice and their official link(s) in the pre-rendered HTML.
//  3. Network: every official URL the app or website shows answers 200 (redirects followed). A URL
//     that fails in Node (government servers often send an incomplete certificate chain, which
//     browsers complete themselves) is retried in real Chrome; it passes only with a 200 there.
//
//   node scripts/qa-links.mjs            (all three)
//   node scripts/qa-links.mjs --offline  (1 and 2 only)
import fs from 'node:fs';
import { buildSync } from 'esbuild';

let passed = 0, failed = 0;
const check = (label, ok, detail = '') => {
    if (ok) passed++; else failed++;
    console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  [${detail}]` : ''}`);
};
const load = async (entry) => {
    const out = buildSync({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error', loader: { '.json': 'json' } });
    return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
};
const read = (f) => fs.readFileSync(f, 'utf8');

const src = await load('src/data/officialSources.ts');
const { schemes } = await load('src/data/schemes.ts');
const siteData = await load('src/landing/site-data.ts');

const REQUIRED_HOSTS = ['incometax.gov.in', 'indiabudget.gov.in', 'rbi.org.in', 'indiapost.gov.in', 'nsiindia.gov.in', 'epfindia.gov.in', 'pfrda.org.in', 'gst.gov.in', 'myscheme.gov.in', 'india.gov.in'];
// Calculators that use government rules or rates (Play listing review, 18 Nov 2026).
const REQUIRED_CALCS = {
    tax: '/calculator/income-tax', hra: '/calculator/hra', gst: '/calculator/gst', tds: '/calculator/form16-tax',
    capitalGains: '/calculator/capital-gains', ppf: '/calculator/ppf', epf: '/calculator/epf', nps: '/calculator/nps',
    ssy: '/calculator/sukanya-samriddhi', nsc: '/calculator/nsc', kvp: '/calculator/kvp', scss: '/calculator/senior-citizen-savings',
    postOfficeMis: '/calculator/post-office-mis', postOfficeTd: '/calculator/post-office-td', postOfficeRd: '/calculator/recurring-deposit',
    gratuity: '/calculator/gratuity', goldLoanLtv: '/gold-loan',
};

console.log('\n1. Wiring');
{
    const hosts = src.OFFICIAL_SOURCES.map((s) => s.host);
    check('Sources & Disclaimer lists the 10 required official sources', REQUIRED_HOSTS.every((h) => hosts.includes(h)) && src.OFFICIAL_SOURCES.every((s) => src.hostOf(s.url).endsWith(s.host)), REQUIRED_HOSTS.filter((h) => !hosts.includes(h)).join(', '));
    const app = read('src/App.tsx');
    const settings = read('src/pages/Settings.tsx');
    check('the screen is routed (/sources) and opened from Settings → About', /path="\/sources" element=\{<SourcesDisclaimer \/>\}/.test(app) && /navigate\('\/sources'\)/.test(settings) && settings.indexOf("navigate('/sources')") > settings.indexOf("navigate('/about')"));

    const en = JSON.parse(read('src/locales/en.json'));
    const flat = (o, p = '', out = {}) => { for (const [k, v] of Object.entries(o || {})) { const q = p ? `${p}.${k}` : k; if (v && typeof v === 'object') flat(v, q, out); else out[q] = v; } return out; };
    const enKeys = Object.keys(flat(en.sources));
    const i18nBad = [];
    for (const l of ['en', 'hi', 'te', 'ta', 'kn', 'ml']) {
        const s = flat(JSON.parse(read(`src/locales/${l}.json`)).sources);
        for (const k of enKeys) if (typeof s[k] !== 'string' || !s[k].trim()) i18nBad.push(`${l}: sources.${k}`);
        for (const o of src.OFFICIAL_SOURCES) if (!s[`purpose.${o.id}`]) i18nBad.push(`${l}: purpose.${o.id}`);
        if (l !== 'en' && s.notGovt === en.sources.notGovt) i18nBad.push(`${l}: notice not translated`);
    }
    check(`the screen and the notice are in all 6 languages (${enKeys.length} strings each)`, i18nBad.length === 0, i18nBad.slice(0, 4).join(' | '));
    check('English notice is exactly "FinCalix is not a government app and does not represent any government entity."', en.sources.notGovt === src.NOT_GOVT_NOTICE_EN && src.NOT_GOVT_NOTICE_EN === 'FinCalix is not a government app and does not represent any government entity.');

    const list = read('src/pages/Schemes.tsx'), detail = read('src/pages/SchemeDetail.tsx');
    check('Schemes list: notice with the official scheme portal at the top (before search)', /<GovtNotice url=\{SCHEME_PORTAL\.url\}/.test(list) && list.indexOf('<GovtNotice') < list.indexOf('{/* Search */}'));
    const header = detail.slice(detail.indexOf('sticky top-0'), detail.indexOf('</h1>') + 250);
    check("every scheme screen: notice with the scheme's official portal in the header, right under the scheme name (first screen)", /<GovtNotice url=\{scheme\.officialWebsite\}/.test(header));
    check(`every scheme has an https official website (${schemes.length} schemes)`, schemes.every((s) => /^https:\/\//.test(s.officialWebsite || '')), schemes.filter((s) => !/^https:\/\//.test(s.officialWebsite || '')).map((s) => s.id).join(', '));

    const routeEl = Object.fromEntries([...app.matchAll(/<Route path="([^"]+)" element=\{<(\w+) \/>\}/g)].map((m) => [m[1], m[2]]));
    const lazyFile = Object.fromEntries([...app.matchAll(/const (\w+)\s*=\s*lr\(\(\) => import\('\.\/pages\/([^']+)'\)\)/g)].map((m) => [m[1], `src/pages/${m[2]}.tsx`]));
    const calcBad = [];
    for (const [name, route] of Object.entries(REQUIRED_CALCS)) {
        const file = lazyFile[routeEl[route]];
        if (!src.CALCULATOR_SOURCES[route]?.length) calcBad.push(`${name}: no source for ${route}`);
        else if (!file || !fs.existsSync(file)) calcBad.push(`${name}: no page for ${route}`);
        else if (!/<DisclaimerComponent\b/.test(read(file))) calcBad.push(`${name}: ${file} has no DisclaimerComponent (where the source shows)`);
    }
    const disc = read('src/components/DisclaimerComponent.tsx');
    check(`"Official source" on all ${Object.keys(REQUIRED_CALCS).length} calculators that use government rules or rates (tax, HRA, GST, TDS, capital gains, PPF, EPF, NPS, SSY, NSC, KVP, SCSS, Post Office MIS/TD/RD, gratuity, gold loan LTV)`,
        calcBad.length === 0 && /CALCULATOR_SOURCES\[useLocation\(\)\.pathname\]/.test(disc) && /<OfficialSourceRow sources=\{sources\} \/>/.test(disc), calcBad.join(' | '));

    const taxPages = fs.readdirSync('src/landing/features/pages').filter((f) => /category: 'tax'/.test(read(`src/landing/features/pages/${f}`))).map((f) => f.replace(/\.tsx$/, ''));
    check(`website: every tax guide (${taxPages.length}) has the notice and official source`, taxPages.length >= 8 && taxPages.every((p) => src.WEBSITE_PAGE_SOURCES[p]?.length), taxPages.filter((p) => !src.WEBSITE_PAGE_SOURCES[p]).join(', '));

    // In-app browser: official links go through openExternal (Capacitor Browser = Chrome Custom Tabs).
    const ox = read('src/utils/openExternal.ts'), comp = read('src/components/OfficialSources.tsx');
    const pkg = JSON.parse(read('package.json'));
    const plain = [];
    for (const f of ['src/pages/Schemes.tsx', 'src/pages/SchemeDetail.tsx', 'src/pages/SourcesDisclaimer.tsx', 'src/components/DisclaimerComponent.tsx']) {
        for (const line of read(f).split('\n')) if (/<a\b[^>]*href=\{?["'`]?https?:/.test(line)) plain.push(`${f}: ${line.trim().slice(0, 60)}`);
    }
    check('app links open in the in-app browser (@capacitor/browser via openExternal); no plain external <a> on these screens',
        !!pkg.dependencies['@capacitor/browser'] && /Browser\.open\(\{ url \}\)/.test(ox) && /openExternal\(url\)/.test(comp) && plain.length === 0, plain.join(' | '));
    const androidPlugins = fs.existsSync('android/app/src/main/assets/capacitor.plugins.json') ? read('android/app/src/main/assets/capacitor.plugins.json') : '';
    check('Android project has the Browser plugin synced (npx cap sync android)', /@capacitor\/browser/.test(androidPlugins), androidPlugins ? '' : 'android assets missing');
}

console.log('\n2. Built website (dist/)');
const schemePages = siteData.buildSchemePages();
if (!fs.existsSync('dist/schemes/index.html') && !fs.existsSync('dist/schemes.html')) {
    check('dist/ has the website (run npm run build:web first)', false);
} else {
    const html = (p) => { for (const f of [`dist${p}/index.html`, `dist${p}.html`]) if (fs.existsSync(f)) return read(f); return ''; };
    const notice = (h) => /data-govt-notice/.test(h) && h.includes(src.NOT_GOVT_NOTICE_EN);
    const idx = html('/schemes');
    check('/schemes: notice with myscheme.gov.in under the heading', notice(idx) && idx.includes(`href="${src.SCHEME_PORTAL.url}"`) && idx.indexOf('data-govt-notice') < idx.indexOf('class="lead"'));
    const bad = [];
    for (const p of schemePages) {
        const h = html(p.path);
        const url = p.content ? p.content.portal.url : p.scheme.officialWebsite;
        const head = h.slice(h.indexOf('<h1'), h.indexOf('<h1') + 3000);
        if (!h) bad.push(`${p.path}: not built`);
        else if (!notice(head) || !head.includes(`href="${url.replace(/&/g, '&amp;')}"`)) bad.push(`${p.path}: notice or portal link missing under the heading`);
    }
    check(`all ${schemePages.length} scheme pages: notice and official portal link under the heading`, bad.length === 0 && schemePages.length > 30, bad.slice(0, 3).join(' | '));
    const fbad = [];
    for (const [slug, links] of Object.entries(src.WEBSITE_PAGE_SOURCES)) {
        const h = html(`/${slug}`);
        const head = h.slice(h.indexOf('<h1'), h.indexOf('<h1') + 3000);
        if (!h) fbad.push(`/${slug}: not built`);
        else if (!notice(head) || !links.every((l) => head.includes(`href="${l.url.replace(/&/g, '&amp;')}"`))) fbad.push(`/${slug}`);
    }
    check(`all ${Object.keys(src.WEBSITE_PAGE_SOURCES).length} tax and government-rate guides: notice and official source links under the heading`, fbad.length === 0, fbad.slice(0, 4).join(' | '));
}

if (process.argv.includes('--offline')) finish();

console.log('\n3. Every official link answers 200');
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const urls = new Map(); // url -> where it is shown
const add = (u, where) => { if (!urls.has(u)) urls.set(u, where); };
for (const u of src.ALL_SOURCE_URLS) add(u, 'officialSources.ts');
for (const s of schemes) {
    add(s.officialWebsite, `scheme ${s.id}`);
    if (s.verifiedSource) add(`https://${s.verifiedSource}`, `scheme ${s.id} (verified source)`);
}
for (const p of schemePages) if (p.content) add(p.content.portal.url, `website ${p.path}`);

async function viaFetch(u) {
    for (let i = 0; i < 2; i++) {
        try {
            const c = new AbortController();
            const t = setTimeout(() => c.abort(), 25000);
            const r = await fetch(u, { headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,*/*' }, redirect: 'follow', signal: c.signal });
            clearTimeout(t);
            await r.arrayBuffer().catch(() => {});
            return { status: r.status, final: r.url };
        } catch (e) {
            if (i === 1) return { status: 0, error: e.cause?.code || e.name || e.message };
        }
    }
}
const results = [];
const list = [...urls.keys()];
for (let i = 0; i < list.length; i += 8) {
    results.push(...await Promise.all(list.slice(i, i + 8).map(async (u) => ({ u, ...(await viaFetch(u)) }))));
}
const retry = results.filter((r) => r.status !== 200);
if (retry.length) {
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 412, height: 915 } });
        for (const r of retry) {
            const page = await ctx.newPage();
            try {
                const resp = await page.goto(r.u, { waitUntil: 'domcontentloaded', timeout: 45000 });
                r.chrome = resp ? resp.status() : 0;
                r.final = page.url();
            } catch (e) {
                r.chrome = 0;
                r.chromeError = (e.message || '').split('\n')[0].slice(0, 80);
            }
            await page.close();
        }
    } finally {
        await browser.close();
    }
}
const bad = results.filter((r) => r.status !== 200 && r.chrome !== 200);
for (const r of results.filter((x) => x.status !== 200)) {
    console.log(`    ${r.chrome === 200 ? 'ok in Chrome' : 'FAIL'}: ${r.u} — Node: ${r.status || r.error}${r.chrome !== undefined ? `, Chrome: ${r.chrome || r.chromeError}` : ''}${r.final && r.final !== r.u ? ` → ${r.final}` : ''}  (${urls.get(r.u)})`);
}
check(`all ${results.length} official links answer 200 (${results.filter((r) => r.status === 200).length} directly, ${results.filter((r) => r.status !== 200 && r.chrome === 200).length} in Chrome only)`, bad.length === 0, bad.map((r) => `${r.u} (${urls.get(r.u)})`).slice(0, 6).join(' | '));
finish();

function finish() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════════════');
    process.exit(failed ? 1 : 0);
}
