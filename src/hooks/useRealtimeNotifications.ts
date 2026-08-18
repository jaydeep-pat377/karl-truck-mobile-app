
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getSocket } from '../services/socketClient';
import { notificationService } from '../api/services/notificationService';

export interface RealtimeNotificationItem {
  id: string;
  dbId: number | string;
  title: string;
  description: string;
  type: 'order' | 'truck' | 'alert' | 'info';
  time: string;
  read: boolean;
  eventCode: string;
  tenantId: number | null;
  entityType?: string;
  entityId?: string;
}

interface UseRealtimeNotificationsProps {
  userId: string | null;
  tenantId: number | null;
  onNewNotification?: (item: RealtimeNotificationItem) => void;
  enabled?: boolean;
}

interface UseRealtimeNotificationsReturn {
  notifications: RealtimeNotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
  isConnected: boolean;
}

function mapEventCodeToType(eventCode: string): RealtimeNotificationItem['type'] {
  if (!eventCode) return 'info';
  const upper = eventCode.toUpperCase();
  if (upper.startsWith('ORDER') || upper.includes('ORDER')) return 'order';
  if (upper.startsWith('TRUCK') || upper.includes('TRUCK')) return 'truck';
  if (upper.includes('ALERT') || upper.startsWith('PSI') || upper.includes('WEATHER')) return 'alert';
  if (upper.includes('DELIVERY') || upper.includes('DISPATCH') || upper.includes('ETA')) return 'truck';
  return 'info';
}

function mapRow(row: any): RealtimeNotificationItem {
  return {
    id: row.queue_uuid || String(row.id),
    dbId: row.id,
    title: row.subject || row.event_name || 'Notification',
    description: row.body || '',
    type: mapEventCodeToType(row.event_code),
    time: row.created_at,
    read: row.status === 'delivered' || row.status === 'read',
    eventCode: row.event_code || '',
    tenantId: row.tenant_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
  };
}

export function useRealtimeNotifications({
  userId,
  tenantId,
  onNewNotification,
  enabled = true,
}: UseRealtimeNotificationsProps): UseRealtimeNotificationsReturn {
  const [notifications, setNotifications] = useState<RealtimeNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const onNewNotificationRef = useRef(onNewNotification);

  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);

  const fetchInitial = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await notificationService.getNotificationHistory({
        page: 1,
        limit: 50,
      });

      if (response.success && response.data) {
        let items = (response.data.notifications || []).map(mapRow);

        if (tenantId) {
          items = items.filter(
            (n) => n.tenantId === null || n.tenantId === tenantId,
          );
        }

        setNotifications(items);
        setUnreadCount(items.filter((n) => !n.read).length);
      }
    } catch (err) {
      console.error('[RealtimeNotifications] Failed to fetch:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, tenantId]);

  // Initial fetch + Socket.io subscription
  useEffect(() => {
    if (!userId || !enabled) return;

    fetchInitial();

    const socket = getSocket();
    if (!socket) return;

    socket.emit('join:notifications', { user_id: userId });

    const handleInsert = (payload: any) => {
      const newItem = mapRow(payload.new || payload);

      if (tenantId && newItem.tenantId !== null && newItem.tenantId !== tenantId) {
        return;
      }

      setNotifications((prev) => {
        if (prev.some((n) => n.id === newItem.id)) return prev;
        return [newItem, ...prev];
      });

      if (!newItem.read) {
        setUnreadCount((prev) => prev + 1);
      }

      onNewNotificationRef.current?.(newItem);
    };

    const handleUpdate = (payload: any) => {
      const updated = mapRow(payload.new || payload);
      setNotifications((prev) => {
        const newList = prev.map((n) => (n.id === updated.id ? updated : n));
        setUnreadCount(newList.filter((n) => !n.read).length);
        return newList;
      });
    };

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('notifications:new', handleInsert);
    socket.on('notifications:update', handleUpdate);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    setIsConnected(socket.connected);

    return () => {
      socket.off('notifications:new', handleInsert);
      socket.off('notifications:update', handleUpdate);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [userId, tenantId, enabled, fetchInitial]);

  // Refetch on app resume
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active' && userId && enabled) {
        fetchInitial();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [fetchInitial, userId, enabled]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const notification = notifications.find((n) => n.id === notificationId);
      if (!notification || notification.read) return;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await notificationService.markAsRead(notificationId);
      } catch (err) {
        console.error('[RealtimeNotifications] Failed to mark as read:', err);
        fetchInitial();
      }
    },
    [notifications, fetchInitial],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.error('[RealtimeNotifications] Failed to mark all as read:', err);
      fetchInitial();
    }
  }, [userId, fetchInitial]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: fetchInitial,
    isConnected,
  };
}

export default useRealtimeNotifications;
