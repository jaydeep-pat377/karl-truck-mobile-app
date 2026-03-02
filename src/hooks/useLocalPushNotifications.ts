/**
 * Local Push Notifications Hook
 *
 * Handles local push notifications using react-native-push-notification.
 * Shows system-level notifications on the device.
 */
import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';
import { RealtimeNotificationItem } from './useRealtimeNotifications';

// ---------------------
// Android Channel IDs
// ---------------------
const CHANNEL_IDS = {
  orders: 'orders',
  trucks: 'trucks',
  alerts: 'alerts',
  general: 'general',
} as const;

// ---------------------
// Map notification type to Android channel
// ---------------------
function getAndroidChannelId(type: RealtimeNotificationItem['type']): string {
  switch (type) {
    case 'order':
      return CHANNEL_IDS.orders;
    case 'truck':
      return CHANNEL_IDS.trucks;
    case 'alert':
      return CHANNEL_IDS.alerts;
    default:
      return CHANNEL_IDS.general;
  }
}

// ---------------------
// Create Android notification channels
// ---------------------
function createAndroidChannels(): void {
  if (Platform.OS !== 'android') return;

  PushNotification.createChannel(
    {
      channelId: CHANNEL_IDS.orders,
      channelName: 'Orders',
      channelDescription: 'New orders, order updates, and order requests',
      importance: 5, // MAX for heads-up
      playSound: true,
      soundName: 'default',
      vibrate: true,
    },
    (created) => console.log(`[LocalPush] Orders channel created: ${created}`),
  );

  PushNotification.createChannel(
    {
      channelId: CHANNEL_IDS.trucks,
      channelName: 'Trucks',
      channelDescription: 'Truck arrivals, late trucks, and truck updates',
      importance: 5, // MAX for heads-up
      playSound: true,
      soundName: 'default',
      vibrate: true,
    },
    (created) => console.log(`[LocalPush] Trucks channel created: ${created}`),
  );

  PushNotification.createChannel(
    {
      channelId: CHANNEL_IDS.alerts,
      channelName: 'Alerts',
      channelDescription: 'Critical alerts and quality notifications',
      importance: 5, // MAX
      playSound: true,
      soundName: 'default',
      vibrate: true,
    },
    (created) => console.log(`[LocalPush] Alerts channel created: ${created}`),
  );

  PushNotification.createChannel(
    {
      channelId: CHANNEL_IDS.general,
      channelName: 'General',
      channelDescription: 'General notifications and updates',
      importance: 5, // MAX for heads-up
      playSound: true,
      soundName: 'default',
      vibrate: true,
    },
    (created) => console.log(`[LocalPush] General channel created: ${created}`),
  );

  console.log('[LocalPush] Android channels created');
}

// ---------------------
// Request notification permissions
// ---------------------
async function requestPermissions(): Promise<boolean> {
  return new Promise((resolve) => {
    PushNotification.checkPermissions((permissions) => {
      if (permissions.alert) {
        console.log('[LocalPush] Permission already granted');
        resolve(true);
      } else {
        PushNotification.requestPermissions()
          .then((result) => {
            const granted = result.alert === true;
            console.log('[LocalPush] Permission', granted ? 'granted' : 'denied');
            resolve(granted);
          })
          .catch((error) => {
            console.error('[LocalPush] Error requesting permission:', error);
            resolve(false);
          });
      }
    });
  });
}

// ---------------------
// Hook Props
// ---------------------
interface UseLocalPushNotificationsProps {
  onNotificationTap?: (data: any) => void;
}

// ---------------------
// Hook
// ---------------------
export function useLocalPushNotifications(props?: UseLocalPushNotificationsProps) {
  const { onNotificationTap } = props || {};
  const onNotificationTapRef = useRef(onNotificationTap);

  // Keep callback ref up to date
  useEffect(() => {
    onNotificationTapRef.current = onNotificationTap;
  }, [onNotificationTap]);

  // ---------------------
  // Initialize on mount
  // ---------------------
  useEffect(() => {
    const initialize = async () => {
      // Request permissions
      await requestPermissions();

      // Create Android channels
      createAndroidChannels();
    };

    initialize();

    // Configure notification handler
    PushNotification.configure({
      onNotification: function (notification) {
        console.log('[LocalPush] Notification received:', notification);
        if (notification.userInteraction) {
          console.log('[LocalPush] Notification pressed:', notification.id);
          const data = notification.data;
          if (data) {
            onNotificationTapRef.current?.(data);
          }
        }
      },
      popInitialNotification: true,
      requestPermissions: false,
    });
  }, []);

  // ---------------------
  // Show a local notification immediately
  // ---------------------
  const showLocalNotification = useCallback((item: RealtimeNotificationItem) => {
    try {
      const channelId = getAndroidChannelId(item.type);

      PushNotification.localNotification({
        id: item.id,
        channelId,
        title: item.title,
        message: item.description,
        userInfo: {
          notificationId: item.id,
          eventCode: item.eventCode,
          type: item.type,
          entityType: item.entityType || '',
          entityId: item.entityId || '',
        },
        playSound: true,
        soundName: 'default',
        smallIcon: 'ic_launcher',
        largeIcon: 'ic_launcher',
        vibrate: true,
        vibration: 300,
        priority: 'max',
        importance: 'max',
        visibility: 'public',
        allowWhileIdle: true,
      });

      console.log('[LocalPush] Notification displayed:', item.id);
    } catch (error) {
      console.error('[LocalPush] Error displaying notification:', error);
    }
  }, []);

  // ---------------------
  // Update app icon badge count
  // ---------------------
  const setBadgeCount = useCallback((count: number) => {
    try {
      PushNotification.setApplicationIconBadgeNumber(count);
      console.log('[LocalPush] Badge count set to:', count);
    } catch (error) {
      console.error('[LocalPush] Error setting badge count:', error);
    }
  }, []);

  // ---------------------
  // Clear all notifications from tray
  // ---------------------
  const clearAllNotifications = useCallback(() => {
    try {
      PushNotification.cancelAllLocalNotifications();
      console.log('[LocalPush] All notifications cleared');
    } catch (error) {
      console.error('[LocalPush] Error clearing notifications:', error);
    }
  }, []);

  // ---------------------
  // Cancel a specific notification
  // ---------------------
  const cancelNotification = useCallback((notificationId: string) => {
    try {
      PushNotification.cancelLocalNotification(notificationId);
      console.log('[LocalPush] Notification cancelled:', notificationId);
    } catch (error) {
      console.error('[LocalPush] Error cancelling notification:', error);
    }
  }, []);

  return {
    showLocalNotification,
    setBadgeCount,
    clearAllNotifications,
    cancelNotification,
    requestPermissions,
  };
}

export default useLocalPushNotifications;
