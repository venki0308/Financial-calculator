import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicy() {
    const navigate = useNavigate();

    return (
        <div className="min-h-dvh bg-[#0F172A] pb-10 animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <h1 className="text-lg font-bold text-white">Privacy Policy</h1>
                </div>
            </div>

            <div className="px-4 mt-6 text-slate-400 text-xs leading-relaxed space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-blue/5 border border-brand-blue/15">
                    <Shield size={20} className="text-brand-blue" />
                    <p className="text-slate-200 font-bold">Your privacy is our priority.</p>
                </div>

                <section>
                    <h2 className="text-white font-bold text-sm mb-2">1. Information Collection</h2>
                    <p>FinCalix does not sell or share your personal data with third parties. We collect minimal information required for authentication and history tracking.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold text-sm mb-2">2. Local Storage</h2>
                    <p>Your calculation history and recently used tools are stored locally on your device (LocalStorage) and are never synced to our servers without your explicit action (like bookmarking).</p>
                </section>

                <section>
                    <h2 className="text-white font-bold text-sm mb-2">3. Third-Party Services</h2>
                    <p>We use Firebase for secure authentication. Please refer to Google's Privacy Policy regarding their data handling during the login process.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold text-sm mb-2">4. Calculation Data</h2>
                    <p>The numbers you input for calculations (EMI, SIP, Tax, etc.) are processed locally on your device. We do not store your specific financial figures on our servers.</p>
                </section>

                <section className="pt-6 border-t border-dark-border">
                    <p>Last Updated: February 2026</p>
                </section>
            </div>
        </div>
    );
}
