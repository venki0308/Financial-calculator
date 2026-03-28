import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fincalix.app';

// ─── Calculator Data ──────────────────────────────────────────────────────────
const CALC_TABS = [
  { id: 'loans',       label: '🏦 Loans',        count: 5  },
  { id: 'tax',         label: '💰 Tax & Salary',  count: 6  },
  { id: 'investments', label: '📈 Investments',   count: 8  },
  { id: 'banking',     label: '🏛 Banking',       count: 4  },
  { id: 'retirement',  label: '🎯 Retirement',    count: 4  },
  { id: 'postoffice',  label: '📮 Post Office',   count: 4  },
  { id: 'business',    label: '🏢 Business',      count: 4  },
] as const;
type TabId = typeof CALC_TABS[number]['id'];

const CALCS: Record<TabId, { icon: string; name: string; desc: string }[]> = {
  loans: [
    { icon: '🏠', name: 'Home Loan EMI',       desc: 'Monthly instalment planner'         },
    { icon: '🚗', name: 'Car Loan EMI',         desc: 'Vehicle finance calculator'         },
    { icon: '💳', name: 'Personal Loan EMI',    desc: 'Interest & repayment schedule'      },
    { icon: '📉', name: 'Loan vs SIP',          desc: 'Prepay or invest — what wins?'      },
    { icon: '🔃', name: 'Loan Balance Transfer', desc: 'Compare refinancing savings'       },
  ],
  tax: [
    { icon: '💼', name: 'Income Tax 2026-27',   desc: 'Old vs New Regime comparison'       },
    { icon: '🧾', name: 'HRA Calculator',        desc: 'House Rent Allowance exemption'     },
    { icon: '📊', name: 'GST Calculator',        desc: 'Inclusive & exclusive GST rates'    },
    { icon: '💰', name: 'TDS Calculator',        desc: 'Tax deducted at source'             },
    { icon: '🏢', name: 'Capital Gains Tax',     desc: 'STCG & LTCG computation'            },
    { icon: '📋', name: 'Salary Slip Calculator',desc: 'CTC to in-hand breakdown'           },
  ],
  investments: [
    { icon: '📈', name: 'SIP Calculator',        desc: 'Mutual fund monthly returns'        },
    { icon: '💹', name: 'Lumpsum Calculator',    desc: 'One-time investment growth'         },
    { icon: '🏦', name: 'FD Calculator',         desc: 'Fixed deposit maturity value'       },
    { icon: '📅', name: 'RD Calculator',         desc: 'Recurring deposit planner'          },
    { icon: '💰', name: 'PPF Calculator',         desc: 'Public Provident Fund growth'       },
    { icon: '🏘️', name: 'Property Calculator',   desc: 'Real estate return on investment'   },
    { icon: '📐', name: 'CAGR Calculator',        desc: 'Compound annual growth rate'        },
    { icon: '🔢', name: 'XIRR Calculator',        desc: 'Portfolio internal rate of return'  },
  ],
  banking: [
    { icon: '🏛️', name: 'Savings Interest',      desc: 'Bank account interest earnings'     },
    { icon: '💸', name: 'Compound Interest',      desc: 'Compounding frequency comparison'   },
    { icon: '🔁', name: 'Simple Interest',        desc: 'Flat rate interest planner'         },
    { icon: '🧮', name: 'Overdraft Calculator',   desc: 'Bank overdraft cost estimator'      },
  ],
  retirement: [
    { icon: '🏛️', name: 'NPS Calculator',        desc: 'National Pension System corpus'     },
    { icon: '🧓', name: 'EPF Calculator',         desc: 'Employee Provident Fund growth'     },
    { icon: '🎯', name: 'Retirement Planner',     desc: 'Financial independence timeline'    },
    { icon: '📆', name: 'Pension Calculator',     desc: 'Monthly pension income estimator'   },
  ],
  postoffice: [
    { icon: '👧', name: 'Sukanya Samriddhi',      desc: 'Girl child savings scheme'          },
    { icon: '🏅', name: 'NSC Calculator',         desc: 'National Savings Certificate'       },
    { icon: '🔑', name: 'KVP Calculator',         desc: 'Kisan Vikas Patra doubling period'  },
    { icon: '👴', name: 'SCSS Calculator',         desc: 'Senior Citizens Savings Scheme'     },
  ],
  business: [
    { icon: '📦', name: 'GST Invoice Creator',    desc: 'Tax-compliant invoice builder'      },
    { icon: '📊', name: 'Break-even Analysis',    desc: 'Profit threshold calculator'        },
    { icon: '💹', name: 'ROI Calculator',         desc: 'Return on business investment'      },
    { icon: '📉', name: 'Working Capital',        desc: 'Business liquidity planner'         },
  ],
};

