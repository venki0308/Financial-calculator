import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function GlobalDisclaimerModal() {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [canAccept, setCanAccept] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Versioned acceptance: bump the suffix whenever the legal text
        // materially changes so existing users see the new disclosures and
        // re-accept. v2 = April 2026 expansion (CIBIL, tax, investment risk,
        // insurance, post-tax preview, gold loan, NPS PFRDA caps).
        // v3 = July 2026: Backup & Restore (export/import), Business Tracker.
        // Bumping also guarantees the banner shows on first open even when
        // Android auto-backup restored an old device's acceptance flag.
        const CANONICAL = 'fincalix_disclaimer_accepted_v3';
        // Legacy keys (read once, then cleared so we don't keep stale state)
        const LEGACY = [
            'fincalix_disclaimer_accepted',    // v1 — pre-audit pass
            'fincalix_disclaimer_accepted_v2', // v2 — pre backup/restore
            'appDisclaimerAccepted',
            'expenseTrackerDisclaimerAccepted',
        ];

        const alreadyAccepted = localStorage.getItem(CANONICAL) === 'true';

        if (alreadyAccepted) {
            // Already accepted v2 — drop any stale legacy keys.
            LEGACY.forEach((k) => localStorage.removeItem(k));
        } else {
            // Either a brand-new install, or an existing user from v1. Either
            // way, show the new disclaimer. Clean up legacy keys regardless,
            // so we don't accumulate them across versions.
            LEGACY.forEach((k) => localStorage.removeItem(k));
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
        localStorage.setItem('fincalix_disclaimer_accepted_v3', 'true');
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

                    {/* Sections render in order. Anything that touches money
                        comes first (Estimates → Loans → Tax → Investment →
                        Insurance → Schemes), followed by privacy / data,
                        then advisor / acknowledgment. Driven by an array so
                        future additions don't churn JSX layout. */}
                    <div className="space-y-5">
                        {([
                            ['estimatesTitle', 'estimatesBody'],
                            ['loanToolsTitle', 'loanToolsBody'],
                            ['taxToolsTitle', 'taxToolsBody'],
                            ['investmentRiskTitle', 'investmentRiskBody'],
                            ['insuranceToolsTitle', 'insuranceToolsBody'],
                            ['govSchemesTitle', 'govSchemesBody'],
                            ['expensePrivacyTitle', 'expensePrivacyBody'],
                            ['dataPrivacyTitle', 'dataPrivacyBody'],
                            ['backupTitle', 'backupBody'],
                            ['utilityTitle', 'utilityBody'],
                            ['advisorTitle', 'advisorBody'],
                            ['generalNoteTitle', 'generalNoteBody'],
                        ] as const).map(([titleKey, bodyKey]) => (
                            <section key={titleKey}>
                                <h3 className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">
                                    {t(`disclaimer.${titleKey}`)}
                                </h3>
                                <p className="text-sm text-foreground/80 leading-relaxed">
                                    {t(`disclaimer.${bodyKey}`)}
                                </p>
                            </section>
                        ))}
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
