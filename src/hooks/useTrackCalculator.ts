import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CrashlyticsService } from '../lib/analytics';
import { allCalcs } from '../data/calculatorList';

/**
 * Tracks the current calculator page in localStorage for "Recently Used" on
 * the Home and Calculators pages. Also writes a Crashlytics custom key
 * `feature_name` so crash reports include which calculator the user was on.
 *
 * IMPORTANT: This hook now checks against the canonical `allCalcs` list, NOT
 * a hardcoded path prefix. The previous implementation only matched paths
 * starting with `/calculator/` or `/insurance`, which silently failed for
 *   - /two-wheeler-loan
 *   - /gold-loan
 *   - /cibil-score
 * Three calculators that called this hook still didn't get tracked.
 *
 * The hook is also called once at the AppContent level (App.tsx), so any new
 * calculator added to `allCalcs` is auto-tracked without needing to wire the
 * hook into the component itself. Existing calls in individual calculator
 * components are harmless (the hook is idempotent for the same path).
 */
export function useTrackCalculator() {
    const location = useLocation();

    useEffect(() => {
        const path = location.pathname;

        // Only track paths that exist in the canonical calculator list.
        // This naturally excludes /home, /profile, /settings, /schemes, etc.
        const calc = allCalcs.find((c) => c.path === path);
        if (!calc) return;

        // 1. Update "Recently Used" in localStorage (max 6, dedup, MRU first)
        try {
            const recent: string[] = JSON.parse(localStorage.getItem('fincalix_recently_used') || '[]');
            const updated = [path, ...recent.filter((p) => p !== path)].slice(0, 6);
            localStorage.setItem('fincalix_recently_used', JSON.stringify(updated));
        } catch { /* ignore localStorage errors */ }

        // 2. Attach feature name to Crashlytics (native only, safe no-op on web).
        // Strip the leading slash + the optional "calculator/" prefix to get a
        // clean uppercase name like "TWO_WHEELER_LOAN" or "INCOME_TAX".
        const featureName = path
            .replace(/^\/calculator\//, '')
            .replace(/^\//, '')
            .replace(/-/g, '_')
            .toUpperCase();
        CrashlyticsService.setCustomKey('feature_name', featureName);
        CrashlyticsService.log(`Feature: ${featureName}`);
    }, [location.pathname]);
}

