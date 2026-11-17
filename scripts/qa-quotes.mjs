// QA audit: the 366 daily quotes (src/data/quotes/*.json) and the day rule (src/data/quotes.ts).
//   node scripts/qa-quotes.mjs
// Checks: 366 unique ids and days; text in all 6 languages; ≤ 180 characters per language incl.
// attribution; the right script per language (no Latin in Indic text; Latin only in names);
// no duplicate English; sources on every attributed quote; no banned or post-1955 authors;
// category mix; Indian share; the same idea at least a month apart; the calendar days; and the
// leap-year day rule that the Home card and the notification share.
import fs from 'node:fs';
import { quoteDay, normalizeQuoteLang, formatQuote } from '../src/data/quotes.ts';

const DIR = new URL('../src/data/quotes/', import.meta.url);
const read = (f) => JSON.parse(fs.readFileSync(new URL(f, DIR), 'utf8'));
const catalog = read('catalog.json');
const LANGS = ['hi', 'te', 'ta', 'kn', 'ml'];
const texts = Object.fromEntries(LANGS.map((l) => [l, read(`${l}.json`)]));

let passed = 0, failed = 0;
const check = (label, ok, detail = '') => {
    ok ? passed++ : failed++;
    console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  [${detail}]` : ''}`);
};
const list = (arr, n = 8) => arr.slice(0, n).join('; ') + (arr.length > n ? ` … +${arr.length - n}` : '');
const len = (s) => [...s].length;

// Authors allowed in the set, with the year they died (all before 1955 — public domain). For classical
// authors without an exact date (Thiruvalluvar, Vemana, Sarvajna, Baddena, Chanakya…) the year is the
// latest traditional estimate; all lived centuries before 1955. Negative years are BCE.
const AUTHORS = JSON.parse(fs.readFileSync(new URL('./qa-quotes-authors.json', import.meta.url), 'utf8'));
// (Charlie Munger is banned; Theodore T. Munger, d. 1910, is public domain.)
const BANNED = /kiyosaki|housel|buffett|charlie munger|ramsey|orman|rohn|ziglar|napoleon hill|carnegie|einstein|benjamin graham|bogle|peter lynch|tony robbins|peale|colin powell|kalam|ratan tata|nehru|ambedkar|kuvempu|gundappa|ambani|jhunjhunwala|steve jobs|bill gates|elon musk|oprah/i;

console.log('\n1. 366 entries, unique ids, one per day 1–366');
check('366 entries', catalog.length === 366, String(catalog.length));
check('ids unique', new Set(catalog.map((q) => q.id)).size === catalog.length);
check('entry n is day n (1–366, no gaps or repeats)', catalog.every((q, i) => q.day === i + 1));
const FIELDS = ['id', 'day', 'category', 'author', 'sourceRef', 'sourceUrl', 'attributionType', 'en'];
check('every entry has id, day, category, author, sourceRef, sourceUrl, attributionType, en', catalog.every((q) => FIELDS.every((f) => f in q)));

console.log('\n2. Text in all 6 languages, attribution where due, ≤ 180 characters');
const missing = [], attrib = [], long = [];
for (const q of catalog) {
    const all = { en: q.en, ...Object.fromEntries(LANGS.map((l) => [l, texts[l][q.id]])) };
    for (const [l, t] of Object.entries(all)) {
        if (!t || typeof t.text !== 'string' || !t.text.trim()) { missing.push(`${q.id} ${l}`); continue; }
        if ((q.attributionType === 'original') !== (t.by === null)) attrib.push(`${q.id} ${l}`);
        const n = len(formatQuote(t));
        if (n > 180) long.push(`${q.id} ${l} ${n}`);
    }
}
check('text present in en, hi, te, ta, kn, ml for every id', missing.length === 0, list(missing));
check('attribution line on every attributed quote and proverb, none on original lines', attrib.length === 0, list(attrib));
check('“quote” — attribution ≤ 180 characters in every language', long.length === 0, list(long));
const extra = LANGS.flatMap((l) => Object.keys(texts[l]).filter((id) => !catalog.some((q) => q.id === id)).map((id) => `${l} ${id}`));
check('no language file has ids that are not in the catalog', extra.length === 0, list(extra));

