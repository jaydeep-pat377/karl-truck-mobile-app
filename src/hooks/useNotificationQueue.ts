
import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { getSocket } from '../services/socketClient';
import { buildNotifKey, claimNotification } from '../utils/notificationDedup';
import { notificationService } from '../api/services/notificationService';
import { useNotificationStore } from '../store/notificationStore';

const CHANNEL_ID = 'truckast_heads_up';
const PAGE_SIZE = 20;

const EVENT_CODE_MAP: Record<string, 'order' | 'truck' | 'alert' | 'info'> = {
  ORDER_CREATED: 'order',
  ORDER_UPDATED: 'order',
  ORDER_CANCELLED: 'order',
  ORDER_CONFIRMED: 'order',
  ORDER_COMPLETED: 'order',
  TRUCK_DISPATCHED: 'truck',
  TRUCK_ARRIVED: 'truck',
  TRUCK_DELAYED: 'truck',
  TRUCK_EN_ROUTE: 'truck',
  PSI_ALERT: 'alert',
  WEATHER_ALERT: 'alert',
  CAPACITY_ALERT: 'alert',
  SYSTEM_ALERT: 'alert',
};

export type NotificationType = 'order' | 'truck' | 'alert' | 'info';

export function mapEventCodeToType(eventCode: string | null): NotificationType {
  if (!eventCode) return 'info';
  const upperCode = eventCode.toUpperCase();
  return EVENT_CODE_MAP[upperCode] ?? 'info';
}

