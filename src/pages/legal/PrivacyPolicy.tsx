import { useState } from 'react';
import LegalLayout, { LangSelector, PlayStoreBadge, type Lang } from './LegalLayout';
import { useAppColors } from '../../theme/useAppColors';

// ── Translations ─────────────────────────────────────────
const T = {
    en: {
        title: 'Privacy Policy',
        hero: 'Your Privacy Matters',
        heroSub: 'FinCalix stores zero personal or financial data on any server. All your financial data stays exclusively on your device. We use anonymous Firebase Analytics for app improvement — no names, no amounts, no PAN, no phone numbers. See Section 4 for details.',
        updated: 'Last Updated: March 2026',
        s: {
            collect: 'Information We Collect',
            storage: 'Data Stored on Your Device',
            analytics: 'Analytics & Tracking',
            thirdParty: 'Third-Party Services',
            financial: 'Your Financial Data',
            children: "Children's Privacy",
            security: 'Data Security',
            rights: 'Your Rights',
            changes: 'Changes to This Policy',
            contact: 'Contact Us',
            reporting: 'Analytics & Crash Reporting',
            access: 'Access',
            delete: 'Delete',
            portability: 'Portability',
        },
    },
    hi: {
        title: 'गोपनीयता नीति',
        hero: 'आपकी गोपनीयता महत्वपूर्ण है',
        heroSub: 'FinCalix कोई व्यक्तिगत डेटा नहीं संग्रहित करता। कोई सर्वर नहीं, कोई डेटाबेस नहीं।',
        updated: 'अंतिम अपडेट: मार्च 2026',
        s: {
            collect: 'हम क्या जानकारी एकत्रित करते हैं',
            storage: 'आपके डिवाइस पर संग्रहीत डेटा',
            analytics: 'विश्लेषण और ट्रैकिंग',
            thirdParty: 'तृतीय-पक्ष सेवाएं',
            financial: 'आपका वित्तीय डेटा',
            children: 'बच्चों की गोपनीयता',
            security: 'डेटा सुरक्षा',
            rights: 'आपके अधिकार',
            changes: 'इस नीति में परिवर्तन',
            contact: 'संपर्क करें',
            reporting: 'विश्लेषण और क्रैश रिपोर्टिंग',
            access: 'पहुंच',
            delete: 'हटाएं',
            portability: 'पोर्टेबिलिटी',
        },
    },
    te: {
        title: 'గోప్యతా విధానం',
        hero: 'మీ గోప్యత ముఖ్యమైనది',
        heroSub: 'FinCalix వ్యక్తిగత డేటాను సేకరించదు. సర్వర్ నిల్వ లేదు — అన్నీ మీ పరికరంపైనే ఉంటాయి.',
        updated: 'చివరి నవీకరణ: మార్చి 2026',
        s: {
            collect: 'మేము సేకరించే సమాచారం',
            storage: 'మీ పరికరంలో నిల్వ చేసిన డేటా',
            analytics: 'విశ్లేషణ మరియు ట్రాకింగ్',
            thirdParty: 'మూడవ పక్ష సేవలు',
            financial: 'మీ ఆర్థిక డేటా',
            children: 'పిల్లల గోప్యత',
            security: 'డేటా భద్రత',
            rights: 'మీ హక్కులు',
            changes: 'ఈ విధానంలో మార్పులు',
            contact: 'సంప్రదించండి',
            reporting: 'విశ్లేషణ మరియు క్రాష్ రిపోర్టింగ్',
            access: 'యాక్సెస్',
            delete: 'తొలగించు',
            portability: 'పోర్టబిలిటీ',
        },
    },
    ta: {
        title: 'தனியுரிமைக் கொள்கை',
        hero: 'உங்கள் தனியுரிமை முக்கியம்',
        heroSub: 'FinCalix எந்த தனிப்பட்ட தரவையும் சேகரிக்கவில்லை. சர்வர் சேமிப்பு இல்லை.',
        updated: 'கடைசியாக புதுப்பிக்கப்பட்டது: மார்ச் 2026',
        s: {
            collect: 'நாங்கள் சேகரிக்கும் தகவல்',
            storage: 'உங்கள் சாதனத்தில் சேமிக்கப்பட்ட தரவு',
            analytics: 'பகுப்பாய்வு மற்றும் கண்காணிப்பு',
            thirdParty: 'மூன்றாம் தரப்பு சேவைகள்',
            financial: 'உங்கள் நிதி தரவு',
            children: 'குழந்தைகளின் தனியுரிமை',
            security: 'தரவு பாதுகாப்பு',
            rights: 'உங்கள் உரிமைகள்',
            changes: 'இந்தக் கொள்கையில் மாற்றங்கள்',
            contact: 'தொடர்பு கொள்ளுங்கள்',
            reporting: 'பகுப்பாய்வு மற்றும் செயலிழப்பு அறிக்கையிடல்',
            access: 'அணுகல்',
            delete: 'நீக்கு',
            portability: 'பொருந்தும் தன்மை',
        },
    },
    kn: {
        title: 'ಗೌಪ್ಯತಾ ನೀತಿ',
        hero: 'ನಿಮ್ಮ ಗೌಪ್ಯತೆ ಮುಖ್ಯ',
        heroSub: 'FinCalix ಯಾವುದೇ ವ್ಯಕ್ತಿಗತ ಡೇಟಾವನ್ನು ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ. ಸರ್ವರ್ ಸಂಗ್ರಹ ಇಲ್ಲ.',
        updated: 'ಕೊನೆಯದಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ: ಮಾರ್ಚ್ 2026',
        s: {
            collect: 'ನಾವು ಸಂಗ್ರಹಿಸುವ ಮಾಹಿತಿ',
            storage: 'ನಿಮ್ಮ ಸಾಧನದಲ್ಲಿ ಸಂಗ್ರಹಿಸಿದ ಡೇಟಾ',
            analytics: 'ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಟ್ರ್ಯಾಕಿಂಗ್',
            thirdParty: 'ಮೂರನೇ ವ್ಯಕ್ತಿ ಸೇವೆಗಳು',
            financial: 'ನಿಮ್ಮ ಹಣಕಾಸು ಡೇಟಾ',
            children: 'ಮಕ್ಕಳ ಗೌಪ್ಯತೆ',
            security: 'ದತ್ತಾಂಶ ಸುರಕ್ಷತೆ',
            rights: 'ನಿಮ್ಮ ಹಕ್ಕುಗಳು',
            changes: 'ಈ ನೀತಿಯಲ್ಲಿ ಬದಲಾವಣೆಗಳು',
            contact: 'ಸಂಪರ್ಕಿಸಿ',
            reporting: 'ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಕ್ರ್ಯಾಶ್ ವರದಿ',
            access: 'ಪ್ರವೇಶ',
            delete: 'ಅಳಿಸು',
            portability: 'ಪೋರ್ಟೆಬಿಲಿಟಿ',
        },
    },
} as const;

