import { AnalyticsProvider, EventParams } from './types';

// Firebase is loaded LAZILY: the heavy `firebase/app` and `firebase/analytics`
// modules (~700 KB combined) are only fetched when the first analytics event
// fires, not on app boot. This keeps the initial bundle small.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalyticsInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogEventFn = (a: AnalyticsInstance, name: string, params?: any) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SetUserIdFn = (a: AnalyticsInstance, id: string) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SetUserPropsFn = (a: AnalyticsInstance, props: any) => void;

export class FirebaseProvider implements AnalyticsProvider {
    private analytics: AnalyticsInstance | null = null;
    private initialized = false;
    private logEventFn: LogEventFn | null = null;
    private setUserIdFn: SetUserIdFn | null = null;
    private setUserPropertiesFn: SetUserPropsFn | null = null;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Dynamic imports — Firebase chunks are fetched here, not at boot
            const [firebaseApp, firebaseAnalytics] = await Promise.all([
                import('firebase/app'),
                import('firebase/analytics'),
            ]);

            const firebaseConfig = {
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                appId: import.meta.env.VITE_FIREBASE_APP_ID,
                measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
            };
            const app = firebaseApp.getApps().length === 0
                ? firebaseApp.initializeApp(firebaseConfig)
                : firebaseApp.getApps()[0];

            this.analytics = firebaseAnalytics.getAnalytics(app);
            this.logEventFn = firebaseAnalytics.logEvent;
            this.setUserIdFn = firebaseAnalytics.setUserId;
            this.setUserPropertiesFn = firebaseAnalytics.setUserProperties;
            this.initialized = true;
            console.log('[FirebaseProvider] Initialized (lazy)');
        } catch (error) {
            console.error('[FirebaseProvider] Failed to initialize', error);
        }
    }

    logEvent(eventName: string, params?: EventParams): void {
        if (!this.initialized || !this.analytics || !this.logEventFn) {
            console.warn(`[FirebaseProvider] Cannot log event ${eventName}: not initialized`);
            return;
        }
        try {
            this.logEventFn(this.analytics, eventName, params);
            if (import.meta.env.DEV) {
                console.log(`[FirebaseProvider] Event: ${eventName}`, params);
            }
        } catch (error) {
            console.error(`[FirebaseProvider] Failed to log event ${eventName}`, error);
        }
    }

    setUserId(userId: string): void {
        if (!this.initialized || !this.analytics || !this.setUserIdFn) return;
        try {
            this.setUserIdFn(this.analytics, userId);
        } catch (error) {
            console.error('[FirebaseProvider] Failed to set user ID', error);
        }
    }

    setUserProperty(name: string, value: string): void {
        if (!this.initialized || !this.analytics || !this.setUserPropertiesFn) return;
        try {
            this.setUserPropertiesFn(this.analytics, { [name]: value });
        } catch (error) {
            console.error(`[FirebaseProvider] Failed to set property ${name}`, error);
        }
    }
}
