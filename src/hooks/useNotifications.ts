import { useEffect, useCallback, useRef } from 'react';
import { InteractionManager, Platform } from 'react-native';
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
      if (__DEV__) console.log('[Notifications] FCM TOKEN:', token);
      notificationService.setupListeners();
      await notificationService.checkInitialNotification();
    } else {
      if (__DEV__) console.log('[Notifications] Permission denied');
    }
  }, []);

  const syncTokenIfNeeded = useCallback(async () => {
    if (hasSyncedToken.current) return;

    if (isAuthenticated && isInitialized) {
      const success = await notificationService.syncTokenToServer();
      if (success) {
        hasSyncedToken.current = true;
      } else {
        if (__DEV__) console.log('[Notifications] Token sync failed, will retry');
      }
    }
  }, [isAuthenticated, isInitialized]);

  useEffect(() => {
    // Defer notification setup until after initial render/animations complete
    const handle = InteractionManager.runAfterInteractions(() => {
      initialize();
    });

    return () => {
      handle.cancel();
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
