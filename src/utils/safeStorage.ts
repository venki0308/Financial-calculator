/**
 * Safe localStorage writes.
 *
 * The app keeps all user data in localStorage, which browsers and the Android
 * WebView cap at roughly 5 million characters per origin (measured: 15,000
 * expense entries fit, 20,000 do not). A write past the cap throws
 * QuotaExceededError; before this module nothing caught it, so a save simply
 * failed with no message.
 *
 * Every write in the app now goes through one of these:
 *   - safeSetItem  → returns false on a full store (never throws for quota).
 *                    For settings, flags, caches and other non-critical writes.
 *   - mustSetItem  → throws StorageFullError on a full store, AFTER announcing
 *                    it. For user data (entries, loans, cards…): the throw
 *                    stops the calling save handler, so the form stays open
 *                    with the user's input intact instead of closing as if the
 *                    save had worked.
 *   - safeLocalStorage → the same behaviour as safeSetItem, shaped for
 *                    zustand's `persist` middleware.
 * Both announce a full store through a window event that <StorageGuard />
 * turns into a dialog with an "Export backup" button.
 */

export const STORAGE_FULL_EVENT = 'fincalix:storage-full';
export const STORAGE_WARNING_EVENT = 'fincalix:storage-warning';

/** Conservative per-origin capacity in UTF-16 code units (see header). */
export const STORAGE_LIMIT_CHARS = 5_000_000;
/** Warn once usage passes this share of the limit. */
export const STORAGE_WARN_RATIO = 0.8;

const WARNED_AT_KEY = 'fincalix_storage_warned_at';
const WARN_REPEAT_MS = 24 * 60 * 60 * 1000;
const USAGE_CHECK_INTERVAL_MS = 60 * 1000;

export class StorageFullError extends Error {
    readonly key: string;
    constructor(key: string) {
        super(`Storage is full; could not save "${key}"`);
        this.name = 'StorageFullError';
        this.key = key;
    }
}

/** True for the quota error in all its browser spellings. */
export function isQuotaError(e: unknown): boolean {
    if (!e || typeof e !== 'object') return false;
    const err = e as { name?: string; code?: number };
    return (
        err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || // Firefox
        err.code === 22 ||                            // legacy WebKit / Chromium
        err.code === 1014                             // legacy Firefox
    );
}

/** Characters currently stored (keys + values) for this origin. */
export function storageUsageChars(): number {
    let total = 0;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key === null) continue;
            total += key.length + (localStorage.getItem(key)?.length ?? 0);
        }
    } catch { /* storage unavailable → report empty */ }
    return total;
}

/** Usage as a share of the limit, 0..1+ . */
export function storageUsageRatio(): number {
    return storageUsageChars() / STORAGE_LIMIT_CHARS;
}

function announce(eventName: string, detail: Record<string, unknown>) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

let lastUsageCheckAt = 0;

/**
 * Soft warning: when usage passes 80% of the limit, announce it (at most once
 * a day) so the user can back up and prune before saves start failing.
 * Throttled to one measurement a minute; pass `force` to measure now.
 */
export function checkStorageUsage(force = false): number | null {
    const now = Date.now();
    if (!force && now - lastUsageCheckAt < USAGE_CHECK_INTERVAL_MS) return null;
    lastUsageCheckAt = now;

    const ratio = storageUsageRatio();
    if (ratio < STORAGE_WARN_RATIO) return ratio;
    try {
        const warnedAt = Number(localStorage.getItem(WARNED_AT_KEY)) || 0;
        if (now - warnedAt < WARN_REPEAT_MS) return ratio;
        localStorage.setItem(WARNED_AT_KEY, String(now));
    } catch { /* cannot record the timestamp — still warn */ }
    announce(STORAGE_WARNING_EVENT, { percent: Math.min(100, Math.round(ratio * 100)) });
    return ratio;
}

/**
 * Write to localStorage. Returns false — after announcing it — when the store
 * is full. Any other failure (storage disabled, security error) is rethrown
 * unchanged, exactly as a bare localStorage.setItem would.
 */
export function safeSetItem(key: string, value: string): boolean {
    return write(key, value, false);
}

/**
 * Write user data. On a full store this announces it and throws
 * StorageFullError so the calling save flow stops instead of reporting success.
 */
export function mustSetItem(key: string, value: string): void {
    if (!write(key, value, true)) throw new StorageFullError(key);
}

/** `userData` tells the dialog whether something the user just saved was lost. */
function write(key: string, value: string, userData: boolean): boolean {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        if (!isQuotaError(e)) throw e;
        announce(STORAGE_FULL_EVENT, { key, userData });
        return false;
    }
    checkStorageUsage();
    return true;
}

/** Storage adapter for zustand `persist` (`createJSONStorage(() => safeLocalStorage)`). */
export const safeLocalStorage = {
    getItem: (key: string): string | null => localStorage.getItem(key),
    setItem: (key: string, value: string): void => { safeSetItem(key, value); },
    removeItem: (key: string): void => localStorage.removeItem(key),
};