const SCHEMES = [
  'PPF', 'NPS', 'PMAY', 'Kisan Credit Card', 'PM Fasal Bima Yojana',
  'Ayushman Bharat', 'PM Awas Yojana', 'Sukanya Samriddhi', 'SCSS', 'KVP',
  'PM Kisan Samman Nidhi', 'Mudra Yojana', 'Stand Up India', 'PM Jan Dhan',
  'PM Vaya Vandana', 'Atal Pension Yojana', 'PMSBY', 'PMJJBY', 'e-SHRAM',
  'PM SVANidhi', 'PMEGP', 'AM Ujjwala Yojana', 'Jal Jeevan Mission',
];

// ─── Animations & global CSS ──────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overflow-x:hidden}

/* Fonts */
.fcl-sans{font-family:'Manrope',sans-serif}
.fcl-body{font-family:'Inter',sans-serif}

/* Animations */
@keyframes fcl-fade-up{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
@keyframes fcl-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes fcl-marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes fcl-pulse-gold{0%,100%{box-shadow:0 0 0 0 rgba(212,160,23,.4)}70%{box-shadow:0 0 0 12px rgba(212,160,23,0)}}
@keyframes fcl-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}

/* Reveal */
.fcl-reveal{opacity:0;transform:translateY(28px);transition:opacity .6s cubic-bezier(.16,1,.3,1),transform .6s cubic-bezier(.16,1,.3,1)}
.fcl-reveal.fcl-visible{opacity:1;transform:none}

