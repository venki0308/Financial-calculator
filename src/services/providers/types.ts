/**
 * The complete list of analytics events the app can send, and — per event —
 * the only parameters that event may carry, with the shape each value must
 * have. Anything else is dropped before it leaves the app (see
 * AnalyticsService). No event carries an amount, an input, a result or
 * user-typed text.
 */
export enum AnalyticsEvent {
    PAGE_VIEW = 'page_view',
    CALCULATOR_CALCULATED = 'calculator_calculated',
    REPORT_EXPORTED = 'report_exported',
    SCHEME_VIEWED = 'scheme_viewed',
    LANGUAGE_CHANGED = 'language_changed',
    /** Website (fincalix.com): a Google Play badge was tapped. */
    PLAY_BADGE_CLICK = 'play_badge_click',
}

/** Where on the website the Google Play badge sits. */
const PLACEMENT = /^(header|hero|mini_calc|final_cta)$/;

/** App-defined identifiers only: lower-case letters, digits and dashes. */
const ID = /^[a-z0-9-]{1,40}$/;
/** App language code. */
const LANG = /^(en|hi|te|ta|kn|ml)$/;

/** Event name → { parameter name → allowed value shape }. */
export const EVENT_PARAMS: Readonly<Record<AnalyticsEvent, Readonly<Record<string, RegExp>>>> = {
    // Screen name from the app's own list (e.g. "SIP Calculator") and the
    // page address with record IDs replaced by ":id".
    [AnalyticsEvent.PAGE_VIEW]: {
        page_title: /^[A-Za-z0-9 &()'./-]{1,60}$/,
        page_location: /^https?:\/\/[A-Za-z0-9.:-]+\/[A-Za-z0-9/:_-]{0,100}$/,
    },
    [AnalyticsEvent.CALCULATOR_CALCULATED]: { calculator_id: ID, language: LANG },
    [AnalyticsEvent.REPORT_EXPORTED]: { calculator_id: ID, export_format: /^(pdf|excel|csv)$/, language: LANG },
    [AnalyticsEvent.SCHEME_VIEWED]: { scheme_type: /^(central|state)$/ },
    [AnalyticsEvent.LANGUAGE_CHANGED]: { language: LANG },
    [AnalyticsEvent.PLAY_BADGE_CLICK]: { placement: PLACEMENT },
};

export interface EventParams {
    [key: string]: string | number | boolean | undefined;
}

/** Page details applied to every event the provider sends after this call. */
export interface PageContext {
    page_title: string;
    page_location: string;
}

/** Core interface that every analytics provider implements. */
export interface AnalyticsProvider {
    /** Load and start the provider. Not called while analytics are switched off. */
    initialize(): Promise<void>;
    /** Send one event. */
    logEvent(eventName: string, params?: EventParams): void;
    /** Set the current screen for all following events (including automatic ones). */
    setPage(page: PageContext): void;
    /** Stop collecting and delete the identifiers held by the provider. */
    disable(): Promise<void>;
}
