import { useState } from 'react';
import LegalLayout, { LangSelector, PlayStoreBadge, type Lang } from './LegalLayout';

const T = {
    en: { title: 'Data & Privacy', hero: 'Your Data Stays With You', heroSub: 'FinCalix processes all your financial data locally. We only use limited anonymous analytics to improve stability.', updated: 'Last Updated: March 2026', s: { collect: 'What FinCalix Collects', storage: 'Stored on Your Device Only', analytics: 'Anonymous Usage Analytics', promises: 'Our Promises', safety: 'Google Play Data Safety Declaration', contact: 'Contact' } },
    hi: { title: 'डेटा और गोपनीयता', hero: 'आपका डेटा आपके साथ रहता है', heroSub: 'FinCalix सभी वित्तीय डेटा स्थानीय रूप से प्रोसेस करता है।', updated: 'अंतिम अपडेट: मार्च 2026', s: { collect: 'FinCalix क्या एकत्रित करता है', storage: 'केवल आपके डिवाइस पर संग्रहीत', analytics: 'अनाम उपयोग विश्लेषण', promises: 'हमारे वादे', safety: 'Google Play डेटा सुरक्षा', contact: 'संपर्क' } },
    te: { title: 'డేటా మరియు గోప్యత', hero: 'మీ డేటా మీతోనే ఉంటుంది', heroSub: 'FinCalix అన్ని ఆర్థిక డేటాను స్థానికంగా ప్రాసెస్ చేస్తుంది.', updated: 'చివరి నవీకరణ: మార్చి 2026', s: { collect: 'FinCalix ఏమి సేకరిస్తుంది', storage: 'మీ పరికరంలో మాత్రమే నిల్వ', analytics: 'అనామక వినియోగ విశ్లేషణ', promises: 'మా వాగ్దానాలు', safety: 'Google Play డేటా భద్రత', contact: 'సంప్రదించండి' } },
    ta: { title: 'தரவு மற்றும் தனியுரிமை', hero: 'உங்கள் தரவு உங்களிடமே உள்ளது', heroSub: 'FinCalix அனைத்து நிதி தரவையும் உள்ளூரில் செயலாக்குகிறது.', updated: 'கடைசியாக புதுப்பிக்கப்பட்டது: மார்ச் 2026', s: { collect: 'FinCalix என்ன சேகரிக்கிறது', storage: 'உங்கள் சாதனத்தில் மட்டும் சேமிக்கப்பட்டுள்ளது', analytics: 'அநாமதேய பயன்பாட்டு பகுப்பாய்வு', promises: 'எங்கள் வாக்குறுதிகள்', safety: 'Google Play தரவு பாதுகாப்பு', contact: 'தொடர்பு' } },
    kn: { title: 'ಡೇಟಾ ಮತ್ತು ಗೌಪ್ಯತೆ', hero: 'ನಿಮ್ಮ ಡೇಟಾ ನಿಮ್ಮೊಂದಿಗಿದೆ', heroSub: 'FinCalix ಎಲ್ಲಾ ಹಣಕಾಸು ಡೇಟಾವನ್ನು ಸ್ಥಳೀಯವಾಗಿ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸುತ್ತದೆ.', updated: 'ಕೊನೆಯದಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ: ಮಾರ್ಚ್ 2026', s: { collect: 'FinCalix ಏನು ಸಂಗ್ರಹಿಸುತ್ತದೆ', storage: 'ನಿಮ್ಮ ಸಾಧನದಲ್ಲಿ ಮಾತ್ರ ಸಂಗ್ರಹ', analytics: 'ಅನಾಮಧೇಯ ಬಳಕೆ ವಿಶ್ಲೇಷಣೆ', promises: 'ನಮ್ಮ ವಾಗ್ದಾನಗಳು', safety: 'Google Play ಡೇಟಾ ಸುರಕ್ಷತೆ', contact: 'ಸಂಪರ್ಕಿಸಿ' } },
} as const;

