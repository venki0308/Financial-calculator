import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CrashlyticsService } from '../lib/analytics';

/**
 * useCrashContext — Auto-attaches the active screen to every Crashlytics report.
 *
 * Call this ONCE high in the component tree (e.g., in AppContent in App.tsx).
 * On every route change it writes two things into Crashlytics:
 *   1. A breadcrumb log message: "Screen: /calculator/hra"
 *   2. A custom key `active_screen` so it appears in Firebase crash details
 *
 * Zero-cost on web (CrashlyticsService guards are no-ops when not native).
 */
export function useCrashContext() {
    const location = useLocation();

    useEffect(() => {
        const screen = location.pathname;
        // Fire and forget — never block the render
        CrashlyticsService.log(`Screen: ${screen}`);
        CrashlyticsService.setCustomKey('active_screen', screen);
    }, [location.pathname]);
}
