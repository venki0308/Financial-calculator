import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useSettingsStore } from './store/useSettingsStore';
import { CrashlyticsService } from './lib/analytics';
import { useCrashContext } from './hooks/useCrashContext';
import { usePageViewTracker } from './hooks/usePageViewTracker';
import { AnalyticsService } from './services/analyticsService';
import { setupErrorHandling } from './utils/errorHandler';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FeatureFlagService } from './services/featureFlags.service';
import { UpdateChecker } from './components/UpdateChecker';
import { APP_VERSION } from './config/app';
import { Capacitor } from '@capacitor/core';
import { NotificationScheduler } from './services/NotificationScheduler';
import { StatusBar, Style } from '@capacitor/status-bar';

// WebLandingPage — static import (first page web users see, must not lazy-load)
import WebLandingPage from './pages/WebLandingPage';

// App layout + main pages — lazy loaded
const Layout                     = lazy(() => import('./components/Layout'));
const Home                       = lazy(() => import('./pages/Home'));
const Calculators                = lazy(() => import('./pages/Calculators'));
const Schemes                    = lazy(() => import('./pages/Schemes'));
const SchemeDetail               = lazy(() => import('./pages/SchemeDetail'));
const ExpenseTracker             = lazy(() => import('./pages/ExpenseTracker'));
const Profile                    = lazy(() => import('./pages/Profile'));
const Settings                   = lazy(() => import('./pages/Settings'));

// Calculator pages — lazy loaded
const EMICalculator              = lazy(() => import('./pages/EMICalculator'));
const SIPCalculator              = lazy(() => import('./pages/SIPCalculator'));
const FDCalculator               = lazy(() => import('./pages/FDCalculator'));
const CompoundInterestCalculator = lazy(() => import('./pages/CompoundInterestCalculator'));
const IncomeTaxCalculator        = lazy(() => import('./pages/IncomeTaxCalculator'));
const SalaryHikeCalculator       = lazy(() => import('./pages/SalaryHikeCalculator'));
const HRACalculator              = lazy(() => import('./pages/HRACalculator'));
const RDCalculator               = lazy(() => import('./pages/RDCalculator'));
const SimpleInterestCalculator   = lazy(() => import('./pages/SimpleInterestCalculator'));
const LumpsumCalculator          = lazy(() => import('./pages/LumpsumCalculator'));
const SWPCalculator              = lazy(() => import('./pages/SWPCalculator'));
const CAGRCalculator             = lazy(() => import('./pages/CAGRCalculator'));

// PPF / Retirement / Post-Office Calculators — lazy loaded
const AdvancedPPFCalculator      = lazy(() => import('./pages/AdvancedPPFCalculator'));
const NPSCalculator              = lazy(() => import('./pages/NPSCalculator'));
const EPFCalculator              = lazy(() => import('./pages/EPFCalculator'));
const GratuityCalculator         = lazy(() => import('./pages/GratuityCalculator'));
const SSYCalculator              = lazy(() => import('./pages/SSYCalculator'));
const NSCCalculator              = lazy(() => import('./pages/NSCCalculator'));
const KVPCalculator              = lazy(() => import('./pages/KVPCalculator'));
const POMISCalculator            = lazy(() => import('./pages/POMISCalculator'));
const SCSSCalculator             = lazy(() => import('./pages/SCSSCalculator'));
const POTDCalculator             = lazy(() => import('./pages/POTDCalculator'));
const BreakEvenCalculator        = lazy(() => import('./pages/BreakEvenCalculator'));
const OverdraftCalculator        = lazy(() => import('./pages/OverdraftCalculator'));

