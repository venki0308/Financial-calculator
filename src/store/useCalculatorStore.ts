import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useNotificationStore } from './useNotificationStore';

export interface Calculation {
    id: string;
    calculatorType: string;
    inputValues: Record<string, any>;
    resultValues: any;
    timestamp: number;
}

interface CalculatorState {
    savedCalculations: Calculation[];
    history: Calculation[];
    addSaved: (calc: Calculation) => void;
    updateSaved: (id: string, inputValues: Record<string, any>, resultValues: any) => void;
    removeSaved: (id: string) => void;
    addHistory: (calc: Calculation) => void;
    removeHistory: (id: string) => void;
    clearHistory: () => void;
}

export const useCalculatorStore = create<CalculatorState>()(
    persist(
        (set) => ({
            savedCalculations: [],
            history: [],
            addSaved: (calc) => {
                // Cap saved calculations at 200. Older entries fall off the
                // tail so localStorage quota (~5-10MB) is never silently hit,
                // which would cause subsequent persist writes to fail.
                set((s) => ({ savedCalculations: [calc, ...s.savedCalculations].slice(0, 200) }));
            },
            updateSaved: (id, inputValues, resultValues) => set((s) => ({
                savedCalculations: s.savedCalculations.map((c) =>
                    c.id === id ? { ...c, inputValues, resultValues, timestamp: Date.now() } : c
                )
            })),
            removeSaved: (id) => set((s) => ({ savedCalculations: s.savedCalculations.filter((c) => c.id !== id) })),
            addHistory: (calc) => set((s) => ({
                history: [calc, ...s.history.filter(h => h.id !== calc.id)].slice(0, 50)
            })),
            removeHistory: (id) => set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
            clearHistory: () => set({ history: [] }),
        }),
        { name: 'calculator-storage' }
    )
);
