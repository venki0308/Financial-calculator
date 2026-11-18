/**
 * On-screen date labels of the expense/business trackers in the user's language.
 * The calc layer (src/utils/expenseCalculations.ts) builds English labels ('November 2026',
 * '16 Nov — 22 Nov 2026', 'Mon, 16 Nov 2026', 'Jan'…) that are also used in PDF/Excel exports;
 * those stay English. Screens call these helpers instead (English output unchanged).
 */
import { formatDateUI, uiLang } from './uiLocale';

const parse = (iso: string) => new Date(`${iso}T00:00:00`);

/** Label of a date range { start, end, label } (week, month or salary cycle). */
export function rangeLabelUI(r: { start: string; end: string; label?: string }): string {
    if (uiLang() === 'en' && r.label) return r.label;
    const s = parse(r.start);
    const e = parse(r.end);
    if (r.start === r.end) return fullDateUI(r.start);
    if (/-01-01$/.test(r.start) && r.end === `${r.start.slice(0, 4)}-12-31`) return r.start.slice(0, 4);
    const wholeMonth = s.getDate() === 1 && s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
        && e.getDate() === new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate();
    if (wholeMonth) return formatDateUI(s, { month: 'long', year: 'numeric' });
    return `${formatDateUI(s, { day: 'numeric', month: 'short' })} – ${formatDateUI(e, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/** Compact week label '16 Nov-22 Nov' (the monthly week breakdown). */
export function shortRangeUI(start: string, end: string, label?: string): string {
    if (uiLang() === 'en' && label) return label;
    const f = (iso: string) => formatDateUI(parse(iso), { day: 'numeric', month: 'short' });
    return `${f(start)}-${f(end)}`;
}

/** 'Mon, 16 Nov 2026' for a 'YYYY-MM-DD' date. */
export function fullDateUI(iso: string): string {
    return formatDateUI(parse(iso), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** Short month name for month 1–12 ('Jan'). */
export function monthShortUI(month: number): string {
    return formatDateUI(new Date(2024, month - 1, 1), { month: 'short' });
}

/** '<month> <year>' for month 1–12 + year ('Nov 2026'; long: 'November 2026'). */
export function monthYearUI(month: number, year: number, long = false): string {
    return formatDateUI(new Date(year, month - 1, 1), { month: long ? 'long' : 'short', year: 'numeric' });
}

/** Short weekday name; index 0 = Monday (DAY_NAMES order) unless sundayFirst. */
export function weekdayShortUI(index: number, sundayFirst = false): string {
    // 1 Jan 2024 was a Monday, 31 Dec 2023 a Sunday.
    const d = sundayFirst ? new Date(2023, 11, 31 + index) : new Date(2024, 0, 1 + index);
    return formatDateUI(d, { weekday: 'short' });
}
