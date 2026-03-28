import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fincalix.app';

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
    { emoji: '🌍', name: 'World Clock',           desc: 'Global Time Zones',          cat: 'Tools'      },
    { emoji: '💹', name: 'Lumpsum Calculator',    desc: 'One-time Investment',        cat: 'Investment' },
    { emoji: '🏛️', name: 'NPS Calculator',        desc: 'National Pension System',    cat: 'Savings'    },
    { emoji: '👧', name: 'Sukanya Samriddhi',     desc: 'Girl Child Savings',         cat: 'Savings'    },
    { emoji: '🎂', name: 'Age Calculator',        desc: 'Exact Age & Generation',     cat: 'Tools'      },
    { emoji: '🏘️', name: 'Property Calculator',   desc: 'Real Estate Returns',        cat: 'Investment' },
    { emoji: '🔄', name: 'Compare Scenarios',     desc: 'Side by Side Comparison',    cat: 'Tools'      },
    { emoji: '🎯', name: 'Goal Planner',          desc: 'Financial Milestones',       cat: 'Tracker'    },
    { emoji: '🤖', name: 'Financial Advisor',     desc: 'AI-Powered Insights',        cat: 'Tools'      },
    { emoji: '📋', name: 'Govt Schemes',          desc: '45+ Schemes',                cat: 'Govt'       },
];

const CATEGORIES = ['All', 'Tax', 'Loans', 'Investment', 'Savings', 'Tracker', 'Tools'];

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
    { value: 6,  suffix: '',  label: 'Indian Languages'  },
    { value: 0,  suffix: '∞', label: 'Free Forever'      },
];

const SCHEMES = [
    'PM Kisan Samman Nidhi', 'Sukanya Samriddhi Yojana', 'PPF', 'NPS', 'PMAY',
    'Kisan Credit Card', 'PM Fasal Bima Yojana', 'Ayushman Bharat',
    'PM Awas Yojana', 'Mudra Yojana', 'Stand Up India', 'PM Jan Dhan', 'PM Vaya Vandana',
];

// ── Global CSS ────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,600;1,400;1,600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

.fc-sans{font-family:'Plus Jakarta Sans',sans-serif}
.fc-lora{font-family:'Lora',serif}

/* ── Animations ── */
@keyframes fc-fade-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes fc-fade-in{from{opacity:0}to{opacity:1}}
@keyframes fc-hero-float{0%,100%{transform:translateY(0) rotate(2deg)}50%{transform:translateY(-16px) rotate(2deg)}}
@keyframes fc-badge-float-1{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes fc-badge-float-2{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes fc-badge-float-3{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes fc-badge-float-4{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes fc-soft-float-1{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,40px)}}
@keyframes fc-soft-float-2{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,-30px)}}
@keyframes fc-marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

/* ── Scroll reveal ── */
.fc-reveal{opacity:0;transform:translateY(24px);transition:opacity .5s cubic-bezier(.16,1,.3,1),transform .5s cubic-bezier(.16,1,.3,1)}
.fc-reveal.fc-visible{opacity:1;transform:translateY(0)}

/* ── Navbar ── */
.fc-nav{
  position:sticky;top:0;left:0;right:0;z-index:1000;height:68px;
  background:#FFFFFF;border-bottom:1px solid #E2E8E4;
  box-shadow:0 2px 12px rgba(13,59,46,.06);
  display:flex;align-items:center;box-sizing:border-box;width:100%}

/* ── Bento grid ── */
.fc-bento-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px;grid-auto-rows:minmax(180px,auto)}
@media(max-width:1023px){
  .fc-bento-grid{grid-template-columns:repeat(2,1fr)}
  .fc-bento-grid>*{grid-column:auto!important;grid-row:auto!important}}
@media(max-width:767px){.fc-bento-grid{grid-template-columns:1fr!important}}

/* ── Bento card ── */
.fc-bento-card{
  background:#FFFFFF;border:1px solid #E8EDF3;border-radius:20px;
  box-shadow:0 2px 8px rgba(13,59,46,.06);
  transition:border-color .3s,box-shadow .3s,transform .3s;will-change:transform;height:100%}
