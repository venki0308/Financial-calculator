import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, ShieldCheck, FileText, ExternalLink } from 'lucide-react';

export default function About() {
    const navigate = useNavigate();

    return (
        <div className="min-h-dvh bg-[#0F172A] pb-10 flex flex-col items-center animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 w-full bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <h1 className="text-lg font-bold text-white">About the App</h1>
                </div>
            </div>

            <div className="px-4 mt-6 space-y-6 w-full">
                <div className="p-6 rounded-3xl bg-dark-card border border-dark-border text-center">
                    <img src="/icons/fincalix-logo.jpg" alt="FinCalix" className="w-20 h-20 rounded-3xl mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white">FinCalix</h2>
                    <p className="text-slate-500 text-xs mt-1">Version 2.0.26 (Beta)</p>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="p-3 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex-shrink-0">
                            <Info size={20} className="text-brand-blue" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">Reference Tool</h3>
                            <p className="text-slate-400 text-xs leading-relaxed mt-1">
                                This application is designed as a companion tool for Indian citizens to explore government schemes and perform financial projections.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="p-3 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex-shrink-0">
                            <ShieldCheck size={20} className="text-brand-purple" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">Data Accuracy</h3>
                            <p className="text-slate-400 text-xs leading-relaxed mt-1">
                                We strive to provide the most accurate and up-to-date information for 2026. However, interest rates and scheme rules change frequently.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex-shrink-0">
                            <FileText size={20} className="text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">Official Sources</h3>
                            <p className="text-slate-400 text-xs leading-relaxed mt-1">
                                All calculations and scheme details are based on publicly available data from official portals like india.gov.in, npsc.gov.in, etc.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-dark-card border border-dark-border">
                    <h3 className="text-white font-bold text-sm mb-3">Key Resources</h3>
                    <div className="space-y-3">
                        <a href="https://www.india.gov.in" target="_blank" className="flex items-center justify-between p-3 rounded-xl bg-[#0F172A] border border-dark-border group">
                            <span className="text-xs text-slate-300">National Portal of India</span>
                            <ExternalLink size={14} className="text-slate-500 group-hover:text-brand-green" />
                        </a>
                        <a href="https://www.incometax.gov.in" target="_blank" className="flex items-center justify-between p-3 rounded-xl bg-[#0F172A] border border-dark-border group">
                            <span className="text-xs text-slate-300">Income Tax Department</span>
                            <ExternalLink size={14} className="text-slate-500 group-hover:text-brand-green" />
                        </a>
                    </div>
                </div>

                <div className="text-center pt-10 text-[10px] text-slate-600 space-y-1">
                    <p>© 2026 FinCalix</p>
                    <p>Designed with ❤️ for Indian Citizens</p>
                </div>
            </div>
        </div>
    );
}
