import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
    darkMode: boolean;
    language: string;
    notifications: { priceAlerts: boolean; newSchemes: boolean; calcReminders: boolean; appUpdates: boolean };
    toggleDarkMode: () => void;
    setLanguage: (lang: string) => void;
    setNotification: (key: keyof SettingsState['notifications'], val: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            darkMode: true,
            language: 'English',
            notifications: { priceAlerts: true, newSchemes: true, calcReminders: false, appUpdates: true },
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
        { name: 'settings-storage' }
    )
);
