import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, WifiOff, ShieldCheck } from 'lucide-react';
import { isConfigured } from '../lib/firebase';

type Mode = 'login' | 'signup';

export default function Login() {
    const navigate = useNavigate();
    const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuthStore();

    const [mode, setMode] = useState<Mode>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Separate error states — Google error should NOT pollute the email form
    const [googleError, setGoogleError] = useState('');
    const [formError, setFormError] = useState('');

    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const handleGoogleLogin = async () => {
        if (!isConfigured) {
            setGoogleError('Firebase is not configured. Please use email login below.');
            return;
        }
        setGoogleLoading(true);
        setGoogleError('');
        setFormError('');

        try {
            const result = await signInWithGoogle();
            if (result.success) {
                navigate('/', { replace: true });
            } else {
                setGoogleError(result.message);
            }
        } catch (err: any) {
            setGoogleError('Google Sign-In failed. Please try Email login.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setLoading(true);
        setFormError('');
        // Standard "Demo" credentials as requested by user ("local credentials")
        const result = await signInWithEmail('test@fincalix.com', 'Fincalix@123');
        if (result.success) {
            navigate('/', { replace: true });
        } else {
            // If the account doesn't exist, try to sign it up first (Architectural fallback)
            const signup = await signUpWithEmail('test@fincalix.com', 'Fincalix@123', 'Demo User');
            if (signup.success) {
                navigate('/', { replace: true });
            } else {
                setFormError('Demo account could not be initialized. Please use your own email.');
            }
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setGoogleError('');

        if (!email.trim()) { setFormError('Please enter your email address.'); return; }
        if (!password.trim()) { setFormError('Please enter your password.'); return; }
        if (mode === 'signup' && !name.trim()) { setFormError('Please enter your full name.'); return; }

        setLoading(true);
        const result = mode === 'signup'
            ? await signUpWithEmail(email.trim(), password, name.trim())
            : await signInWithEmail(email.trim(), password);

        if (result.success) {
            navigate('/', { replace: true });
        } else {
            setFormError(result.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-dvh bg-[#0F172A] flex flex-col items-center justify-center px-6 py-10">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-sm flex flex-col items-center"
            >
                {/* Logo */}
                <img src="/icons/fincalix-logo.jpg" alt="FinCalix" className="w-20 h-20 rounded-3xl mb-3 shadow-lg shadow-black/50" />
                <h1 className="text-2xl font-bold text-white mb-1">FinCalix</h1>
                <p className="text-slate-400 text-sm mb-7">India's #1 Financial Planning App</p>

                {/* Firebase not configured warning */}
                {!isConfigured && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="w-full flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
                        <WifiOff size={14} className="text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-amber-400 text-xs leading-relaxed">
                            Firebase configuration missing. <strong>Vercel Env Vars</strong> need to be set.
                        </p>
                    </motion.div>
                )}

                {/* Mode Toggle */}
                <div className="w-full flex rounded-2xl bg-dark-card border border-dark-border p-1 mb-5">
                    {(['login', 'signup'] as Mode[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setFormError(''); setGoogleError(''); }}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === m ? 'bg-brand-green text-black' : 'text-slate-500'}`}
                        >
                            {m === 'login' ? 'Sign In' : 'Sign Up'}
                        </button>
                    ))}
                </div>

                {/* Google Sign In Button */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-white text-gray-800 font-semibold text-sm mb-2 hover:bg-gray-100 transition-colors disabled:opacity-60 shadow-md"
                >
                    {googleLoading ? (
                        <span className="text-gray-600 animate-pulse">Connecting...</span>
                    ) : (
                        <>
                            <svg width="18" height="18" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                            </svg>
                            Continue with Google
                        </>
                    )}
                </motion.button>

                {/* Google-specific error — separate from email form */}
                <AnimatePresence>
                    {googleError && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="w-full flex items-start gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-3"
                        >
                            <AlertCircle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-orange-400 text-xs leading-relaxed mb-2">{googleError}</p>
                                <button onClick={handleDemoLogin} className="flex items-center gap-1.5 text-[10px] font-bold text-white uppercase tracking-wider bg-orange-600 px-3 py-1.5 rounded-lg hover:bg-orange-700 transition-colors">
                                    <ShieldCheck size={12} /> Use Demo Credentials
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Divider */}
                <div className="w-full flex items-center gap-3 mb-4 mt-1">
                    <div className="flex-1 h-px bg-dark-border" />
                    <span className="text-slate-500 text-xs">or continue with email</span>
                    <div className="flex-1 h-px bg-dark-border" />
                </div>

                {/* Email / Password Form */}
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
                            onChange={(e) => { setEmail(e.target.value); setFormError(''); }}
                            autoComplete="email"
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-dark-card border border-dark-border text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
                        />
                    </div>

                    <div className="relative">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder={mode === 'signup' ? 'Password (min 8 chars, A-Z, 0-9)' : 'Password'}
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setFormError(''); }}
                            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                            className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-dark-card border border-dark-border text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {/* Form-specific error — only shown for email/password issues */}
                    <AnimatePresence>
                        {formError && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                            >
                                <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                <p className="text-red-400 text-xs leading-relaxed">{formError}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-brand-green text-black font-bold text-sm transition-opacity disabled:opacity-60 shadow-lg shadow-brand-green/20"
                    >
                        {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                    </motion.button>
                </form>

                {/* Local Credentials Fallback Note */}
                <div className="mt-8 pt-6 border-t border-dark-border w-full">
                    <p className="text-slate-500 text-[10px] uppercase tracking-widest text-center font-bold mb-3">Architectural Fallback</p>
                    <div className="grid grid-cols-1 gap-2">
                        <button onClick={handleDemoLogin} className="w-full py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors">
                            Sign in with Test Credentials
                        </button>
                    </div>
                </div>

                <p className="text-slate-500 text-xs text-center leading-relaxed mt-6">
                    By continuing, you agree to our{' '}
                    <Link to="/terms-of-service" className="text-slate-400 underline">Terms of Service</Link>{' '}
                    &amp;{' '}
                    <Link to="/privacy-policy" className="text-slate-400 underline">Privacy Policy</Link>
                </p>
            </motion.div>
        </div>
    );
}
