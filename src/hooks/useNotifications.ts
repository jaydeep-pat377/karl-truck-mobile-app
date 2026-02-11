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

    console.log('==========================================');
    console.log('[Notifications] Initializing on', Platform.OS);
    console.log('==========================================');

    const hasPermission = await notificationService.requestPermission();
    console.log('[Notifications] Permission granted:', hasPermission);

    if (hasPermission) {
      const token = await notificationService.getToken();
      console.log('==========================================');
      console.log('[Notifications] FCM TOKEN:');
      console.log(token);
      console.log('==========================================');
      notificationService.setupListeners();
      console.log('[Notifications] Listeners setup complete');
      await notificationService.checkInitialNotification();
    } else {
      console.log('[Notifications] Permission denied - notifications will not work');
      console.log('Please enable notifications in Settings > TruckApp > Notifications');
    }
  }, []);


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
