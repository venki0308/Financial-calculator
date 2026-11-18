/**
 * The one place screens and utilities call to record usage.
 *
 *  - trackCalculated()        a calculation was completed (debounced)
 *  - trackExported(filename)  a PDF, Excel or CSV report was produced
 *  - useCalculatedEvent(deps) the same as trackCalculated, for screens whose
 *                             results are not saved to calculation history
 *  - trackSchemeViewed / trackLanguageChanged
 *
 * All of them go through services/analyticsService, which sends only the
 * parameters allowed per event in
 * services/providers/types.ts: calculator_id, export_format and language for
 * the usage events. No amount, input, result or typed text is ever passed.
 */
import { useEffect, useRef } from 'react';
import i18n from '../i18n';
import { AnalyticsService as Core } from '../services/analyticsService';
import { AnalyticsEvent } from '../services/providers/types';

/** Results computed within this long after a screen opens come from its
 *  default or restored inputs, not from the user: they are not counted. */
const SCREEN_SETTLE_MS = 3000;
/** One event per calculation: wait until the result has stopped changing. */
const CALC_DEBOUNCE_MS = 2000;

let screenOpenedAt = 0;
const pendingCalc = new Map<string, ReturnType<typeof setTimeout>>();

/** Record IDs (loans, businesses, cards) never leave the device. */
export function normalizePath(pathname: string): string {
    return pathname.replace(/^\/(my-loans|business-tracker|expenses\/credit-cards)\/(?!add$)[^/]+/, '/$1/:id');
}

/** "/calculator/sip" → "sip", "/gold-loan" → "gold-loan", "/my-loans/:id" → "my-loans". */
export function calculatorIdFromPath(pathname: string): string {
    const first = normalizePath(pathname).replace(/^\/calculator\//, '/').split('/')[1] || 'home';
    return first.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40) || 'home';
}

const currentPath = () => (typeof location === 'undefined' ? '/' : location.pathname);
const language = () => (i18n.language || 'en').slice(0, 2);

/** Called by usePageViewTracker on every screen change. */
export function trackScreenOpened(screenName: string, pathname: string): void {
    screenOpenedAt = Date.now();
    const origin = typeof location === 'undefined' ? 'https://fincalix.com' : location.origin;
    Core.trackPage({ page_title: screenName, page_location: origin + normalizePath(pathname) });
}

/**
 * A calculation was completed. Call it whenever a new result is ready; rapid
 * calls (typing) collapse into one event 2 s after the last one. Results
 * produced while the screen is still opening are ignored.
 */
export function trackCalculated(): void {
    if (Date.now() - screenOpenedAt < SCREEN_SETTLE_MS) return;
    const id = calculatorIdFromPath(currentPath());
    const previous = pendingCalc.get(id);
    if (previous) clearTimeout(previous);
    pendingCalc.set(id, setTimeout(() => {
        pendingCalc.delete(id);
        Core.trackEvent(AnalyticsEvent.CALCULATOR_CALCULATED, { calculator_id: id, language: language() });
    }, CALC_DEBOUNCE_MS));
}

/** For screens without calculation history: counts a calculation whenever `deps` change after the first render. */
export function useCalculatedEvent(deps: readonly unknown[]): void {
    const first = useRef(true);
    useEffect(() => {
        if (first.current) { first.current = false; return; }
        trackCalculated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

/** A report file was produced. The format is taken from the file name. */
export function trackExported(filename: string): void {
    const ext = filename.toLowerCase().split('.').pop();
    const format = ext === 'pdf' ? 'pdf' : ext === 'xlsx' || ext === 'xls' ? 'excel' : ext === 'csv' ? 'csv' : null;
    if (!format) return;
    Core.trackEvent(AnalyticsEvent.REPORT_EXPORTED, {
        calculator_id: calculatorIdFromPath(currentPath()),
        export_format: format,
        language: language(),
    });
}

export const AnalyticsService = {
    /** A government scheme page was opened. Only "central" / "state" is sent. */
    async trackSchemeViewed(schemeType: string) {
        Core.trackEvent(AnalyticsEvent.SCHEME_VIEWED, { scheme_type: schemeType });
    },

    /** The app language was changed in Settings. */
    async trackLanguageChanged(lang: string) {
        Core.trackEvent(AnalyticsEvent.LANGUAGE_CHANGED, { language: lang });
    },
};
