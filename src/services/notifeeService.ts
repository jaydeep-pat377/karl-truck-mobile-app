
import notifee, {
  AndroidImportance,
  AndroidVisibility,
  EventType,
  Event,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { navigateFromNotification, navigateToTab } from './navigationService';

const CHANNEL_ID = 'truckast_heads_up';

export async function createNotificationChannel(): Promise<string> {
  if (Platform.OS !== 'android') {
    return CHANNEL_ID;
  }

  const channelId = await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'TruckAst Notifications',
    description: 'Important notifications from TruckAst',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'default',
    vibration: true,
    lights: true,
  });

  console.log('[Notifee] Channel created:', channelId);
  return channelId;
}

export async function displayNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<string | undefined> {
  try {
    console.log('[Notifee] Displaying notification:', { title, body });


    const channelId = await createNotificationChannel();


    const notificationId = await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
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

    console.log('[Notifee] Notification displayed:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('[Notifee] Error displaying notification:', error);
    return undefined;
  }
}

export function setupNotifeeEventHandlers(): void {

  notifee.onForegroundEvent(({ type, detail }: Event) => {
    console.log('[Notifee] Foreground event:', type, detail);

    if (type === EventType.PRESS) {
      const { notification } = detail;
      if (notification?.data) {
        navigateFromNotification(notification.data as Record<string, string>);
      } else {
        navigateToTab('Notifications');
      }
    }
  });
}

export function setupNotifeeBackgroundHandler(): void {
  notifee.onBackgroundEvent(async ({ type, detail }: Event) => {
    console.log('[Notifee] Background event:', type, detail);

    if (type === EventType.PRESS) {
      const { notification } = detail;
      if (notification?.data) {

        console.log('[Notifee] Background press with data:', notification.data);
      }
    }
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();
    console.log('[Notifee] Permission settings:', settings);


    const authorized = settings.authorizationStatus >= 1;
    return authorized;
  } catch (error) {
    console.error('[Notifee] Error requesting permission:', error);
    return false;
  }
}

export async function setBadgeCount(count: number): Promise<void> {
  try {
    await notifee.setBadgeCount(count);
    console.log('[Notifee] Badge count set to:', count);
  } catch (error) {
    console.error('[Notifee] Error setting badge count:', error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await notifee.cancelAllNotifications();
    console.log('[Notifee] All notifications cancelled');
  } catch (error) {
    console.error('[Notifee] Error cancelling notifications:', error);
  }
}

export async function getInitialNotification(): Promise<any> {
  try {
    const initialNotification = await notifee.getInitialNotification();
    if (initialNotification) {
      console.log('[Notifee] Initial notification:', initialNotification);
      return initialNotification;
    }
    return null;
  } catch (error) {
    console.error('[Notifee] Error getting initial notification:', error);
    return null;
  }
}

export default {
  createNotificationChannel,
  displayNotification,
  setupNotifeeEventHandlers,
  setupNotifeeBackgroundHandler,
  requestNotificationPermission,
  setBadgeCount,
  cancelAllNotifications,
  getInitialNotification,
};
