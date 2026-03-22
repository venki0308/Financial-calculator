import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Bell, FileText, Star, Share2, Info, ChevronRight, Globe, Check, Trash2, ActivitySquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BottomSheet from '../components/BottomSheet';
import { AnalyticsService } from '../lib/analytics';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';


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
    const [crashReporting, setCrashReporting] = useState<boolean>(() => {
        const stored = localStorage.getItem('crashlytics_enabled');
        return stored === null ? true : stored === 'true';
    });

    const toggleCrashReporting = () => {
        const next = !crashReporting;
        setCrashReporting(next);
        localStorage.setItem('crashlytics_enabled', String(next));
    };

    const currentLang = languages.find(l => i18n.language.startsWith(l.code)) || languages[0];

    useEffect(() => { AnalyticsService.trackScreen('Settings'); }, []);

    const changeLanguage = (code: string) => {
        i18n.changeLanguage(code);
        localStorage.setItem('language', code);
        AnalyticsService.trackLanguageChanged(code);
        setShowLangPicker(false);
    };

    const handleClearData = () => {
        // Wipe ALL persisted Zustand stores for a true fresh-install reset
        const storeKeys = [
            'local-user-storage',
            'calculator-storage',
            'budget-tracker-storage',
            'fincalix-expenses',
            'scheme-storage',
            'settings-storage',
            'language',
        ];
        storeKeys.forEach((key) => localStorage.removeItem(key));
        setShowClearConfirm(false);
        // Reload the page to reset all in-memory state
        window.location.reload();
    };

    return (
        <div className="min-h-dvh bg-background animate-fade-in">
            <div className="px-4 pt-14 pb-8">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border"><ArrowLeft size={18} className="text-muted-foreground" /></button>
                    <h1 className="text-xl font-bold text-foreground">{t('settings.title')}</h1>
                </div>

                {/* Appearance */}
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-3">{t('settings.appearance')}</p>
                <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            {darkMode ? <Moon size={20} className="text-brand-purple" /> : <Sun size={20} className="text-amber-400" />}
                            <span className="text-foreground font-medium text-sm">{t('settings.darkMode')}</span>
                        </div>
                        <button onClick={toggleDarkMode} className={`w-12 h-7 rounded-full p-0.5 transition-colors ${darkMode ? 'bg-brand-purple' : 'bg-slate-600'}`}>
                            <motion.div layout className={`w-6 h-6 rounded-full bg-white shadow-md ${darkMode ? 'ml-auto' : 'ml-0'}`} />
                        </button>
                    </div>
                </div>

                {/* Language */}
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-3">{t('settings.language')}</p>
                <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
                    <button onClick={() => setShowLangPicker(true)} className="w-full flex items-center gap-4 p-4">
                        <Globe size={20} className="text-brand-blue" />
                        <div className="flex-1 text-left">
                            <p className="text-foreground font-medium text-sm">{t('settings.language')}</p>
                            <p className="text-muted-foreground text-xs">{currentLang.nativeName}</p>
                        </div>
                        <ChevronRight size={16} className="text-slate-600" />
                    </button>
                </div>

                {/* Notifications */}
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-3">{t('settings.notifications')}</p>
                <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
                    <button onClick={() => setShowNotif(true)} className="w-full flex items-center gap-4 p-4">
                        <Bell size={20} className="text-brand-purple" />
                        <span className="text-foreground font-medium text-sm flex-1 text-left">{t('settings.notifications')}</span>
                        <ChevronRight size={16} className="text-slate-600" />
                    </button>
                </div>

                {/* Privacy & Crash Reporting */}
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-3">Privacy</p>
                <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            <ActivitySquare size={20} className="text-blue-400" />
                            <div>
                                <p className="text-foreground font-medium text-sm">Crash Reporting</p>
                                <p className="text-muted-foreground text-[11px]">Anonymous diagnostics to improve stability</p>
                            </div>
                        </div>
                        <button onClick={toggleCrashReporting} className={`w-12 h-7 rounded-full p-0.5 transition-colors ${crashReporting ? 'bg-brand-purple' : 'bg-slate-600'}`}>
                            <motion.div layout className={`w-6 h-6 rounded-full bg-white shadow-md ${crashReporting ? 'ml-auto' : 'ml-0'}`} />
                        </button>
                    </div>
                </div>

                {/* About & Sharing */}
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-3">{t('settings.about')}</p>
                <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
                    <MenuItem icon={Info} label={t('settings.about')} color="#10B981" onClick={() => navigate('/about')} />
                    <div className="h-px bg-dark-border mx-4" />
                    <MenuItem icon={FileText} label={t('settings.privacyPolicy')} color="#3B82F6" onClick={() => navigate('/privacy-policy')} />
                    <div className="h-px bg-dark-border mx-4" />
                    <MenuItem icon={FileText} label="Data & Privacy" color="#10B981" onClick={() => navigate('/data-safety')} />
                    <div className="h-px bg-dark-border mx-4" />
                    <MenuItem icon={FileText} label={t('settings.termsOfService')} color="#8B5CF6" onClick={() => navigate('/terms-of-service')} />
                    <div className="h-px bg-dark-border mx-4" />
                    <MenuItem icon={Star} label={t('settings.rateApp')} color="#F59E0B" onClick={() => {
                        const packageId = 'com.fincalix.app';
                        if (Capacitor.isNativePlatform()) {
                            // On Android, use market:// intent for direct Play Store launch
                            window.open(`market://details?id=${packageId}`, '_system');
                        } else {
                            window.open(`https://play.google.com/store/apps/details?id=${packageId}`, '_blank');
                        }
                    }} />
                    <div className="h-px bg-dark-border mx-4" />
                    <MenuItem icon={Share2} label={t('settings.shareApp')} color="#EC4899" onClick={async () => {
                        const shareData = {
                            title: 'FinCalix – Financial Calculator App',
                            text: "India's #1 Financial Planning App! Calculate FD, SIP, EMI, GST, Taxes & more. Download free on Play Store!",
                            url: 'https://play.google.com/store/apps/details?id=com.fincalix.app',
                        };

                        try {
                            let shared = false;

                            // 1. Try Capacitor Share (Native)
                            if (Capacitor.isNativePlatform()) {
                                try {
                                    const { Share } = await import('@capacitor/share');
                                    const can = await Share.canShare();
                                    if (can.value) {
                                        await Share.share({
                                            title: shareData.title,
                                            text: shareData.text + '\n' + shareData.url,
                                            dialogTitle: 'Share FinCalix'
                                        });
                                        shared = true;
                                    }
                                } catch (e) {
                                    console.error('Capacitor share failed:', e);
                                }
                            }

                            // 2. Try Web Share API (Mobile Browsers / Modern Desktop)
                            if (!shared && navigator.share) {
                                try {
                                    await navigator.share(shareData);
                                    shared = true;
                                } catch (e) {
                                    console.error('Web share failed:', e);
                                }
                            }

                            // 3. Fallback to Clipboard
                            if (!shared) {
                                await navigator.clipboard.writeText(shareData.url);
                                alert('App link copied to clipboard!');
                            }
                        } catch (err) {
                            console.error('Share operation failed:', err);
                        }
                    }} />
                </div>

                {/* Data Management */}
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-3">Data</p>
                <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
                    <button onClick={() => setShowClearConfirm(true)} className="w-full flex items-center gap-4 p-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <Trash2 size={20} className="text-red-400" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-red-400 font-medium text-sm">Clear All Data</p>
                            <p className="text-slate-600 text-xs">Reset app to fresh install state</p>
                        </div>
                        <ChevronRight size={16} className="text-slate-600" />
                    </button>
                </div>

                <div className="text-center pb-8 mt-2 animate-fade-in delay-500">
                    <p className="text-slate-600 text-xs text-brand-blue/80 dark:text-cyan-400 font-bold mb-1">FinCalix v1.0.1</p>
                    <p className="text-slate-400 text-[10px]">All your data is stored locally on this device</p>
                </div>
            </div>

            {/* Language Picker Sheet */}
            <BottomSheet isOpen={showLangPicker} onClose={() => setShowLangPicker(false)} title={t('settings.selectLanguage')}>
                <div className="space-y-2">
                    {languages.map(lang => (
                        <button key={lang.code} onClick={() => changeLanguage(lang.code)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${i18n.language.startsWith(lang.code) ? 'bg-brand-green/10 border-2 border-brand-green' : 'bg-dark-bg border-2 border-transparent hover:bg-card'}`}>
                            <div className="flex flex-col items-start">
                                <span className="text-foreground font-medium text-sm">{lang.nativeName}</span>
                                <span className="text-muted-foreground text-xs">{lang.name}</span>
                            </div>
                            {i18n.language.startsWith(lang.code) && <Check size={18} className="text-brand-green" />}
                        </button>
                    ))}
                </div>
            </BottomSheet>

            {/* Notification Sheet */}
            <BottomSheet isOpen={showNotif} onClose={() => setShowNotif(false)} title={t('settings.notifications')}>
                <div className="space-y-3">
                    {([['dailyQuotes', 'Daily Financial Quotes'], ['newSchemes', t('settings.newSchemes')], ['calcReminders', t('settings.calcReminders')], ['appUpdates', t('settings.appUpdates')]] as const).map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-muted">
                            <span className="text-foreground text-sm">{label}</span>
                            <button onClick={async () => {
                                const nextVal = !notifications[key];
                                setNotification(key, nextVal);
                                if (key === 'dailyQuotes' && nextVal) {
                                    if (Capacitor.isNativePlatform()) {
                                        await LocalNotifications.requestPermissions();
                                    } else if ('Notification' in window) {
                                        await Notification.requestPermission();
                                    }
                                }
                            }} className={`w-12 h-7 rounded-full p-0.5 transition-colors ${notifications[key] ? 'bg-brand-green' : 'bg-slate-600'}`}>
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
                            <div className="bg-card border-border border-2 border-slate-600 rounded-2xl w-full max-w-sm shadow-2xl pointer-events-auto p-6">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center"><Trash2 size={32} className="text-red-500" /></div>
                                </div>
                                <h3 className="text-xl font-bold text-foreground text-center mb-2">Clear All Data?</h3>
                                <p className="text-slate-300 text-center text-sm mb-6">This will erase ALL data — bookmarks, saved calculations, expense entries, budgets, and settings. The app will restart like a fresh installation.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 rounded-xl bg-slate-700 text-foreground font-semibold text-sm border-2 border-slate-500">Cancel</button>
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
        <button onClick={onClick} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}><Icon size={20} style={{ color }} /></div>
            <span className="text-foreground font-medium text-sm flex-1 text-left">{label}</span>
            <ChevronRight size={16} className="text-slate-600" />
        </button>
    );
}
