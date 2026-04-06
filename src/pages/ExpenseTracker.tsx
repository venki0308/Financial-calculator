import { useState, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CalendarDays, Calendar, BarChart3, TrendingUp, FileText, Target, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpenseTheme } from '../theme/expenseTheme';
import { AnalyticsService } from '../lib/analytics';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { migrateFromOldStore, getAllCategories, getAllAccounts } from '../utils/expenseStorage';
import { getTodayStr } from '../utils/expenseCalculations';

// ─── LAZY-LOADED TAB COMPONENTS ─────────────────────────────
const DailyTab = lazy(() => import('./expenses/DailyTab'));
const WeeklyTab = lazy(() => import('./expenses/WeeklyTab'));
const MonthlyTab = lazy(() => import('./expenses/MonthlyTab'));
const YearlyTab = lazy(() => import('./expenses/YearlyTab'));
const ReportsTab = lazy(() => import('./expenses/ReportsTab'));
const BudgetTab = lazy(() => import('./expenses/BudgetTab'));
const AddEntrySheet = lazy(() => import('../components/AddEntrySheet'));

// ─── TAB DEFINITIONS ─────────────────────────────────────────
const TABS = [
  { id: 'budget',  labelKey: 'expenses.budget',  icon: Target,       emoji: '\u{1F3AF}' },
  { id: 'daily',   labelKey: 'expenses.daily',   icon: CalendarDays, emoji: '\u{1F4C5}' },
  { id: 'weekly',  labelKey: 'expenses.weekly',  icon: Calendar,     emoji: '\u{1F4C6}' },
  { id: 'monthly', labelKey: 'expenses.monthly', icon: BarChart3,    emoji: '\u{1F4CA}' },
  { id: 'yearly',  labelKey: 'expenses.yearly',  icon: TrendingUp,   emoji: '\u{1F4C8}' },
  { id: 'reports', labelKey: 'expenses.reports', icon: FileText,     emoji: '\u{1F4CB}' },
] as const;

type TabId = typeof TABS[number]['id'];

const TAB_SUBTITLES: Record<TabId, string> = {
  daily:   'expenses.dailySubtitle',
  weekly:  'expenses.weeklySubtitle',
  monthly: 'expenses.monthlySubtitle',
  yearly:  'expenses.yearlySubtitle',
  reports: 'expenses.reportsSubtitle',
  budget:  'expenses.budgetSubtitle',
};

// ─── LOADING FALLBACK ────────────────────────────────────────
function TabLoader({ theme }: { theme: ReturnType<typeof useExpenseTheme> }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div
        className="w-10 h-10 rounded-full border-[3px] animate-spin"
        style={{
          borderColor: theme.borderSubtle,
          borderTopColor: theme.accentInvestment,
        }}
      />
      <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: theme.textMuted }}>
        Loading...
      </span>
    </div>
  );
}

// ─── COMPONENT ───────────────────────────────────────────────
export default function ExpenseTracker() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useExpenseTheme();
  const [activeTab, setActiveTab] = useState<TabId>('budget');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Tabs that show the global FAB (Daily has its own)
  const showFab = ['weekly', 'monthly', 'yearly'].includes(activeTab);

  // Migrate old data on first mount
  useEffect(() => {
    migrateFromOldStore();
    AnalyticsService.trackScreen('Expense_Tracker');
  }, []);

  // Period subtitle that changes per tab
  const periodSubtitle = useMemo(() => {
    const now = new Date();
    switch (activeTab) {
      case 'daily':
        return now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
      case 'weekly':
        return t('expenses.weeklySubtitle');
      case 'monthly':
        return now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      case 'yearly':
        return String(now.getFullYear());
      case 'reports':
        return t('expenses.reportsSubtitle');
      case 'budget':
        return t('expenses.budgetSubtitle');
      default:
        return '';
    }
  }, [activeTab, t]);

  return (
    <div
      className="min-h-dvh animate-fade-in"
      style={{ backgroundColor: theme.bgPrimary }}
    >
      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-30 backdrop-blur-xl border-b"
        style={{
          backgroundColor: theme.bgCard + 'F2',
          borderColor: theme.borderSubtle,
          paddingTop: 'calc(env(safe-area-inset-top, 24px) + 0px)',
        }}
      >
        {/* Title row */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: theme.bgPrimary,
              borderColor: theme.borderSubtle,
              color: theme.textPrimary,
            }}
          >
            <ArrowLeft size={18} />
          </motion.button>

          <div className="flex-1 min-w-0">
            <h1
              className="font-bold text-base tracking-tight"
              style={{ color: theme.textPrimary }}
            >
              {t('expenses.title')}
            </h1>
            <motion.p
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-medium mt-0.5 truncate"
              style={{ color: theme.textMuted }}
            >
              {periodSubtitle}
            </motion.p>
          </div>

          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: theme.bgInvestment }}
          >
            {'\u{1F4B0}'}
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="px-3 pb-3">
          <div className="flex rounded-2xl p-1 gap-1" style={{ backgroundColor: theme.bgPrimary }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all duration-200"
                  style={{
                    backgroundColor: isActive ? theme.accentPrimary : 'transparent',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                  }}
                >
                  <span className="text-xs leading-none">{tab.emoji}</span>
                  <span
                    className="tracking-wide leading-tight"
                    style={{
                      fontSize: '9px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#FFFFFF' : theme.textMuted,
                    }}
                  >
                    {t(`expenses.${tab.id}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-4 pt-4 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Suspense fallback={<TabLoader theme={theme} />}>
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

      {/* ── Global FAB for Weekly/Monthly/Yearly tabs ── */}
      {showFab && (
        <motion.button
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => setShowAddSheet(true)}
          className="fixed bottom-20 right-5 z-[999] flex items-center justify-center"
          style={{
            width: 56, height: 56,
            borderRadius: '50%',
            backgroundColor: theme.accentPrimary,
            boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
          }}
        >
          <Plus size={26} color="#fff" />
        </motion.button>
      )}

      {/* ── Global Add Entry Sheet ── */}
      {createPortal(
        <AnimatePresence>
          {showAddSheet && (
            <Suspense fallback={null}>
              <AddEntrySheet
                onSave={() => { setShowAddSheet(false); setRefreshKey(k => k + 1); }}
                onClose={() => setShowAddSheet(false)}
              />
            </Suspense>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
