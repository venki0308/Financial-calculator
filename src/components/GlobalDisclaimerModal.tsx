import { useState, useEffect, useRef } from 'react';

export default function GlobalDisclaimerModal() {
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
                        Welcome to FinCalix!
                    </h2>
                    <p className="text-slate-400 text-sm font-medium">Your Personal Finance Companion</p>
                </div>

                {/* Body */}
                <div 
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="overflow-y-auto p-6 space-y-6 flex-1 scroll-smooth pb-10"
                >
                    <p className="text-sm text-slate-300 font-medium leading-relaxed">
                        Before you continue, please read and accept our expanded terms.
                    </p>

                    <div className="space-y-5">
                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Calculators are Estimates</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">All tools (Home Loan, SIP, PPF, FD, Tax, etc.) provide mathematical estimates based on your inputs. They are for planning purposes only. Actual figures from your bank or government may vary.</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Expense Tracker Privacy</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">Your Expense Tracker data is stored locally on this device. We do not collect or monitor your spending habits. If you clear app data, your records are deleted.</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Government Schemes</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">Scheme details are for awareness only. Eligibility and benefits are subject to change. Always verify with official government portals before applying for any scheme.</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Financial Advisor & Goal Planner</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">Recommendations are algorithmically generated starting points. They do not replace professional, personalized financial advice from a certified planner.</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Loan & OD Tools</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">EMI and Overdraft calculations use standard reducing balance methods. Your lender's specific rounding rules or hidden charges (like processing and annual fees) will affect final amounts.</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Utility Tools</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">Tools like the Age Calculator and World Clock use system time. Ensure your device time is accurate for precise results.</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Data Privacy</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">We prioritize your privacy. Financial inputs in calculators are not transmitted to our servers.</p>
                        </section>

                        <section>
                            <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">General Note</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">Nothing in this app constitutes financial, tax, investment, or legal advice. FinCalix and its developers are not liable for any real-world financial decisions made using this app.</p>
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
                        {canAccept ? 'I Understand, Continue' : 'Please scroll down to read all terms'}
                    </button>
                </div>
            </div>
        </div>
    );
}
