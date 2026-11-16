import { AnalyticsProvider, EventParams, PageContext } from './types';
import { ANALYTICS_TEST_TRAFFIC_KEY } from '../../utils/analyticsConsent';

// Firebase is loaded LAZILY, and not at all while the user has switched usage
// analytics off: `initialize()` is the first point at which any provider code
// is fetched, any request is made or any identifier is created.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalyticsModule = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FirebaseAppInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalyticsInstance = any;

const MEASUREMENT_ID: string | undefined = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;

// Analytics storage only. Advertising storage, ad user data and ad
// personalisation are denied in both states.
const CONSENT_ON = {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
} as const;

const CONSENT_OFF = {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
} as const;

/** The documented per-property kill switch for gtag.js. */
function setGaDisabled(disabled: boolean) {
    if (!MEASUREMENT_ID || typeof window === 'undefined') return;
    (window as unknown as Record<string, boolean>)[`ga-disable-${MEASUREMENT_ID}`] = disabled;
}

/**
 * Automated checks set ANALYTICS_TEST_TRAFFIC_KEY. Their events then carry
 * debug_mode and traffic_type=internal, which the analytics property's
 * "Developer traffic" and "Internal traffic" data filters exclude from reports
 * (see PLAY_DATA_SAFETY.md). Every hit in dev mode (fincalix_dev cookie, set by
 * ?dev=true) or from a *.vercel.app host is test traffic too; the Android app
 * (localhost) and fincalix.com visitors are not affected.
 */
function testTrafficParams(): Record<string, string | boolean> {
    try {
        // Dev mode (?dev=true cookie on fincalix.com) and *.vercel.app preview hosts are test traffic.
        const devHost = typeof location !== 'undefined' && (/\.vercel\.app$/.test(location.hostname)
            || /(?:^|;\s*)fincalix_dev=1(?:;|$)/.test(typeof document !== 'undefined' ? document.cookie : ''));
        return devHost || localStorage.getItem(ANALYTICS_TEST_TRAFFIC_KEY) === '1'
            ? { debug_mode: true, traffic_type: 'internal' }
            : {};
    } catch {
        return {};
    }
}

export class FirebaseProvider implements AnalyticsProvider {
    private mod: AnalyticsModule | null = null;
    private app: FirebaseAppInstance | null = null;
    private analytics: AnalyticsInstance | null = null;
    private active = false;

    async initialize(): Promise<void> {
        if (this.active) return;
        if (!MEASUREMENT_ID) return; // build without analytics config

        setGaDisabled(false);

        // Re-enabled in the same session: the SDK is already loaded.
        if (this.analytics && this.mod) {
            this.mod.setConsent(CONSENT_ON);
            this.mod.setAnalyticsCollectionEnabled(this.analytics, true);
            this.active = true;
            return;
        }

        try {
            const [firebaseApp, firebaseAnalytics] = await Promise.all([
                import('firebase/app'),
                import('firebase/analytics'),
            ]);

            firebaseAnalytics.setConsent(CONSENT_ON);

            this.app = firebaseApp.getApps().length === 0
                ? firebaseApp.initializeApp({
                    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                    appId: import.meta.env.VITE_FIREBASE_APP_ID,
                    measurementId: MEASUREMENT_ID,
                })
                : firebaseApp.getApps()[0];

            this.analytics = firebaseAnalytics.initializeAnalytics(this.app, {
                config: {
                    allow_google_signals: false,             // no cross-device / demographics
                    allow_ad_personalization_signals: false, // no ad personalisation
                    send_page_view: false,                   // the app sends its own page_view
                    ...testTrafficParams(),
                },
            });
            this.mod = firebaseAnalytics;
            this.active = true;
        } catch (error) {
            console.error('[FirebaseProvider] Failed to initialize', error);
        }
    }

    setPage(page: PageContext): void {
        if (!this.active || !this.mod) return;
        try {
            // Applied to every following event, including the ones the SDK
            // records on its own (session start, engagement time), so no
            // event reports the generic HTML title or a record ID in the URL.
            this.mod.setDefaultEventParameters({ ...page, ...testTrafficParams() });
        } catch { /* keep going without the page context */ }
    }

    logEvent(eventName: string, params?: EventParams): void {
        if (!this.active || !this.analytics || !this.mod) return;
        try {
            this.mod.logEvent(this.analytics, eventName, { ...params, ...testTrafficParams() });
        } catch (error) {
            console.error(`[FirebaseProvider] Failed to log event ${eventName}`, error);
        }
    }

    async disable(): Promise<void> {
        this.active = false;
        setGaDisabled(true);
        if (!this.mod || !this.analytics) return; // never started — nothing to stop
        try {
            this.mod.setAnalyticsCollectionEnabled(this.analytics, false);
            this.mod.setConsent(CONSENT_OFF);
        } catch { /* already stopped */ }
        // Ask Firebase to delete the ID of this install on its servers too.
        // This is a single deletion request, sent only at the moment of opting out.
        try {
            const inst = await import('firebase/installations');
            await inst.deleteInstallations(inst.getInstallations(this.app));
        } catch { /* offline or already deleted — local IDs are cleared by the caller */ }
    }
}
