import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType = 'emi_reminder' | 'sip_reminder' | 'tax_alert' | 'savings_insight' | 'bill_payment' | 'general' | 'budget_alert';

export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    icon: string;
    route?: string;
    createdAt: string;
    readAt?: string;
    dismissed?: boolean;
}

interface NotificationStore {
    notifications: AppNotification[];
    addNotification: (n: Omit<AppNotification, 'id' | 'createdAt'>) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    dismiss: (id: string) => void;
    dismissAll: () => void;
    clearAll: () => void;
    getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationStore>()(
    persist(
        (set, get) => ({
            notifications: [],

            addNotification: (n) => {
                const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                // Avoid duplicates within 10 minutes
                const recent = get().notifications.find(existing =>
                    existing.title === n.title && 
                    Date.now() - new Date(existing.createdAt).getTime() < 10 * 60 * 1000
                );
                if (recent) return;
                set(state => ({
                    notifications: [
                        { ...n, id, createdAt: new Date().toISOString() },
                        ...state.notifications,
                    ].slice(0, 100), // Keep max 100
                }));
            },

            markRead: (id) => set(state => ({
                notifications: state.notifications.map(n =>
                    n.id === id ? { ...n, readAt: new Date().toISOString() } : n
                ),
            })),

            markAllRead: () => set(state => ({
                notifications: state.notifications.map(n =>
                    n.readAt ? n : { ...n, readAt: new Date().toISOString() }
                ),
            })),

            dismiss: (id) => set(state => ({
                notifications: state.notifications.map(n =>
                    n.id === id ? { ...n, dismissed: true } : n
                ),
            })),

            dismissAll: () => set(state => ({
                notifications: state.notifications.map(n => ({ ...n, dismissed: true })),
            })),

            clearAll: () => set({ notifications: [] }),

            getUnreadCount: () => {
                return get().notifications.filter(n => !n.readAt && !n.dismissed).length;
            },
        }),
        {
            name: 'fincalix-notifications',
        }
    )
);
