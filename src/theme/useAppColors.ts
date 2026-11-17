import { useSettingsStore } from '../store/useSettingsStore';
import { darkColors, lightColors } from './colors';

/**
 * Website only: the fincalix.com legal pages reuse the app's legal screens but follow the
 * website's theme (light unless the visitor picked dark), not the app setting. Never set
 * in the app or dev mode, so there useAppColors() follows settings-storage as before.
 */
let websiteDark: boolean | null = null;
export function setWebsiteTheme(dark: boolean): void {
    websiteDark = dark;
}

export function useAppColors() {
    const darkMode = useSettingsStore((s) => s.darkMode);
    const dark = websiteDark ?? darkMode;
    return {
        ...(dark ? darkColors : lightColors),
        isDark: dark
    };
}
