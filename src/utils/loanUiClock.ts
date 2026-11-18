/**
 * World clock display helpers: city and country names in the user's language (display only; the
 * saved clocks and timezone data keep their English names). Kept apart from loanUi.ts so loan screens
 * don't load the timezone list.
 */
import i18n from '../i18n';
import { uiLang, uiLocale } from './uiLocale';
import { WORLD_TIMEZONES } from '../data/timezones';

const tr = (key: string, def: string) => String(i18n.t(key, { defaultValue: def }));

// ─── World clock: city and country names ─────────────────────────────────────
// Country names come from the browser's own translations (Intl.DisplayNames, ISO code = the last word
// of each zone's searchTerms). Cities: the ones Indian users add most are translated via loanUi.city_*;
// the rest stay in English.
const COUNTRY_CODE: Record<string, string> = {};
for (const z of WORLD_TIMEZONES) {
    const code = z.searchTerms.trim().split(/\s+/).pop() || '';
    if (/^[a-z]{2}$/.test(code)) COUNTRY_CODE[z.country] = code.toUpperCase();
}
let regionNames: { lang: string; dn: { of(code: string): string | undefined } | null } | null = null;
function regionName(code: string): string | undefined {
    const lang = uiLang();
    if (!regionNames || regionNames.lang !== lang) {
        let dn: { of(code: string): string | undefined } | null = null;
        try {
            const DN = (Intl as unknown as { DisplayNames?: new (l: string[], o: { type: string }) => { of(code: string): string | undefined } }).DisplayNames;
            dn = DN ? new DN([uiLocale()], { type: 'region' }) : null;
        } catch { dn = null; }
        regionNames = { lang, dn };
    }
    try { return regionNames.dn?.of(code); } catch { return undefined; }
}
/** Country name ('India', 'United States' …) in the user's language. English keeps the stored name. */
export function countryNameUI(name: string): string {
    if (uiLang() === 'en') return name;
    if (name === 'Universal Time') return tr('loanUi.universalTime', name);
    const code = COUNTRY_CODE[name];
    const local = code ? regionName(code) : undefined;
    return local && local !== code ? local : name;
}
const CITY_SLUGS: Record<string, string> = {
    'Kolkata': 'kolkata', 'Mumbai': 'mumbai', 'Delhi': 'delhi', 'Dubai': 'dubai', 'Abu Dhabi': 'abudhabi',
    'London': 'london', 'New York': 'newyork', 'Singapore': 'singapore', 'Riyadh': 'riyadh',
    'Kuwait City': 'kuwaitcity', 'Muscat': 'muscat', 'Doha': 'doha', 'Manama': 'manama', 'Toronto': 'toronto',
    'Sydney': 'sydney', 'Melbourne': 'melbourne', 'Tokyo': 'tokyo', 'Hong Kong': 'hongkong',
    'Kathmandu': 'kathmandu', 'Dhaka': 'dhaka', 'Colombo': 'colombo', 'Karachi': 'karachi', 'Paris': 'paris',
    'Berlin': 'berlin', 'Chicago (CST)': 'chicago', 'Los Angeles (PST)': 'losangeles', 'Kuala Lumpur': 'kualalumpur',
    'Bangkok': 'bangkok', 'Shanghai': 'shanghai', 'Beijing': 'beijing', 'Auckland': 'auckland', 'Wellington': 'wellington',
    'Male': 'male', 'Frankfurt': 'frankfurt',
};
/** City name ('Kolkata / Mumbai / Delhi' …) in the user's language; each part is looked up on its own. */
export function cityNameUI(city: string): string {
    if (uiLang() === 'en') return city;
    return city.split(' / ').map(part => {
        const slug = CITY_SLUGS[part];
        return slug ? tr(`loanUi.city_${slug}`, part) : part;
    }).join(' / ');
}
