import { ALLOWED_EVENT_PARAMS, AnalyticsEvent, AnalyticsProvider, EventParams, ScreenViewParams, CalculationEventParams, ExportEventParams } from './providers/types';
import { FirebaseProvider } from './providers/firebaseProvider';
import { clearAnalyticsIdentifiers, hasAnalyticsConsent, storeAnalyticsConsent } from '../utils/analyticsConsent';

/**
 * Usage analytics — on by default, with an off switch in Settings → Privacy.
 *
 *  - While the user has switched analytics off, nothing is loaded from the
 *    analytics provider, no request is made and events are dropped.
 *  - Only the events in `AnalyticsEvent` are sent, and only with the parameters
 *    in `ALLOWED_EVENT_PARAMS`. No amount and no user-typed text ever leaves
 *    the device through this service.
 *  - Switching analytics off stops collection at once and deletes the
 *    analytics identifiers from the device.
 */

const EVENT_NAMES = new Set<string>(Object.values(AnalyticsEvent));
const MAX_PENDING = 50;

class AnalyticsWrapper {
    // To change providers, instantiate the new provider here.
    private provider: AnalyticsProvider = new FirebaseProvider();
    private ready = false;
    private starting: Promise<void> | null = null;
    /** Events fired after consent but before the provider finished loading. In memory only. */
    private pending: Array<{ eventName: string; params?: EventParams }> = [];

    // Prevents rapid duplicates (e.g. React strict-mode double mounts)
    private lastEventLogged: Record<string, number> = {};
    private readonly DEDUPE_MS = 1000;

    /** Called once at app start. Starts analytics unless the user switched them off. */
    async initialize(): Promise<void> {
        if (!hasAnalyticsConsent()) {
            // Switched off: make sure no analytics identifier is left on the
            // device. Local only.
            clearAnalyticsIdentifiers();
            return;
        }
        await this.start();
    }

    /** Record the choice of the user and apply it immediately. */
    async setConsent(granted: boolean): Promise<void> {
        storeAnalyticsConsent(granted ? 'granted' : 'denied');
        if (granted) {
            await this.start();
            return;
        }
        this.ready = false;
        this.starting = null;
        this.pending = [];
        try {
            await this.provider.disable();
        } finally {
            clearAnalyticsIdentifiers();
        }
    }

    private start(): Promise<void> {
        if (this.ready) return Promise.resolve();
        if (!this.starting) {
            this.starting = this.provider.initialize()
                .then(() => {
                    if (!hasAnalyticsConsent()) return; // withdrawn while loading
                    this.ready = true;
                    const queued = this.pending;
                    this.pending = [];
                    queued.forEach(e => this.provider.logEvent(e.eventName, e.params));
                })
                .catch((error) => {
                    console.error('[AnalyticsService] Provider initialization failed', error);
                })
                .finally(() => { this.starting = null; });
        }
        return this.starting;
    }

    public trackEvent(eventName: string, params?: EventParams): void {
        try {
            if (!hasAnalyticsConsent()) return;        // off → drop, never queue
            if (!EVENT_NAMES.has(eventName)) return;   // not on the published list

            const sanitized = this.sanitizeParams(params);
            const now = Date.now();
            const dedupeKey = `${eventName}_${JSON.stringify(sanitized || {})}`;
            if (this.lastEventLogged[dedupeKey] && now - this.lastEventLogged[dedupeKey] < this.DEDUPE_MS) return;
            this.lastEventLogged[dedupeKey] = now;

            if (this.ready) {
                this.provider.logEvent(eventName, sanitized);
            } else if (this.pending.length < MAX_PENDING) {
                this.pending.push({ eventName, params: sanitized });
            }
        } catch (error) {
            // Tracking must never break the app
            console.warn('[AnalyticsService] Dropped event due to error:', error);
        }
    }

    /**
     * Allow-list: only the published parameter names pass, only as short
     * strings. Numbers, booleans and unknown keys are dropped, so an amount
     * cannot leave the device even if a call site passes one by mistake.
     */
    private sanitizeParams(params?: EventParams): EventParams | undefined {
        if (!params) return undefined;
        const sanitized: EventParams = {};
        for (const [key, value] of Object.entries(params)) {
            const maxLength = ALLOWED_EVENT_PARAMS[key];
            if (!maxLength || typeof value !== 'string' || !value) continue;
            sanitized[key] = value.slice(0, maxLength);
        }
        return sanitized;
    }

    trackScreenView(params: ScreenViewParams): void {
        this.trackEvent(AnalyticsEvent.SCREEN_VIEW, params);
    }

    trackCalculation(params: CalculationEventParams): void {
        this.trackEvent(AnalyticsEvent.CALCULATION_EVENT, params);
    }

    trackExport(params: ExportEventParams): void {
        this.trackEvent(AnalyticsEvent.EXPORT_EVENT, params);
    }
}

export const AnalyticsService = new AnalyticsWrapper();
