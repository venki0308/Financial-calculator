import { useSettingsStore } from '../store/useSettingsStore';
import { darkColors, lightColors } from './colors';

export function useAppColors() {
    const darkMode = useSettingsStore((s) => s.darkMode);
    return {
        ...(darkMode ? darkColors : lightColors),
        isDark: darkMode
    };
}