// New Calculators — lazy loaded
const PropertyCalculator         = lazy(() => import('./pages/PropertyCalculator'));
const AdvancedMortgageCalculator = lazy(() => import('./pages/AdvancedMortgageCalculator'));
const GSTCalculator              = lazy(() => import('./pages/GSTCalculator'));
const ScientificCalculator       = lazy(() => import('./pages/ScientificCalculator'));
const BudgetTracker              = lazy(() => import('./pages/BudgetTracker'));
const GoalPlanner                = lazy(() => import('./pages/GoalPlanner'));
const AIFinancialAssistant       = lazy(() => import('./pages/AIFinancialAssistant'));
const CompareCalculator          = lazy(() => import('./pages/CompareCalculator'));
const AgeCalculator              = lazy(() => import('./pages/AgeCalculator'));
const WorldClock                 = lazy(() => import('./pages/WorldClock'));
const InsuranceCalculator        = lazy(() => import('./pages/InsuranceCalculator'));
const InsuranceCompare           = lazy(() => import('./pages/InsuranceCompare'));

// Support Pages — lazy loaded
const PrivacyPolicy              = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService             = lazy(() => import('./pages/TermsOfService'));
const About                      = lazy(() => import('./pages/About'));
const DataSafety                 = lazy(() => import('./pages/DataSafety'));
const SavedCalculations          = lazy(() => import('./pages/SavedCalculations'));
const CalculationHistory         = lazy(() => import('./pages/CalculationHistory'));
const BookmarkedSchemes          = lazy(() => import('./pages/BookmarkedSchemes'));
const Notifications              = lazy(() => import('./pages/Notifications'));
const ValidatorPage              = lazy(() => import('./pages/ValidatorPage'));

// App-level modals — lazy loaded (native app only)
const GlobalDisclaimerModal      = lazy(() => import('./components/GlobalDisclaimerModal'));
const PdfActionSheet             = lazy(() => import('./components/PdfActionSheet').then(m => ({ default: m.PdfActionSheet })));

// Web legal pages — lazy loaded
const WebPrivacyPolicy           = lazy(() => import('./pages/legal/PrivacyPolicy'));
const WebAbout                   = lazy(() => import('./pages/legal/About'));
const WebDataPrivacy             = lazy(() => import('./pages/legal/DataPrivacy'));
const WebTermsOfService          = lazy(() => import('./pages/legal/TermsOfService'));

const LazyFallback = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '14px', color: '#666' }}>
        Loading...
    </div>
);

// Toast component for back-press notification
function BackToast({ visible }: { visible: boolean }) {
    if (!visible) return null;
    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in">
            <div className="px-5 py-2.5 rounded-full bg-card border-border border border-slate-700 shadow-xl">
                <p className="text-foreground text-xs font-medium whitespace-nowrap">Press back again to exit FinCalix</p>
            </div>
        </div>
    );
}

