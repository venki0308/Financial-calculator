import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationCategory = 'calculator' | 'reminder' | 'alert' | 'insight';

export interface AppNotification {
    id: string;
    type: string;
    category: NotificationCategory;
    title: string;
    body: string;
    icon: string;
    isRead: boolean;
    isActionable: boolean;
    actionRoute?: string;
    actionLabel?: string;
    metadata: Record<string, any>;
    createdAt: number;
    expiresAt?: number;
}

interface NotificationStore {
    notifications: AppNotification[];
    addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    deleteNotification: (id: string) => void;
    clearAll: () => void;
    getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationStore>()(
    persist(
        (set, get) => ({
            notifications: [],

            addNotification: (baseNotif) => {
                set(state => {
                    let notifs = [...state.notifications];
                    const existingIndex = notifs.findIndex(n => 
                        n.type === baseNotif.type && 
                        n.metadata?.calcId === baseNotif.metadata?.calcId &&
                        new Date(n.createdAt).toDateString() === new Date().toDateString()
                    );

                    const newNotif: AppNotification = {
                        ...baseNotif,
                        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                        isRead: false,
                        createdAt: Date.now()
                    };

                    if (existingIndex >= 0) {
                        // Update existing, move to top
                        notifs.splice(existingIndex, 1);
                        notifs.unshift(newNotif);
                    } else {
                        notifs.unshift(newNotif);
                    }

                    // Enforce 100 limit: When limit reached: delete oldest read notifications first, then oldest unread.
                    if (notifs.length > 100) {
                        let excess = notifs.length - 100;
                        for (let i = notifs.length - 1; i >= 0 && excess > 0; i--) {
                            if (notifs[i].isRead) {
                                notifs.splice(i, 1);
                                excess--;
                            }
                        }
                        while (notifs.length > 100) {
                            notifs.pop();
                        }
                    }

                    return { notifications: notifs };
                });
            },

            markRead: (id) => set(state => ({
                notifications: state.notifications.map(n =>
                    n.id === id ? { ...n, isRead: true } : n
                ),
            })),

            markAllRead: () => set(state => ({
                notifications: state.notifications.map(n => ({ ...n, isRead: true })),
            })),

            deleteNotification: (id) => set(state => ({
                notifications: state.notifications.filter(n => n.id !== id),
            })),

            clearAll: () => set({ notifications: [] }),

            getUnreadCount: () => {
                return get().notifications.filter(n => !n.isRead).length;
            },
        }),
        {
            name: 'fincalix_notifications', // updated key
        }
    )
);
