import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, LayoutDashboard, Wallet, Calendar, CalendarDays, BarChart3, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnalyticsService } from '../lib/analytics';
import DashboardTab from './expenses/DashboardTab';
import BudgetTab from './expenses/BudgetTab';
import DailyTab from './expenses/DailyTab';
import ReportsTab from './expenses/ReportsTab';
import WeeklyTab from './expenses/WeeklyTab';
import SubscriptionsTab from './expenses/SubscriptionsTab';
import DisclaimerComponent from '../components/DisclaimerComponent';


const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'budget', label: 'Budget', icon: Wallet },
    { id: 'daily', label: 'Daily', icon: Calendar },
    { id: 'weekly', label: 'Weekly', icon: CalendarDays },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'subs', label: 'Subs', icon: Repeat },
] as const;

type TabId = typeof TABS[number]['id'];

const TAB_SUBTITLES: Record<TabId, string> = {
    dashboard: 'expenses.dashboardSubtitle',
    budget: 'expenses.budgetSubtitle',
    daily: 'expenses.dailySubtitle',
    weekly: 'expenses.weeklySubtitle',
    reports: 'expenses.reportsSubtitle',
    subs: 'expenses.subsSubtitle',
};

export default function ExpenseTracker() {
    useEffect(() => { AnalyticsService.trackScreen('Expense_Tracker'); }, []);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');
    const [showAddExpense, setShowAddExpense] = useState(false);

    const handleAddExpenseFromDashboard = () => {
        setActiveTab('daily');
        setTimeout(() => setShowAddExpense(true), 120);
    };

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-background animate-fade-in">

            {/* ── Sticky header with safe-area-inset-top ── */}
            <div
                className="sticky top-0 z-30 bg-slate-50/95 dark:bg-[#0F172A]  border-b border-slate-200 dark:border-white/10"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 24px) + 0px)' }}
            >
                <div className="flex items-center gap-4 px-4 pt-3 pb-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-foreground"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-slate-900 dark:text-foreground font-bold text-base">
                            {t('expenses.title')}
                        </h1>
                        <p className="text-muted-foreground text-[11px]">{t(TAB_SUBTITLES[activeTab])}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center text-xl">💰</div>
                </div>

                {/* Tab Bar */}
                <div className="flex px-4 pb-3 gap-1">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all text-center ${isActive
                                    ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/30'
                                    : 'text-muted-foreground dark:text-muted-foreground hover:bg-white dark:hover:bg-white/5'
                                    }`}
                            >
                                <Icon size={16} />
                                <span className="text-[9px] font-bold uppercase tracking-wide">{t(`expenses.${tab.id}`)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="px-4 pt-4 pb-28">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.18 }}
                    >
                        {activeTab === 'dashboard' && (
                            <DashboardTab 
                                onAddExpense={handleAddExpenseFromDashboard} 
                                onViewAll={() => setActiveTab('daily')} 
                                onViewSubs={() => setActiveTab('subs')}
                            />
                        )}
                        {activeTab === 'budget' && <BudgetTab />}
                        {activeTab === 'daily' && <DailyTab />}
                        {activeTab === 'weekly' && <WeeklyTab />}
                        {activeTab === 'reports' && <ReportsTab />}
                        {activeTab === 'subs' && <SubscriptionsTab />}
                    </motion.div>
                </AnimatePresence>

                <div className="mt-6">
                    <DisclaimerComponent module="expense" />
                </div>
            </div>
        </div>
    );
}
