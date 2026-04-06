import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CalendarDays, Target, BarChart3, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnalyticsService } from '../lib/analytics';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { migrateFromOldStore } from '../utils/expenseStorage';

const DailyTab = lazy(() => import('./expenses/DailyTab'));
const BudgetTab = lazy(() => import('./expenses/BudgetTab'));
const MonthlyTab = lazy(() => import('./expenses/MonthlyTab'));
const ReportsTab = lazy(() => import('./expenses/ReportsTab'));

const TABS = [
    { id: 'daily', labelKey: 'expenses.daily', icon: CalendarDays },
    { id: 'monthly', labelKey: 'expenses.monthly', icon: BarChart3 },
    { id: 'budget', labelKey: 'expenses.budget', icon: Target },
    { id: 'reports', labelKey: 'expenses.reports', icon: FileText },
] as const;

type TabId = typeof TABS[number]['id'];

export default function BudgetTracker() {
    useEffect(() => {
        AnalyticsService.trackScreen('Budget_Tracker');
        migrateFromOldStore();
    }, []);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabId>('daily');

    const Spinner = () => (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-background animate-fade-in">
            <div
                className="sticky top-0 z-30 bg-slate-50/95 dark:bg-[#0F172A] border-b border-slate-200 dark:border-white/10"
                style={{ paddingTop: "calc(env(safe-area-inset-top, 24px) + 0px)" }}
            >
                <div className="flex items-center gap-4 px-4 py-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-foreground">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-slate-900 dark:text-foreground font-bold text-base">{t('expenses.title')}</h1>
                        <p className="text-muted-foreground text-[11px]">{t(`expenses.${activeTab}Subtitle`)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center text-xl">💰</div>
                </div>

                <div className="flex px-4 pb-3 gap-1">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all text-center ${isActive ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/30' : 'text-muted-foreground hover:bg-white dark:hover:bg-white/5'}`}
                            >
                                <Icon size={16} />
                                <span className="text-[9px] font-bold uppercase tracking-wide">{t(tab.labelKey)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="px-4 pt-4 pb-28">
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                        <Suspense fallback={<Spinner />}>
                            {activeTab === 'daily' && <DailyTab />}
                            {activeTab === 'monthly' && <MonthlyTab />}
                            {activeTab === 'budget' && <BudgetTab />}
                            {activeTab === 'reports' && <ReportsTab />}
                        </Suspense>
                    </motion.div>
                </AnimatePresence>
            </div>

            <DisclaimerComponent module="budget" />
        </div>
    );
}
