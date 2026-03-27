import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fincalix.app';

// ── Deterministic particles (no Math.random on render) ────
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${((i * 4.73 + 7.3) % 80 + 10).toFixed(1)}%`,
    duration: +(8 + (i % 13)).toFixed(1),
    delay: +((i * 0.93 + 0.3) % 15).toFixed(1),
    opacity: +(0.2 + (i % 5) * 0.08).toFixed(2),
    size: 2 + (i % 2),
}));

// ── Screenshot cards ──────────────────────────────────────
const SCREENSHOTS_DATA = [
    { label: 'Home Dashboard',        caption: 'Your complete financial overview', src: '/screenshots/screen1-home.png'        },
    { label: '30+ Calculators',       caption: 'SIP, EMI, Tax and more',           src: '/screenshots/screen2-calculators.png' },
    { label: 'Income Tax Calculator', caption: 'Old vs New Regime 2026-27',        src: '/screenshots/screen3-tax.png'         },
    { label: 'Government Schemes',    caption: '45+ schemes discovered',           src: '/screenshots/screen4-schemes.png'     },
    { label: 'Expense Tracker',       caption: 'Track every rupee',                src: '/screenshots/screen5-expense.png'     },
    { label: 'Multiple Languages',    caption: 'Hindi, Telugu, Tamil & more',      src: '/screenshots/screen6-language.png'    },
    { label: 'Age Calculator',        caption: 'Know your generation',             src: '/screenshots/screen7-age.png'         },
    { label: 'Sukanya Samriddhi',     caption: 'Girl child savings scheme',        src: '/screenshots/screen8-sukanya.png'     },
];

// ── Data ─────────────────────────────────────────────────
const CALC_MODULES = [
    { emoji: '📈', name: 'SIP Calculator',      desc: 'Mutual Fund Returns',        cat: 'Investment' },
    { emoji: '🏠', name: 'EMI Calculator',       desc: 'Home, Car, Personal Loans',  cat: 'Loans'      },
    { emoji: '🏦', name: 'FD / RD Calculator',   desc: 'Fixed Deposit Returns',      cat: 'Investment' },
    { emoji: '💰', name: 'PPF Calculator',        desc: 'Public Provident Fund',      cat: 'Investment' },
    { emoji: '🧾', name: 'HRA Calculator',        desc: 'House Rent Allowance',       cat: 'Tax'        },
    { emoji: '📊', name: 'GST Calculator',        desc: 'Tax Inclusive / Exclusive',  cat: 'Tax'        },
    { emoji: '💼', name: 'Income Tax',            desc: 'Old vs New Regime',          cat: 'Tax'        },
    { emoji: '📒', name: 'Expense Tracker',       desc: 'Budget & Daily Tracking',    cat: 'Tracker'    },
    { emoji: '🌍', name: 'World Clock',           desc: 'Global Time Zones',          cat: 'Other'      },
    { emoji: '💹', name: 'Lumpsum Calculator',    desc: 'One-time Investment',        cat: 'Investment' },
    { emoji: '🏛️', name: 'NPS Calculator',        desc: 'National Pension System',    cat: 'Investment' },
    { emoji: '👧', name: 'Sukanya Samriddhi',     desc: 'Girl Child Savings',         cat: 'Savings'    },
    { emoji: '🎂', name: 'Age Calculator',        desc: 'Exact Age & Generation',     cat: 'Other'      },
    { emoji: '🏘️', name: 'Property Calculator',   desc: 'Real Estate Returns',        cat: 'Investment' },
    { emoji: '🔄', name: 'Compare Scenarios',     desc: 'Side by Side Comparison',    cat: 'Tracker'    },
    { emoji: '🎯', name: 'Goal Planner',          desc: 'Financial Milestones',       cat: 'Tracker'    },
    { emoji: '🤖', name: 'Financial Advisor',     desc: 'AI-Powered Insights',        cat: 'Other'      },
    { emoji: '📋', name: 'Govt Schemes',          desc: '45+ Schemes',                cat: 'Other'      },
];

const CATEGORIES = ['All', 'Tax', 'Loans', 'Investment', 'Savings', 'Tracker'];

const FAQS = [
    { q: 'Is FinCalix free to use?',                     a: 'Yes, completely free. No subscription, no login, no hidden charges. Download and start calculating.' },
    { q: 'Does FinCalix work offline?',                   a: 'Yes, all 30+ calculators work completely offline. No internet needed after download.' },
    { q: 'Is the Income Tax updated for Budget 2026-27?', a: 'Yes, fully updated. Zero tax on income up to ₹12 lakh under New Regime after standard deduction.' },
    { q: 'Which languages are supported?',                a: 'English, हिंदी, తెలుగు, தமிழ், ಕನ್ನಡ, മലയാളം — 6 Indian languages supported.' },
    { q: 'How many calculators does FinCalix have?',      a: '30+ calculators — SIP, EMI, FD, PPF, HRA, GST, Income Tax, NPS, Sukanya Samriddhi, Age Calculator, Expense Tracker and more.' },
];

const STATS = [
    { value: 30, suffix: '+', label: 'Smart Calculators' },
    { value: 45, suffix: '+', label: 'Govt Schemes'      },
    { value: 5,  suffix: '',  label: 'Indian Languages'  },
    { value: 0,  suffix: '∞', label: 'Free Forever'      },
];

const SCHEMES = [
    'PM Kisan Samman Nidhi', 'Sukanya Samriddhi Yojana', 'PPF', 'NPS', 'PMAY',
    'Kisan Credit Card', 'PM Fasal Bima Yojana', 'Ayushman Bharat',
    'PM Awas Yojana', 'Mudra Yojana', 'Stand Up India', 'PM Jan Dhan', 'PM Vaya Vandana',
];

// ── Global CSS ────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');

*,*::before,*::after{box-sizing:border-box}
.fc-display{font-family:'Bricolage Grotesque',sans-serif}
.fc-body{font-family:'Inter',sans-serif}
.fc-mono{font-family:'JetBrains Mono',monospace}

@keyframes fc-shimmer{0%{background-position:0% center}100%{background-position:200% center}}
@keyframes fc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes fc-orb-1{0%,100%{transform:translate(0,0)}33%{transform:translate(40px,-30px)}66%{transform:translate(-20px,20px)}}
@keyframes fc-orb-2{0%,100%{transform:translate(0,0)}33%{transform:translate(-50px,30px)}66%{transform:translate(30px,-20px)}}
@keyframes fc-orb-3{0%,100%{transform:translate(0,0)}33%{transform:translate(30px,40px)}66%{transform:translate(-40px,-30px)}}
@keyframes fc-marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes fc-fade-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes fc-fade-in{from{opacity:0}to{opacity:1}}

.fc-hero-badge{animation:fc-fade-in .6s .15s both}
.fc-hero-h1{animation:fc-fade-up .8s .25s both cubic-bezier(.16,1,.3,1)}
.fc-hero-sub{animation:fc-fade-up .8s .45s both cubic-bezier(.16,1,.3,1)}
.fc-hero-pills{animation:fc-fade-up .8s .55s both cubic-bezier(.16,1,.3,1)}
.fc-hero-cta{animation:fc-fade-up .8s .65s both cubic-bezier(.16,1,.3,1)}
.fc-hero-phone{animation:fc-fade-up .9s .85s both cubic-bezier(.16,1,.3,1)}

.fc-gold-text{
  background:linear-gradient(135deg,#C9A84C 0%,#F5DFA0 50%,#C9A84C 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;background-size:200% auto;
  animation:fc-shimmer 3s linear infinite}

.fc-nav{
  position:fixed;top:0;left:0;right:0;z-index:1000;height:64px;
  background:rgba(2,8,16,.88);
  backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);
  border-bottom:1px solid rgba(255,255,255,.06);
  display:flex;align-items:center;
  transition:transform .3s ease;box-sizing:border-box;width:100%}
.fc-nav.fc-hidden{transform:translateY(-100%)}

.fc-grid-bg{
  background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);
  background-size:60px 60px}

.fc-reveal{
  opacity:0;transform:translateY(30px);
  transition:opacity .6s cubic-bezier(.16,1,.3,1),transform .6s cubic-bezier(.16,1,.3,1)}
.fc-reveal.fc-visible{opacity:1;transform:translateY(0)}

.fc-bento{
  background:#0B1929;border:1px solid rgba(255,255,255,.06);border-radius:20px;overflow:hidden;
  transition:border-color .3s,background .3s,transform .3s,box-shadow .3s;will-change:transform}
.fc-bento:hover{border-color:rgba(201,168,76,.2);background:#0F2035;box-shadow:0 0 40px rgba(201,168,76,.05);transform:translateY(-2px)}

.fc-bento-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px;grid-auto-rows:minmax(180px,auto)}
@media(max-width:1023px){
  .fc-bento-grid{grid-template-columns:repeat(2,1fr)}
  .fc-bento-grid>*{grid-column:auto!important;grid-row:auto!important}}
@media(max-width:639px){
  .fc-bento-grid{grid-template-columns:1fr}
  .fc-floating-badge{display:none!important}}

.fc-calc{
  background:#0B1929;border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:20px;
  transition:border-color .3s,transform .3s,background .3s;will-change:transform;cursor:default;height:100%}
.fc-calc:hover{
  background:radial-gradient(circle at var(--mx,50%) var(--my,50%),rgba(201,168,76,.08),#0B1929 60%);
  border-color:rgba(201,168,76,.3);transform:translateY(-4px)}

.fc-tab{
  padding:7px 18px;border-radius:100px;font-size:13px;font-weight:500;cursor:pointer;
  border:1px solid transparent;transition:all .2s;font-family:'Inter',sans-serif;background:none;color:#475569}
.fc-tab:hover{color:#94A3B8}
.fc-tab.active{background:rgba(201,168,76,.08);border-color:rgba(201,168,76,.25);color:#C9A84C}

.fc-accordion{background:#0B1929;border:1px solid rgba(255,255,255,.07);border-radius:16px;overflow:hidden;transition:border-color .25s}
.fc-accordion.open{border-color:rgba(201,168,76,.35)}

.fc-stats-grid{display:grid;grid-template-columns:repeat(4,1fr)}
@media(max-width:600px){.fc-stats-grid{grid-template-columns:repeat(2,1fr)}}

.fc-faq-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}
@media(max-width:767px){.fc-faq-grid{grid-template-columns:1fr}}

::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:#020810}
::-webkit-scrollbar-thumb{background:rgba(201,168,76,.3);border-radius:3px}

/* ── Hero orb float animations ── */
@keyframes fc-orb-float-1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(80px,60px) scale(1.1)}66%{transform:translate(-40px,80px) scale(.9)}}
@keyframes fc-orb-float-2{0%,100%{transform:translate(0,0)}50%{transform:translate(-60px,100px)}}
@keyframes fc-orb-float-3{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.2)}}

/* ── Floating particles ── */
@keyframes fc-particle-float{
  0%{transform:translateY(100vh);opacity:0}
  10%{opacity:var(--p-opacity,.4)}
  90%{opacity:var(--p-opacity,.4)}
  100%{transform:translateY(-100px);opacity:0}}

/* ── Navbar Play Store badge — hide on mobile ── */
.fc-nav-badge{display:inline-flex;align-items:center}
@media(max-width:767px){.fc-nav-badge{display:none!important}}

/* ── Screenshots carousel ── */
.fc-carousel{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;touch-action:pan-x}
.fc-carousel::-webkit-scrollbar{display:none}

/* ── Carousel arrows — desktop only ── */
.fc-carousel-arrow{display:flex;align-items:center;justify-content:center}
@media(max-width:767px){.fc-carousel-arrow{display:none!important}}

.fc-hero-h1-size{font-size:clamp(48px,8vw,88px)}
.fc-calc-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}
.fc-footer-grid{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.fc-social-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}

/* ── Mobile (<768px) ── */
@media(max-width:767px){
  html,body{overflow-x:hidden}

  /* Hero */
  .fc-hero-section{padding-top:100px!important;padding-bottom:60px!important;padding-left:20px!important;padding-right:20px!important}
  .fc-hero-phone{display:none!important}
  .fc-hero-h1-size{font-size:clamp(32px,10vw,56px)}
  .fc-hero-sub{font-size:15px!important}

  /* All standard sections: 60px vertical, 20px horizontal */
  .fc-sec{padding-top:60px!important;padding-bottom:60px!important;padding-left:20px!important;padding-right:20px!important}
  .fc-stats-sec{padding:32px 20px!important}
  .fc-final-cta{padding:80px 20px!important}

  /* Screenshots: keep full-bleed carousel, only reduce vertical */
  .fc-screenshots-sec{padding-top:60px!important;padding-bottom:60px!important}
  .fc-carousel-track{padding:20px 20px 32px!important}

  /* Bento "30+" headline */
  .fc-bento-big-num{font-size:44px!important}

  /* Stats strip: remove the rogue right-border on the 2nd item in 2-col wrap */
  .fc-stat-col:nth-child(even){border-right:none!important}

  /* Grids */
  .fc-calc-grid{grid-template-columns:repeat(2,1fr)!important}
  .fc-social-grid{grid-template-columns:1fr!important}
  .fc-footer-grid{grid-template-columns:1fr!important}
  .fc-footer-inner{padding:40px 20px 24px!important}
}

/* ── Tablet (768–1023px) ── */
@media(min-width:768px) and (max-width:1023px){
  .fc-calc-grid{grid-template-columns:repeat(3,1fr)!important}
}
`;

