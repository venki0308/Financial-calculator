import { useEffect, useState } from 'react';

/** The website's own theme choice; the app keeps its theme in settings-storage. */
export const SITE_THEME_KEY = 'fincalix_web_theme';

type Theme = 'light' | 'dark';

/** Browser-bar colour per theme (the page background). */
const THEME_COLOR: Record<Theme, string> = { light: '#FBFAF6', dark: '#0B1120' };

/** Light (paper) for every first visit, whatever the device setting; dark only once the visitor picks it here. */
export function HeaderControls() {
    // Pre-rendered HTML shows the default; the real theme is read after hydration.
    const [theme, setTheme] = useState<Theme>('light');

    useEffect(() => {
        setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    }, []);

    const toggleTheme = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        document.documentElement.style.colorScheme = next;
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[next]);
        try { localStorage.setItem(SITE_THEME_KEY, next); } catch { /* ignore */ }
        setTheme(next);
    };

    return (
        <div className="hdr-controls">
            <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Dark theme" aria-pressed={theme === 'dark'}>
                <svg className="i-moon" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                <svg className="i-sun" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
        </div>
    );
}
