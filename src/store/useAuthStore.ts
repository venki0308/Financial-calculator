import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updatePassword,
    updateProfile,
    EmailAuthProvider,
    reauthenticateWithCredential,
    User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export interface User {
    uid: string;
    name: string;
    email: string;
    photoURL: string;
    provider: 'google' | 'email' | 'local';
    role: 'admin' | 'user';
    createdAt: number;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (user: User) => void;
    logout: () => Promise<void>;
    isAdmin: () => boolean;
    signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
    signUpWithEmail: (email: string, password: string, name: string) => Promise<{ success: boolean; message: string }>;
    signInWithGoogle: () => Promise<{ success: boolean; message: string }>;
    changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
    initAuthListener: () => () => void;
}

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'fincalix@gmail.com';

function firebaseUserToUser(fbUser: FirebaseUser, provider: 'google' | 'email' | 'local'): User {
    return {
        uid: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        email: fbUser.email || '',
        photoURL: fbUser.photoURL || '',
        provider,
        role: fbUser.email === ADMIN_EMAIL ? 'admin' : 'user',
        createdAt: Date.now(),
    };
}

/**
 * Fire-and-forget Firestore profile write.
 * Auth should NEVER be blocked by a Firestore failure.
 */
async function syncProfileToFirestore(user: User) {
    try {
        const { createOrUpdateUserProfile } = await import('../lib/firestore');
        await createOrUpdateUserProfile({
            uid: user.uid,
            name: user.name,
            email: user.email,
            photoURL: user.photoURL,
        });
    } catch (err) {
        console.warn('[FinCalix] Firestore profile sync failed (non-blocking):', err);
    }
}

export function validatePassword(password: string): { valid: boolean; message: string } {
    if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
    if (!/[A-Z]/.test(password)) return { valid: false, message: 'Must include an uppercase letter' };
    if (!/[a-z]/.test(password)) return { valid: false, message: 'Must include a lowercase letter' };
    if (!/[0-9]/.test(password)) return { valid: false, message: 'Must include a digit' };
    return { valid: true, message: 'Strong password' };
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: true,

            login: (user) => set({ user, isAuthenticated: true, isLoading: false }),

            logout: async () => {
                try { await signOut(auth); } catch { /* ignore */ }
                set({ user: null, isAuthenticated: false, isLoading: false });
            },

            isAdmin: () => get().user?.role === 'admin',

            signInWithEmail: async (email, password) => {
                try {
                    const result = await signInWithEmailAndPassword(auth, email, password);
                    const user = firebaseUserToUser(result.user, 'email');
                    set({ user, isAuthenticated: true, isLoading: false });
                    // Non-blocking Firestore sync
                    syncProfileToFirestore(user);
                    return { success: true, message: 'Signed in successfully' };
                } catch (err: any) {
                    const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
                        ? 'Incorrect email or password'
                        : err.code === 'auth/user-not-found'
                            ? 'No account found with this email'
                            : err.code === 'auth/too-many-requests'
                                ? 'Too many attempts. Try again later'
                                : err.code === 'auth/invalid-email'
                                    ? 'Invalid email address'
                                    : err.code === 'auth/network-request-failed'
                                        ? 'Network error. Check your internet connection'
                                        : 'Sign in failed. Please try again';
                    return { success: false, message: msg };
                }
            },

            signUpWithEmail: async (email, password, name) => {
                const validation = validatePassword(password);
                if (!validation.valid) return { success: false, message: validation.message };
                try {
                    const result = await createUserWithEmailAndPassword(auth, email, password);
                    await updateProfile(result.user, { displayName: name });
                    const user = firebaseUserToUser({ ...result.user, displayName: name }, 'email');
                    set({ user, isAuthenticated: true, isLoading: false });
                    // Non-blocking Firestore sync
                    syncProfileToFirestore(user);
                    return { success: true, message: 'Account created successfully' };
                } catch (err: any) {
                    const msg = err.code === 'auth/email-already-in-use'
                        ? 'An account with this email already exists'
                        : err.code === 'auth/weak-password'
                            ? 'Password is too weak'
                            : err.code === 'auth/invalid-email'
                                ? 'Invalid email address'
                                : err.code === 'auth/network-request-failed'
                                    ? 'Network error. Check your internet connection'
                                    : 'Registration failed. Please try again';
                    return { success: false, message: msg };
                }
            },

            signInWithGoogle: async () => {
                try {
                    const result = await signInWithPopup(auth, googleProvider);
                    const user = firebaseUserToUser(result.user, 'google');
                    set({ user, isAuthenticated: true, isLoading: false });
                    // Non-blocking Firestore sync
                    syncProfileToFirestore(user);
                    return { success: true, message: 'Signed in with Google' };
                } catch (err: any) {
                    let msg = 'Google sign-in failed. Please try again';
                    if (err.code === 'auth/popup-closed-by-user') msg = 'Sign-in popup was closed. Please try again.';
                    else if (err.code === 'auth/cancelled-popup-request') msg = 'Sign-in cancelled. Please try again.';
                    else if (err.code === 'auth/unauthorized-domain') msg = 'This domain is not authorized for Google Sign-In. Please use Email login instead.';
                    else if (err.code === 'auth/popup-blocked') msg = 'Popup was blocked by your browser. Please allow popups and try again.';
                    else if (err.code === 'auth/network-request-failed') msg = 'Network error. Check your internet connection.';
                    else if (err.code === 'auth/internal-error') msg = 'Sign-in service error. Please use Email login.';
                    return { success: false, message: msg };
                }
            },

            changePassword: async (oldPassword, newPassword) => {
                const firebaseUser = auth.currentUser;
                if (!firebaseUser || !firebaseUser.email) return { success: false, message: 'Not signed in' };
                const validation = validatePassword(newPassword);
                if (!validation.valid) return { success: false, message: validation.message };
                try {
                    const credential = EmailAuthProvider.credential(firebaseUser.email, oldPassword);
                    await reauthenticateWithCredential(firebaseUser, credential);
                    await updatePassword(firebaseUser, newPassword);
                    return { success: true, message: 'Password changed successfully' };
                } catch (err: any) {
                    const msg = err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
                        ? 'Current password is incorrect'
                        : 'Failed to change password';
                    return { success: false, message: msg };
                }
            },

            initAuthListener: () => {
                const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
                    if (fbUser) {
                        const provider = fbUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email';
                        const user = firebaseUserToUser(fbUser, provider);
                        set({ user, isAuthenticated: true, isLoading: false });
                        // Non-blocking Firestore sync — do NOT await
                        syncProfileToFirestore(user);
                    } else {
                        set({ user: null, isAuthenticated: false, isLoading: false });
                    }
                });
                return unsubscribe;
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
);

export { ADMIN_EMAIL };
