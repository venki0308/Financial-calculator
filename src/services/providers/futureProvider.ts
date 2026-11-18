import { AnalyticsProvider, EventParams, PageContext } from './types';

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

    setPage(_page: PageContext): void {
        // e.g. mixpanel.register({ page: _page.page_title })
    }
}
