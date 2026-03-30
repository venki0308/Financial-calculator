import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fincalix.app';
const PLAY_BADGE_URL = 'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png';

// ── Data ──────────────────────────────────────────────────────────────────────
const SCREENSHOTS = [
  { src: '/screenshots/screen1-home.png',        caption: 'Home Dashboard'     },
  { src: '/screenshots/screen2-calculators.png', caption: '30+ Calculators'    },
  { src: '/screenshots/screen3-tax.png',         caption: 'Income Tax 2026-27' },
  { src: '/screenshots/screen4-schemes.png',     caption: 'Govt Schemes'       },
  { src: '/screenshots/screen5-expense.png',     caption: 'Expense Tracker'    },
  { src: '/screenshots/screen6-language.png',    caption: '6 Languages'        },
  { src: '/screenshots/screen7-age.png',         caption: 'Age Calculator'     },
  { src: '/screenshots/screen8-sukanya.png',     caption: 'Sukanya Samriddhi'  },
];

const SCHEMES_R1 = [
  'PM Kisan Samman Nidhi','Sukanya Samriddhi Yojana','PPF','NPS','PMAY',
  'Atal Pension Yojana','PM Fasal Bima Yojana','Ayushman Bharat','Mudra Yojana',
  'PM Jan Dhan','Stand Up India','Jal Jeevan Mission','KVP','SCSS',
];
const SCHEMES_R2 = [
  'PM Awas Yojana','e-SHRAM','PM SVANidhi','PMEGP','PMSBY','PMJJBY',
  'PM Ujjwala Yojana','PM Vaya Vandana','Kisan Credit Card','NSC Scheme',
  'Post Office MIS','POTD Scheme','PMEGP Scheme','Stand Up India Scheme',
];

const CAT_TABS = [
  { id: 'all',        label: 'All'         },
  { id: 'loans',      label: 'Loans'       },
  { id: 'tax',        label: 'Tax & Salary'},
  { id: 'investments',label: 'Investments' },
  { id: 'banking',    label: 'Banking'     },
  { id: 'retirement', label: 'Retirement'  },
  { id: 'postoffice', label: 'Post Office' },
  { id: 'business',   label: 'Business'   },
] as const;
type CatId = typeof CAT_TABS[number]['id'];

const ICON_COLORS = ['#EFF6FF','#FFF7ED','#F0FDF4','#FDF4FF','#ECFDF5','#FEF2F2','#F0F7FF','#FFFBEB','#F5F3FF','#FCE7F3'];

const FEATURES = [
  { icon:'📈', name:'SIP Calculator',       desc:'Mutual fund growth planner',        cat:'investments' },
  { icon:'🏠', name:'Home Loan EMI',         desc:'Monthly instalment planner',        cat:'loans'       },
  { icon:'🚗', name:'Car Loan EMI',          desc:'Vehicle finance calculator',        cat:'loans'       },
  { icon:'👤', name:'Personal Loan',         desc:'Interest & repayment schedule',     cat:'loans'       },
  { icon:'💼', name:'Income Tax',            desc:'Old vs New Regime 2026-27',         cat:'tax'         },
  { icon:'🧾', name:'HRA Calculator',        desc:'House Rent Allowance exemption',    cat:'tax'         },
  { icon:'📊', name:'GST Calculator',        desc:'Tax inclusive / exclusive',         cat:'tax'         },
  { icon:'🏦', name:'FD Calculator',         desc:'Fixed deposit returns',             cat:'banking'     },
  { icon:'📅', name:'RD Calculator',         desc:'Recurring deposit planner',         cat:'banking'     },
  { icon:'💰', name:'PPF Calculator',        desc:'Public Provident Fund growth',      cat:'retirement'  },
  { icon:'🏛️', name:'NPS Calculator',       desc:'National pension system corpus',    cat:'retirement'  },
  { icon:'🧓', name:'EPF Calculator',        desc:'Employee Provident Fund growth',    cat:'retirement'  },
  { icon:'👧', name:'Sukanya Samriddhi',     desc:'Girl child savings scheme',         cat:'postoffice'  },
  { icon:'🏅', name:'NSC Calculator',        desc:'National savings certificate',      cat:'postoffice'  },
  { icon:'🔑', name:'KVP Calculator',        desc:'Kisan Vikas Patra doubling',        cat:'postoffice'  },
  { icon:'🏘️', name:'Loan vs SIP',          desc:'Prepay or invest — what wins?',     cat:'loans'       },
  { icon:'💳', name:'Loan Transfer',         desc:'Compare refinancing savings',       cat:'loans'       },
  { icon:'📦', name:'GST Invoice',           desc:'Tax-compliant invoice builder',     cat:'business'    },
  { icon:'📉', name:'Break-even Analysis',   desc:'Profit threshold calculator',       cat:'business'    },
  { icon:'🏗️', name:'Property Value',       desc:'Real estate return on investment',  cat:'investments' },
  { icon:'🤖', name:'AI Advisor',            desc:'AI-powered financial insights',     cat:'all'         },
  { icon:'📒', name:'Expense Tracker',       desc:'Track every rupee spent',           cat:'all'         },
  { icon:'🎂', name:'Age Calculator',        desc:'Exact age & life milestones',       cat:'all'         },
];

