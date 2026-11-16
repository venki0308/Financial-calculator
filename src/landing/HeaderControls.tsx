import { useEffect, useId, useState } from 'react';
import { LANGUAGES } from './content';

/** Same keys the app reads at start-up (src/i18n.ts, useSettingsStore). */
const LANG_KEY = 'language';
const SETTINGS_KEY = 'settings-storage';
export const SITE_THEME_KEY = 'fincalix_site_theme';

type Theme = 'light' | 'dark';

function readLang(): string {
    try { return localStorage.getItem(LANG_KEY) || 'en'; } catch { return 'en'; }
}

/** Set the app's language before it opens (the website itself stays in English). */
function writeLang(code: string) {
    try {
        localStorage.setItem(LANG_KEY, code);
        const raw = localStorage.getItem(SETTINGS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        const next = parsed && typeof parsed === 'object' && parsed.state
            ? { ...parsed, state: { ...parsed.state, language: code } }
            : { state: { language: code }, version: 0 };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch { /* storage unavailable: the app falls back to English */ }
}

export function HeaderControls() {
    const id = useId();
    // Pre-rendered HTML shows the defaults; the real values are applied after hydration.
    const [lang, setLang] = useState('en');
    const [theme, setTheme] = useState<Theme>('light');

    useEffect(() => {
        setLang(readLang());
        setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    }, []);

    const toggleTheme = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem(SITE_THEME_KEY, next); } catch { /* ignore */ }
        setTheme(next);
    };

    return (
        <div className="hdr-controls">
            <label htmlFor={id} className="sr-only">Language for the app</label>
            <span className="lang" title="Language the app opens in">
                <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
                <span aria-hidden="true">{lang.toUpperCase()}<span className="lang-name"> · {LANGUAGES.find((l) => l.code === lang)?.native}</span></span>
                <select id={id} value={lang} onChange={(e) => { setLang(e.target.value); writeLang(e.target.value); }}>
                    {LANGUAGES.map((l) => <option key={l.code} value={l.code} lang={l.code}>{l.code.toUpperCase()} · {l.native}</option>)}
                </select>
            </span>
            <button type="button" className="icon-btn" onClick={toggleTheme}
                aria-label="Dark theme" aria-pressed={theme === 'dark'}>
                <svg className="i-moon" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                <svg className="i-sun" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
        </div>
    );
}
