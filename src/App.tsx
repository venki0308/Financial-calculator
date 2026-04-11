import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { App as CapApp } from '@capacitor/app';
import { useSettingsStore } from './store/useSettingsStore';
import { CrashlyticsService } from './lib/analytics';
import { useCrashContext } from './hooks/useCrashContext';
import { usePageViewTracker } from './hooks/usePageViewTracker';
import { useTrackCalculator } from './hooks/useTrackCalculator';
import { AnalyticsService } from './services/analyticsService';
import { setupErrorHandling } from './utils/errorHandler';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CibilProvider } from './context/CibilContext';
import { FeatureFlagService } from './services/featureFlags.service';
import { UpdateChecker } from './components/UpdateChecker';
import { APP_VERSION } from './config/app';
import { Capacitor } from '@capacitor/core';
import { NotificationScheduler } from './services/NotificationScheduler';
import { StatusBar, Style } from '@capacitor/status-bar';

// WebLandingPage — static import (first page web users see, must not lazy-load)
import WebLandingPage from './pages/WebLandingPage';

// ─── Retry wrapper for lazy imports ────────────────────────────────────────
// When a chunk fails to load (stale cache after deploy, network hiccup, etc.)
// this retries up to 3 times with cache-busting, then forces a full reload.
function lazyRetry<T extends { default: any }>(
    factory: () => Promise<T>,
    retries = 3,
): Promise<T> {
    return factory().catch((err: Error) => {
        if (retries <= 0) {
            // All retries exhausted — if it's a chunk error, reload the page once
            const isChunkError = err.message?.includes('dynamically imported module')
                || err.message?.includes('Failed to fetch')
                || err.message?.includes('ChunkLoadError')
                || err.message?.includes('Loading chunk');
            if (isChunkError) {
                const reloadKey = 'fncx_chunk_reload';
                if (!sessionStorage.getItem(reloadKey)) {
                    sessionStorage.setItem(reloadKey, '1');
                    window.location.reload();
                }
            }
            throw err;
        }
        // Wait briefly then retry with cache bust
        return new Promise<T>((resolve) => setTimeout(resolve, 1000))
            .then(() => lazyRetry(factory, retries - 1));
    });
}

const lr = <T extends { default: any }>(factory: () => Promise<T>) =>
    lazy(() => lazyRetry(factory));

// App layout + main pages — lazy loaded with retry
const Layout                     = lr(() => import('./components/Layout'));
const Home                       = lr(() => import('./pages/Home'));
const Calculators                = lr(() => import('./pages/Calculators'));
const Schemes                    = lr(() => import('./pages/Schemes'));
const SchemeDetail               = lr(() => import('./pages/SchemeDetail'));
const ExpenseTracker             = lr(() => import('./pages/ExpenseTracker'));
const BankAccounts               = lr(() => import('./pages/BankAccounts'));
const Profile                    = lr(() => import('./pages/Profile'));
const Settings                   = lr(() => import('./pages/Settings'));

// Calculator pages — lazy loaded with retry
const EMICalculator              = lr(() => import('./pages/EMICalculator'));
const SIPCalculator              = lr(() => import('./pages/SIPCalculator'));
const FDCalculator               = lr(() => import('./pages/FDCalculator'));
const CompoundInterestCalculator = lr(() => import('./pages/CompoundInterestCalculator'));
const IncomeTaxCalculator        = lr(() => import('./pages/IncomeTaxCalculator'));
const SalaryHikeCalculator       = lr(() => import('./pages/SalaryHikeCalculator'));
const HRACalculator              = lr(() => import('./pages/HRACalculator'));
const RDCalculator               = lr(() => import('./pages/RDCalculator'));
const SimpleInterestCalculator   = lr(() => import('./pages/SimpleInterestCalculator'));
const LumpsumCalculator          = lr(() => import('./pages/LumpsumCalculator'));
const SWPCalculator              = lr(() => import('./pages/SWPCalculator'));
const STPCalculator              = lr(() => import('./pages/STPCalculator'));
const PRAGCalculator             = lr(() => import('./pages/PRAGCalculator'));
const CAGRCalculator             = lr(() => import('./pages/CAGRCalculator'));