const FAQS = [
  { q:'Is FinCalix really free?',
    a:'Yes, 100% free. No subscription, no premium plan, no login, no hidden charges. Download and start calculating immediately.' },
  { q:'Does it work without internet?',
    a:'All 30+ calculators work completely offline after download. No internet is needed, ever.' },
  { q:'Is Income Tax updated for Budget 2026-27?',
    a:'Yes. Income Tax Calculator is updated with Budget 2026-27 — zero tax up to ₹12L under New Regime after standard deduction.' },
  { q:'Which languages are supported?',
    a:'English, हिंदी, తెలుగు, தமிழ், ಕನ್ನಡ and Malayalam — 6 Indian languages.' },
  { q:'Is my financial data safe?',
    a:'Completely safe. We collect zero personal data. All your calculations and expense data stays only on your device.' },
  { q:'How many calculators does it have?',
    a:'FinCalix has 30+ financial calculators — SIP, EMI, FD, PPF, HRA, GST, Income Tax, NPS, Sukanya Samriddhi, Age Calculator, Expense Tracker and many more.' },
];

// ── Global CSS ────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overflow-x:hidden;font-family:'Plus Jakarta Sans',sans-serif}

/* ── Keyframes ── */
@keyframes phoneFloat{0%,100%{transform:translateY(0) rotate(1deg)}50%{transform:translateY(-14px) rotate(1deg)}}
@keyframes float1{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes float2{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes float3{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes float4{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes dotPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:.4}}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes marqueeRev{0%{transform:translateX(-50%)}100%{transform:translateX(0)}}
@keyframes heroUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}

/* ── Reveal ── */
.fcl-reveal{opacity:0;transform:translateY(24px);transition:opacity .55s cubic-bezier(.16,1,.3,1),transform .55s cubic-bezier(.16,1,.3,1)}
.fcl-reveal.fcl-visible{opacity:1;transform:none}

/* ── Hero load ── */
.fcl-hero-anim{opacity:0;animation:heroUp .6s cubic-bezier(.16,1,.3,1) forwards}

/* ── Layout ── */
.fcl-container{max-width:1200px;margin:0 auto;padding:0 24px}
.fcl-hero-grid{display:flex;align-items:center;gap:60px}
.fcl-stats-grid{display:grid;grid-template-columns:repeat(4,1fr)}
.fcl-persona-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.fcl-features-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.fcl-trust-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.fcl-steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:32px;position:relative}
.fcl-faq-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;align-items:start}
.fcl-footer-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:48px}
.fcl-footer-bottom{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.fcl-expense-grid{display:flex;align-items:center;gap:64px}

/* ── Scrollbar hide ── */
.fcl-scroll-hide{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;scroll-snap-type:x mandatory}
.fcl-scroll-hide::-webkit-scrollbar{display:none}

/* ── Nav pills/badge ── */
.fcl-nav-desktop{display:flex;align-items:center;gap:20px}
.fcl-nav-mobile{display:none;align-items:center;justify-content:center;gap:8px;background:#1B3A2D;color:#fff;font-size:13px;font-weight:600;padding:8px 16px;border-radius:100px;text-decoration:none;white-space:nowrap}

/* ── Marquee rows ── */
.fcl-marquee-track{display:flex;width:max-content;gap:0}
.fcl-marquee-track:hover{animation-play-state:paused}

/* ── Tablet ── */
@media(max-width:1024px){
  .fcl-features-grid{grid-template-columns:repeat(3,1fr)}
  .fcl-footer-grid{grid-template-columns:repeat(2,1fr);gap:32px}
  .fcl-steps-grid{gap:20px}
  .fcl-expense-grid{gap:40px}
}

/* ── Mobile ── */
@media(max-width:767px){
  .fcl-container{padding:0 20px}
  .fcl-hero-grid{flex-direction:column;text-align:center;gap:40px}
  .fcl-stats-grid{grid-template-columns:repeat(2,1fr)}
  .fcl-persona-grid{grid-template-columns:1fr}
  .fcl-features-grid{grid-template-columns:repeat(2,1fr)}
  .fcl-trust-grid{grid-template-columns:1fr}
  .fcl-steps-grid{grid-template-columns:1fr}
  .fcl-faq-grid{grid-template-columns:1fr}
  .fcl-footer-grid{grid-template-columns:1fr;gap:32px}
  .fcl-footer-bottom{flex-direction:column;align-items:center;text-align:center}
  .fcl-expense-grid{flex-direction:column;gap:32px}
  .fcl-float-card{display:none!important}
  .fcl-nav-desktop{display:none}
  .fcl-nav-mobile{display:flex}
  .fcl-steps-arrow{display:none!important}
  .fcl-screenshots-arrows{display:none!important}
  .fcl-section{padding:60px 0!important}
  .fcl-hero-social{justify-content:center}
  .fcl-trust-chips{justify-content:center}
}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '', style }: { children: ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('fcl-visible'); obs.disconnect(); } },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`fcl-reveal ${className}`} style={{ ...(delay ? { transitionDelay: `${delay}ms` } : {}), ...style }}>
      {children}
    </div>
  );
}

function PlayBadge({ height = 56 }: { height?: number }) {
  return (
    <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
      <img
        src={PLAY_BADGE_URL}
        alt="Get it on Google Play"
        width={646}
        height={250}
        style={{ height: `${height}px`, width: 'auto', cursor: 'pointer', filter: 'drop-shadow(0 4px 16px rgba(45,106,79,0.25))', transition: 'transform 0.2s ease', display: 'block' }}
        onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.04)')}
        onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
      />
    </a>
  );
}

