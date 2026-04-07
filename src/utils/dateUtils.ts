// ═══════════════════════════════════════════════════════════════
// FINCALIX — Timezone-safe date helpers
// Always work in the user's LOCAL timezone (IST for Indian users).
//
// Why: `Date.toISOString()` converts to UTC. After 6:30 PM IST,
// `new Date().toISOString().split('T')[0]` returns TOMORROW's date,
// which breaks loan EMI dates, FD maturity, expense entry dates etc.
// ═══════════════════════════════════════════════════════════════

/** Format a Date as 'YYYY-MM-DD' in LOCAL timezone (no UTC conversion). */
export const toLocalDateStr = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/** Today's date in 'YYYY-MM-DD' format, local timezone. */
export const todayStr = (): string => toLocalDateStr(new Date());

/** Parse a 'YYYY-MM-DD' string into a local Date (midnight local). */
export const parseLocalDate = (str: string): Date => {
    return new Date(str + 'T00:00:00');
};

/** Add `days` to a 'YYYY-MM-DD' string (positive or negative). */
export const shiftLocalDate = (str: string, days: number): string => {
    const d = parseLocalDate(str);
    d.setDate(d.getDate() + days);
    return toLocalDateStr(d);
};
