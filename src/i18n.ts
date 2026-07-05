import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English locale is bundled (default fallback) — ~290KB
import en from './locales/en.json';

// Other locales are loaded on-demand to keep the initial bundle small.
// When the user picks Hindi/Telugu/Tamil/Kannada/Malayalam, that JSON file
// is fetched as a separate chunk (~470-540KB each) and added at runtime.
const localeLoaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
    hi: () => import('./locales/hi.json'),
    te: () => import('./locales/te.json'),
    ta: () => import('./locales/ta.json'),
    kn: () => import('./locales/kn.json'),
    ml: () => import('./locales/ml.json'),
};

const savedLang =
    typeof window !== 'undefined' ? localStorage.getItem('language') || 'en' : 'en';

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
    },
    lng: 'en',          // boot in English to avoid blocking on async load
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
});

// If the saved language is not English, lazy-load the bundle then switch
if (savedLang !== 'en' && localeLoaders[savedLang]) {
    localeLoaders[savedLang]()
        .then((mod) => {
            i18n.addResourceBundle(savedLang, 'translation', mod.default, true, true);
            // Only apply if the user hasn't manually switched language while
            // this boot-time fetch was in flight (slow networks) — otherwise
            // this would silently revert their explicit choice.
            const currentSaved = localStorage.getItem('language') || 'en';
            if (currentSaved === savedLang && i18n.language !== savedLang) {
                i18n.changeLanguage(savedLang);
            }
        })
        .catch((err) => {
            console.warn(`Failed to load locale ${savedLang}:`, err);
        });
}

/**
 * Switch app language. If the locale isn't loaded yet, fetches it first.
 * Components should call this instead of i18n.changeLanguage() directly.
 */
export async function switchLanguage(lang: string): Promise<void> {
    if (lang === 'en') {
        await i18n.changeLanguage('en');
        return;
    }
    if (!i18n.hasResourceBundle(lang, 'translation') && localeLoaders[lang]) {
        try {
            const mod = await localeLoaders[lang]();
            i18n.addResourceBundle(lang, 'translation', mod.default, true, true);
        } catch (err) {
            console.warn(`Failed to load locale ${lang}:`, err);
            return;
        }
    }
    await i18n.changeLanguage(lang);
}

export default i18n;
