
import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { RealtimeNotificationItem } from './useRealtimeNotifications';

const CHANNEL_IDS = {
  orders: 'orders',
  trucks: 'trucks',
  alerts: 'alerts',
  general: 'general',
} as const;

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

  } catch (error) {
    console.error('[LocalPush] Error creating channels:', error);
  }
}

async function requestPermissions(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();
    const granted = settings.authorizationStatus >= 1;
    return granted;
  } catch (error) {
    console.error('[LocalPush] Error requesting permission:', error);
    return false;
  }
}

interface UseLocalPushNotificationsProps {
  onNotificationTap?: (data: any) => void;
}

export function useLocalPushNotifications(props?: UseLocalPushNotificationsProps) {
  const { onNotificationTap } = props || {};
  const onNotificationTapRef = useRef(onNotificationTap);


  useEffect(() => {
    onNotificationTapRef.current = onNotificationTap;
  }, [onNotificationTap]);




  useEffect(() => {
    const initialize = async () => {

      await requestPermissions();


      await createAndroidChannels();
    };

    initialize();


    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
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
          smallIcon: 'ic_notification',
          color: '#6BB130',
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

    } catch (error) {
      console.error('[LocalPush] Error displaying notification:', error);
    }
  }, []);




  const setBadgeCount = useCallback(async (count: number) => {
    try {
      await notifee.setBadgeCount(count);
    } catch (error) {
      console.error('[LocalPush] Error setting badge count:', error);
    }
  }, []);




  const clearAllNotifications = useCallback(async () => {
    try {
      await notifee.cancelAllNotifications();
    } catch (error) {
      console.error('[LocalPush] Error clearing notifications:', error);
    }
  }, []);

  const cancelNotification = useCallback(async (notificationId: string) => {
    try {
      await notifee.cancelNotification(notificationId);
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