export function formatRelativeTime(dateString: string): string {
  const diffSeconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  );
  if (diffSeconds < 0 || diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min ago`;
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  const days = Math.floor(diffSeconds / 86400);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export interface Notification {
  id: string;
  queue_uuid: string;
  subject: string;
  body: string;
  event_code: string;
  event_name: string;
  entity_type: string;
  entity_id: number | null;
  status: string;
  priority: number;
  created_at: string;
  tenant_id: number;
  order_code?: string | null;
  order_date?: string | null;
  isNew?: boolean;
}

export interface NotificationItem {
  id: string;
  queueUuid: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: NotificationType;
  createdAt: string;
  eventCode: string;
  entityType: string;
  entityId: number | null;
  priority: number;
  isNew?: boolean;
}

export function mapRowToNotificationItem(row: Notification): NotificationItem {
  return {
    id: row.id,
    queueUuid: row.queue_uuid,
    title: row.subject ?? 'Notification',
    description: row.body ?? '',
    time: formatRelativeTime(row.created_at),
    read: row.status === 'delivered' || row.status === 'read',
    type: mapEventCodeToType(row.event_code),
    createdAt: row.created_at,
    eventCode: row.event_code,
    entityType: row.entity_type,
    entityId: row.entity_id,
    priority: row.priority,
    isNew: row.isNew,
  };
}

interface UseNotificationQueueProps {
  userId: string | null;
  tenantId: number | null;
  enabled?: boolean;
  onNewNotification?: (notification: NotificationItem) => void;
}

interface PaginationState {
  page: number;
  totalPages: number;
  total: number;
}

interface UseNotificationQueueReturn {
  notifications: Notification[];
  notificationItems: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  isConnected: boolean;
  error: string | null;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  reconnect: () => void;
}

export function useNotificationQueue({
  userId,
  tenantId,
  enabled = true,
  onNewNotification,
}: UseNotificationQueueProps): UseNotificationQueueReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState | null>(null);
  const reconnectAttempts = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const onNewNotificationRef = useRef(onNewNotification);

  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);

  useEffect(() => {
    setNotificationItems(notifications.map(mapRowToNotificationItem));
  }, [notifications]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNotificationItems((prev) =>
        prev.map((item) => ({
          ...item,
          time: formatRelativeTime(item.createdAt),
        }))
      );
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    try {
      const settings = await notifee.requestPermission();
      return settings.authorizationStatus >= 1;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  const showLocalNotification = useCallback(async (notification: Notification) => {
    if (appStateRef.current !== 'active') return;

    try {
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: CHANNEL_ID,
          name: 'TruckAst Alerts',
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          sound: 'default',
          vibration: true,
        });
      }

      await notifee.displayNotification({
        title: notification.subject || 'New Notification',
        body: notification.body || '',
        data: {
          notification_id: String(notification.id),
          event_code: notification.event_code || '',
          entity_type: notification.entity_type || '',
          entity_id: notification.entity_id != null ? String(notification.entity_id) : '',
          order_code: (notification as any).order_code || '',
          order_date: (notification as any).order_date || '',
        },
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          pressAction: { id: 'default' },
          smallIcon: 'ic_notification',
          color: '#6BB130',
          sound: 'default',
        },
        ios: {
          sound: 'default',
          foregroundPresentationOptions: {
            badge: true,
            sound: true,
            banner: true,
            list: true,
          },
        },
      });
    } catch (err) {
      console.error('[useNotificationQueue] Failed to show local notification:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await notificationService.getNotificationHistory({
        page: 1,
        limit: PAGE_SIZE,
      });

      if (response.success && response.data) {
        const items = (response.data.notifications || []).map((n: any) => ({
          ...n,
          id: String(n.id),
        }));
        setNotifications(items);
        setPagination({
          page: response.data.page,
          totalPages: response.data.totalPages,
          total: response.data.total,
        });
      } else {
        setError(response.message || 'Failed to fetch notifications');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (!userId || !pagination || isLoadingMore) return;
    if (pagination.page >= pagination.totalPages) return;

    setIsLoadingMore(true);

    try {
      const nextPage = pagination.page + 1;
      const response = await notificationService.getNotificationHistory({
        page: nextPage,
        limit: PAGE_SIZE,
      });

      if (response.success && response.data) {
        const newItems = (response.data.notifications || []).map((n: any) => ({
          ...n,
          id: String(n.id),
        }));

        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const deduped = newItems.filter((n: Notification) => !existingIds.has(n.id));
          return [...prev, ...deduped];
        });

        setPagination({
          page: response.data.page,
          totalPages: response.data.totalPages,
          total: response.data.total,
        });
      }
    } catch (err: any) {
      if (__DEV__) console.error('[useNotificationQueue] Error loading more:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [userId, pagination, isLoadingMore]);

  // Socket.io subscription for realtime notifications
  const subscribe = useCallback(() => {
    if (!userId || !enabled) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('join:notifications', { user_id: userId });

    const handleInsert = (payload: any) => {
      const newNotification = {
        ...(payload.new || payload) as Notification,
        id: String((payload.new || payload).id),
        isNew: true,
      };

      if (tenantId && newNotification.tenant_id !== null && newNotification.tenant_id !== tenantId) {
        return;
      }

      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotification.id)) return prev;
        return [newNotification, ...prev];
      });

      setPagination((prev) => prev ? { ...prev, total: prev.total + 1 } : prev);

      const displayKey = buildNotifKey({
        title: newNotification.subject,
        body: newNotification.body,
        entityType: newNotification.entity_type,
        entityId: newNotification.entity_id,
      });
      if (claimNotification(`display:${displayKey}`)) {
        showLocalNotification(newNotification);
      }

      if (onNewNotificationRef.current) {
        onNewNotificationRef.current(mapRowToNotificationItem(newNotification));
      }

      setTimeout(() => {
        setNotifications((prev) =>
          prev.map((n) => (n.id === newNotification.id ? { ...n, isNew: false } : n)),
        );
      }, 5000);
    };

    const handleUpdate = (payload: any) => {
      const updatedNotification = {
        ...(payload.new || payload) as Notification,
        id: String((payload.new || payload).id),
      };

      setNotifications((prev) =>
        prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n)),
      );
    };

    socket.on('notifications:new', handleInsert);
    socket.on('notifications:update', handleUpdate);
    setIsConnected(socket.connected);

    const handleConnect = () => {
      reconnectAttempts.current = 0;
      setIsConnected(true);
      setError(null);
    };
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('notifications:new', handleInsert);
      socket.off('notifications:update', handleUpdate);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [userId, tenantId, enabled, showLocalNotification]);

  const reconnect = useCallback(() => {
    if (userId && enabled) {
      reconnectAttempts.current = 0;
      subscribe();
      fetchNotifications();
    }
  }, [userId, enabled, subscribe, fetchNotifications]);

  useEffect(() => {
    if (userId && enabled) {
      fetchNotifications();
      const cleanup = subscribe();
      return () => cleanup?.();
    }
  }, [userId, enabled, fetchNotifications, subscribe]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      appStateRef.current = state;
      if (state === 'active' && userId && enabled) {
        reconnectAttempts.current = 0;
        fetchNotifications();
        subscribe();
      }
    });
    return () => subscription.remove();
  }, [userId, enabled, subscribe, fetchNotifications]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected && userId && enabled) {
        reconnectAttempts.current = 0;
        subscribe();
        fetchNotifications();
      }
    });
    return () => unsubscribe();
  }, [userId, enabled, subscribe, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    const notification = notifications.find((n) => n.id === id || n.queue_uuid === id);
    if (!notification || notification.status === 'delivered' || notification.status === 'read') return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id || n.queue_uuid === id ? { ...n, status: 'delivered' } : n)),
    );

    try {
      await notificationService.markAsRead(notification.queue_uuid);
    } catch (err) {
      console.error('[useNotificationQueue] Failed to mark as read:', err);
      fetchNotifications();
    }
  }, [notifications, fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    const hasUnread = notifications.some((n) => n.status !== 'delivered' && n.status !== 'read');
    if (!hasUnread) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'delivered' })));

    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.error('[useNotificationQueue] Failed to mark all as read:', err);
      fetchNotifications();
    }
  }, [userId, notifications, fetchNotifications]);

  const unreadCount = notifications.filter(
    (n) => n.status !== 'read' && n.status !== 'delivered',
  ).length;

  // Sync unread count to the global notification store (drives badge count)
  useEffect(() => {
    const store = useNotificationStore.getState();
    if (store.unreadCount !== unreadCount) {
      store.setNotifications(
        notifications.map((n) => ({
          id: String(n.id),
          type: 'system' as const,
          title: n.subject || '',
          body: n.body || '',
          priority: 'medium' as const,
          isRead: n.status === 'read' || n.status === 'delivered',
          data: { queue_uuid: n.queue_uuid, event_code: n.event_code },
          createdAt: n.created_at,
        })),
      );
    }
  }, [unreadCount, notifications]);

  const hasMore = pagination ? pagination.page < pagination.totalPages : false;

  return {
    notifications,
    notificationItems,
    unreadCount,
    isLoading,
    isLoadingMore,
    isConnected,
    error,
    hasMore,
    refetch: fetchNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    reconnect,
  };
}

export default useNotificationQueue;
