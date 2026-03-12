/**
 * Local User Store
 * Replaces Firebase Auth — 100% offline, zero backend, zero tracking.
 * A local UUID is auto-generated on first launch and persisted on device.
 * No login required. All user data stays on device.
 *
 * NOTE FOR FUTURE: AdMob integration can be added here for revenue tracking
 * without needing auth. See Capacitor AdMob plugin.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Capacitor } from '@capacitor/core';

export interface User {
    uid: string;        // Random UUID, generated once, persisted forever
    name: string;       // User-editable display name
    createdAt: number;
}

interface LocalUserState {
    user: User;
    updateName: (name: string) => void;
    isAdmin: () => boolean;
    isNativeApp: () => boolean;
    clearAllData: () => void;
}

/** Generate a stable local UID on first run */
function generateUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULT_USER: User = {
    uid: generateUID(),
    name: 'My Account',
    createdAt: Date.now(),
};

export const useAuthStore = create<LocalUserState>()(
    persist(
        (set, get) => ({
            user: DEFAULT_USER,

            updateName: (name: string) =>
                set((s) => ({ user: { ...s.user, name: name.trim() || 'My Account' } })),

            /** No admin role in offline mode */
            isAdmin: () => false,

            /** Detect Capacitor native app */
            isNativeApp: () => Capacitor.isNativePlatform(),

            /** Clear all locally stored data (optional reset) */
            clearAllData: () => {
                const uid = generateUID();
                set({ user: { uid, name: 'My Account', createdAt: Date.now() } });
            },
        }),
        {
            name: 'local-user-storage',
            /** Re-generate UID in case storage was corrupted */
            onRehydrateStorage: () => (state) => {
                if (state?.user && !state.user.uid) {
                    state.user.uid = generateUID();
                }
            },
        }
    )
);

// Legacy compatibility exports — keep same shape so calculator pages work unchanged
export const ADMIN_EMAIL = '';
export function validatePassword(_password: string): { valid: boolean; message: string } {
    return { valid: true, message: '' };
}