function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const spanRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const dur = 1200;
        const t0 = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - t0) / dur, 1);
          const e = 1 - Math.pow(1 - p, 3);
          setCount(Math.round(e * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={spanRef}>{count}{suffix}</span>;
}

// ── 01 NAVBAR ────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 1000,
      background: '#fff', borderBottom: '1px solid #E5E7EB',
      boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
      height: '64px', display: 'flex', alignItems: 'center',
    }}>
      <div className="fcl-container" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/icons/fincalix-logo.png" alt="FinCalix" width={32} height={32} style={{ width: '32px', height: '32px', borderRadius: '8px' }} loading="lazy" />
          <span style={{ color: '#1B3A2D', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em' }}>FinCalix</span>
        </div>
        {/* Desktop right */}
        <div className="fcl-nav-desktop">
          <a href="/privacy-policy" style={{ color: '#6B7280', fontSize: '14px', fontWeight: 500, textDecoration: 'none', transition: 'color .2s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#1B3A2D')}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#6B7280')}>
            Privacy Policy
          </a>
          <span style={{ color: '#E5E7EB' }}>|</span>
          <PlayBadge height={40} />
        </div>
        {/* Mobile pill */}
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="fcl-nav-mobile">
          ↓ Get Free App
        </a>
      </div>
    </nav>
  );
}

