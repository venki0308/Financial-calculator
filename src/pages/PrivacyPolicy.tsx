import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, EyeOff, Server, Users, FileText, Mail, Globe, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

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

    return (
        <div className="min-h-dvh bg-[#0F172A] pb-10" style={{ maxWidth: 428, margin: '0 auto' }}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-dark-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <h1 className="text-lg font-bold text-white">Privacy Policy</h1>
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
                    <h2 className="text-white font-bold text-base mb-1">Your Privacy Matters</h2>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        FinCalix collects <span className="text-brand-green font-bold">zero personal data</span>. No backend, no database, no server-side storage. Everything stays on your device.
                    </p>
                    <p className="text-slate-500 text-[10px] mt-3 font-medium">Last Updated: March 2026</p>
                </motion.div>

                {/* Section 1 */}
                <Section number={1} title="Information We Collect" icon={Eye}>
                    <p>FinCalix does <strong className="text-white">NOT</strong> collect any personal information whatsoever.</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>No name, email address, phone number, or postal address is collected</li>
                        <li>No financial data (salary, investments, EMI amounts) is collected</li>
                        <li>No account creation or login is required to use the app</li>
                        <li>No user profiles are created or stored</li>
                    </ul>
                    <p>You can open the app and start calculating instantly — we never ask for any personal details.</p>
                </Section>

                {/* Section 2 */}
                <Section number={2} title="Data Stored on Your Device" icon={Smartphone}>
                    <p>FinCalix stores the following data <strong className="text-white">locally on your device only</strong> using your browser's LocalStorage:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li><strong className="text-slate-300">Calculation inputs</strong> — Numbers you enter in calculators</li>
                        <li><strong className="text-slate-300">Recently used calculators</strong> — For quick access on the home screen</li>
                        <li><strong className="text-slate-300">Saved calculations</strong> — When you manually save a result</li>
                        <li><strong className="text-slate-300">App preferences</strong> — Theme (dark/light), language choice</li>
                    </ul>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mt-2">
                        <p className="text-emerald-400 text-[11px] font-semibold">🔒 This data stays on your device permanently until you:</p>
                        <ul className="list-disc pl-4 text-emerald-300/80 text-[11px] mt-1 space-y-0.5">
                            <li>Clear the app data from your device settings</li>
                            <li>Uninstall the app</li>
                            <li>Clear browser data (on web version)</li>
                        </ul>
                        <p className="text-emerald-400 text-[11px] font-semibold mt-1.5">We have absolutely zero access to this data. It never leaves your device and is never synced to any server.</p>
                    </div>
                </Section>

                {/* Section 3 */}
                <Section number={3} title="Analytics" icon={EyeOff}>
                    <p>We use <strong className="text-slate-300">Google Analytics</strong> to collect fully anonymized usage data to improve the app experience.</p>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <p className="text-blue-400 text-[10px] font-bold uppercase mb-1">What IS collected</p>
                            <ul className="text-blue-300/70 text-[10px] space-y-0.5">
                                <li>• Which calculator was used</li>
                                <li>• Session duration</li>
                                <li>• Device type</li>
                                <li>• App version</li>
                                <li>• Country</li>
                            </ul>
                        </div>
                        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                            <p className="text-red-400 text-[10px] font-bold uppercase mb-1">What is NOT collected</p>
                            <ul className="text-red-300/70 text-[10px] space-y-0.5">
                                <li>• Your calculation inputs</li>
                                <li>• Financial figures</li>
                                <li>• Personal identity</li>
                                <li>• Name or email</li>
                                <li>• Browsing history</li>
                            </ul>
                        </div>
                    </div>
                    <p className="mt-1">All analytics data is fully anonymized and <strong className="text-white">cannot be traced to any individual</strong>. No personal information is part of analytics.</p>
                </Section>

                {/* Section 4 */}
                <Section number={4} title="Third-Party Services" icon={Server}>
                    <p>FinCalix uses only the following third-party services:</p>
                    <div className="space-y-2 mt-1">
                        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                            <p className="text-white text-[11px] font-bold">Google Analytics</p>
                            <p className="text-slate-500 text-[10px]">Anonymized usage statistics only. No personal data is transmitted.</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                            <p className="text-white text-[11px] font-bold">Vercel (Web Hosting)</p>
                            <p className="text-slate-500 text-[10px]">Hosts the web app files. No user data is transmitted to Vercel servers.</p>
                        </div>
                    </div>
                    <p className="mt-1">No other third-party services, advertising networks, or tracking tools are used.</p>
                </Section>

                {/* Section 5 */}
                <Section number={5} title="Your Financial Data" icon={Lock}>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-amber-400 text-[11px] font-semibold">💰 Your financial data is 100% safe</p>
                        <ul className="list-disc pl-4 text-amber-300/80 text-[11px] mt-1 space-y-0.5">
                            <li>All numbers you enter (salary, EMI, tax inputs, SIP amounts, etc.) are processed <strong>entirely on your device</strong></li>
                            <li>We <strong>never</strong> see, store, or transmit your financial figures</li>
                            <li>All calculations happen in your browser/app — not on any server</li>
                            <li>There is no backend or API that receives your data</li>
                        </ul>
                    </div>
                </Section>

                {/* Section 6 */}
                <Section number={6} title="Children's Privacy" icon={Users}>
                    <p>FinCalix is designed for users <strong className="text-white">18 years of age and above</strong>. The app contains financial calculators intended for adult use (tax planning, loan EMI, investment returns, etc.).</p>
                    <p>We do not knowingly collect data from anyone under 18 years of age. Since we collect no personal data at all, there is no risk of children's data being stored.</p>
                </Section>

                {/* Section 7 */}
                <Section number={7} title="Data Security" icon={Shield}>
                    <p>Since FinCalix stores <strong className="text-white">nothing on any server</strong>, there is no server-side data breach risk.</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Your data security equals your device security</li>
                        <li>All web traffic uses HTTPS encryption</li>
                        <li>We recommend using a device lock screen (PIN, fingerprint, face unlock) to protect your locally stored data</li>
                    </ul>
                </Section>

                {/* Section 8 */}
                <Section number={8} title="Your Rights" icon={FileText}>
                    <div className="space-y-2">
                        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                            <p className="text-white text-[11px] font-bold">Access</p>
                            <p className="text-slate-500 text-[10px]">All your data is visible directly in the app (Saved Calculations, History, Preferences).</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                            <p className="text-white text-[11px] font-bold">Delete</p>
                            <p className="text-slate-500 text-[10px]">Clear app data from your device settings, or simply uninstall the app. All data is removed instantly.</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                            <p className="text-white text-[11px] font-bold">Portability</p>
                            <p className="text-slate-500 text-[10px]">We cannot delete data on your behalf because we never had it. You have full control.</p>
                        </div>
                    </div>
                </Section>

                {/* Section 9 */}
                <Section number={9} title="Changes to This Policy" icon={FileText}>
                    <p>We may update this Privacy Policy from time to time. When we do, we will update the "Last Updated" date at the top of this page.</p>
                    <p>Continued use of FinCalix after changes to this policy constitutes acceptance of the updated terms. We encourage you to review this page periodically.</p>
                </Section>

                {/* Section 10 */}
                <Section number={10} title="Contact Us" icon={Mail}>
                    <p>If you have any questions or concerns about this Privacy Policy, feel free to reach out:</p>
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
                        View Data & Privacy (Play Store Data Safety)
                    </button>
                </div>

                {/* Footer */}
                <div className="pt-6 pb-4 border-t border-dark-border text-center space-y-2">
                    <p className="text-slate-500 text-[11px] font-semibold">FinCalix — Smart Financial Planning Tool</p>
                    <p className="text-slate-600 text-[10px]">Made with ❤️ in India</p>
                    <p className="text-slate-600 text-[10px]">© {new Date().getFullYear()} FinCalix. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
