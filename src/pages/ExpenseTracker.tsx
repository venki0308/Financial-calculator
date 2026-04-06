import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, BarChart3, TrendingUp, FileText, Target, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { migrateFromOldStore } from '../utils/expenseStorage';

const DailyTab = lazy(() => import('./expenses/DailyTab'));
const WeeklyTab = lazy(() => import('./expenses/WeeklyTab'));
const MonthlyTab = lazy(() => import('./expenses/MonthlyTab'));
const YearlyTab = lazy(() => import('./expenses/YearlyTab'));
const ReportsTab = lazy(() => import('./expenses/ReportsTab'));
const BudgetTab = lazy(() => import('./expenses/BudgetTab'));

// ─── TAB DEFINITIONS ─────────────────────────────────────────

const TABS = [
  { id: 'daily', labelKey: 'expenses.daily', icon: CalendarDays },
  { id: 'weekly', labelKey: 'expenses.weekly', icon: Calendar },
  { id: 'monthly', labelKey: 'expenses.monthly', icon: BarChart3 },
  { id: 'yearly', labelKey: 'expenses.yearly', icon: TrendingUp },
  { id: 'reports', labelKey: 'expenses.reports', icon: FileText },
  { id: 'budget', labelKey: 'expenses.budget', icon: Target },
] as const;

type TabId = typeof TABS[number]['id'];

const TAB_SUBTITLES: Record<TabId, string> = {
  daily: 'expenses.dailySubtitle',
  weekly: 'expenses.weeklySubtitle',
  monthly: 'expenses.monthlySubtitle',
  yearly: 'expenses.yearlySubtitle',
  reports: 'expenses.reportsSubtitle',
  budget: 'expenses.budgetSubtitle',
};

// ─── LOADING FALLBACK ────────────────────────────────────────

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-3 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin" />
    </div>
  );
}

// ─── COMPONENT ───────────────────────────────────────────────

export default function ExpenseTracker() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('daily');

  // Migrate old data on first mount
  useEffect(() => {
    migrateFromOldStore();
    AnalyticsService.trackScreen('Expense_Tracker');
  }, []);

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-background animate-fade-in">

      {/* ── Sticky header with safe-area-inset-top ── */}
      <div
        className="sticky top-0 z-30 bg-slate-50/95 dark:bg-[#0F172A] backdrop-blur-sm border-b border-slate-200 dark:border-white/10"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 24px) + 0px)' }}
      >
        {/* Title row */}
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
            <p className="text-muted-foreground text-[11px]">
              {t(TAB_SUBTITLES[activeTab])}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center text-xl">
            💰
          </div>
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
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all text-center ${
                  isActive
                    ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/30'
                    : 'text-muted-foreground dark:text-muted-foreground hover:bg-white dark:hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                <span className="text-[9px] font-bold uppercase tracking-wide">
                  {t(`expenses.${tab.id}`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-4 pt-4 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
          >
            <Suspense fallback={<TabLoader />}>
              {activeTab === 'daily' && <DailyTab />}
              {activeTab === 'weekly' && <WeeklyTab />}
              {activeTab === 'monthly' && <MonthlyTab />}
              {activeTab === 'yearly' && <YearlyTab />}
              {activeTab === 'reports' && <ReportsTab />}
              {activeTab === 'budget' && <BudgetTab />}
            </Suspense>
          </motion.div>
        </AnimatePresence>

        <div className="mt-6">
          <DisclaimerComponent module="expense" />
        </div>
      </div>
    </div>
  );
}
