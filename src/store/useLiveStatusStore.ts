import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedLiveProfile {
    id: string;
    name: string;                    // User-given name like "PNB Home Loan"
    calculatorType: string;          // 'EMI', 'Mortgage', 'SIP', 'FD', etc.
    profileData: Record<string, any>; // All inputs needed to recompute status
    createdAt: number;
    updatedAt: number;
}

interface LiveStatusState {
    savedProfiles: SavedLiveProfile[];
    addProfile: (profile: SavedLiveProfile) => void;
    removeProfile: (id: string) => void;
    updateProfile: (id: string, data: Partial<SavedLiveProfile>) => void;
}

export const useLiveStatusStore = create<LiveStatusState>()(
    persist(
        (set) => ({
            savedProfiles: [],
            addProfile: (profile) => set((s) => ({
                savedProfiles: [profile, ...s.savedProfiles]
            })),
            removeProfile: (id) => set((s) => ({
                savedProfiles: s.savedProfiles.filter(p => p.id !== id)
            })),
            updateProfile: (id, data) => set((s) => ({
                savedProfiles: s.savedProfiles.map(p =>
                    p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p
                )
            })),
        }),
        { name: 'live-status-storage' }
    )
);
