/**
 * Spreadsheet formula-injection guard (CWE-1236, "CSV injection").
 *
 * A cell whose text starts with = + - @ (or a tab / carriage return) is treated
 * as a formula by Excel, Google Sheets and LibreOffice when a CSV is opened, so
 * user-entered text such as a description of "=HYPERLINK(...)" could run when
 * someone opens an export. Every CSV and Excel export in the app goes through
 * this module: such TEXT cells get one leading apostrophe, which spreadsheets
 * read as "this is text".
 *
 * Numbers are never touched: a value exported with typeof 'number' (including
 * negative amounts) stays numeric. Only text cells are guarded.
 *
 * Keep this file free of imports and of non-erasable TypeScript so the Node QA
 * script (scripts/qa-export-safety.mjs) can load it directly.
 */

export type CellValue = string | number | boolean | null | undefined;

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

/**
 * Display strings the app itself builds for signed figures, e.g. "-3.2%",
 * "+₹1,200", "-500.00". They contain only a sign, an optional currency symbol,
 * digits, separators and an optional percent sign — no letters, operators or
 * cell references — so a spreadsheet can at most read them as a plain number.
 * They are left as-is; guarding them would only add a visible apostrophe to
 * legitimate report cells.
 */
const INERT_SIGNED_NUMBER = /^[+-]\s?[₹$€£]?\s?\d[\d,]*(\.\d+)?\s?%?$/;

/** Prefix an apostrophe when a text cell could be read as a formula. */
export function guardText(text: string): string {
    if (!FORMULA_TRIGGER.test(text)) return text;
    if (INERT_SIGNED_NUMBER.test(text)) return text;
    return `'${text}`;
}

/** One CSV field: numbers verbatim, text guarded and RFC 4180-quoted. */
export function csvCell(value: CellValue): string {
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
    if (value === null || value === undefined) return '';
    const text = guardText(String(value));
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One CSV record (no line terminator). */
export function csvRow(cells: readonly CellValue[]): string {
    return cells.map(csvCell).join(',');
}

/**
 * Guard an array-of-arrays before it is handed to SheetJS `aoa_to_sheet`.
 * SheetJS already stores strings as text cells (never as formulas); this adds
 * the same apostrophe guard so the text stays inert if the sheet is later
 * saved as CSV. Non-string cells (numbers, dates, booleans) pass through.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function guardAoa<T extends any[][]>(rows: T): T {
    return rows.map(row =>
        row.map(cell => (typeof cell === 'string' ? guardText(cell) : cell))
    ) as T;
}
