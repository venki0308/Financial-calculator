import { useState } from 'react';
import LegalLayout, { LangSelector, PlayStoreBadge, type Lang, type LegalDoc } from './LegalLayout';
import { useAppColors } from '../../theme/useAppColors';
import { legalText } from './text';

// ── Translations ─────────────────────────────────────────
const T = {
    en: {
        title: 'Privacy Policy',
        hero: 'Your Privacy Matters',
        heroSub: 'Your calculations and financial data stay on your device. There is no account, no backend and no database. FinCalix collects anonymous usage statistics, such as which features are used most, to improve the app. Financial amounts are never sent.',
        updated: 'Last Updated: 18 November 2026',
        s: {
            collect: 'Information We Collect',
            storage: 'Data Stored on Your Device',
            backup: 'Backup & Restore',
            analytics: 'Analytics & Tracking',
            thirdParty: 'Third-Party Services',
            financial: 'Your Financial Data',
            children: "Children's Privacy",
            security: 'Data Security',
            rights: 'Your Rights',
            changes: 'Changes to This Policy',
            contact: 'Contact Us',
            reporting: 'Usage Analytics',
            access: 'Access',
            delete: 'Delete',
            portability: 'Portability',
        },
    },
    hi: {
        title: 'गोपनीयता नीति',
        hero: 'आपकी गोपनीयता महत्वपूर्ण है',
        heroSub: 'आपकी गणनाएँ और वित्तीय डेटा आपके डिवाइस पर ही रहते हैं। कोई खाता नहीं, कोई बैकएंड नहीं और कोई डेटाबेस नहीं है। ऐप को बेहतर बनाने के लिए FinCalix गुमनाम उपयोग आँकड़े एकत्र करता है, जैसे कौन-सी सुविधाएँ सबसे ज़्यादा इस्तेमाल होती हैं। वित्तीय राशियाँ कभी नहीं भेजी जातीं।',
        updated: 'अंतिम अद्यतन: 18 नवंबर 2026',
        s: {
            collect: 'हम क्या जानकारी एकत्रित करते हैं',
            storage: 'आपके डिवाइस पर संग्रहीत डेटा',
            backup: 'बैकअप और रीस्टोर',
            analytics: 'विश्लेषण और ट्रैकिंग',
            thirdParty: 'तृतीय-पक्ष सेवाएं',
            financial: 'आपका वित्तीय डेटा',
            children: 'बच्चों की गोपनीयता',
            security: 'डेटा सुरक्षा',
            rights: 'आपके अधिकार',
            changes: 'इस नीति में परिवर्तन',
            contact: 'संपर्क करें',
            reporting: 'उपयोग एनालिटिक्स',
            access: 'पहुंच',
            delete: 'हटाएं',
            portability: 'पोर्टेबिलिटी',
        },
    },
    te: {
        title: 'గోప్యతా విధానం',
        hero: 'మీ గోప్యత ముఖ్యమైనది',
        heroSub: 'మీ లెక్కలు మరియు ఆర్థిక డేటా మీ పరికరంలోనే ఉంటాయి. ఖాతా లేదు, బ్యాకెండ్ లేదు, డేటాబేస్ లేదు. యాప్‌ను మెరుగుపరచడానికి FinCalix అనామక వినియోగ గణాంకాలను సేకరిస్తుంది, ఉదాహరణకు ఏ ఫీచర్లు ఎక్కువగా వాడుతున్నారో. ఆర్థిక మొత్తాలు ఎప్పుడూ పంపబడవు.',
        updated: 'చివరిగా నవీకరించబడింది: 18 నవంబర్ 2026',
        s: {
            collect: 'మేము సేకరించే సమాచారం',
            storage: 'మీ పరికరంలో నిల్వ చేసిన డేటా',
            backup: 'బ్యాకప్ & రీస్టోర్',
            analytics: 'విశ్లేషణ మరియు ట్రాకింగ్',
            thirdParty: 'మూడవ పక్ష సేవలు',
            financial: 'మీ ఆర్థిక డేటా',
            children: 'పిల్లల గోప్యత',
            security: 'డేటా భద్రత',
            rights: 'మీ హక్కులు',
            changes: 'ఈ విధానంలో మార్పులు',
            contact: 'సంప్రదించండి',
            reporting: 'వినియోగ విశ్లేషణలు',
            access: 'యాక్సెస్',
            delete: 'తొలగించు',
            portability: 'పోర్టబిలిటీ',
        },
    },
    ta: {
        title: 'தனியுரிமைக் கொள்கை',
        hero: 'உங்கள் தனியுரிமை முக்கியம்',
        heroSub: 'உங்கள் கணக்கீடுகளும் நிதித் தரவும் உங்கள் சாதனத்திலேயே இருக்கும். கணக்கு இல்லை, பின்நிலை (backend) இல்லை, தரவுத்தளம் இல்லை. ஆப்பை மேம்படுத்த, எந்த அம்சங்கள் அதிகம் பயன்படுத்தப்படுகின்றன என்பது போன்ற அநாமதேயப் பயன்பாட்டுப் புள்ளிவிவரங்களை FinCalix சேகரிக்கிறது. நிதித் தொகைகள் ஒருபோதும் அனுப்பப்படாது.',
        updated: 'கடைசியாக புதுப்பிக்கப்பட்டது: 18 நவம்பர் 2026',
        s: {
            collect: 'நாங்கள் சேகரிக்கும் தகவல்',
            storage: 'உங்கள் சாதனத்தில் சேமிக்கப்பட்ட தரவு',
            backup: 'காப்புப்பிரதி & மீட்டெடுப்பு',
            analytics: 'பகுப்பாய்வு மற்றும் கண்காணிப்பு',
            thirdParty: 'மூன்றாம் தரப்பு சேவைகள்',
            financial: 'உங்கள் நிதி தரவு',
            children: 'குழந்தைகளின் தனியுரிமை',
            security: 'தரவு பாதுகாப்பு',
            rights: 'உங்கள் உரிமைகள்',
            changes: 'இந்தக் கொள்கையில் மாற்றங்கள்',
            contact: 'தொடர்பு கொள்ளுங்கள்',
            reporting: 'பயன்பாட்டு பகுப்பாய்வு',
            access: 'அணுகல்',
            delete: 'நீக்கு',
            portability: 'பொருந்தும் தன்மை',
        },
    },
    kn: {
        title: 'ಗೌಪ್ಯತಾ ನೀತಿ',
        hero: 'ನಿಮ್ಮ ಗೌಪ್ಯತೆ ಮುಖ್ಯ',
        heroSub: 'ನಿಮ್ಮ ಲೆಕ್ಕಾಚಾರಗಳು ಮತ್ತು ಹಣಕಾಸು ಡೇಟಾ ನಿಮ್ಮ ಸಾಧನದಲ್ಲೇ ಉಳಿಯುತ್ತವೆ. ಖಾತೆ ಇಲ್ಲ, ಬ್ಯಾಕೆಂಡ್ ಇಲ್ಲ, ಡೇಟಾಬೇಸ್ ಇಲ್ಲ. ಆ್ಯಪ್ ಅನ್ನು ಉತ್ತಮಪಡಿಸಲು, ಯಾವ ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ಹೆಚ್ಚು ಬಳಸಲಾಗುತ್ತದೆ ಎಂಬಂತಹ ಅನಾಮಧೇಯ ಬಳಕೆಯ ಅಂಕಿಅಂಶಗಳನ್ನು FinCalix ಸಂಗ್ರಹಿಸುತ್ತದೆ. ಹಣಕಾಸಿನ ಮೊತ್ತಗಳನ್ನು ಎಂದಿಗೂ ಕಳುಹಿಸುವುದಿಲ್ಲ.',
        updated: 'ಕೊನೆಯದಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ: 18 ನವೆಂಬರ್ 2026',
        s: {
            collect: 'ನಾವು ಸಂಗ್ರಹಿಸುವ ಮಾಹಿತಿ',
            storage: 'ನಿಮ್ಮ ಸಾಧನದಲ್ಲಿ ಸಂಗ್ರಹಿಸಿದ ಡೇಟಾ',
            backup: 'ಬ್ಯಾಕಪ್ & ರೀಸ್ಟೋರ್',
            analytics: 'ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಟ್ರ್ಯಾಕಿಂಗ್',
            thirdParty: 'ಮೂರನೇ ವ್ಯಕ್ತಿ ಸೇವೆಗಳು',
            financial: 'ನಿಮ್ಮ ಹಣಕಾಸು ಡೇಟಾ',
            children: 'ಮಕ್ಕಳ ಗೌಪ್ಯತೆ',
            security: 'ದತ್ತಾಂಶ ಸುರಕ್ಷತೆ',
            rights: 'ನಿಮ್ಮ ಹಕ್ಕುಗಳು',
            changes: 'ಈ ನೀತಿಯಲ್ಲಿ ಬದಲಾವಣೆಗಳು',
            contact: 'ಸಂಪರ್ಕಿಸಿ',
            reporting: 'ಬಳಕೆಯ ಅನಾಲಿಟಿಕ್ಸ್',
            access: 'ಪ್ರವೇಶ',
            delete: 'ಅಳಿಸು',
            portability: 'ಪೋರ್ಟೆಬಿಲಿಟಿ',
        },
    },
    ml: {
        title: 'സ്വകാര്യതാ നയം',
        hero: 'നിങ്ങളുടെ സ്വകാര്യത ഞങ്ങൾക്ക് പ്രധാനമാണ്',
        heroSub: 'നിങ്ങളുടെ കണക്കുകൂട്ടലുകളും സാമ്പത്തിക ഡാറ്റയും നിങ്ങളുടെ ഉപകരണത്തിൽ തന്നെ തുടരും. അക്കൗണ്ടില്ല, ബാക്കെൻഡില്ല, ഡാറ്റാബേസുമില്ല. ആപ്പ് മെച്ചപ്പെടുത്താൻ, ഏതൊക്കെ ഫീച്ചറുകളാണ് കൂടുതൽ ഉപയോഗിക്കുന്നത് എന്നതുപോലുള്ള അജ്ഞാത ഉപയോഗ സ്ഥിതിവിവരക്കണക്കുകൾ FinCalix ശേഖരിക്കുന്നു. സാമ്പത്തിക തുകകൾ ഒരിക്കലും അയയ്ക്കില്ല.',
        updated: 'അവസാനം പുതുക്കിയത്: 18 നവംബർ 2026',
        s: {
            collect: 'ഞങ്ങൾ ശേഖരിക്കുന്ന വിവരങ്ങൾ',
            storage: 'നിങ്ങളുടെ ഉപകരണത്തിൽ സൂക്ഷിക്കുന്ന ഡാറ്റ',
            backup: 'ബാക്കപ്പ് & റീസ്റ്റോർ',
            analytics: 'അനലിറ്റിക്സും ട്രാക്കിങ്ങും',
            thirdParty: 'മൂന്നാം കക്ഷി സേവനങ്ങൾ',
            financial: 'നിങ്ങളുടെ സാമ്പത്തിക ഡാറ്റ',
            children: 'കുട്ടികളുടെ സ്വകാര്യത',
            security: 'ഡാറ്റ സുരക്ഷ',
            rights: 'നിങ്ങളുടെ അവകാശങ്ങൾ',
            changes: 'ഈ നയത്തിലെ മാറ്റങ്ങൾ',
            contact: 'ഞങ്ങളെ ബന്ധപ്പെടുക',
            reporting: 'ഉപയോഗ അനലിറ്റിക്സ്',
            access: 'കാണാനുള്ള അവകാശം',
            delete: 'മായ്ക്കാനുള്ള അവകാശം',
            portability: 'പോർട്ടബിലിറ്റി',
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
        <ul style={{ paddingLeft: '20px', margin: '10px 0', listStyle: 'disc' }}>
            {items.map((item, i) => <li key={i} style={{ marginBottom: '6px' }}>{item}</li>)}
        </ul>
    );
}

// ── Page text (shared by the website page below and the app screen, src/pages/PrivacyPolicy.tsx) ──
function Body({ lang }: { lang: Lang }) {
    const c = useAppColors();
    const t = T[lang];
    const x = legalText(lang).privacy;

    return (
        <>
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
                <p style={{ marginBottom: '10px' }}>{x.collect.intro.before}<strong style={{ color: c.text }}>{x.collect.intro.strong}</strong>{x.collect.intro.after}</p>
                <Bullets items={x.collect.bullets} />
                <p>{x.collect.outro}</p>
            </Section>

            {/* 2 */}
            <Section icon="📱" color="#3B82F6" title={t.s.storage}>
                <p style={{ marginBottom: '10px' }}>{x.storage.intro.before}<strong style={{ color: c.text }}>{x.storage.intro.strong}</strong>{x.storage.intro.after}</p>
                <Bullets items={x.storage.bullets} />
                <GoldBox>
                    🔒 <strong>{x.storage.boxTitle}</strong>
                    <Bullets items={x.storage.boxBullets} />
                    {x.storage.boxText}
                </GoldBox>
            </Section>

            {/* 3 */}
            <Section icon="📊" color="#EC4899" title={t.s.analytics}>
                <p style={{ marginBottom: '14px' }}>{x.analytics.intro}</p>
                <Card>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <div style={{ color: '#10B981', fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{x.analytics.collectedTitle}</div>
                            {x.analytics.collected.map(item => (
                                <div key={item} style={{ color: c.textSecondary, fontSize: '13px', padding: '4px 0', borderBottom: `1px solid ${c.border}` }}>• {item}</div>
                            ))}
                        </div>
                        <div>
                            <div style={{ color: '#EF4444', fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{x.analytics.neverTitle}</div>
                            {x.analytics.never.map(item => (
                                <div key={item} style={{ color: c.textSecondary, fontSize: '13px', padding: '4px 0', borderBottom: `1px solid ${c.border}` }}>• {item}</div>
                            ))}
                        </div>
                    </div>
                </Card>
                <p style={{ marginTop: '12px' }}>{x.analytics.outro}</p>
            </Section>

            {/* 4 */}
            <Section icon="🔗" color="#3B82F6" title={t.s.thirdParty}>
                <p style={{ marginBottom: '14px' }}>{x.thirdParty.intro}</p>
                <Card>
                    <div style={{ color: c.text, fontWeight: 600, marginBottom: '6px' }}>{x.thirdParty.cardTitle}</div>
                    <div style={{ color: c.textSecondary, fontSize: '13px' }}>{x.thirdParty.cardText}</div>
                </Card>
                <p style={{ marginTop: '12px' }}>{x.thirdParty.outro}</p>
            </Section>

            {/* 5 */}
            <Section icon="🔒" color="#10B981" title={t.s.financial}>
                <GreenBox>
                    💰 <strong>{x.financial.boxTitle}</strong>
                    <Bullets items={x.financial.bullets} />
                </GreenBox>
            </Section>

            {/* Backup & Restore */}
            <Section icon="💾" color="#14B8A6" title={t.s.backup}>
                <p style={{ marginBottom: '10px' }}>{x.backup.intro}</p>
                <Bullets items={x.backup.bullets} />
            </Section>

            {/* 6 */}
            <Section icon="👶" color="#F59E0B" title={t.s.children}>
                <p style={{ marginBottom: '10px' }}>{x.children.p1}</p>
                <p>{x.children.p2}</p>
            </Section>

            {/* 7 */}
            <Section icon="🛡️" color="#6366F1" title={t.s.security}>
                <p style={{ marginBottom: '10px' }}>{x.security.intro}</p>
                <Bullets items={x.security.bullets} />
            </Section>

            {/* 8 */}
            <Section icon="⚖️" color="#C9A84C" title={t.s.rights}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '4px' }}>
                    {[
                        { title: t.s.access, text: x.rights.access },
                        { title: t.s.delete, text: x.rights.delete },
                        { title: t.s.portability, text: x.rights.portability },
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
                <p style={{ marginBottom: '10px' }}>{x.changes.p1}</p>
                <p>{x.changes.p2}</p>
            </Section>

            {/* 10 */}
            <Section icon="✉️" color="#3B82F6" title={t.s.contact}>
                <p style={{ marginBottom: '14px' }}>{x.contact.intro}</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <a href={`mailto:${x.contact.email}`} style={{ textDecoration: 'none' }}>
                        <Card><div style={{ color: '#C9A84C', fontWeight: 600, fontSize: '14px' }}>📧 {x.contact.email}</div></Card>
                    </a>
                    <a href={x.contact.siteUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <Card><div style={{ color: '#3B82F6', fontWeight: 600, fontSize: '14px' }}>🌐 {x.contact.siteLabel}</div></Card>
                    </a>
                </div>
            </Section>

            {/* 11 */}
            <Section icon="📊" color="#EC4899" title={t.s.reporting}>
                <p style={{ marginBottom: '14px' }}>{x.reporting.intro}</p>
                <GreenBox>
                    <div style={{ color: '#10B981', fontWeight: 600, marginBottom: '10px' }}>✅ {x.reporting.safetyTitle}</div>
                    <Bullets items={x.reporting.safetyBullets} />
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
                        🛡️ {x.reporting.dataPrivacyLink}
                    </a>
                </div>
            </Section>

            {/* 12 — DPDP Act 2023 & Grievance */}
            <Section icon="⚖️" color="#8B5CF6" title={x.dpdp.title}>
                <p style={{ marginBottom: '14px' }}>
                    {x.dpdp.intro}
                </p>

                <div style={{
                    background: c.isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.06)',
                    border: `1px solid rgba(139,92,246,${c.isDark ? '0.3' : '0.2'})`,
                    borderRadius: '12px', padding: '14px', marginBottom: '14px',
                }}>
                    <div style={{ color: '#8B5CF6', fontWeight: 600, marginBottom: '8px' }}>{x.dpdp.rightsTitle}</div>
                    <Bullets items={x.dpdp.rights} />
                </div>

                <div style={{
                    background: c.isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
                    border: `1px solid rgba(16,185,129,${c.isDark ? '0.3' : '0.2'})`,
                    borderRadius: '12px', padding: '14px', marginBottom: '14px',
                }}>
                    <div style={{ color: '#10B981', fontWeight: 600, marginBottom: '6px' }}>{x.dpdp.grievanceTitle}</div>
                    <a href={`mailto:${x.contact.email}`} style={{ color: '#10B981', fontWeight: 600, textDecoration: 'underline' }}>
                        {x.contact.email}
                    </a>
                </div>

                <div style={{
                    background: c.isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)',
                    border: `1px solid rgba(245,158,11,${c.isDark ? '0.3' : '0.2'})`,
                    borderRadius: '12px', padding: '14px',
                }}>
                    <div style={{ color: '#F59E0B', fontWeight: 600, marginBottom: '6px' }}>{x.dpdp.trademarksTitle}</div>
                    <p style={{ fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                        {x.dpdp.trademarks}
                    </p>
                </div>
            </Section>
        </>
    );
}

export const PRIVACY_POLICY: LegalDoc = { meta: T, Body };

// ── Website page ─────────────────────────────────────────
export default function PrivacyPolicy() {
    const [lang, setLang] = useState<Lang>('en');
    const c = useAppColors();
    const t = T[lang];

    return (
        <LegalLayout
            title={t.title}
            updated={t.updated}
            langBar={<LangSelector lang={lang} onChange={setLang} />}
            lang={lang}
        >
            <Body lang={lang} />

            {/* Play Store */}
            <div style={{ textAlign: 'center', paddingTop: '32px', borderTop: `1px solid ${c.border}` }}>
                <PlayStoreBadge />
            </div>
        </LegalLayout>
    );
}
