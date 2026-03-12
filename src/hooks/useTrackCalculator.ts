import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Tracks the current calculator page in localStorage for "Recently Used" on Home.
 * Call this at the top of any calculator/page component.
 */
export function useTrackCalculator() {
    const location = useLocation();

    useEffect(() => {
        const path = location.pathname;
        // Only track calculator paths
        if (!path.startsWith('/calculator/')) return;

        try {
            const recent: string[] = JSON.parse(localStorage.getItem('fincalix_recently_used') || '[]');
            const updated = [path, ...recent.filter(p => p !== path)].slice(0, 6);
            localStorage.setItem('fincalix_recently_used', JSON.stringify(updated));
        } catch { /* ignore */ }
    }, [location.pathname]);
}
