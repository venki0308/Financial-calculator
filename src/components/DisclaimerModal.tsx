import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function DisclaimerModal() {
    const { t } = useTranslation();
    const [accepted, setAccepted] = useState(() => {
        return localStorage.getItem('expenseTrackerDisclaimerAccepted') === 'true';
    });

    if (accepted) return null;

    const handleAccept = () => {
        localStorage.setItem('expenseTrackerDisclaimerAccepted', 'true');
        setAccepted(true);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[360px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-center mb-4" style={{ color: '#7C3AED' }}>
                    {t('disclaimer.modalTitle')}
                </h2>

                <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-3">
                    <p>{t('disclaimer.modalIntro')}</p>
                    <p>{t('disclaimer.modalNote')}</p>
                    <div className="pl-3 space-y-2">
                        <p>• {t('disclaimer.bullet1')}</p>
                        <p>• {t('disclaimer.bullet2')}</p>
                        <p>• {t('disclaimer.bullet3')}</p>
                        <p>• {t('disclaimer.bullet4')}</p>
                        <p>• {t('disclaimer.bullet5')}</p>
                        <p>• {t('disclaimer.bullet6')}</p>
                    </div>
                    <p className="pt-2 font-medium text-gray-700 dark:text-gray-300">
                        {t('disclaimer.modalAcknowledge')}
                    </p>
                </div>

                <button
                    onClick={handleAccept}
                    className="w-full mt-6 py-3.5 rounded-xl text-white font-bold text-sm shadow-lg transition-transform active:scale-[0.98]"
                    style={{ backgroundColor: '#7C3AED' }}
                >
                    {t('disclaimer.modalButton')}
                </button>
            </div>
        </div>
    );
}
