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

// Admin credentials — loaded from environment variables for security
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@fincalix.com';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'Admin@Fincalix#2026';

// Password validation — minimum 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
export function validatePassword(password: string): { valid: boolean; message: string } {
    if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
    if (!/[A-Z]/.test(password)) return { valid: false, message: 'Must include an uppercase letter' };
    if (!/[a-z]/.test(password)) return { valid: false, message: 'Must include a lowercase letter' };
    if (!/[0-9]/.test(password)) return { valid: false, message: 'Must include a digit' };
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return { valid: false, message: 'Must include a special character' };
    return { valid: true, message: 'Strong password' };
}

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
