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
 clearHistory: () => void;
}

export const useCalculatorStore = create<CalculatorState>()(
 persist(
 (set) => ({
 savedCalculations: [],
 history: [],
 addSaved: (calc) => {
 useNotificationStore.getState().addNotification({
 type: 'savings_insight',
 title: '💾 Calculation Saved',
 body: `Your ${calc.calculatorType} calculation was saved.`,
 icon: '💾',
 route: '/profile/saved',
 });
 set((s) => ({ savedCalculations: [calc, ...s.savedCalculations] }));
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
 clearHistory: () => set({ history: [] }),
 }),
 { name: 'calculator-storage' }
 )
);
