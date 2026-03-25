/**
 * Standardized Event Names
 */
export enum AnalyticsEvent {
    SCREEN_VIEW = 'SCREEN_VIEW',
    FEATURE_USAGE_TIME = 'FEATURE_USAGE_TIME',
    CALCULATION_EVENT = 'CALCULATION_EVENT',
    EXPORT_EVENT = 'EXPORT_EVENT',
    ERROR_EVENT = 'ERROR_EVENT',
}

/**
 * Standardized Parameters
 */
export interface EventParams {
    [key: string]: string | number | boolean | undefined;
}

export interface ScreenViewParams extends EventParams {
    screen_name: string;
}

export interface FeatureUsageTimeParams extends EventParams {
    screen_name: string;
    duration_seconds: number;
}

export interface CalculationEventParams extends EventParams {
    calculator_type: string;
}

export interface ExportEventParams extends EventParams {
    export_type: 'PDF' | 'EXCEL' | 'IMAGE';
    feature: string;
}

export interface ErrorEventParams extends EventParams {
    error_type: string;
    error_message: string;
    context?: string;
}

/**
 * Core interface that all Analytics Providers must implement
 */
export interface AnalyticsProvider {
    /**
     * Initialize the provider
     */
    initialize(): Promise<void>;

    /**
     * Log a standardized event
     */
    logEvent(eventName: string, params?: EventParams): void;

    /**
     * Set user ID (optional, often kept generic or anonymous)
     */
    setUserId?(userId: string): void;

    /**
     * Set a user property
     */
    setUserProperty?(name: string, value: string): void;
}
