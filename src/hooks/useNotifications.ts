import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { notificationService } from '../services/notificationService';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';

export const useNotifications = () => {
  const { fcmToken, notifications, unreadCount } = useNotificationStore();
  const { markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const hasInitialized = useRef(false);
  const hasSyncedToken = useRef(false);

  const initialize = useCallback(async () => {

    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const hasPermission = await notificationService.requestPermission();

    if (hasPermission) {
      const token = await notificationService.getToken();
      console.log('[Notifications] FCM TOKEN:', token);
      notificationService.setupListeners();
      await notificationService.checkInitialNotification();
    } else {
      console.log('[Notifications] Permission denied - notifications will not work');
    }
  }, []);

  const syncTokenIfNeeded = useCallback(async () => {
    if (hasSyncedToken.current) return;

    if (isAuthenticated && isInitialized) {
      const success = await notificationService.syncTokenToServer();
      if (success) {
        hasSyncedToken.current = true;
      } else {
        console.log('[Notifications] Token sync failed, will retry on next state change');
      }
    }
  }, [isAuthenticated, isInitialized]);

  useEffect(() => {
    initialize();

    return () => {
      notificationService.cleanup();
    };
  }, [initialize]);

  useEffect(() => {
    syncTokenIfNeeded();
  }, [syncTokenIfNeeded]);

  return {
    fcmToken,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    requestPermission: notificationService.requestPermission,
  };
};
