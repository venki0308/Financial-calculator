// IndexNow: tell Bing, Yandex, Seznam, Naver (and other IndexNow engines) which URLs changed.
// Run AFTER a production deploy, never before (the engines fetch the URLs straight away).
//
//   node scripts/landing/indexnow.mjs --since 2026-11-17     URLs whose sitemap lastmod >= date
//   node scripts/landing/indexnow.mjs --all                  every URL in the live sitemap
//   node scripts/landing/indexnow.mjs https://fincalix.com/a https://fincalix.com/b
//   add --dry to print the list without sending.
//
// The key is the file public/<32 hex>.txt (served at https://fincalix.com/<key>.txt).
import fs from 'node:fs';

const HOST = 'fincalix.com';
const ORIGIN = `https://${HOST}`;
const keyFile = fs.readdirSync('public').find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('no IndexNow key file in public/');
const key = keyFile.slice(0, 32);
if (fs.readFileSync(`public/${keyFile}`, 'utf8').trim() !== key) throw new Error('key file content must equal its name');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
let urls = args.filter((a) => a.startsWith(ORIGIN));

async function sitemapEntries() {
    const idx = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
    const kids = [...idx.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const xml = kids.length ? (await Promise.all(kids.map(async (k) => (await fetch(k)).text()))).join('') : idx;
    return [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map((m) => ({ loc: m[1], lastmod: m[2] }));
}
if (args.includes('--all')) urls = (await sitemapEntries()).map((e) => e.loc);
const since = args[args.indexOf('--since') + 1];
if (args.includes('--since')) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(since || '')) throw new Error('--since needs YYYY-MM-DD');
    urls = (await sitemapEntries()).filter((e) => e.lastmod >= since).map((e) => e.loc);
}
urls = [...new Set(urls)];
if (!urls.length) { console.log('indexnow: nothing to submit'); process.exit(0); }

// The key file must be live before submitting.
const live = await fetch(`${ORIGIN}/${key}.txt`);
if (!live.ok || (await live.text()).trim() !== key) throw new Error(`key file not live at ${ORIGIN}/${key}.txt`);

console.log(`indexnow: ${urls.length} URL(s)${dry ? ' (dry run)' : ''}`);
if (dry) { console.log(urls.join('\n')); process.exit(0); }
for (let i = 0; i < urls.length; i += 10000) {
    const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host: HOST, key, keyLocation: `${ORIGIN}/${key}.txt`, urlList: urls.slice(i, i + 10000) }),
    });
    console.log(`indexnow: HTTP ${res.status} ${res.status === 200 || res.status === 202 ? '(accepted)' : await res.text()}`);
    if (res.status >= 400) process.exit(1);
}
