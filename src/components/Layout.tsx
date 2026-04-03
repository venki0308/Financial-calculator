import { useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Calculator, FileText, Wallet, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useScrollToTop } from '../hooks/useScrollToTop';

export default function Layout() {
    const location = useLocation();
    const { t } = useTranslation();
    useScrollToTop();

    // Fix ghost caret cursor bug in Android WebView when navigating
    useEffect(() => {
        if (
            document.activeElement &&
            (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
        ) {
            (document.activeElement as HTMLElement).blur();
        }
    }, [location.pathname]);

    const tabs = [
        { to: '/', icon: Home, label: t('nav.home') },
        { to: '/calculators', icon: Calculator, label: t('nav.calculate') },
        { to: '/schemes', icon: FileText, label: t('nav.schemes') },
        { to: '/expenses', icon: Wallet, label: t('nav.expenses') },
        { to: '/profile', icon: User, label: t('nav.profile') },
    ];

    return (
        <div className="flex flex-col min-h-dvh app-container">
            <main className="flex-1 pb-safe-nav overflow-y-auto">
                <Outlet />
            </main>

            <nav className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[428px] bg-white dark:bg-[#0F172A] border-t border-slate-200 dark:border-[#1E293B] z-[9999] safe-area-bottom">
                <div className="flex items-center justify-around h-20 px-2 pb-1">
                    {tabs.map(({ to, icon: Icon, label }) => {
                        const homeSubPages = ['/', '/financial-advisor', '/goal-planner', '/compare', '/world-clock', '/notifications', '/insurance-compare'];
                        const isActive = location.pathname === to ||
                (to !== '/' && location.pathname.startsWith(to)) ||
                (to === '/' && homeSubPages.includes(location.pathname)) ||
                (to === '/calculators' && (location.pathname.startsWith('/calculator/') || location.pathname.startsWith('/insurance'))) ||
                (to === '/schemes' && location.pathname.startsWith('/scheme/'));
                        return (
                            <NavLink key={to} to={to} className="flex flex-col items-center gap-1 py-1 px-3">
                                <motion.div
                                    whileTap={{ scale: 0.85 }}
                                    className={`p-2 rounded-xl transition-colors duration-200 ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}
                                >
                                    <Icon size={24} className={isActive ? 'text-indigo-600 dark:text-[#4F46E5]' : 'text-slate-500 dark:text-[#94A3B8]'} strokeWidth={isActive ? 2.5 : 2} />
                                </motion.div>
                                <span className={`text-[10px] font-semibold ${isActive ? 'text-indigo-600 dark:text-[#4F46E5]' : 'text-slate-500 dark:text-[#94A3B8]'}`}>{label}</span>
                            </NavLink>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
