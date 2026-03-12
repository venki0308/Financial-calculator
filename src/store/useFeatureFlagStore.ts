import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FeatureFlag {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
}

interface FeatureFlagState {
    features: FeatureFlag[];
    calculatorStates: Record<string, boolean>;
    toggleFeature: (id: string) => void;
    toggleCalculator: (name: string) => void;
    isFeatureEnabled: (id: string) => boolean;
    isCalculatorEnabled: (name: string) => boolean;
    setFeatures: (features: FeatureFlag[]) => void;
}

const defaultFeatures: FeatureFlag[] = [
    { id: 'pdfExport', name: 'PDF Export', description: 'Export calculations as PDF', enabled: true },
    { id: 'excelExport', name: 'Excel Export', description: 'Export calculations as Excel', enabled: true },
    { id: 'centralSchemes', name: 'Central Government Schemes', description: 'Access to central schemes', enabled: true },
    { id: 'calcHistory', name: 'Calculation History', description: 'Track calculation history', enabled: true },
    { id: 'savedCalcs', name: 'Saved Calculations', description: 'Save and revisit calculations', enabled: true },
    { id: 'budgetTracker', name: 'Budget Tracker', description: 'Monthly budget tracking', enabled: true },
    { id: 'darkMode', name: 'Dark Mode', description: 'Toggle dark/light theme', enabled: true },
    { id: 'villageInterest', name: 'Village Interest Mode', description: 'Flat ₹/₹100 interest calculator', enabled: true },
];

const defaultCalcList = [
    'Income Tax', 'Salary Hike', 'HRA', 'Loan EMI', 'Fixed Deposit', 'Recurring Deposit', 'Compound Interest',
    'Simple Interest', 'SIP', 'Lumpsum', 'SWP', 'CAGR', 'Step Up SIP', 'Goal SIP', 'PPF', 'NPS', 'EPF',
    'Gratuity', 'Sukanya Samriddhi', 'NSC', 'KVP', 'Post Office MIS', 'Senior Citizen Savings', 'Post Office TD', 'Break Even'
];

export const useFeatureFlagStore = create<FeatureFlagState>()(
    persist(
        (set, get) => ({
            features: defaultFeatures,
            calculatorStates: Object.fromEntries(defaultCalcList.map(c => [c, true])),
            toggleFeature: (id) =>
                set((s) => ({
                    features: s.features.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f),
                })),
            toggleCalculator: (name) =>
                set((s) => ({
                    calculatorStates: { ...s.calculatorStates, [name]: !s.calculatorStates[name] },
                })),
            isFeatureEnabled: (id) => {
                const feature = get().features.find(f => f.id === id);
                return feature ? feature.enabled : true;
            },
            isCalculatorEnabled: (name) => {
                return get().calculatorStates[name] ?? true;
            },
            setFeatures: (features) => set({ features }),
        }),
        { name: 'feature-flags-storage' }
    )
);
