import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useSettingsStore } from './store/useSettingsStore';
import { CrashlyticsService } from './lib/analytics';
import { useCrashContext } from './hooks/useCrashContext';
import { AnalyticsService } from './services/analyticsService';
import { setupErrorHandling } from './utils/errorHandler';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FeatureFlagService } from './services/featureFlags.service';
import { UpdateChecker } from './components/UpdateChecker';
import { APP_VERSION } from './config/app';
import { Capacitor } from '@capacitor/core';
import Layout from './components/Layout';
import Home from './pages/Home';
import Calculators from './pages/Calculators';
import Schemes from './pages/Schemes';
import SchemeDetail from './pages/SchemeDetail';
import ExpenseTracker from './pages/ExpenseTracker';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

// Calculators
import EMICalculator from './pages/EMICalculator';
import SIPCalculator from './pages/SIPCalculator';
import FDCalculator from './pages/FDCalculator';
import CompoundInterestCalculator from './pages/CompoundInterestCalculator';
import IncomeTaxCalculator from './pages/IncomeTaxCalculator';
import SalaryHikeCalculator from './pages/SalaryHikeCalculator';
import HRACalculator from './pages/HRACalculator';
import RDCalculator from './pages/RDCalculator';
import SimpleInterestCalculator from './pages/SimpleInterestCalculator';
import LumpsumCalculator from './pages/LumpsumCalculator';
import SWPCalculator from './pages/SWPCalculator';

// PPF Calculators
import AdvancedPPFCalculator from './pages/AdvancedPPFCalculator';
import NPSCalculator from './pages/NPSCalculator';
import EPFCalculator from './pages/EPFCalculator';
import GratuityCalculator from './pages/GratuityCalculator';
import SSYCalculator from './pages/SSYCalculator';
import NSCCalculator from './pages/NSCCalculator';
import KVPCalculator from './pages/KVPCalculator';
import POMISCalculator from './pages/POMISCalculator';
import SCSSCalculator from './pages/SCSSCalculator';
import POTDCalculator from './pages/POTDCalculator';
import BreakEvenCalculator from './pages/BreakEvenCalculator';
import OverdraftCalculator from './pages/OverdraftCalculator';
import CAGRCalculator from './pages/CAGRCalculator';

// New Calculators
import PropertyCalculator from './pages/PropertyCalculator';
import GSTCalculator from './pages/GSTCalculator';
import ScientificCalculator from './pages/ScientificCalculator';
import BudgetTracker from './pages/BudgetTracker';
import GoalPlanner from './pages/GoalPlanner';
import AIFinancialAssistant from './pages/AIFinancialAssistant';
import CompareCalculator from './pages/CompareCalculator';
import AgeCalculator from './pages/AgeCalculator';
import WorldClock from './pages/WorldClock';


// Support Pages
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import About from './pages/About';
import DataSafety from './pages/DataSafety';
import SavedCalculations from './pages/SavedCalculations';
import CalculationHistory from './pages/CalculationHistory';
import BookmarkedSchemes from './pages/BookmarkedSchemes';
import Notifications from './pages/Notifications';


import GlobalDisclaimerModal from './components/GlobalDisclaimerModal';
import { NotificationScheduler } from './services/NotificationScheduler';
import ValidatorPage from './pages/ValidatorPage';
import { PdfActionSheet } from './components/PdfActionSheet';
import WebLandingPage from './pages/WebLandingPage';

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

    // Attach active screen to Crashlytics on every route change (Part 6)
    useCrashContext();
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        document.documentElement.classList.toggle('light', !darkMode);
    }, [darkMode]);

    // Analytics + Crashlytics + Feature Flags init
    useEffect(() => {
        const initAnalytics = async () => {
            setupErrorHandling();
            await CrashlyticsService.initialize();
            await CrashlyticsService.setCustomKey('app_version', APP_VERSION);
            await CrashlyticsService.setCustomKey('platform', Capacitor.getPlatform());
            await FeatureFlagService.load();
            // Initialize generic analytics wrapper
            await AnalyticsService.initialize();
            AnalyticsService.trackScreenView({ screen_name: 'App_Open' });
        };
        initAnalytics();
        // Run notification scheduler (at most once every 23h)
        NotificationScheduler.initialize();
    }, []);

    // Android hardware back button — double-tap to exit on home, navigate back elsewhere
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const backHandler = CapApp.addListener('backButton', () => {
            if (location.pathname === '/') {
                const now = Date.now();
                if (now - lastBackPress.current < 2000) {
                    // Second press within 2 seconds — exit app
                    CapApp.exitApp();
                } else {
                    // First press — show toast
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
            <GlobalDisclaimerModal />
            <BackToast visible={showBackToast} />
            <UpdateChecker />
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
                    <Route path="/calculator/ppf-advanced" element={<AdvancedPPFCalculator />} />
                    <Route path="/dev/validator" element={<ValidatorPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}

export default function App() {
    const isNativePlatform =
        Capacitor.isNativePlatform() ||
        window.location.protocol === 'capacitor:' ||
        (window as any).__CAPACITOR__;

    // Web detection — more reliable
    const isWebBrowser =
        !isNativePlatform &&
        (window.location.protocol === 'https:' ||
            window.location.protocol === 'http:');

    if (isWebBrowser) {
        return <WebLandingPage />;
    }

    return (
        <ErrorBoundary>
            <BrowserRouter>
                <AppContent />
            </BrowserRouter>
        </ErrorBoundary>
    );
}
