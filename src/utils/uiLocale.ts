/**
 * Formatting in the user's selected app language, for text shown ON SCREEN.
 *
 * - Dates: month and weekday names in the user's language (Telugu "18 నవం 2026", Hindi "18 नव॰ 2026").
 *   Do NOT use these for PDF / Excel / CSV exports: the PDF fonts have no Indic letters, so exports keep
 *   'en-IN'.
 * - Amounts in words: English keeps "Thirty Lakhs …" (formatINRWords); Indian languages read amounts
 *   as digits with native units, the way people say them: "33 లక్షల 62 వేల 441 రూపాయలు".
 * - Numbers themselves keep `toLocaleString('en-IN')` (₹1,00,000 grouping, digits 0-9) everywhere.
 */
import i18n from '../i18n';
import { formatINRWords } from './calculations';

type Lang = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml';
const TAGS: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN', ml: 'ml-IN' };

export function uiLang(): Lang {
    const l = (i18n.language || 'en').slice(0, 2) as Lang;
    return l in TAGS ? l : 'en';
}

/** BCP-47 tag for the user's language, for Intl date formatting on screen. */
export function uiLocale(): string {
    return TAGS[uiLang()];
}

/** `date.toLocaleDateString` in the user's language (on-screen text only, never exports). */
export function formatDateUI(d: Date | number | string, opts?: Intl.DateTimeFormatOptions): string {
    const date = d instanceof Date ? d : new Date(d);
    try { return date.toLocaleDateString(uiLocale(), opts); } catch { return date.toLocaleDateString('en-IN', opts); }
}

// unit words: [singular, plural / joining form]
const UNITS: Record<Exclude<Lang, 'en'>, { crore: [string, string]; lakh: [string, string]; thousand: [string, string]; rupees: [string, string] }> = {
    hi: { crore: ['करोड़', 'करोड़'], lakh: ['लाख', 'लाख'], thousand: ['हज़ार', 'हज़ार'], rupees: ['रुपया', 'रुपये'] },
    te: { crore: ['కోటి', 'కోట్ల'], lakh: ['లక్ష', 'లక్షల'], thousand: ['వెయ్యి', 'వేల'], rupees: ['రూపాయి', 'రూపాయలు'] },
    ta: { crore: ['கோடி', 'கோடி'], lakh: ['லட்சம்', 'லட்சம்'], thousand: ['ஆயிரம்', 'ஆயிரம்'], rupees: ['ரூபாய்', 'ரூபாய்'] },
    kn: { crore: ['ಕೋಟಿ', 'ಕೋಟಿ'], lakh: ['ಲಕ್ಷ', 'ಲಕ್ಷ'], thousand: ['ಸಾವಿರ', 'ಸಾವಿರ'], rupees: ['ರೂಪಾಯಿ', 'ರೂಪಾಯಿ'] },
    ml: { crore: ['കോടി', 'കോടി'], lakh: ['ലക്ഷം', 'ലക്ഷം'], thousand: ['ആയിരം', 'ആയിരം'], rupees: ['രൂപ', 'രൂപ'] },
};

/** An amount in words in the user's language (rounded to whole rupees). */
export function amountInWords(v: number): string {
    const lang = uiLang();
    if (lang === 'en') return formatINRWords(v);
    const u = UNITS[lang];
    let n = Math.round(Math.abs(v));
    if (n === 0) return `0 ${u.rupees[1]}`;
    const crore = Math.floor(n / 1e7); n %= 1e7;
    const lakh = Math.floor(n / 1e5); n %= 1e5;
    const thousand = Math.floor(n / 1e3); n %= 1e3;
    const parts: string[] = [];
    const add = (k: number, w: [string, string]) => { if (k) parts.push(`${k.toLocaleString('en-IN')} ${k === 1 ? w[0] : w[1]}`); };
    add(crore, u.crore); add(lakh, u.lakh); add(thousand, u.thousand);
    if (n) parts.push(String(n));
    const total = Math.round(Math.abs(v));
    return `${v < 0 ? '-' : ''}${parts.join(' ')} ${total === 1 ? u.rupees[0] : u.rupees[1]}`;
}
