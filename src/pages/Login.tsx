import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore, ADMIN_EMAIL, ADMIN_PASSWORD } from '../store/useAuthStore';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'signup';

export default function Login() {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);
    const registerUser = useAuthStore((s) => s.registerUser);
    const registeredUsers = useAuthStore((s) => s.registeredUsers);

    const [mode, setMode] = useState<Mode>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    // Google Sign In
    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) {
                setError('Google sign-in failed. Please try again.');
                setGoogleLoading(false);
            }
        } catch (err) {
            setError('Google sign-in failed. Please try again.');
            setGoogleLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !password.trim()) {
            setError('Please enter email and password.');
            return;
        }
        if (mode === 'signup' && !name.trim()) {
            setError('Please enter your name.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);

        setTimeout(() => {
            if (email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                login({
                    uid: 'admin-001',
                    name: 'Admin',
                    email: ADMIN_EMAIL,
                    photoURL: '',
                    provider: 'local',
                    role: 'admin',
                    createdAt: Date.now(),
                });
                navigate('/');
                setLoading(false);
                return;
            }

            if (mode === 'signup') {
                if (registeredUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
                    setError('This email is already registered. Please login instead.');
                    setLoading(false);
                    return;
                }
                registerUser(email.toLowerCase(), password, name.trim());
                login({
                    uid: `user-${Date.now()}`,
                    name: name.trim(),
                    email: email.toLowerCase(),
                    photoURL: '',
                    provider: 'local',
                    role: 'user',
                    createdAt: Date.now(),
                });
                navigate('/');
            } else {
                const found = registeredUsers.find(
                    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
                );
                if (found) {
                    login({
                        uid: `user-${Date.now()}`,
                        name: found.name,
                        email: found.email,
                        photoURL: '',
                        provider: 'local',
                        role: 'user',
                        createdAt: Date.now(),
                    });
                    navigate('/');
                } else {
                    setError('Invalid email or password. Try signing up first.');
                }
            }
            setLoading(false);
        }, 400);
    };

    return (
        <div className="min-h-dvh bg-[#0F172A] flex flex-col items-center justify-center px-6">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-sm flex flex-col items-center"
            >
                {/* Logo */}
                <img src="/icons/fincalix-logo.jpg" alt="FinCalix" className="w-24 h-24 rounded-3xl mb-4" />
                <h1 className="text-2xl font-bold text-white mb-1">FinCalix</h1>
                <p className="text-slate-400 text-sm mb-6">India's #1 Financial Planning Tool</p>

                {/* Google Sign In Button */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-white text-gray-800 font-semibold text-sm mb-4 hover:bg-gray-100 transition-colors disabled:opacity-60"
                >
                    {googleLoading ? (
                        <span>Connecting...</span>
                    ) : (
                        <>
                            <svg width="18" height="18" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                <path fill="none" d="M0 0h48v48H0z" />
                            </svg>
                            Continue with Google
                        </>
                    )}
                </motion.button>

                {/* Divider */}
                <div className="w-full flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-dark-border"></div>
                    <span className="text-slate-500 text-xs">or</span>
                    <div className="flex-1 h-px bg-dark-border"></div>
                </div>

                {/* Mode Toggle */}
                <div className="w-full flex rounded-2xl bg-dark-card border border-dark-border p-1 mb-6">
                    <button
                        onClick={() => { setMode('login'); setError(''); }}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === 'login' ? 'bg-brand-green text-white' : 'text-slate-500'}`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => { setMode('signup'); setError(''); }}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === 'signup' ? 'bg-brand-green text-white' : 'text-slate-500'}`}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="w-full space-y-3">
                    {mode === 'signup' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="relative"
                        >
                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-dark-card border border-dark-border text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
                            />
                        </motion.div>
                    )}

                    <div className="relative">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-dark-card border border-dark-border text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
                        />
                    </div>

                    <div className="relative">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-dark-card border border-dark-border text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-red-400 text-xs text-center py-1"
                        >
                            {error}
                        </motion.p>
                    )}

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-brand-green text-white font-bold text-sm transition-opacity disabled:opacity-60"
                    >
                        {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
                    </motion.button>
                </form>

                <p className="text-slate-500 text-xs text-center leading-relaxed mt-5">
                    By continuing, you agree to our{' '}
                    <Link to="/terms-of-service" className="text-slate-400 underline">Terms of Service</Link> &{' '}
                    <Link to="/privacy-policy" className="text-slate-400 underline">Privacy Policy</Link>
                </p>
            </motion.div>
        </div>
    );
}
