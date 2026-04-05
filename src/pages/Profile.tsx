import { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Clock, Bell, Settings, ChevronRight, User, Globe, Pencil, Check, Heart, Activity, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { APP_VERSION } from '../config/app';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useSchemeStore } from '../store/useSchemeStore';
import { useLiveStatusStore, type SavedLiveProfile } from '../store/useLiveStatusStore';
import { useTranslation } from 'react-i18next';
import { AnalyticsService } from '../lib/analytics';

const languages: Record<string, string> = {
    en: 'English', hi: 'हिंदी', te: 'తెలుగు', ta: 'தமிழ்', kn: 'ಕನ್ನಡ', ml: 'മലയാളം'
};

const calcTypeToPath: Record<string, string> = {
    'Loan EMI': '/calculator/loan-emi',
    'SIP Calculator': '/calculator/sip',
    'FD Calculator': '/calculator/fixed-deposit',
    'PPF Calculator': '/calculator/ppf',
    'RD': '/calculator/recurring-deposit',
    'NSC Calculator': '/calculator/nsc',
    'KVP Calculator': '/calculator/kvp',
    'Post Office MIS': '/calculator/post-office-mis',
    'SCSS Calculator': '/calculator/senior-citizen-savings',
    'Post Office TD': '/calculator/post-office-td',
    'SSY Calculator': '/calculator/sukanya-samriddhi',
    'Goal Planner': '/calculator/sip',
};

const calcTypeColors: Record<string, string> = {
    'Loan EMI': '#8B5CF6',
    'SIP Calculator': '#3B82F6',
    'FD Calculator': '#F59E0B',
    'PPF Calculator': '#06B6D4',
    'RD': '#F59E0B',
    'NSC Calculator': '#14B8A6',
    'KVP Calculator': '#22C55E',
    'Post Office MIS': '#8B5CF6',
    'SCSS Calculator': '#EC4899',
    'Post Office TD': '#F97316',
    'SSY Calculator': '#EC4899',
    'Goal Planner': '#3B82F6',
};