function AppContent() {
    const darkMode = useSettingsStore((s) => s.darkMode);
    const navigate = useNavigate();
    const location = useLocation();
    const lastBackPress = useRef<number>(0);
    const [showBackToast, setShowBackToast] = useState(false);

    useCrashContext();
    usePageViewTracker();
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        document.documentElement.classList.toggle('light', !darkMode);

        // Sync the native Android status bar with the current theme.
        if (Capacitor.isNativePlatform()) {
            try {
                // Use ONLY the native bridge for icon color and background handling.
                // The Capacitor StatusBar plugin internally conflicts with the
                // modern WindowInsetsControllerCompat API on API 35+ devices, causing
                // theme styles to toggle randomly or revert to wrong icon colors.
                const bridge = (window as any).FinCalixBridge;
                if (bridge && bridge.setStatusBarStyle) {
                    bridge.setStatusBarStyle(darkMode);
                }
            } catch (_) {
                // Bridge not available — running on web or old native
            }
        }
    }, [darkMode]);

    useEffect(() => {
        const initAnalytics = async () => {
            setupErrorHandling();
            await CrashlyticsService.initialize();
            await CrashlyticsService.setCustomKey('app_version', APP_VERSION);
            await CrashlyticsService.setCustomKey('platform', Capacitor.getPlatform());
            await FeatureFlagService.load();
            await AnalyticsService.initialize();
            AnalyticsService.trackScreenView({ screen_name: 'App_Open' });
        };
        initAnalytics();
        NotificationScheduler.initialize();

        // ── Android WebView Input Bug Fix ──────────────────────────────
        // Layer 2 (JS) defense — the native onActionModeStarted in
        // MainActivity.java is the primary kill-switch for the Android
        // clipboard toolbar. These JS handlers are a secondary safety net.

        // Prevent Android clipboard toolbar by clearing rogue selections
        const onSelectionChange = () => {
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) {
                const activeEl = document.activeElement;
                if (!activeEl || (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA')) {
                    selection.removeAllRanges();
                }
            }
        };
        document.addEventListener('selectionchange', onSelectionChange);

        // Block context menu on ALL elements — the native ActionMode
        // override handles clipboard, so we don't need web context menus.
        const onContextMenu = (e: Event) => {
            e.preventDefault();
        };
        document.addEventListener('contextmenu', onContextMenu);

        // Prevent selectstart on non-input elements to stop Android
        // from ever starting text selection outside input fields.
        const onSelectStart = (e: Event) => {
            const target = e.target as HTMLElement;
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        };
        document.addEventListener('selectstart', onSelectStart);

        // On scroll/touchmove, blur the active input to dismiss any
        // lingering cursor teardrops that persist above followingfields.
        const onTouchMove = () => {
            const active = document.activeElement as HTMLElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
                // Small delay so the scroll initiates before blur
                requestAnimationFrame(() => {
                    // Only blur if user is actually scrolling, not just adjusting
                    // the cursor position within the field.
                    const selection = window.getSelection();
                    if (selection) selection.removeAllRanges();
                });
            }
        };
        document.addEventListener('touchmove', onTouchMove, { passive: true });

        return () => {
            document.removeEventListener('selectionchange', onSelectionChange);
            document.removeEventListener('contextmenu', onContextMenu);
            document.removeEventListener('selectstart', onSelectStart);
            document.removeEventListener('touchmove', onTouchMove);
        };
    }, []);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const backHandler = CapApp.addListener('backButton', () => {
            if (location.pathname === '/') {
                const now = Date.now();
                if (now - lastBackPress.current < 2000) {
                    CapApp.exitApp();
                } else {
                    lastBackPress.current = now;
                    setShowBackToast(true);
                    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                    toastTimerRef.current = setTimeout(() => setShowBackToast(false), 2000);
                }
            } else {
                navigate(-1);
            }
        });

        return () => {
            backHandler.then((h: { remove: () => void }) => h.remove());
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, [location, navigate]);

    return (
        <>
            <BackToast visible={showBackToast} />
            <UpdateChecker />
            <Suspense fallback={LazyFallback}>
                <GlobalDisclaimerModal />
                <PdfActionSheet />
                <Routes>
                    {/* Support pages (no nav bar) */}
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                    <Route path="/data-safety" element={<DataSafety />} />

                    {/* Main app — all routes public, no auth required */}
                    <Route element={<Layout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/calculators" element={<Calculators />} />
                        <Route path="/schemes" element={<Schemes />} />
                        <Route path="/scheme/:id" element={<SchemeDetail />} />
                        <Route path="/expenses" element={<ExpenseTracker />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/profile/saved" element={<SavedCalculations />} />
                        <Route path="/profile/history" element={<CalculationHistory />} />
                        <Route path="/profile/bookmarks" element={<BookmarkedSchemes />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/notifications" element={<Notifications />} />
                        <Route path="/about" element={<About />} />

                        {/* Calculators */}
                        <Route path="/calculator/loan-emi" element={<EMICalculator />} />
                        <Route path="/calculator/sip" element={<SIPCalculator />} />
                        <Route path="/calculator/fixed-deposit" element={<FDCalculator />} />
                        <Route path="/calculator/compound-interest" element={<CompoundInterestCalculator />} />
                        <Route path="/calculator/income-tax" element={<IncomeTaxCalculator />} />
                        <Route path="/calculator/salary-hike" element={<SalaryHikeCalculator />} />
                        <Route path="/calculator/hra" element={<HRACalculator />} />
                        <Route path="/calculator/recurring-deposit" element={<RDCalculator />} />
                        <Route path="/calculator/simple-interest" element={<SimpleInterestCalculator />} />
                        <Route path="/calculator/lumpsum" element={<LumpsumCalculator />} />
                        <Route path="/calculator/swp" element={<SWPCalculator />} />
                        <Route path="/calculator/cagr" element={<CAGRCalculator />} />
                        <Route path="/calculator/step-up-sip" element={<Navigate to="/calculator/sip" replace />} />
                        <Route path="/calculator/goal-sip" element={<Navigate to="/calculator/sip" replace />} />
                        <Route path="/calculator/ppf" element={<AdvancedPPFCalculator />} />
                        <Route path="/calculator/nps" element={<NPSCalculator />} />
                        <Route path="/calculator/epf" element={<EPFCalculator />} />
                        <Route path="/calculator/gratuity" element={<GratuityCalculator />} />
                        <Route path="/calculator/sukanya-samriddhi" element={<SSYCalculator />} />
                        <Route path="/calculator/nsc" element={<NSCCalculator />} />
                        <Route path="/calculator/kvp" element={<KVPCalculator />} />
                        <Route path="/calculator/post-office-mis" element={<POMISCalculator />} />
                        <Route path="/calculator/senior-citizen-savings" element={<SCSSCalculator />} />
                        <Route path="/calculator/post-office-td" element={<POTDCalculator />} />

                        <Route path="/calculator/break-even" element={<BreakEvenCalculator />} />
                        <Route path="/calculator/overdraft" element={<OverdraftCalculator />} />

                        {/* New Calculators */}
                        <Route path="/calculator/property" element={<PropertyCalculator />} />
                        <Route path="/calculator/mortgage-calculator" element={<AdvancedMortgageCalculator />} />
                        <Route path="/calculator/advanced-sip" element={<Navigate to="/calculator/sip" replace />} />
                        <Route path="/calculator/gst" element={<GSTCalculator />} />
                        <Route path="/calculator/car-loan" element={<EMICalculator />} />
                        <Route path="/calculator/personal-loan" element={<EMICalculator />} />
                        <Route path="/calculator/education-loan" element={<EMICalculator />} />
                        <Route path="/budget-tracker" element={<BudgetTracker />} />
                        <Route path="/goal-planner" element={<GoalPlanner />} />
                        <Route path="/financial-advisor" element={<AIFinancialAssistant />} />
                        <Route path="/ai-advisor" element={<Navigate to="/financial-advisor" replace />} />
                        <Route path="/compare" element={<CompareCalculator />} />
                        <Route path="/calculator/scientific" element={<ScientificCalculator />} />
                        <Route path="/calculator/age" element={<AgeCalculator />} />
                        <Route path="/world-clock" element={<WorldClock />} />
                        <Route path="/calculator/insurance" element={<InsuranceCalculator />} />
                        <Route path="/insurance-compare" element={<InsuranceCompare />} />
                        <Route path="/calculator/ppf-advanced" element={<AdvancedPPFCalculator />} />
                        <Route path="/dev/validator" element={<ValidatorPage />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </>
    );
}

export default function App() {
    const urlParams = new URLSearchParams(window.location.search);
    const isDevUrl = urlParams.get('dev') === 'true';
    if (isDevUrl) {
        localStorage.setItem('fincalix_dev_access', 'true');
    }
    const isDevMode = localStorage.getItem('fincalix_dev_access') === 'true';

    // CASE 1: Native Android/iOS → always show full app
    // CASE 2: Browser with dev mode → show full app for testing
    if (Capacitor.isNativePlatform() || isDevMode) {
        return (
            <ErrorBoundary>
                <BrowserRouter>
                    <AppContent />
                </BrowserRouter>
            </ErrorBoundary>
        );
    }

    // CASE 3: Regular browser visitor → landing page + legal routes only
    return (
        <BrowserRouter>
            <Suspense fallback={LazyFallback}>
                <Routes>
                    <Route path="/" element={<WebLandingPage />} />
                    <Route path="/privacy-policy" element={<WebPrivacyPolicy />} />
                    <Route path="/about" element={<WebAbout />} />
                    <Route path="/data-privacy" element={<WebDataPrivacy />} />
                    <Route path="/terms-of-service" element={<WebTermsOfService />} />
                    <Route path="*" element={<WebLandingPage />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
