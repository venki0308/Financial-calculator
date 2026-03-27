import { useState } from 'react';
import LegalLayout, { LangSelector, PlayStoreBadge, type Lang } from './LegalLayout';

const T = {
    en: { title: 'Terms of Service', subtitle: 'USAGE AGREEMENT', updated: 'Last updated · March 2026', s1: 'For Reference Only', s2: 'Not Financial Advice', s3: 'Government Schemes', s4: 'Liability', closing: 'By using this app, you acknowledge and agree to the terms outlined above.' },
    hi: { title: 'सेवा की शर्तें', subtitle: 'उपयोग अनुबंध', updated: 'अंतिम अपडेट · मार्च 2026', s1: 'केवल संदर्भ के लिए', s2: 'वित्तीय सलाह नहीं', s3: 'सरकारी योजनाएं', s4: 'दायित्व', closing: 'इस ऐप का उपयोग करके, आप ऊपर दी गई शर्तों से सहमत हैं।' },
    te: { title: 'సేవా నిబంధనలు', subtitle: 'వినియోగ ఒప్పందం', updated: 'చివరి నవీకరణ · మార్చి 2026', s1: 'కేవలం సూచన కోసం', s2: 'ఆర్థిక సలహా కాదు', s3: 'ప్రభుత్వ పథకాలు', s4: 'బాధ్యత', closing: 'ఈ యాప్ ఉపయోగించడం ద్వారా మీరు పై నిబంధనలకు అంగీకరిస్తున్నారు.' },
    ta: { title: 'சேவை விதிமுறைகள்', subtitle: 'பயன்பாட்டு ஒப்பந்தம்', updated: 'கடைசியாக புதுப்பிக்கப்பட்டது · மார்ச் 2026', s1: 'குறிப்புக்கு மட்டும்', s2: 'நிதி ஆலோசனை இல்லை', s3: 'அரசு திட்டங்கள்', s4: 'பொறுப்பு', closing: 'இந்த செயலியை பயன்படுத்துவதன் மூலம் மேற்கூறிய விதிகளுக்கு ஒப்புக்கொள்கிறீர்கள்.' },
    kn: { title: 'ಸೇವಾ ನಿಯಮಗಳು', subtitle: 'ಬಳಕೆ ಒಪ್ಪಂದ', updated: 'ಕೊನೆಯ ಅಪ್ಡೇಟ್ · ಮಾರ್ಚ್ 2026', s1: 'ಉಲ್ಲೇಖಕ್ಕಾಗಿ ಮಾತ್ರ', s2: 'ಹಣಕಾಸು ಸಲಹೆ ಅಲ್ಲ', s3: 'ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು', s4: 'ಹೊಣೆಗಾರಿಕೆ', closing: 'ಈ ಅಪ್ಲಿಕೇಶನ್ ಬಳಸುವ ಮೂಲಕ ನೀವು ಮೇಲಿನ ನಿಯಮಗಳಿಗೆ ಒಪ್ಪಿಗೆ ನೀಡುತ್ತೀರಿ.' },
} as const;

const SECTIONS = (t: any) => [
    {
        n: '1', color: '#3B82F6', title: t.s1,
        text: 'The results provided by our calculators are estimates based on standard financial formulas and are for informational purposes only. Actual bank or government figures may vary.',
    },
    {
        n: '2', color: '#10B981', title: t.s2,
        text: 'This app does not provide professional financial, legal, or tax advice. Users are encouraged to consult with qualified professionals before making significant financial decisions.',
    },
    {
        n: '3', color: '#8B5CF6', title: t.s3,
        text: 'While we provide details of government schemes, we are NOT an official government entity. Always verify details on official portals (e.g., .gov.in domains) as rules are subject to change.',
    },
    {
        n: '4', color: '#F59E0B', title: t.s4,
        text: 'FinCalix shall not be liable for any financial losses or decisions made based on the data provided within this application.',
    },
];

export default function TermsOfService() {
    const [lang, setLang] = useState<Lang>('en');
    const t = T[lang];

    return (
        <LegalLayout title={t.title} updated={t.updated} langBar={<LangSelector lang={lang} onChange={setLang} />}>
            {/* Header badge */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 16px' }}>📜</div>
                <div style={{ display: 'inline-block', padding: '6px 18px', borderRadius: '20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px' }}>
                    {t.subtitle}
                </div>
            </div>

            {/* Numbered sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '48px' }}>
                {SECTIONS(t).map(sec => (
                    <div
                        key={sec.n}
                        style={{
                            background: '#0F1E35', border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '16px', padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start',
                        }}
                    >
                        <div
                            style={{
                                width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                                background: sec.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: '16px', fontWeight: 700,
                            }}
                        >
                            {sec.n}
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', margin: '0 0 10px', lineHeight: 1.3 }}>{sec.title}</h3>
                            <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.75, margin: 0 }}>{sec.text}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Closing */}
            <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '14px', padding: '20px 24px', textAlign: 'center', marginBottom: '32px' }}>
                <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.7, margin: '0 0 8px' }}>{t.closing}</p>
                <p style={{ color: '#4A5568', fontSize: '12px', margin: 0 }}>{t.updated}</p>
            </div>

            <div style={{ textAlign: 'center' }}>
                <PlayStoreBadge />
            </div>
        </LegalLayout>
    );
}