/* Category pills row */
.fcl-pills-row{
  display:flex;gap:10px;overflow-x:auto;padding:20px 16px;
  -webkit-overflow-scrolling:touch;scrollbar-width:none;scroll-snap-type:x mandatory
}
.fcl-pills-row::-webkit-scrollbar{display:none}
.fcl-pill{
  flex:0 0 auto;scroll-snap-align:start;white-space:nowrap;
  padding:10px 18px;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;
  border:1.5px solid #D4D9E8;background:#fff;color:#0A1628;font-family:'Inter',sans-serif;
  transition:all .2s ease
}
.fcl-pill:hover,.fcl-pill.active{background:#0A1628;color:#D4A017;border-color:#0A1628}

/* Feature cards 2x2 on mobile */
.fcl-feature-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
@media(min-width:768px){.fcl-feature-grid{grid-template-columns:repeat(4,1fr);gap:20px}}

/* Calculator grid */
.fcl-calc-grid{display:grid;grid-template-columns:1fr;gap:10px}
@media(min-width:768px){.fcl-calc-grid{grid-template-columns:repeat(3,1fr);gap:14px}}

/* Stats row */
.fcl-stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(min-width:768px){.fcl-stats-row{gap:24px}}

/* Expense feature */
.fcl-expense-cols{display:flex;flex-direction:column;gap:32px}
@media(min-width:768px){.fcl-expense-cols{flex-direction:row;align-items:center;gap:60px}}

/* Marquee */
.fcl-marquee-track{display:flex;width:max-content;animation:fcl-marquee 30s linear infinite}
.fcl-marquee-track:hover{animation-play-state:paused}

/* Tab bar */
.fcl-tabs{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.fcl-tabs::-webkit-scrollbar{display:none}
.fcl-tab-btn{
  flex:0 0 auto;padding:9px 20px;border-radius:100px;font-size:13px;font-weight:600;
  border:1.5px solid #D4D9E8;background:#fff;color:#4A5B7A;cursor:pointer;
  font-family:'Inter',sans-serif;transition:all .2s;white-space:nowrap
}
.fcl-tab-btn:hover{border-color:#0A1628;color:#0A1628}
.fcl-tab-btn.active{background:#0A1628;color:#D4A017;border-color:#0A1628}

/* CTA button */
.fcl-gold-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:10px;
  background:linear-gradient(135deg,#D4A017 0%,#B8870F 100%);
  color:#0A1628;font-weight:800;border-radius:16px;border:none;cursor:pointer;
  text-decoration:none;transition:transform .2s ease,box-shadow .2s ease;
  font-family:'Manrope',sans-serif;letter-spacing:-0.02em;
  box-shadow:0 4px 20px rgba(212,160,23,.35)
}
.fcl-gold-btn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(212,160,23,.5)}
.fcl-gold-btn:active{transform:translateY(0)}

/* FAQ accordion */
.fcl-faq{border-radius:14px;overflow:hidden;background:#fff;border:1.5px solid #E8EDF5;transition:border-color .25s,box-shadow .25s;margin-bottom:10px}
.fcl-faq.open{border-color:#D4A017;box-shadow:0 4px 20px rgba(212,160,23,.12)}

/* Mobile full-width buttons */
@media(max-width:767px){
  .fcl-btn-full{width:100%!important;min-height:54px}
  .fcl-hero-h1{font-size:32px!important;letter-spacing:-0.02em!important}
  .fcl-hero-sub{font-size:16px!important}
  .fcl-section-pad{padding:52px 16px!important}
  .fcl-hide-mobile{display:none!important}
}
`;

// ─── Reveal wrapper ───────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '', style }: { children: ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('fcl-visible'); obs.disconnect(); } },
      { threshold: 0.07 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const combinedStyle: React.CSSProperties = { ...(delay ? { transitionDelay: `${delay}ms` } : {}), ...style };
  return (
    <div ref={ref} className={`fcl-reveal ${className}`} style={combinedStyle}>
      {children}
    </div>
  );
}

// ─── Phone Mockup ─────────────────────────────────────────────────────────────
function PhoneMockup() {
  const calcs = [
    { e: '📈', n: 'SIP' },     { e: '🏠', n: 'EMI' },
    { e: '💰', n: 'PPF' },     { e: '🧾', n: 'HRA' },
    { e: '📊', n: 'GST' },     { e: '💼', n: 'Income Tax' },
    { e: '🏦', n: 'FD / RD' }, { e: '👧', n: 'Sukanya' },
    { e: '🏛️', n: 'NPS' },     { e: '📒', n: 'Expenses' },
    { e: '🎂', n: 'Age Calc' },{ e: '🤖', n: 'AI Advisor' },
  ];
  return (
    <div style={{ position: 'relative', width: '220px', margin: '0 auto', animation: 'fcl-float 6s ease-in-out infinite' }}>
      {/* phone frame */}
      <div style={{
        width: '220px', background: '#0A1628', borderRadius: '36px', padding: '14px 10px',
        boxShadow: '0 32px 80px rgba(10,22,40,.6), 0 0 0 2px rgba(212,160,23,.3)',
      }}>
        {/* notch */}
        <div style={{ width: '70px', height: '8px', background: '#1C2D48', borderRadius: '4px', margin: '0 auto 10px' }} />
        {/* status bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', marginBottom: '8px' }}>
          <span style={{ color: 'rgba(255,255,255,.5)', fontSize: '9px', fontFamily: 'Inter,sans-serif' }}>9:41</span>
          <span style={{ color: 'rgba(255,255,255,.5)', fontSize: '9px' }}>●●●</span>
        </div>
        {/* app bar */}
        <div style={{ background: '#132035', borderRadius: '12px', padding: '10px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#D4A017', fontSize: '12px', fontWeight: 700, fontFamily: 'Manrope,sans-serif' }}>FinCalix</span>
          <span style={{ fontSize: '14px' }}>🔍</span>
        </div>
        {/* calc grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
          {calcs.map(c => (
            <div key={c.n} style={{
              background: '#132035', borderRadius: '10px', padding: '8px 4px', textAlign: 'center',
              border: '1px solid rgba(212,160,23,.12)',
            }}>
              <div style={{ fontSize: '16px', marginBottom: '2px' }}>{c.e}</div>
              <div style={{ color: 'rgba(255,255,255,.75)', fontSize: '8px', fontFamily: 'Inter,sans-serif', lineHeight: 1.2 }}>{c.n}</div>
            </div>
          ))}
        </div>
        {/* bottom nav */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '10px', padding: '6px 0' }}>
          {['🏠','📊','💰','👤'].map(i => (
            <span key={i} style={{ fontSize: '16px', opacity: 0.6 }}>{i}</span>
          ))}
        </div>
      </div>
      {/* glow */}
      <div style={{
        position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)',
        width: '140px', height: '30px', background: 'rgba(212,160,23,.25)',
        filter: 'blur(20px)', borderRadius: '50%',
      }} />
    </div>
  );
}

// ─── Expense Tracker Mockup ───────────────────────────────────────────────────
function ExpenseMockup() {
  const cats = [
    { name: 'Food & Dining',  pct: 78, color: '#D4A017' },
    { name: 'Transport',      pct: 52, color: '#3B82F6' },
    { name: 'Shopping',       pct: 35, color: '#10B981' },
    { name: 'Utilities',      pct: 60, color: '#EF4444' },
    { name: 'Entertainment',  pct: 28, color: '#8B5CF6' },
  ];
  return (
    <div style={{
      background: '#0A1628', borderRadius: '24px', padding: '20px', width: '100%', maxWidth: '320px',
      boxShadow: '0 24px 60px rgba(10,22,40,.5)',
    }}>
      <div style={{ color: '#D4A017', fontWeight: 700, fontSize: '14px', fontFamily: 'Manrope,sans-serif', marginBottom: '4px' }}>March 2026</div>
      <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '11px', fontFamily: 'Inter,sans-serif', marginBottom: '16px' }}>Expense Overview</div>
      {/* health score */}
      <div style={{ background: 'rgba(212,160,23,.1)', borderRadius: '12px', padding: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(212,160,23,.2)' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '10px', fontFamily: 'Inter,sans-serif' }}>Financial Health Score</div>
          <div style={{ color: '#D4A017', fontSize: '22px', fontWeight: 800, fontFamily: 'Manrope,sans-serif' }}>78 <span style={{ fontSize: '12px', opacity: .6 }}>/100</span></div>
        </div>
        <div style={{ fontSize: '32px' }}>💪</div>
      </div>
      {/* bars */}
      {cats.map(c => (
        <div key={c.name} style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: 'rgba(255,255,255,.7)', fontSize: '11px', fontFamily: 'Inter,sans-serif' }}>{c.name}</span>
            <span style={{ color: 'rgba(255,255,255,.4)', fontSize: '11px', fontFamily: 'Inter,sans-serif' }}>{c.pct}%</span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${c.pct}%`, background: c.color, borderRadius: '3px', transition: 'width 1s ease' }} />
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,.06)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
          <div style={{ color: '#D4A017', fontSize: '12px', fontWeight: 700, fontFamily: 'Manrope,sans-serif' }}>₹24,850</div>
          <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '10px', fontFamily: 'Inter,sans-serif' }}>Spent</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,.06)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
          <div style={{ color: '#10B981', fontSize: '12px', fontWeight: 700, fontFamily: 'Manrope,sans-serif' }}>₹15,150</div>
          <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '10px', fontFamily: 'Inter,sans-serif' }}>Saved</div>
        </div>
      </div>
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