export default function Profile() {
    useEffect(() => { AnalyticsService.trackScreen('Profile'); }, []);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { user, updateName } = useAuthStore();
    const savedCount = useCalculatorStore((s) => s.savedCalculations.length);
    const historyCount = useCalculatorStore((s) => s.history.length);
    const bookmarkCount = useSchemeStore((s) => s.bookmarkedSchemes.length);
    const { savedProfiles, removeProfile } = useLiveStatusStore();

    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(user.name);

    const currentLangName = languages[i18n.language] || languages[i18n.language?.split('-')[0]] || 'English';

    const handleSaveName = () => {
        updateName(nameInput);
        setEditingName(false);
    };

    const menuItems = [
        { icon: Bookmark, label: t('profile.saved'), color: '#10B981', key: 'saved', path: '/profile/saved' },
        { icon: Clock, label: t('profile.history'), color: '#3B82F6', key: 'history', path: '/profile/history' },
        { icon: Bookmark, label: t('profile.bookmarks'), color: '#F59E0B', key: 'bookmarks', path: '/profile/bookmarks' },
        { icon: Bell, label: t('settings.notifications'), color: '#8B5CF6', key: 'notif', path: '/notifications' },
        { icon: Settings, label: t('settings.title'), color: '#6B7280', key: 'settings', path: '/settings' },
    ];

    const getBadge = (key: string) => {
        if (key === 'saved') return savedCount;
        if (key === 'history') return historyCount;
        if (key === 'bookmarks') return bookmarkCount;
        return 0;
    };

    const initials = (user.name || 'U').slice(0, 2).toUpperCase();

    return (
        <div className="px-4 pt-14 animate-fade-in">
            <h1 className="text-2xl font-bold text-foreground mb-6">{t('profile.title')}</h1>

            {/* User Card */}
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-brand-green/10 to-brand-blue/10 border border-border mb-6">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full bg-brand-green/20 flex items-center justify-center shrink-0">
                    <span className="text-brand-green font-bold text-xl">{initials}</span>
                </div>

                <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                        {editingName ? (
                            <motion.div
                                key="edit"
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2"
                            >
                                <input
                                    autoFocus
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                    className="flex-1 bg-card border border-brand-green/40 rounded-lg px-3 py-1.5 text-foreground text-sm outline-none"
                                    maxLength={30}
                                />
                                <button onClick={handleSaveName} className="p-1.5 rounded-lg bg-brand-green/15 text-brand-green">
                                    <Check size={16} />
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="show"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2"
                            >
                                <h2 className="text-foreground font-semibold text-lg truncate">{user.name}</h2>
                                <button
                                    onClick={() => { setNameInput(user.name); setEditingName(true); }}
                                    className="p-1 rounded-lg text-muted-foreground hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    <Pencil size={14} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
                        <User size={11} />
                        <span>{t('profile.localData')}</span>
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                    { label: t('profile.saved'), value: savedCount },
                    { label: t('profile.bookmarks'), value: bookmarkCount },
                    { label: t('profile.history'), value: historyCount },
                ].map((s) => (
                    <div key={s.label} className="p-4 rounded-2xl bg-card border border-border text-center">
                        <p className="text-2xl font-bold text-foreground">{s.value}</p>
                        <p className="text-muted-foreground text-xs mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Current Language */}
            <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/15 flex items-center justify-center">
                    <Globe size={20} className="text-brand-blue" />
                </div>
                <div className="flex-1 text-left">
                    <span className="text-foreground font-medium text-sm block">{t('settings.language')}</span>
                    <span className="text-muted-foreground text-xs">{currentLangName}</span>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
            </button>

            {/* Menu */}
            <div className="space-y-2.5 mb-8">
                {menuItems.map(({ icon: Icon, label, color, key, path }) => {
                    const badge = getBadge(key);
                    return (
                        <motion.button
                            key={key}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate(path)}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border"
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                                <Icon size={20} style={{ color }} />
                            </div>
                            <span className="text-foreground font-medium text-sm flex-1 text-left">{label}</span>
                            {badge > 0 && <span className="px-2 py-0.5 rounded-full bg-brand-green/15 text-brand-green text-xs font-medium">{badge}</span>}
                            <ChevronRight size={16} className="text-muted-foreground" />
                        </motion.button>
                    );
                })}
            </div>

            {/* Tracked Investments & Loans */}
            {savedProfiles.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                        <Activity size={18} className="text-emerald-500" />
                        <h2 className="text-foreground font-bold text-sm">My Tracked Investments & Loans</h2>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-bold">{savedProfiles.length}</span>
                    </div>
                    <div className="space-y-2.5">
                        {savedProfiles.map((profile) => {
                            const color = calcTypeColors[profile.calculatorType] || '#64748B';
                            const path = calcTypeToPath[profile.calculatorType] || '/calculators';
                            return (
                                <div key={profile.id} className="p-4 rounded-2xl bg-card border border-border">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                                            <Activity size={18} style={{ color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-foreground font-bold text-sm truncate">{profile.name}</h3>
                                            <p className="text-muted-foreground text-xs mt-0.5">{profile.calculatorType}</p>
                                            <p className="text-muted-foreground text-[10px] mt-0.5">
                                                Saved {new Date(profile.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => navigate(path)}
                                                className="px-3 py-1.5 rounded-lg text-xs font-bold border"
                                                style={{ borderColor: `${color}40`, color }}
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => removeProfile(profile.id)}
                                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="text-center mt-12 mb-8 animate-fade-in delay-400">
                <p className="text-slate-500 dark:text-slate-400 font-medium">FinCalix</p>
                <p className="text-slate-600 text-xs text-brand-blue/80 dark:text-cyan-400 font-bold mt-1">Version {APP_VERSION}</p>
                <div className="flex items-center justify-center gap-1 mt-2 text-xs text-slate-400">
                    {t('profile.madeWith')} <Heart size={10} className="text-red-500 fill-red-500" /> {t('profile.inIndia')}
                </div>
            </div>
        </div>
    );
}
