import { useState } from 'react';
import LegalLayout, { LangSelector, PlayStoreBadge, type Lang, type LegalDoc } from './LegalLayout';
import { useAppColors } from '../../theme/useAppColors';
import { legalText } from './text';

const T = {
    en: { title: 'Terms of Service', subtitle: 'USAGE AGREEMENT', updated: 'Last updated · July 2026', s1: 'For Reference Only', s2: 'Not Financial Advice', s3: 'Government Schemes', s4: 'Liability', s5: 'Backups & Data Loss', closing: 'By using this app, you acknowledge and agree to the terms outlined above.' },
    hi: { title: 'सेवा की शर्तें', subtitle: 'उपयोग अनुबंध', updated: 'अंतिम अपडेट · जुलाई 2026', s1: 'केवल संदर्भ के लिए', s2: 'वित्तीय सलाह नहीं', s3: 'सरकारी योजनाएं', s4: 'दायित्व', s5: 'बैकअप और डेटा हानि', closing: 'इस ऐप का उपयोग करके, आप ऊपर दी गई शर्तों से सहमत हैं।' },
    te: { title: 'సేవా నిబంధనలు', subtitle: 'వినియోగ ఒప్పందం', updated: 'చివరి నవీకరణ · జూలై 2026', s1: 'కేవలం సూచన కోసం', s2: 'ఆర్థిక సలహా కాదు', s3: 'ప్రభుత్వ పథకాలు', s4: 'బాధ్యత', s5: 'బ్యాకప్‌లు & డేటా నష్టం', closing: 'ఈ యాప్ ఉపయోగించడం ద్వారా మీరు పై నిబంధనలకు అంగీకరిస్తున్నారు.' },
    ta: { title: 'சேவை விதிமுறைகள்', subtitle: 'பயன்பாட்டு ஒப்பந்தம்', updated: 'கடைசியாக புதுப்பிக்கப்பட்டது · ஜூலை 2026', s1: 'குறிப்புக்கு மட்டும்', s2: 'நிதி ஆலோசனை இல்லை', s3: 'அரசு திட்டங்கள்', s4: 'பொறுப்பு', s5: 'காப்புப்பிரதிகள் & தரவு இழப்பு', closing: 'இந்த செயலியை பயன்படுத்துவதன் மூலம் மேற்கூறிய விதிகளுக்கு ஒப்புக்கொள்கிறீர்கள்.' },
    kn: { title: 'ಸೇವಾ ನಿಯಮಗಳು', subtitle: 'ಬಳಕೆ ಒಪ್ಪಂದ', updated: 'ಕೊನೆಯ ಅಪ್ಡೇಟ್ · ಜುಲೈ 2026', s1: 'ಉಲ್ಲೇಖಕ್ಕಾಗಿ ಮಾತ್ರ', s2: 'ಹಣಕಾಸು ಸಲಹೆ ಅಲ್ಲ', s3: 'ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು', s4: 'ಹೊಣೆಗಾರಿಕೆ', s5: 'ಬ್ಯಾಕಪ್ ಮತ್ತು ಡೇಟಾ ನಷ್ಟ', closing: 'ಈ ಅಪ್ಲಿಕೇಶನ್ ಬಳಸುವ ಮೂಲಕ ನೀವು ಮೇಲಿನ ನಿಯಮಗಳಿಗೆ ಒಪ್ಪಿಗೆ ನೀಡುತ್ತೀರಿ.' },
    ml: { title: 'സേവന നിബന്ധനകൾ', subtitle: 'ഉപയോഗ കരാർ', updated: 'അവസാനം പുതുക്കിയത് · ജൂലൈ 2026', s1: 'സൂചനയ്ക്ക് മാത്രം', s2: 'സാമ്പത്തിക ഉപദേശമല്ല', s3: 'സർക്കാർ പദ്ധതികൾ', s4: 'ബാധ്യതയുടെ പരിധി', s5: 'ബാക്കപ്പുകളും ഡാറ്റ നഷ്ടവും', closing: 'ഈ ആപ്പ് ഉപയോഗിക്കുന്നതിലൂടെ, മുകളിൽ പറഞ്ഞിരിക്കുന്ന നിബന്ധനകൾ നിങ്ങൾ അംഗീകരിക്കുന്നു.' },
} as const;

// Numbered sections: number and colour here, heading from T (s1-s5), text from ./text (terms.sections).
const SECTION_STYLE = [
    { n: '1', color: '#3B82F6' },
    { n: '2', color: '#10B981' },
    { n: '3', color: '#8B5CF6' },
    { n: '4', color: '#F59E0B' },
    { n: '5', color: '#EC4899' },
] as const;

const SECTIONS = (t: (typeof T)[Lang], texts: readonly string[]) => {
    const titles = [t.s1, t.s2, t.s3, t.s4, t.s5];
    return SECTION_STYLE.map((s, i) => ({ ...s, title: titles[i], text: texts[i] }));
};

// Page text, shared by the website page below and the app screen (src/pages/TermsOfService.tsx).
function Body({ lang }: { lang: Lang }) {
    const t = T[lang];
    const c = useAppColors();

    return (
        <>
            {/* Header badge */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <div style={{
                    width: '72px', height: '72px', borderRadius: '20px',
                    background: c.isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)',
                    border: `1px solid rgba(59,130,246,${c.isDark ? '0.3' : '0.2'})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '32px', margin: '0 auto 16px'
                }}>
                    📜
                </div>
                <div style={{
                    display: 'inline-block', padding: '6px 18px', borderRadius: '20px',
                    background: c.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    border: `1px solid ${c.border}`, color: c.textSecondary,
                    fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px'
                }}>
                    {t.subtitle}
                </div>
            </div>

            {/* Numbered sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '48px' }}>
                {SECTIONS(t, legalText(lang).terms.sections).map((sec) => (
                    <div
                        key={sec.n}
                        style={{
                            background: c.card, border: `1px solid ${c.border}`,
                            borderRadius: '16px', padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start',
                        }}
                    >
                        <div
                            style={{
                                width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                                background: sec.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: '16px', fontWeight: 700,
                                boxShadow: `0 4px 12px ${sec.color}30`
                            }}
                        >
                            {sec.n}
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: c.text, margin: '0 0 10px', lineHeight: 1.3 }}>{sec.title}</h3>
                            <p style={{ color: c.textSecondary, fontSize: '14px', lineHeight: 1.75, margin: 0 }}>{sec.text}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Closing */}
            <div style={{
                background: c.isDark ? 'rgba(201,168,76,0.08)' : 'rgba(201,168,76,0.05)',
                border: `1px solid rgba(201,168,76,${c.isDark ? '0.25' : '0.15'})`,
                borderRadius: '14px', padding: '24px', textAlign: 'center', marginBottom: '32px'
            }}>
                <p style={{ color: c.text, fontSize: '14px', lineHeight: 1.7, margin: '0 0 10px', fontWeight: 500 }}>{t.closing}</p>
                <p style={{ color: c.textSecondary, fontSize: '12px', margin: 0 }}>{t.updated}</p>
            </div>
        </>
    );
}

export const TERMS_OF_SERVICE: LegalDoc = { meta: T, Body };

// Website page
export default function TermsOfService() {
    const [lang, setLang] = useState<Lang>('en');
    const t = T[lang];

    return (
        <LegalLayout title={t.title} updated={t.updated} langBar={<LangSelector lang={lang} onChange={setLang} />} lang={lang}>
            <Body lang={lang} />
            <div style={{ textAlign: 'center' }}>
                <PlayStoreBadge />
            </div>
        </LegalLayout>
    );
}
