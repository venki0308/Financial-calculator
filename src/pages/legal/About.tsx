import { useState } from 'react';
import LegalLayout, { LangSelector, PlayStoreBadge, type Lang } from './LegalLayout';

const T = {
    en: { title: 'About FinCalix', updated: 'Last Updated: March 2026', s: { ref: 'Reference Tool', accuracy: 'Data Accuracy', official: 'Official Sources', resources: 'Key Resources' } },
    hi: { title: 'FinCalix के बारे में', updated: 'अंतिम अपडेट: मार्च 2026', s: { ref: 'संदर्भ उपकरण', accuracy: 'डेटा सटीकता', official: 'आधिकारिक स्रोत', resources: 'मुख्य संसाधन' } },
    te: { title: 'FinCalix గురించి', updated: 'చివరి నవీకరణ: మార్చి 2026', s: { ref: 'రెఫరెన్స్ సాధనం', accuracy: 'డేటా ఖచ్చితత్వం', official: 'అధికారిక వనరులు', resources: 'ముఖ్యమైన వనరులు' } },
    ta: { title: 'FinCalix பற்றி', updated: 'கடைசியாக புதுப்பிக்கப்பட்டது: மார்ச் 2026', s: { ref: 'குறிப்பு கருவி', accuracy: 'தரவு துல்லியம்', official: 'அதிகாரப்பூர்வ ஆதாரங்கள்', resources: 'முக்கிய ஆதாரங்கள்' } },
    kn: { title: 'FinCalix ಬಗ್ಗೆ', updated: 'ಕೊನೆಯದಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ: ಮಾರ್ಚ್ 2026', s: { ref: 'ಉಲ್ಲೇಖ ಸಾಧನ', accuracy: 'ಡೇಟಾ ನಿಖರತೆ', official: 'ಅಧಿಕೃತ ಮೂಲಗಳು', resources: 'ಪ್ರಮುಖ ಸಂಪನ್ಮೂಲಗಳು' } },
} as const;

const RESOURCES = [
    { color: '#3B82F6', icon: '🔵', name: 'National Portal of India', url: 'https://india.gov.in', domain: 'india.gov.in' },
    { color: '#10B981', icon: '🟢', name: 'Income Tax Department', url: 'https://incometax.gov.in', domain: 'incometax.gov.in' },
    { color: '#F59E0B', icon: '🟡', name: 'RBI Official Website', url: 'https://rbi.org.in', domain: 'rbi.org.in' },
];

export default function About() {
    const [lang, setLang] = useState<Lang>('en');
    const t = T[lang];

    return (
        <LegalLayout title={t.title} updated={t.updated} langBar={<LangSelector lang={lang} onChange={setLang} />}>
            {/* App identity */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <img src="/icons/fincalix-logo.png" alt="FinCalix" style={{ width: '80px', height: '80px', borderRadius: '22px', margin: '0 auto 16px', display: 'block', boxShadow: '0 0 40px rgba(201,168,76,0.25)' }} />
                <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#C9A84C', marginBottom: '8px', letterSpacing: '-0.5px' }}>FinCalix</h2>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981', fontSize: '13px', fontWeight: 600 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                    v1.0.5
                </div>
            </div>

            {/* Reference cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px' }}>
                {[
                    {
                        icon: '🔵', color: '#3B82F6', title: t.s.ref,
                        text: 'This application is designed as a companion tool for Indian citizens to explore government schemes and perform financial projections.',
                    },
                    {
                        icon: '🟢', color: '#10B981', title: t.s.accuracy,
                        text: 'We strive to provide the most accurate and up-to-date information for 2026. However, interest rates and scheme rules change frequently.',
                    },
                    {
                        icon: '🟡', color: '#F59E0B', title: t.s.official,
                        text: 'All calculations and scheme details are based on publicly available data from official portals like india.gov.in, npsc.gov.in, etc.',
                    },
                ].map(card => (
                    <div
                        key={card.title}
                        style={{
                            background: '#0F1E35', border: `1px solid ${card.color}25`,
                            borderLeft: `3px solid ${card.color}`,
                            borderRadius: '14px', padding: '20px 24px',
                            display: 'flex', gap: '16px', alignItems: 'flex-start',
                        }}
                    >
                        <span style={{ fontSize: '22px', flexShrink: 0, marginTop: '2px' }}>{card.icon}</span>
                        <div>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: card.color, margin: '0 0 8px' }}>{card.title}</h3>
                            <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>{card.text}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Key resources */}
            <section style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
                    {t.s.resources}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {RESOURCES.map(r => (
                        <a
                            key={r.url}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: '#0F1E35', border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: '12px', padding: '14px 18px', textDecoration: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = r.color + '60'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '18px' }}>{r.icon}</span>
                                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{r.name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#4A5568', fontSize: '12px' }}>{r.domain}</span>
                                <span style={{ color: r.color, fontSize: '16px' }}>↗</span>
                            </div>
                        </a>
                    ))}
                </div>
            </section>

            {/* Contact */}
            <section style={{ marginBottom: '40px' }}>
                <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '14px', padding: '20px 24px' }}>
                    <div style={{ color: '#C9A84C', fontWeight: 600, marginBottom: '8px' }}>📧 Contact</div>
                    <a href="mailto:support@fincalix.com" style={{ color: '#94A3B8', fontSize: '14px', textDecoration: 'none' }}>support@fincalix.com</a>
                    <div style={{ color: '#4A5568', fontSize: '13px', marginTop: '6px' }}>FinCalix Team · Hyderabad, Telangana, India</div>
                </div>
            </section>

            <div style={{ textAlign: 'center' }}>
                <PlayStoreBadge />
            </div>
        </LegalLayout>
    );
}
