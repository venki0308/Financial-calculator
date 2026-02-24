import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Calculation {
    id: string;
    type: string;
    inputs: Record<string, any>;
    result: any;
    timestamp: number;
}

interface CalculatorState {
    savedCalculations: Calculation[];
    history: Calculation[];
    addSaved: (calc: Calculation) => void;
    removeSaved: (id: string) => void;
    addHistory: (calc: Calculation) => void;
    clearHistory: () => void;
}

export const useCalculatorStore = create<CalculatorState>()(
    persist(
        (set) => ({
            savedCalculations: [],
            history: [],
            addSaved: (calc) => set((s) => ({ savedCalculations: [calc, ...s.savedCalculations] })),
            removeSaved: (id) => set((s) => ({ savedCalculations: s.savedCalculations.filter((c) => c.id !== id) })),
            addHistory: (calc) => set((s) => ({
                history: [calc, ...s.history.filter(h => h.id !== calc.id)].slice(0, 50)
            })),
            clearHistory: () => set({ history: [] }),
        }),
        { name: 'calculator-storage' }
    )
);
