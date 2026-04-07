import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function GlobalDisclaimerModal() {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [canAccept, setCanAccept] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Canonical key
        const CANONICAL = 'fincalix_disclaimer_accepted';
        // Legacy keys (read for backward compatibility, then deleted)
        const LEGACY = ['appDisclaimerAccepted', 'expenseTrackerDisclaimerAccepted'];

        const alreadyAccepted =
            localStorage.getItem(CANONICAL) === 'true' ||
            LEGACY.some((k) => localStorage.getItem(k) === 'true');

        if (alreadyAccepted) {
            // Migrate any legacy key value to the canonical key, then drop the legacy ones.
            localStorage.setItem(CANONICAL, 'true');
            LEGACY.forEach((k) => localStorage.removeItem(k));
        } else {
            setVisible(true);
        }
    }, []);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        if (scrollHeight - scrollTop - clientHeight < 50) {
            setCanAccept(true);
        }
    };

    const handleAccept = () => {
        if (!canAccept) return;
        localStorage.setItem('fincalix_disclaimer_accepted', 'true');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <div className="w-full max-w-md bg-card border border-border rounded-2xl flex flex-col shadow-2xl overflow-hidden" style={{ maxHeight: '85vh' }}>
                {/* Header */}
                <div className="p-6 pb-4 border-b border-border text-center">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mb-1">
                        {t('disclaimer.welcome')}
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">{t('disclaimer.subtitle')}</p>
                </div>

                {/* Body */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="overflow-y-auto p-6 space-y-6 flex-1 scroll-smooth pb-10"
                >
                    <p className="text-sm text-foreground/80 font-medium leading-relaxed">
                        {t('disclaimer.readTerms')}
                    </p>

                    <div className="space-y-5">
                        <section>
                            <h3 className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.estimatesTitle')}</h3>
                            <p className="text-sm text-foreground/80 leading-relaxed">{t('disclaimer.estimatesBody')}</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.expensePrivacyTitle')}</h3>
                            <p className="text-sm text-foreground/80 leading-relaxed">{t('disclaimer.expensePrivacyBody')}</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.govSchemesTitle')}</h3>
                            <p className="text-sm text-foreground/80 leading-relaxed">{t('disclaimer.govSchemesBody')}</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.advisorTitle')}</h3>
                            <p className="text-sm text-foreground/80 leading-relaxed">{t('disclaimer.advisorBody')}</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.loanToolsTitle')}</h3>
                            <p className="text-sm text-foreground/80 leading-relaxed">{t('disclaimer.loanToolsBody')}</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.utilityTitle')}</h3>
                            <p className="text-sm text-foreground/80 leading-relaxed">{t('disclaimer.utilityBody')}</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.dataPrivacyTitle')}</h3>
                            <p className="text-sm text-foreground/80 leading-relaxed">{t('disclaimer.dataPrivacyBody')}</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.generalNoteTitle')}</h3>
                            <p className="text-sm text-foreground/80 leading-relaxed">{t('disclaimer.generalNoteBody')}</p>
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-border bg-muted/40">
                    <button
                        onClick={handleAccept}
                        disabled={!canAccept}
                        className={`w-full py-4 rounded-xl font-bold text-sm transition-all duration-300 ${
                            canAccept
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 active:scale-[0.98]'
                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                        }`}
                    >
                        {canAccept ? t('disclaimer.acceptBtn') : t('disclaimer.scrollPrompt')}
                    </button>
                </div>
            </div>
        </div>
    );
}
