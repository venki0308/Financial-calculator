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
import { createOrUpdateUserProfile } from '../lib/firestore';

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

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@fincalix.com';

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
                await signOut(auth);
                set({ user: null, isAuthenticated: false, isLoading: false });
            },

            isAdmin: () => get().user?.role === 'admin',

            signInWithEmail: async (email, password) => {
                try {
                    const result = await signInWithEmailAndPassword(auth, email, password);
                    const user = firebaseUserToUser(result.user, 'email');
                    await createOrUpdateUserProfile({ uid: user.uid, name: user.name, email: user.email, photoURL: user.photoURL });
                    set({ user, isAuthenticated: true, isLoading: false });
                    return { success: true, message: 'Signed in successfully' };
                } catch (err: any) {
                    const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
                        ? 'Incorrect email or password'
                        : err.code === 'auth/user-not-found'
                            ? 'No account found with this email'
                            : err.code === 'auth/too-many-requests'
                                ? 'Too many attempts. Try again later'
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
                    await createOrUpdateUserProfile({ uid: user.uid, name: user.name, email: user.email, photoURL: user.photoURL });
                    set({ user, isAuthenticated: true, isLoading: false });
                    return { success: true, message: 'Account created successfully' };
                } catch (err: any) {
                    const msg = err.code === 'auth/email-already-in-use'
                        ? 'An account with this email already exists'
                        : err.code === 'auth/weak-password'
                            ? 'Password is too weak'
                            : err.code === 'auth/invalid-email'
                                ? 'Invalid email address'
                                : 'Registration failed. Please try again';
                    return { success: false, message: msg };
                }
            },

            signInWithGoogle: async () => {
                try {
                    const result = await signInWithPopup(auth, googleProvider);
                    const user = firebaseUserToUser(result.user, 'google');
                    await createOrUpdateUserProfile({ uid: user.uid, name: user.name, email: user.email, photoURL: user.photoURL });
                    set({ user, isAuthenticated: true, isLoading: false });
                    return { success: true, message: 'Signed in with Google' };
                } catch (err: any) {
                    let msg = 'Google sign-in failed. Please try again';
                    if (err.code === 'auth/popup-closed-by-user') msg = 'Sign-in cancelled';
                    else if (err.code === 'auth/unauthorized-domain') msg = 'This domain is not authorized in Firebase. Please add it to your authorized domains list.';
                    else if (err.code === 'auth/popup-blocked') msg = 'The sign-in popup was blocked by your browser. Please enable popups for this site.';
                    else if (err.message) msg = err.message;

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
                const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
                    if (fbUser) {
                        const provider = fbUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email';
                        const user = firebaseUserToUser(fbUser, provider);
                        set({ user, isAuthenticated: true, isLoading: false });
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
