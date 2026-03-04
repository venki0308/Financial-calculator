import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Bell, FileText, Star, Share2, Info, ChevronRight, Globe, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BottomSheet from '../components/BottomSheet';

const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
];

export default function Settings() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { darkMode, toggleDarkMode, notifications, setNotification } = useSettingsStore();
    const { clearAllData } = useAuthStore();
    const { clearHistory } = useCalculatorStore();
    const [showNotif, setShowNotif] = useState(false);
    const [showLangPicker, setShowLangPicker] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const currentLang = languages.find(l => i18n.language.startsWith(l.code)) || languages[0];

    const changeLanguage = (code: string) => {
        i18n.changeLanguage(code);
        localStorage.setItem('language', code);
        setShowLangPicker(false);
    };

    const handleClearData = () => {
        clearHistory();
        clearAllData();
        setShowClearConfirm(false);
    };

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in">
            <div className="px-4 pt-14 pb-8">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border"><ArrowLeft size={18} className="text-slate-400" /></button>
                    <h1 className="text-xl font-bold text-white">{t('settings.title')}</h1>
                </div>

                {/* Appearance */}
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">{t('settings.appearance')}</p>
                <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden mb-6">
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            {darkMode ? <Moon size={20} className="text-brand-purple" /> : <Sun size={20} className="text-amber-400" />}
                            <span className="text-white font-medium text-sm">{t('settings.darkMode')}</span>
                        </div>
                        <button onClick={toggleDarkMode} className={`w-12 h-7 rounded-full p-0.5 transition-colors ${darkMode ? 'bg-brand-purple' : 'bg-slate-600'}`}>
                            <motion.div layout className={`w-6 h-6 rounded-full bg-white shadow-md ${darkMode ? 'ml-auto' : 'ml-0'}`} />
                        </button>
                    </div>
                </div>

                {/* Language */}
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">{t('settings.language')}</p>
                <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden mb-6">
                    <button onClick={() => setShowLangPicker(true)} className="w-full flex items-center gap-4 p-4">
                        <Globe size={20} className="text-brand-blue" />
                        <div className="flex-1 text-left">
                            <p className="text-white font-medium text-sm">{t('settings.language')}</p>
                            <p className="text-slate-500 text-xs">{currentLang.nativeName}</p>
                        </div>
                        <ChevronRight size={16} className="text-slate-600" />
                    </button>
                </div>

                {/* Notifications */}
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">{t('settings.notifications')}</p>
                <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden mb-6">
                    <button onClick={() => setShowNotif(true)} className="w-full flex items-center gap-4 p-4">
                        <Bell size={20} className="text-brand-purple" />
                        <span className="text-white font-medium text-sm flex-1 text-left">{t('settings.notifications')}</span>
                        <ChevronRight size={16} className="text-slate-600" />
                    </button>
                </div>

                {/* About & Sharing */}
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">{t('settings.about')}</p>
                <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden mb-6">
                    <MenuItem icon={Info} label={t('settings.about')} color="#10B981" onClick={() => navigate('/about')} />
                    <div className="h-px bg-dark-border mx-4" />
                    <MenuItem icon={FileText} label={t('settings.privacy')} color="#3B82F6" onClick={() => navigate('/privacy-policy')} />
                    <div className="h-px bg-dark-border mx-4" />
                    <MenuItem icon={FileText} label={t('settings.terms')} color="#8B5CF6" onClick={() => navigate('/terms-of-service')} />
                    <div className="h-px bg-dark-border mx-4" />
                    <MenuItem icon={Star} label={t('settings.rateUs')} color="#F59E0B" onClick={() => window.open('https://play.google.com/store', '_blank')} />
                    <div className="h-px bg-dark-border mx-4" />
                    <MenuItem icon={Share2} label={t('settings.shareApp')} color="#EC4899" onClick={() => {
                        if (navigator.share) {
                            navigator.share({ title: 'FinCalix', text: "India's #1 Financial Planning App!", url: 'https://financial-calculator-bay.vercel.app' });
                        }
                    }} />
                </div>

                {/* Data Management */}
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">Data</p>
                <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden mb-6">
                    <button onClick={() => setShowClearConfirm(true)} className="w-full flex items-center gap-4 p-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <Trash2 size={20} className="text-red-400" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-red-400 font-medium text-sm">Clear All Data</p>
                            <p className="text-slate-600 text-xs">Remove history and reset app</p>
                        </div>
                        <ChevronRight size={16} className="text-slate-600" />
                    </button>
                </div>

                <div className="text-center py-4">
                    <p className="text-slate-600 text-xs">FinCalix v2.1.0 — Offline Edition</p>
                    <p className="text-slate-700 text-xs mt-1">All your data is stored locally on this device</p>
                </div>
            </div>

            {/* Language Picker Sheet */}
            <BottomSheet isOpen={showLangPicker} onClose={() => setShowLangPicker(false)} title={t('settings.selectLanguage')}>
                <div className="space-y-2">
                    {languages.map(lang => (
                        <button key={lang.code} onClick={() => changeLanguage(lang.code)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${i18n.language.startsWith(lang.code) ? 'bg-brand-green/10 border-2 border-brand-green' : 'bg-dark-bg border-2 border-transparent hover:bg-dark-card'}`}>
                            <div className="flex flex-col items-start">
                                <span className="text-white font-medium text-sm">{lang.nativeName}</span>
                                <span className="text-slate-500 text-xs">{lang.name}</span>
                            </div>
                            {i18n.language.startsWith(lang.code) && <Check size={18} className="text-brand-green" />}
                        </button>
                    ))}
                </div>
            </BottomSheet>

            {/* Notification Sheet */}
            <BottomSheet isOpen={showNotif} onClose={() => setShowNotif(false)} title={t('settings.notifications')}>
                <div className="space-y-3">
                    {([['priceAlerts', t('settings.priceAlerts')], ['newSchemes', t('settings.newSchemes')], ['calcReminders', t('settings.calcReminders')], ['appUpdates', t('settings.appUpdates')]] as const).map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-dark-bg">
                            <span className="text-white text-sm">{label}</span>
                            <button onClick={() => setNotification(key, !notifications[key])} className={`w-12 h-7 rounded-full p-0.5 transition-colors ${notifications[key] ? 'bg-brand-green' : 'bg-slate-600'}`}>
                                <motion.div layout className={`w-6 h-6 rounded-full bg-white shadow-md ${notifications[key] ? 'ml-auto' : 'ml-0'}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </BottomSheet>

            {/* Clear Data Confirm */}
            <AnimatePresence>
                {showClearConfirm && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-[100]" onClick={() => setShowClearConfirm(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                            <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl w-full max-w-sm shadow-2xl pointer-events-auto p-6">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center"><Trash2 size={32} className="text-red-500" /></div>
                                </div>
                                <h3 className="text-xl font-bold text-white text-center mb-2">Clear All Data?</h3>
                                <p className="text-slate-300 text-center text-sm mb-6">This will clear your calculation history and reset your profile. Your saved calculations in the app will remain.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-semibold text-sm border-2 border-slate-500">Cancel</button>
                                    <button onClick={handleClearData} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm border-2 border-red-500">Clear</button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

function MenuItem({ icon: Icon, label, color, onClick }: { icon: React.ElementType; label: string; color: string; onClick?: () => void }) {
    return (
        <button onClick={onClick} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-dark-card border border-dark-border">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}><Icon size={20} style={{ color }} /></div>
            <span className="text-white font-medium text-sm flex-1 text-left">{label}</span>
            <ChevronRight size={16} className="text-slate-600" />
        </button>
    );
}
