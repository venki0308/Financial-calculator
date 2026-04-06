import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function GlobalDisclaimerModal() {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [canAccept, setCanAccept] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const alreadyAccepted =
            localStorage.getItem('appDisclaimerAccepted') === 'true' ||
            localStorage.getItem('expenseTrackerDisclaimerAccepted') === 'true' ||
            localStorage.getItem('fincalix_disclaimer_accepted') === 'true';
            
        if (!alreadyAccepted) {
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
            <div className="w-full max-w-md bg-[#1E293B] rounded-2xl flex flex-col shadow-2xl overflow-hidden" style={{ maxHeight: '85vh' }}>
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-700/50 text-center">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-1">
                        {t('disclaimer.welcome')}
                    </h2>
                    <p className="text-slate-400 text-sm font-medium">{t('disclaimer.subtitle')}</p>
                </div>

                {/* Body */}
                <div 
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="overflow-y-auto p-6 space-y-6 flex-1 scroll-smooth pb-10"
                >
                    <p className="text-sm text-slate-300 font-medium leading-relaxed">
                        {t('disclaimer.readTerms')}
                    </p>

                    <div className="space-y-5">
                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.estimatesTitle')}</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">{t('disclaimer.estimatesBody')}</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.expensePrivacyTitle')}</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">{t('disclaimer.expensePrivacyBody')}</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.govSchemesTitle')}</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">{t('disclaimer.govSchemesBody')}</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.advisorTitle')}</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">{t('disclaimer.advisorBody')}</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.loanToolsTitle')}</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">{t('disclaimer.loanToolsBody')}</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.utilityTitle')}</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">{t('disclaimer.utilityBody')}</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.dataPrivacyTitle')}</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">{t('disclaimer.dataPrivacyBody')}</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">{t('disclaimer.generalNoteTitle')}</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">{t('disclaimer.generalNoteBody')}</p>
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-700/50 bg-slate-800/50">
                    <button
                        onClick={handleAccept}
                        disabled={!canAccept}
                        className={`w-full py-4 rounded-xl font-bold text-sm transition-all duration-300 ${
                            canAccept 
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 active:scale-[0.98]' 
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {canAccept ? t('disclaimer.acceptBtn') : t('disclaimer.scrollPrompt')}
                    </button>
                </div>
            </div>
        </div>
    );
}