// ── Shared section components ────────────────────────────
function Section({ icon, color, title, children }: { icon: string; color: string; title: string; children: React.ReactNode }) {
    const c = useAppColors();
    return (
        <section style={{ marginBottom: '44px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                <div style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: c.isDark ? `${color}20` : `${color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', flexShrink: 0,
                    border: `1px solid ${color}${c.isDark ? '30' : '20'}`
                }}>
                    {icon}
                </div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: c.text, margin: 0 }}>{title}</h2>
            </div>
            <div style={{ color: c.textSecondary, fontSize: '14px', lineHeight: 1.8 }}>{children}</div>
        </section>
    );
}

function Card({ children, color }: { children: React.ReactNode; color?: string }) {
    const c = useAppColors();
    return (
        <div style={{
            background: color || c.card,
            border: `1px solid ${c.border}`,
            borderRadius: '14px', padding: '16px 20px', margin: '12px 0'
        }}>
            {children}
        </div>
    );
}

function GoldBox({ children }: { children: React.ReactNode }) {
    const c = useAppColors();
    const gold = '#C9A84C';
    return (
        <div style={{
            background: c.isDark ? 'rgba(201,168,76,0.08)' : 'rgba(201,168,76,0.05)',
            border: `1px solid ${gold}${c.isDark ? '40' : '25'}`,
            borderRadius: '14px', padding: '16px 20px', margin: '14px 0',
            color: c.text, fontSize: '14px', lineHeight: 1.7
        }}>
            {children}
        </div>
    );
}

function GreenBox({ children }: { children: React.ReactNode }) {
    const c = useAppColors();
    const green = '#10B981';
    return (
        <div style={{
            background: c.isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)',
            border: `1px solid ${green}${c.isDark ? '40' : '25'}`,
            borderRadius: '14px', padding: '16px 20px', margin: '14px 0',
            color: c.text, fontSize: '14px', lineHeight: 1.7
        }}>
            {children}
        </div>
    );
}

function Bullets({ items }: { items: string[] }) {
    return (
        <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
            {items.map((item, i) => <li key={i} style={{ marginBottom: '6px' }}>{item}</li>)}
        </ul>
    );
}

