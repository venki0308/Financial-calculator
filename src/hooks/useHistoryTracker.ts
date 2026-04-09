import { useEffect, useRef } from 'react';
import { useCalculatorStore } from '../store/useCalculatorStore';

/**
 * Auto-saves a history entry whenever `primaryValue` changes (debounced 800ms).
 * Drop this into any calculator component that doesn't have its own addHistory call.
 *
 * @param calculatorType  Human-readable name shown in the History screen
 * @param inputValues     Key inputs (principal, rate, tenure, etc.)
 * @param resultValues    Full result object — `primary` key is auto-added
 * @param primaryValue    The headline number (maturity, EMI, corpus, etc.)
 */
export function useHistoryTracker(
    calculatorType: string,
    inputValues: Record<string, any>,
    resultValues: Record<string, any>,
    primaryValue: number
) {
    const addHistory = useCalculatorStore(s => s.addHistory);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!primaryValue || primaryValue <= 0) return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            addHistory({
                id: `${calculatorType.replace(/\s+/g, '_')}_hist`,
                calculatorType,
                inputValues,
                resultValues: { primary: primaryValue, ...resultValues },
                timestamp: Date.now(),
            });
        }, 800);
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    // primaryValue is the only signal needed — changing it means a new result
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [primaryValue]);
}