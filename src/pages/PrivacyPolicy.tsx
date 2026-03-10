import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, EyeOff, Server, Users, FileText, Mail, Globe, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

function Section({ number, title, icon: Icon, children }: { number: number; title: string; icon: any; children: React.ReactNode }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: number * 0.04 }}
            className="space-y-2"
        >
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand-purple/15 flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-brand-purple" />
                </div>
                <h2 className="text-white font-bold text-sm">{number}. {title}</h2>
            </div>
            <div className="pl-9 space-y-2 text-slate-400 text-xs leading-relaxed">
                {children}
            </div>
        </motion.section>
    );
}

export default function PrivacyPolicy() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className="min-h-dvh bg-[#0F172A] pb-10" style={{ maxWidth: 428, margin: '0 auto' }}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-dark-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <h1 className="text-lg font-bold text-white">{t('privacyPolicy.title')}</h1>
                </div>
            </div>

            <div className="px-4 pt-6 space-y-6">
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-brand-purple/15 to-blue-600/10 border border-brand-purple/20 text-center"
                >
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand-purple/20 flex items-center justify-center">
                        <Shield size={28} className="text-brand-purple" />
                    </div>
                    <h2 className="text-white font-bold text-base mb-1">{t('privacyPolicy.heroTitle')}</h2>
                    <p className="text-slate-400 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: t('privacyPolicy.heroDesc') }}></p>
                    <p className="text-slate-500 text-[10px] mt-3 font-medium">{t('privacyPolicy.lastUpdated')}</p>
                </motion.div>

                {/* Section 1 */}
                <Section number={1} title={t('privacyPolicy.sec1Title')} icon={Eye}>
                    <p dangerouslySetInnerHTML={{ __html: t('privacyPolicy.sec1Desc') }}></p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>{t('privacyPolicy.sec1Li1')}</li>
                        <li>{t('privacyPolicy.sec1Li2')}</li>
                        <li>{t('privacyPolicy.sec1Li3')}</li>
                        <li>{t('privacyPolicy.sec1Li4')}</li>
                    </ul>
                    <p>{t('privacyPolicy.sec1End')}</p>
                </Section>

                {/* Section 2 */}
                <Section number={2} title={t('privacyPolicy.sec2Title')} icon={Smartphone}>
                    <p dangerouslySetInnerHTML={{ __html: t('privacyPolicy.sec2Desc') }}></p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li dangerouslySetInnerHTML={{ __html: t('privacyPolicy.sec2Li1') }}></li>
                        <li dangerouslySetInnerHTML={{ __html: t('privacyPolicy.sec2Li2') }}></li>
                        <li dangerouslySetInnerHTML={{ __html: t('privacyPolicy.sec2Li3') }}></li>
                        <li dangerouslySetInnerHTML={{ __html: t('privacyPolicy.sec2Li4') }}></li>
                    </ul>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mt-2">
                        <p className="text-emerald-400 text-[11px] font-semibold">{t('privacyPolicy.sec2BoxTitle')}</p>
                        <ul className="list-disc pl-4 text-emerald-300/80 text-[11px] mt-1 space-y-0.5">
                            <li>{t('privacyPolicy.sec2BoxLi1')}</li>
                            <li>{t('privacyPolicy.sec2BoxLi2')}</li>
                            <li>{t('privacyPolicy.sec2BoxLi3')}</li>
                        </ul>
                        <p className="text-emerald-400 text-[11px] font-semibold mt-1.5">{t('privacyPolicy.sec2BoxEnd')}</p>
                    </div>
                </Section>

                {/* Section 3 */}
                <Section number={3} title={t('privacyPolicy.sec3Title')} icon={EyeOff}>
                    <p dangerouslySetInnerHTML={{ __html: t('privacyPolicy.sec3Desc') }}></p>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <p className="text-blue-400 text-[10px] font-bold uppercase mb-1">{t('privacyPolicy.whatIsCollected')}</p>
                            <ul className="text-blue-300/70 text-[10px] space-y-0.5">
                                <li>{t('privacyPolicy.sec3IsLi1')}</li>
                                <li>{t('privacyPolicy.sec3IsLi2')}</li>
                                <li>{t('privacyPolicy.sec3IsLi3')}</li>
                                <li>{t('privacyPolicy.sec3IsLi4')}</li>
                                <li>{t('privacyPolicy.sec3IsLi5')}</li>
                            </ul>
                        </div>
                        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                            <p className="text-red-400 text-[10px] font-bold uppercase mb-1">{t('privacyPolicy.whatIsNotCollected')}</p>
                            <ul className="text-red-300/70 text-[10px] space-y-0.5">
                                <li>{t('privacyPolicy.sec3NotLi1')}</li>
                                <li>{t('privacyPolicy.sec3NotLi2')}</li>
                                <li>{t('privacyPolicy.sec3NotLi3')}</li>
                                <li>{t('privacyPolicy.sec3NotLi4')}</li>
                                <li>{t('privacyPolicy.sec3NotLi5')}</li>
                            </ul>
                        </div>
                    </div>
                    <p className="mt-1" dangerouslySetInnerHTML={{ __html: t('privacyPolicy.sec3End') }}></p>
                </Section>

                {/* Section 4 */}
                <Section number={4} title={t('privacyPolicy.sec4Title')} icon={Server}>
                    <p>{t('privacyPolicy.sec4Desc')}</p>
                    <div className="space-y-2 mt-1">
                        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                            <p className="text-white text-[11px] font-bold">{t('privacyPolicy.gaTitle')}</p>
                            <p className="text-slate-500 text-[10px]">{t('privacyPolicy.gaDesc')}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                            <p className="text-white text-[11px] font-bold">{t('privacyPolicy.vercelTitle')}</p>
                            <p className="text-slate-500 text-[10px]">{t('privacyPolicy.vercelDesc')}</p>
                        </div>
                    </div>
                    <p className="mt-1">{t('privacyPolicy.sec4End')}</p>
                </Section>

                {/* Section 5 */}
                <Section number={5} title={t('privacyPolicy.sec5Title')} icon={Lock}>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-amber-400 text-[11px] font-semibold">{t('privacyPolicy.sec5BoxTitle')}</p>
                        <ul className="list-disc pl-4 text-amber-300/80 text-[11px] mt-1 space-y-0.5">
                            <li dangerouslySetInnerHTML={{ __html: t('privacyPolicy.sec5Li1') }}></li>
                            <li dangerouslySetInnerHTML={{ __html: t('privacyPolicy.sec5Li2') }}></li>
                            <li>{t('privacyPolicy.sec5Li3')}</li>
                            <li>{t('privacyPolicy.sec5Li4')}</li>
                        </ul>
                    </div>
                </Section>

                {/* Section 6 */}
                <Section number={6} title={t('privacyPolicy.sec6Title')} icon={Users}>
                    <p dangerouslySetInnerHTML={{ __html: t('privacyPolicy.sec6P1') }}></p>
                    <p>{t('privacyPolicy.sec6P2')}</p>
                </Section>

                {/* Section 7 */}
                <Section number={7} title={t('privacyPolicy.sec7Title')} icon={Shield}>
                    <p dangerouslySetInnerHTML={{ __html: t('privacyPolicy.sec7Desc') }}></p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>{t('privacyPolicy.sec7Li1')}</li>
                        <li>{t('privacyPolicy.sec7Li2')}</li>
                        <li>{t('privacyPolicy.sec7Li3')}</li>
                    </ul>
                </Section>

                {/* Section 8 */}
                <Section number={8} title={t('privacyPolicy.sec8Title')} icon={FileText}>
                    <div className="space-y-2">
                        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                            <p className="text-white text-[11px] font-bold">{t('privacyPolicy.accessTitle')}</p>
                            <p className="text-slate-500 text-[10px]">{t('privacyPolicy.accessDesc')}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                            <p className="text-white text-[11px] font-bold">{t('privacyPolicy.deleteTitle')}</p>
                            <p className="text-slate-500 text-[10px]">{t('privacyPolicy.deleteDesc')}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                            <p className="text-white text-[11px] font-bold">{t('privacyPolicy.portabilityTitle')}</p>
                            <p className="text-slate-500 text-[10px]">{t('privacyPolicy.portabilityDesc')}</p>
                        </div>
                    </div>
                </Section>

                {/* Section 9 */}
                <Section number={9} title={t('privacyPolicy.sec9Title')} icon={FileText}>
                    <p>{t('privacyPolicy.sec9P1')}</p>
                    <p>{t('privacyPolicy.sec9P2')}</p>
                </Section>

                {/* Section 10 */}
                <Section number={10} title={t('privacyPolicy.sec10Title')} icon={Mail}>
                    <p>{t('privacyPolicy.sec10Desc')}</p>
                    <div className="space-y-2 mt-1">
                        <a href="mailto:support@fincalix.com" className="flex items-center gap-2.5 p-3 rounded-xl bg-brand-purple/10 border border-brand-purple/20">
                            <Mail size={16} className="text-brand-purple" />
                            <span className="text-brand-purple font-bold text-xs">support@fincalix.com</span>
                        </a>
                        <a href="https://www.fincalix.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <Globe size={16} className="text-blue-400" />
                            <span className="text-blue-400 font-bold text-xs">www.fincalix.com</span>
                        </a>
                    </div>
                </Section>

                {/* Data & Privacy Link */}
                <div className="pt-2">
                    <button
                        onClick={() => navigate('/data-safety')}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-dark-card border border-dark-border text-white font-bold text-xs"
                    >
                        <Shield size={16} className="text-brand-green" />
                        {t('privacyPolicy.viewDataSafety')}
                    </button>
                </div>

                {/* Footer */}
                <div className="pt-6 pb-4 border-t border-dark-border text-center space-y-2">
                    <p className="text-slate-500 text-[11px] font-semibold">{t('privacyPolicy.footerTitle')}</p>
                    <p className="text-slate-600 text-[10px]">{t('privacyPolicy.footerMade')}</p>
                    <p className="text-slate-600 text-[10px]">&copy; {new Date().getFullYear()} FinCalix. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