.fc-bento-card:hover{border-color:#2E9B75;box-shadow:0 8px 24px rgba(13,59,46,.10);transform:translateY(-2px)}

/* ── Calc grid ── */
.fc-calc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
@media(max-width:767px){.fc-calc-grid{grid-template-columns:repeat(2,1fr)!important}}

/* ── Calc card ── */
.fc-calc-card{
  background:#FFFFFF;border:1px solid #E8EDF3;border-radius:16px;padding:20px;
  box-shadow:0 2px 8px rgba(13,59,46,.06);cursor:default;
  transition:border-color .3s,box-shadow .3s,transform .3s}
.fc-calc-card:hover{border-color:#2E9B75;box-shadow:0 0 0 3px rgba(46,155,117,.1),0 8px 24px rgba(13,59,46,.10);transform:translateY(-2px)}

/* ── Tabs ── */
.fc-tab{
  padding:8px 20px;border-radius:100px;font-size:13px;font-weight:500;cursor:pointer;
  border:1px solid transparent;transition:all .2s;font-family:'Plus Jakarta Sans',sans-serif;
  background:#F2F4F7;color:#4A6741}
.fc-tab:hover{background:#E8EDF3}
.fc-tab.active{background:#0D3B2E;color:#FFFFFF;border-color:transparent}

/* ── FAQ accordion ── */
.fc-accordion{background:#FFFFFF;border:1px solid #E8EDF3;border-radius:12px;overflow:hidden;transition:border-color .25s,box-shadow .25s}
.fc-accordion.open{border-color:#2E9B75;box-shadow:0 4px 16px rgba(13,59,46,.08)}

/* ── Stats grid ── */
.fc-stats-grid{display:grid;grid-template-columns:repeat(4,1fr)}
@media(max-width:639px){.fc-stats-grid{grid-template-columns:repeat(2,1fr)}}

/* ── FAQ grid ── */
.fc-faq-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}
@media(max-width:767px){.fc-faq-grid{grid-template-columns:1fr}}

/* ── 3-col grids ── */
.fc-3col{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
@media(max-width:767px){.fc-3col{grid-template-columns:1fr!important}}

/* ── Footer grid ── */
.fc-footer-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:40px}
@media(max-width:1023px){.fc-footer-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:767px){.fc-footer-grid{grid-template-columns:1fr!important}}

/* ── Carousel ── */
.fc-carousel{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y}
.fc-carousel::-webkit-scrollbar{display:none}
.fc-carousel-arrow{display:flex;align-items:center;justify-content:center}
@media(max-width:767px){.fc-carousel-arrow{display:none!important}}

/* ── Nav badges ── */
.fc-nav-badge{display:inline-flex;align-items:center}
.fc-nav-mobile-btn{display:none}
@media(max-width:767px){
  .fc-nav-badge{display:none!important}
  .fc-nav-mobile-btn{display:inline-flex!important;align-items:center}}

/* ── Hero layout ── */
.fc-hero-cols{display:flex;align-items:center;gap:60px;max-width:1200px;margin:0 auto;width:100%}
.fc-hero-left{flex:1;min-width:0}
.fc-hero-right{width:380px;flex-shrink:0;display:flex;justify-content:center;align-items:center;position:relative}
@media(max-width:1023px){.fc-hero-right{width:300px}}
@media(max-width:767px){
  .fc-hero-cols{flex-direction:column;text-align:center}
  .fc-hero-right{width:100%;margin-top:40px}
  .fc-hide-mobile{display:none!important}
  .fc-hero-h1{font-size:36px!important}
  .fc-hero-sub{font-size:16px!important}
  .fc-pills-row{justify-content:center!important}
  .fc-section-pad{padding:60px 20px!important}
  .fc-hero-pad{padding:88px 20px 60px!important}
  .fc-stats-sec{padding:40px 20px!important}
  .fc-stat-col-even{border-right:none!important}
  .fc-footer-inner{padding:40px 20px 24px!important}
  .fc-final-cta-pad{padding:80px 20px!important}
  .fc-screenshots-sec{padding-top:60px!important;padding-bottom:60px!important}
  .fc-carousel-track{padding:20px 20px 32px!important}
}

/* ── Scrollbar ── */
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:#F2F4F7}
::-webkit-scrollbar-thumb{background:rgba(13,59,46,.2);border-radius:3px}
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
function PlayStoreBadge({ height = 56 }: { height?: number }) {
    return (
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-block', transition: 'transform .2s ease, filter .2s ease' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'scale(1.03)'; el.style.filter = 'brightness(1.05)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'scale(1)'; el.style.filter = 'none'; }}>
            <img
                src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                alt="Get it on Google Play"
                style={{ height: `${height}px`, width: 'auto', display: 'block', filter: 'drop-shadow(0 4px 12px rgba(212,160,23,.3))' }} />
        </a>
    );
}

// ── Footer social icon ────────────────────────────────────
function FooterSocialIcon({ href, label, hoverBg, children }: { href: string; label: string; hoverBg: string; children: ReactNode }) {
    return (
        <a href={href} target={href.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer" aria-label={label}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.5)', transition: 'all .2s', textDecoration: 'none', flexShrink: 0 }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = hoverBg; el.style.borderColor = 'transparent'; el.style.color = '#fff'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,.08)'; el.style.borderColor = 'rgba(255,255,255,.12)'; el.style.color = 'rgba(255,255,255,.5)'; }}>
            {children}
        </a>
    );
}

// ══════════════════════════════════════════════════════════
// SECTION 1 — NAVBAR
// ══════════════════════════════════════════════════════════
function NavBar() {
    return (
        <nav className="fc-nav" style={{ padding: '0 24px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/icons/fincalix-logo.png" alt="FinCalix" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                    <span className="fc-sans" style={{ fontSize: '20px', fontWeight: 700, color: '#0D3B2E', letterSpacing: '-0.3px' }}>FinCalix</span>
                </div>

                {/* Right — Desktop */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <a href="/privacy-policy" className="fc-sans"
                        style={{ fontSize: '14px', color: '#7A8B7E', textDecoration: 'none', transition: 'color .2s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#0D3B2E')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#7A8B7E')}>
                        Privacy Policy
                    </a>
                    <div style={{ width: '1px', height: '20px', background: '#E2E8E4' }} />
                    {/* Play Store badge — desktop */}
                    <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="fc-nav-badge"
                        style={{ transition: 'transform .2s ease' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}>
                        <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                            alt="Get it on Google Play" style={{ height: '44px', width: 'auto', display: 'block' }} />
                    </a>
                    {/* Download pill — mobile */}
                    <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="fc-nav-mobile-btn fc-sans"
                        style={{ background: '#0D3B2E', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, padding: '8px 16px', borderRadius: '100px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        Download App ↗
                    </a>
                </div>
            </div>
        </nav>
    );
}

// ══════════════════════════════════════════════════════════
// SECTION 2 — HERO
// ══════════════════════════════════════════════════════════
function HeroSection() {
    return (
        <section className="fc-hero-pad" style={{ position: 'relative', width: '100%', boxSizing: 'border-box', background: '#FFFFFF', padding: '100px 24px 80px', overflow: 'hidden' }}>
            {/* Subtle radial at top */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60%', background: 'radial-gradient(ellipse 70% 60% at 50% 0%,#F0FAF5,transparent)', pointerEvents: 'none' }} />

            {/* Soft floating bg circles */}
            <div style={{ position: 'absolute', top: '-100px', right: '10%', width: '500px', height: '500px', borderRadius: '50%', background: '#2E9B75', opacity: 0.05, filter: 'blur(120px)', animation: 'fc-soft-float-1 20s ease-in-out infinite', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: '5%', width: '400px', height: '400px', borderRadius: '50%', background: '#D4A017', opacity: 0.06, filter: 'blur(100px)', animation: 'fc-soft-float-2 25s ease-in-out infinite', pointerEvents: 'none' }} />

            <div className="fc-hero-cols" style={{ position: 'relative', zIndex: 1 }}>
                {/* LEFT */}
                <div className="fc-hero-left">
                    {/* Badge */}
                    <div style={{ marginBottom: '28px', display: 'flex' }} className="fc-pills-row">
                        <span className="fc-sans" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, color: '#1A5C45', background: '#E8F5EF', border: '1px solid #2E9B75' }}>
                            ✦ Budget 2026-27 Updated · Made for India
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className="fc-sans fc-hero-h1" style={{ fontSize: '56px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '24px' }}>
                        <span style={{ color: '#0D3B2E', display: 'block' }}>India's Smartest</span>
                        <span style={{ color: '#1A5C45', display: 'block' }}>Financial</span>
                        <span style={{ color: '#0D3B2E', display: 'block' }}>Calculator App</span>
                    </h1>

                    {/* Sub */}
                    <p className="fc-sans fc-hero-sub" style={{ fontSize: '18px', color: '#4A6741', lineHeight: 1.65, maxWidth: '480px', marginBottom: '32px' }}>
                        30+ calculators, 45+ government schemes and expense tracking — everything to master your money. Free. Offline. No login needed.
                    </p>

                    {/* Trust pills */}
                    <div className="fc-pills-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '36px' }}>
                        {['30+ Calculators', '45 Govt Schemes', '6 Languages', '100% Free'].map(pill => (
                            <span key={pill} className="fc-sans" style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '13px', color: '#4A6741', background: '#F2F4F7', border: '1px solid #E2E8E4', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2E9B75', flexShrink: 0 }} />
                                {pill}
                            </span>
                        ))}
                    </div>

                    {/* CTA */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }} className="fc-pills-row">
                        <PlayStoreBadge height={56} />
                        <p className="fc-sans" style={{ fontSize: '12px', color: '#7A8B7E' }}>No account · Works offline · Budget 2026-27</p>
                    </div>
                </div>

                {/* RIGHT — Phone mockup */}
                <div className="fc-hero-right">
                    {/* Phone frame */}
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <div style={{ width: '260px', borderRadius: '44px', border: '10px solid #0D3B2E', background: '#0D3B2E', boxShadow: '0 40px 80px rgba(13,59,46,.25),0 0 0 1px rgba(13,59,46,.1)', animation: 'fc-hero-float 6s ease-in-out infinite', overflow: 'hidden' }}>
                            <img src="/screenshots/screen1-home.png" alt="FinCalix App" loading="eager" style={{ width: '100%', display: 'block', objectFit: 'cover', objectPosition: 'top' }} />
                        </div>

                        {/* Floating badges */}
                        <div className="fc-hide-mobile" style={{ position: 'absolute', top: '24px', right: '-80px', animation: 'fc-badge-float-1 4s ease-in-out infinite' }}>
                            <div className="fc-sans" style={{ background: '#FFFFFF', border: '1px solid #E2E8E4', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(13,59,46,.10)', fontSize: '13px', fontWeight: 600, color: '#0D3B2E', whiteSpace: 'nowrap' }}>
                                📈 SIP Calculator
                            </div>
                        </div>
                        <div className="fc-hide-mobile" style={{ position: 'absolute', bottom: '80px', left: '-90px', animation: 'fc-badge-float-2 5s ease-in-out infinite', animationDelay: '1s' }}>
                            <div className="fc-sans" style={{ background: '#FFFFFF', border: '1px solid #E2E8E4', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(13,59,46,.10)', fontSize: '13px', fontWeight: 600, color: '#0D3B2E', whiteSpace: 'nowrap' }}>
                                🏠 EMI Calculator
                            </div>
                        </div>
                        <div className="fc-hide-mobile" style={{ position: 'absolute', top: '140px', left: '-100px', animation: 'fc-badge-float-3 6s ease-in-out infinite', animationDelay: '0.5s' }}>
                            <div className="fc-sans" style={{ background: '#FFFFFF', border: '1px solid #E2E8E4', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(13,59,46,.10)', fontSize: '13px', fontWeight: 600, color: '#0D3B2E', whiteSpace: 'nowrap' }}>
                                💰 Budget 2026-27
                            </div>
                        </div>
                        <div className="fc-hide-mobile" style={{ position: 'absolute', bottom: '160px', right: '-80px', animation: 'fc-badge-float-4 4.5s ease-in-out infinite', animationDelay: '1.5s' }}>
                            <div className="fc-sans" style={{ background: '#FFFFFF', border: '1px solid #E2E8E4', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(13,59,46,.10)', fontSize: '13px', fontWeight: 600, color: '#0D3B2E', whiteSpace: 'nowrap' }}>
                                📊 30+ Tools
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ══════════════════════════════════════════════════════════
// SECTION 3 — TRUST STRIP
// ══════════════════════════════════════════════════════════
function StatItem({ stat, i }: { stat: typeof STATS[0]; i: number }) {
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

    const isLast = i === STATS.length - 1;
    const isEven = (i + 1) % 2 === 0;

    return (
        <div ref={ref} className={isEven ? 'fc-stat-col-even' : ''} style={{ textAlign: 'center', padding: '12px 16px', borderRight: isLast ? 'none' : '1px solid rgba(255,255,255,.1)' }}>
            <div className="fc-sans" style={{ fontSize: 'clamp(36px,5vw,52px)', fontWeight: 800, lineHeight: 1.1, color: '#D4A017' }}>
                {stat.value === 0 ? '∞' : `${count}${stat.suffix}`}
            </div>
            <div className="fc-sans" style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', marginTop: '8px' }}>{stat.label}</div>
        </div>
    );
}

function TrustStrip() {
    return (
        <section className="fc-stats-sec" style={{ width: '100%', boxSizing: 'border-box', background: '#0D3B2E', padding: '56px 24px' }}>
            <div className="fc-stats-grid" style={{ maxWidth: '900px', margin: '0 auto' }}>
                {STATS.map((s, i) => <StatItem key={s.label} stat={s} i={i} />)}
            </div>
        </section>
    );
}

// ══════════════════════════════════════════════════════════
// SECTION 4 — WHY FINCALIX
// ══════════════════════════════════════════════════════════
function WhyFinCalix() {
    const personas = [
        {
            icon: '💼', color: '#1A5C45', bg: '#E8F5EF',
            name: 'Salaried Professional',
            tools: 'Income Tax · HRA · Salary Hike',
            quote: 'Finally understand Old vs New Tax Regime',
            topColor: '#1A5C45',
        },
        {
            icon: '🏠', color: '#B8860B', bg: '#FEF9E7',
            name: 'Home Buyer',
            tools: 'EMI Calculator · Loan Comparison',
            quote: 'Know exactly how much loan I can afford',
            topColor: '#D4A017',
        },
        {
            icon: '📈', color: '#1D4ED8', bg: '#EFF6FF',
            name: 'Investor',
            tools: 'SIP · FD · PPF · NPS · Lumpsum',
            quote: 'Plan my retirement with confidence',
            topColor: '#3B82F6',
        },
    ];
    return (
        <section className="fc-section-pad" style={{ width: '100%', boxSizing: 'border-box', background: '#FAFAF8', padding: '100px 24px' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <Reveal className="text-center" style={{ marginBottom: '56px' }}>
                    <div className="fc-sans" style={{ fontSize: '12px', fontWeight: 700, color: '#1A5C45', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>WHY FINCALIX</div>
                    <h2 className="fc-sans" style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: '#0D3B2E', letterSpacing: '-0.03em', marginBottom: '16px' }}>
                        Built for Every Indian
                    </h2>
                    <p className="fc-sans" style={{ fontSize: '17px', color: '#4A6741', maxWidth: '560px', margin: '0 auto', lineHeight: 1.65 }}>
                        Whether you're a student, salaried professional, business owner, or senior citizen — FinCalix has the right tool for you.
                    </p>
                </Reveal>

                <div className="fc-3col">
                    {personas.map((p, i) => (
                        <Reveal key={p.name} delay={i * 80}>
                            <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF3', borderRadius: '16px', borderTop: `3px solid ${p.topColor}`, padding: '28px', boxShadow: '0 2px 8px rgba(13,59,46,.06)', transition: 'transform .3s, box-shadow .3s', height: '100%' }}
                                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 8px 24px rgba(13,59,46,.10)'; }}
                                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 2px 8px rgba(13,59,46,.06)'; }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '16px' }}>{p.icon}</div>
                                <div className="fc-sans" style={{ fontSize: '17px', fontWeight: 700, color: '#0D3B2E', marginBottom: '6px' }}>{p.name}</div>
                                <div className="fc-sans" style={{ fontSize: '13px', color: '#7A8B7E', marginBottom: '16px' }}>{p.tools}</div>
                                <p className="fc-lora" style={{ fontSize: '15px', color: '#4A6741', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>"{p.quote}"</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ══════════════════════════════════════════════════════════
// SECTION 5 — FEATURES BENTO
// ══════════════════════════════════════════════════════════
function BentoGrid() {
    return (
        <section className="fc-section-pad" style={{ width: '100%', boxSizing: 'border-box', background: '#FFFFFF', padding: '100px 24px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <Reveal className="text-center" style={{ marginBottom: '56px' }}>
                    <div className="fc-sans" style={{ fontSize: '12px', fontWeight: 700, color: '#1A5C45', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>FEATURES</div>
                    <h2 className="fc-sans" style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: '#0D3B2E', letterSpacing: '-0.03em', marginBottom: '12px' }}>
                        Everything You Need to Master Money
                    </h2>
                    <p className="fc-sans" style={{ fontSize: '16px', color: '#4A6741' }}>Built specifically for Indian financial planning</p>
                </Reveal>

                <div className="fc-bento-grid">
                    {/* Card A — 30+ Calculators */}
                    <Reveal style={{ gridColumn: '1 / 9', gridRow: '1 / 3' }}>
                        <div style={{ background: 'linear-gradient(135deg,#0D3B2E 0%,#1A5C45 100%)', border: 'none', borderRadius: '20px', padding: '32px', position: 'relative', minHeight: '360px', overflow: 'hidden', height: '100%', boxSizing: 'border-box' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <span className="fc-sans" style={{ fontSize: '64px', fontWeight: 800, lineHeight: 1, color: '#D4A017' }}>30+</span>
                                <div className="fc-sans" style={{ fontSize: '15px', color: 'rgba(255,255,255,.8)', marginTop: '4px' }}>Smart Financial Calculators</div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '100px' }}>
                                {['SIP', 'EMI', 'PPF', 'FD / RD', 'HRA', 'GST', 'Income Tax', 'NPS', 'Sukanya', 'Age', 'Lumpsum', 'More +'].map(tag => (
                                    <span key={tag} className="fc-sans" style={{ padding: '5px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 500, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', color: '#FFFFFF' }}>{tag}</span>
                                ))}
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '200px' }}>
                                <img src="/screenshots/screen2-calculators.png" alt="Calculators" loading="lazy"
                                    style={{ width: '100%', height: '180px', objectFit: 'cover', objectPosition: 'top', borderRadius: '16px 16px 0 0', border: '1px solid rgba(255,255,255,.15)', borderBottom: 'none', display: 'block' }} />
                            </div>
                        </div>
                    </Reveal>

                    {/* Card B — Budget 2026-27 */}
                    <Reveal delay={80} style={{ gridColumn: '9 / 13', gridRow: '1 / 2' }}>
                        <div className="fc-bento-card" style={{ background: '#FEF9E7', border: '1px solid #F0D070', padding: '24px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#FEF3C7', border: '1px solid #D4A017', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>📅</div>
                            <h3 className="fc-sans" style={{ fontSize: '18px', fontWeight: 700, color: '#0D3B2E', marginBottom: '8px' }}>Budget 2026-27</h3>
                            <p className="fc-sans" style={{ fontSize: '13px', color: '#4A6741', lineHeight: 1.55, marginBottom: '16px' }}>Zero tax on income up to ₹12L under New Regime</p>
                            <span className="fc-sans" style={{ padding: '4px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, background: '#D1FAE5', border: '1px solid #6EE7B7', color: '#065F46' }}>✓ Updated</span>
                        </div>
                    </Reveal>

                    {/* Card C — Works Offline */}
                    <Reveal delay={120} style={{ gridColumn: '9 / 13', gridRow: '2 / 3' }}>
                        <div className="fc-bento-card" style={{ background: '#E8F5EF', border: '1px solid #B6E0CC', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', marginBottom: '16px', height: '36px' }}>
                                {[6, 10, 14, 18, 22].map((h, i) => (
                                    <div key={i} style={{ width: '8px', height: `${h}px`, borderRadius: '3px', background: i < 3 ? '#1A5C45' : 'rgba(13,59,46,.15)' }} />
                                ))}
                                <span style={{ marginLeft: '8px', fontSize: '20px' }}>📵</span>
                            </div>
                            <h3 className="fc-sans" style={{ fontSize: '18px', fontWeight: 700, color: '#0D3B2E', marginBottom: '8px' }}>100% Offline</h3>
                            <p className="fc-sans" style={{ fontSize: '13px', color: '#4A6741', lineHeight: 1.55 }}>No internet needed. All calculators work without a connection.</p>
                        </div>
                    </Reveal>

                    {/* Card E — Schemes marquee */}
                    <Reveal delay={40} style={{ gridColumn: '1 / 9', gridRow: '3 / 4' }}>
                        <div className="fc-bento-card" style={{ padding: '28px 28px 0', overflow: 'hidden', background: 'linear-gradient(135deg,#F0FAF5,#E8F5EF)', border: '1px solid #B6E0CC' }}>
                            <div style={{ marginBottom: '18px' }}>
                                <div className="fc-sans" style={{ fontSize: '11px', color: '#8B5CF6', fontWeight: 700, letterSpacing: '.1em', marginBottom: '8px' }}>GOVERNMENT SCHEMES</div>
                                <h3 className="fc-sans" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0D3B2E' }}>Discover 45+ Government Schemes</h3>
                            </div>
                            <div style={{ overflow: 'hidden', paddingBottom: '28px' }}>
                                <div style={{ display: 'flex', gap: '10px', animation: 'fc-marquee 28s linear infinite', width: 'max-content' }}>
                                    {[...SCHEMES, ...SCHEMES].map((s, i) => (
                                        <span key={i} className="fc-sans" style={{ padding: '6px 14px', borderRadius: '100px', background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.2)', color: '#6D28D9', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>{s}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Reveal>

                    {/* Card D — 6 Languages */}
                    <Reveal delay={160} style={{ gridColumn: '9 / 13', gridRow: '3 / 4' }}>
                        <div className="fc-bento-card" style={{ padding: '24px' }}>
                            <div className="fc-sans" style={{ fontSize: '11px', color: '#1A5C45', fontWeight: 700, letterSpacing: '.1em', marginBottom: '16px' }}>6 LANGUAGES</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                {[
                                    { label: '🇮🇳 English', active: true },
                                    { label: 'हिंदी' }, { label: 'తెలుగు' },
                                    { label: 'தமிழ்' }, { label: 'ಕನ್ನಡ' }, { label: 'മലയാളം' },
                                ].map(lang => (
                                    <span key={lang.label} className="fc-sans" style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: lang.active ? 600 : 400, background: lang.active ? '#E8F5EF' : '#F8F9FA', border: `1px solid ${lang.active ? '#2E9B75' : '#E2E8E4'}`, color: lang.active ? '#1A5C45' : '#4A6741', display: 'inline-block' }}>{lang.label}</span>
                                ))}
                            </div>
                        </div>
                    </Reveal>

                    {/* Card F — Expense Tracker */}
                    <Reveal delay={60} style={{ gridColumn: '1 / 7', gridRow: '4 / 5' }}>
                        <div className="fc-bento-card" style={{ padding: '24px' }}>
                            <div className="fc-sans" style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, letterSpacing: '.1em', marginBottom: '12px' }}>EXPENSE TRACKER</div>
                            <div style={{ marginBottom: '16px' }}>
                                <div className="fc-sans" style={{ fontSize: '28px', fontWeight: 700, color: '#0D3B2E' }}>₹78,700</div>
                                <div className="fc-sans" style={{ fontSize: '12px', color: '#7A8B7E' }}>Spent this month</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '56px', marginBottom: '14px' }}>
                                {[{ h: '65%', c: '#EF4444', l: 'Food' }, { h: '45%', c: '#F59E0B', l: 'Travel' }, { h: '80%', c: '#3B82F6', l: 'Rent' }, { h: '30%', c: '#8B5CF6', l: 'Entmt' }, { h: '55%', c: '#10B981', l: 'Savings' }].map(b => (
                                    <div key={b.l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                                        <div style={{ width: '100%', height: b.h, borderRadius: '4px 4px 0 0', background: b.c, opacity: 0.75 }} />
                                        <span className="fc-sans" style={{ fontSize: '9px', color: '#7A8B7E' }}>{b.l}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ padding: '8px 12px', borderRadius: '10px', background: '#D1FAE5', border: '1px solid #6EE7B7' }}>
                                <span className="fc-sans" style={{ fontSize: '12px', color: '#065F46', fontWeight: 500 }}>Financial Health: 90 / 100 🟢</span>
                            </div>
                        </div>
                    </Reveal>

                    {/* Card G — Free Forever */}
                    <Reveal delay={100} style={{ gridColumn: '7 / 13', gridRow: '4 / 5' }}>
                        <div style={{ background: 'linear-gradient(135deg,#0D3B2E,#247A5C)', border: 'none', borderRadius: '20px', padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', boxSizing: 'border-box' }}>
                            <div>
                                <span className="fc-sans" style={{ fontSize: '52px', fontWeight: 800, lineHeight: 1, color: '#D4A017' }}>₹0</span>
                                <div className="fc-sans" style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginTop: '8px', marginBottom: '20px' }}>Free Forever</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {['No subscription fees', 'No login required', 'No advertisements', 'No hidden charges'].map(item => (
                                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0, color: '#6EE7B7' }}>✓</span>
                                        <span className="fc-sans" style={{ fontSize: '13px', color: 'rgba(255,255,255,.8)' }}>{item}</span>
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

// ══════════════════════════════════════════════════════════
// SECTION 6 — SCREENSHOTS CAROUSEL
// ══════════════════════════════════════════════════════════
function ScreenshotsSection() {
    const carouselRef = useRef<HTMLDivElement>(null);
    const scroll = (dir: 1 | -1) => {
        carouselRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
    };
    return (
        <section className="fc-screenshots-sec" style={{ background: '#F2F4F7', paddingTop: '100px', paddingBottom: '100px', paddingLeft: '0', paddingRight: '0', overflow: 'hidden' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>
                <Reveal className="text-center" style={{ marginBottom: '40px' }}>
                    <div className="fc-sans" style={{ fontSize: '12px', fontWeight: 700, color: '#1A5C45', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>APP SCREENSHOTS</div>
                    <h2 className="fc-sans" style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: '#0D3B2E', letterSpacing: '-0.03em', marginBottom: '12px' }}>
                        See FinCalix in Action
                    </h2>
                    <p className="fc-sans" style={{ fontSize: '16px', color: '#4A6741' }}>Real screenshots from the app</p>
                </Reveal>
            </div>

            <div style={{ position: 'relative' }}>
                {/* Left arrow */}
                <button className="fc-carousel-arrow" onClick={() => scroll(-1)} aria-label="Scroll left"
                    style={{ position: 'absolute', left: '16px', top: '44%', transform: 'translateY(-50%)', zIndex: 10, width: '48px', height: '48px', borderRadius: '50%', background: '#0D3B2E', border: 'none', cursor: 'pointer', color: '#FFFFFF', fontSize: '22px', lineHeight: 1, flexShrink: 0, boxShadow: '0 4px 16px rgba(13,59,46,.2)' }}>
                    ‹
                </button>

                {/* Track */}
                <div ref={carouselRef} className="fc-carousel fc-carousel-track"
                    style={{ display: 'flex', gap: '20px', overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '20px 60px 32px' }}>
                    {SCREENSHOTS_DATA.map((item, i) => (
                        <div key={i} style={{ scrollSnapAlign: 'start', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '240px', borderRadius: '28px', overflow: 'hidden', background: '#FFFFFF', boxShadow: '0 8px 24px rgba(13,59,46,.10)', transition: 'transform .3s ease, box-shadow .3s ease', cursor: 'default' }}
                                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'scale(1.03) translateY(-8px)'; el.style.boxShadow = '0 20px 48px rgba(13,59,46,.15)'; }}
                                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 8px 24px rgba(13,59,46,.10)'; }}>
                                <div style={{ background: '#0D3B2E', borderRadius: '28px', padding: '10px' }}>
                                    <img src={item.src} alt={item.label} loading="lazy"
                                        style={{ width: '100%', borderRadius: '20px', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                                </div>
                            </div>
                            <p className="fc-sans" style={{ marginTop: '14px', fontSize: '13px', color: '#7A8B7E', textAlign: 'center', width: '240px', lineHeight: 1.5 }}>{item.caption}</p>
                        </div>
                    ))}
                </div>

                {/* Right arrow */}
                <button className="fc-carousel-arrow" onClick={() => scroll(1)} aria-label="Scroll right"
                    style={{ position: 'absolute', right: '16px', top: '44%', transform: 'translateY(-50%)', zIndex: 10, width: '48px', height: '48px', borderRadius: '50%', background: '#0D3B2E', border: 'none', cursor: 'pointer', color: '#FFFFFF', fontSize: '22px', lineHeight: 1, flexShrink: 0, boxShadow: '0 4px 16px rgba(13,59,46,.2)' }}>
                    ›
                </button>
            </div>
        </section>
    );
}

// ══════════════════════════════════════════════════════════
// SECTION 7 — HOW IT WORKS
// ══════════════════════════════════════════════════════════
function HowItWorks() {
    const steps = [
        { num: '01', title: 'Download Free', desc: 'Get FinCalix from Play Store. No signup, no account, completely free.' },
        { num: '02', title: 'Choose Your Calculator', desc: 'Pick from 30+ calculators or search any calculator in seconds.' },
        { num: '03', title: 'Get Instant Results', desc: 'Accurate results with charts and smart financial insights instantly.' },
    ];
    return (
        <section className="fc-section-pad" style={{ width: '100%', boxSizing: 'border-box', background: '#FFFFFF', padding: '100px 24px' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <Reveal className="text-center" style={{ marginBottom: '56px' }}>
                    <h2 className="fc-sans" style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: '#0D3B2E', letterSpacing: '-0.03em', marginBottom: '12px' }}>
                        Start in 3 Simple Steps
                    </h2>
                    <p className="fc-sans" style={{ fontSize: '17px', color: '#4A6741' }}>Download, open, calculate — it's that easy</p>
                </Reveal>

                <div className="fc-3col">
                    {steps.map((s, i) => (
                        <Reveal key={s.num} delay={i * 80}>
                            <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF3', borderRadius: '20px', padding: '36px 28px', textAlign: 'center', boxShadow: '0 2px 8px rgba(13,59,46,.06)', height: '100%', boxSizing: 'border-box', transition: 'transform .3s, box-shadow .3s' }}
                                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 8px 24px rgba(13,59,46,.10)'; }}
                                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 2px 8px rgba(13,59,46,.06)'; }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#0D3B2E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', flexShrink: 0 }}>
                                    <span className="fc-sans" style={{ fontSize: '20px', fontWeight: 800, color: '#D4A017' }}>{s.num}</span>
                                </div>
                                <h3 className="fc-sans" style={{ fontSize: '18px', fontWeight: 700, color: '#0D3B2E', marginBottom: '12px' }}>{s.title}</h3>
                                <p className="fc-sans" style={{ fontSize: '14px', color: '#4A6741', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ══════════════════════════════════════════════════════════
// SECTION 8 — TRUST & SECURITY
// ══════════════════════════════════════════════════════════
function TrustSecurity() {
    const cards = [
        { icon: '🔒', title: 'Zero Data Collection',   desc: 'We never collect your personal or financial data. Everything stays on your device.', topColor: '#1A5C45' },
        { icon: '⭐', title: 'Accurate Calculations',  desc: 'All formulas verified against RBI, Income Tax Department and official government guidelines.', topColor: '#D4A017' },
        { icon: '🇮🇳', title: 'Made for India',          desc: 'Built specifically for Indian tax laws, government schemes, and financial products.', topColor: '#3B82F6' },
    ];
    return (
        <section className="fc-section-pad" style={{ width: '100%', boxSizing: 'border-box', background: '#F0FAF5', borderTop: '1px solid #E8EDF3', padding: '80px 24px' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <Reveal className="text-center" style={{ marginBottom: '48px' }}>
                    <h2 className="fc-sans" style={{ fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 800, color: '#0D3B2E', letterSpacing: '-0.03em', marginBottom: '12px' }}>
                        Trusted. Secure. Made for India.
                    </h2>
                    <p className="fc-sans" style={{ fontSize: '16px', color: '#4A6741' }}>Your financial data never leaves your device</p>
                </Reveal>
                <div className="fc-3col">
                    {cards.map((c, i) => (
                        <Reveal key={c.title} delay={i * 80}>
                            <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF3', borderRadius: '16px', borderTop: `3px solid ${c.topColor}`, padding: '28px', boxShadow: '0 2px 8px rgba(13,59,46,.06)', height: '100%', boxSizing: 'border-box', transition: 'transform .3s, box-shadow .3s' }}
                                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 8px 24px rgba(13,59,46,.10)'; }}
                                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 2px 8px rgba(13,59,46,.06)'; }}>
                                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{c.icon}</div>
                                <h3 className="fc-sans" style={{ fontSize: '17px', fontWeight: 700, color: '#0D3B2E', marginBottom: '10px' }}>{c.title}</h3>
                                <p className="fc-sans" style={{ fontSize: '14px', color: '#4A6741', lineHeight: 1.7, margin: 0 }}>{c.desc}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ══════════════════════════════════════════════════════════
// SECTION 9 — CALCULATOR GRID
// ══════════════════════════════════════════════════════════
function CalculatorGrid() {
    const [activeTab, setActiveTab] = useState('All');
    const filtered = activeTab === 'All' ? CALC_MODULES : CALC_MODULES.filter(m => m.cat === activeTab);

    const emojiColors: Record<string, string> = {
        Tax: '#FEF3C7', Loans: '#DBEAFE', Investment: '#D1FAE5',
        Savings: '#FCE7F3', Tracker: '#EDE9FE', Tools: '#E0F2FE', Govt: '#F3E8FF',
    };

    return (
        <section className="fc-section-pad" style={{ width: '100%', boxSizing: 'border-box', background: '#FAFAF8', padding: '100px 24px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <Reveal className="text-center" style={{ marginBottom: '40px' }}>
                    <h2 className="fc-sans" style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: '#0D3B2E', letterSpacing: '-0.03em', marginBottom: '12px' }}>
                        Every Calculator You Need
                    </h2>
                    <p className="fc-sans" style={{ fontSize: '16px', color: '#4A6741' }}>50+ financial tools built for Indian users</p>
                </Reveal>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
                    {CATEGORIES.map(cat => (
                        <button key={cat} className={`fc-tab${activeTab === cat ? ' active' : ''}`} onClick={() => setActiveTab(cat)}>{cat}</button>
                    ))}
                </div>

                <div className="fc-calc-grid">
                    {filtered.map((mod, i) => (
                        <Reveal key={mod.name} delay={Math.min(i * 30, 300)}>
                            <div className="fc-calc-card">
                                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: emojiColors[mod.cat] ?? '#F2F4F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '12px' }}>{mod.emoji}</div>
                                <div className="fc-sans" style={{ fontSize: '13px', fontWeight: 600, color: '#0D3B2E', marginBottom: '4px', lineHeight: 1.3 }}>{mod.name}</div>
                                <div className="fc-sans" style={{ fontSize: '11px', color: '#7A8B7E', lineHeight: 1.4 }}>{mod.desc}</div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ══════════════════════════════════════════════════════════
// SECTION 10 — FAQ
// ══════════════════════════════════════════════════════════
function AccordionItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
    return (
        <div className={`fc-accordion${open ? ' open' : ''}`}>
            <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span className="fc-sans" style={{ fontSize: '14px', fontWeight: 600, color: open ? '#1A5C45' : '#0D3B2E', lineHeight: 1.4, transition: 'color .2s' }}>{q}</span>
                <span style={{ flexShrink: 0, width: '26px', height: '26px', borderRadius: '8px', background: open ? '#E8F5EF' : '#F2F4F7', border: `1px solid ${open ? '#2E9B75' : '#E2E8E4'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: open ? '#1A5C45' : '#7A8B7E', fontSize: '16px', lineHeight: 1, transition: 'all .2s' }}>
                    {open ? '−' : '+'}
                </span>
            </button>
            <div style={{ maxHeight: open ? '160px' : '0', overflow: 'hidden', transition: 'max-height .35s cubic-bezier(.16,1,.3,1)' }}>
                <p className="fc-sans" style={{ padding: '0 20px 18px', fontSize: '13px', color: '#4A6741', lineHeight: 1.75, margin: 0, background: '#F0FAF5' }}>{a}</p>
            </div>
        </div>
    );
}

function FaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const left  = FAQS.filter((_, i) => i % 2 === 0);
    const right = FAQS.filter((_, i) => i % 2 !== 0);
    return (
        <section className="fc-section-pad" style={{ width: '100%', boxSizing: 'border-box', background: '#FFFFFF', borderTop: '1px solid #EEF2EE', padding: '100px 24px' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <Reveal className="text-center" style={{ marginBottom: '52px' }}>
                    <h2 className="fc-sans" style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: '#0D3B2E', letterSpacing: '-0.03em', marginBottom: '12px' }}>Common Questions</h2>
                    <p className="fc-sans" style={{ fontSize: '16px', color: '#4A6741' }}>Everything you need to know about FinCalix</p>
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

// ══════════════════════════════════════════════════════════
// SECTION 11 — FINAL CTA
// ══════════════════════════════════════════════════════════
function FinalCTA() {
    return (
        <section className="fc-final-cta-pad" style={{ position: 'relative', width: '100%', boxSizing: 'border-box', background: '#0D3B2E', padding: '100px 24px', textAlign: 'center', overflow: 'hidden' }}>
            {/* Gold orb top-right */}
            <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(212,160,23,.1),transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px', margin: '0 auto' }}>
                <Reveal>
                    <div className="fc-sans" style={{ fontSize: '12px', letterSpacing: '.15em', color: '#D4A017', textTransform: 'uppercase', marginBottom: '20px', fontWeight: 700 }}>START FOR FREE</div>
                    <h2 className="fc-sans" style={{ fontSize: 'clamp(32px,5vw,56px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: '#FFFFFF', marginBottom: '20px' }}>
                        Ready to Master Your Finances?
                    </h2>
                    <p className="fc-sans" style={{ fontSize: '17px', color: 'rgba(255,255,255,.7)', lineHeight: 1.65, maxWidth: '500px', margin: '0 auto 40px' }}>
                        Join thousands of Indians using FinCalix to make smarter financial decisions every day.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <PlayStoreBadge height={60} />
                        <p className="fc-sans" style={{ fontSize: '13px', color: 'rgba(255,255,255,.45)', letterSpacing: '.04em' }}>Free · No Login · Works Offline · Budget 2026-27</p>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

// ══════════════════════════════════════════════════════════
// SECTION 12 — FOOTER
// ══════════════════════════════════════════════════════════
function Footer() {
    return (
        <footer style={{ width: '100%', boxSizing: 'border-box', background: '#0A2E22', borderTop: '1px solid rgba(255,255,255,.08)' }}>
            <div className="fc-footer-inner" style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 24px 40px' }}>
                <div className="fc-footer-grid" style={{ marginBottom: '48px' }}>
                    {/* Brand */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <img src="/icons/fincalix-logo.png" alt="FinCalix" style={{ width: '36px', height: '36px', borderRadius: '10px' }} />
                            <span className="fc-sans" style={{ fontSize: '18px', fontWeight: 700, color: '#D4A017' }}>FinCalix</span>
                        </div>
                        <p className="fc-sans" style={{ fontSize: '13px', color: 'rgba(255,255,255,.55)', lineHeight: 1.7, marginBottom: '20px' }}>
                            Financial Super Calculator.<br />Built for India, by Indians.
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <FooterSocialIcon href="https://www.instagram.com/fincalix/" label="Instagram" hoverBg="linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
                            </FooterSocialIcon>
                            <FooterSocialIcon href="https://youtube.com/@fincalix" label="YouTube" hoverBg="#FF0000">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                            </FooterSocialIcon>
                            <FooterSocialIcon href="mailto:support@fincalix.com" label="Email" hoverBg="#D4A017">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                            </FooterSocialIcon>
                        </div>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="fc-sans" style={{ fontSize: '11px', fontWeight: 700, color: '#D4A017', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '16px' }}>LEGAL</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[{ label: 'Privacy Policy', href: '/privacy-policy' }, { label: 'Terms of Service', href: '/terms-of-service' }, { label: 'Data & Privacy', href: '/data-privacy' }, { label: 'About', href: '/about' }].map(l => (
                                <a key={l.href} href={l.href} className="fc-sans" style={{ fontSize: '13px', color: 'rgba(255,255,255,.5)', textDecoration: 'none', transition: 'color .2s' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.9)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.5)')}>{l.label}</a>
                            ))}
                        </div>
                    </div>

                    {/* Download */}
                    <div>
                        <h4 className="fc-sans" style={{ fontSize: '11px', fontWeight: 700, color: '#D4A017', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '16px' }}>DOWNLOAD</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="fc-sans" style={{ fontSize: '13px', color: 'rgba(255,255,255,.5)', textDecoration: 'none', transition: 'color .2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.9)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.5)')}>Download on Play Store</a>
                            <a href="mailto:support@fincalix.com" className="fc-sans" style={{ fontSize: '13px', color: 'rgba(255,255,255,.5)', textDecoration: 'none', transition: 'color .2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.9)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.5)')}>support@fincalix.com</a>
                        </div>
                        <PlayStoreBadge height={40} />
                    </div>

                    {/* Location */}
                    <div>
                        <h4 className="fc-sans" style={{ fontSize: '11px', fontWeight: 700, color: '#D4A017', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '16px' }}>ABOUT</h4>
                        <p className="fc-sans" style={{ fontSize: '13px', color: 'rgba(255,255,255,.55)', lineHeight: 1.7, marginBottom: '16px' }}>
                            Made with ❤️ in India<br />Hyderabad, Telangana, India
                        </p>
                        <span className="fc-sans" style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '11px', background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.3)', color: '#D4A017' }}>✦ v1.0.6</span>
                    </div>
                </div>

                {/* Bottom bar */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: '24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <span className="fc-sans" style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)' }}>© 2026 FinCalix. All rights reserved.</span>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        {[{ label: 'Privacy', href: '/privacy-policy' }, { label: 'Terms', href: '/terms-of-service' }, { label: 'About', href: '/about' }].map(l => (
                            <a key={l.href} href={l.href} className="fc-sans" style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)', textDecoration: 'none', transition: 'color .2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.7)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.35)')}>{l.label}</a>
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
        // Light theme — ensure body is white
        document.documentElement.style.background = '#FFFFFF';
        document.body.style.background = '#FFFFFF';
        return () => {
            document.documentElement.style.background = '';
            document.body.style.background = '';
        };
    }, []);

    const isDevMode = localStorage.getItem('fincalix_dev_access') === 'true';

    return (
        <div className="fc-sans" style={{ background: '#FFFFFF', color: '#0D3B2E', width: '100%', maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' }}>

            {/* Dev mode exit badge */}
            {isDevMode && (
                <div style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 9999, background: '#0D3B2E', color: '#D4A017', padding: '8px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, fontFamily: 'monospace', boxShadow: '0 4px 16px rgba(0,0,0,.2)' }}>
                    🛠 Dev Mode
                </div>
            )}

            <NavBar />
            <HeroSection />
            <TrustStrip />
            <WhyFinCalix />
            <BentoGrid />
            <ScreenshotsSection />
            <HowItWorks />
            <TrustSecurity />
            <CalculatorGrid />
            <FaqSection />
            <FinalCTA />
            <Footer />
        </div>
    );
}
