// QA audit: fincalix.com (marketing site, Google Play installs only) and the web-app lock.
//
//   npm run build:web
//   node scripts/qa-landing.mjs
//
// Serves dist/ like Vercel (scripts/landing/serve-dist.mjs), evaluating vercel.json for
// the production host (fincalix.com), www, the public bay.vercel.app alias and the dev host.
// 1. "/" without JavaScript: hero, every registered tool, FAQ in the HTML; head, canonical,
//    structured data; only Google Play badges (4 placements, referrer each); no app links,
//    no manifest, no service worker; no banned claim; images sized and described.
// 2. Every link on "/" resolves on production.
// 3. Production lock: every app route 308s to its generated target (static guide, category
//    page, /schemes/<id> or /in-the-app); unknown paths are a real 404; the app shell is never
//    served; legal pages are static HTML; generated pages (intro, descriptions, canonical,
//    robots, scheme verified date); sitemap = every indexable page; config.json unchanged;
//    www redirects except /export-my-data; any other host behaves like production.
// 4. Dev host: the full app works, X-Robots-Tag: noindex.
// 5. In Chrome (production rules): no console error; no app bundle or app shell requested
//    on the website, static or legal pages; legal text identical to what the app showed;
//    calculator = the app's functions; analytics (play_badge_click, test traffic); nothing
//    when analytics are off; no overflow at any width 360–1920; both hero phones inside the
//    viewport; layout shift; theme; keyboard; ?q=; the service-worker kill switch;
//    export banner (data only, dismiss, back once after 30 days, never a third time) and
//    /export-my-data (the app's own backup file); iPhone note, desktop-only QR code.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { buildSync } from 'esbuild';
import { chromium } from 'playwright-core';
import { serveDist } from './landing/serve-dist.mjs';
import { runDevModeProof } from './landing/dev-mode-proof.mjs';

