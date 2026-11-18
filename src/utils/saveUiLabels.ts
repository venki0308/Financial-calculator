/**
 * On-screen labels for the deposit / tax / scheme calculators, in the user's language.
 * Display only: the stored values and the rate data stay as they are.
 */
import i18n from '../i18n';
import { SMALL_SAVINGS } from '../data/rateEnvironment';
import { formatDateUI, uiLang } from './uiLocale';

/** "Q3 2026-27 (Oct–Dec 2026)" with the month names in the user's language. */
export function smallSavingsQuarterLabel(): string {
    if (uiLang() === 'en') return SMALL_SAVINGS.label;
    const [y, m] = SMALL_SAVINGS.validTill.split('-').map(Number);
    const end = new Date(y, m - 1, 1);
    const start = new Date(y, m - 3, 1);
    const from = formatDateUI(start, { month: 'short' });
    const to = formatDateUI(end, { month: 'short', year: 'numeric' });
    return `${SMALL_SAVINGS.quarter} (${from}–${to})`;
}

/** Month and year of a fixed date, e.g. "Jul 2026", in the user's language. */
export function monthYearUI(year: number, monthIndex: number): string {
    return formatDateUI(new Date(year, monthIndex, 1), { month: 'short', year: 'numeric' });
}

/** "3y 4m" style duration with the short units in the user's language. */
export function yearsMonthsShort(years: number, months: number): string {
    const y = i18n.t('saveUi.yShort', '{{n}}y', { n: years });
    const mo = i18n.t('saveUi.mShort', '{{n}}m', { n: months });
    if (years === 0) return mo;
    if (months === 0) return y;
    return `${y} ${mo}`;
}

// DecisionEngine recommendations stay in English (the website and audits read that file);
// the screens show them through these keys. Matched by the English title.
const REC_KEYS: Record<string, [string, string]> = {
    'Wealth Erosion Warning': ['saveUi.recErosionTitle', 'saveUi.recErosionDesc'],
    'Best for Tax Saving': ['saveUi.recNscTaxTitle', 'saveUi.recNscTaxDesc'],
    'Guaranteed Compounding': ['saveUi.recNscGrowthTitle', 'saveUi.recNscGrowthDesc'],
    'Best for Monthly Income': ['saveUi.recPomisBestTitle', 'saveUi.recPomisBestDesc'],
    'Reliable Income Stream': ['saveUi.recPomisSteadyTitle', 'saveUi.recPomisSteadyDesc'],
    'Tax-Efficient Fixed Return': ['saveUi.recTd5Title', 'saveUi.recTd5Desc'],
    'Short-Term Safe Parking': ['saveUi.recTdShortTitle', 'saveUi.recTdShortDesc'],
    'Capital Preservation': ['saveUi.recTdSafeTitle', 'saveUi.recTdSafeDesc'],
};

/** Title and description of a DecisionEngine recommendation in the user's language. */
export function recommendationText(rec: { title: string; description: string; titleKey?: string; descKey?: string }): { title: string; description: string } {
    if (rec.titleKey && rec.descKey) {
        return { title: i18n.t(rec.titleKey, rec.title), description: i18n.t(rec.descKey, rec.description) };
    }
    const keys = REC_KEYS[rec.title];
    if (!keys) return { title: rec.title, description: rec.description };
    const rate = rec.description.match(/\((-?[\d.]+)%\)/)?.[1] ?? '';
    return { title: i18n.t(keys[0], rec.title), description: i18n.t(keys[1], rec.description, { rate }) };
}
