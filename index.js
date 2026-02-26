import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Determine the Android notification channel based on event code
function getChannelIdFromData(data) {
  const eventCode = (data?.event_code || '').toUpperCase();
  if (eventCode.includes('ALERT') || eventCode.includes('WEATHER')) return 'alerts';
  if (eventCode.includes('ORDER')) return 'orders';
  if (eventCode.includes('TRUCK') || eventCode.includes('DELIVERY')) return 'trucks';
  return 'truckast_default';
}

messaging().setBackgroundMessageHandler(async remoteMessage => {
  const { notification, data, messageId, sentTime } = remoteMessage;

  console.log('[Background] FCM message received:', data?.source || 'unknown source');

  const title = notification?.title || data?.title || '';
  const body = notification?.body || data?.body || '';

  if (title || body) {
    // Add to store so it appears in notification list when app opens
    const { useNotificationStore: store } = require('./src/store/notificationStore');
    const notificationId = data?.queue_uuid || data?.notification_id || messageId || Date.now().toString();

    store.getState().addNotification({
      id: notificationId,
      type: (data?.type) || 'system',
      title,
      body,
      priority: (data?.priority) || 'medium',
      isRead: false,
      data: data,
      orderId: data?.orderId,
      truckId: data?.truckId,
      deepLink: data?.deepLink,
      createdAt: sentTime
        ? new Date(sentTime).toISOString()
        : new Date().toISOString(),
    });

    // Display notification via Notifee for data-only messages (no notification payload)
    // Messages WITH a notification payload are displayed automatically by the OS
    if (!notification) {
      const channelId = getChannelIdFromData(data);
      await notifee.displayNotification({
        title,
        body,
        data: data || {},
        android: {
          channelId,
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default' },
          sound: 'default',
        },
        ios: {
          sound: 'default',
        },
      });
    }
  }
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('[Notifications] Background event:', type, detail);
});

AppRegistry.registerComponent(appName, () => App);