// ── Page ─────────────────────────────────────────────────
export default function PrivacyPolicy() {
    const [lang, setLang] = useState<Lang>('en');
    const c = useAppColors();
    const t = T[lang];

    return (
        <LegalLayout
            title={t.title}
            updated={t.updated}
            langBar={<LangSelector lang={lang} onChange={setLang} />}
        >
            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <div style={{
                    width: '72px', height: '72px', borderRadius: '20px',
                    background: c.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)',
                    border: `1px solid rgba(139,92,246,${c.isDark ? '0.3' : '0.2'})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '32px', margin: '0 auto 20px'
                }}>
                    🛡️
                </div>
                <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 700, color: c.text, marginBottom: '12px' }}>{t.hero}</h2>
                <p style={{ color: c.textSecondary, fontSize: '15px', lineHeight: 1.65, maxWidth: '600px', margin: '0 auto' }}>{t.heroSub}</p>
            </div>

            {/* 1 */}
            <Section icon="👁️" color="#8B5CF6" title={t.s.collect}>
                <p style={{ marginBottom: '10px' }}>FinCalix does <strong style={{ color: c.text }}>NOT</strong> collect any personal information whatsoever.</p>
                <Bullets items={[
                    'No name, email address, phone number, or postal address is collected',
                    'No financial data (salary, investments, EMI amounts) is collected',
                    'No account creation or login is required to use the app',
                    'No user profiles are created or stored',
                ]} />
                <p>You can open the app and start calculating instantly — we never ask for any personal details.</p>
            </Section>

            {/* 2 */}
            <Section icon="📱" color="#3B82F6" title={t.s.storage}>
                <p style={{ marginBottom: '10px' }}>FinCalix stores the following data <strong style={{ color: c.text }}>locally on your device only</strong> using your browser's LocalStorage:</p>
                <Bullets items={[
                    'Calculation inputs — Numbers you enter in calculators',
                    'Recently used calculators — For quick access on the home screen',
                    'Saved calculations — When you manually save a result',
                    'App preferences — Theme (dark/light), language choice',
                ]} />
                <GoldBox>
                    🔒 <strong>This data stays on your device permanently until you:</strong>
                    <Bullets items={[
                        'Clear the app data from your device settings',
                        'Uninstall the app',
                        'Clear browser data (on web version)',
                    ]} />
                    We have absolutely zero access to this data. It never leaves your device and is never synced to any server.
                </GoldBox>
            </Section>

            {/* 3 */}
            <Section icon="📊" color="#EC4899" title={t.s.analytics}>
                <p style={{ marginBottom: '14px' }}>We use limited analytics (Firebase Analytics) to understand app usage and improve performance. No personal or financial data is ever collected.</p>
                <Card>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <div style={{ color: '#10B981', fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>What Is Collected</div>
                            {['Which calculator was used', 'Session duration', 'Device type', 'App version', 'Country'].map(item => (
                                <div key={item} style={{ color: c.textSecondary, fontSize: '13px', padding: '4px 0', borderBottom: `1px solid ${c.border}` }}>• {item}</div>
                            ))}
                        </div>
                        <div>
                            <div style={{ color: '#EF4444', fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Never Collected</div>
                            {['Your calculation inputs', 'Financial figures', 'Personal identity', 'Name or email', 'Browsing history'].map(item => (
                                <div key={item} style={{ color: c.textSecondary, fontSize: '13px', padding: '4px 0', borderBottom: `1px solid ${c.border}` }}>• {item}</div>
                            ))}
                        </div>
                    </div>
                </Card>
                <p style={{ marginTop: '12px' }}>All analytics data is fully anonymous and cannot be linked to any individual.</p>
            </Section>

            {/* 4 */}
            <Section icon="🔗" color="#3B82F6" title={t.s.thirdParty}>
                <p style={{ marginBottom: '14px' }}>FinCalix uses the following third-party service for analytics:</p>
                <Card>
                    <div style={{ color: c.text, fontWeight: 600, marginBottom: '6px' }}>Google Analytics / Firebase</div>
                    <div style={{ color: c.textSecondary, fontSize: '13px' }}>Anonymous usage statistics only. No personal data is transmitted.</div>
                </Card>
                <p style={{ marginTop: '12px' }}>No advertising networks, tracking pixels, or data-selling services are used.</p>
            </Section>

            {/* 5 */}
            <Section icon="🔒" color="#10B981" title={t.s.financial}>
                <GreenBox>
                    💰 <strong>Your financial data is 100% safe</strong>
                    <Bullets items={[
                        'All numbers you enter (salary, EMI, tax inputs, SIP amounts, etc.) are processed entirely on your device',
                        'We never see, store, or transmit your financial figures',
                        'All calculations happen in your browser/app — not on any server',
                        'There is no backend or API that receives your data',
                    ]} />
                </GreenBox>
            </Section>

            {/* 6 */}
            <Section icon="👶" color="#F59E0B" title={t.s.children}>
                <p style={{ marginBottom: '10px' }}>FinCalix is designed for users 18 years of age and above. The app contains financial calculators intended for adult use (tax planning, loan EMI, investment returns, etc.).</p>
                <p>We do not knowingly collect data from anyone under 18 years of age. Since we collect no personal data at all, there is no risk of children's data being stored.</p>
            </Section>

            {/* 7 */}
            <Section icon="🛡️" color="#6366F1" title={t.s.security}>
                <p style={{ marginBottom: '10px' }}>Since FinCalix stores nothing on any server, there is no server-side data breach risk.</p>
                <Bullets items={[
                    'Your data security equals your device security',
                    'All web traffic uses HTTPS encryption',
                    'We recommend using a device lock screen (PIN, fingerprint, face unlock) to protect your locally stored data',
                ]} />
            </Section>

            {/* 8 */}
            <Section icon="⚖️" color="#C9A84C" title={t.s.rights}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '4px' }}>
                    {[
                        { title: t.s.access, text: 'All your data is visible directly in the app (Saved Calculations, History, Preferences).' },
                        { title: t.s.delete, text: 'Clear app data from your device settings, or simply uninstall the app. All data is removed instantly.' },
                        { title: t.s.portability, text: "We cannot delete data on your behalf because we never had it. You have full control." },
                    ].map(card => (
                        <Card key={card.title}>
                            <div style={{ color: '#C9A84C', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>{card.title}</div>
                            <div style={{ color: c.textSecondary, fontSize: '13px', lineHeight: 1.6 }}>{card.text}</div>
                        </Card>
                    ))}
                </div>
            </Section>

            {/* 9 */}
            <Section icon="📝" color="#94A3B8" title={t.s.changes}>
                <p style={{ marginBottom: '10px' }}>We may update this Privacy Policy from time to time. When we do, we will update the "Last Updated" date at the top of this page.</p>
                <p>Continued use of FinCalix after changes to this policy constitutes acceptance of the updated terms. We encourage you to review this policy periodically.</p>
            </Section>

            {/* 10 */}
            <Section icon="✉️" color="#3B82F6" title={t.s.contact}>
                <p style={{ marginBottom: '14px' }}>If you have any questions or concerns about this Privacy Policy, feel free to reach out:</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <a href="mailto:support@fincalix.com" style={{ textDecoration: 'none' }}>
                        <Card><div style={{ color: '#C9A84C', fontWeight: 600, fontSize: '14px' }}>📧 support@fincalix.com</div></Card>
                    </a>
                    <a href="https://fincalix.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <Card><div style={{ color: '#3B82F6', fontWeight: 600, fontSize: '14px' }}>🌐 www.fincalix.com</div></Card>
                    </a>
                </div>
            </Section>

            {/* 11 */}
            <Section icon="📊" color="#EC4899" title={t.s.reporting}>
                <p style={{ marginBottom: '14px' }}>We use analytics tools to understand app usage and improve performance. These tools may change over time, but we ensure no personal or financial data is collected.</p>
                <GreenBox>
                    <div style={{ color: '#10B981', fontWeight: 600, marginBottom: '10px' }}>✅ Data Safety</div>
                    <Bullets items={[
                        'All calculations are performed locally on your device.',
                        'No financial data is stored on our servers.',
                        'No third-party data selling.',
                    ]} />
                </GreenBox>
                <div style={{ marginTop: '20px' }}>
                    <a
                        href="/data-privacy"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '12px 24px', borderRadius: '12px',
                            background: c.isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)',
                            border: `1px solid rgba(16,185,129,${c.isDark ? '0.3' : '0.2'})`,
                            color: '#10B981', fontWeight: 600, fontSize: '14px', textDecoration: 'none',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.15)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = c.isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)'; }}
                    >
                        🛡️ View Data & Privacy (Play Store Data Safety)
                    </a>
                </div>
            </Section>

            {/* Play Store */}
            <div style={{ textAlign: 'center', paddingTop: '32px', borderTop: `1px solid ${c.border}` }}>
                <PlayStoreBadge />
            </div>
        </LegalLayout>
    );
}
