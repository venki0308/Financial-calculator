import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, FileText, Calculator, Zap, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface NotificationSetting {
    id: string;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
    enabled: boolean;
}

const defaultSettings: NotificationSetting[] = [
    { id: 'newSchemes', label: 'New Government Schemes', description: 'Notification when new schemes are added', icon: FileText, color: '#10B981', enabled: true },
    { id: 'calculationReminders', label: 'Calculation Reminders', description: 'Remind to review your saved calculations', icon: Calculator, color: '#3B82F6', enabled: false },
    { id: 'appUpdates', label: 'App Updates', description: 'New features and calculator additions', icon: Zap, color: '#8B5CF6', enabled: true },
    { id: 'schemeDeadlines', label: 'Scheme Application Deadlines', description: 'Alerts for bookmarked scheme deadlines', icon: Calendar, color: '#EF4444', enabled: true },
];

export default function Notifications() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<NotificationSetting[]>(() => {
        try {
            const stored = localStorage.getItem('notificationSettings');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Ensure parsed data has the correct shape — merge with defaults
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
                    return defaultSettings.map(def => {
                        const saved = parsed.find((p: NotificationSetting) => p.id === def.id);
                        return saved ? { ...def, enabled: saved.enabled } : def;
                    });
                }
            }
        } catch {
            // ignore parse errors
        }
        return defaultSettings;
    });

    useEffect(() => {
        localStorage.setItem('notificationSettings', JSON.stringify(settings));
    }, [settings]);

    const toggleSetting = (id: string) => {
        setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
    };

    return (
        <div className="min-h-dvh bg-white dark:bg-[#0F172A]">
            <div className="px-4 pt-14 pb-8">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Notifications</h1>
                        <p className="text-slate-500 text-xs">Manage your alerts</p>
                    </div>
                </div>

                {/* Toggle Cards */}
                <div className="space-y-3 mb-8">
                    {settings.map(({ id, label, description, icon: Icon, color, enabled }, index) => (
                        <motion.div
                            key={id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border"
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                                <Icon size={20} style={{ color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-slate-900 dark:text-white font-medium text-sm">{label}</p>
                                <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{description}</p>
                            </div>
                            <button
                                onClick={() => toggleSetting(id)}
                                className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${enabled ? 'bg-brand-green' : 'bg-slate-300 dark:bg-slate-700'}`}
                            >
                                <motion.div
                                    layout
                                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                                    style={{ left: enabled ? 22 : 2 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            </button>
                        </motion.div>
                    ))}
                </div>

                {/* Info Note */}
                <div className="p-4 rounded-2xl bg-brand-blue/5 border border-brand-blue/15">
                    <p className="text-slate-500 text-xs leading-relaxed">
                        <Bell size={12} className="inline mr-1.5 text-brand-blue" />
                        Notification preferences are stored locally. Push notifications will be available in a future update.
                    </p>
                </div>
            </div>
        </div>
    );
}
