import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
    darkMode: boolean;
    language: string;
    notifications: { priceAlerts: boolean; newSchemes: boolean; calcReminders: boolean; appUpdates: boolean; dailyQuotes: boolean; logReminder: boolean };
    toggleDarkMode: () => void;
    setLanguage: (lang: string) => void;
    setNotification: (key: keyof SettingsState['notifications'], val: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            darkMode: true,
            language: 'en',
            notifications: { priceAlerts: true, newSchemes: true, calcReminders: true, appUpdates: true, dailyQuotes: true, logReminder: true },
            toggleDarkMode: () =>
                set((s) => {
                    const next = !s.darkMode;
                    document.documentElement.classList.toggle('dark', next);
                    document.documentElement.classList.toggle('light', !next);
                    return { darkMode: next };
                }),
            setLanguage: (language) => set({ language }),
            setNotification: (key, val) =>
                set((s) => ({ notifications: { ...s.notifications, [key]: val } })),
        }),
        {
            name: 'settings-storage',
            // Deep-merge `notifications` so flags added in later versions
            // (e.g. logReminder, default ON) keep their defaults for users
            // whose persisted object predates them — persist's default
            // shallow merge would replace the whole notifications object
            // and leave new keys undefined (= silently off).
            merge: (persisted, current) => {
                const p = (persisted ?? {}) as Partial<SettingsState>;
                return {
                    ...current,
                    ...p,
                    notifications: { ...current.notifications, ...(p.notifications ?? {}) },
                };
            },
        }
    )
);
