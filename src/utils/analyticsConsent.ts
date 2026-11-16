/**
 * The choice the user made about optional usage analytics.
 *
 * Analytics are OFF until the user explicitly allows them: nothing from Google
 * is loaded, no request is made and no identifier is created while the choice
 * is missing or "denied". There is no popup: the user turns analytics on or
 * off in Settings → Privacy.
 */
import { safeSetItem } from './safeStorage';

export const ANALYTICS_CONSENT_KEY = 'fincalix_analytics_consent';
/** Fired on `window` whenever the choice changes. `detail` is the new value. */
export const ANALYTICS_CONSENT_EVENT = 'fincalix:analytics-consent';

export type AnalyticsConsent = 'granted' | 'denied';

/** Current disclaimer acceptance key (see GlobalDisclaimerModal). */
export const DISCLAIMER_KEY = 'fincalix_disclaimer_accepted_v4';

/** The stored choice, or null when the user has not been asked yet. */
export function getAnalyticsConsent(): AnalyticsConsent | null {
    try {
        const v = localStorage.getItem(ANALYTICS_CONSENT_KEY);
        return v === 'granted' || v === 'denied' ? v : null;
    } catch {
        return null; // storage unavailable → treat as "not allowed"
    }
}

export function hasAnalyticsConsent(): boolean {
    return getAnalyticsConsent() === 'granted';
}

/** Persist the choice and tell the rest of the app. */
export function storeAnalyticsConsent(value: AnalyticsConsent): void {
    safeSetItem(ANALYTICS_CONSENT_KEY, value);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: value }));
    }
}

/**
 * Remove every analytics identifier kept on the device: the Google Analytics
 * cookies, the Firebase installation databases, and keys written by older
 * app versions. Local only — makes no network request.
 */
export function clearAnalyticsIdentifiers(): void {
    try {
        const host = location.hostname;
        const domains = new Set<string>(['', host, `.${host}`]);
        const parts = host.split('.');
        for (let i = 1; i < parts.length - 1; i++) domains.add(`.${parts.slice(i).join('.')}`);
        for (const pair of document.cookie.split(';')) {
            const name = pair.split('=')[0].trim();
            if (!name.startsWith('_ga')) continue;
            for (const d of domains) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`;
            }
        }
    } catch { /* cookies unavailable */ }
    try {
        indexedDB.deleteDatabase('firebase-installations-database');
        indexedDB.deleteDatabase('firebase-heartbeat-database');
    } catch { /* IndexedDB unavailable */ }
    try {
        localStorage.removeItem('fincalix_analytics_queue'); // builds up to 21
        localStorage.removeItem('fincalix_anon_id');         // builds up to 21 (crash reporting ID)
    } catch { /* storage unavailable */ }
}
