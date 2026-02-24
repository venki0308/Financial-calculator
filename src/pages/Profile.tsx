import { useNavigate } from 'react-router-dom';
import { Bookmark, Clock, Bell, Settings, ChevronRight, User, ShieldCheck, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useSchemeStore } from '../store/useSchemeStore';
import { useTranslation } from 'react-i18next';

const languages: Record<string, string> = {
    en: 'English', hi: 'हिंदी', te: 'తెలుగు', ta: 'தமிழ்', kn: 'ಕನ್ನಡ', ml: 'മലയാളം'
};

export default function Profile() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const user = useAuthStore((s) => s.user);
    const savedCount = useCalculatorStore((s) => s.savedCalculations.length);
    const historyCount = useCalculatorStore((s) => s.history.length);
    const bookmarkCount = useSchemeStore((s) => s.bookmarkedSchemes.length);

    const currentLangName = languages[i18n.language] || languages[i18n.language?.split('-')[0]] || 'English';

    const menuItems = [
        { icon: Bookmark, label: t('profile.saved'), color: '#10B981', key: 'saved', path: '/profile/saved' },
        { icon: Clock, label: t('profile.history'), color: '#3B82F6', key: 'history', path: '/profile/history' },
        { icon: Bookmark, label: t('profile.bookmarks'), color: '#F59E0B', key: 'bookmarks', path: '/profile/bookmarks' },
        { icon: Bell, label: t('settings.notifications'), color: '#8B5CF6', key: 'notif', path: '/notifications' },
        { icon: Settings, label: t('settings.title'), color: '#6B7280', key: 'settings', path: '/settings' },
        ...(user?.role === 'admin' ? [{ icon: ShieldCheck, label: 'Admin Panel', color: '#F59E0B', key: 'admin', path: '/admin' }] : []),
    ];

    const getBadge = (key: string) => {
        if (key === 'saved') return savedCount;
        if (key === 'history') return historyCount;
        if (key === 'bookmarks') return bookmarkCount;
        return 0;
    };

    return (
        <div className="px-4 pt-14 animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-6">{t('profile.title')}</h1>

            {/* User Card */}
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-brand-green/10 to-brand-blue/10 border border-dark-border mb-6">
                {user?.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-14 h-14 rounded-full object-cover" />
                ) : (
                    <div className="w-14 h-14 rounded-full bg-brand-green/15 flex items-center justify-center">
                        <User size={28} className="text-brand-green" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h2 className="text-white font-semibold text-lg truncate">{user?.name || 'User'}</h2>
                    <p className="text-slate-400 text-sm truncate">{user?.email || ''}</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                    { label: t('profile.saved'), value: savedCount },
                    { label: t('profile.bookmarks'), value: bookmarkCount },
                    { label: t('profile.history'), value: historyCount },
                ].map((s) => (
                    <div key={s.label} className="p-4 rounded-2xl bg-dark-card border border-dark-border text-center">
                        <p className="text-2xl font-bold text-white">{s.value}</p>
                        <p className="text-slate-500 text-xs mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Current Language */}
            <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-dark-card border border-dark-border mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/15 flex items-center justify-center">
                    <Globe size={20} className="text-brand-blue" />
                </div>
                <div className="flex-1 text-left">
                    <span className="text-white font-medium text-sm block">{t('settings.language')}</span>
                    <span className="text-slate-500 text-xs">{currentLangName}</span>
                </div>
                <ChevronRight size={16} className="text-slate-600" />
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
                            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-dark-card border border-dark-border"
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                                <Icon size={20} style={{ color }} />
                            </div>
                            <span className="text-white font-medium text-sm flex-1 text-left">{label}</span>
                            {badge > 0 && <span className="px-2 py-0.5 rounded-full bg-brand-green/15 text-brand-green text-xs font-medium">{badge}</span>}
                            <ChevronRight size={16} className="text-slate-600" />
                        </motion.button>
                    );
                })}
            </div>

            <div className="text-center py-6 border-t border-dark-border">
                <p className="text-slate-400 text-sm font-medium">FinCalix</p>
                <p className="text-slate-600 text-xs mt-1">Version 2.0.26</p>
                <p className="text-slate-600 text-xs mt-0.5">Made with ❤️ in India</p>
            </div>
        </div>
    );
}
