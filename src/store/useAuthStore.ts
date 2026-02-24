import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    uid: string;
    name: string;
    email: string;
    photoURL: string;
    provider: 'google' | 'facebook' | 'local';
    role: 'admin' | 'user';
    createdAt: number;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    hasPremium: boolean;
    registeredUsers: { email: string; password: string; name: string }[];
    login: (user: User) => void;
    logout: () => void;
    setPremium: (val: boolean) => void;
    registerUser: (email: string, password: string, name: string) => void;
    isAdmin: () => boolean;
}

// Admin credentials
const ADMIN_EMAIL = 'admin@fincalc.in';
const ADMIN_PASSWORD = 'Admin@123';

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            hasPremium: false,
            registeredUsers: [],
            login: (user) => set({ user, isAuthenticated: true }),
            logout: () => set({ user: null, isAuthenticated: false, hasPremium: false }),
            setPremium: (val) => set({ hasPremium: val }),
            registerUser: (email, password, name) =>
                set((state) => ({
                    registeredUsers: [...state.registeredUsers.filter(u => u.email !== email), { email, password, name }]
                })),
            isAdmin: () => get().user?.role === 'admin',
        }),
        { name: 'auth-storage' }
    )
);

export { ADMIN_EMAIL, ADMIN_PASSWORD };
