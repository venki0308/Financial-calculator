import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gavel } from 'lucide-react';

export default function TermsOfService() {
    const navigate = useNavigate();

    return (
        <div className="min-h-dvh bg-[#0F172A] pb-10 animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <h1 className="text-lg font-bold text-white">Terms of Service</h1>
                </div>
            </div>

            <div className="px-4 mt-6 text-slate-400 text-xs leading-relaxed space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-gold/5 border border-brand-gold/15">
                    <Gavel size={20} className="text-brand-gold" />
                    <p className="text-slate-200 font-bold">Usage Agreement</p>
                </div>

                <section>
                    <h2 className="text-white font-bold text-sm mb-2">1. For Reference Only</h2>
                    <p>The results provided by our calculators are estimates based on standard financial formulas and are for informational purposes only. Actual bank or government figures may vary.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold text-sm mb-2">2. Not Financial Advice</h2>
                    <p>This app does not provide professional financial, legal, or tax advice. Users are encouraged to consult with qualified professionals before making significant financial decisions.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold text-sm mb-2">3. Government Schemes</h2>
                    <p>While we provide details of government schemes, we are NOT an official government entity. Always verify details on official portals (e.g., .gov.in domains) as rules are subject to change.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold text-sm mb-2">4. Liability</h2>
                    <p>FinCalix shall not be liable for any financial losses or decisions made based on the data provided within this application.</p>
                </section>

                <section className="pt-6 border-t border-dark-border">
                    <p>By using this app, you agree to these terms. Last updated: Feb 2026.</p>
                </section>
            </div>
        </div>
    );
}