// ── 02 HERO ───────────────────────────────────────────────────────────────────
function HeroSection() {
  const [imgFailed, setImgFailed] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const phoneW = isMobile ? 240 : 260;
  const phoneH = isMobile ? 460 : 520;

  return (
    <section id="hero" style={{
      width: '100%',
      boxSizing: 'border-box',
      padding: isMobile ? '80px 20px 60px' : '100px 24px 80px',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#FFFFFF',
    }}>
      {/* bg decoration */}
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '600px', height: '600px', background: 'radial-gradient(circle, #D8F3DC, transparent)', opacity: .5, filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '300px', height: '300px', background: 'radial-gradient(circle, #FEF6DC, transparent)', opacity: .6, filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Content wrapper — single column on mobile, 2-col on desktop */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        gap: isMobile ? '48px' : '64px',
        textAlign: isMobile ? 'center' : 'left',
      }}>

        {/* LEFT */}
        <div style={{
          flex: isMobile ? 'none' : '0 0 55%',
          width: isMobile ? '100%' : 'auto',
          maxWidth: isMobile ? '100%' : '580px',
          zIndex: 1,
        }}>
          {/* badge */}
          <div className="fcl-hero-anim" style={{ animationDelay: '200ms', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#F0F7F4', border: '1px solid #B7E4C7', borderRadius: '100px', padding: '6px 14px', marginBottom: '20px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#52B788', flexShrink: 0, animation: 'dotPulse 2s infinite' }} />
            <span style={{ color: '#2D6A4F', fontSize: '13px', fontWeight: 600 }}>Budget 2026-27 Updated · Zero tax up to ₹12L</span>
          </div>

          {/* H1 */}
          <h1 className="fcl-hero-anim" style={{
            animationDelay: '350ms',
            fontSize: isMobile ? 'clamp(36px, 10vw, 48px)' : '64px',
            fontWeight: 900, lineHeight: 1.05,
            letterSpacing: '-0.02em', color: '#0F1F18', marginBottom: '20px',
          }}>
            Calculate Smarter,<br />
            <span style={{ color: '#2D6A4F' }}>Save More,</span><br />
            Every Rupee.
          </h1>

          {/* sub */}
          <p className="fcl-hero-anim" style={{
            animationDelay: '500ms',
            fontSize: isMobile ? '16px' : '18px', color: '#6B7280', lineHeight: 1.6,
            maxWidth: isMobile ? '100%' : '480px', marginBottom: '24px',
          }}>
            India's most complete financial calculator — SIP, EMI, Tax, PPF, GST and 25+ more tools. Free forever. Works offline. No login.
          </p>

          {/* CTA */}
          <div className="fcl-hero-anim" style={{
            animationDelay: '600ms', marginBottom: '16px',
            display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start',
          }}>
            <PlayBadge height={56} />
          </div>

          {/* trust chips */}
          <div className="fcl-hero-anim" style={{
            animationDelay: '700ms',
            display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '28px',
            justifyContent: isMobile ? 'center' : 'flex-start',
          }}>
            {[
              { icon: '🔒', text: 'Zero Data Collected' },
              { icon: '📵', text: '100% Offline' },
              { icon: '🇮🇳', text: 'Made for India' },
            ].map(chip => (
              <div key={chip.text} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#F0F7F4', border: '1px solid #B7E4C7', borderRadius: '100px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#2D6A4F', whiteSpace: 'nowrap' }}>
                <span>{chip.icon}</span>
                <span>{chip.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — phone mockup */}
        <div style={{
          flex: isMobile ? 'none' : '0 0 45%',
          width: isMobile ? '100%' : 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          minHeight: isMobile ? '500px' : '600px',
        }}>
          <div className="fcl-hero-anim" style={{
            animationDelay: '900ms',
            position: 'relative',
            width: isMobile ? '280px' : '420px',
            height: isMobile ? '500px' : '580px',
          }}>

            {/* Phone frame */}
            <div style={{
              position: 'absolute',
              left: isMobile ? '20px' : '80px',
              top: '20px',
              width: `${phoneW}px`,
              borderRadius: '40px',
              border: '8px solid #1B3A2D',
              boxShadow: '0 40px 80px rgba(27,58,45,.20), 0 0 0 1px rgba(27,58,45,.08)',
              overflow: 'hidden',
              backgroundColor: '#1B3A2D',
              animation: 'phoneFloat 5s ease-in-out infinite',
              zIndex: 2,
            }}>
              <div style={{ width: '80px', height: '8px', background: 'rgba(255,255,255,.15)', borderRadius: '4px', margin: '12px auto 8px' }} />
              {imgFailed ? (
                <div style={{ height: `${phoneH}px`, background: '#F7F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#6B7280', fontSize: '14px', fontWeight: 600 }}>FinCalix App</span>
                </div>
              ) : (
                <img src="/screenshots/screen1-home.png" alt="FinCalix App" onError={() => setImgFailed(true)}
                  width={390} height={500}
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  style={{ width: '100%', height: `${phoneH}px`, objectFit: 'cover', objectPosition: 'top', display: 'block', borderRadius: '34px' }} />
              )}
            </div>

            {/* Card 1 — top right (visible on all screens, tucked in on mobile) */}
            <div style={{
              position: 'absolute',
              right: isMobile ? '-10px' : 0,
              top: isMobile ? '-20px' : '60px',
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px',
              padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,.10)',
              animation: 'float1 4s ease-in-out infinite', zIndex: 3,
            }}>
              <div style={{ fontSize: isMobile ? '11px' : '13px', fontWeight: 700, color: '#0F1F18', whiteSpace: 'nowrap' }}>📈 SIP Calculator</div>
              <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#6B7280', marginTop: '2px', whiteSpace: 'nowrap' }}>Mutual Fund Returns</div>
            </div>

            {/* Card 2 — bottom left (visible on all screens, tucked in on mobile) */}
            <div style={{
              position: 'absolute',
              left: isMobile ? '-10px' : 0,
              bottom: isMobile ? '-10px' : '80px',
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px',
              padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,.10)',
              animation: 'float2 5s ease-in-out 1s infinite', zIndex: 3,
            }}>
              <div style={{ fontSize: isMobile ? '11px' : '13px', fontWeight: 700, color: '#0F1F18', whiteSpace: 'nowrap' }}>🏠 EMI Calculator</div>
              <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#6B7280', marginTop: '2px', whiteSpace: 'nowrap' }}>Home, Car, Personal</div>
            </div>

            {/* Card 3 — left center (desktop only — would overflow on mobile) */}
            {!isMobile && (
              <div style={{ position: 'absolute', left: '-10px', top: '50%', transform: 'translateY(-50%)', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,.10)', animation: 'float3 6s ease-in-out .5s infinite', minWidth: '150px', zIndex: 3 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F1F18' }}>💰 Budget 2026-27</div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>Zero tax up to ₹12L</div>
              </div>
            )}

            {/* Card 4 — right center (desktop only — would overflow on mobile) */}
            {!isMobile && (
              <div style={{ position: 'absolute', right: '-10px', top: '50%', transform: 'translateY(-50%)', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,.10)', animation: 'float4 4.5s ease-in-out 1.5s infinite', minWidth: '120px', zIndex: 3 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F1F18' }}>📊 30+ Tools</div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>All Free</div>
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}

// ── 03 STATS BAR ──────────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { num: 30, suffix: '+', label: 'Smart Calculators' },
    { num: 45, suffix: '+', label: 'Govt Schemes'      },
    { num: 6,  suffix: '',  label: 'Indian Languages'  },
    { num: 0,  suffix: '∞', label: 'Free Forever', special: true },
  ];
  return (
    <section style={{ background: '#1B3A2D', padding: '40px 0' }}>
      <div className="fcl-container">
        <div className="fcl-stats-grid">
          {stats.map((s, i) => (
            <div key={s.label} style={{
              textAlign: 'center', padding: '24px 16px',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,.12)' : undefined,
            }}>
              <div style={{ fontSize: 'clamp(36px, 4vw, 48px)', fontWeight: 900, color: '#F4C842', lineHeight: 1 }}>
                {s.special ? '∞' : <CountUp target={s.num} suffix={s.suffix} />}
              </div>
              <div style={{ fontSize: '15px', color: 'rgba(255,255,255,.75)', marginTop: '6px', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 04 PERSONA SECTION ────────────────────────────────────────────────────────
function PersonaSection() {
  const cards = [
    {
      icon: '💼', iconBg: '#EFF6FF', accentColor: '#3B82F6',
      name: 'Salaried Professional',
      desc: 'Calculate your exact take-home salary, compare Old vs New Tax Regime, plan HRA deductions — all in minutes.',
      tools: ['Income Tax', 'HRA', 'Salary'],
      quote: '"Finally understand if New Regime saves me money"',
    },
    {
      icon: '🏠', iconBg: '#FFF7ED', accentColor: '#F59E0B',
      name: 'Home Buyer',
      desc: 'Know your exact EMI before approaching any bank. Compare tenures, prepayment scenarios, loan vs SIP.',
      tools: ['EMI', 'Loan vs SIP', 'Loan Transfer'],
      quote: '"Saved ₹3 lakhs by choosing the right tenure"',
    },
    {
      icon: '📈', iconBg: '#F0FDF4', accentColor: '#2D6A4F',
      name: 'Investor & Planner',
      desc: 'Plan SIP returns, FD comparisons, PPF maturity, NPS projections — everything needed to build long-term wealth.',
      tools: ['SIP', 'FD/RD', 'PPF', 'NPS'],
      quote: '"My retirement planning is finally clear"',
    },
  ];
  return (
    <section className="fcl-section" style={{ background: '#F7F9FC', padding: '100px 0' }}>
      <div className="fcl-container">
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{ color: '#2D6A4F', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>FOR EVERY INDIAN</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0F1F18', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              Built for Real People,<br />Real Financial Decisions
            </h2>
          </div>
        </Reveal>
        <div className="fcl-persona-grid">
          {cards.map((c, i) => (
            <Reveal key={c.name} delay={i * 80}>
              <div style={{
                background: '#fff', border: '1px solid #E5E7EB', borderRadius: '20px', padding: '32px',
                boxShadow: '0 4px 12px rgba(0,0,0,.08)', transition: 'all .3s ease',
                borderLeft: `3px solid ${c.accentColor}`, height: '100%',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-6px)'; el.style.boxShadow = '0 8px 24px rgba(0,0,0,.10)'; el.style.borderColor = '#B7E4C7'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'none'; el.style.boxShadow = '0 4px 12px rgba(0,0,0,.08)'; el.style.borderColor = '#E5E7EB'; }}
              >
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: c.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '20px' }}>{c.icon}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F1F18', marginBottom: '10px' }}>{c.name}</h3>
                <p style={{ fontSize: '15px', color: '#6B7280', lineHeight: 1.6, marginBottom: '20px' }}>{c.desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                  {c.tools.map(t => (
                    <span key={t} style={{ background: '#F0F7F4', color: '#2D6A4F', border: '1px solid #B7E4C7', borderRadius: '100px', padding: '4px 10px', fontSize: '12px', fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
                <p style={{ fontSize: '14px', color: '#6B7280', fontStyle: 'italic', borderTop: '1px solid #F3F4F6', paddingTop: '16px' }}>{c.quote}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 05 SCREENSHOTS CAROUSEL ───────────────────────────────────────────────────
function ScreenshotsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const CARD_W = 280;
  const scroll = (dir: 'left' | 'right') => scrollRef.current?.scrollBy({ left: dir === 'left' ? -CARD_W : CARD_W, behavior: 'smooth' });
  const GRADIENTS = ['linear-gradient(135deg,#0A1628,#1a3a5c)','linear-gradient(135deg,#1a2a1a,#0a3020)','linear-gradient(135deg,#2a1a0a,#3a2010)','linear-gradient(135deg,#1a0a2a,#2a1040)','linear-gradient(135deg,#0a1a2a,#102040)','linear-gradient(135deg,#2a1a1a,#401020)','linear-gradient(135deg,#0a2a1a,#104030)','linear-gradient(135deg,#1a1a2a,#201040)'];
  return (
    <section className="fcl-section" style={{ background: '#fff', padding: '100px 0' }}>
      <div className="fcl-container">
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{ color: '#2D6A4F', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>SEE IT IN ACTION</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0F1F18', letterSpacing: '-0.02em' }}>Every Feature, Beautifully Simple</h2>
            <p style={{ color: '#6B7280', fontSize: '16px', marginTop: '12px' }}>Real screenshots from the FinCalix app</p>
          </div>
        </Reveal>
      </div>

      {/* Carousel container */}
      <div style={{ position: 'relative' }}>
        <button className="fcl-screenshots-arrows" onClick={() => scroll('left')} aria-label="Previous"
          style={{ position: 'absolute', left: '16px', top: '45%', transform: 'translateY(-50%)', zIndex: 2, width: '40px', height: '40px', borderRadius: '50%', background: '#fff', border: '1px solid #E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,.08)', fontSize: '18px', color: '#374151' }}>
          ‹
        </button>
        <div ref={scrollRef} className="fcl-scroll-hide" style={{ display: 'flex', gap: '20px', padding: '20px 60px 40px' }}>
          {SCREENSHOTS.map((s, i) => (
            <div key={s.caption} style={{ flex: '0 0 220px', scrollSnapAlign: 'start' }}>
              <div style={{
                background: GRADIENTS[i % GRADIENTS.length], borderRadius: '32px', padding: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,.10)', transition: 'all .3s ease', cursor: 'pointer',
                position: 'relative', overflow: 'hidden',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'scale(1.04) translateY(-6px)'; el.style.boxShadow = '0 20px 48px rgba(0,0,0,.12)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'none'; el.style.boxShadow = '0 8px 24px rgba(0,0,0,.10)'; }}
              >
                <div style={{ height: '390px', borderRadius: '24px', overflow: 'hidden', position: 'relative', background: GRADIENTS[i % GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,.2)', fontSize: '11px', textAlign: 'center', padding: '0 8px', position: 'absolute' }}>{s.caption}</span>
                  <img src={s.src} alt={s.caption} loading="lazy" decoding="async"
                    width={220} height={390}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', borderRadius: '24px', position: 'relative', zIndex: 1 }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                </div>
              </div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', textAlign: 'center', marginTop: '12px' }}>{s.caption}</p>
            </div>
          ))}
        </div>
        <button className="fcl-screenshots-arrows" onClick={() => scroll('right')} aria-label="Next"
          style={{ position: 'absolute', right: '16px', top: '45%', transform: 'translateY(-50%)', zIndex: 2, width: '40px', height: '40px', borderRadius: '50%', background: '#fff', border: '1px solid #E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,.08)', fontSize: '18px', color: '#374151' }}>
          ›
        </button>
      </div>
    </section>
  );
}

// ── 06 FEATURES GRID ─────────────────────────────────────────────────────────
function FeaturesGrid() {
  const [activeCat, setActiveCat] = useState<CatId>('all');
  const filtered = activeCat === 'all' ? FEATURES : FEATURES.filter(f => f.cat === activeCat);
  return (
    <section id="features" className="fcl-section" style={{ background: '#F7F9FC', padding: '100px 0' }}>
      <div className="fcl-container">
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p style={{ color: '#2D6A4F', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>FEATURES</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0F1F18', letterSpacing: '-0.02em' }}>Everything You Need, Nothing You Don't</h2>
            <p style={{ color: '#6B7280', fontSize: '16px', marginTop: '12px' }}>30+ tools built for Indian financial planning</p>
          </div>
        </Reveal>

        {/* Category filter tabs */}
        <Reveal delay={100}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '32px', overflowX: 'auto' }}>
            {CAT_TABS.map(t => (
              <button key={t.id} onClick={() => setActiveCat(t.id)}
                style={{
                  padding: '8px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all .2s ease', whiteSpace: 'nowrap',
                  background: activeCat === t.id ? '#1B3A2D' : '#F7F9FC',
                  color: activeCat === t.id ? '#fff' : '#374151',
                  boxShadow: activeCat === t.id ? '0 4px 12px rgba(27,58,45,.2)' : 'none',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="fcl-features-grid">
          {filtered.map((f, i) => (
            <Reveal key={f.name} delay={i * 40}>
              <div style={{
                background: '#fff', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,.06)', transition: 'all .3s ease',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = '#B7E4C7'; el.style.boxShadow = '0 4px 12px rgba(0,0,0,.08)'; el.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = '#E5E7EB'; el.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)'; el.style.transform = 'none'; }}
              >
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: ICON_COLORS[i % ICON_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '14px' }}>{f.icon}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F1F18', marginBottom: '4px' }}>{f.name}</div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>{f.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280', fontSize: '14px' }}>
            No features in this category yet.
          </div>
        )}
      </div>
    </section>
  );
}

// ── 07 SCHEMES MARQUEE ────────────────────────────────────────────────────────
function SchemesBanner() {
  const double = (arr: string[]) => [...arr, ...arr];
  const r1 = double(SCHEMES_R1);
  const r2 = double(SCHEMES_R2);
  const pill = (s: string, i: number) => (
    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: '100px', padding: '8px 16px', fontSize: '14px', color: '#fff', whiteSpace: 'nowrap', margin: '0 6px' }}>
      <span style={{ color: '#F4C842', fontSize: '8px' }}>●</span> {s}
    </span>
  );
  return (
    <section style={{ background: '#1B3A2D', padding: '60px 0', overflow: 'hidden' }}>
      <Reveal>
        <p style={{ textAlign: 'center', color: '#F4C842', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>DISCOVER</p>
        <h2 style={{ textAlign: 'center', color: '#fff', fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '36px', padding: '0 24px' }}>45+ Government Schemes for You</h2>
      </Reveal>
      <div style={{ overflow: 'hidden' }}>
        <div className="fcl-marquee-track" style={{ animation: 'marquee 30s linear infinite' }}>
          {r1.map((s, i) => pill(s, i))}
        </div>
        <div className="fcl-marquee-track" style={{ animation: 'marqueeRev 35s linear infinite', marginTop: '12px' }}>
          {r2.map((s, i) => pill(s, i))}
        </div>
      </div>
    </section>
  );
}

// ── 08 EXPENSE TRACKER ────────────────────────────────────────────────────────
function ExpenseTrackerSection() {
  const bars = [
    { name: 'Food & Dining',  pct: 78, color: '#EF4444' },
    { name: 'Transport',      pct: 52, color: '#3B82F6' },
    { name: 'Shopping',       pct: 35, color: '#8B5CF6' },
    { name: 'Utilities',      pct: 60, color: '#F59E0B' },
    { name: 'Entertainment',  pct: 28, color: '#10B981' },
  ];
  const points = ['Category-wise expense tracking','Monthly & yearly financial reports','Financial Health Score','PDF & Excel export'];
  return (
    <section className="fcl-section" style={{ background: '#F7F9FC', padding: '100px 0' }}>
      <div className="fcl-container">
        <div className="fcl-expense-grid">
          {/* Left — mockup card */}
          <Reveal style={{ flexShrink: 0 }}>
            <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', maxWidth: '360px', boxShadow: '0 8px 24px rgba(0,0,0,.10)' }}>
              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>March 2026 · Expense Overview</div>
              {/* Health score */}
              <div style={{ background: '#1B3A2D', borderRadius: '12px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,.65)', fontSize: '12px', marginBottom: '4px' }}>Financial Health Score</div>
                  <div style={{ color: '#F4C842', fontSize: '26px', fontWeight: 800 }}>78 <span style={{ fontSize: '14px', opacity: .6 }}>/100 🏆</span></div>
                </div>
              </div>
              {/* Bars */}
              {bars.map(b => (
                <div key={b.name} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#374151' }}>{b.name}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>{b.pct}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${b.pct}%`, background: b.color, borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
              {/* Bottom row */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <div style={{ flex: 1, background: '#F7F9FC', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#EF4444' }}>₹24,850</div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>Spent</div>
                </div>
                <div style={{ flex: 1, background: '#F7F9FC', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#2D6A4F' }}>₹15,150</div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>Saved</div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right — copy */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Reveal>
              <p style={{ color: '#D4A017', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>EXPENSE TRACKER</p>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0F1F18', letterSpacing: '-0.02em', marginBottom: '16px', lineHeight: 1.15 }}>
                Track Every Rupee.<br /><span style={{ color: '#2D6A4F' }}>Stay Ahead.</span>
              </h2>
              <p style={{ fontSize: '16px', color: '#6B7280', lineHeight: 1.6, marginBottom: '28px' }}>
                FinCalix's built-in expense tracker gives you a clear picture of where your money goes — with smart category breakdowns and a financial health score.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {points.map(p => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '22px', height: '22px', flexShrink: 0, borderRadius: '50%', background: '#1B3A2D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F4C842', fontSize: '12px', fontWeight: 800 }}>✓</div>
                    <span style={{ fontSize: '15px', color: '#374151', fontWeight: 500 }}>{p}</span>
                  </div>
                ))}
              </div>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#1B3A2D', color: '#fff', fontSize: '15px', fontWeight: 600, padding: '14px 28px', borderRadius: '12px', textDecoration: 'none', boxShadow: '0 8px 24px rgba(45,106,79,.15)', transition: 'background .2s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = '#2D6A4F')}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = '#1B3A2D')}>
                Start Tracking Free →
              </a>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 09 TRUST & SECURITY ───────────────────────────────────────────────────────
function TrustSection() {
  const cards = [
    { icon: '🔒', title: 'Zero Data Collection', accent: '#2D6A4F', body: 'No personal or financial data ever leaves your device. No servers, no accounts, no tracking.' },
    { icon: '✅', title: 'Verified Calculations', accent: '#D4A017', body: 'All formulas verified against RBI, Income Tax Dept, and official government guidelines.' },
    { icon: '🇮🇳', title: 'Made for India',       accent: '#3B82F6', body: 'Built for Indian tax laws, government schemes, Indian financial products and 6 regional languages.' },
  ];
  return (
    <section className="fcl-section" style={{ background: '#fff', padding: '80px 0' }}>
      <div className="fcl-container">
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, color: '#0F1F18', letterSpacing: '-0.02em', marginBottom: '12px' }}>Your Money Data Stays Private</h2>
            <p style={{ fontSize: '16px', color: '#6B7280' }}>We collect zero personal data. Everything stays on your device.</p>
          </div>
        </Reveal>
        <div className="fcl-trust-grid">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 80}>
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderTop: `3px solid ${c.accent}`, borderRadius: '16px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', height: '100%' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{c.icon}</div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0F1F18', marginBottom: '8px' }}>{c.title}</h3>
                <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.6 }}>{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 10 HOW IT WORKS ───────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Download Free', body: 'Get FinCalix from Play Store. No signup, no account. Takes 30 seconds.' },
    { num: '02', title: 'Choose a Calculator', body: 'Pick from 30+ calculators or search any calculator instantly.' },
    { num: '03', title: 'Get Instant Results', body: 'Accurate results with charts, comparisons and smart insights. Instantly.' },
  ];
  return (
    <section className="fcl-section" style={{ background: '#F0F7F4', padding: '100px 0' }}>
      <div className="fcl-container">
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0F1F18', letterSpacing: '-0.02em', marginBottom: '12px' }}>Start in 3 Simple Steps</h2>
            <p style={{ fontSize: '16px', color: '#6B7280' }}>Download, open, calculate — it's that easy</p>
          </div>
        </Reveal>
        <div className="fcl-steps-grid">
          {steps.map((s, i) => (
            <Reveal key={s.num} delay={i * 100} style={{ position: 'relative' }}>
              {i < 2 && (
                <span className="fcl-steps-arrow" style={{ position: 'absolute', right: '-24px', top: '50%', transform: 'translateY(-50%)', fontSize: '24px', color: '#B7E4C7', zIndex: 1 }}>→</span>
              )}
              <div style={{ background: '#fff', borderRadius: '20px', padding: '36px 28px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#1B3A2D', color: '#F4C842', fontSize: '22px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>{s.num}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F1F18', marginBottom: '10px' }}>{s.title}</h3>
                <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.6 }}>{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 11 FAQ ───────────────────────────────────────────────────────────────────
function FAQSection() {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const toggle = (i: number) => setOpen(prev => ({ ...prev, [i]: !prev[i] }));
  return (
    <section id="faq" className="fcl-section" style={{ background: '#fff', padding: '100px 0' }}>
      <div className="fcl-container">
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0F1F18', letterSpacing: '-0.02em', marginBottom: '12px' }}>Common Questions</h2>
            <p style={{ fontSize: '16px', color: '#6B7280' }}>Everything you need to know about FinCalix</p>
          </div>
        </Reveal>
        <div className="fcl-faq-grid">
          {FAQS.map((f, i) => (
            <Reveal key={i} delay={i * 50}>
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden', ...(open[i] ? { borderColor: '#B7E4C7', boxShadow: '0 4px 12px rgba(45,106,79,.1)' } : {}) }}>
                <button
                  aria-expanded={!!open[i]}
                  onClick={() => toggle(i)}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', textAlign: 'left' }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#0F1F18', flex: 1 }}>{f.q}</span>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#F7F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2D6A4F', fontSize: '18px', fontWeight: 400, flexShrink: 0, transition: 'transform .2s ease', transform: open[i] ? 'rotate(45deg)' : 'none' }}>+</span>
                </button>
                {open[i] && (
                  <div style={{ padding: '0 20px 18px', fontSize: '14px', color: '#6B7280', lineHeight: 1.6, background: '#FAFAFA', borderTop: '1px solid #F3F4F6' }}>
                    {f.a}
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 12 FINAL CTA ─────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section style={{ background: 'linear-gradient(135deg,#1B3A2D 0%,#2D6A4F 100%)', padding: '100px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '500px', height: '500px', background: 'radial-gradient(circle, #F4C842, transparent)', opacity: .06, filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div className="fcl-container" style={{ position: 'relative', zIndex: 1 }}>
        <Reveal>
          <p style={{ color: '#F4C842', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '20px' }}>START FOR FREE</p>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '20px' }}>
            Start Managing Your Money <span style={{ color: '#F4C842' }}>Smarter</span>
          </h2>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,.75)', marginBottom: '36px', lineHeight: 1.6, maxWidth: '500px', margin: '0 auto 36px' }}>
            Join thousands of Indians using FinCalix to plan, save, and grow their wealth.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <PlayBadge height={64} />
          </div>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '13px' }}>Android · Free · No signup needed</p>
        </Reveal>
      </div>
    </section>
  );
}

// ── 13 FOOTER ────────────────────────────────────────────────────────────────
function Footer() {
  const headStyle: React.CSSProperties = { color: 'rgba(255,255,255,.4)', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, textTransform: 'uppercase' as const, marginBottom: '16px' };
  const linkStyle: React.CSSProperties = { color: 'rgba(255,255,255,.65)', fontSize: '14px', textDecoration: 'none', display: 'block', transition: 'color .2s' };
  const hoverIn = (e: React.MouseEvent) => ((e.currentTarget as HTMLAnchorElement).style.color = '#fff');
  const hoverOut = (e: React.MouseEvent) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,.65)');
  return (
    <footer style={{ background: '#0F2318', borderTop: '1px solid rgba(255,255,255,.06)', padding: '64px 0 32px' }}>
      <div className="fcl-container">
        <div className="fcl-footer-grid">

          {/* Col 1 — Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <img src="/icons/fincalix-logo.png" alt="FinCalix" width={32} height={32} style={{ width: '32px', height: '32px', borderRadius: '8px' }} loading="lazy" />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '18px' }}>FinCalix</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '14px', marginBottom: '24px' }}>Your Financial Companion</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { href: 'https://instagram.com', label: 'Instagram', svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
                { href: 'https://youtube.com', label: 'YouTube', svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg> },
                { href: 'mailto:support@fincalix.com', label: 'Email', svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
              ].map(s => (
                <a key={s.label} href={s.href} target={s.href.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer" aria-label={s.label}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.65)', textDecoration: 'none', transition: 'background .2s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,.15)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,.08)')}>
                  {s.svg}
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 — Legal */}
          <div>
            <p style={headStyle}>LEGAL</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[{ l: 'Privacy Policy', h: '/privacy-policy' }, { l: 'Terms of Service', h: '/terms-of-service' }, { l: 'Data & Privacy', h: '/data-privacy' }, { l: 'About Us', h: '/about' }].map(x => (
                <a key={x.l} href={x.h} style={linkStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>{x.l}</a>
              ))}
            </div>
          </div>

          {/* Col 3 — Download */}
          <div>
            <p style={headStyle}>DOWNLOAD</p>
            <div style={{ marginBottom: '16px' }}><PlayBadge height={44} /></div>
            <a href="mailto:support@fincalix.com" style={linkStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>support@fincalix.com</a>
          </div>

          {/* Col 4 — About */}
          <div>
            <p style={headStyle}>ABOUT</p>
            <p style={{ color: 'rgba(255,255,255,.65)', fontSize: '14px' }}>Made with ❤️ in India</p>
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: '13px', marginTop: '4px' }}>Hyderabad, Telangana, India</p>
            <div style={{ display: 'inline-flex', marginTop: '16px', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: '100px', padding: '4px 12px', color: 'rgba(255,255,255,.6)', fontSize: '12px' }}>✦ v1.0.6</div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="fcl-footer-bottom" style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <p style={{ color: 'rgba(255,255,255,.3)', fontSize: '13px' }}>© 2026 FinCalix. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {[{ l: 'Privacy', h: '/privacy-policy' }, { l: 'Terms', h: '/terms-of-service' }, { l: 'About', h: '/about' }].map((x, i) => (
              <span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {i > 0 && <span style={{ color: 'rgba(255,255,255,.2)', fontSize: '13px' }}>·</span>}
                <a href={x.h} style={{ color: 'rgba(255,255,255,.35)', fontSize: '13px', textDecoration: 'none', transition: 'color .2s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,.7)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,.35)')}>
                  {x.l}
                </a>
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function WebLandingPage() {
  useEffect(() => {
    const id = 'fcl-styles';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = GLOBAL_CSS;
      document.head.appendChild(s);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minWidth: 0, overflowX: 'hidden', background: '#fff' }}>
      <Navbar />
      <main>
        <HeroSection />
        <StatsBar />
        <PersonaSection />
        <ScreenshotsCarousel />
        <FeaturesGrid />
        <SchemesBanner />
        <ExpenseTrackerSection />
        <TrustSection />
        <HowItWorks />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
