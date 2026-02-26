import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  const { notification, data, messageId, sentTime } = remoteMessage;

  const title = notification?.title || data?.title || '';
  const body = notification?.body || data?.body || '';

  if (title || body) {
    // Add to store so it appears in notification list when app opens
    const { useNotificationStore: store } = require('./src/store/notificationStore');
    store.getState().addNotification({
      id: messageId || Date.now().toString(),
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
      await notifee.displayNotification({
        title,
        body,
        data: data || {},
        android: {
          channelId: 'truckast_default',
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
