import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAppColors } from '../../theme/useAppColors';

// ── Language types ───────────────────────────────────────
export type Lang = 'en' | 'hi' | 'te' | 'ta' | 'kn';

export const LANG_OPTIONS: { code: Lang; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
];

// ── Language selector dropdown ───────────────────────────
export function LangSelector({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
    const c = useAppColors();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = LANG_OPTIONS.find(l => l.code === lang)!;

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 12px', borderRadius: '10px',
                    background: c.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    border: `1px solid ${c.border}`,
                    color: c.textSecondary, fontSize: '13px', cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif', whiteSpace: 'nowrap',
                }}
            >
                🌐 <span>{current.label}</span>
                <span style={{ fontSize: '9px', opacity: 0.5 }}>{open ? '▲' : '▼'}</span>
            </button>
            {open && (
                <div
                    style={{
                        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                        background: c.card, border: `1px solid ${c.border}`,
                        borderRadius: '12px', overflow: 'hidden', zIndex: 200,
                        minWidth: '150px', boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                    }}
                >
                    {LANG_OPTIONS.map(l => (
                        <button
                            key={l.code}
                            onClick={() => { onChange(l.code); setOpen(false); }}
                            style={{
                                display: 'block', width: '100%', padding: '10px 16px',
                                textAlign: 'left',
                                background: l.code === lang ? 'rgba(201,168,76,0.12)' : 'transparent',
                                color: l.code === lang ? '#C9A84C' : c.textSecondary,
                                fontSize: '13px', cursor: 'pointer',
                                fontFamily: 'Poppins, sans-serif', border: 'none',
                                transition: 'background 0.15s',
                            }}
                        >
                            {l.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Official Play Store badge ────────────────────────────
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fincalix.app';
export function PlayStoreBadge({ className = '' }: { className?: string }) {
    return (
        <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
            style={{ display: 'inline-block', cursor: 'pointer', transition: 'opacity 0.2s', textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
            <img
                src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                alt="Get it on Google Play"
                style={{ height: '60px', width: 'auto' }}
            />
        </a>
    );
}

// ── Main layout ──────────────────────────────────────────
export default function LegalLayout({
    title,
    updated,
    children,
    langBar,
}: {
    title: string;
    updated: string;
    children: ReactNode;
    langBar?: ReactNode;
}) {
    const c = useAppColors();

    useEffect(() => {
        if (!document.querySelector('link[data-fc-poppins]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap';
            link.setAttribute('data-fc-poppins', 'true');
            document.head.appendChild(link);
        }
        document.title = `${title} — FinCalix`;
    }, [title]);

    return (
        <div style={{ fontFamily: "'Poppins', sans-serif", background: c.bg, color: c.text, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header
                style={{
                    borderBottom: `1px solid ${c.border}`,
                    background: c.isDark ? 'rgba(5,13,26,0.95)' : 'rgba(255,255,255,0.95)',
                    position: 'sticky', top: 0, zIndex: 50,
                    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                }}
            >
                <div
                    style={{
                        maxWidth: '880px', margin: '0 auto', padding: '14px 24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                    }}
                >
                    <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}>
                        <img src="/icons/fincalix-logo.png" alt="FinCalix" style={{ width: '30px', height: '30px', borderRadius: '8px' }} />
                        <span style={{ color: '#C9A84C', fontSize: '18px', fontWeight: 700, letterSpacing: '-0.3px' }}>FinCalix</span>
                    </a>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {langBar}
                        <a href="/" style={{ fontSize: '12px', color: c.textSecondary, textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ← Home
                        </a>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main style={{ flex: 1, maxWidth: '880px', margin: '0 auto', width: '100%', padding: '48px 24px 80px' }}>
                <p style={{ color: '#C9A84C', fontSize: '11px', fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '10px' }}>
                    {updated}
                </p>
                <h1 style={{ fontSize: 'clamp(1.7rem, 5vw, 2.6rem)', fontWeight: 700, letterSpacing: '-0.8px', lineHeight: 1.1, marginBottom: '40px', color: c.text }}>
                    {title}
                </h1>
                {children}
            </main>

            {/* Footer */}
            <footer style={{ borderTop: `1px solid ${c.border}`, background: c.card, padding: '24px', textAlign: 'center', fontSize: '12px', color: c.textSecondary }}>
                <div style={{ marginBottom: '8px' }}>FinCalix — Smart Financial Planning Tool</div>
                <div>
                    Made with ❤️ in India ·{' '}
                    <a href="/privacy-policy" style={{ color: c.textSecondary, textDecoration: 'none' }}>Privacy</a>
                    {' · '}
                    <a href="/terms-of-service" style={{ color: c.textSecondary, textDecoration: 'none' }}>Terms</a>
                    {' · '}
                    <a href="/about" style={{ color: c.textSecondary, textDecoration: 'none' }}>About</a>
                    {' · '}© 2026 FinCalix. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
