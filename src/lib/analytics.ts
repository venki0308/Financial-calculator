/**
 * FinCalix Analytics + Crashlytics Service
 * - Firebase GA4: track user behaviour (no personal data ever)
 * - Firebase Crashlytics: automatic crash & error reporting
 */
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';

/** Helper: bucket a rupee amount for privacy */
function getAmountRange(amount: number): string {
    if (amount < 1_000) return '0-1k';
    if (amount < 5_000) return '1k-5k';
    if (amount < 10_000) return '5k-10k';
    if (amount < 50_000) return '10k-50k';
    if (amount < 1_00_000) return '50k-1L';
    if (amount < 10_00_000) return '1L-10L';
    return '10L+';
}

const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'
const isNative = Capacitor.isNativePlatform();

// ─────────────────────────────────────────────────────────
//  CRASHLYTICS SERVICE
// ─────────────────────────────────────────────────────────
export const CrashlyticsService = {
    /** Initialize Crashlytics to run in the background unconditionally */
    async initialize() {
        if (!isNative) return;
        try {
            await FirebaseCrashlytics.setEnabled({ enabled: true });
            console.log(`[FinCalix] Crashlytics enabled in background`);
        } catch (error) {
            console.warn('[FinCalix] Crashlytics init failed:', error);
        }

        // Assign an anonymous, per-install session ID — purely for crash correlation.
        // No PII: just a random hex string. Format: uid-{16 hex chars}
        try {
            let anonId = localStorage.getItem('fincalix_anon_id');
            if (!anonId) {
                const arr = new Uint8Array(8);
                crypto.getRandomValues(arr);
                anonId = 'uid-' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
                localStorage.setItem('fincalix_anon_id', anonId);
            }
            await FirebaseCrashlytics.setUserId({ userId: anonId });
            console.log(`[FinCalix] Crashlytics anonymous ID set: ${anonId}`);
        } catch (error) {
            console.warn('[FinCalix] Crashlytics setUserId failed:', error);
        }
    },

    /**
     * Record a non-fatal error to Crashlytics.
     * Safe no-op on web.
     */
    async logError(error: Error, context?: string) {
        if (!isNative) {
            // Still log to console on web so devs can see errors
            console.error('[FinCalix][Error]', context ?? '', error);
            return;
        }
        try {
            // Parse stack trace string into StackFrame[] objects
            const stackFrames = (error.stack ?? '')
                .split('\n')
                .slice(1)
                .map((line) => {
                    const match = line.trim().match(/at (.+?) \((.+?):(\d+):\d+\)/);
                    if (match) {
                        return {
                            functionName: match[1],
                            fileName: match[2],
                            lineNumber: parseInt(match[3], 10),
                        };
                    }
                    return { functionName: line.trim() };
                });

            await FirebaseCrashlytics.recordException({
                message: `${context ? `[${context}] ` : ''}${error.message}`,
                stacktrace: stackFrames,
            });
            if (context) {
                await FirebaseCrashlytics.log({ message: `Context: ${context}` });
            }
        } catch (e) {
            console.warn('[FinCalix] Crashlytics.logError failed:', e);
        }
    },

    /** Log a breadcrumb message */
    async log(message: string) {
        if (!isNative) return;
        try {
            await FirebaseCrashlytics.log({ message });
        } catch { /* silent */ }
    },

    /** Attach a user ID to crash reports (no PII — use anonymous ID) */
    async setUserId(userId: string) {
        if (!isNative) return;
        try {
            await FirebaseCrashlytics.setUserId({ userId });
        } catch { /* silent */ }
    },

    /** Attach extra context key-value to crash reports */
    async setCustomKey(key: string, value: string) {
        if (!isNative) return;
        try {
            await FirebaseCrashlytics.setCustomKey({ key, value, type: 'string' });
        } catch { /* silent */ }
    },

    /** Trigger a fatal crash for testing (native only) */
    async crash() {
        if (!isNative) {
            console.error('[FinCalix] Crash attempted on non-native platform');
            return;
        }
        await FirebaseCrashlytics.crash({ message: 'Test Crash from FinCalix' });
    },
};

// ─────────────────────────────────────────────────────────
//  ANALYTICS ALIAS (for backward compatibility)
// ─────────────────────────────────────────────────────────
import { AnalyticsService as CoreAnalyticsService } from '../services/analyticsService';

export const AnalyticsService = {
    /** Call on every page mount */
    async trackScreen(screenName: string) {
        CoreAnalyticsService.trackScreenView({ screen_name: screenName, platform });
    },

    /** Call when user taps Calculate */
    async trackCalculatorUsed(
        calculatorType: string,
        extras: Record<string, string | number> = {}
    ) {
        CoreAnalyticsService.trackCalculation({
            calculator_type: calculatorType,
            platform,
            ...extras
        });
    },

    /** Call when calculation is saved */
    async trackCalculationSaved(calculatorType: string) {
        CoreAnalyticsService.trackEvent('calculation_saved', { calculator_type: calculatorType, platform });
    },

    /** Call when a government scheme page is opened */
    async trackSchemeViewed(schemeName: string, schemeType: string) {
        CoreAnalyticsService.trackEvent('scheme_viewed', {
            scheme_name: schemeName,
            scheme_type: schemeType,
            platform,
        });
    },

    /** Call when an expense entry is created */
    async trackExpenseAdded(category: string, amount: number) {
        CoreAnalyticsService.trackEvent('expense_added', {
            category,
            amount_range: getAmountRange(amount),
            platform,
        });
    },

    /** Call when budget is set */
    async trackBudgetSet(monthlyIncome: number) {
        CoreAnalyticsService.trackEvent('budget_set', {
            income_range: getAmountRange(monthlyIncome),
            platform,
        });
    },

    /** Call on language change in Settings */
    async trackLanguageChanged(language: string) {
        CoreAnalyticsService.trackEvent('language_changed', { language, platform });
        // Setting user property logic would fall here if we add it to the wrapper
        // Currently skipping user prop explicitly since generic Analytics is anonymous
    },

    /** Call on PDF/Excel download */
    async trackFileDownload(fileType: 'pdf' | 'excel', contentType: string) {
        CoreAnalyticsService.trackExport({ export_type: fileType.toUpperCase() as any, feature: contentType, platform });
    },

    /** Call when app comes to foreground */
    async trackAppOpened() {
        CoreAnalyticsService.trackScreenView({ screen_name: 'App_Open', platform });
    },

    /** Set persistent user properties */
    async setUserProperties(props: Record<string, string>) {
        // Fallback since the wrapper doesn't expose it yet. 
        // Best practice for anonymous analytics is to not need this much, but we could add it back to the Provider interface.
        console.log('[Analytics Alias] user properties set:', props);
    },

    // Expose helper for external use
    getAmountRange,
};
