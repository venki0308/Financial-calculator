import { useState } from 'react';
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useAppColors } from '../../theme/useAppColors';
import { LANG_OPTIONS, LangSelector, LegalText, type Lang, type LegalDoc } from './LegalLayout';

/**
 * The app's frame for a legal page (back button, language picker, app theme). The text is the
 * website's: `doc` comes from the page's module in src/pages/legal/, which the website renders
 * too, so the two can't drift. [data-legal-content] holds exactly what the website's <main> holds.
 * Languages are the website's (LANG_OPTIONS: en/hi/te/ta/kn/ml, the app's six), so the screen opens in
 * the app's language; anything else falls back to English.
 */
export default function AppLegalScreen({ doc }: { doc: LegalDoc }) {
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const c = useAppColors();
    const appLang = (i18n.language || 'en').slice(0, 2);
    const [lang, setLang] = useState<Lang>(LANG_OPTIONS.some((l) => l.code === appLang) ? (appLang as Lang) : 'en');
    const meta = doc.meta[lang];

    // The text links to /privacy-policy and /data-privacy with plain <a href> (the website has no
    // router); inside the app follow them with the router instead of reloading the app.
    const followInAppLinks = (e: MouseEvent) => {
        const a = (e.target as HTMLElement).closest('a');
        const href = a?.getAttribute('href') || '';
        if (a && href.startsWith('/') && !a.target) {
            e.preventDefault();
            navigate(href);
        }
    };

    return (
        <div className="min-h-dvh bg-background pb-10 w-full" style={{ maxWidth: 428, margin: '0 auto' }} onClickCapture={followInAppLinks}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center justify-between gap-3">
                    <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <LangSelector lang={lang} onChange={setLang} />
                </div>
            </div>
            <div data-legal-content="" style={{ padding: '24px 20px 40px', boxSizing: 'border-box', overflowWrap: 'break-word', color: c.text }}>
                <LegalText title={meta.title} updated={meta.updated}>
                    <doc.Body lang={lang} />
                </LegalText>
            </div>
        </div>
    );
}
