import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Calculator, FileText, Wallet, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useScrollToTop } from '../hooks/useScrollToTop';

export default function Layout() {
    const location = useLocation();
    const { t } = useTranslation();
    useScrollToTop();

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

            <nav className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[428px] bg-[#1E293B]/95 backdrop-blur-xl border-t border-[#334155] z-50 safe-area-bottom">
                <div className="flex items-center justify-around h-20 px-2">
                    {tabs.map(({ to, icon: Icon, label }) => {
                        const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
                        return (
                            <NavLink key={to} to={to} className="flex flex-col items-center gap-1 py-2 px-3">
                                <motion.div
                                    whileTap={{ scale: 0.85 }}
                                    className={`p-2 rounded-xl transition-colors duration-200 ${isActive ? 'bg-brand-green/15' : ''}`}
                                >
                                    <Icon size={22} className={isActive ? 'text-brand-green' : 'text-slate-500'} strokeWidth={isActive ? 2.5 : 1.8} />
                                </motion.div>
                                <span className={`text-[11px] font-medium ${isActive ? 'text-brand-green' : 'text-slate-500'}`}>{label}</span>
                            </NavLink>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
