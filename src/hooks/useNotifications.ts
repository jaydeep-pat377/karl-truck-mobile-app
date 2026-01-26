import { useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import { useNotificationStore } from '../store/notificationStore';

export const useNotifications = () => {
  const { fcmToken, notifications, unreadCount } = useNotificationStore();
  const { markAsRead, markAllAsRead, clearAll } = useNotificationStore();

  const initialize = useCallback(async () => {
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

  useEffect(() => {
    initialize();

    return () => {
      notificationService.cleanup();
    };
  }, [initialize]);

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
