import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Bell, Shield, FileText, Star, Share2, Info, LogOut, ChevronRight, Globe, Check, Lock, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
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
    const logout = useAuthStore((s) => s.logout);
    const { darkMode, toggleDarkMode, notifications, setNotification } = useSettingsStore();
    const [showNotif, setShowNotif] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showLangPicker, setShowLangPicker] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwdMsg, setPwdMsg] = useState('');
    const [pwdSuccess, setPwdSuccess] = useState(false);
    const user = useAuthStore((s) => s.user);
    const changePassword = useAuthStore((s) => s.changePassword);

    const handleLogout = () => { logout(); navigate('/login'); };
    const currentLang = languages.find(l => i18n.language.startsWith(l.code)) || languages[0];

    const changeLanguage = (code: string) => {
        i18n.changeLanguage(code);
        localStorage.setItem('language', code);
        setShowLangPicker(false);
    };

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in">
            <div className="px-4 pt-14 pb-8">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border"><ArrowLeft size={18} className="text-slate-400" /></button>
                    <h1 className="text-xl font-bold text-white">{t('settings.title')}</h1>
                </div>

                <div className="space-y-2.5">
                    {/* Dark Mode */}
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-dark-card border border-dark-border">
                        <div className="w-10 h-10 rounded-xl bg-brand-purple/15 flex items-center justify-center">
                            {darkMode ? <Moon size={20} className="text-brand-purple" /> : <Sun size={20} className="text-brand-gold" />}
                        </div>
                        <span className="text-white font-medium text-sm flex-1">{t('settings.darkMode')}</span>
                        <button onClick={toggleDarkMode} className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-200 ${darkMode ? 'bg-brand-green' : 'bg-slate-600'}`}>
                            <motion.div layout className={`w-6 h-6 rounded-full bg-white shadow-md ${darkMode ? 'ml-auto' : 'ml-0'}`} />
                        </button>
                    </div>

                    {/* Language Selector */}
                    <button onClick={() => setShowLangPicker(true)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-dark-card border border-dark-border">
                        <div className="w-10 h-10 rounded-xl bg-brand-blue/15 flex items-center justify-center"><Globe size={20} className="text-brand-blue" /></div>
                        <div className="flex-1 text-left">
                            <span className="text-white font-medium text-sm block">{t('settings.language')}</span>
                            <span className="text-slate-500 text-xs">{currentLang.nativeName}</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-600" />
                    </button>

                    {/* Notification Settings */}
                    <MenuItem icon={Bell} label={t('settings.notifications')} color="#F59E0B" onClick={() => setShowNotif(true)} />
                    <MenuItem icon={Key} label="Change Password" color="#EF4444" onClick={() => { setShowChangePassword(true); setPwdMsg(''); setPwdSuccess(false); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }} />
                    <MenuItem icon={Shield} label={t('settings.privacyPolicy')} color="#10B981" onClick={() => navigate('/privacy-policy')} />
                    <MenuItem icon={FileText} label={t('settings.termsOfService')} color="#3B82F6" onClick={() => navigate('/terms-of-service')} />
                    <MenuItem icon={Star} label={t('settings.rateApp')} color="#F59E0B" />
                    <MenuItem icon={Share2} label={t('settings.shareApp')} color="#8B5CF6" onClick={() => {
                        if (navigator.share) {
                            navigator.share({
                                title: 'FinCalix',
                                text: 'Check out FinCalix - a comprehensive financial calculator and schemes app!',
                                url: window.location.origin
                            });
                        }
                    }} />
                    <MenuItem icon={Info} label={t('settings.about')} color="#6B7280" onClick={() => navigate('/about')} />
                </div>

                {/* Logout */}
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowLogoutConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 mt-6 p-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-sm shadow-lg shadow-red-900/30">
                    <LogOut size={18} />{t('settings.logout')}
                </motion.button>
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

            {/* Logout Confirm */}
            <AnimatePresence>
                {showLogoutConfirm && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-[100]" onClick={() => setShowLogoutConfirm(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                            <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl w-full max-w-sm shadow-2xl pointer-events-auto p-6">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center"><LogOut size={32} className="text-red-500" /></div>
                                </div>
                                <h3 className="text-2xl font-bold text-white text-center mb-2">{t('settings.confirmLogout')}</h3>
                                <p className="text-slate-300 text-center text-sm mb-6">{t('settings.logoutMessage')}</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm border-2 border-slate-500 transition-colors">{t('common.cancel')}</button>
                                    <button onClick={handleLogout} className="flex-1 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm border-2 border-red-500 transition-colors">{t('settings.logout')}</button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Change Password Sheet */}
            <BottomSheet isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} title="Change Password">
                <div className="space-y-3">
                    <div>
                        <label className="text-slate-400 text-xs mb-1 block">Current Password</label>
                        <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="Enter current password"
                            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green" />
                    </div>
                    <div>
                        <label className="text-slate-400 text-xs mb-1 block">New Password</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 chars, uppercase, lowercase, digit, special"
                            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green" />
                    </div>
                    <div>
                        <label className="text-slate-400 text-xs mb-1 block">Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password"
                            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green" />
                    </div>
                    {pwdMsg && (
                        <p className={`text-xs font-medium ${pwdSuccess ? 'text-brand-green' : 'text-red-400'}`}>{pwdMsg}</p>
                    )}
                    <button
                        onClick={() => {
                            if (!oldPassword || !newPassword || !confirmPassword) {
                                setPwdMsg('All fields are required'); setPwdSuccess(false); return;
                            }
                            if (newPassword !== confirmPassword) {
                                setPwdMsg('Passwords do not match'); setPwdSuccess(false); return;
                            }
                            const result = changePassword(user?.email || '', oldPassword, newPassword);
                            setPwdMsg(result.message);
                            setPwdSuccess(result.success);
                            if (result.success) {
                                setTimeout(() => setShowChangePassword(false), 1500);
                            }
                        }}
                        className="w-full py-3 rounded-xl bg-brand-green text-white font-bold text-sm"
                    >
                        Update Password
                    </button>
                </div>
            </BottomSheet>
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
