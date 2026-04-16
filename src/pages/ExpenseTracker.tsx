import { useState, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CalendarDays, Calendar, BarChart3, TrendingUp, FileText, Target, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpenseTheme } from '../theme/expenseTheme';
import { AnalyticsService } from '../lib/analytics';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { migrateFromOldStore, getAllCategories, getAllAccounts } from '../utils/expenseStorage';
import { getTodayStr } from '../utils/expenseCalculations';
import type { Entry } from '../types/expense';

// ─── LAZY-LOADED TAB COMPONENTS ─────────────────────────────
const DailyTab = lazy(() => import('./expenses/DailyTab'));
const WeeklyTab = lazy(() => import('./expenses/WeeklyTab'));
const MonthlyTab = lazy(() => import('./expenses/MonthlyTab'));
const YearlyTab = lazy(() => import('./expenses/YearlyTab'));
const ReportsTab = lazy(() => import('./expenses/ReportsTab'));
const BudgetTab = lazy(() => import('./expenses/BudgetTab'));
const SubscriptionsTab = lazy(() => import('./expenses/SubscriptionsTab'));
const CreditCardsTab = lazy(() => import('./expenses/CreditCards'));
const AddEntrySheet = lazy(() => import('../components/AddEntrySheet'));

// ─── TAB DEFINITIONS ─────────────────────────────────────────
// All valid tab IDs — includes hidden tabs reachable from BudgetTab
const ALL_TAB_IDS = ['budget', 'daily', 'weekly', 'monthly', 'yearly', 'subscriptions', 'creditCards', 'reports'] as const;
type TabId = typeof ALL_TAB_IDS[number];

// Only these tabs appear in the visible tab bar (Subscriptions & Credit
// Cards moved into BudgetTab as summary cards to reduce tab-bar overflow)
const TABS = [
  { id: 'budget',  labelKey: 'expenses.budget',  icon: Target,       emoji: '\u{1F3AF}' },
  { id: 'daily',   labelKey: 'expenses.daily',   icon: CalendarDays, emoji: '\u{1F4C5}' },
  { id: 'weekly',  labelKey: 'expenses.weekly',   icon: Calendar,     emoji: '\u{1F4C6}' },
  { id: 'monthly', labelKey: 'expenses.monthly', icon: BarChart3,    emoji: '\u{1F4CA}' },
  { id: 'yearly',  labelKey: 'expenses.yearly',  icon: TrendingUp,   emoji: '\u{1F4C8}' },
  { id: 'reports', labelKey: 'expenses.reports',  icon: FileText,     emoji: '\u{1F4CB}' },
] as const;

