import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function GlobalDisclaimerModal() {
 const { t } = useTranslation();
 const [visible, setVisible] = useState(false);

 useEffect(() => {
 const alreadyAccepted =
 localStorage.getItem('appDisclaimerAccepted') === 'true' ||
 localStorage.getItem('expenseTrackerDisclaimerAccepted') === 'true';
 if (!alreadyAccepted) {
 setVisible(true);
 }
 }, []);

 const handleAccept = () => {
 localStorage.setItem('appDisclaimerAccepted', 'true');
 setVisible(false);
 };

 if (!visible) return null;

 return (
 <div
 className="fixed inset-0 z-[99999] flex items-center justify-center"
 style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
 >
 <div className="mx-4 w-full max-w-md bg-[#1E293B] rounded-2xl p-5 flex flex-col" style={{ maxHeight: '85vh' }}>
 {/* Title */}
 <h2 className="text-xl font-bold text-center mb-4" style={{ color: '#7C3AED' }}>
 {t('globalDisclaimer.title', 'Important Disclaimer')}
 </h2>

 {/* Scrollable Body */}
 <div className="overflow-y-auto flex-1 pr-1" style={{ maxHeight: '70vh' }}>
 <p className="text-sm text-slate-300 leading-relaxed mb-3">
 {t('globalDisclaimer.welcome', 'Welcome to FinCalix — Your Personal Finance Companion.')}
 </p>
 <p className="text-sm text-slate-300 leading-relaxed mb-3">
 {t('globalDisclaimer.readCarefully', 'Before you begin, please read this disclaimer carefully.')}
 </p>

 {/* Calculators & Tools */}
 <h3 className="text-sm font-semibold mt-3 mb-1" style={{ color: '#7C3AED' }}>
 {t('globalDisclaimer.calcTitle', 'Calculators & Tools:')}
 </h3>
 <ul className="text-sm text-slate-300 leading-relaxed space-y-1 pl-3">
 <li>• {t('globalDisclaimer.calcBullet1', 'All calculators (Home Loan, Car Loan, SIP, PPF, FD, Income Tax, Property, and others) provide estimates based on the values you enter.')}</li>
 <li>• {t('globalDisclaimer.calcBullet2', 'Results are for informational and planning purposes only.')}</li>
 <li>• {t('globalDisclaimer.calcBullet3', 'Actual figures may vary based on bank policies, market conditions, tax rule changes, and other factors.')}</li>
 </ul>

 {/* Expense Tracker */}
 <h3 className="text-sm font-semibold mt-3 mb-1" style={{ color: '#7C3AED' }}>
 {t('globalDisclaimer.expenseTitle', 'Expense Tracker:')}
 </h3>
 <ul className="text-sm text-slate-300 leading-relaxed space-y-1 pl-3">
 <li>• {t('globalDisclaimer.expenseBullet1', 'The Expense Tracker is for personal record-keeping only.')}</li>
 <li>• {t('globalDisclaimer.expenseBullet2', 'Financial Health Scores and Smart Insights are rule-based estimates — not professional financial assessments.')}</li>
 <li>• {t('globalDisclaimer.expenseBullet3', 'All data is stored locally on your device. FinCalix does not collect, store, or share your financial data.')}</li>
 </ul>

 {/* Government Schemes */}
 <h3 className="text-sm font-semibold mt-3 mb-1" style={{ color: '#7C3AED' }}>
 {t('globalDisclaimer.schemesTitle', 'Government Schemes:')}
 </h3>
 <ul className="text-sm text-slate-300 leading-relaxed space-y-1 pl-3">
 <li>• {t('globalDisclaimer.schemesBullet1', 'Scheme information is provided for general awareness only.')}</li>
 <li>• {t('globalDisclaimer.schemesBullet2', 'Eligibility criteria, interest rates, and benefits are subject to change by the government.')}</li>
 <li>• {t('globalDisclaimer.schemesBullet3', 'Always verify details on official government websites before applying.')}</li>
 </ul>

 {/* General */}
 <h3 className="text-sm font-semibold mt-3 mb-1" style={{ color: '#7C3AED' }}>
 {t('globalDisclaimer.generalTitle', 'General:')}
 </h3>
 <ul className="text-sm text-slate-300 leading-relaxed space-y-1 pl-3">
 <li>• {t('globalDisclaimer.generalBullet1', 'Nothing in this app constitutes financial, tax, investment, or legal advice.')}</li>
 <li>• {t('globalDisclaimer.generalBullet2', 'For professional guidance, consult a SEBI-registered advisor, certified financial planner, or chartered accountant.')}</li>
 <li>• {t('globalDisclaimer.generalBullet3', 'FinCalix and its developers are not liable for any financial decisions made using this app.')}</li>
 </ul>

 {/* Acknowledgment */}
 <p className="text-sm text-slate-200 font-semibold leading-relaxed mt-4">
 {t('globalDisclaimer.acknowledge', 'By continuing, you confirm that you have read, understood, and agreed to this disclaimer.')}
 </p>
 </div>

 {/* Accept Button */}
 <button
 onClick={handleAccept}
 className="w-full py-3 rounded-xl font-bold text-foreground text-sm mt-4 transition-all active:scale-[0.97]"
 style={{ backgroundColor: '#7C3AED' }}
 >
 {t('globalDisclaimer.button', 'I Understand, Continue')}
 </button>
 </div>
 </div>
 );
}
