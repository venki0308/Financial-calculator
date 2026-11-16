/**
 * Page-level analytics helpers.
 *
 * Thin wrappers over services/analyticsService, which sends nothing while the
 * user has switched usage analytics off, and only ever sends the events and
 * parameters listed in services/providers/types.ts.
 */
import { Capacitor } from '@capacitor/core';
import { AnalyticsEvent } from '../services/providers/types';
import { AnalyticsService as CoreAnalyticsService } from '../services/analyticsService';

const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

export const AnalyticsService = {
    /** Call on page mount. `screenName` is an app-defined constant. */
    async trackScreen(screenName: string) {
        CoreAnalyticsService.trackScreenView({ screen_name: screenName, platform });
    },

    /** Call when a calculation is run. Only the calculator type is sent. */
    async trackCalculatorUsed(calculatorType: string) {
        CoreAnalyticsService.trackCalculation({ calculator_type: calculatorType, platform });
    },

    /** Call when a government scheme page is opened. Only "central" / "state" is sent. */
    async trackSchemeViewed(schemeType: string) {
        CoreAnalyticsService.trackEvent(AnalyticsEvent.SCHEME_VIEWED, { scheme_type: schemeType, platform });
    },

    /** Call on language change in Settings. */
    async trackLanguageChanged(language: string) {
        CoreAnalyticsService.trackEvent(AnalyticsEvent.LANGUAGE_CHANGED, { language, platform });
    },

    /** Call on PDF/Excel download. `contentType` is an app-defined feature name. */
    async trackFileDownload(fileType: 'pdf' | 'excel', contentType: string) {
        CoreAnalyticsService.trackExport({
            export_type: fileType === 'pdf' ? 'PDF' : 'EXCEL',
            feature: contentType,
            platform,
        });
    },
};