// PPF / Retirement / Post-Office Calculators — lazy loaded with retry
const AdvancedPPFCalculator      = lr(() => import('./pages/AdvancedPPFCalculator'));
const NPSCalculator              = lr(() => import('./pages/NPSCalculator'));
const EPFCalculator              = lr(() => import('./pages/EPFCalculator'));
const GratuityCalculator         = lr(() => import('./pages/GratuityCalculator'));
const SSYCalculator              = lr(() => import('./pages/SSYCalculator'));
const NSCCalculator              = lr(() => import('./pages/NSCCalculator'));
const KVPCalculator              = lr(() => import('./pages/KVPCalculator'));
const POMISCalculator            = lr(() => import('./pages/POMISCalculator'));
const SCSSCalculator             = lr(() => import('./pages/SCSSCalculator'));
const POTDCalculator             = lr(() => import('./pages/POTDCalculator'));
const BreakEvenCalculator        = lr(() => import('./pages/BreakEvenCalculator'));
const OverdraftCalculator        = lr(() => import('./pages/OverdraftCalculator'));

// New Calculators — lazy loaded with retry
const PropertyCalculator         = lr(() => import('./pages/PropertyCalculator'));
const AdvancedMortgageCalculator = lr(() => import('./pages/AdvancedMortgageCalculator'));
const GSTCalculator              = lr(() => import('./pages/GSTCalculator'));
const ScientificCalculator       = lr(() => import('./pages/ScientificCalculator'));
const BudgetTracker              = lr(() => import('./pages/BudgetTracker'));
const GoalPlanner                = lr(() => import('./pages/GoalPlanner'));
const AIFinancialAssistant       = lr(() => import('./pages/AIFinancialAssistant'));
const CompareCalculator          = lr(() => import('./pages/CompareCalculator'));
const AgeCalculator              = lr(() => import('./pages/AgeCalculator'));
const WorldClock                 = lr(() => import('./pages/WorldClock'));
const InsuranceCalculator        = lr(() => import('./pages/InsuranceCalculator'));
const InsuranceCompare           = lr(() => import('./pages/InsuranceCompare'));
const TwoWheelerLoanCalculator   = lr(() => import('./pages/TwoWheelerLoanCalculator'));
const GoldLoanCalculator         = lr(() => import('./pages/GoldLoanCalculator'));
const CibilScoreCalculator       = lr(() => import('./pages/CibilScoreCalculator'));
const CibilProfileSetup          = lr(() => import('./pages/CibilProfileSetup'));

// My Loans — lazy loaded with retry
const MyLoans                    = lr(() => import('./pages/MyLoans'));
const LoanDetail                 = lr(() => import('./pages/LoanDetail'));

// Support Pages — lazy loaded with retry
const PrivacyPolicy              = lr(() => import('./pages/PrivacyPolicy'));
const TermsOfService             = lr(() => import('./pages/TermsOfService'));
const About                      = lr(() => import('./pages/About'));
const DataSafety                 = lr(() => import('./pages/DataSafety'));
const SavedCalculations          = lr(() => import('./pages/SavedCalculations'));
const CalculationHistory         = lr(() => import('./pages/CalculationHistory'));
const BookmarkedSchemes          = lr(() => import('./pages/BookmarkedSchemes'));
const Notifications              = lr(() => import('./pages/Notifications'));
const ValidatorPage              = lr(() => import('./pages/ValidatorPage'));
const CreditCardAdd              = lr(() => import('./pages/expenses/CreditCardAdd'));
const CreditCardDetail           = lr(() => import('./pages/expenses/CreditCardDetail'));
const CreditCardPayoffCalculator = lr(() => import('./pages/CreditCardPayoffCalculator'));
const CreditCardInterestCalculator = lr(() => import('./pages/CreditCardInterestCalculator'));

// App-level modals — lazy loaded with retry (native app only)
const GlobalDisclaimerModal      = lr(() => import('./components/GlobalDisclaimerModal'));
// PdfActionSheet uses a named export (not default) so it needs the manual
// .then(m => ({ default: m.PdfActionSheet })) wrapper. Still goes through
// lazyRetry for chunk-load resilience.
const PdfActionSheet             = lazy(() => lazyRetry(() => import('./components/PdfActionSheet').then(m => ({ default: m.PdfActionSheet }))));

// Web legal pages — lazy loaded with retry
const WebPrivacyPolicy           = lr(() => import('./pages/legal/PrivacyPolicy'));
const WebAbout                   = lr(() => import('./pages/legal/About'));
const WebDataPrivacy             = lr(() => import('./pages/legal/DataPrivacy'));
const WebTermsOfService          = lr(() => import('./pages/legal/TermsOfService'));

const LazyFallback = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '14px', color: '#666' }}>
        Loading...
    </div>
);

