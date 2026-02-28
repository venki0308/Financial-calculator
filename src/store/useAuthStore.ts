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
    registeredUsers: { email: string; password: string; name: string }[];
    login: (user: User) => void;
    logout: () => void;
    registerUser: (email: string, password: string, name: string) => void;
    changePassword: (email: string, oldPassword: string, newPassword: string) => { success: boolean; message: string };
    isAdmin: () => boolean;
}

// Admin credentials — loaded from environment variables for security
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@fincalix.com';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'Moksha!81421';

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
            registeredUsers: [],
            login: (user) => set({ user, isAuthenticated: true }),
            logout: () => set({ user: null, isAuthenticated: false }),
            registerUser: (email, password, name) =>
                set((state) => ({
                    registeredUsers: [...state.registeredUsers.filter(u => u.email !== email), { email, password, name }]
                })),
            changePassword: (email, oldPassword, newPassword) => {
                const state = get();
                const user = state.registeredUsers.find(u => u.email === email);
                // Check admin credentials
                if (email === ADMIN_EMAIL) {
                    if (oldPassword !== ADMIN_PASSWORD) {
                        return { success: false, message: 'Current password is incorrect' };
                    }
                    const validation = validatePassword(newPassword);
                    if (!validation.valid) return { success: false, message: validation.message };
                    // Admin password is env-based, can't change dynamically. Store in registeredUsers.
                    set((s) => ({
                        registeredUsers: [...s.registeredUsers.filter(u => u.email !== email), { email, password: newPassword, name: 'Admin' }]
                    }));
                    return { success: true, message: 'Password changed successfully' };
                }
                if (!user) return { success: false, message: 'User not found' };
                if (user.password !== oldPassword) return { success: false, message: 'Current password is incorrect' };
                const validation = validatePassword(newPassword);
                if (!validation.valid) return { success: false, message: validation.message };
                set((s) => ({
                    registeredUsers: s.registeredUsers.map(u => u.email === email ? { ...u, password: newPassword } : u)
                }));
                return { success: true, message: 'Password changed successfully' };
            },
            isAdmin: () => get().user?.role === 'admin',
        }),
        { name: 'auth-storage' }
    )
);

export { ADMIN_EMAIL, ADMIN_PASSWORD };
