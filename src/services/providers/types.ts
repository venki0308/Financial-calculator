/**
 * The complete list of analytics events the app can send, and the only
 * parameters they may carry. Anything else is dropped before it leaves the
 * app (see AnalyticsService). No event carries an amount or user-typed text.
 */
export enum AnalyticsEvent {
    PAGE_VIEW = 'page_view',
    SCREEN_VIEW = 'screen_view',
    CALCULATION_EVENT = 'calculation_event',
    EXPORT_EVENT = 'export_event',
    SCHEME_VIEWED = 'scheme_viewed',
    LANGUAGE_CHANGED = 'language_changed',
}

/** Parameter name → maximum length. All values are app-defined strings. */
export const ALLOWED_EVENT_PARAMS: Readonly<Record<string, number>> = {
    screen_name: 60,      // e.g. "EMI Calculator"
    page_path: 80,        // e.g. "/calculator/loan-emi"
    page_title: 60,       // same value as screen_name
    calculator_type: 40,  // e.g. "Scientific"
    scheme_type: 20,      // "central" | "state"
    language: 5,          // e.g. "hi"
    export_type: 10,      // "PDF" | "EXCEL"
    feature: 40,          // e.g. "overdraft_calculator"
    platform: 10,         // "android" | "web"
};

export interface EventParams {
    [key: string]: string | number | boolean | undefined;
}

export interface ScreenViewParams extends EventParams {
    screen_name: string;
}

export interface CalculationEventParams extends EventParams {
    calculator_type: string;
}

export interface ExportEventParams extends EventParams {
    export_type: 'PDF' | 'EXCEL';
    feature: string;
}

/** Core interface that every analytics provider implements. */
export interface AnalyticsProvider {
    /** Load and start the provider. Not called while analytics are switched off. */
    initialize(): Promise<void>;
    /** Send one event. */
    logEvent(eventName: string, params?: EventParams): void;
    /** Stop collecting and delete the identifiers held by the provider. */
    disable(): Promise<void>;
}
