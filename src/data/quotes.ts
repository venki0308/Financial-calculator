import en from '../locales/en.json';

/**
 * Daily financial quotes.
 *
 * The quote text lives in the locale files under `dailyQuotes` ("1".."N"), so
 * every language ships real translations inside its own on-demand locale chunk
 * and English (always bundled) is the automatic fallback. To add a quote, add
 * the next number to `dailyQuotes` in en.json and in each other locale.
 */
export const DAILY_QUOTE_COUNT = Object.keys(en.dailyQuotes).length;

/**
 * i18n key of the quote for a calendar day. Based on day-of-year so every user
 * sees the same quote on the same day, in the app and in the notification.
 */
export function dailyQuoteKey(date: Date = new Date()): string {
    const start = new Date(date.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
    return `dailyQuotes.${(dayOfYear % DAILY_QUOTE_COUNT) + 1}`;
}
