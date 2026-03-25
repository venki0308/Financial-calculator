import { AnalyticsEvent, AnalyticsProvider, EventParams, ScreenViewParams, FeatureUsageTimeParams, CalculationEventParams, ExportEventParams, ErrorEventParams } from './providers/types';
import { FirebaseProvider } from './providers/firebaseProvider';

// Queue interface for offline support
interface QueuedEvent {
    eventName: string;
    params?: EventParams;
    timestamp: number;
}

class AnalyticsWrapper {
    private provider: AnalyticsProvider;
    private initialized = false;
    private offlineQueue: QueuedEvent[] = [];
    private isOnline = navigator.onLine;

    // To prevent rapid duplicate tracking (e.g., React strict mode mounts)
    private lastEventLogged: Record<string, number> = {};
    private readonly DEDUPE_MS = 1000;

    constructor() {
        // --- SWITCH MECHANISM ---
        // To change providers, simply instantiate the new provider here.
        // E.g., this.provider = new FutureProvider();
        this.provider = new FirebaseProvider();

        // Listen for connection changes
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', () => { this.isOnline = false; });
        
        // Load pending queue from storage
        this.loadQueue();
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            await this.provider.initialize();
            this.initialized = true;

            // Flush queue if came online
            if (this.isOnline) {
                this.flushQueue();
            }
        } catch (error) {
            console.error('[AnalyticsService] Provider initialization failed', error);
        }
    }

    /**
     * Core event tracking logic with Data Minimization and Failsafes
     */
    public trackEvent(eventName: string, params?: EventParams): void {
        const now = Date.now();
        const dedupeKey = `${eventName}_${JSON.stringify(params || {})}`;

        // Deduplication
        if (this.lastEventLogged[dedupeKey] && (now - this.lastEventLogged[dedupeKey] < this.DEDUPE_MS)) {
            return;
        }

        try {
            // Sanitize params: ensure strictly safe keys
            const sanitizedParams = this.sanitizeParams(params);

            if (!this.isOnline) {
                this.queueLocally(eventName, sanitizedParams);
                return;
            }

            if (this.initialized) {
                this.provider.logEvent(eventName, sanitizedParams);
                this.lastEventLogged[dedupeKey] = now;
            } else {
                // If asked to track before provider is fully hot, queue it
                this.queueLocally(eventName, sanitizedParams);
            }
        } catch (error) {
            // FAILSAFE: Ensure tracking never crashes the app
            console.warn('[AnalyticsService] Dropped event due to error:', error);
        }
    }

    /**
     * Data minimization: Block strictly personal data keys if they accidently leak here.
     * Allow only predefined event schema keys.
     */
    private sanitizeParams(params?: EventParams): EventParams | undefined {
        if (!params) return undefined;

        const blockedKeys = ['amount', 'salary', 'balance', 'name', 'phone', 'email', 'pan', 'aadhar', 'investment'];
        const sanitized: EventParams = {};

        for (const [key, value] of Object.entries(params)) {
             // ❌ Strip personal financial keywords if a dev accidentally passes them
             const isBlocked = blockedKeys.some(blk => key.toLowerCase().includes(blk));
             
             if (!isBlocked && value !== undefined && value !== null) {
                 sanitized[key] = value;
             }
        }
        return sanitized;
    }


    /* --- STANDARDIZED PUBLIC METHODS --- */

    trackScreenView(params: ScreenViewParams): void {
        this.trackEvent(AnalyticsEvent.SCREEN_VIEW, params);
    }

    trackFeatureUsageTime(params: FeatureUsageTimeParams): void {
        // Only track if time spent is meaningful (e.g. > 1 second)
        if (params.duration_seconds > 1) {
             this.trackEvent(AnalyticsEvent.FEATURE_USAGE_TIME, params);
        }
    }

    trackCalculation(params: CalculationEventParams): void {
        this.trackEvent(AnalyticsEvent.CALCULATION_EVENT, params);
    }

    trackExport(params: ExportEventParams): void {
        this.trackEvent(AnalyticsEvent.EXPORT_EVENT, params);
    }

    trackError(params: ErrorEventParams): void {
        this.trackEvent(AnalyticsEvent.ERROR_EVENT, params);
    }

    /* --- OFFLINE QUEUE LOGIC --- */

    private queueLocally(eventName: string, params?: EventParams) {
        this.offlineQueue.push({ eventName, params, timestamp: Date.now() });
        this.saveQueue();
    }

    private handleOnline() {
        this.isOnline = true;
        this.flushQueue();
    }

    private flushQueue() {
        if (!this.initialized || !this.isOnline || this.offlineQueue.length === 0) return;

        // Take pending items
        const pending = [...this.offlineQueue];
        this.offlineQueue = [];
        this.saveQueue();

        pending.forEach(event => {
            try {
                // Log historical event
                this.provider.logEvent(event.eventName, event.params);
            } catch (err) {
                console.warn('[AnalyticsService] Failed flushing queued event', err);
            }
        });
    }

    private saveQueue() {
        try {
            // Keep queue manageable (max 100 events)
            if (this.offlineQueue.length > 100) {
                this.offlineQueue = this.offlineQueue.slice(-100);
            }
            localStorage.setItem('fincalix_analytics_queue', JSON.stringify(this.offlineQueue));
        } catch { /* Silent fail */ }
    }

    private loadQueue() {
        try {
            const stored = localStorage.getItem('fincalix_analytics_queue');
            if (stored) {
                this.offlineQueue = JSON.parse(stored);
            }
        } catch { /* Silent fail */ }
    }
}

export const AnalyticsService = new AnalyticsWrapper();
