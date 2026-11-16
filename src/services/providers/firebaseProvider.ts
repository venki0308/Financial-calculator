import { AnalyticsProvider, EventParams } from './types';

// Firebase is loaded LAZILY and ONLY after the user has opted in to usage
// analytics: `initialize()` is the first point at which any Google code is
// fetched, any request is made or any identifier is created.

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
                },
            });
            this.mod = firebaseAnalytics;
            this.active = true;
        } catch (error) {
            console.error('[FirebaseProvider] Failed to initialize', error);
        }
    }

    logEvent(eventName: string, params?: EventParams): void {
        if (!this.active || !this.analytics || !this.mod) return;
        try {
            this.mod.logEvent(this.analytics, eventName, params);
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