// Toast component for back-press notification
function BackToast({ visible }: { visible: boolean }) {
    const { t } = useTranslation();
    if (!visible) return null;
    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in">
            <div className="px-5 py-2.5 rounded-full bg-card border-border border border-slate-700 shadow-xl">
                <p className="text-foreground text-xs font-medium whitespace-nowrap">{t('app.backToExit', 'Press back again to exit FinCalix')}</p>
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
    // Global "recently used" tracker — runs on EVERY navigation. The hook
    // filters to only paths that exist in the canonical `allCalcs` list, so
    // it covers all 37 calculators automatically (including ones whose paths
    // don't start with /calculator/, like /two-wheeler-loan and /gold-loan).
    useTrackCalculator();
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
        // Run data integrity check FIRST so any corrupt entries are repaired
        // before the rest of the app reads them.
        import('./utils/dataIntegrity').then(({ runDataIntegrityCheck }) => {
            const report = runDataIntegrityCheck();
            if (report.issues.length > 0) {
                CrashlyticsService.log(`Data integrity: ${report.issues.length} issue(s) repaired`);
            }
        });

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

    // ── Keyboard avoidance (Android/iOS) ──────────────────────────
    // Sets the WebView resize mode so the OS pushes content above the
    // soft keyboard, and scrolls focused inputs into view. Prevents
    // the keyboard from covering form fields on small phones.
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        let kbShowSub: { remove: () => void } | undefined;
        let kbHideSub: { remove: () => void } | undefined;

        (async () => {
            try {
                const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
                // 'native' mode: Android handles resize, content is pushed up
                await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
                await Keyboard.setScroll({ isDisabled: false });

                // When keyboard shows, scroll the focused input into view
                kbShowSub = await Keyboard.addListener('keyboardWillShow', () => {
                    const el = document.activeElement as HTMLElement | null;
                    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
                        // Defer to next frame so layout has settled
                        requestAnimationFrame(() => {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        });
                    }
                    document.body.classList.add('keyboard-visible');
                });
                kbHideSub = await Keyboard.addListener('keyboardWillHide', () => {
                    document.body.classList.remove('keyboard-visible');
                });
            } catch (err) {
                console.warn('[FinCalix] Keyboard plugin init failed', err);
            }
        })();

        return () => {
            kbShowSub?.remove();
            kbHideSub?.remove();
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
                        <Route path="/expenses/accounts" element={<BankAccounts />} />
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
                        <Route path="/calculator/stp" element={<STPCalculator />} />
                        <Route path="/calculator/prag" element={<PRAGCalculator />} />
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
                        <Route path="/my-loans" element={<MyLoans />} />
                        <Route path="/my-loans/:loanId" element={<LoanDetail />} />
                        {/* /calculator/ppf-advanced kept as redirect to canonical /calculator/ppf
                            so any existing bookmarks / shared links don't 404. */}
                        <Route path="/calculator/ppf-advanced" element={<Navigate to="/calculator/ppf" replace />} />
                        <Route path="/two-wheeler-loan" element={<TwoWheelerLoanCalculator />} />
                        <Route path="/gold-loan" element={<GoldLoanCalculator />} />
                        <Route path="/cibil-score" element={<CibilScoreCalculator />} />
                        <Route path="/cibil-profile" element={<CibilProfileSetup />} />
                        <Route path="/expenses/credit-cards/add" element={<CreditCardAdd />} />
                        <Route path="/expenses/credit-cards/:id" element={<CreditCardDetail />} />
                        <Route path="/calculator/credit-card-payoff" element={<CreditCardPayoffCalculator />} />
                        <Route path="/calculator/credit-card-interest" element={<CreditCardInterestCalculator />} />
                        <Route path="/dev/validator" element={<ValidatorPage />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </>
    );
}

export default function App() {
    // Web preview escape hatch: ?dev=true unlocks the in-browser web app shell
    // (same UI as the native app). Persisted to localStorage so it survives
    // reloads. Visitors land on the marketing site by default.
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev') === 'true') {
        localStorage.setItem('fincalix_dev_access', 'true');
    } else if (urlParams.get('dev') === 'false') {
        localStorage.removeItem('fincalix_dev_access');
    }
    const isDevMode = localStorage.getItem('fincalix_dev_access') === 'true';

    // CASE 1: Native Android/iOS → always show full app
    // CASE 2: Browser with dev mode → show full app for testing
    if (Capacitor.isNativePlatform() || isDevMode) {
        return (
            <ErrorBoundary>
                <CibilProvider>
                    <BrowserRouter>
                        <AppContent />
                    </BrowserRouter>
                </CibilProvider>
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
