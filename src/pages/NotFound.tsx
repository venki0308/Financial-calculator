import { useEffect } from 'react';
import { useAppColors } from '../theme/useAppColors';

/**
 * Public-web 404 page. Previously the catch-all route rendered the full
 * landing page at HTTP 200 for ANY unknown URL — a classic soft-404 that
 * wastes crawl budget and pollutes Search Console. A static host can't
 * return a real 404 status for SPA routes, so we do the next best thing:
 * noindex the page and link back home.
 */
export default function NotFound() {
    const c = useAppColors();

    useEffect(() => {
        document.title = 'Page not found — FinCalix';
        // noindex so search engines drop bad URLs instead of indexing
        // duplicate homepages. Removed on unmount for SPA navigation.
        const meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = 'noindex';
        document.head.appendChild(meta);
        return () => { document.head.removeChild(meta); };
    }, []);

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '16px',
            background: c.bg, color: c.text, fontFamily: "'Poppins', sans-serif",
            padding: '24px', textAlign: 'center',
        }}>
            <span style={{ fontSize: '52px' }}>🔍</span>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>Page not found</h1>
            <p style={{ color: c.textSecondary, fontSize: '14px', maxWidth: '420px', margin: 0 }}>
                The page you're looking for doesn't exist or has moved.
            </p>
            <a
                href="/"
                style={{
                    marginTop: '8px', padding: '12px 28px', borderRadius: '12px',
                    background: '#C9A84C', color: '#0B1220', fontWeight: 700,
                    fontSize: '14px', textDecoration: 'none',
                }}
            >
                Go to FinCalix Home
            </a>
        </div>
    );
}
