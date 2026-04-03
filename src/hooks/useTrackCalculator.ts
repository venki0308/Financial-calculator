import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CrashlyticsService } from '../lib/analytics';

/**
 * Tracks the current calculator page in localStorage for "Recently Used" on Home.
 * Also writes a Crashlytics custom key `feature_name` so that crash reports include
 * which calculator the user was using when the crash occurred.
 *
 * Call this at the top of any calculator/page component.
 */
export function useTrackCalculator() {
    const location = useLocation();

    useEffect(() => {
        const path = location.pathname;
        // Only track calculator/tool paths
        if (!path.startsWith('/calculator/') && !path.startsWith('/insurance')) return;

        // 1. Update "Recently Used" in localStorage
        try {
            const recent: string[] = JSON.parse(localStorage.getItem('fincalix_recently_used') || '[]');
            const updated = [path, ...recent.filter(p => p !== path)].slice(0, 6);
            localStorage.setItem('fincalix_recently_used', JSON.stringify(updated));
        } catch { /* ignore */ }

        // 2. Attach feature name to Crashlytics (native only, safe no-op on web)
        const featureName = path.replace('/calculator/', '').replace(/-/g, '_').toUpperCase();
        CrashlyticsService.setCustomKey('feature_name', featureName);
        CrashlyticsService.log(`Feature: ${featureName}`);
    }, [location.pathname]);
}

