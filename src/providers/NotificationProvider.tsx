import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { useLocalPushNotifications } from '../hooks/useLocalPushNotifications';
import { useNotificationStore } from '../store/notificationStore';
import { AppNotification } from '../types/notification';
import {
  playMessageSound,
  initMessageSound,
  isSoundReady,
} from '../utils/notificationSound';
import { testNotificationConnection } from '../lib/notification-client';
import { buildNotifKey, claimNotification } from '../utils/notificationDedup';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  userId: string | null;
  tenantId: number | null;
  onNotificationTap?: (data: any) => void;
  enabled?: boolean;
}

export function NotificationProvider({
  children,
  userId,
  tenantId,
  onNotificationTap,
  enabled = true,
}: NotificationProviderProps) {
  const notifications = useNotificationStore(s => s.notifications);
  const unreadCount = useNotificationStore(s => s.unreadCount);
  const isLoading = useNotificationStore(s => s.isLoading);
  const markAsRead = useNotificationStore(s => s.markAsRead);
  const markAllAsRead = useNotificationStore(s => s.markAllAsRead);

  const {
    showLocalNotification,
    setBadgeCount,
    clearAllNotifications,
  } = useLocalPushNotifications({ onNotificationTap });


  useEffect(() => {
    if (!isSoundReady()) {
      initMessageSound();
    }
  }, []);

  useEffect(() => {
    if (userId && enabled) {
      testNotificationConnection(userId);
    }
  }, [userId, tenantId, enabled]);


  const handleNewNotification = useCallback(
    async (notification: AppNotification) => {
      // First path (FCM or queue) to claim this content key owns the OS
      // banner; the other path drops here to avoid a duplicate.
      const data = (notification.data ?? {}) as Record<string, unknown>;
      const displayKey = buildNotifKey({
        title: notification.title,
        body: notification.body,
        entityType: data.entity_type as string | undefined,
        entityId: data.entity_id as string | number | undefined,
      });
      if (!claimNotification(`display:${displayKey}`)) {
        return;
      }

      playMessageSound();

      await showLocalNotification({
        id: notification.id,
        dbId: notification.id,
        title: notification.title,
        description: notification.body,
        type: notification.type === 'order_update' ? 'order' :
          notification.type === 'delivery_update' ? 'truck' :
            notification.type === 'weather_alert' ? 'alert' : 'info',
        time: notification.createdAt,
        read: notification.isRead,
        eventCode: (notification.data as any)?.event_code || '',
        tenantId: tenantId,
        entityType: (notification.data as any)?.entity_type,
        entityId: (notification.data as any)?.entity_id,
      });
    },
    [showLocalNotification, tenantId]
  );


  const { isConnected } = useRealtimeSubscription({
    userId,
    tenantId,
    onNewNotification: handleNewNotification,
    enabled,
  });


  useEffect(() => {
    setBadgeCount(unreadCount);
  }, [unreadCount, setBadgeCount]);


  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        clearAllNotifications();
      }
    });
    return () => subscription.remove();
  }, [clearAllNotifications]);


  const refetch = useCallback(async () => {




  }, [userId, tenantId]);


  const contextValue = useMemo<NotificationContextType>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      isConnected,
      markAsRead,
      markAllAsRead,
      refetch,
    }),
    [notifications, unreadCount, isLoading, isConnected, markAsRead, markAllAsRead, refetch]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    );
  }
  return context;
}

export function useNotificationContextOptional() {
  return useContext(NotificationContext);
}

export default NotificationProvider;
