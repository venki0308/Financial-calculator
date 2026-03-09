import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, CheckCircle, Server, Mail, Smartphone, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const promises = [
    'We never sell your data',
    'We never share your data with advertisers',
    'We never store your financial figures on our servers',
    'We never require you to create an account',
    'All calculations happen locally on your device',
];

const dataSafetyTable = [
    { label: 'Data collected', value: 'App interactions (anonymized), Device ID (anonymized)' },
    { label: 'Data shared with third parties', value: 'Google Analytics (anonymized only)' },
    { label: 'Data encrypted in transit', value: 'Yes (HTTPS)' },
    { label: 'Can users request deletion', value: 'Not applicable (we hold no user data)' },
    { label: 'Data used to track users', value: 'No' },
];

export default function DataSafety() {
    const navigate = useNavigate();

    return (
        <div className="min-h-dvh bg-[#0F172A] pb-10" style={{ maxWidth: 428, margin: '0 auto' }}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-dark-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-white">Data & Privacy</h1>
                        <p className="text-slate-500 text-[10px]">Play Store Data Safety</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-6 space-y-5">
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600/15 to-teal-600/10 border border-emerald-500/20 text-center"
                >
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                        <Shield size={28} className="text-emerald-400" />
                    </div>
                    <h2 className="text-white font-bold text-base mb-1">Your Data Stays With You</h2>
                    <p className="text-slate-400 text-xs">FinCalix processes everything locally. Zero data on our servers.</p>
                </motion.div>

                {/* Section 1 — What We Collect */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center"><Eye size={14} className="text-blue-400" /></div>
                        <h3 className="text-white font-bold text-sm">What FinCalix Collects</h3>
                    </div>
                    <div className="pl-9 space-y-1.5 text-slate-400 text-xs leading-relaxed">
                        <p>FinCalix does <strong className="text-white">NOT</strong> collect any personal information.</p>
                        <p>No registration, no login, no account needed. Your name, email, and phone number are never asked or stored by us.</p>
                    </div>
                </motion.div>

                {/* Section 2 — Device Storage */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center"><Smartphone size={14} className="text-amber-400" /></div>
                        <h3 className="text-white font-bold text-sm">Stored on Your Device Only</h3>
                    </div>
                    <div className="pl-9 space-y-1.5 text-slate-400 text-xs leading-relaxed">
                        <p>Your calculation history is saved in your device's local storage.</p>
                        <p>This data <strong className="text-white">never leaves your phone or browser</strong>. We have no access to what you've calculated.</p>
                        <p>Clearing app data or uninstalling removes it completely.</p>
                    </div>
                </motion.div>

                {/* Section 3 — Analytics */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center"><BarChart3 size={14} className="text-purple-400" /></div>
                        <h3 className="text-white font-bold text-sm">Anonymous Usage Analytics</h3>
                    </div>
                    <div className="pl-9 space-y-1.5 text-slate-400 text-xs leading-relaxed">
                        <p>We use Google Analytics to understand which calculators are most useful.</p>
                        <p><strong className="text-slate-300">Data collected:</strong> which calculator was opened, session duration, device type.</p>
                        <p>This data is fully anonymized — <strong className="text-white">no personal identity is captured</strong>.</p>
                        <p>Your financial inputs (salary, EMI amounts etc.) are <strong className="text-white">never</strong> part of analytics.</p>
                    </div>
                </motion.div>

                {/* Section 4 — Our Promises */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center"><Lock size={14} className="text-emerald-400" /></div>
                        <h3 className="text-white font-bold text-sm">Our Promises</h3>
                    </div>
                    <div className="pl-9 space-y-2">
                        {promises.map((p, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.25 + i * 0.05 }}
                                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/15"
                            >
                                <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                                <span className="text-emerald-300/90 text-xs font-medium">{p}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Section 5 — Play Store Data Safety */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center"><Server size={14} className="text-indigo-400" /></div>
                        <h3 className="text-white font-bold text-sm">Google Play Data Safety Declaration</h3>
                    </div>
                    <div className="pl-9">
                        <div className="rounded-2xl bg-dark-card border border-dark-border overflow-hidden">
                            {dataSafetyTable.map((row, i) => (
                                <div key={i} className={`grid grid-cols-[110px_1fr] gap-2 p-3 text-[10px] ${i % 2 === 0 ? 'bg-dark-card' : 'bg-slate-800/30'}`}>
                                    <span className="text-slate-400 font-bold uppercase">{row.label}</span>
                                    <span className="text-white font-medium">{row.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Section 6 — Contact */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-pink-500/15 flex items-center justify-center"><Mail size={14} className="text-pink-400" /></div>
                        <h3 className="text-white font-bold text-sm">Contact</h3>
                    </div>
                    <div className="pl-9">
                        <a href="mailto:support@fincalix.com" className="flex items-center gap-2.5 p-3 rounded-xl bg-brand-purple/10 border border-brand-purple/20">
                            <Mail size={16} className="text-brand-purple" />
                            <span className="text-brand-purple font-bold text-xs">support@fincalix.com</span>
                        </a>
                    </div>
                </motion.div>

                {/* Privacy Policy Link */}
                <div className="pt-2">
                    <button
                        onClick={() => navigate('/privacy-policy')}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-dark-card border border-dark-border text-white font-bold text-xs"
                    >
                        <Shield size={16} className="text-brand-purple" />
                        Read Full Privacy Policy
                    </button>
                </div>

                {/* Footer */}
                <div className="pt-6 pb-4 border-t border-dark-border text-center space-y-2">
                    <p className="text-slate-500 text-[11px] font-semibold">FinCalix — Smart Financial Planning Tool</p>
                    <p className="text-slate-600 text-[10px]">Made with ❤️ in India</p>
                </div>
            </div>
        </div>
    );
}
