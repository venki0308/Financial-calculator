import { CrashlyticsService } from '../lib/analytics';

/**
 * Sets up global window-level error handlers.
 * Catches all unhandled JS errors and promise rejections,
 * then forwards them to Firebase Crashlytics.
 */
export function setupErrorHandling() {
 // Unhandled promise rejections (async/await failures, storage errors, etc.)
 window.addEventListener('unhandledrejection', (event) => {
 const reason = event.reason;
 const error = reason instanceof Error
 ? reason
 : new Error(String(reason ?? 'Unhandled promise rejection'));

 console.error('[FinCalix] Unhandled promise rejection:', error);
 CrashlyticsService.logError(error, 'Unhandled Promise Rejection');
 });

 // Synchronous JS errors
 window.addEventListener('error', (event) => {
 const error = event.error instanceof Error
 ? event.error
 : new Error(event.message ?? 'Unknown JS error');

 console.error('[FinCalix] Uncaught error:', error);
 CrashlyticsService.logError(
 error,
 `JS Error @ ${event.filename ?? 'unknown'}:${event.lineno ?? 0}`
 );
 });

 console.log('[FinCalix] Global error handlers registered');
}
