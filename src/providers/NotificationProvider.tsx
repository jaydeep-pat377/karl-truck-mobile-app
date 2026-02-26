/**
 * Notification Provider
 *
 * Combines: API-based notifications + real-time subscription + sound + local push
 *
 * - Initial data is fetched via API (notificationStore)
 * - Real-time updates come from Supabase and are added to the store
 * - Plays sound and shows local push notification for new notifications
 *
 * Usage:
 *   <NotificationProvider userId={user?.id} tenantId={tenantId}>
 *     <App />
 *   </NotificationProvider>
 */
console.log('[NotificationProvider] 📦 MODULE LOADING...');

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

// ---------------------
// Context Type
// ---------------------
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

// ---------------------
// Provider Props
// ---------------------
interface NotificationProviderProps {
  children: React.ReactNode;
  userId: string | null;
  tenantId: number | null;
  onNotificationTap?: (data: any) => void;
  enabled?: boolean;
}

// ---------------------
// Provider Component
// ---------------------
export function NotificationProvider({
  children,
  userId,
  tenantId,
  onNotificationTap,
  enabled = true,
}: NotificationProviderProps) {
  const store = useNotificationStore();

  const {
    showLocalNotification,
    setBadgeCount,
    clearAllNotifications,
  } = useLocalPushNotifications({ onNotificationTap });

  // Initialize sound on mount
  useEffect(() => {
    if (!isSoundReady()) {
      initMessageSound().then((success) => {
        console.log('[NotificationProvider] Sound init:', success ? 'success' : 'failed');
      });
    }
  }, []);

  // Test Supabase connection and fetch initial notifications
  useEffect(() => {
    console.log('[NotificationProvider] ========================================');
    console.log('[NotificationProvider] 📱 NOTIFICATION PROVIDER MOUNTED');
    console.log('[NotificationProvider] userId:', userId);
    console.log('[NotificationProvider] tenantId:', tenantId);
    console.log('[NotificationProvider] enabled:', enabled);
    console.log('[NotificationProvider] ========================================');
    console.log('[NotificationProvider] ⚠️ USE THIS USER ID IN YOUR TEST QUERY:');
    console.log('[NotificationProvider] ', userId);
    console.log('[NotificationProvider] ========================================');

    if (userId && enabled) {
      // Test the notification Supabase connection
      testNotificationConnection(userId).then((success) => {
        console.log('[NotificationProvider] Connection test:', success ? '✅ PASSED' : '❌ FAILED');
      });
    } else {
      console.log('[NotificationProvider] ⚠️ Not enabling - userId:', userId, 'enabled:', enabled);
    }

    if (userId && tenantId && enabled) {
      console.log('[NotificationProvider] Fetching initial notifications via API for user:', userId);
      store.fetchNotifications(userId, tenantId);
    }
  }, [userId, tenantId, enabled]);

  // Handler for new real-time notifications (only fires when WebSocket is connected = foreground)
  const handleNewNotification = useCallback(
    async (notification: AppNotification) => {
      const appState = AppState.currentState;
      console.log('[NotificationProvider] New notification received:', notification.title, 'App state:', appState);

      // Always play sound (throttled internally)
      playMessageSound();

      // Only show local notification in foreground via Supabase Realtime
      // In background/killed state, the Supabase Edge Function sends FCM push
      if (appState === 'active') {
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
      }
    },
    [showLocalNotification, tenantId]
  );

  // Subscribe to real-time updates
  const { isConnected } = useRealtimeSubscription({
    userId,
    tenantId,
    onNewNotification: handleNewNotification,
    enabled,
  });

  // Update app icon badge count whenever unread count changes
  useEffect(() => {
    setBadgeCount(store.unreadCount);
  }, [store.unreadCount, setBadgeCount]);

  // When app comes to foreground: clear tray and refetch missed notifications
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        clearAllNotifications();
        // Refetch notifications that may have arrived via FCM while backgrounded
        if (userId && tenantId) {
          console.log('[NotificationProvider] App foregrounded, refetching missed notifications...');
          store.fetchNotifications(userId, tenantId);
        }
      }
    });
    return () => subscription.remove();
  }, [clearAllNotifications, userId, tenantId, store]);

  // Refetch function
  const refetch = useCallback(async () => {
    if (userId && tenantId) {
      await store.fetchNotifications(userId, tenantId);
    }
  }, [userId, tenantId, store]);

  // Memoize context value
  const contextValue = useMemo<NotificationContextType>(
    () => ({
      notifications: store.notifications,
      unreadCount: store.unreadCount,
      isLoading: store.isLoading,
      isConnected,
      markAsRead: store.markAsRead,
      markAllAsRead: store.markAllAsRead,
      refetch,
    }),
    [store.notifications, store.unreadCount, store.isLoading, isConnected, store.markAsRead, store.markAllAsRead, refetch]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// ---------------------
// Consumer Hook
// ---------------------
export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    );
  }
  return context;
}

// ---------------------
// Optional: Hook that doesn't throw if outside provider
// ---------------------
export function useNotificationContextOptional() {
  return useContext(NotificationContext);
}

export default NotificationProvider;
