import { getAnalytics, logEvent, setUserId, setUserProperties, Analytics } from 'firebase/analytics';
import { app } from '../../config/firebase';
import { AnalyticsProvider, EventParams } from './types';

export class FirebaseProvider implements AnalyticsProvider {
    private analytics: Analytics | null = null;
    private initialized = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;
        
        try {
            // Firebase initialized in config, just get the instance safely
            this.analytics = getAnalytics(app);
            this.initialized = true;
            console.log('[FirebaseProvider] Initialized successfully');
        } catch (error) {
            console.error('[FirebaseProvider] Failed to initialize', error);
        }
    }

    logEvent(eventName: string, params?: EventParams): void {
        if (!this.initialized || !this.analytics) {
            console.warn(`[FirebaseProvider] Cannot log event ${eventName}: not initialized`);
            return;
        }

        try {
            logEvent(this.analytics, eventName, params);
            if (import.meta.env.DEV) {
                console.log(`[FirebaseProvider] Event: ${eventName}`, params);
            }
        } catch (error) {
            console.error(`[FirebaseProvider] Failed to log event ${eventName}`, error);
        }
    }

    setUserId(userId: string): void {
        if (!this.initialized || !this.analytics) return;
        try {
            setUserId(this.analytics, userId);
        } catch (error) {
            console.error('[FirebaseProvider] Failed to set user ID', error);
        }
    }

    setUserProperty(name: string, value: string): void {
        if (!this.initialized || !this.analytics) return;
        try {
            setUserProperties(this.analytics, { [name]: value });
        } catch (error) {
            console.error(`[FirebaseProvider] Failed to set property ${name}`, error);
        }
    }
}