// SECTION 1 — HERO
function HeroSection() {
  return (
    <section style={{
      background: 'linear-gradient(160deg,#0A1628 0%,#0F2040 55%,#0A1628 100%)',
      padding: '80px 16px 56px', position: 'relative', overflow: 'hidden',
    }}>
      {/* bg orbs */}
      <div style={{ position: 'absolute', top: '-80px', right: '-60px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(212,160,23,.06)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-60px', left: '-40px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(59,130,246,.05)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* top nav */}
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/icons/fincalix-logo.png" alt="FinCalix" style={{ width: '36px', height: '36px', borderRadius: '10px' }} loading="lazy" />
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '20px', fontFamily: 'Manrope,sans-serif', letterSpacing: '-0.03em' }}>FinCalix</span>
          </div>
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
            style={{
              background: 'linear-gradient(135deg,#D4A017,#B8870F)', color: '#0A1628',
              fontWeight: 700, fontSize: '13px', padding: '10px 20px', borderRadius: '100px',
              textDecoration: 'none', fontFamily: 'Manrope,sans-serif', letterSpacing: '-0.01em',
              boxShadow: '0 4px 16px rgba(212,160,23,.3)',
            }}>
            ↓ Download
          </a>
        </nav>

        {/* hero cols: text left, phone right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap' }}>
          {/* LEFT */}
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            {/* badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.3)',
              color: '#10B981', fontSize: '12px', fontWeight: 600, padding: '6px 14px',
              borderRadius: '100px', marginBottom: '24px', fontFamily: 'Inter,sans-serif',
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
              ✓ Updated for Budget 2026-27 · Zero tax up to ₹12L
            </div>

            <h1 className="fcl-hero-h1" style={{
              color: '#fff', fontSize: '44px', fontWeight: 900, lineHeight: 1.1,
              letterSpacing: '-0.04em', marginBottom: '20px', fontFamily: 'Manrope,sans-serif',
            }}>
              30+ Smart Financial<br />
              <span style={{ color: '#D4A017' }}>Calculators</span> for India
            </h1>

            <p className="fcl-hero-sub" style={{
              color: 'rgba(255,255,255,.65)', fontSize: '18px', lineHeight: 1.6,
              marginBottom: '36px', fontFamily: 'Inter,sans-serif', fontWeight: 400,
            }}>
              EMI · SIP · Tax · FD · PPF · GST&nbsp;—&nbsp;All Free, All Offline
            </p>

            {/* CTA */}
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
              className="fcl-gold-btn fcl-btn-full"
              style={{ fontSize: '17px', padding: '18px 36px', marginBottom: '16px', display: 'flex' }}>
              <span style={{ fontSize: '22px' }}>▶</span>
              Download on Google Play
            </a>

            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: '13px', fontFamily: 'Inter,sans-serif', textAlign: 'center' }}>
              Free Forever · No Login Required · No Ads
            </p>
          </div>

          {/* RIGHT — phone */}
          <div className="fcl-hide-mobile" style={{ flex: '0 0 auto' }}>
            <PhoneMockup />
          </div>
        </div>

        {/* phone shown below on mobile */}
        <div style={{ display: 'none', justifyContent: 'center', marginTop: '48px' }} className="fcl-show-mobile-flex">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}

