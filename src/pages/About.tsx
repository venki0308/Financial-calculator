import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, ShieldCheck, FileText, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function About() {
    const navigate = useNavigate();

    const infoCards = [
        {
            icon: Info,
            title: 'Reference Tool',
            description: 'This application is designed as a companion tool for Indian citizens to explore government schemes and perform financial projections.',
            accent: '#3B82F6', // blue
            bgTint: 'rgba(59,130,246,0.08)',
            borderTint: 'rgba(59,130,246,0.18)',
        },
        {
            icon: ShieldCheck,
            title: 'Data Accuracy',
            description: 'We strive to provide the most accurate and up-to-date information for 2026. However, interest rates and scheme rules change frequently.',
            accent: '#22C55E', // green
            bgTint: 'rgba(34,197,94,0.08)',
            borderTint: 'rgba(34,197,94,0.18)',
        },
        {
            icon: FileText,
            title: 'Official Sources',
            description: 'All calculations and scheme details are based on publicly available data from official portals like india.gov.in, npsc.gov.in, etc.',
            accent: '#F59E0B', // amber
            bgTint: 'rgba(245,158,11,0.08)',
            borderTint: 'rgba(245,158,11,0.18)',
        },
    ];

    const resources = [
        { label: 'National Portal of India', url: 'https://www.india.gov.in', dot: '#3B82F6' },
        { label: 'Income Tax Department', url: 'https://www.incometax.gov.in', dot: '#22C55E' },
        { label: 'RBI Official Website', url: 'https://www.rbi.org.in', dot: '#F59E0B' },
    ];

    return (
        <div className="min-h-dvh bg-[#0F172A] pb-10 flex flex-col items-center animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            {/* ─── Header ─── */}
            <div className="sticky top-0 z-10 w-full bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <h1 className="text-lg font-bold text-white">About the App</h1>
                </div>
            </div>

            <div className="px-5 mt-6 space-y-7 w-full">
                {/* ─── Hero Section ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative p-8 rounded-3xl bg-dark-card border border-dark-border text-center overflow-hidden"
                >
                    {/* Green glow behind the logo */}
                    <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.25) 0%, transparent 70%)' }}
                    />
                    <img
                        src="/icons/fincalix-logo.jpg"
                        alt="FinCalix"
                        className="relative w-24 h-24 rounded-3xl mx-auto mb-5 shadow-lg ring-2 ring-green-500/30"
                    />
                    <h2 className="relative text-2xl font-extrabold text-white tracking-tight">FinCalix</h2>
                    {/* Version badge with pulsing dot */}
                    <div className="relative inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                        <span className="text-xs text-slate-300 font-medium">v1.0.0</span>
                    </div>
                </motion.div>

                {/* ─── Info Cards ─── */}
                <div className="space-y-4">
                    {infoCards.map((card, idx) => (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.15 * idx }}
                            className="flex gap-4 p-4 rounded-2xl bg-dark-card border border-dark-border overflow-hidden"
                            style={{ borderLeftWidth: 4, borderLeftColor: card.accent }}
                        >
                            <div
                                className="p-3 rounded-xl flex-shrink-0 self-start"
                                style={{ background: card.bgTint, border: `1px solid ${card.borderTint}` }}
                            >
                                <card.icon size={20} style={{ color: card.accent }} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">{card.title}</h3>
                                <p className="text-slate-400 text-xs leading-relaxed mt-1">{card.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ─── Key Resources ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                    className="p-5 rounded-2xl bg-dark-card border border-dark-border"
                >
                    <h3 className="text-white font-bold text-sm mb-4">Key Resources</h3>
                    <div className="space-y-2.5">
                        {resources.map((res) => (
                            <a
                                key={res.url}
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3.5 rounded-xl bg-[#0F172A] border border-dark-border group hover:border-slate-600 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="block w-2 h-2 rounded-full flex-shrink-0" style={{ background: res.dot }} />
                                    <span className="text-xs text-slate-300 font-medium group-hover:text-white transition-colors">{res.label}</span>
                                </div>
                                <ExternalLink size={14} className="text-slate-600 group-hover:text-brand-green transition-colors" />
                            </a>
                        ))}
                    </div>
                </motion.div>

                {/* ─── Footer ─── */}
                <div className="text-center pt-8 pb-4 text-[10px] text-slate-600 space-y-1">
                    <p>© 2026 FinCalix</p>
                    <p>Made with ❤️ in India</p>
                </div>
            </div>
        </div>
    );
}