function Section({ icon, color, title, children }: { icon: string; color: string; title: string; children: React.ReactNode }) {
    return (
        <section style={{ marginBottom: '44px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{icon}</div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', margin: 0 }}>{title}</h2>
            </div>
            <div style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.8 }}>{children}</div>
        </section>
    );
}

export default function DataPrivacy() {
    const [lang, setLang] = useState<Lang>('en');
    const t = T[lang];

    return (
        <LegalLayout title={t.title} updated={t.updated} langBar={<LangSelector lang={lang} onChange={setLang} />}>
            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 20px' }}>🛡️</div>
                <h2 style={{ fontSize: 'clamp(1.4rem,4vw,2rem)', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{t.hero}</h2>
                <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.65, maxWidth: '600px', margin: '0 auto' }}>{t.heroSub}</p>
            </div>

            <Section icon="👁️" color="#8B5CF6" title={t.s.collect}>
                <p style={{ marginBottom: '10px' }}>FinCalix does <strong style={{ color: '#fff' }}>NOT</strong> collect any personal information whatsoever.</p>
                <p>No registration, no login, no account needed. Your name, email and phone number are never asked or stored by us.</p>
            </Section>

            <Section icon="📱" color="#3B82F6" title={t.s.storage}>
                <p style={{ marginBottom: '10px' }}>Your calculation history is saved in your device's local storage.</p>
                <p style={{ marginBottom: '10px' }}>This data never leaves your phone or browser. We have no access to what you've calculated.</p>
                <p>Clearing app data or uninstalling removes it completely.</p>
            </Section>

            <Section icon="📊" color="#EC4899" title={t.s.analytics}>
                <p style={{ marginBottom: '10px' }}>We use Firebase Analytics to understand which calculators are most useful and to improve app stability.</p>
                <p style={{ marginBottom: '10px' }}><strong style={{ color: '#fff' }}>Data collected: which calculator was opened, session duration, device type.</strong></p>
                <p style={{ marginBottom: '10px' }}>This data is fully anonymous — no personal identity is ever captured.</p>
                <p>Your financial inputs (salary, EMI amounts, etc.) are never part of analytics.</p>
            </Section>

            <Section icon="✅" color="#10B981" title={t.s.promises}>
                {[
                    'We never sell your data',
                    'We never share your data with advertisers',
                    'We never store your financial figures on our servers',
                    'We never require you to create an account',
                    'All calculations happen locally on your device',
                ].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: '#10B981', fontSize: '16px', flexShrink: 0 }}>✅</span>
                        <span>{item}</span>
                    </div>
                ))}
            </Section>

            <Section icon="📋" color="#C9A84C" title={t.s.safety}>
                <div style={{ background: '#0F1E35', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
                    {[
                        { label: 'DATA COLLECTED', value: 'App interaction data (anonymous), Device ID (anonymous)' },
                        { label: 'DATA SHARED WITH THIRD PARTIES', value: 'Google Analytics / Firebase (anonymous only)' },
                        { label: 'DATA ENCRYPTED IN TRANSIT', value: 'Yes (HTTPS)' },
                        { label: 'CAN USERS REQUEST DELETION', value: 'Not applicable — we hold no personal user data' },
                        { label: 'DATA USED TO TRACK USERS', value: 'No' },
                    ].map((row, i) => (
                        <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '14px 18px', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                            <div style={{ color: '#C9A84C', fontSize: '12px', fontWeight: 600 }}>{row.label}</div>
                            <div style={{ color: '#94A3B8', fontSize: '13px' }}>{row.value}</div>
                        </div>
                    ))}
                </div>
            </Section>

            <Section icon="✉️" color="#3B82F6" title={t.s.contact}>
                <a href="mailto:support@fincalix.com" style={{ display: 'inline-block', background: '#0F1E35', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px 20px', color: '#C9A84C', fontWeight: 600, textDecoration: 'none', fontSize: '14px' }}>
                    📧 support@fincalix.com
                </a>
            </Section>

            <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                <a href="/privacy-policy" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
                    Read Full Privacy Policy →
                </a>
                <PlayStoreBadge />
            </div>
        </LegalLayout>
    );
}
