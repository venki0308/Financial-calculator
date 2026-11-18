import { safeSetItem } from '../utils/safeStorage';
import { AnalyticsEvent, AnalyticsProvider, EVENT_PARAMS, EventParams, PageContext } from './providers/types';
import { FirebaseProvider } from './providers/firebaseProvider';
import { ANALYTICS_QUEUE_KEY, hasAnalyticsConsent } from '../utils/analyticsConsent';

/**
 * Usage analytics (Google Analytics) — on for every user, started at app
 * launch. There is no switch in the app.
 *
 *  - Only the events in `AnalyticsEvent` are sent, each only with its own
 *    parameters from `EVENT_PARAMS`, and only when the value has the expected
 *    shape. No amount, input, result or user-typed text can leave the device.
 *  - Events raised while offline (or while the provider is still loading) are
 *    kept in a small local queue — at most 200 events, none older than 7
 *    days — and sent once the app is online.
 *  - A test device that switched analytics off in an earlier test build
 *    (stored "denied", see utils/analyticsConsent) loads nothing, sends
 *    nothing and queues nothing.
 */

const EVENT_NAMES = new Set<string>(Object.values(AnalyticsEvent));
const QUEUE_MAX = 200;
const QUEUE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface QueuedEvent { e: string; p?: EventParams; t: number }

const online = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

class AnalyticsWrapper {
    // To change providers, instantiate the new provider here.
    private provider: AnalyticsProvider = new FirebaseProvider();
    private ready = false;
    private starting: Promise<void> | null = null;
    private page: PageContext | null = null;

    // Prevents rapid duplicates (e.g. React strict-mode double mounts)
    private lastEventLogged: Record<string, number> = {};
    private readonly DEDUPE_MS = 1000;

    constructor() {
        if (typeof window !== 'undefined') window.addEventListener('online', () => this.flush());
    }

    /** Called once at app start. */
    async initialize(): Promise<void> {
        if (!hasAnalyticsConsent()) return; // test device switched off in an earlier test build
        await this.start();
    }

    private start(): Promise<void> {
        if (this.ready) return Promise.resolve();
        if (!this.starting) {
            this.starting = this.provider.initialize()
                .then(() => {
                    this.ready = true;
                    if (this.page) this.provider.setPage(this.page);
                    this.flush();
                })
                .catch((error) => {
                    console.error('[AnalyticsService] Provider initialization failed', error);
                })
                .finally(() => { this.starting = null; });
        }
        return this.starting;
    }

    /**
     * Record a screen visit: one `page_view` with the screen's canonical name.
     * The same name and address are applied to every following event,
     * including the ones the provider records on its own.
     */
    trackPage(page: PageContext): void {
        if (!hasAnalyticsConsent()) return;
        this.page = page;
        if (this.ready) this.provider.setPage(page);
        this.trackEvent(AnalyticsEvent.PAGE_VIEW, { ...page });
    }

    public trackEvent(eventName: string, params?: EventParams): void {
        try {
            if (!hasAnalyticsConsent()) return;        // switched-off test device → drop, never queue
            if (!EVENT_NAMES.has(eventName)) return;   // not on the published list

            const sanitized = sanitizeParams(eventName, params);
            const now = Date.now();
            const dedupeKey = `${eventName}_${JSON.stringify(sanitized || {})}`;
            if (this.lastEventLogged[dedupeKey] && now - this.lastEventLogged[dedupeKey] < this.DEDUPE_MS) return;
            this.lastEventLogged[dedupeKey] = now;

            if (this.ready && online()) {
                this.provider.logEvent(eventName, sanitized);
            } else {
                enqueue({ e: eventName, p: sanitized, t: now });
            }
        } catch (error) {
            // Tracking must never break the app
            console.warn('[AnalyticsService] Dropped event due to error:', error);
        }
    }

    /** Send queued events (oldest first) once the provider is ready and online. */
    private flush(): void {
        if (!this.ready || !online() || !hasAnalyticsConsent()) return;
        const queued = readQueue();
        // Clear what was stored even when nothing in it is sendable (expired
        // items, or events from older builds that are no longer on the list).
        writeQueue([]);
        if (!queued.length) return;
        for (const item of queued) {
            const params = sanitizeParams(item.e, item.p);
            try { this.provider.logEvent(item.e, params); } catch { /* drop */ }
        }
    }
}

/**
 * Per-event allow-list: only that event's own parameter names pass, only as
 * strings of the expected shape. Numbers, booleans, unknown keys and values
 * that do not match are dropped, so an amount or typed text cannot leave the
 * device even if a call site passes one by mistake.
 */
export function sanitizeParams(eventName: string, params?: EventParams): EventParams | undefined {
    if (!params) return undefined;
    const allowed = EVENT_PARAMS[eventName as AnalyticsEvent];
    if (!allowed) return undefined;
    const out: EventParams = {};
    for (const [key, value] of Object.entries(params)) {
        const shape = allowed[key];
        if (shape && typeof value === 'string' && shape.test(value)) out[key] = value;
    }
    return out;
}

function readQueue(): QueuedEvent[] {
    try {
        const raw = JSON.parse(localStorage.getItem(ANALYTICS_QUEUE_KEY) || '[]');
        if (!Array.isArray(raw)) return [];
        const cutoff = Date.now() - QUEUE_MAX_AGE_MS;
        return raw
            // builds up to 22 stored { eventName, params, timestamp }
            .map((x: Record<string, unknown>) => ({
                e: String(x.e ?? x.eventName ?? ''),
                p: (x.p ?? x.params) as EventParams | undefined,
                t: Number(x.t ?? x.timestamp ?? 0),
            }))
            .filter((x: QueuedEvent) => EVENT_NAMES.has(x.e) && x.t >= cutoff)
            .slice(-QUEUE_MAX);
    } catch {
        return [];
    }
}

function writeQueue(items: QueuedEvent[]): void {
    try {
        if (items.length) safeSetItem(ANALYTICS_QUEUE_KEY, JSON.stringify(items));
        else localStorage.removeItem(ANALYTICS_QUEUE_KEY);
    } catch { /* storage unavailable */ }
}

function enqueue(item: QueuedEvent): void {
    if (!hasAnalyticsConsent()) return;
    writeQueue([...readQueue(), item].slice(-QUEUE_MAX));
}

export const AnalyticsService = new AnalyticsWrapper();
