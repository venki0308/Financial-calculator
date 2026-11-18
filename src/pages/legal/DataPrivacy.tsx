import { useState } from 'react';
import type { ReactNode } from 'react';
import LegalLayout, { LangSelector, PlayStoreBadge, type Lang, type LegalDoc } from './LegalLayout';
import { useAppColors } from '../../theme/useAppColors';
import { legalText } from './text';

const T = {
    en: { title: 'Data & Privacy', hero: 'Your Data Stays With You', heroSub: 'FinCalix processes all your financial data on your device. FinCalix collects anonymous usage statistics, such as which features are used most, to improve the app. Financial amounts are never sent.', updated: 'Last Updated: 18 November 2026', s: { collect: 'What FinCalix Collects', storage: 'Stored on Your Device Only', backup: 'Backup & Restore', analytics: 'Usage Analytics', promises: 'Our Promises', safety: 'Google Play Data Safety Declaration', contact: 'Contact' } },
    hi: { title: 'डेटा और गोपनीयता', hero: 'आपका डेटा आपके साथ रहता है', heroSub: 'FinCalix आपके सभी वित्तीय डेटा को आपके डिवाइस पर ही प्रोसेस करता है। ऐप को बेहतर बनाने के लिए FinCalix गुमनाम उपयोग आँकड़े एकत्र करता है, जैसे कौन-सी सुविधाएँ सबसे ज़्यादा इस्तेमाल होती हैं। वित्तीय राशियाँ कभी नहीं भेजी जातीं।', updated: 'अंतिम अद्यतन: 18 नवंबर 2026', s: { collect: 'FinCalix क्या एकत्रित करता है', storage: 'केवल आपके डिवाइस पर संग्रहीत', backup: 'बैकअप और रीस्टोर', analytics: 'उपयोग एनालिटिक्स', promises: 'हमारे वादे', safety: 'Google Play डेटा सुरक्षा', contact: 'संपर्क' } },
    te: { title: 'డేటా మరియు గోప్యత', hero: 'మీ డేటా మీతోనే ఉంటుంది', heroSub: 'FinCalix మీ ఆర్థిక డేటా మొత్తాన్ని మీ పరికరంలోనే ప్రాసెస్ చేస్తుంది. యాప్‌ను మెరుగుపరచడానికి FinCalix అనామక వినియోగ గణాంకాలను సేకరిస్తుంది, ఉదాహరణకు ఏ ఫీచర్లు ఎక్కువగా వాడుతున్నారో. ఆర్థిక మొత్తాలు ఎప్పుడూ పంపబడవు.', updated: 'చివరిగా నవీకరించబడింది: 18 నవంబర్ 2026', s: { collect: 'FinCalix ఏమి సేకరిస్తుంది', storage: 'మీ పరికరంలో మాత్రమే నిల్వ', backup: 'బ్యాకప్ & రీస్టోర్', analytics: 'వినియోగ విశ్లేషణలు', promises: 'మా వాగ్దానాలు', safety: 'Google Play డేటా భద్రత', contact: 'సంప్రదించండి' } },
    ta: { title: 'தரவு மற்றும் தனியுரிமை', hero: 'உங்கள் தரவு உங்களிடமே உள்ளது', heroSub: 'FinCalix உங்கள் நிதித் தரவு அனைத்தையும் உங்கள் சாதனத்திலேயே செயலாக்குகிறது. ஆப்பை மேம்படுத்த, எந்த அம்சங்கள் அதிகம் பயன்படுத்தப்படுகின்றன என்பது போன்ற அநாமதேயப் பயன்பாட்டுப் புள்ளிவிவரங்களை FinCalix சேகரிக்கிறது. நிதித் தொகைகள் ஒருபோதும் அனுப்பப்படாது.', updated: 'கடைசியாக புதுப்பிக்கப்பட்டது: 18 நவம்பர் 2026', s: { collect: 'FinCalix என்ன சேகரிக்கிறது', storage: 'உங்கள் சாதனத்தில் மட்டும் சேமிக்கப்பட்டுள்ளது', backup: 'காப்புப்பிரதி & மீட்டெடுப்பு', analytics: 'பயன்பாட்டு பகுப்பாய்வு', promises: 'எங்கள் வாக்குறுதிகள்', safety: 'Google Play தரவு பாதுகாப்பு', contact: 'தொடர்பு' } },
    kn: { title: 'ಡೇಟಾ ಮತ್ತು ಗೌಪ್ಯತೆ', hero: 'ನಿಮ್ಮ ಡೇಟಾ ನಿಮ್ಮೊಂದಿಗಿದೆ', heroSub: 'FinCalix ನಿಮ್ಮ ಎಲ್ಲಾ ಹಣಕಾಸು ಡೇಟಾವನ್ನು ನಿಮ್ಮ ಸಾಧನದಲ್ಲೇ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸುತ್ತದೆ. ಆ್ಯಪ್ ಅನ್ನು ಉತ್ತಮಪಡಿಸಲು, ಯಾವ ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ಹೆಚ್ಚು ಬಳಸಲಾಗುತ್ತದೆ ಎಂಬಂತಹ ಅನಾಮಧೇಯ ಬಳಕೆಯ ಅಂಕಿಅಂಶಗಳನ್ನು FinCalix ಸಂಗ್ರಹಿಸುತ್ತದೆ. ಹಣಕಾಸಿನ ಮೊತ್ತಗಳನ್ನು ಎಂದಿಗೂ ಕಳುಹಿಸುವುದಿಲ್ಲ.', updated: 'ಕೊನೆಯದಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ: 18 ನವೆಂಬರ್ 2026', s: { collect: 'FinCalix ಏನು ಸಂಗ್ರಹಿಸುತ್ತದೆ', storage: 'ನಿಮ್ಮ ಸಾಧನದಲ್ಲಿ ಮಾತ್ರ ಸಂಗ್ರಹ', backup: 'ಬ್ಯಾಕಪ್ & ರೀಸ್ಟೋರ್', analytics: 'ಬಳಕೆಯ ಅನಾಲಿಟಿಕ್ಸ್', promises: 'ನಮ್ಮ ವಾಗ್ದಾನಗಳು', safety: 'Google Play ಡೇಟಾ ಸುರಕ್ಷತೆ', contact: 'ಸಂಪರ್ಕಿಸಿ' } },
    ml: { title: 'ഡാറ്റയും സ്വകാര്യതയും', hero: 'നിങ്ങളുടെ ഡാറ്റ നിങ്ങളോടൊപ്പം തന്നെ', heroSub: 'FinCalix നിങ്ങളുടെ എല്ലാ സാമ്പത്തിക ഡാറ്റയും നിങ്ങളുടെ ഉപകരണത്തിൽ തന്നെയാണ് പ്രോസസ്സ് ചെയ്യുന്നത്. ആപ്പ് മെച്ചപ്പെടുത്താൻ, ഏതൊക്കെ ഫീച്ചറുകളാണ് കൂടുതൽ ഉപയോഗിക്കുന്നത് എന്നതുപോലുള്ള അജ്ഞാത ഉപയോഗ സ്ഥിതിവിവരക്കണക്കുകൾ FinCalix ശേഖരിക്കുന്നു. സാമ്പത്തിക തുകകൾ ഒരിക്കലും അയയ്ക്കില്ല.', updated: 'അവസാനം പുതുക്കിയത്: 18 നവംബർ 2026', s: { collect: 'FinCalix എന്തൊക്കെ ശേഖരിക്കുന്നു', storage: 'നിങ്ങളുടെ ഉപകരണത്തിൽ മാത്രം സൂക്ഷിക്കുന്നു', backup: 'ബാക്കപ്പ് & റീസ്റ്റോർ', analytics: 'ഉപയോഗ അനലിറ്റിക്സ്', promises: 'ഞങ്ങളുടെ ഉറപ്പുകൾ', safety: 'Google Play ഡാറ്റ സുരക്ഷ', contact: 'ബന്ധപ്പെടുക' } },
} as const;

