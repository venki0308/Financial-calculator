/**
 * FinCalix Analytics Service
 * Uses Firebase GA4 for tracking user behaviour.
 * No personal data is ever collected.
 */
import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, logEvent, setUserProperties, isSupported } from 'firebase/analytics';
import { Capacitor } from '@capacitor/core';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialise Firebase only once
const firebaseApp =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Analytics is lazily resolved — only available in supported environments
let analyticsInstance: Awaited<ReturnType<typeof getAnalytics>> | null = null;

async function getAnalyticsInstance() {
    if (analyticsInstance) return analyticsInstance;
    try {
        const supported = await isSupported();
        if (supported) {
            analyticsInstance = getAnalytics(firebaseApp);
        }
    } catch {
        // silently swallow — analytics is best-effort
    }
    return analyticsInstance;
}

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

export const AnalyticsService = {
    /** Call on every page mount */
    async trackScreen(screenName: string) {
        const a = await getAnalyticsInstance();
        if (!a) return;
        try {
            logEvent(a, 'screen_view' as string, { screen_name: screenName, platform });
        } catch { /* silent */ }
    },

    /** Call when user taps Calculate */
    async trackCalculatorUsed(
        calculatorType: string,
        extras: Record<string, string | number> = {}
    ) {
        const a = await getAnalyticsInstance();
        if (!a) return;
        try {
            logEvent(a, 'calculator_used' as string, {
                calculator_type: calculatorType,
                platform,
                ...extras,
            });
        } catch { /* silent */ }
    },

    /** Call when calculation is saved */
    async trackCalculationSaved(calculatorType: string) {
        const a = await getAnalyticsInstance();
        if (!a) return;
        try {
            logEvent(a, 'calculation_saved' as string, { calculator_type: calculatorType, platform });
        } catch { /* silent */ }
    },

    /** Call when a government scheme page is opened */
    async trackSchemeViewed(schemeName: string, schemeType: string) {
        const a = await getAnalyticsInstance();
        if (!a) return;
        try {
            logEvent(a, 'scheme_viewed' as string, {
                scheme_name: schemeName,
                scheme_type: schemeType,
                platform,
            });
        } catch { /* silent */ }
    },

    /** Call when an expense entry is created */
    async trackExpenseAdded(category: string, amount: number) {
        const a = await getAnalyticsInstance();
        if (!a) return;
        try {
            logEvent(a, 'expense_added' as string, {
                category,
                amount_range: getAmountRange(amount),
                platform,
            });
        } catch { /* silent */ }
    },

    /** Call when budget is set */
    async trackBudgetSet(monthlyIncome: number) {
        const a = await getAnalyticsInstance();
        if (!a) return;
        try {
            logEvent(a, 'budget_set' as string, {
                income_range: getAmountRange(monthlyIncome),
                platform,
            });
        } catch { /* silent */ }
    },

    /** Call on language change in Settings */
    async trackLanguageChanged(language: string) {
        const a = await getAnalyticsInstance();
        if (!a) return;
        try {
            logEvent(a, 'language_changed' as string, { language, platform });
            setUserProperties(a, { preferred_language: language });
        } catch { /* silent */ }
    },

    /** Call on PDF/Excel download */
    async trackFileDownload(fileType: 'pdf' | 'excel', contentType: string) {
        const a = await getAnalyticsInstance();
        if (!a) return;
        try {
            logEvent(a, 'file_download' as string, { file_type: fileType, content_type: contentType, platform });
        } catch { /* silent */ }
    },

    /** Call when app comes to foreground */
    async trackAppOpened() {
        const a = await getAnalyticsInstance();
        if (!a) return;
        try {
            logEvent(a, 'app_open' as string, { platform });
        } catch { /* silent */ }
    },

    /** Set persistent user properties */
    async setUserProperties(props: Record<string, string>) {
        const a = await getAnalyticsInstance();
        if (!a) return;
        try {
            setUserProperties(a, props);
        } catch { /* silent */ }
    },

    // Expose helper for external use
    getAmountRange,
};
