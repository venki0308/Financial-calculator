import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Bell, FileText, Star, Share2, Info, ChevronRight, Globe, Check, Trash2, Download, Upload, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { switchLanguage } from '../i18n';
import BottomSheet from '../components/BottomSheet';
import { AnalyticsService } from '../lib/analytics';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { APP_VERSION } from '../config/app';
import { useAppColors } from '../theme/useAppColors';
import { exportBackup, importBackup } from '../utils/backupRestore';

// Minimal toast (same pattern as exportReport/PdfActionSheet)
function showToast(message: string, isError = false) {
    const old = document.getElementById('fncx-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = 'fncx-toast';
    t.textContent = message;
    Object.assign(t.style, {
        position: 'fixed', bottom: '110px', left: '50%', transform: 'translateX(-50%)',
        background: isError ? '#ef4444' : '#10B981', color: '#fff',
        padding: '12px 22px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
        zIndex: '99999', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', whiteSpace: 'nowrap',
        maxWidth: '90vw', textAlign: 'center',
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}


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
    const [showClearConfirmFinal, setShowClearConfirmFinal] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
    const importInputRef = useRef<HTMLInputElement>(null);
    const c = useAppColors();

    const currentLang = languages.find(l => i18n.language.startsWith(l.code)) || languages[0];

    useEffect(() => { AnalyticsService.trackScreen('Settings'); }, []);

    const { setLanguage } = useSettingsStore();
    const changeLanguage = async (code: string) => {
        await switchLanguage(code);
        localStorage.setItem('language', code);
        setLanguage(code);
        AnalyticsService.trackLanguageChanged(code);
        setShowLangPicker(false);
    };

    const handleExportBackup = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            const result = await exportBackup();
            showToast(result.location === 'documents'
                ? t('settings.backupSavedNative', 'Backup saved: {{file}}', { file: result.fileName })
                : t('settings.backupSavedWeb', 'Backup downloaded: {{file}}', { file: result.fileName }));
        } catch (e) {
            console.error('Backup export failed:', e);
            showToast(t('settings.backupFailed', 'Could not create backup. Please try again.'), true);
        } finally {
            setExporting(false);
        }
    };

    const handleImportFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        // Reset so picking the same file again re-triggers onChange
        e.target.value = '';
        if (file) setPendingImportFile(file);
    };

    const handleConfirmImport = async () => {
        const file = pendingImportFile;
        setPendingImportFile(null);
        if (!file) return;
        try {
            const { restored } = await importBackup(file);
            showToast(t('settings.restoreSuccess', 'Backup restored ({{count}} items). Restarting…', { count: restored }));
            // Reload so all Zustand stores rehydrate and dataIntegrity re-validates
            setTimeout(() => window.location.reload(), 800);
        } catch (e) {
            console.error('Backup import failed:', e);
            showToast(t('settings.restoreInvalid', 'This file is not a valid FinCalix backup.'), true);
        }
    };

    const handleClearData = () => {
        // Wipe ALL persisted data for a true fresh-install reset.
        // Covers Zustand stores, expense tracker, loans, CIBIL profile,
        // settings, and one-time flags.
        const storeKeys = [
            // Legacy Zustand stores
            'local-user-storage',
            'calculator-storage',
            'budget-tracker-storage',
            'fincalix-expenses',
            'scheme-storage',
            'settings-storage',
            'fincalix-calculator-store',
            'live-status-storage',
            'feature-flags-storage',
            'language',
            // New fincalix_* keys (expense tracker + loans + CIBIL)
            'fincalix_entries',
            'fincalix_accounts',
            'fincalix_budgets',
            'fincalix_categories',
            'fincalix_my_loans',
            'fincalix_credit_cards',
            'fincalix_businesses',
            'fincalix_business_entries',
            'fincalix_cibil_profile',
            'fincalix_property_data',
            'fincalix_world_clocks',
            'fincalix_recently_used',
            'fincalix_comparev2',
            'fincalix_notifications',
            'fincalix_analytics_queue',
            'fincalix_anon_id',
            // Disclaimer / consent flags
            'fincalix_disclaimer_accepted',
            'fincalix_disclaimer_accepted_v2',
            'fincalix_privacy_accepted',
            'appDisclaimerAccepted',
            'expenseTrackerDisclaimerAccepted',
            'cibil_onboarding_shown',
            'fincalix_last_quote_date',
            'fincalix_last_update_notif_version',
            'fincalix_scheduler_first_seed',
            'fincalix_scheduler_last_run',
            'fincalix_notif_perm_requested',
            'fincalix_pending_nav',
            // Dev access (only meaningful in dev builds)
            'fincalix_dev_access',
        ];
        storeKeys.forEach((key) => localStorage.removeItem(key));
        setShowClearConfirm(false);
        setShowClearConfirmFinal(false);
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
                        <ChevronRight size={16} className="text-muted-foreground" />
                    </button>
                </div>

                {/* Notifications */}
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-3">{t('settings.notifications')}</p>
                <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
                    <button onClick={() => setShowNotif(true)} className="w-full flex items-center gap-4 p-4">
                        <Bell size={20} className="text-brand-purple" />
                        <span className="text-foreground font-medium text-sm flex-1 text-left">{t('settings.notifications')}</span>
                        <ChevronRight size={16} className="text-muted-foreground" />
                    </button>
                </div>

                {/* About & Sharing */}
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-3">{t('settings.about')}</p>
                <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
                    <MenuItem icon={Info} label={t('settings.about')} color="#10B981" onClick={() => navigate('/about')} />
                    <div className="h-px bg-border mx-4" />
                    <MenuItem icon={FileText} label={t('settings.privacyPolicy')} color="#3B82F6" onClick={() => navigate('/privacy-policy')} />
                    <div className="h-px bg-border mx-4" />
                    <MenuItem icon={FileText} label={t('settings.dataPrivacy')} color="#10B981" onClick={() => navigate('/data-safety')} />
                    <div className="h-px bg-border mx-4" />
                    <MenuItem icon={FileText} label={t('settings.termsOfService')} color="#8B5CF6" onClick={() => navigate('/terms-of-service')} />
                    <div className="h-px bg-border mx-4" />
                    <MenuItem icon={Star} label={t('settings.rateApp')} color="#F59E0B" onClick={() => {
                        const packageId = 'com.fincalix.app';
                        if (Capacitor.isNativePlatform()) {
                            // On Android, use market:// intent for direct Play Store launch
                            window.open(`market://details?id=${packageId}`, '_system');
                        } else {
                            window.open(`https://play.google.com/store/apps/details?id=${packageId}`, '_blank', 'noopener,noreferrer');
                        }
                    }} />
                    <div className="h-px bg-border mx-4" />
                    <MenuItem icon={Share2} label={t('settings.shareApp')} color="#EC4899" onClick={async () => {
                        const shareData = {
                            title: 'FinCalix – Financial Calculator App',
                            text: t('settings.shareMessage'),
                            url: 'https://play.google.com/store/apps/details?id=com.fincalix.app&referrer=utm_source%3Dshare_card',
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
                                            dialogTitle: t('settings.shareApp')
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
                                alert(t('settings.linkCopied'));
                            }
                        } catch (err) {
                            console.error('Share operation failed:', err);
                        }
                    }} />
                </div>

                {/* Backup & Restore */}
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-3">{t('settings.backupRestore', 'Backup & Restore')}</p>
                <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
                    <button onClick={handleExportBackup} disabled={exporting} className="w-full flex items-center gap-4 p-4 disabled:opacity-60">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Download size={20} className="text-emerald-500" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-foreground font-medium text-sm">{t('settings.exportAppData', 'Export App Data')}</p>
                            <p className="text-muted-foreground text-xs">{t('settings.exportAppDataDesc', 'Save a backup file to move to a new phone')}</p>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground" />
                    </button>
                    <div className="h-px bg-border mx-4" />
                    <button onClick={() => importInputRef.current?.click()} className="w-full flex items-center gap-4 p-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Upload size={20} className="text-blue-500" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-foreground font-medium text-sm">{t('settings.importAppData', 'Import App Data')}</p>
                            <p className="text-muted-foreground text-xs">{t('settings.importAppDataDesc', 'Restore everything from a backup file')}</p>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground" />
                    </button>
                    <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFileSelected} />
                </div>

                {/* Data Management */}
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-3">{t('settings.data')}</p>
                <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
                    <button onClick={() => setShowClearConfirm(true)} className="w-full flex items-center gap-4 p-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <Trash2 size={20} className="text-red-400" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-red-400 font-medium text-sm">{t('settings.clearData')}</p>
                            <p className="text-muted-foreground text-xs">{t('settings.clearDataDesc')}</p>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground" />
                    </button>
                </div>

                <div className="text-center pb-8 mt-2 animate-fade-in delay-500">
                    <p className="text-muted-foreground text-xs text-brand-purple/80 dark:text-cyan-400 font-bold mb-1">FinCalix v{APP_VERSION}</p>
                    <p className="text-muted-foreground text-[10px]">{t('settings.localDataNote')}</p>
                </div>
            </div>

            {/* Language Picker Sheet */}
            <BottomSheet isOpen={showLangPicker} onClose={() => setShowLangPicker(false)} title={t('settings.selectLanguage')}>
                <div className="space-y-2">
                    {languages.map(lang => {
                        const isActive = i18n.language.startsWith(lang.code);
                        return (
                            <button key={lang.code} onClick={() => changeLanguage(lang.code)}
                                style={{
                                    backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : c.card,
                                    borderColor: isActive ? '#10B981' : c.border
                                }}
                                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-colors hover:opacity-80`}>
                                <div className="flex flex-col items-start">
                                    <span style={{ color: c.text }} className="font-medium text-sm">{lang.nativeName}</span>
                                    <span style={{ color: c.textSecondary }} className="text-xs">{lang.name}</span>
                                </div>
                                {isActive && <Check size={18} className="text-brand-green flex-shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            </BottomSheet>

            {/* Notification Sheet */}
            <BottomSheet isOpen={showNotif} onClose={() => setShowNotif(false)} title={t('settings.notifications')}>
                <div className="space-y-3">
                    {([['dailyQuotes', t('settings.dailyQuotes')], ['newSchemes', t('settings.newSchemes')], ['calcReminders', t('settings.calcReminders')], ['appUpdates', t('settings.appUpdates')]] as const).map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-muted">
                            <span className="text-foreground text-sm">{label}</span>
                            <button onClick={async () => {
                                const nextVal = !notifications[key];
                                setNotification(key, nextVal);
                                if (nextVal) {
                                    let granted = true;
                                    if (Capacitor.isNativePlatform()) {
                                        const { display } = await LocalNotifications.requestPermissions();
                                        granted = display === 'granted';
                                    } else if ('Notification' in window) {
                                        granted = (await Notification.requestPermission()) === 'granted';
                                    }
                                    // Only dailyQuotes drives OS-level banner notifications;
                                    // the other toggles feed the in-app bell (no OS permission
                                    // needed), so revert only dailyQuotes on denial — otherwise
                                    // a permanently-denied user could never re-enable them.
                                    if (!granted && key === 'dailyQuotes') setNotification(key, false);
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
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-[10000]" onClick={() => setShowClearConfirm(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-none">
                            <div style={{ backgroundColor: c.card, borderColor: c.border }} className="border-2 rounded-2xl w-full max-w-sm shadow-2xl pointer-events-auto p-6">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center"><Trash2 size={32} className="text-red-500" /></div>
                                </div>
                                <h3 style={{ color: c.text }} className="text-xl font-bold text-center mb-2">{t('settings.clearDataTitle')}</h3>
                                <p style={{ color: c.textSecondary }} className="text-center text-sm mb-6">{t('settings.clearDataBody')}</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowClearConfirm(false)} style={{ backgroundColor: c.inputBg, color: c.text, borderColor: c.border }} className="flex-1 py-3 rounded-xl font-semibold text-sm border-2">{t('settings.clearDataCancel')}</button>
                                    <button onClick={() => { setShowClearConfirm(false); setShowClearConfirmFinal(true); }} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm border-2 border-red-500">{t('settings.clearDataConfirm')}</button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Clear Data — Final Confirmation (step 2 of 2) */}
            <AnimatePresence>
                {showClearConfirmFinal && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-[10000]" onClick={() => setShowClearConfirmFinal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-none">
                            <div style={{ backgroundColor: c.card, borderColor: c.border }} className="border-2 rounded-2xl w-full max-w-sm shadow-2xl pointer-events-auto p-6">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center"><AlertTriangle size={32} className="text-red-500" /></div>
                                </div>
                                <h3 style={{ color: c.text }} className="text-xl font-bold text-center mb-2">{t('settings.clearDataFinalTitle', 'Delete everything permanently?')}</h3>
                                <p style={{ color: c.textSecondary }} className="text-center text-sm mb-6">{t('settings.clearDataFinalBody', 'This erases all expenses, budgets, loans, credit cards, businesses, saved calculations and settings. This cannot be undone. Consider exporting a backup first.')}</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowClearConfirmFinal(false)} style={{ backgroundColor: c.inputBg, color: c.text, borderColor: c.border }} className="flex-1 py-3 rounded-xl font-semibold text-sm border-2">{t('settings.clearDataCancel')}</button>
                                    <button onClick={handleClearData} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm border-2 border-red-500">{t('settings.clearDataFinalConfirm', 'Yes, delete everything')}</button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Import Backup Confirmation */}
            <AnimatePresence>
                {pendingImportFile && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-[10000]" onClick={() => setPendingImportFile(null)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-none">
                            <div style={{ backgroundColor: c.card, borderColor: c.border }} className="border-2 rounded-2xl w-full max-w-sm shadow-2xl pointer-events-auto p-6">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center"><Upload size={32} className="text-blue-500" /></div>
                                </div>
                                <h3 style={{ color: c.text }} className="text-xl font-bold text-center mb-2">{t('settings.importConfirmTitle', 'Restore from backup?')}</h3>
                                <p style={{ color: c.textSecondary }} className="text-center text-sm mb-6">{t('settings.importConfirmBody', 'This will replace all current data with the backup. Continue?')}</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setPendingImportFile(null)} style={{ backgroundColor: c.inputBg, color: c.text, borderColor: c.border }} className="flex-1 py-3 rounded-xl font-semibold text-sm border-2">{t('settings.importCancel', 'Cancel')}</button>
                                    <button onClick={handleConfirmImport} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm border-2 border-blue-500">{t('settings.importConfirm', 'Restore')}</button>
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
            <ChevronRight size={16} className="text-muted-foreground" />
        </button>
    );
}
