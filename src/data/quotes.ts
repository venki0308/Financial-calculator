/**
 * Daily quotes: one quote for every day of a leap year (366), in the app's six languages.
 *
 * Data (all loaded on demand, so none of it is in the start-up bundle):
 *   quotes/catalog.json  — the 366 entries: id, day, category, author, sourceRef, sourceUrl,
 *                          attributionType and the English text + attribution;
 *   quotes/<lang>.json   — hi, te, ta, kn, ml: { [id]: { text, by } } in that language.
 * An Indian classic (a Kural, a doha, a Vemana line…) is shown in its original language to readers
 * of that language and as its meaning in the others. A missing translation falls back to English.
 *
 * Selection: `quoteDay()` numbers the date on a LEAP-YEAR calendar (1 Jan = 1, 29 Feb = 60,
 * 1 Apr = 92, 31 Jul = 213, 31 Dec = 366), in local time. Every user therefore sees the same quote
 * on the same date, calendar quotes (new financial year, ITR due dates) always land on their date,
 * and day 60 shows only on 29 February. The Home card and the morning notification both call
 * `getDailyQuote()`, so they always match. `scripts/qa-quotes.mjs` checks the data.
 */
export type QuoteLang = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml';
export const QUOTE_LANGS: readonly QuoteLang[] = ['en', 'hi', 'te', 'ta', 'kn', 'ml'];
export type QuoteCategory = 'money' | 'investing' | 'work' | 'inspiration';
export type AttributionType = 'public-domain' | 'proverb' | 'original';

/** The quote and its attribution line in one language (`by` is null for original lines). */
export interface QuoteText { text: string; by: string | null }

export interface DailyQuote {
    id: string;
    /** 1–366 on a leap-year calendar (see quoteDay). */
    day: number;
    category: QuoteCategory;
    /** English name of the author; null for proverbs and original lines. */
    author: string | null;
    /** Work + chapter / verse / page (or the proverb collection); null for original lines. */
    sourceRef: string | null;
    sourceUrl: string | null;
    attributionType: AttributionType;
    en: QuoteText;
}

export type QuoteTexts = Readonly<Record<string, QuoteText>>;

export interface ResolvedQuote {
    quote: DailyQuote;
    text: QuoteText;
    /** Language of `text` (English when the requested language had no text). */
    lang: QuoteLang;
}

/** First day of each month on a leap-year calendar, minus one. */
const LEAP_MONTH_OFFSET = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335] as const;

/** Day number 1–366 of a date on a leap-year calendar, in local time. */
export function quoteDay(date: Date = new Date()): number {
    return LEAP_MONTH_OFFSET[date.getMonth()] + date.getDate();
}

/** Accepts 'te', 'te-IN' and the legacy display names ('Telugu'); anything else → 'en'. */
export function normalizeQuoteLang(lang?: string | null): QuoteLang {
    const names: Record<string, QuoteLang> = { english: 'en', hindi: 'hi', telugu: 'te', tamil: 'ta', kannada: 'kn', malayalam: 'ml' };
    const raw = String(lang || '').toLowerCase();
    const code = names[raw] ?? raw.split(/[-_]/)[0];
    return (QUOTE_LANGS as readonly string[]).includes(code) ? (code as QuoteLang) : 'en';
}

let catalog: readonly DailyQuote[] | null = null;
const texts: Partial<Record<QuoteLang, QuoteTexts>> = {};

const LOADERS: Record<Exclude<QuoteLang, 'en'>, () => Promise<{ default: unknown }>> = {
    hi: () => import('./quotes/hi.json'),
    te: () => import('./quotes/te.json'),
    ta: () => import('./quotes/ta.json'),
    kn: () => import('./quotes/kn.json'),
    ml: () => import('./quotes/ml.json'),
};

export async function loadQuoteCatalog(): Promise<readonly DailyQuote[]> {
    if (!catalog) catalog = (await import('./quotes/catalog.json')).default as unknown as readonly DailyQuote[];
    return catalog;
}

async function loadTexts(lang: Exclude<QuoteLang, 'en'>): Promise<QuoteTexts | null> {
    if (texts[lang]) return texts[lang]!;
    try {
        texts[lang] = (await LOADERS[lang]()).default as QuoteTexts;
        return texts[lang]!;
    } catch {
        // Chunk unavailable (offline web build, stale cache): English this time, retried next call.
        return null;
    }
}

function quoteFor(list: readonly DailyQuote[], day: number): DailyQuote {
    const q = list[day - 1];
    return q && q.day === day ? q : (list.find((x) => x.day === day) ?? list[(day - 1) % list.length]);
}

function resolve(quote: DailyQuote, lang: QuoteLang, langTexts: QuoteTexts | null | undefined): ResolvedQuote {
    const t = lang === 'en' ? undefined : langTexts?.[quote.id];
    return t && t.text ? { quote, text: t, lang } : { quote, text: quote.en, lang: 'en' };
}

/** The quote for a date in a language (English if that language's text is unavailable). */
export async function getDailyQuote(lang?: string | null, date: Date = new Date()): Promise<ResolvedQuote> {
    const code = normalizeQuoteLang(lang);
    const quote = quoteFor(await loadQuoteCatalog(), quoteDay(date));
    return resolve(quote, code, code === 'en' ? null : await loadTexts(code));
}

/** Same as getDailyQuote, but only from what is already loaded (null until it is). */
export function peekDailyQuote(lang?: string | null, date: Date = new Date()): ResolvedQuote | null {
    const code = normalizeQuoteLang(lang);
    if (!catalog || (code !== 'en' && !texts[code])) return null;
    return resolve(quoteFor(catalog, quoteDay(date)), code, code === 'en' ? null : texts[code]);
}

/** One line for a notification: “quote” (attribution). Owner, 18 Nov 2026: no dash before the author. */
export function formatQuote(t: QuoteText): string {
    return t.by ? `“${t.text}” (${t.by})` : `“${t.text}”`;
}

/** How formatQuote wrote the line before 18 Nov 2026; bell entries saved then still carry it. */
export function formatQuoteLegacy(t: QuoteText): string {
    return t.by ? `“${t.text}” — ${t.by}` : `“${t.text}”`;
}