function Section({ icon, color, title, children }: { icon: string; color: string; title: string; children: React.ReactNode }) {
    const colors = useAppColors();
    const bgOpacity = colors.isDark ? '30' : '20';
    return (
        <section style={{ marginBottom: '44px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '12px', 
                    background: `${color}${bgOpacity}`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '20px', 
                    flexShrink: 0 
                }}>{icon}</div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: colors.text, margin: 0 }}>{title}</h2>
            </div>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8 }}>{children}</div>
        </section>
    );
}

// Page text, shared by the website page below and the app screen (src/pages/DataPrivacy.tsx).
// `badge` is the website's Play badge (no text), shown next to the last link.
function Body({ lang, badge }: { lang: Lang; badge?: ReactNode }) {
    const colors = useAppColors();
    const t = T[lang];
    const x = legalText(lang).dataPrivacy;

    const goldColor = colors.isDark ? '#C9A84C' : '#A68A3D';
    const emeraldColor = colors.isDark ? '#10B981' : '#059669';

    return (
        <>
            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <div style={{ 
                    width: '72px', 
                    height: '72px', 
                    borderRadius: '20px', 
                    background: colors.isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)', 
                    border: `1px solid ${colors.isDark ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.2)'}`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '32px', 
                    margin: '0 auto 20px' 
                }}>🛡️</div>
                <h2 style={{ fontSize: 'clamp(1.4rem,4vw,2rem)', fontWeight: 700, color: colors.text, marginBottom: '12px' }}>{t.hero}</h2>
                <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: 1.65, maxWidth: '600px', margin: '0 auto' }}>{t.heroSub}</p>
            </div>

            <Section icon="👁️" color="#8B5CF6" title={t.s.collect}>
                <p style={{ marginBottom: '10px' }}>{x.collect.p1}</p>
                <p>{x.collect.p2}</p>
            </Section>

            <Section icon="📱" color="#3B82F6" title={t.s.storage}>
                <p style={{ marginBottom: '10px' }}>{x.storage.p1}</p>
                <p style={{ marginBottom: '10px' }}>{x.storage.p2}</p>
                <p>{x.storage.p3}</p>
            </Section>

            <Section icon="💾" color="#14B8A6" title={t.s.backup}>
                <p style={{ marginBottom: '10px' }}>{x.backup.p1.before}<strong style={{ color: colors.text }}>{x.backup.p1.strong}</strong>{x.backup.p1.after}</p>
                <p style={{ marginBottom: '10px' }}>{x.backup.p2}</p>
                <p>{x.backup.p3}</p>
            </Section>

            <Section icon="📊" color="#EC4899" title={t.s.analytics}>
                <p style={{ marginBottom: '10px' }}>{x.analytics.p1}</p>
                <p style={{ marginBottom: '10px' }}><strong style={{ color: colors.text }}>{x.analytics.p2}</strong></p>
                <p style={{ marginBottom: '10px' }}>{x.analytics.p3}</p>
                <p>{x.analytics.p4}</p>
            </Section>

            <Section icon="✅" color="#10B981" title={t.s.promises}>
                {x.promises.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 0', borderBottom: `1px solid ${colors.border}` }}>
                        <span style={{ color: emeraldColor, fontSize: '16px', flexShrink: 0 }}>✅</span>
                        <span>{item}</span>
                    </div>
                ))}
            </Section>

            <Section icon="📋" color="#C9A84C" title={t.s.safety}>
                <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                    {x.safety.map((row, i) => (
                        <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '14px 18px', borderBottom: i < x.safety.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                            <div style={{ color: goldColor, fontSize: '12px', fontWeight: 600 }}>{row.label}</div>
                            <div style={{ color: colors.textSecondary, fontSize: '13px' }}>{row.value}</div>
                        </div>
                    ))}
                </div>
            </Section>

            <Section icon="✉️" color="#3B82F6" title={t.s.contact}>
                <a href={`mailto:${x.email}`} style={{ display: 'inline-block', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '14px 20px', color: goldColor, fontWeight: 600, textDecoration: 'none', fontSize: '14px' }}>
                    📧 {x.email}
                </a>
            </Section>

            <div style={{ paddingTop: '24px', borderTop: `1px solid ${colors.border}`, display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                <a href="/privacy-policy" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: colors.isDark ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.05)', border: `1px solid ${colors.isDark ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.2)'}`, color: goldColor, fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
                    {x.fullPolicyLink} →
                </a>
                {badge}
            </div>
        </>
    );
}

export const DATA_PRIVACY: LegalDoc = { meta: T, Body };

// Website page
export default function DataPrivacy() {
    const [lang, setLang] = useState<Lang>('en');
    const t = T[lang];

    return (
        <LegalLayout title={t.title} updated={t.updated} langBar={<LangSelector lang={lang} onChange={setLang} />} lang={lang}>
            <Body lang={lang} badge={<PlayStoreBadge />} />
        </LegalLayout>
    );
}
