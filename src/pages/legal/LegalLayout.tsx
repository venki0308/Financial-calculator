import { useEffect } from 'react';
import type { ReactNode } from 'react';

export default function LegalLayout({
    title,
    updated,
    children,
}: {
    title: string;
    updated: string;
    children: ReactNode;
}) {
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
        <div
            style={{
                fontFamily: "'Poppins', sans-serif",
                background: '#0A1628',
                color: '#fff',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <header
                style={{
                    borderBottom: '1px solid rgba(201,168,76,0.15)',
                    background: 'rgba(5,13,26,0.95)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                }}
            >
                <div
                    style={{
                        maxWidth: '860px',
                        margin: '0 auto',
                        padding: '16px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <a
                        href="/"
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
                    >
                        <img
                            src="/icons/fincalix-logo.png"
                            alt="FinCalix"
                            style={{ width: '32px', height: '32px', borderRadius: '8px' }}
                        />
                        <span style={{ color: '#C9A84C', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.3px' }}>
                            FinCalix
                        </span>
                    </a>
                    <a
                        href="/"
                        style={{
                            fontSize: '13px',
                            color: '#94A3B8',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        ← Back to Home
                    </a>
                </div>
            </header>

            {/* Main content */}
            <main style={{ flex: 1, maxWidth: '860px', margin: '0 auto', width: '100%', padding: '56px 24px 80px' }}>
                {/* Meta */}
                <p
                    style={{
                        color: '#C9A84C',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '1.2px',
                        textTransform: 'uppercase',
                        marginBottom: '12px',
                    }}
                >
                    Last Updated: {updated}
                </p>

                <h1
                    style={{
                        fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
                        fontWeight: 700,
                        letterSpacing: '-1px',
                        lineHeight: 1.1,
                        marginBottom: '48px',
                        color: '#fff',
                    }}
                >
                    {title}
                </h1>

                <div style={{ maxWidth: '720px' }}>{children}</div>
            </main>

            {/* Footer */}
            <footer
                style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    background: '#050D1A',
                    padding: '24px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#4A5568',
                }}
            >
                © 2025 FinCalix ·{' '}
                <a href="/privacy-policy" style={{ color: '#94A3B8', textDecoration: 'none' }}>Privacy Policy</a>
                {' · '}
                <a href="/terms-of-service" style={{ color: '#94A3B8', textDecoration: 'none' }}>Terms of Service</a>
                {' · '}
                <a href="/about" style={{ color: '#94A3B8', textDecoration: 'none' }}>About</a>
            </footer>
        </div>
    );
}

// Shared section components used by all legal pages
export function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section style={{ marginBottom: '48px' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid rgba(201,168,76,0.15)',
                }}
            >
                <div style={{ width: '3px', height: '20px', background: '#C9A84C', borderRadius: '2px', flexShrink: 0 }} />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#C9A84C', margin: 0 }}>{title}</h2>
            </div>
            <div style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.75 }}>{children}</div>
        </section>
    );
}

export function P({ children }: { children: ReactNode }) {
    return <p style={{ marginBottom: '12px' }}>{children}</p>;
}

export function UL({ items }: { items: string[] }) {
    return (
        <ul style={{ paddingLeft: '20px', margin: '8px 0 12px' }}>
            {items.map((item, i) => (
                <li key={i} style={{ marginBottom: '6px' }}>{item}</li>
            ))}
        </ul>
    );
}

export function Highlight({ children }: { children: ReactNode }) {
    return (
        <div
            style={{
                background: 'rgba(201,168,76,0.07)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: '12px',
                padding: '14px 18px',
                margin: '16px 0',
                color: '#e2e8f0',
                fontSize: '14px',
                lineHeight: 1.65,
            }}
        >
            {children}
        </div>
    );
}
