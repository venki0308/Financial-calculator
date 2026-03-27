import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fincalix.app';
const DEV_KEY = 'fincalix_dev_mode';

const modules = [
    { emoji: '📈', label: 'SIP Calculator' },
    { emoji: '🏠', label: 'EMI Calculator' },
    { emoji: '🏦', label: 'FD / RD Calculator' },
    { emoji: '💰', label: 'PPF Calculator' },
    { emoji: '🧾', label: 'HRA Calculator' },
    { emoji: '📊', label: 'GST Calculator' },
    { emoji: '💼', label: 'Income Tax (Old vs New)' },
    { emoji: '📒', label: 'Expense Tracker' },
    { emoji: '🌍', label: 'World Clock' },
    { emoji: '💹', label: 'Lumpsum Calculator' },
    { emoji: '🏛️', label: 'NPS Calculator' },
    { emoji: '👧', label: 'Sukanya Samriddhi' },
];

const trustItems = [
    { icon: '⚡', stat: '50+', label: 'Calculators' },
    { icon: '📅', stat: 'Budget 2026-27', label: 'Always Updated' },
    { icon: '🔒', stat: '100% Free', label: 'No Login Ever' },
];

const steps = [
    { n: '01', title: 'Open App', desc: 'Download FinCalix free from the Play Store — no account needed.' },
    { n: '02', title: 'Enter Values', desc: 'Fill in your financial details in seconds.' },
    { n: '03', title: 'Get Instant Results', desc: 'Accurate results, charts, and smart insights right away.' },
];

function isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function PlayStoreBadge({ large = false }: { large?: boolean }) {
    return (
        <a
            href={PLAY_STORE_URL}
            className="inline-flex items-center gap-3 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-[0_0_30px_rgba(201,168,76,0.4)]"
            style={{
                background: '#C9A84C',
                color: '#0A1628',
                fontFamily: "'Poppins', sans-serif",
                padding: large ? '14px 28px' : '10px 20px',
            }}
        >
            <svg width={large ? 28 : 22} height={large ? 28 : 22} viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.18 23.76C3.06 23.7 3 23.52 3 23.28V0.72C3 0.48 3.06 0.3 3.18 0.24L3.24 0.18L13.56 10.5V10.68L3.24 21V23.82L3.18 23.76Z" />
                <path d="M17.04 14.16L13.56 10.68V10.5L17.04 7.02L17.16 7.08L21.3 9.48C22.5 10.14 22.5 11.22 21.3 11.88L17.16 14.1L17.04 14.16Z" />
                <path d="M17.16 14.1L13.56 10.5L3.18 20.88C3.6 21.3 4.26 21.36 5.04 20.94L17.16 14.1Z" />
                <path d="M17.16 6.9L5.04 0.06C4.26 -0.36 3.6 -0.3 3.18 0.12L13.56 10.5L17.16 6.9Z" />
            </svg>
            <div className="flex flex-col items-start" style={{ lineHeight: 1.1 }}>
                <span style={{ fontSize: large ? '11px' : '9px', fontWeight: 400, opacity: 0.8, letterSpacing: '0.5px' }}>
                    GET IT ON
                </span>
                <span style={{ fontSize: large ? '20px' : '15px', fontWeight: 700, letterSpacing: '-0.3px' }}>
                    Google Play
                </span>
            </div>
        </a>
    );
}

function MobileRedirectScreen({ countdown }: { countdown: number }) {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center px-6"
            style={{ background: '#0A1628', fontFamily: "'Poppins', sans-serif" }}
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center text-center"
            >
                <img
                    src="/icons/fincalix-logo.png"
                    alt="FinCalix"
                    className="w-24 h-24 rounded-3xl mb-6 shadow-2xl"
                    style={{ boxShadow: '0 0 40px rgba(201,168,76,0.3)' }}
                />
                <h1 className="text-4xl font-bold mb-2" style={{ color: '#C9A84C' }}>FinCalix</h1>
                <p className="text-slate-300 text-base mb-10 max-w-xs">
                    India's best free financial calculator — no login, works offline.
                </p>

                <p className="text-slate-400 text-sm mb-3">Taking you to Play Store in</p>
                <div
                    className="text-7xl font-bold mb-8"
                    style={{ color: '#C9A84C', fontVariantNumeric: 'tabular-nums' }}
                >
                    {countdown}
                </div>

                <PlayStoreBadge large />

                <p className="text-slate-600 text-xs mt-6">
                    Redirecting automatically…
                </p>
            </motion.div>
        </div>
    );
}

