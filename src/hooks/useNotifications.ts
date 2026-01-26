import { useEffect, useCallback, useRef } from 'react';
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
    // Prevent multiple initializations
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    console.log('[Notifications] Initializing...');
    const hasPermission = await notificationService.requestPermission();
    console.log('[Notifications] Permission granted:', hasPermission);
    if (hasPermission) {
      const token = await notificationService.getToken();
      console.log('[Notifications] FCM Token:', token);
      notificationService.setupListeners();
      console.log('[Notifications] Listeners setup complete');
      await notificationService.checkInitialNotification();
    } else {
      console.log('[Notifications] Permission denied - notifications will not work');
    }
  }, []);

  // Sync token to server when user is authenticated (for auto-login scenarios)
  const syncTokenIfNeeded = useCallback(async () => {
    if (hasSyncedToken.current) return;

    if (isAuthenticated && isInitialized) {
      console.log('[Notifications] User authenticated on app launch, syncing token...');
      hasSyncedToken.current = true;
      await notificationService.syncTokenToServer();
    }
  }, [isAuthenticated, isInitialized]);

  useEffect(() => {
    initialize();

    return () => {
      notificationService.cleanup();
    };
  }, [initialize]);

  // Effect to sync token when auth state changes (for auto-login)
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
