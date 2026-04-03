import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SchemeState {
    bookmarkedSchemes: string[];
    addBookmark: (id: string) => void;
    removeBookmark: (id: string) => void;
    isBookmarked: (id: string) => boolean;
}

export const useSchemeStore = create<SchemeState>()(
    persist(
        (set, get) => ({
            bookmarkedSchemes: [],
            addBookmark: (id) => set((s) => ({ bookmarkedSchemes: s.bookmarkedSchemes.includes(id) ? s.bookmarkedSchemes : [...s.bookmarkedSchemes, id] })),
            removeBookmark: (id) => set((s) => ({ bookmarkedSchemes: s.bookmarkedSchemes.filter((b) => b !== id) })),
            isBookmarked: (id) => get().bookmarkedSchemes.includes(id),
        }),
        { name: 'scheme-storage' }
    )
);
