import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useSettingsStore } from './store/useSettingsStore';
import { AnalyticsService } from './lib/analytics';
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
import CAGRCalculator from './pages/CAGRCalculator';
import StepUpSIPCalculator from './pages/StepUpSIPCalculator';
import GoalSIPCalculator from './pages/GoalSIPCalculator';
import PPFCalculator from './pages/PPFCalculator';
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

// New Calculators
import PropertyCalculator from './pages/PropertyCalculator';
import AdvancedSIPCalculator from './pages/AdvancedSIPCalculator';
import GSTCalculator from './pages/GSTCalculator';
import CarLoanCalculator from './pages/CarLoanCalculator';
import BudgetTracker from './pages/BudgetTracker';

// Support Pages
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import About from './pages/About';
import SavedCalculations from './pages/SavedCalculations';
import CalculationHistory from './pages/CalculationHistory';
import BookmarkedSchemes from './pages/BookmarkedSchemes';
import Notifications from './pages/Notifications';


function AppContent() {
    const darkMode = useSettingsStore((s) => s.darkMode);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        document.documentElement.classList.toggle('light', !darkMode);
    }, [darkMode]);

    // Analytics + Feature Flags init
    useEffect(() => {
        const initAnalytics = async () => {
            await FeatureFlagService.load();
            await AnalyticsService.trackAppOpened();
            await AnalyticsService.setUserProperties({
                app_version: APP_VERSION,
                platform: Capacitor.getPlatform(),
            });
        };
        initAnalytics();
    }, []);

    useEffect(() => {
        const backHandler = CapApp.addListener('backButton', () => {
            if (location.pathname === '/') {
                CapApp.exitApp();
            } else {
                navigate(-1);
            }
        });

        return () => {
            backHandler.then((h: { remove: () => void }) => h.remove());
        };
    }, [location, navigate]);

    return (
        <>
            <UpdateChecker />
            <Routes>
                {/* Support pages (no nav bar) */}
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />

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
                    <Route path="/calculator/step-up-sip" element={<StepUpSIPCalculator />} />
                    <Route path="/calculator/goal-sip" element={<GoalSIPCalculator />} />
                    <Route path="/calculator/ppf" element={<PPFCalculator />} />
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

                    {/* New Calculators */}
                    <Route path="/calculator/property" element={<PropertyCalculator />} />
                    <Route path="/calculator/advanced-sip" element={<AdvancedSIPCalculator />} />
                    <Route path="/calculator/gst" element={<GSTCalculator />} />
                    <Route path="/calculator/car-loan" element={<CarLoanCalculator />} />
                    <Route path="/budget-tracker" element={<BudgetTracker />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}