console.log('\n3. Script per language (Latin only in names in the attribution)');
const SCRIPT = { hi: /\p{Script=Devanagari}/u, te: /\p{Script=Telugu}/u, ta: /\p{Script=Tamil}/u, kn: /\p{Script=Kannada}/u, ml: /\p{Script=Malayalam}/u };
const INDIC = /[\p{Script=Devanagari}\p{Script=Telugu}\p{Script=Tamil}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Bengali}\p{Script=Gujarati}\p{Script=Gurmukhi}\p{Script=Oriya}]/gu;
for (const l of LANGS) {
    const bad = [];
    for (const q of catalog) {
        const t = texts[l][q.id];
        if (!t) continue;
        if (/[A-Za-z]/.test(t.text)) bad.push(`${q.id} Latin in text`);
        if (!SCRIPT[l].test(t.text)) bad.push(`${q.id} no ${l} script`);
        const foreign = (t.text + (t.by || '')).match(INDIC)?.filter((c) => !SCRIPT[l].test(c)) || [];
        if (foreign.length) bad.push(`${q.id} other script ${foreign.slice(0, 3).join('')}`);
        if (t.by && !SCRIPT[l].test(t.by)) bad.push(`${q.id} attribution not in ${l} script`);
    }
    check(`${l}: text in its own script, no Latin letters, attribution in ${l} script`, bad.length === 0, list(bad));
}
check('en: Latin text, no Indic letters', catalog.every((q) => /[A-Za-z]/.test(q.en.text) && !(q.en.text.match(INDIC) || []).length));

console.log('\n4. No duplicates');
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const dupes = (arr) => arr.filter((x, i) => arr.indexOf(x) !== i);
check('no duplicate English quote', dupes(catalog.map((q) => norm(q.en.text))).length === 0, list(dupes(catalog.map((q) => norm(q.en.text)))));
for (const l of LANGS) {
    const d = dupes(catalog.map((q) => norm(texts[l][q.id]?.text || q.id)));
    check(`no duplicate ${l} text`, d.length === 0, list(d));
}

console.log('\n5. Sources and authors');
const ATT = ['public-domain', 'proverb', 'original'];
check('attributionType is public-domain, proverb or original', catalog.every((q) => ATT.includes(q.attributionType)));
const pd = catalog.filter((q) => q.attributionType === 'public-domain');
const noSrc = pd.filter((q) => !q.author || !q.sourceRef || !/^https:\/\/\S+$/.test(q.sourceUrl || '')).map((q) => q.id);
check('every attributed quote has author, sourceRef and an https sourceUrl', noSrc.length === 0, list(noSrc));
const prov = catalog.filter((q) => q.attributionType === 'proverb');
check('proverbs: no author, labelled with a sourceRef', prov.every((q) => q.author === null && q.sourceRef), list(prov.filter((q) => q.author !== null || !q.sourceRef).map((q) => q.id)));
check('original lines: no author and no source', catalog.filter((q) => q.attributionType === 'original').every((q) => q.author === null && q.sourceRef === null && q.sourceUrl === null));
const unknown = [...new Set(pd.map((q) => q.author))].filter((a) => !(a in AUTHORS));
check('every author is in the public-domain author list (scripts/qa-quotes-authors.json)', unknown.length === 0, list(unknown));
const late = Object.entries(AUTHORS).filter(([, died]) => !(typeof died === 'number' && died < 1955)).map(([a]) => a);
check('every listed author died before 1955', late.length === 0, list(late));
const banned = catalog.filter((q) => BANNED.test(`${q.author || ''} ${q.sourceRef || ''} ${q.en.text} ${q.en.by || ''}`)).map((q) => q.id);
check('no banned author (living / post-1955: Kiyosaki, Housel, Buffett, Munger, Ramsey, …)', banned.length === 0, list(banned));
const quoteSites = catalog.filter((q) => /brainyquote|goodreads|azquotes|quotefancy|pinterest|quotes\.net/i.test(q.sourceUrl || '')).map((q) => q.id);
check('no quote websites as sources', quoteSites.length === 0, list(quoteSites));