let passed = 0, failed = 0;
const check = (label, ok, detail = '') => {
    if (ok) passed++; else failed++;
    console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  [${detail}]` : ''}`);
};
const load = async (entry) => {
    const out = buildSync({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error', loader: { '.json': 'json' } });
    return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
};
const calc = await load('src/utils/calculations.ts');
const tax = await load('src/utils/incomeTax.ts');
const seo = await load('src/landing/seoRoutes.ts');
const content = await load('src/landing/content.ts');
const play = await load('src/landing/play.ts');
const reg = await load('src/data/calculatorList.ts');
const siteData = await load('src/landing/site-data.ts');
const rt = await load('src/landing/routeTargets.generated.ts');

const PROD = 'fincalix.com';
const PLACEMENTS = ['header', 'hero', 'mini_calc', 'final_cta'];
const BANNED = /#1\b|\bbest\b|guarantee|zero data collection|no tracking|100% offline|firebase|google llc|hyderabad|guntur|rates updated jul 2026|ai financial advisor|open app|open fincalix|use in browser/i;
// Since 18 Nov 2026 there is no analytics switch: no text may offer one, in any language.
const OFF_SWITCH = /settings\s*(?:→|->|&gt;|>)\s*privacy|turn(?:ed|ing|s)? (?:it |them |analytics |usage analytics )?off|switch(?:ed|ing|es)? (?:it |them |analytics |usage analytics )off|disabl(?:e|ed|ing) (?:usage )?analytics|stop usage analytics|opt(?:s|ed|ing)?[- ]out of (?:usage )?(?:analytics|statistics)|usage analytics (?:switch|toggle)/i;
const OFF_SWITCH_I18N = /सेटिंग्स\s*→\s*गोपनीयता|సెట్టింగ్‌లు\s*→\s*గోప్యత|அமைப்புகள்\s*→\s*தனியுரிமை|ಸೆಟ್ಟಿಂಗ್‌ಗಳು\s*→\s*ಗೌಪ್ಯತೆ|ക്രമീകരണങ്ങൾ\s*→\s*സ്വകാര്യത|बंद कर सकते|ఆఫ్ చేయ|முடக்க|ಆಫ್ ಮಾಡ|ഓഫ് ചെയ്യ/;
const ANALYTICS_WORD = /analytic|statistic|एनालिटिक्स|आँकड़े|విశ్లేషణ|గణాంక|பகுப்பாய்வு|புள்ளிவிவர|ಅನಾಲಿಟಿಕ್ಸ್|ಅಂಕಿಅಂಶ|അനലിറ്റിക്സ്|സ്ഥിതിവിവര/i;
const ANALYTICS_HOSTS = /(^|\.)(google-analytics\.com|analytics\.google\.com|googletagmanager\.com|firebase\.googleapis\.com|firebaseinstallations\.googleapis\.com|app-measurement\.com)$/;
const COLLECT_HOSTS = /(^|\.)(google-analytics\.com|analytics\.google\.com|app-measurement\.com)$/;

const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];
const norm = (s) => s.replace(/\s+/g, ' ').trim();

function decode(req) {
    const u = new URL(req.url());
    const base = new URLSearchParams(u.search);
    const out = [];
    for (const line of [u.search.slice(1), ...(req.postData() || '').split('\n')].filter(Boolean)) {
        const p = new URLSearchParams(line);
        const en = p.get('en');
        if (!en) continue;
        const ep = {};
        for (const [k, v] of p) if (/^(ep|epn)\./.test(k)) ep[k.replace(/^(ep|epn)\./, '')] = v;
        const get = (k) => p.get(k) ?? base.get(k);
        out.push({ en, ep, dt: get('dt') || '', tt: get('tt') || '' });
    }
    return out;
}

async function main() {
    const prod = await serveDist({ port: 4323, asHost: PROD });
    const dev = await serveDist({ port: 4324, forceDev: true });   // as a browser with the dev cookie
    const www = await serveDist({ port: 4325, asHost: 'www.fincalix.com' });
    const bay = await serveDist({ port: 4326, asHost: 'financial-calculator-bay.vercel.app' });
    // sitemap.xml is an index of sitemap-*.xml files: return all of their <url> entries as one XML text.
    const sitemapXml = async (base) => {
        const idx = (await get(base, '/sitemap.xml')).body;
        const kids = [...idx.matchAll(/<sitemap>\s*<loc>https:\/\/fincalix\.com(\/[^<]+)<\/loc>/g)].map((m) => m[1]);
        if (!kids.length) return idx;
        let all = '';
        for (const k of kids) all += (await get(base, k)).body;
        return all;
    };
    const get = async (base, p, cookie) => { const r = await fetch(base + p, { redirect: 'manual', headers: cookie ? { cookie } : {} }); return { status: r.status, loc: r.headers.get('location'), robots: r.headers.get('x-robots-tag'), cache: r.headers.get('cache-control') || '', setCookie: r.headers.get('set-cookie') || '', r, body: await r.text() }; };
    try {
        // ── 1. "/" without JavaScript ───────────────────────────────────────
        console.log('\n1. "/" without JavaScript (production)');
        const res = await fetch(prod.base + '/');
        const html = await res.text();
        check('"/" answers 200 with HTML, indexable', res.status === 200 && /text\/html/.test(res.headers.get('content-type') || '') && !res.headers.get('x-robots-tag'));
        const body = text(html.split(/<body[^>]*>/)[1] || '');
        check('hero headline and promise are in the HTML', body.includes('Every money decision, worked out in seconds.') && body.includes('Your financial data stays on your device'));
        check('the hero figure is pre-rendered (live mini-calculator result)', /Monthly EMI ₹26,035/.test(body), (body.match(/Monthly EMI ₹[\d,]+/) || [''])[0]);
        const props = JSON.parse((html.match(/<script id="landing-props" type="application\/json">([\s\S]*?)<\/script>/) || [])[1] || '{"tools":[]}');
        const regCount = reg.allCalcs.length + reg.appTools.length;
        check('every registered tool is listed (registry = page)', props.tools.length === regCount && props.tools.every((t) => body.includes(t.name)), `${props.tools.length} on page, ${regCount} in registry`);
        const questions = [...html.matchAll(/<summary><span>([\s\S]*?)<\/span><\/summary>/g)].map((m) => text(m[1]));
        check('FAQ questions and answers are in the HTML (8–10)', questions.length >= 8 && questions.length <= 10 && questions.every((q) => body.includes(q)), `${questions.length} questions`);
        check('tax spotlight figures come from the tax engine', body.includes(calc.formatINR(tax.NEW_REGIME_REBATE_LIMIT)) && body.includes(calc.formatINR(tax.NEW_REGIME_STANDARD_DEDUCTION))
            && body.includes(calc.formatINR(Math.round(tax.compareSalaryTax(tax.NEW_REGIME_REBATE_LIMIT + tax.NEW_REGIME_STANDARD_DEDUCTION, 0).oldTax.totalTax))));
        const badges = [...html.matchAll(/<a\b[^>]*data-play="([^"]+)"[^>]*>/g)].map((m) => ({ placement: m[1], tag: m[0] }));
        const badgePlacements = badges.map((b) => b.placement);
        check('Google Play badge in exactly the 4 placements', JSON.stringify([...new Set(badgePlacements)].sort()) === JSON.stringify([...PLACEMENTS].sort()) && badges.length === 5, badgePlacements.join(', '));
        check('every Play link carries its own install referrer (utm_content = placement)', badges.every((b) => attr(b.tag, 'href').replace(/&amp;/g, '&') === play.playUrl(b.placement) && attr(b.tag, 'target') === '_blank'));
        const imgBadges = [...html.matchAll(/<a\b[^>]*data-play="(header|hero|final_cta|mini_calc)"[^>]*>\s*<img\b[^>]*>/g)].length;
        check('badges use the official artwork (unaltered PNG, alt "Get it on Google Play")', imgBadges === 4 && [...html.matchAll(/<img\b[^>]*google-play-badge-en-[^"]*\.png"[^>]*>/g)].every((m) => attr(m[0], 'alt') === 'Get it on Google Play'));
        check('no "Open app" / "Open FinCalix" / "Use in browser" anywhere', !/open app|open fincalix|use in browser/i.test(body));
        const head = html.split('</head>')[0];
        check('no manifest link and no service-worker registration on the website', !/rel="manifest"/.test(html) && !/serviceWorker\.register/.test(html));
        const title = (head.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
        const desc = attr((head.match(/<meta name="description"[^>]*>/) || [''])[0], 'content') || '';
        check('title and description set, no stale phrases', title.length >= 30 && title.length <= 65 && desc.length >= 70 && desc.length <= 160 && !BANNED.test(title + desc), `${title.length} / ${desc.length} chars`);
        check('canonical is the apex', /<link rel="canonical" href="https:\/\/fincalix\.com\/">/.test(head));
        check('viewport allows zoom', /name="viewport"/.test(head) && !/maximum-scale|user-scalable/i.test(head));
        check('Open Graph and Twitter cards point at the 1200×630 image', /property="og:image" content="https:\/\/fincalix\.com\/og\/fincalix-og\.png"/.test(head) && /og:image:width" content="1200"/.test(head) && /twitter:card" content="summary_large_image"/.test(head));
        let ld = null; try { ld = JSON.parse((head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1]); } catch { /* below */ }
        const node = (t) => ld?.['@graph']?.find((n) => n['@type'] === t);
        const org = node('Organization'), site = node('WebSite'), app = node('SoftwareApplication'), faq = node('FAQPage');
        check('structured data parses: Organization, WebSite, SoftwareApplication, FAQPage', !!(org && site && app && faq));
        // No street address is published: at most the country (owner: "Sri Moksha Software Developers, India").
        check('Organization: no street address (country only), legal name, logo is a real PNG', org && (!('address' in org) || (Object.keys(org.address).every((k) => ['@type', 'addressCountry'].includes(k)) && org.address.addressCountry === 'IN')) && org.legalName === 'Sri Moksha Software Developers' && /\.png$/.test(org.logo?.url || ''));
        check('WebSite SearchAction uses the working ?q= search', site?.potentialAction?.target?.urlTemplate === 'https://fincalix.com/?q={search_term_string}');
        check('SoftwareApplication: Android, FinanceApplication, price 0, real screenshots', app?.operatingSystem === 'Android' && app?.applicationCategory === 'FinanceApplication' && app?.offers?.price === '0'
            && Array.isArray(app?.screenshot) && app.screenshot.length >= 2 && app.screenshot.every((u) => /\/site\/en-[a-z-]+-light-560-[\w-]+\.webp$/.test(u)));
        check('FAQPage = the FAQ shown on the page', faq && faq.mainEntity.length === questions.length && faq.mainEntity.every((q, i) => q.name === questions[i]));
        check('no banned claim anywhere in the page (Firebase / Google LLC not named; analytics named as Google Analytics)', !BANNED.test(body) && !BANNED.test(JSON.stringify(ld || {})), (body.match(BANNED) || [''])[0]);
        check('analytics line present (names Google Analytics, offers no off switch) and links to the privacy policy', body.includes(content.ANALYTICS_LINE) && /Google Analytics/.test(content.ANALYTICS_LINE) && !OFF_SWITCH.test(body) && /href="\/privacy-policy"/.test(html));
        const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
        check('every image has alt text and explicit width and height', imgs.length > 0 && imgs.every((t) => attr(t, 'alt') !== undefined && attr(t, 'width') && attr(t, 'height')), `${imgs.length} images`);

        // ── 2. Links on "/" ─────────────────────────────────────────────────
        console.log('\n2. Every link on "/" (production)');
        const hrefs = [...new Set([...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')))];
        const okPage = (p) => p === '/' || seo.STATIC_PAGES.includes(p.slice(1)) || seo.FEATURE_PAGES.includes(p.slice(1)) || seo.LEGAL_PAGES.includes(p.slice(1)) || seo.SHARED_PAGES.includes(p) || (seo.isSiteOnlyPage(p) && p !== '/404');
        const bad = [];
        for (const h of hrefs) {
            if (h.startsWith('#')) { if (!html.includes(`id="${h.slice(1)}"`)) bad.push(`${h}: no such section`); continue; }
            if (h.startsWith('mailto:')) { if (h !== `mailto:${content.SUPPORT_EMAIL}`) bad.push(h); continue; }
            if (/^https?:/.test(h)) { if (!PLACEMENTS.some((p) => h === play.playUrl(p))) bad.push(`${h}: unexpected external link`); continue; }
            if (!okPage(h)) { bad.push(`${h}: not a website page (app link?)`); continue; }
            const r = await get(prod.base, h);
            if (r.status !== 200) bad.push(`${h}: ${r.status}`);
        }
        check(`all ${hrefs.length} links resolve, none points into the app`, bad.length === 0, bad.slice(0, 5).join(' | '));

        // ── 3. Production lock ──────────────────────────────────────────────
        console.log('\n3. Production lock (fincalix.com)');
        const redirBad = [];
        for (const [appPath, page] of Object.entries(seo.APP_CANONICAL)) {
            const r = await get(prod.base, appPath);
            if (r.status !== 308 || r.loc !== page || !/no-store/.test(r.cache)) redirBad.push(`${appPath}: ${r.status} ${r.loc} ${r.cache}`);
        }
        for (const [alias, target] of Object.entries(seo.APP_ALIASES)) {
            // An alias with its own page (step-up SIP, goal SIP) goes there; the rest follow their target.
            const want = seo.APP_CANONICAL[alias] ?? seo.APP_CANONICAL[target];
            if (!want) continue;
            const r = await get(prod.base, alias);
            if (r.status !== 308 || r.loc !== want) redirBad.push(`alias ${alias}: ${r.status} ${r.loc}`);
        }
        check(`${Object.keys(seo.APP_CANONICAL).length} app routes and the old alias URLs 308 to their static page (not cached, so dev mode can follow later)`, redirBad.length === 0, redirBad.slice(0, 3).join(' | '));
        const appJs = fs.readdirSync('dist/assets').find((f) => /^index-.*\.js$/.test(f));
        const lockBad = [];
        const lockWant = {
            ...rt.ROUTE_TARGETS,
            '/app/': '/in-the-app', '/my-loans/abc': '/loan-foreclosure', '/business-tracker/b1': '/business-tracker',
            '/expenses/credit-cards': '/credit-card-tracker', '/expenses/credit-cards/add': '/credit-card-tracker', '/profile/edit': '/in-the-app',
            '/scheme/c-ssy': '/sukanya-samriddhi', '/schemes/c-ssy': '/sukanya-samriddhi', '/scheme/c-mudra': '/schemes/c-mudra', '/scheme/c-apy': '/atal-pension', '/scheme/no-such-scheme': '/schemes',
            '/app.html': '/', [`/assets/${appJs}`]: '/',
        };
        for (const [p, want] of Object.entries(lockWant)) {
            const r = await get(prod.base, p);
            // /app.html is also caught by the vercel.json backstop (a plain permanent redirect).
            if (r.status !== 308 || r.loc !== want || (p !== '/app.html' && !/no-store/.test(r.cache))) lockBad.push(`${p}: ${r.status} ${r.loc} (want ${want})`);
        }
        check(`every other app route 308s to its approved target (${Object.keys(rt.ROUTE_TARGETS).length} generated + routes with IDs, /app.html, app JS)`, lockBad.length === 0, lockBad.slice(0, 4).join(' | '));
        const nf = await Promise.all(['/no-such-page', '/calculator/no-such-tool', '/calculators/no-such-category', '/schemes/no-such-scheme'].map((p) => get(prod.base, p)));
        check('unknown paths: real 404 status, the 404 page (noindex, links home), never the app shell', nf.every((r) => r.status === 404 && /<meta name="robots" content="noindex/.test(r.body) && r.body.includes('Page not found') && !r.body.includes('<div id="root"></div>')), nf.map((r) => r.status).join(','));

        // Generated pages: categories, /calculators, /schemes, scheme pages, /in-the-app, export
        const metaRobots = (b) => (b.match(/<meta name="robots" content="([^"]+)"/) || [])[1] || '';
        const canonOk = (b, p) => b.includes(`<link rel="canonical" href="https://fincalix.com${p}">`);
        const lead = (b) => text((b.match(/<p class="lead">([\s\S]*?)<\/p>/) || [])[1] || '');
        const toolDescs = (b) => [...b.matchAll(/<span class="tool-desc">([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
        const toolNames = (b) => [...b.matchAll(/<span class="tool-name">([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
        const catBad = [], seenTools = new Set();
        const catPaths = Object.values(seo.CATEGORY_SLUGS).map((s) => `/calculators/${s}`);
        for (const p of ['/calculators', ...catPaths]) {
            const r = await get(prod.base, p);
            const descs = toolDescs(r.body);
            if (p !== '/calculators') toolNames(r.body).forEach((n) => seenTools.add(n));
            if (r.status !== 200 || r.robots || !/^index/.test(metaRobots(r.body)) || !canonOk(r.body, p) || lead(r.body).length < 120 || !descs.length || descs.some((d) => d.length < 8)) catBad.push(`${p}: ${r.status} robots=${metaRobots(r.body)} lead=${lead(r.body).length} tools=${descs.length}`);
        }
        check(`/calculators + ${catPaths.length} category pages: 200, indexable, apex canonical, intro paragraph, a one-line description for every tool`, catBad.length === 0, catBad.slice(0, 3).join(' | '));
        const regNames = props.tools.map((t) => t.name);
        check('every registered tool is on its category page', regNames.every((n) => seenTools.has(n)), regNames.filter((n) => !seenTools.has(n)).slice(0, 5).join(', '));
        const schemePages = siteData.buildSchemePages();
        const sl = await get(prod.base, '/schemes');
        const listBad = schemePages.filter((s) => !sl.body.includes(`href="${s.path}"`)).map((s) => s.id);
        check(`/schemes: 200, indexable, intro, links to all ${schemePages.length} scheme pages with their verified date`, sl.status === 200 && /^index/.test(metaRobots(sl.body)) && canonOk(sl.body, '/schemes') && lead(sl.body).length >= 120 && listBad.length === 0 && (sl.body.match(/Last verified /g) || []).length >= schemePages.length, listBad.slice(0, 5).join(', '));
        const stale = schemePages.filter((s) => !s.scheme.lastVerified || s.scheme.lastVerified < siteData.SCHEME_VERIFIED_SINCE);
        check(`every scheme verified on or after ${siteData.SCHEME_VERIFIED_SINCE} (none held back for re-verification)`, stale.length === 0, stale.map((s) => s.id).join(', '));
        const spBad = [];
        for (const s of schemePages) {
            const r = await get(prod.base, s.path);
            const robots = metaRobots(r.body);
            if (r.status !== 200 || !canonOk(r.body, s.path) || (s.index ? !/^index/.test(robots) : !/^noindex/.test(robots)) || !text(r.body).includes(`Last verified ${s.verified}`) || !text(r.body).includes(s.scheme.name)) spBad.push(`${s.id}: ${r.status} ${robots}`);
        }
        const noindexed = schemePages.filter((s) => !s.index);
        check(`${schemePages.length} scheme pages: 200, apex canonical, "Last verified <date>", robots = index unless under ${siteData.SCHEME_MIN_WORDS} words (${noindexed.length} noindex)`, spBad.length === 0, spBad.slice(0, 3).join(' | ') || noindexed.map((s) => s.id).join(', '));
        const ita = await get(prod.base, '/in-the-app'), exp = await get(prod.base, '/export-my-data');
        check('/in-the-app: 200, noindex, Google Play badge, no app link', ita.status === 200 && /^noindex/.test(metaRobots(ita.body)) && /data-play="/.test(ita.body) && !/href="\/(app|settings|profile)"/.test(ita.body));
        check('/export-my-data: 200, noindex, export button and import steps in the HTML', exp.status === 200 && /^noindex/.test(metaRobots(exp.body)) && exp.body.includes('data-export-button') && text(exp.body).includes('Backup & Restore'));
        const staticBad = [];
        for (const s of seo.STATIC_PAGES) { const r = await get(prod.base, '/' + s); if (r.status !== 200 || r.robots || !r.body.includes(`<link rel="canonical" href="https://fincalix.com/${s}"`)) staticBad.push(s); }
        check(`${seo.STATIC_PAGES.length} static pages: 200, indexable, own canonical`, staticBad.length === 0, staticBad.join(', '));
        // Feature pages (src/landing/features): the answer, sources, FAQ JSON-LD, disclaimer and a per-page Play referrer are in the HTML.
        const featBad = [];
        for (const s of seo.FEATURE_PAGES) {
            const r = await get(prod.base, '/' + s);
            const t = text(r.body);
            const miss = [
                r.status !== 200 && `status ${r.status}`, !/^index/.test(metaRobots(r.body)) && 'noindex', !canonOk(r.body, '/' + s) && 'canonical',
                !/"@type":"FAQPage"/.test(r.body) && 'FAQPage JSON-LD', !/class="answer"/.test(r.body) && 'answer', !t.includes('Last updated') && 'last updated',
                !/class="disclaimer/.test(r.body) && 'disclaimer', !r.body.includes(encodeURIComponent(`utm_campaign=${s}&`)) && 'Play referrer', !/rel="noopener"/.test(r.body) && 'source links',
            ].filter(Boolean);
            if (miss.length) featBad.push(`${s}: ${miss.join(', ')}`);
        }
        check(`${seo.FEATURE_PAGES.length} feature pages: 200, indexable, own canonical, answer, sources, last updated, FAQ JSON-LD, disclaimer, Play referrer with the page's campaign`, featBad.length === 0, featBad.slice(0, 3).join(' | '));
        const legalBad = [];
        for (const p of seo.LEGAL_PAGES) {
            const r = await get(prod.base, '/' + p);
            const isShell = r.body.includes('<div id="root"></div>') || /\/assets\//.test(r.body);
            if (r.status !== 200 || r.robots || isShell || !r.body.includes(`data-page="${p}"`) || !r.body.includes(`<link rel="canonical" href="https://fincalix.com/${p}">`) || !/<h1[^>]*>[^<]+/.test(r.body)) legalBad.push(`${p}: ${r.status}${isShell ? ' app shell' : ''}`);
        }
        check('5 legal pages: static pre-rendered HTML, no app shell or app assets, own canonical', legalBad.length === 0, legalBad.join(' | '));
        const files = { '/config.json': 'application/json', '/sitemap.xml': 'xml', '/robots.txt': 'text/plain', '/sw.js': 'javascript', '/og/fincalix-og.png': 'image/png', '/brand/fincalix-icon-512.png': 'image/png', '/manifest.json': 'json' };
        const fileBad = [];
        for (const [p, type] of Object.entries(files)) { const r = await get(prod.base, p); if (r.status !== 200 || !(r.r.headers.get('content-type') || '').includes(type)) fileBad.push(`${p}: ${r.status}`); }
        check('files stay reachable: config.json, sitemap, robots, sw.js, og and brand images, manifest', fileBad.length === 0, fileBad.join(' | '));
        const cfg = await get(prod.base, '/config.json');
        check('/config.json unchanged: CORS *, max-age=300', cfg.r.headers.get('access-control-allow-origin') === '*' && cfg.r.headers.get('cache-control') === 'public, max-age=300, must-revalidate');
        check('manifest start_url reverted to "/"', JSON.parse((await get(prod.base, '/manifest.json')).body).start_url === '/');
        const locs = [...(await sitemapXml(prod.base)).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
        const indexedPaths = ['/calculators', ...catPaths, '/schemes', ...seo.TRUST_PAGES, ...schemePages.filter((s) => s.index).map((s) => s.path)];
        const wantLocs = ['https://fincalix.com/', ...seo.STATIC_PAGES.map((s) => `https://fincalix.com/${s}`), ...seo.FEATURE_PAGES.map((s) => `https://fincalix.com/${s}`),...seo.LEGAL_PAGES.map((s) => `https://fincalix.com/${s}`), ...indexedPaths.map((p) => `https://fincalix.com${p}`)].sort();
        const lastmods = [...(await sitemapXml(prod.base)).matchAll(/<loc>https:\/\/fincalix\.com\/schemes\/([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)];
        check(`sitemap = landing + ${seo.STATIC_PAGES.length} static + ${seo.FEATURE_PAGES.length} feature + ${seo.LEGAL_PAGES.length} legal + ${indexedPaths.length} new indexable pages (no noindex page, apex only)`, JSON.stringify([...locs].sort()) === JSON.stringify(wantLocs), `${locs.length} URLs, want ${wantLocs.length}`);
        check('sitemap: each scheme page dated by its last-verified date', lastmods.length > 0 && lastmods.every(([, id, d]) => schemePages.find((s) => s.id === id) && ((schemePages.find((s) => s.id === id).content?.verified ?? schemePages.find((s) => s.id === id).scheme.lastVerified) === d)));
        // Claims: no page offers an analytics off switch (there is none since 18 Nov 2026), and the
        // privacy texts name Google Analytics and Google as the processor.
        {
            const extra = ['/data-safety', '/in-the-app', '/export-my-data', '/llms.txt'];
            const paths = [...new Set([...locs.map((u) => u.replace('https://fincalix.com', '') || '/'), ...extra])];
            const offPages = [];
            const texts = {};
            for (const p of paths) {
                const r = await get(prod.base, p);
                const t = r.body.replace(/<script\b[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
                texts[p] = t;
                const m = t.match(OFF_SWITCH);
                if (m) offPages.push(`${p}: "${m[0]}"`);
            }
            check(`claims: none of ${paths.length} website pages (sitemap + data-safety, in-the-app, export, llms.txt) offers an analytics off switch`, offPages.length === 0 && paths.length > 70, offPages.slice(0, 4).join(' | '));
            check('claims: privacy policy names Google Analytics, says amounts are never sent and that Google processes the data; no "Right to stop usage analytics"',
                /collects anonymous usage statistics through Google Analytics/.test(texts['/privacy-policy']) && /Financial amounts are never sent/i.test(texts['/privacy-policy']) && /processed by Google/.test(texts['/privacy-policy']) && !/Right to stop usage analytics/i.test(texts['/privacy-policy']));
            check('claims: Data & Privacy pages and llms.txt name Google Analytics', ['/data-privacy', '/data-safety', '/llms.txt'].every((p) => /Google Analytics/.test(texts[p] || '')), ['/data-privacy', '/data-safety', '/llms.txt'].filter((p) => !/Google Analytics/.test(texts[p] || '')).join(', '));
            // App texts in all six languages (disclaimer, Data & Privacy, Settings) and the shared legal source.
            const flat = (o, out = []) => { for (const v of Object.values(o)) { if (v && typeof v === 'object') flat(v, out); else if (typeof v === 'string') out.push(v); } return out; };
            const i18nBad = [];
            for (const l of ['en', 'hi', 'te', 'ta', 'kn', 'ml']) {
                const strings = flat(JSON.parse(fs.readFileSync(`src/locales/${l}.json`, 'utf8')));
                for (const s of strings) if (OFF_SWITCH.test(s) || (ANALYTICS_WORD.test(s) && OFF_SWITCH_I18N.test(s))) i18nBad.push(`${l}: ${s.slice(0, 80)}`);
                const j = JSON.parse(fs.readFileSync(`src/locales/${l}.json`, 'utf8'));
                if (!/Google Analytics/.test(j.disclaimer?.dataPrivacyBody || '') || !/Google Analytics/.test(j.dataSafety?.sec3Body1 || '')) i18nBad.push(`${l}: disclaimer or Data & Privacy does not name Google Analytics`);
                for (const k of ['privacy', 'usageAnalytics', 'usageAnalyticsDesc', 'analyticsOn', 'analyticsOff']) if (j.settings && k in j.settings) i18nBad.push(`${l}: settings.${k} still present`);
            }
            for (const f of ['src/pages/legal/PrivacyPolicy.tsx', 'src/pages/legal/DataPrivacy.tsx', 'src/pages/legal/TermsOfService.tsx', 'src/pages/legal/About.tsx', 'src/pages/DataSafety.tsx', 'src/pages/Settings.tsx']) {
                for (const line of fs.readFileSync(f, 'utf8').split('\n')) if (!/^\s*(\/\/|\*|\/\*)/.test(line) && (OFF_SWITCH.test(line) || (ANALYTICS_WORD.test(line) && OFF_SWITCH_I18N.test(line)))) i18nBad.push(`${f}: ${line.trim().slice(0, 80)}`);
            }
            check('claims: app texts in all 6 languages and the shared legal source offer no analytics off switch; disclaimer and Data & Privacy name Google Analytics; Settings switch strings removed', i18nBad.length === 0, i18nBad.slice(0, 4).join(' | '));
        }
        const w1 = await get(www.base, '/calculator/sip'), w2 = await get(www.base, '/config.json'), w3 = await get(www.base, '/export-my-data'), w4 = await get(www.base, '/');
        check('www: redirects to the apex (which then locks), config.json still served', w1.status === 308 && w1.loc === 'https://fincalix.com/calculator/sip' && w2.status === 200 && w4.status === 308 && w4.loc === 'https://fincalix.com/');
        check('www: /export-my-data is served there (not redirected), canonical on the apex', w3.status === 200 && w3.body.includes('data-export-button') && canonOk(w3.body, '/export-my-data'), `${w3.status} ${w3.loc || ''}`);
        const b1 = await get(bay.base, '/app'), b2 = await get(bay.base, '/calculator/sip');
        check('any other host (e.g. a *.vercel.app deployment URL) is locked the same way', b1.status === 308 && b1.loc === '/in-the-app' && b2.status === 308 && b2.loc === '/sip');
        let synced = true; try { execFileSync(process.execPath, ['scripts/landing/sync-vercel-headers.mjs', '--check'], { stdio: 'pipe' }); } catch { synced = false; }
        check('vercel.json matches src/landing/seoRoutes.ts', synced);

        // ── 4. Dev mode (cookie) ────────────────────────────────────────────
        console.log('\n4. Dev mode (?dev=true cookie, middleware.ts)');
        const DEVC = `${seo.DEV_COOKIE}=1`;
        const on = await get(prod.base, '/calculator/sip?dev=true');
        check('?dev=true: 307 to the same URL without the parameter, sets the cookie (Secure, SameSite=Lax, 30 days)',
            on.status === 307 && on.loc === '/calculator/sip' && /^fincalix_dev=1; Path=\/; Max-Age=2592000; Secure; SameSite=Lax$/.test(on.setCookie), `${on.status} ${on.loc} ${on.setCookie}`);
        const off = await get(prod.base, '/calculator/sip?dev=false', DEVC);
        check('?dev=false: 307 to "/" and clears the cookie', off.status === 307 && off.loc === '/' && /^fincalix_dev=; Path=\/; Max-Age=0/.test(off.setCookie), `${off.status} ${off.loc} ${off.setCookie}`);
        const d1 = await get(prod.base, '/', DEVC), d2 = await get(prod.base, '/calculator/sip', DEVC), d3 = await get(prod.base, '/sip', DEVC), d4 = await get(prod.base, `/assets/${appJs}`, DEVC), d5 = await get(prod.base, '/app.html', DEVC);
        check('with the cookie: "/" and /calculator/sip serve the app, the app\'s files load', d1.status === 200 && d1.body.includes('<div id="root">') && d2.status === 200 && d2.body.includes('<div id="root">') && d4.status === 200 && d5.status === 200);
        check('with the cookie: every response is noindex (app, static pages, files)', [d1, d2, d3, d4].every((x) => x.robots === 'noindex'));
        const devRef = /[?&]dev=/;
        check('the website, sitemap and structured data never mention ?dev', !devRef.test(html) && !devRef.test((await sitemapXml(prod.base))) && !devRef.test(JSON.stringify(ld || {})));
        await runDevModeProof({ base: prod.local, shotsDir: 'marketing-assets/website-preview/dev-mode', check });

        // ── 5. In Chrome ────────────────────────────────────────────────────
        console.log('\n5. In Chrome (production rules unless stated)');
        const browser = await chromium.launch({ channel: 'chrome' });
        try {
            const profile = async (base, opts = {}, storage = {}) => {
                const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light', ...opts });
                await ctx.addInitScript((s) => { try { localStorage.setItem('fincalix_analytics_test_traffic', '1'); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } catch { /* */ } }, storage);
                const page = await ctx.newPage();
                const errors = [], hits = [], analyticsReqs = [], appRequests = [];
                page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
                page.on('pageerror', (e) => errors.push(e.message));
                // net::ERR_ABORTED = the browser cancelled it (e.g. the favicon when the test moves on), not a failure.
                page.on('requestfailed', (r) => { if (new URL(r.url()).origin === base && !/ERR_ABORTED/.test(r.failure()?.errorText || '')) errors.push(`failed ${r.url()} ${r.failure()?.errorText || ''}`); });
                page.on('response', (r) => { if (new URL(r.url()).origin === base && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
                page.on('request', (r) => {
                    const u = new URL(r.url());
                    if (ANALYTICS_HOSTS.test(u.hostname)) analyticsReqs.push(u.hostname);
                    if (COLLECT_HOSTS.test(u.hostname) && /\/collect/.test(r.url())) hits.push(...decode(r));
                    if (u.origin === base && (/^\/assets\//.test(u.pathname) || u.pathname === '/app.html')) appRequests.push(u.pathname);
                });
                return { ctx, page, errors, hits, analyticsReqs, appRequests };
            };
            const noNav = (page) => page.evaluate(() => window.addEventListener('click', (e) => { if (e.target.closest('a')) e.preventDefault(); }, true));

            // 5a. Website: no app bundle, calculator parity, analytics
            {
                const { ctx, page, errors, hits, appRequests } = await profile(prod.base);
                await page.goto(prod.base + '/', { waitUntil: 'networkidle' });
                await noNav(page);
                const amount = page.locator('#calc-panel input:not([type=range])').nth(0);
                await amount.fill('4500000'); await amount.press('Tab');
                const rate = page.locator('#calc-panel input:not([type=range])').nth(1);
                await rate.fill('9.25'); await rate.press('Tab');
                const want = calc.formatINR(calc.calculateReducingEMI(4500000, 9.25, 240).emi);
                await page.waitForTimeout(400);
                const [heroFig, calcFig] = [await page.locator('.hero-figure').innerText(), await page.locator('.calc-out .big').innerText()];
                check('EMI: calculator and hero card = calculateReducingEMI()', heroFig === want && calcFig === want, `${calcFig} / ${heroFig} vs ${want}`);
                await page.getByRole('tab', { name: 'SIP' }).click();
                await page.waitForTimeout(300);
                check('SIP: result = calculateSIP()', (await page.locator('.calc-out .big').innerText()) === calc.formatINR(calc.calculateSIP(5000, 12, 10).futureValue));
                await page.getByRole('tab', { name: 'Income tax' }).click();
                const t = tax.compareSalaryTax(1450000, 375000);
                await page.waitForTimeout(300);
                const rows = await page.locator('.calc-out .row dd').allInnerTexts();
                check('Income tax: New and Old Regime = compareSalaryTax()', rows[0] === calc.formatINR(Math.round(t.newTax.totalTax)) && rows[1] === calc.formatINR(Math.round(t.oldTax.totalTax)), rows.slice(0, 2).join(' / '));
                const follow = page.locator('.calc-out a.btn');
                check('calculator follow-up: "Get the full breakdown in the app" → Google Play (mini_calc)', (await follow.innerText()).startsWith('Get the full breakdown in the app') && (await follow.getAttribute('href')) === play.playUrl('mini_calc'));
                await page.keyboard.press('ArrowLeft');
                check('tabs work from the keyboard (arrow keys)', (await page.getByRole('tab', { selected: true }).innerText()) === 'SIP');
                await page.locator('.hero [data-play="hero"]').click();
                await page.waitForTimeout(9000);
                const allowed = new Set(['page_view', 'play_badge_click', 'first_visit', 'session_start', 'user_engagement']);
                check('analytics: one page_view "Website"', hits.filter((h) => h.en === 'page_view').length === 1 && hits.find((h) => h.en === 'page_view')?.dt === 'Website', hits.map((h) => h.en).join(','));
                check('analytics: play_badge_click with placement=hero', hits.some((h) => h.en === 'play_badge_click' && h.ep.placement === 'hero'));
                const odd = hits.filter((h) => !allowed.has(h.en) || Object.keys(h.ep).some((k) => !['placement', 'origin', 'debug_mode', 'traffic_type'].includes(k)) || h.tt !== 'internal');
                check('analytics: only allowed events and parameters, all test traffic', hits.length > 0 && odd.length === 0, odd.slice(0, 3).map((h) => h.en + JSON.stringify(h.ep)).join(' '));
                const sw = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
                check('website: no app bundle or app shell requested, no service worker', appRequests.length === 0 && sw === 0, appRequests.slice(0, 3).join(', '));
                check('website: no console error, failed or broken request', errors.length === 0, errors.slice(0, 3).join(' | '));
                await ctx.close();
            }
            // 5b. A test device that switched analytics off in an earlier test build (stored "denied";
            //     there is no switch any more): still nothing at all
            {
                const { ctx, page, analyticsReqs } = await profile(prod.base, {}, { fincalix_analytics_consent: 'denied' });
                await page.goto(prod.base + '/', { waitUntil: 'networkidle' });
                await noNav(page);
                await page.locator('.hero [data-play="hero"]').click();
                await page.waitForTimeout(7000);
                const queue = await page.evaluate(() => localStorage.getItem('fincalix_analytics_queue'));
                check('old stored "denied" (test devices only): no request to analytics hosts and nothing queued', analyticsReqs.length === 0 && !queue, analyticsReqs.join(','));
                await ctx.close();
            }
            // 5c. Legal pages: static, no app bundle; the app's screen (dev mode, in-app routing: the same
            // code as the Android app) shows the same text as the website page, [data-legal-content], in
            // every language the page offers (the frames around it differ: app header vs website header).
            {
                const LEGAL_LANGS = { en: 'English', hi: 'हिंदी', te: 'తెలుగు', ta: 'தமிழ்', kn: 'ಕನ್ನಡ' };
                const SAFETY_LANGS = ['en', 'hi', 'te', 'ta', 'kn', 'ml'];   // /data-safety: the app's i18n languages
                const legalText = async (pg) => norm(await pg.evaluate(() => document.querySelector('[data-legal-content]')?.innerText || ''));
                const pickLang = async (pg, p, code) => {
                    if (p === 'data-safety') { await pg.locator('[data-legal-content] select').first().selectOption(code); await pg.waitForTimeout(1200); return; }
                    await pg.locator('button', { hasText: '▼' }).first().click();
                    await pg.locator('button', { hasText: LEGAL_LANGS[code] }).last().click();
                    await pg.waitForTimeout(300);
                };
                const ref = await profile(dev.base, {}, { fincalix_analytics_consent: 'denied', fincalix_disclaimer_accepted_v4: 'true' });
                await ref.page.goto(dev.base + '/', { waitUntil: 'networkidle' });
                for (const p of seo.LEGAL_PAGES) {
                    await ref.page.evaluate((path) => { history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, '/' + p);
                    await ref.page.waitForTimeout(1500);
                    // The app's frame, not the website's: no website header link to "/".
                    const appFrame = await ref.page.evaluate(() => !document.querySelector('header a[href="/"]'));
                    const { ctx, page, errors, appRequests } = await profile(prod.base, {}, { fincalix_analytics_consent: 'denied' });
                    await page.goto(prod.base + '/' + p, { waitUntil: 'networkidle' });
                    await page.waitForTimeout(500);
                    const langs = p === 'data-safety' ? SAFETY_LANGS : Object.keys(LEGAL_LANGS);
                    const bad = [];
                    let enText = '';
                    const hashes = [];
                    for (const l of langs) {
                        if (l !== 'en') { await pickLang(ref.page, p, l); await pickLang(page, p, l); }
                        const a = await legalText(ref.page), w = await legalText(page);
                        if (l === 'en') enText = a;
                        hashes.push(`${l} ${createHash('sha256').update(a).digest('hex').slice(0, 10)}`);
                        if (a !== w || a.length < 300) { let i = 0; while (i < a.length && a[i] === w[i]) i++; bad.push(`${l} differs at ${i}: app "${a.slice(i, i + 40)}" vs web "${w.slice(i, i + 40)}"`); }
                    }
                    if (p === 'data-safety') await pickLang(ref.page, p, 'en');
                    const raw = norm(text((await get(prod.base, '/' + p)).body.split(/<body[^>]*>/)[1] || ''));
                    check(`/${p}: the app's screen (app frame) and the website page show the same text in ${langs.join('/')}; in the HTML without JS; no app bundle; no errors`, bad.length === 0 && appFrame && raw.toLowerCase().includes(enText.slice(0, 120).toLowerCase()) && appRequests.length === 0 && errors.length === 0, bad.length ? bad.slice(0, 2).join(' | ') : !appFrame ? 'app shows the website frame' : errors.length ? errors.slice(0, 2).join(' | ') : `sha256 ${hashes.join(', ')}`);
                    await ctx.close();
                }
                await ref.ctx.close();
            }
            // 5d. No overflow at any width; both hero phones inside the viewport
            {
                const { ctx, page } = await profile(prod.base, {}, { fincalix_analytics_consent: 'denied' });
                const problems = [];
                for (const width of [360, 375, 390, 412, 480, 600, 768, 820, 900, 1024, 1180, 1280, 1366, 1440, 1536, 1640, 1720, 1920]) {
                    await page.setViewportSize({ width, height: 900 });
                    await page.goto(prod.base + '/', { waitUntil: 'load' });
                    const r = await page.evaluate(() => {
                        const cw = document.documentElement.clientWidth;
                        const out = [];
                        if (document.documentElement.scrollWidth > cw) out.push(`scrollWidth ${document.documentElement.scrollWidth}`);
                        for (const el of document.querySelectorAll('header *, .hero *, .band *, .after-calc *')) {
                            const b = el.getBoundingClientRect();
                            if (!b.width || getComputedStyle(el).visibility === 'hidden') continue;
                            if (b.right > cw + 0.5 || b.left < -0.5) out.push(`${el.tagName.toLowerCase()}.${(el.className && el.className.baseVal === undefined ? el.className : '').toString().split(' ')[0]} ${Math.round(b.left)}..${Math.round(b.right)}`);
                        }
                        return out;
                    });
                    if (r.length) problems.push(`${width}px: ${r.slice(0, 2).join(', ')}`);
                }
                check('no element outside the viewport at any width from 360 to 1920 px (header, hero phones, CTAs)', problems.length === 0, problems.slice(0, 3).join(' | '));
                await ctx.close();
            }
            {
                // Every page in the sitemap (plus /data-safety, /in-the-app, /export-my-data and the 404) on a 360 px
                // phone: the page never scrolls sideways. A wide guide table scrolls inside its own container.
                const smXml = (await sitemapXml(prod.base));
                const smPaths = [...smXml.matchAll(/<loc>https:\/\/fincalix\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
                const { ctx, page } = await profile(prod.base, { viewport: { width: 360, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, { fincalix_analytics_consent: 'denied' });
                const wide = [];
                let tablesInScroll = 0, tablesTotal = 0;
                for (const p of [...smPaths, '/data-safety', '/in-the-app', '/export-my-data', '/no-such-page']) {
                    await page.goto(prod.base + p, { waitUntil: 'load' });
                    await page.waitForTimeout(150);
                    const r = await page.evaluate(() => {
                        const cw = document.documentElement.clientWidth;
                        const tables = [...document.querySelectorAll('table')];
                        const first = [...document.querySelectorAll('body *')].find((e) => !e.closest('.table-scroll') && e.getBoundingClientRect().right > cw + 0.5);
                        return { sw: document.documentElement.scrollWidth, cw, tables: tables.length, wrapped: tables.filter((t) => t.parentElement?.classList.contains('table-scroll') && getComputedStyle(t.parentElement).overflowX === 'auto').length, first: first ? `${first.tagName.toLowerCase()} →${Math.round(first.getBoundingClientRect().right)}` : '' };
                    });
                    tablesTotal += r.tables; tablesInScroll += r.wrapped;
                    if (r.sw > r.cw) wide.push(`${p} ${r.sw}/${r.cw} ${r.first}`);
                }
                check(`360 px phone: none of the ${smPaths.length} sitemap pages (+4 others) scrolls sideways; every guide table (${tablesTotal}) has its own scroll container`, wide.length === 0 && smPaths.length > 70 && tablesTotal > 0 && tablesInScroll === tablesTotal, wide.slice(0, 4).join(' | ') || `${tablesInScroll}/${tablesTotal} tables wrapped`);
                await ctx.close();
            }
            // 5e. Layout shift; light theme on first visit (device in dark mode), no flash; toggle; dev-mode app theme; keyboard; ?q=
            for (const [label, opts] of [['desktop', {}], ['phone', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 }]]) {
                const { ctx, page } = await profile(prod.base, opts, { fincalix_analytics_consent: 'denied' });
                await page.goto(prod.base + '/', { waitUntil: 'load' });
                const shift = await page.evaluate(() => new Promise((r) => { let v = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; }).observe({ type: 'layout-shift', buffered: true }); setTimeout(() => r(v), 2500); }));
                check(`${label}: layout shift < 0.05`, shift < 0.05, shift.toFixed(4));
                await ctx.close();
            }
            // Website theme: light on every first visit whatever the device setting; the visitor's
            // choice (fincalix_web_theme) applies on later visits; no frame of the other theme.
            const lum = (hex) => { const n = parseInt(hex.replace('#', ''), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
            const look = (page) => page.evaluate(() => {
                let e = document.elementFromPoint(20, Math.min(400, innerHeight - 20)), bg = null;
                while (e && bg === null) { const m = getComputedStyle(e).backgroundColor.match(/[\d.]+/g); if (m && (m.length < 4 || +m[3] > 0.5)) bg = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; e = e.parentElement; }
                const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
                return { bg: bg ?? (getComputedStyle(document.documentElement).colorScheme === 'dark' ? 0 : 1), metas: metas.length, color: metas[0]?.content || '', media: metas.some((m) => m.media), visible: getComputedStyle(document.documentElement).visibility, osDark: matchMedia('(prefers-color-scheme: dark)').matches, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
            });
            // Every painted frame of a navigation (Chrome trace screenshots), top-left corner brightness.
            // Trace screenshots cover the whole browser, so this runs in its own browser with one page.
            const frames = async (fb, page, url) => {
                await fb.startTracing(page, { screenshots: true });
                await page.goto(url, { waitUntil: 'load' });
                await page.waitForTimeout(800);
                const trace = JSON.parse((await fb.stopTracing()).toString('utf8'));
                const shots = (trace.traceEvents || trace).filter((e) => e.name === 'Screenshot' && e.args?.snapshot).map((e) => e.args.snapshot);
                const dec = await fb.newPage();
                const out = await dec.evaluate(async (list) => {
                    const r = [];
                    for (const b of list) {
                        const img = new Image(); img.src = 'data:image/jpeg;base64,' + b; await img.decode();
                        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
                        const x = c.getContext('2d'); x.drawImage(img, 0, 0);
                        const d = x.getImageData(0, 0, 8, 8).data; let s = 0;
                        for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
                        r.push(s / (d.length / 4) / 255);
                    }
                    return r;
                }, shots);
                await dec.close();
                return out;
            };
            const THEME_PAGES = ['/', '/calculators', '/calculators/loans', '/schemes', '/schemes/c-mudra', '/sip', '/privacy-policy', '/data-safety', '/in-the-app', '/no-such-page', '/export-my-data'];
            for (const [label, opts] of [['desktop', {}], ['360 px phone', { viewport: { width: 360, height: 760 }, isMobile: true, hasTouch: true }]]) {
                const { ctx, page } = await profile(prod.base, { ...opts, colorScheme: 'dark' }, { fincalix_analytics_consent: 'denied' });
                const bad = [];
                for (const p of THEME_PAGES) {
                    await page.goto(prod.base + p, { waitUntil: 'load' });
                    await page.waitForTimeout(150);
                    const r = await look(page);
                    if (!(r.osDark && r.bg > 0.8 && r.metas === 1 && !r.media && lum(r.color) > 0.8 && r.sw <= r.cw)) bad.push(`${p} ${JSON.stringify(r)}`);
                }
                check(`${label}, device in dark mode, first visit: all ${THEME_PAGES.length} website pages are light, one light theme-color, no horizontal scroll`, bad.length === 0, bad.slice(0, 2).join(' | '));
                await ctx.close();
            }
            const fb = await chromium.launch({ channel: 'chrome' });
            try {
                const ctx = await fb.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
                await ctx.addInitScript(() => { try { localStorage.setItem('fincalix_analytics_consent', 'denied'); localStorage.setItem('fincalix_analytics_test_traffic', '1'); } catch { /* */ } });
                const page = await ctx.newPage();
                const flash = {};
                // Start from a white page: Chrome paints about:blank dark when the device is in dark mode,
                // and that frame is captured as tracing starts. Any dark frame then comes from the site.
                for (const p of ['/', '/calculators/loans', '/privacy-policy', '/data-safety', '/sip']) { await page.setContent('<body style="margin:0;background:#fff"></body>'); const f = await frames(fb, page, prod.base + p); flash[p] = f.length ? `${f.length} frames, min ${Math.min(...f).toFixed(2)}` : 'no frames'; }
                check('device in dark mode, first visit: every painted frame is light (no dark flash) on /, a category page, legal, data-safety and a guide', Object.values(flash).every((v) => /min (0\.9|1\.0|0\.8[1-9])/.test(v)), JSON.stringify(flash));
                await ctx.close();
                const dctx = await fb.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
                await dctx.addInitScript(() => { try { localStorage.setItem('fincalix_analytics_consent', 'denied'); localStorage.setItem('fincalix_analytics_test_traffic', '1'); localStorage.setItem('fincalix_web_theme', 'dark'); } catch { /* */ } });
                const dpage = await dctx.newPage();
                const nf = {};
                for (const p of ['/privacy-policy', '/calculators', '/data-safety']) { await dpage.goto(prod.base + '/', { waitUntil: 'load' }); const f = await frames(fb, dpage, prod.base + p); nf[p] = f.length ? `${f.length} frames, max ${Math.max(...f).toFixed(2)}` : 'no frames'; }
                check('with the dark choice: every painted frame is dark (no light flash), legal and data-safety included', Object.values(nf).every((v) => /max 0\.[01]/.test(v)), JSON.stringify(nf));
                await dctx.close();
            } finally {
                await fb.close();
            }
            {
                const { ctx, page } = await profile(prod.base, { colorScheme: 'dark' }, { fincalix_analytics_consent: 'denied' });
                await page.goto(prod.base + '/', { waitUntil: 'networkidle' });
                await page.getByRole('button', { name: 'Dark theme' }).click();
                const now = await look(page);
                const keys = await page.evaluate(() => ({ web: localStorage.getItem('fincalix_web_theme'), old: localStorage.getItem('fincalix_site_theme'), app: localStorage.getItem('settings-storage') }));
                await page.reload({ waitUntil: 'load' });
                const after = await look(page);
                check('theme toggle: dark at once (browser bar too), saved as fincalix_web_theme only, still dark after reload',
                    now.bg < 0.2 && lum(now.color) < 0.2 && keys.web === 'dark' && keys.old === null && keys.app === null && (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark' && after.bg < 0.2 && lum(after.color) < 0.2,
                    JSON.stringify({ now, keys, after }));
                const dark = {};
                for (const p of ['/calculators/loans', '/schemes/c-mudra', '/privacy-policy', '/data-safety', '/export-my-data']) { await page.goto(prod.base + p, { waitUntil: 'load' }); await page.waitForTimeout(300); const r = await look(page); dark[p] = r.bg < 0.2 && lum(r.color) < 0.2 && r.visible === 'visible'; }
                check('the dark choice applies on later visits to the other website pages (category, scheme, legal, data-safety, export)', Object.values(dark).every(Boolean), JSON.stringify(dark));
                await page.goto(prod.base + '/', { waitUntil: 'networkidle' });
                await page.keyboard.press('Tab');
                const first = await page.evaluate(() => ({ text: document.activeElement?.textContent, outline: getComputedStyle(document.activeElement).outlineStyle }));
                check('keyboard: first Tab reaches "Skip to content" with a visible focus ring', first.text === 'Skip to content' && first.outline !== 'none', JSON.stringify(first));
                await page.goto(prod.base + '/?q=ppf', { waitUntil: 'networkidle' });
                await page.waitForTimeout(500);
                const names = await page.locator('#tools .tool-name').allInnerTexts();
                check('/?q=ppf filters the tool grid (SearchAction target works)', names.length > 0 && names.length < 10 && names.some((n) => /PPF/.test(n)), names.join(', '));
                await ctx.close();
            }
            {
                // Dev mode (?dev=true) is the app: its own theme (settings-storage, dark by default), never the website's.
                const app = {};
                for (const [scheme, web] of [['light', 'light'], ['dark', 'light'], ['light', 'dark']]) {
                    const { ctx, page } = await profile(dev.base, { colorScheme: scheme }, { fincalix_analytics_consent: 'denied', fincalix_disclaimer_accepted_v4: 'true', fincalix_web_theme: web });
                    await page.goto(dev.base + '/', { waitUntil: 'networkidle' });
                    await page.waitForFunction(() => !!document.querySelector('#root > *'));
                    await page.waitForTimeout(500);
                    app[`device ${scheme}, site ${web}`] = await page.evaluate(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');
                    await ctx.close();
                }
                const { ctx, page } = await profile(dev.base, { colorScheme: 'dark' }, { fincalix_analytics_consent: 'denied', fincalix_disclaimer_accepted_v4: 'true', fincalix_web_theme: 'dark', 'settings-storage': JSON.stringify({ state: { darkMode: false }, version: 0 }) });
                await page.goto(dev.base + '/', { waitUntil: 'networkidle' });
                await page.waitForTimeout(500);
                app['app set to light, site dark'] = await page.evaluate(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');
                await ctx.close();
                check('dev mode: the app keeps its own theme (dark by default, its saved setting otherwise), whatever the website theme or device',
                    Object.entries(app).every(([k, v]) => v === (k.startsWith('app set to light') ? 'light' : 'dark')), JSON.stringify(app));
            }
            // 5g. Export banner + /export-my-data (a browser that used the old web app)
            {
                const OLD = {
                    fincalix_analytics_consent: 'denied',
                    fincalix_entries: JSON.stringify([{ id: 'qa-entry-1', amount: 250, type: 'expense', category: 'food', description: 'QA lunch', date: '2026-11-01' }]),
                    'calculator-storage': JSON.stringify({ state: { savedCalculations: [], history: [{ id: 'qa-h1', type: 'sip', timestamp: 1 }, { id: 'qa-h2', type: 'emi', timestamp: 2 }] }, version: 0 }),
                };
                const { ctx, page, errors } = await profile(prod.base, { acceptDownloads: true }, OLD);
                const banner = page.locator('.fx-banner');
                const visibleOn = async (p) => { await page.goto(prod.base + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(300); return banner.isVisible(); };
                await page.goto(prod.base + '/export-my-data', { waitUntil: 'load' });   // be on the origin so localStorage can be set (no banner on this page)
                const setNotice = (v) => page.evaluate((x) => { if (x) localStorage.setItem('fincalix_export_notice', JSON.stringify(x)); else localStorage.removeItem('fincalix_export_notice'); }, v);
                const shown = [];
                for (const p of ['/', '/sip', '/privacy-policy', '/calculators/loans', '/schemes/c-mudra', '/in-the-app']) { await setNotice(null); shown.push(`${p}:${await visibleOn(p)}`); }
                check('banner shows on every kind of page when the browser holds FinCalix data', shown.every((s) => s.endsWith(':true')), shown.join(' '));
                await setNotice(null);
                await visibleOn('/sip');
                check('banner: title, Export button, Google Play badge, link to /export-my-data', (await banner.locator('h2').innerText()) === 'FinCalix now lives on Android — export your data'
                    && await banner.locator('[data-fx-export]').isVisible() && (await banner.locator('.fx-play').getAttribute('href')) === play.playUrl('final_cta') && (await banner.locator('.fx-more').getAttribute('href')) === '/export-my-data');
                const fixed = await banner.evaluate((el) => getComputedStyle(el).position);
                check('banner is fixed at the bottom (never moves the page)', fixed === 'fixed');
                const [dl] = await Promise.all([page.waitForEvent('download'), banner.locator('[data-fx-export]').click()]);
                const file = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
                const fileOk = /^fincalix-backup-\d{8}\.json$/.test(dl.suggestedFilename()) && file.app === 'FinCalix' && file.schema === 1 && JSON.stringify(file.data).includes('qa-entry-1') && JSON.stringify(file.data).includes('qa-h2');
                check('banner export: the app\'s own backup file (fincalix-backup-YYYYMMDD.json) with this browser\'s data', fileOk, dl.suggestedFilename());
                await page.waitForTimeout(300);
                check('banner: confirms the download and names the import steps', (await banner.locator('.fx-done').innerText()).includes('Import App Data'));
                await banner.locator('.fx-close').click();
                const n1 = await page.evaluate(() => JSON.parse(localStorage.getItem('fincalix_export_notice') || 'null'));
                check('dismissed: gone, stays gone on the next visit', !(await banner.isVisible()) && n1?.dismissals === 1 && !(await visibleOn('/sip')) && !(await visibleOn('/')));
                const DAY = 86400000;
                await setNotice({ dismissals: 1, at: Date.now() - 29 * DAY });
                const at29 = await visibleOn('/sip');
                await setNotice({ dismissals: 1, at: Date.now() - 31 * DAY });
                const at31 = await visibleOn('/sip');
                check('comes back once 30 days after the dismissal (not at 29 days)', !at29 && at31);
                await page.keyboard.press('Tab');
                await banner.locator('.fx-close').focus();
                await page.keyboard.press('Escape');
                const n2 = await page.evaluate(() => JSON.parse(localStorage.getItem('fincalix_export_notice') || 'null'));
                await setNotice({ dismissals: 2, at: Date.now() - 400 * DAY });
                check('second dismissal (Escape works too): never shown a third time, even a year later', n2?.dismissals === 2 && !(await visibleOn('/sip')) && !(await visibleOn('/')));
                // /export-my-data
                await setNotice(null);
                await page.goto(prod.base + '/export-my-data', { waitUntil: 'networkidle' });
                await page.waitForTimeout(300);
                const found = await page.locator('[data-export-found] li').allInnerTexts();
                check('/export-my-data: lists what this browser holds, no banner on the page itself', found.join('|').includes('1 expense entry') && found.join('|').includes('2 recent calculations') && !(await banner.isVisible()), found.join(' | '));
                const [dl2] = await Promise.all([page.waitForEvent('download'), page.locator('[data-export-button]').click()]);
                const file2 = JSON.parse(fs.readFileSync(await dl2.path(), 'utf8'));
                check('/export-my-data: downloads the same backup file', /^fincalix-backup-\d{8}\.json$/.test(dl2.suggestedFilename()) && JSON.stringify(file2.data) === JSON.stringify(file.data));
                check('/export-my-data on the apex points to the www copy of the page', await page.locator('[data-origin="apex"]').isVisible() && !(await page.locator('[data-origin="www"]').isVisible()));
                const appData = await page.evaluate(() => localStorage.getItem('fincalix_entries'));
                check('export never changes the app data in the browser', appData === OLD.fincalix_entries);
                check('banner and export: no console error', errors.length === 0, errors.slice(0, 3).join(' | '));
                await ctx.close();
                const empty = await profile(prod.base, {}, { fincalix_analytics_consent: 'denied', 'settings-storage': JSON.stringify({ state: { theme: 'dark' }, version: 0 }) });
                const none = [];
                for (const p of ['/', '/sip', '/privacy-policy', '/calculators/loans']) { await empty.page.goto(prod.base + p, { waitUntil: 'networkidle' }); await empty.page.waitForTimeout(300); if (await empty.page.locator('.fx-banner').isVisible()) none.push(p); }
                await empty.page.goto(prod.base + '/export-my-data', { waitUntil: 'networkidle' });
                await empty.page.waitForTimeout(300);
                const status = await empty.page.locator('[data-export-status]').innerText();
                check('no banner without FinCalix records (settings alone do not count); export page says nothing was found', none.length === 0 && /No FinCalix data was found/.test(status) && await empty.page.locator('[data-export-button]').isDisabled(), none.join(', ') || status);
                await empty.ctx.close();
            }
            // 5h. iPhone and the desktop-only QR code
            {
                const iphone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
                const { ctx, page, errors } = await profile(prod.base, iphone, { fincalix_analytics_consent: 'denied' });
                await page.goto(prod.base + '/', { waitUntil: 'load' });
                const shift = await page.evaluate(() => new Promise((r) => { let v = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; }).observe({ type: 'layout-shift', buffered: true }); setTimeout(() => r(v), 2500); }));
                const ios = await page.evaluate(() => ({ cls: document.documentElement.classList.contains('ua-ios'), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
                check('iPhone: "Android only for now — there\'s no iPhone app yet." under the hero badge, Play badge kept', ios.cls && await page.locator('.hero .note-ios').isVisible() && !(await page.locator('.hero .note-default').isVisible())
                    && (await page.locator('.hero .note-ios').innerText()) === 'Android only for now — there’s no iPhone app yet.' && await page.locator('.hero [data-play="hero"]').isVisible());
                check('iPhone: no QR code, no "send the link" button, no layout shift, no horizontal scroll', !(await page.locator('.qr').first().isVisible()) && !/send (me )?the link/i.test(await page.content()) && shift < 0.05 && ios.sw <= ios.cw, `CLS ${shift.toFixed(4)}`);
                const amount = page.locator('#calc-panel input:not([type=range])').nth(0);
                await amount.fill('3500000'); await amount.press('Tab');
                await page.waitForTimeout(400);
                check('iPhone: the mini-calculator works', (await page.locator('.calc-out .big').innerText()) === calc.formatINR(calc.calculateReducingEMI(3500000, 8.5, 240).emi), await page.locator('.calc-out .big').innerText());
                await page.goto(prod.base + '/sip', { waitUntil: 'load' });
                check('iPhone: the guides open and work (no redirect, no error)', page.url().endsWith('/sip') && errors.length === 0, errors.slice(0, 2).join(' | '));
                await ctx.close();
                const desk = await profile(prod.base, {}, { fincalix_analytics_consent: 'denied' });
                await desk.page.goto(prod.base + '/', { waitUntil: 'load' });
                const qr = desk.page.locator('.hero .qr');
                const qrOk = await qr.isVisible() && (await qr.locator('svg').count()) === 1;
                const deskNote = await desk.page.locator('.hero .note-default').isVisible() && !(await desk.page.locator('.hero .note-ios').isVisible());
                await desk.page.setViewportSize({ width: 900, height: 900 });
                const qrNarrow = await qr.isVisible();
                check('desktop (≥1024 px, mouse): QR code to Google Play next to the hero badge; hidden on narrower windows', qrOk && deskNote && !qrNarrow);
                await desk.ctx.close();
                const android = await profile(prod.base, { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 }, { fincalix_analytics_consent: 'denied' });
                await android.page.goto(prod.base + '/', { waitUntil: 'load' });
                check('Android phone: no QR code, no iPhone note', !(await android.page.locator('.hero .qr').isVisible()) && !(await android.page.locator('.hero .note-ios').isVisible()));
                await android.ctx.close();
            }
        } finally {
            await browser.close();
        }

        // 5f. Service-worker kill switch: an install of the previous web app on a production host
        {
            const port = 4327;
            const killServer = await serveDist({ port, asHost: PROD });
            // b0aff35 = the last release that served the web app publicly (before the kill switch).
            const oldSw = execFileSync('git', ['show', 'b0aff35:public/sw.js'], { encoding: 'utf8' });
            killServer.overrides['/sw.js'] = oldSw;   // the service worker the published web app installed
            const origin = `http://fincalix.test:${port}`;
            const kb = await chromium.launch({ channel: 'chrome', args: ['--host-resolver-rules=MAP fincalix.test 127.0.0.1', `--unsafely-treat-insecure-origin-as-secure=${origin}`] });
            try {
                const ctx = await kb.newContext();
                const page = await ctx.newPage();
                await page.goto(origin + '/sip', { waitUntil: 'load' });
                await page.evaluate(async () => { await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready; });
                await page.waitForTimeout(1500);
                const before = await page.evaluate(async () => ({ regs: (await navigator.serviceWorker.getRegistrations()).length, caches: (await caches.keys()).length }));
                delete killServer.overrides['/sw.js'];      // this release's sw.js from now on
                await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r?.update(); });
                let after = null;
                for (let i = 0; i < 20; i++) {
                    await page.waitForTimeout(500);
                    after = await page.evaluate(async () => ({ regs: (await navigator.serviceWorker.getRegistrations()).length, caches: (await caches.keys()).length })).catch(() => null);
                    if (after && after.regs === 0 && after.caches === 0) break;
                }
                check('service-worker kill switch: an old web-app install unregisters itself and deletes its caches', before.regs === 1 && before.caches > 0 && after && after.regs === 0 && after.caches === 0, `before ${JSON.stringify(before)}, after ${JSON.stringify(after)}`);
                await ctx.close();
            } finally {
                await kb.close();
                await killServer.stop();
            }
        }
    } finally {
        await Promise.all([prod.stop(), dev.stop(), www.stop(), bay.stop()]);
    }
    console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