// ── Scroll reveal ─────────────────────────────────────────
function Reveal({ children, delay = 0, className = '', style }: { children: ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { el.classList.add('fc-visible'); obs.disconnect(); } },
            { threshold: 0.08 },
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    const s: React.CSSProperties = { ...(delay ? { transitionDelay: `${delay}ms` } : {}), ...style };
    return <div ref={ref} className={`fc-reveal ${className}`} style={s}>{children}</div>;
}

// ── Play Store badge ──────────────────────────────────────
function PlayStoreBadge({ large: _large, className = '' }: { large?: boolean; className?: string }) {
    return (
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
            className={`inline-block ${className}`}
            style={{ transition: 'all .2s ease', display: 'inline-block' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'; (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.filter = 'none'; }}>
            <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                alt="Get it on Google Play" style={{ height: '60px', width: 'auto' }} />
        </a>
    );
}

// ── Phone mockup ─────────────────────────────────────────
function PhoneMockup({ src = '/screenshots/home.png', label = 'FinCalix App' }: { src?: string; label?: string }) {
    return (
        <div style={{ width: '280px', height: '580px', borderRadius: '40px', border: '8px solid rgba(255,255,255,.08)', background: '#0B1929', boxShadow: '0 0 0 1px rgba(255,255,255,.04),0 50px 100px rgba(0,0,0,.5),0 0 80px rgba(201,168,76,.08)', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
            <div style={{ height: '44px', background: '#050D1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
                <span className="fc-mono" style={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}>9:41</span>
                <div style={{ width: '80px', height: '20px', borderRadius: '10px', background: '#050D1A', border: '1px solid rgba(255,255,255,.06)' }} />
                <div style={{ display: 'flex', gap: '4px', opacity: 0.6 }}>
                    <div style={{ width: '14px', height: '10px', borderRadius: '2px', background: 'rgba(255,255,255,.5)' }} />
                    <div style={{ width: '18px', height: '12px', borderRadius: '2px', background: 'rgba(255,255,255,.7)' }} />
                </div>
            </div>
            <img src={src} alt={label} loading="lazy" style={{ width: '100%', height: 'calc(100% - 44px)', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
        </div>
    );
}

// ── Floating badge ────────────────────────────────────────
function FloatingBadge({ children }: { children: ReactNode }) {
    return (
        <div style={{ background: 'rgba(11,25,41,.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '12px', padding: '8px 12px', boxShadow: '0 8px 32px rgba(0,0,0,.3)', fontSize: '12px', fontWeight: 600, color: '#E2E8F0', whiteSpace: 'nowrap', fontFamily: 'Inter,sans-serif' }}>
            {children}
        </div>
    );
}

// ── Floating particles ────────────────────────────────────
function Particles() {
    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
            {PARTICLES.map(p => (
                <div key={p.id} style={{
                    position: 'absolute',
                    left: p.left,
                    bottom: 0,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    borderRadius: '50%',
                    background: '#C9A84C',
                    boxShadow: '0 0 4px rgba(201,168,76,.8)',
                    animation: `fc-particle-float ${p.duration}s ${p.delay}s linear infinite`,
                    ['--p-opacity' as string]: String(p.opacity),
                } as React.CSSProperties} />
            ))}
        </div>
    );
}

// ── Footer social icon ────────────────────────────────────
function FooterSocialIcon({ href, label, hoverBg, children }: { href: string; label: string; hoverBg: string; children: ReactNode }) {
    return (
        <a href={href} target={href.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer" aria-label={label}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', transition: 'all .2s', textDecoration: 'none', flexShrink: 0 }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = hoverBg; el.style.borderColor = 'transparent'; el.style.color = '#fff'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,.05)'; el.style.borderColor = 'rgba(255,255,255,.08)'; el.style.color = '#475569'; }}>
            {children}
        </a>
    );
}

// ── Navbar ────────────────────────────────────────────────
function NavBar() {
    const [hidden, setHidden] = useState(false);
    const prevY = useRef(0);
    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY;
            if (y > 80) setHidden(y > prevY.current);
            else setHidden(false);
            prevY.current = y;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    return (
        <nav className={`fc-nav${hidden ? ' fc-hidden' : ''}`} style={{ padding: '0 24px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/icons/fincalix-logo.png" alt="FinCalix" style={{ width: '30px', height: '30px', borderRadius: '8px' }} />
                    <span className="fc-display" style={{ fontSize: '18px', fontWeight: 700, color: '#C9A84C', letterSpacing: '-0.3px' }}>FinCalix</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <a href="/privacy-policy" className="fc-body" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none', transition: 'color .2s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>Privacy</a>
                    {/* Play Store badge — hidden on mobile via .fc-nav-badge */}
                    <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="fc-nav-badge"
                        style={{ transition: 'all .2s ease' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)'; (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.filter = 'none'; }}>
                        <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                            alt="Get it on Google Play" style={{ height: '40px', width: 'auto', display: 'block' }} />
                    </a>
                </div>
            </div>
        </nav>
    );
}

// ── Hero ──────────────────────────────────────────────────
function HeroSection() {
    return (
        <section className="fc-hero-section" style={{ position: 'relative', minHeight: '100vh', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '140px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px', textAlign: 'center', background: '#020810', overflow: 'hidden' }}>
            {/* Layer 1 — base radial vignettes */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 50% at 50% -10%,rgba(201,168,76,.1),transparent)' }} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 80% 110%,rgba(59,130,246,.05),transparent)' }} />
            {/* Layer 3 — grid overlay */}
            <div className="fc-grid-bg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
            {/* Layer 2 — animated orbs */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {/* Orb 1 — Gold, top-left */}
                <div style={{ position: 'absolute', top: '-200px', left: '-100px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(201,168,76,.15),transparent 70%)', filter: 'blur(80px)', animation: 'fc-orb-float-1 12s ease-in-out infinite', willChange: 'transform' }} />
                {/* Orb 2 — Blue, top-right */}
                <div style={{ position: 'absolute', top: '-100px', right: '-150px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,.1),transparent 70%)', filter: 'blur(80px)', animation: 'fc-orb-float-2 15s ease-in-out infinite', willChange: 'transform' }} />
                {/* Orb 3 — Purple, bottom-center */}
                <div style={{ position: 'absolute', bottom: '-100px', left: '50%', width: '700px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,.08),transparent 70%)', filter: 'blur(100px)', animation: 'fc-orb-float-3 18s ease-in-out infinite', willChange: 'transform' }} />
            </div>
            {/* Layer 5 — floating particles */}
            <Particles />
            {/* Layer 4 — bottom fade */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '300px', background: 'linear-gradient(transparent,#020810)', pointerEvents: 'none', zIndex: 0 }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '760px', margin: '0 auto', width: '100%' }}>
                <div className="fc-hero-badge" style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                    <span className="fc-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 18px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', color: '#C9A84C', background: 'linear-gradient(#020810,#020810) padding-box,linear-gradient(135deg,#C9A84C,#3B82F6) border-box', border: '1px solid transparent' }}>
                        ✦ Budget 2026-27 Updated · Made for India
                    </span>
                </div>

                <h1 className="fc-display fc-hero-h1 fc-hero-h1-size" style={{ fontWeight: 800, lineHeight: 0.95, letterSpacing: '-0.03em', margin: '0 0 28px' }}>
                    <span style={{ color: '#FFFFFF', display: 'block' }}>India's Smartest</span>
                    <span className="fc-gold-text" style={{ display: 'block' }}>Financial</span>
                    <span style={{ color: '#FFFFFF', display: 'block' }}>Calculator</span>
                </h1>

                <p className="fc-body fc-hero-sub" style={{ fontSize: '18px', color: '#94A3B8', lineHeight: 1.65, maxWidth: '520px', margin: '0 auto 32px', width: '100%' }}>
                    30+ calculators, 45+ government schemes, expense tracking — everything to master your money.
                </p>

                <div className="fc-hero-pills" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginBottom: '40px' }}>
                    {['30+ Calculators', '45 Govt Schemes', '5 Languages', '100% Free'].map(pill => (
                        <span key={pill} className="fc-body" style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '13px', color: '#C9A84C', background: 'rgba(201,168,76,.06)', border: '1px solid rgba(201,168,76,.12)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '6px' }}>●</span>{pill}
                        </span>
                    ))}
                </div>

                <div className="fc-hero-cta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <PlayStoreBadge />
                    <p className="fc-body" style={{ fontSize: '12px', color: '#475569' }}>No account needed · Works offline · Budget 2026-27 updated</p>
                </div>
            </div>

            {/* Phone + floating badges */}
            <div className="fc-hero-phone" style={{ position: 'relative', marginTop: '60px', zIndex: 1 }}>
                <div style={{ animation: 'fc-float 6s 1.7s ease-in-out infinite', willChange: 'transform' }}>
                    <PhoneMockup src="/screenshots/home.png" label="FinCalix Home Screen" />
                </div>
                <div className="fc-floating-badge" style={{ position: 'absolute', top: '80px', right: '-16px', animation: 'fc-float 5s 0s ease-in-out infinite', willChange: 'transform' }}>
                    <FloatingBadge>📈 SIP Calculator</FloatingBadge>
                </div>
                <div className="fc-floating-badge" style={{ position: 'absolute', bottom: '100px', left: '-20px', animation: 'fc-float 5s 1.5s ease-in-out infinite', willChange: 'transform' }}>
                    <FloatingBadge>🏠 EMI Calculator</FloatingBadge>
                </div>
                <div className="fc-floating-badge" style={{ position: 'absolute', top: '240px', left: '-30px', animation: 'fc-float 5s 0.8s ease-in-out infinite', willChange: 'transform' }}>
                    <FloatingBadge>💰 Budget 2026-27</FloatingBadge>
                </div>
                <div className="fc-floating-badge" style={{ position: 'absolute', top: '320px', right: '-16px', animation: 'fc-float 5s 2s ease-in-out infinite', willChange: 'transform' }}>
                    <FloatingBadge>📊 30+ Tools</FloatingBadge>
                </div>
            </div>
        </section>
    );
}

// ── Stats strip ───────────────────────────────────────────
function StatItem({ stat }: { stat: typeof STATS[0] }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const animated = useRef(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || stat.value === 0) return;
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !animated.current) {
                animated.current = true;
                const start = performance.now();
                const tick = (now: number) => {
                    const p = Math.min((now - start) / 1200, 1);
                    setCount(Math.round((1 - Math.pow(1 - p, 3)) * stat.value));
                    if (p < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
                obs.disconnect();
            }
        }, { threshold: 0.3 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [stat.value]);
    return (
        <div ref={ref} style={{ textAlign: 'center', padding: '8px 16px' }}>
            <div className="fc-mono fc-gold-text" style={{ fontSize: 'clamp(32px,5vw,48px)', fontWeight: 600, lineHeight: 1.1 }}>
                {stat.value === 0 ? '∞' : `${count}${stat.suffix}`}
            </div>
            <div className="fc-body" style={{ fontSize: '13px', color: '#94A3B8', marginTop: '6px' }}>{stat.label}</div>
        </div>
    );
}

function StatsStrip() {
    return (
        <section className="fc-stats-sec" style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(201,168,76,.02)', borderTop: '1px solid rgba(201,168,76,.08)', borderBottom: '1px solid rgba(201,168,76,.08)', padding: '48px 24px' }}>
            <div className="fc-stats-grid" style={{ maxWidth: '900px', margin: '0 auto' }}>
                {STATS.map((s, i) => (
                    <div key={s.label} className="fc-stat-col" style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
                        <StatItem stat={s} />
                    </div>
                ))}
            </div>
        </section>
    );
}

// ── Bento grid ────────────────────────────────────────────
function BentoGrid() {
    return (
        <section className="fc-sec" style={{ width: '100%', boxSizing: 'border-box', background: '#060F1C', padding: '96px 24px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <Reveal className="text-center" style={{ marginBottom: '56px' }}>
                    <h2 className="fc-display" style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', marginBottom: '12px' }}>
                        Everything You Need to Master Money
                    </h2>
                    <p className="fc-body" style={{ fontSize: '16px', color: '#94A3B8' }}>Built specifically for Indian financial planning</p>
                </Reveal>

                <div className="fc-bento-grid">
                    {/* Card A — 30+ Calculators (col 1-9, rows 1-2) */}
                    <Reveal style={{ gridColumn: '1 / 9', gridRow: '1 / 3' }}>
                        <div className="fc-bento" style={{ height: '100%', padding: '32px', position: 'relative', minHeight: '400px', background: 'linear-gradient(135deg,#0B1929,#0F1E35)' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <span className="fc-mono fc-gold-text fc-bento-big-num" style={{ fontSize: '72px', fontWeight: 600, lineHeight: 1 }}>30+</span>
                                <div className="fc-body" style={{ fontSize: '14px', color: '#94A3B8', marginTop: '4px' }}>Smart Financial Calculators</div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '100px' }}>
                                {['SIP', 'EMI', 'PPF', 'FD / RD', 'HRA', 'GST', 'Income Tax', 'NPS', 'Sukanya', 'Age', 'Lumpsum', 'More +'].map(tag => (
                                    <span key={tag} className="fc-body" style={{ padding: '5px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 500, background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.15)', color: '#C9A84C' }}>{tag}</span>
                                ))}
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '200px' }}>
                                <img src="/screenshots/calculators.png" alt="Calculators" loading="lazy" style={{ width: '100%', height: '180px', objectFit: 'cover', objectPosition: 'top', borderRadius: '16px 16px 0 0', border: '1px solid rgba(255,255,255,.1)', borderBottom: 'none', display: 'block' }} />
                            </div>
                        </div>
                    </Reveal>

                    {/* Card B — Budget 2026-27 (col 9-13, row 1) */}
                    <Reveal delay={80} style={{ gridColumn: '9 / 13', gridRow: '1 / 2' }}>
                        <div className="fc-bento" style={{ height: '100%', padding: '24px', background: 'linear-gradient(135deg,rgba(201,168,76,.06),rgba(201,168,76,.02))' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>📅</div>
                            <h3 className="fc-display" style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Budget 2026-27</h3>
                            <p className="fc-body" style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.55, marginBottom: '16px' }}>Zero tax on income up to ₹12L under New Regime</p>
                            <span className="fc-body" style={{ padding: '4px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', color: '#10B981' }}>✓ Updated</span>
                        </div>
                    </Reveal>

                    {/* Card C — Works Offline (col 9-13, row 2) */}
                    <Reveal delay={120} style={{ gridColumn: '9 / 13', gridRow: '2 / 3' }}>
                        <div className="fc-bento" style={{ height: '100%', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', marginBottom: '16px', height: '36px' }}>
                                {[6, 10, 14, 18, 22].map((h, i) => (
                                    <div key={i} style={{ width: '8px', height: `${h}px`, borderRadius: '3px', background: i < 3 ? '#3B82F6' : 'rgba(255,255,255,.12)' }} />
                                ))}
                                <span style={{ marginLeft: '8px', fontSize: '20px' }}>📵</span>
                            </div>
                            <h3 className="fc-display" style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>100% Offline</h3>
                            <p className="fc-body" style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.55 }}>No internet needed. All calculators work without a connection.</p>
                        </div>
                    </Reveal>

                    {/* Card E — Schemes marquee (col 1-9, row 3) */}
                    <Reveal delay={40} style={{ gridColumn: '1 / 9', gridRow: '3 / 4' }}>
                        <div className="fc-bento" style={{ height: '100%', padding: '28px 28px 0', overflow: 'hidden' }}>
                            <div style={{ marginBottom: '18px' }}>
                                <div className="fc-mono" style={{ fontSize: '11px', color: '#8B5CF6', fontWeight: 600, letterSpacing: '.1em', marginBottom: '8px' }}>GOVERNMENT SCHEMES</div>
                                <h3 className="fc-display" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Discover 45+ Government Schemes</h3>
                            </div>
                            <div style={{ overflow: 'hidden', paddingBottom: '28px' }}>
                                <div style={{ display: 'flex', gap: '10px', animation: 'fc-marquee 28s linear infinite', width: 'max-content' }}>
                                    {[...SCHEMES, ...SCHEMES].map((s, i) => (
                                        <span key={i} className="fc-body" style={{ padding: '6px 14px', borderRadius: '100px', background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.2)', color: '#8B5CF6', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>{s}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Reveal>

                    {/* Card D — 5 Languages (col 9-13, row 3) */}
                    <Reveal delay={160} style={{ gridColumn: '9 / 13', gridRow: '3 / 4' }}>
                        <div className="fc-bento" style={{ height: '100%', padding: '24px' }}>
                            <div className="fc-mono" style={{ fontSize: '11px', color: '#C9A84C', fontWeight: 600, letterSpacing: '.1em', marginBottom: '16px' }}>6 LANGUAGES</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                {[
                                    { label: '🇮🇳 English', active: true },
                                    { label: 'हिंदी' }, { label: 'తెలుగు' },
                                    { label: 'தமிழ்' }, { label: 'ಕನ್ನಡ' }, { label: 'മലയാളം' },
                                ].map(lang => (
                                    <span key={lang.label} className="fc-body" style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: lang.active ? 600 : 400, background: lang.active ? 'rgba(201,168,76,.12)' : 'rgba(255,255,255,.04)', border: `1px solid ${lang.active ? 'rgba(201,168,76,.3)' : 'rgba(255,255,255,.06)'}`, color: lang.active ? '#C9A84C' : '#94A3B8', display: 'inline-block' }}>{lang.label}</span>
                                ))}
                            </div>
                        </div>
                    </Reveal>

                    {/* Card F — Expense Tracker (col 1-7, row 4) */}
                    <Reveal delay={60} style={{ gridColumn: '1 / 7', gridRow: '4 / 5' }}>
                        <div className="fc-bento" style={{ height: '100%', padding: '24px' }}>
                            <div className="fc-mono" style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600, letterSpacing: '.1em', marginBottom: '12px' }}>EXPENSE TRACKER</div>
                            <div style={{ marginBottom: '16px' }}>
                                <div className="fc-mono" style={{ fontSize: '28px', fontWeight: 600, color: '#fff' }}>₹78,700</div>
                                <div className="fc-body" style={{ fontSize: '12px', color: '#94A3B8' }}>Spent this month</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '56px', marginBottom: '14px' }}>
                                {[{ h: '65%', c: '#EF4444', l: 'Food' }, { h: '45%', c: '#F59E0B', l: 'Travel' }, { h: '80%', c: '#3B82F6', l: 'Rent' }, { h: '30%', c: '#8B5CF6', l: 'Entmt' }, { h: '55%', c: '#10B981', l: 'Savings' }].map(b => (
                                    <div key={b.l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                                        <div style={{ width: '100%', height: b.h, borderRadius: '4px 4px 0 0', background: b.c, opacity: 0.8 }} />
                                        <span className="fc-body" style={{ fontSize: '9px', color: '#475569' }}>{b.l}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)' }}>
                                <span className="fc-body" style={{ fontSize: '12px', color: '#10B981' }}>Financial Health: 90 / 100 🟢</span>
                            </div>
                        </div>
                    </Reveal>

                    {/* Card G — Free Forever (col 7-13, row 4) */}
                    <Reveal delay={100} style={{ gridColumn: '7 / 13', gridRow: '4 / 5' }}>
                        <div className="fc-bento" style={{ height: '100%', padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                                <span className="fc-mono fc-gold-text" style={{ fontSize: '52px', fontWeight: 600, lineHeight: 1 }}>₹0</span>
                                <div className="fc-display" style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginTop: '8px', marginBottom: '20px' }}>Free Forever</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {['No subscription fees', 'No login required', 'No advertisements', 'No hidden charges'].map(item => (
                                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0, color: '#10B981' }}>✓</span>
                                        <span className="fc-body" style={{ fontSize: '13px', color: '#94A3B8' }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}

// ── Screenshots carousel ──────────────────────────────────
function ScreenshotsSection() {
    const carouselRef = useRef<HTMLDivElement>(null);
    const scroll = (dir: 1 | -1) => {
        carouselRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });
    };
    return (
        <section className="fc-screenshots-sec" style={{ background: '#020810', borderTop: '1px solid rgba(255,255,255,.04)', paddingTop: '96px', paddingBottom: '96px', paddingLeft: '0', paddingRight: '0', overflow: 'hidden' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>
                <Reveal className="text-center" style={{ marginBottom: '40px' }}>
                    <h2 className="fc-display" style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', marginBottom: '12px' }}>
                        See FinCalix in Action
                    </h2>
                    <p className="fc-body" style={{ fontSize: '16px', color: '#94A3B8' }}>Real screenshots from the app</p>
                </Reveal>
            </div>

            {/* Carousel + arrows wrapper */}
            <div style={{ position: 'relative' }}>
                {/* Left arrow */}
                <button className="fc-carousel-arrow" onClick={() => scroll(-1)} aria-label="Scroll left"
                    style={{ position: 'absolute', left: '16px', top: '44%', transform: 'translateY(-50%)', zIndex: 10, width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', cursor: 'pointer', color: '#E2E8F0', fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>
                    ‹
                </button>

                {/* Scrollable track */}
                <div ref={carouselRef} className="fc-carousel fc-carousel-track"
                    style={{ display: 'flex', gap: '20px', overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '40px 60px' }}>
                    {SCREENSHOTS_DATA.map((item, i) => (
                        <div key={i} style={{ scrollSnapAlign: 'start', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            {/* Card */}
                            <div
                                style={{ width: '260px', borderRadius: '32px', overflow: 'hidden', border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 20px 60px rgba(0,0,0,.4),0 0 0 1px rgba(255,255,255,.04)', transition: 'transform .3s ease,box-shadow .3s ease', cursor: 'default' }}
                                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'scale(1.03) translateY(-8px)'; el.style.boxShadow = '0 30px 80px rgba(0,0,0,.5),0 0 40px rgba(201,168,76,.1)'; }}
                                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 20px 60px rgba(0,0,0,.4),0 0 0 1px rgba(255,255,255,.04)'; }}>
                                {/* Phone frame */}
                                <div style={{ background: '#0B1929', borderRadius: '32px', padding: '12px' }}>
                                    <img
                                        src={item.src}
                                        alt={item.label}
                                        loading="lazy"
                                        style={{ width: '100%', borderRadius: '24px', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                                    />
                                </div>
                            </div>
                            {/* Caption */}
                            <p className="fc-body" style={{ marginTop: '14px', fontSize: '13px', color: '#94A3B8', textAlign: 'center', width: '260px', lineHeight: 1.5 }}>{item.caption}</p>
                        </div>
                    ))}
                </div>

                {/* Right arrow */}
                <button className="fc-carousel-arrow" onClick={() => scroll(1)} aria-label="Scroll right"
                    style={{ position: 'absolute', right: '16px', top: '44%', transform: 'translateY(-50%)', zIndex: 10, width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', cursor: 'pointer', color: '#E2E8F0', fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>
                    ›
                </button>
            </div>
        </section>
    );
}

// ── Calculator spotlight grid ─────────────────────────────
function CalculatorSpotlightGrid() {
    const [activeTab, setActiveTab] = useState('All');
    const gridRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        gridRef.current?.querySelectorAll<HTMLElement>('.fc-calc').forEach(card => {
            const r = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - r.left}px`);
            card.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
    };
    const handleMouseLeave = () => {
        gridRef.current?.querySelectorAll<HTMLElement>('.fc-calc').forEach(c => { c.style.removeProperty('--mx'); c.style.removeProperty('--my'); });
    };

    const filtered = activeTab === 'All' ? CALC_MODULES : CALC_MODULES.filter(m => m.cat === activeTab);

    return (
        <section className="fc-sec" style={{ width: '100%', boxSizing: 'border-box', background: '#060F1C', padding: '96px 24px', borderTop: '1px solid rgba(255,255,255,.04)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <Reveal className="text-center" style={{ marginBottom: '40px' }}>
                    <h2 className="fc-display" style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', marginBottom: '12px' }}>Every Calculator You Need</h2>
                    <p className="fc-body" style={{ fontSize: '16px', color: '#94A3B8' }}>50+ financial tools built for Indian users</p>
                </Reveal>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
                    {CATEGORIES.map(cat => (
                        <button key={cat} className={`fc-tab${activeTab === cat ? ' active' : ''}`} onClick={() => setActiveTab(cat)}>{cat}</button>
                    ))}
                </div>

                <div ref={gridRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
                    className="fc-calc-grid" style={{ display: 'grid', gap: '12px' }}>
                    {filtered.map((mod, i) => (
                        <Reveal key={mod.name} delay={Math.min(i * 30, 300)}>
                            <div className="fc-calc">
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(201,168,76,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '12px' }}>{mod.emoji}</div>
                                <div className="fc-body" style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0', marginBottom: '4px', lineHeight: 1.3 }}>{mod.name}</div>
                                <div className="fc-body" style={{ fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>{mod.desc}</div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ── Social proof ──────────────────────────────────────────
function SocialProof() {
    const cards = [
        { icon: '⭐', title: 'Accurate Calculations', desc: 'All formulas verified against official RBI and Income Tax department guidelines.', color: '#C9A84C' },
        { icon: '🔒', title: 'Your Data is Safe',      desc: 'Zero data collected. Everything stays on your device. No servers, no accounts.',    color: '#10B981' },
        { icon: '🇮🇳', title: 'Made for India',         desc: 'Built specifically for Indian tax laws, government schemes, and financial products.', color: '#3B82F6' },
    ];
    return (
        <section className="fc-sec" style={{ width: '100%', boxSizing: 'border-box', background: '#020810', borderTop: '1px solid rgba(255,255,255,.05)', padding: '80px 24px' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <Reveal className="text-center" style={{ marginBottom: '48px' }}>
                    <h2 className="fc-display" style={{ fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#fff' }}>
                        Trusted by Indians for Smart Financial Planning
                    </h2>
                </Reveal>
                <div className="fc-social-grid">
                    {cards.map((c, i) => (
                        <Reveal key={c.title} delay={i * 80}>
                            <div style={{ padding: '28px', borderRadius: '20px', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', backdropFilter: 'blur(10px)', height: '100%' }}>
                                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{c.icon}</div>
                                <h3 className="fc-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>{c.title}</h3>
                                <p className="fc-body" style={{ fontSize: '14px', color: '#94A3B8', lineHeight: 1.7, margin: 0 }}>{c.desc}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ── FAQ accordion ─────────────────────────────────────────
function AccordionItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
    return (
        <div className={`fc-accordion${open ? ' open' : ''}`}>
            <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span className="fc-body" style={{ fontSize: '14px', fontWeight: 600, color: open ? '#C9A84C' : '#E2E8F0', lineHeight: 1.4, transition: 'color .2s' }}>{q}</span>
                <span style={{ flexShrink: 0, width: '26px', height: '26px', borderRadius: '8px', background: open ? 'rgba(201,168,76,.12)' : 'rgba(255,255,255,.06)', border: `1px solid ${open ? 'rgba(201,168,76,.35)' : 'rgba(255,255,255,.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: open ? '#C9A84C' : '#94A3B8', fontSize: '16px', lineHeight: 1, transition: 'all .2s' }}>
                    {open ? '−' : '+'}
                </span>
            </button>
            <div style={{ maxHeight: open ? '160px' : '0', overflow: 'hidden', transition: 'max-height .35s cubic-bezier(.16,1,.3,1)' }}>
                <p className="fc-body" style={{ padding: '0 20px 18px', fontSize: '13px', color: '#94A3B8', lineHeight: 1.75, margin: 0 }}>{a}</p>
            </div>
        </div>
    );
}

function FaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const left  = FAQS.filter((_, i) => i % 2 === 0);
    const right = FAQS.filter((_, i) => i % 2 !== 0);
    return (
        <section className="fc-sec" style={{ width: '100%', boxSizing: 'border-box', background: '#060F1C', borderTop: '1px solid rgba(255,255,255,.04)', padding: '96px 24px' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <Reveal className="text-center" style={{ marginBottom: '52px' }}>
                    <h2 className="fc-display" style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', marginBottom: '12px' }}>Common Questions</h2>
                    <p className="fc-body" style={{ fontSize: '16px', color: '#94A3B8' }}>Everything you need to know about FinCalix</p>
                </Reveal>
                <div className="fc-faq-grid">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {left.map(faq => {
                            const i = FAQS.indexOf(faq);
                            return <Reveal key={faq.q} delay={i * 50}><AccordionItem q={faq.q} a={faq.a} open={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? null : i)} /></Reveal>;
                        })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {right.map(faq => {
                            const i = FAQS.indexOf(faq);
                            return <Reveal key={faq.q} delay={i * 50}><AccordionItem q={faq.q} a={faq.a} open={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? null : i)} /></Reveal>;
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

// ── Final CTA ─────────────────────────────────────────────
function FinalCTA() {
    return (
        <section className="fc-final-cta" style={{ position: 'relative', width: '100%', boxSizing: 'border-box', background: '#020810', padding: '120px 24px', textAlign: 'center', overflow: 'hidden' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%,rgba(201,168,76,.1),transparent)' }} />
            <div className="fc-grid-bg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px', margin: '0 auto' }}>
                <Reveal>
                    <div className="fc-mono" style={{ fontSize: '11px', letterSpacing: '.15em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: '20px' }}>Start For Free</div>
                    <h2 className="fc-display" style={{ fontSize: 'clamp(36px,5vw,64px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05, color: '#fff', marginBottom: '20px' }}>
                        Ready to Master Your <span className="fc-gold-text">Finances?</span>
                    </h2>
                    <p className="fc-body" style={{ fontSize: '17px', color: '#94A3B8', lineHeight: 1.65, maxWidth: '500px', margin: '0 auto 40px' }}>
                        Join thousands of Indians using FinCalix to make smarter financial decisions every day.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <PlayStoreBadge />
                        <p className="fc-mono" style={{ fontSize: '12px', color: '#475569', letterSpacing: '.05em' }}>Free · No Login · Works Offline · Budget 2026-27</p>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

// ── Footer ────────────────────────────────────────────────
function Footer() {
    return (
        <footer style={{ width: '100%', boxSizing: 'border-box', background: '#020810', borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <div className="fc-footer-inner" style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 24px 32px' }}>
                <div className="fc-footer-grid" style={{ display: 'grid', gap: '40px 24px', marginBottom: '48px' }}>

                    {/* Brand */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <img src="/icons/fincalix-logo.png" alt="FinCalix" style={{ width: '36px', height: '36px', borderRadius: '10px' }} />
                            <span className="fc-display" style={{ fontSize: '18px', fontWeight: 700, color: '#C9A84C' }}>FinCalix</span>
                        </div>
                        <p className="fc-body" style={{ fontSize: '13px', color: '#475569', lineHeight: 1.7, marginBottom: '20px' }}>
                            Financial Super Calculator.<br />Built for India, by Indians.
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <FooterSocialIcon href="https://www.instagram.com/fincalix/" label="Instagram" hoverBg="linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
                            </FooterSocialIcon>
                            <FooterSocialIcon href="https://youtube.com/@fincalix" label="YouTube" hoverBg="#FF0000">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                            </FooterSocialIcon>
                            <FooterSocialIcon href="mailto:support@fincalix.com" label="Email" hoverBg="#C9A84C">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                            </FooterSocialIcon>
                        </div>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="fc-mono" style={{ fontSize: '11px', fontWeight: 600, color: '#C9A84C', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '16px' }}>Legal</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[{ label: 'Privacy Policy', href: '/privacy-policy' }, { label: 'Terms of Service', href: '/terms-of-service' }, { label: 'Data & Privacy', href: '/data-privacy' }, { label: 'About Us', href: '/about' }].map(l => (
                                <a key={l.href} href={l.href} className="fc-body" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none', transition: 'color .2s' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                                    onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>{l.label}</a>
                            ))}
                        </div>
                    </div>

                    {/* App */}
                    <div>
                        <h4 className="fc-mono" style={{ fontSize: '11px', fontWeight: 600, color: '#C9A84C', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '16px' }}>App</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="fc-body" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none', transition: 'color .2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>Download on Play Store</a>
                            <a href="mailto:support@fincalix.com" className="fc-body" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none', transition: 'color .2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>support@fincalix.com</a>
                        </div>
                        <PlayStoreBadge />
                    </div>

                    {/* About */}
                    <div>
                        <h4 className="fc-mono" style={{ fontSize: '11px', fontWeight: 600, color: '#C9A84C', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '16px' }}>About</h4>
                        <p className="fc-body" style={{ fontSize: '13px', color: '#475569', lineHeight: 1.7, marginBottom: '16px' }}>
                            Made with ❤️ in India<br />Hyderabad, Telangana, India
                        </p>
                        <span className="fc-mono" style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '11px', background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)', color: '#C9A84C' }}>✦ v1.0.5</span>
                    </div>
                </div>

                {/* Bottom bar */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: '24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <span className="fc-body" style={{ fontSize: '13px', color: '#475569' }}>© 2026 FinCalix. All rights reserved.</span>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        {[{ label: 'Privacy', href: '/privacy-policy' }, { label: 'Terms', href: '/terms-of-service' }, { label: 'About', href: '/about' }].map(l => (
                            <a key={l.href} href={l.href} className="fc-body" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none', transition: 'color .2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>{l.label}</a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}

// ══════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════
export default function WebLandingPage() {
    useEffect(() => {
        const ID = 'fc-styles';
        if (!document.getElementById(ID)) {
            const el = document.createElement('style');
            el.id = ID;
            el.textContent = GLOBAL_CSS;
            document.head.prepend(el);
        }
    }, []);

    const isDevMode = localStorage.getItem('fincalix_dev_access') === 'true';

    return (
        <div className="fc-body" style={{ background: '#020810', color: '#fff', width: '100%', maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' }}>

            {/* Dev mode exit badge */}
            {isDevMode && (
                <button
                    onClick={() => { localStorage.removeItem('fincalix_dev_access'); window.location.href = '/'; }}
                    style={{ position: 'fixed', bottom: '16px', left: '16px', zIndex: 9999, padding: '8px 14px', borderRadius: '20px', background: '#0B1929', border: '1px solid rgba(201,168,76,.4)', color: '#C9A84C', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap' }}>
                    🔧 Exit Dev Mode
                </button>
            )}

            <NavBar />
            <HeroSection />
            <StatsStrip />
            <BentoGrid />
            <ScreenshotsSection />
            <CalculatorSpotlightGrid />
            <SocialProof />
            <FaqSection />
            <FinalCTA />
            <Footer />
        </div>
    );
}