export default function WebLandingPage() {
    const [countdown, setCountdown] = useState<number | null>(null);
    const [devMode, setDevMode] = useState(false);
    const [fontsLoaded, setFontsLoaded] = useState(false);

    // Load Poppins font dynamically (web-only)
    useEffect(() => {
        const existing = document.querySelector('link[data-fincalix-poppins]');
        if (!existing) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap';
            link.setAttribute('data-fincalix-poppins', 'true');
            document.head.appendChild(link);
        }
        setFontsLoaded(true);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const isDevUrl = params.get('dev') === 'true';
        const isDevSession = sessionStorage.getItem(DEV_KEY) === 'true';

        if (isDevUrl || isDevSession) {
            sessionStorage.setItem(DEV_KEY, 'true');
            setDevMode(true);
            return;
        }

        if (isMobileDevice()) {
            setCountdown(3);
        }
    }, []);

    // Countdown ticker
    useEffect(() => {
        if (countdown === null) return;
        if (countdown <= 0) {
            window.location.href = PLAY_STORE_URL;
            return;
        }
        const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    if (!fontsLoaded) return null;

    // Mobile redirect flow
    if (countdown !== null) {
        return <MobileRedirectScreen countdown={countdown} />;
    }

    // Full landing page (desktop or dev mode)
    return (
        <div style={{ fontFamily: "'Poppins', sans-serif", background: '#0A1628', color: '#fff', overflowX: 'hidden' }}>

            {/* ── Navbar ────────────────────────────────── */}
            <nav
                className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
                style={{
                    background: 'rgba(10,22,40,0.75)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(201,168,76,0.15)',
                }}
            >
                <div className="flex items-center gap-3">
                    <img src="/icons/fincalix-logo.png" alt="FinCalix" className="w-8 h-8 rounded-lg" />
                    <span className="text-xl font-bold" style={{ color: '#C9A84C', letterSpacing: '-0.5px' }}>
                        FinCalix
                    </span>
                </div>
                <a
                    href={PLAY_STORE_URL}
                    className="px-5 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                    style={{ background: '#C9A84C', color: '#0A1628' }}
                >
                    Download Free
                </a>
            </nav>

            {/* ── Hero ──────────────────────────────────── */}
            <section
                className="relative flex items-center justify-center min-h-screen text-center px-6"
                style={{
                    background: `
                        radial-gradient(ellipse at 75% 15%, rgba(201,168,76,0.18) 0%, transparent 55%),
                        radial-gradient(ellipse at 20% 85%, rgba(99,102,241,0.18) 0%, transparent 55%),
                        radial-gradient(ellipse at 50% 50%, rgba(13,31,60,0.6) 0%, transparent 70%),
                        linear-gradient(160deg, #0A1628 0%, #0d1f3c 45%, #0f1a30 75%, #0A1628 100%)
                    `,
                }}
            >
                {/* Decorative rings */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(201,168,76,0.05) 0%, transparent 60%)`,
                    }}
                />

                <motion.div
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="relative z-10 max-w-3xl mx-auto"
                    style={{ paddingTop: '80px' }}
                >
                    {/* Badge */}
                    <div
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8"
                        style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }}
                    >
                        <span>✦</span>
                        <span>Budget 2026-27 Updated · Made for India</span>
                    </div>

                    <h1
                        className="font-black leading-tight mb-6"
                        style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', letterSpacing: '-1.5px', color: '#fff' }}
                    >
                        Smart Finance.{' '}
                        <span style={{ color: '#C9A84C' }}>Your Way.</span>
                    </h1>

                    <p
                        className="mb-10 mx-auto"
                        style={{
                            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                            color: 'rgba(255,255,255,0.65)',
                            maxWidth: '560px',
                            lineHeight: 1.6,
                        }}
                    >
                        India's most complete financial calculator —{' '}
                        <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Free, offline, no login needed.</strong>
                    </p>

                    <PlayStoreBadge large />

                    {/* Trust line */}
                    <p className="mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' }}>
                        Free Forever · No Login · Works Offline · Made for India · Budget 2026-27 Updated
                    </p>
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
                    animate={{ y: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                >
                    <div className="w-px h-10" style={{ background: 'linear-gradient(to bottom, rgba(201,168,76,0.5), transparent)' }} />
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#C9A84C' }} />
                </motion.div>
            </section>

            {/* ── Trust Strip ───────────────────────────── */}
            <section
                className="py-12 px-6"
                style={{ background: 'rgba(201,168,76,0.06)', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}
            >
                <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center">
                    {trustItems.map((item) => (
                        <motion.div
                            key={item.stat}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="text-3xl mb-2">{item.icon}</div>
                            <div className="font-bold text-lg" style={{ color: '#C9A84C' }}>{item.stat}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.label}</div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── Module Showcase ───────────────────────── */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2
                            className="font-bold mb-4"
                            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', letterSpacing: '-0.5px' }}
                        >
                            Every Calculator You Need
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem' }}>
                            50+ financial tools built for Indian users — all in one app.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {modules.map((mod, i) => (
                            <motion.div
                                key={mod.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.04, duration: 0.35 }}
                                className="flex flex-col items-center gap-3 p-5 rounded-2xl text-center transition-all hover:scale-105 cursor-default"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                }}
                            >
                                <span style={{ fontSize: '2rem' }}>{mod.emoji}</span>
                                <span className="text-xs font-medium leading-tight" style={{ color: 'rgba(255,255,255,0.75)' }}>
                                    {mod.label}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How It Works ──────────────────────────── */}
            <section
                className="py-20 px-6"
                style={{ background: 'rgba(201,168,76,0.04)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-14"
                    >
                        <h2
                            className="font-bold mb-4"
                            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', letterSpacing: '-0.5px' }}
                        >
                            How It Works
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {steps.map((step, i) => (
                            <motion.div
                                key={step.n}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                className="relative flex flex-col items-center text-center p-6 rounded-2xl"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(201,168,76,0.15)',
                                }}
                            >
                                <div
                                    className="text-4xl font-black mb-4"
                                    style={{ color: 'rgba(201,168,76,0.2)', letterSpacing: '-2px' }}
                                >
                                    {step.n}
                                </div>
                                <h3 className="font-bold text-lg mb-2" style={{ color: '#C9A84C' }}>
                                    {step.title}
                                </h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    {step.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mt-14"
                    >
                        <PlayStoreBadge large />
                    </motion.div>
                </div>
            </section>

            {/* ── Footer ────────────────────────────────── */}
            <footer
                className="py-8 px-6 text-center text-sm"
                style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.35)',
                }}
            >
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <span>© 2025 FinCalix · Made with ❤️ in India</span>
                    <span>·</span>
                    <a
                        href="/privacy-policy"
                        className="transition-colors hover:text-white"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                        Privacy Policy
                    </a>
                </div>
            </footer>
        </div>
    );
}
