/**
 * Fixed India Standard Time slots for notifications (owner's decision, 18 Nov 2026): the morning
 * quote at 07:00 IST and the evening "log today's expenses" reminder at 20:00 IST, whatever the
 * phone's time zone (identical for phones set to India). Pure functions — no app imports — so
 * scripts/qa-notification-times.mjs can test them under other time zones.
 */
const IST_OFFSET_MS = 330 * 60 * 1000; // UTC+05:30, no daylight saving

export const QUOTE_HOUR_IST = 7;
export const LOG_REMINDER_HOUR_IST = 20;

/**
 * The IST calendar day `days` after today (IST) and the instant of hour:minute IST on that day.
 * `day` is a local Date at midnight of that calendar date, used to pick the day's quote (same date
 * rule as the Home card).
 */
export function istSlot(days: number, hour: number, minute = 0, now: Date = new Date()): { day: Date; at: Date } {
    const ist = new Date(now.getTime() + IST_OFFSET_MS); // its UTC fields are the IST wall clock
    const y = ist.getUTCFullYear(), m = ist.getUTCMonth(), d = ist.getUTCDate() + days;
    return { day: new Date(y, m, d), at: new Date(Date.UTC(y, m, d, hour, minute) - IST_OFFSET_MS) };
}
