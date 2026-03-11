import { create } from 'zustand';
import { AppNotification } from '../types/notification';
import { notificationService } from '../api/services/notificationService';

interface NotificationState {
  fcmToken: string | null;
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
}

interface NotificationActions {
  setFcmToken: (token: string | null) => void;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  fetchNotifications: (userId: string, tenantId: number, page?: number, limit?: number) => Promise<void>;
  loadMoreNotifications: (userId: string, tenantId: number) => Promise<void>;
  setNotifications: (notifications: AppNotification[]) => void;
}

type NotificationStore = NotificationState & NotificationActions;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  fcmToken: null,
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  pagination: null,

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

  fetchNotifications: async (userId: string, tenantId: number, page = 1, limit = 50) => {
    set({ isLoading: true, error: null });

    try {
      const response = await notificationService.getNotificationQueue({
        user_id: userId,
        tenant_id: tenantId,
        page,
        limit,
      });

      if (response.success && response.data) {
        const mapEventCodeToType = (eventCode: string): AppNotification['type'] => {
          const typeMap: Record<string, AppNotification['type']> = {
            'ORDER_CREATED': 'order_update',
            'ORDER_UPDATED': 'order_update',
            'ORDER_CANCELLED': 'order_update',
            'DELIVERY_STARTED': 'delivery_update',
            'DELIVERY_COMPLETED': 'delivery_update',
            'DISPATCH_ALERT': 'dispatch_alert',
            'ETA_UPDATE': 'eta_update',
            'WEATHER_ALERT': 'weather_alert',
          };
          return typeMap[eventCode] || 'system';
        };

        const mapPriorityToLevel = (priority: number): AppNotification['priority'] => {
          if (priority >= 8) return 'high';
          if (priority >= 4) return 'medium';
          return 'low';
        };

        const notifications = response.data.notifications.map((item) => ({
          id: String(item.id),
          type: mapEventCodeToType(item.event_code),
          title: item.subject,
          body: item.body,
          priority: mapPriorityToLevel(item.priority),
          isRead: item.status === 'read' || item.status === 'delivered',
          data: {
            queue_uuid: item.queue_uuid,
            event_code: item.event_code,
            event_name: item.event_name,
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            customer_name: item.customer_name,
            status: item.status,
          },
          orderId: item.entity_type === 'order' && item.entity_id ? item.entity_id : undefined,
          createdAt: item.created_at,
        }));

        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.isRead).length,
          pagination: {
            page: response.data.page,
            limit: response.data.limit,
            total: response.data.total,
            totalPages: response.data.totalPages,
          },
          isLoading: false,
        });
      } else {
        set({ isLoading: false, error: response.message || 'Failed to fetch notifications' });
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      set({
        isLoading: false,
        error: error?.message || 'Failed to fetch notifications',
      });
    }
  },

  loadMoreNotifications: async (userId: string, tenantId: number) => {
    const { pagination, isLoadingMore, notifications: existingNotifications } = get();

    if (isLoadingMore || !pagination || pagination.page >= pagination.totalPages) {
      return;
    }

    set({ isLoadingMore: true });

    try {
      const nextPage = pagination.page + 1;
      const response = await notificationService.getNotificationQueue({
        user_id: userId,
        tenant_id: tenantId,
        page: nextPage,
        limit: pagination.limit,
      });

      if (response.success && response.data) {
        const mapEventCodeToType = (eventCode: string): AppNotification['type'] => {
          const typeMap: Record<string, AppNotification['type']> = {
            'ORDER_CREATED': 'order_update',
            'ORDER_UPDATED': 'order_update',
            'ORDER_CANCELLED': 'order_update',
            'DELIVERY_STARTED': 'delivery_update',
            'DELIVERY_COMPLETED': 'delivery_update',
            'DISPATCH_ALERT': 'dispatch_alert',
            'ETA_UPDATE': 'eta_update',
            'WEATHER_ALERT': 'weather_alert',
          };
          return typeMap[eventCode] || 'system';
        };

        const mapPriorityToLevel = (priority: number): AppNotification['priority'] => {
          if (priority >= 8) return 'high';
          if (priority >= 4) return 'medium';
          return 'low';
        };

        const newNotifications = response.data.notifications.map((item) => ({
          id: String(item.id),
          type: mapEventCodeToType(item.event_code),
          title: item.subject,
          body: item.body,
          priority: mapPriorityToLevel(item.priority),
          isRead: item.status === 'read' || item.status === 'delivered',
          data: {
            queue_uuid: item.queue_uuid,
            event_code: item.event_code,
            event_name: item.event_name,
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            customer_name: item.customer_name,
            status: item.status,
          },
          orderId: item.entity_type === 'order' && item.entity_id ? item.entity_id : undefined,
          createdAt: item.created_at,
        }));

        const allNotifications = [...existingNotifications, ...newNotifications];

        set({
          notifications: allNotifications,
          unreadCount: allNotifications.filter((n) => !n.isRead).length,
          pagination: {
            page: response.data.page,
            limit: response.data.limit,
            total: response.data.total,
            totalPages: response.data.totalPages,
          },
          isLoadingMore: false,
        });
      } else {
        set({ isLoadingMore: false });
      }
    } catch (error: any) {
      console.error('Error loading more notifications:', error);
      set({ isLoadingMore: false });
    }
  },

  setNotifications: (notifications: AppNotification[]) => {
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    });
  },
}));
