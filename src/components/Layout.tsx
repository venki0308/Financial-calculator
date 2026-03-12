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

 <nav 
 className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[428px] bg-[var(--nav-bg)] z-[9999] safe-area-bottom"
 style={{ 
 borderTop: '1px solid var(--nav-border)',
 height: '64px',
 boxShadow: 'var(--card-shadow, 0 -4px 20px rgba(0,0,0,0.15))' 
 }}
 >
 <div className="flex items-center justify-around h-full px-2">
 {tabs.map(({ to, icon: Icon, label }) => {
 const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
 return (
 <NavLink key={to} to={to} className="flex flex-col items-center justify-center gap-1 w-full h-full">
 <motion.div
 whileTap={{ scale: 0.85 }}
 className={`p-1.5 rounded-xl transition-colors duration-200 ${isActive ? 'bg-[var(--nav-active)]/10' : ''}`}
 >
 <Icon 
 size={22} 
 style={{ color: isActive ? 'var(--nav-active)' : 'var(--nav-inactive)' }} 
 strokeWidth={isActive ? 2.5 : 1.8} 
 />
 </motion.div>
 <span className="text-[10px] font-medium" style={{ color: isActive ? 'var(--nav-active)' : 'var(--nav-inactive)' }}>
 {label}
 </span>
 </NavLink>
 );
 })}
 </div>
 </nav>
 </div>
 );
}
