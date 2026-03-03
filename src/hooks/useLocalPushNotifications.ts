/**
 * Local Push Notifications Hook
 *
 * Handles local push notifications using @notifee/react-native.
 * Shows system-level notifications on the device.
 */
import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
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
async function createAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await notifee.createChannel({
      id: CHANNEL_IDS.orders,
      name: 'Orders',
      description: 'New orders, order updates, and order requests',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    await notifee.createChannel({
      id: CHANNEL_IDS.trucks,
      name: 'Trucks',
      description: 'Truck arrivals, late trucks, and truck updates',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    await notifee.createChannel({
      id: CHANNEL_IDS.alerts,
      name: 'Alerts',
      description: 'Critical alerts and quality notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    await notifee.createChannel({
      id: CHANNEL_IDS.general,
      name: 'General',
      description: 'General notifications and updates',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    console.log('[LocalPush] Android channels created');
  } catch (error) {
    console.error('[LocalPush] Error creating channels:', error);
  }
}

// ---------------------
// Request notification permissions
// ---------------------
async function requestPermissions(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();
    const granted = settings.authorizationStatus >= 1; // AUTHORIZED or PROVISIONAL
    console.log('[LocalPush] Permission', granted ? 'granted' : 'denied');
    return granted;
  } catch (error) {
    console.error('[LocalPush] Error requesting permission:', error);
    return false;
  }
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
      await createAndroidChannels();
    };

    initialize();

    // Setup foreground event handler for notification taps
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('[LocalPush] Notification pressed:', detail.notification?.id);
        const data = detail.notification?.data;
        if (data) {
          onNotificationTapRef.current?.(data);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // ---------------------
  // Show a local notification immediately
  // ---------------------
  const showLocalNotification = useCallback(async (item: RealtimeNotificationItem) => {
    try {
      const channelId = getAndroidChannelId(item.type);

      await notifee.displayNotification({
        id: item.id,
        title: item.title,
        body: item.description,
        data: {
          notificationId: item.id,
          eventCode: item.eventCode || '',
          type: item.type,
          entityType: item.entityType || '',
          entityId: item.entityId || '',
        },
        android: {
          channelId,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          smallIcon: 'ic_launcher',
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

      console.log('[LocalPush] Notification displayed:', item.id);
    } catch (error) {
      console.error('[LocalPush] Error displaying notification:', error);
    }
  }, []);

  // ---------------------
  // Update app icon badge count
  // ---------------------
  const setBadgeCount = useCallback(async (count: number) => {
    try {
      await notifee.setBadgeCount(count);
      console.log('[LocalPush] Badge count set to:', count);
    } catch (error) {
      console.error('[LocalPush] Error setting badge count:', error);
    }
  }, []);

  // ---------------------
  // Clear all notifications from tray
  // ---------------------
  const clearAllNotifications = useCallback(async () => {
    try {
      await notifee.cancelAllNotifications();
      console.log('[LocalPush] All notifications cleared');
    } catch (error) {
      console.error('[LocalPush] Error clearing notifications:', error);
    }
  }, []);

  // ---------------------
  // Cancel a specific notification
  // ---------------------
  const cancelNotification = useCallback(async (notificationId: string) => {
    try {
      await notifee.cancelNotification(notificationId);
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