// SECTION 2 — CATEGORY PILLS
function CategoryPills({ activeTab, onTab }: { activeTab: TabId; onTab: (t: TabId) => void }) {
  return (
    <section style={{ background: '#fff', borderBottom: '1px solid #EEF1F8' }}>
      <div className="fcl-pills-row" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {CALC_TABS.map(t => (
          <button
            key={t.id}
            className={`fcl-pill${activeTab === t.id ? ' active' : ''}`}
            onClick={() => onTab(t.id)}
          >
            {t.label} · {t.count}
          </button>
        ))}
      </div>
    </section>
  );
}

// SECTION 3 — KEY FEATURES
function FeaturesSection() {
  const cards = [
    { icon: '📊', title: '30+ Calculators',  body: 'SIP, EMI, PPF, FD, Tax, GST and more — all in one app' },
    { icon: '📡', title: '100% Offline',      body: 'Works without internet. Always. No data charges.' },
    { icon: '🌐', title: '6 Languages',       body: 'English · Hindi · Telugu · Tamil · Kannada · Malayalam' },
    { icon: '₹0', title: 'Free Forever',      body: 'No subscription. No ads. No hidden charges. Ever.' },
  ];
  return (
    <section className="fcl-section-pad" style={{ background: '#F8F9FA', padding: '56px 16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <p style={{ color: '#D4A017', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Inter,sans-serif', marginBottom: '8px' }}>WHY FINCALIX</p>
            <h2 style={{ color: '#0A1628', fontSize: '28px', fontWeight: 800, fontFamily: 'Manrope,sans-serif', letterSpacing: '-0.03em' }}>Everything You Need, Nothing You Don't</h2>
          </div>
        </Reveal>

        <div className="fcl-feature-grid">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 80}>
              <div style={{
                background: '#fff', borderRadius: '20px', padding: '24px 18px',
                boxShadow: '0 4px 20px rgba(10,22,40,.06)', minHeight: '140px',
                border: '1.5px solid #EEF1F8',
                transition: 'transform .2s ease, box-shadow .2s ease',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(10,22,40,.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(10,22,40,.06)'; }}
              >
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'linear-gradient(135deg,#D4A017,#B8870F)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', marginBottom: '14px', flexShrink: 0,
                  fontFamily: 'Inter,sans-serif', fontWeight: 700, color: '#0A1628',
                }}>{c.icon}</div>
                <h3 style={{ color: '#0A1628', fontWeight: 700, fontSize: '15px', fontFamily: 'Manrope,sans-serif', marginBottom: '6px' }}>{c.title}</h3>
                <p style={{ color: '#6B7A9A', fontSize: '13px', lineHeight: 1.6, fontFamily: 'Inter,sans-serif' }}>{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// SECTION 4 — CALCULATOR SHOWCASE
function CalculatorShowcase({ activeTab, onTab }: { activeTab: TabId; onTab: (t: TabId) => void }) {
  const calcs = CALCS[activeTab];
  return (
    <section className="fcl-section-pad" style={{ background: '#fff', padding: '56px 16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ color: '#D4A017', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Inter,sans-serif', marginBottom: '8px' }}>CALCULATORS</p>
            <h2 style={{ color: '#0A1628', fontSize: '28px', fontWeight: 800, fontFamily: 'Manrope,sans-serif', letterSpacing: '-0.03em' }}>30+ Calculators, All Free</h2>
          </div>
          <div className="fcl-tabs" style={{ marginBottom: '24px' }}>
            {CALC_TABS.map(t => (
              <button key={t.id} className={`fcl-tab-btn${activeTab === t.id ? ' active' : ''}`} onClick={() => onTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="fcl-calc-grid">
          {calcs.map((c, i) => (
            <Reveal key={c.name} delay={i * 50}>
              <div style={{
                background: '#F8F9FA', borderRadius: '16px', padding: '18px',
                display: 'flex', alignItems: 'center', gap: '14px',
                border: '1.5px solid #EEF1F8', transition: 'all .2s ease',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = '#D4A017'; el.style.background = '#FFFBF0'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = '#EEF1F8'; el.style.background = '#F8F9FA'; }}
              >
                <div style={{
                  width: '44px', height: '44px', flexShrink: 0, borderRadius: '12px',
                  background: '#0A1628', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                }}>{c.icon}</div>
                <div>
                  <div style={{ color: '#0A1628', fontWeight: 700, fontSize: '14px', fontFamily: 'Manrope,sans-serif', marginBottom: '2px' }}>{c.name}</div>
                  <div style={{ color: '#7A8BA8', fontSize: '12px', fontFamily: 'Inter,sans-serif' }}>{c.desc}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
              className="fcl-gold-btn"
              style={{ fontSize: '15px', padding: '14px 32px', display: 'inline-flex' }}>
              Download to Access All Calculators →
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// SECTION 5 — GOVT SCHEMES MARQUEE
function SchemesBanner() {
  const doubled = [...SCHEMES, ...SCHEMES];
  return (
    <section style={{ background: '#0A1628', padding: '40px 0', overflow: 'hidden' }}>
      <Reveal>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.45)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Inter,sans-serif', marginBottom: '8px' }}>DISCOVER</p>
        <h2 style={{ textAlign: 'center', color: '#D4A017', fontSize: '26px', fontWeight: 800, fontFamily: 'Manrope,sans-serif', letterSpacing: '-0.03em', marginBottom: '28px', padding: '0 16px' }}>
          45+ Government Schemes for You
        </h2>
      </Reveal>
      <div style={{ overflow: 'hidden', width: '100%' }}>
        <div className="fcl-marquee-track">
          {doubled.map((s, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              color: '#D4A017', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter,sans-serif',
              whiteSpace: 'nowrap', padding: '0 24px',
            }}>
              <span style={{ opacity: .4 }}>◆</span> {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// SECTION 6 — SOCIAL PROOF
function SocialProof() {
  const stats = [
    { val: '30+', label: 'Calculators', icon: '📊' },
    { val: '6',   label: 'Languages',   icon: '🌐' },
    { val: '45+', label: 'Govt Schemes',icon: '🏛' },
  ];
  return (
    <section className="fcl-section-pad" style={{ background: '#fff', padding: '56px 16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="fcl-stats-row">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div style={{
                background: 'linear-gradient(145deg,#0A1628,#0F2040)', borderRadius: '20px',
                padding: '28px 20px', textAlign: 'center',
                boxShadow: '0 8px 32px rgba(10,22,40,.2)',
              }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
                <div style={{ color: '#D4A017', fontSize: '32px', fontWeight: 900, fontFamily: 'Manrope,sans-serif', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.val}</div>
                <div style={{ color: 'rgba(255,255,255,.55)', fontSize: '13px', fontFamily: 'Inter,sans-serif', marginTop: '6px' }}>{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <div style={{ fontSize: '24px', letterSpacing: '4px', color: '#D4A017', marginBottom: '8px' }}>
              ★★★★★
            </div>
            <p style={{ color: '#4A5B7A', fontSize: '15px', fontFamily: 'Inter,sans-serif', fontWeight: 500 }}>
              Trusted by Indian investors &amp; families
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// SECTION 7 — EXPENSE TRACKER HIGHLIGHT
function ExpenseTrackerSection() {
  const points = [
    'Category-wise expense tracking',
    'Monthly & yearly financial reports',
    'Financial Health Score',
    'PDF & Excel export',
  ];
  return (
    <section className="fcl-section-pad" style={{ background: '#F8F9FA', padding: '56px 16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="fcl-expense-cols">
          {/* mockup */}
          <Reveal className="fcl-expense-mockup" style={{ display: 'flex', justifyContent: 'center' }}>
            <ExpenseMockup />
          </Reveal>

          {/* copy */}
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <Reveal>
              <p style={{ color: '#D4A017', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Inter,sans-serif', marginBottom: '10px' }}>EXPENSE TRACKER</p>
              <h2 style={{ color: '#0A1628', fontSize: '30px', fontWeight: 800, fontFamily: 'Manrope,sans-serif', letterSpacing: '-0.03em', marginBottom: '16px', lineHeight: 1.2 }}>
                Track Every Rupee.<br />
                <span style={{ color: '#D4A017' }}>Stay Ahead.</span>
              </h2>
              <p style={{ color: '#4A5B7A', fontSize: '15px', lineHeight: 1.65, fontFamily: 'Inter,sans-serif', marginBottom: '28px' }}>
                FinCalix's built-in expense tracker gives you a clear picture of where your money goes — with smart category breakdowns and a financial health score.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {points.map(p => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '22px', height: '22px', flexShrink: 0, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#D4A017,#B8870F)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#0A1628', fontSize: '12px', fontWeight: 800,
                    }}>✓</div>
                    <span style={{ color: '#2A3A5A', fontSize: '14px', fontFamily: 'Inter,sans-serif', fontWeight: 500 }}>{p}</span>
                  </div>
                ))}
              </div>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
                className="fcl-gold-btn fcl-btn-full"
                style={{ fontSize: '15px', padding: '15px 28px', display: 'inline-flex' }}>
                Start Tracking Free →
              </a>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

// SECTION 8 — FINAL CTA
function FinalCTA() {
  return (
    <section style={{ background: 'linear-gradient(135deg,#0A1628 0%,#0F2040 100%)', padding: '80px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '300px', background: 'rgba(212,160,23,.08)', filter: 'blur(80px)', pointerEvents: 'none', borderRadius: '50%' }} />
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <h2 style={{ color: '#fff', fontSize: '32px', fontWeight: 900, fontFamily: 'Manrope,sans-serif', letterSpacing: '-0.04em', lineHeight: 1.15, marginBottom: '16px' }}>
            Start Managing Your Money <span style={{ color: '#D4A017' }}>Smarter</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '16px', fontFamily: 'Inter,sans-serif', marginBottom: '36px', lineHeight: 1.6 }}>
            Join thousands of Indians using FinCalix to plan, save, and grow their wealth.
          </p>
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
            className="fcl-gold-btn fcl-btn-full"
            style={{ fontSize: '18px', padding: '20px 40px', display: 'flex', animation: 'fcl-pulse-gold 2.5s infinite' }}>
            <span style={{ fontSize: '24px' }}>▶</span>
            Download Free on Google Play
          </a>
          <p style={{ color: 'rgba(255,255,255,.3)', fontSize: '12px', fontFamily: 'Inter,sans-serif', marginTop: '14px' }}>
            Android · Free · No signup needed
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// SECTION 9 — FOOTER
function Footer() {
  return (
    <footer style={{ background: '#060E1A', padding: '48px 16px 28px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* top row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '32px', marginBottom: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <img src="/icons/fincalix-logo.png" alt="FinCalix" style={{ width: '32px', height: '32px', borderRadius: '8px' }} loading="lazy" />
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '18px', fontFamily: 'Manrope,sans-serif' }}>FinCalix</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: '13px', fontFamily: 'Inter,sans-serif' }}>Your Financial Companion</p>
          </div>
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { label: 'Privacy Policy', href: '/privacy-policy' },
              { label: 'About',          href: '/about'          },
              { label: 'Contact',        href: 'mailto:support@fincalix.com' },
            ].map(l => (
              <a key={l.label} href={l.href}
                style={{ color: 'rgba(255,255,255,.45)', fontSize: '14px', fontFamily: 'Inter,sans-serif', textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#D4A017')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.45)')}>
                {l.label}
              </a>
            ))}
          </div>
        </div>

        {/* divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: '24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <p style={{ color: 'rgba(255,255,255,.25)', fontSize: '13px', fontFamily: 'Inter,sans-serif' }}>
            Made with ❤️ in India
          </p>
          <p style={{ color: 'rgba(255,255,255,.25)', fontSize: '13px', fontFamily: 'Inter,sans-serif' }}>
            © 2025 FinCalix · v1.0.6
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function WebLandingPage() {
  const [activeTab, setActiveTab] = useState<TabId>('loans');

  // Inject global CSS
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
    <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 0, overflowX: 'hidden' }}>
      <HeroSection />
      <CategoryPills activeTab={activeTab} onTab={setActiveTab} />
      <FeaturesSection />
      <CalculatorShowcase activeTab={activeTab} onTab={setActiveTab} />
      <SchemesBanner />
      <SocialProof />
      <ExpenseTrackerSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
