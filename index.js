import { AppRegistry, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AndroidVisibility,
  EventType,
} from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

const CHANNEL_ID = 'truckast_heads_up';

async function createNotificationChannel() {
  if (Platform.OS === 'android') {
    try {
      const channelId = await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'TruckAst Alerts',
        description: 'Important alerts that appear on screen',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'default',
        vibration: true,
        lights: true,
        badge: true,
      });
      return channelId;
    } catch (error) {
      console.error('[Notifee] Error creating channel:', error);
    }
  }
  return CHANNEL_ID;
}

async function displayNotification(title, body, data = {}) {
  try {
    await createNotificationChannel();
    const notificationId = `notif_${Date.now()}`;

    const notification = {
      id: notificationId,
      title,
      body,
      data,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        pressAction: {
          id: 'default',
        },
        smallIcon: 'ic_launcher',
        sound: 'default',
        vibrationPattern: [300, 500],
        lights: ['#FF0000', 300, 600],
        autoCancel: true,
        showTimestamp: true,
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
    };

    const displayedId = await notifee.displayNotification(notification);
    return displayedId;
  } catch (error) {
    console.error('[Notifee] Error displaying notification:', error);
    return null;
  }
}

createNotificationChannel();

notifee.onBackgroundEvent(async ({ type, detail }) => {
  switch (type) {
    case EventType.PRESS:
      // Navigate to the relevant screen when user taps a background notification
      if (detail.notification?.data) {
        const { navigateFromNotification } = require('./src/services/navigationService');
        navigateFromNotification(detail.notification.data);
      }
      break;
    case EventType.DISMISSED:
      break;
  }
});

messaging().setBackgroundMessageHandler(async remoteMessage => {
  const { notification, data, messageId, sentTime } = remoteMessage;

  if (notification) {
    try {
      const { useNotificationStore } = require('./src/store/notificationStore');
      useNotificationStore.getState().addNotification({
        id: messageId || Date.now().toString(),
        type: data?.type || 'system',
        title: notification.title || '',
        body: notification.body || '',
        priority: data?.priority || 'medium',
        isRead: false,
        data: data || {},
        orderId: data?.orderId,
        truckId: data?.truckId,
        deepLink: data?.deepLink,
        createdAt: sentTime
          ? new Date(sentTime).toISOString()
          : new Date().toISOString(),
      });
    } catch (e) {
      console.log('[FCM] Store error:', e.message);
    }
    return;
  }

  const title = data?.title || '';
  const body = data?.body || '';

  if (!title && !body) {
    return;
  }

  try {
    const { useNotificationStore } = require('./src/store/notificationStore');
    useNotificationStore.getState().addNotification({
      id: messageId || Date.now().toString(),
      type: data?.type || 'system',
      title,
      body,
      priority: data?.priority || 'medium',
      isRead: false,
      data: data || {},
      orderId: data?.orderId,
      truckId: data?.truckId,
      deepLink: data?.deepLink,
      createdAt: sentTime
        ? new Date(sentTime).toISOString()
        : new Date().toISOString(),
    });
  } catch (e) {
    console.log('[FCM] Store error:', e.message);
  }

  await displayNotification(title, body, data || {});
});

AppRegistry.registerComponent(appName, () => App);