console.log('\n6. Mix, Indian share, spacing of ideas, calendar days');
const CAT = { money: 0.40, investing: 0.25, work: 0.20, inspiration: 0.15 };
const counts = Object.fromEntries(Object.keys(CAT).map((c) => [c, catalog.filter((q) => q.category === c).length]));
check('categories are money / investing / work / inspiration', catalog.every((q) => q.category in CAT));
check('mix within 5 points of 40 / 25 / 20 / 15 %', Object.entries(CAT).every(([c, p]) => Math.abs(counts[c] / 366 - p) <= 0.05), Object.entries(counts).map(([c, n]) => `${c} ${n}`).join(', '));
const indian = catalog.filter((q) => q.indian).length;
check('at least 120 quotes from Indian sources or about India', indian >= 120, String(indian));
const close = [];
for (const q of catalog) for (const r of catalog) {
    if (r.day <= q.day || !q.idea || q.idea !== r.idea) continue;
    const gap = Math.min(r.day - q.day, 366 - (r.day - q.day));
    if (gap < 31) close.push(`${q.idea} ${q.day}/${r.day}`);
}
check('the same idea is never repeated within a month (across the year end too)', close.length === 0, list(close));
const cal = { 1: 'jan1', 92: 'apr1', 213: 'jul31', 366: 'dec31' };
check('1 Jan fresh start, 1 Apr new financial year, 31 Jul and 31 Dec return reminders', Object.entries(cal).every(([d, c]) => catalog[d - 1]?.calendar === c), Object.entries(cal).map(([d]) => `${d}:${catalog[d - 1]?.calendar}`).join(' '));

console.log('\n7. Day rule (leap-year calendar, local time) shared by the Home card and the notification');
check('1 Jan → 1', quoteDay(new Date(2027, 0, 1)) === 1);
check('28 Feb → 59 (any year)', quoteDay(new Date(2027, 1, 28)) === 59 && quoteDay(new Date(2028, 1, 28)) === 59);
check('29 Feb 2028 → 60', quoteDay(new Date(2028, 1, 29)) === 60);
check('1 Mar → 61 in leap and common years', quoteDay(new Date(2027, 2, 1)) === 61 && quoteDay(new Date(2028, 2, 1)) === 61);
check('1 Apr → 92 (new financial year)', quoteDay(new Date(2027, 3, 1)) === 92 && quoteDay(new Date(2028, 3, 1)) === 92);
check('31 Jul → 213', quoteDay(new Date(2027, 6, 31)) === 213);
check('31 Dec → 366 in leap and common years', quoteDay(new Date(2027, 11, 31)) === 366 && quoteDay(new Date(2028, 11, 31)) === 366);
for (const y of [2027, 2028]) {
    const seen = new Set();
    for (let d = new Date(y, 0, 1); d.getFullYear() === y; d.setDate(d.getDate() + 1)) seen.add(quoteDay(d));
    const want = y % 4 === 0 ? 366 : 365;
    check(`${y}: every date gets its own day number in 1–366${want === 365 ? ' (60 is skipped)' : ''}`, seen.size === want && [...seen].every((n) => n >= 1 && n <= 366) && (want === 366 || !seen.has(60)));
}
check('the time of day does not change the quote (00:00 and 23:59)', quoteDay(new Date(2027, 5, 15, 0, 0)) === quoteDay(new Date(2027, 5, 15, 23, 59)));
check('language codes: te-IN → te, Telugu → te, xx → en', normalizeQuoteLang('te-IN') === 'te' && normalizeQuoteLang('Telugu') === 'te' && normalizeQuoteLang('xx') === 'en' && normalizeQuoteLang(undefined) === 'en');

console.log('\n8. Counts');
const byType = Object.fromEntries(ATT.map((t) => [t, catalog.filter((q) => q.attributionType === t).length]));
console.log(`  categories: ${Object.entries(counts).map(([c, n]) => `${c} ${n} (${(n / 3.66).toFixed(1)}%)`).join(', ')}`);
console.log(`  attribution: ${Object.entries(byType).map(([t, n]) => `${t} ${n}`).join(', ')}; Indian ${indian}`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
