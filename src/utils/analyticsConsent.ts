/**
 * Usage analytics storage keys.
 *
 * Analytics (Google Analytics) run for every user. There is no popup and no
 * switch in the app. Test builds 22 before 18 Nov 2026 had a Settings switch;
 * a tester who turned it off has "denied" stored under ANALYTICS_CONSENT_KEY,
 * and that choice is still honoured silently (nothing is loaded or sent).
 * No public build ever wrote that value.
 */

export const ANALYTICS_CONSENT_KEY = 'fincalix_analytics_consent';
/** Events waiting to be sent while offline (see services/analyticsService). */
export const ANALYTICS_QUEUE_KEY = 'fincalix_analytics_queue';
/** Set to "1" by automated checks: their events are flagged as test traffic. */
export const ANALYTICS_TEST_TRAFFIC_KEY = 'fincalix_analytics_test_traffic';

/** Current disclaimer acceptance key (see GlobalDisclaimerModal). */
export const DISCLAIMER_KEY = 'fincalix_disclaimer_accepted_v4';

/** False only for a test device that switched analytics off in an earlier test build. */
export function hasAnalyticsConsent(): boolean {
    try {
        return localStorage.getItem(ANALYTICS_CONSENT_KEY) !== 'denied';
    } catch {
        return true; // storage unavailable: nothing stored, so the default (on) applies
    }
}
