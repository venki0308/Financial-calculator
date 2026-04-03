import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCheck, Trash2, BellOff } from 'lucide-react';
import { RemoteConfigService } from '../services/remoteConfig.service';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';
import { AnalyticsService } from '../lib/analytics';
import { useNotificationStore, AppNotification } from '../store/useNotificationStore';

const TYPE_META: Record<string, { emoji: string; color: string; bg: string }> = {
    // Scheduler notifications
    emi_reminder:    { emoji: '💳', color: '#3B82F6', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    sip_reminder:    { emoji: '📈', color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    tax_alert:       { emoji: '⚠️', color: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    savings_insight: { emoji: '💡', color: '#8B5CF6', bg: 'bg-violet-50 dark:bg-violet-500/10' },
    bill_payment:    { emoji: '🧾', color: '#EF4444', bg: 'bg-red-50 dark:bg-red-500/10' },
    // Calculator notifications
    emi_saved:       { emoji: '🏦', color: '#3B82F6', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    tax_reminder:    { emoji: '📋', color: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    budget_alert_80: { emoji: '⚠️', color: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    budget_exceeded: { emoji: '🚨', color: '#EF4444', bg: 'bg-red-50 dark:bg-red-500/10' },
    goal_achieved:   { emoji: '🎯', color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    goal_milestone:  { emoji: '🏆', color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    sip_due:         { emoji: '📈', color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    fd_maturity:     { emoji: '🏛️', color: '#3B82F6', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    od_saved:        { emoji: '💳', color: '#3B82F6', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    daily_quote:     { emoji: '💡', color: '#8B5CF6', bg: 'bg-violet-50 dark:bg-violet-500/10' },
    ppf_reminder:    { emoji: '🛡️', color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    tax_opportunity: { emoji: '💰', color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    // System
    app_update:      { emoji: '🆕', color: '#6366F1', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    general:         { emoji: '🔔', color: '#6B7280', bg: 'bg-slate-50 dark:bg-card border-border' },
};

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function groupNotifications(notifications: AppNotification[]) {
    const now = Date.now();
    const today: AppNotification[] = [];
    const week: AppNotification[] = [];
    const older: AppNotification[] = [];

    notifications.forEach(n => {
        const diff = now - n.createdAt;
        if (diff < 86400000) today.push(n);
        else if (diff < 7 * 86400000) week.push(n);
        else older.push(n);
    });

    return { today, week, older };
}

interface NotifCardProps {
    n: AppNotification;
    onRead: () => void;
    onDismiss: () => void;
    onClick: () => void;
}

function NotifCard({ n, onRead, onDismiss, onClick }: NotifCardProps) {
    const meta = TYPE_META[n.type] || TYPE_META.general;
    const isUnread = !n.isRead;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10, height: 0 }}
            className={`group relative rounded-2xl border transition-all ${isUnread
                ? 'bg-card border-border shadow-sm'
                : 'bg-muted/30 border-border'
            }`}
        >
            {isUnread && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-indigo-500" />
            )}
            <button className="w-full text-left p-4" onClick={() => { onRead(); onClick(); }}>
                <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                        <span className="text-xl">{n.icon || meta.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                        <h4 className={`text-sm font-semibold truncate ${isUnread ? 'text-slate-900 dark:text-foreground' : 'text-slate-600 dark:text-muted-foreground'}`}>
                            {n.title}
                        </h4>
                        <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground mt-1.5">{timeAgo(new Date(n.createdAt).toISOString())}</p>
                    </div>
                </div>
            </button>
            <button
                onClick={onDismiss}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
            >
                <Trash2 size={12} className="text-muted-foreground" />
            </button>
        </motion.div>
    );
}

export default function Notifications() {
    useEffect(() => { AnalyticsService.trackScreen('Notifications'); }, []);
    const navigate = useNavigate();
    const { notifications, markRead, markAllRead, deleteNotification, clearAll } = useNotificationStore();
    const unreadCount = useNotificationStore(s => s.getUnreadCount());

    const groups = useMemo(() => groupNotifications(notifications), [notifications]);
    const hasAny = groups.today.length + groups.week.length + groups.older.length > 0;

    const handleClick = (n: AppNotification) => {
        if (n.type === 'app_update') {
            RemoteConfigService.openPlayStore();
            return;
        }
        if (n.actionRoute && n.actionRoute !== '/__update') navigate(n.actionRoute);
    };

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-background">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#0F172A]  px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-slate-900 dark:text-foreground">Notifications</h1>
                            {unreadCount > 0 && (
                                <span className="bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground text-xs">Financial reminders & alerts</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30" title="Mark all read">
                                <CheckCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
                            </button>
                        )}
                        {hasAny && (
                            <button onClick={clearAll} className="p-2 rounded-xl bg-slate-100 dark:bg-card border-border border border-border" title="Clear all">
                                <Trash2 size={16} className="text-muted-foreground" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-4 pt-4 pb-28 space-y-6">
                {!hasAny ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20">
                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-card border-border flex items-center justify-center mb-4">
                            <BellOff size={32} className="text-muted-foreground" />
                        </div>
                        <h3 className="text-muted-foreground font-semibold mb-1">All caught up!</h3>
                        <p className="text-muted-foreground text-sm text-center leading-relaxed">
                            No notifications yet. Financial reminders and<br />insights will appear here.
                        </p>
                    </motion.div>
                ) : (
                    <>
                        {groups.today.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">Today</p>
                                <div className="space-y-2">
                                    <AnimatePresence>
                                        {groups.today.map(n => (
                                            <NotifCard key={n.id} n={n}
                                                onRead={() => markRead(n.id)}
                                                onDismiss={() => deleteNotification(n.id)}
                                                onClick={() => handleClick(n)}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        {groups.week.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">This Week</p>
                                <div className="space-y-2">
                                    <AnimatePresence>
                                        {groups.week.map(n => (
                                            <NotifCard key={n.id} n={n}
                                                onRead={() => markRead(n.id)}
                                                onDismiss={() => deleteNotification(n.id)}
                                                onClick={() => handleClick(n)}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        {groups.older.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Older</p>
                                <div className="space-y-2">
                                    <AnimatePresence>
                                        {groups.older.map(n => (
                                            <NotifCard key={n.id} n={n}
                                                onRead={() => markRead(n.id)}
                                                onDismiss={() => deleteNotification(n.id)}
                                                onClick={() => handleClick(n)}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                    </>
                )}
            </div>
        </div>
    );
}
