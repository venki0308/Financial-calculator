import { AnalyticsProvider, EventParams } from './types';

/**
 * A stub provider showing how easily FinCalix can swap to a new backend 
 * (e.g., Mixpanel, Amplitude, or a custom API) in the future.
 */
export class FutureProvider implements AnalyticsProvider {
    private initialized = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;
        
        try {
            // e.g., mixpanel.init('YOUR_TOKEN')
            this.initialized = true;
            console.log('[FutureProvider] Initialized successfully');
        } catch (error) {
            console.error('[FutureProvider] Failed to initialize', error);
        }
    }

    logEvent(eventName: string, params?: EventParams): void {
        if (!this.initialized) return;

        try {
            // e.g., mixpanel.track(eventName, params)
            console.log(`[FutureProvider] Tracked Event: ${eventName}`, params);
        } catch (error) {
            console.error(`[FutureProvider] Failed to track ${eventName}`, error);
        }
    }

    setUserId(userId: string): void {
        if (!this.initialized) return;
        // e.g., mixpanel.identify(userId)
        console.log(`[FutureProvider] Set User ID: ${userId}`);
    }

    setUserProperty(name: string, value: string): void {
        if (!this.initialized) return;
        // e.g., mixpanel.people.set(name, value)
        console.log(`[FutureProvider] Set Property ${name}: ${value}`);
    }
}
