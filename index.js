import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  const { notification, data, messageId, sentTime } = remoteMessage;

  if (notification) {
    const { useNotificationStore: store } = require('./src/store/notificationStore');
    store.getState().addNotification({
      id: messageId || Date.now().toString(),
      type: (data?.type) || 'system',
      title: notification.title || '',
      body: notification.body || '',
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
  }
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('[Notifications] Background event:', type, detail);
});

AppRegistry.registerComponent(appName, () => App);
