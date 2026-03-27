import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fincalix.app';
const DEV_KEY = 'fincalix_dev_mode';

// ── Deterministic particles (no Math.random on render) ──
const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${((i * 3.7 + 1.2) % 100).toFixed(1)}%`,
    size: 2 + (i % 3),
    delay: +((i * 0.43) % 14).toFixed(1),
    duration: +(14 + (i % 7) * 1.5).toFixed(1),
    opacity: +(0.15 + (i % 5) * 0.06).toFixed(2),
}));

// ── Data ────────────────────────────────────────────────
const STATS = [
    { value: '30+', label: 'Smart Calculators' },
    { value: '45+', label: 'Govt Schemes' },
    { value: '5',   label: 'Indian Languages' },
    { value: '100%', label: 'Free Forever' },
];

const FEATURE_BLOCKS = [
    {
        id: 'toolkit',
        headline: 'Your Complete Financial Toolkit',
        sub: 'Everything from SIP to tax planning in one app.',
        pills: ['SIP Calculator', 'EMI Calculator', 'PPF Calculator', 'FD/RD Calculator', 'HRA Calculator', 'GST Calculator'],
        phoneLeft: true,
        highlight: null as string | null,
        screenLabel: 'Home Screen',
        screenSrc: '/screenshots/home.png',
    },
    {
        id: 'calculators',
        headline: '30 Smart Calculators',
        sub: "India's most comprehensive calculator suite — built for every financial need.",
        pills: ['Loan EMI', 'Income Tax', 'Lumpsum', 'NPS', 'Sukanya Samriddhi', 'Age Calculator'],
        phoneLeft: false,
        highlight: null as string | null,
        screenLabel: 'Calculator Screen',
        screenSrc: '/screenshots/calculators.png',
    },
    {
        id: 'tax',
        headline: 'Smart Income Tax Planning',
        sub: 'Old vs New regime comparison. FY 2026-27 rates. Monthly, Annual, CTC and Payslip modes.',
        pills: ['New Regime FY 2026-27', 'Old Regime with deductions', 'Monthly / Annual / CTC modes', 'Zero tax up to ₹12L New Regime'],
        phoneLeft: true,
        highlight: 'Budget 2026-27 Updated — Zero tax on income up to ₹12 Lakh under New Regime',
        screenLabel: 'Tax Calculator',
        screenSrc: '/screenshots/tax.png',
    },
    {
        id: 'schemes',
        headline: 'Discover 45+ Government Schemes',
        sub: 'Central and state government schemes — all in one place with eligibility details.',
        pills: ['PM Kisan Samman Nidhi', 'Sukanya Samriddhi Yojana', 'PM Fasal Bima Yojana', 'Kisan Credit Card', 'Women · Education · Farmers · MSME'],
        phoneLeft: false,
        highlight: null as string | null,
        screenLabel: 'Schemes Screen',
        screenSrc: '/screenshots/schemes.png',
    },
    {
        id: 'expenses',
        headline: 'Track Every Rupee',
        sub: 'Dashboard, budget, daily tracking and visual reports — all offline, no sync required.',
        pills: ['Monthly Budget Dashboard', 'Financial Health Score', 'Spending Breakdown Charts', 'Subscription Tracker', 'Daily & Fixed expense tracking'],
        phoneLeft: true,
        highlight: null as string | null,
        screenLabel: 'Expense Tracker',
        screenSrc: '/screenshots/expenses.png',
    },
];

const LANGUAGES = [
    { label: 'English' },
    { label: 'हिंदी' },
    { label: 'తెలుగు' },
    { label: 'தமிழ்' },
    { label: 'ಕನ್ನಡ' },
];

const CALC_MODULES = [
    { emoji: '📈', name: 'SIP Calculator',       desc: 'Mutual Fund Returns' },
    { emoji: '🏠', name: 'EMI Calculator',        desc: 'Home, Car, Personal Loans' },
    { emoji: '🏦', name: 'FD/RD Calculator',      desc: 'Fixed Deposit Returns' },
    { emoji: '💰', name: 'PPF Calculator',        desc: 'Public Provident Fund' },
    { emoji: '🧾', name: 'HRA Calculator',        desc: 'House Rent Allowance' },
    { emoji: '📊', name: 'GST Calculator',        desc: 'Tax Inclusive/Exclusive' },
    { emoji: '💼', name: 'Income Tax',            desc: 'Old vs New Regime' },
    { emoji: '📒', name: 'Expense Tracker',       desc: 'Budget & Daily Tracking' },
    { emoji: '🌍', name: 'World Clock',           desc: 'Global Time Zones' },
    { emoji: '💹', name: 'Lumpsum Calculator',    desc: 'One-time Investment' },
    { emoji: '🏛️', name: 'NPS Calculator',        desc: 'National Pension System' },
    { emoji: '👧', name: 'Sukanya Samriddhi',     desc: 'Girl Child Savings' },
    { emoji: '🎂', name: 'Age Calculator',        desc: 'Exact Age & Generation' },
    { emoji: '🏘️', name: 'Property Calculator',   desc: 'Real Estate Returns' },
    { emoji: '🔄', name: 'Compare Scenarios',     desc: 'Side by Side Comparison' },
    { emoji: '🎯', name: 'Goal Planner',          desc: 'Financial Milestones' },
    { emoji: '🤖', name: 'Financial Advisor',     desc: 'AI-Powered Insights' },
    { emoji: '📋', name: 'Government Schemes',    desc: '45+ Schemes' },
];

const STEPS = [
    { n: '01', title: 'Download Free',         desc: 'Get FinCalix free from Play Store. No account, no signup, no ads.' },
    { n: '02', title: 'Choose Your Calculator', desc: 'Pick from 30+ calculators or search any calculator instantly.' },
    { n: '03', title: 'Get Instant Results',    desc: 'Accurate results with charts, comparisons, and smart financial insights.' },
];

// ── CSS ─────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');

@keyframes fc-float-up {
    0%   { transform: translateY(0) scale(0.6); opacity: 0; }
    8%   { opacity: 0.8; }
    92%  { opacity: 0.25; }
    100% { transform: translateY(-100vh) scale(1.2); opacity: 0; }
}
@keyframes fc-phone-bob {
    0%, 100% { transform: rotate(-1.5deg) translateY(0); }
    50%       { transform: rotate(-1.5deg) translateY(-18px); }
}
@keyframes fc-badge-a {
    0%, 100% { transform: rotate(4deg) translateY(0); }
    50%       { transform: rotate(4deg) translateY(-9px); }
}
@keyframes fc-badge-b {
    0%, 100% { transform: rotate(-3deg) translateY(-4px); }
    50%       { transform: rotate(-3deg) translateY(7px); }
}
@keyframes fc-badge-c {
    0%, 100% { transform: rotate(2deg) translateY(0); }
    50%       { transform: rotate(2deg) translateY(-11px); }
}
@keyframes fc-glow-pulse {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.85; }
}
@keyframes fc-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
}

.fc-font-display { font-family: 'Syne', sans-serif; }
.fc-font-body    { font-family: 'DM Sans', sans-serif; }
.fc-font-mono    { font-family: 'DM Mono', monospace; }

.fc-reveal {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
}
.fc-reveal.fc-visible { opacity: 1; transform: translateY(0); }

.fc-phone-bob { animation: fc-phone-bob 5s ease-in-out infinite; }
.fc-badge-a   { animation: fc-badge-a 4.2s ease-in-out infinite; }
.fc-badge-b   { animation: fc-badge-b 5.5s ease-in-out infinite; }
.fc-badge-c   { animation: fc-badge-c 3.8s ease-in-out infinite 0.4s; }

.fc-cta-btn {
    background-size: 200% auto;
    background-image: linear-gradient(90deg, #C9A84C 0%, #E8C96A 40%, #f5e08a 55%, #C9A84C 100%);
    transition: background-position 0.5s ease, transform 0.2s ease, box-shadow 0.25s ease;
    color: #0A1628;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    border-radius: 16px;
    font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    text-decoration: none;
}
.fc-cta-btn:hover {
    background-position: right center;
    transform: translateY(-2px);
    box-shadow: 0 14px 40px rgba(201,168,76,0.45);
}
.fc-cta-btn:active { transform: translateY(0); box-shadow: none; }

.fc-calc-card {
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
    cursor: default;
}
.fc-calc-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 0 32px rgba(201,168,76,0.22);
    border-color: rgba(201,168,76,0.45) !important;
}

.fc-glass {
    background: rgba(15,30,53,0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
}
`;

function isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ── Scroll reveal ────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { el.classList.add('fc-visible'); obs.disconnect(); } },
            { threshold: 0.08 },
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`fc-reveal ${className}`}
            style={delay ? { transitionDelay: `${delay}ms` } : undefined}
        >
            {children}
        </div>
    );
}

// ── Particle field ───────────────────────────────────────
function ParticleField() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {PARTICLES.map((p) => (
                <span
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        left: p.left,
                        bottom: 0,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        background: '#C9A84C',
                        opacity: p.opacity,
                        animation: `fc-float-up ${p.duration}s ${p.delay}s infinite linear`,
                    }}
                />
            ))}
        </div>
    );
}

// ── Phone mockup ─────────────────────────────────────────
function PhoneMockup({ label = 'App Screenshot', src }: { label?: string; src?: string }) {
    return (
        <div className="fc-phone-bob relative flex-shrink-0" style={{ width: '260px', height: '520px' }}>
            {/* Ambient glow */}
            <div
                className="absolute inset-[-20px] rounded-[60px] pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse, rgba(201,168,76,0.15) 0%, transparent 70%)',
                    animation: 'fc-glow-pulse 3.5s ease-in-out infinite',
                }}
            />
            {/* Frame */}
            <div
                className="absolute inset-0 rounded-[42px]"
                style={{
                    border: '2px solid rgba(201,168,76,0.32)',
                    background: '#0A1628',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)',
                    overflow: 'hidden',
                }}
            >
                {/* Status bar row */}
                <div
                    className="flex items-center justify-between px-6"
                    style={{ paddingTop: '14px', paddingBottom: '10px', background: '#050D1A' }}
                >
                    <span style={{ color: '#fff', fontSize: '11px', fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>9:41</span>
                    {/* Notch */}
                    <div className="rounded-full" style={{ width: '78px', height: '22px', background: '#050D1A', border: '1px solid rgba(255,255,255,0.08)' }} />
                    {/* Signal icons */}
                    <div className="flex gap-1 items-center opacity-60">
                        <div className="rounded-sm" style={{ width: '14px', height: '10px', background: 'rgba(255,255,255,0.6)' }} />
                        <div className="rounded-sm" style={{ width: '18px', height: '12px', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.3)' }} />
                    </div>
                </div>
                {/* Screen body */}
                {src ? (
                    <img
                        src={src}
                        alt={label}
                        style={{
                            position: 'absolute',
                            top: '52px',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: '100%',
                            height: 'calc(100% - 52px)',
                            objectFit: 'cover',
                            objectPosition: 'top',
                            display: 'block',
                        }}
                    />
                ) : (
                    <div
                        className="flex flex-col items-center justify-center"
                        style={{ height: 'calc(100% - 52px)', background: '#0F1E35', padding: '20px 16px' }}
                    >
                        <div
                            className="rounded-3xl mb-4 flex items-center justify-center"
                            style={{ width: '56px', height: '56px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)' }}
                        >
                            <img src="/icons/fincalix-logo.png" alt="" className="rounded-2xl" style={{ width: '40px', height: '40px' }} />
                        </div>
                        <div className="fc-font-display text-sm font-bold mb-1" style={{ color: '#C9A84C' }}>FinCalix</div>
                        <div className="text-xs" style={{ color: '#4A5568' }}>{label}</div>
                    </div>
                )}
            </div>
            {/* Reflection */}
            <div
                className="absolute inset-0 rounded-[42px] pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.055) 0%, transparent 42%)' }}
            />
        </div>
    );
}

// ── Play Store CTA ───────────────────────────────────────
function PlayStoreBadge({ large = false, className = '' }: { large?: boolean; className?: string }) {
    const pad = large ? '16px 32px' : '12px 22px';
    const iconSize = large ? 26 : 20;
    return (
        <a href={PLAY_STORE_URL} className={`fc-cta-btn ${className}`} style={{ padding: pad }}>
            {/* Official-style Google Play triangle icon */}
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.199c.445.217.744.666.744 1.198s-.3.981-.744 1.198l-2.15 1.245-2.51-2.443 2.51-2.443 2.15 1.245zm-11.3-7.197l10.937 6.333-2.302 2.302-8.635-8.635z" />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
                <span style={{ fontSize: large ? '11px' : '9px', fontWeight: 400, opacity: 0.75, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    Get it on
                </span>
                <span style={{ fontSize: large ? '20px' : '15px', fontWeight: 700, letterSpacing: '-0.3px' }}>
                    Google Play
                </span>
            </div>
        </a>
    );
}

// ── Feature pill ─────────────────────────────────────────
function Pill({ children }: { children: ReactNode }) {
    return (
        <span
            className="fc-font-body inline-flex items-center gap-1.5 rounded-full text-xs font-medium"
            style={{
                padding: '6px 14px',
                background: 'rgba(201,168,76,0.09)',
                border: '1px solid rgba(201,168,76,0.25)',
                color: '#C9A84C',
            }}
        >
            <span style={{ fontSize: '7px', opacity: 0.7 }}>✦</span>
            {children}
        </span>
    );
}

// ── Mobile redirect ──────────────────────────────────────
function MobileRedirectScreen({ countdown }: { countdown: number }) {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center px-6 fc-font-body"
            style={{ background: '#050D1A' }}
        >
            <div className="flex flex-col items-center text-center">
                <img
                    src="/icons/fincalix-logo.png"
                    alt="FinCalix"
                    className="rounded-3xl mb-6"
                    style={{ width: '96px', height: '96px', boxShadow: '0 0 70px rgba(201,168,76,0.4)' }}
                />
                <h1 className="text-4xl font-bold mb-2 fc-font-display" style={{ color: '#C9A84C' }}>
                    FinCalix
                </h1>
                <p className="mb-10 max-w-xs" style={{ color: '#94A3B8', fontSize: '15px' }}>
                    India's best free financial calculator — no login, works offline.
                </p>
                <p className="text-sm mb-3" style={{ color: '#4A5568' }}>Taking you to Play Store in</p>
                <div
                    className="text-8xl font-black mb-8 fc-font-mono"
                    style={{ color: '#C9A84C', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
                >
                    {countdown}
                </div>
                <PlayStoreBadge large />
                <p className="mt-5 text-xs" style={{ color: '#4A5568' }}>Redirecting automatically…</p>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════
export default function WebLandingPage() {
    const [countdown, setCountdown] = useState<number | null>(null);

    // Inject CSS once
    useEffect(() => {
        const ID = 'fc-styles';
        if (!document.getElementById(ID)) {
            const el = document.createElement('style');
            el.id = ID;
            el.textContent = GLOBAL_CSS;
            document.head.prepend(el);
        }
    }, []);

    // Dev gate + mobile redirect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('dev') === 'true' || sessionStorage.getItem(DEV_KEY) === 'true') {
            sessionStorage.setItem(DEV_KEY, 'true');
            return;
        }
        if (isMobileDevice()) setCountdown(3);
    }, []);

    useEffect(() => {
        if (countdown === null) return;
        if (countdown <= 0) { window.location.href = PLAY_STORE_URL; return; }
        const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    if (countdown !== null) return <MobileRedirectScreen countdown={countdown} />;

    return (
        <div className="fc-font-body" style={{ background: '#050D1A', color: '#fff', overflowX: 'hidden' }}>

            {/* ─────────────────────────── NAVBAR ─── */}
            <nav
                className="fc-glass fixed top-0 left-0 right-0 z-50"
                style={{ borderBottom: '1px solid rgba(201,168,76,0.12)' }}
            >
                <div
                    className="max-w-7xl mx-auto flex items-center justify-between"
                    style={{ padding: '16px 24px' }}
                >
                    <div className="flex items-center gap-3">
                        <img src="/icons/fincalix-logo.png" alt="FinCalix logo" className="rounded-xl" style={{ width: '32px', height: '32px' }} />
                        <span className="fc-font-display text-xl font-bold" style={{ color: '#C9A84C', letterSpacing: '-0.3px' }}>
                            FinCalix
                        </span>
                    </div>
                    <PlayStoreBadge />
                </div>
            </nav>

            {/* ─────────────────────────── HERO ────── */}
            <section
                className="relative min-h-screen flex items-center"
                style={{
                    paddingTop: '88px',
                    background: `
                        radial-gradient(ellipse at 65% 28%, rgba(201,168,76,0.13) 0%, transparent 52%),
                        radial-gradient(ellipse at 18% 78%, rgba(139,92,246,0.10) 0%, transparent 48%),
                        #050D1A
                    `,
                }}
            >
                <ParticleField />

                {/* Big gold glow behind headline */}
                <div
                    className="absolute pointer-events-none"
                    style={{
                        top: '30%',
                        left: '20%',
                        width: '700px',
                        height: '450px',
                        background: 'radial-gradient(ellipse, rgba(201,168,76,0.1) 0%, transparent 70%)',
                        transform: 'translate(-30%, -50%)',
                        animation: 'fc-glow-pulse 5s ease-in-out infinite',
                    }}
                />

                <div className="relative z-10 max-w-7xl mx-auto w-full" style={{ padding: '40px 24px 80px' }}>
                    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

                        {/* ── Left text ── */}
                        <div className="flex-1 text-center lg:text-left" style={{ maxWidth: '560px' }}>
                            {/* Badge */}
                            <div
                                className="inline-flex items-center gap-2 rounded-full fc-font-mono text-xs font-medium mb-8"
                                style={{
                                    padding: '8px 16px',
                                    background: 'rgba(201,168,76,0.1)',
                                    border: '1px solid rgba(201,168,76,0.3)',
                                    color: '#C9A84C',
                                }}
                            >
                                <span>✦</span>
                                Budget 2026-27 Updated · Made for India
                            </div>

                            {/* Headline */}
                            <h1
                                className="fc-font-display font-black leading-[1.05] mb-6"
                                style={{ fontSize: 'clamp(2.8rem, 6vw, 4.75rem)', letterSpacing: '-2.5px' }}
                            >
                                India's Smartest
                                <br />
                                <span
                                    style={{
                                        background: 'linear-gradient(120deg, #C9A84C 0%, #E8C96A 45%, #C9A84C 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                    }}
                                >
                                    Financial Super
                                </span>
                                <br />
                                Calculator
                            </h1>

                            {/* Sub */}
                            <p
                                className="fc-font-body mb-8 leading-relaxed"
                                style={{ fontSize: '17px', color: '#94A3B8', lineHeight: 1.65 }}
                            >
                                30+ calculators, 45+ government schemes, expense tracking — everything to master your money.{' '}
                                <strong style={{ color: '#e2e8f0' }}>Free. Offline. No login.</strong>
                            </p>

                            {/* Trust row */}
                            <div
                                className="fc-font-mono flex flex-wrap justify-center lg:justify-start items-center gap-x-3 gap-y-1 mb-10 text-xs"
                                style={{ color: '#4A5568' }}
                            >
                                {['30+ Calculators', '45 Schemes', '5 Languages', '100% Free'].map((t, i, arr) => (
                                    <span key={t} className="flex items-center gap-3">
                                        <span style={{ color: '#C9A84C' }}>{t}</span>
                                        {i < arr.length - 1 && <span>·</span>}
                                    </span>
                                ))}
                            </div>

                            <div className="flex flex-col items-center lg:items-start gap-3">
                                <PlayStoreBadge large />
                                <p className="text-xs" style={{ color: '#4A5568' }}>
                                    No account needed · Works offline
                                </p>
                            </div>
                        </div>

                        {/* ── Right phone ── */}
                        <div
                            className="hidden lg:flex relative flex-shrink-0 items-center justify-center"
                            style={{ width: '340px', height: '580px' }}
                        >
                            <PhoneMockup label="Home Screen" src="/screenshots/home.png" />

                            {/* Floating badge — top right */}
                            <div className="fc-badge-a absolute" style={{ top: '48px', right: '-28px' }}>
                                <div
                                    className="fc-glass rounded-2xl text-xs font-semibold whitespace-nowrap"
                                    style={{
                                        padding: '10px 14px',
                                        border: '1px solid rgba(201,168,76,0.4)',
                                        color: '#C9A84C',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                    }}
                                >
                                    ⚡ 30+ Calculators
                                </div>
                            </div>

                            {/* Floating badge — bottom left */}
                            <div className="fc-badge-b absolute" style={{ bottom: '110px', left: '-48px' }}>
                                <div
                                    className="fc-glass rounded-2xl text-xs font-semibold whitespace-nowrap"
                                    style={{
                                        padding: '10px 14px',
                                        border: '1px solid rgba(16,185,129,0.4)',
                                        color: '#10B981',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                    }}
                                >
                                    📅 Budget 2026-27
                                </div>
                            </div>

                            {/* Floating badge — left middle */}
                            <div className="fc-badge-c absolute" style={{ top: '200px', left: '-56px' }}>
                                <div
                                    className="fc-glass rounded-2xl text-xs font-semibold whitespace-nowrap"
                                    style={{
                                        padding: '10px 14px',
                                        border: '1px solid rgba(139,92,246,0.4)',
                                        color: '#8B5CF6',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                    }}
                                >
                                    🔒 100% Free
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll cue */}
                <div
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 fc-badge-b"
                    aria-hidden="true"
                >
                    <div
                        style={{
                            width: '1px',
                            height: '40px',
                            background: 'linear-gradient(to bottom, rgba(201,168,76,0.5), transparent)',
                        }}
                    />
                    <div className="rounded-full" style={{ width: '6px', height: '6px', background: '#C9A84C' }} />
                </div>
            </section>

            {/* ─────────────────────────── STATS STRIP ─── */}
            <section
                style={{
                    background: '#0A1628',
                    borderTop: '1px solid rgba(201,168,76,0.22)',
                    borderBottom: '1px solid rgba(201,168,76,0.1)',
                }}
            >
                <div className="max-w-5xl mx-auto" style={{ padding: '48px 24px' }}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {STATS.map((s, i) => (
                            <Reveal key={s.value} delay={i * 80}>
                                <div
                                    className="text-center py-4"
                                    style={{
                                        borderRight: i < 3 ? '1px solid rgba(201,168,76,0.1)' : undefined,
                                    }}
                                >
                                    <div
                                        className="fc-font-mono font-black mb-1"
                                        style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', color: '#C9A84C', letterSpacing: '-1px' }}
                                    >
                                        {s.value}
                                    </div>
                                    <div className="text-sm" style={{ color: '#94A3B8' }}>{s.label}</div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─────────────────────── FEATURE BLOCKS ─── */}
            {FEATURE_BLOCKS.map((block) => (
                <section
                    key={block.id}
                    style={{ background: block.phoneLeft ? '#050D1A' : '#0A1628', padding: '96px 24px' }}
                >
                    <div className="max-w-6xl mx-auto">
                        <div
                            className={
                                block.phoneLeft
                                    ? 'flex flex-col lg:flex-row items-center gap-12 lg:gap-20'
                                    : 'flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-20'
                            }
                        >
                                {/* Phone side */}
                                <div className="flex justify-center flex-shrink-0">
                                    <PhoneMockup label={block.screenLabel} src={block.screenSrc} />
                                </div>

                                {/* Text side */}
                                <div className="flex-1 text-center lg:text-left">
                                    <Reveal>
                                        <h2
                                            className="fc-font-display font-bold mb-4"
                                            style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', letterSpacing: '-0.8px', lineHeight: 1.12 }}
                                        >
                                            {block.headline}
                                        </h2>
                                    </Reveal>
                                    <Reveal delay={100}>
                                        <p
                                            className="fc-font-body mb-8 leading-relaxed"
                                            style={{ fontSize: '17px', color: '#94A3B8', lineHeight: 1.65 }}
                                        >
                                            {block.sub}
                                        </p>
                                    </Reveal>
                                    <Reveal delay={180}>
                                        <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-6">
                                            {block.pills.map((pill) => (
                                                <Pill key={pill}>{pill}</Pill>
                                            ))}
                                        </div>
                                    </Reveal>
                                    {block.highlight && (
                                        <Reveal delay={260}>
                                            <div
                                                className="flex items-start gap-3 rounded-2xl"
                                                style={{
                                                    padding: '16px 20px',
                                                    background: 'rgba(16,185,129,0.08)',
                                                    border: '1px solid rgba(16,185,129,0.28)',
                                                }}
                                            >
                                                <span style={{ fontSize: '18px', flexShrink: 0 }}>🎉</span>
                                                <p
                                                    className="fc-font-body text-sm font-medium leading-relaxed"
                                                    style={{ color: '#10B981' }}
                                                >
                                                    {block.highlight}
                                                </p>
                                            </div>
                                        </Reveal>
                                    )}
                                </div>
                        </div>
                    </div>
                </section>
            ))}

            {/* ─────────────────── MULTILINGUAL BANNER ─── */}
            <section
                style={{
                    background: `radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 60%), #050D1A`,
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    padding: '88px 24px',
                }}
            >
                <div className="max-w-4xl mx-auto text-center">
                    <Reveal>
                        <h2
                            className="fc-font-display font-bold mb-4"
                            style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', letterSpacing: '-0.5px' }}
                        >
                            Supports Multiple Indian Languages
                        </h2>
                    </Reveal>
                    <Reveal delay={100}>
                        <p className="fc-font-body text-lg mb-10" style={{ color: '#94A3B8' }}>
                            Calculate in your language — Hindi, Telugu, Tamil, Kannada, English
                        </p>
                    </Reveal>
                    <Reveal delay={180}>
                        <div className="flex flex-wrap justify-center gap-4">
                            {LANGUAGES.map((lang) => (
                                <div
                                    key={lang.label}
                                    className="fc-glass fc-font-body rounded-2xl text-sm font-semibold"
                                    style={{
                                        padding: '12px 22px',
                                        border: '1px solid rgba(201,168,76,0.25)',
                                        color: '#fff',
                                    }}
                                >
                                    🇮🇳 {lang.label}
                                </div>
                            ))}
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ─────────────────── CALCULATOR GRID ───────── */}
            <section style={{ background: '#0A1628', padding: '96px 24px' }}>
                <div className="max-w-6xl mx-auto">
                    <Reveal className="text-center mb-14">
                        <h2
                            className="fc-font-display font-bold mb-4"
                            style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', letterSpacing: '-0.5px' }}
                        >
                            Every Calculator You Need
                        </h2>
                        <p className="fc-font-body" style={{ color: '#94A3B8', fontSize: '17px' }}>
                            50+ financial tools built for Indian users
                        </p>
                    </Reveal>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {CALC_MODULES.map((mod, i) => (
                            <Reveal key={mod.name} delay={Math.min(i * 35, 360)}>
                                <div
                                    className="fc-calc-card flex flex-col items-center text-center rounded-2xl"
                                    style={{
                                        padding: '20px 12px',
                                        background: '#0F1E35',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        height: '100%',
                                    }}
                                >
                                    <div
                                        className="rounded-2xl flex items-center justify-center mb-3"
                                        style={{ width: '48px', height: '48px', fontSize: '22px', background: 'rgba(201,168,76,0.08)', flexShrink: 0 }}
                                    >
                                        {mod.emoji}
                                    </div>
                                    <div
                                        className="fc-font-body text-xs font-semibold leading-tight mb-1"
                                        style={{ color: '#e2e8f0' }}
                                    >
                                        {mod.name}
                                    </div>
                                    <div
                                        className="fc-font-body leading-tight"
                                        style={{ fontSize: '10px', color: '#4A5568' }}
                                    >
                                        {mod.desc}
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─────────────────── HOW IT WORKS ───────────── */}
            <section
                style={{
                    background: `radial-gradient(ellipse at 50% 100%, rgba(201,168,76,0.07) 0%, transparent 55%), #050D1A`,
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    padding: '96px 24px',
                }}
            >
                <div className="max-w-5xl mx-auto">
                    <Reveal className="text-center mb-16">
                        <h2
                            className="fc-font-display font-bold mb-4"
                            style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', letterSpacing: '-0.5px' }}
                        >
                            Start in Seconds
                        </h2>
                    </Reveal>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {STEPS.map((step, i) => (
                            <Reveal key={step.n} delay={i * 140}>
                                <div
                                    className="relative rounded-3xl text-center"
                                    style={{
                                        padding: '40px 32px',
                                        background: '#0F1E35',
                                        border: '1px solid rgba(201,168,76,0.15)',
                                        height: '100%',
                                    }}
                                >
                                    {/* Step number */}
                                    <div
                                        className="fc-font-mono font-black mb-4"
                                        style={{ fontSize: '3.5rem', color: 'rgba(201,168,76,0.18)', letterSpacing: '-4px', lineHeight: 1 }}
                                    >
                                        {step.n}
                                    </div>
                                    <h3
                                        className="fc-font-display font-bold mb-3"
                                        style={{ fontSize: '1.15rem', color: '#C9A84C' }}
                                    >
                                        {step.title}
                                    </h3>
                                    <p
                                        className="fc-font-body text-sm leading-relaxed"
                                        style={{ color: '#94A3B8' }}
                                    >
                                        {step.desc}
                                    </p>
                                </div>
                            </Reveal>
                        ))}
                    </div>

                    <Reveal delay={320} className="text-center mt-14">
                        <PlayStoreBadge large />
                        <p className="fc-font-body mt-3 text-xs" style={{ color: '#4A5568' }}>
                            Download Now — It's Free
                        </p>
                    </Reveal>
                </div>
            </section>

            {/* ─────────────────── FINAL CTA BANNER ──────── */}
            <section
                className="relative overflow-hidden text-center"
                style={{
                    background: '#0A1628',
                    borderTop: '1px solid rgba(201,168,76,0.18)',
                    padding: '112px 24px',
                }}
            >
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at 50% 50%, rgba(201,168,76,0.1) 0%, transparent 65%)',
                        animation: 'fc-glow-pulse 6s ease-in-out infinite',
                    }}
                />
                <div className="relative z-10 max-w-3xl mx-auto">
                    <Reveal>
                        <h2
                            className="fc-font-display font-black mb-6"
                            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-1.5px', lineHeight: 1.1 }}
                        >
                            Ready to Master Your{' '}
                            <span
                                style={{
                                    background: 'linear-gradient(120deg, #C9A84C, #E8C96A)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                Finances?
                            </span>
                        </h2>
                    </Reveal>
                    <Reveal delay={100}>
                        <p
                            className="fc-font-body text-lg mb-10 leading-relaxed"
                            style={{ color: '#94A3B8' }}
                        >
                            Join thousands of Indians using FinCalix to make smarter financial decisions.
                        </p>
                    </Reveal>
                    <Reveal delay={200}>
                        <div className="flex flex-col items-center gap-4">
                            <PlayStoreBadge large />
                            <p className="fc-font-mono text-xs" style={{ color: '#4A5568', letterSpacing: '0.3px' }}>
                                Free · No Login · Works Offline · Budget 2026-27 Updated
                            </p>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ─────────────────────────── FOOTER ────────── */}
            <footer style={{ background: '#050D1A', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="max-w-6xl mx-auto" style={{ padding: '56px 24px 32px' }}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                        {/* Col 1 — Brand */}
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <img src="/icons/fincalix-logo.png" alt="" className="rounded-xl" style={{ width: '32px', height: '32px' }} />
                                <span className="fc-font-display text-xl font-bold" style={{ color: '#C9A84C' }}>FinCalix</span>
                            </div>
                            <p className="fc-font-body text-sm" style={{ color: '#4A5568' }}>Financial Super Calculator</p>
                        </div>

                        {/* Col 2 — Links */}
                        <div className="flex flex-col gap-3">
                            <a
                                href="/privacy-policy"
                                className="fc-font-body text-sm transition-colors hover:text-white"
                                style={{ color: '#94A3B8' }}
                            >
                                Privacy Policy
                            </a>
                            <a
                                href={PLAY_STORE_URL}
                                className="fc-font-body text-sm transition-colors hover:text-white"
                                style={{ color: '#94A3B8' }}
                            >
                                Contact Us
                            </a>
                        </div>

                        {/* Col 3 — Made in India */}
                        <div className="fc-font-body text-sm" style={{ color: '#4A5568' }}>
                            Made with ❤️ in India
                        </div>
                    </div>

                    <div
                        className="fc-font-body text-xs text-center pt-6"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#4A5568' }}
                    >
                        © 2025 FinCalix. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