const TAB_SUBTITLES: Record<TabId, string> = {
  daily:         'expenses.dailySubtitle',
  weekly:        'expenses.weeklySubtitle',
  monthly:       'expenses.monthlySubtitle',
  yearly:        'expenses.yearlySubtitle',
  subscriptions: 'expenses.subscriptionsSubtitle',
  reports:       'expenses.reportsSubtitle',
  budget:        'expenses.budgetSubtitle',
  creditCards:   'expenses.creditCardsSubtitle',
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
  const location = useLocation();
  const theme = useExpenseTheme();
  const [activeTab, setActiveTab] = useState<TabId>('budget');

  // Read Router state to switch tab (e.g. after CreditCardAdd save)
  useEffect(() => {
    const state = location.state as { switchTab?: string } | null;
    if (state?.switchTab && (ALL_TAB_IDS as readonly string[]).includes(state.switchTab)) {
      setActiveTab(state.switchTab as TabId);
      // Clear only the React Router state slot, preserving its navigation
      // key. A raw `replaceState({}, '')` wipes router's internal key and
      // breaks scroll restoration / back navigation on some paths.
      const current = window.history.state ?? {};
      window.history.replaceState({ ...current, usr: null }, '');
    }
  }, [location.state]);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // Edit state — when set, the AddEntrySheet opens in edit mode pre-filled
  // with this entry. Tabs (Weekly/Monthly) call requestEdit(entry) to trigger.
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const requestEdit = useCallback((entry: Entry) => {
    setEditingEntry(entry);
    setShowAddSheet(true);
  }, []);

  const handleSheetClose = useCallback(() => {
    setShowAddSheet(false);
    setEditingEntry(null);
  }, []);

  const handleSheetSave = useCallback(() => {
    setShowAddSheet(false);
    setEditingEntry(null);
    setRefreshKey((k) => k + 1);
  }, []);

  // Tabs that show the global FAB (Daily has its own)
  const showFab = ['weekly', 'monthly', 'yearly'].includes(activeTab);
  // Hidden tabs (accessible from BudgetTab, not in the tab bar)
  const isHiddenTab = activeTab === 'subscriptions' || activeTab === 'creditCards';

  // Migrate old data on first mount
  useEffect(() => {
    migrateFromOldStore();
    AnalyticsService.trackScreen('Expense_Tracker');
  }, []);

  // Cross-tab routing: BudgetTab dispatches a custom event from its
  // "Manage Subscriptions" button so we can switch tabs without a
  // route change. Add other emitters here if needed.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string' && (ALL_TAB_IDS as readonly string[]).includes(detail)) {
        setActiveTab(detail as TabId);
      }
    };
    window.addEventListener('fincalix:switch-expense-tab', handler);
    return () => window.removeEventListener('fincalix:switch-expense-tab', handler);
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
        className="sticky top-0 z-30 backdrop-blur-xl border-b pt-10"
        style={{
          backgroundColor: theme.bgCard + 'F2',
          borderColor: theme.borderSubtle,
        }}
      >
        {/* Title row */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => isHiddenTab ? setActiveTab('budget') : navigate(-1)}
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

        {/* ── Tab Bar (min 48px touch target per Material guidelines) ── */}
        {!isHiddenTab && (
          <div className="px-3 pb-3">
            <div className="flex rounded-2xl p-1 gap-1" style={{ backgroundColor: theme.bgPrimary }}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex-1 flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200"
                    style={{
                      minHeight: 52,
                      paddingTop: 8,
                      paddingBottom: 8,
                      backgroundColor: isActive ? theme.accentPrimary : 'transparent',
                      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.emoji}</span>
                    <span
                      className="tracking-wide leading-tight"
                      style={{
                        fontSize: '10px',
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
        )}
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
              {/* refreshKey is bumped after the global FAB saves an entry, so
                  Weekly/Monthly/Yearly re-fetch from storage immediately
                  instead of waiting for a tab switch.
                  onEditEntry lets the tabs request edit mode for an entry —
                  parent then opens the shared AddEntrySheet pre-filled. */}
              {activeTab === 'daily' && <DailyTab />}
              {activeTab === 'weekly' && <WeeklyTab refreshKey={refreshKey} onEditEntry={requestEdit} />}
              {activeTab === 'monthly' && <MonthlyTab refreshKey={refreshKey} onEditEntry={requestEdit} />}
              {activeTab === 'yearly' && <YearlyTab refreshKey={refreshKey} />}
              {activeTab === 'subscriptions' && <SubscriptionsTab />}
              {activeTab === 'reports' && <ReportsTab />}
              {activeTab === 'budget' && <BudgetTab />}
              {activeTab === 'creditCards' && <CreditCardsTab />}
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
          className="fixed bottom-28 right-5 z-[999] flex items-center justify-center"
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

      {/* ── Global Add / Edit Entry Sheet ──
           Opens for two reasons:
             1. User taps the global FAB → showAddSheet = true (create mode)
             2. A child tab calls requestEdit(entry) → editingEntry set + sheet opens (edit mode) */}
      {createPortal(
        <AnimatePresence>
          {showAddSheet && (
            <Suspense fallback={null}>
              <AddEntrySheet
                editEntry={editingEntry}
                onSave={handleSheetSave}
                onClose={handleSheetClose}
              />
            </Suspense>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
