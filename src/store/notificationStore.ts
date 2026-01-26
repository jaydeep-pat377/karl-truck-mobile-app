import { create } from 'zustand';
import { AppNotification } from '../types/notification';

interface NotificationState {
  fcmToken: string | null;
  notifications: AppNotification[];
  unreadCount: number;
}

interface NotificationActions {
  setFcmToken: (token: string | null) => void;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  fcmToken: null,
  notifications: [],
  unreadCount: 0,

  setFcmToken: (token: string | null) => {
    set({ fcmToken: token });
  },

  addNotification: (notification: AppNotification) => {
    const existing = get().notifications;
    const alreadyExists = existing.some(n => n.id === notification.id);
    if (alreadyExists) return;

    const updated = [notification, ...existing];
    set({
      notifications: updated,
      unreadCount: updated.filter(n => !n.isRead).length,
    });
  },

  markAsRead: (id: string) => {
    const updated = get().notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n,
    );
    set({
      notifications: updated,
      unreadCount: updated.filter(n => !n.isRead).length,
    });
  },

  markAllAsRead: () => {
    const updated = get().notifications.map(n => ({ ...n, isRead: true }));
    set({
      notifications: updated,
      unreadCount: 0,
    });
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));
