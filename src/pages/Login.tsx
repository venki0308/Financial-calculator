import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore, ADMIN_EMAIL, ADMIN_PASSWORD } from '../store/useAuthStore';
import { Calculator, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

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

        // simulate slight delay
        setTimeout(() => {
            // Check admin login
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
                // Check if email already registered
                if (registeredUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
                    setError('This email is already registered. Please login instead.');
                    setLoading(false);
                    return;
                }
                // Register new user
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
                // Login: check registered users
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
                <img src="/icons/fincalix-logo.png" alt="FinCalix" className="w-24 h-24 rounded-3xl mb-4" />
                <h1 className="text-2xl font-bold text-white mb-1">FinCalix</h1>
                <p className="text-slate-400 text-sm mb-6">India's #1 Financial Planning Tool</p>

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
                    {/* Name (signup only) */}
                    {mode === 'signup' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
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

                    {/* Email */}
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

                    {/* Password */}
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

                    {/* Submit */}
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
